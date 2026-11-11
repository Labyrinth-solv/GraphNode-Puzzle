using System;
using Cysharp.Threading.Tasks;
using GraphNode.Core.Geometry;
using GraphNode.Gameplay.Presentation;
using GraphNode.Core.Input;
using GraphNode.Core.Runner;
using GraphNode.Core.Session;
using GraphNode.Data.Configs;
using GraphNode.Data.Definitions;
using GraphNode.Foundation.Services;
using GraphNode.Gameplay.Input;
using GraphNode.Gameplay.View;
using UnityEngine;

namespace GraphNode.Gameplay.Session
{
    /// <summary>
    /// Nối chạm với luật: đọc PointerInput mỗi khung, chọn node, dây hay kim bằng TouchArbiter, gửi lệnh kéo và thả cho
    /// PuzzleState rồi cho PuzzleView vẽ. Kéo tương đối (node giữ khoảng lệch lúc chạm) và nâng node khỏi ngón tay với
    /// cảm ứng. Luật nằm trong lõi; lớp này chỉ quy đổi toạ độ và quãng trượt.
    /// </summary>
    public sealed class PuzzleController : MonoBehaviour
    {
        [SerializeField] private PointerInput pointer;
        [SerializeField] private CameraFit cameraFit;
        [SerializeField] private PuzzleView view;

        private enum Grab { None, Node, Edge, Needle }

        private PuzzleState _state;
        private TouchArbiter _arbiter;
        private InputConfig _input;
        private Action _onWon;
        private Camera _camera;
        private Grab _grab;
        private Float2 _grabOffset;
        private bool _moved;
        private RunnerSimulator _runner;
        private ConstantSpeedRule _runnerRule;
        private readonly int[] _passed = new int[16];
        private WinSequenceParams _win;
        private PresentationContext _presentation;
        private IAudioService _audio;
        private int _lastMagnetPin = -1;

        // tên clip và âm lượng theo bản web (âm lượng tuyệt đối như WebAudio)
        private const string NotePop = "note_pop", PinSnap = "pin_snap", PinSnapLast = "pin_snap_last", PinHover = "pin_hover";
        private const string CurveSnap = "curve_snap", Drop = "drop", LockedTap = "locked_tap", WinChord = "win_chord";
        private const int PentatonicSteps = 5;

        public PuzzleState State => _state;

        /// <param name="runnerSpeed">Tốc độ điểm sáng, bề rộng vải mỗi giây (cấu hình cân bằng).</param>
        /// <param name="onWon">Gọi khi chuỗi thắng chạy xong.</param>
        public void Begin(PuzzleState state, InputConfig input, float runnerSpeed, WinSequenceParams win, Action onWon,
            IAudioService audio = null, FabricDefinition fabric = null, int slotIndex = 0)
        {
            _audio = audio;
            if (fabric != null) view.SetPiece(fabric.Base, fabric.Light, fabric.Dark, fabric.Line, slotIndex);
            _state = state ?? throw new ArgumentNullException(nameof(state));
            _input = input;
            _win = win;
            _onWon = onWon;
            _camera = cameraFit.GetComponent<Camera>();
            _arbiter = new TouchArbiter(state.Level, state.Topology, state.Shape, input.ToTouchParams(FabricLayout.FabricSize));
            _runner = new RunnerSimulator(state.Topology, state.Shape);
            _runnerRule = new ConstantSpeedRule(runnerSpeed);
            view.Bind(state);
        }

        private void Update()
        {
            if (_state == null) return;
            var phase = pointer.Poll();
            if (_presentation != null)
            {
                // chạm trong chuỗi thắng thì tua nhanh cố định, không tăng thêm
                if (phase == PointerPhase.Began) _presentation.Speed = _win.FastForward;
                view.Render(Time.deltaTime, -1);
                return;
            }
            switch (phase)
            {
                case PointerPhase.Began: OnBegan(); break;
                case PointerPhase.Moved: OnMoved(); break;
                case PointerPhase.Ended: OnEnded(false); break;
                case PointerPhase.Cancelled: OnEnded(true); break;
            }
            if (_presentation != null) return;
            _state.Refresh();
            float dt = Time.deltaTime;
            // điểm sáng chạy đều cả khi đang kéo; dừng khi đã thắng (chuỗi thắng ở M3)
            if (!_state.Won)
            {
                int count = _runner.Step(dt, _runnerRule, _grab != Grab.None, _state.Positions, _state.Bends, _passed);
                // mỗi node một nốt cố định theo chỗ của nó trên vòng; khớp cao thì to hơn, đang kéo thì nhỏ lại
                float match = Mathf.Clamp01((_state.Score - 0.5f) / (_state.Level.WinThreshold - 0.5f));
                float vol = (0.045f + 0.045f * match) * (_grab != Grab.None ? 0.6f : 1f);
                for (int i = 0; i < count; i++)
                {
                    view.Pulse(_passed[i]);
                    _audio?.PlayNote(NotePop, _state.Topology.RingIndexOf(_passed[i]), vol);
                }
            }
            view.Render(dt, _grab == Grab.Node ? _state.DraggingNode : -1);
            view.RenderRunner(dt, _runner.Edge, _runner.T);
        }

        private Float2 TouchFabric(Vector2 screen) => FabricLayout.WorldToFabric(_camera.ScreenToWorldPoint(new Vector3(screen.x, screen.y, 0f)));

        private void OnBegan()
        {
            if (_state.Won) return;
            _moved = false;
            var f = TouchFabric(pointer.Position);
            var hit = _arbiter.Pick(f, _state.Positions, _state.Bends, _state.FoldLine);
            switch (hit.Kind)
            {
                case TouchTargetKind.Node:
                    _grab = Grab.Node;
                    _grabOffset = _state.Positions[hit.Index] - f;
                    _state.BeginNodeDrag(hit.Index);
                    break;
                case TouchTargetKind.Edge:
                    _grab = Grab.Edge;
                    _state.BeginEdgeDrag(hit.Index, f, hit.EdgeU);
                    break;
                case TouchTargetKind.Needle:
                    _grab = Grab.Needle;
                    _state.BeginNeedleDrag(f);
                    break;
                case TouchTargetKind.LockedNode:
                    _grab = Grab.None;
                    _audio?.PlaySfx(LockedTap);
                    break;
                default:
                    _grab = Grab.None;
                    break;
            }
        }

        private void OnMoved()
        {
            if (_grab == Grab.None) return;
            float slidPt = (pointer.Position - pointer.StartPosition).magnitude * cameraFit.PointsPerPixel;
            if (slidPt > _input.MoveThresholdPt) _moved = true;
            var f = TouchFabric(pointer.Position);
            switch (_grab)
            {
                case Grab.Node:
                    // cảm ứng: node nâng dần lên trên ngón tay để không bị che; vị trí chấm điểm là vị trí nhìn thấy
                    float lift = pointer.IsTouch ? _input.LiftPt * Mathf.Clamp01(slidPt / _input.LiftRampPt) : 0f;
                    _state.DragNode(f + _grabOffset - new Float2(0f, lift / FabricLayout.FabricSize));
                    // vừa lọt vào vùng hút của một chốt: tiếng chạm nhẹ theo cao độ của chốt
                    int pin = _state.NodeMagnetPin;
                    if (pin >= 0 && pin != _lastMagnetPin) _audio?.PlayNote(PinHover, pin % PentatonicSteps, 0.1f);
                    _lastMagnetPin = pin;
                    break;
                case Grab.Edge:
                    _state.DragEdge(f);
                    break;
                case Grab.Needle:
                    _state.DragNeedle(f);
                    break;
            }
        }

        private void OnEnded(bool cancelled)
        {
            ReleaseResult result = default;
            switch (_grab)
            {
                case Grab.Node: result = _state.EndNodeDrag(cancelled, _moved); break;
                case Grab.Edge: result = _state.EndEdgeDrag(cancelled, _moved); break;
                case Grab.Needle: result = _state.EndNeedleDrag(cancelled, _moved); break;
            }
            var grab = _grab;
            _grab = Grab.None;
            _lastMagnetPin = -1;
            if (result.Relabeled) view.Permute(_state.LastPermutation);
            PlayReleaseSound(grab, result);
            if (result.Won)
            {
                _audio?.PlaySfx(WinChord);
                PlayWinAsync().Forget();
            }
        }

        private void PlayReleaseSound(Grab grab, ReleaseResult result)
        {
            if (_audio == null || grab == Grab.None) return;
            if (grab == Grab.Node && result.Snapped)
            {
                // tiếng chốt gỗ leo dần theo số chốt đã lấp; chốt cuối có thêm quãng 5 ngân
                _state.Refresh();
                int step = Mathf.Clamp(_state.Pins.FilledCount - 1, 0, 5);
                _audio.PlayNote(_state.Pins.AllFilled ? PinSnapLast : PinSnap, step, 0.1f);
            }
            else if (grab == Grab.Edge && result.ContourSnap) _audio.PlaySfx(CurveSnap);
            // clip "drop" kết xuất ở 0,07 (thả node); thả dây của bản web nhỏ hơn (0,06)
            else _audio.PlaySfx(Drop, grab == Grab.Edge ? 0.06f / 0.07f : 1f);
        }

        private async UniTaskVoid PlayWinAsync() => await PlayWinSequenceAsync();

        /// <summary>Chạy chuỗi thắng rồi báo cho lớp nối. Test PlayMode gọi thẳng sau khi giải màn qua PuzzleState.</summary>
        internal async UniTask PlayWinSequenceAsync()
        {
            if (_presentation != null) return;
            _presentation = new PresentationContext(view, _win, _audio);
            await WinSequence.Default().PlayAsync(_presentation, this.GetCancellationTokenOnDestroy());
            _onWon?.Invoke();
        }
    }
}

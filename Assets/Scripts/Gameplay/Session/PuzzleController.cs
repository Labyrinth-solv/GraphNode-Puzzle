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
using GraphNode.Gameplay.Hud;
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
        [SerializeField] private HudView hud;
        [Tooltip("Gợi ý hiện trên vải trong khoảng này (giây)")]
        [SerializeField] private float hintSeconds = 3f;

        private enum GrabKind { None, Node, Edge, Needle }

        private PuzzleState _state;
        private TouchArbiter _arbiter;
        private InputConfig _input;
        private Action _onWon;
        private Camera _camera;
        private GrabKind _grab;
        private Float2 _grabOffset;
        private bool _moved;
        private RunnerSimulator _runner;
        private ConstantSpeedRule _runnerRule;
        private readonly int[] _passed = new int[16];
        private WinSequenceParams _win;
        private PresentationContext _presentation;
        private IAudioService _audio;
        private int _lastMagnetPin = -1;
        private float _lastActionTime = -99f, _lastNodeReleaseTime = -99f;
        /// <summary>Dây kề node vừa cắm lệch đích dưới mức này thì tính là vừa khép khớp viền (web: 2,5%).</summary>
        private const float ChainedSnapBend = 0.025f;

        // tên clip và âm lượng theo bản web (âm lượng tuyệt đối như WebAudio)
        private const string NotePop = "note_pop", PinSnap = "pin_snap", PinSnapLast = "pin_snap_last", PinHover = "pin_hover";
        private const string CurveSnap = "curve_snap", Drop = "drop", LockedTap = "locked_tap", WinChord = "win_chord";
        private const string Grab = "grab", Soft = "soft", ReadyPluck = "ready_pluck";

        // nhịp rung (ms, rung/nghỉ/rung) theo vib() của bản web
        private static readonly int[] VibGrab = { 6 }, VibLocked = { 18 }, VibMagnet = { 5 }, VibEdgeTick = { 2 }, VibEdgeMagnet = { 3 };
        private static readonly int[] VibDropNode = { 5 }, VibDropEdge = { 4 }, VibDropNeedle = { 6 }, VibNeedleTick = { 3 };
        private static readonly int[] VibPinSnap = { 8, 14, 10 }, VibCurveSnap = { 6, 12, 8 }, VibMilestone = { 8 };
        private static readonly int[] VibReady = { 10, 22, 10 }, VibHint = { 10 }, VibNoHint = { 20 }, VibWin = { 30 };
        private const int PentatonicSteps = 5;

        private int _slotIndex;
        private int _hints;
        private float _lastScore;
        private bool _wasReady;
        private IHaptics _haptics;
        private DragAudio _dragAudio;
        private Vector2 _lastPointer;
        private float _lastSoundU, _lastNeedleTick;
        private bool _edgeInMagnet, _needleInMagnet;
        private static readonly FeelInput Presenting = new FeelInput { RunnerEdge = -1, DragEdge = -1 };

        public PuzzleState State => _state;

        /// <summary>Số gợi ý người chơi đã dùng trong màn (báo trong LevelResult).</summary>
        public int HintsUsed { get; private set; }

        /// <param name="runnerSpeed">Tốc độ điểm sáng, bề rộng vải mỗi giây (cấu hình cân bằng).</param>
        /// <param name="onWon">Gọi khi chuỗi thắng chạy xong.</param>
        /// <param name="hints">Số booster gợi ý người chơi đang có (từ LevelRequest).</param>
        /// <param name="startCue">Màn đầu tiên: vòng nhắc chạm quanh node cần kéo, tới khi người chơi chạm lần đầu.</param>
        public void Begin(PuzzleState state, InputConfig input, float runnerSpeed, WinSequenceParams win, Action onWon,
            IAudioService audio, ILocalizer localizer, FabricDefinition fabric, int slotIndex, int pieceSlots, int hints,
            bool startCue = false, IHaptics haptics = null)
        {
            _audio = audio;
            _haptics = haptics;
            _dragAudio = new DragAudio(audio);
            _slotIndex = slotIndex;
            _hints = hints;
            if (fabric != null) view.SetPiece(fabric.Base, fabric.Light, fabric.Dark, fabric.Line);
            _state = state ?? throw new ArgumentNullException(nameof(state));
            _input = input;
            _win = win;
            _onWon = onWon;
            _camera = cameraFit.GetComponent<Camera>();
            _arbiter = new TouchArbiter(state.Level, state.Topology, state.Shape, input.ToTouchParams(FabricLayout.FabricSize));
            _runner = new RunnerSimulator(state.Topology, state.Shape);
            _runnerRule = new ConstantSpeedRule(runnerSpeed);
            view.Bind(state);
            view.Feel.ShowStartCue = startCue;
            _lastScore = state.Score;
            if (hud != null)
            {
                // hình mẫu nhỏ trên HUD: cùng viền lời giải, đổi sang Vector2
                var shape = new System.Collections.Generic.List<Vector2>(view.Outline.Count);
                foreach (var p in view.Outline) shape.Add(p);
                hud.Bind(localizer, shape, view.OutlineTriangles, fabric != null ? fabric.Base : Color.white, pieceSlots);
                hud.SetHints(_hints);
                hud.HintPressed += OnHint;
            }
        }

        private void OnDestroy()
        {
            _dragAudio?.Stop();
            if (hud != null) hud.HintPressed -= OnHint;
        }

        private void OnHint()
        {
            if (_state.Won || _presentation != null) return;
            if (_hints <= 0)
            {
                _audio?.PlaySfx(LockedTap);
                Vibrate(VibNoHint);
                return;
            }
            var hint = _state.PickHint();
            if (hint.Kind == Core.Rules.HintKind.None) return;
            _hints--;
            HintsUsed++;
            Vibrate(VibHint);
            hud.SetHints(_hints);
            view.ShowHint(hint, hintSeconds);
            _audio?.PlaySfx(WinChord, 0.6f);
        }

        private void Update()
        {
            if (_state == null) return;
            var phase = pointer.Poll();
            if (_presentation != null)
            {
                // chạm trong chuỗi thắng thì tua nhanh cố định, không tăng thêm
                if (phase == PointerPhase.Began) _presentation.Speed = _win.FastForward;
                hud?.SetMatch(1f, _state.Level.WinThreshold, Time.deltaTime);
                view.Render(Time.deltaTime, -1, 1f, Presenting);
                return;
            }
            // chạm trúng HUD (nút Gợi ý…) thì để uGUI xử lý, không bắt node hay dây bên dưới
            if (phase == PointerPhase.Began && UnityEngine.EventSystems.EventSystem.current != null &&
                UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject())
                phase = PointerPhase.None;
            switch (phase)
            {
                case PointerPhase.Began: OnBegan(); break;
                case PointerPhase.Moved: OnMoved(); break;
                case PointerPhase.Ended: OnEnded(false); break;
                case PointerPhase.Cancelled: OnEnded(true); break;
            }
            if (_presentation != null) return;
            if (phase != PointerPhase.None) _lastActionTime = Time.time;
            _state.Refresh();
            float dt = Time.deltaTime;
            // điểm sáng chạy đều cả khi đang kéo; dừng khi đã thắng (chuỗi thắng ở M3)
            if (!_state.Won)
            {
                int count = _runner.Step(dt, _runnerRule, _grab != GrabKind.None, _state.Positions, _state.Bends, _passed);
                // mỗi node một nốt cố định theo chỗ của nó trên vòng; khớp cao thì to hơn, đang kéo thì nhỏ lại
                float match = Mathf.Clamp01((_state.Score - 0.5f) / (_state.Level.WinThreshold - 0.5f));
                float vol = (0.045f + 0.045f * match) * (_grab != GrabKind.None ? 0.6f : 1f);
                for (int i = 0; i < count; i++)
                {
                    view.Pulse(_passed[i]);
                    _audio?.PlayNote(NotePop, _state.Topology.RingIndexOf(_passed[i]), vol);
                }
            }
            hud?.SetMatch(_state.Score, _state.Level.WinThreshold, dt);
            FlashOnMilestones();
            float speedPt = dt > 0f ? (pointer.Position - _lastPointer).magnitude * cameraFit.PointsPerPixel / Mathf.Max(dt, 0.008f) : 0f;
            _lastPointer = pointer.Position;
            _dragAudio.Tick(dt, hud != null ? hud.BarDisplay : 0f, _wasReady, _grab != GrabKind.None ? speedPt : 0f);
            view.Render(dt, _grab == GrabKind.Node ? _state.DraggingNode : -1, hud != null ? hud.BarDisplay : 0f, BuildFeelInput());
            view.RenderRunner(dt, _runner.Edge, _runner.T);
            view.RenderFeedback(dt, new FeedbackInput
            {
                DraggingNode = _grab == GrabKind.Node,
                DraggingEdge = _grab == GrabKind.Edge ? _state.DraggingEdge : -1,
                SinceAction = Time.time - _lastActionTime,
                SinceNodeRelease = Time.time - _lastNodeReleaseTime
            });
        }

        /// <summary>
        /// Thanh khớp chớp sáng khi độ khớp vượt lên qua hai mốc màu, và khi vừa kéo lọt vào vùng thắng (đủ ngưỡng và đủ
        /// chốt) lúc còn giữ tay, như bản web.
        /// </summary>
        private void FlashOnMilestones()
        {
            float thr = _state.Level.WinThreshold, score = _state.Score;
            float m1 = Mathf.Min(0.70f, thr - 0.08f), m2 = Mathf.Min(0.85f, thr);
            // vượt mốc: nốt mềm bậc 2 (mốc dưới) hay bậc 4 (mốc trên) của quãng thấp
            int crossed = _lastScore < m2 && score >= m2 ? 4 : (_lastScore < m1 && score >= m1 ? 2 : -1);
            if (crossed >= 0)
            {
                hud?.Flash();
                _audio?.PlayNote(Soft, crossed, 0.055f);
                Vibrate(VibMilestone);
            }
            bool ready = score >= thr && _state.Pins.AllFilled;
            if (ready && !_wasReady && _grab != GrabKind.None)
            {
                hud?.Flash();
                _audio?.PlaySfx(ReadyPluck);
                Vibrate(VibReady);
            }
            _wasReady = ready;
            _lastScore = score;
        }

        private FeelInput BuildFeelInput()
        {
            var input = new FeelInput
            {
                Dragging = _grab != GrabKind.None,
                DragEdge = _grab == GrabKind.Edge ? _state.DraggingEdge : -1,
                Ready = _state.Score >= _state.Level.WinThreshold && _state.Pins.AllFilled,
                SinceAction = Time.time - _lastActionTime,
                RunnerEdge = _state.Won ? -1 : _runner.Edge,
                RunnerT = _runner.T
            };
            // dây nối mờ từ ngón tay tới thứ đang kéo (node đã nâng khỏi ngón tay nên cần thấy chúng nối nhau)
            if (_grab == GrabKind.Node && _state.DraggingNode >= 0)
            {
                input.HasFinger = true;
                input.Finger = PointerWorld();
                input.Grabbed = FabricLayout.FabricToWorld(_state.Positions[_state.DraggingNode]);
            }
            else if (_grab == GrabKind.Edge && _state.DraggingEdge >= 0)
            {
                input.HasFinger = true;
                input.Finger = PointerWorld();
                input.Grabbed = view.EdgePoint(_state.DraggingEdge, _edgeU);
            }
            return input;
        }

        private Vector3 PointerWorld()
        {
            var w = _camera.ScreenToWorldPoint(new Vector3(pointer.Position.x, pointer.Position.y, 0f));
            w.z = 0f;
            return w;
        }

        // vị trí ngón tay chiếu lên dây k (0 ở node đầu, 1 ở node cuối)
        private float EdgeU(int k, Float2 f)
        {
            var topo = _state.Topology;
            var a = _state.Positions[topo.RingNode(k)];
            var b = _state.Positions[topo.RingNode((k + 1) % topo.RingLength)];
            var ab = b - a;
            float l2 = ab.LengthSquared;
            return l2 > 1e-8f ? ((f.X - a.X) * ab.X + (f.Y - a.Y) * ab.Y) / l2 : 0.5f;
        }

        private float _edgeU = 0.5f;

        private void Vibrate(int[] pulses) => _haptics?.Play(pulses);

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
                    _grab = GrabKind.Node;
                    _grabOffset = _state.Positions[hit.Index] - f;
                    _state.BeginNodeDrag(hit.Index);
                    OnGrab(0);
                    break;
                case TouchTargetKind.Edge:
                    _grab = GrabKind.Edge;
                    _state.BeginEdgeDrag(hit.Index, f, hit.EdgeU);
                    _edgeU = _lastSoundU = hit.EdgeU;
                    _edgeInMagnet = false;
                    view.Feel.BeginWave(hit.Index, hit.EdgeU);
                    OnGrab(1);
                    break;
                case TouchTargetKind.Needle:
                    _grab = GrabKind.Needle;
                    _state.BeginNeedleDrag(f);
                    _lastNeedleTick = _state.FoldLine;
                    _needleInMagnet = false;
                    OnGrab(1);
                    break;
                case TouchTargetKind.LockedNode:
                    _grab = GrabKind.None;
                    _audio?.PlaySfx(LockedTap);
                    Vibrate(VibLocked);
                    break;
                default:
                    _grab = GrabKind.None;
                    break;
            }
        }

        // nắm node: nốt Mi 4 thấp; nắm dây hay kim: Sol 4 thấp; tiếng ngân bắt đầu theo tay
        private void OnGrab(int step)
        {
            _audio?.PlayNote(Grab, step, 0.08f);
            Vibrate(VibGrab);
            _lastPointer = pointer.Position;
            _dragAudio.Begin();
        }

        private void OnMoved()
        {
            if (_grab == GrabKind.None) return;
            float slidPt = (pointer.Position - pointer.StartPosition).magnitude * cameraFit.PointsPerPixel;
            if (slidPt > _input.MoveThresholdPt) _moved = true;
            var f = TouchFabric(pointer.Position);
            switch (_grab)
            {
                case GrabKind.Node:
                    // cảm ứng: node nâng dần lên trên ngón tay để không bị che; vị trí chấm điểm là vị trí nhìn thấy
                    float lift = pointer.IsTouch ? _input.LiftPt * Mathf.Clamp01(slidPt / _input.LiftRampPt) : 0f;
                    _state.DragNode(f + _grabOffset - new Float2(0f, lift / FabricLayout.FabricSize));
                    // vừa lọt vào vùng hút của một chốt: tiếng chạm nhẹ theo cao độ của chốt
                    int pin = _state.NodeMagnetPin;
                    if (pin >= 0 && pin != _lastMagnetPin)
                    {
                        _audio?.PlayNote(PinHover, pin % PentatonicSteps, 0.1f);
                        Vibrate(VibMagnet);
                    }
                    _lastMagnetPin = pin;
                    break;
                case GrabKind.Edge:
                    _state.DragEdge(f);
                    int k = _state.DraggingEdge;
                    if (k >= 0)
                    {
                        _edgeU = Mathf.Clamp(EdgeU(k, f), 0.14f, 0.86f);
                        view.Feel.MoveWave(_edgeU, _state.Bends[k], _state.EdgeInMagnet);
                        // trượt dọc dây: nốt mềm theo chỗ ngón tay, mỗi gần 1/10 dây một nốt
                        if (Mathf.Abs(_edgeU - _lastSoundU) > 0.095f)
                        {
                            _lastSoundU = _edgeU;
                            _audio?.PlayNote(Soft, Mathf.Min(4, Mathf.FloorToInt(_edgeU * 5f)), 0.028f);
                            Vibrate(VibEdgeTick);
                        }
                        if (_state.EdgeInMagnet && !_edgeInMagnet) Vibrate(VibEdgeMagnet);
                        _edgeInMagnet = _state.EdgeInMagnet;
                    }
                    break;
                case GrabKind.Needle:
                    _state.DragNeedle(f);
                    if (_state.NeedleInMagnet && !_needleInMagnet)
                    {
                        _audio?.PlayNote(Soft, 2, 0.06f);
                        Vibrate(VibGrab);
                    }
                    _needleInMagnet = _state.NeedleInMagnet;
                    // kim dời mỗi 2,5% bề rộng vải: tiếng tích nhỏ
                    if (Mathf.Abs(_state.FoldLine - _lastNeedleTick) > 0.025f)
                    {
                        _lastNeedleTick = _state.FoldLine;
                        _audio?.PlayNote(Soft, 0, 0.04f);
                        Vibrate(VibNeedleTick);
                    }
                    break;
            }
        }

        private void OnEnded(bool cancelled)
        {
            ReleaseResult result = default;
            // cạnh đang kéo phải đọc trước khi thả, vì thả xong lõi xóa nó
            int edge = _state.DraggingEdge;
            switch (_grab)
            {
                case GrabKind.Node: result = _state.EndNodeDrag(cancelled, _moved); break;
                case GrabKind.Edge: result = _state.EndEdgeDrag(cancelled, _moved); break;
                case GrabKind.Needle: result = _state.EndNeedleDrag(cancelled, _moved); break;
            }
            var grab = _grab;
            _grab = GrabKind.None;
            if (grab == GrabKind.Edge) view.Feel.EndWave();
            _dragAudio.End();
            _lastMagnetPin = -1;
            if (grab == GrabKind.Node) _lastNodeReleaseTime = Time.time;
            if (result.Relabeled) view.Permute(_state.LastPermutation);
            PlayReleaseSound(grab, result);
            if (grab == GrabKind.Edge && result.ContourSnap && edge >= 0)
            {
                view.Zip(edge);
                view.SnapEdge(edge, _state.Bends[edge] >= 0f ? 1f : -1f, 0f, 5, false);
            }
            if (grab == GrabKind.Node && result.Snapped)
            {
                view.PinRipple(result.Pin);
                ZipChainedEdges(result.Pin);
            }
            if (result.Won)
            {
                _dragAudio.Stop();
                Vibrate(VibWin);
                view.Feel.WinFlash();
                _audio?.PlaySfx(WinChord);
                PlayWinAsync().Forget();
            }
        }

        /// <summary>
        /// Node vừa cắm vào chốt làm một dây kề nó khớp đúng viền (dây đã đúng độ uốn từ trước): vệt chỉ vàng lóe trên dây đó
        /// và tiếng gảy, trễ 50 ms sau tiếng chốt như bản web.
        /// </summary>
        private void ZipChainedEdges(int pin)
        {
            var topo = _state.Topology;
            int n = topo.RingLength, node = _state.Pins.PinToNode[pin], zipped = 0;
            if (node < 0) return;
            for (int k = 0; k < n; k++)
            {
                if (topo.RingNode(k) != node && topo.RingNode((k + 1) % n) != node) continue;
                if (!_state.Pins.TryGetEdgeTarget(k, _state.Positions, _state.FoldLine, out float h)) continue;
                if (Mathf.Abs(_state.Bends[k] - h) >= ChainedSnapBend) continue;
                view.Zip(k, 0.05f);
                view.SnapEdge(k, 1f, 0.05f, 4, true);
                zipped++;
            }
            if (zipped > 0)
            {
                _audio?.PlaySfx(CurveSnap);
                Vibrate(VibCurveSnap);
            }
        }

        private void PlayReleaseSound(GrabKind grab, ReleaseResult result)
        {
            if (_audio == null || grab == GrabKind.None) return;
            if (grab == GrabKind.Node && result.Snapped)
            {
                // tiếng chốt gỗ leo dần theo số chốt đã lấp; chốt cuối có thêm quãng 5 ngân
                _state.Refresh();
                int step = Mathf.Clamp(_state.Pins.FilledCount - 1, 0, 5);
                _audio.PlayNote(_state.Pins.AllFilled ? PinSnapLast : PinSnap, step, 0.1f);
                Vibrate(VibPinSnap);
            }
            else if (grab == GrabKind.Edge && result.ContourSnap)
            {
                _audio.PlaySfx(CurveSnap);
                Vibrate(VibCurveSnap);
            }
            else
            {
                // clip "drop" kết xuất ở 0,07 (thả node); thả dây của bản web nhỏ hơn (0,06)
                _audio.PlaySfx(Drop, grab == GrabKind.Edge ? 0.06f / 0.07f : 1f);
                Vibrate(grab == GrabKind.Node ? VibDropNode : grab == GrabKind.Edge ? VibDropEdge : VibDropNeedle);
            }
        }

        private async UniTaskVoid PlayWinAsync() => await PlayWinSequenceAsync();

        /// <summary>Chạy chuỗi thắng rồi báo cho lớp nối. Test PlayMode gọi thẳng sau khi giải màn qua PuzzleState.</summary>
        internal async UniTask PlayWinSequenceAsync()
        {
            if (_presentation != null) return;
            _presentation = new PresentationContext(view, _win, _audio, hud, _slotIndex);
            await WinSequence.Default().PlayAsync(_presentation, this.GetCancellationTokenOnDestroy());
            _onWon?.Invoke();
        }
    }
}

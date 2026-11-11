using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Input;
using GraphNode.Core.Session;
using GraphNode.Data.Configs;
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

        public PuzzleState State => _state;

        public void Begin(PuzzleState state, InputConfig input, Action onWon)
        {
            _state = state ?? throw new ArgumentNullException(nameof(state));
            _input = input;
            _onWon = onWon;
            _camera = cameraFit.GetComponent<Camera>();
            _arbiter = new TouchArbiter(state.Level, state.Topology, state.Shape, input.ToTouchParams(FabricLayout.FabricSize));
            view.Bind(state);
        }

        private void Update()
        {
            if (_state == null) return;
            switch (pointer.Poll())
            {
                case PointerPhase.Began: OnBegan(); break;
                case PointerPhase.Moved: OnMoved(); break;
                case PointerPhase.Ended: OnEnded(false); break;
                case PointerPhase.Cancelled: OnEnded(true); break;
            }
            _state.Refresh();
            view.Render(Time.deltaTime, _grab == Grab.Node ? _state.DraggingNode : -1);
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
            _grab = Grab.None;
            if (result.Won) _onWon?.Invoke();
        }
    }
}

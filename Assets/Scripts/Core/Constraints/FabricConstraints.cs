using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Levels;
using GraphNode.Core.Pins;

namespace GraphNode.Core.Constraints
{
    /// <summary>Giữ node trong khung vải, cách mép một khoảng (bản web: 4%).</summary>
    public sealed class FabricBoundsConstraint : INodeConstraint
    {
        private readonly float _margin;

        public FabricBoundsConstraint(float margin) => _margin = margin;

        public Float2 Apply(in NodeDragContext context, Float2 proposed) =>
            new Float2(Math.Max(_margin, Math.Min(1 - _margin, proposed.X)), Math.Max(_margin, Math.Min(1 - _margin, proposed.Y)));
    }

    /// <summary>
    /// Màn gấp: node mép gấp nằm đúng trên kim; node thường ở nửa người chơi xếp, không vượt qua kim và không quá xa để bản
    /// soi gương còn trong khung vải.
    /// </summary>
    public sealed class FoldSideConstraint : INodeConstraint
    {
        private readonly FoldAxis _axis;
        private readonly PinBoard _board;
        private readonly float _fabricEdge;

        public FoldSideConstraint(FoldSpec fold, PinBoard board, float fabricEdge)
        {
            _axis = fold.Axis;
            _board = board;
            _fabricEdge = fabricEdge;
        }

        public Float2 Apply(in NodeDragContext context, Float2 proposed)
        {
            float line = context.FoldLine;
            float across = _axis == FoldAxis.Y ? proposed.Y : proposed.X;
            across = _board.OnFold(context.Node) ? line : Math.Max(2 * line - _fabricEdge, Math.Min(line, across));
            return _axis == FoldAxis.Y ? new Float2(proposed.X, across) : new Float2(across, proposed.Y);
        }
    }

    /// <summary>
    /// Quy đổi quãng kéo dây sang độ uốn (đặc tả mục Uốn cạnh): quãng kéo vuông góc với dây, nhân hệ số theo vị trí điểm bắt
    /// để kéo ở gần đầu dây vẫn uốn được tương đương kéo ở giữa; điểm bắt kẹp trong đoạn giữa dây.
    /// </summary>
    public static class BendDrag
    {
        public const float GrabMin = 0.14f;
        public const float GrabMax = 0.86f;

        public static float ClampGrab(float u) => Math.Max(GrabMin, Math.Min(GrabMax, u));

        /// <summary>Hệ số theo vị trí điểm bắt u (0–1 dọc dây).</summary>
        public static float Gain(float u)
        {
            float shape = 4 * u * (1 - u) * (1 + 4.8f * (u - 0.5f) * (u - 0.5f));
            return 1f / Math.Max(0.72f, Math.Min(1.08f, shape));
        }
    }
}

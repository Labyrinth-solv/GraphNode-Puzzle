using System;
using GraphNode.Core.Geometry;

namespace GraphNode.Core.Constraints
{
    /// <summary>Trạng thái chung mà ràng buộc node đọc khi node đang được kéo.</summary>
    public readonly ref struct NodeDragContext
    {
        public readonly int Node;
        /// <summary>Vị trí hiện tại của mọi node (node đang kéo ở vị trí cũ).</summary>
        public readonly ReadOnlySpan<Float2> Positions;
        /// <summary>Vị trí kim của màn gấp; 0 nếu không phải màn gấp.</summary>
        public readonly float FoldLine;

        public NodeDragContext(int node, ReadOnlySpan<Float2> positions, float foldLine)
        {
            Node = node;
            Positions = positions;
            FoldLine = foldLine;
        }
    }

    /// <summary>
    /// Ràng buộc vị trí node khi kéo (khóa, giới hạn khung vải, mép gấp, hút về chốt…). Cơ chế mới là một lớp mới,
    /// không thêm if theo loại level trong code chơi. Áp theo thứ tự trong danh sách.
    /// </summary>
    public interface INodeConstraint
    {
        Float2 Apply(in NodeDragContext context, Float2 proposed);
    }
}

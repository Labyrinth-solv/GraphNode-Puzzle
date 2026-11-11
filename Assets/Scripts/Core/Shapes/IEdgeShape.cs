using System;
using GraphNode.Core.Geometry;

namespace GraphNode.Core.Shapes
{
    /// <summary>
    /// Hình của một cạnh: sinh đường gấp khúc từ node a tới node b theo vị trí node và độ uốn của các cạnh vòng.
    /// Thêm kiểu cạnh mới (cạnh răng cưa, cạnh sóng…) bằng một lớp mới, không thêm if trong code chơi.
    /// </summary>
    public interface IEdgeShape
    {
        /// <param name="pos">Vị trí mọi node.</param>
        /// <param name="bends">Độ uốn theo cạnh vòng (chiều vòng).</param>
        /// <param name="steps">Số đoạn; cạnh thẳng chỉ ghi hai điểm.</param>
        /// <param name="mirrored">Vị trí đã soi gương qua trục gấp: pháp tuyến đổi dấu để chỗ phồng soi gương theo.</param>
        /// <param name="output">Bộ đệm ít nhất steps + 1 điểm.</param>
        /// <returns>Số điểm đã ghi.</returns>
        int Sample(ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, int a, int b, int steps, bool mirrored, Span<Float2> output);
    }
}

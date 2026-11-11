using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;

namespace GraphNode.Core.Shapes
{
    /// <summary>
    /// Luật tiếp tuyến của điểm cong (đặc tả): T(i) = (P(sau) − P(trước)) / 2, lấy hai láng giềng trên vòng.
    /// Màn gấp theo trục ngang: hai đầu đoạn cắt dùng tiếp tuyến một phía (hệ số 1,15) vì láng giềng kia nằm sau nếp gấp.
    /// </summary>
    public static class CatmullRomTangents
    {
        private const double FoldEndScale = 1.15;

        public static void Tangent(RingTopology topo, ReadOnlySpan<Float2> pos, int node, out double tx, out double ty)
        {
            var p = pos[topo.Prev(node)];
            var q = pos[topo.Next(node)];
            var fold = topo.Fold;
            if (fold != null && fold.Axis == FoldAxis.Y && fold.Chains.Count > 0)
            {
                var chain = fold.Chains[0];
                var c = pos[node];
                if (node == chain.From)
                {
                    tx = ((double)q.X - c.X) * FoldEndScale;
                    ty = ((double)q.Y - c.Y) * FoldEndScale;
                    return;
                }
                if (node == chain.To)
                {
                    tx = ((double)c.X - p.X) * FoldEndScale;
                    ty = ((double)c.Y - p.Y) * FoldEndScale;
                    return;
                }
            }
            tx = ((double)q.X - p.X) * 0.5;
            ty = ((double)q.Y - p.Y) * 0.5;
        }
    }
}

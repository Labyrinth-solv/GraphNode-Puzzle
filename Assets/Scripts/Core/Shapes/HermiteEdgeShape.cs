using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;

namespace GraphNode.Core.Shapes
{
    /// <summary>
    /// Cạnh vòng uốn theo độ uốn h (đặc tả mục Uốn cạnh): đường Hermite bậc ba từ a tới b. Tiếp tuyến hai đầu pha giữa
    /// hướng dây (cạnh thẳng) và tiếp tuyến Catmull-Rom; cộng thêm phần lệch theo pháp tuyến để chỗ phồng ở giữa dây đúng
    /// bằng h. Cạnh trong, cạnh mép gấp và cạnh gần thẳng vẽ thẳng.
    /// Gợn sóng lúc kéo dây là việc của View, không ở đây, để điểm khớp không rung theo.
    /// </summary>
    public sealed class HermiteEdgeShape : IEdgeShape
    {
        private const double StraightBend = 1e-4;
        private const double MinLength = 1e-6;
        /// <summary>Độ uốn của cạnh kề để tiếp tuyến chung pha hẳn sang Catmull-Rom (cạnh vốn thẳng ở lời giải).</summary>
        private const double NeighbourBlendBend = 0.025;
        /// <summary>Cạnh vốn cong pha hẳn sang Catmull-Rom khi đạt 80% độ uốn lời giải.</summary>
        private const double SolutionBlendFraction = 0.8;

        private readonly RingTopology _topo;
        private readonly SolutionBends _solution;

        public HermiteEdgeShape(RingTopology topo, SolutionBends solution)
        {
            _topo = topo ?? throw new ArgumentNullException(nameof(topo));
            _solution = solution ?? throw new ArgumentNullException(nameof(solution));
        }

        public int Sample(ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, int a, int b, int steps, bool mirrored, Span<Float2> output)
        {
            var pa = pos[a];
            var pb = pos[b];
            if (!_topo.TryGetRingEdge(a, b, out int k, out int dir) || !_topo.InFoldChain(k)) return Straight(pa, pb, output);

            double h = Bend(bends, k) * dir;
            if (Math.Abs(h) < StraightBend) return Straight(pa, pb, output);
            double dx = (double)pb.X - pa.X, dy = (double)pb.Y - pa.Y;
            double len = Math.Sqrt(dx * dx + dy * dy);
            if (len < MinLength) return Straight(pa, pb, output);

            double mir = mirrored ? -1 : 1;
            double nx = -dy / len * mir, ny = dx / len * mir;

            CatmullRomTangents.Tangent(_topo, pos, a, out double tax, out double tay);
            CatmullRomTangents.Tangent(_topo, pos, b, out double tbx, out double tby);
            double m0x = tax * dir, m0y = tay * dir, m1x = tbx * dir, m1y = tby * dir;

            int n = _topo.RingLength;
            double hPrev = Bend(bends, (k + n - 1) % n) * dir;
            double hNext = Bend(bends, (k + 1) % n) * dir;
            double solH = _solution.Bends[k] * dir;

            // trọng số pha tiếp tuyến: cạnh vốn cong theo độ uốn của chính nó, cạnh vốn thẳng theo cạnh kề cùng chiều
            double wa, wb;
            if (_solution.Curved[k] && h * solH >= 0)
            {
                wa = wb = Math.Min(1, Math.Abs(h) / Math.Max(1e-4, Math.Abs(solH) * SolutionBlendFraction));
            }
            else
            {
                wa = h * hPrev > 0 ? Math.Min(1, Math.Min(Math.Abs(h), Math.Abs(hPrev)) / NeighbourBlendBend) : 0;
                wb = h * hNext > 0 ? Math.Min(1, Math.Min(Math.Abs(h), Math.Abs(hNext)) / NeighbourBlendBend) : 0;
            }
            double t0x = dx + wa * (m0x - dx), t0y = dy + wa * (m0y - dy);
            double t1x = dx + wb * (m1x - dx), t1y = dy + wb * (m1y - dy);

            // Hermite có chỗ phồng giữa dây = 0,125 × (t0 − t1) · n; bù phần thiếu để chỗ phồng đúng bằng h
            double baseBulge = 0.125 * ((t0x - t1x) * nx + (t0y - t1y) * ny);
            double delta = 4 * (h - baseBulge);
            double v0x = t0x + delta * nx, v0y = t0y + delta * ny;
            double v1x = t1x - delta * nx, v1y = t1y - delta * ny;

            for (int s = 0; s <= steps; s++)
            {
                double t = (double)s / steps, t2 = t * t, t3 = t2 * t;
                double h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
                output[s] = new Float2(
                    (float)(h00 * pa.X + h10 * v0x + h01 * pb.X + h11 * v1x),
                    (float)(h00 * pa.Y + h10 * v0y + h01 * pb.Y + h11 * v1y));
            }
            return steps + 1;
        }

        private static double Bend(ReadOnlySpan<float> bends, int k) => k < bends.Length ? bends[k] : 0;

        private static int Straight(Float2 a, Float2 b, Span<Float2> output)
        {
            output[0] = a;
            output[1] = b;
            return 2;
        }
    }
}

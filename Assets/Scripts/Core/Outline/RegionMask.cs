using System;
using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Outline
{
    /// <summary>
    /// Mặt nạ vùng tô trên lưới 200×200 (đặc tả bảng Tham số mặt nạ): vẽ mọi cạnh lên lưới, tô loang 4 hướng từ bốn mép
    /// lưới, ô không loang tới (kể cả ô trên nét vẽ) là bên trong. Màn gấp: hợp mặt nạ với bản soi gương qua kim.
    /// Bộ đệm dựng một lần; Render không cấp phát.
    /// </summary>
    public sealed class RegionMask
    {
        public const int GridSize = 200;
        public const int CellCount = GridSize * GridSize;
        /// <summary>Lưới phủ rộng hơn khung vải để không cắt mất hình sát mép.</summary>
        public const double GridMin = -0.125;
        public const double GridMax = 1.125;
        public const double CellSize = (GridMax - GridMin) / GridSize;
        /// <summary>Ô có tâm cách đoạn không quá ngần này (đơn vị ô) thì thuộc nét vẽ.</summary>
        public const double LineRadius = 1.35;
        /// <summary>Số đoạn mỗi cạnh khi vẽ lên mặt nạ.</summary>
        public const int EdgeSteps = 20;

        private readonly RingTopology _topo;
        private readonly IEdgeShape _shape;
        private readonly byte[] _line = new byte[CellCount];
        private readonly byte[] _outside = new byte[CellCount];
        private readonly int[] _stack = new int[CellCount];
        private readonly Float2[] _poly = new Float2[EdgeSteps + 1];
        private readonly byte[] _mirrorMask;
        private readonly Float2[] _mirrorPos;

        public RegionMask(RingTopology topo, IEdgeShape shape, int nodeCount)
        {
            _topo = topo ?? throw new ArgumentNullException(nameof(topo));
            _shape = shape ?? throw new ArgumentNullException(nameof(shape));
            if (topo.Fold != null)
            {
                _mirrorMask = new byte[CellCount];
                _mirrorPos = new Float2[nodeCount];
            }
        }

        /// <summary>Mặt nạ của mảnh; màn gấp thì gồm cả nửa soi gương qua kim ở vị trí foldLine.</summary>
        public void RenderPiece(ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, float foldLine, byte[] inside)
        {
            Render(pos, bends, false, inside);
            var fold = _topo.Fold;
            if (fold == null) return;
            for (int i = 0; i < pos.Length; i++)
            {
                var p = pos[i];
                _mirrorPos[i] = fold.Axis == FoldAxis.Y ? new Float2(p.X, 2 * foldLine - p.Y) : new Float2(2 * foldLine - p.X, p.Y);
            }
            Render(_mirrorPos, bends, true, _mirrorMask);
            for (int i = 0; i < CellCount; i++) inside[i] |= _mirrorMask[i];
        }

        /// <summary>Mặt nạ của một nửa (không soi gương).</summary>
        public void Render(ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, bool mirrored, byte[] inside)
        {
            if (inside == null || inside.Length != CellCount) throw new ArgumentException($"mask must have {CellCount} cells", nameof(inside));
            Array.Clear(_line, 0, CellCount);
            Array.Clear(_outside, 0, CellCount);
            var edges = _topo.Edges;
            for (int e = 0; e < edges.Count; e++)
            {
                int count = _shape.Sample(pos, bends, edges[e].A, edges[e].B, EdgeSteps, mirrored, _poly);
                for (int i = 0; i + 1 < count; i++)
                    Stamp(ToCell(_poly[i].X), ToCell(_poly[i].Y), ToCell(_poly[i + 1].X), ToCell(_poly[i + 1].Y));
            }
            FloodFromBorder();
            for (int i = 0; i < CellCount; i++) inside[i] = _outside[i] != 0 ? (byte)0 : (byte)1;
        }

        public static int Area(byte[] mask)
        {
            int c = 0;
            for (int i = 0; i < mask.Length; i++) c += mask[i];
            return c;
        }

        private static double ToCell(float v) => (v - GridMin) / CellSize;

        private void Stamp(double ax, double ay, double bx, double by)
        {
            int minX = Math.Max(0, (int)Math.Floor(Math.Min(ax, bx) - LineRadius - 1));
            int maxX = Math.Min(GridSize - 1, (int)Math.Ceiling(Math.Max(ax, bx) + LineRadius + 1));
            int minY = Math.Max(0, (int)Math.Floor(Math.Min(ay, by) - LineRadius - 1));
            int maxY = Math.Min(GridSize - 1, (int)Math.Ceiling(Math.Max(ay, by) + LineRadius + 1));
            double dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy, r2 = LineRadius * LineRadius;
            for (int y = minY; y <= maxY; y++)
            for (int x = minX; x <= maxX; x++)
            {
                double px = x + 0.5 - ax, py = y + 0.5 - ay;
                double t = len2 > 0 ? (px * dx + py * dy) / len2 : 0;
                t = t < 0 ? 0 : (t > 1 ? 1 : t);
                double ex = px - t * dx, ey = py - t * dy;
                if (ex * ex + ey * ey <= r2) _line[y * GridSize + x] = 1;
            }
        }

        private void FloodFromBorder()
        {
            int sp = 0;
            for (int s = 0; s < GridSize; s++)
            {
                Seed(s, 0, ref sp);
                Seed(s, GridSize - 1, ref sp);
                Seed(0, s, ref sp);
                Seed(GridSize - 1, s, ref sp);
            }
            while (sp > 0)
            {
                int id = _stack[--sp], x = id % GridSize, y = id / GridSize;
                if (x > 0) Seed(x - 1, y, ref sp);
                if (x < GridSize - 1) Seed(x + 1, y, ref sp);
                if (y > 0) Seed(x, y - 1, ref sp);
                if (y < GridSize - 1) Seed(x, y + 1, ref sp);
            }
        }

        private void Seed(int x, int y, ref int sp)
        {
            int id = y * GridSize + x;
            if (_line[id] != 0 || _outside[id] != 0) return;
            _outside[id] = 1;
            _stack[sp++] = id;
        }
    }
}

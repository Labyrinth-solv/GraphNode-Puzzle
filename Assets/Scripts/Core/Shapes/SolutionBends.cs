using System;
using System.Collections.Generic;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;

namespace GraphNode.Core.Shapes
{
    /// <summary>
    /// Độ uốn lời giải từng cạnh vòng, tính một lần lúc vào màn (đặc tả mục Uốn cạnh):
    /// h = 0,125 × ((T(a) − T(b)) · n), n là pháp tuyến đơn vị của cạnh. Cạnh có đầu thẳng, cạnh ép thẳng và cạnh nằm
    /// ngoài đoạn cắt của màn gấp có h = 0. solBendOverride của level đè lên kết quả.
    /// </summary>
    public sealed class SolutionBends
    {
        /// <summary>Cạnh cong có |h| quá nhỏ vẫn giữ dấu, để luật pha tiếp tuyến biết cạnh này cong về phía nào.</summary>
        private const double MinCurvedBend = 2e-4;

        public float[] Bends { get; }
        /// <summary>Cạnh cong ở lời giải (kể cả cạnh đặt tay bằng solBendOverride).</summary>
        public bool[] Curved { get; }

        public SolutionBends(LevelModel level, RingTopology topo)
        {
            int n = topo.RingLength;
            Bends = new float[n];
            Curved = new bool[n];
            var sol = level.Solution;
            for (int k = 0; k < n; k++)
            {
                int a = topo.RingNode(k), b = topo.RingNode((k + 1) % n);
                bool straight = !topo.InFoldChain(k) || Contains(level.StraightEdges, k)
                                || level.Kinds[a] != NodeKind.Curved || level.Kinds[b] != NodeKind.Curved;
                if (straight) continue;

                double dx = (double)sol[b].X - sol[a].X, dy = (double)sol[b].Y - sol[a].Y;
                double len = Math.Sqrt(dx * dx + dy * dy);
                if (len == 0) len = 1;
                double nx = -dy / len, ny = dx / len;
                CatmullRomTangents.Tangent(topo, sol, a, out double tax, out double tay);
                CatmullRomTangents.Tangent(topo, sol, b, out double tbx, out double tby);
                double h = 0.125 * ((tax - tbx) * nx + (tay - tby) * ny);
                if (Math.Abs(h) < MinCurvedBend) h = (h >= 0 ? 1 : -1) * MinCurvedBend;
                Bends[k] = (float)h;
                Curved[k] = true;
            }
            foreach (var pair in level.SolutionBendOverride)
            {
                if (pair.Key < 0 || pair.Key >= n) continue;
                Bends[pair.Key] = pair.Value;
                Curved[pair.Key] = true;
            }
        }

        private static bool Contains(IReadOnlyCollection<int> set, int k)
        {
            foreach (int v in set)
                if (v == k) return true;
            return false;
        }
    }
}

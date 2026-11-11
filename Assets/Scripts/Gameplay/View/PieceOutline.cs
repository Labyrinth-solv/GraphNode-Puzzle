using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Shapes;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Viền lời giải của một mảnh (đúng hình miếng vải sau khi cắt), dựng từ dữ liệu level mà không cần phiên chơi:
    /// cho ô Bộ vải ghép vẽ lại các mảnh đã xong của sản phẩm. Toạ độ khung vải, trục y hướng lên để dùng thẳng trên Canvas.
    /// </summary>
    public static class PieceOutline
    {
        private const int EdgeSteps = 24;

        public static void Build(LevelModel level, List<Vector2> points, List<int> triangles)
        {
            points.Clear();
            triangles.Clear();
            var topo = new RingTopology(level);
            var solution = new SolutionBends(level, topo);
            var shape = new HermiteEdgeShape(topo, solution);
            var buffer = new Float2[EdgeSteps + 1];
            int n = topo.RingLength;
            for (int k = 0; k < n; k++)
            {
                // mép gấp không phải đường cắt
                if (!topo.InFoldChain(k)) continue;
                int count = shape.Sample(level.Solution, solution.Bends, topo.RingNode(k), topo.RingNode((k + 1) % n), EdgeSteps, false, buffer);
                for (int s = points.Count > 0 ? 1 : 0; s < count; s++) points.Add(new Vector2(buffer[s].X, -buffer[s].Y));
            }
            if (points.Count > 2 && (points[0] - points[points.Count - 1]).sqrMagnitude < 1e-10f) points.RemoveAt(points.Count - 1);
            var poly = new List<Vector3>(points.Count);
            foreach (var p in points) poly.Add(p);
            PolygonTriangulator.Triangulate(poly, triangles);
        }
    }
}

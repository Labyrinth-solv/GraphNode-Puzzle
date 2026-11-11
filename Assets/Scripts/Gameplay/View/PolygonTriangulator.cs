using System.Collections.Generic;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Tam giác hóa đa giác đơn (không tự cắt) bằng cắt tai. Dùng một lần lúc vào màn cho hình mẫu, không gọi mỗi khung.
    /// </summary>
    public static class PolygonTriangulator
    {
        public static void Triangulate(List<Vector3> poly, List<int> triangles)
        {
            triangles.Clear();
            int n = poly.Count;
            if (n < 3) return;
            var idx = new List<int>(n);
            bool ccw = SignedArea(poly) > 0;
            for (int i = 0; i < n; i++) idx.Add(ccw ? i : n - 1 - i);
            int guard = 0;
            while (idx.Count > 3 && guard++ < n * n)
            {
                bool clipped = false;
                for (int i = 0; i < idx.Count; i++)
                {
                    int a = idx[(i + idx.Count - 1) % idx.Count], b = idx[i], c = idx[(i + 1) % idx.Count];
                    if (Cross(poly[a], poly[b], poly[c]) <= 1e-7f) continue;
                    if (AnyInside(poly, idx, a, b, c)) continue;
                    triangles.Add(a); triangles.Add(b); triangles.Add(c);
                    idx.RemoveAt(i);
                    clipped = true;
                    break;
                }
                if (!clipped) break; // đa giác suy biến: dừng, phần còn lại không tô
            }
            if (idx.Count == 3) { triangles.Add(idx[0]); triangles.Add(idx[1]); triangles.Add(idx[2]); }
        }

        private static float SignedArea(List<Vector3> p)
        {
            float s = 0;
            for (int i = 0; i < p.Count; i++)
            {
                var a = p[i];
                var b = p[(i + 1) % p.Count];
                s += a.x * b.y - b.x * a.y;
            }
            return s * 0.5f;
        }

        private static float Cross(Vector3 a, Vector3 b, Vector3 c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

        private static bool AnyInside(List<Vector3> p, List<int> idx, int a, int b, int c)
        {
            for (int k = 0; k < idx.Count; k++)
            {
                int v = idx[k];
                if (v == a || v == b || v == c) continue;
                var q = p[v];
                if (Cross(p[a], p[b], q) >= 0 && Cross(p[b], p[c], q) >= 0 && Cross(p[c], p[a], q) >= 0) return true;
            }
            return false;
        }
    }
}

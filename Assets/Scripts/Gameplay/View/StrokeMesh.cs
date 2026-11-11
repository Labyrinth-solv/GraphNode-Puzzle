using System.Collections.Generic;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Dựng nét dày (sợi chỉ, viền nét đứt) thành mesh dải trên cùng một đối tượng Mesh, tái dùng danh sách đệm nên mỗi
    /// khung không cấp phát. Mỗi đoạn là một tứ giác; mối nối dùng góc nhọn có giới hạn để nét liền không bị hở.
    /// </summary>
    public sealed class StrokeMesh
    {
        private const float MiterLimit = 2.5f;

        private readonly List<Vector3> _vertices = new List<Vector3>(2048);
        private readonly List<Color32> _colors = new List<Color32>(2048);
        private readonly List<int> _indices = new List<int>(4096);

        public Mesh Mesh { get; }

        // bảng tra 256 mức để đổi màu mỗi khung không tốn pow
        private static byte[] _srgbToLinear;
        private static byte[] SrgbToLinear
        {
            get
            {
                if (_srgbToLinear != null) return _srgbToLinear;
                var t = new byte[256];
                for (int i = 0; i < 256; i++) t[i] = (byte)Mathf.RoundToInt(Mathf.GammaToLinearSpace(i / 255f) * 255f);
                return _srgbToLinear = t;
            }
        }

        public StrokeMesh(string name)
        {
            Mesh = new Mesh { name = name };
            Mesh.MarkDynamic();
        }

        /// <summary>Gắn mesh động vào MeshFilter đã dựng sẵn trong prefab (renderer, material, thứ tự vẽ đặt trong Editor).</summary>
        public static StrokeMesh Attach(MeshFilter filter)
        {
            var stroke = new StrokeMesh(filter.name);
            filter.sharedMesh = stroke.Mesh;
            return stroke;
        }

        public void Clear()
        {
            _vertices.Clear();
            _colors.Clear();
            _indices.Clear();
        }

        /// <summary>Thêm một đường liền (mở hoặc khép), màu theo từng điểm.</summary>
        public void AddPolyline(List<Vector3> points, List<Color32> colors, float width, bool closed)
        {
            int n = points.Count;
            if (n < 2) return;
            float half = width * 0.5f;
            int baseIndex = _vertices.Count;
            for (int i = 0; i < n; i++)
            {
                Vector3 prev = i > 0 ? points[i - 1] : (closed ? points[n - 1] : points[i]);
                Vector3 next = i < n - 1 ? points[i + 1] : (closed ? points[0] : points[i]);
                Vector2 dIn = ((Vector2)(points[i] - prev)).normalized;
                Vector2 dOut = ((Vector2)(next - points[i])).normalized;
                if (dIn == Vector2.zero) dIn = dOut;
                if (dOut == Vector2.zero) dOut = dIn;
                Vector2 nIn = new Vector2(-dIn.y, dIn.x), nOut = new Vector2(-dOut.y, dOut.x);
                Vector2 miter = (nIn + nOut);
                float len = miter.magnitude;
                miter = len > 1e-4f ? miter / len : nOut;
                float scale = Mathf.Min(MiterLimit, 1f / Mathf.Max(0.2f, Vector2.Dot(miter, nOut)));
                Vector3 off = (Vector3)(miter * half * scale);
                _vertices.Add(points[i] + off);
                _vertices.Add(points[i] - off);
                _colors.Add(colors[i]);
                _colors.Add(colors[i]);
            }
            int segs = closed ? n : n - 1;
            for (int s = 0; s < segs; s++)
            {
                int a = baseIndex + 2 * s, b = baseIndex + 2 * ((s + 1) % n);
                _indices.Add(a); _indices.Add(b); _indices.Add(a + 1);
                _indices.Add(a + 1); _indices.Add(b); _indices.Add(b + 1);
            }
        }

        /// <summary>Thêm nét đứt dọc một đường khép kín: vạch dài dash, khoảng trống gap (cùng đơn vị scene).</summary>
        public void AddDashedLoop(List<Vector3> points, Color32 color, float width, float dash, float gap)
        {
            int n = points.Count;
            if (n < 2) return;
            float half = width * 0.5f, pos = 0f, period = dash + gap;
            for (int i = 0; i < n; i++)
            {
                Vector3 a = points[i], b = points[(i + 1) % n];
                float segLen = Vector3.Distance(a, b);
                if (segLen < 1e-5f) continue;
                Vector3 dir = (b - a) / segLen;
                Vector3 nrm = new Vector3(-dir.y, dir.x, 0f) * half;
                float t = 0f;
                while (t < segLen)
                {
                    float phase = pos % period;
                    float run = phase < dash ? Mathf.Min(dash - phase, segLen - t) : Mathf.Min(period - phase, segLen - t);
                    if (phase < dash) AddQuad(a + dir * t, a + dir * (t + run), nrm, color);
                    t += run;
                    pos += run;
                }
            }
        }

        /// <summary>Nét đứt dọc một đường mở (không nối điểm cuối về điểm đầu).</summary>
        public void AddDashedOpen(List<Vector3> points, Color32 color, float width, float dash, float gap)
        {
            int n = points.Count;
            float half = width * 0.5f, pos = 0f, period = dash + gap;
            for (int i = 0; i + 1 < n; i++)
            {
                Vector3 a = points[i], b = points[i + 1];
                float segLen = Vector3.Distance(a, b);
                if (segLen < 1e-5f) continue;
                Vector3 dir = (b - a) / segLen;
                Vector3 nrm = new Vector3(-dir.y, dir.x, 0f) * half;
                float t = 0f;
                while (t < segLen)
                {
                    float phase = pos % period;
                    float run = phase < dash ? Mathf.Min(dash - phase, segLen - t) : Mathf.Min(period - phase, segLen - t);
                    if (phase < dash) AddQuad(a + dir * t, a + dir * (t + run), nrm, color);
                    t += run;
                    pos += run;
                }
            }
        }

        private void AddQuad(Vector3 p0, Vector3 p1, Vector3 nrm, Color32 color)
        {
            int i = _vertices.Count;
            _vertices.Add(p0 + nrm); _vertices.Add(p0 - nrm); _vertices.Add(p1 + nrm); _vertices.Add(p1 - nrm);
            for (int k = 0; k < 4; k++) _colors.Add(color);
            _indices.Add(i); _indices.Add(i + 2); _indices.Add(i + 1);
            _indices.Add(i + 1); _indices.Add(i + 2); _indices.Add(i + 3);
        }

        /// <summary>Vòng tròn rỗng (tâm, bán kính tới giữa nét, bề dày nét).</summary>
        public void AddRing(Vector3 c, float r, float width, Color32 color, int segments = 32)
        {
            int baseIndex = _vertices.Count;
            float ri = r - width * 0.5f, ro = r + width * 0.5f;
            for (int s = 0; s < segments; s++)
            {
                float a = s * Mathf.PI * 2f / segments;
                var d = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f);
                _vertices.Add(c + d * ro);
                _vertices.Add(c + d * ri);
                _colors.Add(color);
                _colors.Add(color);
            }
            for (int s = 0; s < segments; s++)
            {
                int a = baseIndex + 2 * s, b = baseIndex + 2 * ((s + 1) % segments);
                _indices.Add(a); _indices.Add(b); _indices.Add(a + 1);
                _indices.Add(a + 1); _indices.Add(b); _indices.Add(b + 1);
            }
        }

        /// <summary>Đĩa tròn đặc.</summary>
        public void AddDisc(Vector3 c, float r, Color32 color, int segments = 24)
        {
            int center = _vertices.Count;
            _vertices.Add(c);
            _colors.Add(color);
            for (int s = 0; s < segments; s++)
            {
                float a = s * Mathf.PI * 2f / segments;
                _vertices.Add(c + new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f) * r);
                _colors.Add(color);
            }
            for (int s = 0; s < segments; s++)
            {
                _indices.Add(center); _indices.Add(center + 1 + (s + 1) % segments); _indices.Add(center + 1 + s);
            }
        }

        /// <summary>Hình chữ nhật xoay góc angle (radian) quanh tâm.</summary>
        public void AddRect(Vector3 c, float halfW, float halfH, float angle, Color32 color)
        {
            var u = new Vector3(Mathf.Cos(angle), Mathf.Sin(angle), 0f);
            var v = new Vector3(-u.y, u.x, 0f);
            AddQuadCorners(c - u * halfW - v * halfH, c - u * halfW + v * halfH, c + u * halfW - v * halfH, c + u * halfW + v * halfH, color);
        }

        /// <summary>Hình thoi (đốm lấp lánh): bán trục ngang rx, dọc ry.</summary>
        public void AddDiamond(Vector3 c, float rx, float ry, Color32 color)
        {
            AddQuadCorners(c + new Vector3(-rx, 0f), c + new Vector3(0f, ry), c + new Vector3(0f, -ry), c + new Vector3(rx, 0f), color);
        }

        // thứ tự đỉnh như AddQuad: (p0+, p0−, p1+, p1−)
        private void AddQuadCorners(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Color32 color)
        {
            int i = _vertices.Count;
            _vertices.Add(a); _vertices.Add(b); _vertices.Add(c); _vertices.Add(d);
            for (int k = 0; k < 4; k++) _colors.Add(color);
            _indices.Add(i); _indices.Add(i + 2); _indices.Add(i + 1);
            _indices.Add(i + 1); _indices.Add(i + 2); _indices.Add(i + 3);
        }

        /// <summary>Thêm vùng tô đa giác đã tam giác hóa sẵn.</summary>
        public void AddTriangles(List<Vector3> points, List<int> triangles, Color32 color)
        {
            int baseIndex = _vertices.Count;
            for (int i = 0; i < points.Count; i++)
            {
                _vertices.Add(points[i]);
                _colors.Add(color);
            }
            for (int i = 0; i < triangles.Count; i++) _indices.Add(baseIndex + triangles[i]);
        }

        public void Apply()
        {
            // dự án ở Linear color space: SpriteRenderer tự đổi màu sRGB sang tuyến tính, còn màu đỉnh mesh thì không,
            // nên phải đổi ở đây, nếu không mọi nét chỉ và viền mẫu nhạt hẳn so với bản web
            if (QualitySettings.activeColorSpace == ColorSpace.Linear)
            {
                var lut = SrgbToLinear;
                for (int i = 0; i < _colors.Count; i++)
                {
                    var c = _colors[i];
                    _colors[i] = new Color32(lut[c.r], lut[c.g], lut[c.b], c.a);
                }
            }
            Mesh.Clear();
            Mesh.SetVertices(_vertices);
            Mesh.SetColors(_colors);
            Mesh.SetTriangles(_indices, 0, false);
            Mesh.RecalculateBounds();
        }
    }
}

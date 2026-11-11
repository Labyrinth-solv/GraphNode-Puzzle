using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace GraphNode.UI.Common
{
    /// <summary>
    /// Vẽ một hình đa giác (tô và viền nét đứt) trong Canvas, giữ đúng tỉ lệ, canh giữa trong RectTransform. Dùng cho hình
    /// mẫu nhỏ trên HUD (và sau này bong bóng, thẻ đơn, lookbook). Hình đặt một lần bằng <see cref="SetShape"/>; mesh UI chỉ
    /// dựng lại khi hình hay cỡ khung đổi.
    /// </summary>
    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class UIShapeGraphic : MaskableGraphic
    {
        [SerializeField] private Color fillColor = new Color(1f, 0.6f, 0.7f, 0.45f);
        [SerializeField] private Color lineColor = new Color32(0x4A, 0x3B, 0x35, 0xFF);
        [SerializeField] private float lineWidth = 2f;
        [SerializeField] private float dash = 5f;
        [SerializeField] private float gap = 4f;

        private readonly List<Vector2> _points = new List<Vector2>();
        private readonly List<int> _triangles = new List<int>();

        /// <param name="points">Đỉnh đa giác (đơn vị bất kỳ, y hướng lên), khép kín, không lặp điểm đầu.</param>
        /// <param name="triangles">Tam giác hóa sẵn của đa giác.</param>
        public void SetShape(IReadOnlyList<Vector2> points, IReadOnlyList<int> triangles, Color fill)
        {
            _points.Clear();
            _triangles.Clear();
            for (int i = 0; i < points.Count; i++) _points.Add(points[i]);
            for (int i = 0; i < triangles.Count; i++) _triangles.Add(triangles[i]);
            fillColor = fill;
            SetVerticesDirty();
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            if (_points.Count < 3) return;
            var rect = GetPixelAdjustedRect();
            Vector2 min = _points[0], max = _points[0];
            foreach (var p in _points) { min = Vector2.Min(min, p); max = Vector2.Max(max, p); }
            var size = max - min;
            float scale = Mathf.Min(rect.width / Mathf.Max(1e-4f, size.x), rect.height / Mathf.Max(1e-4f, size.y));
            var offset = rect.center - (min + size * 0.5f) * scale;

            var fill = (Color32)(fillColor * color);
            for (int i = 0; i < _points.Count; i++) vh.AddVert(_points[i] * scale + offset, fill, Vector2.zero);
            for (int i = 0; i + 2 < _triangles.Count; i += 3) vh.AddTriangle(_triangles[i], _triangles[i + 1], _triangles[i + 2]);

            // viền nét đứt quanh hình
            var line = (Color32)(lineColor * color);
            float half = lineWidth * 0.5f, pos = 0f, period = dash + gap;
            int n = _points.Count;
            for (int i = 0; i < n; i++)
            {
                Vector2 a = _points[i] * scale + offset, b = _points[(i + 1) % n] * scale + offset;
                float len = Vector2.Distance(a, b);
                if (len < 1e-4f) continue;
                Vector2 dir = (b - a) / len, nrm = new Vector2(-dir.y, dir.x) * half;
                float t = 0f;
                while (t < len)
                {
                    float phase = pos % period;
                    float run = phase < dash ? Mathf.Min(dash - phase, len - t) : Mathf.Min(period - phase, len - t);
                    if (phase < dash)
                    {
                        Vector2 p0 = a + dir * t, p1 = a + dir * (t + run);
                        int v = vh.currentVertCount;
                        vh.AddVert(p0 + nrm, line, Vector2.zero);
                        vh.AddVert(p0 - nrm, line, Vector2.zero);
                        vh.AddVert(p1 + nrm, line, Vector2.zero);
                        vh.AddVert(p1 - nrm, line, Vector2.zero);
                        vh.AddTriangle(v, v + 2, v + 1);
                        vh.AddTriangle(v + 1, v + 2, v + 3);
                    }
                    t += run;
                    pos += run;
                }
            }
        }
    }
}

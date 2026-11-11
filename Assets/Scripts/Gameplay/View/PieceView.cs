using System.Collections.Generic;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Miếng vải vừa cắt trong chuỗi thắng (theo bản web chính): lỗ để lại trên khung vải, miếng vải nhấc lên lắc nhẹ, màu
    /// loang từ dưới lên theo phong cách tranh tô màu, rồi bay vào ô trong hàng Bộ vải ghép. Đối tượng và renderer nằm
    /// trong prefab Piece và lớp Hole của PuzzleBoard; lớp này chỉ đổ hình và màu vào.
    /// </summary>
    public sealed class PieceView
    {
        private const int TexSize = 128;
        private const float OutlineWidth = 4.2f;
        /// <summary>Lúc bay về ô, mảnh vẽ đè lên HUD Canvas.</summary>
        private const int AboveHudOrder = 40;

        private readonly PieceRig _rig;
        private readonly Transform _piece;
        private readonly MeshRenderer _shadow;
        private readonly MeshRenderer[] _renderers;
        private readonly int[] _baseOrders;
        private readonly Texture2D _texture;
        private readonly Color32[] _gradient;
        private readonly Color32[] _pixels;
        private readonly Vector3 _center;
        private readonly float _maxDim;
        private readonly List<Object> _owned = new List<Object>();
        private bool _aboveHud;

        /// <param name="outline">Viền lời giải (toạ độ scene, khép kín, không lặp điểm đầu).</param>
        /// <param name="triangles">Tam giác hóa sẵn của viền.</param>
        public PieceView(PieceRig rig, MeshFilter hole, List<Vector3> outline, List<int> triangles,
            Color baseColor, Color light, Color dark, Color line, Color holeColor, Color thread)
        {
            _rig = rig;
            _piece = rig.transform;
            float minX = float.MaxValue, minY = float.MaxValue, maxX = float.MinValue, maxY = float.MinValue;
            foreach (var p in outline)
            {
                minX = Mathf.Min(minX, p.x); maxX = Mathf.Max(maxX, p.x);
                minY = Mathf.Min(minY, p.y); maxY = Mathf.Max(maxY, p.y);
            }
            _center = new Vector3((minX + maxX) / 2f, (minY + maxY) / 2f, 0f);
            float w = maxX - minX, h = maxY - minY;
            _maxDim = Mathf.Max(w, h);

            // lỗ trên khung vải: màu lỗ và viền chỉ nét đứt, nằm yên chỗ cũ
            var holeMesh = new StrokeMesh("Hole");
            holeMesh.AddTriangles(outline, triangles, holeColor);
            holeMesh.AddDashedLoop(outline, thread, 1.6f, 5f, 4f);
            holeMesh.Apply();
            Own(holeMesh.Mesh);
            hole.sharedMesh = holeMesh.Mesh;
            hole.GetComponent<MeshRenderer>().enabled = true;

            _piece.position = _center;
            var local = new List<Vector3>(outline.Count);
            foreach (var p in outline) local.Add(p - _center);

            var shadowMesh = new StrokeMesh("PieceShadow");
            shadowMesh.AddTriangles(local, triangles, new Color(0.29f, 0.23f, 0.21f, 0.18f));
            shadowMesh.Apply();
            rig.Shadow.sharedMesh = Own(shadowMesh.Mesh);
            _shadow = rig.Shadow.GetComponent<MeshRenderer>();

            var cream = new StrokeMesh("PieceCream");
            cream.AddTriangles(local, triangles, new Color32(0xFF, 0xF7, 0xE8, 0xFF));
            cream.Apply();
            rig.Cream.sharedMesh = Own(cream.Mesh);

            // lớp màu: texture chuyển sắc trải theo khung bao của mảnh; lộ dần từ dưới lên bằng kênh alpha
            var colorMesh = new Mesh { name = "PieceColor" };
            var uv = new List<Vector2>(local.Count);
            foreach (var p in local) uv.Add(new Vector2((p.x + w / 2f) / w, (p.y + h / 2f) / h));
            var white = new List<Color32>(local.Count);
            for (int i = 0; i < local.Count; i++) white.Add(new Color32(255, 255, 255, 255));
            colorMesh.SetVertices(local);
            colorMesh.SetUVs(0, uv);
            colorMesh.SetColors(white);
            colorMesh.SetTriangles(triangles, 0);
            rig.Color.sharedMesh = Own(colorMesh);
            _texture = new Texture2D(TexSize, TexSize, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            Own(_texture);
            _gradient = BuildGradient(w, h, light, baseColor, dark);
            _pixels = new Color32[_gradient.Length];
            var block = new MaterialPropertyBlock();
            block.SetTexture("_MainTex", _texture);
            rig.Color.GetComponent<MeshRenderer>().SetPropertyBlock(block);
            SetFill(0f);

            var outlineMesh = new StrokeMesh("PieceOutline");
            var colors = new List<Color32>(local.Count);
            for (int i = 0; i < local.Count; i++) colors.Add(line);
            outlineMesh.AddPolyline(local, colors, OutlineWidth, true);
            outlineMesh.Apply();
            rig.Outline.sharedMesh = Own(outlineMesh.Mesh);

            _renderers = rig.GetComponentsInChildren<MeshRenderer>(true);
            _baseOrders = new int[_renderers.Length];
            for (int i = 0; i < _renderers.Length; i++) _baseOrders[i] = _renderers[i].sortingOrder;
            rig.gameObject.SetActive(true);
        }

        /// <summary>Nhấc: lên 12 pt, to 1,04 lần, lắc nhẹ quanh tâm (độ nhấc lift 0–1, góc lắc theo radian).</summary>
        public void SetLift(float lift, float swayRadians)
        {
            _piece.position = _center + new Vector3(0f, 12f * lift, 0f);
            _piece.localScale = Vector3.one * (1f + 0.04f * lift);
            _piece.rotation = Quaternion.Euler(0f, 0f, -swayRadians * Mathf.Rad2Deg);
        }

        /// <summary>Màu loang từ đáy mảnh lên tới phần fill (0–1), mép loang có vệt sáng mảnh.</summary>
        public void SetFill(float fill)
        {
            int edge = Mathf.RoundToInt(fill * TexSize);
            for (int y = 0; y < TexSize; y++)
            {
                int row = y * TexSize;
                bool shown = y < edge;
                bool rim = shown && fill < 1f && y >= edge - 2;
                for (int x = 0; x < TexSize; x++)
                {
                    var c = _gradient[row + x];
                    if (!shown) c.a = 0;
                    else if (rim) c = Color32.Lerp(c, new Color32(255, 255, 255, 255), 0.55f);
                    _pixels[row + x] = c;
                }
            }
            _texture.SetPixels32(_pixels);
            _texture.Apply(false);
        }

        /// <summary>Bay vào ô: từ chỗ nhấc tới tâm ô, theo cung vồng 70 pt, nhỏ dần cho vừa ô cỡ fitSize; vẽ đè lên HUD.</summary>
        public void SetFly(float u, Vector3 slotCenter, float fitSize)
        {
            if (!_aboveHud)
            {
                _aboveHud = true;
                for (int i = 0; i < _renderers.Length; i++) _renderers[i].sortingOrder = _baseOrders[i] + AboveHudOrder;
            }
            var from = _center + new Vector3(0f, 12f, 0f);
            _piece.position = Vector3.Lerp(from, slotCenter, u) + new Vector3(0f, 70f * Mathf.Sin(Mathf.PI * u), 0f);
            _piece.localScale = Vector3.one * Mathf.Lerp(1.04f, fitSize / _maxDim, u);
            _piece.rotation = Quaternion.identity;
            _shadow.enabled = u < 0.8f;
        }

        public void Destroy()
        {
            foreach (var o in _owned) if (o != null) Object.Destroy(o);
        }

        private static Color32[] BuildGradient(float w, float h, Color light, Color baseColor, Color dark)
        {
            // chuyển sắc tròn như paintFlat của bản web: tâm sáng ở (0,32w; 0,28h) tính từ góc trên trái
            var px = new Color32[TexSize * TexSize];
            float cx = 0.32f * w, cy = 0.28f * h, r = Mathf.Max(w, h) * 0.75f;
            for (int y = 0; y < TexSize; y++)
            for (int x = 0; x < TexSize; x++)
            {
                float ptX = (x + 0.5f) / TexSize * w, ptY = (1f - (y + 0.5f) / TexSize) * h;
                float t = Mathf.Clamp01(Mathf.Sqrt((ptX - cx) * (ptX - cx) + (ptY - cy) * (ptY - cy)) / r);
                Color c = t < 0.55f ? Color.Lerp(light, baseColor, t / 0.55f) : Color.Lerp(baseColor, dark, (t - 0.55f) / 0.45f);
                c.a = 1f;
                px[y * TexSize + x] = c;
            }
            return px;
        }

        private T Own<T>(T o) where T : Object
        {
            _owned.Add(o);
            return o;
        }
    }
}

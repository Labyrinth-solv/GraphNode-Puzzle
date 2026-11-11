using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Session;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Hiển thị màn chơi cho bản thử M2, theo hình của bản web chính (người dùng chốt 2026-11-11): khung vải, thẻ thông tin
    /// và thanh khớp, hình mẫu nét đứt, vùng tô, chốt, sợi chỉ đổi màu, node. Chỉ đọc PuzzleState, không giữ luật. Là
    /// phần thay được: giao diện chính thức của người dùng sẽ thay lớp này. Mesh và texture tạo một lần, mỗi khung chỉ
    /// cập nhật dữ liệu.
    /// </summary>
    public sealed class PuzzleView : MonoBehaviour
    {
        [Header("Sprite xuất từ bản web (Assets/Art/Sprites/WebDemo)")]
        [SerializeField] private Sprite fabricCard;
        [SerializeField] private Sprite hudInfo;
        [SerializeField] private Sprite barBack;
        [SerializeField] private Sprite barFrame;
        [SerializeField] private Sprite barFill;
        [SerializeField] private Sprite barMarker;
        [SerializeField] private Sprite nodeFree;
        [SerializeField] private Sprite nodeLocked;
        [SerializeField] private Sprite pinEmpty;
        [SerializeField] private Sprite pinFilled;
        [Tooltip("Vật liệu cho mesh nét và vùng tô: shader sprite không ánh sáng, dùng màu đỉnh")]
        [SerializeField] private Material strokeMaterial;

        [Header("Màu (theo bản web)")]
        [SerializeField] private Color thread = new Color32(0xC2, 0x9C, 0x90, 0xFF);
        [SerializeField] private Color ink = new Color32(0x4A, 0x3B, 0x35, 0xFF);
        [SerializeField] private Color maskColor = new Color32(233, 150, 160, 255);
        [SerializeField, Range(0f, 1f)] private float maskAlpha = 0.20f;
        [Tooltip("Màu mảnh trong thẻ Hình mẫu (màu vải của level; chưa có FabricDefinition nên đặt tay)")]
        [SerializeField] private Color pieceColor = new Color32(0xF2, 0x55, 0x7E, 0xFF);
        [SerializeField] private Color barFar = new Color32(0xEE, 0xB8, 0xB0, 0xFF);
        [SerializeField] private Color barMid = new Color32(0xD8, 0x8A, 0x74, 0xFF);
        [SerializeField] private Color barNear = new Color32(0x5D, 0xB5, 0x82, 0xFF);

        // thứ tự vẽ (sau vẽ đè trước)
        private const int OrderFabric = 0, OrderFill = 1, OrderGhost = 2, OrderPins = 3, OrderThread = 4, OrderNodes = 5, OrderHud = 10;
        private const int EdgeSteps = 24;
        private const float BarWidth = 170f, BarHeight = 22f, BarX = 186f, BarY = 112f;
        // dải màu chỉ nhuộm ombre của bản web
        private static readonly Color32[] Yarn =
        {
            new Color32(214, 122, 114, 255), new Color32(222, 170, 92, 255), new Color32(118, 172, 138, 255),
            new Color32(114, 150, 184, 255), new Color32(172, 130, 168, 255)
        };

        private PuzzleState _state;
        private StrokeMesh _ghost, _thread, _mini;
        private SpriteRenderer _fill, _barFill, _barMarker1, _barMarker2;
        private Texture2D _maskTexture;
        private byte[] _maskPixels;
        private int _maskVersion = -1;
        private SpriteRenderer[] _nodes, _pins;
        private readonly List<Vector3> _points = new List<Vector3>(512);
        private readonly List<Color32> _colors = new List<Color32>(512);
        private readonly List<float> _cumulative = new List<float>(512);
        private readonly Float2[] _edgeBuffer = new Float2[EdgeSteps + 1];
        private float _barValue;
        private float _clock;

        public void Bind(PuzzleState state)
        {
            _state = state;
            BuildStatic();
            BuildDynamic();
        }

        private void BuildStatic()
        {
            Sprite("Fabric", fabricCard, FabricLayout.LayoutToWorld(14f - 8f + 189f, 256f - 12f + 193f), OrderFabric);
            Sprite("HudInfo", hudInfo, FabricLayout.LayoutToWorld(18f + 177f, 78f + 76f), OrderHud);
            Sprite("BarBack", barBack, FabricLayout.LayoutToWorld(BarX + 85f, BarY + 11f), OrderHud + 1);
            _barFill = Sprite("BarFill", barFill, Vector3.zero, OrderHud + 2);
            _barFill.drawMode = SpriteDrawMode.Sliced;
            _barMarker1 = Sprite("BarMarker1", barMarker, Vector3.zero, OrderHud + 3);
            _barMarker2 = Sprite("BarMarker2", barMarker, Vector3.zero, OrderHud + 3);
            Sprite("BarFrame", barFrame, FabricLayout.LayoutToWorld(BarX + 85f, BarY + 11f), OrderHud + 4);

            // hình mẫu (viền lời giải): tô nhạt màu chỉ và nét đứt trên vải; bản nhỏ trong thẻ "Hình mẫu"
            var sol = _state.Level.Solution;
            var outline = new List<Vector3>(256);
            RingPath(sol, _state.SolutionBends, outline, null);
            var tris = new List<int>();
            PolygonTriangulator.Triangulate(outline, tris);
            _ghost = MeshObject("Ghost", OrderGhost);
            _ghost.AddTriangles(outline, tris, WithAlpha(thread, 0.13f));
            _ghost.AddDashedLoop(outline, WithAlpha(thread, 0.9f), 2f, 7f, 6f);
            _ghost.Apply();

            _mini = MeshObject("MiniShape", OrderHud + 1);
            var mini = FitMini(outline, 90f, 165f, 92f);
            _mini.AddTriangles(mini, tris, WithAlpha(pieceColor, 0.45f));
            _mini.AddDashedLoop(mini, ink, 2f, 5f, 4f);
            _mini.Apply();

            int n = _state.Level.NodeCount;
            _pins = new SpriteRenderer[n];
            for (int j = 0; j < n; j++) _pins[j] = Sprite("Pin" + j, pinEmpty, FabricLayout.FabricToWorld(sol[j]), OrderPins);
            _nodes = new SpriteRenderer[n];
            for (int i = 0; i < n; i++) _nodes[i] = Sprite("Node" + i, _state.Level.Locked[i] ? nodeLocked : nodeFree, Vector3.zero, OrderNodes);
        }

        private void BuildDynamic()
        {
            // vùng tô: chính mặt nạ lõi dùng để chấm điểm (200×200, phủ −0,125…1,125 bề rộng vải), vẽ thành texture
            const int size = Core.Outline.RegionMask.GridSize;
            _maskTexture = new Texture2D(size, size, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            _maskPixels = new byte[size * size * 4];
            float worldSize = (float)(Core.Outline.RegionMask.GridMax - Core.Outline.RegionMask.GridMin) * FabricLayout.FabricSize;
            var sprite = UnityEngine.Sprite.Create(_maskTexture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size / worldSize);
            _fill = Sprite("Fill", sprite, FabricLayout.FabricToWorld(new Float2(0.5f, 0.5f)), OrderFill);
            _fill.color = WithAlpha(maskColor, maskAlpha);
            _thread = MeshObject("Thread", OrderThread);
        }

        /// <param name="draggingNode">Node đang kéo (vẽ to hơn một chút), hoặc −1.</param>
        public void Render(float dt, int draggingNode)
        {
            if (_state == null) return;
            _clock += dt;
            UpdateFill();
            UpdateThread();
            var pos = _state.Positions;
            for (int i = 0; i < _nodes.Length; i++)
            {
                _nodes[i].transform.position = FabricLayout.FabricToWorld(pos[i]);
                _nodes[i].transform.localScale = Vector3.one * (i == draggingNode ? 1.15f : 1f);
            }
            for (int j = 0; j < _pins.Length; j++) _pins[j].sprite = _state.Pins.PinToNode[j] >= 0 ? pinFilled : pinEmpty;
            UpdateBar(dt);
        }

        private void UpdateFill()
        {
            if (_maskVersion == _state.Version) return;
            _maskVersion = _state.Version;
            const int size = Core.Outline.RegionMask.GridSize;
            var mask = _state.Mask;
            // hàng 0 của lưới là mép trên vải (y xuống), hàng 0 của texture là mép dưới
            for (int ty = 0; ty < size; ty++)
            {
                int src = (size - 1 - ty) * size, dst = ty * size * 4;
                for (int x = 0; x < size; x++, dst += 4)
                {
                    byte a = mask[src + x] != 0 ? (byte)255 : (byte)0;
                    _maskPixels[dst] = 255; _maskPixels[dst + 1] = 255; _maskPixels[dst + 2] = 255; _maskPixels[dst + 3] = a;
                }
            }
            _maskTexture.SetPixelData(_maskPixels, 0);
            _maskTexture.Apply(false);
        }

        private void UpdateThread()
        {
            _thread.Clear();
            RingPath(_state.Positions, _state.Bends, _points, _cumulative);
            float total = _cumulative.Count > 0 ? Mathf.Max(1e-4f, _cumulative[_cumulative.Count - 1]) : 1f;
            float thr = _state.Level.WinThreshold;
            float m = Mathf.Clamp01((_barValue - 0.35f) / 0.65f);
            float taut = _state.Score >= thr ? 1f : m * m;
            _colors.Clear();
            for (int i = 0; i < _points.Count; i++) _colors.Add(YarnColor(_cumulative[i] / total + _clock * 0.09f, taut));
            _thread.AddPolyline(_points, _colors, 2.8f + 0.7f * taut, true);
            _thread.Apply();
        }

        private void UpdateBar(float dt)
        {
            float thr = _state.Level.WinThreshold, raw = _state.Score;
            float target = BarValue(raw, thr);
            _barValue += (target - _barValue) * Mathf.Min(1f, dt * 12f);
            float m1 = Mathf.Min(0.70f, thr - 0.08f), m2 = Mathf.Min(0.85f, thr);
            _barFill.color = raw >= m2 ? barNear : (raw >= m1 ? barMid : barFar);
            float inner = BarWidth - 6f, w = Mathf.Max(14f, inner * _barValue);
            _barFill.enabled = inner * _barValue > 1f;
            _barFill.size = new Vector2(w, BarHeight - 6f);
            _barFill.transform.position = FabricLayout.LayoutToWorld(BarX + 3f + w / 2f, BarY + BarHeight / 2f);
            _barMarker1.transform.position = FabricLayout.LayoutToWorld(BarX + 3f + inner * BarValue(m1, thr), BarY + BarHeight / 2f);
            _barMarker2.transform.position = FabricLayout.LayoutToWorld(BarX + 3f + inner * BarValue(m2, thr), BarY + BarHeight / 2f);
        }

        private static float BarValue(float v, float thr) => Mathf.Clamp01((v - 0.5f) / (thr - 0.5f));

        /// <summary>Đường vòng theo các cạnh đang vẽ (bỏ mép gấp), toạ độ scene; kèm chiều dài cộng dồn nếu cần.</summary>
        private void RingPath(Float2[] pos, System.ReadOnlySpan<float> bends, List<Vector3> outPoints, List<float> cumulative)
        {
            outPoints.Clear();
            cumulative?.Clear();
            var topo = _state.Topology;
            int n = topo.RingLength;
            float acc = 0f;
            for (int k = 0; k < n; k++)
            {
                if (!topo.InFoldChain(k)) continue;
                int count = _state.Shape.Sample(pos, bends, topo.RingNode(k), topo.RingNode((k + 1) % n), EdgeSteps, false, _edgeBuffer);
                for (int s = 0; s < count; s++)
                {
                    if (s == 0 && outPoints.Count > 0) continue;
                    var w = FabricLayout.FabricToWorld(_edgeBuffer[s]);
                    if (outPoints.Count > 0) acc += Vector3.Distance(outPoints[outPoints.Count - 1], w);
                    outPoints.Add(w);
                    cumulative?.Add(acc);
                }
            }
            // vòng khép: điểm cuối trùng điểm đầu thì bỏ để đa giác không có cạnh suy biến
            if (outPoints.Count > 2 && Vector3.Distance(outPoints[0], outPoints[outPoints.Count - 1]) < 1e-3f)
            {
                outPoints.RemoveAt(outPoints.Count - 1);
                if (cumulative != null) cumulative.RemoveAt(cumulative.Count - 1);
            }
        }

        private static List<Vector3> FitMini(List<Vector3> outline, float cx, float cy, float size)
        {
            float minX = float.MaxValue, minY = float.MaxValue, maxX = float.MinValue, maxY = float.MinValue;
            foreach (var p in outline)
            {
                minX = Mathf.Min(minX, p.x); maxX = Mathf.Max(maxX, p.x);
                minY = Mathf.Min(minY, p.y); maxY = Mathf.Max(maxY, p.y);
            }
            float s = size / Mathf.Max(maxX - minX, maxY - minY);
            var center = FabricLayout.LayoutToWorld(cx, cy);
            var result = new List<Vector3>(outline.Count);
            foreach (var p in outline) result.Add(center + new Vector3((p.x - (minX + maxX) / 2f) * s, (p.y - (minY + maxY) / 2f) * s, 0f));
            return result;
        }

        private static Color32 YarnColor(float phase, float taut)
        {
            int n = Yarn.Length;
            float u = (phase % 1f + 1f) % 1f * n;
            int i = (int)u;
            float f = u - i, s = 0.5f - 0.5f * Mathf.Cos(f * Mathf.PI);
            Color a = Yarn[i % n], b = Yarn[(i + 1) % n];
            Color c = Color.Lerp(a, b, s);
            return Color.Lerp(c, new Color32(232, 196, 120, 255), taut * 0.18f);
        }

        private static Color32 WithAlpha(Color c, float a) => new Color(c.r, c.g, c.b, a);

        private SpriteRenderer Sprite(string name, Sprite sprite, Vector3 position, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            go.transform.position = position;
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = sprite;
            sr.sortingOrder = order;
            return sr;
        }

        private StrokeMesh MeshObject(string name, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            var stroke = new StrokeMesh(name);
            go.AddComponent<MeshFilter>().sharedMesh = stroke.Mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = strokeMaterial;
            mr.sortingOrder = order;
            return stroke;
        }

        private void OnDestroy()
        {
            if (_maskTexture != null) Destroy(_maskTexture);
            if (_ghost != null) Destroy(_ghost.Mesh);
            if (_thread != null) Destroy(_thread.Mesh);
            if (_mini != null) Destroy(_mini.Mesh);
        }
    }
}

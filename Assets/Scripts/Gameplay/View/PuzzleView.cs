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
        [SerializeField] private Sprite slotEmpty;
        [Tooltip("Số mảnh của sản phẩm (ô trong hàng Bộ vải ghép). Tạm đặt tay cho tới khi có ProductDefinition; viên kem thuộc sản phẩm 2 mảnh.")]
        [SerializeField] private int pieceSlots = 2;
        [SerializeField] private Sprite scissorsUp;
        [SerializeField] private Sprite scissorsDown;
        [SerializeField] private Sprite scissorsRivet;
        [SerializeField] private Sprite dot;
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
        [SerializeField] private Color mustard = new Color32(0xE9, 0xC4, 0x6A, 0xFF);

        [Header("Chuyển động (số tạm theo bản web)")]
        [Tooltip("Node thả vào chốt trượt tới chốt trong khoảng này (giây)")]
        [SerializeField] private float settleTime = 0.12f;
        [Tooltip("Node điểm sáng vừa qua nảy to 1,3 lần rồi về trong khoảng này (giây)")]
        [SerializeField] private float pulseTime = 0.45f;
        [Tooltip("Kéo mở khép mấy nhịp mỗi giây khi đang chơi")]
        [SerializeField] private float snipRate = 3.2f;

        // thứ tự vẽ (sau vẽ đè trước)
        private const int OrderFabric = 0, OrderFill = 1, OrderGhost = 2, OrderPins = 3, OrderThread = 4, OrderNodes = 5, OrderHud = 10;
        private const int EdgeSteps = 24;
        // thẻ bên phải (người dùng đổi 2026-11-11): hàng mảnh đã ghép ở trên (ô 46 pt từ y = 112), thanh khớp ngay dưới
        private const float BarWidth = 170f, BarHeight = 22f, BarX = 186f, BarY = 190f;
        private const float SlotX = 186f, SlotY = 112f, SlotSize = 46f, SlotStep = 58f;
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
        // vị trí node đang hiển thị (trượt dần về vị trí logic khi vừa đặt vào chốt) và độ nảy khi điểm sáng đi qua
        private Vector3[] _shown;
        private Vector3[] _shownScratch;
        private float[] _pulse;
        // đường chạy của điểm sáng: cả vòng (kể cả mép gấp), điểm bắt đầu của từng cạnh, chiều dài cộng dồn
        private readonly List<Vector3> _runPoints = new List<Vector3>(512);
        private readonly List<float> _runCum = new List<float>(512);
        private readonly List<int> _runEdgeStart = new List<int>(32);
        private float _runTotal;
        private Transform _runner, _bladeUp, _bladeDown;
        private SpriteRenderer[] _trail;
        private float _snipPhase;

        // chuỗi thắng: vị trí và độ uốn trình diễn (snap dần về lời giải), độ mờ và cỡ node, cảnh cắt dọc viền mẫu
        private bool _presenting, _cutting;
        private Float2[] _pFrom, _pTo, _pPos;
        private float[] _bFrom, _bTo, _pBends;
        private float _nodeAlpha = 1f, _nodeSize = 1f;
        private readonly List<Vector3> _solPoints = new List<Vector3>(512);
        private readonly List<float> _solCum = new List<float>(512);
        private float _solTotal;
        private float[] _cutNodeD;
        private bool[] _cutHit;
        private StrokeMesh _cutLine, _veil;
        private MeshRenderer _threadRenderer, _cutLineRenderer, _veilRenderer;
        private readonly List<Vector3> _cutPoints = new List<Vector3>(512);
        private readonly List<Color32> _cutColors = new List<Color32>(512);
        private const float CutRunnerSize = 20f;
        private const int TrailDots = 7;
        private const float RunnerSize = 17f;

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
            for (int i = 0; i < pieceSlots; i++)
                Sprite("Slot" + i, slotEmpty, FabricLayout.LayoutToWorld(SlotX + i * SlotStep + SlotSize / 2f, SlotY + SlotSize / 2f), OrderHud + 1);

            // hình mẫu (viền lời giải): tô nhạt màu chỉ và nét đứt trên vải; bản nhỏ trong thẻ "Hình mẫu"
            var sol = _state.Level.Solution;
            var outline = new List<Vector3>(256);
            RingPath(sol, _state.SolutionBends, outline, null, null, false);
            var tris = new List<int>();
            PolygonTriangulator.Triangulate(outline, tris);
            // đường cắt của chuỗi thắng là viền lời giải, khép kín
            _solPoints.Clear();
            _solPoints.AddRange(outline);
            _solCum.Clear();
            float acc = 0f;
            for (int i = 0; i < _solPoints.Count; i++)
            {
                if (i > 0) acc += Vector3.Distance(_solPoints[i - 1], _solPoints[i]);
                _solCum.Add(acc);
            }
            _solTotal = acc + Vector3.Distance(_solPoints[_solPoints.Count - 1], _solPoints[0]);
            _veil = MeshObject("CutVeil", OrderThread, out _veilRenderer);
            _veil.AddTriangles(outline, tris, new Color32(255, 252, 246, 128));
            _veil.Apply();
            _veilRenderer.enabled = false;
            _cutLine = MeshObject("CutLine", OrderThread + 1, out _cutLineRenderer);

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
            _shown = new Vector3[n];
            _shownScratch = new Vector3[n];
            _pulse = new float[n];
            for (int i = 0; i < n; i++)
            {
                _nodes[i] = Sprite("Node" + i, _state.Level.Locked[i] ? nodeLocked : nodeFree, Vector3.zero, OrderNodes);
                _shown[i] = FabricLayout.FabricToWorld(_state.Positions[i]);
            }

            // điểm sáng: vệt chấm vàng phía sau và cây kéo hai nửa xoay quanh đinh tán
            _trail = new SpriteRenderer[TrailDots];
            for (int j = 0; j < TrailDots; j++) _trail[j] = Sprite("Trail" + j, dot, Vector3.zero, OrderNodes + 1);
            _runner = new GameObject("Runner").transform;
            _runner.SetParent(transform, false);
            _bladeDown = Sprite("BladeDown", scissorsDown, Vector3.zero, OrderNodes + 2).transform;
            _bladeUp = Sprite("BladeUp", scissorsUp, Vector3.zero, OrderNodes + 2).transform;
            var rivet = Sprite("Rivet", scissorsRivet, Vector3.zero, OrderNodes + 3).transform;
            _bladeDown.SetParent(_runner, false);
            _bladeUp.SetParent(_runner, false);
            rivet.SetParent(_runner, false);
        }

        /// <summary>Node điểm sáng vừa đi qua: nảy to rồi về.</summary>
        public void Pulse(int node) => _pulse[node] = 1f;

        /// <summary>Lõi vừa đánh số lại theo chốt: đổi chỗ vị trí đang hiển thị theo cùng hoán vị để hình không nhảy.</summary>
        public void Permute(System.ReadOnlySpan<int> permutation)
        {
            for (int i = 0; i < _shown.Length; i++) _shownScratch[permutation[i]] = _shown[i];
            System.Array.Copy(_shownScratch, _shown, _shown.Length);
        }

        /// <summary>Vẽ cây kéo tại cạnh vòng runnerEdge, vị trí tỉ lệ runnerT theo chiều dài cạnh.</summary>
        public void RenderRunner(float dt, int runnerEdge, float runnerT)
        {
            RingPath(_state.Positions, _state.Bends, _runPoints, _runCum, _runEdgeStart, true);
            if (_runPoints.Count < 2) return;
            _runTotal = _runCum[_runCum.Count - 1] + Vector3.Distance(_runPoints[_runPoints.Count - 1], _runPoints[0]);
            int n = _state.Topology.RingLength;
            float a = _runCum[_runEdgeStart[runnerEdge]];
            float b = runnerEdge + 1 < n ? _runCum[_runEdgeStart[runnerEdge + 1]] : _runTotal;
            float d = a + runnerT * (b - a);
            _snipPhase += snipRate * dt;

            var head = RunPointAt(d);
            var dir = (RunPointAt(d + 0.01f * FabricLayout.FabricSize) - head).normalized;
            if (dir == Vector3.zero) dir = Vector3.right;
            float ang = Mathf.Atan2(dir.y, dir.x);
            float bob = Mathf.Sin(_snipPhase * Mathf.PI * 2f) * 1.2f;
            var side = new Vector3(-dir.y, dir.x, 0f);
            // lưỡi kéo kẹp đúng vào đường cắt: đinh tán lùi lại phía sau điểm đang cắt
            _runner.position = head + side * bob - dir * RunnerSize * 0.45f;
            _runner.rotation = Quaternion.Euler(0f, 0f, ang * Mathf.Rad2Deg);
            float th = (0.02f + SnipOpen(_snipPhase) * 0.55f) * Mathf.Rad2Deg;
            _bladeDown.localRotation = Quaternion.Euler(0f, 0f, th);
            _bladeUp.localRotation = Quaternion.Euler(0f, 0f, -th);

            for (int j = 0; j < TrailDots; j++)
            {
                int k = TrailDots - j; // 7…1, chấm xa nhỏ và nhạt hơn
                _trail[j].transform.position = RunPointAt(d - k * 0.014f * FabricLayout.FabricSize);
                _trail[j].transform.localScale = Vector3.one * (1f - k / 9f);
                _trail[j].color = WithAlpha(mustard, (1f - k / 8f) * 0.8f);
            }
        }

        // khép nhanh, mở chậm: mỗi nhịp là một nhát cắt
        private static float SnipOpen(float phase)
        {
            float f = phase - Mathf.Floor(phase);
            return f < 0.35f ? 1f - EaseInOut(f / 0.35f) : EaseInOut((f - 0.35f) / 0.65f);
        }

        private static float EaseInOut(float t) => t < 0.5f ? 2f * t * t : 1f - Mathf.Pow(-2f * t + 2f, 2f) / 2f;

        private Vector3 RunPointAt(float d)
        {
            float total = _runTotal;
            d = (d % total + total) % total;
            int lo = 0, hi = _runCum.Count - 1;
            if (d >= _runCum[hi])
            {
                // đoạn khép vòng: điểm cuối về điểm đầu
                float seg = Mathf.Max(1e-5f, total - _runCum[hi]);
                return Vector3.Lerp(_runPoints[hi], _runPoints[0], (d - _runCum[hi]) / seg);
            }
            while (lo < hi - 1)
            {
                int mid = (lo + hi) >> 1;
                if (_runCum[mid] <= d) lo = mid; else hi = mid;
            }
            float len = Mathf.Max(1e-5f, _runCum[hi] - _runCum[lo]);
            return Vector3.Lerp(_runPoints[lo], _runPoints[hi], (d - _runCum[lo]) / len);
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
            _thread = MeshObject("Thread", OrderThread, out _threadRenderer);
        }

        // ---------- chuỗi thắng ----------

        /// <summary>Bắt đầu trình diễn: vị trí và độ uốn snap từ trạng thái hiện tại về chốt và độ uốn lời giải.</summary>
        public void BeginPresentation()
        {
            int n = _state.Level.NodeCount, ring = _state.Topology.RingLength;
            _pFrom = (Float2[])_state.Positions.Clone();
            _pTo = new Float2[n];
            _pPos = (Float2[])_pFrom.Clone();
            for (int i = 0; i < n; i++)
            {
                int pin = _state.Pins.NodeToPin[i];
                _pTo[i] = pin >= 0 ? _state.Level.Solution[pin] : _pFrom[i];
            }
            _bFrom = (float[])_state.Bends.Clone();
            _bTo = _state.SolutionBends.ToArray();
            _pBends = (float[])_bFrom.Clone();
            _presenting = true;
        }

        /// <summary>Quãng snap lớn nhất (vị trí, độ uốn ×2) để tính thời lượng snap như bản web.</summary>
        public float SnapDistance()
        {
            float md = 0f;
            for (int i = 0; i < _pFrom.Length; i++) md = Mathf.Max(md, Float2.Distance(_pFrom[i], _pTo[i]));
            for (int k = 0; k < _bFrom.Length; k++) md = Mathf.Max(md, Mathf.Abs(_bTo[k] - _bFrom[k]) * 2f);
            return md;
        }

        /// <summary>Snap: mọi node đi thẳng cùng tốc độ (quãng đã đi run, bề rộng vải); node mờ và nhỏ dần theo fade.</summary>
        public void SetSnap(float run, float u, float nodeAlpha, float nodeSize)
        {
            for (int i = 0; i < _pPos.Length; i++)
            {
                float dk = Float2.Distance(_pFrom[i], _pTo[i]);
                _pPos[i] = Float2.Lerp(_pFrom[i], _pTo[i], dk > 1e-6f ? Mathf.Min(1f, run / dk) : 1f);
            }
            for (int k = 0; k < _pBends.Length; k++) _pBends[k] = Mathf.Lerp(_bFrom[k], _bTo[k], u);
            _nodeAlpha = nodeAlpha;
            _nodeSize = nodeSize;
        }

        /// <summary>Vào cảnh cắt: bỏ vùng tô và sợi chỉ, phủ lớp kem mờ lên hình mẫu, tính chỗ đầu kéo chạm từng node.</summary>
        public void BeginCut()
        {
            _cutting = true;
            _fill.enabled = false;
            _threadRenderer.enabled = false;
            _veilRenderer.enabled = true;
            for (int j = 0; j < _trail.Length; j++) _trail[j].enabled = false;
            _runner.localScale = Vector3.one * (CutRunnerSize / RunnerSize);
            int n = _pPos.Length;
            _cutNodeD = new float[n];
            _cutHit = new bool[n];
            for (int i = 0; i < n; i++)
            {
                var p = FabricLayout.FabricToWorld(_pPos[i]);
                float best = float.MaxValue, bd = 0f;
                for (int k = 0; k < _solPoints.Count; k++)
                {
                    var a = _solPoints[k];
                    var b = _solPoints[(k + 1) % _solPoints.Count];
                    var ab = b - a;
                    float l2 = ab.sqrMagnitude, t = l2 > 0 ? Mathf.Clamp01(Vector3.Dot(p - a, ab) / l2) : 0f;
                    float dd = (a + ab * t - p).sqrMagnitude;
                    if (dd < best) { best = dd; bd = _solCum[k] + t * Mathf.Sqrt(l2); }
                }
                // điểm đầu đường cắt cũng là điểm cuối: node ở đó tính là chạm đầu tiên
                _cutNodeD[i] = bd > _solTotal - 0.05f ? 0f : bd;
            }
        }

        /// <summary>Chu vi đường cắt theo bề rộng vải (để tính tốc độ cảnh cắt).</summary>
        public float CutPerimeter => _solTotal / FabricLayout.FabricSize;

        /// <summary>Cảnh cắt tới quãng L (theo bề rộng vải): nét cắt mực sau lưỡi kéo, node chạm thì sáng và nảy.</summary>
        public void SetCut(float l, float dt)
        {
            float d = Mathf.Clamp(l * FabricLayout.FabricSize, 0f, _solTotal);
            _cutPoints.Clear();
            _cutColors.Clear();
            for (int k = 0; k < _solPoints.Count && _solCum[k] <= d; k++)
            {
                _cutPoints.Add(_solPoints[k]);
                _cutColors.Add(ink);
            }
            var head = SolPointAt(d);
            _cutPoints.Add(head);
            _cutColors.Add(ink);
            _cutLine.Clear();
            _cutLine.AddPolyline(_cutPoints, _cutColors, 3.2f, false);
            _cutLine.Apply();

            for (int i = 0; i < _cutHit.Length; i++)
            {
                if (_cutHit[i] || _cutNodeD[i] > d) continue;
                _cutHit[i] = true;
                _pulse[i] = 1f;
            }

            var dir = (SolPointAt(d + 0.01f * FabricLayout.FabricSize) - head).normalized;
            if (dir == Vector3.zero) dir = Vector3.right;
            // nhịp cắt theo quãng đi: mỗi 4,5% bề rộng vải một nhát
            _snipPhase = d / (0.045f * FabricLayout.FabricSize);
            _runner.position = head - dir * CutRunnerSize * 0.45f;
            _runner.rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg);
            float th = (0.02f + SnipOpen(_snipPhase) * 0.55f) * Mathf.Rad2Deg;
            _bladeDown.localRotation = Quaternion.Euler(0f, 0f, th);
            _bladeUp.localRotation = Quaternion.Euler(0f, 0f, -th);
        }

        private Vector3 SolPointAt(float d)
        {
            d = Mathf.Clamp(d, 0f, _solTotal);
            int last = _solCum.Count - 1;
            if (d >= _solCum[last])
            {
                float seg = Mathf.Max(1e-5f, _solTotal - _solCum[last]);
                return Vector3.Lerp(_solPoints[last], _solPoints[0], (d - _solCum[last]) / seg);
            }
            int lo = 0, hi = last;
            while (lo < hi - 1)
            {
                int mid = (lo + hi) >> 1;
                if (_solCum[mid] <= d) lo = mid; else hi = mid;
            }
            return Vector3.Lerp(_solPoints[lo], _solPoints[hi], (d - _solCum[lo]) / Mathf.Max(1e-5f, _solCum[hi] - _solCum[lo]));
        }

        /// <param name="draggingNode">Node đang kéo (vẽ to hơn một chút), hoặc −1.</param>
        public void Render(float dt, int draggingNode)
        {
            if (_state == null) return;
            _clock += dt;
            UpdateFill();
            UpdateThread();
            var pos = _presenting ? _pPos : _state.Positions;
            // node đang kéo bám ngón tay; node khác trượt mượt về vị trí logic (vừa đặt vào chốt…)
            float follow = settleTime > 0f ? 1f - Mathf.Exp(-dt * 3f / settleTime) : 1f;
            for (int i = 0; i < _nodes.Length; i++)
            {
                var target = FabricLayout.FabricToWorld(pos[i]);
                _shown[i] = i == draggingNode || _presenting ? target : Vector3.Lerp(_shown[i], target, follow);
                _pulse[i] = Mathf.Max(0f, _pulse[i] - dt / pulseTime);
                _nodes[i].transform.position = _shown[i];
                _nodes[i].transform.localScale = Vector3.one * ((i == draggingNode ? 1.15f : 1f) * _nodeSize * (1f + 0.3f * _pulse[i]));
                // cảnh cắt: node đầu kéo đã chạm sáng lại đủ màu
                float a = _cutting && _cutHit[i] ? 1f : _nodeAlpha;
                _nodes[i].color = new Color(1f, 1f, 1f, a);
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
            if (_cutting) return;
            _thread.Clear();
            if (_presenting) RingPath(_pPos, _pBends, _points, _cumulative, null, false);
            else RingPath(_state.Positions, _state.Bends, _points, _cumulative, null, false);
            float total = _cumulative.Count > 0 ? Mathf.Max(1e-4f, _cumulative[_cumulative.Count - 1]) : 1f;
            float thr = _state.Level.WinThreshold;
            float m = Mathf.Clamp01((_barValue - 0.35f) / 0.65f);
            float taut = _state.Score >= thr ? 1f : m * m;
            _colors.Clear();
            for (int i = 0; i < _points.Count; i++)
            {
                var c = YarnColor(_cumulative[i] / total + _clock * 0.09f, taut);
                c.a = (byte)(255 * _nodeAlpha); // snap: sợi chỉ mờ cùng node
                _colors.Add(c);
            }
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

        /// <summary>
        /// Đường vòng theo các cạnh, toạ độ scene; kèm chiều dài cộng dồn và chỉ số điểm đầu của từng cạnh nếu cần.
        /// includeFoldEdges = false thì bỏ mép gấp (sợi chỉ, hình mẫu); điểm sáng chạy cả vòng nên lấy đủ.
        /// </summary>
        private void RingPath(Float2[] pos, System.ReadOnlySpan<float> bends, List<Vector3> outPoints, List<float> cumulative,
            List<int> edgeStart, bool includeFoldEdges)
        {
            outPoints.Clear();
            cumulative?.Clear();
            edgeStart?.Clear();
            var topo = _state.Topology;
            int n = topo.RingLength;
            float acc = 0f;
            for (int k = 0; k < n; k++)
            {
                // cạnh sau dùng chung điểm đầu với điểm cuối của cạnh trước
                edgeStart?.Add(outPoints.Count > 0 ? outPoints.Count - 1 : 0);
                if (!includeFoldEdges && !topo.InFoldChain(k)) continue;
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

        private StrokeMesh MeshObject(string name, int order) => MeshObject(name, order, out _);

        private StrokeMesh MeshObject(string name, int order, out MeshRenderer renderer)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            var stroke = new StrokeMesh(name);
            go.AddComponent<MeshFilter>().sharedMesh = stroke.Mesh;
            renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = strokeMaterial;
            renderer.sortingOrder = order;
            return stroke;
        }

        private void OnDestroy()
        {
            if (_maskTexture != null) Destroy(_maskTexture);
            if (_ghost != null) Destroy(_ghost.Mesh);
            if (_thread != null) Destroy(_thread.Mesh);
            if (_mini != null) Destroy(_mini.Mesh);
            if (_cutLine != null) Destroy(_cutLine.Mesh);
            if (_veil != null) Destroy(_veil.Mesh);
        }
    }
}

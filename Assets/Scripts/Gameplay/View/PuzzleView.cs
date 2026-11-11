using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Session;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Hiển thị bàn chơi (prefab PuzzleBoard): khung vải, vùng tô, hình mẫu nét đứt, chốt, sợi chỉ đổi màu, node, cây kéo,
    /// phản hồi khớp, chuỗi thắng. Lớp, renderer, material và thứ tự vẽ dựng sẵn trong prefab, chỉnh trong Editor; phần tử
    /// lặp theo dữ liệu (node, chốt, quầng, cúc len, vệt chấm) instantiate từ prefab một lần lúc vào màn. Code chỉ đọc
    /// PuzzleState và đổ dữ liệu: mesh động cập nhật trên chính MeshFilter của prefab, không tạo mới mỗi khung.
    /// HUD nằm ở HudView (Canvas).
    /// </summary>
    public sealed class PuzzleView : MonoBehaviour
    {
        [Header("Lớp của bàn chơi (con trong prefab PuzzleBoard)")]
        [SerializeField] private SpriteRenderer fill;
        [SerializeField] private MeshFilter ghost;
        [SerializeField] private MeshFilter thread;
        [SerializeField] private MeshFilter cutVeil;
        [SerializeField] private MeshFilter cutLine;
        [SerializeField] private MeshFilter pinWaves;
        [SerializeField] private MeshFilter curveHints;
        [SerializeField] private MeshFilter seamZips;
        [SerializeField] private MeshFilter hole;
        [Tooltip("Viền sáng óng khi đạt ngưỡng (trên sợi chỉ)")]
        [SerializeField] private MeshFilter readyGlow;
        [Tooltip("Sóng tròn, bụi chỉ, dây nối ngón tay, vòng nhắc chạm (trên node)")]
        [SerializeField] private MeshFilter effects;
        [SerializeField] private Transform elements;

        [Header("Prefab phần tử lặp theo dữ liệu")]
        [SerializeField] private SpriteRenderer nodeFreePrefab;
        [SerializeField] private SpriteRenderer nodeLockedPrefab;
        [SerializeField] private PinMarker pinPrefab;
        [SerializeField] private SpriteRenderer pinHaloPrefab;
        [SerializeField] private SpriteRenderer pinchBeadPrefab;
        [SerializeField] private SpriteRenderer trailDotPrefab;
        [SerializeField] private ScissorsRig scissorsPrefab;
        [SerializeField] private PieceRig piecePrefab;

        [Header("Màu (theo bản web)")]
        [SerializeField] private Color threadColor = new Color32(0xC2, 0x9C, 0x90, 0xFF);
        [SerializeField] private Color ink = new Color32(0x4A, 0x3B, 0x35, 0xFF);
        [SerializeField] private Color maskColor = new Color32(233, 150, 160, 255);
        [SerializeField, Range(0f, 1f)] private float maskAlpha = 0.20f;
        [SerializeField] private Color holeColor = new Color32(0xE3, 0xC2, 0xB6, 0xFF);
        [SerializeField] private Color mustard = new Color32(0xE9, 0xC4, 0x6A, 0xFF);
        [SerializeField] private Color veilColor = new Color32(255, 252, 246, 128);

        [Header("Chuyển động (số tạm theo bản web)")]
        [Tooltip("Node thả vào chốt trượt tới chốt trong khoảng này (giây)")]
        [SerializeField] private float settleTime = 0.12f;
        [Tooltip("Node điểm sáng vừa qua nảy to 1,3 lần rồi về trong khoảng này (giây)")]
        [SerializeField] private float pulseTime = 0.45f;
        [Tooltip("Kéo mở khép mấy nhịp mỗi giây khi đang chơi")]
        [SerializeField] private float snipRate = 3.2f;
        [SerializeField] private float cutScissorsSize = 20f;
        [SerializeField] private int trailDots = 7;

        private const int EdgeSteps = 24;
        // dải màu chỉ nhuộm ombre của bản web
        private static readonly Color32[] Yarn =
        {
            new Color32(214, 122, 114, 255), new Color32(222, 170, 92, 255), new Color32(118, 172, 138, 255),
            new Color32(114, 150, 184, 255), new Color32(172, 130, 168, 255)
        };

        private PuzzleState _state;
        private StrokeMesh _ghost, _thread, _veil, _cutLine;
        private MeshRenderer _ghostRenderer, _threadRenderer, _veilRenderer, _cutLineRenderer;
        private Texture2D _maskTexture;
        private Sprite _maskSprite;
        private byte[] _maskPixels;
        private int _maskVersion = -1;
        private SpriteRenderer[] _nodes;
        private PinMarker[] _pins;
        private readonly List<Vector3> _points = new List<Vector3>(512);
        private readonly List<Color32> _colors = new List<Color32>(512);
        private readonly List<float> _cumulative = new List<float>(512);
        private readonly Float2[] _edgeBuffer = new Float2[EdgeSteps + 1];
        private float _clock;
        private float _taut;
        // vị trí node đang hiển thị (trượt dần về vị trí logic khi vừa đặt vào chốt) và độ nảy khi điểm sáng đi qua
        private Vector3[] _shown, _shownScratch;
        private float[] _pulse;
        // đường chạy của điểm sáng: cả vòng (kể cả mép gấp), điểm bắt đầu của từng cạnh, chiều dài cộng dồn
        private readonly List<Vector3> _runPoints = new List<Vector3>(512);
        private readonly List<float> _runCum = new List<float>(512);
        private readonly List<int> _runEdgeStart = new List<int>(32);
        private float _runTotal;
        private ScissorsRig _scissors;
        private SpriteRenderer[] _trail;
        private float _snipPhase;

        // chuỗi thắng
        private bool _presenting, _cutting;
        private Float2[] _pFrom, _pTo, _pPos;
        private float[] _bFrom, _bTo, _pBends;
        private float _nodeAlpha = 1f, _nodeSize = 1f;
        private readonly List<Vector3> _solPoints = new List<Vector3>(512);
        private readonly List<float> _solCum = new List<float>(512);
        private float _solTotal;
        private float[] _cutNodeD;
        private bool[] _cutHit;
        private readonly List<Vector3> _cutPoints = new List<Vector3>(512);
        private readonly List<Color32> _cutColors = new List<Color32>(512);
        private readonly List<int> _outlineTris = new List<int>(1024);
        private PieceView _pieceView;
        private Color _fabricBase, _fabricLight, _fabricDark, _fabricLine;
        private FeedbackView _feedback;
        private StrokeMesh _waves, _gaps, _zips;
        private StrokeMesh _glowMesh, _effectsMesh;
        private PlayFeel _feel;
        private System.Func<float, Color32> _yarnFull;
        // độ uốn đang hiển thị: trượt mượt về độ uốn lõi khi vừa thả dây (lõi đặt thẳng vào đích)
        private float[] _shownBends;
        private bool[] _bendSettling;
        private float[] _introScale;
        private int _fitVersion = -1;
        private float _ghostIntro = -1f;
        private static readonly Color32 Cream = new Color32(0xFF, 0xF7, 0xE8, 0xFF);

        /// <summary>Phần cảm giác lúc chơi (gợn dây, sáng viền, bụi chỉ…), PuzzleController gửi sự kiện vào đây.</summary>
        public PlayFeel Feel => _feel;

        /// <summary>Viền hình mẫu (toạ độ scene) và tam giác hóa, cho HUD vẽ hình mẫu nhỏ.</summary>
        public IReadOnlyList<Vector3> Outline => _solPoints;
        public IReadOnlyList<int> OutlineTriangles => _outlineTris;

        /// <summary>Màu vải của mảnh (FabricDefinition của level).</summary>
        public void SetPiece(Color baseColor, Color light, Color dark, Color line)
        {
            _fabricBase = baseColor;
            _fabricLight = light;
            _fabricDark = dark;
            _fabricLine = line;
        }

        public void Bind(PuzzleState state)
        {
            _state = state;
            if (_fabricLine.a == 0f) SetPiece(maskColor, maskColor, maskColor, ink);
            BindLayers();
            BuildElements();
        }

        private void BindLayers()
        {
            _ghost = StrokeMesh.Attach(ghost);
            _thread = StrokeMesh.Attach(thread);
            _veil = StrokeMesh.Attach(cutVeil);
            _cutLine = StrokeMesh.Attach(cutLine);
            _waves = StrokeMesh.Attach(pinWaves);
            _gaps = StrokeMesh.Attach(curveHints);
            _zips = StrokeMesh.Attach(seamZips);
            _glowMesh = StrokeMesh.Attach(readyGlow);
            _effectsMesh = StrokeMesh.Attach(effects);
            _feel = new PlayFeel(_state, _glowMesh, _effectsMesh);
            _yarnFull = phase => YarnColor(phase, 1f);
            int ring = _state.Topology.RingLength;
            _shownBends = (float[])_state.Bends.Clone();
            _bendSettling = new bool[ring];
            _ghostRenderer = ghost.GetComponent<MeshRenderer>();
            _threadRenderer = thread.GetComponent<MeshRenderer>();
            _veilRenderer = cutVeil.GetComponent<MeshRenderer>();
            _cutLineRenderer = cutLine.GetComponent<MeshRenderer>();

            // hình mẫu (viền lời giải): tô nhạt màu chỉ và nét đứt trên vải; cũng là đường cắt của chuỗi thắng
            RingPath(_state.Level.Solution, _state.SolutionBends, _solPoints, null, null, false);
            PolygonTriangulator.Triangulate(_solPoints, _outlineTris);
            _solCum.Clear();
            float acc = 0f;
            for (int i = 0; i < _solPoints.Count; i++)
            {
                if (i > 0) acc += Vector3.Distance(_solPoints[i - 1], _solPoints[i]);
                _solCum.Add(acc);
            }
            _solTotal = acc + Vector3.Distance(_solPoints[_solPoints.Count - 1], _solPoints[0]);
            BuildGhost(0f);
            _veil.AddTriangles(_solPoints, _outlineTris, veilColor);
            _veil.Apply();
            _veilRenderer.enabled = false;
            hole.GetComponent<MeshRenderer>().enabled = false;

            // vùng tô: chính mặt nạ lõi dùng để chấm điểm (200×200, phủ −0,125…1,125 bề rộng vải), vẽ thành texture
            const int size = Core.Outline.RegionMask.GridSize;
            _maskTexture = new Texture2D(size, size, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            _maskPixels = new byte[size * size * 4];
            float worldSize = (float)(Core.Outline.RegionMask.GridMax - Core.Outline.RegionMask.GridMin) * FabricLayout.FabricSize;
            _maskSprite = Sprite.Create(_maskTexture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size / worldSize);
            fill.sprite = _maskSprite;
            fill.transform.position = FabricLayout.FabricToWorld(new Float2(0.5f, 0.5f));
            fill.color = WithAlpha(maskColor, maskAlpha);
        }

        private void BuildElements()
        {
            int n = _state.Level.NodeCount, ring = _state.Topology.RingLength;
            var sol = _state.Level.Solution;
            _pins = new PinMarker[n];
            for (int j = 0; j < n; j++)
            {
                _pins[j] = Instantiate(pinPrefab, elements);
                _pins[j].transform.position = FabricLayout.FabricToWorld(sol[j]);
            }
            _nodes = new SpriteRenderer[n];
            _introScale = new float[n];
            _shown = new Vector3[n];
            _shownScratch = new Vector3[n];
            _pulse = new float[n];
            for (int i = 0; i < n; i++)
            {
                _nodes[i] = Instantiate(_state.Level.Locked[i] ? nodeLockedPrefab : nodeFreePrefab, elements);
                _shown[i] = FabricLayout.FabricToWorld(_state.Positions[i]);
            }
            _trail = new SpriteRenderer[trailDots];
            for (int j = 0; j < trailDots; j++) _trail[j] = Instantiate(trailDotPrefab, elements);
            _scissors = Instantiate(scissorsPrefab, elements);

            var halos = new SpriteRenderer[n];
            // tên có chỉ số để dò trong Hierarchy và để test PlayMode tìm đúng phần tử
            for (int j = 0; j < n; j++) { halos[j] = Instantiate(pinHaloPrefab, elements); halos[j].name = "PinHalo" + j; }
            var beads = new SpriteRenderer[ring];
            for (int k = 0; k < ring; k++) { beads[k] = Instantiate(pinchBeadPrefab, elements); beads[k].name = "Bead" + k; }
            _feedback = new FeedbackView(_state, _waves, _gaps, _zips, halos, beads);
        }

        /// <summary>Node điểm sáng vừa đi qua: nảy to rồi về, sóng kem lan ra.</summary>
        public void Pulse(int node)
        {
            _pulse[node] = 1f;
            _feel.AddRipple(_shown[node], Cream);
        }

        /// <summary>Điểm trên dây k ở vị trí tỉ lệ u (toạ độ scene, theo độ uốn đang hiển thị).</summary>
        public Vector3 EdgePoint(int k, float u)
        {
            var topo = _state.Topology;
            int count = _state.Shape.Sample(_state.Positions, _shownBends, topo.RingNode(k), topo.RingNode((k + 1) % topo.RingLength), EdgeSteps, false, _edgeBuffer);
            if (count < 2) return FabricLayout.FabricToWorld(_edgeBuffer[0]);
            float s = Mathf.Clamp01(u) * (count - 1);
            int i = Mathf.Min(count - 2, (int)s);
            return FabricLayout.FabricToWorld(Float2.Lerp(_edgeBuffer[i], _edgeBuffer[i + 1], s - i));
        }

        /// <summary>Node vừa cắm vào chốt: sóng vàng lan ra từ chốt.</summary>
        public void PinRipple(int pin) => _feel.AddRipple(FabricLayout.FabricToWorld(_state.Level.Solution[pin]), mustard);

        /// <summary>Dây k vừa khớp viền: nảy đàn hồi và bụi chỉ bay ra (upward: bay lên như khi cắm chốt nối dây).</summary>
        public void SnapEdge(int k, float dir, float delay, int lint, bool upward)
        {
            _feel.BounceEdge(k, dir, delay);
            if (lint <= 0) return;
            var topo = _state.Topology;
            int a = topo.RingNode(k), b = topo.RingNode((k + 1) % topo.RingLength);
            var pa = _shown[a];
            var pb = _shown[b];
            var mid = (pa + pb) * 0.5f;
            var along = pb - pa;
            // pháp tuyến hướng ra phía dây phồng (toạ độ scene, y lên)
            float ang = upward ? Mathf.PI / 2f : Mathf.Atan2(along.y, along.x) - Mathf.PI / 2f * (dir >= 0f ? 1f : -1f);
            _feel.Lint(mid, ang, lint);
        }

        /// <summary>Lõi vừa đánh số lại theo chốt: đổi chỗ vị trí đang hiển thị theo cùng hoán vị để hình không nhảy.</summary>
        public void Permute(System.ReadOnlySpan<int> permutation)
        {
            for (int i = 0; i < _shown.Length; i++) _shownScratch[permutation[i]] = _shown[i];
            System.Array.Copy(_shownScratch, _shown, _shown.Length);
            // cạnh cũng được đánh số lại: lấy thẳng độ uốn mới, không cho trượt
            System.Array.Copy(_state.Bends, _shownBends, _shownBends.Length);
            System.Array.Clear(_bendSettling, 0, _bendSettling.Length);
        }

        /// <summary>Dây k vừa khớp viền mẫu: vệt chỉ vàng lóe dọc dây.</summary>
        public void Zip(int edge, float delay = 0f) => _feedback.Zip(edge, delay);

        /// <summary>Hiện gợi ý (booster) trong một khoảng thời gian.</summary>
        public void ShowHint(Core.Rules.Hint hint, float seconds) => _feedback.ShowHint(hint, seconds);

        /// <summary>Vẽ phản hồi khớp (ẩn trong chuỗi thắng).</summary>
        public void RenderFeedback(float dt, FeedbackInput input) => _feedback.Render(dt, input, _presenting);

        /// <param name="draggingNode">Node đang kéo (vẽ to hơn một chút), hoặc −1.</param>
        /// <param name="tension">Độ căng của sợi chỉ 0–1 (thanh khớp đang hiển thị).</param>
        /// <param name="feel">Trạng thái chơi cho phần cảm giác (gợn, sáng viền, dây nối ngón tay).</param>
        public void Render(float dt, int draggingNode, float tension, in FeelInput feel)
        {
            if (_state == null) return;
            _clock += dt;
            float m = Mathf.Clamp01((tension - 0.35f) / 0.65f);
            _taut = _state.Score >= _state.Level.WinThreshold ? 1f : m * m;
            _feel.Tick(dt, feel, _presenting);
            float intro = _feel.Intro;
            if (_ghostIntro < 1f) BuildGhost(intro);
            fill.color = WithAlpha(maskColor, maskAlpha * intro);
            float follow = settleTime > 0f ? 1f - Mathf.Exp(-dt * 3f / settleTime) : 1f;
            UpdateShownBends(follow, feel.DragEdge);
            UpdateEdgeFit();
            UpdateFill();
            UpdateThread(intro);
            if (!_cutting) _feel.DrawGlow(_points, _cumulative, intro, _yarnFull);
            var pos = _presenting ? _pPos : _state.Positions;
            // node đang kéo bám ngón tay; node khác trượt mượt về vị trí logic (vừa đặt vào chốt…)
            for (int i = 0; i < _nodes.Length; i++)
            {
                var target = FabricLayout.FabricToWorld(pos[i]);
                _shown[i] = i == draggingNode || _presenting ? target : Vector3.Lerp(_shown[i], target, follow);
                _pulse[i] = Mathf.Max(0f, _pulse[i] - dt / pulseTime);
                // vào màn: node nảy ra lần lượt
                float introTarget = _feel.InIntro ? _feel.IntroScaleTarget(i) : 1f;
                _introScale[i] += (introTarget - _introScale[i]) * Mathf.Min(1f, dt * 14f);
                _nodes[i].transform.position = _shown[i];
                _nodes[i].transform.localScale = Vector3.one * ((i == draggingNode ? 1.15f : 1f) * _nodeSize * (1f + 0.3f * _pulse[i]) * _introScale[i]);
                // cảnh cắt: node đầu kéo đã chạm sáng lại đủ màu
                float a = _cutting && _cutHit != null && _cutHit[i] ? 1f : _nodeAlpha;
                _nodes[i].color = new Color(1f, 1f, 1f, a);
            }
            for (int j = 0; j < _pins.Length; j++)
            {
                _pins[j].SetFilled(_state.Pins.PinToNode[j] >= 0);
                _pins[j].transform.localScale = Vector3.one * intro;
            }
            _feel.DrawEffects(feel, CueNode(out bool hasCue), hasCue);
        }

        // node tự do xa lời giải nhất: chỗ vòng nhắc chạm đầu (màn đầu tiên)
        private Vector3 CueNode(out bool found)
        {
            found = false;
            if (!_feel.ShowStartCue) return default;
            int best = -1;
            float bd = -1f;
            var sol = _state.Level.Solution;
            for (int i = 0; i < _shown.Length; i++)
            {
                if (_state.Level.Locked[i]) continue;
                float d = Float2.Distance(_state.Positions[i], sol[i]);
                if (d > bd) { bd = d; best = i; }
            }
            found = best >= 0;
            return found ? _shown[best] : default;
        }

        // hình mẫu rõ dần lúc vào màn (dựng lại mesh nhỏ trong nửa giây đầu)
        private void BuildGhost(float intro)
        {
            _ghostIntro = intro;
            _ghost.Clear();
            _ghost.AddTriangles(_solPoints, _outlineTris, WithAlpha(threadColor, 0.13f * intro));
            _ghost.AddDashedLoop(_solPoints, WithAlpha(threadColor, 0.9f * intro), 2f, 7f, 6f);
            _ghost.Apply();
        }

        private void UpdateShownBends(float follow, int dragEdge)
        {
            if (_presenting) return;
            var bends = _state.Bends;
            for (int k = 0; k < _shownBends.Length; k++)
            {
                if (k == dragEdge) { _shownBends[k] = bends[k]; _bendSettling[k] = false; continue; }
                float diff = bends[k] - _shownBends[k];
                if (Mathf.Abs(diff) > 0.01f) _bendSettling[k] = true;
                _shownBends[k] += diff * follow;
                // dây vừa trượt tới đích: nảy nhẹ như bản web (edgeSettle xong thì nảy)
                if (_bendSettling[k] && Mathf.Abs(bends[k] - _shownBends[k]) < 0.002f)
                {
                    _bendSettling[k] = false;
                    _shownBends[k] = bends[k];
                    _feel.BounceEdge(k, bends[k] >= 0f ? 1f : -1f);
                }
            }
        }

        // độ lệch từng dây so với viền mẫu, tính lại khi lõi đổi: dây đã nằm đúng viền thì không chùng
        private void UpdateEdgeFit()
        {
            if (_presenting || _fitVersion == _state.Version) return;
            _fitVersion = _state.Version;
            var topo = _state.Topology;
            int n = topo.RingLength;
            for (int k = 0; k < n; k++)
            {
                if (!topo.InFoldChain(k)) continue;
                int count = _state.Shape.Sample(_state.Positions, _state.Bends, topo.RingNode(k), topo.RingNode((k + 1) % n), EdgeFitSteps, false, _edgeBuffer);
                float worst = 0f;
                for (int s = 0; s < count; s++) worst = Mathf.Max(worst, DistanceToOutline(FabricLayout.FabricToWorld(_edgeBuffer[s])));
                _feel.SetEdgeError(k, worst / FabricLayout.FabricSize);
            }
        }

        private const int EdgeFitSteps = 12;

        private float DistanceToOutline(Vector3 p)
        {
            float best = float.MaxValue;
            int count = _solPoints.Count;
            for (int i = 0; i < count; i++)
            {
                var a = _solPoints[i];
                var ab = _solPoints[(i + 1) % count] - a;
                float l2 = ab.sqrMagnitude, t = l2 > 0f ? Mathf.Clamp01(Vector3.Dot(p - a, ab) / l2) : 0f;
                best = Mathf.Min(best, (a + ab * t - p).sqrMagnitude);
            }
            return Mathf.Sqrt(best);
        }

        // ---------- điểm sáng ----------

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

            var head = PointOnLoop(_runPoints, _runCum, _runTotal, d);
            var dir = (PointOnLoop(_runPoints, _runCum, _runTotal, d + 0.01f * FabricLayout.FabricSize) - head).normalized;
            if (dir == Vector3.zero) dir = Vector3.right;
            float bob = Mathf.Sin(_snipPhase * Mathf.PI * 2f) * 1.2f;
            var side = new Vector3(-dir.y, dir.x, 0f);
            PlaceScissors(head + side * bob, dir, _scissors.DesignSize);

            for (int j = 0; j < _trail.Length; j++)
            {
                int k = _trail.Length - j; // xa nhất nhỏ và nhạt nhất
                _trail[j].transform.position = PointOnLoop(_runPoints, _runCum, _runTotal, d - k * 0.014f * FabricLayout.FabricSize);
                _trail[j].transform.localScale = Vector3.one * (1f - k / (_trail.Length + 2f));
                _trail[j].color = WithAlpha(mustard, (1f - k / (_trail.Length + 1f)) * 0.8f);
            }
        }

        // lưỡi kéo kẹp đúng vào đường cắt: đinh tán lùi lại phía sau điểm đang cắt
        private void PlaceScissors(Vector3 head, Vector3 dir, float size)
        {
            var t = _scissors.transform;
            t.position = head - dir * size * 0.45f;
            t.rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg);
            t.localScale = Vector3.one * (size / _scissors.DesignSize);
            _scissors.SetOpen((0.02f + SnipOpen(_snipPhase) * 0.55f) * Mathf.Rad2Deg);
        }

        // khép nhanh, mở chậm: mỗi nhịp là một nhát cắt
        private static float SnipOpen(float phase)
        {
            float f = phase - Mathf.Floor(phase);
            return f < 0.35f ? 1f - EaseInOut(f / 0.35f) : EaseInOut((f - 0.35f) / 0.65f);
        }

        private static float EaseInOut(float t) => t < 0.5f ? 2f * t * t : 1f - Mathf.Pow(-2f * t + 2f, 2f) / 2f;

        private static Vector3 PointOnLoop(List<Vector3> pts, List<float> cum, float total, float d)
        {
            d = (d % total + total) % total;
            int last = cum.Count - 1;
            if (d >= cum[last])
            {
                // đoạn khép vòng: điểm cuối về điểm đầu
                float seg = Mathf.Max(1e-5f, total - cum[last]);
                return Vector3.Lerp(pts[last], pts[0], (d - cum[last]) / seg);
            }
            int lo = 0, hi = last;
            while (lo < hi - 1)
            {
                int mid = (lo + hi) >> 1;
                if (cum[mid] <= d) lo = mid; else hi = mid;
            }
            return Vector3.Lerp(pts[lo], pts[hi], (d - cum[lo]) / Mathf.Max(1e-5f, cum[hi] - cum[lo]));
        }

        // ---------- chuỗi thắng ----------

        /// <summary>Bắt đầu trình diễn: vị trí và độ uốn snap từ trạng thái hiện tại về chốt và độ uốn lời giải.</summary>
        public void BeginPresentation()
        {
            int n = _state.Level.NodeCount;
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

        /// <summary>Snap: mọi node đi thẳng cùng tốc độ (quãng đã đi run, bề rộng vải); node mờ và nhỏ dần.</summary>
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
            fill.enabled = false;
            _threadRenderer.enabled = false;
            _veilRenderer.enabled = true;
            foreach (var t in _trail) t.enabled = false;
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
                    var ab = _solPoints[(k + 1) % _solPoints.Count] - a;
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
        /// <returns>Số node lưỡi kéo vừa chạm lần này (để phát nốt leo).</returns>
        public int SetCut(float l, float dt)
        {
            int newHits = 0;
            float d = Mathf.Clamp(l * FabricLayout.FabricSize, 0f, _solTotal);
            _cutPoints.Clear();
            _cutColors.Clear();
            for (int k = 0; k < _solPoints.Count && _solCum[k] <= d; k++)
            {
                _cutPoints.Add(_solPoints[k]);
                _cutColors.Add(ink);
            }
            var head = PointOnLoop(_solPoints, _solCum, _solTotal, Mathf.Min(d, _solTotal - 1e-3f));
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
                newHits++;
            }

            var dir = (PointOnLoop(_solPoints, _solCum, _solTotal, d + 0.01f * FabricLayout.FabricSize) - head).normalized;
            if (dir == Vector3.zero) dir = Vector3.right;
            // nhịp cắt theo quãng đi: mỗi 4,5% bề rộng vải một nhát; mỗi nhát bụi chỉ bay ra từ mũi kéo
            float before = _snipPhase;
            _snipPhase = d / (0.045f * FabricLayout.FabricSize);
            if (Mathf.Floor(before + 0.72f) != Mathf.Floor(_snipPhase + 0.72f)) _feel.Lint(head, Mathf.Atan2(dir.y, dir.x), 4);
            PlaceScissors(head, dir, cutScissorsSize);
            return newHits;
        }

        /// <summary>Cắt xong: bỏ lớp chơi (node, chốt, kéo, hình mẫu, nét cắt), để lại lỗ trên vải và miếng vải để nhấc.</summary>
        public void BeginLift()
        {
            _cutting = false;
            _ghostRenderer.enabled = false;
            _veilRenderer.enabled = false;
            _cutLineRenderer.enabled = false;
            fill.enabled = false;
            _threadRenderer.enabled = false;
            _scissors.gameObject.SetActive(false);
            foreach (var t in _trail) t.enabled = false;
            foreach (var node in _nodes) node.enabled = false;
            foreach (var pin in _pins) pin.SetVisible(false);
            var rig = Instantiate(piecePrefab, elements);
            _pieceView = new PieceView(rig, hole, _solPoints, _outlineTris, _fabricBase, _fabricLight, _fabricDark, _fabricLine,
                holeColor, WithAlpha(threadColor, 1f));
        }

        public void SetLift(float lift) => _pieceView.SetLift(lift, Mathf.Sin(_clock * 4.5f) * 0.022f * lift);

        public void SetFill(float amount) => _pieceView.SetFill(amount);

        /// <summary>Bay về ô: tâm và cỡ ô (đơn vị thế giới) lấy từ HUD.</summary>
        public void SetFly(float u, Vector3 slotCenter, float slotSize) => _pieceView.SetFly(u, slotCenter, slotSize * 0.74f);

        // ---------- cập nhật lớp động ----------

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

        private void UpdateThread(float intro)
        {
            if (_cutting) return;
            _thread.Clear();
            if (_presenting) ThreadPath(_pPos, _pBends);
            else ThreadPath(_state.Positions, _shownBends);
            float total = _cumulative.Count > 0 ? Mathf.Max(1e-4f, _cumulative[_cumulative.Count - 1]) : 1f;
            _colors.Clear();
            for (int i = 0; i < _points.Count; i++)
            {
                var c = YarnColor(_cumulative[i] / total + _clock * 0.09f, _taut);
                c.a = (byte)(255 * _nodeAlpha * intro); // snap: sợi chỉ mờ cùng node
                _colors.Add(c);
            }
            _thread.AddPolyline(_points, _colors, 2.8f + 0.7f * _taut + _feel.PluckWidth, true);
            _thread.Apply();
        }

        /// <summary>Đường sợi chỉ (bỏ mép gấp) có áp các hiệu ứng của PlayFeel lên từng điểm mẫu.</summary>
        private void ThreadPath(Float2[] pos, float[] bends)
        {
            _points.Clear();
            _cumulative.Clear();
            var topo = _state.Topology;
            int n = topo.RingLength;
            float acc = 0f;
            for (int k = 0; k < n; k++)
            {
                if (!topo.InFoldChain(k)) continue;
                int count = _state.Shape.Sample(pos, bends, topo.RingNode(k), topo.RingNode((k + 1) % n), EdgeSteps, false, _edgeBuffer);
                if (count < 2) continue;
                var chord = _edgeBuffer[count - 1] - _edgeBuffer[0];
                float len = Mathf.Max(1e-6f, chord.Length);
                var normal = new Float2(-chord.Y / len, chord.X / len);
                float target = 0f;
                bool hasTarget = !_presenting && _state.Pins.TryGetEdgeTarget(k, _state.Positions, _state.FoldLine, out target);
                for (int s = 0; s < count; s++)
                {
                    if (s == 0 && _points.Count > 0) continue;
                    var f = _feel.Displace(k, s / (float)(count - 1), _edgeBuffer[s], normal, bends[k], target, hasTarget, _presenting);
                    var w = FabricLayout.FabricToWorld(f);
                    if (_points.Count > 0) acc += Vector3.Distance(_points[_points.Count - 1], w);
                    _points.Add(w);
                    _cumulative.Add(acc);
                }
            }
            if (_points.Count > 2 && Vector3.Distance(_points[0], _points[_points.Count - 1]) < 1e-3f)
            {
                _points.RemoveAt(_points.Count - 1);
                _cumulative.RemoveAt(_cumulative.Count - 1);
            }
        }

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
                cumulative?.RemoveAt(cumulative.Count - 1);
            }
        }

        private static Color32 YarnColor(float phase, float taut)
        {
            int n = Yarn.Length;
            float u = (phase % 1f + 1f) % 1f * n;
            int i = (int)u;
            float f = u - i, s = 0.5f - 0.5f * Mathf.Cos(f * Mathf.PI);
            Color c = Color.Lerp(Yarn[i % n], Yarn[(i + 1) % n], s);
            return Color.Lerp(c, new Color32(232, 196, 120, 255), taut * 0.18f);
        }

        private static Color32 WithAlpha(Color c, float a) => new Color(c.r, c.g, c.b, a);

        private void OnDestroy()
        {
            if (_maskSprite != null) Destroy(_maskSprite);
            if (_maskTexture != null) Destroy(_maskTexture);
            foreach (var s in new[] { _ghost, _thread, _veil, _cutLine, _waves, _gaps, _zips, _glowMesh, _effectsMesh })
                if (s != null) Destroy(s.Mesh);
            _pieceView?.Destroy();
        }
    }
}

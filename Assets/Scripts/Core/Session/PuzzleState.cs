using System;
using System.Collections.Generic;
using GraphNode.Core.Constraints;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Outline;
using GraphNode.Core.Pins;
using GraphNode.Core.Rules;
using GraphNode.Core.Scoring;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Session
{
    /// <summary>Kết quả một lần thả tay; Gameplay dùng để phát tiếng, rung, chạy hiệu ứng trượt và vào chuỗi thắng.</summary>
    public readonly struct ReleaseResult
    {
        /// <summary>Thả tay có làm đổi gì không (chạm rồi nhấc, hoặc bị hủy, thì false).</summary>
        public readonly bool Applied;
        /// <summary>Node đặt hẳn vào chốt, dây thả vào đích, hoặc kim về trục.</summary>
        public readonly bool Snapped;
        /// <summary>Dây đang lệch viền mẫu được nắn đúng vào viền (hiệu ứng khớp dây).</summary>
        public readonly bool ContourSnap;
        /// <summary>Chốt node được đặt vào, hoặc −1.</summary>
        public readonly int Pin;
        /// <summary>Đã đánh số lại theo chốt: Gameplay áp <see cref="PuzzleState.LastPermutation"/> lên mảng theo node của View.</summary>
        public readonly bool Relabeled;
        public readonly bool Won;

        public ReleaseResult(bool applied, bool snapped, bool contourSnap, int pin, bool relabeled, bool won)
        {
            Applied = applied;
            Snapped = snapped;
            ContourSnap = contourSnap;
            Pin = pin;
            Relabeled = relabeled;
            Won = won;
        }

        public static readonly ReleaseResult Nothing = new ReleaseResult(false, false, false, -1, false, false);
    }

    /// <summary>
    /// Trạng thái màn đang chơi, thuần C#: vị trí node, độ uốn từng cạnh vòng, vị trí kim, độ khớp và chốt. Gameplay chuyển
    /// thao tác chạm thành các lệnh ở đây (bắt đầu kéo, kéo, thả) và vẽ theo trạng thái; mọi luật nằm ở đây để test được.
    /// Vị trí logic đổi ngay lúc thả (đặt hẳn vào chốt…), View tự trượt hình từ vị trí cũ tới. Không cấp phát khi kéo.
    /// </summary>
    public sealed class PuzzleState
    {
        private readonly PuzzleConfig _config;
        private readonly SolutionBends _solution;
        private readonly RegionMask _mask;
        private readonly MatchScorer _scorer;
        private readonly PinRelabeler _relabeler;
        private readonly PinMagnet _pinMagnet;
        private readonly BendMagnet _bendMagnet;
        private readonly List<INodeConstraint> _constraints = new List<INodeConstraint>();
        private readonly List<IWinCondition> _winConditions = new List<IWinCondition>();
        private readonly byte[] _solutionMask = new byte[RegionMask.CellCount];
        private readonly int[] _perm;
        private readonly float[] _relabelBends;
        private readonly Float2[] _scratch;
        private bool _dirty = true;

        public LevelModel Level { get; }
        public RingTopology Topology { get; }
        public IEdgeShape Shape { get; }
        public PinBoard Pins { get; }
        public IHintProvider Hints { get; }

        public Float2[] Positions { get; }
        /// <summary>Độ uốn theo cạnh vòng.</summary>
        public float[] Bends { get; }
        /// <summary>Vị trí kim; 0 nếu không phải màn gấp.</summary>
        public float FoldLine { get; private set; }
        /// <summary>Mặt nạ vùng tô hiện tại (sau <see cref="Refresh"/>).</summary>
        public byte[] Mask { get; } = new byte[RegionMask.CellCount];
        public float Score { get; private set; }
        public bool Won { get; private set; }
        /// <summary>Hoán vị của lần đánh số lại gần nhất: node cũ i thành node mới LastPermutation[i].</summary>
        public ReadOnlySpan<int> LastPermutation => _perm;

        public int DraggingNode { get; private set; } = -1;
        public int DraggingEdge { get; private set; } = -1;
        public bool DraggingNeedle { get; private set; }
        /// <summary>Node đang kéo nằm trong vùng hút của chốt nào (−1 nếu không).</summary>
        public int NodeMagnetPin => DraggingNode >= 0 ? _pinMagnet.MagnetPin : -1;
        public bool EdgeInMagnet => _edge.InMagnet;
        public bool NeedleInMagnet => _needle.InMagnet;

        public PuzzleState(LevelModel level, PuzzleConfig config)
        {
            Level = level ?? throw new ArgumentNullException(nameof(level));
            _config = config ?? throw new ArgumentNullException(nameof(config));
            Topology = new RingTopology(level);
            _solution = new SolutionBends(level, Topology);
            Shape = new HermiteEdgeShape(Topology, _solution);
            _mask = new RegionMask(Topology, Shape, level.NodeCount);
            _scorer = new MatchScorer(level, Topology, _solution, config.Penalty);
            Pins = new PinBoard(level, Topology, _solution, config.Pins);
            _relabeler = new PinRelabeler(level, Topology, Pins);
            _pinMagnet = new PinMagnet(level, Pins);
            _bendMagnet = new BendMagnet(config.Bend);
            Hints = new FarthestHintProvider(level, Pins);

            _constraints.Add(new FabricBoundsConstraint(config.FabricMargin));
            if (level.Fold != null) _constraints.Add(new FoldSideConstraint(level.Fold, Pins, config.FabricEdge));
            _constraints.Add(_pinMagnet);
            _winConditions.Add(new ScoreThresholdCondition());
            _winConditions.Add(new AllPinsFilledCondition());

            Positions = new Float2[level.NodeCount];
            Bends = new float[Topology.RingLength];
            _perm = new int[level.NodeCount];
            _relabelBends = new float[Topology.RingLength];
            _scratch = new Float2[level.NodeCount];
            _mask.RenderPiece(level.Solution, _solution.Bends, level.Fold?.SolutionLine ?? 0f, _solutionMask);
            Reset();
        }

        /// <summary>Độ uốn lời giải theo cạnh vòng (cho View vẽ hình mẫu và gợi ý).</summary>
        public ReadOnlySpan<float> SolutionBends => _solution.Bends;

        /// <summary>Về vị trí đầu (nút Đặt lại).</summary>
        public void Reset()
        {
            Array.Copy(Level.Start, Positions, Positions.Length);
            Array.Copy(Level.StartBend, Bends, Bends.Length);
            FoldLine = Level.Fold?.StartLine ?? 0f;
            Won = false;
            DraggingNode = DraggingEdge = -1;
            DraggingNeedle = false;
            _dirty = true;
            Refresh();
        }

        /// <summary>Tính lại mặt nạ, độ khớp và chốt nếu có gì đổi; gọi một lần mỗi khung hình.</summary>
        public void Refresh()
        {
            if (!_dirty) return;
            _mask.RenderPiece(Positions, Bends, FoldLine, Mask);
            Score = Math.Max(0f, _scorer.Score(Mask, _solutionMask, Bends));
            Pins.Evaluate(Positions);
            _dirty = false;
        }

        // ---------- kéo node ----------

        public void BeginNodeDrag(int node)
        {
            if (Won || Level.Locked[node]) return;
            DraggingNode = node;
        }

        /// <summary>Đưa node đang kéo tới vị trí ngón tay (đã cộng khoảng lệch lúc chạm và độ nâng), qua các ràng buộc.</summary>
        public void DragNode(Float2 proposed)
        {
            if (DraggingNode < 0) return;
            var ctx = new NodeDragContext(DraggingNode, Positions, FoldLine);
            var p = proposed;
            for (int i = 0; i < _constraints.Count; i++) p = _constraints[i].Apply(ctx, p);
            Positions[DraggingNode] = p;
            _dirty = true;
        }

        public ReleaseResult EndNodeDrag(bool cancelled, bool moved)
        {
            int node = DraggingNode;
            DraggingNode = -1;
            if (node < 0 || cancelled || !moved) return ReleaseResult.Nothing;
            int pin = _pinMagnet.InMagnet ? _pinMagnet.MagnetPin : -1;
            if (pin >= 0) Positions[node] = Level.Solution[pin];
            _dirty = true;
            bool relabeled = TryRelabel();
            return new ReleaseResult(true, pin >= 0, false, pin, relabeled, CheckWin());
        }

        // ---------- kéo dây ----------

        private struct EdgeDrag
        {
            public Float2 Start, Anchor, Tangent, Normal;
            public float Length, H0, Target, MaxError;
            public bool HasTarget, InMagnet, HasMagnetBend;
            public float MagnetBend;
        }

        private EdgeDrag _edge;

        /// <param name="grabU">Vị trí điểm bắt trên dây (0–1) từ <see cref="Input.TouchArbiter"/>.</param>
        public void BeginEdgeDrag(int edge, Float2 touch, float grabU)
        {
            if (Won) return;
            int n = Topology.RingLength;
            var a = Positions[Topology.RingNode(edge)];
            var b = Positions[Topology.RingNode((edge + 1) % n)];
            var ab = b - a;
            float len = ab.Length;
            if (len < 1e-6f) len = 1f;
            var t = ab / len;
            DraggingEdge = edge;
            _edge = new EdgeDrag
            {
                Start = touch, Anchor = a, Tangent = t, Normal = new Float2(-t.Y, t.X), Length = len, H0 = Bends[edge],
                HasTarget = Pins.TryGetEdgeTarget(edge, Positions, FoldLine, out float target), Target = target
            };
        }

        public void DragEdge(Float2 touch)
        {
            if (DraggingEdge < 0) return;
            float u = BendDrag.ClampGrab(Float2.Dot(touch - _edge.Anchor, _edge.Tangent) / _edge.Length);
            float delta = Float2.Dot(touch - _edge.Start, _edge.Normal);
            float raw = _edge.H0 + delta * BendDrag.Gain(u);
            float limit = _config.Bend.Limit;
            raw = Math.Max(-limit, Math.Min(limit, raw));
            if (_edge.HasTarget) _edge.MaxError = Math.Max(_edge.MaxError, Math.Abs(raw - _edge.Target));
            var r = _bendMagnet.Apply(raw, _edge.HasTarget, _edge.Target);
            _edge.InMagnet = r.InMagnet;
            _edge.HasMagnetBend = r.InMagnet;
            _edge.MagnetBend = r.InMagnet && r.SnappedStraight ? 0f : _edge.Target;
            Bends[DraggingEdge] = r.Bend;
            _dirty = true;
        }

        public ReleaseResult EndEdgeDrag(bool cancelled, bool moved)
        {
            int k = DraggingEdge;
            DraggingEdge = -1;
            if (k < 0 || cancelled || !moved) return ReleaseResult.Nothing;
            bool contour = false, snapped = false;
            if (_edge.HasMagnetBend)
            {
                // khớp viền thật chỉ khi dây thật sự được sửa: lúc bắt đầu đã lệch đích, hoặc bị kéo ra khỏi vùng hút
                bool wasOff = _edge.HasTarget && (Math.Abs(_edge.H0 - _edge.Target) >= _config.EdgeWasOff || _edge.MaxError >= _config.Bend.MagnetRadius);
                contour = wasOff && Math.Abs(_edge.MagnetBend - _edge.Target) < 1e-4f;
                Bends[k] = _edge.MagnetBend;
                snapped = true;
            }
            _dirty = true;
            return new ReleaseResult(true, snapped, contour, -1, false, CheckWin());
        }

        // ---------- kim màn gấp ----------

        private struct NeedleDrag
        {
            public float StartAcross, StartLine;
            public bool InMagnet;
        }

        private NeedleDrag _needle;

        public void BeginNeedleDrag(Float2 touch)
        {
            if (Won || Level.Fold == null) return;
            DraggingNeedle = true;
            _needle = new NeedleDrag { StartAcross = Across(touch), StartLine = FoldLine };
        }

        public void DragNeedle(Float2 touch)
        {
            if (!DraggingNeedle) return;
            var p = _config.Needle;
            NeedleRange(out float lo, out float hi);
            float x = Math.Max(lo, Math.Min(hi, _needle.StartLine + Across(touch) - _needle.StartAcross));
            float sol = Level.Fold.SolutionLine, dm = Math.Abs(x - sol);
            _needle.InMagnet = dm < p.MagnetRadius;
            if (_needle.InMagnet) x += (sol - x) * p.MagnetPull * (1 - dm / p.MagnetRadius);
            SetNeedle(x);
        }

        public ReleaseResult EndNeedleDrag(bool cancelled, bool moved)
        {
            if (!DraggingNeedle) return ReleaseResult.Nothing;
            DraggingNeedle = false;
            if (cancelled || !moved) return ReleaseResult.Nothing;
            if (_needle.InMagnet) SetNeedle(Level.Fold.SolutionLine);
            bool relabeled = TryRelabel();
            return new ReleaseResult(true, _needle.InMagnet, false, -1, relabeled, CheckWin());
        }

        /// <summary>Khoảng kim đi được: [Min, Max] thu hẹp để kim không vượt node thường và bản soi gương còn trong khung.</summary>
        public void NeedleRange(out float lo, out float hi)
        {
            lo = _config.Needle.Min;
            hi = _config.Needle.Max;
            for (int i = 0; i < Positions.Length; i++)
            {
                if (Pins.OnFold(i)) continue;
                float a = Across(Positions[i]);
                lo = Math.Max(lo, a + 0.02f);
                hi = Math.Min(hi, (_config.FabricEdge + a) / 2);
            }
            hi = Math.Max(lo, hi);
        }

        private void SetNeedle(float x)
        {
            FoldLine = x;
            bool isY = Level.Fold.Axis == FoldAxis.Y;
            for (int i = 0; i < Positions.Length; i++)
            {
                var p = Positions[i];
                // node mép gấp chạy theo kim; node thường bị kim đẩy về phía người chơi xếp
                if (Pins.OnFold(i) || (!Level.Locked[i] && Across(p) > x))
                    Positions[i] = isY ? new Float2(p.X, x) : new Float2(x, p.Y);
            }
            _dirty = true;
        }

        private float Across(Float2 p) => Level.Fold != null && Level.Fold.Axis == FoldAxis.Y ? p.Y : p.X;

        // ---------- luật ----------

        /// <summary>Chọn thứ gợi ý theo luật mặc định (Gameplay trừ booster).</summary>
        public Hint PickHint() => Hints.Pick(Positions, Bends, FoldLine);

        private bool TryRelabel()
        {
            Pins.Evaluate(Positions);
            if (!_relabeler.TryRelabel(Bends, _perm, _relabelBends)) return false;
            PinRelabeler.Permute(Positions, _perm, _scratch);
            Array.Copy(_relabelBends, Bends, Bends.Length);
            _dirty = true;
            return true;
        }

        private bool CheckWin()
        {
            Refresh();
            var ctx = new WinContext(Score, Level.WinThreshold, Pins);
            for (int i = 0; i < _winConditions.Count; i++)
                if (!_winConditions[i].IsMet(ctx)) return false;
            Won = true;
            return true;
        }
    }
}

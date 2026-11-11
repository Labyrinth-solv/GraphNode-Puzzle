using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Input
{
    /// <summary>
    /// Bán kính của bộ lọc chạm (đặc tả mục Bộ lọc chạm 3 lớp), theo bề rộng khung vải. Đặc tả ghi số bằng pt trên khung
    /// 362 pt; Gameplay quy đổi pt sang bề rộng vải theo DPI và scale canvas rồi dựng struct này. Số tạm của bản web chính.
    /// </summary>
    public readonly struct TouchParams
    {
        /// <summary>Vùng chọn node = một nửa khoảng cách tới node gần nhất, kẹp trong [PickMin, PickMax].</summary>
        public readonly float PickMin, PickMax;
        /// <summary>Tìm dây trong bán kính này.</summary>
        public readonly float EdgeSearch;
        /// <summary>Chỉ bắt thân dây ở đoạn giữa [MidStart, MidEnd] theo chiều dài.</summary>
        public readonly float MidStart, MidEnd;
        /// <summary>Chạm cách tâm node kéo được dưới mức này thì luôn chọn node (25 pt).</summary>
        public readonly float NodePriority;
        /// <summary>Chạm khoảng trống cách đầu dây (node kéo được) dưới mức này thì không bắt dây (31 pt).</summary>
        public readonly float EndpointBubble;
        /// <summary>Chạm cách kim màn gấp dưới mức này thì kéo kim.</summary>
        public readonly float NeedleHit;

        public TouchParams(float pickMin, float pickMax, float edgeSearch, float midStart, float midEnd, float nodePriority, float endpointBubble, float needleHit)
        {
            PickMin = pickMin;
            PickMax = pickMax;
            EdgeSearch = edgeSearch;
            MidStart = midStart;
            MidEnd = midEnd;
            NodePriority = nodePriority;
            EndpointBubble = endpointBubble;
            NeedleHit = needleHit;
        }

        public static readonly TouchParams WebDemo = new TouchParams(0.088f, 0.22f, 0.088f, 0.25f, 0.75f, 0.068f, 0.085f, 0.065f);
    }

    public enum TouchTargetKind
    {
        None,
        /// <summary>Node kéo được.</summary>
        Node,
        /// <summary>Node khóa: không kéo, Gameplay rung node để báo.</summary>
        LockedNode,
        /// <summary>Thân dây: kéo để uốn.</summary>
        Edge,
        /// <summary>Kim của màn gấp.</summary>
        Needle
    }

    public readonly struct TouchTarget
    {
        public readonly TouchTargetKind Kind;
        /// <summary>Node (Node, LockedNode) hoặc cạnh vòng (Edge); −1 nếu không có.</summary>
        public readonly int Index;
        /// <summary>Vị trí điểm bắt trên dây theo chiều dài, 0–1 (chỉ với Edge).</summary>
        public readonly float EdgeU;

        public TouchTarget(TouchTargetKind kind, int index, float edgeU = 0f)
        {
            Kind = kind;
            Index = index;
            EdgeU = edgeU;
        }

        public static readonly TouchTarget None = new TouchTarget(TouchTargetKind.None, -1);
    }

    /// <summary>
    /// Bộ lọc chạm 3 lớp, hàm thuần (đặc tả mục Bộ lọc chạm 3 lớp): (1) chỉ bắt thân dây ở đoạn giữa; (2) chạm gần tâm
    /// node kéo được thì luôn chọn node, xa hơn thì chỉ chọn dây khi gần dây hơn gần node; (3) chạm khoảng trống gần đầu
    /// dây là node kéo được thì không bắt dây. Node khóa không có vùng bảo vệ: chạm node khóa mà trúng đoạn giữa dây thì
    /// uốn dây. Thanh gạt kim là giao diện, Gameplay xét trước khi gọi.
    /// </summary>
    public sealed class TouchArbiter
    {
        private const int HitSteps = 20;

        private readonly LevelModel _level;
        private readonly RingTopology _topo;
        private readonly IEdgeShape _shape;
        private readonly TouchParams _params;
        private readonly Float2[] _poly = new Float2[HitSteps + 1];

        public TouchArbiter(LevelModel level, RingTopology topo, IEdgeShape shape, TouchParams parameters)
        {
            _level = level;
            _topo = topo;
            _shape = shape;
            _params = parameters;
        }

        /// <param name="touch">Điểm chạm theo toạ độ vải.</param>
        /// <param name="foldLine">Vị trí kim; bỏ qua nếu không phải màn gấp.</param>
        public TouchTarget Pick(Float2 touch, ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, float foldLine)
        {
            int bestNode = -1;
            float nodeD = float.MaxValue;
            for (int i = 0; i < pos.Length; i++)
            {
                float d = Float2.Distance(touch, pos[i]);
                if (d < PickRadius(i, pos) && d < nodeD)
                {
                    nodeD = d;
                    bestNode = i;
                }
            }

            bool hasEdge = TryHitEdge(touch, pos, bends, out int edge, out float edgeD, out float edgeU);
            bool preferEdge = hasEdge && (bestNode < 0 || _level.Locked[bestNode] || (nodeD >= _params.NodePriority && edgeD < nodeD));
            if (preferEdge)
            {
                if (bestNode >= 0 || !NearFreeEndpoint(touch, pos, edge)) return new TouchTarget(TouchTargetKind.Edge, edge, edgeU);
            }

            if (bestNode < 0)
            {
                var fold = _level.Fold;
                if (fold != null)
                {
                    bool isY = fold.Axis == FoldAxis.Y;
                    float across = isY ? touch.Y : touch.X, along = isY ? touch.X : touch.Y;
                    if (Math.Abs(across - foldLine) < _params.NeedleHit && along > 0 && along < 1) return new TouchTarget(TouchTargetKind.Needle, -1);
                }
                return TouchTarget.None;
            }
            return new TouchTarget(_level.Locked[bestNode] ? TouchTargetKind.LockedNode : TouchTargetKind.Node, bestNode);
        }

        /// <summary>Vùng chọn node theo mật độ: một nửa khoảng cách tới node gần nhất, kẹp trong [PickMin, PickMax].</summary>
        public float PickRadius(int node, ReadOnlySpan<Float2> pos)
        {
            float best = float.MaxValue;
            for (int j = 0; j < pos.Length; j++)
                if (j != node) best = Math.Min(best, Float2.Distance(pos[j], pos[node]));
            return Math.Max(_params.PickMin, Math.Min(_params.PickMax, best * 0.5f));
        }

        private bool TryHitEdge(Float2 touch, ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, out int edge, out float dist, out float u)
        {
            edge = -1;
            dist = _params.EdgeSearch;
            u = 0f;
            int n = _topo.RingLength;
            for (int k = 0; k < n; k++)
            {
                if (!_topo.InFoldChain(k)) continue;
                int count = _shape.Sample(pos, bends, _topo.RingNode(k), _topo.RingNode((k + 1) % n), HitSteps, false, _poly);
                int segs = count - 1;
                for (int s = 0; s < segs; s++)
                {
                    var a = _poly[s];
                    var ab = _poly[s + 1] - a;
                    float l2 = ab.LengthSquared;
                    float t = l2 > 0 ? Math.Max(0f, Math.Min(1f, Float2.Dot(touch - a, ab) / l2)) : 0f;
                    // u tính theo số đoạn như bản web (cạnh thẳng có một đoạn, cạnh cong có HitSteps đoạn)
                    float su = (s + t) / segs;
                    if (su < _params.MidStart || su > _params.MidEnd) continue;
                    float d = Float2.Distance(touch, a + ab * t);
                    if (d < dist)
                    {
                        dist = d;
                        edge = k;
                        u = su;
                    }
                }
            }
            return edge >= 0;
        }

        private bool NearFreeEndpoint(Float2 touch, ReadOnlySpan<Float2> pos, int edge)
        {
            int n = _topo.RingLength;
            int a = _topo.RingNode(edge), b = _topo.RingNode((edge + 1) % n);
            return (!_level.Locked[a] && Float2.Distance(touch, pos[a]) < _params.EndpointBubble)
                   || (!_level.Locked[b] && Float2.Distance(touch, pos[b]) < _params.EndpointBubble);
        }
    }
}

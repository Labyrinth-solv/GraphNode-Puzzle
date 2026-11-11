using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Runner
{
    /// <summary>Trạng thái mà luật điểm sáng đọc để quyết định tốc độ và chiều.</summary>
    public readonly struct RunnerContext
    {
        public readonly int Edge;
        public readonly float T;
        public readonly bool Dragging;

        public RunnerContext(int edge, float t, bool dragging)
        {
            Edge = edge;
            T = t;
            Dragging = dragging;
        }
    }

    /// <summary>
    /// Luật của điểm sáng: tốc độ (bề rộng vải mỗi giây) và chiều chạy. Thêm hai điểm sáng hay nhảy cổng bằng lớp mới.
    /// </summary>
    public interface IRunnerRule
    {
        float Speed(in RunnerContext context);
        /// <summary>1 là theo chiều vòng, −1 là ngược.</summary>
        int Direction { get; }
    }

    /// <summary>Tốc độ đều, kể cả khi đang kéo và khi qua node (đặc tả: không nảy); đổi chiều bằng nút Đảo chiều.</summary>
    public sealed class ConstantSpeedRule : IRunnerRule
    {
        private readonly float _speed;

        public ConstantSpeedRule(float speed, int direction = 1)
        {
            _speed = speed;
            Direction = direction >= 0 ? 1 : -1;
        }

        public int Direction { get; private set; }

        public void Reverse() => Direction = -Direction;

        public float Speed(in RunnerContext context) => _speed;

        /// <summary>Tốc độ thường của bản web chính: 68% bề rộng vải mỗi giây (số tạm).</summary>
        public const float WebDemoSpeed = 0.68f;
    }

    /// <summary>
    /// Điểm sáng chạy theo vòng node (đặc tả mục Điểm sáng): gắn với một cạnh vòng và vị trí tỉ lệ trên cạnh đó, nên khi
    /// node bị kéo làm cạnh dài ra hay co lại điểm vẫn đi theo cạnh liên tục. Mỗi lần qua một node báo về để phát nốt;
    /// nhiều node trong cùng một bước đều được báo. Hàm thuần theo dt, không đọc thời gian hệ thống. Không cấp phát.
    /// </summary>
    public sealed class RunnerSimulator
    {
        private const int LengthSteps = 24;
        /// <summary>Giới hạn số node qua trong một bước, để dt quá lớn không làm vòng lặp chạy mãi.</summary>
        private const int MaxPassesPerStep = 10;
        private const float MinEdgeLength = 1e-4f;

        private readonly RingTopology _topo;
        private readonly IEdgeShape _shape;
        private readonly Float2[] _poly = new Float2[LengthSteps + 1];

        /// <summary>Cạnh vòng đang chạy.</summary>
        public int Edge { get; private set; }
        /// <summary>Vị trí tỉ lệ trên cạnh theo chiều vòng, 0–1.</summary>
        public float T { get; private set; }

        public RunnerSimulator(RingTopology topo, IEdgeShape shape, int startEdge = 0)
        {
            _topo = topo ?? throw new ArgumentNullException(nameof(topo));
            _shape = shape ?? throw new ArgumentNullException(nameof(shape));
            Edge = startEdge;
        }

        /// <summary>Bước điểm sáng; ghi các node vừa qua (theo thứ tự) vào passedNodes, trả về số node.</summary>
        public int Step(float dt, IRunnerRule rule, bool dragging, ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, Span<int> passedNodes)
        {
            int n = _topo.RingLength, passed = 0;
            int dir = rule.Direction;
            float remaining = rule.Speed(new RunnerContext(Edge, T, dragging)) * dt;
            int guard = 0;
            while (remaining > 0 && guard++ < MaxPassesPerStep)
            {
                float len = Math.Max(EdgeLength(Edge, pos, bends), MinEdgeLength);
                float left = (dir > 0 ? 1 - T : T) * len;
                if (left <= 0)
                {
                    // đang đứng đúng tại node (vừa qua rồi đổi chiều): sang cạnh kia mà không phát lại nốt
                    if (dir > 0) { Edge = (Edge + 1) % n; T = 0; }
                    else { Edge = (Edge + n - 1) % n; T = 1; }
                    continue;
                }
                if (remaining < left)
                {
                    T += dir * remaining / len;
                    break;
                }
                remaining -= left;
                if (dir > 0)
                {
                    Edge = (Edge + 1) % n;
                    T = 0;
                    if (passed < passedNodes.Length) passedNodes[passed++] = _topo.RingNode(Edge);
                }
                else
                {
                    // chạy ngược: tới đầu cạnh là qua node ring[Edge], rồi sang cuối cạnh trước
                    if (passed < passedNodes.Length) passedNodes[passed++] = _topo.RingNode(Edge);
                    Edge = (Edge + n - 1) % n;
                    T = 1;
                }
            }
            return passed;
        }

        /// <summary>Chiều dài cạnh vòng k theo hình đang hiển thị (đường gấp khúc 24 đoạn).</summary>
        public float EdgeLength(int k, ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends)
        {
            int n = _topo.RingLength;
            int count = _shape.Sample(pos, bends, _topo.RingNode(k), _topo.RingNode((k + 1) % n), LengthSteps, false, _poly);
            float len = 0;
            for (int i = 0; i + 1 < count; i++) len += Float2.Distance(_poly[i], _poly[i + 1]);
            return len;
        }
    }

    /// <summary>Thông số cảnh cắt khi thắng (đặc tả mục Điểm sáng; số tạm).</summary>
    public readonly struct CutTimingParams
    {
        public readonly float BaseSpeed;
        public readonly float TargetSeconds;
        public readonly float MinMultiplier;
        public readonly float MaxMultiplier;

        public CutTimingParams(float baseSpeed, float targetSeconds, float minMultiplier, float maxMultiplier)
        {
            BaseSpeed = baseSpeed;
            TargetSeconds = targetSeconds;
            MinMultiplier = minMultiplier;
            MaxMultiplier = maxMultiplier;
        }

        public static readonly CutTimingParams WebDemo = new CutTimingParams(ConstantSpeedRule.WebDemoSpeed, 1.5f, 1.6f, 2.5f);
    }

    /// <summary>
    /// Cảnh cắt khi thắng chạy nhanh hơn tốc độ thường theo chu vi: hệ số = kẹp(chu vi / (tốc độ × thời gian nhắm), min,
    /// max); mảnh cỡ vừa cắt hết đúng thời gian nhắm.
    /// </summary>
    public static class CutTiming
    {
        public static float Multiplier(float perimeter, in CutTimingParams p) =>
            Math.Max(p.MinMultiplier, Math.Min(p.MaxMultiplier, perimeter / (p.BaseSpeed * p.TargetSeconds)));

        public static float Duration(float perimeter, in CutTimingParams p) => perimeter / (p.BaseSpeed * Multiplier(perimeter, p));
    }

    /// <summary>
    /// Thang ngũ cung leo liên tục qua các quãng tám (đặc tả: cao độ luôn tăng dần trong cảnh cắt): bậc 0–4 là đô, rê,
    /// mi, sol, la; bậc 5–9 lặp lại cao hơn một quãng tám. Không vòng về nốt đầu.
    /// </summary>
    public static class Pentatonic
    {
        private static readonly int[] Degrees = { 0, 2, 4, 7, 9 };

        /// <summary>Số nửa cung tính từ nốt gốc của bậc thứ step (step ≥ 0).</summary>
        public static int Semitones(int step)
        {
            if (step < 0) throw new ArgumentOutOfRangeException(nameof(step));
            return step / 5 * 12 + Degrees[step % 5];
        }
    }
}

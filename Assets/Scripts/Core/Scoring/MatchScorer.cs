using System;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Scoring
{
    /// <summary>
    /// Thông số phạt độ uốn (đặc tả mục Uốn cạnh, số của bản web; giá trị thật nằm trong cấu hình cân bằng ở Data).
    /// </summary>
    public readonly struct BendPenaltyParams
    {
        /// <summary>Phạt tối đa trừ vào độ khớp khi mọi cạnh uốn sai hết.</summary>
        public readonly float Weight;
        /// <summary>Mẫu số tối thiểu khi chuẩn hóa sai lệch, để cạnh lời giải gần thẳng không bị phạt quá nặng.</summary>
        public readonly float MinSpan;
        /// <summary>Sai lệch chuẩn hóa của một cạnh bị kẹp ở mức này.</summary>
        public readonly float ErrorCap;
        /// <summary>Level không ghi bendFree: tính phạt trên mọi cạnh có |h lời giải| từ mức này.</summary>
        public readonly float AutoFreeThreshold;

        public BendPenaltyParams(float weight, float minSpan, float errorCap, float autoFreeThreshold)
        {
            Weight = weight;
            MinSpan = minSpan;
            ErrorCap = errorCap;
            AutoFreeThreshold = autoFreeThreshold;
        }

        public static readonly BendPenaltyParams WebDemo = new BendPenaltyParams(0.18f, 0.04f, 1.2f, 0.015f);
    }

    /// <summary>
    /// Điểm khớp = giao chia hợp giữa mặt nạ người chơi và mặt nạ lời giải, trừ phạt độ uốn (đã chốt tính vào thanh khớp).
    /// </summary>
    public sealed class MatchScorer
    {
        private readonly int[] _penaltyEdges;
        private readonly float[] _solutionBends;
        private readonly BendPenaltyParams _params;

        public MatchScorer(LevelModel level, RingTopology topo, SolutionBends solution, BendPenaltyParams parameters)
            : this(level.BendFree, topo, solution, parameters)
        {
        }

        /// <param name="bendFree">Cạnh phải tự uốn; rỗng thì tính trên mọi cạnh cong rõ (trình sinh vị trí đầu dùng khi
        /// tự chọn bendFree).</param>
        public MatchScorer(int[] bendFree, RingTopology topo, SolutionBends solution, BendPenaltyParams parameters)
        {
            _solutionBends = solution.Bends;
            _params = parameters;
            if (bendFree != null && bendFree.Length > 0) _penaltyEdges = bendFree;
            else
            {
                int count = 0;
                var tmp = new int[topo.RingLength];
                for (int k = 0; k < topo.RingLength; k++)
                    if (Math.Abs(_solutionBends[k]) >= parameters.AutoFreeThreshold && topo.InFoldChain(k)) tmp[count++] = k;
                _penaltyEdges = new int[count];
                Array.Copy(tmp, _penaltyEdges, count);
            }
        }

        public float Score(byte[] player, byte[] solution, ReadOnlySpan<float> bends) => Iou(player, solution) - BendPenalty(bends);

        /// <summary>Trung bình sai lệch độ uốn chuẩn hóa của các cạnh phải uốn, nhân hệ số phạt.</summary>
        public float BendPenalty(ReadOnlySpan<float> bends)
        {
            if (_penaltyEdges.Length == 0) return 0f;
            double sum = 0;
            for (int i = 0; i < _penaltyEdges.Length; i++)
            {
                int k = _penaltyEdges[i];
                double cur = k < bends.Length ? bends[k] : 0;
                double target = _solutionBends[k];
                double span = Math.Max(_params.MinSpan, Math.Abs(target));
                sum += Math.Min(_params.ErrorCap, Math.Abs(cur - target) / span);
            }
            return (float)(sum / _penaltyEdges.Length * _params.Weight);
        }

        public static float Iou(byte[] a, byte[] b)
        {
            if (a.Length != b.Length) throw new ArgumentException("masks differ in size");
            int inter = 0, union = 0;
            for (int i = 0; i < a.Length; i++)
            {
                int x = a[i], y = b[i];
                inter += x & y;
                union += x | y;
            }
            return union == 0 ? 0f : (float)inter / union;
        }
    }
}

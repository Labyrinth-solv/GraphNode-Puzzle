using System;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;

namespace GraphNode.Core.Pins
{
    /// <summary>
    /// Đánh số lại theo chốt (đặc tả mục Chốt trên viền mẫu): node nào vào chốt nào cũng được, nhưng độ uốn, phạt độ uốn,
    /// nam châm dây và snap so theo số thứ tự cạnh. Khi mọi chốt đã lấp theo một vòng xoay hay soi gương của vòng lời
    /// giải (node khóa đứng yên, node mép gấp vẫn ở mép gấp) thì trả về hoán vị node và độ uốn mới theo cạnh mới.
    /// Node trông giống nhau nên người chơi không thấy gì. Gameplay áp hoán vị lên mọi mảng theo node.
    /// </summary>
    public sealed class PinRelabeler
    {
        private const float UnchangedBend = 1e-6f;

        private readonly LevelModel _level;
        private readonly RingTopology _topo;
        private readonly PinBoard _board;
        private readonly float[] _defaultBends;
        private readonly int[] _inverse;
        private readonly int[] _edgeFrom;
        private readonly int[] _edgeSign;

        public PinRelabeler(LevelModel level, RingTopology topo, PinBoard board)
        {
            _level = level;
            _topo = topo;
            _board = board;
            _defaultBends = level.StartBend;
            int n = level.NodeCount;
            _inverse = new int[n];
            _edgeFrom = new int[topo.RingLength];
            _edgeSign = new int[topo.RingLength];
        }

        /// <summary>
        /// Gọi sau <see cref="PinBoard.Evaluate"/>. Trả về false khi không cần đổi: chưa lấp đủ, đã đúng thứ tự, hoặc
        /// cách đặt không phải xoay hay soi gương (hình bắt chéo).
        /// </summary>
        /// <param name="bends">Độ uốn hiện tại theo cạnh vòng.</param>
        /// <param name="permutation">Ghi: node cũ i thành node mới permutation[i].</param>
        /// <param name="newBends">Ghi: độ uốn theo cạnh mới. Dây chưa uốn nhận độ uốn ban đầu của cạnh mới; dây đã uốn giữ
        /// hình (đổi dấu nếu ngược chiều).</param>
        public bool TryRelabel(ReadOnlySpan<float> bends, Span<int> permutation, Span<float> newBends)
        {
            if (!_board.AllFilled) return false;
            int nodes = _level.NodeCount, n = _topo.RingLength;
            var perm = _board.NodeToPin;
            bool same = true;
            for (int i = 0; i < nodes; i++)
            {
                int p = perm[i];
                if (p < 0) return false;
                if (p != i) same = false;
                if ((_level.Locked[i] && p != i) || _board.OnFold(i) != _board.OnFold(p)) return false;
            }
            if (same) return false;

            for (int i = 0; i < nodes; i++) _inverse[perm[i]] = i;
            for (int k = 0; k < n; k++)
            {
                // cạnh mới k nối hai chốt liền nhau; tìm cạnh cũ đang nối đúng hai node đã nằm trên hai chốt đó
                int a = _inverse[_topo.RingNode(k)], b = _inverse[_topo.RingNode((k + 1) % n)];
                int g;
                int sign;
                if (_topo.TryGetRingEdge(a, b, out g, out sign) == false) return false;
                if (_topo.InFoldChain(g) != _topo.InFoldChain(k)) return false;
                _edgeFrom[k] = g;
                _edgeSign[k] = sign;
            }
            for (int k = 0; k < n; k++)
            {
                int g = _edgeFrom[k];
                float v = g < bends.Length ? bends[g] : 0f;
                newBends[k] = Math.Abs(v - _defaultBends[g]) < UnchangedBend ? _defaultBends[k] : _edgeSign[k] * v;
            }
            for (int i = 0; i < nodes; i++) permutation[i] = perm[i];
            return true;
        }

        /// <summary>Áp hoán vị lên một mảng theo node: phần tử của node cũ i chuyển tới chỉ số permutation[i].</summary>
        public static void Permute<T>(T[] values, ReadOnlySpan<int> permutation, T[] scratch)
        {
            for (int i = 0; i < values.Length; i++) scratch[permutation[i]] = values[i];
            Array.Copy(scratch, values, values.Length);
        }
    }
}

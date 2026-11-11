using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Pins
{
    /// <summary>
    /// Chốt đặt tại vị trí lời giải của từng node (đặc tả mục Chốt trên viền mẫu). Node nào vào chốt nào cũng được.
    /// Ghép node với chốt theo cặp gần nhất trước, mỗi chốt một node, cùng một bán kính "đã cắm".
    /// Bộ đệm dựng một lần; Evaluate không cấp phát.
    /// </summary>
    public sealed class PinBoard
    {
        private readonly LevelModel _level;
        private readonly RingTopology _topo;
        private readonly SolutionBends _solution;
        private readonly PinParams _params;
        private readonly bool[] _onFold;

        /// <summary>Chốt mà node đang được ghép, hoặc −1 (kết quả lần Evaluate gần nhất).</summary>
        public int[] NodeToPin { get; }
        /// <summary>Node đang chiếm chốt, hoặc −1.</summary>
        public int[] PinToNode { get; }
        public int FilledCount { get; private set; }
        public int PinCount => _level.NodeCount;
        public bool AllFilled => FilledCount == PinCount;

        public PinBoard(LevelModel level, RingTopology topo, SolutionBends solution, PinParams parameters)
        {
            _level = level;
            _topo = topo;
            _solution = solution;
            _params = parameters;
            int n = level.NodeCount;
            NodeToPin = new int[n];
            PinToNode = new int[n];
            _onFold = new bool[n];
            if (level.Fold != null)
                foreach (var chain in level.Fold.Chains)
                {
                    _onFold[topo.RingNode(chain.From % topo.RingLength)] = true;
                    _onFold[topo.RingNode(chain.To % topo.RingLength)] = true;
                }
        }

        public PinParams Params => _params;

        /// <summary>Node (cũng là chốt cùng chỉ số) nằm trên mép gấp: chạy theo kim, chỉ trượt dọc mép.</summary>
        public bool OnFold(int node) => _onFold[node];

        public Float2 PinPosition(int pin) => _level.Solution[pin];

        /// <summary>Ghép node với chốt, cặp gần nhất trước.</summary>
        public void Evaluate(ReadOnlySpan<Float2> pos)
        {
            int n = _level.NodeCount;
            for (int i = 0; i < n; i++)
            {
                NodeToPin[i] = -1;
                PinToNode[i] = -1;
            }
            FilledCount = 0;
            float r = _params.OnRadius;
            // n tới 14 node: chọn lặp cặp gần nhất còn trống, O(n³) nhưng không cấp phát và không cần sắp xếp
            while (true)
            {
                int bi = -1, bj = -1;
                float bd = float.MaxValue;
                for (int j = 0; j < n; j++)
                {
                    if (PinToNode[j] >= 0) continue;
                    for (int i = 0; i < n; i++)
                    {
                        if (NodeToPin[i] >= 0) continue;
                        float d = Float2.Distance(pos[i], _level.Solution[j]);
                        if (d <= r && d < bd)
                        {
                            bd = d;
                            bi = i;
                            bj = j;
                        }
                    }
                }
                if (bi < 0) break;
                NodeToPin[bi] = bj;
                PinToNode[bj] = bi;
                FilledCount++;
            }
        }

        /// <summary>
        /// Chốt mà một node đang nằm, hoặc −1. Node khóa luôn ở chốt của nó; node mép gấp chỉ tính khi kim đã về đúng
        /// trục lời giải.
        /// </summary>
        public int PinOf(int node, Float2 nodePos, float foldLine)
        {
            var fold = _level.Fold;
            if (_onFold[node] && fold != null && Math.Abs(foldLine - fold.SolutionLine) > _params.FoldLineTolerance) return -1;
            if (_level.Locked[node]) return node;
            int best = -1;
            float bd = _params.OnRadius;
            for (int j = 0; j < _level.NodeCount; j++)
            {
                float d = Float2.Distance(nodePos, _level.Solution[j]);
                if (d <= bd)
                {
                    bd = d;
                    best = j;
                }
            }
            return best;
        }

        /// <summary>
        /// Đích độ uốn của cạnh vòng k theo chốt hai đầu đang nằm (đặc tả mục Uốn cạnh): nếu hai chốt là hai đầu một cạnh
        /// lời giải thì đích là độ uốn lời giải của cạnh đó, đổi dấu nếu đi ngược chiều. Không có đích thì dây không bị
        /// hút, không có gợi ý, không có hiệu ứng khớp dây.
        /// </summary>
        public bool TryGetEdgeTarget(int k, ReadOnlySpan<Float2> pos, float foldLine, out float targetBend)
        {
            targetBend = 0f;
            int n = _topo.RingLength;
            if (!_topo.InFoldChain(k)) return false;
            int a = _topo.RingNode(k), b = _topo.RingNode((k + 1) % n);
            int pa = PinOf(a, pos[a], foldLine), pb = PinOf(b, pos[b], foldLine);
            if (pa < 0 || pb < 0 || pa == pb) return false;
            for (int g = 0; g < n; g++)
            {
                if (!_topo.InFoldChain(g)) continue;
                int ga = _topo.RingNode(g), gb = _topo.RingNode((g + 1) % n);
                if (ga == pa && gb == pb)
                {
                    targetBend = _solution.Bends[g];
                    return true;
                }
                if (ga == pb && gb == pa)
                {
                    targetBend = -_solution.Bends[g];
                    return true;
                }
            }
            return false;
        }
    }
}

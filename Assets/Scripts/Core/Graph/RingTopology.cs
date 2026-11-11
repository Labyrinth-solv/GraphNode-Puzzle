using System.Collections.Generic;
using GraphNode.Core.Levels;

namespace GraphNode.Core.Graph
{
    /// <summary>
    /// Quan hệ kề trên vòng node, dựng một lần lúc vào màn: vị trí của node trên vòng, láng giềng trước sau, danh sách
    /// cạnh (cạnh vòng trước, cạnh trong sau) và cạnh nào thuộc đoạn cắt của màn gấp.
    /// </summary>
    public sealed class RingTopology
    {
        private readonly int[] _ring;
        private readonly int[] _ringPos;
        private readonly FoldSpec _fold;

        public int RingLength => _ring.Length;

        /// <summary>Cạnh vòng trước (chỉ số = chỉ số cạnh vòng), rồi cạnh trong.</summary>
        public IReadOnlyList<NodeEdge> Edges { get; }

        public FoldSpec Fold => _fold;

        public RingTopology(LevelModel level)
        {
            _ring = level.Ring;
            _fold = level.Fold;
            int n = _ring.Length;
            _ringPos = new int[n];
            for (int k = 0; k < n; k++) _ringPos[_ring[k]] = k;
            var edges = new List<NodeEdge>(n + level.InnerEdges.Length);
            for (int k = 0; k < n; k++) edges.Add(new NodeEdge(_ring[k], _ring[(k + 1) % n]));
            edges.AddRange(level.InnerEdges);
            Edges = edges;
        }

        public int RingIndexOf(int node) => _ringPos[node];
        public int RingNode(int k) => _ring[k];
        public int Next(int node) => _ring[(_ringPos[node] + 1) % _ring.Length];
        public int Prev(int node) => _ring[(_ringPos[node] + _ring.Length - 1) % _ring.Length];

        /// <summary>Cạnh vòng k có được vẽ và uốn không (ngoài đoạn cắt của màn gấp là mép gấp).</summary>
        public bool InFoldChain(int k)
        {
            if (_fold == null || _fold.Chains.Count == 0) return true;
            for (int i = 0; i < _fold.Chains.Count; i++)
                if (_fold.Chains[i].Contains(k)) return true;
            return false;
        }

        /// <summary>
        /// Cạnh a–b có phải cạnh vòng không; nếu có trả về chỉ số cạnh và chiều (1 nếu đi a→b theo chiều vòng, −1 nếu
        /// ngược). Cạnh trong trả về false.
        /// </summary>
        public bool TryGetRingEdge(int a, int b, out int edge, out int direction)
        {
            if (Next(a) == b)
            {
                edge = _ringPos[a];
                direction = 1;
                return true;
            }
            if (Prev(a) == b)
            {
                edge = _ringPos[b];
                direction = -1;
                return true;
            }
            edge = -1;
            direction = 0;
            return false;
        }
    }
}

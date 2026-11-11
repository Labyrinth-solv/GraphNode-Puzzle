using System;
using GraphNode.Core.Geometry;
using GraphNode.Core.Levels;
using GraphNode.Core.Pins;

namespace GraphNode.Core.Rules
{
    public enum HintKind
    {
        None,
        /// <summary>Chỉ node Index về vị trí lời giải của nó.</summary>
        Node,
        /// <summary>Chỉ cạnh vòng Index uốn về TargetBend.</summary>
        Edge
    }

    public readonly struct Hint
    {
        public readonly HintKind Kind;
        public readonly int Index;
        public readonly float TargetBend;

        public Hint(HintKind kind, int index, float targetBend = 0f)
        {
            Kind = kind;
            Index = index;
            TargetBend = targetBend;
        }
    }

    /// <summary>Chọn thứ được gợi ý khi người chơi dùng booster gợi ý. Không giữ số booster (số đó đi vào qua LevelRequest).</summary>
    public interface IHintProvider
    {
        Hint Pick(ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, float foldLine);
    }

    /// <summary>
    /// Mặc định của đặc tả (theo bản web chính): node không khóa xa vị trí lời giải nhất; nếu có dây đã có đích theo chốt
    /// mà lệch đích nhiều hơn (quy đổi ×2,2) và lệch quá 1,5% thì gợi ý dây đó.
    /// </summary>
    public sealed class FarthestHintProvider : IHintProvider
    {
        /// <summary>Quy đổi độ lệch độ uốn sang thang độ lệch vị trí để so với node.</summary>
        private const float EdgeWeight = 2.2f;
        private const float MinEdgeError = 0.015f;

        private readonly LevelModel _level;
        private readonly PinBoard _board;

        public FarthestHintProvider(LevelModel level, PinBoard board)
        {
            _level = level;
            _board = board;
        }

        public Hint Pick(ReadOnlySpan<Float2> pos, ReadOnlySpan<float> bends, float foldLine)
        {
            int bestNode = -1;
            float nodeErr = -1f;
            for (int i = 0; i < pos.Length; i++)
            {
                if (_level.Locked[i]) continue;
                float d = Float2.Distance(pos[i], _level.Solution[i]);
                if (d > nodeErr)
                {
                    nodeErr = d;
                    bestNode = i;
                }
            }
            int bestEdge = -1;
            float edgeErr = -1f, edgeTarget = 0f;
            for (int k = 0; k < bends.Length; k++)
            {
                if (!_board.TryGetEdgeTarget(k, pos, foldLine, out float h)) continue;
                float e = Math.Abs(bends[k] - h) * EdgeWeight;
                if (e > edgeErr)
                {
                    edgeErr = e;
                    bestEdge = k;
                    edgeTarget = h;
                }
            }
            if (bestEdge >= 0 && edgeErr > nodeErr && edgeErr > MinEdgeError) return new Hint(HintKind.Edge, bestEdge, edgeTarget);
            return bestNode >= 0 ? new Hint(HintKind.Node, bestNode) : new Hint(HintKind.None, -1);
        }
    }
}

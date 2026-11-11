using GraphNode.Core.Geometry;
using GraphNode.Core.Levels;
using GraphNode.Core.Pins;

namespace GraphNode.Core.Constraints
{
    /// <summary>
    /// Hút node đang kéo về chốt trống gần nhất trong bán kính hút; lực giảm tuyến tính từ tâm chốt ra mép vùng hút.
    /// Node mép gấp chỉ hút về chốt mép gấp; node thường không hút về chốt nằm bên kia kim. Chốt có node khác đã cắm thì
    /// bỏ qua. Kết quả lần áp gần nhất (đang trong vùng hút, chốt nào) để Gameplay phát tiếng, rung và đặt hẳn khi thả.
    /// </summary>
    public sealed class PinMagnet : INodeConstraint
    {
        private readonly LevelModel _level;
        private readonly PinBoard _board;
        private readonly bool[] _occupied;

        public bool InMagnet { get; private set; }
        public int MagnetPin { get; private set; } = -1;

        public PinMagnet(LevelModel level, PinBoard board)
        {
            _level = level;
            _board = board;
            _occupied = new bool[level.NodeCount];
        }

        public Float2 Apply(in NodeDragContext context, Float2 proposed)
        {
            var p = _board.Params;
            int n = _level.NodeCount;
            var sol = _level.Solution;
            for (int j = 0; j < n; j++) _occupied[j] = false;
            for (int k = 0; k < context.Positions.Length; k++)
            {
                if (k == context.Node) continue;
                for (int j = 0; j < n; j++)
                    if (Float2.Distance(context.Positions[k], sol[j]) <= p.OnRadius) _occupied[j] = true;
            }

            var fold = _level.Fold;
            bool nodeOnFold = _board.OnFold(context.Node);
            float bestD = float.MaxValue;
            int best = -1;
            for (int j = 0; j < n; j++)
            {
                if (_occupied[j]) continue;
                if (fold != null)
                {
                    if (nodeOnFold && !_board.OnFold(j)) continue;
                    float across = fold.Axis == FoldAxis.Y ? sol[j].Y : sol[j].X;
                    if (!nodeOnFold && across > context.FoldLine + 1e-6f) continue;
                }
                float d = Float2.Distance(proposed, sol[j]);
                if (d < bestD)
                {
                    bestD = d;
                    best = j;
                }
            }

            InMagnet = best >= 0 && bestD < p.MagnetRadius;
            MagnetPin = InMagnet ? best : -1;
            if (!InMagnet) return proposed;
            float w = p.MagnetPull * (1 - bestD / p.MagnetRadius);
            return Float2.Lerp(proposed, sol[best], w);
        }
    }
}

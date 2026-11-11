using System;
using GraphNode.Core.Pins;

namespace GraphNode.Core.Constraints
{
    /// <summary>
    /// Ràng buộc độ uốn khi kéo dây (đặc tả mục Uốn cạnh): kẹp ±Limit, hút về đích độ uốn trong bán kính (đích lấy từ
    /// <see cref="PinBoard.TryGetEdgeTarget"/>, chưa có đích thì không hút), bật về thẳng khi gần thẳng.
    /// </summary>
    public sealed class BendMagnet
    {
        private readonly BendParams _params;

        public BendMagnet(BendParams parameters) => _params = parameters;

        public BendParams Params => _params;

        public readonly struct Result
        {
            public readonly float Bend;
            public readonly bool InMagnet;
            public readonly bool SnappedStraight;

            public Result(float bend, bool inMagnet, bool snappedStraight)
            {
                Bend = bend;
                InMagnet = inMagnet;
                SnappedStraight = snappedStraight;
            }
        }

        /// <param name="rawBend">Độ uốn theo quãng kéo, chưa kẹp.</param>
        public Result Apply(float rawBend, bool hasTarget, float targetBend)
        {
            float h = Math.Max(-_params.Limit, Math.Min(_params.Limit, rawBend));
            bool inMagnet = false;
            if (hasTarget)
            {
                float dm = Math.Abs(h - targetBend);
                if (dm < _params.MagnetRadius)
                {
                    inMagnet = true;
                    h += (targetBend - h) * _params.MagnetPull * (1 - dm / _params.MagnetRadius);
                }
            }
            bool straight = false;
            if (!inMagnet && Math.Abs(h) < _params.SnapStraight) straight = true;
            else if (inMagnet && Math.Abs(targetBend) < 1e-4f && Math.Abs(h) < _params.SnapStraightAtStraightTarget) straight = true;
            if (straight) h = 0f;
            return new Result(h, inMagnet, straight);
        }
    }
}

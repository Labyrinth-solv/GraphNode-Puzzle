using GraphNode.Core.Pins;

namespace GraphNode.Core.Rules
{
    /// <summary>Trạng thái mà điều kiện thắng đọc lúc thả tay.</summary>
    public readonly struct WinContext
    {
        /// <summary>Độ khớp đã trừ phạt độ uốn.</summary>
        public readonly float Score;
        public readonly float Threshold;
        public readonly PinBoard Pins;

        public WinContext(float score, float threshold, PinBoard pins)
        {
            Score = score;
            Threshold = threshold;
            Pins = pins;
        }
    }

    /// <summary>
    /// Một điều kiện thắng, xét lúc thả tay (đang kéo thì không xét). Thắng khi mọi điều kiện đều đạt. Cơ chế mới (vùng cấm…)
    /// là một lớp mới.
    /// </summary>
    public interface IWinCondition
    {
        bool IsMet(in WinContext context);
    }

    /// <summary>Độ khớp (đã trừ phạt độ uốn) đạt ngưỡng của level.</summary>
    public sealed class ScoreThresholdCondition : IWinCondition
    {
        public bool IsMet(in WinContext c) => c.Score >= c.Threshold;
    }

    /// <summary>Mọi chốt đã có node (đặc tả: đủ chốt mới thắng).</summary>
    public sealed class AllPinsFilledCondition : IWinCondition
    {
        public bool IsMet(in WinContext c) => c.Pins.AllFilled;
    }
}

using GraphNode.Core.Runner;

namespace GraphNode.Data.Configs
{
    /// <summary>Thông số chuỗi thắng (đặc tả mục Chuỗi hoàn thành; số tạm của bản web chính).</summary>
    public readonly struct WinSequenceParams
    {
        public readonly float SnapSpeed, SnapMinSeconds, SnapMaxSeconds, SnapHoldSeconds;
        public readonly float CutNodeAlpha, CutNodeSize;
        public readonly float FastForward;
        public readonly float AfterCutSeconds;
        public readonly CutTimingParams Cut;
        public readonly float LiftSeconds, FillSeconds, FlySeconds;

        public WinSequenceParams(float snapSpeed, float snapMinSeconds, float snapMaxSeconds, float snapHoldSeconds,
            float cutNodeAlpha, float cutNodeSize, float fastForward, float afterCutSeconds, CutTimingParams cut,
            float liftSeconds, float fillSeconds, float flySeconds)
        {
            LiftSeconds = liftSeconds;
            FillSeconds = fillSeconds;
            FlySeconds = flySeconds;
            SnapSpeed = snapSpeed;
            SnapMinSeconds = snapMinSeconds;
            SnapMaxSeconds = snapMaxSeconds;
            SnapHoldSeconds = snapHoldSeconds;
            CutNodeAlpha = cutNodeAlpha;
            CutNodeSize = cutNodeSize;
            FastForward = fastForward;
            AfterCutSeconds = afterCutSeconds;
            Cut = cut;
        }
    }
}

using GraphNode.Core.Pins;
using GraphNode.Core.Scoring;

namespace GraphNode.Core.Session
{
    /// <summary>Thông số kim của màn gấp (số tạm của bản web chính, theo bề rộng vải).</summary>
    public readonly struct NeedleParams
    {
        /// <summary>Kim đi được trong [Min, Max], thu hẹp thêm theo vị trí node để bản soi gương còn trong khung.</summary>
        public readonly float Min, Max;
        public readonly float MagnetRadius;
        public readonly float MagnetPull;

        public NeedleParams(float min, float max, float magnetRadius, float magnetPull)
        {
            Min = min;
            Max = max;
            MagnetRadius = magnetRadius;
            MagnetPull = magnetPull;
        }

        public static readonly NeedleParams WebDemo = new NeedleParams(0.25f, 0.5f, 0.025f, 0.6f);
    }

    /// <summary>
    /// Mọi thông số cân bằng mà phiên chơi cần, gom một chỗ. Data dựng từ ScriptableObject cấu hình; <see cref="WebDemo"/>
    /// là số của bản web chính để test.
    /// </summary>
    public sealed class PuzzleConfig
    {
        public BendPenaltyParams Penalty { get; set; } = BendPenaltyParams.WebDemo;
        public PinParams Pins { get; set; } = PinParams.WebDemo;
        public BendParams Bend { get; set; } = BendParams.WebDemo;
        public NeedleParams Needle { get; set; } = NeedleParams.WebDemo;
        /// <summary>Node cách mép khung vải ít nhất ngần này.</summary>
        public float FabricMargin { get; set; } = 0.04f;
        /// <summary>Bản soi gương của node phải nằm trong khung vải: node thường không xa kim quá (Edge − kim).</summary>
        public float FabricEdge { get; set; } = 0.98f;
        /// <summary>Dây bắt đầu kéo đã lệch đích từ ngần này thì lần thả vào đích tính là khớp viền (hiệu ứng snap).</summary>
        public float EdgeWasOff { get; set; } = 0.012f;

        public static PuzzleConfig WebDemo => new PuzzleConfig();
    }
}

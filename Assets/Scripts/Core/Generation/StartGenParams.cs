using GraphNode.Core.Levels;

namespace GraphNode.Core.Generation
{
    /// <summary>
    /// Tham số sinh vị trí đầu của một mức độ khó (đặc tả mục Độ khó). Giá trị thật nằm trong DifficultyTierConfig ở Data;
    /// <see cref="WebDemo"/> là số của bản web chính, số tạm. Đơn vị là bề rộng khung vải.
    /// </summary>
    public readonly struct TierParams
    {
        public readonly int MaxFreeNodes;
        public readonly int MaxBendEdges;
        /// <summary>Khoảng lệch của node kéo được so với lời giải.</summary>
        public readonly float DistMin, DistMax;
        /// <summary>Khoảng độ khớp ban đầu nhắm tới (đã trừ phạt độ uốn).</summary>
        public readonly float ScoreMin, ScoreMax;
        /// <summary>Độ lệch kim lúc đầu ở màn gấp.</summary>
        public readonly float NeedleMin, NeedleMax;

        public TierParams(int maxFreeNodes, int maxBendEdges, float distMin, float distMax, float scoreMin, float scoreMax, float needleMin, float needleMax)
        {
            MaxFreeNodes = maxFreeNodes;
            MaxBendEdges = maxBendEdges;
            DistMin = distMin;
            DistMax = distMax;
            ScoreMin = scoreMin;
            ScoreMax = scoreMax;
            NeedleMin = needleMin;
            NeedleMax = needleMax;
        }

        public static TierParams WebDemo(Difficulty d) => d switch
        {
            Difficulty.Easy => new TierParams(3, 1, 0.06f, 0.12f, 0.55f, 0.85f, 0.05f, 0.08f),
            Difficulty.Medium => new TierParams(6, 2, 0.12f, 0.22f, 0.40f, 0.70f, 0.08f, 0.14f),
            _ => new TierParams(9, 2, 0.20f, 0.35f, 0.25f, 0.50f, 0.12f, 0.20f)
        };
    }

    /// <summary>Tham số chung của trình sinh, không theo mức độ khó (số tạm của bản web chính).</summary>
    public readonly struct StartGenParams
    {
        /// <summary>Khoảng cách tối thiểu giữa một node kéo được và node khác lúc đầu màn.</summary>
        public readonly float MinGap;
        /// <summary>Node kéo được không bắt đầu trong vùng hút của chốt nào.</summary>
        public readonly float PinClear;
        /// <summary>Khoảng cách tới mép khung vải.</summary>
        public readonly float FabricMargin;
        /// <summary>Kim của màn gấp không lùi quá vị trí này.</summary>
        public readonly float NeedleFloor;
        /// <summary>Độ khớp ban đầu tối đa phải dưới ngưỡng thắng ít nhất ngần này.</summary>
        public readonly float BelowThreshold;
        /// <summary>Cạnh cong có |h lời giải| dưới mức này không được chọn làm cạnh phải tự uốn.</summary>
        public readonly float MinBendForBendFree;
        public readonly int MaxTries;

        public StartGenParams(float minGap, float pinClear, float fabricMargin, float needleFloor, float belowThreshold, float minBendForBendFree, int maxTries)
        {
            MinGap = minGap;
            PinClear = pinClear;
            FabricMargin = fabricMargin;
            NeedleFloor = needleFloor;
            BelowThreshold = belowThreshold;
            MinBendForBendFree = minBendForBendFree;
            MaxTries = maxTries;
        }

        public static readonly StartGenParams WebDemo = new StartGenParams(0.12f, 0.06f, 0.06f, 0.25f, 0.08f, 0.014f, 200);
    }
}

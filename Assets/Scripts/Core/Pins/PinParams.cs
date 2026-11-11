namespace GraphNode.Core.Pins
{
    /// <summary>
    /// Thông số chốt và nam châm (đặc tả mục Chốt trên viền mẫu và Uốn cạnh; số của bản web chính, là số tạm). Đơn vị
    /// là bề rộng khung vải. Giá trị thật đọc từ cấu hình cân bằng ở Data.
    /// </summary>
    public readonly struct PinParams
    {
        /// <summary>Một bán kính duy nhất để coi node là đã cắm vào chốt (bộ đếm, điều kiện thắng, đích độ uốn).</summary>
        public readonly float OnRadius;
        /// <summary>Bán kính hút node đang kéo về chốt trống.</summary>
        public readonly float MagnetRadius;
        /// <summary>Lực hút tối đa (phần quãng tới chốt) khi node ở sát chốt; giảm tuyến tính về 0 ở mép vùng hút.</summary>
        public readonly float MagnetPull;
        /// <summary>Node mép gấp chỉ tính là đã cắm khi kim lệch trục lời giải không quá ngần này.</summary>
        public readonly float FoldLineTolerance;

        public PinParams(float onRadius, float magnetRadius, float magnetPull, float foldLineTolerance)
        {
            OnRadius = onRadius;
            MagnetRadius = magnetRadius;
            MagnetPull = magnetPull;
            FoldLineTolerance = foldLineTolerance;
        }

        public static readonly PinParams WebDemo = new PinParams(0.046f, 0.048f, 0.5f, 0.025f);
    }

    /// <summary>Thông số hút độ uốn khi kéo dây (đặc tả mục Uốn cạnh; số tạm của bản web chính).</summary>
    public readonly struct BendParams
    {
        /// <summary>Độ uốn bị kẹp trong ±Limit.</summary>
        public readonly float Limit;
        /// <summary>Bán kính hút về đích độ uốn.</summary>
        public readonly float MagnetRadius;
        public readonly float MagnetPull;
        /// <summary>Không có đích (hoặc ngoài vùng hút): gần thẳng hơn ngần này thì bật về thẳng.</summary>
        public readonly float SnapStraight;
        /// <summary>Đích là cạnh thẳng: trong vùng hút và gần thẳng hơn ngần này thì bật về thẳng.</summary>
        public readonly float SnapStraightAtStraightTarget;

        public BendParams(float limit, float magnetRadius, float magnetPull, float snapStraight, float snapStraightAtStraightTarget)
        {
            Limit = limit;
            MagnetRadius = magnetRadius;
            MagnetPull = magnetPull;
            SnapStraight = snapStraight;
            SnapStraightAtStraightTarget = snapStraightAtStraightTarget;
        }

        public static readonly BendParams WebDemo = new BendParams(0.18f, 0.035f, 0.5f, 0.018f, 0.022f);
    }
}

using GraphNode.Core.Pins;
using GraphNode.Core.Runner;
using GraphNode.Core.Scoring;
using GraphNode.Core.Session;
using UnityEngine;

namespace GraphNode.Data.Configs
{
    /// <summary>
    /// Thông số cân bằng của phần chơi, theo bề rộng khung vải (đặc tả mục Cấu hình cân bằng). Giá trị mặc định là số của
    /// bản web chính, số tạm, chỉnh lại sau khi thử trên máy thật. Lõi nhận số qua <see cref="ToPuzzleConfig"/>.
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/Config/Gameplay Balance", fileName = "GameplayBalanceConfig")]
    public sealed class GameplayBalanceConfig : ScriptableObject
    {
        [Header("Phạt độ uốn")]
        [Tooltip("Phạt tối đa trừ vào độ khớp khi mọi cạnh phải uốn đều sai hết")]
        [SerializeField] private float bendPenaltyWeight = 0.18f;
        [SerializeField] private float bendPenaltyMinSpan = 0.04f;
        [SerializeField] private float bendPenaltyErrorCap = 1.2f;
        [SerializeField] private float bendPenaltyAutoFreeThreshold = 0.015f;

        [Header("Chốt")]
        [Tooltip("Bán kính coi node là đã cắm vào chốt")]
        [SerializeField] private float pinOnRadius = 0.046f;
        [SerializeField] private float pinMagnetRadius = 0.048f;
        [SerializeField, Range(0f, 1f)] private float pinMagnetPull = 0.5f;
        [SerializeField] private float pinFoldLineTolerance = 0.025f;

        [Header("Uốn dây")]
        [SerializeField] private float bendLimit = 0.35f;
        [SerializeField] private float bendMagnetRadius = 0.035f;
        [SerializeField, Range(0f, 1f)] private float bendMagnetPull = 0.5f;
        [SerializeField] private float bendSnapStraight = 0.018f;
        [SerializeField] private float bendSnapStraightAtStraightTarget = 0.022f;
        [Tooltip("Dây bắt đầu kéo đã lệch đích từ mức này thì thả vào đích tính là khớp viền")]
        [SerializeField] private float edgeWasOff = 0.012f;

        [Header("Kim màn gấp")]
        [SerializeField] private float needleMin = 0.25f;
        [SerializeField] private float needleMax = 0.5f;
        [SerializeField] private float needleMagnetRadius = 0.025f;
        [SerializeField, Range(0f, 1f)] private float needleMagnetPull = 0.6f;

        [Header("Khung vải")]
        [SerializeField] private float fabricMargin = 0.04f;
        [SerializeField] private float fabricEdge = 0.98f;

        [Header("Điểm sáng và cảnh cắt")]
        [Tooltip("Bề rộng vải mỗi giây")]
        [SerializeField] private float runnerSpeed = 0.68f;
        [SerializeField] private float cutTargetSeconds = 1.5f;
        [SerializeField] private float cutMinMultiplier = 1.6f;
        [SerializeField] private float cutMaxMultiplier = 2.5f;

        [Header("Chuỗi thắng")]
        [Tooltip("Snap: mọi node đi cùng tốc độ này (bề rộng vải mỗi giây), xa quá thì cả nhóm nhanh lên")]
        [SerializeField] private float snapSpeed = 0.4f;
        [SerializeField] private float snapMinSeconds = 0.2f;
        [SerializeField] private float snapMaxSeconds = 0.5f;
        [Tooltip("Snap kéo dài ít nhất ngần này để thấy chớp sáng thắng")]
        [SerializeField] private float snapHoldSeconds = 0.48f;
        [Tooltip("Node mờ còn bao nhiêu và thu nhỏ còn bao nhiêu khi vào cảnh cắt")]
        [SerializeField, Range(0f, 1f)] private float cutNodeAlpha = 0.35f;
        [SerializeField, Range(0f, 1f)] private float cutNodeSize = 0.75f;
        [Tooltip("Chạm trong chuỗi thắng thì tua nhanh cố định lần này")]
        [SerializeField] private float fastForward = 1.5f;
        [Tooltip("Dừng sau cảnh cắt trước khi nhấc mảnh")]
        [SerializeField] private float afterCutSeconds = 0.2f;
        [SerializeField] private float liftSeconds = 0.45f;
        [SerializeField] private float fillSeconds = 0.75f;
        [SerializeField] private float flySeconds = 0.65f;

        public float RunnerSpeed => runnerSpeed;

        public WinSequenceParams WinSequence => new WinSequenceParams(snapSpeed, snapMinSeconds, snapMaxSeconds, snapHoldSeconds,
            cutNodeAlpha, cutNodeSize, fastForward, afterCutSeconds, CutTiming, liftSeconds, fillSeconds, flySeconds);

        public CutTimingParams CutTiming => new CutTimingParams(runnerSpeed, cutTargetSeconds, cutMinMultiplier, cutMaxMultiplier);

        public PuzzleConfig ToPuzzleConfig() => new PuzzleConfig
        {
            Penalty = new BendPenaltyParams(bendPenaltyWeight, bendPenaltyMinSpan, bendPenaltyErrorCap, bendPenaltyAutoFreeThreshold),
            Pins = new PinParams(pinOnRadius, pinMagnetRadius, pinMagnetPull, pinFoldLineTolerance),
            Bend = new BendParams(bendLimit, bendMagnetRadius, bendMagnetPull, bendSnapStraight, bendSnapStraightAtStraightTarget),
            Needle = new NeedleParams(needleMin, needleMax, needleMagnetRadius, needleMagnetPull),
            FabricMargin = fabricMargin,
            FabricEdge = fabricEdge,
            EdgeWasOff = edgeWasOff
        };
    }
}

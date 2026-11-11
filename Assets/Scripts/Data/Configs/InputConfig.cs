using GraphNode.Core.Input;
using UnityEngine;

namespace GraphNode.Data.Configs
{
    /// <summary>
    /// Thông số chạm (đặc tả mục Bộ lọc chạm 3 lớp và Nâng node). Số đo bằng pt quy đổi sang bề rộng vải lúc chạy theo cỡ
    /// khung vải trên màn hình; số theo bề rộng vải giữ nguyên. Giá trị mặc định là số tạm của bản web chính (khung 362 pt).
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/Config/Input", fileName = "InputConfig")]
    public sealed class InputConfig : ScriptableObject
    {
        [Header("Theo bề rộng vải")]
        [SerializeField] private float pickMin = 0.088f;
        [SerializeField] private float pickMax = 0.22f;
        [SerializeField] private float edgeSearch = 0.088f;
        [SerializeField, Range(0f, 0.5f)] private float edgeMidStart = 0.25f;
        [SerializeField, Range(0.5f, 1f)] private float edgeMidEnd = 0.75f;

        [Header("Theo pt")]
        [Tooltip("Chạm cách tâm node kéo được dưới mức này thì luôn chọn node")]
        [SerializeField] private float nodePriorityPt = 25f;
        [Tooltip("Chạm khoảng trống cách đầu dây dưới mức này thì không bắt dây")]
        [SerializeField] private float endpointBubblePt = 31f;
        [Tooltip("Vùng chạm cây kim; không nhỏ hơn 44 pt bề ngang (một nửa mỗi bên)")]
        [SerializeField] private float needleHitPt = 23.5f;
        [Tooltip("Node nâng lên trên ngón tay tới mức này (chỉ cảm ứng)")]
        [SerializeField] private float liftPt = 22f;
        [Tooltip("Độ nâng đạt đủ sau quãng trượt này")]
        [SerializeField] private float liftRampPt = 14f;
        [Tooltip("Trượt quá mức này mới tính là có kéo (dưới mức là chạm rồi nhấc)")]
        [SerializeField] private float moveThresholdPt = 8f;

        public float LiftPt => liftPt;
        public float LiftRampPt => liftRampPt;
        public float MoveThresholdPt => moveThresholdPt;

        /// <param name="fabricWidthPt">Bề rộng khung vải trên màn hình, đo bằng pt.</param>
        public TouchParams ToTouchParams(float fabricWidthPt)
        {
            float k = 1f / Mathf.Max(1f, fabricWidthPt);
            return new TouchParams(pickMin, pickMax, edgeSearch, edgeMidStart, edgeMidEnd, nodePriorityPt * k, endpointBubblePt * k, needleHitPt * k);
        }
    }
}

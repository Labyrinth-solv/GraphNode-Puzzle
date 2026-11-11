using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>Cây kéo chạy viền (prefab Scissors): gốc đặt ở đinh tán, hai nửa lưỡi xoay quanh đinh tán để mở khép.</summary>
    public sealed class ScissorsRig : MonoBehaviour
    {
        [SerializeField] private Transform bladeUp;
        [SerializeField] private Transform bladeDown;
        [Tooltip("Cỡ thiết kế của cây kéo (pt), dùng để phóng khi cần cỡ khác (cảnh cắt 20 pt)")]
        [SerializeField] private float designSize = 17f;

        public float DesignSize => designSize;

        /// <summary>Đặt độ mở theo góc (độ) cho hai nửa lưỡi.</summary>
        public void SetOpen(float degrees)
        {
            bladeDown.localRotation = Quaternion.Euler(0f, 0f, degrees);
            bladeUp.localRotation = Quaternion.Euler(0f, 0f, -degrees);
        }
    }
}

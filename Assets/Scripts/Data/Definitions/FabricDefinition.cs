using UnityEngine;

namespace GraphNode.Data.Definitions
{
    /// <summary>
    /// Vải của một mảnh (đặc tả mục Mảnh vải, phong cách tranh tô màu đã chốt 2026-11-11): ba tông chuyển sắc tròn (sáng
    /// trên trái, nền, tối dưới phải) và màu viền mực. Level trỏ tới bằng fabricId. Chi tiết vật thật (ô bánh quế, gân
    /// len) thêm sau dưới dạng texture xám lặp tùy chọn.
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/Fabric", fileName = "Fabric")]
    public sealed class FabricDefinition : ScriptableObject
    {
        [SerializeField] private string id;
        [SerializeField] private Color baseColor = Color.white;
        [SerializeField] private Color light = Color.white;
        [SerializeField] private Color dark = Color.gray;
        [SerializeField] private Color line = new Color32(0x2A, 0x23, 0x26, 0xFF);

        public string Id => id;
        public Color Base => baseColor;
        public Color Light => light;
        public Color Dark => dark;
        public Color Line => line;
    }
}

using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Miếng vải vừa cắt (prefab Piece): bốn lớp mesh dựng sẵn renderer, material và thứ tự vẽ trong Editor (bóng, nền kem,
    /// lớp màu, viền mực). PieceView đổ hình của level vào các MeshFilter này.
    /// </summary>
    public sealed class PieceRig : MonoBehaviour
    {
        [SerializeField] private MeshFilter shadow;
        [SerializeField] private MeshFilter cream;
        [SerializeField] private MeshFilter color;
        [SerializeField] private MeshFilter outline;

        public MeshFilter Shadow => shadow;
        public MeshFilter Cream => cream;
        public MeshFilter Color => color;
        public MeshFilter Outline => outline;
    }
}

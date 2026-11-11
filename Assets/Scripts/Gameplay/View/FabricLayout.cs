using GraphNode.Core.Geometry;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Bố cục màn chơi của bản thử M2 theo bản web chính: khung dọc 390×844 pt, tấm vải vuông 362 pt đặt ở (14, 256).
    /// Trong scene 1 unit = 1 pt, gốc ở tâm khung, trục y hướng lên; toạ độ vải (0–1, y hướng xuống như dữ liệu level)
    /// đổi ở đây, lõi không biết gì về Unity.
    /// </summary>
    public static class FabricLayout
    {
        public const float ScreenWidth = 390f;
        public const float ScreenHeight = 844f;
        public const float FabricX = 14f;
        public const float FabricY = 256f;
        public const float FabricSize = 362f;

        /// <summary>Điểm theo pt của bố cục (gốc trên trái, y xuống) sang toạ độ scene.</summary>
        public static Vector3 LayoutToWorld(float x, float y) => new Vector3(x - ScreenWidth / 2f, ScreenHeight / 2f - y, 0f);

        public static Vector3 FabricToWorld(Float2 p) => LayoutToWorld(FabricX + p.X * FabricSize, FabricY + p.Y * FabricSize);

        public static Float2 WorldToFabric(Vector3 w) =>
            new Float2((w.x + ScreenWidth / 2f - FabricX) / FabricSize, (ScreenHeight / 2f - w.y - FabricY) / FabricSize);
    }
}

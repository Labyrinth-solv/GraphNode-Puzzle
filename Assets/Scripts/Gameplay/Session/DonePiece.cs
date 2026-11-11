using GraphNode.Core.Levels;
using UnityEngine;

namespace GraphNode.Gameplay.Session
{
    /// <summary>Một mảnh cùng sản phẩm đã xong: dữ liệu level để dựng lại hình, ô của nó và màu vải.</summary>
    public readonly struct DonePiece
    {
        public readonly LevelModel Level;
        public readonly int Slot;
        public readonly Color Fill, Line;

        public DonePiece(LevelModel level, int slot, Color fill, Color line)
        {
            Level = level;
            Slot = slot;
            Fill = fill;
            Line = line;
        }
    }
}

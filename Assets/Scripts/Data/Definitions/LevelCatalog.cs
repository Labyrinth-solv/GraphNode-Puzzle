using System;
using System.Collections.Generic;
using GraphNode.Core.Levels;
using GraphNode.Data.Serialization;
using UnityEngine;

namespace GraphNode.Data.Definitions
{
    /// <summary>
    /// Danh sách level đưa vào bản build mà không dùng Resources (tài liệu kiến trúc mục 5.7): mỗi mục giữ id và tham chiếu
    /// TextAsset tới file JSON gốc. Lớp nối của App giữ tham chiếu tới catalog nên Unity đưa file vào build theo chuỗi
    /// tham chiếu. Công cụ Editor sinh lại danh sách từ Content/Levels (làm ở M4 cùng Level Editor).
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/Level Catalog", fileName = "LevelCatalog")]
    public sealed class LevelCatalog : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string id;
            public TextAsset json;
            [Tooltip("Sinh lại từ file level: chương, sản phẩm, ô trong sản phẩm (để sắp thứ tự chơi mà không đọc JSON)")]
            public string chapterId;
            public string productId;
            public int slotIndex;
        }

        [SerializeField] private List<Entry> levels = new List<Entry>();

        public IReadOnlyList<Entry> Levels => levels;

        public bool TryLoad(string levelId, out LevelModel level) => TryLoad(levelId, out level, out _);

        public bool TryGetEntry(string levelId, out Entry entry)
        {
            entry = levels.Find(e => e != null && e.id == levelId);
            return entry != null;
        }

        /// <summary>Số mảnh của một sản phẩm (số ô trong hàng Bộ vải ghép).</summary>
        public int PieceCount(string productId)
        {
            int count = 0;
            for (int i = 0; i < levels.Count; i++)
                if (levels[i] != null && levels[i].productId == productId) count++;
            return count;
        }

        /// <summary>Mảnh chơi sau mảnh này theo thứ tự catalog (hết danh sách thì quay về đầu), hoặc null.</summary>
        public string NextLevelId(string levelId)
        {
            if (levels.Count == 0) return null;
            for (int i = 0; i < levels.Count; i++)
                if (levels[i] != null && levels[i].id == levelId) return levels[(i + 1) % levels.Count].id;
            return levels[0].id;
        }

        /// <param name="info">Phần dữ liệu ngoài luật chơi của level (vải, sản phẩm, ô trong sản phẩm).</param>
        public bool TryLoad(string levelId, out LevelModel level, out LevelInfo info)
        {
            for (int i = 0; i < levels.Count; i++)
            {
                var e = levels[i];
                if (e == null || e.id != levelId || e.json == null) continue;
                var dto = Newtonsoft.Json.JsonConvert.DeserializeObject<LevelDto>(e.json.text);
                level = LevelJson.ToModel(dto);
                info = new LevelInfo(dto.FabricId, dto.ProductId, dto.SlotIndex);
                return true;
            }
            level = null;
            info = default;
            return false;
        }
    }

    /// <summary>Dữ liệu của level mà lõi không cần: vải, sản phẩm và vị trí mảnh trong sản phẩm.</summary>
    public readonly struct LevelInfo
    {
        public readonly string FabricId;
        public readonly string ProductId;
        public readonly int SlotIndex;

        public LevelInfo(string fabricId, string productId, int slotIndex)
        {
            FabricId = fabricId;
            ProductId = productId;
            SlotIndex = slotIndex;
        }
    }
}

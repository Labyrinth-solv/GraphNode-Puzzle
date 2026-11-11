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
        }

        [SerializeField] private List<Entry> levels = new List<Entry>();

        public IReadOnlyList<Entry> Levels => levels;

        public bool TryLoad(string levelId, out LevelModel level) => TryLoad(levelId, out level, out _);

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

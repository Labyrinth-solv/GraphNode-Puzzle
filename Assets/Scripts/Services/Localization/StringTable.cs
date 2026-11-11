using System;
using System.Collections.Generic;
using GraphNode.Foundation.Services;
using UnityEngine;

namespace GraphNode.Services.Localization
{
    /// <summary>
    /// Bảng chuỗi hiển thị theo khóa (bản đầu chỉ tiếng Việt). Mọi chữ trên màn hình đi qua đây, không ghi cứng trong code
    /// hay vẽ chết vào ảnh, để thêm ngôn ngữ sau chỉ là thêm bảng.
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/String Table", fileName = "Strings_vi")]
    public sealed class StringTable : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string key;
            [TextArea] public string value;
        }

        [SerializeField] private List<Entry> entries = new List<Entry>();

        public IReadOnlyList<Entry> Entries => entries;
    }

    /// <summary>ILocalizer đọc từ StringTable; khóa thiếu thì trả lại chính khóa để dễ thấy chỗ chưa dịch.</summary>
    public sealed class TableLocalizer : ILocalizer
    {
        private readonly Dictionary<string, string> _map = new Dictionary<string, string>();

        public TableLocalizer(StringTable table)
        {
            if (table == null) return;
            foreach (var e in table.Entries)
                if (e != null && !string.IsNullOrEmpty(e.key)) _map[e.key] = e.value;
        }

        public string Get(string key) => key != null && _map.TryGetValue(key, out var v) ? v : key;
    }
}

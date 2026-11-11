using System;
using System.Collections.Generic;

namespace GraphNode.Foundation.Contracts
{
    /// <summary>
    /// Yêu cầu vào màn, Meta (hoặc công cụ thử) tạo ra. Gameplay chỉ đọc, không biết booster đến từ đâu.
    /// </summary>
    public sealed class LevelRequest
    {
        public string LevelId { get; }

        /// <summary>Vải người chơi tự chọn, đè lên vải mặc định của level; null là dùng vải của level.</summary>
        public string FabricId { get; }

        /// <summary>Số booster người chơi đang có theo loại (bản đầu: "hint").</summary>
        public IReadOnlyDictionary<string, int> Boosters { get; }

        public IReadOnlyList<string> Modifiers { get; }

        public LevelRequest(string levelId, string fabricId = null,
            IReadOnlyDictionary<string, int> boosters = null, IReadOnlyList<string> modifiers = null)
        {
            if (string.IsNullOrEmpty(levelId)) throw new ArgumentException("levelId is required", nameof(levelId));
            LevelId = levelId;
            FabricId = fabricId;
            Boosters = boosters ?? EmptyBoosters;
            Modifiers = modifiers ?? Array.Empty<string>();
        }

        private static readonly IReadOnlyDictionary<string, int> EmptyBoosters = new Dictionary<string, int>();
    }
}

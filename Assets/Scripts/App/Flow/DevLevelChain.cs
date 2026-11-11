using System.Collections.Generic;
using GraphNode.Data.Definitions;
using GraphNode.Foundation.Contracts;

namespace GraphNode.App.Flow
{
    /// <summary>
    /// Chọn mảnh chơi tiếp khi chưa có Meta: đi lần lượt theo thứ tự catalog. Mảnh kế cùng sản phẩm thì mang theo danh
    /// sách mảnh đã xong (thêm mảnh vừa thắng) để hàng Bộ vải ghép vẽ lại; sang sản phẩm khác thì danh sách trống.
    /// Meta sẽ thay lớp này bằng tiến trình lưu thật.
    /// </summary>
    public static class DevLevelChain
    {
        public static LevelRequest Next(LevelCatalog catalog, LevelRequest won)
        {
            string next = catalog != null ? catalog.NextLevelId(won.LevelId) : null;
            if (next == null) return won;
            bool sameProduct = catalog.TryGetEntry(won.LevelId, out var cur) && catalog.TryGetEntry(next, out var nxt)
                && !string.IsNullOrEmpty(cur.productId) && cur.productId == nxt.productId;
            List<string> done = null;
            if (sameProduct)
            {
                done = new List<string>(won.DonePieces) { won.LevelId };
            }
            return new LevelRequest(next, won.FabricId, won.Boosters, won.Modifiers, done);
        }
    }
}

using GraphNode.Data.Definitions;
using NUnit.Framework;
using UnityEditor;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Catalog của game sau khi nhập bản web 2 đã duyệt: 6 sản phẩm, 17 mảnh theo thứ tự chơi, mảnh nào cũng đọc được và có
    /// vải trong FabricCatalog; mảnh kế đi hết sản phẩm rồi sang sản phẩm sau, hết danh sách thì quay về đầu.
    /// </summary>
    public sealed class LevelCatalogTests
    {
        private static LevelCatalog Catalog => AssetDatabase.LoadAssetAtPath<LevelCatalog>("Assets/Content/Levels/LevelCatalog.asset");
        private static FabricCatalog Fabrics => AssetDatabase.LoadAssetAtPath<FabricCatalog>("Assets/Content/Fabrics/FabricCatalog.asset");

        [Test]
        public void Catalog_HasTheApprovedSet_InPlayOrder()
        {
            var c = Catalog;
            Assert.AreEqual(17, c.Levels.Count);
            Assert.AreEqual("scoop", c.Levels[0].id);
            Assert.AreEqual("sunflower_center", c.Levels[16].id);
            Assert.AreEqual(2, c.PieceCount("icecream"));
            foreach (var p in new[] { "cupcake", "duck", "mushroom", "acorn", "sunflower" }) Assert.AreEqual(3, c.PieceCount(p), p);
        }

        [Test]
        public void NextLevel_WalksPiecesThenProducts_AndWraps()
        {
            var c = Catalog;
            Assert.AreEqual("cone", c.NextLevelId("scoop"));
            Assert.AreEqual("cupcake_base", c.NextLevelId("cone"));
            Assert.AreEqual("scoop", c.NextLevelId("sunflower_center"));
            Assert.AreEqual("scoop", c.NextLevelId("unknown"), "unknown id restarts from the first level");
        }

        [Test]
        public void EveryLevel_LoadsAndHasAFabric()
        {
            var c = Catalog;
            var f = Fabrics;
            foreach (var e in c.Levels)
            {
                Assert.IsTrue(c.TryLoad(e.id, out var level, out var info), e.id);
                Assert.AreEqual(e.productId, info.ProductId);
                Assert.AreEqual(e.slotIndex, info.SlotIndex);
                Assert.Greater(level.NodeCount, 2);
                Assert.IsTrue(f.TryGet(info.FabricId, out _), $"fabric for {e.id}");
            }
        }
    }
}

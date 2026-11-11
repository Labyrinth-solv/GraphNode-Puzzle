using System.Collections;
using Cysharp.Threading.Tasks;
using GraphNode.App.Flow;
using GraphNode.App.Scopes;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Services;
using GraphNode.UI.Common;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>
    /// Tiến độ một sản phẩm khi chưa có Meta: thắng mảnh nào thì mảnh kế cùng sản phẩm mang theo các mảnh đã xong, sang
    /// sản phẩm khác thì làm lại từ đầu; màn chơi vẽ các mảnh đã xong vào đúng ô của hàng Bộ vải ghép.
    /// </summary>
    public sealed class ProductProgressTests
    {
        private static GameplayScope Scope => Object.FindObjectOfType<GameplayScope>();

        [UnityTest]
        public IEnumerator Chain_CarriesDonePieces_WithinAProduct_AndResetsOnTheNext() => UniTask.ToCoroutine(async () =>
        {
            HomeScope.SuppressDevAutoStart = true;
            await SceneManager.LoadSceneAsync(SceneIds.Gameplay);
            await UniTask.Yield();
            var catalog = Scope.Catalog;

            var afterBase = DevLevelChain.Next(catalog, new LevelRequest("cupcake_base"));
            Assert.AreEqual("cupcake_frosting", afterBase.LevelId);
            CollectionAssert.AreEqual(new[] { "cupcake_base" }, afterBase.DonePieces);
            var afterFrosting = DevLevelChain.Next(catalog, afterBase);
            Assert.AreEqual("cupcake_heart", afterFrosting.LevelId);
            CollectionAssert.AreEqual(new[] { "cupcake_base", "cupcake_frosting" }, afterFrosting.DonePieces);
            var afterHeart = DevLevelChain.Next(catalog, afterFrosting);
            Assert.AreEqual("duck_body", afterHeart.LevelId);
            Assert.AreEqual(0, afterHeart.DonePieces.Count, "a new product starts with empty slots");
        });

        [UnityTest]
        public IEnumerator DonePieces_AreDrawnInTheirSlots() => UniTask.ToCoroutine(async () =>
        {
            HomeScope.SuppressDevAutoStart = true;
            await SceneManager.LoadSceneAsync(SceneIds.Gameplay);
            await UniTask.Yield();
            var app = AppScope.Current;
            await app.Flow.StartLevelAsync(new LevelRequest("cupcake_heart", donePieces: new[] { "cupcake_base", "cupcake_frosting" }), app.LifetimeToken);
            for (int i = 0; i < 3; i++) await UniTask.Yield();

            var row = GameObject.Find("SlotRow").transform;
            Assert.AreEqual(3, row.childCount);
            for (int s = 0; s < 3; s++)
            {
                int pieces = row.GetChild(s).GetComponentsInChildren<UIShapeGraphic>().Length;
                Assert.AreEqual(s < 2 ? 1 : 0, pieces, $"slot {s}");
            }
        });

        [UnityTearDown]
        public IEnumerator TearDown() => PlayModeCleanup.Run();
    }
}

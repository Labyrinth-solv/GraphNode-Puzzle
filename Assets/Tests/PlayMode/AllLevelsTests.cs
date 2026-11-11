using System;
using System.Collections;
using Cysharp.Threading.Tasks;
using GraphNode.App.Scopes;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Services;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>
    /// Mở lần lượt mọi mảnh của catalog trong scene Gameplay thật (đi qua luồng đổi scene như khi chơi tiếp mảnh kế):
    /// level đọc được, HUD có đúng số ô của sản phẩm, vài khung hình vẽ được mà không có lỗi log (Test Framework làm
    /// hỏng test khi có lỗi).
    /// </summary>
    public sealed class AllLevelsTests
    {
        [UnityTest]
        public IEnumerator EveryCatalogLevel_OpensAndRenders() => UniTask.ToCoroutine(async () =>
        {
            HomeScope.SuppressDevAutoStart = true;
            await SceneManager.LoadSceneAsync(SceneIds.Gameplay);
            await UniTask.Yield();
            var app = AppScope.Current;
            var first = Object.FindObjectOfType<GameplayScope>();
            Assert.IsNotNull(first?.State);
            var catalog = first.Catalog;
            Assert.IsNotNull(catalog);
            Assert.Greater(catalog.Levels.Count, 1);

            foreach (var entry in catalog.Levels)
            {
                await app.Flow.StartLevelAsync(new LevelRequest(entry.id), app.LifetimeToken);
                for (int i = 0; i < 4; i++) await UniTask.Yield();
                var scope = Object.FindObjectOfType<GameplayScope>();
                Assert.IsNotNull(scope?.State, $"{entry.id} built a puzzle state");
                Assert.AreEqual(entry.id, scope.State.Level.Id);
                int slots = GameObject.Find("SlotRow").transform.childCount;
                Assert.AreEqual(catalog.PieceCount(entry.productId), slots, $"{entry.id}: one slot per piece of {entry.productId}");
            }
        });

        [UnityTearDown]
        public IEnumerator TearDown() => PlayModeCleanup.Run();
    }
}

using System.Collections;
using Cysharp.Threading.Tasks;
using GraphNode.App.Scopes;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Services;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>Luồng M0: Boot → Home → Gameplay → Home, khóa 60 fps, thoát màn phát LevelResult (bỏ).</summary>
    public sealed class SceneFlowTests
    {
        [UnityTest]
        public IEnumerator Boot_GoesHome_ThenGameplay_ThenBackHome() => UniTask.ToCoroutine(async () =>
        {
            await SceneManager.LoadSceneAsync(SceneIds.Boot);
            await WaitForScene(SceneIds.Home);
            Assert.AreEqual(AppScope.TargetFrameRate, Application.targetFrameRate);

            var app = AppScope.Current;
            Assert.IsNotNull(app);
            LevelResult? result = null;
            using var sub = app.Bus.Subscribe<LevelResult>(r => result = r);

            var home = Object.FindObjectOfType<HomeScope>();
            Assert.IsNotNull(home, "Home scene needs a HomeScope");
            await home.StartLevelAsync("scoop");
            Assert.AreEqual(SceneIds.Gameplay, SceneManager.GetActiveScene().name);

            var gameplay = Object.FindObjectOfType<GameplayScope>();
            Assert.IsNotNull(gameplay, "Gameplay scene needs a GameplayScope");
            Assert.AreEqual("scoop", gameplay.Request.LevelId);

            await gameplay.AbandonAsync();
            Assert.AreEqual(SceneIds.Home, SceneManager.GetActiveScene().name);
            Assert.IsTrue(result.HasValue);
            Assert.AreEqual(LevelOutcome.Abandoned, result.Value.Outcome);
            Assert.AreEqual("scoop", result.Value.LevelId);
            Assert.IsNull(app.Flow.CurrentRequest);
        });

        private static async UniTask WaitForScene(string name)
        {
            float until = Time.realtimeSinceStartup + 10f;
            while (SceneManager.GetActiveScene().name != name)
            {
                if (Time.realtimeSinceStartup > until) Assert.Fail($"Timed out waiting for scene {name}");
                await UniTask.Yield();
            }
        }

        [TearDown]
        public void DestroyAppScope()
        {
            var host = Object.FindObjectOfType<AppScopeHost>();
            if (host != null) Object.Destroy(host.gameObject);
        }
    }
}

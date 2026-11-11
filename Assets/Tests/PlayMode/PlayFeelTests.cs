using System;
using System.Collections;
using Cysharp.Threading.Tasks;
using GraphNode.App.Scopes;
using GraphNode.Foundation.Services;
using GraphNode.Gameplay.View;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>
    /// Cảm giác lúc chơi trong scene Gameplay thật: node hiện dần lúc vào màn rồi đủ cỡ; gợn dây, nảy, bụi chỉ, sóng tròn
    /// và viền sáng vẽ được trên các lớp của prefab mà không lỗi.
    /// </summary>
    public sealed class PlayFeelTests
    {
        private static int Vertices(string layer)
        {
            var go = GameObject.Find(layer);
            Assert.IsNotNull(go, $"layer {layer} exists in PuzzleBoard");
            var mesh = go.GetComponent<MeshFilter>().sharedMesh;
            return mesh != null ? mesh.vertexCount : 0;
        }

        [UnityTest]
        public IEnumerator Intro_ThenEffects_DrawOnBoardLayers() => UniTask.ToCoroutine(async () =>
        {
            HomeScope.SuppressDevAutoStart = true;
            await SceneManager.LoadSceneAsync(SceneIds.Gameplay);
            await UniTask.Yield();
            var view = Object.FindObjectOfType<PuzzleView>();
            var s = Object.FindObjectOfType<GameplayScope>().State;
            Assert.IsNotNull(view);
            Assert.IsTrue(view.Feel.InIntro, "level starts in the intro");

            await UniTask.Delay(TimeSpan.FromSeconds(1.3f), DelayType.DeltaTime);
            Assert.IsFalse(view.Feel.InIntro);
            Assert.AreEqual(1f, view.Feel.Intro, 1e-4f);
            int nodes = 0;
            foreach (var sr in Object.FindObjectsOfType<SpriteRenderer>())
            {
                if (!sr.name.StartsWith("Node")) continue;
                nodes++;
                // ≥ 1: node điểm sáng vừa đi qua còn đang nảy to hơn
                Assert.GreaterOrEqual(sr.transform.localScale.x, 0.95f, $"{sr.name} popped in to full size");
            }
            Assert.AreEqual(s.Level.NodeCount, nodes);

            // kéo dây, gảy, nảy, bụi chỉ, sóng tròn rồi chớp sáng thắng
            view.Feel.BeginWave(0, 0.5f);
            for (int i = 0; i < 6; i++)
            {
                view.Feel.MoveWave(0.5f + 0.05f * i, 0.05f, false);
                await UniTask.Yield();
            }
            view.Feel.EndWave();
            view.SnapEdge(0, 1f, 0f, 5, false);
            view.PinRipple(0);
            view.Feel.ReadySurge();
            await UniTask.Yield();
            await UniTask.Yield();
            Assert.Greater(Vertices("Effects"), 0, "ripple and lint drawn");
            Assert.Greater(Vertices("ReadyGlow"), 0, "ready surge lights the outline");

            await UniTask.Delay(TimeSpan.FromSeconds(0.8f), DelayType.DeltaTime);
            Assert.AreEqual(0, Vertices("ReadyGlow"), "glow fades after the surge");
        });

        [UnityTearDown]
        public IEnumerator TearDown() => PlayModeCleanup.Run();
    }
}

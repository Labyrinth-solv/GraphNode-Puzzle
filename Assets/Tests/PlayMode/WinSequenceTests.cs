using System.Collections;
using Cysharp.Threading.Tasks;
using GraphNode.App.Scopes;
using GraphNode.Core.Geometry;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Services;
using GraphNode.Gameplay.Session;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>
    /// Giải viên kem qua PuzzleState trong scene Gameplay thật rồi chạy chuỗi thắng (snap, cắt) qua View thật: không lỗi,
    /// phát LevelResult thắng. Lỗi log trong lúc chạy làm test hỏng (Unity Test Framework).
    /// </summary>
    public sealed class WinSequenceTests
    {
        [UnityTest]
        public IEnumerator SolvingScoop_PlaysSnapAndCut_ThenReportsWin() => UniTask.ToCoroutine(async () =>
        {
            HomeScope.SuppressDevAutoStart = true;
            await SceneManager.LoadSceneAsync(SceneIds.Gameplay);
            await UniTask.Yield();
            var scope = Object.FindObjectOfType<GameplayScope>();
            var controller = Object.FindObjectOfType<PuzzleController>();
            Assert.IsNotNull(scope?.State, "Gameplay scope built a puzzle state");
            var s = scope.State;

            LevelResult? result = null;
            using var sub = AppScope.Current.Bus.Subscribe<LevelResult>(r => result = r);

            for (int i = 0; i < s.Level.NodeCount; i++)
            {
                if (s.Level.Locked[i]) continue;
                s.BeginNodeDrag(i);
                s.DragNode(s.Level.Solution[i] + new Float2(0.01f, 0f));
                s.EndNodeDrag(false, true);
            }
            foreach (int k in s.Level.BendFree)
            {
                Assert.IsTrue(s.Pins.TryGetEdgeTarget(k, s.Positions, s.FoldLine, out float h));
                int n = s.Topology.RingLength;
                var a = s.Positions[s.Topology.RingNode(k)];
                var b = s.Positions[s.Topology.RingNode((k + 1) % n)];
                var mid = Float2.Lerp(a, b, 0.5f);
                var t = (b - a).Normalized();
                s.BeginEdgeDrag(k, mid, 0.5f);
                s.DragEdge(mid + new Float2(-t.Y, t.X) * (h - s.Bends[k]));
                s.EndEdgeDrag(false, true);
            }
            Assert.IsTrue(s.Won, "scoop solved through the state");

            float start = Time.realtimeSinceStartup;
            await controller.PlayWinSequenceAsync();
            float took = Time.realtimeSinceStartup - start;

            Assert.IsTrue(result.HasValue, "win published a LevelResult");
            Assert.AreEqual(LevelOutcome.Won, result.Value.Outcome);
            Assert.AreEqual("scoop", result.Value.LevelId);
            // snap ≥ 0,48 s, cắt khoảng 1,5 s, dừng 0,6 s: chuỗi phải chạy thật chứ không bỏ qua
            Assert.Greater(took, 1.5f, $"sequence took {took:0.00}s");
        });

        [TearDown]
        public void TearDown()
        {
            HomeScope.SuppressDevAutoStart = false;
            var host = Object.FindObjectOfType<AppScopeHost>();
            if (host != null) Object.Destroy(host.gameObject);
        }
    }
}

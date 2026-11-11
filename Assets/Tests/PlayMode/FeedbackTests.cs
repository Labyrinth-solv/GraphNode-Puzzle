using System.Collections;
using Cysharp.Threading.Tasks;
using GraphNode.App.Scopes;
using GraphNode.Core.Geometry;
using GraphNode.Foundation.Services;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>
    /// Phản hồi khớp trong scene Gameplay thật: để yên lâu thì chốt trống có quầng; cắm đủ chốt mà dây phải uốn còn thẳng
    /// thì dây đó có nút cúc len gợi ý.
    /// </summary>
    public sealed class FeedbackTests
    {
        private static SpriteRenderer Find(string name)
        {
            foreach (var sr in Object.FindObjectsOfType<SpriteRenderer>())
                if (sr.name == name) return sr;
            return null;
        }

        [UnityTest]
        public IEnumerator IdlePins_ShowHalos_ThenFilledPins_ShowBendHint() => UniTask.ToCoroutine(async () =>
        {
            HomeScope.SuppressDevAutoStart = true;
            await SceneManager.LoadSceneAsync(SceneIds.Gameplay);
            await UniTask.Yield();
            var s = Object.FindObjectOfType<GameplayScope>().State;
            Assert.IsNotNull(s);

            // chưa chạm gì: coi như để yên từ lâu, chốt trống có quầng
            for (int i = 0; i < 3; i++) await UniTask.Yield();
            int emptyPin = -1;
            for (int j = 0; j < s.Pins.PinCount; j++) if (s.Pins.PinToNode[j] < 0) { emptyPin = j; break; }
            Assert.GreaterOrEqual(emptyPin, 0);
            Assert.IsTrue(Find("PinHalo" + emptyPin).enabled, "idle empty pin shows a halo");
            Assert.IsFalse(Find("Bead0").enabled, "no bend hint before pins are filled");

            for (int i = 0; i < s.Level.NodeCount; i++)
            {
                if (s.Level.Locked[i]) continue;
                s.BeginNodeDrag(i);
                s.DragNode(s.Level.Solution[i] + new Float2(0.01f, 0f));
                s.EndNodeDrag(false, true);
            }
            for (int i = 0; i < 3; i++) await UniTask.Yield();
            Assert.IsTrue(s.Pins.AllFilled);
            Assert.IsFalse(Find("PinHalo" + emptyPin).enabled, "filled pin has no halo");
            Assert.IsTrue(Find("Bead0").enabled, "the edge still to bend gets a pinch bead");
        });

        [UnityTearDown]
        public IEnumerator TearDown() => PlayModeCleanup.Run();
    }
}

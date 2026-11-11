using GraphNode.Core.Input;
using GraphNode.Core.Session;
using GraphNode.Data.Configs;
using NUnit.Framework;
using UnityEngine;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Giá trị mặc định của asset cấu hình phải trùng số mà test lõi dùng (số tạm của bản web chính), để hai nơi không lệch
    /// nhau mà không ai biết. Chỉnh số thật thì sửa trong asset, không sửa mặc định.
    /// </summary>
    public sealed class ConfigDefaultsTests
    {
        [Test]
        public void GameplayBalanceDefaults_MatchWebDemo()
        {
            var so = ScriptableObject.CreateInstance<GameplayBalanceConfig>();
            var got = so.ToPuzzleConfig();
            var exp = PuzzleConfig.WebDemo;
            Assert.AreEqual(exp.Penalty.Weight, got.Penalty.Weight);
            Assert.AreEqual(exp.Penalty.MinSpan, got.Penalty.MinSpan);
            Assert.AreEqual(exp.Penalty.ErrorCap, got.Penalty.ErrorCap);
            Assert.AreEqual(exp.Penalty.AutoFreeThreshold, got.Penalty.AutoFreeThreshold);
            Assert.AreEqual(exp.Pins.OnRadius, got.Pins.OnRadius);
            Assert.AreEqual(exp.Pins.MagnetRadius, got.Pins.MagnetRadius);
            Assert.AreEqual(exp.Pins.MagnetPull, got.Pins.MagnetPull);
            Assert.AreEqual(exp.Pins.FoldLineTolerance, got.Pins.FoldLineTolerance);
            Assert.AreEqual(exp.Bend.Limit, got.Bend.Limit);
            Assert.AreEqual(exp.Bend.MagnetRadius, got.Bend.MagnetRadius);
            Assert.AreEqual(exp.Bend.MagnetPull, got.Bend.MagnetPull);
            Assert.AreEqual(exp.Bend.SnapStraight, got.Bend.SnapStraight);
            Assert.AreEqual(exp.Bend.SnapStraightAtStraightTarget, got.Bend.SnapStraightAtStraightTarget);
            Assert.AreEqual(exp.Needle.Min, got.Needle.Min);
            Assert.AreEqual(exp.Needle.Max, got.Needle.Max);
            Assert.AreEqual(exp.Needle.MagnetRadius, got.Needle.MagnetRadius);
            Assert.AreEqual(exp.Needle.MagnetPull, got.Needle.MagnetPull);
            Assert.AreEqual(exp.FabricMargin, got.FabricMargin);
            Assert.AreEqual(exp.FabricEdge, got.FabricEdge);
            Assert.AreEqual(exp.EdgeWasOff, got.EdgeWasOff);
            Object.DestroyImmediate(so);
        }

        [Test]
        public void InputDefaults_OnTheWebFabric_MatchWebDemo()
        {
            // khung vải 362 pt của bản web; số pt của đặc tả làm tròn nên lệch rất nhỏ so với số theo bề rộng vải của web
            var so = ScriptableObject.CreateInstance<InputConfig>();
            var got = so.ToTouchParams(362f);
            var exp = TouchParams.WebDemo;
            Assert.AreEqual(exp.PickMin, got.PickMin);
            Assert.AreEqual(exp.PickMax, got.PickMax);
            Assert.AreEqual(exp.EdgeSearch, got.EdgeSearch);
            Assert.AreEqual(exp.MidStart, got.MidStart);
            Assert.AreEqual(exp.MidEnd, got.MidEnd);
            Assert.AreEqual(exp.NodePriority, got.NodePriority, 0.002f);
            Assert.AreEqual(exp.EndpointBubble, got.EndpointBubble, 0.002f);
            Assert.AreEqual(exp.NeedleHit, got.NeedleHit, 0.002f);
            Assert.GreaterOrEqual(got.NeedleHit * 2 * 362f, 44f, "needle touch area must be at least 44 pt");
            Object.DestroyImmediate(so);
        }
    }
}

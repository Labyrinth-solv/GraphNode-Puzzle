using GraphNode.Core.Geometry;
using GraphNode.Core.Input;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Bộ lọc chạm 3 lớp với ba tình huống của đặc tả (mục Kiểm thử), trên khung vải 362 pt của bản web: chạm lệch tâm
    /// node 18 pt về phía dây thì chọn node, chạm giữa dây thì chọn dây, chạm dây ở 12% chiều dài thì không chọn dây.
    /// </summary>
    public sealed class TouchArbiterTests
    {
        private const float FabricPt = 362f;

        private static (WebDemoFixtures.Rig rig, TouchArbiter arbiter) Make(string id)
        {
            var rig = new WebDemoFixtures.Rig(id);
            return (rig, new TouchArbiter(rig.Level, rig.Topo, rig.Shape, TouchParams.WebDemo));
        }

        /// <summary>Điểm trên cạnh vòng k ở lời giải, tại vị trí u (0–1) theo số đoạn của đường cạnh.</summary>
        private static Float2 OnEdge(WebDemoFixtures.Rig rig, int k, float u)
        {
            var buf = new Float2[21];
            int n = rig.Topo.RingLength;
            int count = rig.Shape.Sample(rig.Level.Solution, rig.Solution.Bends, rig.Topo.RingNode(k), rig.Topo.RingNode((k + 1) % n), 20, false, buf);
            float s = u * (count - 1);
            int i = System.Math.Min(count - 2, (int)s);
            return Float2.Lerp(buf[i], buf[i + 1], s - i);
        }

        private static int FreeEdge(WebDemoFixtures.Rig rig)
        {
            // cạnh vòng có cả hai đầu kéo được, để lớp bảo vệ đầu dây có tác dụng
            int n = rig.Topo.RingLength;
            for (int k = 0; k < n; k++)
                if (!rig.Level.Locked[rig.Topo.RingNode(k)] && !rig.Level.Locked[rig.Topo.RingNode((k + 1) % n)]) return k;
            Assert.Fail("level has no edge with two free ends");
            return -1;
        }

        [Test]
        public void TapNearNodeTowardEdge_PicksNode()
        {
            var (rig, arbiter) = Make("cardigan");
            int k = FreeEdge(rig);
            int a = rig.Topo.RingNode(k);
            var pos = rig.Level.Solution;
            var mid = OnEdge(rig, k, 0.5f);
            var toward = (mid - pos[a]).Normalized();
            var touch = pos[a] + toward * (18f / FabricPt);
            var hit = arbiter.Pick(touch, pos, rig.Solution.Bends, 0f);
            Assert.AreEqual(TouchTargetKind.Node, hit.Kind);
            Assert.AreEqual(a, hit.Index);
        }

        [Test]
        public void TapMidEdge_PicksEdge()
        {
            var (rig, arbiter) = Make("cardigan");
            int k = FreeEdge(rig);
            var hit = arbiter.Pick(OnEdge(rig, k, 0.5f), rig.Level.Solution, rig.Solution.Bends, 0f);
            Assert.AreEqual(TouchTargetKind.Edge, hit.Kind);
            Assert.AreEqual(k, hit.Index);
            Assert.AreEqual(0.5f, hit.EdgeU, 0.03f);
        }

        [Test]
        public void TapEdgeAt12Percent_DoesNotPickEdge()
        {
            var (rig, arbiter) = Make("cardigan");
            int k = FreeEdge(rig);
            var hit = arbiter.Pick(OnEdge(rig, k, 0.12f), rig.Level.Solution, rig.Solution.Bends, 0f);
            Assert.AreNotEqual(TouchTargetKind.Edge, hit.Kind);
        }

        [Test]
        public void TapLockedNodeOnMidEdge_BendsEdge()
        {
            // ghim khóa không có vùng bảo vệ: chạm trúng đoạn giữa dây cạnh ghim khóa thì uốn dây
            var (rig, arbiter) = Make("scoop");
            var pos = rig.Level.Solution;
            int locked = System.Array.IndexOf(rig.Level.Locked, true);
            int k = rig.Topo.RingIndexOf(locked);
            var hit = arbiter.Pick(OnEdge(rig, k, 0.5f), pos, rig.Solution.Bends, 0f);
            Assert.AreEqual(TouchTargetKind.Edge, hit.Kind);
        }

        [Test]
        public void TapLockedNodeCenter_ReportsLockedNode()
        {
            // ốc quế: hai cạnh ra từ ghim khóa dài, đoạn giữa dây ở xa ghim nên chạm tâm ghim không trúng dây
            var (rig, arbiter) = Make("cone");
            int locked = System.Array.IndexOf(rig.Level.Locked, true);
            var hit = arbiter.Pick(rig.Level.Solution[locked], rig.Level.Solution, rig.Solution.Bends, 0f);
            Assert.AreEqual(TouchTargetKind.LockedNode, hit.Kind);
            Assert.AreEqual(locked, hit.Index);
        }

        [Test]
        public void PickRadius_IsHalfNearestDistanceClamped()
        {
            var (rig, arbiter) = Make("scoop");
            var p = new[] { new Float2(0.1f, 0.1f), new Float2(0.4f, 0.1f), new Float2(0.9f, 0.9f) };
            Assert.AreEqual(0.15f, arbiter.PickRadius(0, p), 1e-6f);
            var tight = new[] { new Float2(0.1f, 0.1f), new Float2(0.12f, 0.1f), new Float2(0.9f, 0.9f) };
            Assert.AreEqual(TouchParams.WebDemo.PickMin, arbiter.PickRadius(0, tight), 1e-6f);
            var far = new[] { new Float2(0.05f, 0.05f), new Float2(0.95f, 0.95f) };
            Assert.AreEqual(TouchParams.WebDemo.PickMax, arbiter.PickRadius(0, far), 1e-6f);
        }
    }
}

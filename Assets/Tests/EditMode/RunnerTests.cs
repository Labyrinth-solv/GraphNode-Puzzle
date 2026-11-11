using GraphNode.Core.Geometry;
using GraphNode.Core.Runner;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>Điểm sáng, tốc độ cảnh cắt và thang nốt (đặc tả mục Điểm sáng).</summary>
    public sealed class RunnerTests
    {
        private static (WebDemoFixtures.Rig rig, RunnerSimulator sim) Make(string id)
        {
            var rig = new WebDemoFixtures.Rig(id);
            return (rig, new RunnerSimulator(rig.Topo, rig.Shape));
        }

        [Test]
        public void Step_AdvancesAtConstantSpeedAlongTheEdge()
        {
            var (rig, sim) = Make("cone"); // ốc quế: ba cạnh thẳng
            var pos = rig.Level.Solution;
            var rule = new ConstantSpeedRule(0.1f);
            float len = sim.EdgeLength(0, pos, rig.Solution.Bends);
            var passed = new int[4];
            int count = sim.Step(1f, rule, false, pos, rig.Solution.Bends, passed);
            Assert.AreEqual(0, count);
            Assert.AreEqual(0, sim.Edge);
            Assert.AreEqual(0.1f / len, sim.T, 1e-5f);
        }

        [Test]
        public void Step_ReportsEveryNodePassedInOrder()
        {
            var (rig, sim) = Make("cone");
            var pos = rig.Level.Solution;
            var bends = rig.Solution.Bends;
            float l0 = sim.EdgeLength(0, pos, bends), l1 = sim.EdgeLength(1, pos, bends);
            var passed = new int[4];
            // một bước dài đi hết cạnh 0 và cạnh 1, dừng giữa cạnh 2: qua node ring[1] rồi ring[2]
            int count = sim.Step(1f, new ConstantSpeedRule(l0 + l1 + 0.01f), false, pos, bends, passed);
            Assert.AreEqual(2, count);
            Assert.AreEqual(rig.Topo.RingNode(1), passed[0]);
            Assert.AreEqual(rig.Topo.RingNode(2), passed[1]);
            Assert.AreEqual(2, sim.Edge);
        }

        [Test]
        public void Reverse_RunsBackwardWithoutRepeatingTheNodeItStandsOn()
        {
            var (rig, sim) = Make("cone");
            var pos = rig.Level.Solution;
            var bends = rig.Solution.Bends;
            float l0 = sim.EdgeLength(0, pos, bends);
            var passed = new int[4];
            var rule = new ConstantSpeedRule(l0);
            Assert.AreEqual(1, sim.Step(1f, rule, false, pos, bends, passed));
            Assert.AreEqual(rig.Topo.RingNode(1), passed[0]);
            rule.Reverse();
            // vừa qua node ring[1] rồi đổi chiều: đi ngược hết cạnh 0, tới node ring[0]
            int count = sim.Step(1f, rule, false, pos, bends, passed);
            Assert.AreEqual(1, count);
            Assert.AreEqual(rig.Topo.RingNode(0), passed[0]);
        }

        [Test]
        public void EdgeStretch_KeepsRunnerOnTheSameEdgeRatio()
        {
            var (rig, sim) = Make("cone");
            var pos = (Float2[])rig.Level.Solution.Clone();
            var bends = rig.Solution.Bends;
            var passed = new int[4];
            sim.Step(0.5f, new ConstantSpeedRule(0.2f), false, pos, bends, passed);
            float t = sim.T;
            // kéo node làm cạnh dài ra: điểm sáng giữ cạnh và tỉ lệ, không nhảy
            pos[1] = pos[1] + new Float2(0.05f, 0f);
            sim.Step(0f, new ConstantSpeedRule(0.2f), false, pos, bends, passed);
            Assert.AreEqual(0, sim.Edge);
            Assert.AreEqual(t, sim.T, 1e-7f);
        }

        // số đối chiếu của đặc tả (chu vi theo bề rộng vải → hệ số, thời gian)
        [TestCase(2.00f, 1.96f, 1.5f)]
        [TestCase(2.17f, 2.13f, 1.5f)]
        [TestCase(2.47f, 2.42f, 1.5f)]
        [TestCase(3.67f, 2.50f, 2.16f)]
        public void CutTiming_MatchesSpecTable(float perimeter, float multiplier, float seconds)
        {
            var p = CutTimingParams.WebDemo;
            Assert.AreEqual(multiplier, CutTiming.Multiplier(perimeter, p), 0.006f);
            Assert.AreEqual(seconds, CutTiming.Duration(perimeter, p), 0.006f);
        }

        [Test]
        public void CutTiming_SmallPieceUsesMinimumMultiplier()
        {
            Assert.AreEqual(1.6f, CutTiming.Multiplier(1.0f, CutTimingParams.WebDemo), 1e-6f);
        }

        [Test]
        public void Pentatonic_ClimbsThroughOctavesWithoutWrapping()
        {
            int[] expected = { 0, 2, 4, 7, 9, 12, 14, 16, 19, 21 };
            for (int k = 0; k < expected.Length; k++) Assert.AreEqual(expected[k], Pentatonic.Semitones(k));
            // đô 5 (523,25 Hz) lên bậc 9 là la 6, khoảng 1760 Hz
            Assert.AreEqual(1760.0, 523.25 * System.Math.Pow(2, Pentatonic.Semitones(9) / 12.0), 0.5);
        }
    }
}

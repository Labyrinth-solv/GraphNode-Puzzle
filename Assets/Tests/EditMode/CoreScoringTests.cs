using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Outline;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Đối chiếu lõi C# với lõi của bản web chính trên 14 level (đặc tả mục Kiểm thử): độ uốn lời giải, hình cạnh,
    /// mặt nạ, phạt độ uốn, điểm khớp. Đáp án cho 100%; vị trí đầu và cắm đủ chốt mà chưa uốn thì dưới ngưỡng.
    /// </summary>
    public sealed class CoreScoringTests
    {
        private static IEnumerable<string> Levels() => WebDemoFixtures.LevelIds();

        // Lõi web tính bằng double, C# lưu toạ độ bằng float: cho lệch rất nhỏ ở hình cạnh và vài ô ở mép mặt nạ.
        private const float BendTolerance = 1e-5f;
        private const float PointTolerance = 2e-5f;
        // đo 2026-11-11: 27/28 mặt nạ trùng từng ô với web, một mặt nạ lệch 1 ô (bunny_bow lúc đầu, 6701 so với 6700)
        private const float AreaTolerance = 0.0005f;
        private const float ScoreTolerance = 0.002f;

        [TestCaseSource(nameof(Levels))]
        public void SolutionBends_MatchWeb(string id)
        {
            var rig = new WebDemoFixtures.Rig(id);
            var exp = WebDemoFixtures.ExpectedFor(id);
            var bends = exp["solBend"].ToObject<float[]>();
            var curved = exp["wasCurved"].ToObject<bool[]>();
            Assert.AreEqual(bends.Length, rig.Solution.Bends.Length);
            for (int k = 0; k < bends.Length; k++)
            {
                Assert.AreEqual(bends[k], rig.Solution.Bends[k], BendTolerance, $"{id} edge {k} bend");
                Assert.AreEqual(curved[k], rig.Solution.Curved[k], $"{id} edge {k} curved");
            }
        }

        [TestCaseSource(nameof(Levels))]
        public void EdgeShape_MatchesWebAtSolutionAndStart(string id)
        {
            var rig = new WebDemoFixtures.Rig(id);
            var buffer = new Float2[25];
            int n = rig.Topo.RingLength;
            foreach (var e in WebDemoFixtures.ExpectedFor(id)["edges24"])
            {
                int k = e["k"].ToObject<int>();
                int a = rig.Topo.RingNode(k), b = rig.Topo.RingNode((k + 1) % n);
                CheckEdge(id, k, "sol", e["sol"].ToObject<float[]>(),
                    rig.Shape.Sample(rig.Level.Solution, rig.Solution.Bends, a, b, 24, false, buffer), buffer);
                CheckEdge(id, k, "start", e["start"].ToObject<float[]>(),
                    rig.Shape.Sample(rig.Level.Start, rig.Level.StartBend, a, b, 24, false, buffer), buffer);
            }
        }

        private static void CheckEdge(string id, int k, string which, float[] expected, int count, Float2[] got)
        {
            Assert.AreEqual(expected.Length / 2, count, $"{id} edge {k} {which}: point count");
            for (int i = 0; i < count; i++)
            {
                Assert.AreEqual(expected[2 * i], got[i].X, PointTolerance, $"{id} edge {k} {which} point {i} x");
                Assert.AreEqual(expected[2 * i + 1], got[i].Y, PointTolerance, $"{id} edge {k} {which} point {i} y");
            }
        }

        [TestCaseSource(nameof(Levels))]
        public void MaskAndScore_MatchWeb(string id)
        {
            var rig = new WebDemoFixtures.Rig(id);
            var exp = WebDemoFixtures.ExpectedFor(id);
            var sol = new byte[RegionMask.CellCount];
            var start = new byte[RegionMask.CellCount];
            var pinsOnly = new byte[RegionMask.CellCount];
            rig.Mask.RenderPiece(rig.Level.Solution, rig.Solution.Bends, rig.SolutionLine, sol);
            rig.Mask.RenderPiece(rig.Level.Start, rig.Level.StartBend, rig.StartLine, start);
            rig.Mask.RenderPiece(rig.Level.Solution, rig.Level.StartBend, rig.SolutionLine, pinsOnly);

            AssertArea(exp["maskAreaSol"].ToObject<int>(), RegionMask.Area(sol), $"{id} solution area");
            AssertArea(exp["maskAreaStart"].ToObject<int>(), RegionMask.Area(start), $"{id} start area");

            Assert.AreEqual(exp["bendPenaltyStart"].ToObject<float>(), rig.Scorer.BendPenalty(rig.Level.StartBend), 1e-5f, $"{id} start bend penalty");
            float self = rig.Scorer.Score(sol, sol, rig.Solution.Bends);
            float startScore = rig.Scorer.Score(start, sol, rig.Level.StartBend);
            float pinsScore = rig.Scorer.Score(pinsOnly, sol, rig.Level.StartBend);
            Assert.AreEqual(1f, self, 1e-6f, $"{id}: the solution must score 100%");
            Assert.AreEqual(exp["scoreStart"].ToObject<float>(), startScore, ScoreTolerance, $"{id} start score");
            Assert.AreEqual(exp["scorePinsOnly"].ToObject<float>(), pinsScore, ScoreTolerance, $"{id} pins-only score");
        }

        [TestCaseSource(nameof(Levels))]
        public void StartAndPinsOnly_StayBelowThreshold(string id)
        {
            var rig = new WebDemoFixtures.Rig(id);
            var sol = new byte[RegionMask.CellCount];
            var start = new byte[RegionMask.CellCount];
            var pinsOnly = new byte[RegionMask.CellCount];
            rig.Mask.RenderPiece(rig.Level.Solution, rig.Solution.Bends, rig.SolutionLine, sol);
            rig.Mask.RenderPiece(rig.Level.Start, rig.Level.StartBend, rig.StartLine, start);
            Assert.Less(rig.Scorer.Score(start, sol, rig.Level.StartBend), rig.Level.WinThreshold, $"{id}: start must not already win");

            // cắm đủ chốt mà chưa uốn thì dưới ngưỡng (chỉ áp cho level có cạnh phải tự uốn)
            if (rig.Level.BendFree.Length == 0) return;
            rig.Mask.RenderPiece(rig.Level.Solution, rig.Level.StartBend, rig.SolutionLine, pinsOnly);
            Assert.Less(rig.Scorer.Score(pinsOnly, sol, rig.Level.StartBend), rig.Level.WinThreshold, $"{id}: pins filled without bending must not win");
        }

        private static void AssertArea(int expected, int actual, string label)
        {
            float diff = System.Math.Abs(expected - actual) / (float)expected;
            Assert.LessOrEqual(diff, AreaTolerance, $"{label}: expected {expected}, got {actual}");
        }
    }
}

using System.Collections.Generic;
using GraphNode.Core.Generation;
using GraphNode.Core.Geometry;
using GraphNode.Core.Scoring;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Sinh vị trí đầu (đặc tả mục Độ khó): cùng khóa hạt giống cho đúng vị trí đầu, độ uốn đầu, cạnh phải tự uốn và vị trí
    /// kim mà trình sinh của bản web chính đã ghi vào 14 file level.
    /// </summary>
    public sealed class StartGenTests
    {
        private static IEnumerable<string> Levels() => WebDemoFixtures.LevelIds();

        [Test]
        public void SeededRandom_MatchesWebSequence()
        {
            // số lấy từ rng() trong startgen.js của bản web chính
            var r = new SeededRandom("scoop:easy");
            double[] first = { 0.9967707188334316, 0.20302033028565347, 0.19361667172051966, 0.022389254067093134, 0.47644949168898165 };
            foreach (double v in first) Assert.AreEqual(v, r.NextDouble(), 1e-15);
            for (int i = 0; i < 995; i++) r.NextDouble();
            Assert.AreEqual(0.47774570039473474, r.NextDouble(), 1e-15);

            // khóa có ký tự tiếng Việt: băm theo mã UTF-16 như JavaScript
            var v2 = new SeededRandom("Mặt thỏ:hard");
            Assert.AreEqual(0.8308076097164303, v2.NextDouble(), 1e-15);
        }

        [TestCaseSource(nameof(Levels))]
        public void Generate_ReproducesWebStart(string id)
        {
            var level = WebDemoFixtures.Load(id);
            var exp = WebDemoFixtures.ExpectedFor(id);
            bool byDesigner = exp["bendFreeByDesigner"].ToObject<bool>();
            var result = StartPositionGenerator.Generate(level, TierParams.WebDemo(level.Difficulty), StartGenParams.WebDemo,
                BendPenaltyParams.WebDemo, byDesigner ? level.BendFree : null, StartPositionGenerator.DefaultSeedKey(level));

            CollectionAssert.AreEqual(level.BendFree, result.BendFree, $"{id}: bendFree");
            for (int k = 0; k < level.StartBend.Length; k++)
                Assert.AreEqual(level.StartBend[k], result.StartBend[k], 2e-6f, $"{id}: startBend {k}");
            for (int i = 0; i < level.NodeCount; i++)
            {
                Assert.AreEqual(level.Start[i].X, result.Start[i].X, 2e-5f, $"{id}: node {i} x");
                Assert.AreEqual(level.Start[i].Y, result.Start[i].Y, 2e-5f, $"{id}: node {i} y");
            }
            Assert.AreEqual(exp["startLine"].ToObject<float>(), result.StartLine, 1e-5f, $"{id}: needle start");
            Assert.AreEqual(exp["startScore"].ToObject<float>(), result.StartScore, 0.002f, $"{id}: start score");
            Assert.Less(result.StartScore, level.WinThreshold, $"{id}: start must not already win");
        }

        [Test]
        public void Generate_IsDeterministicForTheSameKey()
        {
            var level = WebDemoFixtures.Load("cardigan");
            var tier = TierParams.WebDemo(level.Difficulty);
            var a = StartPositionGenerator.Generate(level, tier, StartGenParams.WebDemo, BendPenaltyParams.WebDemo, null, "k1");
            var b = StartPositionGenerator.Generate(level, tier, StartGenParams.WebDemo, BendPenaltyParams.WebDemo, null, "k1");
            var c = StartPositionGenerator.Generate(level, tier, StartGenParams.WebDemo, BendPenaltyParams.WebDemo, null, "k2");
            CollectionAssert.AreEqual(a.Start, b.Start);
            CollectionAssert.AreNotEqual(a.Start, c.Start, "a different seed key gives a different start");
        }

        [TestCaseSource(nameof(Levels))]
        public void Generate_KeepsFreeNodesSpacedAndOffPins(string id)
        {
            var level = WebDemoFixtures.Load(id);
            // vị trí đầu đặt tay (keepStart) không qua trình sinh nên không xét khoảng cách ở đây
            if (level.KeepStart) return;
            var gen = StartGenParams.WebDemo;
            var result = StartPositionGenerator.Generate(level, TierParams.WebDemo(level.Difficulty), gen, BendPenaltyParams.WebDemo,
                level.BendFree, StartPositionGenerator.DefaultSeedKey(level));
            Assert.IsFalse(result.UsedFallback, $"{id}: generator found a spaced placement");
            var p = result.Start;
            for (int i = 0; i < p.Length; i++)
            {
                if (level.Locked[i]) continue;
                for (int j = 0; j < p.Length; j++)
                {
                    if (j != i) Assert.GreaterOrEqual(Float2.Distance(p[i], p[j]), gen.MinGap - 1e-6f, $"{id}: nodes {i},{j} too close");
                    Assert.GreaterOrEqual(Float2.Distance(p[i], level.Solution[j]), gen.PinClear - 1e-6f, $"{id}: node {i} starts near pin {j}");
                }
            }
        }
    }
}

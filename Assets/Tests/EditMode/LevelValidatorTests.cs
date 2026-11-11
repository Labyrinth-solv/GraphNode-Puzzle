using System.Collections.Generic;
using System.Diagnostics;
using GraphNode.Core.Geometry;
using GraphNode.Core.Levels;
using GraphNode.Core.Outline;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>Kiểm tra hàng loạt (đặc tả mục Kiểm tra hàng loạt) trên 14 level của bản web chính, và đo thời gian tính.</summary>
    public sealed class LevelValidatorTests
    {
        private static IEnumerable<string> Levels() => WebDemoFixtures.LevelIds();

        // màn gấp mức dễ: độ khớp ban đầu lệch khoảng của mức, mâu thuẫn đã ghi trong đặc tả và người dùng tạm chấp nhận
        private static readonly HashSet<string> KnownOutOfTier = new HashSet<string> { "heart", "heartHole" };

        [TestCaseSource(nameof(Levels))]
        public void WebDemoLevel_HasNoErrors(string id)
        {
            var report = LevelValidator.Validate(WebDemoFixtures.Load(id), ValidatorParams.WebDemo);
            foreach (var issue in report.Issues)
            {
                if (issue.Severity == IssueSeverity.Error) Assert.Fail($"{id}: {issue}");
                if (issue.Code == "start_score_out_of_tier" && KnownOutOfTier.Contains(id)) continue;
                Assert.Fail($"{id}: unexpected warning {issue}");
            }
            Assert.AreEqual(KnownOutOfTier.Contains(id), report.Has("start_score_out_of_tier"), $"{id}: out-of-tier warning");
        }

        [Test]
        public void StartAtSolution_IsReportedAsStartWins()
        {
            // vị trí đầu là lời giải và dây đã uốn sẵn đúng lời giải (cạnh phải tự uốn mà để thẳng thì vẫn dưới ngưỡng)
            var rig = new WebDemoFixtures.Rig("scoop");
            var level = rig.Level;
            var broken = Rebuild(level, (Float2[])level.Solution.Clone(), rig.Solution.Bends);
            var report = LevelValidator.Validate(broken, ValidatorParams.WebDemo);
            Assert.IsTrue(report.Has("start_wins"));
            Assert.IsTrue(report.Has("start_in_pin_magnet"));
            Assert.IsTrue(report.HasErrors);
        }

        [Test]
        public void HandEditedStart_IsReportedAsNotReproducible()
        {
            var level = WebDemoFixtures.Load("cardigan");
            var start = (Float2[])level.Start.Clone();
            int free = System.Array.IndexOf(level.Locked, false);
            start[free] = start[free] + new Float2(0.01f, 0f);
            var report = LevelValidator.Validate(Rebuild(level, start), ValidatorParams.WebDemo);
            Assert.IsTrue(report.Has("start_not_reproducible"));
        }

        private static LevelModel Rebuild(LevelModel l, Float2[] start, float[] startBend = null) =>
            new LevelModel(l.Id, l.Difficulty, l.WinThreshold, l.Kinds, l.Locked, l.Solution, start, l.Ring, l.InnerEdges,
                l.BendFree, startBend ?? l.StartBend, l.StraightEdges, l.SolutionBendOverride, l.KeepStart, l.Fold);

        /// <summary>
        /// Đo trên Editor thời gian dựng mặt nạ và chấm điểm một khung hình (việc nặng nhất của lõi khi đang kéo). Đặc tả
        /// nhắm khoảng 1 ms mỗi khung trên máy; ở đây chỉ chặn trường hợp chậm bất thường, số đo thật ghi vào đặc tả.
        /// </summary>
        [Test]
        public void MaskAndScore_FitsTheFrameBudgetInEditor()
        {
            var rig = new WebDemoFixtures.Rig("flower_bloom"); // nhiều node nhất, có gấp (dựng hai mặt nạ)
            var sol = new byte[RegionMask.CellCount];
            var work = new byte[RegionMask.CellCount];
            rig.Mask.RenderPiece(rig.Level.Solution, rig.Solution.Bends, rig.SolutionLine, sol);
            for (int i = 0; i < 20; i++) rig.Mask.RenderPiece(rig.Level.Start, rig.Level.StartBend, rig.StartLine, work);
            const int frames = 200;
            var sw = Stopwatch.StartNew();
            float score = 0;
            for (int i = 0; i < frames; i++)
            {
                rig.Mask.RenderPiece(rig.Level.Start, rig.Level.StartBend, rig.StartLine, work);
                score += rig.Scorer.Score(work, sol, rig.Level.StartBend);
            }
            sw.Stop();
            double ms = sw.Elapsed.TotalMilliseconds / frames;
            TestContext.WriteLine($"flower_bloom mask+score: {ms:0.000} ms per frame (Editor, {frames} frames)");
            Assert.Greater(score, 0f);
            Assert.Less(ms, 8.0, "mask and score took longer than half a 60 fps frame in the Editor");
        }
    }
}

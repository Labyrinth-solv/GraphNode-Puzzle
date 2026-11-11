using System;
using System.Collections.Generic;
using GraphNode.Core.Generation;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Outline;
using GraphNode.Core.Pins;
using GraphNode.Core.Scoring;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Levels
{
    public enum IssueSeverity
    {
        /// <summary>Level sai luật, không được đưa vào game.</summary>
        Error,
        /// <summary>Lệch quy chuẩn nhưng chơi được; người thiết kế xem lại.</summary>
        Warning
    }

    public readonly struct ValidationIssue
    {
        public readonly IssueSeverity Severity;
        /// <summary>Mã ngắn, ổn định để CI và Level Editor lọc (ví dụ "start_wins").</summary>
        public readonly string Code;
        public readonly string Message;

        public ValidationIssue(IssueSeverity severity, string code, string message)
        {
            Severity = severity;
            Code = code;
            Message = message;
        }

        public override string ToString() => $"{Severity} {Code}: {Message}";
    }

    public sealed class ValidationReport
    {
        private readonly List<ValidationIssue> _issues = new List<ValidationIssue>();

        public string LevelId { get; }
        public IReadOnlyList<ValidationIssue> Issues => _issues;
        public bool HasErrors => _issues.Exists(i => i.Severity == IssueSeverity.Error);

        public ValidationReport(string levelId) => LevelId = levelId;

        internal void Add(IssueSeverity s, string code, string message) => _issues.Add(new ValidationIssue(s, code, message));

        public bool Has(string code) => _issues.Exists(i => i.Code == code);
    }

    /// <summary>Thông số mà trình kiểm tra cần, gom một chỗ (đều là số tạm của bản web chính, đọc từ cấu hình ở Data).</summary>
    public readonly struct ValidatorParams
    {
        public readonly BendPenaltyParams Penalty;
        public readonly PinParams Pins;
        public readonly StartGenParams StartGen;
        public readonly Func<Difficulty, TierParams> Tier;

        public ValidatorParams(BendPenaltyParams penalty, PinParams pins, StartGenParams startGen, Func<Difficulty, TierParams> tier)
        {
            Penalty = penalty;
            Pins = pins;
            StartGen = startGen;
            Tier = tier;
        }

        public static ValidatorParams WebDemo => new ValidatorParams(BendPenaltyParams.WebDemo, PinParams.WebDemo, StartGenParams.WebDemo, TierParams.WebDemo);
    }

    /// <summary>
    /// Kiểm tra hàng loạt một level (đặc tả mục Kiểm tra hàng loạt), dùng chung cho Level Editor, CI và test. Chạy lúc
    /// làm nội dung, không chạy lúc chơi, nên được cấp phát.
    /// </summary>
    public static class LevelValidator
    {
        private const float LockedPositionTolerance = 1e-4f;
        private const float StartRegenTolerance = 2e-5f;

        public static ValidationReport Validate(LevelModel level, ValidatorParams p)
        {
            var report = new ValidationReport(level.Id);
            var topo = new RingTopology(level);
            var solution = new SolutionBends(level, topo);
            var shape = new HermiteEdgeShape(topo, solution);
            var mask = new RegionMask(topo, shape, level.NodeCount);
            var scorer = new MatchScorer(level, topo, solution, p.Penalty);
            var board = new PinBoard(level, topo, solution, p.Pins);
            var relabeler = new PinRelabeler(level, topo, board);
            float solLine = level.Fold?.SolutionLine ?? 0f;
            float startLine = level.Fold?.StartLine ?? 0f;
            int n = level.NodeCount;

            var solMask = new byte[RegionMask.CellCount];
            var work = new byte[RegionMask.CellCount];
            mask.RenderPiece(level.Solution, solution.Bends, solLine, solMask);

            float self = scorer.Score(solMask, solMask, solution.Bends);
            if (self < level.WinThreshold) report.Add(IssueSeverity.Error, "solution_below_threshold", $"solution scores {self:P1}, below {level.WinThreshold:P0}");

            mask.RenderPiece(level.Start, level.StartBend, startLine, work);
            float start = scorer.Score(work, solMask, level.StartBend);
            if (start >= level.WinThreshold) report.Add(IssueSeverity.Error, "start_wins", $"start already scores {start:P1}");

            if (level.BendFree.Length > 0)
            {
                mask.RenderPiece(level.Solution, level.StartBend, solLine, work);
                float pinsOnly = scorer.Score(work, solMask, level.StartBend);
                if (pinsOnly >= level.WinThreshold)
                    report.Add(IssueSeverity.Error, "pins_only_wins", $"filling every pin without bending scores {pinsOnly:P1}");
            }

            var tier = p.Tier(level.Difficulty);
            int free = 0;
            for (int i = 0; i < n; i++) if (!level.Locked[i]) free++;
            if (free > tier.MaxFreeNodes) report.Add(IssueSeverity.Error, "too_many_free_nodes", $"{free} draggable nodes, {level.Difficulty} allows {tier.MaxFreeNodes}");

            for (int i = 0; i < n; i++)
            {
                if (level.Locked[i] && !board.OnFold(i) && Float2.Distance(level.Start[i], level.Solution[i]) > LockedPositionTolerance)
                    report.Add(IssueSeverity.Error, "locked_off_solution", $"locked node {i} does not start on its solution");
                if (level.Locked[i]) continue;
                for (int j = 0; j < n; j++)
                    if (Float2.Distance(level.Start[i], level.Solution[j]) < p.Pins.MagnetRadius)
                        report.Add(IssueSeverity.Error, "start_in_pin_magnet", $"node {i} starts inside the magnet of pin {j}");
            }

            // khoảng độ khớp ban đầu của mức: chỉ cảnh báo (màn gấp mức dễ đang có mâu thuẫn đã ghi trong đặc tả)
            double hi = Math.Min(tier.ScoreMax, level.WinThreshold - p.StartGen.BelowThreshold);
            double lo = Math.Min(tier.ScoreMin, hi - 0.05);
            if (!level.KeepStart && (start < lo - 1e-4 || start > hi + 1e-4))
                report.Add(IssueSeverity.Warning, "start_score_out_of_tier", $"start scores {start:P1}, {level.Difficulty} range is {lo:P0}–{hi:P0}");

            if (level.Fold != null && (startLine < p.StartGen.NeedleFloor - 1e-4f || startLine > level.Fold.SolutionLine + 1e-4f))
                report.Add(IssueSeverity.Error, "needle_start_out_of_range", $"needle starts at {startLine:0.###}, allowed {p.StartGen.NeedleFloor:0.###}–{level.Fold.SolutionLine:0.###}");

            CheckRegeneration(level, p, report);
            CheckAlternativePlacements(level, topo, solution, mask, scorer, board, relabeler, solMask, solLine, report);
            return report;
        }

        private static void CheckRegeneration(LevelModel level, ValidatorParams p, ValidationReport report)
        {
            if (level.KeepStart) return;
            var regen = StartPositionGenerator.Generate(level, p.Tier(level.Difficulty), p.StartGen, p.Penalty, level.BendFree,
                StartPositionGenerator.DefaultSeedKey(level));
            for (int i = 0; i < level.NodeCount; i++)
            {
                if (Float2.Distance(regen.Start[i], level.Start[i]) <= StartRegenTolerance) continue;
                report.Add(IssueSeverity.Error, "start_not_reproducible", $"regenerating from the seed moves node {i}; startPos was edited by hand or the generator changed");
                return;
            }
        }

        /// <summary>Mọi cách đặt xoay hoặc soi gương hợp lệ của vòng (node khóa đứng yên, mép gấp giữ mép gấp) đều thắng được.</summary>
        private static void CheckAlternativePlacements(LevelModel level, RingTopology topo, SolutionBends solution, RegionMask mask,
            MatchScorer scorer, PinBoard board, PinRelabeler relabeler, byte[] solMask, float solLine, ValidationReport report)
        {
            int nodes = level.NodeCount, n = topo.RingLength;
            var target = new int[nodes];
            var pos = new Float2[nodes];
            var perm = new int[nodes];
            var newBends = new float[n];
            var bends = new float[n];
            var scratch = new Float2[nodes];
            var work = new byte[RegionMask.CellCount];
            for (int mirror = 0; mirror < 2; mirror++)
            for (int rotate = 0; rotate < n; rotate++)
            {
                if (mirror == 0 && rotate == 0) continue;
                bool valid = true;
                for (int k = 0; k < n; k++)
                {
                    int kk = mirror == 1 ? ((rotate - k) % n + n) % n : (k + rotate) % n;
                    int from = topo.RingNode(k), to = topo.RingNode(kk);
                    target[from] = to;
                    if ((level.Locked[from] && to != from) || board.OnFold(from) != board.OnFold(to)) valid = false;
                }
                if (!valid) continue;

                for (int i = 0; i < nodes; i++) pos[i] = level.Solution[target[i]];
                Array.Copy(level.StartBend, bends, n);
                board.Evaluate(pos);
                if (!relabeler.TryRelabel(bends, perm, newBends))
                {
                    report.Add(IssueSeverity.Error, "alt_not_relabeled", $"{(mirror == 1 ? "mirror" : "rotate")} {rotate}: placement is not relabeled");
                    continue;
                }
                PinRelabeler.Permute(pos, perm, scratch);
                Array.Copy(newBends, bends, n);
                // người chơi uốn mọi cạnh có đích về đúng đích
                for (int k = 0; k < n; k++)
                    if (board.TryGetEdgeTarget(k, pos, solLine, out float h)) bends[k] = h;
                mask.RenderPiece(pos, bends, solLine, work);
                float score = scorer.Score(work, solMask, bends);
                if (score < level.WinThreshold)
                    report.Add(IssueSeverity.Error, "alt_cannot_win", $"{(mirror == 1 ? "mirror" : "rotate")} {rotate}: scores {score:P1} after bending");
            }
        }
    }
}

using System;
using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Outline;
using GraphNode.Core.Scoring;
using GraphNode.Core.Shapes;

namespace GraphNode.Core.Generation
{
    /// <summary>Kết quả sinh vị trí đầu; Level Editor ghi vào file level, game chỉ đọc.</summary>
    public sealed class StartResult
    {
        public Float2[] Start { get; }
        public float[] StartBend { get; }
        public int[] BendFree { get; }
        /// <summary>Vị trí kim lúc đầu (màn gấp), 0 nếu không phải màn gấp.</summary>
        public float StartLine { get; }
        /// <summary>Độ khớp người chơi thấy lúc đầu (đã trừ phạt độ uốn).</summary>
        public float StartScore { get; }
        /// <summary>Lần thử tốt nhất vẫn nằm ngoài khoảng độ khớp của mức độ khó bao nhiêu (0 là trong khoảng).</summary>
        public float RangeError { get; }
        /// <summary>Không lần thử nào giữ đủ khoảng cách giữa node và tới chốt; đã dùng lần thử cuối.</summary>
        public bool UsedFallback { get; }

        public StartResult(Float2[] start, float[] startBend, int[] bendFree, float startLine, float startScore, float rangeError, bool usedFallback)
        {
            Start = start;
            StartBend = startBend;
            BendFree = bendFree;
            StartLine = startLine;
            StartScore = startScore;
            RangeError = rangeError;
            UsedFallback = usedFallback;
        }
    }

    /// <summary>
    /// Sinh vị trí ban đầu và độ uốn ban đầu theo mức độ khó, tất định theo khóa hạt giống (đặc tả mục Độ khó). Node khóa
    /// ở lời giải; node kéo được lệch một quãng theo mức độ khó, cách nhau và cách chốt đủ xa; thử tới khi độ khớp ban đầu
    /// (đã trừ phạt độ uốn) nằm trong khoảng của mức. Chỉ Level Editor và trình kiểm tra dùng, không chạy lúc chơi.
    /// </summary>
    public static class StartPositionGenerator
    {
        /// <summary>Khóa hạt giống mặc định "id:mức" (như bản web), để sinh lại đúng kết quả đã ghi.</summary>
        public static string DefaultSeedKey(LevelModel level) => level.Id + ":" + level.Difficulty.ToString().ToLowerInvariant();

        /// <param name="bendFree">Cạnh phải tự uốn do người thiết kế ghi; null thì chọn theo mức độ khó.</param>
        public static StartResult Generate(LevelModel level, TierParams tier, StartGenParams gen, BendPenaltyParams penalty,
            int[] bendFree, string seedKey)
        {
            var topo = new RingTopology(level);
            var solution = new SolutionBends(level, topo);
            var shape = new HermiteEdgeShape(topo, solution);
            var mask = new RegionMask(topo, shape, level.NodeCount);
            var rand = new SeededRandom(seedKey);
            int n = level.NodeCount, ringN = topo.RingLength;
            var sol = level.Solution;
            var free = new bool[n];
            for (int i = 0; i < n; i++) free[i] = !level.Locked[i];
            var onFold = FoldNodes(level, topo);

            bendFree ??= PickBendFree(level, topo, solution, free, tier, gen);
            var startBend = (float[])solution.Bends.Clone();
            foreach (int k in bendFree) startBend[k] = 0f;

            var scorer = new MatchScorer(bendFree, topo, solution, penalty);
            float solLine = level.Fold?.SolutionLine ?? 0f;
            var solMask = new byte[RegionMask.CellCount];
            var work = new byte[RegionMask.CellCount];
            mask.RenderPiece(sol, solution.Bends, solLine, solMask);
            float bendPen = scorer.BendPenalty(startBend);

            if (level.KeepStart)
            {
                mask.RenderPiece(level.Start, startBend, solLine, work);
                float keep = Math.Max(0f, MatchScorer.Iou(work, solMask) - bendPen);
                return new StartResult((Float2[])level.Start.Clone(), startBend, bendFree, level.Fold?.StartLine ?? 0f, keep, 0f, false);
            }

            double hi = Math.Min(tier.ScoreMax, level.WinThreshold - gen.BelowThreshold);
            double lo = Math.Min(tier.ScoreMin, hi - 0.05);
            var fold = level.Fold;
            bool isY = fold != null && fold.Axis == FoldAxis.Y;

            // kim lúc đầu lùi khỏi trục lời giải một quãng theo mức, nhưng không lùi qua node khóa và không quá sàn
            double x0 = 0;
            if (fold != null)
            {
                double lockMax = gen.NeedleFloor;
                for (int k = 0; k < n; k++)
                    if (level.Locked[k] && !onFold[k]) lockMax = Math.Max(lockMax, Across(sol[k], isY) + 0.02);
                x0 = Math.Min(fold.SolutionLine, Math.Max(lockMax, fold.SolutionLine - (tier.NeedleMin + rand.NextDouble() * (tier.NeedleMax - tier.NeedleMin))));
            }

            double scale = 1, bestErr = 9;
            Float2[] best = null, last = null;
            double margin = gen.FabricMargin;
            for (int tries = 0; tries < gen.MaxTries; tries++)
            {
                var pos = new Float2[n];
                for (int k = 0; k < n; k++)
                {
                    var p = sol[k];
                    // mọi node đều rút một số để dãy ngẫu nhiên không đổi khi đổi node khóa (giống bản web)
                    double d = (tier.DistMin + rand.NextDouble() * (tier.DistMax - tier.DistMin)) * scale;
                    if (onFold[k])
                    {
                        if (isY) pos[k] = new Float2(free[k] ? (float)Clamp(p.X + (rand.NextDouble() < 0.5 ? -d : d), margin, 1 - margin) : p.X, (float)x0);
                        else pos[k] = new Float2((float)x0, free[k] ? (float)Clamp(p.Y + (rand.NextDouble() < 0.5 ? -d : d), margin, 1 - margin) : p.Y);
                        continue;
                    }
                    if (!free[k])
                    {
                        pos[k] = p;
                        continue;
                    }
                    double a = rand.NextDouble() * Math.PI * 2;
                    double qx = Clamp(p.X + Math.Cos(a) * d, margin, 1 - margin);
                    double qy = Clamp(p.Y + Math.Sin(a) * d, margin, 1 - margin);
                    if (fold != null)
                    {
                        // node thường ở nửa người chơi xếp, trước kim
                        if (isY) qy = Clamp(qy, 2 * x0 - 0.98, x0 - 0.02);
                        else qx = Clamp(qx, 2 * x0 - 0.98, x0 - 0.02);
                    }
                    pos[k] = new Float2((float)qx, (float)qy);
                }
                last = pos;
                if (!Spaced(pos, sol, free, gen)) continue;

                mask.RenderPiece(pos, startBend, fold != null ? (float)x0 : 0f, work);
                double v = Math.Max(0, MatchScorer.Iou(work, solMask) - bendPen);
                double err = v > hi ? v - hi : (v < lo ? lo - v : 0);
                if (err < bestErr)
                {
                    bestErr = err;
                    best = pos;
                }
                if (err == 0) break;
                scale = Clamp(scale * (v > hi ? 1.06 : 0.95), 0.5, 2.5);
            }

            bool fallback = best == null;
            best ??= last;
            mask.RenderPiece(best, startBend, fold != null ? (float)x0 : 0f, work);
            float score = Math.Max(0f, MatchScorer.Iou(work, solMask) - bendPen);
            return new StartResult(best, startBend, bendFree, (float)x0, score, fallback ? 0f : (float)bestErr, fallback);
        }

        /// <summary>Chọn cạnh phải tự uốn: cạnh cong rõ, chạm ít nhất một node kéo được, ưu tiên cong nhiều và dài.</summary>
        private static int[] PickBendFree(LevelModel level, RingTopology topo, SolutionBends solution, bool[] free, TierParams tier, StartGenParams gen)
        {
            var cands = new List<(int k, double score)>();
            int ringN = topo.RingLength;
            for (int k = 0; k < ringN; k++)
            {
                if (!topo.InFoldChain(k)) continue;
                int a = topo.RingNode(k), b = topo.RingNode((k + 1) % ringN);
                double sh = Math.Abs(solution.Bends[k]);
                if (sh < gen.MinBendForBendFree) continue;
                if (!free[a] && !free[b]) continue;
                double len = Float2.Distance(level.Solution[a], level.Solution[b]);
                cands.Add((k, sh * (0.6 + len)));
            }
            // sắp xếp ổn định theo điểm giảm dần, như Array.prototype.sort của bản web. Hình đối xứng cho hai cạnh cùng điểm;
            // sai số float có thể làm lệch thứ tự, nên điểm gần bằng nhau coi là bằng và giữ thứ tự trên vòng.
            const double tie = 1e-6;
            var ordered = new List<(int k, double score)>(cands);
            ordered.Sort((u, v) =>
            {
                if (System.Math.Abs(v.score - u.score) > tie) return v.score.CompareTo(u.score);
                return u.k.CompareTo(v.k);
            });
            int take = Math.Min(Math.Max(1, tier.MaxBendEdges), ordered.Count);
            var result = new int[take];
            for (int i = 0; i < take; i++) result[i] = ordered[i].k;
            return result;
        }

        private static bool Spaced(Float2[] pos, Float2[] sol, bool[] free, StartGenParams gen)
        {
            int n = pos.Length;
            for (int a = 0; a < n; a++)
            for (int b = a + 1; b < n; b++)
            {
                if (!free[a] && !free[b]) continue;
                if (Float2.Distance(pos[a], pos[b]) < gen.MinGap) return false;
            }
            for (int i = 0; i < n; i++)
            {
                if (!free[i]) continue;
                for (int j = 0; j < n; j++)
                    if (Float2.Distance(pos[i], sol[j]) < gen.PinClear) return false;
            }
            return true;
        }

        private static bool[] FoldNodes(LevelModel level, RingTopology topo)
        {
            var on = new bool[level.NodeCount];
            if (level.Fold == null) return on;
            foreach (var c in level.Fold.Chains)
            {
                on[topo.RingNode(c.From % topo.RingLength)] = true;
                on[topo.RingNode(c.To % topo.RingLength)] = true;
            }
            return on;
        }

        private static double Across(Float2 p, bool isY) => isY ? p.Y : p.X;
        private static double Clamp(double v, double a, double b) => v < a ? a : (v > b ? b : v);
    }
}

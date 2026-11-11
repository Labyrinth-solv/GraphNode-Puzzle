using GraphNode.Core.Geometry;
using GraphNode.Core.Levels;
using GraphNode.Core.Rules;
using GraphNode.Core.Session;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Chơi trọn màn qua đúng các lệnh mà lớp input sẽ gọi (bắt đầu kéo, kéo, thả): đặt node vào chốt, uốn dây, kéo kim.
    /// </summary>
    public sealed class PuzzleStateTests
    {
        private static PuzzleState Make(string id) => new PuzzleState(WebDemoFixtures.Load(id), PuzzleConfig.WebDemo);

        /// <summary>Kéo node tới gần chốt (trong vùng hút) rồi thả.</summary>
        private static ReleaseResult PlaceNode(PuzzleState s, int node, int pin)
        {
            s.BeginNodeDrag(node);
            s.DragNode(s.Level.Solution[pin] + new Float2(0.01f, -0.008f));
            return s.EndNodeDrag(false, true);
        }

        /// <summary>Kéo giữa dây theo pháp tuyến đúng một quãng bằng độ uốn muốn có rồi thả.</summary>
        private static ReleaseResult BendEdge(PuzzleState s, int k, float bend)
        {
            int n = s.Topology.RingLength;
            var a = s.Positions[s.Topology.RingNode(k)];
            var b = s.Positions[s.Topology.RingNode((k + 1) % n)];
            var mid = Float2.Lerp(a, b, 0.5f);
            var t = (b - a).Normalized();
            var normal = new Float2(-t.Y, t.X);
            s.BeginEdgeDrag(k, mid, 0.5f);
            s.DragEdge(mid + normal * (bend - s.Bends[k]));
            return s.EndEdgeDrag(false, true);
        }

        private static ReleaseResult MoveNeedle(PuzzleState s, float to)
        {
            var from = new Float2(s.FoldLine, 0.5f);
            s.BeginNeedleDrag(from);
            s.DragNeedle(new Float2(to, 0.5f));
            return s.EndNeedleDrag(false, true);
        }

        [Test]
        public void Scoop_PlacingPinsThenBending_Wins()
        {
            var s = Make("scoop");
            Assert.Less(s.Score, s.Level.WinThreshold);
            ReleaseResult last = default;
            for (int i = 0; i < s.Level.NodeCount; i++)
            {
                if (s.Level.Locked[i]) continue;
                last = PlaceNode(s, i, i);
                Assert.IsTrue(last.Snapped, $"node {i} snaps onto its pin");
                Assert.AreEqual(i, last.Pin);
            }
            Assert.IsTrue(s.Pins.AllFilled);
            Assert.IsFalse(last.Won, "pins filled but the bend edge still straight must not win");

            ReleaseResult bend = default;
            foreach (int k in s.Level.BendFree)
            {
                Assert.IsTrue(s.Pins.TryGetEdgeTarget(k, s.Positions, s.FoldLine, out float h));
                bend = BendEdge(s, k, h);
                Assert.IsTrue(bend.Snapped);
                Assert.IsTrue(bend.ContourSnap, "a straight edge bent onto the outline is a contour snap");
                Assert.AreEqual(h, s.Bends[k], 1e-7f);
            }
            Assert.IsTrue(bend.Won);
            Assert.IsTrue(s.Won);
            Assert.GreaterOrEqual(s.Score, s.Level.WinThreshold);
        }

        [Test]
        public void Leaves_RotatedPlacement_RelabelsInsideTheStateAndWins()
        {
            var s = Make("flower_leaves");
            int n = s.Topology.RingLength;
            // xoay một bước: node ring[k] vào chốt ring[k+1]
            ReleaseResult r = default;
            for (int k = 0; k < n; k++) r = PlaceNode(s, s.Topology.RingNode(k), s.Topology.RingNode((k + 1) % n));
            Assert.IsTrue(r.Relabeled, "last pin filled in rotated order relabels");
            for (int i = 0; i < s.Level.NodeCount; i++)
                Assert.Less(Float2.Distance(s.Positions[i], s.Level.Solution[i]), 1e-6f);
            ReleaseResult bend = default;
            foreach (int k in s.Level.BendFree)
            {
                Assert.IsTrue(s.Pins.TryGetEdgeTarget(k, s.Positions, s.FoldLine, out float h));
                bend = BendEdge(s, k, h);
            }
            Assert.IsTrue(bend.Won);
        }

        [Test]
        public void Heart_NeedleThenPinsThenBend_Wins()
        {
            var s = Make("heart");
            var needle = MoveNeedle(s, s.Level.Fold.SolutionLine + 0.01f);
            Assert.IsTrue(needle.Snapped, "needle released inside its magnet snaps onto the fold axis");
            Assert.AreEqual(s.Level.Fold.SolutionLine, s.FoldLine, 1e-7f);
            for (int i = 0; i < s.Level.NodeCount; i++)
                if (!s.Level.Locked[i]) PlaceNode(s, i, i);
            Assert.IsTrue(s.Pins.AllFilled);
            ReleaseResult bend = default;
            foreach (int k in s.Level.BendFree)
            {
                Assert.IsTrue(s.Pins.TryGetEdgeTarget(k, s.Positions, s.FoldLine, out float h));
                bend = BendEdge(s, k, h);
            }
            Assert.IsTrue(bend.Won);
        }

        [Test]
        public void FoldEdgeNode_StaysOnTheNeedle()
        {
            var s = Make("heart");
            int foldNode = -1;
            for (int i = 0; i < s.Level.NodeCount; i++)
                if (!s.Level.Locked[i] && s.Pins.OnFold(i)) foldNode = i;
            Assume.That(foldNode >= 0);
            s.BeginNodeDrag(foldNode);
            s.DragNode(new Float2(0.1f, 0.6f));
            Assert.AreEqual(s.FoldLine, s.Positions[foldNode].X, 1e-7f, "fold-edge node slides along the needle only");
        }

        [Test]
        public void TapWithoutMoving_ChangesNothing()
        {
            var s = Make("scoop");
            int free = System.Array.IndexOf(s.Level.Locked, false);
            var before = s.Positions[free];
            s.BeginNodeDrag(free);
            var r = s.EndNodeDrag(false, false);
            Assert.IsFalse(r.Applied);
            Assert.AreEqual(before, s.Positions[free]);
        }

        [Test]
        public void LockedNode_CannotBeDragged()
        {
            var s = Make("scoop");
            int locked = System.Array.IndexOf(s.Level.Locked, true);
            s.BeginNodeDrag(locked);
            Assert.AreEqual(-1, s.DraggingNode);
        }

        [Test]
        public void Reset_RestoresStart()
        {
            var s = Make("scoop");
            int free = System.Array.IndexOf(s.Level.Locked, false);
            PlaceNode(s, free, free);
            s.Reset();
            Assert.AreEqual(s.Level.Start[free], s.Positions[free]);
            Assert.IsFalse(s.Won);
        }

        [Test]
        public void Hint_AtStart_PointsAtTheFarthestFreeNode()
        {
            var s = Make("scoop");
            var hint = s.PickHint();
            Assert.AreEqual(HintKind.Node, hint.Kind);
            float best = -1;
            int expected = -1;
            for (int i = 0; i < s.Level.NodeCount; i++)
            {
                if (s.Level.Locked[i]) continue;
                float d = Float2.Distance(s.Positions[i], s.Level.Solution[i]);
                if (d > best) { best = d; expected = i; }
            }
            Assert.AreEqual(expected, hint.Index);
        }

        [Test]
        public void Hint_AfterPinsFilled_PointsAtTheEdgeToBend()
        {
            var s = Make("scoop");
            for (int i = 0; i < s.Level.NodeCount; i++)
                if (!s.Level.Locked[i]) PlaceNode(s, i, i);
            var hint = s.PickHint();
            Assert.AreEqual(HintKind.Edge, hint.Kind);
            CollectionAssert.Contains(s.Level.BendFree, hint.Index);
        }

        [Test]
        public void Refresh_DoesNotAllocateWhileDragging()
        {
            var s = Make("flower_bloom");
            int free = System.Array.IndexOf(s.Level.Locked, false);
            s.BeginNodeDrag(free);
            s.DragNode(new Float2(0.4f, 0.4f));
            s.Refresh();
            long before = System.GC.GetAllocatedBytesForCurrentThread();
            for (int i = 0; i < 30; i++)
            {
                s.DragNode(new Float2(0.4f + i * 0.001f, 0.4f));
                s.Refresh();
            }
            long allocated = System.GC.GetAllocatedBytesForCurrentThread() - before;
            Assert.AreEqual(0, allocated, "drag and refresh must not allocate");
        }
    }
}

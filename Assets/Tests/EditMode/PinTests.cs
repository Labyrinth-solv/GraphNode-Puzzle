using System.Collections.Generic;
using GraphNode.Core.Constraints;
using GraphNode.Core.Geometry;
using GraphNode.Core.Outline;
using GraphNode.Core.Pins;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Chốt, đánh số lại theo chốt, đích độ uốn và nam châm (đặc tả mục Chốt trên viền mẫu, Uốn cạnh, Kiểm thử).
    /// Các cách đặt xoay và soi gương lấy đúng danh sách của alt-solve.js trong bản web chính.
    /// </summary>
    public sealed class PinTests
    {
        private static IEnumerable<string> Levels() => WebDemoFixtures.LevelIds();

        private sealed class PinRig
        {
            public readonly WebDemoFixtures.Rig Core;
            public readonly PinBoard Board;
            public readonly PinRelabeler Relabeler;

            public PinRig(string id)
            {
                Core = new WebDemoFixtures.Rig(id);
                Board = new PinBoard(Core.Level, Core.Topo, Core.Solution, PinParams.WebDemo);
                Relabeler = new PinRelabeler(Core.Level, Core.Topo, Board);
            }
        }

        [TestCaseSource(nameof(Levels))]
        public void Solution_FillsEveryPinInOrder(string id)
        {
            var rig = new PinRig(id);
            rig.Board.Evaluate(rig.Core.Level.Solution);
            Assert.IsTrue(rig.Board.AllFilled, $"{id}: solution must fill every pin");
            for (int i = 0; i < rig.Core.Level.NodeCount; i++) Assert.AreEqual(i, rig.Board.NodeToPin[i]);
            int n = rig.Core.Level.NodeCount;
            Assert.IsFalse(rig.Relabeler.TryRelabel(rig.Core.Solution.Bends, new int[n], new float[rig.Core.Topo.RingLength]),
                $"{id}: solution order needs no relabel");
        }

        [TestCaseSource(nameof(Levels))]
        public void Start_OnlyLockedNodesSitOnPins(string id)
        {
            var rig = new PinRig(id);
            var level = rig.Core.Level;
            rig.Board.Evaluate(level.Start);
            int locked = 0;
            for (int i = 0; i < level.NodeCount; i++)
            {
                // node khóa trên mép gấp chạy theo kim, lúc đầu kim lệch trục nên chưa ở chốt
                if (!level.Locked[i] || rig.Board.OnFold(i)) continue;
                locked++;
                Assert.AreEqual(i, rig.Board.NodeToPin[i], $"{id}: locked node {i} must sit on its own pin");
            }
            Assert.AreEqual(locked, rig.Board.FilledCount, $"{id}: free nodes must start off the pins");
        }

        [TestCaseSource(nameof(Levels))]
        public void EdgeTarget_AtSolution_IsSolutionBend(string id)
        {
            var rig = new PinRig(id);
            var level = rig.Core.Level;
            for (int k = 0; k < rig.Core.Topo.RingLength; k++)
            {
                bool has = rig.Board.TryGetEdgeTarget(k, level.Solution, rig.Core.SolutionLine, out float h);
                Assert.AreEqual(rig.Core.Topo.InFoldChain(k), has, $"{id} edge {k}: target exists only on cut edges");
                if (has) Assert.AreEqual(rig.Core.Solution.Bends[k], h, 1e-7f, $"{id} edge {k} target");
            }
        }

        // id, soi gương, bước xoay (alt-solve.js)
        private static readonly object[] AltCases =
        {
            new object[] { "flower_leaves", false, 1 },
            new object[] { "flower_leaves", false, 3 },
            new object[] { "flower_leaves", true, 0 },
            new object[] { "flower_leaves", false, 0 },
            new object[] { "shirt", true, 2 },
            new object[] { "bunny_bow", true, 2 },
            new object[] { "cone", true, 1 },
        };

        [TestCaseSource(nameof(AltCases))]
        public void RotatedOrMirroredPlacement_RelabelsAndWins(string id, bool mirror, int rotate)
        {
            var rig = new PinRig(id);
            var level = rig.Core.Level;
            var topo = rig.Core.Topo;
            int nodes = level.NodeCount, n = topo.RingLength;

            // node ring[k] đặt vào chốt ring[kk] theo phép xoay hoặc soi gương của vòng
            var target = new int[nodes];
            for (int k = 0; k < n; k++)
            {
                int kk = mirror ? ((rotate - k) % n + n) % n : (k + rotate) % n;
                target[topo.RingNode(k)] = topo.RingNode(kk);
            }
            var pos = new Float2[nodes];
            for (int i = 0; i < nodes; i++) pos[i] = level.Locked[i] ? level.Solution[i] : level.Solution[target[i]];
            var bends = (float[])level.StartBend.Clone();

            rig.Board.Evaluate(pos);
            Assert.IsTrue(rig.Board.AllFilled, $"{id}: every pin filled");
            var perm = new int[nodes];
            var newBends = new float[n];
            bool identity = !mirror && rotate == 0;
            bool relabeled = rig.Relabeler.TryRelabel(bends, perm, newBends);
            Assert.AreEqual(!identity, relabeled, $"{id}: relabel expected only for a non-identity placement");
            if (relabeled)
            {
                PinRelabeler.Permute(pos, perm, new Float2[nodes]);
                bends = newBends;
            }
            for (int i = 0; i < nodes; i++)
                Assert.Less(Float2.Distance(pos[i], level.Solution[i]), 1e-6f, $"{id}: node {i} back on its own pin after relabel");

            // người chơi uốn từng cạnh phải tự uốn về đích theo chốt
            foreach (int k in level.BendFree)
            {
                Assert.IsTrue(rig.Board.TryGetEdgeTarget(k, pos, rig.Core.SolutionLine, out float h), $"{id} edge {k} has a target");
                bends[k] = h;
            }
            var sol = new byte[RegionMask.CellCount];
            var got = new byte[RegionMask.CellCount];
            rig.Core.Mask.RenderPiece(level.Solution, rig.Core.Solution.Bends, rig.Core.SolutionLine, sol);
            rig.Core.Mask.RenderPiece(pos, bends, rig.Core.SolutionLine, got);
            Assert.GreaterOrEqual(rig.Core.Scorer.Score(got, sol, bends), level.WinThreshold, $"{id}: alternative placement must win");
        }

        [Test]
        public void CrossedPlacement_IsNotRelabeled()
        {
            // viên kem: đổi chỗ node 0 và 3 (không liền nhau) không phải xoay hay soi gương của vòng
            var rig = new PinRig("scoop");
            var level = rig.Core.Level;
            var pos = (Float2[])level.Solution.Clone();
            pos[0] = level.Solution[3];
            pos[3] = level.Solution[0];
            rig.Board.Evaluate(pos);
            Assert.IsTrue(rig.Board.AllFilled);
            Assert.IsFalse(rig.Relabeler.TryRelabel(level.StartBend, new int[level.NodeCount], new float[rig.Core.Topo.RingLength]));
            Assert.IsFalse(rig.Board.TryGetEdgeTarget(0, pos, 0f, out _), "edge between non-adjacent pins has no bend target");
        }

        [Test]
        public void PinMagnet_PullsTowardFreePinAndSkipsTakenOnes()
        {
            var rig = new PinRig("scoop");
            var level = rig.Core.Level;
            var magnet = new PinMagnet(level, rig.Board);
            var pos = (Float2[])level.Start.Clone();
            var pin = level.Solution[0];
            float r = PinParams.WebDemo.MagnetRadius;

            // ở giữa bán kính hút: kéo về 50% × (1 − 0,5) = 25% quãng tới chốt
            var proposed = pin + new Float2(r * 0.5f, 0f);
            var moved = magnet.Apply(new NodeDragContext(0, pos, 0f), proposed);
            Assert.IsTrue(magnet.InMagnet);
            Assert.AreEqual(0, magnet.MagnetPin);
            Assert.AreEqual(pin.X + r * 0.5f * 0.75f, moved.X, 1e-6f);

            // ngoài bán kính hút: không đổi
            var far = pin + new Float2(r * 1.2f, 0f);
            Assert.AreEqual(far, magnet.Apply(new NodeDragContext(0, pos, 0f), far));
            Assert.IsFalse(magnet.InMagnet);

            // chốt đã có node khác cắm thì bỏ qua
            pos[3] = pin;
            magnet.Apply(new NodeDragContext(0, pos, 0f), proposed);
            Assert.AreNotEqual(0, magnet.MagnetPin);
        }

        [Test]
        public void BendMagnet_ClampsPullsAndSnapsStraight()
        {
            var m = new BendMagnet(BendParams.WebDemo);
            // bản web 2 đã duyệt kẹp ±0,35 (cung võng sâu như Cụm cỏ −0,21)
            Assert.AreEqual(0.35f, m.Apply(0.5f, false, 0f).Bend, 1e-7f, "clamped to the limit");
            Assert.AreEqual(-0.21f, m.Apply(-0.21f, false, 0f).Bend, 1e-7f, "deep sag no longer clipped");
            var straight = m.Apply(0.01f, false, 0f);
            Assert.AreEqual(0f, straight.Bend);
            Assert.IsTrue(straight.SnappedStraight);

            // lệch đích 0,0175 (nửa bán kính hút 0,035): kéo về 50% × 0,5 = 25%
            var pulled = m.Apply(0.16f - 0.0175f, true, 0.16f);
            Assert.IsTrue(pulled.InMagnet);
            Assert.AreEqual(0.16f - 0.0175f * 0.75f, pulled.Bend, 1e-6f);

            // không có đích thì không hút
            Assert.AreEqual(0.1f, m.Apply(0.1f, false, 0.11f).Bend, 1e-7f);
        }
    }
}

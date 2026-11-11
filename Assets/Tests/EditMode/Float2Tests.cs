using GraphNode.Core.Geometry;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    public sealed class Float2Tests
    {
        [Test]
        public void Arithmetic_MatchesComponentWise()
        {
            var a = new Float2(0.25f, 0.5f);
            var b = new Float2(0.5f, -0.25f);
            Assert.AreEqual(new Float2(0.75f, 0.25f), a + b);
            Assert.AreEqual(new Float2(-0.25f, 0.75f), a - b);
            Assert.AreEqual(new Float2(0.5f, 1f), a * 2f);
            Assert.AreEqual(new Float2(0.125f, 0.25f), a / 2f);
        }

        [Test]
        public void DotCrossDistance()
        {
            var x = new Float2(1f, 0f);
            var y = new Float2(0f, 1f);
            Assert.AreEqual(0f, Float2.Dot(x, y));
            Assert.AreEqual(1f, Float2.Cross(x, y));
            Assert.AreEqual(-1f, Float2.Cross(y, x));
            Assert.AreEqual(5f, Float2.Distance(new Float2(0f, 0f), new Float2(3f, 4f)), 1e-6f);
        }

        [Test]
        public void Normalized_ZeroVectorStaysZero()
        {
            Assert.AreEqual(Float2.Zero, Float2.Zero.Normalized());
            Assert.AreEqual(1f, new Float2(3f, 4f).Normalized().Length, 1e-6f);
        }

        [Test]
        public void Lerp_Endpoints()
        {
            var a = new Float2(0.1f, 0.2f);
            var b = new Float2(0.9f, 0.6f);
            Assert.AreEqual(a, Float2.Lerp(a, b, 0f));
            Assert.AreEqual(b, Float2.Lerp(a, b, 1f));
            Assert.AreEqual(0.5f, Float2.Lerp(a, b, 0.5f).X, 1e-6f);
        }
    }
}

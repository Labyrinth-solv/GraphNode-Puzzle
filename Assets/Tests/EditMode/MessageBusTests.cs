using System;
using GraphNode.Foundation.Messaging;
using NUnit.Framework;

namespace GraphNode.Tests.EditMode
{
    public sealed class MessageBusTests
    {
        private readonly struct Ping
        {
            public readonly int Value;
            public Ping(int value) => Value = value;
        }

        [Test]
        public void Publish_ReachesSubscribersOfThatTypeOnly()
        {
            var bus = new MessageBus();
            int got = 0, strings = 0;
            bus.Subscribe<Ping>(p => got += p.Value);
            bus.Subscribe<string>(_ => strings++);
            bus.Publish(new Ping(3));
            Assert.AreEqual(3, got);
            Assert.AreEqual(0, strings);
        }

        [Test]
        public void Dispose_StopsDelivery()
        {
            var bus = new MessageBus();
            int got = 0;
            var sub = bus.Subscribe<Ping>(_ => got++);
            sub.Dispose();
            sub.Dispose();
            bus.Publish(new Ping(1));
            Assert.AreEqual(0, got);
        }

        [Test]
        public void UnsubscribeDuringPublish_IsSafe()
        {
            var bus = new MessageBus();
            int first = 0, second = 0;
            IDisposable self = null;
            self = bus.Subscribe<Ping>(_ => { first++; self.Dispose(); });
            bus.Subscribe<Ping>(_ => second++);
            bus.Publish(new Ping(1));
            bus.Publish(new Ping(1));
            Assert.AreEqual(1, first);
            Assert.AreEqual(2, second);
        }

        [Test]
        public void SubscribeDuringPublish_StartsFromNextPublish()
        {
            var bus = new MessageBus();
            int late = 0;
            bool added = false;
            bus.Subscribe<Ping>(_ =>
            {
                if (added) return;
                added = true;
                bus.Subscribe<Ping>(__ => late++);
            });
            bus.Publish(new Ping(1));
            Assert.AreEqual(0, late);
            bus.Publish(new Ping(1));
            Assert.AreEqual(1, late);
        }

        [Test]
        public void Publish_WithoutSubscribers_DoesNothing()
        {
            Assert.DoesNotThrow(() => new MessageBus().Publish(new Ping(1)));
        }
    }
}

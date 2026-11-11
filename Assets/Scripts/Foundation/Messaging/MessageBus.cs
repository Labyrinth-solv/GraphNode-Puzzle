using System;
using System.Collections.Generic;

namespace GraphNode.Foundation.Messaging
{
    /// <summary>
    /// Cài đặt đơn luồng (main thread). Publish không cấp phát: duyệt theo chỉ số, hủy đăng ký giữa lúc phát chỉ
    /// đánh dấu rỗng rồi dọn sau, nên người nghe được phép tự hủy trong handler.
    /// </summary>
    public sealed class MessageBus : IMessageBus
    {
        private readonly Dictionary<Type, object> _channels = new Dictionary<Type, object>();

        public IDisposable Subscribe<T>(Action<T> handler)
        {
            if (handler == null) throw new ArgumentNullException(nameof(handler));
            return GetChannel<T>().Add(handler);
        }

        public void Publish<T>(T message)
        {
            if (_channels.TryGetValue(typeof(T), out var channel)) ((Channel<T>)channel).Publish(message);
        }

        private Channel<T> GetChannel<T>()
        {
            if (!_channels.TryGetValue(typeof(T), out var channel))
            {
                channel = new Channel<T>();
                _channels.Add(typeof(T), channel);
            }
            return (Channel<T>)channel;
        }

        private sealed class Channel<T>
        {
            private readonly List<Action<T>> _handlers = new List<Action<T>>();
            private int _publishDepth;
            private bool _dirty;

            public IDisposable Add(Action<T> handler)
            {
                _handlers.Add(handler);
                return new Subscription(this, handler);
            }

            public void Publish(T message)
            {
                _publishDepth++;
                try
                {
                    // người nghe đăng ký thêm trong lúc phát chỉ nhận từ lần phát sau
                    int count = _handlers.Count;
                    for (int i = 0; i < count; i++) _handlers[i]?.Invoke(message);
                }
                finally
                {
                    _publishDepth--;
                    if (_publishDepth == 0 && _dirty)
                    {
                        _handlers.RemoveAll(h => h == null);
                        _dirty = false;
                    }
                }
            }

            private void Remove(Action<T> handler)
            {
                int i = _handlers.IndexOf(handler);
                if (i < 0) return;
                if (_publishDepth > 0)
                {
                    _handlers[i] = null;
                    _dirty = true;
                }
                else _handlers.RemoveAt(i);
            }

            private sealed class Subscription : IDisposable
            {
                private Channel<T> _channel;
                private Action<T> _handler;

                public Subscription(Channel<T> channel, Action<T> handler)
                {
                    _channel = channel;
                    _handler = handler;
                }

                public void Dispose()
                {
                    if (_channel == null) return;
                    _channel.Remove(_handler);
                    _channel = null;
                    _handler = null;
                }
            }
        }
    }
}

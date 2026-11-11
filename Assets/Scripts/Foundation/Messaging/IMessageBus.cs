using System;

namespace GraphNode.Foundation.Messaging
{
    /// <summary>
    /// Message bus có kiểu: module nói chuyện qua thông điệp thay vì tham chiếu nhau (Gameplay không biết Meta).
    /// </summary>
    public interface IMessageBus
    {
        /// <summary>Đăng ký nghe; Dispose kết quả để hủy (gắn với vòng đời của đối tượng nghe).</summary>
        IDisposable Subscribe<T>(Action<T> handler);

        void Publish<T>(T message);
    }
}

using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Contracts;
using UnityEngine;

namespace GraphNode.App.Scopes
{
    /// <summary>
    /// Lớp nối của scene Home. M0 chưa có tiệm may hay giao diện (giao diện do người dùng làm); chỉ giữ chỗ để
    /// luồng scene chạy được và để Meta nối vào ở M4.
    /// </summary>
    public sealed class HomeScope : MonoBehaviour
    {
        private AppScope _app;

        private void Awake()
        {
            _app = AppScope.EnsureCreated();
        }

        /// <summary>Vào một màn (Meta gọi ở M4; test và công cụ thử gọi bây giờ).</summary>
        public UniTask StartLevelAsync(string levelId)
        {
            // Đổi scene chạy theo token của phạm vi App, không theo token của Home: chính lần đổi scene hủy Home,
            // dùng token của Home sẽ tự hủy tác vụ giữa chừng dù scene mới đã nạp xong.
            return _app.Flow.StartLevelAsync(new LevelRequest(levelId), _app.LifetimeToken);
        }
    }
}

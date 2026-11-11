using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Contracts;
using UnityEngine;

namespace GraphNode.App.Scopes
{
    /// <summary>
    /// Lớp nối của scene Home. Chưa có tiệm may hay giao diện (giao diện do người dùng làm); Meta nối vào ở M4.
    /// Bản thử M2: Home tự vào một màn để chơi được trên máy khi chưa có nút bấm.
    /// </summary>
    public sealed class HomeScope : MonoBehaviour
    {
        [Tooltip("Bản thử M2: tự vào màn này khi tới Home (để trống thì không tự vào). Bỏ khi Home có giao diện.")]
        [SerializeField] private string devAutoStartLevel = "";

        /// <summary>Test luồng scene tắt việc tự vào màn để tự điều khiển.</summary>
        public static bool SuppressDevAutoStart { get; set; }

        private AppScope _app;

        private void Awake()
        {
            _app = AppScope.EnsureCreated();
        }

        private void Start()
        {
            if (!SuppressDevAutoStart && !string.IsNullOrEmpty(devAutoStartLevel)) StartLevelAsync(devAutoStartLevel).Forget();
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

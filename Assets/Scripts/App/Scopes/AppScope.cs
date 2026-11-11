using System.Threading;
using GraphNode.App.Flow;
using GraphNode.Foundation.Messaging;
using GraphNode.Foundation.Services;
using GraphNode.Services;
using UnityEngine;

namespace GraphNode.App.Scopes
{
    /// <summary>
    /// Phạm vi App: dịch vụ sống suốt phiên, dựng một lần, không bị hủy khi đổi scene. Đây là nơi duy nhất khởi tạo
    /// dịch vụ (nối thủ công qua hàm khởi tạo). Chỉ các lớp nối trong App đọc <see cref="Current"/>; module tính năng
    /// nhận dịch vụ qua tham số, không tự tìm.
    /// </summary>
    public sealed class AppScope
    {
        /// <summary>Khóa cứng 60 fps (đặc tả mục Nền tảng; mặc định Unity trên mobile là 30).</summary>
        public const int TargetFrameRate = 60;

        public static AppScope Current { get; private set; }

        public IMessageBus Bus { get; }
        public IAudioService Audio { get; }
        public IHaptics Haptics { get; }
        public ISaveService Save { get; }
        public IAnalytics Analytics { get; }
        public ILocalizer Localizer { get; }
        public IClock Clock { get; }
        public ISceneTransition Transition { get; }
        public IGameFlow Flow { get; }

        /// <summary>Hủy khi thoát game; mọi tác vụ sống theo phạm vi App gắn token này.</summary>
        public CancellationToken LifetimeToken => _host.destroyCancellationToken;

        private readonly AppScopeHost _host;

        private AppScope(AppScopeHost host)
        {
            _host = host;
            Bus = new MessageBus();
            Audio = new NullAudioService();
            Haptics = new NullHaptics();
            Save = new MemorySaveService();
            Analytics = new NullAnalytics();
            Localizer = new KeyLocalizer();
            Clock = new UnityClock();
            Transition = new SceneTransition();
            Flow = new GameFlow(Transition);
        }

        /// <summary>
        /// Dựng phạm vi App nếu chưa có. Boot gọi đầu tiên; Home và Gameplay cũng gọi để bấm Play thẳng từ scene đó
        /// trong Editor vẫn chạy được.
        /// </summary>
        public static AppScope EnsureCreated()
        {
            if (Current != null) return Current;
            Application.targetFrameRate = TargetFrameRate;
            var go = new GameObject("[AppScope]");
            Object.DontDestroyOnLoad(go);
            var host = go.AddComponent<AppScopeHost>();
            Current = new AppScope(host);
            return Current;
        }

        internal static void Release(AppScopeHost host)
        {
            if (Current != null && Current._host == host) Current = null;
        }
    }

    /// <summary>Giữ vòng đời của phạm vi App trên một GameObject không bị hủy khi đổi scene.</summary>
    public sealed class AppScopeHost : MonoBehaviour
    {
        private void OnDestroy() => AppScope.Release(this);
    }
}

using System.Threading;
using GraphNode.App.Flow;
using GraphNode.Foundation.Messaging;
using GraphNode.Foundation.Services;
using GraphNode.Services;
using GraphNode.App.Bootstrap;
using GraphNode.Services.Audio;
using GraphNode.Services.Localization;
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

        private AppScope(AppScopeHost host, AppAssets assets)
        {
            _host = host;
            Bus = new MessageBus();
            var audioLibrary = assets != null ? assets.AudioLibrary : null;
            Audio = audioLibrary != null ? new AudioService(audioLibrary, host.transform) : new NullAudioService();
#if UNITY_ANDROID && !UNITY_EDITOR
            Haptics = new Services.Haptics.AndroidHaptics();
#else
            // iOS làm khi bắt đầu build iOS (tài liệu kiến trúc mục 8)
            Haptics = new NullHaptics();
#endif
            Save = new MemorySaveService();
            Analytics = new NullAnalytics();
            Localizer = assets != null && assets.Strings != null ? new TableLocalizer(assets.Strings) : new KeyLocalizer();
            Clock = new UnityClock();
            Transition = new SceneTransition();
            Flow = new GameFlow(Transition);
        }

        /// <summary>
        /// Dựng phạm vi App nếu chưa có. Boot gọi đầu tiên; Home và Gameplay cũng gọi để bấm Play thẳng từ scene đó
        /// trong Editor vẫn chạy được.
        /// </summary>
        /// <param name="assets">Clip âm thanh và bảng chuỗi (scene đầu tiên dựng phạm vi đưa vào); null thì âm thanh im và chữ
        /// hiện khóa.</param>
        public static AppScope EnsureCreated(AppAssets assets = null)
        {
            // phạm vi cũ đã bị hủy (host là null theo Unity) thì dựng lại, không trả về dịch vụ đã chết
            if (Current != null && Current._host != null) return Current;
            Application.targetFrameRate = TargetFrameRate;
            var go = new GameObject("[AppScope]");
            Object.DontDestroyOnLoad(go);
            var host = go.AddComponent<AppScopeHost>();
            // một AudioListener duy nhất sống suốt phiên, để scene nào cũng nghe được mà không trùng listener
            go.AddComponent<AudioListener>();
            Current = new AppScope(host, assets);
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

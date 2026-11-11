using System;
using System.Threading;
using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Contracts;

namespace GraphNode.Foundation.Services
{
    /// <summary>Âm thanh: hiệu ứng theo id; nốt nhạc theo bậc ngũ cung và âm sắc (clip thu sẵn).</summary>
    public interface IAudioService
    {
        void PlaySfx(string sfxId, float volume = 1f);
        void PlayNote(string timbreId, int step, float volume = 1f);

        /// <summary>
        /// Kênh âm lặp theo id clip (tiếng ngân căng chỉ, sột soạt vải). Gọi mỗi khung với giá trị mới; volume là âm lượng
        /// tuyệt đối như bản web, 0 thì dừng. pitch là tỉ lệ cao độ, lowpassHz là tần số cắt của bộ lọc (0 = không lọc).
        /// </summary>
        void SetLoop(string loopId, float volume, float pitch = 1f, float lowpassHz = 0f);

        bool Muted { get; set; }
    }

    /// <summary>Rung nhận chuỗi nhịp (ms), không chỉ một xung; tắt được trong Cài đặt.</summary>
    public interface IHaptics
    {
        void Play(ReadOnlySpan<int> pulsesMs);
        bool Enabled { get; set; }
    }

    /// <summary>Lưu theo mục: mỗi mục có khóa và phiên bản riêng; thêm module là thêm mục, không đụng mục cũ.</summary>
    public interface ISaveService
    {
        UniTask LoadAsync(CancellationToken ct);
        bool TryGet<T>(string sectionKey, out T value);
        void Set<T>(string sectionKey, T value);
        UniTask FlushAsync(CancellationToken ct);
    }

    /// <summary>Sự kiện telemetry có kiểu; code chơi không gọi thẳng SDK.</summary>
    public interface IAnalytics
    {
        void Track(string eventName, params (string key, object value)[] parameters);
    }

    /// <summary>Chuỗi hiển thị đi qua bảng chuỗi, không ghi cứng.</summary>
    public interface ILocalizer
    {
        string Get(string key);
    }

    /// <summary>Thời gian thật và thời gian khung hình, để test tái hiện được.</summary>
    public interface IClock
    {
        float DeltaTime { get; }
        double RealtimeSinceStartup { get; }
    }

    /// <summary>Đổi scene. Bản đầu chỉ nạp scene; hiệu ứng bay hoặc mờ dần thay ở phần cài, không sửa nơi gọi.</summary>
    public interface ISceneTransition
    {
        UniTask GoToAsync(string sceneId, CancellationToken ct);
        bool IsTransitioning { get; }
    }

    /// <summary>
    /// Luồng ứng dụng mà Home và Gameplay gọi: vào màn với LevelRequest, về Home. Không module nào tự nạp scene.
    /// </summary>
    public interface IGameFlow
    {
        /// <summary>Yêu cầu của màn đang chơi; Gameplay đọc lúc dựng phạm vi.</summary>
        LevelRequest CurrentRequest { get; }

        UniTask StartLevelAsync(LevelRequest request, CancellationToken ct);
        UniTask ReturnHomeAsync(CancellationToken ct);
    }

    /// <summary>Tên scene dùng chung (khớp Build Settings).</summary>
    public static class SceneIds
    {
        public const string Boot = "Boot";
        public const string Home = "Home";
        public const string Gameplay = "Gameplay";
    }
}

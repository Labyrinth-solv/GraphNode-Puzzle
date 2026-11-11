using System;
using System.Collections.Generic;
using System.Threading;
using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Services;

namespace GraphNode.Services
{
    // Dịch vụ rỗng của M0: đủ để nối luồng scene và chạy test. Bản thật thay ở App/Scopes, không sửa nơi gọi.

    public sealed class NullAudioService : IAudioService
    {
        public bool Muted { get; set; }
        public void PlaySfx(string sfxId, float volume = 1f) { }
        public void PlayNote(string timbreId, int step, float volume = 1f) { }
    }

    public sealed class NullHaptics : IHaptics
    {
        public bool Enabled { get; set; } = true;
        public void Play(ReadOnlySpan<int> pulsesMs) { }
    }

    public sealed class NullAnalytics : IAnalytics
    {
        public void Track(string eventName, params (string key, object value)[] parameters) { }
    }

    /// <summary>Trả lại chính khóa cho tới khi có bảng chuỗi.</summary>
    public sealed class KeyLocalizer : ILocalizer
    {
        public string Get(string key) => key;
    }

    /// <summary>Lưu trong bộ nhớ, mất khi tắt game; bản ghi file nguyên tử làm ở M4.</summary>
    public sealed class MemorySaveService : ISaveService
    {
        private readonly Dictionary<string, object> _sections = new Dictionary<string, object>();

        public UniTask LoadAsync(CancellationToken ct) => UniTask.CompletedTask;

        public bool TryGet<T>(string sectionKey, out T value)
        {
            if (_sections.TryGetValue(sectionKey, out var raw) && raw is T typed)
            {
                value = typed;
                return true;
            }
            value = default;
            return false;
        }

        public void Set<T>(string sectionKey, T value) => _sections[sectionKey] = value;

        public UniTask FlushAsync(CancellationToken ct) => UniTask.CompletedTask;
    }
}

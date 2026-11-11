using System.Collections.Generic;
using GraphNode.Foundation.Services;
using UnityEngine;

namespace GraphNode.Services.Audio
{
    /// <summary>
    /// Phát clip qua một pool AudioSource 2D có giới hạn giọng (nốt cũ nhất bị thay khi hết giọng). Âm lượng truyền vào là
    /// âm lượng tuyệt đối như bản web; chia cho âm lượng tham chiếu lúc kết xuất clip. Nhiều nốt trong cùng khung đều phát
    /// (đặc tả: không bỏ nốt). Không cấp phát khi phát.
    /// </summary>
    public sealed class AudioService : IAudioService
    {
        private readonly Dictionary<string, AudioClip> _clips = new Dictionary<string, AudioClip>();
        private readonly AudioSource[] _voices;
        private readonly float _reference;
        // âm sắc -> clip theo bậc, dựng một lần từ các id dạng "âm sắc_NN"
        private readonly Dictionary<string, List<AudioClip>> _notes = new Dictionary<string, List<AudioClip>>();
        private int _next;

        public bool Muted { get; set; }

        public AudioService(AudioLibrary library, Transform host, int voices = 12)
        {
            _reference = library != null ? Mathf.Max(1e-4f, library.ReferenceVolume) : 1f;
            if (library != null)
                foreach (var e in library.Clips)
                {
                    if (e == null || e.clip == null || string.IsNullOrEmpty(e.id)) continue;
                    _clips[e.id] = e.clip;
                    int us = e.id.LastIndexOf('_');
                    if (us <= 0 || !int.TryParse(e.id.Substring(us + 1), out int step)) continue;
                    string timbre = e.id.Substring(0, us);
                    if (!_notes.TryGetValue(timbre, out var list)) _notes[timbre] = list = new List<AudioClip>();
                    while (list.Count <= step) list.Add(null);
                    list[step] = e.clip;
                }
            _voices = new AudioSource[voices];
            for (int i = 0; i < voices; i++)
            {
                var src = host.gameObject.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.spatialBlend = 0f;
                _voices[i] = src;
            }
        }

        public void PlaySfx(string sfxId, float volume = 1f)
        {
            if (!Muted && _clips.TryGetValue(sfxId, out var clip)) Play(clip, volume);
        }

        /// <summary>Nốt "âm sắc_bậc", âm lượng tuyệt đối như bản web (chia âm lượng tham chiếu của clip). Bậc vượt số clip
        /// thì dùng bậc cao nhất có.</summary>
        public void PlayNote(string timbreId, int step, float volume = 1f)
        {
            if (Muted || !_notes.TryGetValue(timbreId, out var list) || list.Count == 0) return;
            var clip = list[Mathf.Clamp(step, 0, list.Count - 1)];
            if (clip != null) Play(clip, volume / _reference);
        }

        private void Play(AudioClip clip, float volume)
        {
            var v = _voices[_next];
            _next = (_next + 1) % _voices.Length;
            v.Stop();
            v.clip = clip;
            v.volume = Mathf.Clamp01(volume);
            v.Play();
        }
    }
}

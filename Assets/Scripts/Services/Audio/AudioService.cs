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
        private readonly Transform _host;

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
            _host = host;
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

        public void SetLoop(string loopId, float volume, float pitch = 1f, float lowpassHz = 0f)
        {
            bool on = !Muted && volume > 1e-4f;
            if (!_loops.TryGetValue(loopId, out var loop))
            {
                if (!on || !_clips.TryGetValue(loopId, out var clip) || _host == null) return;
                // mỗi vòng lặp một đối tượng con riêng: bộ lọc của Unity áp lên mọi nguồn cùng đối tượng, đặt chung host
                // thì lọc luôn các nốt; tạo lần đầu dùng rồi giữ lại
                var child = new GameObject("Loop " + loopId);
                child.transform.SetParent(_host, false);
                var src = child.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.spatialBlend = 0f;
                src.loop = true;
                src.clip = clip;
                var lp = child.AddComponent<AudioLowPassFilter>();
                lp.enabled = false;
                _loops[loopId] = loop = new Loop { Source = src, Filter = lp };
            }
            if (loop.Source == null) return;
            if (!on)
            {
                if (loop.Source.isPlaying) loop.Source.Stop();
                return;
            }
            loop.Source.volume = Mathf.Clamp01(volume / _reference);
            loop.Source.pitch = pitch;
            loop.Filter.enabled = lowpassHz > 0f;
            if (lowpassHz > 0f) loop.Filter.cutoffFrequency = lowpassHz;
            if (!loop.Source.isPlaying) loop.Source.Play();
        }

        private sealed class Loop
        {
            public AudioSource Source;
            public AudioLowPassFilter Filter;
        }

        private readonly Dictionary<string, Loop> _loops = new Dictionary<string, Loop>();

        private void Play(AudioClip clip, float volume)
        {
            var v = _voices[_next];
            // nguồn âm bị hủy cùng phạm vi App (thoát game, test dọn dẹp) mà một scene còn gọi trong khung cuối: bỏ qua
            if (v == null) return;
            _next = (_next + 1) % _voices.Length;
            v.Stop();
            v.clip = clip;
            v.volume = Mathf.Clamp01(volume);
            v.Play();
        }
    }
}

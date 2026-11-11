using GraphNode.Foundation.Services;
using UnityEngine;

namespace GraphNode.Gameplay.Session
{
    /// <summary>
    /// Tiếng khi đang kéo như bản web (humStart/humUpdate/humStop): một dây trầm đứng ở một nốt ngũ cung, bước lên nốt kế
    /// khi độ khớp tăng, chạm ngưỡng thì về Đô một quãng tám trên; chỉ ngân theo nhịp tay di chuyển, tay đứng yên thì
    /// gần như lặng. Kèm tiếng sột soạt vải nhỏ, nhỏ dần khi dây căng. Thả tay thì tắt mềm.
    /// </summary>
    public sealed class DragAudio
    {
        private const string Hum = "hum_loop", Rustle = "rustle_loop";
        private const int Steps = 5;
        private static readonly int[] Penta = { 0, 2, 4, 7, 9 };

        private readonly IAudioService _audio;
        private bool _active;
        private float _motion, _humVolume, _rustleVolume, _pitch = 1f, _cutoff = 350f;

        public DragAudio(IAudioService audio) => _audio = audio;

        public void Begin() => _active = true;

        public void End() => _active = false;

        /// <param name="tension">Thanh khớp đang hiển thị (0–1).</param>
        /// <param name="ready">Đủ ngưỡng và đủ chốt.</param>
        /// <param name="speedPt">Tốc độ ngón tay, pt mỗi giây.</param>
        public void Tick(float dt, float tension, bool ready, float speedPt)
        {
            if (_audio == null) return;
            float humTarget = 0f, rustleTarget = 0f, humTau = 0.06f, rustleTau = 0.04f;
            if (_active)
            {
                _motion += (Mathf.Min(1f, speedPt / 700f) - _motion) * Mathf.Min(1f, dt * 10f);
                int step = ready ? Steps : Mathf.Min(Steps - 1, Mathf.FloorToInt(tension * Steps));
                // cao độ so với Đô 3 của clip: bậc 5 là Đô 4
                _pitch = Mathf.Pow(2f, step / Steps + Penta[step % Steps] / 12f);
                _cutoff += (350f + 1300f * tension - _cutoff) * Mathf.Min(1f, dt / 0.05f);
                humTarget = 0.005f + 0.035f * _motion;
                rustleTarget = 0.0001f + 0.016f * _motion * (1f - 0.5f * tension);
                humTau = rustleTau = 0.05f;
            }
            _humVolume += (humTarget - _humVolume) * Mathf.Min(1f, dt / humTau);
            _rustleVolume += (rustleTarget - _rustleVolume) * Mathf.Min(1f, dt / rustleTau);
            if (!_active && _humVolume < 2e-4f) _humVolume = 0f;
            if (!_active && _rustleVolume < 2e-4f) _rustleVolume = 0f;
            if (!_active) _motion = 0f;
            _audio.SetLoop(Hum, _humVolume, _pitch, _cutoff);
            _audio.SetLoop(Rustle, _rustleVolume);
        }

        /// <summary>Tắt ngay (rời màn, vào chuỗi thắng).</summary>
        public void Stop()
        {
            _active = false;
            _humVolume = _rustleVolume = 0f;
            _audio?.SetLoop(Hum, 0f);
            _audio?.SetLoop(Rustle, 0f);
        }
    }
}

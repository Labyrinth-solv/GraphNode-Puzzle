using System.Collections.Generic;
using GraphNode.Foundation.Services;
using GraphNode.Gameplay.Session;
using NUnit.Framework;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>Tiếng ngân khi kéo theo bản web: cao độ theo bậc ngũ cung của độ khớp, về Đô quãng trên khi đạt, lặng khi tay đứng yên, tắt mềm khi thả.</summary>
    public sealed class DragAudioTests
    {
        private sealed class FakeAudio : IAudioService
        {
            public readonly Dictionary<string, (float volume, float pitch, float cutoff)> Loops = new Dictionary<string, (float, float, float)>();
            public bool Muted { get; set; }
            public void PlaySfx(string sfxId, float volume = 1f) { }
            public void PlayNote(string timbreId, int step, float volume = 1f) { }
            public void SetLoop(string loopId, float volume, float pitch = 1f, float lowpassHz = 0f) => Loops[loopId] = (volume, pitch, lowpassHz);
        }

        private static void Run(DragAudio d, int frames, float tension, bool ready, float speed)
        {
            for (int i = 0; i < frames; i++) d.Tick(1f / 60f, tension, ready, speed);
        }

        [Test]
        public void Pitch_FollowsMatchSteps_AndReadyIsOctave()
        {
            var audio = new FakeAudio();
            var d = new DragAudio(audio);
            d.Begin();
            Run(d, 30, 0f, false, 700f);
            Assert.AreEqual(1f, audio.Loops["hum_loop"].pitch, 1e-4f, "bậc 0: Đô 3");
            Run(d, 1, 0.5f, false, 700f);
            Assert.AreEqual(UnityEngine.Mathf.Pow(2f, 4f / 12f), audio.Loops["hum_loop"].pitch, 1e-4f, "độ khớp 0,5 → bậc 2 (Mi)");
            Run(d, 1, 0.99f, true, 700f);
            Assert.AreEqual(2f, audio.Loops["hum_loop"].pitch, 1e-4f, "đạt ngưỡng: Đô một quãng tám trên");
        }

        [Test]
        public void StillFinger_IsNearlySilent_MovingIsLouder_ReleaseFadesToZero()
        {
            var audio = new FakeAudio();
            var d = new DragAudio(audio);
            d.Begin();
            Run(d, 60, 0.3f, false, 0f);
            float still = audio.Loops["hum_loop"].volume;
            Run(d, 60, 0.3f, false, 900f);
            float moving = audio.Loops["hum_loop"].volume;
            Assert.AreEqual(0.005f, still, 1e-3f);
            Assert.Greater(moving, 0.035f);
            Assert.Greater(audio.Loops["rustle_loop"].volume, 0.005f);
            d.End();
            Run(d, 60, 0.3f, false, 0f);
            Assert.AreEqual(0f, audio.Loops["hum_loop"].volume);
            Assert.AreEqual(0f, audio.Loops["rustle_loop"].volume);
        }
    }
}

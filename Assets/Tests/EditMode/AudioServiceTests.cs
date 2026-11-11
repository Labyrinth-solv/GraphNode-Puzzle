using System.Collections.Generic;
using GraphNode.Services.Audio;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace GraphNode.Tests.EditMode
{
    /// <summary>Tra clip theo âm sắc và bậc, quy đổi âm lượng theo âm lượng tham chiếu, pool giọng xoay vòng.</summary>
    public sealed class AudioServiceTests
    {
        private GameObject _host;
        private AudioLibrary _library;
        private readonly List<Object> _owned = new List<Object>();

        [SetUp]
        public void SetUp()
        {
            _host = new GameObject("AudioHost");
            _library = ScriptableObject.CreateInstance<AudioLibrary>();
            var so = new SerializedObject(_library);
            var list = so.FindProperty("clips");
            string[] ids = { "note_pop_00", "note_pop_01", "note_pop_02", "drop" };
            list.arraySize = ids.Length;
            for (int i = 0; i < ids.Length; i++)
            {
                var clip = AudioClip.Create(ids[i], 480, 1, 48000, false);
                _owned.Add(clip);
                list.GetArrayElementAtIndex(i).FindPropertyRelative("id").stringValue = ids[i];
                list.GetArrayElementAtIndex(i).FindPropertyRelative("clip").objectReferenceValue = clip;
            }
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(_host);
            Object.DestroyImmediate(_library);
            foreach (var o in _owned) Object.DestroyImmediate(o);
            _owned.Clear();
        }

        private AudioSource LastVoice(AudioService service, int voices, int played)
        {
            var sources = _host.GetComponents<AudioSource>();
            Assert.AreEqual(voices, sources.Length);
            return sources[(played - 1) % voices];
        }

        [Test]
        public void PlayNote_PicksClipByStep_AndScalesVolumeByReference()
        {
            var service = new AudioService(_library, _host.transform, 4);
            service.PlayNote("note_pop", 1, 0.05f);
            var v = LastVoice(service, 4, 1);
            Assert.AreEqual("note_pop_01", v.clip.name);
            Assert.AreEqual(0.5f, v.volume, 1e-6f, "0,05 tuyệt đối / tham chiếu 0,1");
        }

        [Test]
        public void PlayNote_StepBeyondClips_UsesHighestStep()
        {
            var service = new AudioService(_library, _host.transform, 4);
            service.PlayNote("note_pop", 9, 0.1f);
            Assert.AreEqual("note_pop_02", LastVoice(service, 4, 1).clip.name);
        }

        [Test]
        public void Voices_RotateAndMuteSilences()
        {
            var service = new AudioService(_library, _host.transform, 2);
            service.PlaySfx("drop");
            service.PlaySfx("drop");
            service.PlaySfx("drop");
            Assert.AreEqual("drop", LastVoice(service, 2, 3).clip.name);
            service.Muted = true;
            var sources = _host.GetComponents<AudioSource>();
            sources[1].clip = null;
            service.PlaySfx("drop");
            Assert.IsNull(sources[1].clip, "muted service must not play");
        }

        [Test]
        public void UnknownIds_AreIgnored()
        {
            var service = new AudioService(_library, _host.transform, 2);
            Assert.DoesNotThrow(() => service.PlaySfx("nope"));
            Assert.DoesNotThrow(() => service.PlayNote("nope", 0));
        }
    }
}

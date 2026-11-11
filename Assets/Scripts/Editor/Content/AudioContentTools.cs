using System.Collections.Generic;
using System.IO;
using GraphNode.Services.Audio;
using UnityEditor;
using UnityEngine;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Thiết lập nhập cho clip trong Assets/Audio/Sfx (tài liệu kiến trúc mục Âm thanh: clip ngắn ADPCM, giải nén lúc nạp,
    /// mono) và menu sinh lại AudioLibrary từ thư mục đó.
    /// </summary>
    public sealed class SfxImporter : AssetPostprocessor
    {
        private const string Folder = "Assets/Audio/Sfx/";

        private void OnPreprocessAudio()
        {
            if (!assetPath.StartsWith(Folder)) return;
            var ai = (AudioImporter)assetImporter;
            ai.forceToMono = true;
            ai.loadInBackground = false;
            var s = ai.defaultSampleSettings;
            s.loadType = AudioClipLoadType.DecompressOnLoad;
            s.compressionFormat = AudioCompressionFormat.ADPCM;
            s.preloadAudioData = true;
            ai.defaultSampleSettings = s;
        }
    }

    public static class AudioContentTools
    {
        private const string SfxFolder = "Assets/Audio/Sfx";
        private const string LibraryPath = "Assets/Audio/AudioLibrary.asset";

        [MenuItem("GraphNode/Content/Rebuild Audio Library")]
        public static void RebuildLibrary()
        {
            var library = AssetDatabase.LoadAssetAtPath<AudioLibrary>(LibraryPath);
            if (library == null)
            {
                library = ScriptableObject.CreateInstance<AudioLibrary>();
                AssetDatabase.CreateAsset(library, LibraryPath);
            }
            var entries = new List<(string id, AudioClip clip)>();
            foreach (string guid in AssetDatabase.FindAssets("t:AudioClip", new[] { SfxFolder }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                entries.Add((Path.GetFileNameWithoutExtension(path), AssetDatabase.LoadAssetAtPath<AudioClip>(path)));
            }
            entries.Sort((a, b) => string.CompareOrdinal(a.id, b.id));
            var so = new SerializedObject(library);
            var list = so.FindProperty("clips");
            list.arraySize = entries.Count;
            for (int i = 0; i < entries.Count; i++)
            {
                var item = list.GetArrayElementAtIndex(i);
                item.FindPropertyRelative("id").stringValue = entries[i].id;
                item.FindPropertyRelative("clip").objectReferenceValue = entries[i].clip;
            }
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(library);
            AssetDatabase.SaveAssets();
            Debug.Log($"[GraphNode] audio library: {entries.Count} clips");
        }
    }
}

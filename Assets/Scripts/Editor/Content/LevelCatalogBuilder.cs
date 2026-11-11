using System.Collections.Generic;
using GraphNode.Core.Levels;
using GraphNode.Data.Definitions;
using GraphNode.Data.Serialization;
using UnityEditor;
using UnityEngine;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Sinh lại LevelCatalog từ mọi file JSON trong Content/Levels (tài liệu kiến trúc mục 5.7). Mỗi file được đọc thử và
    /// kiểm tra bằng LevelValidator; file lỗi đọc thì bỏ ra khỏi catalog và báo lỗi, level có lỗi luật thì vẫn vào catalog
    /// nhưng báo lỗi để người thiết kế sửa.
    /// </summary>
    public static class LevelCatalogBuilder
    {
        private const string LevelFolder = "Assets/Content/Levels";
        private const string CatalogPath = LevelFolder + "/LevelCatalog.asset";

        [MenuItem("GraphNode/Content/Rebuild Level Catalog")]
        public static void Rebuild()
        {
            var catalog = AssetDatabase.LoadAssetAtPath<LevelCatalog>(CatalogPath);
            if (catalog == null)
            {
                Debug.LogError($"[GraphNode] {CatalogPath} not found; run GraphNode/Content/Create Missing Default Configs first");
                return;
            }
            var entries = new List<(string id, TextAsset json)>();
            int errors = 0;
            foreach (string guid in AssetDatabase.FindAssets("t:TextAsset", new[] { LevelFolder }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.EndsWith(".json")) continue;
                var text = AssetDatabase.LoadAssetAtPath<TextAsset>(path);
                LevelModel level;
                try
                {
                    level = LevelJson.Parse(text.text);
                }
                catch (System.Exception e)
                {
                    errors++;
                    Debug.LogError($"[GraphNode] {path}: cannot read level ({e.Message})");
                    continue;
                }
                var report = LevelValidator.Validate(level, ValidatorParams.WebDemo);
                foreach (var issue in report.Issues)
                {
                    if (issue.Severity == IssueSeverity.Error) { errors++; Debug.LogError($"[GraphNode] {path}: {issue}"); }
                    else Debug.LogWarning($"[GraphNode] {path}: {issue}");
                }
                entries.Add((level.Id, text));
            }
            entries.Sort((a, b) => string.CompareOrdinal(a.id, b.id));

            var so = new SerializedObject(catalog);
            var list = so.FindProperty("levels");
            list.arraySize = entries.Count;
            for (int i = 0; i < entries.Count; i++)
            {
                var item = list.GetArrayElementAtIndex(i);
                item.FindPropertyRelative("id").stringValue = entries[i].id;
                item.FindPropertyRelative("json").objectReferenceValue = entries[i].json;
            }
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(catalog);
            AssetDatabase.SaveAssets();
            Debug.Log($"[GraphNode] level catalog: {entries.Count} levels, {errors} errors");
        }
    }
}

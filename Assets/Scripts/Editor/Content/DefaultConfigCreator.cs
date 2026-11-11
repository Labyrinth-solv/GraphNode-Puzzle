using System.IO;
using GraphNode.Data.Configs;
using GraphNode.Data.Definitions;
using UnityEditor;
using UnityEngine;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Tạo các asset cấu hình mặc định trong Content/Configs nếu chưa có (giá trị mặc định là số tạm của bản web chính).
    /// Không ghi đè asset đã có, để số người dùng đã chỉnh không bị mất.
    /// </summary>
    public static class DefaultConfigCreator
    {
        private const string ConfigFolder = "Assets/Content/Configs";
        private const string LevelFolder = "Assets/Content/Levels";

        [MenuItem("GraphNode/Content/Create Missing Default Configs")]
        public static void CreateMissing()
        {
            EnsureFolder(ConfigFolder);
            EnsureFolder(LevelFolder);
            int created = 0;
            created += CreateIfMissing<GameplayBalanceConfig>(ConfigFolder + "/GameplayBalanceConfig.asset");
            created += CreateIfMissing<InputConfig>(ConfigFolder + "/InputConfig.asset");
            created += CreateIfMissing<LevelCatalog>(LevelFolder + "/LevelCatalog.asset");
            AssetDatabase.SaveAssets();
            Debug.Log($"[GraphNode] default configs: {created} created");
        }

        private static int CreateIfMissing<T>(string path) where T : ScriptableObject
        {
            if (AssetDatabase.LoadAssetAtPath<T>(path) != null) return 0;
            AssetDatabase.CreateAsset(ScriptableObject.CreateInstance<T>(), path);
            return 1;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            if (!string.IsNullOrEmpty(parent)) EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }
    }
}

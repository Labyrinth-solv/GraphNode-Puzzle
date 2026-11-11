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
        private const string FabricFolder = "Assets/Content/Fabrics";

        /// <summary>
        /// Tạo vải của viên kem (bảng màu đậm kiểu tranh tô màu của bản web chính) và đưa vào FabricCatalog nếu chưa có.
        /// Màu là số của bản thử; người dùng chỉnh trong asset khi làm art.
        /// </summary>
        [MenuItem("GraphNode/Content/Create Scoop Fabric")]
        public static void CreateScoopFabric()
        {
            EnsureFolder(FabricFolder);
            string path = FabricFolder + "/scoop.asset";
            var fabric = AssetDatabase.LoadAssetAtPath<FabricDefinition>(path);
            if (fabric == null)
            {
                fabric = ScriptableObject.CreateInstance<FabricDefinition>();
                AssetDatabase.CreateAsset(fabric, path);
                var so = new SerializedObject(fabric);
                so.FindProperty("id").stringValue = "scoop";
                so.FindProperty("baseColor").colorValue = new Color32(0xF2, 0x55, 0x7E, 0xFF);
                so.FindProperty("light").colorValue = new Color32(0xFF, 0x97, 0xB0, 0xFF);
                so.FindProperty("dark").colorValue = new Color32(0xC4, 0x2E, 0x5C, 0xFF);
                so.FindProperty("line").colorValue = new Color32(0x2A, 0x23, 0x26, 0xFF);
                so.ApplyModifiedPropertiesWithoutUndo();
            }
            var catalog = AssetDatabase.LoadAssetAtPath<FabricCatalog>(FabricFolder + "/FabricCatalog.asset");
            if (catalog != null && !catalog.TryGet("scoop", out _))
            {
                var cso = new SerializedObject(catalog);
                var list = cso.FindProperty("fabrics");
                list.arraySize++;
                list.GetArrayElementAtIndex(list.arraySize - 1).objectReferenceValue = fabric;
                cso.ApplyModifiedPropertiesWithoutUndo();
                EditorUtility.SetDirty(catalog);
            }
            AssetDatabase.SaveAssets();
            Debug.Log("[GraphNode] scoop fabric ready");
        }

        [MenuItem("GraphNode/Content/Create Missing Default Configs")]
        public static void CreateMissing()
        {
            EnsureFolder(ConfigFolder);
            EnsureFolder(LevelFolder);
            int created = 0;
            created += CreateIfMissing<GameplayBalanceConfig>(ConfigFolder + "/GameplayBalanceConfig.asset");
            created += CreateIfMissing<InputConfig>(ConfigFolder + "/InputConfig.asset");
            created += CreateIfMissing<LevelCatalog>(LevelFolder + "/LevelCatalog.asset");
            EnsureFolder(FabricFolder);
            created += CreateIfMissing<FabricCatalog>(FabricFolder + "/FabricCatalog.asset");
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

using System.Collections.Generic;
using System.IO;
using GraphNode.Data.Configs;
using GraphNode.Data.Definitions;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Nhập nội dung của bản web đã duyệt (xuất bằng Prototype/web-demo/tools/export-content.js): tạo hoặc cập nhật
    /// FabricDefinition của từng mảnh từ Content/Fabrics/web-fabrics.json và đưa vào FabricCatalog, ghi luật kéo dây của
    /// bản web 2 (kẹp ±0,35) vào cấu hình cân bằng, rồi dựng lại LevelCatalog. Chạy lại được: vải đã có thì cập nhật màu.
    /// </summary>
    public static class WebDemoContentImporter
    {
        private const string FabricFolder = "Assets/Content/Fabrics";
        private const string FabricJson = FabricFolder + "/web-fabrics.json";
        private const string BalancePath = "Assets/Content/Configs/GameplayBalanceConfig.asset";
        private const float ApprovedBendLimit = 0.35f;

        [MenuItem("GraphNode/Content/Import Web Demo Content")]
        public static void Import()
        {
            if (!File.Exists(FabricJson))
            {
                Debug.LogError($"[GraphNode] {FabricJson} not found; run node Prototype/web-demo/tools/export-content.js first");
                return;
            }
            var catalog = AssetDatabase.LoadAssetAtPath<FabricCatalog>(FabricFolder + "/FabricCatalog.asset");
            if (catalog == null)
            {
                Debug.LogError("[GraphNode] FabricCatalog.asset not found");
                return;
            }
            var listed = new List<FabricDefinition>();
            int created = 0, updated = 0;
            foreach (var f in (JArray)JObject.Parse(File.ReadAllText(FabricJson))["fabrics"])
            {
                string id = (string)f["id"], path = $"{FabricFolder}/{id}.asset";
                var fabric = AssetDatabase.LoadAssetAtPath<FabricDefinition>(path);
                if (fabric == null)
                {
                    fabric = ScriptableObject.CreateInstance<FabricDefinition>();
                    AssetDatabase.CreateAsset(fabric, path);
                    created++;
                }
                else updated++;
                var so = new SerializedObject(fabric);
                so.FindProperty("id").stringValue = id;
                so.FindProperty("baseColor").colorValue = Parse((string)f["base"]);
                so.FindProperty("light").colorValue = Parse((string)f["light"]);
                so.FindProperty("dark").colorValue = Parse((string)f["dark"]);
                so.FindProperty("line").colorValue = Parse((string)f["line"]);
                so.ApplyModifiedPropertiesWithoutUndo();
                listed.Add(fabric);
            }
            // catalog giữ đúng các vải của bộ màn hiện tại, theo thứ tự chơi
            var cso = new SerializedObject(catalog);
            var list = cso.FindProperty("fabrics");
            list.arraySize = listed.Count;
            for (int i = 0; i < listed.Count; i++) list.GetArrayElementAtIndex(i).objectReferenceValue = listed[i];
            cso.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(catalog);

            var balance = AssetDatabase.LoadAssetAtPath<GameplayBalanceConfig>(BalancePath);
            if (balance != null)
            {
                var bso = new SerializedObject(balance);
                bso.FindProperty("bendLimit").floatValue = ApprovedBendLimit;
                bso.ApplyModifiedPropertiesWithoutUndo();
                EditorUtility.SetDirty(balance);
            }
            AssetDatabase.SaveAssets();
            LevelCatalogBuilder.Rebuild();
            Debug.Log($"[GraphNode] web demo content: {created} fabrics created, {updated} updated, bend limit {ApprovedBendLimit}");
        }

        private static Color Parse(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.magenta;
    }
}

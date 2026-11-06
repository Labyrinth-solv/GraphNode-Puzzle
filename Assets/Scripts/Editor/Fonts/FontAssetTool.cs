using System.IO;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

namespace GraphNode.Editor.Fonts
{
    // Tạo TMP Font Asset động cho Baloo 2: chữ nào dùng tới (kể cả dấu tiếng Việt) tự thêm vào atlas.
    // Gần phát hành thì đổi sang atlas tĩnh có sẵn bộ chữ tiếng Việt (xem hướng dẫn trong đặc tả).
    public static class FontAssetTool
    {
        private const string SourceFolder = "Assets/Art/Fonts/Baloo2/static";
        private const string OutputFolder = "Assets/Art/Fonts/Baloo2/TMP";
        private static readonly string[] Weights = { "Medium", "ExtraBold" };

        [MenuItem("GraphNode/Fonts/Create Baloo 2 TMP Font Assets")]
        public static void CreateBalooAssets()
        {
            if (!AssetDatabase.IsValidFolder(OutputFolder))
            {
                AssetDatabase.CreateFolder("Assets/Art/Fonts/Baloo2", "TMP");
            }

            foreach (var weight in Weights)
            {
                var fontPath = $"{SourceFolder}/Baloo2-{weight}.ttf";
                var font = AssetDatabase.LoadAssetAtPath<Font>(fontPath);
                if (font == null)
                {
                    Debug.LogWarning($"Không tìm thấy font {fontPath}");
                    continue;
                }

                var assetPath = $"{OutputFolder}/Baloo2-{weight} SDF.asset";
                if (File.Exists(assetPath))
                {
                    continue;
                }

                var fontAsset = TMP_FontAsset.CreateFontAsset(font, 90, 9, GlyphRenderMode.SDFAA, 1024, 1024, AtlasPopulationMode.Dynamic, true);
                fontAsset.name = $"Baloo2-{weight} SDF";
                AssetDatabase.CreateAsset(fontAsset, assetPath);

                // atlas và material phải là asset con, nếu không sẽ mất khi tải lại project
                fontAsset.atlasTextures[0].name = $"{fontAsset.name} Atlas";
                AssetDatabase.AddObjectToAsset(fontAsset.atlasTextures[0], fontAsset);
                fontAsset.material.name = $"{fontAsset.name} Material";
                AssetDatabase.AddObjectToAsset(fontAsset.material, fontAsset);
                EditorUtility.SetDirty(fontAsset);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
    }
}

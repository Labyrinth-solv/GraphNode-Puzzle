using UnityEditor;
using UnityEngine;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Thiết lập nhập cho sprite xuất từ bản web chính (Prototype/web-demo/tools/export-sprites.html): ảnh vẽ ở 3x nên
    /// Pixels Per Unit = 3, để 1 unit trong scene bằng 1 pt của bố cục 390×844; riêng sprite Canvas (ui_*, bar_*) PPU 100.
    /// Thẻ và thanh khớp có viền cắt 9 phần theo bán kính bo. Chỉ áp cho thư mục WebDemo, không đụng sprite khác.
    /// </summary>
    public sealed class WebDemoSpriteImporter : AssetPostprocessor
    {
        private const string Folder = "Assets/Art/Sprites/WebDemo/";
        private const float PixelsPerPoint = 3f;
        // sprite trên Canvas theo chuẩn mục 5.13 (1170 × 2532, PPU tham chiếu 100): PPU 100 thì 1 px = 1 đơn vị canvas,
        // Set Native Size đúng cỡ và cùng hệ với prefab UI của người dùng
        private const float CanvasPixelsPerUnit = 100f;

        private static bool IsCanvasSprite(string path)
        {
            string name = System.IO.Path.GetFileName(path);
            return name.StartsWith("ui_") || name.StartsWith("bar_");
        }

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(Folder)) return;
            var ti = (TextureImporter)assetImporter;
            ti.textureType = TextureImporterType.Sprite;
            ti.spriteImportMode = SpriteImportMode.Single;
            ti.spritePixelsPerUnit = IsCanvasSprite(assetPath) ? CanvasPixelsPerUnit : PixelsPerPoint;
            ti.mipmapEnabled = false;
            ti.alphaIsTransparency = true;
            ti.filterMode = FilterMode.Bilinear;
            ti.wrapMode = TextureWrapMode.Clamp;
            ti.textureCompression = TextureImporterCompression.Uncompressed;
            var settings = new TextureImporterSettings();
            ti.ReadTextureSettings(settings);
            settings.spriteMeshType = SpriteMeshType.FullRect;
            settings.spriteAlignment = (int)SpriteAlignment.Center;
            ti.SetTextureSettings(settings);
            ti.spriteBorder = BorderFor(System.IO.Path.GetFileNameWithoutExtension(assetPath));
        }

        // viền cắt 9 phần theo bán kính bo (px ở 3x); thanh chiều cao cố định nên không cắt trên dưới
        private static Vector4 BorderFor(string name)
        {
            switch (name)
            {
                case "bar_fill": return new Vector4(24, 0, 24, 0);
                case "bar_back":
                case "bar_frame": return new Vector4(39, 0, 39, 0);
                case "ui_card":
                case "ui_card_outlined": return new Vector4(60, 60, 60, 60);
                default: return Vector4.zero;
            }
        }
    }
}

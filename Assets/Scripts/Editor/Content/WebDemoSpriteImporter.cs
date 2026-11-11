using UnityEditor;
using UnityEngine;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Thiết lập nhập cho sprite xuất từ bản web chính (Prototype/web-demo/tools/export-sprites.html): ảnh vẽ ở 3x nên
    /// Pixels Per Unit = 3, để 1 unit trong scene bằng 1 pt của bố cục 390×844. Miếng đổ của thanh khớp có viền cắt 9
    /// phần theo bán kính bo 8 pt. Chỉ áp cho thư mục WebDemo, không đụng sprite khác của dự án.
    /// </summary>
    public sealed class WebDemoSpriteImporter : AssetPostprocessor
    {
        private const string Folder = "Assets/Art/Sprites/WebDemo/";
        private const float PixelsPerPoint = 3f;

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(Folder)) return;
            var ti = (TextureImporter)assetImporter;
            ti.textureType = TextureImporterType.Sprite;
            ti.spriteImportMode = SpriteImportMode.Single;
            ti.spritePixelsPerUnit = PixelsPerPoint;
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
            // bo 8 pt hai đầu (24 px ở 3x); chiều cao cố định nên không cắt trên dưới
            ti.spriteBorder = assetPath.EndsWith("bar_fill.png") ? new Vector4(24, 0, 24, 0) : Vector4.zero;
        }
    }
}

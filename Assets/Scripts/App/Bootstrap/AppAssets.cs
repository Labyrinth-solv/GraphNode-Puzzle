using GraphNode.Services.Audio;
using GraphNode.Services.Localization;
using UnityEngine;

namespace GraphNode.App.Bootstrap
{
    /// <summary>
    /// Tài nguyên của phạm vi App (clip âm thanh, bảng chuỗi) gom một asset; Boot, Home và Gameplay cùng trỏ tới, scene nào
    /// dựng phạm vi App trước thì dùng (bấm Play thẳng từ Home hay Gameplay trong Editor vẫn đủ dịch vụ).
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/App Assets", fileName = "AppAssets")]
    public sealed class AppAssets : ScriptableObject
    {
        [SerializeField] private AudioLibrary audioLibrary;
        [SerializeField] private StringTable strings;

        public AudioLibrary AudioLibrary => audioLibrary;
        public StringTable Strings => strings;
    }
}

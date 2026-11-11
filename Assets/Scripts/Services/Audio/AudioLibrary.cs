using System;
using System.Collections.Generic;
using UnityEngine;

namespace GraphNode.Services.Audio
{
    /// <summary>
    /// Danh sách clip theo id (tên file không đuôi, ví dụ "pin_snap_02"). Nốt theo bậc ngũ cung đặt tên "âm sắc_bậc"
    /// hai chữ số. Sinh lại bằng menu GraphNode/Content/Rebuild Audio Library từ Assets/Audio/Sfx; người làm âm thanh thay
    /// file cùng tên mà không sửa code.
    /// </summary>
    [CreateAssetMenu(menuName = "GraphNode/Audio Library", fileName = "AudioLibrary")]
    public sealed class AudioLibrary : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string id;
            public AudioClip clip;
        }

        [Tooltip("Âm lượng tham chiếu lúc kết xuất clip; âm lượng phát = âm lượng muốn có / số này")]
        [SerializeField] private float referenceVolume = 0.1f;
        [SerializeField] private List<Entry> clips = new List<Entry>();

        public float ReferenceVolume => referenceVolume;
        public IReadOnlyList<Entry> Clips => clips;
    }
}

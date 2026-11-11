using System;
using GraphNode.Foundation.Services;
using UnityEngine;

namespace GraphNode.Services.Haptics
{
    /// <summary>
    /// Rung trên Android theo chuỗi nhịp như navigator.vibrate của bản web: [rung, nghỉ, rung, …] tính bằng ms.
    /// API 26 trở lên dùng VibrationEffect.createWaveform; máy cũ hơn rơi về Handheld.Vibrate (một nhịp dài cố định).
    /// Tham chiếu Handheld.Vibrate cũng để Unity tự thêm quyền VIBRATE vào manifest khi build.
    /// </summary>
    public sealed class AndroidHaptics : IHaptics
    {
        public bool Enabled { get; set; } = true;

#if UNITY_ANDROID && !UNITY_EDITOR
        private readonly AndroidJavaObject _vibrator;
        private readonly int _sdk;

        public AndroidHaptics()
        {
            try
            {
                using var version = new AndroidJavaClass("android.os.Build$VERSION");
                _sdk = version.GetStatic<int>("SDK_INT");
                using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                using var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
                _vibrator = activity.Call<AndroidJavaObject>("getSystemService", "vibrator");
            }
            catch (Exception e)
            {
                Debug.LogWarning("[Haptics] vibrator unavailable: " + e.Message);
            }
        }

        public void Play(ReadOnlySpan<int> pulsesMs)
        {
            if (!Enabled || pulsesMs.Length == 0) return;
            if (_vibrator == null || _sdk < 26)
            {
                Handheld.Vibrate();
                return;
            }
            // createWaveform bắt đầu bằng khoảng chờ: [0, rung, nghỉ, rung…]
            var timings = new long[pulsesMs.Length + 1];
            for (int i = 0; i < pulsesMs.Length; i++) timings[i + 1] = pulsesMs[i];
            try
            {
                using var effectClass = new AndroidJavaClass("android.os.VibrationEffect");
                using var effect = effectClass.CallStatic<AndroidJavaObject>("createWaveform", timings, -1);
                _vibrator.Call("vibrate", effect);
            }
            catch (Exception e)
            {
                Debug.LogWarning("[Haptics] vibrate failed: " + e.Message);
            }
        }
#else
        // Editor và nền tảng khác: không rung (bản build Android biên dịch nhánh trên)
        public void Play(ReadOnlySpan<int> pulsesMs) { }
#endif
    }
}

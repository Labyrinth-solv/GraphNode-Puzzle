using System.Diagnostics;

namespace GraphNode.Foundation.Logging
{
    /// <summary>
    /// Log của game. Info bị loại khỏi bản phát hành nhờ [Conditional]; bản phát hành chỉ giữ cảnh báo và lỗi.
    /// </summary>
    public static class Log
    {
        [Conditional("UNITY_EDITOR"), Conditional("DEVELOPMENT_BUILD")]
        public static void Info(string message) => UnityEngine.Debug.Log(message);

        public static void Warn(string message) => UnityEngine.Debug.LogWarning(message);

        public static void Error(string message) => UnityEngine.Debug.LogError(message);
    }
}

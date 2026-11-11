using UnityEditor;
using UnityEditor.Build.Player;
using UnityEngine;

namespace GraphNode.Editor.Build
{
    /// <summary>
    /// Biên dịch script người chơi cho Android mà không build: bắt lỗi trong các nhánh #if UNITY_ANDROID (rung, quyền)
    /// mà Editor không biên dịch. Dùng trước khi build và trong CI.
    /// </summary>
    public static class PlayerScriptsCheck
    {
        [MenuItem("GraphNode/Build/Check Android Player Scripts")]
        public static void CheckAndroid()
        {
            var settings = new ScriptCompilationSettings
            {
                group = BuildTargetGroup.Android,
                target = BuildTarget.Android,
                options = ScriptCompilationOptions.None
            };
            string output = "Temp/PlayerScriptsCheck/Android";
            System.IO.Directory.CreateDirectory(output);
            var result = PlayerBuildInterface.CompilePlayerScripts(settings, output);
            int assemblies = result.assemblies != null ? result.assemblies.Count : 0;
            if (assemblies == 0) Debug.LogError("[Build] Android player scripts failed to compile (see errors above)");
            else Debug.Log($"[Build] Android player scripts compiled: {assemblies} assemblies");
        }
    }
}

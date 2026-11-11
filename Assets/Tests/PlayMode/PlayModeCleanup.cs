using System.Collections;
using GraphNode.App.Scopes;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace GraphNode.Tests.PlayMode
{
    /// <summary>
    /// Dọn sau mỗi test PlayMode: chuyển sang một scene trống, gỡ mọi scene game, rồi mới hủy phạm vi App. Làm theo thứ tự
    /// này để không còn khung nào của scene cũ chạy với dịch vụ đã hủy, và không đổi scene dở dang lọt sang test sau.
    /// </summary>
    internal static class PlayModeCleanup
    {
        public static IEnumerator Run()
        {
            HomeScope.SuppressDevAutoStart = false;
            var empty = SceneManager.CreateScene("TestEmpty_" + Time.frameCount);
            SceneManager.SetActiveScene(empty);
            for (int i = SceneManager.sceneCount - 1; i >= 0; i--)
            {
                var scene = SceneManager.GetSceneAt(i);
                if (scene != empty && scene.isLoaded) yield return SceneManager.UnloadSceneAsync(scene);
            }
            var host = Object.FindObjectOfType<AppScopeHost>();
            if (host != null) Object.Destroy(host.gameObject);
            yield return null;
        }
    }
}

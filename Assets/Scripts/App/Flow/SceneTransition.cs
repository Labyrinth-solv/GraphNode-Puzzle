using System;
using System.Threading;
using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Services;
using UnityEngine.SceneManagement;

namespace GraphNode.App.Flow
{
    /// <summary>
    /// Bản cài đầu của <see cref="ISceneTransition"/>: chỉ nạp scene, chưa có lớp phủ. Mờ dần hay hiệu ứng bay
    /// (đặc tả mục chuyển cảnh) thay ở đây, Home và Gameplay không đổi.
    /// </summary>
    public sealed class SceneTransition : ISceneTransition
    {
        public bool IsTransitioning { get; private set; }

        public async UniTask GoToAsync(string sceneId, CancellationToken ct)
        {
            // bấm nhanh hai lần không được nạp chồng hai scene
            if (IsTransitioning) throw new InvalidOperationException($"Scene transition already running, cannot go to {sceneId}");
            IsTransitioning = true;
            try
            {
                await SceneManager.LoadSceneAsync(sceneId).WithCancellation(ct);
            }
            finally
            {
                IsTransitioning = false;
            }
        }
    }
}

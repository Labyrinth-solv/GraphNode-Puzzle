using Cysharp.Threading.Tasks;
using GraphNode.App.Scopes;
using GraphNode.Foundation.Logging;
using GraphNode.Foundation.Services;
using UnityEngine;

namespace GraphNode.App.Bootstrap
{
    /// <summary>Điểm vào của scene Boot: dựng phạm vi App, nạp save rồi sang Home.</summary>
    public sealed class AppBootstrap : MonoBehaviour
    {
        private void Start() => RunAsync().Forget();

        private async UniTaskVoid RunAsync()
        {
            var app = AppScope.EnsureCreated();
            // token của phạm vi App: Boot bị hủy khi đổi scene nhưng việc khởi động phải chạy tới hết
            var ct = app.LifetimeToken;
            await app.Save.LoadAsync(ct);
            Log.Info("[Boot] services ready, going Home");
            await app.Transition.GoToAsync(SceneIds.Home, ct);
        }
    }
}

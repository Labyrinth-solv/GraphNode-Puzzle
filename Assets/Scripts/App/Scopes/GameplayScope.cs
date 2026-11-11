using System.Collections.Generic;
using Cysharp.Threading.Tasks;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Logging;
using UnityEngine;

namespace GraphNode.App.Scopes
{
    /// <summary>
    /// Lớp nối của scene Gameplay, dựng phạm vi riêng cho một màn; thoát màn là hủy phạm vi, mọi tác vụ dừng theo
    /// token. M0 chưa có phiên chơi (M2), chỉ đọc yêu cầu và cho thoát về Home.
    /// </summary>
    public sealed class GameplayScope : MonoBehaviour
    {
        private AppScope _app;
        private float _startTime;

        public LevelRequest Request { get; private set; }

        private void Awake()
        {
            _app = AppScope.EnsureCreated();
            Request = _app.Flow.CurrentRequest;
            _startTime = Time.realtimeSinceStartup;
            if (Request == null) Log.Warn("[Gameplay] no LevelRequest, scene was opened directly");
            else Log.Info($"[Gameplay] level {Request.LevelId}");
        }

        /// <summary>Thoát giữa màn: vẫn phát LevelResult (bỏ) để Meta trừ booster đã dùng, rồi về Home.</summary>
        public UniTask AbandonAsync()
        {
            if (Request != null)
            {
                var stats = new LevelStats(Time.realtimeSinceStartup - _startTime, 0, 0, 0, 0);
                _app.Bus.Publish(new LevelResult(Request.LevelId, Request.FabricId, LevelOutcome.Abandoned, NoBoosters, stats));
            }
            // token của phạm vi App: lần về Home hủy chính scene này (xem HomeScope.StartLevelAsync)
            return _app.Flow.ReturnHomeAsync(_app.LifetimeToken);
        }

        private static readonly IReadOnlyDictionary<string, int> NoBoosters = new Dictionary<string, int>();
    }
}

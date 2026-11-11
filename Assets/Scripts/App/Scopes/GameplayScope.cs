using System.Collections.Generic;
using Cysharp.Threading.Tasks;
using GraphNode.Core.Session;
using GraphNode.Data.Configs;
using GraphNode.Data.Definitions;
using GraphNode.Foundation.Contracts;
using GraphNode.Foundation.Logging;
using GraphNode.Gameplay.Session;
using UnityEngine;

namespace GraphNode.App.Scopes
{
    /// <summary>
    /// Lớp nối của scene Gameplay, dựng phạm vi riêng cho một màn; thoát màn là hủy phạm vi, mọi tác vụ dừng theo token.
    /// Đọc level theo LevelRequest từ LevelCatalog, dựng PuzzleState với cấu hình cân bằng và giao cho PuzzleController.
    /// </summary>
    public sealed class GameplayScope : MonoBehaviour
    {
        [SerializeField] private LevelCatalog catalog;
        [SerializeField] private GameplayBalanceConfig balance;
        [SerializeField] private InputConfig input;
        [SerializeField] private PuzzleController controller;
        [Tooltip("Level dùng khi mở thẳng scene Gameplay trong Editor (không có LevelRequest)")]
        [SerializeField] private string editorFallbackLevel = "scoop";
        [Tooltip("Bản thử M2 chưa có chuỗi thắng và Home: thắng thì chờ rồi chơi lại màn này")]
        [SerializeField] private float replayDelaySeconds = 1.5f;

        private AppScope _app;
        private float _startTime;

        public LevelRequest Request { get; private set; }
        public PuzzleState State { get; private set; }

        private void Awake()
        {
            _app = AppScope.EnsureCreated();
            Request = _app.Flow.CurrentRequest;
            _startTime = Time.realtimeSinceStartup;
            if (Request == null)
            {
                // mở thẳng scene trong Editor là cách thử bình thường, không phải lỗi
                Log.Info($"[Gameplay] no LevelRequest, scene was opened directly; using '{editorFallbackLevel}'");
                Request = new LevelRequest(editorFallbackLevel);
            }
            if (catalog == null || balance == null || input == null || controller == null)
            {
                Log.Error("[Gameplay] scope is missing catalog, configs or controller references");
                return;
            }
            if (!catalog.TryLoad(Request.LevelId, out var level))
            {
                Log.Error($"[Gameplay] level '{Request.LevelId}' is not in the catalog");
                return;
            }
            State = new PuzzleState(level, balance.ToPuzzleConfig());
            controller.Begin(State, input, balance.RunnerSpeed, OnWon);
            Log.Info($"[Gameplay] level {Request.LevelId}");
        }

        private void OnWon() => WonAsync().Forget();

        private async UniTaskVoid WonAsync()
        {
            Publish(LevelOutcome.Won);
            // chờ theo vòng đời scene này; đổi scene theo token phạm vi App (xem HomeScope.StartLevelAsync)
            await UniTask.Delay(System.TimeSpan.FromSeconds(replayDelaySeconds), cancellationToken: this.GetCancellationTokenOnDestroy());
            await _app.Flow.StartLevelAsync(Request, _app.LifetimeToken);
        }

        /// <summary>Thoát giữa màn: vẫn phát LevelResult (bỏ) để Meta trừ booster đã dùng, rồi về Home.</summary>
        public UniTask AbandonAsync()
        {
            Publish(LevelOutcome.Abandoned);
            return _app.Flow.ReturnHomeAsync(_app.LifetimeToken);
        }

        private void Publish(LevelOutcome outcome)
        {
            if (Request == null) return;
            var stats = new LevelStats(Time.realtimeSinceStartup - _startTime, 0, 0, 0, 0);
            _app.Bus.Publish(new LevelResult(Request.LevelId, Request.FabricId, outcome, NoBoosters, stats));
        }

        private static readonly IReadOnlyDictionary<string, int> NoBoosters = new Dictionary<string, int>();
    }
}

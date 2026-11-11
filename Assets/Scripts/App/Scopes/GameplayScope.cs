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
        [SerializeField] private FabricCatalog fabrics;
        [Tooltip("Dùng khi bấm Play thẳng từ Gameplay trong Editor (phạm vi App chưa có)")]
        [SerializeField] private Bootstrap.AppAssets appAssets;
        [SerializeField] private GameplayBalanceConfig balance;
        [SerializeField] private InputConfig input;
        [SerializeField] private PuzzleController controller;
        [Tooltip("Level dùng khi mở thẳng scene Gameplay trong Editor (không có LevelRequest)")]
        [SerializeField] private string editorFallbackLevel = "scoop";
        [Tooltip("Số gợi ý khi LevelRequest không mang booster (chưa có Meta). Số tạm cho bản thử.")]
        [SerializeField] private int devHints = 3;
        [Tooltip("Số ô trong hàng Bộ vải ghép khi level không thuộc sản phẩm nào trong catalog")]
        [SerializeField] private int devPieceSlots = 2;
        [Tooltip("Chưa có Meta: chuỗi thắng xong thì chờ ngần này rồi sang mảnh kế theo thứ tự catalog")]
        [SerializeField] private float replayDelaySeconds = 0.5f;

        private AppScope _app;
        private float _startTime;

        public LevelRequest Request { get; private set; }
        public LevelCatalog Catalog => catalog;
        public PuzzleState State { get; private set; }

        private void Awake()
        {
            _app = AppScope.EnsureCreated(appAssets);
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
            if (!catalog.TryLoad(Request.LevelId, out var level, out var info))
            {
                Log.Error($"[Gameplay] level '{Request.LevelId}' is not in the catalog");
                return;
            }
            // vải người chơi tự chọn (LevelRequest) đè lên vải mặc định của level
            string fabricId = Request.FabricId ?? info.FabricId;
            FabricDefinition fabric = null;
            if (fabrics == null || !fabrics.TryGet(fabricId, out fabric))
                Log.Warn($"[Gameplay] fabric '{fabricId}' is not in the fabric catalog");
            State = new PuzzleState(level, balance.ToPuzzleConfig());
            int hints = Request.Boosters.TryGetValue(HintBooster, out int owned) ? owned : devHints;
            controller.Begin(State, input, balance.RunnerSpeed, balance.WinSequence, OnWon, _app.Audio, _app.Localizer,
                fabric, info.SlotIndex, PieceSlots(info.ProductId), hints, IsFirstLevel(Request.LevelId), _app.Haptics,
                DonePieces(info.ProductId));
            Log.Info($"[Gameplay] level {Request.LevelId}");
        }

        // màn đầu của catalog có vòng nhắc chạm đầu như bản web
        private bool IsFirstLevel(string levelId) => catalog.Levels.Count > 0 && catalog.Levels[0].id == levelId;

        // mảnh đã xong của sản phẩm (từ LevelRequest): đọc level và vải để màn chơi vẽ lại vào ô
        private List<DonePiece> DonePieces(string productId)
        {
            var list = new List<DonePiece>();
            foreach (string id in Request.DonePieces)
            {
                if (!catalog.TryLoad(id, out var level, out var info) || info.ProductId != productId) continue;
                Color fill = Color.white, line = Color.black;
                if (fabrics != null && fabrics.TryGet(info.FabricId, out var f)) { fill = f.Base; line = f.Line; }
                list.Add(new DonePiece(level, info.SlotIndex, fill, line));
            }
            return list;
        }

        private int PieceSlots(string productId)
        {
            int count = string.IsNullOrEmpty(productId) ? 0 : catalog.PieceCount(productId);
            return count > 0 ? count : devPieceSlots;
        }

        private void OnWon() => WonAsync().Forget();

        private async UniTaskVoid WonAsync()
        {
            Publish(LevelOutcome.Won);
            // chờ theo vòng đời scene này; đổi scene theo token phạm vi App (xem HomeScope.StartLevelAsync)
            await UniTask.Delay(System.TimeSpan.FromSeconds(replayDelaySeconds), cancellationToken: this.GetCancellationTokenOnDestroy());
            // chưa có Meta chọn màn kế: tạm đi lần lượt theo thứ tự catalog (mảnh kế của sản phẩm, hết sản phẩm sang sản phẩm sau)
            await _app.Flow.StartLevelAsync(Flow.DevLevelChain.Next(catalog, Request), _app.LifetimeToken);
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
            var used = new Dictionary<string, int> { [HintBooster] = controller != null ? controller.HintsUsed : 0 };
            _app.Bus.Publish(new LevelResult(Request.LevelId, Request.FabricId, outcome, used, stats));
        }

        private const string HintBooster = "hint";
    }
}

using System.Collections.Generic;

namespace GraphNode.Foundation.Contracts
{
    public enum LevelOutcome
    {
        Won,
        Abandoned
    }

    /// <summary>
    /// Kết quả một màn, Gameplay phát lên message bus. Meta trừ booster và lưu; Gameplay không ghi save.
    /// Thoát giữa màn cũng phát (Abandoned) để booster đã dùng vẫn được trừ.
    /// </summary>
    public readonly struct LevelResult
    {
        public readonly string LevelId;
        public readonly string FabricId;
        public readonly LevelOutcome Outcome;
        public readonly IReadOnlyDictionary<string, int> BoostersUsed;
        public readonly LevelStats Stats;

        public LevelResult(string levelId, string fabricId, LevelOutcome outcome,
            IReadOnlyDictionary<string, int> boostersUsed, LevelStats stats)
        {
            LevelId = levelId;
            FabricId = fabricId;
            Outcome = outcome;
            BoostersUsed = boostersUsed;
            Stats = stats;
        }
    }

    /// <summary>Số liệu chơi để đo chỉ số trong đặc tả (telemetry).</summary>
    public readonly struct LevelStats
    {
        public readonly float DurationSeconds;
        public readonly int Drags;
        public readonly int Resets;
        public readonly int Reverses;
        public readonly int FailedVerifies;

        public LevelStats(float durationSeconds, int drags, int resets, int reverses, int failedVerifies)
        {
            DurationSeconds = durationSeconds;
            Drags = drags;
            Resets = resets;
            Reverses = reverses;
            FailedVerifies = failedVerifies;
        }
    }
}

using System.Collections.Generic;
using Newtonsoft.Json;

namespace GraphNode.Data.Serialization
{
    // DTO đúng định dạng file level (đặc tả mục Dữ liệu một level). Chỉ dùng để đọc ghi JSON; lúc chạy dùng LevelModel.

    public sealed class LevelDto
    {
        [JsonProperty("schemaVersion")] public int SchemaVersion;
        [JsonProperty("id")] public string Id;
        [JsonProperty("chapterId")] public string ChapterId;
        [JsonProperty("productId")] public string ProductId;
        [JsonProperty("slotIndex")] public int SlotIndex;
        [JsonProperty("difficulty")] public string Difficulty;
        [JsonProperty("winThreshold")] public float? WinThreshold;
        [JsonProperty("startSeed")] public int StartSeed;
        [JsonProperty("keepStart")] public bool KeepStart;
        [JsonProperty("nodes")] public List<NodeDto> Nodes;
        [JsonProperty("ring")] public int[] Ring;
        [JsonProperty("innerEdges")] public int[][] InnerEdges;
        [JsonProperty("bendFree")] public int[] BendFree;
        [JsonProperty("startBend")] public float[] StartBend;
        [JsonProperty("straightEdges")] public int[] StraightEdges;
        [JsonProperty("solBendOverride")] public Dictionary<int, float> SolBendOverride;
        [JsonProperty("fold")] public FoldDto Fold;
        [JsonProperty("fabricId")] public string FabricId;
        [JsonProperty("tags")] public string[] Tags;
    }

    public sealed class NodeDto
    {
        [JsonProperty("id")] public int Id;
        [JsonProperty("type")] public string Type;
        [JsonProperty("locked")] public bool Locked;
        [JsonProperty("solutionPos")] public float[] SolutionPos;
        [JsonProperty("startPos")] public float[] StartPos;
    }

    public sealed class FoldDto
    {
        [JsonProperty("axis")] public string Axis;
        [JsonProperty("solX")] public float SolutionLine;
        [JsonProperty("startX")] public float StartLine;
        [JsonProperty("chains")] public int[][] Chains;
    }
}

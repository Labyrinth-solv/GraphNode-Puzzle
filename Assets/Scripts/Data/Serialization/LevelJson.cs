using System;
using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Levels;
using Newtonsoft.Json;

namespace GraphNode.Data.Serialization
{
    /// <summary>
    /// Đọc file level JSON thành <see cref="LevelModel"/>. Không dùng TypeNameHandling (kém an toàn, dễ hỏng khi
    /// IL2CPP cắt code); dữ liệu nhiều loại sau này đọc bằng trường "kind" và bộ chuyển đổi tự viết.
    /// </summary>
    public static class LevelJson
    {
        public const int CurrentSchemaVersion = 2;

        /// <summary>Ngưỡng mặc định theo mức độ khó khi level bỏ trống (bản web: dễ 0,94, vừa 0,95, khó 0,96; số tạm).</summary>
        public static float DefaultThreshold(Difficulty d) => d switch
        {
            Difficulty.Easy => 0.94f,
            Difficulty.Medium => 0.95f,
            _ => 0.96f
        };

        public static LevelModel Parse(string json)
        {
            var dto = JsonConvert.DeserializeObject<LevelDto>(json) ?? throw new FormatException("empty level json");
            return ToModel(dto);
        }

        public static LevelModel ToModel(LevelDto dto)
        {
            if (dto.SchemaVersion != CurrentSchemaVersion)
                throw new FormatException($"level {dto.Id}: schemaVersion {dto.SchemaVersion} is not supported (expected {CurrentSchemaVersion})");
            if (dto.Nodes == null || dto.Nodes.Count == 0) throw new FormatException($"level {dto.Id}: no nodes");

            int n = dto.Nodes.Count;
            var kinds = new NodeKind[n];
            var locked = new bool[n];
            var sol = new Float2[n];
            var start = new Float2[n];
            foreach (var node in dto.Nodes)
            {
                if (node.Id < 0 || node.Id >= n) throw new FormatException($"level {dto.Id}: node id {node.Id} out of range");
                kinds[node.Id] = node.Type == "s" ? NodeKind.Straight : NodeKind.Curved;
                locked[node.Id] = node.Locked;
                sol[node.Id] = ToFloat2(node.SolutionPos, dto.Id, "solutionPos");
                start[node.Id] = ToFloat2(node.StartPos ?? node.SolutionPos, dto.Id, "startPos");
            }

            var difficulty = ParseDifficulty(dto.Difficulty);
            var inner = new NodeEdge[dto.InnerEdges?.Length ?? 0];
            for (int i = 0; i < inner.Length; i++) inner[i] = new NodeEdge(dto.InnerEdges[i][0], dto.InnerEdges[i][1]);

            FoldSpec fold = null;
            if (dto.Fold != null)
            {
                var chains = new List<FoldChain>();
                if (dto.Fold.Chains != null)
                    foreach (var c in dto.Fold.Chains) chains.Add(new FoldChain(c[0], c[1]));
                var axis = dto.Fold.Axis == "y" ? FoldAxis.Y : FoldAxis.X;
                fold = new FoldSpec(axis, dto.Fold.SolutionLine, dto.Fold.StartLine, chains);
            }

            return new LevelModel(dto.Id, difficulty, dto.WinThreshold ?? DefaultThreshold(difficulty),
                kinds, locked, sol, start, dto.Ring, inner, dto.BendFree, dto.StartBend,
                dto.StraightEdges, dto.SolBendOverride, dto.KeepStart, fold);
        }

        private static Difficulty ParseDifficulty(string s) => s switch
        {
            "easy" => Difficulty.Easy,
            "medium" => Difficulty.Medium,
            "hard" => Difficulty.Hard,
            _ => throw new FormatException($"unknown difficulty '{s}'")
        };

        private static Float2 ToFloat2(float[] v, string id, string field)
        {
            if (v == null || v.Length != 2) throw new FormatException($"level {id}: {field} must be [x, y]");
            return new Float2(v[0], v[1]);
        }
    }
}

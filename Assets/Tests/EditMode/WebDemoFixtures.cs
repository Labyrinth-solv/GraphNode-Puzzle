using System.Collections.Generic;
using System.IO;
using GraphNode.Core.Graph;
using GraphNode.Core.Levels;
using GraphNode.Core.Outline;
using GraphNode.Core.Scoring;
using GraphNode.Core.Shapes;
using GraphNode.Data.Serialization;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace GraphNode.Tests.EditMode
{
    /// <summary>
    /// Dữ liệu đối chiếu xuất từ bản web chính (Prototype/web-demo/export-fixtures.js): 14 level đúng định dạng file
    /// level và số đo của lõi web. Chỉ dùng luật và số liệu, không dùng hình ảnh hay cấu trúc code của bản thử.
    /// </summary>
    internal static class WebDemoFixtures
    {
        public static readonly string Folder = Path.Combine(Application.dataPath, "Tests", "EditMode", "Fixtures", "WebDemo");

        private static JObject _expected;

        public static JObject Expected => _expected ??= JObject.Parse(File.ReadAllText(Path.Combine(Folder, "expected.json")));

        public static IEnumerable<string> LevelIds()
        {
            // TestCaseSource chạy lúc dựng danh sách test, nên đọc thẳng danh sách file
            foreach (var path in Directory.GetFiles(Folder, "*.level.json"))
                yield return Path.GetFileName(path).Replace(".level.json", "");
        }

        public static LevelModel Load(string id) => LevelJson.Parse(File.ReadAllText(Path.Combine(Folder, id + ".level.json")));

        public static JObject ExpectedFor(string id) => (JObject)Expected["levels"][id];

        /// <summary>Bộ dựng của lõi cho một level, như phiên chơi sẽ dựng lúc vào màn.</summary>
        public sealed class Rig
        {
            public readonly LevelModel Level;
            public readonly RingTopology Topo;
            public readonly SolutionBends Solution;
            public readonly HermiteEdgeShape Shape;
            public readonly RegionMask Mask;
            public readonly MatchScorer Scorer;

            public Rig(string id)
            {
                Level = Load(id);
                Topo = new RingTopology(Level);
                Solution = new SolutionBends(Level, Topo);
                Shape = new HermiteEdgeShape(Topo, Solution);
                Mask = new RegionMask(Topo, Shape, Level.NodeCount);
                Scorer = new MatchScorer(Level, Topo, Solution, BendPenaltyParams.WebDemo);
            }

            public float SolutionLine => Level.Fold?.SolutionLine ?? 0f;
            public float StartLine => Level.Fold?.StartLine ?? 0f;
        }
    }
}

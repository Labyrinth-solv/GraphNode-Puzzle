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
    /// Dữ liệu đối chiếu xuất từ bản web chính (Prototype/web-demo/export-fixtures.js): file level đúng định dạng và số đo
    /// của lõi web. Hai bộ: bộ cũ 14 mảnh (thư mục WebDemo, web-demo trước 2026-11-12, có các màn gấp vải nên giữ để test
    /// cơ chế gấp) và bộ bản web 2 đã duyệt 17 mảnh (thư mục WebDemoV2, id có tiền tố "v2/" vì viên kem và ốc quế trùng
    /// tên). Chỉ dùng luật và số liệu, không dùng hình ảnh hay cấu trúc code của bản thử.
    /// </summary>
    internal static class WebDemoFixtures
    {
        public static readonly string Folder = Path.Combine(Application.dataPath, "Tests", "EditMode", "Fixtures", "WebDemo");
        public static readonly string FolderV2 = Path.Combine(Application.dataPath, "Tests", "EditMode", "Fixtures", "WebDemoV2");
        private const string V2 = "v2/";

        private static JObject _expected, _expectedV2;

        public static JObject Expected => _expected ??= JObject.Parse(File.ReadAllText(Path.Combine(Folder, "expected.json")));
        public static JObject ExpectedV2 => _expectedV2 ??= JObject.Parse(File.ReadAllText(Path.Combine(FolderV2, "expected.json")));

        /// <summary>Mọi mảnh của cả hai bộ (bộ mới có tiền tố "v2/").</summary>
        public static IEnumerable<string> LevelIds()
        {
            // TestCaseSource chạy lúc dựng danh sách test, nên đọc thẳng danh sách file
            foreach (var path in Directory.GetFiles(Folder, "*.level.json"))
                yield return Path.GetFileName(path).Replace(".level.json", "");
            foreach (var path in Directory.GetFiles(FolderV2, "*.level.json"))
                yield return V2 + Path.GetFileName(path).Replace(".level.json", "");
        }

        private static (string folder, string name, bool v2) Resolve(string id) =>
            id.StartsWith(V2) ? (FolderV2, id.Substring(V2.Length), true) : (Folder, id, false);

        public static LevelModel Load(string id)
        {
            var r = Resolve(id);
            return LevelJson.Parse(File.ReadAllText(Path.Combine(r.folder, r.name + ".level.json")));
        }

        public static JObject ExpectedFor(string id)
        {
            var r = Resolve(id);
            return (JObject)(r.v2 ? ExpectedV2 : Expected)["levels"][r.name];
        }

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

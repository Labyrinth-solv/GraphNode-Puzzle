using System;
using System.Collections.Generic;
using GraphNode.Core.Geometry;

namespace GraphNode.Core.Levels
{
    public enum NodeKind
    {
        /// <summary>Điểm thẳng ("s"): cạnh chạm node này có độ uốn lời giải 0.</summary>
        Straight,
        /// <summary>Điểm cong ("c").</summary>
        Curved
    }

    public enum Difficulty
    {
        Easy,
        Medium,
        Hard
    }

    public enum FoldAxis
    {
        /// <summary>Gấp theo trục dọc x = hằng số (mọi màn gấp hiện có).</summary>
        X,
        /// <summary>Gấp theo trục ngang y = hằng số; bản thử có code nhưng chưa màn nào dùng, chưa kiểm chứng.</summary>
        Y
    }

    /// <summary>Đoạn cắt của màn gấp: các cạnh vòng k với From ≤ k &lt; To được vẽ và uốn; phần còn lại là mép gấp.</summary>
    public readonly struct FoldChain
    {
        public readonly int From;
        public readonly int To;

        public FoldChain(int from, int to)
        {
            From = from;
            To = to;
        }

        public bool Contains(int edge) => edge >= From && edge < To;
    }

    public sealed class FoldSpec
    {
        public FoldAxis Axis { get; }
        /// <summary>Vị trí kim ở lời giải (toạ độ theo trục gấp).</summary>
        public float SolutionLine { get; }
        /// <summary>Vị trí kim lúc vào màn.</summary>
        public float StartLine { get; }
        public IReadOnlyList<FoldChain> Chains { get; }

        public FoldSpec(FoldAxis axis, float solutionLine, float startLine, IReadOnlyList<FoldChain> chains)
        {
            Axis = axis;
            SolutionLine = solutionLine;
            StartLine = startLine;
            Chains = chains ?? Array.Empty<FoldChain>();
        }
    }

    public readonly struct NodeEdge
    {
        public readonly int A;
        public readonly int B;

        public NodeEdge(int a, int b)
        {
            A = a;
            B = b;
        }
    }

    /// <summary>
    /// Mô hình level lúc chạy, dựng từ file JSON (Data đọc file rồi gọi hàm khởi tạo này). Chỉ chứa dữ liệu,
    /// không tính toán; mảng chỉ đọc sau khi dựng. Toạ độ chuẩn hóa 0–1 theo khung vải, trục dọc hướng xuống.
    /// </summary>
    public sealed class LevelModel
    {
        public string Id { get; }
        public Difficulty Difficulty { get; }
        public float WinThreshold { get; }
        public int NodeCount => Solution.Length;

        public NodeKind[] Kinds { get; }
        public bool[] Locked { get; }
        /// <summary>Vị trí lời giải, cũng là vị trí chốt.</summary>
        public Float2[] Solution { get; }
        public Float2[] Start { get; }

        /// <summary>Vòng node; cạnh vòng k nối Ring[k] với Ring[(k + 1) % n].</summary>
        public int[] Ring { get; }
        public NodeEdge[] InnerEdges { get; }

        /// <summary>Cạnh vòng người chơi phải tự uốn, bắt đầu thẳng.</summary>
        public int[] BendFree { get; }
        /// <summary>Độ uốn ban đầu theo cạnh vòng.</summary>
        public float[] StartBend { get; }
        /// <summary>Cạnh vòng ép thẳng dù hai đầu là điểm cong.</summary>
        public IReadOnlyCollection<int> StraightEdges { get; }
        /// <summary>Độ uốn lời giải đặt tay theo cạnh vòng.</summary>
        public IReadOnlyDictionary<int, float> SolutionBendOverride { get; }
        public bool KeepStart { get; }
        /// <summary>Null nếu không phải màn gấp.</summary>
        public FoldSpec Fold { get; }

        public LevelModel(string id, Difficulty difficulty, float winThreshold,
            NodeKind[] kinds, bool[] locked, Float2[] solution, Float2[] start,
            int[] ring, NodeEdge[] innerEdges, int[] bendFree, float[] startBend,
            IReadOnlyCollection<int> straightEdges = null, IReadOnlyDictionary<int, float> solutionBendOverride = null,
            bool keepStart = false, FoldSpec fold = null)
        {
            if (string.IsNullOrEmpty(id)) throw new ArgumentException("id is required", nameof(id));
            Solution = solution ?? throw new ArgumentNullException(nameof(solution));
            int n = solution.Length;
            Require(kinds, n, nameof(kinds));
            Require(locked, n, nameof(locked));
            Require(start, n, nameof(start));
            if (ring == null || ring.Length != n) throw new ArgumentException($"ring must list every node once ({n})", nameof(ring));
            var seen = new bool[n];
            foreach (int node in ring)
            {
                if (node < 0 || node >= n || seen[node]) throw new ArgumentException($"ring has invalid or repeated node {node}", nameof(ring));
                seen[node] = true;
            }
            if (startBend != null && startBend.Length != n) throw new ArgumentException("startBend must have one value per ring edge", nameof(startBend));

            Id = id;
            Difficulty = difficulty;
            WinThreshold = winThreshold;
            Kinds = kinds;
            Locked = locked;
            Start = start;
            Ring = ring;
            InnerEdges = innerEdges ?? Array.Empty<NodeEdge>();
            BendFree = bendFree ?? Array.Empty<int>();
            StartBend = startBend ?? new float[n];
            StraightEdges = straightEdges ?? Array.Empty<int>();
            SolutionBendOverride = solutionBendOverride ?? EmptyOverride;
            KeepStart = keepStart;
            Fold = fold;
        }

        private static void Require<T>(T[] array, int n, string name)
        {
            if (array == null || array.Length != n) throw new ArgumentException($"{name} must have {n} entries", name);
        }

        private static readonly IReadOnlyDictionary<int, float> EmptyOverride = new Dictionary<int, float>();
    }
}

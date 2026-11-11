using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Session;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>Trạng thái thao tác mà lớp phản hồi cần (do PuzzleController đưa vào mỗi khung).</summary>
    public struct FeedbackInput
    {
        public bool DraggingNode;
        /// <summary>Cạnh đang kéo, hoặc −1.</summary>
        public int DraggingEdge;
        /// <summary>Giây kể từ lần chạm gần nhất.</summary>
        public float SinceAction;
        /// <summary>Giây kể từ lần thả node gần nhất.</summary>
        public float SinceNodeRelease;
    }

    /// <summary>
    /// Phản hồi khớp theo bản web chính: sóng tỏa ở chốt trống (khi kéo node, khi để yên lâu), gợi ý uốn cho dây đã có đích
    /// theo chốt mà còn lệch (mảng trăng khuyết thở giữa dây và cung đích, hào quang tơ quanh dây, sóng nét đứt trôi về
    /// đích, cung đích nét đứt, nút cúc len giữa dây), và vệt chỉ vàng lóe dọc dây khi dây khớp viền. Mọi nét dựng chung
    /// một mesh dùng lại mỗi khung, không cấp phát.
    /// </summary>
    public sealed class FeedbackView
    {
        private const int Steps = 24;
        private const int CircleSegments = 32;
        private const float IdleForPinWaves = 2.8f;
        private const float IdleForDeepHint = 1.8f;
        private const float HintAfterRelease = 0.25f, HintFadeIn = 0.4f;
        /// <summary>Dây lệch đích từ mức này mới gợi ý (theo bề rộng vải, như hintEdges của web).</summary>
        private const float HintMinError = 0.012f;
        private const float ZipSeconds = 0.32f;

        private static readonly Color Honey = new Color32(0xFF, 0xD2, 0x69, 0xFF);
        private static readonly Color HoneyDeep = new Color32(0xDF, 0xB1, 0x5B, 0xFF);
        private static readonly Color Butter = new Color32(0xFF, 0xF2, 0xCF, 0xFF);
        private static readonly Color Silk = new Color32(0xFF, 0xF8, 0xE8, 0xFF);
        private static readonly Color Spark = new Color32(0xFF, 0xFD, 0xF5, 0xFF);
        private static readonly Color DragRing = new Color32(0xFF, 0xE7, 0xA8, 0xFF);
        private static readonly Color DragHalo = new Color32(0xE8, 0xB8, 0x68, 0xFF);
        private static readonly Color IdleHalo = new Color32(0xD8, 0x98, 0x38, 0xFF);
        private static readonly Color InkSoft = new Color32(0x6B, 0x5B, 0x53, 0xFF);

        private struct ActiveZip
        {
            public int Edge;
            public float Start;
        }

        private readonly PuzzleState _state;
        private readonly StrokeMesh _waves, _gaps, _zips;
        private readonly SpriteRenderer[] _pinHalos;
        private readonly SpriteRenderer[] _beads;
        private readonly Float2[] _cur = new Float2[Steps + 1], _sol = new Float2[Steps + 1];
        private readonly float[] _bendScratch;
        private readonly List<Vector3> _pts = new List<Vector3>(64), _pts2 = new List<Vector3>(64);
        private readonly List<Color32> _cols = new List<Color32>(64);
        private readonly List<int> _tris = new List<int>(256);
        private readonly List<ActiveZip> _activeZips = new List<ActiveZip>(8);
        private float _clock;

        public FeedbackView(PuzzleState state, StrokeMesh waves, StrokeMesh gaps, StrokeMesh zips,
            SpriteRenderer[] pinHalos, SpriteRenderer[] beads)
        {
            _state = state;
            _waves = waves;
            _gaps = gaps;
            _zips = zips;
            _pinHalos = pinHalos;
            _beads = beads;
            _bendScratch = new float[state.Topology.RingLength];
        }

        private static readonly Color RoseDeep = new Color32(0xD4, 0x83, 0x7C, 0xFF);
        private static readonly Color Mustard = new Color32(0xE9, 0xC4, 0x6A, 0xFF);
        private Core.Rules.Hint _hint;
        private float _hintUntil = -1f, _hintDuration = 1f;

        /// <summary>
        /// Gợi ý (booster) như bản web: nét đứt hồng từ chỗ hiện tại tới đích (node tới vị trí lời giải của nó, hoặc giữa
        /// dây tới giữa cung đích) và vòng vàng nhấp nháy ở đích, mờ dần ở nửa giây cuối.
        /// </summary>
        public void ShowHint(Core.Rules.Hint hint, float seconds)
        {
            _hint = hint;
            _hintDuration = seconds;
            _hintUntil = _clock + seconds;
        }

        private void DrawHint()
        {
            float left = _hintUntil - _clock;
            if (left <= 0f || _hint.Kind == Core.Rules.HintKind.None) return;
            float t = _hintDuration - left, alpha = Mathf.Min(1f, left * 2f), pulse = 0.5f + 0.5f * Mathf.Sin(t * 8f);
            Float2 a, b;
            if (_hint.Kind == Core.Rules.HintKind.Edge)
            {
                var topo = _state.Topology;
                int n = topo.RingLength, k = _hint.Index, na = topo.RingNode(k), nb = topo.RingNode((k + 1) % n);
                SampleEdge(na, nb, _state.Bends, _cur);
                System.Array.Copy(_state.Bends, _bendScratch, n);
                _bendScratch[k] = _hint.TargetBend;
                SampleEdge(na, nb, _bendScratch, _sol);
                a = _cur[Steps / 2];
                b = _sol[Steps / 2];
            }
            else
            {
                a = _state.Positions[_hint.Index];
                b = _state.Level.Solution[_hint.Index];
            }
            _pts2.Clear();
            _pts2.Add(FabricLayout.FabricToWorld(a));
            _pts2.Add(FabricLayout.FabricToWorld(b));
            _zips.AddDashedOpen(_pts2, WithA(RoseDeep, alpha), 2f, 4f, 5f);
            _pts.Clear();
            _cols.Clear();
            var c = FabricLayout.FabricToWorld(b);
            float r = 15f + 4f * pulse;
            for (int i = 0; i < CircleSegments; i++)
            {
                float ang = i * Mathf.PI * 2f / CircleSegments;
                _pts.Add(c + new Vector3(Mathf.Cos(ang) * r, Mathf.Sin(ang) * r, 0f));
                _cols.Add(WithA(Mustard, alpha));
            }
            _zips.AddPolyline(_pts, _cols, 3f, true);
        }

        /// <summary>Dây k vừa khớp viền: vệt chỉ vàng lóe từ giữa dây lan ra hai đầu (có thể trễ một chút).</summary>
        public void Zip(int edge, float delay = 0f) => _activeZips.Add(new ActiveZip { Edge = edge, Start = _clock + delay });

        public void Render(float dt, FeedbackInput input, bool hidden)
        {
            _clock += dt;
            _waves.Clear();
            _gaps.Clear();
            _zips.Clear();
            for (int j = 0; j < _pinHalos.Length; j++) _pinHalos[j].enabled = false;
            for (int k = 0; k < _beads.Length; k++) _beads[k].enabled = false;
            if (!hidden)
            {
                DrawPinWaves(input);
                DrawCurveHints(input);
                DrawZips();
                DrawHint();
            }
            _waves.Apply();
            _gaps.Apply();
            _zips.Apply();
        }

        // ---------- sóng ở chốt trống ----------

        private void DrawPinWaves(FeedbackInput input)
        {
            var pins = _state.Pins;
            bool idle = !input.DraggingNode && input.DraggingEdge < 0 && input.SinceAction > IdleForPinWaves && !pins.AllFilled;
            if (!input.DraggingNode && !idle) return;
            float idleAge = input.SinceAction - IdleForPinWaves;
            for (int j = 0; j < pins.PinCount; j++)
            {
                if (pins.PinToNode[j] >= 0) continue;
                var c = FabricLayout.FabricToWorld(_state.Level.Solution[j]);
                float phase, r1, a1;
                if (input.DraggingNode)
                {
                    phase = Mathf.Repeat(_clock * 1.8f + j * 0.16f, 1f);
                    r1 = 8.5f + 24f * phase;
                    a1 = (1f - phase) * 0.78f;
                    Ring(c, r1, 3.6f, WithA(InkSoft, a1 * 0.16f));
                    Ring(c, r1, 2.0f, WithA(DragRing, a1));
                    if (phase > 0.38f)
                    {
                        float p2 = (phase - 0.38f) / 0.62f;
                        Ring(c, 8.5f + 24f * p2, 1.6f, WithA(Silk, (1f - p2) * 0.5f));
                    }
                    float pulse = 0.5f + 0.5f * Mathf.Sin(_clock * 7.5f + j);
                    Halo(j, c, 10.5f + 3f * pulse, WithA(DragHalo, 0.28f + 0.18f * pulse));
                }
                else
                {
                    phase = Mathf.Repeat(idleAge * 0.85f + j * 0.18f, 1.4f) / 1.4f;
                    r1 = 8.5f + 26f * phase;
                    a1 = (1f - phase) * 0.82f;
                    Ring(c, r1, 3.6f, WithA(InkSoft, a1 * 0.16f));
                    Ring(c, r1, 2.2f, WithA(Honey, a1));
                    if (phase > 0.35f)
                    {
                        float p2 = (phase - 0.35f) / 0.65f;
                        Ring(c, 8.5f + 26f * p2, 1.6f, WithA(Silk, (1f - p2) * 0.55f));
                    }
                    float breath = 0.5f + 0.5f * Mathf.Sin(idleAge * 4.5f + j * 0.7f);
                    Halo(j, c, 11f + 3.5f * breath, WithA(IdleHalo, 0.32f + 0.22f * breath));
                }
            }
        }

        private void Ring(Vector3 c, float r, float width, Color32 color)
        {
            _pts.Clear();
            _cols.Clear();
            for (int i = 0; i < CircleSegments; i++)
            {
                float a = i * Mathf.PI * 2f / CircleSegments;
                _pts.Add(c + new Vector3(Mathf.Cos(a) * r, Mathf.Sin(a) * r, 0f));
                _cols.Add(color);
            }
            _waves.AddPolyline(_pts, _cols, width, true);
        }

        private void Halo(int j, Vector3 c, float r, Color color)
        {
            var sr = _pinHalos[j];
            sr.enabled = true;
            sr.transform.position = c;
            // sprite chấm có bán kính 3,2 pt
            sr.transform.localScale = Vector3.one * (r / 3.2f);
            sr.color = color;
        }

        // ---------- gợi ý uốn ----------

        private void DrawCurveHints(FeedbackInput input)
        {
            if (_state.Score >= _state.Level.WinThreshold || input.DraggingNode) return;
            if (input.SinceNodeRelease < HintAfterRelease) return;
            float fadeIn = Mathf.Clamp01((input.SinceNodeRelease - HintAfterRelease) / HintFadeIn);
            float depth = input.SinceAction > IdleForDeepHint ? 1f : 0.85f;
            var topo = _state.Topology;
            int n = topo.RingLength, shown = 0;
            for (int k = 0; k < n; k++)
            {
                if (!_state.Pins.TryGetEdgeTarget(k, _state.Positions, _state.FoldLine, out float h)) continue;
                if (Mathf.Abs(_state.Bends[k] - h) < HintMinError) continue;
                float emph = System.Array.IndexOf(_state.Level.BendFree, k) >= 0 ? 1f : 0.75f;
                int a = topo.RingNode(k), b = topo.RingNode((k + 1) % n);
                SampleEdge(a, b, _state.Bends, _cur);
                System.Array.Copy(_state.Bends, _bendScratch, n);
                _bendScratch[k] = h;
                SampleEdge(a, b, _bendScratch, _sol);
                float breath = 0.5f + 0.5f * Mathf.Sin(_clock * 3.2f + shown * 0.8f);

                // mảng trăng khuyết giữa dây và cung đích: tứ giác nối từng cặp điểm cùng bậc
                _pts.Clear();
                for (int s = 0; s <= Steps; s++) _pts.Add(FabricLayout.FabricToWorld(_cur[s]));
                for (int s = 0; s <= Steps; s++) _pts.Add(FabricLayout.FabricToWorld(_sol[s]));
                _tris.Clear();
                for (int s = 0; s < Steps; s++)
                {
                    int c0 = s, c1 = s + 1, s0 = Steps + 1 + s, s1 = s0 + 1;
                    _tris.Add(c0); _tris.Add(c1); _tris.Add(s0);
                    _tris.Add(s0); _tris.Add(c1); _tris.Add(s1);
                }
                _gaps.AddTriangles(_pts, _tris, WithA(Butter, (0.28f + 0.22f * breath * depth) * fadeIn * emph));

                // hào quang tơ quanh dây
                Polyline(_cur, 12f, WithA(Honey, (0.26f + 0.18f * breath * depth) * fadeIn * emph));
                Polyline(_cur, 6f, WithA(Silk, (0.44f + 0.28f * breath * depth) * fadeIn * emph));

                // sóng nét đứt trôi từ dây về cung đích (không khi đang kéo chính dây này)
                if (input.DraggingEdge != k)
                {
                    float wTime = _clock * 0.95f + shown * 0.35f;
                    for (int w = 0; w < 2; w++)
                    {
                        float u = Mathf.Repeat(wTime + w * 0.5f, 1f);
                        if (u <= 0.05f || u >= 0.95f) continue;
                        _pts2.Clear();
                        for (int s = 0; s <= Steps; s++) _pts2.Add(FabricLayout.FabricToWorld(Float2.Lerp(_cur[s], _sol[s], u)));
                        _gaps.AddDashedOpen(_pts2, WithA(Honey, Mathf.Sin(Mathf.PI * u) * (0.68f + 0.22f * depth) * fadeIn * emph), 2f, 4f, 4f);
                    }
                }

                // cung đích nét đứt
                _pts2.Clear();
                for (int s = 0; s <= Steps; s++) _pts2.Add(FabricLayout.FabricToWorld(_sol[s]));
                _gaps.AddDashedOpen(_pts2, WithA(HoneyDeep, (0.58f + 0.35f * breath) * fadeIn * emph), 2.2f, 4f, 4f);

                // nút cúc len giữa dây
                if (shown < _beads.Length)
                {
                    var bead = _beads[shown];
                    float bb = 0.5f + 0.5f * Mathf.Sin(_clock * 3.5f + shown * 0.9f);
                    float r = (5.2f + 0.8f * bb) * (0.4f + 0.6f * fadeIn);
                    bead.enabled = true;
                    bead.transform.position = FabricLayout.FabricToWorld(_cur[Steps / 2]);
                    bead.transform.localScale = Vector3.one * (r / 5.6f);
                    bead.color = new Color(1f, 1f, 1f, emph);
                }
                shown++;
            }
        }

        private void Polyline(Float2[] pts, float width, Color32 color)
        {
            _pts2.Clear();
            _cols.Clear();
            for (int s = 0; s <= Steps; s++)
            {
                _pts2.Add(FabricLayout.FabricToWorld(pts[s]));
                _cols.Add(color);
            }
            _gaps.AddPolyline(_pts2, _cols, width, false);
        }

        // ---------- vệt chỉ vàng khi khớp viền ----------

        private void DrawZips()
        {
            var topo = _state.Topology;
            int n = topo.RingLength;
            for (int i = _activeZips.Count - 1; i >= 0; i--)
            {
                var z = _activeZips[i];
                float el = (_clock - z.Start) / ZipSeconds;
                if (el < 0f) continue;
                if (el >= 1f) { _activeZips.RemoveAt(i); continue; }
                SampleEdge(topo.RingNode(z.Edge), topo.RingNode((z.Edge + 1) % n), _state.Bends, _cur);
                float spread = 1f - (1f - Mathf.Clamp01(el * 1.5f)) * (1f - Mathf.Clamp01(el * 1.5f));
                float u0 = Mathf.Clamp01(0.5f - spread * 0.55f), u1 = Mathf.Clamp01(0.5f + spread * 0.55f);
                float alpha = 1f - el;
                _pts2.Clear();
                _cols.Clear();
                for (int s = 0; s <= 16; s++)
                {
                    _pts2.Add(FabricLayout.FabricToWorld(EdgePointAt(Mathf.Lerp(u0, u1, s / 16f))));
                    _cols.Add(WithA(Honey, alpha * 0.82f));
                }
                _zips.AddPolyline(_pts2, _cols, 7.5f + (1f - el) * 4f, false);
                for (int s = 0; s < _cols.Count; s++) _cols[s] = WithA(Spark, alpha * 0.98f);
                _zips.AddPolyline(_pts2, _cols, 2.8f + (1f - el) * 1.4f, false);
                if (el < 0.75f)
                {
                    float gA = 1f - el / 0.75f, gr = 4.2f * gA;
                    Diamond(_pts2[0], gr, WithA(Spark, gA));
                    Diamond(_pts2[_pts2.Count - 1], gr, WithA(Spark, gA));
                }
            }
        }

        private void Diamond(Vector3 c, float gr, Color32 color)
        {
            _pts.Clear();
            _pts.Add(c + new Vector3(-gr * 1.4f, 0f, 0f));
            _pts.Add(c + new Vector3(0f, gr * 0.7f, 0f));
            _pts.Add(c + new Vector3(gr * 1.4f, 0f, 0f));
            _pts.Add(c + new Vector3(0f, -gr * 0.7f, 0f));
            _tris.Clear();
            _tris.Add(0); _tris.Add(1); _tris.Add(2);
            _tris.Add(0); _tris.Add(2); _tris.Add(3);
            _zips.AddTriangles(_pts, _tris, color);
        }

        /// <summary>Lấy Steps + 1 điểm của cạnh a→b; cạnh thẳng (2 điểm) được nội suy đều cho đủ bậc.</summary>
        private void SampleEdge(int a, int b, float[] bends, Float2[] output)
        {
            int count = _state.Shape.Sample(_state.Positions, bends, a, b, Steps, false, output);
            if (count == Steps + 1) return;
            var p0 = output[0];
            var p1 = output[1];
            for (int s = 0; s <= Steps; s++) output[s] = Float2.Lerp(p0, p1, (float)s / Steps);
        }

        private Float2 EdgePointAt(float u)
        {
            float s = Mathf.Clamp01(u) * Steps;
            int i = Mathf.Min(Steps - 1, (int)s);
            return Float2.Lerp(_cur[i], _cur[i + 1], s - i);
        }

        private static Color32 WithA(Color c, float a) => new Color(c.r, c.g, c.b, Mathf.Clamp01(a));
    }
}

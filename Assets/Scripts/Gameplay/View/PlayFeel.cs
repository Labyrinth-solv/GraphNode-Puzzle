using System.Collections.Generic;
using GraphNode.Core.Geometry;
using GraphNode.Core.Session;
using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>Trạng thái chơi mà phần cảm giác cần đọc mỗi khung (do PuzzleController gom lại).</summary>
    public struct FeelInput
    {
        public bool Dragging;
        public int DragEdge;
        /// <summary>Đạt ngưỡng và đủ chốt (thả tay lúc này là thắng).</summary>
        public bool Ready;
        public float SinceAction;
        public int RunnerEdge;
        public float RunnerT;
        /// <summary>Ngón tay đang giữ (toạ độ scene) và điểm nó đang kéo, cho sợi dây nối mờ.</summary>
        public bool HasFinger;
        public Vector3 Finger, Grabbed;
    }

    /// <summary>
    /// Cảm giác lúc chơi theo bản web (tài liệu kiến trúc mục 5.5): sợi chỉ chùng khi chưa khớp và căng khi đạt, gợn theo
    /// ngón tay khi kéo dây rồi lắng lại, nảy khi khớp viền, rung theo lưỡi kéo, vẫy nhẹ về đích khi người chơi đứng yên;
    /// viền sáng óng khi đạt ngưỡng; sóng tròn, bụi chỉ, dây nối ngón tay, vòng nhắc chạm đầu. Mọi dịch chuyển chỉ áp
    /// lên hình vẽ, không đổi dữ liệu lõi nên điểm khớp không rung. Số liệu tính theo pt của bản web.
    /// </summary>
    public sealed class PlayFeel
    {
        private const float FabricPt = FabricLayout.FabricSize;
        private const int MaxParticles = 96;

        private static readonly Color32 Ink = new Color32(0x4A, 0x3B, 0x35, 0xFF);
        private static readonly Color32 RoseDeep = new Color32(0xD4, 0x83, 0x7C, 0xFF);
        private static readonly Color32[] LintColors =
        {
            new Color32(0xFF, 0xD2, 0x69, 0xFF), new Color32(0xFF, 0xF8, 0xE8, 0xFF), new Color32(0xDF, 0xB1, 0x5B, 0xFF),
            new Color32(0xF7, 0xE6, 0xDF, 0xFF), new Color32(0xC2, 0x9C, 0x90, 0xFF)
        };

        private struct Particle
        {
            public Vector3 Pos, Vel;
            public float Age, Life, Size, Rot, Spin, Gravity;
            public Color32 Color;
        }

        private struct Ripple
        {
            public Vector3 Pos;
            public float Start;
            public Color32 Color;
        }

        private struct Bounce
        {
            public float Start, Dir;
        }

        private readonly PuzzleState _state;
        private readonly StrokeMesh _glow, _effects;
        private readonly Particle[] _particles = new Particle[MaxParticles];
        private int _particleCount;
        private readonly List<Ripple> _ripples = new List<Ripple>(16);
        private readonly Bounce[] _bounces;
        private readonly float[] _wake;
        private readonly float[] _edgeFit;
        private readonly List<Vector3> _dash = new List<Vector3>(2);
        private float _clock;

        // dây chùng (pt) và nhịp gảy khi vừa đạt ngưỡng
        private float _slack = 2.5f;
        private float _pluckAt = -9f, _surgeAt = -9f, _winFlashAt = -9f;
        private bool _ready, _dragging;
        private float _sinceAction;
        private int _runnerEdge = -1;
        private float _runnerT;

        // gợn dây khi kéo và lúc lắng lại sau khi thả
        private int _waveEdge = -1;
        private float _waveU, _waveUSmooth, _waveRip, _waveSkew, _waveRipShown;
        private bool _waveInMagnet, _waveDragging;
        private float _settleT, _settleSkew0, _settleRip0;

        // vào màn: node hiện dần lần lượt, hình mẫu và vùng tô rõ dần
        private const float IntroTime = 0.9f, IntroFade = 0.5f;
        private float _introT;

        public bool ShowStartCue { get; set; }
        private bool _touched;

        /// <summary>0–1: hình mẫu, vùng tô, sợi chỉ rõ dần lúc vào màn.</summary>
        public float Intro => Mathf.Clamp01(_introT / IntroFade);

        /// <summary>Sợi chỉ dày thêm một chút ngay lúc gảy.</summary>
        public float PluckWidth
        {
            get
            {
                float age = _clock - _pluckAt;
                return age >= 0f && age < 0.25f ? (1f - age / 0.25f) * 1.2f : 0f;
            }
        }

        public PlayFeel(PuzzleState state, StrokeMesh glow, StrokeMesh effects)
        {
            _state = state;
            _glow = glow;
            _effects = effects;
            int ring = state.Topology.RingLength;
            _bounces = new Bounce[ring];
            _wake = new float[ring];
            _edgeFit = new float[ring];
            for (int k = 0; k < ring; k++)
            {
                _bounces[k].Start = -9f;
                _wake[k] = -99f;
                _edgeFit[k] = 1f;
            }
        }

        /// <summary>Tỉ lệ node i đã hiện lúc vào màn (nảy ra lần lượt cách nhau 70 ms).</summary>
        public float IntroScaleTarget(int i) => _introT > 0.12f + i * 0.07f ? 1f : 0f;

        public bool InIntro => _introT < IntroTime;

        /// <summary>Độ lệch lớn nhất của dây k so với viền mẫu (bề rộng vải): dây đã nằm đúng viền thì không chùng.</summary>
        public void SetEdgeError(int k, float maxError)
        {
            float u = Mathf.Clamp01((maxError - 0.010f) / (0.026f - 0.010f));
            _edgeFit[k] = u * u * (3f - 2f * u);
        }

        public void Tick(float dt, in FeelInput input, bool presenting)
        {
            _clock += dt;
            _introT += dt;
            if (input.Dragging) _touched = true;
            _dragging = input.Dragging;
            _sinceAction = input.SinceAction;
            if (_runnerEdge >= 0 && input.RunnerEdge != _runnerEdge && !presenting) _wake[_runnerEdge] = _clock;
            _runnerEdge = input.RunnerEdge;
            _runnerT = input.RunnerT;

            // vừa kéo lọt vào vùng thắng: bùng sáng và gảy dây
            if (input.Ready && !_ready && input.Dragging && !presenting) ReadySurge();
            _ready = input.Ready;

            float targetSlack = presenting || input.Ready ? 0f : 2.5f;
            _slack += (targetSlack - _slack) * Mathf.Min(1f, dt * (presenting ? 14f : 10f));

            TickWave(dt);
            TickParticles(dt);
        }

        // ---------- sự kiện ----------

        public void ReadySurge()
        {
            _surgeAt = _clock;
            _pluckAt = _clock;
        }

        /// <summary>Thả tay thắng: viền chớp sáng rồi tắt mềm.</summary>
        public void WinFlash() => _winFlashAt = _clock;

        public void BounceEdge(int k, float dir, float delay = 0f)
        {
            if (k < 0 || k >= _bounces.Length) return;
            _bounces[k] = new Bounce { Start = _clock + delay, Dir = dir >= 0f ? 1f : -1f };
        }

        public void AddRipple(Vector3 world, Color32 color) => _ripples.Add(new Ripple { Pos = world, Start = _clock, Color = color });

        /// <summary>Bụi chỉ bay ra từ một điểm; angle là hướng (radian, toạ độ scene) mà bụi bay ngược lại.</summary>
        public void Lint(Vector3 world, float angle, int count)
        {
            for (int i = 0; i < count && _particleCount < MaxParticles; i++)
            {
                float a = angle + Mathf.PI + (Random.value - 0.5f) * 1.6f, v = 40f + Random.value * 60f;
                _particles[_particleCount++] = new Particle
                {
                    Pos = world,
                    Vel = new Vector3(Mathf.Cos(a) * v, Mathf.Sin(a) * v + 20f, 0f),
                    Life = 0.45f + Random.value * 0.3f,
                    Size = 1.6f + Random.value * 1.8f,
                    Rot = Random.value * 6f,
                    Spin = (Random.value - 0.5f) * 10f,
                    Gravity = -220f,
                    Color = LintColors[i % LintColors.Length]
                };
            }
        }

        public void BeginWave(int k, float u)
        {
            _waveEdge = k;
            _waveDragging = true;
            _waveU = _waveUSmooth = Mathf.Clamp(u, 0.25f, 0.75f);
            _waveRip = 0f;
            _settleT = -1f;
        }

        /// <param name="u">Vị trí ngón tay chiếu lên dây (0–1).</param>
        /// <param name="bend">Độ uốn hiện tại của dây.</param>
        public void MoveWave(float u, float bend, bool inMagnet)
        {
            if (!_waveDragging) return;
            u = Mathf.Clamp(u, 0.14f, 0.86f);
            float du = u - _waveU;
            _waveU = u;
            _waveUSmooth += (u - _waveUSmooth) * 0.55f;
            float dirSign = bend >= 0f ? 1f : -1f;
            float scale = Mathf.Clamp(Mathf.Abs(bend) * 0.6f + 0.020f, 0.024f, 0.065f);
            _waveRip = Mathf.Clamp(_waveRip + du * 1.6f * scale * dirSign, -0.045f, 0.045f);
            _waveInMagnet = inMagnet;
        }

        /// <summary>Thả dây: gợn đang có lắng dần trong 0,26 s.</summary>
        public void EndWave()
        {
            if (!_waveDragging) return;
            _waveDragging = false;
            if (Mathf.Abs(_waveSkew) > 1e-3f || Mathf.Abs(_waveRipShown) > 1e-4f)
            {
                _settleT = 0f;
                _settleSkew0 = _waveSkew;
                _settleRip0 = _waveRipShown;
            }
            else _waveEdge = -1;
        }

        private void TickWave(float dt)
        {
            if (_waveEdge < 0) return;
            if (_waveDragging)
            {
                _waveRip *= Mathf.Exp(-dt * 8.5f);
                _waveUSmooth += (_waveU - _waveUSmooth) * Mathf.Min(1f, dt * 28f);
                _waveSkew = (_waveUSmooth - 0.5f) * (_waveInMagnet ? 0.35f : 1f);
                _waveRipShown = _waveRip * Mathf.Cos(_clock * 18f) * (_waveInMagnet ? 0.5f : 1f);
                return;
            }
            if (_settleT < 0f) { _waveEdge = -1; return; }
            _settleT += dt;
            float decay = Mathf.Exp(-_settleT * 14f), osc = Mathf.Cos(_settleT * 24f);
            _waveSkew = _settleSkew0 * decay * osc;
            _waveRipShown = _settleRip0 * Mathf.Exp(-_settleT * 12f) * Mathf.Cos(_settleT * 28f) - _settleSkew0 * 0.028f * decay * Mathf.Sin(_settleT * 24f);
            _waveUSmooth = 0.5f + _waveSkew;
            if (_settleT >= 0.26f || (Mathf.Abs(_waveSkew) < 1e-3f && Mathf.Abs(_waveRipShown) < 1e-4f))
            {
                _waveEdge = -1;
                _settleT = -1f;
            }
        }

        // ---------- biến dạng sợi chỉ ----------

        /// <summary>
        /// Dịch một điểm mẫu của dây k (toạ độ vải, y hướng xuống) theo các hiệu ứng: chùng, gợn kéo dây, rung theo lưỡi
        /// kéo, nảy khi khớp, gảy, vẫy về đích. t là vị trí tỉ lệ trên dây, normal là pháp tuyến của dây (vải).
        /// </summary>
        public Float2 Displace(int k, float t, Float2 p, Float2 normal, float bend, float targetBend, bool hasTarget, bool presenting)
        {
            float env = Mathf.Sin(Mathf.PI * t);
            float dx = 0f, dy = 0f;

            // gợn theo ngón tay khi kéo dây (bản web làm trong edgePoly; ở đây chỉ là hình vẽ)
            if (k == _waveEdge)
            {
                float rip = _waveRipShown;
                if (Mathf.Abs(rip) >= 1e-4f)
                {
                    float rw = env * Mathf.Sin(Mathf.PI * 2f * (t - _waveUSmooth)) * rip;
                    dx += normal.X * rw; dy += normal.Y * rw;
                }
                float asym = -2.8f * _waveSkew * 4f * bend;
                float sk = asym * (2f * t * t * t - 3f * t * t + t);
                dx += normal.X * sk; dy += normal.Y * sk;
            }

            bool active = !presenting;
            bool pinching = k == _waveEdge;
            float localSlack = pinching ? 0f : _slack * _edgeFit[k];
            bool runEdge = active && k == _runnerEdge;
            float ring = 0f, blade = 0f;
            if (runEdge)
            {
                float rt = _runnerT, ramp = rt * rt * (3f - 2f * rt);
                ring = ramp * Mathf.Sin(rt * Mathf.PI * 0.5f);
                float du = t - rt;
                blade = Mathf.Exp(-du * du * 18f) * Mathf.Sin(Mathf.PI * rt);
            }
            else if (active)
            {
                float age = _clock - _wake[k];
                if (age >= 0f && age < 1.35f) ring = Mathf.Exp(-age * 2.8f) * (1f - age / 1.35f) * Mathf.Cos(age * 9.5f);
            }
            float side = k % 2 == 1 ? -1f : 1f;
            float pAge = _clock - _pluckAt;
            float pluck = pAge >= 0f && pAge < 0.45f ? Mathf.Sin(pAge * 55f) * Mathf.Exp(-pAge * 7f) * 3.2f : 0f;
            float sag = env * localSlack * (0.35f + 0.45f * blade + 0.28f * Mathf.Abs(ring));
            float wv = env * (localSlack * (0.85f * blade + 0.75f * ring * Mathf.Sin(t * Mathf.PI * 2f + 0.8f)) * side + pluck * side);

            var b = _bounces[k];
            float bAge = _clock - b.Start;
            if (bAge >= 0f && bAge < 0.30f)
                wv += env * 2.2f * b.Dir * Mathf.Exp(-bAge * 15f) * (1f - bAge / 0.30f) * Mathf.Sin(bAge * 52f);

            // đứng yên đã lâu, đủ chốt mà chưa đạt: dây còn lệch đích vẫy nhẹ về phía đích
            if (active && hasTarget && !_dragging && _sinceAction > 1.8f && _state.Pins.AllFilled && _state.Score < _state.Level.WinThreshold
                && Mathf.Abs(bend - targetBend) > 0.012f)
            {
                float pulse = 0.5f + 0.5f * Mathf.Sin((_sinceAction - 1.8f) * 3.2f + k * 0.7f);
                wv += env * pulse * 1.5f * (targetBend - bend >= 0f ? 1f : -1f);
            }

            dx += normal.X * wv / FabricPt;
            dy += normal.Y * wv / FabricPt + sag / FabricPt;
            return new Float2(p.X + dx, p.Y + dy);
        }

        // ---------- vẽ ----------

        /// <summary>
        /// Viền sáng óng khi đang giữ tay trong vùng thắng, bùng lên lúc vừa lọt vào và chớp sáng khi thả tay thắng:
        /// quầng màu chỉ, lõi trắng và đốm lấp lánh chạy dọc vòng.
        /// </summary>
        public void DrawGlow(List<Vector3> points, List<float> cumulative, float intro, System.Func<float, Color32> yarn)
        {
            _glow.Clear();
            bool holding = _ready && _dragging;
            float surgeAge = _clock - _surgeAt, flashAge = _clock - _winFlashAt;
            bool inSurge = surgeAge >= 0f && surgeAge < 0.60f, inFlash = flashAge >= 0f && flashAge < 0.48f;
            if ((holding || inSurge || inFlash) && points.Count > 2)
            {
                float surge = inSurge ? 1f - surgeAge / 0.60f : 0f;
                float breathe = holding ? 0.55f + 0.15f * Mathf.Sin(_clock * 7f) : 0f;
                float flash = 0f;
                if (inFlash) flash = flashAge < 0.08f ? flashAge / 0.08f : Mathf.Pow(1f - (flashAge - 0.08f) / 0.40f, 2f);
                float energy = Mathf.Max(surge, flash);
                float alpha = Mathf.Clamp01(Mathf.Max(breathe, Mathf.Max(surge * 0.85f, flash))) * intro;
                if (alpha >= 0.02f)
                {
                    float total = Mathf.Max(1e-4f, cumulative[cumulative.Count - 1]);
                    var colors = Scratch(points.Count);
                    for (int i = 0; i < points.Count; i++)
                    {
                        var c = yarn(cumulative[i] / total + _clock * 0.12f);
                        c.a = (byte)(255 * alpha * 0.82f);
                        colors.Add(c);
                    }
                    float halo = 7.6f + 3.6f * energy + (holding ? Mathf.Sin(_clock * 7f) : 0f);
                    _glow.AddPolyline(points, colors, halo, true);
                    colors.Clear();
                    var white = new Color32(255, 255, 255, (byte)(255 * alpha * 0.98f));
                    for (int i = 0; i < points.Count; i++) colors.Add(white);
                    _glow.AddPolyline(points, colors, 2.8f + 0.8f * energy, true);

                    float glint = Mathf.Max(inSurge ? (surge - 0.12f) / 0.88f : 0f, inFlash ? flash : 0f);
                    if (glint > 0.08f)
                    {
                        float ga = glint * intro, gr = (3.5f + 2f * glint) * ga;
                        var gc = new Color32(255, 255, 255, (byte)(255 * Mathf.Clamp01(ga * 0.98f)));
                        for (int g = 0; g < 5; g++)
                        {
                            float u = (_clock * 0.40f + g / 5f) % 1f;
                            _glow.AddDiamond(PointAt(points, cumulative, u * total), gr * 1.4f, gr * 0.7f, gc);
                        }
                    }
                }
            }
            _glow.Apply();
        }

        /// <summary>Sóng tròn, bụi chỉ, dây nối ngón tay và vòng nhắc chạm đầu.</summary>
        public void DrawEffects(in FeelInput input, Vector3 cueNode, bool hasCue)
        {
            _effects.Clear();
            for (int i = _ripples.Count - 1; i >= 0; i--)
            {
                var r = _ripples[i];
                float t = (_clock - r.Start) / 0.45f;
                if (t >= 1f) { _ripples.RemoveAt(i); continue; }
                float rad = 10f + 24f * t, a = 1f - t;
                _effects.AddRing(r.Pos, rad, 5f, WithAlpha(Ink, a * 0.24f));
                _effects.AddRing(r.Pos, rad, 3f, WithAlpha(r.Color, a * 0.96f));
            }
            for (int i = 0; i < _particleCount; i++)
            {
                var p = _particles[i];
                float a = Mathf.Clamp01((p.Life - p.Age) / 0.4f);
                _effects.AddRect(p.Pos, p.Size * 1.4f, p.Size * 0.5f, p.Rot, WithAlpha(p.Color, a));
            }
            if (input.HasFinger)
            {
                _dash.Clear();
                _dash.Add(input.Finger);
                _dash.Add(input.Grabbed);
                _effects.AddDashedOpen(_dash, WithAlpha(Ink, 0.5f), 1.8f, 3f, 5f);
                _effects.AddDisc(input.Finger, 14f, WithAlpha(Ink, 0.1f));
                _effects.AddRing(input.Finger, 14f, 2f, WithAlpha(Ink, 0.45f));
            }
            if (ShowStartCue && !_touched && hasCue && !InIntro)
            {
                float t = _clock % 1.4f / 1.4f;
                _effects.AddRing(cueNode, 14f + 14f * t, 2.5f, WithAlpha(RoseDeep, 1f - t));
            }
            _effects.Apply();
        }

        private void TickParticles(float dt)
        {
            for (int i = _particleCount - 1; i >= 0; i--)
            {
                ref var p = ref _particles[i];
                p.Age += dt;
                if (p.Age > p.Life) { _particles[i] = _particles[--_particleCount]; continue; }
                p.Vel.y += p.Gravity * dt;
                p.Pos += p.Vel * dt;
                p.Rot += p.Spin * dt;
            }
        }

        private readonly List<Color32> _scratch = new List<Color32>(512);
        private List<Color32> Scratch(int capacity)
        {
            _scratch.Clear();
            if (_scratch.Capacity < capacity) _scratch.Capacity = capacity;
            return _scratch;
        }

        private static Vector3 PointAt(List<Vector3> points, List<float> cumulative, float d)
        {
            for (int i = 1; i < points.Count; i++)
            {
                if (cumulative[i] < d) continue;
                float seg = cumulative[i] - cumulative[i - 1];
                return Vector3.Lerp(points[i - 1], points[i], seg > 1e-5f ? (d - cumulative[i - 1]) / seg : 0f);
            }
            return points[points.Count - 1];
        }

        private static Color32 WithAlpha(Color32 c, float a)
        {
            c.a = (byte)(255 * Mathf.Clamp01(a));
            return c;
        }
    }
}

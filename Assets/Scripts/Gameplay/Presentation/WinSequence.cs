using System.Collections.Generic;
using System.Threading;
using Cysharp.Threading.Tasks;
using GraphNode.Core.Runner;
using GraphNode.Data.Configs;
using GraphNode.Foundation.Services;
using GraphNode.Gameplay.View;
using UnityEngine;

namespace GraphNode.Gameplay.Presentation
{
    /// <summary>Trạng thái chung của chuỗi thắng: View để vẽ, thông số, hệ số tua nhanh khi người chơi chạm.</summary>
    public sealed class PresentationContext
    {
        public PuzzleView View { get; }
        public WinSequenceParams Params { get; }
        /// <summary>1 lúc thường; chạm trong chuỗi thì tăng lên hệ số tua nhanh cố định.</summary>
        public float Speed { get; set; } = 1f;

        /// <summary>Có thể null (test, tắt tiếng).</summary>
        public IAudioService Audio { get; }

        public PresentationContext(PuzzleView view, WinSequenceParams parameters, IAudioService audio = null)
        {
            View = view;
            Params = parameters;
            Audio = audio;
        }

        /// <summary>Thời gian khung hình đã nhân hệ số tua.</summary>
        public float Delta => Time.deltaTime * Speed;
    }

    /// <summary>
    /// Một bước của chuỗi thắng (tài liệu kiến trúc mục 5.2): chạy tuần tự bằng UniTask, có CancellationToken gắn vòng
    /// đời scene. Thêm bước (lật bung màn gấp, nhấc mảnh, đổ màu, bay về thẻ) bằng một lớp mới.
    /// </summary>
    public interface IPresentationStep
    {
        UniTask PlayAsync(PresentationContext context, CancellationToken ct);
    }

    /// <summary>
    /// Snap: node và dây về đúng lời giải cùng một tốc độ, đi thẳng một mạch; xa quá thì cả nhóm nhanh lên. Node và sợi chỉ
    /// mờ dần, nhỏ lại để không che đường cắt. Kéo dài ít nhất một nhịp để thấy chớp sáng thắng.
    /// </summary>
    public sealed class SnapStep : IPresentationStep
    {
        public async UniTask PlayAsync(PresentationContext c, CancellationToken ct)
        {
            var p = c.Params;
            c.View.BeginPresentation();
            float md = c.View.SnapDistance();
            float v = Mathf.Max(p.SnapSpeed, md / p.SnapMaxSeconds);
            float duration = Mathf.Max(p.SnapHoldSeconds, Mathf.Clamp(md / v, p.SnapMinSeconds, p.SnapMaxSeconds));
            for (float t = 0f; t < duration; t += c.Delta)
            {
                float u = t / duration;
                c.View.SetSnap(t * v, u, Mathf.Lerp(1f, p.CutNodeAlpha, u), Mathf.Lerp(1f, p.CutNodeSize, u));
                await UniTask.Yield(PlayerLoopTiming.Update, ct);
            }
            c.View.SetSnap(md + 1f, 1f, p.CutNodeAlpha, p.CutNodeSize);
        }
    }

    /// <summary>
    /// Cảnh cắt: kéo chạy dọc viền mẫu nhanh hơn tốc độ thường theo hệ số tính từ chu vi; nét cắt mực bám sau lưỡi kéo,
    /// node nào đầu kéo chạm thì sáng lại và nảy.
    /// </summary>
    public sealed class CutStep : IPresentationStep
    {
        public async UniTask PlayAsync(PresentationContext c, CancellationToken ct)
        {
            c.View.BeginCut();
            float perimeter = c.View.CutPerimeter;
            float duration = CutTiming.Duration(perimeter, c.Params.Cut);
            int rank = 0;
            for (float t = 0f; t < duration; t += c.Delta)
            {
                rank = PlayRising(c, rank, c.View.SetCut(perimeter * t / duration, c.Delta));
                await UniTask.Yield(PlayerLoopTiming.Update, ct);
            }
            PlayRising(c, rank, c.View.SetCut(perimeter, 0f));
            await UniTask.Delay(System.TimeSpan.FromSeconds(c.Params.AfterCutSeconds / c.Speed), cancellationToken: ct);
        }

        // mỗi node lưỡi kéo chạm phát một nốt cao hơn nốt trước (thang ngũ cung leo, không vòng về)
        private static int PlayRising(PresentationContext c, int rank, int newHits)
        {
            for (int i = 0; i < newHits; i++) c.Audio?.PlayNote("note_rise", rank++, 0.07f);
            return rank;
        }
    }

    /// <summary>Nhấc mảnh vừa cắt lên (nảy vượt rồi về), để lại lỗ trên vải; mảnh lắc nhẹ.</summary>
    public sealed class LiftStep : IPresentationStep
    {
        public async UniTask PlayAsync(PresentationContext c, CancellationToken ct)
        {
            c.View.BeginLift();
            float d = c.Params.LiftSeconds;
            for (float t = 0f; t < d; t += c.Delta)
            {
                c.View.SetLift(Easing.Back(t / d));
                await UniTask.Yield(PlayerLoopTiming.Update, ct);
            }
            c.View.SetLift(1f);
        }
    }

    /// <summary>Màu vải loang từ đáy mảnh lên, mảnh vẫn nhấc và lắc nhẹ.</summary>
    public sealed class FillStep : IPresentationStep
    {
        public async UniTask PlayAsync(PresentationContext c, CancellationToken ct)
        {
            float d = c.Params.FillSeconds;
            for (float t = 0f; t < d; t += c.Delta)
            {
                c.View.SetLift(1f);
                c.View.SetFill(Easing.InOut(t / d));
                await UniTask.Yield(PlayerLoopTiming.Update, ct);
            }
            c.View.SetFill(1f);
        }
    }

    /// <summary>Mảnh bay theo cung vào ô của nó trong hàng Bộ vải ghép.</summary>
    public sealed class FlyStep : IPresentationStep
    {
        public async UniTask PlayAsync(PresentationContext c, CancellationToken ct)
        {
            float d = c.Params.FlySeconds;
            for (float t = 0f; t < d; t += c.Delta)
            {
                c.View.SetFly(Easing.InOut(t / d));
                await UniTask.Yield(PlayerLoopTiming.Update, ct);
            }
            c.View.SetFly(1f);
        }
    }

    internal static class Easing
    {
        public static float InOut(float t)
        {
            t = Mathf.Clamp01(t);
            return t < 0.5f ? 2f * t * t : 1f - Mathf.Pow(-2f * t + 2f, 2f) / 2f;
        }

        /// <summary>Vượt quá một chút rồi về (easeOutBack).</summary>
        public static float Back(float t)
        {
            t = Mathf.Clamp01(t);
            const float c1 = 1.70158f, c3 = c1 + 1f;
            return 1f + c3 * Mathf.Pow(t - 1f, 3f) + c1 * Mathf.Pow(t - 1f, 2f);
        }
    }

    /// <summary>Chạy lần lượt các bước của chuỗi thắng.</summary>
    public sealed class WinSequence
    {
        private readonly List<IPresentationStep> _steps = new List<IPresentationStep>();

        public WinSequence Add(IPresentationStep step)
        {
            _steps.Add(step);
            return this;
        }

        public async UniTask PlayAsync(PresentationContext context, CancellationToken ct)
        {
            for (int i = 0; i < _steps.Count; i++) await _steps[i].PlayAsync(context, ct);
        }

        /// <summary>Chuỗi mặc định của màn thường: snap, cắt, nhấc, đổ màu, bay về ô (màn gấp thêm lật bung sau).</summary>
        public static WinSequence Default() => new WinSequence()
            .Add(new SnapStep()).Add(new CutStep()).Add(new LiftStep()).Add(new FillStep()).Add(new FlyStep());
    }
}

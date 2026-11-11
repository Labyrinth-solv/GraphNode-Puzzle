using System;
using System.Collections.Generic;
using GraphNode.Foundation.Services;
using GraphNode.UI.Common;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace GraphNode.Gameplay.Hud
{
    /// <summary>
    /// HUD màn chơi trên Canvas (prefab GameplayHud, tài liệu kiến trúc mục 5.13): thẻ Hình mẫu, hàng Bộ vải ghép (ô từ
    /// Slot.prefab), thanh khớp, nút Gợi ý (Booster.prefab). Bố cục, art và chữ nằm trong prefab, người dùng chỉnh trong
    /// Editor; lớp này chỉ đổ dữ liệu vào. Chữ lấy từ bảng chuỗi theo khóa.
    /// </summary>
    public sealed class HudView : MonoBehaviour
    {
        [Header("Chữ (khóa trong bảng chuỗi)")]
        [SerializeField] private TMP_Text patternLabel;
        [SerializeField] private string patternKey = "hud.pattern";
        [SerializeField] private TMP_Text piecesLabel;
        [SerializeField] private string piecesKey = "hud.pieces";
        [SerializeField] private TMP_Text matchLabel;
        [SerializeField] private string matchKey = "hud.match";

        [Header("Hình mẫu")]
        [SerializeField] private UIShapeGraphic miniShape;
        [SerializeField, Range(0f, 1f)] private float miniFillAlpha = 0.45f;

        [Header("Bộ vải ghép")]
        [SerializeField] private RectTransform slotRow;
        [SerializeField] private GameObject slotPrefab;
        [Tooltip("Hình mảnh đã xong vẽ trong ô (UIShapeGraphic)")]
        [SerializeField] private UIShapeGraphic slotPiecePrefab;
        [Tooltip("Mảnh chiếm phần này của cạnh ô (bản web: 34 trên 46 pt)")]
        [SerializeField, Range(0.3f, 1f)] private float slotPieceFit = 0.74f;

        [Header("Thanh khớp")]
        [Tooltip("Vùng trong của thanh (phần đổ chạy trong bề rộng này)")]
        [SerializeField] private RectTransform barTrack;
        [SerializeField] private RectTransform barFill;
        [SerializeField] private Image barFillImage;
        [SerializeField] private RectTransform markerLow;
        [SerializeField] private RectTransform markerHigh;
        [SerializeField] private float barMinFill = 14f;
        [SerializeField] private Color barFar = new Color32(0xEE, 0xB8, 0xB0, 0xFF);
        [SerializeField] private Color barMid = new Color32(0xD8, 0x8A, 0x74, 0xFF);
        [SerializeField] private Color barNear = new Color32(0x5D, 0xB5, 0x82, 0xFF);
        [Tooltip("Lớp trắng phủ lên phần đổ, chớp khi vượt mốc hoặc vừa đạt ngưỡng")]
        [SerializeField] private Image barFlash;
        [SerializeField, Range(0f, 1f)] private float barFlashAlpha = 0.6f;

        [Header("Gợi ý")]
        [SerializeField] private Button hintButton;
        [SerializeField] private TMP_Text hintCount;
        [SerializeField] private TMP_Text hintLabel;
        [SerializeField] private string hintKey = "booster.hint";
        [SerializeField, Range(0f, 1f)] private float hintDisabledAlpha = 0.4f;
        [SerializeField] private CanvasGroup hintGroup;

        private readonly List<RectTransform> _slots = new List<RectTransform>();
        private float _barValue;

        /// <summary>Người chơi bấm nút Gợi ý.</summary>
        public event Action HintPressed;

        private void Awake()
        {
            // Canvas Screen Space - Camera trong prefab không tham chiếu được camera của scene
            var canvas = GetComponentInParent<Canvas>();
            if (canvas != null && canvas.renderMode == RenderMode.ScreenSpaceCamera && canvas.worldCamera == null) canvas.worldCamera = Camera.main;
            if (hintButton != null) hintButton.onClick.AddListener(() => HintPressed?.Invoke());
        }

        /// <param name="shape">Viền hình mẫu (y hướng lên) và tam giác hóa sẵn.</param>
        public void Bind(ILocalizer localizer, IReadOnlyList<Vector2> shape, IReadOnlyList<int> triangles, Color pieceColor, int pieceSlots)
        {
            SetText(patternLabel, localizer, patternKey);
            SetText(piecesLabel, localizer, piecesKey);
            SetText(matchLabel, localizer, matchKey);
            SetText(hintLabel, localizer, hintKey);
            if (miniShape != null) miniShape.SetShape(shape, triangles, new Color(pieceColor.r, pieceColor.g, pieceColor.b, miniFillAlpha));

            // ô mảnh: phần tử lặp theo dữ liệu, instantiate từ prefab ô của người dùng
            foreach (var s in _slots) if (s != null) Destroy(s.gameObject);
            _slots.Clear();
            if (slotRow != null && slotPrefab != null)
            {
                // ô vuông theo chiều cao hàng: đổi cỡ ô bằng cách đổi chiều cao SlotRow trong prefab HUD
                float side = slotRow.rect.height;
                for (int i = 0; i < pieceSlots; i++)
                {
                    var slot = (RectTransform)Instantiate(slotPrefab, slotRow).transform;
                    slot.sizeDelta = new Vector2(side, side);
                    _slots.Add(slot);
                }
            }
        }

        /// <summary>Vẽ một mảnh đã xong vào ô của nó (hình viền lời giải, màu vải và nét viền của mảnh).</summary>
        public void ShowDonePiece(int slot, IReadOnlyList<Vector2> shape, IReadOnlyList<int> triangles, Color fill, Color line)
        {
            if (slotPiecePrefab == null || slot < 0 || slot >= _slots.Count || _slots[slot] == null) return;
            var piece = Instantiate(slotPiecePrefab, _slots[slot]);
            var rt = piece.rectTransform;
            float inset = (1f - slotPieceFit) * 0.5f;
            rt.anchorMin = new Vector2(inset, inset);
            rt.anchorMax = new Vector2(1f - inset, 1f - inset);
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            piece.SetShape(shape, triangles, fill, line);
        }

        public void SetHints(int count)
        {
            if (hintCount != null) hintCount.text = count.ToString();
            if (hintButton != null) hintButton.interactable = count > 0;
            if (hintGroup != null) hintGroup.alpha = count > 0 ? 1f : hintDisabledAlpha;
        }

        /// <summary>Thanh khớp: độ khớp quy về thang 0,5…ngưỡng; màu theo hai mốc như bản web; chạy mượt tới giá trị mới.</summary>
        public void SetMatch(float score, float threshold, float dt)
        {
            if (barTrack == null || barFill == null) return;
            float target = BarValue(score, threshold);
            _barValue += (target - _barValue) * Mathf.Min(1f, dt * 12f);
            float m1 = Mathf.Min(0.70f, threshold - 0.08f), m2 = Mathf.Min(0.85f, threshold);
            if (barFillImage != null)
            {
                barFillImage.color = score >= m2 ? barNear : (score >= m1 ? barMid : barFar);
                barFillImage.enabled = _barValue * barTrack.rect.width > 1f;
            }
            float inner = barTrack.rect.width;
            barFill.sizeDelta = new Vector2(Mathf.Max(barMinFill, inner * _barValue), barFill.sizeDelta.y);
            _flash = Mathf.Max(0f, _flash - dt * 3f);
            if (barFlash != null)
            {
                barFlash.enabled = _flash > 0f && barFillImage != null && barFillImage.enabled;
                barFlash.rectTransform.sizeDelta = barFill.sizeDelta;
                barFlash.color = new Color(1f, 1f, 1f, barFlashAlpha * _flash);
            }
            if (markerLow != null) markerLow.anchoredPosition = new Vector2(inner * BarValue(m1, threshold), markerLow.anchoredPosition.y);
            if (markerHigh != null) markerHigh.anchoredPosition = new Vector2(inner * BarValue(m2, threshold), markerHigh.anchoredPosition.y);
        }

        /// <summary>Phần đổ chớp trắng rồi tắt trong khoảng 1/3 giây.</summary>
        public void Flash() => _flash = 1f;

        private float _flash;

        /// <summary>Thanh khớp dạng 0–1 đang hiển thị (sợi chỉ căng dần theo số này).</summary>
        public float BarDisplay => _barValue;

        /// <summary>Tâm và cỡ (đơn vị thế giới) của ô mảnh thứ i, để mảnh vừa cắt bay vào.</summary>
        public bool TryGetSlot(int index, out Vector3 worldCenter, out float worldSize)
        {
            worldCenter = default;
            worldSize = 0f;
            if (index < 0 || index >= _slots.Count || _slots[index] == null) return false;
            var corners = new Vector3[4];
            _slots[index].GetWorldCorners(corners);
            worldCenter = (corners[0] + corners[2]) * 0.5f;
            worldCenter.z = 0f;
            worldSize = Mathf.Min(corners[2].x - corners[0].x, corners[2].y - corners[0].y);
            return true;
        }

        private static float BarValue(float v, float thr) => Mathf.Clamp01((v - 0.5f) / (thr - 0.5f));

        private static void SetText(TMP_Text text, ILocalizer localizer, string key)
        {
            if (text != null && localizer != null && !string.IsNullOrEmpty(key)) text.text = localizer.Get(key);
        }
    }
}

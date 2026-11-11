using System.IO;
using GraphNode.Gameplay.Hud;
using GraphNode.Gameplay.View;
using GraphNode.Services.Localization;
using GraphNode.UI.Common;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

namespace GraphNode.Editor.Content
{
    /// <summary>
    /// Công cụ dựng một lần các prefab màn chơi theo bố cục bản web (người dùng chốt 2026-11-11: HUD trên Canvas, phần thế
    /// giới thành prefab). Kết quả là prefab thường, người dùng sửa trong Editor; lệnh không ghi đè prefab đã có, nên chạy
    /// lại không mất chỉnh sửa. Game lúc chạy không dựng đối tượng bằng code, chỉ đổ dữ liệu vào các prefab này.
    /// </summary>
    public static class GameplayPrefabScaffold
    {
        private const string Sprites = "Assets/Art/Sprites/WebDemo/";
        private const string WorldFolder = "Assets/Prefabs/Gameplay";
        private const string HudFolder = "Assets/Prefabs/UI/Gameplay";
        private const string StrokeMaterial = "Assets/Art/Materials/WebDemoStroke.mat";
        private const string Font = "Assets/Art/Fonts/Baloo2/static/Baloo2-Bold SDF.asset";
        private const string SlotPrefab = "Assets/Prefabs/UI/Common/Slot.prefab";
        private const string BoosterPrefab = "Assets/Prefabs/UI/Common/Booster.prefab";
        private static readonly Color InkSoft = new Color32(0x6B, 0x5B, 0x53, 0xFF);

        // thứ tự vẽ theo bản web: vải, vùng tô, hình mẫu, sóng chốt, chốt, gợi ý uốn, sợi chỉ, vệt khớp, cúc len, node, kéo
        private const int OrderFabric = 0, OrderFill = 1, OrderGhost = 2, OrderWaves = 3, OrderPins = 4, OrderGaps = 5,
            OrderThread = 6, OrderZips = 7, OrderBeads = 8, OrderNodes = 9, OrderTrail = 10, OrderScissors = 11, OrderHud = 20;

        [MenuItem("GraphNode/Scaffold/Build Gameplay Prefabs")]
        public static void Build()
        {
            DefaultConfigCreatorFolders.Ensure(WorldFolder);
            DefaultConfigCreatorFolders.Ensure(HudFolder);
            var nodeFree = SpritePrefab("NodeFree", "node_free", OrderNodes, true);
            var nodeLocked = SpritePrefab("NodeLocked", "node_locked", OrderNodes, true);
            var halo = SpritePrefab("PinHalo", "dot", OrderWaves, false);
            var bead = SpritePrefab("PinchBead", "pinch_bead", OrderBeads, false);
            var trail = SpritePrefab("TrailDot", "dot", OrderTrail, true);
            var pin = PinPrefab();
            var scissors = ScissorsPrefab();
            var piece = PiecePrefab();
            BoardPrefab(nodeFree, nodeLocked, pin, halo, bead, trail, scissors, piece);
            HudPrefab();
            StringsAndAppAssets();
            AssetDatabase.SaveAssets();
            Debug.Log("[GraphNode] gameplay prefabs ready (existing prefabs were kept)");
        }

        // ---------- thế giới ----------

        private static T Existing<T>(string path) where T : Object => AssetDatabase.LoadAssetAtPath<T>(path);

        private static SpriteRenderer SpritePrefab(string name, string sprite, int order, bool enabled)
        {
            string path = $"{WorldFolder}/{name}.prefab";
            var found = Existing<GameObject>(path);
            if (found != null) return found.GetComponent<SpriteRenderer>();
            var go = new GameObject(name);
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = Existing<Sprite>(Sprites + sprite + ".png");
            sr.sortingOrder = order;
            sr.enabled = enabled;
            return Save(go, path).GetComponent<SpriteRenderer>();
        }

        private static PinMarker PinPrefab()
        {
            string path = WorldFolder + "/Pin.prefab";
            var found = Existing<GameObject>(path);
            if (found != null) return found.GetComponent<PinMarker>();
            var go = new GameObject("Pin");
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = Existing<Sprite>(Sprites + "pin_empty.png");
            sr.sortingOrder = OrderPins;
            var marker = go.AddComponent<PinMarker>();
            SetRefs(marker, ("empty", Existing<Sprite>(Sprites + "pin_empty.png")), ("filled", Existing<Sprite>(Sprites + "pin_filled.png")));
            return Save(go, path).GetComponent<PinMarker>();
        }

        private static ScissorsRig ScissorsPrefab()
        {
            string path = WorldFolder + "/Scissors.prefab";
            var found = Existing<GameObject>(path);
            if (found != null) return found.GetComponent<ScissorsRig>();
            var go = new GameObject("Scissors");
            var down = Child(go.transform, "BladeDown");
            AddSprite(down, "scissors_half_down", OrderScissors);
            var up = Child(go.transform, "BladeUp");
            AddSprite(up, "scissors_half_up", OrderScissors);
            AddSprite(Child(go.transform, "Rivet"), "scissors_rivet", OrderScissors + 1);
            var rig = go.AddComponent<ScissorsRig>();
            SetRefs(rig, ("bladeUp", up.transform), ("bladeDown", down.transform));
            return Save(go, path).GetComponent<ScissorsRig>();
        }

        private static PieceRig PiecePrefab()
        {
            string path = WorldFolder + "/Piece.prefab";
            var found = Existing<GameObject>(path);
            if (found != null) return found.GetComponent<PieceRig>();
            var go = new GameObject("Piece");
            var shadow = MeshLayer(go.transform, "Shadow", OrderGhost + 1);
            shadow.transform.localPosition = new Vector3(0f, -7f, 0f);
            var cream = MeshLayer(go.transform, "Cream", OrderGhost + 2);
            var color = MeshLayer(go.transform, "Color", OrderGhost + 3);
            var outline = MeshLayer(go.transform, "Outline", OrderGhost + 4);
            var rig = go.AddComponent<PieceRig>();
            SetRefs(rig, ("shadow", shadow), ("cream", cream), ("color", color), ("outline", outline));
            return Save(go, path).GetComponent<PieceRig>();
        }

        private static void BoardPrefab(SpriteRenderer nodeFree, SpriteRenderer nodeLocked, PinMarker pin, SpriteRenderer halo,
            SpriteRenderer bead, SpriteRenderer trail, ScissorsRig scissors, PieceRig piece)
        {
            string path = WorldFolder + "/PuzzleBoard.prefab";
            if (Existing<GameObject>(path) != null) return;
            var go = new GameObject("PuzzleBoard");
            // khung vải: thẻ trắng 378×386 pt, góc trên trái ở (6, 244) của bố cục 390×844, tâm ở (195, 437)
            var fabric = AddSprite(Child(go.transform, "Fabric"), "fabric_card", OrderFabric);
            fabric.transform.position = FabricLayout.LayoutToWorld(195f, 437f);
            var fill = Child(go.transform, "Fill").AddComponent<SpriteRenderer>();
            fill.sortingOrder = OrderFill;
            var ghost = MeshLayer(go.transform, "Ghost", OrderGhost);
            var hole = MeshLayer(go.transform, "Hole", OrderGhost);
            var waves = MeshLayer(go.transform, "PinWaves", OrderWaves);
            var hints = MeshLayer(go.transform, "CurveHints", OrderGaps);
            var thread = MeshLayer(go.transform, "Thread", OrderThread);
            var veil = MeshLayer(go.transform, "CutVeil", OrderThread);
            var cut = MeshLayer(go.transform, "CutLine", OrderZips);
            var zips = MeshLayer(go.transform, "SeamZips", OrderZips);
            var elements = Child(go.transform, "Elements").transform;
            var view = go.AddComponent<PuzzleView>();
            SetRefs(view,
                ("fill", fill), ("ghost", ghost), ("thread", thread), ("cutVeil", veil), ("cutLine", cut),
                ("pinWaves", waves), ("curveHints", hints), ("seamZips", zips), ("hole", hole), ("elements", elements),
                ("nodeFreePrefab", nodeFree), ("nodeLockedPrefab", nodeLocked), ("pinPrefab", pin), ("pinHaloPrefab", halo),
                ("pinchBeadPrefab", bead), ("trailDotPrefab", trail), ("scissorsPrefab", scissors), ("piecePrefab", piece));
            Save(go, path);
        }

        // ---------- HUD ----------

        private static void HudPrefab()
        {
            string path = HudFolder + "/GameplayHud.prefab";
            if (Existing<GameObject>(path) != null) return;
            var root = new GameObject("GameplayHud", typeof(RectTransform));
            var canvas = root.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.planeDistance = 5f;
            canvas.sortingOrder = OrderHud;
            var scaler = root.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            // chuẩn Canvas mục 5.13: 390×844 pt nhân 3, cùng hệ với prefab UI của người dùng (Booster, Slot)
            scaler.referenceResolution = new Vector2(FabricLayout.ScreenWidth, FabricLayout.ScreenHeight) * UiScale;
            // giống CameraFit: luôn chứa trọn khung 390×844, màn hình dài hay rộng hơn thì lộ thêm nền
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.Expand;
            scaler.referencePixelsPerUnit = 100f;
            root.AddComponent<GraphicRaycaster>();

            // khung bố cục 390×844 canh giữa màn hình, khớp với phần thế giới; mọi phần tử đặt theo pt từ góc trên trái
            var content = Rect(root.transform, "Content", 0f, 0f, FabricLayout.ScreenWidth, FabricLayout.ScreenHeight);
            content.anchorMin = content.anchorMax = new Vector2(0.5f, 0.5f);
            content.pivot = new Vector2(0.5f, 0.5f);
            content.anchoredPosition = Vector2.zero;

            var pattern = Rect(content, "PatternCard", 20f, 80f, 140f, 148f);
            SlicedImage(pattern, "ui_card_outlined");
            var patternLabel = Label(pattern, "Label", 0f, 12f, 140f, 18f, TextAlignmentOptions.Center);
            var mini = Rect(pattern, "MiniShape", 24f, 39f, 92f, 92f).gameObject.AddComponent<UIShapeGraphic>();
            mini.raycastTarget = false;

            var info = Rect(content, "InfoCard", 172f, 80f, 198f, 148f);
            SlicedImage(info, "ui_card");
            var piecesLabel = Label(info, "PiecesLabel", 14f, 12f, 170f, 18f, TextAlignmentOptions.Left);
            var slotRow = Rect(info, "SlotRow", 14f, 32f, 170f, 46f);
            var row = slotRow.gameObject.AddComponent<HorizontalLayoutGroup>();
            row.spacing = 12f * UiScale;
            row.childAlignment = TextAnchor.UpperLeft;
            row.childControlWidth = row.childControlHeight = false;
            row.childForceExpandWidth = row.childForceExpandHeight = false;
            var matchLabel = Label(info, "MatchLabel", 14f, 87f, 170f, 18f, TextAlignmentOptions.Left);

            // thanh khớp 174×26 (ảnh có lề 2 pt), phần đổ chạy trong vùng 164×16 cách mép 5 pt
            var bar = Rect(info, "MatchBar", 12f, 108f, 174f, 26f);
            SlicedImage(Rect(bar, "Back", 0f, 0f, 174f, 26f), "bar_back");
            var track = Rect(bar, "Track", 5f, 5f, 164f, 16f);
            var fillRect = Rect(track, "Fill", 0f, 0f, 14f, 16f);
            fillRect.pivot = new Vector2(0f, 1f);
            var fillImage = SlicedImage(fillRect, "bar_fill");
            var markerLow = Marker(track, "MarkerLow");
            var markerHigh = Marker(track, "MarkerHigh");
            SlicedImage(Rect(bar, "Frame", 0f, 0f, 174f, 26f), "bar_frame").raycastTarget = false;

            // nút Gợi ý: prefab Booster của người dùng, ô đầu của hàng booster (20, 724), 106×92
            var boosterAsset = Existing<GameObject>(BoosterPrefab);
            Button hintButton = null;
            TMP_Text hintCount = null, hintLabel = null;
            CanvasGroup hintGroup = null;
            if (boosterAsset != null)
            {
                var booster = (GameObject)PrefabUtility.InstantiatePrefab(boosterAsset, content);
                booster.name = "HintBooster";
                Place((RectTransform)booster.transform, 20f, 724f, 106f, 92f);
                hintButton = booster.GetComponent<Button>();
                hintCount = booster.transform.Find("CountBadge/Count")?.GetComponent<TMP_Text>();
                hintLabel = booster.transform.Find("name")?.GetComponent<TMP_Text>();
                hintGroup = booster.AddComponent<CanvasGroup>();
            }

            var hud = root.AddComponent<HudView>();
            var hudSo = new SerializedObject(hud);
            hudSo.FindProperty("barMinFill").floatValue = 14f * UiScale;
            hudSo.ApplyModifiedPropertiesWithoutUndo();
            SetRefs(hud,
                ("patternLabel", patternLabel), ("piecesLabel", piecesLabel), ("matchLabel", matchLabel), ("miniShape", mini),
                ("slotRow", slotRow), ("slotPrefab", Existing<GameObject>(SlotPrefab)),
                ("barTrack", track), ("barFill", fillRect), ("barFillImage", fillImage),
                ("markerLow", markerLow), ("markerHigh", markerHigh),
                ("hintButton", hintButton), ("hintCount", hintCount), ("hintLabel", hintLabel), ("hintGroup", hintGroup));
            Save(root, path);
        }

        private static RectTransform Marker(RectTransform track, string name)
        {
            var r = Rect(track, name, 0f, 2f, 2f, 12f);
            r.pivot = new Vector2(0.5f, 1f);
            var img = r.gameObject.AddComponent<Image>();
            img.sprite = Existing<Sprite>(Sprites + "bar_marker.png");
            img.raycastTarget = false;
            return r;
        }

        // ---------- chuỗi và tài nguyên App ----------

        private static void StringsAndAppAssets()
        {
            const string stringsPath = "Assets/Content/Strings/Strings_vi.asset";
            DefaultConfigCreatorFolders.Ensure("Assets/Content/Strings");
            var strings = Existing<StringTable>(stringsPath);
            if (strings == null)
            {
                strings = ScriptableObject.CreateInstance<StringTable>();
                AssetDatabase.CreateAsset(strings, stringsPath);
                var so = new SerializedObject(strings);
                var list = so.FindProperty("entries");
                (string k, string v)[] rows =
                {
                    ("hud.pattern", "Hình mẫu"), ("hud.pieces", "Bộ vải ghép"), ("hud.match", "Độ khớp"), ("booster.hint", "Gợi ý")
                };
                list.arraySize = rows.Length;
                for (int i = 0; i < rows.Length; i++)
                {
                    list.GetArrayElementAtIndex(i).FindPropertyRelative("key").stringValue = rows[i].k;
                    list.GetArrayElementAtIndex(i).FindPropertyRelative("value").stringValue = rows[i].v;
                }
                so.ApplyModifiedPropertiesWithoutUndo();
            }
            // AppAssets nằm ở assembly App (Editor không tham chiếu App), tạo theo tên lớp
            const string appPath = "Assets/Content/Configs/AppAssets.asset";
            if (AssetDatabase.LoadMainAssetAtPath(appPath) == null)
            {
                var app = ScriptableObject.CreateInstance("AppAssets");
                if (app == null) { Debug.LogError("[GraphNode] AppAssets type not found"); return; }
                AssetDatabase.CreateAsset(app, appPath);
                var so = new SerializedObject(app);
                so.FindProperty("audioLibrary").objectReferenceValue = Existing<Object>("Assets/Audio/AudioLibrary.asset");
                so.FindProperty("strings").objectReferenceValue = strings;
                so.ApplyModifiedPropertiesWithoutUndo();
            }
        }

        // ---------- tiện ích ----------

        private static GameObject Child(Transform parent, string name)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            return go;
        }

        private static SpriteRenderer AddSprite(GameObject go, string sprite, int order)
        {
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = Existing<Sprite>(Sprites + sprite + ".png");
            sr.sortingOrder = order;
            return sr;
        }

        private static MeshFilter MeshLayer(Transform parent, string name, int order)
        {
            var go = Child(parent, name);
            var filter = go.AddComponent<MeshFilter>();
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = Existing<Material>(StrokeMaterial);
            mr.sortingOrder = order;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            mr.receiveShadows = false;
            return filter;
        }

        /// <summary>RectTransform đặt theo pt từ góc trên trái của cha (y hướng xuống như bố cục web).</summary>
        private const float UiScale = 3f;

        private static RectTransform Rect(Transform parent, string name, float x, float y, float w, float h)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var r = (RectTransform)go.transform;
            Place(r, x, y, w, h);
            return r;
        }

        // số truyền vào theo pt của bản web; Canvas tính theo px @3x
        private static void Place(RectTransform r, float x, float y, float w, float h)
        {
            r.anchorMin = r.anchorMax = new Vector2(0f, 1f);
            r.pivot = new Vector2(0f, 1f);
            r.anchoredPosition = new Vector2(x, -y) * UiScale;
            r.sizeDelta = new Vector2(w, h) * UiScale;
        }

        private static Image SlicedImage(RectTransform r, string sprite)
        {
            var img = r.gameObject.AddComponent<Image>();
            img.sprite = Existing<Sprite>(Sprites + sprite + ".png");
            img.type = Image.Type.Sliced;
            img.raycastTarget = false;
            return img;
        }

        private static TMP_Text Label(RectTransform parent, string name, float x, float y, float w, float h, TextAlignmentOptions align)
        {
            var r = Rect(parent, name, x, y, w, h);
            var t = r.gameObject.AddComponent<TextMeshProUGUI>();
            t.font = Existing<TMP_FontAsset>(Font);
            t.fontSize = 13f * UiScale;
            t.color = InkSoft;
            // căn theo dòng (Middle) như textBaseline 'middle' của bản web; Midline căn theo khung glyph, lệch với Baloo 2
            t.horizontalAlignment = align == TextAlignmentOptions.Center ? HorizontalAlignmentOptions.Center : HorizontalAlignmentOptions.Left;
            t.verticalAlignment = VerticalAlignmentOptions.Middle;
            t.raycastTarget = false;
            t.text = "";
            return t;
        }

        private static void SetRefs(Object target, params (string field, Object value)[] refs)
        {
            var so = new SerializedObject(target);
            foreach (var (field, value) in refs)
            {
                var p = so.FindProperty(field);
                if (p == null) { Debug.LogError($"[GraphNode] {target.GetType().Name} has no field '{field}'"); continue; }
                p.objectReferenceValue = value;
            }
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static GameObject Save(GameObject go, string path)
        {
            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            Object.DestroyImmediate(go);
            return prefab;
        }
    }

    internal static class DefaultConfigCreatorFolders
    {
        public static void Ensure(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            if (!string.IsNullOrEmpty(parent)) Ensure(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }
    }
}

# Kiến trúc kỹ thuật: GraphNode Puzzle

Kế hoạch hệ thống, cấu trúc thư mục và công nghệ cho bản Unity chuẩn production. Luật chơi và số liệu nằm ở đặc tả [GraphNode-Puzzle-Dac-ta.md](GraphNode-Puzzle-Dac-ta.md); tài liệu này chỉ nói **làm bằng gì, đặt ở đâu, nối với nhau thế nào**.

Bản gốc của tài liệu là file này trong repo; đặc tả cũng vậy (bản trên Claude Docs chỉ để đọc và bình luận).

Bản thử web chỉ là demo luật lõi: dùng để đối chiếu luật và số liệu trong test, **không** phải gốc cho hình ảnh, giao diện, cấu trúc code hay meta của bản chính thức.

Trạng thái: kế hoạch, chưa có mã. Thư mục `Assets/Scripts` đang trống.

**Ý chính:** game chia thành một lõi C# thuần (hình học và luật chơi) và các module Unity theo tính năng. Các module nói chuyện với nhau qua hợp đồng chung (dữ liệu vào ra của một màn, thông điệp, interface dịch vụ). Meta loop sau này là một module mới cắm vào các hợp đồng đó, không phải sửa phần chơi màn.

---

## 1. Nguyên tắc

1. **Lõi thuần, hiển thị mỏng.** Mọi tính toán có thể sai (viền ngoài, điểm khớp, ghim, điểm sáng) nằm trong `GraphNode.Core`, không tham chiếu UnityEngine, chạy được trong test EditMode và tái hiện được theo từng bước thời gian.
2. **Dữ liệu điều khiển.** Level là file JSON gốc có `schemaVersion`; chương, sản phẩm, khách và thông số cân bằng là ScriptableObject. Thêm màn hay chỉnh số không sửa code.
3. **Phụ thuộc một chiều.** Module tính năng không tham chiếu lẫn nhau. Gameplay không biết Meta, Meta không biết bên trong Gameplay. Chỉ `GraphNode.App` biết tất cả để nối lại.
4. **Mở rộng bằng thêm, không bằng sửa.** Cơ chế mới đi qua các điểm mở rộng có sẵn (`IEdgeShape`, `INodeConstraint`, `IWinCondition`, `IPinRule`, `IRunnerRule`, `IHintProvider`, `IPresentationStep`, phần lưu theo mục). Không rải `if (levelType == ...)` trong code chơi.
5. **Bất đồng bộ có vòng đời.** Mọi tác vụ chờ (animation, nạp dữ liệu) dùng UniTask kèm `CancellationToken` gắn với đối tượng hoặc phiên chơi.
6. **Đo được.** Mỗi màn phát ra kết quả và sự kiện telemetry đủ để đo các chỉ số trong đặc tả.

---

## 2. Công nghệ

| Hạng mục | Lựa chọn | Trạng thái | Lý do |
| --- | --- | --- | --- |
| Engine | Unity 2022.3.62f3 LTS | Đã có | Bản LTS, hỗ trợ C# 9 |
| Render | URP 14.0.12, Renderer 2D | Đã có | SRP Batcher, 2D lights nếu cần |
| Input | Input System 1.14.2 | Đã có | Một hành động con trỏ cho cảm ứng và chuột |
| Bất đồng bộ | UniTask (`Assets/Plugins/UniTask`) | Đã có | Không cấp phát, có CancellationToken, thay coroutine |
| Tween | DOTween (bản dll trong `Assets/Plugins/Demigiant`) | Đã có | Trình diễn và UI. Muốn `await` tween bằng UniTask phải bật define `UNITASK_DOTWEEN_SUPPORT` (đổi ProjectSettings, **cần duyệt**) |
| Chữ | TextMeshPro 3.0.7 | Đã có | Font Baloo 2 có đủ ký tự tiếng Việt |
| Test | Test Framework 1.1.33 | Đã có | EditMode cho lõi, PlayMode cho luồng màn |
| JSON | Newtonsoft Json (`com.unity.nuget.newtonsoft-json` 3.2.2) | Đã có | Phụ thuộc trực tiếp của project, không còn dựa vào gói MCP. `JsonUtility` không làm được dictionary và kiểu đa hình mà save và level cần |
| Tiêm phụ thuộc | Nối thủ công qua hàm khởi tạo (pure DI) ở M0 tới M3; xem lại VContainer trước khi làm meta mở rộng | **Đề xuất, cần chốt** | Không thêm gói. Mọi lớp nhận phụ thuộc qua hàm khởi tạo, mỗi scene một lớp nối trong `App`. Khi phần nối dài và khó theo dõi thì chuyển sang VContainer, chỉ sửa phần nối |
| Hình học | Tự viết trong Core | Không thêm gói | Đồ thị nhỏ (tới 14 node); giữ đúng cách tính của bản thử (mặt nạ 200×200) để số liệu đối chiếu khớp. Clipper2 để dành nếu cần phép đa giác chính xác (vùng cấm, khoét lỗ) |
| Nội dung | Level: file JSON là bản gốc. Định nghĩa có asset (khách, sản phẩm, vải, cấu hình): ScriptableObject | Không thêm gói | JSON dễ xem khác biệt trong git, dễ gộp, kiểm tra được trong test thuần C#, sau này tải từ xa được. Level không cần tham chiếu asset trực tiếp, chỉ dùng id |
| Addressables | Không dùng ở bản đầu | Để sau | Thêm khi cần cập nhật level từ xa hoặc khi meta có nhiều art |
| Ngôn ngữ | `ILocalizer` và bảng chuỗi riêng | Để sau mới thay | Có thể đổi sang gói Unity Localization mà không sửa nơi gọi |
| Telemetry, crash, remote config | Interface trong Foundation | Chốt nhà cung cấp sau | Firebase hoặc Unity Gaming Services; code chơi không gọi thẳng SDK |
| CI | GitHub Actions + GameCI | **Đề xuất, cần chốt** | Cần license Unity cho máy CI |
| Gói không dùng | Visual Scripting (`com.unity.visualscripting`) | Đã gỡ | Không dùng, làm chậm biên dịch |
| Gói chỉ dùng khi phát triển | MCP for Unity | Giữ ở Editor | Gỡ khỏi bản phát hành (xem CLAUDE.md mục Build). `manifest.json` đang trỏ vào nhánh `#main`, mỗi lần nạp lại có thể ra bản khác: **đề xuất ghim vào một tag hoặc commit, cần duyệt** |
| Timeline | Đã có | Tùy chọn | Có thể dùng cho cảnh lộ diện sản phẩm |

---

## 3. Kiến trúc tổng thể

### 3.1 Các assembly

| Assembly | Chứa gì | Tham chiếu |
| --- | --- | --- |
| `GraphNode.Core` | Hình học, đồ thị, viền ngoài, điểm khớp, luật thắng, điểm sáng, ghim, kiểm tra level. C# thuần | Không gì cả (`noEngineReferences: true`) |
| `GraphNode.Foundation` | Hợp đồng dùng chung: dữ liệu vào ra của màn, thông điệp, interface dịch vụ, message bus, máy trạng thái, log | UniTask |
| `GraphNode.Data` | ScriptableObject định nghĩa level, chương, sản phẩm, cấu hình cân bằng; DTO JSON; chuyển đổi phiên bản | Core, Foundation |
| `GraphNode.Services` | Cài đặt dịch vụ: âm thanh, nốt nhạc, rung, lưu trữ, telemetry, chuỗi, nạp asset | Foundation, UniTask, Newtonsoft |
| `GraphNode.UI` | Khung giao diện: điều hướng màn hình, popup, toast, nút chung | Foundation, UniTask, DOTween, TMP |
| `GraphNode.Visuals` | Hiển thị dùng chung cho cả màn chơi và tiệm may: `ShapePreview` (vẽ hình mẫu nét đứt), vật liệu vải (`FabricMaterial`), nhân vật nhiều lớp (`CharacterView`) | Data, Foundation, UniTask, DOTween |
| `GraphNode.Gameplay` | Phiên chơi một màn: máy pha, input kéo, hiển thị đồ thị, điểm sáng, trình diễn thắng, HUD trong màn | Core, Data, Foundation, UI, Visuals, UniTask, DOTween, Input System, TMP |
| `GraphNode.Meta` | Tiệm may bản đầu: khách ở quầy, đơn nhiều mảnh, tiến trình. Sau này: khách có câu chuyện, lookbook, vải, nâng cấp tiệm, tiền công. Tách thành nhiều assembly khi lớn (mục 6) | Data, Foundation, UI, Visuals |
| `GraphNode.App` | Điểm khởi động, composition root, luồng scene | Tất cả ở trên |
| `GraphNode.Editor` | Level Editor, trình kiểm tra level, chốt chặn build | Core, Data, Foundation (chỉ Editor) |
| `GraphNode.Tests.EditMode` | Test lõi và dữ liệu | Core, Data, Foundation |
| `GraphNode.Tests.PlayMode` | Test luồng màn từ vào tới bảng kết quả | App, Gameplay, Data |

```mermaid
flowchart TD
    App["GraphNode.App<br/>khởi động, nối module, luồng scene"]
    Gameplay["GraphNode.Gameplay<br/>phiên chơi một màn"]
    Meta["GraphNode.Meta<br/>tiệm may: khách, đơn, tiến trình"]
    UI["GraphNode.UI<br/>khung giao diện"]
    Visuals["GraphNode.Visuals<br/>hình mẫu, vải, nhân vật"]
    Services["GraphNode.Services<br/>âm thanh, lưu, telemetry"]
    Data["GraphNode.Data<br/>level, cấu hình"]
    Foundation["GraphNode.Foundation<br/>hợp đồng, message bus"]
    Core["GraphNode.Core<br/>C# thuần"]

    App --> Gameplay
    App --> Meta
    App --> Services
    Gameplay --> UI
    Gameplay --> Data
    Gameplay --> Core
    Meta --> UI
    Meta --> Data
    Gameplay --> Visuals
    Meta --> Visuals
    Visuals --> Data
    Visuals --> Foundation
    UI --> Foundation
    Gameplay --> Foundation
    Meta --> Foundation
    Services --> Foundation
    Data --> Core
    Data --> Foundation
```

**Luật phụ thuộc:** không mũi tên nào chỉ vào `App`. Không có mũi tên giữa `Gameplay` và `Meta`. `Core` không chỉ ra đâu cả. Vi phạm luật này là lỗi review.

### 3.2 Gameplay và Meta nói chuyện thế nào

- **Vào màn:** Meta gửi `LevelRequest` gồm `levelId`, `fabricId` (tùy chọn, đè lên vải mặc định của level khi người chơi tự chọn vải), số booster người chơi đang có theo từng loại (bản đầu: booster gợi ý) và danh sách `modifiers` chung. Gameplay chỉ hiểu booster và modifier qua interface, không biết chúng đến từ cửa hàng hay phần thưởng.
- **Ra màn:** Gameplay phát `LevelResult` lên message bus, gồm: `levelId`, `fabricId` thực dùng, kết quả (thắng hay bỏ), số booster đã dùng theo từng loại, số liệu chơi (thời gian, số lần kéo, đặt lại, đảo chiều, lần kiểm tra thất bại). Meta trừ booster và lưu; Gameplay không ghi save. Thoát giữa màn cũng phát `LevelResult` (kết quả "bỏ") nên booster đã dùng vẫn được trừ. Hình mảnh vải không cần gửi kèm: Meta lấy từ `targetShape` của `levelId`. Meta nghe để cho mảnh bay vào thẻ đơn, mở màn tiếp, đặt mảnh vào sản phẩm, tính thưởng. Telemetry nghe để gửi sự kiện.
- **Chuyển cảnh:** cả hai phía gọi `ISceneTransition` (mục 5.11), không tự nạp scene.
- **Lưu:** mỗi module có mục lưu riêng. Thêm module meta là thêm mục lưu, không đụng mục cũ.

---

## 4. Cấu trúc thư mục

Giữ các thư mục đang có (`Plugins`, `Settings`, `Docs`, `Resources`). `SampleScene` sẽ được thay bằng ba scene thật.

```text
Assets/
├── Docs/                         Đặc tả, kiến trúc, wireframe Home dọc
├── Plugins/                      Bên thứ ba (UniTask, DOTween). Không sửa
├── Settings/                     URP, Renderer 2D (đã có)
├── Resources/                    Chỉ cấu hình của plugin (DOTweenSettings). Không thêm asset game
├── Scenes/
│   ├── Boot.unity                Khởi tạo dịch vụ, nạp save và cấu hình
│   ├── Home.unity                Tiệm may: khách ở quầy, bong bóng suy nghĩ, thẻ đơn
│   └── Gameplay.unity            Một scene dùng chung cho mọi level
├── Scripts/
│   ├── Core/                     GraphNode.Core
│   │   ├── Geometry/             Float2, đoạn, đường gấp khúc, giao điểm, cong Hermite
│   │   ├── Graph/                NodeId, loại node, đồ thị, trạng thái vị trí
│   │   ├── Shapes/               IEdgeShape: cạnh thẳng, cạnh cong
│   │   ├── Constraints/          INodeConstraint: khóa, giới hạn khung vải
│   │   ├── Outline/              Mặt nạ vùng tô, viền ngoài
│   │   ├── Scoring/              Điểm khớp, độ lệch viền
│   │   ├── Rules/                IWinCondition: ngưỡng khớp, vùng cấm
│   │   ├── Runner/               Mô phỏng điểm sáng: chiều dài cung, chiều chạy, tăng tốc
│   │   ├── Verification/         Vòng kiểm tra điểm và ghim, thứ tự ghim
│   │   └── Levels/               Mô hình level lúc chạy, trình kiểm tra level
│   ├── Foundation/               GraphNode.Foundation
│   │   ├── Contracts/            LevelRequest, LevelResult, các thông điệp
│   │   ├── Services/             IAudioService, IHaptics, ISaveService, IAnalytics, ILocalizer, IAssetProvider, IClock
│   │   ├── Messaging/            Message bus có kiểu
│   │   ├── StateMachines/        Máy trạng thái bất đồng bộ dùng chung
│   │   └── Logging/              Log có thể loại bỏ khi build phát hành
│   ├── Data/                     GraphNode.Data
│   │   ├── Definitions/          LevelDefinition (đọc từ JSON), LevelCatalog, ChapterDefinition, ProductDefinition, PinDefinition, DepthProfile
│   │   ├── Configs/              Cấu hình cân bằng, điểm sáng, input, âm thanh, trình diễn
│   │   └── Serialization/        DTO JSON, chuyển đổi phiên bản
│   ├── Services/                 GraphNode.Services
│   │   ├── Audio/                Mixer, SFX, NoteService (pool giọng)
│   │   ├── Haptics/
│   │   ├── Save/                 Ghi nguyên tử, sao lưu, mục lưu
│   │   ├── Analytics/
│   │   ├── Localization/
│   │   └── Assets/
│   ├── UI/                       GraphNode.UI
│   │   ├── Framework/            Điều hướng màn hình, popup, toast
│   │   └── Common/               Nút, thanh, hộp thoại chung
│   ├── Visuals/                  GraphNode.Visuals
│   │   ├── Shapes/               ShapePreview: hình mẫu nét đứt (bong bóng, thẻ hình mẫu, lookbook)
│   │   ├── Fabric/               FabricMaterial: đổ hoa văn và màu vải theo mặt nạ
│   │   └── Characters/           CharacterView: thân, biểu cảm, trang phục nhiều lớp
│   ├── Gameplay/                 GraphNode.Gameplay
│   │   ├── Session/              LevelSession, máy pha của màn
│   │   ├── Input/                Kéo tương đối, chọn node theo mật độ
│   │   ├── View/                 Vải, node, cạnh, vùng tô và viền, điểm sáng, ghim, lớp chiều sâu
│   │   ├── Presentation/         Các bước trình diễn thắng
│   │   └── Hud/                  Thanh khớp, Gợi ý, Đặt lại, Đảo chiều, bảng kết quả màn
│   ├── Meta/                     GraphNode.Meta
│   │   ├── Progression/          Mở màn, lưu tiến trình (bản đầu)
│   │   ├── Orders/               Khách, đơn nhiều mảnh, bong bóng suy nghĩ, khách nhận đồ (bản đầu)
│   │   └── (sau này) Stories/  Lookbook/  Fabrics/  ShopUpgrades/  Currency/
│   ├── App/                      GraphNode.App
│   │   ├── Bootstrap/
│   │   ├── Scopes/               Lớp nối của App, Home, Gameplay
│   │   └── Flow/                 Máy trạng thái ứng dụng, nạp scene, lớp phủ chuyển cảnh
│   └── Editor/                   GraphNode.Editor
│       ├── LevelEditor/
│       ├── Validation/           Kiểm tra hàng loạt, dùng chung với CI
│       └── Build/                Script build, chốt chặn gói MCP
├── Tests/
│   ├── EditMode/                 GraphNode.Tests.EditMode
│   └── PlayMode/                 GraphNode.Tests.PlayMode
├── Content/
│   ├── Levels/Chapter01/         File JSON level (bản gốc)
│   ├── Chapters/
│   ├── Products/                 ProductDefinition: khung, vải nền, ô mảnh, điểm gắn decor, phần mặc lên người (mở rộng)
│   ├── Decors/                   DecorDefinition
│   ├── Customers/                CustomerDefinition
│   ├── Orders/                   OrderDefinition
│   ├── Fabrics/                  FabricDefinition
│   └── Configs/                  Asset cấu hình cân bằng
├── Art/
│   ├── Sprites/  Atlases/  Fonts/  Materials/  Shaders/  VFX/  Depth/
│   ├── Characters/               Chân dung khách theo lớp và biểu cảm
│   ├── Products/                 Sprite sản phẩm, bản phác thảo, mặt nạ đổ vải
│   ├── Decors/                   Sprite decor sản phẩm
│   ├── Fabrics/                  Texture hoa văn vải
├── Audio/
│   ├── Music/  Sfx/  Notes/  Mixers/
└── Prefabs/
    ├── Gameplay/
    └── UI/
        ├── Common/               Nút, chip, thanh dùng chung; SafeArea, Canvas gốc
        ├── Home/                 Bố cục Home (đặt sẵn trong scene Home)
        ├── Gameplay/             HUD (đặt sẵn trong scene Gameplay)
        └── Popups/               Màn hình, popup instantiate khi mở (mục 5.13)
```

Quy ước: namespace trùng đường dẫn dưới `Scripts` (ví dụ `GraphNode.Core.Runner`). Mỗi thư mục cấp hai trong `Scripts` có đúng một asmdef. Asset game không đặt trong `Resources`.

---

## 5. Các hệ thống

### 5.1 Luồng ứng dụng

```mermaid
stateDiagram-v2
    [*] --> Boot
    Boot --> Home: dịch vụ, save, cấu hình sẵn sàng
    Home --> Gameplay: LevelRequest
    Gameplay --> Home: LevelResult hoặc thoát
```

- `Boot` đặt `Application.targetFrameRate = 60` (khóa cứng 60 fps; mặc định Unity trên mobile là 30), dựng phạm vi App (dịch vụ sống suốt phiên) rồi chuyển sang `Home`. Phạm vi App không bị hủy khi đổi scene.
- `Home` là tiệm may: khách ở quầy, bong bóng suy nghĩ chứa hình mẫu màn kế tiếp, thẻ đơn. Các lớp meta mở rộng sau này cũng sống trong scene này.
- Mỗi màn xong đều quay về `Home` để mảnh vải bay vào thẻ đơn; khách kế tiếp hoặc mảnh kế tiếp bắt đầu từ Home.
- `Gameplay` dựng phạm vi riêng cho một màn; thoát màn là hủy toàn bộ phạm vi, mọi tác vụ bất đồng bộ bị hủy theo token.

### 5.2 Phiên chơi một màn

```mermaid
stateDiagram-v2
    [*] --> Intro
    Intro --> Play
    Play --> Verify: thả tay khi khớp đạt ngưỡng
    Verify --> Play: hết một vòng còn ghim chưa sáng
    Verify --> Snap: mọi điểm và ghim đã sáng
    Snap --> Cut
    Cut --> Lift
    Lift --> Dye
    Dye --> Fly
    Fly --> Result
    Result --> [*]
```

- **Máy pha** (`LevelPhaseMachine`): mỗi pha là một lớp có `Enter`, `Tick`, `Exit`. Chuyển pha chỉ qua máy. Các pha trình diễn (Snap tới Fly) là danh sách `IPresentationStep` chạy tuần tự bằng UniTask, chạm để tua nhanh, thời lượng lấy từ cấu hình.
- **Thứ tự mỗi khung hình trong pha Chơi:**
  1. Input cập nhật vị trí node đang kéo (qua ràng buộc).
  2. Nếu đồ thị đổi: Core tính lại mặt nạ, điểm khớp, trạng thái vùng cấm.
  3. Core bước điểm sáng theo `dt` (tốc độ, chiều chạy, tăng tốc).
  4. Chỉ ở khung hình có sự kiện thả tay: Core xét luật thắng trên vị trí node cuối cùng. Đang kéo thì không xét.
  5. Hiển thị đọc trạng thái và vẽ.
- **Kết quả:** khi vào pha Kết quả, phiên phát `LevelResult` lên message bus rồi mới mở bảng thắng.

### 5.3 Lõi `GraphNode.Core`

| Thành phần | Trách nhiệm | Đối chiếu với bản thử |
| --- | --- | --- |
| `EdgeShapes` | Sinh đường gấp khúc của cạnh: thẳng, cong Hermite với tiếp tuyến Catmull-Rom từ láng giềng trên `ring` (luật ở mục Luật tiếp tuyến của điểm cong trong đặc tả) | Hàm `edgePoly` |
| `RegionMask` | Vẽ cạnh lên lưới 200×200, tô loang từ biên, ra mặt nạ vùng tô; tham số theo bảng Tham số mặt nạ trong đặc tả | Hàm `region` |
| `MatchScorer` | Giao chia hợp giữa mặt nạ người chơi và mặt nạ dựng từ đồ thị ở vị trí lời giải; sau này thêm độ lệch viền | Hàm `iou` |
| `SolutionOutline` | Viền lời giải dựng một lần lúc vào màn (24 đoạn mỗi cạnh): sinh `targetShape`, vị trí ghim, số thứ tự ghim số, đường cho cảnh cắt | Hàm `ringPolyline`, `buildGeo` |
| `RunnerSimulator` | Điểm sáng gắn với cạnh và vị trí tỉ lệ trên cạnh, tốc độ không đổi, hai chiều, tăng tốc khi qua ghim | `runnerStep` |
| `VerificationTracker` | Đánh dấu điểm và ghim đã sáng, gọi `IPinRule` của từng ghim, thất bại sau một vòng | `onPass`, `checkVerifyDone` |
| `IPinRule` | Luật của một loại ghim: "đi qua là sáng", "theo thứ tự"; thêm loại mới (theo nhịp…) bằng một lớp mới | Ghim tròn, ghim số |
| `IRunnerRule` | Quyết định tốc độ, chiều, tăng tốc của điểm sáng; thêm hai điểm sáng hay nhảy cổng bằng lớp mới | Tốc độ, đảo chiều, tăng tốc |
| `IHintProvider` | Chọn node cần gợi ý (mặc định node xa lời giải nhất, hoặc theo `hintOrder`). Không giữ số booster: số đó đi vào qua `LevelRequest` | Nút Gợi ý |
| `WinConditions` | Chuỗi điều kiện: ngưỡng khớp, vùng cấm, rồi vòng kiểm tra | Luật thắng |
| `LevelValidator` | Kiểm tra level cho Editor, CI và test | Mục "Kiểm tra hàng loạt" của đặc tả |

Yêu cầu: API không cấp phát khi đang chơi (bộ đệm dựng một lần lúc vào màn); mọi hàm nhận `dt` và trạng thái, không đọc thời gian hệ thống, để test và phát lại được.

### 5.4 Input

- Một `PointerInput` đọc Input System, chỉ nhận một ngón, hủy kéo khi mất focus.
- `NodePicker` chọn node theo vòng chọn theo mật độ (một nửa khoảng cách tới node gần nhất, kẹp 7,1% tới 19% bề rộng vải).
- `RelativeDragController` di chuyển node đúng quãng ngón tay trượt, áp `INodeConstraint`.
- `FabricSpace` quy đổi giữa toạ độ màn hình, toạ độ khung vải (0 tới 1) và đơn vị theo bề rộng vải (bảng Đơn vị đo trong đặc tả). Level chiều sâu kiểu camera nghiêng cũng chỉ thay `FabricSpace`.

### 5.5 Hiển thị

- **Vùng tô và viền:** mặt nạ 200×200 của Core chỉ dùng để chấm điểm. Để vẽ, tách đường viền từ mặt nạ (marching squares), làm mượt rồi dựng mesh vùng tô và nét viền đứt đổi màu, để hình nét trên màn hình độ phân giải cao (mặt nạ vẽ thẳng lên máy 3x là khoảng 5 pixel mỗi ô, dễ mờ hoặc răng cưa). Cả hai cách đều đúng khi cạnh cắt chéo vì cùng đi ra từ một mặt nạ. Ở M2 thử cả cách vẽ thẳng từ texture mặt nạ và cách vẽ từ đường viền, chọn một theo chất lượng hình và chi phí.
- **Cạnh, node, ghim, điểm sáng:** mesh và sprite, cập nhật trên cùng đối tượng.
- **Cảnh cắt và miếng vải:** dùng đường viền lời giải (đã biết từ dữ liệu), tam giác hóa một lần lúc vào màn.
- **Chiều sâu:** `DepthLayersView` đọc `DepthProfile`, chỉ là lớp hiển thị, không ảnh hưởng Core.

### 5.6 Âm thanh và rung

- `NoteService` giữ pool AudioSource, giới hạn số giọng, nhận cao độ theo vị trí node và độ lệch tông theo độ khớp (tham số từ cấu hình).
- `IHaptics` có bản iOS và Android, tắt được.

### 5.7 Dữ liệu và nội dung

- **Level là file JSON (bản gốc)**, mỗi level một file trong `Content/Levels/`. Trường theo bảng "Dữ liệu một level" trong đặc tả: hình mẫu, node, `ring`, `innerEdges`, `markers`, ngưỡng, độ lệch tối đa (tùy chọn), vải, sản phẩm, thứ tự gợi ý (tùy chọn), `depthProfile`, `forbiddenZones` (sau), tags. Lúc chạy, JSON được đọc thành `LevelDefinition` (lớp C# thường, không phải ScriptableObject).
- Level Editor đọc và ghi thẳng JSON. Không có bản ScriptableObject song song, nên không có hai nguồn lệch nhau.
- **Đưa JSON vào bản build mà không dùng `Resources`:** `LevelCatalog` (một ScriptableObject) giữ danh sách id kèm tham chiếu `TextAsset` tới từng file, do công cụ trong Editor sinh lại tự động. Lớp nối của App giữ tham chiếu tới catalog (gán trong scene Boot), nên Unity đưa các file vào build theo chuỗi tham chiếu. Các ScriptableObject cấu hình cũng đi theo cách này.
- **IL2CPP:** thêm `link.xml` giữ các kiểu DTO và bộ chuyển đổi JSON, để bước cắt code không xóa hàm khởi tạo mà Newtonsoft gọi qua reflection.
- JSON có `schemaVersion`; khi đổi cấu trúc thì viết bước chuyển đổi, không sửa tay file cũ.
- Dữ liệu nhiều loại (loại ghim, điều kiện thắng, hình dạng cạnh) ghi trường `kind` và đọc bằng bộ chuyển đổi tự viết. Không dùng chế độ tự ghi tên kiểu của Newtonsoft (`TypeNameHandling`): kém an toàn và dễ hỏng khi IL2CPP cắt code.
- Level trỏ tới vải, sản phẩm bằng id; định nghĩa có asset (khách, sản phẩm, vải, cấu hình cân bằng) vẫn là ScriptableObject.
- `LevelValidator` (trong Core) dùng chung cho Editor, CI và test.
- Dữ liệu tiệm may (trong Data, dùng bởi Meta và Visuals): `CustomerDefinition` (tên, các lớp chân dung, biểu cảm), `OrderDefinition` (khách, sản phẩm, danh sách level theo thứ tự mảnh, decor theo điểm gắn, màu hoàn thiện), `ProductDefinition` (khung, vải nền tùy chọn, ô mảnh, điểm gắn decor, bản phác thảo, phần mặc lên người cho mở rộng mặc thử), `DecorDefinition`, `FabricDefinition` (texture hoa văn, màu, điều kiện mở khóa).
- `targetShape` của level là nguồn duy nhất cho hình mẫu ở mọi nơi: bóng mờ trong màn, bong bóng suy nghĩ, thẻ đơn, lookbook. Level Editor ghi nó ra từ lời giải.

### 5.8 Lưu trữ

- `ISaveService` lưu theo mục: mỗi mục có khóa và phiên bản riêng (ví dụ `progression`, `settings`, `boosters` khi có booster gợi ý, sau này `economy`, `tailor_shop`).
- Ghi nguyên tử (file tạm rồi đổi tên), giữ một bản sao lưu, đọc lỗi thì quay về bản sao lưu.
- Gameplay không ghi save trực tiếp. Nó phát `LevelResult`, Meta quyết định lưu gì.

### 5.9 Telemetry và log

- `IAnalytics` nhận sự kiện có kiểu (`level_start`, `level_complete`, `verify_fail`, `level_abandon`). Một bộ chuyển tiếp nghe message bus, code chơi không gọi thẳng SDK.
- Log qua một lớp có `[Conditional]`, bản phát hành chỉ giữ cảnh báo và lỗi.

### 5.10 Cấu hình cân bằng

- Mọi số trong đặc tả (ngưỡng 92%, tốc độ điểm sáng 68% bề rộng vải mỗi giây, tăng tốc 2,4 lần, dung sai ghim 4,3%, vùng chọn 7,1% tới 19%, thời lượng trình diễn) nằm trong asset cấu hình, theo đơn vị bề rộng vải.
- Sau này có thể ghi đè từ remote config qua interface, không đổi nơi đọc.

### 5.11 Chuyển cảnh giữa Home và màn chơi

**Hiệu ứng bay (bong bóng vào màn, mảnh vải về thẻ đơn) là tùy chọn, không bắt buộc ở bản đầu.** Thứ bắt buộc chỉ là mọi lần đổi scene đều đi qua `ISceneTransition`; bản cài đầu tiên có thể chỉ là mờ dần (fade). Nhờ vậy sau này muốn thêm hiệu ứng bay thì chỉ thay phần cài, không sửa Home hay Gameplay.


- **Vấn đề:** bong bóng suy nghĩ phóng to thành bóng mờ trên tấm vải, và mảnh vải vừa cắt bay về thẻ đơn. Home và Gameplay là hai scene, nên phải có thứ sống qua lúc đổi scene.
- **Cách làm khi có hiệu ứng bay:** `ISceneTransition` trong Foundation, cài trong `App` bằng một canvas phủ thuộc phạm vi App (không bị hủy khi đổi scene).
  - Vào màn: Home đưa cho dịch vụ vị trí màn hình và hình của bong bóng; lớp phủ vẽ hình đó bằng `ShapePreview`, nạp Gameplay, rồi phóng hình tới đúng vị trí bóng mờ trên vải mà Gameplay báo lại; xong thì tắt lớp phủ.
  - Ra màn: Gameplay đưa hình và vải của mảnh vừa cắt; lớp phủ giữ mảnh trong lúc nạp Home, rồi cho bay tới thẻ đơn mà Home báo lại.
- **Luật:** Home và Gameplay không biết nhau; chỉ biết dịch vụ chuyển cảnh và dữ liệu hình. Mọi bước có `CancellationToken`, bấm nhanh hay thoát giữa chừng không để lớp phủ treo.

### 5.12 Hiển thị dùng chung (`GraphNode.Visuals`)

- **`ShapePreview`:** vẽ `targetShape` thành nét đứt có tô nhạt, kích thước tùy chỗ dùng. Có kích thước tối thiểu và độ dày nét theo số node, để hình nhiều node vẫn đọc được trong bong bóng.
- **`FabricMaterial`:** một shader đổ hoa văn và màu vải theo mặt nạ, dùng cho cảnh đổ màu trong màn, mảnh và vải nền khi hoàn thiện sản phẩm, sản phẩm trên người khách, lookbook.
- **`CharacterView`:** nhân vật gồm các lớp (thân, tóc, biểu cảm, trang phục). Trang phục lấy từ phần mặc lên người của `ProductDefinition`, đổ vải bằng `FabricMaterial`. Dùng cho khách ở quầy, cảnh khách nhận đồ; sau này cho mặc thử và lookbook.
- **Quy trình art cho mỗi sản phẩm:** bản phác thảo cho thẻ đơn; khi làm mở rộng mặc thử thì thêm một sprite trang phục, một mặt nạ vùng đổ vải, vị trí đặt hình đắp; cùng kích thước khung với chân dung khách để chồng lớp đúng.

### 5.13 Giao diện (uGUI)

Giao diện (bố cục, art, prefab) do người dùng làm; code chỉ làm View script và Presenter. Dùng uGUI (Canvas) với TextMeshPro, không dùng UI Toolkit.

**Đặt sẵn hay instantiate, chia theo vòng đời:**

| Loại | Ví dụ | Cách làm |
| --- | --- | --- |
| Bố cục chính sống suốt scene | Home: quầy, khách, bong bóng, nút bắt đầu, chip số màn. Gameplay: HUD (thanh khớp, Gợi ý, Đặt lại, Đảo chiều) | Prefab đặt sẵn trong scene |
| Màn hình, popup lúc có lúc không | Cài đặt, bảng thắng, hỏi dùng booster, hết booster | Prefab, `ScreenNavigator` instantiate lần đầu mở rồi giữ lại để ẩn hiện |
| Phần tử lặp theo dữ liệu | Ô tiến độ trên thẻ đơn, toast, decor | Prefab một phần tử, instantiate theo dữ liệu; thứ xuất hiện thường xuyên (toast) dùng pool |

Vải, node, cạnh, ghim, điểm sáng **không phải UI**: là sprite và mesh trong không gian thế giới (`Gameplay/View`, `Visuals`), không đặt trên Canvas.

**View và Presenter (MVP):**

- **View:** `MonoBehaviour` trên prefab, chỉ giữ `[SerializeField]` tới phần tử (`TMP_Text`, `Button`, `Image`), có hàm hiển thị (`Show(...)`, `SetMatch(float)`) và phát sự kiện (`StartClicked`). Không biết save, booster, level. View script và các ô tham chiếu là hợp đồng giữa prefab của người dùng và code.
- **Presenter:** lớp C# thường trong `Meta` hoặc `Gameplay`, nhận dữ liệu và dịch vụ qua hàm khởi tạo, ra lệnh cho View và nghe sự kiện của View. Test được không cần scene.
- Không `GameObject.Find`, không singleton, không `Resources.Load`. Prefab được tham chiếu `[SerializeField]` ở lớp nối của scene trong `App/Scopes`, truyền vào `ScreenNavigator` (`UI/Framework`).
- `ScreenNavigator` giữ ngăn xếp popup, mở đóng bằng UniTask kèm token; tween có `SetLink`. Giao diện sống qua lúc đổi scene (lớp phủ chuyển cảnh, toast) thuộc phạm vi App.

**Thiết lập Canvas (đã chốt):**

| Thông số | Giá trị | Lý do |
| --- | --- | --- |
| UI Scale Mode | Scale With Screen Size | Giao diện co giãn theo màn hình |
| Reference Resolution | 1170 × 2532 | Wireframe 390 × 844 pt nhân 3: 1 pt = 3 px, vùng chạm 44 pt = 132 px; art xuất @3x, Set Native Size là đúng cỡ |
| Screen Match Mode | Expand | Khung 390 × 844 luôn nằm trọn trong màn hình; màn thừa chiều nào thì có vùng trống chiều đó (máy tính bảng thừa hai bên, máy 9:21 thừa trên dưới) |
| Reference Pixels Per Unit | 100 | Mặc định; sprite UI để PPU 100 |

- **Tách Canvas theo tần suất đổi:** phần tử đổi liên tục (thanh khớp khi kéo) nằm trên Canvas con riêng, để không dựng lại mesh của cả HUD.
- **Neo theo % như wireframe:** các vùng của Home dùng anchor min/max theo trục dọc đúng tỉ lệ ở bảng vị trí trong đặc tả; phần tử cỡ cố định neo vào vùng chứa nó.
- **Safe area:** một component trên root co vùng nội dung tránh tai thỏ. Nội dung quan trọng nằm trong khung 390 × 844 và trong safe area.
- **Ảnh nền vẽ tràn:** tường, sàn, trần rộng tới khoảng tỉ lệ 3:4 và cao tới khoảng 9:21, để vùng thừa do Expand là phần tiếp của căn phòng.
- **Vùng chạm** tối thiểu 44 pt (132 px), có thể lớn hơn hình vẽ.

**Luồng làm một màn hình:** người dùng dựng prefab trong `Prefabs/UI/` → Claude viết View script với các ô `[SerializeField]` theo tên phần tử trong prefab → người dùng nối tham chiếu (hoặc Claude nối qua MCP rồi kiểm tra) → Claude viết Presenter, test và nối vào scope của scene.

---

## 6. Sẵn sàng cho meta loop

### Có từ bản đầu

- Assembly `GraphNode.Meta` với `Progression` (mở màn, lưu tiến trình) và `Orders` (khách ở quầy, đơn nhiều mảnh, bong bóng suy nghĩ, cảnh khách nhận đồ: vui vẻ rồi ra về).
- Dữ liệu `CustomerDefinition`, `OrderDefinition`. Level không biết khách: Meta chọn level kế tiếp từ đơn rồi gửi `LevelRequest`.
- Bong bóng suy nghĩ dùng `ShapePreview` (Visuals) vẽ `targetShape` của level kế tiếp, không cần art riêng cho từng màn và Meta không phải đụng Core.
- Cảnh khách nhận đồ dùng `CharacterView` (biểu cảm vui) và hiển thị sản phẩm đã hoàn thiện. Mặc thử lên người khách là mở rộng tùy chọn, dùng thêm phần mặc lên người của `ProductDefinition` và `FabricMaterial`.
- Mọi lần đổi scene đi qua `ISceneTransition` (bản đầu có thể chỉ là mờ dần; hiệu ứng bong bóng vào màn và mảnh vải về thẻ đơn là tùy chọn).
- Hợp đồng `LevelRequest`, `LevelResult`, message bus; lưu theo mục; khung điều hướng màn hình.
- Điểm móc `IRewardPolicy` (bản đầu không thưởng gì) và `modifiers` trong `LevelRequest`.

### Cách thêm một lớp meta mở rộng (ví dụ lookbook)

1. Tạo thư mục `Scripts/Meta/Lookbook/`.
2. Thêm mục lưu `lookbook`.
3. Nghe thông điệp "đơn hoàn thành" của `Orders` (không nghe trực tiếp màn chơi).
4. Thêm màn hình mở từ Home.
5. Nếu cần ảnh hưởng màn chơi (ví dụ vải đã chọn đổi màu đổ) thì truyền qua `LevelRequest` dưới dạng dữ liệu chung.

Không bước nào sửa `Core` hay `Gameplay`. Thứ tự thêm đề xuất khớp đặc tả: khách có câu chuyện, lookbook, vải, nâng cấp tiệm theo mốc cố định.

### Đặt mảnh và hoàn thiện sản phẩm (nâng cấp sau bản đầu)

- Assembly riêng `GraphNode.Meta.Sewing`, theo cách tách ở mục "Khi Meta lớn lên". Không tham chiếu `Orders` hay `Gameplay`.
- Nhận thông điệp sản phẩm đã đủ mảnh từ `Orders`, hoàn thiện xong thì phát thông điệp sản phẩm hoàn thiện; `Orders` nghe để chuyển sang cảnh khách nhận sản phẩm. Bước này chạy cho mọi sản phẩm, kể cả sản phẩm một mảnh.
- Phép kiểm tra "mảnh đủ gần ô thì hút vào" là hình học thuần, đặt trong `Core` kèm test EditMode. Khoảng cách tính theo bề rộng khung, lấy từ ScriptableObject cấu hình.
- Dùng `Visuals`: `ShapePreview` vẽ mảnh từ `targetShape`; vải nền dựng mesh theo kiểu hình (vuông, vuông bo góc, tròn); `FabricMaterial` có một tham số mức hoàn thiện dùng cho cả mảnh và vải nền: sau mỗi màn đẩy lên mức nhạt, lần chạm hoàn thiện đẩy lên tối đa. Decor là sprite trong SpriteAtlas, hiện lần lượt bằng `IPresentationStep`.
- Dữ liệu: `ProductDefinition` (khung, vải nền tùy chọn, ô mảnh gồm vị trí, tỉ lệ và góc xoay do người thiết kế đặt, điểm gắn decor, bản phác thảo, phần mặc lên người cho mở rộng mặc thử), lựa chọn decor và màu hoàn thiện trong `OrderDefinition`, `DecorDefinition`. Thêm mục lưu nếu cần nhớ trạng thái đặt mảnh dở.

### Khi Meta lớn lên

- Bản đầu `GraphNode.Meta` là một assembly (Progression, Orders).
- Khi thêm một tính năng meta có từ khoảng chục lớp trở lên, tách nó thành assembly riêng (`GraphNode.Meta.Lookbook`, `GraphNode.Meta.ShopUpgrades`…), cùng một `GraphNode.Meta.Shared` chứa thông điệp và dữ liệu chung của meta.
- Các tính năng meta không tham chiếu nhau; nói chuyện qua thông điệp (ví dụ `OrderCompleted`). Tách sớm giúp biên dịch nhanh và không dính nhau.

### Để dành, cần khi làm mở rộng

- **Chia sẻ ảnh lookbook:** cần một plugin chia sẻ gốc cho iOS và Android (bạn tự cài khi tới lúc).
- **Sự kiện theo mùa:** cần remote config, nội dung tải từ xa (Addressables) và giờ máy chủ để chống chỉnh đồng hồ máy; `IClock` đã chừa chỗ.
- **Nâng cấp tiệm nhiều art:** nạp và giải phóng art theo mốc, có thể cần Addressables.
- **Kiếm tiền (quảng cáo, mua trong game):** hiện game không dùng. Nếu sau này cần thì thêm interface (`IAdsService`, `IStoreService`) vào Foundation và cài ở Services; Gameplay chỉ thấy số booster trong `LevelRequest`. Chưa làm gì bây giờ.

### Không làm sẵn bây giờ

Tiền công, nâng cấp tiệm, lookbook, vải, câu chuyện khách, sự kiện theo mùa, backend. Chỉ giữ chỗ nối, chưa viết code cho những thứ đặc tả để ở mục mở rộng tương lai.

---

## 7. Lộ trình triển khai

| Mốc | Nội dung | Cổng qua |
| --- | --- | --- |
| M0 Khung project | Thư mục, asmdef, ba scene, Boot và luồng scene, dịch vụ rỗng, CI dựng được bản trống | Project mở không lỗi, CI xanh |
| M1 Lõi | Chuyển lõi bản thử sang `GraphNode.Core`; test EditMode với số liệu đối chiếu (100% cho đáp án, bảng độ nhạy, thứ tự ghim, đối xứng gương và đảo chiều) | Test xanh; đo thời gian tính trên Editor và một máy Android phổ biến |
| M2 Màn chơi tối thiểu | Một level đọc từ JSON, kéo tương đối, vùng tô và viền (thử hai cách vẽ, chọn một), thanh khớp, thắng | Chơi hết màn 1 trên thiết bị thật, giữ 60 fps khi kéo node |
| M3 Luật đầy đủ | Điểm sáng, ghim, vòng kiểm tra, đảo chiều, chuỗi trình diễn, bảng kết quả | 4 màn của bản thử chơi được, khớp luật lõi của bản thử (không đối chiếu hình ảnh hay giao diện) |
| M4 Nội dung và tiệm may | Level Editor, kiểm tra hàng loạt trong CI, khoảng 20 màn, tiến trình và save; màn Home khách ở quầy, bong bóng, thẻ đơn, chuyển cảnh cơ bản, khách nhận đồ | Kiểm tra hàng loạt xanh; lưu và tải lại đúng; chơi trọn một đơn từ Home |
| M5 Hoàn thiện | Âm thanh, nốt nhạc, rung, telemetry, giảm chuyển động, hiệu năng, QA trên máy thật | Đạt định nghĩa hoàn thành trong đặc tả |
| Sau đó | Đặt mảnh và hoàn thiện sản phẩm (vải nền, decor bất ngờ); meta mở rộng: khách có câu chuyện, lookbook, vải, nâng cấp tiệm | Theo mục tương ứng trong đặc tả |

---

## 8. Cần bạn chốt

- [x] Thêm Newtonsoft Json làm phụ thuộc chính thức (đã cài 3.2.2).
- [ ] Tiêm phụ thuộc: đề xuất nối thủ công qua hàm khởi tạo tới M3, xem lại VContainer trước meta mở rộng.
- [ ] Bật define `UNITASK_DOTWEEN_SUPPORT`. Đã tạo asmdef `DOTween.Modules`; define đã có cho Android (assembly `UniTask.DOTween` đã biên dịch), còn thiếu iOS và chưa lưu xuống `ProjectSettings.asset`.
- [x] Gỡ gói Visual Scripting (đã gỡ khỏi `manifest.json` và `packages-lock.json`, Console không lỗi).
- [ ] Chọn CI (đề xuất GitHub Actions với GameCI) và nhà cung cấp telemetry, crash.
- [ ] Android min SDK và vài máy phổ biến để kiểm tra 60 fps.
- [ ] Ghim gói MCP for Unity vào một tag hoặc commit thay cho `#main`.
- [ ] ProjectSettings: khóa màn hình dọc (đang cho tự xoay 4 hướng); bundle id iOS (chưa đặt). Đã xong: tên công ty `XGames`, bundle id Android `com.XGames.GraphNodePuzzle`. Android đã đúng: IL2CPP, ARMv7 + ARM64 (đã chốt giữ cả hai, ưu tiên ARM64; xem mục Build và phát hành trong đặc tả).

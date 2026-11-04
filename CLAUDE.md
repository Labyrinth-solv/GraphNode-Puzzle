# CLAUDE.md — GraphNode Puzzle

Game mobile Unity dạng giải đố: kéo node của một đồ thị cho viền ngoài khớp hình mẫu, cắt miếng vải rồi ghép vào sản phẩm. Dự án làm theo chuẩn production.

## Nguồn sự thật

- Đặc tả: `Assets/Docs/GraphNode-Puzzle-Dac-ta.md`. Đọc mục liên quan trước khi làm một tính năng. Đổi luật hay cơ chế thì cập nhật đặc tả trong cùng thay đổi.
- Hai file Markdown trong `Assets/Docs` là bản gốc. Bản đặc tả trên Claude Docs chỉ để đọc và bình luận; sửa ở bản gốc trước rồi mới đồng bộ.
- Kiến trúc: `Assets/Docs/GraphNode-Puzzle-Kien-truc.md` (assembly, thư mục, công nghệ, luồng dữ liệu, cách thêm meta). Đổi cấu trúc hay thêm công nghệ thì cập nhật tài liệu này.
- Bản thử web chỉ là demo luật lõi (link ở mục "Link bản thử" trong đặc tả). Chỉ dùng luật lõi và số liệu của nó làm giá trị đối chiếu cho test. **Không** lấy bản thử làm gốc cho hình ảnh, giao diện, cấu trúc code hay meta, và không chép mã của nó. Giao diện bản chính thức theo mẫu người dùng cung cấp.
- Không tự bịa số cân bằng. Thông số chưa có trong đặc tả thì hỏi, hoặc đặt giá trị tạm trong ScriptableObject và ghi vào mục "Cần chốt" của đặc tả.

## Giao diện

- Giao diện (bố cục màn hình, UI, art, màu sắc, prefab giao diện) do người dùng tự làm. Claude chỉ làm giao diện khi được yêu cầu rõ.
- Muốn đề xuất hay sửa giao diện thì hỏi trước, nêu thay đổi cụ thể và chờ người dùng đồng ý rồi mới làm.
- Bố cục chuẩn của màn Home là wireframe dọc `Assets/Docs/GraphNode-Puzzle-Wireframe-Home.html`. Code cho Home bám vị trí các vùng trong đó, không tự đặt bố cục khác.

## Nền tảng

- Unity 2022.3.62f3 (LTS), URP 14.0.12 với Renderer 2D, Input System, TextMeshPro, Test Framework. Đã có UniTask và DOTween trong `Assets/Plugins`.
- Màn hình dọc, một ngón tay, **khóa cứng 60 fps** (`Application.targetFrameRate = 60` ở Boot) và giữ ổn định trên các máy phổ biến.
- Không thêm package, không đổi `ProjectSettings` hay phiên bản Unity khi chưa hỏi. Không sửa mã trong `Assets/Plugins` hay `Packages`.

## Cấu trúc và assembly

- Mã game nằm trong `Assets/Scripts`, test trong `Assets/Tests`. Mỗi thư mục cấp hai có đúng một assembly definition:
  - `GraphNode.Core`: lõi hình học và luật chơi, C# thuần, **không tham chiếu UnityEngine**. Dùng struct toạ độ riêng, chuyển đổi ở biên.
  - `GraphNode.Foundation` (hợp đồng, message bus, interface dịch vụ), `GraphNode.Data`, `GraphNode.Services`, `GraphNode.UI`, `GraphNode.Visuals` (hình mẫu, vải, nhân vật dùng chung cho màn chơi và tiệm may), `GraphNode.Gameplay`, `GraphNode.Meta`, `GraphNode.App` (composition root), `GraphNode.Editor` (chỉ Editor), `GraphNode.Tests.EditMode`, `GraphNode.Tests.PlayMode`.
- Namespace trùng cấu trúc thư mục. Phụ thuộc chỉ đi một chiều theo sơ đồ trong tài liệu kiến trúc: không gì tham chiếu `App`, `Gameplay` và `Meta` không tham chiếu nhau, `Core` không tham chiếu gì. Hai module nói chuyện qua `LevelRequest`, `LevelResult` và message bus trong `Foundation`; đổi scene qua `ISceneTransition`, không tự nạp scene.
- Asset game nằm trong `Assets/Content`, `Assets/Art`, `Assets/Audio`, `Assets/Prefabs`; không thêm asset vào `Resources`.
- Một scene gameplay dùng chung. Level là file JSON (bản gốc, có `schemaVersion`) trong `Assets/Content/Levels`, không có bản ScriptableObject song song; thêm màn không sửa code. Định nghĩa có asset (khách, món đồ, vải, cấu hình) là ScriptableObject, level trỏ tới bằng id.
- Dữ liệu nhiều loại ghi trường `kind` và đọc bằng bộ chuyển đổi tự viết; không dùng `TypeNameHandling` của Newtonsoft.

## Quy tắc code

- Tên theo chuẩn C#. Định danh bằng tiếng Anh. Comment ngắn bằng tiếng Việt, giải thích lý do chứ không mô tả dòng code.
- Cơ chế mới đi qua giao diện có sẵn: `INodeConstraint`, `IEdgeShape`, `IWinCondition`, `IPinRule`, `IRunnerRule`, `IHintProvider`. Không rải `if` theo loại level trong code chơi.
- Dịch vụ (âm thanh, rung, lưu trữ, telemetry) nằm sau interface, khởi tạo ở một điểm duy nhất. Không singleton tĩnh cho dữ liệu màn chơi.
- Bất đồng bộ dùng UniTask kèm `CancellationToken` gắn vòng đời đối tượng. Không dùng coroutine. Tween DOTween phải có `SetLink` hoặc được kill khi đối tượng bị hủy.
- Input chỉ qua Input System, không dùng `UnityEngine.Input`. Một ngón; mất focus thì hủy thao tác kéo.
- Chữ dùng TextMeshPro. Chuỗi hiển thị đi qua bảng chuỗi, không ghi cứng.
- Thông số cân bằng (ngưỡng thắng, tốc độ điểm sáng, bán kính chọn, dung sai ghim, thang âm) đặt trong ScriptableObject, không ghi cứng.
- Đơn vị khoảng cách và tốc độ tính theo bề rộng khung vải (bảng Đơn vị đo trong đặc tả), không theo pixel cứng hay đơn vị của bản thử. Vùng chạm không nhỏ hơn 44 pt.

## Hiệu năng

- Mục tiêu bắt buộc: giữ 60 fps (16,6 ms mỗi khung hình) trên các máy phổ biến. Không tối ưu sớm; khi profiler trên máy thật cho thấy rơi khỏi 60 fps thì tối ưu và ghi kết quả đo vào đặc tả.
- Thói quen rẻ nên giữ: tránh cấp phát trong `Update` khi đang kéo (tái dùng mảng đệm, tránh LINQ, closure và `new` trong vòng lặp nóng). Lõi tính viền ngoài và điểm khớp hướng tới khoảng 1 ms mỗi khung hình.
- Mesh viền và vùng vải cập nhật trên cùng đối tượng, không tạo mới mỗi khung. Dùng SpriteAtlas, nén ASTC, không nạp tài nguyên lớn qua `Resources`.

## Kiểm thử

- Mỗi thay đổi trong `GraphNode.Core` có test EditMode. Dùng số liệu đối chiếu trong đặc tả (đáp án cho 100%, bảng độ nhạy, thứ tự ghim kể cả bản đối xứng gương và đảo chiều).
- Level mới phải qua trình kiểm tra hàng loạt: lời giải vượt ngưỡng, vị trí đầu chưa vượt, ghim nằm trên viền trong dung sai, không chồng vùng cấm, không lớp chiều sâu che node hay ghim.
- Chạy test và đọc kết quả trước khi báo xong. Không báo "xong" khi chưa chạy.

## Làm việc với Unity qua MCP

- Gói MCP for Unity (`com.coplaydev.unity-mcp`) chỉ dùng trong Editor khi phát triển. Không đưa vào bản phát hành (xem mục Build).
- Sau khi tạo hoặc sửa script, đọc console để xem lỗi biên dịch trước khi dùng kiểu mới. Chờ domain reload xong rồi mới thao tác tiếp.
- Khi có nhiều Unity đang mở thì chọn đúng instance trước khi gọi tool.
- Không sửa tay file `.unity`, `.prefab`, `.asset` (YAML). Dùng tool của Unity hoặc Editor. Không xóa hay tạo lại file `.meta`; commit `.meta` cùng asset.
- Tạo prefab và asset qua MCP rồi kiểm tra lại trạng thái, không giả định thành công.

## Build và phát hành

- Android: IL2CPP, ARM64 + ARMv7, AAB. Ưu tiên ARM64: đo hiệu năng và QA chính trên máy ARM64. iOS: IL2CPP, dự án Xcode. Khóa màn hình dọc.
- Bản phát hành phải **không chứa gói MCP**. Quy tắc: CI dựng từ `manifest.json` đã gỡ dòng `com.coplaydev.unity-mcp`, và có bước kiểm tra trước build làm hỏng build nếu assembly `MCPForUnity` xuất hiện.
- Đánh phiên bản major.minor.patch cộng số build. Không commit khóa ký hay thông tin bí mật.

## Git

- Commit nhỏ, thông điệp rõ (kiểu `feat:`, `fix:`, `docs:`, `test:`). Một commit một việc.
- Không commit `Library/`, `Temp/`, `Logs/`, `UserSettings/`. `.gitignore` đã có.
- Không dùng `--force` hay `--no-verify` khi chưa được yêu cầu.

## Định nghĩa hoàn thành

Một tính năng chỉ xong khi: chạy đúng và giữ 60 fps trên máy thử, có test cho phần lõi, không còn cảnh báo trong Console, có ghi telemetry (nếu là sự kiện đo chỉ số), đã cập nhật đặc tả.

## Cách làm một việc

1. Đọc mục đặc tả liên quan và code đang có. Nói rõ điều chưa chắc thay vì đoán.
2. Làm nhỏ, kiểm tra từng bước (biên dịch, test, console).
3. Báo cáo đúng kết quả: cái gì đã chạy, cái gì chưa kiểm chứng trên thiết bị thật.

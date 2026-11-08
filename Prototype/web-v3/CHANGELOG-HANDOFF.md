# Tài Liệu Bàn Giao & Thử Nghiệm Feeling May Vá (`Prototype/web-v3`)

**Cập nhật lần cuối:** `2026-11-07`  
**Thư mục làm việc:** `Prototype/web-v3/` (trang thử nghiệm độc lập song song với `Prototype/web-v2/`)  
**Server so sánh song song:**
- Trang gốc `web-v2`: `http://localhost:3000/`
- Trang mới `web-v3`: `http://localhost:3001/`  
**Script kiểm thử tự động:** `node Prototype/web-v3/smoke.js`

---

## 🌟 CÁC FEELING MAY VÁ MỚI ĐÃ TRIỂN KHAI TRÊN `web-v3`

Dựa trên yêu cầu mang lại cảm giác thỏa mãn cao (tương tự khoảnh khắc tô màu hoàn tất của *Color Page*) nhưng vẫn giữ được chất cozy, thiền định của *I Love Hue* và *Two Dots*:

### 1. Giữ nguyên chuỗi tự động nhấc mảnh vải như ban đầu & Đồng nhất sợi chỉ preview cầu vồng đung đưa
- Đã bỏ thao tác bắt người chơi kéo mảnh vải ra (`peel`), giữ luồng tự động mượt mà như ban đầu (`cut` → `lift` / `unfold` → `fill` → `fly`).
- **Đồng nhất thành 1 sợi chỉ preview duy nhất (`swayedRingPath` & `drawEdges`):** Gộp phần dây preview sặc sỡ bên ngoài (`drawCut` cũ) và phần sợi chỉ đung đưa (`drawEdges`) thành **cùng 1 đường sợi chỉ duy nhất**:
  - **Đung đưa cục bộ theo quán tính cây kéo + Đứng êm khi khớp viền mẫu (Hướng B + Quán tính `edgeWake` trong `swayedRingPath` & `runnerStep`):**
    - **Cạnh đã đặt khớp viền mẫu (`edgeMaxErr <= 0.010`):** `fitFactor = 0` nên sợi chỉ nằm êm khít trên đường nét đứt, không bị lệch khi kéo đi qua.
    - **Cạnh chưa khớp viền mẫu (`fitFactor = 1`):** Khi cây kéo ở xa, đoạn dây nằm nghỉ tĩnh lặng (chỉ hơi chùng nhẹ tự nhiên). Khi cây kéo lướt vào cạnh `k` (`S.runK === k`), mũi kéo đi tới đâu truyền xung quán tính (`bladePush` bám theo vị trí `S.runT`) làm sợi chỉ khẽ dập dềnh tới đó; ngay khi kéo rời sang cạnh kế tiếp (`S.edgeWake[k] = now()`), đoạn dây vừa đi qua còn ngân nhẹ 1–2 nhịp dư chấn tắt dần (`ring = decay * cos(wakeAge * 9.5)` trong `~1.35s`) rồi đứng yên hoàn toàn chờ vòng kéo tiếp theo.
  - **Dải màu chỉ nhuộm Cozy (`COZY_YARN` / `cozyThreadRGB`):** Nét liền (`lineCap = 'round'`, `lineJoin = 'round'`) chuyển màu mượt liên tục qua 5 sắc độ chỉ thêu ấm dịu (Hồng đất đào `#D67A72` → Vàng bơ mật `#DEAA5C` → Xanh xô thơm `#76AC8A` → Xanh lam khói `#7296B8` → Tím hoa cà ấm `#AC82A8`).
  - Vùng tô preview (`drawSwayedFill`) và cây kéo chạy quanh vòng (`drawRunner`) đều bám chính xác 100% theo đường sợi chỉ đung đưa này.

### 2. Sóng lan tỏa màu kem (`C.cream`) rõ nét khi kéo chạm điểm
- Khi cây kéo chạy qua chạm vào các điểm (`node`), vòng sóng lan tỏa (`drawRipples`) được đổi sang **màu kem sáng (`#FFF7E8`)** kèm lớp viền bóng mờ tương phản nhẹ phía dưới để nhìn rõ ràng, nổi bật trên nền vải hồng.

### 3. Âm thanh chạm / thả tay đồng bộ & Âm kéo qua preview vải dịu, đầm hơn
- **Chạm & Thả điểm (`playDown` / `playUp`):** Khi chạm vào node phát âm *pop* ấm (bậc 1 quãng trầm, `vol = 0.08`, `dur = 0.14s`) và khi **thả tay** cũng phát âm *pop* tương tự (bậc 0 quãng trầm, `vol = 0.085`, `dur = 0.15s` kèm rung nhẹ) tạo cặp phản hồi chạm–nhả rõ ràng.
- **Kéo qua phần preview vải (`softTone`):** Thay thế tiếng *tick* tần số cao `1900 Hz` cũ bằng hàm âm trầm ấm `softTone` (kết hợp sóng `sine` + `triangle` sub-octave qua bộ lọc thông thấp `lowpass`) ở quãng trầm ngũ cung, giúp tiếng khi lướt qua viền/vùng preview vải nghe **dịu và đầm hơn**.
- **Âm thanh vải khi kéo (`humUpdate`) & Dây gảy ấm (`pluck`):** Giữ nguyên âm thanh vải sột soạt êm dịu khi đang kéo tay và tiếng dây đàn trầm ấm khi chạm ngưỡng thắng.

### 3. Khâu từng mũi may leo thang âm ngũ cung (`Stitch-by-Stitch Audio & Visual`)
- Ở màn thưởng lắp ghép thành phẩm, đường may không còn là một vệt trượt liên tục đơn điệu.
- Các đường giáp nối được chia thành **từng mũi khâu rời rõ rệt** (mũi chỉ vàng mù tạt trên lớp lót trắng nổi và 2 lỗ châm kim nhỏ).
- Cây kim khâu nhảy nhịp nhàng từng mũi, **mỗi mũi cắm xuống phát đúng 1 nốt ngũ cung leo dần lên cao (`risingF`)** kèm tiếng đâm kim khâu tí tách.

### 4. Khoảnh khắc "Chốt" rút chỉ: Đường may co lại, vải hơi nhăn rồi phẳng lì (`Cinch & Flatten`)
- Đến mũi khâu cuối cùng:
  - **Pha 1 (Co lại & nhăn nhẹ):** Cây kim rút mạnh sợi chỉ, toàn bộ thành phẩm hơi co rút nhẹ về tâm đường may (`productTf`). Dọc theo từng mũi khâu, các **nếp nhăn vải 3D (bóng tối + viền sáng bắt nếp)** xuất hiện nhăn nhẹ, kèm tiếng rít miết sợi chỉ và tiếng gảy dây căng.
  - **Pha 2 (Phẳng lì & giải tỏa):** Sợi chỉ khâu khít chặt, tấm vải lập tức thở nhẹ và duỗi phẳng lì hoàn hảo. Đúng khoảnh khắc này, **hợp âm Đô trưởng ngũ cung tròn trịa (`[0, 4, 7, 12]`)** vang lên cùng chùm pháo hoa lấp lánh nổ bung dọc mép đường khâu. Cảm giác vô cùng "đã tay" và thỏa mãn!

### 5. Giới hạn tăng tốc cố định 1.5 lần (`Speedup Cap`)
- Đúng theo yêu cầu của bạn: Nếu người chơi ấn thêm màn hình trong lúc cắt, bóc hoặc khâu ráp, game chỉ tăng tốc cố định **1.5 lần (`FAST = 1.5`)**, giữ nhịp độ thư thái tự nhiên, không bị nhảy cóc hay mất feeling cozy.

### 6. Giữ trọn vẹn chủ đề vá vải thủ công
- Toàn bộ thiết kế bám chặt vào vải nỉ, đường may quilt/patchwork mộc mạc, không dùng khóa kéo kim loại hay chi tiết lạc đề.

---

# Tài Liệu Bàn Giao & Nhật Ký Thay Đổi (Handoff & Changelog — `Prototype/web-v2`)

**Cập nhật lần cuối:** `2026-11-07`  
**Thư mục làm việc:** `Prototype/web-v2/` (bản clone độc lập từ `Prototype/web-demo/web/`)  
**Server chạy thử:** `node Prototype/web-v2/server.js` tại `http://localhost:3000/`  
**Script kiểm thử tự động:** `node Prototype/web-v2/smoke.js`

---

## 1. Nguyên tắc & Phạm vi (Scope Boundaries)

1. **Tuyệt đối không chỉnh sửa** bản gốc trong `Prototype/web-demo/` và chưa can thiệp code C# Unity trong `Assets/Scripts/` khi chưa được yêu cầu.
2. Mọi thay đổi tính năng, thêm/xóa màn chơi, chỉnh hình dáng mảnh ghép của bản web đều được thực hiện trong thư mục **`Prototype/web-v2/`**.
3. Sau mỗi lần sửa `levels.js` hoặc `game.js`, luôn chạy `node Prototype/web-v2/smoke.js` để đảm bảo toàn bộ các màn chơi và màn thưởng (`Ghép thành phẩm`) hoạt động trơn tru.

---

## 2. Tổng hợp các thay đổi đã chốt trong phiên làm việc

### 2.1. Khởi tạo bản clone sạch `Prototype/web-v2/`
- Sao chép toàn bộ mã nguồn từ `Prototype/web-demo/web/` sang `Prototype/web-v2/`:
  - `core.js`: Thuật toán hình học phẳng, đường cong Catmull-Rom (`GN.ringPath`), raster hóa vùng tô (`GN.region` trên lưới `96×96`), tính độ khớp `IoU` (`GN.iou`).
  - `levels.js`: Dữ liệu các mảnh ghép (`LEVELS`) và cấu hình sản phẩm (`PRODUCTS`).
  - `startgen.js`: Thuật toán sinh vị trí khởi đầu tất định (deterministic FNV-1a + Mulberry32 PRNG) theo 3 cấp độ khó `easy`, `medium`, `hard`.
  - `game.js`: Vòng lặp game, xử lý kéo thả, hiệu ứng cắt kéo, lật mở vải gấp (`unfold`), và màn thưởng khâu lắp ghép sản phẩm (`Reward Scene`).
  - `index.html` & `cat-vai-nam.html`: Giao diện trang chơi.
  - `server.js`: HTTP server nhẹ cổng `3000` có header `Cache-Control: no-cache, no-store, must-revalidate` để tải lại trang là nhận code mới ngay.
  - `smoke.js`: Script tự động giải toàn bộ các mảnh ghép và lắp ghép ở màn thưởng để kiểm tra hồi quy.

---

### 2.2. Xóa Màn 1 cũ (`mushroom` — Nấm) & Đánh số lại toàn bộ thứ tự màn
Theo yêu cầu của người dùng, **Màn 1 cũ (`mushroom`: gồm 2 mảnh `cap` và `stem`) đã được xóa bỏ**, và các màn sau được đôn lên đánh số lại tuần tự trong cả `LEVELS`, `PRODUCTS` (`Prototype/web-v2/levels.js`) lẫn bảng trang trí `DECOR` (`Prototype/web-v2/game.js`):

| Thứ tự mới | ID Sản phẩm | Tên sản phẩm | Chỉ số `levels` trong `LEVELS` | Độ khó (`tier`) | Cơ chế đặc biệt |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Màn 1** *(trước là Màn 2)* | `icecream` | Kem ốc quế | `[0, 1]` (`scoop`, `cone`) | `easy` (`maxFree: 3`) | Cơ bản (đường cong `'c'` + đường thẳng `'s'`) |
| **Màn 2** *(trước là Màn 3)* | `cardigan` | Áo khoác Cardigan | `[2, 3, 4]` (`cardigan`, `shirt`, `collar`) | `medium` (`maxFree: 6`) | Giữ nguyên số lượng node (`10, 6, 6` node), nâng cả 3 mảnh lên `tier: 'medium'` (`6, 5, 4` node kéo) |
| **Màn 3** *(trước là Màn 4)* | `heart` | Trái tim gấp đôi & khoét lỗ | `[5, 6]` (`heart`, `heartHole`) | `easy` (`maxFree: 3`) | **Gấp đôi vải (`fold`) + Khoét lỗ (`chains`)**, mảnh `5` lồng khớp vào lỗ của mảnh `6` |
| **Màn 4** *(màn mới thêm)* | `bunny` | Bé thỏ má phính | `[7, 8, 9]` (`bunny_ears`, `bunny_head`, `bunny_bow`) | `medium` (`maxFree: 6`) | 3 mảnh đường cong `'c'`, ngưỡng thắng `92%–95%` |
| **Màn 5** *(màn mới thêm)* | `flowerpot` | Chậu hoa mặt cười | `[10, 11]` (`flower_bloom`, `flower_pot`) | `hard` (`maxFree: 9`) | 2 mảnh độ khó `hard`: **Bông hoa 6 cánh gấp đôi (`fold`)** + **Chậu hoa đất nung (`10` node)** |

### 2.2b. Nâng độ khó Màn 2 (`cardigan` — Áo khoác Cardigan) lên `tier: 'medium'` (giữ nguyên số lượng node)
Theo yêu cầu của người dùng, cả 3 mảnh của **Màn 2 (`cardigan`)** giữ nguyên toàn bộ tọa độ `sol` và số lượng node như cũ nhưng đổi sang `tier: 'medium'` (`dist: [0.12, 0.22], iou: [0.40, 0.70]`):
1. **Mảnh 1 — `Thân áo khoác` (`cardigan`, index `2`):** Giữ nguyên **10 node**, `tier: 'medium'`, `free: [1, 3, 4, 5, 6, 8]` (6 node kéo), `locked: [0, 2, 7, 9]` (4 node khóa đối xứng ở hai vai và cổ tay trong), `startIoU = 68.6%`.
2. **Mảnh 2 — `Áo lót trong` (`shirt`, index `3`):** Giữ nguyên **6 node**, `tier: 'medium'`, `free: [0, 2, 3, 4, 5]` (5 node kéo), `locked: [1]` (khóa đỉnh cổ chữ V), `startIoU = 64.9%`.
3. **Mảnh 3 — `Cổ áo` (`collar`, index `4`):** Giữ nguyên **6 node**, `tier: 'medium'`, `free: [1, 2, 3, 5]` (4 node kéo), `locked: [0, 4]` (khóa 2 mỏm vai ngoài đối xứng `[0.20, 0.10]` và `[0.80, 0.10]`), `startIoU = 48.3%`.

> **Lưu ý quan trọng khi thêm/xóa màn trong `levels.js`:**
> Trong `Prototype/web-v2/game.js`, đối tượng `DECOR` gọi hàm `ptOf(levelIndex, x, y)` theo **chỉ số tuyệt đối của mảnh trong mảng `LEVELS`**. Khi xóa hoặc chèn mảnh ở đầu/giữa mảng `LEVELS`, bắt buộc phải cập nhật lại chỉ số đầu tiên trong `ptOf(...)` của `DECOR` tương ứng.Hiện tại `DECOR` đã được cập nhật chuẩn theo bảng chỉ số `0..9` ở trên.

---

### 2.3. Thiết kế & Tinh chỉnh chi tiết Màn 4 (`bunny` — Bé thỏ, độ khó `medium`)
Được thiết kế mới và tinh chỉnh qua nhiều vòng dựa trên 2 ảnh mẫu mặt thỏ người dùng cung cấp:
- **Quy tắc ngưỡng thắng (`winThreshold`) đã chốt:** Tối thiểu là **`0.92` (`92%`)**. Nếu thuật toán phân tích độ nhạy (jitter test dịch chuyển ngẫu nhiên các node `free` trong bán kính `r = 0.015..0.020`) gợi ý ngưỡng `p10 > 0.92` thì lấy theo số gợi ý lớn hơn đó.
- **Chi tiết 3 mảnh của Màn 4 (`bunny`):**
  1. **Mảnh 1 — `Đôi tai thỏ` (`bunny_ears`, index `7`):**
     - `tier: 'medium'`, `winThreshold: 0.94` (`94%`), độ khớp khởi đầu `startIoU = 66.4%`.
     - Họa tiết: `pattern: { kind: 'knit', base: '#FFF5EB', deep: '#FCEADE', accent: '#F3D5C8' }` (màu kem ấm đồng bộ với mặt thỏ).
     - Cấu trúc node: **11 node toàn bộ loại `'c'`** (`free: [1, 2, 3, 7, 8, 9]` — 6 node kéo; `locked: [0, 4, 5, 6, 10]` — 5 node khóa ở gốc tai và khe giữa 2 tai).
     - Hình học: Mỗi đỉnh tai dùng **cặp 2 node ở đỉnh** (`[0.13, 0.14] - [0.29, 0.12]` và `[0.71, 0.12] - [0.87, 0.14]`) để đường cong Catmull-Rom tự động vồng lên thành **đầu tai tròn bầu bĩnh xoè chữ V** (tránh hiện tượng đầu tai bị nhọn khi chỉ dùng 1 đỉnh). Khe giữa 2 tai hạ sâu xuống `[0.50, 0.70]` để ẩn hoàn toàn phía sau trán thỏ.
  2. **Mảnh 2 — `Mặt thỏ` (`bunny_head`, index `8`):**
     - `tier: 'medium'`, `winThreshold: 0.95` (`95%`), độ khớp khởi đầu `startIoU = 67.9%`.
     - Họa tiết: `pattern: { kind: 'dots', base: '#FFF8F0', deep: '#FDF0E4', accent: '#F9DFD0' }`.
     - Cấu trúc node: **10 node toàn bộ loại `'c'`** (`free: [0, 2, 4, 5, 7, 8]` — 6 node kéo; `locked: [1, 3, 6, 9]` — 4 node khóa ở đỉnh trán `[0.50, 0.20]`, hai eo thái dương `[0.18, 0.48]` & `[0.82, 0.48]`, và đáy cằm `[0.50, 0.86]`).
     - Hình học: Tạo dáng **mặt thỏ má bánh bao (mochi/pear shape)** chuẩn ảnh mẫu — vòm trán trên tròn đầy, hơi thắt nhẹ ở thái dương rồi **phình rộng ra ở hai bên má dưới** (`x = 0.08..0.92` tại `y = 0.65`).
  3. **Mảnh 3 — `Chiếc nơ` (`bunny_bow`, index `9`):**
     - `tier: 'medium'`, `winThreshold: 0.92` (`92%`), độ khớp khởi đầu `startIoU = 53.8%`.
     - Họa tiết: `pattern: { kind: 'gingham', base: '#E89B96', deep: '#D97B75', accent: '#FFF8F2' }` (hồng dâu caro nổi bật trên nền vải nỉ vàng).
     - Cấu trúc node: **6 node toàn bộ loại `'c'`** (`free: [0, 2, 3, 5]` — 4 node tròn kéo được ở 4 góc cánh nơ; `locked: [1, 4]` — 2 node khóa ở nút thắt tâm nơ). Đã bỏ 2 node tròn thừa ở rìa ngoài cánh nơ theo yêu cầu người dùng vì đường cong Catmull-Rom giữa 2 đỉnh cánh nơ đã tự phồng tròn tự nhiên.
- **Cấu hình ghép & trang trí Màn 4 (`PRODUCTS` & `DECOR.bunny`):**
  - `order: [7, 8, 9]` (vẽ `Đôi tai thỏ` dưới cùng → `Mặt thỏ` đè lên gốc tai → `Chiếc nơ` đính dưới cằm).
  - `place: { 7: [92.5, 244, 205], 8: [70.0, 294, 250], 9: [142.5, 456, 105] }` — Mảnh `Mặt thỏ` (mảnh vải phía sau) được scale lớn (`s = 250`, rộng `210px`) làm nền vững chắc cho `Chiếc nơ` (`s = 105`, rộng `86px`) và che kín gốc `Đôi tai thỏ`. Tổng bán kính xa nhất từ tâm vải nền `(195, 395)` là `maxR = 146.5px`, nằm **khớp khít bên trong vòng chỉ khâu (`r = 155px`) và tấm vải nền nỉ tròn (`r = 165px`)**.
  - `seams: [[8, 0, 2], [9, 0, 2]]` — Đường kim khâu chạy dọc vòm trán của `Mặt thỏ` (nơi đè lên 2 tai) và mép trên của `Chiếc nơ` (nơi đính vào cằm).
  - `DECOR.bunny`: Gồm 7 bước vẽ chi tiết mặt thỏ (`bunnyEarInner`, `bunnyTuft`, `bunnyEye`, `bunnyMuzzleAndCheeks`, `bunnyBowKnot`).

---

### 2.4. Cơ chế `fitProductPlaces` trong `game.js` & Bài học từ lỗi hiển thị Màn Cardigan
- Trong `Prototype/web-v2/game.js` (dòng `1101–1149`), hàm `fitProductPlaces(p)` được gọi khi bắt đầu màn thưởng (`startReward`) để kiểm tra xem tổng hình hoàn thiện (`hình hoàn thiện`) có vượt quá bán kính vòng chỉ khâu của tấm vải nền tròn (`BASE_FIT_R = 150px` quanh tâm `(195, 395)`) hay không. Nếu vượt quá, hàm sẽ dịch tâm sản phẩm về `(195, 395)` và **scale đồng nhất (uniform scale)** tất cả các mảnh theo cùng một hệ số `sc`.
- **Cảnh báo kỹ thuật (Bug đã khắc phục):**
  - Không được viết logic tự động phóng to riêng lẻ một mảnh (`out[bg].s *= grow`) bên trong `fitProductPlaces` dựa trên việc so sánh chiều rộng giữa 2 mảnh liền kề trong `order`. Ở màn `cardigan` (`order: [2, 3, 4]`), mảnh `3` (`shirt` — dải áo lót dọc hẹp ở giữa ngực) vốn hẹp hơn mảnh `4` (`collar` — cổ áo chữ V vắt lên vai `cardigan`); việc phóng to riêng mảnh `shirt` từng khiến mảnh `shirt` bị kéo dài gấp `2.55 lần` vọt lên đỉnh màn hình.
  - Quy tắc chuẩn: Tỷ lệ tương đối giữa mảnh phía sau và mảnh phía trước phải được thiết kế chuẩn ngay trong `PRODUCTS[i].place` ở `levels.js`, còn `fitProductPlaces` chỉ co giãn đồng nhất toàn bộ sản phẩm nếu vượt quá `BASE_FIT_R`.

---

## 3. Các quy tắc kỹ thuật cốt lõi trong `core.js` & `game.js` cần nhớ

1. **Quy tắc cạnh cong vs cạnh thẳng (`core.js` dòng 31):**
   ```js
   if (level.types[a] !== 'c' || level.types[b] !== 'c') {
     out.push(A[0], A[1], B[0], B[1]);
     return out;
   }
   ```
   Một cạnh nối giữa 2 node `a` và `b` **chỉ được nội suy cong Catmull-Rom khi CẢ HAI node `a` và `b` đều có `type === 'c'`**. Nếu một trong hai node là `'s'` (tam giác), cả đoạn nối đó sẽ là **đường thẳng**. Do đó:
   - Muốn tạo một đoạn cong: cần ít nhất **2 node `'c'` liên tiếp**.
   - Muốn tạo một đỉnh nhọn (như chóp tai cáo, chóp mũi, đỉnh ngôi sao): đặt 1 node `'s'` tại đỉnh nhọn đó và 2 node `'c'` ở hai bên chân đỉnh.
2. **Quy tắc Gấp đôi vải & Khoét rỗng (`buildFold` trong `game.js` dòng 126–146):**
   - Khai báo trên level: `fold: { solX: 0.5, startX: 0.38, chains: [[0, a], [a+1, b]] }`.
   - Người chơi chỉ thao tác với các node ở nửa bên trái (`x <= solX`) và kéo thanh trượt cây kim (`SLIDER_Y = 656`) đưa mép gấp từ `startX` về `solX = 0.5`.
   - Các node đầu và cuối của mỗi chain (`0`, `a`, `a+1`, `b`) nằm trên mép gấp (`x = solX`), tự động trượt theo cây kim.
   - `chains[0] = [0, a]` tạo thành **đường viền ngoài** sau khi đối xứng gương qua `solX`.
   - `chains[1] = [a+1, b]` (nếu có) là một vết lõm bên trái chạm vào mép gấp ở hai đầu `a+1` và `b`. Khi mở vải ra (`unfold`), vết lõm cùng ảnh gương của nó hợp thành **một lỗ thủng kín (`loops[1]`)** có chiều đi ngược với `loops[0]` (tô theo quy tắc `nonzero` hoặc `evenodd` sẽ chừa rỗng phần lỗ này).
   - Để một mảnh khác (`mảnh lồng vào`, có toạ độ chuẩn `sol_inner`) lắp **vừa khít 100%** vào lỗ rỗng của mảnh khoét lỗ theo tỷ lệ `k` (ví dụ `k = 0.45`) tại vị trí dịch chuyển `(dx, dy)`:
     - Tọa độ các node của nhánh lỗ `chains[1]` (đi từ dưới lên trên dọc theo vết lõm để ngược chiều với nhánh ngoài) được tính chính xác từ `sol_inner`:
       $$x_{\text{hole}} = 0.50 - k \cdot (0.50 - x_{\text{inner}}), \quad y_{\text{hole}} = y_{\text{offset}} + k \cdot y_{\text{inner}}$$
     - Ở màn thưởng (`PRODUCTS.place`), nếu mảnh khoét lỗ đặt tại `[ox_bg, oy_bg, s_bg]`, thì mảnh lồng vào đặt tại:
       $$s_{\text{fg}} = k \cdot s_{\text{bg}}, \quad ox_{\text{fg}} = ox_{\text{bg}} + s_{\text{bg}} \cdot 0.50 \cdot (1 - k), \quad oy_{\text{fg}} = oy_{\text{bg}} + s_{\text{bg}} \cdot y_{\text{offset}}$$

---

## 4. Thiết kế & Triển khai Màn 5 (`flowerpot` — Chậu hoa mặt cười, độ khó `hard`)

Được thiết kế dựa trên ảnh mẫu 3D chậu hoa hồng nhụy vàng mặt cười do người dùng cung cấp (`media_1793989382643_6d98f640.jpg`), chia thành **2 mảnh ghép ở chế độ Khó (`tier: 'hard'`)**:

1. **Mảnh 1 — `Bông hoa gấp đôi` (`flower_bloom`, index `10`):**
   - `tier: 'hard'`, `winThreshold: 0.94` (`94%`), độ khớp khởi đầu `startIoU = 44.3%`.
   - Cơ chế **Gấp đôi vải (`fold: { solX: 0.50, startX: 0.35, chains: [[0, 9]] }`)**:
     - Gồm **10 node loại `'c'` ở nửa trái** (`free: [1, 2, 4, 5, 6, 7, 8]` — 7 node kéo tự do + kéo thanh trượt cây kim từ `0.35` về `0.50`; `locked: [0, 3, 9]` — khóa 2 khe cánh trên/dưới nằm trên mép gấp và 1 khe cánh trên-trái làm mốc).
     - Đặt 2 khe cánh (`0: [0.50, 0.22]` và `9: [0.50, 0.78]`) nằm trên trục gấp `x = 0.50` và mỗi cánh hoa dùng **cặp 2 node `'c'`** ở vòm ngoài (`r = 0.43`) để khi mở vải ra (`unfold`), đường cong Catmull-Rom bung thành **6 cánh hoa mập tròn, khít nhau, không bị vết lõm chữ V trên mép gấp**.
2. **Mảnh 2 — `Đôi lá đối xứng` (`flower_leaves`, index `11`):**
   - `tier: 'hard'`, `winThreshold: 0.92` (`92%`), độ khớp khởi đầu `startIoU = 37.6%`.
   - **Bỏ mép gấp (`fold`), thiết kế theo cơ chế kéo chéo hình số 8 (`∞`):**
     - Gồm **6 node tròn `'c'` toàn bộ kéo tự do (`free: [0, 1, 2, 3, 4, 5]`, `locked: []`)**.
     - Ban đầu 6 node xếp thành một vòng bầu dục đơn không tự cắt (`0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0`). Để thắt nút chính giữa thành 2 chiếc lá đối xứng, người chơi phải **kéo vặn chéo các node qua nhau như hình số 8** (`0: [0.08, 0.50]` → `1: [0.29, 0.34]` → chéo qua tâm xuống `2: [0.69, 0.66]` → `3: [0.90, 0.50]` → `4: [0.69, 0.34]` → chéo qua tâm xuống `5: [0.29, 0.66]`).
3. **Mảnh 3 — `Chậu hoa` (`flower_pot`, index `12`):**
   - `tier: 'hard'`, `winThreshold: 0.95` (`95%`).
   - Họa tiết: `pattern: { kind: 'rib', base: '#F28A62', deep: '#DF7148', accent: '#FAD0BC' }` (màu cam đất nung terracotta).
   - Cấu trúc node: **8 node kết hợp `'s'` và `'c'`** (`types: ['s', 's', 's', 's', 'c', 'c', 's', 's']`, `free: [1, 2, 4, 5, 6, 7]` — 6 node kéo; `locked: [0, 3]` — 2 node khóa).
4. **Cấu hình ghép & trang trí Màn 5 (`PRODUCTS` & `DECOR.flowerpot`):**
   - `levels: [10, 11, 12], order: [11, 12, 10], seams: [[11, 0, 0], [12, 0, 2], [10, 0, 0]]`
   - `place: { 10: [98, 224, 194], 11: [99, 326, 192], 12: [115, 404, 160] }` — Nằm gọn 100% trong vòng chỉ khâu của tấm vải nền nỉ tròn.
   - `DECOR.flowerpot`: Gồm 5 bước vẽ hoàn thiện (`flowerStemAndRim`: đường ngấn dưới vành chậu + cuống hoa xanh lá nối từ khe dưới bông hoa xuống miệng chậu; `flowerLeaf`: đôi lá xanh mướt có gân lá xoè hai bên miệng chậu; `flowerCenterDisc`: 6 đường khía chia cánh hoa + nhụy tròn vàng cam nổi khối 3D; `flowerFaceFeatures`: đôi mắt đen láy có đốm sáng + lông mày + má hồng + miệng cười há nhẹ có lưỡi hồng giống ảnh mẫu).


---

## 6. 🧪 Phần Mở Rộng Đang Trong Quá Trình Xem Xét: Hệ Thống Chốt Trên Viền Mẫu & Cân Bằng Tỷ Lệ Khớp (Experimental Extension Under Review)

> **Ghi chú tiến độ**: Tính năng này hiện đã được triển khai, kiểm thử hoàn tất và chạy thực nghiệm trên bản song song **`Prototype/web-v3`** (xác minh qua `node Prototype/web-v3/smoke.js` và `scratch/verify_pin_mechanic.js` đạt 100% qua 13 màn chơi). Được lưu trữ tại đây dưới dạng phần mở rộng đang trong quá trình đánh giá và xem xét trước khi hợp nhất chính thức vào `web-v2`.

### 6.1. Bối cảnh & Mục tiêu Thiết kế
1. **Vấn đề giải quyết**:
   - Trước đây người chơi di chuyển node và uốn cong dây một cách tương đối ngẫu hứng trên nền canvas. Dù tự do, người chơi đôi khi khó định hình được node này nên đặt vào mốc nào cụ thể trên viền hình mẫu, hoặc kéo node trượt dọc viền liên tục mà không có điểm dừng thỏa mãn.
2. **Ý tưởng giải pháp**:
   - Tạo các **Chốt trên viền hình mẫu (Target Pins on Outline)** tương ứng với các vị trí mốc cấu trúc của hình mẫu (`lv.sol`).
   - **Số lượng chốt bằng đúng số node cần xếp** ($N_{\text{pins}} = N_{\text{nodes}}$), **tuyệt đối không dùng chốt mồi (decoy pins)**.
   - Node di chuyển hoàn toàn tự do khắp canvas, không bị khóa cứng màu hay thứ tự; người chơi có thể lấp bất kỳ node nào vào bất kỳ chốt nào.
   - Vòng lặp giải đố trở nên rõ ràng, mang tính chiến thuật cao: **Kéo đúng vị trí node vào chốt $\to$ Kéo đường cong đúng hướng viền mẫu**.

---

### 6.2. Chi tiết Cơ chế & Cảm giác Chơi (Mechanics & Feelings)

1. **Tạo hình Chốt Thêu Dấu `×` Vàng Bơ Mật Ong (`Warm Honey Butter Cross-Stitch Marker`)**:
   - Đổi hoàn toàn từ dạng "lỗ đục tối" sang **Mũi thêu chữ thập đánh dấu (dấu `×`)** may đo thủ công trên đệm vải nỉ kem bơ ngọt ngào, loại bỏ 100% cảm giác vải bị bẩn hay thủng lỗ:
     - **Vòng đệm kem bơ sáng**: Vòng đệm tròn bằng vải kem bơ mềm mịn (`#FFF2CF`, $r = 6.8\text{ px}$) viền vàng bơ mật ong `#DFB15B` và viền chỉ dệt mảnh `#A87A2C`. Tông màu kem bơ sáng ngọt ngào nổi bật tự nhiên và sạch sẽ trên nền vải nỉ hồng phấn `#F3DED6`.
     - **Mũi thêu chữ thập dấu `×`**: Hai đường chỉ chéo đan qua tâm ($arm = 3.6\text{ px}$, `lineCap = 'round'`) bằng **màu nâu hổ phách mật ong nhạt (`#C88E3E`)** kèm lớp chỉ highlight vàng bơ sáng (`#FFF8E8`), tạo cảm giác mũi khâu nổi 3D tinh xảo của thợ may đánh dấu vị trí.
     - **Hạt thêu con bọ (French Knot)**: Một hạt nút chỉ vàng mật ong nhỏ tại tâm giao thoa của dấu `×` ($r = 1.4\text{ px}$, `#DFB15B` viền `#A87A2C`).
     - **Chốt đã lấp đầy**: Khi ghim tròn đáp vào chốt, vòng đệm chuyển sang viền xanh xô thơm mềm mại (`C.sageDeep = #82A57C`) ôm khít chân ghim tròn, dấu `×` thu nhỏ thanh nhã bên dưới.
   - Ở màn gấp đôi vải (`fold`), các chốt ở nửa đối xứng được phản chiếu đối xứng qua mép gấp với bóng mờ dấu `×` kem bơ để người chơi dễ hình dung toàn bộ phom dáng.

2. **Cơ chế Gợi Ý Sóng Xung khi Người Chơi Không Thao Tác (`Idle Pin Hint Pulse`)**:
   - Nếu người chơi dừng thao tác trong một khoảng thời gian (> `2.8s`) trong khi chơi mà vẫn còn chốt chưa được lấp:
     - **Toàn bộ các ô chốt trống sẽ tự động phát sóng xung nhấp nháy lan tỏa từ tâm ($r = 6.5 \to 30\text{ px}$)** theo chu kỳ thở nhịp nhàng `1.4s` với dải màu ấm vàng mật ong và kem sáng (`#FFD269` / `#FFF8E8`).
     - Tâm chốt có quầng sáng thở ấm áp (`#D89838`) co giãn nhẹ nhàng, nhắc nhở tinh tế người chơi rằng vẫn còn ô chốt trống cần đưa node vào.
     - Ngay khi người chơi chạm tay vào màn hình (`pointerdown`, `pointermove`), sóng gợi ý lập tức biến mất để trả lại sự tập trung cho người chơi.

3. **Hiệu ứng Sóng tỏa & Quầng sáng khi Kéo Node (`Dragging Guide Ripples`)**:
   - Khi người chơi nắm kéo một node (`S.drag` kích hoạt): **Toàn bộ các chốt chưa được lấp (`!pinFilled`) sẽ tự động sáng lên và phát ra các vòng sóng lan tỏa màu vàng kem sáng (`#FFE7A8` / `#FFF7E8`) tần số cao bám theo ngón tay**.
   - Đóng vai trò như ngọn hải đăng trực quan dẫn dắt ngón tay người chơi đưa node về đúng đích. Khi node vừa cắm vào chốt, chốt đó lập tức tắt sóng tỏa để giảm nhiễu thị giác.

4. **Từ tính Hút Nhẹ & Snap Chốt Thỏa Mãn (`Pin Magnetism & Snap`)**:
   - Trong bán kính hút `PIN_MAG_R = 0.048` (~$17.4\text{ px}$), node bị hút êm ái về tâm chốt gần nhất chưa bị chiếm đóng (`MAG_PULL = 0.5`).
   - Khi vào vùng hút: phát âm thanh trầm ấm dịu tai `softTone(pentaF(2, -1))` kèm rung xúc giác nhẹ `vib(4)`.
   - Khi người chơi thả tay gần chốt: node tự động trượt mượt mà (`S.settle`) cắm đúng vào tâm chốt, phát sóng tròn vàng mù tạt (`C.mustard`) và âm thanh gõ nhẹ thỏa mãn.

5. **Bảo toàn Thanh Đo % Độ Khớp & Bổ sung Bộ Đếm Chốt Trực Quan (`Live Pin Counter`)**:
   - Giữ nguyên thanh đo `% Độ khớp` (`Độ khớp`).
   - Bổ sung bộ đếm chốt trực quan trên thẻ thông tin: `Chốt: X/Y` (ví dụ `Chốt: 3/4`, khi đủ `4/4` chuyển sang màu xanh `C.sageDeep`), giúp người chơi không bao giờ hoang mang vì sao hình gần kín mà chưa thắng.

6. **Điều kiện Thắng Kép & Cân Bằng Thuật Toán % Khớp (`Balanced Curve Penalty`)**:
   - **Điều kiện thắng kép (`canWin`)**:
     $$\text{canWin} = (\text{IoU} \ge \text{winThreshold}) \;\land\; (\text{allPinsFilled} === \text{true})$$
   - Chỉ lấp đủ chốt **chưa đủ để thắng**. Với các hình có đường cong (`bendFree`), nếu người chơi chỉ mới kéo các node vào chốt mà chưa uốn cong dây, thuật toán trừ điểm đường cong cân bằng (`bendPenalty`) sẽ giữ mức độ khớp trong khoảng **$63.1\% – 88.0\%$** (luôn thấp hơn ngưỡng thắng $92\% – 95\%$).
   - Người chơi bắt buộc phải thực hiện thao tác kéo uốn cong các cạnh dây cho khớp viền mẫu thì điểm độ khớp mới vượt qua ngưỡng thắng `winThreshold`, tạo nên chuỗi giải đố đa tầng rất thỏa mãn: **Định hình khung chốt trước $\to$ Uốn nắn đường cong sau**.

---

7. **Hệ Thống Gợi Ý Thị Giác Đa Tầng Cho Đường Chỉ Cong (`Enhanced 3-Tier Visual Curve Guidance`)**:
   - **Vấn đề thực tế (UX Dilemma)**: Khi cắm đủ toàn bộ chốt ($N/N$), các node đã nằm đúng vị trí nhưng sợi chỉ giữa hai chốt vẫn đang là đoạn thẳng, trong khi viền mẫu nét đứt lại là cánh cung cong. Người chơi nhìn qua tưởng chừng đã thành hình nên dễ rơi vào tâm lý: *"Ủa sao chốt đủ hết rồi mà chưa thắng? Game có bị kẹt không?"*. Vùng kem bơ mờ đơn thuần nếu đứng một mình trên nền vải hoa văn sáng màu rất dễ bị chìm và thiếu đi "điểm bấu víu" (Affordance) để người chơi biết cần chạm vào đâu.
   - **Hệ thống phân cấp thị giác 3 tầng hoàn chỉnh ($100\%$ không chữ, chuẩn theme may vá thủ công)**:
     - **Tầng 1 (Macro — Nhận diện toàn cảnh): Vầng Hào Quang Tơ Tằm Óng Ánh (`Silk Sheen Halo`)**:
       - Bao bọc toàn bộ đoạn chỉ thẳng cần uốn bằng một dải hào quang óng ả màu vàng bơ mật ong mềm mại (`#FFD269` $\to$ `#FFF8E8`, bề rộng $12\text{ px}$ mờ bên ngoài và $6\text{ px}$ óng ánh bên trong, $\alpha = 0.26 \leftrightarrow 0.44$).
       - Giúp mắt người chơi từ góc nhìn bao quát toàn màn hình lập tức nhận ra ngay sợi dây nào đang cần xử lý, nổi bật 3D tách biệt hoàn toàn khỏi các cạnh viền tĩnh khác trên nền vải nỉ.
     - **Tầng 2 (Micro — Điểm bấu víu tương tác): Nút Bọ Thêu Cúc Len (`Embroidered Pinch Bead Handle`)**:
       - Ngay tại trung điểm của sợi chỉ phát sáng, xuất hiện một **chiếc nút cúc len thêu may đo thủ công tròn nhỏ xinh xắn** ($r = 5.2 \to 6.0\text{ px}$ phập phồng nhẹ nhàng):
         - Đệm khuy bằng vải nỉ kem bơ mềm (`#FFF2CF`) viền vàng bơ mật ong `#DFB15B`.
         - Viền chỉ may dệt mảnh màu nâu dệt `#A87A2C` kèm hai mắt khuy chỉ thêu mini `#4A3B35` và hạt highlight lấp lánh tâm `#FFF8E8`.
         - Quầng thở phát sáng tròn lan nhẹ quanh cúc (`#FFD269`).
       - Trả lời trực quan câu hỏi: *"Chạm ngón tay vào đâu?"* (Affordance). Người chơi có một "tay cầm cúc áo" rõ rệt để bấu ngón tay vào kéo. Khi người chơi chạm kéo, nút bọ thêu bám sát đầu ngón tay uốn cong sợi dây theo thời gian thực.
     - **Tầng 3 (Action — Dẫn đường hành động): Sóng Vòng Cung Dập Dờn (`Directional Stitch Ripples`)**:
       - Từ nút cúc len trên thân dây, từng đợt **vòng cung nét đứt màu vàng bơ mật (`#FFD269`, dash: `[4, 4]`)** khẽ dập dờn trôi nhẹ từ thân dây thẳng sang phía cung viền mẫu rồi tan biến vào viền ngoài (2 làn sóng luân phiên, chu kỳ `1.2s`).
       - Nhờ nguyên lý phát hiện chuyển động tự nhiên (motion detection), người chơi nhận biết ngay hướng kéo phồng ra ngoài (hoặc kéo cong vào trong) mà không cần bất kỳ mũi tên công nghiệp thô cứng nào.
     - **Tầng Nền: Mảng Khuyết Trăng Khuyết Phát Sáng Thở (`Breathing Crescent Gap Base`)**:
       - Mảng diện tích hình trăng khuyết khép kín giữa sợi dây và viền mẫu được phủ màu kem bơ mềm (`#FFF2CF`, $\alpha = 0.28 \leftrightarrow 0.50$) viền mật ong nhạt `#DFB15B`, tạo phông nền sáng đệm ấm áp để cúc len và các làn sóng vòng cung nổi bật tối đa.
     - **Sợi Chỉ Nhịp Thở Đàn Hồi (`Yarn Elastic Breathing Pluck`)**:
       - Khi người chơi dừng tay suy nghĩ $> 1.8\text{s}$, sợi dây thẳng khẽ dập dềnh một nhịp sóng đàn hồi rất nhẹ ($\sim 1.5\text{ px}$) hướng về phía viền mẫu, tăng thêm xúc cảm len thun mềm mại cho game.

---

### 6.3. Bảng Dữ liệu Đánh giá Độ Khớp & Chuẩn Hóa Ngưỡng Thắng Theo Phân Tầng Độ Khó (Tier 94% · 95% · 96%)

> **Chuẩn hóa Ngưỡng thắng theo Tier (Phương án 1 chốt 2026-11-07)**:
> - **Tier Easy (Viên kem, Ốc quế, Trái tim gấp, Tim khoét lỗ)**: Đặt đồng bộ **`94.0%`** (dung sai $6\%$, bao dung và dễ tiếp cận cho người mới bắt đầu).
> - **Tier Medium (Cardigan, Áo lót, Cổ áo, Đôi tai thỏ, Mặt thỏ, Chiếc nơ)**: Đặt đồng bộ **`95.0%`** (dung sai $5\%$, ngăn chặn việc uốn viền nửa vời).
> - **Tier Hard (Bông hoa gấp, Đôi lá số 8, Chậu hoa)**: Đặt đồng bộ **`96.0%`** (dung sai $4\%$, yêu cầu sự nắn nót, khéo léo tối đa của thợ may lành nghề).
>
> **Tuần tự hóa trạng thái gợi ý (State Sequencing — Chỉ gợi ý sau khi buông tay cắm chốt cuối)**:
> - Khi người chơi đang nắm giữ bất kỳ node nào (`S.drag !== null`) hoặc node đang trượt vào chốt (`S.settle !== null`), toàn bộ gợi ý uốn đường cong **hoàn toàn ẩn đi** để người chơi tập trung 00\%$ vào việc đặt chốt.
> - Sau khi buông tay (`pointerup`) và node đã cắm khít vào chốt cuối cùng, hệ thống giữ một **nhịp dừng xúc giác êm dịu 0.25s** để âm thanh chốt (`pop/thock`) và viền xanh sage kích hoạt trọn vẹn, sau đó vầng hào quang tơ tằm và cúc len mới nhẹ nhàng nở sáng (`fadeIn 0.4s`).

| STT | Màn chơi (`id`) | Phân loại (`tier`) | Tổng số Chốt | Cạnh cần uốn (`bendFree`) | % Khớp khi mới vào chốt (chưa uốn cong) | Ngưỡng thắng mới (`winThreshold`) | % Khớp khi hoàn tất | Đánh giá |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 0 | `scoop` (Viên kem) | Easy | 7/7 | `[2]` | **75.5%** | **94.0%** | 100.0% | ✅ Bắt buộc uốn vòm kem mới thắng |
| 1 | `cone` (Ốc quế) | Easy | 3/3 | `[]` | **100.0%** | **94.0%** | 100.0% | ✅ Hình đa giác thẳng, vào chốt là thắng |
| 2 | `cardigan` (Thân áo) | Medium | 10/10 | `[4]` | **77.7%** | **95.0%** | 100.0% | ✅ Bắt buộc uốn vạt áo mới thắng |
| 3 | `shirt` (Áo lót trong) | Medium | 6/6 | `[3, 4]` | **77.1%** | **95.0%** | 100.0% | ✅ Bắt buộc uốn cổ trong mới thắng |
| 4 | `collar` (Cổ áo) | Medium | 6/6 | `[]` | **100.0%** | **95.0%** | 100.0% | ✅ Hình đa giác thẳng, vào chốt là thắng |
| 5 | `heart` (Trái tim gấp) | Easy | 4/4 | `[1]` | **74.9%** | **94.0%** | 100.0% | ✅ Bắt buộc uốn bầu tim mới thắng |
| 6 | `heartHole` (Tim khoét lỗ) | Easy | 8/8 | `[5]` | **76.0%** | **94.0%** | 100.0% | ✅ Bắt buộc uốn lỗ khoét mới thắng |
| 7 | `bunny_ears` (Đôi tai thỏ) | Medium | 11/11 | `[2, 7]` | **68.7%** | **95.0%** | 100.0% | ✅ Bắt buộc uốn chóp tai mới thắng |
| 8 | `bunny_head` (Mặt thỏ) | Medium | 10/10 | `[4, 7]` | **83.2%** | **95.0%** | 100.0% | ✅ Bắt buộc uốn đôi má mới thắng |
| 9 | `bunny_bow` (Chiếc nơ) | Medium | 6/6 | `[2, 5]` | **64.6%** | **95.0%** | 100.0% | ✅ Bắt buộc uốn cánh nơ mới thắng |
| 10 | `flower_bloom` (Bông hoa) | Hard | 10/10 | `[1, 4]` | **81.5%** | **96.0%** | 100.0% | ✅ Bắt buộc uốn cánh hoa mới thắng |
| 11 | `flower_leaves` (Đôi lá số 8) | Hard | 6/6 | `[0, 2, 3, 5]` | **58.7%** | **96.0%** | 100.0% | ✅ Bắt buộc uốn 4 bầu lá mới thắng |
| 12 | `flower_pot` (Chậu hoa) | Hard | 8/8 | `[4]` | **77.4%** | **96.0%** | 100.0% | ✅ Bắt buộc uốn đáy chậu mới thắng |

---

### 6.4. Nâng Cấp Feeling Thỏa Mãn Khi Khớp Viền Cong (Curve Snap Feeling) & Âm Thanh Chốt Gỗ/Cúc Áo (Pin Snap Audio)

> **Mục tiêu**:
> 1. **Curve Snap Feeling**: Tạo cảm xúc thỏa mãn, đầm tay và sướng mắt khi sợi chỉ uốn đạt ngưỡng từ tính và giật khít vào viền mẫu, biến thao tác kéo cong từ một tương tác đồ họa đơn thuần thành trải nghiệm rút chỉ may đo thủ công chân thực.
> 2. **Pin Snap Audio**: Khắc phục triệt để vấn đề âm thanh cắm chốt cũ bị quá trầm, đục và hầu như không nghe rõ trên loa điện thoại/laptop ($130\text{Hz} - 260\text{Hz}$), thay thế bằng chất âm chốt gỗ / cúc áo ấm áp, đanh gọn, trong trẻo ở dải tần vàng ($523\text{Hz} - 880\text{Hz}$) với thang âm ngũ cung tiến trình.

#### 1. Hệ thống 4 Lớp Hiệu Ứng Thỏa Mãn Khi Khớp Đường Cong (Curve Snap Juice)
- **Lớp 1 (Visual Seam Zip Flash — Tia viền chỉ may lóe sáng)**:
  - Khi cạnh đạt vùng hút từ tính (`inMag`) hoặc buông tay trượt vào viền (`edgeSettle`): Một tia sáng tơ tằm vàng mật ong rực rỡ (`#FFF8E8` lõi chỉ thêu, `#FFD269` quầng sáng $7.5\text{px}$) zipp từ điểm chạm tay tỏa nhanh ra hai đầu chốt trong $0.32\text{s}$.
  - Tại 2 đầu mép sóng chạy có 2 hạt kim cương lóe sáng phản chiếu ánh tơ, tạo cảm giác sợi chỉ may vừa được ghim dập chắc chắn vào rãnh thêu.
- **Lớp 2 (Micro Elastic Bounce — Độ nảy đàn hồi vi mô)**:
  - Khi khớp vào rãnh viền, sợi chỉ không dừng lại một cách cứng nhắc như robot mà dao động nảy vi mô theo sóng cơ học tắt dần:
    $$\Delta h = \sin(t \times 52) \times \exp(-t \times 15) \times 2.2\text{ px}$$
  - Sóng dao động chỉ uốn ở phần thân giữa và triệt tiêu hoàn toàn tại hai đầu chốt (nhờ hàm envelope $\sin(\pi u)$), mang lại cảm giác dây thun/chỉ len căng nảy chân thực.
- **Lớp 3 (Yarn Dust Puff — Bụi tơ tằm li ti)**:
  - Khi viền khớp, 5 hạt bụi bông tơ tằm (`kind: 'lint'`, palette ấm: `#FFD269`, `#FFF8E8`, `#DFB15B`, `#F7E6DF`) bung nhẹ và trôi dạt ra từ thân dây, mô phỏng bụi xơ len bay nhẹ khi sợi chỉ được miết căng.
- **Lớp 4 (Silky Cinch Sound & Dual Haptics — Âm thanh rút chỉ vải & Rung kép)**:
  - Âm thanh kết hợp giữa tiếng sợi chỉ miết qua sớ vải (`sweep` dải thông $1300\text{Hz} \to 3200\text{Hz}$) và tiếng gảy dây nốt Sol 5 ($784\text{Hz}$) trong veo trên đàn Kalimba.
  - Phản hồi rung haptic kép đanh gọn `vib([6, 12, 8])` tạo lực giật nhẹ ở đầu ngón tay.

#### 2. Nâng Cấp Toàn Diện Âm Thanh Chốt Gỗ/Cúc Áo (Cozy Wooden Button Pin Audio)
- **Khắc phục dải tần trầm**: Chuyển toàn bộ tần số cơ bản từ dải trầm $130\text{Hz} - 260\text{Hz}$ lên dải tần vàng tai người $523\text{Hz} - 880\text{Hz}$ (quãng tám Đô 5 đến La 5), giúp âm thanh nghe to, rõ và sáng trên mọi loại loa điện thoại hoặc laptop mà không cần chỉnh âm lượng máy tối đa.
- **Xung kích tiếp xúc (Transient Contact Click)**:
  - Thêm một micro-burst nhiễu lọc dải thông $2500\text{Hz}$ ($Q = 3.2$, dài $16\text{ms}$) mô phỏng tiếng va chạm đanh gọn "tách" của cúc gỗ khi lọt vào rãnh chốt.
- **Thân âm Mộc Cầm / Kalimba ấm áp**:
  - Sóng sine trượt nhẹ $18\%$ từ trên xuống trong $12\text{ms}$ ($f \times 1.18 \to f$) kết hợp sóng triangle ở quãng tám phụ trợ, tạo cảm giác chiếc chốt gỗ cắm ngập chắc nịch vào tấm nỉ bông.
- **Thang âm ngũ cung tiến trình (Ascending Pentatonic Progression)**:
  - Khi người chơi cắm từng chốt vào vị trí, cao độ nốt nhạc leo dần theo thang ngũ cung:
    - *Chốt 1*: Đô 5 ($523.3\text{Hz}$)
    - *Chốt 2*: Rê 5 ($587.3\text{Hz}$)
    - *Chốt 3*: Mi 5 ($659.3\text{Hz}$)
    - *Chốt 4*: Sol 5 ($784.0\text{Hz}$)
    - *Chốt 5 / Chốt cuối*: La 5 ($880.0\text{Hz}$) kèm hòa âm quãng 5 vang ngân chúc mừng ($f \times 1.5$).
  - Tạo cảm giác tiến bộ rõ rệt và thôi thúc người chơi tiếp tục cắm nốt các chốt còn lại.
- **Âm thanh hút từ tính khi rê chốt (`pinHoverSound`)**:
  - Khi rê node quét qua vùng hút từ tính của một chốt trống, phát tiếng gõ siêu nhẹ $10\text{ms}$ ($2600\text{Hz}$) kèm rung `vib(5)`, phản hồi xúc giác ngay lập tức trước khi thả tay.
- **Phân biệt rõ ràng giữa Thả vào chốt vs Thả vào khoảng trống**:
  - Thả vào chốt: Kích hoạt `pinSnapSound` đanh ấm + rung kép `vib([8, 14, 10])`.
  - Thả vào khoảng trống nỉ: Kích hoạt tiếng rơi êm nhẹ mộc mạc `pop(..., 0.07)` trên vải + rung nhẹ `vib(5)`.

#### 3. Tinh Chỉnh Xúc Giác & Thời Điểm Phát Âm Đường Cong (Drag vs Snap Separation)
- **Tách bạch quá trình Kéo (Drag) vs Khoảnh khắc Buông tay Khóa (Release Snap)**:
  - *Khi đang kéo đến mép viền*: Giữ tĩnh lặng và êm ái, chỉ có lực hút từ tính trực quan kéo sợi dây bám khuôn (`magH = solH`) kèm rung siêu nhẹ `vib(3)`, hoàn toàn **không phát âm thanh trước**.
  - *Khi buông tay khớp vào viền*: Đây mới là thời khắc xả lực đàn hồi (Tension $\to$ Release), toàn bộ chuỗi hiệu ứng (Âm thanh rút chỉ vải `sweep` + Gảy đàn Kalimba Sol 5 + Tia hào quang chỉ thêu vàng `Seam Zip Flash` + Độ nảy đàn hồi vi mô + Bụi tơ tằm) bùng nổ cùng lúc, tạo cảm giác thỏa mãn dứt khoát và đắt giá.

---

### 6.5. Phản Hồi Nhịp Bồi Khi Cắm Chốt Nối Liền Dây Viền (Chained Edge Snap) & Chặn Gợi Ý Đường Chỉ Cong Khi Cắm Sai Chốt

> **Cập nhật ngày 2026-11-07 theo phản hồi & ý tưởng người chơi**:
> 1. **Chained Edge Snap (Nhịp bồi liên hoàn)**: Khi cắm một chốt xuống (`pinSnapSound`), nếu đoạn dây nối với chốt đó và một chốt láng giềng đã hoàn tất và khớp đúng đường viền mẫu, hệ thống sẽ kích hoạt phản hồi bồi trễ nhẹ $50\text{ms}$ (Âm thanh rút chỉ vải `sweep` êm dịu + Tia viền chỉ thêu vàng `Seam Zip Flash` lướt dọc theo đoạn dây + Độ nảy đàn hồi vi mô).
> 2. **Chặn hiển thị gợi ý uốn cong khi hình cắm chốt đang sai**: Khắc phục triệt để lỗi khi người chơi cắm đủ toàn bộ chốt nhưng cắm lộn xộn/sai vị trí các node (tạo thành hình rối rắm) mà hệ thống vẫn hiển thị mảng khuyết và cúc len gợi ý uốn cong. Gợi ý chỉ xuất hiện khi **toàn bộ các chốt đã được cắm CHÍNH XÁC vào vị trí tương ứng của hình giải**.

#### 1. Cơ Chế Nhịp Bồi Dây Khép Kín (Staggered Chained Edge Snap - Trễ 50ms)
- **Thuật toán nhận diện đoạn viền vừa hoàn tất (`checkChainedEdgeSnaps(nodeIdx)`)**:
  - Khi node $i$ vừa cắm vào chốt mục tiêu, quét 2 cạnh kề với node $i$ trong chu trình `ring`.
  - Nếu đầu mút láng giềng $oth$ cũng **đã nằm đúng chốt mục tiêu** và độ cong của đoạn dây đã khớp với viền mẫu ($|\text{curH} - \text{solH}| < 0.025$): Đoạn dây này chính thức được xác nhận là vừa hoàn thành.
- **Phối âm nhịp đôi không đè âm (Micro-Arpeggio)**:
  - $t = 0\text{ms}$: Tiếng chốt gỗ cắm chắc nịch (`pinSnapSound` âm lượng $0.18$) + Rung `vib([8, 14, 10])`.
  - $t = 50\text{ms}$: Tiếng rút chỉ vải êm dịu (`sweep` $1400\text{Hz} \to 3000\text{Hz}$, âm lượng thanh thoát $0.05$) + Nốt Kalimba bồi nhẹ (`pentaF(step + 1, 0)`) + Tia sáng tơ tằm vàng `Seam Zip Flash` lướt dọc theo đoạn dây vừa hoàn thành.
  - Mang lại cảm giác bàn tay may đo thực sự: Cắm chiếc ghim xuống thì sợi dây giật căng vào rãnh thêu!

#### 2. Chặn Gợi Ý Khi Cắm Chốt Sai Vị Trí (`areAllPinsInCorrectPosition`)
- **Nguyên nhân lỗi cũ**: Trước đây hàm gợi ý chỉ kiểm tra `pinSt.allFilled` (mọi chốt có người chiếm giữ). Nếu người chơi hoán đổi các node lung tung tạo thành hình chéo/xoắn sai, `allFilled` vẫn là `true`, dẫn đến việc game hiển thị mảng khuyết và cúc len trên một hình đa giác méo mó.
- **Giải pháp chuẩn hóa**:
  - Bổ sung hàm kiểm tra nghiêm ngặt `areAllPinsInCorrectPosition(def, pos)`: Bắt buộc từng node $i$ phải nằm trong bán kính hút của đúng chốt `def.sol[i]` (và kim gấp vải đúng vị trí nếu là màn có gấp đôi).
  - Cả 2 tầng gợi ý (`drawBreathingCrescentGaps` và `drawPinchBeads`) cùng sóng nhịp thở dây thẳng (`swayedRingPath`) đều bị chặn $100\%$ nếu hình cắm chốt đang sai.
  - Người chơi sẽ không còn bị phân tâm hay hoang mang bởi gợi ý uốn cong khi vị trí các chốt chưa chuẩn xác.

---

### 6.6. Bừng Sáng Hào Quang Toàn Bộ Chu Trình Sợi Chỉ Khi Đạt Ngưỡng Thắng (Full-Contour Golden Silk Ready Glow)

> **Mục tiêu**: Bổ sung mảnh ghép thị giác đỉnh cao vào thời khắc đạt điều kiện thắng (`rdy = true` và `pinSt.allFilled`), giúp người chơi không cần rời mắt lên thanh % trên đỉnh màn hình mà cảm nhận được $100\%$ ngay dưới đầu ngón tay rằng tác phẩm đã hoàn thành hoàn hảo, sẵn sàng buông tay để kích hoạt chiến thắng.

#### 1. Cơ Chế Phát Sáng Trực Tiếp Dưới Tay (Không Cần Chờ Thả Tay)
- **Khoảnh khắc kích hoạt tức thì (`rdy && !S.ready`)**:
  - Khi ngón tay đang kéo node hoặc uốn cong dây vừa trượt vào đúng "điểm ngọt" đạt ngưỡng thắng:
    - **Xung sáng bùng nổ (Contour Surge Flash — 0.55s)**: Toàn bộ chu vi sợi chỉ (`S.path.pts`) lập tức bừng sáng một dải hào quang vàng mật ong rực rỡ (`#FFD269`, bề rộng $15\text{px}$) kèm lõi chỉ tơ tằm trắng ngà kem (`#FFFDF5`, bề rộng $4.6\text{px}$).
    - **4 đốm kim cương lấp lánh (Diamond Glints)** chạy lướt nhanh quanh toàn bộ chu vi sợi chỉ.
    - Kết hợp đồng thời cùng tiếng đàn Kalimba gảy đôi (`pluck`) và rung haptic kép `vib([10, 22, 10])`.
- **Hào quang thở duy trì khi ngón tay còn giữ (`S.ready === true`)**:
  - Trong lúc người chơi còn giữ ngón tay trong vùng đạt ngưỡng thắng: Toàn bộ sợi chỉ duy trì một quầng sáng tơ tằm vàng bơ óng ả thở nhẹ ($\alpha = 0.55 \leftrightarrow 0.75$, chu kỳ $\sim 0.9\text{s}$).
  - Tín hiệu thị giác rõ rệt: *"Thả tay ra là thắng ngay!"*.
- **Phản hồi khi trượt ra ngoài**:
  - Nếu ngón tay vô tình kéo lệch ra ngoài ngưỡng thắng, quầng sáng tự động tắt dịu đi ngay lập tức.
- **Hỗ trợ đồng bộ cả 2 nửa ở màn chơi gấp vải (`foldOf()`)**: Cả nửa chính và nửa soi gương đều phát sáng đối xứng rực rỡ.


---

### 6.7. Khắc Phục Lỗi Snap Đường Cong Lơ Lửng & Nâng Cấp Hào Quang Bảy Màu Cozy Lõi Trắng Sáng

> **Cập nhật ngày 2026-11-07 theo phản hồi & đánh giá của người chơi**:
> 1. **Khắc phục triệt để lỗi đường cong lơ lửng tự phát sáng snap**: Trước đây, khi kéo độ cong của một cạnh tới giá trị khớp mẫu `solBend`, hệ thống chỉ kiểm tra `magH !== null` mà không kiểm tra xem hai đầu mút của cạnh đó đã được cắm vào đúng chốt mục tiêu hay chưa. Điều này khiến cho một cạnh đang bay lơ lửng giữa không trung khi bị kéo cong đúng biên độ vẫn kích hoạt hiệu ứng snap và tia zip. Đã khắc phục triệt để bằng hàm `isEdgeAnchoredToPins(k)` đảm bảo cả hai đầu mút đã cắm chính xác vào chốt mục tiêu (`PIN_SNAP_R + 0.015`) trước khi kích hoạt `triggerCurveSnap`.
> 2. **Nâng cấp hào quang đạt ngưỡng thắng (Full-Contour Glow)**:
>    - **Dải hào quang bảy màu Cozy (Iridescent Cozy Rainbow Halo)**: Chuyển màu ombre đa sắc mềm mại 5 tông len tự nhiên qua `cozyThreadRGB` (Hồng đào ấm $\to$ Vàng bơ $\to$ Xanh xô thơm $\to$ Xanh lam khói $\to$ Tím cà oải hương). Hào quang rộng $10\text{px} - 16\text{px}$ trôi nhẹ nhàng theo thời gian.
>    - **Lõi tơ tằm trắng muốt sáng rực (Brilliant Pure White Silk Core)**: Lớp chỉ trắng tinh khiết (`#FFFFFF`, độ mờ $0.98$, bề rộng $3.6\text{px} - 5.0\text{px}$) được xếp lớp vẽ đè lên trên cùng của sợi chỉ vải (`drawEdges` $\to$ `drawReadyContourGlow`), tạo độ tương phản cao và độ chói sáng mãnh liệt tương tự tia chớp seam zip lúc khóa đường cong vào viền mẫu.
>    - **5 đốm kim cương lấp lánh (Diamond Glints)** chạy lướt trên đường chu vi trong nhịp bùng nổ $0.6\text{s}$ mở đầu.

#### 1. Kiểm Soát Chặt Chẽ Cơ Chế Snap Cạnh (`isEdgeAnchoredToPins`)
- **Điều kiện cần & đủ để phát hiệu ứng khóa viền (`isTrueContourSnap`)**:
  1. `isBendEdge`: Cạnh đó nằm trong danh sách uốn tự do (`lv.bendFree`) và có độ uốn thực tế ($|\text{solBend}| > 0.01$).
  2. `isSnappingToSol`: Giá trị hút nam châm trùng khít với độ cong của viền mẫu ($|\text{magH} - \text{solBend}| < 10^{-4}$).
  3. `isAnchored`: **Cả hai đầu mút của cạnh** (`r[k]` và `r[k+1]`) đều đang nằm gọn trong chốt mục tiêu tương ứng ($d \le \text{PIN_SNAP_R} + 0.015$).
- **Nếu cạnh chưa được cắm chốt (đang lơ lửng giữa không trung)**:
  - Khi buông tay, cạnh vẫn hồi tiếp mượt mà về vị trí cân bằng thông qua `edgeSettle`.
  - Phát âm rơi êm dịu vải mộc (`pop(..., 0.06)`) + rung nhẹ `vib(4)`.
  - **Tuyệt đối không phát ra tiếng rút chỉ căng sweep, không phát âm Kalimba và không phát tia chớp Seam Zip**.

#### 2. Cấu Trúc Đồ Họa 3 Lớp Của Hào Quang Toàn Thân (Cozy Rainbow + Pure White Core)
- **Tầng 1 - Rainbow Halo (Dưới cùng, bề rộng $10 - 16\text{px}$)**:
  - Sử dụng hàm `cozyThreadRGB(midD / total + drift, 1)` tính toán sắc thái len ấm tự nhiên dọc theo từng phân đoạn chu vi.
  - Tích hợp độ trôi thời gian $drift = t \times 0.12$ tạo cảm giác dải lụa phát sáng đang luân chuyển nhẹ nhàng như sóng cực quang mùa đông.
- **Tầng 2 - Sợi Chỉ Vải Nền (`drawEdges`)**:
  - Vẽ đường chỉ may chính gốc với độ mờ và texture sợi len.
- **Tầng 3 - Pure White Silk Core (Trên cùng, bề rộng $3.6 - 5.0\text{px}$)**:
  - Vẽ trực tiếp đè lên trên tim của sợi chỉ bằng sắc trắng tuyệt đối `rgba(255, 255, 255, 0.98)`.
  - Tạo nên độ "nổi khối" và ánh sáng trắng tinh khiết, mang lại cảm giác thấu suốt và rực sáng tức thì khi chạm ngưỡng chiến thắng.
- **Tầng 4 - Kim Cương Lướt Điệu Nghệ**:
  - 5 hạt sao kim cương 4 cánh (`gr = 4.5 - 6.5\text{px}`) lướt nhanh quanh chu vi sợi tơ trong $0.6\text{s}$ đầu tiên.

---

### 6.8. Tinh Chỉnh Độ Mảnh Hào Quang Bảy Màu & Hiệu Ứng Chớp Sáng Buông Tay Chiến Thắng (Victory Release Flash & Graceful Fade)

> **Cập nhật ngày 2026-11-07 theo phản hồi & đánh giá của người chơi**:
> 1. **Khôi phục độ dày thanh mảnh của tầng hào quang**: Theo góp ý từ người chơi, hào quang bảy màu ở bản trước bị nở ra quá dày ($12\text{px} - 16\text{px}$), làm lấn át nét hoa văn và mất đi tính tinh tế của đường may. Đã tinh chỉnh thu gọn lại về độ dày thanh thoát như cũ:
>    - Lúc giữ tay: `haloWidth` dao động nhẹ nhàng $6.6\text{px} - 8.6\text{px}$ (ôm nhẹ ra ngoài sợi chỉ vải $3.5\text{px}$).
>    - Lõi trắng muốt: `coreWidth = 2.8\text{px}` (bám sát đường tim chỉ).
>    - Lúc chớp sáng cực đại: `haloWidth = 11.2\text{px}`, `coreWidth = 3.6\text{px}$.
> 2. **Hiệu ứng Chớp Sáng Thả Tay Chiến Thắng & Vụt Tắt Mềm Mại (Victory Release Flash & Graceful Fade)**:
>    - **Hiện trạng trước đây**: Khi buông tay đạt chiến thắng, `isHoldingReady` thành `false`, hào quang biến mất đột ngột trong 0ms, sau đó cây kéo bay ra cắt ngay lập tức khiến nhịp chuyển cảnh bị giật cục.
>    - **Nhịp chuyển tiếp hoàn mỹ (480ms Transition)**:
>      - $t = 0 \to 80\text{ms}$ (Attack): Ngay khi buông ngón tay, toàn bộ viền hoa văn **chớp bùng sáng rực rỡ** một lần nữa (Lõi trắng chói lòa + Quầng bảy màu Cozy + 5 đốm sao kim cương).
>      - $t = 80\text{ms} \to 480\text{ms}$ (Decay): Ánh sáng dịu dần theo hàm mũ bậc hai $(1 - p)^2$ và vụt tắt hoàn toàn vào nền vải êm ái.
>      - $t \ge 480\text{ms}$: Khi ánh sáng đã hoàn toàn tĩnh lặng, cây kéo mới mượt mà xuất hiện và tiến hành nghi thức cắt may hoa văn (`cut`).

---

### 7. Nghiệm Thu & Phê Duyệt Toàn Diện (Final Approval & Synchronization)

> **Cập nhật ngày 2026-11-07 theo phê duyệt chính thức của người chơi**:
> Bản **Web-v3** đã hoàn thiện xuất sắc toàn bộ các mục tiêu thiết kế và cảm giác chơi (Game Feel). Người chơi đã nghiệm thu và duyệt toàn bộ hệ thống cơ chế:
> 1. **Uốn cong viền tự do (`bendFree`)**: Lực hút từ tính êm ái khi kéo viền, bùng nổ hiệu ứng thỏa mãn khi thả tay khớp mẫu (tiếng rút chỉ tơ tằm `sweep`, nốt Kalimba thanh thoát, tia sáng may `Seam Zip Flash`, nhịp nảy đàn hồi vi mô).
> 2. **Chặn gợi ý khi cắm sai chốt (`areAllPinsInCorrectPosition`)**: Ẩn hoàn toàn các đốm len và mảng khuyết gợi ý uốn cong nếu các chốt chưa được cắm đúng vị trí giải đố, loại bỏ triệt để nhầm lẫn cho người chơi.
> 3. **Nhịp bồi khi cắm chốt nối liền dây viền (`chainedEdgeSnaps`)**: Phát âm rút chỉ nhẹ và tia viền trễ $50\text{ms}$ sau tiếng cắm chốt chắc nịch.
> 4. **Khắc phục lỗi đường cong lơ lửng (`isEdgeAnchoredToPins`)**: Chỉ phát hiệu ứng snap viền khi cả hai đầu mút của cạnh đã được ghim chắc chắn vào chốt mục tiêu.
> 5. **Hào quang bảy màu Cozy lõi trắng sáng thanh mảnh**: Bề rộng quầng bảy màu ombre dịu dàng ($6.6\text{px} - 8.6\text{px}$), lõi tơ tằm trắng muốt ($2.8\text{px}$) bám sát sống lưng sợi chỉ, tôn trọn vẹn nét đẹp hoa văn.
> 6. **Chớp sáng buông tay chiến thắng & Vụt tắt mềm mại (Victory Release Flash & Graceful Fade - $480\text{ms}$)**: Bùng nổ chớp sáng ăn mừng rực rỡ khi nhấc ngón tay, dịu dần và tắt êm ái trước khi cây kéo xuất hiện bắt đầu nghi thức cắt may.
> 7. **Đồng bộ hóa tuyệt đối**: Cả 2 bản prototype `Prototype/web-v2/` và `Prototype/web-v3/` hiện tại đạt độ đồng nhất $100\%$ về mã nguồn, logic giải thuật, cấu hình ngưỡng và cảm giác chơi.

---

### 8. Nâng Cấp Hệ Thống Âm Thanh Loa Ngoài Di Động (Master Dynamics Compressor & SFX Gain Boost)

> **Cập nhật ngày 2026-11-07 theo phản hồi & trải nghiệm thực tế trên điện thoại**:
> Khi chạy trên loa ngoài điện thoại di động (công suất nhỏ 1-2W), các âm thanh chi tiết tinh tế (tiếng rút chỉ vải, nốt Kalimba, tiếng chốt gỗ) bị quá bé, người chơi phải bật $100\%$ âm lượng mới nghe được. Đã giải quyết triệt để và đồng bộ trên cả 2 bản `Prototype/web-v2/` và `Prototype/web-v3/`:
> 1. **Master Dynamics Compressor (`AC.createDynamicsCompressor`)**:
>    - Chèn bộ nén động học vào tầng Master trước đầu ra thiết bị (`master \to comp \to destination`).
>    - Thông số nén tối ưu: `threshold: -22dB`, `knee: 30dB`, `ratio: 4.0:1`, `attack: 3ms`, `release: 180ms`.
>    - Tự động kéo các chi tiết nhỏ lên rõ nét gấp $2.5 - 3$ lần, đồng thời làm phẳng đỉnh biên độ giúp triệt tiêu hoàn toàn nguy cơ rè, vỡ loa khi nhiều âm hòa quyện.
> 2. **Nâng Thang Âm Lượng Cơ Sở (SFX Gain Scaling)**:
>    - `pinSnapSound`: Tiếng gõ tiếp xúc transient nâng lên $0.32$, thân nốt mộc Kalimba nâng lên $0.38$, nốt hòa âm chúc mừng chốt cuối nâng lên $0.22$. Âm thanh cắm chốt đanh gọn, chắc nịch và thỏa mãn trên loa điện thoại.
>    - `sweep` (tiếng sợi chỉ tơ tằm miết vào vải): Nâng hệ số âm lượng $2.8\text{x}$ ($0.05 \to 0.14$).
>    - `pluck`, `pop`, `noise`, `softTone`: Nâng đồng bộ hệ số $2.2\text{x}$.
>    - `humUpdate`: Nâng biên độ cọ vải khi kéo dây lên $2.0\text{x}$.
> 3. **Kết quả trải nghiệm**:
>    - Người chơi chỉ cần để âm lượng điện thoại ở mức trung bình ($40\% - 50\%$) là âm thanh đã phát ra rõ ràng, đầm ấm, trong trẻo và giữ trọn vẹn chất mộc mạc của theme thủ công may vá.

---

### 9. Đột Phá Công Thái Học Di Động: Micro-Breathing Focus Lens (1.04x), Nhấc Bóng Vật Lý 3D & Touch Y-Offset ("Lifted Anchor")

> **Cập nhật ngày 2026-11-07 theo phê duyệt chính thức giải pháp Hướng 3**:
> Khi trải nghiệm game trên điện thoại di động, kích thước màn hình nhỏ và ngón tay cái to khiến việc thao tác kéo ghim / uốn dây dễ bị ngón tay che khuất (Touch Occlusion), đồng thời người chơi khó chiêm ngưỡng các hiệu ứng vi mô tinh tế.
> Ban đầu đề xuất zoom $1.25\text{x}$ kèm Camera Pan $\pm 42\text{px}$ bị người chơi phản hồi là **quá gắt, dễ gây choáng và khó chịu do thế giới trôi dạt**.
> Sau khi phân tích sâu về Game Feel & thị giác ngoại vi, giải pháp **Hướng 3: Micro-Breathing Focus Lens ($1.04\text{x}$) + Nhấc bóng vật lý 3D + Khóa cứng Pan = 0** đã được triển khai và người chơi **chính thức phê duyệt**:

```
                               ┌────────────────────────────────────────────────┐
                               │       CÔNG THÁI HỌC DI ĐỘNG (PORTRAIT)         │
                               └───────────────────────┬────────────────────────┘
                                                       │
         ┌─────────────────────────┬───────────────────┴───────────────┬────────────────────────┐
         ▼                         ▼                                   ▼                        ▼
┌──────────────────┐     ┌──────────────────┐               ┌──────────────────┐     ┌──────────────────┐
│  Touch Y-Offset  │     │  Micro-Breathing │               │ Nhấc Bóng 3D     │     │  Hitbox & Node   │
│ ("Lifted Anchor")│     │    Focus Lens    │               │  (Lifted Shadow) │     │ Visual Expansion │
│  Node nâng cao   │     │  1.0x ↔ 1.04x    │               │  Node nở +15%    │     │  R 10.5 → 13.5px │
│ 22px trên ngón   │     │  Pan = 0 (Tĩnh)  │               │  Bóng tách 6.5px │     │ Pick 0.088→0.22  │
└──────────────────┘     └──────────────────┘               └──────────────────┘     └──────────────────┘
```

#### 1. Trụ cột 1: Nâng Chốt Nổi Khỏi Đầu Ngón Tay (Touch Y-Offset – 22px)
- **Nguyên lý**: Ngón tay cái người chơi che khuất diện tích khoảng $30 - 45\text{px}$. Nếu node nằm chính xác dưới đầu ngón tay thì toàn bộ chốt mục tiêu, hoa văn và đường viền bên dưới sẽ bị che lấp.
- **Giải pháp chuyển tiếp êm ái (Smooth Ramp-up)**:
  - Khi mới chạm ngón tay (`dragDist = 0`): Độ dời bằng $0\text{px}$, node nằm đúng vị trí chạm ban đầu, **hoàn toàn không giật nảy**.
  - Khi ngón tay bắt đầu di chuyển vượt $14\text{px}$ (`dragDist / 14`): Độ dời nâng dần lên $-22\text{px}$ trên trục $Y$. Chốt tròn và đầu ghim nổi cao lên trên ngón tay khoảng $22\text{px}$ (vừa vặn nằm ngay phía trên đầu móng tay, không bị che khuất và không có cảm giác bay quá xa).
- **Đồng bộ vị trí logic & trực quan (Zero Dissonance)**:
  - Tọa độ logic cắm chốt và xét hút nam châm tính theo đúng vị trí hình ảnh nổi mà người chơi đang nhìn thấy. Bạn thấy node ở đâu thì thả tay chốt sẽ cắm chính xác tại đó!
  - Sợi chỉ nối ngón tay (`drawWire`): Nối sợi chỉ đứt nét mộc mạc từ điểm tiếp xúc ngón tay lên đầu chốt đang bay, tạo cảm giác như ngón tay đang cầm dây kéo một con rối mini thủ công cực kỳ thú vị.
  - Phân tách thiết bị thông minh: Chỉ kích hoạt Touch Y-Offset trên màn hình cảm ứng di động (`e.pointerType === 'touch'` hoặc `coarse pointer`). Khi thao tác bằng chuột trên máy tính, con trỏ chuột mũi tên siêu nhỏ vẫn giữ node ở đầu chuột tự nhiên, không bị nhảy.

#### 2. Trụ cột 2: Micro-Breathing Focus Lens ($1.04\text{x}$) & Khóa Cứng Pan = 0
- **Triệt tiêu hoàn toàn căn nguyên gây choáng**:
  - **Khóa cứng Camera Pan ($\text{Pan} = 0$)**: Màn hình đứng yên $100\%$, không trôi dạt sang trái/phải/lên/xuống theo ngón tay. Bạn giữ được một điểm tựa thị giác tuyệt đối tĩnh lặng.
  - **Biên độ vi mô $1.04\text{x}$ (chỉ $+4\%$)**: Trên khung vải $362\text{px}$, nó chỉ nở nhẹ ra đúng **$7\text{px}$ mỗi cạnh**. Mắt người nhìn vào không cảm nhận thấy màn hình bị phóng to giật cục, mà não bộ chỉ cảm nhận như **ống kính máy ảnh khẽ siết nét (focus breath)** một nhịp nhẹ nhàng.
  - Khi buông tay, khung tranh êm ả thở nhẹ về $1.0\text{x}$.
- **Nhịp thở êm ái**: Tốc độ lerp giảm từ $7.5 \to 3.5$, camera êm như một nhịp hít thở tự nhiên, hoàn toàn không gây chóng mặt hay giật lag.
- **Giữ cố định toàn bộ giao diện (Static HUD)**: Thẻ hình mẫu mục tiêu, thanh % tiến trình, các ô thành phẩm sưu tập và 3 nút bổ trợ bên dưới được giữ cố định nguyên vị trí trên màn hình. Chỉ có khung tranh vải và đường may bên trong được lấy nét.

#### 3. Trụ cột 3: Bóng Đổ Vật Lý 3D Tách Lớp (Lifted Drop Shadow)
- Thay vì di chuyển cả thế giới, game tác động trực tiếp vào chính vật thể người chơi đang cầm:
  - Khi ở trạng thái nghỉ: Bóng đổ nằm sát chân ghim ($1.5\text{px}$).
  - Khi ngón tay bắt đầu kéo: 
    - Node tự nở nhẹ $+15\%$ (từ $13.5\text{px} \to 15.5\text{px}$).
    - **Bóng đổ tách tụt xuống dưới mặt vải $6.5\text{px}$** và mờ rộng ra (`ellipse 15.5px x 8.5px`).
    - Não bộ lập tức nhận thức theo trực giác thị giác 3D: *"Chiếc ghim tròn này vừa được ngón tay nhấc bổng lên khỏi mặt vải len!"*. Bạn nhìn thấy rõ mồn một chiếc chốt mình đang điều khiển mà không cần cả thế giới phải phóng to.

#### 4. Trụ cột 4: Nâng Cấp Kích Thước Trực Quan & Vùng Chạm (Hitbox Expansion)
- **Bán kính node (`drawNode`)**: Tăng từ $10.5\text{px} \to 13.5\text{px}$ (đường kính tăng lên $27\text{px}$, khi camera zoom $1.04\text{x}$ và node nở khi kéo đạt $31\text{px}$). Node tròn đầy đặn, rõ ràng, cảm giác chạm nảy như một chiếc cúc áo gỗ xinh xắn.
- **Chốt thêu dấu × vàng bơ mật ong (`drawTargetPins`)**:
  - Đệm nỉ tròn: Bán kính tăng từ $6.8\text{px} \to 8.8\text{px}$ (viền ngoài $10.2\text{px}$).
  - Cánh chữ thập thêu: Tăng từ $3.6\text{px} \to 4.6\text{px}$.
  - Hạt French knot tâm chốt: Tăng từ $1.4\text{px} \to 1.8\text{px}$.
  - Sóng xung nhịp thở gợi ý chốt trống: Tăng biên độ tỏa từ $20\text{px} \to 24\text{px}$, bán kính quầng thở tâm tăng lên $10.5\text{px} - 13.5\text{px}$.
- **Vùng bắt chạm tương tác (Hit-box Tolerances)**:
  - Bán kính chọn node `PICK_MIN / PICK_MAX`: Tăng từ $0.071 / 0.19 \to 0.088 / 0.22$ (tương đương đường kính chạm thực tế $\approx 64\text{px}$ trên canvas, vượt tiêu chuẩn tối thiểu $44 - 48\text{pt}$ của Apple & Google HIG).
  - Khoảng cách chạm bắt dây uốn cong: Bán kính tìm kiếm tăng từ $0.072 \to 0.088$, ngưỡng bắt chạm `bestEdge.d` tăng từ $0.065 \to 0.085$. Người chơi chạm nhẹ ngón tay vào bất kỳ điểm nào dọc theo thân dây là có thể uốn cong tức thì, nhẹ nhàng và tự nhiên.


---

### 10. [ĐÃ DUYỆT CHÍNH THỨC / APPROVED] Bộ Lọc Cảm Ứng 3 Lớp (Smart 3-Layer Tap Arbitration) Chống Chạm Nhầm Dây Thay Vì Chốt

> **Đã phê duyệt chính thức theo phản hồi & trải nghiệm thực tế trên điện thoại (2026-11-08)**:
> - **Hiện trạng trải nghiệm**: Khi chơi trên điện thoại bằng ngón tay cái, người chơi muốn vuốt di chuyển chốt (node) nhưng rất dễ bị nhầm thành kéo uốn dây viền cong. Người chơi trong thực tế không bao giờ có xu hướng kéo uốn dây ở sát đầu chốt mà luôn kéo ở đoạn giữa dây.
> - **Căn nguyên kỹ thuật**:
>   1. `hitTestEdge` trước đây cho phép nhận diện kéo dây ở dải $u \in [0.12, 0.88]$, tức cho phép nắm dây ở cự ly chỉ cách đầu chốt $12\%$.
>   2. Điều kiện cũ `!(best >= 0 && !locked(best) && bd < 0.044)` yêu cầu điểm chạm phải cách tâm chốt dưới $16\text{px}$ mới ưu tiên chốt. Trên màn hình cảm ứng di động, ngón tay cái có tiết diện lớn ($40 - 50\text{px}$) nên điểm tiếp xúc thường cách tâm chốt $18 - 25\text{px}$. Do đó, sợi chỉ viền đi qua chốt lập tức cướp quyền điều khiển, biến thao tác kéo chốt thành uốn cong dây ngoài ý muốn.
> - **Phạm vi triển khai**: Đã nghiệm thu và đồng bộ hóa 100% trên cả hai bản **`Prototype/web-v2/`** và **`Prototype/web-v3/`**.

```
                               ┌────────────────────────────────────────────────────────┐
                               │ BỘ LỌC CẢM ỨNG 3 LỚP (SMART 3-LAYER TAP ARBITRATION)   │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
          ┌────────────────────────────────────────────────┼────────────────────────────────────────┐
          ▼                                                ▼                                        ▼
┌─────────────────────────────────┐      ┌──────────────────────────────────┐     ┌───────────────────────────────────┐
│ Lớp 1: Mid-Span Pinching        │      │ Lớp 2: Node-First Priority       │     │ Lớp 3: Endpoint Protective Bubble │
│ Giới hạn uốn dây ở đoạn giữa    │      │ Bán kính ưu tiên chốt 25px       │     │ Bong bóng an toàn 2 đầu chốt      │
│ u ∈ [0.25, 0.75]                │      │ bd < 0.068 (~25px): Chốt 100%    │     │ Safe Radius = 0.085 (~31px)       │
│ 25% hai đầu chốt là Vùng Chết   │      │ bestEdge.d < bd mới nhận uốn dây │     │ Không cướp cảm ứng khi bấm lệch   │
└─────────────────────────────────┘      └──────────────────────────────────┘     └───────────────────────────────────┘
```

#### 1. Lớp 1: Giới Hạn Vùng Bắt Chạm Dây Ở Đoạn Giữa (Mid-Span Pinching)
- **Nguyên lý tự nhiên**: Người chơi chỉ có nhu cầu uốn cong một đường chỉ khi họ chạm vào phần thân giữa của sợi chỉ. Ở đoạn gần 2 đầu ghim, đường chỉ bắt buộc phải thẳng hàng với chốt.
- **Vùng Chết 25% (25% Endpoint Deadzone)**:
  - Cắt bỏ hoàn toàn khả năng tương tác uốn dây ở $25\%$ chiều dài mỗi đầu mút chốt:
    ```js
    // hitTestEdge(fx, fy):
    var u = (s + t) / m;
    if (u < 0.25 || u > 0.75) continue; // Chỉ nhận diện u trong [0.25, 0.75]
    ```
  - Điểm kéo ban đầu khi bắt đầu uốn dây: `uInit = clamp(..., 0.25, 0.75)`.
  - Trong quá trình đang kéo uốn (`applyEdgeDrag`), người chơi vẫn có thể miết ngón tay tự do trong khoảng $[0.14, 0.86]$ để tạo dáng sóng lụa mượt mà không bị ngắt quãng.

#### 2. Lớp 2: Ưu Tiên Tuyệt Đối Cho Chốt Mở (Node-First Priority)
- **Mở rộng bán kính ưu tiên chốt lên $25\text{px}$ (`NODE_PRIOR_R = 0.068`)**:
  - Khi ngón tay chạm vào vùng lân cận của một Node MỞ (`best >= 0 && !locked(best)`):
    - Nếu khoảng cách tới tâm chốt $bd < 0.068$ ($approx 25\text{px}$): **Chốt thắng 100%**, dây viền hoàn toàn không có quyền cướp cảm ứng.
    - Người chơi thoải mái chạm ngón tay cái lệch tâm mà chốt vẫn được nhấc lên chính xác tuyệt đối.
  - **Trọng tài so sánh khoảng cách**: Chỉ khi ngón tay ở ngoài bán kính ưu tiên ($bd \ge 0.068$) VÀ điểm chạm nằm gần sợi dây hơn tâm chốt (`bestEdge.d < bd`), hệ thống mới xem xét chuyển sang thao tác uốn dây.
- **Locked Node Pass-Through**: Nếu chạm trúng một chốt ĐÃ KHÓA (`best >= 0 && locked(best)`) mà chạm gần đoạn giữa dây nối, cảm ứng tự động bắt vào dây để uốn cong, tránh làm người chơi cảm thấy thao tác bị đơ cứng.

#### 3. Lớp 3: Bong Bóng Bảo Vệ 2 Đầu Chốt (Endpoint Protective Bubble, $R = 0.085$)
- **Xử lý khi ngón tay chạm vào khoảng trống lân cận (`best < 0`)**:
  - Khi người chơi định với tay kéo chốt nhưng bấm lệch ra ngoài rìa chốt một chút:
  - Hệ thống đo khoảng cách từ điểm chạm tới 2 đầu chốt mút (`ra, rb`) của sợi dây:
    ```js
    var safeR = 0.085; // ~31px
    if ((!locked(ra) && distToA < safeR) || (!locked(rb) && distToB < safeR)) {
      // Nằm trong bong bóng bảo vệ của chốt mở -> không uốn dây
    } else {
      startEdgeDrag(e, p, fx, fy, bestEdge.k, bestEdge.u);
    }
    ```
  - Ngăn chặn hoàn toàn hiện tượng dây nối vồ lấy cảm ứng khi ngón tay vô tình bấm sượt qua rìa ngoài của chốt.

#### 4. Kết Quả Kiểm Thử Tự Động & Tiêu Chí Nghiệm Thu
- **Unit Test Trọng Tài Cảm Ứng (`scratch/test_tap_arbitration.js`)**:
  - Chạm lệch tâm chốt $18\text{px}$ hướng về phía dây nối: Chốt được chọn $100\%$, dây nối hoàn toàn không bị kích hoạt (`curSt.drag = Node 1`, `curSt.edgeDrag = null`).
  - Chạm đúng đoạn giữa dây ($u \approx 0.5$): Nhận diện uốn dây tức thì (`curSt.edgeDrag = Edge 2`, `curSt.drag = null`).
  - Chạm sát đầu mút dây ($u = 0.12$): Dây bị chặn không kích hoạt.
- **Smoke Test Toàn Diện (`Prototype/web-v2/smoke.js`)**:
  - Toàn bộ 5 sản phẩm (Kem, Cardigan, Trái tim gấp, Bé thỏ, Chậu hoa) với 13 màn chơi vượt qua $100\%$.


---

### 11. [ĐÃ DUYỆT CHÍNH THỨC / APPROVED] Bộ Quy Chuẩn Khoảng Cách An Toàn (Ergonomic Design Standards) & Tối Ưu Màn Áo Lót Trong (Cardigan Màn 2)

> **Đã phê duyệt chính thức theo phản hồi người chơi (2026-11-08)**:
> - **Vấn đề thực tế**: Tại Màn 2 (Áo lót trong, chuỗi Cardigan), 3 node ở đáy áo nằm quá gần nhau (khoảng cách chỉ $56.5\text{px}$), khiến đoạn dây nối giữa 2 node bị ngắn ngủn ($28.5\text{px}$ khả dụng). Khi người chơi kéo dây uốn cong trên điện thoại, ngón tay to đè kín cả 2 chốt và dây, gây khó chịu và dễ chạm nhầm.
> - **Cải tiến triển khai (Phương Án 1 - Single U-Hem Curve)**:
>   1. **Bỏ chốt chóp giữa dư thừa `[0.50, 0.94]`**: Thay vì chia đôi đường cong đáy thành 2 đoạn dây ngắn ngủn, chuyển thành **1 cạnh cong chữ U duy nhất** nối trực tiếp 2 góc đáy áo.
>   2. **Mở rộng bề ngang thân áo từ $24\% \to 32\%$ ($87\text{px} \to 116\text{px}$)**:
>      - Node 0: `[0.34, 0.06]` (Vai trái)
>      - Node 1: `[0.50, 0.20]` (Cổ chữ V, khóa ghim vàng)
>      - Node 2: `[0.66, 0.06]` (Vai phải)
>      - Node 3: `[0.66, 0.84]` (Góc đáy phải)
>      - Node 4: `[0.34, 0.84]` (Góc đáy trái)
>   3. **Cạnh uốn cong vạt áo rộng rãi**:
>      - Cạnh đáy nối Node 3 và Node 4 dài **$116\text{px}$** ($0.32$).
>      - Đoạn giữa khả dụng để ngón tay kéo uốn đạt tới **$58\text{px}$** (rộng hơn hẳn ngón tay cái $45\text{px}$).
>      - Uốn cong mềm mại `solBend = -0.0975` võng xuống đáy $Y \approx 0.94$, tạo dáng gấu áo bo tròn tuyệt đẹp.
>   4. **Tương thích hoàn hảo với Màn Thưởng**: Cập nhật đường may ráp cardigan `seams: [[3, 2, 3], [3, 4, 0], [4, 4, 0]]`, đường may hai sườn áo ráp chuẩn xác $100\%$.
> - **Thiết lập 4 Quy Tắc Vàng Khoảng Cách An Toàn (Ergonomic Golden Rules)**:
>   - $L_{node-node} \ge 0.20$ ($ge 72\text{px}$): Khoảng cách tối thiểu giữa 2 chốt bất kỳ.
>   - $L_{bendFree} \ge 0.28$ ($ge 100\text{px}$): Chiều dài tối thiểu của một cạnh có thể uốn cong.
>   - Topology: 1 cạnh cong duy nhất cho 1 đường cong liên tục, không cắm node ở đỉnh vòm cong.
>   - Canvas Coverage: Bề rộng mảnh ghép chiếm tối thiểu $45\% - 75\%$ khung tranh $362\text{px}$.

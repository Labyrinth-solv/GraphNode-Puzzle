# Đặc Tả Feeling & Logic Đã Chốt (`web-v3` Feeling Specification & Handoff)

> **Mục đích tài liệu:** Dùng để chuyển giao cho một session/phiên bản khác (có thể đang dùng kiến trúc hoặc logic nền khác) nhằm **đồng nhất toàn bộ cảm giác chơi (Game Feel / Juice), giao diện sợi chỉ, âm thanh ngũ cung, màn thưởng khâu ráp và thiết kế màn Lá số 8** thành một bản cuối cùng duy nhất.
> **File tham chiếu chuẩn:** `Prototype/web-v3/game.js` và `Prototype/web-v3/levels.js`.

---

## 1. Đồng Nhất Giao Diện Sợi Chỉ Preview & Quán Tính Đung Đưa Theo Cây Kéo

### 1.1. Nguyên tắc giao diện (Single Unified Thread Preview)
- **Bỏ hoàn toàn đường viền nét đứt sặc sỡ tách rời bên ngoài** (trước đây vẽ bằng marching-squares contour `drawCut` trên lưới mask).
- **Chỉ giữ 1 đường sợi chỉ duy nhất (`swayedRingPath` + `drawEdges`)**:
  - Đường sợi chỉ này vẽ theo kiểu **nét liền (`lineCap = 'round'`, `lineJoin = 'round'`, độ dày `lineWidth = 2.8 + 0.7 * taut`)** nối qua các node.
  - **Vùng tô màu preview bên trong (`drawSwayedFill`)** và **vị trí cây kéo chạy quanh vòng (`runnerStep` / `drawRunner`)** đều đọc trực tiếp từ mảng tọa độ đã đung đưa của sợi chỉ này (`S.path.pts`), đảm bảo **sợi chỉ – vùng màu preview – cây kéo khớp nhau 100% từng pixel**.
  - Ở màn gấp đôi vải (`fold`), các đoạn nối nằm dọc trên mép gấp (`onFold(a) && onFold(b)`) được đánh dấu `isCrease = true`: vẫn khép kín đa giác để tô màu `drawSwayedFill`, nhưng không vẽ nét sợi chỉ màu đè lên đường nếp gấp.

### 1.2. Bảng màu sợi chỉ nhuộm Cozy (`COZY_YARN` / `cozyThreadRGB`)
- Thay vì xoay vòng cầu vồng HSL chói gắt, sợi chỉ dùng **5 tông màu chỉ thêu nhuộm ombre ấm dịu** nội suy cosin mượt dọc theo chiều dài cung (`midD / total + clock * 0.09`):
  ```js
  var COZY_YARN = [
    [214, 122, 114], // 1. Terracotta Rose (Hồng đất đào)
    [222, 170,  92], // 2. Honey Mustard (Vàng bơ mật)
    [118, 172, 138], // 3. Sage Mint (Xanh xô thơm dịu)
    [114, 150, 184], // 4. Dusty Periwinkle (Xanh lam khói)
    [172, 130, 168]  // 5. Warm Mauve (Tím hoa cà ấm)
  ];
  function cozyThreadRGB(phase, taut) {
    var n = COZY_YARN.length;
    var u = (((phase % 1) + 1) % 1) * n;
    var i = Math.floor(u), f = u - i;
    var s = 0.5 - 0.5 * Math.cos(f * Math.PI); // nội suy cosin mượt
    var A = COZY_YARN[i % n], B = COZY_YARN[(i + 1) % n];
    var r = lerp(A[0], B[0], s), g = lerp(A[1], B[1], s), b = lerp(A[2], B[2], s);
    // Khi chạm ngưỡng thắng (taut -> 1), ánh chỉ hơi ấm sáng lên nhẹ (18%) nhưng vẫn giữ rõ dải màu
    return [
      Math.round(lerp(r, 232, taut * 0.18)),
      Math.round(lerp(g, 196, taut * 0.18)),
      Math.round(lerp(b, 120, taut * 0.18))
    ];
  }
  ```

### 1.3. Cơ chế Đung đưa cục bộ theo Quán tính Cây Kéo + Đứng êm khi khớp viền mẫu
Kết hợp 2 quy tắc vật lý trên từng cạnh `k` (nối từ node `a` đến node `b`, chia thành `m = 21` điểm mẫu với tham số `u` từ `0` đến `1`, hàm vòm cố định 2 đầu node `env = Math.sin(Math.PI * u)`):

1. **Quy tắc Hướng B — Cạnh đã đặt khớp viền mẫu thì nằm êm (`fitFactor`):**
   - Đo khoảng cách lớn nhất từ các điểm trên cạnh Catmull-Rom gốc tới đường viền hình mẫu (`edgeMaxErr = max_s distToOutline(outline, p[s])`).
   - Ánh xạ sang hệ số đung đưa cục bộ `fitFactor`:
     ```js
     var uFit = clamp((edgeMaxErr - 0.010) / (0.026 - 0.010), 0, 1);
     var fitFactor = uFit * uFit * (3 - 2 * uFit); // smoothstep
     var localSlack = slack * fitFactor;           // slack nền = 2.5 px khi chưa đạt ngưỡng thắng
     ```
   - **Ý nghĩa:** Khi cả cạnh đã ôm sát vào viền nét đứt hình mẫu (`edgeMaxErr <= 0.010`), `fitFactor = 0` → cạnh đó **nằm êm cố định trên viền mẫu**, không bị đung đưa kể cả khi cây kéo lướt qua. Khi cạnh chưa khớp (`edgeMaxErr >= 0.026`), `fitFactor = 1` → cạnh đung đưa theo quán tính cây kéo.

2. **Quy tắc Quán tính Cây Kéo + Dư chấn tắt dần (`bladePush` & `ring`):**
   - Sợi chỉ **không tự rung liên tục theo thời gian**, mà lấy **cây kéo chạy quanh vòng (`S.runK`, `S.runT`) làm nguồn phát xung quán tính**:
   - **Khi cây kéo đang đi trên cạnh `k` (`S.runK === k`, vị trí kéo `rt = S.runT` từ `0 → 1`):**
     - Sóng lún cục bộ bám ngay dưới mũi kéo:
       ```js
       var du = u - rt;
       var bladePush = Math.exp(-du * du * 18) * Math.sin(Math.PI * rt);
       ```
     - Biên độ tích lũy quán tính toàn cạnh tăng mượt từ `0` lên `1` khi kéo đi từ đầu cạnh đến cuối cạnh:
       ```js
       var uRamp = rt * rt * (3 - 2 * rt);
       var ring = uRamp * Math.sin(rt * Math.PI * 0.5); // đạt đúng 1.0 tại rt = 1
       ```
   - **Ngay khi cây kéo rời cạnh `k` sang cạnh `k + 1`:**
     - Ghi nhận thời điểm rời `S.edgeWake[k] = now()`.
     - Trong `1.35 giây` tiếp theo (`wakeAge = now() - S.edgeWake[k]`), cạnh `k` ngân nhẹ 1–2 nhịp dư chấn tắt dần rồi dừng hẳn (liên tục tuyệt đối từ giá trị `ring = 1.0` lúc `wakeAge = 0`, không bị giật):
       ```js
       var decay = Math.exp(-wakeAge * 2.8) * (1 - wakeAge / 1.35);
       var ring = decay * Math.cos(wakeAge * 9.5);
       ```
     - Khi `wakeAge >= 1.35s`: `ring = 0`, `bladePush = 0` → đoạn dây **nằm nghỉ tĩnh lặng hoàn toàn (delay tự nhiên)** cho tới khi cây kéo đi hết vòng quay lại.
   - **Công thức dịch chuyển điểm `(x, y)` trên cạnh `k`:**
     ```js
     var sideSign = (k % 2 ? -1 : 1);
     var sag = (env * localSlack * (0.35 + 0.45 * bladePush + 0.28 * Math.abs(ring))) / FS;
     var wv  = (env * (localSlack * (0.85 * bladePush + 0.75 * ring * Math.sin(u * Math.PI * 2 + 0.8)) * sideSign + pluckK * sideSign)) / FS;
     var x = p[q] + nx * wv, y = p[q + 1] + sag + ny * wv;
     ```

---

## 2. Hiệu Ứng Thị Giác & Luồng Chơi Trên Khung Vải

1. **Vòng sóng màu kem (`C.cream = '#FFF7E8'`) khi cây kéo chạm qua từng Node:**
   - Khi cây kéo đi qua mỗi node trên vòng (`runnerStep`), đẩy một ripple tại tâm node với màu kem sáng `#FFF7E8`.
   - Khi vẽ `drawRipples`: vẽ 1 vòng viền bóng mờ tương phản nhẹ (`rgba(C.ink, 0.16 * (1 - p))`, `lineWidth = 4.2`) bên dưới, rồi vẽ vòng sáng màu kem (`rgba(C.cream, 0.88 * (1 - p))`, `lineWidth = 2.6`, bán kính nở từ `10 px` ra `28 px` trong `0.6s`) đè lên trên để nổi bật rõ trên nền vải hồng phấn.
2. **Giữ nguyên luồng tự động sau khi cắt (Không bắt người chơi kéo bóc vải thủ công):**
   - Sau khi người chơi thả tay ở trạng thái đạt ngưỡng thắng (`IoU >= winThreshold`), game tự động chạy liền mạch chuỗi:
     `snap` (hút các node vào viền mẫu) → `cut` (kéo cắt một vòng kèm nốt nhạc leo thang) → `lift` / `unfold` (mảnh vải tự nhấc lên, hơi đung đưa nhẹ và bung mở nếu là vải gấp) → `fill` (hiện họa tiết vải) → `fly` (bay vào khay mảnh ghép).
3. **Giới hạn tăng tốc cố định `1.5x` (`FAST = 1.5`):**
   - Trong các pha tự chạy (`snap`, `cut`, `unfold`, `lift`, `fill`, `fly` và cả lúc khâu ở màn thưởng), nếu người chơi chạm thêm vào màn hình để tua nhanh thì tốc độ chỉ tăng cố định lên **`1.5 lần`** (`FAST = 1.5`), không cộng dồn nhanh hơn nữa để giữ nhịp độ cozy.

---

## 3. Hệ Thống Âm Thanh Cozy Hòa Âm Ngũ Cung (WebAudio)

Mọi âm thanh đều khóa cứng vào **thang âm ngũ cung Đô trưởng (`C5 = 523.25 Hz`, các bậc `[0, 2, 4, 7, 9]` bán âm)** để khi phát chồng lên tiếng kéo qua node không bao giờ bị lệch tông hay chói gắt:
```js
function pentaF(step, oct) {
  var P = [0, 2, 4, 7, 9], o = Math.floor(step / 5), k = ((step % 5) + 5) % 5;
  return 523.25 * Math.pow(2, oct + o + P[k] / 12);
}
```

1. **Âm chạm và thả Node cân xứng (`playDown` & `playUp`):**
   - **Chạm vào node / thanh kim (`playDown`):** `pop(noteF(1) * 0.5, 0.08, 0, 0.14)` kèm `vib(6)`.
   - **Thả tay khỏi node / thanh kim (`playUp`):** `pop(noteF(0) * 0.5, 0.085, 0, 0.15)` kèm `vib(6)` — tạo cặp âm thanh *chạm – nhả* rõ ràng, ấm và đồng bộ.
2. **Âm trầm dịu và đầm khi kéo qua vùng/viền preview vải (`softTone`):**
   - Thay thế tiếng *tick* `1900 Hz` sắc nhọn cũ bằng tổng hợp **sóng `sine` + sóng `triangle` hạ 1 quãng tám (`0.5 * f`) đi qua bộ lọc thông thấp `lowpass` (`cutoff = f * 2.2`)**:
     - Khi kéo node lọt vào vùng hút viền mẫu (`inMag`): `softTone(pentaF(2, -1), 0.06, 0.14)` (`Mi 4` trầm ấm).
     - Khi kéo node đi qua ranh giới vùng hình mẫu (`inPrev`): `softTone(pentaF(inPrev ? 1 : 0, -1), 0.045, 0.12)` (`Rê 4 / Đô 4`).
3. **Âm thanh vải & sợi chỉ căng theo tay kéo (`humStart` / `humUpdate` / `humStop`):**
   - Chỉ phát khi ngón tay đang di chuyển (`hum.mot` tỷ lệ với vận tốc kéo tay `speed / 700`; khi tay dừng yên thì âm lượng tự lặng xuống `0.005` để không bị ù nền).
   - Gồm 1 dây trầm (`triangle` + `sine` ở quãng `-2`: `Đô 3 -> La 3`) bước từng nốt ngũ cung theo độ khớp `S.dv` (không trượt tần số liên tục để tránh lệch âm) + 1 lớp tiếng sột soạt vải (`bandpass noise` ở `1300 Hz`) rất nhỏ.
4. **Tiếng gảy dây đàn gỗ ấm khi vừa chạm ngưỡng thắng lúc đang kéo (`pluck`):**
   - Dùng bộ tổng hợp dây gảy Karplus-Strong (`ksBuffer` kích bằng nhiễu đã làm mềm + lọc `lowpass` + bù chính xác cao độ `playbackRate`).
   - Ngay khoảnh khắc `S.iouV >= S.thr` khi đang kéo, gảy cặp quãng 5 ấm `pluck(pentaF(0, -1), 0.075)` + `pluck(pentaF(2, -1), 0.05, 0.045)` và kích hoạt `S.pluckT = now()` để sợi chỉ rung nhẹ báo hiệu đã khớp.

---

## 4. Màn Thưởng: Khâu Từng Mũi & Khoảnh Khắc "Chốt" Rút Chỉ (`Cinch & Flatten`)

Ở màn lắp ghép thành phẩm (`Reward Scene`), sau khi người chơi đặt các mảnh vải vào khung, giai đoạn khâu (`R.phase === 'stitch'`) được chia làm **2 pha nối tiếp**:

1. **Pha Khâu từng mũi (`R.t <= stitchDur`):**
   - Chia tổng chiều dài các đường may `seams` thành các mũi khâu rời cách nhau mỗi `STITCH_STEP = 13 px`.
   - Cây kim nhảy từng mũi một; mỗi khi mũi khâu mới hiện ra (`idx > R.lastStitch`):
     - Phát 1 nốt ngũ cung leo dần lên cao: `pop(risingF(idx), 0.055, 0, 0.19)` kèm tiếng kim xuyên vải `noise(0.025, 0.022, 3200, 'bandpass')` và `vib(4)`.
     - Vẽ mũi chỉ vàng mù tạt có lớp lót sáng nổi khối và 2 lỗ chân kim nhỏ ở hai đầu mũi khâu.
2. **Pha "Chốt" Rút chỉ — Đường may co lại, vải hơi nhăn rồi phẳng lì (`CINCH_T = 0.78s` cuối của `stitch`):**
   - **Nửa đầu (`uCinch` từ `0 → 0.52` — Rút chỉ & Nhăn vải):**
     - Cây kim rút sợi chỉ kéo căng lên cao; phát tiếng rít sợi chỉ rút qua vải `sweep(0.28, 0.045, 700, 2200)` và tiếng gảy dây căng `pluck(pentaF(4, -1), 0.06)`.
     - Toàn bộ cụm mảnh vải co nhẹ về tâm đường may (`scale = 1 - 0.045 * pucker` trong `productTf`).
     - Dọc theo từng mũi khâu, hiển thị các nếp nhăn vải 3D (`drawPucker`: bóng tối + viền sáng vuông góc với mũi chỉ).
   - **Nửa sau (`uCinch` từ `0.52 → 1.0` — Bung phẳng lì & Giải tỏa):**
     - Độ nhăn `pucker` hạ nhanh về `0` kèm độ nảy nhẹ `flattenGlow`, tấm vải duỗi phẳng lì hoàn hảo.
     - Phát hợp âm trưởng ngũ cung tròn trịa (`chord([0, 2, 4, 7], 0.065, 0.045)` + `pluck(pentaF(0, 0), 0.085)`) và bắn chùm hạt sáng dọc theo toàn bộ đường may.

---

## 5. Thiết Kế Màn Lá Đối Xứng (`flower_leaves`) — Bỏ Mép Gấp, Kéo Chéo Hình Số 8 (`∞`)

- Trong sản phẩm Chậu hoa (`flowerpot`), mảnh **Đôi lá đối xứng (`flower_leaves`, Màn 5 - Mảnh 2)** đã **bỏ hoàn toàn cơ chế gấp đôi vải (`fold`)** để giữ độ thử thách `tier: 'hard'`:
  - Sử dụng **6 node tròn `'c'` toàn bộ kéo tự do (`free: [0, 1, 2, 3, 4, 5]`, `locked: []`, `winThreshold: 0.92`)**.
  - **Lời giải (`sol`):** Các node đi vắt chéo qua tâm tạo thành **hình số 8 (`∞`)** gồm 2 chiếc lá đối xứng giao nhau ở giữa:
    ```js
    types: ['c', 'c', 'c', 'c', 'c', 'c'],
    ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [],
    sol: [
      [0.08, 0.50], // 0: Mút nhọn lá trái
      [0.29, 0.34], // 1: Bầu trên lá trái
      [0.69, 0.66], // 2: Vắt chéo qua tâm xuống bầu dưới lá phải
      [0.90, 0.50], // 3: Mút nhọn lá phải
      [0.69, 0.34], // 4: Bầu trên lá phải
      [0.29, 0.66]  // 5: Vắt chéo qua tâm xuống bầu dưới lá trái
    ],
    start: [
      [0.06, 0.29],
      [0.39, 0.06],
      [0.75, 0.43],
      [0.94, 0.68],
      [0.62, 0.63],
      [0.13, 0.79]
    ]
    ```
  - **Trải nghiệm giải đố:** Khi mới vào màn (`start`), 6 node tạo thành một vòng tròn/bầu dục đơn **không tự cắt**. Người chơi phải nhận ra quy luật **kéo vắt chéo 2 nhánh dây qua nhau như hình số 8** thì điểm giao ở tâm mới thắt lại thành 2 chiếc lá đối xứng.

---

## 6. Cơ Chế Uốn Cong Tự Do (`bendFree`), Hào Quang Bảy Màu & Chớp Sáng Chiến Thắng

### 6.1. Uốn cong viền tự do (`bendFree`) & Nhịp bồi dây viền (`chainedEdgeSnaps`)
1. **Pinch Anywhere + Smart Hit-Box**:
   - Cho phép người chơi chạm vào bất kỳ điểm nào dọc theo thân dây ($u \in [0.12, 0.88]$) để kéo uốn cong, trừ khi bấm thẳng lên đầu ghim của node mở ($bd < 0.044$).
   - Bán kính bắt chạm thân dây uốn cong `bestEdge.d` được mở rộng lên $0.085$ (vùng tìm kiếm $0.088$) giúp thao tác bằng ngón tay cái trên điện thoại cực kỳ nhạy bén.
2. **Khóa chống lơ lửng (`isEdgeAnchoredToPins`)**:
   - Chỉ khi cả hai đầu mút của cạnh uốn đã cắm chặt vào chốt mục tiêu thì mới kích hoạt hiệu ứng snap viền (tia may vàng `Seam Zip Flash`, âm rút chỉ tơ tằm `sweep`, nốt Kalimba thanh thoát và nhịp nảy đàn hồi vi mô).
   - Nếu hai đầu chưa cắm chốt: Dây vẫn trượt êm ái về vị trí uốn mà không phát hiệu ứng snap giả.
3. **Chặn gợi ý khi cắm sai chốt (`areAllPinsInCorrectPosition`)**:
   - Ẩn hoàn toàn các đốm len tròn và mảng khuyết gợi ý nếu các chốt chưa được cắm đúng vị trí giải đố, loại bỏ triệt để nhầm lẫn cho người chơi.
4. **Nhịp bồi khi cắm chốt nối liền dây viền (`chainedEdgeSnaps`)**:
   - Khi một node được cắm vào chốt và cạnh nối với nó vô tình khớp hoàn toàn viền mẫu, hệ thống tự động kích hoạt tia may và tiếng rút chỉ trễ $50\text{ms}$ sau tiếng cắm chốt.

### 6.2. Hào quang bảy màu Ombre thanh mảnh & Chớp sáng buông tay chiến thắng
1. **Hào quang bảy màu thanh mảnh (`drawReadyContourGlow`)**:
   - Bề rộng quầng bảy màu ombre dịu dàng: $6.6\text{px} - 8.6\text{px}$ (đỉnh $11.2\text{px}$ khi buông tay chiến thắng).
   - Lõi tơ tằm trắng muốt: Bề rộng $2.8\text{px} - 3.6\text{px}$ bám sát sống lưng sợi chỉ, tôn trọn vẹn nét đẹp mộc mạc của hoa văn thủ công.
2. **Chớp sáng buông tay chiến thắng (Victory Release Flash & Graceful Fade - $480\text{ms}$)**:
   - Khi buông tay đạt ngưỡng thắng: Bùng nổ chớp sáng ăn mừng rực rỡ ($t = 0 \to 80\text{ms}$ attack lên 1.0).
   - Sau đó ánh sáng dịu dần theo hàm mũ bậc hai $(1 - p)^2$ trong $400\text{ms}$ tiếp theo rồi vụt tắt hoàn toàn vào nền vải êm ái.
   - Khi ánh sáng đã hoàn toàn tĩnh lặng, cây kéo mới xuất hiện và tiến hành nghi thức cắt may hoa văn (`cut`).

---

## 7. Công Thái Học Di Động: Micro-Breathing Focus Lens ($1.04\text{x}$), Nhấc Bóng Vật Lý 3D & Touch Y-Offset

Đặc tả toàn diện giải pháp công thái học màn hình dọc di động (Portrait Ergonomics) đã được phê duyệt:

### 7.1. Micro-Breathing Focus Lens ($1.04\text{x}$) & Khóa Cứng Pan = 0
- **Khóa cứng Camera Pan ($\text{Pan} = 0$)**: Camera đứng yên $100\%$ tại tâm khung vải (`FCX = 195, FCY = 437`), không trôi dạt theo ngón tay, triệt tiêu $100\%$ nguy cơ gây choáng hay say chuyển động (Cybersickness).
- **Mức zoom vi mô $1.04\text{x}$**: Khung vải chỉ nở nhẹ đúng $7\text{px}$ mỗi cạnh, hoạt động như ống kính máy ảnh khẽ nín thở siết nét (Focus Breath) một nhịp nhẹ nhàng.
- **Tốc độ lerp thở $3.5$**: Chuyển tiếp mượt mà qua hàm lerp `cam.scale += (targetScale - cam.scale) * Math.min(1, dt * 3.5)`. Khi buông tay, camera tự động thở nhẹ về $1.0\text{x}$.
- **Static HUD**: Thẻ hình mẫu mục tiêu, thanh tiến trình % khớp và các nút bổ trợ bên dưới được giữ cố định nguyên vị trí trên màn hình. Chỉ có khung tranh vải bên trong được lấy nét.

### 7.2. Bóng Đổ Vật Lý 3D Tách Lớp (Lifted Drop Shadow)
- **Node tự nở $+15\%$**: Khi được ngón tay nhấc lên, node tự nở từ bán kính $13.5\text{px} \to 15.5\text{px}$.
- **Tách bóng 3D**:
  - Trạng thái nghỉ: Bóng đổ nằm sát chân ghim ($1.5\text{px}$).
  - Trạng thái kéo: Bóng đổ tách tụt xuống dưới mặt vải $6.5\text{px}$ và mờ rộng ra (`ctx.ellipse(x, y + 6.5, 15.5, 8.5, 0, 0, Math.PI * 2)`, màu `rgba(C.ink, 0.26)`).
  - Não bộ người chơi nhận thức rõ ràng vật thể đang cầm mà không cần phóng to cả thế giới xung quanh.

### 7.3. Nâng Chốt Nổi Khỏi Ngón Tay (Touch Y-Offset – $22\text{px}$)
- **Ramp-up mượt mà**:
  ```js
  var dragDist = Math.hypot(p[0] - d.startX, p[1] - d.startY);
  var ramp = clamp(dragDist / 14, 0, 1);
  var yLift = (d.isTouch ? 22 : 0) * ramp;
  var sNode = [p[0] + d.grabOff[0], p[1] + d.grabOff[1] - yLift];
  var wNode = screenToWorld(sNode);
  ```
- Chốt nổi cao hơn điểm chạm $22\text{px}$, nằm ngay trên móng tay, giải quyết triệt để vấn đề ngón tay to che khuất mục tiêu.
- Tọa độ logic cắm chốt và xét hút nam châm tính theo đúng vị trí hình ảnh nổi, đảm bảo sự đồng nhất tuyệt đối giữa thị giác và cơ chế game.
- Phân tách thiết bị: Chỉ kích hoạt trên màn hình cảm ứng di động (`e.pointerType === 'touch'`). Trên chuột máy tính, con trỏ giữ node ngay đầu mũi tên tự nhiên.

### 7.4. Mở Rộng Vùng Chạm & Kích Thước Chốt (Hitbox Expansion)
- Bán kính node: $13.5\text{px}$ (đường kính $27\text{px}$).
- Đệm nỉ chốt thêu dấu × vàng bơ mật ong: Bán kính đệm $8.8\text{px}$ (viền ngoài $10.2\text{px}$), cánh thêu $4.6\text{px}$, hạt French knot $1.8\text{px}$.
- Bán kính chọn node `PICK_MIN / PICK_MAX`: $0.088 / 0.22$ (đường kính chạm thực tế $\approx 64\text{px}$).
- Khoảng cách bắt chạm thân dây: $0.088 / 0.085$.


### 7.5. [ĐÃ DUYỆT CHÍNH THỨC / APPROVED] Bộ Lọc Cảm Ứng 3 Lớp (Smart 3-Layer Tap Arbitration) Chống Chạm Nhầm Dây Thay Vì Chốt

- **Bối cảnh thực tế**: Trên điện thoại di động, ngón tay cái có diện tích tiếp xúc lớn. Khi người chơi muốn chạm kéo chốt nhưng vị trí chạm hơi lệch về phía sợi dây nối, đường cong rất dễ cướp cảm ứng khiến người chơi uốn nhầm dây thay vì di chuyển chốt.
- **Triết lý tương tác tự nhiên**:
  1. Người chơi uốn cong một đường chỉ bằng cách kéo ở **phần giữa thân dây**, không bao giờ kéo sát hai đầu ghim.
  2. Khi ngón tay chạm vào vùng phụ cận của một chốt mở, ý định tự nhiên $99\%$ của người chơi là muốn kéo chiếc chốt đó đi.
- **Quy tắc phân xử 3 lớp (3-Layer Arbitration Rules)**:
  - **Lớp 1 - Vùng chết đầu mút ($u \in [0.25, 0.75]$)**: Chỉ nhận diện thao tác kéo dây khi điểm chạm nằm trong đoạn giữa dây ($u$ từ $0.25$ đến $0.75$). Loại bỏ hoàn toàn $25\%$ chiều dài ở mỗi đầu chốt.
  - **Lớp 2 - Ưu tiên chốt mở ($R_{node} = 0.068 \approx 25\text{px}$)**: Nếu điểm chạm cách tâm một chốt mở dưới $25\text{px}$, chốt được ưu tiên $100\%$, dây nối bị vô hiệu hóa hoàn toàn. Nếu chạm xa hơn $25\text{px}$ và nằm sát thân dây hơn tâm chốt (`bestEdge.d < bd`), dây mới nhận quyền kéo.
  - **Lớp 3 - Bong bóng bảo vệ 2 đầu chốt ($R_{safe} = 0.085 \approx 31\text{px}$)**: Khi điểm chạm nằm ở khoảng trống lân cận ngoài vùng chốt, nếu khoảng cách tới một đầu chốt mở nhỏ hơn $0.085$, dây nối không được phép kích hoạt để tránh cướp cảm ứng lúc ngón tay bấm lệch rìa ngoài.
  - **Locked Node Pass-Through**: Chạm sát chốt đã khóa nhưng trúng đoạn giữa dây nối thì tự động uốn dây, tránh đơ thao tác.
- **Trạng thái**: Đã nghiệm thu và đồng bộ hóa 100% trên cả hai bản **`Prototype/web-v2/`** và **`Prototype/web-v3/`**.


### 7.6. [ĐÃ DUYỆT CHÍNH THỨC / APPROVED] Bộ Quy Chuẩn Thiết Kế Khoảng Cách An Toàn (Ergonomic Standards) & Tối Ưu Vạt Áo Chữ U

- **Nguyên nhân cần chuẩn hóa**: Màn hình điện thoại có kích thước nhỏ ($390\text{px}$), trong khi ngón tay cái có diện tích tiếp xúc lớn ($44 - 50\text{px}$). Nếu khoảng cách giữa 2 node hoặc chiều dài cạnh uốn cong quá ngắn, ngón tay sẽ che lấp toàn bộ chi tiết và gây xung đột cảm ứng.
- **Bảng quy chuẩn khoảng cách công thái học di động**:
  1. **Khoảng cách giữa 2 Node ($L_{node-node}$)**:
     - Tối thiểu tuyệt đối: $0.20$ ($72\text{px}$).
     - Khuyến nghị: $0.25 - 0.35$ ($90 - 125\text{px}$).
     - Đảm bảo 2 chốt thêu và ghim gỗ không chạm đè vào nhau.
  2. **Chiều dài cạnh uốn cong ($L_{bendFree}$)**:
     - Tối thiểu tuyệt đối: $0.28$ ($100\text{px}$).
     - Đoạn giữa khả dụng ($u \in [0.25, 0.75]$) phải đạt $\ge 50\text{px}$ để vừa vặn tiết diện tiếp xúc của ngón tay cái.
  3. **Nguyên tắc Topology đường cong**:
     - Với đường cong liên tục (gấu áo bo tròn, cánh hoa, tai thỏ), dùng **1 cạnh cong duy nhất uốn `solBend`**, tuyệt đối không cắm thêm node ở đỉnh đường cong.
     - Chỉ đặt node tại các điểm gãy góc nhọn $\ge 45^\circ$.
- **Áp dụng thực tế trên Màn 2 (Áo lót trong)**:
  - Bỏ chốt giữa dư thừa, giảm từ 6 nodes $\to$ 5 nodes.
  - Mở rộng thân áo từ $87\text{px} \to 116\text{px}$, cạnh cong đáy đạt $116\text{px}$ ($58\text{px}$ vùng kéo uốn).
  - Vạt áo cong chữ U bo tròn mượt mà, cảm giác uốn dây phóng khoáng, đã tay và thỏa mãn.

### 7.7. [CHÍNH THỨC ĐÃ DUYỆT / OFFICIALLY APPROVED] Tối Ưu Màn 3 (Trái Tim Khoét Lỗ): Giải Phóng Cụm Chốt Giữa & Kéo Uốn Vòm Vai Ngoài

> **Trạng thái**: ĐÃ DUYỆT CHÍNH THỨC (Người dùng đã test thực tế trên mobile và duyệt).

- **Hiện tượng trên di động**:
  - Tại Màn 3 (`heartHole`), cụm 4 đầu ghim gỗ ở trung tâm nằm san sát nhau ($40 - 49\text{px}$), gây cảm giác chật chội và dễ bấm nhầm.
  - Sợi dây uốn cong được đặt ở mép trong lỗ khoét (Cạnh 5) chỉ dài $53.8\text{px}$, khi trừ $25\%$ vùng đệm ở mỗi đầu chốt chỉ còn $26.9\text{px}$ khả dụng. Ngón tay cái người chơi đè lên cả 2 chốt khiến việc kéo uốn bị chặn.
- **Tiêu chuẩn Game Feel áp dụng**:
  1. **Tận dụng cạnh cong chủ đạo có biên độ lớn**:
     - Thay vì bắt người chơi uốn một đoạn dây cụt ngủn ở góc kẹt bên trong, chuyển trọng tâm tương tác sang **Vòm vai lớn bên ngoài (Cạnh 1)**.
     - Chiều dài cạnh uốn cong tăng lên **$128.5\text{px}$** ($L = 0.355$). Vùng kéo uốn khả dụng $64.2\text{px}$ vượt trội so với kích thước ngón tay cái, mang lại cảm giác vuốt dây cực kỳ êm ái và đã tay.
  2. **Giải phóng không gian thị giác (Visual Breathing Space)**:
     - Phóng to lỗ khoét từ $42\% \to 55\%$, dãn cách các chốt ghim lên $\ge 58 - 71\text{px}$.
     - Hai đầu ghim đối xứng qua nếp gấp cách nhau $91.9\text{px}$, không còn hiện tượng chốt ghim chồng lấn vào nhau.
  3. **Khớp nối thành phẩm (Reward Screen Assembly)**:
     - Tỉ lệ thu nhỏ của Mảnh 1 được đồng bộ chính xác với tỉ lệ lỗ khoét mới ($s = 0.55$, toạ độ `[118.0, 334.8, 154.0]`), đảm bảo trải nghiệm may vá mượt mà, thỏa mãn khi hoàn thành màn chơi.

### 7.8. [ĐANG XEM XÉT / UNDER REVIEW] Cảm Giác Khớp Dây Nối Với Ghim Khóa & Hiển Thị Nút Cúc Kéo Dây Tức Thì

> **Trạng thái**: ĐANG XEM XÉT trên `Prototype/web-v2/`.

- **Nguyên lý nhịp bồi âm thanh & thị giác (Chained Audio-Visual Resonance)**:
  - Khi ngón tay thả chốt kéo vào lỗ cắm, chốt phát ra tiếng cúc bấm gỗ (`pinSnapSound`).
  - Đúng $50\text{ms}$ sau (nhịp bồi trôi chảy): Sợi dây nối giữa chốt mới và ghim khóa phát sáng rực rỡ (`Seam Zip Flash`), sợi dây nảy nhẹ như dây đàn guitar (`Edge Bounce`), và tiếng rút chỉ giòn tan (`sweep` $1.3\text{kHz} \to 3.2\text{kHz}$) cùng nốt Kalimba trong trẻo vang lên.
  - Người chơi cảm nhận rõ ràng: **"Sợi chỉ vừa được thợ may kéo thẳng thớm và may cố định vào cọc ghim"**.

- **Quy chuẩn sẵn sàng theo từng cạnh (Per-Edge Readiness Standard)**:
  - Tuyệt đối không bắt người chơi phải hoàn thành toàn bộ các node khác mới hiển thị nút kéo uốn dây.
  - Điều kiện hiển thị cúc kéo dây (`Pinch Bead`) và mảng thở khuyết (`Breathing Crescent Gap`):
    $$\text{Ready}(k) = \text{isPinAnchored}(ra) \land \text{isPinAnchored}(rb) \land (|h - h_{sol}| \ge 0.012)$$
  - Ngay khi 2 đầu mút của cạnh cong đã được neo vững (dù là chốt kéo vừa cắm hay ghim khóa), nút bọ thêu cúc len lập tức xuất hiện, nhấp nháy thở nhẹ với quầng hào quang màu kem bơ, trao toàn quyền kiểm soát cho người chơi uốn dây bất cứ khi nào họ muốn.


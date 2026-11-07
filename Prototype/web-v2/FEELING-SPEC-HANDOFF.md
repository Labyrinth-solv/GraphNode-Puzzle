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

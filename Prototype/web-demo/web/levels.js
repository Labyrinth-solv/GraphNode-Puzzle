/* Ngưỡng thắng (winThreshold) là số người dùng chỉnh tay trên bản web và chốt 2026-11-06.
   Dữ liệu màn: tier = độ khó (easy, medium, hard), free = node kéo được; startgen.js sinh vị trí đầu theo tier
   và khóa các node còn lại ở đúng lời giải (trường start, locked, startX bên dưới chỉ là giá trị dự phòng).
   Dữ liệu màn: mỗi sản phẩm gồm 2 mảnh. Toạ độ chuẩn hóa 0–1 theo khung vải, trục dọc hướng xuống. */
(function (root) {
  var LEVELS = [
    {
      id: 'cap', name: 'Mũ nấm', winThreshold: 0.92, tier: 'easy', free: [1, 3, 5],
      pattern: { kind: 'dots', base: '#E3A6A1', deep: '#D4837C', accent: '#FFF3E3' },
      types: ['s', 'c', 'c', 'c', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [],
      sol:   [[0.10, 0.70], [0.20, 0.36], [0.50, 0.17], [0.80, 0.36], [0.90, 0.70], [0.50, 0.60]],
      start: [[0.10, 0.70], [0.42, 0.30], [0.62, 0.52], [0.86, 0.22], [0.90, 0.70], [0.34, 0.80]]
    },
    {
      id: 'stem', name: 'Thân nấm', winThreshold: 0.95, tier: 'easy', free: [2, 3, 5],
      pattern: { kind: 'gingham', base: '#A9C1A0', deep: '#82A57C', accent: '#E9C46A' },
      types: ['s', 's', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [0],
      sol:   [[0.34, 0.20], [0.66, 0.20], [0.74, 0.54], [0.64, 0.86], [0.36, 0.86], [0.26, 0.54]],
      start: [[0.34, 0.20], [0.52, 0.50], [0.86, 0.30], [0.80, 0.80], [0.20, 0.70], [0.56, 0.86]]
    },
    {
      id: 'scoop', name: 'Viên kem', winThreshold: 0.92, tier: 'easy', free: [0, 3, 5],
      pattern: { kind: 'sprinkles', base: '#A9C4D6', deep: '#86A9C0', accent: '#FFFFFF' },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6], inner: [], locked: [2],
      sol:   [[0.12, 0.60], [0.20, 0.30], [0.50, 0.14], [0.80, 0.30], [0.88, 0.60], [0.64, 0.73], [0.38, 0.65]],
      start: [[0.20, 0.80], [0.40, 0.40], [0.50, 0.14], [0.84, 0.16], [0.62, 0.46], [0.86, 0.80], [0.52, 0.62]]
    },
    {
      id: 'cone', name: 'Ốc quế', winThreshold: 0.92, tier: 'easy', free: [0, 1],
      pattern: { kind: 'waffle', base: '#E4BC80', deep: '#D6A35C', accent: '#B98446' },
      types: ['s', 's', 's'],
      ring: [0, 1, 2], inner: [], locked: [2],
      sol:   [[0.20, 0.16], [0.80, 0.16], [0.50, 0.90]],
      start: [[0.34, 0.42], [0.72, 0.62], [0.50, 0.90]]
    },
    {
      id: 'cardigan', name: 'Thân áo khoác', winThreshold: 0.95, tier: 'easy', free: [3, 4, 5],
      pattern: { kind: 'dots', base: '#B5D6A6', deep: '#93BF85', accent: '#F6E7B0' },
      types: ['s', 's', 's', 's', 'c', 'c', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], inner: [], locked: [0, 2, 7, 9],
      sol:   [[0.26, 0.16], [0.04, 0.60], [0.14, 0.67], [0.24, 0.42], [0.24, 0.86], [0.76, 0.86], [0.76, 0.42], [0.86, 0.67], [0.96, 0.60], [0.74, 0.16]],
      start: [[0.26, 0.16], [0.30, 0.60], [0.14, 0.67], [0.12, 0.30], [0.40, 0.70], [0.60, 0.30], [0.86, 0.40], [0.86, 0.67], [0.70, 0.86], [0.74, 0.16]]
    },
    {
      id: 'shirt', name: 'Áo lót trong', winThreshold: 0.92, tier: 'easy', free: [0, 2, 4],
      pattern: { kind: 'knit', base: '#F4E2B8', deep: '#EBCF90', accent: '#C9A35E' },
      types: ['s', 's', 's', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [1],
      sol:   [[0.38, 0.06], [0.50, 0.20], [0.62, 0.06], [0.62, 0.84], [0.50, 0.94], [0.38, 0.84]],
      start: [[0.20, 0.30], [0.50, 0.20], [0.80, 0.40], [0.40, 0.70], [0.70, 0.86], [0.30, 0.90]]
    },
    {
      id: 'collar', name: 'Cổ áo', winThreshold: 0.92, tier: 'easy', free: [1, 2, 3],
      pattern: { kind: 'rib', base: '#6F9C98', deep: '#557F7B', accent: '#94BCB7' },
      types: ['s', 's', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [],
      sol:   [[0.20, 0.10], [0.36, 0.10], [0.50, 0.46], [0.64, 0.10], [0.80, 0.10], [0.50, 0.72]],
      start: [[0.20, 0.10], [0.60, 0.50], [0.30, 0.60], [0.80, 0.30], [0.50, 0.20], [0.70, 0.80]]
    },
    {
      // Gấp đôi vải: người chơi chỉ xếp nửa trái; mở ra là nửa trái cộng bản soi gương qua cây kim (mép gấp).
      // Vòng là nửa hình, khép lại dọc mép gấp. chains = các đoạn vòng kéo phải cắt (đầu và cuối mỗi đoạn nằm trên mép gấp).
      // Kim bắt đầu lệch (startX), lời giải ở solX: người chơi phải đẩy kim về đúng trục.
      id: 'heart', name: 'Trái tim gấp đôi', winThreshold: 0.92, tier: 'easy', free: [1, 2, 3],
      pattern: { kind: 'dots', base: '#F2D7C9', deep: '#E6BFAE', accent: '#E3A6A1' },
      types: ['s', 'c', 'c', 's'],
      ring: [0, 1, 2, 3], inner: [], locked: [],
      fold: { solX: 0.50, startX: 0.42, chains: [[0, 3]] },
      sol:   [[0.5, 0.3], [0.27, 0.12], [0.08, 0.42], [0.5, 0.9]],
      start: [[0.42, 0.52], [0.16, 0.24], [0.3, 0.7], [0.42, 0.8]]
    },
    {
      // Trái tim khoét lỗ trái tim: nửa vòng đi viền ngoài (0–3) rồi vòng vào vết lõm (4–7) chạm lại mép gấp.
      // Không có luật lỗ riêng: kéo các node vết lõm lùi ra chạm mép gấp, mở vải ra thì vết lõm và bản gương thành lỗ kín.
      // Lỗ là bản thu nhỏ 0,42 lần đúng hình trái tim mảnh trước, để mảnh đó xếp vừa khít lỗ ở màn thưởng.
      // Hình gấp luôn đặt giữa khung (trục 0,5); kim bắt đầu ở 0,40. Khóa: viền ngoài (1, 2) làm mốc tìm trục; hai node tam giác đầu và cuối vòng (0, 7) ghim trên mép gấp,
      // đứng yên theo chiều dọc mép nhưng vẫn chạy theo cây kim. Node mép gấp giữ thứ tự dọc mép, không kéo qua đoạn lỗ.
      id: 'heartHole', name: 'Trái tim khoét lỗ', winThreshold: 0.92, tier: 'easy', free: [3, 4, 5],
      pattern: { kind: 'gingham', base: '#E3A6A1', deep: '#D48E89', accent: '#FFFFFF' },
      types: ['s', 'c', 'c', 's', 's', 'c', 'c', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7], inner: [], locked: [0, 1, 2, 7],
      fold: { solX: 0.5, startX: 0.40, chains: [[0, 3], [4, 7]] },
      sol:   [[0.5, 0.3], [0.27, 0.12], [0.08, 0.42], [0.5, 0.9], [0.5, 0.688], [0.324, 0.486], [0.403, 0.36], [0.5, 0.436]],
      start: [[0.4, 0.3], [0.27, 0.12], [0.08, 0.42], [0.4, 0.82], [0.4, 0.52], [0.22, 0.74], [0.32, 0.22], [0.4, 0.436]]
    }
  ];
  // Sản phẩm: các mảnh theo thứ tự chơi; order = thứ tự vẽ ở màn thưởng (sau cùng nằm trên);
  // place = [ox, oy, tỉ lệ] của từng mảnh trên khung; seams = [mảnh, node đầu, node cuối] trên vòng (node cuối 0 = hết vòng).
  var PRODUCTS = [
    { id: 'mushroom', label: 'Màn 1', levels: [0, 1], order: [1, 0], seams: [[0, 4, 0]],
      place: { 0: [70, 212.5, 250], 1: [70, 307.5, 250] } },
    { id: 'icecream', label: 'Màn 2', levels: [2, 3], order: [3, 2], seams: [[2, 4, 0]],
      place: { 2: [70, 210, 250], 3: [70, 315, 250] } },
    { id: 'cardigan', label: 'Màn 3', levels: [4, 5, 6], order: [4, 5, 6], seams: [[5, 2, 3], [5, 5, 0], [6, 4, 0]],
      place: { 4: [65, 258, 260], 5: [95, 288, 200], 6: [110, 275, 170] } },
    // màn thử cơ chế gấp đôi vải, tách riêng: không nằm trong chuỗi Màn tiếp, chọn từ danh sách màn
    { id: 'heart', label: 'Màn 4', standalone: true, levels: [7, 8], order: [8, 7], seams: [[8, 0, 0]],
      // mảnh 1 thu nhỏ đúng tỉ lệ lỗ (0,42) và đặt trùng vị trí lỗ của mảnh 2
      place: { 8: [55.0, 252.2, 280], 7: [136.2, 338.9, 117.6] } }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS: LEVELS, PRODUCTS: PRODUCTS };
  else { root.LEVELS = LEVELS; root.PRODUCTS = PRODUCTS; }
})(this);

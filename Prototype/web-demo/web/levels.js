/* Ngưỡng thắng (winThreshold) là số người dùng chỉnh tay trên bản web và chốt 2026-11-06 / 2026-11-07.
   Dữ liệu màn: tier = độ khó (easy, medium, hard), free = node kéo được; startgen.js sinh vị trí đầu theo tier
   và khóa các node còn lại ở đúng lời giải (trường start, locked, startX bên dưới chỉ là giá trị dự phòng).
   Dữ liệu màn: mỗi sản phẩm gồm 2–3 mảnh. Toạ độ chuẩn hóa 0–1 theo khung vải, trục dọc hướng xuống. */
// fabric: vải hướng D (màu thật, vân theo chất liệu: knit len đan, felt nỉ, rib len gân), chốt 2026-11-09; pattern giữ làm dự phòng.
// deep: bảng màu đậm kiểu tranh tô màu để so (2026-11-11, đang thử, số tự đặt): nền tông trung bình, tông tối đậm hẳn và lệch sắc, line là màu viền thẫm của chính mảnh.
// Màu tươi sáng (2026-11-11): bảng màu đã duyệt ở web-v2 mục 20, nền bão hòa, tông sáng gần trắng, tông tối không xỉn.
(function (root) {
  var LEVELS = [
    {
      // Màn 1 - Mảnh 1 (index 0): Viên kem
      id: 'scoop', name: 'Viên kem', winThreshold: 0.94, tier: 'easy', free: [0, 3, 5],
      pattern: { kind: 'sprinkles', base: '#A9C4D6', deep: '#86A9C0', accent: '#FFFFFF' },
      fabric: { mat: 'felt', base: '#FF7B9B', light: '#FFAEC0', dark: '#E05878', deep: { base: '#F2557E', light: '#FF97B0', dark: '#C42E5C', line: '#8A1F42' } },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6], inner: [], locked: [2],
      sol:   [[0.12, 0.60], [0.20, 0.30], [0.50, 0.14], [0.80, 0.30], [0.88, 0.60], [0.64, 0.73], [0.38, 0.65]],
      start: [[0.20, 0.80], [0.40, 0.40], [0.50, 0.14], [0.84, 0.16], [0.62, 0.46], [0.86, 0.80], [0.52, 0.62]]
    },
    {
      // Màn 1 - Mảnh 2 (index 1): Ốc quế
      id: 'cone', name: 'Ốc quế', winThreshold: 0.94, tier: 'easy', free: [0, 1],
      pattern: { kind: 'waffle', base: '#E4BC80', deep: '#D6A35C', accent: '#B98446' },
      fabric: { mat: 'felt', base: '#E2A855', light: '#F5C880', dark: '#C48A35', detail: 'waffle', deep: { base: '#E0943A', light: '#F5B867', dark: '#B06A1E', line: '#6E3F0E' } },
      types: ['s', 's', 's'],
      ring: [0, 1, 2], inner: [], locked: [2],
      sol:   [[0.20, 0.16], [0.80, 0.16], [0.50, 0.90]],
      start: [[0.34, 0.42], [0.72, 0.62], [0.50, 0.90]]
    },
    {
      // Màn 2 - Mảnh 1 (index 2): Thân áo khoác
      id: 'cardigan', name: 'Thân áo khoác', winThreshold: 0.95, tier: 'medium', free: [1, 3, 4, 5, 6, 8],
      pattern: { kind: 'dots', base: '#B5D6A6', deep: '#93BF85', accent: '#F6E7B0' },
      fabric: { mat: 'knit', base: '#48C774', light: '#7FE8A2', dark: '#2DA856', deep: { base: '#2EB35E', light: '#6FD68D', dark: '#1E8A47', line: '#145C32' } },
      types: ['s', 's', 's', 's', 'c', 'c', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], inner: [], locked: [0, 2, 7, 9],
      sol:   [[0.26, 0.16], [0.04, 0.60], [0.14, 0.67], [0.24, 0.42], [0.24, 0.86], [0.76, 0.86], [0.76, 0.42], [0.86, 0.67], [0.96, 0.60], [0.74, 0.16]],
      start: [[0.26, 0.16], [0.30, 0.60], [0.14, 0.67], [0.12, 0.30], [0.40, 0.70], [0.60, 0.30], [0.86, 0.40], [0.86, 0.67], [0.70, 0.86], [0.74, 0.16]]
    },
    {
      // Màn 2 - Mảnh 2 (index 3): Áo lót trong (Đã tối ưu 5 node, gấu cong chữ U 116px)
      id: 'shirt', name: 'Áo lót trong', winThreshold: 0.95, tier: 'medium', free: [0, 2, 3, 4],
      pattern: { kind: 'knit', base: '#F4E2B8', deep: '#EBCF90', accent: '#C9A35E' },
      fabric: { mat: 'knit', base: '#FFF8EB', light: '#FFFFFF', dark: '#EEDDC0', deep: { base: '#FBEBD0', light: '#FFF8EA', dark: '#D9B98A', line: '#8C6A3E' } },
      types: ['s', 's', 's', 'c', 'c'],
      ring: [0, 1, 2, 3, 4], inner: [], locked: [1],
      sol:   [[0.34, 0.06], [0.50, 0.20], [0.66, 0.06], [0.66, 0.84], [0.34, 0.84]],
      start: [[0.20, 0.30], [0.50, 0.20], [0.80, 0.40], [0.70, 0.86], [0.30, 0.90]]
    },
    {
      // Màn 2 - Mảnh 3 (index 4): Cổ áo
      id: 'collar', name: 'Cổ áo', winThreshold: 0.95, tier: 'medium', free: [1, 2, 3, 5],
      pattern: { kind: 'rib', base: '#6F9C98', deep: '#557F7B', accent: '#94BCB7' },
      fabric: { mat: 'rib', base: '#3CB867', light: '#6DD990', dark: '#24954B', deep: { base: '#22A055', light: '#5CCB82', dark: '#16753D', line: '#0E4D28' } },
      types: ['s', 's', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [0, 4],
      sol:   [[0.20, 0.10], [0.36, 0.10], [0.50, 0.46], [0.64, 0.10], [0.80, 0.10], [0.50, 0.72]],
      start: [[0.20, 0.10], [0.60, 0.50], [0.30, 0.60], [0.80, 0.30], [0.80, 0.10], [0.70, 0.80]]
    },
    {
      // Màn 3 - Mảnh 1 (index 5): Trái tim gấp đôi
      id: 'heart', name: 'Trái tim gấp đôi', winThreshold: 0.94, tier: 'easy', free: [1, 2, 3],
      pattern: { kind: 'dots', base: '#F2D7C9', deep: '#E6BFAE', accent: '#E3A6A1' },
      fabric: { mat: 'felt', base: '#FF5E7E', light: '#FFA3B8', dark: '#D9385C', deep: { base: '#EE3F62', light: '#FF7F98', dark: '#B8213F', line: '#7A1229' } },
      types: ['s', 'c', 'c', 's'],
      ring: [0, 1, 2, 3], inner: [], locked: [],
      fold: { solX: 0.50, startX: 0.42, chains: [[0, 3]] },
      sol:   [[0.5, 0.3], [0.27, 0.12], [0.08, 0.42], [0.5, 0.9]],
      start: [[0.42, 0.52], [0.16, 0.24], [0.3, 0.7], [0.42, 0.8]]
    },
    {
      // Màn 3 - Mảnh 2 (index 6): Trái tim khoét lỗ
      id: 'heartHole', name: 'Trái tim khoét lỗ', winThreshold: 0.94, tier: 'easy', free: [2, 3, 5],
      pattern: { kind: 'gingham', base: '#E3A6A1', deep: '#D48E89', accent: '#FFFFFF' },
      fabric: { mat: 'felt', base: '#FFB8C6', light: '#FFDCE4', dark: '#E898A8', deep: { base: '#FF8FA6', light: '#FFBACA', dark: '#D9607C', line: '#9C3550' } },
      types: ['s', 'c', 'c', 's', 's', 'c', 'c', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7], inner: [], locked: [0, 1, 4, 6, 7],
      fold: { solX: 0.50, startX: 0.40, chains: [[0, 3], [4, 7]] },
      sol:   [[0.50, 0.30], [0.27, 0.12], [0.08, 0.42], [0.50, 0.90], [0.50, 0.79], [0.269, 0.526], [0.373, 0.361], [0.50, 0.460]],
      start: [[0.40, 0.30], [0.27, 0.12], [0.08, 0.42], [0.40, 0.82], [0.40, 0.79], [0.22, 0.65], [0.373, 0.361], [0.40, 0.460]]
    },
    {
      // Màn 4 - Mảnh 1 (index 7): Đôi tai thỏ
      id: 'bunny_ears', name: 'Đôi tai thỏ', winThreshold: 0.95, tier: 'medium', free: [1, 2, 3, 7, 8, 9], bendFree: [2, 7],
      pattern: { kind: 'knit', base: '#FFF5EB', deep: '#FCEADE', accent: '#F3D5C8' },
      fabric: { mat: 'felt', base: '#FFFDFC', light: '#FFFFFF', dark: '#E8DFD5', deep: { base: '#FFF6EE', light: '#FFFFFF', dark: '#DCC6B4', line: '#8A6E5C' } },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], inner: [], locked: [0, 4, 5, 6, 10],
      sol: [
        [0.24, 0.78], [0.09, 0.42], [0.13, 0.14], [0.29, 0.12], [0.39, 0.42],
        [0.50, 0.70],
        [0.61, 0.42], [0.71, 0.12], [0.87, 0.14], [0.91, 0.42], [0.76, 0.78]
      ],
      start: [
        [0.24, 0.78], [0.09, 0.42], [0.13, 0.14], [0.29, 0.12], [0.39, 0.42],
        [0.50, 0.70],
        [0.61, 0.42], [0.71, 0.12], [0.87, 0.14], [0.91, 0.42], [0.76, 0.78]
      ]
    },
    {
      // Màn 4 - Mảnh 2 (index 8): Mặt thỏ
      id: 'bunny_head', name: 'Mặt thỏ', winThreshold: 0.95, tier: 'medium', free: [0, 2, 4, 5, 7, 8], bendFree: [4, 7],
      pattern: { kind: 'dots', base: '#FFF8F0', deep: '#FDF0E4', accent: '#F9DFD0' },
      fabric: { mat: 'felt', base: '#FFFDFC', light: '#FFFFFF', dark: '#E8DFD5', deep: { base: '#FFF6EE', light: '#FFFFFF', dark: '#DCC6B4', line: '#8A6E5C' } },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], inner: [], locked: [1, 3, 6, 9],
      sol: [
        [0.27, 0.29], [0.50, 0.20], [0.73, 0.29], [0.82, 0.48], [0.92, 0.65],
        [0.78, 0.83], [0.50, 0.86], [0.22, 0.83], [0.08, 0.65], [0.18, 0.48]
      ],
      start: [
        [0.27, 0.29], [0.50, 0.20], [0.73, 0.29], [0.82, 0.48], [0.92, 0.65],
        [0.78, 0.83], [0.50, 0.86], [0.22, 0.83], [0.08, 0.65], [0.18, 0.48]
      ]
    },
    {
      // Màn 4 - Mảnh 3 (index 9): Chiếc nơ
      id: 'bunny_bow', name: 'Chiếc nơ', winThreshold: 0.95, tier: 'medium', free: [0, 2, 3, 5], bendFree: [2, 5],
      pattern: { kind: 'gingham', base: '#E89B96', deep: '#D97B75', accent: '#FFF8F2' },
      fabric: { mat: 'felt', base: '#FF5A72', light: '#FF8E9F', dark: '#D9324C', deep: { base: '#E8344F', light: '#FF6F84', dark: '#B01D37', line: '#730F22' } },
      types: ['c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [1, 4],
      sol: [
        [0.14, 0.22], [0.50, 0.41], [0.86, 0.22],
        [0.86, 0.78], [0.50, 0.59], [0.14, 0.78]
      ],
      start: [
        [0.14, 0.22], [0.50, 0.41], [0.86, 0.22],
        [0.86, 0.78], [0.50, 0.59], [0.14, 0.78]
      ]
    },
    {
      // Màn 5 - Mảnh 1 (index 10): Bông hoa gấp đôi
      id: 'flower_bloom', name: 'Bông hoa gấp đôi', winThreshold: 0.96, tier: 'hard', free: [1, 2, 4, 5, 6, 7, 8], bendFree: [1, 4],
      pattern: { kind: 'dots', base: '#F8869E', deep: '#E96884', accent: '#FFD4DF' },
      fabric: { mat: 'felt', base: '#FF6E82', light: '#FFA0B0', dark: '#D84B60', deep: { base: '#F24F78', light: '#FF8AA6', dark: '#BF2E58', line: '#7F173A' } },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], inner: [], locked: [0, 3, 9],
      fold: { solX: 0.50, startX: 0.35, chains: [[0, 9]] },
      sol: [
        [0.50, 0.22],
        [0.37, 0.09], [0.21, 0.18],
        [0.26, 0.36],
        [0.08, 0.41], [0.08, 0.59],
        [0.26, 0.64],
        [0.21, 0.82], [0.37, 0.91],
        [0.50, 0.78]
      ],
      start: [
        [0.35, 0.22],
        [0.22, 0.14], [0.12, 0.28],
        [0.26, 0.36],
        [0.14, 0.48], [0.12, 0.68],
        [0.28, 0.74],
        [0.16, 0.88], [0.28, 0.92],
        [0.35, 0.78]
      ]
    },
    {
      // Màn 5 - Mảnh 2 (index 11): Đôi lá đối xứng (4 node tròn, không gấp đôi). Đã bỏ 2 node mút lá trái phải:
      // người chơi kéo vắt chéo hai nhánh thành hình số 8, rồi uốn cong hai cạnh dọc ra ngoài để tạo mút lá.
      // Hai cạnh dọc có độ uốn lời giải đặt tay (solBendOverride), vì luật Catmull-Rom chỉ cho chỗ phồng khoảng 0,05.
      id: 'flower_leaves', name: 'Đôi lá đối xứng', winThreshold: 0.96, tier: 'hard', free: [0, 1, 2, 3], bendFree: [1, 3], keepStart: true,
      solBendOverride: { 1: 0.16, 3: -0.16 },
      pattern: { kind: 'stripes', base: '#60B872', deep: '#469958', accent: '#A8E0B4' },
      fabric: { mat: 'felt', base: '#58C774', light: '#88E59E', dark: '#38A854', deep: { base: '#3BB55E', light: '#79D892', dark: '#22893F', line: '#145A28' } },
      types: ['c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3], inner: [], locked: [],
      sol: [
        [0.29, 0.34], // 0: bầu trên lá trái
        [0.69, 0.66], // 1: vắt chéo qua tâm xuống bầu dưới lá phải
        [0.69, 0.34], // 2: bầu trên lá phải (cạnh 1 phồng sang phải thành mút lá phải)
        [0.29, 0.66]  // 3: vắt chéo qua tâm xuống bầu dưới lá trái (cạnh 3 phồng sang trái thành mút lá trái)
      ],
      start: [
        [0.39, 0.06],
        [0.75, 0.43],
        [0.62, 0.63],
        [0.13, 0.79]
      ]
    },
    {
      // Màn 5 - Mảnh 3 (index 12): Chậu hoa đất nung (8 node: 6 node vành miệng + 2 node đáy chậu)
      id: 'flower_pot', name: 'Chậu hoa', winThreshold: 0.96, tier: 'hard', free: [1, 2, 4, 5, 6, 7], bendFree: [4],
      pattern: { kind: 'rib', base: '#F28A62', deep: '#DF7148', accent: '#FAD0BC' },
      fabric: { mat: 'felt', base: '#E87D48', light: '#FFA272', dark: '#C25D28', deep: { base: '#E0632B', light: '#F59362', dark: '#B04517', line: '#6E2A10' } },
      types: ['s', 's', 's', 's', 'c', 'c', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7], inner: [], locked: [0, 3],
      sol: [
        [0.10, 0.20], [0.90, 0.20], [0.91, 0.35], [0.82, 0.36],
        [0.71, 0.85], [0.29, 0.85],
        [0.18, 0.36], [0.09, 0.35]
      ],
      start: [
        [0.10, 0.20], [0.76, 0.12], [0.92, 0.48], [0.82, 0.36],
        [0.84, 0.72], [0.22, 0.90],
        [0.14, 0.52], [0.08, 0.46]
      ]
    },
    {
      // Màn 6 (index 13): Dâu tây, một mảnh, thử phong cách tranh tô màu (viền đen dày, mảng màu phẳng chuyển sắc nhẹ,
      // vệt bóng sáng). Hình tự thiết kế, không lấy art của game khác. Chỉ có ở web-demo, chưa chốt.
      id: 'strawberry', name: 'Dâu tây', winThreshold: 0.94, tier: 'easy', free: [1, 2, 3],
      pattern: { kind: 'dots', base: '#F2404F', deep: '#C42335', accent: '#FFD54A' },
      fabric: { mat: 'flat', base: '#F2404F', light: '#FF8088', dark: '#C42335', line: '#2A2326' },
      types: ['c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4], inner: [], locked: [0, 4],
      sol:   [[0.28, 0.24], [0.72, 0.24], [0.86, 0.48], [0.50, 0.90], [0.14, 0.48]],
      start: [[0.28, 0.24], [0.62, 0.40], [0.74, 0.70], [0.40, 0.76], [0.14, 0.48]]
    }
  ];
  // Sản phẩm: các mảnh theo thứ tự chơi; order = thứ tự vẽ ở màn thưởng (sau cùng nằm trên);
  // place = [ox, oy, tỉ lệ] của từng mảnh trên khung; seams = [mảnh, node đầu, node cuối] trên vòng (node cuối 0 = hết vòng).
  var PRODUCTS = [
    { id: 'icecream', label: 'Màn 1', levels: [0, 1], order: [1, 0], seams: [[0, 4, 0]],
      place: { 0: [70, 210, 250], 1: [70, 315, 250] } },
    { id: 'cardigan', label: 'Màn 2', levels: [2, 3, 4], order: [2, 3, 4], seams: [[3, 2, 3], [3, 4, 0], [4, 4, 0]],
      place: { 2: [65, 258, 260], 3: [95, 288, 200], 4: [110, 275, 170] } },
    { id: 'heart', label: 'Màn 3', levels: [5, 6], order: [6, 5], seams: [[6, 0, 0]],
      // mảnh 1 thu nhỏ đúng tỉ lệ lỗ (0,55) và đặt trùng vị trí lỗ của mảnh 2
      place: { 6: [55.0, 252.2, 280], 5: [118.0, 334.8, 154.0] } },
    { id: 'bunny', label: 'Màn 4', levels: [7, 8, 9], order: [7, 8, 9], seams: [[8, 0, 2], [9, 0, 2]],
      place: { 7: [92.5, 244, 205], 8: [70.0, 294, 250], 9: [142.5, 456, 105] } },
    { id: 'flowerpot', label: 'Màn 5', levels: [10, 11, 12], order: [11, 12, 10], seams: [[11, 0, 0], [12, 0, 2], [10, 0, 0]],
      place: { 10: [98, 224, 194], 11: [99, 326, 192], 12: [115, 404, 160] } },
    { id: 'strawberry', label: 'Màn 6', standalone: true, levels: [13], order: [13], seams: [[13, 0, 0]],
      place: { 13: [70, 262, 250] } }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS: LEVELS, PRODUCTS: PRODUCTS };
  else { root.LEVELS = LEVELS; root.PRODUCTS = PRODUCTS; }
})(this);

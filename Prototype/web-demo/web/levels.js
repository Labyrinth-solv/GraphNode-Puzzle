/* Dữ liệu màn: mỗi sản phẩm gồm 2 mảnh. Toạ độ chuẩn hóa 0–1 theo khung vải, trục dọc hướng xuống. */
(function (root) {
  var LEVELS = [
    {
      id: 'cap', name: 'Mũ nấm', winThreshold: 0.85,
      pattern: { kind: 'dots', base: '#E3A6A1', deep: '#D4837C', accent: '#FFF3E3' },
      types: ['s', 'c', 'c', 'c', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [],
      sol:   [[0.10, 0.70], [0.20, 0.36], [0.50, 0.17], [0.80, 0.36], [0.90, 0.70], [0.50, 0.60]],
      start: [[0.10, 0.70], [0.42, 0.30], [0.62, 0.52], [0.86, 0.22], [0.90, 0.70], [0.34, 0.80]]
    },
    {
      id: 'stem', name: 'Thân nấm', winThreshold: 0.85,
      pattern: { kind: 'gingham', base: '#A9C1A0', deep: '#82A57C', accent: '#E9C46A' },
      types: ['s', 's', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5], inner: [[1, 4]], locked: [0],
      sol:   [[0.34, 0.20], [0.66, 0.20], [0.74, 0.54], [0.64, 0.86], [0.36, 0.86], [0.26, 0.54]],
      start: [[0.34, 0.20], [0.52, 0.50], [0.86, 0.30], [0.80, 0.80], [0.20, 0.70], [0.56, 0.86]]
    },
    {
      id: 'scoop', name: 'Viên kem', winThreshold: 0.88,
      pattern: { kind: 'sprinkles', base: '#A9C4D6', deep: '#86A9C0', accent: '#FFFFFF' },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6], inner: [], locked: [],
      sol:   [[0.12, 0.60], [0.20, 0.30], [0.50, 0.14], [0.80, 0.30], [0.88, 0.60], [0.64, 0.73], [0.38, 0.65]],
      start: [[0.20, 0.80], [0.40, 0.40], [0.30, 0.12], [0.84, 0.16], [0.62, 0.46], [0.86, 0.80], [0.52, 0.62]]
    },
    {
      id: 'cone', name: 'Ốc quế', winThreshold: 0.88,
      pattern: { kind: 'waffle', base: '#E4BC80', deep: '#D6A35C', accent: '#B98446' },
      types: ['s', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4], inner: [[2, 4]], locked: [3],
      sol:   [[0.20, 0.16], [0.80, 0.16], [0.76, 0.30], [0.50, 0.90], [0.24, 0.30]],
      start: [[0.34, 0.42], [0.72, 0.62], [0.62, 0.30], [0.50, 0.90], [0.20, 0.58]]
    },
    {
      id: 'cardigan', name: 'Thân áo khoác', winThreshold: 0.88,
      pattern: { kind: 'dots', base: '#B5D6A6', deep: '#93BF85', accent: '#F6E7B0' },
      types: ['s', 's', 's', 's', 'c', 'c', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], inner: [[3, 6]], locked: [0],
      sol:   [[0.26, 0.16], [0.04, 0.60], [0.14, 0.67], [0.24, 0.42], [0.24, 0.86], [0.76, 0.86], [0.76, 0.42], [0.86, 0.67], [0.96, 0.60], [0.74, 0.16]],
      start: [[0.26, 0.16], [0.30, 0.60], [0.50, 0.40], [0.12, 0.30], [0.40, 0.70], [0.60, 0.30], [0.86, 0.40], [0.66, 0.70], [0.70, 0.86], [0.90, 0.20]]
    },
    {
      id: 'shirt', name: 'Áo lót trong', winThreshold: 0.80,
      pattern: { kind: 'knit', base: '#F4E2B8', deep: '#EBCF90', accent: '#C9A35E' },
      types: ['s', 's', 's', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [1],
      sol:   [[0.38, 0.06], [0.50, 0.20], [0.62, 0.06], [0.62, 0.84], [0.50, 0.94], [0.38, 0.84]],
      start: [[0.20, 0.30], [0.50, 0.20], [0.80, 0.40], [0.40, 0.70], [0.70, 0.86], [0.30, 0.90]]
    },
    {
      id: 'collar', name: 'Cổ áo', winThreshold: 0.72,
      pattern: { kind: 'rib', base: '#6F9C98', deep: '#557F7B', accent: '#94BCB7' },
      types: ['s', 's', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [],
      sol:   [[0.20, 0.10], [0.36, 0.10], [0.50, 0.46], [0.64, 0.10], [0.80, 0.10], [0.50, 0.72]],
      start: [[0.20, 0.10], [0.60, 0.50], [0.30, 0.60], [0.80, 0.30], [0.50, 0.20], [0.70, 0.80]]
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
      place: { 4: [65, 258, 260], 5: [95, 288, 200], 6: [110, 275, 170] } }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS: LEVELS, PRODUCTS: PRODUCTS };
  else { root.LEVELS = LEVELS; root.PRODUCTS = PRODUCTS; }
})(this);

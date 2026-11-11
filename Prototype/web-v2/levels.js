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
      id: 'scoop', name: 'Viên kem', winThreshold: 0.94, tier: 'hard', free: [0, 3, 5],
      pattern: { kind: 'sprinkles', base: '#A9C4D6', deep: '#86A9C0', accent: '#FFFFFF' },
      fabric: { mat: 'felt', base: '#FF7B9B', light: '#FFAEC0', dark: '#E05878', deep: { base: '#F2557E', light: '#FF97B0', dark: '#C42E5C', line: '#8A1F42' } },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6], inner: [], locked: [2],
      sol:   [[0.12, 0.60], [0.20, 0.30], [0.50, 0.14], [0.80, 0.30], [0.88, 0.60], [0.64, 0.73], [0.38, 0.65]],
      start: [[0.20, 0.80], [0.40, 0.40], [0.50, 0.14], [0.84, 0.16], [0.62, 0.46], [0.86, 0.80], [0.52, 0.62]]
    },
    {
      // Màn 1 - Mảnh 2 (index 1): Ốc quế
      id: 'cone', name: 'Ốc quế', winThreshold: 0.94, tier: 'hard', free: [0, 1],
      pattern: { kind: 'waffle', base: '#E4BC80', deep: '#D6A35C', accent: '#B98446' },
      fabric: { mat: 'felt', base: '#E2A855', light: '#F5C880', dark: '#C48A35', detail: 'waffle', deep: { base: '#E0943A', light: '#F5B867', dark: '#B06A1E', line: '#6E3F0E' } },
      types: ['s', 's', 's'],
      ring: [0, 1, 2], inner: [], locked: [2],
      sol:   [[0.20, 0.16], [0.80, 0.16], [0.50, 0.90]],
      start: [[0.34, 0.42], [0.72, 0.62], [0.50, 0.90]]
    },
    {
      // Màn 2 - Mảnh 1 (index 2): Thân áo khoác
      id: 'cardigan', name: 'Thân áo khoác', winThreshold: 0.95, tier: 'hard', free: [1, 3, 4, 5, 6, 8],
      pattern: { kind: 'dots', base: '#B5D6A6', deep: '#93BF85', accent: '#F6E7B0' },
      fabric: { mat: 'knit', base: '#48C774', light: '#7FE8A2', dark: '#2DA856', deep: { base: '#2EB35E', light: '#6FD68D', dark: '#1E8A47', line: '#145C32' } },
      types: ['s', 's', 's', 's', 'c', 'c', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], inner: [], locked: [0, 2, 7, 9],
      sol:   [[0.26, 0.16], [0.04, 0.60], [0.14, 0.67], [0.24, 0.42], [0.24, 0.86], [0.76, 0.86], [0.76, 0.42], [0.86, 0.67], [0.96, 0.60], [0.74, 0.16]],
      start: [[0.26, 0.16], [0.30, 0.60], [0.14, 0.67], [0.12, 0.30], [0.40, 0.70], [0.60, 0.30], [0.86, 0.40], [0.86, 0.67], [0.70, 0.86], [0.74, 0.16]]
    },
    {
      // Màn 2 - Mảnh 2 (index 3): Áo lót trong (Đã tối ưu 5 node, gấu cong chữ U 116px)
      id: 'shirt', name: 'Áo lót trong', winThreshold: 0.95, tier: 'hard', free: [0, 2, 3, 4],
      pattern: { kind: 'knit', base: '#F4E2B8', deep: '#EBCF90', accent: '#C9A35E' },
      fabric: { mat: 'knit', base: '#FFF8EB', light: '#FFFFFF', dark: '#EEDDC0', deep: { base: '#FBEBD0', light: '#FFF8EA', dark: '#D9B98A', line: '#8C6A3E' } },
      types: ['s', 's', 's', 'c', 'c'],
      ring: [0, 1, 2, 3, 4], inner: [], locked: [1],
      sol:   [[0.34, 0.06], [0.50, 0.20], [0.66, 0.06], [0.66, 0.84], [0.34, 0.84]],
      start: [[0.20, 0.30], [0.50, 0.20], [0.80, 0.40], [0.70, 0.86], [0.30, 0.90]]
    },
    {
      // Màn 2 - Mảnh 3 (index 4): Cổ áo
      id: 'collar', name: 'Cổ áo', winThreshold: 0.95, tier: 'hard', free: [1, 2, 3, 5],
      pattern: { kind: 'rib', base: '#6F9C98', deep: '#557F7B', accent: '#94BCB7' },
      fabric: { mat: 'rib', base: '#3CB867', light: '#6DD990', dark: '#24954B', deep: { base: '#22A055', light: '#5CCB82', dark: '#16753D', line: '#0E4D28' } },
      types: ['s', 's', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [0, 4],
      sol:   [[0.20, 0.10], [0.36, 0.10], [0.50, 0.46], [0.64, 0.10], [0.80, 0.10], [0.50, 0.72]],
      start: [[0.20, 0.10], [0.60, 0.50], [0.30, 0.60], [0.80, 0.30], [0.80, 0.10], [0.70, 0.80]]
    },
    {
      // Màn 3 - Mảnh 1 (index 5): Đôi tai thỏ
      id: 'bunny_ears', name: 'Đôi tai thỏ', winThreshold: 0.95, tier: 'hard', free: [1, 2, 3, 7, 8, 9], bendFree: [2, 7],
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
      // Màn 3 - Mảnh 2 (index 6): Mặt thỏ
      id: 'bunny_head', name: 'Mặt thỏ', winThreshold: 0.95, tier: 'hard', free: [0, 2, 4, 5, 7, 8], bendFree: [4, 7],
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
      // Màn 3 - Mảnh 3 (index 7): Chiếc nơ
      id: 'bunny_bow', name: 'Chiếc nơ', winThreshold: 0.95, tier: 'hard', free: [0, 2, 3, 5], bendFree: [2, 5],
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
    // --- Màn 4 (indices 8..10): Cây nấm đỏ Color Page (từ ICON-mushroom.png, tách 3 mảnh ghép khít viền gốc) ---
    {
      id: 'mushroom_stem',
      name: 'Thân nấm',
      winThreshold: 0.95,
      tier: 'hard',
      free: [2, 3, 6, 7],
      bendFree: [4],
      solBendOverride: { '3': -0.075, '4': -0.145, '5': -0.075 },
      pattern: { kind: 'rib', base: '#EFE0AC', deep: '#C8B892', accent: '#FAF2D4' },
      fabric: {
        mat: 'knit', base: '#EFE0AC', light: '#FAF0CC', dark: '#BCAC88', line: '#3F3426',
        deep: { base: '#E3D19B', light: '#F8ECBE', dark: '#AE9D78', line: '#362B1F' }
      },
      types: ['s', 's', 's', 'c', 'c', 'c', 'c', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7],
      inner: [],
      locked: [0, 1, 4, 5],
      sol: [
        [0.215, 0.145], [0.785, 0.145], [0.880, 0.320], [0.822, 0.460],
        [0.832, 0.775], [0.168, 0.775], [0.178, 0.460], [0.120, 0.320]
      ],
      start: [
        [0.215, 0.145], [0.785, 0.145], [0.730, 0.340], [0.680, 0.520],
        [0.832, 0.775], [0.168, 0.775], [0.320, 0.520], [0.270, 0.340]
      ]
    },
    {
      id: 'mushroom_cap',
      name: 'Mũ nấm đỏ',
      winThreshold: 0.95,
      tier: 'hard',
      free: [1, 2, 5, 6],
      bendFree: [3],
      solBendOverride: { '3': -0.110 },
      pattern: { kind: 'dots', base: '#F4141C', deep: '#BC040C', accent: '#FFFFFF' },
      fabric: {
        mat: 'felt', base: '#F2141E', light: '#FF565E', dark: '#BC040C', line: '#2E1114',
        deep: { base: '#EA121C', light: '#FF4E56', dark: '#A6040A', line: '#290D10' }
      },
      types: ['c', 'c', 'c', 's', 's', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6],
      inner: [],
      locked: [0, 3, 4],
      sol: [
        [0.500, 0.235], [0.730, 0.308], [0.868, 0.482], [0.902, 0.650],
        [0.098, 0.650], [0.132, 0.482], [0.270, 0.308]
      ],
      start: [
        [0.500, 0.235], [0.630, 0.420], [0.730, 0.540], [0.902, 0.650],
        [0.098, 0.650], [0.270, 0.540], [0.370, 0.420]
      ]
    },
    {
      id: 'mushroom_grass',
      name: 'Cụm cỏ',
      winThreshold: 0.94,
      tier: 'hard',
      free: [0, 2, 3],
      bendFree: [2],
      solBendOverride: { '0': -0.015, '1': -0.055, '2': -0.210, '3': -0.055, '4': -0.015 },
      pattern: { kind: 'stripes', base: '#34AC3A', deep: '#248828', accent: '#62D468' },
      fabric: {
        mat: 'flat', base: '#36AC3E', light: '#5AD060', dark: '#228426', line: '#1D331B',
        deep: { base: '#2FA236', light: '#54CA5A', dark: '#1D7822', line: '#182C16' }
      },
      types: ['s', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4],
      inner: [],
      locked: [1, 4],
      sol: [
        [0.500, 0.335], [0.650, 0.510], [0.905, 0.465], [0.095, 0.465], [0.350, 0.510]
      ],
      start: [
        [0.500, 0.380], [0.650, 0.510], [0.870, 0.560], [0.130, 0.560], [0.350, 0.510]
      ]
    },
    // --- Màn 5 (indices 11..13): Hạt dẻ & Lá sồi Color Page (từ ICON-acorn.png & acorn.json, tách 3 mảnh khít viền gốc) ---
    {
      id: 'oak_leaf',
      name: 'Lá sồi',
      winThreshold: 0.94,
      tier: 'hard',
      free: [1, 4, 6, 8, 10, 11],
      bendFree: [0, 10],
      solBendOverride: {
        '0': 0.025, '4': -0.026, '5': -0.022, '6': -0.016, '7': -0.014,
        '8': -0.012, '9': 0.006, '10': -0.028, '11': -0.055
      },
      pattern: { kind: 'stripes', base: '#4FA10D', deep: '#3A7C00', accent: '#72C228' },
      fabric: {
        mat: 'felt', base: '#4FA10D', light: '#74C42C', dark: '#3A7C00', line: '#1D3E04',
        deep: { base: '#47940A', light: '#68B624', dark: '#326A00', line: '#183403' }
      },
      types: ['c', 's', 'c', 'c', 'c', 's', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      inner: [],
      locked: [0, 2, 3, 5, 7, 9],
      sol: [
        [0.471, 0.060], [0.876, 0.081], [0.805, 0.268], [0.704, 0.616],
        [0.553, 0.884], [0.398, 0.855], [0.253, 0.906], [0.163, 0.735],
        [0.072, 0.598], [0.218, 0.468], [0.116, 0.341], [0.336, 0.174]
      ],
      start: [
        [0.471, 0.060], [0.730, 0.180], [0.805, 0.268], [0.704, 0.616],
        [0.640, 0.760], [0.398, 0.855], [0.340, 0.740], [0.163, 0.735],
        [0.240, 0.580], [0.218, 0.468], [0.260, 0.360], [0.380, 0.260]
      ]
    },
    {
      id: 'acorn_nut',
      name: 'Hạt dẻ',
      winThreshold: 0.95,
      tier: 'hard',
      free: [2, 3, 5, 6],
      bendFree: [2, 3],
      solBendOverride: { '2': -0.026, '3': -0.030, '4': -0.022 },
      pattern: { kind: 'rib', base: '#EA8F2C', deep: '#CE6B08', accent: '#FAB86E' },
      fabric: {
        mat: 'felt', base: '#EA8F2C', light: '#FAB86E', dark: '#CE6B08', line: '#5A2A04',
        deep: { base: '#DE8220', light: '#F7AF60', dark: '#B85D06', line: '#4E2302' }
      },
      types: ['c', 'c', 'c', 'c', 's', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7],
      inner: [],
      locked: [0, 1, 4, 7],
      sol: [
        [0.517, 0.155], [0.816, 0.351], [0.837, 0.527], [0.688, 0.752],
        [0.373, 0.780], [0.167, 0.609], [0.144, 0.380], [0.201, 0.218]
      ],
      start: [
        [0.517, 0.155], [0.816, 0.351], [0.690, 0.520], [0.580, 0.680],
        [0.373, 0.780], [0.290, 0.580], [0.280, 0.390], [0.201, 0.218]
      ]
    },
    {
      id: 'acorn_cap',
      name: 'Mũ hạt dẻ',
      winThreshold: 0.95,
      tier: 'hard',
      free: [1, 3, 5, 7],
      bendFree: [0, 4],
      solBendOverride: {
        '0': 0.042, '1': 0.032, '2': -0.022, '3': -0.028,
        '4': -0.036, '5': 0.008, '6': -0.025, '7': -0.038
      },
      pattern: { kind: 'knit', base: '#9C3910', deep: '#752B0A', accent: '#C25624' },
      fabric: {
        mat: 'knit', base: '#9C3910', light: '#BE5422', dark: '#752B0A', line: '#3F1604',
        deep: { base: '#90330D', light: '#B44B1B', dark: '#652407', line: '#361203' }
      },
      types: ['c', 's', 'c', 'c', 's', 'c', 's', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7],
      inner: [],
      locked: [0, 2, 4, 6],
      sol: [
        [0.409, 0.253], [0.697, 0.186], [0.719, 0.347], [0.909, 0.562],
        [0.811, 0.732], [0.470, 0.498], [0.152, 0.517], [0.177, 0.336]
      ],
      start: [
        [0.409, 0.253], [0.580, 0.120], [0.719, 0.347], [0.760, 0.560],
        [0.811, 0.732], [0.470, 0.620], [0.152, 0.517], [0.270, 0.360]
      ]
    },
    // --- Màn 6 (indices 14..16): Hoa hướng dương Color Page (từ IconSunflower.png & sunflower.json, tách 3 mảnh ghép khít viền gốc) ---
    {
      id: 'sunflower_leaves',
      name: 'Đôi lá xanh',
      winThreshold: 0.94,
      tier: 'hard',
      free: [0, 2, 4, 6],
      bendFree: [2, 7],
      solBendOverride: {
        '0': -0.010, '1': -0.010, '2': -0.072, '3': -0.016,
        '4': 0.018,  '5': 0.020,  '6': -0.022, '7': -0.068
      },
      pattern: { kind: 'stripes', base: '#129A38', deep: '#067626', accent: '#48C858' },
      fabric: {
        mat: 'felt', base: '#129A38', light: '#4AC858', dark: '#067626', line: '#0A3314',
        deep: { base: '#0E8C30', light: '#3EB84A', dark: '#04641E', line: '#07280E' }
      },
      types: ['s', 's', 's', 'c', 'c', 'c', 'c', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7],
      inner: [],
      locked: [1, 3, 5, 7],
      sol: [
        [0.200, 0.389], [0.491, 0.421], [0.810, 0.437], [0.875, 0.747],
        [0.616, 0.686], [0.491, 0.567], [0.349, 0.719], [0.097, 0.747]
      ],
      start: [
        [0.200, 0.389], [0.491, 0.421], [0.680, 0.490], [0.875, 0.747],
        [0.560, 0.780], [0.491, 0.567], [0.390, 0.800], [0.097, 0.747]
      ]
    },
    {
      id: 'sunflower_petals',
      name: 'Vòng cánh hoa',
      winThreshold: 0.94,
      tier: 'hard',
      free: [0, 2, 3, 4, 6, 7],
      bendFree: [0, 4],
      solBendOverride: {
        '0': -0.132, '1': -0.138, '2': -0.138, '3': -0.146,
        '4': -0.132, '5': -0.142, '6': -0.128, '7': -0.138
      },
      pattern: { kind: 'rib', base: '#FFD030', deep: '#F29A18', accent: '#FFF08A' },
      fabric: {
        mat: 'felt', base: '#FFD030', light: '#FFEE7A', dark: '#F29A18', line: '#6E3C06',
        deep: { base: '#F7C21E', light: '#FFE45E', dark: '#DD840E', line: '#5B3004' }
      },
      types: ['s', 's', 's', 's', 's', 's', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7],
      inner: [],
      locked: [1, 5],
      sol: [
        [0.392, 0.180], [0.625, 0.174], [0.823, 0.347], [0.815, 0.613],
        [0.623, 0.829], [0.390, 0.810], [0.197, 0.608], [0.193, 0.371]
      ],
      start: [
        [0.392, 0.180], [0.625, 0.174], [0.680, 0.420], [0.815, 0.613],
        [0.623, 0.829], [0.390, 0.810], [0.340, 0.560], [0.193, 0.371]
      ]
    },
    {
      id: 'sunflower_center',
      name: 'Nhụy hoa',
      winThreshold: 0.94,
      tier: 'hard',
      free: [0, 2, 4, 5],
      bendFree: [1, 4],
      solBendOverride: {
        '0': -0.048, '1': -0.048, '2': -0.048,
        '3': -0.048, '4': -0.048, '5': -0.048
      },
      pattern: { kind: 'dots', base: '#9A2E1A', deep: '#6A190C', accent: '#C65638' },
      fabric: {
        mat: 'knit', base: '#9A2E1A', light: '#BE4A30', dark: '#6A190C', line: '#3E0C05',
        deep: { base: '#8B2614', light: '#B04028', dark: '#591408', line: '#330903' }
      },
      types: ['c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5],
      inner: [],
      locked: [1, 3],
      sol: [
        [0.499, 0.218], [0.760, 0.360], [0.760, 0.642],
        [0.499, 0.783], [0.239, 0.642], [0.239, 0.360]
      ],
      start: [
        [0.499, 0.350], [0.760, 0.360], [0.620, 0.620],
        [0.499, 0.783], [0.380, 0.620], [0.360, 0.360]
      ]
    }
  ];
  // Sản phẩm: các mảnh theo thứ tự chơi; order = thứ tự vẽ ở màn thưởng (sau cùng nằm trên);
  // place = [ox, oy, tỉ lệ] của từng mảnh trên khung; seams = [mảnh, node đầu, node cuối] trên vòng (node cuối 0 = hết vòng).
  var PRODUCTS = [
    { id: 'icecream', label: 'Màn 1', levels: [0, 1], order: [1, 0], seams: [[0, 4, 0]],
      place: { 0: [70, 210, 250], 1: [70, 315, 250] } },
    { id: 'cardigan', label: 'Màn 2', levels: [2, 3, 4], order: [2, 3, 4], seams: [[3, 2, 3], [3, 4, 0], [4, 4, 0]],
      place: { 2: [65, 258, 260], 3: [95, 288, 200], 4: [110, 275, 170] } },
    { id: 'bunny', label: 'Màn 3', levels: [5, 6, 7], order: [5, 6, 7], seams: [[6, 0, 2], [7, 0, 2]],
      place: { 5: [92.5, 244, 205], 6: [70.0, 294, 250], 7: [142.5, 456, 105] } },
    { id: 'mushroom', label: 'Màn 4', levels: [8, 9, 10], order: [8, 9, 10], seams: [[8, 0, 0], [9, 0, 0], [10, 0, 0]],
      place: { 8: [122.3, 363.0, 145.4], 9: [57.2, 180.9, 275.6], 10: [96.2, 395.4, 192.1] } },
    { id: 'acorn', label: 'Màn 5', levels: [11, 12, 13], order: [11, 12, 13], seams: [[11, 0, 0], [12, 0, 0], [13, 0, 0]],
      place: { 11: [55.8, 261.0, 272.7], 12: [113.4, 325.8, 208.7], 13: [118.2, 263.4, 214.3] } },
    { id: 'sunflower', label: 'Màn 6', levels: [14, 15, 16], order: [14, 15, 16], seams: [[14, 0, 0], [15, 0, 0], [16, 0, 0]],
      place: { 14: [79.3, 323.0, 240.7], 15: [80.6, 256.7, 232.1], 16: [113.9, 289.2, 166.7] } }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS: LEVELS, PRODUCTS: PRODUCTS };
  else { root.LEVELS = LEVELS; root.PRODUCTS = PRODUCTS; }
})(this);

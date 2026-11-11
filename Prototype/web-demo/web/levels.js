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
      // Màn 2 - Mảnh 1 (index 2): Đế bánh cupcake (từ IconCupcakeHeart.png Color Page)
      id: 'cupcake_base', name: 'Đế bánh', winThreshold: 0.94, tier: 'hard',
      free: [0, 2, 3, 5], bendFree: [],
      solBendOverride: { '2': 0, '3': -0.008, '4': -0.008, '5': 0 },
      pattern: { kind: 'rib', base: '#D858A8', deep: '#B8368B', accent: '#F79AD5' },
      fabric: {
        mat: 'felt', base: '#DC329E', light: '#F474C4', dark: '#A61E76', line: '#5E0C3E',
        deep: { base: '#D62898', light: '#F068BE', dark: '#961264', line: '#5E0C3E' }
      },
      types: ['s', 's', 's', 'c', 'c', 's'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [1, 4],
      sol:   [[0.162, 0.333], [0.500, 0.342], [0.838, 0.333], [0.754, 0.630], [0.500, 0.640], [0.246, 0.630]],
      start: [[0.280, 0.560], [0.500, 0.342], [0.720, 0.560], [0.790, 0.780], [0.500, 0.640], [0.210, 0.780]]
    },
    {
      // Màn 2 - Mảnh 2 (index 3): Kem bánh cupcake (từ IconCupcakeHeart.png Color Page)
      id: 'cupcake_frosting', name: 'Kem bánh', winThreshold: 0.94, tier: 'hard',
      free: [0, 2, 4, 5, 7], bendFree: [0, 3],
      solBendOverride: { '0': -0.020, '1': -0.018, '2': 0.011, '3': -0.045, '4': -0.030, '5': 0.003, '6': -0.002, '7': -0.037 },
      pattern: { kind: 'dots', base: '#F4A262', deep: '#DB7B3E', accent: '#FFD4A4' },
      fabric: {
        mat: 'felt', base: '#FA9A56', light: '#FFC58C', dark: '#CF6B2E', line: '#7A3310',
        deep: { base: '#FA9654', light: '#FFC284', dark: '#C86026', line: '#7A3310' }
      },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7], inner: [], locked: [1, 3, 6],
      sol: [
        [0.105, 0.527], [0.220, 0.390], [0.410, 0.332], [0.640, 0.372],
        [0.892, 0.534], [0.753, 0.600], [0.493, 0.579], [0.232, 0.592]
      ],
      start: [
        [0.180, 0.690], [0.220, 0.390], [0.440, 0.210], [0.640, 0.372],
        [0.830, 0.690], [0.710, 0.770], [0.493, 0.579], [0.280, 0.770]
      ]
    },
    {
      // Màn 2 - Mảnh 3 (index 4): Trái tim đỏ (từ IconCupcakeHeart.png Color Page)
      id: 'cupcake_heart', name: 'Trái tim', winThreshold: 0.94, tier: 'hard',
      free: [0, 2, 3, 5], bendFree: [1, 4],
      solBendOverride: { '0': -0.055, '1': -0.028, '2': -0.028, '3': -0.032, '4': -0.048, '5': -0.062 },
      pattern: { kind: 'dots', base: '#E43A40', deep: '#BC1C22', accent: '#FF8A8E' },
      fabric: {
        mat: 'felt', base: '#EA242B', light: '#FF6A70', dark: '#B40E15', line: '#68060C',
        deep: { base: '#E61E24', light: '#FF5E66', dark: '#AC0A12', line: '#68060C' }
      },
      types: ['c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5], inner: [], locked: [1, 4],
      sol: [
        [0.556, 0.385], [0.744, 0.394], [0.723, 0.637],
        [0.320, 0.737], [0.224, 0.464], [0.355, 0.220]
      ],
      start: [
        [0.550, 0.190], [0.744, 0.394], [0.800, 0.720],
        [0.440, 0.850], [0.224, 0.464], [0.260, 0.160]
      ]
    },
    {
      // Màn 3 - Mảnh 1 (index 5): Thân vịt vàng (từ ICON-duck.png Color Page)
      id: 'duck_body', name: 'Thân vịt', winThreshold: 0.94, tier: 'hard',
      free: [0, 2, 4, 6, 8], bendFree: [0, 5],
      solBendOverride: { '0': 0.035, '1': 0.017, '2': 0.006, '3': -0.008, '4': -0.008, '5': -0.043, '6': 0.013, '7': 0.017, '8': -0.029 },
      pattern: { kind: 'dots', base: '#EACC3A', deep: '#CFA61A', accent: '#FFF2A0' },
      fabric: {
        mat: 'felt', base: '#F5D61E', light: '#FFED66', dark: '#C89E0E', line: '#705204',
        deep: { base: '#F2D218', light: '#FFE95C', dark: '#BE9408', line: '#705204' }
      },
      types: ['c', 'c', 's', 's', 'c', 'c', 's', 's', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7, 8], inner: [], locked: [1, 3, 5, 7],
      sol: [
        [0.060, 0.430], [0.250, 0.445], [0.448, 0.398], [0.605, 0.315], [0.745, 0.320],
        [0.807, 0.470], [0.878, 0.670], [0.505, 0.735], [0.115, 0.695]
      ],
      start: [
        [0.100, 0.240], [0.250, 0.445], [0.460, 0.220], [0.605, 0.315], [0.810, 0.210],
        [0.807, 0.470], [0.900, 0.780], [0.505, 0.735], [0.140, 0.830]
      ]
    },
    {
      // Màn 3 - Mảnh 2 (index 6): Đầu & mỏ vịt (từ ICON-duck.png Color Page)
      id: 'duck_head', name: 'Đầu vịt', winThreshold: 0.94, tier: 'hard',
      free: [1, 2, 4, 5, 7], bendFree: [2, 5],
      solBendOverride: { '0': -0.019, '1': -0.036, '2': -0.052, '3': -0.036, '4': -0.025, '5': -0.045 },
      pattern: { kind: 'dots', base: '#EED246', deep: '#D2AA1C', accent: '#FFF4A8' },
      fabric: {
        mat: 'felt', base: '#F5D61E', light: '#FFED66', dark: '#C89E0E', line: '#705204',
        deep: { base: '#F2D218', light: '#FFE95C', dark: '#BE9408', line: '#705204' }
      },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 's', 's'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7], inner: [], locked: [0, 3, 6],
      sol: [
        [0.449, 0.676], [0.258, 0.449], [0.312, 0.170], [0.672, 0.123],
        [0.800, 0.379], [0.939, 0.490], [0.701, 0.583], [0.589, 0.694]
      ],
      start: [
        [0.449, 0.676], [0.160, 0.500], [0.220, 0.150], [0.672, 0.123],
        [0.860, 0.250], [0.920, 0.590], [0.701, 0.583], [0.600, 0.840]
      ]
    },
    {
      // Màn 3 - Mảnh 3 (index 7): Sóng nước xanh (từ ICON-duck.png Color Page, gợn sóng bo tròn nằm gọn vòng tròn sân khấu)
      id: 'duck_waves', name: 'Sóng nước', winThreshold: 0.92, tier: 'hard',
      free: [1, 2, 3, 5, 7], bendFree: [1, 2],
      solBendOverride: { '0': -0.036, '1': -0.044, '2': -0.044, '3': -0.036, '4': -0.026, '5': -0.022, '6': -0.022, '7': -0.026 },
      pattern: { kind: 'rib', base: '#2C64B8', deep: '#124698', accent: '#6CA2EC' },
      fabric: {
        mat: 'felt', base: '#124AA8', light: '#4482DE', dark: '#08327A', line: '#041C48',
        deep: { base: '#0C46A4', light: '#3A7AD8', dark: '#062C6E', line: '#041C48' }
      },
      types: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
      ring: [0, 1, 2, 3, 4, 5, 6, 7], inner: [], locked: [0, 4, 6],
      sol: [
        [0.065, 0.460], [0.235, 0.455], [0.500, 0.455], [0.765, 0.455],
        [0.935, 0.460], [0.815, 0.595], [0.500, 0.605], [0.185, 0.595]
      ],
      start: [
        [0.065, 0.460], [0.270, 0.250], [0.500, 0.250], [0.730, 0.250],
        [0.935, 0.460], [0.830, 0.770], [0.500, 0.605], [0.170, 0.770]
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
    { id: 'cupcake', label: 'Màn 2', levels: [2, 3, 4], order: [2, 3, 4], seams: [[2, 0, 0], [3, 0, 0], [4, 0, 0]],
      place: { 2: [53.2, 319.6, 280], 3: [55, 252.4, 280], 4: [172.6, 249.6, 160] } },
    { id: 'duck', label: 'Màn 3', levels: [5, 6, 7], order: [5, 6, 7], seams: [[5, 0, 0], [6, 0, 0], [7, 0, 0]],
      place: { 5: [66.2, 300.0, 243], 6: [127.0, 253.8, 196], 7: [60.0, 340.0, 270] } },
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

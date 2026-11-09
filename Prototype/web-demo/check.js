// Kiểm tra hàng loạt dữ liệu màn: ngưỡng, độ khớp ban đầu, độ khớp khi cắm đủ chốt mà chưa uốn dây, độ nhạy, quy chuẩn khoảng cách
// Chạy: node check.js [thư mục chứa core.js, levels.js, startgen.js]
const dir = process.argv[2] || require('path').join(__dirname, 'web');
const GN = require(dir + '/core.js');
const LEVELS = require(dir + '/levels.js').LEVELS;
require(dir + '/startgen.js');
const N = GN.N, tmpB = new Uint8Array(N * N);
function mask(l, pos, x, bends) {
  const out = new Uint8Array(N * N); GN.region(l, pos, out, bends);
  if (l.fold) {
    const isY = l.fold.axis === 'y';
    const mp = pos.map(p => isY ? [p[0], 2 * x - p[1]] : [2 * x - p[0], p[1]]); mp._mir = -1;
    GN.region(l, mp, tmpB, bends); for (let i = 0; i < out.length; i++) out[i] |= tmpB[i];
  }
  return out;
}
const f3 = v => (v * 100).toFixed(1);
for (const l of LEVELS) {
  const x = l.fold ? l.fold.solX : 0;
  const sol = mask(l, l.sol, x, l.solBend);
  const self = GN.iou(mask(l, l.sol, x, l.solBend), sol) - GN.bendPenalty(l, l.solBend);
  const pinsOnly = GN.iou(mask(l, l.sol, x, l.startBend), sol) - GN.bendPenalty(l, l.startBend);
  // jitter node tự do ±0.015 quanh lời giải, dây đúng độ uốn
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const vals = [];
  for (let i = 0; i < 200; i++) {
    const pos = l.sol.map((p, k) => l.free.includes(k) ? [p[0] + (rnd() * 2 - 1) * 0.015, p[1] + (rnd() * 2 - 1) * 0.015] : p.slice());
    vals.push(GN.iou(mask(l, pos, x, l.solBend), sol) - GN.bendPenalty(l, l.solBend));
  }
  vals.sort((a, b) => a - b);
  // quy chuẩn: khoảng cách node-node nhỏ nhất, độ dài cạnh uốn
  let minD = 9, pair = '';
  for (let i = 0; i < l.sol.length; i++) for (let j = i + 1; j < l.sol.length; j++) {
    const d = Math.hypot(l.sol[i][0] - l.sol[j][0], l.sol[i][1] - l.sol[j][1]);
    if (d < minD) { minD = d; pair = i + '-' + j; }
  }
  const bl = (l.bendFree || []).map(k => { const a = l.sol[l.ring[k]], b = l.sol[l.ring[(k + 1) % l.ring.length]]; return k + ':' + Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2); });
  console.log([l.id.padEnd(13), l.tier.padEnd(6), 'thr ' + f3(l.winThreshold), 'free ' + l.free.length, 'start ' + f3(l.startIou),
    'pinsOnly ' + f3(pinsOnly), 'self ' + f3(self), 'jit p10 ' + f3(vals[20]), 'minNN ' + minD.toFixed(3) + '(' + pair + ')', 'bend [' + bl.join(' ') + ']'].join(' | '));
}

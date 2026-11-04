// Điểm khớp khi mỗi node không khóa lệch đúng r (hướng ngẫu nhiên) khỏi lời giải.
const GN = require('./web/core.js');
const LEVELS = require('./web/levels.js').LEVELS;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const lv of LEVELS) {
  GN.prepare(lv);
  const sol = Uint8Array.from(GN.region(lv, lv.sol));
  const rows = [];
  for (const r of [0.01, 0.015, 0.02, 0.03, 0.04]) {
    const vals = [];
    for (let k = 0; k < 400; k++) {
      const pos = lv.sol.map((p, i) => { if (lv.locked.includes(i)) return p.slice(); const a = rnd() * 6.283; return [p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]; });
      vals.push(GN.iou(GN.region(lv, pos), sol));
    }
    vals.sort((a, b) => a - b);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const pass = (t) => (vals.filter(v => v >= t).length / vals.length * 100).toFixed(0) + '%';
    rows.push(`r=${r} (${(r * 324).toFixed(0)}pt) mean ${(mean * 100).toFixed(1)} p10 ${(vals[40] * 100).toFixed(1)} | qua 92: ${pass(0.92)} 90: ${pass(0.90)} 88: ${pass(0.88)} 85: ${pass(0.85)}`);
  }
  console.log(lv.id); rows.forEach(r => console.log('  ' + r));
}

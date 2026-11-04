const GN = require('./web/core.js');
const LEVELS = require('./web/levels.js').LEVELS;
for (const lv of LEVELS) {
  GN.prepare(lv);
  const sol = GN.region(lv, lv.sol);
  const solCopy = Uint8Array.from(sol);
  const self = GN.iou(GN.region(lv, lv.sol), solCopy);
  const start = GN.iou(GN.region(lv, lv.start), solCopy);
  let sum = 0, min = 1, n = 200, seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const pos = lv.sol.map((p, k) => lv.locked.includes(k) ? p.slice() : [p[0] + (rnd() * 2 - 1) * 0.02, p[1] + (rnd() * 2 - 1) * 0.02]);
    const v = GN.iou(GN.region(lv, pos), solCopy); sum += v; min = Math.min(min, v);
  }
  let area = 0; for (const c of solCopy) area += c;
  const t0 = Date.now(); for (let i = 0; i < 50; i++) GN.region(lv, lv.start); const ms = (Date.now() - t0) / 50;
  console.log(lv.id, 'self', self.toFixed(3), 'start', start.toFixed(3), 'jitter avg', (sum / n).toFixed(3), 'min', min.toFixed(3), 'area', area, 'ms', ms.toFixed(2), 'contour segs', GN.contour(solCopy).length / 6);
}

// Xuất level của web-demo ra file JSON đúng định dạng level (đặc tả mục Dữ liệu một level) cùng số đo đối chiếu,
// làm dữ liệu test EditMode cho GraphNode.Core. Chạy: node export-fixtures.js [thư mục đích]
// Không đặt trong Content/Levels: đây là dữ liệu test, không phải level của game.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'web');
const GN = require(dir + '/core.js');
const LEVELS = require(dir + '/levels.js').LEVELS;
const PRODUCTS = require(dir + '/levels.js').PRODUCTS;
// ghi lại level nào có bendFree do người thiết kế đặt, trước khi startgen tự chọn cho các level còn lại
const designerBendFree = new Set(LEVELS.filter(l => l.bendFree).map(l => l.id));
require(dir + '/startgen.js'); // chuẩn bị level và sinh vị trí đầu (start, startBend, bendFree, startIou)
const out = process.argv[2] || path.join(__dirname, '..', '..', 'Assets', 'Tests', 'EditMode', 'Fixtures', 'WebDemo');
fs.mkdirSync(out, { recursive: true });

const N = GN.N, tmp = new Uint8Array(N * N);
function mask(l, pos, x, bends) {
  const m = new Uint8Array(N * N); GN.region(l, pos, m, bends);
  if (l.fold) {
    const isY = l.fold.axis === 'y';
    const mp = pos.map(p => isY ? [p[0], 2 * x - p[1]] : [2 * x - p[0], p[1]]); mp._mir = -1;
    GN.region(l, mp, tmp, bends); for (let i = 0; i < m.length; i++) m[i] |= tmp[i];
  }
  return m;
}
const count = m => { let c = 0; for (let i = 0; i < m.length; i++) c += m[i]; return c; };
const r6 = v => Math.round(v * 1e6) / 1e6;
const r6a = a => a.map(r6);

const expected = { source: 'Prototype/web-demo', generated: new Date().toISOString().slice(0, 10), grid: { n: N, lo: GN.LO, hi: GN.HI }, levels: {} };
for (const l of LEVELS) {
  const prod = PRODUCTS.find(p => p.levels.indexOf(LEVELS.indexOf(l)) >= 0);
  const n = l.ring.length;
  const level = {
    schemaVersion: 2, id: l.id, productId: prod ? prod.id : null, slotIndex: prod ? prod.levels.indexOf(LEVELS.indexOf(l)) : 0,
    difficulty: l.tier, winThreshold: l.winThreshold, startSeed: 0, keepStart: !!l.keepStart,
    nodes: l.sol.map((p, i) => ({ id: i, type: l.types ? l.types[i] : 'c', locked: l.locked.indexOf(i) >= 0, solutionPos: r6a(p), startPos: r6a(l.start[i]) })),
    ring: l.ring, innerEdges: l.inner,
    bendFree: l.bendFree || [], startBend: r6a(l.startBend.slice(0, n)),
    fabricId: l.id
  };
  if (l.straight) level.straightEdges = l.straight;
  if (l.solBendOverride) level.solBendOverride = l.solBendOverride;
  if (l.fold) level.fold = { axis: l.fold.axis || 'x', solX: l.fold.solX, startX: l.fold.startX, chains: l.fold.chains };
  fs.writeFileSync(path.join(out, l.id + '.level.json'), JSON.stringify(level, null, 2) + '\n');

  const x0 = l.fold ? l.fold.solX : 0, xs = l.fold ? l.fold.startX : 0;
  const solM = mask(l, l.sol, x0, l.solBend), startM = mask(l, l.start, xs, l.startBend), pinsM = mask(l, l.sol, x0, l.startBend);
  const edges = [];
  for (let k = 0; k < n; k++) {
    edges.push({
      k, sol: r6a(GN.edgePoly(l, l.sol, l.ring[k], l.ring[(k + 1) % n], 24, [], l.solBend)),
      start: r6a(GN.edgePoly(l, l.start, l.ring[k], l.ring[(k + 1) % n], 24, [], l.startBend))
    });
  }
  expected.levels[l.id] = {
    solBend: r6a(l.solBend.slice(0, n)), wasCurved: l.wasCurved.slice(0, n),
    bendFreeByDesigner: designerBendFree.has(l.id), startScore: r6(l.startIou),
    startLine: l.fold ? l.fold.startX : 0,
    maskAreaSol: count(solM), maskAreaStart: count(startM),
    bendPenaltyStart: r6(GN.bendPenalty(l, l.startBend)),
    scoreSelf: r6(GN.iou(solM, solM) - GN.bendPenalty(l, l.solBend)),
    scoreStart: r6(GN.iou(startM, solM) - GN.bendPenalty(l, l.startBend)),
    scorePinsOnly: r6(GN.iou(pinsM, solM) - GN.bendPenalty(l, l.startBend)),
    edges24: edges
  };
}
fs.writeFileSync(path.join(out, 'expected.json'), JSON.stringify(expected) + '\n');
console.log('wrote ' + LEVELS.length + ' levels to ' + out);

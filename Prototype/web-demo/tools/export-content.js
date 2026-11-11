// Xuất bộ màn của bản web đã duyệt thành nội dung game Unity (đặc tả mục Dữ liệu một level):
//   Assets/Content/Levels/Chapter01/<id>.json  — mỗi mảnh một file level, sau khi chạy startgen (vị trí đầu, độ uốn đầu)
//   Assets/Content/Fabrics/web-fabrics.json    — màu vải từng mảnh (bảng đậm và nét viền như hàm fab() của game.js)
// Mỗi sản phẩm là một chương ch01…ch06 theo thứ tự PRODUCTS để catalog sắp đúng thứ tự chơi.
// Chạy: node tools/export-content.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'web');
const LEVELS = require(dir + '/levels.js').LEVELS;
const PRODUCTS = require(dir + '/levels.js').PRODUCTS;
require(dir + '/startgen.js');
const root = path.join(__dirname, '..', '..', '..', 'Assets', 'Content');
const levelDir = path.join(root, 'Levels', 'Chapter01');
fs.mkdirSync(levelDir, { recursive: true });

const r6 = v => Math.round(v * 1e6) / 1e6;
const r6a = a => a.map(r6);
const hex = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
const toHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

const fabrics = [];
PRODUCTS.forEach((p, pi) => {
  p.levels.forEach((li, slot) => {
    const l = LEVELS[li], n = l.ring.length;
    const level = {
      schemaVersion: 2, id: l.id, chapterId: 'ch' + String(pi + 1).padStart(2, '0'), productId: p.id, slotIndex: slot,
      difficulty: l.tier, winThreshold: l.winThreshold, startSeed: 0, keepStart: !!l.keepStart,
      nodes: l.sol.map((q, i) => ({ id: i, type: l.types ? l.types[i] : 'c', locked: l.locked.indexOf(i) >= 0, solutionPos: r6a(q), startPos: r6a(l.start[i]) })),
      ring: l.ring, innerEdges: l.inner,
      bendFree: l.bendFree || [], startBend: r6a(l.startBend.slice(0, n)),
      fabricId: l.id
    };
    if (l.straight) level.straightEdges = l.straight;
    if (l.solBendOverride) level.solBendOverride = l.solBendOverride;
    if (l.fold) level.fold = { axis: l.fold.axis || 'x', solX: l.fold.solX, startX: l.fold.startX, chains: l.fold.chains };
    fs.writeFileSync(path.join(levelDir, l.id + '.json'), JSON.stringify(level, null, 2) + '\n');

    // cùng cách chọn màu như fab() của game.js: bảng đậm, nét viền pha 28% mực
    const f = l.fabric, src = f.deep || f;
    const rawLine = (f.deep && f.deep.line) || (f.mat === 'flat' ? '#5E1222' : f.line) || '#2A2326';
    fabrics.push({ id: l.id, base: src.base, light: src.light, dark: src.dark, line: mix(rawLine, '#2A2326', 0.28) });
  });
});
fs.writeFileSync(path.join(root, 'Fabrics', 'web-fabrics.json'), JSON.stringify({ source: 'Prototype/web-demo', fabrics }, null, 2) + '\n');
console.log('wrote ' + fabrics.length + ' levels and fabrics');

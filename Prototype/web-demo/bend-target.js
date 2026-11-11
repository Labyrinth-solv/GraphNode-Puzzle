// Test đích độ uốn theo chốt: gợi ý cho mọi cạnh lệch, dây chỉ hút khi hai đầu ở hai chốt liền nhau (chạy: node bend-target.js)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, 'web');
const texts = new Set();
const ctxProxy = new Proxy({}, {
  get: (t, k) => {
    if (k in t) return t[k];
    if (k === 'fillText') return (s) => texts.add(s);
    if (k === 'measureText') return () => ({ width: 40 });
    if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'createPattern') return () => ({});
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set: (t, k, v) => { t[k] = v; return true; }
});
const L = {};
function mkCanvas() {
  return {
    width: 0, height: 0, style: {},
    getContext: () => ctxProxy,
    addEventListener: (n, f) => { L[n] = f; },
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0 })
  };
}
const canvas = mkCanvas();
let raf = null;
const win = {
  innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
  addEventListener() {},
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (f) => { raf = f; }
};
const doc = {
  getElementById: (id) => id === 'game' ? canvas : { clientWidth: 390, clientHeight: 844 },
  createElement: () => mkCanvas(),
  fonts: null
};
const sb = {
  window: win, document: doc, navigator: {},
  requestAnimationFrame: win.requestAnimationFrame,
  Math, console, Uint8Array, Int32Array, Float32Array, Uint8ClampedArray, JSON
};

vm.createContext(sb);
for (const f of ['core.js', 'levels.js', 'startgen.js', 'game.js']) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sb, { filename: f });
}

let t = 0;
const step = (n) => {
  for (let i = 0; i < n; i++) {
    const f = raf; raf = null; t += 16.7; if (f) f(t);
  }
};
const ev = (x, y) => ({ clientX: x, clientY: y, pointerId: 1 });
const FX = 14, FY = 256, FS = 362, LV = sb.LEVELS, P = sb.PRODUCTS;

function solve(li) {
  const lv = LV[li];
  const fd = lv.fold, isY = fd && fd.axis === 'y', onF = i => fd && fd.chains.some(c => c[0] === i || c[1] === i);
  if (fd) {
    const nx = isY ? 368 : FX + fd.startX * FS, ny = isY ? FY + fd.startX * FS : 656;
    const tx = isY ? 368 : FX + fd.solX * FS,   ty = isY ? FY + fd.solX * FS : 656;
    L.pointerdown(ev(nx, ny)); step(1);
    L.pointermove(ev(tx, ty)); step(2);
    L.pointerup(ev(tx, ty)); step(2);
  }
  for (let i = 0; i < lv.sol.length; i++) {
    if (lv.locked.includes(i)) continue;
    const s = onF(i) ? (isY ? [lv.start[i][0], fd.solX] : [fd.solX, lv.start[i][1]]) : lv.start[i];
    const g = lv.sol[i];
    const sx = FX + s[0] * FS, sy = FY + s[1] * FS;
    const gx = sx + (g[0] - s[0]) * FS, gy = sy + (g[1] - s[1]) * FS;
    L.pointerdown(ev(sx, sy)); step(1);
    L.pointermove(ev(gx, gy)); step(2);
    L.pointerup(ev(gx, gy)); step(25);
  }
  for (const k of (lv.bendFree || [])) {
    const a = lv.ring[k], b = lv.ring[(k + 1) % lv.ring.length];
    const A = lv.sol[a], B = lv.sol[b];
    const mx = (A[0] + B[0]) * 0.5, my = (A[1] + B[1]) * 0.5;
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, h = lv.solBend[k] || 0;
    const sx = FX + mx * FS, sy = FY + my * FS;
    const gx = FX + (mx + nx * h) * FS, gy = FY + (my + ny * h) * FS;
    L.pointerdown(ev(sx, sy)); step(1);
    L.pointermove(ev(gx, gy)); step(2);
    L.pointerup(ev(gx, gy)); step(25);
  }
}

const GN = sb.GN;
function cen(li) {
  const sp = GN.ringPath(LV[li], LV[li].sol, 24);
  let x = 0, y = 0, n = sp.pts.length / 2;
  for (let i = 0; i < sp.pts.length; i += 2) { x += sp.pts[i]; y += sp.pts[i + 1]; }
  return LV[li].fold ? (LV[li].fold.axis === 'y' ? [x / n, LV[li].fold.solX] : [LV[li].fold.solX, y / n]) : [x / n, y / n];
}

function reward(p) {
  const homes = p.levels.length === 3 ? [[78, 704], [195, 704], [312, 704]] : p.levels.length === 1 ? [[195, 704]] : [[118, 704], [292, 704]];
  p.levels.forEach((li, k) => {
    const c = cen(li), pl = p.place[li];
    const sc = pl[2] || 250, tx = pl[0] + c[0] * sc, ty = pl[1] + c[1] * sc;
    L.pointerdown(ev(homes[k][0], homes[k][1]));
    L.pointermove(ev(tx, ty)); step(3);
    L.pointerup(ev(tx, ty)); step(30);
  });
  step(200);
  L.pointerdown(ev(195, 400));
  L.pointerup(ev(195, 400));
  step(400);
}

step(70);
const W = sb.window;
const LI = LV.findIndex(l => l.id === 'flower_leaves'), LVL = LV[LI], PI = P.findIndex(p => p.levels.includes(LI));
const S2 = (q) => [FX + q[0] * FS, FY + q[1] * FS];
function jump() { W.GNJumpTo({ pi: PI, li: LI }); step(80); }
function dragNode(i, to) {
  const a = S2(W.GNState().pos[i]), b = S2(to);
  L.pointerdown(ev(a[0], a[1])); step(1); L.pointermove(ev(b[0], b[1])); step(2); L.pointerup(ev(b[0], b[1])); step(30);
}
// kéo thân dây cạnh k tại vị trí u dọc dây (mặc định giữa dây), lệch theo pháp tuyến một đoạn off (bề rộng vải)
function dragEdge(k, off, u) {
  u = u || 0.5;
  const st = W.GNState(), n = LVL.ring.length, A = st.pos[LVL.ring[k]], B = st.pos[LVL.ring[(k + 1) % n]];
  const mx = A[0] + (B[0] - A[0]) * u, my = A[1] + (B[1] - A[1]) * u;
  const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const a = S2([mx, my]), b = S2([mx + nx * off, my + ny * off]);
  L.pointerdown(ev(a[0], a[1])); step(1);
  if (!W.GNState().edgeDrag) throw new Error('không bắt được dây cạnh ' + k);
  L.pointermove(ev(b[0], b[1])); step(2); L.pointerup(ev(b[0], b[1])); step(1);
  const zips = W.GNState().zips; // tia sáng khớp dây, đo ngay sau khi thả vì nó tắt sau 0,32 s
  step(29);
  return zips;
}
let fail = 0;
function check(name, ok, info) { console.log((ok ? '✅ ' : '❌ ') + name + (info ? ' (' + info + ')' : '')); if (!ok) fail++; }

// 1. Cắm đúng 4 chốt, uốn lệch một đường chéo: đường chéo đó phải có gợi ý (trước đây chỉ cạnh bendFree mới có)
jump();
for (let i = 0; i < 4; i++) dragNode(i, LVL.sol[i]);
dragEdge(0, 0.07, 0.3); // tránh chỗ hai đường chéo bắt chéo nhau ở giữa
let he = W.GNHintEdges(), d0 = he.find(e => e.k === 0);
check('đường chéo uốn lệch có gợi ý', !!d0 && Math.abs(d0.h) < 0.01, 'bend ' + W.GNState().bend[0].toFixed(3) + ', gợi ý ' + JSON.stringify(he.map(e => e.k)));

// 1b. Nắn đường chéo đang lệch về thẳng: phải có hiệu ứng khớp dây như cạnh cong
let zBack = dragEdge(0, -0.066, 0.3), bBack = W.GNState().bend[0];
check('nắn đường chéo về thẳng có hiệu ứng khớp dây', zBack > 0 && Math.abs(bBack) < 1e-3, 'tia sáng ' + zBack + ', bend ' + bBack.toFixed(4));
// 1c. Kéo nhẹ đường chéo đang đúng, vẫn trong vùng hút: không có hiệu ứng
let zTap = dragEdge(2, 0.025, 0.3);
check('kéo nhẹ đường chéo đang đúng không có hiệu ứng', zTap === 0, 'tia sáng ' + zTap + ', bend ' + W.GNState().bend[2].toFixed(4));

// 2. Hai đầu dây ở hai chốt liền nhau nhưng khác thứ tự lời giải: dây hút về độ uốn của cạnh lời giải giữa hai chốt đó
jump();
dragNode(0, LVL.sol[1]); dragNode(1, LVL.sol[2]); // cạnh 0 (node 0 → 1) nằm trên cạnh lời giải 1 (mút lá phải, +0,16)
dragEdge(0, 0.145);
let b0 = W.GNState().bend[0];
check('dây hút đúng đích khi đặt khác thứ tự', Math.abs(b0 - 0.16) < 1e-3, 'bend ' + b0.toFixed(4) + ', đích 0.16');

// 3. Hai đầu dây chưa ở chốt: không hút, dây giữ đúng chỗ thả (trước đây bị hút về độ uốn lời giải theo số thứ tự)
jump();
dragEdge(1, 0.145);
let b1 = W.GNState().bend[1];
check('dây chưa có chốt không bị hút', Math.abs(b1 - 0.16) > 0.005 && Math.abs(b1) > 0.1, 'bend ' + b1.toFixed(4) + ', solBend 0.16');
check('dây chưa có chốt không có gợi ý', !W.GNHintEdges().some(e => e.k === 1));
if (fail) { console.log(fail + ' kiểm tra không đạt'); process.exit(1); }

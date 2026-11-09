// Test lời giải thay thế trên Prototype/web-demo (đặt node vào chốt theo thứ tự xoay/soi gương)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = fs.existsSync(path.join(__dirname, 'web')) ? path.join(__dirname, 'web') : __dirname;
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

// Đặt node vào chốt theo cách xoay hoặc soi gương của vòng lời giải (khác thứ tự gốc), uốn dây, kiểm tra vẫn thắng.
// Chạy: node alt-solve.js
step(70);
function playAlt(id, refl, r) {
  const li = LV.findIndex(l => l.id === id), lv = LV[li], n = lv.ring.length;
  const pi = P.findIndex(p => p.levels.includes(li));
  sb.window.GNJumpTo({ pi, li }); step(60);
  const perm = []; for (let k = 0; k < n; k++) { const kk = refl ? ((r - k) % n + n) % n : (k + r) % n; perm[lv.ring[k]] = lv.ring[kk]; }
  for (let i = 0; i < n; i++) {
    if (lv.locked.includes(i)) continue;
    const s = lv.start[i], g = lv.sol[perm[i]];
    L.pointerdown(ev(FX + s[0] * FS, FY + s[1] * FS)); step(1);
    L.pointermove(ev(FX + g[0] * FS, FY + g[1] * FS)); step(2);
    L.pointerup(ev(FX + g[0] * FS, FY + g[1] * FS)); step(25);
  }
  const st0 = sb.window.GNState();
  const relabeled = st0.pos.every((p, i) => Math.hypot(p[0] - lv.sol[i][0], p[1] - lv.sol[i][1]) < 0.05);
  for (const k of (lv.bendFree || [])) {
    if (sb.window.GNState().phase !== 'play') break;
    const a = lv.ring[k], b = lv.ring[(k + 1) % n], A = lv.sol[a], B = lv.sol[b];
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const nx = -(B[1] - A[1]) / len, ny = (B[0] - A[0]) / len, h = lv.solBend[k];
    L.pointerdown(ev(FX + mx * FS, FY + my * FS)); step(1);
    L.pointermove(ev(FX + (mx + nx * h) * FS, FY + (my + ny * h) * FS)); step(2);
    L.pointerup(ev(FX + (mx + nx * h) * FS, FY + (my + ny * h) * FS)); step(25);
  }
  const st = sb.window.GNState();
  const ok = st.phase !== 'play' && st.phase !== 'intro';
  console.log((ok ? '✅ ' : '❌ ') + id + ' ' + (refl ? 'đảo' : 'xoay') + r + ': đánh số lại ' + (relabeled ? 'có' : 'không') + ', pha ' + st.phase + ', khớp ' + (st.iouV * 100).toFixed(1) + '%');
  return ok;
}
const cases = [['flower_leaves', 0, 1], ['flower_leaves', 0, 3], ['flower_leaves', 1, 0], ['flower_leaves', 0, 0], ['shirt', 1, 2], ['bunny_bow', 1, 2], ['cone', 1, 1]];
let fail = 0; for (const c of cases) if (!playAlt(...c)) fail++;
if (fail) { console.log(fail + ' trường hợp không thắng'); process.exit(1); }

// Test mô phỏng chạy toàn bộ các màn trên bản clone Prototype/web-v2 (gồm cả kéo node và kéo dây uốn cong)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname;
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
    L.pointerup(ev(gx, gy)); step(2);
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
    L.pointerup(ev(gx, gy)); step(2);
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
for (const p of P) {
  if (p.standalone) {
    const row = sb.PRODUCTS.slice(0, P.indexOf(p)).reduce((a, q) => a + q.levels.length + 1, 0);
    L.pointerdown(ev(40, 38)); L.pointerup(ev(40, 38)); step(5);
    L.pointerdown(ev(100, 62 + 6 + row * 44 + 22)); L.pointerup(ev(100, 62 + 6 + row * 44 + 22)); step(70);
  }
  for (const li of p.levels) {
    solve(li); step(400);
  }
  step(150);
  reward(p);
  if (!texts.has('Màn tiếp') && !texts.has('Chơi lại') && !texts.has('Tiếp tục')) {
    throw new Error('Product ' + p.id + ' did not finish reward! Texts: ' + Array.from(texts).join(', '));
  }
  console.log('✅ ' + p.id + ' passed successfully!');
  texts.clear();
  if (p !== P[P.length - 1]) {
    L.pointerdown(ev(195, 761)); L.pointerup(ev(195, 761)); step(70);
  }
}
console.log('🎉 Toàn bộ ' + P.length + ' sản phẩm (Kem, Cardigan, Trái tim gấp, Bé thỏ, Chậu hoa) chạy mượt mà với cơ chế Kéo Dây Uốn Cong!');

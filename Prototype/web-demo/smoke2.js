// Test web-demo: giải màn, ghép sản phẩm và kiểm tra nhịp ép hoàn thiện.
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
  matchMedia: query => ({ matches: query === '(prefers-reduced-motion: reduce)' && process.argv.includes('--reduce-motion') }),
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
  let source = fs.readFileSync(path.join(dir, f), 'utf8');
  // Chỉ mở trạng thái cho test, không thêm API debug vào bản chạy.
  if (f === 'game.js') source = source.replace('window.GNState = function', 'window.pressTestState = function () { return { reward: R, particles: S.parts }; }; window.GNState = function');
  vm.runInContext(source, sb, { filename: f });
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
  const assert = (ok, message) => { if (!ok) throw new Error(p.id + ': ' + message); };
  const state = () => sb.window.pressTestState().reward;
  step(8);
  assert(state().phase === 'press' && !state().pressHit && state().reveal === 0, 'màu chưa đổi trước khi khuôn chạm');
  assert(!sb.window.pressTestState().particles.some(x => x.kind === 'steam'), 'khói chưa xuất hiện trước tiếp xúc');
  step(7);
  assert(state().phase === 'press' && state().pressHit && state().reveal === 1 && state().decor.length > 0, 'màu và chi tiết phải hoàn thiện dưới khuôn');
  const steamCount = sb.window.pressTestState().particles.filter(x => x.kind === 'steam').length;
  assert(steamCount === (process.argv.includes('--reduce-motion') ? 8 : 22), 'khói bốc quanh mép ngay khi dập, chỉ phát một lần');
  const details = state().decor.length;
  step(7);
  assert(state().phase === 'press' && !state().pressRelease, 'phải giữ lực trước khi nhấc');
  assert(process.argv.includes('--reduce-motion') ? state().pz === 1 : state().pz < 1, 'nén nhẹ, hoặc đứng yên khi giảm chuyển động');
  step(9);
  assert(state().pressRelease && state().reveal === 1 && state().decor.length === details, 'nhấc khuôn không tô lại màu hoặc bật thêm chi tiết');
  assert(sb.window.pressTestState().particles.filter(x => x.kind === 'steam').length <= steamCount, 'không phát lại khói khi nhấc');
  step(25);
  assert(state().phase === 'reveal' && state().accentCount > 0, 'dành nhịp hồi mềm và nhấn chi tiết sau khi nhấc');
  assert(state().reveal === 1 && state().decor.length === details, 'giữ nguyên màu và đủ chi tiết trong lúc hồi');
  step(30);
  assert(state().phase === 'done' && state().pz === 1, 'thành phẩm ổn định sau khi nhấc');
  assert(state().sq === 0 && state().accentCount === Math.min(3, details), 'kết thúc nén và đủ nốt nhấn');
  step(60);
}

step(70);
for (const p of P) {
  if (p.standalone) {
    // mở danh sách màn rồi chạm đúng nút mảnh đầu của sản phẩm (vị trí nút lấy từ game)
    L.pointerdown(ev(40, 38)); L.pointerup(ev(40, 38)); step(5);
    const it = sb.window.GNMenuItems().find(m => m.pi === P.indexOf(p) && m.li === p.levels[0]);
    const cx = it.r[0] + it.r[2] / 2, cy = it.r[1] + it.r[3] / 2;
    L.pointerdown(ev(cx, cy)); L.pointerup(ev(cx, cy)); step(70);
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
console.log('🎉 Toàn bộ ' + P.length + ' sản phẩm (Kem, Cupcake, Vịt vàng, Nấm đỏ, Hạt dẻ, Hướng dương) chạy mượt mà với cơ chế Kéo Dây Uốn Cong!');

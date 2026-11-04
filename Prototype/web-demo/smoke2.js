// Chạy hết 2 sản phẩm: nấm rồi kem, kiểm tra không lỗi và tới nút "Chơi lại".
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, 'web'); const texts = new Set();
const ctxProxy = new Proxy({}, { get: (t, k) => {
  if (k in t) return t[k];
  if (k === 'fillText') return (s) => texts.add(s);
  if (k === 'measureText') return () => ({ width: 40 });
  if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
  if (k === 'createPattern') return () => ({});
  if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
  return () => {};
}, set: (t, k, v) => { t[k] = v; return true; } });
const L = {}; function mkCanvas() { return { width: 0, height: 0, style: {}, getContext: () => ctxProxy, addEventListener: (n, f) => { L[n] = f; }, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) }; }
const canvas = mkCanvas(); let raf = null;
const win = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, addEventListener() {}, matchMedia: () => ({ matches: false }), requestAnimationFrame: (f) => { raf = f; } };
const doc = { getElementById: (id) => id === 'game' ? canvas : { clientWidth: 390, clientHeight: 844 }, createElement: () => mkCanvas(), fonts: null };
const sb = { window: win, document: doc, navigator: {}, requestAnimationFrame: win.requestAnimationFrame, Math, console, Uint8Array, Int32Array, Float32Array, Uint8ClampedArray, JSON };
vm.createContext(sb); for (const f of ['core.js', 'levels.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sb, { filename: f });
let t = 0; const step = (n) => { for (let i = 0; i < n; i++) { const f = raf; raf = null; t += 16.7; f(t); } };
const ev = (x, y) => ({ clientX: x, clientY: y, pointerId: 1 });
const FX = 33, FY = 270, FS = 324, LV = sb.LEVELS, P = sb.PRODUCTS;
function solve(li) { const lv = LV[li]; for (let i = 0; i < lv.sol.length; i++) { if (lv.locked.includes(i)) continue;
  const s = lv.start[i], g = lv.sol[i], sx = FX + s[0] * FS, sy = FY + s[1] * FS, gx = sx + (g[0] - s[0]) * FS, gy = sy + (g[1] - s[1]) * FS;
  L.pointerdown(ev(sx, sy)); step(1); L.pointermove(ev(gx, gy)); step(2); L.pointerup(ev(gx, gy)); step(2); } }
const GN = sb.GN;
function cen(li) { const sp = GN.ringPath(LV[li], LV[li].sol, 24); let x = 0, y = 0, n = sp.pts.length / 2; for (let i = 0; i < sp.pts.length; i += 2) { x += sp.pts[i]; y += sp.pts[i + 1]; } return [x / n, y / n]; }
function reward(p) { const homes = p.levels.length === 3 ? [[78, 704], [195, 704], [312, 704]] : [[118, 704], [292, 704]];
  p.levels.forEach((li, k) => { const c = cen(li), pl = p.place[li]; const sc = pl[2] || 250, tx = pl[0] + c[0] * sc, ty = pl[1] + c[1] * sc;
    L.pointerdown(ev(homes[k][0], homes[k][1])); L.pointermove(ev(tx, ty)); step(3); L.pointerup(ev(tx, ty)); step(30); });
  step(200); L.pointerdown(ev(195, 400)); L.pointerup(ev(195, 400)); step(400); }
step(70);
for (const p of P) { for (const li of p.levels) { solve(li); step(400); } step(150); reward(p);
  console.log(p.id, 'texts:', [...texts].join(' | ')); texts.clear();
  if (p !== P[P.length - 1]) { L.pointerdown(ev(195, 761)); L.pointerup(ev(195, 761)); step(70); } }
console.log('ok frames', Math.round(t / 16.7));
// thử danh sách chọn màn: mở, chọn "Màn 2 · Viên kem", rồi "Màn 1 · Ghép thành phẩm" và chạm tô màu
texts.clear();
L.pointerdown(ev(40, 38)); step(5); L.pointerdown(ev(100, 62 + 6 + 3 * 44 + 22)); step(60);
console.log('menu->scoop', [...texts].filter(s => s.startsWith('Màn')).join(' | ')); texts.clear();
L.pointerdown(ev(40, 38)); step(5); L.pointerdown(ev(100, 62 + 6 + 2 * 44 + 22)); step(60);
const P0 = P[0]; const homes = [[118, 704], [292, 704]];
P0.levels.forEach((li, k) => { const c = cen(li), pl = P0.place[li]; L.pointerdown(ev(homes[k][0], homes[k][1])); L.pointermove(ev(pl[0] + c[0] * 250, pl[1] + c[1] * 250)); step(3); L.pointerup(ev(pl[0] + c[0] * 250, pl[1] + c[1] * 250)); step(30); });
step(200); L.pointerdown(ev(195, 400)); L.pointerup(ev(195, 400)); step(400);
console.log('menu->reward1', [...texts].join(' | '));

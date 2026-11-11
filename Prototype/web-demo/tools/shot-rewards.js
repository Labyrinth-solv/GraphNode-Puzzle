// Chụp cảnh hoàn thiện của từng sản phẩm bằng Chrome không giao diện (CDP qua WebSocket của Node 22+), để xem nhanh
// hình mảnh sau khi đổi cách tô. Cần server của web-demo đang chạy (node web/server.js, cổng 3000).
// Chạy: node tools/shot-rewards.js [thư mục ảnh]
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const out = process.argv[2] || path.join(os.tmpdir(), 'web-demo-shots');
fs.mkdirSync(out, { recursive: true });
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-shot-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=' + profile,
  '--window-size=390,844', '--force-device-scale-factor=2', '--autoplay-policy=no-user-gesture-required', 'about:blank']);
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  let targets;
  for (let i = 0; i < 50 && !targets; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); } catch (e) { await wait(200); }
  }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = {};
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    return r.result.result.value;
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: false });
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await wait(1500);
  const count = await evaluate('window.PRODUCTS.length');
  const errors = [];
  for (let pi = 0; pi < count; pi++) {
    const phase = await evaluate(`(async () => {
      const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), k = r.width / 390;
      const fire = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { clientX: r.left + x * k, clientY: r.top + y * k, pointerId: 1, bubbles: true, isPrimary: true, pointerType: 'mouse', buttons: 1 }));
      const wait = ms => new Promise(res => setTimeout(res, ms));
      const P = window.PRODUCTS[${pi}], L = window.LEVELS;
      window.GNJumpTo({ pi: ${pi}, li: -1 });
      await wait(1200);
      const homes = P.levels.length === 3 ? [[78, 704], [195, 704], [312, 704]] : P.levels.length === 1 ? [[195, 704]] : [[118, 704], [292, 704]];
      for (let j = 0; j < P.levels.length; j++) {
        const li = P.levels[j], sp = window.GN.ringPath(L[li], L[li].sol, 24);
        let x = 0, y = 0, n = sp.pts.length / 2;
        for (let i = 0; i < sp.pts.length; i += 2) { x += sp.pts[i]; y += sp.pts[i + 1]; }
        const pl = P.place[li], sc = pl[2] || 250, tx = pl[0] + x / n * sc, ty = pl[1] + y / n * sc;
        fire('pointerdown', homes[j][0], homes[j][1]); await wait(80);
        fire('pointermove', tx, ty); await wait(80);
        fire('pointerup', tx, ty); await wait(700);
      }
      await wait(4500);
      fire('pointerdown', 195, 400); fire('pointerup', 195, 400);
      await wait(7000);
      return window.GNState().rphase;
    })()`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(out, `reward-${pi}.png`);
    fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    console.log(pi, phase, file);
    if (phase !== 'done') errors.push(pi);
  }
  ws.close();
  chrome.kill();
  if (errors.length) { console.error('not done:', errors); process.exitCode = 1; }
}
main().catch(e => { console.error(e); chrome.kill(); process.exitCode = 1; });

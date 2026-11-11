// Máy chủ nhỏ cho các trang xuất tài nguyên của web-demo: phục vụ trang, nhận tệp trang gửi lên và ghi vào Unity.
//   /        -> export-sprites.html, ghi PNG vào Assets/Art/Sprites/WebDemo
//   /audio   -> export-audio.html, ghi WAV vào Assets/Audio/Sfx/WebDemo
// Chạy: node tools/export-sprites.js [cổng], rồi mở http://localhost:<cổng>/ hoặc /audio trong trình duyệt.
const http = require('http'), fs = require('fs'), path = require('path');
const port = +(process.argv[2] || 3077);
const root = path.join(__dirname, '..', '..', '..', 'Assets');
const outDirs = { png: path.join(root, 'Art', 'Sprites', 'WebDemo'), audio: path.join(root, 'Audio', 'Sfx', 'WebDemo') };
for (const d of Object.values(outDirs)) fs.mkdirSync(d, { recursive: true });
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/save') {
    const name = (url.searchParams.get('name') || '').replace(/[^a-z0-9_]/gi, '');
    const audio = url.searchParams.get('kind') === 'audio';
    if (!name) { res.writeHead(400); return res.end(); }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const file = path.join(audio ? outDirs.audio : outDirs.png, name + (audio ? '.wav' : '.png'));
      fs.writeFileSync(file, Buffer.concat(chunks));
      console.log('saved ' + path.basename(file));
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  const page = path.join(__dirname, url.pathname.startsWith('/audio') ? 'export-audio.html' : 'export-sprites.html');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(page));
}).listen(port, '127.0.0.1', () => console.log('export server on http://localhost:' + port));

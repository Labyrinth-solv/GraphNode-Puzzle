// Máy chủ nhỏ cho export-sprites.html: phục vụ trang, nhận PNG trang gửi lên và ghi vào thư mục sprite của Unity.
// Chạy: node tools/export-sprites.js [cổng] [thư mục đích], rồi mở http://localhost:<cổng>/ trong trình duyệt.
const http = require('http'), fs = require('fs'), path = require('path');
const port = +(process.argv[2] || 3077);
const outDir = process.argv[3] || path.join(__dirname, '..', '..', '..', 'Assets', 'Art', 'Sprites', 'WebDemo');
fs.mkdirSync(outDir, { recursive: true });
const page = path.join(__dirname, 'export-sprites.html');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/save') {
    const name = (url.searchParams.get('name') || '').replace(/[^a-z0-9_]/gi, '');
    if (!name) { res.writeHead(400); return res.end(); }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.concat(chunks));
      console.log('saved ' + name + '.png');
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(page));
}).listen(port, '127.0.0.1', () => console.log('export server on http://localhost:' + port + ' -> ' + outDir));

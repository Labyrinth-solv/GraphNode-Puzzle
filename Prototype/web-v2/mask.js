/* Bảng chỉnh màu và độ đậm vùng tô: công cụ thiết kế để thử, chưa phải tính năng trong game. Đổi là thấy ngay trong game; Lưu thì ghi vào db của artifact
   (collection "settings", doc "mask") để mọi lần mở và Claude đọc lại được; không có db thì lưu tạm trong trình duyệt này. */
(function () {
  'use strict';
  var KEY = 'gn-mask', DEFAULT = { color: '#E996A0', opacity: 20 };
  // Bảng màu cozy: hồng, đào, mơ, bơ, trà sữa, xô thơm, bạc hà, xanh khói, oải hương, kem
  var SWATCHES = [
    ['#E996A0', 'Hồng phấn'], ['#F2B5A0', 'Hồng đào'], ['#F4C38A', 'Mơ chín'], ['#F6DE9C', 'Kem bơ'], ['#C9A27E', 'Trà sữa'],
    ['#A9C1A0', 'Xô thơm'], ['#A8D5C2', 'Bạc hà'], ['#9DB8C9', 'Xanh khói'], ['#C3B1D9', 'Oải hương'], ['#FFF6E6', 'Kem sữa']
  ];
  var btn = document.getElementById('maskBtn'), panel = document.getElementById('maskPanel'), grid = document.getElementById('maskSwatches');
  var custom = document.getElementById('maskCustom'), alpha = document.getElementById('maskAlpha'), pct = document.getElementById('maskPct');
  var note = document.getElementById('maskNote'), prev = document.querySelector('#maskPreview b'), dbRef = null;
  var cur = { color: DEFAULT.color, opacity: DEFAULT.opacity }, saved = { color: DEFAULT.color, opacity: DEFAULT.opacity };

  function valid(m) { return m && /^#[0-9a-fA-F]{6}$/.test(m.color) && m.opacity >= 15 && m.opacity <= 85; }
  function apply(m) { if (window.GNSetMask) window.GNSetMask(m.color, m.opacity / 100); }
  function readLocal() { try { var m = JSON.parse(localStorage.getItem(KEY) || 'null'); return valid(m) ? m : null; } catch (e) { return null; } }
  function writeLocal(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }

  function sync() {
    custom.value = cur.color; alpha.value = String(cur.opacity); pct.textContent = cur.opacity + '%';
    prev.style.background = cur.color; prev.style.opacity = String(cur.opacity / 100);
    grid.querySelectorAll('.swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c.toLowerCase() === cur.color.toLowerCase())); });
    apply(cur);
  }
  SWATCHES.forEach(function (sw) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'swatch'; b.dataset.c = sw[0];
    b.style.background = sw[0]; b.setAttribute('aria-label', sw[1]); b.title = sw[1];
    b.addEventListener('click', function () { cur.color = sw[0]; note.textContent = sw[1]; sync(); });
    grid.appendChild(b);
  });
  custom.addEventListener('input', function () { cur.color = custom.value.toUpperCase(); note.textContent = 'Màu tự chọn ' + cur.color; sync(); });
  alpha.addEventListener('input', function () { cur.opacity = Math.round(Number(alpha.value)); sync(); });

  btn.addEventListener('click', function () { cur = { color: saved.color, opacity: saved.opacity }; note.textContent = ''; sync(); panel.hidden = false; });
  // đóng không lưu thì trả về màu đã lưu
  document.getElementById('maskClose').addEventListener('click', function () { cur = { color: saved.color, opacity: saved.opacity }; sync(); panel.hidden = true; });
  document.getElementById('maskSave').addEventListener('click', function () {
    saved = { color: cur.color, opacity: cur.opacity }; writeLocal(saved);
    if (!dbRef) { note.textContent = 'Đã lưu trên trình duyệt này.'; return; }
    note.textContent = 'Đang lưu…';
    dbRef.collection('settings').doc('mask').set({ color: saved.color, opacity: saved.opacity })
      .then(function () { note.textContent = 'Đã lưu.'; }, function () { note.textContent = 'Không lưu được lên artifact; đã lưu trên trình duyệt này.'; });
  });

  var local = readLocal(); if (local) { saved = local; cur = { color: local.color, opacity: local.opacity }; }
  sync();
  if (window.claude && window.claude.use) {
    window.claude.use('db').then(function (db) {
      if (!db) return;
      dbRef = db;
      db.collection('settings').doc('mask').get().then(function (snap) {
        var m = snap && snap.exists !== false && snap.data ? snap.data() : null;
        if (valid(m)) { saved = { color: m.color, opacity: m.opacity }; cur = { color: m.color, opacity: m.opacity }; sync(); }
      }, function () {});
    }, function () {});
  }
})();

/* Bảng sửa ngưỡng thắng từng hình (công cụ thử). Lưu vào db của artifact để mọi lần mở và Claude đều đọc lại được;
   không có db thì lưu tạm trong trình duyệt này. */
(function () {
  'use strict';
  var KEY = 'gn-thresholds-v3-tier';
  // collection mới: collection 'thresholds' cũ còn ngưỡng trước khi chuẩn hóa theo tier, nếu đọc sẽ ghi đè số trong levels.js
  var DB_COLL = 'thresholds_v2';
  var btn = document.getElementById('thrBtn'), panel = document.getElementById('thrPanel');
  var list = document.getElementById('thrList'), note = document.getElementById('thrNote'), dbRef = null;

  // Xóa cache cũ nếu còn tồn đọng trong localStorage của trình duyệt từ các phiên trước
  try {
    localStorage.removeItem('gn-thresholds');
  } catch (e) {}

  var TIER_DEFAULTS = {
    easy: 0.94,
    medium: 0.95,
    hard: 0.96
  };

  function defaultFor(l) {
    if (l.winThreshold) return l.winThreshold;
    return TIER_DEFAULTS[l.tier] || 0.95;
  }

  function apply(map) {
    Object.keys(map).forEach(function (id) {
      var v = Number(map[id]);
      if (v >= 0.5 && v <= 0.99 && window.GNSetThreshold) window.GNSetThreshold(id, v);
    });
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function writeLocal(map) { try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {} }

  function render() {
    list.textContent = '';
    LEVELS.forEach(function (l) {
      var row = document.createElement('label'); row.className = 'thr-row'; row.htmlFor = 'thr-' + l.id;
      var name = document.createElement('span');
      var tierTag = l.tier ? ' · ' + l.tier.toUpperCase() : '';
      name.textContent = l.name + tierTag;
      var wrap = document.createElement('span'); wrap.className = 'thr-in';
      var inp = document.createElement('input'); inp.type = 'number'; inp.id = 'thr-' + l.id; inp.min = '50'; inp.max = '99'; inp.step = '1';
      var currentThr = l.winThreshold || defaultFor(l);
      inp.value = String(Math.round(currentThr * 100)); inp.dataset.id = l.id;
      var pct = document.createElement('span'); pct.textContent = '%';
      wrap.appendChild(inp); wrap.appendChild(pct); row.appendChild(name); row.appendChild(wrap); list.appendChild(row);
    });
  }

  btn.addEventListener('click', function () { render(); note.textContent = ''; panel.hidden = false; });
  document.getElementById('thrClose').addEventListener('click', function () { panel.hidden = true; });

  var resetBtn = document.getElementById('thrReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      var map = {};
      LEVELS.forEach(function (l) {
        var defVal = defaultFor(l);
        map[l.id] = defVal;
      });
      apply(map);
      render();
      note.textContent = 'Đã đặt lại về ngưỡng mặc định theo Tier (Easy 94%, Medium 95%, Hard 96%).';
    });
  }

  document.getElementById('thrSave').addEventListener('click', function () {
    var map = {}, bad = false;
    list.querySelectorAll('input').forEach(function (inp) {
      var v = Math.round(Number(inp.value));
      if (!(v >= 50 && v <= 99)) { bad = true; return; }
      map[inp.dataset.id] = v / 100;
    });
    if (bad) { note.textContent = 'Ngưỡng phải từ 50 đến 99%.'; return; }
    apply(map); writeLocal(map);
    if (!dbRef) { note.textContent = 'Đã lưu trên trình duyệt này.'; return; }
    note.textContent = 'Đang lưu…';
    Promise.all(Object.keys(map).map(function (id) { return dbRef.collection(DB_COLL).doc(id).set({ value: map[id] }); }))
      .then(function () { note.textContent = 'Đã lưu.'; }, function () { note.textContent = 'Không lưu được lên artifact; đã lưu trên trình duyệt này.'; });
  });

  apply(readLocal());
  if (window.claude && window.claude.use) {
    window.claude.use('db').then(function (db) {
      if (!db) return;
      dbRef = db;
      db.collection(DB_COLL).get().then(function (snap) {
        var map = {};
        snap.docs.forEach(function (d) { var x = d.data(); if (x && typeof x.value === 'number') map[d.id] = x.value; });
        apply(map);
      }, function () {});
    }, function () {});
  }
})();

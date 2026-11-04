/* Màn chơi: vẽ bằng một canvas khung dọc 390×844, mọi số đo theo pt của wireframe. */
(function () {
  'use strict';
  var W = 390, H = 844;
  var C = {
    bg: '#F6EFE3', paper: '#FBF7EF', card: '#FFFDF8', ink: '#4A3B35', inkSoft: '#6B5B53', mute: '#9C8E86',
    rose: '#E3A6A1', roseDeep: '#D4837C', sage: '#A9C1A0', sageDeep: '#82A57C', mustard: '#E9C46A', mustardDeep: '#CF9F3A',
    blue: '#9DB8C9', fabric: '#F3DED6', weave: '#E8CCC2', thread: '#C29C90', hole: '#E3C2B6', chip: '#F1E1CF',
    barFar: '#EEB8B0', barMid: '#D88A74', barNear: '#5DB582', base: '#EEE2CB', baseDeep: '#F0CF83', cream: '#FFF7E8'
  };
  var FONT = '"Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif';
  var FX = 33, FY = 270, FS = 324;                 // tấm vải vuông trong thẻ trắng
  var THR_DEFAULT = 0.92, M1 = 0.70, M2 = 0.85;     // ngưỡng mặc định của đặc tả và hai mốc màu; ngưỡng thật lấy theo level
  var RUN_SPEED = 0.68;                              // bề rộng vải mỗi giây
  var PICK_MIN = 0.071, PICK_MAX = 0.19, MOVE_EPS = 0.016;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cv = document.getElementById('game'), ctx = cv.getContext('2d'), wrap = document.getElementById('stage');
  var scale = 1, dpr = 1;
  function resize() {
    var vw = wrap.clientWidth, vh = wrap.clientHeight;
    scale = Math.min(vw / W, vh / H);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.style.width = Math.round(W * scale) + 'px';
    cv.style.height = Math.round(H * scale) + 'px';
    cv.width = Math.round(W * scale * dpr);
    cv.height = Math.round(H * scale * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- tiện ích ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeBack(t) { t = clamp(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')'; }
  function rgba(c, a) { var A = hex(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }
  function X(x) { return FX + x * FS; }
  function Y(y) { return FY + y * FS; }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(s, x, y, size, weight, color, align) {
    ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  }
  function vib(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ---------- âm thanh: tiếng pop trong, thang ngũ cung ---------- */
  var AC = null, soundOn = true, master = null;
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  function ensureAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination); } catch (e) { AC = null; }
  }
  function noteF(n) { return 523.25 * Math.pow(2, PENTA[((n % PENTA.length) + PENTA.length) % PENTA.length] / 12); }
  function pop(f, vol, when, dur) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime + (when || 0); dur = dur || 0.22;
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.9, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    var o2 = AC.createOscillator(), g2 = AC.createGain();
    o2.type = 'sine'; o2.frequency.setValueAtTime(f * 2.01, t);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.25, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.4);
    o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + dur);
  }
  function noise(dur, vol, freq, type, when) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime + (when || 0), n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = b; f.type = type || 'highpass'; f.frequency.value = freq || 2800; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function chord(ns, vol, gap) { for (var i = 0; i < ns.length; i++) pop(noteF(ns[i]), vol, i * (gap || 0.07), 0.5); }

  /* ---------- dữ liệu level ---------- */
  var LV = LEVELS.map(function (l) {
    GN.prepare(l);
    var solMask = Uint8Array.from(GN.region(l, l.sol));
    var sp = GN.ringPath(l, l.sol, 24);
    var minx = 9, miny = 9, maxx = -9, maxy = -9, cx = 0, cy = 0, n = sp.pts.length / 2;
    for (var i = 0; i < sp.pts.length; i += 2) {
      minx = Math.min(minx, sp.pts[i]); maxx = Math.max(maxx, sp.pts[i]); miny = Math.min(miny, sp.pts[i + 1]); maxy = Math.max(maxy, sp.pts[i + 1]);
      cx += sp.pts[i]; cy += sp.pts[i + 1];
    }
    return { def: l, solMask: solMask, solPath: sp, outline: sp.pts, bbox: [minx, miny, maxx, maxy], cen: [cx / n, cy / n] };
  });

  /* ---------- trạng thái ---------- */
  var S = {
    scene: 'play', phase: 'intro', t: 0, li: 0, pos: null, mask: new Uint8Array(GN.N * GN.N), seg: [],
    iouV: 0, lastIou: 0, dv: 0, dirty: true, drag: null, hints: 3, hint: null, done: [false, false],
    runK: 0, runT: 0, runDist: 0, path: null, lit: [], sc: [], pl: [], shake: [], ripples: [], parts: [],
    speed: 1, firstTouch: false, toast: 0, flash: 0, readyPulse: 0, fade: 0, snipPhase: 0, pi: 0
  };
  function product() { return PRODUCTS[S.pi]; }
  /* ---------- danh sách chọn màn để thử nhanh ---------- */
  var MENU = [];
  PRODUCTS.forEach(function (p, pi) {
    p.levels.forEach(function (li) { MENU.push({ label: p.label + ' · ' + LEVELS[li].name, pi: pi, li: li }); });
    MENU.push({ label: p.label + ' · Ghép thành phẩm', pi: pi, li: -1 });
  });
  var MENU_X = 20, MENU_Y = 62, MENU_W = 240, ROW_H = 44;
  function menuCurrent(m) { return m.pi === S.pi && (m.li === -1 ? S.scene === 'reward' : (S.scene === 'play' && m.li === S.li)); }
  function jumpTo(m) {
    S.parts = []; S.ripples = []; S.pi = m.pi; S.done = []; R = null; activeId = null;
    var lv = PRODUCTS[m.pi].levels;
    if (m.li === -1) { lv.forEach(function (l) { S.done[l] = true; }); S.scene = 'reward'; startReward(); }
    else { for (var k = 0; k < lv.indexOf(m.li); k++) S.done[lv[k]] = true; S.scene = 'play'; loadLevel(m.li); }
    pop(noteF(2), 0.05);
  }
  function drawMenu() {
    if (!S.menu) return;
    ctx.save(); ctx.fillStyle = 'rgba(74,59,53,0.18)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.shadowColor = 'rgba(74,59,53,0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    rr(MENU_X, MENU_Y, MENU_W, MENU.length * ROW_H + 12, 16); ctx.fillStyle = C.card; ctx.fill(); ctx.restore();
    rr(MENU_X, MENU_Y, MENU_W, MENU.length * ROW_H + 12, 16); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
    MENU.forEach(function (m, k) {
      var y = MENU_Y + 6 + k * ROW_H;
      if (menuCurrent(m)) { rr(MENU_X + 6, y + 3, MENU_W - 12, ROW_H - 6, 10); ctx.fillStyle = C.chip; ctx.fill(); }
      if (k > 0 && MENU[k - 1].pi !== m.pi) { ctx.fillStyle = rgba(C.ink, 0.15); ctx.fillRect(MENU_X + 14, y, MENU_W - 28, 1.5); }
      text(m.label, MENU_X + 18, y + ROW_H / 2 + 1, 15, m.li === -1 ? 700 : 600, C.ink, 'left');
    });
  }
  function loadProduct(p) { S.pi = p; S.done = []; S.scene = 'play'; R = null; loadLevel(PRODUCTS[p].levels[0]); }
  // Mốc màu thanh khớp: 70% và 85% theo đặc tả; level có ngưỡng thấp hơn thì kéo hai mốc xuống dưới ngưỡng.
  function m2() { return Math.min(M2, S.thr); }
  function m1() { return Math.min(M1, S.thr - 0.08); }
  // Bảng sửa ngưỡng gọi vào đây để áp ngưỡng mới ngay cho màn đang chơi.
  window.GNSetThreshold = function (id, v) {
    LEVELS.forEach(function (l) { if (l.id === id) l.winThreshold = v; });
    if (LV[S.li] && LV[S.li].def.id === id) { S.thr = v; S.lastIou = S.iouV; }
  };

  function loadLevel(i) {
    S.li = i; var d = LV[i].def; S.thr = d.winThreshold || THR_DEFAULT;
    S.pos = d.start.map(function (p) { return p.slice(); });
    S.sc = d.sol.map(function () { return 0; });
    S.pl = d.sol.map(function () { return 0; });
    S.shake = d.sol.map(function () { return -9; });
    S.lit = []; S.drag = null; S.hint = null; S.dirty = true; S.runK = 0; S.runT = 0; S.speed = 1; S.firstTouch = false;
    setPhase('intro');
    recompute(); S.lastIou = S.iouV; S.dv = barValue(S.iouV);
  }
  function setPhase(p) { S.phase = p; S.t = 0; }
  function locked(i) { return LV[S.li].def.locked.indexOf(i) >= 0; }
  function barValue(v) { return clamp((v - 0.5) / (S.thr - 0.5), 0, 1); }
  function recompute() {
    var lv = LV[S.li];
    GN.region(lv.def, S.pos, S.mask);
    S.iouV = GN.iou(S.mask, lv.solMask);
    GN.contour(S.mask, S.seg);
    S.dirty = false;
  }

  /* ---------- nhập liệu ---------- */
  function toLogical(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; }
  function inRect(p, x, y, w, h) { return p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h; }
  var activeId = null;

  cv.addEventListener('pointerdown', function (e) {
    ensureAudio();
    if (activeId !== null) return; // chỉ một ngón
    var p = toLogical(e);
    if (S.menu) {
      var row = Math.floor((p[1] - MENU_Y - 6) / ROW_H);
      if (inRect(p, MENU_X, MENU_Y, MENU_W, MENU.length * ROW_H + 12) && row >= 0 && row < MENU.length) jumpTo(MENU[row]);
      S.menu = false; return;
    }
    if (inRect(p, 14, 16, (S.chipW || 100) + 12, 44)) { S.menu = true; S.drag = null; pop(noteF(1), 0.04); return; }
    if (inRect(p, 326, 16, 44, 44)) { soundOn = !soundOn; S.toast = 1.2; if (soundOn) pop(noteF(4), 0.06); vib(8); return; }
    if (S.scene === 'play') playDown(p, e); else rewardDown(p, e);
  });
  cv.addEventListener('pointermove', function (e) { if (e.pointerId !== activeId) return; var p = toLogical(e); if (S.scene === 'play') playMove(p); else rewardMove(p); });
  function up(e, cancel) {
    if (e.pointerId !== activeId) return; activeId = null;
    if (S.scene === 'play') playUp(cancel); else rewardUp(cancel);
  }
  cv.addEventListener('pointerup', function (e) { up(e, false); });
  cv.addEventListener('pointercancel', function (e) { up(e, true); });
  window.addEventListener('blur', function () { if (activeId !== null) { activeId = null; if (S.scene === 'play') playUp(true); else rewardUp(true); } });

  function pickRadius(i) {
    var p = S.pos[i], best = 9;
    for (var j = 0; j < S.pos.length; j++) if (j !== i) best = Math.min(best, Math.hypot(S.pos[j][0] - p[0], S.pos[j][1] - p[1]));
    return clamp(best * 0.5, PICK_MIN, PICK_MAX);
  }
  function playDown(p, e) {
    var boosterX = 20;
    if (S.phase === 'play' && inRect(p, boosterX, 724, 106, 92)) { useHint(); return; }
    if (S.phase !== 'play' && S.phase !== 'intro') { if (['snap', 'cut', 'lift', 'fill', 'fly'].indexOf(S.phase) >= 0) S.speed = 3; return; }
    if (S.phase === 'intro' && S.t < 0.5) return;
    var fx = (p[0] - FX) / FS, fy = (p[1] - FY) / FS, best = -1, bd = 9;
    for (var i = 0; i < S.pos.length; i++) {
      var d = Math.hypot(fx - S.pos[i][0], fy - S.pos[i][1]);
      if (d < pickRadius(i) && d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    if (S.phase === 'intro') setPhase('play');
    if (locked(best)) { S.shake[best] = now(); vib(18); pop(220, 0.05, 0, 0.12); return; }
    activeId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    S.drag = { i: best, sx: fx, sy: fy, p0: S.pos[best].slice(), fx: p[0], fy: p[1], moved: false };
    S.firstTouch = true; S.hint = null;
    pop(noteF(0) * 0.5, 0.07, 0, 0.12); vib(6);
  }
  function playMove(p) {
    var d = S.drag; if (!d) return;
    var fx = (p[0] - FX) / FS, fy = (p[1] - FY) / FS;
    if (Math.hypot(fx - d.sx, fy - d.sy) > MOVE_EPS) d.moved = true;
    d.fx = p[0]; d.fy = p[1];
    S.pos[d.i] = [clamp(d.p0[0] + fx - d.sx, 0.04, 0.96), clamp(d.p0[1] + fy - d.sy, 0.04, 0.96)];
    S.dirty = true;
  }
  function playUp(cancel) {
    var d = S.drag; if (!d) return; S.drag = null;
    pop(noteF(0) * 0.6, 0.05, 0, 0.1);
    if (cancel || !d.moved) return;
    recompute();
    if (S.iouV >= S.thr) startWin();
  }
  function useHint() {
    if (S.hints <= 0) { vib(20); pop(200, 0.05, 0, 0.1); return; }
    var lv = LV[S.li].def, bi = -1, bd = -1;
    for (var i = 0; i < S.pos.length; i++) {
      if (locked(i)) continue;
      var d = Math.hypot(S.pos[i][0] - lv.sol[i][0], S.pos[i][1] - lv.sol[i][1]);
      if (d > bd) { bd = d; bi = i; }
    }
    S.hints--; S.hint = { i: bi, t0: now() };
    chord([2, 4], 0.05, 0.06); vib(10);
  }

  /* ---------- luật: thả tay đạt ngưỡng thì snap và chạy chuỗi thắng ngay ---------- */
  function startWin() {
    S.drag = null;
    S.snapFrom = S.pos.map(function (p) { return p.slice(); });
    // mỗi node hút vào điểm gần nhất trên viền mẫu, giữ đúng bố cục người chơi đã xếp; node khóa đứng yên
    var pts = LV[S.li].outline;
    S.snapTo = S.pos.map(function (p, i) { return locked(i) ? p.slice() : nearestOnLoop(pts, p); });
    setPhase('snap'); chord([4, 7, 9], 0.06, 0.06); vib(30);
  }
  function nearestOnLoop(pts, p) {
    var n = pts.length / 2, best = [pts[0], pts[1]], bd = 9;
    for (var i = 0; i < n; i++) {
      var ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1];
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? clamp(((p[0] - ax) * dx + (p[1] - ay) * dy) / l2, 0, 1) : 0;
      var qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(qx - p[0], qy - p[1]);
      if (d < bd) { bd = d; best = [qx, qy]; }
    }
    return best;
  }
  function edgeLen(path, k, n) { return (k + 1 < n ? path.nodeD[k + 1] : path.total) - path.nodeD[k]; }
  function runnerStep(dt) {
    var lv = LV[S.li].def, n = lv.ring.length, ver = false;
    S.path = GN.ringPath(lv, S.pos, 20);
    var rem = RUN_SPEED * dt, guard = 0;
    while (rem > 0 && guard++ < 10) {
      var len = Math.max(edgeLen(S.path, S.runK, n), 1e-4), left = (1 - S.runT) * len;
      if (rem < left) { S.runT += rem / len; rem = 0; }
      else {
        rem -= left; S.runK = (S.runK + 1) % n; S.runT = 0;
        var node = lv.ring[S.runK];
        if (GN.onBoundary(S.mask, S.pos[node])) {
          S.pl[node] = 1; S.ripples.push({ x: X(S.pos[node][0]), y: Y(S.pos[node][1]), t0: now(), c: C.mustard });
          var vol = (0.03 + 0.06 * S.dv) * (S.drag ? 0.45 : 1);
          pop(noteF(S.runK + (ver ? 2 : 0)), vol, 0, 0.26);
        }
      }
    }
    S.runDist = S.path.nodeD[S.runK] + S.runT * edgeLen(S.path, S.runK, n);
    var hd = runnerHead(S.path, S.runDist);
    advanceSnip(SNIP_RATE * dt, hd.x, hd.y, hd.ang, false);
  }

  /* ---------- vòng lặp ---------- */
  var last = 0, clock = 0;
  function now() { return clock; }
  function frame(ts) {
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; clock += dt;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    for (var i = 0; i < S.pl.length; i++) S.pl[i] = Math.max(0, S.pl[i] - dt * 3);
    S.toast = Math.max(0, S.toast - dt); S.flash = Math.max(0, S.flash - dt * 3);
    updateParts(dt);
    if (S.scene === 'reward') { updateReward(dt); return; }
    var lv = LV[S.li], sp = S.speed;
    S.t += dt * (['snap', 'cut', 'lift', 'fill', 'fly'].indexOf(S.phase) >= 0 ? sp : 1);
    for (var j = 0; j < S.sc.length; j++) {
      var target = (S.drag && S.drag.i === j) ? 1.15 : 1;
      if (S.phase === 'intro') target = S.t > 0.12 + j * 0.07 ? 1 : 0;
      S.sc[j] += (target - S.sc[j]) * Math.min(1, dt * (S.phase === 'intro' ? 14 : 18));
    }
    if (S.phase === 'intro' || S.phase === 'play' || S.phase === 'verify') {
      if (S.dirty) {
        recompute();
        [[m1(), 3], [m2(), 5]].forEach(function (m) { if (S.lastIou < m[0] && S.iouV >= m[0]) { S.flash = 1; pop(noteF(m[1]), 0.05); vib(8); } });
        S.lastIou = S.iouV;
      }
      var v = S.phase === 'verify' ? 1 : barValue(S.iouV);
      S.dv += (v - S.dv) * Math.min(1, dt * 12);
      if (S.phase === 'intro' && S.t > 0.9) setPhase('play');
      runnerStep(dt);
    } else if (S.phase === 'snap') {
      var p = easeInOut(S.t / 0.35);
      for (var k = 0; k < S.pos.length; k++) S.pos[k] = [lerp(S.snapFrom[k][0], S.snapTo[k][0], p), lerp(S.snapFrom[k][1], S.snapTo[k][1], p)];
      recompute(); S.dv += (1 - S.dv) * Math.min(1, dt * 12);
      if (S.t >= 0.35) { setPhase('cut'); S.cutLast = -1; S.snipT = 0; }
    } else if (S.phase === 'cut') {
      var L = lv.solPath.total * clamp(S.t / 1.2, 0, 1);
      for (var q = 0; q < lv.def.ring.length; q++) {
        var nd = lv.solPath.nodeD[q];
        if (S.cutLast < nd && nd <= L) { pop(noteF(q + 2), 0.07, 0, 0.3); var nn = lv.def.ring[q]; S.ripples.push({ x: X(S.snapTo[nn][0]), y: Y(S.snapTo[nn][1]), t0: now(), c: C.mustard }); }
      }
      var ch = runnerHead(lv.solPath, L);
      advanceSnip(SNIP_RATE * 1.4 * dt * sp, ch.x, ch.y, ch.ang, true);
      S.cutLast = L;
      if (S.t >= 1.2) { setPhase('lift'); noise(0.25, 0.04, 900, 'bandpass'); vib(14); }
    } else if (S.phase === 'lift') {
      if (S.t >= 0.45) { setPhase('fill'); }
    } else if (S.phase === 'fill') {
      if (S.t >= 0.75 && !S.fillChimed) { S.fillChimed = true; chord([0, 2, 4, 7], 0.06, 0.06); sparkle(X(lv.cen[0]), Y(lv.cen[1]) - 10, 14); }
      if (S.t >= 1.15) { setPhase('fly'); S.fillChimed = false; noise(0.3, 0.03, 1400, 'bandpass'); }
    } else if (S.phase === 'fly') {
      if (S.t >= 0.65) {
        S.done[S.li] = true; pop(noteF(7), 0.07); vib(15);
        var sl = slotRect(product().levels.indexOf(S.li)); S.ripples.push({ x: sl[0] + sl[2] / 2, y: sl[1] + sl[3] / 2, t0: now(), c: C.mustard });
        setPhase('next');
      }
    } else if (S.phase === 'next') {
      if (S.t >= 0.6) {
        var lvls = product().levels, k2 = lvls.indexOf(S.li);
        if (k2 < lvls.length - 1) loadLevel(lvls[k2 + 1]);
        else { S.scene = 'reward'; startReward(); }
      }
    }
  }

  /* ---------- vẽ chung ---------- */
  var weavePat = null;
  function weave() {
    if (weavePat) return weavePat;
    var c = document.createElement('canvas'); c.width = c.height = 10;
    var g = c.getContext('2d'); g.strokeStyle = C.weave; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 10); g.lineTo(10, 0); g.moveTo(-5, 5); g.lineTo(5, -5); g.moveTo(5, 15); g.lineTo(15, 5); g.stroke();
    weavePat = ctx.createPattern(c, 'repeat'); return weavePat;
  }
  function outlinePath(pts, ox, oy, s) {
    ctx.beginPath(); ctx.moveTo(ox + pts[0] * s, oy + pts[1] * s);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(ox + pts[i] * s, oy + pts[i + 1] * s);
    ctx.closePath();
  }
  function gear(x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2, rad = (i % 2 === 0) ? r : r * 0.78; var a2 = (i + 1) / 16 * Math.PI * 2; ctx.arc(0, 0, rad, a, a2); }
    ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, 7); ctx.fillStyle = C.card; ctx.fill();
    ctx.restore();
  }
  function drawTop() {
    var label = product().label;
    ctx.font = '800 16px ' + FONT; var w = ctx.measureText(label).width + 50; S.chipW = w;
    rr(20, 22, w, 32, 16); ctx.fillStyle = C.chip; ctx.fill();
    text(label, 36, 39, 16, 800, C.ink, 'left');
    // mũi tên báo chip mở được danh sách chọn màn
    ctx.beginPath(); ctx.moveTo(20 + w - 24, 35); ctx.lineTo(20 + w - 14, 35); ctx.lineTo(20 + w - 19, 41); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
    rr(326, 16, 44, 44, 14); ctx.fillStyle = C.card; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
    gear(348, 38, 10);
    if (!soundOn || S.toast > 0) {
      var a = S.toast > 0 ? Math.min(1, S.toast * 2) : 1;
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(366, 56, 9, 0, 7); ctx.fillStyle = soundOn ? C.barNear : C.roseDeep; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(362, 54); ctx.lineTo(364.5, 54); ctx.lineTo(367.5, 51.5); ctx.lineTo(367.5, 60.5); ctx.lineTo(364.5, 58); ctx.lineTo(362, 58); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      if (!soundOn) { ctx.beginPath(); ctx.moveTo(360, 50); ctx.lineTo(372, 62); ctx.stroke(); }
      ctx.restore();
    }
  }
  function slotRect(i) { return [186 + i * 58, 168, 46, 46]; }
  function fitTf(lv, cx, cy, size) {
    var b = lv.bbox, s = size / Math.max(b[2] - b[0], b[3] - b[1]);
    return { ox: cx - (b[0] + b[2]) / 2 * s, oy: cy - (b[1] + b[3]) / 2 * s, s: s };
  }
  function drawInfo() {
    rr(20, 80, 140, 148, 18); ctx.fillStyle = C.card; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
    text('Hình mẫu', 90, 101, 13, 700, C.inkSoft, 'center');
    var lv = LV[S.li], tf = fitTf(lv, 90, 165, 92);
    outlinePath(lv.outline, tf.ox, tf.oy, tf.s); ctx.fillStyle = rgba(lv.def.pattern.base, 0.45); ctx.fill();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.setLineDash([]);

    rr(172, 80, 198, 148, 18); ctx.fillStyle = C.card; ctx.fill();
    text('Độ khớp', 186, 101, 13, 700, C.inkSoft, 'left');
    var bx = 186, by = 112, bw = 170, bh = 22, raw = S.phase === 'play' || S.phase === 'intro' ? S.iouV : 1;
    var col = raw >= m2() ? C.barNear : (raw >= m1() ? C.barMid : C.barFar);
    var ready = S.drag && S.iouV >= S.thr;
    if (ready) {
      S.readyPulse += 0.06;
      ctx.save(); ctx.shadowColor = rgba(C.barNear, 0.7); ctx.shadowBlur = 10 + 6 * Math.sin(S.readyPulse * 3);
      rr(bx, by, bw, bh, 11); ctx.fillStyle = C.card; ctx.fill(); ctx.restore();
    }
    rr(bx, by, bw, bh, 11); ctx.fillStyle = '#FFF4EE'; ctx.fill();
    var fw = Math.max(0, (bw - 6) * S.dv);
    if (fw > 1) {
      rr(bx + 3, by + 3, Math.max(fw, 14), bh - 6, 8); ctx.fillStyle = col; ctx.fill();
      if (S.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + 0.6 * S.flash + ')'; ctx.fill(); }
    }
    ctx.fillStyle = rgba(C.ink, 0.3);
    [m1(), m2()].forEach(function (m) { var tx = bx + 3 + (bw - 6) * barValue(m); ctx.fillRect(tx - 1, by + 5, 2, bh - 10); });
    rr(bx, by, bw, bh, 11); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();

    text('Bộ vải ghép', 186, 152, 13, 700, C.inkSoft, 'left');
    var lvls = product().levels;
    for (var i = 0; i < lvls.length; i++) {
      var r = slotRect(i), li = lvls[i];
      rr(r[0], r[1], r[2], r[3], 10); ctx.fillStyle = C.paper; ctx.fill();
      ctx.setLineDash([4, 3]); ctx.lineWidth = 1.8; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]);
      if (S.done[li]) { var t2 = fitTf(LV[li], r[0] + r[2] / 2, r[1] + r[3] / 2, 34); drawPiece(li, t2.ox, t2.oy, t2.s, 1, false, 0.6); }
    }
  }
  function drawBoosters() {
    for (var i = 0; i < 3; i++) {
      var x = 20 + i * 122, y = 724, w = 106, h = 92;
      rr(x, y, w, h, 18); ctx.fillStyle = i === 0 ? C.card : rgba(C.paper, 0.6); ctx.fill();
      ctx.setLineDash(i === 0 ? [] : [5, 4]); ctx.lineWidth = i === 0 ? 2.2 : 1.8; ctx.strokeStyle = i === 0 ? C.ink : rgba(C.mute, 0.7); ctx.stroke(); ctx.setLineDash([]);
      if (i === 0) {
        var off = S.hints <= 0;
        ctx.save(); ctx.globalAlpha = off ? 0.4 : 1;
        // bóng đèn gợi ý cách điệu thành cuộn chỉ phát sáng
        ctx.beginPath(); ctx.arc(x + w / 2, y + 36, 15, 0, 7); ctx.fillStyle = C.mustard; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
        rr(x + w / 2 - 7, y + 49, 14, 8, 3); ctx.fillStyle = C.blue; ctx.fill(); ctx.stroke();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + w / 2 - 5, y + 36); ctx.quadraticCurveTo(x + w / 2, y + 28, x + w / 2 + 5, y + 36); ctx.stroke();
        text('Gợi ý', x + w / 2, y + 72, 13, 700, C.ink, 'center');
        ctx.restore();
        rr(x + w - 22, y - 8, 28, 24, 12); ctx.fillStyle = C.ink; ctx.fill();
        text(String(S.hints), x + w - 8, y + 4.5, 13, 800, '#fff', 'center');
      }
    }
  }

  /* ---------- vẽ tấm vải và đồ thị ---------- */
  var maskCanvas = document.createElement('canvas'); maskCanvas.width = maskCanvas.height = GN.N;
  var mctx = maskCanvas.getContext('2d'), mimg = mctx.createImageData(GN.N, GN.N);
  function paintMask(alpha) {
    var d = mimg.data, m = S.mask;
    for (var i = 0; i < m.length; i++) { var o = i * 4; d[o] = 255; d[o + 1] = 252; d[o + 2] = 246; d[o + 3] = m[i] ? alpha : 0; }
    mctx.putImageData(mimg, 0, 0);
  }
  function drawFabric() {
    rr(20, 252, 350, 360, 24); ctx.fillStyle = C.card; ctx.fill();
    rr(FX, FY, FS, FS, 14); ctx.fillStyle = C.fabric; ctx.fill(); ctx.fillStyle = weave(); ctx.fill();
    rr(FX + 7, FY + 7, FS - 14, FS - 14, 10); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]);
  }
  function drawGhost(lv, a) {
    outlinePath(lv.outline, FX, FY, FS);
    ctx.fillStyle = rgba(C.thread, 0.13 * a); ctx.fill();
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.thread, 0.9 * a); ctx.stroke(); ctx.setLineDash([]);
  }
  var BUCKET = 12;
  function drawCut(alpha) {
    var seg = S.seg, n = seg.length / 6; if (!n) return;
    var cx = 0, cy = 0;
    for (var i = 0; i < seg.length; i += 6) { cx += seg[i]; cy += seg[i + 1]; }
    cx /= n; cy /= n;
    var drift = reduce ? 0 : clock * 33, m = clamp((S.dv - 0.35) / 0.65, 0, 1); m *= m;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var b = 0; b < BUCKET; b++) {
      ctx.beginPath(); var any = false;
      for (var k = 0; k < seg.length; k += 6) {
        if (((seg[k + 4] + 2 * seg[k + 5]) >> 2) & 1) continue;
        var ang = (Math.atan2(seg[k + 1] - cy, seg[k] - cx) * 57.3 + drift + 720) % 360;
        if (Math.floor(ang / (360 / BUCKET)) !== b) continue;
        ctx.moveTo(X(seg[k]), Y(seg[k + 1])); ctx.lineTo(X(seg[k + 2]), Y(seg[k + 3])); any = true;
      }
      if (!any) continue;
      var hue = (b + 0.5) * (360 / BUCKET), base = hsl(hue, 0.5, 0.5);
      ctx.strokeStyle = 'rgba(' + Math.round(lerp(base[0], 207, m)) + ',' + Math.round(lerp(base[1], 159, m)) + ',' + Math.round(lerp(base[2], 58, m)) + ',' + alpha + ')';
      ctx.stroke();
    }
  }
  function hsl(h, s, l) {
    h /= 360; var a = s * Math.min(l, 1 - l);
    function f(n) { var k = (n + h * 12) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); }
    return [f(0), f(8), f(4)];
  }
  var polyBuf = [];
  function drawEdges(alpha) {
    var lv = LV[S.li].def;
    ctx.lineCap = 'round';
    for (var e = 0; e < lv.edges.length; e++) {
      var ed = lv.edges[e], p = GN.edgePoly(lv, S.pos, ed[0], ed[1], 20, polyBuf);
      ctx.beginPath(); ctx.moveTo(X(p[0]), Y(p[1]));
      for (var k = 2; k < p.length; k += 2) ctx.lineTo(X(p[k]), Y(p[k + 1]));
      ctx.lineWidth = ed[2] ? 1.6 : 1.3; ctx.strokeStyle = rgba(C.ink, (ed[2] ? 0.42 : 0.26) * alpha);
      if (!ed[2]) ctx.setLineDash([3, 4]);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawNode(i, alpha) {
    var lv = LV[S.li].def, x = X(S.pos[i][0]), y = Y(S.pos[i][1]), s = S.sc[i] * (1 + 0.3 * S.pl[i]), lk = locked(i);
    var st = now() - S.shake[i]; if (st >= 0 && st < 0.35) x += Math.sin(st * 60) * 4 * (1 - st / 0.35);
    if (s < 0.02) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    if (S.phase === 'verify' && S.lit[i]) { ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = C.mustard; ctx.stroke(); }
    ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.strokeStyle = lk ? C.mute : C.ink;
    if (lv.types[i] === 'c') { ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, 7); ctx.fillStyle = lk ? '#E9E1D6' : C.rose; ctx.fill(); ctx.stroke(); }
    else {
      ctx.beginPath(); for (var k = 0; k < 3; k++) { var a = -Math.PI / 2 + k * Math.PI * 2 / 3; ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13 + 2); }
      ctx.closePath(); ctx.fillStyle = lk ? '#E9E1D6' : C.card; ctx.fill(); ctx.stroke();
    }
    if (lk) {
      ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(9, -14); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.beginPath(); ctx.arc(10, -16, 4.6, 0, 7); ctx.fillStyle = C.mustard; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.restore();
  }
  // Cây kéo gồm hai nửa xoay quanh đinh tán: lưỡi phía trước, vòng tay cầm phía sau, mở khép ngược nhau.
  // Cây kéo: lưỡi dài và to là phần chính, tay cầm nhỏ phía sau; hai nửa xoay quanh đinh tán để mở khép thấy rõ.
  // Cây kéo đen, ngắn: lưỡi đặc màu đen, vòng tay cầm đen; hai nửa xoay quanh đinh tán.
  var SCISSOR = '#2B211D';
  function drawScissors(x, y, ang, size, open) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    var th = 0.02 + open * 0.55;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [1, -1].forEach(function (sg) {
      ctx.save(); ctx.rotate(-sg * th);
      ctx.beginPath(); ctx.ellipse(-size * 0.5, sg * size * 0.2, size * 0.18, size * 0.14, sg * 0.4, 0, 7);
      ctx.lineWidth = size * 0.11; ctx.strokeStyle = SCISSOR; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-size * 0.34, sg * size * 0.13); ctx.lineTo(-size * 0.03, 0); ctx.lineWidth = size * 0.12; ctx.stroke();
      // lưỡi ngắn: mép cắt nằm sát trục, sống lưỡi cong ra ngoài, nhọn về mũi
      ctx.beginPath(); ctx.moveTo(-size * 0.06, 0); ctx.lineTo(size * 0.9, 0);
      ctx.quadraticCurveTo(size * 0.38, sg * size * 0.24, -size * 0.06, sg * size * 0.17); ctx.closePath();
      ctx.fillStyle = SCISSOR; ctx.fill();
      ctx.beginPath(); ctx.moveTo(size * 0.06, sg * size * 0.05); ctx.lineTo(size * 0.6, sg * size * 0.03);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(0, 0, size * 0.09, 0, 7); ctx.fillStyle = '#B9B2AE'; ctx.fill();
    ctx.restore();
  }
  // Nhịp cắt gắn với quãng đường: khép nhanh, mở chậm; mỗi lần khép là một nhát cắt.
  var SNIP_LEN = 0.045;
  function snipOpen(ph) { var f = ph - Math.floor(ph); return f < 0.35 ? 1 - easeInOut(f / 0.35) : easeInOut((f - 0.35) / 0.65); }
  // Lúc đang giải: kéo cắt đều theo thời gian để luôn thấy mở khép. Lúc cảnh cắt: theo quãng đi, có vụn vải, không có tiếng.
  var SNIP_RATE = 3.2;
  function advanceSnip(phaseDelta, tipX, tipY, ang, cutting) {
    var before = S.snipPhase; S.snipPhase += phaseDelta;
    if (cutting && Math.floor(before + 0.72) !== Math.floor(S.snipPhase + 0.72)) { lint(tipX, tipY, ang, 4); vib(4); }
  }
  function lint(x, y, ang, n) {
    for (var i = 0; i < n; i++) {
      var a = ang + Math.PI + (Math.random() - 0.5) * 1.6, v = 40 + Math.random() * 60;
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.45 + Math.random() * 0.3, age: 0, kind: 'lint',
        c: i % 2 ? C.thread : '#F7E6DF', r: 1.6 + Math.random() * 1.8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, g: 220 });
    }
  }
  var tmpA = [0, 0], tmpB = [0, 0];
  function runnerHead(path, dist) {
    GN.pointAt(path, dist, tmpA); GN.pointAt(path, dist + 0.01, tmpB);
    return { x: X(tmpA[0]), y: Y(tmpA[1]), ang: Math.atan2(Y(tmpB[1]) - Y(tmpA[1]), X(tmpB[0]) - X(tmpA[0])) };
  }
  function drawRunner(path, dist, size, cutting) {
    if (!cutting) {
      for (var j = 7; j >= 1; j--) {
        GN.pointAt(path, dist - j * 0.014, tmpA);
        ctx.beginPath(); ctx.arc(X(tmpA[0]), Y(tmpA[1]), 3.2 * (1 - j / 9), 0, 7); ctx.fillStyle = rgba(C.mustard, (1 - j / 8) * 0.8); ctx.fill();
      }
    }
    var h = runnerHead(path, dist), op = reduce ? 0.5 : snipOpen(S.snipPhase);
    var bob = reduce ? 0 : Math.sin(S.snipPhase * Math.PI * 2) * 1.2;
    var hx = h.x - Math.sin(h.ang) * bob, hy = h.y + Math.cos(h.ang) * bob;
    // lưỡi kéo kẹp đúng vào đường cắt: đinh tán lùi lại phía sau điểm đang cắt
    drawScissors(hx - Math.cos(h.ang) * size * 0.45, hy - Math.sin(h.ang) * size * 0.45, h.ang, size, op);
  }
  function drawRipples() {
    for (var i = S.ripples.length - 1; i >= 0; i--) {
      var r = S.ripples[i], t = (now() - r.t0) / 0.45;
      if (t >= 1) { S.ripples.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(r.x, r.y, 10 + 22 * t, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(r.c, (1 - t) * 0.9); ctx.stroke();
    }
  }
  function drawWire() {
    var d = S.drag; if (!d) return;
    var nx = X(S.pos[d.i][0]), ny = Y(S.pos[d.i][1]);
    ctx.save(); ctx.setLineDash([3, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(C.ink, 0.5);
    ctx.beginPath(); ctx.moveTo(d.fx, d.fy); ctx.lineTo(nx, ny); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(d.fx, d.fy, 14, 0, 7); ctx.fillStyle = rgba(C.ink, 0.1); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.ink, 0.45); ctx.stroke();
    ctx.restore();
  }
  function drawHint() {
    var h = S.hint; if (!h) return;
    var t = now() - h.t0; if (t > 3) { S.hint = null; return; }
    var lv = LV[S.li].def, a = S.pos[h.i], b = lv.sol[h.i], pulse = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.save(); ctx.globalAlpha = Math.min(1, (3 - t) * 2);
    ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.strokeStyle = C.roseDeep;
    ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(X(b[0]), Y(b[1]), 15 + 4 * pulse, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = C.mustard; ctx.stroke();
    ctx.restore();
  }
  function drawStartCue() {
    if (S.firstTouch || S.li !== 0 || S.phase !== 'play') return;
    var lv = LV[S.li].def, bi = 1, bd = -1;
    for (var i = 0; i < S.pos.length; i++) { if (locked(i)) continue; var d = Math.hypot(S.pos[i][0] - lv.sol[i][0], S.pos[i][1] - lv.sol[i][1]); if (d > bd) { bd = d; bi = i; } }
    var t = (clock % 1.4) / 1.4;
    ctx.beginPath(); ctx.arc(X(S.pos[bi][0]), Y(S.pos[bi][1]), 14 + 14 * t, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(C.roseDeep, 1 - t); ctx.stroke();
  }

  /* ---------- mảnh vải: màu và họa tiết ---------- */
  // Mũ: hồng phấn chấm bi kem; thân: xanh xô thơm kẻ caro mù tạt. Hai mảnh không trùng màu, không trùng họa tiết.
  function drawPiece(i, ox, oy, s, fill, lifted, stitchA, deep) {
    var lv = LV[i], pts = lv.outline, b = lv.bbox;
    if (lifted) {
      ctx.save(); ctx.shadowColor = 'rgba(74,59,53,0.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 9;
      outlinePath(pts, ox, oy, s); ctx.fillStyle = C.cream; ctx.fill(); ctx.restore();
    }
    outlinePath(pts, ox, oy, s); ctx.fillStyle = C.cream; ctx.fill();
    ctx.save(); outlinePath(pts, ox, oy, s); ctx.clip();
    ctx.fillStyle = weave(); ctx.fillRect(ox + b[0] * s, oy + b[1] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s);
    if (fill > 0) {
      var top = oy + b[3] * s - (b[3] - b[1]) * s * fill - 2;
      ctx.beginPath(); ctx.rect(ox + b[0] * s - 4, top, (b[2] - b[0]) * s + 8, (b[3] - b[1]) * s + 8); ctx.clip();
      paintPattern(i, ox, oy, s, deep || 0);
      if (fill < 1) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(ox + b[0] * s - 4, top, (b[2] - b[0]) * s + 8, 3); }
    }
    ctx.restore();
    outlinePath(pts, ox, oy, s); ctx.lineWidth = Math.max(1.4, 2.6 * Math.min(1, s / 200)); ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
    if (stitchA > 0) {
      var cx = ox + lv.cen[0] * s, cy = oy + lv.cen[1] * s, k = 0.88;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      outlinePath(pts, ox, oy, s); ctx.setLineDash([5 / k * Math.min(1, s / 200) + 1, 4 / k * Math.min(1, s / 200) + 1]);
      ctx.lineWidth = 1.6 / k; ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * stitchA + ')'; ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
    }
  }
  // Mỗi mảnh một họa tiết riêng: chấm bi, kẻ caro, cốm rắc, ô bánh quế. Không mảnh nào trùng màu hay họa tiết.
  var SPR = ['#FFFFFF', '#E3A6A1', '#E9C46A', '#A9C1A0'];
  function paintPattern(i, ox, oy, s, deep) {
    var pt = LV[i].def.pattern, b = LV[i].bbox, x0 = ox + b[0] * s, y0 = oy + b[1] * s, w = (b[2] - b[0]) * s, h = (b[3] - b[1]) * s, u = s / 324;
    ctx.fillStyle = mix(pt.base, pt.deep, deep); ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
    var row, xx, yy;
    if (pt.kind === 'dots') {
      ctx.fillStyle = pt.accent; var g = 22 * u, r = 4.6 * u;
      for (yy = 0, row = 0; yy < h + g; yy += g * 0.86, row++) for (xx = (row % 2) * g / 2; xx < w + g; xx += g) { ctx.beginPath(); ctx.arc(x0 + xx, y0 + yy, r, 0, 7); ctx.fill(); }
    } else if (pt.kind === 'gingham') {
      var gg = 20 * u, bw = 8 * u; ctx.fillStyle = rgba(pt.accent, 0.42 + 0.15 * deep);
      for (xx = 0; xx < w + gg; xx += gg) ctx.fillRect(x0 + xx, y0 - 4, bw, h + 8);
      for (yy = 0; yy < h + gg; yy += gg) ctx.fillRect(x0 - 4, y0 + yy, w + 8, bw);
    } else if (pt.kind === 'sprinkles') {
      var sg = 20 * u, k = 0;
      for (yy = 0, row = 0; yy < h + sg; yy += sg * 0.8, row++) for (xx = (row % 2) * sg / 2; xx < w + sg; xx += sg) {
        k++; ctx.save(); ctx.translate(x0 + xx, y0 + yy); ctx.rotate((k * 1.7) % 3.14);
        ctx.fillStyle = SPR[k % SPR.length]; rr(-5 * u, -1.6 * u, 10 * u, 3.2 * u, 1.6 * u); ctx.fill(); ctx.restore();
      }
    } else if (pt.kind === 'knit') {
      // hàng mũi đan hình chữ V như len thật
      var kw = 12 * u, kh = 12 * u; ctx.strokeStyle = rgba(pt.accent, 0.75); ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round';
      ctx.beginPath();
      for (yy = 0; yy < h + kh; yy += kh) for (xx = 0; xx < w + kw; xx += kw) {
        ctx.moveTo(x0 + xx, y0 + yy); ctx.lineTo(x0 + xx + kw / 2, y0 + yy + kh * 0.7); ctx.lineTo(x0 + xx + kw, y0 + yy);
      }
      ctx.stroke();
    } else if (pt.kind === 'rib') {
      // len gân dọc như cổ áo, bo tay
      var rg = 9 * u; ctx.fillStyle = rgba(pt.accent, 0.8);
      for (xx = 0; xx < w + rg; xx += rg) ctx.fillRect(x0 + xx, y0 - 4, rg * 0.45, h + 8);
    } else if (pt.kind === 'stripes') {
      var st = 18 * u; ctx.fillStyle = rgba(pt.accent, 0.85);
      for (yy = 0; yy < h + st; yy += st) ctx.fillRect(x0 - 4, y0 + yy, w + 8, st * 0.42);
    } else if (pt.kind === 'zigzag') {
      var zw = 16 * u, zh = 22 * u; ctx.strokeStyle = rgba(pt.accent, 0.85); ctx.lineWidth = 4 * u; ctx.lineJoin = 'round';
      for (yy = 0; yy < h + zh; yy += zh) {
        ctx.beginPath(); ctx.moveTo(x0 - 4, y0 + yy);
        for (xx = 0, k = 0; xx < w + zw; xx += zw / 2, k++) ctx.lineTo(x0 + xx, y0 + yy + (k % 2 ? 6 * u : -6 * u));
        ctx.stroke();
      }
    } else if (pt.kind === 'waffle') {
      var wg = 22 * u; ctx.strokeStyle = mix(pt.accent, '#9C6B33', deep); ctx.lineWidth = 3 * u;
      ctx.beginPath();
      for (var d = -h; d < w + h; d += wg) { ctx.moveTo(x0 + d, y0 - 4); ctx.lineTo(x0 + d + h + 8, y0 + h + 4); ctx.moveTo(x0 + d, y0 + h + 4); ctx.lineTo(x0 + d + h + 8, y0 - 4); }
      ctx.stroke();
    }
  }

  /* ---------- hạt: lấp lánh và confetti cúc áo ---------- */
  function sparkle(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = 60 + Math.random() * 110;
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.8 + Math.random() * 0.4, age: 0, kind: 'star', c: [C.mustard, '#FFFFFF', C.rose][i % 3], r: 3 + Math.random() * 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, g: 160 });
    }
  }
  function burst(x, y, r) { S.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.55, age: 0, kind: 'burst', r: r || 10, rot: 0, vr: 0, g: 0 }); }
  function confetti(n) {
    var cols = [C.rose, C.sage, C.mustard, C.blue, '#FFFFFF'];
    for (var i = 0; i < n; i++) {
      S.parts.push({ x: 20 + Math.random() * 350, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, life: 4, age: 0,
        kind: i % 3 === 0 ? 'thread' : 'button', c: cols[i % cols.length], r: 5 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 5, g: 40 });
    }
  }
  function updateParts(dt) {
    for (var i = S.parts.length - 1; i >= 0; i--) {
      var p = S.parts[i]; p.age += dt;
      if (p.age > p.life || p.y > H + 40) { S.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }
  function drawParts() {
    for (var i = 0; i < S.parts.length; i++) {
      var p = S.parts[i], a = clamp((p.life - p.age) / 0.4, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.kind === 'star') {
        ctx.beginPath(); for (var k = 0; k < 8; k++) { var rad = k % 2 ? p.r * 0.4 : p.r; var an = k * Math.PI / 4; ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
        ctx.closePath(); ctx.fillStyle = p.c; ctx.fill();
      } else if (p.kind === 'lint') {
        ctx.fillStyle = p.c; ctx.fillRect(-p.r * 1.4, -p.r * 0.5, p.r * 2.8, p.r);
      } else if (p.kind === 'burst') {
        var bt = p.age / p.life, br = p.r + 34 * easeOut(bt);
        ctx.beginPath(); ctx.arc(0, 0, br, 0, 7); ctx.lineWidth = 7 * (1 - bt) + 1; ctx.strokeStyle = 'rgba(74,59,53,0.18)'; ctx.stroke();
        ctx.lineWidth = 5 * (1 - bt) + 1; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
      } else if (p.kind === 'button') {
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fillStyle = p.c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.fillStyle = C.ink; for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc((q % 2 ? 1 : -1) * p.r * 0.3, (q < 2 ? -1 : 1) * p.r * 0.3, p.r * 0.13, 0, 7); ctx.fill(); }
      } else {
        ctx.beginPath(); ctx.moveTo(-p.r * 1.4, 0); ctx.quadraticCurveTo(0, -p.r, p.r * 1.4, 0); ctx.lineWidth = 2.2; ctx.strokeStyle = p.c; ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---------- màn chơi: vẽ ---------- */
  function drawPlay() {
    var lv = LV[S.li], ph = S.phase, t = S.t;
    drawFabric();
    var intro = ph === 'intro' ? clamp(t / 0.5, 0, 1) : 1;
    var gone = ph === 'next' ? clamp(1 - t / 0.4, 0, 1) : 1;
    if (ph === 'intro' || ph === 'play' || ph === 'verify' || ph === 'snap') {
      drawGhost(lv, intro);
      paintMask(ph === 'verify' || ph === 'snap' ? 150 : 120);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(maskCanvas, X(GN.LO), Y(GN.LO), (GN.HI - GN.LO) * FS, (GN.HI - GN.LO) * FS);
      drawCut(intro);
      var na = ph === 'verify' ? 0.35 : (ph === 'snap' ? 0.35 * (1 - clamp(t / 0.35, 0, 1)) : 1);
      drawEdges(na * intro);
      if (ph !== 'snap') drawStartCue();
      for (var i = 0; i < S.pos.length; i++) drawNode(i, ph === 'verify' && S.lit[i] ? 1 : na);
      drawHint();
      if (S.path && ph !== 'snap') drawRunner(S.path, S.runDist, 17);
      drawWire();
    } else if (ph === 'cut') {
      drawGhost(lv, 0.6);
      var L = lv.solPath.total * clamp(t / 1.2, 0, 1), pts = lv.solPath.pts, cum = lv.solPath.cum;
      outlinePath(pts, FX, FY, FS); ctx.fillStyle = 'rgba(255,252,246,0.5)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X(pts[0]), Y(pts[1]));
      for (var k = 1; k < cum.length && cum[k] <= L; k++) ctx.lineTo(X(pts[k * 2]), Y(pts[k * 2 + 1]));
      GN.pointAt(lv.solPath, L, tmpA); ctx.lineTo(X(tmpA[0]), Y(tmpA[1]));
      ctx.lineWidth = 3.2; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      S.snapTo.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 3.5, 0, 7); ctx.fillStyle = rgba(C.mustard, 0.9); ctx.fill(); });
      drawRunner(lv.solPath, L, 20, true);
    } else {
      ctx.save(); ctx.globalAlpha = gone;
      outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = C.hole; ctx.fill();
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      var lift = ph === 'lift' ? easeBack(t / 0.45) : 1;
      if (ph === 'lift' || ph === 'fill') {
        var sc = 1 + 0.04 * lift, cx = X(lv.cen[0]), cy = Y(lv.cen[1]) - 12 * lift;
        var fill = ph === 'fill' ? easeInOut(t / 0.75) : 0;
        drawPiece(S.li, cx - lv.cen[0] * FS * sc, cy - lv.cen[1] * FS * sc, FS * sc, fill, true, ph === 'fill' ? clamp((t - 0.7) / 0.3, 0, 1) : 0, 0);
      } else if (ph === 'fly') {
        var u = easeInOut(t / 0.65), sr = slotRect(product().levels.indexOf(S.li)), tf = fitTf(lv, sr[0] + sr[2] / 2, sr[1] + sr[3] / 2, 34);
        var s0 = FS * 1.04, ox0 = X(lv.cen[0]) - lv.cen[0] * s0, oy0 = Y(lv.cen[1]) - 12 - lv.cen[1] * s0;
        drawPiece(S.li, lerp(ox0, tf.ox, u), lerp(oy0, tf.oy, u) - 70 * Math.sin(Math.PI * u), lerp(s0, tf.s, u), 1, u < 0.8, 1 - u, 0);
      }
    }
  }

  /* ---------- màn thưởng: ghép các mảnh thành sản phẩm ---------- */
  var RS = 250, R = null;
  function placeOf(li) { var pl = product().place[li]; return { ox: pl[0], oy: pl[1], s: pl[2] || RS }; }
  function ptOf(li, x, y) { var t = placeOf(li); return [t.ox + x * t.s, t.oy + y * t.s]; }
  function backToFront() { return product().order; }
  var HOMES = { 2: [[118, 704], [292, 704]], 3: [[78, 704], [195, 704], [312, 704]] };
  function startReward() {
    var p = product(), homes = HOMES[p.levels.length];
    R = {
      t: 0, phase: 'enter', pieces: p.levels.map(function (li, k) {
        return { i: li, tf: placeOf(li), home: homes[k], x: homes[k][0], y: homes[k][1], sc: 0.5, placed: false, back: null };
      }), drag: null, stitch: 0, tap: null, reveal: 0, decor: [], decorT: 0, replay: 0, sq: 0, wig: 0
    };
    // các đường may: mỗi đường là một đoạn cạnh vòng của một mảnh, từ node đầu tới node cuối
    R.seams = p.seams.map(function (sm) {
      var sp = LV[sm[0]].solPath, tf = placeOf(sm[0]), a = sp.nodeD[sm[1]], b = sm[2] === 0 ? sp.total : sp.nodeD[sm[2]], pts = [];
      for (var i = 0; i < sp.cum.length; i++) if (sp.cum[i] >= a - 1e-6 && sp.cum[i] <= b + 1e-6) pts.push([tf.ox + sp.pts[i * 2] * tf.s, tf.oy + sp.pts[i * 2 + 1] * tf.s]);
      return pts;
    });
    var by = 0;
    p.levels.forEach(function (li) { var t = placeOf(li); by = Math.max(by, t.oy + LV[li].bbox[3] * t.s); });
    R.base = [195, by];
    chord([0, 4, 7], 0.05, 0.08);
  }
  function productTf() {
    // co giãn quanh chân món đồ để khi ghép xong cả món nảy lên một nhịp
    var bx = R.base[0], by = R.base[1];
    ctx.translate(bx, by); ctx.rotate(R.wig); ctx.scale(1 + R.sq * 0.6, 1 - R.sq); ctx.translate(-bx, -by);
  }
  // Tiến độ khâu p (0–1) chia đều cho các đường may, khâu lần lượt từng đường.
  function seamPart(p) { var n = R.seams.length, f = clamp(p, 0, 1) * n, k = Math.min(n - 1, Math.floor(f)); return { k: k, p: f - k }; }
  function seamPointOf(seam, p) {
    var n = seam.length - 1, f = clamp(p, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    return [lerp(seam[i][0], seam[i + 1][0], u), lerp(seam[i][1], seam[i + 1][1], u), Math.atan2(seam[i + 1][1] - seam[i][1], seam[i + 1][0] - seam[i][0])];
  }
  function seamPoint(p) { var sp = seamPart(p); return seamPointOf(R.seams[sp.k], p >= 1 ? 1 : sp.p); }
  function drawNeedle(x, y, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang - 0.6);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, 0); ctx.lineWidth = 4.4; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#DCE2E5'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-18, 0, 2.6, 0.9, 0, 0, 7); ctx.fillStyle = C.ink; ctx.fill();
    ctx.restore();
  }
  function pieceCenterTarget(pc) { var lv = LV[pc.i]; return [pc.tf.ox + lv.cen[0] * pc.tf.s, pc.tf.oy + lv.cen[1] * pc.tf.s]; }
  function pieceHit(pc, p) {
    var lv = LV[pc.i], s = pc.tf.s * pc.sc, b = lv.bbox;
    var x0 = pc.x - lv.cen[0] * s, y0 = pc.y - lv.cen[1] * s;
    return p[0] >= x0 + b[0] * s - 14 && p[0] <= x0 + b[2] * s + 14 && p[1] >= y0 + b[1] * s - 14 && p[1] <= y0 + b[3] * s + 14;
  }
  function rewardDown(p, e) {
    if (!R) return;
    if (R.phase === 'done' && inRect(p, 95, 732, 200, 58)) {
      if (S.pi + 1 < PRODUCTS.length) { S.parts = []; loadProduct(S.pi + 1); chord([0, 4], 0.05); } else restart();
      return;
    }
    if (R.phase === 'place') {
      for (var k = R.pieces.length - 1; k >= 0; k--) {
        var pc = R.pieces[k];
        if (!pc.placed && pieceHit(pc, p)) {
          activeId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
          R.drag = { pc: pc, dx: pc.x - p[0], dy: pc.y - p[1] }; pc.back = null;
          R.pieces.splice(k, 1); R.pieces.push(pc);
          pop(noteF(1), 0.06, 0, 0.14); vib(6); return;
        }
      }
    }
    if (R.phase === 'tapReady' && Math.hypot(p[0] - 195, p[1] - 395) < 175) {
      R.tap = p; R.phase = 'reveal'; R.t = 0; R.sq = 0; chord([0, 2, 4, 7, 9, 12], 0.06, 0.06); vib([20, 30, 20]);
      burst(p[0], p[1], 16); burst(p[0], p[1], 40);
    }
  }
  function rewardMove(p) { if (!R || !R.drag) return; var pc = R.drag.pc; pc.x = p[0] + R.drag.dx; pc.y = p[1] + R.drag.dy; }
  function rewardUp() {
    if (!R || !R.drag) return; var pc = R.drag.pc; R.drag = null;
    var tg = pieceCenterTarget(pc);
    if (Math.hypot(pc.x - tg[0], pc.y - tg[1]) < 46) { pc.placed = true; pc.snap = { x: pc.x, y: pc.y, t: 0 }; pop(140, 0.08, 0, 0.18); pop(noteF(5), 0.06, 0.05); vib(14); }
    else { pc.back = { x: pc.x, y: pc.y, t: 0 }; pop(noteF(0) * 0.6, 0.04); }
  }
  function updateReward(dt) {
    R.t += dt;
    R.pieces.forEach(function (pc) {
      var targetSc = (R.drag && R.drag.pc === pc) || pc.placed ? 1 : 0.5;
      pc.sc += (targetSc - pc.sc) * Math.min(1, dt * 14);
      if (pc.snap) { pc.snap.t += dt; var u = easeOut(pc.snap.t / 0.2), tg = pieceCenterTarget(pc); pc.x = lerp(pc.snap.x, tg[0], u); pc.y = lerp(pc.snap.y, tg[1], u); if (pc.snap.t >= 0.2) pc.snap = null; }
      if (pc.back) { pc.back.t += dt; var v = easeOut(pc.back.t / 0.25); pc.x = lerp(pc.back.x, pc.home[0], v); pc.y = lerp(pc.back.y, pc.home[1], v); if (pc.back.t >= 0.25) pc.back = null; }
    });
    if (R.phase === 'enter' && R.t > 0.6) { R.phase = 'place'; R.t = 0; }
    if (R.phase === 'place' && R.pieces.every(function (pc) { return pc.placed && !pc.snap; })) {
      R.phase = 'stitch'; R.t = 0; R.tick = 0; R.cheered = false;
      burst(195, 395, 40); pop(110, 0.09, 0, 0.25); vib(18);
    }
    if (R.phase === 'stitch') {
      // 0–0,45 s: cả món nảy lên; 0,3–1,4 s: kim khâu chạy dọc đường nối; 1,4 s: vui mừng và lắc nhẹ
      var k = clamp(R.t / 0.45, 0, 1), dur = 0.6 + 0.5 * R.seams.length, endT = 0.3 + dur;
      R.sq = reduce ? 0 : 0.08 * Math.sin(k * Math.PI * 2) * (1 - k);
      R.stitch = clamp((R.t - 0.3) / dur, 0, 1); R.tick -= dt;
      if (R.tick <= 0 && R.stitch > 0 && R.stitch < 1) { pop(noteF(5 + Math.floor(R.stitch * 5)), 0.03, 0, 0.09); R.tick = 0.1; vib(3); }
      if (R.stitch >= 1 && !R.cheered) {
        R.cheered = true; chord([4, 7, 9], 0.06, 0.07); vib([15, 30, 15]);
        R.seams.forEach(function (sm) { var a = sm[0], b = sm[sm.length - 1]; sparkle(a[0], a[1], 6); sparkle(b[0], b[1], 6); burst(a[0], a[1], 12); burst(b[0], b[1], 12); });
        burst(195, 390, 60);
      }
      var w = clamp((R.t - endT) / 0.7, 0, 1);
      R.wig = reduce || R.t < endT ? 0 : 0.05 * Math.sin(w * Math.PI * 4) * (1 - w);
      if (R.t > endT + 0.75) { R.phase = 'tapReady'; R.t = 0; R.wig = 0; R.sq = 0; }
    }
    if (R.phase === 'tapReady') R.sq = reduce ? 0 : 0.012 * Math.sin(clock * 3);
    if (R.phase === 'reveal') {
      R.reveal = easeInOut(R.t / 1.0);
      if (R.t > 1.0) { R.phase = 'decor'; R.t = 0; R.decorT = 0; sparkle(R.tap[0], R.tap[1], 18); }
    }
    if (R.phase === 'decor') {
      var idx = Math.floor(R.t / 0.24);
      var DEC = DECOR[product().id];
      while (R.decor.length <= idx && R.decor.length < DEC.length) {
        var dI = R.decor.length; R.decor.push(clock);
        pop(noteF(3 + dI), 0.07, 0, 0.3); vib(8);
        var dp = DEC[dI].at(); sparkle(dp[0], dp[1], 6); burst(dp[0], dp[1], 8);
      }
      if (R.decor.length >= DEC.length && R.t > DEC.length * 0.24 + 0.4) { R.phase = 'done'; R.t = 0; confetti(70); chord([0, 4, 7, 12, 16], 0.07, 0.09); }
    }
  }
  function smile(p, k, spread) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
    ctx.beginPath(); ctx.ellipse(-spread, -2, 7, 4.5, 0, 0, 7); ctx.ellipse(spread, -2, 7, 4.5, 0, 0, 7); ctx.fillStyle = rgba(C.roseDeep, 0.75); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, -2); ctx.quadraticCurveTo(0, 6, 7, -2); ctx.lineWidth = 2.6; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
  }
  // Decor xuất hiện lần lượt sau lần chạm duy nhất.
  var DECOR = {
    mushroom: [
      { at: function () { return ptOf(0, 0.5, 0.12); }, draw: function (p, k) { ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k); ctx.rotate(-0.5);
        ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(-14, -6, 0, -22); ctx.quadraticCurveTo(14, -6, 0, 6); ctx.fillStyle = C.sage; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -16); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); } },
      { at: function () { return ptOf(0, 0.30, 0.36); }, draw: function (p, k) { star(p, 7 * k, '#FFFFFF'); } },
      { at: function () { return ptOf(0, 0.72, 0.30); }, draw: function (p, k) { star(p, 5 * k, '#FFFFFF'); } },
      { at: function () { return ptOf(1, 0.42, 0.44); }, draw: function (p, k) { eye(p, k); } },
      { at: function () { return ptOf(1, 0.58, 0.44); }, draw: function (p, k) { eye(p, k); } },
      { at: function () { return ptOf(1, 0.50, 0.53); }, draw: function (p, k) { smile(p, k, 24); } },
      { at: function () { return ptOf(1, 0.62, 0.72); }, draw: function (p, k) {
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fillStyle = '#C89A6A'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.fillStyle = C.ink; [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].forEach(function (q) { ctx.beginPath(); ctx.arc(q[0], q[1], 1.3, 0, 7); ctx.fill(); });
        ctx.restore(); } }
    ],
    icecream: [
      { at: function () { return ptOf(2, 0.52, 0.10); }, draw: function (p, k) {
        // quả anh đào trên đỉnh viên kem
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
        ctx.beginPath(); ctx.moveTo(2, -10); ctx.quadraticCurveTo(6, -24, 16, -28); ctx.lineWidth = 2.4; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fillStyle = '#D9665F'; ctx.fill(); ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(-3.5, -3.5, 3, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.restore(); } },
      { at: function () { return ptOf(2, 0.26, 0.40); }, draw: function (p, k) { star(p, 7 * k, '#FFFFFF'); } },
      { at: function () { return ptOf(2, 0.78, 0.44); }, draw: function (p, k) { star(p, 5 * k, '#FFFFFF'); } },
      { at: function () { return ptOf(2, 0.40, 0.42); }, draw: function (p, k) { eye(p, k); } },
      { at: function () { return ptOf(2, 0.60, 0.42); }, draw: function (p, k) { eye(p, k); } },
      { at: function () { return ptOf(2, 0.50, 0.51); }, draw: function (p, k) { smile(p, k, 26); } },
      { at: function () { return ptOf(3, 0.50, 0.50); }, draw: function (p, k) {
        // trái tim may đắp trên ốc quế
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
        ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-14, -1, -9, -13, 0, -5); ctx.bezierCurveTo(9, -13, 14, -1, 0, 9);
        ctx.fillStyle = C.rose; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1.2; ctx.strokeStyle = '#FFFFFF'; ctx.scale(0.7, 0.7); ctx.stroke(); ctx.restore(); } }
    ],
    cardigan: [
      { at: function () { return ptOf(5, 0.5, 0.34); }, draw: function (p, k) { coatButton(p, k); } },
      { at: function () { return ptOf(5, 0.5, 0.48); }, draw: function (p, k) { coatButton(p, k); } },
      { at: function () { return ptOf(5, 0.5, 0.62); }, draw: function (p, k) { coatButton(p, k); } },
      { at: function () { return ptOf(5, 0.5, 0.76); }, draw: function (p, k) { coatButton(p, k); } },
      { at: function () { return ptOf(4, 0.33, 0.72); }, draw: function (p, k) { pocket(p, k); } },
      { at: function () { return ptOf(4, 0.67, 0.72); }, draw: function (p, k) { pocket(p, k); } },
      { at: function () { return ptOf(4, 0.68, 0.46); }, draw: function (p, k) {
        // ghim cài hoa nhỏ trên ngực áo
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
        ctx.beginPath(); ctx.ellipse(-4, 9, 4, 8, -0.6, 0, 7); ctx.ellipse(5, 9, 4, 8, 0.6, 0, 7); ctx.fillStyle = C.sageDeep; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.ink; ctx.stroke();
        for (var q = 0; q < 5; q++) { var a = q * 1.2566; ctx.beginPath(); ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6 - 2, 5, 0, 7); ctx.fillStyle = C.mustard; ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, -2, 3.4, 0, 7); ctx.fillStyle = C.roseDeep; ctx.fill(); ctx.stroke(); ctx.restore(); } }
    ]
  };
  function coatButton(p, k) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, 7); ctx.fillStyle = '#3F5F5C'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  function pocket(p, k) {
    // túi áo bằng len gân, viền mũi khâu
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k); ctx.rotate(-0.04);
    rr(-15, -12, 30, 26, 4); ctx.fillStyle = '#6F9C98'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.fillStyle = 'rgba(148,188,183,0.9)'; ctx.fillRect(-13, -10, 26, 6);
    rr(-11, -2, 22, 13, 2); ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1.2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function patch(p, k) {
    // miếng vá khuỷu tay bằng nỉ, có mũi khâu viền
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 13, 0, 0, 7); ctx.fillStyle = C.sage; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 10, 0, 0, 7); ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1.2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    ctx.restore();
  }
  function star(p, r, c) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.beginPath();
    for (var k = 0; k < 8; k++) { var rad = k % 2 ? r * 0.38 : r; var an = k * Math.PI / 4 - Math.PI / 2; ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
    ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.restore();
  }
  function eye(p, k) { ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k); ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, 7); ctx.fillStyle = C.ink; ctx.fill(); ctx.beginPath(); ctx.arc(1.4, -1.6, 1.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }

  function drawReward() {
    var enter = clamp(R.t / 0.6, 0, 1), a = R.phase === 'enter' ? easeOut(enter) : 1;
    ctx.save(); ctx.globalAlpha = a;
    // vải nền tròn bằng nỉ
    var deep = R.phase === 'reveal' || R.phase === 'decor' || R.phase === 'done';
    ctx.beginPath(); ctx.arc(195, 395, 165, 0, 7); ctx.fillStyle = C.base; ctx.fill();
    ctx.beginPath(); ctx.arc(195, 395, 155, 0, 7); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(C.thread, 0.8); ctx.stroke(); ctx.setLineDash([]);
    // ô mờ của từng mảnh trên khung
    product().levels.forEach(function (i) {
      var tf = placeOf(i);
      outlinePath(LV[i].outline, tf.ox, tf.oy, tf.s); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.ink, 0.3); ctx.stroke(); ctx.setLineDash([]);
    });
    // khay đặt mảnh
    rr(20, 628, 350, 152, 24); ctx.fillStyle = rgba(C.paper, 0.9); ctx.fill();
    ctx.restore();

    // mảnh dưới vẽ trước, mảnh trên đè lên (thân nấm rồi mũ; ốc quế rồi viên kem)
    var order = R.phase === 'place' || R.phase === 'enter' ? R.pieces : backToFront().map(function (li) { return R.pieces.filter(function (p) { return p.i === li; })[0]; });
    var placing = R.phase === 'place' || R.phase === 'enter';
    ctx.save(); if (!placing) productTf();
    order.forEach(function (pc) {
      var lv = LV[pc.i], s = pc.tf.s * pc.sc, dragging = R.drag && R.drag.pc === pc;
      drawPiece(pc.i, pc.x - lv.cen[0] * s, pc.y - lv.cen[1] * s, s, 1, dragging, 0.6, 0);
    });
    if (R.phase === 'stitch' || R.phase === 'tapReady') {
      drawSeam(R.stitch);
      if (R.stitch > 0 && R.stitch < 1) { var sn = seamPoint(R.stitch); drawNeedle(sn[0], sn[1] - 2 * Math.abs(Math.sin(clock * 22)), sn[2]); }
    }
    ctx.restore();
    if (deep) {
      ctx.save(); ctx.beginPath(); ctx.arc(R.tap[0], R.tap[1], 30 + 330 * R.reveal, 0, 7); ctx.clip();
      ctx.beginPath(); ctx.arc(195, 395, 165, 0, 7); ctx.fillStyle = C.baseDeep; ctx.fill();
      ctx.beginPath(); ctx.arc(195, 395, 155, 0, 7); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); ctx.setLineDash([]);
      backToFront().forEach(function (li) { var tf = placeOf(li); drawPiece(li, tf.ox, tf.oy, tf.s, 1, false, 1, 1); });
      drawSeam(1);
      ctx.restore();
      if (R.phase === 'reveal') {
        // mép màu loang: vòng trắng dày có viền tối mờ để nổi trên nền sáng, kèm chớp trắng ở đầu
        var rr2 = 30 + 330 * R.reveal, fa = 1 - R.reveal;
        var g = ctx.createRadialGradient(R.tap[0], R.tap[1], 0, R.tap[0], R.tap[1], rr2);
        g.addColorStop(0, 'rgba(255,255,255,' + 0.55 * fa * fa + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(R.tap[0], R.tap[1], rr2, 0, 7); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(74,59,53,' + 0.16 * fa + ')'; ctx.stroke();
        ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, fa * 1.4) + ')'; ctx.stroke();
        ctx.beginPath(); ctx.arc(R.tap[0], R.tap[1], rr2 * 0.82, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * fa + ')'; ctx.stroke();
      }
    }
    var DEC = DECOR[product().id];
    for (var d = 0; d < R.decor.length; d++) { var k = easeBack(clamp((clock - R.decor[d]) / 0.3, 0, 1)); DEC[d].draw(DEC[d].at(), k); }
    if (R.phase === 'tapReady') {
      var tt = (clock % 1.2) / 1.2;
      ctx.beginPath(); ctx.arc(195, 400, 26 + 40 * tt, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = rgba(C.ink, 0.5 * (1 - tt)); ctx.stroke();
      ctx.beginPath(); ctx.arc(195, 400, 12, 0, 7); ctx.fillStyle = rgba(C.ink, 0.25 + 0.15 * Math.sin(clock * 5)); ctx.fill();
    }
    if (R.phase === 'done') {
      var ra = easeBack(clamp(R.t / 0.4, 0, 1));
      ctx.save(); ctx.translate(195, 761); ctx.scale(ra, ra);
      rr(-100, -29, 200, 58, 18); ctx.fillStyle = C.ink; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (S.pi + 1 < PRODUCTS.length) {
        ctx.beginPath(); ctx.moveTo(48, -8); ctx.lineTo(56, 0); ctx.lineTo(48, 8); ctx.stroke();
        text('Màn tiếp', -6, 1, 19, 800, '#fff', 'center');
      } else {
        ctx.beginPath(); ctx.arc(-46, 0, 9, -0.4, 4.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-36, -9); ctx.lineTo(-37.5, -1); ctx.lineTo(-44, -6); ctx.stroke();
        text('Chơi lại', 10, 1, 19, 800, '#fff', 'center');
      }
      ctx.restore();
    }
  }
  function drawSeam(p) {
    // đường chỉ khâu dọc chỗ các mảnh giáp nhau, khâu xong đường này mới sang đường kế
    if (p <= 0) return;
    var cur = seamPart(p);
    ctx.save(); ctx.lineCap = 'round';
    for (var k = 0; k < R.seams.length; k++) {
      var seam = R.seams[k], q = p >= 1 || k < cur.k ? 1 : (k === cur.k ? cur.p : 0);
      if (q <= 0) continue;
      var end = seamPointOf(seam, q), n = seam.length - 1, upto = Math.floor(q * n);
      ctx.beginPath(); ctx.moveTo(seam[0][0], seam[0][1]);
      for (var i = 1; i <= upto; i++) ctx.lineTo(seam[i][0], seam[i][1]);
      ctx.lineTo(end[0], end[1]);
      ctx.setLineDash([7, 5]); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      ctx.lineWidth = 2.6; ctx.strokeStyle = C.mustardDeep; ctx.stroke();
    }
    ctx.restore();
  }
  function restart() {
    S.hints = 3; S.parts = []; loadProduct(0); chord([0, 4], 0.05);
  }

  /* ---------- khung hình ---------- */
  function draw() {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    drawTop();
    if (S.scene === 'play') { drawInfo(); drawPlay(); drawBoosters(); }
    else drawReward();
    drawRipples();
    drawParts();
    drawMenu();
  }

  loadProduct(0);
  var go = function () { requestAnimationFrame(frame); };
  if (document.fonts && document.fonts.load) document.fonts.load('800 16px "Baloo 2"').then(go, go); else go();
})();

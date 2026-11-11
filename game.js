/* Màn chơi: vẽ bằng một canvas khung dọc 390×844, mọi số đo theo pt của wireframe. */
(function () {
  'use strict';
  var W = 390, H = 844;
  var C = {
    bg: '#F6EFE3', paper: '#FBF7EF', card: '#FFFDF8', ink: '#4A3B35', inkSoft: '#6B5B53', mute: '#9C8E86',
    rose: '#E3A6A1', roseDeep: '#D4837C', sage: '#A9C1A0', sageDeep: '#82A57C', mustard: '#E9C46A', mustardDeep: '#CF9F3A',
    blue: '#9DB8C9', halo: '#FFFAF0', fabric: '#F3DED6', weave: '#E8CCC2', thread: '#C29C90', hole: '#E3C2B6', chip: '#F1E1CF',
    barFar: '#EEB8B0', barMid: '#D88A74', barNear: '#5DB582', base: '#EEE2CB', baseDeep: '#F0CF83', cream: '#FFF7E8'
  };
  // Nền bổ trợ dịu dạng radial theo từng sản phẩm khi hoàn thiện (Hướng A).
  var STAGE_BG = {
    icecream: '#D9F0E7',
    cupcake: '#FCE6EF',
    duck: '#E1EEF8',
    mushroom: '#EFF2E4',
    acorn: '#F2E7D5',
    sunflower: '#E3EFE4',
    bonsai: '#E4EFE0'
  };
  var FONT = '"Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif';
  // Tấm vải vuông trong thẻ trắng, rộng gần hết chiều ngang màn hình (362/390 ≈ 93%) để node và viền dễ nhìn, dễ chạm.
  var FX = 14, FY = 256, FS = 362;
  var FCX = FX + FS * 0.5, FCY = FY + FS * 0.5;
  var THR_DEFAULT = 0.92, M1 = 0.70, M2 = 0.85;     // ngưỡng mặc định của đặc tả và hai mốc màu; ngưỡng thật lấy theo level
  var RUN_SPEED = 0.68;                              // bề rộng vải mỗi giây
  // Cảnh cắt khi thắng: hệ số tốc độ theo chu vi để cắt hết trong khoảng CUT_TARGET giây, kẹp trong [MIN, MAX] (giá trị tạm).
  // Hút nhẹ về viền mẫu khi kéo: trong bán kính MAG_R (bề rộng vải) node bị kéo lệch về điểm gần nhất
  // trên viền tối đa MAG_PULL phần; thả tay trong bán kính thì đặt hẳn lên viền. Chỉ hút vuông góc với viền,
  // vị trí dọc viền vẫn do người chơi quyết định nên không tự giải hộ. (giá trị tạm)
  var MAG_R = 0.035, MAG_PULL = 0.5;
  var PIN_MAG_R = 0.048, PIN_SNAP_R = 0.038;
  // Một bán kính duy nhất để coi node là đã cắm vào chốt: bộ đếm chốt, điều kiện thắng, gợi ý uốn, nút kéo dây,
  // hiệu ứng khớp dây và chốt đã có người đều dùng chung, để không tín hiệu nào báo "đã cắm" khi tín hiệu khác báo chưa.
  var PIN_ON_R = PIN_SNAP_R + 0.008;
  // Snap khi thắng: mọi node (và cây kim) đi cùng một tốc độ cố định, đi thẳng một mạch không tăng giảm tốc.
  // Phase dài theo node xa nhất, kẹp trong [MIN, MAX]; xa quá thì cả nhóm cùng nhanh lên một tốc độ chung. (giá trị tạm)
  var SNAP_SPEED = 0.4, SNAP_MIN = 0.2, SNAP_MAX = 0.5, SETTLE_T = 0.12;
  var SHOW_FOLD_NEEDLE = false;
  var NODE_HALO = 1.5, NODE_HALO_A = 0.7;           // viền sáng quanh node: mỏng và hơi trong, chỉ vừa đủ tách node khỏi nền
  var CUT_NODE_SIZE = 0.75;
  var UNFOLD_T = 0.9, UNFOLD_HOLD = 0.3;          // lật bung và nhịp dừng ngắn sau khi mở hẳn (giá trị tạm)
  var NEEDLE_HIT = 0.065, NEEDLE_MIN = 0.25, NEEDLE_MAX = 0.5; // vùng chạm cây kim (>= 44 pt) và khoảng kim đi được
  // Thanh gạt dài bên dưới khung vải để kéo kim cho rõ; hút nhẹ kim về đúng trục (bật tắt để thử cảm giác).
  var SLIDER_Y = 656, SLIDER_X = 368, SLIDER_HIT = 26, NEEDLE_MAG_ON = true, NEEDLE_MAG_R = 0.025, NEEDLE_MAG_PULL = 0.6;                                // thời gian lật bung mảnh gấp đôi (giá trị tạm)                          // node thu nhỏ trong chuỗi hoàn thành để không che đường cắt
  var CUT_TARGET = 1.5, CUT_MULT_MIN = 1.6, CUT_MULT_MAX = 2.5;
  // v3: chạm trong các cảnh tự chạy (snap, cắt, lật, bay, khâu) thì tua nhanh cố định 1,5 lần, không tăng thêm.
  var FAST = 1.5;
  var PICK_MIN = 0.088, PICK_MAX = 0.22, MOVE_EPS = 0.016;
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
  function screenToWorld(p) {
    var c = S.cam;
    if (!c || (c.scale === 1 && c.x === 0 && c.y === 0)) return [p[0], p[1]];
    return [
      FCX + (p[0] - FCX - c.x) / c.scale,
      FCY + (p[1] - FCY - c.y) / c.scale
    ];
  }
  function worldToScreen(w) {
    var c = S.cam;
    if (!c || (c.scale === 1 && c.x === 0 && c.y === 0)) return [w[0], w[1]];
    return [
      FCX + (w[0] - FCX) * c.scale + c.x,
      FCY + (w[1] - FCY) * c.scale + c.y
    ];
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeBack(t) { t = clamp(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function hex(c) {
    if (c && c.charAt(0) === '#') return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
    var m = String(c).match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }
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
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain();
      master.gain.value = 1.0;

      // Hướng 1: Master Dynamics Compressor - Nâng âm nhỏ, làm dày dải trung và chống rè/vỡ loa điện thoại
      var comp = AC.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-22, AC.currentTime);
      comp.knee.setValueAtTime(30, AC.currentTime);
      comp.ratio.setValueAtTime(4.0, AC.currentTime);
      comp.attack.setValueAtTime(0.003, AC.currentTime);
      comp.release.setValueAtTime(0.18, AC.currentTime);

      master.connect(comp);
      comp.connect(AC.destination);
    } catch (e) { AC = null; }
  }
  function noteF(n) { return 523.25 * Math.pow(2, PENTA[((n % PENTA.length) + PENTA.length) % PENTA.length] / 12); }
  function pop(f, vol, when, dur) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime + (when || 0); dur = dur || 0.22;
    var v = (vol || 0.06) * 2.2;
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.9, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    var o2 = AC.createOscillator(), g2 = AC.createGain();
    o2.type = 'sine'; o2.frequency.setValueAtTime(f * 2.01, t);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.4);
    o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + dur);
  }
  function noise(dur, vol, freq, type, when) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime + (when || 0), n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = b; f.type = type || 'highpass'; f.frequency.value = freq || 2800; g.gain.value = (vol || 0.05) * 2.2;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  // Nốt leo dần không giới hạn: hết một quãng tám ngũ cung thì lên quãng kế, không vòng về nốt trầm.
  function risingF(k) { var P = [0, 2, 4, 7, 9]; return 523.25 * Math.pow(2, (12 * Math.floor(k / 5) + P[k % 5]) / 12); }
  function chord(ns, vol, gap) { for (var i = 0; i < ns.length; i++) pop(noteF(ns[i]), vol, i * (gap || 0.07), 0.5); }

  /* ---------- v3: tiếng chỉ căng, dây gảy, tiếng vải ---------- */
  // Mọi cao độ mới đều lấy từ cùng gốc Đô 523,25 Hz và cùng thang ngũ cung với tiếng kéo đi qua node,
  // không rung giọng (vibrato), không lệch cent, nên chồng lên tiếng kéo lúc nào cũng hòa.
  // pentaF(bậc, quãng tám): bậc 0 = Đô của quãng đó, mỗi 5 bậc lên một quãng tám. quãng -1 = Đô 4, -2 = Đô 3.
  function pentaF(step, oct) { var P = [0, 2, 4, 7, 9], o = Math.floor(step / 5), k = ((step % 5) + 5) % 5; return 523.25 * Math.pow(2, oct + o + P[k] / 12); }
  // Dây gảy kiểu Karplus-Strong: kích bằng nhiễu đã làm mềm để tiếng ấm như dây đàn gỗ, không chói.
  // Dây số nguyên mẫu nên lệch vài cent; bù bằng playbackRate để đúng cao độ tuyệt đối như tiếng pop.
  var ksCache = {};
  function ksBuffer(f) {
    var key = Math.round(f * 100); if (ksCache[key]) return ksCache[key];
    var sr = AC.sampleRate, N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 1.6), b = AC.createBuffer(1, len, sr), d = b.getChannelData(0);
    var ring = new Float32Array(N), prev = 0, i;
    for (i = 0; i < N; i++) { prev = prev * 0.55 + (Math.random() * 2 - 1) * 0.45; ring[i] = prev; }
    for (var j = 0, idx = 0; j < len; j++) {
      var a = ring[idx], nb = ring[(idx + 1) % N];
      d[j] = a; ring[idx] = (a + nb) * 0.5 * 0.996; idx = (idx + 1) % N;
    }
    return (ksCache[key] = { buf: b, rate: f * (N + 0.5) / sr });
  }
  function pluck(f, vol, when) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime + (when || 0), k = ksBuffer(f), s = AC.createBufferSource(), lp = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = k.buf; s.playbackRate.value = k.rate;
    lp.type = 'lowpass'; lp.frequency.value = Math.min(4200, f * 5);
    var v = (vol || 0.065) * 2.2;
    g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0.0001, t + 0.45, 0.3);
    s.connect(lp); lp.connect(g); g.connect(master); s.start(t); s.stop(t + 1.6);
  }
  // Tiếng sợi chỉ rút qua vải: nhiễu lọc dải, tâm lọc trượt lên. Không có cao độ nên không thể lệch tông.
  function sweep(dur, vol, f0, f1, when) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime + (when || 0), n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = b; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.value = (vol || 0.05) * 2.8;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  // Âm trầm ấm và dịu khi kéo qua vùng preview vải (sóng sine + triangle qua lọc thông thấp, không chói gắt)
  function softTone(f, vol, dur) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime; dur = dur || 0.14;
    var v = (vol || 0.04) * 2.2;
    var o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.setValueAtTime(f * 1.18, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    o2.frequency.setValueAtTime(f * 0.5, t);
    lp.type = 'lowpass'; lp.frequency.value = f * 2.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  /* ---------- Âm thanh chốt gỗ / cúc áo khi node khớp vào chốt mẫu ---------- */
  function pinSnapSound(step, isLastPin) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime;
    var f = pentaF(step || 0, 0); // Thang ngũ cung C5-A5 (523Hz - 880Hz), cao độ rõ nét trên loa điện thoại/laptop
    
    // 1. Tiếng click gõ tiếp xúc (Transient click): tiếng "tách" đanh gọn của gỗ/cúc áo, dải thông 2500Hz
    var nLen = Math.floor(AC.sampleRate * 0.016);
    var b = AC.createBuffer(1, nLen, AC.sampleRate), bd = b.getChannelData(0);
    for (var i = 0; i < nLen; i++) bd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.26));
    var s = AC.createBufferSource(), bp = AC.createBiquadFilter(), ng = AC.createGain();
    s.buffer = b; bp.type = 'bandpass'; bp.frequency.setValueAtTime(2500, t); bp.Q.setValueAtTime(3.2, t);
    ng.gain.setValueAtTime(0.32, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);
    s.connect(bp); bp.connect(ng); ng.connect(master);
    s.start(t);
    
    // 2. Thân âm gỗ ấm kiểu Kalimba / mộc cầm: nốt nhạc trong trẻo, trượt nhẹ 18% xuống tạo cảm giác cắm chốt chắc nịch
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.18, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.012);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.38, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.24);
    
    // 3. Họa âm gỗ ấm (triangle overtone ở quãng 8) tạo độ đầm và độ dày cho tiếng gỗ thủ công
    var o2 = AC.createOscillator(), g2 = AC.createGain(), lp2 = AC.createBiquadFilter();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(f * 2.0, t);
    lp2.type = 'lowpass'; lp2.frequency.setValueAtTime(f * 3.2, t);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(0.14, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o2.connect(lp2); lp2.connect(g2); g2.connect(master);
    o2.start(t); o2.stop(t + 0.09);
    
    // 4. Nếu là chốt cuối cùng: hòa âm thêm nốt quãng 5 vang nhẹ ngân dài như chúc mừng hoàn thành chốt
    if (isLastPin) {
      var o3 = AC.createOscillator(), g3 = AC.createGain();
      o3.type = 'sine';
      o3.frequency.setValueAtTime(f * 1.5, t + 0.035);
      g3.gain.setValueAtTime(0.0001, t + 0.035);
      g3.gain.linearRampToValueAtTime(0.22, t + 0.040);
      g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o3.connect(g3); g3.connect(master);
      o3.start(t + 0.035); o3.stop(t + 0.35);
    }
  }

  /* ---------- Âm thanh chạm hút từ tính nhẹ khi rê qua chốt (Pin hover / magnet) ---------- */
  function pinHoverSound(step) {
    if (!AC || !soundOn) return;
    var t = AC.currentTime;
    var f = pentaF(step || 0, 0);
    // Click gõ siêu nhẹ 10ms
    var nLen = Math.floor(AC.sampleRate * 0.010);
    var b = AC.createBuffer(1, nLen, AC.sampleRate), bd = b.getChannelData(0);
    for (var i = 0; i < nLen; i++) bd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.3));
    var s = AC.createBufferSource(), bp = AC.createBiquadFilter(), ng = AC.createGain();
    s.buffer = b; bp.type = 'bandpass'; bp.frequency.setValueAtTime(2600, t); bp.Q.setValueAtTime(3.5, t);
    ng.gain.setValueAtTime(0.18, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.010);
    s.connect(bp); bp.connect(ng); ng.connect(master);
    s.start(t);
    // Thân nốt nhẹ êm
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.15, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.010);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.12);
  }

  /* ---------- Âm thanh rút chỉ vải & gảy dây khi đường cong khớp viền ---------- */
  function curveSnapSound() {
    if (!AC || !soundOn) return;
    // Tiếng chỉ miết vào vải (sweep băng thông)
    sweep(0.12, 0.08, 1300, 3200);
    // Nốt Kalimba gảy sáng trong trẻo ở bậc 3 (Sol 784Hz)
    pluck(pentaF(3, 0), 0.11);
  }

  /* ---------- Quản lý hiệu ứng Curve Snap (Seam Zip Flash + Micro Bounce + Lint Puff) ---------- */
  function triggerSeamZip(k, uCenter, tStart) {
    S.seamZips = S.seamZips || [];
    S.seamZips.push({
      k: k,
      u: (uCenter !== undefined && uCenter !== null) ? uCenter : 0.5,
      t0: tStart !== undefined ? tStart : now(),
      dur: 0.32
    });
  }

  function triggerEdgeBounce(k, dirSign, tStart) {
    S.edgeBounces = S.edgeBounces || {};
    S.edgeBounces[k] = {
      t0: tStart !== undefined ? tStart : now(),
      dir: dirSign || 1,
      dur: 0.30,
      amp: 2.2
    };
  }

  var lastCurveSnapT = 0;
  function triggerCurveSnap(k, u, dirSign) {
    var clk = now();
    var isRecent = (clk - lastCurveSnapT) < 0.14;
    lastCurveSnapT = clk;

    // 1. Âm thanh & haptic
    if (!isRecent) {
      curveSnapSound();
      vib([6, 12, 8]);
    }

    // 2. Tia viền chỉ vàng rực rỡ (Seam Zip Flash)
    triggerSeamZip(k, u);

    // 3. Độ nảy đàn hồi vi mô (Micro Elastic Bounce)
    triggerEdgeBounce(k, dirSign);

    // 4. Bụi tơ tằm li ti (Yarn Dust Puff)
    if (!isRecent && LV[S.li] && LV[S.li].def) {
      var lv = LV[S.li].def;
      if (lv.ring && k >= 0 && k < lv.ring.length) {
        var ra = lv.ring[k], rb = lv.ring[(k + 1) % lv.ring.length];
        var poly = GN.edgePoly(lv, S.pos, ra, rb, 20, polyBuf, S.bend);
        var pt = polyPointAt(poly, (u !== undefined && u !== null) ? u : 0.5);
        var ang = pt[2] + Math.PI / 2 * (dirSign || 1);
        lint(X(pt[0]), Y(pt[1]), ang, 5);
      }
    }
    S.dirty = true;
  }
  // Chỉ căng khi kéo node/cạnh: một dây trầm (Đô 3 tới La 3) đứng hẳn ở một nốt ngũ cung, bước lên nốt kế khi
  // độ khớp tăng; chạm ngưỡng thì về Đô 4 (chủ âm) nghe như "đã căng đủ". Chỉ ngân theo nhịp tay di chuyển,
  // tay đứng yên thì lặng gần hết, nên không thành tiếng ù liên tục. Kèm tiếng sột soạt vải rất nhỏ (không cao độ).
  var HUM_STEPS = 5, hum = null, humNoise = null;
  function humStart() {
    if (!AC || hum) return;
    var t = AC.currentTime, f = pentaF(0, -2);
    if (!humNoise) { humNoise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var nd = humNoise.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; }
    var o1 = AC.createOscillator(), o2 = AC.createOscillator(), g2 = AC.createGain(), lp = AC.createBiquadFilter(), g = AC.createGain();
    var nz = AC.createBufferSource(), bp = AC.createBiquadFilter(), gn = AC.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = 0.35;
    lp.type = 'lowpass'; lp.frequency.value = 350; lp.Q.value = 0.5; g.gain.value = 0.0001;
    nz.buffer = humNoise; nz.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.7; gn.gain.value = 0.0001;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(master);
    nz.connect(bp); bp.connect(gn); gn.connect(master);
    o1.start(t); o2.start(t); nz.start(t);
    hum = { o1: o1, o2: o2, lp: lp, g: g, gn: gn, nz: nz, step: -1, mot: 0 };
  }
  function humStop() {
    if (!hum) return; var h = hum, t = AC.currentTime; hum = null;
    h.g.gain.setTargetAtTime(0.0001, t, 0.06); h.gn.gain.setTargetAtTime(0.0001, t, 0.04);
    h.o1.stop(t + 0.5); h.o2.stop(t + 0.5); h.nz.stop(t + 0.5);
  }
  function humUpdate(dt, tension, ready, speed) {
    if (!hum) return;
    var t = AC.currentTime;
    hum.mot += (Math.min(1, speed / 700) - hum.mot) * Math.min(1, dt * 10);
    var step = ready ? HUM_STEPS : Math.min(HUM_STEPS - 1, Math.floor(tension * HUM_STEPS));
    if (step !== hum.step) {
      hum.step = step; var f = pentaF(step, -2);
      hum.o1.frequency.setTargetAtTime(f, t, 0.01); hum.o2.frequency.setTargetAtTime(f * 2, t, 0.01);
    }
    hum.lp.frequency.setTargetAtTime(350 + 1300 * tension, t, 0.05);
    hum.g.gain.setTargetAtTime(soundOn ? 0.005 + 0.035 * hum.mot : 0.0001, t, 0.05);
    hum.gn.gain.setTargetAtTime(soundOn ? 0.0001 + 0.016 * hum.mot * (1 - 0.5 * tension) : 0.0001, t, 0.05);
  }

  /* ---------- dữ liệu level ---------- */
  var LV = LEVELS.map(function (l) {
    GN.prepare(l);
    if (l.fold) return buildFold(l);
    var solMask = Uint8Array.from(GN.region(l, l.sol));
    var sp = GN.ringPath(l, l.sol, 24);
    var minx = 9, miny = 9, maxx = -9, maxy = -9, cx = 0, cy = 0, n = sp.pts.length / 2;
    for (var i = 0; i < sp.pts.length; i += 2) {
      minx = Math.min(minx, sp.pts[i]); maxx = Math.max(maxx, sp.pts[i]); miny = Math.min(miny, sp.pts[i + 1]); maxy = Math.max(maxy, sp.pts[i + 1]);
      cx += sp.pts[i]; cy += sp.pts[i + 1];
    }
    return { def: l, solMask: solMask, solPath: sp, outline: sp.pts, bbox: [minx, miny, maxx, maxy], cen: [cx / n, cy / n] };
  });

  // Gấp đôi vải: hình mở ra = vùng tô của nửa vòng cộng vùng tô bản soi gương qua mép gấp. Ghép hai nửa
  // thay vì một vòng kín nên vết lõm chạm mép gấp mở ra thành lỗ kín, không bị tô lấp.
  var foldTmp = null;
  function mirrorPts(pos, x, isY) {
    var res = pos.map(function (p) { return isY ? [p[0], 2 * x - p[1]] : [2 * x - p[0], p[1]]; });
    res._mir = -1;
    return res;
  }
  function unionRegion(l, pos, x, out, bends) {
    foldTmp = foldTmp || new Uint8Array(GN.N * GN.N);
    var isY = !!(l.fold && l.fold.axis === 'y');
    GN.region(l, pos, out, bends); GN.region(l, mirrorPts(pos, x, isY), foldTmp, bends);
    for (var i = 0; i < out.length; i++) out[i] |= foldTmp[i];
    return out;
  }
  function loopArea(pts) { var a = 0, n = pts.length / 2; for (var i = 0; i < n; i++) { var j = (i + 1) % n; a += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1]; } return a; }
  function buildFold(l) {
    var x = l.fold.solX, isY = l.fold.axis === 'y', solMask = unionRegion(l, l.sol, x, new Uint8Array(GN.N * GN.N)), rp = GN.ringPath(l, l.sol, 24);
    var loops = [], cp = [], cc = [], nodeD = [], brk = [], acc = 0;
    l.fold.chains.forEach(function (ch) {
      var a = rp.nodeD[ch[0]], b = rp.nodeD[ch[1]], seg = [];
      for (var i = 0; i < rp.cum.length; i++) if (rp.cum[i] >= a - 1e-6 && rp.cum[i] <= b + 1e-6) seg.push(rp.pts[i * 2], rp.pts[i * 2 + 1]);
      var start = acc; if (cp.length) brk.push(cp.length / 2);
      for (var k = 0; k < seg.length; k += 2) { if (k > 0) acc += Math.hypot(seg[k] - seg[k - 2], seg[k + 1] - seg[k - 1]); cp.push(seg[k], seg[k + 1]); cc.push(acc); }
      for (var r = ch[0]; r <= ch[1]; r++) nodeD[r] = start + (rp.nodeD[r] - a);
      var loop = seg.slice();
      for (var m = seg.length - 4; m >= 2; m -= 2) loop.push(isY ? seg[m] : 2 * x - seg[m], isY ? 2 * x - seg[m + 1] : seg[m + 1]);
      loops.push(loop);
    });
    // lỗ phải ngược chiều viền ngoài để tô kiểu nonzero chừa lỗ
    var s0 = loopArea(loops[0]);
    for (var q = 1; q < loops.length; q++) if (loopArea(loops[q]) * s0 > 0) { var rv = []; for (var z = loops[q].length - 2; z >= 0; z -= 2) rv.push(loops[q][z], loops[q][z + 1]); loops[q] = rv; }
    var outline = loops[0].slice(); outline.loops = loops;
    var minx = 9, miny = 9, maxx = -9, maxy = -9, cx = 0, cy = 0, n = outline.length / 2;
    for (var t = 0; t < outline.length; t += 2) { minx = Math.min(minx, outline[t]); maxx = Math.max(maxx, outline[t]); miny = Math.min(miny, outline[t + 1]); maxy = Math.max(maxy, outline[t + 1]); cx += outline[t]; cy += outline[t + 1]; }
    return { def: l, solMask: solMask, solPath: { pts: cp, cum: cc, nodeD: nodeD, total: acc, brk: brk }, outline: outline, bbox: [minx, miny, maxx, maxy], cen: [cx / n, cy / n] };
  }

  /* ---------- trạng thái ---------- */
  var S = {
    scene: 'play', phase: 'intro', t: 0, li: 0, pos: null, mask: new Uint8Array(GN.N * GN.N), seg: [],
    iouV: 0, lastIou: 0, dv: 0, dirty: true, drag: null, hints: 3, hint: null, done: [false, false],
    runK: 0, runT: 0, runDist: 0, path: null, lit: [], sc: [], pl: [], shake: [], ripples: [], parts: [],
    speed: 1, firstTouch: false, toast: 0, flash: 0, readyPulse: 0, fade: 0, snipPhase: 0, pi: 0,
    ready: false, slack: 2.5, pluckT: -9, moveAcc: 0, lastAction: 0, lastPinReleaseT: 0,
    cam: { scale: 1.0, targetScale: 1.0, x: 0, y: 0, targetX: 0, targetY: 0 }
  };
  window.GNJumpTo = jumpTo;
  window.GNState = function () { return { scene: S.scene, phase: S.phase, rphase: R ? R.phase : null, cam: S.cam, drag: S.drag, edgeDrag: S.edgeDrag, pos: S.pos, bend: S.bend, zips: S.seamZips ? S.seamZips.length : 0, li: S.li, iouV: S.iouV, ready: S.ready }; };
  window.GNWorldToScreen = worldToScreen;
  window.GNScreenToWorld = screenToWorld;
  function product() { return PRODUCTS[S.pi]; }
  // Sản phẩm thử riêng (standalone) không nằm trong chuỗi Màn tiếp; chơi xong thì chơi lại chính nó.
  // Hết chuỗi màn chính (màn 3) thì nút cuối là "Tiếp tục", đưa sang màn thử riêng (màn 4) thay vì chơi lại từ đầu.
  function hasNext() { return !product().standalone && S.pi + 1 < PRODUCTS.length; }
  function nextLabel() { return PRODUCTS[S.pi + 1] && PRODUCTS[S.pi + 1].standalone ? 'Tiếp tục' : 'Màn tiếp'; }
  /* ---------- danh sách chọn màn để thử nhanh ---------- */
  // Mỗi sản phẩm một khối: tiêu đề "Màn N", dưới là các nút mảnh xếp ngang, hết chỗ thì xuống dòng
  // (danh sách một cột cũ cao hơn màn hình khi có 6 sản phẩm nên không chọn được các màn cuối).
  var MENU = [], MENU_HEAD = [];
  PRODUCTS.forEach(function (p, pi) {
    MENU_HEAD.push({ label: p.label + (p.standalone ? ' · thử riêng' : ''), pi: pi });
    p.levels.forEach(function (li) { MENU.push({ label: LEVELS[li].name, pi: pi, li: li }); });
    MENU.push({ label: 'Ghép thành phẩm', pi: pi, li: -1 });
  });
  var MENU_X = 16, MENU_Y = 62, MENU_W = 358, MENU_PAD = 10, CHIP_H = 36, CHIP_GAP = 6, HEAD_H = 20, MENU_H = 0;
  // Tính vị trí từng nút (gọi mỗi lần vẽ, rẻ); vùng chạm nới thêm quanh nút cho dễ bấm.
  function layoutMenu() {
    var y = MENU_Y + MENU_PAD;
    ctx.font = '600 13.5px ' + FONT;
    MENU_HEAD.forEach(function (hd) {
      hd.y = y; y += HEAD_H;
      var x = MENU_X + MENU_PAD;
      MENU.forEach(function (m) {
        if (m.pi !== hd.pi) return;
        var w = Math.ceil(ctx.measureText(m.label).width) + 22;
        if (x + w > MENU_X + MENU_W - MENU_PAD) { x = MENU_X + MENU_PAD; y += CHIP_H + CHIP_GAP; }
        m.r = [x, y, w, CHIP_H]; x += w + CHIP_GAP;
      });
      y += CHIP_H + 8;
    });
    MENU_H = y - MENU_Y - 8 + MENU_PAD;
  }
  window.GNMenuItems = function () { layoutMenu(); return MENU.map(function (m) { return { pi: m.pi, li: m.li, label: m.label, r: m.r }; }); };
  function menuCurrent(m) { return m.pi === S.pi && (m.li === -1 ? S.scene === 'reward' : (S.scene === 'play' && m.li === S.li)); }
  function jumpTo(m) {
    S.parts = []; S.ripples = []; S.seamZips = []; S.edgeBounces = {}; S.cam = { scale: 1.0, targetScale: 1.0, x: 0, y: 0, targetX: 0, targetY: 0 }; S.readyGlowT = -9; S.winFlashT = -9; S.pi = m.pi; S.done = []; R = null; activeId = null;
    var lv = PRODUCTS[m.pi].levels;
    if (m.li === -1) { lv.forEach(function (l) { S.done[l] = true; }); S.scene = 'reward'; startReward(); }
    else { for (var k = 0; k < lv.indexOf(m.li); k++) S.done[lv[k]] = true; S.scene = 'play'; loadLevel(m.li); }
    pop(noteF(2), 0.05);
  }
  function drawMenu() {
    if (!S.menu) return;
    ctx.save(); ctx.fillStyle = 'rgba(74,59,53,0.18)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.shadowColor = 'rgba(74,59,53,0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    layoutMenu();
    rr(MENU_X, MENU_Y, MENU_W, MENU_H, 16); ctx.fillStyle = C.card; ctx.fill(); ctx.restore();
    rr(MENU_X, MENU_Y, MENU_W, MENU_H, 16); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
    MENU_HEAD.forEach(function (hd, k) {
      if (k > 0) { ctx.fillStyle = rgba(C.ink, 0.12); ctx.fillRect(MENU_X + MENU_PAD, hd.y - 4, MENU_W - MENU_PAD * 2, 1.2); }
      text(hd.label, MENU_X + MENU_PAD + 2, hd.y + 7, 13, 800, C.inkSoft, 'left');
    });
    MENU.forEach(function (m) {
      var r = m.r, cur = menuCurrent(m);
      rr(r[0], r[1], r[2], r[3], 10); ctx.fillStyle = cur ? C.chip : C.paper; ctx.fill();
      ctx.lineWidth = cur ? 2 : 1.3; ctx.strokeStyle = cur ? C.ink : rgba(C.ink, 0.25); ctx.stroke();
      text(m.label, r[0] + r[2] / 2, r[1] + r[3] / 2 + 1, 13.5, m.li === -1 ? 700 : 600, C.ink, 'center');
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
    S.bend = (d.startBend ? d.startBend : d.solBend).slice();
    S.foldX = d.fold ? d.fold.startX : 0.5; S.needle = null;
    S.sc = d.sol.map(function () { return 0; });
    S.pl = d.sol.map(function () { return 0; });
    S.shake = d.sol.map(function () { return -9; });
    S.edgeWake = d.ring.map(function () { return -9; });
    S.lit = []; S.drag = null; S.edgeDrag = null; S.hint = null; S.dirty = true; S.runK = 0; S.runT = 0; S.speed = 1; S.speedTarget = 1; S.settle = null; S.edgeSettle = null; S.waveSettle = null; S.needleSettle = null; S.firstTouch = false;
    S.seamZips = []; S.edgeBounces = {};
    S.ready = false; S.readyGlowT = -9; S.winFlashT = -9; S.pluckT = -9; S.moveAcc = 0; S.lastAction = now(); S.lastPinReleaseT = 0; humStop();
    setPhase('intro');
    recompute(); S.path = swayedRingPath(d, S.pos); S.lastIou = S.iouV; S.dv = barValue(S.iouV);
  }
  function setPhase(p) { S.phase = p; S.t = 0; }
  function locked(i) { return LV[S.li].def.locked.indexOf(i) >= 0; }
  /* ---------- gấp đôi vải: người chơi xếp nửa trái, nửa phải là bản soi gương qua cây kim (mép gấp) ---------- */
  function foldOf() { return LV[S.li].def.fold || null; }
  function foldY() { var f = foldOf(); return !!(f && f.axis === 'y'); }
  // node đầu và cuối của mỗi đoạn cắt nằm trên mép gấp, chạy theo cây kim và chỉ trượt dọc mép
  function onFold(i) { var f = foldOf(); return !!(f && f.chains.some(function (c) { return c[0] === i || c[1] === i; })); }
  function cutLen(lv) { return lv.solPath.total; }
  // Kiểm tra toàn bộ các chốt đã được cắm CHÍNH XÁC vào vị trí tương ứng của hình giải hay chưa
  function areAllPinsInCorrectPosition(def, pos) {
    if (!def || !def.sol) return true;
    var fo = foldOf();
    if (fo && Math.abs(S.foldX - fo.solX) > 0.025) return false;
    for (var i = 0; i < def.sol.length; i++) {
      var d = Math.hypot(pos[i][0] - def.sol[i][0], pos[i][1] - def.sol[i][1]);
      if (d > PIN_ON_R) return false;
    }
    return true;
  }

  // Kiểm tra hai đầu mút của cạnh k có đang được cắm chính xác vào hai chốt mục tiêu hay không
  function isPinAnchored(nodeIdx, targetQ) {
    var lv = LV[S.li] ? LV[S.li].def : null;
    if (!lv || !lv.sol) return false;
    var fo = foldOf();
    if (onFold(nodeIdx)) {
      if (fo && Math.abs(S.foldX - fo.solX) > 0.025) return false;
    }
    if (locked(nodeIdx)) return true;
    var p = (targetQ && nodeIdx === targetQ.i) ? targetQ.pos : S.pos[nodeIdx];
    if (!p) return false;
    var d = Math.hypot(p[0] - lv.sol[nodeIdx][0], p[1] - lv.sol[nodeIdx][1]);
    return d <= PIN_ON_R; // lúc thả vào chốt đã truyền vị trí chốt đích (targetQ) nên không cần nới cho nhịp settle
  }

  // Kiểm tra hai đầu mút của cạnh k có đang được cắm chính xác vào hai chốt mục tiêu hay không
  function isEdgeAnchoredToPins(k, targetQ) {
    var lv = LV[S.li] ? LV[S.li].def : null;
    if (!lv || !lv.ring) return false;
    return edgeTarget(k, targetQ) !== null;
  }

  // Chốt mà node đang nằm (bán kính "đã cắm" chung), hoặc -1. Ghim khóa luôn ở chốt của nó; node mép gấp chỉ tính
  // khi kim đã về đúng trục. Không so theo số thứ tự node, vì node nào vào chốt nào cũng được.
  function pinOf(i, targetQ) {
    var def = LV[S.li].def, fo = foldOf();
    if (onFold(i) && fo && Math.abs(S.foldX - fo.solX) > 0.025) return -1;
    if (locked(i)) return i;
    var p = (targetQ && i === targetQ.i) ? targetQ.pos : S.pos[i], best = -1, bd = PIN_ON_R;
    for (var j = 0; j < def.sol.length; j++) {
      var d = Math.hypot(p[0] - def.sol[j][0], p[1] - def.sol[j][1]);
      if (d <= bd) { bd = d; best = j; }
    }
    return best;
  }
  // Đích độ uốn của cạnh k theo chốt mà hai đầu đang nằm: nếu hai chốt là hai đầu một cạnh lời giải thì đích là độ uốn
  // lời giải của cạnh đó (đổi dấu nếu đi ngược chiều). Hai đầu chưa ở chốt, hoặc hai chốt không liền nhau trên viền mẫu,
  // thì không có đích: dây không bị hút, không có gợi ý, không có hiệu ứng khớp dây.
  function edgeTarget(k, targetQ) {
    var def = LV[S.li].def, r = def.ring, n = r.length;
    if (!GN.inFoldChain(def, k)) return null;
    var pa = pinOf(r[k], targetQ), pb = pinOf(r[(k + 1) % n], targetQ);
    if (pa < 0 || pb < 0 || pa === pb) return null;
    for (var g = 0; g < n; g++) {
      if (!GN.inFoldChain(def, g)) continue;
      var a = r[g], b = r[(g + 1) % n];
      if (a === pa && b === pb) return { g: g, h: def.solBend[g] || 0 };
      if (a === pb && b === pa) return { g: g, h: -(def.solBend[g] || 0) };
    }
    return null;
  }
  // Mảng độ uốn để vẽ cạnh k ở đúng đích (đường viền mẫu giữa hai chốt), không kèm gợn sóng lúc kéo.
  var tgtBendBuf = [];
  function bendsAt(k, h) {
    tgtBendBuf.length = 0;
    for (var i = 0; i < S.bend.length; i++) tgtBendBuf.push(S.bend[i] || 0);
    tgtBendBuf[k] = h;
    return tgtBendBuf;
  }
  // Các cạnh cần gợi ý uốn: có đích theo chốt và độ uốn còn lệch đích từ 1,2% trở lên. Mọi cạnh đều xét (cạnh nào cũng
  // uốn được); cạnh người chơi phải tự uốn (bendFree) hiện đậm, cạnh khác hơi nhạt hơn.
  function hintEdges() {
    var def = LV[S.li].def, out = [];
    for (var k = 0; k < def.ring.length; k++) {
      var tg = edgeTarget(k);
      if (!tg || Math.abs((S.bend[k] || 0) - tg.h) < 0.012) continue;
      out.push({ k: k, h: tg.h, emph: def.bendFree && def.bendFree.indexOf(k) >= 0 ? 1 : 0.75 });
    }
    return out;
  }
  window.GNHintEdges = function () { return hintEdges(); };
  // Tìm các cạnh kề với node vừa cắm mà cạnh đó vừa chính thức khép kín và khớp hoàn toàn vào viền mẫu
  function checkChainedEdgeSnaps(nodeIdx, targetPos) {
    var lv = LV[S.li] ? LV[S.li].def : null;
    if (!lv || !lv.ring || !lv.sol) return [];
    var tQ = { i: nodeIdx, pos: targetPos || S.pos[nodeIdx] };
    if (pinOf(nodeIdx, tQ) < 0) return [];
    var r = lv.ring, n = r.length, completed = [];
    for (var k = 0; k < n; k++) {
      if (r[k] !== nodeIdx && r[(k + 1) % n] !== nodeIdx) continue;
      var tg = edgeTarget(k, tQ);
      if (tg && Math.abs((S.bend[k] || 0) - tg.h) < 0.025) completed.push(k);
    }
    return completed;
  }

  function checkPins(level, pos) {
    if (!level || !level.sol) return { allFilled: true, pinFilled: [], filledCount: 0, totalPins: 0, nodeMatched: [] };
    var sol = level.sol, n = sol.length;
    var pinFilled = new Array(n).fill(false);
    var pinNode = new Array(n).fill(-1);
    var nodeMatched = new Array(pos.length).fill(-1);
    var pairs = [];
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < pos.length; i++) {
        var d = Math.hypot(pos[i][0] - sol[j][0], pos[i][1] - sol[j][1]);
        if (d <= PIN_ON_R) {
          pairs.push({ j: j, i: i, d: d });
        }
      }
    }
    pairs.sort(function (a, b) { return a.d - b.d; });
    for (var p = 0; p < pairs.length; p++) {
      var item = pairs[p];
      if (!pinFilled[item.j] && nodeMatched[item.i] < 0) {
        pinFilled[item.j] = true;
        pinNode[item.j] = item.i;
        nodeMatched[item.i] = item.j;
      }
    }
    var count = 0;
    for (var k = 0; k < n; k++) if (pinFilled[k]) count++;
    return {
      pinFilled: pinFilled,
      pinNode: pinNode,
      nodeMatched: nodeMatched,
      allFilled: count === n,
      filledCount: count,
      totalPins: n
    };
  }
  // Node nào vào chốt nào cũng được, nhưng độ uốn, phạt độ uốn, nam châm dây và snap đều so theo số thứ tự cạnh.
  // Khi mọi chốt đã lấp và cách đặt là một vòng xoay hay soi gương của vòng lời giải (ghim khóa đứng yên, node mép gấp
  // vẫn ở mép gấp), đánh số lại node và cạnh theo chốt để mọi phép so khớp đúng cạnh. Node trông giống nhau nên người chơi
  // không thấy gì. Dây chưa uốn thì nhận độ uốn ban đầu của cạnh mới; dây đã uốn giữ nguyên hình (đổi dấu nếu ngược chiều).
  // Trả về bảng chỉ số node cũ -> mới, hoặc null khi không đổi (đã đúng thứ tự, chưa lấp đủ, hoặc hình bắt chéo).
  function canonicalizePins() {
    var def = LV[S.li].def, r = def.ring, n = r.length, i, k;
    var st = checkPins(def, S.pos);
    if (!st.allFilled) return null;
    var perm = st.nodeMatched, same = true;
    for (i = 0; i < perm.length; i++) {
      if (perm[i] < 0) return null;
      if (perm[i] !== i) same = false;
      if ((locked(i) && perm[i] !== i) || onFold(i) !== onFold(perm[i])) return null;
    }
    if (same) return null;
    var inv = []; for (i = 0; i < perm.length; i++) inv[perm[i]] = i;
    var edgeOf = {}; for (k = 0; k < n; k++) edgeOf[r[k] + ',' + r[(k + 1) % n]] = k;
    var map = [];
    for (k = 0; k < n; k++) {
      var a = inv[r[k]], b = inv[r[(k + 1) % n]], g = edgeOf[a + ',' + b], s = 1;
      if (g === undefined) { g = edgeOf[b + ',' + a]; s = -1; }
      if (g === undefined || GN.inFoldChain(def, g) !== GN.inFoldChain(def, k)) return null;
      map.push({ g: g, s: s });
    }
    var dfl = def.startBend || def.solBend, nb = [];
    for (k = 0; k < n; k++) {
      var v = S.bend[map[k].g] || 0;
      nb.push(Math.abs(v - (dfl[map[k].g] || 0)) < 1e-6 ? (dfl[k] || 0) : map[k].s * v);
    }
    nb._waves = [];
    function permute(arr) { var out = arr.slice(); for (var j = 0; j < perm.length; j++) out[perm[j]] = arr[j]; return out; }
    S.pos = permute(S.pos); S.sc = permute(S.sc); S.pl = permute(S.pl); S.shake = permute(S.shake);
    S.bend = nb; S.edgeWake = r.map(function () { return -9; }); S.seamZips = []; S.edgeBounces = {}; S.hint = null;
    S.dirty = true;
    return perm;
  }
  // Kim chỉ đi theo chiều vuông góc với chính nó (kim dọc thì đi trái phải, kim ngang thì đi lên xuống).
  function needleMove(p) {
    var n = S.needle, fo = foldOf(), isY = foldY(), fc = isY ? (p[1] - FY) / FS : (p[0] - FX) / FS, rg = needleRange();
    var x = clamp(n.x0 + fc - n.sx, rg[0], rg[1]);
    if (Math.abs(fc - n.sx) > MOVE_EPS) n.moved = true;
    // hút nhẹ về đúng trục lời giải: càng gần càng hút, vừa lọt vào thì tick và rung ngắn
    var dm = Math.abs(x - fo.solX), inMag = NEEDLE_MAG_ON && dm < NEEDLE_MAG_R;
    if (inMag) x += (fo.solX - x) * NEEDLE_MAG_PULL * (1 - dm / NEEDLE_MAG_R);
    if (inMag && !n.inMag) { softTone(pentaF(2, -1), 0.06, 0.14); vib(6); }
    n.inMag = inMag;
    S.moveAcc += Math.abs(x - S.foldX) * FS;
    setNeedle(x);
    if (Math.abs(x - n.last) > 0.025) { n.last = x; softTone(pentaF(0, -1), 0.04, 0.10); vib(3); }
  }
  // Node trên mép gấp chỉ trượt dọc kim, nên chỉ hút về chỗ viền mẫu cắt ngang đường kim (giao điểm gần nhất).
  function foldCross(p) { return foldCrossAt(S.foldX, p); }
  function foldCrossAt(xf, p) {
    var best = null, bd = 9, isY = foldY();
    (LV[S.li].outline.loops || [LV[S.li].outline]).forEach(function (lp) {
      var n = lp.length / 2;
      for (var i = 0; i < n; i++) {
        var ax = lp[i * 2], ay = lp[i * 2 + 1], bx = lp[((i + 1) % n) * 2], by = lp[((i + 1) % n) * 2 + 1];
        if (isY) {
          if ((ay - xf) * (by - xf) > 0) continue;
          var x = Math.abs(by - ay) < 1e-9 ? ax : ax + (bx - ax) * (xf - ay) / (by - ay), ddx = Math.abs(x - p[0]);
          if (ddx < bd) { bd = ddx; best = [x, xf]; }
        } else {
          if ((ax - xf) * (bx - xf) > 0) continue;
          var y = Math.abs(bx - ax) < 1e-9 ? ay : ay + (by - ay) * (xf - ax) / (bx - ax), dd = Math.abs(y - p[1]);
          if (dd < bd) { bd = dd; best = [xf, y]; }
        }
      }
    });
    return best;
  }
  // Khoảng kim đi được: vải đang gấp nên kim không lùi qua nửa hình (dừng trước node xa nhất phía trước kim),
  // và không đẩy xa tới mức nửa gương lọt ra ngoài vải.
  var FABRIC_EDGE = 0.98;
  function needleRange() {
    var lo = NEEDLE_MIN, hi = NEEDLE_MAX, ax = foldY() ? 1 : 0;
    for (var i = 0; i < S.pos.length; i++) {
      if (onFold(i)) continue;
      lo = Math.max(lo, S.pos[i][ax] + 0.02);
      hi = Math.min(hi, (FABRIC_EDGE + S.pos[i][ax]) / 2);
    }
    return [lo, Math.max(lo, hi)];
  }
  function setNeedle(x) {
    S.foldX = x; var isY = foldY();
    for (var i = 0; i < S.pos.length; i++) {
      if (onFold(i)) S.pos[i] = isY ? [S.pos[i][0], x] : [x, S.pos[i][1]];
      else if (!locked(i) && (isY ? S.pos[i][1] : S.pos[i][0]) > x) S.pos[i] = isY ? [S.pos[i][0], x] : [x, S.pos[i][1]];
    }
    S.dirty = true;
  }
  function barValue(v) { return clamp((v - 0.5) / (S.thr - 0.5), 0, 1); }
  function recompute() {
    var lv = LV[S.li];
    if (lv.def.fold) unionRegion(lv.def, S.pos, S.foldX, S.mask, S.bend); else GN.region(lv.def, S.pos, S.mask, S.bend);
    S.iouV = Math.max(0, GN.iou(S.mask, lv.solMask) - GN.bendPenalty(lv.def, S.bend));
    GN.contour(S.mask, S.seg);
    S.dirty = false;
  }

  /* ---------- nhập liệu ---------- */
  function toLogical(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; }
  function inRect(p, x, y, w, h) { return p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h; }
  var activeId = null;

  cv.addEventListener('pointerdown', function (e) {
    ensureAudio();
    S.lastAction = now();
    if (activeId !== null) return; // chỉ một ngón
    var p = toLogical(e);
    if (S.menu) {
      layoutMenu();
      var hit = null;
      MENU.forEach(function (m) { if (!hit && inRect(p, m.r[0] - 2, m.r[1] - 2, m.r[2] + 4, m.r[3] + 4)) hit = m; });
      if (hit) { jumpTo(hit); S.menu = false; return; }
      // chạm vào khoảng trống trong bảng thì giữ bảng mở; chạm ra ngoài thì đóng
      if (!inRect(p, MENU_X, MENU_Y, MENU_W, MENU_H)) S.menu = false;
      return;
    }
    if (inRect(p, 14, 16, (S.chipW || 100) + 12, 44)) { S.menu = true; S.drag = null; pop(noteF(1), 0.04); return; }
    if (inRect(p, 326, 16, 44, 44)) { soundOn = !soundOn; S.toast = 1.2; if (soundOn) pop(noteF(4), 0.06); vib(8); return; }
    if (S.scene === 'play') playDown(p, e); else rewardDown(p, e);
  });
  cv.addEventListener('pointermove', function (e) { if (e.pointerId !== activeId) return; S.lastAction = now(); var p = toLogical(e); if (S.scene === 'play') playMove(p); else rewardMove(p); });
  function up(e, cancel) {
    if (e.pointerId !== activeId) return; activeId = null; S.lastAction = now();
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
  function finishSettle() {
    if (S.settle) { S.pos[S.settle.i] = S.settle.to.slice(); S.settle = null; S.dirty = true; }
    if (S.edgeSettle) { S.bend[S.edgeSettle.k] = S.edgeSettle.to; S.edgeSettle = null; S.dirty = true; }
    if (S.waveSettle) { if (S.bend && S.bend._waves) S.bend._waves[S.waveSettle.k] = null; S.waveSettle = null; S.dirty = true; }
    if (S.needleSettle) { setNeedle(S.needleSettle.to); S.needleSettle = null; }
  }
  var hitPolyBuf = [];
  function hitTestEdge(fx, fy) {
    var lv = LV[S.li].def, r = lv.ring, n = r.length, best = null, bd = 0.088;
    for (var k = 0; k < n; k++) {
      if (!GN.inFoldChain(lv, k)) continue;
      var poly = GN.edgePoly(lv, S.pos, r[k], r[(k + 1) % n], 20, hitPolyBuf, S.bend);
      var m = poly.length / 2 - 1;
      for (var s = 0; s < m; s++) {
        var ax = poly[s * 2], ay = poly[s * 2 + 1], bx = poly[(s + 1) * 2], by = poly[(s + 1) * 2 + 1];
        var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        var t = l2 > 0 ? clamp(((fx - ax) * dx + (fy - ay) * dy) / l2, 0, 1) : 0;
        var u = (s + t) / m;
        if (u < 0.25 || u > 0.75) continue;
        var d = Math.hypot(fx - (ax + dx * t), fy - (ay + dy * t));
        if (d < bd) { bd = d; best = { k: k, d: d, u: u, cx: ax + dx * t, cy: ay + dy * t }; }
      }
    }
    return best;
  }
  function startEdgeDrag(e, p, fx, fy, rk, u0, cx, cy) {
    var lv = LV[S.li].def, r = lv.ring, n = r.length, ra = r[rk], rb = r[(rk + 1) % n];
    var A = S.pos[ra], B = S.pos[rb], edx = B[0] - A[0], edy = B[1] - A[1], eL = Math.hypot(edx, edy) || 1;
    var nx = -edy / eL, ny = edx / eL;
    // Ghi nhận độ lệch pháp tuyến giữa điểm chạm ban đầu và thân dây để triệt tiêu dần khi người chơi kéo rõ nét
    var curveH0 = (cx !== undefined && cy !== undefined) ? ((cx - A[0]) * nx + (cy - A[1]) * ny) : 0;
    var pointerH0 = (fx - A[0]) * nx + (fy - A[1]) * ny;
    var grabBias = (cx !== undefined && cy !== undefined) ? (pointerH0 - curveH0) : 0;
    if (S.phase === 'intro') setPhase('play');
    activeId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    var uInit = clamp(u0 !== undefined ? u0 : (((fx - A[0]) * edx + (fy - A[1]) * edy) / (eL * eL)), 0.25, 0.75);
    var pw = screenToWorld(p);
    var isTouch = (e && (e.pointerType === 'touch' || e.pointerType === 'pen')) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || !!window.__FORCE_TOUCH_OFFSET;
    S.edgeDrag = {
      k: rk, a: ra, b: rb, sx: fx, sy: fy,
      ax: A[0], ay: A[1], tx: edx / eL, ty: edy / eL, eL: eL,
      nx: nx, ny: ny,
      h0: S.bend[rk] || 0, grabBias: grabBias, tgt: edgeTarget(rk),
      u: uInit, uSmooth: uInit, lastSoundU: uInit, rip: 0,
      fx: pw[0], fy: pw[1], startX: p[0], startY: p[1], lastP: [p[0], p[1]], moved: false, inMag: false, inSnap0: false, magH: null,
      isTouch: isTouch
    };
    S.bend._waves = S.bend._waves || [];
    S.bend._waves[rk] = { u: uInit, skew: (uInit - 0.5), rip: 0 };
    S.dirty = true;
    S.firstTouch = true; S.hint = null;
    S.ready = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; humStart();
    pop(noteF(1) * 0.5, 0.08, 0, 0.14); vib(6);
  }
  function playDown(p, e) {
    var boosterX = 20;
    if (S.phase === 'play' && inRect(p, boosterX, 724, 106, 92)) { useHint(); return; }
    if (S.phase !== 'play' && S.phase !== 'intro') { if (['snap', 'cut', 'unfold', 'lift', 'fill', 'fly'].indexOf(S.phase) >= 0) S.speedTarget = FAST; return; }
    if (S.phase === 'intro' && S.t < 0.5) return;
    finishSettle();
    var pw = screenToWorld(p);
    var fx = (pw[0] - FX) / FS, fy = (pw[1] - FY) / FS, best = -1, bd = 9, isY = foldY();
    var nrg = foldOf() ? needleRange() : null;
    var hitBar = nrg && (isY
      ? (Math.abs(p[0] - SLIDER_X) < SLIDER_HIT && p[1] > Y(nrg[0]) - 26 && p[1] < Y(nrg[1]) + 26)
      : (Math.abs(p[1] - SLIDER_Y) < SLIDER_HIT && p[0] > X(nrg[0]) - 26 && p[0] < X(nrg[1]) + 26));
    if (hitBar) {
      if (S.phase === 'intro') setPhase('play');
      activeId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      S.needle = { sx: isY ? fy : fx, x0: S.foldX, last: S.foldX, moved: false, bar: true }; S.firstTouch = true; S.hint = null;
      S.ready = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; humStart();
      pop(noteF(2) * 0.5, 0.08, 0, 0.14); vib(6);
      return;
    }
    for (var i = 0; i < S.pos.length; i++) {
      var d = Math.hypot(fx - S.pos[i][0], fy - S.pos[i][1]);
      if (d < pickRadius(i) && d < bd) { bd = d; best = i; }
    }
    var bestEdge = hitTestEdge(fx, fy);
    // [ĐÃ DUYỆT CHÍNH THỨC / APPROVED] BỘ LỌC CẢM ỨNG 3 LỚP (SMART 3-LAYER TAP ARBITRATION):
    // Lớp 1 (Mid-Span): hitTestEdge đã lọc chặt chẽ chỉ nhận điểm u trong [0.25, 0.75] (loại bỏ 25% vùng đầu mút sát chốt).
    // Lớp 2 (Node-First Priority):
    // - Khi chạm trong bán kính ưu tiên của Node MỞ (bd < NODE_PRIOR_R = 0.068 ~ 25px): Node thắng 100%, dây tuyệt đối không cướp cảm ứng.
    // - Chỉ khi chạm ở đoạn giữa dây (u in [0.25, 0.75]) và điểm chạm nằm gần dây hơn tâm chốt (bestEdge.d < bd): Mới nhận diện kéo uốn dây.
    // - Locked Node Pass-Through: Nếu chạm gần chốt KHÓA mà trúng đoạn giữa dây thì bắt vào dây để uốn cong.
    var NODE_PRIOR_R = 0.068; // ~25px trên màn hình
    var preferEdge = bestEdge && (best < 0 || locked(best) || (bd >= NODE_PRIOR_R && bestEdge.d < bd));
    if (preferEdge) {
      if (best < 0) {
        // Lớp 3 (Endpoint Protective Bubble): Khi không chạm trúng node nào, kiểm tra khoảng cách an toàn tới 2 đầu chốt
        var lvDef = LV[S.li].def, rRing = lvDef.ring, nRing = rRing.length;
        var ra = rRing[bestEdge.k], rb = rRing[(bestEdge.k + 1) % nRing];
        var distToA = Math.hypot(fx - S.pos[ra][0], fy - S.pos[ra][1]);
        var distToB = Math.hypot(fx - S.pos[rb][0], fy - S.pos[rb][1]);
        var safeR = 0.085;
        if ((!locked(ra) && distToA < safeR) || (!locked(rb) && distToB < safeR)) {
          // Nằm trong bong bóng an toàn của chốt mở -> không uốn dây, tránh cướp cảm ứng khi người chơi bấm lệch ngoài rìa chốt
        } else {
          startEdgeDrag(e, p, fx, fy, bestEdge.k, bestEdge.u, bestEdge.cx, bestEdge.cy);
          return;
        }
      } else {
        startEdgeDrag(e, p, fx, fy, bestEdge.k, bestEdge.u, bestEdge.cx, bestEdge.cy);
        return;
      }
    }
    if (best < 0) {
      var hitFoldLine = foldOf() && (isY ? (Math.abs(fy - S.foldX) < NEEDLE_HIT && fx > 0 && fx < 1) : (Math.abs(fx - S.foldX) < NEEDLE_HIT && fy > 0 && fy < 1));
      if (hitFoldLine) {
        if (S.phase === 'intro') setPhase('play');
        activeId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
        S.needle = { sx: isY ? fy : fx, x0: S.foldX, last: S.foldX, moved: false }; S.firstTouch = true; S.hint = null;
        S.ready = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; humStart();
        pop(noteF(2) * 0.5, 0.08, 0, 0.14); vib(6);
      }
      return;
    }
    if (S.phase === 'intro') setPhase('play');
    if (locked(best)) { S.shake[best] = now(); vib(18); pop(220, 0.05, 0, 0.12); return; }
    activeId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    var nodeW = [FX + S.pos[best][0] * FS, FY + S.pos[best][1] * FS];
    var nodeS = worldToScreen(nodeW);
    var grabOff = [nodeS[0] - p[0], nodeS[1] - p[1]];
    var isTouch = (e && (e.pointerType === 'touch' || e.pointerType === 'pen')) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || !!window.__FORCE_TOUCH_OFFSET;
    S.drag = {
      i: best, sx: fx, sy: fy, p0: S.pos[best].slice(),
      fx: pw[0], fy: pw[1], startX: p[0], startY: p[1],
      grabOff: grabOff, isTouch: isTouch, lastP: [p[0], p[1]], moved: false
    };
    S.firstTouch = true; S.hint = null;
    S.ready = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; humStart();
    pop(noteF(1) * 0.5, 0.08, 0, 0.14); vib(6);
  }
  function applyNodeDrag(d) {
    if (!d || !d.lastP) return;
    var p = d.lastP;
    var dragDist = Math.hypot(p[0] - d.startX, p[1] - d.startY);
    if (dragDist > 8) d.moved = true;
    var ramp = clamp(dragDist / 14, 0, 1);
    var yLift = (d.isTouch ? 22 : 0) * ramp;
    var sNode = [p[0] + d.grabOff[0], p[1] + d.grabOff[1] - yLift];
    var wNode = screenToWorld(sNode);
    var raw = [clamp((wNode[0] - FX) / FS, 0.04, 0.96), clamp((wNode[1] - FY) / FS, 0.04, 0.96)];
    var fo = foldOf(), isY = foldY();
    if (fo) {
      if (isY) raw[1] = onFold(d.i) ? S.foldX : clamp(raw[1], 2 * S.foldX - FABRIC_EDGE, S.foldX);
      else raw[0] = onFold(d.i) ? S.foldX : clamp(raw[0], 2 * S.foldX - FABRIC_EDGE, S.foldX);
    }
    var lv = LV[S.li], sol = lv.def.sol, n = sol.length;
    var occ = new Array(n).fill(false);
    for (var k = 0; k < S.pos.length; k++) {
      if (k === d.i) continue;
      for (var pj = 0; pj < n; pj++) {
        if (Math.hypot(S.pos[k][0] - sol[pj][0], S.pos[k][1] - sol[pj][1]) <= PIN_ON_R) occ[pj] = true;
      }
    }
    var bestD = 9, bestPin = null, bestJ = -1;
    for (var j = 0; j < n; j++) {
      if (occ[j]) continue;
      if (fo && onFold(d.i) && !onFold(j)) continue;
      if (fo && !onFold(d.i) && (isY ? sol[j][1] : sol[j][0]) > S.foldX + 1e-6) continue;
      var dist = Math.hypot(raw[0] - sol[j][0], raw[1] - sol[j][1]);
      if (dist < bestD) { bestD = dist; bestPin = sol[j]; bestJ = j; }
    }
    var inMag = bestD < PIN_MAG_R;
    var q = inMag ? bestPin : null;
    if (inMag) {
      var w = MAG_PULL * (1 - bestD / PIN_MAG_R);
      raw = [raw[0] + (q[0] - raw[0]) * w, raw[1] + (q[1] - raw[1]) * w];
    }
    if (inMag && !d.inMag) { pinHoverSound(bestJ); vib(5); }
    var gx = clamp(Math.floor((raw[0] - GN.LO) / (GN.HI - GN.LO) * GN.N), 0, GN.N - 1);
    var gy = clamp(Math.floor((raw[1] - GN.LO) / (GN.HI - GN.LO) * GN.N), 0, GN.N - 1);
    var inPrev = LV[S.li].solMask[gy * GN.N + gx] === 1;
    if (d.inPrev !== undefined && inPrev !== d.inPrev && !inMag) { softTone(pentaF(inPrev ? 1 : 0, -1), 0.045, 0.12); }
    d.inPrev = inPrev;
    d.inMag = inMag; d.magQ = inMag ? q : null;
    S.pos[d.i] = raw;
    var pw = screenToWorld(p);
    d.fx = pw[0]; d.fy = pw[1];
    S.dirty = true;
  }

  function applyEdgeDrag(ed) {
    if (!ed || !ed.lastP) return;
    var p = ed.lastP;
    var dragDist = Math.hypot(p[0] - ed.startX, p[1] - ed.startY);
    if (dragDist > 8) ed.moved = true;
    var pw = screenToWorld(p);
    var fx0 = (pw[0] - FX) / FS, fy0 = (pw[1] - FY) / FS;
    ed.fx = pw[0]; ed.fy = pw[1];
    var uRaw = ((fx0 - ed.ax) * ed.tx + (fy0 - ed.ay) * ed.ty) / ed.eL;
    var uCur = clamp(uRaw, 0.14, 0.86);
    var du = uCur - ed.u;
    ed.u = uCur;
    ed.uSmooth += (uCur - ed.uSmooth) * 0.55;
    var deltaH = (fx0 - ed.sx) * ed.nx + (fy0 - ed.sy) * ed.ny;
    // Khi kéo dây chưa uốn (|h0| < 0.02) rõ tay (> 8px), triệt tiêu dần lệch điểm chạm ban đầu để đỉnh cung chạm đúng đầu ngón tay
    var compT = Math.abs(ed.h0) < 0.02 ? clamp((dragDist - 8) / 24, 0, 1) : 0;
    var kComp = compT * compT * (3 - 2 * compT);
    var effDeltaH = deltaH + (ed.grabBias || 0) * kComp;
    var uGain = 1 / clamp(4 * uCur * (1 - uCur) * (1 + 4.8 * (uCur - 0.5) * (uCur - 0.5)), 0.72, 1.08);
    // Nới biên độ uốn lên [-0.35, 0.35] để các cung võng sâu (vd Cụm cỏ -0.210) kéo xuống hết tới viền mẫu
    var rawH = clamp(ed.h0 + effDeltaH * uGain, -0.35, 0.35);
    var lv = LV[S.li].def;
    // chỉ hút khi hai đầu dây đã ở hai chốt liền nhau trên viền mẫu; đích là độ uốn của cạnh lời giải giữa hai chốt đó
    var solH = ed.tgt ? ed.tgt.h : 0;
    var inMag = false, inSnap0 = false, magH = null, w0 = 0;
    var dm = ed.tgt ? Math.abs(rawH - solH) : 9;
    if (ed.tgt) ed.maxErr = Math.max(ed.maxErr || 0, dm); // để biết dây có thật sự bị kéo lệch rồi nắn lại không
    if (dm < MAG_R) {
      inMag = true;
      w0 = MAG_PULL * (1 - dm / MAG_R);
      rawH = rawH + (solH - rawH) * w0;
      magH = solH;
    }
    if (!inMag && Math.abs(rawH) < 0.018) {
      inSnap0 = true;
      rawH = 0;
    } else if (inMag && Math.abs(solH) < 1e-4 && Math.abs(rawH) < 0.022) {
      inSnap0 = true;
      rawH = 0;
      magH = 0;
    }
    var dirSign = (rawH >= 0 ? 1 : -1);
    var waveScale = Math.max(0.024, Math.min(0.065, Math.abs(rawH) * 0.6 + 0.020));
    ed.rip = clamp(ed.rip + du * 1.6 * waveScale * dirSign, -0.045, 0.045);
    if (Math.abs(uCur - ed.lastSoundU) > 0.095) {
      ed.lastSoundU = uCur;
      softTone(pentaF(Math.min(4, Math.floor(uCur * 5)), -1), 0.028, 0.08); vib(2);
    }
    if (inMag && !ed.inMag) { vib(3); }
    if (inSnap0 && !ed.inSnap0) { vib(2); }
    ed.inMag = inMag; ed.inSnap0 = inSnap0; ed.magH = magH;
    S.bend[ed.k] = rawH;
    var skewFactor = inMag ? (1 - w0 * 0.7) : 1;
    S.bend._waves = S.bend._waves || [];
    S.bend._waves[ed.k] = {
      u: ed.uSmooth,
      skew: (ed.uSmooth - 0.5) * skewFactor,
      rip: ed.rip * (inMag ? 0.5 : 1)
    };
    S.dirty = true;
  }

  function playMove(p) {
    if (S.needle) { needleMove(p); return; }
    if (S.edgeDrag) {
      var ed = S.edgeDrag;
      ed.lastP = [p[0], p[1]];
      var dragDist = Math.hypot(p[0] - ed.startX, p[1] - ed.startY);
      if (dragDist > 8) {
        ed.moved = true;
        // đã bỏ phóng 1,04 lần khi kéo (2026-11-09): người chơi thử thấy chóng mặt
        S.cam.targetX = 0;
        S.cam.targetY = 0;
      }
      S.moveAcc += Math.hypot(p[0] - ed.fx, p[1] - ed.fy);
      applyEdgeDrag(ed);
      return;
    }
    var d = S.drag; if (!d) return;
    d.lastP = [p[0], p[1]];
    var dragDist = Math.hypot(p[0] - d.startX, p[1] - d.startY);
    if (dragDist > 8) {
      d.moved = true;
      // đã bỏ phóng 1,04 lần khi kéo (2026-11-09): người chơi thử thấy chóng mặt
      S.cam.targetX = 0;
      S.cam.targetY = 0;
    }
    S.moveAcc += Math.hypot(p[0] - d.fx, p[1] - d.fy);
    applyNodeDrag(d);
  }
  function playUp(cancel) {
    humStop();
    if (S.cam) { S.cam.targetScale = 1.0; S.cam.targetX = 0; S.cam.targetY = 0; }
    if (S.needle) {
      var nd = S.needle; S.needle = null; pop(noteF(1) * 0.5, 0.085, 0, 0.15); vib(6);
      if (cancel || !nd.moved) return;
      if (nd.inMag) {
        var x0 = S.foldX; setNeedle(foldOf().solX); canonicalizePins(); recompute();
        var winN = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; setNeedle(x0);
        if (winN) { startWin(); return; }
        S.needleSettle = { from: x0, to: foldOf().solX, t: 0 };
        return;
      }
      canonicalizePins(); recompute(); if (S.iouV >= S.thr && checkPins(LV[S.li].def, S.pos).allFilled) startWin();
      return;
    }
    if (S.edgeDrag) {
      var ed = S.edgeDrag; S.edgeDrag = null;
      var lastWave = S.bend && S.bend._waves ? S.bend._waves[ed.k] : null;
      if (S.bend && S.bend._waves) S.bend._waves[ed.k] = null;
      if (cancel || !ed.moved) {
        pop(noteF(0) * 0.5, 0.06, 0, 0.12); vib(4);
        S.dirty = true; return;
      }
      var lv = LV[S.li].def;
      // khớp viền thật: dây có đích theo chốt và thả đúng vào vùng hút của đích, kể cả khi đích là đoạn thẳng
      // (cạnh nào cũng uốn được nên nắn dây thẳng về viền cũng là một lần khớp). Chỉ tính khi dây thật sự được sửa:
      // lúc bắt đầu kéo đã lệch đích từ 1,2%, hoặc trong lúc kéo bị kéo ra khỏi vùng hút; chạm nhẹ dây đang đúng thì không.
      var tg = ed.tgt;
      var wasOff = !!tg && (Math.abs(ed.h0 - tg.h) >= 0.012 || (ed.maxErr || 0) >= MAG_R);
      var isTrueContourSnap = !!tg && wasOff && ed.magH !== null && Math.abs(ed.magH - tg.h) < 1e-4;

      if (isTrueContourSnap) {
        var curH = S.bend[ed.k]; S.bend[ed.k] = ed.magH; recompute();
        var winE = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; S.bend[ed.k] = curH; S.dirty = true;
        // KHOẢNH KHẮC THẢ TAY SNAP VÀO VIỀN MẪU THẬT SỰ (Hai đầu chốt đã cắm, đúng cạnh uốn, đúng viền)
        triggerCurveSnap(ed.k, 0.5, (ed.magH >= 0 ? 1 : -1));
        if (winE) { startWin(); return; }
        S.edgeSettle = { k: ed.k, from: curH, to: ed.magH, t: 0 };
        if (lastWave && (Math.abs(lastWave.skew) > 1e-3 || Math.abs(lastWave.rip) > 1e-4)) {
          S.waveSettle = { k: ed.k, skew0: lastWave.skew, rip0: lastWave.rip, t: 0 };
        }
        return;
      }
      if (ed.magH !== null && ed.magH !== undefined) {
        // Thả tay khi lơ lửng hoặc cạnh thẳng về 0: vẫn trượt mượt về magH nhưng KHÔNG phát hiệu ứng snap viền
        var curH2 = S.bend[ed.k]; S.bend[ed.k] = ed.magH; recompute();
        var winE2 = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; S.bend[ed.k] = curH2; S.dirty = true;
        if (winE2) { startWin(); return; }
        S.edgeSettle = { k: ed.k, from: curH2, to: ed.magH, t: 0 };
        pop(noteF(0) * 0.5, 0.06, 0, 0.12); vib(4);
        if (lastWave && (Math.abs(lastWave.skew) > 1e-3 || Math.abs(lastWave.rip) > 1e-4)) {
          S.waveSettle = { k: ed.k, skew0: lastWave.skew, rip0: lastWave.rip, t: 0 };
        }
        return;
      }
      // Thả tay ở khoảng trống ngoài viền mẫu (không snap)
      pop(noteF(0) * 0.5, 0.06, 0, 0.12); vib(4);
      recompute();
      if (S.iouV >= S.thr && checkPins(LV[S.li].def, S.pos).allFilled) { startWin(); return; }
      if (lastWave && (Math.abs(lastWave.skew) > 1e-3 || Math.abs(lastWave.rip) > 1e-4)) {
        S.waveSettle = { k: ed.k, skew0: lastWave.skew, rip0: lastWave.rip, t: 0 };
        S.dirty = true;
      }
      return;
    }
    var d = S.drag; if (!d) return; S.drag = null;
    S.lastPinReleaseT = now();
    if (cancel || !d.moved) {
      pop(noteF(0) * 0.5, 0.07, 0, 0.12); vib(4);
      return;
    }
    if (d.magQ) {
      // Đặt vào chốt thành công: âm thanh chốt gỗ / cúc áo ấm rõ nét với cao độ ngũ cung tiến trình
      var pinSt = checkPins(LV[S.li].def, S.pos);
      var step = Math.min(5, Math.max(0, pinSt.filledCount));
      pinSnapSound(step, pinSt.allFilled || (pinSt.filledCount >= pinSt.totalPins));
      vib([8, 14, 10]);

      // chấm thắng theo vị trí đã đặt hẳn lên viền, nhưng hình vẽ trượt dần tới đó
      var rawP = S.pos[d.i].slice(); S.pos[d.i] = d.magQ.slice();
      // chốt cuối vừa lấp theo thứ tự khác lời giải: đánh số lại trước khi chấm
      var perm = canonicalizePins(), di = perm ? perm[d.i] : d.i;
      recompute();
      var win = (S.iouV >= S.thr) && checkPins(LV[S.li].def, S.pos).allFilled; S.pos[di] = rawP; S.dirty = true;
      if (win) { startWin(); return; }
      S.settle = { i: di, from: rawP, to: d.magQ.slice(), t: 0 };
      S.ripples.push({ x: X(d.magQ[0]), y: Y(d.magQ[1]), t0: now(), c: C.mustard, world: true });

      // NHỊP BỒI TRỖI DÂY (Chained Edge Snap): Nếu cạnh nối với chốt này vừa được hoàn tất khớp viền
      var chainedEdges = checkChainedEdgeSnaps(di, d.magQ);
      if (chainedEdges.length > 0) {
        var tSnap = now() + 0.05;
        chainedEdges.forEach(function (ek) {
          triggerSeamZip(ek, 0.5, tSnap);
          triggerEdgeBounce(ek, 1, tSnap);
          var lvDef = LV[S.li] ? LV[S.li].def : null;
          if (lvDef && lvDef.ring) {
            var ra = lvDef.ring[ek], rb = lvDef.ring[(ek + 1) % lvDef.ring.length];
            var pA = S.pos[ra], pB = S.pos[rb];
            var mx = (pA[0] + pB[0]) * 0.5, my = (pA[1] + pB[1]) * 0.5;
            lint(X(mx), Y(my), -Math.PI / 2, 4);
          }
        });
        // Âm bồi rút chỉ may giòn tan thanh thoát kèm nốt Kalimba ngân vang trễ 50ms
        sweep(0.12, 0.08, 1300, 3200, 0.05);
        pluck(pentaF(step + 1, 0), 0.10, 0.055);
        vib([6, 12, 8]);
      }
      return;
    }
    // Thả tự do vào khoảng trống (không dính chốt): tiếng rơi êm nhẹ trên vải
    pop(noteF(0) * 0.5, 0.07, 0, 0.12); vib(5);
    recompute();
    if (S.iouV >= S.thr && checkPins(LV[S.li].def, S.pos).allFilled) startWin();
  }
  function useHint() {
    if (S.hints <= 0) { vib(20); pop(200, 0.05, 0, 0.1); return; }
    var lv = LV[S.li].def, bi = -1, bd = -1, bk = -1, be = -1;
    for (var i = 0; i < S.pos.length; i++) {
      if (locked(i)) continue;
      var d = Math.hypot(S.pos[i][0] - lv.sol[i][0], S.pos[i][1] - lv.sol[i][1]);
      if (d > bd) { bd = d; bi = i; }
    }
    var bh = 0;
    for (var k = 0; k < lv.ring.length; k++) {
      var tg = edgeTarget(k); if (!tg) continue; // chỉ gợi ý dây khi biết đích theo chốt
      var ediff = Math.abs((S.bend[k] || 0) - tg.h) * 2.2;
      if (ediff > be) { be = ediff; bk = k; bh = tg.h; }
    }
    S.hints--;
    if (be > bd && be > 0.015) S.hint = { edge: bk, th: bh, t0: now() };
    else S.hint = { i: bi, t0: now() };
    chord([2, 4], 0.05, 0.06); vib(10);
  }

  /* ---------- luật: thả tay đạt ngưỡng thì snap và chạy chuỗi thắng ngay ---------- */
  function startWin() {
    finishSettle();
    S.drag = null; S.edgeDrag = null;
    if (S.cam) { S.cam.targetScale = 1.0; S.cam.targetX = 0; S.cam.targetY = 0; }
    S.snapFrom = S.pos.map(function (p) { return p.slice(); });
    S.bendFrom = S.bend.slice();
    // mỗi node hút vào điểm gần nhất trên viền mẫu, giữ đúng bố cục người chơi đã xếp; node khóa đứng yên
    var pts = LV[S.li].outline;
    var fw = foldOf(), isY = foldY(); S.foldFrom = S.foldX;
    var pinSt = checkPins(LV[S.li].def, S.pos);
    S.snapTo = S.pos.map(function (p, i) {
      if (fw && onFold(i)) return locked(i) ? (isY ? [p[0], fw.solX] : [fw.solX, p[1]]) : (foldCrossAt(fw.solX, p) || (isY ? [p[0], fw.solX] : [fw.solX, p[1]]));
      if (locked(i)) return p.slice();
      if (pinSt.nodeMatched && pinSt.nodeMatched[i] >= 0) return LV[S.li].def.sol[pinSt.nodeMatched[i]].slice();
      var q = nearestOnLoop(pts, p); if (fw) { if (isY) q[1] = Math.min(q[1], fw.solX); else q[0] = Math.min(q[0], fw.solX); } return q;
    });
    // tốc độ chung: đủ để node xa nhất tới nơi trong SNAP_MAX, không chậm hơn SNAP_SPEED
    var md = 0; for (var k = 0; k < S.pos.length; k++) md = Math.max(md, Math.hypot(S.snapTo[k][0] - S.snapFrom[k][0], S.snapTo[k][1] - S.snapFrom[k][1]));
    for (var ek = 0; ek < S.bend.length; ek++) md = Math.max(md, Math.abs((LV[S.li].def.solBend[ek] || 0) - (S.bendFrom[ek] || 0)) * 2);
    if (fw) md = Math.max(md, Math.abs(fw.solX - S.foldX));
    S.snapV = Math.max(SNAP_SPEED, md / SNAP_MAX);
    // Nhịp chớp sáng chiến thắng khi thả tay rồi vụt tắt êm ái trước khi kéo cắt (480ms)
    S.winFlashT = now();
    S.snapT = Math.max(0.48, clamp(md / S.snapV, SNAP_MIN, SNAP_MAX));
    setPhase('snap'); chord([4, 7, 9], 0.06, 0.06); vib(30);
  }
  function nearestOnLoop(pts, p) {
    if (pts.loops) { var bb = null, bdd = 9; pts.loops.forEach(function (lp) { var q = nearestOnLoop(lp, p), dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bdd) { bdd = dd; bb = q; } }); return bb; }
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
  // Khoảng cách dọc đường cắt tới chỗ gần nhất của từng node đã snap, kèm thứ hạng theo thứ tự kéo đi qua.
  function cutNodeDists(lv) {
    var pts = lv.solPath.pts, cum = lv.solPath.cum, m = cum.length, out = [];
    for (var i = 0; i < S.pos.length; i++) {
      var px = S.pos[i][0], py = S.pos[i][1], best = 1e9, bd = 0;
      for (var k = 0; k < m; k++) {
        var k2 = (k + 1) % m, ax = pts[k * 2], ay = pts[k * 2 + 1], bx = pts[k2 * 2], by = pts[k2 * 2 + 1];
        var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
        var qx = ax + dx * u - px, qy = ay + dy * u - py, dd = qx * qx + qy * qy;
        if (dd < best) { best = dd; bd = cum[k] + u * Math.sqrt(l2); }
      }
      // điểm đầu đường cắt cũng là điểm cuối: node nằm ở đó tính là chạm đầu tiên
      if (!lv.def.fold && bd > lv.solPath.total - 1e-4) bd = 0;
      out.push({ i: i, d: bd });
    }
    out.slice().sort(function (a, b) { return a.d - b.d; }).forEach(function (o, r) { o.rank = r; });
    out.forEach(function (o) { if (o.rank === undefined) o.rank = 0; });
    return out;
  }
  function cutMult(lv) { return clamp(cutLen(lv) / (RUN_SPEED * CUT_TARGET), CUT_MULT_MIN, CUT_MULT_MAX); }
  function cutDur(lv) { return cutLen(lv) / (RUN_SPEED * cutMult(lv)); }
  var swayPolyBuf = [];
  function distToLoop(pts, px, py) {
    var n = pts.length / 2, bd2 = 1e9;
    for (var i = 0; i < n; i++) {
      var ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1];
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
      var ex = ax + dx * t - px, ey = ay + dy * t - py, d2 = ex * ex + ey * ey;
      if (d2 < bd2) bd2 = d2;
    }
    return Math.sqrt(bd2);
  }
  function distToOutline(outline, px, py) {
    if (outline.loops) {
      var b = 1e9;
      for (var i = 0; i < outline.loops.length; i++) {
        var d = distToLoop(outline.loops[i], px, py);
        if (d < b) b = d;
      }
      return b;
    }
    return distToLoop(outline, px, py);
  }
  // Đường sợi chỉ đung đưa thống nhất (Hướng B + Quán tính theo cây kéo + Uốn cong trực tiếp S.bend):
  function swayedRingPath(level, pos) {
    var pts = [], cum = [], nodeD = [], crease = [], acc = 0, r = level.ring;
    var outline = LV[S.li] ? LV[S.li].outline : null;
    var pAge = now() - S.pluckT;
    var pluckK = (pAge >= 0 && pAge < 0.45) ? Math.sin(pAge * 55) * Math.exp(-pAge * 7) * 3.2 : 0;
    var slack = S.slack;
    var activeSway = (S.phase === 'intro' || S.phase === 'play' || S.phase === 'verify');
    var clk = now();
    var idleTime = clk - (S.lastAction || 0);
    var pinSt = (level.sol && S.phase === 'play' && S.iouV < S.thr) ? checkPins(level, pos) : null;
    var allFilledIdle = pinSt && pinSt.allFilled && !S.drag && !S.edgeDrag && (idleTime > 1.8);
    var idleAge = allFilledIdle ? (idleTime - 1.8) : 0;
    for (var k = 0; k < r.length; k++) {
      nodeD.push(acc);
      var a = r[k], b = r[(k + 1) % r.length];
      var p = GN.edgePoly(level, pos, a, b, 20, swayPolyBuf, S.bend), m = p.length / 2;
      var ux = p[m * 2 - 2] - p[0], uy = p[m * 2 - 1] - p[1], ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
      var isCrease = !!(level.fold && onFold(a) && onFold(b));
      var edgeMaxErr = 0;
      if (outline && !isCrease && slack > 1e-3) {
        for (var s0 = 0; s0 < m; s0++) {
          var d0 = distToOutline(outline, p[s0 * 2], p[s0 * 2 + 1]);
          if (d0 > edgeMaxErr) edgeMaxErr = d0;
        }
      }
      var fitFactor = 1;
      if (outline && !isCrease && slack > 1e-3) {
        var uFit = clamp((edgeMaxErr - 0.010) / (0.026 - 0.010), 0, 1);
        fitFactor = uFit * uFit * (3 - 2 * uFit);
      }
      var isPinchingK = (S.edgeDrag && S.edgeDrag.k === k) || (S.waveSettle && S.waveSettle.k === k);
      // dây nhắc nhẹ về phía đích khi người chơi đứng yên: mọi cạnh có đích theo chốt mà còn lệch, không chỉ bendFree
      var bTg = allFilledIdle && LV[S.li] && LV[S.li].def === level ? edgeTarget(k) : null;
      var beckonWave = 0;
      if (bTg) {
        var bsolH = bTg.h;
        var bcurH = (S.bend && S.bend[k] !== undefined) ? S.bend[k] : 0;
        if (Math.abs(bcurH - bsolH) > 0.012) {
          var dirSign = (bsolH - bcurH >= 0 ? 1 : -1);
          var pulse = 0.5 + 0.5 * Math.sin(idleAge * 3.2 + k * 0.7);
          beckonWave = (pulse * 1.5 * dirSign) / FS;
        }
      }
      var localSlack = isPinchingK ? 0 : slack * fitFactor;
      var isRunEdge = activeSway && (S.runK === k);
      var rt = isRunEdge ? S.runT : 0;
      var wakeAge = (activeSway && S.edgeWake && S.edgeWake[k] !== undefined) ? (now() - S.edgeWake[k]) : 99;
      var ring = 0;
      if (isRunEdge) {
        var uRamp = rt * rt * (3 - 2 * rt);
        ring = uRamp * Math.sin(rt * Math.PI * 0.5);
      } else if (wakeAge >= 0 && wakeAge < 1.35) {
        var decay = Math.exp(-wakeAge * 2.8) * (1 - wakeAge / 1.35);
        ring = decay * Math.cos(wakeAge * 9.5);
      }
      var sideSign = (k % 2 ? -1 : 1);
      for (var q = 0; q < p.length; q += 2) {
        if (q === 0 && pts.length) continue;
        var idx = q / 2, u = idx / (m - 1), env = isCrease ? 0 : Math.sin(Math.PI * u);
        var bladePush = 0;
        if (isRunEdge) {
          var du = u - rt;
          bladePush = Math.exp(-du * du * 18) * Math.sin(Math.PI * rt);
        }
        var sag = (env * localSlack * (0.35 + 0.45 * bladePush + 0.28 * Math.abs(ring))) / FS;
        var wv = (env * (localSlack * (0.85 * bladePush + 0.75 * ring * Math.sin(u * Math.PI * 2 + 0.8)) * sideSign + pluckK * sideSign)) / FS;
        var sb = S.edgeBounces && S.edgeBounces[k];
        var snapBounceWave = 0;
        if (sb) {
          var bAge = clk - sb.t0;
          if (bAge >= 0 && bAge < sb.dur) {
            var bDamp = Math.exp(-bAge * 15) * (1 - bAge / sb.dur);
            var bOsc = Math.sin(bAge * 52);
            snapBounceWave = (env * sb.amp * sb.dir * bDamp * bOsc) / FS;
          }
        }
        var totalWv = wv + env * beckonWave + snapBounceWave;
        var x = p[q] + nx * totalWv, y = p[q + 1] + sag + ny * totalWv;
        if (pts.length) {
          acc += Math.hypot(x - pts[pts.length - 2], y - pts[pts.length - 1]);
          crease.push(isCrease);
        }
        pts.push(x, y); cum.push(acc);
      }
    }
    return { pts: pts, cum: cum, nodeD: nodeD, total: acc, crease: crease };
  }
  function runnerStep(dt) {
    var lv = LV[S.li].def, n = lv.ring.length, ver = false;
    if (!S.path) S.path = swayedRingPath(lv, S.pos);
    var rem = RUN_SPEED * dt, guard = 0;
    while (rem > 0 && guard++ < 10) {
      var len = Math.max(edgeLen(S.path, S.runK, n), 1e-4), left = (1 - S.runT) * len;
      if (rem < left) { S.runT += rem / len; rem = 0; }
      else {
        rem -= left;
        if (S.edgeWake) S.edgeWake[S.runK] = now();
        S.runK = (S.runK + 1) % n; S.runT = 0;
        var node = lv.ring[S.runK];
        S.pl[node] = 1; S.ripples.push({ x: X(S.pos[node][0]), y: Y(S.pos[node][1]), t0: now(), c: C.cream, world: true });
        var vol = (0.045 + 0.045 * S.dv) * ((S.drag || S.edgeDrag) ? 0.6 : 1);
        pop(noteF(S.runK + (ver ? 2 : 0)), vol, 0, 0.26);
      }
    }
    S.path = swayedRingPath(lv, S.pos);
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
    if (!S.cam) S.cam = { scale: 1.0, targetScale: 1.0, x: 0, y: 0, targetX: 0, targetY: 0 };
    var cam = S.cam;
    var zSpeed = Math.min(1, dt * 3.5);
    var pSpeed = Math.min(1, dt * 5.0);
    cam.scale += (cam.targetScale - cam.scale) * zSpeed;
    cam.x += (cam.targetX - cam.x) * pSpeed;
    cam.y += (cam.targetY - cam.y) * pSpeed;
    if (Math.abs(cam.scale - 1) < 0.005 && Math.abs(cam.x) < 0.25 && Math.abs(cam.y) < 0.25 && cam.targetScale === 1.0) {
      cam.scale = 1.0; cam.x = 0; cam.y = 0;
    }
    if (S.drag) applyNodeDrag(S.drag);
    if (S.edgeDrag) applyEdgeDrag(S.edgeDrag);
    for (var i = 0; i < S.pl.length; i++) S.pl[i] = Math.max(0, S.pl[i] - dt * 3);
    S.toast = Math.max(0, S.toast - dt); S.flash = Math.max(0, S.flash - dt * 3);
    updateParts(dt);
    if (S.scene === 'reward') { updateReward(dt); return; }
    S.speed += ((S.speedTarget || 1) - S.speed) * Math.min(1, dt * 5);
    var lv = LV[S.li], sp = S.speed;
    S.t += dt * (['snap', 'cut', 'unfold', 'lift', 'fill', 'fly'].indexOf(S.phase) >= 0 ? sp : 1);
    for (var j = 0; j < S.sc.length; j++) {
      var target = (S.drag && S.drag.i === j) ? 1.15 : 1;
      if (S.phase === 'intro') target = S.t > 0.12 + j * 0.07 ? 1 : 0;
      S.sc[j] += (target - S.sc[j]) * Math.min(1, dt * (S.phase === 'intro' ? 14 : 18));
    }
    if (S.phase === 'intro' || S.phase === 'play' || S.phase === 'verify') {
      if (S.edgeDrag) {
        var edw = S.edgeDrag;
        edw.rip *= Math.exp(-dt * 8.5);
        edw.uSmooth += (edw.u - edw.uSmooth) * Math.min(1, dt * 28);
        var skMag = edw.inMag ? 0.35 : 1.0;
        var curSk = (edw.uSmooth - 0.5) * skMag;
        S.bend._waves = S.bend._waves || [];
        S.bend._waves[edw.k] = {
          u: edw.uSmooth,
          skew: curSk,
          rip: edw.rip * Math.cos(clock * 18)
        };
        if (Math.abs(edw.rip) > 2e-4 || Math.abs(edw.u - edw.uSmooth) > 1e-3) S.dirty = true;
      }
      if (S.waveSettle) {
        var ws = S.waveSettle; ws.t += dt;
        var wDecay = Math.exp(-ws.t * 14), wOsc = Math.cos(ws.t * 24);
        var wSkew = ws.skew0 * wDecay * wOsc;
        var wRip = (ws.rip0 || 0) * Math.exp(-ws.t * 12) * Math.cos(ws.t * 28) - ws.skew0 * 0.028 * wDecay * Math.sin(ws.t * 24);
        if (ws.t >= 0.26 || (Math.abs(wSkew) < 1e-3 && Math.abs(wRip) < 1e-4)) {
          if (S.bend && S.bend._waves) S.bend._waves[ws.k] = null;
          S.waveSettle = null;
        } else {
          S.bend._waves = S.bend._waves || [];
          S.bend._waves[ws.k] = { u: 0.5 + wSkew, skew: wSkew, rip: wRip };
        }
        S.dirty = true;
      }
      if (S.settle) { S.settle.t += dt / SETTLE_T; var su = easeOut(S.settle.t), st = S.settle; S.pos[st.i] = [lerp(st.from[0], st.to[0], su), lerp(st.from[1], st.to[1], su)]; S.dirty = true; if (st.t >= 1) S.settle = null; }
      if (S.edgeSettle) { 
        S.edgeSettle.t += dt / SETTLE_T; var es = S.edgeSettle; S.bend[es.k] = lerp(es.from, es.to, easeOut(es.t)); S.dirty = true; 
        if (es.t >= 1) {
          triggerEdgeBounce(es.k, (es.to >= 0 ? 1 : -1));
          S.edgeSettle = null;
        }
      }
      if (S.seamZips && S.seamZips.length > 0) S.dirty = true;
      if (S.edgeBounces) {
        var nowB = now();
        for (var bk in S.edgeBounces) {
          if (nowB - S.edgeBounces[bk].t0 < S.edgeBounces[bk].dur) { S.dirty = true; break; }
          else delete S.edgeBounces[bk];
        }
      }
      if (S.needleSettle) { var ns = S.needleSettle; ns.t += dt / SETTLE_T; setNeedle(lerp(ns.from, ns.to, easeOut(ns.t))); if (ns.t >= 1) S.needleSettle = null; }
      if (S.dirty) {
        recompute();
        [[m1(), 2], [m2(), 4]].forEach(function (m) { if (S.lastIou < m[0] && S.iouV >= m[0]) { S.flash = 1; softTone(pentaF(m[1], -1), 0.055, 0.15); vib(8); } });
        var pinSt = checkPins(LV[S.li].def, S.pos);
        var rdy = (S.iouV >= S.thr) && pinSt.allFilled;
        if (rdy && !S.ready && (S.drag || S.edgeDrag || S.needle)) { 
          S.flash = 1; 
          S.readyGlowT = now();
          S.pluckT = now(); 
          pluck(pentaF(0, -1), 0.075); 
          pluck(pentaF(2, -1), 0.05, 0.045); 
          vib([10, 22, 10]); 
        }
        S.ready = rdy;
        S.lastIou = S.iouV;
      }
      var v = S.phase === 'verify' ? 1 : barValue(S.iouV);
      S.dv += (v - S.dv) * Math.min(1, dt * 12);
      var targetSlack = (S.ready ? 0 : 2.5);
      S.slack += (targetSlack - S.slack) * Math.min(1, dt * 10);
      if ((S.ready && (S.drag || S.edgeDrag || S.needle)) || (now() - (S.readyGlowT || -9) < 0.60) || (now() - (S.winFlashT || -9) < 0.48)) S.dirty = true;
      if (S.drag || S.edgeDrag || S.needle) humUpdate(dt, S.dv, S.ready, S.moveAcc / Math.max(dt, 0.008));
      S.moveAcc = 0;
      if (S.phase === 'intro' && S.t > 0.9) setPhase('play');
      runnerStep(dt);
    } else if (S.phase === 'snap') {
      var run = S.t * S.snapV, uSnap = clamp(S.t / S.snapT, 0, 1);
      for (var k = 0; k < S.pos.length; k++) {
        var a0 = S.snapFrom[k], b0 = S.snapTo[k], dk = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]), uk = dk > 1e-6 ? Math.min(1, run / dk) : 1;
        S.pos[k] = [lerp(a0[0], b0[0], uk), lerp(a0[1], b0[1], uk)];
      }
      for (var bk = 0; bk < S.bend.length; bk++) {
        S.bend[bk] = lerp(S.bendFrom[bk], LV[S.li].def.solBend[bk] || 0, uSnap);
      }
      if (foldOf()) { var dn = Math.abs(foldOf().solX - S.foldFrom); S.foldX = lerp(S.foldFrom, foldOf().solX, dn > 1e-6 ? Math.min(1, run / dn) : 1); }
      S.slack += (0 - S.slack) * Math.min(1, dt * 14);
      recompute(); S.path = swayedRingPath(lv.def, S.pos); S.dv += (1 - S.dv) * Math.min(1, dt * 12);
      if (S.t >= S.snapT) { setPhase('cut'); S.cutLast = -1; S.snipT = 0; S.cutHit = []; S.cutD = cutNodeDists(lv); }
    } else if (S.phase === 'cut') {
      var L = cutLen(lv) * clamp(S.t / cutDur(lv), 0, 1);
      for (var q = 0; q < S.cutD.length; q++) {
        var cd = S.cutD[q];
        if (S.cutLast < cd.d && cd.d <= L) {
          pop(risingF(cd.rank), 0.07, 0, 0.3); S.cutHit[cd.i] = now(); S.pl[cd.i] = 1;
          S.ripples.push({ x: X(S.pos[cd.i][0]), y: Y(S.pos[cd.i][1]), t0: now(), c: C.cream, world: true });
          if (foldOf() && !onFold(cd.i)) { pop(risingF(cd.rank) * 2, 0.045, 0, 0.3); S.ripples.push({ x: X(foldY() ? S.pos[cd.i][0] : 2 * S.foldX - S.pos[cd.i][0]), y: Y(foldY() ? 2 * S.foldX - S.pos[cd.i][1] : S.pos[cd.i][1]), t0: now(), c: C.cream, world: true }); }
        }
      }
      var ch = runnerHead(lv.solPath, L);
      advanceSnip(SNIP_RATE * 1.4 * dt * sp, ch.x, ch.y, ch.ang, true);
      S.cutLast = L;
      if (S.t >= cutDur(lv)) {
        if (lv.def.fold) { chord([5, 9, 12], 0.05, 0.03); setPhase('unfold'); noise(0.5, 0.035, 2200, 'bandpass'); vib(10); }
        else { setPhase('lift'); noise(0.25, 0.04, 900, 'bandpass'); vib(14); }
      }
    } else if (S.phase === 'unfold') {
      // Lật bung nửa gấp ra; mở hẳn thì lấp lánh nhẹ và dừng một nhịp ngắn để người chơi kịp thấy cả hình,
      // rồi sang đổ màu như màn thường. Trong lúc lật, mảnh đã nhấc dần lên đúng tư thế đầu bước đổ màu.
      if (S.t >= UNFOLD_T && !S.unfolded) { S.unfolded = true; sparkle(X(lv.cen[0]), Y(lv.cen[1]) - 12, 7); pop(noteF(7), 0.035, 0, 0.35); vib(8); }
      if (S.t >= UNFOLD_T + UNFOLD_HOLD) { S.unfolded = false; setPhase('fill'); }
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
    ctx.beginPath();
    (pts.loops || [pts]).forEach(function (lp) {
      ctx.moveTo(ox + lp[0] * s, oy + lp[1] * s);
      for (var i = 2; i < lp.length; i += 2) ctx.lineTo(ox + lp[i] * s, oy + lp[i + 1] * s);
      ctx.closePath();
    });
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
  function slotRect(i) {
    var n = product().levels.length;
    if (n <= 3) return [186 + i * 58, 168, 46, 46];
    var w = 38, step = Math.floor((170 - w) / (n - 1));
    return [186 + i * step, 170, w, w];
  }
  function fitTf(lv, cx, cy, size) {
    var b = lv.bbox, s = size / Math.max(b[2] - b[0], b[3] - b[1]);
    return { ox: cx - (b[0] + b[2]) / 2 * s, oy: cy - (b[1] + b[3]) / 2 * s, s: s };
  }
  function drawInfo() {
    rr(20, 80, 140, 148, 18); ctx.fillStyle = C.card; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
    text('Hình mẫu', 90, 101, 13, 700, C.inkSoft, 'center');
    var lv = LV[S.li], tf = fitTf(lv, 90, 165, 92);
    outlinePath(lv.outline, tf.ox, tf.oy, tf.s); ctx.fillStyle = rgba((fab(S.li) || lv.def.pattern).base, 0.45); ctx.fill();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.setLineDash([]);

    rr(172, 80, 198, 148, 18); ctx.fillStyle = C.card; ctx.fill();
    text('Độ khớp', 186, 101, 13, 700, C.inkSoft, 'left');
    var pinSt = checkPins(LV[S.li].def, S.pos);
    text('Chốt: ' + pinSt.filledCount + '/' + pinSt.totalPins, 356, 101, 12, 700, pinSt.allFilled ? C.sageDeep : '#C88E3E', 'right');
    var bx = 186, by = 112, bw = 170, bh = 22, raw = S.phase === 'play' || S.phase === 'intro' ? S.iouV : 1;
    var col = raw >= m2() ? C.barNear : (raw >= m1() ? C.barMid : C.barFar);
    var ready = (S.drag || S.edgeDrag) && S.iouV >= S.thr && pinSt.allFilled;
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
      if (S.done[li]) { var t2 = fitTf(LV[li], r[0] + r[2] / 2, r[1] + r[3] / 2, Math.round(r[2] * 34 / 46)); drawPiece(li, t2.ox, t2.oy, t2.s, 1, false, 0.6); }
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
  // Vùng tô (hình sẽ có sau khi cắt): hồng nhạt ấm, đủ trong để vẫn thấy viền hình mẫu bên dưới.
  var MASK_RGB = [233, 150, 160], MASK_A = 0.20;
  // Bảng màu vùng tô (mask.js) gọi vào đây: màu hex và độ đậm 0–1 khi kéo; lúc snap đậm hơn 10 điểm.
  window.GNSetMask = function (hex, a) {
    var n = parseInt(hex.slice(1), 16); MASK_RGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; MASK_A = clamp(a, 0.15, 0.85);
  };
  function paintMask(alpha) {
    var d = mimg.data, m = S.mask;
    for (var i = 0; i < m.length; i++) { var o = i * 4; d[o] = MASK_RGB[0]; d[o + 1] = MASK_RGB[1]; d[o + 2] = MASK_RGB[2]; d[o + 3] = m[i] ? alpha : 0; }
    mctx.putImageData(mimg, 0, 0);
  }
  function drawFabric() {
    rr(FX - 8, FY - 12, FS + 16, FS + 24, 20); ctx.fillStyle = C.card; ctx.fill();
    rr(FX, FY, FS, FS, 14); ctx.fillStyle = C.fabric; ctx.fill(); ctx.fillStyle = weave(); ctx.fill();
    rr(FX + 7, FY + 7, FS - 14, FS - 14, 10); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]);
  }
  // Nửa vải đang gấp: phủ một lớp kem mờ lên nửa phải (phần soi gương chỉ để xem trước) và vẽ mép gấp nét đứt.
  function drawFoldVeil(a) {
    var f = foldOf(); if (!f) return;
    if (foldY()) {
      var yf = Y(S.foldX);
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.rect(FX, yf, FS, FY + FS - yf); ctx.clip();
      rr(FX, FY, FS, FS, 14); ctx.fillStyle = 'rgba(246,239,227,0.62)'; ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a; rr(FX, FY, FS, FS, 14); ctx.clip();
      var gSy = ctx.createLinearGradient(0, yf - 22, 0, yf); gSy.addColorStop(0, 'rgba(74,59,53,0)'); gSy.addColorStop(1, 'rgba(74,59,53,0.16)');
      ctx.fillStyle = gSy; ctx.fillRect(FX, yf - 22, FS, 22);
      var gHy = ctx.createLinearGradient(0, yf, 0, yf + 10); gHy.addColorStop(0, 'rgba(255,255,255,0.7)'); gHy.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gHy; ctx.fillRect(FX, yf, FS, 10);
      ctx.restore();
      if (S.phase === 'play' || S.phase === 'intro') drawSliderY(yf, a);
      return;
    }
    var xf = X(S.foldX);
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.rect(xf, FY, FX + FS - xf, FS); ctx.clip();
    rr(FX, FY, FS, FS, 14); ctx.fillStyle = 'rgba(246,239,227,0.62)'; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a; rr(FX, FY, FS, FS, 14); ctx.clip();
    var gS = ctx.createLinearGradient(xf - 22, 0, xf, 0); gS.addColorStop(0, 'rgba(74,59,53,0)'); gS.addColorStop(1, 'rgba(74,59,53,0.16)');
    ctx.fillStyle = gS; ctx.fillRect(xf - 22, FY, 22, FS);
    var gH = ctx.createLinearGradient(xf, 0, xf + 10, 0); gH.addColorStop(0, 'rgba(255,255,255,0.7)'); gH.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gH; ctx.fillRect(xf, FY, 10, FS);
    ctx.restore();
    // mép gấp chỉ thể hiện bằng nếp gấp có bóng (người dùng chọn kiểu này), không vẽ thân kim hay sợi chỉ
    if (SHOW_FOLD_NEEDLE) drawFoldNeedle(xf, a);
    if (S.phase === 'play' || S.phase === 'intro') drawSlider(xf, a);
  }
  // Thanh gạt dọc nằm bên phải khung tranh cho màn gấp theo đường ngang (axis: 'y').
  function drawSliderY(yf, a) {
    var x = SLIDER_X, act = S.needle ? 1 : 0;
    ctx.save(); ctx.globalAlpha = a;
    var rg = needleRange(); rr(x - 5, Y(rg[0]) - 6, 10, Y(rg[1]) - Y(rg[0]) + 12, 5); ctx.fillStyle = rgba(C.ink, 0.16); ctx.fill();
    var fo = foldOf(); if (S.needle && S.needle.inMag) { ctx.beginPath(); ctx.arc(x, Y(fo.solX), 5, 0, 7); ctx.fillStyle = rgba(C.mustard, 0.9); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(FX + 14, yf); ctx.lineTo(x - 16, yf); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.ink, 0.35); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.shadowColor = 'rgba(74,59,53,0.25)'; ctx.shadowBlur = act ? 10 : 5; ctx.shadowOffsetY = 2;
    rr(x - 14, yf - 24, 28, 48, 14); ctx.fillStyle = act ? C.mustard : C.card; ctx.fill(); ctx.restore();
    rr(x - 14, yf - 24, 28, 48, 14); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    [-6, 0, 6].forEach(function (dy) { ctx.beginPath(); ctx.moveTo(x - 6, yf + dy); ctx.lineTo(x + 6, yf + dy); ctx.stroke(); });
    ctx.restore();
  }
  // Thanh gạt: rãnh dài dưới khung vải, núm gạt thẳng hàng với cây kim, nối lên mép vải bằng nét đứt.
  function drawSlider(xf, a) {
    var y = SLIDER_Y, act = S.needle ? 1 : 0;
    ctx.save(); ctx.globalAlpha = a;
    // chỉ hiện đoạn kim đi được lúc này, hai đầu bo tròn như rãnh thật
    var rg = needleRange(); rr(X(rg[0]) - 6, y - 5, X(rg[1]) - X(rg[0]) + 12, 10, 5); ctx.fillStyle = rgba(C.ink, 0.16); ctx.fill();
    var fo = foldOf(); if (S.needle && S.needle.inMag) { ctx.beginPath(); ctx.arc(X(fo.solX), y, 5, 0, 7); ctx.fillStyle = rgba(C.mustard, 0.9); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(xf, FY + FS + 4); ctx.lineTo(xf, y - 16); ctx.setLineDash([3, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.ink, 0.35); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.shadowColor = 'rgba(74,59,53,0.25)'; ctx.shadowBlur = act ? 10 : 5; ctx.shadowOffsetY = 2;
    rr(xf - 24, y - 15, 48, 30, 15); ctx.fillStyle = act ? C.mustard : C.card; ctx.fill(); ctx.restore();
    rr(xf - 24, y - 15, 48, 30, 15); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    [-6, 0, 6].forEach(function (dx) { ctx.beginPath(); ctx.moveTo(xf + dx, y - 6); ctx.lineTo(xf + dx, y + 6); ctx.stroke(); });
    ctx.restore();
  }
  // Cây kim làm mép gấp: lỗ kim ở trên kèm sợi chỉ, mũi kim ở dưới. Hai mũi tên nhỏ báo kim đi được sang hai bên.
  // (trước đây trùng tên với kim khâu ở màn thưởng nên hàm này bị ghi đè, cây kim mép gấp không hiện)
  function drawFoldNeedle(xf, a) {
    var y0 = FY + 10, y1 = FY + FS - 8, act = S.needle ? 1 : 0;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(xf, y0 + 4); ctx.bezierCurveTo(xf - 26, y0 - 6, xf - 34, y0 + 30, xf - 58, y0 + 18);
    ctx.lineWidth = 2; ctx.strokeStyle = C.roseDeep; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xf - 3, y0); ctx.lineTo(xf + 3, y0); ctx.lineTo(xf + 2.4, y1 - 22); ctx.lineTo(xf, y1); ctx.lineTo(xf - 2.4, y1 - 22); ctx.closePath();
    ctx.fillStyle = '#D9DDE1'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xf - 1, y0 + 6); ctx.lineTo(xf - 1, y1 - 30); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(xf, y0 + 6, 1.1, 4, 0, 0, 7); ctx.fillStyle = C.ink; ctx.fill();
    if (S.phase === 'play' || S.phase === 'intro') {
      var ym = FY + FS * 0.5, k = act ? 1 : 0.55 + 0.25 * Math.sin(clock * 3);
      ctx.globalAlpha = a * k; ctx.lineWidth = 2.4; ctx.strokeStyle = C.ink;
      [-1, 1].forEach(function (sg) { ctx.beginPath(); ctx.moveTo(xf + sg * 12, ym - 6); ctx.lineTo(xf + sg * 18, ym); ctx.lineTo(xf + sg * 12, ym + 6); ctx.stroke(); });
    }
    ctx.restore();
  }
  function drawGhost(lv, a) {
    outlinePath(lv.outline, FX, FY, FS);
    ctx.fillStyle = rgba(C.thread, 0.13 * a); ctx.fill();
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.thread, 0.9 * a); ctx.stroke(); ctx.setLineDash([]);
  }
  var polyBuf = [];
  function polyPointAt(p, u) {
    var m = p.length / 2 - 1;
    if (m <= 0) return [p[0], p[1], 0];
    var s = clamp(u, 0, 1) * m, i = Math.min(m - 1, Math.floor(s)), f = s - i;
    var ax = p[i * 2], ay = p[i * 2 + 1], bx = p[(i + 1) * 2], by = p[(i + 1) * 2 + 1];
    return [ax + (bx - ax) * f, ay + (by - ay) * f, Math.atan2(by - ay, bx - ax)];
  }
  // Bảng màu sợi chỉ nhuộm ombre dịu ấm (Cozy Variegated Yarn):
  // Hồng đất đào -> Vàng bơ mật -> Xanh xô thơm -> Xanh lam khói -> Tím hoa cà ấm.
  var COZY_YARN = [
    [214, 122, 114],
    [222, 170,  92],
    [118, 172, 138],
    [114, 150, 184],
    [172, 130, 168]
  ];
  function cozyThreadRGB(phase, taut) {
    var n = COZY_YARN.length;
    var u = (((phase % 1) + 1) % 1) * n;
    var i = Math.floor(u), f = u - i;
    var s = 0.5 - 0.5 * Math.cos(f * Math.PI);
    var A = COZY_YARN[i % n], B = COZY_YARN[(i + 1) % n];
    var r = lerp(A[0], B[0], s), g = lerp(A[1], B[1], s), b = lerp(A[2], B[2], s);
    return [
      Math.round(lerp(r, 232, taut * 0.18)),
      Math.round(lerp(g, 196, taut * 0.18)),
      Math.round(lerp(b, 120, taut * 0.18))
    ];
  }
  // Vùng tô preview bám đúng theo đường sợi chỉ đang đung đưa.
  function drawSwayedFill(alpha) {
    if (!S.path || S.path.pts.length < 6) return;
    var pts = S.path.pts;
    ctx.save();
    ctx.fillStyle = 'rgba(' + MASK_RGB[0] + ',' + MASK_RGB[1] + ',' + MASK_RGB[2] + ',' + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(X(pts[0]), Y(pts[1]));
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(X(pts[i]), Y(pts[i + 1]));
    ctx.closePath();
    if (foldOf()) {
      var fx = S.foldX, isY = foldY();
      ctx.moveTo(X(isY ? pts[0] : 2 * fx - pts[0]), Y(isY ? 2 * fx - pts[1] : pts[1]));
      for (var j = 2; j < pts.length; j += 2) ctx.lineTo(X(isY ? pts[j] : 2 * fx - pts[j]), Y(isY ? 2 * fx - pts[j + 1] : pts[j + 1]));
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  // Sợi chỉ preview duy nhất: nét liền đung đưa và đổi màu mượt theo dải màu chỉ nhuộm cozy.
  var zipPolyBuf = [];
  function drawSeamZips(intro) {
    if (!S.seamZips || S.seamZips.length === 0) return;
    var lv = LV[S.li] ? LV[S.li].def : null;
    if (!lv || !lv.ring) return;
    var nowT = now();
    for (var zi = S.seamZips.length - 1; zi >= 0; zi--) {
      var z = S.seamZips[zi];
      var el = (nowT - z.t0) / z.dur;
      if (el < 0) continue; // Chưa đến thời điểm bắt đầu trễ
      if (el >= 1) { S.seamZips.splice(zi, 1); continue; }
      var k = z.k;
      if (k < 0 || k >= lv.ring.length) continue;
      var ra = lv.ring[k], rb = lv.ring[(k + 1) % lv.ring.length];
      var poly = GN.edgePoly(lv, S.pos, ra, rb, 24, zipPolyBuf, S.bend);
      if (!poly || poly.length < 4) continue;

      var spread = easeOut(clamp(el * 1.5, 0, 1));
      var u0 = clamp(z.u - spread * 0.55, 0, 1);
      var u1 = clamp(z.u + spread * 0.55, 0, 1);
      var alpha = (1 - el) * intro;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Vầng hào quang ngoài màu vàng mật óng ánh
      ctx.beginPath();
      var pt0 = polyPointAt(poly, u0);
      ctx.moveTo(X(pt0[0]), Y(pt0[1]));
      var steps = 16;
      for (var s = 1; s <= steps; s++) {
        var u = u0 + (u1 - u0) * (s / steps);
        var pt = polyPointAt(poly, u);
        ctx.lineTo(X(pt[0]), Y(pt[1]));
      }
      ctx.lineWidth = 7.5 + (1 - el) * 4;
      ctx.strokeStyle = rgba('#FFD269', alpha * 0.82);
      ctx.stroke();

      // 2. Lõi chỉ thêu sáng lấp lánh màu tơ tằm
      ctx.lineWidth = 2.8 + (1 - el) * 1.4;
      ctx.strokeStyle = rgba('#FFFDF5', alpha * 0.98);
      ctx.stroke();

      // 3. Đốm lóe sáng hình kim cương tại hai đầu mép chạy
      if (el < 0.75) {
        var gA = (1 - el / 0.75) * intro;
        var pt1 = polyPointAt(poly, u1);
        [pt0, pt1].forEach(function (pt) {
          var gx = X(pt[0]), gy = Y(pt[1]), gr = 4.2 * gA;
          ctx.beginPath();
          ctx.moveTo(gx - gr * 1.4, gy);
          ctx.lineTo(gx, gy - gr * 0.7);
          ctx.lineTo(gx + gr * 1.4, gy);
          ctx.lineTo(gx, gy + gr * 0.7);
          ctx.closePath();
          ctx.fillStyle = rgba('#FFFDF5', gA);
          ctx.fill();
        });
      }
      ctx.restore();
    }
  }

  /* ---------- Hiệu ứng phát sáng tơ tằm bừng sáng toàn bộ đường viền chỉ khi đạt điều kiện thắng ---------- */
  function drawReadyContourGlow(intro) {
    if (!S.path || !S.path.pts || S.path.pts.length < 4) return;
    var isHoldingReady = S.ready && (S.drag !== null || S.edgeDrag !== null || S.needle !== null);
    var nowT = now();
    var surgeAge = nowT - (S.readyGlowT || -9);
    var inSurge = (surgeAge >= 0 && surgeAge < 0.60);
    var winFlashAge = nowT - (S.winFlashT || -9);
    var inWinFlash = (winFlashAge >= 0 && winFlashAge < 0.48);

    // Phát sáng khi đang giữ trong vùng thắng, hoặc trong nhịp bùng nổ mở đầu, hoặc trong nhịp chớp sáng thắng khi buông tay
    if (!isHoldingReady && !inSurge && !inWinFlash) return;

    var pts = S.path.pts, cum = S.path.cum, crease = S.path.crease, total = S.path.total || 1, nSeg = pts.length / 2 - 1;

    // 1. Nhịp bùng nổ khi vừa kéo trượt vào ngưỡng thắng lúc đang giữ tay
    var surgeRatio = inSurge ? (1 - surgeAge / 0.60) : 0;

    // 2. Nhịp thở óng ánh khi người chơi giữ ngón tay trong vùng đạt ngưỡng
    var breathe = isHoldingReady ? (0.55 + 0.15 * Math.sin(nowT * 7)) : 0;

    // 3. Nhịp chớp sáng bừng lên khi thả tay chiến thắng rồi vụt tắt mềm mại (Attack 80ms -> Decay 400ms)
    var winFlashRatio = 0;
    if (inWinFlash) {
      if (winFlashAge < 0.08) {
        winFlashRatio = winFlashAge / 0.08;
      } else {
        var p = (winFlashAge - 0.08) / (0.48 - 0.08);
        winFlashRatio = Math.pow(1 - p, 2);
      }
    }

    var flashEnergy = Math.max(surgeRatio, winFlashRatio);
    var glowAlpha = clamp(Math.max(breathe, surgeRatio * 0.85, winFlashRatio * 1.0), 0, 1) * intro;
    if (glowAlpha < 0.02) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Giữ lại độ dày mảnh dẻ, tinh tế như cũ theo phản hồi người chơi (không bị quá dày):
    // Lúc giữ tay: dao động thanh mảnh 6.6px - 8.6px. Lúc chớp sáng cao trào: đạt tối đa 11.2px rồi thu nhỏ vụt tắt.
    var haloWidth = 7.6 + 3.6 * flashEnergy + (isHoldingReady ? 1.0 * Math.sin(nowT * 7) : 0);
    var coreWidth = 2.8 + 0.8 * flashEnergy;

    // 1. TẦNG HÀO QUANG BẢY MÀU COZY (Iridescent Cozy Rainbow Halo)
    // Dải chuyển màu ombre mềm mại: hồng đào -> vàng bơ -> xanh xô thơm -> xanh lam khói -> tím cà ấm
    var step = 2;
    var drift = nowT * 0.12;
    for (var i = 0; i < nSeg; i += step) {
      if (crease && crease[i]) continue;
      var j = Math.min(nSeg, i + step);
      while (j > i + 1 && crease && crease[j - 1]) j--;
      ctx.beginPath();
      ctx.moveTo(X(pts[i * 2]), Y(pts[i * 2 + 1]));
      for (var s = i + 1; s <= j; s++) ctx.lineTo(X(pts[s * 2]), Y(pts[s * 2 + 1]));
      var midD = (cum[i] + cum[j]) * 0.5;
      var rgb = cozyThreadRGB(midD / total + drift, 1);
      ctx.lineWidth = haloWidth;
      ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (glowAlpha * 0.82) + ')';
      ctx.stroke();
    }

    // 2. TẦNG LÕI TRẮNG SÁNG TƠ TẰM LẤP LÁNH (Brilliant Pure White Silk Core)
    // Nằm đè lên trên chính giữa sợi chỉ, trắng muốt sáng chói như tia chớp lúc snap đường chỉ cong
    ctx.beginPath();
    var started = false;
    for (var k = 0; k < nSeg; k++) {
      if (crease && crease[k]) { started = false; continue; }
      if (!started) {
        ctx.moveTo(X(pts[k * 2]), Y(pts[k * 2 + 1]));
        started = true;
      }
      ctx.lineTo(X(pts[(k + 1) * 2]), Y(pts[(k + 1) * 2 + 1]));
    }
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (glowAlpha * 0.98) + ')';
    ctx.stroke();

    // 3. ĐỐM KIM CƯƠNG LẤP LÁNH (Diamond Glints)
    var glintEnergy = Math.max(inSurge ? (surgeRatio - 0.12) / 0.88 : 0, inWinFlash ? winFlashRatio : 0);
    if (glintEnergy > 0.08) {
      var glintA = glintEnergy * intro;
      var numGlints = 5;
      for (var gi = 0; gi < numGlints; gi++) {
        var uGlint = ((nowT * 0.40 + gi / numGlints) % 1.0);
        var ptG = polyPointAt(pts, uGlint);
        var gx = X(ptG[0]), gy = Y(ptG[1]), gr = (3.5 + 2.0 * glintEnergy) * glintA;
        ctx.beginPath();
        ctx.moveTo(gx - gr * 1.4, gy);
        ctx.lineTo(gx, gy - gr * 0.7);
        ctx.lineTo(gx + gr * 1.4, gy);
        ctx.lineTo(gx, gy + gr * 0.7);
        ctx.closePath();
        ctx.fillStyle = rgba('#FFFFFF', glintA * 0.98);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawEdges(alpha) {
    if (!S.path || S.path.pts.length < 4) return;
    var pts = S.path.pts, cum = S.path.cum, crease = S.path.crease, total = S.path.total || 1, nSeg = pts.length / 2 - 1;
    var pAge = now() - S.pluckT;
    var drift = clock * 0.09, m = clamp((S.dv - 0.35) / 0.65, 0, 1); m *= m;
    var taut = S.iouV >= S.thr ? 1 : m;
    ctx.save();
    ctx.lineWidth = 2.8 + 0.7 * taut + (pAge >= 0 && pAge < 0.25 ? (1 - pAge / 0.25) * 1.2 : 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var step = 2;
    for (var i = 0; i < nSeg; i += step) {
      if (crease && crease[i]) continue;
      var j = Math.min(nSeg, i + step);
      while (j > i + 1 && crease && crease[j - 1]) j--;
      ctx.beginPath();
      ctx.moveTo(X(pts[i * 2]), Y(pts[i * 2 + 1]));
      for (var s = i + 1; s <= j; s++) ctx.lineTo(X(pts[s * 2]), Y(pts[s * 2 + 1]));
      var midD = (cum[i] + cum[j]) * 0.5;
      var rgb = cozyThreadRGB(midD / total + drift, taut);
      ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawNode(i, alpha, size) {
    var x = X(S.pos[i][0]), y = Y(S.pos[i][1]), s = S.sc[i] * (size || 1) * (1 + 0.3 * S.pl[i]), lk = locked(i);
    var st = now() - S.shake[i]; if (st >= 0 && st < 0.35) x += Math.sin(st * 60) * 4 * (1 - st / 0.35);
    if (s < 0.02) return;
    var liftK = clamp((S.sc[i] - 1.0) / 0.15, 0, 1);
    if (liftK > 0.02 && alpha > 0.1) {
      ctx.save();
      var shadowOffsetY = lerp(1.5, 6.5, liftK);
      var shadowRadiusX = lerp(12.5, 15.5, liftK);
      var shadowRadiusY = lerp(6.5, 8.5, liftK);
      var shadowAlpha = lerp(0.16, 0.26, liftK) * alpha;
      ctx.beginPath();
      ctx.ellipse(x, y + shadowOffsetY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(C.ink, shadowAlpha);
      ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    if (S.phase === 'verify' && S.lit[i]) { ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = C.mustard; ctx.stroke(); }
    ctx.lineJoin = 'round';
    // Toàn bộ node đồng nhất là ghim tròn ('c'); đã bỏ hoàn toàn node tam giác ('s')
    ctx.beginPath(); ctx.arc(0, 0, 13.5, 0, 7);
    ctx.lineWidth = 2.4 + NODE_HALO * 2; ctx.strokeStyle = rgba(C.halo, NODE_HALO_A); ctx.stroke();
    ctx.fillStyle = lk ? '#E9E1D6' : C.rose; ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = lk ? C.mute : C.ink; ctx.stroke();
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
      var lintColors = ['#FFD269', '#FFF8E8', '#DFB15B', '#F7E6DF', C.thread];
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.45 + Math.random() * 0.3, age: 0, kind: 'lint',
        c: lintColors[i % lintColors.length], r: 1.6 + Math.random() * 1.8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, g: 220 });
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
      var rad = 10 + 24 * t, al = 1 - t;
      ctx.save();
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 7);
      // viền bóng nhẹ phía dưới để sóng màu kem nhìn rõ nét trên nền vải sáng
      ctx.lineWidth = 5; ctx.strokeStyle = rgba(C.ink, al * 0.24); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = rgba(r.c || C.cream, al * 0.96); ctx.stroke();
      ctx.restore();
    }
  }
  function drawWire() {
    if (S.edgeDrag) {
      var ed = S.edgeDrag, lv = LV[S.li].def;
      var poly = GN.edgePoly(lv, S.pos, ed.a, ed.b, 20, polyBuf, S.bend);
      var pt = polyPointAt(poly, ed.uSmooth), mx = X(pt[0]), my = Y(pt[1]);
      ctx.save();
      ctx.setLineDash([3, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(C.ink, 0.5);
      ctx.beginPath(); ctx.moveTo(ed.fx, ed.fy); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(ed.fx, ed.fy, 14, 0, 7); ctx.fillStyle = rgba(C.ink, 0.1); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.ink, 0.45); ctx.stroke();
      ctx.restore();
      return;
    }
    var d = S.drag; if (!d) return;
    var fo = foldOf(), lx = X(S.pos[d.i][0]), rx = fo ? X(2 * S.foldX - S.pos[d.i][0]) : lx, ny = Y(S.pos[d.i][1]);
    var nx = d.twin ? rx : lx;
    ctx.save();
    if (fo && fo.twin && !onFold(d.i)) {
      ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.mustardDeep, 0.78);
      ctx.beginPath(); ctx.moveTo(lx, ny); ctx.lineTo(rx, ny); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(X(S.foldX), ny, 4, 0, 7); ctx.fillStyle = C.mustard; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke();
    }
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(C.ink, 0.5);
    ctx.beginPath(); ctx.moveTo(d.fx, d.fy); ctx.lineTo(nx, ny); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(d.fx, d.fy, 14, 0, 7); ctx.fillStyle = rgba(C.ink, 0.1); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.ink, 0.45); ctx.stroke();
    ctx.restore();
  }
  function drawHint() {
    var h = S.hint; if (!h) return;
    var t = now() - h.t0; if (t > 3) { S.hint = null; return; }
    var lv = LV[S.li].def, a, b, pulse = 0.5 + 0.5 * Math.sin(t * 8);
    if (h.edge !== undefined) {
      var rk = h.edge, ra = lv.ring[rk], rb = lv.ring[(rk + 1) % lv.ring.length];
      var pCur = GN.edgePoly(lv, S.pos, ra, rb, 20, polyBuf, S.bend), mCur = Math.floor(pCur.length / 4) * 2;
      a = [pCur[mCur], pCur[mCur + 1]];
      var pSol = GN.edgePoly(lv, S.pos, ra, rb, 20, hitPolyBuf, bendsAt(rk, h.th)), mSol = Math.floor(pSol.length / 4) * 2;
      b = [pSol[mSol], pSol[mSol + 1]];
    } else {
      a = S.pos[h.i]; b = lv.sol[h.i];
    }
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
  function drawPiece(i, ox, oy, s, fill, lifted, stitchA, deep, underBorderFn) {
    var lv = LV[i], pts = lv.outline, b = lv.bbox, fb = fab(i);
    if (lifted) {
      ctx.save(); ctx.shadowColor = 'rgba(65,42,36,0.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 9;
      outlinePath(pts, ox, oy, s); ctx.fillStyle = C.cream; ctx.fill(); ctx.restore();
    } else if (fb) {
      // Hướng A: đổ bóng nhẹ phân tách các lớp vải/cartoon khỏi nền và tầng dưới
      ctx.save(); ctx.shadowColor = 'rgba(65,42,36,0.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      outlinePath(pts, ox, oy, s); ctx.fillStyle = C.cream; ctx.fill(); ctx.restore();
    }
    outlinePath(pts, ox, oy, s); ctx.fillStyle = C.cream; ctx.fill();
    ctx.save(); outlinePath(pts, ox, oy, s); ctx.clip();
    ctx.fillStyle = weave(); ctx.fillRect(ox + b[0] * s, oy + b[1] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s);
    if (fill > 0) {
      ctx.save();
      var top = oy + b[3] * s - (b[3] - b[1]) * s * fill - 2;
      ctx.beginPath(); ctx.rect(ox + b[0] * s - 4, top, (b[2] - b[0]) * s + 8, (b[3] - b[1]) * s + 8); ctx.clip();
      paintPattern(i, ox, oy, s, deep || 0);
      if (fill < 1) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(ox + b[0] * s - 4, top, (b[2] - b[0]) * s + 8, 3); }
      ctx.restore();
    }
    if (typeof underBorderFn === 'function') underBorderFn(ox, oy, s, fb);
    ctx.restore();
    // Hướng A: dùng nét mực đồng tông fb.line hài hòa thay cho viền đen cứng, phân cấp nhẹ độ dày
    outlinePath(pts, ox, oy, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = fb ? Math.max(1.8, 3.6 * Math.min(1, s / 200)) : Math.max(1.4, 2.6 * Math.min(1, s / 200));
    ctx.strokeStyle = fb ? (fb.line || C.ink) : C.ink;
    ctx.stroke();
    if (stitchA > 0 && !fb) {
      var cx = ox + lv.cen[0] * s, cy = oy + lv.cen[1] * s, k = 0.88;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      outlinePath(pts, ox, oy, s); ctx.setLineDash([5 / k * Math.min(1, s / 200) + 1, 4 / k * Math.min(1, s / 200) + 1]);
      ctx.lineWidth = 1.6 / k; ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * stitchA + ')'; ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
    }
  }
  // Mỗi mảnh một họa tiết riêng: chấm bi, kẻ caro, cốm rắc, ô bánh quế. Không mảnh nào trùng màu hay họa tiết.
  var SPR = ['#FFFFFF', '#E3A6A1', '#E9C46A', '#A9C1A0'];
  /* ---------- vải hướng D: màu thật, vân theo chất liệu (chốt 2026-11-09) ---------- */
  // Vân vẽ sẵn thành một ô lặp cho mỗi mảnh (vẽ ở 2x cho nét trên màn hình dày điểm ảnh), mỗi khung hình chỉ tô lại.
  // Kích thước vân cố định theo khung vải (FS), không co giãn theo cỡ mảnh: mảnh nhỏ vẫn có mũi đan cùng cỡ như vải thật.
  var fabricCache = {};
  // Màu mảnh (2026-11-11): bảng đậm tươi kèm viền đồng tông Hướng A.
  var fabDeep = {};
  function fab(i) {
    var f = LV[i].def.fabric;
    if (!f) return f;
    if (!fabDeep[i]) {
      var src = f.deep || f;
      var rawLine = (f.deep && f.deep.line) || (f.mat === 'flat' ? '#5E1222' : f.line) || '#2A2326';
      fabDeep[i] = {
        mat: f.mat, detail: f.detail, base: src.base, light: src.light, dark: src.dark,
        line: mix(rawLine, '#2A2326', 0.28), isDeep: !!f.deep
      };
    }
    return fabDeep[i];
  }
  function fabricRand(seed) { var h = seed >>> 0; return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function fabricPattern(i) {
    if (fabricCache[i] !== undefined) return fabricCache[i];
    var fb = fab(i), k = 2, tw, th;
    // len đan: mũi rộng 1,7% và cao 1,4% bề rộng vải; nỉ: ô 96 pt; len gân: gân 2,2%
    var sw = Math.round(FS * 0.017), sh = Math.round(FS * 0.014), rw = Math.round(FS * 0.022);
    if (fb.mat === 'knit') { tw = sw * 10; th = sh * 10; } else if (fb.mat === 'rib') { tw = rw * 2; th = 16; } else { tw = th = 96; }
    var c = document.createElement('canvas'); c.width = tw * k; c.height = th * k;
    var g = c.getContext('2d'); g.scale(k, k);
    g.fillStyle = fb.base; g.fillRect(0, 0, tw, th);
    if (fb.mat === 'knit') {
      for (var j = 0; j <= 10; j++) for (var q = 0; q < 10; q++) {
        var cx = q * sw + sw / 2, cy = j * sh;
        [[-1, 0.5], [1, -0.5]].forEach(function (lg) {
          g.save(); g.translate(cx + lg[0] * sw * 0.22, cy); g.rotate(lg[1]);
          g.beginPath(); g.ellipse(0, 0, sw * 0.2, sh * 0.62, 0, 0, 7);
          g.fillStyle = rgba(fb.light, 0.5); g.fill(); // mũi đan chỉ bằng tông sáng, không nét tối để màu sạch
          g.restore();
        });
      }
    } else if (fb.mat === 'rib') {
      for (var x = 0; x < tw; x += rw) {
        var gr = g.createLinearGradient(x, 0, x + rw, 0);
        // gân len: rãnh giữ màu nền, sống gân sáng lên (không phủ tông tối)
        gr.addColorStop(0, rgba(fb.light, 0)); gr.addColorStop(0.5, rgba(fb.light, 0.55)); gr.addColorStop(1, rgba(fb.light, 0));
        g.fillStyle = gr; g.fillRect(x, 0, rw, th);
      }
    } else {
      // nỉ: sợi lông ngắn cùng tông; sợi gần mép vẽ lặp sang ô bên cạnh để ô lặp không lộ đường nối
      var r = fabricRand(i * 7919 + 13), n = Math.round(tw * th / 7);
      g.lineCap = 'round'; g.lineWidth = 0.7;
      for (var f = 0; f < n; f++) {
        var fx = r() * tw, fy = r() * th, a = r() * Math.PI, l = (0.004 + r() * 0.008) * FS, col = rgba(fb.light, 0.25 + r() * 0.25); // chỉ sợi sáng: sợi tối làm màu lấm tấm bẩn
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
          var px = fx + dx * tw, py = fy + dy * th;
          if (px < -l || px > tw + l || py < -l || py > th + l) continue;
          g.strokeStyle = col; g.beginPath(); g.moveTo(px, py);
          g.quadraticCurveTo(px + Math.cos(a + 0.6) * l * 0.5, py + Math.sin(a + 0.6) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
        }
      }
    }
    var pat = ctx.createPattern(c, 'repeat');
    if (pat && pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix().scale(1 / k));
    fabricCache[i] = pat;
    return pat;
  }
  // Hướng A (Cozy Storybook Ink): chuyển sắc sáng kem ấm trên-trái, râm nhẹ dưới-phải, kèm viền ánh sáng dịu và tối góc tinh tế.
  function paintStoryGrad(fb, x0, y0, w, h) {
    var hiCol = mix(fb.light, '#FFF8EA', 0.28);
    var loCol = mix(fb.dark, fb.line || '#2A2326', 0.14);
    var cg = ctx.createRadialGradient(x0 + w * 0.30, y0 + h * 0.24, Math.min(w, h) * 0.03, x0 + w * 0.52, y0 + h * 0.54, Math.max(w, h) * 0.82);
    cg.addColorStop(0, hiCol); cg.addColorStop(0.55, fb.base); cg.addColorStop(1, loCol);
    ctx.fillStyle = cg; ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  }
  function paintInnerEdge(i, fb, ox, oy, s, x0, y0, w, h) {
    var rk = Math.max(1.3, s * 0.011);
    ctx.save(); ctx.lineJoin = 'round';
    outlinePath(LV[i].outline, ox + rk * 0.9, oy + rk * 0.9, s);
    ctx.lineWidth = rk * 2.8;
    ctx.strokeStyle = rgba(mix(fb.light, '#FFF9EE', 0.5), 0.26);
    ctx.stroke();
    var sg = ctx.createLinearGradient(x0, y0, x0 + w * 0.8, y0 + h);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.72, 'rgba(0,0,0,0)');
    sg.addColorStop(1, rgba(fb.line || '#2A2326', 0.14));
    ctx.fillStyle = sg; ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
    ctx.restore();
  }
  function paintFabric(i, ox, oy, s, deep) {
    var fb = fab(i), b = LV[i].bbox, x0 = ox + b[0] * s, y0 = oy + b[1] * s, w = (b[2] - b[0]) * s, h = (b[3] - b[1]) * s;
    ctx.fillStyle = fb.base; ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
    if (fb.mat === 'flat') { paintFlat(i, fb, ox, oy, s, x0, y0, w, h); return; }
    paintStoryGrad(fb, x0, y0, w, h);
    // gân len cổ áo là chi tiết vật thật nên giữ (ô lặp bám theo mảnh)
    if (fb.mat === 'rib') {
      var pat = fabricPattern(i);
      if (pat) { ctx.save(); ctx.translate(ox, oy); ctx.globalAlpha = 0.45; ctx.fillStyle = pat; ctx.fillRect(x0 - ox - 4, y0 - oy - 4, w + 8, h + 8); ctx.restore(); }
    }
    if (fb.detail === 'waffle') {
      // ô bánh quế hai lớp sáng-tối tạo độ nổi giòn
      var gq = Math.max(8, s * 0.085);
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (var d = -h; d < w + h; d += gq) {
          var o = pass ? 0 : 1.5;
          ctx.moveTo(x0 + d, y0 + h + o); ctx.lineTo(x0 + d + h, y0 + o);
          ctx.moveTo(x0 + d, y0 + o); ctx.lineTo(x0 + d + h, y0 + h + o);
        }
        ctx.lineWidth = pass ? Math.max(1.1, s * 0.0055) : Math.max(1.3, s * 0.0068);
        ctx.strokeStyle = pass ? 'rgba(255,246,225,0.28)' : rgba(mix(fb.dark, '#6E3F0E', 0.25), 0.36);
        ctx.stroke();
      }
    }
    paintInnerEdge(i, fb, ox, oy, s, x0, y0, w, h);
  }
  function paintFlat(i, fb, ox, oy, s, x0, y0, w, h) {
    paintStoryGrad(fb, x0, y0, w, h);
    paintInnerEdge(i, fb, ox, oy, s, x0, y0, w, h);
    // Bóng sương căng mọng nhẹ nhàng kiểu storybook-cartoon thay cho vệt trắng gắt
    ctx.save();
    ctx.translate(x0 + w * 0.24, y0 + h * 0.34); ctx.rotate(-0.35);
    ctx.beginPath(); ctx.ellipse(0, 0, Math.max(2, w * 0.042), Math.max(5, h * 0.105), 0, 0, 7);
    ctx.fillStyle = 'rgba(255,245,245,0.34)'; ctx.fill();
    ctx.restore();
  }
  function paintPattern(i, ox, oy, s, deep) {
    if (LV[i].def.fabric) { paintFabric(i, ox, oy, s, deep); return; }
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
      } else if (p.kind === 'steam') {
        ctx.beginPath(); ctx.arc(0, 0, p.r * (1 + p.age * 1.2), 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
      } else if (p.kind === 'button') {
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fillStyle = p.c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.fillStyle = C.ink; for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc((q % 2 ? 1 : -1) * p.r * 0.3, (q < 2 ? -1 : 1) * p.r * 0.3, p.r * 0.13, 0, 7); ctx.fill(); }
      } else {
        ctx.beginPath(); ctx.moveTo(-p.r * 1.4, 0); ctx.quadraticCurveTo(0, -p.r, p.r * 1.4, 0); ctx.lineWidth = 2.2; ctx.strokeStyle = p.c; ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawTargetPins(intro) {
    var lv = LV[S.li];
    if (!lv || !lv.def || !lv.def.sol) return;
    var sol = lv.def.sol, n = sol.length;
    var pinSt = checkPins(lv.def, S.pos);
    var draggingNode = (S.drag !== null);
    var clk = now();
    var fo = foldOf(), isY = foldY();

    // Phát hiện người chơi không thao tác một khoảng thời gian (> 2.8s) để gợi ý các ô chốt còn trống
    var idleTime = clk - (S.lastAction || 0);
    var isIdle = (idleTime > 2.8) && (S.phase === 'play') && !draggingNode && !S.edgeDrag && !S.needle && !pinSt.allFilled;
    var idleAge = isIdle ? (idleTime - 2.8) : 0;

    for (var j = 0; j < n; j++) {
      var p = sol[j];
      var px = X(p[0]), py = Y(p[1]);
      var isFilled = pinSt.pinFilled[j];

      // 1. KHI ĐANG KÉO NODE: Sóng tỏa dẫn đường bám theo thao tác
      if (draggingNode && !isFilled) {
        var phase = ((clk * 1.8 + j * 0.16) % 1.0);
        var r1 = 8.5 + 24 * phase;
        var a1 = (1 - phase) * 0.78 * intro;
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, r1, 0, Math.PI * 2);
        ctx.lineWidth = 3.6; ctx.strokeStyle = rgba('#6B5B53', a1 * 0.16); ctx.stroke();
        ctx.lineWidth = 2.0; ctx.strokeStyle = rgba('#FFE7A8', a1); ctx.stroke();

        if (phase > 0.38) {
          var p2 = (phase - 0.38) / 0.62;
          var r2 = 8.5 + 24 * p2;
          var a2 = (1 - p2) * 0.5 * intro;
          ctx.beginPath(); ctx.arc(px, py, r2, 0, Math.PI * 2);
          ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.cream, a2); ctx.stroke();
        }

        var haloPulse = 0.5 + 0.5 * Math.sin(clk * 7.5 + j);
        ctx.beginPath(); ctx.arc(px, py, 10.5 + 3.0 * haloPulse, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#E8B868', (0.28 + 0.18 * haloPulse) * intro);
        ctx.fill();
        ctx.restore();
      }

      // 2. KHI KHÔNG THAO TÁC MỘT KHOẢNG THỜI GIAN (> 2.8s): Sóng xung phát sáng gợi ý chốt còn trống
      if (isIdle && !isFilled) {
        var idlePhase = ((idleAge * 0.85 + j * 0.18) % 1.4) / 1.4;
        var ir1 = 8.5 + 26 * idlePhase;
        var ia1 = (1 - idlePhase) * 0.82 * intro;
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, ir1, 0, Math.PI * 2);
        ctx.lineWidth = 3.6; ctx.strokeStyle = rgba('#6B5B53', ia1 * 0.16); ctx.stroke();
        ctx.lineWidth = 2.2; ctx.strokeStyle = rgba('#FFD269', ia1); ctx.stroke();

        if (idlePhase > 0.35) {
          var ip2 = (idlePhase - 0.35) / 0.65;
          var ir2 = 8.5 + 26 * ip2;
          var ia2 = (1 - ip2) * 0.55 * intro;
          ctx.beginPath(); ctx.arc(px, py, ir2, 0, Math.PI * 2);
          ctx.lineWidth = 1.6; ctx.strokeStyle = rgba('#FFF8E8', ia2); ctx.stroke();
        }

        // Quầng thở nhịp nhàng tại tâm chốt để thu hút ánh nhìn
        var breath = 0.5 + 0.5 * Math.sin(idleAge * 4.5 + j * 0.7);
        ctx.beginPath(); ctx.arc(px, py, 11.0 + 3.5 * breath, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#D89838', (0.32 + 0.22 * breath) * intro);
        ctx.fill();
        ctx.restore();
      }

      // 3. TẠO HÌNH CHỐT THÊU DẤU × VÀNG BƠ MẬT ONG (WARM HONEY BUTTER CROSS-STITCH MARKER):
      // Đổi hoàn toàn từ lỗ đục tối sang Mũi thêu chữ thập đánh dấu (dấu ×) may đo trên đệm vải len kem bơ ngọt ngào.
      // - Vành thêu ngoài: Vàng bơ mật ong #DFB15B với viền chỉ dệt #A87A2C.
      // - Vòng đệm trong: Màu vàng kem bơ mềm #FFF2CF sáng sạch, nổi bật ngọt ngào trên nền vải hồng phấn.
      // - Mũi thêu dấu ×: Nâu hổ phách mật ong nhạt #C88E3E đan chéo thanh lịch, hoàn toàn không có sắc xám hay đen.
      ctx.save();
      if (!isFilled) {
        // --- CHỐT CHƯA LẤP: Đệm khuy bơ kem & Mũi thêu dấu × ---
        // Vòng đệm tròn bằng vải kem bơ sáng (Butter Cream Felt Pad)
        ctx.beginPath(); ctx.arc(px, py, 8.8, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#FFF2CF', 0.96 * intro); ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rgba('#DFB15B', 0.98 * intro);
        ctx.stroke();

        // Viền may chỉ dệt mảnh bên ngoài (Woven Stitch Rim #A87A2C)
        ctx.beginPath(); ctx.arc(px, py, 10.2, 0, Math.PI * 2);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = rgba('#A87A2C', 0.55 * intro);
        ctx.stroke();

        // Mũi thêu chữ thập dấu × (Cross-Stitch Marker #C88E3E)
        var arm = 4.6; // Bán kính tay chữ thập
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Bóng đổ nhẹ cho mũi chỉ nổi khối 3D trên đệm bơ
        ctx.beginPath();
        ctx.moveTo(px - arm, py - arm + 0.6); ctx.lineTo(px + arm, py + arm + 0.6);
        ctx.moveTo(px - arm, py + arm + 0.6); ctx.lineTo(px + arm, py - arm + 0.6);
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = rgba('#A87A2C', 0.35 * intro);
        ctx.stroke();

        // Nét chỉ thêu chính: Nâu hổ phách mật ong nhạt #C88E3E
        ctx.beginPath();
        ctx.moveTo(px - arm, py - arm); ctx.lineTo(px + arm, py + arm);
        ctx.moveTo(px - arm, py + arm); ctx.lineTo(px + arm, py - arm);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = rgba('#C88E3E', 0.98 * intro);
        ctx.stroke();

        // Nét chỉ thêu highlight: Vàng bơ mật ong #DFB15B lấp lánh ở lõi sợi chỉ
        ctx.beginPath();
        ctx.moveTo(px - arm * 0.6, py - arm * 0.6); ctx.lineTo(px + arm * 0.6, py + arm * 0.6);
        ctx.moveTo(px - arm * 0.6, py + arm * 0.6); ctx.lineTo(px + arm * 0.6, py - arm * 0.6);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = rgba('#FFF8E8', 0.85 * intro);
        ctx.stroke();

        // Hạt thêu con bọ French knot tại tâm giao thoa của dấu ×
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#DFB15B', 0.98 * intro); ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = rgba('#A87A2C', 0.85 * intro); ctx.stroke();
      } else {
        // --- CHỐT ĐÃ LẤP ĐẦY ---
        // Vòng đệm khuy ôm khít chân ghim tròn với sắc xanh xô thơm hòa nhã
        ctx.beginPath(); ctx.arc(px, py, 8.6, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#FFF8EC', 0.75 * intro); ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rgba(C.sageDeep, 0.88 * intro);
        ctx.stroke();

        // Mũi chữ thập thu nhỏ nhẹ nhàng bên dưới node
        var armF = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px - armF, py - armF); ctx.lineTo(px + armF, py + armF);
        ctx.moveTo(px - armF, py + armF); ctx.lineTo(px + armF, py - armF);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = rgba(C.sageDeep, 0.65 * intro);
        ctx.stroke();
      }
      ctx.restore();

      // Ở màn vải gấp đôi: vẽ bóng mờ của dấu × phản chiếu sang nửa đối xứng
      if (fo && !onFold(j)) {
        var mpx = isY ? px : X(2 * S.foldX - p[0]);
        var mpy = isY ? Y(2 * S.foldX - p[1]) : py;
        ctx.save();
        ctx.beginPath(); ctx.arc(mpx, mpy, 7.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#FFF2CF', 0.35 * intro); ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = rgba('#DFB15B', 0.45 * intro); ctx.stroke();
        var marm = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mpx - marm, mpy - marm); ctx.lineTo(mpx + marm, mpy + marm);
        ctx.moveTo(mpx - marm, mpy + marm); ctx.lineTo(mpx + marm, mpy - marm);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = rgba('#C88E3E', 0.45 * intro);
        ctx.stroke();
        ctx.restore();
      }
    }
  }


    // HỆ THỐNG GỢI Ý THỊ GIÁC ĐA TẦNG CHO ĐƯỜNG CHỈ CONG (ENHANCED CURVE HINT SYSTEM)
  // Kết hợp 3 tầng phân cấp hoàn chỉnh:
  // - Tầng 1 (Nhận diện): Vầng hào quang tơ tằm óng ánh (Silk Sheen Halo) bao bọc quanh sợi chỉ thẳng chưa uốn.
  // - Tầng 2 (Điểm chạm): Nút bọ thêu cúc len (Embroidered Pinch Bead) tại trung điểm sợi dây tạo điểm bấu víu (Affordance).
  // - Tầng 3 (Hành động): Sóng vòng cung dập dờn (Directional Stitch Ripples) trôi từ thân dây ra viền mẫu chỉ rõ hướng kéo.
  // - Tầng nền: Vùng khuyết trăng khuyết phát sáng thở màu kem bơ mềm #FFF2CF.
  var gapCurBuf = [], gapSolBuf = [];
  function getEdgePt(poly, s, steps) {
    if (!poly || poly.length < 4) return [0, 0];
    if (poly.length <= 4) {
      var t = s / steps;
      return [
        poly[0] + (poly[2] - poly[0]) * t,
        poly[1] + (poly[3] - poly[1]) * t
      ];
    }
    var idx = Math.min(s * 2, poly.length - 2);
    return [poly[idx], poly[idx + 1]];
  }

  function drawBreathingCrescentGaps(intro) {
    var lv = LV[S.li];
    if (!lv || !lv.def) return;
    var def = lv.def;
    if (S.iouV >= S.thr) return;
    if (S.phase !== 'play' && S.phase !== 'verify') return;
    // Chỉ gợi ý sau khi người chơi đã thả tay cắm chốt cuối hoàn toàn (không còn drag hay settle node)
    if (S.drag !== null || S.settle !== null) return;

    var clk = now();
    var releaseAge = clk - (S.lastPinReleaseT || 0);
    if (releaseAge < 0.25) return;
    var fadeIn = clamp((releaseAge - 0.25) / 0.4, 0, 1);

    var idleTime = clk - (S.lastAction || 0);
    var isIdle = (idleTime > 1.8);

    var list = hintEdges();
    for (var bi = 0; bi < list.length; bi++) {
      var k = list[bi].k;
      var ra = def.ring[k], rb = def.ring[(k + 1) % def.ring.length];
      var pCur = GN.edgePoly(def, S.pos, ra, rb, 24, gapCurBuf, S.bend);
      // viền đích vẽ giữa chính hai đầu dây, ở độ uốn đích theo chốt
      var pSol = GN.edgePoly(def, S.pos, ra, rb, 24, gapSolBuf, bendsAt(k, list[bi].h));
      if (!pCur || pCur.length < 4 || !pSol || pSol.length < 4) continue;

      var breath = 0.5 + 0.5 * Math.sin(clk * 3.2 + bi * 0.8);
      var depth = isIdle ? 1.0 : 0.85;
      var aFill = (0.28 + 0.22 * breath * depth) * intro * fadeIn;

      ctx.save();
      ctx.globalAlpha = list[bi].emph;

      // 1. TẦNG NỀN: Mảng khuyết hình trăng khuyết khép kín giữa sợi dây và viền mẫu
      ctx.beginPath();
      var p0 = getEdgePt(pCur, 0, 24);
      ctx.moveTo(X(p0[0]), Y(p0[1]));
      for (var ci = 1; ci <= 24; ci++) {
        var ptC = getEdgePt(pCur, ci, 24);
        ctx.lineTo(X(ptC[0]), Y(ptC[1]));
      }
      for (var si = 24; si >= 0; si--) {
        var ptS = getEdgePt(pSol, si, 24);
        ctx.lineTo(X(ptS[0]), Y(ptS[1]));
      }
      ctx.closePath();
      // Tô mảng khuyết màu kem bơ mềm ấm áp
      ctx.fillStyle = rgba('#FFF2CF', aFill);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba('#DFB15B', (0.38 + 0.24 * breath) * intro);
      ctx.stroke();

      // 2. TẦNG 1: VẦNG HÀO QUANG TƠ TẰM ÓNG ÁNH (SILK SHEEN HALO) BAO QUANH ĐOẠN CHỈ
      // Bao bọc lấy sợi chỉ thẳng, tỏa sáng màu vàng bơ mật để mắt người chơi nhận ra ngay lập tức
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      var hp0 = getEdgePt(pCur, 0, 24);
      ctx.moveTo(X(hp0[0]), Y(hp0[1]));
      for (var hi = 1; hi <= 24; hi++) {
        var hp = getEdgePt(pCur, hi, 24);
        ctx.lineTo(X(hp[0]), Y(hp[1]));
      }
      // Hào quang ngoài mềm mại
      ctx.lineWidth = 12.0;
      ctx.strokeStyle = rgba('#FFD269', (0.26 + 0.18 * breath * depth) * intro * fadeIn);
      ctx.stroke();
      // Hào quang trong tơ tằm óng ả
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = rgba('#FFF8E8', (0.44 + 0.28 * breath * depth) * intro * fadeIn);
      ctx.stroke();
      ctx.restore();

      // 3. TẦNG 3: SÓNG VÒNG CUNG DẬP DỜN DẪN ĐƯỜNG (DIRECTIONAL STITCH RIPPLES)
      // Từng đợt sóng vòng cung nét đứt màu vàng bơ trôi nhẹ từ thân dây ra viền mẫu
      var isEdgeBeingDragged = (S.edgeDrag && S.edgeDrag.k === k);
      if (!isEdgeBeingDragged && !S.drag) {
        var wTime = clk * 0.95 + bi * 0.35;
        for (var waveIdx = 0; waveIdx < 2; waveIdx++) {
          var uWave = (wTime + waveIdx * 0.5) % 1.0;
          if (uWave > 0.05 && uWave < 0.95) {
            var aRip = Math.sin(Math.PI * uWave) * (0.68 + 0.22 * depth) * intro * fadeIn;
            ctx.save();
            ctx.beginPath();
            var r0c = getEdgePt(pCur, 0, 24), r0s = getEdgePt(pSol, 0, 24);
            var r0x = (1 - uWave) * r0c[0] + uWave * r0s[0];
            var r0y = (1 - uWave) * r0c[1] + uWave * r0s[1];
            ctx.moveTo(X(r0x), Y(r0y));
            for (var ri = 1; ri <= 24; ri++) {
              var rci = getEdgePt(pCur, ri, 24), rsi = getEdgePt(pSol, ri, 24);
              var rx = (1 - uWave) * rci[0] + uWave * rsi[0];
              var ry = (1 - uWave) * rci[1] + uWave * rsi[1];
              ctx.lineTo(X(rx), Y(ry));
            }
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 2.0;
            ctx.strokeStyle = rgba('#FFD269', aRip);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
      }

      // 4. Viền thêu chỉ dệt phát sáng dọc theo cung viền mẫu pSol
      ctx.beginPath();
      var sp0 = getEdgePt(pSol, 0, 24);
      ctx.moveTo(X(sp0[0]), Y(sp0[1]));
      for (var sj = 1; sj <= 24; sj++) {
        var spj = getEdgePt(pSol, sj, 24);
        ctx.lineTo(X(spj[0]), Y(spj[1]));
      }
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = rgba('#DFB15B', (0.58 + 0.35 * breath) * intro * fadeIn);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }
  }

  // TẦNG 2: NÚT BỌ THÊU CÚC LEN (EMBROIDERED PINCH BEAD HANDLE)
  // Vẽ trên mặt sợi dây để người chơi có điểm chạm xúc giác (Affordance) rõ ràng
  function drawPinchBeads(intro) {
    var lv = LV[S.li];
    if (!lv || !lv.def) return;
    var def = lv.def;
    if (S.iouV >= S.thr) return;
    if (S.phase !== 'play' && S.phase !== 'verify') return;
    // Chỉ gợi ý sau khi người chơi đã thả tay cắm chốt cuối hoàn toàn (không còn drag hay settle node)
    if (S.drag !== null || S.settle !== null) return;

    var clk = now();
    var releaseAge = clk - (S.lastPinReleaseT || 0);
    if (releaseAge < 0.25) return;
    var fadeIn = clamp((releaseAge - 0.25) / 0.4, 0, 1);

    var idleTime = clk - (S.lastAction || 0);
    var isIdle = (idleTime > 1.8);

    var list = hintEdges();
    for (var bi = 0; bi < list.length; bi++) {
      var k = list[bi].k;
      var ra = def.ring[k], rb = def.ring[(k + 1) % def.ring.length];
      var pCur = GN.edgePoly(def, S.pos, ra, rb, 24, gapCurBuf, S.bend);
      if (!pCur || pCur.length < 4) continue;

      var midPt = getEdgePt(pCur, 12, 24);
      var bx = X(midPt[0]), by = Y(midPt[1]);
      var breath = 0.5 + 0.5 * Math.sin(clk * 3.5 + bi * 0.9);
      var r = (5.2 + 0.8 * breath) * (0.4 + 0.6 * fadeIn);

      ctx.save();
      ctx.globalAlpha = list[bi].emph;
      // Quầng thở phát sáng nhẹ quanh cúc len
      ctx.beginPath(); ctx.arc(bx, by, r + 4.5 * breath, 0, Math.PI * 2);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba('#FFD269', (0.45 * breath) * intro);
      ctx.stroke();

      // Đĩa đệm khuy bơ kem tròn (Butter Felt Cushion)
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#FFF2CF', 0.98 * intro); ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba('#DFB15B', 0.98 * intro);
      ctx.stroke();

      // Viền chỉ may dệt mảnh (#A87A2C)
      ctx.beginPath(); ctx.arc(bx, by, r + 0.9, 0, Math.PI * 2);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = rgba('#A87A2C', 0.65 * intro);
      ctx.stroke();

      // Hai mắt khuy chỉ thêu mini đan qua tâm
      var off = 1.5;
      ctx.beginPath();
      ctx.arc(bx - off, by, 0.9, 0, Math.PI * 2);
      ctx.arc(bx + off, by, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#4A3B35', 0.85 * intro); ctx.fill();

      // Hạt chỉ thêu highlight sáng ở tâm
      ctx.beginPath(); ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#FFF8E8', 0.95 * intro); ctx.fill();

      ctx.restore();
    }
  }

  /* ---------- màn chơi: vẽ ---------- */
  function drawPlay() {
    var lv = LV[S.li], ph = S.phase, t = S.t;
    ctx.save();
    var cam = S.cam;
    if (cam && (cam.scale !== 1 || cam.x !== 0 || cam.y !== 0)) {
      ctx.translate(FCX + cam.x, FCY + cam.y);
      ctx.scale(cam.scale, cam.scale);
      ctx.translate(-FCX, -FCY);
    }
    drawFabric();
    var intro = ph === 'intro' ? clamp(t / 0.5, 0, 1) : 1;
    var gone = ph === 'next' ? clamp(1 - t / 0.4, 0, 1) : 1;
    if (ph === 'intro' || ph === 'play' || ph === 'verify' || ph === 'snap') {
      drawGhost(lv, intro);
      drawSwayedFill(Math.min(1, MASK_A + (ph === 'verify' || ph === 'snap' ? 0.1 : 0)) * intro);
      outlinePath(lv.outline, FX, FY, FS); ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.thread, 0.9 * intro); ctx.stroke(); ctx.setLineDash([]);
      drawTargetPins(intro);
      drawBreathingCrescentGaps(intro);
      var snapK = ph === 'snap' ? clamp(t / S.snapT, 0, 1) : 0;
      var na = ph === 'verify' ? 0.35 : 1 - 0.65 * snapK;
      drawEdges(na * intro);
      drawReadyContourGlow(intro);
      drawSeamZips(intro);
      drawPinchBeads(intro);
      var nsz = 1 - (1 - CUT_NODE_SIZE) * snapK;
      if (foldOf()) {
        ctx.save();
        if (foldY()) { var ym0 = Y(S.foldX); ctx.translate(0, 2 * ym0); ctx.scale(1, -1); }
        else { var xm0 = X(S.foldX); ctx.translate(2 * xm0, 0); ctx.scale(-1, 1); }
        drawBreathingCrescentGaps(intro);
        drawEdges(na * intro);
        drawReadyContourGlow(intro);
        drawPinchBeads(intro);
        for (var mj = 0; mj < S.pos.length; mj++) if (!onFold(mj)) drawNode(mj, na, nsz);
        ctx.restore();
      }
      drawFoldVeil(intro);
      if (ph !== 'snap') drawStartCue();
      for (var i = 0; i < S.pos.length; i++) drawNode(i, ph === 'verify' && S.lit[i] ? 1 : na, nsz);
      drawHint();
      if (S.path && ph !== 'snap') drawRunner(S.path, S.runDist, 17);
      drawWire();
    } else if (ph === 'cut') {
      drawGhost(lv, 0.6);
      var L = cutLen(lv) * clamp(t / cutDur(lv), 0, 1), pts = lv.solPath.pts, cum = lv.solPath.cum;
      outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = 'rgba(255,252,246,0.5)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X(pts[0]), Y(pts[1]));
      var brk = lv.solPath.brk || [];
      for (var k = 1; k < cum.length && cum[k] <= L; k++) { if (brk.indexOf(k) >= 0) ctx.moveTo(X(pts[k * 2]), Y(pts[k * 2 + 1])); else ctx.lineTo(X(pts[k * 2]), Y(pts[k * 2 + 1])); }
      GN.pointAt(lv.solPath, L, tmpA); ctx.lineTo(X(tmpA[0]), Y(tmpA[1]));
      ctx.lineWidth = 3.2; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      if (lv.def.fold) {
        // lớp vải dưới: đường cắt và cây kéo soi gương qua mép gấp, vẽ trước lớp mờ nên nhạt hơn kéo chính
        ctx.save();
        if (foldY()) { var ym = Y(S.foldX); ctx.translate(0, 2 * ym); ctx.scale(1, -1); }
        else { var xm = X(S.foldX); ctx.translate(2 * xm, 0); ctx.scale(-1, 1); }
        ctx.stroke(); drawRunner(lv.solPath, L, 20, true);
        for (var mc = 0; mc < S.pos.length; mc++) if (!onFold(mc)) drawNode(mc, S.cutHit[mc] !== undefined ? 1 : 0.35, CUT_NODE_SIZE);
        ctx.restore();
      }
      drawFoldVeil(1);
      for (var ci = 0; ci < S.pos.length; ci++) drawNode(ci, S.cutHit[ci] !== undefined ? 1 : 0.35, CUT_NODE_SIZE);
      drawRunner(lv.solPath, L, 20, true);
    } else if (ph === 'unfold') {
      var uu = easeInOut(clamp(t / UNFOLD_T, 0, 1)), sx = -Math.cos(Math.PI * uu), lift0 = 0, ucx = X(lv.cen[0]), ucy = Y(lv.cen[1]), uk = 1 + 0.04 * uu;
      if (foldY()) {
        // Lật bung theo đường gấp ngang: nửa trên nằm yên, nửa dưới lật từ trên xuống quanh trục ngang yf
        var yf = Y(S.foldX);
        ctx.save(); ctx.beginPath(); ctx.rect(FX, FY, FS, yf - FY); ctx.clip();
        outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = C.hole; ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = uu; ctx.beginPath(); ctx.rect(FX, yf, FS, FY + FS - yf); ctx.clip();
        outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = C.hole; ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = uu; outlinePath(lv.outline, FX, FY, FS); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        ctx.save(); ctx.translate(ucx, ucy - 12 * uu); ctx.scale(uk, uk); ctx.translate(-ucx, -ucy);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, yf); ctx.clip();
        drawPiece(S.li, FX, FY - lift0, FS, 0, true, 0, 0); ctx.restore();
        ctx.save(); ctx.translate(0, yf); ctx.scale(1, Math.abs(sx) < 0.02 ? 0.02 * (sx < 0 ? -1 : 1) : sx); ctx.translate(0, -yf);
        ctx.beginPath(); ctx.rect(0, yf, W, H); ctx.clip();
        drawPiece(S.li, FX, FY - lift0 - 10 * Math.sin(Math.PI * uu), FS, 0, true, 0, 0);
        if (sx < 0.3) { outlinePath(lv.outline, FX, FY - lift0 - 10 * Math.sin(Math.PI * uu), FS); ctx.fillStyle = rgba(C.ink, 0.12 * (0.3 - sx) / 1.3); ctx.fill(); }
        ctx.restore();
        ctx.restore();
      } else {
        // Lật bung: nửa trái nằm yên, nửa phải xoay quanh mép gấp từ úp trên nửa trái (scale -1) ra mở hẳn (scale 1).
        var xf = X(S.foldX);
        ctx.save(); ctx.beginPath(); ctx.rect(FX, FY, xf - FX, FS); ctx.clip();
        outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = C.hole; ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = uu; ctx.beginPath(); ctx.rect(xf, FY, FX + FS - xf, FS); ctx.clip();
        outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = C.hole; ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = uu; outlinePath(lv.outline, FX, FY, FS); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        ctx.save(); ctx.translate(ucx, ucy - 12 * uu); ctx.scale(uk, uk); ctx.translate(-ucx, -ucy);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, xf, H); ctx.clip();
        drawPiece(S.li, FX, FY - lift0, FS, 0, true, 0, 0); ctx.restore();
        ctx.save(); ctx.translate(xf, 0); ctx.scale(Math.abs(sx) < 0.02 ? 0.02 * (sx < 0 ? -1 : 1) : sx, 1); ctx.translate(-xf, 0);
        ctx.beginPath(); ctx.rect(xf, 0, W, H); ctx.clip();
        drawPiece(S.li, FX, FY - lift0 - 10 * Math.sin(Math.PI * uu), FS, 0, true, 0, 0);
        // mặt trái của vải khi còn úp: tối hơn một chút, sáng dần khi lật ra
        if (sx < 0.3) { outlinePath(lv.outline, FX, FY - lift0 - 10 * Math.sin(Math.PI * uu), FS); ctx.fillStyle = rgba(C.ink, 0.12 * (0.3 - sx) / 1.3); ctx.fill(); }
        ctx.restore();
        ctx.restore();
      }
      // không vẽ node khi lật bung: giống chuỗi thắng màn thường, node biến mất khi cắt xong để chỉ còn miếng vải
    } else {
      ctx.save(); ctx.globalAlpha = gone;
      outlinePath(lv.outline, FX, FY, FS); ctx.fillStyle = C.hole; ctx.fill();
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      if (ph === 'lift' || ph === 'fill') {
        var lift = ph === 'lift' ? easeBack(t / 0.45) : 1;
        var sc = 1 + 0.04 * lift, cx = X(lv.cen[0]), cy = Y(lv.cen[1]) - 12 * lift;
        var fill = ph === 'fill' ? easeInOut(t / 0.75) : 0;
        var sway = reduce ? 0 : Math.sin(clock * 4.5) * 0.022 * lift;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(sway);
        drawPiece(S.li, -lv.cen[0] * FS * sc, -lv.cen[1] * FS * sc, FS * sc, fill, true, ph === 'fill' ? clamp((t - 0.7) / 0.3, 0, 1) : 0, 0);
        ctx.restore();
      } else if (ph === 'fly') {
        var u = easeInOut(t / 0.65), sr = slotRect(product().levels.indexOf(S.li)), tf = fitTf(lv, sr[0] + sr[2] / 2, sr[1] + sr[3] / 2, Math.round(sr[2] * 34 / 46));
        var s0 = FS * 1.04, ox0 = X(lv.cen[0]) - lv.cen[0] * s0, oy0 = Y(lv.cen[1]) - 12 - lv.cen[1] * s0;
        drawPiece(S.li, lerp(ox0, tf.ox, u), lerp(oy0, tf.oy, u) - 70 * Math.sin(Math.PI * u), lerp(s0, tf.s, u), 1, u < 0.8, 1 - u, 0);
      }
    }
    ctx.restore();
  }

  /* ---------- màn thưởng: ghép các mảnh thành sản phẩm ---------- */
  var RS = 250, R = null, BASE_CX = 195, BASE_CY = 395, BASE_FIT_R = 150;
  // Canh chỉnh đồng nhất toàn bộ hình hoàn thiện khớp khít vào mảnh vải nền tròn nếu vượt quá vòng chỉ khâu,
  // giữ nguyên tỉ lệ tương đối giữa các mảnh để không làm lệch khớp nối (như áo lót và cổ áo ở Màn 3).
  function fitProductPlaces(p) {
    var out = {};
    p.levels.forEach(function (li) {
      var pl = p.place[li];
      out[li] = { ox: pl[0], oy: pl[1], s: pl[2] || RS };
    });
    var minX = 999, maxX = -999, minY = 999, maxY = -999, maxR = 0;
    p.levels.forEach(function (li) {
      var tf = out[li], pts = LV[li].outline;
      (pts.loops || [pts]).forEach(function (lp) {
        for (var i = 0; i < lp.length; i += 2) {
          var x = tf.ox + lp[i] * tf.s, y = tf.oy + lp[i + 1] * tf.s;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          var r = Math.hypot(x - BASE_CX, y - BASE_CY);
          if (r > maxR) maxR = r;
        }
      });
    });
    if (maxR > BASE_FIT_R + 1) {
      var pcx = (minX + maxX) / 2, pcy = (minY + maxY) / 2, rFromCen = 0;
      p.levels.forEach(function (li) {
        var tf = out[li], pts = LV[li].outline;
        (pts.loops || [pts]).forEach(function (lp) {
          for (var i = 0; i < lp.length; i += 2) {
            var x = tf.ox + lp[i] * tf.s, y = tf.oy + lp[i + 1] * tf.s;
            var rc = Math.hypot(x - pcx, y - pcy);
            if (rc > rFromCen) rFromCen = rc;
          }
        });
      });
      var sc = BASE_FIT_R / Math.max(1, rFromCen);
      p.levels.forEach(function (li) {
        var tf = out[li];
        tf.ox = BASE_CX + (tf.ox - pcx) * sc;
        tf.oy = BASE_CY + (tf.oy - pcy) * sc;
        tf.s *= sc;
      });
    }
    return out;
  }
  function placeOf(li) {
    if (R && R.places && R.places[li]) return R.places[li];
    var pl = product().place[li];
    return { ox: pl[0], oy: pl[1], s: pl[2] || RS };
  }
  function ptOf(li, x, y) { var t = placeOf(li); return [t.ox + x * t.s, t.oy + y * t.s]; }
  function backToFront() { return product().order; }
  var HOMES = { 1: [[195, 704]], 2: [[118, 704], [292, 704]], 3: [[78, 704], [195, 704], [312, 704]], 4: [[72, 704], [154, 704], [234, 704], [314, 704]] };
  // v3: chia các đường may thành từng mũi khâu rời để mỗi mũi hiện ra phát đúng một nốt nhạc ngũ cung đi lên,
  // và mũi cuối có pha rút chỉ (đường may co lại, vải hơi nhăn rồi phẳng ra).
  function buildStitches(seams) {
    var lens = [], total = 0;
    seams.forEach(function (sm) {
      var L = 0; for (var i = 1; i < sm.length; i++) L += Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]);
      lens.push(L); total += L;
    });
    var step = clamp(total / 15, 13, 21), out = [];
    seams.forEach(function (sm, si) {
      var L = lens[si], m = Math.max(3, Math.round(L / step)), cum = [0];
      for (var i = 1; i < sm.length; i++) cum[i] = cum[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]);
      function ptAt(d) {
        for (var j = 1; j < cum.length; j++) if (cum[j] >= d || j === cum.length - 1) {
          var seg = Math.max(1e-6, cum[j] - cum[j - 1]), u = clamp((d - cum[j - 1]) / seg, 0, 1);
          return [lerp(sm[j - 1][0], sm[j][0], u), lerp(sm[j - 1][1], sm[j][1], u)];
        }
        return sm[0].slice();
      }
      var span = L / m;
      for (var k = 0; k < m; k++) {
        var c = (k + 0.5) * span, h = span * 0.34, a = ptAt(Math.max(0, c - h)), b = ptAt(Math.min(L, c + h));
        var mx = (a[0] + b[0]) * 0.5, my = (a[1] + b[1]) * 0.5, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        out.push({ a: a, b: b, m: [mx, my], ang: ang, nx: -Math.sin(ang), ny: Math.cos(ang), si: si });
      }
    });
    return out;
  }
  /* ---------- khâu đắp mảnh lên vải nền (đã duyệt 2026-11-09, làm 2026-11-10) ---------- */
  // Kim chạy dọc mép từng mảnh (mảnh dưới trước), mũi khâu cách mép vào trong đều một khoảng, tính bằng cách dời đường
  // viền vào trong theo pháp tuyến (không thu nhỏ quanh tâm, cách cũ lệch ra ngoài ở tay áo, tai thỏ, lỗ tim).
  // 2026-11-11: mũi khâu nổi trông xấu nên chỉ còn sợi cực mảnh cùng màu với mảnh (gần như ẩn); 'none' bỏ hẳn mũi khâu để so.
  // 2026-11-11: mặc định là rãnh chần chìm cùng màu vải kèm mép phồng (quilt); giữ mũi chạy và "không khâu" để so.
  var STITCH_KINDS = ['quilt', 'running', 'none'], STITCH_NAMES = { quilt: 'Rãnh chìm', blanket: 'Viền chăn', running: 'Mũi chạy', whip: 'Quấn mép', none: 'Không khâu' };
  var STITCH_KIND = 'quilt';
  try { var savedKind = localStorage.getItem('gn-stitch3'); if (STITCH_KINDS.indexOf(savedKind) >= 0) STITCH_KIND = savedKind; } catch (e) {}
  // khoảng dời vào trong theo khung của mảnh, khoảng cách mũi (pt trên màn hình), thời lượng cả lượt khâu (giá trị tạm)
  var APPLIQUE_INSET = 0.03, APPLIQUE_STEP = 8, APPLIQUE_T = 2.2;
  (function () {
    var btn = document.getElementById('stitchBtn');
    if (!btn || typeof btn.addEventListener !== 'function') return;
    function label() { btn.textContent = 'Mũi khâu: ' + STITCH_NAMES[STITCH_KIND]; }
    label();
    btn.addEventListener('click', function () {
      STITCH_KIND = STITCH_KINDS[(STITCH_KINDS.indexOf(STITCH_KIND) + 1) % STITCH_KINDS.length];
      try { localStorage.setItem('gn-stitch3', STITCH_KIND); } catch (e) {}
      label();
    });
  })();
  function pointInLoop(lp, x, y) {
    var inside = false, n = lp.length / 2;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = lp[i * 2], yi = lp[i * 2 + 1], xj = lp[j * 2], yj = lp[j * 2 + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  var insetCache = {};
  function insideLoops(loops, x, y) { var c = 0; for (var q = 0; q < loops.length; q++) if (pointInLoop(loops[q], x, y)) c++; return c % 2 === 1; }
  // Đường mũi khâu của mảnh i (toạ độ khung của mảnh): mỗi vòng viền dời vào trong một khoảng d theo pháp tuyến.
  // Chiều "vào trong" xét riêng từng điểm (thử dời một chút, ra ngoài mảnh thì đảo), vì vòng tự bắt chéo (lá số 8) đổi
  // chiều giữa hai thùy, và vòng lỗ ngược chiều vòng ngoài. Góc lõm kéo dài tối đa 1,6 lần để mũi không lùi quá sâu.
  function insetLoops(i) {
    if (insetCache[i]) return insetCache[i];
    var loops = LV[i].outline.loops || [LV[i].outline], d = APPLIQUE_INSET, out = [], side = 1;
    loops.forEach(function (raw) {
      // bỏ điểm trùng liền nhau (kể cả điểm cuối lặp lại điểm đầu), nếu không góc đó chỉ có pháp tuyến của một cạnh
      var lp = [];
      for (var t = 0; t < raw.length; t += 2) {
        var lx = lp.length ? lp[lp.length - 2] : null, ly = lp.length ? lp[lp.length - 1] : null;
        if (lx === null || Math.hypot(raw[t] - lx, raw[t + 1] - ly) > 1e-7) lp.push(raw[t], raw[t + 1]);
      }
      if (lp.length > 4 && Math.hypot(lp[0] - lp[lp.length - 2], lp[1] - lp[lp.length - 1]) < 1e-7) lp.length -= 2;
      var n = lp.length / 2, pts = [], nrm = [];
      for (var j = 0; j < n; j++) {
        var pj = (j + n - 1) % n, nj = (j + 1) % n;
        var ax = lp[j * 2] - lp[pj * 2], ay = lp[j * 2 + 1] - lp[pj * 2 + 1], al = Math.hypot(ax, ay);
        var bx = lp[nj * 2] - lp[j * 2], by = lp[nj * 2 + 1] - lp[j * 2 + 1], bl = Math.hypot(bx, by);
        if (al < 1e-9) { ax = bx; ay = by; al = bl; }
        if (bl < 1e-9) { bx = ax; by = ay; bl = al; }
        if (al < 1e-9) continue;
        var n1x = -ay / al * side, n1y = ax / al * side, n2x = -by / bl * side, n2y = bx / bl * side;
        var vx = n1x + n2x, vy = n1y + n2y, vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
        if (!insideLoops(loops, lp[j * 2] + vx * 0.006, lp[j * 2 + 1] + vy * 0.006)) { vx = -vx; vy = -vy; n1x = -n1x; n1y = -n1y; }
        var k = Math.min(1.6, 1 / Math.max(0.4, vx * n1x + vy * n1y));
        pts.push(lp[j * 2] + vx * d * k, lp[j * 2 + 1] + vy * d * k); nrm.push(vx, vy);
      }
      out.push({ pts: pts, nrm: nrm });
    });
    return (insetCache[i] = out);
  }
  // màu chỉ: tương phản nhẹ với từng mảnh (vải sáng dùng chỉ tối cùng họ màu, vải đậm dùng chỉ kem)
  function threadColor(fb) {
    var A = hex(fb.base), lum = (0.299 * A[0] + 0.587 * A[1] + 0.114 * A[2]) / 255;
    // chỉ cùng màu với mảnh: tông tối của chính mảnh, vải rất sáng thì đậm thêm một chút cho còn thấy
    return lum > 0.78 ? mix(fb.dark, C.ink, 0.12) : fb.dark;
  }
  // dựng mũi khâu cho mọi mảnh vải theo thứ tự vẽ (mảnh dưới trước), toạ độ màn hình
  function buildApplique() {
    R.stitches = []; R.seams = [];
    backToFront().forEach(function (li) {
      var fb = LV[li].def.fabric; if (!fb || fb.mat === 'flat') return; // tranh tô màu giữ viền đen, không khâu
      var tf = placeOf(li), dpx = APPLIQUE_INSET * tf.s, col = threadColor(fb);
      insetLoops(li).forEach(function (loop) {
        var n = loop.pts.length / 2, sp = [], cum = [0];
        for (var j = 0; j <= n; j++) { var q = j % n; sp.push([tf.ox + loop.pts[q * 2] * tf.s, tf.oy + loop.pts[q * 2 + 1] * tf.s, loop.nrm[q * 2], loop.nrm[q * 2 + 1]]); }
        for (j = 1; j < sp.length; j++) cum.push(cum[j - 1] + Math.hypot(sp[j][0] - sp[j - 1][0], sp[j][1] - sp[j - 1][1]));
        var L = cum[cum.length - 1], m = Math.max(8, Math.round(L / APPLIQUE_STEP)), seg = 1;
        function at(dist) {
          while (seg < cum.length - 1 && cum[seg] < dist) seg++;
          var a = sp[seg - 1], b = sp[seg], u = clamp((dist - cum[seg - 1]) / Math.max(1e-6, cum[seg] - cum[seg - 1]), 0, 1);
          return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), a[2], a[3]];
        }
        var pts = [];
        for (var k = 0; k <= m; k++) pts.push(at(L * k / m));
        R.seams.push([[pts[0][0], pts[0][1]], [pts[m][0], pts[m][1]]]);
        for (k = 0; k < m; k++) {
          var a = pts[k], b = pts[k + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          R.stitches.push({ li: li, a: [a[0], a[1]], b: [b[0], b[1]], m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang: ang, nx: a[2], ny: a[3], d: dpx, col: col });
        }
      });
    });
  }
  // vẽ mũi khâu của một mảnh (gọi ngay sau khi vẽ mảnh đó để mảnh phía trên che đúng mũi của mảnh phía dưới)
  // Rãnh chần chìm và mép phồng (2026-11-11): mọi nét lấy từ màu của chính mảnh nên chìm vào vải, chỉ còn sáng tối tạo khối.
  // Ánh sáng từ trên trái. Mép phồng: trong mảnh, dải sáng bám mép trên trái và dải tối bám mép dưới phải (vẽ nét viền dịch
  // chéo rồi cắt theo mảnh). Rãnh: nét tối làm đáy rãnh, nét sáng mảnh lệch xuống dưới phải là thành rãnh phía xa bắt sáng.
  // Theo tiến độ khâu: rãnh hiện tới đâu kim đi tới đó, mép phồng dần theo phần đã khâu của mảnh.
  function drawQuilt(li, count) {
    var fb = LV[li].def.fabric; if (!fb) return;
    var tf = placeOf(li), pts = LV[li].outline, total = 0, done = 0, d = APPLIQUE_INSET * tf.s;
    for (var j = 0; j < R.stitches.length; j++) if (R.stitches[j].li === li) { total++; if (j < count) done++; }
    if (!total || !done) return;
    var prog = done / total, rim = Math.max(2, d * 0.9);
    ctx.save();
    outlinePath(pts, tf.ox, tf.oy, tf.s); ctx.clip();
    ctx.lineJoin = 'round';
    [[1, 0.55], [0.6, 0.35]].forEach(function (ly) {
      var off = rim * 0.55 * ly[0];
      ctx.save(); ctx.translate(off, off); outlinePath(pts, tf.ox, tf.oy, tf.s);
      ctx.lineWidth = rim * 2 * ly[0]; ctx.strokeStyle = rgba(fb.light, ly[1] * prog); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(-off, -off); outlinePath(pts, tf.ox, tf.oy, tf.s);
      ctx.lineWidth = rim * 2 * ly[0]; ctx.strokeStyle = rgba(fb.dark, (ly[1] + 0.05) * prog); ctx.stroke(); ctx.restore();
    });
    ctx.restore();
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[0, 0, 1.7, rgba(fb.dark, 0.6)], [0.9, 0.9, 1.0, rgba(fb.light, 0.75)]].forEach(function (ln) {
      ctx.beginPath();
      var prev = null;
      for (var k = 0; k < count; k++) {
        var st = R.stitches[k]; if (st.li !== li) continue;
        // bắt đầu vòng mới khi mũi này không nối tiếp mũi trước (mảnh có lỗ có hai vòng)
        if (!prev || Math.hypot(prev[0] - st.a[0], prev[1] - st.a[1]) > 0.5) ctx.moveTo(st.a[0] + ln[0], st.a[1] + ln[1]);
        ctx.lineTo(st.b[0] + ln[0], st.b[1] + ln[1]); prev = st.b;
      }
      ctx.lineWidth = ln[2]; ctx.strokeStyle = ln[3]; ctx.stroke();
    });
    ctx.restore();
  }
  function drawPieceStitches(li) {
    if (!R || !R.stitches || !R.stitches.length) return;
    var show = R.phase === 'stitch' || R.phase === 'cinch' || R.phase === 'tapReady' || R.phase === 'reveal' || R.phase === 'decor' || R.phase === 'done';
    if (!show || STITCH_KIND === 'none') return;
    var count = R.phase === 'stitch' ? Math.min(R.stitches.length, Math.floor(R.stDone)) : R.stitches.length;
    if (STITCH_KIND === 'quilt') { drawQuilt(li, count); return; }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var pass = 1; pass < 2; pass++) { // không còn nét bóng dưới sợi chỉ
      ctx.beginPath();
      for (var j = 0; j < count; j++) {
        var st = R.stitches[j]; if (st.li !== li) continue;
        var a = st.a, b = st.b, nx = st.nx, ny = st.ny, d = st.d, o = pass ? 0 : 0.9;
        if (STITCH_KIND === 'running') {
          ctx.moveTo(a[0], a[1] + o); ctx.lineTo(lerp(a[0], b[0], 0.6), lerp(a[1], b[1], 0.6) + o);
        } else if (STITCH_KIND === 'whip') {
          ctx.moveTo(a[0], a[1] + o); ctx.lineTo(lerp(a[0], b[0], 0.5) - nx * d * 1.25, lerp(a[1], b[1], 0.5) - ny * d * 1.25 + o);
        } else {
          // viền chăn: một sợi chạy dọc đường khâu, mỗi mũi một gạch vuông góc ra tới mép mảnh
          ctx.moveTo(b[0], b[1] + o); ctx.lineTo(a[0], a[1] + o); ctx.lineTo(a[0] - nx * d * 0.92, a[1] - ny * d * 0.92 + o);
        }
      }
      if (pass === 0) { ctx.lineWidth = 2.8; ctx.strokeStyle = 'rgba(74,59,53,0.22)'; }
      else { ctx.lineWidth = 0.9; ctx.globalAlpha = 0.8; ctx.strokeStyle = (function () { for (var q = 0; q < R.stitches.length; q++) if (R.stitches[q].li === li) return R.stitches[q].col; return '#FFF6E8'; })(); }
      ctx.stroke();
    }
    // nhịp rút chỉ: nếp nhăn nhỏ dọc mép khâu, thưa để không rối
    if (R.pucker > 0.02) {
      var puck = R.pucker;
      for (var p2 = 0; p2 < count; p2 += 4) {
        var s2 = R.stitches[p2]; if (s2.li !== li) continue;
        var wLen = (5 + (p2 % 3) * 2) * puck;
        ctx.beginPath(); ctx.moveTo(s2.m[0] - s2.nx * wLen, s2.m[1] - s2.ny * wLen); ctx.lineTo(s2.m[0] + s2.nx * wLen, s2.m[1] + s2.ny * wLen);
        ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(74,59,53,' + (0.16 * puck) + ')'; ctx.stroke();
      }
    }
    ctx.restore();
  }
  function startReward() {
    humStop();
    var p = product(), homes = HOMES[p.levels.length], fitted = fitProductPlaces(p);
    R = {
      t: 0, phase: 'enter', places: fitted, pieces: p.levels.map(function (li, k) {
        var b = LV[li].bbox, tf0 = fitted[li] || placeOf(li);
        var homeSc = p.levels.length > 3 ? clamp(Math.min(72 / Math.max(1, (b[2] - b[0]) * tf0.s), 86 / Math.max(1, (b[3] - b[1]) * tf0.s)), 0.28, 0.72) : 0.5;
        return { i: li, tf: placeOf(li), home: homes[k], homeSc: homeSc, x: homes[k][0], y: homes[k][1], sc: homeSc, placed: false, back: null };
      }), drag: null, stitch: 0, tap: null, reveal: 0, decor: [], decorT: 0, replay: 0, sq: 0, wig: 0,
      stitches: [], stDone: 0, cinch: 0, pucker: 0, cinchSound: 0, fast: 1, seamCen: [195, 395]
    };
    // khâu đắp quanh mép từng mảnh thay cho đường may vàng giữa các mảnh (dữ liệu seams không còn dùng ở đây)
    // 2026-11-11: bỏ khâu đắp và rút chỉ; hoàn thiện bằng cú ép khi người chơi chạm (pha 'press'), nên không dựng mũi khâu
    R.stitches = []; R.seams = [];
    if (R.stitches.length) {
      var sx = 0, sy = 0; R.stitches.forEach(function (st) { sx += st.m[0]; sy += st.m[1]; });
      R.seamCen = [sx / R.stitches.length, sy / R.stitches.length];
    }
    var by = 0;
    p.levels.forEach(function (li) { var t = placeOf(li); by = Math.max(by, t.oy + LV[li].bbox[3] * t.s); });
    R.base = [195, by];
    // mép trên của sản phẩm: bàn ép chạm vào đây; các mốc hiệu ứng ép đặt lại cho mỗi lần vào màn thưởng
    var topY = 999;
    p.levels.forEach(function (li) { var t = placeOf(li); topY = Math.min(topY, t.oy + LV[li].bbox[1] * t.s); });
    R.top = topY; R.labelT = 0; R.sheenT = -9; R.flashT = -9; R.shakeT = -9;
    chord([0, 4, 7], 0.05, 0.08);
  }
  function productTf() {
    var bx = R.base[0], by = R.base[1];
    ctx.translate(bx, by); ctx.rotate(R.wig); ctx.scale(1 + R.sq * 0.6, 1 - R.sq); ctx.translate(-bx, -by);
    // cú ép nhìn từ trên xuống: sản phẩm lún vào (thu nhỏ đều quanh tâm) rồi nảy lại
    if (R.pz && R.pz !== 1) { var pcy = (R.top + R.base[1]) / 2; ctx.translate(195, pcy); ctx.scale(R.pz, R.pz); ctx.translate(-195, -pcy); }
    if (R.pucker && Math.abs(R.pucker) > 1e-4) {
      var cx = R.seamCen[0], cy = R.seamCen[1];
      ctx.translate(cx, cy); ctx.scale(1 - R.pucker * 0.055, 1 - R.pucker * 0.04); ctx.translate(-cx, -cy);
    }
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
      if (hasNext()) { S.parts = []; loadProduct(S.pi + 1); chord([0, 4], 0.05); }
      else if (product().standalone) { S.parts = []; loadProduct(S.pi); chord([0, 4], 0.05); }
      else restart();
      return;
    }
    if (R.phase === 'stitch' || R.phase === 'cinch') {
      R.fast = FAST;
      pop(noteF(5), 0.03, 0, 0.05);
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
      // chạm là cú ép: nén xuống, va chạm, bật lại, rồi mới loang màu (pha 'press' trong updateReward)
      R.tap = p; R.phase = 'press'; R.t = 0; R.sq = 0; R.pressHit = false; R.pressRelease = false; R.ringT = 0;
      // tiếng "vút" ngắn lúc con dấu hạ xuống
      noise(0.18, 0.03, 1400, 'bandpass'); noise(0.12, 0.02, 2600, 'bandpass', 0.06);
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
      var targetSc = (R.drag && R.drag.pc === pc) || pc.placed ? 1 : (pc.homeSc || 0.5);
      pc.sc += (targetSc - pc.sc) * Math.min(1, dt * 14);
      if (pc.snap) { pc.snap.t += dt; var u = easeOut(pc.snap.t / 0.2), tg = pieceCenterTarget(pc); pc.x = lerp(pc.snap.x, tg[0], u); pc.y = lerp(pc.snap.y, tg[1], u); if (pc.snap.t >= 0.2) pc.snap = null; }
      if (pc.back) { pc.back.t += dt; var v = easeOut(pc.back.t / 0.25); pc.x = lerp(pc.back.x, pc.home[0], v); pc.y = lerp(pc.back.y, pc.home[1], v); if (pc.back.t >= 0.25) pc.back = null; }
    });
    if (R.phase === 'enter' && R.t > 0.6) { R.phase = 'place'; R.t = 0; }
    if (R.phase === 'place' && R.pieces.every(function (pc) { return pc.placed && !pc.snap; })) {
      // đủ mảnh: chờ người chơi chạm để ép (không còn bước khâu tự chạy)
      R.phase = 'tapReady'; R.t = 0;
      pop(noteF(4), 0.06, 0, 0.2); vib(10);
    }
    if (R.phase === 'stitch') {
      var spd = (R.fast || 1);
      var k = clamp(R.t / 0.35, 0, 1);
      R.sq = reduce ? 0 : 0.06 * Math.sin(k * Math.PI * 2) * (1 - k);
      var prevSt = Math.floor(R.stDone);
      // cả lượt khâu đắp xong trong APPLIQUE_T giây dù tổng số mũi nhiều hay ít
      if (STITCH_KIND === 'none') R.stDone = R.stitches.length; // không khâu: sang thẳng nhịp chốt
      var stitchRate = Math.max(13, R.stitches.length / APPLIQUE_T) * spd;
      R.stDone += dt * stitchRate;
      var newSt = Math.floor(R.stDone);
      if (newSt > prevSt) {
        for (var si = prevSt; si < Math.min(newSt, R.stitches.length); si++) {
          // mũi rất dày nên cả lượt chỉ phát khoảng 12 nốt leo dần (không lên quá 2,5 quãng tám), tiếng kim mỗi 2 mũi
          var every = Math.max(1, Math.round(R.stitches.length / 12));
          if (si % every === 0) { pop(risingF(Math.floor(si / every)), 0.05, 0, 0.2); vib(3); var stObj = R.stitches[si]; if (stObj) sparkle(stObj.m[0], stObj.m[1], 2); }
          if (si % 2 === 0) noise(0.02, 0.012, 2000, 'bandpass');
        }
      }
      if (R.stDone >= R.stitches.length) {
        R.stDone = R.stitches.length;
        R.phase = 'cinch';
        R.t = 0;
        R.cinch = 0;
        R.pucker = 0;
        R.cinchSound = 0;
      }
    }
    if (R.phase === 'cinch') {
      var spdC = (R.fast || 1);
      R.cinch += dt * spdC;
      var ct = R.cinch;
      if (ct < 0.28) {
        var u = ct / 0.28;
        R.pucker = easeOut(u);
        if (R.cinchSound === 0) {
          R.cinchSound = 1;
          sweep(0.24, 0.055, 650, 2400);
          pluck(pentaF(4, 0), 0.075);
          vib([12, 18, 12]);
        }
      } else if (ct < 0.76) {
        var v = (ct - 0.28) / 0.48;
        R.pucker = Math.max(0, 1 - easeOut(v));
        if (R.cinchSound === 1) {
          R.cinchSound = 2;
          chord([0, 4, 7, 12], 0.07, 0.08);
          vib([16, 26, 16]);
          R.seams.forEach(function (sm) {
            var a = sm[0], b = sm[sm.length - 1];
            sparkle(a[0], a[1], 8); sparkle(b[0], b[1], 8);
            burst(a[0], a[1], 14); burst(b[0], b[1], 14);
          });
          burst(R.seamCen[0], R.seamCen[1], 45);
        }
        var w = clamp((ct - 0.28) / 0.48, 0, 1);
        R.wig = reduce ? 0 : 0.04 * Math.sin(w * Math.PI * 3) * (1 - w);
      } else {
        R.pucker = 0;
        R.wig = 0;
        R.sq = 0;
        R.phase = 'tapReady';
        R.t = 0;
      }
    }
    if (R.phase === 'tapReady') R.sq = reduce ? 0 : 0.012 * Math.sin(clock * 3);
    if (R.phase === 'press') {
      // Ép hoàn thiện kiểu con dấu tròn (2026-11-11, số tạm), nhìn từ trên xuống: con dấu tròn đúng cỡ vải nền hạ thẳng
      // xuống trong 0,2 s (to 1,35 lần và mờ, nhỏ dần; bóng tròn co lại và đậm dần); chạm thì khớp mép nền, nén nhẹ
      // 0,1 s (rung, chớp sáng, tiếng thịch); nhấc lên 0,3 s (to ra, mờ đi), hơi nước bốc đều quanh mép tròn và để lại
      // vết ép tròn nổi cùng màu nền; rồi màu loang từ tâm ra mép nền, nhãn "Hoàn thành!".
      var T_HIT = 0.2, T_LIFT = 0.3, T_END = 0.6, pt = R.t;
      R.sq = 0; R.pz = 1;
      if (pt >= T_HIT && !R.pressHit) {
        R.pressHit = true; R.flashT = clock; R.shakeT = clock;
        // tiếng "thịch" trầm êm như nỉ, rung mạnh một nhịp
        pop(92, 0.16, 0, 0.4); noise(0.18, 0.07, 450, 'lowpass'); vib(40);
      }
      if (pt >= T_LIFT && !R.pressRelease) {
        R.pressRelease = true; R.ringT = clock;
        noise(0.3, 0.03, 4200, 'highpass'); // hơi nước xì khi nhấc con dấu
        // hơi nước bốc đều quanh mép tròn: hướng ra ngoài và lên trên
        for (var sm = 0; sm < 22; sm++) {
          var sa = sm / 22 * Math.PI * 2 + Math.random() * 0.2, sx = 195 + Math.cos(sa) * 165, sy = 395 + Math.sin(sa) * 165;
          S.parts.push({ x: sx, y: sy, vx: Math.cos(sa) * (18 + Math.random() * 16), vy: Math.sin(sa) * 14 - 34 - Math.random() * 26, life: 0.9 + Math.random() * 0.3, age: 0, kind: 'steam', r: 9 + Math.random() * 8, rot: 0, vr: 0, g: -12 });
        }
        burst(195, 395, 150);
      }
      if (pt >= T_END) { R.sq = 0; R.phase = 'reveal'; R.t = 0; R.labelT = clock; R.sheenT = clock; chord([0, 2, 4, 7, 9, 12], 0.06, 0.06); vib([12, 20, 12]); }
    }
    if (R.phase === 'reveal') {
      R.reveal = easeInOut(clamp(R.t / 0.6, 0, 1));
      if (R.t > 0.6) { R.phase = 'decor'; R.t = 0; R.decorT = 0; sparkle(195, 395, 18); }
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
  // Decor Hướng A phong cách Cartoon nghệ thuật (không mặt cười); hỗ trợ before (sau lưng mảnh), clipTo (trong clip mảnh) và after (đúng tầng chiều sâu).
  var DECOR = {
    icecream: [
      { clipTo: 1, at: function () { return ptOf(1, 0.50, 0.56); }, draw: function (p, k) { iceCreamConeDecor(placeOf(1), placeOf(0), k); } },
      { after: 1, at: function () { return ptOf(0, 0.74, 0.24); }, draw: function (p, k) {
        var sc = Math.max(0.01, k);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(0.45); ctx.scale(sc, sc);
        rr(-10, -56, 20, 76, 7);
        ctx.fillStyle = '#F7CE8A'; ctx.fill();
        ctx.save(); ctx.clip();
        // Cel-shade nửa phải bánh quế cuộn
        ctx.fillStyle = '#DA8F3A'; ctx.fillRect(0, -60, 14, 84);
        ctx.strokeStyle = '#9C5216'; ctx.lineWidth = 4.6;
        for (var yy = -62; yy < 32; yy += 16) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(14, yy + 12); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,244,212,0.55)'; rr(-6.5, -52, 4.2, 66, 2); ctx.fill();
        ctx.restore();
        ctx.lineWidth = 2.8; ctx.strokeStyle = '#63360B'; ctx.stroke(); ctx.restore(); } },
      { clipTo: 0, at: function () { return ptOf(0, 0.50, 0.34); }, draw: function (p, k) { iceCreamScoopDecor(placeOf(0), k); } },
      { after: 0, at: function () { return ptOf(0, 0.50, 0.36); }, draw: function (p, k) {
        var sc = Math.max(0.01, k);
        [[0.34, 0.27, -0.4, '#FFD24C'], [0.48, 0.23, 0.5, '#68D89A'], [0.62, 0.29, -0.2, '#6CC4F8'],
         [0.25, 0.36, 0.7, '#FF6892'], [0.54, 0.36, 0.3, '#FFD24C'], [0.71, 0.37, -0.6, '#68D89A'],
         [0.39, 0.58, 0.4, '#FFF8EA'], [0.61, 0.59, -0.5, '#FFE074']].forEach(function (sp) {
          var q = ptOf(0, sp[0], sp[1]);
          ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(sp[2]); ctx.scale(sc, sc);
          rr(-6.2, -2.6, 12.4, 5.2, 2.6); ctx.fillStyle = sp[3]; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#6B1F3A'; ctx.stroke(); ctx.restore();
        }); } },
      { at: function () { return ptOf(0, 0.48, 0.12); }, draw: function (p, k) { iceCreamCherryDecor(p, k); } }
    ],
    cupcake: [
      { before: 3, at: function () { return ptOf(3, 0.44, 0.22); }, draw: function (p, k) { cupcakeHandleDecor(placeOf(3), k); } },
      { clipTo: 2, at: function () { return ptOf(2, 0.50, 0.50); }, draw: function (p, k) { cupcakeBaseDecor(placeOf(2), k); } },
      { clipTo: 3, at: function () { return ptOf(3, 0.50, 0.46); }, draw: function (p, k) { cupcakeFrostingDecor(placeOf(3), k); } },
      { clipTo: 4, at: function () { return ptOf(4, 0.50, 0.48); }, draw: function (p, k) { cupcakeHeartDecor(placeOf(4), k); } }
    ],
    duck: [
      { clipTo: 5, at: function () { return ptOf(5, 0.48, 0.52); }, draw: function (p, k) { duckBodyDecor(placeOf(5), k); } },
      { clipTo: 6, at: function () { return ptOf(6, 0.56, 0.42); }, draw: function (p, k) { duckHeadDecor(placeOf(6), k); } },
      { after: 6, at: function () { return ptOf(6, 0.62, 0.34); }, draw: function (p, k) { duckEyeDecor(p, k); } },
      { clipTo: 7, at: function () { return ptOf(7, 0.50, 0.46); }, draw: function (p, k) { duckWavesDecor(placeOf(7), k); } }
    ],
    mushroom: [
      { clipTo: 8, at: function () { return ptOf(8, 0.50, 0.50); }, draw: function (p, k) { mushroomStemDecor(placeOf(8), k); } },
      { clipTo: 9, at: function () { return ptOf(9, 0.50, 0.48); }, draw: function (p, k) { mushroomCapDecor(placeOf(9), k); } },
      { clipTo: 10, at: function () { return ptOf(10, 0.50, 0.50); }, draw: function (p, k) { mushroomGrassDecor(placeOf(10), k); } }
    ],
    acorn: [
      { clipTo: 11, at: function () { return ptOf(11, 0.35, 0.50); }, draw: function (p, k) { oakLeafDecor(placeOf(11), k); } },
      { clipTo: 12, at: function () { return ptOf(12, 0.50, 0.50); }, draw: function (p, k) { acornNutDecor(placeOf(12), k); } },
      { clipTo: 13, at: function () { return ptOf(13, 0.55, 0.44); }, draw: function (p, k) { acornCapDecor(placeOf(13), k); } }
    ],
    sunflower: [
      { clipTo: 14, at: function () { return ptOf(14, 0.50, 0.65); }, draw: function (p, k) { sunflowerLeavesDecor(placeOf(14), k); } },
      { clipTo: 15, at: function () { return ptOf(15, 0.50, 0.50); }, draw: function (p, k) { sunflowerPetalsDecor(placeOf(15), k); } },
      { clipTo: 16, at: function () { return ptOf(16, 0.50, 0.50); }, draw: function (p, k) { sunflowerCenterDecor(placeOf(16), k); } }
    ],
    bonsai: [
      { before: 17, at: function () { return ptOf(17, 0.50, 0.58); }, draw: function (p, k) { bonsaiPotLegsDecor(placeOf(17), k); } },
      { clipTo: 17, at: function () { return ptOf(17, 0.50, 0.49); }, draw: function (p, k) { bonsaiPotDecor(placeOf(17), k); } },
      { clipTo: 18, at: function () { return ptOf(18, 0.50, 0.52); }, draw: function (p, k) { bonsaiTrunkDecor(placeOf(18), k); } },
      { clipTo: 19, at: function () { return ptOf(19, 0.52, 0.52); }, draw: function (p, k) { bonsaiMossDecor(placeOf(19), k); } },
      { clipTo: 20, at: function () { return ptOf(20, 0.50, 0.53); }, draw: function (p, k) { bonsaiCanopyDecor(placeOf(20), k); } }
    ]
  };
  function mushroomStemDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Cel-shading mảng tối #BCAC88 phía trái cổ áo và thân nấm, giữ mảng kem sáng #F0E0AC bên phải (Color Page)
    ctx.fillStyle = '#BCAC88';
    ctx.beginPath();
    ctx.moveTo(px(0.05), py(0.10));
    ctx.lineTo(px(0.55), py(0.10));
    ctx.quadraticCurveTo(px(0.45), py(0.24), px(0.32), py(0.35));
    ctx.lineTo(px(0.40), py(0.45));
    ctx.quadraticCurveTo(px(0.55), py(0.42), px(0.76), py(0.45));
    ctx.quadraticCurveTo(px(0.52), py(0.53), px(0.43), py(0.68));
    ctx.quadraticCurveTo(px(0.41), py(0.79), px(0.48), py(0.90));
    ctx.lineTo(px(0.05), py(0.90));
    ctx.closePath(); ctx.fill();
    // Bóng đổ mềm ngay dưới nếp váy cổ nấm
    ctx.fillStyle = rgba('#8E7C5A', 0.34);
    ctx.beginPath();
    ctx.moveTo(px(0.14), py(0.35));
    ctx.quadraticCurveTo(px(0.50), py(0.46), px(0.86), py(0.35));
    ctx.lineTo(px(0.85), py(0.46));
    ctx.quadraticCurveTo(px(0.50), py(0.54), px(0.15), py(0.46));
    ctx.closePath(); ctx.fill();
    // Nếp nhấn cổ nấm màu nâu đất nhẹ
    ctx.strokeStyle = rgba('#5D4D37', 0.45);
    ctx.lineWidth = Math.max(1.3, tf.s * 0.011);
    ctx.beginPath();
    ctx.moveTo(px(0.16), py(0.355));
    ctx.quadraticCurveTo(px(0.50), py(0.435), px(0.84), py(0.355));
    ctx.stroke();
    // Điểm sáng kem ấm bên phải thân nấm
    ctx.fillStyle = rgba('#FFF6D9', 0.55);
    ctx.beginPath();
    ctx.ellipse(px(0.69), py(0.63), tf.s * 0.11, tf.s * 0.13, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function mushroomCapDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng đỏ đậm cel-shading bên trái mũ nấm (#BC040C theo ICON-mushroom.png)
    ctx.fillStyle = '#BC040C';
    ctx.beginPath();
    ctx.moveTo(px(0.05), py(0.18));
    ctx.lineTo(px(0.47), py(0.20));
    ctx.quadraticCurveTo(px(0.31), py(0.32), px(0.31), py(0.50));
    ctx.quadraticCurveTo(px(0.31), py(0.63), px(0.34), py(0.75));
    ctx.lineTo(px(0.05), py(0.75));
    ctx.closePath(); ctx.fill();
    // Dải highlight bóng bẩy bên phải mũ nấm (#F85A60)
    ctx.strokeStyle = rgba('#FF6E74', 0.65);
    ctx.lineWidth = Math.max(3, tf.s * 0.042);
    ctx.beginPath();
    ctx.moveTo(px(0.58), py(0.28));
    ctx.quadraticCurveTo(px(0.78), py(0.35), px(0.81), py(0.59));
    ctx.stroke();
    // 6 đốm trắng cel-shaded theo đúng vị trí ICON-mushroom.png
    var spots = [
      [0.491, 0.352, 0.057, true],
      [0.696, 0.531, 0.080, true],
      [0.306, 0.563, 0.098, true],
      [0.683, 0.370, 0.022, false],
      [0.293, 0.373, 0.022, false],
      [0.514, 0.662, 0.022, false]
    ];
    spots.forEach(function (sp) {
      var cx = px(sp[0]), cy = py(sp[1]), r = tf.s * sp[2];
      if (sp[3]) {
        ctx.fillStyle = '#D4D4CC';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(cx + r * 0.16, cy - r * 0.14, r * 0.92, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = rgba('#4A1418', 0.18);
        ctx.lineWidth = Math.max(1, tf.s * 0.004);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }
  function mushroomGrassDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Bóng xanh rêu đậm phần chân cỏ & lá trái (#208C26)
    ctx.fillStyle = '#208C26';
    ctx.beginPath();
    ctx.moveTo(px(0.04), py(0.38));
    ctx.quadraticCurveTo(px(0.28), py(0.53), px(0.45), py(0.55));
    ctx.quadraticCurveTo(px(0.38), py(0.44), px(0.50), py(0.30));
    ctx.lineTo(px(0.50), py(0.58));
    ctx.quadraticCurveTo(px(0.68), py(0.63), px(0.95), py(0.54));
    ctx.lineTo(px(0.95), py(0.75));
    ctx.lineTo(px(0.04), py(0.75));
    ctx.closePath(); ctx.fill();
    // Mảng lá xanh sáng phía nắng bên phải lá giữa và lá phải (#54D05C)
    ctx.fillStyle = '#54D05C';
    ctx.beginPath();
    ctx.moveTo(px(0.50), py(0.34));
    ctx.quadraticCurveTo(px(0.61), py(0.44), px(0.61), py(0.56));
    ctx.quadraticCurveTo(px(0.53), py(0.54), px(0.50), py(0.45));
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px(0.66), py(0.52));
    ctx.quadraticCurveTo(px(0.80), py(0.45), px(0.89), py(0.48));
    ctx.quadraticCurveTo(px(0.78), py(0.56), px(0.67), py(0.60));
    ctx.closePath(); ctx.fill();
    // Nét tách 3 nhánh lá mềm mại theo kiểu Storybook Ink
    ctx.strokeStyle = rgba('#183616', 0.45);
    ctx.lineWidth = Math.max(1.2, tf.s * 0.008);
    ctx.beginPath();
    ctx.moveTo(px(0.35), py(0.51)); ctx.quadraticCurveTo(px(0.39), py(0.57), px(0.43), py(0.62));
    ctx.moveTo(px(0.65), py(0.51)); ctx.quadraticCurveTo(px(0.61), py(0.57), px(0.58), py(0.62));
    ctx.stroke();
    ctx.restore();
  }
  function acornImgMapper(tf, x0, y0, k) {
    return function (u, v) { return [tf.ox + (u - x0) * k * tf.s, tf.oy + (v - y0) * k * tf.s]; };
  }
  function oakLeafDecor(tf, k) {
    var al = clamp(k, 0, 1), pt = acornImgMapper(tf, -0.080, -0.050, 0.88);
    var p = function (u, v) { return pt(u, v); }, p12 = placeOf(12), p13 = placeOf(13);
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng cel-shading xanh lá đậm (#3A7C00) phía đỉnh lá & nửa phải theo đúng ICON-acorn.png
    ctx.fillStyle = '#3A7C00';
    ctx.beginPath();
    var a = p(0.58, 0.01), b = p(0.96, 0.01), c = p(0.96, 1.00), d = p(0.24, 1.00), e = p(0.27, 0.52), f = p(0.36, 0.25), g = p(0.62, 0.14);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.quadraticCurveTo(e[0], e[1], f[0], f[1]); ctx.quadraticCurveTo(g[0], g[1], a[0], a[1]);
    ctx.closePath(); ctx.fill();
    // Vệt nắng xanh non dịu bên rìa thùy lá trái
    ctx.strokeStyle = rgba('#9CE03B', 0.45); ctx.lineWidth = tf.s * 0.022;
    ctx.beginPath();
    var h0 = p(0.11, 0.34), h1 = p(0.28, 0.16), h2 = p(0.45, 0.05);
    ctx.moveTo(h0[0], h0[1]); ctx.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); ctx.stroke();
    // Gân lá sồi tinh tế theo chiều cuống hướng lên ngọn lá phải
    ctx.strokeStyle = rgba('#214B03', 0.34); ctx.lineWidth = Math.max(1.2, tf.s * 0.0085);
    ctx.beginPath();
    var v0 = p(0.22, 0.90), v1 = p(0.36, 0.46), v2 = p(0.84, 0.10);
    ctx.moveTo(v0[0], v0[1]); ctx.quadraticCurveTo(v1[0], v1[1], v2[0], v2[1]);
    var l0 = p(0.25, 0.72), l1 = p(0.14, 0.64), l2 = p(0.06, 0.63);
    ctx.moveTo(l0[0], l0[1]); ctx.quadraticCurveTo(l1[0], l1[1], l2[0], l2[1]);
    var u0 = p(0.30, 0.44), u1 = p(0.18, 0.37), u2 = p(0.10, 0.34);
    ctx.moveTo(u0[0], u0[1]); ctx.quadraticCurveTo(u1[0], u1[1], u2[0], u2[1]);
    ctx.stroke();
    // Bóng mềm của hạt dẻ & mũ hạt dẻ đổ xuống nền lá sồi
    ctx.save(); ctx.translate(-4, 6);
    ctx.fillStyle = 'rgba(26, 48, 4, 0.25)';
    outlinePath(LV[12].outline, p12.ox, p12.oy, p12.s); ctx.fill();
    outlinePath(LV[13].outline, p13.ox, p13.oy, p13.s); ctx.fill();
    ctx.restore();
    // Giọt sương mai trong trẻo đọng trên thùy lá trái
    var dw = p(0.115, 0.635), dr = tf.s * 0.022;
    ctx.beginPath(); ctx.ellipse(dw[0], dw[1], dr, dr * 0.78, -0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 250, 255, 0.72)'; ctx.fill();
    ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(34, 86, 12, 0.45)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(dw[0] - dr * 0.34, dw[1] - dr * 0.25, dr * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'; ctx.fill();
    ctx.restore();
  }
  function acornNutDecor(tf, k) {
    var al = clamp(k, 0, 1), pt = acornImgMapper(tf, 0.160, 0.220, 1.15);
    var p = function (u, v) { return pt(u, v); }, p13 = placeOf(13);
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng cel-shading cam sẫm (#CE6B08) ôm viền phải & đáy hạt dẻ theo ICON-acorn.png
    ctx.fillStyle = '#CE6B08';
    ctx.beginPath();
    var s0 = p(0.60, 0.38), s1 = p(0.84, 0.58), s2 = p(0.75, 0.78), s3 = p(0.45, 0.92), s4 = p(0.95, 0.95), s5 = p(0.95, 0.36);
    ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]);
    ctx.quadraticCurveTo(s2[0] - tf.s * 0.08, s3[1] - tf.s * 0.03, s3[0], s3[1]);
    ctx.lineTo(s4[0], s4[1]); ctx.lineTo(s5[0], s5[1]); ctx.closePath(); ctx.fill();
    // Bóng đổ mềm ngay dưới vành mũ hạt dẻ
    ctx.save(); ctx.translate(0, 6);
    outlinePath(LV[13].outline, p13.ox, p13.oy, p13.s);
    ctx.fillStyle = 'rgba(72, 24, 4, 0.28)'; ctx.fill(); ctx.restore();
    // Vệt bóng sáng màu mơ nhạt (#FAB86E) dọc má trái hạt dẻ đúng chất Color Page
    var h0 = p(0.382, 0.482), h1 = p(0.355, 0.610), h2 = p(0.398, 0.728);
    ctx.strokeStyle = '#FAB86E'; ctx.lineWidth = tf.s * 0.064;
    ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); ctx.stroke();
    ctx.restore();
  }
  function acornCapDecor(tf, k) {
    var al = clamp(k, 0, 1), pt = acornImgMapper(tf, 0.180, -0.040, 1.12);
    var p = function (u, v) { return pt(u, v); };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng cel-shading nâu sẫm (#752B0A) ở nửa phải mũ & cuống nhỏ trên đỉnh
    ctx.fillStyle = '#752B0A';
    ctx.beginPath();
    var c0 = p(0.75, 0.12), c1 = p(0.68, 0.26), c2 = p(0.84, 0.45), c3 = p(0.89, 0.64), c4 = p(1.03, 0.64), c5 = p(1.03, 0.10);
    ctx.moveTo(c0[0], c0[1]); ctx.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]);
    ctx.lineTo(c3[0], c3[1]); ctx.lineTo(c4[0], c4[1]); ctx.lineTo(c5[0], c5[1]); ctx.closePath(); ctx.fill();
    // Viền tối nhẹ ôm dưới vành mũ (#5E2006)
    ctx.strokeStyle = 'rgba(78, 25, 4, 0.42)'; ctx.lineWidth = tf.s * 0.032;
    ctx.beginPath();
    var r0 = p(0.31, 0.422), r1 = p(0.60, 0.405), r2 = p(0.91, 0.615);
    ctx.moveTo(r0[0], r0[1]); ctx.quadraticCurveTo(r1[0], r1[1], r2[0], r2[1]); ctx.stroke();
    // Vệt highlight nâu ấm bên vai trái chỏm mũ
    ctx.strokeStyle = rgba('#D46C34', 0.48); ctx.lineWidth = tf.s * 0.030;
    ctx.beginPath();
    var hl0 = p(0.38, 0.285), hl1 = p(0.49, 0.205), hl2 = p(0.64, 0.210);
    ctx.moveTo(hl0[0], hl0[1]); ctx.quadraticCurveTo(hl1[0], hl1[1], hl2[0], hl2[1]); ctx.stroke();
    // Hai cụm nét sóng vỏ mũ hạt dẻ (#4F1A04) đặc trưng của ICON-acorn.png
    ctx.strokeStyle = '#4F1A04'; ctx.lineWidth = Math.max(2.2, tf.s * 0.028);
    var m0 = p(0.402, 0.308), m1 = p(0.452, 0.252), m2 = p(0.504, 0.296), m3 = p(0.556, 0.254), m4 = p(0.606, 0.308);
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(m1[0], m1[1], m2[0], m2[1]); ctx.quadraticCurveTo(m3[0], m3[1], m4[0], m4[1]); ctx.stroke();
    var n0 = p(0.768, 0.376), n1 = p(0.818, 0.360), n2 = p(0.854, 0.414), n3 = p(0.898, 0.402), n4 = p(0.928, 0.460);
    ctx.beginPath(); ctx.moveTo(n0[0], n0[1]); ctx.quadraticCurveTo(n1[0], n1[1], n2[0], n2[1]); ctx.quadraticCurveTo(n3[0], n3[1], n4[0], n4[1]); ctx.stroke();
    ctx.restore();
  }
  function sunflowerLeavesDecor(tf, k) {
    var al = clamp(k, 0, 1), pt = acornImgMapper(tf, 0.055, 0.250, 1.08);
    var p = function (u, v) { return pt(u, v); }, p15 = placeOf(15);
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Cel-shading nửa trong của từng chiếc lá xanh sẫm (#067626) giống IconSunflower.png
    ctx.fillStyle = '#067626';
    ctx.beginPath();
    var l0 = p(0.145, 0.942), l1 = p(0.320, 0.720), l2 = p(0.510, 0.640), l3 = p(0.490, 0.950), l4 = p(0.140, 0.960);
    ctx.moveTo(l0[0], l0[1]); ctx.quadraticCurveTo(l1[0], l1[1], l2[0], l2[1]); ctx.lineTo(l3[0], l3[1]); ctx.lineTo(l4[0], l4[1]); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    var r0 = p(0.510, 0.640), r1 = p(0.720, 0.735), r2 = p(0.865, 0.942), r3 = p(0.880, 0.960), r4 = p(0.510, 0.940);
    ctx.moveTo(r0[0], r0[1]); ctx.quadraticCurveTo(r1[0], r1[1], r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]); ctx.lineTo(r4[0], r4[1]); ctx.closePath(); ctx.fill();
    // Gân lá sáng màu xanh non (#40B030 / #72E468) dọc sống từng lá
    ctx.strokeStyle = rgba('#62DF68', 0.65); ctx.lineWidth = Math.max(1.5, tf.s * 0.015);
    var gl0 = p(0.155, 0.925), gl1 = p(0.305, 0.735), gl2 = p(0.455, 0.655);
    ctx.beginPath(); ctx.moveTo(gl0[0], gl0[1]); ctx.quadraticCurveTo(gl1[0], gl1[1], gl2[0], gl2[1]); ctx.stroke();
    var gr0 = p(0.850, 0.925), gr1 = p(0.710, 0.745), gr2 = p(0.565, 0.670);
    ctx.beginPath(); ctx.moveTo(gr0[0], gr0[1]); ctx.quadraticCurveTo(gr1[0], gr1[1], gr2[0], gr2[1]); ctx.stroke();
    // Vệt sáng rìa lá hướng nắng trên đỉnh 2 vai lá
    ctx.strokeStyle = rgba('#92F27C', 0.42); ctx.lineWidth = tf.s * 0.020;
    var sl0 = p(0.135, 0.840), sl1 = p(0.155, 0.700), sl2 = p(0.240, 0.625);
    ctx.beginPath(); ctx.moveTo(sl0[0], sl0[1]); ctx.quadraticCurveTo(sl1[0], sl1[1], sl2[0], sl2[1]); ctx.stroke();
    var sr0 = p(0.810, 0.680), sr1 = p(0.885, 0.770), sr2 = p(0.892, 0.875);
    ctx.beginPath(); ctx.moveTo(sr0[0], sr0[1]); ctx.quadraticCurveTo(sr1[0], sr1[1], sr2[0], sr2[1]); ctx.stroke();
    // Bóng đổ mềm của vòng cánh hoa vàng lên phần gốc hai chiếc lá
    ctx.save(); ctx.translate(0, 5);
    outlinePath(LV[15].outline, p15.ox, p15.oy, p15.s);
    ctx.fillStyle = 'rgba(4, 52, 18, 0.30)'; ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function sunflowerPetalsDecor(tf, k) {
    var al = clamp(k, 0, 1), pt = acornImgMapper(tf, 0.060, -0.005, 1.12);
    var p = function (u, v) { return pt(u, v); }, p16 = placeOf(16);
    var cx = 0.509, cy = 0.438;
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng cel-shading vàng cam (#F29A18 / #FFA030) ôm viền phải-dưới vòng cánh hoa theo IconSunflower.png
    ctx.fillStyle = '#F29A18';
    ctx.beginPath();
    var sh0 = p(0.62, 0.08), sh1 = p(0.85, 0.36), sh2 = p(0.74, 0.68), sh3 = p(0.38, 0.78), sh4 = p(0.15, 0.66), sh5 = p(0.12, 0.90), sh6 = p(0.95, 0.90), sh7 = p(0.95, 0.04);
    ctx.moveTo(sh0[0], sh0[1]);
    ctx.quadraticCurveTo(sh1[0], sh1[1], sh2[0], sh2[1]);
    ctx.quadraticCurveTo(sh3[0], sh3[1], sh4[0], sh4[1]);
    ctx.lineTo(sh5[0], sh5[1]); ctx.lineTo(sh6[0], sh6[1]); ctx.lineTo(sh7[0], sh7[1]);
    ctx.closePath(); ctx.fill();
    // Đường gập bóng sáng nhẹ dọc cánh trên & trái (#FFEE88)
    [-90, -135, 180].forEach(function (deg) {
      var a = deg * Math.PI / 180;
      var a1 = p(cx + Math.cos(a) * 0.23, cy + Math.sin(a) * 0.22);
      var a2 = p(cx + Math.cos(a) * 0.35, cy + Math.sin(a) * 0.34);
      ctx.strokeStyle = rgba('#FFF29A', 0.65); ctx.lineWidth = tf.s * 0.030;
      ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
    });
    // 8 nét kẽ tách cánh hoa tỏa ra từ nhụy về từng khe cánh (Cartoon Ink dịu)
    ctx.strokeStyle = rgba('#C46808', 0.48); ctx.lineWidth = Math.max(1.4, tf.s * 0.011);
    [-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, -157.5].forEach(function (deg) {
      var a = deg * Math.PI / 180;
      var q1 = p(cx + Math.cos(a) * 0.195, cy + Math.sin(a) * 0.185);
      var q2 = p(cx + Math.cos(a) * 0.295, cy + Math.sin(a) * 0.295);
      ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
    });
    // Bóng đổ ấm của nhụy hoa nâu lên nền cánh vàng
    ctx.save(); ctx.translate(-2, 4);
    outlinePath(LV[16].outline, p16.ox, p16.oy, p16.s);
    ctx.fillStyle = 'rgba(130, 52, 6, 0.32)'; ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function sunflowerCenterDecor(tf, k) {
    var al = clamp(k, 0, 1), pt = acornImgMapper(tf, 0.188, 0.120, 1.56);
    var p = function (u, v) { return pt(u, v); };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng cel-shading nâu sẫm (#6A190C) ở phần dưới-phải nhụy hoa
    ctx.fillStyle = '#6A190C';
    ctx.beginPath();
    var c0 = p(0.68, 0.29), c1 = p(0.62, 0.49), c2 = p(0.46, 0.58), c3 = p(0.32, 0.56), c4 = p(0.32, 0.66), c5 = p(0.73, 0.66), c6 = p(0.73, 0.28);
    ctx.moveTo(c0[0], c0[1]); ctx.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]);
    ctx.lineTo(c3[0], c3[1]);
    ctx.lineTo(c4[0], c4[1]); ctx.lineTo(c5[0], c5[1]); ctx.lineTo(c6[0], c6[1]); ctx.closePath(); ctx.fill();
    // Vệt ánh sáng dịu phía trên-trái nhụy hoa
    ctx.strokeStyle = rgba('#D46648', 0.45); ctx.lineWidth = tf.s * 0.032;
    ctx.beginPath();
    var h0 = p(0.36, 0.44), h1 = p(0.40, 0.31), h2 = p(0.55, 0.295);
    ctx.moveTo(h0[0], h0[1]); ctx.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); ctx.stroke();
    // Mạng đường gạch chéo đan hạt (#541006) đặc trưng của IconSunflower.png (phong cách Color Page, không vẽ mặt cười)
    ctx.strokeStyle = '#541006'; ctx.lineWidth = Math.max(2.2, tf.s * 0.026);
    var lines = [
      [[0.40, 0.36], [0.63, 0.41]],
      [[0.38, 0.48], [0.61, 0.53]],
      [[0.46, 0.32], [0.40, 0.54]],
      [[0.57, 0.34], [0.51, 0.56]]
    ];
    lines.forEach(function (seg) {
      var a = p(seg[0][0], seg[0][1]), b = p(seg[1][0], seg[1][1]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    });
    // Chấm hạt li ti nhẹ ở các ô giao
    ctx.fillStyle = rgba('#D87050', 0.55);
    [[0.49, 0.42], [0.44, 0.46], [0.54, 0.47], [0.49, 0.50]].forEach(function (uv) {
      var q = p(uv[0], uv[1]); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.4, tf.s * 0.013), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  // Decor Màn 1 nâng cấp Color Page: Vỏ ốc quế nướng giòn nổi khối 3D, kem dâu cel-shaded bóng bẩy & cherry tươi.
  function iceCreamConeDecor(tf, p0, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Cel-shade nâu caramel cháy nhẹ nửa phải hình nón (#BA6820)
    ctx.fillStyle = rgba('#B2601A', 0.52);
    ctx.beginPath();
    ctx.moveTo(px(0.54), py(0.14));
    ctx.lineTo(px(0.84), py(0.14));
    ctx.lineTo(px(0.50), py(0.92));
    ctx.quadraticCurveTo(px(0.58), py(0.50), px(0.54), py(0.14));
    ctx.closePath(); ctx.fill();
    // Dải highlight mật ong ấm dọc thân trái (#FFF1BC)
    ctx.fillStyle = rgba('#FFF2BE', 0.45);
    ctx.beginPath();
    ctx.moveTo(px(0.32), py(0.24));
    ctx.lineTo(px(0.42), py(0.24));
    ctx.lineTo(px(0.47), py(0.76));
    ctx.lineTo(px(0.41), py(0.70));
    ctx.closePath(); ctx.fill();
    // Khắc viền nổi lưới bánh waffle 2 lớp (sáng bên trên + nâu nướng bên dưới)
    ctx.strokeStyle = rgba('#6E3B0E', 0.38); ctx.lineWidth = 1.6;
    for (var row = 0.24; row <= 0.82; row += 0.14) {
      ctx.beginPath(); ctx.moveTo(px(0.18), py(row)); ctx.lineTo(px(0.82), py(row + 0.22)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(0.82), py(row)); ctx.lineTo(px(0.18), py(row + 0.22)); ctx.stroke();
    }
    // Bóng đổ mềm sâu của viên kem dâu xuống phần trên vỏ ốc quế
    ctx.save(); ctx.translate(0, 7);
    outlinePath(LV[0].outline, p0.ox, p0.oy, p0.s);
    ctx.fillStyle = rgba('#6E2C12', 0.38); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function iceCreamScoopDecor(tf, k) {
    var b0 = LV[0].bbox, fb0 = fab(0), al = clamp(k, 0, 1);
    var x0 = tf.ox + b0[0] * tf.s, y0 = tf.oy + b0[1] * tf.s, w = (b0[2] - b0[0]) * tf.s, h = (b0[3] - b0[1]) * tf.s;
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng cel-shade dâu đậm phía đáy phải tạo khối tròn mọng (#C22050)
    ctx.fillStyle = rgba('#C01E4E', 0.44);
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.16, y0 + h * 0.98);
    ctx.bezierCurveTo(x0 + w * 0.56, y0 + h * 0.92, x0 + w * 0.80, y0 + h * 0.62, x0 + w * 0.82, y0 + h * 0.26);
    ctx.lineTo(x0 + w * 1.04, y0 + h * 0.26);
    ctx.lineTo(x0 + w * 1.04, y0 + h * 1.04);
    ctx.closePath(); ctx.fill();
    // Kem phủ vani bóng mượt chảy gợn sóng từ đỉnh + viền bóng hồng bên dưới
    ctx.save(); ctx.translate(0, (1 - Math.min(k, 1.05)) * -12);
    ctx.beginPath();
    ctx.moveTo(x0 - 4, y0 - 4); ctx.lineTo(x0 + w + 4, y0 - 4); ctx.lineTo(x0 + w + 4, y0 + h * 0.42);
    ctx.bezierCurveTo(x0 + w * 0.85, y0 + h * 0.54, x0 + w * 0.78, y0 + h * 0.34, x0 + w * 0.67, y0 + h * 0.46);
    ctx.bezierCurveTo(x0 + w * 0.56, y0 + h * 0.60, x0 + w * 0.46, y0 + h * 0.36, x0 + w * 0.34, y0 + h * 0.50);
    ctx.bezierCurveTo(x0 + w * 0.22, y0 + h * 0.60, x0 + w * 0.14, y0 + h * 0.36, x0 - 4, y0 + h * 0.44);
    ctx.closePath();
    ctx.save(); ctx.translate(0, 4.5); ctx.fillStyle = rgba('#8E183F', 0.24); ctx.fill(); ctx.restore();
    var ig = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.55); ig.addColorStop(0, '#FFFDF9'); ig.addColorStop(1, '#FFE6EF');
    ctx.fillStyle = ig; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = mix(fb0.line, '#B83C60', 0.35); ctx.stroke();
    ctx.save(); ctx.translate(x0 + w * 0.22, y0 + h * 0.26); ctx.rotate(-0.62);
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 6.2, 0, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.restore();
  }
  function iceCreamCherryDecor(p, k) {
    var sc = Math.max(0.01, k) * 1.12;
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(sc, sc);
    // Lá bạc hà 2 tông Color Page
    ctx.save(); ctx.translate(-12, -2); ctx.rotate(-0.55);
    ctx.beginPath(); ctx.ellipse(0, 0, 13.5, 6.4, 0, 0, 7);
    ctx.fillStyle = '#5EE082'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#2CA850'; ctx.fillRect(-15, 0, 30, 8); ctx.restore();
    ctx.lineWidth = 1.9; ctx.strokeStyle = '#16582C'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8.5, 0); ctx.lineTo(8.5, 0); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // Cuống và quả cherry 2 tông cel-shaded bóng bẩy
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(-5, -25, -14, -28);
    ctx.lineWidth = 2.8; ctx.strokeStyle = '#16582C'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 12.8, 0, 7);
    ctx.fillStyle = '#EE2640'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#B00E24';
    ctx.beginPath(); ctx.arc(4.2, 4.2, 12.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#EE2640';
    ctx.beginPath(); ctx.arc(-2.5, -2.5, 11.4, 0, 7); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#620C1E'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-4.6, -4.8, 4.0, 2.4, -0.6, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
    ctx.restore();
  }
  // Decor Màn 2 Color Page (IconCupcakeHeart.png): quai giỏ tím nhạt, ly hồng xếp ly, kem cam & trái tim đỏ bóng bẩy.
  function cupcakeHandleDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(0.22), py(0.41));
    ctx.quadraticCurveTo(px(0.32), py(0.10), px(0.68), py(0.22));
    ctx.lineWidth = 15; ctx.strokeStyle = rgba('#9A90CC', 0.45); ctx.stroke();
    ctx.lineWidth = 11.5; ctx.strokeStyle = rgba('#E4DFFF', 0.92); ctx.stroke();
    ctx.lineWidth = 4.0; ctx.strokeStyle = rgba('#FAF8FF', 0.78); ctx.stroke();
    ctx.restore();
  }
  function cupcakeBaseDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Bóng đổ tối hai bên thành cốc hồng đậm (#A4166E)
    ctx.fillStyle = rgba('#981264', 0.65);
    ctx.beginPath(); ctx.moveTo(px(0.12), py(0.30)); ctx.lineTo(px(0.27), py(0.30)); ctx.lineTo(px(0.34), py(0.68)); ctx.lineTo(px(0.18), py(0.68)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px(0.73), py(0.30)); ctx.lineTo(px(0.88), py(0.30)); ctx.lineTo(px(0.82), py(0.68)); ctx.lineTo(px(0.66), py(0.68)); ctx.closePath(); ctx.fill();
    // 3 gờ xếp ly sáng nổi khối hướng về đáy (#F676C6 / #FFA0DC)
    [[0.29, 0.38, 0.34, 0.41], [0.46, 0.54, 0.47, 0.53], [0.62, 0.71, 0.59, 0.66]].forEach(function (pl) {
      ctx.fillStyle = rgba('#F884CE', 0.72);
      ctx.beginPath();
      ctx.moveTo(px(pl[0]), py(0.32)); ctx.lineTo(px(pl[1]), py(0.32));
      ctx.lineTo(px(pl[3]), py(0.67)); ctx.lineTo(px(pl[2]), py(0.67));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#8C0E5B', 0.38); ctx.lineWidth = Math.max(1.3, tf.s * 0.008);
      ctx.beginPath(); ctx.moveTo(px(pl[1]), py(0.34)); ctx.lineTo(px(pl[3]), py(0.66)); ctx.stroke();
    });
    // Bóng đổ viền kem cam trùm lên mép trên cốc
    ctx.fillStyle = rgba('#6E0B46', 0.44);
    ctx.fillRect(px(0.10), py(0.28), tf.s * 0.80, tf.s * 0.09);
    ctx.restore();
  }
  function cupcakeFrostingDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Viền bóng caramel đậm dưới chân múi kem (#C45B24)
    ctx.fillStyle = '#C45B24';
    ctx.beginPath();
    ctx.moveTo(px(0.06), py(0.52));
    ctx.quadraticCurveTo(px(0.24), py(0.555), px(0.49), py(0.545));
    ctx.quadraticCurveTo(px(0.75), py(0.560), px(0.94), py(0.52));
    ctx.lineTo(px(0.94), py(0.66)); ctx.lineTo(px(0.06), py(0.66));
    ctx.closePath(); ctx.fill();
    // Tai cắm quai giỏ màu cam đất bo cong mềm mại góc trái (#CE6830) giống IconCupcakeHeart.png
    ctx.fillStyle = '#CE6830';
    ctx.beginPath();
    ctx.moveTo(px(0.18), py(0.41));
    ctx.quadraticCurveTo(px(0.215), py(0.35), px(0.245), py(0.39));
    ctx.quadraticCurveTo(px(0.238), py(0.455), px(0.205), py(0.452));
    ctx.quadraticCurveTo(px(0.182), py(0.445), px(0.18), py(0.41));
    ctx.closePath(); ctx.fill();
    // Mảng highlight vàng bơ sáng giữa đỉnh xoáy kem (#FFBE6E / #FFD59E)
    ctx.fillStyle = rgba('#FFC476', 0.85);
    ctx.beginPath();
    ctx.ellipse(px(0.48), py(0.42), tf.s * 0.17, tf.s * 0.065, -0.08, 0, Math.PI * 2);
    ctx.fill();
    // Bóng đổ mềm của trái tim đỏ xuống sườn phải lớp kem
    ctx.fillStyle = rgba('#8E2414', 0.34);
    ctx.beginPath();
    ctx.ellipse(px(0.71), py(0.40), tf.s * 0.14, tf.s * 0.055, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function cupcakeHeartDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Viền bóng đỏ thẫm cel-shade phía dưới-phải và mép trái trái tim (#AC0A14)
    ctx.fillStyle = rgba('#9E0A12', 0.72);
    ctx.beginPath();
    ctx.moveTo(px(0.70), py(0.30));
    ctx.lineTo(px(0.90), py(0.42));
    ctx.lineTo(px(0.65), py(0.84));
    ctx.lineTo(px(0.14), py(0.82));
    ctx.quadraticCurveTo(px(0.56), py(0.60), px(0.70), py(0.30));
    ctx.closePath(); ctx.fill();
    // Hai vệt highlight hồng đào đặc trưng của IconCupcakeHeart.png trên hai thùy tim
    ctx.fillStyle = rgba('#FF8E90', 0.88);
    ctx.beginPath(); ctx.ellipse(px(0.37), py(0.36), tf.s * 0.095, tf.s * 0.068, -0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px(0.64), py(0.46), tf.s * 0.065, tf.s * 0.044, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba('#FFDADA', 0.78);
    ctx.beginPath(); ctx.ellipse(px(0.35), py(0.34), tf.s * 0.045, tf.s * 0.028, -0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Decor Màn 3 Color Page (ICON-duck.png): thân vịt vàng nổi khối cánh & highlight, đầu & mỏ cam san hô bóng, sóng xanh đậm 2 tầng.
  function duckBodyDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Mảng vàng sẫm cel-shading bên đuôi trái & dưới lườn bụng (#D4AC0A)
    ctx.fillStyle = rgba('#CF9F06', 0.65);
    ctx.beginPath();
    ctx.moveTo(px(0.02), py(0.40));
    ctx.lineTo(px(0.28), py(0.43));
    ctx.quadraticCurveTo(px(0.24), py(0.58), px(0.36), py(0.64));
    ctx.quadraticCurveTo(px(0.54), py(0.68), px(0.72), py(0.58));
    ctx.lineTo(px(0.72), py(0.78));
    ctx.lineTo(px(0.02), py(0.78));
    ctx.closePath(); ctx.fill();
    // Cánh vịt cong màu vàng tươi nổi bật lên trên đuôi
    ctx.fillStyle = '#FAE02C';
    ctx.beginPath();
    ctx.moveTo(px(0.18), py(0.44));
    ctx.quadraticCurveTo(px(0.34), py(0.48), px(0.47), py(0.42));
    ctx.quadraticCurveTo(px(0.66), py(0.42), px(0.65), py(0.55));
    ctx.quadraticCurveTo(px(0.52), py(0.66), px(0.30), py(0.61));
    ctx.quadraticCurveTo(px(0.18), py(0.56), px(0.18), py(0.44));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#B88E06', 0.45); ctx.lineWidth = Math.max(1.4, tf.s * 0.008);
    ctx.beginPath();
    ctx.moveTo(px(0.25), py(0.59));
    ctx.quadraticCurveTo(px(0.49), py(0.66), px(0.64), py(0.54));
    ctx.stroke();
    // Highlight kem vàng dọc vai cánh & ngực vịt
    ctx.fillStyle = rgba('#FFF8B8', 0.66);
    ctx.beginPath(); ctx.ellipse(px(0.56), py(0.50), tf.s * 0.032, tf.s * 0.068, -0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px(0.74), py(0.56), tf.s * 0.032, tf.s * 0.072, -0.22, 0, Math.PI * 2); ctx.fill();
    // Bóng đổ nhẹ cổ vịt
    ctx.fillStyle = rgba('#A88004', 0.30);
    ctx.beginPath(); ctx.ellipse(px(0.67), py(0.33), tf.s * 0.085, tf.s * 0.038, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function duckHeadDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Cel-shade gáy & cằm trái (#D4AC0A)
    ctx.fillStyle = rgba('#CF9F06', 0.60);
    ctx.beginPath();
    ctx.moveTo(px(0.18), py(0.10)); ctx.lineTo(px(0.50), py(0.10));
    ctx.quadraticCurveTo(px(0.34), py(0.28), px(0.39), py(0.50));
    ctx.quadraticCurveTo(px(0.44), py(0.64), px(0.58), py(0.72));
    ctx.lineTo(px(0.18), py(0.72));
    ctx.closePath(); ctx.fill();
    // Vệt sáng trán vịt (#FFF8B8)
    ctx.fillStyle = rgba('#FFF8B8', 0.72);
    ctx.beginPath(); ctx.ellipse(px(0.59), py(0.22), tf.s * 0.085, tf.s * 0.035, 0.58, 0, Math.PI * 2); ctx.fill();
    // Mỏ cam san hô bóng bẩy 2 tông nằm khớp phần mũi phải của đầu vịt (clipTo 6 cắt gọn sát viền)
    ctx.fillStyle = '#EB7A42';
    ctx.beginPath();
    ctx.moveTo(px(0.76), py(0.32));
    ctx.quadraticCurveTo(px(0.70), py(0.47), px(0.68), py(0.62));
    ctx.lineTo(px(1.02), py(0.62));
    ctx.lineTo(px(1.02), py(0.32));
    ctx.closePath(); ctx.fill();
    // Nửa dưới mỏ màu cam đất đậm (#BE4C1E)
    ctx.fillStyle = '#BE4C1E';
    ctx.beginPath();
    ctx.moveTo(px(0.70), py(0.51));
    ctx.quadraticCurveTo(px(0.84), py(0.52), px(0.98), py(0.49));
    ctx.lineTo(px(1.02), py(0.62));
    ctx.lineTo(px(0.68), py(0.62));
    ctx.closePath(); ctx.fill();
    // Highlight mỏ trên & viền phân cách
    ctx.fillStyle = rgba('#FFC6A2', 0.65);
    ctx.beginPath(); ctx.ellipse(px(0.84), py(0.42), tf.s * 0.048, tf.s * 0.020, 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba('#7E2A0A', 0.55); ctx.lineWidth = Math.max(1.3, tf.s * 0.008);
    ctx.beginPath(); ctx.moveTo(px(0.76), py(0.34)); ctx.quadraticCurveTo(px(0.71), py(0.47), px(0.69), py(0.60)); ctx.stroke();
    ctx.restore();
  }
  function duckEyeDecor(p, k) {
    var sc = Math.max(0.01, k);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.arc(0, 0, 7.6, 0, 7);
    ctx.fillStyle = '#181A20'; ctx.fill();
    ctx.beginPath(); ctx.arc(-2.3, -2.5, 2.3, 0, 7);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
  }
  function duckWavesDecor(tf, k) {
    var al = clamp(k, 0, 1);
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Tầng bóng nước sâu xanh dương đậm phía đáy gợn sóng (#062E78)
    ctx.fillStyle = rgba('#062B72', 0.70);
    ctx.beginPath();
    ctx.moveTo(px(0.04), py(0.50));
    ctx.quadraticCurveTo(px(0.24), py(0.54), px(0.50), py(0.52));
    ctx.quadraticCurveTo(px(0.76), py(0.54), px(0.96), py(0.50));
    ctx.lineTo(px(0.96), py(0.66)); ctx.lineTo(px(0.04), py(0.66));
    ctx.closePath(); ctx.fill();
    // Vệt ánh nước xanh da trời bo cong theo 4 đỉnh sóng tròn
    ctx.strokeStyle = rgba('#66A6FA', 0.58); ctx.lineWidth = Math.max(2.0, tf.s * 0.011);
    [[0.10, 0.44, 0.20, 0.44], [0.30, 0.43, 0.44, 0.43], [0.56, 0.43, 0.70, 0.43], [0.80, 0.44, 0.90, 0.44]].forEach(function (w) {
      ctx.beginPath(); ctx.moveTo(px(w[0]), py(w[1])); ctx.quadraticCurveTo(px((w[0] + w[2]) * 0.5), py(w[1] - 0.032), px(w[2]), py(w[3])); ctx.stroke();
    });
    ctx.restore();
  }
  function bonsaiPotLegsDecor(tf, al) {
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[0.295, 0.372], [0.648, 0.725]].forEach(function (xr) {
      var x0 = xr[0], x1 = xr[1], y0 = 0.578, y1 = 0.654;
      ctx.beginPath();
      ctx.moveTo(px(x0), py(y0)); ctx.lineTo(px(x1), py(y0));
      ctx.lineTo(px(x1 - 0.008), py(y1 - 0.006));
      ctx.quadraticCurveTo(px((x0 + x1) * 0.5), py(y1 + 0.004), px(x0 + 0.008), py(y1 - 0.006));
      ctx.closePath();
      ctx.fillStyle = '#DFAA36'; ctx.fill();
      ctx.fillStyle = rgba('#9C6810', 0.48);
      ctx.fillRect(px(x0 + 0.003), py(y0), px(x1 - 0.003) - px(x0 + 0.003), py(y0 + 0.024) - py(y0));
      ctx.strokeStyle = rgba('#5E3E08', 0.85); ctx.lineWidth = Math.max(2.0, tf.s * 0.009);
      ctx.stroke();
    });
    ctx.restore();
  }
  function bonsaiPotDecor(tf, al) {
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Vành miệng chậu vàng sáng phía trên + đường gờ bóng đổ ngăn cách với thân chậu
    ctx.fillStyle = rgba('#FFE28A', 0.82);
    ctx.beginPath();
    ctx.moveTo(px(0.05), py(0.375)); ctx.lineTo(px(0.95), py(0.375));
    ctx.lineTo(px(0.95), py(0.448));
    ctx.quadraticCurveTo(px(0.50), py(0.456), px(0.05), py(0.448));
    ctx.closePath(); ctx.fill();
    // Vệt sáng bóng men gốm trên mép trên chậu
    ctx.strokeStyle = rgba('#FFF8DC', 0.80); ctx.lineWidth = Math.max(2.2, tf.s * 0.011);
    ctx.beginPath(); ctx.moveTo(px(0.14), py(0.402)); ctx.lineTo(px(0.72), py(0.402)); ctx.stroke();
    // Gờ khuất dưới vành miệng chậu
    ctx.strokeStyle = rgba('#B87D14', 0.72); ctx.lineWidth = Math.max(2.0, tf.s * 0.009);
    ctx.beginPath(); ctx.moveTo(px(0.08), py(0.448)); ctx.quadraticCurveTo(px(0.50), py(0.456), px(0.92), py(0.448)); ctx.stroke();
    // Mảng bóng cel bên phải và đáy chậu gốm (#C98C1A)
    ctx.fillStyle = rgba('#C98C1A', 0.44);
    ctx.beginPath();
    ctx.moveTo(px(0.66), py(0.448)); ctx.lineTo(px(0.94), py(0.448));
    ctx.lineTo(px(0.90), py(0.64)); ctx.lineTo(px(0.16), py(0.64));
    ctx.lineTo(px(0.18), py(0.556));
    ctx.quadraticCurveTo(px(0.56), py(0.578), px(0.66), py(0.448));
    ctx.closePath(); ctx.fill();
    // Vệt ánh men dọc má trái chậu
    ctx.fillStyle = rgba('#FFF2BA', 0.45);
    ctx.beginPath(); ctx.ellipse(px(0.245), py(0.515), Math.max(3, tf.s * 0.022), Math.max(5, tf.s * 0.036), -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function bonsaiTrunkDecor(tf, al) {
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Bóng vỏ cây sẫm bên phải và gầm nhánh Y (#7C3216)
    ctx.fillStyle = rgba('#7C3216', 0.46);
    ctx.beginPath();
    ctx.moveTo(px(0.68), py(0.20)); ctx.lineTo(px(0.92), py(0.20));
    ctx.lineTo(px(0.74), py(0.88)); ctx.lineTo(px(0.48), py(0.88));
    ctx.quadraticCurveTo(px(0.57), py(0.62), px(0.54), py(0.40));
    ctx.quadraticCurveTo(px(0.64), py(0.32), px(0.68), py(0.20));
    ctx.closePath(); ctx.fill();
    // Viền sáng nắng phía trái thân bonsai
    ctx.strokeStyle = rgba('#EEB08F', 0.65); ctx.lineWidth = Math.max(2.0, tf.s * 0.022);
    ctx.beginPath();
    ctx.moveTo(px(0.275), py(0.20));
    ctx.quadraticCurveTo(px(0.44), py(0.39), px(0.38), py(0.54));
    ctx.quadraticCurveTo(px(0.31), py(0.69), px(0.245), py(0.80));
    ctx.stroke();
    // Đường vân vỏ cây & mắt xoắn bonsai đặc trưng
    ctx.strokeStyle = rgba('#6D2B14', 0.48); ctx.lineWidth = Math.max(1.5, tf.s * 0.015);
    ctx.beginPath(); ctx.moveTo(px(0.45), py(0.42)); ctx.quadraticCurveTo(px(0.50), py(0.56), px(0.38), py(0.76)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0.57), py(0.52)); ctx.quadraticCurveTo(px(0.58), py(0.68), px(0.55), py(0.80)); ctx.stroke();
    ctx.beginPath(); ctx.arc(px(0.44), py(0.62), Math.max(2.5, tf.s * 0.036), 0.3, Math.PI * 1.65); ctx.stroke();
    ctx.restore();
  }
  function bonsaiMossDecor(tf, al) {
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Tầng rêu sẫm phía chân sát miệng chậu
    ctx.fillStyle = rgba('#225E0E', 0.46);
    ctx.beginPath();
    ctx.moveTo(px(0.14), py(0.545));
    ctx.quadraticCurveTo(px(0.52), py(0.565), px(0.88), py(0.565));
    ctx.lineTo(px(0.88), py(0.66)); ctx.lineTo(px(0.14), py(0.66));
    ctx.closePath(); ctx.fill();
    // 3 vệt sáng xanh non ôm đỉnh 3 ụ rêu
    ctx.strokeStyle = rgba('#B2F288', 0.72); ctx.lineWidth = Math.max(1.8, tf.s * 0.018);
    [[0.25, 0.51, 0.33, 0.45, 0.40, 0.49], [0.44, 0.43, 0.52, 0.39, 0.60, 0.44], [0.64, 0.49, 0.71, 0.47, 0.78, 0.54]].forEach(function (a) {
      ctx.beginPath(); ctx.moveTo(px(a[0]), py(a[1])); ctx.quadraticCurveTo(px(a[2]), py(a[3]), px(a[4]), py(a[5])); ctx.stroke();
    });
    // Cọng rêu nhỏ tạo chất liệu mềm
    ctx.strokeStyle = rgba('#1D520A', 0.36); ctx.lineWidth = Math.max(1.2, tf.s * 0.011);
    [[0.46, 0.55, 0.44, 0.50], [0.55, 0.54, 0.56, 0.49], [0.66, 0.57, 0.68, 0.53]].forEach(function (g) {
      ctx.beginPath(); ctx.moveTo(px(g[0]), py(g[1])); ctx.lineTo(px(g[2]), py(g[3])); ctx.stroke();
    });
    ctx.restore();
  }
  function bonsaiCanopyDecor(tf, al) {
    var px = function (u) { return tf.ox + u * tf.s; }, py = function (v) { return tf.oy + v * tf.s; };
    ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Tầng bóng gầm xanh đậm uốn lượn đáy tán lá bonsai (#2D8018)
    ctx.fillStyle = rgba('#2D8018', 0.46);
    ctx.beginPath();
    ctx.moveTo(px(0.08), py(0.55));
    ctx.quadraticCurveTo(px(0.26), py(0.62), px(0.44), py(0.59));
    ctx.quadraticCurveTo(px(0.64), py(0.63), px(0.76), py(0.54));
    ctx.quadraticCurveTo(px(0.84), py(0.47), px(0.92), py(0.48));
    ctx.lineTo(px(0.94), py(0.75)); ctx.lineTo(px(0.08), py(0.75));
    ctx.closePath(); ctx.fill();
    // Đường vòm ngăn múi tán lá bên trong
    ctx.strokeStyle = rgba('#318A1C', 0.42); ctx.lineWidth = Math.max(1.8, tf.s * 0.0085);
    ctx.beginPath(); ctx.moveTo(px(0.24), py(0.61)); ctx.quadraticCurveTo(px(0.34), py(0.51), px(0.48), py(0.53)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0.58), py(0.55)); ctx.quadraticCurveTo(px(0.70), py(0.47), px(0.81), py(0.55)); ctx.stroke();
    // Vệt nắng xanh cốm trên đỉnh và gò tán trái
    ctx.strokeStyle = rgba('#AEEC8E', 0.72); ctx.lineWidth = Math.max(2.2, tf.s * 0.011);
    ctx.beginPath(); ctx.moveTo(px(0.32), py(0.395)); ctx.quadraticCurveTo(px(0.49), py(0.352), px(0.66), py(0.398)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0.155), py(0.535)); ctx.quadraticCurveTo(px(0.21), py(0.455), px(0.295), py(0.445)); ctx.stroke();
    // Cụm điểm lá sáng tạo nhịp khối tùng
    ctx.fillStyle = rgba('#C2F4A4', 0.65);
    [[0.39, 0.45, 0.011], [0.43, 0.435, 0.008], [0.66, 0.455, 0.010], [0.70, 0.445, 0.007], [0.22, 0.515, 0.009]].forEach(function (d) {
      ctx.beginPath(); ctx.arc(px(d[0]), py(d[1]), Math.max(1.8, tf.s * d[2]), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  // Viền gợi ý chỗ đặt mảnh: nét trắng lót dưới nét đứt đậm để nổi trên cả nền lẫn mảnh đã ghép.
  function drawSlotHint(i, alpha) {
    var tf = placeOf(i), pulse = 0.75 + 0.25 * Math.sin(clock * 4);
    ctx.save(); ctx.globalAlpha = alpha;
    outlinePath(LV[i].outline, tf.ox, tf.oy, tf.s);
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * pulse + ')'; ctx.stroke();
    ctx.setLineDash([7, 6]); ctx.lineDashOffset = -clock * 12; ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(C.ink, 0.65 * pulse); ctx.stroke();
    ctx.restore();
  }
  // Màn thưởng: cảnh chính (rung nhẹ lúc va chạm), bàn ép, chớp sáng, vệt lóa quét, rồi nhãn "Hoàn thành!" không rung.
  function drawReward() {
    var shx = 0, shy = 0, sa = clock - (R.shakeT || -9);
    if (!reduce && sa >= 0 && sa < 0.2) { var amp = 3 * (1 - sa / 0.2); shx = Math.sin(sa * 90) * amp; shy = Math.cos(sa * 77) * amp; }
    ctx.save(); ctx.translate(shx, shy);
    drawRewardScene();
    drawPressPlate();
    var fa = clock - (R.flashT || -9);
    if (fa >= 0 && fa < 0.18) {
      var fg = ctx.createRadialGradient(195, 395, 10, 195, 395, 175);
      fg.addColorStop(0, 'rgba(255,255,255,' + 0.6 * (1 - fa / 0.18) + ')'); fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg; ctx.fillRect(0, 200, W, 400);
    }
    drawSheen();
    ctx.restore();
    drawDoneLabel();
  }
  // Con dấu tròn đúng cỡ vải nền (r 165 tại 195,395), nhìn từ trên xuống: vành gỗ, mặt nỉ, núm cầm ở giữa có điểm sáng.
  // Hạ xuống: to 1,35 lần và mờ, nhỏ dần về đúng cỡ (nhanh dần như rơi), bóng tròn co lại và đậm dần.
  // Chạm: khớp mép nền, nén 3% rồi về. Nhấc: to ra 1,4 lần và mờ đi về phía người chơi.
  function drawPressPlate() {
    if (R.phase !== 'press') return;
    var t = R.t, cx = 195, cy = 395, RS = 165, sc, al, sh;
    if (t < 0.2) { var u0 = t / 0.2; sc = lerp(1.35, 1, u0 * u0); al = 0.3 + 0.7 * u0; sh = u0; }
    else if (t < 0.3) { sc = 1 - 0.03 * Math.sin(Math.PI * (t - 0.2) / 0.1); al = 1; sh = 1; }
    else { var u1 = clamp((t - 0.3) / 0.3, 0, 1); sc = lerp(1, 1.4, easeOut(u1)); al = 1 - u1; sh = 1 - u1; }
    if (reduce) sc = 1;
    if (al <= 0.01) return;
    ctx.save();
    // bóng tròn trên nền: càng gần càng nhỏ, sát và đậm
    var off = 14 * (1 - sh);
    ctx.beginPath(); ctx.arc(cx + off * 0.5, cy + off, RS * lerp(1.12, 1.01, sh), 0, 7); ctx.fillStyle = 'rgba(74,59,53,' + (0.24 * sh) + ')'; ctx.fill();
    ctx.globalAlpha = al;
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    // vành gỗ
    var wg = ctx.createLinearGradient(-RS, -RS, RS, RS);
    wg.addColorStop(0, '#E3B47F'); wg.addColorStop(0.5, '#C98F58'); wg.addColorStop(1, '#9E6A3C');
    ctx.beginPath(); ctx.arc(0, 0, RS, 0, 7); ctx.fillStyle = wg; ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(C.ink, 0.55); ctx.stroke();
    // mặt nỉ kem, sáng nhẹ phía trên trái
    var fg = ctx.createRadialGradient(-RS * 0.3, -RS * 0.35, RS * 0.05, 0, 0, RS * 0.9);
    fg.addColorStop(0, '#FFF9EE'); fg.addColorStop(1, '#EBDCC4');
    ctx.beginPath(); ctx.arc(0, 0, RS - 14, 0, 7); ctx.fillStyle = fg; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(120,80,45,0.35)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, RS - 24, 0, 7); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.thread, 0.7); ctx.stroke(); ctx.setLineDash([]);
    // sáng mép vành phía trên trái
    ctx.beginPath(); ctx.arc(0, 0, RS - 4, Math.PI * 1.05, Math.PI * 1.6); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
    // núm cầm: bóng, thân gỗ, điểm sáng
    ctx.beginPath(); ctx.arc(3, 5, 36, 0, 7); ctx.fillStyle = 'rgba(74,59,53,0.22)'; ctx.fill();
    var kg = ctx.createRadialGradient(-10, -12, 3, 0, 0, 36);
    kg.addColorStop(0, '#E7BC8A'); kg.addColorStop(0.6, '#BE8550'); kg.addColorStop(1, '#8F5E33');
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fillStyle = kg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.ink, 0.5); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-11, -13, 10, 6, -0.6, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
  }
  // Vết ép tròn nổi gần mép nền, cùng màu nền: một nét tối mờ lệch dưới phải và một nét sáng lệch trên trái, hiện dần
  // ngay khi con dấu nhấc lên và giữ tới hết màn thưởng.
  function drawPressRing() {
    if (!R.ringT) return;
    var k = reduce ? 1 : clamp((clock - R.ringT) / 0.25, 0, 1);
    ctx.save(); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(196, 396.5, 160, 0, 7); ctx.strokeStyle = 'rgba(74,59,53,' + 0.14 * k + ')'; ctx.stroke();
    ctx.beginPath(); ctx.arc(194, 393.5, 160, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * k + ')'; ctx.stroke();
    ctx.restore();
  }
  // Vệt lóa chéo quét qua sản phẩm một lần ngay sau cú ép (0,5 s), cắt theo từng mảnh.
  function drawSheen() {
    var st = clock - (R.sheenT || -9);
    if (st < 0 || st >= 0.5 || reduce) return;
    var u = st / 0.5, x = lerp(40, 350, easeInOut(u));
    backToFront().forEach(function (li) {
      var tf = placeOf(li);
      ctx.save(); outlinePath(LV[li].outline, tf.ox, tf.oy, tf.s); ctx.clip();
      ctx.translate(x, 395); ctx.rotate(0.45);
      var g = ctx.createLinearGradient(-34, 0, 34, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.6 * Math.sin(Math.PI * u)) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-34, -320, 68, 640);
      ctx.restore();
    });
  }
  // Nhãn vải "Hoàn thành!" bật ra phía trên sản phẩm (phóng vượt rồi về 1, hơi nghiêng), giữ tới hết màn thưởng.
  function drawDoneLabel() {
    if (!R.labelT) return;
    var lt = clock - R.labelT, k = reduce ? 1 : easeBack(clamp(lt / 0.35, 0, 1));
    if (k <= 0.01) return;
    // Đẩy nhẹ lên khoảng trống phía trên vòng tròn sân khấu để không che mất quả cherry hay cuống dâu
    var y = clamp(R.top - 66, 118, 168);
    ctx.save(); ctx.translate(195, y); ctx.rotate(-0.06); ctx.scale(k, k);
    ctx.save(); ctx.shadowColor = 'rgba(74,59,53,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    rr(-94, -25, 188, 50, 14); ctx.fillStyle = '#FFF6E8'; ctx.fill(); ctx.restore();
    rr(-94, -25, 188, 50, 14); ctx.lineWidth = 2.4; ctx.strokeStyle = C.ink; ctx.stroke();
    rr(-87, -18, 174, 36, 10); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.strokeStyle = C.thread; ctx.stroke(); ctx.setLineDash([]);
    text('Hoàn thành!', 0, 2, 22, 800, C.ink, 'center');
    ctx.restore();
  }
  function drawRewardScene() {
    var enter = clamp(R.t / 0.6, 0, 1), a = R.phase === 'enter' ? easeOut(enter) : 1;
    ctx.save(); ctx.globalAlpha = a;
    // vải nền tròn bằng nỉ
    var deep = R.phase === 'reveal' || R.phase === 'decor' || R.phase === 'done';
    ctx.beginPath(); ctx.arc(195, 395, 165, 0, 7); ctx.fillStyle = C.base; ctx.fill();
    ctx.beginPath(); ctx.arc(195, 395, 155, 0, 7); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(C.thread, 0.8); ctx.stroke(); ctx.setLineDash([]);
    drawPressRing();
    // ô mờ của từng mảnh trên khung; mảnh đã ghép thì bỏ ô của nó
    product().levels.forEach(function (i) {
      if (R.pieces.some(function (pc) { return pc.i === i && pc.placed; })) return;
      var tf = placeOf(i);
      outlinePath(LV[i].outline, tf.ox, tf.oy, tf.s); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.ink, 0.3); ctx.stroke(); ctx.setLineDash([]);
    });
    // khay đặt mảnh
    rr(20, 628, 350, 152, 24); ctx.fillStyle = rgba(C.paper, 0.9); ctx.fill();
    ctx.restore();

    // mảnh dưới vẽ trước, mảnh trên đè lên (ốc quế rồi viên kem; thân nấm rồi mũ)
    var order = R.phase === 'place' || R.phase === 'enter' ? R.pieces : backToFront().map(function (li) { return R.pieces.filter(function (p) { return p.i === li; })[0]; });
    var placing = R.phase === 'place' || R.phase === 'enter';
    ctx.save(); if (!placing) productTf();
    function drawPc(pc) {
      var lv = LV[pc.i], s = pc.tf.s * pc.sc, dragging = R.drag && R.drag.pc === pc;
      drawPiece(pc.i, pc.x - lv.cen[0] * s, pc.y - lv.cen[1] * s, s, 1, dragging, 0.6, 0);
    }
    if (placing) {
      // Mảnh đã ghép vẽ trước, rồi viền gợi ý của mảnh chưa ghép đè lên để vẫn thấy chỗ đặt,
      // cuối cùng là mảnh còn trong khay hoặc đang cầm, nằm trên cùng.
      order.forEach(function (pc) { if (pc.placed) drawPc(pc); });
      order.forEach(function (pc) { if (!pc.placed) drawSlotHint(pc.i, a); });
      order.forEach(function (pc) { if (!pc.placed) drawPc(pc); });
    } else order.forEach(function (pc) { drawPc(pc); drawPieceStitches(pc.i); });
    if (R.phase === 'stitch' || R.phase === 'cinch' || R.phase === 'tapReady') {
      if (R.phase === 'stitch' && R.stitches && R.stitches.length > 0) {
        var curIdx = Math.min(R.stitches.length - 1, Math.floor(R.stDone));
        var st = R.stitches[curIdx];
        var dip = Math.sin((R.stDone % 1) * Math.PI) * 4;
        drawNeedle(st.m[0], st.m[1] - dip, st.ang);
      } else if (R.phase === 'cinch' && R.stitches && R.stitches.length > 0 && STITCH_KIND !== 'none') {
        var lastSt = R.stitches[R.stitches.length - 1];
        var pullProgress = clamp(R.cinch / 0.28, 0, 1);
        var nx = lastSt.m[0] + Math.cos(lastSt.ang + Math.PI / 2) * (12 + pullProgress * 22);
        var ny = lastSt.m[1] + Math.sin(lastSt.ang + Math.PI / 2) * (12 + pullProgress * 22);
        drawNeedle(nx, ny, lastSt.ang + Math.PI / 2);
      }
    }
    ctx.restore();
    var DEC = DECOR[product().id] || [];
    function drawDecors(filterFn) {
      for (var d = 0; d < R.decor.length; d++) {
        var item = DEC[d];
        if (!item || !filterFn(item)) continue;
        var k = easeBack(clamp((clock - R.decor[d]) / 0.3, 0, 1));
        item.draw(item.at(), k);
      }
    }
    if (deep) {
      // màu loang từ tâm con dấu ra đúng mép nền (r 165) với nền bổ trợ dịu theo từng sản phẩm (Hướng A)
      var RV = 166 * R.reveal, sBg = STAGE_BG[product().id] || C.baseDeep;
      ctx.save(); ctx.beginPath(); ctx.arc(195, 395, RV, 0, 7); ctx.clip();
      var sGrad = ctx.createRadialGradient(195, 395 - 165 * 0.18, 165 * 0.08, 195, 395, 165);
      sGrad.addColorStop(0, mix(sBg, '#FFFFFF', 0.42)); sGrad.addColorStop(1, sBg);
      ctx.beginPath(); ctx.arc(195, 395, 165, 0, 7); ctx.fillStyle = sGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(195, 395, 155, 0, 7); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.stroke(); ctx.setLineDash([]);
      drawPressRing();
      ctx.save(); ctx.beginPath(); ctx.ellipse(195, Math.min(530, R.base[1] - 2), 58, 10, 0, 0, 7); ctx.fillStyle = 'rgba(60,40,35,0.10)'; ctx.fill(); ctx.restore();
      backToFront().forEach(function (li) {
        var tf = placeOf(li);
        drawDecors(function (it) { return it.before === li; });
        drawPiece(li, tf.ox, tf.oy, tf.s, 1, false, 1, 1, function () {
          drawDecors(function (it) { return it.clipTo === li; });
        });
        drawPieceStitches(li);
        drawDecors(function (it) { return it.after === li; });
      });
      ctx.restore();
      if (R.phase === 'reveal') {
        // mép màu loang: vòng trắng dày có viền tối mờ để nổi trên nền sáng, kèm chớp trắng ở đầu
        var rr2 = Math.max(1, RV), fa = 1 - R.reveal;
        var g = ctx.createRadialGradient(195, 395, 0, 195, 395, rr2);
        g.addColorStop(0, 'rgba(255,255,255,' + 0.55 * fa * fa + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(195, 395, rr2, 0, 7); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(74,59,53,' + 0.16 * fa + ')'; ctx.stroke();
        ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, fa * 1.4) + ')'; ctx.stroke();
        ctx.beginPath(); ctx.arc(195, 395, rr2 * 0.82, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * fa + ')'; ctx.stroke();
      }
    }
    drawDecors(function (it) { return it.clipTo === undefined && it.after === undefined && it.before === undefined; });
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
      if (hasNext()) {
        ctx.beginPath(); ctx.moveTo(48, -8); ctx.lineTo(56, 0); ctx.lineTo(48, 8); ctx.stroke();
        text(nextLabel(), -6, 1, 19, 800, '#fff', 'center');
      } else {
        ctx.beginPath(); ctx.arc(-46, 0, 9, -0.4, 4.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-36, -9); ctx.lineTo(-37.5, -1); ctx.lineTo(-44, -6); ctx.stroke();
        text('Chơi lại', 10, 1, 19, 800, '#fff', 'center');
      }
      ctx.restore();
    }
  }
  function drawSeam(p) {
    if (!R) return;
    if (R.stitches && R.stitches.length) {
      var count = (R.phase === 'stitch') ? Math.min(R.stitches.length, Math.floor(R.stDone)) : R.stitches.length;
      if (count <= 0) return;
      ctx.save(); ctx.lineCap = 'round';
      // Hiệu ứng rút chỉ: nếp nhăn vải hai bên mũi may co nhăn rồi duỗi phẳng
      if (R.pucker > 0.02) {
        var puck = R.pucker;
        ctx.lineWidth = 1.8;
        for (var i = 0; i < count; i++) {
          var st = R.stitches[i], nx = st.nx, ny = st.ny, mx = st.m[0], my = st.m[1];
          var wLen = (6 + (i % 3) * 2.5) * puck;
          ctx.strokeStyle = 'rgba(74,59,53,' + (0.18 * puck) + ')';
          ctx.beginPath();
          ctx.moveTo(mx - nx * wLen, my - ny * wLen);
          ctx.lineTo(mx + nx * wLen, my + ny * wLen);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.28 * puck) + ')';
          ctx.beginPath();
          ctx.moveTo(mx - nx * (wLen * 0.7) + ny * 1.2, my - ny * (wLen * 0.7) - nx * 1.2);
          ctx.lineTo(mx + nx * (wLen * 0.7) + ny * 1.2, my + ny * (wLen * 0.7) - nx * 1.2);
          ctx.stroke();
        }
      }
      // Từng mũi may nổi bật trên mặt vải
      for (var j = 0; j < count; j++) {
        var s = R.stitches[j];
        ctx.beginPath(); ctx.arc(s.a[0], s.a[1], 1.2, 0, 7); ctx.arc(s.b[0], s.b[1], 1.2, 0, 7);
        ctx.fillStyle = 'rgba(74,59,53,0.35)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]);
        ctx.lineWidth = 4.6; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.stroke();
        ctx.lineWidth = 2.4; ctx.strokeStyle = C.mustardDeep; ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (typeof p !== 'number') p = 1;
    if (p <= 0) return;
    var cur = seamPart(p);
    ctx.save(); ctx.lineCap = 'round';
    for (var k = 0; k < R.seams.length; k++) {
      var seam = R.seams[k], q = p >= 1 || k < cur.k ? 1 : (k === cur.k ? cur.p : 0);
      if (q <= 0) continue;
      var end = seamPointOf(seam, q), n = seam.length - 1, upto = Math.floor(q * n);
      ctx.beginPath(); ctx.moveTo(seam[0][0], seam[0][1]);
      for (var ii = 1; ii <= upto; ii++) ctx.lineTo(seam[ii][0], seam[ii][1]);
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
    if (S.scene === 'play') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 230, W, 492);
      ctx.clip();
      drawPlay();
      ctx.restore();
      drawInfo();
      drawBoosters();
    }
    else drawReward();
    drawRipples();
    drawParts();
    drawMenu();
  }

  loadProduct(0);
  var go = function () { requestAnimationFrame(frame); };
  if (document.fonts && document.fonts.load) document.fonts.load('800 16px "Baloo 2"').then(go, go); else go();
})();

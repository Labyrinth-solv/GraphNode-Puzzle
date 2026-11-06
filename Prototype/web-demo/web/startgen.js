/* Sinh vị trí ban đầu của node theo độ khó (dễ, vừa, khó). Chạy sau levels.js, ghi đè trường start (và startX của
   màn gấp) bằng kết quả sinh có hạt giống cố định theo id màn, nên mỗi lần mở đều ra cùng một vị trí.
   Mỗi màn chọn tier và danh sách node kéo được (free); node còn lại khóa ở đúng vị trí lời giải. */
(function (root) {
  'use strict';
  var GN = root.GN || require('./core.js');
  var LEVELS = root.LEVELS || require('./levels.js').LEVELS;

  // maxFree: số node kéo được tối đa của tier. Mỗi màn có thể ghi đè từng số bằng trường gen (vd. gen: { dist: [0.08, 0.1] }),
  // tương ứng ô ghi đè trong Level Editor của bản chính.
  // dist: khoảng cách mỗi node kéo được lệch khỏi vị trí đúng (bề rộng vải); iou: khoảng độ khớp ban đầu chấp nhận,
  // cận trên còn bị kẹp dưới ngưỡng thắng 8 điểm để không thắng ngay; needle: kim lệch khỏi trục (màn gấp).
  var TIERS = {
    easy:   { maxFree: 3, dist: [0.06, 0.12], iou: [0.55, 0.85], needle: [0.05, 0.08] },
    medium: { maxFree: 6, dist: [0.12, 0.22], iou: [0.40, 0.70], needle: [0.08, 0.14] },
    hard:   { maxFree: 9, dist: [0.20, 0.35], iou: [0.25, 0.50], needle: [0.12, 0.20] }
  };
  var MIN_GAP = 0.07, EDGE = 0.06, NEEDLE_MIN = 0.25;

  function rng(seedStr) {
    var h = 2166136261;
    for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  var tmpA = new Uint8Array(GN.N * GN.N), tmpB = new Uint8Array(GN.N * GN.N);
  function mask(l, pos, x, out) {
    GN.region(l, pos, out);
    if (l.fold) { GN.region(l, pos.map(function (p) { return [2 * x - p[0], p[1]]; }), tmpB); for (var i = 0; i < out.length; i++) out[i] |= tmpB[i]; }
    return out;
  }
  function onFold(l, i) { return !!(l.fold && l.fold.chains.some(function (c) { return c[0] === i || c[1] === i; })); }

  function generate(l) {
    var B = TIERS[l.tier]; if (!B || !l.free) return;
    var T = Object.assign({}, B, l.gen || {});
    if (l.free.length > T.maxFree && typeof console !== 'undefined') console.warn('startgen: ' + l.id + ' có ' + l.free.length + ' node kéo, vượt ' + T.maxFree + ' của tier ' + l.tier);
    GN.prepare(l);
    var n = l.sol.length, rand = rng(l.id + ':' + l.tier);
    l.locked = []; for (var i = 0; i < n; i++) if (l.free.indexOf(i) < 0) l.locked.push(i);
    var solX = l.fold ? l.fold.solX : 0;
    var solMask = Uint8Array.from(mask(l, l.sol, solX, tmpA));
    var hi = Math.min(T.iou[1], (l.winThreshold || 0.92) - 0.08), lo = Math.min(T.iou[0], hi - 0.05);
    // kim lệch về phía nửa vải đang có, nhưng không lấn qua node khóa (kim luôn đứng trước mọi node không nằm trên mép gấp)
    var lockMax = NEEDLE_MIN; l.locked.forEach(function (k) { if (!onFold(l, k)) lockMax = Math.max(lockMax, l.sol[k][0] + 0.02); });
    var x0 = l.fold ? Math.min(solX, Math.max(lockMax, solX - (T.needle[0] + rand() * (T.needle[1] - T.needle[0])))) : 0;
    var scale = 1, best = null, bestErr = 9, last = null;
    for (var tries = 0; tries < 400; tries++) {
      var pos = l.sol.map(function (p, k) {
        var f = l.free.indexOf(k) >= 0, d = (T.dist[0] + rand() * (T.dist[1] - T.dist[0])) * scale;
        if (onFold(l, k)) return [x0, f ? clamp(p[1] + (rand() < 0.5 ? -d : d), EDGE, 1 - EDGE) : p[1]];
        if (!f) return p.slice();
        var a = rand() * Math.PI * 2, q = [clamp(p[0] + Math.cos(a) * d, EDGE, 1 - EDGE), clamp(p[1] + Math.sin(a) * d, EDGE, 1 - EDGE)];
        if (l.fold) q[0] = clamp(q[0], 2 * x0 - 0.98, x0 - 0.02);
        return q;
      });
      var ok = true;
      // chỉ xét khoảng cách các cặp có node kéo được; các node khóa đặt sát nhau là do thiết kế
      for (var a2 = 0; a2 < n && ok; a2++) for (var b2 = a2 + 1; b2 < n; b2++) {
        if (l.free.indexOf(a2) < 0 && l.free.indexOf(b2) < 0) continue;
        if (Math.hypot(pos[a2][0] - pos[b2][0], pos[a2][1] - pos[b2][1]) < MIN_GAP) { ok = false; break; }
      }
      last = pos;
      if (!ok) continue;
      var v = GN.iou(mask(l, pos, l.fold ? x0 : 0, tmpA), solMask);
      var err = v > hi ? v - hi : (v < lo ? lo - v : 0);
      if (err < bestErr) { bestErr = err; best = pos; }
      if (err === 0) break;
      scale = clamp(scale * (v > hi ? 1.06 : 0.95), 0.5, 2.5);
    }
    if (!best) best = last; // không có lần nào đạt khoảng cách tối thiểu: vẫn dùng lần thử cuối, node khóa luôn đúng chỗ
    if (best) { l.start = best; l.startIou = GN.iou(mask(l, best, l.fold ? x0 : 0, tmpA), solMask); }
    if (l.fold) l.fold.startX = x0;
  }

  LEVELS.forEach(generate);
  var api = { TIERS: TIERS, generate: generate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GNStartGen = api;
})(this);

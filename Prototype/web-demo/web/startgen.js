/* Sinh vị trí ban đầu của node và độ uốn ban đầu của dây (startBend) theo độ khó (dễ, vừa, khó).
   Chạy sau levels.js, ghi đè trường start, startBend (và startX của màn gấp) bằng kết quả sinh có hạt giống cố định theo id màn. */
(function (root) {
  'use strict';
  var GN = root.GN || require('./core.js');
  var LEVELS = root.LEVELS || require('./levels.js').LEVELS;

  var TIERS = {
    easy:   { maxFree: 3, maxBend: 1, dist: [0.06, 0.12], iou: [0.55, 0.85], needle: [0.05, 0.08] },
    medium: { maxFree: 6, maxBend: 2, dist: [0.12, 0.22], iou: [0.40, 0.70], needle: [0.08, 0.14] },
    hard:   { maxFree: 9, maxBend: 2, dist: [0.20, 0.35], iou: [0.25, 0.50], needle: [0.12, 0.20] }
  };
  // MIN_GAP: khoảng cách tối thiểu giữa một node kéo được và node khác lúc đầu màn (node rộng khoảng 0,075 nên dưới mức này
  // hai node gần như chạm nhau). PIN_CLEAR: node kéo được không bắt đầu trong vùng hút của chốt nào (vùng hút 0,048).
  // Cả hai là số tạm, chờ chốt.
  var MIN_GAP = 0.12, PIN_CLEAR = 0.06, EDGE = 0.06, NEEDLE_MIN = 0.25;

  function rng(seedStr) {
    var h = 2166136261;
    for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  var tmpA = new Uint8Array(GN.N * GN.N), tmpB = new Uint8Array(GN.N * GN.N);
  function mask(l, pos, x, out, bends) {
    GN.region(l, pos, out, bends);
    if (l.fold) {
      var isY = l.fold.axis === 'y';
      var mp = pos.map(function (p) { return isY ? [p[0], 2 * x - p[1]] : [2 * x - p[0], p[1]]; });
      mp._mir = -1;
      GN.region(l, mp, tmpB, bends);
      for (var i = 0; i < out.length; i++) out[i] |= tmpB[i];
    }
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

    // Khởi tạo startBend: các đoạn cong nổi bật bắt đầu ở trạng thái dây căng thẳng (0) để người chơi trực tiếp kéo dây uốn cong
    l.startBend = l.solBend.slice();
    if (!l.bendFree) {
      var cands = [];
      for (var ek = 0; ek < l.ring.length; ek++) {
        if (!GN.inFoldChain(l, ek)) continue;
        var ea = l.ring[ek], eb = l.ring[(ek + 1) % l.ring.length];
        var sh = Math.abs(l.solBend[ek] || 0);
        if (sh < 0.014) continue;
        if (l.free.indexOf(ea) < 0 && l.free.indexOf(eb) < 0) continue;
        var elen = Math.hypot(l.sol[eb][0] - l.sol[ea][0], l.sol[eb][1] - l.sol[ea][1]);
        cands.push({ k: ek, score: sh * (0.6 + elen) });
      }
      cands.sort(function (u, v) { return v.score - u.score; });
      l.bendFree = cands.slice(0, T.maxBend || 1).map(function (c) { return c.k; });
    }
    l.bendFree.forEach(function (ek) { l.startBend[ek] = 0; });

    var solX = l.fold ? l.fold.solX : 0;
    var solMask = Uint8Array.from(mask(l, l.sol, solX, tmpA, l.solBend));
    var bPen = GN.bendPenalty(l, l.startBend);
    if (l.keepStart && l.start && l.start.length === n) {
      l.startIou = Math.max(0, GN.iou(mask(l, l.start, solX, tmpA, l.startBend), solMask) - bPen);
      return;
    }
    var hi = Math.min(T.iou[1], (l.winThreshold || 0.92) - 0.08), lo = Math.min(T.iou[0], hi - 0.05);
    var isY = !!(l.fold && l.fold.axis === 'y'), ax = isY ? 1 : 0;
    var lockMax = NEEDLE_MIN; l.locked.forEach(function (k) { if (!onFold(l, k)) lockMax = Math.max(lockMax, l.sol[k][ax] + 0.02); });
    var x0 = l.fold ? Math.min(solX, Math.max(lockMax, solX - (T.needle[0] + rand() * (T.needle[1] - T.needle[0])))) : 0;
    var scale = 1, best = null, bestErr = 9, last = null;
    for (var tries = 0; tries < 200; tries++) {
      var pos = l.sol.map(function (p, k) {
        var f = l.free.indexOf(k) >= 0, d = (T.dist[0] + rand() * (T.dist[1] - T.dist[0])) * scale;
        if (onFold(l, k)) {
          if (isY) return [f ? clamp(p[0] + (rand() < 0.5 ? -d : d), EDGE, 1 - EDGE) : p[0], x0];
          return [x0, f ? clamp(p[1] + (rand() < 0.5 ? -d : d), EDGE, 1 - EDGE) : p[1]];
        }
        if (!f) return p.slice();
        var a = rand() * Math.PI * 2, q = [clamp(p[0] + Math.cos(a) * d, EDGE, 1 - EDGE), clamp(p[1] + Math.sin(a) * d, EDGE, 1 - EDGE)];
        if (l.fold) q[ax] = clamp(q[ax], 2 * x0 - 0.98, x0 - 0.02);
        return q;
      });
      var ok = true;
      for (var a2 = 0; a2 < n && ok; a2++) for (var b2 = a2 + 1; b2 < n; b2++) {
        if (l.free.indexOf(a2) < 0 && l.free.indexOf(b2) < 0) continue;
        if (Math.hypot(pos[a2][0] - pos[b2][0], pos[a2][1] - pos[b2][1]) < MIN_GAP) { ok = false; break; }
      }
      for (var c2 = 0; c2 < l.free.length && ok; c2++) {
        var fp = pos[l.free[c2]];
        for (var j2 = 0; j2 < n; j2++) if (Math.hypot(fp[0] - l.sol[j2][0], fp[1] - l.sol[j2][1]) < PIN_CLEAR) { ok = false; break; }
      }
      last = pos;
      if (!ok) continue;
      // so khoảng độ khớp của tier với đúng số người chơi thấy trên thanh (đã trừ phạt độ uốn)
      var v = Math.max(0, GN.iou(mask(l, pos, l.fold ? x0 : 0, tmpA, l.startBend), solMask) - bPen);
      var err = v > hi ? v - hi : (v < lo ? lo - v : 0);
      if (err < bestErr) { bestErr = err; best = pos; }
      if (err === 0) break;
      scale = clamp(scale * (v > hi ? 1.06 : 0.95), 0.5, 2.5);
    }
    if (typeof console !== 'undefined') {
      if (!best) console.warn('startgen: ' + l.id + ' không có lần thử nào giữ đủ khoảng cách giữa node và tới chốt, dùng lần thử cuối');
      else if (bestErr > 0) console.warn('startgen: ' + l.id + ' độ khớp ban đầu lệch khoảng tier ' + bestErr.toFixed(3));
    }
    if (!best) best = last;
    if (best) { l.start = best; l.startIou = Math.max(0, GN.iou(mask(l, best, l.fold ? x0 : 0, tmpA, l.startBend), solMask) - bPen); }
    if (l.fold) l.fold.startX = x0;
  }

  LEVELS.forEach(generate);
  var api = { TIERS: TIERS, generate: generate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GNStartGen = api;
})(this);

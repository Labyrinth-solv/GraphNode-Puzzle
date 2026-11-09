/* Lõi luật chơi: hình học thuần, không đụng DOM, chạy được trong Node để kiểm tra số liệu. */
(function (root) {
  'use strict';
  var N = 200, LO = -0.125, HI = 1.125, CELL = (HI - LO) / N, LINE_R = 1.35;

  var line = new Uint8Array(N * N), outside = new Uint8Array(N * N), stack = new Int32Array(N * N);

  function ringIndex(level, i) { return level.ringPos[i]; }
  function ringNext(level, i) { var r = level.ring; return r[(ringIndex(level, i) + 1) % r.length]; }
  function ringPrev(level, i) { var r = level.ring; return r[(ringIndex(level, i) + r.length - 1) % r.length]; }

  function inFoldChain(level, k) {
    if (!level.fold || !level.fold.chains) return true;
    for (var i = 0; i < level.fold.chains.length; i++) {
      var ch = level.fold.chains[i];
      if (k >= ch[0] && k < ch[1]) return true;
    }
    return false;
  }

  function prepare(level) {
    var r = level.ring, n = r.length;
    level.ringPos = [];
    for (var k = 0; k < n; k++) level.ringPos[r[k]] = k;
    level.edges = [];
    for (var j = 0; j < n; j++) level.edges.push([r[j], r[(j + 1) % n], true]);
    for (var m = 0; m < level.inner.length; m++) level.edges.push([level.inner[m][0], level.inner[m][1], false]);
    level.wasCurved = [];
    level.solBend = [];
    for (var e = 0; e < n; e++) {
      var a = r[e], b = r[(e + 1) % n];
      var isStr = !inFoldChain(level, e) || (level.straight && level.straight.indexOf(e) >= 0) || (level.types && (level.types[a] !== 'c' || level.types[b] !== 'c'));
      if (isStr) {
        level.wasCurved.push(false);
        level.solBend.push(0);
      } else {
        level.wasCurved.push(true);
        var A = level.sol[a], B = level.sol[b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
        var nx = -dy / L, ny = dx / L;
        var Ta = tangent(level, level.sol, a), Tb = tangent(level, level.sol, b);
        var h = 0.125 * ((Ta[0] - Tb[0]) * nx + (Ta[1] - Tb[1]) * ny);
        if (Math.abs(h) < 2e-4) h = (h >= 0 ? 1 : -1) * 2e-4;
        level.solBend.push(h);
      }
    }
    return level;
  }

  // Tiếp tuyến Catmull-Rom lấy từ hai láng giềng trên vòng (luật đã chốt trong đặc tả).
  function tangent(level, pos, i) {
    var p = pos[ringPrev(level, i)], q = pos[ringNext(level, i)];
    if (level.fold && level.fold.axis === 'y' && level.fold.chains && level.fold.chains.length) {
      var ch = level.fold.chains[0];
      if (i === ch[0]) return [(q[0] - pos[i][0]) * 1.15, (q[1] - pos[i][1]) * 1.15];
      if (i === ch[1]) return [(pos[i][0] - p[0]) * 1.15, (pos[i][1] - p[1]) * 1.15];
    }
    return [(q[0] - p[0]) * 0.5, (q[1] - p[1]) * 0.5];
  }

  function edgePoly(level, pos, a, b, steps, out, bends) {
    out = out || [];
    out.length = 0;
    var A = pos[a], B = pos[b];
    var n = level.ring.length, ka = level.ringPos[a], kb = level.ringPos[b], k = -1, dir = 1;
    if (ringNext(level, a) === b) { k = ka; dir = 1; }
    else if (ringPrev(level, a) === b) { k = kb; dir = -1; }
    if (k < 0 || !inFoldChain(level, k)) { out.push(A[0], A[1], B[0], B[1]); return out; }
    var bArr = bends || level.solBend;
    var h = (bArr && bArr[k] !== undefined ? bArr[k] : 0) * dir;
    var w = bArr && bArr._waves && bArr._waves[k];
    var wRip = w ? (w.rip || 0) * dir : 0;
    if (Math.abs(h) < 1e-4 && Math.abs(wRip) < 1e-4) { out.push(A[0], A[1], B[0], B[1]); return out; }
    var dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) { out.push(A[0], A[1], B[0], B[1]); return out; }
    var mir = pos._mir || 1;
    var nx = (-dy / L) * mir, ny = (dx / L) * mir;
    var Ta = tangent(level, pos, a), Tb = tangent(level, pos, b), m0Base, m1Base;
    if (dir === 1) { m0Base = Ta; m1Base = Tb; }
    else { m0Base = [-Ta[0], -Ta[1]]; m1Base = [-Tb[0], -Tb[1]]; }
    var kPrev = (k + n - 1) % n, kNext = (k + 1) % n;
    var hPrev = (bArr && bArr[kPrev] !== undefined ? bArr[kPrev] : 0) * dir;
    var hNext = (bArr && bArr[kNext] !== undefined ? bArr[kNext] : 0) * dir;
    var solH = (level.solBend && level.solBend[k] !== undefined ? level.solBend[k] : 0) * dir;
    var wa, wb;
    if (level.wasCurved && level.wasCurved[k] && h * solH >= 0) {
      wa = wb = Math.min(1, Math.abs(h) / Math.max(1e-4, Math.abs(solH) * 0.8));
    } else {
      wa = (h * hPrev > 0) ? Math.min(1, Math.min(Math.abs(h), Math.abs(hPrev)) / 0.025) : 0;
      wb = (h * hNext > 0) ? Math.min(1, Math.min(Math.abs(h), Math.abs(hNext)) / 0.025) : 0;
    }
    var t0x = dx + wa * (m0Base[0] - dx), t0y = dy + wa * (m0Base[1] - dy);
    var t1x = dx + wb * (m1Base[0] - dx), t1y = dy + wb * (m1Base[1] - dy);
    var hBase = 0.125 * ((t0x - t1x) * nx + (t0y - t1y) * ny);
    var delta = 4 * (h - hBase);
    var wSkew = w ? (w.skew || 0) * dir : 0;
    var asym = -2.8 * wSkew * (4 * h);
    var m0 = [t0x + (delta + asym) * nx, t0y + (delta + asym) * ny];
    var m1 = [t1x - (delta - asym) * nx, t1y - (delta - asym) * ny];
    var uWave = w ? (dir === 1 ? w.u : 1 - w.u) : 0.5;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps, t2 = t * t, t3 = t2 * t;
      var h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      var px = h00 * A[0] + h10 * m0[0] + h01 * B[0] + h11 * m1[0];
      var py = h00 * A[1] + h10 * m0[1] + h01 * B[1] + h11 * m1[1];
      if (Math.abs(wRip) >= 1e-4) {
        var rw = Math.sin(Math.PI * t) * Math.sin(Math.PI * 2 * (t - uWave)) * wRip;
        px += nx * rw;
        py += ny * rw;
      }
      out.push(px, py);
    }
    return out;
  }

  function bendPenalty(level, bends) {
    if (!bends || !level.solBend) return 0;
    var freeEdges = (level.bendFree && level.bendFree.length) ? level.bendFree : [];
    if (!freeEdges.length) {
      var n = level.ring.length;
      for (var k = 0; k < n; k++) {
        if (Math.abs(level.solBend[k] || 0) >= 0.015 && inFoldChain(level, k)) freeEdges.push(k);
      }
    }
    if (!freeEdges.length) return 0;
    var sumDiff = 0;
    for (var i = 0; i < freeEdges.length; i++) {
      var ek = freeEdges[i];
      var cur = bends[ek] !== undefined ? bends[ek] : 0;
      var target = level.solBend[ek] || 0;
      var maxSpan = Math.max(0.04, Math.abs(target));
      var err = Math.min(1.2, Math.abs(cur - target) / maxSpan);
      sumDiff += err;
    }
    return (sumDiff / freeEdges.length) * 0.18;
  }

  function stamp(ax, ay, bx, by) {
    var minx = Math.max(0, Math.floor(Math.min(ax, bx) - LINE_R - 1)), maxx = Math.min(N - 1, Math.ceil(Math.max(ax, bx) + LINE_R + 1));
    var miny = Math.max(0, Math.floor(Math.min(ay, by) - LINE_R - 1)), maxy = Math.min(N - 1, Math.ceil(Math.max(ay, by) + LINE_R + 1));
    var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, r2 = LINE_R * LINE_R;
    for (var y = miny; y <= maxy; y++) for (var x = minx; x <= maxx; x++) {
      var px = x + 0.5 - ax, py = y + 0.5 - ay, t = L2 > 0 ? (px * dx + py * dy) / L2 : 0;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      var ex = px - t * dx, ey = py - t * dy;
      if (ex * ex + ey * ey <= r2) line[y * N + x] = 1;
    }
  }

  var tmpPoly = [];
  // Mặt nạ vùng tô: vẽ mọi cạnh, tô loang 4 hướng từ biên, ô không loang tới là bên trong.
  function region(level, pos, inside, bends) {
    inside = inside || new Uint8Array(N * N);
    line.fill(0); outside.fill(0);
    for (var e = 0; e < level.edges.length; e++) {
      var poly = edgePoly(level, pos, level.edges[e][0], level.edges[e][1], 20, tmpPoly, bends);
      for (var k = 0; k + 3 < poly.length; k += 2) {
        stamp((poly[k] - LO) / CELL, (poly[k + 1] - LO) / CELL, (poly[k + 2] - LO) / CELL, (poly[k + 3] - LO) / CELL);
      }
    }
    var sp = 0;
    function seed(x, y) { var id = y * N + x; if (!line[id] && !outside[id]) { outside[id] = 1; stack[sp++] = id; } }
    for (var s = 0; s < N; s++) { seed(s, 0); seed(s, N - 1); seed(0, s); seed(N - 1, s); }
    while (sp > 0) {
      var id = stack[--sp], x = id % N, y = (id / N) | 0;
      if (x > 0) seed(x - 1, y);
      if (x < N - 1) seed(x + 1, y);
      if (y > 0) seed(x, y - 1);
      if (y < N - 1) seed(x, y + 1);
    }
    for (var q = 0; q < N * N; q++) inside[q] = outside[q] ? 0 : 1;
    return inside;
  }

  function iou(a, b) {
    var inter = 0, uni = 0;
    for (var i = 0; i < a.length; i++) { var x = a[i], y = b[i]; if (x & y) inter++; if (x | y) uni++; }
    return uni ? inter / uni : 0;
  }

  // Vòng node thành đường gấp khúc kèm chiều dài cung, dùng cho điểm sáng và viền lời giải.
  function ringPath(level, pos, steps, bends) {
    var pts = [], cum = [], nodeD = [], acc = 0, r = level.ring, poly = [];
    for (var k = 0; k < r.length; k++) {
      nodeD.push(acc);
      edgePoly(level, pos, r[k], r[(k + 1) % r.length], steps, poly, bends);
      for (var q = 0; q < poly.length; q += 2) {
        if (q === 0 && pts.length) continue;
        var x = poly[q], y = poly[q + 1];
        if (pts.length) acc += Math.hypot(x - pts[pts.length - 2], y - pts[pts.length - 1]);
        pts.push(x, y); cum.push(acc);
      }
    }
    return { pts: pts, cum: cum, nodeD: nodeD, total: acc };
  }

  function pointAt(path, d, out) {
    var t = path.total; d = ((d % t) + t) % t;
    var lo = 0, hi = path.cum.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (path.cum[mid] <= d) lo = mid; else hi = mid; }
    var seg = (path.cum[hi] - path.cum[lo]) || 1, f = (d - path.cum[lo]) / seg;
    out = out || [0, 0];
    out[0] = path.pts[lo * 2] + (path.pts[hi * 2] - path.pts[lo * 2]) * f;
    out[1] = path.pts[lo * 2 + 1] + (path.pts[hi * 2 + 1] - path.pts[lo * 2 + 1]) * f;
    return out;
  }

  // Node nằm trên viền nếu trong ô 7x7 quanh nó có ô ngoài vùng.
  function onBoundary(mask, p) {
    var gx = Math.round((p[0] - LO) / CELL), gy = Math.round((p[1] - LO) / CELL);
    for (var y = gy - 3; y <= gy + 3; y++) for (var x = gx - 3; x <= gx + 3; x++) {
      if (x < 0 || y < 0 || x >= N || y >= N) return true;
      if (!mask[y * N + x]) return true;
    }
    return false;
  }

  // Marching squares trên mặt nạ để vẽ viền sắc nét; trả về đoạn thẳng theo toạ độ chuẩn hóa.
  var SEG = [[], [3, 2], [2, 1], [3, 1], [0, 1], [0, 1, 3, 2], [0, 2], [0, 3], [0, 3], [0, 2], [0, 3, 1, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];
  function contour(mask, out) {
    out = out || [];
    out.length = 0;
    for (var y = 0; y < N - 1; y++) for (var x = 0; x < N - 1; x++) {
      var a = mask[y * N + x], b = mask[y * N + x + 1], c = mask[(y + 1) * N + x + 1], d = mask[(y + 1) * N + x];
      var code = a * 8 + b * 4 + c * 2 + d;
      var list = SEG[code];
      for (var k = 0; k < list.length; k += 2) {
        var p = edgePt(list[k], x, y), q = edgePt(list[k + 1], x, y);
        out.push(LO + (p[0] + 0.5) * CELL, LO + (p[1] + 0.5) * CELL, LO + (q[0] + 0.5) * CELL, LO + (q[1] + 0.5) * CELL, x, y);
      }
    }
    return out;
  }
  function edgePt(e, x, y) {
    if (e === 0) return [x + 0.5, y];
    if (e === 1) return [x + 1, y + 0.5];
    if (e === 2) return [x + 0.5, y + 1];
    return [x, y + 0.5];
  }

  var api = { N: N, LO: LO, HI: HI, CELL: CELL, prepare: prepare, inFoldChain: inFoldChain, edgePoly: edgePoly, bendPenalty: bendPenalty, region: region, iou: iou,
    ringPath: ringPath, pointAt: pointAt, onBoundary: onBoundary, contour: contour };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GN = api;
})(this);

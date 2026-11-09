// ===================================================================== spark power (v2.1)
// The redstone of this world, the way the genre has it.
// - Wire carries power 15 down to 1, one less a cell (its power is its variant: BAUX), and joins
//   wire a step up (unless a full block over it cuts it) or down (when the side is open). It points
//   (its arms) where it joins; a lone wire all four ways, one arm goes on through.
// - Sources: levers, buttons, pressure plates, targets, spark blocks, spark torches (out while the
//   block they hang on is powered), light sensors.
// - A full opaque block (BCOND) next to a lever or button fixed to it, a torch under it, a
//   repeater / comparator / observer pointing into it, a plate on it, is powered strongly (it then
//   powers wire next to it); wire on it or pointing into it powers it weakly (only the parts by it).
// - Repeaters (delay 1..4 x 0.1 s, locked by a powered repeater pointing into a side) and
//   comparators (compare / subtract, reading chests behind them) face one way.
// - Parts: lamps, pistons (push 12; sticky ones pull back), doors, trapdoors, gates, TNT, note
//   blocks, command blocks, dispensers and droppers; observers give a pulse when the block before
//   them changes.
// Every setBlock tells rsNotify; rsFlush (each frame) looks at the cells round it (two steps when a
// part changed) and each part there decides (rsEval), at once or after a delay (rsSchedule).
// D6 directions: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z (the face groups).
let DX6 = [-1, 1, 0, 0, 0, 0], DY6 = [0, 0, -1, 1, 0, 0], DZ6 = [0, 0, 0, 0, -1, 1], OP6 = [1, 0, 3, 2, 5, 4];
// the facing of the look (0 +z, 1 +x, 2 -z, 3 -x) as D6, and back
let F2D = [5, 1, 4, 0], D2F = [3, 1, 0, 0, 2, 0];
// a horizontal D6 side as a bit of a wire's arms (1 +z, 2 +x, 4 -z, 8 -x, as connOf)
let D6BIT = [8, 2, 0, 0, 4, 1];
// the variant of a hung part by the side it hangs on (floor, +z, +x, -z, -x, ceiling)
let ATTI = [4, 2, 0, 5, 3, 1];
let rsTime = 0;

// ---------------------------------------------------------------- reading power
// what a part at (x, y, z) gives the neighbour the way d (from it): 0..15 (wire: not here)
function emitTo(x, y, z, d) {
  let b = blockAt(x, y, z), rl = BRS[b + 1], r = 0;
  if (rl == RS_LEVER) { if (BON[b + 1] == 1) { r = 15; } }
  if (rl == RS_BUTTON || rl == RS_PLATE || rl == RS_TARGET) { if (pressedAt(x, y, z) == 1) { r = 15; } }
  if (rl == RS_BLOCK) { r = 15; }
  if (rl == RS_SENSOR) { r = sensorLevel(x, y, z); }
  if (rl == RS_TORCH) { if (BON[b + 1] == 1) { if (d != BATT[b + 1]) { r = 15; } } }
  if (rl == RS_REPEATER) { if (BON[b + 1] == 1) { if (d == BFAC[b + 1]) { r = 15; } } }
  if (rl == RS_COMPARATOR) { if (d == BFAC[b + 1]) { r = cmpLevel(x, y, z); } }
  if (rl == RS_OBSERVER) { if (BON[b + 1] == 1) { if (d == OP6[BFAC[b + 1] + 1]) { r = 15; } } }
  return r;
}
// the strong power into the block at (x, y, z) from the parts round it
function strongIn(x, y, z) {
  let r = 0, d = 0;
  while (d < 6) {
    let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1];
    let b = blockAt(nx, ny, nz), rl = BRS[b + 1], e = OP6[d + 1], v = 0;
    // (e: the way from the part to this block)
    if (rl > 0) {
      if (rl == RS_LEVER) { if (BON[b + 1] == 1) { if (BATT[b + 1] == e) { v = 15; } } }
      if (rl == RS_BUTTON) { if (BATT[b + 1] == e) { v = 15 * pressedAt(nx, ny, nz); } }
      if (rl == RS_TORCH) { if (BON[b + 1] == 1) { if (e == 3) { v = 15; } } }
      if (rl == RS_REPEATER) { if (BON[b + 1] == 1) { if (BFAC[b + 1] == e) { v = 15; } } }
      if (rl == RS_COMPARATOR) { if (BFAC[b + 1] == e) { v = cmpLevel(nx, ny, nz); } }
      if (rl == RS_OBSERVER) { if (BON[b + 1] == 1) { if (OP6[BFAC[b + 1] + 1] == e) { v = 15; } } }
      if (rl == RS_PLATE) { if (e == 2) { v = 15 * pressedAt(nx, ny, nz); } }
      if (v > r) { r = v; }
    }
    d = d + 1;
  }
  return r;
}
// the weak power into the block at (x, y, z): wire on it or pointing into it
function weakIn(x, y, z) {
  let r = 0, d = 0;
  while (d < 6) {
    if (d != 2) {
      let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1], b = blockAt(nx, ny, nz);
      if (BRS[b + 1] == RS_WIRE) {
        let l = BAUX[b + 1];
        if (l > r) { if (d == 3) { r = l; } else { if (wirePoints(nx, ny, nz, OP6[d + 1]) == 1) { r = l; } } }
      }
    }
    d = d + 1;
  }
  return r;
}
// the power of a block that carries it
function blockPower(x, y, z) {
  let r = strongIn(x, y, z);
  if (r < 15) { let w = weakIn(x, y, z); if (w > r) { r = w; } }
  return r;
}
// the sides a wire at (x, y, z) joins (bits as D6BIT)
function wireMask(x, y, z) {
  let m = 0, s = 0, upCut = BCOND[blockAt(x, y + 1, z) + 1];
  while (s < 4) {
    let d = F2D[s + 1], nx = x + DX6[d + 1], nz = z + DZ6[d + 1], nb = blockAt(nx, y, nz), rl = BRS[nb + 1], j = 0;
    if (rl == RS_WIRE || rl == RS_COMPARATOR || rl == RS_TORCH || rl == RS_LEVER || rl == RS_BUTTON || rl == RS_PLATE || rl == RS_BLOCK || rl == RS_SENSOR || rl == RS_TARGET) { j = 1; }
    if (rl == RS_REPEATER) { if (BFAC[nb + 1] == d || BFAC[nb + 1] == OP6[d + 1]) { j = 1; } }
    if (rl == RS_OBSERVER) { if (BFAC[nb + 1] == d) { j = 1; } }
    if (j == 0) {
      if (BCOND[nb + 1] == 0) { if (BRS[blockAt(nx, y - 1, nz) + 1] == RS_WIRE) { j = 1; } }
      if (upCut == 0) { if (BRS[blockAt(nx, y + 1, nz) + 1] == RS_WIRE) { j = 1; } }
    }
    if (j == 1) { m = m + D6BIT[d + 1]; }
    s = s + 1;
  }
  return m;
}
// the sides a wire points to (its arms as drawn)
function wireArms(x, y, z) {
  let m = wireMask(x, y, z);
  if (m == 0) { m = 15; }
  if (m == 1 || m == 4) { m = 5; }
  if (m == 2 || m == 8) { m = 10; }
  return m;
}
// does the wire at (x, y, z) point the horizontal way d
function wirePoints(x, y, z, d) {
  let r = 0;
  if (mod(idiv(wireArms(x, y, z), D6BIT[d + 1]), 2) == 1) { r = 1; }
  return r;
}
// the power reaching a part at (x, y, z) from every side but `skip` (-1: none)
function powerIn(x, y, z, skip) {
  let r = 0, d = 0;
  while (d < 6) {
    if (d != skip) {
      let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1], b = blockAt(nx, ny, nz), rl = BRS[b + 1], v = 0;
      if (rl == RS_WIRE) { if (d == 3) { v = BAUX[b + 1]; } else { if (d != 2) { if (wirePoints(nx, ny, nz, OP6[d + 1]) == 1) { v = BAUX[b + 1]; } } } }
      else { if (BCOND[b + 1] == 1) { v = blockPower(nx, ny, nz); } if (rl > 0) { v = Math.max(v, emitTo(nx, ny, nz, OP6[d + 1])); } }
      if (v > r) { r = v; }
    }
    d = d + 1;
  }
  return r;
}
// the power coming into a repeater or comparator from its neighbour the way d (its back)
function backIn(x, y, z, d) {
  let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1], b = blockAt(nx, ny, nz), rl = BRS[b + 1], v = 0;
  if (rl == RS_WIRE) { v = BAUX[b + 1]; }
  else { if (BCOND[b + 1] == 1) { v = blockPower(nx, ny, nz); } if (rl > 0) { v = Math.max(v, emitTo(nx, ny, nz, OP6[d + 1])); } }
  return v;
}
// the power into a side of a repeater or comparator (wire, a repeater or comparator pointing in, a spark block)
function sideIn(x, y, z, d) {
  let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1], b = blockAt(nx, ny, nz), rl = BRS[b + 1], v = 0;
  if (rl == RS_WIRE) { v = BAUX[b + 1]; }
  if (rl == RS_REPEATER || rl == RS_COMPARATOR || rl == RS_BLOCK) { v = emitTo(nx, ny, nz, OP6[d + 1]); }
  return v;
}
// the wire's power from what is not wire: parts next to it, and blocks next to it powered strongly
function wireExt(x, y, z) {
  let r = 0, d = 0;
  while (d < 6) {
    let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1], b = blockAt(nx, ny, nz), rl = BRS[b + 1], v = 0;
    if (rl != RS_WIRE) { if (BCOND[b + 1] == 1) { v = strongIn(nx, ny, nz); } if (rl > 0) { v = Math.max(v, emitTo(nx, ny, nz, OP6[d + 1])); } }
    if (v > r) { r = v; }
    d = d + 1;
  }
  return r;
}
// a light sensor: the sky's light while it is day
function sensorLevel(x, y, z) {
  let r = 0;
  if (dark <= 3) { if (cOK(x, z) == 1) { r = idiv(LT[wi(x, y, z)], 16); } }
  return r;
}

// ---------------------------------------------------------------- the wire's power
// the cells of a wire net (NW*, up to 512), found by a hash of (x, y, z) -> its place in NW*
let NWX = [], NWY = [], NWZ = [], NWL = [], NWA = [], NWC = [], nwN = 0;
let HSK = [], HSG = [], HSV = [], hsGen = 0, HSN = 2048;
let solveChg = 0 - 1, rsChg = 0;
function hsKey(x, y, z) { return ((x + 60000) * 120000 + z + 60000) * 64 + y; }
function hsFind(k) {
  let i = mod(k, HSN) + 1, r = 0, n = 0;
  while (n < HSN) {
    if (HSG[i] != hsGen) { n = HSN; }
    else { if (HSK[i] == k) { r = HSV[i]; n = HSN; } else { i = i + 1; if (i > HSN) { i = 1; } n = n + 1; } }
  }
  return r;
}
function hsPut(k, v) {
  let i = mod(k, HSN) + 1, n = 0;
  while (n < HSN) {
    if (HSG[i] != hsGen) { HSG[i] = hsGen; HSK[i] = k; HSV[i] = v; n = HSN; }
    else { i = i + 1; if (i > HSN) { i = 1; } n = n + 1; }
  }
}
function hsInit() {
  let i = 1;
  while (i <= HSN) { HSK.push(0); HSG.push(0); HSV.push(0); i = i + 1; }
}
// a wire into the net (its place, or the one it has)
function nwAdd(x, y, z) {
  let k = hsKey(x, y, z), r = hsFind(k);
  if (r == 0) {
    if (nwN < 512) {
      nwN = nwN + 1;
      if (nwN > NWX.length) { NWX.push(x); NWY.push(y); NWZ.push(z); NWL.push(0); NWC.push(0); let q = 0; while (q < 8) { NWA.push(0); q = q + 1; } }
      else { NWX[nwN] = x; NWY[nwN] = y; NWZ[nwN] = z; NWL[nwN] = 0; NWC[nwN] = 0; }
      hsPut(k, nwN); r = nwN;
    }
  }
  return r;
}
function nwLink(i, x, y, z) {
  let j = nwAdd(x, y, z);
  if (j > 0) { if (NWC[i] < 8) { NWC[i] = NWC[i] + 1; NWA[(i - 1) * 8 + NWC[i]] = j; } }
}
// the wire at (x, y, z) has the power it should (its own look only)
function wireCheck(x, y, z, b) {
  let go = 1;
  // (just solved with nothing else changed since: this net is right)
  if (solveChg == rsChg) { if (hsFind(hsKey(x, y, z)) > 0) { go = 0; } }
  if (go == 1) {
    let want = wireExt(x, y, z), s = 0, upCut = BCOND[blockAt(x, y + 1, z) + 1];
    while (s < 4) {
      let d = F2D[s + 1], nx = x + DX6[d + 1], nz = z + DZ6[d + 1], nb = blockAt(nx, y, nz), l = 0 - 1;
      if (BRS[nb + 1] == RS_WIRE) { l = BAUX[nb + 1]; }
      else {
        if (BCOND[nb + 1] == 0) { let q = blockAt(nx, y - 1, nz); if (BRS[q + 1] == RS_WIRE) { l = BAUX[q + 1]; } }
        if (upCut == 0) { let q = blockAt(nx, y + 1, nz); if (BRS[q + 1] == RS_WIRE) { if (BAUX[q + 1] > l) { l = BAUX[q + 1]; } } }
      }
      if (l - 1 > want) { want = l - 1; }
      s = s + 1;
    }
    if (want != BAUX[b + 1]) { wireSolve(x, y, z); }
  }
}
// the whole net from (x, y, z): each wire's power from the sources, then down the net
function wireSolve(x, y, z) {
  hsGen = hsGen + 1; nwN = 0;
  let first = nwAdd(x, y, z);
  let h = 1;
  while (h <= nwN) {
    let a = NWX[h], yy = NWY[h], c = NWZ[h], s = 0, upCut = BCOND[blockAt(a, yy + 1, c) + 1];
    while (s < 4) {
      let d = F2D[s + 1], nx = a + DX6[d + 1], nz = c + DZ6[d + 1], nb = blockAt(nx, yy, nz);
      if (BRS[nb + 1] == RS_WIRE) { nwLink(h, nx, yy, nz); }
      else {
        if (BCOND[nb + 1] == 0) { if (BRS[blockAt(nx, yy - 1, nz) + 1] == RS_WIRE) { nwLink(h, nx, yy - 1, nz); } }
        if (upCut == 0) { if (BRS[blockAt(nx, yy + 1, nz) + 1] == RS_WIRE) { nwLink(h, nx, yy + 1, nz); } }
      }
      s = s + 1;
    }
    NWL[h] = wireExt(a, yy, c);
    h = h + 1;
  }
  // down from 15: each wire gives its neighbours one less
  let lv = 15;
  while (lv > 1) {
    let i = 1;
    while (i <= nwN) {
      if (NWL[i] == lv) {
        let q = 1;
        while (q <= NWC[i]) { let j = NWA[(i - 1) * 8 + q]; if (NWL[j] < lv - 1) { NWL[j] = lv - 1; } q = q + 1; }
      }
      i = i + 1;
    }
    lv = lv - 1;
  }
  let i = 1;
  while (i <= nwN) {
    let wb = blockAt(NWX[i], NWY[i], NWZ[i]);
    if (BRS[wb + 1] == RS_WIRE) { if (BAUX[wb + 1] != NWL[i]) { setBlock(NWX[i], NWY[i], NWZ[i], BKIND[wb + 1] + NWL[i]); } }
    i = i + 1;
  }
  solveChg = rsChg;
}

// ---------------------------------------------------------------- comparators: their output kept
let CMX = [], CMY = [], CMZ = [], CMD = [], CML = [];
function cmpLevel(x, y, z) {
  let r = 0, i = 1;
  if (BON[blockAt(x, y, z) + 1] == 1) {
    r = 15;
    while (i <= CMX.length) { if (CMX[i] == x && CMY[i] == y && CMZ[i] == z && CMD[i] == dim) { r = CML[i]; } i = i + 1; }
  }
  return r;
}
function cmpSet(x, y, z, l) {
  let i = 1, f = 0;
  while (i <= CMX.length) { if (CMX[i] == x && CMY[i] == y && CMZ[i] == z && CMD[i] == dim) { f = i; } i = i + 1; }
  if (f == 0) { CMX.push(x); CMY.push(y); CMZ.push(z); CMD.push(dim); CML.push(l); } else { CML[f] = l; }
}
// what a chest gives a comparator (0, or 1..15 by how full)
function chestLevel(x, y, z) {
  let r = 0;
  chestFind(x, y, z);
  if (cFound > 0) {
    let k = 1, s = 0;
    while (k <= 27) { let id = CHI[(cFound - 1) * 27 + k]; if (id > 0) { s = s + CHN[(cFound - 1) * 27 + k] / Math.max(1, ITST[id + 1]); } k = k + 1; }
    if (s > 0) { r = Math.floor(1 + s / 27 * 14); }
  }
  return r;
}

// ---------------------------------------------------------------- what is due later
let SCX = [], SCY = [], SCZ = [], SCD = [], SCT = [], SCW = [];
function rsSchedule(x, y, z, t, w) {
  let i = 1, f = 0, free = 0;
  while (i <= SCX.length) {
    if (SCT[i] >= 0) { if (SCX[i] == x && SCY[i] == y && SCZ[i] == z && SCD[i] == dim) { f = i; } }
    else { if (free == 0) { free = i; } }
    i = i + 1;
  }
  if (f == 0) {
    if (free == 0) { SCX.push(0); SCY.push(0); SCZ.push(0); SCD.push(0); SCT.push(0); SCW.push(0); free = SCX.length; }
    SCX[free] = x; SCY[free] = y; SCZ[free] = z; SCD[free] = dim; SCT[free] = rsTime + t; SCW[free] = w;
  }
}
// the cells to look round (a changed one: w 1 two steps out (a part changed), + 2 a block changed there)
let NQX = [], NQY = [], NQZ = [], NQW = [], nqH = 1, nqN = 0;
function rsNotify(x, y, z, w) {
  let k = nqN, dup = 0;
  while (k >= nqH && k > nqN - 6) {
    if (NQX[k] == x && NQY[k] == y && NQZ[k] == z) { dup = 1; if (w > NQW[k]) { NQW[k] = w; } }
    k = k - 1;
  }
  if (dup == 0) {
    nqN = nqN + 1;
    if (nqN > NQX.length) { NQX.push(x); NQY.push(y); NQZ.push(z); NQW.push(w); }
    else { NQX[nqN] = x; NQY[nqN] = y; NQZ[nqN] = z; NQW[nqN] = w; }
  }
  if (mod(w, 2) == 0) { rsChg = rsChg + 1; } else { if (BRS[blockAt(x, y, z) + 1] != RS_WIRE) { rsChg = rsChg + 1; } }
}
// (the older names)
function powerAround(x, y, z) { rsNotify(x, y, z, 3); }
function powerCheck(x, y, z) { rsNotify(x, y, z, 1); }
function rsStep(dt) {
  if (HSK.length == 0) { hsInit(); }
  rsTime = rsTime + dt;
  let i = 1;
  while (i <= SCX.length) {
    if (SCT[i] >= 0) { if (SCT[i] <= rsTime) { SCT[i] = 0 - 1; if (SCD[i] == dim) { rsApply(SCX[i], SCY[i], SCZ[i], SCW[i]); } } }
    i = i + 1;
  }
  rsFlush(3000);
}
function rsFlush(n) {
  while (nqH <= nqN && n > 0) {
    let x = NQX[nqH], y = NQY[nqH], z = NQZ[nqH], w = NQW[nqH];
    nqH = nqH + 1;
    rsAround(x, y, z, w);
    n = n - 1;
  }
  if (nqH > nqN) { nqH = 1; nqN = 0; }
}
function rsAround(x, y, z, w) {
  let d = 0;
  // observers looking at a cell that changed
  if (w >= 2) {
    while (d < 6) {
      let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1], ob = blockAt(nx, ny, nz);
      if (BRS[ob + 1] == RS_OBSERVER) { if (BFAC[ob + 1] == OP6[d + 1]) { if (BON[ob + 1] == 0) { rsSchedule(nx, ny, nz, 0.1, 1); } } }
      d = d + 1;
    }
  }
  rsEvalAt(x, y, z);
  d = 0;
  while (d < 6) {
    let nx = x + DX6[d + 1], ny = y + DY6[d + 1], nz = z + DZ6[d + 1];
    rsEvalAt(nx, ny, nz);
    if (mod(w, 2) == 1) {
      let e = 0;
      while (e < 6) { if (e != OP6[d + 1]) { rsEvalAt(nx + DX6[e + 1], ny + DY6[e + 1], nz + DZ6[e + 1]); } e = e + 1; }
    }
    d = d + 1;
  }
}
function rsEvalAt(x, y, z) {
  if (y >= 0 && y < WY) {
    let b = blockAt(x, y, z);
    if (BRS[b + 1] > 0) { rsEval(x, y, z, b); }
  }
}

// ---------------------------------------------------------------- each part decides
// a part that cannot hang where it is falls off
function rsDrop(x, y, z, b) {
  if (mod(gameMode, 2) == 0) { if (BDROP[b + 1] > 0) { dropItem(BDROP[b + 1], 1, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
  setBlock(x, y, z, 0);
}
function rsHangs(x, y, z, b) {
  let a = BATT[b + 1], r = 1;
  if (a >= 0) { if (BSOL[blockAt(x + DX6[a + 1], y + DY6[a + 1], z + DZ6[a + 1]) + 1] == 0) { r = 0; } }
  return r;
}
function rsEval(x, y, z, b) {
  let rl = BRS[b + 1], on = BON[b + 1], f = BFAC[b + 1];
  if (rl == RS_WIRE) { wireCheck(x, y, z, b); }
  if (rl == RS_LEVER || rl == RS_BUTTON) { if (rsHangs(x, y, z, b) == 0) { rsDrop(x, y, z, b); } }
  if (rl == RS_TORCH) {
    if (rsHangs(x, y, z, b) == 0) { rsDrop(x, y, z, b); }
    else {
      let a = BATT[b + 1], ax = x + DX6[a + 1], ay = y + DY6[a + 1], az = z + DZ6[a + 1], ab = blockAt(ax, ay, az), want = 1;
      if (BCOND[ab + 1] == 1) { if (blockPower(ax, ay, az) > 0) { want = 0; } }
      if (BRS[ab + 1] == RS_BLOCK) { want = 0; }
      // (burnt out: out at once, and looked at again in a while)
      if (torchBurnt(x, y, z) == 1) { if (on == 1) { setBlock(x, y, z, b + 1); } rsSchedule(x, y, z, 3.1, 0 - 1); }
      else { if (want != on) { rsSchedule(x, y, z, 0.1, want); } }
    }
  }
  if (rl == RS_REPEATER) {
    let want = 0, lock = 0, s1 = 0, s2 = 1;
    if (backIn(x, y, z, OP6[f + 1]) > 0) { want = 1; }
    if (f == 0 || f == 1) { s1 = 4; s2 = 5; }
    if (rsLocks(x + DX6[s1 + 1], y, z + DZ6[s1 + 1], OP6[s1 + 1]) == 1 || rsLocks(x + DX6[s2 + 1], y, z + DZ6[s2 + 1], OP6[s2 + 1]) == 1) { lock = 1; }
    if (lock == 0) { if (want != on) { rsSchedule(x, y, z, BAUX[b + 1] * 0.1, want); } }
  }
  if (rl == RS_COMPARATOR) {
    let bk = OP6[f + 1], bx = x + DX6[bk + 1], bz = z + DZ6[bk + 1], a = backIn(x, y, z, bk), s1 = 0, s2 = 1, sd = 0, out = 0;
    let cb = blockAt(bx, y, bz);
    if (BUSE[cb + 1] == U_CHEST) { a = chestLevel(bx, y, bz); }
    else { if (BCOND[cb + 1] == 1) { let c2 = blockAt(bx + DX6[bk + 1], y, bz + DZ6[bk + 1]); if (BUSE[c2 + 1] == U_CHEST) { let cl = chestLevel(bx + DX6[bk + 1], y, bz + DZ6[bk + 1]); if (cl > a) { a = cl; } } } }
    if (f == 0 || f == 1) { s1 = 4; s2 = 5; }
    sd = Math.max(sideIn(x, y, z, s1), sideIn(x, y, z, s2));
    if (BAUX[b + 1] == 1) { out = Math.max(0, a - sd); } else { if (a >= sd) { out = a; } }
    if (out != cmpLevel(x, y, z)) { rsSchedule(x, y, z, 0.1, out); }
  }
  if (rl == RS_LAMP) {
    let p = powerIn(x, y, z, 0 - 1);
    if (p > 0) { if (on == 0) { setBlock(x, y, z, b + 1); } }
    else { if (on == 1) { rsSchedule(x, y, z, 0.2, 0); } }
  }
  if (rl == RS_PISTON) {
    let hb = blockAt(x + DX6[f + 1], y + DY6[f + 1], z + DZ6[f + 1]);
    // (its arm broken off: the piston breaks too)
    if (on == 1 && (BRS[hb + 1] != RS_HEAD || BFAC[hb + 1] != f)) { rsDrop(x, y, z, b); }
    else {
      let want = 0;
      if (powerIn(x, y, z, f) > 0) { want = 1; }
      if (want != on) { rsSchedule(x, y, z, 0.05, want); }
    }
  }
  if (rl == RS_HEAD) {
    let bb = blockAt(x - DX6[f + 1], y - DY6[f + 1], z - DZ6[f + 1]);
    if (BRS[bb + 1] != RS_PISTON || BON[bb + 1] != 1 || BFAC[bb + 1] != f) { setBlock(x, y, z, 0); }
  }
  if (rl == RS_TNT) { if (powerIn(x, y, z, 0 - 1) > 0) { tntPrime(x, y, z); } }
  if (rl == RS_DOOR || rl == RS_NOTE || rl == RS_COMMAND || rl == RS_DISPENSER) {
    let p = 0;
    if (powerIn(x, y, z, 0 - 1) > 0) { p = 1; }
    if (BPLC[b + 1] == P_DOOR) {
      // the two halves are one door: written down at the lower one
      let h0 = mod(idiv(BVAR[b + 1], 4), 2);
      if (powerIn(x, y + 1 - h0 * 2, z, 0 - 1) > 0) { p = 1; }
      edgeSet(x, y - h0, z, p);
    } else { edgeSet(x, y, z, p); }
    if (egWas != p) { rsSwitch(x, y, z, b, p); }
  }
}
// a repeater (or comparator) at (x, y, z) pointing the way d, on: it locks what it points into
function rsLocks(x, y, z, d) {
  let b = blockAt(x, y, z), r = 0;
  if (BRS[b + 1] == RS_REPEATER || BRS[b + 1] == RS_COMPARATOR) { if (BFAC[b + 1] == d) { if (BON[b + 1] == 1) { r = 1; } } }
  return r;
}
// the power changed at a door, trapdoor, gate, note block, command block, dispenser
function rsSwitch(x, y, z, b, on) {
  let k = BKIND[b + 1];
  if (BPLC[b + 1] == P_DOOR) { doorSet(x, y, z, b, on); }
  // trapdoors: closed 0 bottom / 1 top, open 2 + half * 4 + side (the half is kept)
  if (BPLC[b + 1] == P_TRAPDOOR) { let v = BVAR[b + 1]; if (on == 1 && v < 2) { setBlock(x, y, z, k + 2 + v * 4 + mod(faceOf(yaw) + 2, 4)); } if (on == 0 && v >= 2) { setBlock(x, y, z, k + idiv(v - 2, 4)); } }
  if (BPLC[b + 1] == P_GATE) { let v = BVAR[b + 1]; if (on == 1 && v < 2) { setBlock(x, y, z, b + 2); } if (on == 0 && v >= 2) { setBlock(x, y, z, b - 2); } }
  if (on == 1) {
    if (BRS[b + 1] == RS_NOTE) { sndPlay(6); }
    if (BRS[b + 1] == RS_COMMAND) { commandBlockRun(x, y, z); }
    if (BRS[b + 1] == RS_DISPENSER) { dispense(x, y, z, b); }
  }
}
// a delay is over
function rsApply(x, y, z, w) {
  let b = blockAt(x, y, z), rl = BRS[b + 1], on = BON[b + 1];
  if (rl == RS_REPEATER || rl == RS_OBSERVER) { if (w != on) { setBlock(x, y, z, b + w - on); } }
  if (rl == RS_OBSERVER) { if (w == 1) { rsSchedule(x, y, z, 0.1, 0); } }
  if (rl == RS_TORCH) {
    if (w < 0) { rsNotify(x, y, z, 1); }
    else {
      let ww = w;
      if (ww == 1) { if (torchBurnt(x, y, z) == 1) { ww = 0; rsSchedule(x, y, z, 3.1, 0 - 1); } }
      if (ww != on) { setBlock(x, y, z, b + on - ww); torchToggled(x, y, z); }
    }
  }
  if (rl == RS_COMPARATOR) {
    cmpSet(x, y, z, w);
    let want = 0; if (w > 0) { want = 1; }
    if (want != on) { setBlock(x, y, z, b + want - on); } else { rsNotify(x, y, z, 1); }
  }
  if (rl == RS_LAMP) { if (on == 1) { if (powerIn(x, y, z, 0 - 1) == 0) { setBlock(x, y, z, b - 1); } } }
  if (rl == RS_PISTON) {
    let f = BFAC[b + 1];
    if (w == 1 && on == 0) { pistonOut(x, y, z, b, f); }
    if (w == 0 && on == 1) { pistonIn(x, y, z, b, f); }
  }
}
// torches that switch too often burn out for a while (8 times in 3 s)
let TBX = [], TBY = [], TBZ = [], TBT = [];
function torchToggled(x, y, z) {
  let i = 1, f = 0;
  while (i <= TBX.length) { if (f == 0) { if (TBT[i] < rsTime - 3) { f = i; } } i = i + 1; }
  if (f == 0) { TBX.push(0); TBY.push(0); TBZ.push(0); TBT.push(0); f = TBX.length; }
  TBX[f] = x; TBY[f] = y; TBZ[f] = z; TBT[f] = rsTime;
}
function torchBurnt(x, y, z) {
  let i = 1, n = 0, r = 0;
  while (i <= TBX.length) { if (TBT[i] >= rsTime - 3) { if (TBX[i] == x && TBY[i] == y && TBZ[i] == z) { n = n + 1; } } i = i + 1; }
  if (n >= 8) { r = 1; }
  return r;
}

// ---------------------------------------------------------------- pistons
// how a block meets a piston: 0 taken over (air, water, lava, fire), 1 moves, 2 breaks, 3 stops it
function pushHow(c) {
  let r = 1;
  if (c == 0 || c == 7 || c == 35 || BSPEC[c + 1] == 10) { r = 0; }
  else {
    if (BSOL[c + 1] == 0 || BSHP[c + 1] == 1 || BSHP[c + 1] == 2 || BPLC[c + 1] == P_DOOR || BPLC[c + 1] == P_BED) { r = 2; }
    if (BHARD[c + 1] < 0 || c == 34 || BUSE[c + 1] == U_CHEST || BUSE[c + 1] == U_FURNACE || BUSE[c + 1] == U_SHELL || BUSE[c + 1] == U_VOIDCHEST || BUSE[c + 1] == U_ENCHANT || BUSE[c + 1] == U_ANCHOR || BSPEC[c + 1] == 6 || BRS[c + 1] == RS_HEAD) { r = 3; }
    if (BRS[c + 1] == RS_PISTON) { if (BON[c + 1] == 1) { r = 3; } }
  }
  return r;
}
// What a piston moves: from the first block on, every block ahead of it up to air; a jelly or
// honey block takes with it the movable blocks on its other sides (and what is ahead of those),
// jelly and honey not each other. 12 blocks at most; a block that cannot move stops it when it is
// in the way, and is left where it is when it only sticks on at a side. Blocks that break go.
// PVX.. the blocks that move, PDX.. the ones that break; psMove the way (D6).
let PVX = [], PVY = [], PVZ = [], PVB = [], PDX = [], PDY = [], PDZ = [], PQX = [], PQY = [], PQZ = [], PQT = [];
let psOk = 1, psMove = 0, psPX = 0, psPY = 0, psPZ = 0;
function psSticky(b) { let r = 0; if (b == I_jellyBlock || b == I_honeyBlock) { r = 1; } return r; }
function psSticks(a, c) {
  let r = 1;
  if (a == I_jellyBlock && c == I_honeyBlock) { r = 0; }
  if (a == I_honeyBlock && c == I_jellyBlock) { r = 0; }
  return r;
}
function psHas(x, y, z) {
  let i = 1, r = 0;
  while (i <= PVX.length) { if (PVX[i] == x && PVY[i] == y && PVZ[i] == z) { r = 1; } i = i + 1; }
  return r;
}
// t 1: in the way (a stop fails it, a break goes); 0: stuck on at a side (only what moves comes)
function psQueue(x, y, z, t) { PQX.push(x); PQY.push(y); PQZ.push(z); PQT.push(t); }
function psBuild(sx, sy, sz, d) {
  PVX = []; PVY = []; PVZ = []; PVB = []; PDX = []; PDY = []; PDZ = []; PQX = []; PQY = []; PQZ = []; PQT = [];
  psOk = 1; psMove = d;
  psQueue(sx, sy, sz, 1);
  let q = 1;
  while (q <= PQX.length && psOk == 1) {
    let x = PQX[q], y = PQY[q], z = PQZ[q], t = PQT[q];
    q = q + 1;
    if (y < 0 || y >= WY || cOK(x, z) == 0) { if (t == 1) { psOk = 0; } }
    else {
      if (x == psPX && y == psPY && z == psPZ) { if (t == 1) { psOk = 0; } }
      else { if (psHas(x, y, z) == 0) {
        let c = blockAt(x, y, z), how = pushHow(c);
        if (how == 3) { if (t == 1) { psOk = 0; } }
        if (how == 2) { if (t == 1) { PDX.push(x); PDY.push(y); PDZ.push(z); } }
        if (how == 1) {
          if (PVX.length >= 12) { psOk = 0; }
          else {
            PVX.push(x); PVY.push(y); PVZ.push(z); PVB.push(c);
            psQueue(x + DX6[d + 1], y + DY6[d + 1], z + DZ6[d + 1], 1);
            if (psSticky(c) == 1) {
              let e = 0;
              while (e < 6) {
                if (e != d) {
                  let nx = x + DX6[e + 1], ny = y + DY6[e + 1], nz = z + DZ6[e + 1], nb = blockAt(nx, ny, nz);
                  if (pushHow(nb) == 1) { if (psSticks(c, nb) == 1) { psQueue(nx, ny, nz, 0); } }
                }
                e = e + 1;
              }
            }
          }
        }
      } }
    }
  }
  return psOk;
}
// one cell written as a piston moves it (no falling or dropping on the way: that comes after)
function psPut(x, y, z, b) {
  logOn = 1; wput(x, y, z, b); logOn = 0;
  markDirty(x, y, z);
  lbX0 = Math.min(lbX0, x - 14); lbX1 = Math.max(lbX1, x + 14); lbZ0 = Math.min(lbZ0, z - 14); lbZ1 = Math.max(lbZ1, z + 14);
  rsNotify(x, y, z, 3);
}
// the blocks found move one cell the way psMove; the cells left behind (not the head's) get their after-effects
function psDo(hx, hy, hz, head) {
  let d = psMove, dx = DX6[d + 1], dy = DY6[d + 1], dz = DZ6[d + 1], i = 1;
  while (i <= PDX.length) { let c = blockAt(PDX[i], PDY[i], PDZ[i]); rsDrop(PDX[i], PDY[i], PDZ[i], c); partnerGone(PDX[i], PDY[i], PDZ[i], c, 0); i = i + 1; }
  i = 1;
  while (i <= PVX.length) { psPut(PVX[i], PVY[i], PVZ[i], 0); i = i + 1; }
  i = 1;
  while (i <= PVX.length) { psPut(PVX[i] + dx, PVY[i] + dy, PVZ[i] + dz, PVB[i]); i = i + 1; }
  if (head > 0) { setBlock(hx, hy, hz, head); }
  i = 1;
  while (i <= PVX.length) {
    let x = PVX[i], y = PVY[i], z = PVZ[i];
    if (psHas(x - dx, y - dy, z - dz) == 0) { if (head == 0 || x != hx || y != hy || z != hz) { setBlock(x, y, z, 0); } }
    i = i + 1;
  }
  pushBodies(dx, dy, dz, hx, hy, hz, head);
}
function pistonOut(x, y, z, b, f) {
  let dx = DX6[f + 1], dy = DY6[f + 1], dz = DZ6[f + 1];
  psPX = x; psPY = y; psPZ = z;
  if (psBuild(x + dx, y + dy, z + dz, f) == 1) {
    setBlock(x, y, z, b + 1);
    psDo(x + dx, y + dy, z + dz, I_pistonHead + mod(f + 3, 6) * 2 + BAUX[b + 1]);
    sndPlay(1);
  }
}
function pistonIn(x, y, z, b, f) {
  let hx = x + DX6[f + 1], hy = y + DY6[f + 1], hz = z + DZ6[f + 1];
  setBlock(x, y, z, b - 1);
  if (BRS[blockAt(hx, hy, hz) + 1] == RS_HEAD) { setBlock(hx, hy, hz, 0); }
  if (BAUX[b + 1] == 1) {
    // a sticky one pulls the block before its arm (and what sticks to it) back
    let tx = hx + DX6[f + 1], ty = hy + DY6[f + 1], tz = hz + DZ6[f + 1];
    psPX = x; psPY = y; psPZ = z;
    if (ty >= 0 && ty < WY) { if (pushHow(blockAt(tx, ty, tz)) == 1) { if (psBuild(tx, ty, tz, OP6[f + 1]) == 1) { psDo(0, 0 - 1, 0, 0); } } }
  }
  sndPlay(1);
}
// the player and the mobs in the cells moved into (and the arm's) go along, once each
function pushBodies(dx, dy, dz, hx, hy, hz, head) {
  let moved = 0, i = 0;
  while (i <= PVX.length) {
    let cx = hx, cy = hy, cz = hz, go = 1;
    if (i == 0) { if (head == 0) { go = 0; } } else { cx = PVX[i] + dx; cy = PVY[i] + dy; cz = PVZ[i] + dz; }
    if (go == 1) {
      if (moved == 0) {
        if (cx + 1 > px - 0.3 && cx < px + 0.3 && cz + 1 > pz - 0.3 && cz < pz + 0.3 && cy + 1 > py && cy < py + 1.8) {
          px = px + dx; py = py + dy; pz = pz + dz; if (dy > 0) { pvy = Math.max(pvy, 0); } moved = 1;
        }
      }
      let e = 1;
      while (e <= NMOB) {
        if (ET[e] > 0) {
          let w = MW[ET[e]] / 2;
          if (cx + 1 > EX[e] - w && cx < EX[e] + w && cz + 1 > EZ[e] - w && cz < EZ[e] + w && cy + 1 > EY[e] && cy < EY[e] + MH[ET[e]]) { EX[e] = EX[e] + dx; EY[e] = EY[e] + dy; EZ[e] = EZ[e] + dz; }
        }
        e = e + 1;
      }
    }
    i = i + 1;
  }
}

// ---------------------------------------------------------------- dispensers and droppers
function dispense(x, y, z, b) {
  chestFind(x, y, z);
  if (cFound > 0) {
    let c = cFound, k = 1, n = 0, pick = 0;
    while (k <= 27) { if (CHI[(c - 1) * 27 + k] > 0) { n = n + 1; if (rand(1, n) == 1) { pick = k; } } k = k + 1; }
    if (pick > 0) {
      let s = (c - 1) * 27 + pick, id = CHI[s], f = BFAC[b + 1];
      dropItem(id, 1, CHD[s], x + 0.5 + DX6[f + 1] * 0.7, y + 0.3 + DY6[f + 1] * 0.7, z + 0.5 + DZ6[f + 1] * 0.7, 0);
      CHN[s] = CHN[s] - 1;
      if (CHN[s] <= 0) { CHI[s] = 0; CHN[s] = 0; CHD[s] = 0; }
      sndPlay(1);
    }
  }
}

// ---------------------------------------------------------------- putting parts down, F on them
// the variant of part b put down by the player (by the face clicked and the look); -1: not here
function rsPut(b) {
  let rl = BRS[b + 1], r = b, a = OP6[pickF + 1], f4 = faceOf(yaw);
  if (rl == RS_LEVER) { r = b + ATTI[a + 1] * 2; }
  if (rl == RS_BUTTON) { r = b + ATTI[a + 1]; }
  if (rl == RS_TORCH) { if (a == 3) { r = 0 - 1; } else { r = b + ATTI[a + 1] * 2; } }
  if (rl == RS_LEVER || rl == RS_BUTTON || rl == RS_TORCH) { if (a != 2) { if (BSOL[pickB + 1] == 0) { r = 0 - 1; } } }
  if (rl == RS_REPEATER) { r = b + f4 * 8; }
  if (rl == RS_COMPARATOR) { r = b + f4 * 4; }
  if (rl == RS_PISTON || rl == RS_OBSERVER || rl == RS_DISPENSER) {
    let d = OP6[F2D[f4 + 1] + 1];
    if (pitch < 0 - 45) { d = 3; }
    if (pitch > 45) { d = 2; }
    if (rl == RS_DISPENSER) { r = b + mod(d + 3, 6); } else { r = b + mod(d + 3, 6) * 2; }
  }
  return r;
}
// F on a repeater (its delay) or a comparator (compare / subtract)
function rsUse(x, y, z, b) {
  if (BRS[b + 1] == RS_REPEATER) { let dl = BAUX[b + 1]; setBlock(x, y, z, b + (mod(dl, 4) + 1 - dl) * 2); }
  if (BRS[b + 1] == RS_COMPARATOR) { let m = BAUX[b + 1]; setBlock(x, y, z, b + (1 - 2 * m) * 2); }
  sndPlay(1);
}
function leverToggle(x, y, z, b) {
  setBlock(x, y, z, b + 1 - 2 * BON[b + 1]);
  sndPlay(1);
}
// a block state of a part for the commands ([facing=..., powered=..., delay=..., mode=..., power=..., face=...])
function rsState(b, st) {
  let rl = BRS[b + 1], v = 0, f = 0, on = 0, d6 = 3, a = 2;
  if (indexOf(st, 'facing=south') > 0) { f = 0; } if (indexOf(st, 'facing=east') > 0) { f = 1; } if (indexOf(st, 'facing=north') > 0) { f = 2; } if (indexOf(st, 'facing=west') > 0) { f = 3; }
  if (indexOf(st, 'facing=') > 0) { d6 = F2D[f + 1]; }
  if (indexOf(st, 'facing=up') > 0) { d6 = 3; } if (indexOf(st, 'facing=down') > 0) { d6 = 2; }
  if (indexOf(st, 'powered=true') > 0 || indexOf(st, 'lit=true') > 0 || indexOf(st, 'extended=true') > 0) { on = 1; }
  if (indexOf(st, 'face=wall') > 0) { a = OP6[F2D[f + 1] + 1]; } if (indexOf(st, 'face=ceiling') > 0) { a = 3; }
  let dl = indexOf(st, 'delay='), pw = indexOf(st, 'power=');
  if (rl == RS_WIRE) {
    if (pw > 0) {
      v = indexOf('0123456789', substr(st, pw + 6, pw + 6)) - 1;
      let c2 = 0; if (strlen(st) >= pw + 7) { c2 = indexOf('0123456789', substr(st, pw + 7, pw + 7)); }
      if (c2 > 0) { v = v * 10 + c2 - 1; }
      v = Math.min(15, Math.max(0, v));
    }
  }
  if (rl == RS_REPEATER) { let d = 1; if (dl > 0) { d = Math.min(4, Math.max(1, substr(st, dl + 6, dl + 6) * 1)); } v = (f * 4 + d - 1) * 2 + on; }
  if (rl == RS_COMPARATOR) { let m = 0; if (indexOf(st, 'mode=subtract') > 0) { m = 1; } v = (f * 2 + m) * 2 + on; }
  if (rl == RS_LEVER) { v = ATTI[a + 1] * 2 + on; }
  if (rl == RS_BUTTON) { v = ATTI[a + 1]; }
  if (rl == RS_TORCH) { if (a == 3) { a = 2; } v = ATTI[a + 1] * 2; if (indexOf(st, 'lit=false') > 0) { v = v + 1; } }
  if (rl == RS_PISTON || rl == RS_OBSERVER) { v = mod(d6 + 3, 6) * 2 + on; }
  if (rl == RS_DISPENSER) { v = mod(d6 + 3, 6); }
  return v;
}

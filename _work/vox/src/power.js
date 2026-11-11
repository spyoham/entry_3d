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
//   them changes. (v2.5) What a piston moves is on its way for 0.1 s (a moving block); a sticky one
//   whose pulse is shorter lets go of its block; pistons, dispensers and droppers also take power
//   that reaches the cell over them (quasi-connectivity), only when something by them changes.
// Every setBlock tells rsNotify; rsFlush (each frame) looks at the cells round it (two steps when a
// part changed) and each part there decides (rsEval), at once or after a delay (rsSchedule).
// (v2.6) The genre's game tick (1.16.5 Java), 20 a second (rsTick): first the parts whose delay is
// over (scheduled ticks, by their time, then their priority, then the order they were asked), then
// the pistons' block events (asked by a piston that sees its power change, done in the order asked,
// each asking its power again), then the moving blocks two ticks old land. What a change tells is
// done at once after each. Between ticks (the player's doing) it is done at once too, and a piston
// starts at the next tick. So a sticky piston given a pulse of two ticks (an observer's, a repeater's)
// lets go of its block, as in the genre, and one of three ticks or more pulls it back.
// D6 directions: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z (the face groups).
let DX6 = [-1, 1, 0, 0, 0, 0], DY6 = [0, 0, -1, 1, 0, 0], DZ6 = [0, 0, 0, 0, -1, 1], OP6 = [1, 0, 3, 2, 5, 4];
// the facing of the look (0 +z, 1 +x, 2 -z, 3 -x) as D6, and back
let F2D = [5, 1, 4, 0], D2F = [3, 1, 0, 0, 2, 0];
// a horizontal D6 side as a bit of a wire's arms (1 +z, 2 +x, 4 -z, 8 -x, as connOf)
let D6BIT = [8, 2, 0, 0, 4, 1];
// the variant of a hung part by the side it hangs on (floor, +z, +x, -z, -x, ceiling)
let ATTI = [4, 2, 0, 5, 3, 1];
let rsTime = 0;
// (v2.6) the game ticks: gtNow done so far, gtT the time of the last; rsPhase 0 between ticks, 1
// scheduled ticks, 2 block events, 3 moving blocks landing
let gtNow = 0, gtT = 0, rsPhase = 0;

// ---------------------------------------------------------------- reading power
// what a part at (x, y, z) gives the neighbour the way d (from it): 0..15 (wire: not here)
function emitTo(x, y, z, d) {
  let b = blockAt(x, y, z), rl = BRS[b + 1], r = 0;
  if (rl == RS_LEVER) { if (BON[b + 1] == 1) { r = 15; } }
  if (rl == RS_BUTTON || rl == RS_PLATE || rl == RS_TARGET) { r = pressLevel(x, y, z); }
  if (rl == RS_BLOCK) { r = 15; }
  if (rl == RS_SENSOR) { r = sensorLevel(x, y, z); }
  if (rl == RS_TORCH) { if (BON[b + 1] == 1) { if (d != BATT[b + 1]) { r = 15; } } }
  if (rl == RS_REPEATER) { if (BON[b + 1] == 1) { if (d == BFAC[b + 1]) { r = 15; } } }
  if (rl == RS_COMPARATOR) { if (d == BFAC[b + 1]) { r = cmpLevel(x, y, z); } }
  if (rl == RS_OBSERVER) { if (BON[b + 1] == 1) { if (d == OP6[BFAC[b + 1] + 1]) { r = 15; } } }
  if (rl == RS_TRAPPED) { r = trapLevel(x, y, z); }
  if (rl == RS_HOOK) { r = pressLevel(x, y, z); }
  if (rl == RS_RAIL) { if (BAUX[b + 1] == 2) { r = pressLevel(x, y, z); } }
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
      if (rl == RS_BUTTON || rl == RS_HOOK) { if (BATT[b + 1] == e) { v = pressLevel(nx, ny, nz); } }
      if (rl == RS_TORCH) { if (BON[b + 1] == 1) { if (e == 3) { v = 15; } } }
      if (rl == RS_REPEATER) { if (BON[b + 1] == 1) { if (BFAC[b + 1] == e) { v = 15; } } }
      if (rl == RS_COMPARATOR) { if (BFAC[b + 1] == e) { v = cmpLevel(nx, ny, nz); } }
      if (rl == RS_OBSERVER) { if (BON[b + 1] == 1) { if (OP6[BFAC[b + 1] + 1] == e) { v = 15; } } }
      if (rl == RS_PLATE) { if (e == 2) { v = pressLevel(nx, ny, nz); } }
      if (rl == RS_TRAPPED) { if (e == 2) { v = trapLevel(nx, ny, nz); } }
      if (rl == RS_RAIL) { if (e == 2) { if (BAUX[b + 1] == 2) { v = pressLevel(nx, ny, nz); } } }
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
    if (rl == RS_WIRE || rl == RS_COMPARATOR || rl == RS_TORCH || rl == RS_LEVER || rl == RS_BUTTON || rl == RS_PLATE || rl == RS_BLOCK || rl == RS_SENSOR || rl == RS_TARGET || rl == RS_TRAPPED || rl == RS_HOOK) { j = 1; }
    if (rl == RS_RAIL) { if (BAUX[nb + 1] == 2) { j = 1; } }
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
  // (v2.4.3: and an observer's back, as in the genre)
  if (rl == RS_REPEATER || rl == RS_COMPARATOR || rl == RS_BLOCK || rl == RS_OBSERVER) { v = emitTo(nx, ny, nz, OP6[d + 1]); }
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
// (v2.4.4: the genre's: the sky's light less the dark, times the sun's height; turned: 15 less it.
// It was the sky's light while the day was bright, else 0, and rain made it 0)
function sensorLevel(x, y, z) {
  let r = 0;
  if (cOK(x, z) == 1) {
    let base = Math.max(0, idiv(LT[wi(x, y, z)], 16) - dark);
    if (blockAt(x, y, z) == I_daylightInv) { r = Math.min(15, 15 - base); }
    else { r = Math.round(base * Math.max(0, sind(sunA))); }
    r = Math.max(0, Math.min(15, r));
  }
  return r;
}
// the sensors known (put, or seen again): asked each second, wherever the player is
let SNX = [], SNY = [], SNZ = [], SND = [], SNL = [], snT = 0;
function sensorKeep(x, y, z) {
  let i = 1, f = 0;
  while (i <= SNX.length) { if (SNX[i] == x && SNY[i] == y && SNZ[i] == z && SND[i] == dim) { f = i; } i = i + 1; }
  if (f == 0) { if (SNX.length < 256) { SNX.push(x); SNY.push(y); SNZ.push(z); SND.push(dim); SNL.push(0 - 1); } }
}
function sensorStep(dt) {
  snT = snT + dt;
  if (snT >= 1) {
    snT = 0;
    let i = 1;
    while (i <= SNX.length) {
      let gone = 0;
      if (SND[i] == dim) { if (cOK(SNX[i], SNZ[i]) == 1) {
        if (BSPEC[blockAt(SNX[i], SNY[i], SNZ[i]) + 1] != 9) { gone = 1; }
        else { let l = sensorLevel(SNX[i], SNY[i], SNZ[i]); if (l != SNL[i]) { SNL[i] = l; powerAround(SNX[i], SNY[i], SNZ[i]); } }
      } }
      if (gone == 1) { SNX.removeAt(i); SNY.removeAt(i); SNZ.removeAt(i); SND.removeAt(i); SNL.removeAt(i); } else { i = i + 1; }
    }
  }
}

// ---------------------------------------------------------------- the wire's power
// the cells of a wire net (NW*, up to 2048; v2.5, it was 512), found by a hash of (x, y, z) -> its place in NW*
let NWX = [], NWY = [], NWZ = [], NWL = [], NWA = [], NWC = [], nwN = 0;
let HSK = [], HSG = [], HSV = [], hsGen = 0, HSN = 8192;
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
    if (nwN < 2048) {
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
        if (upCut == 0 && BCOND[nb + 1] == 1) { let q = blockAt(nx, y + 1, nz); if (BRS[q + 1] == RS_WIRE) { if (BAUX[q + 1] > l) { l = BAUX[q + 1]; } } }
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
        if (BCOND[nb + 1] == 0) { if (BRS[blockAt(nx, yy - 1, nz) + 1] == RS_WIRE) { if (BCOND[blockAt(a, yy - 1, c) + 1] == 1) { nwLink(h, nx, yy - 1, nz); } } }
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
// (v2.5) what a block gives a comparator reading it (-1: nothing to read): containers (chests,
// hoppers, dispensers, furnaces) by how full, a cake by its slices (a whole one here: 14), a frame
// with its eye 15, a respawn anchor by its charge; jukeboxes, lecterns, cauldrons, composters and
// hives have nothing in them here: 0
function cmpRead(x, y, z, b) {
  let r = 0 - 1, u = BUSE[b + 1];
  if (u == U_CHEST) { r = chestLevel(x, y, z); }
  if (u == U_FURNACE) { r = furnaceLevel(x, y, z); }
  if (b == I_cake) { r = 14; }
  if (b == I_voidFrameEye) { r = 15; } if (b == I_voidFrame) { r = 0; }
  if (u == U_ANCHOR) { r = Math.floor(anchorCh * 15 / 4); }
  if (b == I_jukebox || b == I_lectern || b == I_cauldron || b == I_composter || b == I_beehive || b == I_beeNest) { r = 0; }
  return r;
}
function furnaceLevel(x, y, z) {
  let r = 0;
  furnaceFind(x, y, z);
  if (fFound > 0) {
    let f = fFound, s = 0;
    if (FII[f] > 0) { s = s + FIN[f] / Math.max(1, ITST[FII[f] + 1]); }
    if (FFI[f] > 0) { s = s + FFN[f] / Math.max(1, ITST[FFI[f] + 1]); }
    if (FOI[f] > 0) { s = s + FON[f] / Math.max(1, ITST[FOI[f] + 1]); }
    if (s > 0) { r = Math.floor(1 + s / 3 * 14); }
  }
  return r;
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
// SCT the game tick it is due (-1: a free place), SCP its priority (less first: a repeater into a
// repeater -3, one going off -2, other repeaters and comparators into a repeater -1, the rest 0), SCQ
// the order asked, SCR the kind of part it is for (one of another kind there then: dropped, as the
// genre: a part moved away by a piston does not take its tick along); scN the active ones
let SCX = [], SCY = [], SCZ = [], SCD = [], SCT = [], SCW = [], SCP = [], SCQ = [], SCR = [], scSeq = 0, scN = 0;
function rsSchedule(x, y, z, t, w) { rsSchedP(x, y, z, t, w, 0); }
function rsSchedP(x, y, z, t, w, p) {
  let i = 1, f = 0, free = 0;
  while (i <= SCX.length && f == 0) {
    if (SCT[i] >= 0) { if (SCX[i] == x) { if (SCZ[i] == z && SCY[i] == y && SCD[i] == dim) { f = i; } } }
    else { if (free == 0) { free = i; } }
    i = i + 1;
  }
  if (f == 0) {
    if (free == 0) { SCX.push(0); SCY.push(0); SCZ.push(0); SCD.push(0); SCT.push(0); SCW.push(0); SCP.push(0); SCQ.push(0); SCR.push(0); free = SCX.length; }
    scSeq = scSeq + 1; scN = scN + 1;
    SCX[free] = x; SCY[free] = y; SCZ[free] = z; SCD[free] = dim; SCT[free] = gtNow + Math.max(1, Math.round(t / 0.05)); SCW[free] = w; SCP[free] = p; SCQ[free] = scSeq; SCR[free] = BRS[blockAt(x, y, z) + 1];
  }
}
// the ticks due now, in the genre's order, each with what it tells done at once
function rsTickDue() {
  let go = 1;
  while (go == 1) {
    let best = 0, i = 1;
    while (i <= SCX.length) {
      if (SCT[i] >= 0) { if (SCT[i] <= gtNow) {
        if (SCD[i] != dim) { SCT[i] = 0 - 1; scN = scN - 1; }
        else { if (rsReady(SCX[i], SCZ[i]) == 1) {
          if (best == 0) { best = i; }
          else { if (SCT[i] < SCT[best] || (SCT[i] == SCT[best] && (SCP[i] < SCP[best] || (SCP[i] == SCP[best] && SCQ[i] < SCQ[best])))) { best = i; } }
        } }
      } }
      i = i + 1;
    }
    if (best == 0) { go = 0; }
    else {
      SCT[best] = 0 - 1; scN = scN - 1;
      let x = SCX[best], y = SCY[best], z = SCZ[best];
      if (BRS[blockAt(x, y, z) + 1] == SCR[best]) { rsApply(x, y, z, SCW[best]); rsFlush(3000); }
    }
  }
}
// (v2.6) the pistons' block events: BET 0 push out, 1 pull back, 2 back without pulling (its block
// still on its way: left there); one asked twice is done once
let BEX = [], BEY = [], BEZ = [], BET = [], BED = [];
function bevAdd(x, y, z, t) {
  let i = 1, f = 0;
  while (i <= BEX.length) { if (BEX[i] == x && BEY[i] == y && BEZ[i] == z && BET[i] == t && BED[i] == dim) { f = 1; } i = i + 1; }
  if (f == 0) { BEX.push(x); BEY.push(y); BEZ.push(z); BET.push(t); BED.push(dim); }
}
function bevRun() {
  let k = 0;
  while (BEX.length > 0 && k < 2000) {
    let x = BEX[1], y = BEY[1], z = BEZ[1], t = BET[1], d = BED[1];
    BEX.removeAt(1); BEY.removeAt(1); BEZ.removeAt(1); BET.removeAt(1); BED.removeAt(1);
    if (d == dim) { if (rsReady(x, z) == 1) { pistonEvent(x, y, z, t); rsFlush(3000); } }
    k = k + 1;
  }
}
function rsTick() {
  rsPhase = 1;
  if (scN > 0) { rsTickDue(); }
  rsPhase = 2;
  if (BEX.length > 0) { bevRun(); }
  rsPhase = 3;
  if (MVX.length > 0) { mvStep(); }
  rsPhase = 0;
}
// the cells to look round (a changed one: w 1 two steps out (a part changed), + 2 a block changed there)
let NQX = [], NQY = [], NQZ = [], NQW = [], nqH = 1, nqN = 0;
// (v2.4.3) two asks of one cell as one: a real change (1, 2, 3) wins over a put back (4), and the
// two steps (1) and a block changed (2) both stay (they were merged by the larger: 1 + 2 lost the 1)
function rsMergeW(a, b) {
  let r = a;
  if (a == 4) { r = b; } else { if (b != 4) { r = 2 * Math.max(idiv(a, 2), idiv(b, 2)) + Math.max(mod(a, 2), mod(b, 2)); } }
  return r;
}
function rsNotify(x, y, z, w) {
  let k = nqN, dup = 0;
  while (k >= nqH && k > nqN - 6) {
    if (NQX[k] == x && NQY[k] == y && NQZ[k] == z) { dup = 1; NQW[k] = rsMergeW(NQW[k], w); }
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
  // (what the player did since: at once)
  rsPhase = 0;
  rsFlush(3000);
  // (v2.6) the game ticks due (a slow frame: up to four, the rest let go)
  let k = 0;
  while (rsTime >= gtT + 0.05 && k < 4) { gtT = gtT + 0.05; gtNow = gtNow + 1; rsTick(); k = k + 1; }
  if (rsTime > gtT + 0.05) { gtT = rsTime - 0.05; }
  if (RLX.length > 0) { rsLaterStep(); }
  sensorStep(dt);
  prT = prT + dt; if (prT > 30) { prT = 0; rsPrune(); }
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
// (v2.4.2, v2.4.3) a spark part next to (x, y, z): a change there not made by setBlock (a command,
// an explosion, a falling block) is told to it (an observer sees it, a wire is cut or joined by it, a
// torch on it falls, ...)
function rsNear(x, y, z) {
  let d = 0, r = 0;
  while (d < 6) { if (BRS[blockAt(x + DX6[d + 1], y + DY6[d + 1], z + DZ6[d + 1]) + 1] > 0) { r = 1; } d = d + 1; }
  return r;
}
function rsTell(x, y, z) { if (rsNear(x, y, z) == 1) { rsNotify(x, y, z, 2); } }
// w 4: a part put back from the log (a world opened again, a chunk made again): it and its
// neighbours are asked, but a door, note, command block or dispenser seen for the first time
// takes the power it has as what it had (rsReplay; edgeSet) - opening a world does not run them
let rsReplay = 0;
function rsAround(x, y, z, w) {
  let d = 0;
  if (w == 4) {
    rsReplay = 1; w = 0;
    // (an observer clock: its waiting tick is not kept, so two observers face to face start again)
    let ob = blockAt(x, y, z);
    if (BRS[ob + 1] == RS_OBSERVER) {
      let fo = BFAC[ob + 1], o2 = blockAt(x + DX6[fo + 1], y + DY6[fo + 1], z + DZ6[fo + 1]);
      if (BRS[o2 + 1] == RS_OBSERVER) { if (BFAC[o2 + 1] == OP6[fo + 1]) { rsSchedule(x, y, z, 0.1, 1); } }
    }
  }
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
      // ((v2.6) each cell two steps out once: one corner to corner was asked from both sides; the
      // genre's order, W E D U N S, kept - the first time it is met)
      let e = d;
      while (e < 6) { if (e != OP6[d + 1]) { rsEvalAt(nx + DX6[e + 1], ny + DY6[e + 1], nz + DZ6[e + 1]); } e = e + 1; }
    }
    d = d + 1;
  }
  rsReplay = 0;
}
// (v2.4.3) the cell's chunk and the four by it are made (blockAt reads a chunk not made as stone: an
// opened piston on a chunk's edge took its arm for stone and broke, a wire read no power)
function rsReady(x, z) {
  let r = 0;
  if (cOK(x, z) == 1) { if (cOK(x - 1, z) == 1 && cOK(x + 1, z) == 1 && cOK(x, z - 1) == 1 && cOK(x, z + 1) == 1) { r = 1; } }
  return r;
}
function rsEvalAt(x, y, z) {
  if (y >= 0 && y < WY) {
    // ((v2.6) a part there first (most cells are none; a chunk not made reads as stone), then its
    // chunk and the four by it made)
    let b = blockAt(x, y, z);
    if (BRS[b + 1] > 0) {
      if (rsReady(x, z) == 1) { rsEval(x, y, z, b); }
      else { if (rsReplay == 1) { if (cOK(x, z) == 1) { rsLater(x, y, z); } } }
    }
  }
}
// (v2.4.4) the remembered states of parts gone (seen where their chunk is made) are dropped
let prT = 0;
function rsPrune() {
  let i = 1;
  while (i <= EGX.length) {
    let gone = 0;
    if (EGD[i] == dim) { if (cOK(EGX[i], EGZ[i]) == 1) { let q = BRS[blockAt(EGX[i], EGY[i], EGZ[i]) + 1]; if (q != RS_DOOR && q != RS_NOTE && q != RS_COMMAND && q != RS_DISPENSER && q != RS_BELL) { gone = 1; } } }
    if (gone == 1) { EGX.removeAt(i); EGY.removeAt(i); EGZ.removeAt(i); EGD.removeAt(i); EGS.removeAt(i); } else { i = i + 1; }
  }
  i = 1;
  while (i <= CMX.length) {
    let gone = 0;
    if (CMD[i] == dim) { if (cOK(CMX[i], CMZ[i]) == 1) { if (BRS[blockAt(CMX[i], CMY[i], CMZ[i]) + 1] != RS_COMPARATOR) { gone = 1; } } }
    if (gone == 1) { CMX.removeAt(i); CMY.removeAt(i); CMZ.removeAt(i); CMD.removeAt(i); CML.removeAt(i); } else { i = i + 1; }
  }
}
// (v2.4.4) parts put back at a chunk's edge before the chunk by it was made: put back when it is
let RLX = [], RLY = [], RLZ = [], RLD = [];
function rsLater(x, y, z) {
  if (RLX.length < 512) { RLX.push(x); RLY.push(y); RLZ.push(z); RLD.push(dim); }
}
function rsLaterStep() {
  let i = 1;
  while (i <= RLX.length) {
    let done = 0;
    if (RLD[i] != dim || cOK(RLX[i], RLZ[i]) == 0) { done = 1; }
    else { if (rsReady(RLX[i], RLZ[i]) == 1) { rsNotify(RLX[i], RLY[i], RLZ[i], 4); done = 1; } }
    if (done == 1) { RLX.removeAt(i); RLY.removeAt(i); RLZ.removeAt(i); RLD.removeAt(i); } else { i = i + 1; }
  }
}

// ---------------------------------------------------------------- each part decides
// a part that cannot hang where it is falls off
function rsDrop(x, y, z, b) {
  if (worldDrops() == 1) { if (BDROP[b + 1] > 0) { dropItem(BDROP[b + 1], 1, 0, x + 0.5, y + 0.3, z + 0.5, 0); } }
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
  if (rl == RS_SENSOR) { sensorKeep(x, y, z); }
  if (rl == RS_LEVER || rl == RS_BUTTON || rl == RS_HOOK) { if (rsHangs(x, y, z, b) == 0) { rsDrop(x, y, z, b); } }
  // (v2.5) a hook on with nothing on its string any more (a world opened again): off
  if (rl == RS_HOOK) { if (on == 1) { if (pressLevel(x, y, z) == 0) { setBlock(x, y, z, hookId(BATT[b + 1], 0)); } } }
  if (rl == RS_TORCH) {
    if (rsHangs(x, y, z, b) == 0) { rsDrop(x, y, z, b); }
    else {
      let want = torchWant(x, y, z, b);
      // (burnt out: out at once, and looked at again in a while)
      if (torchBurnt(x, y, z) == 1) { if (on == 1) { setBlock(x, y, z, b + 1); } rsSchedule(x, y, z, 3.1, 0 - 1); }
      else { if (want != on) { rsSchedule(x, y, z, 0.1, want); } }
    }
  }
  if (rl == RS_REPEATER) {
    let want = 0;
    if (backIn(x, y, z, OP6[f + 1]) > 0) { want = 1; }
    if (repLocked(x, y, z, f) == 0) { if (want != on) {
      let pr = 0 - 1;
      if (diodeFront(x, y, z, f) == 1) { pr = 0 - 3; } else { if (on == 1) { pr = 0 - 2; } }
      rsSchedP(x, y, z, BAUX[b + 1] * 0.1, want, pr);
    } }
  }
  if (rl == RS_COMPARATOR) {
    let out = cmpOut(x, y, z, b);
    if (out != cmpLevel(x, y, z)) { let pr = 0; if (diodeFront(x, y, z, f) == 1) { pr = 0 - 1; } rsSchedP(x, y, z, 0.1, out, pr); }
  }
  if (rl == RS_LAMP) {
    let p = powerIn(x, y, z, 0 - 1);
    if (p > 0) { if (on == 0) { setBlock(x, y, z, b + 1); } }
    else { if (on == 1) { rsSchedule(x, y, z, 0.2, 0); } }
  }
  if (rl == RS_PISTON) {
    let hb = blockAt(x + DX6[f + 1], y + DY6[f + 1], z + DZ6[f + 1]);
    // (its arm broken off: the piston breaks too)
    // (v2.5: its arm on its way is there)
    if (on == 1 && BRS[hb + 1] != RS_MOVING && (BRS[hb + 1] != RS_HEAD || BFAC[hb + 1] != f)) { rsDrop(x, y, z, b); }
    else {
      // (v2.6) as the genre's: powered and in, it asks to push out when it can; unpowered and out, to
      // come back (without pulling when its block is still on its way); done at the tick's block events
      let want = pistonPowered(x, y, z, f);
      if (want == 1 && on == 0) { psPX = x; psPY = y; psPZ = z; if (psBuild(x + DX6[f + 1], y + DY6[f + 1], z + DZ6[f + 1], f) == 1) { bevAdd(x, y, z, 0); } }
      if (want == 0 && on == 1) { bevAdd(x, y, z, pistonBack(x, y, z, f)); }
    }
  }
  // (v2.5) powered and activator rails: on with power by them or along their line
  if (rl == RS_RAIL) { if (BAUX[b + 1] == 1 || BAUX[b + 1] == 3) { let want = railPowered(x, y, z, b); if (want != on) { setBlock(x, y, z, railId(BAUX[b + 1], BFAC[b + 1], want)); } } }
  // (v2.5) a moving block nobody moves (a world kept in the middle of a move): air
  if (rl == RS_MOVING) { if (mvAt(x, y, z) == 0) { setBlock(x, y, z, 0); } }
  // (v2.4.3) an observer on with no tick waiting (put on by a command, a world saved in its pulse)
  // stayed on for good: it goes off after its pulse (rsSchedule keeps a tick already waiting)
  if (rl == RS_OBSERVER) { if (on == 1) { rsSchedule(x, y, z, 0.1, 0); } }
  if (rl == RS_HEAD) {
    let bb = blockAt(x - DX6[f + 1], y - DY6[f + 1], z - DZ6[f + 1]);
    if (BRS[bb + 1] != RS_PISTON || BON[bb + 1] != 1 || BFAC[bb + 1] != f) { setBlock(x, y, z, 0); }
  }
  if (rl == RS_TNT) { if (rsReplay == 0) { if (powerIn(x, y, z, 0 - 1) > 0) { tntPrime(x, y, z); } } }
  if (rl == RS_DOOR || rl == RS_NOTE || rl == RS_COMMAND || rl == RS_DISPENSER || rl == RS_BELL) {
    let p = 0;
    if (powerIn(x, y, z, 0 - 1) > 0) { p = 1; }
    // (v2.5) dispensers and droppers, as pistons: power reaching the cell over them
    if (rl == RS_DISPENSER) { if (y + 1 < WY) { if (powerIn(x, y + 1, z, 2) > 0) { p = 1; } } }
    if (BPLC[b + 1] == P_DOOR) {
      // the two halves are one door: written down at the lower one
      let h0 = mod(idiv(BVAR[b + 1], 4), 2);
      if (powerIn(x, y + 1 - h0 * 2, z, 0 - 1) > 0) { p = 1; }
      edgeSet(x, y - h0, z, p);
    } else { edgeSet(x, y, z, p); }
    if (egWas != p) { rsSwitch(x, y, z, b, p); }
    else { if (rsReplay == 1 && p == 1) { if (BPLC[b + 1] == P_DOOR || BPLC[b + 1] == P_TRAPDOOR || BPLC[b + 1] == P_GATE) { rsSwitch(x, y, z, b, 1); } } }
  }
}
// (v2.4.3) what a part wants, asked again when its delay is over (as the genre asks at its tick):
// a pulse shorter than the delay no longer made a repeater go off with its input back on, and a
// comparator put out the level of when it was asked
function torchWant(x, y, z, b) {
  let a = BATT[b + 1], ax = x + DX6[a + 1], ay = y + DY6[a + 1], az = z + DZ6[a + 1], ab = blockAt(ax, ay, az), want = 1;
  if (BCOND[ab + 1] == 1) { if (blockPower(ax, ay, az) > 0) { want = 0; } }
  if (BRS[ab + 1] == RS_BLOCK) { want = 0; }
  return want;
}
function repLocked(x, y, z, f) {
  let s1 = 0, s2 = 1, r = 0;
  if (f == 0 || f == 1) { s1 = 4; s2 = 5; }
  if (rsLocks(x + DX6[s1 + 1], y, z + DZ6[s1 + 1], OP6[s1 + 1]) == 1 || rsLocks(x + DX6[s2 + 1], y, z + DZ6[s2 + 1], OP6[s2 + 1]) == 1) { r = 1; }
  return r;
}
function cmpOut(x, y, z, b) {
  let f = BFAC[b + 1], bk = OP6[f + 1], bx = x + DX6[bk + 1], bz = z + DZ6[bk + 1], a = backIn(x, y, z, bk), s1 = 0, s2 = 1, sd = 0, out = 0;
  let cb = blockAt(bx, y, bz), rd = cmpRead(bx, y, bz, cb);
  if (rd >= 0) { a = rd; }
  else { if (BCOND[cb + 1] == 1) { if (a < 15) { let c2 = blockAt(bx + DX6[bk + 1], y, bz + DZ6[bk + 1]); let cl = cmpRead(bx + DX6[bk + 1], y, bz + DZ6[bk + 1], c2); if (cl > a) { a = cl; } } } }
  if (f == 0 || f == 1) { s1 = 4; s2 = 5; }
  sd = Math.max(sideIn(x, y, z, s1), sideIn(x, y, z, s2));
  if (BAUX[b + 1] == 1) { out = Math.max(0, a - sd); } else { if (a >= sd) { out = a; } }
  return out;
}
// (v2.6) a repeater or comparator before this one's output, not pointing back into it (its tick first)
function diodeFront(x, y, z, f) {
  let nb = blockAt(x + DX6[f + 1], y, z + DZ6[f + 1]), r = 0;
  if (BRS[nb + 1] == RS_REPEATER || BRS[nb + 1] == RS_COMPARATOR) { if (BFAC[nb + 1] != OP6[f + 1]) { r = 1; } }
  return r;
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
  if (BPLC[b + 1] == P_TRAPDOOR) { let v = BVAR[b + 1]; if (on == 1 && v < 2) { setBlock(x, y, z, k + 2 + v * 4 + trapSide(x, y, z)); } if (on == 0 && v >= 2) { setBlock(x, y, z, k + idiv(v - 2, 4)); } }
  if (BPLC[b + 1] == P_GATE) { let v = BVAR[b + 1]; if (on == 1 && v < 2) { setBlock(x, y, z, b + 2); } if (on == 0 && v >= 2) { setBlock(x, y, z, b - 2); } }
  if (on == 1) {
    if (BRS[b + 1] == RS_NOTE) { notePlay(x, y, z, b); }
    if (BRS[b + 1] == RS_BELL) { bellRing(x, y, z); }
    if (BRS[b + 1] == RS_COMMAND) { commandBlockRun(x, y, z); }
    if (BRS[b + 1] == RS_DISPENSER) { dispense(x, y, z, b); }
  }
}
// (v2.5) note blocks: the note (0 .. 24) is the block's aux, the instrument the block under it (BINST);
// heard within 48 blocks, and only with air over it, as the genre
let NOTEID = [];
let NOTEN = ['파#', '솔', '솔#', '라', '라#', '시', '도', '도#', '레', '레#', '미', '파'];
function noteId(p) {
  if (NOTEID.length == 0) {
    let i = 0;
    while (i < 25) { NOTEID.push(I_noteBlock); i = i + 1; }
    let b = 1;
    while (b < NBLOCK) { if (BKIND[b + 1] == I_noteBlock) { NOTEID[BAUX[b + 1] + 1] = b; } b = b + 1; }
  }
  return NOTEID[p + 1];
}
function noteTune(x, y, z, b) {
  let p = mod(BAUX[b + 1] + 1, 25), nb = noteId(p);
  setBlock(x, y, z, nb);
  notePlay(x, y, z, nb);
  msgShow(`♪ ${NOTEN[mod(p, 12) + 1]} (${p})`, 1);
}
function notePlay(x, y, z, b) {
  if (blockAt(x, y + 1, z) == 0) {
    let dx = x + 0.5 - px, dy = y + 0.5 - py, dz = z + 0.5 - pz;
    if (dx * dx + dy * dy + dz * dz < 2304) { sndNote(BINST[blockAt(x, y - 1, z) + 1], BAUX[b + 1]); }
  }
}
function bellRing(x, y, z) {
  let dx = x + 0.5 - px, dy = y + 0.5 - py, dz = z + 0.5 - pz;
  if (dx * dx + dy * dy + dz * dz < 2304) { sndPlay(7); }
}
// ---------------------------------------------------------------- (v2.5) tripwire hooks and their string
// Two hooks facing each other with string between them (up to 40): something on the string (the
// player, a mob, an item, an arrow), or string broken without shears, puts both on, till 0.5 s after.
let HOOKID = [], teOk = 0, teX = 0, teY = 0, teZ = 0;
function hookId(a, on) {
  if (HOOKID.length == 0) {
    let i = 0;
    while (i < 12) { HOOKID.push(I_tripwireHook); i = i + 1; }
    let b = 1;
    while (b < NBLOCK) { if (BKIND[b + 1] == I_tripwireHook) { HOOKID[BATT[b + 1] * 2 + BON[b + 1] + 1] = b; } b = b + 1; }
  }
  return HOOKID[a * 2 + on + 1];
}
// from the string at (x, y, z) the way d: the hook at the end of it (teOk 1, teX ..)
function tripEnd(x, y, z, d) {
  teOk = 0;
  let k = 1, go = 1;
  while (k <= 41 && go == 1) {
    let cx = x + DX6[d + 1] * k, cz = z + DZ6[d + 1] * k, c = blockAt(cx, y, cz);
    if (BRS[c + 1] != RS_TRIP) {
      if (BRS[c + 1] == RS_HOOK) { if (BATT[c + 1] == d) { teOk = 1; teX = cx; teY = y; teZ = cz; } }
      go = 0;
    }
    k = k + 1;
  }
}
function tripHit(x, y, z) {
  let b = blockAt(x, y, z);
  if (BRS[b + 1] == RS_TRIP) {
    let d1 = 5, d2 = 4;
    if (BAUX[b + 1] == 1) { d1 = 1; d2 = 0; }
    tripEnd(x, y, z, d1);
    let ok1 = teOk, ax = teX, ay = teY, az = teZ;
    tripEnd(x, y, z, d2);
    if (ok1 == 1 && teOk == 1) { hookOn(ax, ay, az); hookOn(teX, teY, teZ); }
  }
}
function hookOn(x, y, z) {
  pressAddL(x, y, z, 0.5, 15);
  let b = blockAt(x, y, z);
  if (BON[b + 1] == 0) { setBlock(x, y, z, hookId(BATT[b + 1], 1)); sndPlay(1); }
}
// a delay is over
function rsApply(x, y, z, w) {
  let b = blockAt(x, y, z), rl = BRS[b + 1], on = BON[b + 1];
  if (rl == RS_REPEATER) {
    // (locked: it keeps what it has; going off with its input back on: it stays on; going on, it
    // goes on even if the input already went (a short pulse comes out as long as its delay))
    let f = BFAC[b + 1];
    if (repLocked(x, y, z, f) == 0) {
      let ww = w;
      if (ww == 0) { if (backIn(x, y, z, OP6[f + 1]) > 0) { ww = 1; } }
      if (ww != on) { setBlock(x, y, z, b + ww - on); }
    }
  }
  if (rl == RS_OBSERVER) { if (w != on) { setBlock(x, y, z, b + w - on); } }
  if (rl == RS_OBSERVER) { if (w == 1) { rsSchedule(x, y, z, 0.1, 0); } }
  if (rl == RS_TORCH) {
    if (w < 0) { rsNotify(x, y, z, 1); }
    else {
      let ww = torchWant(x, y, z, b);
      if (ww == 1) { if (torchBurnt(x, y, z) == 1) { ww = 0; rsSchedule(x, y, z, 3.1, 0 - 1); } }
      if (ww != on) { setBlock(x, y, z, b + on - ww); torchToggled(x, y, z); }
    }
  }
  if (rl == RS_COMPARATOR) {
    let lv = cmpOut(x, y, z, b);
    cmpSet(x, y, z, lv);
    let want = 0; if (lv > 0) { want = 1; }
    if (want != on) { setBlock(x, y, z, b + want - on); } else { rsNotify(x, y, z, 1); }
  }
  if (rl == RS_LAMP) { if (on == 1) { if (powerIn(x, y, z, 0 - 1) == 0) { setBlock(x, y, z, b - 1); } } }
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
  if (c == 0 || BLQ[c + 1] > 0 || BSPEC[c + 1] == 10) { r = 0; }
  else {
    if (BSOL[c + 1] == 0 || BSHP[c + 1] == 1 || BSHP[c + 1] == 2 || BPLC[c + 1] == P_DOOR || BPLC[c + 1] == P_BED) { r = 2; }
    if (BHARD[c + 1] < 0 || c == 34 || BUSE[c + 1] == U_CHEST || BUSE[c + 1] == U_FURNACE || BUSE[c + 1] == U_SHELL || BUSE[c + 1] == U_VOIDCHEST || BUSE[c + 1] == U_ENCHANT || BUSE[c + 1] == U_ANCHOR || BSPEC[c + 1] == 6 || BRS[c + 1] == RS_HEAD) { r = 3; }
    if (BRS[c + 1] == RS_PISTON) { if (BON[c + 1] == 1) { r = 3; } }
    if (BRS[c + 1] == RS_REPEATER || BRS[c + 1] == RS_COMPARATOR) { r = 2; }
    // (v2.5) as the genre: what keeps things in it stays (a jukebox, a lectern, a hive, a command
    // block, a light sensor, glinting obsidian); a bell and a cake break
    if (c == I_jukebox || c == I_lectern || c == I_beehive || c == I_beeNest || c == I_glintObsidian || BUSE[c + 1] == U_COMMAND || BSPEC[c + 1] == 9 || BRS[c + 1] == RS_MOVING) { r = 3; }
    if (c == I_bell || c == I_cake) { r = 2; }
    if (BRS[c + 1] == RS_RAIL) { r = 1; }
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
  let old = blockAt(x, y, z);
  logOn = 1; wput(x, y, z, b); logOn = 0;
  markDirty(x, y, z);
  // ((v2.6) the light from this cell alone, when it changes it)
  psLight(x, y, z, old, b);
  rsNotify(x, y, z, 3);
}
function psLight(x, y, z, a, b) {
  if (lightOn == 1) {
    if (BLOP[a + 1] != BLOP[b + 1] || BHC[a + 1] != BHC[b + 1]) { lightCell(x, y, z); }
    else { if (BLIT[a + 1] != BLIT[b + 1]) { blockLightSet(x, y, z, BLIT[b + 1]); } }
  }
}
// the blocks found move one cell the way psMove; the cells left behind (not the head's) get their after-effects
function psDo(hx, hy, hz, head) {
  let d = psMove, dx = DX6[d + 1], dy = DY6[d + 1], dz = DZ6[d + 1], i = 1;
  while (i <= PDX.length) { let c = blockAt(PDX[i], PDY[i], PDZ[i]); rsDrop(PDX[i], PDY[i], PDZ[i], c); partnerGone(PDX[i], PDY[i], PDZ[i], c, 0); i = i + 1; }
  // ((v2.6) a part's waiting tick stays where it was, as the genre's (it is dropped there: another
  // kind of block); an observer that lands fires, or goes off if it came on: mvPlace)
  i = 1;
  while (i <= PVX.length) { psPut(PVX[i], PVY[i], PVZ[i], 0); i = i + 1; }
  psSrc = 0;
  i = 1;
  while (i <= PVX.length) { psPutMv(PVX[i] + dx, PVY[i] + dy, PVZ[i] + dz, PVB[i]); i = i + 1; }
  if (head > 0) { psSrc = 1; psPutMv(hx, hy, hz, head); psSrc = 0; }
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
  psPX = x; psPY = y; psPZ = z; psKey = hsKey(x, y, z); psExt = 1;
  if (psBuild(x + dx, y + dy, z + dz, f) == 1) {
    setBlock(x, y, z, b + 1);
    psDo(x + dx, y + dy, z + dz, I_pistonHead + mod(f + 3, 6) * 2 + BAUX[b + 1]);
    sndPlay(1);
  }
}
// (v2.6) what a piston coming back will do: 1 pull, 2 not (the block before its arm still on its
// way out the same way, as the genre: asked in a tick's work, or before that block's second tick)
function pistonBack(x, y, z, f) {
  let i = mvAt(x + DX6[f + 1] * 2, y + DY6[f + 1] * 2, z + DZ6[f + 1] * 2), r = 1;
  if (i > 0) { if (MVF[i] == f && MVE[i] == 1) { if (rsPhase != 3 || gtNow - MVC[i] <= 1) { r = 2; } } }
  return r;
}
// a block event: the power asked again (not powered now: no push; powered again: no pull)
function pistonEvent(x, y, z, t) {
  let b = blockAt(x, y, z);
  if (BRS[b + 1] == RS_PISTON) {
    let f = BFAC[b + 1], on = BON[b + 1], pw = pistonPowered(x, y, z, f);
    if (t == 0) { if (pw == 1 && on == 0) { pistonOut(x, y, z, b, f); } }
    else { if (pw == 0 && on == 1) { pistonIn(x, y, z, b, f, t); } }
  }
}
function pistonIn(x, y, z, b, f, t) {
  let hx = x + DX6[f + 1], hy = y + DY6[f + 1], hz = z + DZ6[f + 1], pk = hsKey(x, y, z);
  // its arm still on its way out: done at once (as the genre's: the arm is then gone)
  let i = mvAt(hx, hy, hz);
  if (i > 0) { mvFinal(i); }
  // the piston itself is a moving block till its arm is in (two ticks)
  psKey = pk; psExt = 0; psMove = f; psSrc = 1;
  psPutMv(x, y, z, b - 1);
  psSrc = 0;
  let pulled = 0;
  if (BAUX[b + 1] == 1) {
    // a sticky one: the block before its arm still on its way out lands there (let go); else (a
    // pull) that block and what sticks to it come back, unless it breaks or cannot move
    let tx = hx + DX6[f + 1], ty = hy + DY6[f + 1], tz = hz + DZ6[f + 1], j = mvAt(tx, ty, tz), let2 = 0;
    if (j > 0) { if (MVF[j] == f && MVE[j] == 1) { mvFinal(j); let2 = 1; } }
    if (let2 == 0 && t == 1 && ty >= 0 && ty < WY) {
      let c = blockAt(tx, ty, tz);
      if (c != 0 && pushHow(c) == 1) {
        if (BRS[blockAt(hx, hy, hz) + 1] == RS_HEAD) { setBlock(hx, hy, hz, 0); }
        psPX = x; psPY = y; psPZ = z;
        if (psBuild(tx, ty, tz, OP6[f + 1]) == 1) { psDo(0, 0 - 1, 0, 0); }
        pulled = 1;
      }
    }
  }
  if (pulled == 0) { if (BRS[blockAt(hx, hy, hz) + 1] == RS_HEAD) { setBlock(hx, hy, hz, 0); } }
  sndPlay(1);
}
// the player, the mobs and (v2.5) the items in the cells moved into (and the arm's) go along, each
// once (a mob was moved again by each cell of a row it came into); one pushed by a jelly block flies
let pbJelly = 0;
let psHX = 0, psHY = 0, psHZ = 0, psHead = 0, psDX = 0, psDY = 0, psDZ = 0;
function pbIn(x0, y0, z0, w, h) {
  let i = 0, r = 0;
  pbJelly = 0;
  while (i <= PVX.length) {
    let cx = psHX, cy = psHY, cz = psHZ, go = 1;
    if (i == 0) { if (psHead == 0) { go = 0; } } else { cx = PVX[i] + psDX; cy = PVY[i] + psDY; cz = PVZ[i] + psDZ; }
    if (go == 1) { if (cx + 1 > x0 - w && cx < x0 + w && cz + 1 > z0 - w && cz < z0 + w && cy + 1 > y0 && cy < y0 + h) { r = 1; if (i > 0) { if (PVB[i] == I_jellyBlock) { pbJelly = 1; } } } }
    // (one on a jelly block's face, the way it goes, is thrown)
    if (go == 1 && i > 0) { if (PVB[i] == I_jellyBlock) { let fx = cx + psDX, fy = cy + psDY, fz = cz + psDZ; if (fx + 1 > x0 - w && fx < x0 + w && fz + 1 > z0 - w && fz < z0 + w && fy + 1 > y0 && fy < y0 + h) { r = 1; pbJelly = 1; } } }
    i = i + 1;
  }
  return r;
}
function pushBodies(dx, dy, dz, hx, hy, hz, head) {
  psHX = hx; psHY = hy; psHZ = hz; psHead = head; psDX = dx; psDY = dy; psDZ = dz;
  if (pbIn(px, py, pz, 0.3, 1.8) == 1) {
    px = px + dx; py = py + dy; pz = pz + dz; if (dy > 0) { pvy = Math.max(pvy, 0); }
    if (pbJelly == 1) { pvx = pvx + dx * 16; pvy = pvy + dy * 16; pvz = pvz + dz * 16; fallTop = py; }
  }
  let e = 1;
  while (e <= NMOB) {
    if (ET[e] > 0) {
      if (pbIn(EX[e], EY[e], EZ[e], MW[ET[e]] / 2, MH[ET[e]]) == 1) {
        EX[e] = EX[e] + dx; EY[e] = EY[e] + dy; EZ[e] = EZ[e] + dz;
        if (pbJelly == 1) { EVX[e] = EVX[e] + dx * 16; EVY[e] = EVY[e] + dy * 16; EVZ[e] = EVZ[e] + dz * 16; }
      }
    }
    e = e + 1;
  }
  let it = 1;
  while (it <= NITM) {
    if (IID[it] > 0) {
      if (pbIn(IXX[it], IYY[it], IZZ[it], 0.12, 0.25) == 1) {
        IXX[it] = IXX[it] + dx; IYY[it] = IYY[it] + dy; IZZ[it] = IZZ[it] + dz;
        if (pbJelly == 1) { IVX[it] = IVX[it] + dx * 16; IVY[it] = IVY[it] + dy * 16; IVZ[it] = IVZ[it] + dz * 16; }
      }
    }
    it = it + 1;
  }
}

// ---------------------------------------------------------------- (v2.5) blocks on their way
// MV*: where one lands, what it is, when it is drawn there (rsTime), the world, the way it goes (D6),
// the piston (hsKey of it), 1 pushed out / 0 pulled back, (v2.6) the game tick it set out (it lands
// two ticks after, at that tick's end), 1 the piston's own (its arm going out, or the piston coming in)
let MVX = [], MVY = [], MVZ = [], MVB = [], MVT = [], MVD = [], MVF = [], MVP = [], MVE = [], MVC = [], MVS = [];
let psKey = 0, psExt = 1, psSrc = 0, mvPX = 0, mvPY = 0, mvPZ = 0;
// a block written as it lands (the log, and a world kept now, have it there), the cell meanwhile moving
function psPutMv(x, y, z, b) {
  let old = blockAt(x, y, z);
  logOn = 1; wput(x, y, z, b); logOn = 0;
  wput(x, y, z, I_moving);
  markDirty(x, y, z);
  psLight(x, y, z, old, I_moving);
  rsNotify(x, y, z, 3);
  MVX.push(x); MVY.push(y); MVZ.push(z); MVB.push(b); MVT.push(gtT + 0.1); MVD.push(dim); MVF.push(psMove); MVP.push(psKey); MVE.push(psExt); MVC.push(gtNow); MVS.push(psSrc);
}
function mvAt(x, y, z) {
  let i = 1, r = 0;
  while (i <= MVX.length) { if (MVX[i] == x && MVY[i] == y && MVZ[i] == z && MVD[i] == dim) { r = i; } i = i + 1; }
  return r;
}
function mvDel(i) {
  MVX.removeAt(i); MVY.removeAt(i); MVZ.removeAt(i); MVB.removeAt(i); MVT.removeAt(i); MVD.removeAt(i); MVF.removeAt(i); MVP.removeAt(i); MVE.removeAt(i); MVC.removeAt(i); MVS.removeAt(i);
}
// it lands (its block put); (v2.6) an observer that lands fires (as the genre's: it sees its own
// face put), one that was on comes off
function mvLand(i) {
  let x = MVX[i], y = MVY[i], z = MVZ[i], b = MVB[i], d = MVD[i];
  mvDel(i);
  if (d == dim) { if (blockAt(x, y, z) == I_moving) { mvPlace(x, y, z, b); } }
}
function mvPlace(x, y, z, b) {
  if (BRS[b + 1] == RS_OBSERVER) {
    if (BON[b + 1] == 1) { setBlock(x, y, z, b - 1); } else { setBlock(x, y, z, b); rsSchedule(x, y, z, 0.1, 1); }
  } else { setBlock(x, y, z, b); }
}
// (v2.6) the genre's finalTick: done at once (a piston's own arm going out is then gone: air)
function mvFinal(i) {
  let x = MVX[i], y = MVY[i], z = MVZ[i], b = MVB[i], d = MVD[i], gone = 0;
  if (MVS[i] == 1 && MVE[i] == 1) { gone = 1; }
  mvDel(i);
  if (d == dim) { if (blockAt(x, y, z) == I_moving) { if (gone == 1) { setBlock(x, y, z, 0); } else { mvPlace(x, y, z, b); } } }
}
// the tick's end: the ones two ticks old land (another world's are let go)
function mvStep() {
  let i = 1;
  while (i <= MVX.length) {
    if (MVD[i] != dim) { mvDel(i); }
    else { if (gtNow - MVC[i] >= 2) { mvLand(i); rsFlush(3000); } else { i = i + 1; } }
  }
}
// where one is drawn now (the middle of its bottom)
function mvPos(i) {
  let t = Math.max(0, Math.min(1, (MVT[i] - rsTime) / 0.1)), d = MVF[i];
  mvPX = MVX[i] + 0.5 - DX6[d + 1] * t; mvPY = MVY[i] - DY6[d + 1] * t; mvPZ = MVZ[i] + 0.5 - DZ6[d + 1] * t;
}
// (v2.5) a piston's power: from its sides and back, or (quasi-connectivity) reaching the cell over it
function pistonPowered(x, y, z, f) {
  let r = 0;
  if (powerIn(x, y, z, f) > 0) { r = 1; }
  else { if (y + 1 < WY) { if (powerIn(x, y + 1, z, 2) > 0) { r = 1; } } }
  return r;
}

// ---------------------------------------------------------------- dispensers and droppers
function dispense(x, y, z, b) {
  chestFind(x, y, z);
  // (v2.4.4: on a server only the host's screen dispenses, and tells the others what left)
  if (netSrv > 0 && netSt == 2 && netHost == 0) { cFound = 0; }
  if (cFound > 0) {
    let c = cFound, k = 1, n = 0, pick = 0;
    while (k <= 27) { if (CHI[(c - 1) * 27 + k] > 0) { n = n + 1; if (rand(1, n) == 1) { pick = k; } } k = k + 1; }
    if (pick > 0) {
      let s = (c - 1) * 27 + pick, id = CHI[s], f = BFAC[b + 1], how = 0;
      let fx = x + DX6[f + 1], fy = y + DY6[f + 1], fz = z + DZ6[f + 1], fb = blockAt(fx, fy, fz);
      // (v2.4.4: a dropper puts it into a container before it; a dispenser uses what it can)
      if (BAUX[b + 1] == 1) {
        chestFind(fx, fy, fz);
        if (cFound > 0) { if (chestTake(cFound, id, 1, CHD[s]) == 1) { how = 1; } else { how = 3; } }
        cFound = c;
      } else {
        if (id == I_arrow) { arrowShoot(x + 0.5 + DX6[f + 1] * 0.6, y + 0.5 + DY6[f + 1] * 0.6, z + 0.5 + DZ6[f + 1] * 0.6, x + 0.5 + DX6[f + 1] * 10, y + 0.5 + DY6[f + 1] * 10, z + 0.5 + DZ6[f + 1] * 10, 1); how = 1; }
        if (id == I_waterBucket || id == I_lavaBucket) { if (fb == 0 || (BLQ[fb + 1] > 0 && BLV[fb + 1] > 0)) { let lq = 7; if (id == I_lavaBucket) { lq = 35; } setBlock(fx, fy, fz, lq); CHI[s] = I_bucket; how = 2; } }
        if (id == I_bucket) { if (BLQ[fb + 1] > 0 && BLV[fb + 1] == 0) { let full = I_waterBucket; if (BLQ[fb + 1] == 35) { full = I_lavaBucket; } setBlock(fx, fy, fz, 0); if (CHN[s] == 1) { CHI[s] = full; how = 2; } else { if (chestTake(c, full, 1, 0) == 1) { how = 1; } else { how = 3; } } } }
        if (id == I_tnt) { if (fb == 0 || BLQ[fb + 1] > 0) { setBlock(fx, fy, fz, I_tnt); tntLight(fx, fy, fz, worldDrops(), 4); how = 1; } }
      }
      if (how == 0) { dropItem(id, 1, CHD[s], x + 0.5 + DX6[f + 1] * 0.7, y + 0.3 + DY6[f + 1] * 0.7, z + 0.5 + DZ6[f + 1] * 0.7, 0); how = 1; }
      if (how == 1) { CHN[s] = CHN[s] - 1; }
      if (CHN[s] <= 0) { CHI[s] = 0; CHN[s] = 0; CHD[s] = 0; }
      chestTouched(c);
      if (netSrv > 0) { gS2 = `${x}^${y}^${z}^${pick}^${CHI[s]}^${CHN[s]}^${CHD[s]}`; netSay('x', gS2); hostKeepChest(gS2); }
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
  // (v2.5) a tripwire hook on a wall; string along the hook or string by it, else the way one looks
  if (rl == RS_HOOK) { if (a == 2 || a == 3 || BSOL[pickB + 1] == 0) { r = 0 - 1; } else { r = hookId(a, 0); } }
  if (rl == RS_TRIP) {
    let ax = mod(f4, 2), q = 0;
    while (q < 4) {
      let d = F2D[q + 1], nb = blockAt(nbX + DX6[d + 1], nbY, nbZ + DZ6[d + 1]), dax = 0;
      if (d == 0 || d == 1) { dax = 1; }
      if (BRS[nb + 1] == RS_HOOK) { if (BATT[nb + 1] == d) { ax = dax; } }
      if (BRS[nb + 1] == RS_TRIP) { if (BAUX[nb + 1] == dax) { ax = dax; } }
      q = q + 1;
    }
    r = I_tripwire; if (ax == 1) { r = I_tripwire_x; }
  }
  if (rl == RS_RAIL) { r = railId(BAUX[b + 1], railPick(nbX, nbY, nbZ, BAUX[b + 1], f4), 0); }
  if (rl == RS_REPEATER) { r = b + f4 * 8; }
  if (rl == RS_COMPARATOR) { r = b + f4 * 4; }
  if (rl == RS_PISTON || rl == RS_OBSERVER || rl == RS_DISPENSER) {
    let d = OP6[F2D[f4 + 1] + 1];
    if (pitch < 0 - 45) { d = 3; }
    if (pitch > 45) { d = 2; }
    // (v2.4.2) an observer looks the way the player looks, as in the genre: its back (where the
    // signal comes out) to the player. It was put the other way round, like a piston, so one put
    // looking at a plant or a door from the side watched the player's side and saw nothing.
    if (rl == RS_OBSERVER) { d = OP6[d + 1]; }
    if (rl == RS_DISPENSER) { r = b + mod(d + 3, 6); } else { r = b + mod(d + 3, 6) * 2; }
  }
  return r;
}
// F on a repeater (its delay) or a comparator (compare / subtract)
function rsUse(x, y, z, b) {
  if (BSPEC[b + 1] == 9) { if (b == I_daylight) { setBlock(x, y, z, I_daylightInv); } else { setBlock(x, y, z, I_daylight); } powerAround(x, y, z); }
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
  // (v2.4.3) a repeater's or comparator's facing= names where its input comes from, as in the genre
  // (it was taken as where it points: one put by a command worked backwards)
  if (rl == RS_REPEATER) { let d = 1; if (dl > 0) { d = Math.min(4, Math.max(1, substr(st, dl + 6, dl + 6) * 1)); } v = (mod(f + 2, 4) * 4 + d - 1) * 2 + on; }
  if (rl == RS_COMPARATOR) { let m = 0; if (indexOf(st, 'mode=subtract') > 0) { m = 1; } v = (mod(f + 2, 4) * 2 + m) * 2 + on; }
  if (rl == RS_LEVER) { v = ATTI[a + 1] * 2 + on; }
  if (rl == RS_BUTTON) { v = ATTI[a + 1]; }
  if (rl == RS_TORCH) { if (a == 3) { a = 2; } v = ATTI[a + 1] * 2; if (indexOf(st, 'lit=false') > 0) { v = v + 1; } }
  if (rl == RS_PISTON || rl == RS_OBSERVER) { v = mod(d6 + 3, 6) * 2 + on; }
  if (rl == RS_DISPENSER) { v = mod(d6 + 3, 6); }
  return v;
}

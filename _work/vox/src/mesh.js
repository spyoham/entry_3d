// ===================================================================== sections
// A section is 8 x 8 x 8 cells. Its slot: sec = (mod(sx, NSX) * NSX + mod(sz, NSX)) * NSY + sy + 1
// for world section coordinates (sx, sz) = (x, z) / 8; SOX / SOZ hold the world corner it holds
// now, SOK whether it is made.
// Its faces sit in the face pool from SF0[sec], SFN[sec] of them, room for SFC[sec], grouped by
// direction (SG). A face: FP the cell ((x + OFF) * 256 + y) * 65536 + z + OFF, FT the texture,
// FN the cell its light is read from (0: above the world, full sky), FA the corner shade.
// Groups: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z; 6 a cross plant, 7 a torch; 8..13 a face against
// water (drawn only with the eye under water); 14 a shaped block (FT its block id, FA the sides
// its arms join: 1 +z, 2 +x, 4 -z, 8 -x).
let FP = [], FT = [], FN = [], FA = [];
let SF0 = [], SFN = [], SFC = [], SVIS = [], SEMP = [], SG = [], SOX = [], SOZ = [], SOK = [], SCL = [];
let GC = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], GP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let MP = [], MD = [], MT = [], MN = [], MA = [], CF = [];   // scratch of one section (MP: a face's cell as FP keeps it; CF: a column's count)
let VMK = [], VQ = [];
let RQ = [], RQF = [];
let vStamp = 0, poolTop = 0, rqN = 0;
let POW2 = [];

function meshInit() {
  if (MP.length == 0) {
    let i = 0;
    while (i < NSEC) { SF0.push(0); SFN.push(0); SFC.push(0); SVIS.push(0); SEMP.push(1); SOX.push(0); SOZ.push(0); SOK.push(0); SCL.push(0); RQF.push(0); i = i + 1; }
    i = 0;
    while (i < NSEC * 16) { SG.push(1); i = i + 1; }
    i = 0;
    while (i < 512 * 6) { MP.push(0); MD.push(0); MT.push(0); MN.push(0); MA.push(0); i = i + 1; }
    i = 0;
    while (i < 64) { CF.push(0); i = i + 1; }
    i = 0;
    while (i < 512) { VMK.push(0); VQ.push(0); i = i + 1; }
    i = 0; let p = 1;
    while (i < 40) { POW2.push(p); p = p * 2; i = i + 1; }
    visInit();
    i = 0;
    while (i < 200) { PFH.push(0); i = i + 1; }
  }
}
function secOf(x, y, z) { return (mod(idiv(x, 8), NSX) * NSX + mod(idiv(z, 8), NSX)) * NSY + idiv(y, 8) + 1; }

// a face of block b (hide class hb, shape sh) against the cell NI holding nb
function M_face(NB, NI, DD) {
  let hn = BHC[NB + 1];
  let put = 0 - 1;
  if (hn == 0) { put = DD; if (sh == 4) { if (NB == b) { put = 0 - 1; } } }
  if (hn == 2) { if (hb == 1) { put = DD + 8; } if (sh == 4) { put = DD + 8; } }
  if (put >= 0) {
    mn = mn + 1;
    MP[mn] = xo - y * m64k; MD[mn] = put; MN[mn] = NI; MA[mn] = 0;
    if (NI > 0) { MA[mn] = aoOf(NI, DD); }
    MT[mn] = BT6[b * 6 + DD + 1];
  }
}
// liquids show a face only to what is see-through (air, plants, glass, torches)
function M_lface(NB, NI, DD) {
  if (BHC[NB + 1] == 0) {
    mn = mn + 1;
    MP[mn] = xo - y * m64k; MD[mn] = DD; MN[mn] = NI; MT[mn] = BTS[b + 1]; MA[mn] = 0;
  }
}
// shade in corners: the opaque cells round the cell n the face looks into, in the face's plane
// (one brightness step each, x8 as the colour index counts them)
function aoOf(n, d) {
  let y = mod(n - 1, WY), col = idiv(n - 1, WY), lz = mod(col, WS), lx = idiv(col, WS), c = 0, t = 0;
  if (d >= 2) {
    t = lx - 1; if (t < 0) { t = WS - 1; } if (BHC[W[(t * WS + lz) * WY + y + 1] + 1] == 1) { c = c + 1; }
    t = lx + 1; if (t >= WS) { t = 0; } if (BHC[W[(t * WS + lz) * WY + y + 1] + 1] == 1) { c = c + 1; }
  }
  if (d < 2 || d >= 4) {
    if (y > 0) { if (BHC[W[n - 1] + 1] == 1) { c = c + 1; } }
    if (y < WY - 1) { if (BHC[W[n + 1] + 1] == 1) { c = c + 1; } }
  }
  if (d < 4) {
    t = lz - 1; if (t < 0) { t = WS - 1; } if (BHC[W[(lx * WS + t) * WY + y + 1] + 1] == 1) { c = c + 1; }
    t = lz + 1; if (t >= WS) { t = 0; } if (BHC[W[(lx * WS + t) * WY + y + 1] + 1] == 1) { c = c + 1; }
  }
  // (one step each, three at most: a hole one block deep was all but black at two steps each)
  if (c > 3) { c = 3; }
  return c * 8;
}

let meshKeepVis = 0;
// (v3.5, 11-26) The face pool's places. A section's faces had a place of their own for good, a new one at the
// pool's end whenever a section in that slot had more faces than any before it (the old place left where it
// was): after 100 seconds of flight the four lists of the pool held 970,000 faces each for the 300,000 on the
// screen's side of the world, and went on growing - every value a list holds is one more thing the engine
// walks over each time it clears its heap, and that walk is what stops the game. Now a place is as long as the
// faces need, counted in sixteens; one no longer needed (the section's chunk let go, or its faces another
// number of sixteens now) is given back to the places of its length (PFH: the first of each length, the next
// kept in the place's own first FP) and the next section of that length takes it.
let PFH = [];
function poolFree(sec) {
  let c = SFC[sec];
  if (c > 0) { let h = idiv(c, 16) + 1; FP[SF0[sec]] = PFH[h]; PFH[h] = SF0[sec]; SFC[sec] = 0; }
}
function meshSectionAt(x0, y0, z0) {
  let s = secOf(x0, y0, z0);
  SOX[s] = x0; SOZ[s] = z0;
  meshSection(s);
}
// sec: a slot whose SOX / SOZ are set
function meshSection(sec) {
  meshVer = meshVer + 1;
  let x0 = SOX[sec], z0 = SOZ[sec], y0 = mod(sec - 1, NSY) * 8;
  let wx0 = mod(x0, WS), wz0 = mod(z0, WS);
  // the neighbours across the section's sides: the step to them in the window, and whether their
  // chunk is made (when not, the side is closed: its faces come when that chunk is made)
  // ((11-26) made and lit, stage 4: a face's light is read from the cell it looks into)
  let sxm = 0 - SXS, sxp = SXS, szm = 0 - WY, szp = WY, okxm = 1, okxp = 1, okzm = 1, okzp = 1, t = 0;
  if (wx0 == 0) { sxm = (WS - 1) * SXS; }
  if (wx0 + 7 == WS - 1) { sxp = 0 - (WS - 1) * SXS; }
  if (wz0 == 0) { szm = (WS - 1) * WY; }
  if (wz0 + 7 == WS - 1) { szp = 0 - (WS - 1) * WY; }
  if (mod(wx0, 16) == 0) { t = wx0 - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(t, 16) * NCH + idiv(wz0, 16) + 1] < 4) { okxm = 0; } }
  if (mod(wx0 + 7, 16) == 15) { t = wx0 + 8; if (t >= WS) { t = 0; } if (CKST[idiv(t, 16) * NCH + idiv(wz0, 16) + 1] < 4) { okxp = 0; } }
  if (mod(wz0, 16) == 0) { t = wz0 - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(wx0, 16) * NCH + idiv(t, 16) + 1] < 4) { okzm = 0; } }
  if (mod(wz0 + 7, 16) == 15) { t = wz0 + 8; if (t >= WS) { t = 0; } if (CKST[idiv(wx0, 16) * NCH + idiv(t, 16) + 1] < 4) { okzp = 0; } }
  let ax = 0, az = 0, x = x0, y = 0, z = 0, i = 0, b = 0, hb = 0, sh = 0, mn = 0, nb = 0, solid = 0, n = 0, c1 = 0, c2 = 0, c4 = 0, c8 = 0, nzc = 0, cube = 0;
  // ((11-26) xo: the part of a face's packed cell that its column gives, ((x + OFF) * 256) * 65536 + z + OFF; the
  // height goes in as - y * m64k, a difference: a sum costs the engine twice that)
  let xo = 0, m64k = 0 - 65536, n0 = 0, c0 = 0, bp = 0, bn = 0, cf = 0, whole = 0;
  // (v3.3) A look at the cells first: how many hold anything, how many are whole opaque blocks. A section
  // of nothing but air has no faces; one of nothing but whole blocks (most of what lies under the ground:
  // it was the dearest kind, 3072 looks at neighbours for no face at all) has faces only on its six sides,
  // toward what is outside it - 384 looks.
  while (ax < 8) {
    az = 0;
    while (az < 8) {
      i = ((wx0 + ax) * WS + wz0 + az) * WY + y0 + 1; y = 0; n0 = nzc; c0 = cube;
      while (y < 8) {
        b = W[i];
        if (b != 0) { nzc = nzc + 1; if (BHC[b + 1] == 1) { solid = solid + 1; if (BSHP[b + 1] == 0) { cube = cube + 1; } } }
        y = y + 1; i = i + 1;
      }
      // ((11-26) the column: how many of its eight cells hold anything, x 16, and how many are whole opaque blocks)
      CF[ax * 8 + az + 1] = (nzc - n0) * 16 + cube - c0;
      az = az + 1;
    }
    ax = ax + 1;
  }
  if (MESHFAST == 0) { cube = 0; nzc = 1; }
  hb = 1; sh = 0;
  if (cube == 512) {
    // -x and +x sides
    if (okxm == 0) { c1 = 1; } else {
      az = 0; x = x0;
      while (az < 8) { z = z0 + az; xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); y = y0; i = (wx0 * WS + wz0 + az) * WY + y0 + 1; while (y < y0 + 8) { b = W[i]; n = i + sxm; nb = W[n]; M_face(nb, n, 0); y = y + 1; i = i + 1; } az = az + 1; }
    }
    if (okxp == 0) { c2 = 1; } else {
      az = 0; x = x0 + 7; ax = 7;
      while (az < 8) { z = z0 + az; xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); y = y0; i = ((wx0 + 7) * WS + wz0 + az) * WY + y0 + 1; while (y < y0 + 8) { b = W[i]; n = i + sxp; nb = W[n]; M_face(nb, n, 1); y = y + 1; i = i + 1; } az = az + 1; }
    }
    // under and over
    ax = 0;
    while (ax < 8) {
      az = 0; x = x0 + ax;
      while (az < 8) {
        z = z0 + az; xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); i = ((wx0 + ax) * WS + wz0 + az) * WY + y0 + 1;
        if (y0 > 0) { y = y0; b = W[i]; n = i - 1; nb = W[n]; M_face(nb, n, 2); }
        y = y0 + 7; i = i + 7; b = W[i];
        if (y < WY - 1) { n = i + 1; nb = W[n]; } else { n = 0; nb = 0; }
        M_face(nb, n, 3);
        az = az + 1;
      }
      ax = ax + 1;
    }
    // -z and +z sides
    if (okzm == 0) { c4 = 1; } else {
      ax = 0; z = z0;
      while (ax < 8) { x = x0 + ax; xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); y = y0; i = ((wx0 + ax) * WS + wz0) * WY + y0 + 1; while (y < y0 + 8) { b = W[i]; n = i + szm; nb = W[n]; M_face(nb, n, 4); y = y + 1; i = i + 1; } ax = ax + 1; }
    }
    if (okzp == 0) { c8 = 1; } else {
      ax = 0; z = z0 + 7;
      while (ax < 8) { x = x0 + ax; xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); y = y0; i = ((wx0 + ax) * WS + wz0 + 7) * WY + y0 + 1; while (y < y0 + 8) { b = W[i]; n = i + szp; nb = W[n]; M_face(nb, n, 5); y = y + 1; i = i + 1; } ax = ax + 1; }
    }
    ax = 8;
  } else { ax = 0; if (nzc == 0) { ax = 8; } }
  while (ax < 8) {
    az = 0;
    while (az < 8) {
      x = x0 + ax; z = z0 + az;
      y = y0; i = ((wx0 + ax) * WS + wz0 + az) * WY + y0 + 1;
      // ((v3.5, 11-26) The column's count from the first look (CF): nothing in it - no look at all. Eight whole
      // opaque blocks, and the four columns beside it in this section the same: its cells can show a face only
      // under the lowest and over the highest - two looks where there were 48 (most of the stone round a cave).
      // Otherwise the cells one by one as before, but the cell under and the cell over are carried along
      // (bp, bn: each cell of the column read once, where a cell that held something read three).
      cf = CF[ax * 8 + az + 1]; whole = 0;
      if (cf == 136) { if (ax > 0) { if (ax < 7) { if (az > 0) { if (az < 7) {
        if (CF[ax * 8 + az - 7] == 136) { if (CF[ax * 8 + az + 9] == 136) { if (CF[ax * 8 + az] == 136) { if (CF[ax * 8 + az + 2] == 136) { whole = 1; } } } }
      } } } } }
      if (cf == 0) { y = y0 + 8; }
      if (whole == 1) {
        xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); hb = 1; sh = 0;
        if (y0 > 0) { b = W[i]; n = i - 1; nb = W[n]; M_face(nb, n, 2); }
        y = y0 + 7; i = i + 7; b = W[i];
        if (y < WY - 1) { n = i + 1; nb = W[n]; } else { n = 0; nb = 0; }
        M_face(nb, n, 3);
        y = y0 + 8;
      }
      if (y < y0 + 8) { xo = ((x + OFF) * 256) * 65536 - (0 - z - OFF); bn = W[i]; bp = 0; if (y0 > 0) { bp = W[i - 1]; } }
      while (y < y0 + 8) {
        b = bn;
        if (y < WY - 1) { bn = W[i + 1]; } else { bn = 0; }
        if (b != 0) {
          hb = BHC[b + 1]; sh = BSHP[b + 1];
          if (sh == 0 || sh == 4 || sh == 3) {
            // the six neighbours (1: a closed side, stone)
            if (ax > 0) { n = i - SXS; nb = W[n]; } else { if (okxm == 1) { n = i + sxm; nb = W[n]; } else { n = 0; nb = 1; c1 = 1; } }
            if (sh == 3) { M_lface(nb, n, 0); } else { M_face(nb, n, 0); }
            if (ax < 7) { n = i + SXS; nb = W[n]; } else { if (okxp == 1) { n = i + sxp; nb = W[n]; } else { n = 0; nb = 1; c2 = 1; } }
            if (sh == 3) { M_lface(nb, n, 1); } else { M_face(nb, n, 1); }
            if (y > 0) { n = i - 1; nb = bp; if (sh == 3) { M_lface(nb, n, 2); } else { M_face(nb, n, 2); } }
            if (y < WY - 1) { n = i + 1; nb = bn; } else { n = 0; nb = 0; }
            if (sh == 3) { M_lface(nb, n, 3); } else { M_face(nb, n, 3); }
            if (az > 0) { n = i - WY; nb = W[n]; } else { if (okzm == 1) { n = i + szm; nb = W[n]; } else { n = 0; nb = 1; c4 = 1; } }
            if (sh == 3) { M_lface(nb, n, 4); } else { M_face(nb, n, 4); }
            if (az < 7) { n = i + WY; nb = W[n]; } else { if (okzp == 1) { n = i + szp; nb = W[n]; } else { n = 0; nb = 1; c8 = 1; } }
            if (sh == 3) { M_lface(nb, n, 5); } else { M_face(nb, n, 5); }
          } else {
            // a plant, a torch or a shaped block: one entry, drawn as its own shape
            mn = mn + 1;
            MP[mn] = xo - y * m64k; MD[mn] = 5 + sh; MN[mn] = i; MT[mn] = BTS[b + 1]; MA[mn] = 0;
            if (sh == 2) { MT[mn] = b; }
            if (sh == 5) { MD[mn] = 14; MT[mn] = b; if (BCONN[b + 1] > 0) { MA[mn] = connOf(x, y, z, b); } }
          }
        }
        bp = b;
        y = y + 1; i = i + 1;
      }
      az = az + 1;
    }
    ax = ax + 1;
  }
  // into the pool (a new place at the end when the old one is too small), grouped:
  // SG[(sec - 1) * 16 + g + 1] is where group g starts (g 14: the end)
  // ((v3.5, 11-26) only for a section that has faces: one without is never asked for its groups (render.js
  // findSections takes the sections with SEMP 0) - and most sections have none: the counting and the 31 group
  // starts were written for each of them, 50 writes a section, 60,000 sections on a flight)
  if (mn > 0) {
  // ((11-26) a place of the size the faces need, in sixteens, from those given back or new at the end: poolFree)
  let f0 = SF0[sec], need = idiv(mn + 15, 16);
  if (SFC[sec] != need * 16) {
    poolFree(sec);
    f0 = PFH[need + 1];
    if (f0 > 0) { PFH[need + 1] = FP[f0]; }
    else {
      f0 = poolTop + 1;
      let k = 0;
      while (k < need * 16) { FP.push(0); FT.push(0); FN.push(0); FA.push(0); k = k + 1; }
      poolTop = poolTop + need * 16;
    }
    SF0[sec] = f0; SFC[sec] = need * 16;
  }
  let k = 1, f = f0, g = 0;
  while (g < 16) { GC[g + 1] = 0; g = g + 1; }
  while (k <= mn) { g = MD[k] + 1; GC[g] = GC[g] + 1; k = k + 1; }
  let sb = (sec - 1) * 16;
  g = 0; f = f0;
  while (g < 15) { SG[sb + g + 1] = f; GP[g + 1] = f; f = f + GC[g + 1]; g = g + 1; }
  SG[sb + 16] = f;
  k = 1;
  while (k <= mn) {
    g = MD[k] + 1; f = GP[g]; GP[g] = f + 1;
    FP[f] = MP[k]; FT[f] = MT[k]; FN[f] = MN[k]; FA[f] = MA[k];
    k = k + 1;
  }
  } else { if (SFC[sec] > 0) { poolFree(sec); } }
  SFN[sec] = mn; SOK[sec] = 1;
  // the sides left closed with blocks against them: meshed again when that chunk is made
  SCL[sec] = c1 + c2 * 2 + c4 * 4 + c8 * 8;
  if (mn == 0) { SEMP[sec] = 1; } else { SEMP[sec] = 0; }
  // which sides of the section see each other through it
  // ((11-26) not again for a section meshed again with its own cells as they were: remeshSome)
  if (meshKeepVis == 0) {
    if (solid == 0) { SVIS[sec] = 68719476735; }
    else { if (solid == 512) { SVIS[sec] = 0; } else { sectionVis(sec, wx0, y0, wz0); } }
  }
}

// flood the see-through cells of the section; every pair of sides one region touches is
// joined (bit a * 6 + b). Local cell li = lx * 64 + lz * 8 + ly; (x0, z0) in the window.
// (v3.5, 11-26) It took 140 us a section, a third of the meshing: every cell's place in the world worked out
// again for each of its six neighbours (two quotients, two remainders, three products), and the sides a region
// had met kept as bits of one number, put in with a quotient and a remainder each. Now the cells that stop the
// eye are marked first, in one walk up the columns (512 looks at the world, where the flood took up to six a
// cell); the flood asks the marks alone; the six sides are six flags; and the pairs of sides come of a table of
// "either of two side sets" (VOR), a row of six for each side: the same number as before.
let VOR = [], VMS = [];
function visInit() {
  // VOR[a * 64 + b + 1]: the sides in a or in b (6 bits each)
  let a = 0, b = 0, k = 0, r = 0;
  while (a < 64) {
    b = 0;
    while (b < 64) {
      r = 0; k = 0;
      while (k < 6) { if (mod(idiv(a, POW2[k + 1]), 2) == 1 || mod(idiv(b, POW2[k + 1]), 2) == 1) { r = r + POW2[k + 1]; } k = k + 1; }
      VOR.push(r);
      b = b + 1;
    }
    VMS.push(0);
    a = a + 1;
  }
}
function sectionVis(sec, x0, y0, z0) {
  vStamp = vStamp + 1;
  let st = vStamp, lx = 0, lz = 0, ly = 0, li = 1, i = 0;
  // the cells that stop the eye (VMK is 1-based: cell li - 1)
  while (lx < 8) {
    lz = 0;
    while (lz < 8) {
      i = ((x0 + lx) * WS + z0 + lz) * WY + y0 + 1; ly = 0;
      while (ly < 8) { if (BHC[W[i] + 1] == 1) { VMK[li] = st; } i = i + 1; li = li + 1; ly = ly + 1; }
      lz = lz + 1;
    }
    lx = lx + 1;
  }
  let r0 = 0, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0, f0 = 0, f1 = 0, f2 = 0, f3 = 0, f4 = 0, f5 = 0, qh = 1, qt = 1, c = 0, n = 0, t = 0, m = 0;
  li = 1;
  while (li <= 512) {
    if (VMK[li] != st) {
      // a region not met yet: flooded from here
      f0 = 0; f1 = 0; f2 = 0; f3 = 0; f4 = 0; f5 = 0;
      qh = 1; qt = 1; VQ[1] = li; VMK[li] = st;
      while (qh <= qt) {
        c = VQ[qh]; qh = qh + 1;
        ly = mod(c - 1, 8); t = idiv(c - 1, 8); lz = mod(t, 8); lx = idiv(t, 8);
        if (lx == 0) { f0 = 1; } else { n = c - 64; if (VMK[n] != st) { VMK[n] = st; qt = qt + 1; VQ[qt] = n; } }
        if (lx == 7) { f1 = 1; } else { n = c + 64; if (VMK[n] != st) { VMK[n] = st; qt = qt + 1; VQ[qt] = n; } }
        if (ly == 0) { f2 = 1; } else { n = c - 1; if (VMK[n] != st) { VMK[n] = st; qt = qt + 1; VQ[qt] = n; } }
        if (ly == 7) { f3 = 1; } else { n = c + 1; if (VMK[n] != st) { VMK[n] = st; qt = qt + 1; VQ[qt] = n; } }
        if (lz == 0) { f4 = 1; } else { n = c - 8; if (VMK[n] != st) { VMK[n] = st; qt = qt + 1; VQ[qt] = n; } }
        if (lz == 7) { f5 = 1; } else { n = c + 8; if (VMK[n] != st) { VMK[n] = st; qt = qt + 1; VQ[qt] = n; } }
      }
      // (a set of sides met before adds nothing)
      m = f0 + f1 * 2 + f2 * 4 + f3 * 8 + f4 * 16 + f5 * 32;
      if (VMS[m + 1] != st) {
        VMS[m + 1] = st;
        if (f0 == 1) { r0 = VOR[r0 * 64 + m + 1]; }
        if (f1 == 1) { r1 = VOR[r1 * 64 + m + 1]; }
        if (f2 == 1) { r2 = VOR[r2 * 64 + m + 1]; }
        if (f3 == 1) { r3 = VOR[r3 * 64 + m + 1]; }
        if (f4 == 1) { r4 = VOR[r4 * 64 + m + 1]; }
        if (f5 == 1) { r5 = VOR[r5 * 64 + m + 1]; }
      }
    }
    li = li + 1;
  }
  SVIS[sec] = r0 + r1 * 64 + r2 * 4096 + r3 * 262144 + r4 * 16777216 + r5 * 1073741824;
}
// sections to mesh again some frames later (a few a frame)
function remeshLater(s) {
  if (RQF[s] != 1) { RQF[s] = 1; rqN = rqN + 1; if (rqN > RQ.length) { RQ.push(s); } else { RQ[rqN] = s; } }
}
function remeshSome(n) {
  while (n > 0 && rqN > 0) {
    let s = RQ[rqN]; rqN = rqN - 1; RQF[s] = 0;
    if (SOK[s] == 1) { meshKeepVis = 1; meshSection(s); meshKeepVis = 0; }
    n = n - 1;
  }
}

// the sides a fence, wall or pane joins: the same kind of joining, a gate (fences), or a full block
// (a spark wire: the sides it points to, power.js)
function connOf(x, y, z, b) {
  let c = BCONN[b + 1], r = 0;
  if (c == 4) { r = wireArms(x, y, z); }
  else {
    if (connTo(blockAt(x, y, z + 1), c) == 1) { r = r + 1; }
    if (connTo(blockAt(x + 1, y, z), c) == 1) { r = r + 2; }
    if (connTo(blockAt(x, y, z - 1), c) == 1) { r = r + 4; }
    if (connTo(blockAt(x - 1, y, z), c) == 1) { r = r + 8; }
  }
  return r;
}
function connTo(nb, c) {
  let r = 0;
  if (BCONN[nb + 1] == c) { r = 1; }
  if (BSHP[nb + 1] == 0) { if (BHC[nb + 1] == 1) { if (BLEAF[nb + 1] == 0) { r = 1; } } }
  if (c == 1) { if (BPLC[nb + 1] == P_GATE) { r = 1; } }
  if (c == 3) { if (BSHP[nb + 1] == 4) { r = 1; } if (BCONN[nb + 1] == 2) { r = 1; } }
  if (c == 2) { if (BCONN[nb + 1] == 3) { r = 1; } }
  return r;
}

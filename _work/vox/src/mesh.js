// ===================================================================== sections
// A section is 8 x 8 x 8 cells. Its slot: sec = (mod(sx, NSX) * NSX + mod(sz, NSX)) * NSY + sy + 1
// for world section coordinates (sx, sz) = (x, z) / 8; SOX / SOZ hold the world corner it holds
// now, SOK whether it is made.
// Its faces sit in the face pool from SF0[sec], SFN[sec] of them, room for SFC[sec], grouped by
// direction (SG). A face: FP the cell ((x + OFF) * 256 + y) * 65536 + z + OFF, FT the texture,
// FN the cell its light is read from (0: above the world, full sky), FA the corner shade.
// Groups: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z; 6 a cross plant, 7 a torch; 8..13 a face against
// water (drawn only with the eye under water).
let FP = [], FT = [], FN = [], FA = [];
let SF0 = [], SFN = [], SFC = [], SVIS = [], SEMP = [], SG = [], SOX = [], SOZ = [], SOK = [], SCL = [];
let GC = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], GP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let MX = [], MY = [], MZ = [], MD = [], MT = [], MN = [], MA = [];   // scratch of one section
let VMK = [], VQ = [];
let RQ = [], RQF = [];
let vStamp = 0, poolTop = 0, rqN = 0;
let POW2 = [];

function meshInit() {
  if (MX.length == 0) {
    let i = 0;
    while (i < NSEC) { SF0.push(0); SFN.push(0); SFC.push(0); SVIS.push(0); SEMP.push(1); SOX.push(0); SOZ.push(0); SOK.push(0); SCL.push(0); RQF.push(0); i = i + 1; }
    i = 0;
    while (i < NSEC * 16) { SG.push(1); i = i + 1; }
    i = 0;
    while (i < 512 * 6) { MX.push(0); MY.push(0); MZ.push(0); MD.push(0); MT.push(0); MN.push(0); MA.push(0); i = i + 1; }
    i = 0;
    while (i < 512) { VMK.push(0); VQ.push(0); i = i + 1; }
    i = 0; let p = 1;
    while (i < 40) { POW2.push(p); p = p * 2; i = i + 1; }
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
    MX[mn] = x; MY[mn] = y; MZ[mn] = z; MD[mn] = put; MN[mn] = NI; MA[mn] = 0;
    if (NI > 0) { MA[mn] = aoOf(NI, DD); }
    if (DD == 3) { MT[mn] = BTT[b + 1]; } else { if (DD == 2) { MT[mn] = BTB[b + 1]; } else { MT[mn] = BTS[b + 1]; } }
  }
}
// liquids show a face only to what is see-through (air, plants, glass, torches)
function M_lface(NB, NI, DD) {
  if (BHC[NB + 1] == 0) {
    mn = mn + 1;
    MX[mn] = x; MY[mn] = y; MZ[mn] = z; MD[mn] = DD; MN[mn] = NI; MT[mn] = BTS[b + 1]; MA[mn] = 0;
  }
}
// shade in corners: the opaque cells round the cell n the face looks into, in the face's plane
// (two brightness steps each, x8 as the colour index counts them)
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
  if (c > 3) { c = 3; }
  return c * 16;
}

function meshSectionAt(x0, y0, z0) {
  let s = secOf(x0, y0, z0);
  SOX[s] = x0; SOZ[s] = z0;
  meshSection(s);
}
// sec: a slot whose SOX / SOZ are set
function meshSection(sec) {
  let x0 = SOX[sec], z0 = SOZ[sec], y0 = mod(sec - 1, NSY) * 8;
  let wx0 = mod(x0, WS), wz0 = mod(z0, WS);
  // the neighbours across the section's sides: the step to them in the window, and whether their
  // chunk is made (when not, the side is closed: its faces come when that chunk is made)
  let sxm = 0 - SXS, sxp = SXS, szm = 0 - WY, szp = WY, okxm = 1, okxp = 1, okzm = 1, okzp = 1, t = 0;
  if (wx0 == 0) { sxm = (WS - 1) * SXS; }
  if (wx0 + 7 == WS - 1) { sxp = 0 - (WS - 1) * SXS; }
  if (wz0 == 0) { szm = (WS - 1) * WY; }
  if (wz0 + 7 == WS - 1) { szp = 0 - (WS - 1) * WY; }
  if (mod(wx0, 16) == 0) { t = wx0 - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(t, 16) * NCH + idiv(wz0, 16) + 1] < 3) { okxm = 0; } }
  if (mod(wx0 + 7, 16) == 15) { t = wx0 + 8; if (t >= WS) { t = 0; } if (CKST[idiv(t, 16) * NCH + idiv(wz0, 16) + 1] < 3) { okxp = 0; } }
  if (mod(wz0, 16) == 0) { t = wz0 - 1; if (t < 0) { t = WS - 1; } if (CKST[idiv(wx0, 16) * NCH + idiv(t, 16) + 1] < 3) { okzm = 0; } }
  if (mod(wz0 + 7, 16) == 15) { t = wz0 + 8; if (t >= WS) { t = 0; } if (CKST[idiv(wx0, 16) * NCH + idiv(t, 16) + 1] < 3) { okzp = 0; } }
  let ax = 0, az = 0, x = x0, y = 0, z = 0, i = 0, b = 0, hb = 0, sh = 0, mn = 0, nb = 0, solid = 0, n = 0, c1 = 0, c2 = 0, c4 = 0, c8 = 0;
  while (ax < 8) {
    az = 0;
    while (az < 8) {
      x = x0 + ax; z = z0 + az;
      y = y0; i = ((wx0 + ax) * WS + wz0 + az) * WY + y0 + 1;
      while (y < y0 + 8) {
        b = W[i];
        if (b != 0) {
          hb = BHC[b + 1]; sh = BSHP[b + 1];
          if (hb == 1) { solid = solid + 1; }
          if (sh == 0 || sh == 4 || sh == 3) {
            // the six neighbours (1: a closed side, stone)
            if (ax > 0) { n = i - SXS; nb = W[n]; } else { if (okxm == 1) { n = i + sxm; nb = W[n]; } else { n = 0; nb = 1; c1 = 1; } }
            if (sh == 3) { M_lface(nb, n, 0); } else { M_face(nb, n, 0); }
            if (ax < 7) { n = i + SXS; nb = W[n]; } else { if (okxp == 1) { n = i + sxp; nb = W[n]; } else { n = 0; nb = 1; c2 = 1; } }
            if (sh == 3) { M_lface(nb, n, 1); } else { M_face(nb, n, 1); }
            if (y > 0) { n = i - 1; nb = W[n]; if (sh == 3) { M_lface(nb, n, 2); } else { M_face(nb, n, 2); } }
            if (y < WY - 1) { n = i + 1; nb = W[n]; } else { n = 0; nb = 0; }
            if (sh == 3) { M_lface(nb, n, 3); } else { M_face(nb, n, 3); }
            if (az > 0) { n = i - WY; nb = W[n]; } else { if (okzm == 1) { n = i + szm; nb = W[n]; } else { n = 0; nb = 1; c4 = 1; } }
            if (sh == 3) { M_lface(nb, n, 4); } else { M_face(nb, n, 4); }
            if (az < 7) { n = i + WY; nb = W[n]; } else { if (okzp == 1) { n = i + szp; nb = W[n]; } else { n = 0; nb = 1; c8 = 1; } }
            if (sh == 3) { M_lface(nb, n, 5); } else { M_face(nb, n, 5); }
          } else {
            // a plant or a torch: one entry, drawn as its own shape
            mn = mn + 1;
            MX[mn] = x; MY[mn] = y; MZ[mn] = z; MD[mn] = 5 + sh; MN[mn] = i; MT[mn] = BTS[b + 1]; MA[mn] = 0;
          }
        }
        y = y + 1; i = i + 1;
      }
      az = az + 1;
    }
    ax = ax + 1;
  }
  // into the pool (a new place at the end when the old one is too small), grouped:
  // SG[(sec - 1) * 16 + g + 1] is where group g starts (g 14: the end)
  let f0 = SF0[sec];
  if (mn > SFC[sec]) {
    f0 = poolTop + 1;
    let room = mn + 48, k = 0;
    while (k < room) { FP.push(0); FT.push(0); FN.push(0); FA.push(0); k = k + 1; }
    poolTop = poolTop + room;
    SF0[sec] = f0; SFC[sec] = room;
  }
  let k = 1, f = f0, g = 0;
  while (g < 15) { GC[g + 1] = 0; g = g + 1; }
  while (k <= mn) { g = MD[k] + 1; GC[g] = GC[g] + 1; k = k + 1; }
  let sb = (sec - 1) * 16;
  g = 0; f = f0;
  while (g < 14) { SG[sb + g + 1] = f; GP[g + 1] = f; f = f + GC[g + 1]; g = g + 1; }
  SG[sb + 15] = f;
  k = 1;
  while (k <= mn) {
    g = MD[k] + 1; f = GP[g]; GP[g] = f + 1;
    FP[f] = ((MX[k] + OFF) * 256 + MY[k]) * 65536 + MZ[k] + OFF; FT[f] = MT[k]; FN[f] = MN[k]; FA[f] = MA[k];
    k = k + 1;
  }
  SFN[sec] = mn; SOK[sec] = 1;
  // the sides left closed with blocks against them: meshed again when that chunk is made
  SCL[sec] = c1 + c2 * 2 + c4 * 4 + c8 * 8;
  if (mn == 0) { SEMP[sec] = 1; } else { SEMP[sec] = 0; }
  // which sides of the section see each other through it
  if (solid == 0) { SVIS[sec] = 68719476735; }
  else { if (solid == 512) { SVIS[sec] = 0; } else { sectionVis(sec, wx0, y0, wz0); } }
}

// flood the see-through cells of the section; every pair of sides one region touches is
// joined (bit a * 6 + b). Local cell li = lx * 64 + lz * 8 + ly; (x0, z0) in the window.
let visM = 0;
function sectionVis(sec, x0, y0, z0) {
  vStamp = vStamp + 1;
  let vis = 0, lx = 0, ly = 0, lz = 0, li = 0, i = 0;
  li = 0;
  while (li < 512) {
    lx = idiv(li, 64); lz = mod(idiv(li, 8), 8); ly = mod(li, 8);
    i = ((x0 + lx) * WS + z0 + lz) * WY + y0 + ly + 1;
    if (VMK[li + 1] != vStamp) {
      if (BHC[W[i] + 1] != 1) {
        visM = 0;
        visFlood(li, x0, y0, z0);
        // every pair of the sides in visM
        let a = 0;
        while (a < 6) {
          if (mod(idiv(visM, POW2[a + 1]), 2) == 1) {
            let c = 0;
            while (c < 6) {
              if (mod(idiv(visM, POW2[c + 1]), 2) == 1) {
                let bit = POW2[a * 6 + c + 1];
                if (mod(idiv(vis, bit), 2) == 0) { vis = vis + bit; }
              }
              c = c + 1;
            }
          }
          a = a + 1;
        }
      } else { VMK[li + 1] = vStamp; }
    }
    li = li + 1;
  }
  SVIS[sec] = vis;
}
function visFlood(start, x0, y0, z0) {
  let qh = 1, qt = 1, li = 0, lx = 0, ly = 0, lz = 0, n = 0;
  VQ[1] = start; VMK[start + 1] = vStamp;
  let m = 0;
  while (qh <= qt) {
    li = VQ[qh]; qh = qh + 1;
    lx = idiv(li, 64); lz = mod(idiv(li, 8), 8); ly = mod(li, 8);
    if (lx == 0) { m = m - mod(idiv(m, 1), 2) + 1; }
    if (lx == 7) { m = m - mod(idiv(m, 2), 2) * 2 + 2; }
    if (ly == 0) { m = m - mod(idiv(m, 4), 2) * 4 + 4; }
    if (ly == 7) { m = m - mod(idiv(m, 8), 2) * 8 + 8; }
    if (lz == 0) { m = m - mod(idiv(m, 16), 2) * 16 + 16; }
    if (lz == 7) { m = m - mod(idiv(m, 32), 2) * 32 + 32; }
    if (lx > 0) { n = li - 64; M_vn(n, x0, y0, z0); }
    if (lx < 7) { n = li + 64; M_vn(n, x0, y0, z0); }
    if (ly > 0) { n = li - 1; M_vn(n, x0, y0, z0); }
    if (ly < 7) { n = li + 1; M_vn(n, x0, y0, z0); }
    if (lz > 0) { n = li - 8; M_vn(n, x0, y0, z0); }
    if (lz < 7) { n = li + 8; M_vn(n, x0, y0, z0); }
  }
  visM = m;
}
function M_vn(NL, X0, Y0, Z0) {
  if (VMK[NL + 1] != vStamp) {
    let ci = ((X0 + idiv(NL, 64)) * WS + Z0 + mod(idiv(NL, 8), 8)) * WY + Y0 + mod(NL, 8) + 1;
    if (BHC[W[ci] + 1] != 1) { VMK[NL + 1] = vStamp; qt = qt + 1; VQ[qt] = NL; }
  }
}

// sections to mesh again some frames later (a few a frame)
function remeshLater(s) {
  if (RQF[s] != 1) { RQF[s] = 1; rqN = rqN + 1; if (rqN > RQ.length) { RQ.push(s); } else { RQ[rqN] = s; } }
}
function remeshSome(n) {
  while (n > 0 && rqN > 0) {
    let s = RQ[rqN]; rqN = rqN - 1; RQF[s] = 0;
    if (SOK[s] == 1) { meshSection(s); }
    n = n - 1;
  }
}

// ===================================================================== sections
// A section is 8 x 8 x 8 cells: sec = (sx * NSX + sz) * NSY + sy + 1.
// Its faces sit in the face pool FX.. from SF0[sec], SFN[sec] of them, room for SFC[sec].
// A face: the cell (FX, FY, FZ), the direction FD, the texture FT and the cell its light is
// read from (FN, 0: outside the world, full sky).
// FD: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z; 6 a cross plant, 7 a torch; 8..13 a face against
// water (drawn only with the eye under water).
let FP = [], FD = [], FT = [], FN = [], FA = [];
let SF0 = [], SFN = [], SFC = [], SVIS = [], SEMP = [], SG = [];
let GC = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], GP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let MX = [], MY = [], MZ = [], MD = [], MT = [], MN = [], MA = [];   // scratch of one section
let VMK = [], VQ = [];
let vStamp = 0, poolTop = 0;
let POW2 = [];

function meshInit() {
  FP = []; FD = []; FT = []; FN = []; FA = [];
  SF0 = []; SFN = []; SFC = []; SVIS = []; SEMP = []; SG = [];
  poolTop = 0;
  let i = 0;
  while (i < NSEC) { SF0.push(0); SFN.push(0); SFC.push(0); SVIS.push(0); SEMP.push(1); i = i + 1; }
  i = 0;
  while (i < NSEC * 16) { SG.push(1); i = i + 1; }
  if (MX.length == 0) {
    i = 0;
    while (i < 16 * 16 * 16 * 3) { MX.push(0); MY.push(0); MZ.push(0); MD.push(0); MT.push(0); MN.push(0); MA.push(0); i = i + 1; }
    i = 0;
    while (i < 4096) { VMK.push(0); VQ.push(0); i = i + 1; }
    i = 0; let p = 1;
    while (i < 40) { POW2.push(p); p = p * 2; i = i + 1; }
  }
}

// a face of block b (hide class hb, shape sh) against the cell NI holding nb
function M_face(NB, NI, DD) {
  let hn = BHC[NB + 1];
  let put = 0 - 1;
  if (hn == 0) { put = DD; if (sh == 4) { if (NB == b) { put = 0 - 1; } } }
  if (hn == 2) { if (hb == 1) { put = DD + 8; } if (sh == 4) { put = DD + 8; } }
  if (put >= 0) {
    mn = mn + 1;
    MX[mn] = x; MY[mn] = y; MZ[mn] = z; MD[mn] = put; MN[mn] = NI; MA[mn] = 0;
    if (NI > 0) { MA[mn] = aoOf(x, y, z, DD); }
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
// shade in corners: the opaque cells round the cell the face looks into, in the face's plane
// (two brightness steps each, x8 as the colour index counts them)
function aoOf(x, y, z, d) {
  let nx = x, ny = y, nz = z, n = 0;
  if (d == 0) { nx = x - 1; } if (d == 1) { nx = x + 1; } if (d == 2) { ny = y - 1; } if (d == 3) { ny = y + 1; } if (d == 4) { nz = z - 1; } if (d == 5) { nz = z + 1; }
  if (d >= 2) { if (nx > 0) { if (BHC[W[((nx - 1) * SZ + nz) * WY + ny + 1] + 1] == 1) { n = n + 1; } } if (nx < SZ - 1) { if (BHC[W[((nx + 1) * SZ + nz) * WY + ny + 1] + 1] == 1) { n = n + 1; } } }
  if (d < 2 || d >= 4) { if (ny > 0) { if (BHC[W[(nx * SZ + nz) * WY + ny] + 1] == 1) { n = n + 1; } } if (ny < WY - 1) { if (BHC[W[(nx * SZ + nz) * WY + ny + 2] + 1] == 1) { n = n + 1; } } }
  if (d < 4) { if (nz > 0) { if (BHC[W[(nx * SZ + nz - 1) * WY + ny + 1] + 1] == 1) { n = n + 1; } } if (nz < SZ - 1) { if (BHC[W[(nx * SZ + nz + 1) * WY + ny + 1] + 1] == 1) { n = n + 1; } } }
  if (n > 3) { n = 3; }
  return n * 16;
}

function meshSection(sec) {
  let s0 = sec - 1;
  let sy = mod(s0, NSY), sxz = idiv(s0, NSY);
  let sz = mod(sxz, NSX), sx = idiv(sxz, NSX);
  let x0 = sx * 8, y0 = sy * 8, z0 = sz * 8;
  let x = x0, y = 0, z = 0, i = 0, b = 0, hb = 0, sh = 0, mn = 0, nb = 0, solid = 0;
  while (x < x0 + 8) {
    z = z0;
    while (z < z0 + 8) {
      y = y0; i = (x * SZ + z) * WY + y0 + 1;
      while (y < y0 + 8) {
        b = W[i];
        if (b != 0) {
          hb = BHC[b + 1]; sh = BSHP[b + 1];
          if (hb == 1) { solid = solid + 1; }
          if (sh == 0 || sh == 4) {
            if (x > 0) { nb = W[i - SXS]; M_face(nb, i - SXS, 0); } else { M_face(0, 0, 0); }
            if (x < SZ - 1) { nb = W[i + SXS]; M_face(nb, i + SXS, 1); } else { M_face(0, 0, 1); }
            if (y > 0) { nb = W[i - 1]; M_face(nb, i - 1, 2); }
            if (y < WY - 1) { nb = W[i + 1]; M_face(nb, i + 1, 3); } else { M_face(0, 0, 3); }
            if (z > 0) { nb = W[i - WY]; M_face(nb, i - WY, 4); } else { M_face(0, 0, 4); }
            if (z < SZ - 1) { nb = W[i + WY]; M_face(nb, i + WY, 5); } else { M_face(0, 0, 5); }
          } else { if (sh == 3) {
            if (x > 0) { nb = W[i - SXS]; M_lface(nb, i - SXS, 0); }
            if (x < SZ - 1) { nb = W[i + SXS]; M_lface(nb, i + SXS, 1); }
            if (y > 0) { nb = W[i - 1]; M_lface(nb, i - 1, 2); }
            if (y < WY - 1) { nb = W[i + 1]; M_lface(nb, i + 1, 3); } else { M_lface(0, 0, 3); }
            if (z > 0) { nb = W[i - WY]; M_lface(nb, i - WY, 4); }
            if (z < SZ - 1) { nb = W[i + WY]; M_lface(nb, i + WY, 5); }
          } else {
            // a plant or a torch: one entry, drawn as its own shape
            mn = mn + 1;
            MX[mn] = x; MY[mn] = y; MZ[mn] = z; MD[mn] = 5 + sh; MN[mn] = i; MT[mn] = BTS[b + 1]; MA[mn] = 0;
          } }
        }
        y = y + 1; i = i + 1;
      }
      z = z + 1;
    }
    x = x + 1;
  }
  // into the pool (a new place at the end when the old one is too small), grouped by FD:
  // SG[(sec - 1) * 16 + g + 1] is where group g starts (g 14: the end)
  let f0 = SF0[sec];
  if (mn > SFC[sec]) {
    f0 = poolTop + 1;
    let room = mn + 48, k = 0;
    while (k < room) { FP.push(0); FD.push(0); FT.push(0); FN.push(0); FA.push(0); k = k + 1; }
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
    FP[f] = MX[k] * 65536 + MY[k] * 256 + MZ[k]; FD[f] = MD[k]; FT[f] = MT[k]; FN[f] = MN[k]; FA[f] = MA[k];
    k = k + 1;
  }
  SFN[sec] = mn;
  if (mn == 0) { SEMP[sec] = 1; } else { SEMP[sec] = 0; }
  // which sides of the section see each other through it
  if (solid == 0) { SVIS[sec] = 68719476735; }
  else { if (solid == 512) { SVIS[sec] = 0; } else { sectionVis(sec, x0, y0, z0); } }
}

// flood the see-through cells of the section; every pair of sides one region touches is
// joined (bit a * 6 + b). Local cell li = lx * 64 + lz * 8 + ly.
let visM = 0;
function sectionVis(sec, x0, y0, z0) {
  vStamp = vStamp + 1;
  let vis = 0, lx = 0, ly = 0, lz = 0, li = 0, i = 0;
  li = 0;
  while (li < 512) {
    lx = idiv(li, 64); lz = mod(idiv(li, 8), 8); ly = mod(li, 8);
    i = ((x0 + lx) * SZ + z0 + lz) * WY + y0 + ly + 1;
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
    let ci = ((X0 + idiv(NL, 64)) * SZ + Z0 + mod(idiv(NL, 8), 8)) * WY + Y0 + mod(NL, 8) + 1;
    if (BHC[W[ci] + 1] != 1) { VMK[NL + 1] = vStamp; qt = qt + 1; VQ[qt] = NL; }
  }
}

// a cell changed: its section again, and the one next door when it sits on the edge
function secOf(x, y, z) { return (idiv(x, 8) * NSX + idiv(z, 8)) * NSY + idiv(y, 8) + 1; }
function cellChanged(x, y, z) {
  meshSection(secOf(x, y, z));
  let lx = mod(x, 8), ly = mod(y, 8), lz = mod(z, 8);
  if (lx == 0) { if (x > 0) { meshSection(secOf(x - 1, y, z)); } }
  if (lx == 7) { if (x < SZ - 1) { meshSection(secOf(x + 1, y, z)); } }
  if (ly == 0) { if (y > 0) { meshSection(secOf(x, y - 1, z)); } }
  if (ly == 7) { if (y < WY - 1) { meshSection(secOf(x, y + 1, z)); } }
  if (lz == 0) { if (z > 0) { meshSection(secOf(x, y, z - 1)); } }
  if (lz == 7) { if (z < SZ - 1) { meshSection(secOf(x, y, z + 1)); } }
}

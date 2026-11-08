// ===================================================================== drawing the world
// Painter's order without sorting: a cube can only hide cubes whose cell is farther from the
// eye's cell in |dx| + |dy| + |dz| (along a sight line every cell coordinate moves away from
// the eye's, so the sum grows). The faces go into buckets by that sum and the buckets are
// drawn from far to near. Inside a cube the faces that face the eye never overlap.
//
// Camera space is whole numbers: a world point (x, y, z) in 1/256 block, turned by r** (x16384).
let camX = 0, camY = 0, camZ = 0, camYaw = 0, camPitch = 0, FOC = 210;
let cxi = 0, cyi = 0, czi = 0, cx256 = 0, cy256 = 0, cz256 = 0;
let r11 = 0, r13 = 0, r21 = 0, r22 = 0, r23 = 0, r31 = 0, r32 = 0, r33 = 0;
let ux1 = 0, ux2 = 0, ux3 = 0, uy2 = 0, uy3 = 0, uz1 = 0, uz2 = 0, uz3 = 0;
let tanX = 1, tanY = 0.6, kX = 1.5, kY = 1.2;
let frameNo = 0, nFill = 0, nFace = 0, nSec = 0, nScan = 0;
let viewR = 32, viewR2 = 1024, kMax = 80, dark = 0, underWater = 0;
let HD = [], BF = [], BN = [], BD2 = [];
let bTop = 0;
let FOGL = [];
let CT = [];
let ctPos = 0, fogR = 170, fogG = 205, fogB = 250, fogHex = '#aaccff';
let SVF = [], SIN = [], SQ = [], SFI = [];
let skyHex = '#78a7ff', voidHex = '#101018';

function renderInit() {
  let i = 0;
  HD = [];
  while (i < 220) { HD.push(0); i = i + 1; }
  BF = []; BN = []; BD2 = [];
  SVF = []; SIN = []; SQ = []; i = 0;
  VSL = [];
  SFI = [];
  while (i < NSEC) { SVF.push(0); SIN.push(0); SQ.push(0); VSL.push(0); SFI.push(0); i = i + 1; }
  CT = []; i = 0;
  while (i < NCOL * 192) { CT.push('#000000'); i = i + 1; }
  ctPos = 0;
  ctBuild(NCOL * 192);
  setView(viewR);
}
// light (sky * 16 + block) and face direction -> brightness step x 8, for the darkness of now
let LTK = [];
let ltkDark = -1;
function ltkBuild() {
  if (LTK.length == 0) { let i = 0; while (i < 2048) { LTK.push(0); i = i + 1; } }
  let lt = 0, d = 0, lv = 0, bl = 0;
  while (lt < 256) {
    lv = idiv(lt, 16) - dark; bl = mod(lt, 16);
    if (bl > lv) { lv = bl; } if (lv < dimAmb) { lv = dimAmb; }
    if (nightVis == 1) { lv = 15; }
    d = 0;
    while (d < 8) { LTK[lt * 8 + d + 1] = BIDX[lv * 8 + d + 1] * 8; d = d + 1; }
    lt = lt + 1;
  }
  ltkDark = dark;
}
// the render distance: fog over its last 38 %
function setView(r) {
  viewR = r; viewR2 = r * r; kMax = Math.floor(r * 1.45) + WY + 2;
  FOGL = [];
  let d2 = 0, f = 0;
  while (d2 <= viewR2 + 2) {
    f = Math.round((Math.sqrt(d2) / r - 0.62) / 0.38 * 7);
    if (f < 0) { f = 0; } if (f > 7) { f = 7; }
    FOGL.push(f);
    d2 = d2 + 1;
  }
}
// the colour table: base colour x 24 brightness x 8 fog, mixed toward the fog colour.
// Rebuilt a part a frame when the sky changes.
let CBR = [], CBG = [], CBB = [];
function ctBuild(n) {
  if (CBR.length == 0) {
    // the base colours at each brightness, once (whole numbers)
    let c = 0, b = 0;
    while (c < NCOL) {
      b = 0;
      while (b < 24) { CBR.push(Math.round(COLR[c + 1] * KF[b + 1] * 7)); CBG.push(Math.round(COLG[c + 1] * KF[b + 1] * 7)); CBB.push(Math.round(COLB[c + 1] * KF[b + 1] * 7)); b = b + 1; }
      c = c + 1;
    }
  }
  let k = 0, cb = 0, f = 0, p = 0, fr = fogR, fg = fogG, fb = fogB, e = NCOL * 192;
  while (k < n) {
    p = mod(ctPos, e);
    cb = idiv(p, 8) + 1; f = mod(p, 8);
    // (7 - f) / 7 of the colour, f / 7 of the fog
    CT[p + 1] = rgb(idiv(CBR[cb] * (7 - f) - (0 - fr * 7 * f), 49), idiv(CBG[cb] * (7 - f) - (0 - fg * 7 * f), 49), idiv(CBB[cb] * (7 - f) - (0 - fb * 7 * f), 49));
    ctPos = ctPos + 1; k = k + 1;
  }
}

function setCamera() {
  let sy = sind(camYaw), cy = cosd(camYaw), sp = sind(camPitch), cp = cosd(camPitch);
  r11 = Math.round(16384 * cy); r13 = Math.round(-16384 * sy);
  r21 = Math.round(-16384 * sy * sp); r22 = Math.round(16384 * cp); r23 = Math.round(-16384 * cy * sp);
  r31 = Math.round(16384 * sy * cp); r32 = Math.round(16384 * sp); r33 = Math.round(16384 * cy * cp);
  ux1 = r11 * 256; ux2 = r21 * 256; ux3 = r31 * 256; uy2 = r22 * 256; uy3 = r32 * 256; uz1 = r13 * 256; uz2 = r23 * 256; uz3 = r33 * 256;
  tanX = 240 / FOC; tanY = 135 / FOC;
  kX = Math.sqrt(1 + tanX * tanX); kY = Math.sqrt(1 + tanY * tanY);
  cx256 = Math.round(camX * 256); cy256 = Math.round(camY * 256); cz256 = Math.round(camZ * 256);
  cxi = Math.floor(camX); cyi = Math.floor(camY); czi = Math.floor(camZ);
  frameNo = frameNo + 1;
}
// a sphere (world, blocks) in the view?
let inV = 0;
function inView(x, y, z, rad) {
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  let vz = (r31 * dx + r32 * dy + r33 * dz) / 16384;
  let vx = (r11 * dx + r13 * dz) / 16384;
  let vy = (r21 * dx + r22 * dy + r23 * dz) / 16384;
  inV = 0;
  if (vz > 0 - rad) { if (Math.abs(vx) <= vz * tanX + rad * kX) { if (Math.abs(vy) <= vz * tanY + rad * kY) { inV = 1; } } }
}

// ---------------------------------------------------------------- the sections to draw
// From the eye's section outward, never back toward the eye, through a section only between
// sides its open cells join (the cave culling of block games), and only into the view.
let VSL = [];
let nVS = 0;
// NS: the slot of world section (NX, ny, NZ) (blocks)
function M_secTry(NS, NX, NZ, FOUT, FIN) {
  if (SVF[NS] != frameNo) { if (SOK[NS] == 1) { if (SOX[NS] == NX) { if (SOZ[NS] == NZ) {
    let ok = 1;
    if (fin0 >= 0) { if (NOCAVE == 0) { if (mod(idiv(vis0, POW2[fin0 * 6 + FOUT + 1]), 2) == 0) { ok = 0; } } }
    if (ok == 1) {
      let nsy = mod(NS - 1, NSY);
      // the middle of the section against the view, as whole numbers (256 a block)
      let qx = NX * 256 - hx, qz = NZ * 256 - hz, qy = nsy * 2048 - hy;
      if (qx * qx + qz * qz < vlim) {
        let p1 = n1x * qx + n1y * qy + n1z * qz, p2 = n2x * qx + n2y * qy + n2z * qz, p3 = n3x * qx + n3y * qy + n3z * qz, p4 = n4x * qx + n4y * qy + n4z * qz;
        if (p1 >= sm1 && p2 >= sm1 && p3 >= sm2 && p4 >= sm2) {
          SVF[NS] = frameNo; SIN[NS] = FIN; qt = qt + 1; SQ[qt] = NS;
          SFI[NS] = 0;
          if (p1 >= fm1 * 8 && p2 >= fm1 * 8 && p3 >= fm2 * 8 && p4 >= fm2 * 8) { SFI[NS] = 1; }
        }
      }
    }
  } } } }
}
function findSections() {
  let csx = Math.floor(camX / 8), csy = Math.floor(camY / 8), csz = Math.floor(camZ / 8);
  let qh = 1, qt = 0, s = 0, sy = 0, fin0 = 0, vis0 = 0, n = 0, x0 = 0, z0 = 0;
  // (section middles: hx = eye - 4 blocks; a section reaches 6.93 blocks from its middle, the
  // margins fm are for 0.87 block)
  let hx = cx256 - 1024, hy = cy256 - 1024, hz = cz256 - 1024, sm1 = 0 - fm1 * 8, sm2 = 0 - fm2 * 8;
  let vlim = (viewR + 7) * (viewR + 7) * 65536;
  nVS = 0;
  if (csy >= NSY || csy < 0) {
    // above (or below) the world: every section of the top layer near the eye, from above
    let ly = NSY - 1, lf = 3;
    if (csy < 0) { ly = 0; lf = 2; }
    fin0 = 0 - 1;
    let rr = idiv(viewR, 8) + 2, a = csx - rr;
    while (a <= csx + rr) {
      let c = csz - rr;
      while (c <= csz + rr) {
        n = (mod(a, NSX) * NSX + mod(c, NSX)) * NSY + ly + 1;
        M_secTry(n, a * 8, c * 8, 0, lf);
        c = c + 1;
      }
      a = a + 1;
    }
    if (csy >= NSY) { csy = NSY - 1; } else { csy = 0; }
  } else {
    n = (mod(csx, NSX) * NSX + mod(csz, NSX)) * NSY + csy + 1;
    if (SOK[n] == 1) { SVF[n] = frameNo; SIN[n] = 0 - 1; SFI[n] = 0; qt = 1; SQ[1] = n; }
  }
  let ex = csx * 8, ez = csz * 8;
  while (qh <= qt) {
    s = SQ[qh]; qh = qh + 1;
    if (SEMP[s] == 0) { nVS = nVS + 1; VSL[nVS] = s; }
    sy = mod(s - 1, NSY); x0 = SOX[s]; z0 = SOZ[s];
    fin0 = SIN[s]; vis0 = SVIS[s];
    // move -x (enter by +x) ... ; never toward the eye's section
    if (x0 <= ex) { n = (mod(idiv(x0, 8) - 1, NSX) * NSX + mod(idiv(z0, 8), NSX)) * NSY + sy + 1; M_secTry(n, x0 - 8, z0, 0, 1); }
    if (x0 >= ex) { n = (mod(idiv(x0, 8) + 1, NSX) * NSX + mod(idiv(z0, 8), NSX)) * NSY + sy + 1; M_secTry(n, x0 + 8, z0, 1, 0); }
    if (sy > 0) { if (sy <= csy) { n = s - 1; M_secTry(n, x0, z0, 2, 3); } }
    if (sy < NSY - 1) { if (sy >= csy) { n = s + 1; M_secTry(n, x0, z0, 3, 2); } }
    if (z0 <= ez) { n = (mod(idiv(x0, 8), NSX) * NSX + mod(idiv(z0, 8) - 1, NSX)) * NSY + sy + 1; M_secTry(n, x0, z0 - 8, 4, 5); }
    if (z0 >= ez) { n = (mod(idiv(x0, 8), NSX) * NSX + mod(idiv(z0, 8) + 1, NSX)) * NSY + sy + 1; M_secTry(n, x0, z0 + 8, 5, 4); }
  }
}

// ---------------------------------------------------------------- faces into the buckets
// the four side planes of the view as whole numbers (normal . (point - eye) >= -margin is in)
let n1x = 0, n1y = 0, n1z = 0, n2x = 0, n2y = 0, n2z = 0, n3x = 0, n3y = 0, n3z = 0, n4x = 0, n4y = 0, n4z = 0, fm1 = 0, fm2 = 0;
function frustumSetup() {
  n1x = r31 * 240 - r11 * FOC; n1y = r32 * 240; n1z = r33 * 240 - r13 * FOC;
  n2x = r31 * 240 + r11 * FOC; n2y = r32 * 240; n2z = r33 * 240 + r13 * FOC;
  n3x = r31 * 135 - r21 * FOC; n3y = r32 * 135 - r22 * FOC; n3z = r33 * 135 - r23 * FOC;
  n4x = r31 * 135 + r21 * FOC; n4y = r32 * 135 + r22 * FOC; n4z = r33 * 135 + r23 * FOC;
  // a cell reaches 0.87 block from its middle (256 a block)
  fm1 = Math.round(Math.sqrt(n1x * n1x + n1y * n1y + n1z * n1z) * 225);
  fm2 = Math.round(Math.sqrt(n3x * n3x + n3y * n3y + n3z * n3z) * 225);
}
// one group of faces of a section: all (mode 1) or each tested against the eye's cell (2);
// tv: the direction they face (wet faces count as their dry direction)
function collectGroup(f, fe, mode, tv, full) {
  // (sums written as differences: tessvm's + first asks whether either side is text)
  let x = 0, y = 0, z = 0, p = 0, ok = 1, qx = 0, qy = 0, qz = 0, dx = 0, dy = 0, dz = 0, ndy = 0, ndz = 0, d2 = 0, k = 0;
  let a1 = n1x, a2 = 0 - n1y, a3 = 0 - n1z, b1 = n2x, b2 = 0 - n2y, b3 = 0 - n2z, c1 = n3x, c2 = 0 - n3y, c3 = 0 - n3z, e1 = n4x, e2 = 0 - n4y, e3 = 0 - n4z;
  let m1 = 0 - fm1, m2 = 0 - fm2, hx = cx256 - 128, hy = cy256 - 128, hz = cz256 - 128, cx = cxi, cy = cyi, cz = czi, vr2 = viewR2, bt = bTop;
  nScan = nScan - (f - fe);
  while (f < fe) {
    p = FP[f]; x = idiv(p, 16777216); p = p - x * 16777216; y = idiv(p, 65536); z = p - y * 65536 - OFF; x = x - OFF;
    ok = 1;
    if (mode == 2) {
      ok = 0;
      if (tv < 2) { if (tv == 0) { if (cx < x) { ok = 1; } } else { if (x < cx) { ok = 1; } } }
      else { if (tv < 4) { if (tv == 2) { if (cy < y) { ok = 1; } } else { if (y < cy) { ok = 1; } } }
      else { if (tv == 4) { if (cz < z) { ok = 1; } } else { if (z < cz) { ok = 1; } } } }
    }
    if (ok == 1) {
      if (full == 0) {
        qx = x * 256 - hx; qy = y * 256 - hy; qz = z * 256 - hz;
        ok = 0;
        if (a1 * qx - a2 * qy - a3 * qz >= m1) { if (b1 * qx - b2 * qy - b3 * qz >= m1) {
          if (c1 * qx - c2 * qy - c3 * qz >= m2) { if (e1 * qx - e2 * qy - e3 * qz >= m2) { ok = 1; } }
        } }
      }
      if (ok == 1) {
          dx = x - cx; dy = y - cy; dz = z - cz; ndz = cz - z;
          d2 = dx * dx - ndz * dz;
          if (d2 <= vr2) {
            k = Math.abs(dx) - (0 - Math.abs(dy) - Math.abs(dz) - 1);
            bt = bt - (0 - 1);
            // (the distance and the direction in one number: d2 * 8 + direction)
            if (bt > BF.length) { BF.push(f); BN.push(HD[k]); BD2.push(d2 * 8 - (0 - tv)); }
            else { BF[bt] = f; BN[bt] = HD[k]; BD2[bt] = d2 * 8 - (0 - tv); }
            HD[k] = bt;
          }
      }
    }
    f = f - (0 - 1);
  }
  bTop = bt;
}
function M_grp(G, MODE, TV) {
  f = SG[sb + G + 1]; fe = SG[sb + G + 2];
  if (f < fe) { collectGroup(f, fe, MODE, TV, full); }
}
function collectFaces() {
  let k = 0;
  while (k <= kMax) { HD[k + 1] = 0; k = k + 1; }
  bTop = 0; nScan = 0;
  let vi = 1, s = 0, f = 0, fe = 0, sb = 0, x0 = 0, y0 = 0, z0 = 0, sxz = 0, full = 0, cx = cxi, cy = cyi, cz = czi;
  while (vi <= nVS) {
    s = VSL[vi]; vi = vi + 1;
    sb = (s - 1) * 16;
    y0 = mod(s - 1, NSY) * 8; z0 = SOZ[s]; x0 = SOX[s]; full = SFI[s];
    // -x faces (on the plane x) are seen from the west of it, +x faces (x + 1) from the east ...
    if (cx < x0 + 7) { if (cx < x0) { M_grp(0, 1, 0); } else { M_grp(0, 2, 0); } }
    if (cx > x0) { if (cx > x0 + 7) { M_grp(1, 1, 1); } else { M_grp(1, 2, 1); } }
    if (cy < y0 + 7) { if (cy < y0) { M_grp(2, 1, 2); } else { M_grp(2, 2, 2); } }
    if (cy > y0) { if (cy > y0 + 7) { M_grp(3, 1, 3); } else { M_grp(3, 2, 3); } }
    if (cz < z0 + 7) { if (cz < z0) { M_grp(4, 1, 4); } else { M_grp(4, 2, 4); } }
    if (cz > z0) { if (cz > z0 + 7) { M_grp(5, 1, 5); } else { M_grp(5, 2, 5); } }
    M_grp(6, 1, 6);
    M_grp(7, 1, 7);
    // faces against water, only with the eye under water
    if (underWater == 1) {
      if (cx < x0 + 7) { M_grp(8, 2, 0); }
      if (cx > x0) { M_grp(9, 2, 1); }
      if (cy < y0 + 7) { M_grp(10, 2, 2); }
      if (cy > y0) { M_grp(11, 2, 3); }
      if (cz < z0 + 7) { M_grp(12, 2, 4); }
      if (cz > z0) { M_grp(13, 2, 5); }
    }
  }
}
// a thing (mob, item, arrow; id < 0) at a point, into the buckets
function bucketThing(id, x, y, z) {
  let dx = Math.floor(x) - cxi, dy = Math.floor(y) - cyi, dz = Math.floor(z) - czi;
  let d2 = dx * dx + dz * dz;
  if (d2 <= viewR2) {
    let k = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
    if (k <= kMax) {
      bTop = bTop + 1;
      if (bTop > BF.length) { BF.push(id); BN.push(HD[k + 1]); BD2.push(d2 * 8); }
      else { BF[bTop] = id; BN[bTop] = HD[k + 1]; BD2[bTop] = d2 * 8; }
      HD[k + 1] = bTop;
    }
  }
}

// ---------------------------------------------------------------- drawing the buckets
// the four corners of the face in camera space go to q0x .. q3z (globals) for the rare paths
let q0x = 0, q0y = 0, q0z = 0, q1x = 0, q1y = 0, q1z = 0, q2x = 0, q2y = 0, q2z = 0, q3x = 0, q3y = 0, q3z = 0;
function M_c(AX, AY, AZ, BXX, BXY, BXZ) { AX = BXX; AY = BXY; AZ = BXZ; }
function drawBuckets() {
  // (whole numbers throughout; sums written as differences, see collectGroup)
  let key = kMax, n = 0, f = 0, d = 0, x = 0, y = 0, z = 0, d2 = 0, t = 0, ni = 0, kb = 0, ca = 0, p = 0, nk = 0;
  let bx = 0, by = 0, bz = 0, ex = 0, ey = 0, ez = 0;
  let a0x = 0, a0y = 0, a0z = 0, a1x = 0, a1y = 0, a1z = 0, a2x = 0, a2y = 0, a2z = 0, a3x = 0, a3y = 0, a3z = 0;
  let p0x = 0, p0y = 0, p1x = 0, p1y = 0, p2x = 0, p2y = 0, p3x = 0, p3y = 0, on = 0;
  let foc = FOC, nz = NEARZ, sw = 250, sh = 145, nsw = 0 - 250, nsh = 0 - 145, dec2 = DEC2;
  let c11 = r11, c13 = 0 - r13, c21 = r21, c22 = 0 - r22, c23 = 0 - r23, c31 = r31, c32 = 0 - r32, c33 = 0 - r33;
  let mx1 = 0 - ux1, mx2 = 0 - ux2, mx3 = 0 - ux3, my2 = 0 - uy2, my3 = 0 - uy3, mz1 = 0 - uz1, mz2 = 0 - uz2, mz3 = 0 - uz3;
  let hx = cx256, hy = cy256, hz = cz256;
  while (key >= 0) {
    n = HD[key + 1];
    while (n > 0) {
      f = BF[n];
      if (f > 0) {
        p = BD2[n]; d2 = idiv(p, 8); d = p - d2 * 8;
        p = FP[f]; x = idiv(p, 16777216); p = p - x * 16777216; y = idiv(p, 65536); z = p - y * 65536 - OFF; x = x - OFF;
        // the cell's corner (x, y, z) in camera space
        ex = x * 256 - hx; ey = y * 256 - hy; ez = z * 256 - hz;
        bx = c11 * ex - c13 * ez;
        by = c21 * ex - c22 * ey - c23 * ez;
        bz = c31 * ex - c32 * ey - c33 * ez;
        // light of the cell the face looks into, and the fog
        ni = FN[f];
        if (ni > 0) { kb = LTK[LT[ni] * 8 + d + 1] - FA[f]; if (kb < 0) { kb = 0; } } else { kb = LTK[1920 + d + 1]; }
        nk = 0 - kb - FOGL[d2 + 1] - 1;
        t = FT[f];
        if (d < 6) {
          if (d < 2) {
            if (d == 0) {
              a0x = bx; a0y = by - my2; a0z = bz - my3;
              a1x = bx - mz1; a1y = a0y - mz2; a1z = a0z - mz3;
              a2x = a1x; a2y = by - mz2; a2z = bz - mz3;
              a3x = bx; a3y = by; a3z = bz;
            } else {
              a2x = bx - mx1; a2y = by - mx2; a2z = bz - mx3;
              a1x = a2x; a1y = a2y - my2; a1z = a2z - my3;
              a0x = a1x - mz1; a0y = a1y - mz2; a0z = a1z - mz3;
              a3x = a2x - mz1; a3y = a2y - mz2; a3z = a2z - mz3;
            }
          } else { if (d < 4) {
            if (d == 3) {
              a0x = bx; a0y = by - my2; a0z = bz - my3;
              a1x = a0x - mx1; a1y = a0y - mx2; a1z = a0z - mx3;
              a2x = a1x - mz1; a2y = a1y - mz2; a2z = a1z - mz3;
              a3x = a0x - mz1; a3y = a0y - mz2; a3z = a0z - mz3;
            } else {
              a3x = bx; a3y = by; a3z = bz;
              a0x = bx - mz1; a0y = by - mz2; a0z = bz - mz3;
              a1x = a0x - mx1; a1y = a0y - mx2; a1z = a0z - mx3;
              a2x = bx - mx1; a2y = by - mx2; a2z = bz - mx3;
            }
          } else {
            if (d == 4) {
              a2x = bx; a2y = by; a2z = bz;
              a1x = bx; a1y = by - my2; a1z = bz - my3;
              a0x = a1x - mx1; a0y = a1y - mx2; a0z = a1z - mx3;
              a3x = bx - mx1; a3y = by - mx2; a3z = bz - mx3;
            } else {
              a3x = bx - mz1; a3y = by - mz2; a3z = bz - mz3;
              a0x = a3x; a0y = a3y - my2; a0z = a3z - my3;
              a1x = a0x - mx1; a1y = a0y - mx2; a1z = a0z - mx3;
              a2x = a3x - mx1; a2y = a3y - mx2; a2z = a3z - mx3;
            }
          } }
          if (a0z > nz && a1z > nz && a2z > nz && a3z > nz) {
            p0x = a0x * foc / a0z; p0y = a0y * foc / a0z;
            p1x = a1x * foc / a1z; p1y = a1y * foc / a1z;
            p2x = a2x * foc / a2z; p2y = a2y * foc / a2z;
            p3x = a3x * foc / a3z; p3y = a3y * foc / a3z;
            on = 1;
            if (p0x > sw) { if (p1x > sw) { if (p2x > sw) { if (p3x > sw) { on = 0; } } } }
            if (p0x < nsw) { if (p1x < nsw) { if (p2x < nsw) { if (p3x < nsw) { on = 0; } } } }
            if (p0y > sh) { if (p1y > sh) { if (p2y > sh) { if (p3y > sh) { on = 0; } } } }
            if (p0y < nsh) { if (p1y < nsh) { if (p2y < nsh) { if (p3y < nsh) { on = 0; } } } }
            if (on == 1) {
              ca = TAVG[t];
              // near, or see-through (TAVG < 0): the texture's rects
              if (d2 <= dec2 || ca < 0) {
                M_c(q0x, q0y, q0z, a0x, a0y, a0z); M_c(q1x, q1y, q1z, a1x, a1y, a1z); M_c(q2x, q2y, q2z, a2x, a2y, a2z); M_c(q3x, q3y, q3z, a3x, a3y, a3z);
                drawNear(t, kb, FOGL[d2 + 1], d2);
              } else {
                fillStop(); goto(p0x, p0y); fillColorHex(CT[ca - nk]); fillStart(); goto(p1x, p1y); goto(p2x, p2y); goto(p3x, p3y);
                nFill = nFill - (0 - 1);
              }
            }
          } else {
            if (a0z > nz || a1z > nz || a2z > nz || a3z > nz) {
              ca = TAVG[t];
              if (ca >= 0) {
                M_c(q0x, q0y, q0z, a0x, a0y, a0z); M_c(q1x, q1y, q1z, a1x, a1y, a1z); M_c(q2x, q2y, q2z, a2x, a2y, a2z); M_c(q3x, q3y, q3z, a3x, a3y, a3z);
                clipQuad(CT[ca - nk]);
              }
            }
          }
        } else {
          if (d == 6) { drawPlant(t, bx, by, bz, kb, FOGL[d2 + 1], d2); } else { drawTorch(bx, by, bz, FOGL[d2 + 1]); }
        }
      } else { drawThing(0 - f, idiv(BD2[n], 8)); }
      n = BN[n];
    }
    key = key - 1;
  }
  fillStop();
}

// a near face: its base colour and the texture's rects (u, v in eighths along q0->q1, q0->q3)
let drX = 0, drY = 0, drZ = 0;
function drawNear(t, kb, fog, d2) {
  let ex = q1x - q0x, ey = q1y - q0y, ez = q1z - q0z, fx = q3x - q0x, fy = q3y - q0y, fz = q3z - q0z;
  let ox = q0x * 8, oy = q0y * 8, oz = q0z * 8, foc = FOC;
  let tb = TBASE[t];
  if (tb >= 0) {
    fillStop(); goto(q0x * foc / q0z, q0y * foc / q0z); fillColorHex(CT[tb + kb + fog + 1]); fillStart();
    goto(q1x * foc / q1z, q1y * foc / q1z); goto(q2x * foc / q2z, q2y * foc / q2z); goto(q3x * foc / q3z, q3y * foc / q3z);
    nFill = nFill + 1;
  }
  let r = TR0[t], re = r + TRN[t];
  if (d2 > DEC2) { if (re > r + TRF[t]) { re = r + TRF[t]; } }
  let u0 = 0, v0 = 0, u1 = 0, v1 = 0, px = 0, py = 0, pz = 0, nk = 0 - kb - fog - 1;
  let nfx = 0 - fx, nfy = 0 - fy, nfz = 0 - fz;
  while (r < re) {
    u0 = RU0[r]; v0 = RV0[r]; u1 = RU1[r]; v1 = RV1[r];
    fillStop();
    px = ox + ex * u0 - nfx * v0; py = oy + ey * u0 - nfy * v0; pz = oz + ez * u0 - nfz * v0;
    goto(px * foc / pz, py * foc / pz);
    fillColorHex(CT[RCOL[r] - nk]); fillStart();
    px = ox + ex * u1 - nfx * v0; py = oy + ey * u1 - nfy * v0; pz = oz + ez * u1 - nfz * v0;
    goto(px * foc / pz, py * foc / pz);
    px = ox + ex * u1 - nfx * v1; py = oy + ey * u1 - nfy * v1; pz = oz + ez * u1 - nfz * v1;
    goto(px * foc / pz, py * foc / pz);
    px = ox + ex * u0 - nfx * v1; py = oy + ey * u0 - nfy * v1; pz = oz + ez * u0 - nfz * v1;
    goto(px * foc / pz, py * foc / pz);
    nFill = nFill + 1;
    r = r + 1;
  }
}
// a face across the near plane: cut (Sutherland-Hodgman on z = NEARZ) and filled in one colour
let CPX = [0, 0, 0, 0, 0], CPY = [0, 0, 0, 0, 0], CPZ = [0, 0, 0, 0, 0];
let OPX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], OPY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function clipQuad(col) {
  CPX[1] = q0x; CPY[1] = q0y; CPZ[1] = q0z; CPX[2] = q1x; CPY[2] = q1y; CPZ[2] = q1z;
  CPX[3] = q2x; CPY[3] = q2y; CPZ[3] = q2z; CPX[4] = q3x; CPY[4] = q3y; CPZ[4] = q3z;
  clipPoly(4, col);
}
function clipPoly(np, col) {
  let n = 0, i = 1, j = 0, za = 0, zb = 0, t = 0, nz = NEARZ, foc = FOC;
  while (i <= np) {
    j = i + 1;
    if (j > np) { j = 1; }
    za = CPZ[i]; zb = CPZ[j];
    if (za > nz) { n = n + 1; OPX[n] = CPX[i] * foc / za; OPY[n] = CPY[i] * foc / za; }
    if ((za > nz) != (zb > nz)) {
      t = (nz - za) / (zb - za);
      n = n + 1;
      OPX[n] = (CPX[i] + (CPX[j] - CPX[i]) * t) * foc / nz;
      OPY[n] = (CPY[i] + (CPY[j] - CPY[i]) * t) * foc / nz;
    }
    i = i + 1;
  }
  if (n >= 3) {
    fillStop(); goto(OPX[1], OPY[1]); fillColorHex(col); fillStart();
    i = 2;
    while (i <= n) { goto(OPX[i], OPY[i]); i = i + 1; }
    nFill = nFill + 1;
  }
}

// a cross plant: two upright quads corner to corner, only the texture's rects
function drawPlant(t, bx, by, bz, kb, fog, d2) {
  if (d2 <= PLANT2) {
    // quad 1: (x, z) -> (x+1, z+1)
    q3x = bx; q3y = by; q3z = bz;
    q0x = bx; q0y = by + uy2; q0z = bz + uy3;
    q1x = q0x + ux1 + uz1; q1y = q0y + ux2 + uz2; q1z = q0z + ux3 + uz3;
    q2x = bx + ux1 + uz1; q2y = by + ux2 + uz2; q2z = bz + ux3 + uz3;
    if (q0z > NEARZ && q1z > NEARZ && q2z > NEARZ && q3z > NEARZ) { drawNear(t, kb, fog, d2); }
    // quad 2: (x+1, z) -> (x, z+1)
    q3x = bx + ux1; q3y = by + ux2; q3z = bz + ux3;
    q0x = q3x; q0y = q3y + uy2; q0z = q3z + uy3;
    q2x = bx + uz1; q2y = by + uz2; q2z = bz + uz3;
    q1x = q2x; q1y = q2y + uy2; q1z = q2z + uy3;
    if (q0z > NEARZ && q1z > NEARZ && q2z > NEARZ && q3z > NEARZ) { drawNear(t, kb, fog, d2); }
  }
}
// a torch: a thin stick and a flame, both as two crossed quads (always fully lit)
function drawTorch(bx, by, bz, fog) {
  torchQuad(bx, by, bz, 7, 0, 8, 9, 10, 8, CTORCH, fog);
  torchQuad(bx, by, bz, 8, 0, 7, 8, 10, 9, CTORCH, fog);
  torchQuad(bx, by, bz, 6.5, 9, 8, 9.5, 12.5, 8, CFLAME, fog);
  torchQuad(bx, by, bz, 8, 9, 6.5, 8, 12.5, 9.5, CFLAME, fog);
}
// an upright quad from (ax, ay, az) to (cx, cy, cz) in 1/16 of the cell
function torchQuad(bx, by, bz, ax, ay, az, cx, cy, cz, col, fog) {
  q3x = bx + (ux1 * ax + uz1 * az) / 16; q3y = by + (ux2 * ax + uy2 * ay + uz2 * az) / 16; q3z = bz + (ux3 * ax + uy3 * ay + uz3 * az) / 16;
  q2x = bx + (ux1 * cx + uz1 * cz) / 16; q2y = by + (ux2 * cx + uy2 * ay + uz2 * cz) / 16; q2z = bz + (ux3 * cx + uy3 * ay + uz3 * cz) / 16;
  q0x = q3x; q0y = q3y + uy2 * (cy - ay) / 16; q0z = q3z + uy3 * (cy - ay) / 16;
  q1x = q2x; q1y = q2y + uy2 * (cy - ay) / 16; q1z = q2z + uy3 * (cy - ay) / 16;
  if (q0z > NEARZ && q1z > NEARZ && q2z > NEARZ && q3z > NEARZ) {
    let foc = FOC;
    fillStop(); goto(q0x * foc / q0z, q0y * foc / q0z); fillColorHex(CT[col + 23 * 8 + fog + 1]); fillStart();
    goto(q1x * foc / q1z, q1y * foc / q1z); goto(q2x * foc / q2z, q2y * foc / q2z); goto(q3x * foc / q3z, q3y * foc / q3z);
    nFill = nFill + 1;
  }
}

// ---------------------------------------------------------------- sky, sun, moon, stars, clouds
let sunA = 0, cloudOff = 0;
function drawSky() {
  let hz = 0 - FOC * sind(camPitch) / cosd(camPitch);
  fillStop();
  M_rect(-245, 140, 245, -140, fogHex);
  if (underWater == 0) { if (dim == 1) { M_rect(-245, 140, 245, -140, skyHex); } else {
    let y1 = hz + 40;
    if (y1 < 140) { M_rect(-245, 140, 245, Math.max(y1, -140), skyHex); }
    let y2 = hz + 12;
    if (y2 < 140) { if (y1 > -140) { M_rect(-245, Math.min(140, y1), 245, Math.max(y2, -140), skyMidHex); } }
    // the void below the horizon far down (looking down into the dark)
    let y3 = hz - 140;
    if (y3 > -140) { M_rect(-245, Math.min(140, y3), 245, -140, voidHex); }
    if (starA > 0) { drawStars(); }
    if (dim == 0) { drawSun(); }
  } }
}
let skyMidHex = '#a0c0f0', starA = 0;
function M_rect(x0, y0, x1, y1, col) {
  fillStop(); goto(x0, y0); fillColorHex(col); fillStart(); goto(x1, y0); goto(x1, y1); goto(x0, y1);
}
// a direction (world) on the screen: dirOn 1 and (dsx, dsy)
let dirOn = 0, dsx = 0, dsy = 0;
function dirToScreen(dx, dy, dz) {
  let vz = r31 * dx + r32 * dy + r33 * dz;
  dirOn = 0;
  if (vz > 1000) {
    dsx = (r11 * dx + r13 * dz) * FOC / vz; dsy = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz;
    if (Math.abs(dsx) < 300) { if (Math.abs(dsy) < 200) { dirOn = 1; } }
  }
}
function drawSun() {
  // the sun goes round the x axis: up at noon (sunA 90), down at midnight
  let sy = sind(sunA), sx = cosd(sunA);
  let half = 0.13;
  // corners of the square face: along z and along the path
  sunQuad(sx, sy, half, '#fff6c8', '#fbe27a');
  sunQuad(0 - sx, 0 - sy, half * 0.8, '#e8ecf4', '#c4cad6');
}
function sunQuad(dx, dy, h, c1, c2) {
  let ok = 1;
  // tangent along the path: (-dy, dx, 0); across: (0, 0, 1)
  let tx = 0 - dy, ty = dx;
  dirToScreen(dx + tx * h - 0 * h, dy + ty * h, 0 - h); let ax = dsx, ay = dsy; if (dirOn == 0) { ok = 0; }
  dirToScreen(dx + tx * h, dy + ty * h, h); let bx = dsx, by = dsy; if (dirOn == 0) { ok = 0; }
  dirToScreen(dx - tx * h, dy - ty * h, h); let cx = dsx, cy = dsy; if (dirOn == 0) { ok = 0; }
  dirToScreen(dx - tx * h, dy - ty * h, 0 - h); let ex = dsx, ey = dsy; if (dirOn == 0) { ok = 0; }
  if (ok == 1) {
    fillStop(); goto(ax, ay); fillColorHex(c1); fillStart(); goto(bx, by); goto(cx, cy); goto(ex, ey);
    fillStop(); goto((ax * 3 + cx) / 4, (ay * 3 + cy) / 4); fillColorHex(c2); fillStart(); goto((bx * 3 + ex) / 4, (by * 3 + ey) / 4); goto((cx * 3 + ax) / 4, (cy * 3 + ay) / 4); goto((ex * 3 + bx) / 4, (ey * 3 + by) / 4);
    nFill = nFill + 2;
  }
}
function drawStars() {
  let i = 1, s = 0;
  fillStop();
  while (i <= STARX.length) {
    dirToScreen(STARX[i], STARY[i], STARZ[i]);
    if (dirOn == 1) {
      s = STARS[i];
      if (dsy > 0 - FOC * sind(camPitch) / cosd(camPitch)) {
        M_rect(dsx - s, dsy + s, dsx + s, dsy - s, starHex);
      }
    }
    i = i + 1;
  }
}
let starHex = '#ffffff';
// clouds: a flat layer of 8-block cells above the world, drifting along x
function drawClouds() {
  if (camY < CLOUDY - 1) {
    let cy = CLOUDY - camY;
    let r = viewR + 40, cs = 8;
    let x0 = Math.floor((camX - r - cloudOff) / cs), x1 = Math.floor((camX + r - cloudOff) / cs);
    let z0 = Math.floor((camZ - r) / cs), z1 = Math.floor((camZ + r) / cs);
    let gx = x0, gz = 0, wx = 0, wz = 0, dd = 0, fog = 0, foc = FOC;
    let p0 = 0, ok = 0;
    while (gx <= x1) {
      gz = z0;
      while (gz <= z1) {
        if (CLOUD[mod(gx, 32) * 32 + mod(gz, 32) + 1] == 1) {
          wx = gx * cs + cloudOff + cs / 2 - camX; wz = gz * cs + cs / 2 - camZ;
          dd = wx * wx + wz * wz;
          if (dd < r * r) {
            fog = Math.min(7, Math.floor(Math.sqrt(dd) / r * 9));
            ok = 1;
            cloudPt(wx - 4, cy, wz - 4); let ax = dsx, ay = dsy; if (dirOn == 0) { ok = 0; }
            cloudPt(wx + 4, cy, wz - 4); let bx = dsx, by = dsy; if (dirOn == 0) { ok = 0; }
            cloudPt(wx + 4, cy, wz + 4); let ccx = dsx, ccy = dsy; if (dirOn == 0) { ok = 0; }
            cloudPt(wx - 4, cy, wz + 4); let ex = dsx, ey = dsy; if (dirOn == 0) { ok = 0; }
            if (ok == 1) {
              fillStop(); goto(ax, ay); fillColorHex(CT[CCLOUD + 22 * 8 + fog + 1]); fillStart(); goto(bx, by); goto(ccx, ccy); goto(ex, ey);
              nFill = nFill + 1;
            }
          }
        }
        gz = gz + 1;
      }
      gx = gx + 1;
    }
  }
}
function cloudPt(dx, dy, dz) {
  let vz = r31 * dx + r32 * dy + r33 * dz;
  dirOn = 0;
  if (vz > 16384 * 0.5) { dsx = (r11 * dx + r13 * dz) * FOC / vz; dsy = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz; dirOn = 1; }
}

// ---------------------------------------------------------------- the picked block
// its edges (of the sides that face the eye) as thin dark quads, and the cracks while breaking
let EDGA = [1, 2, 3, 4, 1, 5, 2, 6, 3, 7, 4, 8, 5, 6, 7, 8, 1, 2, 5, 6, 3, 4, 7, 8];
function drawPick() {
  if (pickOn == 1) {
    let x = pickX, y = pickY, z = pickZ;
    // the 8 corners: 1 (x,y,z) 2 (x+1,y,z) 3 (x,y,z+1) 4 (x+1,y,z+1), 5..8 the same one up
    pkCorner(1, x, y, z); pkCorner(2, x + 1, y, z); pkCorner(3, x, y, z + 1); pkCorner(4, x + 1, y, z + 1);
    pkCorner(5, x, y + 1, z); pkCorner(6, x + 1, y + 1, z); pkCorner(7, x, y + 1, z + 1); pkCorner(8, x + 1, y + 1, z + 1);
    let vxm = 0, vxp = 0, vym = 0, vyp = 0, vzm = 0, vzp = 0;
    // a side counts when it faces the eye and nothing solid covers it
    if (camX < x) { if (BHC[blockAt(x - 1, y, z) + 1] != 1) { vxm = 1; } }
    if (camX > x + 1) { if (BHC[blockAt(x + 1, y, z) + 1] != 1) { vxp = 1; } }
    if (camY < y) { if (BHC[blockAt(x, y - 1, z) + 1] != 1) { vym = 1; } }
    if (camY > y + 1) { if (BHC[blockAt(x, y + 1, z) + 1] != 1) { vyp = 1; } }
    if (camZ < z) { if (BHC[blockAt(x, y, z - 1) + 1] != 1) { vzm = 1; } }
    if (camZ > z + 1) { if (BHC[blockAt(x, y, z + 1) + 1] != 1) { vzp = 1; } }
    // edges along x: (1,2) y- z-, (3,4) y- z+, (5,6) y+ z-, (7,8) y+ z+
    if (vym + vzm > 0) { pkEdge(1, 2); } if (vym + vzp > 0) { pkEdge(3, 4); } if (vyp + vzm > 0) { pkEdge(5, 6); } if (vyp + vzp > 0) { pkEdge(7, 8); }
    // along y: (1,5) x- z-, (2,6) x+ z-, (3,7) x- z+, (4,8) x+ z+
    if (vxm + vzm > 0) { pkEdge(1, 5); } if (vxp + vzm > 0) { pkEdge(2, 6); } if (vxm + vzp > 0) { pkEdge(3, 7); } if (vxp + vzp > 0) { pkEdge(4, 8); }
    // along z: (1,3) x- y-, (2,4) x+ y-, (5,7) x- y+, (6,8) x+ y+
    if (vxm + vym > 0) { pkEdge(1, 3); } if (vxp + vym > 0) { pkEdge(2, 4); } if (vxm + vyp > 0) { pkEdge(5, 7); } if (vxp + vyp > 0) { pkEdge(6, 8); }
    if (breakStage > 0) { drawCracks(); }
  }
}
let PKX = [0, 0, 0, 0, 0, 0, 0, 0], PKY = [0, 0, 0, 0, 0, 0, 0, 0], PKZ = [0, 0, 0, 0, 0, 0, 0, 0];
function pkCorner(k, x, y, z) {
  let ex = x * 256 - cx256, ey = y * 256 - cy256, ez = z * 256 - cz256;
  PKX[k] = r11 * ex + r13 * ez; PKY[k] = r21 * ex + r22 * ey + r23 * ez; PKZ[k] = r31 * ex + r32 * ey + r33 * ez;
}
function pkEdge(a, b) {
  let za = PKZ[a], zb = PKZ[b], ax = PKX[a], ay = PKY[a], bx = PKX[b], by = PKY[b];
  if (za > NEARZ || zb > NEARZ) {
    if (za <= NEARZ) { let t = (NEARZ - za) / (zb - za); ax = ax + (bx - ax) * t; ay = ay + (by - ay) * t; za = NEARZ; }
    if (zb <= NEARZ) { let t = (NEARZ - zb) / (za - zb); bx = bx + (ax - bx) * t; by = by + (ay - by) * t; zb = NEARZ; }
    let sx0 = ax * FOC / za, sy0 = ay * FOC / za, sx1 = bx * FOC / zb, sy1 = by * FOC / zb;
    let dx = sx1 - sx0, dy = sy1 - sy0, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 0.01) {
      let nx = 0 - dy / l * 0.55, ny = dx / l * 0.55;
      fillStop(); goto(sx0 + nx, sy0 + ny); fillColorHex('#101010'); fillStart(); goto(sx1 + nx, sy1 + ny); goto(sx1 - nx, sy1 - ny); goto(sx0 - nx, sy0 - ny);
      nFill = nFill + 1;
    }
  }
}
// cracks on the face that was hit (the face of pickF), dark rects of the crack picture
function drawCracks() {
  let x = pickX, y = pickY, z = pickZ, d = pickF;
  pkCorner(1, x, y, z);
  let bx = PKX[1], by = PKY[1], bz = PKZ[1];
  if (d == 0) { q0x = bx; q0y = by + uy2; q0z = bz + uy3; q1x = q0x + uz1; q1y = q0y + uz2; q1z = q0z + uz3; q3x = bx; q3y = by; q3z = bz; }
  if (d == 1) { q3x = bx + ux1 + uz1; q3y = by + ux2 + uz2; q3z = bz + ux3 + uz3; q0x = q3x; q0y = q3y + uy2; q0z = q3z + uy3; q1x = q0x - uz1; q1y = q0y - uz2; q1z = q0z - uz3; }
  if (d == 2) { q0x = bx + uz1; q0y = by + uz2; q0z = bz + uz3; q1x = q0x + ux1; q1y = q0y + ux2; q1z = q0z + ux3; q3x = bx; q3y = by; q3z = bz; }
  if (d == 3) { q0x = bx; q0y = by + uy2; q0z = bz + uy3; q1x = q0x + ux1; q1y = q0y + ux2; q1z = q0z + ux3; q3x = q0x + uz1; q3y = q0y + uz2; q3z = q0z + uz3; }
  if (d == 4) { q3x = bx + ux1; q3y = by + ux2; q3z = bz + ux3; q0x = q3x; q0y = q3y + uy2; q0z = q3z + uy3; q1x = bx; q1y = by + uy2; q1z = bz + uy3; }
  if (d == 5) { q3x = bx + uz1; q3y = by + uz2; q3z = bz + uz3; q0x = q3x; q0y = q3y + uy2; q0z = q3z + uy3; q1x = q0x + ux1; q1y = q0y + ux2; q1z = q0z + ux3; }
  if (q0z > NEARZ && q1z > NEARZ && q3z > NEARZ) {
    let ex = q1x - q0x, ey = q1y - q0y, ez = q1z - q0z, fx = q3x - q0x, fy = q3y - q0y, fz = q3z - q0z;
    if (q1z + fz > NEARZ) {
      let ox = q0x * 8, oy = q0y * 8, oz = q0z * 8, foc = FOC;
      let r = CK0[breakStage], re = r + CKN[breakStage], u0 = 0, v0 = 0, u1 = 0, v1 = 0, px = 0, py = 0, pz = 0;
      while (r < re) {
        u0 = RU0[r]; v0 = RV0[r]; u1 = RU1[r]; v1 = RV1[r];
        fillStop();
        px = ox + ex * u0 + fx * v0; py = oy + ey * u0 + fy * v0; pz = oz + ez * u0 + fz * v0; goto(px * foc / pz, py * foc / pz);
        fillColorHex('#1a1a1a'); fillStart();
        px = ox + ex * u1 + fx * v0; py = oy + ey * u1 + fy * v0; pz = oz + ez * u1 + fz * v0; goto(px * foc / pz, py * foc / pz);
        px = ox + ex * u1 + fx * v1; py = oy + ey * u1 + fy * v1; pz = oz + ez * u1 + fz * v1; goto(px * foc / pz, py * foc / pz);
        px = ox + ex * u0 + fx * v1; py = oy + ey * u0 + fy * v1; pz = oz + ez * u0 + fz * v1; goto(px * foc / pz, py * foc / pz);
        nFill = nFill + 1;
        r = r + 1;
      }
    }
  }
}

// ---------------------------------------------------------------- the whole picture
function renderWorld() {
  nFill = 0;
  setCamera();
  drawSky();
  if (underWater == 0) { if (dim == 0) { drawClouds(); } }
  frustumSetup();
  if (dark != ltkDark) { ltkBuild(); }
  findSections();
  collectFaces();
  nFace = bTop;
  bucketThings();
  drawBuckets();
  drawPick();
}

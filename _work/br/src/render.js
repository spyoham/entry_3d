// ===================================================================== render
// Painter's order without sorting: cells far to near (by |dx| + |dz|), inside a
// cell the terrain, the roads, then the building through its BSP (the props and
// people of the cell hang on the BSP's leaves), or the props by distance.
// Integers: world cm, view = rotation x 16384 (no division but the projection).

let camX = 0, camY = 0, camZ = 0, camYaw = 0, camPitch = 0, FOC = 240, NZ = 0;
let r11 = 0, r13 = 0, r21 = 0, r22 = 0, r23 = 0, r31 = 0, r32 = 0, r33 = 0;
let tanX = 1, tanY = 0.5625, kX = 1.42, kY = 1.15, kXF = 340, kYF = 276, FOCi = 240;
let highView = 0, frameNo = 0, drawR = 11, fogD = 35200, nPoly = 0, nInst = 0, nPT = 0, nPB0 = 0, nPB1 = 0, nPB2 = 0, nPP = 0, nPG = 0, nVX = 0;
let camCX = 0, camCZ = 0;
// the vertex cache of the terrain and roads (grid vertices, then the extra ones)
let WPX = [], WPY = [], WPZ = [], VSX = [], VSY = [], VVX = [], VVY = [], VVZ = [], VST = [];
// the scratch of instance vertices
let QX = [], QY = [], QVX = [], QVY = [], QVZ = [], QS = [];
let qTop = 0, qStamp = 0, qCur = 0;
// the stack of the BSP walk
let STK = [], STT = [];
let stkTop = 0;
// instance being drawn
let iR = 0, iT = 0, iT2 = 0, iFog = 0, vofs = 0, blx = 0, bly = 0, blz = 0, iLeafOn = 0;
let m11 = 0, m12 = 0, m13 = 0, m21 = 0, m22 = 0, m23 = 0, m31 = 0, m32 = 0, m33 = 0, t1 = 0, t2 = 0, t3 = 0;
// clipping input
let CPX = [], CPY = [], CPZ = [], OPX = [], OPY = [];
// leaf lists of the building being drawn
let LFH = [], LFS = [], LFN = [], LFI = [], LFD = [];
let lfStamp = 0, lfTop = 0;
// items of a cell without a drawn-in-detail building, sorted far to near
let SRI = [], SRD = [];
// dynamic things (people, loot, effects) by cell, rebuilt every frame
let DCH = [], DCS = [], DNX = [], DKX = [], DKY = [], DKZ = [], DID = [];
let dTop = 0;
let skyTop = '#7f9cb4', skyMid = '#a9bac6', seaCol = '#5f7f93';

function renderInit() {
  let i = 1;
  while (i <= CT2.length) { CT.push(CT2[i]); i = i + 1; }
  i = 1;
  let n = GRID * GRID + EXX.length;
  while (i <= n) {
    if (i <= GRID * GRID) { WPX.push(mod(i - 1, GRID) * CS); WPZ.push(idiv(i - 1, GRID) * CS); WPY.push(TH[i]); }
    else { WPX.push(EXX[i - GRID * GRID]); WPY.push(EXY[i - GRID * GRID]); WPZ.push(EXZ[i - GRID * GRID]); }
    VSX.push(0); VSY.push(0); VVX.push(0); VVY.push(0); VVZ.push(0); VST.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= 6000) { QX.push(0); QY.push(0); QVX.push(0); QVY.push(0); QVZ.push(0); QS.push(0); i = i + 1; }
  i = 1;
  while (i <= 4000) { STK.push(0); STT.push(0); i = i + 1; }
  i = 1;
  while (i <= 12) { CPX.push(0); CPY.push(0); CPZ.push(0); OPX.push(0); OPY.push(0); i = i + 1; }
  i = 1;
  while (i <= 1200) { LFH.push(0); LFS.push(0); LFN.push(0); LFI.push(0); LFD.push(0); i = i + 1; }
  i = 1;
  while (i <= 64) { SRI.push(0); SRD.push(0); i = i + 1; }
  i = 1;
  while (i <= CELLS * CELLS) { DCH.push(0); DCS.push(0); i = i + 1; }
  i = 1;
  while (i <= 600) { DNX.push(0); DKX.push(0); DKY.push(0); DKZ.push(0); DID.push(0); i = i + 1; }
  NZ = NEAR * 16384;
}

function setCamera() {
  let sy = sind(camYaw), cy = cosd(camYaw), sp = sind(camPitch), cp = cosd(camPitch);
  r11 = Math.round(16384 * cy); r13 = Math.round(-16384 * sy);
  r21 = Math.round(-16384 * sy * sp); r22 = Math.round(16384 * cp); r23 = Math.round(-16384 * cy * sp);
  r31 = Math.round(16384 * sy * cp); r32 = Math.round(16384 * sp); r33 = Math.round(16384 * cy * cp);
  tanX = 240 / FOC; tanY = 135 / FOC;
  kX = Math.sqrt(1 + tanX * tanX); kY = Math.sqrt(1 + tanY * tanY);
  // the same as whole numbers: |vx| * FOC <= vz * 240 + r * kXF
  kXF = Math.round(kX * FOC); kYF = Math.round(kY * FOC); FOCi = Math.round(FOC);
  camCX = Math.floor(camX / CS); camCZ = Math.floor(camZ / CS);
  frameNo = frameNo + 1;
}

// ---------------------------------------------------------------- polygons
function M_draw4(SXL, SYL, a, b, c, d, col) {
  fillStop();
  goto(SXL[a], SYL[a]);
  fillColorHex(col);
  fillStart();
  goto(SXL[b], SYL[b]);
  goto(SXL[c], SYL[c]);
  goto(SXL[d], SYL[d]);
  nPoly = nPoly + 1;
}
// a polygon of 4 cached points (a triangle repeats its last): drawn, cut at the near plane, or dropped
function M_poly(SXL, SYL, VXL, VYL, VZL, a, b, c, d, col) {
  let z1 = VZL[a]; let z2 = VZL[b]; let z3 = VZL[c]; let z4 = VZL[d];
  let zmn = z1;
  if (z2 < zmn) { zmn = z2; }
  if (z3 < zmn) { zmn = z3; }
  if (z4 < zmn) { zmn = z4; }
  if (zmn > NZ) {
    M_draw4(SXL, SYL, a, b, c, d, col);
  } else {
    if (z1 > NZ || z2 > NZ || z3 > NZ || z4 > NZ) {
      CPX[1] = VXL[a]; CPY[1] = VYL[a]; CPZ[1] = z1;
      CPX[2] = VXL[b]; CPY[2] = VYL[b]; CPZ[2] = z2;
      CPX[3] = VXL[c]; CPY[3] = VYL[c]; CPZ[3] = z3;
      CPX[4] = VXL[d]; CPY[4] = VYL[d]; CPZ[4] = z4;
      clipDraw(col);
    }
  }
}
// an instance's polygon: from the scratch; cut at the near plane from the model's own points
function M_polyQ(a, b, c, d, va, vb, vc, vd, col) {
  let z1 = QVZ[a]; let z2 = QVZ[b]; let z3 = QVZ[c]; let z4 = QVZ[d];
  let zmn = z1;
  if (z2 < zmn) { zmn = z2; }
  if (z3 < zmn) { zmn = z3; }
  if (z4 < zmn) { zmn = z4; }
  if (zmn > NZ) {
    M_draw4(QX, QY, a, b, c, d, col);
  } else {
    if (z1 > NZ || z2 > NZ || z3 > NZ || z4 > NZ) {
      CPZ[1] = z1; CPZ[2] = z2; CPZ[3] = z3; CPZ[4] = z4;
      CPX[1] = m11 * X[va] + m12 * Y[va] + m13 * Z[va] + t1; CPY[1] = m21 * X[va] + m22 * Y[va] + m23 * Z[va] + t2;
      CPX[2] = m11 * X[vb] + m12 * Y[vb] + m13 * Z[vb] + t1; CPY[2] = m21 * X[vb] + m22 * Y[vb] + m23 * Z[vb] + t2;
      CPX[3] = m11 * X[vc] + m12 * Y[vc] + m13 * Z[vc] + t1; CPY[3] = m21 * X[vc] + m22 * Y[vc] + m23 * Z[vc] + t2;
      CPX[4] = m11 * X[vd] + m12 * Y[vd] + m13 * Z[vd] + t1; CPY[4] = m21 * X[vd] + m22 * Y[vd] + m23 * Z[vd] + t2;
      clipDraw(col);
    }
  }
}
// Sutherland-Hodgman against z = NZ of the 4 points in CP*, then fill
function clipDraw(col) {
  let n = 0, i = 1, j = 0, za = 0, zb = 0, t = 0;
  while (i <= 4) {
    j = i + 1;
    if (j > 4) { j = 1; }
    za = CPZ[i]; zb = CPZ[j];
    if (za > NZ) { n = n + 1; OPX[n] = CPX[i] * FOC / za; OPY[n] = CPY[i] * FOC / za; }
    if ((za > NZ) != (zb > NZ)) {
      t = (NZ - za) / (zb - za);
      n = n + 1;
      OPX[n] = (CPX[i] + (CPX[j] - CPX[i]) * t) * FOC / NZ;
      OPY[n] = (CPY[i] + (CPY[j] - CPY[i]) * t) * FOC / NZ;
    }
    i = i + 1;
  }
  if (n >= 3) {
    fillStop();
    goto(OPX[1], OPY[1]);
    fillColorHex(col);
    fillStart();
    i = 2;
    while (i <= n) { goto(OPX[i], OPY[i]); i = i + 1; }
    nPoly = nPoly + 1;
  }
}

// ---------------------------------------------------------------- terrain vertices
function M_tvert(k) {
  if (VST[k] != frameNo) {
    let dx = WPX[k] - camX; let dy = WPY[k] - camY; let dz = WPZ[k] - camZ;
    let vz = r31 * dx + r32 * dy + r33 * dz;
    let vx = r11 * dx + r13 * dz;
    let vy = r21 * dx + r22 * dy + r23 * dz;
    VVX[k] = vx; VVY[k] = vy; VVZ[k] = vz; VST[k] = frameNo;
    if (vz > NZ) { VSX[k] = vx * FOC / vz; VSY[k] = vy * FOC / vz; }
  }
}
function M_tpoly(A, B, C, D, K, p, fog) {
  nPT = nPT + 1;
  let ta_ = A[p]; let tb_ = B[p]; let tc_ = C[p]; let td_ = D[p];
  if (td_ == 0) { td_ = tc_; }
  M_tvert(ta_); M_tvert(tb_); M_tvert(tc_); M_tvert(td_);
  M_poly(VSX, VSY, VVX, VVY, VVZ, ta_, tb_, tc_, td_, CT[K[p] + fog + 1]);
}

// ---------------------------------------------------------------- one instance
// lod 0..2; the instance's vertices go to the scratch from qTop
function drawInst(i, lod, fog) {
  let pf = IPF[i];
  let q = (pf - 1) * 3 + lod + 1;
  let b = QB[q];
  let r = IR[i];
  let a = 1, bb = 0, c = 0, d = 1;
  if (r == 1) { a = 0; bb = 1; c = -1; d = 0; }
  if (r == 2) { a = -1; bb = 0; c = 0; d = -1; }
  if (r == 3) { a = 0; bb = -1; c = 1; d = 0; }
  let dx = IX[i] - camX, dy = IY[i] - camY, dz = IZ[i] - camZ;
  // the instance's rotation, then the camera's
  m11 = r11 * a + r13 * c; m12 = 0; m13 = r11 * bb + r13 * d;
  m21 = r21 * a + r23 * c; m22 = r22; m23 = r21 * bb + r23 * d;
  m31 = r31 * a + r33 * c; m32 = r32; m33 = r31 * bb + r33 * d;
  t1 = r11 * dx + r13 * dz; t2 = r21 * dx + r22 * dy + r23 * dz; t3 = r31 * dx + r32 * dy + r33 * dz;
  // the camera in the instance's own frame (for the BSP)
  let ex = 0 - dx, ez = 0 - dz;
  blx = ex * a + ez * c; blz = ex * bb + ez * d; bly = 0 - dy;
  iR = r; iT = IT[i]; iT2 = IT2[i]; iFog = fog;
  let v0 = QV0[q], n = QVN[q];
  let base = qTop;
  vofs = qTop - v0 + 1;
  xfBank(b, v0, n);
  qTop = qTop + n;
  let root = QR[q];
  let np0 = nPoly;
  if (root > 0) { bspBank(b, root); }
  if (lod == 0) { nPB0 = nPB0 + nPoly - np0; }
  if (lod == 1) { nPB1 = nPB1 + nPoly - np0; }
  if (lod == 2) { nPB2 = nPB2 + nPoly - np0; }
  qTop = base;
  nInst = nInst + 1;
}
// model q (a bank model) through the matrix (m, t) already set; the eye in the model's frame (ex, ey, ez)
function drawModel(q, ex, ey, ez, fog, tint) {
  let b = QB[q];
  blx = ex; bly = ey; blz = ez;
  iR = 0; iT = tint; iT2 = 0; iFog = fog;
  let v0 = QV0[q], n = QVN[q];
  let base = qTop;
  vofs = qTop - v0 + 1;
  xfBank(b, v0, n);
  qTop = qTop + n;
  let root = QR[q];
  if (root > 0) { bspBank(b, root); }
  qTop = base;
}
// a model lying in the world at (x, y, z) turned by yaw (degrees), scale: model units a cm (1 or 10)
function drawWorldModel(q, x, y, z, yaw, unit, fog) {
  let cs = cosd(yaw), sn = sind(yaw);
  // model -> world: wx = cs*lx + sn*lz, wz = -sn*lx + cs*lz (then / unit)
  let a = cs / unit, bb = sn / unit, c = 0 - sn / unit, d = cs / unit;
  m11 = r11 * a + r13 * c; m12 = 0; m13 = r11 * bb + r13 * d;
  m21 = r21 * a + r23 * c; m22 = r22 / unit; m23 = r21 * bb + r23 * d;
  m31 = r31 * a + r33 * c; m32 = r32 / unit; m33 = r31 * bb + r33 * d;
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  t1 = r11 * dx + r13 * dz; t2 = r21 * dx + r22 * dy + r23 * dz; t3 = r31 * dx + r32 * dy + r33 * dz;
  // the eye in the model's frame: the transpose, times unit
  let ex = 0 - dx, ez = 0 - dz;
  drawModel(q, (cs * ex - sn * ez) * unit, (0 - dy) * unit, (sn * ex + cs * ez) * unit, fog, 0);
}
// the vertices v0 .. v0+n-1 of a bank, through (m, t), to the scratch at vofs: done when a
// face first needs them (QS marks the ones done for this model)
function M_xform(X, Y, Z) {
  qStamp = qStamp + 1; qCur = qStamp;
}
function M_qv(X, Y, Z, v, k) {
  if (QS[k] != qCur) {
    QS[k] = qCur;
    let lx_ = X[v]; let ly_ = Y[v]; let lz_ = Z[v];
    let vz_ = m31 * lx_ + m32 * ly_ + m33 * lz_ + t3;
    QVZ[k] = vz_;
    if (vz_ > NZ) { QX[k] = (m11 * lx_ + m12 * ly_ + m13 * lz_ + t1) * FOC / vz_; QY[k] = (m21 * lx_ + m22 * ly_ + m23 * lz_ + t2) * FOC / vz_; }
    nVX = nVX + 1;
  }
}
// the faces of node nd that face the eye (side t), with the colours of rotation iR
function M_faces(F1, F2, F3, F4, FS, FK, CC) {
  let f = NP[nd]; let fe = f + NC[nd];
  while (f < fe) {
    if (FS[f] == t) {
      let cb = CC[f];
      let fk = FK[f];
      if (fk > 0) { if (fk == 2) { cb = cb + iT2; } else { cb = cb + iT; } }
      let fa = F1[f], fb = F2[f], fc = F3[f], fd = F4[f];
      let pa = fa + vofs; let pb = fb + vofs; let pc = fc + vofs; let pd = fd + vofs;
      M_qv(X, Y, Z, fa, pa); M_qv(X, Y, Z, fb, pb); M_qv(X, Y, Z, fc, pc); M_qv(X, Y, Z, fd, pd);
      M_polyQ(pa, pb, pc, pd, fa, fb, fc, fd, CT[cb + iFog + 1]);
    }
    f = f + 1;
  }
}
// walk a BSP back to front from the eye (blx, bly, blz)
function M_bsp(X, Y, Z, NX, NY, NZ_, ND, NF, NB, NP, NC, F1, F2, F3, F4, FS, FK, C1, C2, C3, C4) {
  let base = stkTop;
  let sp = base + 1;
  STK[sp] = root; STT[sp] = 0;
  let nd = 0, t = 0, s = 0, ch = 0;
  while (sp > base) {
    nd = STK[sp]; t = STT[sp]; sp = sp - 1;
    if (t == 0) {
      s = NX[nd] * blx + NY[nd] * bly + NZ_[nd] * blz - ND[nd];
      if (s >= 0) {
        // pushed in reverse: back child first out, then the front faces, then the front child
        ch = NF[nd];
        if (ch > 0) { sp = sp + 1; STK[sp] = ch; STT[sp] = 0; } else { if (iLeafOn == 1) { if (LFS[0 - ch] == lfStamp) { sp = sp + 1; STK[sp] = 0 - ch; STT[sp] = 2; } } }
        sp = sp + 1; STK[sp] = nd; STT[sp] = 1;
        ch = NB[nd];
        if (ch > 0) { sp = sp + 1; STK[sp] = ch; STT[sp] = 0; } else { if (iLeafOn == 1) { if (LFS[0 - ch] == lfStamp) { sp = sp + 1; STK[sp] = 0 - ch; STT[sp] = 2; } } }
      } else {
        ch = NB[nd];
        if (ch > 0) { sp = sp + 1; STK[sp] = ch; STT[sp] = 0; } else { if (iLeafOn == 1) { if (LFS[0 - ch] == lfStamp) { sp = sp + 1; STK[sp] = 0 - ch; STT[sp] = 2; } } }
        sp = sp + 1; STK[sp] = nd; STT[sp] = -1;
        ch = NF[nd];
        if (ch > 0) { sp = sp + 1; STK[sp] = ch; STT[sp] = 0; } else { if (iLeafOn == 1) { if (LFS[0 - ch] == lfStamp) { sp = sp + 1; STK[sp] = 0 - ch; STT[sp] = 2; } } }
      }
    } else {
      if (t == 2) {
        // a leaf with things in it: draw them (each its own walk, above this one on the stack)
        stkTop = sp;
        drawLeaf(nd);
        stkTop = base;
      } else {
        if (iR == 0) { M_faces(F1, F2, F3, F4, FS, FK, C1); }
        else { if (iR == 1) { M_faces(F1, F2, F3, F4, FS, FK, C2); }
        else { if (iR == 2) { M_faces(F1, F2, F3, F4, FS, FK, C3); }
        else { M_faces(F1, F2, F3, F4, FS, FK, C4); } } }
      }
    }
  }
}

// ---------------------------------------------------------------- the things standing in a leaf
// item id > 0: a prop instance; < 0: a dynamic thing (person, loot, effect)
function drawLeaf(L) {
  // the building's state is the walk's: keep what drawing the items overwrites
  let sR = iR, sT = iT, sT2 = iT2, sF = iFog, sV = vofs, sx = blx, sy = bly, sz = blz, sL = iLeafOn;
  let m1 = m11, m2s = m12, m3 = m13, m21s = m21, m22s = m22, m23s = m23, m31s = m31, m32s = m32, m33s = m33, ta = t1, tb = t2, tc = t3;
  let k = LFH[L], sQ = qCur;
  iLeafOn = 0;
  while (k > 0) {
    drawItem(LFI[k], LFD[k]);
    k = LFN[k];
  }
  iR = sR; iT = sT; iT2 = sT2; iFog = sF; vofs = sV; blx = sx; bly = sy; blz = sz; iLeafOn = sL; qCur = sQ;
  m11 = m1; m12 = m2s; m13 = m3; m21 = m21s; m22 = m22s; m23 = m23s; m31 = m31s; m32 = m32s; m33 = m33s; t1 = ta; t2 = tb; t3 = tc;
}
// distance (cm) -> fog level 0..7
function fogOf(dist) {
  let f = Math.floor(dist * 9 / fogD) - 1;
  if (f < 0) { f = 0; }
  if (f > 7) { f = 7; }
  return f;
}
// a prop or a dynamic thing at distance dist
function drawItem(id, dist) {
  if (id > 0) {
    let lod = 0;
    let pr = PFR[IPF[id]];
    if (dist > 2500 + pr * 12) { lod = 2; } else { if (dist > 900 + pr * 5) { lod = 1; } }
    // small things are not drawn far away
    let far = 0;
    if (pr < 160) { if (dist > 9000) { far = 1; } }
    // from up high: only the big things, plain
    if (highView == 1) { if (pr < 300) { far = 1; } lod = 2; }
    if (far == 0) { if (inView(IX[id], IY[id] + PFCY[IPF[id]], IZ[id], pr) == 1) { drawInst(id, lod, fogOf(dist)); } }
  } else {
    drawDyn(0 - id, dist);
  }
}
// a sphere in the view? 1 / 0
function inView(x, y, z, rad) {
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  let vz = r31 * dx + r32 * dy + r33 * dz;
  let vx = r11 * dx + r13 * dz;
  let vy = r21 * dx + r22 * dy + r23 * dz;
  let rr = rad * 16384;
  let ok = 1;
  if (vz < 0 - rr) { ok = 0; }
  else {
    let lx = vz * 240 + rr * kXF, ly = vz * 135 + rr * kYF;
    let ax = Math.abs(vx) * FOCi, ay = Math.abs(vy) * FOCi;
    if (ax > lx) { ok = 0; }
    if (ay > ly) { ok = 0; }
  }
  return ok;
}

// ---------------------------------------------------------------- one cell
function drawCell(c) {
  let cx = mod(c - 1, CELLS), cz = idiv(c - 1, CELLS);
  let ccx = cx * CS + 1600 - camX, ccz = cz * CS + 1600 - camZ;
  let cdist = Math.sqrt(ccx * ccx + ccz * ccz);
  let fog = fogOf(cdist);
  // terrain and roads
  let p = TC0[c], pe = p + TCN[c];
  while (p < pe) { M_tpoly(TPA, TPB, TPC, TPD, TPK, p, fog); p = p + 1; }
  p = RC0[c]; pe = p + RCN[c];
  while (p < pe) { M_tpoly(RPA, RPB, RPC, RPD, RPK, p, fog); p = p + 1; }
  // things
  let i0 = CI0[c], n = CIN[c], bi = CIB[c];
  let dyn = 0;
  if (DCS[c] == frameNo) { dyn = DCH[c]; }
  if (n + dyn > 0) {
    let bd = 0, lod = 2, inside = 0;
    if (bi > 0) {
      let pf = IPF[bi];
      let bx = IX[bi] - camX, by = IY[bi] + PFCY[pf] - camY, bz = IZ[bi] - camZ;
      bd = Math.sqrt(bx * bx + by * by + bz * bz);
      lod = 2;
      if (bd < 10000 + PFR[pf]) { lod = 1; }
      if (bd < 1900 + PFR[pf] * 0.55) { lod = 0; }
      // inside it (or right at its walls): always in detail
      if (lod > 0) { if (camInside(bi) == 1) { lod = 0; } }
    }
    if (lod == 0) {
      // the building in detail: everything else of the cell hangs on its leaves
      lfStamp = lfStamp + 1; lfTop = 0;
      let pf2 = IPF[bi];
      let q = (pf2 - 1) * 3 + 1;
      let i = i0;
      while (i < i0 + n) {
        if (i != bi) { leafPut(IL[i], i, distTo(IX[i], IY[i] + 100, IZ[i])); }
        i = i + 1;
      }
      let k = dyn;
      while (k > 0) {
        leafPut(leafOfPoint(bi, q, DKX[k], DKY[k] + 80, DKZ[k]), 0 - DID[k], distTo(DKX[k], DKY[k] + 80, DKZ[k]));
        k = DNX[k];
      }
      iLeafOn = 1;
      drawInst(bi, 0, fogOf(bd));
      iLeafOn = 0;
    } else {
      // far to near by distance (the building as one thing)
      let m = 0, i = i0, dd = 0;
      while (i < i0 + n) {
        if (i == bi) { dd = bd; } else { dd = distTo(IX[i], IY[i] + 100, IZ[i]); }
        m = m + 1; M_sortIn(i, dd);
        i = i + 1;
      }
      let k = dyn;
      while (k > 0) { m = m + 1; M_sortIn(0 - DID[k], distTo(DKX[k], DKY[k] + 80, DKZ[k])); k = DNX[k]; }
      let j = 1;
      while (j <= m) {
        if (SRI[j] == bi) {
          if (inView(IX[bi], IY[bi] + PFCY[IPF[bi]], IZ[bi], PFR[IPF[bi]]) == 1) { drawInst(bi, lod, fogOf(bd)); }
        } else { drawItem(SRI[j], SRD[j]); }
        j = j + 1;
      }
    }
  }
}
// insertion into SRI/SRD (m items, far first)
function M_sortIn(id, dd) {
  let j = m, sgo = 1;
  while (sgo == 1) {
    if (j <= 1) { sgo = 0; } else { if (SRD[j - 1] < dd) { SRI[j] = SRI[j - 1]; SRD[j] = SRD[j - 1]; j = j - 1; } else { sgo = 0; } }
  }
  SRI[j] = id; SRD[j] = dd;
}
function distTo(x, y, z) {
  let dx = x - camX, dy = y - camY, dz = z - camZ;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
// put item id (distance d) on leaf L's list, far first
function leafPut(L, id, d) {
  lfTop = lfTop + 1;
  LFI[lfTop] = id; LFD[lfTop] = d;
  if (LFS[L] != lfStamp) { LFS[L] = lfStamp; LFH[L] = lfTop; LFN[lfTop] = 0; }
  else {
    let k = LFH[L], prev = 0, go = 1;
    while (go == 1) {
      if (k == 0) { go = 0; } else { if (LFD[k] < d) { go = 0; } else { prev = k; k = LFN[k]; } }
    }
    LFN[lfTop] = k;
    if (prev == 0) { LFH[L] = lfTop; } else { LFN[prev] = lfTop; }
  }
}
// is the eye inside building bi's footprint (with a margin)?
function camInside(bi) {
  let r = IR[bi], pf = IPF[bi];
  let ex = camX - IX[bi], ez = camZ - IZ[bi];
  let lx = ex, lz = ez;
  if (r == 1) { lx = 0 - ez; lz = ex; }
  if (r == 2) { lx = 0 - ex; lz = 0 - ez; }
  if (r == 3) { lx = ez; lz = 0 - ex; }
  let ins = 0;
  if (lx > PFX0[pf] - 400) { if (lx < PFX1[pf] + 400) { if (lz > PFZ0[pf] - 400) { if (lz < PFZ1[pf] + 400) { if (camY - IY[bi] < PFH[pf] + 200) { ins = 1; } } } } }
  return ins;
}
// the leaf of the building bi's LOD-0 BSP a world point is in
function leafOfPoint(bi, q, x, y, z) {
  let r = IR[bi];
  let ex = x - IX[bi], ez = z - IZ[bi];
  let lx = ex, lz = ez;
  if (r == 1) { lx = 0 - ez; lz = ex; }
  if (r == 2) { lx = 0 - ex; lz = 0 - ez; }
  if (r == 3) { lx = ez; lz = 0 - ex; }
  return leafBank(QB[q], QR[q], lx, y - IY[bi], lz);
}

// ---------------------------------------------------------------- sky, far land, the frame
function drawSky() {
  // the horizon's height on the screen (no roll)
  let hz = 0 - FOC * sind(camPitch) / cosd(camPitch);
  let top = 140;
  fillStop();
  if (hz < 135) {
    let y1 = Math.max(hz + 70, -140);
    if (y1 < 140) { M_rect(-245, top, 245, y1, skyTop); top = y1; }
    let y2 = Math.max(hz + 14, -140);
    if (y2 < top) { M_rect(-245, top, 245, y2, skyMid); top = y2; }
    let y3 = Math.max(hz, -140);
    if (y3 < top) { M_rect(-245, top, 245, y3, FOGSKY); top = y3; }
  }
  if (top > -140) { M_rect(-245, top, 245, -140, seaCol); }
}
function M_rect(x0, y0, x1, y1, col) {
  fillStop(); goto(x0, y0); fillColorHex(col); fillStart(); goto(x1, y0); goto(x1, y1); goto(x0, y1);
}
// the far land: 16 x 16 coarse quads (128 m) outside the near cells
let FVX = [], FVY = [], FVZ = [], FSX = [], FSY = [];
function drawFar() {
  let i = 1, n = 17 * 17, dx = 0, dy = 0, dz = 0, vz = 0;
  while (i <= n) {
    dx = mod(i - 1, 17) * 12800 - camX; dz = idiv(i - 1, 17) * 12800 - camZ; dy = FH[i] - camY;
    vz = r31 * dx + r32 * dy + r33 * dz;
    FVZ[i] = vz; FVX[i] = r11 * dx + r13 * dz; FVY[i] = r21 * dx + r22 * dy + r23 * dz;
    if (vz > NZ) { FSX[i] = FVX[i] * FOC / vz; FSY[i] = FVY[i] * FOC / vz; }
    i = i + 1;
  }
  // far to near over the coarse cells, by |dx| + |dz| from the eye's coarse cell
  let fcx = Math.floor(camX / 12800), fcz = Math.floor(camZ / 12800);
  let m = 30;
  while (m >= 0) {
    let ddx = 0 - m;
    while (ddx <= m) {
      let ddz = m - Math.abs(ddx);
      M_farCell(fcx + ddx, fcz + ddz);
      if (ddz != 0) { M_farCell(fcx + ddx, fcz - ddz); }
      ddx = ddx + 1;
    }
    m = m - 1;
  }
}
function M_farCell(gx, gz) {
  if (gx >= 0 && gx < 16 && gz >= 0 && gz < 16) {
    let fk = FK[gz * 16 + gx + 1];
    if (fk > 0) {
      // skip it when the near cells cover it (all four corners within the near radius)
      let x0 = gx * 4 - camCX, x1 = gx * 4 + 4 - camCX, z0 = gz * 4 - camCZ, z1 = gz * 4 + 4 - camCZ;
      let mx = Math.max(Math.abs(x0), Math.abs(x1)), mz = Math.max(Math.abs(z0), Math.abs(z1));
      if (mx + mz > drawR - 1) {
        let a = gz * 17 + gx + 1;
        M_poly(FSX, FSY, FVX, FVY, FVZ, a, a + 17, a + 18, a + 1, CT[fk + 6]);
      }
    }
  }
}

function renderWorld() {
  nPoly = 0; nInst = 0; nPT = 0; nPB0 = 0; nPB1 = 0; nPB2 = 0; nVX = 0;
  setCamera();
  drawSky();
  if (camY - hAt(camX, camZ) > 4000) { drawFar(); }
  // the near cells, far to near
  let o = OSTART[drawR + 1], oe = ODX.length;
  if (drawR >= RMAX) { o = 1; }
  let c = 0, gx = 0, gz = 0, wx = 0, wz = 0, vz = 0, vx = 0, lim = 0;
  while (o <= oe) {
    gx = camCX + ODX[o]; gz = camCZ + ODZ[o];
    if (gx >= 0 && gx < CELLS && gz >= 0 && gz < CELLS) {
      // is the cell's column in the view (a circle of 23 m round its centre)?
      wx = gx * CS + 1600 - camX; wz = gz * CS + 1600 - camZ;
      vz = r31 * wx + r33 * wz;
      vx = r11 * wx + r13 * wz;
      lim = 2400 * 16384;
      if (camPitch < -35) { lim = lim + (0 - camPitch - 35) * 3000 * 16384 / 10; }
      if (vz > 0 - lim - Math.abs(r32) * 8) {
        if (Math.abs(vx) * FOCi < (vz + lim) * 240 + lim * kXF) { drawCell(gz * CELLS + gx + 1); }
      }
    }
    o = o + 1;
  }
  fillStop();
}

// people, loot and effects (filled in by the game code)
function drawDyn(id, dist) {
  dynDraw(id, dist);
}

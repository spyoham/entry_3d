// ============================================================
// The picture: a room is a box seen from inside, so its faces never cover one another
// and need no sorting. A portal on a face is a window: the room behind it is drawn with
// a camera moved through the portal, cut to the window's outline on the screen (the
// window of a window is cut again). A camera that has gone through a portal stands
// behind the exit's face, outside its room: that face turns its back and is not drawn,
// which is the cut at the exit plane for free. Objects in a room come after the walls
// and the windows, far ones first.
//
// Everything is filled shapes (lines are thin quads): a pen's lines lie in a layer under
// all of its fills, so lines drawn with the pen could not go over a face in order.
//
// The rooms in view are walked with a stack of depths instead of recursion:
//   PH 0 walls (and objects beyond a standing frame), PH 1 the portals one by one
//   (a window pushes the next depth), PH 2 the objects and the laser, then pop.
// ============================================================
let wx0 = 0, wx1 = 0, wy0 = 0, wy1 = 0, ex = 0, ey = 0, ez = 0, ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, fx = 0, fy = 0, fz = 0, csc = 1, cfull = 1, cbase = 0, cn = 0, nr = 0.04;
let minArea = 300, detail = DETAIL, nQ = 0, nS = 0, curDep = 0, maxD = 3, isTess = 0, nFill = 0, nRoomDraw = 0;
let CEX = [], CEY = [], CEZ = [], CAX = [], CAY = [], CAZ = [], CBX = [], CBY = [], CBZ = [], CFX = [], CFY = [], CFZ = [], CSC = [], CLF = [], CLN = [];
let WX0 = [], WX1 = [], WY0 = [], WY1 = [], CUX = [], CUY = [], CC = [], CLX = [], CLY = [], RM = [], DPH = [], IT = [], PPT = [];
let DA = [], QX = [], QY = [], QZ = [], NX = [], NY = [], NZ = [], SX = [], SY = [], TX = [], TY = [];
let nClipQ = 0, nLoop = 0, nPS = 0;
let ZI = [], ZK = [], KX = [], KY = [], KZ = [];

function renderAlloc() {
  let i = 1;
  while (i <= 40) { DA.push(0); QX.push(0); QY.push(0); QZ.push(0); NX.push(0); NY.push(0); NZ.push(0); SX.push(0); SY.push(0); TX.push(0); TY.push(0); i = i + 1; }
  i = 1;
  while (i <= MAXDEP + 1) {
    CEX.push(0); CEY.push(0); CEZ.push(0); CAX.push(0); CAY.push(0); CAZ.push(0); CBX.push(0); CBY.push(0); CBZ.push(0); CFX.push(0); CFY.push(0); CFZ.push(0);
    WX0.push(-250); WX1.push(250); WY0.push(-140); WY1.push(140);
    CSC.push(1); CLF.push(1); CLN.push(0); RM.push(0); DPH.push(0); IT.push(0); PPT.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= (MAXDEP + 1) * CLM) { CLX.push(0); CLY.push(0); CUX.push(0); CUY.push(0); CC.push(0); i = i + 1; }
  i = 1;
  while (i <= 80) { ZI.push(0); ZK.push(0); i = i + 1; }
  i = 1;
  while (i <= 8) { KX.push(0); KY.push(0); KZ.push(0); i = i + 1; }
}

// the camera of depth k into the working globals
function camSet(k) {
  curDep = k;
  ex = CEX[k]; ey = CEY[k]; ez = CEZ[k];
  ax = CAX[k]; ay = CAY[k]; az = CAZ[k];
  bx = CBX[k]; by = CBY[k]; bz = CBZ[k];
  fx = CFX[k]; fy = CFY[k]; fz = CFZ[k];
  csc = CSC[k]; cfull = CLF[k]; cn = CLN[k]; cbase = (k - 1) * CLM;
  wx0 = WX0[k]; wx1 = WX1[k]; wy0 = WY0[k]; wy1 = WY1[k];
  nr = NEAR * csc;
}

// a corner of the shape being made, from room to camera coordinates
function M_q(x, y, z) {
  nQ = nQ + 1;
  m_dx = x - ex; m_dy = y - ey; m_dz = z - ez;
  QX[nQ] = m_dx * ax + m_dy * ay + m_dz * az;
  QY[nQ] = m_dx * bx + m_dy * by + m_dz * bz;
  QZ[nQ] = m_dx * fx + m_dy * fy + m_dz * fz;
}

// the shape QX.. cut at the near plane, onto the screen (SX, SY, nS), cut to the window
function clipQ() {
  let i = 1, j = 0, m = 0, za = 0, zb = 0, t = 0, low = 0;
  nClipQ = nClipQ + 1;
  while (i <= nQ) { if (QZ[i] < nr) { low = low + 1; } i = i + 1; }
  if (low == 0) {
    // all in front: straight onto the screen
    i = 1;
    while (i <= nQ) { t = FOC / QZ[i]; SX[i] = QX[i] * t; SY[i] = QY[i] * t; i = i + 1; }
    nS = nQ;
  } else {
    nS = 0;
    if (low < nQ) {
      i = 1;
      while (i <= nQ) {
        j = i + 1;
        if (j > nQ) { j = 1; }
        za = QZ[i]; zb = QZ[j];
        if (za >= nr) { m = m + 1; NX[m] = QX[i]; NY[m] = QY[i]; NZ[m] = za; }
        if ((za - nr) * (zb - nr) < 0) {
          t = (nr - za) / (zb - za);
          m = m + 1; NX[m] = QX[i] + (QX[j] - QX[i]) * t; NY[m] = QY[i] + (QY[j] - QY[i]) * t; NZ[m] = nr;
        }
        i = i + 1;
      }
      nS = m;
      i = 1;
      while (i <= m) { t = FOC / NZ[i]; SX[i] = NX[i] * t; SY[i] = NY[i] * t; i = i + 1; }
    }
  }
  if (cfull == 0 && nS >= 3) { clip2(); }
}

// Sutherland-Hodgman against the window (anticlockwise; edge k of depth d: CUX, CUY, CC at
// cbase + k, inside where CUX * y - CUY * x - CC >= 0). The box around the shape tells first
// whether an edge can cut it at all: most edges cannot, and cost no pass over the corners.
function clip2() {
  let k = 1, i = 1, j = 0, m = 0, ux = 0, uy = 0, c = 0, da = 0, db = 0, t = 0, x0 = SX[1], x1 = SX[1], y0 = SY[1], y1 = SY[1], lo = 0, hi = 0;
  while (i <= nS) {
    if (SX[i] < x0) { x0 = SX[i]; }
    if (SX[i] > x1) { x1 = SX[i]; }
    if (SY[i] < y0) { y0 = SY[i]; }
    if (SY[i] > y1) { y1 = SY[i]; }
    i = i + 1;
  }
  while (k <= cn) {
    ux = CUX[cbase + k]; uy = CUY[cbase + k]; c = CC[cbase + k];
    // the least and the most of the edge's test over the box
    lo = 0 - c; hi = 0 - c;
    if (ux > 0) { lo = lo + ux * y0; hi = hi + ux * y1; } else { lo = lo + ux * y1; hi = hi + ux * y0; }
    if (uy > 0) { lo = lo - uy * x1; hi = hi - uy * x0; } else { lo = lo - uy * x0; hi = hi - uy * x1; }
    if (hi < 0) { nS = 0; k = cn; }
    else {
      if (lo < 0) {
        m = 0;
        i = 1;
        while (i <= nS) { DA[i] = ux * SY[i] - uy * SX[i] - c; i = i + 1; }
        i = 1;
        while (i <= nS) {
          j = i + 1;
          if (j > nS) { j = 1; }
          da = DA[i]; db = DA[j];
          if (da >= 0) { m = m + 1; TX[m] = SX[i]; TY[m] = SY[i]; }
          if (da * db < 0) { t = da / (da - db); m = m + 1; TX[m] = SX[i] + (SX[j] - SX[i]) * t; TY[m] = SY[i] + (SY[j] - SY[i]) * t; }
          i = i + 1;
        }
        nS = m;
        if (nS < 3) { k = cn; }
        x0 = 100000; x1 = -100000; y0 = 100000; y1 = -100000;
        i = 1;
        while (i <= m) {
          SX[i] = TX[i]; SY[i] = TY[i];
          if (SX[i] < x0) { x0 = SX[i]; }
          if (SX[i] > x1) { x1 = SX[i]; }
          if (SY[i] < y0) { y0 = SY[i]; }
          if (SY[i] > y1) { y1 = SY[i]; }
          i = i + 1;
        }
      }
    }
    k = k + 1;
  }
}

// fill the shape on the screen
function fillS(col) {
  let i = 2;
  if (nS >= 3) {
    nFill = nFill + 1;
    if (isTess == 0) {
      penUp();
      fillStop();
      goto(SX[1], SY[1]);
      penColorHex(col);
      fillColorHex(col);
      fillStart();
      penDown();
      while (i <= nS) { goto(SX[i], SY[i]); i = i + 1; }
      goto(SX[1], SY[1]);
      penUp();
    } else {
      fillStop();
      goto(SX[1], SY[1]);
      fillColorHex(col);
      fillStart();
      while (i <= nS) { goto(SX[i], SY[i]); i = i + 1; }
    }
  }
}

// a line in the room as a thin filled quad of `w` pixels (cut at the near plane and to the window)
function lineW(x0, y0, z0, x1, y1, z1, w, col) {
  let qx0 = 0, qy0 = 0, qz0 = 0, qx1 = 0, qy1 = 0, qz1 = 0, t = 0, sx0 = 0, sy0 = 0, sx1 = 0, sy1 = 0, t0 = 0, t1 = 1, k = 1, j = 0, ux = 0, uy = 0, fa = 0, fd = 0, L = 0, nxx = 0, nyy = 0;
  m_dx = x0 - ex; m_dy = y0 - ey; m_dz = z0 - ez;
  qx0 = m_dx * ax + m_dy * ay + m_dz * az; qy0 = m_dx * bx + m_dy * by + m_dz * bz; qz0 = m_dx * fx + m_dy * fy + m_dz * fz;
  m_dx = x1 - ex; m_dy = y1 - ey; m_dz = z1 - ez;
  qx1 = m_dx * ax + m_dy * ay + m_dz * az; qy1 = m_dx * bx + m_dy * by + m_dz * bz; qz1 = m_dx * fx + m_dy * fy + m_dz * fz;
  if (qz0 >= nr || qz1 >= nr) {
    if (qz0 < nr) { t = (nr - qz0) / (qz1 - qz0); qx0 = qx0 + (qx1 - qx0) * t; qy0 = qy0 + (qy1 - qy0) * t; qz0 = nr; }
    if (qz1 < nr) { t = (nr - qz1) / (qz0 - qz1); qx1 = qx1 + (qx0 - qx1) * t; qy1 = qy1 + (qy0 - qy1) * t; qz1 = nr; }
    sx0 = qx0 * FOC / qz0; sy0 = qy0 * FOC / qz0; sx1 = qx1 * FOC / qz1; sy1 = qy1 * FOC / qz1;
    if (cfull == 0) {
      // Cyrus-Beck against the window
      while (k <= cn) {
        ux = CUX[cbase + k]; uy = CUY[cbase + k];
        fa = ux * sy0 - uy * sx0 - CC[cbase + k];
        fd = ux * (sy1 - sy0) - uy * (sx1 - sx0);
        if (Math.abs(fd) < 0.000001) { if (fa < 0) { t1 = -1; } }
        else {
          t = 0 - fa / fd;
          if (fd > 0) { if (t > t0) { t0 = t; } } else { if (t < t1) { t1 = t; } }
        }
        k = k + 1;
      }
      if (t1 > t0) {
        ux = sx1 - sx0; uy = sy1 - sy0;
        sx1 = sx0 + ux * t1; sy1 = sy0 + uy * t1;
        sx0 = sx0 + ux * t0; sy0 = sy0 + uy * t0;
      }
    }
    if (t1 > t0) {
      ux = sx1 - sx0; uy = sy1 - sy0;
      L = Math.sqrt(ux * ux + uy * uy);
      if (L > 0.01) {
        nxx = 0 - uy / L * w / 2; nyy = ux / L * w / 2;
        SX[1] = sx0 + nxx; SY[1] = sy0 + nyy; SX[2] = sx1 + nxx; SY[2] = sy1 + nyy; SX[3] = sx1 - nxx; SY[3] = sy1 - nyy; SX[4] = sx0 - nxx; SY[4] = sy0 - nyy;
        nS = 4;
        fillS(col);
      }
    }
  }
}

// a colour from the palette: palette entry ci, light k (1 top .. 6 underside), distance d (seen size)
function M_pal(ci, k, d, out) {
  m_L = Math.floor(d / FSTEP);
  if (m_L > NLEV - 1) { m_L = NLEV - 1; }
  out = CPAL[(ci - 1) * PSTRIDE + (k - 1) * NLEV + m_L + 1];
}
// how far a box face is from the eye, as the player sees it (its nearest point and its middle)
function fdist(x0, x1, y0, y1, z0, z1) {
  let cx = ex, cy = ey, cz = ez, d1 = 0, d2 = 0;
  if (cx < x0) { cx = x0; }
  if (cx > x1) { cx = x1; }
  if (cy < y0) { cy = y0; }
  if (cy > y1) { cy = y1; }
  if (cz < z0) { cz = z0; }
  if (cz > z1) { cz = z1; }
  d1 = Math.sqrt((ex - cx) * (ex - cx) + (ey - cy) * (ey - cy) + (ez - cz) * (ez - cz));
  cx = (x0 + x1) / 2 - ex; cy = (y0 + y1) / 2 - ey; cz = (z0 + z1) / 2 - ez;
  d2 = Math.sqrt(cx * cx + cy * cy + cz * cz);
  return (d1 * 0.65 + d2 * 0.35) / csc;
}

// the eight corners of a box in camera coordinates (KX.., corner 1 + i + 2j + 4k)
function boxCorners(x0, x1, y0, y1, z0, z1) {
  let dx = x0 - ex, dy = y0 - ey, dz = z0 - ez, w = x1 - x0, h = y1 - y0, d = z1 - z0, qx = 0, qy = 0, qz = 0, wx = 0, wy = 0, wz = 0, hx = 0, hy = 0, hz = 0, dX = 0, dY = 0, dZ = 0;
  qx = dx * ax + dy * ay + dz * az; qy = dx * bx + dy * by + dz * bz; qz = dx * fx + dy * fy + dz * fz;
  wx = w * ax; wy = w * bx; wz = w * fx;
  hx = h * ay; hy = h * by; hz = h * fy;
  dX = d * az; dY = d * bz; dZ = d * fz;
  KX[1] = qx; KY[1] = qy; KZ[1] = qz;
  KX[2] = qx + wx; KY[2] = qy + wy; KZ[2] = qz + wz;
  KX[3] = qx + hx; KY[3] = qy + hy; KZ[3] = qz + hz;
  KX[4] = KX[2] + hx; KY[4] = KY[2] + hy; KZ[4] = KZ[2] + hz;
  KX[5] = qx + dX; KY[5] = qy + dY; KZ[5] = qz + dZ;
  KX[6] = KX[2] + dX; KY[6] = KY[2] + dY; KZ[6] = KZ[2] + dZ;
  KX[7] = KX[3] + dX; KY[7] = KY[3] + dY; KZ[7] = KZ[3] + dZ;
  KX[8] = KX[4] + dX; KY[8] = KY[4] + dY; KZ[8] = KZ[4] + dZ;
}
// a face of the box from its corners
function M_face(a, b, c, d) {
  QX[1] = KX[a]; QY[1] = KY[a]; QZ[1] = KZ[a];
  QX[2] = KX[b]; QY[2] = KY[b]; QZ[2] = KZ[b];
  QX[3] = KX[c]; QY[3] = KY[c]; QZ[3] = KZ[c];
  QX[4] = KX[d]; QY[4] = KY[d]; QZ[4] = KZ[d];
  nQ = 4;
  clipQ();
}

// ------------------------------------------------------------
// the room's own faces, its floor lines and edges
// ------------------------------------------------------------
function drawShell(r) {
  let W = RW[r], H = RH[r], D = RD[r], k = 0, lc = ' ', col = ' ', g = GRID, m_L = 0, cw = RCW[r], d = 0;
  nRoomDraw = nRoomDraw + 1;
  boxCorners(0, W, 0, H, 0, D);
  if (ey < H) { M_face(3, 7, 8, 4); M_pal(RCC[r], 3, fdist(0, W, H, H, 0, D), col); fillS(col); }
  if (ex > 0) { M_face(1, 3, 7, 5); M_pal(cw, 4, fdist(0, 0, 0, H, 0, D), col); fillS(col); }
  if (ex < W) { M_face(2, 6, 8, 4); M_pal(cw, 3, fdist(W, W, 0, H, 0, D), col); fillS(col); }
  if (ez > 0) { M_face(1, 2, 4, 3); M_pal(cw, 2, fdist(0, W, 0, H, 0, 0), col); fillS(col); }
  if (ez < D) { M_face(5, 7, 8, 6); M_pal(cw, 5, fdist(0, W, 0, H, D, D), col); fillS(col); }
  if (ey > 0) {
    d = fdist(0, W, 0, 0, 0, D);
    M_face(1, 5, 6, 2); M_pal(RCF[r], 1, d, col); fillS(col);
    // floor lines every GRID metres
    if (curDep <= GRIDDEP && detail >= 2) {
      M_pal(RCF[r], 5, d * 1.2, lc);
      k = g;
      while (k < W - 0.01) { lineW(k, 0, 0, k, 0, D, 1.2, lc); k = k + g; }
      k = g;
      while (k < D - 0.01) { lineW(0, 0, k, W, 0, k, 1.2, lc); k = k + g; }
    }
  }
  // the edges where walls meet
  if (detail >= 1) {
    M_pal(cw, 6, fdist(0, W, 0, H, 0, D), lc);
    lineW(0, 0, 0, 0, H, 0, 1.5, lc); lineW(W, 0, 0, W, H, 0, 1.5, lc); lineW(0, 0, D, 0, H, D, 1.5, lc); lineW(W, 0, D, W, H, D, 1.5, lc);
    lineW(0, 0, 0, W, 0, 0, 1.5, lc); lineW(0, 0, D, W, 0, D, 1.5, lc); lineW(0, 0, 0, 0, 0, D, 1.5, lc); lineW(W, 0, 0, W, 0, D, 1.5, lc);
    lineW(0, H, 0, W, H, 0, 1.5, lc); lineW(0, H, D, W, H, D, 1.5, lc); lineW(0, H, 0, 0, H, D, 1.5, lc); lineW(W, H, 0, W, H, D, 1.5, lc);
  }
}

// ------------------------------------------------------------
// a portal of the room at depth `dep`: its frame, then a window that pushes the next depth,
// or a closed panel
// ------------------------------------------------------------
let pushed = 0;
function portalStep(p, dep) {
  nPS = nPS + 1;
  let dd = (ex - PCX[p]) * PNX[p] + (ey - PCY[p]) * PNY[p] + (ez - PCZ[p]) * PNZ[p];
  let hw = PW[p] / 2, h = PH[p], cx = PCX[p], cy = PCY[p], cz = PCZ[p], area = 0, i = 1, j = 0, q = 0, k = 0, base = 0, d = 0, col = ' ', m_dx = 0, m_dy = 0, m_dz = 0, m_L = 0, fw = 0, lo = 0, hi = 0;
  let rx = PRX[p] * hw, ry = PRY[p] * hw, rz = PRZ[p] * hw, ux = PUX[p] * h, uy = PUY[p] * h, uz = PUZ[p] * h;
  let m_a = 0, m_b = 0, m_d = 0, m_s = 0, m_vx = 0, m_vy = 0, m_vz = 0;
  pushed = 0;
  if (dd > 0) {
    d = Math.sqrt(sqr(cx + ux / 2 - ex) + sqr(cy + uy / 2 - ey) + sqr(cz + uz / 2 - ez)) / csc;
    // the frame: a rectangle a little larger, under the window
    if (PNF[p] == 0 && (dep == 1 || detail >= 1)) {
      fw = PFW[p];
      lo = 0 - fw; hi = h + fw;
      if (PSD[p] >= 1 && PSD[p] <= 4) { if (cy < 0.01) { lo = 0; } if (cy + hi > RH[PR[p]]) { hi = RH[PR[p]] - cy; } }
      k = (hw + fw) / hw;
      nQ = 0;
      M_q(cx - rx * k + PUX[p] * lo, cy - ry * k + PUY[p] * lo, cz - rz * k + PUZ[p] * lo);
      M_q(cx + rx * k + PUX[p] * lo, cy + ry * k + PUY[p] * lo, cz + rz * k + PUZ[p] * lo);
      M_q(cx + rx * k + PUX[p] * hi, cy + ry * k + PUY[p] * hi, cz + rz * k + PUZ[p] * hi);
      M_q(cx - rx * k + PUX[p] * hi, cy - ry * k + PUY[p] * hi, cz - rz * k + PUZ[p] * hi);
      clipQ();
      k = PSY[p];
      if (PK[p] >= 2) { if (PL[p] > 0) { k = PSY[PL[p]]; } }
      k = k + 15;
      if (k == 15) { k = 15; }
      if (PK[p] == 1 && p == lensSel) { k = 23; }
      M_pal(k, 1, d, col);
      fillS(col);
    }
    nQ = 0;
    M_q(cx - rx, cy - ry, cz - rz); M_q(cx + rx, cy + ry, cz + rz); M_q(cx + rx + ux, cy + ry + uy, cz + rz + uz); M_q(cx - rx + ux, cy - ry + uy, cz - rz + uz);
    clipQ();
    if (nS >= 3) {
      i = 1;
      while (i <= nS) { j = i + 1; if (j > nS) { j = 1; } area = area + SX[i] * SY[j] - SX[j] * SY[i]; i = i + 1; }
      if (Math.abs(area) > 6) {
        if (dep == 1) { PVIS[p] = 1; }
        if (popen(p) == 1) {
          if (dep < maxD && Math.abs(area) > minArea * 2) {
            // the window becomes the next depth's outline (anticlockwise)
            base = dep * CLM;
            i = 1;
            while (i <= nS) {
              k = i;
              if (area < 0) { k = nS + 1 - i; }
              CLX[base + i] = SX[k]; CLY[base + i] = SY[k];
              i = i + 1;
            }
            i = 1;
            while (i <= nS) {
              j = i + 1;
              if (j > nS) { j = 1; }
              CUX[base + i] = CLX[base + j] - CLX[base + i]; CUY[base + i] = CLY[base + j] - CLY[base + i];
              CC[base + i] = CUX[base + i] * CLY[base + i] - CUY[base + i] * CLX[base + i];
              i = i + 1;
            }
            k = dep + 1;
            CLN[k] = nS; CLF[k] = 0;
            WX0[k] = 100000; WX1[k] = -100000; WY0[k] = 100000; WY1[k] = -100000;
            i = 1;
            while (i <= nS) {
              if (SX[i] < WX0[k]) { WX0[k] = SX[i]; }
              if (SX[i] > WX1[k]) { WX1[k] = SX[i]; }
              if (SY[i] < WY0[k]) { WY0[k] = SY[i]; }
              if (SY[i] > WY1[k]) { WY1[k] = SY[i]; }
              i = i + 1;
            }
            q = PL[p];
            M_mapP(p, q, ex, ey, ez, CEX[k], CEY[k], CEZ[k]);
            M_mapD(p, q, ax, ay, az, CAX[k], CAY[k], CAZ[k]);
            M_mapD(p, q, bx, by, bz, CBX[k], CBY[k], CBZ[k]);
            M_mapD(p, q, fx, fy, fz, CFX[k], CFY[k], CFZ[k]);
            CSC[k] = csc * PW[q] / PW[p];
            RM[k] = PR[q]; DPH[k] = 0; PPT[k] = p;
            pushed = 1;
          } else {
            fillS(FOGC);
          }
        } else {
          // a closed door, or a lens panel with no partner
          k = 2;
          if (PK[p] == 1) { k = 3; }
          M_pal(k, 1, d, col);
          fillS(col);
          if (PSH[p] > 0) { panelMark(p, d); }
        }
      }
    }
  }
}

// the shape mark of a lens panel (triangle, circle, square) in its middle
function panelMark(p, d) {
  let k = Math.min(PW[p], PH[p]) * 0.28, mx = PCX[p] + PUX[p] * PH[p] / 2 + PNX[p] * 0.01, my = PCY[p] + PUY[p] * PH[p] / 2 + PNY[p] * 0.01, mz = PCZ[p] + PUZ[p] * PH[p] / 2 + PNZ[p] * 0.01;
  let n = 3, i = 0, a = 90, c = 0, s = 0, m_dx = 0, m_dy = 0, m_dz = 0, m_L = 0, col = ' ';
  if (PSH[p] == 2) { n = 10; }
  if (PSH[p] == 3) { n = 4; a = 45; k = k * 1.2; }
  nQ = 0;
  while (i < n) {
    c = cosd(a) * k; s = sind(a) * k;
    M_q(mx + PRX[p] * c + PUX[p] * s, my + PRY[p] * c + PUY[p] * s, mz + PRZ[p] * c + PUZ[p] * s);
    a = a + 360 / n;
    i = i + 1;
  }
  clipQ();
  M_pal(PSY[p] + 15, 1, d, col);
  fillS(col);
}

// a point and a direction through portal p to q (s: the size ratio)
function M_mapP(p, q, x, y, z, ox, oy, oz) {
  m_vx = x - PCX[p]; m_vy = y - PCY[p]; m_vz = z - PCZ[p];
  m_s = PW[q] / PW[p];
  m_a = (m_vx * PRX[p] + m_vy * PRY[p] + m_vz * PRZ[p]) * m_s;
  m_b = (m_vx * PUX[p] + m_vy * PUY[p] + m_vz * PUZ[p]) * m_s;
  m_d = (m_vx * PNX[p] + m_vy * PNY[p] + m_vz * PNZ[p]) * m_s;
  ox = PCX[q] - m_a * PRX[q] + m_b * PUX[q] - m_d * PNX[q];
  oy = PCY[q] - m_a * PRY[q] + m_b * PUY[q] - m_d * PNY[q];
  oz = PCZ[q] - m_a * PRZ[q] + m_b * PUZ[q] - m_d * PNZ[q];
}
// (a direction keeps its length)
function M_mapD(p, q, x, y, z, ox, oy, oz) {
  m_a = x * PRX[p] + y * PRY[p] + z * PRZ[p];
  m_b = x * PUX[p] + y * PUY[p] + z * PUZ[p];
  m_d = x * PNX[p] + y * PNY[p] + z * PNZ[p];
  ox = 0 - m_a * PRX[q] + m_b * PUX[q] - m_d * PNX[q];
  oy = 0 - m_a * PRY[q] + m_b * PUY[q] - m_d * PNY[q];
  oz = 0 - m_a * PRZ[q] + m_b * PUZ[q] - m_d * PNZ[q];
}

// ------------------------------------------------------------
// objects
// ------------------------------------------------------------
// a box, its faces that look at the eye: palette ci for the sides, ti for the top, seen at distance d
function drawBox(x0, x1, y0, y1, z0, z1, ci, ti, d) {
  let m_L = 0, col = ' ';
  boxCorners(x0, x1, y0, y1, z0, z1);
  if (ey > y1) { M_face(3, 7, 8, 4); M_pal(ti, 1, d, col); fillS(col); }
  if (ey < y0) { M_face(1, 5, 6, 2); M_pal(ci, 6, d, col); fillS(col); }
  if (ex < x0) { M_face(1, 3, 7, 5); M_pal(ci, 4, d, col); fillS(col); }
  if (ex > x1) { M_face(2, 6, 8, 4); M_pal(ci, 3, d, col); fillS(col); }
  if (ez < z0) { M_face(1, 2, 4, 3); M_pal(ci, 2, d, col); fillS(col); }
  if (ez > z1) { M_face(5, 7, 8, 6); M_pal(ci, 5, d, col); fillS(col); }
}

// is object o seen now (gates that are open and cores not yet there are not)
function oshown(o) {
  let v = 1, t = OT[o];
  if (OR[o] == 0) { v = 0; }
  if (t == 8) { if (sigv(OCD[o]) == 1) { v = 0; } }
  if (t == 5) { v = v * sigv(OCD[o]); }
  return v;
}

// the objects of room r: phase 0 those beyond a standing frame's face, phase 2 the rest
function drawObjs(r, phase) {
  let o = SO0[stage] + 1, n = 0, i = 0, j = 0, key = 0, b = 0, p = 0, dx = 0, dy = 0, dz = 0, qx = 0, qy = 0, qz = 0, rr = 0, rp = 0;
  while (o <= SO1[stage]) {
    if (OR[o] == r) {
      if (oshown(o) == 1) {
        b = 0;
        if (RFP[r] == 1) {
          p = RP0[r];
          while (p < RP0[r] + RPN[r]) {
            if (PFR[p] == 1) {
              if ((ex - PCX[p]) * PNX[p] + (ey - PCY[p]) * PNY[p] + (ez - PCZ[p]) * PNZ[p] > 0) {
                if ((OX[o] - PCX[p]) * PNX[p] + (OZ[o] - PCZ[p]) * PNZ[p] < 0) { if (popen(p) == 1) { b = 1; } }
              }
            }
            p = p + 1;
          }
        }
        if (cfull == 0 && b == 0) {
          // through a window: is the object's ball anywhere in the window's box
          dx = OX[o] - ex; dy = OY[o] + OHY[o] * OS[o] / 2 - ey; dz = OZ[o] - ez;
          qz = dx * fx + dy * fy + dz * fz;
          rr = (OHX[o] + OHZ[o] + OHY[o] / 2) * OS[o];
          if (qz < 0 - rr) { b = 2; }
          else {
            if (qz < nr) { qz = nr; }
            qx = (dx * ax + dy * ay + dz * az) * FOC / qz; qy = (dx * bx + dy * by + dz * bz) * FOC / qz; rp = rr * FOC / qz;
            if (qx + rp < wx0 || qx - rp > wx1 || qy + rp < wy0 || qy - rp > wy1) { b = 2; }
          }
        }
        if ((b == 1 && phase == 0) || (b == 0 && phase == 2)) {
          dx = OX[o] - ex; dy = OY[o] + OHY[o] * OS[o] / 2 - ey; dz = OZ[o] - ez;
          key = dx * dx + dy * dy + dz * dz;
          // far ones first
          n = n + 1;
          i = n;
          j = 1;
          while (j == 1) {
            j = 0;
            if (i > 1) { if (ZK[i - 1] < key) { ZK[i] = ZK[i - 1]; ZI[i] = ZI[i - 1]; i = i - 1; j = 1; } }
          }
          ZK[i] = key; ZI[i] = o;
        }
      }
    }
    o = o + 1;
  }
  i = 1;
  while (i <= n) { drawObj(ZI[i], Math.sqrt(ZK[i]) / csc); i = i + 1; }
}

function drawObj(o, d) {
  let t = OT[o], s = OS[o], hx = OHX[o] * s, hz = OHZ[o] * s, hy = OHY[o] * s, x = OX[o], y = OY[o], z = OZ[o], ci = OCI[o], k = 0, c = 0, sn = 0, m_dx = 0, m_dy = 0, m_dz = 0, m_L = 0, col = ' ';
  if (t == 1 || t == 9 || t == 8) { drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, ci, ci, d); }
  if (t == 2) {
    drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, ci, ci, d);
    // the cube's mark on top
    k = hx * 0.45;
    if (ey > y + hy) { drawBox(x - k, x + k, y + hy, y + hy + 0.002 * s, z - k, z + k, 11, 11, d); }
  }
  if (t == 3) {
    k = ci;
    if (SG[OSG[o]] == 1) { k = 4; }
    drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, k, k, d);
  }
  if (t == 4) {
    drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, ci, ci, d);
    k = 5;
    if (OST[o] == 1) { k = 6; }
    c = hx * 0.55;
    drawBox(x - c, x + c, y + hy, y + hy + 0.18 * s, z - c, z + c, k, k, d);
  }
  if (t == 5) {
    k = y + sind(stageT * 120) * 0.08 * s;
    drawBox(x - hx, x + hx, k, k + hy, z - hz, z + hz, 7, 8, d);
  }
  if (t == 6) {
    k = ci;
    if (sigv(OCD[o]) == 0) { k = 13; }
    drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, k, k, d);
  }
  if (t == 7) {
    k = ci;
    if (SG[OSG[o]] == 1) { k = 9; }
    drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, k, k, d);
  }
  if (t == 10) {
    drawBox(x - hx, x + hx, y, y + 0.12 * s, z - hz, z + hz, 12, 12, d);
    // the mirror: a slanted face across the base
    c = hx; sn = hz;
    if (mod(OST[o], 2) == 1) { sn = 0 - hz; }
    nQ = 0; M_q(x - c, y + 0.12 * s, z - sn); M_q(x + c, y + 0.12 * s, z + sn); M_q(x + c, y + hy, z + sn); M_q(x - c, y + hy, z - sn);
    clipQ(); M_pal(ci, 1, d, col); fillS(col);
  }
  if (t == 11) {
    k = y + sind(stageT * 90 + o * 40) * 0.06 * s;
    drawBox(x - hx, x + hx, k, k + hy, z - hz, z + hz, ci, 14, d);
  }
  if (t == 12) {
    k = ci;
    if (sigv(OCD[o]) == 1) { k = 10; }
    drawBox(x - hx, x + hx, y, y + hy, z - hz, z + hz, k, k, d);
  }
}

// the laser lines that lie in room r
function drawLasers(r) {
  let i = 1;
  while (i <= LSN) {
    if (LSR[i] == r) {
      lineW(LA[i], LB[i], LC[i], LD[i], LE[i], LF[i], 4, '#ff3b30');
      if (detail >= 1) { lineW(LA[i], LB[i], LC[i], LD[i], LE[i], LF[i], 1.5, '#ffd0c0'); }
    }
    i = i + 1;
  }
}

// ------------------------------------------------------------
// the whole picture
// ------------------------------------------------------------
function renderAll() {
  let dep = 1, r = 0, p = 0, i = 0, cy = cosd(yaw), sy = sind(yaw), cp = cosd(pitch), sp = sind(pitch), lim = 0;
  nFill = 0; nRoomDraw = 0;
  eraseAll();
  // the background (what is past the deepest window)
  nS = 4; SX[1] = -250; SY[1] = -145; SX[2] = 250; SY[2] = -145; SX[3] = 250; SY[3] = 145; SX[4] = -250; SY[4] = 145;
  fillS(FOGC);
  i = SP0[stage] + 1;
  while (i <= SP1[stage]) { PVIS[i] = 0; i = i + 1; }
  CEX[1] = vEX; CEY[1] = vEY; CEZ[1] = vEZ;
  CAX[1] = cy; CAY[1] = 0; CAZ[1] = 0 - sy;
  CBX[1] = 0 - sy * sp; CBY[1] = cp; CBZ[1] = 0 - cy * sp;
  CFX[1] = sy * cp; CFY[1] = sp; CFZ[1] = cy * cp;
  CSC[1] = psc; CLF[1] = 1; CLN[1] = 0;
  RM[1] = vRoom; DPH[1] = 0; PPT[1] = 0;
  camSet(1);
  lim = 0;
  while (dep > 0 && lim < 400) {
    lim = lim + 1;
    if (curDep != dep) { camSet(dep); }
    r = RM[dep];
    if (DPH[dep] == 0) {
      drawShell(r);
      if (RFP[r] == 1) { drawObjs(r, 0); }
      IT[dep] = RP0[r];
      DPH[dep] = 1;
    } else {
      if (DPH[dep] == 1) {
        if (IT[dep] < RP0[r] + RPN[r]) {
          p = IT[dep];
          IT[dep] = p + 1;
          portalStep(p, dep);
          if (pushed == 1) { dep = dep + 1; }
        } else { DPH[dep] = 2; }
      } else {
        drawObjs(r, 2);
        drawLasers(r);
        dep = dep - 1;
        if (dep > 0) {
          camSet(dep);
        }
      }
    }
  }
  fillStop();
  nLoop = lim;
}

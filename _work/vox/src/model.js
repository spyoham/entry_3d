// ===================================================================== shaped blocks
// A shaped block (shape 5) is drawn from its boxes (MBX0 .. in 1/16 of the cell, MD0 / MDN of the
// model BMDL), plus the arms toward the sides it joins (fences, walls, panes). Each box shows the
// faces turned to the eye; a face shows the part of its texture under it (as the blocks of the
// genre do), near by as the texture's rects, far off in its average colour. The boxes of one
// block are drawn far to near.
let MSB = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], MSD = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let mdlN = 0, mdlX = 0, mdlY = 0, mdlZ = 0, mdlBX = 0, mdlBY = 0, mdlBZ = 0, mdlB = 0, mdlLT = 0, mdlFog = 0, mdlD2 = 0;
// a box into the sorted list (far first)
function mdlAdd(k) {
  let cxm = mdlX + (MBX0[k] + MBX1[k]) / 32 - camX, cym = mdlY + (MBY0[k] + MBY1[k]) / 32 - camY, czm = mdlZ + (MBZ0[k] + MBZ1[k]) / 32 - camZ;
  let dd = cxm * cxm + cym * cym + czm * czm;
  mdlN = mdlN + 1;
  let j = mdlN;
  while (j > 1) { if (MSD[j - 1] < dd) { MSB[j] = MSB[j - 1]; MSD[j] = MSD[j - 1]; j = j - 1; } else { break; } }
  MSB[j] = k; MSD[j] = dd;
}
function drawModel(f, x, y, z, bx, by, bz, ni, fog, d2) {
  let b = FT[f], m = BMDL[b + 1];
  mdlX = x; mdlY = y; mdlZ = z; mdlBX = bx; mdlBY = by; mdlBZ = bz; mdlB = b; mdlLT = LT[ni]; mdlFog = fog; mdlD2 = d2;
  mdlN = 0;
  let k = MD0[m], ke = k + MDN[m];
  while (k < ke) { mdlAdd(k); k = k + 1; }
  let c = BCONN[b + 1];
  if (c > 0) {
    let a = FA[f], s = 0, am = 0;
    while (s < 4) {
      if (mod(a, 2) == 1) { am = ARMM[(c - 1) * 4 + s + 1]; k = MD0[am]; ke = k + MDN[am]; while (k < ke) { mdlAdd(k); k = k + 1; } }
      a = idiv(a, 2); s = s + 1;
    }
  }
  k = 1;
  while (k <= mdlN) { drawMBox(MSB[k]); k = k + 1; }
}
// the camera-space point (u, v, w) / 16 into the cell: mpx, mpy, mpz
let mpx = 0, mpy = 0, mpz = 0;
function M_mp(U, V, W) {
  mpx = mdlBX + (ux1 * U + uz1 * W) / 16; mpy = mdlBY + (ux2 * U + uy2 * V + uz2 * W) / 16; mpz = mdlBZ + (ux3 * U + uy3 * V + uz3 * W) / 16;
}
function drawMBox(k) {
  let x0 = MBX0[k], y0 = MBY0[k], z0 = MBZ0[k], x1 = MBX1[k], y1 = MBY1[k], z1 = MBZ1[k], t = MBT[k], b = mdlB, tt = 0;
  if (MBQ[k] == 1) {
    // two crossed quads (a plant in a pot, a flame)
    if (t == 0) { t = BXT[b + 1]; }
    M_mp(x0, y1, z0); q0x = mpx; q0y = mpy; q0z = mpz;
    M_mp(x1, y1, z1); q1x = mpx; q1y = mpy; q1z = mpz;
    M_mp(x0, y0, z0); q3x = mpx; q3y = mpy; q3z = mpz;
    M_mp(x1, y0, z1); q2x = mpx; q2y = mpy; q2z = mpz;
    mFace(t, 6, 0, 0, 16, 16);
    M_mp(x1, y1, z0); q0x = mpx; q0y = mpy; q0z = mpz;
    M_mp(x0, y1, z1); q1x = mpx; q1y = mpy; q1z = mpz;
    M_mp(x1, y0, z0); q3x = mpx; q3y = mpy; q3z = mpz;
    M_mp(x0, y0, z1); q2x = mpx; q2y = mpy; q2z = mpz;
    mFace(t, 6, 0, 0, 16, 16);
  } else {
    let cx = (camX - mdlX) * 16, cy = (camY - mdlY) * 16, cz = (camZ - mdlZ) * 16;
    if (cx < x0) {
      tt = t; if (tt == 0) { tt = BT6[b * 6 + 1]; }
      M_mp(x0, y1, z0); q0x = mpx; q0y = mpy; q0z = mpz; M_mp(x0, y1, z1); q1x = mpx; q1y = mpy; q1z = mpz;
      M_mp(x0, y0, z1); q2x = mpx; q2y = mpy; q2z = mpz; M_mp(x0, y0, z0); q3x = mpx; q3y = mpy; q3z = mpz;
      mFace(tt, 0, z0, 16 - y1, z1, 16 - y0);
    }
    if (cx > x1) {
      tt = t; if (tt == 0) { tt = BT6[b * 6 + 2]; }
      M_mp(x1, y1, z1); q0x = mpx; q0y = mpy; q0z = mpz; M_mp(x1, y1, z0); q1x = mpx; q1y = mpy; q1z = mpz;
      M_mp(x1, y0, z0); q2x = mpx; q2y = mpy; q2z = mpz; M_mp(x1, y0, z1); q3x = mpx; q3y = mpy; q3z = mpz;
      mFace(tt, 1, 16 - z1, 16 - y1, 16 - z0, 16 - y0);
    }
    if (cy < y0) {
      tt = t; if (tt == 0) { tt = BT6[b * 6 + 3]; }
      M_mp(x0, y0, z1); q0x = mpx; q0y = mpy; q0z = mpz; M_mp(x1, y0, z1); q1x = mpx; q1y = mpy; q1z = mpz;
      M_mp(x1, y0, z0); q2x = mpx; q2y = mpy; q2z = mpz; M_mp(x0, y0, z0); q3x = mpx; q3y = mpy; q3z = mpz;
      mFace(tt, 2, x0, 16 - z1, x1, 16 - z0);
    }
    if (cy > y1) {
      tt = t; if (tt == 0) { tt = BT6[b * 6 + 4]; }
      M_mp(x0, y1, z0); q0x = mpx; q0y = mpy; q0z = mpz; M_mp(x1, y1, z0); q1x = mpx; q1y = mpy; q1z = mpz;
      M_mp(x1, y1, z1); q2x = mpx; q2y = mpy; q2z = mpz; M_mp(x0, y1, z1); q3x = mpx; q3y = mpy; q3z = mpz;
      mFace(tt, 3, x0, z0, x1, z1);
    }
    if (cz < z0) {
      tt = t; if (tt == 0) { tt = BT6[b * 6 + 5]; }
      M_mp(x1, y1, z0); q0x = mpx; q0y = mpy; q0z = mpz; M_mp(x0, y1, z0); q1x = mpx; q1y = mpy; q1z = mpz;
      M_mp(x0, y0, z0); q2x = mpx; q2y = mpy; q2z = mpz; M_mp(x1, y0, z0); q3x = mpx; q3y = mpy; q3z = mpz;
      mFace(tt, 4, 16 - x1, 16 - y1, 16 - x0, 16 - y0);
    }
    if (cz > z1) {
      tt = t; if (tt == 0) { tt = BT6[b * 6 + 6]; }
      M_mp(x0, y1, z1); q0x = mpx; q0y = mpy; q0z = mpz; M_mp(x1, y1, z1); q1x = mpx; q1y = mpy; q1z = mpz;
      M_mp(x1, y0, z1); q2x = mpx; q2y = mpy; q2z = mpz; M_mp(x0, y0, z1); q3x = mpx; q3y = mpy; q3z = mpz;
      mFace(tt, 5, x0, 16 - y1, x1, 16 - y0);
    }
  }
}
// a face q0 q1 q2 q3 (q0 -> q1 along u, q0 -> q3 along v) showing the window (tu0, tv0) .. (tu1, tv1)
// (sixteenths) of texture t, lit as direction d
function mFace(t, d, tu0, tv0, tu1, tv1) {
  let nz = NEARZ;
  if (q0z > nz && q1z > nz && q2z > nz && q3z > nz) {
    let kb = LTK[mdlLT * 8 + d + 1], fog = mdlFog, foc = FOC, ca = TAVG[t];
    if (mdlD2 <= DEC2 || ca < 0) {
      winRects(t, kb, fog, tu0, tv0, tu1, tv1);
    } else {
      fillStop(); goto(q0x * foc / q0z, q0y * foc / q0z); fillColorHex(CT[ca + kb + fog + 1]); fillStart();
      goto(q1x * foc / q1z, q1y * foc / q1z); goto(q2x * foc / q2z, q2y * foc / q2z); goto(q3x * foc / q3z, q3y * foc / q3z);
      nFill = nFill + 1;
    }
  } else {
    if (q0z > nz || q1z > nz || q2z > nz || q3z > nz) {
      let ca2 = TAVG[t];
      if (ca2 >= 0) { clipQuad(CT[ca2 + LTK[mdlLT * 8 + d + 1] + mdlFog + 1]); }
    }
  }
}
// the base colour on the whole face, then the texture's rects cut to the window
function winRects(t, kb, fog, tu0, tv0, tu1, tv1) {
  let foc = FOC, tb = TBASE[t];
  if (tb >= 0) {
    fillStop(); goto(q0x * foc / q0z, q0y * foc / q0z); fillColorHex(CT[tb + kb + fog + 1]); fillStart();
    goto(q1x * foc / q1z, q1y * foc / q1z); goto(q2x * foc / q2z, q2y * foc / q2z); goto(q3x * foc / q3z, q3y * foc / q3z);
    nFill = nFill + 1;
  }
  let ex = q1x - q0x, ey = q1y - q0y, ez = q1z - q0z, fx = q3x - q0x, fy = q3y - q0y, fz = q3z - q0z;
  let su = tu1 - tu0, sv = tv1 - tv0, r = TR0[t], re = r + TRN[t], u0 = 0, v0 = 0, u1 = 0, v1 = 0, px = 0, py = 0, pz = 0, nk = kb + fog + 1;
  if (su > 0 && sv > 0) {
    while (r < re) {
      u0 = Math.max(RU0[r] * 2, tu0); u1 = Math.min(RU1[r] * 2, tu1); v0 = Math.max(RV0[r] * 2, tv0); v1 = Math.min(RV1[r] * 2, tv1);
      if (u0 < u1 && v0 < v1) {
        u0 = (u0 - tu0) / su; u1 = (u1 - tu0) / su; v0 = (v0 - tv0) / sv; v1 = (v1 - tv0) / sv;
        fillStop();
        px = q0x + ex * u0 + fx * v0; py = q0y + ey * u0 + fy * v0; pz = q0z + ez * u0 + fz * v0; goto(px * foc / pz, py * foc / pz);
        fillColorHex(CT[RCOL[r] + nk]); fillStart();
        px = q0x + ex * u1 + fx * v0; py = q0y + ey * u1 + fy * v0; pz = q0z + ez * u1 + fz * v0; goto(px * foc / pz, py * foc / pz);
        px = q0x + ex * u1 + fx * v1; py = q0y + ey * u1 + fy * v1; pz = q0z + ez * u1 + fz * v1; goto(px * foc / pz, py * foc / pz);
        px = q0x + ex * u0 + fx * v1; py = q0y + ey * u0 + fy * v1; pz = q0z + ez * u0 + fz * v1; goto(px * foc / pz, py * foc / pz);
        nFill = nFill + 1;
      }
      r = r + 1;
    }
  }
}

// ---------------------------------------------------------------- shaped blocks as pictures (slots, hand)
// The boxes of the model seen from above at the front right (the iso view of the item pictures):
// a point (u, v, w) / 16 goes to x + (u - w) * 0.87 s / 16, y + ((u + w) / 2 - v) ... (s: the size)
let isoX = 0, isoY = 0, isoS = 0, isoK = 0, isoB = 0;
function isoAdd(kk) {
  let dd = 0 - (MBX0[kk] + MBX1[kk]) + (MBZ0[kk] + MBZ1[kk]) - (MBY0[kk] + MBY1[kk]);
  mdlN = mdlN + 1;
  let j = mdlN;
  while (j > 1) { if (MSD[j - 1] < dd) { MSB[j] = MSB[j - 1]; MSD[j] = MSD[j - 1]; j = j - 1; } else { break; } }
  MSB[j] = kk; MSD[j] = dd;
}
function drawIconModel(b, x, y, s, k) {
  isoX = x; isoY = y; isoS = s; isoK = k; isoB = b;
  let m = BMDL[b + 1];
  mdlN = 0;
  let kk = MD0[m], ke = kk + MDN[m];
  while (kk < ke) { isoAdd(kk); kk = kk + 1; }
  // fences, walls and panes: joined both ways along x
  let c = BCONN[b + 1];
  if (c > 0) {
    let am = ARMM[(c - 1) * 4 + 2];
    kk = MD0[am]; while (kk < MD0[am] + MDN[am]) { isoAdd(kk); kk = kk + 1; }
    am = ARMM[(c - 1) * 4 + 4];
    kk = MD0[am]; while (kk < MD0[am] + MDN[am]) { isoAdd(kk); kk = kk + 1; }
  }
  kk = 1;
  while (kk <= mdlN) { isoBox(MSB[kk]); kk = kk + 1; }
}
// the picture point of (u, v, w) (sixteenths): the near top corner (16, 16, 0) at (x, y)
let isx = 0, isy = 0;
function isoPt(u, v, w) {
  let h = isoS * 0.87, q = isoS * 0.5;
  isx = isoX - h + h * (u + w) / 16;
  isy = isoY + q - q * u / 16 + q * w / 16 + (v - 16) * isoS / 16;
}
function isoBox(k) {
  let x0 = MBX0[k], y0 = MBY0[k], z0 = MBZ0[k], x1 = MBX1[k], y1 = MBY1[k], z1 = MBZ1[k], t = MBT[k];
  let ax = 0, ay = 0, bx = 0, by = 0, cx = 0, cy = 0, tt = 0;
  if (MBQ[k] == 1) {
    if (t == 0) { t = BXT[isoB + 1]; }
    isoPt(x0, y1, 8); ax = isx; ay = isy; isoPt(x1, y1, 8); bx = isx; by = isy; isoPt(x0, y0, 8); cx = isx; cy = isy;
    faceRects(t, ax, ay, bx - ax, by - ay, cx - ax, cy - ay, isoK);
  } else {
    // the top (+y), the front left (-z), the front right (+x)
    tt = t; if (tt == 0) { tt = BT6[isoB * 6 + 4]; }
    isoPt(x0, y1, z0); ax = isx; ay = isy; isoPt(x1, y1, z0); bx = isx; by = isy; isoPt(x0, y1, z1); cx = isx; cy = isy;
    faceRects(tt, ax, ay, bx - ax, by - ay, cx - ax, cy - ay, isoK);
    tt = t; if (tt == 0) { tt = BT6[isoB * 6 + 5]; }
    isoPt(x0, y1, z0); ax = isx; ay = isy; isoPt(x1, y1, z0); bx = isx; by = isy; isoPt(x0, y0, z0); cx = isx; cy = isy;
    faceRects(tt, ax, ay, bx - ax, by - ay, cx - ax, cy - ay, Math.max(0, isoK - 5));
    tt = t; if (tt == 0) { tt = BT6[isoB * 6 + 2]; }
    isoPt(x1, y1, z0); ax = isx; ay = isy; isoPt(x1, y1, z1); bx = isx; by = isy; isoPt(x1, y0, z0); cx = isx; cy = isy;
    faceRects(tt, ax, ay, bx - ax, by - ay, cx - ax, cy - ay, Math.max(0, isoK - 9));
  }
}

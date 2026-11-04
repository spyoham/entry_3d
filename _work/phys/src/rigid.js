// ============================================================
// Rigid bodies: six degrees of freedom each (place, orientation as a quaternion,
// velocity, angular momentum in the world). Between contacts the angular momentum
// stays as it is and the orientation follows w = I_world^-1 L (Runge-Kutta 4), so a
// spinning body keeps its energy and its momentum and turns over as a real one does
// (Dzhanibekov). The contact impulses start from those of the last step.
// Contacts: points with a normal and a depth; impulses solved one contact after
// another many times (Coulomb friction in a circle of mu times the normal impulse,
// restitution), and pseudo velocities that only push apart what overlaps (they move
// the bodies but give them no speed, so no energy comes from them).
// ============================================================

// a body: kind 1 sphere (a = radius), 2 box (a b c half sizes); density rho;
// rho 0: it never moves
function rigidAdd(kind, x, y, z, a, b, c, rho, e, mu, cr, cg, cb) {
  let r = 0, m = 0;
  nR = nR + 1;
  r = nR;
  RK[r] = kind; RX[r] = x; RY[r] = y; RZ[r] = z; RA[r] = a; RB[r] = b; RC[r] = c;
  RQW[r] = 1; RQX[r] = 0; RQY[r] = 0; RQZ[r] = 0;
  RVX[r] = 0; RVY[r] = 0; RVZ[r] = 0; RLX[r] = 0; RLY[r] = 0; RLZ[r] = 0; RWX[r] = 0; RWY[r] = 0; RWZ[r] = 0;
  RFX[r] = 0; RFY[r] = 0; RFZ[r] = 0; RTX[r] = 0; RTY[r] = 0; RTZ[r] = 0;
  RE[r] = e; RMU[r] = mu; RCR[r] = cr; RCG[r] = cg; RCB[r] = cb; RNS[r] = 0;
  if (kind == 1) {
    m = rho * 4 / 3 * PI * a * a * a;
    RI1[r] = 0.4 * m * a * a; RI2[r] = RI1[r]; RI3[r] = RI1[r];
    RBR[r] = a;
  } else {
    m = rho * 8 * a * b * c;
    RI1[r] = m / 3 * (b * b + c * c); RI2[r] = m / 3 * (a * a + c * c); RI3[r] = m / 3 * (a * a + b * b);
    RBR[r] = Math.sqrt(a * a + b * b + c * c);
  }
  RMS[r] = m;
  if (rho > 0) {
    RIM[r] = 1 / m; RII1[r] = 1 / RI1[r]; RII2[r] = 1 / RI2[r]; RII3[r] = 1 / RI3[r];
  } else {
    RIM[r] = 0; RII1[r] = 0; RII2[r] = 0; RII3[r] = 0;
  }
  // its mass as felt at its rim (a push there also turns it; a sphere's push is through its middle)
  REM[r] = 0;
  if (rho > 0) {
    REM[r] = m;
    if (kind == 2) { REM[r] = 1 / (RIM[r] + RBR[r] * RBR[r] * Math.max(RII1[r], RII2[r], RII3[r])); }
  }
  rigidMatrix(r);
  RL0[r] = nL + 1;
  rigidMesh(r);
  RL1[r] = nL;
}
// turn body r by deg degrees about axis (ax ay az) (applied after its present turn)
function rigidTurn(r, ax, ay, az, deg) {
  let n = Math.sqrt(ax * ax + ay * ay + az * az), s = sind(deg / 2), c = cosd(deg / 2), w = RQW[r], x = RQX[r], y = RQY[r], z = RQZ[r];
  ax = ax / n * s; ay = ay / n * s; az = az / n * s;
  // q' = (c, a) q
  RQW[r] = c * w - ax * x - ay * y - az * z;
  RQX[r] = c * x + ax * w + ay * z - az * y;
  RQY[r] = c * y + ay * w + az * x - ax * z;
  RQZ[r] = c * z + az * w + ax * y - ay * x;
  rigidMatrix(r);
  rigidMomentum(r);
}
// set the angular velocity of r (world) and from it the momentum
function rigidSpin(r, wx, wy, wz) {
  RWX[r] = wx; RWY[r] = wy; RWZ[r] = wz;
  rigidMomentum(r);
}

// ---------------- contacts ----------------
// (f: which corner or edge pair it is, so that the next step knows it again)
function M_addC(A, B, px, py, pz, nx, ny, nz, d, f) {
  if (nC < CCAP) {
    nC = nC + 1;
    CK[nC] = (A * RCAP + B) * 256 + f;
    CA[nC] = A; CB[nC] = B; CPX[nC] = px; CPY[nC] = py; CPZ[nC] = pz; CNX[nC] = nx; CNY[nC] = ny; CNZ[nC] = nz; CD[nC] = d;
  }
}
// point (px py pz) of body o against box b: a contact if it is in b or within the margin
function pointBox(o, b, px, py, pz, f) {
  let qx = px - RX[b], qy = py - RY[b], qz = pz - RZ[b], lx = 0, ly = 0, lz = 0, ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, d = 0, sg = 1, nx = 0, ny = 0, nz = 0;
  lx = R11[b] * qx + R21[b] * qy + R31[b] * qz;
  ly = R12[b] * qx + R22[b] * qy + R32[b] * qz;
  lz = R13[b] * qx + R23[b] * qy + R33[b] * qz;
  ax = Math.abs(lx) - RA[b]; ay = Math.abs(ly) - RB[b]; az = Math.abs(lz) - RC[b];
  if (ax < MARGIN && ay < MARGIN && az < MARGIN) {
    if (ax <= 0 && ay <= 0 && az <= 0) {
      // inside: out through the nearest face
      if (ax > ay && ax > az) {
        d = 0 - ax; if (lx < 0) { sg = -1; }
        nx = R11[b] * sg; ny = R21[b] * sg; nz = R31[b] * sg;
      } else {
        if (ay > az) {
          d = 0 - ay; if (ly < 0) { sg = -1; }
          nx = R12[b] * sg; ny = R22[b] * sg; nz = R32[b] * sg;
        } else {
          d = 0 - az; if (lz < 0) { sg = -1; }
          nx = R13[b] * sg; ny = R23[b] * sg; nz = R33[b] * sg;
        }
      }
      M_addC(o, b, px, py, pz, nx, ny, nz, d, f);
      pairHits = pairHits + 1;
    } else {
      // outside, near: from the nearest point of the box
      cx = 0; cy = 0; cz = 0;
      if (ax > 0) { cx = ax; if (lx < 0) { cx = 0 - ax; } }
      if (ay > 0) { cy = ay; if (ly < 0) { cy = 0 - ay; } }
      if (az > 0) { cz = az; if (lz < 0) { cz = 0 - az; } }
      d = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (d < MARGIN) {
        cx = cx / d; cy = cy / d; cz = cz / d;
        nx = R11[b] * cx + R12[b] * cy + R13[b] * cz;
        ny = R21[b] * cx + R22[b] * cy + R23[b] * cz;
        nz = R31[b] * cx + R32[b] * cy + R33[b] * cz;
        M_addC(o, b, px, py, pz, nx, ny, nz, 0 - d, f);
        pairHits = pairHits + 1;
      }
    }
  }
}
let pairHits = 0;

// the corners of box r into KX.. from place k0 + 1
function boxCorners(r, k0) {
  let k = 1, x = 0, y = 0, z = 0;
  for (const _ of rep(8)) {
    x = SGX[k] * RA[r]; y = SGY[k] * RB[r]; z = SGZ[k] * RC[r];
    KX[k0 + k] = RX[r] + R11[r] * x + R12[r] * y + R13[r] * z;
    KY[k0 + k] = RY[r] + R21[r] * x + R22[r] * y + R23[r] * z;
    KZ[k0 + k] = RZ[r] + R31[r] * x + R32[r] * y + R33[r] * z;
    k = k + 1;
  }
}

function sphereBox(s, b) {
  let qx = RX[s] - RX[b], qy = RY[s] - RY[b], qz = RZ[s] - RZ[b], lx = 0, ly = 0, lz = 0, cx = 0, cy = 0, cz = 0, ax = 0, ay = 0, az = 0, d = 0, sg = 1, nx = 0, ny = 0, nz = 0;
  lx = R11[b] * qx + R21[b] * qy + R31[b] * qz;
  ly = R12[b] * qx + R22[b] * qy + R32[b] * qz;
  lz = R13[b] * qx + R23[b] * qy + R33[b] * qz;
  ax = Math.abs(lx) - RA[b]; ay = Math.abs(ly) - RB[b]; az = Math.abs(lz) - RC[b];
  if (ax <= 0 && ay <= 0 && az <= 0) {
    // the centre is in the box
    if (ax > ay && ax > az) {
      d = RA[s] - ax; if (lx < 0) { sg = -1; }
      nx = R11[b] * sg; ny = R21[b] * sg; nz = R31[b] * sg;
    } else {
      if (ay > az) {
        d = RA[s] - ay; if (ly < 0) { sg = -1; }
        nx = R12[b] * sg; ny = R22[b] * sg; nz = R32[b] * sg;
      } else {
        d = RA[s] - az; if (lz < 0) { sg = -1; }
        nx = R13[b] * sg; ny = R23[b] * sg; nz = R33[b] * sg;
      }
    }
    M_addC(s, b, RX[s] - nx * RA[s], RY[s] - ny * RA[s], RZ[s] - nz * RA[s], nx, ny, nz, d, 0);
  } else {
    if (ax > 0) { cx = ax; if (lx < 0) { cx = 0 - ax; } }
    if (ay > 0) { cy = ay; if (ly < 0) { cy = 0 - ay; } }
    if (az > 0) { cz = az; if (lz < 0) { cz = 0 - az; } }
    d = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (d < RA[s] + MARGIN) {
      cx = cx / d; cy = cy / d; cz = cz / d;
      nx = R11[b] * cx + R12[b] * cy + R13[b] * cz;
      ny = R21[b] * cx + R22[b] * cy + R23[b] * cz;
      nz = R31[b] * cx + R32[b] * cy + R33[b] * cz;
      M_addC(s, b, RX[s] - nx * RA[s], RY[s] - ny * RA[s], RZ[s] - nz * RA[s], nx, ny, nz, RA[s] - d, 0);
    }
  }
}

// edges of box a (corners KX 1..8) against edges of box b (9..16): where two edges
// cross inside both boxes (the case corners miss)
function edgeEdge(a, b) {
  let i = 1, j = 1, p1x = 0, p1y = 0, p1z = 0, d1x = 0, d1y = 0, d1z = 0, p2x = 0, p2y = 0, p2z = 0, d2x = 0, d2y = 0, d2z = 0;
  let rx = 0, ry = 0, rz = 0, aa = 0, ee = 0, ff = 0, cc = 0, bb = 0, den = 0, s = 0, t = 0, nx = 0, ny = 0, nz = 0, n = 0, d = 0;
  let ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, ox = RX[a] - RX[b], oy = RY[a] - RY[b], oz = RZ[a] - RZ[b], lx = 0, ly = 0, lz = 0;
  for (const _ of rep(12)) {
    p1x = KX[EGA[i]]; p1y = KY[EGA[i]]; p1z = KZ[EGA[i]];
    d1x = KX[EGB[i]] - p1x; d1y = KY[EGB[i]] - p1y; d1z = KZ[EGB[i]] - p1z;
    aa = d1x * d1x + d1y * d1y + d1z * d1z;
    j = 1;
    for (const _ of rep(12)) {
      p2x = KX[EGA[j] + 8]; p2y = KY[EGA[j] + 8]; p2z = KZ[EGA[j] + 8];
      d2x = KX[EGB[j] + 8] - p2x; d2y = KY[EGB[j] + 8] - p2y; d2z = KZ[EGB[j] + 8] - p2z;
      rx = p1x - p2x; ry = p1y - p2y; rz = p1z - p2z;
      ee = d2x * d2x + d2y * d2y + d2z * d2z;
      bb = d1x * d2x + d1y * d2y + d1z * d2z;
      den = aa * ee - bb * bb;
      if (den > 0.000001 * aa * ee) {
        ff = d2x * rx + d2y * ry + d2z * rz;
        cc = d1x * rx + d1y * ry + d1z * rz;
        s = (bb * ff - cc * ee) / den;
        t = (bb * s + ff) / ee;
        if (s > 0.001 && s < 0.999 && t > 0.001 && t < 0.999) {
          ax = p1x + s * d1x; ay = p1y + s * d1y; az = p1z + s * d1z;
          bx = p2x + t * d2x; by = p2y + t * d2y; bz = p2z + t * d2z;
          nx = d1y * d2z - d1z * d2y; ny = d1z * d2x - d1x * d2z; nz = d1x * d2y - d1y * d2x;
          n = Math.sqrt(nx * nx + ny * ny + nz * nz);
          nx = nx / n; ny = ny / n; nz = nz / n;
          if (nx * ox + ny * oy + nz * oz < 0) { nx = 0 - nx; ny = 0 - ny; nz = 0 - nz; }
          d = (bx - ax) * nx + (by - ay) * ny + (bz - az) * nz;
          if (d > 0 - MARGIN) {
            // the point of a's edge must be in b, and that of b's edge in a (with the margin)
            lx = ax - RX[b]; ly = ay - RY[b]; lz = az - RZ[b];
            if (Math.abs(R11[b] * lx + R21[b] * ly + R31[b] * lz) < RA[b] + MARGIN && Math.abs(R12[b] * lx + R22[b] * ly + R32[b] * lz) < RB[b] + MARGIN && Math.abs(R13[b] * lx + R23[b] * ly + R33[b] * lz) < RC[b] + MARGIN) {
              lx = bx - RX[a]; ly = by - RY[a]; lz = bz - RZ[a];
              if (Math.abs(R11[a] * lx + R21[a] * ly + R31[a] * lz) < RA[a] + MARGIN && Math.abs(R12[a] * lx + R22[a] * ly + R32[a] * lz) < RB[a] + MARGIN && Math.abs(R13[a] * lx + R23[a] * ly + R33[a] * lz) < RC[a] + MARGIN) {
                M_addC(a, b, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, nx, ny, nz, d, 16 + i * 12 + j);
              }
            }
          }
        }
      }
      j = j + 1;
    }
    i = i + 1;
  }
}

function collide() {
  let a = 2, b = 0, k = 0, d = 0, dx = 0, dy = 0, dz = 0, nx = 0, ny = 0, nz = 0;
  nC = 0;
  for (const _ of rep(nR - 1)) {
    if (RIM[a] > 0) {
      // the ground
      if (RK[a] == 1) {
        d = RA[a] - RY[a];
        if (d > 0 - MARGIN) { M_addC(a, 1, RX[a], 0 - d / 2, RZ[a], 0, 1, 0, d, 0); }
      } else {
        if (RY[a] - RBR[a] < MARGIN) {
          boxCorners(a, 0);
          k = 1;
          for (const _ of rep(8)) {
            if (KY[k] < MARGIN) { M_addC(a, 1, KX[k], KY[k], KZ[k], 0, 1, 0, 0 - KY[k], k); }
            k = k + 1;
          }
        }
      }
    }
    b = a + 1;
    for (const _ of rep(nR - a)) {
      if (RIM[a] > 0 || RIM[b] > 0) {
        dx = RX[a] - RX[b]; dy = RY[a] - RY[b]; dz = RZ[a] - RZ[b];
        d = RBR[a] + RBR[b] + MARGIN;
        if (dx * dx + dy * dy + dz * dz < d * d) {
          if (RK[a] == 1 && RK[b] == 1) {
            d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            nx = dx / d; ny = dy / d; nz = dz / d;
            d = RA[a] + RA[b] - d;
            M_addC(a, b, RX[a] - nx * (RA[a] - d / 2), RY[a] - ny * (RA[a] - d / 2), RZ[a] - nz * (RA[a] - d / 2), nx, ny, nz, d, 0);
          } else {
            if (RK[a] == 1) { sphereBox(a, b); }
            else {
              if (RK[b] == 1) { sphereBox(b, a); }
              else {
                // box and box: the corners of each in the other, then crossing edges
                boxCorners(a, 0);
                boxCorners(b, 8);
                pairHits = 0;
                k = 1;
                for (const _ of rep(8)) { pointBox(a, b, KX[k], KY[k], KZ[k], k); k = k + 1; }
                for (const _ of rep(8)) { pointBox(b, a, KX[k], KY[k], KZ[k], k); k = k + 1; }
                if (pairHits == 0) { edgeEdge(a, b); }
              }
            }
          }
        }
      }
      b = b + 1;
    }
    a = a + 1;
  }
  if (nC > nCMax) { nCMax = nC; }
}

// velocity of body r at arm (x y z) along (dx dy dz)
function M_relN(c) {
  a = CA[c]; b = CB[c];
  vr = (RVX[a] + RWY[a] * CAZ[c] - RWZ[a] * CAY[c] - RVX[b] - RWY[b] * CBZ[c] + RWZ[b] * CBY[c]) * ex
     + (RVY[a] + RWZ[a] * CAX[c] - RWX[a] * CAZ[c] - RVY[b] - RWZ[b] * CBX[c] + RWX[b] * CBZ[c]) * ey
     + (RVZ[a] + RWX[a] * CAY[c] - RWY[a] * CAX[c] - RVZ[b] - RWX[b] * CBY[c] + RWY[b] * CBX[c]) * ez;
}
// the arms, tangents, angular answers and effective masses of contact c
function M_prep(c, h) {
  a = CA[c]; b = CB[c];
  ax = CPX[c] - RX[a]; ay = CPY[c] - RY[a]; az = CPZ[c] - RZ[a];
  bx = CPX[c] - RX[b]; by = CPY[c] - RY[b]; bz = CPZ[c] - RZ[b];
  CAX[c] = ax; CAY[c] = ay; CAZ[c] = az; CBX[c] = bx; CBY[c] = by; CBZ[c] = bz;
  nx = CNX[c]; ny = CNY[c]; nz = CNZ[c];
  // tangents: n x (the axis least along n), and n x t1
  if (Math.abs(nx) < 0.57) { t1x = 0; t1y = nz; t1z = 0 - ny; }
  else { t1x = 0 - nz; t1y = 0; t1z = nx; }
  q = Math.sqrt(t1x * t1x + t1y * t1y + t1z * t1z);
  t1x = t1x / q; t1y = t1y / q; t1z = t1z / q;
  t2x = ny * t1z - nz * t1y; t2y = nz * t1x - nx * t1z; t2z = nx * t1y - ny * t1x;
  CT1X[c] = t1x; CT1Y[c] = t1y; CT1Z[c] = t1z; CT2X[c] = t2x; CT2Y[c] = t2y; CT2Z[c] = t2z;
  ims = RIM[a] + RIM[b];
  // n
  rx = ay * nz - az * ny; ry = az * nx - ax * nz; rz = ax * ny - ay * nx;
  M_iinv(a, rx, ry, rz, ox, oy, oz);
  CANX[c] = ox; CANY[c] = oy; CANZ[c] = oz;
  k = ims + rx * ox + ry * oy + rz * oz;
  rx = by * nz - bz * ny; ry = bz * nx - bx * nz; rz = bx * ny - by * nx;
  M_iinv(b, rx, ry, rz, ox, oy, oz);
  CBNX[c] = ox; CBNY[c] = oy; CBNZ[c] = oz;
  CKN[c] = 1 / (k + rx * ox + ry * oy + rz * oz);
  // t1
  rx = ay * t1z - az * t1y; ry = az * t1x - ax * t1z; rz = ax * t1y - ay * t1x;
  M_iinv(a, rx, ry, rz, ox, oy, oz);
  CA1X[c] = ox; CA1Y[c] = oy; CA1Z[c] = oz;
  k = ims + rx * ox + ry * oy + rz * oz;
  rx = by * t1z - bz * t1y; ry = bz * t1x - bx * t1z; rz = bx * t1y - by * t1x;
  M_iinv(b, rx, ry, rz, ox, oy, oz);
  CB1X[c] = ox; CB1Y[c] = oy; CB1Z[c] = oz;
  CKT1[c] = 1 / (k + rx * ox + ry * oy + rz * oz);
  // t2
  rx = ay * t2z - az * t2y; ry = az * t2x - ax * t2z; rz = ax * t2y - ay * t2x;
  M_iinv(a, rx, ry, rz, ox, oy, oz);
  CA2X[c] = ox; CA2Y[c] = oy; CA2Z[c] = oz;
  k = ims + rx * ox + ry * oy + rz * oz;
  rx = by * t2z - bz * t2y; ry = bz * t2x - bx * t2z; rz = bx * t2y - by * t2x;
  M_iinv(b, rx, ry, rz, ox, oy, oz);
  CB2X[c] = ox; CB2Y[c] = oy; CB2Z[c] = oz;
  CKT2[c] = 1 / (k + rx * ox + ry * oy + rz * oz);
  // the wanted normal speed: bounce back e times the speed it comes in with (if fast
  // enough to bounce); a gap may close within the step but no more
  ex = nx; ey = ny; ez = nz;
  M_relN(c);
  q = 0;
  if (vr < 0 - vth) { q = 0 - Math.min(RE[a], RE[b]) * vr; }
  if (CD[c] < 0) { q = CD[c] / h; }
  CVT[c] = q;
  CMU[c] = Math.min(RMU[a], RMU[b]);
  CLN[c] = 0; CLT1[c] = 0; CLT2[c] = 0; CLP[c] = 0;
  // the same contact in the last step (most often at the same place in the list):
  // start from its impulses
  q = 0;
  if (c <= nP) { if (PK[c] == CK[c]) { q = c; } }
  if (q == 0) {
    k = Math.max(1, c - 6);
    for (const _ of rep(Math.max(0, Math.min(nP, c + 6) - k + 1))) { if (PK[k] == CK[c]) { q = k; } k = k + 1; }
  }
  if (q > 0) { CLN[c] = PLN[q]; CLT1[c] = PLT1[q]; CLT2[c] = PLT2[q]; }
}

// impulse of size l along (dx dy dz) at contact c with angular answers A* B*
function M_push(l, dx, dy, dz, AX, AY, AZ, BX, BY, BZ) {
  RVX[a] = RVX[a] + RIM[a] * l * dx; RVY[a] = RVY[a] + RIM[a] * l * dy; RVZ[a] = RVZ[a] + RIM[a] * l * dz;
  RWX[a] = RWX[a] + l * AX[c]; RWY[a] = RWY[a] + l * AY[c]; RWZ[a] = RWZ[a] + l * AZ[c];
  RVX[b] = RVX[b] - RIM[b] * l * dx; RVY[b] = RVY[b] - RIM[b] * l * dy; RVZ[b] = RVZ[b] - RIM[b] * l * dz;
  RWX[b] = RWX[b] - l * BX[c]; RWY[b] = RWY[b] - l * BY[c]; RWZ[b] = RWZ[b] - l * BZ[c];
}
function M_ppush(l, dx, dy, dz, AX, AY, AZ, BX, BY, BZ) {
  RPX[a] = RPX[a] + RIM[a] * l * dx; RPY[a] = RPY[a] + RIM[a] * l * dy; RPZ[a] = RPZ[a] + RIM[a] * l * dz;
  RPWX[a] = RPWX[a] + l * AX[c]; RPWY[a] = RPWY[a] + l * AY[c]; RPWZ[a] = RPWZ[a] + l * AZ[c];
  RPX[b] = RPX[b] - RIM[b] * l * dx; RPY[b] = RPY[b] - RIM[b] * l * dy; RPZ[b] = RPZ[b] - RIM[b] * l * dz;
  RPWX[b] = RPWX[b] - l * BX[c]; RPWY[b] = RPWY[b] - l * BY[c]; RPWZ[b] = RPWZ[b] - l * BZ[c];
}

function solveContacts(h, iters, tol) {
  let c = 1, it = 0, a = 0, b = 0, ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, nx = 0, ny = 0, nz = 0, t1x = 0, t1y = 0, t1z = 0, t2x = 0, t2y = 0, t2z = 0;
  let dv = 0, q = 0, ims = 0, rx = 0, ry = 0, rz = 0, ox = 0, oy = 0, oz = 0, k = 0, ex = 0, ey = 0, ez = 0, vr = 0, l = 0, l0 = 0, l1 = 0, l2 = 0, lim = 0, iu1 = 0, iu2 = 0, iu3 = 0;
  for (const _ of rep(nC)) { M_prep(c, h); c = c + 1; }
  // the impulses carried over, given at once
  c = 1;
  for (const _ of rep(nC)) {
    a = CA[c]; b = CB[c];
    M_push(CLN[c], CNX[c], CNY[c], CNZ[c], CANX, CANY, CANZ, CBNX, CBNY, CBNZ);
    M_push(CLT1[c], CT1X[c], CT1Y[c], CT1Z[c], CA1X, CA1Y, CA1Z, CB1X, CB1Y, CB1Z);
    M_push(CLT2[c], CT2X[c], CT2Y[c], CT2Z[c], CA2X, CA2Y, CA2Z, CB2X, CB2Y, CB2Z);
    c = c + 1;
  }
  // velocities, until no impulse changes a speed by more than tol
  it = 0; dv = 1;
  while (it < iters && dv > tol) {
    it = it + 1; dv = 0;
    c = 1;
    for (const _ of rep(nC)) {
      a = CA[c]; b = CB[c];
      ex = CNX[c]; ey = CNY[c]; ez = CNZ[c];
      M_relN(c);
      l0 = CLN[c];
      l = l0 + (CVT[c] - vr) * CKN[c];
      if (l < 0) { l = 0; }
      CLN[c] = l;
      l = l - l0;
      q = Math.abs(l) / CKN[c];
      if (q > dv) { dv = q; }
      M_push(l, ex, ey, ez, CANX, CANY, CANZ, CBNX, CBNY, CBNZ);
      // friction: both tangents, then into the circle mu * normal impulse
      lim = CMU[c] * CLN[c];
      ex = CT1X[c]; ey = CT1Y[c]; ez = CT1Z[c];
      M_relN(c);
      l1 = CLT1[c] - vr * CKT1[c];
      ex = CT2X[c]; ey = CT2Y[c]; ez = CT2Z[c];
      M_relN(c);
      l2 = CLT2[c] - vr * CKT2[c];
      q = l1 * l1 + l2 * l2;
      if (q > lim * lim) { q = lim / Math.sqrt(q); l1 = l1 * q; l2 = l2 * q; }
      l = l1 - CLT1[c]; CLT1[c] = l1;
      q = Math.abs(l) / CKT1[c];
      if (q > dv) { dv = q; }
      M_push(l, CT1X[c], CT1Y[c], CT1Z[c], CA1X, CA1Y, CA1Z, CB1X, CB1Y, CB1Z);
      l = l2 - CLT2[c]; CLT2[c] = l2;
      M_push(l, CT2X[c], CT2Y[c], CT2Z[c], CA2X, CA2Y, CA2Z, CB2X, CB2Y, CB2Z);
      c = c + 1;
    }
  }
  itSum = itSum + it;
  // what the next step starts from
  c = 1;
  for (const _ of rep(nC)) { PK[c] = CK[c]; PLN[c] = CLN[c]; PLT1[c] = CLT1[c]; PLT2[c] = CLT2[c]; c = c + 1; }
  nP = nC;
  // overlaps: pseudo velocities (they move, they do not stay)
  for (const _ of rep(Math.min(iters, it + 2))) {
    c = 1;
    for (const _ of rep(nC)) {
      q = CD[c] - SLOP;
      if (q > 0 || CLP[c] > 0) {
        a = CA[c]; b = CB[c];
        ex = CNX[c]; ey = CNY[c]; ez = CNZ[c];
        vr = (RPX[a] + RPWY[a] * CAZ[c] - RPWZ[a] * CAY[c] - RPX[b] - RPWY[b] * CBZ[c] + RPWZ[b] * CBY[c]) * ex
           + (RPY[a] + RPWZ[a] * CAX[c] - RPWX[a] * CAZ[c] - RPY[b] - RPWZ[b] * CBX[c] + RPWX[b] * CBZ[c]) * ey
           + (RPZ[a] + RPWX[a] * CAY[c] - RPWY[a] * CAX[c] - RPZ[b] - RPWX[b] * CBY[c] + RPWY[b] * CBX[c]) * ez;
        if (q < 0) { q = 0; }
        l0 = CLP[c];
        l = l0 + (BAUM * q / h - vr) * CKN[c];
        if (l < 0) { l = 0; }
        CLP[c] = l;
        l = l - l0;
        M_ppush(l, ex, ey, ez, CANX, CANY, CANZ, CBNX, CBNY, CBNZ);
      }
      c = c + 1;
    }
  }
}

// dq/dt = (0, w) q / 2 at orientation (qw qx qy qz), w = R I^-1 R^T L + pseudo
function M_qdot(qw, qx, qy, qz, dw, dx, dy, dz) {
  nq = Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz);
  sw = qw / nq; sx = qx / nq; sy = qy / nq; sz = qz / nq;
  r11 = 1 - 2 * (sy * sy + sz * sz); r12 = 2 * (sx * sy - sw * sz); r13 = 2 * (sx * sz + sw * sy);
  r21 = 2 * (sx * sy + sw * sz); r22 = 1 - 2 * (sx * sx + sz * sz); r23 = 2 * (sy * sz - sw * sx);
  r31 = 2 * (sx * sz - sw * sy); r32 = 2 * (sy * sz + sw * sx); r33 = 1 - 2 * (sx * sx + sy * sy);
  iu1 = (r11 * lx + r21 * ly + r31 * lz) * i1;
  iu2 = (r12 * lx + r22 * ly + r32 * lz) * i2;
  iu3 = (r13 * lx + r23 * ly + r33 * lz) * i3;
  wx = r11 * iu1 + r12 * iu2 + r13 * iu3 + pwx;
  wy = r21 * iu1 + r22 * iu2 + r23 * iu3 + pwy;
  wz = r31 * iu1 + r32 * iu2 + r33 * iu3 + pwz;
  dw = -0.5 * (wx * qx + wy * qy + wz * qz);
  dx = 0.5 * (qw * wx + wy * qz - wz * qy);
  dy = 0.5 * (qw * wy + wz * qx - wx * qz);
  dz = 0.5 * (qw * wz + wx * qy - wy * qx);
}

// one step of all rigid bodies: forces, contacts (at most iters rounds, fewer once no
// impulse changes a speed by more than tol), then the motion
function rigidStep(h, iters, tol) {
  let r = 2, im = 0, g = grav * h, lx = 0, ly = 0, lz = 0, i1 = 0, i2 = 0, i3 = 0, pwx = 0, pwy = 0, pwz = 0;
  let qw = 0, qx = 0, qy = 0, qz = 0, nq = 0, sw = 0, sx = 0, sy = 0, sz = 0, wx = 0, wy = 0, wz = 0, iu1 = 0, iu2 = 0, iu3 = 0;
  let r11 = 0, r12 = 0, r13 = 0, r21 = 0, r22 = 0, r23 = 0, r31 = 0, r32 = 0, r33 = 0;
  let k1w = 0, k1x = 0, k1y = 0, k1z = 0, k2w = 0, k2x = 0, k2y = 0, k2z = 0, k3w = 0, k3x = 0, k3y = 0, k3z = 0, k4w = 0, k4x = 0, k4y = 0, k4z = 0;
  for (const _ of rep(nR - 1)) {
    im = RIM[r];
    if (im > 0) {
      RVX[r] = RVX[r] + h * im * RFX[r]; RVY[r] = RVY[r] + h * im * RFY[r] - g; RVZ[r] = RVZ[r] + h * im * RFZ[r];
      RLX[r] = RLX[r] + h * RTX[r]; RLY[r] = RLY[r] + h * RTY[r]; RLZ[r] = RLZ[r] + h * RTZ[r];
      rigidOmega(r);
    }
    // (how many soft contacts it had, for the fast mode's next step)
    RKN[r] = Math.max(1, RKC[r]); RKC[r] = 0;
    RFX[r] = 0; RFY[r] = 0; RFZ[r] = 0; RTX[r] = 0; RTY[r] = 0; RTZ[r] = 0;
    RPX[r] = 0; RPY[r] = 0; RPZ[r] = 0; RPWX[r] = 0; RPWY[r] = 0; RPWZ[r] = 0;
    r = r + 1;
  }
  collide();
  if (nC > 0) { solveContacts(h, iters, tol); } else { nP = 0; }
  r = 2;
  for (const _ of rep(nR - 1)) {
    if (RIM[r] > 0) {
      // the contacts changed w: the momentum to match, at this orientation
      rigidMomentum(r);
      RX[r] = RX[r] + h * (RVX[r] + RPX[r]); RY[r] = RY[r] + h * (RVY[r] + RPY[r]); RZ[r] = RZ[r] + h * (RVZ[r] + RPZ[r]);
      lx = RLX[r]; ly = RLY[r]; lz = RLZ[r]; i1 = RII1[r]; i2 = RII2[r]; i3 = RII3[r];
      pwx = RPWX[r]; pwy = RPWY[r]; pwz = RPWZ[r];
      qw = RQW[r]; qx = RQX[r]; qy = RQY[r]; qz = RQZ[r];
      M_qdot(qw, qx, qy, qz, k1w, k1x, k1y, k1z);
      M_qdot(qw + h / 2 * k1w, qx + h / 2 * k1x, qy + h / 2 * k1y, qz + h / 2 * k1z, k2w, k2x, k2y, k2z);
      M_qdot(qw + h / 2 * k2w, qx + h / 2 * k2x, qy + h / 2 * k2y, qz + h / 2 * k2z, k3w, k3x, k3y, k3z);
      M_qdot(qw + h * k3w, qx + h * k3x, qy + h * k3y, qz + h * k3z, k4w, k4x, k4y, k4z);
      RQW[r] = qw + h / 6 * (k1w + 2 * k2w + 2 * k3w + k4w);
      RQX[r] = qx + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x);
      RQY[r] = qy + h / 6 * (k1y + 2 * k2y + 2 * k3y + k4y);
      RQZ[r] = qz + h / 6 * (k1z + 2 * k2z + 2 * k3z + k4z);
      rigidMatrix(r);
      rigidOmega(r);
    }
    r = r + 1;
  }
}

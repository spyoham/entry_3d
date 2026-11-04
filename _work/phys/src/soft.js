// ============================================================
// Soft bodies: linear tetrahedra, Stable Neo-Hookean material
//   psi(F) = mu/2 (tr(F^T F) - 3) + lambda/2 (det F - alpha)^2,  alpha = 1 + mu / lambda
//   (Smith, de Goes, Kim 2018; with lambda = lame lambda + mu it is linear elasticity
//   for small strains and stays well behaved when squashed or turned inside out)
//
// Accurate mode: the forces of that energy, explicit leapfrog (velocity Verlet) with a
//   step under the stability limit of the mesh (wave speed and the smallest tetrahedron).
//   Symplectic: no numerical damping, energy is kept.
// Fast mode: XPBD with the two constraints of the same material (Macklin, Mueller 2021),
//   a few substeps a frame, stable at any step.
// ============================================================
let SRC = [], nSRC = 0, stepId = 0;

// a tetrahedron of corners a b c d with material mu, la (SNH), rho, eta (viscosity)
function addTet(a, b, c, d, mu, la, rho, eta) {
  let e1x = PX[b] - PX[a], e1y = PY[b] - PY[a], e1z = PZ[b] - PZ[a];
  let e2x = PX[c] - PX[a], e2y = PY[c] - PY[a], e2z = PZ[c] - PZ[a];
  let e3x = PX[d] - PX[a], e3y = PY[d] - PY[a], e3z = PZ[d] - PZ[a];
  let det = 0, t = 0, k = 0, m = 0, ar = 0, amax = 0, alt = 0;
  det = e1x * (e2y * e3z - e2z * e3y) - e2x * (e1y * e3z - e1z * e3y) + e3x * (e1y * e2z - e1z * e2y);
  if (det < 0) {
    // swap c and d: the corners turn the other way
    t = c; c = d; d = t;
    t = e2x; e2x = e3x; e3x = t; t = e2y; e2y = e3y; e3y = t; t = e2z; e2z = e3z; e3z = t;
    det = 0 - det;
  }
  nT = nT + 1;
  k = nT;
  TA[k] = a; TB[k] = b; TC[k] = c; TD[k] = d;
  // Dm = [e1 e2 e3] (columns); its inverse is the cofactor matrix over det, transposed
  M11[k] = (e2y * e3z - e3y * e2z) / det; M12[k] = (e3x * e2z - e2x * e3z) / det; M13[k] = (e2x * e3y - e3x * e2y) / det;
  M21[k] = (e3y * e1z - e1y * e3z) / det; M22[k] = (e1x * e3z - e3x * e1z) / det; M23[k] = (e3x * e1y - e1x * e3y) / det;
  M31[k] = (e1y * e2z - e2y * e1z) / det; M32[k] = (e2x * e1z - e1x * e2z) / det; M33[k] = (e1x * e2y - e2x * e1y) / det;
  TV[k] = det / 6;
  TMU[k] = mu; TLA[k] = la; TAL[k] = 1 + mu / la; TET[k] = eta;
  TQW[k] = 1; TQX[k] = 0; TQY[k] = 0; TQZ[k] = 0;
  m = rho * det / 24;
  NMS[a] = NMS[a] + m; NMS[b] = NMS[b] + m; NMS[c] = NMS[c] + m; NMS[d] = NMS[d] + m;
  // the smallest height of the tetrahedron (3 V / largest face) for the step limit
  amax = sqr(e1y * e2z - e1z * e2y) + sqr(e1z * e2x - e1x * e2z) + sqr(e1x * e2y - e1y * e2x);
  ar = sqr(e1y * e3z - e1z * e3y) + sqr(e1z * e3x - e1x * e3z) + sqr(e1x * e3y - e1y * e3x);
  if (ar > amax) { amax = ar; }
  ar = sqr(e2y * e3z - e2z * e3y) + sqr(e2z * e3x - e2x * e3z) + sqr(e2x * e3y - e2y * e3x);
  if (ar > amax) { amax = ar; }
  e1x = e2x - e1x; e1y = e2y - e1y; e1z = e2z - e1z;
  e2x = e3x - PX[b] + PX[a]; e2y = e3y - PY[b] + PY[a]; e2z = e3z - PZ[b] + PZ[a];
  ar = sqr(e1y * e2z - e1z * e2y) + sqr(e1z * e2x - e1x * e2z) + sqr(e1x * e2y - e1y * e2x);
  if (ar > amax) { amax = ar; }
  alt = det / Math.sqrt(amax);
  if (alt < tetAlt) { tetAlt = alt; }
}
let tetAlt = 0;

// node of grid place (i, j, k) in a box of the soft body that starts at node n0
function M_gnode(v, i, j, k) {
  v = n0 + i + (nx + 1) * (j + (ny + 1) * k);
}

// A soft box: lx ly lz big, nx ny nz cells (five tetrahedra each), centre (cx cy cz),
// turned ang degrees about z then angx about x. Material: Young's modulus E, Poisson's ratio nu,
// density rho, viscosity eta (0: none), friction mu. pin 1: the face x = min is held still.
// ball (0..1): how far the grid is bent from the box into a ball of diameter lx (the cube's
// points moved onto spheres: x sqrt(1 - y^2/2 - z^2/2 + y^2 z^2/3) and so on, x y z in -1..1;
// all the way gives flat tetrahedra at the corners, and so short steps)
function softBox(cx, cy, cz, lx, ly, lz, nx, ny, nz, E, nu, rho, eta, mu, cr, cg, cb, ang, angx, pin, ball) {
  let b = 0, n0 = nN + 1, i = 0, j = 0, k = 0, x = 0, y = 0, z = 0, t = 0, cs = cosd(ang), sn = sind(ang), cs2 = cosd(angx), sn2 = sind(angx);
  let muL = E / (2 * (1 + nu)), laL = E * nu / ((1 + nu) * (1 - 2 * nu)), mu2 = 0, la2 = 0, c = 0, h = 0, m = 0;
  let v0 = 0, v1 = 0, v2 = 0, v3 = 0, v4 = 0, v5 = 0, v6 = 0, v7 = 0, u = 0, v = 0, w = 0;
  mu2 = muL; la2 = laL + muL;
  nSB = nSB + 1;
  b = nSB;
  SBN0[b] = n0; SBT0[b] = nT + 1; SBS0[b] = nSV + 1; SBF0[b] = nF + 1;
  SBMU[b] = mu; SBE[b] = E; SBNU[b] = nu; SBRHO[b] = rho;
  k = 0;
  while (k <= nz) {
    j = 0;
    while (j <= ny) {
      i = 0;
      while (i <= nx) {
        x = lx * (i / nx - 0.5); y = ly * (j / ny - 0.5); z = lz * (k / nz - 0.5);
        if (ball > 0) {
          u = 2 * i / nx - 1; v = 2 * j / ny - 1; w = 2 * k / nz - 1;
          x = x + ball * (lx / 2 * u * Math.sqrt(1 - v * v / 2 - w * w / 2 + v * v * w * w / 3) - x);
          y = y + ball * (lx / 2 * v * Math.sqrt(1 - w * w / 2 - u * u / 2 + w * w * u * u / 3) - y);
          z = z + ball * (lx / 2 * w * Math.sqrt(1 - u * u / 2 - v * v / 2 + u * u * v * v / 3) - z);
        }
        // about z, then about x
        t = x * cs - y * sn; y = x * sn + y * cs; x = t;
        t = y * cs2 - z * sn2; z = y * sn2 + z * cs2; y = t;
        nN = nN + 1;
        PX[nN] = cx + x; PY[nN] = cy + y; PZ[nN] = cz + z;
        VX[nN] = 0; VY[nN] = 0; VZ[nN] = 0; FX[nN] = 0; FY[nN] = 0; FZ[nN] = 0;
        NMS[nN] = 0; NIM[nN] = 1; NCB[nN] = 0; NPD[nN] = 0; DVX[nN] = 0; DVY[nN] = 0; DVZ[nN] = 0; NCS[nN] = 0; UX[nN] = 0; UY[nN] = 0; UZ[nN] = 0; NSB[nN] = b;
        if (pin == 1 && i == 0) { NIM[nN] = 0; }
        if (i == 0 || i == nx || j == 0 || j == ny || k == 0 || k == nz) {
          if (NIM[nN] > 0) { nSV = nSV + 1; SVN[nSV] = nN; }
        }
        i = i + 1;
      }
      j = j + 1;
    }
    k = k + 1;
  }
  SBN1[b] = nN; SBS1[b] = nSV;
  tetAlt = 1000000;
  k = 0;
  while (k < nz) {
    j = 0;
    while (j < ny) {
      i = 0;
      while (i < nx) {
        M_gnode(v0, i, j, k); M_gnode(v1, i + 1, j, k); M_gnode(v2, i, j + 1, k); M_gnode(v3, i + 1, j + 1, k);
        M_gnode(v4, i, j, k + 1); M_gnode(v5, i + 1, j, k + 1); M_gnode(v6, i, j + 1, k + 1); M_gnode(v7, i + 1, j + 1, k + 1);
        // five tetrahedra, the split turned over from one cell to the next so that the
        // diagonals of shared faces agree
        if ((i + j + k) % 2 == 0) {
          addTet(v1, v2, v4, v7, mu2, la2, rho, eta);
          addTet(v0, v1, v2, v4, mu2, la2, rho, eta);
          addTet(v3, v1, v2, v7, mu2, la2, rho, eta);
          addTet(v5, v1, v4, v7, mu2, la2, rho, eta);
          addTet(v6, v2, v4, v7, mu2, la2, rho, eta);
        } else {
          addTet(v0, v3, v5, v6, mu2, la2, rho, eta);
          addTet(v1, v0, v3, v5, mu2, la2, rho, eta);
          addTet(v2, v0, v3, v6, mu2, la2, rho, eta);
          addTet(v4, v0, v5, v6, mu2, la2, rho, eta);
          addTet(v7, v3, v5, v6, mu2, la2, rho, eta);
        }
        i = i + 1;
      }
      j = j + 1;
    }
    k = k + 1;
  }
  SBT1[b] = nT;
  // the step limit: the fastest wave (P wave) across the smallest height
  c = Math.sqrt((laL + 2 * muL) / rho);
  SBDT[b] = CFL * tetAlt / c;
  h = Math.min(lx / nx, ly / ny, lz / nz);
  SBH[b] = h;
  i = n0;
  while (i <= nN) {
    m = NMS[i];
    if (NIM[i] > 0) { NIM[i] = 1 / m; }
    // contact: a spring of the stiffness of the material over one cell, critically damped in part
    NKC[i] = KCF * m * sqr(c / h);
    NCD[i] = 2 * CZETA * Math.sqrt(NKC[i] * m);
    i = i + 1;
  }
  // the surface: four-cornered faces, outward (from the middle)
  fixCX = cx; fixCY = cy; fixCZ = cz;
  softFaces(b, n0, nx, ny, nz, cr, cg, cb);
  SBF1[b] = nF;
}

function softFaces(b, n0, nx, ny, nz, cr, cg, cb) {
  let i = 0, j = 0, k = 0, v0 = 0, v1 = 0, v2 = 0, v3 = 0, s = 0;
  // x = 0 and x = nx
  k = 0;
  while (k < nz) {
    j = 0;
    while (j < ny) {
      s = 1 - ((j + k) % 2) * 0.12;
      M_gnode(v0, 0, j, k); M_gnode(v1, 0, j, k + 1); M_gnode(v2, 0, j + 1, k + 1); M_gnode(v3, 0, j + 1, k);
      addFace(v0, v1, v2, v3, cr * s, cg * s, cb * s, b);
      M_gnode(v0, nx, j, k); M_gnode(v1, nx, j + 1, k); M_gnode(v2, nx, j + 1, k + 1); M_gnode(v3, nx, j, k + 1);
      addFace(v0, v1, v2, v3, cr * s, cg * s, cb * s, b);
      j = j + 1;
    }
    k = k + 1;
  }
  k = 0;
  while (k < nz) {
    i = 0;
    while (i < nx) {
      s = 1 - ((i + k) % 2) * 0.12;
      M_gnode(v0, i, 0, k); M_gnode(v1, i + 1, 0, k); M_gnode(v2, i + 1, 0, k + 1); M_gnode(v3, i, 0, k + 1);
      addFace(v0, v1, v2, v3, cr * s, cg * s, cb * s, b);
      M_gnode(v0, i, ny, k); M_gnode(v1, i, ny, k + 1); M_gnode(v2, i + 1, ny, k + 1); M_gnode(v3, i + 1, ny, k);
      addFace(v0, v1, v2, v3, cr * s, cg * s, cb * s, b);
      i = i + 1;
    }
    k = k + 1;
  }
  j = 0;
  while (j < ny) {
    i = 0;
    while (i < nx) {
      s = 1 - ((i + j) % 2) * 0.12;
      M_gnode(v0, i, j, 0); M_gnode(v1, i, j + 1, 0); M_gnode(v2, i + 1, j + 1, 0); M_gnode(v3, i + 1, j, 0);
      addFace(v0, v1, v2, v3, cr * s, cg * s, cb * s, b);
      M_gnode(v0, i, j, nz); M_gnode(v1, i + 1, j, nz); M_gnode(v2, i + 1, j + 1, nz); M_gnode(v3, i, j + 1, nz);
      addFace(v0, v1, v2, v3, cr * s, cg * s, cb * s, b);
      i = i + 1;
    }
    j = j + 1;
  }
}

// ---------------- accurate mode ----------------
// The deformation gradient F = Ds Dm^-1 of tetrahedron t (columns f1 f2 f3) and the
// gradients of a quantity whose derivative by F has columns g1 g2 g3: the push on corner
// j (1..3) is sum_c g_c M_jc, on corner 0 minus the sum of the three.
function M_tetF(t) {
  ta = TA[t]; tb = TB[t]; tc = TC[t]; td = TD[t];
  x0 = PX[ta]; y0 = PY[ta]; z0 = PZ[ta];
  d1x = PX[tb] - x0; d1y = PY[tb] - y0; d1z = PZ[tb] - z0;
  d2x = PX[tc] - x0; d2y = PY[tc] - y0; d2z = PZ[tc] - z0;
  d3x = PX[td] - x0; d3y = PY[td] - y0; d3z = PZ[td] - z0;
  m11 = M11[t]; m12 = M12[t]; m13 = M13[t]; m21 = M21[t]; m22 = M22[t]; m23 = M23[t]; m31 = M31[t]; m32 = M32[t]; m33 = M33[t];
  f1x = d1x * m11 + d2x * m21 + d3x * m31; f1y = d1y * m11 + d2y * m21 + d3y * m31; f1z = d1z * m11 + d2z * m21 + d3z * m31;
  f2x = d1x * m12 + d2x * m22 + d3x * m32; f2y = d1y * m12 + d2y * m22 + d3y * m32; f2z = d1z * m12 + d2z * m22 + d3z * m32;
  f3x = d1x * m13 + d2x * m23 + d3x * m33; f3y = d1y * m13 + d2y * m23 + d3y * m33; f3z = d1z * m13 + d2z * m23 + d3z * m33;
}
// cofactor of F (= d det F / d F): columns f2 x f3, f3 x f1, f1 x f2
function M_cof() {
  c1x = f2y * f3z - f2z * f3y; c1y = f2z * f3x - f2x * f3z; c1z = f2x * f3y - f2y * f3x;
  c2x = f3y * f1z - f3z * f1y; c2y = f3z * f1x - f3x * f1z; c2z = f3x * f1y - f3y * f1x;
  c3x = f1y * f2z - f1z * f2y; c3y = f1z * f2x - f1x * f2z; c3z = f1x * f2y - f1y * f2x;
}

function softForces() {
  let i = 1, t = 1, ta = 0, tb = 0, tc = 0, td = 0, x0 = 0, y0 = 0, z0 = 0, vol = 0, mu = 0, s = 0, eta = 0;
  let d1x = 0, d1y = 0, d1z = 0, d2x = 0, d2y = 0, d2z = 0, d3x = 0, d3y = 0, d3z = 0;
  let m11 = 0, m12 = 0, m13 = 0, m21 = 0, m22 = 0, m23 = 0, m31 = 0, m32 = 0, m33 = 0;
  let f1x = 0, f1y = 0, f1z = 0, f2x = 0, f2y = 0, f2z = 0, f3x = 0, f3y = 0, f3z = 0;
  let c1x = 0, c1y = 0, c1z = 0, c2x = 0, c2y = 0, c2z = 0, c3x = 0, c3y = 0, c3z = 0;
  let p1x = 0, p1y = 0, p1z = 0, p2x = 0, p2y = 0, p2z = 0, p3x = 0, p3y = 0, p3z = 0;
  let g1x = 0, g1y = 0, g1z = 0, g2x = 0, g2y = 0, g2z = 0, g3x = 0, g3y = 0, g3z = 0;
  let e1x = 0, e1y = 0, e1z = 0, e2x = 0, e2y = 0, e2z = 0, e3x = 0, e3y = 0, e3z = 0;
  let a11 = 0, a12 = 0, a13 = 0, a22 = 0, a23 = 0, a33 = 0, vx0 = 0, vy0 = 0, vz0 = 0;
  for (const _ of rep(nN)) { FX[i] = 0; FY[i] = 0; FZ[i] = 0; i = i + 1; }
  for (const _ of rep(nT)) {
    M_tetF(t);
    M_cof();
    mu = TMU[t];
    s = TLA[t] * (f1x * c1x + f1y * c1y + f1z * c1z - TAL[t]);
    // first Piola-Kirchhoff stress P = mu F + lambda (J - alpha) cof F
    p1x = mu * f1x + s * c1x; p1y = mu * f1y + s * c1y; p1z = mu * f1z + s * c1z;
    p2x = mu * f2x + s * c2x; p2y = mu * f2y + s * c2y; p2z = mu * f2z + s * c2z;
    p3x = mu * f3x + s * c3x; p3y = mu * f3y + s * c3y; p3z = mu * f3z + s * c3z;
    eta = TET[t];
    if (eta > 0) {
      // viscosity (Kelvin-Voigt on the rate of the Green strain, so a body that only
      // turns is not slowed): P += F (2 eta sym(F^T dF/dt))
      vx0 = VX[ta]; vy0 = VY[ta]; vz0 = VZ[ta];
      d1x = VX[tb] - vx0; d1y = VY[tb] - vy0; d1z = VZ[tb] - vz0;
      d2x = VX[tc] - vx0; d2y = VY[tc] - vy0; d2z = VZ[tc] - vz0;
      d3x = VX[td] - vx0; d3y = VY[td] - vy0; d3z = VZ[td] - vz0;
      e1x = d1x * m11 + d2x * m21 + d3x * m31; e1y = d1y * m11 + d2y * m21 + d3y * m31; e1z = d1z * m11 + d2z * m21 + d3z * m31;
      e2x = d1x * m12 + d2x * m22 + d3x * m32; e2y = d1y * m12 + d2y * m22 + d3y * m32; e2z = d1z * m12 + d2z * m22 + d3z * m32;
      e3x = d1x * m13 + d2x * m23 + d3x * m33; e3y = d1y * m13 + d2y * m23 + d3y * m33; e3z = d1z * m13 + d2z * m23 + d3z * m33;
      // A = 2 eta sym(F^T dF): A_ij = eta (f_i . e_j + f_j . e_i)
      a11 = 2 * eta * (f1x * e1x + f1y * e1y + f1z * e1z);
      a22 = 2 * eta * (f2x * e2x + f2y * e2y + f2z * e2z);
      a33 = 2 * eta * (f3x * e3x + f3y * e3y + f3z * e3z);
      a12 = eta * (f1x * e2x + f1y * e2y + f1z * e2z + f2x * e1x + f2y * e1y + f2z * e1z);
      a13 = eta * (f1x * e3x + f1y * e3y + f1z * e3z + f3x * e1x + f3y * e1y + f3z * e1z);
      a23 = eta * (f2x * e3x + f2y * e3y + f2z * e3z + f3x * e2x + f3y * e2y + f3z * e2z);
      // column j of F A is sum_i f_i A_ij
      p1x = p1x + f1x * a11 + f2x * a12 + f3x * a13; p1y = p1y + f1y * a11 + f2y * a12 + f3y * a13; p1z = p1z + f1z * a11 + f2z * a12 + f3z * a13;
      p2x = p2x + f1x * a12 + f2x * a22 + f3x * a23; p2y = p2y + f1y * a12 + f2y * a22 + f3y * a23; p2z = p2z + f1z * a12 + f2z * a22 + f3z * a23;
      p3x = p3x + f1x * a13 + f2x * a23 + f3x * a33; p3y = p3y + f1y * a13 + f2y * a23 + f3y * a33; p3z = p3z + f1z * a13 + f2z * a23 + f3z * a33;
    }
    vol = 0 - TV[t];
    g1x = vol * (p1x * m11 + p2x * m12 + p3x * m13); g1y = vol * (p1y * m11 + p2y * m12 + p3y * m13); g1z = vol * (p1z * m11 + p2z * m12 + p3z * m13);
    g2x = vol * (p1x * m21 + p2x * m22 + p3x * m23); g2y = vol * (p1y * m21 + p2y * m22 + p3y * m23); g2z = vol * (p1z * m21 + p2z * m22 + p3z * m23);
    g3x = vol * (p1x * m31 + p2x * m32 + p3x * m33); g3y = vol * (p1y * m31 + p2y * m32 + p3y * m33); g3z = vol * (p1z * m31 + p2z * m32 + p3z * m33);
    FX[tb] = FX[tb] + g1x; FY[tb] = FY[tb] + g1y; FZ[tb] = FZ[tb] + g1z;
    FX[tc] = FX[tc] + g2x; FY[tc] = FY[tc] + g2y; FZ[tc] = FZ[tc] + g2z;
    FX[td] = FX[td] + g3x; FY[td] = FY[td] + g3y; FZ[td] = FZ[td] + g3z;
    FX[ta] = FX[ta] - g1x - g2x - g3x; FY[ta] = FY[ta] - g1y - g2y - g3y; FZ[ta] = FZ[ta] - g1z - g2z - g3z;
    t = t + 1;
  }
}

// velocity Verlet: half a kick from the forces at this place, the move, the forces at the
// new place, the other half kick (velocities and places then belong to the same time)
// (sDamp: a damping of the scene, in proportion to mass, that some scenes use to come to rest)
function softKick(h) {
  let i = 1, w = 0, g = grav * h, dm = 1 / (1 + sDamp * h);
  for (const _ of rep(nN)) {
    w = NIM[i];
    if (w > 0) {
      VX[i] = (VX[i] + h * w * FX[i]) * dm; VY[i] = (VY[i] + h * w * FY[i] - g) * dm; VZ[i] = (VZ[i] + h * w * FZ[i]) * dm;
    }
    i = i + 1;
  }
}
function softDrift(h) {
  let i = 1;
  for (const _ of rep(nN)) {
    if (NIM[i] > 0) { PX[i] = PX[i] + h * VX[i]; PY[i] = PY[i] + h * VY[i]; PZ[i] = PZ[i] + h * VZ[i]; }
    i = i + 1;
  }
}

// the box around each soft body, and the rigid bodies that may touch it (SRC)
function M_softBox(b) {
  bi = SBN0[b]; bx0 = PX[bi]; bx1 = bx0; by0 = PY[bi]; by1 = by0; bz0 = PZ[bi]; bz1 = bz0; bv = 0;
  for (const _ of rep(SBN1[b] - SBN0[b])) {
    bi = bi + 1;
    bv = PX[bi]; if (bv < bx0) { bx0 = bv; } if (bv > bx1) { bx1 = bv; }
    bv = PY[bi]; if (bv < by0) { by0 = bv; } if (bv > by1) { by1 = bv; }
    bv = PZ[bi]; if (bv < bz0) { bz0 = bv; } if (bv > bz1) { bz1 = bv; }
  }
  nSRC = 0;
  bi = 2;
  for (const _ of rep(nR - 1)) {
    bv = RBR[bi] + 0.01;
    if (RNS[bi] == 0 && RX[bi] + bv > bx0 && RX[bi] - bv < bx1 && RY[bi] + bv > by0 && RY[bi] - bv < by1 && RZ[bi] + bv > bz0 && RZ[bi] - bv < bz1) {
      nSRC = nSRC + 1;
      SRC[nSRC] = bi;
    }
    bi = bi + 1;
  }
  SBX0[b] = bx0; SBX1[b] = bx1; SBY0[b] = by0; SBY1[b] = by1; SBZ0[b] = bz0; SBZ1[b] = bz1;
}

// Is point (px py pz) inside rigid body r? -> hit, depth dd, outward normal (nx ny nz)
function M_sdf(r, px, py, pz) {
  hit = 0;
  qx = px - RX[r]; qy = py - RY[r]; qz = pz - RZ[r];
  if (RK[r] == 1) {
    dd = qx * qx + qy * qy + qz * qz;
    if (dd < RA[r] * RA[r]) {
      hit = 1;
      dd = Math.sqrt(dd);
      if (dd > 0.0000001) { nx = qx / dd; ny = qy / dd; nz = qz / dd; } else { nx = 0; ny = 1; nz = 0; }
      dd = RA[r] - dd;
    }
  } else {
    // in the box's own frame
    lx = R11[r] * qx + R21[r] * qy + R31[r] * qz;
    ly = R12[r] * qx + R22[r] * qy + R32[r] * qz;
    lz = R13[r] * qx + R23[r] * qy + R33[r] * qz;
    ax = Math.abs(lx) - RA[r]; ay = Math.abs(ly) - RB[r]; az = Math.abs(lz) - RC[r];
    if (ax < 0 && ay < 0 && az < 0) {
      hit = 1;
      // out through the nearest face
      if (ax > ay && ax > az) {
        dd = 0 - ax; sg = 1; if (lx < 0) { sg = -1; }
        nx = R11[r] * sg; ny = R21[r] * sg; nz = R31[r] * sg;
      } else {
        if (ay > az) {
          dd = 0 - ay; sg = 1; if (ly < 0) { sg = -1; }
          nx = R12[r] * sg; ny = R22[r] * sg; nz = R32[r] * sg;
        } else {
          dd = 0 - az; sg = 1; if (lz < 0) { sg = -1; }
          nx = R13[r] * sg; ny = R23[r] * sg; nz = R33[r] * sg;
        }
      }
    }
  }
}

// Fast mode: the push of a soft body on a rigid one is taken explicitly by the rigid one,
// so its spring and damping may be no stiffer than it can follow in a step: by its mass
// at its rim (1 / (1/m + r^2/I)), shared between the contacts it had in the last step. The soft side takes the same spring.
function M_kcap(r) {
  RKC[r] = RKC[r] + 1;
  if (RIM[r] > 0) {
    kc = Math.min(kc, 0.4 * REM[r] / (capH * capH * RKN[r]));
    cd = Math.min(cd, 0.4 * REM[r] / (capH * RKN[r]));
  }
}
let capH = 0.01, rigOnly = 0;
// Node i against body r (1: the ground) along normal n at depth dd:
// a stiff spring with some damping along n, and friction by a spring that slips at mu fn
function M_softHit(i, r) {
  // the body's velocity at the point
  qx = PX[i] - RX[r]; qy = PY[i] - RY[r]; qz = PZ[i] - RZ[r];
  vrx = VX[i] - RVX[r] - (RWY[r] * qz - RWZ[r] * qy);
  vry = VY[i] - RVY[r] - (RWZ[r] * qx - RWX[r] * qz);
  vrz = VZ[i] - RVZ[r] - (RWX[r] * qy - RWY[r] * qx);
  vn = vrx * nx + vry * ny + vrz * nz;
  kc = NKC[i]; cd = NCD[i];
  M_kcap(r);
  fn = kc * dd - cd * vn;
  if (fn < 0 && pred == 0) { fn = 0; }
  vrx = vrx - vn * nx; vry = vry - vn * ny; vrz = vrz - vn * nz;
  lim = Math.min(SBMU[NSB[i]], RMU[r]) * Math.max(fn, 0);
  if (rigOnly == 0) {
    KCN[i] = KCN[i] + kc; KCD[i] = KCD[i] + cd;
    if (NCB[i] != r) { NCB[i] = r; UX[i] = 0; UY[i] = 0; UZ[i] = 0; }
    NCS[i] = stepId;
    ux = UX[i] + h * vrx; uy = UY[i] + h * vry; uz = UZ[i] + h * vrz;
    un = ux * nx + uy * ny + uz * nz;
    ux = ux - un * nx; uy = uy - un * ny; uz = uz - un * nz;
    // the spring's pull and the damping of the sliding, at most mu fn
    ftx = 0 - kc * ux - cd * vrx; fty = 0 - kc * uy - cd * vry; ftz = 0 - kc * uz - cd * vrz;
    fl = Math.sqrt(ftx * ftx + fty * fty + ftz * ftz);
    if (fl > lim) {
      // sliding: the friction is mu fn against the motion, the spring holds just that
      sg = lim / fl;
      ftx = ftx * sg; fty = fty * sg; ftz = ftz * sg;
      ux = 0 - ftx / kc; uy = 0 - fty / kc; uz = 0 - ftz / kc;
    }
    UX[i] = ux; UY[i] = uy; UZ[i] = uz;
    eCon = eCon + kc / 2 * (dd * dd + ux * ux + uy * uy + uz * uz);
  } else {
    // (the rigid body's own steps, the soft body held still: friction by the sliding alone)
    ftx = 0 - cd * vrx; fty = 0 - cd * vry; ftz = 0 - cd * vrz;
    fl = Math.sqrt(ftx * ftx + fty * fty + ftz * ftz);
    if (fl > lim) { sg = lim / fl; ftx = ftx * sg; fty = fty * sg; ftz = ftz * sg; }
  }
  fx = fn * nx + ftx; fy = fn * ny + fty; fz = fn * nz + ftz;
  if (rigOnly == 0) { FX[i] = FX[i] + fx; FY[i] = FY[i] + fy; FZ[i] = FZ[i] + fz; }
  // and back on the body
  RFX[r] = RFX[r] - fx; RFY[r] = RFY[r] - fy; RFZ[r] = RFZ[r] - fz;
  RTX[r] = RTX[r] - (qy * fz - qz * fy); RTY[r] = RTY[r] - (qz * fx - qx * fz); RTZ[r] = RTZ[r] - (qx * fy - qy * fx);
}

function softContacts(h) {
  let b = 1, s = 0, i = 0, r = 0, k = 0, hit = 0, dd = 0, nx = 0, ny = 0, nz = 0, qx = 0, qy = 0, qz = 0, lx = 0, ly = 0, lz = 0, ax = 0, ay = 0, az = 0, sg = 0;
  let pred = 0, cd = 0, vrx = 0, vry = 0, vrz = 0, vn = 0, kc = 0, fn = 0, ux = 0, uy = 0, uz = 0, un = 0, ftx = 0, fty = 0, ftz = 0, fl = 0, lim = 0, fx = 0, fy = 0, fz = 0;
  stepId = stepId + 1;
  eCon = 0;
  for (const _ of rep(nSB)) {
    M_softBox(b);
    s = SBS0[b];
    for (const _ of rep(SBS1[b] - SBS0[b] + 1)) {
      i = SVN[s];
      // (fast mode: also a node that will reach the ground within the step - the implicit
      // solve then stops it at the ground instead of finding it deep under it a step late)
      pred = 0;
      if (mode == 2) { if (PY[i] + h * VY[i] < 0) { pred = 1; } }
      if (PY[i] < 0 || pred == 1) {
        dd = 0 - PY[i]; nx = 0; ny = 1; nz = 0;
        M_softHit(i, 1);
      }
      k = 1;
      for (const _ of rep(nSRC)) {
        r = SRC[k];
        M_sdf(r, PX[i], PY[i], PZ[i]);
        pred = 0;
        if (hit == 1) { M_softHit(i, r); }
        k = k + 1;
      }
      // out of contact: the friction spring lets go
      if (NCS[i] != stepId) { NCB[i] = 0; }
      s = s + 1;
    }
    if (nSRC > 0) { faceHits(b, h); }
    b = b + 1;
  }
}

// Rigid bodies against the surface of soft body bb (the rigid bodies near it are in SRC).
// This catches what the nodes alone miss: a rigid body pressing between them. A spring
// with damping and friction, shared out over the corners of the triangle.
// A sphere presses on every surface triangle its surface is behind (a dent is many
// triangles at once). A box is 26 points (corners, middles of edges and faces), each
// against the one triangle it is least deep behind, and a contact must start shallow or
// go on from the depth it had: a point that has sunk into a dent would otherwise, crossing
// into the next triangle, meet it suddenly deep and be thrown.
//
// The triangle A B C: its edges, normal and what finding a place in it needs
function M_triSet(A, B, C) {
  e1x = PX[B] - PX[A]; e1y = PY[B] - PY[A]; e1z = PZ[B] - PZ[A];
  e2x = PX[C] - PX[A]; e2y = PY[C] - PY[A]; e2z = PZ[C] - PZ[A];
  nx = e1y * e2z - e1z * e2y; ny = e1z * e2x - e1x * e2z; nz = e1x * e2y - e1y * e2x;
  nn = Math.sqrt(nx * nx + ny * ny + nz * nz);
  nx = nx / nn; ny = ny / nn; nz = nz / nn;
  d00 = e1x * e1x + e1y * e1y + e1z * e1z; d01 = e1x * e2x + e1y * e2y + e1z * e2z; d11 = e2x * e2x + e2y * e2y + e2z * e2z;
  den = d00 * d11 - d01 * d01;
  nTR = nTR + 1;
  YA[nTR] = A; YB[nTR] = B; YC[nTR] = C;
  Y1X[nTR] = e1x; Y1Y[nTR] = e1y; Y1Z[nTR] = e1z; Y2X[nTR] = e2x; Y2Y[nTR] = e2y; Y2Z[nTR] = e2z;
  YNX[nTR] = nx; YNY[nTR] = ny; YNZ[nTR] = nz; Y00[nTR] = d00; Y01[nTR] = d01; Y11[nTR] = d11; YDN[nTR] = den;
}
function M_triGet(t) {
  ta = YA[t]; tb = YB[t]; tc = YC[t];
  e1x = Y1X[t]; e1y = Y1Y[t]; e1z = Y1Z[t]; e2x = Y2X[t]; e2y = Y2Y[t]; e2z = Y2Z[t];
  nx = YNX[t]; ny = YNY[t]; nz = YNZ[t]; d00 = Y00[t]; d01 = Y01[t]; d11 = Y11[t]; den = YDN[t];
}
// is point (px py pz) with radius rr behind the triangle (by less than dmax) and over it? -> ok, s, bu bv bw
function M_ptest() {
  ok = 0;
  qx = px - PX[ta]; qy = py - PY[ta]; qz = pz - PZ[ta];
  s = qx * nx + qy * ny + qz * nz;
  if (s < rr && s > rr - dmax) {
    qx = qx - s * nx; qy = qy - s * ny; qz = qz - s * nz;
    d20 = qx * e1x + qy * e1y + qz * e1z; d21 = qx * e2x + qy * e2y + qz * e2z;
    bv = (d11 * d20 - d01 * d21) / den; bw = (d00 * d21 - d01 * d20) / den; bu = 1 - bv - bw;
    if (bu >= 0 && bv >= 0 && bw >= 0) { ok = 1; }
  }
}
// the push between body r and the triangle at depth rr - s
function M_papply() {
  dep = rr - s;
  cx = px - rr * nx; cy = py - rr * ny; cz = pz - rr * nz;
  ox = cx - RX[r]; oy = cy - RY[r]; oz = cz - RZ[r];
  vx = RVX[r] + RWY[r] * oz - RWZ[r] * oy - bu * VX[ta] - bv * VX[tb] - bw * VX[tc];
  vy = RVY[r] + RWZ[r] * ox - RWX[r] * oz - bu * VY[ta] - bv * VY[tb] - bw * VY[tc];
  vz = RVZ[r] + RWX[r] * oy - RWY[r] * ox - bu * VZ[ta] - bv * VZ[tb] - bw * VZ[tc];
  vn = vx * nx + vy * ny + vz * nz;
  kc = (NKC[ta] + NKC[tb] + NKC[tc]) / 3;
  cd = (NCD[ta] + NCD[tb] + NCD[tc]) / 3;
  M_kcap(r);
  fn = kc * dep - cd * vn;
  if (fn < 0) { fn = 0; }
  vx = vx - vn * nx; vy = vy - vn * ny; vz = vz - vn * nz;
  vt = Math.sqrt(vx * vx + vy * vy + vz * vz);
  // Coulomb friction, viscous below 1 cm/s (no faster than the corners can follow in a
  // step in the accurate mode; in the fast one it goes into the implicit solve)
  ft = Math.min(SBMU[bb], RMU[r]) * fn / Math.max(vt, 0.01);
  if (mode == 1) { ft = Math.min(ft, 0.5 * Math.min(NMS[ta], NMS[tb], NMS[tc]) / h); }
  if (RIM[r] > 0) { ft = Math.min(ft, 0.4 * REM[r] / (capH * RKN[r])); }
  if (rigOnly == 0) {
    KCN[ta] = KCN[ta] + bu * kc; KCN[tb] = KCN[tb] + bv * kc; KCN[tc] = KCN[tc] + bw * kc;
    KCD[ta] = KCD[ta] + bu * (cd + ft); KCD[tb] = KCD[tb] + bv * (cd + ft); KCD[tc] = KCD[tc] + bw * (cd + ft);
    eCon = eCon + kc / 2 * dep * dep;
  }
  ft = 0 - ft;
  fx = fn * nx + ft * vx; fy = fn * ny + ft * vy; fz = fn * nz + ft * vz;
  RFX[r] = RFX[r] + fx; RFY[r] = RFY[r] + fy; RFZ[r] = RFZ[r] + fz;
  RTX[r] = RTX[r] + oy * fz - oz * fy; RTY[r] = RTY[r] + oz * fx - ox * fz; RTZ[r] = RTZ[r] + ox * fy - oy * fx;
  if (rigOnly == 0) {
    FX[ta] = FX[ta] - bu * fx; FY[ta] = FY[ta] - bu * fy; FZ[ta] = FZ[ta] - bu * fz;
    FX[tb] = FX[tb] - bv * fx; FY[tb] = FY[tb] - bv * fy; FZ[tb] = FZ[tb] - bv * fz;
    FX[tc] = FX[tc] - bw * fx; FY[tc] = FY[tc] - bw * fy; FZ[tc] = FZ[tc] - bw * fz;
  }
}
function faceHits(bb, h) {
  let f = 0, k = 1, r = 0, j = 0, t = 0, a = 0, b = 0, c = 0, d = 0, fcx = 0, fcy = 0, fcz = 0, lim = SBH[bb] * 1.2, px = 0, py = 0, pz = 0, rr = 0, dmax = SBH[bb], near = 0;
  let e1x = 0, e1y = 0, e1z = 0, e2x = 0, e2y = 0, e2z = 0, nx = 0, ny = 0, nz = 0, nn = 0, qx = 0, qy = 0, qz = 0, s = 0, x = 0, y = 0, z = 0, ok = 0, ta = 0, tb = 0, tc = 0;
  let d00 = 0, d01 = 0, d11 = 0, d20 = 0, d21 = 0, den = 0, bu = 0, bv = 0, bw = 0, dep = 0, cx = 0, cy = 0, cz = 0, ox = 0, oy = 0, oz = 0;
  let vx = 0, vy = 0, vz = 0, vn = 0, kc = 0, cd = 0, fn = 0, vt = 0, ft = 0, fx = 0, fy = 0, fz = 0, best = 0, bs = 0, bu0 = 0, bv0 = 0, bw0 = 0;
  for (const _ of rep(nSRC)) {
    r = SRC[k];
    // the triangles near the body (a sphere by its radius, a box in its own frame)
    nTR = 0;
    f = SBF0[bb];
    for (const _ of rep(SBF1[bb] - SBF0[bb] + 1)) {
      a = GA[f]; b = GB[f]; c = GC[f]; d = GD[f];
      x = (PX[a] + PX[b] + PX[c] + PX[d]) / 4 - RX[r]; y = (PY[a] + PY[b] + PY[c] + PY[d]) / 4 - RY[r]; z = (PZ[a] + PZ[b] + PZ[c] + PZ[d]) / 4 - RZ[r];
      near = 0;
      if (RK[r] == 1) { if (x * x + y * y + z * z < sqr(RA[r] + lim)) { near = 1; } }
      else {
        if (Math.abs(R11[r] * x + R21[r] * y + R31[r] * z) < RA[r] + lim && Math.abs(R12[r] * x + R22[r] * y + R32[r] * z) < RB[r] + lim && Math.abs(R13[r] * x + R23[r] * y + R33[r] * z) < RC[r] + lim) { near = 1; }
      }
      if (near == 1 && nTR < TRCAP - 1) { M_triSet(a, b, c); M_triSet(a, c, d); }
      f = f + 1;
    }
    if (nTR > 0) {
      if (RK[r] == 1) {
        px = RX[r]; py = RY[r]; pz = RZ[r]; rr = RA[r];
        t = 1;
        for (const _ of rep(nTR)) {
          M_triGet(t);
          M_ptest();
          if (ok == 1) { M_papply(); }
          t = t + 1;
        }
      } else {
        rr = 0;
        j = 1;
        for (const _ of rep(26)) {
          x = BSX[j] * RA[r]; y = BSY[j] * RB[r]; z = BSZ[j] * RC[r];
          px = RX[r] + R11[r] * x + R12[r] * y + R13[r] * z;
          py = RY[r] + R21[r] * x + R22[r] * y + R23[r] * z;
          pz = RZ[r] + R31[r] * x + R32[r] * y + R33[r] * z;
          best = 0; bs = 0 - dmax;
          t = 1;
          // (a point away from the soft body has nothing to look at)
          if (px < SBX0[bb] - dmax || px > SBX1[bb] + dmax || py < SBY0[bb] - dmax || py > SBY1[bb] + dmax || pz < SBZ0[bb] - dmax || pz > SBZ1[bb] + dmax) { t = nTR + 1; }
          for (const _ of rep(nTR + 1 - t)) {
            M_triGet(t);
            M_ptest();
            if (ok == 1 && s > bs) { best = t; bs = s; bu0 = bu; bv0 = bv; bw0 = bw; }
            t = t + 1;
          }
          // (a contact starts shallow, or goes on from the depth it had in the last step)
          x = (r - 1) * 26 + j;
          if (best > 0) {
            if (rr - bs < 0.25 * SBH[bb] || (PDE[x] > 0 && Math.abs(rr - bs - PDE[x]) < 0.25 * SBH[bb])) {
              M_triGet(best);
              s = bs; bu = bu0; bv = bv0; bw = bw0;
              M_papply();
              PDE[x] = dep;
            } else { PDE[x] = 0; }
          } else { PDE[x] = 0; }
          j = j + 1;
        }
      }
    }
    k = k + 1;
  }
}
let nTR = 0, PDE = [];
let YA = [], YB = [], YC = [], Y1X = [], Y1Y = [], Y1Z = [], Y2X = [], Y2Y = [], Y2Z = [], YNX = [], YNY = [], YNZ = [], Y00 = [], Y01 = [], Y11 = [], YDN = [];
// Fast mode, the rigid bodies' own steps: the soft bodies held where they are, the pushes
// of their surfaces on the rigid bodies only
function softOnRigid(h) {
  let b = 1, s = 0, i = 0, r = 0, k = 0, hit = 0, dd = 0, nx = 0, ny = 0, nz = 0, qx = 0, qy = 0, qz = 0, lx = 0, ly = 0, lz = 0, ax = 0, ay = 0, az = 0, sg = 0;
  let bi = 0, bx0 = 0, bx1 = 0, by0 = 0, by1 = 0, bz0 = 0, bz1 = 0, bv = 0;
  let pred = 0, cd = 0, vrx = 0, vry = 0, vrz = 0, vn = 0, kc = 0, fn = 0, ux = 0, uy = 0, uz = 0, un = 0, ftx = 0, fty = 0, ftz = 0, fl = 0, lim = 0, fx = 0, fy = 0, fz = 0;
  rigOnly = 1;
  for (const _ of rep(nSB)) {
    M_softBox(b);
    if (nSRC > 0) {
      s = SBS0[b];
      for (const _ of rep(SBS1[b] - SBS0[b] + 1)) {
        i = SVN[s];
        k = 1;
        for (const _ of rep(nSRC)) {
          r = SRC[k];
          M_sdf(r, PX[i], PY[i], PZ[i]);
          pred = 0;
          if (hit == 1) { M_softHit(i, r); }
          k = k + 1;
        }
        s = s + 1;
      }
      faceHits(b, h);
    }
    b = b + 1;
  }
  rigOnly = 0;
}

// the 26 points of a box (in half sizes): corners, middles of edges, middles of faces
let BSX = [-1, 1, -1, 1, -1, 1, -1, 1, 0, 0, 0, 0, -1, 1, -1, 1, -1, 1, -1, 1, 0, 0, -1, 1, 0, 0];
let BSY = [-1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, 0, 0, 0, 0, -1, -1, 1, 1, -1, 1, 0, 0, 0, 0];
let BSZ = [-1, -1, -1, -1, 1, 1, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, -1, 1];

// ---------------- soft bodies against each other ----------------
// Every surface node of a soft body against the surface triangles of the others, only where
// the boxes of two bodies meet (OX0..OZ1 of a body: where the boxes of the others meet its
// own). The triangles there are worked out once a step into a cache (S..) and go into a
// spatial hash (cells of HCELL, each triangle into the cells its box - grown by the reach
// SSDM of a contact - touches); a node looks only at the triangles of its own cell. Like a
// box's points against a soft surface: the one triangle the node is least deep behind, a
// contact that starts shallow or goes on from the depth it had, a spring with damping and
// friction shared out over the triangle. The full look is every SSK steps; in the steps
// between, each node is held against the triangle that look found for it.
function M_hkey(ix, iy, iz) {
  hk = ((ix + 1000) * 7919 + (iy + 1000) * 104729 + (iz + 1000) * 1299709) % HN + 1;
}
// the triangle (t: 0 or 1) of face f
function M_ftri(f, t) {
  ta = GA[f];
  if (t == 0) { tb = GB[f]; tc = GC[f]; } else { tb = GC[f]; tc = GD[f]; }
}
// the push between node i (body a) and triangle ta tb tc (body tb0) along n at depth dep
function M_ssApply() {
  vx = VX[i] - bu * VX[ta] - bv * VX[tb] - bw * VX[tc];
  vy = VY[i] - bu * VY[ta] - bv * VY[tb] - bw * VY[tc];
  vz = VZ[i] - bu * VZ[ta] - bv * VZ[tb] - bw * VZ[tc];
  vn = vx * nx + vy * ny + vz * nz;
  kc = Math.min(NKC[i], (NKC[ta] + NKC[tb] + NKC[tc]) / 3);
  cd = Math.min(NCD[i], (NCD[ta] + NCD[tb] + NCD[tc]) / 3);
  fn = kc * dep - cd * vn;
  if (fn < 0) { fn = 0; }
  vx = vx - vn * nx; vy = vy - vn * ny; vz = vz - vn * nz;
  vt = Math.sqrt(vx * vx + vy * vy + vz * vz);
  // friction: Coulomb, viscous below 1 cm/s
  ft = Math.min(SBMU[a], SBMU[tb0]) * fn / Math.max(vt, 0.01);
  if (mode == 1 || fastExpl == 1) { ft = Math.min(ft, 0.5 * Math.min(NMS[i], NMS[ta], NMS[tb], NMS[tc]) / h); }
  else {
    KCN[i] = KCN[i] + kc; KCD[i] = KCD[i] + cd + ft;
    KCN[ta] = KCN[ta] + bu * kc; KCN[tb] = KCN[tb] + bv * kc; KCN[tc] = KCN[tc] + bw * kc;
    KCD[ta] = KCD[ta] + bu * (cd + ft); KCD[tb] = KCD[tb] + bv * (cd + ft); KCD[tc] = KCD[tc] + bw * (cd + ft);
  }
  eCon = eCon + kc / 2 * dep * dep;
  fx = fn * nx - ft * vx; fy = fn * ny - ft * vy; fz = fn * nz - ft * vz;
  FX[i] = FX[i] + fx; FY[i] = FY[i] + fy; FZ[i] = FZ[i] + fz;
  FX[ta] = FX[ta] - bu * fx; FY[ta] = FY[ta] - bu * fy; FZ[ta] = FZ[ta] - bu * fz;
  FX[tb] = FX[tb] - bv * fx; FY[tb] = FY[tb] - bv * fy; FZ[tb] = FZ[tb] - bv * fz;
  FX[tc] = FX[tc] - bw * fx; FY[tc] = FY[tc] - bw * fy; FZ[tc] = FZ[tc] - bw * fz;
}
function softSoft(h) {
  let a = 1, b = 0, any = 0, m = 0, f = 0, t = 0, s = 0, i = 0, k = 0, e = 0, c = 0, hk = 0, ix = 0, iy = 0, iz = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0, z0 = 0, z1 = 0, cs = HCELL, dm = SSDM, rf = 0;
  let ta = 0, tb = 0, tc = 0, tb0 = 0, px = 0, py = 0, pz = 0, dmax = 0, best = 0, bs = 0, bu0 = 0, bv0 = 0, bw0 = 0, bc = 0;
  let e1x = 0, e1y = 0, e1z = 0, e2x = 0, e2y = 0, e2z = 0, nx = 0, ny = 0, nz = 0, nn = 0, qx = 0, qy = 0, qz = 0;
  let d20 = 0, d21 = 0, bu = 0, bv = 0, bw = 0, dep = 0;
  let vx = 0, vy = 0, vz = 0, vn = 0, kc = 0, cd = 0, fn = 0, vt = 0, ft = 0, fx = 0, fy = 0, fz = 0;
  nSS = 0;
  ssTick = ssTick + 1;
  if (ssTick < SSK) {
    // between looks: each node against the triangle it found, where both are now
    k = 1;
    for (const _ of rep(nCN)) {
      i = CNL[k]; ta = CNA[k]; tb = CNB[k]; tc = CNC[k]; tb0 = CNT[k]; a = NSB[i];
      dmax = 0.5 * SBH[a];
      e1x = PX[tb] - PX[ta]; e1y = PY[tb] - PY[ta]; e1z = PZ[tb] - PZ[ta];
      e2x = PX[tc] - PX[ta]; e2y = PY[tc] - PY[ta]; e2z = PZ[tc] - PZ[ta];
      nx = e1y * e2z - e1z * e2y; ny = e1z * e2x - e1x * e2z; nz = e1x * e2y - e1y * e2x;
      nn = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx = nx / nn; ny = ny / nn; nz = nz / nn;
      qx = PX[i] - PX[ta]; qy = PY[i] - PY[ta]; qz = PZ[i] - PZ[ta];
      dep = qx * nx + qy * ny + qz * nz;
      best = 0;
      if (dep < 0 && dep > 0 - dmax) {
        qx = qx - dep * nx; qy = qy - dep * ny; qz = qz - dep * nz;
        d20 = qx * e1x + qy * e1y + qz * e1z; d21 = qx * e2x + qy * e2y + qz * e2z;
        bs = e1x * e1x + e1y * e1y + e1z * e1z; bc = e2x * e2x + e2y * e2y + e2z * e2z; m = e1x * e2x + e1y * e2y + e1z * e2z;
        bv = (bc * d20 - m * d21) / (bs * bc - m * m); bw = (bs * d21 - m * d20) / (bs * bc - m * m); bu = 1 - bv - bw;
        if (bu >= 0 && bv >= 0 && bw >= 0) { best = 1; }
      }
      dep = 0 - dep;
      if (best == 1 && (dep < 0.4 * dmax || (NPD[i] > 0 && Math.abs(dep - NPD[i]) < 0.4 * dmax))) {
        NPD[i] = dep;
        nSS = nSS + 1;
        M_ssApply();
      } else { NPD[i] = 0; }
      k = k + 1;
    }
  } else {
  ssTick = 0;
  nCN = 0;
  // which bodies come near another, and where
  for (const _ of rep(nSB)) { SBO[a] = 0; OX0[a] = 1000; OX1[a] = -1000; OY0[a] = 1000; OY1[a] = -1000; OZ0[a] = 1000; OZ1[a] = -1000; a = a + 1; }
  a = 1;
  for (const _ of rep(nSB - 1)) {
    b = a + 1;
    for (const _ of rep(nSB - a)) {
      if (SBX0[a] < SBX1[b] + dm && SBX0[b] < SBX1[a] + dm && SBY0[a] < SBY1[b] + dm && SBY0[b] < SBY1[a] + dm && SBZ0[a] < SBZ1[b] + dm && SBZ0[b] < SBZ1[a] + dm) {
        SBO[a] = 1; SBO[b] = 1; any = 1;
        x0 = Math.max(SBX0[a], SBX0[b]) - dm; x1 = Math.min(SBX1[a], SBX1[b]) + dm;
        y0 = Math.max(SBY0[a], SBY0[b]) - dm; y1 = Math.min(SBY1[a], SBY1[b]) + dm;
        z0 = Math.max(SBZ0[a], SBZ0[b]) - dm; z1 = Math.min(SBZ1[a], SBZ1[b]) + dm;
        OX0[a] = Math.min(OX0[a], x0); OX1[a] = Math.max(OX1[a], x1); OY0[a] = Math.min(OY0[a], y0); OY1[a] = Math.max(OY1[a], y1); OZ0[a] = Math.min(OZ0[a], z0); OZ1[a] = Math.max(OZ1[a], z1);
        OX0[b] = Math.min(OX0[b], x0); OX1[b] = Math.max(OX1[b], x1); OY0[b] = Math.min(OY0[b], y0); OY1[b] = Math.max(OY1[b], y1); OZ0[b] = Math.min(OZ0[b], z0); OZ1[b] = Math.max(OZ1[b], z1);
      }
      b = b + 1;
    }
    a = a + 1;
  }
  if (any == 1) {
    // the triangles there: into the cache and the hash
    hStamp = hStamp + 1;
    nHE = 0; c = 0;
    a = 1;
    for (const _ of rep(nSB)) {
      if (SBO[a] == 1) {
        rf = 0.5 * SBH[a];
        f = SBF0[a];
        for (const _ of rep(SBF1[a] - SBF0[a] + 1)) {
          ta = GA[f];
          px = PX[ta]; py = PY[ta]; pz = PZ[ta];
          if (px > OX0[a] - rf && px < OX1[a] + rf && py > OY0[a] - rf && py < OY1[a] + rf && pz > OZ0[a] - rf && pz < OZ1[a] + rf && c < ZCAP - 1) {
            t = 0;
            for (const _ of rep(2)) {
              M_ftri(f, t);
              c = c + 1;
              e1x = PX[tb] - px; e1y = PY[tb] - py; e1z = PZ[tb] - pz;
              e2x = PX[tc] - px; e2y = PY[tc] - py; e2z = PZ[tc] - pz;
              nx = e1y * e2z - e1z * e2y; ny = e1z * e2x - e1x * e2z; nz = e1x * e2y - e1y * e2x;
              nn = Math.sqrt(nx * nx + ny * ny + nz * nz);
              SSA[c] = ta; SSB[c] = tb; SSC[c] = tc; SSD[c] = a;
              SPX[c] = px; SPY[c] = py; SPZ[c] = pz;
              SNX[c] = nx / nn; SNY[c] = ny / nn; SNZ[c] = nz / nn;
              SE1X[c] = e1x; SE1Y[c] = e1y; SE1Z[c] = e1z; SE2X[c] = e2x; SE2Y[c] = e2y; SE2Z[c] = e2z;
              S00[c] = e1x * e1x + e1y * e1y + e1z * e1z; S01[c] = e1x * e2x + e1y * e2y + e1z * e2z; S11[c] = e2x * e2x + e2y * e2y + e2z * e2z;
              SDN[c] = S00[c] * S11[c] - S01[c] * S01[c];
              x0 = Math.floor((Math.min(px, PX[tb], PX[tc]) - dm) / cs); x1 = Math.floor((Math.max(px, PX[tb], PX[tc]) + dm) / cs);
              y0 = Math.floor((Math.min(py, PY[tb], PY[tc]) - dm) / cs); y1 = Math.floor((Math.max(py, PY[tb], PY[tc]) + dm) / cs);
              z0 = Math.floor((Math.min(pz, PZ[tb], PZ[tc]) - dm) / cs); z1 = Math.floor((Math.max(pz, PZ[tb], PZ[tc]) + dm) / cs);
              // (a torn-apart triangle is not followed into every cell it would cross)
              x1 = Math.min(x1, x0 + 2); y1 = Math.min(y1, y0 + 2); z1 = Math.min(z1, z0 + 2);
              ix = x0;
              for (const _ of rep(x1 - x0 + 1)) {
                iy = y0;
                for (const _ of rep(y1 - y0 + 1)) {
                  iz = z0;
                  for (const _ of rep(z1 - z0 + 1)) {
                    M_hkey(ix, iy, iz);
                    if (HS[hk] != hStamp) { HS[hk] = hStamp; HH[hk] = 0; }
                    if (nHE < HECAP) {
                      nHE = nHE + 1;
                      HET[nHE] = c; HEN[nHE] = HH[hk]; HH[hk] = nHE;
                    }
                    iz = iz + 1;
                  }
                  iy = iy + 1;
                }
                ix = ix + 1;
              }
              t = t + 1;
            }
          }
          f = f + 1;
        }
      }
      a = a + 1;
    }
    // the nodes there
    a = 1;
    for (const _ of rep(nSB)) {
      if (SBO[a] == 1) {
        dmax = 0.5 * SBH[a];
        s = SBS0[a];
        for (const _ of rep(SBS1[a] - SBS0[a] + 1)) {
          i = SVN[s];
          px = PX[i]; py = PY[i]; pz = PZ[i];
          best = 0;
          if (px > OX0[a] && px < OX1[a] && py > OY0[a] && py < OY1[a] && pz > OZ0[a] && pz < OZ1[a]) {
            M_hkey(Math.floor(px / cs), Math.floor(py / cs), Math.floor(pz / cs));
            if (HS[hk] == hStamp) {
              e = HH[hk];
              bs = 0 - dmax;
              while (e > 0) {
                c = HET[e];
                if (SSD[c] != a) {
                  qx = px - SPX[c]; qy = py - SPY[c]; qz = pz - SPZ[c];
                  dep = qx * SNX[c] + qy * SNY[c] + qz * SNZ[c];
                  if (dep < 0 && dep > bs) {
                    qx = qx - dep * SNX[c]; qy = qy - dep * SNY[c]; qz = qz - dep * SNZ[c];
                    d20 = qx * SE1X[c] + qy * SE1Y[c] + qz * SE1Z[c]; d21 = qx * SE2X[c] + qy * SE2Y[c] + qz * SE2Z[c];
                    bv = (S11[c] * d20 - S01[c] * d21) / SDN[c]; bw = (S00[c] * d21 - S01[c] * d20) / SDN[c]; bu = 1 - bv - bw;
                    if (bu >= 0 && bv >= 0 && bw >= 0) { best = c; bs = dep; bu0 = bu; bv0 = bv; bw0 = bw; }
                  }
                }
                e = HEN[e];
              }
            }
          }
          // (a contact starts shallow, or goes on from the depth it had in the last step;
          // the triangle is kept for the steps until the next look)
          if (best > 0) {
            if (nCN < NCAP) {
              nCN = nCN + 1;
              CNL[nCN] = i; CNA[nCN] = SSA[best]; CNB[nCN] = SSB[best]; CNC[nCN] = SSC[best]; CNT[nCN] = SSD[best];
            }
            dep = 0 - bs;
            if (dep < 0.4 * dmax || (NPD[i] > 0 && Math.abs(dep - NPD[i]) < 0.4 * dmax)) {
              NPD[i] = dep;
              nSS = nSS + 1;
              c = best; ta = SSA[c]; tb = SSB[c]; tc = SSC[c]; tb0 = SSD[c]; nx = SNX[c]; ny = SNY[c]; nz = SNZ[c]; bu = bu0; bv = bv0; bw = bw0;
              M_ssApply();
            } else { NPD[i] = 0; }
          } else { NPD[i] = 0; }
          s = s + 1;
        }
      }
      a = a + 1;
    }
  }
  }
}
let ssTick = 0, nCN = 0, CNL = [], CNA = [], CNB = [], CNC = [], CNT = [];
let HH = [], HS = [], HEN = [], HET = [], hStamp = 0, nHE = 0, SBO = [], NPD = [], nSS = 0;
let OX0 = [], OX1 = [], OY0 = [], OY1 = [], OZ0 = [], OZ1 = [];
let SSA = [], SSB = [], SSC = [], SSD = [], SPX = [], SPY = [], SPZ = [], SNX = [], SNY = [], SNZ = [];
let SE1X = [], SE1Y = [], SE1Z = [], SE2X = [], SE2Y = [], SE2Z = [], S00 = [], S01 = [], S11 = [], SDN = [];

// ---------------- grabbing a soft body with the pointer ----------------
// The nodes within a cell and a half of the one picked each pulled towards where they
// were from it, around the point under the pointer at the depth it was picked at: a
// spring of the contact stiffness with damping (in the fast mode also in its solve).
function grabForces(h) {
  let k = 1, i = 0, kc = 0, cd = 0, tx = 0, ty = 0, tz = 0, d = 0;
  if (grabN > 0) {
    // the point under the pointer, followed at no more than GRABV (in simulated time: the
    // pointer may go far while a slow frame is worked out)
    tx = eyeX + fwX * grabZ + (rtX * grabSX + upX * grabSY) * grabZ / FOC - grabTX;
    ty = eyeY + fwY * grabZ + (rtY * grabSX + upY * grabSY) * grabZ / FOC - grabTY;
    tz = eyeZ + fwZ * grabZ + (rtZ * grabSX + upZ * grabSY) * grabZ / FOC - grabTZ;
    d = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (d > GRABV * h) { d = GRABV * h / d; tx = tx * d; ty = ty * d; tz = tz * d; }
    grabTX = grabTX + tx; grabTY = grabTY + ty; grabTZ = grabTZ + tz;
    tx = grabTX; ty = grabTY; tz = grabTZ;
    for (const _ of rep(grabN)) {
      i = GRL[k];
      kc = GRABK * NKC[i]; cd = GRABK * NCD[i];
      FX[i] = FX[i] + kc * (tx + GRX[k] - PX[i]) - cd * VX[i];
      FY[i] = FY[i] + kc * (ty + GRY[k] - PY[i]) - cd * VY[i];
      FZ[i] = FZ[i] + kc * (tz + GRZ[k] - PZ[i]) - cd * VZ[i];
      if (mode == 2) { KCN[i] = KCN[i] + kc; KCD[i] = KCD[i] + cd; }
      k = k + 1;
    }
  }
}
// pick the surface node nearest to the pointer (mx my) on the stage, and those around it
function grabPick(mx, my) {
  let s = 1, i = 0, d = 0, bd = 400, bi = 0, b = 0, r = 0;
  grabN = 0;
  for (const _ of rep(nSV)) {
    i = SVN[s];
    if (TZ[i] > NEAR) {
      d = sqr(SX[i] - mx) + sqr(SY[i] - my);
      if (d < bd) { bd = d; bi = i; }
    }
    s = s + 1;
  }
  if (bi > 0) {
    b = NSB[bi];
    r = sqr(1.6 * SBH[b]);
    i = SBN0[b];
    for (const _ of rep(SBN1[b] - SBN0[b] + 1)) {
      if (NIM[i] > 0 && sqr(PX[i] - PX[bi]) + sqr(PY[i] - PY[bi]) + sqr(PZ[i] - PZ[bi]) < r && grabN < 64) {
        grabN = grabN + 1;
        GRL[grabN] = i; GRX[grabN] = PX[i] - PX[bi]; GRY[grabN] = PY[i] - PY[bi]; GRZ[grabN] = PZ[i] - PZ[bi];
      }
      i = i + 1;
    }
    grabI = bi; grabZ = TZ[bi]; grabSX = mx; grabSY = my; grabTX = PX[bi]; grabTY = PY[bi]; grabTZ = PZ[bi];
  }
}
let grabTX = 0, grabTY = 0, grabTZ = 0, GRL = [], GRX = [], GRY = [], GRZ = [], grabN = 0, grabI = 0, grabZ = 1, grabSX = 0, grabSY = 0, grabOn = 0;

// ---------------- fast mode ----------------
// The theta method with the corotated linear material (the rotation of each tetrahedron
// from a polar decomposition, the stiffness of linear elasticity in its turned frame:
// for small strains the same material as the accurate mode; the volume force is that of
// the accurate mode, so a squashed tetrahedron is pushed back out). One linear system a step,
//   (M + th^2 h^2 K + h^2 Kc + h C) dv = h f - th h^2 K v - h^2 Kc v,   x += h (v + th dv)
// (th = TH: 1 would be backward Euler, which takes most of the bounce out of a jelly; the
// contact springs Kc and their damping C are taken fully implicitly, as only their diagonal
// is there), solved with a few conjugate gradient steps (Jacobi preconditioned). Large
// steps are stable, and at rest the right side is zero whatever the number of iterations,
// so what holds still is in the shape where the forces balance.

// rotation (r11..r33) of quaternion (qa qb qc qd)
function M_qmat() {
  r11 = 1 - 2 * (qc * qc + qd * qd); r12 = 2 * (qb * qc - qa * qd); r13 = 2 * (qb * qd + qa * qc);
  r21 = 2 * (qb * qc + qa * qd); r22 = 1 - 2 * (qb * qb + qd * qd); r23 = 2 * (qc * qd - qa * qb);
  r31 = 2 * (qb * qd - qa * qc); r32 = 2 * (qc * qd + qa * qb); r33 = 1 - 2 * (qb * qb + qc * qc);
}
// the rotation of F (in f1..f3): the quaternion of t turned towards it (Mueller et al. 2016),
// kept for the next step
function M_polar(t) {
  qa = TQW[t]; qb = TQX[t]; qc = TQY[t]; qd = TQZ[t];
  for (const _ of rep(PITER)) {
    M_qmat();
    ox = r21 * f1z - r31 * f1y + r22 * f2z - r32 * f2y + r23 * f3z - r33 * f3y;
    oy = r31 * f1x - r11 * f1z + r32 * f2x - r12 * f2z + r33 * f3x - r13 * f3z;
    oz = r11 * f1y - r21 * f1x + r12 * f2y - r22 * f2x + r13 * f3y - r23 * f3x;
    ow = Math.abs(r11 * f1x + r21 * f1y + r31 * f1z + r12 * f2x + r22 * f2y + r32 * f2z + r13 * f3x + r23 * f3y + r33 * f3z) + 0.000000001;
    ox = ox / ow; oy = oy / ow; oz = oz / ow;
    ow = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (ow > 0.000000001) {
      // turn by |o| radians about o: (cos, sin axis) of half of it, before q
      sw = cosd(ow * HALFDEG); sx = sind(ow * HALFDEG) / ow;
      ox = ox * sx; oy = oy * sx; oz = oz * sx;
      sx = sw * qb + ox * qa + oy * qd - oz * qc;
      sy = sw * qc + oy * qa + oz * qb - ox * qd;
      sz = sw * qd + oz * qa + ox * qc - oy * qb;
      qa = sw * qa - ox * qb - oy * qc - oz * qd;
      ow = Math.sqrt(qa * qa + sx * sx + sy * sy + sz * sz);
      qa = qa / ow; qb = sx / ow; qc = sy / ow; qd = sz / ow;
    }
  }
  TQW[t] = qa; TQX[t] = qb; TQY[t] = qc; TQZ[t] = qd;
  M_qmat();
}
// the corotated stress of f1..f3 (less `one` times the identity once turned back: 1 for the
// force at a place, 0 for the answer to a change) as pushes on the corners g1..g3
// (corner 0 gets minus their sum): -V (R sigma) Dm^-T
function M_coro(t, one, lv) {
  e11 = r11 * f1x + r21 * f1y + r31 * f1z - one;
  e22 = r12 * f2x + r22 * f2y + r32 * f2z - one;
  e33 = r13 * f3x + r23 * f3y + r33 * f3z - one;
  e12 = (r11 * f2x + r21 * f2y + r31 * f2z + r12 * f1x + r22 * f1y + r32 * f1z) / 2;
  e13 = (r11 * f3x + r21 * f3y + r31 * f3z + r13 * f1x + r23 * f1y + r33 * f1z) / 2;
  e23 = (r12 * f3x + r22 * f3y + r32 * f3z + r13 * f2x + r23 * f2y + r33 * f2z) / 2;
  mu = TMU[t]; la = lv * (TLA[t] - mu) * (e11 + e22 + e33);
  e11 = 2 * mu * e11 + la; e22 = 2 * mu * e22 + la; e33 = 2 * mu * e33 + la;
  e12 = 2 * mu * e12; e13 = 2 * mu * e13; e23 = 2 * mu * e23;
  // P = R sigma: column j is sum_i r_i sigma_ij
  p1x = r11 * e11 + r12 * e12 + r13 * e13; p1y = r21 * e11 + r22 * e12 + r23 * e13; p1z = r31 * e11 + r32 * e12 + r33 * e13;
  p2x = r11 * e12 + r12 * e22 + r13 * e23; p2y = r21 * e12 + r22 * e22 + r23 * e23; p2z = r31 * e12 + r32 * e22 + r33 * e23;
  p3x = r11 * e13 + r12 * e23 + r13 * e33; p3y = r21 * e13 + r22 * e23 + r23 * e33; p3z = r31 * e13 + r32 * e23 + r33 * e33;
  vol = 0 - TV[t];
  g1x = vol * (p1x * m11 + p2x * m12 + p3x * m13); g1y = vol * (p1y * m11 + p2y * m12 + p3y * m13); g1z = vol * (p1z * m11 + p2z * m12 + p3z * m13);
  g2x = vol * (p1x * m21 + p2x * m22 + p3x * m23); g2y = vol * (p1y * m21 + p2y * m22 + p3y * m23); g2z = vol * (p1z * m21 + p2z * m22 + p3z * m23);
  g3x = vol * (p1x * m31 + p2x * m32 + p3x * m33); g3y = vol * (p1y * m31 + p2y * m32 + p3y * m33); g3z = vol * (p1z * m31 + p2z * m32 + p3z * m33);
}
// (DX0 DY0 DZ0) = (wm M + c K + cc Kc + cd C) (SX0 SY0 SZ0): K the material with the
// rotations of this step, Kc the contact springs, C their damping (both taken the same in
// every direction)
function M_kapply(SX0, SY0, SZ0, DX0, DY0, DZ0, c, wm, cc, cd) {
  i = 1;
  for (const _ of rep(nN)) {
    w0 = wm * NMS[i] + cc * KCN[i] + cd * KCD[i];
    DX0[i] = w0 * SX0[i]; DY0[i] = w0 * SY0[i]; DZ0[i] = w0 * SZ0[i];
    i = i + 1;
  }
  t = 1;
  c0 = 0 - c;
  for (const _ of rep(nT)) {
    ta = TA[t]; tb = TB[t]; tc = TC[t]; td = TD[t];
    x0 = SX0[ta]; y0 = SY0[ta]; z0 = SZ0[ta];
    d1x = SX0[tb] - x0; d1y = SY0[tb] - y0; d1z = SZ0[tb] - z0;
    d2x = SX0[tc] - x0; d2y = SY0[tc] - y0; d2z = SZ0[tc] - z0;
    d3x = SX0[td] - x0; d3y = SY0[td] - y0; d3z = SZ0[td] - z0;
    m11 = M11[t]; m12 = M12[t]; m13 = M13[t]; m21 = M21[t]; m22 = M22[t]; m23 = M23[t]; m31 = M31[t]; m32 = M32[t]; m33 = M33[t];
    f1x = d1x * m11 + d2x * m21 + d3x * m31; f1y = d1y * m11 + d2y * m21 + d3y * m31; f1z = d1z * m11 + d2z * m21 + d3z * m31;
    f2x = d1x * m12 + d2x * m22 + d3x * m32; f2y = d1y * m12 + d2y * m22 + d3y * m32; f2z = d1z * m12 + d2z * m22 + d3z * m32;
    f3x = d1x * m13 + d2x * m23 + d3x * m33; f3y = d1y * m13 + d2y * m23 + d3y * m33; f3z = d1z * m13 + d2z * m23 + d3z * m33;
    r11 = TR11[t]; r12 = TR12[t]; r13 = TR13[t]; r21 = TR21[t]; r22 = TR22[t]; r23 = TR23[t]; r31 = TR31[t]; r32 = TR32[t]; r33 = TR33[t];
    M_coro(t, 0, 1);
    // K s is minus the push
    DX0[tb] = DX0[tb] + c0 * g1x; DY0[tb] = DY0[tb] + c0 * g1y; DZ0[tb] = DZ0[tb] + c0 * g1z;
    DX0[tc] = DX0[tc] + c0 * g2x; DY0[tc] = DY0[tc] + c0 * g2y; DZ0[tc] = DZ0[tc] + c0 * g2z;
    DX0[td] = DX0[td] + c0 * g3x; DY0[td] = DY0[td] + c0 * g3y; DZ0[td] = DZ0[td] + c0 * g3z;
    DX0[ta] = DX0[ta] - c0 * (g1x + g2x + g3x); DY0[ta] = DY0[ta] - c0 * (g1y + g2y + g3y); DZ0[ta] = DZ0[ta] - c0 * (g1z + g2z + g3z);
    t = t + 1;
  }
}

// the diagonal of the preconditioner: m + h^2 (an estimate of the node's own stiffness)
function fastDiag(h) {
  let i = 1, t = 1, a = 0, b = 0, c = 0, d = 0, q = 0;
  for (const _ of rep(nN)) { ZB[i] = NMS[i]; i = i + 1; }
  for (const _ of rep(nT)) {
    q = TH * TH * h * h * TV[t] * (TMU[t] + TLA[t] / 3);
    a = sqr(M11[t] + M21[t] + M31[t]) + sqr(M12[t] + M22[t] + M32[t]) + sqr(M13[t] + M23[t] + M33[t]);
    b = M11[t] * M11[t] + M12[t] * M12[t] + M13[t] * M13[t];
    c = M21[t] * M21[t] + M22[t] * M22[t] + M23[t] * M23[t];
    d = M31[t] * M31[t] + M32[t] * M32[t] + M33[t] * M33[t];
    ZB[TA[t]] = ZB[TA[t]] + q * a; ZB[TB[t]] = ZB[TB[t]] + q * b; ZB[TC[t]] = ZB[TC[t]] + q * c; ZB[TD[t]] = ZB[TD[t]] + q * d;
    t = t + 1;
  }
}
let ZD = [], ZB = [], KCN = [], KCD = [], fastH = 0, cgSum = 0;

function softFast(h) {
  let dm = 1 / (1 + sDamp * h), i = 1, t = 1, ta = 0, tb = 0, tc = 0, td = 0, x0 = 0, y0 = 0, z0 = 0, hh = h * h, vol = 0, mu = 0, la = 0, c0 = 0;
  let qa = 0, qb = 0, qc = 0, qd = 0, ow = 0, sw = 0, sx = 0, sy = 0, sz = 0;
  let r11 = 0, r12 = 0, r13 = 0, r21 = 0, r22 = 0, r23 = 0, r31 = 0, r32 = 0, r33 = 0;
  let d1x = 0, d1y = 0, d1z = 0, d2x = 0, d2y = 0, d2z = 0, d3x = 0, d3y = 0, d3z = 0;
  let m11 = 0, m12 = 0, m13 = 0, m21 = 0, m22 = 0, m23 = 0, m31 = 0, m32 = 0, m33 = 0;
  let f1x = 0, f1y = 0, f1z = 0, f2x = 0, f2y = 0, f2z = 0, f3x = 0, f3y = 0, f3z = 0;
  let e11 = 0, e12 = 0, e13 = 0, e22 = 0, e23 = 0, e33 = 0;
  let p1x = 0, p1y = 0, p1z = 0, p2x = 0, p2y = 0, p2z = 0, p3x = 0, p3y = 0, p3z = 0;
  let g1x = 0, g1y = 0, g1z = 0, g2x = 0, g2y = 0, g2z = 0, g3x = 0, g3y = 0, g3z = 0;
  let c1x = 0, c1y = 0, c1z = 0, c2x = 0, c2y = 0, c2z = 0, c3x = 0, c3y = 0, c3z = 0;
  let rz = 0, rz0 = 0, rz1 = 0, pap = 0, al = 0, be = 0, k = 0, w0 = 0;
  let b = 1, s = 0, r = 0, hit = 0, dd = 0, nx = 0, ny = 0, nz = 0, qx = 0, qy = 0, qz = 0, lx = 0, ly = 0, lz = 0, ax = 0, ay = 0, az = 0, sg = 0;
  let ox = 0, oy = 0, oz = 0, ux = 0, uy = 0, uz = 0, un = 0, fl = 0, lim = 0, jx = 0, jy = 0, jz = 0, tx = 0, ty = 0, tz = 0;
  if (fastH != h) { fastDiag(h); fastH = h; }
  // the rotations, and the forces at this place (contacts last: their springs and damping
  // also go into the system, so they are as stable as the material at any step)
  for (const _ of rep(nN)) { FX[i] = 0; FY[i] = 0 - grav * NMS[i]; FZ[i] = 0; KCN[i] = 0; KCD[i] = 0; i = i + 1; }
  for (const _ of rep(nT)) {
    M_tetF(t);
    M_polar(t);
    // (kept for the stiffness passes of this step)
    TR11[t] = r11; TR12[t] = r12; TR13[t] = r13; TR21[t] = r21; TR22[t] = r22; TR23[t] = r23; TR31[t] = r31; TR32[t] = r32; TR33[t] = r33;
    M_coro(t, 1, 0);
    // the volume as the accurate mode has it, lambda (J - 1) cof F: it pushes a squashed or
    // turned-over tetrahedron back out, which the corotated term alone does not
    M_cof();
    vol = (TMU[t] - TLA[t]) * (f1x * c1x + f1y * c1y + f1z * c1z - 1) * TV[t];
    g1x = g1x + vol * (c1x * m11 + c2x * m12 + c3x * m13); g1y = g1y + vol * (c1y * m11 + c2y * m12 + c3y * m13); g1z = g1z + vol * (c1z * m11 + c2z * m12 + c3z * m13);
    g2x = g2x + vol * (c1x * m21 + c2x * m22 + c3x * m23); g2y = g2y + vol * (c1y * m21 + c2y * m22 + c3y * m23); g2z = g2z + vol * (c1z * m21 + c2z * m22 + c3z * m23);
    g3x = g3x + vol * (c1x * m31 + c2x * m32 + c3x * m33); g3y = g3y + vol * (c1y * m31 + c2y * m32 + c3y * m33); g3z = g3z + vol * (c1z * m31 + c2z * m32 + c3z * m33);
    FX[tb] = FX[tb] + g1x; FY[tb] = FY[tb] + g1y; FZ[tb] = FZ[tb] + g1z;
    FX[tc] = FX[tc] + g2x; FY[tc] = FY[tc] + g2y; FZ[tc] = FZ[tc] + g2z;
    FX[td] = FX[td] + g3x; FY[td] = FY[td] + g3y; FZ[td] = FZ[td] + g3z;
    FX[ta] = FX[ta] - g1x - g2x - g3x; FY[ta] = FY[ta] - g1y - g2y - g3y; FZ[ta] = FZ[ta] - g1z - g2z - g3z;
    t = t + 1;
  }
  softContacts(h);
  softSoft(h);
  grabForces(h);
  // the right side h f - h^2 K v (K v into C)
  M_kapply(VX, VY, VZ, CX, CY, CZ, TH, 0, 1, 0);
  i = 1; rz = 0;
  for (const _ of rep(nN)) {
    if (NIM[i] > 0) {
      RRX[i] = h * FX[i] - hh * CX[i]; RRY[i] = h * FY[i] - hh * CY[i]; RRZ[i] = h * FZ[i] - hh * CZ[i];
    } else { RRX[i] = 0; RRY[i] = 0; RRZ[i] = 0; }
    DVX[i] = 0; DVY[i] = 0; DVZ[i] = 0;
    ZD[i] = ZB[i] + hh * KCN[i] + h * KCD[i];
    PPX[i] = RRX[i] / ZD[i]; PPY[i] = RRY[i] / ZD[i]; PPZ[i] = RRZ[i] / ZD[i];
    rz = rz + RRX[i] * PPX[i] + RRY[i] * PPY[i] + RRZ[i] * PPZ[i];
    i = i + 1;
  }
  // conjugate gradients (held nodes stay out: their residual and direction are zero), until
  // the residual is CGTOL of what it was
  k = 0; rz0 = rz * CGTOL * CGTOL;
  while (k < fastCG && rz > rz0) {
    M_kapply(PPX, PPY, PPZ, CX, CY, CZ, TH * TH * hh, 1, hh, h);
    i = 1; pap = 0;
    for (const _ of rep(nN)) {
      if (NIM[i] > 0) { pap = pap + PPX[i] * CX[i] + PPY[i] * CY[i] + PPZ[i] * CZ[i]; }
      i = i + 1;
    }
    al = rz / pap;
    i = 1; rz1 = 0;
    for (const _ of rep(nN)) {
      if (NIM[i] > 0) {
        DVX[i] = DVX[i] + al * PPX[i]; DVY[i] = DVY[i] + al * PPY[i]; DVZ[i] = DVZ[i] + al * PPZ[i];
        RRX[i] = RRX[i] - al * CX[i]; RRY[i] = RRY[i] - al * CY[i]; RRZ[i] = RRZ[i] - al * CZ[i];
        rz1 = rz1 + (RRX[i] * RRX[i] + RRY[i] * RRY[i] + RRZ[i] * RRZ[i]) / ZD[i];
      }
      i = i + 1;
    }
    be = rz1 / rz; rz = rz1;
    i = 1;
    for (const _ of rep(nN)) {
      PPX[i] = RRX[i] / ZD[i] + be * PPX[i]; PPY[i] = RRY[i] / ZD[i] + be * PPY[i]; PPZ[i] = RRZ[i] / ZD[i] + be * PPZ[i];
      i = i + 1;
    }
    k = k + 1;
  }
  cgSum = cgSum + k;
  // the move
  i = 1;
  for (const _ of rep(nN)) {
    QX[i] = PX[i]; QY[i] = PY[i]; QZ[i] = PZ[i];
    if (NIM[i] > 0) {
      PX[i] = PX[i] + h * (VX[i] + TH * DVX[i]); PY[i] = PY[i] + h * (VY[i] + TH * DVY[i]); PZ[i] = PZ[i] + h * (VZ[i] + TH * DVZ[i]);
      VX[i] = (VX[i] + DVX[i]) * dm; VY[i] = (VY[i] + DVY[i]) * dm; VZ[i] = (VZ[i] + DVZ[i]) * dm;
    }
    i = i + 1;
  }
}

// elastic energy of all soft bodies (and each node's share, for the colours)
function softElastic() {
  let t = 1, i = 1, ta = 0, tb = 0, tc = 0, td = 0, x0 = 0, y0 = 0, z0 = 0, e = 0, sum = 0, la = 0, j = 0;
  let d1x = 0, d1y = 0, d1z = 0, d2x = 0, d2y = 0, d2z = 0, d3x = 0, d3y = 0, d3z = 0;
  let m11 = 0, m12 = 0, m13 = 0, m21 = 0, m22 = 0, m23 = 0, m31 = 0, m32 = 0, m33 = 0;
  let f1x = 0, f1y = 0, f1z = 0, f2x = 0, f2y = 0, f2z = 0, f3x = 0, f3y = 0, f3z = 0;
  for (const _ of rep(nN)) { NE[i] = 0; NEC[i] = 0; i = i + 1; }
  for (const _ of rep(nT)) {
    M_tetF(t);
    j = f1x * (f2y * f3z - f2z * f3y) - f2x * (f1y * f3z - f1z * f3y) + f3x * (f1y * f2z - f1z * f2y);
    la = TLA[t];
    e = TMU[t] / 2 * (f1x * f1x + f1y * f1y + f1z * f1z + f2x * f2x + f2y * f2y + f2z * f2z + f3x * f3x + f3y * f3y + f3z * f3z - 3) + la / 2 * sqr(j - TAL[t]) - sqr(TMU[t]) / (2 * la);
    sum = sum + e * TV[t];
    NE[ta] = NE[ta] + e; NE[tb] = NE[tb] + e; NE[tc] = NE[tc] + e; NE[td] = NE[td] + e;
    NEC[ta] = NEC[ta] + 1; NEC[tb] = NEC[tb] + 1; NEC[tc] = NEC[tc] + 1; NEC[td] = NEC[td] + 1;
    t = t + 1;
  }
  eElastic = sum;
}
let eElastic = 0, eCon = 0;

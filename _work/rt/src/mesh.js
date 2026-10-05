// ============================================================
// The triangle structure (a stepped pyramid) and its BVH.
//
// What never changes - vertices, planes, colours in and out of the sun, the
// tree - comes from the build (mesh.mjs) as lists. Each frame the vertices are
// moved into camera space and the tree's boxes are refitted there, so every ray
// stays in camera space.
//
//   seen directly   a triangle is a polygon on the screen: a row meets it between two
//                   x, found from its edges (no ray is needed to find a triangle)
//   its shadow      on the floor it is again a polygon (each vertex's shadow point);
//                   on a sphere or on the structure itself: a shadow ray through the BVH
//   in a mirror     a mirror ray through the BVH
// ============================================================
const NEARP = 48;             // triangles are cut off this close to the camera
const TEPS = 24;              // a shadow ray starts this far along (x4096 of the direction)
const BEPS = 9000;            // slack at a triangle's edges (of 2^22)
const NPOLY = NT * 2;         // screen polygons: the faces, then their floor shadows

let VA = [];         // vertices in camera space
let VB = [];
let VC = [];
let SVA = [];        // their shadow points on the floor
let SVB = [];
let SVC = [];
let TNX = [];        // per triangle, camera space: plane normal (x1024) and n . p
let TNY = [];
let TNZ = [];
let TPD = [];
let TOA = [];        // its first vertex
let TOB = [];
let TOC = [];
let C1X = [];        // the two planes that give a point's place inside the triangle
let C1Y = [];
let C1Z = [];
let C2X = [];
let C2Y = [];
let C2Z = [];
let TG = [];         // per row: ny*v + nz*FOC
let BLX = [];        // the tree's boxes, camera space
let BLY = [];
let BLZ = [];
let BHX = [];
let BHY = [];
let BHZ = [];
let PN = [];         // screen polygons: corners (0 = not on screen), then their x (quarter pixels) and y (1/16)
let PX = [];
let PY = [];
let PK0 = [];        // rows a polygon can be in
let PK1 = [];
let VT = [];         // faces on screen this frame
let VS = [];         // floor shadows on screen this frame
let MSH = [];        // spheres that can shade the structure
let SHM = [];        // can a mesh shade sphere i?
let MSF = [];
let nvt = 0, nvs = 0, nmsh = 0, bvT = 0, bvTri = 0, bvCalls = 0;

function meshInit() {
  let i = 0;
  while (i < NV + 1) { VA.push(0); VB.push(0); VC.push(0); SVA.push(0); SVB.push(0); SVC.push(0); i = i + 1; }
  i = 0;
  while (i < NT + 1) {
    TNX.push(0); TNY.push(0); TNZ.push(0); TPD.push(0); TOA.push(0); TOB.push(0); TOC.push(0);
    C1X.push(0); C1Y.push(0); C1Z.push(0); C2X.push(0); C2Y.push(0); C2Z.push(0); TG.push(0);
    VT.push(0); VS.push(0);
    i = i + 1;
  }
  i = 0;
  while (i < BN + 1) { BLX.push(0); BLY.push(0); BLZ.push(0); BHX.push(0); BHY.push(0); BHZ.push(0); i = i + 1; }
  i = 0;
  while (i < NPOLY + 1) { PN.push(0); PK0.push(0); PK1.push(0); PX.push(0); PX.push(0); PX.push(0); PX.push(0); PY.push(0); PY.push(0); PY.push(0); PY.push(0); i = i + 1; }
  i = 0;
  while (i < NS + 2) { MSH.push(0); SHM.push(0); MSF.push(0); i = i + 1; }
}

// a corner onto the screen
function M_pv(a_, b_, c_) {
  pn = pn + 1;
  PX[pb4 + pn] = idiv(a_ * FOC * 4, c_); PY[pb4 + pn] = idiv(b_ * FOC * 16, c_);
}
// the edge from corner 0 to corner 1, cut at the near plane
function M_pe(a0_, b0_, c0_, a1_, b1_, c1_) {
  if (c0_ >= NEARP) {
    M_pv(a0_, b0_, c0_);
    if (c1_ < NEARP) {
      ia = a0_ + idiv((a1_ - a0_) * (NEARP - c0_), c1_ - c0_); ib = b0_ + idiv((b1_ - b0_) * (NEARP - c0_), c1_ - c0_);
      M_pv(ia, ib, NEARP);
    }
  } else {
    if (c1_ >= NEARP) {
      ia = a0_ + idiv((a1_ - a0_) * (NEARP - c0_), c1_ - c0_); ib = b0_ + idiv((b1_ - b0_) * (NEARP - c0_), c1_ - c0_);
      M_pv(ia, ib, NEARP);
    }
  }
}
// polygon p_ from the triangle whose corners are in a1..c3: its screen corners and its rows
function M_poly(p_) {
  pn = 0; pb4 = (p_ - 1) * 4;
  M_pe(a1, b1, c1, a2, b2, c2);
  M_pe(a2, b2, c2, a3, b3, c3);
  M_pe(a3, b3, c3, a1, b1, c1);
  if (pn >= 3) {
    ylo = PY[pb4 + 1]; yhi = ylo; xlo = PX[pb4 + 1]; xhi = xlo;
    j = 2;
    while (j <= pn) {
      yy = PY[pb4 + j]; xx = PX[pb4 + j];
      if (yy < ylo) { ylo = yy; }
      if (yy > yhi) { yhi = yy; }
      if (xx < xlo) { xlo = xx; }
      if (xx > xhi) { xhi = xx; }
      j = j + 1;
    }
    k0 = 0 - idiv(yhi - v16, rh16);
    k1 = idiv(v16 - ylo, rh16);
    if (k0 < 0) { k0 = 0; }
    if (k1 > nrw - 1) { k1 = nrw - 1; }
    if (k0 > k1) { pn = 0; }
    if (xhi < -960) { pn = 0; }
    if (xlo > 960) { pn = 0; }
    PK0[p_] = k0; PK1[p_] = k1;
  } else { pn = 0; }
  PN[p_] = pn;
}

// per frame
function meshSetup() {
  let rX = gRx, rZ = gRz, uX = gUx, uY = gUy, uZ = gUz, fX = gFx, fY = gFy, fZ = gFz;
  let cmx = camX, cmy = camY, cmz = camZ;
  let nrw = nrow, v16 = v0 * 16, rh16 = rowH * 16;
  let i = 1, dx = 0, dy = 0, dz = 0, t = 0, v1 = 0, v2 = 0, v3 = 0, wx = 0, wy = 0, wz = 0;
  let a1 = 0, b1 = 0, c1 = 0, a2 = 0, b2 = 0, c2 = 0, a3 = 0, b3 = 0, c3 = 0, nx = 0, ny = 0, nz = 0;
  // the vertices, and their shadow points on the floor
  while (i <= NV) {
    dx = MVX[i] - cmx; dy = MVY[i] - cmy; dz = MVZ[i] - cmz;
    VA[i] = idiv(dx * rX + dz * rZ, 1024); VB[i] = idiv(dx * uX + dy * uY + dz * uZ, 1024); VC[i] = idiv(dx * fX + dy * fY + dz * fZ, 1024);
    dx = MSX[i] - cmx; dz = MSZ[i] - cmz;
    SVA[i] = idiv(dx * rX + dz * rZ, 1024); SVB[i] = idiv(dx * uX - cmy * uY + dz * uZ, 1024); SVC[i] = idiv(dx * fX - cmy * fY + dz * fZ, 1024);
    i = i + 1;
  }
  nvt = 0; nvs = 0;
  t = 1;
  while (t <= NT) {
    v1 = TV1[t]; v2 = TV2[t]; v3 = TV3[t];
    wx = TWX[t]; wy = TWY[t]; wz = TWZ[t];
    nx = idiv(wx * rX + wz * rZ, 1024); ny = idiv(wx * uX + wy * uY + wz * uZ, 1024); nz = idiv(wx * fX + wy * fY + wz * fZ, 1024);
    a1 = VA[v1]; b1 = VB[v1]; c1 = VC[v1];
    TNX[t] = nx; TNY[t] = ny; TNZ[t] = nz;
    TPD[t] = nx * a1 + ny * b1 + nz * c1;
    TOA[t] = a1; TOB[t] = b1; TOC[t] = c1;
    wx = T1X[t]; wy = T1Y[t]; wz = T1Z[t];
    C1X[t] = idiv(wx * rX + wz * rZ, 1024); C1Y[t] = idiv(wx * uX + wy * uY + wz * uZ, 1024); C1Z[t] = idiv(wx * fX + wy * fY + wz * fZ, 1024);
    wx = T2X[t]; wy = T2Y[t]; wz = T2Z[t];
    C2X[t] = idiv(wx * rX + wz * rZ, 1024); C2Y[t] = idiv(wx * uX + wy * uY + wz * uZ, 1024); C2Z[t] = idiv(wx * fX + wy * fY + wz * fZ, 1024);
    PN[t] = 0; PN[NT + t] = 0;
    if (TPD[t] < 0) {
      // it faces the camera
      a2 = VA[v2]; b2 = VB[v2]; c2 = VC[v2]; a3 = VA[v3]; b3 = VB[v3]; c3 = VC[v3];
      M_poly(t);
      if (pn > 0) { nvt = nvt + 1; VT[nvt] = t; }
    }
    if (TLIT[t] == 1) {
      // it faces the sun: its shadow on the floor
      a1 = SVA[v1]; b1 = SVB[v1]; c1 = SVC[v1]; a2 = SVA[v2]; b2 = SVB[v2]; c2 = SVC[v2]; a3 = SVA[v3]; b3 = SVB[v3]; c3 = SVC[v3];
      M_poly(NT + t);
      if (pn > 0) { nvs = nvs + 1; VS[nvs] = NT + t; }
    }
    t = t + 1;
  }
  // the tree's boxes, leaves first (a node's children come after it)
  i = BN;
  while (i >= 1) {
    if (BCNT[i] > 0) {
      t = BFIRST[i];
      v1 = TV1[t];
      a1 = VA[v1]; a2 = a1; b1 = VB[v1]; b2 = b1; c1 = VC[v1]; c2 = c1;
      dz = t + BCNT[i];
      while (t < dz) {
        dx = 1;
        while (dx <= 3) {
          v1 = TV1[t];
          if (dx == 2) { v1 = TV2[t]; }
          if (dx == 3) { v1 = TV3[t]; }
          wx = VA[v1]; wy = VB[v1]; wz = VC[v1];
          if (wx < a1) { a1 = wx; }
          if (wx > a2) { a2 = wx; }
          if (wy < b1) { b1 = wy; }
          if (wy > b2) { b2 = wy; }
          if (wz < c1) { c1 = wz; }
          if (wz > c2) { c2 = wz; }
          dx = dx + 1;
        }
        t = t + 1;
      }
      BLX[i] = a1 - 3; BHX[i] = a2 + 3; BLY[i] = b1 - 3; BHY[i] = b2 + 3; BLZ[i] = c1 - 3; BHZ[i] = c2 + 3;
    } else {
      v1 = i + 1; v2 = BRIGHT[i];
      a1 = BLX[v1]; if (BLX[v2] < a1) { a1 = BLX[v2]; }
      a2 = BHX[v1]; if (BHX[v2] > a2) { a2 = BHX[v2]; }
      b1 = BLY[v1]; if (BLY[v2] < b1) { b1 = BLY[v2]; }
      b2 = BHY[v1]; if (BHY[v2] > b2) { b2 = BHY[v2]; }
      c1 = BLZ[v1]; if (BLZ[v2] < c1) { c1 = BLZ[v2]; }
      c2 = BHZ[v1]; if (BHZ[v2] > c2) { c2 = BHZ[v2]; }
      BLX[i] = a1; BHX[i] = a2; BLY[i] = b1; BHY[i] = b2; BLZ[i] = c1; BHZ[i] = c2;
    }
    i = i - 1;
  }
  // the sphere round a mesh stands in for it wherever "can a ray get there at all?" is asked
  i = 1;
  while (i <= NS) { SHM[i] = 0; MSF[i] = 0; i = i + 1; }
  let ms = NS + 1, rho = 0, swx = 0, swz = 0, gi0 = 0, gi1 = 0, gj0 = 0, gj1 = 0, gi = 0, gj = 0, gx = 0, mr = 0;
  while (ms <= NS + NM) {
    mr = SRAD[ms];
    dx = SWX[ms] - cmx; dy = SWY[ms] - cmy; dz = SWZ[ms] - cmz;
    SA[ms] = idiv(dx * rX + dz * rZ, 1024); SB[ms] = idiv(dx * uX + dy * uY + dz * uZ, 1024); SC[ms] = idiv(dx * fX + dy * fY + dz * fZ, 1024);
    // who can shade whom: sphere i shades the mesh if it lies towards the sun inside the tube the mesh casts back
    i = 1;
    while (i <= NS) {
      dx = SA[i] - SA[ms]; dy = SB[i] - SB[ms]; dz = SC[i] - SC[ms];
      wx = dx * gLx + dy * gLy + dz * gLz;
      wy = SRAD[i] + mr;
      if (dx * dx + dy * dy + dz * dz - idiv(wx * wx, gLL) < wy * wy) {
        // (where the two overlap, each may shade the other)
        wz = 0;
        if (dx * dx + dy * dy + dz * dz < wy * wy) { wz = 1; }
        if (wx < 0) { SHM[i] = 1; } else { if (wz == 1) { SHM[i] = 1; } }
        if (wx > 0) { MSF[i] = 1; } else { if (wz == 1) { MSF[i] = 1; } }
      }
      i = i + 1;
    }
    // the floor grid: tiles a mesh may shade are marked -2 (a mesh, and any sphere)
    rho = idiv(mr * 1024, LWY) + 8;
    swx = SWX[ms] - idiv(LWX * SWY[ms], LWY); swz = SWZ[ms] - idiv(LWZ * SWY[ms], LWY);
    gi0 = idiv(swx + GOFF - rho, CELL); gi1 = idiv(swx + GOFF + rho, CELL);
    gj0 = idiv(swz + GOFF - rho, CELL); gj1 = idiv(swz + GOFF + rho, CELL);
    if (gi0 < 0) { gi0 = 0; }
    if (gj0 < 0) { gj0 = 0; }
    if (gi1 > GN - 1) { gi1 = GN - 1; }
    if (gj1 > GN - 1) { gj1 = GN - 1; }
    gi = gi0;
    while (gi <= gi1) {
      gj = gj0;
      while (gj <= gj1) {
        gx = gi * GN + gj + 1;
        if (GRID[gx] == 0) { ngt = ngt + 1; GTOUCH[ngt] = gx; }
        GRID[gx] = -2;
        gj = gj + 1;
      }
      gi = gi + 1;
    }
    ms = ms + 1;
  }
  nmsh = 0;
  i = 1;
  while (i <= NS) { if (MSF[i] == 1) { nmsh = nmsh + 1; MSH[nmsh] = i; } i = i + 1; }
}

// ---- a ray through the tree ----
// From o along d (camera space). any = 1: is anything in the way at all (a shadow ray)?
// any = 0: the nearest hit. skip: a mesh whose triangles do not count (0 = none).
// Out: bvTri (0 = none) and bvT (x4096 of d).
// The tree is walked without a stack: a node that is missed or done hands on to BSKIP.
function bvhHit(ox, oy, oz, dx, dy, dz, any, skip) {
  let ix = 67108864, iy = 67108864, iz = 67108864;
  if (dx != 0) { ix = idiv(67108864, dx); }
  if (dy != 0) { iy = idiv(67108864, dy); }
  if (dz != 0) { iz = idiv(67108864, dz); }
  let i = 1, best = BIG, tri = 0, lo = 0, hi = 0, l2 = 0, h2 = 0, cnt = 0, t = 0, te = 0;
  let den = 0, num = 0, tq = 0, hx = 0, hy = 0, hz = 0, e1 = 0, e2 = 0, nx = 0, ny = 0, nz = 0;
  while (i > 0) {
    // the box: where the ray is between each pair of walls
    if (ix >= 0) { lo = (BLX[i] - ox) * ix; hi = (BHX[i] - ox) * ix; } else { lo = (BHX[i] - ox) * ix; hi = (BLX[i] - ox) * ix; }
    if (iy >= 0) { l2 = (BLY[i] - oy) * iy; h2 = (BHY[i] - oy) * iy; } else { l2 = (BHY[i] - oy) * iy; h2 = (BLY[i] - oy) * iy; }
    if (l2 > lo) { lo = l2; }
    if (h2 < hi) { hi = h2; }
    if (iz >= 0) { l2 = (BLZ[i] - oz) * iz; h2 = (BHZ[i] - oz) * iz; } else { l2 = (BHZ[i] - oz) * iz; h2 = (BLZ[i] - oz) * iz; }
    if (l2 > lo) { lo = l2; }
    if (h2 < hi) { hi = h2; }
    cnt = -1;
    if (lo <= hi) { if (hi >= 0) { if (lo <= best * 16384) { cnt = BCNT[i]; } } }
    if (cnt < 0) { i = BSKIP[i]; }
    else {
      if (cnt == 0) { i = i + 1; }
      else {
        t = BFIRST[i]; te = t + cnt;
        i = BSKIP[i];
        while (t < te) {
          nx = TNX[t]; ny = TNY[t]; nz = TNZ[t];
          den = nx * dx + ny * dy + nz * dz;
          if (TMESH[t] == skip) { den = 1; }
          if (den < 0) {
            // the ray goes in through this face's plane
            num = TPD[t] - nx * ox - ny * oy - nz * oz;
            if (num < 0) {
              tq = idiv(num * 4096, den);
              if (tq > TEPS) {
                if (tq < best) {
                  hx = ox + idiv(dx * tq, 4096) - TOA[t]; hy = oy + idiv(dy * tq, 4096) - TOB[t]; hz = oz + idiv(dz * tq, 4096) - TOC[t];
                  e1 = C1X[t] * hx + C1Y[t] * hy + C1Z[t] * hz;
                  if (e1 >= 0 - BEPS) {
                    e2 = C2X[t] * hx + C2Y[t] * hy + C2Z[t] * hz;
                    if (e2 >= 0 - BEPS) {
                      if (e1 + e2 <= 4194304 + BEPS) {
                        best = tq; tri = t;
                        if (any == 1) { t = te; i = 0; }
                      }
                    }
                  }
                }
              }
            }
          }
          t = t + 1;
        }
      }
    }
  }
  bvT = best; bvTri = tri;
  bvCalls = bvCalls + 1;
}

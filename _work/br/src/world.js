// ===================================================================== world
// terrain height, collision with the prefabs' boxes (kept in each prefab's own frame)

// height of the terrain at (x, z) cm: two triangles a cell, split on the x = z diagonal
function hAt(x, z) {
  let fx = x / CS, fz = z / CS;
  if (fx < 0) { fx = 0; }
  if (fz < 0) { fz = 0; }
  if (fx > CELLS - 0.001) { fx = CELLS - 0.001; }
  if (fz > CELLS - 0.001) { fz = CELLS - 0.001; }
  let cx = Math.floor(fx), cz = Math.floor(fz);
  let u = fx - cx, v = fz - cz;
  let k = cz * GRID + cx + 1;
  let h00 = TH[k], h10 = TH[k + 1], h01 = TH[k + GRID], h11 = TH[k + GRID + 1];
  let h = 0;
  if (u >= v) { h = h00 + (h10 - h00) * u + (h11 - h10) * v; } else { h = h00 + (h11 - h01) * u + (h01 - h00) * v; }
  return h;
}

// one pass over the boxes near (x, z): does a cylinder (radius rad) standing with its
// feet at y and height hh hit anything above y + step? and the highest top under it that
// is at most y + step (the ground). results: hitB (0/1), gndB (cm), bushB (in a bush: 1)
let hitB = 0, gndB = 0, bushB = 0, hitInst = 0;
function scanBoxes(x, y, z, rad, hh, step) {
  hitB = 0; bushB = 0; hitInst = 0;
  gndB = hAt(x, z);
  let gx = Math.floor((x - 1600) / CS), gz = Math.floor((z - 1600) / CS);
  let ix = gx, iz = gz;
  while (iz <= gz + 1) {
    ix = gx;
    while (ix <= gx + 1) {
      if (ix >= 0 && ix < CELLS && iz >= 0 && iz < CELLS) { M_scanCell(iz * CELLS + ix + 1); }
      ix = ix + 1;
    }
    iz = iz + 1;
  }
  // v1.1: the vehicles are boxes too (but not the one being moved: vSelf)
  let v = 1;
  while (v <= NV) {
    if (VON[v] > 0) { if (v != vSelf) {
      let dx = x - VX[v], dz = z - VZ[v];
      if (Math.abs(dx) + Math.abs(dz) < 700) {
        let k = VK[v], cs = cosd(VYAW[v]), sn = sind(VYAW[v]);
        let lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
        if (Math.abs(lx) < VKHW[k] + rad) { if (Math.abs(lz) < VKHL[k] + rad) {
          let top = VY[v] + VKTOP[k];
          if (top <= y + step) { if (top > gndB) { gndB = top; } } else { if (VY[v] + 20 < y + hh) { hitB = 1; } }
        } }
      }
    } }
    v = v + 1;
  }
}
function M_scanCell(c) {
  let i = CI0[c], ie = i + CIN[c];
  while (i < ie) {
    let pf = IPF[i];
    let ex = x - IX[i], ez = z - IZ[i];
    let rr = PFR[pf] + rad;
    if (Math.abs(ex) < rr) { if (Math.abs(ez) < rr) {
      let r = IR[i];
      let lx = ex, lz = ez;
      if (r == 1) { lx = 0 - ez; lz = ex; }
      if (r == 2) { lx = 0 - ex; lz = 0 - ez; }
      if (r == 3) { lx = ez; lz = 0 - ex; }
      let ly = y - IY[i];
      if (PFBU[pf] == 1) { if (Math.abs(lx) < 120) { if (Math.abs(lz) < 120) { bushB = 1; } } }
      let b = PFC0[pf], be = b + PFCN[pf];
      while (b < be) {
        if (lx > CBX0[b] - rad) { if (lx < CBX1[b] + rad) { if (lz > CBZ0[b] - rad) { if (lz < CBZ1[b] + rad) {
          let top = CBY1[b];
          if (top <= ly + step) {
            if (top + IY[i] > gndB) { gndB = top + IY[i]; }
          } else {
            if (CBY0[b] < ly + hh) { hitB = 1; hitInst = i; }
          }
        } } } }
        b = b + 1;
      }
    } }
    i = i + 1;
  }
}

// a segment from (x0,y0,z0) to (x1,y1,z1): the first box it hits. results: rayT (0..1, 1 = nothing),
// rayInst. Walks the cells the segment crosses (DDA) and tests the boxes of the things in them
let rayT = 1, rayInst = 0, rayNX = 0, rayNY = 0, rayNZ = 0;
function rayCast(x0, y0, z0, x1, y1, z1) {
  rayT = 1; rayInst = 0;
  let dx = x1 - x0, dz = z1 - z0;
  let cx = Math.floor(x0 / CS), cz = Math.floor(z0 / CS);
  let ex = Math.floor(x1 / CS), ez = Math.floor(z1 / CS);
  let stx = 1, stz = 1;
  if (dx < 0) { stx = -1; }
  if (dz < 0) { stz = -1; }
  // t of the next cell border along x and z, and the step between borders
  let tx = 2, tz = 2, ddx = 2, ddz = 2;
  if (dx != 0) { ddx = CS / Math.abs(dx); if (stx > 0) { tx = ((cx + 1) * CS - x0) / dx; } else { tx = (cx * CS - x0) / dx; } }
  if (dz != 0) { ddz = CS / Math.abs(dz); if (stz > 0) { tz = ((cz + 1) * CS - z0) / dz; } else { tz = (cz * CS - z0) / dz; } }
  let go = 1, tcell = 0, guard = 0;
  while (go == 1) {
    // the things of this cell and its neighbours reach a little over its borders: test this cell and
    // the one beside it the segment is nearest to (props cross borders by at most their radius)
    if (cx >= 0 && cx < CELLS && cz >= 0 && cz < CELLS) { rayCell(cz * CELLS + cx + 1, x0, y0, z0, x1, y1, z1); }
    if (rayT <= tcell) { go = 0; }
    if (cx == ex && cz == ez) { go = 0; }
    if (go == 1) {
      if (tx < tz) { tcell = tx; tx = tx + ddx; cx = cx + stx; } else { tcell = tz; tz = tz + ddz; cz = cz + stz; }
      if (tcell > rayT) { go = 0; }
      if (tcell > 1) { go = 0; }
    }
    guard = guard + 1;
    if (guard > 200) { go = 0; }
  }
}
// the segment against the boxes of the things in cell c (slab test in each thing's own frame)
function rayCell(c, x0, y0, z0, x1, y1, z1) {
  let i = CI0[c], ie = i + CIN[c];
  while (i < ie) {
    let pf = IPF[i];
    if (PFCN[pf] > 0) {
      let r = IR[i];
      let ax = x0 - IX[i], az = z0 - IZ[i], bx = x1 - IX[i], bz = z1 - IZ[i];
      let lax = ax, laz = az, lbx = bx, lbz = bz;
      if (r == 1) { lax = 0 - az; laz = ax; lbx = 0 - bz; lbz = bx; }
      if (r == 2) { lax = 0 - ax; laz = 0 - az; lbx = 0 - bx; lbz = 0 - bz; }
      if (r == 3) { lax = az; laz = 0 - ax; lbx = bz; lbz = 0 - bx; }
      let lay = y0 - IY[i], lby = y1 - IY[i];
      let ddx = lbx - lax, ddy = lby - lay, ddz = lbz - laz;
      // the prefab's footprint first
      let pr = PFR[pf];
      if (segNear(lax, laz, lbx, lbz, pr) == 1) {
        let b = PFC0[pf], be = b + PFCN[pf];
        while (b < be) {
          M_slab(b);
          b = b + 1;
        }
      }
    }
    i = i + 1;
  }
}
// does the segment pass within rad of the origin (2D, rough: its box)?
function segNear(ax, az, bx, bz, rad) {
  let near = 1;
  if (ax > rad && bx > rad) { near = 0; }
  if (ax < 0 - rad && bx < 0 - rad) { near = 0; }
  if (az > rad && bz > rad) { near = 0; }
  if (az < 0 - rad && bz < 0 - rad) { near = 0; }
  return near;
}
function M_slab(b) {
  let t0 = 0, t1 = rayT, ok = 1, ta = 0, tb = 0, nax = 0;
  // x
  if (ddx == 0) { if (lax < CBX0[b] || lax > CBX1[b]) { ok = 0; } }
  else { ta = (CBX0[b] - lax) / ddx; tb = (CBX1[b] - lax) / ddx; if (ta > tb) { let tt = ta; ta = tb; tb = tt; } if (ta > t0) { t0 = ta; nax = 1; } if (tb < t1) { t1 = tb; } }
  if (ok == 1) {
    if (ddy == 0) { if (lay < CBY0[b] || lay > CBY1[b]) { ok = 0; } }
    else { ta = (CBY0[b] - lay) / ddy; tb = (CBY1[b] - lay) / ddy; if (ta > tb) { let tt = ta; ta = tb; tb = tt; } if (ta > t0) { t0 = ta; nax = 2; } if (tb < t1) { t1 = tb; } }
  }
  if (ok == 1) {
    if (ddz == 0) { if (laz < CBZ0[b] || laz > CBZ1[b]) { ok = 0; } }
    else { ta = (CBZ0[b] - laz) / ddz; tb = (CBZ1[b] - laz) / ddz; if (ta > tb) { let tt = ta; ta = tb; tb = tt; } if (ta > t0) { t0 = ta; nax = 3; } if (tb < t1) { t1 = tb; } }
  }
  if (ok == 1) { if (t0 <= t1) { if (t0 < rayT) { rayT = t0; rayInst = i; rayNX = nax; } } }
}
// the terrain along a segment: the first t (0..1) where it goes under the ground (coarse steps)
function rayTerrain(x0, y0, z0, x1, y1, z1, steps) {
  let k = 1, t = 1, found = 0;
  while (k <= steps) {
    if (found == 0) {
      let u = k / steps;
      let x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, z = z0 + (z1 - z0) * u;
      if (y < hAt(x, z)) { t = (k - 0.5) / steps; found = 1; }
    }
    k = k + 1;
  }
  return t;
}

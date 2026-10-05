// ============================================================
// The renderer.
//
// Every ray is traced in camera space: a pixel's ray is (u, v, FOC), a sphere
// is its centre (a, b, c) there. A row is not traced pixel by pixel:
//
//   1. Which spheres can this row meet at all, and between which two x? Both
//      come from a quadratic (the ray's discriminant as a function of u), so a
//      ray is only ever tested against a sphere it can reach.
//   2. Outside those spans the row is floor or sky. The floor's tile edges and
//      the edges of the spheres' shadows on it are found the same way, so the
//      background costs per edge, not per pixel.
//   3. Inside a span rays are traced every `stride` pixels (shadow ray, mirror
//      ray, highlight). Where two neighbours hit the same things the colour
//      between them is taken to run smoothly; where they differ the edge is
//      searched for with more rays.
//
// What comes out is a list of runs (colour, x0, x1, row), kept per colour, and
// drawn colour by colour as two-point strokes.
// ============================================================

// ---- per frame: the camera's axes, the spheres in camera space, who can reach whom ----
function camSetup() {
  let sy = sind(yaw), cy = cosd(yaw), sp = sind(pitch), cp = cosd(pitch);
  gRx = Math.round(cy * 1024); gRz = Math.round(0 - sy * 1024);
  gFx = Math.round(sy * cp * 1024); gFy = Math.round(sp * 1024); gFz = Math.round(cy * cp * 1024);
  gUx = Math.round(0 - sy * sp * 1024); gUy = Math.round(cp * 1024); gUz = Math.round(0 - cy * sp * 1024);
  gLx = idiv(LWX * gRx + LWZ * gRz, 1024);
  gLy = idiv(LWX * gUx + LWY * gUy + LWZ * gUz, 1024);
  gLz = idiv(LWX * gFx + LWY * gFy + LWZ * gFz, 1024);
  gLL = gLx * gLx + gLy * gLy + gLz * gLz;
  // what a mirror shows of a mirror: the middle of the sky
  let envR = SKYR[20], envG = SKYG[20], envB = SKYB[20];
  let i = 1;
  while (i <= ngt) { GRID[GTOUCH[i]] = 0; i = i + 1; }
  ngt = 0;
  i = 1;
  while (i <= NS) {
    let r = SRAD[i];
    let dx = SWX[i] - camX, dy = SWY[i] - camY, dz = SWZ[i] - camZ;
    let a = idiv(dx * gRx + dz * gRz, 1024);
    let b = idiv(dx * gUx + dy * gUy + dz * gUz, 1024);
    let c = idiv(dx * gFx + dy * gFy + dz * gFz, 1024);
    SA[i] = a; SB[i] = b; SC[i] = c;
    SK[i] = a * a + b * b + c * c - r * r;
    let q = b * b + c * c - r * r;
    if (q == 0) { q = -1; }
    SQ[i] = q;
    SR2[i] = r * r; SRK[i] = r * 1024;
    let kr = SKR[i];
    SMRK[i] = SMR[i] * (256 - kr); SMGK[i] = SMG[i] * (256 - kr); SMBK[i] = SMB[i] * (256 - kr);
    SKR2[i] = kr * 256;
    SER[i] = idiv(SMR[i] * (256 - kr), 256); SEG[i] = idiv(SMG[i] * (256 - kr), 256); SEB[i] = idiv(SMB[i] * (256 - kr), 256);
    SEKR[i] = idiv(envR * kr, 256); SEKG[i] = idiv(envG * kr, 256); SEKB[i] = idiv(envB * kr, 256);
    // rows the sphere can be in (the two planes through the camera's right axis that touch it)
    let k0 = 1, k1 = 0;
    if (c + r > NEARC) {
      k0 = 0; k1 = nrow - 1;
      let den = c * c - r * r;
      if (c > r) {
        if (den > 0) {
          let sq = r * Math.sqrt(b * b + den);
          let sq2 = r * Math.sqrt(a * a + den);
          if (FOC * (a * c + sq2) / den < -241) { k0 = 1; k1 = 0; }
          else {
            if (FOC * (a * c - sq2) / den > 241) { k0 = 1; k1 = 0; }
            else {
              k0 = idiv(v0 - FOC * (b * c + sq) / den, rowH) - 1;
              k1 = idiv(v0 - FOC * (b * c - sq) / den, rowH) + 1;
              if (k0 < 0) { k0 = 0; }
              if (k1 > nrow - 1) { k1 = nrow - 1; }
            }
          }
        }
      }
    }
    SK0[i] = k0; SK1[i] = k1;
    // its shadow on the floor: an ellipse round S that reaches rho along the light
    let rho = idiv(r * 1024, LWY) + 8;
    let swx = SWX[i] - idiv(LWX * SWY[i], LWY), swz = SWZ[i] - idiv(LWZ * SWY[i], LWY);
    let sx = swx - camX, sz = swz - camZ;
    let bs = idiv(sx * gUx - camY * gUy + sz * gUz, 1024), cs = idiv(sx * gFx - camY * gFy + sz * gFz, 1024);
    let bf = bs - idiv(rho * gFy, 1024), cf = cs + idiv(rho * gUy, 1024);
    let bn = bs + idiv(rho * gFy, 1024), cn = cs - idiv(rho * gUy, 1024);
    let s0 = 1, s1 = 0;
    if (cf > NEARC) {
      s0 = idiv(v0 - FOC * bf / cf, rowH) - 1;
      s1 = nrow - 1;
      if (cn > NEARC) { s1 = idiv(v0 - FOC * bn / cn, rowH) + 1; }
      if (s0 < 0) { s0 = 0; }
      if (s1 > nrow - 1) { s1 = nrow - 1; }
    }
    SS0[i] = s0; SS1[i] = s1;
    // the grid a mirror ray asks: which sphere may shade this floor tile?
    let gi0 = idiv(swx + GOFF - rho, CELL), gi1 = idiv(swx + GOFF + rho, CELL);
    let gj0 = idiv(swz + GOFF - rho, CELL), gj1 = idiv(swz + GOFF + rho, CELL);
    if (gi0 < 0) { gi0 = 0; }
    if (gj0 < 0) { gj0 = 0; }
    if (gi1 > GN - 1) { gi1 = GN - 1; }
    if (gj1 > GN - 1) { gj1 = GN - 1; }
    let gi = gi0;
    while (gi <= gi1) {
      let gj = gj0;
      while (gj <= gj1) {
        let gx = gi * GN + gj + 1;
        let g = GRID[gx];
        if (g == 0) { GRID[gx] = i; ngt = ngt + 1; GTOUCH[ngt] = gx; }
        else { if (g != i) { GRID[gx] = -1; } }
        gj = gj + 1;
      }
      gi = gi + 1;
    }
    i = i + 1;
  }
  // who can shade sphere i (it lies towards the sun, inside the tube i casts back), and who a mirror can show
  let ns = 1, nr = 1;
  i = 1;
  while (i <= NS) {
    SHC0[i] = ns; RFC0[i] = nr;
    let j = 1;
    while (j <= NS) {
      if (j != i) {
        RFC[nr] = j; nr = nr + 1;
        let ex = SA[j] - SA[i], ey = SB[j] - SB[i], ez = SC[j] - SC[i];
        let dl = ex * gLx + ey * gLy + ez * gLz;
        if (dl > 0) {
          let rr = SRAD[i] + SRAD[j];
          if (ex * ex + ey * ey + ez * ez - idiv(dl * dl, gLL) < rr * rr) { SHC[ns] = j; ns = ns + 1; }
        }
      }
      j = j + 1;
    }
    SHC1[i] = ns; RFC1[i] = nr;
    i = i + 1;
  }
}

// ---- runs ----
function M_push(c_, x0_, x1_) {
  if (nr < nrMax) {
    nr = nr + 1;
    RX0[nr] = x0_; RX1[nr] = x1_; RY[nr] = yrow;
    hd = HEAD[c_ + hb];
    if (hd == 0) { nu = nu + 1; USED[nu] = c_; }
    RN[nr] = hd; HEAD[c_ + hb] = nr;
  }
}
// from x_ on the row is colour c_
function M_seg(x_, c_) {
  if (c_ != pc) {
    if (x_ > px0) { M_push(pc, px0, x_); }
    pc = c_; px0 = x_;
  }
}
function M_quant(r_, g_, b_, out_) {
  qr = idiv(r_ + dth, 16); if (qr > 15) { qr = 15; }
  qg = idiv(g_ + dth, 16); if (qg > 15) { qg = 15; }
  qb = idiv(b_ + dth, 16); if (qb > 15) { qb = 15; }
  out_ = qr * 256 + qg * 16 + qb + 1;
}
// the row's floor colours for shadow sh_ (0/1): the two tiles pulled together by cf
function M_fcol(sh_) {
  fi = kf * 4 + sh_ + 1;
  fa = FLR[fi]; fb = FLR[fi + 2];
  f0r = idiv((fa + fb) * 256 + (fa - fb) * cf, 512); f1r = idiv((fa + fb) * 256 - (fa - fb) * cf, 512);
  fa = FLG[fi]; fb = FLG[fi + 2];
  f0g = idiv((fa + fb) * 256 + (fa - fb) * cf, 512); f1g = idiv((fa + fb) * 256 - (fa - fb) * cf, 512);
  fa = FLB[fi]; fb = FLB[fi + 2];
  f0b = idiv((fa + fb) * 256 + (fa - fb) * cf, 512); f1b = idiv((fa + fb) * 256 - (fa - fb) * cf, 512);
  M_quant(f0r, f0g, f0b, fq);
  FCL[sh_ + 1] = fq;
  M_quant(f1r, f1g, f1b, fq);
  FCL[sh_ + 3] = fq;
}

// ---- the span of sphere i_ in this row ----
function M_span(i_) {
  spa = SA[i_]; spq = SQ[i_];
  spg = SB[i_] * v + SC[i_] * FOC;
  SG[i_] = spg;
  spd = spa * spa * spg * spg + spq * (spg * spg - A0 * SK[i_]);
  xl = 1; xr = 0;
  if (spd >= 0) {
    sps = idiv(Math.sqrt(spd), 1);
    if (spq > 0) {
      // the usual case: the row cuts the sphere's outline in two points
      if (spg > 0) { xl = idiv((spa * spg - sps) * 4, spq); xr = idiv((spa * spg + sps) * 4, spq) + 1; }
    } else {
      // the sphere is beside the camera: its outline runs off one edge of the row
      if (spa > 0) { xl = idiv((sps - spa * spg) * 4, 0 - spq); xr = 960; }
      if (spa < 0) { xl = -960; xr = idiv((0 - sps - spa * spg) * 4, 0 - spq) + 1; }
    }
  }
  if (xl < -960) { xl = -960; }
  if (xr > 960) { xr = 960; }
  if (xr > xl) {
    nsp = nsp + 1;
    sj = nsp;
    while (sj > 1) {
      if (SPX0[sj - 1] > xl) { SPX0[sj] = SPX0[sj - 1]; SPX1[sj] = SPX1[sj - 1]; SPI[sj] = SPI[sj - 1]; sj = sj - 1; }
      else { break; }
    }
    SPX0[sj] = xl; SPX1[sj] = xr; SPI[sj] = i_;
  }
}

// ---- where screen polygon p_ crosses this row: xl .. xr (xr <= xl: it does not) ----
// An edge counts when the row lies at or above its lower end and below its upper end, and its x is
// always worked out from the lower end: two triangles that share an edge get the very same x.
function M_pspan(p_) {
  pb4 = (p_ - 1) * 4; pn = PN[p_];
  xl = BIG; xr = 0 - BIG;
  ej = 1;
  while (ej <= pn) {
    ek = ej + 1;
    if (ek > pn) { ek = 1; }
    ey0 = PY[pb4 + ej]; ey1 = PY[pb4 + ek];
    exx = BIG;
    if (ey0 <= v16) {
      if (ey1 > v16) { ex0 = PX[pb4 + ej]; exx = ex0 + idiv((v16 - ey0) * (PX[pb4 + ek] - ex0), ey1 - ey0); }
    } else {
      if (ey1 <= v16) { ex0 = PX[pb4 + ek]; exx = ex0 + idiv((v16 - ey1) * (PX[pb4 + ej] - ex0), ey0 - ey1); }
    }
    if (exx < BIG) {
      if (exx < xl) { xl = exx; }
      if (exx > xr) { xr = exx; }
    }
    ej = ej + 1;
  }
  if (xl < -960) { xl = -960; }
  if (xr > 960) { xr = 960; }
}
// triangle t_ in this row, into the row's spans (as number NS + t_)
function M_tspan(t_) {
  M_pspan(t_);
  if (xr > xl) {
    TG[t_] = TNY[t_] * v + TNZ[t_] * FOC;
    nsp = nsp + 1;
    sj = nsp;
    while (sj > 1) {
      if (SPX0[sj - 1] > xl) { SPX0[sj] = SPX0[sj - 1]; SPX1[sj] = SPX1[sj - 1]; SPI[sj] = SPI[sj - 1]; sj = sj - 1; }
      else { break; }
    }
    SPX0[sj] = xl; SPX1[sj] = xr; SPI[sj] = NS + t_;
  }
}
// the floor shadow polygon p_ in this row, into the row's shadow intervals
function M_tshspan(p_) {
  M_pspan(p_);
  if (xr > xl) {
    nsh = nsh + 1;
    sj = nsh;
    while (sj > 1) {
      if (SHX0[sj - 1] > xl) { SHX0[sj] = SHX0[sj - 1]; SHX1[sj] = SHX1[sj - 1]; sj = sj - 1; }
      else { break; }
    }
    SHX0[sj] = xl; SHX1[sj] = xr;
  }
}

// ---- where sphere i_'s shadow lies on this floor row ----
function M_shspan(i_) {
  spa = SA[i_];
  wb = SB[i_] - idiv(v * tq, 4096); wc = SC[i_] - idiv(FOC * tq, 4096);
  w0l = spa * lx + wb * ly + wc * lz;
  h1 = LL * spa - w0l * lx;
  q1 = w0l * w0l - LL * (spa * spa + wb * wb + wc * wc - SR2[i_]);
  spd = h1 * h1 + le * q1;
  if (spd > 0) {
    sps = idiv(Math.sqrt(spd), 1);
    xl = idiv(16384 * (h1 - sps), tq * le); xr = idiv(16384 * (h1 + sps), tq * le) + 1;
    if (xl < -960) { xl = -960; }
    if (xr > 960) { xr = 960; }
    if (xr > xl) {
      nsh = nsh + 1;
      sj = nsh;
      while (sj > 1) {
        if (SHX0[sj - 1] > xl) { SHX0[sj] = SHX0[sj - 1]; SHX1[sj] = SHX1[sj - 1]; sj = sj - 1; }
        else { break; }
      }
      SHX0[sj] = xl; SHX1[sj] = xr;
    }
  }
}

// ---- background from xa_ to xb_: floor tiles and shadows, or sky bands ----
function M_bg(xa_, xb_) {
  while (bp <= nb) { if (BGX[bp] <= xa_) { bgv = BGV[bp]; bp = bp + 1; } else { break; } }
  if (bgmode == 1) {
    ix = idiv(xs4 + xa_ * dxs, C4); iz = idiv(zs4 + xa_ * dzs, C4);
    par = mod(ix + iz, 2);
    nxX = BIG; nxZ = BIG;
    if (dxs > 0) { nxX = idiv(((ix + 1) * C4 - xs4) * 1024, dxs); }
    if (dxs < 0) { nxX = idiv((xs4 - ix * C4) * 1024, 0 - dxs); }
    if (dzs > 0) { nxZ = idiv(((iz + 1) * C4 - zs4) * 1024, dzs); }
    if (dzs < 0) { nxZ = idiv((zs4 - iz * C4) * 1024, 0 - dzs); }
    xe = xb_ * 1024;
    sgx = xa_; sgc = FCL[par * 2 + bgv + 1];
    M_seg(sgx, sgc);
    go = 1;
    while (go == 1) {
      nxS = BIG;
      if (bp <= nb) { nxS = BGX[bp] * 1024; }
      nm = nxX;
      if (nxZ < nm) { nm = nxZ; }
      if (nxS < nm) { nm = nxS; }
      if (nm >= xe) { go = 0; }
      else {
        if (nm == nxS) { bgv = BGV[bp]; bp = bp + 1; }
        else {
          par = 1 - par;
          if (nxX <= nxZ) { nxX = nxX + stX; } else { nxZ = nxZ + stZ; }
        }
        sgx = idiv(nm, 1024); sgc = FCL[par * 2 + bgv + 1];
        M_seg(sgx, sgc);
      }
    }
  } else {
    sgx = xa_; sgc = bgv;
    M_seg(sgx, sgc);
    go = 1;
    while (go == 1) {
      go = 0;
      if (bp <= nb) {
        if (BGX[bp] < xb_) { bgv = BGV[bp]; sgx = BGX[bp]; sgc = bgv; M_seg(sgx, sgc); bp = bp + 1; go = 1; }
      }
    }
  }
}

// ---- a sphere's numbers into locals ----
function M_load(i_) {
  sa = SA[i_]; sb = SB[i_]; sc = SC[i_]; sk = SK[i_]; sg = SG[i_];
  sr2 = SR2[i_]; srk = SRK[i_];
  mrk = SMRK[i_]; mgk = SMGK[i_]; mbk = SMBK[i_]; kr2 = SKR2[i_]; ssp = SSPC[i_];
  shc0 = SHC0[i_]; shc1 = SHC1[i_]; rfc0 = RFC0[i_]; rfc1 = RFC1[i_];
  rmb = (i_ - 1) * RMN; shm = SHM[i_]; rpb = (i_ - 1) * (NS + NM);
  sid = i_ * 1024;
  needr = 0; rsig = 0;
  if (kr2 > 0) { needr = 1; }
  if (ssp > 0) { needr = 1; }
  if (kr2 >= SIGKR) { rsig = 1; }
}

// ---- the mirror map's cell ci for sphere i, worked out the first time a ray asks for it in a frame ----
// Out: mCell (0 nothing lies that way, j one sphere, NS + 1 the structure, -1 several spheres, -2 the structure too).
function mirrorCell(i, ci) {
  let rpb = (i - 1) * (NS + NM);
  let cx = CDX[ci], cy = CDY[ci], cz = CDZ[ci];
  let rv = 0, kk = rpb + 1;
  while (kk <= rpb + NS) {
    if (cx * PAX[kk] + cy * PAY[kk] + cz * PAZ[kk] >= PTH[kk]) { if (rv == 0) { rv = kk - rpb; } else { rv = -1; } }
    kk = kk + 1;
  }
  // the meshes (their spheres, NS + 1 on): alone NS + 1, with spheres -2
  while (kk <= rpb + NS + NM) {
    if (cx * PAX[kk] + cy * PAY[kk] + cz * PAZ[kk] >= PTH[kk]) { if (rv == 0) { rv = NS + 1; } else { if (rv <= NS) { rv = -2; } } }
    kk = kk + 1;
  }
  RMAP[(i - 1) * RMN + ci] = rv + rStamp;
  mCell = rv;
}
// does the mirror ray meet sphere jj nearer than what it has?
function M_rtest() {
  wx = SA[jj] - px; wy = SB[jj] - py; wz = SC[jj] - pz;
  bj = wx * rx + wy * ry + wz * rz;
  if (bj > 0) {
    dj = bj * bj - ar * (wx * wx + wy * wy + wz * wz - SR2[jj]);
    if (dj > 0) {
      tj = bj - idiv(Math.sqrt(dj), 1);
      if (tj < tb) { tb = tj; hit = jj; }
    }
  }
}

// ---- is the floor point f shaded? g is its tile's entry in the grid: a sphere, -1 several, -2 the structure too ----
// Out: fShade.
function floorShade(g, fx, fy, fz) {
  let lx = gLx, ly = gLy, lz = gLz, LL = gLL;
  let fsh = 0, jj = 0, wx = 0, wy = 0, wz = 0, wl = 0;
  if (g > 0) { M_flsh(g); }
  else {
    jj = 1;
    while (jj <= NS) { M_flsh(jj); jj = jj + 1; }
    if (g == -2) { if (fsh == 0) { bvhHit(fx, fy, fz, lx, ly, lz, 1, 0); if (bvTri > 0) { fsh = 1; } } }
  }
  fShade = fsh;
}
function M_flsh(j_) {
  wx = SA[j_] - fx; wy = SB[j_] - fy; wz = SC[j_] - fz;
  wl = wx * lx + wy * ly + wz * lz;
  if (wl > 0) { if (wl * wl - (wx * wx + wy * wy + wz * wz - SR2[j_]) * LL > 0) { fsh = 1; } }
}

// ---- one ray through (u, v): its colour scol and what it met, ssig ----
function M_sample() {
  A = u * u + A0;
  if (na > 1) {
    // several things cover this stretch: the nearest hit wins (ray lengths x4096)
    best = 0; bt = BIG; alt = 0; ad = 0 - BIG;
    jj = 1;
    while (jj <= na) {
      ii = ACT[jj];
      if (ii > NS) {
        b2 = TNX[ii - NS] * u + TG[ii - NS];
        if (b2 < 0) {
          t2 = idiv(TPD[ii - NS] * 4096, b2);
          if (t2 < bt) { bt = t2; best = ii; }
        }
      } else {
        b2 = SA[ii] * u + SG[ii];
        d2 = b2 * b2 - A * SK[ii];
        if (d2 >= 0) {
          t2 = idiv((b2 - idiv(Math.sqrt(d2), 1)) * 4096, A);
          if (t2 < bt) { bt = t2; best = ii; }
        } else {
          if (d2 > ad) { ad = d2; alt = ii; }
        }
      }
      jj = jj + 1;
    }
    if (best == 0) { best = alt; }
    if (best == 0) { best = ACT[1]; }
    if (best != cur) {
      cur = best;
      if (best > NS) { sid = best * 1024; } else { M_load(best); }
    }
  }
  if (cur > NS) {
    // ---- a triangle: flat colour, in the sun or not ----
    tt = cur - NS;
    b2 = TNX[tt] * u + TG[tt];
    if (b2 > -1) { b2 = -1; }
    tq = idiv(TPD[tt] * 4096, b2);
    ssig = sid; scol = TCS[tt]; lit = 0;
    if (TLIT[tt] == 1) {
      px = idiv(u * tq, 4096); py = idiv(v * tq, 4096); pz = idiv(FOC * tq, 4096);
      lit = 1;
      kk = 1;
      while (kk <= nms) {
        jj = MSH[kk];
        wx = SA[jj] - px; wy = SB[jj] - py; wz = SC[jj] - pz;
        wl = wx * lx + wy * ly + wz * lz;
        if (wl > 0) { if (wl * wl - (wx * wx + wy * wy + wz * wz - SR2[jj]) * LL > 0) { lit = 0; kk = nms; } }
        kk = kk + 1;
      }
      // a mesh shades itself and the other: a shadow ray through the tree - but only for a triangle
      // that the build found partly shaded (one never shaded needs none, one always shaded is not lit)
      if (lit == 1) { if (TSELF[tt] == 1) { bvhHit(px, py, pz, lx, ly, lz, 1, 0); if (bvTri > 0) { lit = 0; } } }
      if (lit == 1) { scol = TCL[tt]; } else { ssig = sid + 512; }
    }
    kq = TKR[tt];
    if (kq > 0) {
      // a faint mirror: the flat colour, and what the mirror ray meets (traced in triMirror)
      px = idiv(u * tq, 4096); py = idiv(v * tq, 4096); pz = idiv(FOC * tq, 4096);
      nx = TMX[tt]; ny = TMY[tt]; nz = TMZ[tt];
      dn = u * nx + v * ny + FOC * nz;
      rx = 2 * u - idiv(dn * nx, 67108864); ry = 2 * v - idiv(dn * ny, 67108864); rz = 2 * FOC - idiv(dn * nz, 67108864);
      triMirror(px, py, pz, rx, ry, rz, TMESH[tt]);
      if (lit == 1) { c2r = TLR[tt]; c2g = TLG[tt]; c2b = TLB[tt]; } else { c2r = TSR[tt]; c2g = TSG[tt]; c2b = TSB[tt]; }
      qr = idiv((c2r * (256 - kq) + mR * kq) * 256 + 524288, 1048576); if (qr > 15) { qr = 15; }
      qg = idiv((c2g * (256 - kq) + mG * kq) * 256 + 524288, 1048576); if (qg > 15) { qg = 15; }
      qb = idiv((c2b * (256 - kq) + mB * kq) * 256 + 524288, 1048576); if (qb > 15) { qb = 15; }
      scol = qr * 256 + qg * 16 + qb + 1;
    }
  } else {
  M_sphere();
  }
}

// ---- a ray that meets the loaded sphere ----
function M_sphere() {
  bq = sa * u + sg;
  disc = bq * bq - A * sk;
  if (disc < 0) { disc = 0; }
  tq = idiv((bq - idiv(Math.sqrt(disc), 1)) * 4096, A);
  px = idiv(u * tq, 4096); py = idiv(v * tq, 4096); pz = idiv(FOC * tq, 4096);
  nx = px - sa; ny = py - sb; nz = pz - sc;
  nl = nx * lx + ny * ly + nz * lz;
  li = AMB; ssig = sid; lit = 0;
  if (nl > 0) {
    lit = 1;
    kk = shc0;
    while (kk < shc1) {
      jj = SHC[kk];
      wx = SA[jj] - px; wy = SB[jj] - py; wz = SC[jj] - pz;
      wl = wx * lx + wy * ly + wz * lz;
      if (wl > 0) { if (wl * wl - (wx * wx + wy * wy + wz * wz - SR2[jj]) * LL > 0) { lit = 0; kk = shc1; } }
      kk = kk + 1;
    }
    if (lit == 1) {
      if (shm == 1) {
        // does the shadow ray even meet the sphere round a mesh?
        mh = 0;
        kk = NS + 1;
        while (kk <= NS + NM) {
          wx = SA[kk] - px; wy = SB[kk] - py; wz = SC[kk] - pz;
          wl = wx * lx + wy * ly + wz * lz;
          dj = wx * wx + wy * wy + wz * wz - SR2[kk];
          if (dj < 0) { mh = 1; } else { if (wl > 0) { if (wl * wl - dj * LL > 0) { mh = 1; } } }
          kk = kk + 1;
        }
        if (mh == 1) { bvhHit(px, py, pz, lx, ly, lz, 1, 0); if (bvTri > 0) { lit = 0; } }
      }
    }
    if (lit == 1) { li = AMB + idiv(nl * DIFK, srk); } else { ssig = sid + 512; }
  }
  c2r = 0; c2g = 0; c2b = 0; spd = dth * 65536;
  if (needr == 1) {
    // the mirror direction (twice the ray's length)
    dn = u * nx + v * ny + FOC * nz;
    rx = 2 * u - idiv(4 * dn * nx, sr2); ry = 2 * v - idiv(4 * dn * ny, sr2); rz = 2 * FOC - idiv(4 * dn * nz, sr2);
    ar = rx * rx + ry * ry + rz * rz;
    if (lit == 1) {
      if (ssp > 0) {
        sd = rx * lx + ry * ly + rz * lz;
        if (sd > 0) { sd = sd * sd * 64; if (sd > ar * LL * 44) { spd = (idiv(SPECT[idiv(sd * 4, ar * LL) + 1] * ssp, 256) + dth) * 65536; } }
      }
    }
    if (kr2 > 0) {
      // which things can a ray in this direction reach at all? (a map of directions; on the coarser
      // levels a faint mirror shows only floor and sky, and is not asked)
      rv = 0; hit = 0;
      if (rsig >= wkm) {
      if (rx < 0) { cx = 0 - rx; } else { cx = rx; }
      if (ry < 0) { cy = 0 - ry; } else { cy = ry; }
      if (rz < 0) { cz = 0 - rz; } else { cz = rz; }
      if (cx >= cy) {
        if (cx >= cz) { cm = cx; ca = ry; cb = rz; cfc = 0; if (rx < 0) { cfc = RG2; } }
        else { cm = cz; ca = rx; cb = ry; cfc = 4 * RG2; if (rz < 0) { cfc = 5 * RG2; } }
      } else {
        if (cy >= cz) { cm = cy; ca = rx; cb = rz; cfc = 2 * RG2; if (ry < 0) { cfc = 3 * RG2; } }
        else { cm = cz; ca = rx; cb = ry; cfc = 4 * RG2; if (rz < 0) { cfc = 5 * RG2; } }
      }
      cm2 = cm * 2 + 1;
      ci = cfc + idiv((ca + cm) * RG, cm2) * RG + idiv((cb + cm) * RG, cm2) + 1;
      // V8 will not inline the arithmetic helpers into a very large function, and every call it leaves
      // costs. So the ray tracer proper keeps only what nearly every ray does; a mirror ray that may
      // meet another thing goes to mirrorHit, a floor point that may be shaded to floorShade
      hit = 0;
      rv = RMAP[rmb + ci] - rst;
      if (rv != 0) {
        // (a direction not asked yet this frame is worked out now)
        if (rv < -2) { mirrorCell(cur, ci); rv = mCell; }
      }
      }
      if (rv != 0) {
        tb = BIG; mh = 0;
        if (rv > 0) { if (rv > NS) { mh = 1; } else { jj = rv; M_rtest(); } }
        else {
          kk = rfc0; while (kk < rfc1) { jj = RFC[kk]; M_rtest(); kk = kk + 1; }
          if (rv == -2) { mh = 1; }
        }
        t2 = BIG;
        if (hit > 0) { t2 = idiv(tb * 4096, ar); }
        if (mh == 1) {
          // the structure may lie that way: does the ray even meet the sphere round it?
          mh = 0;
          kk = NS + 1;
          while (kk <= NS + NM) {
            wx = SA[kk] - px; wy = SB[kk] - py; wz = SC[kk] - pz;
            bj = wx * rx + wy * ry + wz * rz;
            dj = wx * wx + wy * wy + wz * wz - SR2[kk];
            if (dj < 0) { mh = 1; } else { if (bj > 0) { if (bj * bj - ar * dj > 0) { mh = 1; } } }
            kk = kk + 1;
          }
          if (mh == 1) {
            // through its tree
            bvhHit(px, py, pz, rx, ry, rz, 0, 0);
            if (bvTri > 0) {
              if (bvT < t2) {
                // a triangle: its flat colour (its own shadows are not looked for in a mirror)
                hit = bvTri;
                if (TLIT[hit] == 1) { c2r = TLR[hit]; c2g = TLG[hit]; c2b = TLB[hit]; } else { c2r = TSR[hit]; c2g = TSG[hit]; c2b = TSB[hit]; }
                if (rsig == 1) { ssig = ssig + 64 + hit; }
                hit = -1;
              }
            }
          }
        }
        if (hit > 0) {
          // another sphere: its own colour in the sun (no further bounce)
          fx = px + idiv(rx * t2, 4096) - SA[hit]; fy = py + idiv(ry * t2, 4096) - SB[hit]; fz = pz + idiv(rz * t2, 4096) - SC[hit];
          n2 = fx * lx + fy * ly + fz * lz;
          l2 = AMB;
          if (n2 > 0) { l2 = AMB + idiv(n2 * DIFK, SRK[hit]); }
          c2r = idiv(SER[hit] * l2, 256) + SEKR[hit]; c2g = idiv(SEG[hit] * l2, 256) + SEKG[hit]; c2b = idiv(SEB[hit] * l2, 256) + SEKB[hit];
          if (rsig == 1) { ssig = ssig + 16 + hit; }
        }
      }
      if (hit == 0) {
        M_env();
      }
    }
  }
  qr = idiv(mrk * li + c2r * kr2 + spd, 1048576); if (qr > 15) { qr = 15; }
  qg = idiv(mgk * li + c2g * kr2 + spd, 1048576); if (qg > 15) { qg = 15; }
  qb = idiv(mbk * li + c2b * kr2 + spd, 1048576); if (qb > 15) { qb = 15; }
  scol = qr * 256 + qg * 16 + qb + 1;
}

// ---- a mirror ray (from p along r) that met nothing: the floor or the sky; its colour into c2r, c2g, c2b ----
function M_env() {
  {
    {
        dw = ry * uy + rz * fy_;
        if (dw < 0) {
          // the floor
          hp = cmy + idiv(py * uy + pz * fy_, 1024);
          t2 = idiv(hp * 4194304, 0 - dw);
          ex = idiv(rx * t2, 4096); ey = idiv(ry * t2, 4096); ez = idiv(rz * t2, 4096);
          kf2 = idiv(ex * ex + ey * ey + ez * ez, FOGDIV);
          fi = 253;
          if (kf2 < fk) {
            fx = px + ex; fy = py + ey; fz = pz + ez;
            wxx = cmx + idiv(fx * rx_ + fy * ux + fz * fx_, 1024);
            wzz = cmz + idiv(fx * rz_ + fy * uz + fz * fz_, 1024);
            fpar = mod(idiv(wxx, CELL) + idiv(wzz, CELL), 2);
            fsh = 0;
            gi = idiv(wxx + GOFF, CELL); gj = idiv(wzz + GOFF, CELL);
            if (gi >= 0) { if (gi < GN) { if (gj >= 0) { if (gj < GN) {
              g = GRID[gi * GN + gj + 1];
              if (g > 0) { M_flsh(g); }
              if (g < 0) { floorShade(g, fx, fy, fz); fsh = fShade; }
            } } } }
            fi = kf2 * 4 + fpar * 2 + fsh + 1;
            if (rsig == 1) { ssig = ssig + 2 + fpar + fsh * 2; }
          } else {
            if (kf2 < 63) { fi = kf2 * 4 + 1; }
            if (rsig == 1) { ssig = ssig + 2; }
          }
          c2r = FLR[fi]; c2g = FLG[fi]; c2b = FLB[fi];
        } else {
          // the sky
          si = idiv(dw * dw * 63, ar * 1048576) + 1;
          if (si > 64) { si = 64; }
          c2r = SKYR[si]; c2g = SKYG[si]; c2b = SKYB[si];
          if (rsig == 1) { ssig = ssig + 1; }
        }
    }
  }
}

// ---- the mirror ray of a triangle of mesh own: from p along r. Out: mR, mG, mB ----
// A mesh does not show in its own mirror (a ray that starts on a mesh is inside most of its boxes, and
// walking them for every ray cost more than the whole rest of the picture); other meshes do, when the
// ray meets the sphere round one.
// (a function of its own: few rays need it, and it keeps the ray tracer proper small)
function triMirror(px, py, pz, rx, ry, rz, own) {
  let lx = gLx, ly = gLy, lz = gLz, LL = gLL;
  let ux = gUx, uy = gUy, uz = gUz, fx_ = gFx, fy_ = gFy, fz_ = gFz, rx_ = gRx, rz_ = gRz;
  let cmx = camX, cmy = camY, cmz = camZ, fk = flatK;
  let ar = rx * rx + ry * ry + rz * rz;
  let tb = BIG, hit = 0, jj = 1, t2 = BIG, rsig = 0, ssig = 0, c2r = 0, c2g = 0, c2b = 0;
  let wx = 0, wy = 0, wz = 0, bj = 0, dj = 0, tj = 0, n2 = 0, l2 = 0;
  while (jj <= NS) { M_rtest(); jj = jj + 1; }
  if (hit > 0) { t2 = idiv(tb * 4096, ar); }
  let mh = 0, kk = NS + 1;
  while (kk <= NS + NM) {
    if (kk - NS != own) {
      wx = SA[kk] - px; wy = SB[kk] - py; wz = SC[kk] - pz;
      bj = wx * rx + wy * ry + wz * rz;
      dj = wx * wx + wy * wy + wz * wz - SR2[kk];
      if (dj < 0) { mh = 1; } else { if (bj > 0) { if (bj * bj - ar * dj > 0) { mh = 1; } } }
    }
    kk = kk + 1;
  }
  if (mh == 1) {
    bvhHit(px, py, pz, rx, ry, rz, 0, own);
    if (bvTri > 0) {
      if (bvT < t2) {
        hit = bvTri;
        if (TLIT[hit] == 1) { c2r = TLR[hit]; c2g = TLG[hit]; c2b = TLB[hit]; } else { c2r = TSR[hit]; c2g = TSG[hit]; c2b = TSB[hit]; }
        hit = -1;
      }
    }
  }
  if (hit > 0) {
    wx = px + idiv(rx * t2, 4096) - SA[hit]; wy = py + idiv(ry * t2, 4096) - SB[hit]; wz = pz + idiv(rz * t2, 4096) - SC[hit];
    n2 = wx * lx + wy * ly + wz * lz;
    l2 = AMB;
    if (n2 > 0) { l2 = AMB + idiv(n2 * DIFK, SRK[hit]); }
    c2r = idiv(SER[hit] * l2, 256) + SEKR[hit]; c2g = idiv(SEG[hit] * l2, 256) + SEKG[hit]; c2b = idiv(SEB[hit] * l2, 256) + SEKB[hit];
  }
  if (hit == 0) {
    M_env();
  }
  mR = c2r; mG = c2g; mB = c2b;
}

// ---- the spans SPI[j0..j1] from cs to ce: rays every `stride` pixels, more where they disagree ----
function traceCluster(cs, ce, j0, j1) {
  let lx = gLx, ly = gLy, lz = gLz, LL = gLL;
  let ux = gUx, uy = gUy, uz = gUz, fx_ = gFx, fy_ = gFy, fz_ = gFz, rx_ = gRx, rz_ = gRz;
  let cmx = camX, cmy = camY, cmz = camZ;
  let strd = stride, fk = flatK, bgap = bisGap, nms = nmsh, flat = 0, rst = rStamp, wkm = weakMirror;
  let v = rV, A0 = rA0, dth = 8, yrow = rYrow;
  // rows are traced in pairs: a key row keeps what its rays on the stride grid found; the row between two
  // key rows takes a grid point from them where both met the same things, and traces only the rest
  let rmode = rMode, ong = 0, use = 0, g = 0, va = 0;
  let keyK = (mod(frames, 4096) * 512 + rK) * 1048576, keyA = keyK - 1048576;
  let cwk = mod(idiv(rK, 2), 2) * CW, cwa = mod(idiv(rK - 1, 2), 2) * CW;
  let cwb = CW - cwa;
  let pc = rPc, px0 = rPx0, nr = nrun, nu = nused, nsm = 0, hb = sBase, nrMax = sRunMax;
  let x = cs, xb = 0, na = 0, e0 = 0, e1 = 0, jj = 0, ii = 0, cur = 0;
  let u = 0, u0 = 0, u1 = 0, first = 1, mode = 0, run = 1, adv = 0;
  let c0 = 0, s0 = 0, ulo = 0, uhi = 0, chi = 0, shi = 0, sgx = 0, se = 0, ue = 0;
  while (x < ce) {
    // the spans that cover x, and where that set next changes: an outline is an exact edge
    xb = ce; na = 0;
    jj = j0;
    while (jj <= j1) {
      e0 = SPX0[jj];
      if (e0 > x) { if (e0 < xb) { xb = e0; } }
      else {
        e1 = SPX1[jj];
        if (e1 > x) { na = na + 1; ACT[na] = SPI[jj]; if (e1 < xb) { xb = e1; } }
      }
      jj = jj + 1;
    }
    flat = 0;
    if (na == 1) {
      ii = ACT[1];
      if (ii > NS) {
        cur = ii; sid = ii * 1024;
        if (TLIT[ii - NS] == 0) { if (TKR[ii - NS] == 0) { flat = 1; sgx = x; scol = TCS[ii - NS]; M_seg(sgx, scol); } }
      } else {
        if (ii != cur) { M_load(ii); cur = ii; }
      }
    }
    u0 = 0 - idiv(0 - x, 4);
    u1 = 0 - idiv(0 - xb, 4) - 1;
    // rays go on a grid of whole strides (a narrow stretch gets a finer one); the first and the last
    // ray's colours reach out to the stretch's exact edges
    se = strd;
    if (u1 - u0 < strd * 4) { se = 2; }
    u = 0 - idiv(0 - u0, se) * se; ong = 1;
    ue = idiv(u1, se) * se;
    if (u > u1) { u = idiv(x + xb, 8); ue = u; ong = 0; }
    first = 1; mode = 0; run = 1;
    if (na == 0) { run = 0; }
    if (flat == 1) { run = 0; }
    while (run == 1) {
      use = 0;
      if (ong == 1) {
        if (rmode == 2) {
          if (na == 1) {
            g = u + 242;
            va = CS[cwa + g];
            ssig = va - keyA;
            if (ssig >= sid) { if (ssig < sid + 1024) { if (CS[cwb + g] - va == 2097152) { scol = CC[cwa + g]; use = 1; } } }
          }
        }
      }
      if (use == 0) {
        M_sample();
        nsm = nsm + 1;
        if (ong == 1) { if (rmode == 1) { g = u + 242; CS[cwk + g] = keyK + ssig; CC[cwk + g] = scol; } }
      }
      adv = 0;
      if (first == 1) {
        first = 0;
        sgx = x;
        M_seg(sgx, scol);
        c0 = scol; s0 = ssig; ulo = u; adv = 1;
      } else {
        if (ssig == s0) {
          // the same things were hit: the colour runs smoothly, change it half way
          if (scol != c0) { sgx = 2 * (ulo + u); M_seg(sgx, scol); c0 = scol; }
          ulo = u;
          if (mode == 0) { adv = 1; }
        } else {
          uhi = u; chi = scol; shi = ssig; mode = 1;
        }
        if (mode == 1) {
          // an edge lies between ulo and uhi: halve until they are close
          if (uhi - ulo <= bgap) {
            sgx = 2 * (ulo + uhi);
            M_seg(sgx, chi);
            c0 = chi; s0 = shi; ulo = uhi; mode = 0; adv = 1;
          } else { u = idiv(ulo + uhi, 2); ong = 0; }
        }
      }
      if (adv == 1) {
        if (ulo >= ue) { run = 0; }
        else { u = (idiv(ulo, se) + 1) * se; ong = 1; }
      }
    }
    x = xb;
  }
  rPc = pc; rPx0 = px0; nrun = nr; nused = nu; nsamp = nsamp + nsm;
}

// ---- for each mirror: which things can a ray leaving it in a given direction reach? ----
// A ray from sphere i that meets sphere j points within a cone about the line of
// centres. Directions are the cells of a cube (RG x RG a face). A cell holds 0
// (nothing), j (one sphere), NS + 1 (the structure), -1 (several spheres) or -2
// (the structure and spheres) - plus the frame's stamp: a cell is worked out
// the first time a ray asks for it in a frame (in M_sphere), from the cones
// made here.
function mapBuild() {
  let i = 1, j = 0, pb = 0, dx = 0, dy = 0, dz = 0, d = 0, sn = 0;
  rStamp = (frames + 1) * 16;
  while (i <= NS) {
    if (SKR[i] > 0) {
      if (SK0[i] <= SK1[i]) {
        pb = (i - 1) * (NS + NM);
        j = 1;
        while (j <= NS + NM) {
          // (a sphere never reaches itself: its own cone is shut)
          PTH[pb + j] = BIG;
          if (j != i) {
            dx = SA[j] - SA[i]; dy = SB[j] - SB[i]; dz = SC[j] - SC[i];
            d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            sn = (SRAD[i] + SRAD[j]) / (d + 1);
            PAX[pb + j] = dx; PAY[pb + j] = dy; PAZ[pb + j] = dz;
            // cos(cone + half a cell's reach), times the distance and the cell vector's length
            if (sn >= 0.985) { PTH[pb + j] = 0 - BIG; }
            else { PTH[pb + j] = Math.round(d * 1024 * (Math.sqrt(1 - sn * sn) * 0.98294 - sn * 0.18395)); }
          }
          j = j + 1;
        }
      }
    }
    i = i + 1;
  }
}

// ---- background from xa to xb ----
function bgSeg(xa, xb) {
  let pc = rPc, px0 = rPx0, nr = nrun, nu = nused, yrow = rYrow, hb = sBase, nrMax = sRunMax;
  let bp = bgPtr, bgv = bgVal, nb = bgN, bgmode = bgMode;
  let xs4 = rXs4, zs4 = rZs4, dxs = rDxs, dzs = rDzs, stX = rStX, stZ = rStZ;
  M_bg(xa, xb);
  rPc = pc; rPx0 = px0; nrun = nr; nused = nu; bgPtr = bp; bgVal = bgv;
}

// ---- what lies behind the spheres in row rK: floor (tiles, shadows) or sky (bands) ----
function rowPrep() {
  let lx = gLx, ly = gLy, lz = gLz, LL = gLL;
  let ux = gUx, uy = gUy, uz = gUz, fx_ = gFx, fy_ = gFy, fz_ = gFz, rx_ = gRx, rz_ = gRz;
  let cmx = camX, cmy = camY, cmz = camZ;
  let rh = rowH, fk = flatK;
  let k = rK, v = rV, A0 = rA0, dth = rDth;
  let dyw = v * uy + FOC * fy_;
  let le = LL - lx * lx;
  if (le < 1) { le = 1; }
  let nb = 0, bgv = 0, bgmode = 0, i = 0, nsh = 0;
  let tq = 0, kf = 0, cf = 0, sqA = 0, cpp = 0, cpr = 0, fm = 0;
  let xs4 = 0, zs4 = 0, dxs = 0, dzs = 0, stX = 0, stZ = 0;
  let cend = 0, nn = 0, i0 = 0, ie = 0, kk2 = 0, skc = 0, sr_ = 0, sg_ = 0, sb_ = 0;
  // ---- the background of this row
  if (dyw < 0) {
    // floor: the whole row is at one ray length tq
    tq = idiv(cmy * 4194304, 0 - dyw);
    kf = idiv(tq * tq * A0, 16777216 * FOGDIV);
    if (kf > 63) { kf = 63; }
    // tiles per pixel across and per row down: where they crowd, the pattern fades to its mean
    sqA = idiv(Math.sqrt(A0), 1);
    cpp = idiv(tq, 16 * CELL);
    cpr = idiv(tq * uy * rh * sqA, (0 - dyw) * 16 * CELL);
    fm = cpp;
    if (cpr > fm) { fm = cpr; }
    cf = 256;
    if (fm > FADE0) { cf = idiv((FADE1 - fm) * 256, FADE1 - FADE0); }
    if (cf < 0) { cf = 0; }
    if (kf >= fk) { cf = 0; }
    dth = 8;
    M_fcol(0);
    M_fcol(1);
    bgmode = 0; bgv = FCL[1];
    if (cf > 0) {
      bgmode = 1; bgv = 0;
      xs4 = 4 * (cmx * 4194304 + tq * (v * ux + FOC * fx_)); dxs = tq * rx_;
      zs4 = 4 * (cmz * 4194304 + tq * (v * uz + FOC * fz_)); dzs = tq * rz_;
      stX = BIG; stZ = BIG;
      if (dxs != 0) { stX = idiv(C4 * 1024, Math.abs(dxs)); }
      if (dzs != 0) { stZ = idiv(C4 * 1024, Math.abs(dzs)); }
    }
    // the shadows that cross this row
    nsh = 0;
    if (kf < 63) {
      i = 1;
      while (i <= NS) {
        if (k >= SS0[i]) { if (k <= SS1[i]) { M_shspan(i); } }
        i = i + 1;
      }
      v16 = v * 16;
      i = 1;
      while (i <= nvs) {
        tt = VS[i];
        if (k >= PK0[tt]) { if (k <= PK1[tt]) { M_tshspan(tt); } }
        i = i + 1;
      }
    }
    cend = 0 - BIG;
    i = 1;
    while (i <= nsh) {
      if (SHX0[i] > cend) {
        nb = nb + 1; BGX[nb] = SHX0[i];
        nb = nb + 1; BGX[nb] = SHX1[i];
        if (bgmode == 1) { BGV[nb - 1] = 1; BGV[nb] = 0; } else { BGV[nb - 1] = FCL[2]; BGV[nb] = FCL[1]; }
        cend = SHX1[i];
      } else {
        if (SHX1[i] > cend) { BGX[nb] = SHX1[i]; cend = SHX1[i]; }
      }
      i = i + 1;
    }
  } else {
    // sky: bands of equal elevation, mirrored about the middle of the row
    bgmode = 0;
    nn = dyw * dyw * 63;
    i0 = idiv(nn, 1048576 * A0);
    ie = idiv(nn, 1048576 * (57600 + A0));
    if (i0 > 63) { i0 = 63; }
    sr_ = SKYR[ie + 1]; sg_ = SKYG[ie + 1]; sb_ = SKYB[ie + 1];
    M_quant(sr_, sg_, sb_, skc);
    bgv = skc;
    kk2 = ie + 1;
    while (kk2 <= i0) {
      sqA = idiv(Math.sqrt(nn / (1048576 * kk2) - A0) * 4, 1);
      SKU[kk2 + 1] = sqA;
      sr_ = SKYR[kk2 + 1]; sg_ = SKYG[kk2 + 1]; sb_ = SKYB[kk2 + 1];
      M_quant(sr_, sg_, sb_, skc);
      nb = nb + 1; BGX[nb] = 0 - sqA; BGV[nb] = skc;
      kk2 = kk2 + 1;
    }
    kk2 = i0;
    while (kk2 > ie) {
      sr_ = SKYR[kk2]; sg_ = SKYG[kk2]; sb_ = SKYB[kk2];
      M_quant(sr_, sg_, sb_, skc);
      nb = nb + 1; BGX[nb] = SKU[kk2 + 1]; BGV[nb] = skc;
      kk2 = kk2 - 1;
    }
  }
  bgN = nb; bgPtr = 1; bgVal = bgv; bgMode = bgmode;
  rXs4 = xs4; rZs4 = zs4; rDxs = dxs; rDzs = dzs; rStX = stX; rStZ = stZ;
}

function renderRows() {
  let uy = gUy, fy_ = gFy;
  let rh = rowH, nrw = nrow, vtop = v0;
  let k = 0, v = 0, A0 = 0, i = 0, nsp = 0, si = 1, nvt_ = nvt, tt = 0, v16 = 0;
  let x = 0, j = 0, j0 = 0, j1 = 0, cs = 0, ce = 0, more = 0;
  let pc = 0, px0 = 0, nr = 0, nu = 0, yrow = 0, hd = 0, hb = sBase, nrMax = sRunMax;
  nrun = sRun0; nused = sBase; nsamp = 0;
  while (si <= nrw) {
    k = ROWSEQ[si]; rMode = ROWMD[si];
    v = vtop - k * rh;
    A0 = v * v + FF;
    rK = k; rV = v; rA0 = A0; rYrow = v + yOff; rDth = DTH[mod(k, 4) + 1];
    // ---- which spheres, and from where to where
    nsp = 0;
    i = 1;
    while (i <= NS) {
      if (k >= SK0[i]) { if (k <= SK1[i]) { M_span(i); } }
      i = i + 1;
    }
    v16 = v * 16;
    i = 1;
    while (i <= nvt_) {
      tt = VT[i];
      if (k >= PK0[tt]) { if (k <= PK1[tt]) { M_tspan(tt); } }
      i = i + 1;
    }
    rowPrep();
    // ---- along the row: background, spans, background ...
    rPc = 0; rPx0 = -960; x = -960;
    j = 1;
    while (j <= nsp + 1) {
      if (j <= nsp) {
        cs = SPX0[j]; ce = SPX1[j]; j0 = j; j = j + 1;
        more = 1;
        while (more == 1) {
          more = 0;
          if (j <= nsp) { if (SPX0[j] < ce) { if (SPX1[j] > ce) { ce = SPX1[j]; } j = j + 1; more = 1; } }
        }
        j1 = j - 1;
      } else { cs = 960; ce = 960; j = j + 1; }
      if (cs > x) { bgSeg(x, cs); }
      if (ce > cs) { traceCluster(cs, ce, j0, j1); }
      x = ce;
    }
    pc = rPc; px0 = rPx0;
    if (px0 < 960) { nr = nrun; nu = nused; yrow = rYrow; M_push(pc, px0, 960); nrun = nr; nused = nu; }
    si = si + 1;
  }
}

// ---- draw: colour by colour, every run a two-point stroke (tessvm lays 16 or more such strokes of one colour down as one mesh) ----
function flushRuns(hb, n) {
  let k = hb + 1, c = 0, i = 0, y = 0;
  while (k <= n) {
    c = USED[k];
    penColorHex(PAL[c]);
    i = HEAD[c + hb];
    while (i > 0) {
      y = RY[i];
      goto(RX0[i] / 4, y);
      penDown();
      goto(RX1[i] / 4, y);
      penUp();
      i = RN[i];
    }
    HEAD[c + hb] = 0;
    k = k + 1;
  }
}

// a store that will not be drawn: empty it
function dropRuns(hb, n) {
  let k = hb + 1;
  while (k <= n) { HEAD[USED[k] + hb] = 0; k = k + 1; }
}

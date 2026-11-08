// ============================================================
// Cubes, the laser, signals (plates, levers, receivers, counters, logic nodes),
// switching portals, doors that change while unseen, the lens, cores and records.
// ============================================================
let LSN = 0, LSR = [], LA = [], LB = [], LC = [], LD = [], LE = [], LF = [];
let rhT = 0, rhI = 0, rhR = 0, rhX = 0, rhY = 0, rhZ = 0, rhP = 0;
let msgText = ' ', msgT = 0, topDirty = 1, hintLv = 0, stageT = 0, endingOn = 0, endingKind = 0;

function laserAlloc() {
  let i = 1;
  while (i <= LMAX) { LSR.push(0); LA.push(0); LB.push(0); LC.push(0); LD.push(0); LE.push(0); LF.push(0); i = i + 1; }
}

function say(t) { msgText = t; msgT = 3; }

function fmt(x, d) {
  let p = 1;
  for (const _ of rep(d)) { p = p * 10; }
  return Math.round(x * p) / p;
}

// ------------------------------------------------------------
// a ray through rooms and portals.
// mode 1: the laser (keeps its pieces, lights receivers, turns at mirrors)
// mode 2: the hand / the lens (stops at the first cube, lever, mirror or lens panel)
// ------------------------------------------------------------
function rayCast(r, ox, oy, oz, dx, dy, dz, maxL, mode, skip) {
  let cont = 0, seg = 0, t = 0, tb = 0, typ = 0, idx = 0, p = 0, W = 0, H = 0, D = 0, den = 0, hx = 0, hy = 0, hz = 0, a = 0, b = 0, o = 0, s = 0, q = 0;
  let t0 = 0, t1 = 0, lo = 0, hi = 0, ta = 0, tc = 0, left = maxL, nx = 0, ny = 0, nz = 0, m_a = 0, m_b = 0, m_d = 0, m_s = 0, m_vx = 0, m_vy = 0, m_vz = 0, tmp = 0;
  rhT = 0; rhI = 0;
  while (seg < 14) {
    seg = seg + 1;
    W = RW[r]; H = RH[r]; D = RD[r];
    tb = 1000000; typ = 3; idx = 0;
    if (dx > 0.000001) { t = (W - ox) / dx; if (t < tb) { tb = t; } }
    if (dx < -0.000001) { t = (0 - ox) / dx; if (t < tb) { tb = t; } }
    if (dy > 0.000001) { t = (H - oy) / dy; if (t < tb) { tb = t; } }
    if (dy < -0.000001) { t = (0 - oy) / dy; if (t < tb) { tb = t; } }
    if (dz > 0.000001) { t = (D - oz) / dz; if (t < tb) { tb = t; } }
    if (dz < -0.000001) { t = (0 - oz) / dz; if (t < tb) { tb = t; } }
    if (tb < 0) { tb = 0; }
    // portals
    p = RP0[r];
    while (p < RP0[r] + RPN[r]) {
      den = dx * PNX[p] + dy * PNY[p] + dz * PNZ[p];
      if (den < -0.000001) {
        t = 0 - ((ox - PCX[p]) * PNX[p] + (oy - PCY[p]) * PNY[p] + (oz - PCZ[p]) * PNZ[p]) / den;
        if (t > 0.00001 && t < tb + 0.0001) {
          hx = ox + dx * t - PCX[p]; hy = oy + dy * t - PCY[p]; hz = oz + dz * t - PCZ[p];
          a = hx * PRX[p] + hy * PRY[p] + hz * PRZ[p];
          b = hx * PUX[p] + hy * PUY[p] + hz * PUZ[p];
          if (Math.abs(a) <= PW[p] / 2 && b >= 0 && b <= PH[p]) {
            tb = t; idx = p;
            typ = 3;
            if (popen(p) == 1) { typ = 4; }
            if (PK[p] == 1 && mode == 2) { typ = 2; }
          }
        }
      }
      p = p + 1;
    }
    // objects (a slab test)
    o = SO0[stage] + 1;
    while (o <= SO1[stage]) {
      if (OR[o] == r && o != skip && o != held) {
        if (osolid(o) == 1) {
          s = OS[o];
          t0 = -1000000; t1 = 1000000;
          lo = OX[o] - OHX[o] * s; hi = OX[o] + OHX[o] * s;
          if (Math.abs(dx) < 0.000001) { if (ox < lo || ox > hi) { t1 = -1; } }
          else { ta = (lo - ox) / dx; tc = (hi - ox) / dx; if (ta > tc) { tmp = ta; ta = tc; tc = tmp; } if (ta > t0) { t0 = ta; } if (tc < t1) { t1 = tc; } }
          lo = OY[o]; hi = OY[o] + OHY[o] * s;
          if (Math.abs(dy) < 0.000001) { if (oy < lo || oy > hi) { t1 = -1; } }
          else { ta = (lo - oy) / dy; tc = (hi - oy) / dy; if (ta > tc) { tmp = ta; ta = tc; tc = tmp; } if (ta > t0) { t0 = ta; } if (tc < t1) { t1 = tc; } }
          lo = OZ[o] - OHZ[o] * s; hi = OZ[o] + OHZ[o] * s;
          if (Math.abs(dz) < 0.000001) { if (oz < lo || oz > hi) { t1 = -1; } }
          else { ta = (lo - oz) / dz; tc = (hi - oz) / dz; if (ta > tc) { tmp = ta; ta = tc; tc = tmp; } if (ta > t0) { t0 = ta; } if (tc < t1) { t1 = tc; } }
          if (t0 <= t1 && t0 > 0.00001 && t0 < tb) { tb = t0; typ = 1; idx = o; }
        }
      }
      o = o + 1;
    }
    if (tb > left) { tb = left; typ = 0; }
    hx = ox + dx * tb; hy = oy + dy * tb; hz = oz + dz * tb;
    if (mode == 1 && LSN < LMAX) {
      LSN = LSN + 1;
      LSR[LSN] = r; LA[LSN] = ox; LB[LSN] = oy; LC[LSN] = oz; LD[LSN] = hx; LE[LSN] = hy; LF[LSN] = hz;
    }
    rhT = typ; rhI = idx; rhR = r; rhX = hx; rhY = hy; rhZ = hz;
    left = left - tb;
    skip = 0;
    if (typ == 4) {
      // on through the portal
      q = PL[idx];
      M_mapP(idx, q, hx, hy, hz, nx, ny, nz);
      ox = nx; oy = ny; oz = nz;
      M_mapD(idx, q, dx, dy, dz, nx, ny, nz);
      dx = nx; dy = ny; dz = nz;
      left = left * PW[q] / PW[idx];
      r = PR[q];
    } else {
      cont = 0;
      if (typ == 1 && mode == 1) {
        if (OT[idx] == 7) { SG[OSG[idx]] = 1; }
        if (OT[idx] == 10 && Math.abs(dy) < 0.001) {
          // the mirror: on from its middle, turned a quarter
          if (Math.abs(dx) > Math.abs(dz)) { hx = OX[idx]; } else { hz = OZ[idx]; }
          LD[LSN] = hx; LF[LSN] = hz;
          if (mod(OST[idx], 2) == 0) { tmp = dx; dx = dz; dz = tmp; } else { tmp = dx; dx = 0 - dz; dz = 0 - tmp; }
          ox = hx; oy = hy; oz = hz; skip = idx;
          cont = 1;
        }
      }
      if (cont == 0) { seg = 99; }
    }
  }
}

// every laser of the stage (receivers are lit here)
function laserStep() {
  let o = SO0[stage] + 1, k = 0, dx = 0, dy = 0, dz = 0, s = 0;
  LSN = 0;
  while (o <= SO1[stage]) {
    if (OT[o] == 7) { SG[OSG[o]] = 0; }
    o = o + 1;
  }
  o = SO0[stage] + 1;
  while (o <= SO1[stage]) {
    if (OT[o] == 6 && OR[o] > 0) {
      if (sigv(OCD[o]) == 1) {
        k = OP1[o]; dx = 0; dy = 0; dz = 0;
        if (k == 1) { dx = 1; }
        if (k == 2) { dx = -1; }
        if (k == 3) { dy = 1; }
        if (k == 4) { dy = -1; }
        if (k == 5) { dz = 1; }
        if (k == 6) { dz = -1; }
        s = OS[o];
        rayCast(OR[o], OX[o], OY[o] + OHY[o] * s / 2, OZ[o], dx, dy, dz, 400, 1, o);
      }
    }
    o = o + 1;
  }
}

// ------------------------------------------------------------
// cubes fall, land on things, and go through floor portals
// ------------------------------------------------------------
function cubesStep(dt) {
  let sx = 0, sz = 0, t0 = 0, t1 = 0, lo = 0, ta = 0, tb = 0, tm = 0, o = SO0[stage] + 1, j = 0, s = 0, hx = 0, hz = 0, hy = 0, top = 0, rad = 0, x = 0, z = 0, ex0 = 0, ey0 = 0, ez0 = 0, k = 0;
  let p = 0, a = 0, b = 0, vx = 0, vy = 0, vz = 0, hit = 0, d0 = 0, d1 = 0, q = 0, nx = 0, ny = 0, nz = 0, m_a = 0, m_b = 0, m_d = 0, m_s = 0, m_vx = 0, m_vy = 0, m_vz = 0, cy0 = 0, sc = 0, W = 0, D = 0, H = 0, dist = 0;
  while (o <= SO1[stage]) {
    if (OT[o] == 2 && OR[o] > 0) {
      s = OS[o]; hx = OHX[o] * s; hz = OHZ[o] * s; hy = OHY[o] * s;
      if (o == held) {
        // in front of the eye
        dist = RAD * psc + hx * 1.5 + 0.3 * psc;
        W = RW[pr]; D = RD[pr]; H = RH[pr];
        OY[o] = Math.max(0, Math.min(H - hy, py + EYE * psc - 0.55 * psc - hy / 2));
        // pulled back in front of anything solid between the player and where it would be
        sx = sind(yaw); sz = cosd(yaw);
        j = SO0[stage] + 1;
        while (j <= SO1[stage]) {
          if (j != o && OR[j] == pr) {
            if (osolid(j) == 1) {
              k = OS[j];
              if (OY[o] < OY[j] + OHY[j] * k && OY[o] + hy > OY[j]) {
                t0 = -100; t1 = 100;
                lo = OX[j] - OHX[j] * k - hx; top = OX[j] + OHX[j] * k + hx;
                if (Math.abs(sx) < 0.0001) { if (px < lo || px > top) { t1 = -1; } }
                else { ta = (lo - px) / sx; tb = (top - px) / sx; if (ta > tb) { tm = ta; ta = tb; tb = tm; } if (ta > t0) { t0 = ta; } if (tb < t1) { t1 = tb; } }
                lo = OZ[j] - OHZ[j] * k - hz; top = OZ[j] + OHZ[j] * k + hz;
                if (Math.abs(sz) < 0.0001) { if (pz < lo || pz > top) { t1 = -1; } }
                else { ta = (lo - pz) / sz; tb = (top - pz) / sz; if (ta > tb) { tm = ta; ta = tb; tb = tm; } if (ta > t0) { t0 = ta; } if (tb < t1) { t1 = tb; } }
                if (t0 <= t1 && t1 > 0 && t0 < dist) { dist = Math.max(0, t0 - 0.01); }
              }
            }
          }
          j = j + 1;
        }
        x = px + sx * dist; z = pz + sz * dist;
        if (x < hx + 0.01) { x = hx + 0.01; }
        if (x > W - hx - 0.01) { x = W - hx - 0.01; }
        if (z < hz + 0.01) { z = hz + 0.01; }
        if (z > D - hz - 0.01) { z = D - hz - 0.01; }
        OX[o] = x; OZ[o] = z;
        OR[o] = pr; OVY[o] = 0;
      } else {
        cy0 = OY[o] + hy / 2;
        OVY[o] = OVY[o] - GRAV * s * dt;
        if (OVY[o] < 0 - TERMV * s) { OVY[o] = 0 - TERMV * s; }
        OY[o] = OY[o] + OVY[o] * dt;
        // the floor, or a portal hole in it
        if (OY[o] < 0) {
          hit = 0;
          p = RP0[OR[o]];
          while (p < RP0[OR[o]] + RPN[OR[o]]) {
            if (PSD[p] == 5 && popen(p) == 1 && PGL[p] == 0) {
              vx = OX[o] - PCX[p]; vz = OZ[o] - PCZ[p];
              a = vx * PRX[p] + vz * PRZ[p]; b = vx * PUX[p] + vz * PUZ[p];
              if (hx <= PW[p] / 2 && Math.abs(a) <= PW[p] / 2 && b >= 0 && b <= PH[p]) {
                hit = p;
                // (the hole is a funnel: the cube slides to its middle)
                OX[o] = PCX[p] + PUX[p] * PH[p] / 2; OZ[o] = PCZ[p] + PUZ[p] * PH[p] / 2;
              }
            }
            p = p + 1;
          }
          if (hit == 0) { OY[o] = 0; OVY[o] = 0; }
          else {
            // the middle went through: out of the other side
            if (OY[o] + hy / 2 < 0) {
              q = PL[hit]; sc = PW[q] / PW[hit];
              M_mapP(hit, q, OX[o], OY[o] + hy / 2, OZ[o], nx, ny, nz);
              OS[o] = s * sc;
              OR[o] = PR[q];
              OX[o] = nx; OZ[o] = nz; OY[o] = ny - hy * sc / 2;
              M_mapD(hit, q, 0, OVY[o], 0, nx, ny, nz);
              OVY[o] = ny * sc;
              s = OS[o]; hx = OHX[o] * s; hz = OHZ[o] * s; hy = OHY[o] * s;
              if (OY[o] + hy > RH[OR[o]]) { OY[o] = RH[OR[o]] - hy; }
              say('큐브가 포털을 지나갔습니다');
            }
          }
        }
        // land on what is under it
        j = SO0[stage] + 1;
        while (j <= SO1[stage]) {
          if (j != o && OR[j] == OR[o]) {
            if (osolid(j) == 1) {
              k = OS[j];
              top = OY[j] + OHY[j] * k;
              if (Math.abs(OX[o] - OX[j]) < hx + OHX[j] * k - 0.02 && Math.abs(OZ[o] - OZ[j]) < hz + OHZ[j] * k - 0.02) {
                if (OY[o] < top && OY[o] + hy > OY[j]) { OY[o] = top; OVY[o] = 0; }
              }
            }
          }
          j = j + 1;
        }
      }
    }
    o = o + 1;
  }
}

// ------------------------------------------------------------
// signals
// ------------------------------------------------------------
// is someone standing in portal p's doorway
function busy(p) {
  let v = 0, d = 0, a = 0, o = 0;
  if (PR[p] == pr) {
    d = (px - PCX[p]) * PNX[p] + (py + EYE * psc * 0.5 - PCY[p]) * PNY[p] + (pz - PCZ[p]) * PNZ[p];
    a = (px - PCX[p]) * PRX[p] + (py - PCY[p]) * PRY[p] + (pz - PCZ[p]) * PRZ[p];
    if (d < 0.7 * psc + 0.2 && d > -0.5 && Math.abs(a) < PW[p] / 2 + 0.4 * psc) { v = 1; }
  }
  o = SO0[stage] + 1;
  while (o <= SO1[stage]) {
    if (OT[o] == 2 && OR[o] == PR[p] && o != held) {
      d = (OX[o] - PCX[p]) * PNX[p] + (OY[o] - PCY[p]) * PNY[p] + (OZ[o] - PCZ[p]) * PNZ[p];
      a = (OX[o] - PCX[p]) * PRX[p] + (OY[o] - PCY[p]) * PRY[p] + (OZ[o] - PCZ[p]) * PRZ[p];
      if (d < OHX[o] * OS[o] + 0.05 && d > -0.3 && Math.abs(a) < PW[p] / 2 + OHX[o] * OS[o]) { v = 1; }
    }
    o = o + 1;
  }
  busyV = v;
}

function logicStep(dt) {
  let o = SO0[stage] + 1, i = 0, v = 0, j = 0, s = 0, top = 0, k = 0, p = 0, w = 0, n = 0;
  // plates
  while (o <= SO1[stage]) { if (OT[o] == 3) { SG[OSG[o]] = 0; } o = o + 1; }
  o = SO0[stage] + 1;
  while (o <= SO1[stage]) {
    if (OT[o] == 3 && OR[o] > 0) {
      v = 0;
      s = OS[o]; top = OY[o] + OHY[o] * s;
      if (OR[o] == pr && psc >= OP1[o] - 0.001 && OP2[o] == 0) {
        if (Math.abs(px - OX[o]) < OHX[o] * s + RAD * psc * 0.3 && Math.abs(pz - OZ[o]) < OHZ[o] * s + RAD * psc * 0.3 && Math.abs(py - top) < 0.12 * psc) { v = 1; }
      }
      j = SO0[stage] + 1;
      while (j <= SO1[stage]) {
        if (OT[j] == 2 && OR[j] == OR[o] && j != held) {
          if (OS[j] >= OP1[o] - 0.001 && Math.abs(OX[j] - OX[o]) < OHX[o] * s && Math.abs(OZ[j] - OZ[o]) < OHZ[o] * s && Math.abs(OY[j] - top) < 0.1) { v = 1; }
        }
        j = j + 1;
      }
      if (v == 1) { SG[OSG[o]] = 1; }
    }
    if (OT[o] == 4 && OSG[o] > 0) { SG[OSG[o]] = OST[o]; }
    o = o + 1;
  }
  // counters
  i = SC0[stage] + 1;
  while (i <= SC1[stage]) {
    v = 0;
    if (CNE[i] == 1) { if (CN[i] == CNT[i]) { v = 1; } } else { if (CN[i] >= CNT[i]) { v = 1; } }
    SG[CNS[i]] = v;
    i = i + 1;
  }
  // logic nodes, in order
  i = SL0[stage] + 1;
  while (i <= SL1[stage]) {
    if (LGM[i] == 1) { v = 0; if (LG1[i] != 0) { v = Math.max(v, sigv(LG1[i])); } if (LG2[i] != 0) { v = Math.max(v, sigv(LG2[i])); } if (LG3[i] != 0) { v = Math.max(v, sigv(LG3[i])); } if (LG4[i] != 0) { v = Math.max(v, sigv(LG4[i])); } }
    else { v = sigv(LG1[i]) * sigv(LG2[i]) * sigv(LG3[i]) * sigv(LG4[i]); }
    if (LGH[i] > 0) {
      if (v == 1) { LGT[i] = LGH[i]; } else { if (LGT[i] > 0) { LGT[i] = LGT[i] - dt; v = 1; } }
    }
    SG[LGO[i]] = v;
    i = i + 1;
  }
  // switching portals follow their signal once their doorway is clear
  p = SP0[stage] + 1;
  while (p <= SP1[stage]) {
    if (PK[p] == 2) {
      w = PA[p];
      if (sigv(PSW[p]) == 1) { w = PB[p]; }
      if (w != PL[p]) {
        busy(p);
        if (busyV == 0) { PL[p] = w; say('문 뒤의 연결이 바뀌었습니다'); }
      }
    }
    p = p + 1;
  }
}

// doors that change while nobody looks (after the picture: PVIS is what was seen)
function observeStep() {
  let p = SP0[stage] + 1, k = 0, n = 0;
  while (p <= SP1[stage]) {
    if (PK[p] == 3) {
      busyV = 1;
      if (PWAS[p] == 1 && PVIS[p] == 0) { busy(p); }
      if (PWAS[p] == 1 && PVIS[p] == 0 && busyV == 0) {
        k = POI[p] + 1;
        if (k > 3) { k = 1; }
        if (k == 2 && PB[p] == 0) { k = 1; }
        if (k == 3 && PC[p] == 0) { k = 1; }
        POI[p] = k;
        if (k == 1) { PL[p] = PA[p]; }
        if (k == 2) { PL[p] = PB[p]; }
        if (k == 3) { PL[p] = PC[p]; }
      }
      PWAS[p] = PVIS[p];
    }
    p = p + 1;
  }
}

// ------------------------------------------------------------
// the hand: E takes / puts a cube, pulls a lever, turns a mirror, picks a lens panel
// ------------------------------------------------------------
function interact() {
  let cp = cosd(pitch), dx = sind(yaw) * cp, dy = sind(pitch), dz = cosd(yaw) * cp, o = 0, p = 0;
  if (held > 0) {
    held = 0;
    say('큐브를 내려놓았습니다');
  } else {
    rayCast(pr, vEX, vEY, vEZ, dx, dy, dz, LENSR * psc, 2, 0);
    o = rhI;
    if (rhT == 1) {
      if (OT[o] == 2) {
        if (rhR == pr) {
          if (Math.sqrt((OX[o] - px) * (OX[o] - px) + (OZ[o] - pz) * (OZ[o] - pz)) < REACH * psc + OHX[o] * OS[o]) { held = o; say('큐브를 들었습니다 (E: 내려놓기)'); }
          else { say('너무 멉니다'); }
        } else { say('포털 너머의 큐브는 잡을 수 없습니다'); }
      }
      if (OT[o] == 4) {
        if (rhR == pr && Math.sqrt((OX[o] - px) * (OX[o] - px) + (OZ[o] - pz) * (OZ[o] - pz)) < REACH * psc + 0.4) {
          p = OP1[o];
          busyV = 0;
          if (p > 0) { busy(p); }
          if (busyV == 1) { say('통로가 비어 있어야 합니다'); }
          else {
            OST[o] = 1 - OST[o];
            if (OP2[o] > 0) { endingAsk(OP2[o]); if (endingOn == 0) { OST[o] = 0; } }
            else { if (OST[o] == 1) { say('레버: 켬'); } else { say('레버: 끔'); } }
          }
        } else { say('너무 멉니다'); }
      }
      if (OT[o] == 10) {
        if (rhR == pr && Math.sqrt((OX[o] - px) * (OX[o] - px) + (OZ[o] - pz) * (OZ[o] - pz)) < REACH * psc + 0.4) { OST[o] = OST[o] + 1; say('거울을 돌렸습니다'); }
        else { say('너무 멉니다'); }
      }
    }
    if (rhT == 2) { lensUse(rhI); }
  }
}

function lensUse(p) {
  let q = 0, k = 0;
  if (lensSel == 0) { lensSel = p; say('첫 패널을 골랐습니다. 같은 모양의 다른 패널을 고르세요'); }
  else {
    if (lensSel == p) { lensSel = 0; say('선택을 취소했습니다'); }
    else {
      if (PSH[p] != PSH[lensSel]) { say('모양이 다른 패널끼리는 이을 수 없습니다'); }
      else {
        busy(p); k = busyV; busy(lensSel); k = k + busyV;
        if (k > 0) { say('통로가 비어 있어야 합니다'); }
        else {
          if (PL[p] == lensSel) { say('이미 이어져 있습니다'); lensSel = 0; }
          else {
            q = PL[p];
            if (q > 0) { PL[q] = 0; }
            q = PL[lensSel];
            if (q > 0) { PL[q] = 0; }
            PL[p] = lensSel; PL[lensSel] = p;
            lensSel = 0;
            say('두 패널을 이었습니다');
          }
        }
      }
    }
  }
}

// X: cut the pair of the lens panel in sight
function lensCut() {
  let cp = cosd(pitch), q = 0, k = 0;
  rayCast(pr, vEX, vEY, vEZ, sind(yaw) * cp, sind(pitch), cosd(yaw) * cp, LENSR * psc, 2, 0);
  if (rhT == 2) {
    q = PL[rhI];
    if (q > 0) {
      busy(q); k = busyV; busy(rhI); k = k + busyV;
      if (k > 0) { say('통로가 비어 있어야 합니다'); }
      else { PL[q] = 0; PL[rhI] = 0; say('연결을 끊었습니다'); }
    }
  } else { if (lensSel > 0) { lensSel = 0; say('선택을 취소했습니다'); } }
}

// cores and records are taken by walking into them
function pickups() {
  let o = SO0[stage] + 1, d = 0, t = 0;
  while (o <= SO1[stage]) {
    t = OT[o];
    if ((t == 5 || t == 11) && OR[o] == pr) {
      if (oshown(o) == 1) {
        d = Math.sqrt((OX[o] - px) * (OX[o] - px) + (OZ[o] - pz) * (OZ[o] - pz));
        if (d < RAD * psc + 0.35 * OS[o] && OY[o] < py + HT * psc && OY[o] + 0.6 > py) {
          if (t == 5 && stageClear == 0) { stageClear = 1; clearT = 1.6; say('안정화 코어를 얻었습니다!'); OR[o] = 0; }
          if (t == 11) { OR[o] = 0; ORC[o] = 1; recHave = recHave + 1; say('기록을 찾았습니다'); topDirty = 1; }
        }
      }
    }
    o = o + 1;
  }
}

// all records found so far, over all stages
let recAll = 0;
function recordsAll() {
  let o = 1, n = 0;
  while (o <= OT.length) { if (ORC[o] == 1) { n = n + 1; } o = o + 1; }
  recAll = n;
}

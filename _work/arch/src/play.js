// ============================================================
// The player: walking, falling, the walls of the room with their portal holes, objects to
// stand on, and going through portals. The crossing is tested on the eye (the camera
// never stands past a portal's face), with a small margin THR: the eye is moved to 2 THR
// in front of the exit, so it cannot fall back at once.
// ============================================================
let hfit = 0, crossP = 0, busyV = 0;
let pr = 1, px = 0, py = 0, pz = 0, pvx = 0, pvy = 0, pvz = 0, yaw = 0, pitch = 0, psc = 1, held = 0, onGround = 1, lensSel = 0;
let vEX = 0, vEY = 0, vEZ = 0, vRoom = 1, jumpWas = 0, crossN = 0, lastCross = 0;

function M_eye(xx, yy, zz) {
  xx = px; yy = py + EYE * psc; zz = pz;
}

// the portal hole of side `sd` the body fits through now (0: none)
function holeFit(sd) {
  let p = RP0[pr], hit = 0, rad = RAD * psc, ht = HT * psc, a = 0, b = 0, vx = 0, vy = 0, vz = 0, hw = 0, dn = 0;
  while (p < RP0[pr] + RPN[pr]) {
    if (PSD[p] == sd) {
      if (popen(p) == 1 && PGL[p] == 0) {
        vx = px - PCX[p]; vy = py - PCY[p]; vz = pz - PCZ[p];
        a = vx * PRX[p] + vy * PRY[p] + vz * PRZ[p];
        hw = PW[p] / 2 - rad * 0.95;
        if (sd <= 4) {
          if (Math.abs(a) <= hw && vy >= -0.06 * psc && vy + ht <= PH[p] + 0.03 * psc) { hit = p; }
          // already in the doorway: kept inside it
          if (hit == 0 && hw > 0 && Math.abs(a) <= PW[p] / 2 && vy >= -0.06 * psc && vy + ht <= PH[p] + 0.03 * psc) {
            dn = (px - PCX[p]) * PNX[p] + (pz - PCZ[p]) * PNZ[p];
            if (dn < rad * 0.7) {
              if (a > hw) { a = hw; }
              if (a < 0 - hw) { a = 0 - hw; }
              px = PCX[p] + PNX[p] * dn + PRX[p] * a;
              pz = PCZ[p] + PNZ[p] * dn + PRZ[p] * a;
              hit = p;
            }
          }
        } else {
          b = vx * PUX[p] + vy * PUY[p] + vz * PUZ[p];
          if (Math.abs(a) <= hw && b >= rad * 0.95 && b <= PH[p] - rad * 0.95) { hit = p; }
          // already down in the hole: kept inside it
          if (hit == 0 && hw > 0 && Math.abs(a) <= PW[p] / 2 + rad && b >= 0 - rad && b <= PH[p] + rad) {
            if ((sd == 5 && py < -0.03 * psc) || (sd == 6 && py + ht > RH[pr] + 0.03 * psc)) {
              if (a > hw) { a = hw; }
              if (a < 0 - hw) { a = 0 - hw; }
              if (b < rad * 0.95) { b = rad * 0.95; }
              if (b > PH[p] - rad * 0.95) { b = PH[p] - rad * 0.95; }
              px = PCX[p] + PRX[p] * a + PUX[p] * b; pz = PCZ[p] + PRZ[p] * a + PUZ[p] * b;
              hit = p;
            }
          }
        }
      }
    }
    p = p + 1;
  }
  hfit = hit;
}

// keep the body inside the room's box, except where it goes into a portal hole
function collideRoom() {
  let W = RW[pr], H = RH[pr], D = RD[pr], rad = RAD * psc, ht = HT * psc, h = 0;
  if (px < rad) { holeFit(1); if (hfit == 0) { px = rad; if (pvx < 0) { pvx = 0; } } }
  if (px > W - rad) { holeFit(2); if (hfit == 0) { px = W - rad; if (pvx > 0) { pvx = 0; } } }
  if (pz < rad) { holeFit(3); if (hfit == 0) { pz = rad; if (pvz < 0) { pvz = 0; } } }
  if (pz > D - rad) { holeFit(4); if (hfit == 0) { pz = D - rad; if (pvz > 0) { pvz = 0; } } }
  if (py < 0) {
    holeFit(5);
    if (hfit == 0) { py = 0; if (pvy < 0) { pvy = 0; } onGround = 1; }
  }
  if (py + ht > H) {
    holeFit(6);
    if (hfit == 0) { py = H - ht; if (pvy > 0) { pvy = 0; } }
  }
}

// is object o something that stands in the way now
function osolid(o) {
  let t = OT[o], v = 0;
  if (OR[o] > 0 && o != held) {
    if (t <= 4 || t == 6 || t == 7 || t == 9 || t == 10 || t == 12) { v = 1; }
    if (t == 8) { v = 1 - sigv(OCD[o]); }
  }
  return v;
}

// objects of the room: stand on them, step up small ones, be pushed out of the rest
function collideObjs() {
  let o = SO0[stage] + 1, rad = RAD * psc, ht = HT * psc, x0 = 0, x1 = 0, y0 = 0, y1 = 0, z0 = 0, z1 = 0, s = 0, p = 0, skip = 0, a = 0, d = 0, m = 0, k = 0;
  let qa = 0, qb = 0, qc = 0, qd = 0;
  while (o <= SO1[stage]) {
    if (OR[o] == pr) {
      if (osolid(o) == 1) {
        s = OS[o];
        x0 = OX[o] - OHX[o] * s - rad; x1 = OX[o] + OHX[o] * s + rad;
        z0 = OZ[o] - OHZ[o] * s - rad; z1 = OZ[o] + OHZ[o] * s + rad;
        y0 = OY[o]; y1 = OY[o] + OHY[o] * s;
        if (px > x0 && px < x1 && pz > z0 && pz < z1 && py < y1 && py + ht > y0) {
          skip = 0;
          if (OT[o] == 9) {
            // a booth lets the body into its door
            p = OP1[o];
            if (popen(p) == 1) {
              d = (px - PCX[p]) * PNX[p] + (pz - PCZ[p]) * PNZ[p];
              a = (px - PCX[p]) * PRX[p] + (pz - PCZ[p]) * PRZ[p];
              if (Math.abs(a) <= PW[p] / 2 - rad * 0.6 && py >= PCY[p] - 0.06 * psc && py + ht <= PCY[p] + PH[p] + 0.03 * psc && d > 0 - rad) { skip = 1; }
            }
          }
          if (skip == 0) {
            if (py >= y1 - STEP * psc && pvy <= 0.5 * psc) { py = y1; pvy = 0; onGround = 1; }
            else {
              if (py + ht - y0 < 0.25 * psc && pvy > 0) { py = y0 - ht; pvy = 0; }
              else {
                qa = px - x0; qb = x1 - px; qc = pz - z0; qd = z1 - pz;
                m = qa; k = 1;
                if (qb < m) { m = qb; k = 2; }
                if (qc < m) { m = qc; k = 3; }
                if (qd < m) { m = qd; k = 4; }
                if (k == 1) { px = x0; if (pvx > 0) { pvx = 0; } }
                if (k == 2) { px = x1; if (pvx < 0) { pvx = 0; } }
                if (k == 3) { pz = z0; if (pvz > 0) { pvz = 0; } }
                if (k == 4) { pz = z1; if (pvz < 0) { pvz = 0; } }
              }
            }
          }
        }
      }
    }
    o = o + 1;
  }
}

// the eye went from (x0, y0, z0) to the eye now: through which portal (0: none)
function crossing(x0, y0, z0) {
  let p = RP0[pr], hit = 0, thr = THR * psc, d0 = 0, d1 = 0, x1 = px, y1 = py + EYE * psc, z1 = pz, a = 0, b = 0, vx = 0, vy = 0, vz = 0;
  while (p < RP0[pr] + RPN[pr]) {
    if (popen(p) == 1 && PGL[p] == 0) {
      d0 = (x0 - PCX[p]) * PNX[p] + (y0 - PCY[p]) * PNY[p] + (z0 - PCZ[p]) * PNZ[p];
      d1 = (x1 - PCX[p]) * PNX[p] + (y1 - PCY[p]) * PNY[p] + (z1 - PCZ[p]) * PNZ[p];
      if (d0 >= thr - 0.0001 && d1 < thr) {
        vx = x1 - PCX[p]; vy = y1 - PCY[p]; vz = z1 - PCZ[p];
        a = vx * PRX[p] + vy * PRY[p] + vz * PRZ[p];
        b = vx * PUX[p] + vy * PUY[p] + vz * PUZ[p];
        if (Math.abs(a) <= PW[p] / 2 && b >= 0 && b <= PH[p]) { hit = p; }
      }
    }
    p = p + 1;
  }
  crossP = hit;
}

// go through portal p
function teleport(p) {
  let q = PL[p], s = PW[q] / PW[p], m_a = 0, m_b = 0, m_d = 0, m_s = 0, m_vx = 0, m_vy = 0, m_vz = 0, nx = 0, ny = 0, nz = 0, fx0 = sind(yaw), fz0 = cosd(yaw), gx = 0, gy = 0, gz = 0, de = 0;
  M_mapP(p, q, px, py, pz, nx, ny, nz);
  px = nx; py = ny; pz = nz;
  M_mapD(p, q, pvx, pvy, pvz, nx, ny, nz);
  pvx = nx * s; pvy = ny * s; pvz = nz * s;
  M_mapD(p, q, fx0, 0, fz0, gx, gy, gz);
  yaw = atan2d(gx, gz);
  psc = psc * s;
  pr = PR[q];
  // the eye a little in front of the exit
  de = (px - PCX[q]) * PNX[q] + (py + EYE * psc - PCY[q]) * PNY[q] + (pz - PCZ[q]) * PNZ[q];
  if (de < 2 * THR * psc) {
    de = 2 * THR * psc - de;
    px = px + PNX[q] * de; py = py + PNY[q] * de; pz = pz + PNZ[q] * de;
  }
  if (PCT[p] > 0) { CN[PCT[p]] = CN[PCT[p]] + PCTD[p]; topDirty = 1; }
  if (held > 0) { OR[held] = pr; OS[held] = OS[held] * s; }
  crossN = crossN + 1;
  lastCross = p;
  if (PW[q] != PW[p]) {
    if (s < 1) { say(str('작아졌습니다 (크기 ×', fmt(psc, 3), ')')); } else { say(str('커졌습니다 (크기 ×', fmt(psc, 3), ')')); }
  }
}

function moveStep(h) {
  let e0x = px, e0y = py + EYE * psc, e0z = pz, p = 0;
  px = px + pvx * h; py = py + pvy * h; pz = pz + pvz * h;
  onGround = 0;
  collideObjs();
  collideRoom();
  crossing(e0x, e0y, e0z);
  if (crossP > 0) { teleport(crossP); }
}

function playerStep(dt) {
  let mf = 0, ms = 0, sp = SPEED * psc, sy = sind(yaw), cy = cosd(yaw), wx = 0, wz = 0, n = 1, k = 0, v = 0, h = 0, l = 0;
  if (key(87)) { mf = mf + 1; }
  if (key(83)) { mf = mf - 1; }
  if (key(68)) { ms = ms + 1; }
  if (key(65)) { ms = ms - 1; }
  l = Math.sqrt(mf * mf + ms * ms);
  if (l > 1) { mf = mf / l; ms = ms / l; }
  if (key(16)) { sp = sp * 1.6; }
  wx = (sy * mf + cy * ms) * sp; wz = (cy * mf - sy * ms) * sp;
  if (onGround == 1) {
    pvx = wx; pvz = wz;
    if (key(32)) { if (jumpWas == 0) { pvy = JUMPV * psc; onGround = 0; } jumpWas = 1; } else { jumpWas = 0; }
  } else {
    k = dt * AIRC;
    if (k > 1) { k = 1; }
    pvx = pvx + (wx - pvx) * k; pvz = pvz + (wz - pvz) * k;
    if (!key(32)) { jumpWas = 0; }
  }
  pvy = pvy - GRAV * psc * dt;
  if (pvy < 0 - TERMV * psc) { pvy = 0 - TERMV * psc; }
  v = Math.max(Math.abs(pvx), Math.max(Math.abs(pvy), Math.abs(pvz))) * dt;
  n = Math.ceil(v / (0.12 * psc));
  if (n < 1) { n = 1; }
  if (n > 10) { n = 10; }
  h = dt / n;
  k = 0;
  while (k < n) { moveStep(h); k = k + 1; }
  // fell out of the world (should not happen): back to the start
  if (py < -40 * psc || py > RH[pr] + 40) { say('떨어졌습니다. 다시 시작합니다'); loadStage(stage); }
}

// where the camera stands this frame (inside the room by a hair)
function viewEye() {
  let m = 0.004 * psc;
  vRoom = pr;
  vEX = Math.max(m, Math.min(RW[pr] - m, px));
  vEY = Math.max(m, Math.min(RH[pr] - m, py + EYE * psc));
  vEZ = Math.max(m, Math.min(RD[pr] - m, pz));
}

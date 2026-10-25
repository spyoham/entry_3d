// ===================================================================== the match
// 0 menu, 1 in the plane / in the air, 2 on the ground, 3 dead (results), 4 won (results)
let gState = 0, matchSeed = 0, myName = '나', startT = 0, endT = 0;
// plane: a straight line over the island
let planeX0 = 0, planeZ0 = 0, planeX1 = 0, planeZ1 = 0, planeX = 0, planeY = 45000, planeZ = 0, planeT = 0, planeLen = 0, planeOn = 0;
const PLANESPD = 8000;
// zone: the current circle (zcx, zcz, zr) and the next (znx, znz, znr)
let zPhase = 0, zWait = 0, zShr = 0, zcx = 0, zcz = 0, zr = 0, znx = 0, znz = 0, znr = 0, zsx = 0, zsz = 0, zsr = 0, zDps = 0, zMsg = '';
let ZR = [80000, 48000, 28000, 16000, 8000, 3500, 0], ZW = [100, 75, 60, 50, 40, 30, 20], ZS = [70, 55, 45, 35, 30, 25, 30], ZDPS = [0.6, 1, 2, 3.5, 5.5, 8, 12];
// effects: 1 dust, 2 blood, 3 blast, 4 smoke
const NFX = 40;
let FXK = [], FXX = [], FXY = [], FXZ = [], FXT = [];
let fxTop = 0;
// grenades in flight
let GNX = [], GNY = [], GNZ = [], GNVX = [], GNVY = [], GNVZ = [], GNF = [], GNK = [], GNW = [];
// kill feed
let KFS = [], KFT = [];
// marks of sounds the player heard (direction, kind, time)
let SMA = [], SMK = [], SMT = [], SMD = [];
let smTop = 0;

function gameInit() {
  let i = 1;
  while (i <= NFX) { FXK.push(0); FXX.push(0); FXY.push(0); FXZ.push(0); FXT.push(-99); i = i + 1; }
  i = 1;
  while (i <= 8) { GNX.push(0); GNY.push(0); GNZ.push(0); GNVX.push(0); GNVY.push(0); GNVZ.push(0); GNF.push(0); GNK.push(0); GNW.push(0); i = i + 1; }
  i = 1;
  while (i <= 5) { KFS.push(''); KFT.push(-99); i = i + 1; }
  i = 1;
  while (i <= 12) { SMA.push(0); SMK.push(0); SMT.push(-99); SMD.push(0); i = i + 1; }
}

// ---------------------------------------------------------------- a new match
function matchStart() {
  matchSeed = rand(0, 999);
  gameT = 0; startT = 0;
  peopleReset(); aiReset(); lootSpawn();
  let i = 1;
  while (i <= NFX) { FXT[i] = -99; i = i + 1; }
  i = 1;
  while (i <= 8) { GNF[i] = 0; i = i + 1; }
  i = 1;
  while (i <= 5) { KFT[i] = -99; i = i + 1; }
  // the plane's line: through a point near the middle, at a random angle
  let a = rand(0, 359), cx = MAP / 2 + rand(-30000, 30000), cz = MAP / 2 + rand(-30000, 30000);
  planeX0 = cx - sind(a) * 110000; planeZ0 = cz - cosd(a) * 110000;
  planeX1 = cx + sind(a) * 110000; planeZ1 = cz + cosd(a) * 110000;
  planeLen = 220000; planeT = 0; planeOn = 1;
  planeX = planeX0; planeZ = planeZ0;
  // everyone in the plane; the bots choose where to land
  i = 1;
  while (i <= NE) { EAIR[i] = 2; EX[i] = planeX; EZ[i] = planeZ; EY[i] = planeY; i = i + 1; }
  i = 2;
  while (i <= NE) { botPlanJump(i); i = i + 1; }
  EAIR[1] = 2; plVY = 0;
  plYaw = a; plPitch = -20;
  // the zone: the whole island to begin with
  zPhase = 0; zcx = MAP / 2; zcz = MAP / 2; zr = 150000; znx = zcx; znz = zcz; znr = zr; zWait = 60; zShr = 0; zDps = 0;
  fStamp = fStamp + 1; fOn = 0;
  gState = 1;
  txClear();
  msgShow('F: 뛰어내리기', 4);
}
// where a bot lands: a town (weighted by how much is there) or a random house
function botPlanJump(e) {
  let x = 0, z = 0, r = rand(1, 100);
  if (r <= 78) {
    let s = rand(1, SITEX.length);
    let w = SITEW[s];
    if (rand(1, 100) > w * 20) { s = rand(1, SITEX.length); }
    x = SITEX[s] + rand(-100, 100) / 100 * SITER[s]; z = SITEZ[s] + rand(-100, 100) / 100 * SITER[s];
  } else {
    let b = rand(1, IPF.length);
    x = IX[b] + rand(-800, 800); z = IZ[b] + rand(-800, 800);
  }
  // the moment the plane is nearest to that spot, less a little
  let dx = planeX1 - planeX0, dz = planeZ1 - planeZ0;
  let t = ((x - planeX0) * dx + (z - planeZ0) * dz) / (planeLen * planeLen);
  if (t < 0.05) { t = 0.05; }
  if (t > 0.95) { t = 0.95; }
  let jt = t * planeLen / PLANESPD - 3 + rand(0, 40) / 10;
  if (jt < 2) { jt = 2; }
  AJT[e] = jt; AJX[e] = planeX0 + dx * (jt * PLANESPD / planeLen); AJZ[e] = planeZ0 + dz * (jt * PLANESPD / planeLen);
  let hx = x - AJX[e], hz = z - AJZ[e];
  let hd = Math.sqrt(hx * hx + hz * hz);
  // a far landing would not be reached: as far as the glide goes
  if (hd > 42000) { x = AJX[e] + hx / hd * 42000; z = AJZ[e] + hz / hd * 42000; hd = 42000; }
  ALDX[e] = Math.max(3000, Math.min(MAP - 3000, x)); ALDZ[e] = Math.max(3000, Math.min(MAP - 3000, z));
  ALDT[e] = jt + 20 + hd / 4000;
}

// ---------------------------------------------------------------- every frame of a match
function matchStep(dt) {
  gameT = gameT + dt;
  // the plane
  if (planeOn == 1) {
    planeT = planeT + dt;
    let u = planeT * PLANESPD / planeLen;
    planeX = planeX0 + (planeX1 - planeX0) * u; planeZ = planeZ0 + (planeZ1 - planeZ0) * u;
    if (u >= 1) { planeOn = 0; }
  }
  if (EAIR[1] == 2) {
    plX = planeX; plZ = planeZ; plY = planeY - 300;
    if (keyHit(70) == 1 || planeOn == 0) { playerJump(); }
  }
  zoneStep(dt);
  if (fOn == 1) { flowWork(220); }
  pathWork(160);
  botsStep(dt);
  bulletsStep(dt);
  nadesStep(dt);
  // the zone hurts everyone outside it
  if (zDps > 0) {
    let e = 1;
    while (e <= NE) {
      if (EALIVE[e] == 1) { if (EAIR[e] == 0) {
        let dx = EX[e] - zcx, dz = EZ[e] - zcz;
        if (dx * dx + dz * dz > zr * zr) { if (e > 1 || godMode == 0) { EHP[e] = EHP[e] - zDps * dt; if (EHP[e] <= 0) { kill(e, 0, 0, 0); } } }
      } }
      e = e + 1;
    }
  }
  // the last one standing
  if (gState == 2) { if (EALIVE[1] == 1) { if (alive <= 1) { gState = 4; endT = gameT; ERANK[1] = 1; txClear(); mapOpen = 0; sfx(SND_WIN, 0); } } }
}
function playerJump() {
  EAIR[1] = 1; plVY = -1500; plX = planeX; plZ = planeZ; plY = planeY - 400;
  gState = 2;
  msgShow('W: 빠르게 내려가기   F: 낙하산', 3);
}
// falling (1) and the canopy (3): the player
function playerAir(dt) {
  let g = hAt(plX, plZ);
  let fw = 0, sd = 0;
  if (key(87)) { fw = 1; }
  if (key(83)) { fw = -1; }
  if (key(68)) { sd = 1; }
  if (key(65)) { sd = -1; }
  let syw = sind(plYaw), cyw = cosd(plYaw);
  if (EAIR[1] == 1) {
    let vy = -5200;
    if (fw > 0) { if (plPitch < -30) { vy = -6800; } }
    plVY = plVY + (vy - plVY) * Math.min(1, dt * 1.5);
    let hs = 2400 * fw;
    plX = plX + (syw * hs + cyw * sd * 1200) * dt; plZ = plZ + (cyw * hs - syw * sd * 1200) * dt;
    plY = plY + plVY * dt;
    if (plY - g < 12000 || (keyHit(70) == 1 && plY - g < 35000)) { EAIR[1] = 3; sfx(SND_CHUTE, 0); }
  } else {
    plVY = plVY + (-650 - plVY) * Math.min(1, dt * 2);
    let hs = 1300 + fw * 450;
    plX = plX + (syw * hs + cyw * sd * 700) * dt; plZ = plZ + (cyw * hs - syw * sd * 700) * dt;
    plY = plY + plVY * dt;
  }
  plX = Math.max(1500, Math.min(MAP - 1500, plX)); plZ = Math.max(1500, Math.min(MAP - 1500, plZ));
  scanBoxes(plX, plY, plZ, PRAD, PH, 400);
  if (plY <= gndB) { plY = gndB; plVY = 0; EAIR[1] = 0; plGround = 1; }
}

// ---------------------------------------------------------------- the zone
function zoneStep(dt) {
  if (gState >= 1) {
    if (zShr > 0) {
      zShr = zShr - dt;
      let u = 1 - zShr / ZS[zPhase];
      if (zShr <= 0) { u = 1; zShr = 0; }
      zcx = zsx + (znx - zsx) * u; zcz = zsz + (znz - zsz) * u; zr = zsr + (znr - zsr) * u;
      if (zShr <= 0) { zoneNext(); }
    } else {
      zWait = zWait - dt;
      if (zWait <= 0) {
        if (zPhase == 0) { zoneNext(); }
        else { zShr = ZS[zPhase]; zsx = zcx; zsz = zcz; zsr = zr; zDps = ZDPS[zPhase]; msgShow('자기장이 줄어듭니다!', 3); sfx(SND_ZONE, 0); }
      }
    }
  }
}
// pick the next circle inside the current one (on land if it can)
function zoneNext() {
  if (zPhase < 7) {
    zPhase = zPhase + 1;
    let nr = ZR[zPhase];
    let tries = 0, ok = 0, x = zcx, z = zcz;
    while (ok == 0) {
      let a = rand(0, 359), d = Math.sqrt(rand(0, 1000) / 1000) * Math.max(0, zr - nr) * 0.92;
      if (zPhase == 1) { d = Math.sqrt(rand(0, 1000) / 1000) * 30000; }
      x = zcx + sind(a) * d; z = zcz + cosd(a) * d;
      if (zPhase == 1) { x = MAP / 2 + sind(a) * d; z = MAP / 2 + cosd(a) * d; }
      if (hAt(x, z) > 100) { ok = 1; }
      tries = tries + 1;
      if (tries > 12) { ok = 1; }
    }
    znx = x; znz = z; znr = nr;
    if (zPhase == 1) { zr = 150000; zcx = MAP / 2; zcz = MAP / 2; }
    zWait = ZW[zPhase];
    if (zPhase > 1) { zDps = ZDPS[zPhase - 1]; }
    flowStart(znx, znz);
    msgShow(`안전지대가 표시되었습니다 (${zPhase}단계)`, 3);
  }
}
// the wall of the zone: blue upright lines along the circle near the eye
function drawZone() {
  if (gState >= 1) { if (zPhase > 0) {
    let dx = camX - zcx, dz = camZ - zcz;
    let dc = Math.sqrt(dx * dx + dz * dz);
    if (Math.abs(dc - zr) < fogD) {
      // the arc of the circle that is near: angles around the eye's bearing from the centre
      let a0 = atan2d(dx, dz);
      let span = 180;
      if (zr > 1) { span = Math.min(180, fogD / zr * 70); }
      let n = 40, i = 0;
      penSize(1);
      while (i <= n) {
        let a = a0 - span + span * 2 * i / n;
        let x = zcx + sind(a) * zr, z = zcz + cosd(a) * zr;
        let y = hAt(x, z);
        M_zline(x, y - 300, z, y + 9000);
        i = i + 1;
      }
    }
    // out of the zone: the screen tinted
    if (dc > zr) { penAlpha(70); M_box(-245, 140, 245, -140, '#3060c8'); fillStop(); penAlpha(0); }
  } }
}
function M_zline(x, y0, z, y1) {
  let ax = x - camX, az = z - camZ, ay0 = y0 - camY, ay1 = y1 - camY;
  let vz0 = r31 * ax + r32 * ay0 + r33 * az, vz1 = r31 * ax + r32 * ay1 + r33 * az;
  if (vz0 > NZ) { if (vz1 > NZ) {
    let vx = r11 * ax + r13 * az;
    let f0 = fogOf(Math.sqrt(ax * ax + az * az));
    fillStop(); penColorHex(CT[MT_containerB + 7 * 8 + f0 + 1]);
    goto(vx * FOC / vz0, (r21 * ax + r22 * ay0 + r23 * az) * FOC / vz0); penDown();
    goto(vx * FOC / vz1, (r21 * ax + r22 * ay1 + r23 * az) * FOC / vz1); penUp();
  } }
}

// ---------------------------------------------------------------- effects
function fxAdd(x, y, z, k) {
  fxTop = mod(fxTop, NFX) + 1;
  FXK[fxTop] = k; FXX[fxTop] = x; FXY[fxTop] = y; FXZ[fxTop] = z; FXT[fxTop] = gameT;
}
function drawFx(f, dist) {
  let age = gameT - FXT[f], k = FXK[f];
  let life = 0.35;
  if (k == 3) { life = 0.6; }
  if (k == 4) { life = 28; }
  if (age < life) {
    let dx = FXX[f] - camX, dy = FXY[f] - camY, dz = FXZ[f] - camZ;
    let vz = r31 * dx + r32 * dy + r33 * dz;
    if (vz > NZ * 4) {
      let sx = (r11 * dx + r13 * dz) * FOC / vz, sy = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz;
      let s = 16384 * FOC / vz;
      let col = '#8a7a60', r = 12 + age * 60;
      if (k == 2) { col = '#8a1c1c'; r = 10 + age * 40; }
      if (k == 3) { col = '#ffb050'; r = 150 + age * 500; if (age > 0.2) { col = '#5a5550'; } }
      if (k == 4) { col = CT[MT_smoke + 6 * 8 + fogOf(dist) + 1]; r = Math.min(480, 120 + age * 160); if (age > life - 4) { r = r * (life - age) / 4; } }
      r = r * s;
      fillStop(); goto(sx - r, sy); fillColorHex(col); fillStart();
      goto(sx - r * 0.7, sy + r * 0.7); goto(sx, sy + r); goto(sx + r * 0.7, sy + r * 0.7); goto(sx + r, sy); goto(sx + r * 0.7, sy - r * 0.7); goto(sx, sy - r); goto(sx - r * 0.7, sy - r * 0.7);
      nPoly = nPoly + 1;
    }
  }
}
// is a sight line through a smoke cloud?
function smokeBlocks(x0, y0, z0, x1, y1, z1) {
  let r = 0, f = 1;
  while (f <= NFX) {
    if (FXK[f] == 4) { if (gameT - FXT[f] > 1.5) { if (gameT - FXT[f] < 26) {
      let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      let L2 = dx * dx + dy * dy + dz * dz;
      let t = ((FXX[f] - x0) * dx + (FXY[f] - y0) * dy + (FXZ[f] - z0) * dz) / L2;
      if (t > 0) { if (t < 1) {
        let cx = x0 + dx * t - FXX[f], cy = y0 + dy * t - FXY[f], cz = z0 + dz * t - FXZ[f];
        if (cx * cx + cy * cy + cz * cz < 400 * 400) { r = 1; }
      } }
    } } }
    f = f + 1;
  }
  return r;
}

// ---------------------------------------------------------------- grenades (k 1 frag, 2 smoke)
function throwNade(e, tx, ty, tz, k) {
  let n = 1, slot = 0;
  while (n <= 8) { if (slot == 0) { if (GNF[n] <= 0) { slot = n; } } n = n + 1; }
  if (slot > 0) {
    if (k == 1) { EFRAG[e] = EFRAG[e] - 1; } else { ESMK[e] = ESMK[e] - 1; }
    let x = EX[e], y = EY[e] + 160, z = EZ[e];
    let dx = tx - x, dz = tz - z;
    let d = Math.sqrt(dx * dx + dz * dz) + 1;
    // a lob that lands near the spot: flight time from the distance
    let ft = 0.6 + d / 2200;
    GNX[slot] = x; GNY[slot] = y; GNZ[slot] = z;
    GNVX[slot] = dx / ft; GNVZ[slot] = dz / ft; GNVY[slot] = (ty - y) / ft + 490 * ft;
    GNF[slot] = 3.2; GNK[slot] = k; GNW[slot] = e;
  }
}
function playerThrow(k) {
  let ok = 0;
  if (k == 1) { if (EFRAG[1] > 0) { ok = 1; } }
  if (k == 2) { if (ESMK[1] > 0) { ok = 1; } }
  if (ok == 1) {
    EX[1] = plX; EY[1] = plY; EZ[1] = plZ;
    let cp = cosd(plPitch);
    let d = 1500 + Math.max(0, plPitch) * 40;
    throwNade(1, plX + sind(plYaw) * cp * d, plY + 160 + sind(plPitch) * d, plZ + cosd(plYaw) * cp * d, k);
  }
}
function nadesStep(dt) {
  let n = 1;
  while (n <= 8) {
    if (GNF[n] > 0) {
      GNVY[n] = GNVY[n] - 980 * dt;
      let x1 = GNX[n] + GNVX[n] * dt, y1 = GNY[n] + GNVY[n] * dt, z1 = GNZ[n] + GNVZ[n] * dt;
      rayCast(GNX[n], GNY[n], GNZ[n], x1, y1, z1);
      if (rayT < 1) {
        // bounce off whatever it hit, losing speed
        if (rayNX == 1) { GNVX[n] = 0 - GNVX[n] * 0.4; }
        if (rayNX == 2) { GNVY[n] = 0 - GNVY[n] * 0.3; GNVX[n] = GNVX[n] * 0.6; GNVZ[n] = GNVZ[n] * 0.6; }
        if (rayNX == 3) { GNVZ[n] = 0 - GNVZ[n] * 0.4; }
      } else { GNX[n] = x1; GNY[n] = y1; GNZ[n] = z1; }
      let g = hAt(GNX[n], GNZ[n]);
      if (GNY[n] < g + 5) { GNY[n] = g + 5; GNVY[n] = Math.abs(GNVY[n]) * 0.25; GNVX[n] = GNVX[n] * 0.5; GNVZ[n] = GNVZ[n] * 0.5; }
      GNF[n] = GNF[n] - dt;
      if (GNF[n] <= 0) { GNF[n] = 0; nadeBlow(n); }
    }
    n = n + 1;
  }
}
function nadeBlow(n) {
  let x = GNX[n], y = GNY[n] + 20, z = GNZ[n];
  if (GNK[n] == 2) { fxAdd(x, y + 150, z, 4); fxAdd(x + 250, y + 120, z + 100, 4); fxAdd(x - 200, y + 160, z - 150, 4); soundEvent(x, y, z, 2500, GNW[n], 2); }
  else {
    fxAdd(x, y + 60, z, 3);
    soundEvent(x, y, z, 40000, GNW[n], 1);
    sfxAt(SND_BOOM, x, z);
    let e = 1;
    while (e <= NE) {
      if (EALIVE[e] == 1) { if (EAIR[e] == 0) {
        let px = EX[e], py = EY[e] + 90, pz = EZ[e];
        if (e == 1) { px = plX; py = plY + 90; pz = plZ; }
        let dx = px - x, dy = py - y, dz = pz - z;
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 750) {
          rayCast(x, y, z, px, py, pz);
          if (rayT >= 1) { hurt(e, GNW[n], 115 * (1 - d / 750) + 8, 2, 0); }
        }
      } }
      e = e + 1;
    }
  }
}
function drawNade(n, dist) {
  let dx = GNX[n] - camX, dy = GNY[n] - camY, dz = GNZ[n] - camZ;
  let vz = r31 * dx + r32 * dy + r33 * dz;
  if (vz > NZ) {
    let sx = (r11 * dx + r13 * dz) * FOC / vz, sy = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz, r = 7 * 16384 * FOC / vz + 0.6;
    M_box(sx - r, sy - r, sx + r, sy + r, '#3f4a30');
  }
}

// ---------------------------------------------------------------- the kill feed
function killFeed(a, v, g, p) {
  let i = 5;
  while (i > 1) { KFS[i] = KFS[i - 1]; KFT[i] = KFT[i - 1]; i = i - 1; }
  let w = '자기장';
  if (g > 0) { w = GNAME[g]; } else { if (a > 0) { w = '수류탄'; } }
  let hs = '';
  if (p == 1) { hs = ' (헤드샷)'; }
  if (a > 0) { KFS[1] = `${ENAME[a]} ▶ ${ENAME[v]}  [${w}]${hs}`; } else { KFS[1] = `${ENAME[v]} - ${w}`; }
  KFT[1] = gameT;
  if (a == 1) { msgShow(`${ENAME[v]} 처치!${hs}`, 2); }
}
function playerDied(a) {
  gState = 3; endT = gameT; txClear(); mapOpen = 0;
  if (a > 0) { killerName = ENAME[a]; } else { killerName = '자기장'; }
  sfx(SND_DEAD, 0);
}
let killerName = '';
// a sound the player heard: a mark toward it for a moment
function soundMark(dx, dz, kind, d) {
  smTop = mod(smTop, 12) + 1;
  SMA[smTop] = atan2d(dx, dz); SMK[smTop] = kind; SMT[smTop] = gameT; SMD[smTop] = d;
}

// ---------------------------------------------------------------- the dynamic things of a frame, by cell
function dynClear() { dTop = 0; }
function dynAdd(id, x, y, z) {
  let c = Math.floor(z / CS) * CELLS + Math.floor(x / CS) + 1;
  if (c >= 1) { if (c <= CELLS * CELLS) { if (dTop < 590) {
    dTop = dTop + 1;
    DKX[dTop] = x; DKY[dTop] = y; DKZ[dTop] = z; DID[dTop] = id;
    if (DCS[c] != frameNo) { DCS[c] = frameNo; DCH[c] = 0; }
    DNX[dTop] = DCH[c]; DCH[c] = dTop;
  } } }
}
function dynBuild() {
  dTop = 0;
  // (frameNo moves in setCamera: the cells' marks are for the coming frame)
  let fn = frameNo;
  frameNo = frameNo + 1;
  let lim = (drawR + 1) * CS;
  let e = 2;
  while (e <= NE) {
    if (EALIVE[e] == 1) { if (EAIR[e] != 2) {
      let dx = EX[e] - camX, dz = EZ[e] - camZ;
      if (Math.abs(dx) < lim) { if (Math.abs(dz) < lim) { dynAdd(e, EX[e], EY[e], EZ[e]); } }
    } }
    e = e + 1;
  }
  // items within about 45 m
  let cx = Math.floor(camX / CS), cz = Math.floor(camZ / CS);
  let iz = cz - 1;
  while (iz <= cz + 1) {
    let ix = cx - 1;
    while (ix <= cx + 1) {
      if (ix >= 0 && ix < CELLS && iz >= 0 && iz < CELLS) {
        let k = WCH[iz * CELLS + ix + 1];
        while (k > 0) { if (Math.abs(WX[k] - camX) + Math.abs(WZ[k] - camZ) < 3400) { dynAdd(1000 + k, WX[k], WY[k], WZ[k]); } k = WNX[k]; }
      }
      ix = ix + 1;
    }
    iz = iz + 1;
  }
  let f = 1;
  while (f <= NFX) { if (gameT - FXT[f] < 28) { dynAdd(5000 + f, FXX[f], FXY[f], FXZ[f]); } f = f + 1; }
  let n = 1;
  while (n <= 8) { if (GNF[n] > 0) { dynAdd(6000 + n, GNX[n], GNY[n], GNZ[n]); } n = n + 1; }
  // the plane, once the player is out of it
  if (planeOn == 1) { if (EAIR[1] != 2) { dynAdd(7000, planeX, planeY, planeZ); } }
  frameNo = fn;
}
function dynDraw(id, dist) {
  if (id <= NE) { if (EAIR[id] == 0) { drawPerson(id, dist); } else { drawFlyer(id, dist); } }
  else {
    if (id < 5000) { if (dist < 4500) { drawItemDyn(id - 1000, dist); } }
    else { if (id < 6000) { drawFx(id - 5000, dist); } else { if (id < 7000) { drawNade(id - 6000, dist); } else { drawWorldModel((IBASE + 20 - 1) * 3 + 1 + 1, planeX, planeY, planeZ, atan2d(planeX1 - planeX0, planeZ1 - planeZ0), 1, fogOf(dist) * 0); } } }
  }
}
// a bot in the air: the person, and a canopy over them once it is open
function drawFlyer(e, dist) {
  drawPerson(e, dist);
  let t = (gameT - AJT[e]) / (ALDT[e] - AJT[e]);
  if (t > 0.3) {
    bodyMatrix(EX[e], EY[e], EZ[e], EYAW[e]);
    pFog = fogOf(dist);
    pbox(0, 470, 0, 0, 0, 0, 150, 18, 90, MT_containerO);
    pbox(-60, 330, 0, 0, 0, 0, 1, 120, 1, MT_sheet);
    pbox(60, 330, 0, 0, 0, 0, 1, 120, 1, MT_sheet);
    pflush();
  }
}

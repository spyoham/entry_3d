// ===================================================================== weapons
// gun in hand, attachments (packed: muzzle + 16*sight + 256*under + 4096*mag + 65536*stock, each 0 or the
// attachment's index 1..15), firing, bullets in flight, damage.
const NB = 64;
let BX = [], BY = [], BZ = [], BVX = [], BVY = [], BVZ = [], BOWN = [], BDMG = [], BLIFE = [], BGUN = [], BON = [], BTR = [];
let bTop = 0;
let gameT = 0;
// the player's weapon state
let wRec = 0, wRecY = 0, wKick = 0, wAdsT = 0, wSwayT = 0, wFlash = 0, wRelAnim = 0, wSwitch = 0, hitMk = 0, hitMkC = '#ffffff', wBurstN = 0, wTrig = 0;
let fireMode = [];

function weaponInit() {
  let i = 1;
  while (i <= NB) { BX.push(0); BY.push(0); BZ.push(0); BVX.push(0); BVY.push(0); BVZ.push(0); BOWN.push(0); BDMG.push(0); BLIFE.push(0); BGUN.push(0); BON.push(0); BTR.push(0); i = i + 1; }
  i = 1;
  while (i <= NE * 3) { fireMode.push(4); i = i + 1; }
}
function gunNow(e) {
  let c = ECUR[e], g = 0;
  if (c == 1) { g = EG1[e]; }
  if (c == 2) { g = EG2[e]; }
  if (c == 3) { g = EG3[e]; }
  return g;
}
function attNow(e) {
  let c = ECUR[e], a = 0;
  if (c == 1) { a = EA1[e]; }
  if (c == 2) { a = EA2[e]; }
  if (c == 3) { a = EA3[e]; }
  return a;
}
function magNow(e) {
  let c = ECUR[e], m = 0;
  if (c == 1) { m = EM1[e]; }
  if (c == 2) { m = EM2[e]; }
  if (c == 3) { m = EM3[e]; }
  return m;
}
function setMag(e, v) {
  let c = ECUR[e];
  if (c == 1) { EM1[e] = v; }
  if (c == 2) { EM2[e] = v; }
  if (c == 3) { EM3[e] = v; }
}
// the attachment in slot s (1 muzzle .. 5 stock) of packed set a: 0 or 1..15
function attIn(a, s) {
  let k = 1;
  if (s == 2) { k = 16; }
  if (s == 3) { k = 256; }
  if (s == 4) { k = 4096; }
  if (s == 5) { k = 65536; }
  return mod(idiv(a, k), 16);
}
function attPut(a, s, v) {
  let k = 1;
  if (s == 2) { k = 16; }
  if (s == 3) { k = 256; }
  if (s == 4) { k = 4096; }
  if (s == 5) { k = 65536; }
  return a - mod(idiv(a, k), 16) * k + v * k;
}
// slot s of the attachment index ai (1..15) -> attachment number in that slot's own numbering = ai itself
function magSize(g, a) {
  let n = GMAG[g];
  let m = attIn(a, 4);
  if (m == 12) { if (GCLS[g] == 5) { n = n + 0; } else { n = Math.round(n * 1.5); } }
  if (GCLS[g] == 7) { n = GMAG[g]; }
  return n;
}
function ammoOf(e, t) { return EAMMO[(e - 1) * 6 + t]; }
function ammoAdd(e, t, n) { EAMMO[(e - 1) * 6 + t] = EAMMO[(e - 1) * 6 + t] + n; }

// ---------------------------------------------------------------- firing (anyone)
// aim yaw / pitch (degrees) from the eye (x, y, z); spread in degrees
function fireGun(e, x, y, z, yaw, pitch, spread) {
  let g = gunNow(e);
  let a = attNow(e);
  let n = GPEL[g], k = 1;
  if (n > 1) { spread = spread + 2.6; }
  while (k <= n) {
    let sy = yaw + rand(-1000, 1000) / 1000 * spread, sp = pitch + rand(-1000, 1000) / 1000 * spread;
    let cp = cosd(sp);
    let vx = sind(sy) * cp, vy = sind(sp), vz = cosd(sy) * cp;
    spawnBullet(e, g, x + vx * 40, y + vy * 40, z + vz * 40, vx * GVEL[g], vy * GVEL[g], vz * GVEL[g]);
    k = k + 1;
  }
  setMag(e, magNow(e) - 1);
  EFIRE[e] = GINT[g];
  if (GBOLT[g] > 0) { EBOLT[e] = GBOLT[g]; }
  ESHOT[e] = gameT;
  // the sound: everyone near hears it (a suppressor makes it a near sound)
  let loud = 30000;
  if (attIn(a, 1) == 1) { loud = 6000; }
  soundEvent(x, y, z, loud, e, 1);
}
function spawnBullet(e, g, x, y, z, vx, vy, vz) {
  bTop = mod(bTop, NB) + 1;
  BX[bTop] = x; BY[bTop] = y; BZ[bTop] = z; BVX[bTop] = vx; BVY[bTop] = vy; BVZ[bTop] = vz;
  BOWN[bTop] = e; BGUN[bTop] = g; BLIFE[bTop] = 1.6; BON[bTop] = 1; BTR[bTop] = 0;
}
// move every bullet; the segment of this frame against the world and the people
function bulletsStep(dt) {
  let i = 1;
  while (i <= NB) {
    if (BON[i] == 1) {
      let x0 = BX[i], y0 = BY[i], z0 = BZ[i];
      BVY[i] = BVY[i] - 980 * dt;
      let x1 = x0 + BVX[i] * dt, y1 = y0 + BVY[i] * dt, z1 = z0 + BVZ[i] * dt;
      rayCast(x0, y0, z0, x1, y1, z1);
      let tw = rayT;
      let tt = rayTerrain(x0, y0, z0, x1, y1, z1, 6);
      if (tt < tw) { tw = tt; }
      // v1.1: vehicles along it (their bodies stop bullets; through the windows a bullet goes on)
      let hitE = 0, hitP = 0, best = tw, hitV = 0;
      let v = 1;
      while (v <= NV) { if (VON[v] > 0) { let hv = segVeh(v, x0, y0, z0, x1, y1, z1); if (hv < best) { best = hv; hitV = v; } } v = v + 1; }
      // people along the segment, before the wall
      let e = 1;
      while (e <= NE) {
        if (EALIVE[e] == 1) { if (e != BOWN[i]) {
          let ht = segPerson(e, x0, y0, z0, x1, y1, z1);
          if (ht < best) { best = ht; hitE = e; hitP = segPart; hitV = 0; }
        } }
        e = e + 1;
      }
      BTR[i] = BTR[i] + 1;
      if (hitE > 0) {
        BON[i] = 0;
        let dist = GVEL[BGUN[i]] * (1.6 - BLIFE[i] + dt * best);
        hurt(hitE, BOWN[i], gunDamage(BGUN[i], dist, hitP), hitP, BGUN[i]);
        fxAdd(x0 + (x1 - x0) * best, y0 + (y1 - y0) * best, z0 + (z1 - z0) * best, 2);
      } else { if (hitV > 0) {
        BON[i] = 0;
        let dist = GVEL[BGUN[i]] * (1.6 - BLIFE[i] + dt * best);
        vehShot(hitV, BOWN[i], gunDamage(BGUN[i], dist, 2));
        fxAdd(x0 + (x1 - x0) * best, y0 + (y1 - y0) * best, z0 + (z1 - z0) * best, 1);
        soundEvent(x0 + (x1 - x0) * best, y0 + (y1 - y0) * best, z0 + (z1 - z0) * best, 1500, BOWN[i], 2);
      } else {
        if (tw < 1) {
          BON[i] = 0;
          fxAdd(x0 + (x1 - x0) * tw, y0 + (y1 - y0) * tw, z0 + (z1 - z0) * tw, 1);
          // a bullet striking near someone is heard by them
          soundEvent(x0 + (x1 - x0) * tw, y0 + (y1 - y0) * tw, z0 + (z1 - z0) * tw, 1500, BOWN[i], 2);
        } else {
          BX[i] = x1; BY[i] = y1; BZ[i] = z1;
          BLIFE[i] = BLIFE[i] - dt;
          if (BLIFE[i] <= 0) { BON[i] = 0; }
        }
      } }
      // the tracer: a short line along the segment (only near the eye)
      if (BTR[i] > 1) { if (Math.abs(x0 - camX) + Math.abs(z0 - camZ) < 25000) { tracer(x0, y0, z0, BX[i], BY[i], BZ[i]); } }
    }
    i = i + 1;
  }
}
// where the segment meets entity e's body (a vertical capsule): t (0..1) or 2; segPart: 1 head 2 body 3 legs
let segPart = 0;
function segPerson(e, x0, y0, z0, x1, y1, z1) {
  let r = 2;
  let px = EX[e], pz = EZ[e];
  let dx = x1 - x0, dz = z1 - z0;
  // the bounding box first
  if (Math.min(x0, x1) < px + 60) { if (Math.max(x0, x1) > px - 60) { if (Math.min(z0, z1) < pz + 60) { if (Math.max(z0, z1) > pz - 60) {
    let L2 = dx * dx + dz * dz;
    let t = 0;
    if (L2 > 0) { t = ((px - x0) * dx + (pz - z0) * dz) / L2; }
    if (t < 0) { t = 0; }
    if (t > 1) { t = 1; }
    let cx = x0 + dx * t - px, cz = z0 + dz * t - pz;
    let d2 = cx * cx + cz * cz;
    let hgt = 176;
    if (ECRO[e] == 1) { hgt = 128; }
    if (EVEH[e] > 0) { hgt = 150; }
    let yy = y0 + (y1 - y0) * t - EY[e];
    if (d2 < 30 * 30) { if (yy > 0) { if (yy < hgt) {
      r = t;
      segPart = 2;
      if (yy > hgt - 27) { if (d2 < 16 * 16) { segPart = 1; } else { r = 2; } }
      if (yy < hgt * 0.5) { segPart = 3; }
    } } }
  } } } }
  return r;
}
// damage of gun g at distance d (cm) on part p
function gunDamage(g, d, p) {
  let dm = GDMG[g];
  let rg = GRANGE[g];
  if (d > rg) { dm = dm * Math.max(0.55, 1 - (d - rg) / rg * 0.45); }
  if (p == 1) { dm = dm * 2.1; }
  if (p == 3) { dm = dm * 0.75; }
  return dm;
}
// victim v hurt by attacker a (0: the zone) for dm on part p with gun g
let godMode = 0;
function hurt(v, a, dm, p, g) {
  if (v == 1) { if (godMode == 1) { dm = 0; } }
  if (EALIVE[v] == 1) {
    // armour takes its share and wears down
    if (p == 1) { if (EHEL[v] > 0) { dm = dm * (0.85 - EHEL[v] * 0.12); EHELD[v] = EHELD[v] - dm; if (EHELD[v] <= 0) { EHEL[v] = 0; } } }
    if (p == 2) { if (EVES[v] > 0) { dm = dm * (0.85 - EVES[v] * 0.12); EVESD[v] = EVESD[v] - dm; if (EVESD[v] <= 0) { EVES[v] = 0; } } }
    EHP[v] = EHP[v] - dm;
    EHURT[v] = gameT; ELASTA[v] = a;
    if (EUSE[v] > 0) { EUSE[v] = 0; }
    if (a > 0) { EDMG[a] = EDMG[a] + dm; }
    if (a == 1) {
      hitMk = 0.18; hitMkC = '#ffffff';
      if (p == 1) { hitMkC = '#ffd24a'; }
      sfx(SND_HIT, 0);
    }
    if (v == 1) { hurtDir = a; hurtT = 0.9; sfx(SND_HURT, 0); }
    if (a > 1) { botHurtBy(v, a); } else { if (v > 1) { botHurtBy(v, a); } }
    if (EHP[v] <= 0) { kill(v, a, g, p); }
  }
}
let hurtDir = 0, hurtT = 0;
function kill(v, a, g, p) {
  if (EVEH[v] > 0) { vehOut(v, 0); }
  EHP[v] = 0; EALIVE[v] = 0;
  ERANK[v] = alive;
  alive = alive - 1;
  if (a > 0) { EKILLS[a] = EKILLS[a] + 1; }
  if (a == 1) { hitMkC = '#ff4a3d'; sfx(SND_KILL, 0); }
  killFeed(a, v, g, p);
  dropAll(v);
  if (v == 1) { playerDied(a); }
}

// ---------------------------------------------------------------- the player's gun
// effective numbers of the player's gun with its attachments
let pZoom = 1, pRv = 1, pRh = 1, pRec = 20, pHip = 2, pAds = 0.3, pAdsSpd = 5, pSight = 0;
function playerGunStats() {
  let g = gunNow(1), a = attNow(1);
  if (g > 0) {
    pRv = GRV[g]; pRh = GRH[g]; pRec = GREC[g]; pHip = GHIP[g]; pAds = GADS[g]; pZoom = GZOOM[g]; pAdsSpd = 6;
    let mz = attIn(a, 1), st = attIn(a, 2), un = attIn(a, 3), sk = attIn(a, 5);
    if (mz == 2) { pRv = pRv * 0.75; pRh = pRh * 0.85; }
    if (mz == 3) { pRv = pRv * 0.9; pRh = pRh * 0.9; }
    if (un == 9) { pRv = pRv * 0.85; }
    if (un == 10) { pRh = pRh * 0.85; pAdsSpd = 7.5; }
    if (un == 11) { pHip = pHip * 0.7; }
    if (sk == 14) { pRec = pRec * 1.2; pRv = pRv * 0.92; }
    if (sk == 15) { pRec = pRec * 1.15; pAds = pAds * 0.7; }
    pSight = st;
    if (st > 0) { pZoom = AZOOM[st]; }
  }
}
function playerWeapon(dt) {
  let g = gunNow(1);
  EFIRE[1] = Math.max(0, EFIRE[1] - dt);
  EBOLT[1] = Math.max(0, EBOLT[1] - dt);
  wFlash = Math.max(0, wFlash - dt);
  hitMk = Math.max(0, hitMk - dt);
  wSwitch = Math.max(0, wSwitch - dt * 3);
  // slots
  if (keyHit(49) == 1) { M_slot(1); }
  if (keyHit(50) == 1) { M_slot(2); }
  if (keyHit(51) == 1) { M_slot(3); }
  if (keyHit(66) == 1) { if (g > 0) { M_nextMode(g); } }
  // X: drop the gun in hand (with its attachments)
  if (keyHit(88) == 1) { if (g > 0) {
    itemAdd(g, plX + sind(plYaw) * 80, plY + 2, plZ + cosd(plYaw) * 80, 1);
    dropAtts(1, ECUR[1], plX + sind(plYaw) * 80, plY + 2, plZ + cosd(plYaw) * 80);
    if (ECUR[1] == 1) { EG1[1] = 0; EA1[1] = 0; ammoAdd(1, GAMMO[g], EM1[1]); EM1[1] = 0; }
    if (ECUR[1] == 2) { EG2[1] = 0; EA2[1] = 0; ammoAdd(1, GAMMO[g], EM2[1]); EM2[1] = 0; }
    if (ECUR[1] == 3) { EG3[1] = 0; EA3[1] = 0; ammoAdd(1, GAMMO[g], EM3[1]); EM3[1] = 0; }
    ERELT[1] = 0; playerGunStats(); sfx(SND_EQUIP, 0);
  } }
  g = gunNow(1);
  // aiming down the sights (E held)
  let ads = 0;
  if (key(69)) { if (g > 0) { if (ERELT[1] <= 0) { if (plSprint == 0) { ads = 1; } } } }
  EADS[1] = ads;
  if (ads == 1) { wAdsT = Math.min(1, wAdsT + dt * pAdsSpd); } else { wAdsT = Math.max(0, wAdsT - dt * 7); }
  // reload
  if (ERELT[1] > 0) {
    ERELT[1] = ERELT[1] - dt;
    if (ERELT[1] <= 0) { ERELT[1] = 0; reloadDone(1); }
  } else {
    if (g > 0) {
      if (keyHit(82) == 1) { startReload(1); }
    }
  }
  // the trigger
  let trig = 0;
  if (mouseDown()) { trig = 1; }
  if (clickLatch == 1) { trig = 1; }
  if (g > 0) {
    if (trig == 1) {
      if (ERELT[1] <= 0) { if (EFIRE[1] <= 0) { if (EBOLT[1] <= 0) { if (wSwitch <= 0) {
        let mode = fireMode[(1 - 1) * 3 + ECUR[1]];
        let go = 0;
        if (mode == 4) { go = 1; }
        if (mode == 1) { if (wTrig == 0) { go = 1; } }
        if (mode == 2) { if (wTrig == 0) { wBurstN = 3; } if (wBurstN > 0) { go = 1; wBurstN = wBurstN - 1; } }
        if (go == 1) {
          if (magNow(1) > 0) { playerShoot(g); }
          else { if (wTrig == 0) { sfx(SND_EMPTY, 0); startReload(1); } }
        }
      } } } }
      wTrig = 1;
    } else {
      wTrig = 0;
      // a burst carries on after the button is let go
      if (wBurstN > 0) { if (wBurstN < 3) { if (EFIRE[1] <= 0) { if (magNow(1) > 0) { playerShoot(g); wBurstN = wBurstN - 1; } else { wBurstN = 0; } } } else { wBurstN = 0; } }
    }
  }
  clickLatch = 0;
  // recoil recovers
  let back = pRec * dt;
  if (wRec > 0) { let r = Math.min(wRec, back); wRec = wRec - r; plPitch = plPitch - r; }
  wKick = wKick * Math.max(0, 1 - dt * 14);
}
function M_slot(s) {
  let has = 0;
  if (s == 1) { has = EG1[1]; }
  if (s == 2) { has = EG2[1]; }
  if (s == 3) { has = EG3[1]; }
  if (has > 0) { if (ECUR[1] != s) { ECUR[1] = s; ERELT[1] = 0; wSwitch = 1; wAdsT = 0; playerGunStats(); sfx(SND_EQUIP, 0); } }
}
function M_nextMode(g) {
  let k = (1 - 1) * 3 + ECUR[1];
  let m = fireMode[k], tries = 0, md = GMODE[g];
  let go = 1;
  while (go == 1) {
    m = m * 2;
    if (m > 4) { m = 1; }
    if (mod(idiv(md, m), 2) == 1) { go = 0; }
    tries = tries + 1;
    if (tries > 4) { go = 0; }
  }
  fireMode[k] = m;
  sfx(SND_EQUIP, 0);
}
function playerShoot(g) {
  let spread = pHip * (1 - wAdsT) + pAds * wAdsT;
  if (plMoving == 1) { spread = spread + 1.2 * (1 - wAdsT * 0.6); }
  if (plGround == 0) { spread = spread + 4; }
  if (plCrouch == 1) { spread = spread * 0.8; }
  // v1.1: seen from behind (third person) the shot goes from the eye to what the crosshair is on
  let ox = camX, oy = camY, oz = camZ, ay = plYaw, ap = plPitch;
  if (camMode == 1) {
    let cp = cosd(plPitch);
    let dx = sind(plYaw) * cp, dy = sind(plPitch), dz = cosd(plYaw) * cp;
    let L = 30000;
    rayCast(camX, camY, camZ, camX + dx * L, camY + dy * L, camZ + dz * L);
    let t = rayT;
    let tt = rayTerrain(camX, camY, camZ, camX + dx * L, camY + dy * L, camZ + dz * L, 24);
    if (tt < t) { t = tt; }
    let px = camX + dx * L * t, py = camY + dy * L * t, pz = camZ + dz * L * t;
    ox = plX; oy = plY + plEye; oz = plZ;
    // (a point closer than the player himself: straight on from the eye)
    let hx = px - ox, hz = pz - oz;
    let hd = Math.sqrt(hx * hx + hz * hz);
    if (hd > 150) { ay = atan2d(hx, hz); ap = atand((py - oy) / hd); }
  }
  fireGun(1, ox, oy, oz, ay, ap, spread);
  // recoil: the view climbs, a little sideways
  let kv = pRv * (1 - wAdsT * 0.25);
  plPitch = plPitch + kv; wRec = wRec + kv * 0.7;
  plYaw = plYaw + rand(-100, 100) / 100 * pRh;
  wKick = 1; wFlash = 0.05;
  if (attIn(attNow(1), 1) == 1) { wFlash = 0; }
  sfxGun(g, attIn(attNow(1), 1), 0);
}
function startReload(e) {
  let g = gunNow(e);
  if (g > 0) {
    let full = magSize(g, attNow(e));
    if (magNow(e) < full) { if (ammoOf(e, GAMMO[g]) > 0) {
      let t = GREL[g];
      if (attIn(attNow(e), 4) == 13) { t = t * 0.7; }
      if (GCLS[g] == 6) { t = GREL[g]; }
      ERELT[e] = t;
      if (e == 1) { wAdsT = 0; sfx(SND_RELOAD, 0); }
    } }
  }
}
function reloadDone(e) {
  let g = gunNow(e);
  let full = magSize(g, attNow(e));
  let need = full - magNow(e);
  if (GCLS[g] == 6) { need = 1; }
  let have = ammoOf(e, GAMMO[g]);
  let n = Math.min(need, have);
  setMag(e, magNow(e) + n);
  ammoAdd(e, GAMMO[g], 0 - n);
  // a shotgun goes on loading shell after shell
  if (GCLS[g] == 6) { if (magNow(e) < full) { if (ammoOf(e, GAMMO[g]) > 0) { ERELT[e] = GREL[g]; } } }
}

// ---------------------------------------------------------------- the gun in the player's hands
function drawViewGun() {
  let g = gunNow(1);
  if (g > 0) {
    let st = pSight;
    // a 4x or 8x scope fully up: the scope picture instead of the gun
    let scoped = 0;
    if (wAdsT > 0.92) { if (st >= 6) { scoped = 1; } }
    if (scoped == 1) { drawScope(st); } else {
      let a = attNow(1);
      let t = wAdsT * wAdsT * (3 - 2 * wAdsT);
      // hip: right and low; ads: the sight line on the eye's
      let sy = GSY[g];
      if (st > 0) { sy = GRAY[g] + 30; if (st == 6) { sy = GRAY[g] + 30; } }
      let hx = 10.5, hy = -11.5, hz = 27;
      if (GCLS[g] == 1) { hx = 8.5; hy = -9.5; hz = 22; }
      let ax = 0, ay = 0 - sy / 10, az = 15;
      if (GCLS[g] == 1) { az = 22; }
      if (st >= 6) { az = 11; }
      let ox = hx + (ax - hx) * t, oy = hy + (ay - hy) * t, oz = hz + (az - hz) * t;
      // sway walking, kick when firing, dip when reloading or switching
      let bob = 0;
      if (plMoving == 1) { wSwayT = wSwayT + dtF * (6 + plSprint * 4); bob = 1 - t * 0.8; }
      ox = ox + sind(wSwayT * 57) * 0.5 * bob;
      oy = oy - Math.abs(cosd(wSwayT * 57)) * 0.5 * bob;
      oz = oz - wKick * (1.6 - t * 0.9);
      let pit = wKick * (4 - t * 3);
      if (ERELT[1] > 0) { pit = pit - 30; oy = oy - 4; }
      if (wSwitch > 0) { pit = pit - wSwitch * 40; oy = oy - wSwitch * 6; }
      if (plSprint == 1) { pit = pit - 12; ox = ox - 2; }
      let yw = 0 - (1 - t) * 3;
      // model (mm) -> view (cm x 16384): Ry(yw) * Rx(-pit)
      let cp = cosd(pit), sp = sind(pit), cy = cosd(yw), sy2 = sind(yw);
      let k = 1638.4;
      // Rx(pit): y' = y cp + z sp, z' = -y sp + z cp (nose up for pit > 0); then Ry(yw): x'' = x cy + z' sy2, z'' = -x sy2 + z' cy
      m11 = k * cy; m12 = 0 - k * sp * sy2; m13 = k * cp * sy2;
      m21 = 0; m22 = k * cp; m23 = k * sp;
      m31 = 0 - k * sy2; m32 = 0 - k * sp * cy; m33 = k * cp * cy;
      t1 = ox * 16384; t2 = oy * 16384; t3 = oz * 16384;
      // the eye in the gun's frame (mm): the transpose of the rotation, times -offset
      let ex = 0 - ox * 10, ey = 0 - oy * 10, ez = 0 - oz * 10;
      let lx = cy * ex - sy2 * ez, lz0 = sy2 * ex + cy * ez;
      let ly = cp * ey - sp * lz0, lz = sp * ey + cp * lz0;
      // below the gun first (grip, magazine extension), the gun, then on top and in front
      let un = attIn(a, 3), mg = attIn(a, 4), mz = attIn(a, 1), sk = attIn(a, 5);
      if (un > 0) { M_attDraw(un, GUNY[g], GUNZ[g]); }
      if (mg > 0) { M_attDraw(mg, GMBY[g], GMBZ[g]); }
      drawModel((GBASE + g - 1) * 3 + 1, lx, ly, lz, 0, 0);
      if (sk > 0) { M_attDraw(sk, GSTY[g], GSTZ[g]); }
      if (mz > 0) { M_attDraw(mz, GBORE[g], GMZ[g]); }
      // the sight: its body only while it is not in front of the eye
      if (st > 0) { if (t < 0.6) { M_attDraw(st, GRAY[g], GRAZ[g]); } }
      // the muzzle flash
      if (wFlash > 0) { muzzleFlash(ox, oy, oz + GMZ[g] / 10 * cp, t); }
      // red dot / holographic: the reticle when aiming
      if (t > 0.6) {
        if (st == 4) { M_ring(0, 0, 34, '#202020'); M_dot(0, 0, 1.4, '#ff3030'); }
        if (st == 5) { hudLine(-40, -28, 40, -28, 3, '#202020'); hudLine(-40, -28, -40, 30, 3, '#202020'); hudLine(40, -28, 40, 30, 3, '#202020'); hudLine(-40, 30, 40, 30, 4, '#202020'); M_ring(0, 0, 9, '#ff5040'); M_dot(0, 0, 1.2, '#ff5040'); }
      }
    }
  }
}
// attachment ai drawn at mount (my, mz) mm of the gun: the gun's matrix, moved by the mount
function M_attDraw(ai, my, mz) {
  let s1 = t1, s2 = t2, s3 = t3;
  t1 = t1 + (m12 * my + m13 * mz); t2 = t2 + (m22 * my + m23 * mz); t3 = t3 + (m32 * my + m33 * mz);
  drawModel((ABASE + ai - 1) * 3 + 1, lx, ly - my, lz - mz, 0, 0);
  t1 = s1; t2 = s2; t3 = s3;
}
function muzzleFlash(x, y, z, t) {
  if (z > 2) {
    let sx = x * FOC / z, sy = (y + 0.5) * FOC / z, r = 30 / z * FOC / 10 + 4;
    fillStop(); goto(sx - r, sy); fillColorHex('#ffd27a'); fillStart(); goto(sx, sy + r * 0.6); goto(sx + r, sy); goto(sx, sy - r * 0.6);
    goto(sx - r * 0.4, sy + r * 0.25); goto(sx, sy + r * 1.3); goto(sx + r * 0.4, sy + r * 0.25);
  }
}
function M_dot(x, y, r, col) {
  fillStop(); goto(x - r, y); fillColorHex(col); fillStart(); goto(x, y + r); goto(x + r, y); goto(x, y - r);
}
function M_ring(x, y, r, col) {
  penSize(1.2); penColorHex(col); fillStop(); goto(x + r, y); penDown();
  goto(x + r * 0.71, y + r * 0.71); goto(x, y + r); goto(x - r * 0.71, y + r * 0.71); goto(x - r, y); goto(x - r * 0.71, y - r * 0.71); goto(x, y - r); goto(x + r * 0.71, y - r * 0.71); goto(x + r, y);
  penUp();
}
// a 4x / 8x scope: black all round a circle, a reticle in it
function drawScope(st) {
  let R = 118, i = 0;
  if (st == 6) { R = 135; }
  fillStop();
  goto(250, 0); fillColorHex('#050505'); fillStart();
  goto(250, 145); goto(-250, 145); goto(-250, -145); goto(250, -145); goto(250, 0); goto(R, 0);
  // the hole, the other way round
  i = 1;
  while (i <= 24) { goto(R * cosd(i * -15), R * sind(i * -15)); i = i + 1; }
  goto(250, 0);
  fillStop();
  if (st == 8) {
    hudLine(-R, 0, -6, 0, 1, '#000000'); hudLine(6, 0, R, 0, 1, '#000000'); hudLine(0, -R, 0, -6, 1, '#000000'); hudLine(0, 6, 0, R * 0.6, 1, '#000000');
    hudLine(-R, 0, -40, 0, 3, '#000000'); hudLine(40, 0, R, 0, 3, '#000000'); hudLine(0, -R, 0, -40, 3, '#000000');
    M_dot(0, 0, 1, '#ff2020');
  } else { if (st == 6) {
    M_dot(0, 0, 1.6, '#ff3030'); hudLine(-R, 0, -12, 0, 1, '#101010'); hudLine(12, 0, R, 0, 1, '#101010');
  } else {
    // ACOG: a chevron and drop marks
    fillStop(); goto(0, 0); fillColorHex('#ff3a20'); fillStart(); goto(-5, -8); goto(-2, -8); goto(0, -4); goto(2, -8); goto(5, -8);
    fillStop();
    hudLine(0, -14, 0, -60, 1, '#101010'); hudLine(-4, -24, 4, -24, 1, '#101010'); hudLine(-3, -34, 3, -34, 1, '#101010'); hudLine(-2, -44, 2, -44, 1, '#101010');
  } }
  // the edge of the glass
  penSize(2); penColorHex('#202020'); fillStop(); goto(R, 0); penDown();
  i = 1;
  while (i <= 24) { goto(R * cosd(i * 15), R * sind(i * 15)); i = i + 1; }
  penUp();
}
// the line of a bullet's path in this frame
function tracer(x0, y0, z0, x1, y1, z1) {
  let ax = x0 - camX, ay = y0 - camY, az = z0 - camZ, bx = x1 - camX, by = y1 - camY, bz = z1 - camZ;
  let za = r31 * ax + r32 * ay + r33 * az, zb = r31 * bx + r32 * by + r33 * bz;
  if (za > NZ * 10) { if (zb > NZ * 10) {
    let sxa = (r11 * ax + r13 * az) * FOC / za, sya = (r21 * ax + r22 * ay + r23 * az) * FOC / za;
    let sxb = (r11 * bx + r13 * bz) * FOC / zb, syb = (r21 * bx + r22 * by + r23 * bz) * FOC / zb;
    // only the far 40% of the step: a streak, not a rope
    fillStop(); penSize(1); penColorHex('#ffe7a0'); goto(sxa + (sxb - sxa) * 0.6, sya + (syb - sya) * 0.6); penDown(); goto(sxb, syb); penUp();
  } }
}

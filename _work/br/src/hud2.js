// ===================================================================== the screen in a match
let msgT = 0, msgS = '', invOpen = 0, mapOpen = 0;
const C_W = '#ffffff', C_DIM = '#b8c0c8', C_RED = '#ff4a3d', C_GOLD = '#ffd24a', C_SKY = '#9fd8ff';
function msgShow(s, t) { msgS = s; msgT = t; }
function mmss(t) {
  let m = Math.floor(t / 60), s = Math.floor(t - m * 60);
  let z = '';
  if (s < 10) { z = '0'; }
  return `${m}:${z}${s}`;
}

function playerHud(dt) {
  let g = gunNow(1);
  msgT = Math.max(0, msgT - dt);
  pickMsgT = Math.max(0, pickMsgT - dt);
  hurtT = Math.max(0, hurtT - dt);
  hudCross(g);
  // where the hurt came from: a red arc
  if (hurtT > 0) { if (hurtDir > 0) {
    let a = atan2d(EX[hurtDir] - plX, EZ[hurtDir] - plZ) - plYaw;
    arcAt(a, 46, '#d83020');
  } }
  // sounds heard: marks round the middle
  let i = 1;
  while (i <= 12) {
    let age = gameT - SMT[i];
    if (age < 2.2) {
      let col = '#ffa040';
      if (SMK[i] == 3) { col = '#e8e8e8'; }
      if (SMK[i] == 2) { col = '#ffe060'; }
      markAt(SMA[i] - plYaw, 62, col, age);
    }
    i = i + 1;
  }
  // health and boost
  hudBox(-72, -121, 72, -115, '#202428');
  let hp = Math.max(0, EHP[1]);
  let hc = '#e8e8e8';
  if (hp < 50) { hc = '#e89090'; }
  if (hp < 25) { hc = '#e84a3a'; }
  hudBox(-71, -120, -71 + 142 * hp / 100, -116, hc);
  if (EBOOST[1] > 0) { hudBox(-71, -113, -71 + 142 * EBOOST[1] / 100, -111.5, '#f0c040'); }
  if (EUSE[1] > 0) { hudBox(-40, -100, 40, -97, '#303438'); hudBox(-40, -100, -40 + 80 * (1 - EUSE[1] / healTime(EUSEK[1])), -97, '#7fd07f'); }
  if (ERELT[1] > 0) { if (g > 0) { hudBox(-40, -94, -40 + 80 * Math.max(0, 1 - ERELT[1] / reloadOf(g, attNow(1))), -92, '#c8c8c8'); } }
  // the compass
  hudBox(-90, 118, 90, 119, '#c8d0d8');
  let k = 0;
  while (k < 8) {
    let d = k * 45 - plYaw;
    if (d > 180) { d = d - 360; }
    if (d < -180) { d = d + 360; }
    if (Math.abs(d) < 80) { tx(18 + k, CPN[k + 1], d * 1.1, 128, 9, C_W, 0); hudLine(d * 1.1, 116, d * 1.1, 119, 1, C_W); } else { txOff(18 + k); }
    k = k + 1;
  }
  tx(26, `${Math.round(plYaw)}`, 0, 110, 8, C_GOLD, 0);
  // alive / kills
  tx(10, `생존 ${alive}   처치 ${EKILLS[1]}`, 236, 128, 10, C_W, 2);
  // the zone clock
  if (zPhase > 0) { if (zShr > 0) { tx(27, `자기장 축소 중 ${mmss(zShr)}`, 236, 116, 9, '#7fb0ff', 2); } else { tx(27, `다음 자기장 ${mmss(zWait)}`, 236, 116, 9, C_DIM, 2); } } else { tx(27, `자기장 표시까지 ${mmss(zWait)}`, 236, 116, 9, C_DIM, 2); }
  // weapons
  wline(11, 1, EG1[1], -95);
  wline(12, 2, EG2[1], -106);
  wline(13, 3, EG3[1], -117);
  if (g > 0) {
    let fm = fireMode[ECUR[1]];
    let fms = '자동';
    if (fm == 1) { fms = '단발'; }
    if (fm == 2) { fms = '점사'; }
    if (GBOLT[g] > 0) { fms = '볼트'; }
    if (GCLS[g] == 6) { fms = '펌프'; }
    tx(14, `${magNow(1)} / ${ammoOf(1, GAMMO[g])}  ${fms}`, 236, -78, 13, C_W, 2);
    tx(29, attText(attNow(1)), 236, -64, 8, C_DIM, 2);
  } else { tx(14, '맨손', 236, -78, 12, C_DIM, 2); txOff(29); }
  // armour and pack, meds and throwables
  tx(15, `헬멧 ${EHEL[1]}  조끼 ${EVES[1]}  가방 ${EPACK[1]}`, -236, -100, 9, C_W, 1);
  tx(16, `붕대 ${EBAND[1]}  구급 ${EKIT[1]}  키트 ${EMED[1]}  음료 ${EDRK[1]}  진통 ${EPILL[1]}`, -236, -111, 8, C_DIM, 1);
  tx(17, `수류탄 ${EFRAG[1]} [G]  연막 ${ESMK[1]} [T]  치료 [H]  부스트 [J]  가방 [Tab]`, -236, -122, 8, C_DIM, 1);
  // the kill feed
  i = 1;
  while (i <= 5) { if (gameT - KFT[i] < 7) { tx(4 + i, KFS[i], -236, 128 - i * 11, 8, C_W, 1); } else { txOff(4 + i); } i = i + 1; }
  // messages and the pickup prompt
  if (msgT > 0) { tx(3, msgS, 0, 60, 12, C_GOLD, 0); } else { txOff(3); }
  // v1.1: the vehicle: getting in, and driving (speed, its health)
  let vp = 0;
  if (plVeh == 0) { if (vNear > 0) { if (pickItem == 0 || vNearD < pickD * 0.5) { vp = 1; } } }
  if (plVeh > 0) {
    let v = plVeh;
    tx(30, `${Math.round(Math.abs(VSPD[v]) * 0.036)} km/h`, 0, -84, 14, C_W, 0);
    tx(31, `${VKN[VK[v]]}   [F] 내리기   Space 브레이크   V 시점`, 0, -100, 8, C_DIM, 0);
    hudBox(-50, -109, 50, -106, '#202428');
    let vh = Math.max(0, VHP[v] / VKHP[VK[v]]);
    let vc = '#9fd8ff';
    if (vh < 0.4) { vc = '#ff9a40'; }
    hudBox(-50, -109, -50 + 100 * vh, -106, vc);
  } else { txOff(30); txOff(31); }
  if (vp == 1) { tx(4, `[F] 탑승  ${VKN[VK[vNear]]}`, 30, -18, 10, C_SKY, 1); }
  else { if (pickItem > 0) {
    let it = WIT[pickItem];
    let nm = ITN[it];
    if (WN[pickItem] > 1) { nm = `${nm} x${WN[pickItem]}`; }
    tx(4, `[F] ${nm}`, 30, -18, 10, C_W, 1);
  } else { if (pickMsgT > 0) { tx(4, `+ ${pickMsg}`, 30, -18, 10, '#9fe09f', 1); } else { txOff(4); } } }
  minimap();
}
// the crosshair (wider with the spread; a dot when aiming without a sight) and the hit marker
function hudCross(g) {
  if (wAdsT < 0.5) {
    if (EAIR[1] == 0) { if (plVeh == 0) {
      let sp = pHip;
      if (g == 0) { sp = 1; }
      if (plMoving == 1) { sp = sp + 1.2; }
      if (plGround == 0) { sp = sp + 4; }
      let r = 3 + sp * FOC / 57;
      hudLine(0 - r - 6, 0, 0 - r, 0, 1, C_W); hudLine(r, 0, r + 6, 0, 1, C_W);
      hudLine(0, 0 - r - 6, 0, 0 - r, 1, C_W); hudLine(0, r, 0, r + 6, 1, C_W);
    } }
  } else { if (g > 0) { if (pSight == 0) { dotAt(0, 0, 0.8, '#ffffff'); } } }
  // hit marker
  if (hitMk > 0) { hudLine(-9, -9, -4, -4, 1.5, hitMkC); hudLine(9, 9, 4, 4, 1.5, hitMkC); hudLine(-9, 9, -4, 4, 1.5, hitMkC); hudLine(9, -9, 4, -4, 1.5, hitMkC); }
}
function healTime(k) {
  let t = 4;
  if (k == 2) { t = 6; }
  if (k == 3) { t = 8; }
  if (k == 5) { t = 6; }
  return t;
}
let CPN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function wline(slot, s, g, y) {
  if (g > 0) {
    let col = C_DIM;
    if (ECUR[1] == s) { col = C_W; }
    tx(slot, `${s}  ${GNAME[g]}`, 236, y, 9, col, 2);
  } else { txOff(slot); }
}
function attText(a) {
  let s = '', k = 1;
  while (k <= 5) { let ai = attIn(a, k); if (ai > 0) { if (s != '') { s = s + ' · '; } s = s + ANAME[ai]; } k = k + 1; }
  return s;
}
// a red arc toward screen angle a (0: ahead), radius r
function arcAt(a, r, col) {
  let a1 = a - 18, a2 = a + 18;
  fillStop(); goto(sind(a1) * r, cosd(a1) * r); fillColorHex(col); fillStart();
  goto(sind(a) * (r + 3), cosd(a) * (r + 3)); goto(sind(a2) * r, cosd(a2) * r); goto(sind(a2) * (r - 5), cosd(a2) * (r - 5)); goto(sind(a) * (r - 4), cosd(a) * (r - 4)); goto(sind(a1) * (r - 5), cosd(a1) * (r - 5));
}
function markAt(a, r, col, age) {
  let s = 3.5 - age;
  fillStop(); goto(sind(a) * (r + s * 2), cosd(a) * (r + s * 2)); fillColorHex(col); fillStart();
  goto(sind(a + 4) * r, cosd(a + 4) * r); goto(sind(a - 4) * r, cosd(a - 4) * r);
}
// the minimap: 600 m round the player, north up
function minimap() {
  let x0 = 168, y0 = 32, w = 68;
  let cx = x0 + w / 2, cy = y0 + w / 2;
  let k = w / 60000;
  hudBox(x0, y0, x0 + w, y0 + w, '#22303a');
  // land: the coarse cells near
  let gx = Math.floor(plX / 12800), gz = Math.floor(plZ / 12800);
  let iz = gz - 3;
  while (iz <= gz + 3) {
    let ix = gx - 3;
    while (ix <= gx + 3) {
      if (ix >= 0 && ix < 16 && iz >= 0 && iz < 16) {
        let fk = FK[iz * 16 + ix + 1];
        if (fk > 0) {
          let ax = cx + (ix * 12800 - plX) * k, ay = cy + (iz * 12800 - plZ) * k;
          let bx = ax + 12800 * k, by = ay + 12800 * k;
          ax = Math.max(x0, ax); ay = Math.max(y0, ay); bx = Math.min(x0 + w, bx); by = Math.min(y0 + w, by);
          if (ax < bx) { if (ay < by) { hudBox(ax, ay, bx, by, CT[fk + 2]); } }
        }
      }
      ix = ix + 1;
    }
    iz = iz + 1;
  }
  // the zone circles
  if (zPhase > 0) { circleMap(zcx, zcz, zr, cx, cy, k, x0, y0, w, '#4a8aff'); circleMap(znx, znz, znr, cx, cy, k, x0, y0, w, '#ffffff'); }
  // vehicles near (grey: standing, blue: mine)
  let v = 1;
  while (v <= NV) {
    if (VON[v] == 1) {
      let vx = cx + (VX[v] - plX) * k, vy = cy + (VZ[v] - plZ) * k;
      if (vx > x0 + 2) { if (vx < x0 + w - 2) { if (vy > y0 + 2) { if (vy < y0 + w - 2) {
        let col = '#c8ccd0';
        if (v == plVeh) { col = C_SKY; }
        hudBox(vx - 1.5, vy - 1.5, vx + 1.5, vy + 1.5, col);
      } } } }
    }
    v = v + 1;
  }
  // the plane's line
  if (planeOn == 1) { if (EAIR[1] == 2) { hudLine(cx, cy, cx + (planeX1 - plX) * k, cy + (planeZ1 - plZ) * k, 1, '#ffd24a'); } }
  // me: an arrow
  let a = plYaw;
  fillStop(); goto(cx + sind(a) * 5, cy + cosd(a) * 5); fillColorHex('#ffd24a'); fillStart(); goto(cx + sind(a + 140) * 4, cy + cosd(a + 140) * 4); goto(cx, cy); goto(cx + sind(a - 140) * 4, cy + cosd(a - 140) * 4);
  fillStop();
}
function circleMap(zx, zz, r, cx, cy, k, x0, y0, w, col) {
  let ci = 0, px = 0, py = 0, was = 0;
  penSize(1); penColorHex(col); fillStop();
  while (ci <= 32) {
    let x = cx + (zx + sind(ci * 11.25) * r - plX) * k, y = cy + (zz + cosd(ci * 11.25) * r - plZ) * k;
    let ins = 0;
    if (x > x0) { if (x < x0 + w) { if (y > y0) { if (y < y0 + w) { ins = 1; } } } }
    if (ins == 1) { if (was == 1) { goto(px, py); penDown(); goto(x, y); penUp(); } }
    px = x; py = y; was = ins;
    ci = ci + 1;
  }
}

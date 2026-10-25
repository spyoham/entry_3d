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
  // crosshair: wider with the spread (hidden when aiming through a sight)
  if (wAdsT < 0.5) {
    if (EAIR[1] == 0) {
      let sp = pHip;
      if (g == 0) { sp = 1; }
      if (plMoving == 1) { sp = sp + 1.2; }
      if (plGround == 0) { sp = sp + 4; }
      let r = 3 + sp * FOC / 57;
      hudLine(0 - r - 6, 0, 0 - r, 0, 1, C_W); hudLine(r, 0, r + 6, 0, 1, C_W);
      hudLine(0, 0 - r - 6, 0, 0 - r, 1, C_W); hudLine(0, r, 0, r + 6, 1, C_W);
    }
  } else { if (g > 0) { if (pSight == 0) { M_dot(0, 0, 0.8, '#ffffff'); } } }
  // hit marker
  if (hitMk > 0) { hudLine(-9, -9, -4, -4, 1.5, hitMkC); hudLine(9, 9, 4, 4, 1.5, hitMkC); hudLine(-9, 9, -4, 4, 1.5, hitMkC); hudLine(9, -9, 4, -4, 1.5, hitMkC); }
  // where the hurt came from: a red arc
  if (hurtT > 0) { if (hurtDir > 0) {
    let a = atan2d(EX[hurtDir] - plX, EZ[hurtDir] - plZ) - plYaw;
    M_arc(a, 46, '#d83020');
  } }
  // sounds heard: marks round the middle
  let i = 1;
  while (i <= 12) {
    let age = gameT - SMT[i];
    if (age < 2.2) {
      let col = '#ffa040';
      if (SMK[i] == 3) { col = '#e8e8e8'; }
      if (SMK[i] == 2) { col = '#ffe060'; }
      M_mark(SMA[i] - plYaw, 62, col, age);
    }
    i = i + 1;
  }
  // health and boost
  M_box(-72, -121, 72, -115, '#202428');
  let hp = Math.max(0, EHP[1]);
  let hc = '#e8e8e8';
  if (hp < 50) { hc = '#e89090'; }
  if (hp < 25) { hc = '#e84a3a'; }
  M_box(-71, -120, -71 + 142 * hp / 100, -116, hc);
  if (EBOOST[1] > 0) { M_box(-71, -113, -71 + 142 * EBOOST[1] / 100, -111.5, '#f0c040'); }
  if (EUSE[1] > 0) { M_box(-40, -100, 40, -97, '#303438'); M_box(-40, -100, -40 + 80 * (1 - EUSE[1] / healTime(EUSEK[1])), -97, '#7fd07f'); }
  if (ERELT[1] > 0) { if (g > 0) { M_box(-40, -94, -40 + 80 * Math.max(0, 1 - ERELT[1] / GREL[g]), -92, '#c8c8c8'); } }
  // the compass
  M_box(-90, 118, 90, 119, '#c8d0d8');
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
  M_wline(11, 1, EG1[1], -95);
  M_wline(12, 2, EG2[1], -106);
  M_wline(13, 3, EG3[1], -117);
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
  tx(17, `수류탄 ${EFRAG[1]} [G]  연막 ${ESMK[1]} [T]  치료 [H]  부스트 [J]`, -236, -122, 8, C_DIM, 1);
  // the kill feed
  i = 1;
  while (i <= 5) { if (gameT - KFT[i] < 7) { tx(4 + i, KFS[i], -236, 128 - i * 11, 8, C_W, 1); } else { txOff(4 + i); } i = i + 1; }
  // messages and the pickup prompt
  if (msgT > 0) { tx(3, msgS, 0, 60, 12, C_GOLD, 0); } else { txOff(3); }
  if (pickItem > 0) {
    let it = WIT[pickItem];
    let nm = ITN[it];
    if (WN[pickItem] > 1) { nm = `${nm} x${WN[pickItem]}`; }
    tx(4, `[F] ${nm}`, 30, -18, 10, C_W, 1);
  } else { if (pickMsgT > 0) { tx(4, `+ ${pickMsg}`, 30, -18, 10, '#9fe09f', 1); } else { txOff(4); } }
  minimap();
}
function healTime(k) {
  let t = 4;
  if (k == 2) { t = 6; }
  if (k == 3) { t = 8; }
  if (k == 5) { t = 6; }
  return t;
}
let CPN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function M_wline(slot, s, g, y) {
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
function M_arc(a, r, col) {
  let a1 = a - 18, a2 = a + 18;
  fillStop(); goto(sind(a1) * r, cosd(a1) * r); fillColorHex(col); fillStart();
  goto(sind(a) * (r + 3), cosd(a) * (r + 3)); goto(sind(a2) * r, cosd(a2) * r); goto(sind(a2) * (r - 5), cosd(a2) * (r - 5)); goto(sind(a) * (r - 4), cosd(a) * (r - 4)); goto(sind(a1) * (r - 5), cosd(a1) * (r - 5));
}
function M_mark(a, r, col, age) {
  let s = 3.5 - age;
  fillStop(); goto(sind(a) * (r + s * 2), cosd(a) * (r + s * 2)); fillColorHex(col); fillStart();
  goto(sind(a + 4) * r, cosd(a + 4) * r); goto(sind(a - 4) * r, cosd(a - 4) * r);
}
// the minimap: 600 m round the player, north up
function minimap() {
  let x0 = 168, y0 = 32, w = 68;
  let cx = x0 + w / 2, cy = y0 + w / 2;
  let k = w / 60000;
  M_box(x0, y0, x0 + w, y0 + w, '#22303a');
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
          if (ax < bx) { if (ay < by) { M_box(ax, ay, bx, by, CT[fk + 2]); } }
        }
      }
      ix = ix + 1;
    }
    iz = iz + 1;
  }
  // the zone circles
  if (zPhase > 0) { M_circleMap(zcx, zcz, zr, cx, cy, k, x0, y0, w, '#4a8aff'); M_circleMap(znx, znz, znr, cx, cy, k, x0, y0, w, '#ffffff'); }
  // the plane's line
  if (planeOn == 1) { if (EAIR[1] == 2) { hudLine(cx, cy, cx + (planeX1 - plX) * k, cy + (planeZ1 - plZ) * k, 1, '#ffd24a'); } }
  // me: an arrow
  let a = plYaw;
  fillStop(); goto(cx + sind(a) * 5, cy + cosd(a) * 5); fillColorHex('#ffd24a'); fillStart(); goto(cx + sind(a + 140) * 4, cy + cosd(a + 140) * 4); goto(cx, cy); goto(cx + sind(a - 140) * 4, cy + cosd(a - 140) * 4);
  fillStop();
}
function M_circleMap(zx, zz, r, cx, cy, k, x0, y0, w, col) {
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
// the big map (M): the whole island
function bigMap() {
  let x0 = -125, y0 = -125, w = 250, k = w / MAP;
  M_box(x0 - 3, y0 - 3, x0 + w + 3, y0 + w + 3, '#101418');
  M_box(x0, y0, x0 + w, y0 + w, seaCol);
  let i = 1;
  while (i <= 256) {
    let fk = FK[i];
    if (fk > 0) { let ix = mod(i - 1, 16), iz = idiv(i - 1, 16); M_box(x0 + ix * 16 * CS * k, y0 + iz * 16 * CS * k, x0 + (ix + 1) * 16 * CS * k, y0 + (iz + 1) * 16 * CS * k, CT[fk + 1]); }
    i = i + 1;
  }
  if (zPhase > 0) { M_circleBig(zcx, zcz, zr, x0, y0, k, '#4a8aff'); M_circleBig(znx, znz, znr, x0, y0, k, '#ffffff'); }
  if (planeOn == 1) { hudLine(x0 + planeX0 * k, y0 + planeZ0 * k, x0 + planeX1 * k, y0 + planeZ1 * k, 1, '#ffd24a'); }
  let px = x0 + plX * k, py = y0 + plZ * k;
  M_box(px - 2.5, py - 2.5, px + 2.5, py + 2.5, '#ffd24a');
  i = 1;
  while (i <= SITEX.length) { tx(30 + i, SITEN[i], x0 + SITEX[i] * k, y0 + SITEZ[i] * k + 4, 7, '#ffffff', 0); i = i + 1; }
}
function bigMapOff() { let i = 1; while (i <= SITEX.length) { txOff(30 + i); i = i + 1; } }
function M_circleBig(zx, zz, r, x0, y0, k, col) {
  let ci = 0;
  penSize(1); penColorHex(col); fillStop();
  goto(x0 + (zx + r) * k, y0 + zz * k); penDown();
  while (ci <= 40) { goto(x0 + (zx + cosd(ci * 9) * r) * k, y0 + (zz + sind(ci * 9) * r) * k); ci = ci + 1; }
  penUp();
}

// ---------------------------------------------------------------- menu and results
let menuSel = 0;
function menuHud() {
  M_box(-150, 70, 150, 112, '#141a20');
  tx(1, '엔트리 배틀로얄 3D', 0, 102, 20, C_W, 0);
  tx(2, '새벽섬 · 플레이어 1명 + AI 29명 · 마지막 1인이 이긴다', 0, 82, 9, C_DIM, 0);
  let dn = '보통';
  if (diff == 1) { dn = '쉬움'; }
  if (diff == 3) { dn = '어려움'; }
  let gn = 'AUTO';
  if (gfxAuto == 0) { if (gfx == 0) { gn = 'LOW'; } if (gfx == 1) { gn = 'HIGH'; } if (gfx == 2) { gn = 'ULTRA'; } }
  M_box(-150, -70, 150, 60, '#10151a');
  tx(5, `[1/2/3] AI 난이도: ${dn}`, -130, 44, 10, C_W, 1);
  tx(6, `[G] 그래픽: ${gn}`, -130, 30, 10, C_W, 1);
  tx(7, `[-/+] 마우스 감도: ${Math.round(sens * 100)}`, -130, 16, 10, C_W, 1);
  tx(8, '조작  WASD 이동 · 마우스 시점 · 클릭 사격 · E 조준 · Shift 달리기 · C 앉기', -130, -2, 8, C_DIM, 1);
  tx(9, 'Space 점프 · R 장전 · F 줍기/낙하산 · 1 2 3 무기 · B 사격 모드 · X 버리기', -130, -14, 8, C_DIM, 1);
  tx(11, 'H 치료 · J 부스트 · G 수류탄 · T 연막탄 · M 지도 · Esc 마우스 풀기', -130, -26, 8, C_DIM, 1);
  tx(12, '실총 15종 · 부착물 15종 · 자기장 7단계 · 비행기에서 뛰어내려 시작', -130, -42, 8, C_DIM, 1);
  tx(13, '[Enter] 또는 클릭: 시작', 0, -60, 12, C_GOLD, 0);
  if (isTess == 0) { tx(14, 'tessvm 확장에서 실행하세요 (순정 엔트리는 너무 느립니다)', 0, -86, 10, '#ffcc66', 0); }
}
function resultHud() {
  let win = 0;
  if (gState == 4) { win = 1; }
  M_box(-160, -60, 160, 70, '#0e1216');
  if (win == 1) { tx(1, '최후의 1인!', 0, 52, 22, C_GOLD, 0); } else { tx(1, `#${ERANK[1]} / ${NE}`, 0, 52, 22, C_W, 0); }
  if (win == 0) { tx(2, `${killerName}에게 쓰러졌습니다`, 0, 28, 10, C_DIM, 0); } else { tx(2, '새벽섬에서 살아남았습니다', 0, 28, 10, C_DIM, 0); }
  tx(5, `처치 ${EKILLS[1]}    피해량 ${Math.round(EDMG[1])}    생존 ${mmss(endT)}`, 0, 6, 11, C_W, 0);
  let g = EG1[1];
  if (g == 0) { g = EG2[1]; }
  txOff(6);
  tx(7, '[R] 다시 하기    [Enter] 메뉴', 0, -40, 11, C_GOLD, 0);
}

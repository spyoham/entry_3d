// ===================================================================== maps, menu, results
// The island as flat shapes (from the build: terrain rectangles MR*, road pieces ML*, buildings MB*),
// in map units 0..128 over the map (1 unit = 16 m), drawn into a square window with zoom.
let mpS = 1, mpCX = 0, mpCY = 0, mpFX = 64, mpFZ = 64, mpX0 = 0, mpX1 = 0, mpY0 = 0, mpY1 = 0;
let mapZoom = 1, wheelAcc = 0, $SCROLL_Y = 0;
const MPU = 1600;
let GRIDL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// world cm -> screen
function mpx(x) { return mpCX + (x / MPU - mpFX) * mpS; }
function mpy(z) { return mpCY + (z / MPU - mpFZ) * mpS; }
// a rectangle in map units, cut to the window
function mrect(a, b, c, d, col) {
  let rx0 = mpCX + (a - mpFX) * mpS, rx1 = mpCX + (c - mpFX) * mpS, ry0 = mpCY + (b - mpFZ) * mpS, ry1 = mpCY + (d - mpFZ) * mpS;
  if (rx1 > mpX0) { if (rx0 < mpX1) { if (ry1 > mpY0) { if (ry0 < mpY1) {
    if (rx0 < mpX0) { rx0 = mpX0; }
    if (rx1 > mpX1) { rx1 = mpX1; }
    if (ry0 < mpY0) { ry0 = mpY0; }
    if (ry1 > mpY1) { ry1 = mpY1; }
    hudBox(rx0, ry0, rx1, ry1, col);
  } } } }
}
// a line in screen units, cut to the window (Liang-Barsky)
function mapLine(ax, ay, bx, by, w, col) {
  let t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, ok = 1;
  // four edges: p * t <= q
  let k = 1;
  while (k <= 4) {
    let p = 0 - dx, q = ax - mpX0;
    if (k == 2) { p = dx; q = mpX1 - ax; }
    if (k == 3) { p = 0 - dy; q = ay - mpY0; }
    if (k == 4) { p = dy; q = mpY1 - ay; }
    if (p == 0) { if (q < 0) { ok = 0; } }
    else {
      let r = q / p;
      if (p < 0) { if (r > t1) { ok = 0; } else { if (r > t0) { t0 = r; } } }
      else { if (r < t0) { ok = 0; } else { if (r < t1) { t1 = r; } } }
    }
    k = k + 1;
  }
  if (ok == 1) {
    fillStop(); penSize(w); penColorHex(col);
    goto(ax + dx * t0, ay + dy * t0); penDown(); goto(ax + dx * t1, ay + dy * t1); penUp();
  }
}
// a circle of the world (centre x, z cm, radius r cm)
function mapCircle(x, z, r, w, col) {
  let i = 0, px = mpx(x + r), py = mpy(z);
  while (i < 48) {
    i = i + 1;
    let nx = mpx(x + cosd(i * 7.5) * r), ny = mpy(z + sind(i * 7.5) * r);
    mapLine(px, py, nx, ny, w, col);
    px = nx; py = ny;
  }
}
// the island in a square window of side size round (cx, cy), zoom z, looking at map units (fx, fz)
function drawIsland(cx, cy, size, z, fx, fz, detail) {
  mpCX = cx; mpCY = cy; mpS = size * z / 128;
  mpFX = fx; mpFZ = fz;
  mpX0 = cx - size / 2; mpX1 = cx + size / 2; mpY0 = cy - size / 2; mpY1 = cy + size / 2;
  hudBox(mpX0, mpY0, mpX1, mpY1, '#36586b');
  // the shallows: a lighter rim round the land
  let i = 1, n = MRX0.length;
  while (i <= n) { mrect(MRX0[i], MRZ0[i], MRX1[i], MRZ1[i], MRC[i]); i = i + 1; }
  // roads
  i = 1; n = MLX0.length;
  let rw = 1 + z * 0.35;
  while (i <= n) {
    let col = '#3c3d40';
    let w = rw;
    if (MLW[i] == 1) { col = '#55565a'; w = rw * 0.8; }
    mapLine(mpCX + (MLX0[i] - mpFX) * mpS, mpCY + (MLZ0[i] - mpFZ) * mpS, mpCX + (MLX1[i] - mpFX) * mpS, mpCY + (MLZ1[i] - mpFZ) * mpS, w, col);
    i = i + 1;
  }
  // buildings
  if (detail >= 1) { i = 1; n = MBX0.length; while (i <= n) { mrect(MBX0[i], MBZ0[i], MBX1[i], MBZ1[i], MBC[i]); i = i + 1; } }
  // the grid: every 256 m, A..H west to east, 1..8 north to south
  if (detail >= 2) {
    i = 1;
    while (i < 8) {
      let gx = mpCX + (i * 16 - mpFX) * mpS, gy = mpCY + (i * 16 - mpFZ) * mpS;
      mapLine(gx, mpY0, gx, mpY1, 0.6, '#2a3a44');
      mapLine(mpX0, gy, mpX1, gy, 0.6, '#2a3a44');
      i = i + 1;
    }
  }
  // the edge
  hudLine(mpX0, mpY0, mpX1, mpY0, 1, '#8a98a4'); hudLine(mpX1, mpY0, mpX1, mpY1, 1, '#8a98a4'); hudLine(mpX1, mpY1, mpX0, mpY1, 1, '#8a98a4'); hudLine(mpX0, mpY1, mpX0, mpY0, 1, '#8a98a4');
}
// the towns' names, from slot s0 (those outside the window are switched off)
function islandNames(s0, sz) {
  let i = 1;
  while (i <= SITEX.length) {
    let x = mpx(SITEX[i]), y = mpy(SITEZ[i]);
    let ins = 0;
    if (x > mpX0 + 10) { if (x < mpX1 - 10) { if (y > mpY0 + 6) { if (y < mpY1 - 6) { ins = 1; } } } }
    if (ins == 1) { tx(s0 + i - 1, SITEN[i], x, y + sz * 0.5 + 2, sz, '#ffffff', 0); hudBox(x - 1.2, y - 1.2, x + 1.2, y + 1.2, '#ffffff'); } else { txOff(s0 + i - 1); }
    i = i + 1;
  }
}
// an arrow at (x, y) pointing to yaw, size r
function arrowAt(x, y, yaw, r, col) {
  fillStop(); goto(x + sind(yaw) * r, y + cosd(yaw) * r); fillColorHex(col); fillStart();
  goto(x + sind(yaw + 140) * r * 0.8, y + cosd(yaw + 140) * r * 0.8); goto(x, y); goto(x + sind(yaw - 140) * r * 0.8, y + cosd(yaw - 140) * r * 0.8);
  fillStop();
}

// ---------------------------------------------------------------- the big map (M)
function bigMapZoom() {
  if (keyHit(187) == 1 || keyHit(107) == 1) { wheelAcc = wheelAcc + 1; }
  if (keyHit(189) == 1 || keyHit(109) == 1) { wheelAcc = wheelAcc - 1; }
  if (wheelAcc >= 1) { if (mapZoom < 4) { mapZoom = mapZoom * 2; } }
  if (wheelAcc <= -1) { if (mapZoom > 1) { mapZoom = mapZoom / 2; } }
  wheelAcc = 0;
}
function bigMap() {
  bigMapZoom();
  hudBox(-245, -140, 245, 140, '#0c1216');
  let size = 250, cx = -38, cy = -6;
  // where it looks: the whole island, or round the player when zoomed in
  let fx = 64, fz = 64;
  if (mapZoom > 1) {
    let h = 64 / mapZoom;
    fx = Math.max(h, Math.min(128 - h, plX / MPU)); fz = Math.max(h, Math.min(128 - h, plZ / MPU));
  }
  drawIsland(cx, cy, size, mapZoom, fx, fz, 2);
  // the zone, the safe zone and the way to it, the plane
  if (zPhase > 0) {
    mapCircle(zcx, zcz, zr, 1.6, '#3f7dff');
    mapCircle(znx, znz, znr, 1.2, '#ffffff');
    let dx = plX - znx, dz = plZ - znz;
    if (dx * dx + dz * dz > znr * znr) { mapLine(mpx(plX), mpy(plZ), mpx(znx), mpy(znz), 0.8, '#e8e8e8'); }
  }
  if (planeOn == 1) {
    mapLine(mpx(planeX0), mpy(planeZ0), mpx(planeX1), mpy(planeZ1), 1, '#ffd24a');
    let ax = mpx(planeX), ay = mpy(planeZ);
    if (ax > mpX0) { if (ax < mpX1) { if (ay > mpY0) { if (ay < mpY1) { arrowAt(ax, ay, atan2d(planeX1 - planeX0, planeZ1 - planeZ0), 5, '#ffe080'); } } } }
  }
  // me
  let px = mpx(plX), py = mpy(plZ);
  if (px > mpX0) { if (px < mpX1) { if (py > mpY0) { if (py < mpY1) { hudBox(px - 4, py - 4, px + 4, py + 4, '#202020'); arrowAt(px, py, plYaw, 6, '#ffd24a'); } } } }
  // grid letters and numbers
  let i = 1;
  while (i <= 8) {
    let gx = mpx((i - 0.5) * 16 * MPU), gy = mpy((i - 0.5) * 16 * MPU);
    if (gx > mpX0) { if (gx < mpX1) { tx(2 + i, GRIDL[i], gx, 131, 8, C_DIM, 0); } else { txOff(2 + i); } } else { txOff(2 + i); }
    if (gy > mpY0) { if (gy < mpY1) { tx(10 + i, `${9 - i}`, cx - size / 2 - 6, gy + 4, 8, C_DIM, 0); } else { txOff(10 + i); } } else { txOff(10 + i); }
    i = i + 1;
  }
  islandNames(19, 7 + mapZoom);
  // the side panel: title, scale, legend, the match
  let x0 = 100;
  hudBox(x0 - 4, -129, 238, 129, '#141c22');
  tx(32, '새벽섬', x0, 124, 14, C_W, 1);
  tx(33, `2 km × 2 km   확대 ${mapZoom}배`, x0, 106, 8, C_DIM, 1);
  // a scale bar: the longest of 100 / 200 / 500 m that fits in 90 px
  let m = 500;
  if (50000 / MPU * mpS > 100) { m = 200; }
  if (20000 / MPU * mpS > 100) { m = 100; }
  if (10000 / MPU * mpS > 100) { m = 50; }
  let bl = m * 100 / MPU * mpS;
  hudBox(x0, 92, x0 + bl, 94, '#ffffff'); hudBox(x0, 89, x0 + 1.5, 97, '#ffffff'); hudBox(x0 + bl - 1.5, 89, x0 + bl, 97, '#ffffff');
  tx(34, `${m} m`, x0 + bl + 6, 98, 8, C_W, 1);
  // legend
  arrowAt(x0 + 5, 72, 0, 5, '#ffd24a'); tx(35, '나', x0 + 16, 76, 8, C_W, 1);
  hudBox(x0, 58, x0 + 12, 60, '#3f7dff'); tx(36, '자기장', x0 + 16, 64, 8, C_W, 1);
  hudBox(x0, 46, x0 + 12, 48, '#ffffff'); tx(37, '다음 안전지대', x0 + 16, 52, 8, C_W, 1);
  hudBox(x0, 34, x0 + 12, 36, '#ffd24a'); tx(38, '비행기 경로', x0 + 16, 40, 8, C_W, 1);
  hudBox(x0, 22, x0 + 12, 25, '#3c3d40'); tx(39, '도로', x0 + 16, 28, 8, C_W, 1);
  hudBox(x0 + 2, 9, x0 + 9, 15, '#5a5650'); tx(40, '건물', x0 + 16, 16, 8, C_W, 1);
  hudBox(x0 + 2, -3, x0 + 9, 3, '#56604a'); tx(41, '군사 시설', x0 + 16, 4, 8, C_W, 1);
  // the match
  tx(42, `생존 ${alive}명   처치 ${EKILLS[1]}`, x0, -16, 9, C_W, 1);
  let zs = '';
  if (zPhase == 0) { zs = `자기장 표시까지 ${mmss(zWait)}`; } else { if (zShr > 0) { zs = `${zPhase}단계 축소 중 ${mmss(zShr)}`; } else { zs = `${zPhase}단계 · 축소까지 ${mmss(zWait)}`; } }
  tx(43, zs, x0, -30, 8, '#7fb0ff', 1);
  let ds = '안전지대 안';
  if (zPhase > 0) { let dx = plX - znx, dz = plZ - znz; let dd = Math.sqrt(dx * dx + dz * dz) - znr; if (dd > 0) { ds = `안전지대까지 ${Math.round(dd / 100)} m`; } }
  tx(44, ds, x0, -43, 8, C_W, 1);
  tx(45, `경과 ${mmss(gameT)}`, x0, -56, 8, C_DIM, 1);
  let gx2 = Math.floor(plX / (16 * MPU)), gz2 = Math.floor(plZ / (16 * MPU));
  tx(46, `내 위치 ${GRIDL[Math.max(1, Math.min(8, gx2 + 1))]}${Math.max(1, Math.min(8, 8 - gz2))}`, x0, -69, 8, C_DIM, 1);
  tx(47, '휠 또는 + - : 확대·축소 (4배까지)', x0, -100, 7, C_DIM, 1);
  tx(48, 'M : 지도 닫기', x0, -112, 7, C_DIM, 1);
}
function bigMapOff() { txClear(); }

// ---------------------------------------------------------------- the menu
function b01(c) { let r = 0; if (c) { r = 1; } return r; }
on('msg:$SCROLL', 'pen', function () { wheelAcc = wheelAcc + $SCROLL_Y; });
let showG = 1, showT = 0, showYaw = 0;
// a button: draws itself, 1 when clicked this frame
function btn(x0, y0, x1, y1, slot, label, sel, sz) {
  let mx = mouseX(), my = mouseY();
  let hov = 0;
  if (mx > x0) { if (mx < x1) { if (my > y0) { if (my < y1) { hov = 1; } } } }
  let col = '#25313a';
  if (hov == 1) { col = '#33434f'; }
  if (sel == 1) { col = '#c89a2a'; if (hov == 1) { col = '#e0b03a'; } }
  hudBox(x0, y0, x1, y1, col);
  if (sel == 0) { hudLine(x0, y0, x1, y0, 0.6, '#3e4e5a'); }
  let tc = C_W;
  if (sel == 1) { tc = '#15110a'; }
  tx(slot, label, (x0 + x1) / 2, (y0 + y1) / 2 + sz * 0.3, sz, tc, 0);
  let r = 0;
  if (hov == 1) { if (clickLatch == 1) { r = 1; } }
  return r;
}
function menuFrame(dt) {
  if (keyHit(49) == 1) { diff = 1; }
  if (keyHit(50) == 1) { diff = 2; }
  if (keyHit(51) == 1) { diff = 3; }
  if (keyHit(71) == 1) { if (gfxAuto == 1) { gfxAuto = 0; gfx = 0; } else { if (gfx < 2) { gfx = gfx + 1; } else { gfxAuto = 1; gfx = 1; } } applyGfx(); }
  if (keyHit(187) == 1 || keyHit(107) == 1) { sens = Math.min(2, sens + 0.05); }
  if (keyHit(189) == 1 || keyHit(109) == 1) { sens = Math.max(0.1, sens - 0.05); }
  if (keyHit(13) == 1) { menuGo = 1; }
  if (keyHit(84) == 1) { menuGo = 2; }
  showT = showT + dt; showYaw = showYaw + dt * 50;
  if (showT > 4) { showT = 0; showG = mod(showG, NGUN) + 1; }
}
let menuGo = 0;
function menuScreen() {
  // background
  hudBox(-245, -140, 245, 140, '#0e151b');
  hudBox(-245, 104, 245, 140, '#131d25');
  hudBox(-245, 103, 245, 104, '#c89a2a');
  tx(1, '엔트리 배틀로얄 3D', -226, 125, 19, C_W, 1);
  tx(2, `새벽섬 · 플레이어 1명 + AI ${NE - 1}명 · 마지막 1인이 이긴다`, 226, 118, 8, '#c8b48a', 2);
  // the left column
  if (btn(-226, 66, -118, 92, 3, '게임 시작', 1, 14) == 1) { menuGo = 1; }
  if (btn(-115, 66, -40, 92, 24, '총기 테스트', 0, 10) == 1) { menuGo = 2; }
  tx(4, 'AI 난이도', -226, 59, 8, C_DIM, 1);
  if (btn(-226, 34, -166, 50, 5, '쉬움', b01(diff == 1), 9) == 1) { diff = 1; }
  if (btn(-163, 34, -103, 50, 6, '보통', b01(diff == 2), 9) == 1) { diff = 2; }
  if (btn(-100, 34, -40, 50, 7, '어려움', b01(diff == 3), 9) == 1) { diff = 3; }
  tx(8, '그래픽', -226, 26, 8, C_DIM, 1);
  let ga = 0, g0 = 0, g1 = 0, g2 = 0;
  if (gfxAuto == 1) { ga = 1; } else { if (gfx == 0) { g0 = 1; } if (gfx == 1) { g1 = 1; } if (gfx == 2) { g2 = 1; } }
  if (btn(-226, 1, -182, 17, 9, 'AUTO', ga, 8) == 1) { gfxAuto = 1; gfx = 1; applyGfx(); }
  if (btn(-179, 1, -135, 17, 10, 'LOW', g0, 8) == 1) { gfxAuto = 0; gfx = 0; applyGfx(); }
  if (btn(-132, 1, -88, 17, 11, 'HIGH', g1, 8) == 1) { gfxAuto = 0; gfx = 1; applyGfx(); }
  if (btn(-85, 1, -40, 17, 12, 'ULTRA', g2, 8) == 1) { gfxAuto = 0; gfx = 2; applyGfx(); }
  tx(13, '마우스 감도', -226, -7, 8, C_DIM, 1);
  if (btn(-226, -32, -200, -16, 15, '-', 0, 11) == 1) { sens = Math.max(0.1, sens - 0.05); }
  if (btn(-114, -32, -88, -16, 16, '+', 0, 11) == 1) { sens = Math.min(2, sens + 0.05); }
  hudBox(-196, -32, -118, -16, '#1a242c');
  hudBox(-194, -26, -194 + 74 * (sens - 0.1) / 1.9, -22, '#c89a2a');
  tx(14, `${Math.round(sens * 100)}`, -64, -18, 10, C_W, 0);
  // controls
  hudBox(-232, -133, -34, -40, '#141c22');
  tx(17, '조작', -226, -44, 9, '#c8b48a', 1);
  tx(18, 'WASD 이동   마우스 둘러보기   클릭 사격', -226, -58, 7, C_W, 1);
  tx(19, 'E 조준   Shift 달리기   C 앉기   Space 점프', -226, -70, 7, C_W, 1);
  tx(20, 'R 장전   B 사격 모드   1 2 3 무기   X 버리기', -226, -82, 7, C_W, 1);
  tx(21, 'F 줍기 · 뛰어내리기 · 낙하산   H 치료   J 부스트', -226, -94, 7, C_W, 1);
  tx(22, 'G 수류탄   T 연막탄   M 지도   Tab 인벤토리', -226, -106, 7, C_W, 1);
  tx(23, 'V 1·3인칭   F 차 타기·내리기   운전 WASD · Space', -226, -118, 7, C_SKY, 1);
  // the island
  drawIsland(119, 40, 120, 1, 64, 64, 1);
  islandNames(25, 5.5);
  tx(38, `새벽섬 2 km · 건물 ${NBUILD}채 · 엄폐물 ${NCOVER}개 · 차량 4종`, 119, -26, 7, C_DIM, 0);
  // the gun showcase
  hudBox(22, -133, 236, -36, '#1b252d');
  // a soft light behind the gun
  fillStop(); goto(76 + 52, -88); fillColorHex('#26343e'); fillStart();
  let li = 1;
  while (li <= 16) { goto(76 + 52 * cosd(li * 22.5), -88 + 34 * sind(li * 22.5)); li = li + 1; }
  fillStop();
  showGun(showG, 76, -88);
  let g = showG;
  tx(39, GNAME[g], 136, -40, 12, C_W, 1);
  tx(40, `${CLSN[GCLS[g]]} · ${AMNAME[GAMMO[g]]} · 탄창 ${GMAG[g]}`, 136, -54, 7, C_DIM, 1);
  let rpm = Math.round(60 / GINT[g]);
  statBar(41, '피해', GDMG[g] * GPEL[g] / 216, -72);
  statBar(42, '연사', rpm / 1100, -85);
  statBar(43, '사거리', GRANGE[g] / 50000, -98);
  statBar(44, '안정성', 1 - GRV[g] / 3.2, -111);
  tx(45, `실총 15종 · 부착물 15종 (${showG} / 15)`, 136, -121, 6, C_DIM, 1);
  if (isTess == 0) { tx(46, 'tessvm 확장에서 실행하세요 (순정 엔트리는 너무 느립니다)', 0, -136 + 8, 8, '#ffcc66', 0); }
}
let CLSN = ['권총', '기관단총', '돌격소총', '지정사수 소총', '저격소총', '산탄총', '경기관총'];
function statBar(slot, label, v, y) {
  let f = Math.max(0.04, Math.min(1, v));
  tx(slot, label, 136, y + 3.5, 7, C_DIM, 1);
  hudBox(168, y - 2, 230, y + 1.5, '#28333c');
  hudBox(168, y - 2, 168 + 62 * f, y + 1.5, '#c89a2a');
}
// a gun turning (the whole gun, no hands: level 2) centred on the screen point (sx, sy)
function showGun(g, sx, sy) {
  let q = (GBASE + g - 1) * 3 + 2 + 1;
  let th = showYaw, ti = 16;
  let ct = cosd(ti), st = sind(ti), cth = cosd(th), sth = sind(th);
  let k = 1638.4;
  // gun -> view: tilt (top toward the eye) after the turn about the gun's own up
  m11 = k * cth; m12 = 0; m13 = k * sth;
  m21 = k * st * sth; m22 = k * ct; m23 = 0 - k * st * cth;
  m31 = 0 - k * ct * sth; m32 = k * st; m33 = k * ct * cth;
  // far enough that the longest gun fits; the gun's middle on (sx, sy)
  let dz = 240, cz = (GMZ[g] + GSTZ[g]) / 2, cy = GSY[g] / 2;
  if (GCLS[g] == 1) { dz = 95; cz = GMZ[g] / 2; }
  let tvx = sx * dz / FOC, tvy = sy * dz / FOC;
  // t: the view position of the gun's origin = (tvx, tvy, dz) - M * (centre)
  t1 = tvx * 16384 - (m12 * cy + m13 * cz); t2 = tvy * 16384 - (m22 * cy + m23 * cz); t3 = dz * 16384 - (m32 * cy + m33 * cz);
  // the eye in the gun's frame (mm): the transpose times -t, times 10 / k
  let ex = 0 - t1 / k, ey = 0 - t2 / k, ez = 0 - t3 / k;
  drawModel(q, cth * ex + st * sth * ey - ct * sth * ez, ct * ey + st * ez, sth * ex - st * cth * ey + ct * cth * ez, 0, 0);
}

// ---------------------------------------------------------------- the end of a match
function resultHud() {
  let win = 0;
  if (gState == 4) { win = 1; }
  hudBox(-180, -108, 180, 96, '#0e1216');
  hudBox(-180, 95, 180, 96, '#c89a2a');
  if (win == 1) {
    hudBox(-180, 40, 180, 95, '#1d1708');
    tx(1, 'WINNER WINNER CHICKEN DINNER!', 0, 86, 17, C_GOLD, 0);
    tx(2, '이겼닭! 오늘 저녁은 치킨이닭!', 0, 62, 11, '#ffe8a8', 0);
    drumstick(-150, 62); drumstick(150, 62);
  } else {
    tx(1, `#${ERANK[1]}`, 0, 88, 26, C_W, 0);
    tx(2, `${killerName}에게 쓰러졌습니다 · 다음 기회에!`, 0, 54, 10, C_DIM, 0);
  }
  tx(3, `순위   #${ERANK[1]} / ${NE}`, -150, 28, 10, C_W, 1);
  tx(4, `처치   ${EKILLS[1]}`, -150, 12, 10, C_W, 1);
  tx(5, `피해량   ${Math.round(EDMG[1])}`, -150, -4, 10, C_W, 1);
  tx(6, `생존 시간   ${mmss(endT)}`, -150, -20, 10, C_W, 1);
  let gs = '없음';
  if (EG1[1] > 0) { gs = GNAME[EG1[1]]; }
  if (EG2[1] > 0) { gs = `${gs} · ${GNAME[EG2[1]]}`; }
  tx(7, `총   ${gs}`, 10, 28, 9, C_DIM, 1);
  tx(8, `헬멧 ${EHEL[1]}   조끼 ${EVES[1]}   가방 ${EPACK[1]}`, 10, 12, 9, C_DIM, 1);
  let dn = '보통';
  if (diff == 1) { dn = '쉬움'; }
  if (diff == 3) { dn = '어려움'; }
  tx(9, `AI 난이도   ${dn}`, 10, -4, 9, C_DIM, 1);
  tx(10, `자기장   ${zPhase}단계`, 10, -20, 9, C_DIM, 1);
  if (btn(-150, -96, -10, -72, 11, '[R] 다시 하기', 1, 10) == 1) { matchStart(); }
  if (btn(10, -96, 150, -72, 12, '[Enter] 메뉴', 0, 10) == 1) { gState = 0; txClear(); }
}
// a chicken drumstick
function drumstick(x, y) {
  fillStop(); goto(x - 14, y + 6); fillColorHex('#b8742c'); fillStart();
  goto(x - 6, y + 14); goto(x + 6, y + 12); goto(x + 10, y + 2); goto(x + 4, y - 6); goto(x - 8, y - 6); goto(x - 15, y - 1);
  fillStop(); goto(x + 6, y - 2); fillColorHex('#efe6d2'); fillStart(); goto(x + 14, y - 12); goto(x + 17, y - 9); goto(x + 9, y + 1);
  fillStop(); goto(x + 13, y - 9); fillColorHex('#efe6d2'); fillStart(); goto(x + 19, y - 9); goto(x + 19, y - 14); goto(x + 14, y - 15);
  fillStop(); goto(x - 9, y + 8); fillColorHex('#d89a50'); fillStart(); goto(x - 3, y + 11); goto(x + 1, y + 8); goto(x - 5, y + 4);
  fillStop();
}

// ===================================================================== v1.2: the gun test
// Two parts. The lab (gState 5): every gun turning big on the screen, its attachments put on and
// taken off slot by slot, and its numbers worked out with them (damage by body part and with
// armour, shots and time to kill, bullet drop, recoil, spread, a damage-by-distance graph). The
// range (gState 6): the player on a flat strip of the island (the build chose it: RGX, RGZ,
// facing RGA) with that gun, and ten targets from 10 m to 250 m - standing, crouching, one
// walking - that show each hit's damage, stand up again after a kill and heal when left alone.
let labGo = 0, labG = 7, labA = 0, labYaw = 30, labTilt = 14, labZoom = 1, labAuto = 1, labDrag = 0, labMX = 0, labMY = 0, labFrom = 0;
let SLOTN = ['총구', '조준경', '손잡이', '탄창', '개머리판'];
let GD1 = ['오래된 대구경 권총. 한 발이 묵직하다', '가볍고 탄창이 큰 9mm 권총', '반동이 적은 9mm 기관단총', '느리지만 한 발이 센 .45 기관단총', '아주 빠른 연사의 .45 기관단총', '한 발이 센 7.62mm 돌격소총', '다루기 쉬운 5.56mm 돌격소총', '반동이 고른 5.56mm 돌격소총', '연사가 빠른 단발·점사 소총', '탄속이 빠른 지정사수 소총', '7.62mm 반자동 지정사수 소총', '볼트액션 저격소총', '보급 상자에만 있는 최강 저격소총', '펌프액션 산탄총. 9알이 퍼진다', '100발 탄띠의 경기관총'];
let GD2 = ['가까운 거리용 · 단발', '가까운 거리용 · 단발', '근거리 연사 · 단발/자동', '근거리 · 단발/점사/자동', '근거리 최강 연사 · 탄창 작음', '반동이 크다 · 단발/자동', '부착물 칸이 많다 · 단발/자동', '단발/자동', '자동 사격 없음 · 단발/점사', '먼 거리 연사 · 단발', '먼 거리 · 단발 · 반동 큼', '머리 한 발이면 2레벨 헬멧까지', '머리 한 발이면 3레벨 헬멧까지', '10 m 안에서 가장 강하다', '탄창이 커서 오래 쏜다 · 자동'];
let AD = ['총소리가 작아진다 (300 m에서 60 m로) · 섬광 없음', '수직 반동 25%, 수평 반동 15% 줄임', '반동 10% 줄임', '1.25배 · 붉은 점 조준선', '1.25배 · 둥근 조준선', '2배 확대', '4배 확대 · 탄낙차 눈금', '8배 확대 (저격소총 전용)', '수직 반동 15% 줄임', '수평 반동 15% 줄임 · 조준이 빨라짐', '지향 사격 퍼짐 30% 줄임', '탄창 50% 늘림', '재장전 30% 빠름', '반동 회복 20% 빠름 · 수직 반동 8% 줄임', '반동 회복 15% 빠름 · 조준 퍼짐 30% 줄임'];
let CLCOL = ['#9fa8b0', '#7fd0a0', '#ffd24a', '#ff9a40', '#ff6a5a', '#c8a0ff', '#7fb0ff'];

function r1(x) { return Math.round(x * 10) / 10; }
function r2(x) { return Math.round(x * 100) / 100; }
// the shots between two of gun g (s): the bolt or the trigger, whichever is slower
function gunGap(g) { return Math.max(GINT[g], GBOLT[g]); }
// how many hits of gun g (pellets counted as one shot) bring 100 down through armour level lv on part p
function hitsToKill(g, p, lv) {
  let dm = GDMG[g] * GPEL[g];
  if (p == 1) { dm = dm * 2.1; }
  if (lv > 0) { dm = dm * (0.85 - lv * 0.12); }
  return Math.ceil(100 / dm - 0.0001);
}
// keep the attachments of a that fit gun g
function attKeep(g, a) {
  let r = 0, s = 1;
  while (s <= 5) { let ai = attIn(a, s); if (attFits(g, ai) == 1) { r = attPut(r, s, ai); } s = s + 1; }
  return r;
}
// the attachment after (dir 1) or before (dir -1) ai in slot s that fits gun g (0: none)
function attStep(g, s, ai, dir) {
  let k = 0, r = 0, found = 0, cand = ai;
  while (k < 16) {
    cand = cand + dir;
    if (cand > 15) { cand = 0; }
    if (cand < 0) { cand = 15; }
    if (found == 0) {
      if (cand == 0) { r = 0; found = 1; }
      else { if (ASLOT[cand] == s) { if (attFits(g, cand) == 1) { r = cand; found = 1; } } }
    }
    k = k + 1;
  }
  return r;
}
function attCount(g, s) {
  let n = 0, i = 1;
  while (i <= 15) { if (ASLOT[i] == s) { if (attFits(g, i) == 1) { n = n + 1; } } i = i + 1; }
  return n;
}

// ---------------------------------------------------------------- a gun with its attachments, turning
// centred on the screen point (sx, sy), turned yaw about its own up and tilted toward the eye
function labGun(g, a, sx, sy, yaw, tilt, zoom) {
  let ct = cosd(tilt), st = sind(tilt), cth = cosd(yaw), sth = sind(yaw);
  let k = 1638.4;
  m11 = k * cth; m12 = 0; m13 = k * sth;
  m21 = k * st * sth; m22 = k * ct; m23 = 0 - k * st * cth;
  m31 = 0 - k * ct * sth; m32 = k * st; m33 = k * ct * cth;
  let dz = 165 / zoom, cz = (GMZ[g] + GSTZ[g]) / 2, cy = GSY[g] / 2;
  if (GCLS[g] == 1) { dz = 62 / zoom; cz = GMZ[g] / 2; }
  let tvx = sx * dz / FOC, tvy = sy * dz / FOC;
  t1 = tvx * 16384 - (m12 * cy + m13 * cz); t2 = tvy * 16384 - (m22 * cy + m23 * cz); t3 = dz * 16384 - (m32 * cy + m33 * cz);
  let ex = 0 - t1 / k, ey = 0 - t2 / k, ez = 0 - t3 / k;
  // the eye in the gun's frame (mm)
  let lx = cth * ex + st * sth * ey - ct * sth * ez, ly = ct * ey + st * ez, lz = sth * ex - st * cth * ey + ct * cth * ez;
  lbx = lx; lby = ly; lbz = lz;
  let mz = attIn(a, 1), sg = attIn(a, 2), un = attIn(a, 3), mg = attIn(a, 4), sk = attIn(a, 5);
  // what is on the far side of the gun first: seen from above, the grip and the magazine
  if (tilt >= 0) { if (un > 0) { labAtt(un, GUNY[g], GUNZ[g]); } if (mg > 0) { labAtt(mg, GMBY[g], GMBZ[g]); } }
  else { if (sg > 0) { labAtt(sg, GRAY[g], GRAZ[g]); } }
  // the muzzle and the stock: the one away from the eye first
  if (lz < 0) { if (mz > 0) { labAtt(mz, GBORE[g], GMZ[g]); } } else { if (sk > 0) { labAtt(sk, GSTY[g], GSTZ[g]); } }
  drawModel((GBASE + g - 1) * 3 + 2 + 1, lx, ly, lz, 0, 0);
  if (lz < 0) { if (sk > 0) { labAtt(sk, GSTY[g], GSTZ[g]); } } else { if (mz > 0) { labAtt(mz, GBORE[g], GMZ[g]); } }
  if (tilt >= 0) { if (sg > 0) { labAtt(sg, GRAY[g], GRAZ[g]); } }
  else { if (un > 0) { labAtt(un, GUNY[g], GUNZ[g]); } if (mg > 0) { labAtt(mg, GMBY[g], GMBZ[g]); } }
}

// attachment ai at mount (my, mz) mm of the gun drawn by labGun (the eye in the gun's frame: lbx, lby, lbz)
let lbx = 0, lby = 0, lbz = 0;
function labAtt(ai, my, mz) {
  let s1 = t1, s2 = t2, s3 = t3;
  t1 = t1 + (m12 * my + m13 * mz); t2 = t2 + (m22 * my + m23 * mz); t3 = t3 + (m32 * my + m33 * mz);
  drawModel((ABASE + ai - 1) * 3 + 1, lbx, lby - my, lbz - mz, 0, 0);
  t1 = s1; t2 = s2; t3 = s3;
}

// ---------------------------------------------------------------- the lab: input
function labOpen(from) {
  labFrom = from; gState = 5; invOpen = 0; mapOpen = 0; txClear();
  if ($M_LOCK != 0) { $M_LOCK = 0; lockAskT = 0; }
}
function labFrame(dt) {
  if (keyHit(37) == 1) { labPick(labG - 1); }
  if (keyHit(39) == 1) { labPick(labG + 1); }
  if (keyHit(187) == 1 || keyHit(107) == 1) { labZoom = Math.min(2.2, labZoom + 0.2); }
  if (keyHit(189) == 1 || keyHit(109) == 1) { labZoom = Math.max(0.6, labZoom - 0.2); }
  if (wheelAcc != 0) { labZoom = Math.max(0.6, Math.min(2.2, labZoom + wheelAcc * 0.1)); wheelAcc = 0; }
  if (keyHit(13) == 1) { rangeGo(); }
  if (keyHit(81) == 1) { labBack(); }
  // dragging in the picture turns the gun; let go, it turns by itself (if that is on)
  let mx = mouseX(), my = mouseY();
  if (mouseDown()) {
    if (labDrag == 0) { if (mx > -146) { if (mx < 72) { if (my > -6) { if (my < 108) { labDrag = 1; } } } } }
    else { labYaw = labYaw + (mx - labMX) * 1.4; labTilt = Math.max(-70, Math.min(70, labTilt + (my - labMY) * 0.9)); }
  } else { labDrag = 0; }
  labMX = mx; labMY = my;
  if (labDrag == 0) { if (labAuto == 1) { labYaw = labYaw + dt * 32; } }
  if (labYaw > 360) { labYaw = labYaw - 360; }
  if (labYaw < 0) { labYaw = labYaw + 360; }
}
function labPick(g) {
  if (g < 1) { g = NGUN; }
  if (g > NGUN) { g = 1; }
  labG = g; labA = attKeep(g, labA);
}
function labBack() {
  if (labFrom == 6) { rangeResume(); } else { gState = 0; txClear(); }
}
// to the range: back to it as it was (opened from there), or a new one
function rangeGo() {
  if (labFrom == 6) { rangeResume(); } else { rangeStart(); }
}
function rangeResume() {
  gState = 6; txClear(); rangeEquip(); lockReq();
}

// ---------------------------------------------------------------- the lab: the screen
function labScreen() {
  let g = labG, a = labA;
  hudBox(-245, -140, 245, 140, '#0e151b');
  hudBox(-245, 112, 245, 140, '#131d25');
  hudBox(-245, 111, 245, 112, '#c89a2a');
  tx(1, '총기 테스트', -236, 120, 12, C_W, 1);
  tx(2, '← → 총 바꾸기   끌어서 돌리기   휠 확대   Enter 사격장   Q 나가기', 236, 122, 7, C_DIM, 2);
  // the guns, by kind
  let i = 1;
  while (i <= NGUN) {
    let y1 = 106 - (i - 1) * 12.4;
    hudBox(-236, y1 - 10.5, -233, y1, CLCOL[GCLS[i]]);
    if (btn(-231, y1 - 10.5, -150, y1, 2 + i, GNAME[i], b01(i == g), 7) == 1) { labPick(i); }
    i = i + 1;
  }
  if (btn(-236, -102, -150, -84, 18, '사격장에서 쏴 보기', 1, 7) == 1) { labGo = 1; }
  let back = '메뉴로';
  if (labFrom == 6) { back = '사격장으로 돌아가기'; }
  if (btn(-236, -124, -150, -106, 19, back, 0, 7) == 1) { labGo = 2; }
  // the picture
  hudBox(-146, -6, 72, 108, '#1c2830');
  fillStop(); goto(-37 + 90, 51); fillColorHex('#2c3e4a'); fillStart();
  let li = 1;
  while (li <= 16) { goto(-37 + 90 * cosd(li * 22.5), 51 + 50 * sind(li * 22.5)); li = li + 1; }
  fillStop();
  hudLine(-146, 4, 72, 4, 0.6, '#2c3a44');
  labGun(g, a, -37, 51, labYaw, labTilt, labZoom);
  let ar = '자동 회전 끄기';
  if (labAuto == 0) { ar = '자동 회전 켜기'; }
  if (btn(10, -4, 70, 8, 20, ar, 0, 6) == 1) { labAuto = 1 - labAuto; }
  if (btn(-144, -4, -100, 8, 21, '처음 각도', 0, 6) == 1) { labYaw = 30; labTilt = 14; labZoom = 1; }
  // the attachments, slot by slot (click: the next one; the left end: the one before)
  let s = 1;
  while (s <= 5) {
    let y1 = -10 - (s - 1) * 14, ai = attIn(a, s), n = attCount(g, s);
    let lab = `${SLOTN[s]}   없음`;
    if (ai > 0) { lab = `${SLOTN[s]}   ${ANAME[ai]}`; }
    if (n == 0) { lab = `${SLOTN[s]}   이 총에는 없음`; }
    let mx = mouseX();
    if (btn(-146, y1 - 12, 72, y1, 21 + s, lab, b01(ai > 0), 7) == 1) { if (n > 0) {
      let nx = attStep(g, s, ai, 1);
      if (mx < -120) { nx = attStep(g, s, ai, -1); }
      labA = attPut(labA, s, nx); a = labA;
    } }
    if (n > 0) {
      fillStop(); goto(-139, y1 - 6); fillColorHex(C_DIM); fillStart(); goto(-134, y1 - 2.5); goto(-134, y1 - 9.5);
      fillStop(); goto(65, y1 - 6); fillColorHex(C_DIM); fillStart(); goto(60, y1 - 2.5); goto(60, y1 - 9.5);
      fillStop();
    }
    s = s + 1;
  }
  // what the attachments on it do
  let e1 = '', e2 = '', ne = 0;
  s = 1;
  while (s <= 5) {
    let ai = attIn(a, s);
    if (ai > 0) { ne = ne + 1; if (ne <= 2) { if (e1 != '') { e1 = e1 + ' / '; } e1 = e1 + `${ANAME[ai]}: ${AD[ai]}`; } else { if (e2 != '') { e2 = e2 + ' / '; } e2 = e2 + `${ANAME[ai]}: ${AD[ai]}`; } }
    s = s + 1;
  }
  if (ne == 0) { e1 = '부착물이 없습니다. 칸을 눌러 달아 보세요'; }
  hudBox(-146, -134, 72, -82, '#141c22');
  tx(27, e1, -142, -88, 5.5, C_DIM, 1);
  tx(28, e2, -142, -97, 5.5, C_DIM, 1);
  labCompare(g, a);
  labStats(g, a);
}
// the gun against the others of its kind: where it stands in each number
function labCompare(g, a) {
  let rpm = Math.round(60 / gunGap(g));
  tx(29, `같은 종류 ${labKindN(g)}정 중 · 피해 ${labRank(g, 1)}위 · 연사 ${labRank(g, 2)}위 · 사거리 ${labRank(g, 3)}위`, -142, -110, 5.5, '#c8b48a', 1);
  let bt = GDMG[g] * GPEL[g] / gunGap(g);
  tx(30, `초당 최대 피해(몸통) ${Math.round(bt)} · 분당 ${rpm}발 · 탄창을 다 쏘는 데 ${r1(magSize(g, a) * gunGap(g))}초 · 탄창 하나 피해 ${Math.round(GDMG[g] * GPEL[g] * magSize(g, a))}`, -142, -122, 5.5, '#c8b48a', 1);
}
function labKindN(g) {
  let n = 0, i = 1;
  while (i <= NGUN) { if (GCLS[i] == GCLS[g]) { n = n + 1; } i = i + 1; }
  return n;
}
// rank (1 = best) of gun g among its kind by damage (1), fire rate (2), range (3)
function labRank(g, k) {
  let r = 1, i = 1;
  while (i <= NGUN) {
    if (i != g) { if (GCLS[i] == GCLS[g]) {
      let vi = GDMG[i] * GPEL[i], vg = GDMG[g] * GPEL[g];
      if (k == 2) { vi = 1 / gunGap(i); vg = 1 / gunGap(g); }
      if (k == 3) { vi = GRANGE[i]; vg = GRANGE[g]; }
      if (vi > vg) { r = r + 1; }
    } }
    i = i + 1;
  }
  return r;
}
function labRow(slot, label, val, f, y) {
  tx(slot, label, 78, y + 3.2, 6.2, C_DIM, 1);
  tx(slot + 9, val, 236, y + 3.2, 6.2, C_W, 2);
  hudBox(140, y - 2.8, 236, y - 1.2, '#28333c');
  hudBox(140, y - 2.8, 140 + 96 * Math.max(0.03, Math.min(1, f)), y - 1.2, '#c89a2a');
}
function labStats(g, a) {
  gunStatsOf(g, a);
  let cl = GCLS[g];
  tx(31, GNAME[g], 78, 101, 13, C_W, 1);
  tx(32, `${CLSN[cl]} · ${AMNAME[GAMMO[g]]} · ${labModes(g)}`, 78, 88, 6.5, CLCOL[cl], 1);
  tx(33, GD1[g], 78, 78, 6, C_W, 1);
  tx(34, GD2[g], 78, 69, 6, C_DIM, 1);
  let dm = GDMG[g] * GPEL[g];
  let ds = `${Math.round(dm)} / ${Math.round(dm * 2.1)} / ${Math.round(dm * 0.75)}`;
  if (GPEL[g] > 1) { ds = `${GDMG[g]} x ${GPEL[g]}알 / 머리 ${Math.round(dm * 2.1)}`; }
  let rpm = Math.round(60 / gunGap(g));
  let rel = reloadOf(g, a);
  labRow(35, '피해 몸통/머리/다리', ds, dm / 216, 57);
  labRow(36, '연사', `분당 ${rpm}발`, rpm / 1100, 47);
  labRow(37, '탄속', `${Math.round(GVEL[g] / 100)} m/s`, GVEL[g] / 100000, 37);
  labRow(38, '유효 사거리', `${Math.round(GRANGE[g] / 100)} m`, GRANGE[g] / 50000, 27);
  labRow(39, '탄창 · 재장전', `${magSize(g, a)}발 · ${r1(rel)}초`, 1 - rel / 7, 17);
  labRow(40, '수직 반동', `${r2(sRv)}`, 1 - sRv / 3.2, 7);
  labRow(41, '수평 반동', `${r2(sRh)}`, 1 - sRh / 0.7, -3);
  labRow(42, '지향 사격 퍼짐', `${r1(sHip)}도`, 1 - sHip / 4.2, -13);
  labRow(43, '조준 퍼짐 · 배율', `${r2(sAds)}도 · ${sZoom}배`, 1 - sAds / 0.7, -23);
  // to bring someone down
  let n0 = hitsToKill(g, 2, 0), n2 = hitsToKill(g, 2, 2), h2 = hitsToKill(g, 1, 2);
  tx(53, `처치: 몸통 ${n0}발 ${r2((n0 - 1) * gunGap(g))}초 · 조끼2 ${n2}발 · 머리(헬멧2) ${h2}발`, 78, -34, 5.5, C_W, 1);
  // the graph: damage over distance (body white, head gold), bullet drop at 100 m
  let gx0 = 82, gx1 = 232, gy0 = -128, gy1 = -58;
  hudBox(gx0 - 4, gy0 - 4, gx1 + 4, gy1 + 10, '#141c22');
  hudLine(gx0, gy0, gx1, gy0, 0.6, '#3e4e5a'); hudLine(gx0, gy0, gx0, gy1, 0.6, '#3e4e5a');
  // (as far as the bullet carries: it is spent at a quarter of its speed, v0 - k d)
  let rg = GRANGE[g], dmax = Math.min(60000, rg * 2.6, 0.75 * GVEL[g] / AMK[GAMMO[g]]);
  let top = dm * 2.1;
  let j = 0, px = gx0, pb = 0, ph = 0;
  while (j <= 24) {
    let d = dmax * j / 24;
    let f = gunDamage(g, GVEL[g] - AMK[GAMMO[g]] * d, 2) / GDMG[g];
    let x = gx0 + (gx1 - gx0) * j / 24, yb = gy0 + (gy1 - gy0) * dm * f / top, yh = gy0 + (gy1 - gy0) * dm * 2.1 * f / top;
    if (j > 0) { hudLine(px, pb, x, yb, 1.2, '#e8e8e8'); hudLine(px, ph, x, yh, 1.2, '#ffd24a'); }
    px = x; pb = yb; ph = yh;
    j = j + 1;
  }
  let rx = gx0 + (gx1 - gx0) * rg / dmax;
  hudLine(rx, gy0, rx, gy1, 0.6, '#5a6a76');
  // the drop and the flight time with the air slowing it
  let dl = `낙차 100 m ${Math.round(dropAt(g, 10000))} cm ${r2(flightT(g, 10000))}초`;
  if (dmax >= 30000) { dl = `${dl} · 300 m ${Math.round(dropAt(g, 30000))} cm ${r2(flightT(g, 30000))}초`; }
  if (dmax >= 50000) { dl = `${dl} · 500 m ${Math.round(dropAt(g, 50000))} cm`; }
  tx(54, dl, gx0 - 2, gy1 + 8, 5.5, C_DIM, 1);
  tx(55, `${Math.round(dmax / 100)} m`, gx1, gy0 - 2, 5, C_DIM, 2);
  tx(56, `${Math.round(top)}`, gx0 - 2, gy1 + 1, 5, '#ffd24a', 2);
}
function labModes(g) {
  let s = '', md = GMODE[g];
  if (mod(md, 2) == 1) { s = '단발'; }
  if (mod(idiv(md, 2), 2) == 1) { if (s != '') { s = s + '/'; } s = s + '점사'; }
  if (mod(idiv(md, 4), 2) == 1) { if (s != '') { s = s + '/'; } s = s + '자동'; }
  if (GBOLT[g] > 0) { s = '볼트액션'; }
  if (GCLS[g] == 6) { s = '펌프액션'; }
  return s;
}

// ---------------------------------------------------------------- the range
// Pop-up targets (people) at RTD from 10 m to 300 m - standing, one crouched, two walking - and
// four steel plates hanging from frames on the slope at 300 - 600 m (PLD). A hit plate rings and
// swings. Z starts a timed run: every target down once and every plate rung, as fast as you can.
let RTS = [-300, 200, -400, 0, 700, -500, 300, -600, 500, 0, -200], RTK = [0, 0, 1, 0, 2, 0, 2, 0, 0, 0, 0];
let PLS = [-450, 350, -250, 200], PLR = [25, 30, 36, 45];
let RTDEAD = [], RTF = [], RTN = [], RTUP = [], RDONE = [];
let PST = [], PDN = [], PFAR = [];
let PPX = [], PPY = [], PPZ = [], PPS = [], PPT = [], PPC = [];
let ppTop = 0, rgArm = 0, rgInf = 1, rgInit = 0;
let rgShots = 0, rgShotNo = 0, rgLastHit = 0, rgShotHit = 0, rgHits = 0, rgHead = 0, rgDmg = 0, rgKills = 0, rgPlates = 0;
let rgLD = 0, rgLP = 0, rgLDm = 0, rgLHP = 0, rgLT = 0, rgTTK = 0, rgTTKn = 0, rgTTKe = 0, rgLS = 0, rgLF = 0, rgLDr = 0;
let rgDrill = 0, rgDT0 = 0, rgDTime = 0, rgDBest = 0, rgDShots = 0, rgDHits = 0, rgDEnd = -99;
let RGPART = ['머리', '몸통', '다리', '강철판'];
const NRT = 11, NPL = 4;
function rangeLists() {
  if (rgInit == 0) {
    rgInit = 1;
    let i = 1;
    while (i <= NE) { RTDEAD.push(-99); RTF.push(-1); RTN.push(0); RTUP.push(0); RDONE.push(0); i = i + 1; }
    i = 1;
    while (i <= 8) { PPX.push(0); PPY.push(0); PPZ.push(0); PPS.push(''); PPT.push(-99); PPC.push('#ffffff'); i = i + 1; }
    i = 1;
    while (i <= NPL) { PST.push(-99); PDN.push(0); PFAR.push(0); i = i + 1; }
  }
}
// where target i (1..NRT) stands now: rgTX, rgTZ
let rgTX = 0, rgTZ = 0;
function rangeSpot(i) {
  let d = RTD[i], s = RTS[i];
  if (RTK[i] == 2) { s = s + sind(gameT * (30 + i * 3)) * 450; }
  let fx = sind(RGA), fz = cosd(RGA);
  rgTX = RGX + fx * d + fz * s; rgTZ = RGZ + fz * d - fx * s;
}
// the foot of plate i's frame: pbX, pbY, pbZ
let pbX = 0, pbY = 0, pbZ = 0;
function plateBase(i) {
  let fx = sind(RGA), fz = cosd(RGA);
  pbX = RGX + fx * PLD[i] + fz * PLS[i]; pbZ = RGZ + fz * PLD[i] - fx * PLS[i]; pbY = hAt(pbX, pbZ);
}
function rangeStart() {
  rangeLists();
  gameT = 0;
  peopleReset();
  lootClear();
  let v = 1;
  while (v <= NV) { VON[v] = 0; v = v + 1; }
  plVeh = 0;
  let e = 1;
  while (e <= NE) { EALIVE[e] = 0; EAIR[e] = 0; EVEH[e] = 0; e = e + 1; }
  EALIVE[1] = 1; EHP[1] = 100;
  let i = 1;
  while (i <= NRT) { rangeTarget(i); i = i + 1; }
  i = 1;
  while (i <= NPL) { PST[i] = -99; PDN[i] = 0; i = i + 1; }
  alive = NRT + 1;
  i = 1;
  while (i <= NFX) { FXT[i] = -99; i = i + 1; }
  i = 1;
  while (i <= 8) { GNF[i] = 0; PPT[i] = -99; i = i + 1; }
  i = 1;
  while (i <= 12) { SMT[i] = -99; i = i + 1; }
  zPhase = 0; zr = 150000; zDps = 0; planeOn = 0; mapOpen = 0; invOpen = 0; rgDrill = 0;
  // the player behind the firing line, looking down the range
  let fx = sind(RGA), fz = cosd(RGA);
  plX = RGX - fx * 120; plZ = RGZ - fz * 120; plYaw = RGA; plPitch = 0; plVY = 0;
  scanBoxes(plX, 99999, plZ, PRAD, PH, 999999); plY = gndB; plGround = 1;
  EAIR[1] = 0; EX[1] = plX; EY[1] = plY; EZ[1] = plZ;
  rangeEquip();
  rangeReset();
  gState = 6;
  txClear();
  lockReq();
  msgShow('사격장 · 화면을 클릭하면 마우스가 잡힙니다', 3);
}
function rangeTarget(i) {
  let e = i + 1;
  rangeSpot(i);
  EALIVE[e] = 1; EAIR[e] = 0; EHP[e] = 100; EX[e] = rgTX; EZ[e] = rgTZ; EY[e] = hAt(rgTX, rgTZ);
  EYAW[e] = RGA + 180; ECRO[e] = 0; EMOV[e] = 0;
  if (RTK[i] == 1) { ECRO[e] = 1; }
  EG1[e] = 0; EG2[e] = 0; EG3[e] = 0;
  EHEL[e] = rgArm; EVES[e] = rgArm; EHELD[e] = 80 + rgArm * 40; EVESD[e] = 80 + rgArm * 50;
  ECLO[e] = 1 + mod(i, 8); ENAME[e] = `표적 ${Math.round(RTD[i] / 100)} m`;
  RTF[e] = -1; RTDEAD[e] = -99;
}
function rangeEquip() {
  EG1[1] = labG; EA1[1] = labA; EM1[1] = magSize(labG, labA); ECUR[1] = 1; EG2[1] = 0; EG3[1] = 0;
  EAMMO[GAMMO[labG]] = 999;
  fireMode[1] = 1;
  if (mod(idiv(GMODE[labG], 4), 2) == 1) { fireMode[1] = 4; }
  ERELT[1] = 0; EFIRE[1] = 0; EBOLT[1] = 0; wSwitch = 1; wAdsT = 0; wRec = 0;
  playerGunStats();
}
function rangeReset() {
  rgShots = 0; rgShotNo = 0; rgLastHit = 0; rgShotHit = 0; rgHits = 0; rgHead = 0; rgDmg = 0; rgKills = 0; rgPlates = 0;
  rgLT = 0; rgTTK = 0; rgTTKn = 0; rgTTKe = 0;
}
// a shot of the player
function rangeShot() { rgShots = rgShots + 1; rgShotNo = rgShotNo + 1; }
function rangeCount() { if (rgLastHit != rgShotNo) { rgLastHit = rgShotNo; rgShotHit = rgShotHit + 1; } }
// the last hit: where it came from, how it arrived (bulletsStep left hitSpd, hitTof, hitDrop)
function rangeLast(x, z, p, dm, hp, who) {
  let hx = x - plX, hz = z - plZ;
  rgLD = Math.sqrt(hx * hx + hz * hz) / 100; rgLP = p; rgLDm = dm; rgLHP = hp; rgLT = who;
  rgLS = hitSpd / 100; rgLF = hitTof; rgLDr = hitDrop;
}
function rangePop(x, y, z, s, col) {
  ppTop = mod(ppTop, 8) + 1;
  PPX[ppTop] = x; PPY[ppTop] = y; PPZ[ppTop] = z; PPS[ppTop] = s; PPT[ppTop] = gameT; PPC[ppTop] = col;
}
// v hit by a for dm (after armour) on part p
function rangeHit(v, a, dm, p) {
  if (a == 1) { if (v > 1) {
    rgHits = rgHits + 1;
    rangeCount();
    if (p == 1) { rgHead = rgHead + 1; }
    rgDmg = rgDmg + dm;
    rangeLast(EX[v], EZ[v], p, dm, Math.max(0, EHP[v]), v);
    if (RTF[v] < 0) { RTF[v] = gameT; RTN[v] = rgShots; }
    let hy = 110, col = C_W;
    if (p == 1) { hy = 165; col = C_GOLD; }
    if (p == 3) { hy = 50; col = C_DIM; }
    if (ECRO[v] == 1) { hy = hy * 0.72; }
    rangePop(EX[v] + rand(-25, 25), EY[v] + hy, EZ[v] + rand(-25, 25), `${Math.round(dm)}`, col);
  } }
}
function rangeKill(v, a) {
  EHP[v] = 0; EALIVE[v] = 0; RTDEAD[v] = gameT; RTUP[v] = gameT + rand(10, 25) / 10;
  if (a == 1) {
    rgKills = rgKills + 1; rgLHP = 0;
    rgTTK = gameT - RTF[v]; rgTTKn = rgShots - RTN[v] + 1; rgTTKe = v;
    hitMkC = '#ff4a3d'; sfx(SND_KILL, 0);
    if (rgDrill == 1) { RDONE[v] = 1; }
  }
}
// the steel plates: a bullet's segment against each (a disc, taken as a ball of its radius)
let plateHit = 0;
function plateSeg(x0, y0, z0, x1, y1, z1) {
  let best = 2, i = 1;
  plateHit = 0;
  while (i <= NPL) {
    plateBase(i);
    let cy = pbY + 175 - PLR[i] - 12;
    let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    let L2 = dx * dx + dy * dy + dz * dz;
    let t = 0;
    if (L2 > 0) { t = ((pbX - x0) * dx + (cy - y0) * dy + (pbZ - z0) * dz) / L2; }
    if (t > 0) { if (t < 1) {
      let ex = x0 + dx * t - pbX, ey = y0 + dy * t - cy, ez = z0 + dz * t - pbZ;
      if (ex * ex + ey * ey + ez * ez < PLR[i] * PLR[i]) { if (t < best) { best = t; plateHit = i; } }
    } }
    i = i + 1;
  }
  return best;
}
function plateStruck(i, who) {
  PST[i] = gameT;
  plateBase(i);
  if (who == 1) {
    rgHits = rgHits + 1; rgPlates = rgPlates + 1;
    rangeCount();
    rangeLast(pbX, pbZ, 4, 0, -1, 100 + i);
    rangePop(pbX, pbY + 175, pbZ, `땡  ${Math.round(PLD[i] / 100)} m`, '#ffd27a');
    hitMk = 0.25; hitMkC = '#ffd24a'; sfx(SND_HIT, 0);
    if (rgDrill == 1) { PDN[i] = 1; }
  }
}
// in the cells near the eye a plate goes with its cell (dynBuild); beyond, after the far land
function rangeDyn() {
  let i = 1, ccx = Math.floor(camX / CS), ccz = Math.floor(camZ / CS);
  while (i <= NPL) {
    plateBase(i);
    PFAR[i] = 0;
    if (Math.abs(Math.floor(pbX / CS) - ccx) + Math.abs(Math.floor(pbZ / CS) - ccz) <= drawR) { dynAdd(8500 + i, pbX, pbY, pbZ); } else { PFAR[i] = 1; }
    i = i + 1;
  }
}
function rangeFarDraw() {
  let i = 1;
  while (i <= NPL) { if (PFAR[i] == 1) { drawPlate(i); } i = i + 1; }
}
// a world point on the screen without the edge test: paX, paY (paOk 0 behind the eye)
let paX = 0, paY = 0, paOk = 0;
function projA(x, y, z) {
  let ax = x - camX, ay = y - camY, az = z - camZ;
  let vz = r31 * ax + r32 * ay + r33 * az;
  paOk = 0;
  if (vz > NZ * 10) { paOk = 1; paX = (r11 * ax + r13 * az) * FOC / vz; paY = (r21 * ax + r22 * ay + r23 * az) * FOC / vz; }
}
let PXS = [0, 0, 0, 0, 0, 0, 0, 0], PYS = [0, 0, 0, 0, 0, 0, 0, 0];
// a plate: two posts and a bar, the plate (an octagon) hanging from the bar, swinging when hit
function drawPlate(i) {
  plateBase(i);
  let fx = sind(RGA), fz = cosd(RGA), rx = fz, rz = 0 - fx;
  let dx = pbX - camX, dz = pbZ - camZ;
  let dist = Math.sqrt(dx * dx + dz * dz) + 1;
  let pw = Math.max(1, 900 / dist * FOC / 240);
  let hy = pbY + 175, R = PLR[i], hw = R + 30;
  // the frame
  let ok = 1;
  projA(pbX - rx * hw, pbY, pbZ - rz * hw); let ax = paX, ay = paY; ok = ok * paOk;
  projA(pbX - rx * hw, hy + 6, pbZ - rz * hw); let bx = paX, by = paY; ok = ok * paOk;
  projA(pbX + rx * hw, pbY, pbZ + rz * hw); let cx = paX, cy = paY; ok = ok * paOk;
  projA(pbX + rx * hw, hy + 6, pbZ + rz * hw); let ex = paX, ey = paY; ok = ok * paOk;
  if (ok == 1) {
    hudLine(ax, ay, bx, by, pw, '#4a3a2c'); hudLine(cx, cy, ex, ey, pw, '#4a3a2c'); hudLine(bx, by, ex, ey, pw, '#3c3f42');
    // the plate turned th about the bar
    let age = gameT - PST[i], th = 0;
    if (age < 1.8) { th = 30 * sind(age * 720) * (1 - age / 1.8); }
    let L = R + 12, st = sind(th), ct = cosd(th);
    let qx = pbX + fx * st * L, qy = hy - ct * L, qz = pbZ + fz * st * L;
    // the plate's own "down" (w) and across (r)
    let wx = fx * st, wy = 0 - ct, wz = fz * st;
    let k = 1, all = 1;
    while (k <= 8) {
      let cphi = cosd(k * 45 + 22.5) * R, sphi = sind(k * 45 + 22.5) * R;
      projA(qx + rx * cphi + wx * sphi, qy + wy * sphi, qz + rz * cphi + wz * sphi);
      PXS[k] = paX; PYS[k] = paY; all = all * paOk;
      k = k + 1;
    }
    if (all == 1) {
      // the chains
      projA(qx - wx * R, qy - wy * R, qz - wz * R);
      hudLine((bx + ex) / 2, (by + ey) / 2, paX, paY, Math.max(1, pw * 0.5), '#2e3134');
      let col = '#a3adb3';
      if (age < 0.18) { col = '#fff2b8'; }
      else { if (rgDrill == 1) { if (PDN[i] == 1) { col = '#7fc87f'; } } }
      fillStop(); goto(PXS[1], PYS[1]); fillColorHex(col); fillStart();
      k = 2;
      while (k <= 8) { goto(PXS[k], PYS[k]); k = k + 1; }
      fillStop();
      penSize(Math.max(1, pw * 0.4)); penColorHex('#5d666c'); goto(PXS[8], PYS[8]); penDown();
      k = 1;
      while (k <= 8) { goto(PXS[k], PYS[k]); k = k + 1; }
      penUp();
    }
  }
}
// Z: the timed run
function drillStart() {
  rangeLists();
  let i = 1;
  while (i <= NRT) { rangeTarget(i); RDONE[i + 1] = 0; i = i + 1; }
  i = 1;
  while (i <= NPL) { PDN[i] = 0; i = i + 1; }
  rgDrill = 1; rgDT0 = gameT; rgDShots = rgShots; rgDHits = rgShotHit;
  msgShow('타임 어택 시작! 표적을 모두 쓰러뜨리고 강철판을 모두 맞히세요', 2.5);
  sfx(SND_EQUIP, 0);
}
function drillLeft() {
  let n = 0, i = 1;
  while (i <= NRT) { if (RDONE[i + 1] == 0) { n = n + 1; } i = i + 1; }
  i = 1;
  while (i <= NPL) { if (PDN[i] == 0) { n = n + 1; } i = i + 1; }
  return n;
}
function rangeFrame(dt) {
  gameT = gameT + dt;
  // (the 300 m target's cell is 10 cells off)
  if (drawR0 < 11) { drawR0 = 11; drawR = 11; }
  bulletsStep(dt);
  nadesStep(dt);
  // the targets: the walkers walk, the fallen pop up again a moment later, the left alone heal
  let i = 1;
  while (i <= NRT) {
    let e = i + 1;
    if (EALIVE[e] == 0) { if (gameT > RTUP[e]) { if (rgDrill != 1 || RDONE[e] == 0) { rangeTarget(i); } } }
    else {
      if (RTK[i] == 2) {
        rangeSpot(i);
        let dx = rgTX - EX[e], dz = rgTZ - EZ[e];
        if (Math.abs(dx) + Math.abs(dz) > 0.5) { EYAW[e] = atan2d(dx, dz); }
        EX[e] = rgTX; EZ[e] = rgTZ; EY[e] = hAt(rgTX, rgTZ); EMOV[e] = 1;
        EPH[e] = EPH[e] + 360 * dt * 0.75;
        if (EPH[e] > 360) { EPH[e] = EPH[e] - 360; }
      }
      if (EHP[e] < 100) { if (gameT - EHURT[e] > 4) { rangeTarget(i); } }
    }
    i = i + 1;
  }
  if (rgDrill == 1) { if (drillLeft() == 0) {
    rgDrill = 2; rgDTime = gameT - rgDT0; rgDEnd = gameT;
    if (rgDBest == 0 || rgDTime < rgDBest) { rgDBest = rgDTime; }
    sfx(SND_WIN, 0);
  } }
  // endless ammunition (the magazine still has to be reloaded) and throwables
  if (rgInf == 1) { let g = gunNow(1); if (g > 0) { EAMMO[GAMMO[g]] = 999; } }
  EFRAG[1] = 5; ESMK[1] = 5;
  if (keyHit(52) == 1) { labPick(labG - 1); rangeEquip(); msgShow(GNAME[labG], 1.2); }
  if (keyHit(53) == 1) { labPick(labG + 1); rangeEquip(); msgShow(GNAME[labG], 1.2); }
  if (keyHit(73) == 1) {
    rgArm = mod(rgArm + 1, 4);
    i = 1;
    while (i <= NRT) { rangeTarget(i); i = i + 1; }
    if (rgArm == 0) { msgShow('표적 방어구 없음', 1.5); } else { msgShow(`표적 방어구 ${rgArm}레벨 (헬멧 · 조끼)`, 1.5); }
  }
  if (keyHit(90) == 1) { if (rgDrill == 1) { rgDrill = 0; msgShow('타임 어택을 그만뒀습니다', 1.5); } else { drillStart(); } }
  if (keyHit(78) == 1) { rangeReset(); msgShow('기록을 지웠습니다', 1.2); }
  if (keyHit(80) == 1) { rgInf = 1 - rgInf; if (rgInf == 1) { msgShow('탄약 무한', 1.2); } else { EAMMO[GAMMO[gunNow(1)]] = magSize(labG, labA) * 3; msgShow('탄약 제한 (탄창 3개)', 1.2); } }
  if (keyHit(9) == 1) { labA = EA1[1]; labOpen(6); }
  if (keyHit(81) == 1) { gState = 0; txClear(); applyGfx(); if ($M_LOCK != 0) { $M_LOCK = 0; lockAskT = 0; } }
}

// ---------------------------------------------------------------- the range: the screen
// a world point on the screen: prX, prY (prOk 0 behind the eye or off the screen)
let prX = 0, prY = 0, prOk = 0;
function project(x, y, z) {
  projA(x, y, z);
  prX = paX; prY = paY; prOk = paOk;
  if (Math.abs(prX) > 250) { prOk = 0; }
  if (Math.abs(prY) > 145) { prOk = 0; }
}
function rangeHud(dt) {
  let g = gunNow(1);
  msgT = Math.max(0, msgT - dt);
  hudCross(g);
  nadePreview();
  if (ERELT[1] > 0) { if (g > 0) { hudBox(-40, -94, -40 + 80 * Math.max(0, 1 - ERELT[1] / reloadOf(g, attNow(1))), -92, '#c8c8c8'); } }
  // labels: the near targets each; of the far ones and the plates (close together on the screen)
  // only the one nearest the crosshair
  let i = 1, near = 0, nd = 40;
  while (i <= NRT + NPL) {
    let hx = 0, hy = 0, hz = 0, on = 0;
    if (i <= NRT) { if (EALIVE[i + 1] == 1) { if (RTD[i] > 7500) { on = 1; hx = EX[i + 1]; hy = EY[i + 1] + 120; hz = EZ[i + 1]; } } }
    else { on = 1; plateBase(i - NRT); hx = pbX; hy = pbY + 140; hz = pbZ; }
    if (on == 1) { project(hx, hy, hz); if (prOk == 1) { let d = Math.abs(prX) + Math.abs(prY); if (d < nd) { nd = d; near = i; } } }
    i = i + 1;
  }
  i = 1;
  while (i <= NRT) {
    let e = i + 1;
    if (EALIVE[e] == 1) {
      let hy = 200;
      if (ECRO[e] == 1) { hy = 150; }
      project(EX[e], EY[e] + hy, EZ[e]);
      let show = 1;
      if (RTD[i] > 7500) { if (i != near) { show = 0; } }
      if (prOk == 1) { if (show == 1) {
        let lb = `${Math.round(RTD[i] / 100)} m`;
        if (RTK[i] == 1) { lb = `${lb} 앉음`; }
        if (RTK[i] == 2) { lb = `${lb} 이동`; }
        tx(14 + i, lb, prX, prY + 9, 6, '#e8f0f8', 0);
        if (EHP[e] < 100) {
          hudBox(prX - 14, prY, prX + 14, prY + 3, '#202428');
          let hc = '#e8e8e8';
          if (EHP[e] < 50) { hc = '#ff7a5a'; }
          hudBox(prX - 14, prY, prX - 14 + 28 * Math.max(0, EHP[e]) / 100, prY + 3, hc);
        }
      } else { txOff(14 + i); } } else { txOff(14 + i); }
    } else { txOff(14 + i); }
    i = i + 1;
  }
  if (near > NRT) {
    plateBase(near - NRT);
    project(pbX, pbY + 175 + 30, pbZ);
    if (prOk == 1) { tx(35, `${Math.round(PLD[near - NRT] / 100)} m 강철판`, prX, prY + 9, 6, '#ffe0a0', 0); } else { txOff(35); }
  } else { txOff(35); }
  // what the hits did, rising from them
  i = 1;
  while (i <= 8) {
    let age = gameT - PPT[i];
    if (age < 1.1) {
      project(PPX[i], PPY[i] + age * 60, PPZ[i]);
      if (prOk == 1) { tx(25 + i, PPS[i], prX + 6, prY + 4, 9 - age * 2, PPC[i], 1); } else { txOff(25 + i); }
    } else { txOff(25 + i); }
    i = i + 1;
  }
  // the panels
  hudBox(-238, 136, -64, 76, '#121a20');
  tx(1, '사격장', -232, 127, 11, C_GOLD, 1);
  if (g > 0) {
    let fm = fireMode[1];
    let fms = '자동';
    if (fm == 1) { fms = '단발'; }
    if (fm == 2) { fms = '점사'; }
    if (GBOLT[g] > 0) { fms = '볼트'; }
    if (GCLS[g] == 6) { fms = '펌프'; }
    let res = `${ammoOf(1, GAMMO[g])}`;
    if (rgInf == 1) { res = '무한'; }
    tx(2, `${GNAME[g]} · ${AMNAME[GAMMO[g]]}`, -232, 114, 8, C_W, 1);
    let at = attText(attNow(1));
    if (at == '') { at = '부착물 없음'; }
    tx(3, at, -232, 104, 6, C_DIM, 1);
    tx(4, `${magNow(1)} / ${res}   ${fms}`, -232, 92, 10, C_W, 1);
  }
  let an = '표적 방어구 없음';
  if (rgArm > 0) { an = `표적 방어구 ${rgArm}레벨`; }
  tx(5, `${an} · 수류탄 연막탄 무한`, -232, 81, 6.5, C_SKY, 1);
  hudBox(64, 136, 238, 50, '#121a20');
  let acc = 0;
  if (rgShots > 0) { acc = Math.round(rgShotHit * 100 / rgShots); }
  tx(6, `발사 ${rgShots}   명중 ${rgShotHit} (${acc}%)   강철판 ${rgPlates}`, 70, 127, 7.5, C_W, 1);
  tx(7, `헤드샷 ${rgHead}   처치 ${rgKills}   총 피해 ${Math.round(rgDmg)}`, 70, 116, 7, C_W, 1);
  if (rgLT > 0) {
    let s = `마지막 명중  ${r1(rgLD)} m · ${RGPART[rgLP]} · 피해 ${r1(rgLDm)}`;
    if (rgLP == 4) { s = `마지막 명중  ${r1(rgLD)} m · 강철판`; }
    tx(8, s, 70, 104, 7, C_GOLD, 1);
    let s2 = `비행 ${r2(rgLF)}초 · 착탄 ${Math.round(rgLS)} m/s · 낙차 ${Math.round(rgLDr)} cm`;
    if (rgLS == 0) { s2 = '수류탄 폭발'; }
    if (rgLHP >= 0) { s2 = `${s2} · 남은 체력 ${Math.round(rgLHP)}`; }
    tx(9, s2, 70, 94, 6.2, C_DIM, 1);
  } else { tx(8, '표적을 쏘면 피해가 여기에 나옵니다', 70, 104, 7, C_DIM, 1); txOff(9); }
  if (rgTTKe > 0) { tx(10, `처치 시간 ${r2(rgTTK)}초 · ${rgTTKn}발`, 70, 82, 8, '#ff9a80', 1); } else { txOff(10); }
  let gt = '';
  if (g > 0) { gt = `이 총: 몸통 ${hitsToKill(g, 2, rgArm)}발 · 머리 ${hitsToKill(g, 1, rgArm)}발이면 처치`; }
  tx(11, gt, 70, 70, 6, C_DIM, 1);
  tx(12, `100 m 낙차 ${Math.round(dropAt(labG, 10000))} cm · 300 m ${Math.round(dropAt(labG, 30000))} cm · 탄속 ${Math.round(GVEL[labG] / 100)} m/s`, 70, 60, 6, C_DIM, 1);
  // the timed run
  if (rgDrill == 1) {
    let sh = rgShots - rgDShots;
    tx(36, `타임 어택  ${r1(gameT - rgDT0)}초 · 남은 표적 ${drillLeft()} · 발사 ${sh}`, 0, 38, 9, '#ff9a80', 0);
  } else { if (rgDrill == 2) { if (gameT - rgDEnd < 10) {
    tx(36, `타임 어택 완료  ${r2(rgDTime)}초 · 최고 ${r2(rgDBest)}초`, 0, 38, 9, C_GOLD, 0);
  } else { txOff(36); } } else { txOff(36); } }
  // help
  hudBox(-238, -138, 238, -124, '#121a20');
  tx(13, '4 5 총   Tab 부착물   I 표적 방어구   Z 타임 어택   P 탄약 무한   N 기록 지우기   Q 나가기', 0, -129, 6.3, C_DIM, 0);
  tx(14, '클릭 사격   E 조준   R 장전   B 모드   C 앉기   V 시점   G T 투척 (누르고 있으면 궤적)', 0, -117, 6.3, C_DIM, 0);
  if (msgT > 0) { tx(34, msgS, 0, 22, 9, C_GOLD, 0); } else { txOff(34); }
}
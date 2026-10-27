// ===================================================================== main loop
// Every tick: count it, gather the mouse's movement and clicks (tessvm writes $DELTA_X/Y
// fresh each tick, so ticks without a frame must not lose them). Every kStep ticks: a
// frame (the game and the picture) with dt = the ticks since the last one.
let $TESSVM = 0, $M_LOCK = 0, $DELTA_X = 0, $DELTA_Y = 0, $CURSOR = '';
let tickN = 0, lastFrameTick = 0, kStep = 1, frames = 0, fpsShow = 0, tpsShow = 0;
let secNow = -1, secTicks = 0, secFrames = 0, kGood = 0, kHold = 0, kFail = 0, kBad = 0, secN = 0, kDecAt = -99, kHoldTo = 0, kOne = 0;
let mAccX = 0, mAccY = 0, clickLatch = 0, mouseWas = 0, sens = 0.5, dtF = 0.016, rtK = 1;
let gfx = 1, gfxAuto = 1, gfxSlow = 0, gfxFast = 0, showFps = 1;
let ready = 0, isTess = 0, menuYaw = 0;
let keyWas = [];

// once a real second: ticks and frames in it, the frame step k, and the graphics level
function paceSecond() {
  tpsShow = secTicks; fpsShow = secFrames;
  // when ticks are lost anyway (the engine runs slow), stretch dt so the game keeps real time
  rtK = 1;
  if (secTicks < 58) { if (secTicks > 20) { rtK = Math.min(2, 60 / secTicks); } }
  // too slow: a frame every one more tick (at once when far too slow, else on the second bad second)
  secN = secN + 1;
  if (secTicks < 56) {
    kBad = kBad + 1;
    if (secTicks < 50 || kBad >= 2) {
      if (kStep < 6) { kStep = kStep + 1; kGood = 0; kBad = 0; if (secN - kDecAt < 4) { kHoldTo = secN + 15; } }
    }
  } else {
    kBad = 0;
    kGood = kGood + 1;
    // fast enough: try one tick less (not again soon if that just failed)
    if (kGood >= 2) { if (kStep > 1) { if (secN >= kHoldTo) { kStep = kStep - 1; kGood = 0; kDecAt = secN; } } }
  }
  if (kStep == 1) { kOne = kOne + 1; } else { kOne = 0; }
  if (gfxAuto == 1) {
    if (fpsShow < 19) { gfxSlow = gfxSlow + 1; } else { gfxSlow = 0; }
    if (kOne >= 10) { if (EAIR[1] == 0 || gState == 0) { gfxFast = 10; } kOne = 0; } else { gfxFast = 0; }
    if (gfxSlow >= 3) { if (gfx > 0) { gfx = gfx - 1; applyGfx(); } gfxSlow = 0; }
    if (gfxFast >= 10) { if (gfx < 1) { gfx = gfx + 1; applyGfx(); } gfxFast = 0; }
  }
  secTicks = 0; secFrames = 0;
}
let drawR0 = 9;
function applyGfx() {
  if (gfx == 0) { drawR0 = 7; }
  if (gfx == 1) { drawR0 = 9; }
  if (gfx == 2) { drawR0 = 12; }
  drawR = drawR0; fogD = (drawR - 0.5) * CS;
}
// high up (the plane, falling): farther, but thinner (see drawItem)
function viewRange() {
  let hg = camY - hAt(camX, camZ);
  drawR = drawR0; fogD = (drawR0 - 0.5) * CS; highView = 0;
  if (hg > 3000) {
    drawR = Math.min(drawR0 + 3, drawR0 + Math.floor(hg / 12000));
    fogD = (drawR - 0.5) * CS + hg * 0.7;
    if (hg > 6000) { highView = 1; }
  }
}
// keys that went down since the last frame: KHIT[code] = 1 for this frame. The press comes
// from the key event (KEV), so a tap shorter than a frame still counts; the repeats a held key
// sends are not new presses (the key was already down at the last frame).
// KDN: the event took this press; cleared once a frame sees the key up (until then the
// repeats of a held key are not presses)
let KHIT = [], KEV = [], KDN = [];
// (the key's state comes in as kd: the key block wants its code written in it)
function keyPoll(code, kd) {
  KHIT[code] = KEV[code]; KEV[code] = 0;
  if (kd) { keyWas[code] = 1; } else { keyWas[code] = 0; KDN[code] = 0; }
}
function pollKeys() {
  keyPoll(9, key(9)); keyPoll(13, key(13)); keyPoll(27, key(27)); keyPoll(32, key(32)); keyPoll(37, key(37)); keyPoll(39, key(39)); keyPoll(49, key(49)); keyPoll(50, key(50)); keyPoll(51, key(51)); keyPoll(52, key(52)); keyPoll(53, key(53));
  keyPoll(66, key(66)); keyPoll(67, key(67)); keyPoll(69, key(69)); keyPoll(70, key(70)); keyPoll(71, key(71)); keyPoll(72, key(72)); keyPoll(73, key(73)); keyPoll(74, key(74)); keyPoll(77, key(77)); keyPoll(78, key(78)); keyPoll(80, key(80)); keyPoll(81, key(81)); keyPoll(82, key(82)); keyPoll(84, key(84)); keyPoll(86, key(86)); keyPoll(88, key(88));
  keyPoll(187, key(187)); keyPoll(189, key(189)); keyPoll(107, key(107)); keyPoll(109, key(109)); keyPoll(114, key(114));
}
function keyHit(code) { return KHIT[code]; }

function frame(dt) {
  dtF = dt;
  sndN = 0;
  pollKeys();
  if (testCmd > 0) { testStep(); }
  if (keyHit(114) == 1) { showFps = 1 - showFps; }
  // V: first person / third person
  if (keyHit(86) == 1) { if (gState >= 1) { if (gState != 5) {
    camThird = 1 - camThird;
    if (camThird == 1) { msgShow('3인칭 시점 (V)', 1.5); } else { msgShow('1인칭 시점 (V)', 1.5); }
  } } }
  // looking around: slower when zoomed in (not while a screen with the pointer free is up)
  let dx = mAccX, dy = mAccY;
  mAccX = 0; mAccY = 0;
  if (key(37)) { dx = dx - 350 * dt; }
  if (key(39)) { dx = dx + 350 * dt; }
  if (key(38)) { dy = dy + 260 * dt; }
  if (key(40)) { dy = dy - 260 * dt; }
  if (invOpen == 1 || gState == 5) { dx = 0; dy = 0; }
  let mMoved = 0;
  if (Math.abs(dx) + Math.abs(dy) > 0.3) { mMoved = 1; }
  let zm = 1 + (pZoom - 1) * wAdsT;
  plYaw = plYaw + dx * sens / zm;
  plPitch = plPitch + dy * sens / zm;
  if (plYaw >= 360) { plYaw = plYaw - 360; }
  if (plYaw < 0) { plYaw = plYaw + 360; }
  if (plPitch > 85) { plPitch = 85; }
  if (plPitch < -85) { plPitch = -85; }
  if (gState == 0) { menuFrame(dt); }
  else { if (gState == 5) { labFrame(dt); }
  else {
    if (gState == 6) { rangeFrame(dt); } else { matchStep(dt); }
    if (gState != 0) { if (gState != 5) { if (EALIVE[1] == 1) { playerControl(dt, mMoved); } } }
    if (gState >= 1) { if (gState <= 2) {
      if (keyHit(77) == 1) { if (invOpen == 1) { invToggle(); } mapOpen = 1 - mapOpen; txClear(); }
      // v1.2: the inventory
      if (keyHit(9) == 1 || keyHit(73) == 1) { invToggle(); }
    } }
    if (gState == 3 || gState == 4) {
      if (invOpen == 1) { invOpen = 0; txClear(); }
      if (keyHit(82) == 1) { matchStart(); }
      if (keyHit(13) == 1) { gState = 0; txClear(); }
      // the results want the pointer (their buttons)
      if ($M_LOCK != 0) { $M_LOCK = 0; lockAskT = 0; }
    }
  } }
  // the camera
  camX = Math.round(plX); camY = Math.round(plY + plEye); camZ = Math.round(plZ);
  if (gState >= 1) { if (gState <= 2) { if (EAIR[1] == 2) { camY = Math.round(planeY - 200); } } }
  camYaw = plYaw; camPitch = plPitch;
  // v1.1: from behind - in a vehicle always, on foot with V (aiming looks down the sights)
  camMode = 0;
  if (gState >= 1) { if (gState <= 2 || gState == 6) { if (EALIVE[1] == 1) { if (EAIR[1] != 2) {
    if (plVeh > 0) { camMode = 2; } else { if (camThird == 1) { if (wAdsT < 0.5) { camMode = 1; } } }
  } } } }
  if (camMode > 0) { camBehind(); }
  // (stills only: the harness sets thK) a free camera, no HUD
  if (thK == 1) { camX = thX; camY = thY; camZ = thZ; camYaw = thYaw; camPitch = thP; }
  FOC = 240;
  if (gState >= 1) { if (gState != 5) { FOC = 240 * (1 + (pZoom - 1) * wAdsT); } }
  viewRange();
  eraseAll();
  if (gState == 0) {
    menuScreen();
    if (menuGo == 1) { menuGo = 0; clickLatch = 0; plEye = 160; txClear(); matchStart(); }
    if (menuGo == 2) { menuGo = 0; clickLatch = 0; labOpen(0); }
  } else { if (gState == 5) { labScreen(); if (labGo == 1) { labGo = 0; clickLatch = 0; rangeGo(); } if (labGo == 2) { labGo = 0; clickLatch = 0; labBack(); } } else { if (invOpen == 1) { invScreen(dt); } else {
    if (mapOpen == 1) { if (gState <= 2) { bigMap(); } else { mapOpen = 0; txClear(); } }
    if (mapOpen == 0) {
      dynBuild();
      renderWorld();
      drawZone();
      if (EALIVE[1] == 1) { if (EAIR[1] == 0) { if (camMode == 0) { drawViewGun(); } } }
      if (gState <= 2) { if (thK == 0) { playerHud(dt); } else { txClear(); } }
      if (gState == 3 || gState == 4) { resultHud(); }
      if (gState == 6) { if (thK == 0) { rangeHud(dt); } else { txClear(); } }
    }
  } } }
  clickLatch = 0;
  if (showFps == 1) { tx(56, `FPS ${fpsShow}  k${kStep}  G${gfx}  ${nPoly}`, -236, 136, 7, '#a0a8b0', 1); } else { txOff(56); }
  fillStop();
}
// the player on foot, in the air or driving (a match and the range); with the inventory up only walking
function playerControl(dt, mMoved) {
  if (EAIR[1] == 1 || EAIR[1] == 3) { playerAir(dt); }
  if (EAIR[1] == 0) { if (plVeh > 0) { playerDrive(dt); driveLook(dt, mMoved); healStep(1, dt); } }
  if (EAIR[1] == 0) { if (plVeh == 0) {
    playerMove(dt);
    if (invOpen == 0) { playerWeapon(dt); } else { EFIRE[1] = Math.max(0, EFIRE[1] - dt); wAdsT = 0; }
    playerLoot();
    healStep(1, dt);
    if (keyHit(72) == 1) { let h = bestHeal(1); if (h > 0) { if (h < 4) { useHeal(1, h); } } }
    if (keyHit(74) == 1) { if (EPILL[1] > 0) { useHeal(1, 5); } else { useHeal(1, 4); } }
    if (invOpen == 0) {
      if (keyHit(71) == 1) { playerThrow(1); }
      if (keyHit(84) == 1) { playerThrow(2); }
    }
    if (plMoving == 1) { if (plSprint == 1) { if (rand(1, 100) <= 6) { soundEvent(plX, plY, plZ, 2400, 1, 3); } } }
  } }
  // the player's body is entity 1 for everyone else
  EX[1] = plX; EY[1] = plY; EZ[1] = plZ; EYAW[1] = plYaw; EPIT[1] = plPitch; ECRO[1] = plCrouch;
  EMOV[1] = 0;
  if (plMoving == 1) { EMOV[1] = 1; if (plSprint == 1) { EMOV[1] = 1.4; } if (plCrouch == 1) { EMOV[1] = 0.5; } }
  EPH[1] = EPH[1] + EMOV[1] * 480 * dt * 0.75;
  if (EPH[1] > 360) { EPH[1] = EPH[1] - 360; }
  if (plVeh > 0) { EYAW[1] = VYAW[plVeh]; EMOV[1] = 0; }
}// v1.1: the island's long lists come in as text (PKS, see build.mjs): item c0 on, n values of w
// base-64 digits each (sc 0: six hex digits, a colour), plus mn, over sc; into scratch list
// PV<at + 1> (eight of them: Entry keeps no list longer than 5000)
let PV1 = [], PV2 = [], PV3 = [], PV4 = [], PV5 = [], PV6 = [], PV7 = [], PV8 = [];
function unpack(pk, at) {
  let c0 = PKA[pk], n = PKB[pk], w = PKW[pk], sc = PKC[pk], mn = PKM[pk];
  let c = c0, s = PKS[c0], L = strlen(s), p = 2, i = 1, v = 0, j = 0;
  if (at == 0) { M_unp(PV1); }
  if (at == 1) { M_unp(PV2); }
  if (at == 2) { M_unp(PV3); }
  if (at == 3) { M_unp(PV4); }
  if (at == 4) { M_unp(PV5); }
  if (at == 5) { M_unp(PV6); }
  if (at == 6) { M_unp(PV7); }
  if (at == 7) { M_unp(PV8); }
}
function M_unp(T) {
  while (i <= n) {
    if (p > L) { c = c + 1; s = PKS[c]; L = strlen(s); p = 2; }
    if (sc == 0) { T[i] = `#${substr(s, p, p + 5)}`; p = p + 6; }
    else {
      v = 0; j = 0;
      while (j < w) { v = v * 64 + indexOf(B64S, charAt(s, p)) - 1; p = p + 1; j = j + 1; }
      v = v + mn;
      if (sc > 1) { v = v / sc; }
      T[i] = v;
    }
    i = i + 1;
  }
}
const B64S = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$';
// v1.1: outside tessvm (plain Entry) the work cannot be played, and unpacking the island would
// take minutes there: say so at once instead
function plainNotice() {
  hide(); penUp();
  for (;;) {
    if (TXS.length >= NTX) {
      eraseAll();
      hudBox(-245, -140, 245, 140, '#0e151b');
      hudBox(-245, 103, 245, 104, '#c89a2a');
      fillStop();
      tx(1, '엔트리 배틀로얄 3D', 0, 60, 19, '#ffffff', 0);
      tx(2, 'tessvm 확장 프로그램에서 실행하세요', 0, 10, 13, '#ffcc66', 0);
      tx(3, '순정 엔트리는 너무 느려서 이 작품을 실행할 수 없습니다', 0, -20, 9, '#b8c0c8', 0);
      tx(4, '크롬에 tessvm 확장을 설치하고 켠 뒤 이 페이지를 다시 여세요', 0, -40, 9, '#b8c0c8', 0);
    }
  }
}
on('start', 'pen', function () {
  if ($TESSVM == 0) { plainNotice(); }
  let pi = PV1.length;
  while (pi < 5000) { PV1.push(0); PV2.push(0); PV3.push(0); PV4.push(0); PV5.push(0); PV6.push(0); PV7.push(0); PV8.push(0); pi = pi + 1; }
  unpackAll();
  hide();
  penUp();
  isTess = $TESSVM;
  renderInit();
  peopleInit(); peopleDrawInit(); weaponInit(); lootInit(); invReset(); navInit(); aiInit(); gameInit(); vehInit();
  let i = 1;
  while (i <= 255) { keyWas.push(0); KHIT.push(0); KEV.push(0); KDN.push(0); i = i + 1; }
  applyGfx();
  if (BENCH == 1) { gfxAuto = 0; gfx = 1; applyGfx(); }
  volume(80);
  ready = 1;
  for (;;) {
    tickN = tickN + 1;
    secTicks = secTicks + 1;
    // the pointer: held by the work after a click (tessvm asks the viewer once)
    if (isTess == 1) { mAccX = mAccX + $DELTA_X; mAccY = mAccY + $DELTA_Y; lockWatch(); }
    if (mouseDown()) { mouseWas = 1; } else { mouseWas = 0; }
    let s = dateSec();
    if (s != secNow) { if (secNow >= 0) { paceSecond(); } secNow = s; }
    if (tickN - lastFrameTick >= kStep) {
      let dt = (tickN - lastFrameTick) / 60 * rtK;
      if (dt > 0.2) { dt = 0.2; }
      lastFrameTick = tickN;
      frames = frames + 1; secFrames = secFrames + 1;
      if (BENCH == 1) { benchStep(); }
      frame(dt);
    }
  }
});

// the camera behind the player (1: over the shoulder, 2: behind the vehicle), pulled in before a wall
let camThird = 0, camMode = 0;
function camBehind() {
  let bx0 = plX, by0 = plY + plEye, bz0 = plZ;
  let back = 280, side = 62, up = 28;
  if (EAIR[1] == 1 || EAIR[1] == 3) { back = 420; side = 0; up = 80; }
  if (camMode == 2) {
    let k = VK[plVeh];
    bx0 = VX[plVeh]; bz0 = VZ[plVeh]; by0 = VY[plVeh] + 170;
    back = VKHL[k] + 470; side = 0; up = 110;
    if (k == 4) { back = 420; up = 70; }
  }
  let cp = cosd(camPitch), sp = sind(camPitch), sy = sind(camYaw), cy = cosd(camYaw);
  let cbx = bx0 - sy * cp * back + cy * side, cby = by0 - sp * back + up, cbz = bz0 - cy * cp * back - sy * side;
  rayCast(bx0, by0, bz0, cbx, cby, cbz);
  let t = rayT;
  if (t < 1) { t = Math.max(0, t - 0.1); }
  camX = Math.round(bx0 + (cbx - bx0) * t); camY = Math.round(by0 + (cby - by0) * t); camZ = Math.round(bz0 + (cbz - bz0) * t);
  let g = hAt(camX, camZ) + 45;
  if (camY < g) { camY = Math.round(g); }
}

// every press of the mouse (an event: a press shorter than a tick still counts)
on('click', 'pen', function () {
  clickLatch = 1;
  // in a match the pointer is held (again after Esc)
  if (invOpen == 0) { if (gState >= 1) { if (gState <= 2 || gState == 6) { if ($M_LOCK == 0) { lockReq(); } } } }
  if (keysLost == 1) { keysLost = 0; msgT = 0; if (EAIR[1] == 2) { msgShow('F: 뛰어내리기', 4); } }
});

// v1.1: asking for the pointer. tessvm asks the viewer the first time, in a box of its own; the
// box takes the keyboard's focus with it, and once it is gone the keys reach nobody until the
// stage is clicked with the pointer free (a click while it is held does not give it back). So
// the work writes 2 to ask, and tessvm writes 1 when the pointer is held: when that took a
// while, there was a box - the pointer is let go again and one click on the stage takes both
// back (by then tessvm no longer asks).
let lockAskT = 0, keysLost = 0;
function lockReq() {
  if (isTess == 1) { if ($M_LOCK != 1) { $M_LOCK = 2; lockAskT = tickN; } }
}
function lockWatch() {
  if (lockAskT > 0) {
    if ($M_LOCK == 1) {
      if (tickN - lockAskT > 20) { if (gState >= 1) { if (gState <= 2 || gState == 6) {
        $M_LOCK = 0; keysLost = 1;
        msgShow('화면을 한 번 클릭하면 시작합니다 (마우스 잠금 · 키보드)', 999);
      } } }
      lockAskT = 0;
    } else { if ($M_LOCK == 0) { lockAskT = 0; } }
  }
}

// measuring: start a match at once, drop the player in the city
let benchT = 0;
let thK = 0, thX = 0, thY = 0, thZ = 0, thYaw = 0, thP = 0;
function benchStep() {
  benchT = benchT + 1;
  if (benchT == 2) {
    matchStart(); playerJump(); EAIR[1] = 0; plX = 103000; plZ = 101000; plYaw = 40; plPitch = -3; scanBoxes(plX, 99999, plZ, PRAD, PH, 999999); plY = gndB; plEye = 160;
    EG1[1] = 7; EM1[1] = 30; ammoAdd(1, 3, 120); EA1[1] = attPut(attPut(0, 2, 4), 1, 2); ECUR[1] = 1; playerGunStats();
    // eight armed bots on the ground round the city, the rest still in the plane
    let e = 2;
    while (e <= 9) {
      let a = e * 45, d = 2500 + e * 900;
      let x = plX + sind(a) * d, z = plZ + cosd(a) * d;
      let n = nearNode(x, hAt(x, z), z);
      EAIR[e] = 0; EX[e] = NDX[n]; EY[e] = NDY[n]; EZ[e] = NDZ[n]; AFULL[e] = 1;
      EG1[e] = 6 + mod(e, 4); EM1[e] = 30; ammoAdd(e, GAMMO[EG1[e]], 150); ECUR[e] = 1; EVES[e] = 1; EVESD[e] = 130; EHEL[e] = mod(e, 3); EHELD[e] = 120;
      AMODE[e] = MD_MOVE; AGK[e] = 4;
      e = e + 1;
    }
  }
}

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
// keys that went down since the last frame: KHIT[code] = 1 for this frame
let KHIT = [];
function M_poll(code) {
  if (key(code)) { if (keyWas[code] == 0) { KHIT[code] = 1; } else { KHIT[code] = 0; } keyWas[code] = 1; } else { keyWas[code] = 0; KHIT[code] = 0; }
}
function pollKeys() {
  M_poll(9); M_poll(13); M_poll(27); M_poll(32); M_poll(49); M_poll(50); M_poll(51); M_poll(52); M_poll(53);
  M_poll(66); M_poll(67); M_poll(69); M_poll(70); M_poll(71); M_poll(72); M_poll(73); M_poll(74); M_poll(77); M_poll(78); M_poll(80); M_poll(81); M_poll(82); M_poll(84); M_poll(86); M_poll(88);
  M_poll(187); M_poll(189); M_poll(107); M_poll(109); M_poll(114);
}
function keyHit(code) { return KHIT[code]; }

function frame(dt) {
  dtF = dt;
  sndN = 0;
  pollKeys();
  if (keyHit(114) == 1) { showFps = 1 - showFps; }
  // looking around: slower when zoomed in
  let dx = mAccX, dy = mAccY;
  mAccX = 0; mAccY = 0;
  if (key(37)) { dx = dx - 350 * dt; }
  if (key(39)) { dx = dx + 350 * dt; }
  if (key(38)) { dy = dy + 260 * dt; }
  if (key(40)) { dy = dy - 260 * dt; }
  let zm = 1 + (pZoom - 1) * wAdsT;
  plYaw = plYaw + dx * sens / zm;
  plPitch = plPitch + dy * sens / zm;
  if (plYaw >= 360) { plYaw = plYaw - 360; }
  if (plYaw < 0) { plYaw = plYaw + 360; }
  if (plPitch > 85) { plPitch = 85; }
  if (plPitch < -85) { plPitch = -85; }
  if (gState == 0) { menuFrame(dt); }
  else {
    matchStep(dt);
    if (EALIVE[1] == 1) {
      if (EAIR[1] == 1 || EAIR[1] == 3) { playerAir(dt); }
      if (EAIR[1] == 0) {
        playerMove(dt);
        playerWeapon(dt);
        playerLoot();
        healStep(1, dt);
        if (keyHit(72) == 1) { let h = bestHeal(1); if (h > 0) { if (h < 4) { useHeal(1, h); } } }
        if (keyHit(74) == 1) { if (EPILL[1] > 0) { useHeal(1, 5); } else { useHeal(1, 4); } }
        if (keyHit(71) == 1) { playerThrow(1); }
        if (keyHit(84) == 1) { playerThrow(2); }
        if (plMoving == 1) { if (plSprint == 1) { if (rand(1, 100) <= 6) { soundEvent(plX, plY, plZ, 2400, 1, 3); } } }
      }
      // the player's body is entity 1 for everyone else
      EX[1] = plX; EY[1] = plY; EZ[1] = plZ; EYAW[1] = plYaw; EPIT[1] = plPitch; ECRO[1] = plCrouch;
      EMOV[1] = 0;
      if (plMoving == 1) { EMOV[1] = 1; if (plSprint == 1) { EMOV[1] = 1.4; } if (plCrouch == 1) { EMOV[1] = 0.5; } }
    }
    if (keyHit(77) == 1) { mapOpen = 1 - mapOpen; if (mapOpen == 0) { bigMapOff(); } }
    if (gState >= 3) {
      if (keyHit(82) == 1) { matchStart(); }
      if (keyHit(13) == 1) { gState = 0; txClear(); }
    }
  }
  // the camera
  camX = Math.round(plX); camY = Math.round(plY + plEye); camZ = Math.round(plZ);
  if (gState >= 1) { if (EAIR[1] == 2) { camY = Math.round(planeY - 200); } }
  camYaw = plYaw; camPitch = plPitch;
  FOC = 240;
  if (gState >= 1) { FOC = 240 * (1 + (pZoom - 1) * wAdsT); }
  viewRange();
  eraseAll();
  dynBuild();
  renderWorld();
  if (gState >= 1) {
    drawZone();
    if (EALIVE[1] == 1) { if (EAIR[1] == 0) { drawViewGun(); } }
    if (gState <= 2) { playerHud(dt); }
    if (mapOpen == 1) { bigMap(); }
    if (gState >= 3) { resultHud(); }
  } else { menuHud(); }
  if (showFps == 1) { tx(56, `FPS ${fpsShow}  k${kStep}  G${gfx}  ${nPoly}`, -236, 136, 7, '#a0a8b0', 1); } else { txOff(56); }
  fillStop();
}
// the menu: the island turning slowly behind it
function menuFrame(dt) {
  menuYaw = menuYaw + dt * 4;
  plX = 103000 + sind(menuYaw) * 26000; plZ = 101000 - cosd(menuYaw) * 26000; plY = hAt(plX, plZ) + 5500; plEye = 0;
  plYaw = menuYaw; plPitch = -12;
  if (keyHit(49) == 1) { diff = 1; }
  if (keyHit(50) == 1) { diff = 2; }
  if (keyHit(51) == 1) { diff = 3; }
  if (keyHit(71) == 1) { if (gfxAuto == 1) { gfxAuto = 0; gfx = 0; } else { if (gfx < 2) { gfx = gfx + 1; } else { gfxAuto = 1; gfx = 1; } } applyGfx(); }
  if (keyHit(187) == 1 || keyHit(107) == 1) { sens = Math.min(2, sens + 0.05); }
  if (keyHit(189) == 1 || keyHit(109) == 1) { sens = Math.max(0.1, sens - 0.05); }
  if (keyHit(13) == 1 || clickLatch == 1) { clickLatch = 0; plEye = 160; txClear(); matchStart(); }
}

on('start', 'pen', function () {
  hide();
  penUp();
  isTess = $TESSVM;
  renderInit();
  peopleInit(); peopleDrawInit(); weaponInit(); lootInit(); navInit(); aiInit(); gameInit();
  let i = 1;
  while (i <= 255) { keyWas.push(0); KHIT.push(0); i = i + 1; }
  applyGfx();
  if (BENCH == 1) { gfxAuto = 0; gfx = 1; applyGfx(); }
  volume(80);
  ready = 1;
  for (;;) {
    tickN = tickN + 1;
    secTicks = secTicks + 1;
    // the pointer: held by the work after a click (tessvm asks the viewer once)
    if (isTess == 1) { mAccX = mAccX + $DELTA_X; mAccY = mAccY + $DELTA_Y; }
    if (mouseDown()) {
      if (mouseWas == 0) { clickLatch = 1; if (isTess == 1) { if ($M_LOCK == 0) { $M_LOCK = 1; } } }
      mouseWas = 1;
    } else { mouseWas = 0; }
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

// measuring: start a match at once, drop the player in the city
let benchT = 0;
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

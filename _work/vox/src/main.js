// ===================================================================== main loop
// Every tick: count it, gather the mouse movement and the wheel (tessvm writes $DELTA_X/Y and
// $SCROLL_Y only in a tick the wheel turned: the work sets it back to 0 itself). Every kStep ticks: a frame (the game and the picture) with dt the
// time since the last one.
let $TESSVM = 0, $M_LOCK = 0, $DELTA_X = 0, $DELTA_Y = 0, $SCROLL_Y = 0, $CURSOR = '';
let tickN = 0, lastFrameTick = 0, kStep = 1, frames = 0, fpsShow = 0, tpsShow = 0;
let secNow = -1, secTicks = 0, secFrames = 0, kGood = 0, kBad = 0, secN = 0, kHoldTo = 0, kDecAt = -99, rtK = 1;
let mAccX = 0, mAccY = 0, wheelAcc = 0, clickLatch = 0, clickHeld = 0, mouseWas = 0, sens = 0.5, isTess = 0;
let gState = 0, viewWant = 32, autoView = 1, slowSec = 0, fastSec = 0;
let tday = 0.03, dayLen = 1200, skyStep = -1;
let KW = [], KHIT = [];
let titleSeed = 0, seedText = '무작위', helpT = 0, wasLocked = 0, eyeH = 1.62;

function paceSecond() {
  tpsShow = secTicks; fpsShow = secFrames;
  rtK = 1;
  if (secTicks < 58) { if (secTicks > 20) { rtK = Math.min(2, 60 / secTicks); } }
  secN = secN + 1;
  // (only while playing: making the world has long ticks of its own)
  if (gState != 2) { kStep = 1; kBad = 0; kGood = 0; }
  else { if (secTicks < 55) {
    kBad = kBad + 1;
    if (secTicks < 48 || kBad >= 3) { if (kStep < 4) { kStep = kStep + 1; kGood = 0; kBad = 0; if (secN - kDecAt < 4) { kHoldTo = secN + 10; } } }
  } else {
    kBad = 0; kGood = kGood + 1;
    if (kGood >= 2) { if (kStep > 1) { if (secN >= kHoldTo) { kStep = kStep - 1; kGood = 0; kDecAt = secN; } } }
  } }
  // the render distance follows the speed (down when slow, back up to the chosen one)
  if (gState == 2) { if (autoView == 1) {
    if (fpsShow < 28) { slowSec = slowSec + 1; } else { slowSec = 0; }
    if (kStep == 1) { if (fpsShow >= 55) { fastSec = fastSec + 1; } } else { fastSec = 0; }
    if (slowSec >= 3) { if (viewR > 10) { setView(viewR - 4); } slowSec = 0; }
    if (fastSec >= 8) { if (viewR < viewWant) { if (headWater == 0) { setView(Math.min(viewWant, viewR + 4)); } } fastSec = 0; }
  } }
  if (BENCH == 1) { kStep = 1; rtK = 1; slowSec = 0; fastSec = 0; }
  secTicks = 0; secFrames = 0;
}

// keys that went down since the last frame
function keyPoll(code, kd) {
  if (kd) { if (KW[code] == 0) { KHIT[code] = 1; } else { KHIT[code] = 0; } KW[code] = 1; } else { KW[code] = 0; KHIT[code] = 0; }
}
function pollKeys() {
  keyPoll(27, key(27)); keyPoll(37, key(37)); keyPoll(39, key(39));
  keyPoll(49, key(49)); keyPoll(50, key(50)); keyPoll(51, key(51)); keyPoll(52, key(52)); keyPoll(53, key(53)); keyPoll(54, key(54)); keyPoll(55, key(55)); keyPoll(56, key(56)); keyPoll(57, key(57));
  keyPoll(32, key(32)); keyPoll(84, key(84)); keyPoll(191, key(191));
  keyPoll(67, key(67)); keyPoll(69, key(69)); keyPoll(70, key(70)); keyPoll(71, key(71)); keyPoll(72, key(72)); keyPoll(80, key(80)); keyPoll(81, key(81)); keyPoll(114, key(114)); keyPoll(13, key(13));
}
function keyHit(code) { return KHIT[code]; }

// ---------------------------------------------------------------- the pointer
// tessvm holds the pointer when the work writes 2 (it asks the viewer once, in a box that takes
// the keyboard's focus: when the answer took long, the pointer is let go and one click on the
// stage gives both back)
let lockAskT = 0, keysLost = 0;
function lockReq() { if (isTess == 1) { if ($M_LOCK != 1) { $M_LOCK = 2; lockAskT = tickN; } } }
function lockWatch() {
  if (lockAskT > 0) {
    if ($M_LOCK == 1) {
      if (tickN - lockAskT > 20) { $M_LOCK = 0; keysLost = 1; msgShow('화면을 한 번 더 클릭하세요 (마우스 잠금 · 키보드)', 999); }
      lockAskT = 0;
    } else { if ($M_LOCK == 0) { lockAskT = 0; } }
  }
}
function mouseFree() { if ($M_LOCK != 0) { $M_LOCK = 0; lockAskT = 0; } }
function locked() {
  let r = 0;
  if (isTess == 0) { r = 1; }
  if ($M_LOCK == 1) { r = 1; }
  return r;
}
on('click', 'pen', function () {
  clickLatch = 1;
  if (gState == 2) { if (uiMode == 0) { if (dead == 0) { if ($M_LOCK == 0) { lockReq(); } } } }
  if (keysLost == 1) { keysLost = 0; msgT = 0; }
});

// ---------------------------------------------------------------- sound
let sndN = 0, sndOn = 1, sndRate = 1;
// (v2.5) the rate of a note 0 .. 24 (2 ^ ((p - 12) / 12)): Entry plays every sound at one rate, so
// the others set it back
let NOTER = [0.5, 0.529732, 0.561231, 0.594604, 0.629961, 0.66742, 0.707107, 0.749154, 0.793701, 0.840896, 0.890899, 0.943874, 1, 1.059463, 1.122462, 1.189207, 1.259921, 1.33484, 1.414214, 1.498307, 1.587401, 1.681793, 1.781797, 1.887749, 2];
function sndPlay(n) {
  if (sndOn == 1) { if (sndN < 3) { if (sndRate != 1) { soundSpeed(1); sndRate = 1; } sound(`s${n}`); sndN = sndN + 1; } }
}
function sndNote(inst, p) {
  if (sndOn == 1) { if (sndN < 3) { let r = NOTER[p + 1]; if (sndRate != r) { soundSpeed(r); sndRate = r; } sound(`n${inst}`); sndN = sndN + 1; } }
}

// ---------------------------------------------------------------- time of day: sky, fog, dark
function mix(a, b, t) { return a + (b - a) * t; }
function daySky() {
  sunA = tday * 360;
  let f = sind(sunA);
  let dl = (f + 0.18) / 0.4;
  if (dl < 0) { dl = 0; } if (dl > 1) { dl = 1; }
  dark = Math.round((1 - dl) * 11);
  // clouds of rain darken the day
  if (wthr > 0) { dl = dl * 0.55; dark = Math.max(dark, 3 + wthr); }
  starA = 0;
  if (dl < 0.5) { starA = 1; }
  // sunrise / sunset glow near the horizon
  let gl = 1 - Math.abs(f) / 0.3;
  if (gl < 0) { gl = 0; }
  let zr = mix(6, 116, dl), zg = mix(8, 160, dl), zb = mix(22, 250, dl);
  let hr = mix(18, 180, dl), hg = mix(22, 208, dl), hb = mix(44, 252, dl);
  hr = mix(hr, 236, gl * 0.6); hg = mix(hg, 140, gl * 0.6); hb = mix(hb, 92, gl * 0.6);
  let mr = (zr + hr) / 2, mg = (zg + hg) / 2, mb = (zb + hb) / 2;
  if (headWater == 1) { hr = 22; hg = 42; hb = 118; }
  if (inLava == 1) { if (headWater == 0) { hr = 200; hg = 70; hb = 10; } }
  skyHex = rgb(Math.round(zr), Math.round(zg), Math.round(zb));
  skyMidHex = rgb(Math.round(mr), Math.round(mg), Math.round(mb));
  voidHex = rgb(Math.round(hr * 0.62), Math.round(hg * 0.66), Math.round(hb * 0.8));
  let sv = Math.round(mix(40, 255, 1 - dl));
  starHex = rgb(sv, sv, sv);
  // the colour table follows the fog in steps (rebuilt a part a frame)
  if (Math.abs(hr - fogR) + Math.abs(hg - fogG) + Math.abs(hb - fogB) > 14 || (headWater == 1 && hr != fogR)) {
    if (ctPos >= NCOL * 192) {
      fogR = Math.round(hr); fogG = Math.round(hg); fogB = Math.round(hb); fogHex = rgb(fogR, fogG, fogB);
      ctPos = 0;
    }
  }
  if (ctPos < NCOL * 192) { ctBuild(Math.min(9000, NCOL * 192 - ctPos)); }
}

// ---------------------------------------------------------------- one frame of play
let underWas = 0;
// one frame of play, in parts (each small enough to copy in Entry's editor)
function playFrame(dt) {
  playLook(dt);
  playKeys(dt);
  playWorld(dt);
  playEye(dt);
  // the picture (SPLIT: the objects `view` and `hud` draw it in their own loops)
  uiDt = dt;
  if (SPLIT == 1) { eraseAll(); frameSeq = frameSeq + 1; } else { eraseAll(); drawView(); drawUI(dt); }
  clickLatch = 0;
  fillStop();
}
// looking round, the pointer, the click
function playLook(dt) {
  // looking around
  let dx = mAccX, dy = mAccY;
  mAccX = 0; mAccY = 0;
  if (key(37)) { if (uiMode == 0) { dx = dx - 300 * dt; } }
  if (key(39)) { if (uiMode == 0) { dx = dx + 300 * dt; } }
  if (key(38)) { dy = dy + 220 * dt; }
  if (key(40)) { dy = dy - 220 * dt; }
  if (uiMode != 0 || dead == 1) { dx = 0; dy = 0; }
  yaw = yaw + dx * sens; pitch = pitch + dy * sens;
  if (yaw >= 360) { yaw = yaw - 360; } if (yaw < 0) { yaw = yaw + 360; }
  if (pitch > 89.5) { pitch = 89.5; } if (pitch < -89.5) { pitch = -89.5; }
  // the pointer was let go (Esc): the game menu
  lkNow = locked();
  if (uiMode == 0) { if (dead == 0) { if (wasLocked == 1) { if (lkNow == 0) { if (lockAskT == 0) { uiMode = 6; txClear(); } } } } }
  wasLocked = lkNow;
  clickHeld = 0;
  if (mouseDown()) { if (lkNow == 1) { clickHeld = 1; } }
  attackCool = attackCool - dt; placeCool = placeCool - dt; swingT = swingT - dt; bowCool = Math.max(0, bowCool - dt);
}
// the keys of play (or of the open screen)
function playKeys(dt) {
  // (what the player does here goes out to the server: net.js)
  netUserAct = 1;
  if (dead == 0) {
    if (uiMode == 0) {
      // the hotbar: number keys, the wheel (the spectator: the speed)
      let k = 1;
      while (k <= 9) { if (keyHit(48 + k) == 1) { hotSel = k; } k = k + 1; }
      if (gameMode == 3) { while (wheelAcc >= 1) { specSpeed = Math.max(0.2, specSpeed - 0.2); wheelAcc = wheelAcc - 1; } while (wheelAcc <= -1) { specSpeed = Math.min(5, specSpeed + 0.2); wheelAcc = wheelAcc + 1; } }
      // (a notch down: the next slot)
      while (wheelAcc >= 1) { hotSel = hotSel + 1; wheelAcc = wheelAcc - 1; if (hotSel > 9) { hotSel = 1; } }
      while (wheelAcc <= -1) { hotSel = hotSel - 1; wheelAcc = wheelAcc + 1; if (hotSel < 1) { hotSel = 9; } }
      playerMove(dt);
      camX = px; camY = py + eyeH; camZ = pz; camYaw = yaw; camPitch = pitch;
      if (gameMode == 3) { if (specMob > 0) { if (ET[specMob] == 0 || key(16)) { specMob = 0; } else { px = EX[specMob]; py = EY[specMob] + MH[ET[specMob]] - 1.75; pz = EZ[specMob]; } } }
      pickRay();
      if (clickLatch == 1) { if (lkNow == 1) { attack(); } }
      breaking(dt);
      if (keyHit(70) == 1) { useKey(); }
      if (key(70)) { if (placeCool <= 0) { if (KW[70] == 1) { useKey(); placeCool = 0.25; } } }
      if (keyHit(81) == 1) { dropHeld(); }
      if (keyHit(67) == 1) { pickCopy(); }
      if (keyHit(69) == 1) { if (gameMode == 1) { uiOpen(5); } else { if (gameMode != 3) { uiOpen(1); } } }
      if (keyHit(80) == 1) { uiMode = 6; mouseFree(); txClear(); }
      // a command: T or /
      if (keyHit(84) == 1) { chatOpen(''); }
      if (keyHit(191) == 1) { chatOpen('/'); }
      if (keyHit(71) == 1) { viewWant = viewWant + 8; if (viewWant > 48) { viewWant = 8; } setView(viewWant); msgShow(`시야 거리 ${viewWant} 블록`, 1.5); }
    } else {
      playerMove(dt);
      camX = px; camY = py + eyeH; camZ = pz; camYaw = yaw; camPitch = pitch;
      pickOn = 0; breakStage = 0;
      uiInput();
    }
    survival(dt);
    effectsStep(dt);
  } else { pickOn = 0; breakStage = 0; uiInput(); }
  netUserAct = 0;
  wheelAcc = 0;
  if (keyHit(114) == 1) { showDbg = 1 - showDbg; }
  if (keyHit(72) == 1) { helpT = 12 - helpT; if (helpT < 0) { helpT = 0; } }
}
// the world goes on: mobs, items, blocks, chunks, the sky
function playWorld(dt) {
  mobsStep(dt); itemsStep(dt); arrowsStep(dt); furnacesStep(dt); spawnStep(dt); randomTicks(dt); fluidStep(dt);
  blocksStep(dt); pendingMobs(); weatherStep(dt);
  gameTicks = gameTicks + dt * 20;
  worldFlush();
  if (LRQ.length > 0) { lightRedoStep(); }
  // the world round the player: a few chunk stages and some sections a frame
  let cw = 1;
  if (kStep == 1) { cw = 2; }
  chunkWork(cw); remeshSome(6);
  if (BENCH == 0) { if (grDay == 1) { tday = tday + dt / dayLen; } }
  if (tday >= 1) { tday = tday - 1; dayN = dayN + 1; }
  // ((v2.6) a time that is no number (a broken value read) would hold the sky for good)
  if ((tday >= 0) == false) { tday = 0.25; }
  if (dim == 0) { dimAmb = 0; daySky(); } else { dimSky(); }
  gateStep(dt);
  if (dim == 2) { bossStep(dt); }
}
// the eye and the field of view
function playEye(dt) {
  // the eye
  let eh = 1.62;
  if (sneaking == 1) { if (flying == 0) { eh = 1.27; } }
  if (swimming == 1) { eh = 0.4; }
  eyeH = eyeH + (eh - eyeH) * Math.min(1, 12 * dt);
  camX = px; camY = py + eyeH + Math.abs(sind(bob * 57)) * 0.06; camZ = pz; camYaw = yaw; camPitch = pitch;
  if (dead == 1) { camY = py + 0.3; }
  underWater = headWater;
  if (underWater != underWas) { underWas = underWater; if (underWater == 1) { setView(Math.min(viewR, 12)); } else { setView(viewWant); } }
  let fw = 210;
  if (sprinting == 1) { fw = 188; }
  if (flying == 1) { if (sprinting == 1) { fw = 175; } }
  FOC = Math.round(FOC + (fw - FOC) * Math.min(1, 8 * dt));
  if (Math.abs(FOC - fw) < 4) { FOC = fw; }
}
let frameSeq = 0, uiDt = 0, lkNow = 0;
// the world, the weather, the flashes, the hand
function drawView() {
  renderWorld();
  drawWeather();
  if (headWater == 1) { penAlpha(55); box(-245, 140, 245, -140, '#1a3a90'); fillStop(); penAlpha(0); }
  if (flashT > 0) { penAlpha(40); box(-245, 140, 245, -140, '#ffffff'); fillStop(); penAlpha(0); }
  if (hurtFlash > 0) { penAlpha(70); box(-245, 140, 245, -140, '#c00000'); fillStop(); penAlpha(0); }
  // ((v2.7) on fire: flames at the bottom of the view)
  if (fireT > 0) { if (dead == 0) { penAlpha(45); box(-245, -70 + Math.round(sind(frameNo * 40) * 6), 245, -140, '#ff6a10'); fillStop(); penAlpha(0); } }
  if (uiMode == 0) { if (dead == 0) { if (gameMode != 3) { drawHand(); } } }
  fillStop();
}
// the HUD and the screens over it
function drawUI(dt) {
  if (uiMode <= 6) { if (dead == 0) { drawHud(dt); } }
  // ((v2.6) the chat open: its history)
  if (uiMode == 9) { chatHud(dt); }
  if (uiMode >= 1) { if (uiMode <= 5 || uiMode == 8) { invScreen(); } }
  if (uiMode == 6) { pauseScreen(); }
  if (uiMode == 10) { tradeScreen(); }
  if (uiMode == 7) { deathScreen(); }
  if (netOn == 1) { netHud(); }
  if (helpT > 0) { helpT = helpT - dt; helpText(); } else { if (uiMode == 0) { txOff(15); txOff(16); txOff(17); txOff(18); txOff(19); } }
  if (lkNow == 0) { if (uiMode == 0) { if (dead == 0) { tx(19, '화면을 클릭하면 마우스로 둘러봅니다', 0, -60, 9, '#ffffff', 0); } } }
  fillStop();
}
function helpText() {
  tx(15, 'WASD 이동 · 스페이스 점프(크리에이티브: 두 번 눌러 날기) · Shift 웅크리기 · W 두 번/R 달리기', 0, 104, 7, '#ffffff', 0);
  tx(16, '클릭(누르고 있기) 부수기·공격 · F 놓기·쓰기(먹기, 작업대·화로·상자 열기) · Q 버리기', 0, 94, 7, '#ffffff', 0);
  tx(17, '1~9·휠 손에 들 것 · E 소지품·제작 · G 시야 거리 · T 또는 / 명령어 · F3 정보 · P 메뉴 · H 도움말', 0, 84, 7, '#ffffff', 0);
  tx(18, '/gamemode spectator 관전자 · /help 명령어 목록 · 크리에이티브 창 위의 탭과 검색', 0, 74, 7, '#c0ffc0', 0);
}
// clicks on the screens
function uiInput() {
  if (uiMode == 9) { chatType(uiDt); }
  if (uiMode >= 1 && uiMode <= 5 || uiMode == 8) {
    if (keyHit(69) == 1 || keyHit(27) == 1) { uiClose(); lockReq(); }
    else {
      if (uiMode == 5) {
        if (keyHit(37) == 1) { if (uiPage > 0) { uiPage = uiPage - 1; } }
        if (keyHit(39) == 1) { if ((uiPage + 1) * 36 < palLen()) { uiPage = uiPage + 1; } }
        if (wheelAcc >= 1) { if ((uiPage + 1) * 36 < palLen()) { uiPage = uiPage + 1; } }
        if (clickLatch == 1) { if (tabHot >= 0) { if (tabHot == NCAT) { palSearch(); } else { uiTab = tabHot; uiPage = 0; } clickLatch = 0; } }
        if (wheelAcc <= -1) { if (uiPage > 0) { uiPage = uiPage - 1; } }
      }
      if (clickLatch == 1) {
        let sh = 0;
        if (key(16)) { sh = 1; }
        if (uiHover > 0) { slotClick(uiHover, sh); }
        else {
          // a click outside the window throws what is on the cursor
          let mx = mouseX(), my = mouseY();
          let left = -88; if (uiMode == 5) { left = -112; }
          if (curI > 0) { if (mx < left || mx > 88 || my > 92 || my < -94) { if (uiMode != 5) { dropItem(curI, curN, curD, camX + lookX * 0.4, camY - 0.3, camZ + lookZ * 0.4, 2); } curI = 0; curN = 0; curD = 0; } }
        }
      }
      // number keys: the hovered slot to the hotbar
      let k = 1;
      while (k <= 9) {
        if (keyHit(48 + k) == 1) { if (uiHover > 0) { if (uiHover != k) { if (uiHover <= 36) {
          let ti = INVI[k], tn = INVN[k], td = INVD[k];
          slotGet(uiHover);
          INVI[k] = gI; INVN[k] = gN; INVD[k] = gD;
          slotSet(uiHover, ti, tn, td);
        } } } }
        k = k + 1;
      }
    }
  }
  if (uiMode == 10) { tradeInput(); }
  if (uiMode == 6) {
    if (keyHit(80) == 1 || keyHit(27) == 1) { uiMode = 0; txClear(); lockReq(); }
    if (clickLatch == 1) {
      let right = 0;
      // ((v2.6.1) the right half of the button (the left column: -200 .. -10); it was x > 0, past it)
      if (mouseX() > 0 - 105) { right = 1; }
      if (menuSel == 1) { uiMode = 0; txClear(); lockReq(); }
      if (menuSel == 2) { if (right == 1) { viewWant = viewWant + 4; if (viewWant > 48) { viewWant = 48; } } else { viewWant = viewWant - 4; if (viewWant < 8) { viewWant = 8; } } setView(viewWant); }
      if (menuSel == 3) { if (right == 1) { sens = Math.min(2, sens + 0.1); } else { sens = Math.max(0.1, sens - 0.1); } }
      if (menuSel == 4) { setMode(mod(gameMode + 1, 4)); }
      if (menuSel == 5) { sndOn = 1 - sndOn; }
      if (menuSel == 8) { autoView = 1 - autoView; setView(viewWant); }
      if (menuSel == 9) { fogOn = 1 - fogOn; setView(viewR); }
      if (menuSel == 10) { lightSet(1 - lightOn); }
      // ((v2.8) the texture distance: the right column's halves (x 10 .. 200)
      if (menuSel == 11) { if (mouseX() > 105) { texSet(texI + 1); } else { texSet(texI - 1); } }
      if (menuSel == 7) { if (netSrv == 0) { saveGame(1); } }
      if (menuSel == 6) { if (netSrv > 0) { netLeave(); } else { if (canSave() == 1) { saveGame(1); } } uiMode = 0; gState = 0; txClear(); }
    }
  }
  if (uiMode == 7) {
    if (clickLatch == 1) {
      if (menuSel == 1) { respawn(); txClear(); lockReq(); if (netSrv > 0) { plugRun('respawn', ' ', netNick); } }
      if (menuSel == 2) { respawn(); gState = 0; txClear(); }
    }
  }
}

// ---------------------------------------------------------------- title and loading
function dirtBack(dk) {
  let x = -240, y = 0, t = TDIRT;
  s8 = 1;
  while (x < 240) {
    y = 135;
    while (y > -135) { faceRects(t, x, y, 32, 0, 0, -32, dk); y = y - 32; }
    x = x + 32;
  }
  s8 = 0;
}
let titleSpin = 0;
function loadFrame() {
  genStep();
  eraseAll();
  dirtBack(14);
  tx(1, '세계를 만들고 있습니다', 0, 30, 12, '#ffffff', 0);
  tx(2, genMsg, 0, 5, 9, '#d0d0d0', 0);
  box(-101, -13, 101, -23, '#000000');
  box(-100, -14, -100 + 200 * Math.min(1, genN), -22, '#80ff80');
  fillStop();
  if (genPhase == 7) {
    txClear();
    findSpawn();
    storesInit(); startKit();
    setView(viewWant);
    respawn();
    yaw = 45; pitch = -10; flying = 0; FOC = 210;
    tday = 0.03; fogR = -99; ctPos = NCOL * 192;
    gState = 2; uiMode = 0; helpT = 12;
    lockReq();
    // a new world is kept at once (in its place among the five)
    if (worldCur > 0) { if (canSave() == 1) { saveGame(0); } }
  }
}

// ---------------------------------------------------------------- start
function plainNotice() {
  hide(); penUp();
  for (;;) {
    eraseAll();
    box(-245, 140, 245, -140, '#1b1410');
    box(-245, 100, 245, 98, '#6b8a3a');
    fillStop();
    tx(1, '블록 월드', 0, 60, 19, '#ffffff', 0);
    tx(2, 'tessvm 확장 프로그램에서 실행하세요', 0, 10, 13, '#ffcc66', 0);
    tx(3, '순정 엔트리는 너무 느려서 이 작품을 실행할 수 없습니다', 0, -20, 9, '#b8c0c8', 0);
    tx(4, '크롬에 tessvm 확장을 설치하고 켠 뒤 이 페이지를 다시 여세요', 0, -40, 9, '#b8c0c8', 0);
  }
}
on('start', 'pen', function () {
  // the text slots come from the text object's own start script
  waitUntil(TXS.length >= NTX);
  bigInit();
  gamerulesInit();
  if ($TESSVM == 0) { if (SIMRUN == 0) { plainNotice(); } }
  hide(); penUp();
  isTess = $TESSVM;
  let i = 0;
  while (i <= 255) { KW.push(0); KHIT.push(0); i = i + 1; }
  i = 0;
  while (i < NSEC) { SDIRTY.push(0); i = i + 1; }
  meshInit(); worldInit(); slotsInit(); invInit(); storesInit(); thingsInit();
  renderInit();
  volume(70);
  if (AUTOSEED > 0) { genStart(AUTOSEED); gameMode = AUTOMODE; gState = 1; }
  for (;;) {
    tickN = tickN + 1; secTicks = secTicks + 1;
    if (isTess == 1) { mAccX = mAccX + $DELTA_X; mAccY = mAccY + $DELTA_Y; lockWatch();
      // the wheel: tessvm writes $SCROLL_Y in the tick it turned and leaves it there, so it is
      // read once and set back to 0 (one step a turn, down is +1)
      if ($SCROLL_Y != 0) { if ($SCROLL_Y < 0) { wheelAcc = wheelAcc + 1; } else { wheelAcc = wheelAcc - 1; } $SCROLL_Y = 0; }
    }
    let s = dateSec();
    if (s != secNow) { if (secNow >= 0) { paceSecond(); } secNow = s; }
    if (tickN - lastFrameTick >= kStep) {
      let dt = (tickN - lastFrameTick) / 60 * rtK;
      if (dt > 0.2) { dt = 0.2; }
      lastFrameTick = tickN;
      frames = frames + 1; secFrames = secFrames + 1;
      sndN = 0;
      pollKeys();
      if (gState == 0) { titleFrame(dt); }
      else { if (gState == 1) { loadFrame(); } else { if (gState == 3) { travelFrame(); } else { playFrame(dt); } } }
      netStep(dt);
      if (TESTRUN == 1) { testStep(); }
    }
  }
});

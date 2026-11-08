// ============================================================
// The loop, the keys and the pointer, the panel text, the menu, the ending
// ============================================================
let ready = 0, menuOn = 1, menuSel = 1, menuText = ' ', topText = ' ', tLast = 0, kLatch = 0, mWas = 0, mLX = 0, mLY = 0, mMoved = 0, dtLast = 0;
let tA = 0, tR = 0, tL = 0, prN = 0, prHit = 0, fpsN = 0, fpsSec = -1, fps = 0, showFps = 0, helpText = ' ', overText = ' ', overOn = 0;

// which engine: tessvm's timer counts ticks (60 a second), plain Entry's reads the clock
function probe() {
  let t = timer() * 60;
  prN = prN + 1;
  if (t > 0.5 && Math.abs(t - Math.round(t)) < 0.0005) { prHit = prHit + 1; }
  if (prN == 12) { isTess = 0; quality = QPLAIN; if (prHit >= 9) { isTess = 1; quality = QTESS; } setQuality(); }
}

function keyAct(kn) {
  if (menuOn == 1) {
    if (kn == 38) { menuSel = menuSel - 1; if (menuSel < 1) { menuSel = nStages; } }
    if (kn == 40) { menuSel = menuSel + 1; if (menuSel > nStages) { menuSel = 1; } }
    if (kn == 37) { menuSel = menuSel - 12; if (menuSel < 1) { menuSel = menuSel + 24; } if (menuSel > nStages) { menuSel = nStages; } }
    if (kn == 39) { menuSel = menuSel + 12; if (menuSel > 24) { menuSel = menuSel - 24; } if (menuSel > nStages) { menuSel = nStages; } }
    if (kn == 13 || kn == 32) { menuStart(); }
    menuMake();
  } else {
    if (overOn == 1) {
      if (kn == 13 || kn == 32 || kn == 77) { overOn = 0; if (endingOn == 1) { endingOn = 0; menuOn = 1; menuMake(); } }
    } else {
      if (kn == 69 || kn == 70) { interact(); }
      if (kn == 88) { lensCut(); }
      if (kn == 82) { loadStage(stage); say('처음부터 다시'); }
      if (kn == 72) { hintLv = hintLv + 1; if (hintLv > 3) { hintLv = 1; } hintShow(); }
      if (kn == 77) { menuOn = 1; menuSel = stage; menuMake(); }
      if (kn == 71) { quality = quality + 1; if (quality > 5) { quality = 1; } setQuality(); say(str('화질 ', quality, '/5 (포털 깊이 ', maxD, ')')); }
      if (kn == 80) { showFps = 1 - showFps; topDirty = 1; }
    }
  }
}

// quality presets: how many windows deep, and whether floor lines and edges are drawn
let quality = 2;
function setQuality() {
  maxD = quality + 1;
  detail = 0;
  minArea = 2500;
  if (quality == 2) { minArea = 1400; }
  if (quality >= 3) { detail = 1; minArea = 600; }
  if (quality >= 4) { detail = 2; minArea = 250; }
  if (quality >= 5) { minArea = 80; }
}

function hintShow() {
  let t = SH1[stage];
  if (hintLv == 2) { t = SH2[stage]; }
  if (hintLv == 3) { t = SH3[stage]; }
  msgText = str('힌트 ', hintLv, '/3: ', t);
  msgT = 8;
}

function menuStart() {
  menuOn = 0;
  loadStage(menuSel);
  say(str(SNM[stage], '  —  H: 힌트, M: 메뉴'));
}

function menuMake() {
  let s = '경계의 건축가  ·  비유클리드 3D 퍼즐\n', i = 1, j = 0, a = ' ', b = ' ';
  s = str(s, '↑↓←→ 고르기 · Enter 또는 클릭: 시작   기록 ', recAll, '/', RECNEED, '\n\n');
  while (i <= 12) {
    a = ' ';
    if (i <= nStages) { a = str('  ', i, '. ', SNM[i]); if (i == menuSel) { a = str('▶', i, '. ', SNM[i]); } }
    s = str(s, a, '\n');
    i = i + 1;
  }
  menuText = s;
  s = ' \n \n \n';
  i = 13;
  while (i <= 24) {
    b = ' ';
    if (i <= nStages) { b = str('  ', i, '. ', SNM[i]); if (i == menuSel) { b = str('▶', i, '. ', SNM[i]); } }
    s = str(s, b, '\n');
    i = i + 1;
  }
  menuText2 = s;
  menuDesc = str(SZN[menuSel], '  ·  ', SNM[menuSel], '\n', SGL[menuSel], '\n', KEYS);
}
let menuText2 = ' ', menuDesc = ' ';

function inputStep(dt) {
  let kn = 0, mx = mouseX(), my = mouseY(), md = 0;
  if (mouseDown()) { md = 1; }
  if (md == 1 && mWas == 0) { mMoved = 0; }
  if (md == 1 && mWas == 1) {
    if (mx != mLX || my != mLY) {
      mMoved = mMoved + Math.abs(mx - mLX) + Math.abs(my - mLY);
      if (menuOn == 0 && overOn == 0) {
        yaw = yaw + (mx - mLX) * SENS;
        pitch = pitch + (my - mLY) * SENS;
      }
    }
  }
  if (md == 0 && mWas == 1 && mMoved < 4) {
    // a click
    if (menuOn == 1) { menuStart(); }
    else { if (overOn == 1) { keyAct(13); } else { interact(); } }
  }
  mWas = md; mLX = mx; mLY = my;
  if (key(37)) { kn = 37; }
  if (key(39)) { kn = 39; }
  if (key(38)) { kn = 38; }
  if (key(40)) { kn = 40; }
  if (menuOn == 0) { kn = 0; }
  if (key(13)) { kn = 13; }
  if (key(32) && (menuOn == 1 || overOn == 1)) { kn = 32; }
  if (key(69)) { kn = 69; }
  if (key(70)) { kn = 70; }
  if (key(88)) { kn = 88; }
  if (key(82)) { kn = 82; }
  if (key(72)) { kn = 72; }
  if (key(77)) { kn = 77; }
  if (key(71)) { kn = 71; }
  if (key(80)) { kn = 80; }
  if (kn != kLatch) {
    kLatch = kn;
    if (kn > 0) { keyAct(kn); }
  }
  if (menuOn == 0 && overOn == 0) {
    if (key(37)) { yaw = yaw - dt * TURN; }
    if (key(39)) { yaw = yaw + dt * TURN; }
    if (key(38)) { pitch = pitch + dt * TURN * 0.6; }
    if (key(40)) { pitch = pitch - dt * TURN * 0.6; }
  }
  if (pitch > 85) { pitch = 85; }
  if (pitch < -85) { pitch = -85; }
  yaw = mod(yaw, 360);
}

// the panel at the top
function topMake() {
  let s = str(SZN[stage], '   ', stage, '/', nStages, '  ', SNM[stage]), i = SC0[stage] + 1, c = ' ';
  s = str(s, '\n', SGL[stage]);
  c = ' ';
  while (i <= SC1[stage]) {
    c = str(c, '  계수기 ', CN[i], ' / ', CNT[i]);
    if (CNE[i] == 1) { c = str(c, ' (정확히)'); }
    i = i + 1;
  }
  if (recN > 0) { c = str(c, '  기록 ', recHave, '/', recN); }
  if (psc < 0.999 || psc > 1.001) { c = str(c, '  크기 ×', fmt(psc, 3)); }
  if (lensSel > 0) { c = str(c, '  렌즈: 패널 하나 고름 (X 취소)'); }
  if (held > 0) { c = str(c, '  큐브를 들고 있음'); }
  if (showFps == 1) { c = str(c, '  ', fps, 'fps 면', nFill, ' 방', nRoomDraw); }
  topText = str(s, '\n', c);
}

// the cross in the middle (filled, on top of the picture)
function crossHair() {
  let c = '#ffffff';
  if (lensSel > 0) { c = '#7fe0ff'; }
  nS = 4; SX[1] = -7; SY[1] = -1; SX[2] = 7; SY[2] = -1; SX[3] = 7; SY[3] = 1; SX[4] = -7; SY[4] = 1; fillS('#202020');
  nS = 4; SX[1] = -1; SY[1] = -7; SX[2] = 1; SY[2] = -7; SX[3] = 1; SY[3] = 7; SX[4] = -1; SY[4] = 7; fillS('#202020');
  nS = 4; SX[1] = -6; SY[1] = -0.5; SX[2] = 6; SY[2] = -0.5; SX[3] = 6; SY[3] = 0.5; SX[4] = -6; SY[4] = 0.5; fillS(c);
  nS = 4; SX[1] = -0.5; SY[1] = -6; SX[2] = 0.5; SY[2] = -6; SX[3] = 0.5; SY[3] = 6; SX[4] = -0.5; SY[4] = 6; fillS(c);
  fillStop();
}

// the end of the game: kind 1 seals the facility, kind 2 opens the other connections
function endingAsk(kind) {
  recordsAll();
  if (kind == 2 && recAll < RECNEED) {
    say(str('기록이 모자랍니다 (', recAll, '/', RECNEED, '). 기록을 모두 찾으면 고를 수 있습니다'));
  } else {
    endingOn = 1; overOn = 1;
    if (kind == 1) { overText = ENDA; } else { overText = ENDB; }
  }
}

function frame() {
  let now = timer(), dt = now - tLast, sec = dateSec();
  tLast = now;
  if (dt > 0.05) { dt = 0.05; }
  if (dt < 0) { dt = 0; }
  dtLast = dt;
  if (prN < 12) { probe(); }
  fpsN = fpsN + 1;
  if (sec != fpsSec) { fpsSec = sec; fps = fpsN; fpsN = 0; if (showFps == 1) { topDirty = 1; } }
  tA = timer();
  inputStep(dt);
  if (menuOn == 0 && overOn == 0 && SKIPL == 0) {
    stageT = stageT + dt;
    playerStep(dt);
    cubesStep(dt);
    laserStep();
    logicStep(dt);
    pickups();
    if (stageClear == 1) {
      clearT = clearT - dt;
      if (clearT <= 0) {
        stageClear = 0;
        recordsAll();
        if (stage < nStages) { loadStage(stage + 1); say(str(SNM[stage], '  —  H: 힌트')); }
        else { endingAsk(1); }
      }
    }
  }
  tL = tL * 0.9 + (timer() - tA) * 100;
  if (msgT > 0) { msgT = msgT - dt; if (msgT <= 0) { msgText = ' '; } }
  viewEye();
  tA = timer();
  if (SKIPR == 0) { renderAll(); }
  tR = tR * 0.9 + (timer() - tA) * 100;
  observeStep();
  if (menuOn == 0) { crossHair(); }
  topDirty = topDirty + 1;
  if (topDirty > 6) { topMake(); topDirty = 0; }
}

on('start', 'pen', function () {
  hide();
  timerStart();
  allocAll();
  recordsAll();
  loadStage(1);
  // the menu shows the first room behind it
  menuSel = START;
  menuMake();
  if (AUTOSTART > 0) { menuSel = AUTOSTART; menuStart(); }
  ready = 1;
  tLast = timer();
  for (;;) {
    frame();
    if (TEST > 0) { testStep(); }
  }
});

on('start', 'top', function () {
  let shown = ' ', vis = -1, v = 0;
  for (;;) {
    if (ready == 1) {
      v = 1 - menuOn;
      if (v != vis) { vis = v; if (v == 1) { show(); } else { hide(); } }
      if (topText != shown) { shown = topText; write(shown); }
    }
  }
});

on('start', 'msg', function () {
  let shown = ' ', vis = -1, v = 0;
  hide();
  for (;;) {
    if (ready == 1) {
      v = 0;
      if (msgText != ' ' && menuOn == 0 && overOn == 0) { v = 1; }
      if (v != vis) { vis = v; if (v == 1) { show(); } else { hide(); } }
      if (v == 1 && msgText != shown) { shown = msgText; write(shown); }
    }
  }
});

on('start', 'menu', function () {
  let shown = ' ', vis = -1, v = 0;
  for (;;) {
    if (ready == 1) {
      v = menuOn;
      if (v != vis) { vis = v; if (v == 1) { show(); } else { hide(); } }
      if (v == 1 && menuText != shown) { shown = menuText; write(shown); }
    }
  }
});

on('start', 'menu2', function () {
  let shown = ' ', vis = -1, v = 0;
  for (;;) {
    if (ready == 1) {
      v = menuOn;
      if (v != vis) { vis = v; if (v == 1) { show(); } else { hide(); } }
      if (v == 1 && menuText2 != shown) { shown = menuText2; write(shown); }
    }
  }
});

on('start', 'desc', function () {
  let shown = ' ', vis = -1, v = 0;
  for (;;) {
    if (ready == 1) {
      v = menuOn;
      if (v != vis) { vis = v; if (v == 1) { show(); } else { hide(); } }
      if (v == 1 && menuDesc != shown) { shown = menuDesc; write(shown); }
    }
  }
});

on('start', 'over', function () {
  let shown = ' ', vis = -1, v = 0;
  hide();
  for (;;) {
    if (ready == 1) {
      v = overOn;
      if (v != vis) { vis = v; if (v == 1) { show(); } else { hide(); } }
      if (v == 1 && overText != shown) { shown = overText; write(shown); }
    }
  }
});

// ============================================================
// The pointer, the keys, the buttons, the pace
// ============================================================
let BL = ['열기', '예제', ' ＋ ', ' － ', '이동', '돌기', '양면', ' 축 ', ' 색 ', '처음', ' ？ ', ' ≡ '];
// the key each button stands for
let TBK = [79, 78, 88, 90, 80, 84, 67, 85, 77, 82, 72];
let BX = [], BY = [], BG = [], BS = [], BV = [0, 0];
let menuOn = 1, helpOn = 0, btnBorn = 0, wantAsk = 0, exNo = 0, ready = 0, done = 0;
let btn$k = 0, btn$vis = -1, btn$st = 0;
let mWas = 0, mLX = 0, mLY = 0, uiHit = 0, btnKey = 0, panMode = 0, kLatch = 0, topText = ' ', tLast = 0;
let fpsN = 0, busyN = 0, loadN = 0, workSum = 0, refN = 0, workR = 0, fpsSec = -1, fpsSkip = 1, fpsNow = 0, statN = 0, prN = 0, prHit = 0;
let OUT = [];

function btnInit() {
  let k = 1;
  while (k <= 11) { BX.push(40 * k - 258); BY.push(-124); BG.push(1); BS.push(0); k = k + 1; }
  BX.push(222); BY.push(125); BG.push(2); BS.push(0);
}

function nextExample() {
  exNo = exNo + 1;
  if (exNo > EXT.length) { exNo = 1; }
  modelName = EXN[exNo];
  loadBegin(EXT[exNo]);
}

// what a key (or the button that stands for it) does
function keyAct(kn) {
  if (kn == 72) { helpOn = 1 - helpOn; }
  else {
    if (kn == 79) { if (ldOn == 0) { wantAsk = 1; } }
    if (kn == 78) { if (ldOn == 0) { nextExample(); } }
    if (kn == 80) { panMode = 1 - panMode; }
    if (kn == 84) { spin = 1 - spin; }
    if (kn == 67) { two = 1 - two; viewGen = viewGen + 1; }
    if (kn == 85) { upZ = 1 - upZ; viewGen = viewGen + 1; }
    if (kn == 77) {
      colMode = colMode + 1;
      if (colMode > 2) { colMode = 0; }
      rampBuild();
      viewGen = viewGen + 1;
    }
    if (kn == 82) { viewReset(); spin = 0; }
  }
}

// the pointer went down at (mx, my): on a button? -> uiHit (the press is not for the model), btnKey
function uiPress(mx, my) {
  let k = 0;
  btnKey = 0; uiHit = 0;
  if (helpOn == 1) { helpOn = 0; uiHit = 1; }
  else {
    if (mx > 204 && my > 114) { uiHit = 1; menuOn = 1 - menuOn; }
    else {
      if (menuOn == 1 && my < -112) {
        uiHit = 1;
        k = idiv(mx + 220, 40) + 1;
        if (k >= 1 && k <= 11) { btnKey = TBK[k]; }
      }
    }
  }
}
function zoomBy(f) {
  zoom = zoom * f;
  if (zoom < 0.2) { zoom = 0.2; }
  if (zoom > 60) { zoom = 60; }
  // (what is in the middle of the stage stays there)
  panX = panX * f; panY = panY * f;
  viewGen = viewGen + 1;
}

function showStatus() {
  let s = ' ';
  if (ldOn > 0) { s = ldMsg; }
  else {
    if (nLv == 0) { s = ldMsg; }
    else {
      s = `${modelName} · 면 ${nFaces} · 꼭짓점 ${nVerts}`;
      if (two == 1) { s = `${s} · 양면`; }
      if (shownLv != 1) { s = `${s} · 미리보기 ${LVN[shownLv]}`; }
      if (nDrop > 0) { s = `${s} · 넘친 면 ${nDrop}개 버림`; }
      if (nBad > 0) { s = `${s} · 잘못된 면 ${nBad}개`; }
      s = `${s} · ${fpsNow}fps`;
    }
  }
  topText = s;
}

function uiStep() {
  let kn = 0, mx = mouseX(), my = mouseY(), md = 0, now = timer(), dt = 0, held = 0;
  dt = now - tLast; tLast = now;
  if (dt > 0.2) { dt = 0.2; }
  if (dt < 0) { dt = 0; }
  if (mouseDown()) { md = 1; }
  if (md == 1 && mWas == 0) {
    uiPress(mx, my);
    // (the buttons that are held down act below; the others act once, now)
    if (btnKey > 0 && btnKey != 88 && btnKey != 90) { keyAct(btnKey); }
  }
  if (md == 1 && mWas == 1) {
    if (uiHit == 0) {
      if (mx != mLX || my != mLY) {
        if (panMode == 1) { panX = panX + mx - mLX; panY = panY + my - mLY; }
        else {
          az = az - (mx - mLX) * 0.6;
          el = el - (my - mLY) * 0.6;
          if (el > 90) { el = 90; }
          if (el < -90) { el = -90; }
        }
        viewGen = viewGen + 1;
      }
    } else { held = btnKey; }
  }
  if (md == 0) { btnKey = 0; }
  mWas = md; mLX = mx; mLY = my;
  if (key(79)) { kn = 79; }
  if (key(78)) { kn = 78; }
  if (key(80)) { kn = 80; }
  if (key(84)) { kn = 84; }
  if (key(67)) { kn = 67; }
  if (key(85)) { kn = 85; }
  if (key(77)) { kn = 77; }
  if (key(82)) { kn = 82; }
  if (key(72)) { kn = 72; }
  if (kn != kLatch) {
    kLatch = kn;
    if (kn > 0) { keyAct(kn); }
  }
  // held keys: turning and zooming
  if (key(88) || key(187) || key(107) || held == 88) { zoomBy(1 + dt * 1.5); }
  if (key(90) || key(189) || key(109) || held == 90) { zoomBy(1 / (1 + dt * 1.5)); }
  if (key(37)) { az = az + dt * 90; viewGen = viewGen + 1; }
  if (key(39)) { az = az - dt * 90; viewGen = viewGen + 1; }
  if (key(38)) { if (el < 90) { el = el + dt * 90; viewGen = viewGen + 1; } }
  if (key(40)) { if (el > -90) { el = el - dt * 90; viewGen = viewGen + 1; } }
  if (spin == 1 && md == 0) { az = az - dt * 40; viewGen = viewGen + 1; }
  BV[1] = 0;
  if (menuOn == 1 && helpOn == 0) { BV[1] = 1; }
  BV[2] = 1 - helpOn;
  BS[5] = panMode; BS[6] = spin; BS[7] = two; BS[8] = upZ;
  BS[9] = 0;
  if (colMode > 0) { BS[9] = 1; }
  statN = statN + 1;
  if (statN >= 10 || ldOn > 0) { statN = 0; showStatus(); }
}

// Which engine this is. tessvm's project timer counts its ticks (60 to a second, however
// long they took); plain Entry's reads the clock. So a timer that stands at a whole
// number of sixtieths twelve frames running is tessvm's.
function probe() {
  let t = timer() * 60;
  prN = prN + 1;
  if (t > 0.5 && Math.abs(t - Math.round(t)) < 0.0005) { prHit = prHit + 1; }
  if (prN == 12) {
    isTess = 0;
    // (tessvm runs the blocks some fifty times faster: it starts with more room)
    if (prHit >= 9) { isTess = 1; cap = 40000; capR = 40000; }
  }
}

// The pace. `cap` is how much one frame may work (a vertex counts 1, a face 2 or 3).
// Once a second: the frames there were in that second and the work they did say how much
// work fits in a frame of the wanted length. (Seconds of the clock, for the reason above.)
// The wanted length: plain Entry shows every frame, and 12 a second is the aim (a model of
// some hundreds of faces is what it can turn at that pace). tessvm
// runs up to four late ticks before it shows a picture, so there a tick must not be late
// at all: 60 a second.
function pace() {
  let sec = dateSec(), nw = 0, tg = 12;
  fpsN = fpsN + 1;
  if (busy == 1) { busyN = busyN + 1; workSum = workSum + work; }
  if (busy == 2) { loadN = loadN + 1; }
  if (busy == 3) { refN = refN + 1; workR = workR + work; }
  busy = 0; work = 0;
  if (prN < 12) { probe(); }
  if (sec != fpsSec) {
    fpsSec = sec;
    if (fpsSkip == 0) {
      fpsNow = fpsN;
      // (reading: as many words a frame as leave about ten frames a second)
      if (loadN * 2 >= fpsN && ldOn == 1) {
        if (fpsN >= 20) { tokCap = tokCap * 2; }
        if (fpsN < 8) { tokCap = Math.round(tokCap * fpsN / 10) + 100; }
        if (tokCap > 400000) { tokCap = 400000; }
      }
      if (busyN * 2 >= fpsN && busyN > 0) {
        capAge = capAge + 1;
        if (capAge > 30) { capFail = 0; }
        if (fpsN >= 57) {
          // every frame was in time: more (but not past what a slow second showed to be the most)
          nw = cap * 3;
          if (capFail > 0 && nw > capFail) { nw = capFail; }
          if (nw > cap) { cap = Math.round(nw); }
        } else {
          // the work this second did, as so much a frame at the wanted number of frames;
          // a little over that is the most there is room for (capFail), for half a minute
          if (isTess == 1) { tg = 72; }
          nw = workSum / busyN * fpsN / tg;
          if (nw < cap * 0.87) { capFail = nw * 1.15; capAge = 0; cap = Math.round(nw); }
          if (nw > cap * 1.15) {
            if (capFail > 0 && nw > capFail) { nw = capFail; }
            if (nw > cap) { cap = Math.round(nw); }
          }
        }
        if (cap > 600000) { cap = 600000; }
        if (cap < 300) { cap = 300; }
      }
      // (painting the model itself at rest has a pace of its own: its frames are other work -
      // in plain Entry with pen edges, and with all that is painted so far shown again each frame)
      if (refN * 2 >= fpsN && refN > 0) {
        if (fpsN >= 57) { capR = capR * 3; }
        else {
          // (in plain Entry few and long frames: every frame shows all that is painted so far
          // again, and that is the greater part of a frame once much is painted)
          tg = 5;
          if (isTess == 1) { tg = 72; }
          capR = Math.round(workR / refN * fpsN / tg);
        }
        if (capR > 600000) { capR = 600000; }
        if (capR < 300) { capR = 300; }
      }
    }
    fpsSkip = 0; fpsN = 0; busyN = 0; loadN = 0; workSum = 0; refN = 0; workR = 0;
  }
}

const HELP = '엔트리 OBJ 렌더러          (아무 데나 누르면 닫힙니다)\n열기   OBJ 파일을 메모장 등으로 열어 전체 복사(Ctrl+A, Ctrl+C)한 뒤\n       입력창에 붙여넣고(Ctrl+V) Enter.  .mtl 파일도 같은 방법으로\n       넣으면 재질 색이 입혀집니다 (OBJ 앞이든 뒤든).\n예제   들어 있는 모델 차례로\n\n끌기   돌리기          ＋ －   확대 / 축소 (누르고 있기)\n이동   켜면 끌기가 옮기기로          돌기   저절로 돌리기\n양면   양면 ↔ 앞면만 (처음에는 모델을 보고 고릅니다).  구멍이 뚫려 보이면 양면,\n       방처럼 속을 들여다볼 모델은 앞면만\n축     위쪽이 y인 모델 / z인 모델\n색     재질 색 → 찰흙색 → 하늘색          처음   처음 보기\n≡      단추 줄 숨기기\n\n움직이는 동안은 성긴 모델을 그리고, 멈추면 원래 모델을 뒤에서부터 칠합니다.\n키보드: O 열기, N 예제, 방향키 돌리기, X Z 확대·축소, P 이동, T 돌기,\n        C 양면, U 축, M 색, R 처음, H 도움말';

on('start', 'pen', function () {
  let p = 1;
  hide();
  timerStart();
  hideAnswer();
  // (the pen's layer is made before the fill's, and so lies under it)
  penColorHex(BGCOL);
  btnInit();
  background();
  if (nLv > 0) {
    // a model came inside the work (the page that puts one in leaves it read and made
    // ready): only the lists the renderer writes in are still to be made
    while (p <= NPT) {
      if (PNF[p] > 0) { pageOp(p, 6); }
      p = p + 1;
    }
    viewGen = viewGen + 1;
  } else {
    loadInit();
    if (TEST == 0) { nextExample(); } else { modelName = 'test'; loadBegin(TESTOBJ); }
  }
  ready = 1;
  for (;;) {
    if (ldOn > 0) { loadStep(); busy = 2; }
    else {
      renderStep();
      if (TEST == 1 && done == 0 && shownLv == 1 && nLv > 0) { testOut(); done = 1; }
      if (TEST == 2 && done == 0 && shownLv == 1 && nLv > 0) { benchRun(); done = 1; }
    }
    pace();
  }
});

on('start', 'top', function () {
  let shown = '';
  for (;;) {
    if (ready == 1) {
      uiStep();
      if (wantAsk == 1) {
        wantAsk = 0;
        ask('OBJ 파일의 내용을 붙여넣고 Enter (빈 채로 Enter: 취소)');
        // (the press that closed the box, and the key that opened it, are not for the model)
        kLatch = 79; mWas = 1; uiHit = 1; btnKey = 0;
        if (strlen(answer()) > 0) { modelName = '붙여넣은 모델'; loadBegin(answer()); }
      }
      if (topText != shown) { shown = topText; write(shown); }
    }
  }
});

on('start', 'help', function () {
  let was = -1;
  write(HELP);
  for (;;) {
    if (helpOn != was) {
      was = helpOn;
      if (was == 1) { show(); } else { hide(); }
    }
  }
});

on('start', 'btn', function () {
  let k = 1;
  hide();
  for (;;) {
    if (ready == 1 && k == 1) {
      while (k <= BL.length) { cloneSelf(); k = k + 1; }
    }
  }
});
on('clone', 'btn', function () {
  btnBorn = btnBorn + 1;
  btn$k = btnBorn; btn$vis = -1; btn$st = 0;
  goto(BX[btn$k], BY[btn$k]);
  write(BL[btn$k]);
  for (;;) {
    if (BV[BG[btn$k]] != btn$vis) {
      btn$vis = BV[BG[btn$k]];
      if (btn$vis == 1) { show(); } else { hide(); }
    }
    if (BS[btn$k] != btn$st) {
      btn$st = BS[btn$k];
      if (btn$st == 1) { textColorHex('#ffd84a'); } else { textColorHex('#ffffff'); }
    }
  }
});

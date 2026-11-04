// ============================================================
// The loop, the pointer, the keys, the buttons, the panel
//
// The simulation goes on in steps; a frame (1 / FPS s of simulated time) is drawn when
// all its steps are done. Each tick of the engine does as many steps as fit in about a
// quarter of a second (plain Entry) or a sixtieth (tessvm), so the buttons and the
// camera answer while a slow frame is being worked out. The simulated time does not
// follow the clock: a frame is the same whatever it took to work it out.
// ============================================================
let BL = [' ◀ ', ' ▶ ', '정확', '빠름', '잡기', '멈춤', '한 장', '처음', '색', ' ？ '];
let TBK = [37, 39, 49, 50, 71, 32, 83, 82, 67, 72];
let BX = [], BY = [], BS = [], BV = [0];
let mode = MODE0, running = 1, oneFrame = 0, frameDone = 0, ready = 0, helpOn = 0, btnBorn = 0, done = 0;
let btn$k = 0, btn$vis = -1, btn$st = 0;
let mWas = 0, mLX = 0, mLY = 0, uiHit = 0, kLatch = 0, topText = ' ', tLast = 0, vth = 0.01;
let tickN = 0, tickSec = -1, tps = 0, stepsTick = 1, prN = 0, prHit = 0, workTicks = 0, fWall = 0, fWallLast = 0, fShown = 0;
let TIPL = [], OUT = [];

function btnInit() {
  let k = 1;
  while (k <= BL.length) { BX.push(-216 + (k - 1) * 48); BY.push(-125); BS.push(0); k = k + 1; }
}

// what a key (or its button) does
function keyAct(kn) {
  if (kn == 72) { helpOn = 1 - helpOn; }
  else {
    if (kn == 37) { k = scene - 1; if (k < 1) { k = SCN.length; } sceneLoad(k); }
    if (kn == 39) { k = scene + 1; if (k > SCN.length) { k = 1; } sceneLoad(k); }
    if (kn == 49) { setMode(1); }
    if (kn == 50) { setMode(2); }
    if (kn == 77) { setMode(3 - mode); }
    if (kn == 32) { running = 1 - running; oneFrame = 0; }
    if (kn == 83) { running = 0; oneFrame = 1; }
    if (kn == 82) { sceneLoad(scene); }
    if (kn == 67) { colMode = 1 - colMode; eMax = 0; viewGen = viewGen + 1; }
    if (kn == 71) { grabOn = 1 - grabOn; grabN = 0; }
  }
}
let k = 0;
// change the mode in the middle of things: the state goes on as it is
function setMode(m) {
  if (m != mode) {
    mode = m;
    stepInFrame = 0;
    nP = 0;
    stepPlan();
    // (the explicit steps start from the forces at the place it is)
    if ((mode == 1 || fastExpl == 1) && nN > 0) { softForces(); softContacts(stepH); softSoft(stepH); grabForces(stepH); }
    stepsTick = 1;
  }
}

function uiPress(mx, my) {
  uiHit = 0;
  if (helpOn == 1) { helpOn = 0; uiHit = 1; }
  else {
    if (my < -113) {
      uiHit = 1;
      k = Math.floor((mx + 240) / 48) + 1;
      if (k >= 1 && k <= BL.length) { keyAct(TBK[k]); }
    } else {
      // grabbing: a press near a soft body takes hold of it (elsewhere it turns the view)
      if (grabOn == 1) {
        grabPick(mx, my);
        if (grabN > 0) { uiHit = 2; viewGen = viewGen + 1; }
      }
    }
  }
}

function uiStep() {
  let kn = 0, mx = mouseX(), my = mouseY(), md = 0, now = timer(), dt = 0;
  dt = now - tLast; tLast = now;
  if (dt > 0.3) { dt = 0.3; }
  if (dt < 0) { dt = 0; }
  if (mouseDown()) { md = 1; }
  if (md == 1 && mWas == 0) { uiPress(mx, my); }
  if (md == 1 && uiHit == 2) {
    if (mx != grabSX || my != grabSY) { grabSX = mx; grabSY = my; viewGen = viewGen + 1; }
  }
  if (md == 0 && grabN > 0) { grabN = 0; viewGen = viewGen + 1; }
  if (md == 1 && mWas == 1 && uiHit == 0) {
    if (mx != mLX || my != mLY) {
      az = az - (mx - mLX) * 0.5;
      el = el - (my - mLY) * 0.5;
      if (el > 89) { el = 89; }
      if (el < -10) { el = -10; }
      viewGen = viewGen + 1;
    }
  }
  mWas = md; mLX = mx; mLY = my;
  if (key(77)) { kn = 77; }
  if (key(32)) { kn = 32; }
  if (key(83)) { kn = 83; }
  if (key(82)) { kn = 82; }
  if (key(67)) { kn = 67; }
  if (key(71)) { kn = 71; }
  if (key(72)) { kn = 72; }
  if (key(78)) { kn = 39; }
  if (key(66)) { kn = 37; }
  if (key(49)) { kn = 49; }
  if (key(50)) { kn = 50; }
  if (kn != kLatch) {
    kLatch = kn;
    if (kn > 0) { keyAct(kn); }
  }
  if (key(88)) { camD = camD / (1 + dt * 1.2); viewGen = viewGen + 1; }
  if (key(90)) { camD = camD * (1 + dt * 1.2); viewGen = viewGen + 1; }
  if (key(37)) { az = az + dt * 60; viewGen = viewGen + 1; }
  if (key(39)) { az = az - dt * 60; viewGen = viewGen + 1; }
  if (key(38)) { el = el + dt * 40; if (el > 89) { el = 89; } viewGen = viewGen + 1; }
  if (key(40)) { el = el - dt * 40; if (el < -10) { el = -10; } viewGen = viewGen + 1; }
  BV[1] = 1 - helpOn;
  BS[3] = 0; BS[4] = 0;
  if (mode == 1) { BS[3] = 1; } else { BS[4] = 1; }
  BS[5] = grabOn; BS[6] = 1 - running; BS[9] = colMode;
}

function fmt(x, d) {
  let p = 1;
  for (const _ of rep(d)) { p = p * 10; }
  return Math.round(x * p) / p;
}
// a number in four figures or so, small ones in powers of ten
function sci(x) {
  let e = 0, a = Math.abs(x), s = ' ';
  if (a == 0) { s = '0'; }
  else {
    if (a >= 0.001 && a < 100000) { s = str(fmt(x, 4 - Math.floor(Math.log(a) / Math.log(10)) - 1)); }
    else {
      e = Math.floor(Math.log(a) / Math.log(10));
      s = str(fmt(x / pow10(e), 2), 'e', e);
    }
  }
  return s;
}

function pow10(e) {
  let p = 1;
  if (e > 0) { for (const _ of rep(e)) { p = p * 10; } } else { for (const _ of rep(0 - e)) { p = p / 10; } }
  return p;
}

function showPanel() {
  let s = ' ', m = '정확: 유한요소 + Verlet, 강체 RK4', de = 0;
  if (mode == 2) { m = '빠름: 단단한 연체는 θ법 + 공회전 유한요소, 강체 RK4'; if (fastExpl == 1) { m = '빠름: 젤리는 Verlet, 강체는 접촉 10번·간격 그대로'; } }
  de = 0;
  if (Math.abs(mE0) > 0.000001) { de = (eTot - mE0) / Math.abs(mE0) * 100; }
  s = `${SCN[scene]}   ·   ${m}`;
  if (running == 0) { s = `${s}   ·   멈춤`; }
  s = `${s}\nt ${fmt(simT, 3)} s   ·   간격 ${sci(stepH * 1000)} ms × ${stepsFrame} = 한 장 1/${FPS} s   ·   한 장 계산 ${fmt(fShown, 2)} s`;
  if (stepInFrame > 0) { s = `${s} (지금 ${Math.round(stepInFrame / stepsFrame * 100)}%)`; }
  s = `${s}\n에너지 ${sci(eTot)} J (운동 ${sci(eKin)}, 위치 ${sci(ePot)}, 탄성 ${sci(eElastic)})   처음과 차이 ${fmt(de, 3)}%`;
  sceneText();
  s = `${s}\n${mText}`;
  topText = s;
}

// what each scene shows of its own
function sceneText() {
  let y = 0, i = 1;
  mText = `연체 ${nSB}개 · 사면체 ${nT} · 마디 ${nN} · 강체 ${nR - 1}개 · 연체끼리 닿은 마디 ${nSS} · 강체 접촉 ${nC}`;
  if (scene == 6 || grabOn == 1) {
    if (grabOn == 1) { mText = `잡기: 젤리를 눌러 끌기 (잡은 마디 ${grabN}) · ${mText}`; }
  }
  if (scene == 11) { mText = `막대 끝: 처음 가장 많이 ${fmt((mY0 - mA) * 1000, 2)} mm, ${fmt(mT0, 4)} s, 지금 ${fmt((mY0 - PY[SBN1[1]]) * 1000, 2)} mm`; }
  if (scene == 12) { mText = `뒤집힘 ${mB}번: ${fmt(mT0, 4)} s, ${fmt(mT1, 4)} s, 에너지 ${eTot}`; }
  if (scene == 13) { mText = `미끄러진 거리 ${fmt(mA, 4)} m, ${fmt(mT0, 4)} s, 가속도 ${fmt(2 * mA / (mT0 * mT0), 4)}`; }
  if (scene == 7) {
    for (const _ of rep(TIPL.length)) { y = y + PY[TIPL[i]]; i = i + 1; }
    y = mY0 - y / TIPL.length;
    mText = `끝 처짐 ${fmt(y * 100, 2)} cm · 보 이론(전단 포함) ${fmt(BEAMD * 100, 2)} cm · 비 ${fmt(y / BEAMD, 3)} · 단면 2×2칸의 1차 사면체는 굽힘에 뻣뻣함(4×4칸이면 0.85)`;
  }
}

// which engine: tessvm's timer counts ticks (60 a second), plain Entry's reads the clock
function probe() {
  let t = timer() * 60;
  prN = prN + 1;
  if (t > 0.5 && Math.abs(t - Math.round(t)) < 0.0005) { prHit = prHit + 1; }
  if (prN == 12) { isTess = 0; if (prHit >= 9) { isTess = 1; } }
}
// the steps of a tick: ticks counted each second of the clock, so that a tick is about
// as long as wanted
function pace() {
  let sec = dateSec(), tg = 4;
  tickN = tickN + 1;
  if (prN < 12) { probe(); }
  if (sec != tickSec) {
    tickSec = sec;
    tps = tickN;
    if (isTess == 1) { tg = 40; }
    if (workTicks * 2 >= tickN && workTicks > 0) {
      if (tickN > tg * 1.25) { stepsTick = Math.ceil(stepsTick * Math.min(2, tickN / tg)); }
      if (tickN < tg * 0.8) { stepsTick = Math.floor(stepsTick * tickN / tg); }
      if (stepsTick < 1) { stepsTick = 1; }
      if (stepsTick > 5000) { stepsTick = 5000; }
    }
    tickN = 0; workTicks = 0;
  }
}

// the steps of one tick (a frame that is done stops the tick: it is drawn)
function work() {
  let n = stepsTick;
  workTicks = workTicks + 1;
  if (stepInFrame == 0) { stepPlan(); }
  while (n > 0) {
    stepAll();
    stepInFrame = stepInFrame + 1;
    n = n - 1;
    if (stepInFrame >= stepsFrame) {
      stepInFrame = 0;
      frameN = frameN + 1;
      frameDone = 1;
      n = 0;
      if (oneFrame == 1) { oneFrame = 0; }
    }
  }
}

const HELP = '엔트리 3D 물리 시뮬레이터                              (아무 데나 누르면 닫힙니다)\n\n◀ ▶    장면 바꾸기 (키 B N)\n정확   연체: 사면체 유한요소, Stable Neo-Hookean 재료, Verlet 적분, 간격은 메시의\n       안정 한계의 0.5배라 에너지가 보존됨. 강체: 6자유도, 방향 RK4, 젤리 가까이에선\n       1/1000 s, 접촉 충격량 최대 40번 (키 1)\n빠름   젤리처럼 무른 연체는 같은 Verlet(이쪽이 더 빠르고 확실함), 강체는 충격량 10번에\n       간격을 줄이지 않음. 단단한 연체(외팔보)는 θ법 + 공회전 유한요소로 한 장에 한 걸음:\n       멈춘 모양은 정확, 움직임은 빨리 잦아듦 (키 2).  M: 두 모드 바꾸기\n잡기   켜고 젤리를 눌러 끌면 잡아당깁니다. 놓으면 던져집니다 (G)\n멈춤   멈춤 / 계속 (Space)       한 장   한 장만 계산 (S)\n처음   장면 처음부터 (R)         색     연체를 탄성 에너지 밀도로 칠하기 (C)\n끌기·방향키   돌려 보기          X Z   가까이 / 멀리\n\n시간은 계산된 만큼만 흐릅니다(한 장 = 1/30 s). 순정 엔트리에서는 한 장에 몇 초씩\n걸리지만 결과는 같고, tessvm에서는 수십 배 빠릅니다.';

on('start', 'pen', function () {
  hide();
  timerStart();
  // (the pen's layer is made before the fill's, and so lies under it)
  penColorHex(BGCOL);
  allocAll();
  btnInit();
  sceneLoad(START);
  ready = 1;
  render();
  showPanel();
  for (;;) {
    if (running == 1 || oneFrame == 1) { work(); }
    if (frameDone == 1) {
      frameDone = 0;
      fWall = timer();
      fShown = fWall - fWallLast;
      fWallLast = fWall;
      energy();
      viewGen = viewGen + 1;
    }
    if (viewGen != shownGen) { render(); }
    if (TEST > 0 && done == 0) { testStep(); }
    showPanel();
    pace();
  }
});

on('start', 'top', function () {
  let shown = '';
  for (;;) {
    if (ready == 1) {
      uiStep();
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
    if (BV[1] != btn$vis) {
      btn$vis = BV[1];
      if (btn$vis == 1) { show(); } else { hide(); }
    }
    if (BS[btn$k] != btn$st) {
      btn$st = BS[btn$k];
      if (btn$st == 1) { textColorHex('#ffd84a'); } else { textColorHex('#ffffff'); }
    }
  }
});

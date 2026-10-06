// ============================================================
// Controls, the read-out, the axes, the pace
// ============================================================
const LN10 = 2.302585092994046;
const ZOOM_MIN = 1e-12, ZOOM_MAX = 1e6;

let fsrc = '', errText = '', errT = 0, fs = '', fc = '';
let topText = ' ', botText = ' ', helpOn = 0, hudOn = 1, axesOn = 1, wantAsk = 0;
let kLatch = 0, mWas = 0, mX0 = 0, mY0 = 0, cX0 = 0, cY0 = 0, pmx = 9999, pmy = 9999, pGen = 0, pDone = -1;
let fpsN = 0, fpsSec = -1, fpsSkip = 1, bFail = 0, pnWas = -1;
let axGen = 0, axOn = -1, tickU = 1;
let frames = 0;

let EX = ['(z^2-1)(z-2-i)^2/(z^2+2+2i)', 'z', 'z^3-1', '(z-1)/(z+1)', 'e^(1/z)', 'sin(z)', 'sqrt(z^2-1)', 'ln(z)', 'tan(z)', 'z^(1+i)'];
let ERRM = ['모르는 글자가 있습니다', '모르는 이름입니다', '함수 이름 뒤에는 ( 가 와야 합니다', '식이 맞지 않습니다', '상수가 너무 많습니다', '식이 너무 깊습니다', '괄호가 맞지 않습니다', '숫자가 잘못됐습니다', '식이 비었습니다', '식이 너무 깁니다'];

// 10^k for a whole k
function M_pow10(res, k) {
  res = 1;
  pk_ = Math.abs(k);
  pb_ = 10;
  while (pk_ > 0) {
    if (mod(pk_, 2) == 1) { res = res * pb_; }
    pb_ = pb_ * pb_;
    pk_ = idiv(pk_, 2);
  }
  if (k < 0) { res = 1 / res; }
}

// a number in about five digits -> fs
function fmt(v) {
  let a = Math.abs(v), e = 0, p = 0, r = 0;
  if (a > 0 && a < INF) {
    e = Math.floor(Math.log(a) / LN10);
    if (e >= -3 && e <= 5) {
      // 4 digits after the first one
      if (e >= 4) { r = Math.round(a); }
      else { M_pow10(p, 4 - e); r = Math.round(a * p) / p; }
      fs = `${r}`;
    } else {
      if (e > 300) { e = e - 20; M_pow10(p, e); a = a / p; a = a / 1e20; e = e + 20; }
      else { if (e < -300) { e = e + 20; M_pow10(p, 0 - e); a = a * p; a = a * 1e20; e = e - 20; } else { M_pow10(p, Math.abs(e)); if (e > 0) { a = a / p; } else { a = a * p; } } }
      // (the logarithm may be off by one right at a power of ten)
      if (a >= 10) { a = a / 10; e = e + 1; }
      if (a < 1) { a = a * 10; e = e - 1; }
      r = Math.round(a * 10000) / 10000;
      if (r >= 10) { r = 1; e = e + 1; }
      fs = `${r}e${e}`;
    }
    if (v < 0) { fs = `-${fs}`; }
  } else {
    if (a == 0) { fs = '0'; } else { if (a >= INF) { if (v < 0) { fs = '-∞'; } else { fs = '∞'; } } else { fs = '?'; } }
  }
}
// a complex number -> fc
function fmtc(re, im) {
  let a = ' ';
  if (im == 0) { fmt(re); fc = fs; }
  else {
    if (re == 0) { fmt(im); fc = `${fs}i`; }
    else {
      fmt(re); a = fs;
      fmt(Math.abs(im));
      if (im < 0) { fc = `${a} - ${fs}i`; } else { fc = `${a} + ${fs}i`; }
    }
  }
}

function setFormula(t) {
  src = t;
  compile();
  if (cerr == 0) {
    fsrc = t; errText = ''; vgen = vgen + 1;
    // a longer program: fewer cells per frame (and what was too much before says nothing now)
    if (pnWas >= 0) { budget = Math.floor(budget * (pnWas + 4) / (pn + 4)); if (budget < 24) { budget = 24; } }
    pnWas = pn; bFail = 0;
  }
  else {
    errText = `${ERRM[cerr]} (${cpos}번째 글자): ${t}`;
    errT = 240;
    src = fsrc;
    compile();
  }
  showTop();
}
function showTop() {
  if (errT > 0) { topText = errText; }
  else {
    if (usesZ == 1) { if (hiq == 1) { topText = `f(z) = ${fsrc}   [Q]`; } else { topText = `f(z) = ${fsrc}`; } }
    else {
      // no z: a calculator
      VR[1] = 0; VI[1] = 0;
      runProg(1);
      fmtc(VR[resOff + 1], VI[resOff + 1]);
      topText = `${fsrc} = ${fc}`;
    }
  }
}

// the value under the pointer -> botText
function probe(mx, my) {
  let zx = vcx + mx * vupp, zy = vcy + my * vupp, re = 0, im = 0, m = 0, a = 0, zt = ' ', ft = ' ';
  VR[1] = zx; VI[1] = zy;
  runProg(1);
  re = VR[resOff + 1]; im = VI[resOff + 1];
  fmtc(zx, zy); zt = fc;
  fmtc(re, im); ft = fc;
  M_hyp(m, re, im);
  M_arg(a, re, im);
  fmt(m); zt = `z = ${zt}   f(z) = ${ft}   |f| = ${fs}   arg = ${Math.round(a * R2D)}°`;
  tickUnit();
  fmt(tickU);
  botText = `${zt}   눈금 ${fs}`;
}

// ---------------- the pace ----------------
// `budget` cells are worked per frame. Once a second the number of frames in that second says
// whether that was too much. (The only clock both engines keep in real time is the second of
// the day: tessvm's project timer counts ticks.) A budget that proved too much is remembered,
// and growing stops half-way to it.
function paceGrow(f) {
  let nb = Math.floor(budget * f);
  if (bFail > 0 && nb >= bFail) { nb = Math.floor((budget + bFail) / 2); }
  if (nb > budget * 1.1) { budget = nb; paceKnown = 0; }
}
function pace() {
  fpsN = fpsN + 1;
  let sec = dateSec();
  if (sec != fpsSec) {
    fpsSec = sec;
    if (fpsSkip > 0) { fpsSkip = fpsSkip - 1; }
    else {
      fpsNow = fpsN;
      // (a second in which the pen used its whole share in most frames - an idle one says nothing)
      if (workN * 2 >= fpsN) {
        paceKnown = 1;
        if (budget < 300) {
          // a slow machine (plain Entry): frames of 50 ms get more done in a second than short ones
          if (fpsN >= 57) { paceGrow(4); }
          else {
            if (fpsN >= 24) { paceGrow(1.25); }
            // (not under 60: once the stage holds many strokes its redrawing is most of a frame, and
            // less work per frame would only make the picture later)
            if (fpsN < 17) { bFail = budget; budget = Math.floor(budget * fpsN / 20); if (budget < 60) { budget = 60; } }
          }
        } else {
          // a fast one (tessvm runs late ticks in a bunch, so a tick has to fit in a frame)
          if (fpsN >= 57) { paceGrow(4); }
          else {
            // a frame took 1000/fpsN ms: the share that would have fitted in 14 ms
            if (fpsN < 50) { bFail = budget; budget = Math.floor(budget * fpsN / 71); }
          }
        }
      }
      if (budget > 300000) { budget = 300000; }
      if (budget < 24) { budget = 24; }
    }
    fpsN = 0; workN = 0;
  }
}

function zoomBy(f, mx, my) {
  let nu = vupp * f;
  if (nu >= ZOOM_MIN && nu <= ZOOM_MAX) {
    // the point under the pointer stays where it is
    vcx = vcx + mx * (vupp - nu);
    vcy = vcy + my * (vupp - nu);
    vupp = nu;
    vgen = vgen + 1;
  }
}

function uiStep() {
  let kn = 0, mx = mouseX(), my = mouseY(), md = 0, mv = 0;
  frames = frames + 1;
  fDone = 0;
  pace();
  if (key(13)) { kn = 13; }
  if (key(48)) { kn = 48; }
  if (key(49)) { kn = 49; }
  if (key(50)) { kn = 50; }
  if (key(51)) { kn = 51; }
  if (key(52)) { kn = 52; }
  if (key(53)) { kn = 53; }
  if (key(54)) { kn = 54; }
  if (key(55)) { kn = 55; }
  if (key(56)) { kn = 56; }
  if (key(57)) { kn = 57; }
  if (key(82)) { kn = 82; }
  if (key(67)) { kn = 67; }
  if (key(65)) { kn = 65; }
  if (key(72)) { kn = 72; }
  if (key(81)) { kn = 81; }
  if (key(90) || key(187) || key(107)) { kn = 90; }
  if (key(88) || key(189) || key(109)) { kn = 88; }
  if (kn != kLatch) {
    kLatch = kn;
    if (kn > 0 && helpOn == 1 && kn != 72) { helpOn = 0; }
    if (kn == 13) { wantAsk = 1; }
    if (kn >= 49 && kn <= 57) { errT = 0; setFormula(EX[kn - 48]); }
    if (kn == 48) { errT = 0; setFormula(EX[10]); }
    if (kn == 82) { vcx = 0; vcy = 0; vupp = 0.015625; vgen = vgen + 1; }
    if (kn == 67) { cmode = mod(cmode + 1, 4); vgen = vgen + 1; }
    if (kn == 65) { axesOn = 1 - axesOn; }
    if (kn == 72) { helpOn = 1 - helpOn; }
    if (kn == 81) { hiq = 1 - hiq; vgen = vgen + 1; showTop(); }
    if (kn == 90) { zoomBy(0.5, mx, my); }
    if (kn == 88) { zoomBy(2, mx, my); }
  }
  // the arrow keys move the view while held
  mv = 0;
  if (key(37)) { vcx = vcx - 6 * vupp; mv = 1; }
  if (key(39)) { vcx = vcx + 6 * vupp; mv = 1; }
  if (key(38)) { vcy = vcy + 6 * vupp; mv = 1; }
  if (key(40)) { vcy = vcy - 6 * vupp; mv = 1; }
  if (mv == 1) { vgen = vgen + 1; }
  // dragging moves it too
  if (mouseDown()) { md = 1; }
  if (md == 1) {
    if (mWas == 0) { mX0 = mx; mY0 = my; cX0 = vcx; cY0 = vcy; }
    else {
      if (mx != pmx || my != pmy) {
        vcx = cX0 - (mx - mX0) * vupp;
        vcy = cY0 - (my - mY0) * vupp;
        vgen = vgen + 1;
      }
    }
  }
  mWas = md;
  // the read-out: when the pointer or the picture changed
  if (errT > 0) { errT = errT - 1; if (errT == 0) { showTop(); } }
  if (mx != pmx || my != pmy || vgen != pGen || rState != pDone) {
    pmx = mx; pmy = my; pGen = vgen; pDone = rState;
    probe(mx, my);
  }
}

// ---------------- the axes ----------------
// a tick every 1, 2 or 5 times a power of ten, at least 44 units apart -> tickU
function tickUnit() {
  let t = 44 * vupp, u = 0;
  M_pow10(u, Math.floor(Math.log(t) / LN10));
  if (u < t) { u = u * 2; }
  if (u < t) { u = u * 2.5; }
  if (u < t) { u = u * 2; }
  tickU = u;
}
function M_line(xa, ya, xb, yb) {
  goto(xa, ya); penDown(); goto(xb, yb); penUp();
}
function drawAxes() {
  let ax = (0 - vcx) / vupp, ay = (0 - vcy) / vupp, u = 0, t = 0, k = 0, k1 = 0;
  eraseAll();
  if (axesOn == 1) {
    tickUnit();
    u = tickU;
    penAlpha(45);
    penColor('#000000');
    penSize(1);
    if (ay > -135 && ay < 135) {
      M_line(-240, ay, 240, ay);
      k = Math.ceil((vcx - 240 * vupp) / u);
      k1 = Math.floor((vcx + 240 * vupp) / u);
      while (k <= k1) {
        t = (k * u - vcx) / vupp;
        M_line(t, ay - 3, t, ay + 3);
        k = k + 1;
      }
    }
    if (ax > -240 && ax < 240) {
      M_line(ax, -135, ax, 135);
      k = Math.ceil((vcy - 135 * vupp) / u);
      k1 = Math.floor((vcy + 135 * vupp) / u);
      while (k <= k1) {
        t = (k * u - vcy) / vupp;
        M_line(ax - 3, t, ax + 3, t);
        k = k + 1;
      }
    }
  }
}

const HELP = '엔트리 복소함수 그래퍼\n\nEnter   식 입력   예) (z^2-1)/(z^2+1)   e^(1/z)   sin(z)\n1 ~ 9, 0   예제\n끌기, 방향키   이동\nZ / X  (+ / -)   확대 / 축소 (마우스 위치로)\nR 처음 보기    C 색 방식    A 좌표축    Q 한 단계 더 곱게\nH   이 도움말 (아무 키나 누르면 닫힘)\n\n색 = f(z)의 방향: 빨강 +, 청록 -, 연두 +i, 보라 -i\n밝기 고리 = |f|가 2배 될 때마다. 검정 0, 흰색 ∞\nz가 없는 식은 값을 계산합니다.  예) (1+2i)^(3-i)';

on('start', 'top', function () {
  let shown = '';
  vmInit();
  compInit();
  extInit();
  setFormula(EX[1]);
  if (BENCH == 1) { benchRun(); done = 1; }
  if (BENCH == 2) { selfTest(); done = 1; }
  if (BENCH == 0) { ready = 1; helpOn = 1; }
  for (;;) {
    uiStep();
    if (wantAsk == 1) {
      wantAsk = 0;
      ask('f(z) = ?');
      kLatch = 13;
      if (strlen(answer()) > 0) { errT = 0; setFormula(answer()); }
    }
    if (topText != shown) { shown = topText; write(shown); }
  }
});

on('start', 'bot', function () {
  let shown = '';
  for (;;) {
    if (botText != shown) { shown = botText; write(shown); }
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

on('start', 'axes', function () {
  hide();
  for (;;) {
    if (ready == 1) {
      if (axGen != vgen || axOn != axesOn) { axGen = vgen; axOn = axesOn; drawAxes(); }
    }
  }
});

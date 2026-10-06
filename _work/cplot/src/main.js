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
let tPar = 0, playing = 1, tLast = 0, aRe = 1, aIm = 0, fmtD = 5;
let MKX = [], MKY = [], MKK = [];
let nwX = 0, nwY = 0, wn = 0;

let EX = ['(z^2-1)(z-2-i)^2/(z^2+2+2i)', 'z', 'z^3-1', '(z-1)/(z+1)', 'e^(1/z)', 'sin(z)', 'sqrt(z^2-1)', 'ln(z)', 'tan(z)', 'z^(1+i)',
  'gamma(z)', 'zeta(z)', 'zeta(1/2+iz)', '(z-a)/(1-conj(a)z)', 'z^2+a', 'z^3+e^(it)', 'sin(z+t)/z', '1/gamma(z)', 'e^z', '(z^5-1)/(z^5+1)'];
let exAt = 1;
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

// a number in fmtD digits -> fs
function fmt(v) {
  let a = Math.abs(v), e = 0, p = 0, r = 0;
  if (a > 0 && a < INF) {
    e = Math.floor(Math.log(a) / LN10);
    if (e >= -3 && e <= fmtD) {
      // fmtD - 1 digits after the first one
      if (e >= fmtD - 1) { r = Math.round(a); }
      else { M_pow10(p, fmtD - 1 - e); r = Math.round(a * p) / p; }
      fs = `${r}`;
    } else {
      if (e > 300) { e = e - 20; M_pow10(p, e); a = a / p; a = a / 1e20; e = e + 20; }
      else { if (e < -300) { e = e + 20; M_pow10(p, 0 - e); a = a * p; a = a * 1e20; e = e - 20; } else { M_pow10(p, Math.abs(e)); if (e > 0) { a = a / p; } else { a = a * p; } } }
      // (the logarithm may be off by one right at a power of ten)
      if (a >= 10) { a = a / 10; e = e + 1; }
      if (a < 1) { a = a * 10; e = e - 1; }
      M_pow10(p, fmtD - 1);
      r = Math.round(a * p) / p;
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
    if (re == 0) {
      fmt(im);
      if (fs == '1') { fc = 'i'; } else { if (fs == '-1') { fc = '-i'; } else { fc = `${fs}i`; } }
    } else {
      fmt(re); a = fs;
      fmt(Math.abs(im));
      if (fs == '1') { fs = 'i'; } else { fs = `${fs}i`; }
      if (im < 0) { fc = `${a} - ${fs}`; } else { fc = `${a} + ${fs}`; }
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
    while (MKX.length > 0) { MKX.removeAt(1); MKY.removeAt(1); MKK.removeAt(1); }
    axGen = 0;
  }
  else {
    errText = `${ERRM[cerr]} (${cpos}번째 글자): ${t}`;
    errT = 240;
    src = fsrc;
    compile();
  }
  showTop();
}
// the newest t and a into their cells
function setParams() {
  VR[PT_OFF + 1] = tPar; VR[PA_OFF + 1] = aRe; VI[PA_OFF + 1] = aIm;
}
function showTop() {
  if (errT > 0) { topText = errText; }
  else {
    if (usesZ == 1) { topText = `f(z) = ${fsrc}`; }
    else {
      // no z: a calculator
      setParams();
      VR[1] = 0; VI[1] = 0;
      runProg(1);
      fmtD = 10;
      fmtc(VR[resOff + 1], VI[resOff + 1]);
      fmtD = 5;
      topText = `${fsrc} = ${fc}`;
    }
    if (usesT == 1) {
      fmt(Math.round(tPar * 100) / 100);
      if (playing == 1) { topText = `${topText}   t = ${fs} ▶`; } else { topText = `${topText}   t = ${fs} ■`; }
    }
    if (usesA == 1) { fmtc(aRe, aIm); topText = `${topText}   a = ${fc}`; }
    if (hiq == 1) { topText = `${topText}   [Q]`; }
  }
}

// the value under the pointer -> botText
function probe(mx, my) {
  let zx = vcx + mx * vupp, zy = vcy + my * vupp, re = 0, im = 0, m = 0, a = 0, zt = ' ', ft = ' ';
  setParams();
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

// ---------------- zeros and poles ----------------
// The winding number of f on a circle of 16 points: zeros minus poles inside, counted with their order -> wn
function windAt(zx, zy, r) {
  let j = 1, ro = resOff, a = 0, a0 = 0, pa = 0, d = 0, s = 0, x = 0, y = 0;
  setParams();
  while (j <= 16) { VR[j] = zx + r * cosd(j * 22.5); VI[j] = zy + r * sind(j * 22.5); j = j + 1; }
  runProg(16);
  j = 1;
  while (j <= 16) {
    x = VR[ro + j]; y = VI[ro + j];
    M_arg(a, x, y);
    if (j == 1) { a0 = a; }
    else {
      d = a - pa;
      if (d > PI) { d = d - 2 * PI; }
      if (d <= 0 - PI) { d = d + 2 * PI; }
      s = s + d;
    }
    pa = a;
    j = j + 1;
  }
  d = a0 - pa;
  if (d > PI) { d = d - 2 * PI; }
  if (d <= 0 - PI) { d = d + 2 * PI; }
  wn = Math.round((s + d) / (2 * PI));
}
// Newton's method from (zx, zy) -> nwX, nwY. For a pole it is run on 1/f (which has a zero there).
// The derivative is the difference of the values at z + h and z - h; h shrinks with the steps,
// so it stays small beside the distance still to go.
function newton(zx, zy, pole) {
  let h0 = vupp * 0.001, h = 0, it = 0, go = 1, ro = resOff, st = 0, hm = 0;
  let fr = 0, fi = 0, ar = 0, ai = 0, br = 0, bi = 0, dr = 0, di = 0, sr = 0, si = 0;
  setParams();
  h = h0;
  while (go == 1) {
    VR[1] = zx; VI[1] = zy; VR[2] = zx + h; VI[2] = zy; VR[3] = zx - h; VI[3] = zy;
    runProg(3);
    fr = VR[ro + 1]; fi = VI[ro + 1]; ar = VR[ro + 2]; ai = VI[ro + 2]; br = VR[ro + 3]; bi = VI[ro + 3];
    if (pole == 1) {
      M_cdiv(sr, si, 1, 0, fr, fi); fr = sr; fi = si;
      M_cdiv(sr, si, 1, 0, ar, ai); ar = sr; ai = si;
      M_cdiv(sr, si, 1, 0, br, bi); br = sr; bi = si;
    }
    M_div(dr, ar - br, 2 * h);
    M_div(di, ai - bi, 2 * h);
    M_cdiv(sr, si, fr, fi, dr, di);
    zx = zx - sr; zy = zy - si;
    st = Math.abs(sr) + Math.abs(si);
    it = it + 1;
    hm = (Math.abs(zx) + Math.abs(zy) + 1) * 1e-9;
    if (st < hm * 1e-6 || it >= 80) { go = 0; }
    // (lost: far outside the picture)
    if (st > 1000 * 480 * vupp) { go = 0; }
    h = st * 0.1;
    if (h > h0) { h = h0; }
    if (h < hm) { h = hm; }
  }
  nwX = zx; nwY = zy;
}
// a click: the zero or pole near the pointed place, marked and named in the top label.
// Newton's method is run for a zero and for a pole; a result counts if a small circle around it
// winds the right way, and of two the nearer one is taken.
function findNear(zx, zy) {
  let k = 1, dup = 0, m = 0, bx = 0, by = 0, bw = 0, bd = 0, d = 0;
  newton(zx, zy, 0);
  windAt(nwX, nwY, 2 * vupp);
  if (wn > 0) { bw = wn; bx = nwX; by = nwY; bd = Math.abs(nwX - zx) + Math.abs(nwY - zy); }
  newton(zx, zy, 1);
  windAt(nwX, nwY, 2 * vupp);
  if (wn < 0) {
    d = Math.abs(nwX - zx) + Math.abs(nwY - zy);
    if (bw == 0 || d < bd) { bw = wn; bx = nwX; by = nwY; }
  }
  if (bw != 0) {
    // (digits past the fifteenth are noise: a part that small beside the other is 0)
    d = (Math.abs(bx) + Math.abs(by)) * 1e-12;
    if (Math.abs(bx) < d) { bx = 0; }
    if (Math.abs(by) < d) { by = 0; }
    fmtD = 10;
    fmtc(bx, by);
    fmtD = 5;
    m = Math.abs(bw);
    if (bw > 0) { errText = `영점 z = ${fc}`; } else { errText = `극 z = ${fc}`; }
    if (m > 1) { errText = `${errText}  (${m}겹)`; }
    while (k <= MKX.length) {
      if (Math.abs(MKX[k] - bx) + Math.abs(MKY[k] - by) < 2 * vupp) { dup = 1; }
      k = k + 1;
    }
    if (dup == 0 && MKX.length < 24) { MKX.push(bx); MKY.push(by); MKK.push(bw); }
    axGen = 0;
  } else { errText = '가까운 영점이나 극을 찾지 못했습니다'; }
  errT = 360;
  showTop();
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
  let kn = 0, mx = mouseX(), my = mouseY(), md = 0, mv = 0, now = timer(), dt = 0, nx = 0, ny = 0;
  frames = frames + 1;
  fDone = 0;
  pace();
  // t runs while the formula has it (the picture is then drawn over and over in its first pass)
  dt = now - tLast; tLast = now;
  if (dt > 0.1) { dt = 0.1; }
  if (dt < 0) { dt = 0; }
  if (usesT == 1 && playing == 1) { tPar = tPar + dt; vgen = vgen + 1; if (errT == 0) { showTop(); } }
  // a follows the pointer while S is held
  if (usesA == 1 && key(83)) {
    nx = vcx + mx * vupp; ny = vcy + my * vupp;
    if (nx != aRe || ny != aIm) { aRe = nx; aIm = ny; vgen = vgen + 1; if (errT == 0) { showTop(); } }
  }
  if (key(32)) { kn = 32; }
  if (key(190)) { kn = 190; }
  if (key(188)) { kn = 188; }
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
    if (kn >= 49 && kn <= 57) { exAt = kn - 48; errT = 0; setFormula(EX[exAt]); }
    if (kn == 48) { exAt = 10; errT = 0; setFormula(EX[10]); }
    // . and , step through all the examples
    if (kn == 190) { exAt = exAt + 1; if (exAt > EX.length) { exAt = 1; } errT = 0; setFormula(EX[exAt]); }
    if (kn == 188) { exAt = exAt - 1; if (exAt < 1) { exAt = EX.length; } errT = 0; setFormula(EX[exAt]); }
    if (kn == 32) { playing = 1 - playing; showTop(); }
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
  // a press let go where it began is a click: look for a zero or a pole there
  if (md == 0 && mWas == 1) {
    if (Math.abs(mx - mX0) + Math.abs(my - mY0) < 3) {
      if (vcx != cX0 || vcy != cY0) { vcx = cX0; vcy = cY0; vgen = vgen + 1; }
      if (usesZ == 1) { findNear(vcx + mx * vupp, vcy + my * vupp); }
    }
  }
  mWas = md;
  // the read-out: when the pointer or the picture changed
  if (errT > 0) { errT = errT - 1; if (errT == 0) { showTop(); } }
  if (usesZ == 0 && vgen != pGen && errT == 0) { showTop(); }
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
  // the zeros (a plus) and poles (a square) found by clicking: white on black
  penAlpha(0);
  k = 1;
  while (k <= MKX.length) {
    u = (MKX[k] - vcx) / vupp; t = (MKY[k] - vcy) / vupp;
    if (u > -236 && u < 236 && t > -131 && t < 131) {
      k1 = 1;
      while (k1 <= 2) {
        if (k1 == 1) { penColor('#000000'); penSize(3); } else { penColor('#ffffff'); penSize(1); }
        if (MKK[k] > 0) { M_line(u - 4, t, u + 4, t); M_line(u, t - 4, u, t + 4); }
        else { M_line(u - 3.5, t - 3, u + 3.5, t - 3); M_line(u - 3.5, t + 3, u + 3.5, t + 3); M_line(u - 3, t - 3, u - 3, t + 3); M_line(u + 3, t - 3, u + 3, t + 3); }
        k1 = k1 + 1;
      }
    }
    k = k + 1;
  }
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

const HELP = '엔트리 복소함수 그래퍼\n\nEnter   식 입력   예) (z^2-1)/(z^2+1)   e^(1/z)   zeta(z)\n1 ~ 9, 0   예제       . ,   다음 / 앞 예제 (20개)\n끌기, 방향키   이동        클릭   그 근처의 영점·극 찾기\nZ / X  (+ / -)   확대 / 축소 (마우스 위치로)\nR 처음 보기    C 색 방식    A 좌표축    Q 한 단계 더 곱게\n식에 t 가 있으면 시간이 흐릅니다 (스페이스: 멈춤)\n식에 a 가 있으면 S 를 누른 채 마우스로 a 를 옮깁니다\nH   이 도움말 (아무 키나 누르면 닫힘)\n\n색 = f(z)의 방향: 빨강 +, 청록 -, 연두 +i, 보라 -i\n밝기 고리 = |f|가 2배 될 때마다. 검정 0, 흰색 ∞\nz가 없는 식은 값을 계산합니다.  예) (1+2i)^(3-i)   zeta(2)';

on('start', 'top', function () {
  let shown = '';
  vmInit();
  compInit();
  extInit();
  timerStart();
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

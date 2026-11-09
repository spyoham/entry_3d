// ============================================================
// The examples, the pointer and the keys, the buttons, the loop
// ============================================================
let rig = 1, cmp = 0, playing = 1, preN = START, holdT = 0, tLast = 0, helpOn = 0, ready = 0, btnBorn = 0;
let topText = ' ', mWas = 0, mLX = 0, mLY = 0, dragK = 0, dragC = 0, dragI = 0, kLatch = 0;
let BL = [' ◀ ', ' ▶ ', '폰트', '평면', '이징◀', '이징▶', '축별', '키 2', '비교', '멈춤', '글자', ' ? '];
let BS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let BV = [0];
let btn$k = 0, btn$vis = -1, btn$st = 0, btn$txt = '';
let PN = ['지구 위의 비행: 측지선 이징', '돌리기: SO(3) 측지선과 오일러각', '곱 다양체: 인자마다 다른 이징', '가변 폰트: 7축을 그냥 보간', '쌍곡 공간 H²: 굵기와 너비', '구 S⁴: 네 축이 함께 도는 길', '원환 T²: 펜촉 각도와 색은 돈다', '벡터 이징: 축마다 다른 이징', '다양체 베지어: 키 네 개', '사용자 베지어 이징', '폰트 실험실', '3D 실험실'];
let PD = [
  '대원(측지선)을 따라 서울→뉴욕. 빨강: 위도·경도를 숫자로 보간(경도가 반대로 돈다)',
  '왼쪽 SO(3) 측지선, 오른쪽(빨강) 오일러각 보간. 백 이징은 측지선을 따라 넘쳤다 온다',
  '자리 사인, 방향 탄성, 크기 튕김, 색 선형. 색은 짧은 쪽(빨강 너머)으로 돈다',
  '일곱 축을 평면 ℝ⁷에서 그냥 보간(다양체 = 축 공간). 다른 예시의 기준',
  '두 키 모두 굵다. 쌍곡 측지선은 가운데(보통 굵기)로 휘고 아래 줄(평면)은 굵은 채로',
  '네 축을 S⁴의 입체 사영 지도로: 대원이라 축 공간에선 휜 길. 탄성은 대원 위에서 흔들림',
  '펜촉 각도·색은 주기 축: T²는 ±1을 넘어 짧은 쪽으로, 아래 줄(평면)은 먼 쪽으로',
  'Log_A B의 성분마다 다른 이징(굵기 튕김, 너비 탄성, 기울기 백, 각짐 원) 뒤 Exp_A',
  'S⁶ 위 키 A B C D의 3차 베지어(측지선 de Casteljau). 아래 줄은 평면 베지어',
  '그래프의 노란 손잡이를 끌어 cubic-bezier 바꾸기. 0~1 밖으로 끌면 넘친다',
  '키 슬라이더를 끌고, 축 이름을 눌러 M에 넣고 빼기. 오른쪽 아래 그림은 끌어 돌리기',
  '키 비행기를 끌면 돌리기(옮기기 단추: 자리), 빈 곳을 끌면 시점, SIZE·HUE 슬라이더'
];
let SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷'];
let MKO = ['평면', '구', '쌍곡', '원환'];
let MSY = ['ℝ', 'S', 'H', 'T'];

function setKey(k, a1, a2, a3, a4, a5, a6, a7) {
  let b = (k - 1) * 7;
  KEY[b + 1] = a1; KEY[b + 2] = a2; KEY[b + 3] = a3; KEY[b + 4] = a4; KEY[b + 5] = a5; KEY[b + 6] = a6; KEY[b + 7] = a7;
}
function setAct(a1, a2, a3, a4, a5, a6, a7) {
  ACT[1] = a1; ACT[2] = a2; ACT[3] = a3; ACT[4] = a4; ACT[5] = a5; ACT[6] = a6; ACT[7] = a7;
  countAct();
}
function setEax(a1, a2, a3, a4, a5, a6, a7) {
  EAX[1] = a1; EAX[2] = a2; EAX[3] = a3; EAX[4] = a4; EAX[5] = a5; EAX[6] = a6; EAX[7] = a7;
}
function set3(k, la, lo, hd, yw, pt, rl, sz, hu) {
  let P = (29 + k) * 10;
  if (posMode == 1) { setLL(29 + k, la, lo); } else { V[P + 1] = la; V[P + 2] = lo; V[P + 3] = 0; }
  setStand(k, hd, yw, pt, rl);
  K3[k * 2 - 1] = sz; K3[k * 2] = hu;
}

function preset(p) {
  preN = p; rev = 0; curT = 0; holdT = 0; playing = 1; perAx = 0; nKeys = 2; keyPage = 0; cmp = 0; vAz = 35; vEl = 24;
  BZ[1] = 0.2; BZ[2] = -0.35; BZ[3] = 0.3; BZ[4] = 1.45;
  setEax(4, 4, 4, 4, 4, 4, 4);
  EA3[1] = 4; EA3[2] = 4; EA3[3] = 4; EA3[4] = 4;
  if (p <= 3 || p == 12) {
    rig = 2; drag3 = 1; cAz = 25; cEl = 22; cD = 4.6;
    if (model != 1) { setModel(1); }
  } else { rig = 1; }
  if (p == 1) {
    posMode = 1; easeK = 4; cmp = 1; cAz = 206; cEl = 72;
    set3(1, 37.5, 127, 25, 0, 0, 0, 0, 0.55);
    set3(2, 40.7, -74, 150, 0, 0, 0, 0, -0.75);
  }
  if (p == 2) {
    posMode = 2; easeK = 10; cmp = 1; cAz = 0; cEl = 16; cD = 4.4;
    set3(1, 0, 0, 0, 0, 0, 0, 0, 0.35);
    set3(2, 0, 0, 0, 160, 70, -150, 0, 0.35);
  }
  if (p == 3) {
    posMode = 1; perAx = 1; easeK = 2; cAz = 148; cEl = 4;
    EA3[1] = 2; EA3[2] = 12; EA3[3] = 13; EA3[4] = 1;
    set3(1, -33.9, 151.2, 345, 0, 0, 0, -0.6, 0.85);
    set3(2, 35.7, 139.7, 340, 0, 0, 25, 0.7, -0.85);
  }
  if (p == 4) {
    fMt = 1; easeK = 4; setWord('EASING'); setAct(1, 1, 1, 1, 1, 1, 1);
    setKey(1, -0.9, -0.7, 0, -1, -1, 0.3, 0.1);
    setKey(2, 0.9, 0.8, 0.8, 1, 0.6, 0.3, 0.6);
  }
  if (p == 5) {
    fMt = 3; easeK = 2; cmp = 1; setWord('HYPERBOLIC'); setAct(1, 1, 0, 0, 0, 0, 0);
    setKey(1, 0.97, -0.97, 0, -0.6, -1, 0.3, -0.3);
    setKey(2, 0.97, 0.97, 0, -0.6, -1, 0.3, -0.3);
  }
  if (p == 6) {
    fMt = 2; easeK = 12; cmp = 1; setWord('SPHERE'); setAct(1, 1, 1, 1, 0, 0, 0);
    setKey(1, -0.8, 0.6, -0.7, -0.6, -0.2, 0.3, 0.75);
    setKey(2, 0.7, -0.5, 0.6, 0.9, -0.2, 0.3, 0.75);
  }
  if (p == 7) {
    fMt = 4; easeK = 4; cmp = 1; setWord('TORUS'); setAct(0, 0, 0, 0, 0, 1, 1);
    setKey(1, 0.5, 0.2, 0, -0.4, 0.95, -0.8, 0.82);
    setKey(2, 0.5, 0.2, 0, -0.4, 0.95, 0.8, -0.82);
  }
  if (p == 8) {
    fMt = 3; easeK = 4; perAx = 1; setWord('VECTOR'); setAct(1, 1, 1, 1, 0, 0, 0);
    setEax(13, 12, 11, 7, 4, 4, 1);
    setKey(1, -0.8, -0.6, -0.8, -1, -0.6, 0.3, -0.1);
    setKey(2, 0.8, 0.7, 0.8, 1, -0.6, 0.3, 0.4);
  }
  if (p == 9) {
    fMt = 2; easeK = 2; cmp = 1; nKeys = 4; setWord('BEZIER'); setAct(1, 1, 1, 1, 1, 0, 1);
    setKey(1, -0.9, -0.5, -0.6, -1, -1, 0.3, -0.7);
    setKey(2, 0.9, -0.8, 0.8, -0.5, 0.2, 0.3, 0.1);
    setKey(3, -0.6, 0.9, 0.9, 1, 1, 0.3, 0.6);
    setKey(4, 0.7, 0.6, -0.5, 0.6, -0.4, 0.3, 0.95);
  }
  if (p == 10) {
    fMt = 2; easeK = 15; setWord('CUSTOM'); setAct(1, 1, 1, 0, 0, 0, 0);
    setKey(1, -0.7, -0.5, -0.6, -0.4, -0.6, 0.3, -0.5);
    setKey(2, 0.7, 0.6, 0.6, 0.6, -0.6, 0.3, 0.3);
  }
  if (p == 11) {
    fMt = 2; easeK = 4; setWord('ENTRY'); setAct(1, 1, 1, 0, 0, 0, 0);
    setKey(1, -0.6, -0.4, 0, -0.6, -0.8, 0.3, -0.4);
    setKey(2, 0.6, 0.5, 0.5, 0.5, -0.8, 0.3, 0.4);
    setKey(3, 0.9, -0.8, -0.6, 1, 0.8, -0.5, 0.9);
    setKey(4, -0.9, 0.9, 0.9, -1, 0.5, 0.6, -0.9);
  }
  if (p == 12) {
    posMode = 1; easeK = 4; cAz = 30; cEl = 25;
    set3(1, 20, 10, 60, 0, 0, 0, 0, -0.4);
    set3(2, 35, 80, 120, 0, 0, 0, 0, 0.3);
  }
  if (rig == 1 && nAct <= 2 && fMt != 4) { vAz = 0; vEl = 62; }
  changed();
}
function changed() {
  TBY = 8;
  if (rig == 2) { TBY = -106; }
  bgGen = bgGen + 1; fgGen = fgGen + 1;
  setButtons();
  panel();
}

function setButtons() {
  if (rig == 1) {
    BL[3] = '폰트'; BL[4] = MKO[fMt]; BL[7] = '축별'; BL[11] = '글자';
    BL[8] = str('키 ', nKeys);
  } else {
    BL[3] = '3D'; BL[7] = '인자별';
    if (posMode == 1) { BL[4] = '지구'; } else { BL[4] = '공간'; }
    if (model == 1) { BL[8] = '비행기'; } else { BL[8] = '상자'; }
    if (drag3 == 1) { BL[11] = '돌리기'; } else { BL[11] = '옮기기'; }
  }
  if (playing == 1) { BL[10] = '멈춤'; } else { BL[10] = '재생'; }
  BS[7] = perAx; BS[9] = cmp; BS[10] = 1 - playing;
  BS[8] = 0;
  if (rig == 1 && nKeys == 4) { BS[8] = 1; }
}

function manifoldText() {
  let s = ' ', i = 1, n = nAct, a = ' ', j = 0;
  if (rig == 2) {
    if (posMode == 1) { s = 'M = S² × SO(3) × ℝ₊ × S¹  (2+3+1+1 = 7차원)'; } else { s = 'M = ℝ³ × SO(3) × ℝ₊ × S¹  (3+3+1+1 = 8차원)'; }
  } else {
    for (const _ of rep(7)) {
      if (ACT[i] == 1) { if (j == 0) { a = TAG[i]; } else { a = str(a, '·', TAG[i]); } j = j + 1; }
      i = i + 1;
    }
    if (n == 0) { s = 'M = ℝ⁷  (모든 축 평면)'; }
    else {
      s = str('M = ', MSY[fMt], SUP[n + 1], ' (', a, ')');
      if (n < 7) { s = str(s, ' × ℝ', SUP[8 - n]); }
    }
  }
  return s;
}
function panel() {
  let g = 'γ(t) = Exp_A( e(t) · Log_A B )', e = EN[easeK];
  if (rig == 1 && nKeys == 4) { g = 'γ(t) = 측지선 de Casteljau(A, B, C, D; e(t))'; }
  if (perAx == 1 && (rig == 2 || nKeys == 2)) { g = 'γ(t) = Exp_A( Σ eᵢ(t) vᵢ ),  v = Log_A B'; e = '축마다'; if (rig == 2) { e = '인자마다'; } }
  topText = str(preN, '/12  ', PN[preN], '   ·   ', manifoldText(), '\n', g, '   ·   이징: ', e, '\n', PD[preN]);
}

// ---- the pointer ----
function uiPress(mx, my) {
  let i = 0, x = 0;
  dragK = 0;
  if (helpOn == 1) { helpOn = 0; dragK = -1; }
  else {
    if (my < -113) {
      dragK = -1;
      i = Math.floor((mx + 240) / 40) + 1;
      if (i >= 1 && i <= 12) { keyAct(i); }
    } else {
      // the time bar
      if (Math.abs(my - TBY) < 6 && mx > TB0 - 6 && mx < TB1 + 6) { dragK = 1; }
      // the handles of the user's Bezier
      if (dragK == 0 && bzShown == 1) {
        if (Math.abs(mx - egX(BZ[1])) < 6 && Math.abs(my - egY(BZ[2])) < 6) { dragK = 3; dragC = 1; }
        if (Math.abs(mx - egX(BZ[3])) < 6 && Math.abs(my - egY(BZ[4])) < 6) { dragK = 3; dragC = 3; }
      }
      if (dragK == 0) {
        if (rig == 1) { pressFont(mx, my); } else { press3(mx, my); }
      }
    }
  }
}
function pressFont(mx, my) {
  let i = Math.round((SLY0 - my) / SLDY) + 1;
  if (mx < 78 && my < 1 && my > -112) {
    dragK = -1;
    if (my > -10) { if (nKeys == 4) { keyPage = 1 - keyPage; changed(); } }
    else {
      if (i >= 1 && i <= 7) {
        if (mx < SAX0 - 4) { ACT[i] = 1 - ACT[i]; countAct(); changed(); }
        if (mx >= SAX0 - 4 && mx <= SAX0 + SAW + 4) { dragK = 2; dragC = 1; dragI = i; }
        if (mx >= SBX0 - 4 && mx <= SBX0 + SAW + 4) { dragK = 2; dragC = 2; dragI = i; }
        if (mx >= SCX - 3 && perAx == 1 && nKeys == 2) { EAX[i] = EAX[i] % NEASE + 1; changed(); }
      }
    }
  }
  if (mx > 80 && my < 0 && my > -112) { dragK = 4; }
  if (mx < 78 && my > 14 && my < 102) { dragK = -1; playing = 1 - playing; changed(); }
}
function press3(mx, my) {
  let k = 0, d = 0, best = 22;
  if (mx > 80 && my < -74 && my > -112) {
    dragK = -1;
    if (mx >= S3X0 - 4) {
      dragK = 8; dragI = 1;
      if (my < -90) { dragI = 2; }
      dragC = 1;
      if (mx > S3X0 + S3DX - 6) { dragC = 2; }
    }
  }
  if (mx < 78 && my > -100 && my < 102) {
    dragK = 5;
    k = 1;
    for (const _ of rep(2)) {
      d = Math.sqrt((mx - GKX[k]) * (mx - GKX[k]) + (my - GKY[k]) * (my - GKY[k]));
      if (d < best) { best = d; dragC = k; if (drag3 == 1) { dragK = 6; } else { dragK = 7; } }
      k = k + 1;
    }
  }
}
function dragStep(mx, my) {
  let dx = mx - mLX, dy = my - mLY, a = 0;
  if (dragK == 1) { curT = clamp((mx - TB0) / (TB1 - TB0), 0, 1); playing = 0; holdT = 0; setButtons(); fgGen = fgGen + 1; }
  if (dx != 0 || dy != 0) {
    if (dragK == 2) {
      a = clamp((mx - SAX0 - (dragC - 1) * (SBX0 - SAX0)) / SAW * 2 - 1, -1, 1);
      KEY[(dragC + keyPage * 2 - 1) * 7 + dragI] = a;
      bgGen = bgGen + 1; fgGen = fgGen + 1;
    }
    if (dragK == 3) {
      BZ[dragC] = clamp((mx - EGX0) / (EGX1 - EGX0), 0, 1);
      BZ[dragC + 1] = clamp((my - EGY0) / (EGY1 - EGY0) * 1.9 - 0.45, -0.45, 1.45);
      bgGen = bgGen + 1; fgGen = fgGen + 1;
    }
    if (dragK == 4) { vAz = vAz - dx * 1.2; vEl = clamp(vEl + dy * 1.2, -85, 85); bgGen = bgGen + 1; fgGen = fgGen + 1; }
    if (dragK == 5) { cAz = cAz - dx * 0.6; cEl = clamp(cEl - dy * 0.6, -80, 85); bgGen = bgGen + 1; fgGen = fgGen + 1; }
    if (dragK == 6) { camera(); turnKey(dragC, dx, dy); bgGen = bgGen + 1; fgGen = fgGen + 1; }
    if (dragK == 7) { camera(); moveKey(dragC, mx, my, dx, dy); bgGen = bgGen + 1; fgGen = fgGen + 1; }
    if (dragK == 8) {
      K3[(dragC - 1) * 2 + dragI] = clamp((mx - S3X0 - (dragC - 1) * S3DX) / S3W * 2 - 1, -1, 1);
      bgGen = bgGen + 1; fgGen = fgGen + 1;
    }
  }
}

// what a button (or its key) does
function keyAct(i) {
  if (i == 12) { helpOn = 1 - helpOn; }
  if (i == 1) { if (preN > 1) { preset(preN - 1); } else { preset(12); } }
  if (i == 2) { if (preN < 12) { preset(preN + 1); } else { preset(1); } }
  if (i == 3) { if (rig == 1) { preset(12); } else { preset(11); } }
  if (i == 4) {
    if (rig == 1) { fMt = fMt % 4 + 1; } else { posMode = 3 - posMode; set3keys(); }
  }
  if (i == 5) { easeK = easeK - 1; if (easeK < 1) { easeK = NEASE; } }
  if (i == 6) { easeK = easeK % NEASE + 1; }
  if (i == 7) {
    perAx = 1 - perAx;
    if (perAx == 1) {
      // (start each axis from a different ease, so the difference shows)
      if (rig == 1) { setEax(13, 12, 10, 7, 2, 4, 1); } else { EA3[1] = 2; EA3[2] = 12; EA3[3] = 13; EA3[4] = 1; }
    }
  }
  if (i == 8) {
    if (rig == 1) { nKeys = 6 - nKeys; keyPage = 0; } else { setModel(3 - model); }
  }
  if (i == 9) { cmp = 1 - cmp; }
  if (i == 10) { playing = 1 - playing; }
  if (i == 11) {
    if (rig == 1) {
      ask('보간할 글자 (영문·숫자, 20자까지)');
      if (answer() != '') { setWord(answer()); }
      hideAnswer();
    } else { drag3 = 3 - drag3; }
  }
  changed();
}
// the keys of the 3D rig when the place space changes: on the globe or in the box
function set3keys() {
  if (posMode == 1) {
    set3(1, 20, -20, 60, 0, 0, 0, K3[1], K3[2]);
    set3(2, 30, 70, 120, 0, 0, 0, K3[3], K3[4]);
  } else {
    set3(1, -0.8, 0, 0, 0, 0, 0, K3[1], K3[2]);
    set3(2, 0.8, 0.3, 0, 120, 40, -60, K3[3], K3[4]);
  }
}

function uiStep() {
  let kn = 0, mx = mouseX(), my = mouseY(), md = 0, now = timer(), dt = 0;
  dt = now - tLast; tLast = now;
  if (dt > 0.1) { dt = 0.1; }
  if (dt < 0) { dt = 0; }
  if (mouseDown()) { md = 1; }
  if (md == 1 && mWas == 0) { uiPress(mx, my); }
  if (md == 1 && mWas == 1 && dragK > 0) { dragStep(mx, my); }
  if (md == 0) { dragK = 0; }
  mWas = md; mLX = mx; mLY = my;
  if (key(37)) { kn = 1; }
  if (key(39)) { kn = 2; }
  if (key(32)) { kn = 10; }
  if (key(72)) { kn = 12; }
  if (key(67)) { kn = 9; }
  if (key(69)) { kn = 6; }
  if (key(77)) { kn = 4; }
  if (kn != kLatch) {
    kLatch = kn;
    if (kn > 0) { keyAct(kn); }
  }
  // the play: A to B, a rest, then back
  if (playing == 1) {
    if (curT < 1) {
      curT = curT + dt / DUR;
      if (curT > 1) { curT = 1; }
      fgGen = fgGen + 1;
    } else {
      holdT = holdT + dt;
      if (holdT > HOLD) { holdT = 0; curT = 0; rev = 1 - rev; bgGen = bgGen + 1; fgGen = fgGen + 1; }
    }
  }
  curE = ease(easeK, curT);
  BV[1] = 1 - helpOn;
}

const HELP = '다양체 위의 이징                                           (아무 데나 누르면 닫힙니다)\n\n보통 이징은 0~1의 수 e(t)로 두 값 사이를 간다. 여기서는 두 점 A B가 다양체 M 위에 있고\nγ(t) = Exp_A( e(t) · Log_A B )  : A에서 B로 가는 측지선을 e(t)만큼 간다. e가 1을 넘으면\n측지선을 따라 B를 지나쳤다가 돌아온다(백·탄성).  축별/인자별: 접벡터 Log_A B의 성분마다\n다른 이징 eᵢ를 곱하고 Exp_A.  키 4: 측지선으로 하는 de Casteljau = 다양체 베지어.\n\nℝⁿ 평면, Sⁿ 구(입체 사영 지도), Hⁿ 푸앵카레 공(가장자리로 갈수록 멀다), Tⁿ 원환(주기 축),\nSO(3) 회전(단위 쿼터니언), ℝ₊ 크기(배율로 보간), S¹ 색. 가변 폰트는 켠 축들이 M, 3D 물체는\n곱 다양체. 비교를 켜면 축·위경도·오일러각을 그냥 보간한 것(빨강)과 나란히.\n\n◀ ▶ 예시 (← →)   폰트/3D  실험실로   다양체(M)   이징◀ ▶ (E)   축별   키 2/4   비교 (C)\n멈춤 (Space)   글자: 보간할 단어   ? (H)   시간 막대·슬라이더·노란 손잡이·그림은 끌기';

on('start', 'bg', function () {
  hide();
  // (the fill layer first, so the lines lie over it)
  fillStop(); goto(0, 0); fillColorHex(BGC); fillStart(); goto(1, 0); goto(1, 1); fillStop();
  penSize(1); penColorHex(BGC); penDown(); goto(0, 1); penUp();
  for (;;) {
    if (ready == 1 && bgShown != bgGen) {
      bgShown = bgGen;
      eraseAll();
      if (rig == 1) { bgFont(); } else { bgObj(); }
    }
  }
});

on('start', 'pen', function () {
  let fgShown = 0, i = 0;
  hide();
  timerStart();
  fillStop(); goto(0, 0); fillColorHex(BGC); fillStart(); goto(1, 0); goto(1, 1); fillStop();
  penSize(1); penColorHex(BGC); penDown(); goto(0, 1); penUp();
  i = 0;
  for (const _ of rep(600)) { V.push(0); i = i + 1; }
  for (const _ of rep(80)) { TX.push(0); TY.push(0); SNX.push(0); SNY.push(0); OX.push(0); OY.push(0); }
  for (const _ of rep(28)) { KEY.push(0); }
  for (const _ of rep(24)) { WG.push(1); }
  for (const _ of rep(NSP + 2)) { PPX.push(0); PPY.push(0); PPD.push(0); NPX.push(0); NPY.push(0); NPD.push(0); PRX.push(0); PRY.push(0); PRZ.push(0); QRX.push(0); QRY.push(0); QRZ.push(0); }
  for (const _ of rep(12)) { MVX.push(0); MVY.push(0); MVZ.push(0); MFA.push(0); MFB.push(0); MFC.push(0); MFD.push(0); MFK.push(0); WX.push(0); WY.push(0); WZ.push(0); SX.push(0); SY.push(0); SZ.push(0); FDP.push(0); FOR.push(0); }
  setModel(1);
  preset(START);
  ready = 1;
  for (;;) {
    uiStep();
    if (fgShown != fgGen) { fgShown = fgGen; drawFg(); }
    if (TEST > 0) { testStep(); }
  }
});

on('start', 'top', function () {
  let shown = '';
  for (;;) {
    if (topText != shown) { shown = topText; write(shown); }
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
      while (k <= 12) { cloneSelf(); k = k + 1; }
    }
  }
});
on('clone', 'btn', function () {
  btnBorn = btnBorn + 1;
  btn$k = btnBorn; btn$vis = -1; btn$st = -1; btn$txt = '';
  goto(-220 + (btn$k - 1) * 40, -125);
  for (;;) {
    if (BV[1] != btn$vis) {
      btn$vis = BV[1];
      if (btn$vis == 1) { show(); } else { hide(); }
    }
    if (BL[btn$k] != btn$txt) { btn$txt = BL[btn$k]; write(btn$txt); }
    if (BS[btn$k] != btn$st) {
      btn$st = BS[btn$k];
      if (btn$st == 1) { textColorHex('#ffd84a'); } else { textColorHex('#ffffff'); }
    }
  }
});

// ============================================================
// Scenes. Each sets the world up from nothing (counts back to zero, the lists are
// written over), the camera, and what the panel measures.
// ============================================================
let SCN = ['젤리 큐브 낙하', '젤리 계단', '젤리 더미', '젤리 탑과 쇠공', '쇠공과 젤리 판', '젤리 놀이터', '외팔보 처짐 (정확도)'];
let fastCG = 6, sDamp = 0, scene = 1, grav = 9.81, simT = 0, frameN = 0, gMu = 0.8, fastSub = 2;
// what is measured (scene-dependent)
let mE0 = 0, mY0 = 0;
let mText = ' ';
// the ground: a checker of GN x GN squares of size GS around the middle
let gN = 12, gS = 0.25;

function sceneClear() {
  nN = 0; nT = 0; nSV = 0; nSB = 0; nR = 1; nC = 0; nL = 0; nF = 0; nCMax = 0; nP = 0; itSum = 0;
  simT = 0; frameN = 0; stepN = 0; stepInFrame = 0; fastH = 0; grabN = 0; grabOn = 0; nCN = 0; ssTick = 100;
  grav = 9.81; gMu = 0.8; fastSub = FSUB; fastCG = CGIT; sDamp = 0;
  // the ground is rigid body 1
  RK[1] = 0; RX[1] = 0; RY[1] = 0; RZ[1] = 0; RIM[1] = 0; RII1[1] = 0; RII2[1] = 0; RII3[1] = 0;
  RVX[1] = 0; RVY[1] = 0; RVZ[1] = 0; RWX[1] = 0; RWY[1] = 0; RWZ[1] = 0; RE[1] = 1; RMU[1] = 0.8;
  gN = 12; gS = 0.25;
  camTX = 0; camTY = 0.2; camTZ = 0; camD = 2.2; az = 30; el = 22;
}
// a box that never moves (rho 0), as wide as (a b c) halves
function M_wall(x, y, z, a, b, c) {
  rigidAdd(2, x, y, z, a, b, c, 0, 0.3, 0.8, 150, 155, 165);
}

function sceneLoad(k) {
  let i = 0, x = 0, y = 0;
  scene = k;
  sceneClear();
  if (k == 1) {
    // a cube of jelly, 24 cm, dropped from 40 cm turned a little
    softBox(0, 0.45, 0, 0.24, 0.24, 0.24, 4, 4, 4, 30000, 0.4, 1000, 0, 0.8, 240, 120, 150, 25, 15, 0, 0);
    camTY = 0.2; camD = 1.6;
  }
  if (k == 2) {
    // a staircase of four steps, a jelly ball thrown down it and a jelly cube after it; a
    // wall at the bottom. They roll, bounce, squash on the edges and run into each other
    i = 0;
    while (i < 4) {
      y = 0.6 - i * 0.15;
      M_wall(-0.6 + i * 0.3, y / 2, 0, 0.15, y / 2, 0.35);
      i = i + 1;
    }
    M_wall(0.75, 0.15, 0, 0.03, 0.15, 0.35);
    softBox(-0.65, 0.78, 0.03, 0.2, 0.2, 0.2, 4, 4, 4, 20000, 0.4, 1000, 0, 0.7, 250, 150, 60, 0, 0, 0, BALLB);
    softVel(nSB, 1.2, 0, 0);
    softBox(-0.62, 1.15, -0.04, 0.15, 0.15, 0.15, 3, 3, 3, 40000, 0.4, 1000, 0, 0.8, 120, 190, 240, 30, 20, 0, 0);
    softVel(nSB, 0.9, 0, 0);
    camTX = 0; camTY = 0.3; camD = 2.3; az = 22; el = 20;
  }
  if (k == 3) {
    // four jellies of different stiffness dropped one on another into an open box
    M_wall(0, 0.12, -0.28, 0.3, 0.12, 0.02); M_wall(0, 0.12, 0.28, 0.3, 0.12, 0.02);
    M_wall(-0.28, 0.12, 0, 0.02, 0.12, 0.26); M_wall(0.28, 0.12, 0, 0.02, 0.12, 0.26);
    softBox(0.02, 0.15, 0.03, 0.18, 0.18, 0.18, 3, 3, 3, 30000, 0.4, 1000, 0, 0.8, 240, 110, 140, 20, 10, 0, 0);
    softBox(-0.04, 0.5, -0.02, 0.2, 0.2, 0.2, 4, 4, 4, 15000, 0.4, 1000, 0, 0.8, 250, 200, 70, 0, 0, 0, BALLB);
    softBox(0.03, 0.82, 0, 0.34, 0.08, 0.08, 6, 1, 1, 80000, 0.4, 1000, 0, 0.8, 110, 200, 130, 15, 35, 0, 0);
    softBox(-0.03, 1.08, 0.04, 0.15, 0.15, 0.15, 3, 3, 3, 40000, 0.4, 1000, 0, 0.8, 120, 170, 250, 40, 25, 0, 0);
    camTY = 0.3; camD = 2.0; el = 30;
  }
  if (k == 4) {
    // three jelly cubes stacked, and a steel ball thrown into the middle one
    i = 0;
    while (i < 3) {
      softBox(0.05, 0.09 + i * 0.181, 0, 0.18, 0.18, 0.18, 3, 3, 3, 25000 + i * 10000, 0.4, 1000, 0, 0.8, 240 - i * 60, 120 + i * 40, 120 + i * 50, 0, 0, 0, 0);
      i = i + 1;
    }
    rigidAdd(1, -0.9, 0.3, 0, 0.05, 0, 0, 7800, 0.5, 0.4, 180, 185, 195);
    RVX[nR] = 3.5; RVY[nR] = 0.5;
    camTX = -0.2; camTY = 0.3; camD = 2.0; az = 30; el = 15;
  }
  if (k == 5) {
    // a jelly slab on the ground, a steel ball and a wooden box falling on it
    softBox(0, 0.0751, 0, 0.6, 0.15, 0.6, 8, 2, 8, 100000, 0.4, 1000, 0, 0.9, 120, 200, 140, 0, 0, 0, 0);
    rigidAdd(1, -0.1, 0.6, 0.05, 0.07, 0, 0, 7800, 0.6, 0.4, 180, 185, 195);
    rigidAdd(2, 0.15, 0.9, -0.08, 0.06, 0.06, 0.06, 600, 0.4, 0.5, 200, 150, 90);
    rigidTurn(3, 1, 0, 1, 35);
    camTY = 0.15; camD = 1.9; el = 26;
  }
  if (k == 6) {
    // something to pull at: a big soft jelly ball, a jelly cube and a wooden box (grabbing on)
    softBox(-0.15, 0.16, 0, 0.32, 0.32, 0.32, 4, 4, 4, 8000, 0.4, 1000, 0, 0.9, 240, 100, 150, 0, 0, 0, BALLB);
    softBox(0.28, 0.1, 0.1, 0.2, 0.2, 0.2, 3, 3, 3, 20000, 0.4, 1000, 0, 0.9, 110, 200, 240, 15, 0, 0, 0);
    rigidAdd(2, 0.2, 0.05, -0.3, 0.06, 0.05, 0.08, 600, 0.3, 0.6, 200, 150, 90);
    grabOn = 1;
    camTY = 0.15; camD = 1.7; el = 25;
  }
  if (k == 7) {
    // a beam 50 x 10 x 10 cm held at one end, bending under its own weight
    softBox(0, 0.4, 0, 0.5, 0.1, 0.1, 10, 2, 2, 1000000, 0.3, 1000, 0, 0.8, 120, 170, 230, 0, 0, 1, 0);
    // (a stiff beam needs more iterations to come to rest in the fast mode, and one step a
    // frame does)
    sDamp = 8; fastCG = 20; fastSub = 1;
    rigidAdd(2, -0.3, 0.3, 0, 0.04, 0.3, 0.1, 0, 0.5, 0.8, 120, 120, 130);
    RNS[nR] = 1;
    camTX = 0; camTY = 0.35; camD = 1.3; az = 10; el = 8;
    gN = 0;
  }
  // ---- checks against theory (not in the menu: test/verify.mjs loads them) ----
  if (k == 11) {
    // a bar 60 x 6 x 6 cm let go hanging from its top end: its foot first goes down
    // rho g L^2 / E (twice where it comes to rest) at 2 L / sqrt(E / rho)
    softBox(0, 0.4, 0, 0.6, 0.06, 0.06, 10, 1, 1, 100000, 0.3, 1000, 0, 0.8, 230, 140, 90, -90, 0, 1, 0);
    gN = 0;
  }
  if (k == 12) {
    // without weight, a box turning about its middle axis turns over (Dzhanibekov)
    grav = 0;
    rigidAdd(2, 0, 0.5, 0, 0.24, 0.05, 0.12, 1000, 0.5, 0.5, 230, 180, 70);
    rigidSpin(2, 0.002, 0, 12);
    gN = 0;
  }
  if (k == 13) {
    // a box with friction 0.3 sliding down a slope of 30 degrees
    rigidAdd(2, 0, 0.45, 0, 0.8, 0.05, 0.4, 0, 0.2, 1, 150, 150, 160);
    rigidTurn(2, 0, 0, 1, -30);
    rigidAdd(2, 0, 0, 0, 0.08, 0.05, 0.08, 800, 0.2, 0.3, 230, 110, 80);
    rigidTurn(3, 0, 0, 1, -30);
    RX[3] = RX[2] - 0.45 * cosd(30) + 0.1002 * sind(30);
    RY[3] = RY[2] + 0.45 * sind(30) + 0.1002 * cosd(30);
  }
  mX0 = RX[nR]; mY0 = RY[nR]; mA = 0; mB = 0; mT0 = 0; mT1 = 0; mSign = 0;
  if (k == 11) { mY0 = PY[SBN1[1]]; mA = mY0; }
  sceneSetup();
}
let mX0 = 0, mA = 0, mB = 0, mT0 = 0, mT1 = 0, mSign = 0;
// after every step, the checks: the bar's lowest foot and when; the times the box turns over;
// how far the box slid and when
function measure() {
  let y = 0, s = 1;
  if (scene == 11) {
    y = PY[SBN1[1]];
    if (simT < 0.2 && y < mA) { mA = y; mT0 = simT; }
  }
  if (scene == 12) {
    if (R13[2] * RLX[2] + R23[2] * RLY[2] + R33[2] * RLZ[2] < 0) { s = -1; }
    if (mSign == 0) { mSign = s; }
    if (s != mSign) { mSign = s; mB = mB + 1; if (mB == 1) { mT0 = simT; } if (mB == 2) { mT1 = simT; } }
  }
  if (scene == 13) {
    y = (RX[3] - mX0) * cosd(30) - (RY[3] - mY0) * sind(30);
    if (y < 1.1) { mA = y; mT0 = simT; }
  }
}
// soft body b starts moving at (vx vy vz)
function softVel(b, vx, vy, vz) {
  let i = SBN0[b];
  for (const _ of rep(SBN1[b] - SBN0[b] + 1)) { VX[i] = vx; VY[i] = vy; VZ[i] = vz; i = i + 1; }
}

// after a scene is made: the step sizes and the starting values of what is measured
function sceneSetup() {
  let b = 1, d = 1;
  // the stability limit of the soft meshes
  d = 1 / FPS;
  while (b <= nSB) {
    if (SBDT[b] < d) { d = SBDT[b]; }
    b = b + 1;
  }
  dtSoft = d;
  if (nN > 0) { softContacts(0.001); softForces(); }
  eCon = 0;
  if (scene == 7) {
    // the nodes of the free end, and their height at the start
    while (TIPL.length > 0) { TIPL.removeAt(1); }
    b = SBN0[1];
    while (b <= SBN1[1]) { if (PX[b] > 0.2499) { TIPL.push(b); } b = b + 1; }
    mY0 = 0; b = 1;
    while (b <= TIPL.length) { mY0 = mY0 + PY[TIPL[b]]; b = b + 1; }
    mY0 = mY0 / TIPL.length;
  }
  energy();
  mE0 = eTot;
  stepPlan();
  viewGen = viewGen + 1;
}

// The steps of the next frame (1 / FPS s) in the mode chosen. Accurate mode: the stability
// limit of the soft meshes, and at most DTRIGID while a rigid body that moves is near a
// soft one (their contact is a stiff spring). Fast mode: soft bodies whose explicit steps
// are few (jelly: up to FASTEXPL a frame) are moved as in the accurate mode - that is the
// cheaper of the two stable ways for them, and the theta method, with many contacts, the
// less sure one - and stiffer ones by the implicit theta method.
function stepPlan() {
  let r = 2, b = 1, m = 0, near = 0;
  for (const _ of rep(nR - 1)) {
    if (RIM[r] > 0) {
      if (nN == 0) { near = 1; }
      m = RBR[r] + 0.05 + Math.sqrt(RVX[r] * RVX[r] + RVY[r] * RVY[r] + RVZ[r] * RVZ[r]) / FPS;
      b = 1;
      for (const _ of rep(nSB)) {
        if (RX[r] + m > SBX0[b] && RX[r] - m < SBX1[b] && RY[r] + m > SBY0[b] && RY[r] - m < SBY1[b] && RZ[r] + m > SBZ0[b] && RZ[r] - m < SBZ1[b]) { near = 1; }
        b = b + 1;
      }
    }
    r = r + 1;
  }
  dtAcc = dtSoft;
  // (fast mode: not shortened for rigid bodies - the contact with them is softened to fit)
  if (near == 1 && dtAcc > DTRIGID && mode == 1) { dtAcc = DTRIGID; }
  if (nN == 0 && nR > 1) { dtAcc = DTRIGID; }
  fastExpl = 0;
  if (nN > 0 && Math.ceil(1 / FPS / dtSoft - 0.0001) <= FASTEXPL) { fastExpl = 1; }
  if (mode == 1 || fastExpl == 1) {
    stepsFrame = Math.ceil(1 / FPS / dtAcc - 0.0001);
  } else {
    stepsFrame = fastSub;
  }
  stepH = 1 / FPS / stepsFrame;
  // (fast mode: the rigid bodies' own steps, about 1/RIGFAST s)
  rigSub = Math.ceil(stepH * RIGFAST - 0.0001);
  rigH = stepH / rigSub;
}

// energy of everything: kinetic, of height, elastic
function energy() {
  let i = 1, k = 0, p = 0, m = 0;
  for (const _ of rep(nN)) {
    m = NMS[i];
    k = k + m * (VX[i] * VX[i] + VY[i] * VY[i] + VZ[i] * VZ[i]);
    p = p + m * PY[i];
    i = i + 1;
  }
  i = 2;
  for (const _ of rep(nR - 1)) {
    if (RIM[i] > 0) {
      m = RMS[i];
      k = k + m * (RVX[i] * RVX[i] + RVY[i] * RVY[i] + RVZ[i] * RVZ[i]) + RWX[i] * RLX[i] + RWY[i] * RLY[i] + RWZ[i] * RLZ[i];
      p = p + m * RY[i];
    }
    i = i + 1;
  }
  softElastic();
  eKin = k / 2; ePot = p * grav;
  // (the contact springs of the soft bodies hold some energy for a moment too)
  eElastic = eElastic + eCon;
  eTot = eKin + ePot + eElastic;
}
let eKin = 0, ePot = 0, eTot = 0;

// one step of everything in the mode chosen
function stepAll() {
  let h = stepH, k = 0, vm = 0, ns = 1, hs = 0;
  // slower than this a contact does not bounce
  vth = 3 * grav * h + 0.005;
  if (mode == 1 || fastExpl == 1) {
    // the soft bodies move (and push on the rigid bodies they touch), then the rigid bodies
    capH = h;
    if (nN > 0) { softKick(h / 2); softDrift(h); softForces(); softContacts(h); softSoft(h); grabForces(h); softKick(h / 2); }
    if (nR > 1) {
      if (mode == 1) { rigidStep(h, ITACC, TOLACC); } else { rigidStep(h, ITFAST, TOLFAST); }
    }
  } else {
    // the soft bodies in one long implicit step; then the rigid bodies in shorter steps of
    // their own, each feeling the soft surfaces as they are now (held still meanwhile): about
    // 1/RIGFAST s, and short enough that nothing moves more than RIGDX in one. While a rigid
    // body is fast, the soft step itself is cut so that it moves at most SOFTDX in one (a
    // fast ball would otherwise go through a jelly held still)
    vm = 0; k = 2;
    for (const _ of rep(nR - 1)) {
      if (RIM[k] > 0) { vm = Math.max(vm, Math.sqrt(RVX[k] * RVX[k] + RVY[k] * RVY[k] + RVZ[k] * RVZ[k]) + RBR[k] * Math.sqrt(RWX[k] * RWX[k] + RWY[k] * RWY[k] + RWZ[k] * RWZ[k])); }
      k = k + 1;
    }
    ns = 1;
    if (nN > 0) { ns = Math.min(8, Math.max(1, Math.ceil(h * vm / SOFTDX))); }
    hs = h / ns;
    rigSub = Math.min(32, Math.max(Math.ceil(hs * RIGFAST - 0.0001), Math.ceil(hs * vm / RIGDX)));
    rigH = hs / rigSub;
    capH = rigH;
    for (const _ of rep(ns)) {
      if (nN > 0) {
        softFast(hs);
        k = 2;
        for (const _ of rep(nR - 1)) { RFX[k] = 0; RFY[k] = 0; RFZ[k] = 0; RTX[k] = 0; RTY[k] = 0; RTZ[k] = 0; RKC[k] = 0; k = k + 1; }
      }
      if (nR > 1) {
        for (const _ of rep(rigSub)) {
          if (nN > 0) { softOnRigid(rigH); }
          rigidStep(rigH, ITFAST, TOLFAST);
        }
      }
    }
  }
  simT = simT + h;
  stepN = stepN + 1;
  if (scene > 10) { measure(); }
}
let stepN = 0, stepInFrame = 0, stepsFrame = 1, stepH = 0.001, dtAcc = 0.001, dtSoft = 0.001, fastExpl = 0, rigSub = 1, rigH = 0.001;


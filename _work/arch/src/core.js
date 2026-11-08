// ============================================================
// 경계의 건축가: the state of the stage and the helpers everything uses
//
// The world's lists (RW.., P.., O.., S..) are made by levels.mjs and put in front of this
// file by the build. A stage is a range of rooms, portals, objects, signals, logic nodes
// and counters in them (SR0..SR1 and so on, 0-based starts, 1-based items).
// ============================================================
let stage = 0, nStages = 0, stageClear = 0, clearT = 0, recN = 0, recHave = 0;
// runtime state of portals, objects, signals, logic, counters
let PL = [], PVIS = [], PWAS = [], POI = [];
let OR = [], OX = [], OY = [], OZ = [], OS = [], OST = [], OVY = [], ORC = [];
let SG = [], LGT = [], CN = [];
// colour helper: HX[v + 1] is v as two hex digits
let HX = [];

function allocAll() {
  let i = 1;
  i = 0;
  while (i < 256) { HX.push(str(charAt(HEXD, idiv(i, 16) + 1), charAt(HEXD, mod(i, 16) + 1))); i = i + 1; }
  i = 1;
  while (i <= PR.length) { PL.push(0); PVIS.push(0); PWAS.push(0); POI.push(1); i = i + 1; }
  i = 1;
  while (i <= OT.length) { OR.push(0); OX.push(0); OY.push(0); OZ.push(0); OS.push(1); OST.push(0); OVY.push(0); ORC.push(0); i = i + 1; }
  i = 1;
  while (i <= NSIG + 1) { SG.push(0); i = i + 1; }
  i = 1;
  while (i <= LGO.length) { LGT.push(0); i = i + 1; }
  i = 1;
  while (i <= CNT.length) { CN.push(0); i = i + 1; }
  nStages = SNM.length;
  renderAlloc();
  laserAlloc();
}

function hexc(r, g, b) {
  return str('#', HX[Math.round(Math.max(0, Math.min(255, r))) + 1], HX[Math.round(Math.max(0, Math.min(255, g))) + 1], HX[Math.round(Math.max(0, Math.min(255, b))) + 1]);
}

// angle of (x, y) in degrees, -90 .. 270
function atan2d(y, x) {
  let a = 0;
  if (Math.abs(x) < 0.0000001) { if (y >= 0) { a = 90; } else { a = -90; } }
  else { a = atand(y / x); if (x < 0) { a = a + 180; } }
  return a;
}

// a signal by its number (negative: not)
function sigv(k) {
  let v = 1;
  if (k > 0) { v = SG[k]; }
  if (k < 0) { v = 1 - SG[0 - k]; }
  return v;
}

// is portal p open now (it leads somewhere and its condition holds)
function popen(p) {
  let v = 0;
  if (PL[p] > 0) { v = sigv(PCD[p]); }
  return v;
}

// ------------------------------------------------------------
// load a stage: everything back as the stage starts
// ------------------------------------------------------------
function loadStage(s) {
  let i = 0;
  stage = s;
  i = SP0[s] + 1;
  while (i <= SP1[s]) { PL[i] = PL0[i]; PVIS[i] = 0; PWAS[i] = 0; POI[i] = 1; i = i + 1; }
  i = SO0[s] + 1;
  while (i <= SO1[s]) {
    OR[i] = OR0[i]; OX[i] = OX0[i]; OY[i] = OY0[i]; OZ[i] = OZ0[i]; OS[i] = OS0[i]; OVY[i] = 0;
    OST[i] = 0;
    if (OT[i] == 10) { OST[i] = OP1[i]; }
    i = i + 1;
  }
  i = SG0[s] + 1;
  while (i <= SG1[s]) { SG[i] = 0; i = i + 1; }
  i = SL0[s] + 1;
  while (i <= SL1[s]) { LGT[i] = 0; i = i + 1; }
  i = SC0[s] + 1;
  while (i <= SC1[s]) { CN[i] = 0; i = i + 1; }
  pr = SSR[s]; px = SSX[s]; py = SSY[s]; pz = SSZ[s]; yaw = SYW[s]; pitch = 0; psc = SSC[s];
  pvx = 0; pvy = 0; pvz = 0; held = 0; lensSel = 0; onGround = 1;
  stageClear = 0; hintLv = 0; msgText = ' '; msgT = 0;
  stageT = 0;
  // records of this stage still to find
  recN = 0; recHave = 0;
  i = SO0[s] + 1;
  while (i <= SO1[s]) { if (OT[i] == 11) { recN = recN + 1; if (ORC[i] == 1) { recHave = recHave + 1; OR[i] = 0; } } i = i + 1; }
  stagePalette(s);
  logicStep(0);
  topDirty = 1;
}

// the shades of the stage's own colours, after the fixed ones in CPAL
function stagePalette(s) {
  let i = SPA0[s] + 1, k = 1, L = 1, r = 0, g = 0, b = 0, f = 0, kk = 0;
  while (CPAL.length > NFIX * PSTRIDE) { CPAL.removeAt(CPAL.length); }
  while (i <= SPA1[s]) {
    r = PALR[i]; g = PALG[i]; b = PALB[i];
    k = 1;
    while (k <= 6) {
      kk = KF[k];
      L = 1;
      while (L <= NLEV) {
        f = FOGF[L];
        CPAL.push(hexc(FOGR0 + (r * kk - FOGR0) * f, FOGG0 + (g * kk - FOGG0) * f, FOGB0 + (b * kk - FOGB0) * f));
        L = L + 1;
      }
      k = k + 1;
    }
    i = i + 1;
  }
}

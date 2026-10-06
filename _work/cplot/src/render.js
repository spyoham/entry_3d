// ============================================================
// The picture: domain colouring, finer pass after pass
//
// A pass draws the plane in cells of 16, 8, 4, 2 or 1 stage units. A row of
// cells is: the z of each cell into register 1, the program, a colour per
// cell, and one pen stroke per run of equal colours. Nothing of a row is kept.
//
// Pens. A pen's strokes are redrawn together whenever one is added, and a
// finer pass has to lie over the coarser one and then replace it. So the
// strokes are spread over clones of the `pen` object: a clone draws a band of
// rows, then the next clone takes over. When a pass is complete, every clone
// of an older pass deletes itself (its strokes go with it).
//
// Entry puts a clone straight under the object that made it. So every clone is
// made by the `pen` object itself - then each new one lies over all the older
// ones - and never by a clone (a clone's clone would lie under it, and a finer
// pass would be drawn behind the coarser one). The object keeps two clones
// ready ahead of the one that draws; taking over is only a number changing.
//
// Pace. `budget` is the number of cells worked per frame; it follows the frame
// rate (main.js), so the same work runs on plain Entry and on tessvm.
// ============================================================
const KLG = 0.7213475204444817;   // 0.5 / ln 2: ln(|f|^2) -> log2 |f|
const K_ZERO = (NH + 2) * NL + 1;
const K_INF = (NH + 2) * NL + 2;

let cmode = 1, hiq = 0;
let vcx = 0, vcy = 0, vupp = 0.015625, vgen = 1;      // the view asked for; vgen counts every change
let pcx = 0, pcy = 0, pupp = 0, pmode = 0;            // the view being drawn
let pT = 0, pAr = 1, pAi = 0;                         // and the parameters t and a of that picture
let rState = 0, rView = 0, rLevel = 0, rGen = 0, killGen = 0, rRow = 0, rCol = 0, rHand = 0;
let bandMade = 0, bandBorn = 0, activeBand = 0, bandStrokes = 0, bandMax = 1500;
let budget = 160, baseLevel = 1, maxLevel = 4, workN = 0, segN = 0, fDone = 0, paceKnown = 0, fpsNow = 60;
let cs = 16, cols = 30, rows = 17, segLen = 30;
let nCells = 0, nStrokes = 0, ready = 0;
let LCS = [16, 8, 4, 2, 1];
let pen$my = 0, pen$gen = 0;

function M_stroke(k, xa, xb, yc) {
  penColorHex(PAL[k]);
  goto(xa, yc);
  penDown();
  goto(xb + 0.4, yc);
  penUp();
  ns_ = ns_ + 1;
}

// The colour (an index into PAL) of the value x + iy, colour mode md -> k
//
// The palette is PAL[r * NL + c]: r = 1 .. NH + 1 the phase (5 degrees each, from -180), c = 1 .. NL the
// lightness. The phase is 2 atan(y / (|f| + x)) - or 2 atan((|f| - x) / y) left of the imaginary
// axis, where the first form would cancel - so one atan block and no quadrants; a division by 0
// gives the right limit. c is the fraction of log2|f| times NL, rounded up: at an exact power of
// two it is 0, which reads the entry before the row (the list starts with NL spare entries for r = 1).
function M_palIdx(k, x, y, md) {
  pm_ = x * x + y * y;
  if (pm_ > kTiny && pm_ < kHuge) {
    if (x < 0) { k = idiv(atand((Math.sqrt(pm_) - x) / y) + 92.5, 2.5) * NL; }
    else { k = idiv(atand(y / (Math.sqrt(pm_) + x)) + 92.5, 2.5) * NL; }
    if (md == 1) {
      // a ring each time |f| doubles
      k = k + Math.ceil(mod(Math.log(pm_) * KLG, 1) * NL);
    } else {
      if (md == 2) {
        // rings and rays (every 30 degrees of phase): the picture of a polar grid
        if (x < 0) { pt_ = mod(atand((Math.sqrt(pm_) - x) / y) / 15, 1); } else { pt_ = mod(atand(y / (Math.sqrt(pm_) + x)) / 15, 1); }
        k = k + Math.ceil((mod(Math.log(pm_) * KLG, 1) + pt_) * (NL / 2));
      } else {
        if (md == 3) {
          // the picture of the unit squares
          k = k + 2 + mod(Math.floor(x) + Math.floor(y), 2) * (NL - 4);
        } else { k = k + NL - 3; }
      }
    }
  } else {
    // 0, infinity, or not a number
    if (pm_ < 1) { k = K_ZERO; } else { k = K_INF; }
  }
}

// the colours of n cells (the result register) as strokes; x0: the left edge of the first cell
function paintRow(n, x0, yc) {
  let prev = 0, xa = x0, xb = x0, k = 0, x = 0, y = 0;
  let p = resOff + 1, pe = resOff + n, md = pmode, w = cs;
  ns_ = 0;
  while (p <= pe) {
    x = VR[p]; y = VI[p];
    M_palIdx(k, x, y, md);
    if (k != prev) {
      if (prev > 0) { M_stroke(prev, xa, xb, yc); }
      prev = k; xa = xb;
    }
    xb = xb + w;
    p = p + 1;
  }
  M_stroke(prev, xa, xb, yc);
  bandStrokes = bandStrokes + ns_;
  nStrokes = nStrokes + ns_;
}

// the next piece of a row
function doSegment() {
  let n = cols - rCol, j = 1;
  if (n > segLen) { n = segLen; }
  let step = cs * pupp;
  let x = pcx + (rCol * cs + cs * 0.5 - 240) * pupp;
  let y = pcy + (135 - rRow * cs - cs * 0.5) * pupp;
  while (j <= n) { VR[j] = x; VI[j] = y; x = x + step; j = j + 1; }
  // (the read-out works with the newest t and a in between: the picture keeps its own)
  VR[PT_OFF + 1] = pT; VR[PA_OFF + 1] = pAr; VI[PA_OFF + 1] = pAi;
  runProg(n);
  paintRow(n, rCol * cs - 240, 135 - rRow * cs - cs * 0.5);
  nCells = nCells + n;
  segN = n;
  rCol = rCol + n;
  if (rCol >= cols) { rCol = 0; rRow = rRow + 1; }
}

// the next clone takes over (it is there already, or will be in a frame)
function newBand() {
  activeBand = activeBand + 1; bandStrokes = 0; rHand = 1;
}

// the pass a change of view starts with (one that is done in a few frames), and the finest one
function pickLevels() {
  baseLevel = 1;
  if (budget >= 1000) { baseLevel = 2; }
  if (budget >= 4000) { baseLevel = 3; }
  if (budget >= 16000) { baseLevel = 4; }
  // The finest pass: one that takes no more than about eight seconds. (Plain Entry also redraws
  // every stroke on the stage in every frame, so it stops at cells of 4.) Until the pace is known
  // - the budget still grows - the machine counts as fast. The Q key takes it one pass further
  let rate = budget * 60;
  if (paceKnown == 1 && fpsNow < 60) { rate = budget * fpsNow; }
  maxLevel = 3;
  if (paceKnown == 0 || rate >= 4000) { maxLevel = 4; }
  if (paceKnown == 0 || rate >= 16000) { maxLevel = 5; }
  if (hiq == 1 && maxLevel < 5) { maxLevel = maxLevel + 1; }
  // strokes a clone draws before the next one takes over: a fast machine gets longer bands, so a
  // band lasts a few frames
  bandMax = 1500;
  if (budget > 750) { bandMax = budget * 2; }
  if (bandMax > 6000) { bandMax = 6000; }
}

function startPass(level) {
  rGen = rGen + 1; rLevel = level; rView = vgen; rState = 1;
  pcx = vcx; pcy = vcy; pupp = vupp; pmode = cmode;
  pT = tPar; pAr = aRe; pAi = aIm;
  cs = LCS[level];
  cols = idiv(480, cs);
  rows = idiv(270 + cs - 1, cs);
  // (a slow machine works a row in pieces, so a frame stays short)
  segLen = cols;
  if (budget < segLen) { segLen = budget; }
  rRow = 0; rCol = 0;
  newBand();
}

function passDone() {
  // this pass covers everything older
  killGen = rGen - 1;
  pickLevels();
  if (vgen != rView) { pickLevels(); startPass(baseLevel); }
  else {
    if (rLevel < maxLevel && gridOn == 0 && view3 == 0) { startPass(rLevel + 1); }
    else { rState = 0; rHand = 1; }
  }
}

// one frame's work of the clone whose turn it is
function renderSlice() {
  // (fDone: the cells worked in this frame - a clone made in a frame may get its turn in the same frame)
  rHand = 0;
  penSize(cs + 0.5);
  while (fDone < budget && rHand == 0) {
    doSegment();
    fDone = fDone + segN;
    if (rRow >= rows) { passDone(); }
    else {
      // the view changed: a fine pass is given up (the first pass is short, it is finished)
      if (vgen != rView && rLevel > baseLevel) { pickLevels(); startPass(baseLevel); }
      else { if (rCol == 0 && bandStrokes >= bandMax) { newBand(); } }
    }
  }
  // (a frame that used at least half its share counts as a working one - a picture drawn anew
  // every frame, as while t runs, may never fill it)
  if (fDone * 2 >= budget) { workN = workN + 1; }
  if (fDone >= budget) { fDone = budget + 1000000; }
}

function penIdle() {
  if (ready == 1) {
    if (bandMade < activeBand + 2) { bandMade = bandMade + 1; cloneSelf(); }
    // (nothing new while the grid picture or a mesh covers it)
    if (rState == 0 && vgen != rView && gridOn == 0 && view3 == 0) { pickLevels(); startPass(baseLevel); }
  }
}

on('start', 'pen', function () {
  hide();
  for (;;) { penIdle(); }
});

// a clone: its number, and the pass it drew for (0 until its turn comes)
on('clone', 'pen', function () {
  bandBorn = bandBorn + 1;
  pen$my = bandBorn; pen$gen = 0;
  for (;;) {
    if (pen$my == activeBand) {
      if (rState == 1) {
        if (pen$gen == 0) { pen$gen = rGen; }
        renderSlice();
      }
    } else {
      if (pen$gen > 0 && pen$gen <= killGen) { deleteClone(); }
    }
  }
});

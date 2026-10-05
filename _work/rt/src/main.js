// ============================================================
// Main loop, controls, quality, the read-out
//
// tessvm runs the work at 60 ticks a second and, when a tick takes longer than
// 1/60 s, runs up to four ticks before it shows a picture. A work that is a
// little too slow is therefore shown at a quarter of its tick rate. So the
// picture has to be made in well under 1/60 s, and AUTO steps the quality down
// as soon as a wall-clock second holds fewer than 57 ticks.
//
// Interlace (the 'i' levels): the picture has 270 lines but a tick traces 135.
// While the camera moves, pen A draws the even lines two units thick (a full
// picture of 135 rows, 60 times a second). Once it rests, a tick traces the odd
// lines and the next one the even lines, and pen B (in front of A, one unit
// thick) and pen A draw them together: 270 lines, renewed 30 times a second.
// ============================================================
const SPEED = 4.2;        // units a second
const TURN = 85;          // degrees a second
const NQ = 7;

let qLevel = 3, autoQ = 1, paused = 0, tAnim = 0;
let hudText = ' ', hudOn = 1;
let ilace = 0, still = 0, field = 0, yOff = 0, bArmed = 0, bTick = 0, bUsed = 0, bWait = 0, bClear = 0, bHas = 0;
let pX = 0, pY = 0, pZ = 0, pYaw = 0, pPitch = 0, qChanged = 1;
let tpsNow = 60, tpsN = 0, tpsSec = -1, tpsSkip = 4;
let qGood = 0, qHold = 6, qTried = 0, skipN = 1;
let kLatch = 0, tPrev = 0;

// quality: 1 finest .. 7 coarsest
//   level   lines        pixels between rays
//   1       270          2
//   2       270          4
//   3       270i (135)   3
//   4       270i (135)   5
//   5       270i (135)   8
//   6       90           5
//   7       68           6
function setQuality(q) {
  qLevel = q; qChanged = 1;
  rowH = 1; stride = 2; bisGap = 2; ilace = 0;
  if (q == 1) { bisGap = 1; }
  if (q == 2) { stride = 4; }
  if (q == 3) { rowH = 2; stride = 3; ilace = 1; }
  if (q == 4) { rowH = 2; stride = 5; ilace = 1; }
  if (q == 5) { rowH = 2; stride = 8; ilace = 1; }
  if (q == 6) { rowH = 3; stride = 5; }
  if (q == 7) { rowH = 4; stride = 6; }
  nrow = idiv(270 + rowH - 1, rowH);
  // a row's ray goes through line v; its stroke is centred yOff below that
  v0 = 135 - idiv(rowH, 2);
  yOff = idiv(rowH, 2) - rowH / 2;
  // the order of the rows: key rows two apart, each followed by the row between it and the one before
  let n = 0, k = 0;
  if (vreuse == 1) {
    n = 1; ROWSEQ[1] = 0; ROWMD[1] = 1;
    k = 2;
    while (k < nrow) {
      n = n + 1; ROWSEQ[n] = k; ROWMD[n] = 1;
      n = n + 1; ROWSEQ[n] = k - 1; ROWMD[n] = 2;
      k = k + 2;
    }
    if (n < nrow) { n = n + 1; ROWSEQ[n] = nrow - 1; ROWMD[n] = 0; }
  } else {
    while (n < nrow) { n = n + 1; ROWSEQ[n] = n - 1; ROWMD[n] = 0; }
  }
  DTH[1] = 8; DTH[2] = 8; DTH[3] = 8; DTH[4] = 8;
  if (dither == 1) { DTH[1] = 2; DTH[2] = 10; DTH[3] = 6; DTH[4] = 14; }
  penSize(rowH);
}

function control(dt) {
  let mv = Math.round(SPEED * dt * WS), tn = TURN * dt;
  if (key(37)) { yaw = yaw - tn; }
  if (key(39)) { yaw = yaw + tn; }
  if (key(38)) { pitch = pitch + tn * 0.7; }
  if (key(40)) { pitch = pitch - tn * 0.7; }
  if (pitch > 80) { pitch = 80; }
  if (pitch < -80) { pitch = -80; }
  let sy = sind(yaw), cy = cosd(yaw);
  let fwd = 0, side = 0, up = 0;
  if (key(87)) { fwd = fwd + mv; }
  if (key(83)) { fwd = fwd - mv; }
  if (key(68)) { side = side + mv; }
  if (key(65)) { side = side - mv; }
  if (key(69)) { up = up + mv; }
  if (key(81)) { up = up - mv; }
  camX = camX + Math.round(sy * fwd + cy * side);
  camZ = camZ + Math.round(cy * fwd - sy * side);
  camY = camY + up;
  // stay above the floor, inside the yard, outside the spheres
  if (camY < 260) { camY = 260; }
  if (camY > 12000) { camY = 12000; }
  if (camX > 14000) { camX = 14000; }
  if (camX < -14000) { camX = -14000; }
  if (camZ > 14000) { camZ = 14000; }
  if (camZ < -14000) { camZ = -14000; }
  let i = 1;
  while (i <= NS + NM) {
    let dx = camX - SWX[i], dy = camY - SWY[i], dz = camZ - SWZ[i];
    let need = SRAD[i] + 420;
    if (i > NS) { need = SRAD[i] + 60; }
    let d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < need * need) {
      let d = Math.sqrt(d2);
      if (d < 1) { d = 1; dy = 1; }
      camX = SWX[i] + Math.round(dx * need / d); camY = SWY[i] + Math.round(dy * need / d); camZ = SWZ[i] + Math.round(dz * need / d);
      if (camY < 260) { camY = 260; }
    }
    i = i + 1;
  }
  // keys that act once per press
  let kn = 0;
  if (key(49)) { kn = 1; }
  if (key(50)) { kn = 2; }
  if (key(51)) { kn = 3; }
  if (key(52)) { kn = 4; }
  if (key(53)) { kn = 5; }
  if (key(54)) { kn = 6; }
  if (key(55)) { kn = 7; }
  if (key(48)) { kn = 10; }
  if (key(32)) { kn = 11; }
  if (key(72)) { kn = 12; }
  if (key(84)) { kn = 13; }
  if (kn != kLatch) {
    kLatch = kn;
    if (kn >= 1) { if (kn <= NQ) { autoQ = 0; setQuality(kn); } }
    if (kn == 10) { autoQ = 1; qGood = 0; qHold = 6; qTried = 0; }
    if (kn >= 1) { if (kn <= NQ) { skipN = 1; } }
    if (kn == 11) { paused = 1 - paused; }
    if (kn == 12) { hudOn = 1 - hudOn; }
    if (kn == 13) { dither = 1 - dither; setQuality(qLevel); }
  }
}

// once a wall-clock second: ticks in that second, the read-out, and in AUTO the quality step
function stats() {
  tpsN = tpsN + 1;
  let sec = dateSec();
  if (sec != tpsSec) {
    tpsSec = sec;
    if (tpsSkip > 0) { tpsSkip = tpsSkip - 1; }
    else {
      tpsNow = tpsN;
      if (autoQ == 1) {
        if (tpsNow < 57) {
          // too slow: coarser at once. If a finer level was just tried, remember how much work it was
          // and wait twice as long before trying again
          if (qTried == 1) { qHold = qHold * 2; if (qHold > 90) { qHold = 90; } }
          if (qLevel < NQ) { setQuality(qLevel + 1); }
          else { if (skipN < 4) { skipN = skipN + 1; } }
          qGood = 0; qTried = 0;
          // (the second in which the level changed still holds slow ticks: it is not judged)
          tpsSkip = 1;
        } else {
          qGood = qGood + 1;
          if (qGood >= 3) { qTried = 0; }
          if (qGood >= qHold) {
            qGood = 0;
            if (skipN > 1) { skipN = skipN - 1; qTried = 1; }
            else { if (qLevel > 1) { setQuality(qLevel - 1); qTried = 1; } }
            tpsSkip = 1;
          }
        }
      }
    }
    tpsN = 0;
    if (hudOn == 1) {
      let m = 'AUTO';
      if (autoQ == 0) { m = 'SET'; }
      let res = `480x${nrow}`;
      if (ilace == 1) { res = '480x270i'; }
      let pic = tpsNow;
      if (skipN > 1) { pic = Math.round(tpsNow / skipN); }
      hudText = `${pic} fps  ${res}  Q${qLevel} ${m}  rays ${nsamp}`;
    } else { hudText = ' '; }
  }
}

function frameStep() {
  let t = timer();
  let dt = t - tPrev;
  tPrev = t;
  if (dt > 0.1) { dt = 0.1; }
  if (dt < 0) { dt = 0; }
  control(dt);
  if (paused == 0) { tAnim = tAnim + dt; }
  if (mod(frames, skipN) == 0) { drawStep(t); }
  stats();
  frames = frames + 1;
}

// one picture (or, interlaced and at rest, half of one)
function drawStep(t) {
  // how many ticks has the camera rested?
  still = still + 1;
  if (camX != pX) { still = 0; }
  if (camY != pY) { still = 0; }
  if (camZ != pZ) { still = 0; }
  if (yaw != pYaw) { still = 0; }
  if (pitch != pPitch) { still = 0; }
  if (qChanged == 1) { still = 0; qChanged = 0; }
  pX = camX; pY = camY; pZ = camZ; pYaw = yaw; pPitch = pitch;
  // which lines this tick traces. A resting interlaced picture takes two ticks: the odd lines
  // first (kept), then the even ones, and both are drawn together - so the two halves always
  // show the same moment, and the scene moves on once per pair
  field = 0;
  if (ilace == 1) {
    if (mod(still, 2) == 1) { field = 1; }
    v0 = 135 - field;
    yOff = field / 2 - 1;
  }
  if (ilace == 0) { animate(tAnim); }
  else { if (still == 0) { animate(tAnim); } else { if (field == 1) { animate(tAnim); } } }
  sBase = field * PALN; sRun0 = field * RUNH; sRunMax = sRun0 + RUNH;
  camSetup();
  meshSetup();
  mapBuild();
  renderRows();
  if (field == 0) {
    eraseAll();
    flushRuns(0, nused);
    // the camera moved (or the level has no odd lines): odd lines traced or drawn before are void
    let drop = 0;
    if (still == 0) { drop = 1; }
    if (ilace == 0) { drop = 1; }
    if (drop == 1) {
      if (bArmed == 1) { dropRuns(PALN, bUsed); bArmed = 0; }
      if (bHas == 1) { bClear = 1; }
    }
  } else {
    // the odd lines are ready: pen B draws them in the tick pen A draws the even ones
    bUsed = nused; bArmed = 1; bTick = t; bWait = skipN - 1;
  }
}

on('start', 'cam', function () {
  hide();
  fillList0();
  meshInit();
  sceneInit();
  buildTables();
  vreuse = VREUSE;
  setQuality(QSTART);
  autoQ = QAUTO;
  timerStart();
  for (;;) { frameStep(); }
});

// pen B: the odd lines of a resting interlaced picture. It draws them one tick after they were
// traced - the tick pen A draws the even lines - whichever of the two objects runs first in a tick
on('start', 'penb', function () {
  hide();
  penSize(1);
  for (;;) {
    if (bClear == 1) { eraseAll(); bClear = 0; bHas = 0; }
    if (bArmed == 1) {
      if (timer() != bTick) {
        // (when pictures are made only every few ticks, pen A draws that many ticks later)
        if (bWait > 0) { bWait = bWait - 1; }
        else { eraseAll(); flushRuns(PALN, bUsed); bArmed = 0; bHas = 1; }
      }
    }
  }
});

on('start', 'hud', function () {
  let shown = '';
  for (;;) {
    if (hudText != shown) { shown = hudText; write(shown); }
  }
});

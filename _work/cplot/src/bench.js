// ============================================================
// Timing in the real engine (a build with BENCH = 1 runs this instead of the grapher)
// ============================================================
let done = 0;
let BT = [];
function benchFill(n) {
  let j = 1, x = -3.7, y = 0.37;
  while (j <= n) { VR[j] = x; VI[j] = y; x = x + 0.0625; j = j + 1; }
}
function benchOp(op, reps, n) {
  let k = 0, t0 = timer();
  while (k < reps) { execOp(op, RW, 0, 0, n); k = k + 1; }
  BT.push((timer() - t0) * 1000000 / (reps * n));
}
function benchRun() {
  let k = 0, t0 = 0, n = 120, reps = 20;
  benchFill(n);
  // 1: filling z
  t0 = timer(); k = 0;
  while (k < reps) { benchFill(n); k = k + 1; }
  BT.push((timer() - t0) * 1000000 / (reps * n));
  // 2..: one operation each (microseconds per cell)
  benchOp(O_COPY, reps, n);
  benchOp(O_ADD, reps, n);
  benchOp(O_MUL, reps, n);
  benchOp(O_DIV, reps, n);
  benchOp(O_ADDC, reps, n);
  benchOp(O_MULC, reps, n);
  benchOp(O_SQR, reps, n);
  benchOp(O_RECIP, reps, n);
  benchOp(O_SQRT, reps, n);
  benchOp(O_EXP, reps, n);
  benchOp(O_LN, reps, n);
  benchOp(O_SIN, reps, n);
  benchOp(O_TAN, reps, n);
  // 15: the whole program of the first example
  t0 = timer(); k = 0;
  while (k < reps) { benchFill(n); runProg(n); k = k + 1; }
  BT.push((timer() - t0) * 1000000 / (reps * n));
  // 16: colours and strokes
  cs = 4; pmode = 1;
  t0 = timer(); k = 0;
  while (k < reps) { paintRow(n, -240, 100 - k * 4); k = k + 1; }
  BT.push((timer() - t0) * 1000000 / (reps * n));
  BT.push(nStrokes);
  // 18: the empty call of an operation, per call
  t0 = timer(); k = 0;
  while (k < 2000) { execOp(O_COPY, RW, 0, 0, 0); k = k + 1; }
  BT.push((timer() - t0) * 1000000 / 2000);
}

// BENCH = 2: every formula of TF at six points -> TO (the harness compares it with the simulator's)
let TO = [];
function selfTest() {
  let k = 1, j = 0, ro = 0;
  while (k <= TF.length) {
    src = TF[k];
    compile();
    if (cerr != 0) { TO.push(`E${cerr}`); }
    else {
      VR[1] = 0.7; VI[1] = 0.4; VR[2] = -1.3; VI[2] = 0.9; VR[3] = -0.6; VI[3] = -1.7;
      VR[4] = 2.2; VI[4] = -0.3; VR[5] = 0.01; VI[5] = 0.02; VR[6] = -12.5; VI[6] = 7.25;
      runProg(6);
      ro = resOff;
      j = 1;
      while (j <= 6) { TO.push(VR[ro + j]); TO.push(VI[ro + j]); j = j + 1; }
    }
    k = k + 1;
  }
}

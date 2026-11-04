// ============================================================
// TEST > 0: a run with no one at it, for the harness (OUT gets the numbers, done = 1)
//   TEST = 1: scene TSCN in mode TMODE for TFRAMES frames
// ============================================================
function testStep() {
  if (TEST == 2) { running = 0; benchRun(); done = 1; }
  if (TEST == 1 && frameN >= TFRAMES) {
    energy();
    OUT.push(simT); OUT.push(eTot); OUT.push(eKin); OUT.push(ePot); OUT.push(eElastic); OUT.push(nC);
    sceneText();
    OUT.push(mText);
    done = 1;
  }
}
// TEST = 2: microseconds of the pieces of a step in the real engine (OUT: name, us)
function benchApply() {
  let i = 1, t = 1, ta = 0, tb = 0, tc = 0, td = 0, x0 = 0, y0 = 0, z0 = 0, vol = 0, mu = 0, la = 0, c0 = 0, w0 = 0;
  let qa = 0, qb = 0, qc = 0, qd = 0;
  let r11 = 0, r12 = 0, r13 = 0, r21 = 0, r22 = 0, r23 = 0, r31 = 0, r32 = 0, r33 = 0;
  let d1x = 0, d1y = 0, d1z = 0, d2x = 0, d2y = 0, d2z = 0, d3x = 0, d3y = 0, d3z = 0;
  let m11 = 0, m12 = 0, m13 = 0, m21 = 0, m22 = 0, m23 = 0, m31 = 0, m32 = 0, m33 = 0;
  let f1x = 0, f1y = 0, f1z = 0, f2x = 0, f2y = 0, f2z = 0, f3x = 0, f3y = 0, f3z = 0;
  let e11 = 0, e12 = 0, e13 = 0, e22 = 0, e23 = 0, e33 = 0;
  let p1x = 0, p1y = 0, p1z = 0, p2x = 0, p2y = 0, p2z = 0, p3x = 0, p3y = 0, p3z = 0;
  let g1x = 0, g1y = 0, g1z = 0, g2x = 0, g2y = 0, g2z = 0, g3x = 0, g3y = 0, g3z = 0;
  M_kapply(VX, VY, VZ, CX, CY, CZ, 1, 0, 1, 0);
}
function benchOne(name, k) {
  let t0 = 0, n = 5;
  t0 = timer();
  for (const _ of rep(n)) {
    if (k == 1) { softForces(); }
    if (k == 2) { softContacts(stepH); }
    if (k == 3) { benchApply(); }
    if (k == 4) { softFast(stepH); }
    if (k == 5) { stepAll(); }
    if (k == 6) { render(); }
    if (k == 7) { energy(); }
    if (k == 8) { softKick(0); }
    if (k == 9) { softDrift(0); }
    if (k == 11) { M_noop(); }
    if (k == 12) { softSoft(stepH); }
  }
  OUT.push(name); OUT.push(Math.round((timer() - t0) / n * 1000000));
}
function benchRun() {
  sceneLoad(TSCN);
  benchOne('forces', 1); benchOne('contacts', 2); benchOne('K apply', 3); benchOne('fast step', 4);
  setMode(1); benchOne('step acc', 5); setMode(2); benchOne('step fast', 5);
  benchOne('render', 6); benchOne('energy', 7); benchOne('kick', 8); benchOne('drift', 9); benchOne('nothing', 11); benchOne('soft-soft', 12);
  OUT.push('nT'); OUT.push(nT);
}

function M_noop() { done = 0; }

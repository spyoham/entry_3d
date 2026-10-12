// ============================================================
// A build with TEST = 1 reads TESTOBJ, and once the model itself is drawn puts
// what it made of it in OUT (the harness compares the engines with the simulator)
// ============================================================
function testOut() {
  let i = 1, a = 0, v = 0, p = 1;
  OUT.push(nFaces); OUT.push(nVerts); OUT.push(nPages); OUT.push(rawN); OUT.push(nDup); OUT.push(nMat);
  OUT.push(closed); OUT.push(flipped); OUT.push(two); OUT.push(nBad); OUT.push(nDrop);
  OUT.push(LVG[1]); OUT.push(nLv); OUT.push(LVN[2]); OUT.push(LVN[3]); OUT.push(PNV[NP + 1]); OUT.push(PNV[NP + 2]);
  // the triangles of the first page whose front is seen
  for (const _ of rep(PNF[1])) {
    if (NA1[i] * eyeX + NB1[i] * eyeY + NC1[i] * eyeZ - ND1[i] > 0) { v = v + 1; }
    i = i + 1;
  }
  OUT.push(v);
  OUT.push(Math.round(bk * 1000000)); // (the middle of the box, to a thousandth - with a little added, so that a middle that falls
  // on half a thousandth is not rounded one way by decimal arithmetic and the other by binary)
  OUT.push(Math.round(bcx * 1000 + 0.137)); OUT.push(Math.round(bcy * 1000 + 0.137)); OUT.push(Math.round(bcz * 1000 + 0.137));
  i = 1;
  for (const _ of rep(PNV[1])) { a = a + Math.round(SX1[i] * 16) + Math.round(SY1[i] * 16) * 3; i = i + 1; }
  OUT.push(a);
  OUT.push(RAMP[1]); OUT.push(RAMP[RS]);
  OUT.push(CL1[1]);
}

// TEST = 2: the cost of each step in the real engine, microseconds an item
// (the harness makes the timer block read the wall clock)
function benchRun() {
  let k = 0, t0 = 0, p = BENCHPG, nv = PNV[BENCHPG], nf = PNF[BENCHPG], reps = 12;
  rTwo = BENCHTWO; rOut = 0; rMulti = 0; rPg1 = p; rBig = BENCHBIG;
  setMatrix(nf);
  t0 = timer(); k = 0;
  while (k < reps) { xfPage(p, 1, nv); k = k + 1; }
  OUT.push((timer() - t0) * 1000000 / (reps * nv));
  t0 = timer(); k = 0;
  while (k < reps) { clearHeads(); psPage(p, 1, nf, 0); k = k + 1; }
  OUT.push((timer() - t0) * 1000000 / (reps * nf));
  clearHeads();
  t0 = timer(); k = 0;
  while (k < reps) { psPage(p, 1, nf, 0); drawBegin(); drawSome(dB); k = k + 1; }
  OUT.push((timer() - t0) * 1000000 / (reps * nf));
  rOut = 1;
  t0 = timer(); k = 0;
  while (k < reps) { psPage(p, 1, nf, 0); drawBegin(); drawSome(dB); k = k + 1; }
  OUT.push((timer() - t0) * 1000000 / (reps * nf));
  OUT.push(nv); OUT.push(nf); OUT.push(rVis);
  t0 = timer(); k = 0;
  while (k < reps) { renderLevel(BENCHLV); k = k + 1; }
  OUT.push((timer() - t0) * 1000 / reps);
}

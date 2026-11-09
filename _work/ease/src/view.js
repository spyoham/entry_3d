// ============================================================
// What is drawn. Two objects draw: `bg` the parts that change only when the settings do
// (panels, sliders, the ease graph, the manifold and its paths, the globe, the keys'
// ghosts), and `pen` what moves with t (the word, the object, the markers). Each erases
// and draws all of its own when it has to.
// ============================================================
let bgGen = 1, bgShown = 0, fgGen = 1, TBY = 8;
let AXC = ['#ff7b7b', '#ffd166', '#7bdff2', '#b8f2a0', '#cdb4ff', '#f4a261', '#ff9ad5'];
let KC = ['#4fc3ff', '#ffa94a', '#7cf29c', '#e98cff'];
let TAG = ['WGHT', 'WDTH', 'SLNT', 'SQAR', 'CONT', 'NIBA', 'HUE'];
let TAG3 = ['PLACE', 'TURN', 'SIZE', 'HUE'];
let PPX = [], PPY = [], PPD = [], NPX = [], NPY = [], NPD = [];
let GKX = [0, 0], GKY = [0, 0];
let vAz = 35, vEl = 24, mvR = 44, qx = 0, qy = 0, qz = 0, vx = 0, vy = 0, vd = 0;

function rectFill(x0, y0, x1, y1, col) {
  fillStop(); goto(x0, y0); fillColorHex(col); fillStart(); goto(x1, y0); goto(x1, y1); goto(x0, y1); fillStop();
}
function line(x0, y0, x1, y1) {
  penUp(); goto(x0, y0); penDown(); goto(x1, y1); penUp();
}
// a dot: a square of side 2r drawn with the pen (pen lines lie over fills, and the
// markers have to be over the lines they mark)
function dot(x, y, r, col) {
  penColorHex(col); penSize(2 * r); line(x - r, y, x + r, y);
}
// a round-ish dot: two squares, one turned by 45 degrees (an octagon)
function disk(x, y, r, col) {
  let a = 0.9 * r, b = 0.636 * r;
  penColorHex(col); penSize(2 * a); line(x - a, y, x + a, y); line(x - b, y - b, x + b, y + b);
}
function ring(x, y, r, n) {
  let k = 1, a = 360 / n;
  penUp(); goto(x + r, y); penDown();
  for (const _ of rep(n)) { goto(x + r * cosd(k * a), y + r * sind(k * a)); k = k + 1; }
  penUp();
}
function fmt(x, d) {
  let p = 1;
  for (const _ of rep(d)) { p = p * 10; }
  return Math.round(x * p) / p;
}

// ---- the ease graph (right, top): e(t) for t in [0, 1], e from -0.45 to 1.45 ----
function egX(t) {
  let x = EGX0 + t * (EGX1 - EGX0);
  return x;
}
function egY(v) {
  let y = EGY0 + (clamp(v, -0.5, 1.5) + 0.45) / 1.9 * (EGY1 - EGY0);
  return y;
}
function easeCurve(k, col, th) {
  let i = 0;
  penColorHex(col); penSize(th);
  penUp();
  for (const _ of rep(NEG + 1)) {
    goto(egX(i / NEG), egY(ease(k, i / NEG)));
    penDown();
    i = i + 1;
  }
  penUp();
}
function drawEaseGraph() {
  let i = 1, j = 0, uses = 0, n = 0;
  rectFill(EGX0 - 4, EGY0 - 6, EGX1 + 4, EGY1 + 4, PANEL);
  penSize(1); penColorHex('#2e3647');
  line(EGX0, egY(0), EGX1, egY(0)); line(EGX0, egY(1), EGX1, egY(1));
  line(EGX0, EGY0, EGX0, EGY1); line(EGX1, EGY0, EGX1, EGY1);
  penColorHex('#59627a');
  drawText('0', EGX0 - 4, egY(0) - 2, 5, 2); drawText('1', EGX0 - 4, egY(1) - 2, 5, 2);
  drawText('T', EGX1 - 2, EGY0 - 4, 5, 0);
  if (easeK == 15) { uses = 1; }
  if (perAx == 1 && (rig == 2 || nKeys == 2)) {
    // one curve an axis (or a factor)
    if (rig == 1) {
      for (const _ of rep(7)) {
        if (EAX[i] == 15) { uses = 1; }
        easeCurve(EAX[i], AXC[i], 1.5);
        i = i + 1;
      }
    } else {
      for (const _ of rep(4)) { if (EA3[i] == 15) { uses = 1; } easeCurve(EA3[i], AXC[i * 2 - 1], 1.5); i = i + 1; }
    }
  } else {
    easeCurve(easeK, '#f2f5ff', 2);
  }
  if (uses == 1) {
    // the handles of the user's Bezier
    penSize(1); penColorHex('#8ea0c8');
    line(egX(0), egY(0), egX(BZ[1]), egY(BZ[2]));
    line(egX(1), egY(1), egX(BZ[3]), egY(BZ[4]));
    disk(egX(BZ[1]), egY(BZ[2]), 3.5, '#ffd84a');
    disk(egX(BZ[3]), egY(BZ[4]), 3.5, '#ffd84a');
  }
  bzShown = uses;
}
let bzShown = 0;

// ---- the time bar ----
function drawTimeBar() {
  let nk = nKeys;
  penSize(3); penColorHex('#2b3243');
  line(TB0, TBY, TB1, TBY);
  penSize(1); penColorHex('#59627a');
  if (rig == 2) { nk = 2; }
  drawText(KN[1 + rev * (nk - 1)], TB0 - 4, TBY - 2.5, 5, 2);
  drawText(KN[nk - rev * (nk - 1)], TB1 + 4, TBY - 2.5, 5, 0);
}
let KN = ['A', 'B', 'C', 'D'];

// ---- the manifold picture (right, bottom): the font's M seen from (vAz, vEl) ----
function M_view(x, y, z) {
  vx = x * cosd(vAz) + z * sind(vAz);
  vd = z * cosd(vAz) - x * sind(vAz);
  vy = MVCY + mvR * (y * cosd(vEl) - vd * sind(vEl));
  vd = vd * cosd(vEl) + y * sind(vEl);
  vx = MVCX + mvR * vx;
}
// a point of manifold mt (slot) -> picture qx qy qz
function mPic(mt, slot) {
  let O = slot * 10, n = nAct, r = 0;
  qx = 0; qy = 0; qz = 0;
  if (mt == 1) { qx = V[O + 1] * 0.62; if (n >= 2) { qz = V[O + 2] * 0.62; } if (n >= 3) { qy = V[O + 3] * 0.62; } }
  if (mt == 2) { qx = V[O + 1]; qz = V[O + 2]; if (n >= 2) { qy = V[O + n + 1]; } }
  if (mt == 3) { qx = V[O + 1]; if (n >= 2) { qz = V[O + 2]; } if (n >= 3) { qy = V[O + 3]; } }
  if (mt == 4) {
    if (n == 1) { qx = cosr(V[O + 1]) * 0.8; qz = sinr(V[O + 1]) * 0.8; }
    else { r = 0.7 + 0.3 * cosr(V[O + 2]); qx = r * cosr(V[O + 1]); qz = r * sinr(V[O + 1]); qy = 0.3 * sinr(V[O + 2]); }
  }
}
// a wire circle of the picture: centre (cx cy cz), axes u and w; front lines bright,
// back lines dim (pass 0 the back, 1 the front)
function wire(cx, cy, cz, ux, uy, uz, wx, wy, wz, pass) {
  let k = 0, a = 0, d0 = 0, x0 = 0, y0 = 0, x = 0, y = 0, z = 0;
  for (const _ of rep(37)) {
    a = k * 10;
    x = cx + ux * cosd(a) + wx * sind(a); y = cy + uy * cosd(a) + wy * sind(a); z = cz + uz * cosd(a) + wz * sind(a);
    M_view(x, y, z);
    if (k > 0) {
      if ((vd + d0 >= 0) == (pass == 1)) { line(x0, y0, vx, vy); }
    }
    x0 = vx; y0 = vy; d0 = vd;
    k = k + 1;
  }
}
function drawWire(pass) {
  let n = nAct, k = 0, a = 0, x = 0, y = 0;
  if (pass == 0) { penColorHex('#2a3142'); } else { penColorHex('#46506a'); }
  penSize(1);
  if (fMt == 1) {
    if (n == 1) { if (pass == 1) { M_view(-0.62, 0, 0); x = vx; y = vy; M_view(0.62, 0, 0); line(x, y, vx, vy); } }
    else {
      a = 0.62;
      if (n == 2) { wireSq(0, pass); } else { wireSq(-a, pass); wireSq(a, pass); wireUp(pass); }
    }
  }
  if (fMt == 2) {
    if (n == 1) { wire(0, 0, 0, 1, 0, 0, 0, 0, 1, pass); }
    else {
      wire(0, 0, 0, 1, 0, 0, 0, 0, 1, pass);
      wire(0, 0, 0, 1, 0, 0, 0, 1, 0, pass);
      wire(0, 0, 0, 0, 0, 1, 0, 1, 0, pass);
      wire(0, 0.5, 0, 0.866, 0, 0, 0, 0, 0.866, pass);
    }
  }
  if (fMt == 3) {
    if (n == 1) { if (pass == 1) { M_view(-1, 0, 0); x = vx; y = vy; M_view(1, 0, 0); line(x, y, vx, vy); } }
    else {
      // the rim, and the circles at hyperbolic distance 1, 2, 3 from the middle
      wire(0, 0, 0, 1, 0, 0, 0, 0, 1, pass);
      wire(0, 0, 0, 0.462, 0, 0, 0, 0, 0.462, pass);
      wire(0, 0, 0, 0.762, 0, 0, 0, 0, 0.762, pass);
      wire(0, 0, 0, 0.905, 0, 0, 0, 0, 0.905, pass);
      if (n >= 3) { wire(0, 0, 0, 1, 0, 0, 0, 1, 0, pass); wire(0, 0, 0, 0, 0, 1, 0, 1, 0, pass); }
    }
  }
  if (fMt == 4) {
    if (n == 1) { wire(0, 0, 0, 0.8, 0, 0, 0, 0, 0.8, pass); }
    else {
      wire(0, 0, 0, 1, 0, 0, 0, 0, 1, pass); wire(0, 0, 0, 0.4, 0, 0, 0, 0, 0.4, pass);
      wire(0, 0.3, 0, 0.7, 0, 0, 0, 0, 0.7, pass); wire(0, -0.3, 0, 0.7, 0, 0, 0, 0, 0.7, pass);
      k = 0;
      for (const _ of rep(8)) {
        a = k * 45;
        wire(0.7 * cosd(a), 0, 0.7 * sind(a), 0.3 * cosd(a), 0, 0.3 * sind(a), 0, 0.3, 0, pass);
        k = k + 1;
      }
    }
  }
}
// the square of the box at height h (y), and its upright edges
function wireSq(h, pass) {
  let a = 0.62;
  wire4(0 - a, h, 0 - a, a, h, 0 - a, pass); wire4(a, h, 0 - a, a, h, a, pass);
  wire4(a, h, a, 0 - a, h, a, pass); wire4(0 - a, h, a, 0 - a, h, 0 - a, pass);
}
function wireUp(pass) {
  let a = 0.62;
  wire4(0 - a, 0 - a, 0 - a, 0 - a, a, 0 - a, pass); wire4(a, 0 - a, 0 - a, a, a, 0 - a, pass);
  wire4(a, 0 - a, a, a, a, a, pass); wire4(0 - a, 0 - a, a, 0 - a, a, a, pass);
}
function wire4(x0, y0, z0, x1, y1, z1, pass) {
  let d = 0, ax = 0, ay = 0;
  M_view(x0, y0, z0); ax = vx; ay = vy; d = vd;
  M_view(x1, y1, z1);
  if ((vd + d >= 0) == (pass == 1)) { line(ax, ay, vx, vy); }
}

// the paths of the font on M (along the manifold and, dimmer, straight in the chart),
// sampled at equal steps of t so the spacing shows the speed
function samplePaths() {
  let k = 0, t = 0;
  for (const _ of rep(NSP + 1)) {
    t = k / NSP;
    evalFont(fMt, t);
    if (nAct > 0) { mPic(fMt, 2); M_view(qx, qy, qz); }
    PPX[k + 1] = vx; PPY[k + 1] = vy; PPD[k + 1] = vd;
    if (cmp == 1 && fMt != 1) {
      evalFont(1, t);
      axToM(fMt, 3); mPic(fMt, 3); M_view(qx, qy, qz);
      NPX[k + 1] = vx; NPY[k + 1] = vy; NPD[k + 1] = vd;
    }
    k = k + 1;
  }
}
function drawPath(L, col, th) {
  let k = 1;
  penColorHex(col); penSize(th); penUp();
  for (const _ of rep(NSP + 1)) {
    if (L == 1) { goto(PPX[k], PPY[k]); } else { goto(NPX[k], NPY[k]); }
    penDown();
    k = k + 1;
  }
  penUp();
}
function drawManifold() {
  let k = 1;
  rectFill(EGX0 - 4, -112, EGX1 + 4, -2, PANEL);
  mvR = 44;
  if (fMt == 4) { mvR = 48; }
  if (nAct == 0) {
    penColorHex('#59627a'); penSize(1);
    drawText('NO AXIS ON', MVCX, MVCY, 6, 1);
  } else {
    drawWire(0);
    samplePaths();
    if (cmp == 1 && fMt != 1) { drawPath(2, NAIVE, 1.5); }
    drawPath(1, '#e9eefc', 2);
    // dots at equal steps of t
    k = 1;
    for (const _ of rep(NSP + 1)) { if (k % 2 == 1) { dot(PPX[k], PPY[k], 1, '#e9eefc'); } k = k + 1; }
    drawWire(1);
    // the keys
    k = 1;
    for (const _ of rep(nKeys)) {
      keyToKTraw(k); axToM(fMt, 3); mPic(fMt, 3); M_view(qx, qy, qz);
      disk(vx, vy, 3.2, KC[k]);
      penColorHex(KC[k]); penSize(1);
      drawText(KN[k], vx + 5, vy + 3, 5, 0);
      k = k + 1;
    }
  }
  penColorHex('#59627a'); penSize(1);
  drawText(str(MNAME[fMt], nAct), EGX0, -108, 6, 0);
}
let MNAME = ['R', 'S', 'H', 'T'];
// key k as stored (not in play order) into KT
function keyToKTraw(k) {
  let i = 1, b = (k - 1) * 7;
  for (const _ of rep(7)) { KT[i] = KEY[b + i]; i = i + 1; }
}

// ---- the font's sliders: tag, key A (C), key B (D), now, the axis's own ease ----
function slX(c, a) {
  let x = SAX0 + (c - 1) * (SBX0 - SAX0) + (clamp(a, -1, 1) + 1) / 2 * SAW;
  return x;
}
function slY(i) {
  let y = SLY0 - (i - 1) * SLDY;
  return y;
}
function drawSliders() {
  let i = 1, y = 0, c = 1, k = 0;
  rectFill(-238, -112, 78, 1, PANEL);
  penSize(1); penColorHex('#8a93ab');
  drawText(KN[1 + keyPage * 2], slX(1, 0), -6, 6, 1);
  drawText(KN[2 + keyPage * 2], slX(2, 0), -6, 6, 1);
  drawText('NOW', SNX0 + SNW / 2, -6, 5, 1);
  if (nKeys == 4) { drawText('A B / C D', -234, -6, 4, 0); }
  for (const _ of rep(7)) {
    y = slY(i);
    // the tag: lit when the axis is part of M
    if (ACT[i] == 1) { penColorHex(AXC[i]); } else { penColorHex('#4a5266'); }
    penSize(1);
    drawText(TAG[i], -235, y - 2.5, 5, 0);
    c = 1;
    for (const _ of rep(2)) {
      k = c + keyPage * 2;
      penSize(3); penColorHex('#2b3243'); line(slX(c, -1), y, slX(c, 1), y);
      penSize(1); penColorHex('#4a5266'); line(slX(c, 0), y - 3, slX(c, 0), y + 3);
      dot(slX(c, KEY[(k - 1) * 7 + i]), y, 3, KC[k]);
      c = c + 1;
    }
    penSize(3); penColorHex('#2b3243'); line(SNX0, y, SNX0 + SNW, y);
    if (perAx == 1 && nKeys == 2) { miniEase(EAX[i], SCX, y, AXC[i]); }
    i = i + 1;
  }
}
// an ease drawn small (16 x 9) at x, y (its middle left)
function miniEase(k, x, y, col) {
  let i = 0;
  penColorHex(col); penSize(1); penUp();
  for (const _ of rep(9)) { goto(x + i * 2, y - 4.5 + ease(k, i / 8) * 9); penDown(); i = i + 1; }
  penUp();
}

// ---- the font: the whole background ----
function bgFont() {
  rectFill(-240, -135, 240, 135, BGC);
  rectFill(-238, 14, 78, 102, PANEL);
  drawTimeBar();
  drawSliders();
  drawEaseGraph();
  drawManifold();
  penSize(1); penColorHex('#59627a');
  if (cmp == 1) {
    drawText(str(MNAME[fMt], nAct), -234, 92, 5, 0);
    drawText('CHART', -234, 47, 5, 0);
    penColorHex('#2e3647'); line(-236, 56, 76, 56);
  }
}

// ---- the 3D rig: globe or box, paths, the keys' ghosts, the turn ball, size and hue ----
function bgObj() {
  let k = 0, la = 0, lo = 0, t = 0;
  rectFill(-240, -135, 240, 135, BGC);
  rectFill(-238, -112, 78, 102, PANEL);
  camera();
  if (posMode == 1) { globe(); } else { box3(); }
  // paths: where the object goes (on the ground), at equal steps of t
  k = 0;
  for (const _ of rep(NSP + 1)) {
    t = k / NSP;
    evalObj(t);
    pathPoint(40, k, 1);
    rotVec(41); PRX[k + 1] = rvX; PRY[k + 1] = rvY; PRZ[k + 1] = rvZ;
    if (cmp == 1) {
      evalNaive(t);
      pathPoint(42, k, 2);
      rotVec(43); QRX[k + 1] = rvX; QRY[k + 1] = rvY; QRZ[k + 1] = rvZ;
    }
    k = k + 1;
  }
  if (cmp == 1) { drawPath3(2, NAIVE); }
  drawPath3(1, '#e9eefc');
  // the keys' ghosts
  k = 1;
  for (const _ of rep(2)) {
    placeModel(29 + k, 31 + k, sizeOf(K3[k * 2 - 1]), 0 - 0.8 * cmp);
    if (seen(29 + k) > 0) { penSize(1.2); lineModel(KC[k]); }
    M_proj(V[(29 + k) * 10 + 1] * posK() - 0.8 * cmp * (posMode - 1), V[(29 + k) * 10 + 2] * posK(), V[(29 + k) * 10 + 3] * posK());
    GKX[k] = sx; GKY[k] = sy;
    if (seen(29 + k) > 0) { penColorHex(KC[k]); drawText(KN[k], sx + 8, sy + 6, 7, 0); }
    if (cmp == 1 && posMode == 2) {
      placeModel(29 + k, 31 + k, sizeOf(K3[k * 2 - 1]), 0.8);
      penSize(1); lineModel('#7a4250');
    }
    k = k + 1;
  }
  drawTimeBar();
  drawEaseGraph();
  drawTurnBall();
  side3();
}
let PRX = [], PRY = [], PRZ = [], QRX = [], QRY = [], QRZ = [];
function posK() {
  let k = 1;
  if (posMode == 1) { k = 1.17; }
  return k;
}
// a sample of a path: on the globe the ground under the object, in the box the object
function pathPoint(ps, k, L) {
  let P = ps * 10, s = 1.005, d = 0;
  if (posMode == 2) { s = 1; }
  M_proj(V[P + 1] * s + (posMode - 1) * (L * 1.6 - 2.4) * cmp, V[P + 2] * s, V[P + 3] * s);
  d = 1;
  if (posMode == 1) { d = V[P + 1] * eyeX + V[P + 2] * eyeY + V[P + 3] * eyeZ - 1; }
  if (L == 1) { PPX[k + 1] = sx; PPY[k + 1] = sy; PPD[k + 1] = d; } else { NPX[k + 1] = sx; NPY[k + 1] = sy; NPD[k + 1] = d; }
}
function drawPath3(L, col) {
  let k = 1, d = 0, x0 = 0, y0 = 0, x1 = 0, y1 = 0, dl = 0;
  penSize(2); penColorHex(col);
  for (const _ of rep(NSP)) {
    if (L == 1) { x0 = PPX[k]; y0 = PPY[k]; x1 = PPX[k + 1]; y1 = PPY[k + 1]; d = Math.min(PPD[k], PPD[k + 1]); }
    else { x0 = NPX[k]; y0 = NPY[k]; x1 = NPX[k + 1]; y1 = NPY[k + 1]; d = Math.min(NPD[k], NPD[k + 1]); }
    if (d > 0) { line(x0, y0, x1, y1); }
    k = k + 1;
  }
  if (L == 1) {
    k = 1;
    for (const _ of rep(NSP + 1)) { if (PPD[k] > 0 && k % 2 == 1) { dot(PPX[k], PPY[k], 1.2, col); } k = k + 1; }
  }
}
// the globe: its disk, then parallels and meridians on the near side
function globe() {
  let k = 0, e2 = eyeX * eyeX + eyeY * eyeY + eyeZ * eyeZ, c = 0, r = 0, ax = 0, ay = 0, az0 = 0, bx = 0, by = 0, bz = 0, l = 0, a = 0;
  // the outline: the circle of points p with p . eye = 1
  c = 1 / e2; r = Math.sqrt(1 - c);
  // two axes across the eye direction
  ax = rtX; ay = rtY; az0 = rtZ; bx = upX; by = upY; bz = upZ;
  fillStop();
  k = 0;
  for (const _ of rep(37)) {
    a = k * 10;
    M_proj(eyeX * c + r * (ax * cosd(a) + bx * sind(a)), eyeY * c + r * (ay * cosd(a) + by * sind(a)), eyeZ * c + r * (az0 * cosd(a) + bz * sind(a)));
    goto(sx, sy);
    if (k == 0) { fillColorHex('#16314d'); fillStart(); }
    k = k + 1;
  }
  fillStop();
  penSize(1); penColorHex('#2d5a80');
  k = -2;
  for (const _ of rep(5)) { latLine(k * 30); k = k + 1; }
  k = 0;
  for (const _ of rep(12)) { lonLine(k * 30); k = k + 1; }
}
function latLine(la) {
  let k = 0, x0 = 0, y0 = 0, d0 = 0, d = 0, lo = 0, X = 0, Y = 0, Z = 0;
  for (const _ of rep(37)) {
    lo = k * 10;
    X = cosd(la) * sind(lo); Y = sind(la); Z = cosd(la) * cosd(lo);
    d = X * eyeX + Y * eyeY + Z * eyeZ - 1;
    M_proj(X, Y, Z);
    if (k > 0 && d > 0 && d0 > 0) { line(x0, y0, sx, sy); }
    x0 = sx; y0 = sy; d0 = d;
    k = k + 1;
  }
}
function lonLine(lo) {
  let k = 0, x0 = 0, y0 = 0, d0 = 0, d = 0, la = 0, X = 0, Y = 0, Z = 0;
  for (const _ of rep(19)) {
    la = k * 10 - 90;
    X = cosd(la) * sind(lo); Y = sind(la); Z = cosd(la) * cosd(lo);
    d = X * eyeX + Y * eyeY + Z * eyeZ - 1;
    M_proj(X, Y, Z);
    if (k > 0 && d > 0 && d0 > 0) { line(x0, y0, sx, sy); }
    x0 = sx; y0 = sy; d0 = d;
    k = k + 1;
  }
}
// the box: a floor grid (pieces that fall outside the view are left out)
function box3() {
  let k = 0, j = 0, a = 0, b = 0, ax = 0, ay = 0;
  penSize(1); penColorHex('#2b3a52');
  for (const _ of rep(7)) {
    a = -1.5 + k * 0.5;
    j = 0;
    for (const _ of rep(6)) {
      b = -1.5 + j * 0.5;
      M_proj(a, -1.1, b); ax = sx; ay = sy; M_proj(a, -1.1, b + 0.5);
      if (ay > -100 && sy > -100) { line(ax, ay, sx, sy); }
      M_proj(b, -1.1, a); ax = sx; ay = sy; M_proj(b + 0.5, -1.1, a);
      if (ay > -100 && sy > -100) { line(ax, ay, sx, sy); }
      j = j + 1;
    }
    k = k + 1;
  }
}
// the ball of turns: a turn by angle a about axis u is the point u a/pi (the rim is half
// a turn, and its opposite points are the same turn)
function ballPt(x, y, z) {
  vx = BCX + BR * (x * cosd(30) + z * sind(30));
  vd = z * cosd(30) - x * sind(30);
  vy = BCY + BR * (y * cosd(20) - vd * sind(20));
}
function drawTurnBall() {
  let k = 1, x0 = 0, y0 = 0, a = 0;
  rectFill(EGX0 - 4, -112, EGX1 + 4, -2, PANEL);
  penSize(1); penColorHex('#3a4357');
  ring(BCX, BCY, BR, 36);
  ballPt(-1, 0, 0); x0 = vx; y0 = vy; ballPt(1, 0, 0); line(x0, y0, vx, vy);
  ballPt(0, -1, 0); x0 = vx; y0 = vy; ballPt(0, 1, 0); line(x0, y0, vx, vy);
  ballPt(0, 0, -1); x0 = vx; y0 = vy; ballPt(0, 0, 1); line(x0, y0, vx, vy);
  penColorHex('#59627a');
  drawText('SO3', EGX0, -8, 5, 0);
  if (cmp == 1) { ballPath(2, NAIVE); }
  ballPath(1, '#e9eefc');
  k = 1;
  for (const _ of rep(2)) {
    rotVec(31 + k); ballPt(rvX, rvY, rvZ);
    disk(vx, vy, 2.6, KC[k]);
    k = k + 1;
  }
}
function ballPath(L, col) {
  let k = 1, x0 = 0, y0 = 0, x1 = 0, y1 = 0, z1 = 0, ox = 0, oy = 0, oz = 0;
  penColorHex(col); penSize(1.5);
  for (const _ of rep(NSP + 1)) {
    if (L == 1) { x1 = PRX[k]; y1 = PRY[k]; z1 = PRZ[k]; } else { x1 = QRX[k]; y1 = QRY[k]; z1 = QRZ[k]; }
    ballPt(x1, y1, z1);
    // (a jump across the ball is the same turn seen from its other side: not a line)
    if (k > 1 && (x1 - ox) * (x1 - ox) + (y1 - oy) * (y1 - oy) + (z1 - oz) * (z1 - oz) < 0.5) { line(x0, y0, vx, vy); }
    x0 = vx; y0 = vy; ox = x1; oy = y1; oz = z1;
    k = k + 1;
  }
}
// size and hue of the two keys
function side3() {
  let i = 1, c = 1, y = 0;
  for (const _ of rep(2)) {
    y = -82 - (i - 1) * 15;
    penSize(1); penColorHex('#8a93ab');
    if (i == 1) { drawText('SIZE', EGX0, y - 2.5, 5, 0); } else { drawText('HUE', EGX0, y - 2.5, 5, 0); }
    c = 1;
    for (const _ of rep(2)) {
      penSize(3); penColorHex('#2b3243'); line(s3X(c, -1), y, s3X(c, 1), y);
      dot(s3X(c, K3[(c - 1) * 2 + i]), y, 3, KC[c]);
      c = c + 1;
    }
    i = i + 1;
  }
}
function s3X(c, a) {
  let x = S3X0 + (c - 1) * S3DX + (clamp(a, -1, 1) + 1) / 2 * S3W;
  return x;
}

// ---- what moves ----
let curT = 0, curE = 0;
function drawFg() {
  let x = 0, k = 0, i = 1, y = 0;
  eraseAll();
  // the play head
  x = TB0 + (TB1 - TB0) * curT;
  penSize(6); penColorHex('#f2f5ff'); line(x, TBY, x + 0.5, TBY);
  penSize(1); penColorHex('#aab3c8');
  drawText(str('T ', fmt(curT, 2)), TB1 - 70, TBY + 4, 5, 0);
  drawText(str('E ', fmt(curE, 2)), TB1 - 34, TBY + 4, 5, 0);
  // the ease graph's marker
  penColorHex('#59627a'); penSize(1);
  line(egX(curT), EGY0, egX(curT), EGY1);
  if (perAx == 0 || (rig == 1 && nKeys > 2)) { disk(egX(curT), egY(curE), 3, '#ffffff'); }
  if (rig == 1) { fgFont(); } else { fgObj(); }
}
function fgFont() {
  let i = 1, y = 0;
  evalFont(fMt, curT);
  i = 1;
  for (const _ of rep(7)) { AXV[i] = KT[i]; i = i + 1; }
  // the axes now
  i = 1;
  for (const _ of rep(7)) {
    y = slY(i);
    dot(SNX0 + (clamp(AXV[i], -1, 1) + 1) / 2 * SNW, y, 2.5, '#ffffff');
    if (perAx == 1 && nKeys == 2) { dot(SCX + 16 * curT, y - 4.5 + ease(EAX[i], curT) * 9, 1.2, '#ffffff'); }
    i = i + 1;
  }
  if (cmp == 1) {
    drawWord(-80, 62, 28, 296);
    // the point on M
    if (nAct > 0) { mPic(fMt, 2); M_view(qx, qy, qz); disk(vx, vy, 3.5, '#ffffff'); }
    evalFont(1, curT);
    i = 1;
    for (const _ of rep(7)) { AXV[i] = KT[i]; i = i + 1; }
    drawWord(-80, 17, 28, 296);
    if (nAct > 0 && fMt != 1) { axToM(fMt, 3); mPic(fMt, 3); M_view(qx, qy, qz); disk(vx, vy, 2.5, NAIVE); }
  } else {
    drawWord(-80, 30, 52, 300);
    if (nAct > 0) { mPic(fMt, 2); M_view(qx, qy, qz); disk(vx, vy, 3.5, '#ffffff'); }
  }
}
function fgObj() {
  camera();
  if (cmp == 1) {
    evalNaive(curT);
    placeModel(42, 43, nScale, 0.8);
    if (seen(42) > 0) { fillModel(nHue, 0.25, 0.8); }
    rotVec(43); ballPt(rvX, rvY, rvZ); disk(vx, vy, 2.5, NAIVE);
  }
  evalObj(curT);
  placeModel(40, 41, gScale, -0.8 * cmp);
  if (seen(40) > 0) { fillModel(gHue, 0.62, 1); }
  rotVec(41); ballPt(rvX, rvY, rvZ); disk(vx, vy, 3, '#ffffff');
}

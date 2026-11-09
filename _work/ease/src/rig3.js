// ============================================================
// The 3D rig: an object whose state is a point of the product manifold
//   M = S^2 (place on the globe) x SO(3) (turn) x R+ (size) x S^1 (colour)    (posMode 1)
//   M = R^3 (place in a box)     x SO(3) x R+ x S^1                          (posMode 2)
// Every factor has its own geodesic; one ease (or one an factor) sets how far along.
// On the globe the turn is carried along the great circle (parallel transport), so an
// aeroplane that stands upright at A and at B stays upright on the way.
// The plain way it is set against: latitude/longitude and Euler angles (yaw pitch roll)
// interpolated as numbers, size linearly, hue without going round.
// Keys: places in slots 30 31, turns in 32 33 (quaternions); size and hue as axis values
// in K3 [(k-1)*2 + 1 .. 2]  (size e^(a ln 2.5), hue a pi).
// ============================================================
let K3 = [0, 0, 0, 0];
let EA3 = [4, 4, 4, 4];
let posMode = 1, model = 1, drag3 = 1;
let gScale = 1, gHue = 0, nScale = 1, nHue = 0;
let eS1 = 0, eS2 = 0, eS3 = 0, eS4 = 0;

function sizeOf(a) {
  let s = exp(a * 0.9162907318741551);
  return s;
}
// the slots of keys A B the way the play goes now
let kA = 30, kB = 31, kQA = 32, kQB = 33, kSA = 1, kSB = 3;
function keyOrder() {
  kA = 30; kB = 31; kQA = 32; kQB = 33; kSA = 1; kSB = 3;
  if (rev == 1) { kA = 31; kB = 30; kQA = 33; kQB = 32; kSA = 3; kSB = 1; }
}
// the four factor eases at t
function easeFactors(t) {
  eS1 = ease(easeK, t); eS2 = eS1; eS3 = eS1; eS4 = eS1;
  if (perAx == 1) { eS1 = ease(EA3[1], t); eS2 = ease(EA3[2], t); eS3 = ease(EA3[3], t); eS4 = ease(EA3[4], t); }
}
// along the manifold: place 40, turn 41, gScale, gHue
function evalObj(t) {
  let a = 0, b = 0;
  keyOrder();
  easeFactors(t);
  if (posMode == 1) {
    mGeo(2, 2, kA, kB, eS1, 40);
    // B's turn carried back to A along the great circle, the turn between them, then carried
    // forward to where the object is
    qFromTo(kB, kA, 44);
    qMul(44, kQB, 45);
    mGeo(5, 3, kQA, 45, eS2, 46);
    qFromTo(kA, 40, 47);
    qMul(47, 46, 41);
  } else {
    mGeo(1, 3, kA, kB, eS1, 40);
    mGeo(5, 3, kQA, kQB, eS2, 41);
  }
  a = sizeOf(K3[kSA]); b = sizeOf(K3[kSB]);
  gScale = a * exp(Math.log(b / a) * eS3);
  a = K3[kSA + 1] * PI; b = K3[kSB + 1] * PI;
  gHue = a + wrapPi(b - a) * eS4;
}
// in charts: place 42, turn 43, nScale, nHue
let latA = 0, lonA = 0;
function latLon(s) {
  let S = s * 10;
  latA = asind(clamp(V[S + 2], -1, 1)) / DEG;
  lonA = atan2r(V[S + 1], V[S + 3]);
}
function evalNaive(t) {
  let la = 0, lo = 0, lb = 0, ob = 0, ya = 0, pa = 0, ra = 0, a = 0, b = 0, c = 0;
  keyOrder();
  easeFactors(t);
  if (posMode == 1) {
    latLon(kA); la = latA; lo = lonA;
    latLon(kB); lb = latA; ob = lonA;
    a = la + (lb - la) * eS1; b = lo + (ob - lo) * eS1;
    V[421] = cosr(a) * sinr(b); V[422] = sinr(a); V[423] = cosr(a) * cosr(b);
  } else {
    mGeo(1, 3, kA, kB, eS1, 42);
  }
  qToEuler(kQA); ya = eYaw; pa = ePitch; ra = eRoll;
  qToEuler(kQB);
  a = ya + (eYaw - ya) * eS2; b = pa + (ePitch - pa) * eS2; c = ra + (eRoll - ra) * eS2;
  qEuler(a, b, c, 43);
  a = sizeOf(K3[kSA]); b = sizeOf(K3[kSB]);
  nScale = a + (b - a) * eS3;
  a = K3[kSA + 1] * PI; b = K3[kSB + 1] * PI;
  nHue = a + (b - a) * eS4;
}

// ---- the camera of the main view ----
let cAz = 25, cEl = 22, cD = 4.6;
let eyeX = 0, eyeY = 0, eyeZ = 0, fwX = 0, fwY = 0, fwZ = 0, rtX = 0, rtY = 0, rtZ = 0, upX = 0, upY = 0, upZ = 0;
let sx = 0, sy = 0, z0 = 0, px = 0, py = 0, pz = 0;
function camera() {
  let ca = cosd(cAz), sa = sind(cAz), ce = cosd(cEl), se = sind(cEl);
  eyeX = cD * sa * ce; eyeY = cD * se; eyeZ = cD * ca * ce;
  fwX = 0 - sa * ce; fwY = 0 - se; fwZ = 0 - ca * ce;
  rtX = ca; rtY = 0; rtZ = 0 - sa;
  upX = rtY * fwZ - rtZ * fwY; upY = rtZ * fwX - rtX * fwZ; upZ = rtX * fwY - rtY * fwX;
}
// world (x y z) -> stage sx sy and depth z0
function M_proj(x, y, z) {
  px = x - eyeX; py = y - eyeY; pz = z - eyeZ;
  z0 = px * fwX + py * fwY + pz * fwZ;
  if (z0 < 0.05) { z0 = 0.05; }
  sx = C3X + F3 * (px * rtX + py * rtY + pz * rtZ) / z0;
  sy = C3Y + F3 * (px * upX + py * upY + pz * upZ) / z0;
}

// ---- the models (forward +z, up +y) ----
let MVX = [], MVY = [], MVZ = [], MFA = [], MFB = [], MFC = [], MFD = [], MFK = [];
let nMV = 0, nMF = 0;
let WX = [], WY = [], WZ = [], SX = [], SY = [], SZ = [], FDP = [], FOR = [];
function M_mv(x, y, z) { nMV = nMV + 1; MVX[nMV] = x; MVY[nMV] = y; MVZ[nMV] = z; }
function M_mf(a, b, c, d, k) { nMF = nMF + 1; MFA[nMF] = a; MFB[nMF] = b; MFC[nMF] = c; MFD[nMF] = d; MFK[nMF] = k; }
function setModel(m) {
  model = m; nMV = 0; nMF = 0;
  if (m == 1) {
    // a paper aeroplane: two wings, the keel under them, a fin
    M_mv(0, 0, 1); M_mv(-0.9, 0.04, -0.6); M_mv(0.9, 0.04, -0.6); M_mv(0, 0.02, -0.62); M_mv(0, -0.24, -0.58); M_mv(0, 0.42, -0.72); M_mv(0, 0.02, -0.22);
    M_mf(1, 2, 4, 0, 1); M_mf(1, 4, 3, 0, 1); M_mf(1, 4, 5, 0, 2); M_mf(7, 6, 4, 0, 3);
  } else {
    // a box a little longer than it is wide, its front darker
    M_mv(-0.5, -0.4, -0.7); M_mv(0.5, -0.4, -0.7); M_mv(0.5, 0.4, -0.7); M_mv(-0.5, 0.4, -0.7);
    M_mv(-0.5, -0.4, 0.7); M_mv(0.5, -0.4, 0.7); M_mv(0.5, 0.4, 0.7); M_mv(-0.5, 0.4, 0.7);
    M_mf(5, 6, 7, 8, 4); M_mf(2, 1, 4, 3, 1); M_mf(1, 5, 8, 4, 2); M_mf(6, 2, 3, 7, 2); M_mf(8, 7, 3, 4, 3); M_mf(1, 2, 6, 5, 3);
  }
}
// the model at place slot ps, turn qs, size sc into WX.. and SX.. (shift dx along x)
function placeModel(ps, qs, sc, dx) {
  let i = 1, P = ps * 10, ox = 0, oy = 0, oz = 0, k = 0, x = 0, y = 0, z = 0;
  qMat(qs);
  k = 0.3 * sc;
  if (posMode == 1) { ox = V[P + 1] * 1.17; oy = V[P + 2] * 1.17; oz = V[P + 3] * 1.17; }
  else { ox = V[P + 1] + dx; oy = V[P + 2]; oz = V[P + 3]; k = 0.42 * sc; }
  for (const _ of rep(nMV)) {
    x = MVX[i] * k; y = MVY[i] * k; z = MVZ[i] * k;
    WX[i] = ox + RM[1] * x + RM[2] * y + RM[3] * z;
    WY[i] = oy + RM[4] * x + RM[5] * y + RM[6] * z;
    WZ[i] = oz + RM[7] * x + RM[8] * y + RM[9] * z;
    M_proj(WX[i], WY[i], WZ[i]);
    SX[i] = sx; SY[i] = sy; SZ[i] = z0;
    i = i + 1;
  }
}
// is the place in slot ps on the near side of the globe (or anywhere in the box)
function seen(ps) {
  let P = ps * 10, d = 1;
  if (posMode == 1) { d = V[P + 1] * eyeX + V[P + 2] * eyeY + V[P + 3] * eyeZ; d = d - 0.75; }
  return d;
}
// the placed model, filled, far faces first (hue in radians; sat; dim 1 = as is)
function fillModel(hue, sat, dim) {
  let f = 1, i = 0, j = 0, t = 0, a = 0, b = 0, c = 0, ax = 0, ay = 0, az0 = 0, bx = 0, by = 0, bz = 0, nx = 0, ny = 0, nz = 0, l = 0, sh = 0, h = 0, back = 0;
  for (const _ of rep(nMF)) {
    FDP[f] = SZ[MFA[f]] + SZ[MFB[f]] + SZ[MFC[f]]; FOR[f] = f;
    f = f + 1;
  }
  // (a handful of faces: selection sort, farthest first)
  i = 1;
  for (const _ of rep(nMF - 1)) {
    j = i + 1;
    for (const _ of rep(nMF - i)) {
      if (FDP[FOR[j]] > FDP[FOR[i]]) { t = FOR[i]; FOR[i] = FOR[j]; FOR[j] = t; }
      j = j + 1;
    }
    i = i + 1;
  }
  i = 1;
  for (const _ of rep(nMF)) {
    f = FOR[i]; a = MFA[f]; b = MFB[f]; c = MFC[f];
    ax = WX[b] - WX[a]; ay = WY[b] - WY[a]; az0 = WZ[b] - WZ[a];
    bx = WX[c] - WX[a]; by = WY[c] - WY[a]; bz = WZ[c] - WZ[a];
    nx = ay * bz - az0 * by; ny = az0 * bx - ax * bz; nz = ax * by - ay * bx;
    l = Math.sqrt(nx * nx + ny * ny + nz * nz) + 0.0000001;
    // a box shows only the faces turned to the eye
    back = 0;
    if (model == 2) {
      if (nx * (WX[a] - eyeX) + ny * (WY[a] - eyeY) + nz * (WZ[a] - eyeZ) > 0) { back = 1; }
    }
    if (back == 0) {
      sh = 0.38 + 0.62 * Math.abs(nx * LIX + ny * LIY + nz * LIZ) / l;
      h = hue * DEG + 720;
      if (MFK[f] == 2) { sh = sh * 0.72; }
      if (MFK[f] == 3) { h = h + 35; }
      if (MFK[f] == 4) { sh = sh * 0.6; }
      hsv(h, sat, sh * dim);
      fillStop();
      goto(SX[a], SY[a]);
      fillColorHex(colourOf(cR, cG, cB));
      fillStart();
      goto(SX[b], SY[b]);
      goto(SX[c], SY[c]);
      if (MFD[f] > 0) { goto(SX[MFD[f]], SY[MFD[f]]); }
    }
    i = i + 1;
  }
  fillStop();
}
// the placed model as lines (the keys' ghosts)
function lineModel(col) {
  let f = 1;
  penColorHex(col);
  for (const _ of rep(nMF)) {
    penUp(); goto(SX[MFA[f]], SY[MFA[f]]); penDown();
    goto(SX[MFB[f]], SY[MFB[f]]); goto(SX[MFC[f]], SY[MFC[f]]);
    if (MFD[f] > 0) { goto(SX[MFD[f]], SY[MFD[f]]); }
    goto(SX[MFA[f]], SY[MFA[f]]);
    f = f + 1;
  }
  penUp();
}

// the turn of quaternion slot q as a point of the ball of radius 1 (rotation vector / pi)
let rvX = 0, rvY = 0, rvZ = 0;
function rotVec(q) {
  let Q = q * 10, w = V[Q + 1], x = V[Q + 2], y = V[Q + 3], z = V[Q + 4], l = 0, a = 0;
  if (w < 0) { w = 0 - w; x = 0 - x; y = 0 - y; z = 0 - z; }
  l = Math.sqrt(x * x + y * y + z * z);
  rvX = 0; rvY = 0; rvZ = 0;
  if (l > 0.0000001) {
    a = 2 * atan2r(l, w) / PI / l;
    rvX = x * a; rvY = y * a; rvZ = z * a;
  }
}

// a key turned by the drag (dx, dy on the stage): about the camera's up and right axes
function turnKey(k, dx, dy) {
  let q = 31 + k;
  qAxis(upX, upY, upZ, dx * 0.014, 44);
  qMul(44, q, 45);
  qAxis(rtX, rtY, rtZ, 0 - dy * 0.014, 44);
  qMul(44, 45, q);
  mGeo(5, 3, q, q, 0, q);
}
// where the ray through stage point (mx, my) meets the globe (or comes nearest it) -> slot
function rayHit(mx, my, slot) {
  let dX = 0, dY = 0, dZ = 0, b = 0, c = 0, d = 0, l = 0, s = 0, S = slot * 10;
  dX = fwX + rtX * (mx - C3X) / F3 + upX * (my - C3Y) / F3;
  dY = fwY + rtY * (mx - C3X) / F3 + upY * (my - C3Y) / F3;
  dZ = fwZ + rtZ * (mx - C3X) / F3 + upZ * (my - C3Y) / F3;
  // |eye + l d| = 1
  b = eyeX * dX + eyeY * dY + eyeZ * dZ; c = eyeX * eyeX + eyeY * eyeY + eyeZ * eyeZ - 1; d = dX * dX + dY * dY + dZ * dZ;
  s = b * b - d * c;
  if (s < 0) { l = 0 - b / d; } else { l = (0 - b - Math.sqrt(s)) / d; }
  V[S + 1] = eyeX + l * dX; V[S + 2] = eyeY + l * dY; V[S + 3] = eyeZ + l * dZ;
  l = Math.sqrt(V[S + 1] * V[S + 1] + V[S + 2] * V[S + 2] + V[S + 3] * V[S + 3]);
  V[S + 1] = V[S + 1] / l; V[S + 2] = V[S + 2] / l; V[S + 3] = V[S + 3] / l;
}
// a key's place moved with the pointer: on the globe the key is turned about the globe's
// middle by the turn that takes the point under the last pointer to the point under this
// one (so the place and the way the object stands go together); in the box it slides
// across the view
function moveKey(k, mx, my, dx, dy) {
  let l = 0, P = (29 + k) * 10, q = 31 + k, x = 0, y = 0, z = 0;
  if (posMode == 1) {
    rayHit(mx - dx, my - dy, 6);
    rayHit(mx, my, 5);
    qFromTo(6, 5, 44);
    qMat(44);
    x = V[P + 1]; y = V[P + 2]; z = V[P + 3];
    V[P + 1] = RM[1] * x + RM[2] * y + RM[3] * z;
    V[P + 2] = RM[4] * x + RM[5] * y + RM[6] * z;
    V[P + 3] = RM[7] * x + RM[8] * y + RM[9] * z;
    qMul(44, q, 45); vCopy(45, q, 4);
  } else {
    l = cD / F3;
    V[P + 1] = clamp(V[P + 1] + (rtX * dx + upX * dy) * l, -1.2, 1.2);
    V[P + 2] = clamp(V[P + 2] + (rtY * dx + upY * dy) * l, -1.2, 1.2);
    V[P + 3] = clamp(V[P + 3] + (rtZ * dx + upZ * dy) * l, -1.2, 1.2);
  }
}
// a place on the globe from latitude and longitude (degrees) into slot s
function setLL(s, la, lo) {
  let S = s * 10;
  V[S + 1] = cosd(la) * sind(lo); V[S + 2] = sind(la); V[S + 3] = cosd(la) * cosd(lo);
}
// a key's turn: standing on the ground at its place (up = the place), nose toward heading
// hd (degrees from north), then turned by yaw/pitch/roll of its own (degrees)
function setStand(k, hd, yw, pt, rl) {
  let P = (29 + k) * 10, q = 31 + k;
  if (posMode == 1) {
    // first the turn that takes up (0 1 0) to the place, about the heading at the north pole
    V[61] = 0; V[62] = 1; V[63] = 0;
    qAxis(0, 1, 0, atan2r(V[P + 1], V[P + 3]) + (180 - hd) / DEG, 44);
    qFromTo(6, 29 + k, 45);
    qMul(45, 44, 46);
  } else {
    qAxis(0, 1, 0, 0, 46);
  }
  qEuler(yw / DEG, pt / DEG, rl / DEG, 47);
  qMul(46, 47, q);
}

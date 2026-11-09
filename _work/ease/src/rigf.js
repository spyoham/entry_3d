// ============================================================
// The font rig: the axes that are switched on (ACT) make one manifold M of dimension n,
// the others are flat. The keys A B (C D) are styles; a chart takes the active axes of a
// style to a point of M and back:
//   R^n  the axes themselves
//   S^n  stereographic: the axes y (in R^n) <-> x in S^n,  x = (2y, 1 - |y|^2) / (1 + |y|^2)
//   H^n  the Poincare ball in normal coordinates at its middle: the axes y are the tangent
//        vector, |y| HD the hyperbolic distance from the plain style: x = tanh(HD |y| / 2) y/|y|.
//        Far styles crowd at the rim, and a geodesic between two of them bends in toward the
//        middle
//   T^n  angles: x = pi y  (every axis periodic)
// ============================================================
let KEY = [];          // KEY[(k-1)*7 + i]: axis i of key k
let ACT = [1, 1, 0, 0, 0, 0, 0];
let EAX = [4, 4, 4, 4, 4, 4, 4];
let KT = [0, 0, 0, 0, 0, 0, 0];
let fMt = 1, nAct = 2, nKeys = 2, easeK = 4, perAx = 0, rev = 0, keyPage = 0;

function countAct() {
  let i = 1, n = 0;
  for (const _ of rep(7)) { n = n + ACT[i]; i = i + 1; }
  nAct = n;
}
// key k (counting the way the play goes now) into KT
function keyToKT(k) {
  let kk = k, i = 1, b = 0;
  if (rev == 1) { kk = nKeys + 1 - k; }
  b = (kk - 1) * 7;
  for (const _ of rep(7)) { KT[i] = KEY[b + i]; i = i + 1; }
}
// the active axes of KT -> a point of manifold mt in slot
function axToM(mt, slot) {
  let i = 1, j = 1, O = slot * 10, y = 0, r2 = 0, n = nAct, k = 0;
  for (const _ of rep(7)) {
    if (ACT[i] == 1) {
      y = KT[i];
      if (mt == 1) { V[O + j] = y; }
      if (mt == 2) { V[O + j] = y; r2 = r2 + y * y; }
      if (mt == 3) { V[O + j] = y; r2 = r2 + y * y; }
      if (mt == 4) { V[O + j] = wrapPi(y * PI); }
      j = j + 1;
    }
    i = i + 1;
  }
  if (mt == 3) {
    r2 = Math.sqrt(r2); k = 0;
    if (r2 > 0.000001) { k = tanh(HD * r2 / 2) / r2; }
    j = 1;
    for (const _ of rep(n)) { V[O + j] = V[O + j] * k; j = j + 1; }
  }
  if (mt == 2) {
    j = 1;
    for (const _ of rep(n)) { V[O + j] = 2 * V[O + j] / (1 + r2); j = j + 1; }
    V[O + n + 1] = (1 - r2) / (1 + r2);
  }
}
// a point of mt in slot -> the active axes of KT
function mToAx(mt, slot) {
  let i = 1, j = 1, O = slot * 10, d = 1, hs = 1, n = nAct, r = 0;
  if (mt == 2) { d = 1 + V[O + n + 1]; if (d < 0.02) { d = 0.02; } }
  if (mt == 3) {
    for (const _ of rep(n)) { r = r + V[O + j] * V[O + j]; j = j + 1; }
    r = Math.sqrt(r); hs = 1;
    if (r > 0.000001) { hs = HD * r / (2 * artanh(r)); }
    j = 1;
  }
  for (const _ of rep(7)) {
    if (ACT[i] == 1) {
      if (mt == 1) { KT[i] = V[O + j]; }
      if (mt == 2) { KT[i] = V[O + j] / d; }
      if (mt == 3) { KT[i] = V[O + j] / hs; }
      if (mt == 4) { KT[i] = V[O + j] / PI; }
      j = j + 1;
    }
    i = i + 1;
  }
}

// the cubic (or lower) Bezier of numbers, de Casteljau
function bez1(a, b, c, d, nk, s) {
  let r = a + (b - a) * s, p = 0, q = 0, u = 0, v = 0;
  if (nk == 3) { p = a + (b - a) * s; q = b + (c - b) * s; r = p + (q - p) * s; }
  if (nk == 4) {
    p = a + (b - a) * s; q = b + (c - b) * s; u = c + (d - c) * s;
    v = p + (q - p) * s; q = q + (u - q) * s; r = v + (q - v) * s;
  }
  return r;
}

// the style at time t on manifold mt -> KT (and the point of M in slot 2 when n > 0)
function evalFont(mt, t) {
  let n = nAct, i = 1, j = 1, k = 1, s = 0, m = 0, d = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0;
  // the keys as points of M in slots 21.. (in the order the play goes)
  k = 1;
  for (const _ of rep(nKeys)) { keyToKT(k); axToM(mt, 20 + k); k = k + 1; }
  if (n > 0) {
    if (nKeys == 2 && perAx == 1) {
      // a vector ease: each coordinate of the tangent vector Log_A B gone along at its own
      // pace, then Exp_A
      mLog(mt, n, 21, 22, 1);
      i = 1; j = 1;
      for (const _ of rep(7)) {
        if (ACT[i] == 1) { V[10 + j] = V[10 + j] * ease(EAX[i], t); j = j + 1; }
        i = i + 1;
      }
      if (mt == 2) {
        // (the sphere's extra coordinate goes with the main ease; then back onto the
        // tangent space at A)
        V[10 + n + 1] = V[10 + n + 1] * ease(easeK, t);
        m = n + 1; vDot(1, 21, m); d = mRes; j = 1;
        for (const _ of rep(m)) { V[10 + j] = V[10 + j] - d * V[210 + j]; j = j + 1; }
      }
      mExp(mt, n, 21, 1, 2);
    } else {
      s = ease(easeK, t);
      mBez(mt, n, nKeys, 21, s, 2);
    }
    mToAx(mt, 2);
  }
  // the flat axes (keys counted the way the play goes; a key past the last is the last)
  b1 = 0; b2 = 7; b3 = 14; b4 = 21;
  if (nKeys == 2) { b3 = 7; b4 = 7; }
  if (nKeys == 3) { b4 = 14; }
  if (rev == 1) {
    if (nKeys == 2) { b1 = 7; b2 = 0; b3 = 0; b4 = 0; }
    if (nKeys == 3) { b1 = 14; b2 = 7; b3 = 0; b4 = 0; }
    if (nKeys == 4) { b1 = 21; b2 = 14; b3 = 7; b4 = 0; }
  }
  i = 1;
  for (const _ of rep(7)) {
    if (ACT[i] == 0 || n == 0) {
      s = ease(easeK, t);
      if (perAx == 1 && nKeys == 2) { s = ease(EAX[i], t); }
      KT[i] = bez1(KEY[b1 + i], KEY[b2 + i], KEY[b3 + i], KEY[b4 + i], nKeys, s);
    }
    i = i + 1;
  }
  // the periodic axes back into [-1, 1]
  KT[6] = wrapPi(KT[6] * PI) / PI;
  KT[7] = wrapPi(KT[7] * PI) / PI;
}

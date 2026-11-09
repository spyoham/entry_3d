// ============================================================
// Numbers and manifolds
//
// Entry has sin/cos/tan in degrees, their inverses, sqrt and ln, but no e^x and no atan2:
// those are made here. A point or a tangent vector lives in the list V, in a slot of ten
// numbers (slot s is V[s*10+1] .. V[s*10+9]).
//
// Manifolds (mt), each with Exp and Log:
//   1 R^n     flat space                     Exp_a(v) = a + v
//   2 S^n     the unit sphere in R^(n+1)     great circles
//   3 H^n     the Poincare ball (curvature -1), Mobius addition
//   4 T^n     the flat torus: n angles in (-pi, pi]
//   5 SO(3)   rotations as unit quaternions (S^3 with q ~ -q)
//   6 R+^n    positive numbers with the metric dx/x (geometric interpolation)
// An ease along a manifold is  g(t) = Exp_a( e(t) Log_a b ):  the geodesic from a to b
// gone along at the speed the scalar ease e says. e(t) < 0 or > 1 runs on along the same
// geodesic past its ends.
// ============================================================
let V = [];
// (POW2[k + 65] = 2^k is made by the build)
let mRes = 0;

function exp(x) {
  let k = 0, r = 0, p = 0, y = x;
  if (y > 60) { y = 60; }
  if (y < -60) { y = -60; }
  k = Math.round(y * 1.4426950408889634);
  r = y - k * 0.6931471805599453;
  p = 1 + r * (1 + r * (0.5 + r * (0.16666666666666666 + r * (0.041666666666666664 + r * (0.008333333333333333 + r * (0.001388888888888889 + r * (0.0001984126984126984 + r * 0.0000248015873015873)))))));
  return p * POW2[k + 65];
}
function sinr(x) {
  let d = x * DEG;
  return sind(d);
}
function cosr(x) {
  let d = x * DEG;
  return cosd(d);
}
// the angle of (x, y) in radians, -pi .. pi
function atan2r(y, x) {
  let a = 0;
  if (x == 0) {
    if (y > 0) { a = HPI; }
    if (y < 0) { a = 0 - HPI; }
  } else {
    a = atand(y / x) / DEG;
    if (x < 0) {
      if (y >= 0) { a = a + PI; } else { a = a - PI; }
    }
  }
  return a;
}
function tanh(x) {
  let e = 0, y = x;
  if (y > 20) { y = 20; }
  if (y < -20) { y = -20; }
  e = exp(2 * y);
  return (e - 1) / (e + 1);
}
function artanh(x) {
  let y = x;
  if (y > 0.9999999) { y = 0.9999999; }
  if (y < -0.9999999) { y = -0.9999999; }
  return 0.5 * Math.log((1 + y) / (1 - y));
}
// an angle brought into (-pi, pi]
function wrapPi(x) {
  let k = Math.round(x / TAU);
  return x - k * TAU;
}
function clamp(x, lo, hi) {
  let y = x;
  if (y < lo) { y = lo; }
  if (y > hi) { y = hi; }
  return y;
}

// numbers a slot of manifold mt (dimension n) holds
function dimE(mt, n) {
  let m = n;
  if (mt == 2) { m = n + 1; }
  if (mt == 5) { m = 4; }
  return m;
}
function vCopy(a, out, m) {
  let i = 1, A = a * 10, O = out * 10;
  for (const _ of rep(m)) { V[O + i] = V[A + i]; i = i + 1; }
}
function vDot(a, b, m) {
  let i = 1, A = a * 10, B = b * 10, s = 0;
  for (const _ of rep(m)) { s = s + V[A + i] * V[B + i]; i = i + 1; }
  mRes = s;
}
function vScale(a, k, out, m) {
  let i = 1, A = a * 10, O = out * 10;
  for (const _ of rep(m)) { V[O + i] = V[A + i] * k; i = i + 1; }
}
// out = x (+) y, the Mobius sum in the Poincare ball
function mobAdd(x, y, out, m) {
  let i = 1, X = x * 10, Y = y * 10, O = out * 10, xy = 0, xx = 0, yy = 0, a = 0, b = 0, d = 0, r = 0;
  for (const _ of rep(m)) { xy = xy + V[X + i] * V[Y + i]; xx = xx + V[X + i] * V[X + i]; yy = yy + V[Y + i] * V[Y + i]; i = i + 1; }
  a = 1 + 2 * xy + yy; b = 1 - xx; d = 1 + 2 * xy + xx * yy;
  if (Math.abs(d) < 0.000000001) { d = 0.000000001; }
  i = 1; r = 0;
  for (const _ of rep(m)) { V[O + i] = (a * V[X + i] + b * V[Y + i]) / d; r = r + V[O + i] * V[O + i]; i = i + 1; }
  // (kept inside the ball)
  if (r > 0.9999) {
    r = 0.99995 / Math.sqrt(r); i = 1;
    for (const _ of rep(m)) { V[O + i] = V[O + i] * r; i = i + 1; }
  }
}

// out = Log_a(b): the tangent vector at a that reaches b
function mLog(mt, n, a, b, out) {
  let m = dimE(mt, n), i = 1, A = a * 10, B = b * 10, O = out * 10, d = 0, w = 0, th = 0, sg = 1, r = 0, k = 0, ax = 0;
  if (mt == 1) {
    for (const _ of rep(m)) { V[O + i] = V[B + i] - V[A + i]; i = i + 1; }
  }
  if (mt == 4) {
    for (const _ of rep(m)) { V[O + i] = wrapPi(V[B + i] - V[A + i]); i = i + 1; }
  }
  if (mt == 6) {
    for (const _ of rep(m)) { V[O + i] = Math.log(V[B + i] / V[A + i]); i = i + 1; }
  }
  if (mt == 2 || mt == 5) {
    for (const _ of rep(m)) { d = d + V[A + i] * V[B + i]; i = i + 1; }
    // a rotation is a quaternion up to its sign: the nearer of b and -b
    if (mt == 5 && d < 0) { sg = -1; d = 0 - d; }
    i = 1;
    for (const _ of rep(m)) { V[O + i] = sg * V[B + i] - d * V[A + i]; w = w + V[O + i] * V[O + i]; i = i + 1; }
    w = Math.sqrt(w);
    th = atan2r(w, d);
    if (w < 0.000000001) {
      i = 1;
      for (const _ of rep(m)) { V[O + i] = 0; i = i + 1; }
      // b opposite a: any way round will do (the first axis that a does not lie along)
      if (d < 0) {
        ax = 1;
        if (Math.abs(V[A + 1]) > 0.9) { ax = 2; }
        V[O + ax] = 1;
        k = V[A + ax];
        i = 1; r = 0;
        for (const _ of rep(m)) { V[O + i] = V[O + i] - k * V[A + i]; r = r + V[O + i] * V[O + i]; i = i + 1; }
        r = PI / Math.sqrt(r); i = 1;
        for (const _ of rep(m)) { V[O + i] = V[O + i] * r; i = i + 1; }
      }
    } else {
      k = th / w; i = 1;
      for (const _ of rep(m)) { V[O + i] = V[O + i] * k; i = i + 1; }
    }
  }
  if (mt == 3) {
    // Log_a b = (1 - |a|^2) artanh|u| u/|u|,  u = (-a) (+) b
    vScale(a, -1, 9, m);
    mobAdd(9, b, out, m);
    vDot(a, a, m); k = 1 - mRes;
    vDot(out, out, m); r = Math.sqrt(mRes);
    if (r > 0.000000001) { k = k * artanh(r) / r; } else { k = 0; }
    vScale(out, k, out, m);
  }
}

// out = Exp_a(v)
function mExp(mt, n, a, v, out) {
  let m = dimE(mt, n), i = 1, A = a * 10, W = v * 10, O = out * 10, th = 0, c = 0, s = 0, r = 0, k = 0;
  if (mt == 1) {
    for (const _ of rep(m)) { V[O + i] = V[A + i] + V[W + i]; i = i + 1; }
  }
  if (mt == 4) {
    for (const _ of rep(m)) { V[O + i] = wrapPi(V[A + i] + V[W + i]); i = i + 1; }
  }
  if (mt == 6) {
    for (const _ of rep(m)) { V[O + i] = V[A + i] * exp(V[W + i]); i = i + 1; }
  }
  if (mt == 2 || mt == 5) {
    for (const _ of rep(m)) { th = th + V[W + i] * V[W + i]; i = i + 1; }
    th = Math.sqrt(th);
    c = cosr(th); s = 0;
    if (th > 0.000000001) { s = sinr(th) / th; }
    i = 1; r = 0;
    for (const _ of rep(m)) { V[O + i] = c * V[A + i] + s * V[W + i]; r = r + V[O + i] * V[O + i]; i = i + 1; }
    r = 1 / Math.sqrt(r); i = 1;
    for (const _ of rep(m)) { V[O + i] = V[O + i] * r; i = i + 1; }
  }
  if (mt == 3) {
    // Exp_a v = a (+) tanh(|v| / (1 - |a|^2)) v/|v|
    vDot(v, v, m); r = Math.sqrt(mRes);
    vDot(a, a, m); k = 1 - mRes;
    if (r > 0.000000001) { k = tanh(r / k) / r; } else { k = 0; }
    vScale(v, k, 9, m);
    mobAdd(a, 9, out, m);
  }
}

// out = the point s of the way along the geodesic from a to b (s may be < 0 or > 1)
function mGeo(mt, n, a, b, s, out) {
  let m = dimE(mt, n);
  mLog(mt, n, a, b, 8);
  vScale(8, s, 8, m);
  mExp(mt, n, a, 8, out);
}
// geodesic length from a to b
function mDist(mt, n, a, b) {
  let m = dimE(mt, n);
  mLog(mt, n, a, b, 8);
  vDot(8, 8, m);
  // (Log in the ball is not in the units of the metric at a: scale by lambda_a)
  if (mt == 3) { vDot(a, a, m); mLog(mt, n, a, b, 8); vDot(8, 8, m); }
  mRes = Math.sqrt(mRes);
}

// the manifold Bezier of 2, 3 or 4 keys in slots k1.. (de Casteljau with geodesics)
function mBez(mt, n, nk, k1, s, out) {
  let m = dimE(mt, n);
  if (nk == 2) { mGeo(mt, n, k1, k1 + 1, s, out); }
  if (nk == 3) {
    mGeo(mt, n, k1, k1 + 1, s, 11); mGeo(mt, n, k1 + 1, k1 + 2, s, 12);
    mGeo(mt, n, 11, 12, s, out);
  }
  if (nk == 4) {
    mGeo(mt, n, k1, k1 + 1, s, 11); mGeo(mt, n, k1 + 1, k1 + 2, s, 12); mGeo(mt, n, k1 + 2, k1 + 3, s, 13);
    mGeo(mt, n, 11, 12, s, 14); mGeo(mt, n, 12, 13, s, 15);
    mGeo(mt, n, 14, 15, s, out);
  }
}

// ---- quaternions (w x y z in four numbers of V from slot base) ----
// out = a * b
function qMul(a, b, out) {
  let A = a * 10, B = b * 10, O = out * 10, aw = V[A + 1], ax = V[A + 2], ay = V[A + 3], az = V[A + 4], bw = V[B + 1], bx = V[B + 2], by = V[B + 3], bz = V[B + 4];
  V[O + 1] = aw * bw - ax * bx - ay * by - az * bz;
  V[O + 2] = aw * bx + ax * bw + ay * bz - az * by;
  V[O + 3] = aw * by - ax * bz + ay * bw + az * bx;
  V[O + 4] = aw * bz + ax * by - ay * bx + az * bw;
}
// slot out = the turn by angle th (radians) about the unit axis (x, y, z)
function qAxis(x, y, z, th, out) {
  let O = out * 10, s = sinr(th / 2);
  V[O + 1] = cosr(th / 2); V[O + 2] = x * s; V[O + 3] = y * s; V[O + 4] = z * s;
}
// the rotation that takes unit vector a to unit vector b along the great circle (slots of 3)
function qFromTo(a, b, out) {
  let A = a * 10, B = b * 10, cx = 0, cy = 0, cz = 0, d = 0, w = 0, th = 0;
  cx = V[A + 2] * V[B + 3] - V[A + 3] * V[B + 2];
  cy = V[A + 3] * V[B + 1] - V[A + 1] * V[B + 3];
  cz = V[A + 1] * V[B + 2] - V[A + 2] * V[B + 1];
  d = V[A + 1] * V[B + 1] + V[A + 2] * V[B + 2] + V[A + 3] * V[B + 3];
  w = Math.sqrt(cx * cx + cy * cy + cz * cz);
  th = atan2r(w, d);
  if (w < 0.000000001) {
    qAxis(1, 0, 0, 0, out);
  } else {
    qAxis(cx / w, cy / w, cz / w, th, out);
  }
}
// the rotation matrix of quaternion slot q into RM[1..9] (rows)
let RM = [0, 0, 0, 0, 0, 0, 0, 0, 0];
function qMat(q) {
  let Q = q * 10, w = V[Q + 1], x = V[Q + 2], y = V[Q + 3], z = V[Q + 4];
  RM[1] = 1 - 2 * (y * y + z * z); RM[2] = 2 * (x * y - w * z); RM[3] = 2 * (x * z + w * y);
  RM[4] = 2 * (x * y + w * z); RM[5] = 1 - 2 * (x * x + z * z); RM[6] = 2 * (y * z - w * x);
  RM[7] = 2 * (x * z - w * y); RM[8] = 2 * (y * z + w * x); RM[9] = 1 - 2 * (x * x + y * y);
}
// yaw (about y), pitch (about x), roll (about z) in radians: q = Ry(yaw) Rx(pitch) Rz(roll)
function qEuler(yaw, pitch, roll, out) {
  qAxis(0, 1, 0, yaw, 16);
  qAxis(1, 0, 0, pitch, 17);
  qAxis(0, 0, 1, roll, 18);
  qMul(16, 17, 19);
  qMul(19, 18, out);
}
let eYaw = 0, ePitch = 0, eRoll = 0;
// the Euler angles of quaternion slot q (the inverse of qEuler)
function qToEuler(q) {
  let sp = 0;
  qMat(q);
  // R = Ry Rx Rz: R[2][3] = -sin(pitch)
  sp = 0 - RM[6];
  sp = clamp(sp, -1, 1);
  ePitch = asind(sp) / DEG;
  if (Math.abs(sp) < 0.99999) {
    eYaw = atan2r(RM[3], RM[9]);
    eRoll = atan2r(RM[4], RM[5]);
  } else {
    eYaw = atan2r(0 - RM[7], RM[1]);
    eRoll = 0;
  }
}

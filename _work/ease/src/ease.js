// ============================================================
// Scalar eases e: [0, 1] -> R with e(0) = 0, e(1) = 1. The manifold ease uses e(t) as the
// part of the geodesic gone, so an ease that overshoots (back, elastic) runs past the end
// point along the same geodesic and comes back.
// ============================================================
const NEASE = 15;
let EN = ['선형', '사인 인아웃', '2차 인아웃', '3차 인아웃', '5차 인아웃', '지수 인아웃', '원 인아웃', '3차 아웃', '3차 인', '백 인아웃', '백 아웃', '탄성 아웃', '튕김 아웃', '스무더스텝', '사용자 베지어'];
let EF = ['t', '½ − ½cos πt', '2t², 1 − 2(1−t)²', '4t³, 1 − 4(1−t)³', '16t⁵ …', '½·2^(20t−10) …', '½(1 − √(1 − 4t²)) …', '1 − (1−t)³', 't³', 'c = 2.59: 오갔다 넘침', '1 + 2.70(t−1)³ + 1.70(t−1)²', '1 + 2^(−10t) sin(2π(10t − ¾)/3)', '포물선 네 번', '6t⁵ − 15t⁴ + 10t³', 'cubic-bezier(x1, y1, x2, y2)'];
// the handles of the user's cubic Bezier (x1 y1 x2 y2)
let BZ = [0.2, -0.35, 0.3, 1.45];

function bezX(u) {
  let v = 1 - u;
  return 3 * v * v * u * BZ[1] + 3 * v * u * u * BZ[3] + u * u * u;
}
function bezY(u) {
  let v = 1 - u;
  return 3 * v * v * u * BZ[2] + 3 * v * u * u * BZ[4] + u * u * u;
}
function bezDX(u) {
  let v = 1 - u;
  return 3 * v * v * BZ[1] + 6 * v * u * (BZ[3] - BZ[1]) + 3 * u * u * (1 - BZ[3]);
}
// one Newton step for x(u) = t (u kept in [0, 1])
function M_bzStep(u, t) {
  d = bezDX(u);
  if (Math.abs(d) > 0.000001) { u = u - (bezX(u) - t) / d; }
  if (u < 0) { u = 0; }
  if (u > 1) { u = 1; }
}
function bezEase(t) {
  let u = t, d = 0;
  M_bzStep(u, t); M_bzStep(u, t); M_bzStep(u, t); M_bzStep(u, t); M_bzStep(u, t); M_bzStep(u, t);
  return bezY(u);
}

function ease(k, t0) {
  let t = t0, y = t0, u = 0, c = 0;
  if (t < 0) { t = 0; }
  if (t > 1) { t = 1; }
  y = t;
  if (k == 2) { y = 0.5 - 0.5 * cosd(180 * t); }
  if (k == 3) { if (t < 0.5) { y = 2 * t * t; } else { u = 1 - t; y = 1 - 2 * u * u; } }
  if (k == 4) { if (t < 0.5) { y = 4 * t * t * t; } else { u = 1 - t; y = 1 - 4 * u * u * u; } }
  if (k == 5) { if (t < 0.5) { u = t * t; y = 16 * u * u * t; } else { u = 1 - t; c = u * u; y = 1 - 16 * c * c * u; } }
  if (k == 6) {
    if (t > 0 && t < 1) {
      if (t < 0.5) { y = 0.5 * exp((20 * t - 10) * 0.6931471805599453); } else { y = 1 - 0.5 * exp((10 - 20 * t) * 0.6931471805599453); }
    }
  }
  if (k == 7) { if (t < 0.5) { y = 0.5 * (1 - Math.sqrt(1 - 4 * t * t)); } else { u = 2 - 2 * t; y = 0.5 * (1 + Math.sqrt(Math.max(0, 1 - u * u))); } }
  if (k == 8) { u = 1 - t; y = 1 - u * u * u; }
  if (k == 9) { y = t * t * t; }
  if (k == 10) {
    c = 2.5949095;
    if (t < 0.5) { u = 2 * t; y = 0.5 * u * u * ((c + 1) * u - c); } else { u = 2 * t - 2; y = 0.5 * (u * u * ((c + 1) * u + c) + 2); }
  }
  if (k == 11) { u = t - 1; y = 1 + 2.70158 * u * u * u + 1.70158 * u * u; }
  if (k == 12) {
    if (t > 0 && t < 1) { y = 1 + exp(-6.931471805599453 * t) * sind(1200 * t - 90); }
  }
  if (k == 13) {
    if (t < 0.36363636) { y = 7.5625 * t * t; }
    else {
      if (t < 0.72727273) { u = t - 0.54545454; y = 7.5625 * u * u + 0.75; }
      else {
        if (t < 0.90909091) { u = t - 0.81818182; y = 7.5625 * u * u + 0.9375; }
        else { u = t - 0.95454545; y = 7.5625 * u * u + 0.984375; }
      }
    }
  }
  if (k == 14) { y = t * t * t * (t * (6 * t - 15) + 10); }
  if (k == 15) { y = bezEase(t); }
  return y;
}

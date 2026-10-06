// ============================================================
// v1.1: the gamma and zeta functions, and the parameters a and t
//
// Both functions are one machine operation each (a cell costs a few hundred
// blocks; built from the simple operations they would cost several times that).
//
// Gamma: the Lanczos series (g = 7, nine terms) right of Re z = 1/2, and the
// reflection gamma(z) = pi / (sin(pi z) gamma(1 - z)) left of it.
//
// Zeta: Borwein's alternating series,
//     zeta(s) = (sum over m = 1..n of W[m] m^-s) / (1 - 2^(1-s)),
// with n = 16, 32 or 64 terms by the size of Im s (the error grows like
// e^(pi |Im s| / 2)). m^-s is worked out by exp only for a prime m; for the rest
// it is the product of two earlier ones. Left of Re s = -1/2 the functional
// equation zeta(s) = 2^s pi^(s-1) sin(pi s / 2) gamma(1 - s) zeta(1 - s).
// ============================================================
const O_GAMMA = 23, O_ZETA = 24;
// the cells of the parameters (the last two constant cells)
const PT_OFF = CB + NCONST - 1;
const PA_OFF = CB + NCONST - 2;
const LN2PI = 1.8378770664093453;
const LNPI = 1.1447298858494002;

let usesT = 0, usesA = 0;
let ZPR = [], ZPI = [];

function extInit() {
  while (ZPR.length < 64) { ZPR.push(0); ZPI.push(0); }
  VR[PA_OFF + 1] = 1; VI[PA_OFF + 1] = 0;
}

function M_lterm(c, k) {
  lu_ = lx_ + k; lq_ = c / (lu_ * lu_ + ly2_);
  la_ = la_ + lq_ * lu_; lb_ = lb_ - lq_ * y;
}
// gamma(x + iy) for x >= 1/2 as sqrt(2 pi) (la_ + i lb_) e^(lw_ + i lv_)   (lv_ in radians)
function M_lanczosLog(x, y) {
  lx_ = x - 1; ly2_ = y * y;
  la_ = 0.9999999999998099; lb_ = 0;
  M_lterm(676.5203681218851, 1);
  M_lterm(-1259.1392167224028, 2);
  M_lterm(771.3234287776531, 3);
  M_lterm(-176.6150291621406, 4);
  M_lterm(12.507343278686905, 5);
  M_lterm(-0.13857109526572012, 6);
  M_lterm(0.000009984369578019572, 7);
  M_lterm(1.5056327351493116e-7, 8);
  // t = z + 6.5, w = (z - 1/2) ln t - t, gamma = sqrt(2 pi) e^w (the series)
  lt_ = lx_ + 7.5;
  lr_ = Math.log(lt_ * lt_ + ly2_) * 0.5;
  li_ = atand(y / lt_) * D2R;
  lw_ = (lx_ + 0.5) * lr_ - y * li_ - lt_;
  lv_ = (lx_ + 0.5) * li_ + y * lr_ - y;
}
// gamma(x + iy) for x >= 1/2, times e^(pr + i pi) -> gr, gi   (the factor goes into the exponent, so a
// huge gamma times a tiny factor does not overflow on the way)
function M_lanczos(gr, gi, x, y, pr, pi) {
  M_lanczosLog(x, y);
  lw_ = lw_ + pr;
  lv_ = (lv_ + pi) * R2D;
  M_exp(le_, lw_);
  le_ = le_ * 2.5066282746310002;
  lc_ = cosd(lv_) * le_; ls_ = sind(lv_) * le_;
  gr = la_ * lc_ - lb_ * ls_;
  gi = la_ * ls_ + lb_ * lc_;
}

function v_gamma(d, a, n) {
  let j = 1, x = 0, y = 0, gr = 0, gi = 0, rf = 0, sr = 0, si = 0, ch = 0, sh = 0, t = 0, re = 0, im = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    rf = 0;
    if (x < 0.5) { rf = 1; x = 1 - x; y = 0 - y; }
    // (left of 1/2 and that far from the real axis gamma is under 1e-140, and sin(pi z) would overflow)
    if (rf == 1 && Math.abs(y) > 220) { gr = 0; gi = 0; }
    else {
      M_lanczos(gr, gi, x, y, 0, 0);
      if (rf == 1) {
        // (x, y are those of 1 - z now, and sin(pi (1 - z)) = sin(pi z))
        t = x * 180;
        M_chsh(ch, sh, y * PI);
        sr = sind(t) * ch; si = cosd(t) * sh;
        re = sr * gr - si * gi; im = sr * gi + si * gr;
        M_cdiv(gr, gi, PI, 0, re, im);
      }
    }
    VR[d + j] = gr; VI[d + j] = gi;
    j = j + 1;
  }
}

function v_zeta(d, a, n) {
  let j = 1, x = 0, y = 0, rf = 0, nn = 0, wo = 0, k = 0, p = 0, q = 0, e = 0, t = 0, pr = 0, pi = 0, w = 0;
  let sr = 0, si = 0, zr = 0, zi = 0, gr = 0, gi = 0, ch = 0, sh = 0, ur = 0, ui = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    rf = 0;
    if (x < -0.5) { rf = 1; x = 1 - x; y = 0 - y; }
    t = Math.abs(y);
    if (t <= 6) { nn = 16; wo = 0; } else { if (t <= 24) { nn = 32; wo = 16; } else { nn = 64; wo = 48; } }
    // m^-s for m = 1 .. nn, and the weighted sum
    ZPR[1] = 1; ZPI[1] = 0;
    sr = ZW[wo + 1]; si = 0;
    k = 2;
    while (k <= nn) {
      p = SPF[k];
      if (p == k) {
        w = LNK[k];
        M_exp(e, 0 - x * w);
        t = y * w * R2D;
        pr = e * cosd(t); pi = 0 - e * sind(t);
      } else {
        q = idiv(k, p);
        pr = ZPR[p] * ZPR[q] - ZPI[p] * ZPI[q];
        pi = ZPR[p] * ZPI[q] + ZPI[p] * ZPR[q];
      }
      ZPR[k] = pr; ZPI[k] = pi;
      w = ZW[wo + k];
      sr = sr + w * pr; si = si + w * pi;
      k = k + 1;
    }
    ur = 1 - 2 * ZPR[2]; ui = 0 - 2 * ZPI[2];
    M_cdiv(zr, zi, sr, si, ur, ui);
    if (rf == 1) {
      // s = 1 - (x + iy): zeta(s) = 2^s pi^(s-1) sin(pi s / 2) gamma(x + iy) zeta(x + iy)
      if (Math.abs(y) > 400) { zr = 0; zi = 0; }
      else {
        // gamma(x + iy) 2^s pi^(s-1), the second factor as exp(s ln(2 pi) - ln pi)
        M_lanczos(gr, gi, x, y, (1 - x) * LN2PI - LNPI, 0 - y * LN2PI);
        sr = zr * gr - zi * gi; si = zr * gi + zi * gr;
        // sin(pi s / 2), s = (1 - x) - iy
        t = (1 - x) * 90;
        M_chsh(ch, sh, 0 - y * HPI);
        ur = sind(t) * ch; ui = cosd(t) * sh;
        zr = sr * ur - si * ui; zi = sr * ui + si * ur;
      }
    }
    VR[d + j] = zr; VI[d + j] = zi;
    j = j + 1;
  }
}

function execOp2(op, d, a, b, n) {
  if (op == O_GAMMA) { v_gamma(d, a, n); }
  if (op == O_ZETA) { v_zeta(d, a, n); }
  if (op > O_ZETA) { execOp3(op, d, a, b, n); }
}
function c_func2(code) {
  if (code == 125) { c_un(O_GAMMA); }
  if (code == 126) { c_un(O_ZETA); }
  if (code > 126) { c_func3(code); }
}
// names that are not plain constants: 7 the time t, 8 the parameter a
function c_name2(code) {
  if (code == 7) { usesT = 1; c_push(PT_OFF, 1); }
  if (code == 8) { usesA = 1; c_push(PA_OFF, 1); }
  if (code > 8) { c_name3(code); }
}

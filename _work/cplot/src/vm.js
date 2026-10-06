// ============================================================
// The vector machine
//
// A formula is compiled (compile.js) to a short program of operations on whole
// rows of complex numbers. A value lives in the lists VR (real parts) and VI
// (imaginary parts):
//   a register  k (1..NREG): cells (k-1)*RW + 1 .. (k-1)*RW + n   - n numbers, one per picture cell
//   a constant  c:           the one cell CB + c                  - one number
// An operand is an offset `o`: its j-th number is VR[o + j], VI[o + j]. So a
// constant has the offset CB + c - 1 and is read with j = 1, and every
// operation works on constants too when it is run with n = 1 - that is how the
// compiler folds constants, and how the calculator gets its value.
//
// Why rows: an Entry block costs about a microsecond wherever it stands, so
// choosing the operation once per row instead of once per cell is what is left
// to save.
//
// Numbers. Entry's + - x go through BigNumber (exact decimal, then the nearest
// double), which is as good as a double. Its division is rounded to 20 decimal
// places: 1 / 5e21 is 0. M_div below repairs that. There is no exp block and
// no atan2: exp is a table of powers of two times a short series, the angle
// comes from the atan block.
// ============================================================
const RW = 480;
const NREG = 10;
const CB = 4800;
const NCONST = 200;
const NPROG = 240;

const PI = 3.141592653589793;
const HPI = 1.5707963267948966;
const R2D = 57.29577951308232;
const D2R = 0.017453292519943295;
// exp: x = m * ln2/32 + s. m * EC1 is exact (EC1 has ten digits), EC2 is the rest of ln2/32
const EK = 46.16624130844683;
const EC1 = 0.0216608493;
const EC2 = 9.24982909192885e-11;

let VR = [], VI = [];
let PO = [], PD = [], PA = [], PB = [];
let pn = 0;
let INF = 0, NAN = 0, kTiny = 0, kHuge = 0, k25 = 0, k25i = 0, k150 = 0, k150i = 0;

function vmInit() {
  while (VR.length < 5000) { VR.push(0); VI.push(0); }
  while (PO.length < NPROG) { PO.push(0); PD.push(0); PA.push(0); PB.push(0); }
  INF = 1e308 * 10;
  NAN = INF - INF;
  kTiny = 1e-280; kHuge = 1e280;
  k25 = 1e25; k25i = 1e-25; k150 = 1e150; k150i = 1e-150;
}

// q = a / b, with the digits Entry's division drops from a small quotient
function M_div(q, a, b) {
  q = a / b;
  if (Math.abs(q) < 0.001) {
    if (a != 0) {
      q = ((a * k25) / b) * k25i;
      if (Math.abs(q) < 1e-28) { q = ((a * k150) / b) * k150i; }
    }
  }
}

// e^x
function M_exp(res, x) {
  if (x > -745 && x < 709.7) {
    em_ = Math.round(x * EK);
    es_ = (x - em_ * EC1) - em_ * EC2;
    eq_ = idiv(em_, 32);
    res = P2[eq_ + 1081] * EXT[em_ - eq_ * 32 + 1] * (1 + es_ * (1 + es_ * (0.5 + es_ * (0.16666666666666666 + es_ * (0.041666666666666664 + es_ * (0.008333333333333333 + es_ * 0.001388888888888889))))));
  } else {
    // (a NaN lands here too: it must not reach the table)
    if (x > 0) { res = INF; } else { if (x < 0) { res = 0; } else { res = NAN; } }
  }
}

// |x + iy|
function M_hyp(r, x, y) {
  hm_ = x * x + y * y;
  if (hm_ > kTiny && hm_ < kHuge) { r = Math.sqrt(hm_); }
  else {
    ha_ = Math.abs(x); hb_ = Math.abs(y);
    if (hb_ > ha_) { ht_ = ha_; ha_ = hb_; hb_ = ht_; }
    if (ha_ > 0 && ha_ < INF) { hb_ = hb_ / ha_; r = ha_ * Math.sqrt(1 + hb_ * hb_); }
    else { r = ha_ + hb_; }
  }
}

// the angle of x + iy in radians, -pi < angle <= pi (0 for 0)
function M_arg(res, x, y) {
  if (Math.abs(x) >= Math.abs(y)) {
    if (x == 0) { res = 0; }
    else {
      res = atand(y / x) * D2R;
      if (x < 0) { if (y >= 0) { res = res + PI; } else { res = res - PI; } }
    }
  } else {
    res = atand(x / y) * D2R;
    if (y > 0) { res = HPI - res; } else { res = 0 - HPI - res; }
  }
}

// (x + iy) / (u + iv), Smith's way: no square of u or v, so nothing overflows early
function M_cdiv(re, im, x, y, u, v) {
  if (Math.abs(u) >= Math.abs(v)) {
    if (u == 0) {
      // (then v is 0 too) a pole - or 0/0
      if (x * x + y * y > 0) { re = INF; im = 0; } else { re = NAN; im = NAN; }
    } else {
      dr_ = v / u; dd_ = u + v * dr_;
      M_div(re, x + y * dr_, dd_);
      M_div(im, y - x * dr_, dd_);
    }
  } else {
    dr_ = u / v; dd_ = u * dr_ + v;
    M_div(re, x * dr_ + y, dd_);
    M_div(im, y * dr_ - x, dd_);
  }
}

// cosh and sinh of a real y (a short series for a small y: e^y - e^-y would cancel)
function M_chsh(ch, sh, y) {
  M_exp(cy_, y);
  ci_ = 1 / cy_;
  ch = (cy_ + ci_) * 0.5;
  if (Math.abs(y) < 0.3) {
    c2_ = y * y;
    sh = y * (1 + c2_ * (0.16666666666666666 + c2_ * (0.008333333333333333 + c2_ * (0.0001984126984126984 + c2_ * 0.0000027557319223985893))));
  } else { sh = (cy_ - ci_) * 0.5; }
}

// ---------------- the operations ----------------
function v_copy(d, a, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = VR[a + j]; VI[d + j] = VI[a + j]; j = j + 1; }
}
function v_fill(d, c, n) {
  let j = 1, x = VR[c + 1], y = VI[c + 1];
  while (j <= n) { VR[d + j] = x; VI[d + j] = y; j = j + 1; }
}
function v_add(d, a, b, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = VR[a + j] + VR[b + j]; VI[d + j] = VI[a + j] + VI[b + j]; j = j + 1; }
}
function v_sub(d, a, b, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = VR[a + j] - VR[b + j]; VI[d + j] = VI[a + j] - VI[b + j]; j = j + 1; }
}
function v_mul(d, a, b, n) {
  let j = 1, x = 0, y = 0, u = 0, v = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j]; u = VR[b + j]; v = VI[b + j];
    VR[d + j] = x * u - y * v;
    VI[d + j] = x * v + y * u;
    j = j + 1;
  }
}
function v_div(d, a, b, n) {
  let j = 1, x = 0, y = 0, u = 0, v = 0, re = 0, im = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j]; u = VR[b + j]; v = VI[b + j];
    M_cdiv(re, im, x, y, u, v);
    VR[d + j] = re; VI[d + j] = im;
    j = j + 1;
  }
}
// a + c (c a constant)
function v_addc(d, a, c, n) {
  let j = 1, cr = VR[c + 1], ci = VI[c + 1];
  if (ci == 0 && d == a) {
    while (j <= n) { VR[d + j] = VR[d + j] + cr; j = j + 1; }
  } else {
    while (j <= n) { VR[d + j] = VR[a + j] + cr; VI[d + j] = VI[a + j] + ci; j = j + 1; }
  }
}
// c - a
function v_rsubc(d, a, c, n) {
  let j = 1, cr = VR[c + 1], ci = VI[c + 1];
  while (j <= n) { VR[d + j] = cr - VR[a + j]; VI[d + j] = ci - VI[a + j]; j = j + 1; }
}
// a * c
function v_mulc(d, a, c, n) {
  let j = 1, cr = VR[c + 1], ci = VI[c + 1], x = 0, y = 0;
  if (ci == 0) {
    while (j <= n) { VR[d + j] = VR[a + j] * cr; VI[d + j] = VI[a + j] * cr; j = j + 1; }
  } else {
    if (cr == 0) {
      while (j <= n) { x = VR[a + j]; VR[d + j] = 0 - VI[a + j] * ci; VI[d + j] = x * ci; j = j + 1; }
    } else {
      while (j <= n) {
        x = VR[a + j]; y = VI[a + j];
        VR[d + j] = x * cr - y * ci;
        VI[d + j] = x * ci + y * cr;
        j = j + 1;
      }
    }
  }
}
function v_neg(d, a, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = 0 - VR[a + j]; VI[d + j] = 0 - VI[a + j]; j = j + 1; }
}
function v_conj(d, a, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = VR[a + j]; VI[d + j] = 0 - VI[a + j]; j = j + 1; }
}
function v_re(d, a, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = VR[a + j]; VI[d + j] = 0; j = j + 1; }
}
function v_im(d, a, n) {
  let j = 1;
  while (j <= n) { VR[d + j] = VI[a + j]; VI[d + j] = 0; j = j + 1; }
}
function v_abs(d, a, n) {
  let j = 1, x = 0, y = 0, r = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    M_hyp(r, x, y);
    VR[d + j] = r; VI[d + j] = 0;
    j = j + 1;
  }
}
function v_arg(d, a, n) {
  let j = 1, x = 0, y = 0, r = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    M_arg(r, x, y);
    VR[d + j] = r; VI[d + j] = 0;
    j = j + 1;
  }
}
function v_sqr(d, a, n) {
  let j = 1, x = 0, y = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    VR[d + j] = (x - y) * (x + y);
    VI[d + j] = 2 * x * y;
    j = j + 1;
  }
}
function v_recip(d, a, n) {
  let j = 1, u = 0, v = 0, re = 0, im = 0;
  while (j <= n) {
    u = VR[a + j]; v = VI[a + j];
    M_cdiv(re, im, 1, 0, u, v);
    VR[d + j] = re; VI[d + j] = im;
    j = j + 1;
  }
}
// the principal square root (the cut along the negative real axis, sqrt(-1) = i)
function v_sqrt(d, a, n) {
  let j = 1, x = 0, y = 0, r = 0, t = 0, re = 0, im = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    M_hyp(r, x, y);
    if (r > 0 && r < INF) {
      if (x >= 0) {
        t = Math.sqrt((r + x) * 0.5);
        re = t;
        M_div(im, y, 2 * t);
      } else {
        t = Math.sqrt((r - x) * 0.5);
        M_div(re, Math.abs(y), 2 * t);
        if (y < 0) { im = 0 - t; } else { im = t; }
      }
    } else { re = r; im = 0; }
    VR[d + j] = re; VI[d + j] = im;
    j = j + 1;
  }
}
function v_exp(d, a, n) {
  let j = 1, x = 0, y = 0, e = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j] * R2D;
    M_exp(e, x);
    if (e == 0) { VR[d + j] = 0; VI[d + j] = 0; }
    else {
      if (y == 0) { VR[d + j] = e; VI[d + j] = 0; }
      else { VR[d + j] = e * cosd(y); VI[d + j] = e * sind(y); }
    }
    j = j + 1;
  }
}
// the principal logarithm
function v_ln(d, a, n) {
  let j = 1, x = 0, y = 0, m = 0, re = 0, im = 0, t = 0, u = 0, v = 0;
  while (j <= n) {
    x = VR[a + j]; y = VI[a + j];
    m = x * x + y * y;
    if (m > kTiny && m < kHuge) { re = Math.log(m) * 0.5; }
    else {
      t = Math.abs(x); u = Math.abs(y);
      if (u > t) { v = t; t = u; u = v; }
      if (t > 0 && t < INF) { u = u / t; re = Math.log(t) + Math.log(1 + u * u) * 0.5; }
      else { if (t == 0) { re = 0 - INF; } else { re = t + u; } }
    }
    M_arg(im, x, y);
    VR[d + j] = re; VI[d + j] = im;
    j = j + 1;
  }
}
// sin(x + iy) = sin x cosh y + i cos x sinh y
function v_sin(d, a, n) {
  let j = 1, x = 0, y = 0, ch = 0, sh = 0;
  while (j <= n) {
    x = VR[a + j] * R2D; y = VI[a + j];
    if (y == 0) { VR[d + j] = sind(x); VI[d + j] = 0; }
    else {
      M_chsh(ch, sh, y);
      VR[d + j] = sind(x) * ch;
      VI[d + j] = cosd(x) * sh;
    }
    j = j + 1;
  }
}
// tan(x + iy) = (sin 2x + i sinh 2y) / (cos 2x + cosh 2y)
function v_tan(d, a, n) {
  let j = 1, x = 0, y = 0, ch = 0, sh = 0, den = 0, re = 0, im = 0, t = 0;
  while (j <= n) {
    x = VR[a + j] * (2 * R2D); y = VI[a + j] * 2;
    if (Math.abs(y) > 80) {
      // (cosh 2y is past every digit of cos 2x)
      re = 0;
      if (y > 0) { im = 1; } else { im = -1; }
    } else {
      M_chsh(ch, sh, y);
      den = cosd(x) + ch;
      t = sind(x);
      if (den == 0) { re = INF; im = 0; }
      else { M_div(re, t, den); M_div(im, sh, den); }
    }
    VR[d + j] = re; VI[d + j] = im;
    j = j + 1;
  }
}

// ---------------- running a program ----------------
// operation codes
const O_COPY = 1, O_FILL = 2, O_ADD = 3, O_SUB = 4, O_MUL = 5, O_DIV = 6, O_ADDC = 7, O_RSUBC = 8, O_MULC = 9;
const O_NEG = 10, O_CONJ = 11, O_RE = 12, O_IM = 13, O_ABS = 14, O_ARG = 15, O_SQR = 16, O_RECIP = 17, O_SQRT = 18;
const O_EXP = 19, O_LN = 20, O_SIN = 21, O_TAN = 22;

function execOp(op, d, a, b, n) {
  if (op <= 9) {
    if (op <= 5) {
      if (op == 5) { v_mul(d, a, b, n); }
      else { if (op == 3) { v_add(d, a, b, n); } else { if (op == 4) { v_sub(d, a, b, n); } else { if (op == 1) { v_copy(d, a, n); } else { v_fill(d, a, n); } } } }
    } else {
      if (op == 7) { v_addc(d, a, b, n); }
      else { if (op == 9) { v_mulc(d, a, b, n); } else { if (op == 6) { v_div(d, a, b, n); } else { v_rsubc(d, a, b, n); } } }
    }
  } else {
    if (op <= 16) {
      if (op == 16) { v_sqr(d, a, n); }
      else { if (op == 10) { v_neg(d, a, n); } else { if (op == 11) { v_conj(d, a, n); } else { if (op == 12) { v_re(d, a, n); } else { if (op == 13) { v_im(d, a, n); } else { if (op == 14) { v_abs(d, a, n); } else { v_arg(d, a, n); } } } } } }
    } else {
      if (op <= 19) {
        if (op == 17) { v_recip(d, a, n); } else { if (op == 18) { v_sqrt(d, a, n); } else { v_exp(d, a, n); } }
      } else {
        if (op == 20) { v_ln(d, a, n); } else { if (op == 21) { v_sin(d, a, n); } else { if (op == 22) { v_tan(d, a, n); } else { execOp2(op, d, a, b, n); } } }
      }
    }
  }
}

// the program on register 1's first n cells (an operation whose result is a constant runs on that one cell)
function runProg(n) {
  let k = 1, d = 0;
  while (k <= pn) {
    d = PD[k];
    if (d >= CB) { execOp(PO[k], d, PA[k], PB[k], 1); }
    else { execOp(PO[k], d, PA[k], PB[k], n); }
    k = k + 1;
  }
}

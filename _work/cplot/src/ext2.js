// ============================================================
// v1.2: iteration
//
//   iter(body, n)   the n-th iterate of z -> body. In `body`, z is the iterate; if `c` occurs it is
//                   the point of the plane and z starts at 0 (so iter(z^2+c, n) is the Mandelbrot
//                   polynomial), otherwise z starts at the point (a Julia iteration).
//   esc(body, n)    the same iteration, coloured by how fast it escapes: 0 for a point that stays
//                   within |z| < 256 for n steps (black), else a number whose phase is the escape
//                   time (15 degrees a step) and whose size, 1 .. 2, is its fraction - so the
//                   ordinary colouring shows the familiar bands.
//
// The program gets a loop: O_LOOP ... body ... a step operation, O_ENDLOOP. The loop keeps two
// registers: the iterate, and one that marks the cells that are done (their iterate stays as it
// is, so nothing overflows). When no cell of the row is left, the loop ends early.
// ============================================================
const ILN2 = 1.4426950408889634;
const LN2 = 0.6931471805599453;
const ESC_R2 = 65536;         // |z| > 256: escaped
let inIter = 0, itZ = 0, itS = 0, itC = 0, itComma = 0, itPc = 0;

// the iterate's and the marks' registers at the start of a loop
function v_loopInit(z, s, zero, n) {
  let j = 1;
  if (zero == 1) {
    while (j <= n) { VR[z + j] = 0; VI[z + j] = 0; VR[s + j] = 0; j = j + 1; }
  } else {
    while (j <= n) { VR[z + j] = VR[j]; VI[z + j] = VI[j]; VR[s + j] = 0; j = j + 1; }
  }
}
// iter: the body's value r becomes the iterate z, for the cells still going; a cell past 1e140 stops
function v_itstep(z, r, s, n) {
  let j = 1, x = 0, y = 0, lv = 0;
  while (j <= n) {
    if (VR[s + j] == 0) {
      x = VR[r + j]; y = VI[r + j];
      VR[z + j] = x; VI[z + j] = y;
      if (x * x + y * y < kHuge) { lv = lv + 1; } else { VR[s + j] = 1; }
    }
    j = j + 1;
  }
  live = lv;
}
// esc: the same, and a cell that leaves |z| < 256 gets its escape time: the step, smoothed by how
// far out it landed (for z^2 + c: k + 5 - log2(log2 |z|), which runs on evenly from step to step)
function v_escstep(z, r, s, n) {
  let j = 1, x = 0, y = 0, m = 0, lv = 0;
  while (j <= n) {
    if (VR[s + j] == 0) {
      x = VR[r + j]; y = VI[r + j];
      VR[z + j] = x; VI[z + j] = y;
      m = x * x + y * y;
      if (m < ESC_R2) { lv = lv + 1; }
      else {
        if (m < kHuge) { VR[s + j] = loopK + 5 - Math.log(Math.log(m) * KLG) * ILN2; }
        else { VR[s + j] = loopK + 1; }
      }
    }
    j = j + 1;
  }
  live = lv;
}
// the escape times as numbers to colour
function v_escout(d, s, n) {
  let j = 1, v = 0, e = 0, t = 0;
  while (j <= n) {
    v = VR[s + j];
    if (v == 0) { VR[d + j] = 0; VI[d + j] = 0; }
    else {
      M_exp(e, mod(v, 1) * LN2);
      t = v * 15;
      VR[d + j] = e * cosd(t); VI[d + j] = e * sind(t);
    }
    j = j + 1;
  }
}

function execOp3(op, d, a, b, n) {
  if (op == O_ITSTEP) { v_itstep(d, a, b, n); }
  if (op == O_ESCSTEP) { v_escstep(d, a, b, n); }
  if (op == O_ESCOUT) { v_escout(d, a, n); }
}

// "iter(" or "esc(" was read: the loop opens before the body is compiled
function c_iterBegin() {
  if (inIter == 1) { cerr = 11; }
  inIter = 1; itC = 0; itComma = 0; usesZ = 1;
  c_allocReg(); itZ = cr_off;
  c_allocReg(); itS = cr_off;
  c_emit(O_LOOP, itZ, itS, 0);
  itPc = pn;
}
// the closing bracket of iter (131) or esc (132): on the stack the body's value and the count
function c_func3(code) {
  let b = SLOC[vsp], fb = SFLG[vsp], n = 0, r = 0, fr = 0;
  if (itComma != 1 || vsp < 2) { cerr = 11; }
  else {
    n = VR[b + 1];
    if (fb != 0 || VI[b + 1] != 0 || n != Math.floor(n) || n < 1 || n > 2000) { cerr = 11; }
    vsp = vsp - 1;
    r = SLOC[vsp]; fr = SFLG[vsp];
    if (fr <= 1) { c_allocReg(); c_emit(O_FILL, cr_off, r, 0); r = cr_off; fr = 3; }
    if (code == 131) { c_emit(O_ITSTEP, itZ, r, itS); } else { c_emit(O_ESCSTEP, itZ, r, itS); }
    c_emit(O_ENDLOOP, 0, 0, 0);
    PB[itPc] = n * 2 + itC;
    c_free(r, fr);
    if (code == 131) { SLOC[vsp] = itZ; c_free(itS, 3); }
    else { c_emit(O_ESCOUT, itS, itS, 0); SLOC[vsp] = itS; c_free(itZ, 3); }
    SFLG[vsp] = 3;
  }
  inIter = 0;
}
// 9: c, the point of the plane inside iter / esc
function c_name3(code) {
  if (code == 9) {
    if (inIter == 1) { itC = 1; c_push(0, 2); } else { cerr = 12; }
  }
}
// a character the formula reader does not know
function c_other(ch) { cerr = 1; }

// ============================================================
// The formula compiler: text -> a program for the vector machine
//
// One pass over the text (the shunting-yard method): numbers and names go to a
// value stack, operators wait on an operator stack until what follows binds
// weaker. Nothing is kept as a tree - an operator that leaves the stack is
// turned into machine operations at once.
//
// A value on the stack is where it will be when the program runs:
//   kind 0  a constant cell whose number is known now
//   kind 1  a constant cell worked out when the program runs (it depends on a parameter)
//   kind 2  a register the formula must not write to (z itself)
//   kind 3  a register this value alone uses (the next operation may overwrite it)
// An operation on kind 0 values only is run right here, on one cell - so
// "2*pi*i" costs nothing per picture cell, and a formula without z is a calculator.
// ============================================================
let src = '', cerr = 0, cpos = 0;
let SLOC = [], SFLG = [], OPK = [], REGU = [];
let vsp = 0, osp = 0, ccn = 0;
let resOff = 0, usesZ = 0, resKind = 0, resCell = 0;
let cc_off = 0, cr_off = 0, cs_off = 0, cs_f = 0, lk_code = 0, lk_len = 0;

// names: 1 z, 2 i, 3 e, 4 pi, 5 x, 6 y, 7 t, 8 a (ext.js); from 101 on, functions of one value
let NM = ['z', 'i', 'e', 'pi', 'π', 'x', 'y', 're', 'im', 'abs', 'arg', 'conj', 'sqrt', 'exp', 'ln', 'log', 'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'gamma', 'zeta', 't', 'a'];
let NC = [1, 2, 3, 4, 4, 5, 6, 101, 102, 103, 104, 105, 106, 107, 108, 108, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 116, 117, 118, 125, 126, 7, 8];
// operators on the stack: 1 + 2 - 3 * 4 / 5 ^ 6 minus sign, 7 an open bracket, a function's code
let PREC = [1, 1, 2, 2, 4, 3];
// the operator characters, and what each one is (7 open, 8 close)
const OPCH = '+-*/^()×÷·−';
let OPM = [1, 2, 3, 4, 5, 7, 8, 3, 4, 3, 2];
const CDIG = '0123456789.';
const CLOW = 'abcdefghijklmnopqrstuvwxyzπ';
const CUPP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function compInit() {
  while (SLOC.length < 64) { SLOC.push(0); SFLG.push(0); OPK.push(0); }
  while (REGU.length < NREG) { REGU.push(0); }
}

// ---------------- places ----------------
function c_newc() {
  // (the last cells are the parameters')
  if (ccn >= NCONST - 4) { cerr = 5; } else { ccn = ccn + 1; }
  cc_off = CB + ccn - 1;
}
function c_allocReg() {
  let k = 2, got = 0;
  while (k <= NREG && got == 0) {
    if (REGU[k] == 0) { got = k; }
    k = k + 1;
  }
  if (got == 0) { cerr = 6; got = NREG; }
  REGU[got] = 1;
  cr_off = (got - 1) * RW;
}
function c_free(loc, f) {
  if (f == 3) { REGU[idiv(loc, RW) + 1] = 0; }
}
function c_push(loc, f) {
  if (vsp >= 60) { cerr = 6; } else { vsp = vsp + 1; }
  SLOC[vsp] = loc; SFLG[vsp] = f;
}
function c_emit(op, d, a, b) {
  if (pn >= NPROG) { cerr = 10; } else { pn = pn + 1; }
  PO[pn] = op; PD[pn] = d; PA[pn] = a; PB[pn] = b;
}
function c_const(re, im) {
  c_newc();
  VR[cc_off + 1] = re; VI[cc_off + 1] = im;
  c_push(cc_off, 0);
}
function c_z() { usesZ = 1; c_push(0, 2); }

// one operation whose operands are all constants: run now if they are known, else when the program runs
function c_sop(op, a, b, known) {
  c_newc();
  cs_off = cc_off;
  if (known == 1) { execOp(op, cs_off, a, b, 1); cs_f = 0; }
  else { c_emit(op, cs_off, a, b); cs_f = 1; }
}

// ---------------- operations on the value stack ----------------
function c_un(op) {
  let a = SLOC[vsp], f = SFLG[vsp], d = 0;
  if (f <= 1) {
    c_sop(op, a, 0, 1 - f);
    SLOC[vsp] = cs_off; SFLG[vsp] = cs_f;
  } else {
    if (f == 3) { d = a; } else { c_allocReg(); d = cr_off; }
    c_emit(op, d, a, 0);
    SLOC[vsp] = d; SFLG[vsp] = 3;
  }
}
// op: O_ADD, O_SUB, O_MUL or O_DIV
function c_bin(op) {
  let b = SLOC[vsp], fb = SFLG[vsp];
  vsp = vsp - 1;
  let a = SLOC[vsp], fa = SFLG[vsp], d = 0, known = 0;
  if (fa <= 1 && fb <= 1) {
    if (fa + fb == 0) { known = 1; }
    c_sop(op, a, b, known);
    SLOC[vsp] = cs_off; SFLG[vsp] = cs_f;
  } else {
    if (fa >= 2 && fb >= 2) {
      if (fa == 3) { d = a; if (fb == 3) { c_free(b, 3); } }
      else { if (fb == 3) { d = b; } else { c_allocReg(); d = cr_off; } }
      c_emit(op, d, a, b);
    } else {
      if (fa >= 2) {
        // register (op) constant
        if (fa == 3) { d = a; } else { c_allocReg(); d = cr_off; }
        if (op == O_ADD) { c_emit(O_ADDC, d, a, b); }
        if (op == O_MUL) { c_emit(O_MULC, d, a, b); }
        if (op == O_SUB) { c_sop(O_NEG, b, 0, 1 - fb); c_emit(O_ADDC, d, a, cs_off); }
        if (op == O_DIV) { c_sop(O_RECIP, b, 0, 1 - fb); c_emit(O_MULC, d, a, cs_off); }
      } else {
        // constant (op) register
        if (fb == 3) { d = b; } else { c_allocReg(); d = cr_off; }
        if (op == O_ADD) { c_emit(O_ADDC, d, b, a); }
        if (op == O_MUL) { c_emit(O_MULC, d, b, a); }
        if (op == O_SUB) { c_emit(O_RSUBC, d, b, a); }
        if (op == O_DIV) { c_emit(O_RECIP, d, b, 0); c_emit(O_MULC, d, d, a); }
      }
    }
    SLOC[vsp] = d; SFLG[vsp] = 3;
  }
}
function c_drop() {
  c_free(SLOC[vsp], SFLG[vsp]);
  vsp = vsp - 1;
}
function c_swap() {
  let a = SLOC[vsp], f = SFLG[vsp];
  SLOC[vsp] = SLOC[vsp - 1]; SFLG[vsp] = SFLG[vsp - 1];
  SLOC[vsp - 1] = a; SFLG[vsp - 1] = f;
}
// a second copy of the value `back` places under the top (0: the top itself)
function c_pick(back) {
  let a = SLOC[vsp - back], f = SFLG[vsp - back];
  if (f == 3) { c_allocReg(); c_emit(O_COPY, cr_off, a, 0); c_push(cr_off, 3); }
  else { c_push(a, f); }
}

// base ^ exponent (the two top values)
function c_pow() {
  let b = SLOC[vsp], fb = SFLG[vsp], a = SLOC[vsp - 1], fa = SFLG[vsp - 1];
  let ex = 0, done = 0, m = 0, p = 0, acc = 0, sc = 0, known = 0, first = 1;
  if (fb == 0) {
    if (VI[b + 1] == 0) {
      ex = VR[b + 1];
      if (ex == Math.floor(ex) && Math.abs(ex) <= 1024) {
        // a whole number: squarings and multiplications (z^n by logarithm would cut the plane)
        done = 1;
        vsp = vsp - 1;
        m = Math.abs(ex);
        if (m == 0) { c_drop(); c_const(1, 0); }
        if (m >= 2) {
          if (fa <= 1) { sc = 1; known = 1 - fa; c_newc(); acc = cc_off; } else { c_allocReg(); acc = cr_off; }
          p = 1;
          while (p * 2 <= m) { p = p * 2; }
          p = idiv(p, 2);
          while (p >= 1) {
            if (first == 1) { c_pstep(O_SQR, acc, a, 0, sc, known); first = 0; }
            else { c_pstep(O_SQR, acc, acc, 0, sc, known); }
            if (mod(idiv(m, p), 2) == 1) { c_pstep(O_MUL, acc, acc, a, sc, known); }
            p = idiv(p, 2);
          }
          c_free(a, fa);
          SLOC[vsp] = acc;
          if (sc == 1) { SFLG[vsp] = fa; } else { SFLG[vsp] = 3; }
        }
        if (ex < 0) { c_un(O_RECIP); }
      } else {
        if (ex == 0.5) { done = 1; vsp = vsp - 1; c_un(O_SQRT); }
        if (ex == -0.5) { done = 1; vsp = vsp - 1; c_un(O_SQRT); c_un(O_RECIP); }
      }
    }
  }
  if (done == 0) {
    if (fa == 0 && VI[a + 1] == 0 && VR[a + 1] == 2.718281828459045) {
      // e ^ w
      c_swap(); c_drop(); c_un(O_EXP);
    } else {
      // exp(w ln a)
      c_swap(); c_un(O_LN); c_bin(O_MUL); c_un(O_EXP);
    }
  }
}
// one step of a power: on a constant known now, on a constant known later, or on a register
function c_pstep(op, d, a, b, sc, known) {
  if (sc == 1 && known == 1) { execOp(op, d, a, b, 1); } else { c_emit(op, d, a, b); }
}

// a function of one value (the top of the stack), as machine operations
function c_func(code) {
  if (code <= 112) {
    if (code == 101) { c_un(O_RE); }
    if (code == 102) { c_un(O_IM); }
    if (code == 103) { c_un(O_ABS); }
    if (code == 104) { c_un(O_ARG); }
    if (code == 105) { c_un(O_CONJ); }
    if (code == 106) { c_un(O_SQRT); }
    if (code == 107) { c_un(O_EXP); }
    if (code == 108) { c_un(O_LN); }
    if (code == 110) { c_un(O_SIN); }
    // cos z = sin(z + pi/2)
    if (code == 111) { c_const(HPI, 0); c_bin(O_ADD); c_un(O_SIN); }
    if (code == 112) { c_un(O_TAN); }
  } else {
    if (code <= 118) {
      // sinh z = -i sin(iz), cosh z = sin(iz + pi/2), tanh z = -i tan(iz)
      if (code == 113) { c_const(0, 1); c_bin(O_MUL); c_un(O_SIN); c_const(0, -1); c_bin(O_MUL); }
      if (code == 114) { c_const(0, 1); c_bin(O_MUL); c_const(HPI, 0); c_bin(O_ADD); c_un(O_SIN); }
      if (code == 115) { c_const(0, 1); c_bin(O_MUL); c_un(O_TAN); c_const(0, -1); c_bin(O_MUL); }
      // asin z = -i ln(iz + sqrt(1 - z^2)),  acos z = pi/2 - asin z
      if (code == 116 || code == 117) {
        c_pick(0); c_un(O_SQR); c_const(1, 0); c_swap(); c_bin(O_SUB); c_un(O_SQRT);
        c_swap(); c_const(0, 1); c_bin(O_MUL); c_bin(O_ADD); c_un(O_LN); c_const(0, -1); c_bin(O_MUL);
        if (code == 117) { c_const(HPI, 0); c_swap(); c_bin(O_SUB); }
      }
      // atan z = i/2 (ln(1 - iz) - ln(1 + iz))
      if (code == 118) {
        c_const(0, 1); c_bin(O_MUL); c_pick(0);
        c_const(1, 0); c_swap(); c_bin(O_SUB); c_un(O_LN);
        c_swap(); c_const(1, 0); c_bin(O_ADD); c_un(O_LN);
        c_bin(O_SUB); c_const(0, 0.5); c_bin(O_MUL);
      }
    } else {
      // asinh z = ln(z + sqrt(z^2 + 1))
      if (code == 119) { c_pick(0); c_un(O_SQR); c_const(1, 0); c_bin(O_ADD); c_un(O_SQRT); c_bin(O_ADD); c_un(O_LN); }
      // acosh z = ln(z + sqrt(z + 1) sqrt(z - 1))
      if (code == 120) {
        c_pick(0); c_const(1, 0); c_bin(O_ADD); c_un(O_SQRT);
        c_pick(1); c_const(-1, 0); c_bin(O_ADD); c_un(O_SQRT);
        c_bin(O_MUL); c_bin(O_ADD); c_un(O_LN);
      }
      // atanh z = (ln(1 + z) - ln(1 - z)) / 2
      if (code == 121) {
        c_pick(0); c_const(1, 0); c_bin(O_ADD); c_un(O_LN);
        c_swap(); c_const(1, 0); c_swap(); c_bin(O_SUB); c_un(O_LN);
        c_bin(O_SUB); c_const(0.5, 0); c_bin(O_MUL);
      }
      if (code == 122) { c_const(HPI, 0); c_bin(O_ADD); c_un(O_SIN); c_un(O_RECIP); }
      if (code == 123) { c_un(O_SIN); c_un(O_RECIP); }
      // cot z = tan(pi/2 - z)
      if (code == 124) { c_const(HPI, 0); c_swap(); c_bin(O_SUB); c_un(O_TAN); }
      if (code >= 125) { c_func2(code); }
    }
  }
}

// an operator leaves the operator stack
function c_apply(code) {
  if (code <= 4) { c_bin(code + 2); }
  else {
    if (code == 5) { c_pow(); }
    else { if (code == 6) { c_un(O_NEG); } else { if (code > 100) { c_func(code); } } }
  }
}
// a two-sided operator arrives: first whatever binds tighter (or as tight, from the left) leaves
function c_binop(code) {
  let go = 1, t = 0, tp = 0, p = PREC[code];
  while (go == 1) {
    go = 0;
    if (osp > 0) {
      t = OPK[osp];
      if (t <= 6) {
        tp = PREC[t];
        if (tp > p || (tp == p && code != 5)) { osp = osp - 1; c_apply(t); go = 1; }
      }
    }
  }
  osp = osp + 1; OPK[osp] = code;
}
// the longest known name `name` starts with -> lk_code, lk_len (0: none)
function c_lookup(name) {
  let len = strlen(name), k = 0, cand = ' ';
  lk_code = 0;
  while (len >= 1 && lk_code == 0) {
    cand = substr(name, 1, len);
    k = 1;
    while (k <= NM.length && lk_code == 0) {
      if (NM[k] == cand) { lk_code = NC[k]; }
      k = k + 1;
    }
    if (lk_code == 0) { len = len - 1; }
  }
  lk_len = len;
}

// src -> PO PD PA PB (pn operations), the result in register offset resOff. cerr != 0: an error at character cpos
function compile() {
  let s = `${src}$`, sl = strlen(src) + 1;
  let i = 1, ch = ' ', k = 0, j = 0, prev = 0, wantOpen = 0, name = ' ', v = 0, t = 0, code = 0, go = 0;
  pn = 0; vsp = 0; osp = 0; ccn = 0; cerr = 0; cpos = 0; usesZ = 0; usesT = 0; usesA = 0;
  k = 1;
  while (k <= NREG) { REGU[k] = 0; k = k + 1; }
  REGU[1] = 1;
  while (i < sl && cerr == 0) {
    ch = charAt(s, i);
    cpos = i;
    if (indexOf(CDIG, ch) > 0) {
      // a number
      // (digits and at most one point. A function's variable cannot hold "not a number" - it reads
      // back as 0 - so the text is checked, not the value)
      j = i; t = 0; k = 0;
      go = 1;
      while (go == 1) {
        k = indexOf(CDIG, charAt(s, j));
        if (k == 0) { go = 0; }
        else { if (k == 11) { t = t + 1; } j = j + 1; }
      }
      if (wantOpen == 1) { cerr = 3; }
      if (t <= 1 && j - i > t) {
        v = substr(s, i, j - 1) * 1;
        if (prev == 1) { c_binop(3); }
        c_const(v, 0);
        prev = 1;
      } else { cerr = 8; }
      i = j;
    } else {
      k = indexOf(CUPP, ch);
      if (k > 0) { ch = charAt(CLOW, k); }
      if (indexOf(CLOW, ch) > 0) {
        // a name: the longest known one these letters start with
        // (a function's variable holding '' reads back as 0: the name starts as its first letter)
        name = ch;
        j = i + 1;
        go = 1;
        while (go == 1) {
          ch = charAt(s, j);
          k = indexOf(CUPP, ch);
          if (k > 0) { ch = charAt(CLOW, k); }
          if (indexOf(CLOW, ch) == 0) { go = 0; }
          else { name = `${name}${ch}`; j = j + 1; }
        }
        c_lookup(name);
        if (wantOpen == 1) { cerr = 3; }
        if (lk_code == 0) { cerr = 2; }
        else {
          if (prev == 1) { c_binop(3); }
          if (lk_code > 100) { osp = osp + 1; OPK[osp] = lk_code; wantOpen = 1; prev = 0; }
          else {
            if (lk_code == 1) { c_z(); }
            if (lk_code == 2) { c_const(0, 1); }
            if (lk_code == 3) { c_const(2.718281828459045, 0); }
            if (lk_code == 4) { c_const(PI, 0); }
            if (lk_code == 5) { c_z(); c_un(O_RE); }
            if (lk_code == 6) { c_z(); c_un(O_IM); }
            if (lk_code >= 7) { c_name2(lk_code); }
            prev = 1;
          }
          i = i + lk_len;
        }
      } else {
        k = indexOf(OPCH, ch);
        if (k > 0) {
          code = OPM[k];
          if (wantOpen == 1 && code != 7) { cerr = 3; }
          if (code == 7) {
            if (prev == 1) { c_binop(3); }
            osp = osp + 1; OPK[osp] = 7;
            prev = 0; wantOpen = 0;
          } else {
            if (code == 8) {
              if (prev == 0) { cerr = 4; }
              else {
                go = 1;
                while (go == 1) {
                  if (osp == 0) { go = 0; cerr = 7; }
                  else {
                    t = OPK[osp]; osp = osp - 1;
                    if (t == 7) { go = 0; } else { c_apply(t); }
                  }
                }
                if (osp > 0 && cerr == 0) {
                  t = OPK[osp];
                  if (t > 100) { osp = osp - 1; c_apply(t); }
                }
              }
            } else {
              if (prev == 0) {
                // a sign
                if (code == 2) { osp = osp + 1; OPK[osp] = 6; }
                else { if (code != 1) { cerr = 4; } }
              } else { c_binop(code); prev = 0; }
            }
          }
          i = i + 1;
        } else {
          if (indexOf(' ', ch) > 0) { i = i + 1; } else { c_other(ch); i = i + 1; }
        }
      }
    }
    if (osp >= 60) { cerr = 6; }
  }
  if (cerr == 0) {
    cpos = sl;
    if (wantOpen == 1) { cerr = 3; }
    else { if (prev == 0) { if (vsp == 0) { cerr = 9; } else { cerr = 4; } } }
  }
  // brackets left open are closed here
  while (osp > 0 && cerr == 0) {
    t = OPK[osp]; osp = osp - 1;
    if (t != 7) { c_apply(t); }
  }
  if (cerr == 0) {
    if (vsp != 1) { cerr = 4; }
    else {
      resKind = SFLG[1];
      resCell = SLOC[1];
      if (resKind <= 1) { c_allocReg(); c_emit(O_FILL, cr_off, resCell, 0); resOff = cr_off; }
      else { resOff = resCell; }
    }
  }
}

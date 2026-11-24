// The letter model and the arithmetic coder.
//
// Symbols are numbered by their place in SYMS: a-z 1..26, space 27, , . ? ! 28..31, A-Z 32..57.
// M[(k - 1) * 31 + c] holds every row of the contexts of k letters whose oldest letter is c:
//   | context  n  the n listed symbols  their running totals (two base-64 digits each)
// The listed symbols of a row share MAINT = 4039 of the 4096; the last 57 are one each for
// every symbol, so a symbol the row does not list is still possible (12 bits).

let M = [];
// model state: the letters so far in lower case, and whether the last two letters were capitals
let hist = '', u1 = 0, u2 = 0;
// the row for the next symbol, and the share cl..ch of 4096 of the symbol being coded
let rowS = '', rowC = '', rowK = 0, cl = 0, ch = 0;
// coder: the interval, the bits waiting on a carry, the six-bit letter being filled
let lo = 0, hi = 0, pend = 0, acc = 0, accN = 0, out = '', nbits = 0;
// decoder: the bits read so far as a number, the code and the place in it
let val = 0, src = '', dPos = 0, dLen = 0, dAcc = 0, dN = 0, dec = '';
// the bits of the symbol being coded, and the words so far with the bits each took: word[bits]
let cb = 0, wb = 0, word = '', wordN = 0, wl = '', wlMore = 0;

function modelReset() {
  hist = '. '; u1 = 0; u2 = 0;
  cb = 0; wb = 0; word = ''; wordN = 0; wl = ''; wlMore = 0;
}

// the row of the longest context that has one
function findRow() {
  let L = strlen(hist);
  let k = NORD;
  if (L < k) { k = L; }
  let p = 0, b = 0, n = 0, q = 0;
  while (k > 0) {
    b = (k - 1) * 31 + indexOf(CTX, charAt(hist, L - k + 1));
    p = indexOf(M[b], str('|', substr(hist, L - k + 1, L)));
    if (p > 0) {
      q = p + k + 1;
      n = indexOf(B64, charAt(M[b], q)) - 1;
      rowS = substr(M[b], q + 1, q + n);
      rowC = substr(M[b], q + n + 1, q + 3 * n);
      rowK = k;
      k = 0;
    } else {
      k = k - 1;
    }
  }
}

// the running total after the i-th listed symbol
function cumAt(i) {
  let a = indexOf(B64, charAt(rowC, 2 * i - 1)) - 1;
  return a * 64 + indexOf(B64, charAt(rowC, 2 * i)) - 1;
}

// cl..ch <- the share of symbol sc in the row
function symRange(sc) {
  let pos = indexOf(rowS, charAt(SYMS, sc));
  if (pos > 0) {
    ch = cumAt(pos);
    if (pos > 1) { cl = cumAt(pos - 1); } else { cl = 0; }
  } else {
    cl = MAINT + sc - 1;
    ch = cl + 1;
  }
}

// the word that just ended goes on the list with its bits
function flushWord() {
  if (wordN > 0) {
    if (strlen(wl) < WLMAX) { wl = str(wl, word, '[', Math.round(wb), ']  '); } else { wlMore = 1; }
    word = ''; wordN = 0; wb = 0;
  }
}

// the letter joins the history, and its bits the word it is in
function advance(code, letter) {
  hist = str(hist, charAt(LOWS, code));
  if (letter == 1) {
    u2 = u1;
    if (code >= 32) { u1 = 1; } else { u1 = 0; }
  }
  wb = wb + cb;
  if (code == 27) { flushWord(); } else { word = str(word, charAt(SYMS, code)); wordN = wordN + 1; }
}

// ---------------- compress ----------------
function emit(b) {
  acc = acc * 2 + b; accN = accN + 1; nbits = nbits + 1;
  if (accN == 6) { out = str(out, charAt(B64, acc + 1)); acc = 0; accN = 0; }
}

function putBit(b) {
  emit(b);
  while (pend > 0) { emit(1 - b); pend = pend - 1; }
}

// the interval shrinks to its part cl..ch, and the bits that are settled go out
function narrow() {
  let r = hi - lo + 1;
  hi = lo + idiv(r * ch, T) - 1;
  lo = lo + idiv(r * cl, T);
  let go = 1;
  while (go == 1) {
    if (hi < HALF) { putBit(0); } else {
      if (lo >= HALF) { putBit(1); lo = lo - HALF; hi = hi - HALF; } else {
        if (lo >= QUART && hi < QUART3) { pend = pend + 1; lo = lo - QUART; hi = hi - QUART; } else { go = 0; }
      }
    }
    if (go == 1) { lo = lo * 2; hi = hi * 2 + 1; }
  }
}

// a number 0..255, every value as likely as another (8 bits)
function encByte(v) {
  cl = v * 16; ch = cl + 16;
  narrow();
}

function encBegin(n) {
  lo = 0; hi = TOP - 1; pend = 0; acc = 0; accN = 0; out = ''; nbits = 0;
  modelReset();
  if (n < 255) { encByte(n); } else { encByte(255); encByte(idiv(n, 256)); encByte(mod(n, 256)); }
}

function encChar(code) {
  let sc = code, letter = 0;
  if (code <= 26 || code >= 32) { letter = 1; }
  if (letter == 1 && u1 + u2 == 2) {
    if (code >= 32) { sc = code - 31; } else { sc = code + 31; }
  }
  findRow();
  symRange(sc);
  cb = Math.log(T / (ch - cl)) / LN2;
  narrow();
  advance(code, letter);
}

// two more bits say which quarter, then zeros fill the last six-bit letter
function encEnd() {
  pend = pend + 1;
  if (lo < QUART) { putBit(0); } else { putBit(1); }
  encBits = nbits;
  while (accN > 0) { emit(0); }
}

// ---------------- decompress ----------------
function nextBit() {
  if (dN == 0) {
    dPos = dPos + 1;
    if (dPos <= dLen) { dAcc = indexOf(B64, charAt(src, dPos)) - 1; } else { dAcc = 0; }
    dN = 6;
  }
  dN = dN - 1;
  let b = idiv(dAcc, 32);
  dAcc = (dAcc - b * 32) * 2;
  return b;
}

// where in 0..4095 the code points
function target() {
  let r = hi - lo + 1;
  return idiv((val - lo + 1) * T - 1, r);
}

// the decoder's side of narrow(): the same interval, reading bits instead of writing them
function settle() {
  let r = hi - lo + 1;
  hi = lo + idiv(r * ch, T) - 1;
  lo = lo + idiv(r * cl, T);
  let go = 1;
  while (go == 1) {
    if (hi >= HALF) {
      if (lo >= HALF) { val = val - HALF; lo = lo - HALF; hi = hi - HALF; } else {
        if (lo >= QUART && hi < QUART3) { val = val - QUART; lo = lo - QUART; hi = hi - QUART; } else { go = 0; }
      }
    }
    if (go == 1) { lo = lo * 2; hi = hi * 2 + 1; val = val * 2 + nextBit(); }
  }
}

function decByte() {
  let v = idiv(target(), 16);
  cl = v * 16; ch = cl + 16;
  settle();
  return v;
}

// decN <- the number of letters the code holds
function decBegin() {
  lo = 0; hi = TOP - 1; val = 0; dPos = 0; dN = 0; dAcc = 0; dLen = strlen(src); dec = '';
  let i = 0;
  while (i < 32) { val = val * 2 + nextBit(); i = i + 1; }
  modelReset();
  decN = decByte();
  if (decN == 255) {
    i = decByte();
    decN = i * 256 + decByte();
  }
}

function decChar() {
  findRow();
  let t = target();
  let sc = 0, i = 1, letter = 0;
  if (t >= MAINT) {
    sc = t - MAINT + 1;
    cl = t; ch = t + 1;
  } else {
    cl = 0; ch = cumAt(1);
    while (ch <= t) { i = i + 1; cl = ch; ch = cumAt(i); }
    sc = indexOf(SYMS, charAt(rowS, i));
  }
  cb = Math.log(T / (ch - cl)) / LN2;
  settle();
  if (sc <= 26 || sc >= 32) { letter = 1; }
  let code = sc;
  if (letter == 1 && u1 + u2 == 2) {
    if (sc >= 32) { code = sc - 31; } else { code = sc + 31; }
  }
  dec = str(dec, charAt(SYMS, code));
  advance(code, letter);
}

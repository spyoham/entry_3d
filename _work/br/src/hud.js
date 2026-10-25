// ===================================================================== text
// One text object `txt`: it clones itself NTX times; clone k shows slot k of the TX*
// lists and redraws only when the slot's version moves. The box is fixed width, left
// aligned, so "set size" is an exact font scale; centre / right come from the
// monospace advance (TXCW em a character; Korean letters count two).
let txt$slot = 0;
let txt$v = 0 - 1;
let TXS = [], TXX = [], TXY = [], TXZ = [], TXC = [], TXV = [];
const NTX = 56, TXW = 1000, TXH = 28, TXF = 20, TXCW = 0.5, BLANK = '​';
const TXSZ = (TXW + TXH) / 2 / TXF;
const ASCII = ' !"#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~';

// width of s in em: Korean (and other wide) letters are two halves
function emOf(s) {
  let n = strlen(s), w = 0, i = 1;
  while (i <= n) { if (indexOf(ASCII, charAt(s, i)) > 0) { w = w + 1; } else { w = w + 2; } i = i + 1; }
  return w * TXCW;
}
// x, y: anchor; sz: font px; al: 0 centre, 1 left, 2 right
function tx(i, s, x, y, sz, col, al) {
  let gx = x;
  if (al != 1) {
    let w = emOf(s) * sz;
    if (al == 0) { gx = x - w / 2; } else { gx = x - w; }
  }
  gx = gx + TXW / 2 * sz / TXF;
  let ch = 0;
  if (TXS[i] != s) { TXS[i] = s; ch = 1; }
  if (TXX[i] != gx) { TXX[i] = gx; ch = 1; }
  if (TXY[i] != y) { TXY[i] = y; ch = 1; }
  if (TXZ[i] != sz) { TXZ[i] = sz; ch = 1; }
  if (TXC[i] != col) { TXC[i] = col; ch = 1; }
  if (ch > 0) { TXV[i] = TXV[i] + 1; }
}
function txOff(i) {
  if (TXS[i] != BLANK) { TXS[i] = BLANK; TXV[i] = TXV[i] + 1; }
}
function txClear() {
  let i = 1;
  while (i <= NTX) { txOff(i); i = i + 1; }
}

on('start', 'txt', function () {
  hide();
  let k = 1;
  while (k <= NTX) {
    TXS.push(BLANK); TXX.push(0); TXY.push(0); TXZ.push(TXF); TXC.push('#ffffff'); TXV.push(0);
    k = k + 1;
  }
  k = 1;
  while (k <= NTX) {
    txt$slot = k;
    cloneSelf();
    k = k + 1;
  }
  txt$slot = 0;
});

on('clone', 'txt', function () {
  show();
  for (;;) {
    if (TXV[txt$slot] != txt$v) {
      txt$v = TXV[txt$slot];
      write(TXS[txt$slot]);
      textColorHex(TXC[txt$slot]);
      setSize(TXZ[txt$slot] * TXSZ);
      goto(TXX[txt$slot], TXY[txt$slot]);
    }
  }
});

// ---------------------------------------------------------------- pen HUD helpers
function M_box(x0, y0, x1, y1, col) {
  fillStop(); goto(x0, y0); fillColorHex(col); fillStart(); goto(x1, y0); goto(x1, y1); goto(x0, y1);
}
function hudBox(x0, y0, x1, y1, col) { M_box(x0, y0, x1, y1, col); }
function hudLine(x0, y0, x1, y1, w, col) {
  fillStop(); penSize(w); penColorHex(col); goto(x0, y0); penDown(); goto(x1, y1); penUp();
}

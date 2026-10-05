// Draw-path probe. NR runs per frame over NC colours. MODE 1: draw at once (colour change per run).
// MODE 2: bucket by colour (linked lists), then 2-point strokes per colour. MODE 3: as 2, pads small buckets to 16.
let PAL = [];
let HEAD = [];
let CNT = [];
let USED = [];
let RX0 = [];
let RX1 = [];
let RY = [];
let RN = [];
let frames = 0, seed = 1, nrun = 0, nused = 0;
function init() {
  let i = 0;
  while (i < 4096) { PAL.push(rgb(idiv(i, 256) * 17, mod(idiv(i, 16), 16) * 17, mod(i, 16) * 17)); HEAD.push(0); CNT.push(0); i = i + 1; }
  i = 0;
  while (i < NR + 100) { RX0.push(0); RX1.push(0); RY.push(0); RN.push(0); i = i + 1; }
  i = 0;
  while (i < 4096) { USED.push(0); i = i + 1; }
}
function emit(c, x0, x1, y) {
  nrun = nrun + 1;
  RX0[nrun] = x0; RX1[nrun] = x1; RY[nrun] = y;
  let h = HEAD[c];
  if (h == 0) { nused = nused + 1; USED[nused] = c; }
  RN[nrun] = h; HEAD[c] = nrun;
  CNT[c] = CNT[c] + 1;
}
function flushRuns() {
  let k = 1;
  while (k <= nused) {
    let c = USED[k];
    let i = HEAD[c];
    penColorHex(PAL[c]);
    while (i > 0) {
      goto(RX0[i], RY[i]); penDown(); goto(RX1[i], RY[i]); penUp();
      i = RN[i];
    }
    if (MODE == 3) {
      let n = CNT[c];
      if (n < 16) { if (n > 4) {
        penDown();
        while (n < 16) { goto(RX0[1], RY[1]); penDown(); n = n + 1; }
        penUp();
      } }
    }
    HEAD[c] = 0; CNT[c] = 0;
    k = k + 1;
  }
  nused = 0; nrun = 0;
}
on('start', 'cam', function () {
  hide(); init(); penSize(1);
  for (;;) {
    eraseAll();
    let i = 0, x = -240, y = 135;
    seed = frames * 7 + 1;
    while (i < NR) {
      seed = mod(seed * 75 + 74, 65537);
      let c = mod(seed, NC) * 13 + 1;
      let w = 2 + mod(seed, 7);
      if (x + w > 240) { x = -240; y = y - 1; }
      if (MODE == 1) { penColorHex(PAL[c]); goto(x, y); penDown(); goto(x + w, y); penUp(); }
      else { emit(c, x, x + w, y); }
      x = x + w;
      i = i + 1;
    }
    if (MODE != 1) { flushRuns(); }
    frames = frames + 1;
  }
});

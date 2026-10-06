// ============================================================
// v2.1: everything by the pointer alone
//
// A row of buttons along the bottom stands for the keys, and a pad of keys
// writes the formula. A button is a clone of the text box `btn`: it shows its
// label at its place, and nothing else - which button a press hits is worked
// out from where the pointer is (the buttons lie on a grid), in uiPress.
//   1 .. 14    the row of buttons, 34 units each
//   15 .. 74   the formula pad: 5 rows of 12 keys, 40 by 24 units
//   75         the button that hides and shows the row
// ============================================================
let BL = [' 식 ', '  ◀  ', '  ▶  ', '  +  ', '  -  ', '처음', ' 색 ', ' 축 ', '격자', '보기', '곱게', '  t  ', '  a  ', '  ?  ', '  7  ', '  8  ', '  9  ', '  (  ', '  )  ', '  z  ', '  i  ', '  e  ', ' pi ', '  ^  ', '  ⌫  ', ' AC ', '  4  ', '  5  ', '  6  ', '  *  ', '  /  ', '  x  ', '  y  ', '  a  ', '  t  ', '  c  ', '  ,  ', ' ^2 ', '  1  ', '  2  ', '  3  ', '  +  ', '  -  ', ' sin ', ' cos ', ' tan ', ' exp ', ' ln ', 'sqrt', ' abs ', '  0  ', '  .  ', ' re ', ' im ', ' arg ', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'gamma', 'zeta', 'iter', ' esc ', 'asinh', 'acosh', 'atanh', ' sec ', ' csc ', ' cot ', 'conj', '취소', '확인', '  ≡  '];
// what a key of the pad writes
let KINS = ['7', '8', '9', '(', ')', 'z', 'i', 'e', 'pi', '^', '⌫', 'AC', '4', '5', '6', '*', '/', 'x', 'y', 'a', 't', 'c', ',', '^2', '1', '2', '3', '+', '-', 'sin(', 'cos(', 'tan(', 'exp(', 'ln(', 'sqrt(', 'abs(', '0', '.', 're(', 'im(', 'arg(', 'sinh(', 'cosh(', 'tanh(', 'asin(', 'acos(', 'atan(', 'gamma(', 'zeta(', 'iter(', 'esc(', 'asinh(', 'acosh(', 'atanh(', 'sec(', 'csc(', 'cot(', 'conj(', '취소', '확인'];
// the key each button of the row stands for (1001: the formula pad, 1002: moving a by the pointer)
let TBK = [1001, 188, 190, 90, 88, 82, 67, 65, 71, 86, 81, 32, 1002, 72];
let BX = [], BY = [], BG = [], BS = [], BV = [0, 0, 0];
let menuOn = 1, padOn = 0, padText = '', padShow = ' ', aMode = 0, uiHit = 0, btnKey = 0, btnBorn = 0;
let btn$k = 0, btn$vis = -1, btn$st = 0;

function btnInit() {
  let k = 1;
  while (k <= 14) { BX.push(34 * k - 257); BY.push(-124); BG.push(1); BS.push(0); k = k + 1; }
  k = 0;
  while (k < 60) { BX.push(40 * mod(k, 12) - 220); BY.push(-27 - 24 * idiv(k, 12)); BG.push(2); BS.push(0); k = k + 1; }
  BX.push(224); BY.push(125); BG.push(3); BS.push(0);
}
function padOpen() {
  padOn = 1; padText = fsrc; errT = 0;
}
// key k of the pad (1 .. 60)
function padKey(k) {
  let n = strlen(padText);
  if (k == 60) {
    // the formula is taken - or, if it is wrong, the pad stays and says what is wrong
    if (n > 0) { errT = 0; setFormula(padText); if (errT == 0) { padOn = 0; } }
  } else {
    errT = 0;
    if (k == 59) { padOn = 0; showTop(); }
    else {
      if (k == 12) { padText = ''; }
      else {
        if (k == 11) { if (n > 1) { padText = substr(padText, 1, n - 1); } else { padText = ''; } }
        else { if (n < 110) { padText = `${padText}${KINS[k]}`; } }
      }
    }
  }
}
// the pointer went down at (mx, my): on a button? -> uiHit (the press is not for the picture), btnKey
function uiPress(mx, my) {
  let k = 0, c = 0;
  btnKey = 0; uiHit = 0;
  if (helpOn == 1) { helpOn = 0; uiHit = 1; }
  else {
    if (padOn == 1) {
      uiHit = 1;
      if (my < -15) {
        c = idiv(mx + 240, 40);
        if (c < 0) { c = 0; }
        if (c > 11) { c = 11; }
        k = idiv(-15 - my, 24);
        if (k > 4) { k = 4; }
        padKey(k * 12 + c + 1);
      }
    } else {
      if (mx > 206 && my > 114) { uiHit = 1; menuOn = 1 - menuOn; }
      else {
        if (menuOn == 1 && my < -112) {
          uiHit = 1;
          k = idiv(mx + 240, 34) + 1;
          if (k >= 1 && k <= 14) { btnKey = TBK[k]; }
        } else {
          // the formula itself is a button too
          if (mx < -90 && my > 120) { uiHit = 1; btnKey = 1001; }
        }
      }
    }
  }
}
// what is shown, and which buttons are lit
function uiShow() {
  let v = 0;
  if (menuOn == 1 && padOn == 0 && helpOn == 0) { v = 1; }
  BV[1] = v;
  BV[2] = padOn;
  v = 0;
  if (padOn == 0 && helpOn == 0) { v = 1; }
  BV[3] = v;
  BS[8] = axesOn; BS[9] = gridOn; BS[11] = hiq; BS[13] = aMode;
  v = 0;
  if (view3 > 0) { v = 1; }
  BS[10] = v;
  v = 0;
  if (usesT == 1 && playing == 1) { v = 1; }
  BS[12] = v;
  if (padOn == 1) {
    if (errT > 0) { padShow = errText; } else { padShow = `f(z) = ${padText}_`; }
  }
}

on('start', 'btn', function () {
  let k = 1;
  hide();
  for (;;) {
    // (once the lists of places are there)
    if (ready == 1 && k == 1) {
      while (k <= BL.length) { cloneSelf(); k = k + 1; }
    }
  }
});
on('clone', 'btn', function () {
  btnBorn = btnBorn + 1;
  btn$k = btnBorn; btn$vis = -1; btn$st = 0;
  goto(BX[btn$k], BY[btn$k]);
  write(BL[btn$k]);
  for (;;) {
    if (BV[BG[btn$k]] != btn$vis) {
      btn$vis = BV[BG[btn$k]];
      if (btn$vis == 1) { show(); } else { hide(); }
    }
    if (BS[btn$k] != btn$st) {
      btn$st = BS[btn$k];
      if (btn$st == 1) { textColorHex('#ffd84a'); } else { textColorHex('#ffffff'); }
    }
  }
});
on('start', 'pad', function () {
  let was = -1;
  for (;;) {
    if (padOn != was) { was = padOn; if (was == 1) { show(); } else { hide(); } }
  }
});
on('start', 'padl', function () {
  let was = -1, shown = '';
  for (;;) {
    if (padOn != was) { was = padOn; if (was == 1) { show(); } else { hide(); } }
    if (padOn == 1 && padShow != shown) { shown = padShow; write(shown); }
  }
});

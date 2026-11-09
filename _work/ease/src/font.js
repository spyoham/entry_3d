// ============================================================
// The variable font: seven axes, each a number in [-1, 1] (AXV[1..7]):
//   1 WGHT  weight: the stroke 3 .. 20 (of a cap height of 100)
//   2 WDTH  width: x times 0.55 .. 1.45
//   3 SLNT  slant: -18 .. 18 degrees
//   4 SQAR  squareness: arcs from the ellipse to the square around it
//   5 CONT  contrast: the stroke as wide as a broad nib held at NIBA would make it
//   6 NIBA  nib angle: -90 .. 90 degrees (a nib turned half round is the same nib:
//           the axis is periodic, -1 = 1)
//   7 HUE   colour: -180 .. 180 degrees round the colour wheel (periodic)
// A stroke is drawn as one filled quadrilateral a segment, the quads sharing their
// edges (mitred joins, square caps), so a stroke that crosses itself is still drawn right.
// ============================================================
// (GX0 GY0 GX1 GY1 SKS SKN SKC CHS CHN CHW are made by the build)
let AXV = [0, 0, 0, 0, 0, 0, 0];
let WG = [];
let wordN = 0, WORD = 'EASING';
let TX = [], TY = [], SNX = [], SNY = [], OX = [], OY = [];
let fTh = 0, fWd = 1, fSl = 0, fSq = 0, fCt = 0, fNx = 1, fNy = 0, fCol = '#ffffff', fHue = 0;

function colourOf(r, g, b) {
  let R0 = Math.round(clamp(r, 0, 255)), G0 = Math.round(clamp(g, 0, 255)), B0 = Math.round(clamp(b, 0, 255));
  // (a table of two-figure hex strings would not do: tessvm reads '00' or '42' as numbers)
  return rgb(R0, G0, B0);
}
let cR = 0, cG = 0, cB = 0;
// hue (degrees), saturation, value -> cR cG cB (0..255)
function hsv(h, s, v) {
  let hh = (h % 360) / 60, i = 0, f = 0, p = 0, q = 0, u = 0;
  i = Math.floor(hh); f = hh - i;
  p = v * (1 - s); q = v * (1 - s * f); u = v * (1 - s * (1 - f));
  cR = v; cG = u; cB = p;
  if (i == 1) { cR = q; cG = v; cB = p; }
  if (i == 2) { cR = p; cG = v; cB = u; }
  if (i == 3) { cR = p; cG = q; cB = v; }
  if (i == 4) { cR = u; cG = p; cB = v; }
  if (i == 5) { cR = v; cG = p; cB = q; }
  cR = cR * 255; cG = cG * 255; cB = cB * 255;
}

// the glyph of a character (1-based glyph number; '#' when there is none)
function glyphOf(c) {
  let k = indexOf(LOOKUP, c);
  if (k > 26) { k = k - 26; }
  if (k < 1) { k = NGLYPH; }
  return k;
}
function setWord(s) {
  let i = 1, n = strlen(s);
  if (n > 20) { n = 20; }
  WORD = s; wordN = n;
  for (const _ of rep(n)) { WG[i] = glyphOf(charAt(s, i)); i = i + 1; }
}

// the style the axes say
function styleFrom() {
  fTh = 3 + (AXV[1] + 1) * 8.5;
  if (fTh < 0.8) { fTh = 0.8; }
  fWd = 1 + 0.45 * AXV[2];
  if (fWd < 0.3) { fWd = 0.3; }
  fSl = tand(18 * clamp(AXV[3], -2, 2));
  fSq = clamp((AXV[4] + 1) / 2, 0, 1);
  fCt = clamp((AXV[5] + 1) / 2, 0, 1);
  fNx = cosd(90 * AXV[6]); fNy = sind(90 * AXV[6]);
  fHue = 180 * AXV[7];
  hsv(fHue + 720, 0.62, 0.98);
  fCol = colourOf(cR, cG, cB);
}
// the advance of glyph g in the style now (font units)
function advOf(g) {
  let a = CHW[g] * fWd + fTh + 18;
  return a;
}

// the word in the style now, centred on (cx, base + cap/2), cap height capPx;
// widest is the most room it may take (px)
let wSc = 1;
function drawWord(cx, base, capPx, widest) {
  let i = 1, tot = 0, x0 = 0, g = 0, s = 0, k = 0, most = 0;
  styleFrom();
  // the scale is set by the widest the word can get, so it does not breathe with the axes
  for (const _ of rep(wordN)) { g = WG[i]; tot = tot + advOf(g); most = most + CHW[g] * 1.5 + 41; i = i + 1; }
  wSc = capPx / 100;
  if (most * wSc > widest) { wSc = widest / most; }
  x0 = cx - (tot - 18) * wSc / 2 + fTh * wSc / 2;
  fillStop();
  fillColorHex(fCol);
  i = 1;
  for (const _ of rep(wordN)) {
    g = WG[i]; s = CHS[g]; k = 0;
    for (const _ of rep(CHN[g])) { drawStroke(s + k, x0, base); k = k + 1; }
    x0 = x0 + advOf(g) * wSc;
    i = i + 1;
  }
  fillStop();
}

// one stroke of the glyph at x0 (screen), baseline base
function drawStroke(si, x0, base) {
  let n = SKN[si], p = SKS[si], cl = SKC[si], j = 1, x = 0, y = 0, dx = 0, dy = 0, l = 0, nx = 0, ny = 0, h0 = fTh * wSc / 2, h = 0, mi = 0, a = 0, b = 0, m = 0, e = 0.35, ex = 0, ey = 0, last = n - 1;
  // the points on the screen
  for (const _ of rep(n)) {
    x = GX0[p] + fSq * (GX1[p] - GX0[p]); y = GY0[p] + fSq * (GY1[p] - GY0[p]);
    TX[j] = x0 + (x * fWd + (y - 50) * fSl) * wSc;
    TY[j] = base + y * wSc;
    p = p + 1; j = j + 1;
  }
  if (cl == 1) { TX[n + 1] = TX[1]; TY[n + 1] = TY[1]; last = n; }
  // segment normals (left of the way the stroke goes)
  j = 1; nx = 0; ny = 1;
  for (const _ of rep(last)) {
    dx = TX[j + 1] - TX[j]; dy = TY[j + 1] - TY[j]; l = Math.sqrt(dx * dx + dy * dy);
    if (l > 0.000001) { nx = 0 - dy / l; ny = dx / l; }
    SNX[j] = nx; SNY[j] = ny;
    j = j + 1;
  }
  if (cl == 1) { SNX[n + 1] = SNX[1]; SNY[n + 1] = SNY[1]; }
  // the offset of each point: along the mean of its two normals, as long as the mitre
  // asks (at most 3 times), and as thick as the nib lets the stroke be there
  j = 1;
  for (const _ of rep(n)) {
    if (j == 1) {
      if (cl == 1) { a = SNX[n] + SNX[1]; b = SNY[n] + SNY[1]; } else { a = SNX[1]; b = SNY[1]; }
    } else {
      if (j == n && cl == 0) { a = SNX[n - 1]; b = SNY[n - 1]; } else { a = SNX[j - 1] + SNX[j]; b = SNY[j - 1] + SNY[j]; }
    }
    l = Math.sqrt(a * a + b * b);
    if (l < 0.000001) { a = SNX[j]; b = SNY[j]; l = 1; }
    a = a / l; b = b / l;
    mi = a * SNX[j] + b * SNY[j];
    if (j == n && cl == 0) { mi = a * SNX[n - 1] + b * SNY[n - 1]; }
    if (mi < 0.34) { mi = 0.34; }
    m = Math.abs(a * fNx + b * fNy);
    if (m < 0.1) { m = 0.1; }
    h = h0 * (1 - fCt + fCt * m) / mi;
    OX[j] = a * h; OY[j] = b * h;
    j = j + 1;
  }
  // square caps: the ends pushed out by half the stroke
  if (cl == 0) {
    l = Math.sqrt(OX[1] * OX[1] + OY[1] * OY[1]);
    // (the direction of the first segment is (ny, -nx) of its normal)
    TX[1] = TX[1] - SNY[1] * l; TY[1] = TY[1] + SNX[1] * l;
    l = Math.sqrt(OX[n] * OX[n] + OY[n] * OY[n]);
    TX[n] = TX[n] + SNY[n - 1] * l; TY[n] = TY[n] - SNX[n - 1] * l;
  }
  if (cl == 1) { OX[n + 1] = OX[1]; OY[n + 1] = OY[1]; }
  // the quads (each a hair longer at both ends, so no seam shows between them)
  j = 1;
  for (const _ of rep(last)) {
    ex = SNY[j] * e; ey = 0 - SNX[j] * e;
    fillStop();
    goto(TX[j] + OX[j] - ex, TY[j] + OY[j] - ey);
    fillStart();
    goto(TX[j + 1] + OX[j + 1] + ex, TY[j + 1] + OY[j + 1] + ey);
    goto(TX[j + 1] - OX[j + 1] + ex, TY[j + 1] - OY[j + 1] + ey);
    goto(TX[j] - OX[j] - ex, TY[j] - OY[j] - ey);
    j = j + 1;
  }
}

// a line of text in the round, thinnest style, drawn with the pen: x is the left end
// (al 0), the middle (al 1) or the right end (al 2); cap height capPx
function textW(s, capPx) {
  let i = 1, w = 0, g = 0;
  for (const _ of rep(strlen(s))) { g = glyphOf(charAt(s, i)); w = w + CHW[g] + 34; i = i + 1; }
  mRes = (w - 34) * capPx / 100;
}
function drawText(s, x, y, capPx, al) {
  let i = 1, g = 0, k = 0, sc = capPx / 100, x0 = x, si = 0, p = 0, n = 0;
  if (al > 0) { textW(s, capPx); x0 = x - mRes * al / 2; }
  for (const _ of rep(strlen(s))) {
    g = glyphOf(charAt(s, i)); k = 0;
    for (const _ of rep(CHN[g])) {
      si = CHS[g] + k; p = SKS[si]; n = SKN[si];
      penUp();
      goto(x0 + GX0[p] * sc, y + GY0[p] * sc);
      penDown();
      for (const _ of rep(n - 1)) { p = p + 1; goto(x0 + GX0[p] * sc, y + GY0[p] * sc); }
      if (SKC[si] == 1) { goto(x0 + GX0[SKS[si]] * sc, y + GY0[SKS[si]] * sc); }
      if (n == 2) { if (GY0[p] - GY0[p - 1] < 1.5) { if (GX0[p] - GX0[p - 1] < 1.5) { goto(x0 + GX0[p] * sc + 1, y + GY0[p] * sc); } } }
      k = k + 1;
    }
    penUp();
    x0 = x0 + (CHW[g] + 34) * sc;
    i = i + 1;
  }
  penUp();
}

// ============================================================
// v2.0: the modulus surface and the Riemann sphere (the V key)
//
// Both are meshes of filled four-sided cells (Entry's fill blocks), drawn by the
// `solid` object over the flat picture, and turned by dragging.
//
// The surface: over the part of the plane in view, the height log|f| pressed
// into a finite range by atan (the bottom at a zero, the top at a pole, half
// way where |f| = 1), each cell in the colour of the flat picture - so the
// lightness rings are its contour lines. The cells are drawn from the far side
// to the near one, which for a height field seen from above hides what should
// be hidden.
//
// The sphere: the whole plane and the point at infinity, by stereographic
// projection (the north pole is infinity, the south pole the centre of the
// view, the equator the circle of radius 64 stage units around it). Only the
// cells that face the viewer are drawn.
//
// What costs time is f, not the drawing. So the values are kept (a height and a
// colour per vertex, a colour per cell of the sphere), and turning only draws
// them again. They are worked out in two passes - every second vertex first -
// and while the picture is being turned on a slow machine the coarse mesh is
// the one drawn.
// ============================================================
const SNX = 60, SNY = 34, SVX = 61;           // the surface: cells, and vertices in a row
const SLON = 72, SLAT = 36, SUX = 73;         // the sphere: cells, and vertices on a parallel
const SCLON = 36;                              // its coarse cells around
const S_WD = 290, S_DD = 163, S_HH = 130, S_OY = -62, S_RP = 118;

let view3 = 0, az = 30, el = 35;
let HV = [], HK = [], PX = [], PY = [], SK = [], SKC = [], XC = [], XS = [], YS = [];
let s3Init = 0, s3Gen = 0, s3View = 0, s3Row = 0, s3Pass = 0, s3Have = 0, s3Dirty = 0, s3Shown = 0, s3Az = 0, s3El = 0, s3St = 0;
let s3cx = 0, s3cy = 0, s3upp = 1, s3md = 1, s3T = 0, s3Ar = 1, s3Ai = 0;

function solidInit() {
  while (HV.length < 2135) { HV.push(0); HK.push(1); }
  while (PX.length < 2701) { PX.push(0); PY.push(0); }
  while (SK.length < 2592) { SK.push(1); }
  while (SKC.length < 648) { SKC.push(1); }
  while (XC.length < 74) { XC.push(0); XS.push(0); YS.push(0); }
}

// the vertices of row j of the surface (every st-th one): height and colour
function surfRow(j, st) {
  let n = idiv(SNX, st) + 1, k = 1, x = s3cx - 240 * s3upp, dx = 480 * s3upp * st / SNX, y = s3cy + (j / SNY - 0.5) * 270 * s3upp;
  let p = 0, pe = 0, o = j * SVX + 1, c = 0, md = s3md;
  while (k <= n) { VR[k] = x; VI[k] = y; x = x + dx; k = k + 1; }
  VR[PT_OFF + 1] = s3T; VR[PA_OFF + 1] = s3Ar; VI[PA_OFF + 1] = s3Ai;
  runProg(n);
  p = resOff + 1; pe = resOff + n;
  while (p <= pe) {
    x = VR[p]; y = VI[p];
    // the height: log2|f|, pressed into 0 .. 1 (1/2 where |f| = 1, 1/4 and 3/4 where it is 1/8 and 8)
    HV[o] = 0.5 + atand(Math.log(x * x + y * y) * (KLG / 3)) / 180;
    M_palIdx(c, x, y, md);
    HK[o] = c;
    o = o + st; p = p + 1;
  }
}
// the cells of band b of the sphere (st = 1), or of the coarse band that starts there (st = 2): colours
function sphRow(b, st) {
  let n = idiv(SLON, st), k = 1, th = (b + st / 2) * (180 / SLAT), ph = (st / 2) * (360 / SLON), dph = st * (360 / SLON);
  let rr = cosd(th / 2) / sind(th / 2) * s3upp * 64, p = 0, pe = 0, o = 0, x = 0, y = 0, c = 0, md = s3md;
  while (k <= n) { VR[k] = s3cx + rr * cosd(ph); VI[k] = s3cy + rr * sind(ph); ph = ph + dph; k = k + 1; }
  VR[PT_OFF + 1] = s3T; VR[PA_OFF + 1] = s3Ar; VI[PA_OFF + 1] = s3Ai;
  runProg(n);
  p = resOff + 1; pe = resOff + n;
  if (st == 1) { o = b * SLON + 1; } else { o = idiv(b, 2) * SCLON + 1; }
  while (p <= pe) {
    x = VR[p]; y = VI[p];
    M_palIdx(c, x, y, md);
    if (st == 1) { SK[o] = c; } else { SKC[o] = c; }
    o = o + 1; p = p + 1;
  }
}

function M_cell(pa, pb, pc, pd) {
  fillStop();
  goto(PX[pa], PY[pa]);
  if (c != pc_) { fillColorHex(PAL[c]); pc_ = c; }
  fillStart();
  goto(PX[pb], PY[pb]); goto(PX[pc], PY[pc]); goto(PX[pd], PY[pd]);
}

function drawSurface(st) {
  let ca = cosd(az), sa = sind(az), se = sind(el), ce = cosd(el) * S_HH;
  let i = 0, j = 0, o = 0, x = 0, y = 0, a = 0, b = 0, c = 0, di = 0, i0 = 0, dj = 0, ni = 0, nj = 0, w = st * SVX;
  pc_ = 0;
  // where each vertex is on the stage
  while (i <= SNX) { x = (i / SNX - 0.5) * S_WD; XC[i + 1] = x * ca; XS[i + 1] = x * sa * se; i = i + st; }
  while (j <= SNY) {
    y = (j / SNY - 0.5) * S_DD;
    x = 0 - y * sa;
    y = y * ca * se + S_OY;
    o = j * SVX + 1; i = 1;
    while (i <= SVX) { PX[o] = XC[i] + x; PY[o] = XS[i] + y + HV[o] * ce; o = o + st; i = i + st; }
    j = j + st;
  }
  // the cells, the far ones first
  j = 0; dj = st;
  if (ca >= 0) { j = SNY - st; dj = 0 - st; }
  i0 = 0; di = st;
  if (sa >= 0) { i0 = SNX - st; di = 0 - st; }
  nj = idiv(SNY, st);
  while (nj > 0) {
    a = j * SVX + i0 + 1;
    ni = idiv(SNX, st);
    while (ni > 0) {
      c = HK[a];
      b = a + w;
      M_cell(a, a + st, b + st, b);
      a = a + di; ni = ni - 1;
    }
    j = j + dj; nj = nj - 1;
  }
  fillStop();
}

function drawSphere(st) {
  let se = sind(el), ce = cosd(el);
  let u = 0, v = 0, o = 0, s = 0, z = 0, y = 0, t = 0, a = 0, b = 0, c = 0, k = 0, w = st * SUX;
  pc_ = 0;
  // around: cos and sin of the longitude (turned by az) at the vertices, sin at the middles of the cells
  while (u <= SLON) {
    t = u * (360 / SLON) + az;
    XC[u + 1] = cosd(t) * S_RP; XS[u + 1] = sind(t);
    YS[u + 1] = sind(t + st * (180 / SLON));
    u = u + st;
  }
  while (v <= SLAT) {
    t = v * (180 / SLAT);
    s = sind(t); z = cosd(t) * ce * S_RP; y = s * se * S_RP;
    o = v * SUX + 1; u = 1;
    while (u <= SUX) { PX[o] = s * XC[u]; PY[o] = XS[u] * y + z; o = o + st; u = u + st; }
    v = v + st;
  }
  v = 0;
  while (v < SLAT) {
    t = (v + st / 2) * (180 / SLAT);
    s = sind(t) * ce; z = cosd(t) * se;
    a = v * SUX + 1;
    if (st == 1) { k = v * SLON + 1; } else { k = idiv(v, 2) * SCLON + 1; }
    u = 1;
    while (u <= SLON) {
      // (a cell faces the viewer if its middle does)
      if (z - s * YS[u] > 0) {
        if (st == 1) { c = SK[k]; } else { c = SKC[k]; }
        b = a + w;
        M_cell(a, a + st, b + st, b);
      }
      a = a + st; k = k + 1; u = u + st;
    }
    v = v + st;
  }
  fillStop();
}

function solidStep() {
  let st = 0, done = 0, end = 0;
  if (view3 == 0) {
    if (s3Shown == 1) { eraseAll(); s3Shown = 0; s3Have = 0; s3Pass = 0; }
  } else {
    if (s3Init == 0) { solidInit(); s3Init = 1; }
    // another formula, view or kind of picture: the values are worked out anew (a first pass
    // under way is finished before that, so a picture that keeps changing still gets drawn)
    if ((s3Gen != vgen || s3View != view3) && s3Pass != 1) {
      s3Gen = vgen; s3View = view3;
      s3cx = vcx; s3cy = vcy; s3upp = vupp; s3md = cmode; s3T = tPar; s3Ar = aRe; s3Ai = aIm;
      s3Pass = 1; s3Row = 0; s3Have = 0;
    }
    while (s3Pass > 0 && done < budget) {
      st = 3 - s3Pass;
      end = 0;
      if (s3View == 1) {
        surfRow(s3Row, st);
        done = done + idiv(SNX, st) + 1;
        s3Row = s3Row + st;
        if (s3Row > SNY) { end = 1; }
      } else {
        sphRow(s3Row, st);
        done = done + idiv(SLON, st);
        s3Row = s3Row + st;
        if (s3Row >= SLAT) { end = 1; }
      }
      if (end == 1) {
        s3Have = st; s3Dirty = 1; s3Row = 0;
        if (s3Pass == 1 && s3Gen == vgen) { s3Pass = 2; } else { s3Pass = 0; }
      }
    }
    if (done * 2 >= budget) { workN = workN + 1; }
    // let go after turning with the coarse mesh: the fine one again
    if (mWas == 0 && s3St != s3Have) { s3Dirty = 1; }
    if (s3Have > 0 && (s3Dirty == 1 || s3Az != az || s3El != el)) {
      st = s3Have;
      if (mWas == 1 && budget < 1500) { st = 2; }
      s3Dirty = 0; s3Az = az; s3El = el; s3St = st; s3Shown = 1;
      eraseAll();
      // the background
      fillColorHex('#12161d');
      goto(-245, -140); fillStart(); goto(245, -140); goto(245, 140); goto(-245, 140); fillStop();
      if (s3View == 1) { drawSurface(st); } else { drawSphere(st); }
    }
  }
}

on('start', 'solid', function () {
  hide();
  for (;;) {
    if (ready == 1) { solidStep(); }
  }
});

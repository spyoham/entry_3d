// ============================================================
// The renderer
//
// Filled faces (Entry's fill blocks; a face is a triangle or four-cornered), the far
// ones first. For a view:
//   1  every vertex of a page to the stage (xf): whole-number arithmetic and
//      one division for each of x and y; its distance stays in TZ
//   2  every triangle of the page (ps): which side of its plane the eye is on
//      (one dot product with numbers kept from loading). A triangle seen from
//      behind is done with. One seen from the front is hung on the chain of its
//      depth (HD, the heads; LK, the links) and gets its colour: the light
//      shines from the eye, so the same dot product divided by the distance is
//      its brightness
//   3  the chains from the farthest to the nearest, each face a filled shape
//
// Depth order by chains needs no sorting: a triangle is hung in one step, and
// the drawing walks the heads once (emptying each as it goes, so they need no
// clearing for the next picture). The order within one chain is left as it
// falls: a chain is a slab of depth far thinner than a triangle is wide.
//
// A model of many pages goes through 1 and 2 page by page (TZ is the page's own
// while its triangles are looked at), and 3 finds each triangle's page from its
// number (page * 8192 + place).
//
// All of it can be done within one frame (renderLevel) or a part each frame
// (refineStep): the model itself is worked out behind the picture of a coarse
// one and then painted over it from the back to the front.
//
// Plain Entry draws on a canvas that smooths edges, and two shapes that share
// an edge leave a hairline of what is behind them. So the picture that stays
// (not the ones drawn while the model moves) is drawn with each triangle's
// edges as pen lines of its own colour: the pen's layer lies under the fills
// and shows through those hairlines. tessvm has no such hairlines.
// ============================================================
let az = -32, el = 20, zoom = 1.1, panX = 0, panY = 0, upZ = 0, two = 0, colMode = 0, spin = 0;
let xa0 = 0, xa1 = 0, xa2 = 0, xa3 = 0, xb0 = 0, xb1 = 0, xb2 = 0, xb3 = 0, xc0 = 0, xc1 = 0, xc2 = 0, xc3 = 0;
let eyeX = 0, eyeY = 0, eyeZ = 0, wOff = 0, bktW = 1, nbk = 64, backW = 0;
let dB = 0, dR = 0, rTwo = 0, rBig = 0, rOut = 0, hdDirty = 1, rVis = 1, rPg1 = 1;
let viewGen = 1, shownGen = 0, shownLv = 0, shownOut = 0, rOn = 0, rPg = 0, rSt = 0, rOff = 0, idleN = 0, rMulti = 0;
let cap = 2500, capR = 2500, capFail = 0, capAge = 0, work = 0, busy = 0, isTess = 0, pickLv = 1, pickWas = 9;

function M_xform(VX, VY, VZ, SX, SY) {
  let i = i0;
  let a0 = xa0, a1 = xa1, a2 = xa2, a3 = xa3, b0 = xb0, b1 = xb1, b2 = xb2, b3 = xb3, c0 = xc0, c1 = xc1, c2 = xc2, c3 = xc3;
  for (const _ of rep(n)) {
    TZ[i] = c0 * VX[i] + c1 * VY[i] + c2 * VZ[i] + c3;
    SX[i] = (a0 * VX[i] + a1 * VY[i] + a2 * VZ[i] + a3) / TZ[i];
    SY[i] = (b0 * VX[i] + b1 * VY[i] + b2 * VZ[i] + b3) / TZ[i];
    i = i + 1;
  }
}
// (wb: a triangle seen from behind counts as a little farther than it is. Of a thin wall
// drawn with both its sides the far side then goes under the near one, though the two are
// too close for their middles to tell.)
function M_visB(FA, FB, FC, FM, LK, CL) {
  w = TZ[FA[i]] + TZ[FB[i]] + TZ[FC[i]];
  b = idiv(w + wb - w0, bw);
  LK[i] = HD[b];
  HD[b] = rb + i;
  CL[i] = RAMP[FM[i] + idiv(s * 93, w)];
}
function M_vis(FA, FB, FC, FM, LK, CL) {
  w = TZ[FA[i]] + TZ[FB[i]] + TZ[FC[i]];
  b = idiv(w - w0, bw);
  LK[i] = HD[b];
  HD[b] = rb + i;
  CL[i] = RAMP[FM[i] + idiv(s * 93, w)];
}
// The depth of a face is that of its middle - which is right for faces that are small, and
// wrong for a floor or a wall: a chair standing on the far half of a floor is farther than
// the floor's middle, and would be painted first and then covered. So a model that has
// large faces (rBig) takes each face's nearest or farthest point instead. Which of the two:
// if the eye and the middle of the model are on the same side of the face's plane, the face
// is behind what there is to see (a floor from above, the far wall of a room) and counts by
// its farthest point; if its plane parts them, the face is in front (the near wall seen from
// outside) and counts by its nearest. Both come from three corners: with w twice the depth
// of the middle of the corners a and c, the spread is |a - c| or |2b - w| (the other
// diagonal of a four-cornered face), whichever is more.
function M_visG(FA, FB, FC, FM, LK, CL) {
  w = TZ[FA[i]] + TZ[FC[i]];
  e = Math.abs(TZ[FA[i]] - TZ[FC[i]]);
  f = Math.abs(TZ[FB[i]] * 2 - w);
  if (f > e) { e = f; }
  if (d < 0) { b = idiv(w + e + wb - w0, bw); } else { b = idiv(w - e + wb - w0, bw); }
  LK[i] = HD[b];
  HD[b] = rb + i;
  CL[i] = RAMP[FM[i] + idiv(s * 62, w)];
}
function M_pass(FA, FB, FC, NA, NB, NC, ND, FM, LK, CL) {
  let i = i0, s = 0, w = 0, b = 0, wb = 0, e = 0, f = 0, d = 0, ex = eyeX, ey = eyeY, ez = eyeZ, w0 = wOff, bw = bktW, bb = backW;
  if (rBig == 1) {
    if (rTwo == 1) {
      for (const _ of rep(n)) {
        s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i];
        if (s != 0) {
          if (s < 0) { s = 0 - s; wb = bb; d = 0 - ND[i]; } else { wb = 0; d = ND[i]; }
          M_visG(FA, FB, FC, FM, LK, CL);
        }
        i = i + 1;
      }
    } else {
      for (const _ of rep(n)) {
        s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i];
        if (s > 0) {
          d = ND[i];
          M_visG(FA, FB, FC, FM, LK, CL);
        }
        i = i + 1;
      }
    }
  } else {
  if (rTwo == 1) {
    for (const _ of rep(n)) {
      s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i];
      if (s != 0) {
        wb = 0;
        if (s < 0) { s = 0 - s; wb = bb; }
        M_visB(FA, FB, FC, FM, LK, CL);
      }
      i = i + 1;
    }
  } else {
    for (const _ of rep(n)) {
      s = NA[i] * ex + NB[i] * ey + NC[i] * ez - ND[i];
      if (s > 0) { M_vis(FA, FB, FC, FM, LK, CL); }
      i = i + 1;
    }
  }
  }
}
function M_tri(FA, FB, FC, FE, SX, SY, CL, i) {
  fillStop();
  goto(SX[FA[i]], SY[FA[i]]);
  fillColorHex(CL[i]);
  fillStart();
  goto(SX[FB[i]], SY[FB[i]]);
  goto(SX[FC[i]], SY[FC[i]]);
  if (FE[i] > 0) { goto(SX[FE[i]], SY[FE[i]]); }
}
// (with its edges as pen lines of its colour)
function M_triO(FA, FB, FC, FE, SX, SY, CL, i) {
  penUp();
  fillStop();
  goto(SX[FA[i]], SY[FA[i]]);
  penColorHex(CL[i]);
  fillColorHex(CL[i]);
  fillStart();
  penDown();
  goto(SX[FB[i]], SY[FB[i]]);
  goto(SX[FC[i]], SY[FC[i]]);
  if (FE[i] > 0) { goto(SX[FE[i]], SY[FE[i]]); }
  goto(SX[FA[i]], SY[FA[i]]);
}
// n chains of one page, from where the drawing stands (dB, dR)
function M_draw1(FA, FB, FC, FE, SX, SY, LK, CL) {
  let b = dB, r = dR;
  if (rOut == 1) {
    for (const _ of rep(n)) {
      while (r > 0) {
        M_triO(FA, FB, FC, FE, SX, SY, CL, r);
        r = LK[r];
      }
      b = b - 1;
      r = HD[b];
      HD[b] = 0;
    }
    penUp();
  } else {
    for (const _ of rep(n)) {
      while (r > 0) {
        M_tri(FA, FB, FC, FE, SX, SY, CL, r);
        r = LK[r];
      }
      b = b - 1;
      r = HD[b];
      HD[b] = 0;
    }
  }
  fillStop();
  dB = b; dR = r;
}

// the view as whole numbers. A vertex (x, y, z) is seen at
//   (xa . v + xa3) / (xc . v + xc3),  (xb . v + xb3) / (xc . v + xc3)
// and xc . v + xc3 is its distance from the eye along the line of sight (times MS * VS).
// nf: how many triangles there are to order
function setMatrix(nf) {
  let ca = cosd(az), sa = sind(az), ce = cosd(el), se = sind(el), t = 0;
  let r0x = ca, r0y = 0, r0z = sa;
  let r1x = sa * se, r1y = ce, r1z = 0 - ca * se;
  let r2x = 0 - sa * ce, r2y = se, r2z = ca * ce;
  let f = S0 * zoom * DC * MS, h3 = 0;
  if (upZ == 1) {
    // a model whose up is z: (x, y, z) stands at (x, z, -y)
    t = r0y; r0y = 0 - r0z; r0z = t;
    t = r1y; r1y = 0 - r1z; r1z = t;
    t = r2y; r2y = 0 - r2z; r2z = t;
  }
  xc0 = Math.round(0 - MS * r2x); xc1 = Math.round(0 - MS * r2y); xc2 = Math.round(0 - MS * r2z); xc3 = Math.round(DC * VS * MS);
  xa0 = Math.round(f * r0x + panX * xc0); xa1 = Math.round(f * r0y + panX * xc1); xa2 = Math.round(f * r0z + panX * xc2); xa3 = Math.round(panX * xc3);
  xb0 = Math.round(f * r1x + panY * xc0); xb1 = Math.round(f * r1y + panY * xc1); xb2 = Math.round(f * r1z + panY * xc2); xb3 = Math.round(panY * xc3);
  eyeX = Math.round(DC * VS * r2x); eyeY = Math.round(DC * VS * r2y); eyeZ = Math.round(DC * VS * r2z);
  if (rBig == 1) {
    // the careful depths: twice a distance, give or take a spread - over 2 * xc3 -+ h3.
    // (More chains, as they have a wider run to cover.)
    nbk = idiv(nf, 2);
    if (nbk < 64) { nbk = 64; }
    if (nbk > 4096) { nbk = 4096; }
    h3 = Math.round(6.1 * MS * VS);
    backW = 0;
    if (rTwo == 1) { backW = Math.round(0.2 * MS * VS); }
    bktW = Math.ceil((2 * h3 + backW) / nbk);
    wOff = 2 * xc3 - h3 - 2 * bktW;
  } else {
    // the chains: a quarter as many as faces; the sum of three distances runs over 3 * xc3 -+ h3
    nbk = idiv(nf, 4);
    if (nbk < 64) { nbk = 64; }
    if (nbk > 2048) { nbk = 2048; }
    h3 = Math.round(3.03 * MS * VS);
    backW = 0;
    if (rTwo == 1) { backW = Math.round(0.3 * MS * VS); }
    bktW = Math.ceil((2 * h3 + backW) / nbk);
    wOff = 3 * xc3 - h3 - 2 * bktW;
  }
  // (heads left from a picture that was given up are emptied)
  while (HD.length < nbk + 2) { HD.push(0); }
  if (hdDirty == 1) { clearHeads(); }
  hdDirty = 1;
  // about how many triangles will be drawn
  rVis = nf;
  if (rTwo == 0) { rVis = idiv(nf, 2) + 1; }
}
function clearHeads() {
  let i = 1;
  for (const _ of rep(HD.length)) { HD[i] = 0; i = i + 1; }
}
// (the ground is a pen line as thick as the stage is high: it has to lie in the pen's
// layer, under the fills, or it would hide the pen edges that the hairlines are to show)
function background() {
  eraseAll();
  fillStop();
  penUp();
  penColorHex(BGCOL);
  penSize(290);
  goto(-250, 0);
  penDown();
  goto(250, 0);
  penUp();
  penSize(1);
}
function drawBegin() {
  background();
  dB = nbk + 2; dR = HD[dB]; HD[dB] = 0;
}
// n chains more
function drawSome(n) {
  if (n > dB - 1) { n = dB - 1; }
  if (rMulti == 1) { drawMulti(n); } else { drPage(rPg1, n); }
  if (dB <= 1) { hdDirty = 0; }
}

// level lv, whole, now (drawn plainly: the model is moving)
function renderLevel(lv) {
  let p = LVA[lv], pe = LVB[lv], rb = 0;
  // (a coarse model is not the closed surface the model may be: both sides of it)
  rTwo = two;
  if (lv > 1) { rTwo = 1; }
  rOut = 0;
  rBig = 0;
  if (LVG[lv] > 0) { rBig = 1; }
  setMatrix(LVN[lv]);
  rMulti = 0; rPg1 = p;
  if (pe > p) { rMulti = 1; }
  while (p <= pe) {
    if (rMulti == 1) { rb = p * 8192; }
    xfPage(p, 1, PNV[p]);
    psPage(p, 1, PNF[p], rb);
    p = p + 1;
  }
  drawBegin();
  drawSome(dB);
  work = work + LVC[lv];
}

// the model itself, a part each frame: rOn 1 working out (page rPg, rSt 0 vertices / 1 triangles,
// rOff done so far), 2 painting
function refineStep() {
  let left = capR, n = 0, rb = 0;
  if (rOn == 1) {
    if (rMulti == 1) { rb = rPg * 8192; }
    while (left > 0 && rOn == 1) {
      if (rSt == 0) {
        n = PNV[rPg] - rOff;
        if (n > left) { n = left; }
        xfPage(rPg, rOff + 1, n);
        rOff = rOff + n; left = left - n;
        if (rOff >= PNV[rPg]) { rSt = 1; rOff = 0; }
      } else {
        n = PNF[rPg] - rOff;
        if (n > left) { n = left; }
        psPage(rPg, rOff + 1, n, rb);
        rOff = rOff + n; left = left - n;
        if (rOff >= PNF[rPg]) {
          rSt = 0; rOff = 0; rPg = rPg + 1;
          if (rMulti == 1) { rb = rPg * 8192; }
          if (rPg > LVB[1]) {
            rOn = 2; left = 0;
            drawBegin();
          }
        }
      }
    }
  } else {
    // as many chains as hold about capR / 2 faces
    n = idiv(capR * nbk, 2 * rVis) + 1;
    drawSome(n);
    if (dB <= 1) { rOn = 0; shownLv = 1; shownOut = rOut; }
  }
  work = work + capR;
}

// the finest level a frame has room for
// (a finer level than the last time only when there is room to spare: the pace is a
// measurement, and a level right at its edge would come and go)
function pickLevel() {
  let lv = 1, c = cap * 0.8;
  pickLv = nLv;
  while (lv <= nLv && pickLv == nLv) {
    if (lv >= pickWas) { c = cap; }
    if (LVC[lv] <= c) { pickLv = lv; }
    lv = lv + 1;
  }
  pickWas = pickLv;
}

function renderStep() {
  let want = 1 - isTess;
  if (nLv > 0) {
    if (viewGen != shownGen) {
      // the view moved: a whole picture now, as fine as a frame allows
      pickLevel();
      renderLevel(pickLv);
      shownGen = viewGen; shownLv = pickLv; shownOut = 0; rOn = 0; idleN = 0; busy = 1;
    } else {
      if (shownLv != 1 || shownOut != want) {
        // at rest, and what is up is a coarse picture (or, in plain Entry, one with hairlines):
        // the model itself
        idleN = idleN + 1;
        if (rOn == 0 && idleN >= 3) {
          rOn = 1; rPg = 1; rSt = 0; rOff = 0;
          rMulti = 0; rPg1 = 1;
          if (LVB[1] > 1) { rMulti = 1; }
          rTwo = two; rOut = want;
          rBig = 0;
          if (LVG[1] > 0) { rBig = 1; }
          setMatrix(LVN[1]);
        }
        if (rOn > 0) { refineStep(); busy = 3; }
      }
    }
  } else {
    if (viewGen != shownGen) { background(); shownGen = viewGen; }
  }
}

function viewReset() {
  az = -32; el = 20; zoom = 1.1; panX = 0; panY = 0;
  viewGen = viewGen + 1;
}
// both sides of a face, or the front alone - to begin with by the model: a closed one needs
// its fronts only (the button then turns it the other way)
function sideSet() {
  two = 1 - closed;
  viewGen = viewGen + 1;
}

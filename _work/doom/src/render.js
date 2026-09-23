// ============================================================
// Renderer (painter's): Doom BSP front to back -> stamp items, drawn in
// reverse order (= far to near). Baked-light costumes.
//  - floors/ceilings: per visible fragment of a seg, the front sector's
//    floor (ceiling) region below (above) the seg's edge line is one exact
//    trapezoid = a stretched 1x1 rectangle + a stretched right triangle
//  - walls: 1-texel-wide texture strips anchored at their exact edge and
//    allowed to overflow toward the side a nearer piece covers; a fragment
//    is cut into pieces by texture strips (and by edge slope where an edge
//    must be exact)
//  - occlusion: horizontal only (solid walls / closed doors), like Doom's
//    solidsegs, in screen px
//  - sprites: whole stamps inserted when their subsector is reached
// Entry performance: function parameters are O(1) while locals / globals /
// lists are found by linear search; every block costs ~0.7us.
// ============================================================
const FX = 240;            // horizontal focal (px)
const FY = 216;            // vertical focal (px, Doom's 1.2 pixel aspect)
const HORIZ = 21.6;        // screen y of the view center
const VTOP = 135;          // top of the 3D view
const VBOT = -91.8;        // bottom of the 3D view (status bar below)
const SCRL = -240, SCRR = 240;
const NEAR = 2;
const MAXIT = 3000;        // stamp items per frame
const WALLK = 0.09;        // light falloff per unit distance
const FLATK = 0.07;
const TOL = 2.5;           // max error of an exact wall edge (px)
const MINW = 4;            // narrowest wall piece (px)
const LODIZ = 1 / 1200;    // beyond this depth walls are solid average-color rectangles
const TRI = 32;            // triangle costume size
// ROOTNODE, NNODES, SPRBASE: injected by the build

let nit = 0;               // items this frame (hottest global: declared first)
// detail (L key): high = MINW / LODIZ / TOL, low = coarser pieces and nearer LOD
let gMinW = MINW, gLodIZ = LODIZ, gTol = TOL, lowDetail = 0;
let r_items = 0, r_segs = 0, r_nodes = 0, r_frame = 0, r_sprites = 0;
let iCos = [], iX = [], iY = [], iV = [], iU = [];
let sLo = [], sHi = [];    // solid screen intervals (px, sorted)
let bspStack = [], bspChk = [];
// per-seg texture data (from the side; refreshed when a switch changes it)
let sgMA = [], sgUA = [], sgLA = [], sgMF = [], sgMM = [], sgMW = [], sgMSW = [], sgMI = [], sgMH = [], sgUF = [], sgUW = [], sgUSW = [], sgUI = [], sgLF = [], sgLW = [], sgLSW = [], sgLI = [], sgYOff = [];
// per-seg draw classification (depends on sector heights / flats / textures; refreshed when they change)
//  sgAct: 0 nothing to draw, 1 one-sided, 2 two-sided open, 3 two-sided closed (door)
//  sgCP/sgFP: ceiling/floor flat costume base (0: skipped) ; sgUp/sgLo/sgMd: parts ; sgH0: mid row-0 height
let sgAct = [], sgCP = [], sgFP = [], sgUp = [], sgLo = [], sgMd = [], sgH0 = [];

function renderInit() {
  let i = 0;
  while (i < MAXIT) { iCos.push(0); iX.push(0); iY.push(0); iV.push(0); iU.push(0); i = i + 1; }
  i = 0;
  while (i < 64) { bspStack.push(0); bspChk.push(0); i = i + 1; }
  i = 0;
  while (i < sgX1.length) {
    sgMA.push(0); sgUA.push(0); sgLA.push(0); sgMF.push(0); sgMM.push(0); sgMW.push(1); sgMSW.push(1); sgMI.push(1); sgMH.push(1); sgUF.push(0); sgUW.push(1); sgUSW.push(1); sgUI.push(1);
    sgLF.push(0); sgLW.push(1); sgLSW.push(1); sgLI.push(1); sgYOff.push(0);
    sgAct.push(0); sgCP.push(0); sgFP.push(0); sgUp.push(0); sgLo.push(0); sgMd.push(0); sgH0.push(0);
    i = i + 1;
  }
  i = 1;
  while (i <= sgX1.length) { segTex(i); i = i + 1; }
}

function segTex(s) {
  let side = sgSide[s];
  let t = sdMid[side];
  sgMF[s] = 0; sgMM[s] = 0; sgUF[s] = 0; sgLF[s] = 0;
  if (t > 0) { sgMA[s] = txAvg[t]; sgMF[s] = txFirst[t]; sgMM[s] = txMFirst[t]; sgMW[s] = txW[t]; sgMSW[s] = txW[t] / txNs[t]; sgMI[s] = txImg[t]; sgMH[s] = txH[t]; }
  t = sdTop[side];
  if (t > 0) { sgUA[s] = txAvg[t]; sgUF[s] = txFirst[t]; sgUW[s] = txW[t]; sgUSW[s] = txW[t] / txNs[t]; sgUI[s] = txImg[t]; }
  t = sdBot[side];
  if (t > 0) { sgLA[s] = txAvg[t]; sgLF[s] = txFirst[t]; sgLW[s] = txW[t]; sgLSW[s] = txW[t] / txNs[t]; sgLI[s] = txImg[t]; }
  sgYOff[s] = sdYOff[side];
  segClass(s);
}
function segClass(s) {
  let fs = sgFront[s], bs = sgBack[s];
  let fc = secCeil[fs], ff = secFloor[fs];
  let fsky = secSky[fs];
  let cp = flPic[secCFlat[fs]], fp = flPic[secFFlat[fs]];
  if (fsky == 1) { cp = 0; }
  let act = 1, up = 0, lo = 0, md = 0, h0 = 0;
  if (bs == 0) {
    if (sgMF[s] > 0) {
      md = 1;
      // mid texture row-0 height: top-pegged at the ceiling, or bottom-pegged
      let th = sgMH[s];
      h0 = fc + sgYOff[s];
      if (sgPeg[s] == 1) { h0 = ff + th + sgYOff[s]; }
      if (fsky == 1) { h0 = fc; } else {
        if (h0 < fc) { h0 = h0 + Math.ceil((fc - h0) / th) * th; }
        if (h0 > fc + th) { h0 = h0 - Math.floor((h0 - fc) / th) * th; }
      }
    }
  } else {
    let bc = secCeil[bs], bf = secFloor[bs];
    act = 2;
    if (bc <= ff || bf >= fc) { act = 3; }
    if (act == 2) {
      if (fc == bc && secCFlat[fs] == secCFlat[bs]) { cp = 0; }
      if (ff == bf && secFFlat[fs] == secFFlat[bs]) { fp = 0; }
    }
    if (bc < fc && fsky + secSky[bs] < 2 && sgUF[s] > 0) { up = 1; }
    if (bf > ff && sgLF[s] > 0) { lo = 1; }
    if (sgMM[s] > 0) {
      md = 1;
      h0 = fc;
      if (bc < fc) { h0 = bc; }
      if (sgPeg[s] == 1) { h0 = ff; if (bf > ff) { h0 = bf; } h0 = h0 + sgMH[s]; }
      h0 = h0 + sgYOff[s];
    }
    if (act == 2 && cp + fp + up + lo + md == 0) { act = 0; }
  }
  sgAct[s] = act; sgCP[s] = cp; sgFP[s] = fp; sgUp[s] = up; sgLo[s] = lo; sgMd[s] = md; sgH0[s] = h0;
}
// a sector's heights changed: reclassify the segs that touch it
function secClass(sec) {
  let k = secSegFirst[sec], e = secSegFirst[sec] + secSegCount[sec];
  while (k < e) { segClass(secSegs[k]); k = k + 1; }
}
// a side's textures changed (switches): refresh its segs
function sideTex(side) {
  let k = sdSegFirst[side], e = sdSegFirst[side] + sdSegCount[side];
  while (k < e) { segTex(sideSegs[k]); k = k + 1; }
}

// ---------------------------------------------------------------
// floor (up = 0) / ceiling (up = 1) region of fragment [xa, xb] beyond the
// edge line ya..yb: rectangle to the view edge + right triangle
// ---------------------------------------------------------------
function flatRegion(xa, xb, ya, yb, base, fl, up) {
  let w = xb - xa;
  let lo = ya, hi = yb;
  if (yb < ya) { lo = yb; hi = ya; }
  // rectangle
  let r0 = VBOT, r1 = lo;
  if (up == 1) { r0 = hi; r1 = VTOP; }
  if (r1 - r0 > 0.5) {
    nit = nit + 1;
    iCos[nit] = base + fl; iX[nit] = (xa + xb) / 2; iY[nit] = (r0 + r1) / 2; iV[nit] = w - 1; iU[nit] = (w + 1) / 2 * (r1 - r0 - 1);
  }
  // triangle between lo and hi (hypotenuse on the edge line)
  if (hi - lo > 1.5) {
    let v = 0;
    if (yb < ya) { v = 1; }
    if (up == 1) { v = v + 2; }
    nit = nit + 1;
    iCos[nit] = base + 6 + v * 6 + fl; iX[nit] = (xa + xb) / 2; iY[nit] = (lo + hi) / 2;
    iV[nit] = TRI * (w / TRI - 1); iU[nit] = (w + TRI) / 2 * ((hi - lo) / TRI - 1);
  }
}

// ---------------------------------------------------------------
// one visible fragment [xa, xb] of seg s
//  X1, iz1, dizdx, uz1, duzdx: 1/z and u/z are linear in screen x
//  hC/hF (front ceiling/floor - eye), hBC/hBF (back), hA: mid texture row 0
//  cPic/fPic: flat costume bases (0 = none) ; lt: light ; lw: wall light
//  two: 0 one-sided, 1 two-sided ; sky: front ceiling is sky
//  mid/up/lo: draw flags ; eH: sum of |h| of the edges that must be exact
// ---------------------------------------------------------------
function fragment(s, xa, xb, X1, iz1, dizdx, uz1, duzdx, hC, hF, hBC, hBF, hA, cPic, fPic, lt, lw, two, sky, mid, up, lo, eH) {
  let izA = iz1 + (xa - X1) * dizdx, izB = iz1 + (xb - X1) * dizdx;
  // ---- flats (light from the fragment's middle distance) ----
  let fl = idiv(FLATK * 2 / (izA + izB) + 232 - lt, 32);
  if (fl < 0) { fl = 0; }
  if (fl > 5) { fl = 5; }
  if (cPic > 0) { flatRegion(xa, xb, HORIZ + hC * FY * izA, HORIZ + hC * FY * izB, cPic, fl, 1); }
  if (fPic > 0) { flatRegion(xa, xb, HORIZ + hF * FY * izA, HORIZ + hF * FY * izB, fPic, fl, 0); }
  if (mid + up + lo > 0) {
    // wall light: constant over the fragment unless it spans two levels
    let lvC = 0, lvB = 0, lvVar = 0;
    let ew = lw - WALLK / izA;
    if (ew < 168) { lvC = 1; if (ew < 112) { lvC = 2; } }
    ew = lw - WALLK / izB;
    if (ew < 168) { lvB = 1; if (ew < 112) { lvB = 2; } }
    if (lvB != lvC) { lvVar = 1; }
    if (izA < gLodIZ && izB < gLodIZ) {
      // ---- far: exact solid rectangles in the texture's average color ----
      let n = Math.ceil(Math.abs(izB - izA) * (Math.abs(hC) + Math.abs(hF)) * FY / (2 * gTol));
      if (n < 1) { n = 1; }
      if (n * 6 > xb - xa) { n = Math.ceil((xb - xa) / 6); }
      if (n > MAXIT - nit - 3 * n) { n = 1; }
      let w = (xb - xa) / n;
      let xc = xa + w / 2;
      let iz = iz1 + (xc - X1) * dizdx, diz = dizdx * w;
      let g0 = w - 1, gc = (w + 1) / 2;
      for (const _ of rep(n)) {
        let ys = FY * iz;
        let lv = lvC;
        if (lvVar == 1) {
          lv = 0;
          let e2 = lw - WALLK / iz;
          if (e2 < 168) { lv = 1; if (e2 < 112) { lv = 2; } }
        }
        let yT = HORIZ + hC * ys, yB = HORIZ + hF * ys;
        if (two == 0) {
          nit = nit + 1;
          iCos[nit] = sgMA[s] + lv; iX[nit] = xc; iY[nit] = (yT + yB) / 2; iV[nit] = g0; iU[nit] = gc * (yT - yB - 1);
        } else {
          if (up == 1) {
            let yBT = HORIZ + hBC * ys;
            nit = nit + 1;
            iCos[nit] = sgUA[s] + lv; iX[nit] = xc; iY[nit] = (yT + yBT) / 2; iV[nit] = g0; iU[nit] = gc * (yT - yBT - 1);
          }
          if (lo == 1) {
            let yBB = HORIZ + hBF * ys;
            nit = nit + 1;
            iCos[nit] = sgLA[s] + lv; iX[nit] = xc; iY[nit] = (yBB + yB) / 2; iV[nit] = g0; iU[nit] = gc * (yBB - yB - 1);
          }
        }
        xc = xc + w; iz = iz + diz;
      }
    } else {
      // ---- pieces: by texture strips crossed and by exact-edge slope ----
      let sw = 1000;
      if (mid == 1) { sw = sgMSW[s]; }
      if (up == 1) { if (sgUSW[s] < sw) { sw = sgUSW[s]; } }
      if (lo == 1) { if (sgLSW[s] < sw) { sw = sgLSW[s]; } }
      let n = Math.ceil(Math.abs((uz1 + (xb - X1) * duzdx) / izB - (uz1 + (xa - X1) * duzdx) / izA) / sw);
      let ne = Math.ceil(Math.abs(izB - izA) * eH * FY / gTol);
      if (ne > n) { n = ne; }
      if (n < 1) { n = 1; }
      if (n * gMinW > xb - xa) { n = Math.ceil((xb - xa) / gMinW); }
      if (n > (MAXIT - nit) / 4) { n = 1; }
      let w = (xb - xa) / n;
      let xc = xa + w / 2;
      let iz = iz1 + (xc - X1) * dizdx, uz = uz1 + (xc - X1) * duzdx;
      let diz = dizdx * w, duz = duzdx * w;
      let g0 = w - 1;
      if (two == 0) {
        // one-sided: image top at hA (at/above the ceiling), overflow down
        let mF = sgMF[s], mW = sgMW[s], mSW = sgMSW[s], mI = sgMI[s];
        let kv = (1 + mI) / 2 * g0, ku = (w + mI) / 2;
        for (const _ of rep(n)) {
          let zz = 1 / iz;
          let ys = FY * iz;
          let lv = lvC;
          if (lvVar == 1) {
            lv = 0;
            let e2 = lw - zz * WALLK;
            if (e2 < 168) { lv = 1; if (e2 < 112) { lv = 2; } }
          }
          let pc = stPic[mF + idiv(mod(uz * zz, mW), mSW)] + lv;
          let imgPx = mI * ys;
          let yA = HORIZ + hA * ys;
          nit = nit + 1;
          iCos[nit] = pc; iX[nit] = xc; iY[nit] = yA - imgPx / 2; iV[nit] = kv; iU[nit] = ku * (ys - 1);
          yA = yA - imgPx;
          if (yA > HORIZ + hF * ys) {
            // taller than one image: more stamps downward
            let yB = HORIZ + hF * ys;
            while (yA > yB) {
              nit = nit + 1;
              iCos[nit] = pc; iX[nit] = xc; iY[nit] = yA - imgPx / 2; iV[nit] = kv; iU[nit] = ku * (ys - 1);
              yA = yA - imgPx;
            }
          }
          xc = xc + w; iz = iz + diz; uz = uz + duz;
        }
      } else {
        let uF = sgUF[s], uW = sgUW[s], uSW = sgUSW[s], uI = sgUI[s];
        let lF = sgLF[s], lW = sgLW[s], lSW = sgLSW[s], lI = sgLI[s];
        let mM = sgMM[s], mW = sgMW[s], mSW = sgMSW[s], mH = sgMH[s];
        let kvU = (1 + uI) / 2 * g0, kuU = (w + uI) / 2, kvL = (1 + lI) / 2 * g0, kuL = (w + lI) / 2, kvM = (1 + mH) / 2 * g0, kuM = (w + mH) / 2;
        for (const _ of rep(n)) {
          let zz = 1 / iz;
          let ys = FY * iz;
          let lv = lvC;
          if (lvVar == 1) {
            lv = 0;
            let e2 = lw - zz * WALLK;
            if (e2 < 168) { lv = 1; if (e2 < 112) { lv = 2; } }
          }
          let u = uz * zz;
          if (up == 1) {
            // upper: exact bottom at the back ceiling, overflow up (stretched to fit under a sky)
            let pc = stPic[uF + idiv(mod(u, uW), uSW)] + lv;
            let yA = HORIZ + hBC * ys;
            let sy = ys;
            if (sky == 1) { sy = (hC - hBC) * ys / uI; }
            let imgPx = uI * sy;
            let yT = HORIZ + hC * ys;
            nit = nit + 1;
            iCos[nit] = pc; iX[nit] = xc; iY[nit] = yA + imgPx / 2; iV[nit] = kvU; iU[nit] = kuU * (sy - 1);
            yA = yA + imgPx;
            while (yA < yT) {
              nit = nit + 1;
              iCos[nit] = pc; iX[nit] = xc; iY[nit] = yA + imgPx / 2; iV[nit] = kvU; iU[nit] = kuU * (sy - 1);
              yA = yA + imgPx;
            }
          }
          if (lo == 1) {
            // lower: exact top at the back floor, overflow down
            let pc = stPic[lF + idiv(mod(u, lW), lSW)] + lv;
            let yA = HORIZ + hBF * ys, yB = HORIZ + hF * ys;
            let imgPx = lI * ys;
            nit = nit + 1;
            iCos[nit] = pc; iX[nit] = xc; iY[nit] = yA - imgPx / 2; iV[nit] = kvL; iU[nit] = kuL * (ys - 1);
            yA = yA - imgPx;
            while (yA > yB) {
              nit = nit + 1;
              iCos[nit] = pc; iX[nit] = xc; iY[nit] = yA - imgPx / 2; iV[nit] = kvL; iU[nit] = kuL * (ys - 1);
              yA = yA - imgPx;
            }
          }
          if (mid == 1) {
            // masked mid (grates): one exact tile, see-through
            nit = nit + 1;
            iCos[nit] = stPic[mM + idiv(mod(u, mW), mSW)] + lv; iX[nit] = xc; iY[nit] = HORIZ + (hA - mH / 2) * ys;
            iV[nit] = kvM; iU[nit] = kuM * (ys - 1);
          }
          xc = xc + w; iz = iz + diz; uz = uz + duz;
        }
      }
    }
  }
}

// merge [x1, x2] (px) into the solid intervals
function markSolid(x1, x2) {
  let a = 1;
  while (sHi[a] < x1) { a = a + 1; }
  let b = a;
  let more = 1;
  while (more == 1) {
    more = 0;
    if (b < sLo.length) { if (sLo[b + 1] <= x2) { b = b + 1; more = 1; } }
  }
  if (sLo[a] <= x2) {
    let lo2 = x1, hi2 = x2;
    if (sLo[a] < lo2) { lo2 = sLo[a]; }
    if (sHi[b] > hi2) { hi2 = sHi[b]; }
    sLo[a] = lo2; sHi[a] = hi2;
    let cnt = b - a;
    while (cnt > 0) { sLo.removeAt(a + 1); sHi.removeAt(a + 1); cnt = cnt - 1; }
  } else {
    sLo.insertAt(a, x1); sHi.insertAt(a, x2);
  }
}

// ---------------------------------------------------------------
// one sprite (thing m) -> item ; tx/z in view space
// ---------------------------------------------------------------
function projectSprite(m, tx, z, dx, dy, sec) {
  let sfi = mSpr[m];
  let pic = frPic[sfi];
  if (frRot[sfi] == 1) {
    // rotation: angle from the thing to the viewer vs the thing's facing
    let ang = 90;
    if (dx == 0) { if (dy > 0) { ang = 270; } }
    else { ang = atand(dy / dx); if (dx > 0) { ang = ang + 180; } }
    pic = rtPic[frPic[sfi] + idiv(mod(ang - mAng[m] + 382.5, 360), 45)];
  }
  let pk = pic - SPRBASE;
  let sx = FX / z, sy = FY / z;
  let w = spW[pk], h = spH[pk];
  let left = (tx - spLX[pk]) * sx;
  if (left < SCRR && left + w * sx > SCRL) {
    let lv = 0;
    if (mFull[m] == 0) {
      let e = secLight[sec] - z * WALLK;
      if (e < 168) { lv = 1; if (e < 112) { lv = 2; } }
    }
    nit = nit + 1;
    iCos[nit] = pic + lv;
    iX[nit] = left + w * sx / 2;
    iY[nit] = HORIZ + (mZ[m] + spTY[pk] - vz) * sy - h * sy / 2;
    iV[nit] = (w + h) / 2 * (sx - 1);
    iU[nit] = (w * sx + h) / 2 * (sy - 1);
    r_sprites = r_sprites + 1;
  }
}

// Render the 3D view from (vx, vy, vz) looking at vang degrees.
function renderView() {
  let ca = cosd(vang), sa = sind(vang);
  let px = vx, py = vy, pz = vz;
  r_frame = r_frame + 1;
  nit = 0; r_sprites = 0;
  while (sLo.length > 0) { sLo.removeAt(1); sHi.removeAt(1); }
  sLo.push(-100000); sHi.push(SCRL); sLo.push(SCRR); sHi.push(100000);
  let nseg = 0, nnode = 0;
  let sp = 1;
  bspStack[1] = ROOTNODE; bspChk[1] = 0;
  while (sp > 0) {
    let n = bspStack[sp], chk = bspChk[sp];
    sp = sp - 1;
    let vis = 1;
    if (sLo.length == 1) { vis = 0; sp = 0; }
    if (vis == 1 && chk == 1) {
      // ---- R_CheckBBox: n > 0 node, n < 0 subsector -n ----
      let bi = n;
      if (n < 0) { bi = NNODES - n; }
      let bT = bbT[bi], bB = bbB[bi], bL = bbL[bi], bR = bbR[bi];
      let bx = 2, by = 2;
      if (px <= bL) { bx = 0; } else { if (px < bR) { bx = 1; } }
      if (py >= bT) { by = 0; } else { if (py > bB) { by = 1; } }
      let pos = by * 4 + bx;
      if (pos != 5) {
        let x1 = bR, y1 = bT, x2 = bL, y2 = bB;
        if (pos == 1) { y2 = bT; }
        if (pos == 2) { y1 = bB; y2 = bT; }
        if (pos == 4) { x1 = bL; }
        if (pos == 6) { y1 = bB; x2 = bR; y2 = bT; }
        if (pos == 8) { x1 = bL; x2 = bR; }
        if (pos == 9) { x1 = bL; y1 = bB; x2 = bR; }
        if (pos == 10) { x1 = bL; y1 = bB; x2 = bR; y2 = bT; }
        let ax = x1 - px, ay = y1 - py, ex = x2 - px, ey = y2 - py;
        if (ex * ay - ey * ax > 0) {
          let z1 = ax * ca + ay * sa, z2 = ex * ca + ey * sa;
          let X1 = SCRL, X2 = SCRR;
          if (z1 > 0.01) { X1 = (ax * sa - ay * ca) * FX / z1; }
          if (z2 > 0.01) { X2 = (ex * sa - ey * ca) * FX / z2; }
          if (z1 <= 0.01 && z2 <= 0.01) { vis = 0; }
          if (X1 < SCRL) { X1 = SCRL; }
          if (X2 > SCRR) { X2 = SCRR; }
          if (X1 >= X2) { vis = 0; }
          if (vis == 1) {
            let k = 1;
            while (sHi[k] < X1) { k = k + 1; }
            if (sLo[k] <= X1 && sHi[k] >= X2) { vis = 0; }
          }
        }
      }
    }
    if (vis == 1 && n > 0) {
      nnode = nnode + 1;
      // front child (the side the viewer is on) is popped first
      // back child (bbox checked when popped), then the front child (popped first, no check)
      if ((py - ndY[n]) * ndDX[n] < (px - ndX[n]) * ndDY[n]) { bspStack[sp + 1] = ndC1[n]; bspStack[sp + 2] = ndC0[n]; }
      else { bspStack[sp + 1] = ndC0[n]; bspStack[sp + 2] = ndC1[n]; }
      bspChk[sp + 1] = 1; bspChk[sp + 2] = 0;
      sp = sp + 2;
    }
    if (vis == 1 && n < 0) {
      // ================= subsector =================
      let ss = 0 - n;
      let fs = ssSec[ss];
      // ---- sprites standing in this subsector (drawn after its walls) ----
      let m = ssThing[ss];
      while (m > 0) {
        if (mSpr[m] > 0) {
          let dx = mX[m] - px, dy = mY[m] - py;
          let z = dx * ca + dy * sa;
          if (z > 4 && nit < MAXIT - 2) { projectSprite(m, dx * sa - dy * ca, z, dx, dy, fs); }
        }
        m = mSSNext[m];
      }
      // ---- segs ----
      let s = ssFirst[ss], sEnd = ssFirst[ss] + ssCount[ss];
      let fc = secCeil[fs], ff = secFloor[fs], lt = secLight[fs], fsky = secSky[fs];
      let hC = fc - pz, hF = ff - pz;
      while (s < sEnd) {
        if (sgNX[s] * px + sgNY[s] * py > sgND[s]) {
          let ax = sgX1[s] - px, ay = sgY1[s] - py, ex = sgX2[s] - px, ey = sgY2[s] - py;
          let z1 = ax * ca + ay * sa, z2 = ex * ca + ey * sa;
          if (z1 >= NEAR || z2 >= NEAR) {
            let t1 = ax * sa - ay * ca, t2 = ex * sa - ey * ca;
            let u1 = sgU[s], u2 = sgU[s] + sgLen[s];
            if (z1 < NEAR) { let f = (NEAR - z1) / (z2 - z1); t1 = t1 + (t2 - t1) * f; u1 = u1 + (u2 - u1) * f; z1 = NEAR; }
            if (z2 < NEAR) { let f = (NEAR - z1) / (z2 - z1); t2 = t1 + (t2 - t1) * f; u2 = u1 + (u2 - u1) * f; z2 = NEAR; }
            let X1 = t1 * FX / z1, X2 = t2 * FX / z2;
            let xa0 = X1, xb0 = X2;
            if (xa0 < SCRL) { xa0 = SCRL; }
            if (xb0 > SCRR) { xb0 = SCRR; }
            if (xb0 - xa0 > 0.3) {
              let act = sgAct[s];
              if (act > 0) {
                // ---- what this seg draws (classified in segClass) ----
                let bs = sgBack[s];
                let cPic = sgCP[s], fPic = sgFP[s];
                if (fc <= pz) { cPic = 0; }
                if (ff >= pz) { fPic = 0; }
                let bc = fc, bf = ff;
                if (bs > 0) { bc = secCeil[bs]; bf = secFloor[bs]; }
                let two = 0;
                if (act > 1) { two = 1; }
                let up = sgUp[s], lo = sgLo[s], mid = sgMd[s];
                let eH = 0;
                if (act == 1 && fsky == 1) { eH = Math.abs(hC); }
                if (up == 1) { eH = Math.abs(bc - pz); }
                if (lo == 1) { eH = eH + Math.abs(bf - pz); }
                if (act != 2 || cPic + fPic + mid + up + lo > 0) {
                  nseg = nseg + 1;
                  lnSeen[sgLine[s]] = 1;
                  let dX = X2 - X1;
                  if (dX < 0.001) { dX = 0.001; }
                  let iz1 = 1 / z1;
                  let dizdx = (1 / z2 - iz1) / dX, duzdx = (u2 / z2 - u1 * iz1) / dX;
                  let uz1 = u1 * iz1;
                  // ---- visible fragments between the solid intervals ----
                  let k = 1;
                  while (sHi[k] < xa0) { k = k + 1; }
                  let fa = xa0;
                  if (sLo[k] <= fa) { fa = sHi[k]; k = k + 1; }
                  while (fa < xb0) {
                    let fb = sLo[k];
                    if (fb > xb0) { fb = xb0; }
                    if (fb - fa > 0.3) {
                      fragment(s, fa, fb, X1, iz1, dizdx, uz1, duzdx, hC, hF, bc - pz, bf - pz, sgH0[s] - pz, cPic, fPic, lt, lt + sgContrast[s], two, fsky, mid, up, lo, eH);
                    }
                    fa = sHi[k]; k = k + 1;
                  }
                  if (act != 2) { markSolid(xa0, xb0); }
                }

              }
            }
          }
        }
        s = s + 1;
      }
    }
  }
  r_items = nit; r_segs = nseg; r_nodes = nnode;
}

// Stamp all items far to near (= reverse generation order). Runs in the stamper clone.
function drawItems() {
  eraseAll();
  let i = nit;
  while (i > 0) {
    costume(iCos[i]);
    goto(iX[i], iY[i]);
    resetSize();
    stretchW(iV[i]);
    stretchH(iU[i]);
    stamp();
    i = i - 1;
  }
  goto(0, -400);
}

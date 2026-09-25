// ============================================================
// render.js - perspective renderer on Entry's pen-fill primitive.
//   * one flat vertex buffer: track rings, then car vertices, then scratch
//   * per-frame: cull segments (distance + frustum) -> depth sort ->
//     project only the rings that survive -> painter's fill back-to-front
//   * near-plane clipping (Sutherland-Hodgman), back-face culling by signed
//     screen area, screen-bounds rejection, distance LOD, baked fog colours
// ============================================================
const NEARZ = 0.35;
const SMOKEZ = 3.0;        // puffs nearer than this would swallow the screen
const CULLBACK = 4;        // rings scanned behind the camera
const SCNM = 120;          // scenery reaches this far out, so cull wider
const CARBASE = (NSEG + 1) * PPR;
const SCRBASE = CARBASE + NCARV;
const SCNBASE = SCRBASE + 8;
// v6: screen positions (psX/psY, clipX/clipY) are kept as whole numbers of
// 1/QS stage units. tessvm reproduces Entry's decimal arithmetic, and the
// differences in the back-face and bounds tests are otherwise the costliest
// operations of the frame; on integers they are plain machine arithmetic.
// Coordinates are divided back to stage units only when handed to the pen.
const QS = 16;
const QX = 245 * QS;
const QY = 140 * QS;
// ...and the 3D transform is integer too: world positions in whole cm (WU per
// metre), the camera basis scaled by BS, so a view-space coordinate is a whole
// number of cm/BS... i.e. of 1/ZU metres. Dot products of those are exact
// machine integers in tessvm instead of emulated decimals.
const WU = 100;
const BS = 16384;
const ZU = WU * BS;
const NEARZI = NEARZ * ZU;

let camX = 0;
let camY = 3;
let camZ = 0;
let camYaw = 0;
let camPitch = 0;
let camRoll = 0;
let cfX = 0; let cfY = 0; let cfZ = 1;      // forward
let crX = 1; let crY = 0; let crZ = 0;      // right
let cuX = 0; let cuY = 1; let cuZ = 0;      // up
let chX = 0; let chZ = 1;                   // forward, flattened
let csX = 1; let csZ = 0;                   // right, flattened
let camScale = 300;
let camQ = 4800;            // camScale in 1/QS units, whole
let camXi = 0; let camYi = 0; let camZi = 0;          // camera, whole cm
let cfXi = 0; let cfYi = 0; let cfZi = BS;            // basis x BS, whole
let crXi = BS; let crYi = 0; let crZi = 0;
let cuXi = 0; let cuYi = BS; let cuZi = 0;
let scrOX = 0; let scrOY = 0;                        // screen shift (1/QS units), cards only
let frKX = 1; let frKY = 1;                           // frustum slopes (x, y) and
let frFX = 1; let frFY = 1;                           // their sphere-test factors
let fogK2 = 0.019;          // fogK / 2, for the mean of two depths
let camFov = 74;
let tanHalf = 0.8;
let farCull2 = 160000;
let fogK = 0.0375;
const mmPanel = '#141820';
const mmTrack = '#b4bcc8';
const mmStart = '#ffe05a';
const mmYou = '#ffffff';
let scnSz = 70;             // v4.0: an object is drawn while its radius x this > its distance
let colOff = 0;             // colTab base, folded: colTab[colOff + mat * NFOG + fog]
let penTr = 0;              // v7: pen transparency last set (see-through smoke, ghost, sparks)
let qHex = '#000000';       // quad(..., mat < 0) fills with this colour instead
// graphics level (1 LOW = v4, 2 HIGH, 3 ULTRA): how far the LOD bands, the
// scenery and the detailed car models reach. Set from the gf* tables.
let gfx = 2;
let scnFar2 = 74000;        // scenery stops being drawn this far out (squared)
let scnHi2 = 3600;          // ...and uses its full model inside this
let carLodM2 = 14400;       // silhouette car model inside this, a card beyond
let nVis = 0;
let nClip = 0;
let carLod2 = 2600;                         // full car model inside this radius
let lodF2 = 8;                              // ring offset where units merge in twos
let lodF3 = 20;                             // ...and in threes
let cullAhead = 50;                         // rings scanned ahead of the camera
let drawnQuads = 0;

function setupCam() {
    let cp = cosd(camPitch);
    let sp = sind(camPitch);
    let sy = sind(camYaw);
    let cy = cosd(camYaw);
    cfX = sy * cp; cfY = sp; cfZ = cy * cp;
    chX = sy; chZ = cy;
    csX = cy; csZ = 0 - sy;
    let ux = 0 - sy * sp;
    let uy = cp;
    let uz = 0 - cy * sp;
    let cr = cosd(camRoll);
    let sr = sind(camRoll);
    crX = csX * cr + ux * sr; crY = uy * sr; crZ = csZ * cr + uz * sr;
    cuX = ux * cr - csX * sr; cuY = uy * cr; cuZ = uz * cr - csZ * sr;
    tanHalf = tand(camFov / 2);
    camScale = 240 / tanHalf;
    camQ = Math.round(camScale * QS);
    camXi = Math.round(camX * WU); camYi = Math.round(camY * WU); camZi = Math.round(camZ * WU);
    cfXi = Math.round(cfX * BS); cfYi = Math.round(cfY * BS); cfZi = Math.round(cfZ * BS);
    crXi = Math.round(crX * BS); crYi = Math.round(crY * BS); crZi = Math.round(crZ * BS);
    cuXi = Math.round(cuX * BS); cuYi = Math.round(cuY * BS); cuZi = Math.round(cuZ * BS);
    frKX = 250 / camScale; frKY = 145 / camScale;
    frFX = Math.sqrt(1 + frKX * frKX); frFY = Math.sqrt(1 + frKY * frKY);
    farCull2 = fogFar * fogFar;
    fogK = (NFOG - 1) / fogFar;
    fogK2 = fogK / 2;
    colOff = 1 - NFOG;
    // how far along the ring the LOD bands and the scan itself reach. Working
    // in ring offsets instead of metres keeps the cull loop free of list reads.
    lodF2 = Math.floor(gfLod2[gfx] / segStep) + 1;
    lodF3 = Math.floor(gfLod3[gfx] / segStep) + 1;
    scnFar2 = gfScn[gfx] * gfScn[gfx];
    scnHi2 = gfScnHi[gfx] * gfScnHi[gfx];
    scnSz = gfScnSz[gfx];
    carLod2 = gfCar[gfx] * gfCar[gfx];
    carLodM2 = gfCarM[gfx] * gfCarM[gfx];
    cullAhead = Math.floor(fogFar / segStep) + 2;
    if (cullAhead > NSEG - 8) { cullAhead = NSEG - 8; }
}

// project the vertex-buffer slots [a..b] into view + screen space
function projSlots(a, b) {
    let p = a;
    while (p <= b) {
        let dx = wvX[p] - camXi;
        let dy = wvY[p] - camYi;
        let dz = wvZ[p] - camZi;
        let vz = dx * cfXi + dy * cfYi + dz * cfZi;
        pvZ[p] = vz / ZU;
        let vx = dx * crXi + dy * crYi + dz * crZi;
        let vy = dx * cuXi + dy * cuYi + dz * cuZi;
        if (vz > NEARZI) {
            psX[p] = Math.round(vx * camQ / vz);
            psY[p] = Math.round(vy * camQ / vz);
        } else {
            pvX[p] = vx / ZU;
            pvY[p] = vy / ZU;
        }
        p = p + 1;
    }
}

// Project as much of a ring as its draw unit actually needs: road edges for a
// far unit, + grass and wall tops for a middle one, everything up close. A ring
// shared by two units is topped up rather than reprojected.
function projRing(i, lvl) {
    let e = 4;
    if (lvl > 1) { e = 10; }
    else if (lvl > 0) {
        e = 6;
        // wall tops belong to the ring on either side of a walled segment
        let h = sgHW[i];
        if (h < 1) {
            let q = i - 1;
            if (q < 1) { q = NSEG; }
            h = sgHW[q];
        }
        if (h > 0) { e = 8; }
    }
    let base = (i - 1) * PPR;
    if (pvF[i] != frameId) {
        pvF[i] = frameId;
        pvE[i] = e;
        projSlots(base + 1, base + e);
    } else if (pvE[i] < e) {
        projSlots(base + pvE[i] + 1, base + e);
        pvE[i] = e;
    }
}

// ---- near-plane clipping ------------------------------------------------
function clipAdd(a, b) {
    let za = pvZ[a];
    let zb = pvZ[b];
    let ax = pvX[a];
    let ay = pvY[a];
    if (za >= NEARZ) { let k = za / camQ; ax = psX[a] * k; ay = psY[a] * k; }
    let bx = pvX[b];
    let by = pvY[b];
    if (zb >= NEARZ) { let k = zb / camQ; bx = psX[b] * k; by = psY[b] * k; }
    let t = (NEARZ - za) / (zb - za);
    let iv = camQ / NEARZ;
    nClip = nClip + 1;
    clipX[nClip] = Math.round((ax + (bx - ax) * t) * iv);
    clipY[nClip] = Math.round((ay + (by - ay) * t) * iv);
}
function clipEdge(a, b) {
    if (pvZ[a] >= NEARZ) {
        nClip = nClip + 1;
        clipX[nClip] = psX[a];
        clipY[nClip] = psY[a];
        if (pvZ[b] < NEARZ) { clipAdd(a, b); }
    } else if (pvZ[b] >= NEARZ) { clipAdd(a, b); }
}

// ---- the one polygon primitive -----------------------------------------
// a,b,c,d are vertex-buffer slots, wound counter-clockwise as seen from the
// visible side; mat is a palette index.
function quad(a, b, c, d, mat) {
    let za = pvZ[a];
    let zb = pvZ[b];
    let zc = pvZ[c];
    let zd = pvZ[d];
    let nIn = 0;
    if (za > NEARZ) { nIn = nIn + 1; }
    if (zb > NEARZ) { nIn = nIn + 1; }
    if (zc > NEARZ) { nIn = nIn + 1; }
    if (zd > NEARZ) { nIn = nIn + 1; }
    if (nIn == 4) {
        let ax = psX[a]; let ay = psY[a];
        let bx = psX[b]; let by = psY[b];
        let cx = psX[c]; let cy = psY[c];
        let dx = psX[d]; let dy = psY[d];
        // back-face cull: front faces project counter-clockwise (screen y up)
        let ar = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) + (cx - ax) * (dy - ay) - (cy - ay) * (dx - ax);
        if (ar > 0) {
            let off = 0;
            if (ax > QX) { if (bx > QX) { if (cx > QX) { if (dx > QX) { off = 1; } } } }
            if (off < 1) { if (ax < 0 - QX) { if (bx < 0 - QX) { if (cx < 0 - QX) { if (dx < 0 - QX) { off = 1; } } } } }
            if (off < 1) { if (ay > QY) { if (by > QY) { if (cy > QY) { if (dy > QY) { off = 1; } } } } }
            if (off < 1) { if (ay < 0 - QY) { if (by < 0 - QY) { if (cy < 0 - QY) { if (dy < 0 - QY) { off = 1; } } } } }
            if (off < 1) {
                if (mat < 0) { fillColorHex(qHex); }
                else {
                    let fl = Math.floor((za + zc) * fogK2);
                    if (fl > NFOG - 1) { fl = NFOG - 1; }
                    fillColorHex(colTab[colOff + mat * NFOG + fl]);
                }
                let sx = ax / QS;
                let sy = ay / QS;
                goto(sx, sy);
                fillStart();
                goto(bx / QS, by / QS);
                goto(cx / QS, cy / QS);
                goto(dx / QS, dy / QS);
                goto(sx, sy);
                fillStop();
                drawnQuads = drawnQuads + 1;
            }
        }
    } else if (nIn > 0) {
        nClip = 0;
        clipEdge(a, b);
        clipEdge(b, c);
        clipEdge(c, d);
        clipEdge(d, a);
        if (nClip >= 3) {
            // signed area of the clipped polygon keeps the original winding
            let ar = 0;
            let k = 1;
            while (k <= nClip) {
                let n2 = k + 1;
                if (n2 > nClip) { n2 = 1; }
                ar = ar + clipX[k] * clipY[n2] - clipX[n2] * clipY[k];
                k = k + 1;
            }
            if (ar > 0) {
                if (mat < 0) { fillColorHex(qHex); }
                else {
                    let zz = za;
                    if (zz < NEARZ) { zz = NEARZ; }
                    let fl = Math.floor(zz * fogK);
                    if (fl > NFOG - 1) { fl = NFOG - 1; }
                    fillColorHex(colTab[colOff + mat * NFOG + fl]);
                }
                let sx = clipX[1] / QS;
                let sy = clipY[1] / QS;
                goto(sx, sy);
                fillStart();
                k = 2;
                while (k <= nClip) {
                    goto(clipX[k] / QS, clipY[k] / QS);
                    k = k + 1;
                }
                goto(sx, sy);
                fillStop();
                drawnQuads = drawnQuads + 1;
            }
        }
    }
}

// a quad given directly in screen space (used for decals and billboards,
// whose corners are interpolated from already-projected road points)
// (corners in 1/QS units, like psX)
function quadS(x1, y1, x2, y2, x3, y3, x4, y4, mat, depth) {
    let ax = Math.round(x1); let ay = Math.round(y1);
    let bx = Math.round(x2) - ax; let by = Math.round(y2) - ay;
    let cx = Math.round(x3) - ax; let cy = Math.round(y3) - ay;
    let dx = Math.round(x4) - ax; let dy = Math.round(y4) - ay;
    let ar = bx * cy - by * cx + cx * dy - cy * dx;
    if (ar > 0) {
        let fl = Math.floor(depth * fogK);
        if (fl > NFOG - 1) { fl = NFOG - 1; }
        if (fl < 0) { fl = 0; }
        fillColorHex(colTab[colOff + mat * NFOG + fl]);
        let sx = ax / QS;
        let sy = ay / QS;
        goto(sx, sy);
        fillStart();
        goto((ax + bx) / QS, (ay + by) / QS);
        goto((ax + cx) / QS, (ay + cy) / QS);
        goto((ax + dx) / QS, (ay + dy) / QS);
        goto(sx, sy);
        fillStop();
        drawnQuads = drawnQuads + 1;
    }
}

// flat screen-space quad in a literal colour (sky bands, HUD panels)
function fill4(x1, y1, x2, y2, x3, y3, x4, y4, col) {
    fillColorHex(col);
    goto(x1, y1);
    fillStart();
    goto(x2, y2);
    goto(x3, y3);
    goto(x4, y4);
    goto(x1, y1);
    fillStop();
}

// ---- sky + ground haze --------------------------------------------------
function drawSky() {
    let k = camScale * tand(camPitch);
    let cr = cosd(camRoll);
    let sr = sind(camRoll);
    let hx = 0 - k * sr;
    let hy = 0 - k * cr;
    let dx = cr * 900;
    let dy = 0 - sr * 900;
    let nx = sr;
    let ny = cr;
    // ground haze: everything below the horizon, in the fogged grass tone.
    // v4.2: in bands - a line o below the horizon is ground about h / o
    // (x camScale) away for an eye h above it, so the lower bands are less
    // fogged: from a bridge or a hillside the ground under the land reads
    // as ground, not as sky
    let hc = camY - sgY[camSeg] + GRASSD;
    let ga = sgGA[camSeg];
    if (sgGB[camSeg] < ga) { ga = sgGB[camSeg]; }
    if (ga < 0 - GRASSD) { hc = hc - ga - GRASSD; }
    if (hc < 1) { hc = 1; }
    let gb = 0;
    let g0 = 0;
    while (gb < 6) {
        let g1 = 900;
        if (gb == 0) { g1 = 4; } else if (gb == 1) { g1 = 10; } else if (gb == 2) { g1 = 22; } else if (gb == 3) { g1 = 45; } else if (gb == 4) { g1 = 90; }
        let fl = NFOG - 2;
        if (gb > 0) {
            fl = Math.floor(hc * camScale / g0 * fogK);
            if (fl > NFOG - 2) { fl = NFOG - 2; }
        }
        fill4(hx - dx - nx * g0, hy - dy - ny * g0, hx + dx - nx * g0, hy + dy - ny * g0,
            hx + dx - nx * g1, hy + dy - ny * g1, hx - dx - nx * g1, hy - dy - ny * g1,
            colTab[colOff + (gmatBase + 5) * NFOG + fl]);
        g0 = g1;
        gb = gb + 1;
    }
    // sky: bands from the horizon colour up to a deeper tone
    let b = 0;
    while (b < 14) {
        let o0 = b * 20;
        let o1 = o0 + 21;
        if (b == 13) { o1 = 900; }
        let t = b / 13;
        let r = Math.round(skyR * (1 - t) + skyR * 0.42 * t);
        let g = Math.round(skyG * (1 - t) + skyG * 0.46 * t);
        let bl = Math.round(skyB * (1 - t) + (skyB * 0.55 + 42) * t);
        fill4(hx - dx + nx * o0, hy - dy + ny * o0, hx + dx + nx * o0, hy + dy + ny * o0,
            hx + dx + nx * o1, hy + dy + ny * o1, hx - dx + nx * o1, hy - dy + ny * o1,
            rgb(r, g, bl));
        b = b + 1;
    }
}

// A ridge line along the horizon. It is pure screen space - there is no
// geometry out there to project - but the profile is indexed by world azimuth,
// so it swings past correctly as the camera turns instead of sliding with it.
function drawHills() {
    let k = camScale * tand(camPitch);
    let cr = cosd(camRoll);
    let sr = sind(camRoll);
    let hx = 0 - k * sr;
    let hy = 0 - k * cr;
    let b = 0;
    while (b < 2) {
        // two ranges: a pale one behind, a darker one in front of it
        let hs = b > 0 ? 1.0 : 0.66;
        let col = b > 0 ? hillB : hillA;
        let j = 0;
        let a0 = camYaw - 62;
        let t0 = 0 - camScale * 1.9;
        let y0 = 0;
        while (j <= NHILLS) {
            let az = a0 + j * (124 / NHILLS);
            let t1 = camScale * tand(az - camYaw);
            if (t1 > camScale * 1.9) { t1 = camScale * 1.9; }
            let idx = mod(Math.floor(az / 6) + b * 31 + 1440, NHILLT) + 1;
            let y1 = hillH[idx] * hs * hillK * camScale;
            if (hlOn > 0) {
                // v4.0: the real hills, far ones behind, near ones in front
                let ri = hlOff + mod(Math.floor(az / 6), 60) + 1;
                y1 = (b > 0 ? hlN[ri] : hlF[ri]) * hillK * camScale;
            }
            if (hillT > 0) {
                // city: flat-topped blocks, each slice its own height
                y1 = hillC[idx] * hs * hillK * camScale;
                y0 = y1;
            }
            if (j > 0) {
                fill4(hx + cr * t0, hy - sr * t0,
                    hx + cr * t1, hy - sr * t1,
                    hx + cr * t1 + sr * y1, hy - sr * t1 + cr * y1,
                    hx + cr * t0 + sr * y0, hy - sr * t0 + cr * y0, col);
            }
            t0 = t1;
            y0 = y1;
            j = j + 1;
        }
        b = b + 1;
    }
}

// ---- segment culling + depth sort --------------------------------------
function cullSegments() {
    nVis = 0;
    let s0 = camSeg;
    let k = cullAhead;
    while (k > 0 - CULLBACK) {
        // one draw unit spans 1, 2 or 3 rings depending on how far down the
        // track it sits: merging the far field is the biggest saving here.
        let st = 1;
        if (k > lodF3) { st = 3; } else if (k > lodF2) { st = 2; }
        k = k - st;
        let i = mod(s0 - 1 + k + NSEG, NSEG) + 1;
        // v4.2: a bridge deck and the rings either side are drawn a ring at a
        // time: a unit reaching from the deck on to the land stretches the
        // deck's sides out over the fields
        if (st > 1) {
            if (sgBrg[i] + sgBrg[mod(i - 1 + st, NSEG) + 1] + sgBrg[mod(i - 1 + st + 1, NSEG) + 1] > 0) {
                k = k + st - 1;
                st = 1;
                i = mod(s0 - 1 + k + NSEG, NSEG) + 1;
            }
        }
        let dx = sgX[i] - camX;
        let dz = sgZ[i] - camZ;
        let d2 = dx * dx + dz * dz;
        if (d2 < farCull2) {
            let fd = dx * chX + dz * chZ;
            let margin = sgW[i] + GRASSW + 6 + st * segStep;
            if (fd > 0 - margin) {
                let sd = dx * csX + dz * csZ;
                let lim = fd * tanHalf + margin + SCNM;
                if (sd < lim) {
                    if (sd > 0 - lim) {
                        nVis = nVis + 1;
                        visI[nVis] = i;
                        visD[nVis] = d2;
                        visS[nVis] = st;
                    }
                }
            }
        }
    }
    // v4.0: the rest of the lap where it comes back close by - the other side
    // of a hairpin, a parallel straight, the other road at a crossing. It is
    // not ahead down the road, so the walk above never reaches it. A ring
    // can only be one ring's length closer than the last, so far off the
    // scan jumps ahead by the distance.
    let sideR = gfSide[gfx];
    if (sideR > fogFar) { sideR = fogFar; }
    let sideR2 = sideR * sideR;
    let kk = cullAhead + 1;
    let kEnd = NSEG - CULLBACK;
    while (kk < kEnd) {
        let i = mod(s0 - 1 + kk + NSEG, NSEG) + 1;
        let dx = sgX[i] - camX;
        let dz = sgZ[i] - camZ;
        let d2 = dx * dx + dz * dz;
        let st = 1;
        if (d2 < sideR2) {
            if (d2 > gfLod3[gfx] * gfLod3[gfx] * 0.25) { st = 3; } else if (d2 > gfLod2[gfx] * gfLod2[gfx] * 0.25) { st = 2; }
            if (kk + st > kEnd) { st = kEnd - kk; }
            if (st > 1) { if (sgBrg[i] + sgBrg[mod(i - 1 + st, NSEG) + 1] + sgBrg[mod(i - 1 + st + 1, NSEG) + 1] > 0) { st = 1; } }
            let fd = dx * chX + dz * chZ;
            let margin = sgW[i] + GRASSW + 6 + st * segStep;
            if (fd > 0 - margin) {
                let sd = dx * csX + dz * csZ;
                let lim = fd * tanHalf + margin + SCNM;
                if (sd < lim) {
                    if (sd > 0 - lim) {
                        nVis = nVis + 1;
                        visI[nVis] = i;
                        visD[nVis] = d2;
                        visS[nVis] = st;
                    }
                }
            }
            kk = kk + st;
        } else {
            let jump = Math.floor((Math.sqrt(d2) - sideR) / segStep);
            if (jump < 1) { jump = 1; }
            kk = kk + jump;
        }
    }
    // v4.2: patches of land in view, each a unit of its own (visI < 0);
    // close ones cell by cell, the rest one quad (visS 1 / 0)
    if (tpN > 0) {
        let pr = tgCc * 2.2;
        let near2 = tgCc * tgCc * 16;
        let p = 1;
        while (p <= tpN) {
            let dx = tpX[p] - camX;
            let dz = tpZ[p] - camZ;
            let d2 = dx * dx + dz * dz;
            if (d2 < farCull2) {
                let fd = dx * chX + dz * chZ;
                if (fd > 0 - pr) {
                    let sd = dx * csX + dz * csZ;
                    let lim = fd * tanHalf + pr;
                    if (sd < lim) {
                        if (sd > 0 - lim) {
                            nVis = nVis + 1;
                            visI[nVis] = 0 - p;
                            visD[nVis] = d2;
                            visS[nVis] = d2 < near2 ? 1 : 0;
                        }
                    }
                }
            }
            p = p + 1;
        }
    }
    // v4.2: at a crossing the road underneath goes down first, so the deck
    // above is always painted over it
    let v = 1;
    while (v <= nVis) {
        if (visI[v] > 0) { if (sgUnd[visI[v]] > 0) { visD[v] = visD[v] * 1.25 + 400; } }
        v = v + 1;
    }
    // the walk already came out farthest-first, so this insertion pass only
    // has to repair the odd hairpin where ring order and depth order disagree
    // (v4.0: and slot the rings from elsewhere on the lap in)
    let i2 = 2;
    while (i2 <= nVis) {
        let ki = visI[i2];
        let kd = visD[i2];
        let ks = visS[i2];
        let j = i2 - 1;
        while (j >= 1) {
            if (visD[j] >= kd) { break; }
            visI[j + 1] = visI[j];
            visD[j + 1] = visD[j];
            visS[j + 1] = visS[j];
            j = j - 1;
        }
        visI[j + 1] = ki;
        visD[j + 1] = kd;
        visS[j + 1] = ks;
        i2 = i2 + 1;
    }
}

// ---- one track segment --------------------------------------------------
function drawSeg(i, b0, b1, lvl) {
    if (sgBrg[i] > 0) {
        // v4.2: a bridge deck: its underside, seen from the road below (not
        // on the last ring, whose next ring is the embankment)
        if (sgBrg[idiv(b1, PPR) + 1] > 0) { quad(b0 + P_GR, b0 + P_GL, b1 + P_GL, b1 + P_GR, M_deck + 1); }
    } else if (lvl < 1) {
        quad(b0 + P_GL, b0 + P_GR, b1 + P_GR, b1 + P_GL, sgGMat[i]);
    }
    // road surface: the one quad every unit draws
    quad(b0 + P_L, b0 + P_R, b1 + P_R, b1 + P_L, sgMat[i]);
    if (lvl > 0) {
        if (sgHW[i] > 0) {
            quad(b0 + P_GL, b0 + P_L, b1 + P_L, b1 + P_GL, sgGMat[i]);
            quad(b0 + P_R, b0 + P_GR, b1 + P_GR, b1 + P_R, sgGMat[i]);
        } else {
            // run-off band (gravel, tarmac or verge), then the grass beyond it
            quad(b0 + P_OL, b0 + P_L, b1 + P_L, b1 + P_OL, sgRML[i]);
            quad(b0 + P_GL, b0 + P_OL, b1 + P_OL, b1 + P_GL, sgGMat[i]);
            quad(b0 + P_R, b0 + P_OR, b1 + P_OR, b1 + P_R, sgRMR[i]);
            quad(b0 + P_OR, b0 + P_GR, b1 + P_GR, b1 + P_OR, sgGMat[i]);
        }
        if (sgHW[i] > 0) {
            quad(b0 + P_L, b1 + P_L, b1 + P_WL, b0 + P_WL, sgWMat[i]);
            quad(b0 + P_R, b0 + P_WR, b1 + P_WR, b1 + P_R, sgCM[i]);
            if (sgTun[i] > 0) {
                quad(b0 + P_WR, b0 + P_WL, b1 + P_WL, b1 + P_WR, M_tunnel0 + 2);
            }
        }
    }
    if (lvl > 1) {
        if (mkN[i] > 0) { drawMarks(i, b0, b1); }
        if (sgCurb[i] > 0) {
            quad(b0 + P_L, b0 + P_CL, b1 + P_CL, b1 + P_L, sgCurb[i]);
            quad(b0 + P_CR, b0 + P_R, b1 + P_R, b1 + P_CR, sgCurb[i] + 1);
        }
        if (i == 1) { drawStartLine(b0, b1); }
        if (sgGrid[i] > 0) { drawGrid(i, b0, b1); }
        if (sgPit[i] == 2) { drawPitBox(i, b0, b1); }
    }
    if (lvl > 0) {
        if (gfx > 1) { drawEdgeLines(i, b0, b1); }
        if (showLine > 0) { if (nCars > 0) { drawLine(i, b0, b1); } }
    }
    if (sgGate[i] > 0) { drawGateStripe(i, b0, b1); }
}

// checkerboard start/finish line, interpolated across the already-projected
// road edges (perspective error across one ring's width is negligible)
function drawStartLine(b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            let ax = psX[b0 + P_L]; let ay = psY[b0 + P_L];
            let bx = psX[b0 + P_R]; let by = psY[b0 + P_R];
            let cx = psX[b1 + P_L]; let cy = psY[b1 + P_L];
            let dx = psX[b1 + P_R]; let dy = psY[b1 + P_R];
            let dep = pvZ[b0 + P_L];
            let k = 0;
            while (k < 8) {
                let t0 = k / 8;
                let t1 = t0 + 0.125;
                let m = mod(k, 2) < 1 ? M_startA : M_startB;
                quadS(ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1,
                    cx + (dx - cx) * t1, cy + (dy - cy) * t1, cx + (dx - cx) * t0, cy + (dy - cy) * t0, m, dep);
                k = k + 1;
            }
        }
    }
}

// white lines along both edges of the tarmac, inside the curbs where there
// are curbs: two thin bands interpolated across the projected road quad
function drawEdgeLines(i, b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            let w2 = 2 * sgW[i];
            let e0 = 0.30 / w2;
            let e1 = 0.50 / w2;
            if (sgCurb[i] > 0) { e0 = 1.14 / w2; e1 = 1.34 / w2; }
            let ax = psX[b0 + P_L]; let ay = psY[b0 + P_L];
            let bx = psX[b0 + P_R] - ax; let by = psY[b0 + P_R] - ay;
            let cx = psX[b1 + P_L]; let cy = psY[b1 + P_L];
            let dx = psX[b1 + P_R] - cx; let dy = psY[b1 + P_R] - cy;
            let dep = pvZ[b0 + P_L];
            quadS(ax + bx * e0, ay + by * e0, ax + bx * e1, ay + by * e1,
                cx + dx * e1, cy + dy * e1, cx + dx * e0, cy + dy * e0, M_startA, dep);
            let f0 = 1 - e1;
            let f1 = 1 - e0;
            quadS(ax + bx * f0, ay + by * f0, ax + bx * f1, ay + by * f1,
                cx + dx * f1, cy + dy * f1, cx + dx * f0, cy + dy * f0, M_startA, dep);
        }
    }
}

// Racing-line assist: a strip along the line, green where you can keep
// accelerating, amber where you should lift, red where you are too fast for
// what is coming and must brake.
let showLine = 0;
function drawLine(i, b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            let j = b1 / PPR + 1;
            let w2 = 2 * sgW[i];
            let t0 = (rlO[i] + sgW[i]) / w2;
            let t1 = (rlO[j] + sgW[j]) / (2 * sgW[j]);
            let h0 = 0.28 / w2;
            let ax = psX[b0 + P_L]; let ay = psY[b0 + P_L];
            let bx = psX[b0 + P_R] - ax; let by = psY[b0 + P_R] - ay;
            let cx = psX[b1 + P_L]; let cy = psY[b1 + P_L];
            let dx = psX[b1 + P_R] - cx; let dy = psY[b1 + P_R] - cy;
            let v = Math.abs(caSpd[1]);
            let m = M_ad + 2;
            if (v > rlV[i] + 2.5) { m = M_ad; }
            else if (v > rlV[i] - 3) { m = M_ad + 1; }
            quadS(ax + bx * (t0 - h0), ay + by * (t0 - h0), ax + bx * (t0 + h0), ay + by * (t0 + h0),
                cx + dx * (t1 + h0), cy + dy * (t1 + h0), cx + dx * (t1 - h0), cy + dy * (t1 - h0), m, pvZ[b0 + P_L]);
        }
    }
}

// the painted grid slot in front of each starting position
function drawGrid(i, b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            let ax = psX[b0 + P_L]; let ay = psY[b0 + P_L];
            let bx = psX[b0 + P_R] - ax; let by = psY[b0 + P_R] - ay;
            let cx = psX[b1 + P_L]; let cy = psY[b1 + P_L];
            let dx = psX[b1 + P_R] - cx; let dy = psY[b1 + P_R] - cy;
            let u0 = 2.9 / segStep;
            let u1 = 3.3 / segStep;
            let dep = pvZ[b0 + P_L];
            let sd = 0;
            while (sd < 2) {
                let t = sd > 0 ? 0.70 : 0.30;
                let t0 = t - 0.10;
                let t1 = t + 0.10;
                let p0x = ax + (cx - ax) * u0; let p0y = ay + (cy - ay) * u0;
                let q0x = bx + (dx - bx) * u0; let q0y = by + (dy - by) * u0;
                let p1x = ax + (cx - ax) * u1; let p1y = ay + (cy - ay) * u1;
                let q1x = bx + (dx - bx) * u1; let q1y = by + (dy - by) * u1;
                quadS(p0x + q0x * t0, p0y + q0y * t0, p0x + q0x * t1, p0y + q0y * t1,
                    p1x + q1x * t1, p1y + q1y * t1, p1x + q1x * t0, p1y + q1y * t0, M_startA, dep);
                sd = sd + 1;
            }
        }
    }
}

// v7: a team's box in the pit lane, painted in its livery
function drawPitBox(i, b0, b1) {
    if (pvZ[b0 + P_OL] > NEARZ) {
        if (pvZ[b1 + P_L] > NEARZ) {
            let c = mod(i - pitBox0 + NSEG, NSEG) + 1;
            let ax = psX[b0 + P_OL]; let ay = psY[b0 + P_OL];
            let bx = psX[b0 + P_L] - ax; let by = psY[b0 + P_L] - ay;
            let cx = psX[b1 + P_OL]; let cy = psY[b1 + P_OL];
            let dx = psX[b1 + P_L] - cx; let dy = psY[b1 + P_L] - cy;
            let t0 = 0.22; let t1 = 0.62;
            let u0 = 0.15; let u1 = 0.85;
            let p0x = ax + (cx - ax) * u0; let p0y = ay + (cy - ay) * u0;
            let q0x = bx + (dx - bx) * u0; let q0y = by + (dy - by) * u0;
            let p1x = ax + (cx - ax) * u1; let p1y = ay + (cy - ay) * u1;
            let q1x = bx + (dx - bx) * u1; let q1y = by + (dy - by) * u1;
            let col = '#d8d8d8';
            if (c <= nCars) { col = lvHex[caCol[c]]; }
            let x1 = Math.round(p0x + q0x * t0); let y1 = Math.round(p0y + q0y * t0);
            let x2 = Math.round(p0x + q0x * t1); let y2 = Math.round(p0y + q0y * t1);
            let x3 = Math.round(p1x + q1x * t1); let y3 = Math.round(p1y + q1y * t1);
            let x4 = Math.round(p1x + q1x * t0); let y4 = Math.round(p1y + q1y * t0);
            let ar = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) + (x3 - x1) * (y4 - y1) - (y3 - y1) * (x4 - x1);
            if (ar > 0) {
                fill4(x1 / QS, y1 / QS, x2 / QS, y2 / QS, x3 / QS, y3 / QS, x4 / QS, y4 / QS, col);
                drawnQuads = drawnQuads + 1;
            }
        }
    }
}

function drawGateStripe(i, b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            quadS(psX[b0 + P_L], psY[b0 + P_L], psX[b0 + P_R], psY[b0 + P_R],
                psX[b1 + P_R], psY[b1 + P_R], psX[b1 + P_L], psY[b1 + P_L], M_gate, pvZ[b0 + P_L]);
        }
    }
}

// ---- tyre marks: lateral bands of a segment's road quad -----------------
function drawMarks(i, b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            let ax = psX[b0 + P_L]; let ay = psY[b0 + P_L];
            let bx = psX[b0 + P_R] - ax; let by = psY[b0 + P_R] - ay;
            let cx = psX[b1 + P_L]; let cy = psY[b1 + P_L];
            let dx = psX[b1 + P_R] - cx; let dy = psY[b1 + P_R] - cy;
            let dep = pvZ[b0 + P_L];
            let n = mkN[i];
            let k = 1;
            while (k <= n) {
                let s = (i - 1) * MKS + k;
                let a0 = mkX1[s];
                let a1 = mkX2[s];
                let c0 = mkZ1[s];
                let c1 = mkZ2[s];
                let m = M_mark0 + mkA[s];
                quadS(ax + bx * a0, ay + by * a0, ax + bx * a1, ay + by * a1,
                    cx + dx * c1, cy + dy * c1, cx + dx * c0, cy + dy * c0, m, dep);
                k = k + 1;
            }
        }
    }
}

// ---- car shadow: a flat blob on the road under the body ----------------
function drawShadow(c, i, b0, b1) {
    if (pvZ[b0 + P_L] > NEARZ) {
        if (pvZ[b1 + P_R] > NEARZ) {
            let w = sgW[i];
            let t = (caOff[c] + w) / (2 * w);
            let hw = 1.05 / (2 * w);
            let u = caU[c];
            let a0 = t - hw;
            let a1 = t + hw;
            let ax = psX[b0 + P_L]; let ay = psY[b0 + P_L];
            let bx = psX[b0 + P_R] - ax; let by = psY[b0 + P_R] - ay;
            let cx = psX[b1 + P_L]; let cy = psY[b1 + P_L];
            let dx = psX[b1 + P_R] - cx; let dy = psY[b1 + P_R] - cy;
            // blend the two ring edges by the car's position along the segment
            let u0 = u - 0.22; let u1 = u + 0.22;
            if (u0 < 0) { u0 = 0; }
            if (u1 > 1) { u1 = 1; }
            let p1x = ax + (cx - ax) * u0; let p1y = ay + (cy - ay) * u0;
            let q1x = bx + (dx - bx) * u0; let q1y = by + (dy - by) * u0;
            let p2x = ax + (cx - ax) * u1; let p2y = ay + (cy - ay) * u1;
            let q2x = bx + (dx - bx) * u1; let q2y = by + (dy - by) * u1;
            quadS(p1x + q1x * a0, p1y + q1y * a0, p1x + q1x * a1, p1y + q1y * a1,
                p2x + q2x * a1, p2y + q2y * a1, p2x + q2x * a0, p2y + q2y * a0,
                M_shadow0 + 1, pvZ[b0 + P_L]);
        }
    }
}

// ---- cars ---------------------------------------------------------------
// The open-wheeler (f1car.mjs) in one of two tiers: tier 1 is the full car,
// tier 0 the silhouette. Its faces are drawn in the back-to-front order the
// build worked out for whichever of 8 directions the camera is looking from,
// and each one is lit from its own normal with the sun and then fogged, so
// the livery can be any colour at all without a palette entry.
function drawCar(c, tier) {
    let yc = cosd(caYaw[c]);
    let ys = sind(caYaw[c]);
    let rc = cosd(caRoll[c]);
    let rs = sind(caRoll[c]);
    let pc = cosd(caPitch[c]);
    let ps = sind(caPitch[c]);
    // where the car's own x, y and z axes point in the world (roll, then
    // pitch, then yaw)
    let xX = rc * yc + rs * ps * ys; let xY = rs * pc; let xZ = rs * ps * yc - rc * ys;
    let yX = rc * ps * ys - rs * yc; let yY = rc * pc; let yZ = rs * ys + rc * ps * yc;
    let zX = pc * ys; let zY = 0 - ps; let zZ = pc * yc;
    // model space straight to view space: one 3x3 matrix and an offset per
    // car, so each vertex costs nine multiplies instead of a world pass and
    // a camera pass
    let a00 = crX * xX + crY * xY + crZ * xZ; let a01 = crX * yX + crY * yY + crZ * yZ; let a02 = crX * zX + crY * zY + crZ * zZ;
    let a10 = cuX * xX + cuY * xY + cuZ * xZ; let a11 = cuX * yX + cuY * yY + cuZ * yZ; let a12 = cuX * zX + cuY * zY + cuZ * zZ;
    let a20 = cfX * xX + cfY * xY + cfZ * xZ; let a21 = cfX * yX + cfY * yY + cfZ * yZ; let a22 = cfX * zX + cfY * zY + cfZ * zZ;
    let dx = caX[c] - camX;
    let dy = caY[c] - camY;
    let dz = caZ[c] - camZ;
    let o2 = cfX * dx + cfY * dy + cfZ * dz;
    // the whole car off screen: nothing to transform (radius 3.2 m)
    let o0 = crX * dx + crY * dy + crZ * dz;
    let o1 = cuX * dx + cuY * dy + cuZ * dz;
    let vis = 1;
    if (o2 < 0 - 3.2) { vis = 0; }
    if (o0 - frKX * o2 > 3.2 * frFX) { vis = 0; }
    if (0 - o0 - frKX * o2 > 3.2 * frFX) { vis = 0; }
    if (o1 - frKY * o2 > 3.2 * frFY) { vis = 0; }
    if (0 - o1 - frKY * o2 > 3.2 * frFY) { vis = 0; }
    if (vis > 0) {
        // integer versions: model mm -> view units (1/ZU m)
        let dxi = Math.round(caX[c] * WU) - camXi;
        let dyi = Math.round(caY[c] * WU) - camYi;
        let dzi = Math.round(caZ[c] * WU) - camZi;
        let i0 = dxi * crXi + dyi * crYi + dzi * crZi;
        let i1 = dxi * cuXi + dyi * cuYi + dzi * cuZi;
        let i2 = dxi * cfXi + dyi * cfYi + dzi * cfZi;
        let m = BS / 10;
        let b00 = Math.round(a00 * m); let b01 = Math.round(a01 * m); let b02 = Math.round(a02 * m);
        let b10 = Math.round(a10 * m); let b11 = Math.round(a11 * m); let b12 = Math.round(a12 * m);
        let b20 = Math.round(a20 * m); let b21 = Math.round(a21 * m); let b22 = Math.round(a22 * m);
        // the camera and the sun as the car sees them: back faces and lighting
        // are then one dot product per face against constants from the build
        let lcx = 0 - (xX * dx + xY * dy + xZ * dz);
        let lcy = 0 - (yX * dx + yY * dy + yZ * dz);
        let lcz = 0 - (zX * dx + zY * dy + zZ * dz);
        // camera (mm) and sun (x1024) in car space, whole numbers for the face loop
        let lci = Math.round(lcx * 1000); let lcj = Math.round(lcy * 1000); let lck = Math.round(lcz * 1000);
        let lsi = Math.round((xX * SUNX + xY * SUNY + xZ * SUNZ) * 1024);
        let lsj = Math.round((yX * SUNX + yY * SUNY + yZ * SUNZ) * 1024);
        let lsk = Math.round((zX * SUNX + zY * SUNY + zZ * SUNZ) * 1024);
        // one fog level for the whole car
        let t = o2 / fogFar;
        if (t > 1) { t = 1; }
        if (t < 0) { t = 0; }
        let kf = 1 - t;
        // face light = (0.44 + 0.56 * sun) * kf, folded per car
        // v7 ULTRA: the light fades with the afternoon
        let dk = 1 - 0.32 * todK;
        let kA = 0.44 * kf * dk;
        let kB = 0.56 * kf * dk;
        let fr = skyR * t;
        let fg = skyG * t;
        let fb = skyB * t;
        // the front wheels turn with the steering
        let sa = caSteer[c] * 20;
        let wc = cosd(sa);
        let ws = sind(sa);
        let v0 = 1;
        let vn = NCVLO;
        let fn = NCFLO;
        if (tier > 0) { v0 = NCVLO + 1; vn = NCV; fn = NCFHI; }
        let v = v0;
        while (v <= vn) {
            let lx = cvX[v];
            let ly = cvY[v];
            let lz = cvZ[v];
            if (cvP[v] > 0) {
                let ox = cvPX[v];
                let oz = cvPZ[v];
                let ex = lx - ox;
                let ez = lz - oz;
                lx = Math.round(ox + ex * wc + ez * ws);
                lz = Math.round(oz - ex * ws + ez * wc);
            }
            let s = CARBASE + v;
            let vz = b20 * lx + b21 * ly + b22 * lz + i2;
            pvZ[s] = vz / ZU;
            let vx = b00 * lx + b01 * ly + b02 * lz + i0;
            let vy = b10 * lx + b11 * ly + b12 * lz + i1;
            if (vz > NEARZI) {
                psX[s] = Math.round(vx * camQ / vz) + scrOX;
                psY[s] = Math.round(vy * camQ / vz) + scrOY;
            } else {
                pvX[s] = vx / ZU;
                pvY[s] = vy / ZU;
            }
            v = v + 1;
        }
        // which way round the camera sees the car: 0 from ahead, 2 from its right
        atan2d(lcx, lcz);
        let ob = mod(Math.round(oAtan / 45) + 8, 8) * fn;
        let col = caCol[c];
        let lR = lvR[col]; let lG = lvG[col]; let lB = lvB[col];
        let lit = 0;
        if (caBrk[c] > 0.05) { lit = 1; }
        if (rainVis > 0.3) { lit = 1; }
        // v7: a knocked-off front wing is not drawn; ULTRA brake discs glow
        // with heat; on HIGH and up the time-trial ghost is see-through
        let noWing = caWing[c];
        let heat = 0;
        if (gfx > 2) { heat = caHeat[c]; }
        let see = 0;
        if (c == GHOST) { if (gfx > 1) { if (scCar < 1) { see = 45; penTr = see; penAlpha(see); } } }
        let k = 1;
        while (k <= fn) {
            let f = 0;
            if (tier > 0) { f = coHi[ob + k]; } else { f = coLo[ob + k]; }
            let nx = cnX[f];
            let ny = cnY[f];
            let nz = cnZ[f];
            // a face turned clearly away is skipped before any colour work
            // (the margin covers the steered front wheels); quad() makes the
            // exact call on the rest
            let skip = 0;
            if (noWing > 0) { if (cfW[f] > 0) { skip = 1; } }
            if (skip < 1) {
            if (nx * lci + ny * lcj + nz * lck - cfP[f] > 0 - 307200) {
                let kd = cfK[f];
                let r = 30; let g = 31; let b = 35;
                if (kd == 0) { r = lR; g = lG; b = lB; }
                else if (kd == 1) { r = lvR2[col]; g = lvG2[col]; b = lvB2[col]; }
                else if (kd == 3) { r = 22; g = 22; b = 25; }
                else if (kd == 4) { r = 150; g = 152; b = 162; }
                else if (kd == 5) { r = lvHR[col]; g = lvHG[col]; b = lvHB[col]; }
                else if (kd == 7) { r = lR * 0.55; g = lG * 0.55; b = lB * 0.55; }
                let l = (nx * lsi + ny * lsj + nz * lsk) / 1048576;
                if (l < 0) { l = 0; }
                l = kA + kB * l;
                if (kd == 6) {
                    l = kf;
                    if (lit > 0) { r = 255; g = 64; b = 52; } else { r = 96; g = 24; b = 24; }
                }
                if (kd == 4) {
                    if (heat > 0.05) {
                        r = r + (255 - r) * heat; g = g + (92 - g) * heat; b = b + (30 - b) * heat;
                        l = l + (kf - l) * heat;
                    }
                }
                // Entry's rgb() packs with (r << 16) + (g << 8) + b: the shifts
                // truncate red and green, but a fractional blue would leak into a
                // hex string with a decimal point in it, so only blue is floored
                qHex = rgb(r * l + fr, g * l + fg, Math.floor(b * l + fb));
                let a = CARBASE + cfA[f];
                quad(a, CARBASE + cfB[f], CARBASE + cfC[f], CARBASE + cfD[f], 0 - 1);
            }
            }
            k = k + 1;
        }
        if (see > 0) { penTr = 0; penAlpha(0); }
    }
}

function drawCarFar(c) {
    let s = SCRBASE + 2;
    wvX[s] = Math.round(caX[c] * WU);
    wvY[s] = Math.round((caY[c] + 0.45) * WU);
    wvZ[s] = Math.round(caZ[c] * WU);
    projSlots(s, s);
    if (pvZ[s] > NEARZ) {
        let r = camScale / pvZ[s];
        let hx = r * 0.95;
        let hy = r * 0.38;
        let x = psX[s] / QS;
        let y = psY[s] / QS;
        let col = caCol[c];
        let t = pvZ[s] / fogFar;
        if (t > 1) { t = 1; }
        qHex = rgb(Math.round(lvR[col] + (skyR - lvR[col]) * t), Math.round(lvG[col] + (skyG - lvG[col]) * t), Math.round(lvB[col] + (skyB - lvB[col]) * t));
        fill4(x - hx, y - hy, x + hx, y - hy, x + hx, y + hy, x - hx, y + hy, qHex);
        drawnQuads = drawnQuads + 1;
    }
}

// one car at whatever detail it has been given this frame (pickCarDetail)
function drawCarAt(c, near, i, b0, b1, d2) {
    if (near > 0) { if (c <= NCAR) { drawShadow(c, i, b0, b1); } }
    if (caTr[c] > 1) { drawCar(c, 1); }
    else if (caTr[c] > 0) { drawCar(c, 0); }
    else { drawCarFar(c); }
}

// Only the few nearest cars get the full model; the rest of those in range
// get the silhouette, and anything further a single card. At the start all
// eight are bunched round the camera and would otherwise all be full detail.
function pickCarDetail() {
    let c = 1;
    while (c <= GHOST) {
        let dx = caX[c] - camX;
        let dz = caZ[c] - camZ;
        caD2[c] = dx * dx + dz * dz;
        caTr[c] = 0;
        if (caD2[c] < carLodM2) { caTr[c] = 1; }
        c = c + 1;
    }
    let n = 0;
    while (n < gfFull[gfx]) {
        let best = 0;
        let bd = carLod2;
        c = 1;
        while (c <= nCars) {
            if (caTr[c] == 1) { if (caD2[c] < bd) { bd = caD2[c]; best = c; } }
            c = c + 1;
        }
        if (best < 1) { break; }
        caTr[best] = 2;
        n = n + 1;
    }
    if (caD2[GHOST] < carLod2) { caTr[GHOST] = 2; }
}

// ---- v4.2: a patch of land ------------------------------------------------
// 3 x 3 cells of the height grid (track.js loadLand): its 16 corners go
// through the scenery model's vertex slots, then a quad per cell in play.
// Far off, a whole patch is one quad over its four outer corners.
function landCorner(sl, ii, jj) {
    let ci = ii;
    let cj = jj;
    if (ci > tgNXc) { ci = tgNXc; }
    if (cj > tgNZc) { cj = tgNZc; }
    wvX[sl] = Math.round((tgX0c + ci * tgCc) * WU);
    wvY[sl] = Math.round(tgH[cj * (tgNXc + 1) + ci + 1] * WU);
    wvZ[sl] = Math.round((tgZ0c + cj * tgCc) * WU);
}
function drawLand(p, full) {
    let i0 = tpI[p];
    let j0 = tpJ[p];
    if (full < 1) { if (tpF[p] < 1) { full = 1; } }
    if (full < 1) {
        landCorner(SCNBASE + 1, i0, j0);
        landCorner(SCNBASE + 2, i0 + 3, j0);
        landCorner(SCNBASE + 3, i0 + 3, j0 + 3);
        landCorner(SCNBASE + 4, i0, j0 + 3);
        projSlots(SCNBASE + 1, SCNBASE + 4);
        quad(SCNBASE + 1, SCNBASE + 2, SCNBASE + 3, SCNBASE + 4, tpM[p]);
    } else {
        let a = 0;
        while (a <= 3) {
            let b = 0;
            while (b <= 3) {
                landCorner(SCNBASE + 1 + a * 4 + b, i0 + b, j0 + a);
                b = b + 1;
            }
            a = a + 1;
        }
        projSlots(SCNBASE + 1, SCNBASE + 16);
        a = 0;
        while (a < 3) {
            let b = 0;
            while (b < 3) {
                let ci = i0 + b;
                let cj = j0 + a;
                if (ci < tgNXc) { if (cj < tgNZc) {
                    let c = cj * tgNXc + ci + 1;
                    if (tgK[c] > 0) {
                        let s = SCNBASE + 1 + a * 4 + b;
                        quad(s, s + 1, s + 5, s + 4, tgM[c]);
                    }
                } }
                b = b + 1;
            }
            a = a + 1;
        }
    }
}

// ---- scenery ------------------------------------------------------------
// One instance of one model: spin its template vertices into the world, run
// them through the same projection the track uses, then hand every face to
// quad(). Near-plane clipping, back-face culling and the off-screen reject
// all come for free from there, which is what lets a grandstand the camera is
// standing inside still draw correctly.
function drawScn(o, hi) {
    let t = scT[o];
    let v0 = gtV0[t];
    let fA = 1;
    let vn = gtVLo[t];
    let fB = gtFLo[t];
    if (hi > 0) {
        vn = gtVN[t];
        fA = fB + 1;
        fB = gtFN[t];
    }
    let cy = scC[o];
    let sy = scS[o];
    // v4.0: sized along each of its own axes (a real building is a unit box
    // stretched to its footprint and height)
    let sk = scK[o];
    let ky = scKY[o];
    let kz = scKZ[o];
    let dxi = Math.round(scX[o] * WU) - camXi;
    let dyi = Math.round(scY[o] * WU) - camYi;
    let dzi = Math.round(scZ[o] * WU) - camZi;
    // bounding sphere against the view frustum: an object wholly off screen
    // costs a handful of operations instead of a model's worth of vertices
    let rr = gtR[t] * scKR[o] * BS;
    let i2 = dxi * cfXi + dyi * cfYi + dzi * cfZi;
    let i0 = dxi * crXi + dyi * crYi + dzi * crZi;
    let i1 = dxi * cuXi + dyi * cuYi + dzi * cuZi;
    let vis = 1;
    if (i2 < 0 - rr) { vis = 0; }
    // v4.0: too small to matter - a few pixels across at this distance (the
    // real circuits have hundreds of houses and trees far off)
    if (rr * scnSz < i2) { vis = 0; }
    if (i0 - frKX * i2 > rr * frFX) { vis = 0; }
    if (0 - i0 - frKX * i2 > rr * frFX) { vis = 0; }
    if (i1 - frKY * i2 > rr * frFY) { vis = 0; }
    if (0 - i1 - frKY * i2 > rr * frFY) { vis = 0; }
    if (vis > 0) {
        // model (whole cm) straight to view space (1/ZU m): model x runs along
        // (cy, 0, -sy) in the world, z along (sy, 0, cy)
        let m00 = Math.round(sk * (crXi * cy - crZi * sy)); let m01 = Math.round(ky * crYi); let m02 = Math.round(kz * (crXi * sy + crZi * cy));
        let m10 = Math.round(sk * (cuXi * cy - cuZi * sy)); let m11 = Math.round(ky * cuYi); let m12 = Math.round(kz * (cuXi * sy + cuZi * cy));
        let m20 = Math.round(sk * (cfXi * cy - cfZi * sy)); let m21 = Math.round(ky * cfYi); let m22 = Math.round(kz * (cfXi * sy + cfZi * cy));
        let v = 1;
        while (v <= vn) {
            let g = v0 + v;
            let gx = gvX[g];
            let gy = gvY[g];
            let gz = gvZ[g];
            let sl = SCNBASE + v;
            let vz = m20 * gx + m21 * gy + m22 * gz + i2;
            pvZ[sl] = vz / ZU;
            let vx = m00 * gx + m01 * gy + m02 * gz + i0;
            let vy = m10 * gx + m11 * gy + m12 * gz + i1;
            if (vz > NEARZI) {
                psX[sl] = Math.round(vx * camQ / vz);
                psY[sl] = Math.round(vy * camQ / vz);
            } else {
                pvX[sl] = vx / ZU;
                pvY[sl] = vy / ZU;
            }
            v = v + 1;
        }
        let mb = gtMat[t] + scM[o];
        let f0 = gtF0[t];
        if (t == SC_BLOCK) {
            // v4.0: a box shows the camera at most two walls and its roof;
            // which ones is plain from where the camera stands in the box's
            // own frame, so the rest never reach quad()
            let lx = dzi * sy - dxi * cy;
            let lz = 0 - dxi * sy - dzi * cy;
            let g = f0 + fA - 1;
            if (lz > kz * 50) { quad(SCNBASE + gfA[g + 1], SCNBASE + gfB[g + 1], SCNBASE + gfC[g + 1], SCNBASE + gfD[g + 1], mb + gfM[g + 1]); }
            if (lx > sk * 50) { quad(SCNBASE + gfA[g + 2], SCNBASE + gfB[g + 2], SCNBASE + gfC[g + 2], SCNBASE + gfD[g + 2], mb + gfM[g + 2]); }
            if (lz < 0 - kz * 50) { quad(SCNBASE + gfA[g + 3], SCNBASE + gfB[g + 3], SCNBASE + gfC[g + 3], SCNBASE + gfD[g + 3], mb + gfM[g + 3]); }
            if (lx < 0 - sk * 50) { quad(SCNBASE + gfA[g + 4], SCNBASE + gfB[g + 4], SCNBASE + gfC[g + 4], SCNBASE + gfD[g + 4], mb + gfM[g + 4]); }
            if (0 - dyi > ky * 100) { quad(SCNBASE + gfA[g + 5], SCNBASE + gfB[g + 5], SCNBASE + gfC[g + 5], SCNBASE + gfD[g + 5], mb + gfM[g + 5]); }
        } else {
        let f = fA;
        while (f <= fB) {
            let g = f0 + f;
            quad(SCNBASE + gfA[g], SCNBASE + gfB[g], SCNBASE + gfC[g], SCNBASE + gfD[g], mb + gfM[g]);
            f = f + 1;
        }
        }
    }
}

// every object filed against the rings this draw unit spans
function drawScnIn(i, st, lvl, d2) {
    // full models only close in; how close depends on the graphics level
    let hi = lvl > 1 ? 1 : 0;
    if (gfx > 1) { hi = d2 < scnHi2 ? 1 : 0; }
    let q = 0;
    while (q < st) {
        let sg = i + q;
        if (sg > NSEG) { sg = sg - NSEG; }
        let o = scHead[sg];
        while (o > 0) {
            if (scLod[o] <= lvl) { drawScn(o, hi); }
            o = scNext[o];
        }
        q = q + 1;
    }
}

// ---- tyre smoke: screen-space billboards -------------------------------
function drawSmokeIn(i) {
    let k = 1;
    while (k <= smN) {
        if (smSeg[k] == i) {
            if (smL[k] > 0) {
                let s = SCRBASE + 1;
                wvX[s] = Math.round(smX[k] * WU); wvY[s] = Math.round(smY[k] * WU); wvZ[s] = Math.round(smZ[k] * WU);
                projSlots(s, s);
                if (pvZ[s] > SMOKEZ) {
                    let r = smS[k] * camQ / pvZ[s];
                    if (r > 12 * QS) { r = 12 * QS; }
                    let x = psX[s];
                    let y = psY[s];
                    let m = smL[k] > 0.55 ? M_smoke : M_smokeD;
                    if (gfx > 1) {
                        // v7: a see-through puff that thins out as it fades
                        // (the pen's transparency applies to fills as well)
                        let fl = Math.floor(pvZ[s] * fogK);
                        if (fl > NFOG - 1) { fl = NFOG - 1; }
                        let tr = 30 + Math.round((1 - smL[k]) * 12) * 5;
                        if (tr != penTr) { penTr = tr; penAlpha(tr); }
                        let r2 = r * 1.25;
                        fill4(x / QS, (y - r2) / QS, (x + r2) / QS, y / QS, x / QS, (y + r2) / QS, (x - r2) / QS, y / QS, colTab[colOff + M_smoke * NFOG + fl]);
                        drawnQuads = drawnQuads + 1;
                    } else { quadS(x, y - r, x + r, y, x, y + r, x - r, y, m, pvZ[s]); }
                }
            }
        }
        k = k + 1;
    }
    if (penTr > 0) { penTr = 0; penAlpha(0); }
}

// ---- minimap ------------------------------------------------------------
// A plain pen drawing: a dark panel, the circuit as a ribbon of quads built
// once per track, then a diamond per car in its own colour with the player
// drawn last so it is never hidden.
function drawMinimap() {
    let p = MMR + 7;
    fill4(MMX - p, MMY - p, MMX + p, MMY - p, MMX + p, MMY + p, MMX - p, MMY + p, mmPanel);
    let k = 1;
    while (k <= NMM) {
        let j = mod(k, NMM) + 1;
        fill4(mmLX[k], mmLY[k], mmRX[k], mmRY[k], mmRX[j], mmRY[j], mmLX[j], mmLY[j], mmTrack);
        k = k + 1;
    }
    // start line, two samples wide so it reads at this size
    fill4(mmLX[1], mmLY[1], mmRX[1], mmRY[1], mmRX[3], mmRY[3], mmLX[3], mmLY[3], mmStart);
    if (scCar > 0) {
        let sx = MMX + (caX[GHOST] - mmCx) * mmS;
        let sy = MMY + (caZ[GHOST] - mmCz) * mmS;
        fill4(sx, sy - 3.4, sx + 3.4, sy, sx, sy + 3.4, sx - 3.4, sy, '#ff8a00');
    }
    let c = nCars;
    while (c >= 1) {
        let x = MMX + (caX[c] - mmCx) * mmS;
        let y = MMY + (caZ[c] - mmCz) * mmS;
        let r = 2.8;
        let col = lvHex[caCol[c]];
        if (c == 1) { r = 4.2; col = mmYou; }
        fill4(x, y - r, x + r, y, x, y + r, x - r, y, col);
        c = c - 1;
    }
}

// ---- whole frame --------------------------------------------------------
function renderWorld() {
    frameId = frameId + 1;
    drawnQuads = 0;
    setupCam();
    eraseAll();
    drawSky();
    drawHills();
    cullSegments();
    pickCarDetail();
    let k = 1;
    while (k <= nVis) {
        let i = visI[k];
        if (i < 0) { drawLand(0 - i, visS[k]); } else {
        let st = visS[k];
        let j = i + st;                     // the ring that closes this unit
        if (j > NSEG + 1) { j = j - NSEG; }
        let lvl = 3 - st;               // st 1/2/3 -> full / middle / far
        let near = st < 2 ? 1 : 0;
        projRing(i, lvl);
        projRing(j, lvl);
        let b0 = (i - 1) * PPR;
        let b1 = (j - 1) * PPR;
        drawSeg(i, b0, b1, lvl);
        if (scN > 0) {
            if (visD[k] < scnFar2) { drawScnIn(i, st, lvl, visD[k]); }
        }
        // the time-trial ghost rides along in the same unit as any car,
        // drawn first so it never hides the real car it is racing
        let g9 = ghostOn;
        if (scCar > 0) { g9 = 1; }
        if (g9 > 0) {
            let rg = caSeg[GHOST] - i;
            if (rg < 0) { rg = rg + NSEG; }
            if (rg < st) { drawCarAt(GHOST, near, i, b0, b1, visD[k]); }
        }
        // cars sitting anywhere inside this unit's span of rings
        let c = 1;
        while (c <= nCars) {
            let rel = caSeg[c] - i;
            if (rel < 0) { rel = rel + NSEG; }
            if (rel < st) {
                let show = 1;
                if (caFin[c] >= 2) { show = 0; }
                // the cockpit eye sits inside the player's own bodywork
                if (camMode == 1) { if (c == 1) { show = 0; } }
                // the showroom car goes on top of everything, after the loop
                if (raceState == ST_CARSEL) { show = 0; }
                if (raceState == ST_TUNE) { show = 0; }
                if (show > 0) { drawCarAt(c, near, i, b0, b1, visD[k]); }
            }
            c = c + 1;
        }
        if (near > 0) {
            if (smN > 0) { drawSmokeIn(i); }
            if (spN > 0) { drawSparksIn(i); }
        }
        }
        k = k + 1;
    }
    let room = 0;
    if (raceState == ST_CARSEL) { room = 1; }
    if (raceState == ST_TUNE) { room = 1; }
    if (room > 0) { drawTurntable(1); drawCar(1, 1); }
    if (rainVis > 0.05) { drawRain(); }
    if (raceState == ST_REPLAY) { drawReplayUI(); }
    else {
        if (nCars > 0) { if (room < 1) { drawMinimap(); } }
        if (raceState == ST_COUNT) { drawLights(); }
        else if (lightsT > 0) { drawLights(); }
        if (raceState == ST_RACE) { drawRev(); }
        else if (raceState == ST_COUNT) { drawRev(); }
        else if (raceState == ST_FORM) { drawRev(); }
        else if (raceState == ST_QUALI) { drawRev(); }
        if (rules == R_SIM) { drawSimHud(); }
    }
    drawMenuUI();
    drawPopup();
}

// ---- rain: slanted streaks in screen space, leaning with the car's speed --
function drawRain() {
    let n = Math.round((18 + gfx * 14) * rainVis);
    let lean = 0.35 + Math.abs(caSpd[1]) * 0.012;
    if (nCars < 1) { lean = 0.35; }
    let k = 0;
    while (k < n) {
        let x = rand(0 - 250, 250);
        let y = rand(0 - 140, 150);
        let l = rand(10, 22);
        fill4(x, y, x + 1.2, y, x + 1.2 - l * lean, y - l, x - l * lean, y - l, rainCol);
        k = k + 1;
    }
}

// ---- five red start lights on a gantry panel -----------------------------
function drawLights() {
    fill4(0 - 80, 101, 80, 101, 80, 71, 0 - 80, 71, '#101216');
    let k = 1;
    while (k <= 5) {
        let x = (k - 3) * 31;
        let col = '#3a1010';
        if (lightsOut < 1) { if (k <= lightN) { col = '#ff2a1a'; } }
        fillOct(x, 86, 11, '#050506');
        fillOct(x, 86, 8, col);
        k = k + 1;
    }
}

// a filled octagon: a round light at HUD sizes
function fillOct(x, y, r, col) {
    let q = r * 0.414;
    fillColorHex(col);
    goto(x - q, y + r);
    fillStart();
    goto(x + q, y + r);
    goto(x + r, y + q);
    goto(x + r, y - q);
    goto(x + q, y - r);
    goto(x - q, y - r);
    goto(x - r, y - q);
    goto(x - r, y + q);
    goto(x - q, y + r);
    fillStop();
}

// ---- rev lights: 15 LEDs, green / red / blue, above the speed readout -----
function drawRev() {
    let n = (caRpm[1] - 8600) / 220;
    if (n < 0) { n = 0; }
    fill4(0 - 226, 0 - 78, 0 - 118, 0 - 78, 0 - 118, 0 - 88, 0 - 226, 0 - 88, '#101216');
    let k = 1;
    while (k <= 15) {
        let x = 0 - 225 + (k - 1) * 7.1;
        let col = '#23262c';
        if (k <= n) {
            col = '#34e05a';
            if (k > 5) { col = '#ff3030'; }
            if (k > 10) { col = '#3a7bff'; }
        }
        fill4(x, 0 - 80, x + 5.6, 0 - 80, x + 5.6, 0 - 86, x, 0 - 86, col);
        k = k + 1;
    }
}

// ---- showroom turntable: two stacked discs under the car -------------------
function drawTurntable(c) {
    let rr = 3.9;
    let pass = 0;
    while (pass < 2) {
        let k = 0;
        while (k < 24) {
            let a = k * 15 + gt * 25;
            let s = SCNBASE + 1 + k;
            wvX[s] = Math.round((caX[c] + rr * cosd(a)) * WU);
            wvY[s] = Math.round((caY[c] + 0.02 + pass * 0.03) * WU);
            wvZ[s] = Math.round((caZ[c] + rr * sind(a)) * WU);
            k = k + 1;
        }
        projSlots(SCNBASE + 1, SCNBASE + 24);
        let ok = 1;
        k = 1;
        while (k <= 24) { if (pvZ[SCNBASE + k] <= NEARZ) { ok = 0; } k = k + 1; }
        if (ok > 0) {
            fillColorHex(pass > 0 ? '#1b212b' : '#9aa6b8');
            goto(psX[SCNBASE + 1] / QS, psY[SCNBASE + 1] / QS);
            fillStart();
            k = 2;
            while (k <= 24) { goto(psX[SCNBASE + k] / QS, psY[SCNBASE + k] / QS); k = k + 1; }
            goto(psX[SCNBASE + 1] / QS, psY[SCNBASE + 1] / QS);
            fillStop();
        }
        rr = 3.6;
        pass = pass + 1;
    }
}

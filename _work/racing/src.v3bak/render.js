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
const SCNFAR2 = 74000;     // and it stops being drawn about 270 m out
const CARBASE = (NSEG + 1) * PPR;
const SCRBASE = CARBASE + NCARV;
const SCNBASE = SCRBASE + 8;

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
let camFov = 74;
let tanHalf = 0.8;
let farCull2 = 160000;
let fogK = 0.0375;
const mmPanel = '#141820';
const mmTrack = '#b4bcc8';
const mmStart = '#ffe05a';
const mmYou = '#ffffff';
let colOff = 0;             // colTab base, folded: colTab[colOff + mat * NFOG + fog]
let nVis = 0;
let nClip = 0;
const carLod2 = 2600;                       // full car model inside this radius
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
    farCull2 = fogFar * fogFar;
    fogK = (NFOG - 1) / fogFar;
    colOff = 1 - NFOG;
    // how far along the ring the LOD bands and the scan itself reach. Working
    // in ring offsets instead of metres keeps the cull loop free of list reads.
    lodF2 = Math.floor(62 / segStep) + 1;
    lodF3 = Math.floor(155 / segStep) + 1;
    cullAhead = Math.floor(fogFar / segStep) + 2;
    if (cullAhead > NSEG - 8) { cullAhead = NSEG - 8; }
}

// project the vertex-buffer slots [a..b] into view + screen space
function projSlots(a, b) {
    let p = a;
    while (p <= b) {
        let dx = wvX[p] - camX;
        let dy = wvY[p] - camY;
        let dz = wvZ[p] - camZ;
        let vz = dx * cfX + dy * cfY + dz * cfZ;
        pvZ[p] = vz;
        let vx = dx * crX + dy * crY + dz * crZ;
        let vy = dx * cuX + dy * cuY + dz * cuZ;
        if (vz > NEARZ) {
            let iv = camScale / vz;
            psX[p] = vx * iv;
            psY[p] = vy * iv;
        } else {
            pvX[p] = vx;
            pvY[p] = vy;
        }
        p = p + 1;
    }
}

// Project as much of a ring as its draw unit actually needs: road edges for a
// far unit, + grass and wall tops for a middle one, everything up close. A ring
// shared by two units is topped up rather than reprojected.
function projRing(i, lvl) {
    let e = 4;
    if (lvl > 1) { e = 8; }
    if (e < 6) {
        // wall tops belong to the ring on either side of a walled segment
        let h = sgHW[i];
        if (h < 1) {
            let q = i - 1;
            if (q < 1) { q = NSEG; }
            h = sgHW[q];
        }
        if (h > 0) { e = 6; }
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
    if (za >= NEARZ) { let k = za / camScale; ax = psX[a] * k; ay = psY[a] * k; }
    let bx = pvX[b];
    let by = pvY[b];
    if (zb >= NEARZ) { let k = zb / camScale; bx = psX[b] * k; by = psY[b] * k; }
    let t = (NEARZ - za) / (zb - za);
    let iv = camScale / NEARZ;
    nClip = nClip + 1;
    clipX[nClip] = (ax + (bx - ax) * t) * iv;
    clipY[nClip] = (ay + (by - ay) * t) * iv;
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
            if (ax > 245) { if (bx > 245) { if (cx > 245) { if (dx > 245) { off = 1; } } } }
            if (off < 1) { if (ax < 0 - 245) { if (bx < 0 - 245) { if (cx < 0 - 245) { if (dx < 0 - 245) { off = 1; } } } } }
            if (off < 1) { if (ay > 140) { if (by > 140) { if (cy > 140) { if (dy > 140) { off = 1; } } } } }
            if (off < 1) { if (ay < 0 - 140) { if (by < 0 - 140) { if (cy < 0 - 140) { if (dy < 0 - 140) { off = 1; } } } } }
            if (off < 1) {
                let fl = Math.floor((za + zc) * 0.5 * fogK);
                if (fl > NFOG - 1) { fl = NFOG - 1; }
                fillColorHex(colTab[colOff + mat * NFOG + fl]);
                goto(ax, ay);
                fillStart();
                goto(bx, by);
                goto(cx, cy);
                goto(dx, dy);
                goto(ax, ay);
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
                let zz = za;
                if (zz < NEARZ) { zz = NEARZ; }
                let fl = Math.floor(zz * fogK);
                if (fl > NFOG - 1) { fl = NFOG - 1; }
                fillColorHex(colTab[colOff + mat * NFOG + fl]);
                goto(clipX[1], clipY[1]);
                fillStart();
                k = 2;
                while (k <= nClip) {
                    goto(clipX[k], clipY[k]);
                    k = k + 1;
                }
                goto(clipX[1], clipY[1]);
                fillStop();
                drawnQuads = drawnQuads + 1;
            }
        }
    }
}

// a quad given directly in screen space (used for decals and billboards,
// whose corners are interpolated from already-projected road points)
function quadS(x1, y1, x2, y2, x3, y3, x4, y4, mat, depth) {
    let ar = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) + (x3 - x1) * (y4 - y1) - (y3 - y1) * (x4 - x1);
    if (ar > 0) {
        let fl = Math.floor(depth * fogK);
        if (fl > NFOG - 1) { fl = NFOG - 1; }
        if (fl < 0) { fl = 0; }
        fillColorHex(colTab[colOff + mat * NFOG + fl]);
        goto(x1, y1);
        fillStart();
        goto(x2, y2);
        goto(x3, y3);
        goto(x4, y4);
        goto(x1, y1);
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
    // ground haze: everything below the horizon, in the fogged grass tone
    fill4(hx - dx, hy - dy, hx + dx, hy + dy,
        hx + dx - nx * 900, hy + dy - ny * 900, hx - dx - nx * 900, hy - dy - ny * 900,
        colTab[colOff + (gmatBase + 5) * NFOG + NFOG - 2]);
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
            let y1 = hillH[idx] * hs * camScale;
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
    let s0 = caSeg[1];
    let k = cullAhead;
    while (k > 0 - CULLBACK) {
        // one draw unit spans 1, 2 or 3 rings depending on how far down the
        // track it sits: merging the far field is the biggest saving here.
        let st = 1;
        if (k > lodF3) { st = 3; } else if (k > lodF2) { st = 2; }
        k = k - st;
        let i = mod(s0 - 1 + k + NSEG, NSEG) + 1;
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
    // the walk already came out farthest-first, so this insertion pass only
    // has to repair the odd hairpin where ring order and depth order disagree
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
    if (lvl < 1) {
        quad(b0 + P_GL, b0 + P_GR, b1 + P_GR, b1 + P_GL, sgGMat[i]);
    }
    // road surface: the one quad every unit draws
    quad(b0 + P_L, b0 + P_R, b1 + P_R, b1 + P_L, sgMat[i]);
    if (lvl > 0) {
        quad(b0 + P_GL, b0 + P_L, b1 + P_L, b1 + P_GL, sgGMat[i]);
        quad(b0 + P_R, b0 + P_GR, b1 + P_GR, b1 + P_R, sgGMat[i]);
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
            let hw = 1.5 / (2 * w);
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
function drawCar(c) {
    let yc = cosd(caYaw[c]);
    let ys = sind(caYaw[c]);
    let rc = cosd(caRoll[c]);
    let rs = sind(caRoll[c]);
    let pc = cosd(caPitch[c]);
    let ps = sind(caPitch[c]);
    let px = caX[c];
    let py = caY[c];
    let pz = caZ[c];
    let v = 1;
    while (v <= NCV) {
        let lx = cvX[v];
        let ly = cvY[v];
        let lz = cvZ[v];
        let x1 = lx * rc - ly * rs;
        let y1 = lx * rs + ly * rc;
        let y2 = y1 * pc - lz * ps;
        let z2 = y1 * ps + lz * pc;
        let s = CARBASE + v;
        wvX[s] = px + x1 * yc + z2 * ys;
        wvY[s] = py + y2;
        wvZ[s] = pz - x1 * ys + z2 * yc;
        v = v + 1;
    }
    projSlots(CARBASE + 1, CARBASE + NCV);
    let col = caCol[c];
    let brk = caBrk[c] > 0.05 ? M_brakeOn : M_brakeOff;
    let f = 1;
    while (f <= NCF) {
        let k = cfK[f];
        let m = M_glass;
        if (k < 4) { m = M_car + (col - 1) * 4 + k; }
        else if (k > 4) { m = brk; }
        quad(CARBASE + cfA[f], CARBASE + cfB[f], CARBASE + cfC[f], CARBASE + cfD[f], m);
        f = f + 1;
    }
}

function drawCarFar(c) {
    let s = SCRBASE + 2;
    wvX[s] = caX[c];
    wvY[s] = caY[c] + 0.62;
    wvZ[s] = caZ[c];
    projSlots(s, s);
    if (pvZ[s] > NEARZ) {
        let r = camScale / pvZ[s];
        let hx = r * 1.02;
        let hy = r * 0.56;
        let x = psX[s];
        let y = psY[s];
        quadS(x - hx, y - hy, x + hx, y - hy, x + hx, y + hy, x - hx, y + hy,
            M_car + (caCol[c] - 1) * 4 + 1, pvZ[s]);
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
    let sk = scK[o];
    let px = scX[o];
    let py = scY[o];
    let pz = scZ[o];
    let v = 1;
    while (v <= vn) {
        let g = v0 + v;
        let lx = gvX[g] * sk;
        let ly = gvY[g] * sk;
        let lz = gvZ[g] * sk;
        let sl = SCNBASE + v;
        wvX[sl] = px + lx * cy + lz * sy;
        wvY[sl] = py + ly;
        wvZ[sl] = pz - lx * sy + lz * cy;
        v = v + 1;
    }
    projSlots(SCNBASE + 1, SCNBASE + vn);
    let mb = gtMat[t] + scM[o];
    let f0 = gtF0[t];
    let f = fA;
    while (f <= fB) {
        let g = f0 + f;
        quad(SCNBASE + gfA[g], SCNBASE + gfB[g], SCNBASE + gfC[g], SCNBASE + gfD[g], mb + gfM[g]);
        f = f + 1;
    }
}

// every object filed against the rings this draw unit spans
function drawScnIn(i, st, lvl) {
    // only the nearest band is worth the full models
    let hi = lvl > 1 ? 1 : 0;
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
                wvX[s] = smX[k]; wvY[s] = smY[k]; wvZ[s] = smZ[k];
                projSlots(s, s);
                if (pvZ[s] > SMOKEZ) {
                    let r = smS[k] * camScale / pvZ[s];
                    if (r > 12) { r = 12; }
                    let x = psX[s];
                    let y = psY[s];
                    let m = smL[k] > 0.55 ? M_smoke : M_smokeD;
                    quadS(x, y - r, x + r, y, x, y + r, x - r, y, m, pvZ[s]);
                }
            }
        }
        k = k + 1;
    }
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
    let c = nCars;
    while (c >= 1) {
        let x = MMX + (caX[c] - mmCx) * mmS;
        let y = MMY + (caZ[c] - mmCz) * mmS;
        let r = 2.8;
        let col = colTab[colOff + (M_car + (caCol[c] - 1) * 4) * NFOG];
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
    let k = 1;
    while (k <= nVis) {
        let i = visI[k];
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
            if (visD[k] < SCNFAR2) { drawScnIn(i, st, lvl); }
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
                if (show > 0) {
                    if (near > 0) {
                        drawShadow(c, i, b0, b1);
                        if (visD[k] < carLod2) { drawCar(c); } else { drawCarFar(c); }
                    } else { drawCarFar(c); }
                }
            }
            c = c + 1;
        }
        if (near > 0) {
            if (smN > 0) { drawSmokeIn(i); }
        }
        k = k + 1;
    }
    drawMinimap();
}

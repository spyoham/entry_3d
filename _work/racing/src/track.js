// ============================================================
// track.js - turns a circuit's control points into the runtime geometry:
// an equal-arc-length centreline of NSEG rings, a vertex buffer of PPR
// points per ring (grass / road / curb / wall), per-segment materials with
// baked directional lighting, and the checkpoint layout.
// ============================================================
const NSAMP = 1200;
const CURBW = 1.10;        // curb strip width
const GRASSW = 40;         // grass skirt width
const GRASSD = 1.0;        // grass sits this far below the road
const WALLH = 1.35;        // barrier height
const TUNH = 7.0;          // tunnel ceiling height
const JUMPH = 3.4;         // how high a jump run climbs before the lip
const SUNX = -0.35;
const SUNY = 0.86;
const SUNZ = -0.37;

let trkLen = 0;            // circuit length in metres
let segStep = 0;           // metres per segment
let curTrk = 1;
let skyR = 0;
let skyG = 0;
let skyB = 0;
let fogFar = 400;
let gmatBase = 0;          // ground family for this circuit
let mmCx = 0;              // minimap: circuit centre and metres-to-pixels
let mmCz = 0;
let mmS = 1;
let roadBase = 0;          // asphalt family for this circuit
let runStyle = 0;          // 0 walled, 1 gravel, 2 tarmac, 3 gravel slow / tarmac fast
let hillK = 1;             // distant skyline height
let hillT = 0;             // ...and kind: 0 ridges, 1 city blocks
let hlOn = 0;              // v4.0: 1 = the real skyline (hlN / hlF from hlOff)
let hlOff = 0;
let drsN = 0;              // v6 menu facts, filled by buildTrack
let trkElev = 0;
let mapTop = 1;
const RUNG = 16;           // gravel trap depth
const RUNT = 13;           // tarmac run-off depth
const RUNV = 3;            // plain grass verge
// The fogged palette: every material blended toward this circuit's sky in
// NFOG steps. Built once per track load; one rgb() per entry.
function loadPalette() {
    // rain: everything a shade darker and a little greyer, the road darkest
    // v7: by how wet it looks (0..1), and darker still towards dusk (ULTRA)
    let wk = 1 - 0.26 * wetVis - 0.30 * todK;
    let wg = 14 * wetVis;
    let i = 1;
    let m = 1;
    while (m <= NMAT) {
        let r = matR[m] * wk + wg;
        let g = matG[m] * wk + wg;
        let b = matB[m] * wk + wg + 4;
        let dr = (skyR - r) / (NFOG - 1);
        let dg = (skyG - g) / (NFOG - 1);
        let db = (skyB - b) / (NFOG - 1);
        let f = 0;
        while (f < NFOG) {
            colTab[i] = rgb(Math.round(r + dr * f), Math.round(g + dg * f), Math.round(b + db * f));
            i = i + 1;
            f = f + 1;
        }
        m = m + 1;
    }
}
let rainCol = '#9aa4b4';   // rain streak colour for this sky
let hillA = '#808080';     // far ridge, nearly the sky colour
let hillB = '#606060';     // near ridge, a shade darker
let nCP = 4;               // checkpoints on the current circuit

let oShade = 0;
// directional shading of a unit normal -> shade level 0..7
function shadeOf(nx, ny, nz) {
    let d = SUNX * nx + SUNY * ny + SUNZ * nz;
    if (d < 0) { d = 0; }
    oShade = Math.floor((0.30 + 0.70 * d) * 8);
    if (oShade > 7) { oShade = 7; }
    if (oShade < 0) { oShade = 0; }
}

// v7: sky, fog, far hills and the fogged palette for the current circuit, by
// how wet it looks (wetVis) and how late in the day it is (todK). Called at
// track build and again, in steps, as the weather or the light changes.
function refreshAtmos() {
    atmoW = wetVis;
    atmoT = todK;
    let tk = curTrk;
    let r = trkSkyR[tk];
    let g = trkSkyG[tk];
    let b = trkSkyB[tk];
    if (todK > 0) {
        r = r + (trkDuskR[tk] - r) * todK;
        g = g + (trkDuskG[tk] - g) * todK;
        b = b + (trkDuskB[tk] - b) * todK;
    }
    // an overcast, wet day: a low grey sky and the far field lost in spray
    let w = wetVis;
    skyR = Math.round(r + (r * 0.32 + 88 - r) * w);
    skyG = Math.round(g + (g * 0.32 + 92 - g) * w);
    skyB = Math.round(b + (b * 0.32 + 100 - b) * w);
    fogFar = trkFar[tk] * gfFog[gfx] * (1 - 0.38 * w);
    rainCol = rgb(Math.round(skyR * 0.6 + 90), Math.round(skyG * 0.6 + 96), Math.round(skyB * 0.6 + 108));
    hillA = rgb(Math.round(skyR * 0.80 + 14), Math.round(skyG * 0.80 + 16), Math.round(skyB * 0.84 + 22));
    hillB = rgb(Math.round(skyR * 0.62 + 10), Math.round(skyG * 0.63 + 12), Math.round(skyB * 0.70 + 18));
    loadPalette();
}

function buildTrack(tk) {
    curTrk = tk;
    todK = 0;
    refreshAtmos();
    gmatBase = trkGnd[tk];
    roadBase = trkRoad[tk];
    runStyle = trkRun[tk];
    hillK = trkHillK[tk];
    hillT = trkHillT[tk];
    hlOn = trkReal[tk];
    hlOff = (tk - 1) * 60;

    let off = ctlOff[tk];
    let n = ctlCnt[tk];
    let ns = n * 24;
    if (ns > NSAMP) { ns = NSAMP; }

    // ---- 1) sample the closed Catmull-Rom spline ----
    let i = 0;
    while (i < ns) {
        let u = i * n / ns;
        let k = Math.floor(u);
        let f = u - k;
        let a = off + mod(k - 1, n) + 1;
        let b = off + mod(k, n) + 1;
        let c = off + mod(k + 1, n) + 1;
        let d = off + mod(k + 2, n) + 1;
        let f2 = f * f;
        let f3 = f2 * f;
        let w0 = 0 - 0.5 * f3 + f2 - 0.5 * f;
        let w1 = 1.5 * f3 - 2.5 * f2 + 1;
        let w2 = 0 - 1.5 * f3 + 2 * f2 + 0.5 * f;
        let w3 = 0.5 * f3 - 0.5 * f2;
        i = i + 1;
        tsX[i] = ctlX[a] * w0 + ctlX[b] * w1 + ctlX[c] * w2 + ctlX[d] * w3;
        tsY[i] = ctlY[a] * w0 + ctlY[b] * w1 + ctlY[c] * w2 + ctlY[d] * w3;
        tsZ[i] = ctlZ[a] * w0 + ctlZ[b] * w1 + ctlZ[c] * w2 + ctlZ[d] * w3;
        tsW[i] = ctlW[b] + (ctlW[c] - ctlW[b]) * f;
        tsGL[i] = ctlGL[b] + (ctlGL[c] - ctlGL[b]) * f;
        tsGR[i] = ctlGR[b] + (ctlGR[c] - ctlGR[b]) * f;
        tsSL[i] = ctlSL[b] + (ctlSL[c] - ctlSL[b]) * f;
        tsSR[i] = ctlSR[b] + (ctlSR[c] - ctlSR[b]) * f;
        tsF[i] = f < 0.5 ? ctlF[b] : ctlF[c];
    }

    // ---- 2) cumulative arc length ----
    let total = 0;
    i = 1;
    while (i <= ns) {
        let j = i + 1;
        if (j > ns) { j = 1; }
        tsA[i] = total;
        let dx = tsX[j] - tsX[i];
        let dy = tsY[j] - tsY[i];
        let dz = tsZ[j] - tsZ[i];
        total = total + Math.sqrt(dx * dx + dy * dy + dz * dz);
        i = i + 1;
    }
    trkLen = total;
    segStep = total / NSEG;

    // ---- 3) resample to NSEG equal-arc-length rings ----
    let si = 1;
    i = 1;
    while (i <= NSEG) {
        let target = (i - 1) * segStep;
        while (si < ns) {
            if (tsA[si + 1] > target) { break; }
            si = si + 1;
        }
        let sn = si + 1;
        let aEnd = total;
        if (sn > ns) { sn = 1; } else { aEnd = tsA[sn]; }
        let seg = aEnd - tsA[si];
        let f = 0;
        if (seg > 0) { f = (target - tsA[si]) / seg; }
        sgX[i] = tsX[si] + (tsX[sn] - tsX[si]) * f;
        sgY[i] = tsY[si] + (tsY[sn] - tsY[si]) * f;
        sgZ[i] = tsZ[si] + (tsZ[sn] - tsZ[si]) * f;
        sgW[i] = tsW[si] + (tsW[sn] - tsW[si]) * f;
        sgGL[i] = tsGL[si] + (tsGL[sn] - tsGL[si]) * f;
        sgGR[i] = tsGR[si] + (tsGR[sn] - tsGR[si]) * f;
        // v4.2: the grass strip stops short of another part of the lap
        sgSL[i] = Math.min(tsSL[si], tsSL[sn]);
        sgSR[i] = Math.min(tsSR[si], tsSR[sn]);
        sgF[i] = tsF[si];
        sgArc[i] = target;
        sgLen[i] = segStep;
        i = i + 1;
    }
    sgX[NSEG + 1] = sgX[1]; sgY[NSEG + 1] = sgY[1]; sgZ[NSEG + 1] = sgZ[1];
    sgW[NSEG + 1] = sgW[1]; sgF[NSEG + 1] = sgF[1];
    sgGL[NSEG + 1] = sgGL[1]; sgGR[NSEG + 1] = sgGR[1];
    sgSL[NSEG + 1] = sgSL[1]; sgSR[NSEG + 1] = sgSR[1];
    sgArc[NSEG + 1] = total; sgLen[NSEG + 1] = segStep;

    // ---- 4) tangents, right normals, curvature, banking ----
    i = 1;
    while (i <= NSEG) {
        let j = i + 1;
        if (j > NSEG) { j = 1; }
        let p = i - 1;
        if (p < 1) { p = NSEG; }
        let dx = sgX[j] - sgX[p];
        let dz = sgZ[j] - sgZ[p];
        let L = Math.sqrt(dx * dx + dz * dz);
        if (L < 0.0001) { L = 0.0001; }
        sgDX[i] = dx / L;
        sgDZ[i] = dz / L;
        sgNX[i] = sgDZ[i];
        sgNZ[i] = 0 - sgDX[i];
        i = i + 1;
    }
    sgDX[NSEG + 1] = sgDX[1]; sgDZ[NSEG + 1] = sgDZ[1];
    sgNX[NSEG + 1] = sgNX[1]; sgNZ[NSEG + 1] = sgNZ[1];
    i = 1;
    while (i <= NSEG) {
        let j = i + 1;
        if (j > NSEG) { j = 1; }
        // component of the next tangent along this ring's right normal:
        // positive = the circuit turns right here
        let turn = sgDX[j] * sgNX[i] + sgDZ[j] * sgNZ[i];
        sgCurv[i] = turn / segStep;
        let bank = sgCurv[i] * 900;
        if (bank > 14) { bank = 14; }
        if (bank < 0 - 14) { bank = 0 - 14; }
        sgBank[i] = bank;
        i = i + 1;
    }
    sgCurv[NSEG + 1] = sgCurv[1]; sgBank[NSEG + 1] = sgBank[1];
    // v4.0: the tightest bend inside each ring's span, from the fine spline
    // samples. sgCurv is an average over two rings (30 m on the real Spa),
    // which reads a short hairpin as gentler than it is; the AI's corner
    // speeds use this instead.
    i = 1;
    while (i <= NSEG) { sgCurvA[i] = 0; i = i + 1; }
    let q = 2;
    while (q < ns) {
        let ax = tsX[q] - tsX[q - 1]; let az = tsZ[q] - tsZ[q - 1];
        let bx = tsX[q + 1] - tsX[q]; let bz = tsZ[q + 1] - tsZ[q];
        let la = Math.sqrt(ax * ax + az * az);
        let lb = Math.sqrt(bx * bx + bz * bz);
        if (la * lb > 0.0001) {
            let cr = (ax * bz - az * bx) / (la * lb);
            let k = Math.abs(cr) * 2 / (la + lb);
            let r = 1 + Math.floor(tsA[q] / segStep);
            if (r > NSEG) { r = NSEG; }
            if (k > sgCurvA[r]) { sgCurvA[r] = k; }
        }
        q = q + 1;
    }
    // never gentler than the average, and a spline wobble is not a hairpin
    i = 1;
    while (i <= NSEG) {
        let a = Math.abs(sgCurv[i]);
        let k = sgCurvA[i];
        if (k < a) { k = a; }
        if (k > a * 1.6 + 0.002) { k = a * 1.6 + 0.002; }
        sgCurvA[i] = k;
        i = i + 1;
    }
    sgCurvA[NSEG + 1] = sgCurvA[1];
    // smooth the banking so curbs/edges do not jitter
    i = 1;
    while (i <= NSEG) {
        let j = i + 1;
        if (j > NSEG) { j = 1; }
        let p = i - 1;
        if (p < 1) { p = NSEG; }
        tsA[i] = (sgBank[p] + 2 * sgBank[i] + sgBank[j]) / 4;
        i = i + 1;
    }
    i = 1;
    while (i <= NSEG) { sgBank[i] = tsA[i]; i = i + 1; }
    sgBank[NSEG + 1] = sgBank[1];

    // ---- 4b) derived per-segment flags, and jump ramps ----
    i = 1;
    while (i <= NSEG + 1) {
        let fl = sgF[i];
        sgTun[i] = mod(fl, 2) >= 1 ? 1 : 0;
        sgJmp[i] = mod(idiv(fl, 2), 2) >= 1 ? 1 : 0;
        sgHW[i] = 0;
        // v4.2: 32 a bridge deck (no grass beside it: its sides and underside
        // instead), 128 the road that passes under one
        sgBrg[i] = mod(idiv(fl, 32), 2);
        sgUnd[i] = mod(idiv(fl, 128), 2);
        // where the grass strip's outer edge sits (m from the road edge,
        // default a metre down): on the land at ULTRA, down an embankment (64)
        // at every level
        sgGA[i] = 0 - GRASSD;
        sgGB[i] = 0 - GRASSD;
        let land = 0;
        if (gfx > 2) { if (trkReal[curTrk] > 0) { land = 1; } }
        if (mod(idiv(fl, 64), 2) >= 1) { land = 1; }
        if (land > 0) { sgGA[i] = sgGL[i]; sgGB[i] = sgGR[i]; }
        if (sgTun[i] > 0) { sgHW[i] = 1; }
        if (mod(idiv(fl, 4), 2) >= 1) { sgHW[i] = 1; }
        i = i + 1;
    }
    // a jump run ramps up and then stops dead, so the car is thrown into the air
    i = 1;
    while (i <= NSEG) {
        if (sgJmp[i] > 0) {
            let p = i - 1;
            if (p < 1) { p = NSEG; }
            if (sgJmp[p] == 0) {
                let n = 0;
                while (n < 40) {
                    let q = mod(i - 1 + n, NSEG) + 1;
                    if (sgJmp[q] == 0) { break; }
                    n = n + 1;
                }
                let k = 0;
                while (k < n) {
                    let q = mod(i - 1 + k, NSEG) + 1;
                    sgY[q] = sgY[q] + JUMPH * (k + 1) / n;
                    k = k + 1;
                }
            }
        }
        i = i + 1;
    }
    sgY[NSEG + 1] = sgY[1];

    // ---- 4c) run-off: gravel traps / tarmac on the outside of corners ----
    // raw: what each corner wants on its outside (1 tarmac, 2 gravel)...
    i = 1;
    while (i <= NSEG) {
        tsX[i] = 0;
        tsY[i] = 0;
        let ac = sgCurv[i];
        if (ac < 0) { ac = 0 - ac; }
        if (runStyle > 0) {
            if (sgHW[i] < 1) {
                if (ac > 0.0035) {
                    let ty = 1;
                    if (runStyle == 1) { ty = 2; }
                    else if (runStyle == 3) { if (ac > 0.011) { ty = 2; } }
                    // turning right puts the outside on the left
                    if (sgCurv[i] > 0) { tsX[i] = ty; } else { tsY[i] = ty; }
                }
            }
        }
        i = i + 1;
    }
    // ...then spread from a little before the corner to well past its exit,
    // where the cars that ran wide end up
    i = 1;
    while (i <= NSEG + 1) {
        let tl = 0;
        let tr = 0;
        let k = 0 - 3;
        while (k <= 9) {
            let q = mod(i - 1 - k + NSEG, NSEG) + 1;
            if (tsX[q] > tl) { tl = tsX[q]; }
            if (tsY[q] > tr) { tr = tsY[q]; }
            k = k + 1;
        }
        if (sgHW[i] > 0) { tl = 0; tr = 0; }
        sgRTL[i] = tl;
        sgRTR[i] = tr;
        sgRWL[i] = tl == 2 ? RUNG : (tl == 1 ? RUNT : RUNV);
        sgRWR[i] = tr == 2 ? RUNG : (tr == 1 ? RUNT : RUNV);
        if (sgHW[i] > 0) { sgRWL[i] = 0; sgRWR[i] = 0; }
        // v4.2: nor may the run-off reach another part of the lap
        if (sgRWL[i] > sgSL[i] - 1) { sgRWL[i] = Math.max(0, sgSL[i] - 1); }
        if (sgRWR[i] > sgSR[i] - 1) { sgRWR[i] = Math.max(0, sgSR[i] - 1); }
        i = i + 1;
    }
    // v7 realistic: the pit lane down the left of the main straight
    buildPitLane();

    // ---- 5) vertex buffer + materials ----
    i = 1;
    while (i <= NSEG + 1) {
        let x = sgX[i]; let y = sgY[i]; let z = sgZ[i];
        let nx = sgNX[i]; let nz = sgNZ[i];
        let w = sgW[i];
        let bh = w * tand(sgBank[i]);
        let base = (i - 1) * PPR;
        let yL = y + bh;
        let yR = y - bh;
        // road edges
        wvX[base + P_L] = x - nx * w; wvY[base + P_L] = yL; wvZ[base + P_L] = z - nz * w;
        wvX[base + P_R] = x + nx * w; wvY[base + P_R] = yR; wvZ[base + P_R] = z + nz * w;
        // curb inner edges, lifted a touch so they read as a separate strip
        let cw = w - CURBW;
        let bc = cw * tand(sgBank[i]);
        wvX[base + P_CL] = x - nx * cw; wvY[base + P_CL] = y + bc + 0.06; wvZ[base + P_CL] = z - nz * cw;
        wvX[base + P_CR] = x + nx * cw; wvY[base + P_CR] = y - bc + 0.06; wvZ[base + P_CR] = z + nz * cw;
        // run-off outer edges, level with the road edge
        let ol = w + sgRWL[i];
        let orr = w + sgRWR[i];
        wvX[base + P_OL] = x - nx * ol; wvY[base + P_OL] = yL - 0.04; wvZ[base + P_OL] = z - nz * ol;
        wvX[base + P_OR] = x + nx * orr; wvY[base + P_OR] = yR - 0.04; wvZ[base + P_OR] = z + nz * orr;
        // grass skirt (v4.2: its outer edge on the land, sgGA/sgGB)
        // (v4.2: only as wide as it can go without reaching another part of
        // the lap; its drop scaled to what is left of it)
        let gwl = w + sgSL[i];
        let gwr = w + sgSR[i];
        wvX[base + P_GL] = x - nx * gwl; wvY[base + P_GL] = yL + (sgGA[i] + GRASSD) * sgSL[i] / GRASSW - GRASSD; wvZ[base + P_GL] = z - nz * gwl;
        wvX[base + P_GR] = x + nx * gwr; wvY[base + P_GR] = yR + (sgGB[i] + GRASSD) * sgSR[i] / GRASSW - GRASSD; wvZ[base + P_GR] = z + nz * gwr;
        // v4.2: on a bridge deck the 'skirt' points go under the road edges,
        // so the skirt quads become the deck's sides and the far-level skirt
        // quad its underside
        if (sgBrg[i] > 0) {
            wvX[base + P_GL] = wvX[base + P_L]; wvY[base + P_GL] = yL - 1.3; wvZ[base + P_GL] = wvZ[base + P_L];
            wvX[base + P_GR] = wvX[base + P_R]; wvY[base + P_GR] = yR - 1.3; wvZ[base + P_GR] = wvZ[base + P_R];
        }
        // wall / tunnel tops stand on the road edge
        let fl = sgF[i];
        let wh = WALLH;
        if (mod(fl, 2) >= 1) { wh = TUNH; }
        wvX[base + P_WL] = wvX[base + P_L]; wvY[base + P_WL] = yL + wh; wvZ[base + P_WL] = wvZ[base + P_L];
        wvX[base + P_WR] = wvX[base + P_R]; wvY[base + P_WR] = yR + wh; wvZ[base + P_WR] = wvZ[base + P_R];
        i = i + 1;
    }

    // v6: the renderer works in whole centimetres
    i = 1;
    while (i <= (NSEG + 1) * PPR) {
        wvX[i] = Math.round(wvX[i] * WU);
        wvY[i] = Math.round(wvY[i] * WU);
        wvZ[i] = Math.round(wvZ[i] * WU);
        i = i + 1;
    }

    // ---- 6) per-segment materials ----
    i = 1;
    while (i <= NSEG) {
        let j = i + 1;
        if (j > NSEG) { j = 1; }
        let p = i - 1;
        if (p < 1) { p = NSEG; }
        // banked right vector and sloped tangent -> surface normal
        let cb = cosd(sgBank[i]);
        let sb = sind(sgBank[i]);
        let rx = sgNX[i] * cb; let ry = 0 - sb; let rz = sgNZ[i] * cb;
        let ty = (sgY[j] - sgY[p]) / (2 * segStep);
        let tl = Math.sqrt(1 + ty * ty);
        let tx = sgDX[i] / tl; let tyn = ty / tl; let tz = sgDZ[i] / tl;
        let sx = tyn * rz - tz * ry;
        let sy = tz * rx - tx * rz;
        let sz = tx * ry - tyn * rx;
        shadeOf(sx, sy, sz);
        sgMat[i] = roadBase + oShade;
        // grass: flat, with a two-tone banding so it is not a dead sheet
        sgGMat[i] = gmatBase + (mod(i, 6) < 3 ? 6 : 7);
        // v4.2: a bridge deck's sides and underside are concrete
        if (sgBrg[i] > 0) { sgGMat[i] = M_deck + 3; }
        // run-off bands: striped gravel, painted tarmac, or just more grass
        sgRML[i] = sgGMat[i];
        sgRMR[i] = sgGMat[i];
        if (sgRTL[i] == 2) { sgRML[i] = M_grav0 + (mod(i, 4) < 2 ? 6 : 7); }
        else if (sgRTL[i] == 1) { sgRML[i] = M_runT0 + (mod(i, 8) < 4 ? 5 : 6); }
        if (sgRTR[i] == 2) { sgRMR[i] = M_grav0 + (mod(i, 4) < 2 ? 6 : 7); }
        else if (sgRTR[i] == 1) { sgRMR[i] = M_runT0 + (mod(i, 8) < 4 ? 5 : 6); }
        if (sgRTL[i] == 6) { sgRML[i] = roadBase + 4; }
        // curbs on anything tighter than a gentle bend
        let ac = sgCurv[i];
        if (ac < 0) { ac = 0 - ac; }
        if (ac > 0.0042) {
            sgCurb[i] = (mod(i, 4) < 2 ? M_curbA0 : M_curbB0) + 6;
        } else { sgCurb[i] = 0; }
        // walls: the left one faces +normal, the right one faces -normal
        shadeOf(sgNX[i], 0, sgNZ[i]);
        let ls = oShade;
        shadeOf(0 - sgNX[i], 0, 0 - sgNZ[i]);
        let rs = oShade;
        if (mod(sgF[i], 2) >= 1) {
            sgWMat[i] = M_tunnel0 + ls;
            sgCM[i] = M_tunnel0 + rs;
        } else {
            sgWMat[i] = M_wall0 + ls;
            sgCM[i] = M_wall0 + rs;
            // sponsor boards painted along the street barriers
            if (mod(i, 9) < 3) {
                let ad = M_ad + mod(idiv(i, 9), 5);
                sgWMat[i] = ad;
                sgCM[i] = M_ad + mod(idiv(i, 9) + 2, 5);
            }
        }
        i = i + 1;
    }
    sgMat[NSEG + 1] = sgMat[1]; sgGMat[NSEG + 1] = sgGMat[1]; sgCurb[NSEG + 1] = sgCurb[1];
    sgWMat[NSEG + 1] = sgWMat[1]; sgCM[NSEG + 1] = sgCM[1];
    sgRML[NSEG + 1] = sgRML[1]; sgRMR[NSEG + 1] = sgRMR[1];

    // ---- 7) checkpoints: markers placed in the editor, else even quarters ----
    nCP = 0;
    cpSeg[1] = 1;
    nCP = 1;
    i = 2;
    while (i <= NSEG) {
        if (nCP < NCPMAX) {
            if (mod(idiv(sgF[i], 16), 2) >= 1) {
                if (i - cpSeg[nCP] > 6) { nCP = nCP + 1; cpSeg[nCP] = i; }
            }
        }
        i = i + 1;
    }
    if (nCP < 2) {
        nCP = NCP;
        i = 1;
        while (i <= nCP) {
            cpSeg[i] = 1 + Math.round(NSEG * (i - 1) / nCP);
            i = i + 1;
        }
    }
    i = 1;
    while (i <= NSEG + 1) { sgGate[i] = 0; i = i + 1; }
    i = 2;
    while (i <= nCP) { sgGate[cpSeg[i]] = 1; i = i + 1; }

    // ---- 7b) DRS: the two longest straights, from a little after they
    //      begin to just before the braking zone at their end ----
    i = 1;
    while (i <= NSEG + 1) { sgDRS[i] = 0; sgGrid[i] = 0; i = i + 1; }
    let pass = 0;
    while (pass < 2) {
        // longest run of near-straight rings not yet claimed
        let bestS = 0;
        let bestN = 0;
        let s0 = 1;
        // start the scan just after a bend so no run is split by the lap line
        let q = 1;
        while (q <= NSEG) {
            let ac = sgCurv[q];
            if (ac < 0) { ac = 0 - ac; }
            if (ac > 0.004) { s0 = q; q = NSEG; }
            q = q + 1;
        }
        let run = 0;
        let runS = 0;
        q = 0;
        while (q <= NSEG) {
            let j = mod(s0 - 1 + q, NSEG) + 1;
            let ac = sgCurv[j];
            if (ac < 0) { ac = 0 - ac; }
            let ok = 0;
            if (ac < 0.0022) { if (sgDRS[j] < 1) { ok = 1; } }
            if (ok > 0) {
                if (run < 1) { runS = j; }
                run = run + 1;
            } else {
                if (run > bestN) { bestN = run; bestS = runS; }
                run = 0;
            }
            q = q + 1;
        }
        if (bestN * segStep > 360) {
            let a = 3;
            let e = bestN - Math.floor(70 / segStep);
            q = a;
            while (q < e) {
                sgDRS[mod(bestS - 1 + q, NSEG) + 1] = 1;
                q = q + 1;
            }
            // the activation line
            sgDRS[mod(bestS - 1 + a, NSEG) + 1] = 2;
        }
        pass = pass + 1;
    }
    // grid slots: rows of two, three rings apart, behind the line
    i = 0;
    while (i < 4) {
        sgGrid[mod(NSEG - 3 - i * 3 - 1, NSEG) + 1] = 1;
        i = i + 1;
    }

    // ---- 8) clear tyre marks ----
    i = 1;
    while (i <= NSEG + 1) { mkN[i] = 0; i = i + 1; }


    // ---- 9) minimap outline, fitted to the circuit's bounding box ----
    let mnX = sgX[1];
    let mxX = sgX[1];
    let mnZ = sgZ[1];
    let mxZ = sgZ[1];
    i = 2;
    while (i <= NSEG) {
        if (sgX[i] < mnX) { mnX = sgX[i]; }
        if (sgX[i] > mxX) { mxX = sgX[i]; }
        if (sgZ[i] < mnZ) { mnZ = sgZ[i]; }
        if (sgZ[i] > mxZ) { mxZ = sgZ[i]; }
        i = i + 1;
    }
    mmCx = (mnX + mxX) / 2;
    mmCz = (mnZ + mxZ) / 2;
    let sx = 2 * MMR / (mxX - mnX + 1);
    let sz = 2 * MMR / (mxZ - mnZ + 1);
    mmS = sx < sz ? sx : sz;
    i = 1;
    while (i <= NMM) {
        let s = 1 + Math.floor((i - 1) * NSEG / NMM);
        let px = MMX + (sgX[s] - mmCx) * mmS;
        let py = MMY + (sgZ[s] - mmCz) * mmS;
        mmLX[i] = px - sgNX[s] * MMW;
        mmLY[i] = py - sgNZ[s] * MMW;
        mmRX[i] = px + sgNX[s] * MMW;
        mmRY[i] = py + sgNZ[s] * MMW;
        i = i + 1;
    }

    // ---- 9b) v6 menu facts: DRS zones, elevation range, the 3D map ----
    drsN = 0;
    let mnY = sgY[1];
    let mxY = sgY[1];
    i = 1;
    while (i <= NSEG) {
        if (sgDRS[i] == 2) { drsN = drsN + 1; }
        if (sgY[i] < mnY) { mnY = sgY[i]; }
        if (sgY[i] > mxY) { mxY = sgY[i]; }
        i = i + 1;
    }
    trkElev = mxY - mnY;
    let half = (mxX - mnX) / 2;
    if ((mxZ - mnZ) / 2 > half) { half = (mxZ - mnZ) / 2; }
    let ms = 1 / (half + 1);
    // heights exaggerated, but never past a third of the map's size
    let ey = ms * 3;
    if (trkElev * ey > 0.34) { ey = 0.34 / (trkElev + 0.01); }
    mapTop = trkElev * ey + 0.001;
    i = 1;
    while (i <= NMAP) {
        let s = 1 + Math.floor((i - 1) * NSEG / NMAP);
        mpX[i] = (sgX[s] - mmCx) * ms;
        mpZ[i] = (sgZ[s] - mmCz) * ms;
        mpY[i] = (sgY[s] - mnY) * ey;
        mpNX[i] = sgNX[s];
        mpNZ[i] = sgNZ[s];
        i = i + 1;
    }

    // ---- 10) the racing line ----
    buildRacingLine();

    // ---- 11) scenery ----
    placeScenery(tk);
    // ---- 11b) v4.2 the land round the circuit ----
    loadLand(tk);

    // ---- 12) v7 trackside TV cameras for replays ----
    buildTvCams();
}

// ---- racing line -----------------------------------------------------
// A minimum-curvature line: each ring's lateral offset is pulled toward the
// straight line between its neighbours, again and again, inside the white
// lines. Wide neighbours first (the overall shape: out-in-out through each
// corner), then near ones (smoothing). rlO is the offset from the centreline.
function buildRacingLine() {
    let i = 1;
    while (i <= NSEG) { rlO[i] = 0; i = i + 1; }
    let pass = 0;
    while (pass < RLPASS) {
        let k = 6;
        if (pass > RLPASS * 0.45) { k = 3; }
        if (pass > RLPASS * 0.8) { k = 1; }
        i = 1;
        while (i <= NSEG) {
            let p = i - k;
            if (p < 1) { p = p + NSEG; }
            let q = i + k;
            if (q > NSEG) { q = q - NSEG; }
            let mx = (sgX[p] + sgNX[p] * rlO[p] + sgX[q] + sgNX[q] * rlO[q]) * 0.5;
            let mz = (sgZ[p] + sgNZ[p] * rlO[p] + sgZ[q] + sgNZ[q] * rlO[q]) * 0.5;
            let o = (mx - sgX[i]) * sgNX[i] + (mz - sgZ[i]) * sgNZ[i];
            let lim = sgW[i] - 1.5;
            if (o > lim) { o = lim; }
            if (o < 0 - lim) { o = 0 - lim; }
            rlO[i] = rlO[i] + (o - rlO[i]) * 0.8;
            i = i + 1;
        }
        pass = pass + 1;
    }
    rlO[NSEG + 1] = rlO[1];
    // curvature of the line itself, from the rings two either side
    i = 1;
    while (i <= NSEG) {
        let p = i - 2;
        if (p < 1) { p = p + NSEG; }
        let q = i + 2;
        if (q > NSEG) { q = q - NSEG; }
        let ax = sgX[p] + sgNX[p] * rlO[p]; let az = sgZ[p] + sgNZ[p] * rlO[p];
        let bx = sgX[i] + sgNX[i] * rlO[i]; let bz = sgZ[i] + sgNZ[i] * rlO[i];
        let cx = sgX[q] + sgNX[q] * rlO[q]; let cz = sgZ[q] + sgNZ[q] * rlO[q];
        // circle through three points: k = 2 sin(angle) / chord
        let ux = bx - ax; let uz = bz - az;
        let vx = cx - bx; let vz = cz - bz;
        let wx2 = cx - ax; let wz2 = cz - az;
        let cr = ux * vz - uz * vx;
        let la = Math.sqrt((ux * ux + uz * uz) * (vx * vx + vz * vz) * (wx2 * wx2 + wz2 * wz2));
        rlK[i] = 0;
        if (la > 0.001) { rlK[i] = 2 * Math.abs(cr) / la; }
        i = i + 1;
    }
}

// The speed the racing line can be driven at by a car of the given grip
// and top speed: corner speeds from the line's curvature, then braking
// zones worked backwards from every corner (twice round, for the wrap).
function speedProfile(grip, top) {
    let g0 = grip * wetK * GRIP0;
    let ga = grip * wetK * AERO;
    let i = 1;
    while (i <= NSEG) {
        let v = top;
        let kk = rlK[i];
        if (kk > ga + 0.00005) {
            let vc = Math.sqrt(g0 / (kk - ga));
            if (vc < v) { v = vc; }
        }
        rlV[i] = v;
        i = i + 1;
    }
    let dec = 2 * 20 * wetK * segStep;
    let n = 0;
    while (n < 2 * NSEG) {
        let j = NSEG - mod(n, NSEG);
        let q = j + 1;
        if (q > NSEG) { q = 1; }
        let vb = Math.sqrt(rlV[q] * rlV[q] + dec);
        if (vb < rlV[j]) { rlV[j] = vb; }
        n = n + 1;
    }
    rlV[NSEG + 1] = rlV[1];
}

// ---- scenery placement ------------------------------------------------
// Scattered once per circuit, deterministically, so a track always looks the
// same. Every object is filed under the segment it stands beside; the renderer
// then draws it with that segment's draw unit, which is what makes the
// painter's algorithm sort it against the road and the cars for free.
let scN = 0;
let scSeed = 1;

function scRnd() {
    scSeed = mod(scSeed * 1103515 + 12345, 8388608);
    oRnd = scSeed / 8388608;
}

// place one object `dist` metres out from the centreline of segment i
// v6: the object's footprint (its model's x/z box, scaled and turned) is then
// checked against the whole circuit - its own corner and any other part of
// the lap that passes close by. One that reaches the road or its run-off is
// moved further out, and dropped if it still does not fit.
let scFace = 0;             // scPutFacing: turn it to face the road
let scCheck = 1;            // 0 for landmarks that stand over the track on purpose
let oClr = 0;
function scPut(i, side, dist, type, scale, matOff, lod) {
    oPut = 0;
    if (scN < NSCENE) {
        oPut = 1;
        scN = scN + 1;
        let nx = sgNX[i] * side;
        let nz = sgNZ[i] * side;
        scX[scN] = sgX[i] + nx * dist;
        scZ[scN] = sgZ[i] + nz * dist;
        scY[scN] = sgY[i] - GRASSD;
        scT[scN] = type;
        scK[scN] = scale;
        scKY[scN] = scale;
        scKZ[scN] = scale;
        scKR[scN] = scale;
        scM[scN] = matOff;
        scLod[scN] = lod;
        // stood square to the track by default
        scC[scN] = sgDZ[i];
        scS[scN] = sgDX[i];
        if (scFace > 0) {
            scC[scN] = 0 - sgNZ[i] * side;
            scS[scN] = 0 - sgNX[i] * side;
        }
        if (scCheck > 0) {
            scClear(scN);
            let tries = 0;
            let dd = dist;
            while (oClr < 0) {
                if (tries >= 3) { break; }
                dd = dd - oClr + 1.5;
                scX[scN] = sgX[i] + nx * dd;
                scZ[scN] = sgZ[i] + nz * dd;
                scClear(scN);
                tries = tries + 1;
            }
            if (oClr < 0) { scN = scN - 1; oPut = 0; }
        }
        if (oPut > 0) { scFile(i, scN); }
    }
}

// v4.3: file object o under ring i, remembering which side of the road it
// stands and how far out (scOf). A long object is filed under the ring at
// each end of the stretch it stands beside (scRa..scRb); the renderer draws
// it with whichever of the two is further from the camera, so the walls of
// the rings in between are painted over it, not under it. Each ring's list
// is kept farthest out first: seen from the road, an object further out is
// behind a nearer one. List nodes: scnO (object), scnN (next).
function scFile(i, o) {
    let off = (scX[o] - sgX[i]) * sgNX[i] + (scZ[o] - sgZ[i]) * sgNZ[i];
    scOf[o] = off;
    // the rings beside the ends of its footprint (model x/z box, turned)
    let t = scT[o];
    let hx = (gtX1[t] - gtX0[t]) * scK[o] / 2;
    let hz = (gtZ1[t] - gtZ0[t]) * scKZ[o] / 2;
    let ra = 0;
    let rb = 0;
    let c = 0;
    while (c < 4) {
        let ax = c < 2 ? hx : 0 - hx;
        let az = mod(c, 2) < 1 ? hz : 0 - hz;
        let px = scX[o] + ax * scC[o] + az * scS[o];
        let pz = scZ[o] - ax * scS[o] + az * scC[o];
        // along the road from ring i
        let u = ((px - sgX[i]) * sgDX[i] + (pz - sgZ[i]) * sgDZ[i]) / segStep;
        let r = Math.round(u);
        if (r > 12) { r = 12; }
        if (r < 0 - 12) { r = 0 - 12; }
        if (r < ra) { ra = r; }
        if (r > rb) { rb = r; }
        c = c + 1;
    }
    scRa[o] = mod(i - 1 + ra + NSEG, NSEG) + 1;
    scRb[o] = mod(i - 1 + rb + NSEG, NSEG) + 1;
    snLink(scRa[o], o);
    if (scRb[o] != scRa[o]) { snLink(scRb[o], o); }
}
function snLink(i, o) {
    snC = snC + 1;
    let n = snC;
    scnO[n] = o;
    let ao = Math.abs(scOf[o]);
    let p = 0;
    let q = scHead[i];
    while (q > 0) {
        if (Math.abs(scOf[scnO[q]]) < ao) { break; }
        p = q;
        q = scnN[q];
    }
    scnN[n] = q;
    if (p > 0) { scnN[p] = n; } else { scHead[i] = n; }
}
let snC = 0;

// same, but turned to face the road
function scPutFacing(i, side, dist, type, scale, matOff, lod) {
    scFace = 1;
    scPut(i, side, dist, type, scale, matOff, lod);
    scFace = 0;
}

// Clearance of object o from the circuit in metres (negative: it overlaps
// the road, the curbs or the run-off of some ring). Rings are tested against
// the footprint box in the object's own frame; a ring far away lets the scan
// skip ahead, since each ring is at most segStep closer than the last.
function scClear(o) {
    let t = scT[o];
    let k = scK[o];
    let kz = scKZ[o];
    let x0 = gtX0[t] * k; let x1 = gtX1[t] * k;
    let z0 = gtZ0[t] * kz; let z1 = gtZ1[t] * kz;
    let cy = scC[o]; let sy = scS[o];
    let px = scX[o]; let pz = scZ[o];
    oClr = 999;
    let j = 1;
    let h = 0;              // v4.0: close by, the road between the rings as well
    while (j <= NSEG) {
        let jn = j + 1;
        if (jn > NSEG) { jn = 1; }
        let dx = sgX[j] + (sgX[jn] - sgX[j]) * h - px;
        let dz = sgZ[j] + (sgZ[jn] - sgZ[j]) * h - pz;
        let lx = cy * dx - sy * dz;
        let lz = sy * dx + cy * dz;
        let ex = 0;
        if (lx < x0) { ex = x0 - lx; } else if (lx > x1) { ex = lx - x1; }
        let ez = 0;
        if (lz < z0) { ez = z0 - lz; } else if (lz > z1) { ez = lz - z1; }
        let d = Math.sqrt(ex * ex + ez * ez);
        let need = sgW[j] + 0.8;
        if (sgHW[j] < 1) {
            // (the wider of the two rings' run-off: it widens between them)
            if ((px - sgX[j]) * sgNX[j] + (pz - sgZ[j]) * sgNZ[j] < 0) { need = need + Math.max(sgRWL[j], sgRWL[jn]); }
            else { need = need + Math.max(sgRWR[j], sgRWR[jn]); }
        }
        let m = d - need;
        if (m < oClr) { oClr = m; }
        let skip = Math.floor((d - 30) / segStep);
        if (skip < 1) {
            // close by: every quarter of the way to the next ring too
            if (h < 0.7) { h = h + 0.25; skip = 0; } else { h = 0; skip = 1; }
        } else { h = 0; }
        j = j + skip;
        if (oClr < 0) { j = NSEG + 1; }
    }
}

// the circuit's own named buildings, placed before anything else so they
// always fit: casino, hotel, yachts, Ferris wheel, towers, bridge...
function placeLandmarks(tk) {
    let k = lmOff[tk] + 1;
    let e = lmOff[tk] + lmCnt[tk];
    while (k <= e) {
        let i = 1 + Math.floor(lmU[k] * NSEG);
        if (i > NSEG) { i = NSEG; }
        let md = lmMode[k];
        // a landmark at distance 0 stands over the road on purpose (the
        // hotel on the tunnel, the gantry, the bridge)
        scCheck = 1;
        if (lmDist[k] < 1) { scCheck = 0; }
        if (md == 2) { scCheck = 0; }
        if (md == 1) { scPutFacing(i, lmSide[k], lmDist[k], lmType[k], lmK[k], lmMat[k], 0); }
        else { scPut(i, lmSide[k], lmDist[k], lmType[k], lmK[k], lmMat[k], 0); }
        scCheck = 1;
        if (oPut > 0) {
            scY[scN] = scY[scN] + lmDY[k];
            if (md == 2) { scC[scN] = cosd(lmYaw[k]); scS[scN] = sind(lmYaw[k]); }
        }
        k = k + 1;
    }
}

// one piece of the filler at distance d on the given side. v4.0: the eight
// circuits have their real surroundings; only the editor's circuit (an
// English airfield, theme 4) still gets the scatter: hedges, hospitality
// tents, a few trees and sheds.
function scFill(theme, i, side, d, roll, sc, near) {
    if (roll < 0.22) { scPutFacing(i, side, d, SC_HEDGE, 1.2, 0, 1); }
    else if (roll < 0.40) { scPut(i, side, d + 20, SC_TENT, sc * 1.3, 0, 1); }
    else if (roll < 0.58) { scPut(i, side, d + 20, SC_OAK, sc, 0, 1); }
    else if (roll < 0.64) { scPut(i, side, d + 60, SC_SHED, sc, 8, 0); }
}

// ---- v4.0: the real circuits' scenery ----------------------------------
// Built from the map (real/prep.mjs): every record is one object at its real
// place, filed under the ring it stands beside. Records carry a detail tier;
// LOW places tier 1, HIGH 1-2, ULTRA all. One that the check finds on the
// road (the map and the racing line are a few metres apart here and there)
// is walked straight away from the ring, or dropped.
let rsP = '';
function rsNum(k, n) {
    oD = 0;
    let i = 0;
    while (i < n) { oD = oD * 64 + indexOf(RSA, charAt(rsP, k + i)) - 1; i = i + 1; }
}
function placeReal(tk) {
    let c = rsOff[tk] + 1;
    let ce = rsOff[tk] + rsCh[tk];
    while (c <= ce) {
        rsP = rsD[c];
        let L = strlen(rsP);
        let k = 1;
        while (k < L) {
            rsNum(k + 20, 1);
            let fl = oD;
            if (mod(fl, 4) <= gfx) {
                if (scN < NSCENE) {
                    rsNum(k, 1);
                    let t = oD;
                    let q = gtQ[t];
                    rsNum(k + 1, 2);
                    let i = 1 + Math.floor(oD * NSEG / 4096);
                    if (i > NSEG) { i = NSEG; }
                    scN = scN + 1;
                    scT[scN] = t;
                    rsNum(k + 3, 3); scX[scN] = oD / 4 - 32768;
                    rsNum(k + 6, 3); scZ[scN] = oD / 4 - 32768;
                    rsNum(k + 9, 2); scY[scN] = sgY[i] - GRASSD + (oD - 2048) / 10;
                    rsNum(k + 11, 2);
                    let yaw = oD * 360 / 4096;
                    scC[scN] = cosd(yaw);
                    scS[scN] = sind(yaw);
                    rsNum(k + 13, 2); scK[scN] = oD * q;
                    rsNum(k + 15, 2); scKY[scN] = oD * q;
                    rsNum(k + 17, 2); scKZ[scN] = oD * q;
                    let kr = scK[scN];
                    if (scKY[scN] > kr) { kr = scKY[scN]; }
                    if (scKZ[scN] > kr) { kr = scKZ[scN]; }
                    scKR[scN] = kr;
                    rsNum(k + 19, 1); scM[scN] = oD;
                    scLod[scN] = gtLod[t];
                    oPut = 1;
                    if (idiv(fl, 4) > 0) {
                        scClear(scN);
                        let dx = scX[scN] - sgX[i];
                        let dz = scZ[scN] - sgZ[i];
                        let dl = Math.sqrt(dx * dx + dz * dz);
                        if (dl < 0.1) { dx = sgNX[i]; dz = sgNZ[i]; dl = 1; }
                        let tries = 0;
                        while (oClr < 0) {
                            if (tries >= 3) { break; }
                            let mv = 1.5 - oClr;
                            scX[scN] = scX[scN] + dx / dl * mv;
                            scZ[scN] = scZ[scN] + dz / dl * mv;
                            scClear(scN);
                            tries = tries + 1;
                        }
                        if (oClr < 0) { scN = scN - 1; oPut = 0; }
                    }
                    if (oPut > 0) { scFile(i, scN); }
                }
            }
            k = k + RSW;
        }
        c = c + 1;
    }
}

// ---- v4.2: the land round a real circuit ----------------------------------
// A height grid over the mapped area (real/prep.mjs: the real lie of the
// land, meeting the ground the lap runs on) and a land cover per cell. The
// cells in play at this graphics level (tier: 2 round the Suzuka crossover
// from HIGH, 3 everywhere on ULTRA) are grouped in 3 x 3 patches, each drawn
// as its own unit in the depth sort (render.js drawLand).
let tpN = 0;               // patches on this circuit
let tgNXc = 0;             // this circuit's grid: cells across, down, size, origin
let tgNZc = 0;
let tgCc = 0;
let tgX0c = 0;
let tgZ0c = 0;
function loadLand(tk) {
    tpN = 0;
    tgNXc = tgNX[tk];
    tgNZc = tgNZ[tk];
    tgCc = tgC[tk];
    tgX0c = tgX0[tk];
    tgZ0c = tgZ0[tk];
    let on = 0;
    if (gfx > 1) { if (tgNXc > 0) { on = 1; } }
    if (on > 0) {
        let nv = (tgNXc + 1) * (tgNZc + 1);
        let v = 0;
        let ch = 0 - 1;
        while (v < nv) {
            let cc = idiv(v, 1500);
            if (cc != ch) { ch = cc; rsP = tgHD[tgHO[tk] + cc + 1]; }
            rsNum(mod(v, 1500) * 2 + 1, 2);
            tgH[v + 1] = oD / 4 - 512;
            v = v + 1;
        }
        let nc = tgNXc * tgNZc;
        let q = 0;
        ch = 0 - 1;
        while (q < nc) {
            let cc = idiv(q, 3000);
            if (cc != ch) { ch = cc; rsP = tgCD[tgCO[tk] + cc + 1]; }
            rsNum(mod(q, 3000) + 1, 1);
            let k = oD;
            // in play at this level? then its colour: the land cover, lit by
            // the slope of the cell
            let kind = mod(k, 4);
            if (idiv(k, 4) > gfx) { kind = 0; }
            tgK[q + 1] = kind;
            if (kind > 0) {
                let ci = mod(q, tgNXc);
                let cj = idiv(q, tgNXc);
                let a = cj * (tgNXc + 1) + ci + 1;
                let h00 = tgH[a]; let h10 = tgH[a + 1];
                let h01 = tgH[a + tgNXc + 1]; let h11 = tgH[a + tgNXc + 2];
                let gx = (h10 + h11 - h00 - h01) / (2 * tgCc);
                let gz = (h01 + h11 - h00 - h10) / (2 * tgCc);
                let ln = Math.sqrt(gx * gx + 1 + gz * gz);
                shadeOf(0 - gx / ln, 1 / ln, 0 - gz / ln);
                let mb = gmatBase;
                if (kind == 2) { mb = M_forest; } else if (kind == 3) { mb = M_pave; }
                tgM[q + 1] = mb + oShade;
            }
            q = q + 1;
        }
        // the patches: every 3 x 3 block with a cell in play
        let pj = 0;
        while (pj < tgNZc) {
            let pi = 0;
            while (pi < tgNXc) {
                let n = 0;
                let ys = 0;
                let a = 0;
                while (a < 3) {
                    let b = 0;
                    while (b < 3) {
                        let ci = pi + b;
                        let cj = pj + a;
                        if (ci < tgNXc) { if (cj < tgNZc) {
                            if (tgK[cj * tgNXc + ci + 1] > 0) { n = n + 1; ys = ys + tgH[cj * (tgNXc + 1) + ci + 1]; }
                        } }
                        b = b + 1;
                    }
                    a = a + 1;
                }
                if (n > 0) {
                    if (tpN < NTP) {
                        tpN = tpN + 1;
                        tpI[tpN] = pi;
                        tpJ[tpN] = pj;
                        tpX[tpN] = tgX0c + (pi + 1.5) * tgCc;
                        tpZ[tpN] = tgZ0c + (pj + 1.5) * tgCc;
                        tpY[tpN] = ys / n;
                        tpF[tpN] = n == 9 ? 1 : 0;
                        let cm = (pj + 1) * tgNXc + pi + 2;
                        if (pj + 1 >= tgNZc) { cm = pj * tgNXc + pi + 1; }
                        tpM[tpN] = tgM[cm];
                    }
                }
                pi = pi + 3;
            }
            pj = pj + 3;
        }
    }
}

function placeScenery(tk) {
    scN = 0;
    scSeed = 4177 + tk * 9137;
    let i = 1;
    while (i <= NSEG + 1) { scHead[i] = 0; i = i + 1; }
    snC = 0;
    let theme = trkTheme[tk];
    let real = trkReal[tk];
    placeLandmarks(tk);
    if (real > 0) { placeReal(tk); }

    i = 1;
    while (i <= NSEG) {
        let w = sgW[i] + GRASSW;
        let street = sgHW[i];
        let tun = sgTun[i];
        let p = i - 2;
        if (p < 1) { p = p + NSEG; }
        if (sgTun[p] > 0) { tun = 1; }
        let q = mod(i + 1, NSEG) + 1;
        if (sgTun[q] > 0) { tun = 1; }
        let brg = mod(idiv(sgF[i], 32), 2);
        if (tun < 1) {
        if (brg < 1) {
        // --- tyre walls along the back of every gravel trap and run-off ---
        if (mod(i, 3) == 0) {
            if (sgRTL[i] > 0) { if (sgRTL[i] < 6) { scPutFacing(i, 0 - 1, sgW[i] + sgRWL[i] + 2.2, SC_TYRES, 1, 0, 1); } }
            if (sgRTR[i] > 0) { scPutFacing(i, 1, sgW[i] + sgRWR[i] + 2.2, SC_TYRES, 1, 0, 1); }
        }
        // --- sponsor hoardings on the inside of the quicker corners ---
        if (mod(i, 9) == 0) {
            scRnd();
            if (oRnd < 0.5) {
                if (street < 1) {
                    let sd = sgCurv[i] > 0 ? 1 : 0 - 1;
                    scPutFacing(i, 0 - sd, sgW[i] + 9, SC_BOARD, 1, 0, 1);
                }
            }
        }
        // --- the start/finish complex: pit garages down one side with race
        //     control over them, two-tier stands facing ---
        if (i < NSEG * 0.10) {
            if (mod(i, 7) == 3) { scPutFacing(i, 0 - 1, sgW[i] + 17, SC_PITS, 1, 0, 0); }
            if (mod(i, 12) == 5) { scPutFacing(i, 1, sgW[i] + 20, SC_STAND2, 1, 0, 0); }
            if (mod(i, 23) == 5) { scPut(i, 1, sgW[i] + 60, SC_MAST, 1, 0, 0); }
        } else if (i == 26) {
            scPutFacing(i, 0 - 1, sgW[i] + 44, SC_CTRL, 1, 0, 0);
        }
        // --- grandstands and terraces round the slow corners ---
        if (mod(i, 15) == 7) {
            let cv = sgCurv[i];
            if (cv < 0) { cv = 0 - cv; }
            let sd = sgCurv[i] > 0 ? 1 : 0 - 1;
            if (cv > 0.012) {
                scPutFacing(i, 0 - sd, sgW[i] + sgRWL[i] + sgRWR[i] + 14, SC_STAND, 0.9, 0, 0);
                scPutFacing(i, sd, sgW[i] + 18, SC_TERRACE, 0.9, 0, 0);
            } else if (cv > 0.005) {
                scPutFacing(i, sd, sgW[i] + 22, SC_TERRACE, 0.9, 0, 0);
            }
        }
        // --- the theme: close in on a street circuit, spread out on a park one
        //     (v4.0: a real circuit has its real surroundings instead) ---
        if (real < 1) {
        if (mod(i, 2) == 0) {
            scRnd();
            let side = oRnd < 0.5 ? 1 : 0 - 1;
            scRnd();
            let d = w * 0.62 + oRnd * 80;
            if (street > 0) { d = sgW[i] + 14 + oRnd * 22; }
            scRnd();
            let roll = oRnd;
            scRnd();
            let sc = 0.75 + oRnd * 0.7;
            scFill(theme, i, side, d, roll, sc, sgW[i] + 6);
        }
        // --- a second, further-out scatter fills the middle distance ---
        if (mod(i, 4) == 1) {
            scRnd();
            let side2 = oRnd < 0.5 ? 1 : 0 - 1;
            scRnd();
            let d2 = w * 1.1 + oRnd * 130;
            if (street > 0) { d2 = sgW[i] + 40 + oRnd * 70; }
            scRnd();
            let r2 = oRnd;
            scRnd();
            let s2 = 0.9 + oRnd * 0.8;
            scFill(theme, i, side2, d2, r2, s2, sgW[i] + 30);
        }
        // --- ULTRA: one more scatter between the other two ---
        if (gfDen[gfx] > 1) {
            if (mod(i, 2) == 1) {
                scRnd();
                let side3 = oRnd < 0.5 ? 1 : 0 - 1;
                scRnd();
                let d3 = w * 0.8 + oRnd * 110;
                if (street > 0) { d3 = sgW[i] + 24 + oRnd * 50; }
                scRnd();
                let r3 = oRnd;
                scRnd();
                let s3 = 0.8 + oRnd * 0.8;
                scFill(theme, i, side3, d3, r3, s3, sgW[i] + 12);
            }
        }
        }
        }
        }
        i = i + 1;
    }
}

// ---- surface sampling -------------------------------------------------
// Fills sfY (height), sfT (signed offset from the centreline, metres),
// sfSeg (segment index) and sfSurf (0 road, 1 curb, 2 grass, 3 off-world)
// for a world position, searching outward from a hint segment.
let sfY = 0;
let sfT = 0;
let sfSeg = 1;
let sfSurf = 0;
let sfU = 0;               // 0..1 along the segment
function sampleTrack(x, z, hint) {
    let best = hint;
    let bestD = 1e9;
    let k = 0 - 6;
    while (k <= 6) {
        let i = mod(hint - 1 + k, NSEG) + 1;
        let dx = x - sgX[i];
        let dz = z - sgZ[i];
        let d = dx * dx + dz * dz;
        if (d < bestD) { bestD = d; best = i; }
        k = k + 1;
    }
    // project onto the segment starting at `best`
    let dx = x - sgX[best];
    let dz = z - sgZ[best];
    let u = (dx * sgDX[best] + dz * sgDZ[best]) / segStep;
    if (u < 0) {
        best = mod(best - 2, NSEG) + 1;
        dx = x - sgX[best]; dz = z - sgZ[best];
        u = (dx * sgDX[best] + dz * sgDZ[best]) / segStep;
    }
    if (u > 1) {
        best = mod(best, NSEG) + 1;
        dx = x - sgX[best]; dz = z - sgZ[best];
        u = (dx * sgDX[best] + dz * sgDZ[best]) / segStep;
    }
    if (u < 0) { u = 0; }
    if (u > 1) { u = 1; }
    sfSeg = best;
    sfU = u;
    let nxt = best + 1;
    if (nxt > NSEG) { nxt = 1; }
    sfT = dx * sgNX[best] + dz * sgNZ[best];
    let w = sgW[best] + (sgW[nxt] - sgW[best]) * u;
    let y = sgY[best] + (sgY[nxt] - sgY[best]) * u;
    // banking tilts the surface across the track
    let bank = sgBank[best] + (sgBank[nxt] - sgBank[best]) * u;
    sfY = y - sfT * tand(bank);
    let at = sfT;
    if (at < 0) { at = 0 - at; }
    if (at <= w - CURBW) { sfSurf = 0; }
    else if (at <= w) { sfSurf = 1; }
    else {
        // 2 grass, 3 off the world, 4 gravel, 5 tarmac run-off
        let rw = sgRWL[best];
        let rt = sgRTL[best];
        if (sfT > 0) { rw = sgRWR[best]; rt = sgRTR[best]; }
        let edgeY = y - (sfT > 0 ? w : 0 - w) * tand(bank);
        if (at <= w + rw) {
            sfY = edgeY - 0.04;
            sfSurf = 2;
            if (rt == 2) { sfSurf = 4; } else if (rt == 1) { sfSurf = 5; } else if (rt == 6) { sfSurf = 6; }
        } else {
            sfSurf = 2;
            let drop = (at - w - rw) / 2;
            if (drop > 1) { drop = 1; }
            sfY = edgeY - 0.04 - (GRASSD - 0.04) * drop;
            // v4.2: the strip slopes on to the land (an embankment, a hillside)
            let ga = sfT > 0 ? sgGB[best] : sgGA[best];
            let tt = (at - w) / GRASSW;
            if (tt > 1) { tt = 1; }
            sfY = sfY + (ga + GRASSD) * tt;
            if (at > w + GRASSW) { sfSurf = 3; }
        }
    }
}

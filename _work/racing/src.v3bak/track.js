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
// Entry will not take a list of more than 5000 items, so the three fogged
// palettes live in three data lists and the one in use is copied into colTab.
function loadPalette(sk) {
    let i = 1;
    if (sk == 1) { while (i <= NMF) { colTab[i] = colA[i]; i = i + 1; } }
    else if (sk == 2) { while (i <= NMF) { colTab[i] = colB[i]; i = i + 1; } }
    else { while (i <= NMF) { colTab[i] = colC[i]; i = i + 1; } }
}
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

function buildTrack(tk) {
    curTrk = tk;
    let sk = tk;
    if (sk > NTRK) { sk = 1; }
    skyR = trkSkyR[tk]; skyG = trkSkyG[tk]; skyB = trkSkyB[tk];
    fogFar = trkFar[tk];
    loadPalette(sk);
    gmatBase = M_grass0;
    if (sk == 2) { gmatBase = M_dirt0; }
    else if (sk == 3) { gmatBase = M_dark0; }
    hillA = rgb(Math.round(skyR * 0.80 + 14), Math.round(skyG * 0.80 + 16), Math.round(skyB * 0.84 + 22));
    hillB = rgb(Math.round(skyR * 0.62 + 10), Math.round(skyG * 0.63 + 12), Math.round(skyB * 0.70 + 18));

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
        sgF[i] = tsF[si];
        sgArc[i] = target;
        sgLen[i] = segStep;
        i = i + 1;
    }
    sgX[NSEG + 1] = sgX[1]; sgY[NSEG + 1] = sgY[1]; sgZ[NSEG + 1] = sgZ[1];
    sgW[NSEG + 1] = sgW[1]; sgF[NSEG + 1] = sgF[1];
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
        // grass skirt
        let gw = w + GRASSW;
        wvX[base + P_GL] = x - nx * gw; wvY[base + P_GL] = yL - GRASSD; wvZ[base + P_GL] = z - nz * gw;
        wvX[base + P_GR] = x + nx * gw; wvY[base + P_GR] = yR - GRASSD; wvZ[base + P_GR] = z + nz * gw;
        // wall / tunnel tops stand on the road edge
        let fl = sgF[i];
        let wh = WALLH;
        if (mod(fl, 2) >= 1) { wh = TUNH; }
        wvX[base + P_WL] = wvX[base + P_L]; wvY[base + P_WL] = yL + wh; wvZ[base + P_WL] = wvZ[base + P_L];
        wvX[base + P_WR] = wvX[base + P_R]; wvY[base + P_WR] = yR + wh; wvZ[base + P_WR] = wvZ[base + P_R];
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
        sgMat[i] = M_road0 + oShade;
        // grass: flat, with a two-tone banding so it is not a dead sheet
        sgGMat[i] = gmatBase + (mod(i, 6) < 3 ? 6 : 7);
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
        }
        i = i + 1;
    }
    sgMat[NSEG + 1] = sgMat[1]; sgGMat[NSEG + 1] = sgGMat[1]; sgCurb[NSEG + 1] = sgCurb[1];
    sgWMat[NSEG + 1] = sgWMat[1]; sgCM[NSEG + 1] = sgCM[1];

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

    // ---- 10) scenery ----
    placeScenery(tk);
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
        scM[scN] = matOff;
        scLod[scN] = lod;
        // stood square to the track by default
        scC[scN] = sgDZ[i];
        scS[scN] = sgDX[i];
        scNext[scN] = scHead[i];
        scHead[i] = scN;
    }
}

// same, but turned to face the road
function scPutFacing(i, side, dist, type, scale, matOff, lod) {
    scPut(i, side, dist, type, scale, matOff, lod);
    if (oPut > 0) {
        scC[scN] = 0 - sgNZ[i] * side;
        scS[scN] = 0 - sgNX[i] * side;
    }
}

function placeScenery(tk) {
    scN = 0;
    scSeed = 4177 + tk * 9137;
    let i = 1;
    while (i <= NSEG + 1) { scHead[i] = 0; i = i + 1; }

    let theme = tk;
    if (theme > NTRK) { theme = 1; }

    i = 1;
    while (i <= NSEG) {
        let w = sgW[i] + GRASSW;
        let tun = sgTun[i];
        let p = i - 2;
        if (p < 1) { p = p + NSEG; }
        if (sgTun[p] > 0) { tun = 1; }
        let q = mod(i + 1, NSEG) + 1;
        if (sgTun[q] > 0) { tun = 1; }
        if (tun < 1) {
        // --- a line of hoardings along the inside of the quicker corners ---
        if (mod(i, 9) == 0) {
            scRnd();
            if (oRnd < 0.5) {
                let sd = sgCurv[i] > 0 ? 1 : 0 - 1;
                scPutFacing(i, 0 - sd, w * 0.54, SC_BOARD, 1, 0, 1);
            }
        }
        // --- the start/finish complex: a run of pit garages down the inside
        //     with race control over them, two-tier stands facing it ---
        if (i < NSEG * 0.13) {
            // the buildings are 52 m long, so spacing them just under that
            // joins them into a continuous pit lane
            if (mod(i, 6) == 3) { scPutFacing(i, 0 - 1, w * 0.50, SC_PITS, 1, 0, 0); }
            if (mod(i, 11) == 5) { scPutFacing(i, 1, w * 0.56, SC_STAND2, 1, 0, 0); }
            if (mod(i, 23) == 5) { scPut(i, 1, w * 0.56 + 46, SC_MAST, 1, 0, 0); }
        } else if (i == 22) {
            scPutFacing(i, 0 - 1, w * 0.50 + 32, SC_CTRL, 1, 0, 0);
        }
        // --- stands and open terraces around the slower corners ---
        if (mod(i, 13) == 7) {
            let cv = sgCurv[i];
            if (cv < 0) { cv = 0 - cv; }
            if (i > NSEG * 0.86) {
                scPutFacing(i, 0 - 1, w * 0.56, SC_STAND2, 1, 0, 0);
                scPutFacing(i, 1, w * 0.62, SC_TERRACE, 1.1, 0, 0);
            } else if (cv > 0.010) {
                let sd = sgCurv[i] > 0 ? 1 : 0 - 1;
                scPutFacing(i, sd, w * 0.60, SC_STAND, 0.9, 0, 0);
                scPutFacing(i, 0 - sd, w * 0.64, SC_TERRACE, 1, 0, 0);
            } else if (cv > 0.0045) {
                scPutFacing(i, 1, w * 0.64, SC_TERRACE, 0.9, 0, 0);
            }
        }
        // --- a control tower over each of the two biggest stands ---
        if (mod(i, 97) == 40) { scPutFacing(i, 0 - 1, w * 0.72, SC_CTRL, 0.8, 0, 0); }
        // --- the theme fill ---
        if (mod(i, 2) == 0) {
            scRnd();
            let side = oRnd < 0.5 ? 1 : 0 - 1;
            scRnd();
            let d = w * 0.72 + oRnd * 90;
            scRnd();
            let roll = oRnd;
            scRnd();
            let sc = 0.75 + oRnd * 0.7;
            if (theme == 1) {
                // parkland: broadleaf trees, hedges and the odd marquee
                if (roll < 0.62) { scPut(i, side, d, SC_OAK, sc, 0, 1); }
                else if (roll < 0.74) { scPut(i, side, d, SC_PINE, sc, 0, 1); }
                else if (roll < 0.83) { scPutFacing(i, side, w * 0.62, SC_HEDGE, 1, 0, 1); }
                else if (roll < 0.89) { scPut(i, side, d + 40, SC_SHED, sc, 4 * mod(i, 4), 0); }
                else if (roll < 0.93) { scPut(i, side, d, SC_TENT, sc, 0, 1); }
            } else if (theme == 2) {
                // canyon: rock outcrops and conifers, water in the valley floor
                if (roll < 0.46) { scPut(i, side, d, SC_ROCK, sc * 1.3, 0, 1); }
                else if (roll < 0.80) { scPut(i, side, d, SC_PINE, sc, 0, 1); }
                else if (roll < 0.84) { scPut(i, side, d + 30, SC_SHED, sc, 4, 0); }
            } else {
                // harbour: blocks of flats, masts and the dock water
                if (roll < 0.40) { scPut(i, side, d + 26, SC_TOWER, 0.8 + sc * 0.5, 4 * mod(i, 4), 0); }
                else if (roll < 0.62) { scPut(i, side, d + 14, SC_SHED, sc * 1.2, 4 * mod(i + 1, 4), 0); }
                else if (roll < 0.70) { scPut(i, side, d, SC_MAST, 1, 0, 0); }
                else if (roll < 0.78) { scPut(i, side, d, SC_OAK, sc * 0.8, 0, 1); }
            }
        }
        // --- a second, further-out scatter so the middle distance fills in ---
        if (mod(i, 5) == 1) {
            scRnd();
            let side2 = oRnd < 0.5 ? 1 : 0 - 1;
            scRnd();
            let d2 = w * 1.1 + oRnd * 140;
            scRnd();
            let r2 = oRnd;
            scRnd();
            let s2 = 0.9 + oRnd * 0.9;
            if (theme == 1) {
                if (r2 < 0.55) { scPut(i, side2, d2, SC_OAK, s2, 0, 1); }
                else if (r2 < 0.72) { scPut(i, side2, d2, SC_PINE, s2, 0, 1); }
                else if (r2 < 0.84) { scPut(i, side2, d2, SC_SHED, s2, 4 * mod(i, 4), 0); }
            } else if (theme == 2) {
                if (r2 < 0.50) { scPut(i, side2, d2, SC_PINE, s2, 0, 1); }
                else if (r2 < 0.86) { scPut(i, side2, d2, SC_ROCK, s2 * 1.5, 0, 1); }
            } else {
                if (r2 < 0.58) { scPut(i, side2, d2, SC_TOWER, 0.9 + s2 * 0.6, 4 * mod(i + 2, 4), 0); }
                else if (r2 < 0.80) { scPut(i, side2, d2, SC_SHED, s2 * 1.3, 4 * mod(i, 4), 0); }
            }
        }
        // --- water: a run of overlapping sheets down one flank. The sheets
        //     are wider than the spacing, so they read as one body of water ---
        if (mod(i, 6) == 3) {
            let u = i / NSEG;
            let wet = 0;
            if (theme == 1) { if (u > 0.62) { if (u < 0.84) { wet = 1; } } }
            else if (theme == 2) { if (u > 0.26) { if (u < 0.56) { wet = 1; } } }
            else { if (u > 0.50) { if (u < 0.96) { wet = 1; } } }
            if (wet > 0) {
                scPut(i, 0 - 1, w + 58, SC_WATER, 1, 0, 0);
                if (mod(i, 18) == 3) { scPutFacing(i, 0 - 1, w + 8, SC_HEDGE, 1.4, 0, 1); }
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
        sfSurf = 2;
        let drop = (at - w) / 2;
        if (drop > 1) { drop = 1; }
        let edgeY = y - (sfT > 0 ? w : 0 - w) * tand(bank);
        sfY = edgeY - GRASSD * drop;
        if (at > w + GRASSW) { sfSurf = 3; }
    }
}

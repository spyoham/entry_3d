// ============================================================
// replay.js - v3.1.0 the whole race and its highlights (v3.4.0: and the
// pause menu's last minute - the old 0.1 s x/y/z buffer went). It keeps the
// whole race, small: every RFDT s each car's place ON the track - how far round
// the lap (ring + fraction) and how far off the centre line - packed into
// one number
//   v = round(p * 100) * 1000 + round((off + 50) * 10),  p = ring - 1 + u
// (0: the car is not there). Played back, the place moves along the track
// and the car is set down on it, so even samples a second or two apart
// follow the corners. Two lists hold RFH samples of RPC cars each; when they
// are full every other sample goes and RFDT doubles (0.5 s: 9 min of race,
// 1 s: 18 min, 2 s: 36 min).
// During the race the moments worth seeing are written down (the start,
// the player passing or passed, a new leader, a car off the track, a
// retirement, the finishes), each with a weight; the highlights are the
// best HLMAX of them, in race order, each a few seconds round its moment.
// ============================================================
const HK_START = 1;
const HK_PASS = 2;          // the player passes car o
const HK_PASSED = 3;        // car o passes the player
const HK_LEAD = 4;          // car c takes the lead
const HK_OFF = 5;
const HK_DNF = 6;
const HK_FIN = 7;           // the player finishes
const HK_WIN = 8;           // car c wins

let rfN = 0;                // samples held
let rfDT = 0.5;             // seconds between them
let rfNext = 0;             // raceT of the next one
let rfT = 0;                // playback time (raceT)
let rpSrc = 0;              // what the replay plays: 0 the last minute (fx.js), 1 the whole race, 2 highlights
let rpSpd = 2;              // speed step (rpSpdV)
let hxN = 0;                // moments written down
let hxLead = 0;             // the leader, as last seen
let hxRk = 0;               // the player's place, as last seen
let hxPT = 0 - 9;           // raceT of the player's last pass
let hcN = 0;                // highlight clips
let hcK = 1;                // the clip playing
let oRF = 0;
let oRX = 0;
let oRZ = 0;
let oRP = 0;
let oRO = 0;
let oHC = BLANK;

function rfReset() {
    rfN = 0;
    rfDT = RFDT0;
    rfNext = 0;
    hxN = 0;
    hxLead = 0;
    hxRk = 0;
    hxPT = 0 - 9;
    let c = 1;
    while (c <= RPC) { hxOf[c] = 0; hxDn[c] = 0; c = c + 1; }
}

// item i of the two sample lists
function rfGet(i) { if (i <= RFH * RPC) { oRF = rfA[i]; } else { oRF = rfB[i - RFH * RPC]; } }
function rfPut(i, v) { if (i <= RFH * RPC) { rfA[i] = v; } else { rfB[i - RFH * RPC] = v; } }

// (stepRace) a sample when it is due, then the moments
function rfRec() {
    if (lightsOut > 0) {
        let rec = 0;
        if (raceState == ST_RACE) { rec = 1; }
        if (raceState == ST_DONE) { rec = 1; }
        if (rec > 0) {
            if (raceT >= rfNext) {
                if (rfN >= 2 * RFH) { rfHalve(); }
                let b = rfN * RPC;
                let c = 1;
                while (c <= RPC) {
                    let on = 0;
                    if (c <= nCars) { on = 1; }
                    if (c == GHOST) { if (scCar > 0) { on = 1; } }
                    let v = 0;
                    if (on > 0) {
                        // (from where the car is now: caSeg / caU / caOff are
                        // sampled before the last physics slice of the frame)
                        rfInv(caX[c], caZ[c], caSeg[c]);
                        let o = Math.max(0 - 49.8, Math.min(49.8, oRO));
                        v = Math.round((oRP - 1) * 100) * 1000 + Math.round((o + 50) * 10);
                    }
                    rfPut(b + c, v);
                    c = c + 1;
                }
                rfN = rfN + 1;
                rfNext = rfN * rfDT;
            }
            if (raceState == ST_RACE) { hxStep(); }
        }
    }
}
// full: keep every other sample, twice as far apart
function rfHalve() {
    let k = 1;
    while (k <= RFH) {
        let a = (k - 1) * RPC;
        let b = (2 * k - 2) * RPC;
        let c = 1;
        while (c <= RPC) { rfGet(b + c); rfPut(a + c, oRF); c = c + 1; }
        k = k + 1;
    }
    rfN = RFH;
    rfDT = rfDT * 2;
    rfNext = rfN * rfDT;
}

// the place on the road of the point x, z: ring oRP (+ fraction) and offset
// oRO such that ring point + chord * u + blended normal * offset is exactly
// x, z again (rfAt's way back). sampleTrack's u is a projection on the ring's
// own direction, a metre or more out on the outside of a bend, so u is
// refined from it: the point minus the ring point must lie along the normal.
function rfInv(x, z, hint) {
    sampleTrack(x, z, hint);
    let s = sfSeg;
    let s2 = mod(s, NSEG) + 1;
    let cx = sgX[s2] - sgX[s];
    let cz = sgZ[s2] - sgZ[s];
    let mx = sgNX[s2] - sgNX[s];
    let mz = sgNZ[s2] - sgNZ[s];
    let u = sfU;
    let it = 0;
    while (it < 3) {
        let dx = x - sgX[s] - cx * u;
        let dz = z - sgZ[s] - cz * u;
        let nx = sgNX[s] + mx * u;
        let nz = sgNZ[s] + mz * u;
        let cr = dx * nz - dz * nx;
        let dcr = (0 - cx) * nz + cz * nx + dx * mz - dz * mx;
        if (Math.abs(dcr) > 0.000001) { u = u - cr / dcr; }
        if (u < 0) { u = 0; }
        if (u > 0.9999) { u = 0.9999; }
        it = it + 1;
    }
    let dx2 = x - sgX[s] - cx * u;
    let dz2 = z - sgZ[s] - cz * u;
    let nx2 = sgNX[s] + mx * u;
    let nz2 = sgNZ[s] + mz * u;
    oRP = s + u;
    oRO = (dx2 * nx2 + dz2 * nz2) / (nx2 * nx2 + nz2 * nz2);
}

// car c's place at playback time t: oRX / oRZ, the ring progress oRP and
// offset oRO (oRF 0: not there)
function rfAt(c, t) {
    let fi = t / rfDT;
    if (fi < 0) { fi = 0; }
    let n = Math.floor(fi);
    let f = fi - n;
    if (n >= rfN - 1) { n = rfN - 1; f = 0; }
    rfGet(n * RPC + c);
    let v1 = oRF;
    let v2 = v1;
    if (n < rfN - 1) { rfGet((n + 1) * RPC + c); if (oRF > 0) { v2 = oRF; } }
    oRF = v1;
    if (v1 > 0) {
        let p1 = Math.floor(v1 / 1000) / 100;
        let o1 = (mod(v1, 1000) - 500) / 10;
        let p2 = Math.floor(v2 / 1000) / 100;
        let o2 = (mod(v2, 1000) - 500) / 10;
        let dp = p2 - p1;
        if (dp < 0 - NSEG / 2) { dp = dp + NSEG; }
        if (dp > NSEG / 2) { dp = dp - NSEG; }
        let p = p1 + dp * f;
        if (p >= NSEG) { p = p - NSEG; }
        if (p < 0) { p = p + NSEG; }
        oRP = p;
        oRO = o1 + (o2 - o1) * f;
        let sg = Math.floor(p) + 1;
        let u = p - (sg - 1);
        let s2 = mod(sg, NSEG) + 1;
        let nx = sgNX[sg] + (sgNX[s2] - sgNX[sg]) * u;
        let nz = sgNZ[sg] + (sgNZ[s2] - sgNZ[sg]) * u;
        oRX = sgX[sg] + (sgX[s2] - sgX[sg]) * u + nx * oRO;
        oRZ = sgZ[sg] + (sgZ[s2] - sgZ[sg]) * u + nz * oRO;
    }
}

// every car where it was at playback time t
function rfPose(t) {
    let c = 1;
    while (c <= RPC) {
        rfAt(c, t + 0.25);
        let ok2 = oRF;
        let x2 = oRX;
        let z2 = oRZ;
        rfAt(c, t);
        if (oRF > 0) {
            let x = oRX;
            let z = oRZ;
            let dx = x2 - x;
            let dz = z2 - z;
            let d = Math.sqrt(dx * dx + dz * dz);
            let sp = 0;
            if (ok2 > 0) { sp = d / 0.25; }
            if (d > 0.04) {
                atan2d(dx, dz);
                wrapAng(oAtan - caYaw[c]);
                caSteer[c] = Math.max(0 - 1, Math.min(1, oWrap * 0.3));
                caYaw[c] = oAtan;
            } else { caSteer[c] = 0; }
            caBrk[c] = sp < Math.abs(caSpd[c]) - 1.5 ? 1 : 0;
            caVX[c] = dx / 0.25;
            caVZ[c] = dz / 0.25;
            caSpd[c] = sp;
            caX[c] = x;
            caZ[c] = z;
            sampleTrack(x, z, Math.floor(oRP) + 1);
            caY[c] = sfY;
            caSeg[c] = sfSeg; caU[c] = sfU; caOff[c] = sfT;
            caRoll[c] = 0; caPitch[c] = 0;
            caFin[c] = 0;
        } else { caFin[c] = 9; }
        c = c + 1;
    }
    ghostOn = 0;
    scCar = 0;
    if (caFin[GHOST] < 1) { if (rpSC > 0) { scCar = 1; } else { ghostOn = 1; } }
}

// ---- the moments -----------------------------------------------------------------------
// write moment k of car c (o: the other car), weight w; a full list gives up
// its lightest moment for a heavier one
function hxAdd(k, c, o, w) {
    let i = 0;
    if (hxN < HLN) { hxN = hxN + 1; i = hxN; }
    else {
        let j = 1;
        let lw = w;
        while (j <= HLN) { if (hxW[j] < lw) { lw = hxW[j]; i = j; } j = j + 1; }
    }
    if (i > 0) {
        hxT[i] = raceT; hxK[i] = k; hxC[i] = c; hxO[i] = o; hxW[i] = w;
        hxL[i] = Math.max(1, Math.min(nLaps, caLap[c]));
    }
}
function hxStep() {
    if (hxN < 1) { hxAdd(HK_START, 1, 0, 9); }
    let c = 1;
    let lead = 0;
    while (c <= nCars) {
        if (caRank[c] == 1) { lead = c; }
        // off the track for over a second
        if (caOffT[c] > 1) { if (hxOf[c] < 1) { hxOf[c] = 1; hxAdd(HK_OFF, c, 0, c == 1 ? 5 : 2); } }
        else if (caOffT[c] <= 0) { hxOf[c] = 0; }
        if (caDNF[c] > 0) { if (hxDn[c] < 1) { hxDn[c] = 1; hxAdd(HK_DNF, c, 0, c == 1 ? 6 : 4); } }
        c = c + 1;
    }
    // (the start sorts itself out first)
    if (raceT > 6) {
        if (lead > 0) { if (hxLead > 0) { if (lead != hxLead) { hxAdd(HK_LEAD, lead, hxLead, 7); } } }
        if (nCars > 1) { if (hxRk > 0) { if (caRank[1] != hxRk) { if (caFin[1] < 1) { if (raceT - hxPT > 3) {
            // who is in the place the player left or took
            let o = 0;
            let k = 2;
            while (k <= nCars) { if (caRank[k] == hxRk) { o = k; } k = k + 1; }
            if (o > 0) {
                hxPT = raceT;
                if (caRank[1] < hxRk) { hxAdd(HK_PASS, 1, o, 6); } else { hxAdd(HK_PASSED, o, 1, 4); }
            }
        } } } } }
    }
    hxLead = lead;
    hxRk = caRank[1];
}
// (updateLap) a car finished
function hxFinish(c) {
    if (c == 1) { hxAdd(HK_FIN, 1, 0, 8); }
    if (caFin[c] == 1) { if (c != 1) { hxAdd(HK_WIN, c, 0, 8); } }
}

// the clips: the heaviest HLMAX moments in race order, each a window round
// its moment (overlapping ones merged); hcA..hcB s, car hcC, moment hcI
function hxClips() {
    let i = 1;
    while (i <= hxN) { hxU[i] = 0; i = i + 1; }
    // pick
    let n = 0;
    while (n < HLMAX) {
        let best = 0;
        let bw = 0 - 1;
        i = 1;
        while (i <= hxN) {
            if (hxU[i] < 1) { if (hxW[i] > bw) { bw = hxW[i]; best = i; } else if (hxW[i] == bw) { if (hxT[i] < hxT[best]) { best = i; } } }
            i = i + 1;
        }
        if (best < 1) { break; }
        hxU[best] = 1;
        n = n + 1;
    }
    // in race order
    let end = Math.max(0, (rfN - 1) * rfDT);
    hcN = 0;
    let last = 0 - 1;
    while (hcN < HLMAX) {
        let nx = 0;
        i = 1;
        while (i <= hxN) {
            if (hxU[i] == 1) { if (nx < 1) { nx = i; } else if (hxT[i] < hxT[nx]) { nx = i; } }
            i = i + 1;
        }
        if (nx < 1) { break; }
        hxU[nx] = 2;
        let a = hxT[nx] - 3;
        let b = hxT[nx] + 4;
        if (hxK[nx] == HK_START) { a = 0; b = 7; }
        if (hxK[nx] >= HK_FIN) { a = hxT[nx] - 5; b = hxT[nx] + 2; }
        a = Math.max(0, a);
        b = Math.min(end, b);
        if (b > a + 0.5) {
            if (hcN > 0) { if (a < last) {
                // overlaps the clip before: that one runs on
                hcB[hcN] = Math.max(hcB[hcN], b);
                last = hcB[hcN];
                a = 0 - 1;
            } }
            if (a >= 0) {
                hcN = hcN + 1;
                hcA[hcN] = a; hcB[hcN] = b; hcC[hcN] = hxC[nx]; hcI[hcN] = nx;
                last = b;
            }
        }
    }
}
// clip k's caption (oHC)
function hxCaption(k) {
    let i = hcI[k];
    let c = hxC[i];
    let o = hxO[i];
    let kd = hxK[i];
    let nm = drvName[c];
    if (netRace > 0) { netName(c); nm = oNm; }
    let on = BLANK;
    if (o > 0) { on = drvName[o]; if (netRace > 0) { netName(o); on = oNm; } }
    oHC = 'THE START';
    if (kd == HK_PASS) { oHC = str('YOU PASS ', on); }
    else if (kd == HK_PASSED) { oHC = str(nm, ' PASSES YOU'); }
    else if (kd == HK_LEAD) { oHC = str(nm, ' TAKES THE LEAD'); }
    else if (kd == HK_OFF) { oHC = str(c == 1 ? 'YOU GO' : str(nm, ' GOES'), ' OFF THE TRACK'); }
    else if (kd == HK_DNF) { oHC = str(c == 1 ? 'YOU RETIRE' : str(nm, ' RETIRES')); }
    else if (kd == HK_FIN) { oHC = str('YOU FINISH P', caFin[1] > 0 ? caFin[1] : finished); }
    else if (kd == HK_WIN) { oHC = str(nm, ' WINS'); }
    if (kd != HK_START) { oHC = str('LAP ', hxL[i], '   ', oHC); }
}

// ---- playing it ------------------------------------------------------------------------
// V on the results screen: the whole race; H: its highlights (the pause
// menu's V is still the last minute in detail)
function rfEnter(src) {
    if (rfN < 4) { setMsg('NOTHING TO REPLAY YET', 1.5); }
    else {
        if (src == 2) { hxClips(); }
        if (src == 2) { if (hcN < 1) { src = 1; } }
        rpSnap(1);
        rpPrev = raceState;
        rpGhost = ghostOn;
        rpSC = scCar;
        raceState = ST_REPLAY;
        rpSrc = src;
        rpSpd = 2;
        rpCam = 0;
        rpPause = 0;
        rpCar = 1;
        rfT = 0;
        hcK = 1;
        if (src == 2) { rfT = hcA[1]; rpCar = hcC[1]; }
        camCar = rpCar;
        rfPose(rfT);
        tvFind(caSeg[rpCar]);
    }
}
// the pause menu's V: the race so far from a minute ago
function rfLast() {
    rfEnter(1);
    if (raceState == ST_REPLAY) {
        rfT = Math.max(0, (rfN - 1) * rfDT - 60);
        rfPose(rfT);
        tvFind(caSeg[rpCar]);
    }
}
function rfStep() {
    if (actKey == 32) { rpPause = 1 - rpPause; }
    if (actKey == 37) { rpCar = mod(rpCar + nCars - 2, nCars) + 1; tvFind(caSeg[rpCar]); }
    if (actKey == 39) { rpCar = mod(rpCar, nCars) + 1; tvFind(caSeg[rpCar]); }
    if (actKey == 67) { rpCam = mod(rpCam + 1, 4); camYawS = caYaw[rpCar]; }
    if (actKey == 38) { rpSpd = Math.min(5, rpSpd + 1); }
    if (actKey == 40) { rpSpd = Math.max(1, rpSpd - 1); }
    if (actKey == 72) { if (rpSrc == 1) { hxClips(); if (hcN > 0) { rpSrc = 2; hcK = 1; rfT = hcA[1]; rpCar = hcC[1]; rpSpd = 2; tvFind(caSeg[rpCar]); } } else { rpSrc = 1; } }
    let end = (rfN - 1) * rfDT;
    if (rpPause < 1) {
        rfT = rfT + dt * rpSpdV[rpSpd];
        if (rpSrc == 2) {
            if (rfT > hcB[hcK]) {
                hcK = mod(hcK, hcN) + 1;
                rfT = hcA[hcK];
                rpCar = hcC[hcK];
                rfPose(rfT);
                tvFind(caSeg[rpCar]);
            }
        } else if (rfT > end) { rfT = 0; rfPose(0); tvFind(caSeg[rpCar]); }
    }
    rfPose(rfT);
}

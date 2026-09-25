// ============================================================
// game.js - race state machine, grid, start lights, checkpoints, laps,
// sectors and live delta, DRS, ranking, results, championship points,
// the time-trial ghost, player input and the chase / cockpit cameras.
// ============================================================
const ST_MENU = 0;
const ST_CARSEL = 1;
const ST_TRKSEL = 2;
const ST_RACE = 3;
const ST_COUNT = 4;
const ST_DONE = 5;
const ST_PAUSE = 6;
const ST_EDIT = 7;
const ST_STAND = 8;
const ST_QUALI = 9;         // v7: qualifying session (realistic)
const ST_QRES = 10;         // v7: qualifying results
const ST_REPLAY = 11;       // v7: replay with TV cameras (HIGH / ULTRA)
const ST_TUNE = 12;         // v8: the garage (upgrades and setup)
const ST_PROF = 13;         // v8: profile, records, achievements, ranking

const M_GP = 1;             // game modes
const M_CH = 2;
const M_TT = 3;
const M_PR = 4;             // v8: practice - alone, free driving, assists

const STEERIN = 2.4;        // player wheel speed, full locks per second
const STEEROUT = 3.8;       // ...when centring or reversing
let aiDiff = 3;             // 1..NDIFF, chosen from the main menu
let gMode = 1;              // M_GP / M_CH / M_TT
let lapSel = 2;             // index into lapOpt
let nLaps = 3;              // laps in this race
let chRound = 1;            // championship round (= circuit number)
let chDone = 0;             // points for this round already given
let raceState = 0;
let prevState = 0;
let menuSel = 0;
let selCar = 1;
let selTrk = 1;
let camMode = 0;
let camYawS = 0;
let camCar = 1;             // v7: the car the race cameras follow (replays follow others)
let camSeg = 1;             // v7: ring the renderer starts its scan from
let countT = 0;
let lightN = 0;             // start lights lit, 0..5
let lightsOut = 0;          // 1 once they have gone out
let lightsT = 0;            // how long the dark gantry stays on screen after
let lightHold = 0;          // random pause with all five lit
let raceT = 0;
let lapStart = 0;
let lastLap = 0 - 1;
let bestLap = 0 - 1;
let finished = 0;
let lapBad = 0;            // track limits broken this lap: it will not count
let limT = 0;              // how long the player has had all four wheels off
let finishPos = 0;
let banner = BLANK;
let bannerT = 0;
let msg = BLANK;
let msgT = 0;
let drsKey = 0;             // player is asking for DRS
// sectors: the lap split in three by ring number
let secCur = 0;             // sector the player is in (0 = not on a lap yet)
let secT0 = 0;
let secB1 = 1;
let secB2 = 1;
let secMsg = BLANK;         // "S2  31.402  -0.214", shown for a few seconds
let secMsgT = 0;
let secCol = 0;             // 1 purple (personal best), 2 yellow (slower)
let lastSegP = 0;
// ghost
let ghostOn = 0;
let grN = 0;                // samples recorded on this lap
let ghTrk = 0 - 1;          // circuit the best lap / ghost belong to
let towerT = 0;

function setBanner(t, secs) { banner = t; bannerT = secs; }
function setMsg(t, secs) { msg = t; msgT = secs; }

// ---- grid ---------------------------------------------------------------
// v7: split in three so qualifying can use the same pieces - carStats (what
// a car can do), placeCar (put it somewhere with a clean slate) and
// initCars (the whole grid, in qualifying order when there was qualifying).
function carStats(c, ct) {
    if (c == 1) {
        caAcc[c] = ctAcc[ct]; caTop[c] = ctTop[ct]; caGrip[c] = ctGrip[ct];
        caMass[c] = ctMass[ct]; caCol[c] = ctCol[ct]; caSkill[c] = 1; caLine[c] = 0;
        // v8: the garage's upgrades and setup
        tuneCar();
    } else {
        caAeroK[c] = 1; caBrkK[c] = 1; caBias[c] = 0; caSusp[c] = 0; caWearK[c] = 1;
        // opponents: a spread of top speed, grip and commitment, the whole
        // field scaled by the chosen difficulty; each in a team livery
        // other than the player's
        let k = c - 1;
        let dPow = aiPow[aiDiff];
        let dSkl = aiSkl[aiDiff];
        caAcc[c] = (15.0 + mod(k * 7, 5) * 0.55) * dPow;
        caTop[c] = (76 + mod(k * 5, 7) * 3.0) * dPow;
        caGrip[c] = (0.90 + mod(k * 3, 6) * 0.040) * dPow;
        caMass[c] = 1;
        let lv = k;
        if (lv >= ctCol[ct]) { lv = lv + 1; }
        caCol[c] = lv;
        caSkill[c] = (0.90 + mod(k * 11, 7) * 0.018) * dSkl;
        caLine[c] = (mod(k * 13, 5) - 2) * 0.8;
    }
}

function placeCar(c, seg, off) {
    caX[c] = sgX[seg] + sgNX[seg] * off;
    caZ[c] = sgZ[seg] + sgNZ[seg] * off;
    caY[c] = sgY[seg];
    atan2d(sgDX[seg], sgDZ[seg]);
    caYaw[c] = oAtan;
    caVX[c] = 0; caVZ[c] = 0; caVY[c] = 0; caYR[c] = 0;
    caSeg[c] = seg; caU[c] = 0; caOff[c] = off; caSurf[c] = 0; caAir[c] = 0;
    caLap[c] = 0; caCP[c] = nCP; caProg[c] = 0; caRank[c] = c;
    caThr[c] = 0; caBrk[c] = 0; caSteer[c] = 0; caHB[c] = 0;
    caRoll[c] = 0; caPitch[c] = 0; caDrift[c] = 0; caSpd[c] = 0;
    caFin[c] = 0; caOffT[c] = 0; caLapT[c] = 0; caBest[c] = 0 - 1; caStuck[c] = 0;
    caTow[c] = 0; caDRS[c] = 0; caDOk[c] = 0; caFinT[c] = 0; caGap[c] = 0;
    caHold[c] = 1;
    // v7 state
    caDmg[c] = 0; caWing[c] = 0; caErs[c] = 0.8; caErsH[c] = 0; caErsOn[c] = 0;
    caPit[c] = 0; caPitT[c] = 0; caPitN[c] = TY_M; caLim[c] = 0; caStops[c] = 0;
    caPen[c] = 0; caTL[c] = 0; caTLon[c] = 0; caYelT[c] = 0; caYelS[c] = 1;
    caMisT[c] = 0; caDefT[c] = 0 - 3; caDefO[c] = 0; caPace[c] = 1; caHeat[c] = 0;
    caBox[c] = mod(pitBox0 - 1 + c - 1, NSEG) + 1;
    caWK[c] = wetK;
    caTy[c] = TY_M; caWear[c] = 1; caWR[c] = 0;
    caAxF[c] = 0; caAxR[c] = 0; caWhT[c] = c * 0.012;
    let wb = (c - 1) * 4;
    let wk = 1;
    while (wk <= 4) { whW[wb + wk] = 1; whT[wb + wk] = tyTbl[TY_M]; whG[wb + wk] = 1; wk = wk + 1; }
    if (rules == R_SIM) {
        let t = TY_M;
        if (c == 1) { t = startTy; }
        else {
            if (mod(c, 2) == 0) { t = TY_S; }
            if (c == NCAR) { t = TY_H; }
            if (wetL > 0.57) { t = TY_W; } else if (wetL > 0.31) { t = TY_I; }
        }
        fitTyre(c, t);
    }
}

function initCars(ct) {
    let c = 1;
    while (c <= nCars) {
        // the player lines up sixth, the others fill the grid round them;
        // after qualifying everyone starts where they qualified
        let slot = c;
        if (gMode < M_TT) {
            if (qDone > 0) { slot = caGrid[c]; }
            else if (c == 1) { slot = 6; } else if (c <= 6) { slot = c - 1; }
        }
        let row = idiv(slot - 1, 2);
        let sd = mod(slot - 1, 2) < 1 ? 0 - 1 : 1;
        let seg = mod(NSEG - 3 - row * 3 - 1, NSEG) + 1;
        carStats(c, ct);
        placeCar(c, seg, sd * sgW[seg] * 0.40);
        c = c + 1;
    }
}

function setupRace(tk, ct) {
    buildTrack(tk);
    selTrk = tk;
    nLaps = lapOpt[lapSel];
    if (gMode >= M_TT) { nLaps = 999; }
    // expected lap, for tyre life, the weather plan and the time of day
    let gq = 1;
    if (rules == R_SIM) { gq = tyDry[TY_M]; }
    speedProfile(ctGrip[ct] * gq, ctTop[ct]);
    lapIdeal();
    estLap = oLap * 1.30;
    raceDur = estLap * Math.max(Math.min(nLaps, 20), 4);
    wxSetup();
    startTy = TY_M;
    if (wetL > 0.57) { startTy = TY_W; }
    pitNext = startTy;
    scOn = 0; scCar = 0; scUsed = 0; prevRank = 0; yelHere = 0;
    radio = BLANK; radioT = 0;
    qOn = 0;
    // a restart keeps the grid that was qualified for
    if (keepGrid < 1) {
        qDone = 0;
        if (rules == R_SIM) { if (gMode < M_TT) { qOn = 1; } }
    }
    // the ghost car wears the pale livery and never touches anything
    caCol[GHOST] = GHOST; caRoll[GHOST] = 0; caPitch[GHOST] = 0; caSteer[GHOST] = 0;
    caBrk[GHOST] = 0; caFin[GHOST] = 0;
    ghostOn = 0;
    grN = 0;
    // a time trial keeps its best lap, ghost and splits across restarts on
    // the same circuit; anything else starts clean
    let keep = 0;
    if (gMode >= M_TT) { if (ghTrk == tk) { keep = 1; } }
    if (keep < 1) {
        bestLap = 0 - 1;
        secBest[1] = 0; secBest[2] = 0; secBest[3] = 0;
    }
    ghTrk = tk;
    if (gMode < M_TT) { ghTrk = 0 - 1; }
    raceReset();
    todReset();
    if (qOn > 0) { beginQuali(ct); }
    else { startGrid(ct); }
}

// R: the same race again (after qualifying, from the same grid)
let keepGrid = 0;
function restartRace() {
    if (raceState != ST_QUALI) { keepGrid = qDone; }
    setupRace(selTrk, selCar);
    keepGrid = 0;
}

// timers, counters and particles every session starts from
function raceReset() {
    secB1 = 1 + Math.floor(NSEG / 3);
    secB2 = 1 + Math.floor(NSEG * 2 / 3);
    secCur = 0; secMsgT = 0; secMsg = BLANK; lastSegP = 0;
    driftScore = 0; driftCombo = 1; driftHold = 0;
    raceT = 0; lapStart = 0; lastLap = 0 - 1;
    finished = 0; finishPos = 0; shakeT = 0; shakeA = 0; lapBad = 0; limT = 0;
    chDone = 0;
    let k2 = 1;
    while (k2 <= NSMOKE) { smL[k2] = 0; k2 = k2 + 1; }
    smN = 0; smokeHead = 0;
    k2 = 1;
    while (k2 <= NSPK) { spL[k2] = 0; k2 = k2 + 1; }
    spN = 0;
    towerT = 0;
    camCar = 1;
    setBanner(BLANK, 0);
    setMsg(BLANK, 0);
}

// the grid and the start lights
function startGrid(ct) {
    nLaps = lapOpt[lapSel];
    nCars = NCAR;
    if (gMode >= M_TT) { nCars = 1; nLaps = 999; }
    if (qDone > 0) { raceReset(); }
    initCars(ct);
    tyreGrip(1);
    let gk = 1;
    if (rules == R_SIM) { gk = oTyG; }
    speedProfile(caGrip[1] * gk, caTop[1]);
    lightN = 0; lightsOut = 0; lightsT = 0; countT = 1.0;
    lightHold = rand(0.4, 1.9);
    raceState = ST_COUNT;
    camMode = 0;
    camYawS = caYaw[1];
    camX = caX[1]; camZ = caZ[1]; camY = caY[1] + 3;
    rpReset();
    // v8: this race's stats; the time trial's ghost; practice assists
    statsReset();
    ghostOn = 0;
    if (gMode == M_TT) { pickGhost(selTrk); }
    if (gMode == M_PR) { showLine = paSel < 3 ? 1 : 0; }
}

// ---- laps and checkpoints ----------------------------------------------
function updateLap(c) {
    // advance through the checkpoint ring; a car that cuts the course simply
    // never reaches the next checkpoint, so its lap does not count
    let guard = 0;
    while (guard < NCPMAX) {
        guard = guard + 1;
        let nx = mod(caCP[c], nCP) + 1;
        let d = mod(caSeg[c] - cpSeg[nx], NSEG);
        if (d > NSEG * 0.4) { break; }
        caCP[c] = nx;
        if (nx == 1) {
            caLap[c] = caLap[c] + 1;
            // v7: a new lap of ERS harvesting, and the AI's pace for this lap
            caErsH[c] = 0;
            if (c > 1) { caPace[c] = 1 - drvErr[c] * rand(0.0001, 0.012); }
            if (caLap[c] > 1) {
                let lt = raceT - caLapT[c];
                if (c == 1) {
                    lastLap = lt;
                    sectorDone(3);
                    if (lapBad > 0) { setMsg('LAP DELETED - TRACK LIMITS', 2.4); }
                    else {
                        let pb = 0;
                        if (bestLap < 0) { pb = 1; }
                        else if (lt < bestLap) { pb = 1; setMsg('NEW BEST LAP!', 2.2); }
                        if (pb > 0) {
                            bestLap = lt;
                            keepBestLap();
                        }
                        // v8: circuit best, its ghost, the ranking, lap XP
                        lapDone(lt);
                    }
                    lapBad = 0;
                }
                if (caBest[c] < 0) { caBest[c] = lt; }
                else if (lt < caBest[c]) { caBest[c] = lt; }
            }
            caLapT[c] = raceT;
            if (c == 1) {
                secCur = 1;
                secT0 = raceT;
                grN = 0;
                if (raceState == ST_QUALI) {
                    if (caLap[1] > QLAPS) { endQuali(); }
                    else if (caLap[1] == QLAPS) { setBanner('FINAL TIMED LAP', 1.4); }
                    else { setBanner('TIMED LAP', 1.2); }
                }
            }
            if (caLap[c] > nLaps) {
                if (caFin[c] == 0) {
                    finishPos = finishPos + 1;
                    caFin[c] = finishPos;
                    caFinT[c] = raceT;
                    if (c == 1) {
                        finished = caFin[c];
                        raceState = ST_DONE;
                        raceOver();
                        if (recRace[selTrk] <= 0) { recRace[selTrk] = raceT; }
                        else if (raceT < recRace[selTrk]) { recRace[selTrk] = raceT; }
                    }
                }
            } else if (c == 1) {
                if (caLap[c] > 1) {
                    if (raceState == ST_QUALI) { }
                    else if (caLap[c] == nLaps) { setBanner('FINAL LAP', 1.5); }
                    else { setBanner(str('LAP ', caLap[c]), 1.3); }
                }
            }
        }
    }
}

// a new personal best: its ring times become the reference for the live
// delta. (v8: the ghost is kept per circuit, see lapGhost)
function keepBestLap() {
    let i = 1;
    while (i <= NSEG) { bsT[i] = csT[i]; i = i + 1; }
    bsT[NSEG + 1] = bestLap;
}

// ---- sector splits and the live delta -----------------------------------
function sectorDone(k) {
    if (secCur == k) {
        let t = raceT - secT0;
        secT0 = raceT;
        secCol = 2;
        let d = 0;
        let have = 0;
        if (secBest[k] > 0) { have = 1; d = t - secBest[k]; }
        if (have < 1) { secCol = 1; }
        else if (d < 0) { secCol = 1; }
        if (secCol == 1) { if (lapBad < 1) { secBest[k] = t; } }
        fmtSec(t);
        let ts = oSec;
        if (have > 0) {
            fmtDelta(d);
            secMsg = str('S', k, '   ', ts, '   ', oSec);
        } else { secMsg = str('S', k, '   ', ts); }
        secMsgT = 3.0;
    }
}

function updateSectors() {
    let s = caSeg[1];
    if (secCur == 1) {
        if (s >= secB1) { if (s < secB1 + 40) { sectorDone(1); secCur = 2; } }
    } else if (secCur == 2) {
        if (s >= secB2) { if (s < secB2 + 40) { sectorDone(2); secCur = 3; } }
    }
    // the time into the lap at which each ring was first reached
    if (s != lastSegP) {
        lastSegP = s;
        if (caLap[1] >= 1) { csT[s] = raceT - caLapT[1]; }
    }
    if (secMsgT > 0) { secMsgT = secMsgT - dt; }
}

// ---- DRS ----------------------------------------------------------------
// Each zone decides once, on entry, whether a car may use it: within a
// second of the car ahead from the second lap on (always, in a time trial).
// The AI opens it at once; the player presses E. Braking shuts it.
function updateDRS() {
    let c = 1;
    while (c <= nCars) {
        let z = sgDRS[caSeg[c]];
        if (scOn > 0) { z = 0; }
        if (z < 1) { caDRS[c] = 0; caDOk[c] = 0; }
        else {
            if (caDOk[c] < 1) {
                caDOk[c] = 2;
                if (gMode >= M_TT) { caDOk[c] = 1; }
                else if (raceState == ST_RACE) {
                    if (caLap[c] >= 2) {
                        let r = caRank[c];
                        if (r > 1) {
                            let o = srtI[r - 1];
                            let v = Math.abs(caSpd[c]);
                            if (v < 15) { v = 15; }
                            let gap = (caProg[o] - caProg[c]) * segStep / v;
                            if (gap < 1.0) { caDOk[c] = 1; }
                        }
                    }
                }
            }
            if (caDOk[c] == 1) {
                if (c == 1) { if (drsKey > 0) { caDRS[c] = 1; } }
                else { caDRS[c] = 1; }
            }
            if (caBrk[c] > 0.1) { caDRS[c] = 0; if (c == 1) { caDOk[c] = 2; } }
        }
        c = c + 1;
    }
}

// ---- gearbox read-out: an 8-speed box, only for the HUD -----------------
function updateGear() {
    let v = Math.abs(caSpd[1]);
    let top = caTop[1];
    let g = 1;
    let vg = top * 0.34;
    while (g < 8) {
        if (v < vg * 0.97) { break; }
        g = g + 1;
        vg = top * (0.34 + 0.66 * (g - 1) / 7);
    }
    let rpm = 4200 + 7900 * v / vg;
    if (caHold[1] > 0) { rpm = 4200; if (key(87)) { rpm = 10400 + rand(0, 900); } if (key(38)) { rpm = 10400 + rand(0, 900); } }
    if (rpm > 12100) { rpm = 12100; }
    if (caSpd[1] < 0 - 0.5) { g = 0 - 1; }
    caGear[1] = g;
    caRpm[1] = rpm;
}

// ---- ghost --------------------------------------------------------------
// v8: every lap the player drives is sampled every GHDT seconds (x, z, yaw).
// A lap that beats the circuit's best is copied into that circuit's slot of
// pb* (lapGhost); a time trial races whichever ghost was chosen - the
// circuit best or the world record (profile.js) - loaded into gh*.
let ghN = 0;                // samples in the ghost being raced
let ghTime = 0;             // its lap time
function ghostRec() {
    if (caLap[1] >= 1) {
        let lt = raceT - caLapT[1];
        while (grN < NGH) {
            if (grN * GHDT > lt) { break; }
            grN = grN + 1;
            grX[grN] = caX[1]; grZ[grN] = caZ[1]; grW[grN] = caYaw[1];
        }
    }
}

// the lap just finished (time lt) is the circuit's new best: keep its ghost
let lgOk = 0;               // 1: this lap's ghost was kept
function lapGhost(tk, lt) {
    lgOk = 0;
    if (grN > 4) {
        if (grN <= PBN) {
            if ((grN + 1) * GHDT >= lt) {
                let b = (tk - 1) * PBN;
                let n = 1;
                while (n <= grN) { pbX[b + n] = grX[n]; pbZ[b + n] = grZ[n]; pbW[b + n] = grW[n]; n = n + 1; }
                pbN[tk] = grN;
                lgOk = 1;
                if (gMode == M_TT) { if (ghSel == 1) { loadPbGhost(tk); } }
            }
        }
    }
}

function loadPbGhost(tk) {
    ghN = pbN[tk];
    ghTime = recLap[tk];
    let b = (tk - 1) * PBN;
    let n = 1;
    while (n <= ghN) { ghX[n] = pbX[b + n]; ghZ[n] = pbZ[b + n]; ghW[n] = pbW[b + n]; n = n + 1; }
}

function updateGhost() {
    ghostOn = 0;
    if (caLap[1] >= 1) {
        if (ghN > 2) {
            let lt = raceT - caLapT[1];
            let fi = lt / GHDT;
            let n = Math.floor(fi) + 1;
            if (n < ghN) {
                let f = fi - (n - 1);
                let x = ghX[n] + (ghX[n + 1] - ghX[n]) * f;
                let z = ghZ[n] + (ghZ[n + 1] - ghZ[n]) * f;
                wrapAng(ghW[n + 1] - ghW[n]);
                caYaw[GHOST] = ghW[n] + oWrap * f;
                sampleTrack(x, z, caSeg[GHOST]);
                caX[GHOST] = x;
                caZ[GHOST] = z;
                caY[GHOST] = sfY;
                caSeg[GHOST] = sfSeg;
                ghostOn = 1;
            }
        }
    }
}

function updateRanks() {
    let c = 1;
    while (c <= nCars) {
        caProg[c] = caLap[c] * NSEG + caSeg[c] + caU[c];
        if (caFin[c] > 0) { caProg[c] = 100000 - caFin[c] * 1000; }
        srtI[c] = c;
        srtV[c] = caProg[c];
        c = c + 1;
    }
    let i = 2;
    while (i <= nCars) {
        let ki = srtI[i];
        let kv = srtV[i];
        let j = i - 1;
        while (j >= 1) {
            if (srtV[j] >= kv) { break; }
            srtI[j + 1] = srtI[j];
            srtV[j + 1] = srtV[j];
            j = j - 1;
        }
        srtI[j + 1] = ki;
        srtV[j + 1] = kv;
        i = i + 1;
    }
    i = 1;
    while (i <= nCars) { caRank[srtI[i]] = i; i = i + 1; }
}

// gap of each car to the leader, in seconds (estimated from the distance
// and the chaser's speed while running, exact once both have finished)
function updateGaps() {
    let lead = srtI[1];
    let i = 1;
    while (i <= nCars) {
        let o = srtI[i];
        if (caFin[o] > 0) { caGap[o] = caFinT[o] - caFinT[lead]; }
        else {
            let v = Math.abs(caSpd[o]);
            if (v < 20) { v = 20; }
            let dist = caProg[lead] - caProg[o];
            if (caFin[lead] > 0) { dist = (nLaps + 1) * NSEG + 1 - caProg[o]; }
            caGap[o] = dist * segStep / v;
            if (dist > NSEG) { caGap[o] = 0 - Math.floor(dist / NSEG); }
        }
        i = i + 1;
    }
    buildTower();
}

// ---- championship ---------------------------------------------------------
function awardPoints() {
    if (chDone < 1) {
        chDone = 1;
        classify();
        let i = 1;
        while (i <= nCars) {
            let o = clsI[i];
            chPts[o] = chPts[o] + ptsTab[i];
            i = i + 1;
        }
    }
    // standings order, most points first (a tie goes to the player)
    let c = 1;
    while (c <= NCAR) { chOrd[c] = c; c = c + 1; }
    let i2 = 2;
    while (i2 <= NCAR) {
        let ki = chOrd[i2];
        let j = i2 - 1;
        while (j >= 1) {
            if (chPts[chOrd[j]] >= chPts[ki]) { break; }
            chOrd[j + 1] = chOrd[j];
            j = j - 1;
        }
        chOrd[j + 1] = ki;
        i2 = i2 + 1;
    }
}

function startChampionship() {
    let c = 1;
    while (c <= NCAR + 1) { chPts[c] = 0; c = c + 1; }
    chRound = 1;
    setupRace(chRound, selCar);
}

// ---- off-track recovery -------------------------------------------------
function checkRecovery(c) {
    let offT = 0;
    if (caSurf[c] >= 2) { if (caSurf[c] != 5) { if (caSurf[c] != 6) { offT = 1; } } }
    if (offT > 0) { caOffT[c] = caOffT[c] + dt; } else { caOffT[c] = 0; }
    let far = Math.abs(caOff[c]) > sgW[caSeg[c]] + GRASSW - 2 ? 1 : 0;
    if (caOffT[c] > 3.6 || far > 0) {
        let s = caSeg[c];
        caX[c] = sgX[s];
        caZ[c] = sgZ[s];
        caY[c] = sgY[s];
        atan2d(sgDX[s], sgDZ[s]);
        caYaw[c] = oAtan;
        caVX[c] = sgDX[s] * 6;
        caVZ[c] = sgDZ[s] * 6;
        caVY[c] = 0; caYR[c] = 0; caAir[c] = 0; caOffT[c] = 0;
        if (c == 1) { setMsg('BACK ON TRACK', 1.4); addShake(3); }
    }
}

// ---- player input -------------------------------------------------------
function playerInput() {
    let th = 0;
    let br = 0;
    let st = 0;
    let hb = 0;
    if (key(87)) { th = 1; }
    if (key(38)) { th = 1; }
    if (key(83)) { br = 1; }
    if (key(40)) { br = 1; }
    if (key(65)) { st = st - 1; }
    if (key(37)) { st = st - 1; }
    if (key(68)) { st = st + 1; }
    if (key(39)) { st = st + 1; }
    if (key(32)) { hb = 1; }
    drsKey = 0;
    if (key(69)) { drsKey = 1; }
    // v7 realistic: SHIFT or Q holds the ERS boost on while there is charge
    let ers = 0;
    if (rules == R_SIM) { if (key(16)) { ers = 1; } if (key(81)) { ers = 1; } }
    if (caErs[1] <= 0) { ers = 0; }
    caErsOn[1] = ers;
    if (caErs[1] <= 0) { caErsOn[1] = 0; }
    let go = 0;
    if (raceState == ST_RACE) { go = 1; }
    if (raceState == ST_QUALI) { go = 1; }
    if (go < 1) { th = 0; st = 0; hb = 0; br = 0; caErsOn[1] = 0; }
    if (caPit[1] == 3) { th = 0; br = 0; }
    if (finished > 0) { th = 0; br = 1; }
    // The wheel is turned at a limited rate rather than jumping to full lock:
    // a tap is a small correction, a held key winds on lock over about half a
    // second, and letting go unwinds a little quicker.
    let d = st - caSteer[1];
    let rate = STEERIN;
    if (st == 0) { rate = STEEROUT; }
    else if (st * caSteer[1] < 0) { rate = STEEROUT; }
    let mx = rate * dt;
    if (d > mx) { d = mx; }
    if (d < 0 - mx) { d = 0 - mx; }
    caSteer[1] = caSteer[1] + d;
    caThr[1] = th;
    caBrk[1] = br;
    caHB[1] = hb;
    // v8 practice: the brake assist
    practiceAssist();
}

// ---- cameras ------------------------------------------------------------
// v7: every race camera follows camCar (the player, or whoever a replay is
// watching) instead of car 1.
function updateCam() {
    let c = camCar;
    camSeg = caSeg[c];
    let sp = Math.sqrt(caVX[c] * caVX[c] + caVZ[c] * caVZ[c]);
    let fovT = 70 + Math.min(1, sp / 62) * 24;
    camFov = camFov + (fovT - camFov) * (2.5 * dt / (1 + 2.5 * dt));
    let fx = sind(caYaw[c]);
    let fz = cosd(caYaw[c]);
    if (camMode == 1) {
        // cockpit: the driver's eye, just behind the halo strut
        camX = caX[c] - fx * 0.05;
        camY = caY[c] + 0.92;
        camZ = caZ[c] - fz * 0.05;
        camYaw = caYaw[c];
        // v2.6: the eye rides with the body, hills and banking included
        // (the camera's pitch is positive looking up, the car's nose-down)
        camPitch = 0 - 2.5 - caPitch[c] * 0.9;
        camRoll = caRoll[c] * 0.8;
    } else if (camMode == 3) {
        // T-cam: on the airbox, looking down the nose over the driver's head
        camX = caX[c] - fx * 0.35;
        camY = caY[c] + 1.30;
        camZ = caZ[c] - fz * 0.35;
        camYaw = caYaw[c];
        camPitch = 0 - 4.0 - caPitch[c] * 0.9;
        camRoll = caRoll[c] * 0.8;
    } else {
        // chase: trails the direction of travel so slides stay readable
        let dist = camMode == 2 ? 15.5 : 9.4;
        let hgt = camMode == 2 ? 6.2 : 3.4;
        let want = caYaw[c];
        if (sp > 3) {
            atan2d(caVX[c], caVZ[c]);
            wrapAng(oAtan - caYaw[c]);
            let sl = oWrap;
            if (sl > 60) { sl = 60; }
            if (sl < 0 - 60) { sl = 0 - 60; }
            want = caYaw[c] + sl * 0.5 * Math.min(1, sp / 14);
        }
        wrapAng(want - camYawS);
        camYawS = camYawS + oWrap * (3.2 * dt / (1 + 3.2 * dt));
        let gx = sind(camYawS);
        let gz = cosd(camYawS);
        let tx = caX[c] - gx * dist;
        let tz = caZ[c] - gz * dist;
        let ty = caY[c] + hgt;
        let k = 6.5 * dt / (1 + 6.5 * dt);
        camX = camX + (tx - camX) * k;
        camZ = camZ + (tz - camZ) * k;
        camY = camY + (ty - camY) * k;
        // never let the camera sink through the scenery
        sampleTrack(camX, camZ, caSeg[c]);
        if (camY < sfY + 1.1) { camY = sfY + 1.1; }
        let ax = caX[c] + gx * 7;
        let ay = caY[c] + 1.0;
        let az = caZ[c] + gz * 7;
        let dx = ax - camX;
        let dz = az - camZ;
        atan2d(dx, dz);
        camYaw = oAtan;
        atan2d(ay - camY, Math.sqrt(dx * dx + dz * dz));
        camPitch = oAtan;
        camRoll = caRoll[c] * 0.20;
    }
    // collision shake
    if (shakeT > 0) {
        shakeT = shakeT - dt;
        let a = shakeA * shakeT / 0.34;
        camYaw = camYaw + rand(0 - a, a) * 0.5;
        camPitch = camPitch + rand(0 - a, a) * 0.5;
        camRoll = camRoll + rand(0 - a, a) * 0.8;
        if (shakeT <= 0) { shakeA = 0; }
    }
}

// ---- one simulation step ------------------------------------------------
function stepRace() {
    // At a few frames a second a single Euler step would let a car cover more
    // than a whole segment, and a driver that only corrects once a frame would
    // be steering blind for twelve metres at a time. Both the driving and the
    // physics therefore run in slices of at most 55 ms; timing, scoring and
    // the camera stay on the frame clock.
    let full = dt;
    let sub = 1;
    if (full > 0.055) { sub = Math.ceil(full / 0.055); }
    if (sub > 6) { sub = 6; }
    dt = full / sub;
    let c = 2;
    while (c <= nCars) { aiPlan(c); c = c + 1; }
    if (scCar > 0) { aiPlan(GHOST); }
    dt = full;
    updateTow();
    updateDRS();
    dt = full / sub;
    let n = 1;
    while (n <= sub) {
        playerInput();
        c = 2;
        while (c <= nCars) { aiDrive(c); c = c + 1; }
        if (scCar > 0) { aiDrive(GHOST); }
        c = 1;
        while (c <= nCars) { carPhys(c); c = c + 1; }
        if (scCar > 0) { carPhys(GHOST); }
        carCollisions();
        n = n + 1;
    }
    dt = full;
    c = 1;
    while (c <= nCars) { checkRecovery(c); c = c + 1; }
    let timing = 0;
    if (raceState == ST_RACE) { timing = 1; }
    if (raceState == ST_QUALI) { timing = 1; }
    if (timing > 0) {
        raceT = raceT + dt;
        // track limits: all four wheels past the white line for more than a
        // moment, at racing speed, and this lap will not count
        let off = 0;
        if (caSurf[1] >= 2) { if (caSurf[1] != 6) { off = 1; } }
        if (off > 0) {
            if (Math.abs(caSpd[1]) > 14) { limT = limT + dt; }
        } else { limT = 0; }
        if (limT > 0.6) {
            if (lapBad < 1) {
                if (caLap[1] >= 1) { lapBad = 1; rsClean = 0; setMsg('TRACK LIMITS', 1.6); }
            }
        }
        c = 1;
        while (c <= nCars) { updateLap(c); c = c + 1; }
        scoreDrift();
        updateSectors();
    } else if (raceState == ST_DONE) {
        // the rest of the field still has to cross the line
        raceT = raceT + dt;
        c = 2;
        while (c <= nCars) { updateLap(c); c = c + 1; }
    }
    ghostRec();
    statsStep();
    if (gMode == M_TT) { updateGhost(); }
    updateRanks();
    if (rules == R_SIM) { simStep(); }
    towerT = towerT - dt;
    if (towerT <= 0) { towerT = 0.3; updateGaps(); }
    updateGear();
    if (lightsT > 0) { lightsT = lightsT - dt; }
    stepSmoke();
    fxStep();
    rpRec();
    updateCam();
}

// ---- start lights -------------------------------------------------------
// Five reds come on a second apart, hold for a random moment, and the race
// starts the instant they go out.
function stepCountdown() {
    let c0 = 1;
    while (c0 <= nCars) { caHold[c0] = 1; c0 = c0 + 1; }
    countT = countT - dt;
    if (countT <= 0) {
        if (lightN < 5) {
            lightN = lightN + 1;
            countT = 1.0;
            if (lightN == 5) { countT = lightHold; }
        } else {
            lightsOut = 1;
            lightsT = 1.4;
            raceState = ST_RACE;
            setBanner('GO!', 0.9);
            raceT = 0;
            let c = 1;
            while (c <= nCars) { caLapT[c] = 0; caHold[c] = 0; c = c + 1; }
        }
    }
}

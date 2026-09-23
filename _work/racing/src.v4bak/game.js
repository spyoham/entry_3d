// ============================================================
// game.js - race state machine, grid, checkpoints, laps, ranking, records,
// player input and the chase / cockpit cameras.
// ============================================================
const ST_MENU = 0;
const ST_CARSEL = 1;
const ST_TRKSEL = 2;
const ST_RACE = 3;
const ST_COUNT = 4;
const ST_DONE = 5;
const ST_PAUSE = 6;
const ST_EDIT = 7;

const STEERIN = 2.4;        // player wheel speed, full locks per second
const STEEROUT = 3.8;       // ...when centring or reversing
let aiDiff = 2;            // 1..NDIFF, chosen from the main menu
let raceState = 0;
let prevState = 0;
let menuSel = 0;
let selCar = 1;
let selTrk = 1;
let camMode = 0;
let camYawS = 0;
let countT = 0;
let countN = 4;
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

function setBanner(t, secs) { banner = t; bannerT = secs; }
function setMsg(t, secs) { msg = t; msgT = secs; }

// ---- grid ---------------------------------------------------------------
function setupRace(tk, ct) {
    buildTrack(tk);
    selTrk = tk;
    let c = 1;
    while (c <= nCars) {
        let row = idiv(c - 1, 2);
        let sd = mod(c - 1, 2) < 1 ? 0 - 1 : 1;
        let seg = mod(NSEG - 3 - row * 3 - 1, NSEG) + 1;
        let off = sd * sgW[seg] * 0.40;
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
        if (c == 1) {
            caAcc[c] = ctAcc[ct]; caTop[c] = ctTop[ct]; caGrip[c] = ctGrip[ct];
            caMass[c] = ctMass[ct]; caCol[c] = ctCol[ct]; caSkill[c] = 1; caLine[c] = 0;
        } else {
            // opponents: a spread of top speed, grip and commitment, the whole
            // field scaled by the chosen difficulty
            let k = c - 1;
            let dPow = aiPow[aiDiff];
            let dSkl = aiSkl[aiDiff];
            caAcc[c] = (15.0 + mod(k * 7, 5) * 0.55) * dPow;
            caTop[c] = (74 + mod(k * 5, 7) * 3.0) * dPow;
            caGrip[c] = (0.90 + mod(k * 3, 6) * 0.040) * dPow;
            caMass[c] = 1;
            caCol[c] = mod(k + 3, 8) + 1;
            caSkill[c] = (0.90 + mod(k * 11, 7) * 0.018) * dSkl;
            caLine[c] = (mod(k * 13, 5) - 2) * 0.8;
        }
        c = c + 1;
    }
    driftScore = 0; driftCombo = 1; driftHold = 0;
    raceT = 0; lapStart = 0; lastLap = 0 - 1; bestLap = 0 - 1;
    finished = 0; finishPos = 0; shakeT = 0; shakeA = 0; lapBad = 0; limT = 0;
    let k2 = 1;
    while (k2 <= NSMOKE) { smL[k2] = 0; k2 = k2 + 1; }
    smN = 0; smokeHead = 0;
    countN = 4; countT = 1.0;
    raceState = ST_COUNT;
    camMode = 0;
    camYawS = caYaw[1];
    camX = caX[1]; camZ = caZ[1]; camY = caY[1] + 3;
    setBanner(BLANK, 0);
    setMsg(BLANK, 0);
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
            if (caLap[c] > 1) {
                let lt = raceT - caLapT[c];
                if (c == 1) {
                    lastLap = lt;
                    if (lapBad > 0) { setMsg('LAP DELETED - TRACK LIMITS', 2.4); }
                    else if (bestLap < 0) { bestLap = lt; }
                    else if (lt < bestLap) { bestLap = lt; setMsg('NEW BEST LAP!', 2.2); }
                    if (lapBad < 1) {
                        if (recLap[selTrk] <= 0) { recLap[selTrk] = lt; }
                        else if (lt < recLap[selTrk]) { recLap[selTrk] = lt; setMsg('TRACK RECORD!', 2.6); }
                    }
                    lapBad = 0;
                }
                if (caBest[c] < 0) { caBest[c] = lt; }
                else if (lt < caBest[c]) { caBest[c] = lt; }
            }
            caLapT[c] = raceT;
            if (caLap[c] > LAPS) {
                if (caFin[c] == 0) {
                    finishPos = finishPos + 1;
                    caFin[c] = finishPos;
                    if (c == 1) {
                        finished = caFin[c];
                        raceState = ST_DONE;
                        if (recRace[selTrk] <= 0) { recRace[selTrk] = raceT; }
                        else if (raceT < recRace[selTrk]) { recRace[selTrk] = raceT; }
                    }
                }
            } else if (c == 1) {
                if (caLap[c] > 1) { setBanner(str('LAP ', caLap[c]), 1.3); }
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

// ---- off-track recovery -------------------------------------------------
function checkRecovery(c) {
    let offT = 0;
    if (caSurf[c] >= 2) { if (caSurf[c] != 5) { offT = 1; } }
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
    if (raceState != ST_RACE) { th = 0; st = 0; hb = 0; br = 0; }
    if (finished > 0) { th = 0; br = 1; }
    // The wheel is turned at a limited rate rather than jumping to full lock:
    // a tap is a small correction, a held key winds on lock over about half a
    // second, and letting go unwinds a little quicker. At the low frame rates
    // this runs at, the old exponential follow reached full lock in one frame.
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
}

// ---- cameras ------------------------------------------------------------
function updateCam() {
    let sp = Math.sqrt(caVX[1] * caVX[1] + caVZ[1] * caVZ[1]);
    let fovT = 70 + Math.min(1, sp / 62) * 24;
    camFov = camFov + (fovT - camFov) * (2.5 * dt / (1 + 2.5 * dt));
    let fx = sind(caYaw[1]);
    let fz = cosd(caYaw[1]);
    if (camMode == 1) {
        // cockpit: sits where the driver does and looks straight down the nose
        camX = caX[1] + fx * 0.15;
        camY = caY[1] + 1.12;
        camZ = caZ[1] + fz * 0.15;
        camYaw = caYaw[1];
        camPitch = 0 - 1.5 + caPitch[1] * 0.5;
        camRoll = caRoll[1] * 0.55 - sgBank[caSeg[1]] * 0.25;
    } else {
        // chase: trails the direction of travel so drifts stay readable
        let dist = camMode == 2 ? 15.5 : 10.6;
        let hgt = camMode == 2 ? 6.2 : 4.3;
        let want = caYaw[1];
        if (sp > 3) {
            atan2d(caVX[1], caVZ[1]);
            wrapAng(oAtan - caYaw[1]);
            let sl = oWrap;
            if (sl > 60) { sl = 60; }
            if (sl < 0 - 60) { sl = 0 - 60; }
            want = caYaw[1] + sl * 0.5 * Math.min(1, sp / 14);
        }
        wrapAng(want - camYawS);
        camYawS = camYawS + oWrap * (3.2 * dt / (1 + 3.2 * dt));
        let gx = sind(camYawS);
        let gz = cosd(camYawS);
        let tx = caX[1] - gx * dist;
        let tz = caZ[1] - gz * dist;
        let ty = caY[1] + hgt;
        let k = 6.5 * dt / (1 + 6.5 * dt);
        camX = camX + (tx - camX) * k;
        camZ = camZ + (tz - camZ) * k;
        camY = camY + (ty - camY) * k;
        // never let the camera sink through the scenery
        sampleTrack(camX, camZ, caSeg[1]);
        if (camY < sfY + 1.1) { camY = sfY + 1.1; }
        let ax = caX[1] + gx * 7;
        let ay = caY[1] + 1.1;
        let az = caZ[1] + gz * 7;
        let dx = ax - camX;
        let dz = az - camZ;
        atan2d(dx, dz);
        camYaw = oAtan;
        atan2d(ay - camY, Math.sqrt(dx * dx + dz * dz));
        camPitch = oAtan;
        camRoll = caRoll[1] * 0.20;
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
    let c = 1;
    c = 2;
    while (c <= nCars) { aiPlan(c); c = c + 1; }
    let n = 1;
    while (n <= sub) {
        playerInput();
        c = 2;
        while (c <= nCars) { aiDrive(c); c = c + 1; }
        c = 1;
        while (c <= nCars) { carPhys(c); c = c + 1; }
        carCollisions();
        n = n + 1;
    }
    dt = full;
    c = 1;
    while (c <= nCars) { checkRecovery(c); c = c + 1; }
    if (raceState == ST_RACE) {
        raceT = raceT + dt;
        // track limits: all four wheels past the white line for more than a
        // moment, at racing speed, and this lap will not count
        if (caSurf[1] >= 2) {
            if (Math.abs(caSpd[1]) > 14) { limT = limT + dt; }
        } else { limT = 0; }
        if (limT > 0.6) {
            if (lapBad < 1) {
                if (caLap[1] >= 1) { lapBad = 1; setMsg('TRACK LIMITS', 1.6); }
            }
        }
        c = 1;
        while (c <= nCars) { updateLap(c); c = c + 1; }
        scoreDrift();
    }
    updateRanks();
    stepSmoke();
    updateCam();
}

// ---- countdown ----------------------------------------------------------
function stepCountdown() {
    let c0 = 1;
    while (c0 <= nCars) { caHold[c0] = 1; c0 = c0 + 1; }
    countT = countT - dt;
    if (countT <= 0) {
        countN = countN - 1;
        countT = 1.0;
        if (countN <= 0) {
            raceState = ST_RACE;
            setBanner('GO!', 0.9);
            raceT = 0;
            let c = 1;
            while (c <= nCars) { caLapT[c] = 0; caHold[c] = 0; c = c + 1; }
        } else { setBanner(str(countN), 0.9); }
    }
}

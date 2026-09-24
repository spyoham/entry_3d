// ============================================================
// main.js - entry point: frame clock, menus, attract camera, dispatch.
// ============================================================
let actKey = 0;
let keyPrev = 0;
let attractT = 0;

function pollAction() {
    let k = 0;
    if (key(13)) { k = 13; }
    else if (key(27)) { k = 27; }
    else if (key(38)) { k = 38; }
    else if (key(40)) { k = 40; }
    else if (key(37)) { k = 37; }
    else if (key(39)) { k = 39; }
    else if (key(80)) { k = 80; }
    else if (key(82)) { k = 82; }
    else if (key(77)) { k = 77; }
    else if (key(67)) { k = 67; }
    else if (key(76)) { k = 76; }
    else if (key(84)) { k = 84; }
    else if (key(86)) { k = 86; }
    else if (key(32)) { k = 32; }
    actKey = 0;
    if (k != keyPrev) {
        keyPrev = k;
        actKey = k;
    }
}

// ---- attract / showroom cameras ----------------------------------------
// v6: the fly-over used to aim at a ring a whole number of segments ahead, so
// the view direction jumped a little every time the camera crossed a ring.
// Both the eye and the aim point now slide continuously along the spline, and
// the resulting yaw/pitch are eased, which also rounds off the kinks where
// the straight ring-to-ring pieces meet.
let mcYaw = 0;
let mcPitch = 0;
let mcInit = 0;
function menuCam() {
    attractT = attractT + dt * 3.4;
    let f = mod(attractT, NSEG);
    let s = Math.floor(f) + 1;
    let u = f - Math.floor(f);
    let s2 = mod(s, NSEG) + 1;
    let x = sgX[s] + (sgX[s2] - sgX[s]) * u;
    let y = sgY[s] + (sgY[s2] - sgY[s]) * u;
    let z = sgZ[s] + (sgZ[s2] - sgZ[s]) * u;
    let side = 10 * sind(gt * 9);
    let nx = sgNX[s] + (sgNX[s2] - sgNX[s]) * u;
    let nz = sgNZ[s] + (sgNZ[s2] - sgNZ[s]) * u;
    camX = x + nx * side;
    camY = y + 5.2 + 2 * sind(gt * 7);
    camZ = z + nz * side;
    let la = mod(s - 1 + 18, NSEG) + 1;
    let lb = mod(la, NSEG) + 1;
    let dx = sgX[la] + (sgX[lb] - sgX[la]) * u - camX;
    let dz = sgZ[la] + (sgZ[lb] - sgZ[la]) * u - camZ;
    let ly = sgY[la] + (sgY[lb] - sgY[la]) * u;
    atan2d(dx, dz);
    let ty = oAtan;
    atan2d(ly + 1.5 - camY, Math.sqrt(dx * dx + dz * dz));
    let tp = oAtan;
    if (mcInit < 1) { mcYaw = ty; mcPitch = tp; mcInit = 1; }
    let k = Math.min(1, dt * 2.5);
    mcYaw = mcYaw + (mod(ty - mcYaw + 540, 360) - 180) * k;
    mcPitch = mcPitch + (tp - mcPitch) * k;
    camYaw = mcYaw;
    camPitch = mcPitch;
    camRoll = 1.2 * sind(gt * 6);
    camFov = 78;
    caSeg[1] = s;
    camSeg = s;
}

// Showroom: the car turns on a turntable at the start line; the camera
// stands still at a three-quarter view and looks a little to the right of
// it, so the car sits in the left half beside the data panel.
function showroomCam() {
    nCars = 1;
    let s = 1;
    caX[1] = sgX[s];
    caZ[1] = sgZ[s];
    caY[1] = sgY[s];
    caSeg[1] = s;
    caU[1] = 0.5;
    caOff[1] = 0;
    caRoll[1] = 0;
    caPitch[1] = 0;
    caBrk[1] = 0;
    caFin[1] = 0;
    caSteer[1] = 0.35 * sind(gt * 35);
    caCol[1] = ctCol[selCar];
    atan2d(sgDX[s], sgDZ[s]);
    let base = oAtan;
    caYaw[1] = base + gt * 24;
    let a = base + 150;
    camX = caX[1] + sind(a) * 15.5;
    camZ = caZ[1] + cosd(a) * 15.5;
    camY = caY[1] + 3.8;
    atan2d(caX[1] - camX, caZ[1] - camZ);
    camYaw = oAtan + 11;
    atan2d(caY[1] + 0.2 - camY, 15.5);
    camPitch = oAtan;
    camRoll = 0;
    camFov = 52;
    camSeg = s;
    mcInit = 0;
}

// ---- menu wiring --------------------------------------------------------
function pickTrack(d) {
    selTrk = mod(selTrk - 1 + d, NTRK + (ctlCnt[EDTRK] >= 5 ? 1 : 0)) + 1;
    buildTrack(selTrk);
    attractT = 0;
    mcInit = 0;
}

// left / right on a menu line
function menuChange(d) {
    if (menuSel == 2) { gMode = mod(gMode - 1 + d + NMODE, NMODE) + 1; }
    else if (menuSel == 3) {
        rules = mod(rules - 1 + d + 2, 2) + 1;
        // changing weather needs the realistic rules
        if (rules == R_ARC) { if (wx > 2) { wx = 1; } }
        applyWeather();
        buildTrack(selTrk);
    }
    else if (menuSel == 4) { selCar = mod(selCar - 1 + d + NCARTYPE, NCARTYPE) + 1; }
    else if (menuSel == 5) { if (gMode != M_CH) { pickTrack(d); } }
    else if (menuSel == 6) { aiDiff = mod(aiDiff - 1 + d + NDIFF, NDIFF) + 1; }
    else if (menuSel == 7) { lapSel = mod(lapSel - 1 + d + NLAPO, NLAPO) + 1; }
    else if (menuSel == 8) {
        let nw = 2;
        if (rules == R_SIM) { nw = 3; }
        wx = mod(wx - 1 + d + nw, nw) + 1;
        applyWeather();
        buildTrack(selTrk);
    }
    else if (menuSel == 9) { gfx = mod(gfx - 1 + d + NGFX, NGFX) + 1; buildTrack(selTrk); }
    else if (menuSel == 10) { sndSel = mod(sndSel - 1 + d + 2, 2) + 1; }
}

// the menu's weather as the world shows it: arcade rain is a fixed 80 % grip;
// realistic grip comes from the tyres (rules.js), so wetK stays 1 there
function applyWeather() {
    wetK = 1;
    if (rules == R_ARC) { if (wx > 1) { wetK = 0.80; } }
    wetL = 0;
    if (wx == 2) { wetL = 1; }
    rainI = wetL;
    rainVis = wetL;
    wetVis = wetL;
}

function startRace() {
    if (gMode == M_CH) { startChampionship(); }
    else { restartRace(); }
}

function menuKeys() {
    if (actKey == 40) { menuSel = mod(menuSel, NMENU) + 1; }
    else if (actKey == 38) { menuSel = mod(menuSel + NMENU - 2, NMENU) + 1; }
    else if (actKey == 37) { menuChange(0 - 1); }
    else if (actKey == 39) { menuChange(1); }
    else if (actKey == 13) {
        if (menuSel == 1) { startRace(); }
        else if (menuSel == 4) { raceState = ST_CARSEL; }
        else if (menuSel == 5) { if (gMode != M_CH) { raceState = ST_TRKSEL; } }
        else if (menuSel == 11) { nCars = 0; raceState = ST_EDIT; edDirty = 1; shShow = 0; }
        else { menuChange(1); }
    }
}

function selKeys() {
    if (raceState == ST_CARSEL) {
        if (actKey == 37) { selCar = mod(selCar + NCARTYPE - 2, NCARTYPE) + 1; }
        else if (actKey == 39) { selCar = mod(selCar, NCARTYPE) + 1; }
        else if (actKey == 13) { raceState = ST_MENU; nCars = 0; }
        else if (actKey == 27) { raceState = ST_MENU; nCars = 0; }
    } else {
        if (actKey == 37) { pickTrack(0 - 1); }
        else if (actKey == 39) { pickTrack(1); }
        else if (actKey == 13) { raceState = ST_MENU; }
        else if (actKey == 27) { raceState = ST_MENU; }
    }
}

function raceKeys() {
    if (actKey == 67) { camMode = mod(camMode + 1, 4); }
    else if (actKey == 84) {
        // v7 realistic: T picks the tyre (fitted on the grid, else for the next stop)
        if (rules == R_SIM) {
            if (raceState == ST_COUNT) { fitTyre(1, mod(caTy[1], NTY) + 1); setMsg(str('START ON ', tyName[caTy[1]]), 1.2); }
            else { pitNext = mod(pitNext, NTY) + 1; setMsg(str('NEXT STOP: ', tyName[pitNext]), 1.2); }
        }
    }
    else if (actKey == 13) { if (raceState == ST_QUALI) { endQuali(); } }
    else if (actKey == 76) { showLine = 1 - showLine; setMsg(showLine > 0 ? 'RACING LINE ON' : 'RACING LINE OFF', 1.2); }
    else if (actKey == 80) { prevState = raceState; raceState = ST_PAUSE; drawPausePanel(); }
    else if (actKey == 82) { restartRace(); }
    else if (actKey == 27) { prevState = raceState; raceState = ST_PAUSE; drawPausePanel(); }
}

function toMenu() {
    nCars = 0;
    ghostOn = 0;
    scCar = 0;
    scOn = 0;
    raceState = ST_MENU;
    applyWeather();
    buildTrack(selTrk);
}

function initGame() {
    nCars = 0;
    edReset();
    selTrk = 1;
    selCar = 1;
    menuSel = 1;
    camFov = 78;
    hideAnswer();
    applyWeather();
    buildTrack(1);
    raceState = ST_MENU;
    setBanner(BLANK, 0);
    setMsg(BLANK, 0);
}

// The project timer is refreshed by a 60 Hz interval, so a frame can read no
// time passing at all and the next one twice as much, and past 60 fps most
// frames would read zero. The frame time is therefore an average of the raw
// readings, and the sim clock is pulled gently toward the real one so the
// average cannot drift.
let dtS = 0.05;
let simT = 0;
// tessvm sets $TESSVM to 1. Its clock advances a fixed 1/60 s per engine
// tick, so on a machine that cannot keep 60 ticks a second the whole game
// would run in slow motion. The real tick rate is counted against the wall
// clock's seconds and the frame time scaled up to match.
let $TESSVM = 0;
let rtSec = 0 - 1;
let rtN = 0;
let rtK = 1;
function realTimeScale() {
    rtN = rtN + 1;
    let sc = dateSec();
    if (sc != rtSec) {
        if (rtSec >= 0) {
            let want = 60 / rtN;
            if (want < 1) { want = 1; }
            if (want > 3) { want = 3; }
            rtK = rtK + (want - rtK) * 0.5;
        }
        rtSec = sc;
        rtN = 0;
    }
}
function frameClock() {
    let t = timer();
    let raw = t - lastT;
    lastT = t;
    if (raw < 0) { raw = 0; }
    if (raw > 0.5) { raw = 0.5; }
    dtS = dtS + (raw - dtS) * 0.2;
    dt = dtS + (t - simT - dtS) * 0.1;
    if (t - simT > 1.0) { simT = t - 0.3; }
    if ($TESSVM == 1) {
        // the tick clock is exact, so no drift correction: just rescale it
        realTimeScale();
        dt = dtS * rtK;
        simT = t - dt;
    }
    if (dt < 0.004) { dt = 0.004; }
    if (dt > 0.30) { dt = 0.30; }
    simT = simT + dt;
    gt = gt + dt;
}

// v7: the editor's own keys - K shows the share code, I loads one
let edKey2 = 0;
function editKeys() {
    let k = 0;
    if (key(75)) { k = 75; }
    else if (key(73)) { k = 73; }
    if (k != edKey2) {
        edKey2 = k;
        if (k == 75) {
            if (shShow > 0) { shShow = 0; } else { shEncode(); shShow = 1; }
        } else if (k == 73) { shImport(); }
    }
}

on('start', 'pen3', function () {
    hide();
    penSize(1);
    initGame();
    timerReset();
    timerStart();
    lastT = timer();
    simT = lastT;
    for (;;) {
        frameClock();
        pollAction();
        if (raceState == ST_EDIT) {
            if (actKey == 27) { toMenu(); }
            else if (actKey == 13) {
                if (ctlCnt[EDTRK] >= 5) { selTrk = EDTRK; if (gMode == M_CH) { gMode = M_GP; } setupRace(EDTRK, selCar); }
            } else {
                editKeys();
                if (shShow < 1) { edInput(); }
                drawEditor();
            }
        } else if (raceState == ST_MENU) {
            menuKeys();
            if (raceState == ST_MENU) { menuCam(); renderWorld(); }
            else if (raceState == ST_CARSEL) { showroomCam(); renderWorld(); }
        } else if (raceState == ST_CARSEL) {
            selKeys();
            if (raceState == ST_CARSEL) { showroomCam(); } else { menuCam(); }
            renderWorld();
        } else if (raceState == ST_TRKSEL) {
            selKeys();
            nCars = 0;
            menuCam();
            renderWorld();
        } else if (raceState == ST_PAUSE) {
            if (actKey == 80) { raceState = prevState; }
            else if (actKey == 27) { raceState = prevState; }
            else if (actKey == 82) { restartRace(); }
            else if (actKey == 77) { toMenu(); }
            else if (actKey == 86) { enterReplay(); }
        } else if (raceState == ST_REPLAY) {
            if (actKey == 13) { exitReplay(); }
            else if (actKey == 27) { exitReplay(); }
            else if (actKey == 86) { exitReplay(); }
            else {
                replayStep();
                renderWorld();
            }
        } else if (raceState == ST_QRES) {
            if (actKey == 13) { startGrid(selCar); }
            else { menuCam(); renderWorld(); }
        } else if (raceState == ST_DONE) {
            if (actKey == 13) {
                if (gMode == M_CH) { awardPoints(); raceState = ST_STAND; }
                else { toMenu(); }
            }
            else if (actKey == 82) { restartRace(); }
            else if (actKey == 86) { enterReplay(); }
            else { stepRace(); renderWorld(); }
        } else if (raceState == ST_STAND) {
            if (actKey == 13) {
                if (chRound < NTRK) { chRound = chRound + 1; setupRace(chRound, selCar); }
                else { toMenu(); }
            } else { stepRace(); renderWorld(); }
        } else {
            raceKeys();
            if (raceState == ST_COUNT) {
                stepCountdown();
                stepRace();
                renderWorld();
            } else if (raceState == ST_RACE) {
                stepRace();
                renderWorld();
            } else if (raceState == ST_QUALI) {
                stepRace();
                if (raceState == ST_QUALI) { renderWorld(); }
            }
        }
        engineSound();
        updateHud();
    }
});

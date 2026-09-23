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
    actKey = 0;
    if (k != keyPrev) {
        keyPrev = k;
        actKey = k;
    }
}

// ---- attract / showroom cameras ----------------------------------------
function menuCam() {
    attractT = attractT + dt * 6;
    let f = mod(attractT, NSEG);
    let s = Math.floor(f) + 1;
    let u = f - Math.floor(f);
    let s2 = mod(s, NSEG) + 1;
    let x = sgX[s] + (sgX[s2] - sgX[s]) * u;
    let y = sgY[s] + (sgY[s2] - sgY[s]) * u;
    let z = sgZ[s] + (sgZ[s2] - sgZ[s]) * u;
    let side = 10 * sind(gt * 20);
    camX = x + sgNX[s] * side;
    camY = y + 5.2 + 2 * sind(gt * 15);
    camZ = z + sgNZ[s] * side;
    let la = mod(s - 1 + 18, NSEG) + 1;
    let dx = sgX[la] - camX;
    let dz = sgZ[la] - camZ;
    atan2d(dx, dz);
    camYaw = oAtan;
    atan2d(sgY[la] + 1.5 - camY, Math.sqrt(dx * dx + dz * dz));
    camPitch = oAtan;
    camRoll = 1.6 * sind(gt * 10);
    camFov = 78;
    caSeg[1] = s;
}

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
    caCol[1] = ctCol[selCar];
    atan2d(sgDX[s], sgDZ[s]);
    caYaw[1] = oAtan;
    let a = gt * 22;
    camX = caX[1] + sind(a) * 8.5;
    camZ = caZ[1] + cosd(a) * 8.5;
    camY = caY[1] + 2.5;
    atan2d(caX[1] - camX, caZ[1] - camZ);
    camYaw = oAtan;
    atan2d(caY[1] + 0.65 - camY, 8.5);
    camPitch = oAtan;
    camRoll = 0;
    camFov = 58;
}

// ---- menu wiring --------------------------------------------------------
function pickTrack(d) {
    selTrk = mod(selTrk - 1 + d, NTRK + (ctlCnt[4] >= 5 ? 1 : 0)) + 1;
    buildTrack(selTrk);
    attractT = 0;
}

function menuKeys() {
    if (actKey == 40) { menuSel = mod(menuSel, 5) + 1; }
    else if (actKey == 38) { menuSel = mod(menuSel + 3, 5) + 1; }
    else if (actKey == 37) {
        if (menuSel == 2) { selCar = mod(selCar + NCARTYPE - 2, NCARTYPE) + 1; }
        else if (menuSel == 3) { pickTrack(0 - 1); }
        else if (menuSel == 4) { aiDiff = mod(aiDiff + NDIFF - 2, NDIFF) + 1; }
    } else if (actKey == 39) {
        if (menuSel == 2) { selCar = mod(selCar, NCARTYPE) + 1; }
        else if (menuSel == 3) { pickTrack(1); }
        else if (menuSel == 4) { aiDiff = mod(aiDiff, NDIFF) + 1; }
    } else if (actKey == 13) {
        if (menuSel == 1) { nCars = NCAR; setupRace(selTrk, selCar); }
        else if (menuSel == 2) { raceState = ST_CARSEL; }
        else if (menuSel == 3) { raceState = ST_TRKSEL; }
        else if (menuSel == 4) { aiDiff = mod(aiDiff, NDIFF) + 1; }
        else { nCars = 0; raceState = ST_EDIT; edDirty = 1; }
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
    if (actKey == 67) { camMode = mod(camMode + 1, 3); }
    else if (actKey == 80) { prevState = raceState; raceState = ST_PAUSE; }
    else if (actKey == 82) { nCars = NCAR; setupRace(selTrk, selCar); }
    else if (actKey == 27) { prevState = raceState; raceState = ST_PAUSE; }
}

function initGame() {
    nCars = 0;
    edReset();
    selTrk = 1;
    selCar = 1;
    menuSel = 1;
    camFov = 78;
    buildTrack(1);
    raceState = ST_MENU;
    setBanner(BLANK, 0);
    setMsg(BLANK, 0);
}

on('start', 'pen3', function () {
    hide();
    penSize(1);
    initGame();
    timerReset();
    timerStart();
    lastT = timer();
    for (;;) {
        let t = timer();
        dt = t - lastT;
        lastT = t;
        if (dt < 0.004) { dt = 0.004; }
        if (dt > 0.30) { dt = 0.30; }
        gt = gt + dt;
        pollAction();
        if (raceState == ST_EDIT) {
            if (actKey == 27) { raceState = ST_MENU; buildTrack(selTrk); }
            else if (actKey == 13) {
                if (ctlCnt[4] >= 5) { nCars = NCAR; selTrk = 4; setupRace(4, selCar); }
            } else {
                edInput();
                drawEditor();
            }
        } else if (raceState == ST_MENU) {
            menuKeys();
            if (raceState == ST_MENU) { menuCam(); renderWorld(); }
        } else if (raceState == ST_CARSEL) {
            selKeys();
            showroomCam();
            renderWorld();
        } else if (raceState == ST_TRKSEL) {
            selKeys();
            nCars = 0;
            menuCam();
            renderWorld();
        } else if (raceState == ST_PAUSE) {
            if (actKey == 80) { raceState = prevState; }
            else if (actKey == 27) { raceState = prevState; }
            else if (actKey == 82) { nCars = NCAR; setupRace(selTrk, selCar); }
            else if (actKey == 77) { nCars = 0; raceState = ST_MENU; buildTrack(selTrk); }
        } else if (raceState == ST_DONE) {
            if (actKey == 13) { nCars = 0; raceState = ST_MENU; buildTrack(selTrk); }
            else if (actKey == 82) { nCars = NCAR; setupRace(selTrk, selCar); }
            else { stepRace(); renderWorld(); }
        } else {
            raceKeys();
            if (raceState == ST_COUNT) {
                stepCountdown();
                stepRace();
                renderWorld();
            } else if (raceState == ST_RACE) {
                stepRace();
                renderWorld();
            }
        }
        updateHud();
    }
});

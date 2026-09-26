// ============================================================
// main.js - entry point: frame clock, menus, attract camera, dispatch.
// ============================================================
let actKey = 0;
let keyPrev = 0;
let attractT = 0;

// v3.2: a key that is already down when the work starts, or when a question
// (ask) has just been answered, is ignored until it has been let go once.
// Entry keeps its list of held keys across a stop and a new run, and misses
// the key coming back up when the browser never sends it (on a Mac, V while
// Cmd+V pastes a code): such a key used to be taken as a fresh press - the
// menu started a race by itself after a restart, or the load prompt came
// back after every other key. The first key down in the order below wins.
function keysStale() {
    let i = 1;
    while (i <= NPK) { pkSt[i] = 1; i = i + 1; }
    keyPrev = 0;
    edKey2 = 0;
}

function pollAction() {
    let k = 0;
    if (key(13)) { if (pkSt[1] < 1) { if (k == 0) { k = 13; } } } else { pkSt[1] = 0; }
    if (key(27)) { if (pkSt[2] < 1) { if (k == 0) { k = 27; } } } else { pkSt[2] = 0; }
    if (key(38)) { if (pkSt[3] < 1) { if (k == 0) { k = 38; } } } else { pkSt[3] = 0; }
    if (key(40)) { if (pkSt[4] < 1) { if (k == 0) { k = 40; } } } else { pkSt[4] = 0; }
    if (key(37)) { if (pkSt[5] < 1) { if (k == 0) { k = 37; } } } else { pkSt[5] = 0; }
    if (key(39)) { if (pkSt[6] < 1) { if (k == 0) { k = 39; } } } else { pkSt[6] = 0; }
    if (key(80)) { if (pkSt[7] < 1) { if (k == 0) { k = 80; } } } else { pkSt[7] = 0; }
    if (key(82)) { if (pkSt[8] < 1) { if (k == 0) { k = 82; } } } else { pkSt[8] = 0; }
    if (key(77)) { if (pkSt[9] < 1) { if (k == 0) { k = 77; } } } else { pkSt[9] = 0; }
    if (key(67)) { if (pkSt[10] < 1) { if (k == 0) { k = 67; } } } else { pkSt[10] = 0; }
    if (key(76)) { if (pkSt[11] < 1) { if (k == 0) { k = 76; } } } else { pkSt[11] = 0; }
    if (key(84)) { if (pkSt[12] < 1) { if (k == 0) { k = 84; } } } else { pkSt[12] = 0; }
    if (key(86)) { if (pkSt[13] < 1) { if (k == 0) { k = 86; } } } else { pkSt[13] = 0; }
    if (key(32)) { if (pkSt[14] < 1) { if (k == 0) { k = 32; } } } else { pkSt[14] = 0; }
    if (key(66)) { if (pkSt[15] < 1) { if (k == 0) { k = 66; } } } else { pkSt[15] = 0; }
    if (key(73)) { if (pkSt[16] < 1) { if (k == 0) { k = 73; } } } else { pkSt[16] = 0; }
    if (key(70)) { if (pkSt[17] < 1) { if (k == 0) { k = 70; } } } else { pkSt[17] = 0; }
    if (key(49)) { if (pkSt[18] < 1) { if (k == 0) { k = 49; } } } else { pkSt[18] = 0; }
    if (key(50)) { if (pkSt[19] < 1) { if (k == 0) { k = 50; } } } else { pkSt[19] = 0; }
    if (key(79)) { if (pkSt[22] < 1) { if (k == 0) { k = 79; } } } else { pkSt[22] = 0; }
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
// v8 rows: 1 start 2 mode 3 rules 4 car 5 tuning 6 circuit 7 ai 8 laps (ghost /
// assist when alone) 9 weather 10 graphics 11 sound 12 profile 13 editor
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
    else if (menuSel == 6) { if (gMode != M_CH) { pickTrack(d); } }
    else if (menuSel == 7) { aiDiff = mod(aiDiff - 1 + d + NDIFF, NDIFF) + 1; }
    else if (menuSel == 8) {
        if (gMode == M_TT) { ghSel = mod(ghSel - 1 + d + 3, 3) + 1; }
        else if (gMode == M_PR) { paSel = mod(paSel - 1 + d + 3, 3) + 1; }
        else { lapSel = mod(lapSel - 1 + d + NLAPO, NLAPO) + 1; }
    }
    else if (menuSel == 9) {
        let nw = 2;
        if (rules == R_SIM) { nw = 3; }
        wx = mod(wx - 1 + d + nw, nw) + 1;
        applyWeather();
        buildTrack(selTrk);
    }
    else if (menuSel == 10) {
        // (v6.0: 4 = AUTO, built as ULTRA)
        gfxSel = mod(gfxSel - 1 + d + NGFX + 1, NGFX + 1) + 1;
        gfx = gfxSel > NGFX ? NGFX : gfxSel;
        gfQ = 1;
        afCap = 1;
        buildTrack(selTrk);
    }
    else if (menuSel == 11) { sndSel = mod(sndSel - 1 + d + 2, 2) + 1; }
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

// v6.1: START shows a loading card first; the circuit is built for the race
// (and everything the renderer precomputes, see ringFast / hillPrep) two
// ticks later, with the card on screen instead of a frozen menu
let ldT = 0;
function startRace() {
    ldT = 0;
    raceState = ST_LOAD;
}
function doStartRace() {
    if (gMode == M_CH) { startChampionship(); }
    else { restartRace(); }
}

// v9: the menu in pages. Page 0 is the top level; RACE SETUP (1), CAR &
// GARAGE (2) and SETTINGS (3) open their own list with a BACK row. The rows
// hold item ids (the v8 row numbers, plus 20-22 for the categories and 23 for
// BACK), so menuSel is still the v8 item and everything keyed on it stays.
let mnPage = 0;
let mnRow = 1;
let mnN = 6;
let mnItem = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function mnAdd(k) { mnN = mnN + 1; mnItem[mnN] = k; }
function mnBuild() {
    mnN = 0;
    if (mnPage == 0) { mnAdd(1); mnAdd(20); mnAdd(21); mnAdd(12); mnAdd(22); mnAdd(13); }
    else if (mnPage == 1) { mnAdd(2); mnAdd(3); mnAdd(6); mnAdd(7); mnAdd(8); mnAdd(9); mnAdd(1); mnAdd(23); }
    else if (mnPage == 2) { mnAdd(4); mnAdd(5); mnAdd(23); }
    else { mnAdd(10); mnAdd(11); mnAdd(23); }
    if (mnRow > mnN) { mnRow = mnN; }
    if (mnRow < 1) { mnRow = 1; }
    menuSel = mnItem[mnRow];
}
function mnOpen(p) { mnPage = p; mnRow = 1; mnBuild(); }
function mnBack() {
    let p = mnPage;
    mnPage = 0;
    mnRow = 5;
    if (p == 1) { mnRow = 2; } else if (p == 2) { mnRow = 3; }
    mnBuild();
}

function menuKeys() {
    if (actKey == 40) { mnRow = mod(mnRow, mnN) + 1; menuSel = mnItem[mnRow]; }
    else if (actKey == 38) { mnRow = mod(mnRow + mnN - 2, mnN) + 1; menuSel = mnItem[mnRow]; }
    else if (actKey == 37) { menuChange(0 - 1); }
    else if (actKey == 39) { menuChange(1); }
    else if (actKey == 27) { if (mnPage > 0) { mnBack(); } }
    else if (actKey == 13) {
        if (menuSel == 1) { startRace(); }
        else if (menuSel == 20) { mnOpen(1); }
        else if (menuSel == 21) { mnOpen(2); }
        else if (menuSel == 22) { mnOpen(3); }
        else if (menuSel == 23) { mnBack(); }
        else if (menuSel == 4) { raceState = ST_CARSEL; }
        else if (menuSel == 5) { raceState = ST_TUNE; tuRow = 1; }
        else if (menuSel == 6) { if (gMode != M_CH) { raceState = ST_TRKSEL; } }
        else if (menuSel == 12) { raceState = ST_PROF; prTab = 1; rankAll(); countAch(); }
        else if (menuSel == 13) { nCars = 0; raceState = ST_EDIT; edDirty = 1; shShow = 0; }
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
            // (v3.0: or on the grid before the formation lap has taken it anywhere)
            let grid = 0;
            if (raceState == ST_COUNT) { grid = 1; }
            if (raceState == ST_FORM) { grid = 1; }
            if (caFormD[1] >= 5) { grid = 0; }
            if (grid > 0) { fitTyre(1, mod(caTy[1], NTY) + 1); setMsg(str('START ON ', tyName[caTy[1]]), 1.2); }
            else { pitNext = mod(pitNext, NTY) + 1; setMsg(str('NEXT STOP: ', tyName[pitNext]), 1.2); }
        }
    }
    else if (actKey == 73) {
        // v2.6 realistic: I opens / closes the tyre check
        if (rules == R_SIM) { whShow = 1 - whShow; }
    }
    else if (actKey == 70) { cockpitKey(70); }
    else if (actKey == 49) { cockpitKey(49); }
    else if (actKey == 50) { cockpitKey(50); }
    else if (actKey == 13) {
        if (raceState == ST_QUALI) { endQuali(); }
        else if (raceState == ST_FORM) { formSkip(); formEnd(); }
    }
    else if (actKey == 66) { if (gMode == M_PR) { backOnTrack(); } }
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
    mnPage = 0;
    mnRow = 1;
    mnBuild();
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
// v6.0 graphics AUTO: frames counted per clock second (the same in Entry and
// in tessvm, whose own clock runs on ticks). Two slow seconds in a row cut
// the distances a step; five quick ones give a little back, but never past a
// step that was too slow. Below the last step ULTRA's extras go (gfx 2).
let afSec = 0 - 1;
let afN = 0;
let afFps = 60;
let afBad = 0;
let afGood = 0;
let afCap = 1;
function gfAutoStep() {
    afN = afN + 1;
    let sc = dateSec();
    if (sc != afSec) {
        if (afSec >= 0) {
            afFps = afN;
            let racing = 0;
            if (raceState == ST_RACE) { racing = 1; } else if (raceState == ST_QUALI) { racing = 1; } else if (raceState == ST_FORM) { racing = 1; }
            if (gfxSel > 3) { if (racing > 0) {
                if (afFps < 48) { afBad = afBad + 1; afGood = 0; }
                else if (afFps >= 57) { afGood = afGood + 1; afBad = 0; }
                else { afBad = 0; afGood = 0; }
                if (afBad >= 2) {
                    afBad = 0;
                    if (gfQ <= 0.45) { gfx = 2; }
                    afCap = gfQ - 0.05;
                    gfQ = Math.max(0.45, Math.round((gfQ - 0.1) * 100) / 100);
                }
                if (afGood >= 5) {
                    afGood = 0;
                    if (gfQ < afCap) { gfQ = Math.min(afCap, Math.round((gfQ + 0.05) * 100) / 100); }
                    else if (afCap < 1) { afCap = Math.round((afCap + 0.05) * 100) / 100; }
                    if (gfQ >= 0.7) { gfx = NGFX; }
                }
            } }
        }
        afSec = sc;
        afN = 0;
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
    if (key(75)) { if (pkSt[20] < 1) { k = 75; } } else { pkSt[20] = 0; }
    if (key(73)) { if (pkSt[21] < 1) { if (k == 0) { k = 73; } } } else { pkSt[21] = 0; }
    if (k != edKey2) {
        edKey2 = k;
        if (k == 75) {
            if (shShow > 0) { shShow = 0; } else { shEncode(); shShow = 1; }
        } else if (k == 73) { shImport(); }
    }
}

on('start', 'pen3', function () {
    // v3.3: the zero-filled work buffers are made here, not stored in the work
    allocLists();
    hide();
    penSize(1);
    initGame();
    keysStale();
    timerReset();
    timerStart();
    lastT = timer();
    simT = lastT;
    for (;;) {
        frameClock();
        gfAutoStep();
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
            else if (raceState == ST_TUNE) { showroomCam(); renderWorld(); }
        } else if (raceState == ST_TUNE) {
            tuneKeys();
            if (raceState == ST_TUNE) { showroomCam(); } else { menuCam(); }
            renderWorld();
        } else if (raceState == ST_PROF) {
            profKeys();
            nCars = 0;
            menuCam();
            renderWorld();
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
            else if (actKey == 79) { photoEnter(); }
        } else if (raceState == ST_LOAD) {
            ldT = ldT + 1;
            drawLoad();
            if (ldT >= 2) { doStartRace(); }
        } else if (raceState == ST_PHOTO) {
            photoStep();
        } else if (raceState == ST_REPLAY) {
            if (actKey == 79) { photoEnter(); }
            else if (actKey == 13) { exitReplay(); }
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
                if (gMode == M_CH) {
                    awardPoints();
                    raceState = ST_STAND;
                    if (chRound >= NTRK) { if (chOrd[1] == 1) { unlock(14); } }
                }
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
            } else if (raceState == ST_FORM) {
                // v3.0: the formation lap
                formStep();
                stepRace();
                renderWorld();
            } else if (raceState == ST_QUALI) {
                stepRace();
                if (raceState == ST_QUALI) { renderWorld(); }
            }
        }
        engineSound();
        // v8: the saved game - loaded once the real-time variables have
        // arrived, then saved, checked and ranked at quiet moments
        profileStep();
        updateHud();
    }
});

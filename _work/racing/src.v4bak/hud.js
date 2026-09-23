// ============================================================
// hud.js - builds the HUD strings once per frame; each text object only
// rewrites itself when its own string actually changed.
// ============================================================
let hSpd = BLANK;
let hSpdU = BLANK;
let hLap = BLANK;
let hPos = BLANK;
let hTime = BLANK;
let hBest = BLANK;
let hLast = BLANK;
let hDrift = BLANK;
let hBig = BLANK;
let hSub = BLANK;
let hMsg = BLANK;
let hM1 = BLANK;
let hM2 = BLANK;
let hM3 = BLANK;
let hM4 = BLANK;
let hM5 = BLANK;
let hM6 = BLANK;

function clearHud() {
    hSpd = BLANK; hSpdU = BLANK; hLap = BLANK; hPos = BLANK; hTime = BLANK; hBest = BLANK; hLast = BLANK; hDrift = BLANK;
    hM1 = BLANK; hM2 = BLANK; hM3 = BLANK; hM4 = BLANK; hM5 = BLANK; hM6 = BLANK;
}

function menuLine(i, sel, label) {
    let s = sel == i ? str('▶ ', label) : str('   ', label);
    if (i == 1) { hM1 = s; } else if (i == 2) { hM2 = s; } else if (i == 3) { hM3 = s; }
    else if (i == 4) { hM4 = s; } else if (i == 5) { hM5 = s; } else { hM6 = s; }
}

function updateHud() {
    if (bannerT > 0) { bannerT = bannerT - dt; if (bannerT <= 0) { banner = BLANK; } }
    if (msgT > 0) { msgT = msgT - dt; if (msgT <= 0) { msg = BLANK; } }
    hBig = banner;
    hMsg = msg;
    if (raceState == ST_MENU) {
        clearHud();
        hBig = 'ENTRY RACING 3D';
        hSub = str(trkName[selTrk], '   /   ', ctName[selCar]);
        menuLine(1, menuSel, 'RACE START');
        menuLine(2, menuSel, str('CAR        < ', ctName[selCar], ' >'));
        menuLine(3, menuSel, str('TRACK      < ', trkName[selTrk], ' >'));
        menuLine(4, menuSel, str('AI LEVEL   < ', aiName[aiDiff], ' >'));
        menuLine(5, menuSel, 'TRACK EDITOR');
        hM6 = 'W/S accel-brake   A/D steer   SPACE handbrake   C camera';
        hMsg = 'ARROWS select   ENTER confirm';
    } else if (raceState == ST_CARSEL) {
        clearHud();
        hBig = ctName[selCar];
        hSub = 'CHOOSE YOUR CAR';
        hM1 = str('TOP SPEED   ', Math.round(ctTop[selCar] * 3.6), ' km/h');
        hM2 = str('ACCEL       ', Math.round(ctAcc[selCar] * 10) / 10);
        hM3 = str('GRIP        ', Math.round(ctGrip[selCar] * 100), ' %');
        hM4 = str('WEIGHT      ', Math.round(ctMass[selCar] * 100), ' %');
        hMsg = 'LEFT/RIGHT change   ENTER confirm   ESC back';
    } else if (raceState == ST_TRKSEL) {
        clearHud();
        hBig = trkName[selTrk];
        hSub = trkInfo[selTrk];
        fmtTime(recLap[selTrk] > 0 ? recLap[selTrk] : 0 - 1);
        hM1 = str('BEST LAP    ', oTime);
        fmtTime(recRace[selTrk] > 0 ? recRace[selTrk] : 0 - 1);
        hM2 = str('BEST RACE   ', oTime);
        hM3 = str('LENGTH      ', Math.round(trkLen), ' m');
        hM4 = str('LAPS        ', LAPS, '      ', selTrk, ' / ', NTRK);
        hMsg = 'LEFT/RIGHT change   ENTER confirm   ESC back';
    } else if (raceState == ST_EDIT) {
        clearHud();
        hBig = BLANK;
        hSub = BLANK;
        hM1 = 'DRAG a node to move   CLICK the road to add   X delete';
        hM2 = 'Q/E width   R/F height   T tunnel   J jump   B barrier';
        hM3 = 'C checkpoint   S start line   N new oval   Z/V zoom   ARROWS pan';
        hM4 = str('NODES ', ctlCnt[EDTRK], '   LENGTH ', Math.round(trkLen), ' m   CHECKPOINTS ', nCP);
        hM5 = BLANK;
        hM6 = 'ENTER race this circuit   ESC back to menu';
        hMsg = BLANK;
    } else if (raceState == ST_PAUSE) {
        hBig = 'PAUSED';
        hSub = BLANK;
        hM1 = 'P  resume';
        hM2 = 'R  restart';
        hM3 = 'M  main menu';
        hM4 = BLANK; hM5 = BLANK; hM6 = BLANK;
        hMsg = BLANK;
    } else {
        hM1 = BLANK; hM2 = BLANK; hM3 = BLANK; hM4 = BLANK; hM5 = BLANK; hM6 = BLANK;
        let kmh = Math.abs(caSpd[1]) * 3.6;
        hSpd = str(Math.round(kmh));
        hSpdU = 'km/h';
        let lp = caLap[1];
        if (lp < 1) { lp = 1; }
        if (lp > LAPS) { lp = LAPS; }
        hLap = str('LAP ', lp, ' / ', LAPS);
        hPos = str('P ', caRank[1], ' / ', nCars);
        fmtTime(raceT);
        hTime = oTime;
        fmtTime(bestLap);
        hBest = str('BEST  ', oTime);
        fmtTime(lastLap);
        hLast = str('LAST  ', oTime);
        if (driftScore > 1) {
            hDrift = driftNow > 0
                ? str('DRIFT ', Math.round(driftScore), '  x', Math.round(driftCombo * 10) / 10)
                : str('DRIFT ', Math.round(driftScore));
        } else { hDrift = BLANK; }
        if (raceState == ST_COUNT) { hSub = 'GET READY'; }
        else if (raceState == ST_DONE) {
            hBig = str('FINISH  P', finished);
            fmtTime(raceT);
            hSub = str('TOTAL ', oTime);
            fmtTime(bestLap);
            hM1 = str('BEST LAP  ', oTime);
            fmtTime(recLap[selTrk]);
            hM2 = str('TRACK REC ', oTime);
            hM3 = str('DRIFT     ', Math.round(driftScore));
            hM6 = 'ENTER menu   R restart';
        } else { hSub = BLANK; }
        if (caSurf[1] >= 2) {
            if (caOffT[1] > 1.2) { hMsg = 'OFF TRACK'; }
        }
    }
}

// ---- one thread per text object; each only redraws on change ------------
on('start', 'tSpd', function () { let p = '~'; for (;;) { if (hSpd != p) { p = hSpd; write(p); } } });
on('start', 'tSpdU', function () { let p = '~'; for (;;) { if (hSpdU != p) { p = hSpdU; write(p); } } });
on('start', 'tLap', function () { let p = '~'; for (;;) { if (hLap != p) { p = hLap; write(p); } } });
on('start', 'tPos', function () { let p = '~'; for (;;) { if (hPos != p) { p = hPos; write(p); } } });
on('start', 'tTime', function () { let p = '~'; for (;;) { if (hTime != p) { p = hTime; write(p); } } });
on('start', 'tBest', function () { let p = '~'; for (;;) { if (hBest != p) { p = hBest; write(p); } } });
on('start', 'tLast', function () { let p = '~'; for (;;) { if (hLast != p) { p = hLast; write(p); } } });
on('start', 'tDrift', function () { let p = '~'; for (;;) { if (hDrift != p) { p = hDrift; write(p); } } });
on('start', 'tBig', function () { let p = '~'; for (;;) { if (hBig != p) { p = hBig; write(p); } } });
on('start', 'tSub', function () { let p = '~'; for (;;) { if (hSub != p) { p = hSub; write(p); } } });
on('start', 'tMsg', function () { let p = '~'; for (;;) { if (hMsg != p) { p = hMsg; write(p); } } });
on('start', 'tM1', function () { let p = '~'; for (;;) { if (hM1 != p) { p = hM1; write(p); } } });
on('start', 'tM2', function () { let p = '~'; for (;;) { if (hM2 != p) { p = hM2; write(p); } } });
on('start', 'tM3', function () { let p = '~'; for (;;) { if (hM3 != p) { p = hM3; write(p); } } });
on('start', 'tM4', function () { let p = '~'; for (;;) { if (hM4 != p) { p = hM4; write(p); } } });
on('start', 'tM5', function () { let p = '~'; for (;;) { if (hM5 != p) { p = hM5; write(p); } } });
on('start', 'tM6', function () { let p = '~'; for (;;) { if (hM6 != p) { p = hM6; write(p); } } });

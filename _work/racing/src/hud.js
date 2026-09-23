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
let hHelp = BLANK;
let hM1 = BLANK;
let hM2 = BLANK;
let hM3 = BLANK;
let hM4 = BLANK;
let hM5 = BLANK;
let hM6 = BLANK;
let hM7 = BLANK;
let hM8 = BLANK;
let hM9 = BLANK;
let hGear = BLANK;
let hDRS = BLANK;
let hDRSC = 0;              // 1 grey (shut), 2 amber (available: press E), 3 green (open)
let hDelta = BLANK;
let hDeltaC = 0;            // 1 purple, 2 yellow, 3 green, 4 red
let hT1 = BLANK;
let hT2 = BLANK;
let hT3 = BLANK;
let hT4 = BLANK;
let hT5 = BLANK;
let hT6 = BLANK;
let hT7 = BLANK;
let hT8 = BLANK;
let hBigY = 14;             // the title moves up out of the way on menu screens
let hSubY = 0 - 26;
let panelOn = 0;            // dark card behind the menu lines, and its extent
let panelT = 66;
let panelB = 0 - 82;
let oRow = BLANK;

function clearHud() {
    hSpd = BLANK; hSpdU = BLANK; hLap = BLANK; hPos = BLANK; hTime = BLANK; hBest = BLANK; hLast = BLANK; hDrift = BLANK;
    hGear = BLANK; hDRS = BLANK; hDelta = BLANK;
    clearLines();
    clearTower();
}
function clearLines() {
    hM1 = BLANK; hM2 = BLANK; hM3 = BLANK; hM4 = BLANK; hM5 = BLANK; hM6 = BLANK; hM7 = BLANK; hM8 = BLANK; hM9 = BLANK;
}
function clearTower() {
    hT1 = BLANK; hT2 = BLANK; hT3 = BLANK; hT4 = BLANK; hT5 = BLANK; hT6 = BLANK; hT7 = BLANK; hT8 = BLANK;
}

function setLine(i, s) {
    if (i == 1) { hM1 = s; } else if (i == 2) { hM2 = s; } else if (i == 3) { hM3 = s; }
    else if (i == 4) { hM4 = s; } else if (i == 5) { hM5 = s; } else if (i == 6) { hM6 = s; }
    else if (i == 7) { hM7 = s; } else if (i == 8) { hM8 = s; } else { hM9 = s; }
}
function menuLine(i, sel, label) {
    setLine(i, sel == i ? str('▶ ', label, '  ') : str('   ', label, '   '));
}

// "P3  K. TANAKA   AZURE    +4.512" for results and standings tables
function tableRow(pos, o, tail) {
    padR(drvName[o], 11);
    let nm = oPad;
    padR(lvName[caCol[o]], 9);
    let tm = oPad;
    padR(tail, 10);
    oRow = str(o == 1 ? '▶' : ' ', pos < 10 ? ' P' : 'P', pos, '  ', nm, tm, oPad);
}

function resultsTable() {
    let lead = srtI[1];
    let i = 1;
    while (i <= nCars) {
        let o = srtI[i];
        let tail = 'ON TRACK';
        if (caFin[o] > 0) {
            if (i == 1) { fmtTime(caFinT[o]); tail = oTime; }
            else { fmtSec(caFinT[o] - caFinT[lead]); tail = str('+', oSec); }
        } else if (caGap[o] < 0) { tail = str('+', 0 - caGap[o], ' LAP'); }
        tableRow(i, o, tail);
        setLine(i, oRow);
        i = i + 1;
    }
}

function standingsTable() {
    let i = 1;
    while (i <= NCAR) {
        let o = chOrd[i];
        tableRow(i, o, str(chPts[o], ' PTS'));
        setLine(i, oRow);
        i = i + 1;
    }
}

// the timing tower down the left: position, name, gap to the leader.
// Rebuilt a few times a second from updateGaps.
function buildTower() {
    let i = 1;
    while (i <= NCAR) {
        let s = BLANK;
        if (i <= nCars) {
            if (nCars > 1) {
                let o = srtI[i];
                padR(drvShort[o], 7);
                let g = 'LEADER';
                if (i > 1) {
                    if (caGap[o] < 0) { g = str('+', 0 - caGap[o], ' LAP'); }
                    else { g = str('+', Math.round(caGap[o] * 10) / 10); }
                }
                s = str(o == 1 ? '▶' : ' ', i, ' ', oPad, g);
                if (caFin[o] > 0) { s = str(s, ' ■'); }
            }
        }
        if (i == 1) { hT1 = s; } else if (i == 2) { hT2 = s; } else if (i == 3) { hT3 = s; } else if (i == 4) { hT4 = s; }
        else if (i == 5) { hT5 = s; } else if (i == 6) { hT6 = s; } else if (i == 7) { hT7 = s; } else { hT8 = s; }
        i = i + 1;
    }
}

function updateHud() {
    if (bannerT > 0) { bannerT = bannerT - dt; if (bannerT <= 0) { banner = BLANK; } }
    if (msgT > 0) { msgT = msgT - dt; if (msgT <= 0) { msg = BLANK; } }
    hBig = banner;
    hMsg = msg;
    hBigY = 106;
    hSubY = 80;
    panelOn = 1;
    panelT = 68;
    panelB = 0 - 82;
    if (raceState == ST_MENU) {
        clearHud();
        hBig = 'ENTRY RACING 3D';
        hSub = str('v5 F1 EDITION   -   ', trkName[selTrk], '   /   ', ctName[selCar]);
        if (gMode == M_CH) { menuLine(1, menuSel, 'START CHAMPIONSHIP'); }
        else if (gMode == M_TT) { menuLine(1, menuSel, 'START TIME TRIAL'); }
        else { menuLine(1, menuSel, 'RACE START'); }
        menuLine(2, menuSel, str('MODE       < ', modeName[gMode], ' >'));
        menuLine(3, menuSel, str('CAR        < ', ctName[selCar], ' >'));
        if (gMode == M_CH) { menuLine(4, menuSel, str('TRACKS       ALL ', NTRK, ' ROUNDS')); }
        else { menuLine(4, menuSel, str('TRACK      < ', trkName[selTrk], ' >')); }
        if (gMode == M_TT) { menuLine(5, menuSel, 'AI LEVEL     NO OPPONENTS'); }
        else { menuLine(5, menuSel, str('AI LEVEL   < ', aiName[aiDiff], ' >')); }
        if (gMode == M_TT) { menuLine(6, menuSel, 'LAPS         UNLIMITED'); }
        else { menuLine(6, menuSel, str('LAPS       < ', lapOpt[lapSel], ' >')); }
        menuLine(7, menuSel, str('WEATHER    < ', wxName[wx], ' >'));
        menuLine(8, menuSel, str('GRAPHICS   < ', gfxName[gfx], ' >'));
        menuLine(9, menuSel, 'TRACK EDITOR');
        hHelp = 'W/S throttle-brake  A/D steer  E DRS  C camera  L racing line  P pause';
        hMsg = 'UP/DOWN select   LEFT/RIGHT change   ENTER confirm';
    } else if (raceState == ST_CARSEL) {
        clearHud();
        hBig = ctName[selCar];
        hSub = ctInfo[selCar];
        hM6 = str('TOP SPEED   ', Math.round(ctTop[selCar] * 3.6), ' km/h');
        hM7 = str('ACCEL       ', Math.round(ctAcc[selCar] * 10) / 10);
        hM8 = str('GRIP        ', Math.round(ctGrip[selCar] * 100), ' %');
        hM9 = str('TEAM        ', lvName[ctCol[selCar]]);
        panelT = 0 - 14;
        hHelp = BLANK;
        hMsg = 'LEFT/RIGHT change   ENTER confirm   ESC back';
    } else if (raceState == ST_TRKSEL) {
        clearHud();
        hBig = trkName[selTrk];
        hSub = trkInfo[selTrk];
        fmtTime(recLap[selTrk] > 0 ? recLap[selTrk] : 0 - 1);
        hM6 = str('BEST LAP    ', oTime);
        fmtTime(recRace[selTrk] > 0 ? recRace[selTrk] : 0 - 1);
        hM7 = str('BEST RACE   ', oTime);
        hM8 = str('LENGTH      ', Math.round(trkLen), ' m');
        hM9 = str('CIRCUIT     ', selTrk, ' / ', NTRK);
        panelT = 0 - 14;
        hHelp = BLANK;
        hMsg = 'LEFT/RIGHT change   ENTER confirm   ESC back';
    } else if (raceState == ST_EDIT) {
        clearHud();
        panelOn = 0;
        hBig = BLANK;
        hSub = BLANK;
        hM6 = 'DRAG a node to move   CLICK the road to add   X delete';
        hM7 = 'Q/E width   R/F height   T tunnel   J jump   B barrier';
        hM8 = 'C checkpoint   S start line   N new oval   Z/V zoom   ARROWS pan';
        hM9 = str('NODES ', ctlCnt[EDTRK], '   LENGTH ', Math.round(trkLen), ' m   CHECKPOINTS ', nCP);
        hHelp = 'ENTER race this circuit   ESC back to menu';
        hMsg = BLANK;
    } else if (raceState == ST_PAUSE) {
        clearHud();
        hBig = 'PAUSED';
        hSub = str(trkName[selTrk], '   ', modeName[gMode]);
        hM1 = 'P  resume';
        hM2 = 'R  restart';
        hM3 = 'M  main menu';
        panelB = 14;
        hHelp = BLANK;
        hMsg = BLANK;
    } else if (raceState == ST_STAND) {
        clearHud();
        if (chRound >= NTRK) {
            hBig = 'CHAMPIONS';
            hSub = str('FINAL STANDINGS   -   ', drvName[chOrd[1]], ' WINS THE TITLE');
            hM9 = 'ENTER main menu';
        } else {
            hBig = 'STANDINGS';
            hSub = str('AFTER ROUND ', chRound, ' OF ', NTRK, '   -   NEXT: ', trkName[chRound + 1]);
            hM9 = 'ENTER next round';
        }
        standingsTable();
        hHelp = BLANK;
    } else if (raceState == ST_DONE) {
        clearHud();
        hBig = str('FINISH  P', finished);
        fmtTime(caFinT[1]);
        let tt = oTime;
        fmtTime(bestLap);
        hSub = str('TOTAL ', tt, '     BEST LAP ', oTime);
        resultsTable();
        if (gMode == M_CH) { hM9 = 'ENTER championship standings   R restart'; }
        else { hM9 = 'ENTER menu   R restart'; }
        hHelp = BLANK;
    } else {
        // ---- racing ----
        hBigY = 14;
        hSubY = 0 - 26;
        panelOn = 0;
        clearLines();
        hHelp = BLANK;
        let kmh = Math.abs(caSpd[1]) * 3.6;
        hSpd = str(Math.round(kmh));
        hSpdU = 'km/h';
        if (caGear[1] < 0) { hGear = 'R'; }
        else if (kmh < 2) { hGear = 'N'; }
        else { hGear = str(caGear[1]); }
        let lp = caLap[1];
        if (lp < 1) { lp = 1; }
        if (gMode == M_TT) {
            hLap = str('LAP ', lp);
            hPos = 'TIME TRIAL';
            clearTower();
        } else {
            if (lp > nLaps) { lp = nLaps; }
            hLap = str('LAP ', lp, ' / ', nLaps);
            hPos = str('P ', caRank[1], ' / ', nCars);
        }
        fmtTime(raceT);
        hTime = oTime;
        if (gMode == M_TT) { fmtTime(raceT - caLapT[1]); if (caLap[1] < 1) { oTime = '--:--.---'; } hTime = oTime; }
        fmtTime(bestLap);
        hBest = str('BEST  ', oTime);
        fmtTime(lastLap);
        hLast = str('LAST  ', oTime);
        if (driftScore > 1) {
            hDrift = driftNow > 0
                ? str('DRIFT ', Math.round(driftScore), '  x', Math.round(driftCombo * 10) / 10)
                : BLANK;
        } else { hDrift = BLANK; }
        // DRS: shown only inside a zone
        hDRS = BLANK;
        if (sgDRS[caSeg[1]] > 0) {
            hDRS = 'DRS';
            hDRSC = 1;
            if (caDOk[1] == 1) { hDRSC = 2; hDRS = 'DRS  E'; }
            if (caDRS[1] > 0) { hDRSC = 3; hDRS = 'DRS OPEN'; }
        }
        // sector split for a few seconds, otherwise the live delta to the best lap
        hDelta = BLANK;
        if (secMsgT > 0) { hDelta = secMsg; hDeltaC = secCol; }
        else if (bestLap > 0) {
            if (caLap[1] >= 1) {
                if (raceState == ST_RACE) {
                    let s = caSeg[1];
                    let ref = bsT[s] + (bsT[s + 1] - bsT[s]) * caU[1];
                    let d = raceT - caLapT[1] - ref;
                    fmtDelta(d);
                    hDelta = str('DELTA  ', oSec);
                    hDeltaC = d < 0 ? 3 : 4;
                }
            }
        }
        if (raceState == ST_COUNT) {
            hSub = BLANK;
            if (lightN < 1) { hSub = 'GET READY'; }
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
on('start', 'tBig', function () {
    let p = '~'; let py = 0 - 999;
    for (;;) {
        if (hBigY != py) { py = hBigY; goto(0, py); }
        if (hBig != p) { p = hBig; write(p); }
    }
});
on('start', 'tSub', function () {
    let p = '~'; let py = 0 - 999;
    for (;;) {
        if (hSubY != py) { py = hSubY; goto(0, py); }
        if (hSub != p) { p = hSub; write(p); }
    }
});
on('start', 'tMsg', function () { let p = '~'; for (;;) { if (hMsg != p) { p = hMsg; write(p); } } });
on('start', 'tHelp', function () { let p = '~'; for (;;) { if (hHelp != p) { p = hHelp; write(p); } } });
on('start', 'tM1', function () { let p = '~'; for (;;) { if (hM1 != p) { p = hM1; write(p); } } });
on('start', 'tM2', function () { let p = '~'; for (;;) { if (hM2 != p) { p = hM2; write(p); } } });
on('start', 'tM3', function () { let p = '~'; for (;;) { if (hM3 != p) { p = hM3; write(p); } } });
on('start', 'tM4', function () { let p = '~'; for (;;) { if (hM4 != p) { p = hM4; write(p); } } });
on('start', 'tM5', function () { let p = '~'; for (;;) { if (hM5 != p) { p = hM5; write(p); } } });
on('start', 'tM6', function () { let p = '~'; for (;;) { if (hM6 != p) { p = hM6; write(p); } } });
on('start', 'tM7', function () { let p = '~'; for (;;) { if (hM7 != p) { p = hM7; write(p); } } });
on('start', 'tM8', function () { let p = '~'; for (;;) { if (hM8 != p) { p = hM8; write(p); } } });
on('start', 'tM9', function () { let p = '~'; for (;;) { if (hM9 != p) { p = hM9; write(p); } } });
on('start', 'tGear', function () { let p = '~'; for (;;) { if (hGear != p) { p = hGear; write(p); } } });
on('start', 'tDRS', function () {
    let p = '~'; let pc = 0 - 1;
    for (;;) {
        if (hDRSC != pc) {
            pc = hDRSC;
            if (pc == 3) { textColor('#3dff6e'); } else if (pc == 2) { textColor('#ffc53a'); } else { textColor('#7a8290'); }
        }
        if (hDRS != p) { p = hDRS; write(p); }
    }
});
on('start', 'tDelta', function () {
    let p = '~'; let pc = 0 - 1;
    for (;;) {
        if (hDeltaC != pc) {
            pc = hDeltaC;
            if (pc == 1) { textColor('#d78cff'); } else if (pc == 2) { textColor('#ffd84a'); }
            else if (pc == 3) { textColor('#5cf07a'); } else { textColor('#ff6a5a'); }
        }
        if (hDelta != p) { p = hDelta; write(p); }
    }
});
on('start', 'tT1', function () { let p = '~'; for (;;) { if (hT1 != p) { p = hT1; write(p); } } });
on('start', 'tT2', function () { let p = '~'; for (;;) { if (hT2 != p) { p = hT2; write(p); } } });
on('start', 'tT3', function () { let p = '~'; for (;;) { if (hT3 != p) { p = hT3; write(p); } } });
on('start', 'tT4', function () { let p = '~'; for (;;) { if (hT4 != p) { p = hT4; write(p); } } });
on('start', 'tT5', function () { let p = '~'; for (;;) { if (hT5 != p) { p = hT5; write(p); } } });
on('start', 'tT6', function () { let p = '~'; for (;;) { if (hT6 != p) { p = hT6; write(p); } } });
on('start', 'tT7', function () { let p = '~'; for (;;) { if (hT7 != p) { p = hT7; write(p); } } });
on('start', 'tT8', function () { let p = '~'; for (;;) { if (hT8 != p) { p = hT8; write(p); } } });

// ============================================================
// hud.js - every piece of text on screen, through ONE text object (v6).
//   The object `txt` makes NTX clones of itself at start; clone k shows slot
//   k of the tx* lists. tx() fills a slot and bumps its version only when
//   something in it changed, so a clone redraws itself only then.
//   The text object is a fixed-width, left-aligned box (line break on): its
//   size is then independent of the text, which makes "set size" an exact
//   font scale and left alignment exact. Centre and right alignment are
//   worked out from the monospace advance (TXCW em per character).
// ============================================================
let txt$slot = 0;           // which slot this clone shows (a per-clone variable)
let txt$v = 0 - 1;          // the slot version it last drew
let hudPage = 0 - 1;        // screen the slots were last laid out for
let hudSub = 0 - 1;

// x, y: anchor in stage units; sz: font px; al: 0 centre, 1 left, 2 right
function tx(i, s, x, y, sz, col, al) {
    let gx = x;
    if (al != 1) {
        let w = strlen(s) * sz * TXCW;
        if (al == 0) { gx = x - w / 2; } else { gx = x - w; }
    }
    gx = gx + TXW / 2 * sz / TXF;
    let ch = 0;
    if (txS[i] != s) { txS[i] = s; ch = 1; }
    if (txX[i] != gx) { txX[i] = gx; ch = 1; }
    if (txY[i] != y) { txY[i] = y; ch = 1; }
    if (txZ[i] != sz) { txZ[i] = sz; ch = 1; }
    if (txC[i] != col) { txC[i] = col; ch = 1; }
    if (ch > 0) { txV[i] = txV[i] + 1; }
}
function txOff(i) {
    if (txS[i] != BLANK) { txS[i] = BLANK; txV[i] = txV[i] + 1; }
}
function txClear() {
    let i = 1;
    while (i <= NTX) { txOff(i); i = i + 1; }
}

on('start', 'txt', function () {
    hide();
    let k = 1;
    while (k <= NTX) {
        txS[k] = BLANK; txX[k] = 0; txY[k] = 0; txZ[k] = TXF; txC[k] = '#ffffff'; txV[k] = 0;
        txt$slot = k;
        cloneSelf();
        k = k + 1;
    }
    txt$slot = 0;
});

on('clone', 'txt', function () {
    show();
    for (;;) {
        if (txV[txt$slot] != txt$v) {
            txt$v = txV[txt$slot];
            write(txS[txt$slot]);
            textColorHex(txC[txt$slot]);
            setSize(txZ[txt$slot] * TXSZ);
            goto(txX[txt$slot], txY[txt$slot]);
        }
    }
});

// ---- shared bits ----------------------------------------------------------
const C_DIM = '#8f9bb3';
const C_WHITE = '#ffffff';
const C_ACC = '#ff4a3d';
const C_GOLD = '#ffd24a';
const C_SKY = '#9fd8ff';

let oRow = BLANK;

// "P3  K. TANAKA   AZURE    +4.512" for results and standings tables
function tableRow(pos, o, tail) {
    padR(drvName[o], 11);
    let nm = oPad;
    padR(lvName[caCol[o]], 9);
    let tm = oPad;
    padR(tail, 10);
    oRow = str(o == 1 ? '▶' : ' ', pos < 10 ? ' P' : 'P', pos, '  ', nm, tm, oPad);
}

function tableLine(i, s) {
    tx(23 + i, s, 0 - 168, 60 - (i - 1) * 15, 11, i == 1 ? C_GOLD : C_WHITE, 1);
}

function resultsTable() {
    classify();
    let lead = clsI[1];
    let i = 1;
    while (i <= NCAR) {
        if (i <= nCars) {
            let o = clsI[i];
            let tail = 'ON TRACK';
            if (caFin[o] > 0) {
                if (i == 1) { fmtTime(caFinT[o] + caPen[o]); tail = oTime; }
                else { fmtSec(caFinT[o] + caPen[o] - caFinT[lead] - caPen[lead]); tail = str('+', oSec); }
                if (caPen[o] > 0) { tail = str(tail, ' P'); }
            } else if (caGap[o] < 0) { tail = str('+', 0 - caGap[o], ' LAP'); }
            tableRow(i, o, tail);
            tableLine(i, oRow);
        } else { txOff(23 + i); }
        i = i + 1;
    }
}

// v7: the qualifying order (clsI) with each driver's best lap
function qualiTable() {
    let i = 1;
    while (i <= NCAR) {
        let o = clsI[i];
        let tail = 'NO TIME';
        if (caQT[o] < 9000) {
            if (i == 1) { fmtTime(caQT[o]); tail = oTime; }
            else { fmtSec(caQT[o] - caQT[clsI[1]]); tail = str('+', oSec); }
        }
        tableRow(i, o, tail);
        tableLine(i, oRow);
        i = i + 1;
    }
}

function standingsTable() {
    let i = 1;
    while (i <= NCAR) {
        let o = chOrd[i];
        tableRow(i, o, str(chPts[o], ' PTS'));
        tableLine(i, oRow);
        i = i + 1;
    }
}

// the timing tower down the left: position, name, gap to the leader.
// Rebuilt a few times a second from updateGaps.
function buildTower() {
    let on = 0;
    if (raceState == ST_RACE) { on = 1; } else if (raceState == ST_COUNT) { on = 1; }
    let i = 1;
    while (i <= NCAR) {
        let s = BLANK;
        if (i <= nCars * on) {
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
                else if (rules == R_SIM) {
                    // v7: the tyre each car is on, or that it is in the pits
                    if (caPit[o] >= 2) { s = str(s, ' PIT'); } else { s = str(s, ' ', tyShort[caTy[o]]); }
                }
            }
        }
        tx(15 + i, s, 0 - 232, 58 - (i - 1) * 11, 10, i == 1 ? C_WHITE : '#e6e9f0', 1);
        i = i + 1;
    }
}

// one row of a menu card: label on the left, value on the right
function cardRow(r, label, value, y) {
    tx(51 + r, label, cardX0 + 10, y, 9, C_DIM, 1);
    tx(61 + r, value, cardX0 + 112, y, 9, C_WHITE, 1);
}
function cardRowsOff(from) {
    let r = from;
    while (r <= 10) { txOff(51 + r); txOff(61 + r); r = r + 1; }
}

// ---- per screen -------------------------------------------------------------
function updateHud() {
    if (bannerT > 0) { bannerT = bannerT - dt; if (bannerT <= 0) { banner = BLANK; } }
    if (msgT > 0) { msgT = msgT - dt; if (msgT <= 0) { msg = BLANK; } }
    // a new screen starts from a blank page
    let page = raceState;
    if (page == ST_COUNT) { page = ST_RACE; }
    if (page == ST_QUALI) { page = ST_RACE; }
    let sub = 0;
    if (page == ST_MENU) { sub = menuSel + 100 * mnPage; }
    if (page == ST_EDIT) { sub = shShow; }
    if (page == ST_PROF) { sub = prTab; }
    if (page != hudPage) { txClear(); hudPage = page; hudSub = sub; }
    else if (sub != hudSub) {
        hudSub = sub;
        let i = 50;
        if (page == ST_EDIT) { i = 28; }
        if (page == ST_PROF) { i = 24; }
        while (i <= NTX) { txOff(i); i = i + 1; }
    }
    if (raceState == ST_MENU) { hudMenu(); }
    else if (raceState == ST_CARSEL) { hudCarSel(); }
    else if (raceState == ST_TUNE) { hudTune(); }
    else if (raceState == ST_PROF) { hudProf(); }
    else if (raceState == ST_TRKSEL) { hudTrkSel(); }
    else if (raceState == ST_EDIT) {
        tx(24, 'DRAG a node to move   CLICK the road to add   X delete', 0, 0 - 64, 10, C_WHITE, 0);
        tx(25, 'Q/E width   R/F height   T tunnel   J jump   B barrier', 0, 0 - 78, 10, C_WHITE, 0);
        tx(26, 'C checkpoint   S start line   N new oval   Z/V zoom   ARROWS pan', 0, 0 - 92, 10, C_WHITE, 0);
        tx(27, str('NODES ', ctlCnt[EDTRK], '   LENGTH ', Math.round(trkLen), ' m   CHECKPOINTS ', nCP), 0, 0 - 106, 10, C_GOLD, 0);
        tx(12, 'ENTER race   ESC menu   K share code   I load a code', 0, 0 - 122, 10, C_DIM, 0);
        tx(11, msg, 0, 116, 11, C_GOLD, 0);
        if (shShow > 0) {
            tx(28, 'SHARE CODE - TYPE IT INTO ANOTHER EDITOR WITH  I', 0, 88, 10, C_WHITE, 0);
            let k = 1;
            while (k <= 6) {
                if (k <= shLines) { tx(28 + k, shLn[k], 0 - 212, 70 - (k - 1) * 16, 11, C_GOLD, 1); } else { txOff(28 + k); }
                k = k + 1;
            }
            tx(35, str(ctlCnt[EDTRK], ' NODES  -  ', strlen(shCode), ' CHARACTERS  -  K CLOSES'), 0, 70 - shLines * 16 - 4, 9, C_DIM, 0);
        }
    } else if (raceState == ST_PAUSE) {
        tx(9, 'PAUSED', 0, 44, 32, C_WHITE, 0);
        tx(10, str(trkName[selTrk], '   ', modeName[gMode], '   ', ruleName[rules]), 0, 16, 11, '#e0e6f2', 0);
        tx(24, 'P   RESUME', 0, 0 - 6, 12, C_WHITE, 0);
        tx(25, 'R   RESTART', 0, 0 - 24, 12, C_WHITE, 0);
        tx(26, 'M   MAIN MENU', 0, 0 - 42, 12, C_WHITE, 0);
        if (gfx > 1) { tx(27, 'V   REPLAY', 0, 0 - 60, 12, C_WHITE, 0); }
    } else if (raceState == ST_QRES) {
        tx(9, 'QUALIFYING', 0, 106, 30, C_WHITE, 0);
        tx(10, str(trkName[selTrk], '   -   STARTING GRID'), 0, 82, 11, '#e0e6f2', 0);
        qualiTable();
        tx(12, 'ENTER  to the grid', 0, 0 - 112, 11, C_DIM, 0);
    } else if (raceState == ST_REPLAY) {
        hudReplay();
    } else if (raceState == ST_STAND) {
        if (chRound >= NTRK) {
            tx(9, 'CHAMPIONS', 0, 106, 30, C_GOLD, 0);
            tx(10, str('FINAL STANDINGS   -   ', drvName[chOrd[1]], ' WINS THE TITLE'), 0, 82, 11, '#e0e6f2', 0);
            tx(12, 'ENTER  main menu', 0, 0 - 112, 11, C_DIM, 0);
        } else {
            tx(9, 'STANDINGS', 0, 106, 30, C_WHITE, 0);
            tx(10, str('AFTER ROUND ', chRound, ' OF ', NTRK, '   -   NEXT: ', trkName[chRound + 1]), 0, 82, 11, '#e0e6f2', 0);
            tx(12, 'ENTER  next round', 0, 0 - 112, 11, C_DIM, 0);
        }
        standingsTable();
    } else if (raceState == ST_DONE) {
        resultsTable();
        tx(9, str('FINISH  P', clsPos), 0, 106, 30, clsPos == 1 ? C_GOLD : C_WHITE, 0);
        fmtTime(caFinT[1] + caPen[1]);
        let tt = oTime;
        fmtTime(bestLap);
        let pn = BLANK;
        if (caPen[1] > 0) { pn = str('   (+', caPen[1], 's PENALTY)'); }
        tx(10, str('TOTAL ', tt, '     BEST LAP ', oTime, pn), 0, 82, 11, '#e0e6f2', 0);
        // v8: what the race was worth
        tx(11, str(rsLine, '     LEVEL ', pLv, '  (', pLvXP, ' / ', pLvNeed, ')'), 0, 0 - 94, 9, C_GOLD, 0);
        let rp = BLANK;
        if (gfx > 1) { rp = '     V  replay'; }
        if (gMode == M_CH) { tx(12, str('ENTER  championship standings     R  restart', rp), 0, 0 - 112, 11, C_DIM, 0); }
        else { tx(12, str('ENTER  menu     R  restart', rp), 0, 0 - 112, 11, C_DIM, 0); }
    } else { hudRace(); }
    // v8: achievement / level-up pop-up (the pen draws its panel)
    if (popT > 0) {
        let a = Math.min(1, popT * 3, (3.2 - popT) * 4);
        let y = 130 - 26 * a;
        tx(77, popA, 0, y - 6, 10, C_GOLD, 0);
        tx(78, popB, 0, y - 18, 7, C_WHITE, 0);
    } else { txOff(77); txOff(78); }
}

function hudRace() {
    tx(9, banner, 0, 14, 40, C_WHITE, 0);
    let ms = msg;
    let mc = '#cfd6e6';
    if (caSurf[1] >= 2) { if (caOffT[1] > 1.2) { ms = 'OFF TRACK'; mc = '#ff8a7a'; } }
    tx(11, ms, 0, 0 - 128, 12, mc, 0);
    let kmh = Math.abs(caSpd[1]) * 3.6;
    tx(1, str(Math.round(kmh)), 0 - 196, 0 - 104, 22, C_WHITE, 1);
    tx(2, 'km/h', 0 - 196, 0 - 126, 11, '#a8b0c0', 1);
    let gr = str(caGear[1]);
    if (caGear[1] < 0) { gr = 'R'; }
    else if (kmh < 2) { gr = 'N'; }
    tx(13, gr, 0 - 150, 0 - 104, 22, '#ffe05a', 1);
    let lp = caLap[1];
    if (lp < 1) { lp = 1; }
    if (raceState == ST_QUALI) {
        let ql = str('LAP ', lp, ' / ', QLAPS);
        if (caLap[1] < 1) { ql = 'OUT LAP'; }
        tx(3, ql, 104, 112, 18, C_WHITE, 1);
        tx(4, 'QUALIFYING', 104, 88, 18, C_GOLD, 1);
        tx(12, 'ENTER  end the session', 0, 0 - 112, 9, C_DIM, 0);
    } else if (gMode >= M_TT) {
        tx(3, str('LAP ', lp), 104, 112, 18, C_WHITE, 1);
        tx(4, gMode == M_TT ? 'TIME TRIAL' : 'PRACTICE', 104, 88, 18, C_GOLD, 1);
    } else {
        if (lp > nLaps) { lp = nLaps; }
        tx(3, str('LAP ', lp, ' / ', nLaps), 104, 112, 18, C_WHITE, 1);
        tx(4, str('P ', caRank[1], ' / ', nCars), 104, 88, 18, C_GOLD, 1);
    }
    fmtTime(raceT);
    let solo = 0;
    if (gMode >= M_TT) { solo = 1; }
    if (raceState == ST_QUALI) { solo = 1; }
    if (solo > 0) { fmtTime(raceT - caLapT[1]); if (caLap[1] < 1) { oTime = '--:--.---'; } }
    tx(5, oTime, 0 - 196, 112, 16, C_WHITE, 1);
    fmtTime(bestLap);
    tx(6, str('BEST  ', oTime), 0 - 196, 92, 12, C_SKY, 1);
    fmtTime(lastLap);
    tx(7, str('LAST  ', oTime), 0 - 196, 76, 12, '#c8c8d2', 1);
    let dr = BLANK;
    if (driftScore > 1) { if (driftNow > 0) { dr = str('DRIFT ', Math.round(driftScore), '  x', Math.round(driftCombo * 10) / 10); } }
    tx(8, dr, 0, 96, 20, '#ffe05a', 0);
    // DRS: shown only inside a zone
    let ds = BLANK;
    let dc = '#7a8290';
    if (sgDRS[caSeg[1]] > 0) {
        ds = 'DRS';
        if (caDOk[1] == 1) { dc = '#ffc53a'; ds = 'DRS  E'; }
        if (caDRS[1] > 0) { dc = '#3dff6e'; ds = 'DRS OPEN'; }
    }
    tx(14, ds, 0 - 150, 0 - 126, 11, dc, 1);
    // sector split for a few seconds, otherwise the live delta to the best lap
    let de = BLANK;
    let dcol = '#5cf07a';
    if (secMsgT > 0) { de = secMsg; dcol = secCol == 1 ? '#d78cff' : '#ffd84a'; }
    else if (bestLap > 0) {
        if (caLap[1] >= 1) {
            if (raceState == ST_RACE) {
                let s = caSeg[1];
                let ref = bsT[s] + (bsT[s + 1] - bsT[s]) * caU[1];
                let d = raceT - caLapT[1] - ref;
                fmtDelta(d);
                de = str('DELTA  ', oSec);
                dcol = d < 0 ? '#5cf07a' : '#ff6a5a';
            }
        }
    }
    tx(15, de, 0, 74, 13, dcol, 0);
    let sb = BLANK;
    if (raceState == ST_COUNT) { if (lightN < 1) { sb = 'GET READY'; } }
    tx(10, sb, 0, 0 - 26, 14, '#e0e6f2', 0);
    if (solo > 0) { let i = 16; while (i <= 23) { txOff(i); i = i + 1; } }
    if (rules == R_SIM) { hudSim(); }
}

// ---- v7 realistic HUD: slots 24..31, a panel on the right -----------------------
function hudSim() {
    let t = caTy[1];
    let tl = str(tyName[t], '  ', Math.round(caWear[1] * 100), '%');
    tx(24, tl, 100, 64, 8, tyHex[t], 1);
    let el = 'ERS';
    if (caErsOn[1] > 0) { el = 'ERS BOOST'; }
    tx(25, str(el, '  ', Math.round(caErs[1] * 100), '%'), 100, 50, 8, caErsOn[1] > 0 ? '#7cc4ff' : '#9dffb4', 1);
    let dm = BLANK;
    if (caDmg[1] > 0.02) {
        dm = str('WING ', Math.round(caDmg[1] * 100), '%');
        if (caWing[1] > 0) { dm = 'NO FRONT WING'; }
    }
    tx(26, dm, 100, 36, 8, caWing[1] > 0 ? '#ff6a5a' : '#ffc27a', 1);
    // the tyre the pit crew has ready (or, on the grid, the one fitted)
    let pl = str('PIT TYRE: ', tyName[pitNext], '  (T)');
    if (raceState == ST_COUNT) { pl = str('START TYRE: ', tyName[caTy[1]], '  (T)'); }
    if (caPit[1] == 2) { pl = 'PIT LIMITER  80'; }
    if (caPit[1] == 3) { fmtSec(caPitT[1]); pl = str('PIT STOP  ', oSec); }
    if (caPit[1] == 4) { pl = 'PIT EXIT - LIMITER'; }
    tx(27, pl, 100, 22, 8, caPit[1] > 1 ? C_GOLD : C_WHITE, 1);
    let wl = 'TRACK DRY';
    if (wetL > 0.57) { wl = 'TRACK WET'; } else if (wetL > 0.31) { wl = 'TRACK DAMP'; } else if (wetL > 0.12) { wl = 'DRYING / DAMP PATCHES'; }
    if (rainI > 0.2) { wl = str(wl, ' - RAIN'); }
    tx(28, wl, 100, 8, 8, wetL > 0.31 ? C_SKY : '#c8c8d2', 1);
    let pn = BLANK;
    if (caPen[1] > 0) { pn = str('PENALTY +', caPen[1], 's'); }
    else if (caTL[1] > 0) { pn = str('TRACK LIMITS ', mod(caTL[1], 3), '/3'); }
    tx(29, pn, 100, 0 - 6, 8, caPen[1] > 0 ? '#ff6a5a' : '#c8c8d2', 1);
    // flag panel text (the pen draws the panel) and team radio
    let fl = BLANK;
    let fcol = C_WHITE;
    if (raceState == ST_RACE) {
        if (scOn == 1) { fl = 'SAFETY CAR'; fcol = '#ff9a2a'; }
        else if (scOn == 2) { fl = 'SC IN THIS LAP'; fcol = '#ff9a2a'; }
        else if (scOn == 3) { fl = 'RESTART - NO PASSING'; fcol = '#ff9a2a'; }
        else if (yelHere > 0) { fl = 'YELLOW FLAG'; fcol = '#ffd21f'; }
    }
    tx(30, fl, 0, 117, 12, fcol, 0);
    tx(31, radio, 0, 0 - 44, 10, '#9fe0ff', 0);
}

// ---- v7 replay HUD ------------------------------------------------------------
function hudReplay() {
    tx(9, 'REPLAY', 0 - 212, 120, 14, C_WHITE, 1);
    padR(drvName[rpCar], 12);
    tx(10, str(oPad, lvName[caCol[rpCar]]), 0 - 120, 122, 10, lvHex[caCol[rpCar]], 1);
    let cn = 'TV CAMERA';
    if (rpCam == 1) { cn = 'CHASE'; } else if (rpCam == 2) { cn = 'ONBOARD'; } else if (rpCam == 3) { cn = 'HIGH CHASE'; }
    if (rpPause > 0) { cn = str(cn, '   PAUSED'); }
    tx(11, cn, 0 - 120, 110, 8, C_DIM, 1);
    fmtSec(rpT);
    tx(13, str(oSec, ' / ', Math.round((rpN - 1) * RPDT), ' s'), 150, 118, 9, C_WHITE, 1);
    tx(12, 'LEFT/RIGHT car   C camera   SPACE pause   ENTER back', 0, 0 - 123, 9, '#c9d1de', 0);
}

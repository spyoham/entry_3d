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
    let lead = srtI[1];
    let i = 1;
    while (i <= NCAR) {
        if (i <= nCars) {
            let o = srtI[i];
            let tail = 'ON TRACK';
            if (caFin[o] > 0) {
                if (i == 1) { fmtTime(caFinT[o]); tail = oTime; }
                else { fmtSec(caFinT[o] - caFinT[lead]); tail = str('+', oSec); }
            } else if (caGap[o] < 0) { tail = str('+', 0 - caGap[o], ' LAP'); }
            tableRow(i, o, tail);
            tableLine(i, oRow);
        } else { txOff(23 + i); }
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
            }
        }
        tx(15 + i, s, 0 - 232, 58 - (i - 1) * 11, 10, i == 1 ? C_WHITE : '#e6e9f0', 1);
        i = i + 1;
    }
}

// one row of a menu card: label on the left, value on the right
function cardRow(r, label, value, y) {
    tx(43 + r, label, cardX0 + 10, y, 9, C_DIM, 1);
    tx(53 + r, value, cardX0 + 112, y, 9, C_WHITE, 1);
}
function cardRowsOff(from) {
    let r = from;
    while (r <= 10) { txOff(43 + r); txOff(53 + r); r = r + 1; }
}

// ---- per screen -------------------------------------------------------------
function updateHud() {
    if (bannerT > 0) { bannerT = bannerT - dt; if (bannerT <= 0) { banner = BLANK; } }
    if (msgT > 0) { msgT = msgT - dt; if (msgT <= 0) { msg = BLANK; } }
    // a new screen starts from a blank page
    let page = raceState;
    if (page == ST_COUNT) { page = ST_RACE; }
    let sub = 0;
    if (page == ST_MENU) { sub = menuSel; }
    if (page != hudPage) { txClear(); hudPage = page; hudSub = sub; }
    else if (sub != hudSub) { hudSub = sub; let i = 42; while (i <= NTX) { txOff(i); i = i + 1; } }
    if (raceState == ST_MENU) { hudMenu(); }
    else if (raceState == ST_CARSEL) { hudCarSel(); }
    else if (raceState == ST_TRKSEL) { hudTrkSel(); }
    else if (raceState == ST_EDIT) {
        tx(24, 'DRAG a node to move   CLICK the road to add   X delete', 0, 0 - 64, 10, C_WHITE, 0);
        tx(25, 'Q/E width   R/F height   T tunnel   J jump   B barrier', 0, 0 - 78, 10, C_WHITE, 0);
        tx(26, 'C checkpoint   S start line   N new oval   Z/V zoom   ARROWS pan', 0, 0 - 92, 10, C_WHITE, 0);
        tx(27, str('NODES ', ctlCnt[EDTRK], '   LENGTH ', Math.round(trkLen), ' m   CHECKPOINTS ', nCP), 0, 0 - 106, 10, C_GOLD, 0);
        tx(12, 'ENTER race this circuit   ESC back to menu', 0, 0 - 122, 10, C_DIM, 0);
    } else if (raceState == ST_PAUSE) {
        tx(9, 'PAUSED', 0, 44, 32, C_WHITE, 0);
        tx(10, str(trkName[selTrk], '   ', modeName[gMode]), 0, 16, 11, '#e0e6f2', 0);
        tx(24, 'P   RESUME', 0, 0 - 6, 12, C_WHITE, 0);
        tx(25, 'R   RESTART', 0, 0 - 24, 12, C_WHITE, 0);
        tx(26, 'M   MAIN MENU', 0, 0 - 42, 12, C_WHITE, 0);
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
        tx(9, str('FINISH  P', finished), 0, 106, 30, finished == 1 ? C_GOLD : C_WHITE, 0);
        fmtTime(caFinT[1]);
        let tt = oTime;
        fmtTime(bestLap);
        tx(10, str('TOTAL ', tt, '     BEST LAP ', oTime), 0, 82, 11, '#e0e6f2', 0);
        resultsTable();
        if (gMode == M_CH) { tx(12, 'ENTER  championship standings     R  restart', 0, 0 - 112, 11, C_DIM, 0); }
        else { tx(12, 'ENTER  menu     R  restart', 0, 0 - 112, 11, C_DIM, 0); }
    } else { hudRace(); }
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
    if (gMode == M_TT) {
        tx(3, str('LAP ', lp), 104, 112, 18, C_WHITE, 1);
        tx(4, 'TIME TRIAL', 104, 88, 18, C_GOLD, 1);
    } else {
        if (lp > nLaps) { lp = nLaps; }
        tx(3, str('LAP ', lp, ' / ', nLaps), 104, 112, 18, C_WHITE, 1);
        tx(4, str('P ', caRank[1], ' / ', nCars), 104, 88, 18, C_GOLD, 1);
    }
    fmtTime(raceT);
    if (gMode == M_TT) { fmtTime(raceT - caLapT[1]); if (caLap[1] < 1) { oTime = '--:--.---'; } }
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
    if (gMode == M_TT) { let i = 16; while (i <= 23) { txOff(i); i = i + 1; } }
}

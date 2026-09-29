// ============================================================
// profile.js - v8: the player's career.
//   * XP and levels; a level brings an upgrade point for the garage
//   * the garage: upgrades (engine, aero, brakes, tyres) and a free setup
//     (wing, gearing, brake bias, suspension), applied in carStats
//   * achievements, with pop-ups
//   * each circuit's best lap and race, and its best-lap ghost (game.js)
//   * the online ranking and the saved game
//
// v2.0.0 (F1 Online 3D): saving uses ENTRY SYNC lists. Entry Sync is a
// Chrome extension: every plain variable or list whose name starts with '?!'
// is shared live with everybody running the work and kept on its server
// (SY_x in this source is '?!x' in the work; SY_ alone is its connection
// flag '?!', 1 connected / -1 not). A change to a list sends the WHOLE list;
// the last one to arrive wins, and it reaches every other player.
//   ?!save1..8  the players' records, one item each ('|nick,field,...'),
//               in the list picked by a hash of the nickname. Saving swaps
//               the player's item for the new one, moved to the end; past
//               SHCAP items the first (least recently saved) goes.
//   ?!rank      one item per circuit: '|nick,ms|nick,ms...' fastest first
//   ?!ghost     one item per circuit: the world record's ghost
// ?!rank has NTRK items once anybody has saved: seeing that means the
// server's lists have arrived. Two writes to one list at the same moment
// lose one of them, so every write is checked a moment later and redone.
// Without the extension the lists are ordinary ones: everything works for
// the session and nothing is kept.
// ============================================================
let SY_ = 0;
let SY_save1 = [];
let SY_save2 = [];
let SY_save3 = [];
let SY_save4 = [];
let SY_save5 = [];
let SY_save6 = [];
let SY_save7 = [];
let SY_save8 = [];
let SY_rank = [];
let SY_ghost = [];

const HCH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-.';
const TRKV = 4;             // v4.0: circuits version written with the times
let oRT = '|';
let oSN = 0;

// the ranking and ghost items of circuit i
function rtGetK(i) { oRT = '|'; if (SY_rank.length >= i) { oRT = SY_rank[i]; } }
function rtSetK(i, v) { syInit(); SY_rank[i] = v; }
function rtGetG(i) { oRT = '|'; if (SY_ghost.length >= i) { oRT = SY_ghost[i]; } }
function rtSetG(i, v) { syInit(); SY_ghost[i] = v; }
// the first save ever gives ?!rank and ?!ghost their NTRK items
function syInit() {
    while (SY_rank.length < NTRK) { SY_rank.push('|'); }
    while (SY_ghost.length < NTRK) { SY_ghost.push('|'); }
}

// Entry names a list by a fixed id, so the save list is picked through a
// chain of ifs: its length (oSN), item i (oRT), and the three changes
function shLen(s) {
    if (s == 1) { oSN = SY_save1.length; } else if (s == 2) { oSN = SY_save2.length; } else if (s == 3) { oSN = SY_save3.length; } else if (s == 4) { oSN = SY_save4.length; }
    else if (s == 5) { oSN = SY_save5.length; } else if (s == 6) { oSN = SY_save6.length; } else if (s == 7) { oSN = SY_save7.length; } else { oSN = SY_save8.length; }
}
function shGet(s, i) {
    if (s == 1) { oRT = SY_save1[i]; } else if (s == 2) { oRT = SY_save2[i]; } else if (s == 3) { oRT = SY_save3[i]; } else if (s == 4) { oRT = SY_save4[i]; }
    else if (s == 5) { oRT = SY_save5[i]; } else if (s == 6) { oRT = SY_save6[i]; } else if (s == 7) { oRT = SY_save7[i]; } else { oRT = SY_save8[i]; }
}
function shSet(s, i, v) {
    if (s == 1) { SY_save1[i] = v; } else if (s == 2) { SY_save2[i] = v; } else if (s == 3) { SY_save3[i] = v; } else if (s == 4) { SY_save4[i] = v; }
    else if (s == 5) { SY_save5[i] = v; } else if (s == 6) { SY_save6[i] = v; } else if (s == 7) { SY_save7[i] = v; } else { SY_save8[i] = v; }
}
function shDel(s, i) {
    if (s == 1) { SY_save1.removeAt(i); } else if (s == 2) { SY_save2.removeAt(i); } else if (s == 3) { SY_save3.removeAt(i); } else if (s == 4) { SY_save4.removeAt(i); }
    else if (s == 5) { SY_save5.removeAt(i); } else if (s == 6) { SY_save6.removeAt(i); } else if (s == 7) { SY_save7.removeAt(i); } else { SY_save8.removeAt(i); }
}
function shAdd(s, v) {
    if (s == 1) { SY_save1.push(v); } else if (s == 2) { SY_save2.push(v); } else if (s == 3) { SY_save3.push(v); } else if (s == 4) { SY_save4.push(v); }
    else if (s == 5) { SY_save5.push(v); } else if (s == 6) { SY_save6.push(v); } else if (s == 7) { SY_save7.push(v); } else { SY_save8.push(v); }
}

// ---- the player -------------------------------------------------------------
let pNick = 'GUEST';
let pGuest = 1;
let pSh = 1;                // save shard
let pLoaded = 0;
let pDirty = 0;
let pSaveT = 0;
let pXP = 0;
let pLv = 1;
let pLvXP = 0;              // XP into this level
let pLvNeed = 250;          // XP this level takes
let pPts = 0;               // upgrade points to spend
let upE = 0; let upA = 0; let upB = 0; let upT = 0;
let suW = 0; let suG = 0; let suB = 0; let suS = 0;
// v3.0: front wing (suW is the rear wing now), differential, tyre pressure
let suF = 0; let suD = 0; let suP = 0;
let stRaces = 0; let stWins = 0; let stPods = 0; let stKm = 0; let stCirc = 0;
let nF = 0;
let ghSel = 1;              // time trial ghost: 1 my best, 2 world record, 3 off
let paSel = 1;              // practice assists: 1 line + brakes, 2 line, 3 none

// who is playing: the nickname, cleaned of the characters the save uses
function whoAmI() {
    let n = nickname();
    pGuest = 0;
    if (strlen(n) < 1) { pGuest = 1; }
    if (n == ' ') { pGuest = 1; }
    if (n == 'guest') { pGuest = 1; }
    if (pGuest > 0) { pNick = 'GUEST'; }
    else {
        // (v2.0.0: never built from '' - an Entry function's local variable
        // reads '' back as 0, which made every nickname '0...' in plain Entry)
        let L = strlen(n);
        if (L > 16) { L = 16; }
        let c = charAt(n, 1);
        if (indexOf('|,~', c) > 0) { c = '_'; }
        let k = 2;
        while (k <= L) {
            let ch = charAt(n, k);
            if (indexOf('|,~', ch) > 0) { ch = '_'; }
            c = str(c, ch);
            k = k + 1;
        }
        pNick = c;
    }
    let h = 7;
    let k2 = 1;
    let L2 = strlen(pNick);
    while (k2 <= L2) {
        h = mod(h * 31 + indexOf(HCH, charAt(pNick, k2)) + 1, 65521);
        k2 = k2 + 1;
    }
    pSh = mod(h + L2 * 7, NSH) + 1;
}

// ---- levels ----------------------------------------------------------------------
function levelFromXP() {
    let lv = 1;
    let left = pXP;
    let need = 250;
    while (lv < LVMAX) {
        if (left < need) { break; }
        left = left - need;
        lv = lv + 1;
        need = 250 + 90 * (lv - 1);
    }
    pLv = lv;
    pLvXP = left;
    pLvNeed = need;
    pPts = pLv - 1 - upE - upA - upB - upT;
    if (pPts < 0) { pPts = 0; }
}

function addXP(n) {
    let was = pLv;
    pXP = pXP + Math.round(n);
    levelFromXP();
    if (pLv > was) {
        popPush(100 + pLv);
        if (pLv >= 10) { unlock(19); }
    }
    pDirty = 1;
}

// ---- achievements and pop-ups -------------------------------------------------------
let popN = 0;               // queued pop-ups
let popT = 0;
let popA = BLANK;
let popB = BLANK;
function popPush(k) {
    if (popN < 32) { popN = popN + 1; popQ[popN] = k; }
}
function popStep() {
    if (popT > 0) { popT = popT - dt; }
    else if (popN > 0) {
        let k = popQ[1];
        let i = 1;
        while (i < popN) { popQ[i] = popQ[i + 1]; i = i + 1; }
        popN = popN - 1;
        if (k > 100) {
            popA = str('LEVEL UP!  LEVEL ', k - 100);
            popB = '+1 UPGRADE POINT FOR THE GARAGE';
        } else {
            popA = str('ACHIEVEMENT:  ', achName[k]);
            popB = str(achDesc[k], '   +100 XP');
        }
        popT = 3.2;
    }
}
function unlock(k) {
    if (achGot[k] < 1) {
        achGot[k] = 1;
        popPush(k);
        addXP(100);
    }
}
let achCount = 0;
function countAch() {
    achCount = 0;
    let k = 1;
    while (k <= NACH) { achCount = achCount + achGot[k]; k = k + 1; }
}

// ---- this race, for XP and achievements ----------------------------------------
let rsGrid = 6;
let rsMaxV = 0;
let rsClean = 1;
let rsWet = 0;
let rsKm = 0;
let rsAssist = 0;
let rsXP = 0;               // XP the last race earned (results screen)
let rsLine = BLANK;
function statsReset() {
    rsMaxV = 0; rsClean = 1; rsWet = 0; rsKm = 0; rsAssist = 0;
    rsGrid = 1;
    if (gMode < M_TT) { rsGrid = 6; if (qDone > 0) { rsGrid = caGrid[1]; } }
}
function statsStep() {
    if (raceState == ST_RACE) {
        let v = Math.abs(caSpd[1]);
        if (v > rsMaxV) { rsMaxV = v; if (v >= 94.4) { unlock(10); } }
        rsKm = rsKm + v * dt / 1000;
        if (wetL > 0.5) { rsWet = 1; }
        if (driftScore >= 5000) { unlock(9); }
    }
}

// the player crossed the line for the last time
function raceOver() {
    classify();
    let p = clsPos;
    stRaces = stRaces + 1;
    if (p == 1) { stWins = stWins + 1; }
    if (p <= 3) { stPods = stPods + 1; }
    stKm = stKm + rsKm;
    if (curTrk <= NTRK) { circDone(curTrk); }
    unlock(1);
    if (p == 1) {
        unlock(2);
        if (rsGrid >= 6) { unlock(5); }
        if (rsWet > 0) { unlock(7); }
        if (aiDiff >= NDIFF) { unlock(15); }
    }
    if (p <= 3) { unlock(3); }
    if (rsClean > 0) { unlock(6); }
    if (nLaps >= 10) { unlock(16); }
    if (rsGrid - p >= 5) { unlock(17); }
    if (stKm >= 500) { unlock(20); }
    // XP: finishing place, scaled by race length, AI level and rules
    ptsXP(p);
    let base = 40 + oPX;
    let k = (0.5 + 0.25 * Math.min(nLaps, 10)) * (0.6 + 0.2 * aiDiff);
    if (rules == R_SIM) { k = k * 1.25; }
    let xp = base * k;
    if (rsClean > 0) { xp = xp + 30; }
    rsXP = Math.round(xp);
    rsLine = str('+', rsXP, ' XP   P', p, '  x', Math.round(k * 100) / 100);
    if (rsClean > 0) { rsLine = str(rsLine, '  +CLEAN'); }
    addXP(rsXP);
    rsKm = 0;
    pDirty = 1;
}
function ptsXP(p) { oPX = 50; if (p == 1) { oPX = 200; } else if (p == 2) { oPX = 150; } else if (p == 3) { oPX = 120; } else if (p == 4) { oPX = 100; } else if (p == 5) { oPX = 85; } else if (p == 6) { oPX = 70; } else if (p == 7) { oPX = 60; } }
let oPX = 0;

function circDone(tk) {
    let b = 1;
    let k = 1;
    while (k < tk) { b = b * 2; k = k + 1; }
    if (mod(idiv(stCirc, b), 2) < 1) { stCirc = stCirc + b; }
    // (every built-in circuit: v4.4 14 of them)
    if (stCirc >= Math.pow(2, NTRK) - 1) { unlock(13); }
}

// a valid lap by the player (game.js updateLap): circuit best, its ghost,
// the ranking, and lap XP when driving alone
function lapDone(lt) {
    let tk = curTrk;
    let best = 0;
    if (recLap[tk] <= 0) { best = 1; } else if (lt < recLap[tk]) { best = 1; }
    if (gMode == M_TT) {
        if (ghN > 2) { if (ghTime > 0) { if (lt < ghTime) { unlock(11); setBanner('GHOST BEATEN!', 1.8); } } }
    }
    if (best > 0) {
        recLap[tk] = lt;
        lapGhost(tk, lt);
        setMsg('NEW CIRCUIT BEST!', 2.6);
        if (gMode >= M_TT) { addXP(30); }
        pDirty = 1;
        // the ranking is written later, at a quiet moment (profileStep)
        if (tk <= NTRK) { if (rsAssist < 1) { pendRk[tk] = lt; pendG[tk] = lgOk; } }
    }
    if (gMode == M_TT) { addXP(15); }
    if (gMode == M_PR) { addXP(10); }
    if (gMode >= M_TT) { if (tk <= NTRK) { circDone(tk); } stKm = stKm + rsKm; rsKm = 0; }
}

// ---- the garage ------------------------------------------------------------------------
// upgrades are bought with level points; the setup is free and a trade-off.
// Applied to the player's car in carStats.
function tuneCar() {
    caAcc[1] = caAcc[1] * (1 + 0.014 * upE) * (1 + 0.03 * suG);
    caTop[1] = caTop[1] * (1 + 0.006 * upE) * (1 - 0.009 * suW - 0.003 * suF) * (1 - 0.015 * suG) * (1 + 0.002 * suP);
    caGrip[1] = caGrip[1] * (1 + 0.008 * upT) * (1 + 0.01 * suS);
    caAeroK[1] = (1 + 0.03 * upA) * (1 + 0.045 * suW + 0.02 * suF);
    // v3.0: where the downforce sits (front wing up: more front, rear wing up: more rear)
    caFWb[1] = 0.035 * suF - 0.02 * suW;
    caDiff[1] = suD;
    caPres[1] = suP;
    caBrkK[1] = 1 + 0.04 * upB;
    caBias[1] = suB;
    caSusp[1] = suS;
    caWearK[1] = 1 - 0.05 * upT;
}

// ---- save record -----------------------------------------------------------------------
let pRec = '|';
function buildRec() {
    let mask = 0;
    let b = 1;
    let k = 1;
    while (k <= NACH) { mask = mask + achGot[k] * b; b = b * 2; k = k + 1; }
    pRec = str('|', pNick, ',', pXP, ',', upE, ',', upA, ',', upB, ',', upT, ',', suW + 3, ',', suG + 3, ',', suB + 3, ',', suS + 3,
        ',', mask, ',', stRaces, ',', stWins, ',', stPods, ',', Math.round(stKm), ',', stCirc);
    // (fields 17-24 and 25-32: circuits 1-8; v4.4: 9 on after field 36)
    let t = 1;
    while (t <= 8) { pRec = str(pRec, ',', recLap[t] > 0 ? Math.round(recLap[t] * 1000) : 0); t = t + 1; }
    t = 1;
    while (t <= 8) { pRec = str(pRec, ',', recRace[t] > 0 ? Math.round(recRace[t] * 1000) : 0); t = t + 1; }
    // v3.0: fields 33-35 (an older game reads the first 32 and ignores these)
    pRec = str(pRec, ',', suF + 3, ',', suD + 3, ',', suP + 3);
    // v4.0: field 36, the circuits the lap and race times were set on
    pRec = str(pRec, ',', TRKV);
    // v4.4: fields 37-42 laps and 43-48 races on circuits 9-14
    t = 9;
    while (t <= 14) { pRec = str(pRec, ',', recLap[t] > 0 ? Math.round(recLap[t] * 1000) : 0); t = t + 1; }
    t = 9;
    while (t <= 14) { pRec = str(pRec, ',', recRace[t] > 0 ? Math.round(recRace[t] * 1000) : 0); t = t + 1; }
    // v6.0: fields 49-53 laps and 54-58 races on circuits 15-19
    t = 15;
    while (t <= NTRK) { pRec = str(pRec, ',', recLap[t] > 0 ? Math.round(recLap[t] * 1000) : 0); t = t + 1; }
    t = 15;
    while (t <= NTRK) { pRec = str(pRec, ',', recRace[t] > 0 ? Math.round(recRace[t] * 1000) : 0); t = t + 1; }
}

// split the record starting at character `from` of s into pF[1..nF]
// (v2.0.0: each field cut out whole - see whoAmI on '')
function parseRec(s, from) {
    let L = strlen(s);
    let k = from;
    let a = from;           // where the field began
    nF = 1;
    while (k <= L + 1) {
        let ch = '|';
        if (k <= L) { ch = charAt(s, k); }
        let end = 0;
        if (ch == '|') { end = 1; } else if (ch == ',') { end = 2; }
        if (end > 0) {
            if (k > a) { pF[nF] = substr(s, a, k - 1); } else { pF[nF] = 0; }
            if (end == 2) { nF = nF + 1; a = k + 1; } else { k = L + 1; }
        }
        k = k + 1;
    }
}

// Fold the record parsed into pF (the server's copy) into the session.
// addMode 1 (the first load): what was earned before the save arrived is
// added on top. addMode 0 (every save): the larger / better value wins, so
// two sessions of the same player never lose each other's progress.
function mergeRec(addMode) {
    if (nF >= 32) {
        let xp = pF[2] * 1;
        if (addMode > 0) {
            pXP = pXP + xp;
            stRaces = stRaces + pF[12] * 1; stWins = stWins + pF[13] * 1; stPods = stPods + pF[14] * 1; stKm = stKm + pF[15] * 1;
        } else {
            pXP = Math.max(pXP, xp);
            stRaces = Math.max(stRaces, pF[12] * 1); stWins = Math.max(stWins, pF[13] * 1);
            stPods = Math.max(stPods, pF[14] * 1); stKm = Math.max(stKm, pF[15] * 1);
        }
        // the garage: the saved one, unless it was changed in this session
        if (tuneTouched < 1) {
            upE = pF[3] * 1; upA = pF[4] * 1; upB = pF[5] * 1; upT = pF[6] * 1;
            suW = pF[7] - 3; suG = pF[8] - 3; suB = pF[9] - 3; suS = pF[10] - 3;
            // v3.0: a save from before has one wing: the front gets the same
            suF = suW; suD = 0; suP = 0;
            if (nF >= 35) { suF = pF[33] - 3; suD = pF[34] - 3; suP = pF[35] - 3; }
        }
        let mask = pF[11] * 1;
        let k = 1;
        while (k <= NACH) { if (mod(mask, 2) > 0) { achGot[k] = 1; } mask = idiv(mask, 2); k = k + 1; }
        let c1 = stCirc;
        let c2 = pF[16] * 1;
        stCirc = 0;
        let b = 1;
        k = 1;
        while (k <= NTRK) {
            let on = mod(idiv(c1, b), 2) + mod(idiv(c2, b), 2);
            if (on > 0) { stCirc = stCirc + b; }
            b = b * 2;
            k = k + 1;
        }
        // v4.0: times set on the old hand-drawn circuits do not count on the
        // real ones (a record without field 36 is from before)
        let t = 1;
        let same = 0;
        if (nF >= 36) { if (pF[36] * 1 >= TRKV) { same = 1; } }
        if (same < 1) { t = NTRK + 1; }
        while (t <= NTRK) {
            // (circuits 9-14 from field 37, v4.4 records on; 15-19 from
            // field 49, v6.0 records only)
            let fa = 16 + t;
            let fr = 24 + t;
            if (t > 14) { fa = 34 + t; fr = 39 + t; }
            else if (t > 8) { fa = 28 + t; fr = 34 + t; }
            if (fr > nF) { fa = 0; }
            if (fa > 0) {
            let a = pF[fa] / 1000;
            if (a > 0) { if (recLap[t] <= 0) { recLap[t] = a; } else if (a < recLap[t]) { recLap[t] = a; } }
            let r = pF[fr] / 1000;
            if (r > 0) { if (recRace[t] <= 0) { recRace[t] = r; } else if (r < recRace[t]) { recRace[t] = r; } }
            }
            t = t + 1;
        }
    }
    levelFromXP();
    countAch();
}
let tuneTouched = 0;

// ---- sync, load, save ------------------------------------------------------------
// Entry Sync fills the lists a moment after the work starts. Nothing is read
// or written for real until that has happened: pSync 1 once ?!rank has its
// items, 2 when it has not after SYWAIT s (a brand-new work nobody has saved
// in yet) - or at once when the extension is missing ('?!' still 0 after 3 s:
// the session plays offline).
let pSync = 0;
let pVerT = 0;              // seconds until the last save is checked
let pVerN = 0;              // saves retried
let pRkT = 0;               // same for the ranking write
let pRkN = 0;
let pRkTk = 0;              // circuit whose ranking write is being checked
let pRkLt = 0;
function syncStep() {
    if (pSync < 1) {
        if (SY_rank.length >= NTRK) { pSync = 1; }
        else if (gt > SYWAIT) { pSync = 2; }
        else if (gt > 3) { if (SY_ == 0) { pSync = 2; } }
        if (pSync > 0) { loadProfile(1); }
    } else if (pSync == 2) {
        // the server's lists turned up late after all: take them in
        if (SY_ > 0) { if (SY_rank.length >= NTRK) { pSync = 1; loadProfile(0); } }
    }
}

// the menu's online line (oSyL)
let oSyL = BLANK;
function syLabel() {
    oSyL = 'ONLINE';
    if (SY_ < 0) { oSyL = 'SYNC: NO SERVER'; }
    else if (SY_ < 1) { oSyL = 'OFFLINE'; }
}

// the player's item in their save list: oMine 1 and its index oMineI,
// parsed into pF
function findMine() {
    oMine = 0;
    oMineI = 0;
    let key = str('|', pNick, ',');
    shLen(pSh);
    let n = oSN;
    let i = 1;
    while (i <= n) {
        shGet(pSh, i);
        if (indexOf(oRT, key) == 1) { oMineI = i; oMine = 1; parseRec(oRT, 2); i = n; }
        i = i + 1;
    }
}
let oMine = 0;
let oMineI = 0;

function loadProfile(addMode) {
    whoAmI();
    if (pGuest < 1) {
        findMine();
        if (oMine > 0) { mergeRec(addMode); }
    }
    levelFromXP();
    countAch();
    rankAll();
    pLoaded = 1;
    pDirty = 1;
}

function saveProfile() {
    pDirty = 0;
    pSaveT = 3;
    if (pGuest < 1) {
        // take in whatever the server has for this player first
        findMine();
        if (oMine > 0) { mergeRec(0); }
        buildRec();
        syInit();
        // one change when the item is already the last, else out and onto the end
        if (oMine > 0) {
            shLen(pSh);
            if (oMineI == oSN) { shSet(pSh, oMineI, pRec); }
            else { shDel(pSh, oMineI); shAdd(pSh, pRec); }
        } else { shAdd(pSh, pRec); }
        // the least recently saved records go when the list is full
        shLen(pSh);
        let n = oSN;
        while (n > SHCAP) { shDel(pSh, 1); n = n - 1; }
        pSavedXP = pXP;
        pSavedRec = pRec;
        // someone else may have written the same list at the same moment:
        // look again once the dust has settled
        pVerT = 2;
    }
}

// was the last save kept? (the very record written must be there)
let pSavedXP = 0;
let pSavedRec = '|';
function verifySave() {
    // v9: the exact record written, not only its XP: a change without XP (a
    // garage upgrade or setup) could be rolled back silently by another
    // player who wrote the list from an older copy.
    findMine();
    let good = 0;
    if (oMine > 0) {
        shGet(pSh, oMineI);
        if (strlen(oRT) == strlen(pSavedRec)) { if (indexOf(oRT, pSavedRec) == 1) { good = 1; } }
        // or a newer copy of it (this player saved again from elsewhere)
        if (pF[2] * 1 > pSavedXP) { good = 1; }
    }
    if (good > 0) { pVerN = 0; }
    else {
        // back off a random, growing moment so writers stop colliding
        pVerN = pVerN + 1;
        pDirty = 1;
        pSaveT = rand(20, 160) / 100 * Math.min(6, pVerN);
    }
}

// write the pending best laps into the ranking, one circuit at a time
function rankStep() {
    if (pRkT > 0) {
        pRkT = pRkT - dt;
        if (pRkT <= 0) {
            // check the entry is in; if a simultaneous write pushed it out, retry
            rankParse(pRkTk);
            let there = 0;
            let i = 1;
            while (i <= rkC) {
                if (rkN[i] == pNick) { if (rkT[i] <= pRkLt + 0.0005) { there = 1; } }
                i = i + 1;
            }
            // v2.0.0: kept an eye on from now on (selfCheck)
            if (there > 0) { if (rkOk[pRkTk] <= 0) { rkOk[pRkTk] = pRkLt; } else if (pRkLt < rkOk[pRkTk]) { rkOk[pRkTk] = pRkLt; } }
            // v9: two new P1s at once could leave the ghost of the one who
            // ended up second in the ghost slot. The P1 checks it is theirs.
            if (there > 0) {
                if (rkN[1] == pNick) {
                    rtGetG(pRkTk);
                    if (indexOf(oRT, str(pNick, ',', Math.round(rkT[1] * 1000), ',')) != 1) {
                        if (pendG[pRkTk] > 0) {
                            wrUpload(pRkTk, rkT[1]);
                            pRkN = pRkN + 1;
                            if (pRkN < 8) { pendRk[pRkTk] = 0; pRkT = 2; }
                        }
                    }
                }
            }
            let fits = 1;
            if (rkC >= NRANK) { if (rkT[NRANK] <= pRkLt) { fits = 0; } }
            if (there < 1) {
                if (fits > 0) {
                    pRkN = pRkN + 1;
                    pendRk[pRkTk] = pRkLt;
                    pRkT = 0 - rand(20, 160) / 100 * Math.min(6, pRkN);
                }
            }
            if (pRkT > 0 - 0.001) { if (pRkT < 1) { pRkT = 0; } }
        }
    } else if (pRkT < 0) {
        pRkT = pRkT + dt;
        if (pRkT >= 0) { pRkT = 0; }
    } else {
        let t = 1;
        while (t <= NTRK) {
            if (pendRk[t] > 0) {
                pRkTk = t;
                pRkLt = pendRk[t];
                pendRk[t] = 0;
                if (pRkN < 1) { pRkN = 0; }
                rankSubmit(t, pRkLt);
                pRkT = 2;
                t = NTRK;
            }
            t = t + 1;
        }
        if (pRkT == 0) { pRkN = 0; }
    }
}

// v2.0.0: Entry Sync never sends a write back to its writer. A player whose
// write was overtaken by another can hold - and later send - an older copy
// of a list, rolling back somebody else's newer entry. So every player keeps
// an eye on their own entries while playing and puts them back: the record
// they saved last, and each lap of theirs that made the ranking.
let pChkT = 0;              // seconds to the next look
let pChkTk = 0;             // the circuit the last look was on
let pHealN = 0;
function selfCheck() {
    if (pGuest < 1) {
        if (strlen(pSavedRec) > 1) {
            findMine();
            let good = 0;
            if (oMine > 0) {
                shGet(pSh, oMineI);
                if (strlen(oRT) == strlen(pSavedRec)) { if (indexOf(oRT, pSavedRec) == 1) { good = 1; } }
                // or newer (the same player saved from elsewhere)
                if (pF[2] * 1 > pSavedXP) { good = 1; }
                // the same XP with other details is two devices of one player: not for ever
                if (good < 1) { if (pF[2] * 1 == pSavedXP) { if (pHealN >= 10) { good = 1; } } }
            }
            if (good < 1) { pDirty = 1; pHealN = pHealN + 1; }
        }
        // one ranked circuit a look
        if (pRkT == 0) {
            let k = 0;
            while (k < NTRK) {
                pChkTk = mod(pChkTk, NTRK) + 1;
                if (rkOk[pChkTk] > 0) { rankHeal(pChkTk); k = NTRK; }
                k = k + 1;
            }
        }
    }
}
function rankHeal(t) {
    rankParse(t);
    let there = 0;
    let i = 1;
    while (i <= rkC) {
        if (rkN[i] == pNick) { if (rkT[i] <= rkOk[t] + 0.0005) { there = 1; } }
        i = i + 1;
    }
    if (there < 1) {
        let out = 0;
        if (rkC >= NRANK) { if (rkT[NRANK] <= rkOk[t]) { out = 1; } }
        // pushed out fairly by ten quicker laps, or else put back
        if (out > 0) { rkOk[t] = 0; }
        else if (pendRk[t] <= 0) { pendRk[t] = rkOk[t]; }
    } else if (rkN[1] == pNick) {
        // the record holder's ghost
        rtGetG(t);
        if (indexOf(oRT, str(pNick, ',', Math.round(rkT[1] * 1000), ',')) != 1) { if (pendG[t] > 0) { wrUpload(t, rkT[1]); } }
    }
}

// save at a quiet moment, at most every few seconds
function profileStep() {
    popStep();
    syncStep();
    if (pSaveT > 0) { pSaveT = pSaveT - dt; }
    let quiet = 0;
    if (raceState == ST_MENU) { quiet = 1; }
    if (raceState == ST_DONE) { quiet = 1; }
    if (raceState == ST_STAND) { quiet = 1; }
    if (raceState == ST_QRES) { quiet = 1; }
    if (raceState == ST_TUNE) { quiet = 1; }
    if (raceState == ST_PROF) { quiet = 1; }
    if (raceState == ST_PAUSE) { quiet = 1; }
    if (raceState == ST_PHOTO) { quiet = 1; }
    if (raceState == ST_NET) { quiet = 1; }
    if (pLoaded > 0) {
        if (pSync > 0) {
            if (quiet > 0) {
                if (pVerT > 0) { pVerT = pVerT - dt; if (pVerT <= 0) { verifySave(); } }
                else if (pDirty > 0) { if (pSaveT <= 0) { saveProfile(); } }
                else { pChkT = pChkT - dt; if (pChkT <= 0) { pChkT = 2; selfCheck(); } }
                rankStep();
            }
        }
    }
}

// ---- ranking ----------------------------------------------------------------------------
let rkC = 0;                // rows parsed into rkN / rkT
let rkMe = 0;               // the player's row (0: not in the top NRANK)
function rankParse(tk) {
    rtGetK(tk);
    let s = oRT;
    rkC = 0;
    rkMe = 0;
    let L = strlen(s);
    let k = 1;
    let a = 1;              // where the name began (v2.0.0: cut out whole - see whoAmI on '')
    let c = 0;              // its comma
    let fld = 0;            // 0 before a record, 1 name, 2 time
    while (k <= L + 1) {
        let ch = '|';
        if (k <= L) { ch = charAt(s, k); }
        if (ch == '|') {
            if (fld == 2) {
                if (c > a) { if (k - 1 > c) {
                    if (rkC < NRANK) {
                        rkC = rkC + 1;
                        rkN[rkC] = substr(s, a, c - 1);
                        rkT[rkC] = substr(s, c + 1, k - 1) / 1000;
                        if (rkN[rkC] == pNick) { if (pGuest < 1) { rkMe = rkC; } }
                    }
                } }
            }
            fld = 1; a = k + 1;
        } else if (ch == ',') { if (fld == 1) { fld = 2; c = k; } }
        k = k + 1;
    }
}

function rankBuild(tk) {
    let s = '|';
    let i = 1;
    while (i <= rkC) {
        s = str(s, '|', rkN[i], ',', Math.round(rkT[i] * 1000));
        i = i + 1;
    }
    rtSetK(tk, s);
}

// the circuit's world record, for the records table
function rankAll() {
    let t = 1;
    while (t <= NTRK) {
        rankParse(t);
        recWR[t] = 0;
        recNm[t] = '-';
        if (rkC > 0) { recWR[t] = rkT[1]; recNm[t] = rkN[1]; }
        // v2.0.0: the player's own ranked laps, to be kept an eye on
        if (rkMe > 0) { if (rkOk[t] <= 0) { rkOk[t] = rkT[rkMe]; } else if (rkT[rkMe] < rkOk[t]) { rkOk[t] = rkT[rkMe]; } }
        t = t + 1;
    }
}

function rankSubmit(tk, lt) {
    if (pGuest < 1) {
        rankParse(tk);
        let better = 1;
        if (rkMe > 0) {
            if (rkT[rkMe] <= lt) { better = 0; }
            else {
                // take the old entry out
                let i = rkMe;
                while (i < rkC) { rkN[i] = rkN[i + 1]; rkT[i] = rkT[i + 1]; i = i + 1; }
                rkC = rkC - 1;
            }
        }
        if (better > 0) {
            let pos = rkC + 1;
            let i2 = 1;
            while (i2 <= rkC) {
                if (lt < rkT[i2]) { pos = i2; i2 = rkC; }
                i2 = i2 + 1;
            }
            if (pos <= NRANK) {
                let j = rkC;
                if (j >= NRANK) { j = NRANK - 1; }
                while (j >= pos) { rkN[j + 1] = rkN[j]; rkT[j + 1] = rkT[j]; j = j - 1; }
                rkN[pos] = pNick;
                rkT[pos] = lt;
                rkC = rkC + 1;
                if (rkC > NRANK) { rkC = NRANK; }
                rankBuild(tk);
                setRadio(str('RANKING: P', pos, ' ON ', trkName[tk]), 3);
                if (pos == 1) {
                    unlock(12);
                    // only with the ghost of this very lap
                    if (pendG[tk] > 0) { wrUpload(tk, lt); }
                }
            }
        }
        recWR[tk] = rkT[1];
        recNm[tk] = rkN[1];
    }
}

// ---- the world-record ghost ------------------------------------------------------------
// 'nick,ms,' then the path: the first sample as two 3-digit base-32 numbers
// (0.2 m units about -3.3 km), every next one as 2-digit deltas. Whole-unit
// deltas of whole-unit positions, so it decodes exactly (no drift). The yaw
// is taken from the direction of travel.
let wrS = '';
function b32(v, n) {
    if (n > 2) { wrS = str(wrS, charAt(SHA, idiv(v, 1024) + 1)); }
    wrS = str(wrS, charAt(SHA, mod(idiv(v, 32), 32) + 1), charAt(SHA, mod(v, 32) + 1));
}
function wrUpload(tk, lt) {
    let n = pbN[tk];
    if (n > 4) {
        pbBase(tk);
        let b = oPB;
        wrS = str(pNick, ',', Math.round(lt * 1000), ',');
        let px = Math.round((oPB2 > 1 ? pbX3[b + 1] : oPB2 > 0 ? pbX2[b + 1] : pbX[b + 1]) * 5);
        let pz = Math.round((oPB2 > 1 ? pbZ3[b + 1] : oPB2 > 0 ? pbZ2[b + 1] : pbZ[b + 1]) * 5);
        b32(px + 16384, 3);
        b32(pz + 16384, 3);
        let i = 2;
        while (i <= n) {
            let qx = Math.round((oPB2 > 1 ? pbX3[b + i] : oPB2 > 0 ? pbX2[b + i] : pbX[b + i]) * 5);
            let qz = Math.round((oPB2 > 1 ? pbZ3[b + i] : oPB2 > 0 ? pbZ2[b + i] : pbZ[b + i]) * 5);
            let dx = Math.max(0 - 511, Math.min(511, qx - px));
            let dz = Math.max(0 - 511, Math.min(511, qz - pz));
            b32(dx + 512, 2);
            b32(dz + 512, 2);
            px = px + dx;
            pz = pz + dz;
            i = i + 1;
        }
        rtSetG(tk, wrS);
    }
}

let oD = 0;
function d32(s, k, n) {
    oD = 0;
    let i = 0;
    while (i < n) { oD = oD * 32 + indexOf(SHA, charAt(s, k + i)) - 1; i = i + 1; }
}
// load circuit tk's world-record ghost into gh*; oWR 0 if there is none
let oWR = 0;
function loadWrGhost(tk) {
    oWR = 0;
    ghN = 0;
    rtGetG(tk);
    let s = oRT;
    let L = strlen(s);
    // v9: a ghost that is not the ranking's P1 (a lost race between two
    // record laps) is not shown as the world record
    rankParse(tk);
    if (rkC < 1) { L = 0; }
    else if (indexOf(s, str(rkN[1], ',', Math.round(rkT[1] * 1000), ',')) != 1) { L = 0; }
    if (L > 20) {
        let c1 = indexOf(s, ',');
        let rest = substr(s, c1 + 1, L);
        let c2 = indexOf(rest, ',') + c1;
        ghTime = substr(s, c1 + 1, c2 - 1) / 1000;
        let k = c2 + 1;
        d32(s, k, 3); let px = oD - 16384;
        d32(s, k + 3, 3); let pz = oD - 16384;
        k = k + 6;
        ghN = 1;
        ghX[1] = px / 5; ghZ[1] = pz / 5;
        while (k + 3 <= L) {
            if (ghN >= NGH) { break; }
            d32(s, k, 2); px = px + oD - 512;
            d32(s, k + 2, 2); pz = pz + oD - 512;
            ghN = ghN + 1;
            ghX[ghN] = px / 5;
            ghZ[ghN] = pz / 5;
            k = k + 4;
        }
        // headings from the path
        let i = 1;
        while (i <= ghN) {
            let a = i;
            let b = i + 1;
            if (b > ghN) { a = i - 1; b = i; }
            let dx = ghX[b] - ghX[a];
            let dz = ghZ[b] - ghZ[a];
            if (dx * dx + dz * dz > 0.01) { atan2d(dx, dz); ghW[i] = oAtan; }
            else if (i > 1) { ghW[i] = ghW[i - 1]; }
            else { ghW[i] = 0; }
            i = i + 1;
        }
        oWR = 1;
    }
}

// the ghost a time trial races (ghSel)
function pickGhost(tk) {
    ghN = 0;
    ghTime = 0;
    if (ghSel == 1) { loadPbGhost(tk); }
    else if (ghSel == 2) {
        if (tk <= NTRK) { loadWrGhost(tk); }
        if (ghN < 3) { loadPbGhost(tk); setMsg('NO WORLD RECORD GHOST YET - RACING YOUR BEST', 3); }
    }
}

// ---- practice: brake assist and back-on-track ----------------------------------------------
// Brakes for the player when the car is quicker than the racing line allows
// over the next few rings (the line's own speed profile).
function practiceAssist() {
    if (gMode == M_PR) {
        if (paSel == 1) {
            if (raceState == ST_RACE) {
                let v = Math.abs(caSpd[1]);
                let s = caSeg[1];
                let lim = 999;
                let k = 0;
                while (k < 24) {
                    let i = mod(s - 1 + k, NSEG) + 1;
                    let va = Math.sqrt(rlV[i] * rlV[i] + 2 * 17 * k * segStep);
                    if (va < lim) { lim = va; }
                    k = k + 1;
                }
                if (v > lim + 1.5) {
                    caThr[1] = 0;
                    let b = (v - lim) / 4;
                    if (b > 1) { b = 1; }
                    if (b > caBrk[1]) { caBrk[1] = b; }
                    rsAssist = 1;
                }
            }
        }
    }
}

function backOnTrack() {
    let s = caSeg[1];
    caX[1] = sgX[s];
    caZ[1] = sgZ[s];
    caY[1] = sgY[s];
    atan2d(sgDX[s], sgDZ[s]);
    caYaw[1] = oAtan;
    caVX[1] = 0; caVZ[1] = 0; caVY[1] = 0; caYR[1] = 0; caAir[1] = 0; caSpd[1] = 0;
    setMsg('BACK ON TRACK', 1.2);
}

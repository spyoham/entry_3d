// ============================================================
// career.js - v3.0.0 career mode. The player signs for one of NTEAM teams
// (the eight liveries, tier 1 the strongest), starting with the weakest.
// A season is NCRR rounds on circuits picked by the season number; each
// race is a grand prix with the player's RULES, LAPS and AI LEVEL. Each
// team's car is a little quicker or slower (tmPowC), and the player drives
// the team's car type with their own setup and no upgrades. Drivers change
// teams every season. The team sets a goal (a place in the standings), and
// the driver of the team one tier up is the rival (head to head, race by
// race). At the end of a season the goal, the rival and the title move the
// reputation, and the offers depend on the result: a better team, the
// same one, or - well short of the goal - a weaker one.
// Saved with the player's record (fields 63-78); the standings are the
// championship's (chPts / chOrd, game.js) while a season is on screen.
// ============================================================
const ST_CAR = 18;

let crOn = 0;               // racing a career round now
let crSeason = 0;           // (saved) 0: no career started yet
let crTeam = 8;             // (saved) 1 the strongest team .. NTEAM the weakest
let crRound = 0;            // (saved) rounds raced this season
let crRep = 0;              // (saved) reputation 0-100
let crTitles = 0;           // (saved)
let crRivW = 0;             // (saved) head to head with the rival this season
let crRivL = 0;
let crPhase = 0;            // (saved) 0 the season is on, 1 it is over: offers
let crRival = 2;            // the rival's car (from the teams)
let crGoal = 7;             // the team's goal: this place or better
let crPos = 8;              // the player's place in the standings now
let crRow = 1;
let crNRow = 3;
let crSure = 0;             // NEW CAREER asked once
let crOffN = 0;             // the offers (team tiers) at the end of a season
let crXP = 0;               // what the last season earned
let crSay = BLANK;          // the end of the season in a line
// the player's own settings, put back after a round
let cbMode = 1;
let cbWx = 1;
let cbTrk = 1;
let ocE = 0;
let ocA = 0;
let ocB = 0;
let ocT = 0;
let oCT = 1;

function crTrk(r) { oCT = mod(crSeason * 5 + (r - 1) * 3, NTRK) + 1; }
function crWxOf(r) { oCT = mod(crSeason * 13 + r * 7, 6) == 0 ? 2 : 1; }

// the other teams for the AI cars (rotated every season), the rival and the goal
function crAssign() {
    crTm[1] = crTeam;
    let c = 2;
    while (c <= NCAR) {
        let idx = mod(c - 2 + crSeason * 3, NTEAM - 1) + 1;
        let t = idx;
        if (t >= crTeam) { t = t + 1; }
        crTm[c] = t;
        c = c + 1;
    }
    let rt = crTeam - 1;
    if (rt < 1) { rt = 2; }
    c = 2;
    while (c <= NCAR) { if (crTm[c] == rt) { crRival = c; } c = c + 1; }
    crGoal = Math.max(1, crTeam - 1);
}

// the standings from the saved points (chPts / chOrd, as the championship's)
function crSort() {
    let c = 1;
    while (c <= NCAR) { chPts[c] = crPts[c]; c = c + 1; }
    chSort();
    crPos = 1;
    let i = 1;
    while (i <= NCAR) { if (chOrd[i] == 1) { crPos = i; } i = i + 1; }
}

// MAIN MENU > CAREER
function crEnter() {
    if (crSeason < 1) { crNew(); }
    crAssign();
    crSort();
    crRow = 1;
    crSure = 0;
    nCars = 0;
    raceState = ST_CAR;
}
function crNew() {
    crSeason = 1;
    crTeam = NTEAM;
    crRound = 0;
    crRep = 0;
    crRivW = 0;
    crRivL = 0;
    crPhase = 0;
    let c = 1;
    while (c <= NCAR) { crPts[c] = 0; c = c + 1; }
    crAssign();
    crSort();
    pDirty = 1;
}

// the next round
function crRace() {
    cbMode = gMode; cbWx = wx; cbTrk = selTrk;
    gMode = M_GP;
    crTrk(crRound + 1);
    selTrk = oCT;
    crWxOf(crRound + 1);
    wx = oCT;
    applyWeather();
    crAssign();
    crSort();
    chDone = 0;
    crOn = 1;
    startRace();
}
// back to the career screen (after the standings) or to the menu (toMenu)
function crEnd() {
    crOn = 0;
    gMode = cbMode; wx = cbWx; selTrk = cbTrk;
    applyWeather();
}
function crBack() {
    crEnd();
    crSort();
    crRow = 1;
    crSure = 0;
    nCars = 0;
    raceState = ST_CAR;
}

// (carStats, while crOn) car c in its team's colours and pace; the player's
// car has its own setup but no upgrades
function crUpOff() { ocE = upE; ocA = upA; ocB = upB; ocT = upT; upE = 0; upA = 0; upB = 0; upT = 0; }
function crUpOn() { upE = ocE; upA = ocA; upB = ocB; upT = ocT; }
function crScale(c) {
    let t = crTm[c];
    let f = tmPowC[t];
    caTop[c] = caTop[c] * f;
    caAcc[c] = caAcc[c] * f;
    caGrip[c] = caGrip[c] * (1 + (f - 1) * 0.5);
    caCol[c] = tmLvC[t];
}

// (ST_DONE, ENTER) the points, the rival, the next round
function crAfter() {
    awardPoints();
    let c = 1;
    while (c <= NCAR) { crPts[c] = chPts[c]; c = c + 1; }
    // head to head: who was classified ahead
    let pm = 0;
    let pr = 0;
    let i = 1;
    while (i <= nCars) {
        if (clsI[i] == 1) { pm = i; }
        if (clsI[i] == crRival) { pr = i; }
        i = i + 1;
    }
    if (pm > 0) { if (pr > 0) { if (pm < pr) { crRivW = crRivW + 1; } else { crRivL = crRivL + 1; } } }
    crRound = crRound + 1;
    if (crRound >= NCRR) { crSeasonOver(); }
    crSort();
    pDirty = 1;
    raceState = ST_STAND;
}

// the season is over: reputation, XP, the offers
function crSeasonOver() {
    crSort();
    let p = crPos;
    let rv = crRivW > crRivL ? 1 : 0;
    crRep = Math.max(0, Math.min(100, crRep + (crGoal - p) * 8 + (rv > 0 ? 10 : 0 - 5) + (p == 1 ? 15 : 0)));
    crXP = 200 + Math.max(0, 9 - p) * 40;
    if (p == 1) { crXP = crXP + 400; crTitles = crTitles + 1; unlock(14); }
    addXP(crXP);
    crSay = str('SEASON ', crSeason, ':  P', p, p <= crGoal ? '  -  GOAL MET' : '  -  GOAL MISSED', rv > 0 ? '  -  RIVAL BEATEN' : '  -  RIVAL AHEAD', '  -  +', crXP, ' XP');
    crPhase = 1;
}
// the offers for the season over (oCrO 1..crOffN: team tiers)
function crOffers() {
    let p = crPos;
    crOffN = 0;
    if (p <= crGoal - 2) { if (crTeam > 2) { crOffN = crOffN + 1; crOff[crOffN] = crTeam - 2; } }
    else if (p == 1) { if (crTeam > 2) { crOffN = crOffN + 1; crOff[crOffN] = crTeam - 2; } }
    if (p <= crGoal) { if (crTeam > 1) { crOffN = crOffN + 1; crOff[crOffN] = crTeam - 1; } }
    else if (crRep >= 60) { if (crTeam > 1) { crOffN = crOffN + 1; crOff[crOffN] = crTeam - 1; } }
    if (p <= crGoal + 2) { crOffN = crOffN + 1; crOff[crOffN] = crTeam; }
    else { crOffN = crOffN + 1; crOff[crOffN] = Math.min(NTEAM, crTeam + 1); }
}
// sign for team tier t: the next season
function crSign(t) {
    crTeam = t;
    crSeason = crSeason + 1;
    crRound = 0;
    crRivW = 0;
    crRivL = 0;
    crPhase = 0;
    let c = 1;
    while (c <= NCAR) { crPts[c] = 0; c = c + 1; }
    crAssign();
    crSort();
    crRow = 1;
    pDirty = 1;
}

// the career screen's keys
function crKeys() {
    if (crPhase > 0) { crOffers(); crNRow = crOffN + 2; } else { crNRow = 3; }
    if (actKey == 40) { crRow = mod(crRow, crNRow) + 1; crSure = 0; }
    else if (actKey == 38) { crRow = mod(crRow + crNRow - 2, crNRow) + 1; crSure = 0; }
    else if (actKey == 27) { toMenu(); }
    else if (actKey == 13) {
        if (crRow == crNRow) { toMenu(); }
        else if (crRow == crNRow - 1) {
            if (crSure > 0) { crNew(); crSure = 0; crRow = 1; } else { crSure = 1; }
        } else if (crPhase > 0) { crSign(crOff[crRow]); }
        else { crRace(); }
    }
}

// (mergeRec) a saved career further on than this session's wins
function crMerge() {
    if (nF >= 78) {
        let sv = pF[63] * 1000 + pF[65] * 10 + pF[70] * 1;
        let me = crSeason * 1000 + crRound * 10 + crPhase;
        if (sv > me) {
            crSeason = pF[63] * 1; crTeam = pF[64] * 1; crRound = pF[65] * 1; crRep = pF[66] * 1;
            crTitles = pF[67] * 1; crRivW = pF[68] * 1; crRivL = pF[69] * 1; crPhase = pF[70] * 1;
            let c = 1;
            while (c <= NCAR) { crPts[c] = pF[70 + c] * 1; c = c + 1; }
            crAssign();
        }
    }
}

// ---- the career screen -----------------------------------------------------------------
function crTeamName(t) { oNm = str(lvName[tmLvC[t]], ' RACING'); }
function drawCareer() {
    box(0 - 240, 132, 240, 94, C_PANEL);
    box(0 - 240, 94, 240, 92, lvHex[tmLvC[crTeam]]);
    box(0 - 240, 92, 240, 0 - 106, '#10151d');
    // the standings panel
    box(6, 88, 236, 0 - 20, '#0b0f15');
    let i = 1;
    while (i <= crNRow) {
        netRowY(i + 5);
        box(0 - 236, oRowY + 6, 0 - 6, oRowY - 6, i == crRow ? C_RED : C_PANEL2);
        i = i + 1;
    }
    box(0 - 240, 0 - 112, 240, 0 - 132, C_PANEL);
}
function hudCareer() {
    tx(9, 'CAREER', 0 - 232, 116, 21, C_WHITE, 1);
    crTeamName(crTeam);
    tx(10, str('SEASON ', crSeason, '   ', oNm, '   (CAR RANK ', crTeam, ' OF ', NTEAM, ')'), 0 - 232, 100, 8, C_GOLD, 1);
    let r = Math.min(crRound + 1, NCRR);
    crTrk(r);
    let nt = oCT;
    let nx = trkName[nt];
    crWxOf(r);
    if (oCT > 1) { nx = str(nx, '  (RAIN)'); }
    if (crPhase > 0) { tx(51, crSay != BLANK ? crSay : str('SEASON ', crSeason, ' IS OVER  -  P', crPos), 0 - 226, 80, 7, C_GOLD, 1); }
    else { tx(51, str('ROUND ', r, ' / ', NCRR, '     NEXT:  ', nx), 0 - 226, 80, 9, C_WHITE, 1); }
    tx(52, str('GOAL:  P', crGoal, ' OR BETTER        NOW:  P', crPos), 0 - 226, 66, 8, crPos <= crGoal ? '#5cf07a' : '#ff8a7a', 1);
    let rv = crRival;
    crTeamName(crTm[rv]);
    tx(53, str('RIVAL:  ', drvName[rv], '  (', oNm, ')     HEAD TO HEAD  ', crRivW, ' - ', crRivL), 0 - 226, 54, 8, C_WHITE, 1);
    tx(54, str('CAR:  ', ctName[tmCarC[crTeam]], '   PACE ', Math.round(tmPowC[crTeam] * 1000) / 10, '%     REPUTATION ', crRep, '     TITLES ', crTitles), 0 - 226, 42, 7, C_DIM, 1);
    tx(55, str(ruleName[rules], '   ', lapOpt[lapSel], ' LAPS   AI ', aiName[aiDiff], '   (RACE SETUP)'), 0 - 226, 30, 7, C_DIM, 1);
    // the rows
    let i = 1;
    while (i <= 6) {
        netRowY(i + 5);
        let lab = BLANK;
        if (i <= crNRow) {
            if (i == crNRow) { lab = '<  BACK TO THE MENU'; }
            else if (i == crNRow - 1) { lab = crSure > 0 ? 'ENTER AGAIN: START A NEW CAREER' : 'NEW CAREER'; }
            else if (crPhase > 0) {
                let t = crOff[i];
                crTeamName(t);
                let w = 'STAY WITH ';
                if (t < crTeam) { w = 'MOVE UP TO '; } else if (t > crTeam) { w = 'DROP TO '; }
                lab = str(w, oNm, '  (CAR RANK ', t, ')');
            } else { lab = str('RACE ROUND ', r, ':  ', trkName[nt]); }
        }
        if (lab == BLANK) { txOff(23 + i); } else { tx(23 + i, lab, 0 - 226, oRowY, 9, i == crRow ? C_WHITE : '#dfe5ee', 1); }
        i = i + 1;
    }
    // the standings
    tx(50, crPhase > 0 ? 'FINAL STANDINGS' : 'STANDINGS', 14, 80, 9, C_GOLD, 1);
    i = 1;
    while (i <= NCAR) {
        let o = chOrd[i];
        padR(drvName[o], 11);
        let nm = oPad;
        padR(lvName[tmLvC[crTm[o]]], 9);
        tx(36 + i, str(o == 1 ? '>' : ' ', i, '  ', nm, oPad, chPts[o]), 14, 66 - (i - 1) * 10.5, 7, o == 1 ? C_WHITE : lvHex[tmLvC[crTm[o]]], 1);
        i = i + 1;
    }
    tx(12, 'UP/DOWN select   ENTER choose   ESC menu', 0, 0 - 122, 9, '#c9d1de', 0);
}

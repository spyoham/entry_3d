// ============================================================
// daily.js - v2.3.0 the daily challenge. Every day (the computer's own
// date) picks one circuit, car, rule set, weather and one of two tasks:
//   HOT LAP      the fastest single lap
//   3-LAP STINT  three clean laps in a row, added up
// It is a time trial in the day's conditions, in the day's car with the
// base setup and no upgrades, so everybody drives the same thing.
// Results rank in item DAYK of ?!rank (and its ghost in ?!ghost), written
// 'D<day>|nick,ms|nick,ms...': an item of another day reads as empty, so
// the first result of a new day starts a new ranking. The ranking is kept
// by the same write / check / heal steps as the circuits' (profile.js).
// The first result of the day earns XP, more for a streak of days; the
// save keeps the last day done, the streak and the day's best (fields 59-62).
// ============================================================
const DK_LAP = 1;
const DK_STINT = 2;

let dyN = 0;                // today's day number (days since 1970-01-01)
let dyMon = 1;              // ... its month and day, for the card
let dyDom = 1;
let dyKind = 1;             // the challenge of the day
let dyTrk = 1;
let dyCar = 1;
let dyWx = 1;
let dyRules = 1;
let dyOn = 0;               // driving it now
let dyLastN = 0;            // (saved) the day a challenge was last done
let dyStreak = 0;           // (saved) days in a row
let dyBestN = 0;            // (saved) the day of dyBestT
let dyBestT = 0;            // (saved) the best result of that day, s
let dyXP = 0;               // what the last day done earned
let dyLapB = 0;             // this session's best lap in today's challenge (the ghost slot DAYK)
let dyRunN = 0;             // stint: clean laps in a row, and the last three
let dyR1 = 0;
let dyR2 = 0;
let dyR3 = 0;
let dyTopC = 0;             // today's ranking, as last read (dyTN / dyTT)
let dyMe = 0;
// the offline settings, put back after the challenge
let dbMode = 1;
let dbRules = 1;
let dbWx = 1;
let dbTrk = 1;
let dbGh = 1;
let oDN = 0;

// the day number of the computer's date (Gregorian, from March so the leap
// day comes last)
function dyToday() {
    let y = dateYear();
    let m = dateMonth();
    let d = dateDay();
    dyMon = m;
    dyDom = d;
    if (m <= 2) { y = y - 1; m = m + 12; }
    oDN = 365 * y + idiv(y, 4) - idiv(y, 100) + idiv(y, 400) + idiv(153 * (m - 3) + 2, 5) + d - 719469;
}

// day n's challenge: every circuit once in NTRK days, the rest mixed apart
function dyMake() {
    dyTrk = mod(dyN * 8, NTRK) + 1;
    dyKind = mod(dyN, 3) == 2 ? DK_STINT : DK_LAP;
    dyWx = mod(dyN * 5 + 3, 7) < 2 ? 2 : 1;
    dyCar = mod(dyN * 3 + 1, NCARTYPE) + 1;
    dyRules = mod(dyN * 11 + 2, 5) < 2 ? R_SIM : R_ARC;
}

// every frame: a new day (not while driving the old one) brings a new challenge
function dyStep() {
    if (dyOn < 1) {
        dyToday();
        if (oDN != dyN) {
            dyN = oDN;
            dyMake();
            dyLapB = 0;
            pbN[DAYK] = 0;
            recLap[DAYK] = 0;
            rkSeen[DAYK] = '-';
            // (yesterday's lap is not today's: nothing of it to write or put back)
            rkOk[DAYK] = 0;
            pendRk[DAYK] = 0;
            pendG[DAYK] = 0;
            dyTopC = 0;
            dyMe = 0;
        }
    }
}

// MAIN MENU > DAILY CHALLENGE
function dyStart() {
    dbMode = gMode; dbRules = rules; dbWx = wx; dbTrk = selTrk; dbGh = ghSel;
    gMode = M_TT;
    rules = dyRules;
    wx = dyWx;
    ghSel = 3;
    selTrk = dyTrk;
    applyWeather();
    ghTrk = 0 - 1;
    dyOn = 1;
    dyRunN = 0;
    startRace();
}
// (toMenu) back to the player's own settings
function dyEnd() {
    dyOn = 0;
    gMode = dbMode; rules = dbRules; wx = dbWx; selTrk = dbTrk; ghSel = dbGh;
    ghTrk = 0 - 1;
}

// the ghost: today's leader (hot lap), else this session's best lap
function dyGhost() {
    ghN = 0;
    ghTime = 0;
    if (dyKind == DK_LAP) { loadWrGhost(DAYK); }
    if (ghN < 3) { if (dyLapB > 0) { if (pbN[DAYK] > 4) { recLap[DAYK] = dyLapB; loadPbGhost(DAYK); } } }
}

// (lapDone) a valid lap in the challenge
function dyLap(lt) {
    addXP(15);
    stKm = stKm + rsKm;
    rsKm = 0;
    circDone(curTrk);
    let nb = 0;
    if (dyLapB <= 0) { nb = 1; } else if (lt < dyLapB) { nb = 1; }
    lgOk = 0;
    if (nb > 0) { dyLapB = lt; recLap[DAYK] = lt; lapGhost(DAYK, lt); }
    let v = 0;
    if (dyKind == DK_LAP) { v = lt; }
    else {
        dyR1 = dyR2; dyR2 = dyR3; dyR3 = lt;
        dyRunN = dyRunN + 1;
        if (dyRunN >= 3) { v = dyR1 + dyR2 + dyR3; }
        else { setMsg(str('STINT  ', dyRunN, ' / 3 CLEAN LAPS'), 2.2); }
    }
    if (v > 0) {
        dyDone();
        let better = 0;
        if (dyBestN != dyN) { better = 1; } else if (dyBestT <= 0) { better = 1; } else if (v < dyBestT) { better = 1; }
        if (better > 0) {
            dyBestN = dyN;
            dyBestT = v;
            pDirty = 1;
            fmtTime(v);
            setMsg(str('NEW DAILY BEST  ', oTime), 2.6);
            if (pGuest < 1) {
                pendRk[DAYK] = v;
                pendG[DAYK] = 0;
                if (dyKind == DK_LAP) { if (nb > 0) { pendG[DAYK] = lgOk; } }
                pRecNow = 1;
            }
        }
    }
    if (nb > 0) { dyGhost(); }
}

// the first result of the day: XP, more for each day in a row (up to 5)
function dyDone() {
    if (dyLastN != dyN) {
        if (dyLastN == dyN - 1) { dyStreak = dyStreak + 1; } else { dyStreak = 1; }
        dyLastN = dyN;
        dyXP = 100 + 25 * Math.min(dyStreak - 1, 4);
        addXP(dyXP);
        setBanner('DAILY CHALLENGE DONE', 2.2);
        setRadio(str('+', dyXP, ' XP   -   ', dyStreak, dyStreak > 1 ? ' DAYS IN A ROW' : ' DAY'), 4);
        pDirty = 1;
    }
}

// the streak as it stands today (broken when yesterday was missed)
function dyStreakNow() {
    oDS = 0;
    if (dyLastN >= dyN - 1) { oDS = dyStreak; }
}
let oDS = 0;

// (rankSee) today's ranking for the card and the HUD
function dySee() {
    dyTopC = rkC;
    dyMe = rkMe;
    let i = 1;
    while (i <= 5) {
        if (i <= rkC) { dyTN[i] = rkN[i]; dyTT[i] = rkT[i]; } else { dyTN[i] = '-'; dyTT[i] = 0; }
        i = i + 1;
    }
}

// (mergeRec) the daily fields of a saved record, the newer / better winning
function dyMerge() {
    if (nF >= 62) {
        let ln = pF[59] * 1;
        let sk = pF[60] * 1;
        if (ln > dyLastN) { dyLastN = ln; dyStreak = sk; }
        else if (ln == dyLastN) { dyStreak = Math.max(dyStreak, sk); }
        let bn = pF[61] * 1;
        let bt = pF[62] / 1000;
        if (bt > 0) {
            if (bn > dyBestN) { dyBestN = bn; dyBestT = bt; }
            else if (bn == dyBestN) { if (dyBestT <= 0) { dyBestT = bt; } else if (bt < dyBestT) { dyBestT = bt; } }
        }
    }
}

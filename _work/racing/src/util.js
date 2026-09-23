// ============================================================
// util.js - shared scratch globals and small helpers.
// Entry value-functions cost ~2 frames per call, so every helper here is a
// normal function that writes its result into a dedicated global.
// ============================================================
// Entry's compare block coerces numeric-looking strings, then uses a loose !=.
// That makes '' == 0, so a HUD slot holding '' can never be told apart from the
// 0 a freshly loaded variable starts at, and the slot never clears. BLANK is a
// zero-width space: it renders as nothing but is never equal to a number.
const BLANK = '\u200B';

let gt = 0;             // game clock, seconds
let dt = 0;             // frame delta, seconds (clamped)
let lastT = 0;
let frameId = 0;

let oAtan = 0;          // atan2d result (degrees)
let oRnd = 0;           // scRnd result, 0..1
let oPut = 0;           // did the last scPut fit?
let oWrap = 0;          // wrapAng result
let oTime = BLANK;         // fmtTime result
let oNum = BLANK;          // fmtNum result
let oSec = BLANK;          // fmtSec / fmtDelta result
let oPad = BLANK;          // padR result

// atan2 in degrees, (-180, 180]
function atan2d(ay, ax) {
    if (ax > 0) { oAtan = atand(ay / ax); }
    else if (ax < 0) {
        if (ay >= 0) { oAtan = atand(ay / ax) + 180; } else { oAtan = atand(ay / ax) - 180; }
    } else if (ay > 0) { oAtan = 90; }
    else if (ay < 0) { oAtan = -90; }
    else { oAtan = 0; }
}

// fold an angle into (-180, 180]
function wrapAng(a) {
    oWrap = a - 360 * Math.floor((a + 180) / 360);
}

// mm:ss.mmm  (t < 0 means "no time yet"). Zero padding is added with
// explicit branches, not BLANK fillers, so equal times have equal lengths
// and the results tables line up.
let oMs = BLANK;
function fmtMs(ms) {
    oMs = str(ms);
    if (ms < 100) { oMs = str('0', oMs); }
    if (ms < 10) { oMs = str('0', oMs); }
}
function fmtTime(t) {
    if (t < 0) { oTime = '--:--.---'; }
    else {
        let m = Math.floor(t / 60);
        let s = t - m * 60;
        let ms = Math.floor((s - Math.floor(s)) * 1000);
        s = Math.floor(s);
        fmtMs(ms);
        let ss = str(s);
        if (s < 10) { ss = str('0', ss); }
        oTime = str(m, ':', ss, '.', oMs);
    }
}

// integer with no decimals (Entry prints floats with long tails)
function fmtNum(v) {
    oNum = str(Math.round(v));
}

// seconds with milliseconds: 31.402, or 1:02.113 past a minute
function fmtSec(t) {
    if (t >= 60) { fmtTime(t); oSec = oTime; }
    else {
        let s = Math.floor(t);
        fmtMs(Math.floor((t - s) * 1000));
        oSec = str(s, '.', oMs);
    }
}

// signed difference: +0.214 / -1.030
function fmtDelta(d) {
    let a = Math.abs(d);
    let s = Math.floor(a);
    fmtMs(Math.floor((a - s) * 1000));
    oSec = str(d < 0 ? '-' : '+', s, '.', oMs);
}

// pad a string with spaces on the right to n characters
function padR(t, n) {
    oPad = t;
    let k = strlen(t);
    while (k < n) { oPad = str(oPad, ' '); k = k + 1; }
}

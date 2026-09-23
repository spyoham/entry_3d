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

// mm:ss.mmm  (t < 0 means "no time yet")
function fmtTime(t) {
    if (t < 0) { oTime = '--:--.---'; }
    else {
        let m = Math.floor(t / 60);
        let s = t - m * 60;
        let ms = Math.floor((s - Math.floor(s)) * 1000);
        s = Math.floor(s);
        oTime = str(m < 10 ? '0' : BLANK, m, ':', s < 10 ? '0' : BLANK, s, '.', ms < 100 ? '0' : BLANK, ms < 10 ? '0' : BLANK, ms);
    }
}

// integer with no decimals (Entry prints floats with long tails)
function fmtNum(v) {
    oNum = str(Math.round(v));
}

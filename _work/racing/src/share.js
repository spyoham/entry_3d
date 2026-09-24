// ============================================================
// share.js - v7 track share code: the editor's circuit as a short string of
// letters and digits that someone else can type (or paste) into their own
// editor to drive the very same circuit.
//
// Code = 'R' + node count (2 digits) + 7 digits per node + checksum (2 digits),
// in Crockford's base 32 (no I, L, O or U, so it reads back unambiguously;
// those four are forgiven on input, and case, spaces and dashes are ignored).
// Per node: x and z on a 4 m grid (2 digits each, +-2 km), height in 2 m
// steps (1 digit, -32..+30 m), width in half metres from 5 m (1 digit) and
// the tunnel / jump / barrier / checkpoint flags (1 digit).
// ============================================================
const SHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SHB = '0123456789abcdefghjkmnpqrstvwxyz';
let shCode = BLANK;
let shShow = 0;             // the code panel is up in the editor
let shLines = 0;
let shSum = 0;
let oShOk = 0;

function shPut1(v) { shCode = str(shCode, charAt(SHA, v + 1)); shSum = shSum + v; }
function shPut2(v) { shPut1(idiv(v, 32)); shPut1(mod(v, 32)); }

function shEncode() {
    let base = ctlOff[EDTRK];
    let n = ctlCnt[EDTRK];
    shSum = 0;
    shCode = 'R';
    shPut2(n);
    let i = 1;
    while (i <= n) {
        let x = Math.round((ctlX[base + i] + 2048) / 4);
        let z = Math.round((ctlZ[base + i] + 2048) / 4);
        let y = Math.round(ctlY[base + i] / 2) + 16;
        let w = Math.round((ctlW[base + i] - 5) * 2);
        x = Math.max(0, Math.min(1023, x));
        z = Math.max(0, Math.min(1023, z));
        y = Math.max(0, Math.min(31, y));
        w = Math.max(0, Math.min(31, w));
        let f = ctlF[base + i];
        let fl = mod(f, 2) + 2 * mod(idiv(f, 2), 2) + 4 * mod(idiv(f, 4), 2) + 8 * mod(idiv(f, 16), 2);
        shPut2(x); shPut2(z); shPut1(y); shPut1(w); shPut1(fl);
        i = i + 1;
    }
    let s = mod(shSum, 1024);
    shPut2(s);
    // for the screen: groups of five, twelve groups a line
    let L = strlen(shCode);
    shLines = 0;
    let line = BLANK;
    let k = 1;
    let g = 0;
    while (k <= L) {
        line = str(line, charAt(shCode, k));
        if (mod(k, 5) == 0) {
            g = g + 1;
            if (g >= 12) { shLines = shLines + 1; shLn[shLines] = line; line = BLANK; g = 0; }
            else { line = str(line, ' '); }
        }
        k = k + 1;
    }
    if (strlen(line) > 1) { shLines = shLines + 1; shLn[shLines] = line; }
}

// one typed character -> 0..31, or -1 for a separator, -2 for rubbish
let oShD = 0;
function shDigit(ch) {
    oShD = indexOf(SHA, ch) - 1;
    if (oShD < 0) { oShD = indexOf(SHB, ch) - 1; }
    if (oShD < 0) {
        if (indexOf('Oo', ch) > 0) { oShD = 0; }
        else if (indexOf('IiLl', ch) > 0) { oShD = 1; }
        else if (indexOf(' -', ch) > 0) { oShD = 0 - 1; }
        else if (ch == BLANK) { oShD = 0 - 1; }
        else { oShD = 0 - 2; }
    }
}

function shDecode(s) {
    oShOk = 0;
    let L = strlen(s);
    let nv = 0;
    let bad = 0;
    let head = 0;
    let k = 1;
    while (k <= L) {
        let ch = charAt(s, k);
        if (head < 1) {
            // everything up to the leading R is ignored
            if (indexOf('Rr', ch) > 0) { head = 1; }
        } else {
            shDigit(ch);
            if (oShD >= 0) {
                if (nv < 5 * MAXCTL + 6) { nv = nv + 1; shV[nv] = oShD; }
            } else if (oShD < 0 - 1) { bad = 1; }
        }
        k = k + 1;
    }
    if (bad < 1) {
        if (nv >= 4) {
            let n = shV[1] * 32 + shV[2];
            if (n >= 5) {
                if (n <= MAXCTL) {
                    if (nv == 4 + 7 * n) {
                        let sum = 0;
                        let q = 1;
                        while (q <= nv - 2) { sum = sum + shV[q]; q = q + 1; }
                        if (mod(sum, 1024) == shV[nv - 1] * 32 + shV[nv]) {
                            let base = ctlOff[EDTRK];
                            let i = 1;
                            while (i <= n) {
                                let p = 2 + (i - 1) * 7;
                                ctlX[base + i] = (shV[p + 1] * 32 + shV[p + 2]) * 4 - 2048;
                                ctlZ[base + i] = (shV[p + 3] * 32 + shV[p + 4]) * 4 - 2048;
                                ctlY[base + i] = (shV[p + 5] - 16) * 2;
                                ctlW[base + i] = 5 + shV[p + 6] / 2;
                                let fl = shV[p + 7];
                                ctlF[base + i] = mod(fl, 2) + 2 * mod(idiv(fl, 2), 2) + 4 * mod(idiv(fl, 4), 2) + 16 * mod(idiv(fl, 8), 2);
                                i = i + 1;
                            }
                            ctlCnt[EDTRK] = n;
                            edSel = 1;
                            edDirty = 1;
                            oShOk = 1;
                        }
                    }
                }
            }
        }
    }
}

// editor: I asks for a code and loads it
function shImport() {
    ask('PASTE OR TYPE A TRACK SHARE CODE (STARTS WITH R)');
    shDecode(answer());
    if (oShOk > 0) { shShow = 0; setMsg('TRACK LOADED FROM THE CODE', 2.5); }
    else { setMsg('THAT CODE DID NOT WORK - CHECK IT AND TRY AGAIN', 3); }
    // the game stood still while the question was up: restart the clocks
    lastT = timer();
    simT = lastT;
    rtSec = 0 - 1;
    rtN = 0;
    rtK = 1;
}

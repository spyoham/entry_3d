// ============================================================
// savecode.js - v11 backup code: the player's save as a string they keep
// themselves, for when the online save is lost. PROFILE: C copies it,
// V loads one.
//
// Code = 'S' + version + salt (2) + body + check (8), all in Crockford's
// base 32 like the track share code (share.js; shDigit reads it back, so
// case, spaces and dashes do not matter).
//   body:  the save record's fields (buildRec, after the nickname) as the
//          symbols of SVSYM, each shifted by a key stream seeded from the
//          nickname and the salt. Only 13 of the 32 letters decode at each
//          place, so a changed letter mostly fails at once.
//   check: two keyed hashes (20 bits each) of the version, the salt, the
//          NICKNAME and the fields. A code works only for the player it was
//          made for, and a made-up or edited code passes about once in 10^12.
// The keys are in the work itself, so this stops casual editing and sharing
// codes between accounts, not someone who reads the blocks.
//
// Copying: plain Entry puts the code in the table 'svtb' and opens its window
// (the text can be selected there); tessvm draws tables on its canvas, so
// there the code goes to $CLIPBOARD, which tessvm copies after asking.
// Loading: ask and wait (paste), then a merge where the larger / better value
// wins (mergeRec 0), so an old code can never take progress away.
// ============================================================
const SVSYM = '0123456789,.-';
const SVVER = 1;
const SVACH = Math.pow(2, NACH);
const SVCIRC = Math.pow(2, NTRK);
let $CLIPBOARD = BLANK;
let svCode = BLANK;
let svH1 = 0;
let svH2 = 0;
let svX = 0;
let oSvS = 0;
let oSvK = 0;
let oSvOk = 0;              // 1 loaded; 0 not valid

// one nickname character -> a number (Hangul syllables by their place in HANGUL)
function svNickSym(ch) {
    oSvS = indexOf(HCH, ch);
    if (oSvS < 1) {
        let q = indexOf(HANGUL, ch);
        if (q > 0) { oSvS = 100 + q; } else { oSvS = 99; }
    }
}

function svMac(v) {
    svH1 = mod(svH1 * 69069 + v + 1, 999983);
    svH2 = mod(svH2 * 40503 + v * 7 + 5, 999979);
}

function svKey() {
    svX = mod(svX * 48271 + 11939, 999331);
    oSvK = mod(idiv(svX, 3), 32);
}

// the check starts from the version, salt and nickname; the key stream from
// the nickname and salt
function svBegin(s1, s2) {
    svH1 = 314159;
    svH2 = 271828;
    svMac(SVVER); svMac(s1); svMac(s2);
    let hn = 0;
    let L = strlen(pNick);
    let k = 1;
    while (k <= L) {
        svNickSym(charAt(pNick, k));
        svMac(oSvS);
        hn = mod(hn * 131 + oSvS, 999331);
        k = k + 1;
    }
    svMac(L);
    svX = mod(hn * 7331 + s1 * 1031 + s2 * 97 + 424243, 999331);
}

function svPut4(h) {
    let d = 32768;
    while (d >= 1) {
        svCode = str(svCode, charAt(SHA, mod(idiv(h, d), 32) + 1));
        d = d / 32;
    }
}

function svEncode() {
    buildRec();
    let f = substr(pRec, strlen(pNick) + 3, strlen(pRec));
    let s1 = rand(0, 31);
    let s2 = rand(0, 31);
    svBegin(s1, s2);
    svCode = str('S', charAt(SHA, SVVER + 1), charAt(SHA, s1 + 1), charAt(SHA, s2 + 1));
    let L = strlen(f);
    let k = 1;
    while (k <= L) {
        let v = indexOf(SVSYM, charAt(f, k)) - 1;
        if (v < 0) { v = 12; }
        svMac(v);
        svKey();
        svCode = str(svCode, charAt(SHA, mod(v + oSvK, 32) + 1));
        k = k + 1;
    }
    svPut4(svH1);
    svPut4(svH2);
}

// the fields decoded into pF are what a save of this game can hold
function svSane() {
    let ok = 1;
    let k = 2;
    while (k <= 32) {
        if (strlen(pF[k]) < 1) { ok = 0; }
        else if (pF[k] < 0) { ok = 0; }
        k = k + 1;
    }
    if (ok > 0) {
        if (pF[2] > 99999999) { ok = 0; }
        k = 3;
        while (k <= 6) { if (pF[k] > UPMAX) { ok = 0; } k = k + 1; }
        while (k <= 10) { if (pF[k] > 6) { ok = 0; } k = k + 1; }
        if (pF[11] >= SVACH) { ok = 0; }
        if (pF[16] >= SVCIRC) { ok = 0; }
        if (nF >= 35) {
            k = 33;
            while (k <= 35) { if (strlen(pF[k]) < 1) { ok = 0; } else if (pF[k] < 0) { ok = 0; } else if (pF[k] > 6) { ok = 0; } k = k + 1; }
        }
        if (nF >= 36) { if (strlen(pF[36]) < 1) { ok = 0; } else if (pF[36] < 0) { ok = 0; } else if (pF[36] > 99) { ok = 0; } }
    }
    oSvOk = ok;
}

function svDecode(s) {
    oSvOk = 0;
    let L = strlen(s);
    let n = 0;
    let bad = 0;
    let head = 0;
    let k = 1;
    while (k <= L) {
        let ch = charAt(s, k);
        if (head < 1) {
            // everything up to the leading S is ignored
            if (indexOf('Ss', ch) > 0) { head = 1; }
        } else {
            shDigit(ch);
            if (oShD >= 0) {
                if (n < SVMAX) { n = n + 1; svV[n] = oShD; } else { bad = 1; }
            } else if (oShD < 0 - 1) { bad = 1; }
        }
        k = k + 1;
    }
    if (bad < 1) { if (n >= 3 + 8 + 40) { if (svV[1] == SVVER) {
        svBegin(svV[2], svV[3]);
        let nb = n - 8;
        let f = '';
        let okv = 1;
        let q = 4;
        while (q <= nb) {
            svKey();
            let v = mod(svV[q] - oSvK + 32, 32);
            if (v > 12) { okv = 0; }
            else { svMac(v); f = str(f, charAt(SVSYM, v + 1)); }
            q = q + 1;
        }
        if (okv > 0) {
            let h1 = svV[nb + 1] * 32768 + svV[nb + 2] * 1024 + svV[nb + 3] * 32 + svV[nb + 4];
            let h2 = svV[nb + 5] * 32768 + svV[nb + 6] * 1024 + svV[nb + 7] * 32 + svV[nb + 8];
            if (h1 == svH1) { if (h2 == svH2) {
                parseRec(str('|', pNick, ',', f), 2);
                // v3.0 codes carry three more setup fields (33-35)
                let nOk = 0;
                if (nF == 32) { nOk = 1; }
                if (nF == 35) { nOk = 1; }
                // v4.0 codes: + the circuits version (36)
                if (nF == 36) { nOk = 1; }
                if (nOk > 0) {
                    svSane();
                    if (oSvOk > 0) {
                        mergeRec(0);
                        pDirty = 1;
                    }
                }
            } }
        }
    } } }
}

// PROFILE: C
function svCopy() {
    if (pLoaded < 1) { setMsg('WAIT - YOUR SAVE IS STILL LOADING', 2.5); }
    else {
        svEncode();
        if ($TESSVM == 1) {
            $CLIPBOARD = svCode;
            setMsg('ALLOW THE COPY IN THE BOX ON THE SCREEN, THEN KEEP THE CODE SOMEWHERE SAFE', 6);
        } else {
            tableSet('svtb', 2, 1, svCode);
            tableShow('svtb');
            setMsg('THE CODE IS IN THE TABLE WINDOW - SELECT IT, CTRL+C AND KEEP IT SAFE', 6);
        }
    }
}

// PROFILE: V
function svLoad() {
    if (pLoaded < 1) { setMsg('WAIT - YOUR SAVE IS STILL LOADING', 2.5); }
    else {
        ask('PASTE YOUR BACKUP CODE (IT STARTS WITH S)');
        svDecode(answer());
        if (oSvOk > 0) { setMsg(str('BACKUP CODE LOADED - LEVEL ', pLv, ', ', pXP, ' XP'), 4); }
        else { setMsg('THAT CODE DID NOT WORK FOR THIS ACCOUNT - CHECK IT AND TRY AGAIN', 4); }
        // v3.2: whatever is still held (the Enter that sent the answer, a V
        // whose release a Cmd+V paste swallowed) is not a new press
        keysStale();
        // the game stood still while the question was up: restart the clocks
        lastT = timer();
        simT = lastT;
        rtSec = 0 - 1;
        rtN = 0;
        rtK = 1;
    }
}

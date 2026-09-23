// Byte-level BPE tokenizer (GPT-2 / SmolLM2 style): bytes -> printable symbols via BU,
// merges by rank from MG, ids from VT, decode through a UTF-8 state machine.
// build.mjs picks this file unless the model's tokenizer.json is byte-fallback sentencepiece.
// ---------------------------------------------------------------- tokenizer
let ttext = '';
let word = '';
function charClass(ch) {
    // 0 letter, 1 digit, 2 space, 3 other ASCII, 4 newline/tab
    cls = 0;
    if (indexOf(' ', ch) > 0) { cls = 2; }
    else if (indexOf('\n\t\r', ch) > 0) { cls = 4; }
    else if (indexOf('0123456789', ch) > 0) { cls = 1; }
    else if (indexOf('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ch) > 0) { cls = 0; }
    else if (indexOf(ASCIIP, ch) > 0) { cls = 3; }
    else { cls = 0; }
}
let cls = 0;

// text -> list PRE of pre-tokens (raw chars), GPT-2 split rules (+ single digits)
function pretokenize(text) {
    while (PRE.length > 0) { PRE.removeAt(1); }
    let n = strlen(text);
    let i = 1;
    while (i <= n) {
        let ch = charAt(text, i);
        charClass(ch);
        let c0 = cls;
        let tokS = ch;
        let j = i + 1;
        let done = 0;
        // contractions 's 't 're 've 'm 'll 'd
        if (indexOf("'", ch) > 0) {
            if (j <= n) {
                let c2 = charAt(text, j);
                if (indexOf('stmd', c2) > 0) { tokS = str(ch, c2); j = j + 1; done = 1; }
                else if (j + 1 <= n) {
                    let two = substr(text, j, j + 1);
                    if (indexOf('|re|ve|ll|', str('|', two, '|')) > 0) { tokS = str(ch, two); j = j + 2; done = 1; }
                }
            }
        }
        if (done == 0) {
            let runCls = c0;
            if (c0 == 2) {
                // ' ?X+' : a space followed by a non-space starts a word
                if (j <= n) {
                    charClass(charAt(text, j));
                    if (cls == 0) { runCls = 0; tokS = str(ch, charAt(text, j)); j = j + 1; }
                    else if (cls == 1) { runCls = 1; tokS = str(ch, charAt(text, j)); j = j + 1; }
                    else if (cls == 3) { runCls = 3; tokS = str(ch, charAt(text, j)); j = j + 1; }
                    else { runCls = 5; }
                } else { runCls = 5; }
            }
            if (c0 == 4) { runCls = 5; }
            if (runCls == 5) {
                // whitespace run; if followed by a non-space and longer than 1, leave the last one
                while (j <= n) {
                    charClass(charAt(text, j));
                    if (cls == 2) { tokS = str(tokS, charAt(text, j)); j = j + 1; }
                    else if (cls == 4) { tokS = str(tokS, charAt(text, j)); j = j + 1; }
                    else { break; }
                }
                if (j <= n) {
                    if (strlen(tokS) > 1) { tokS = substr(tokS, 1, strlen(tokS) - 1); j = j - 1; }
                }
            } else if (runCls != 1) {
                while (j <= n) {
                    charClass(charAt(text, j));
                    if (cls == runCls) { tokS = str(tokS, charAt(text, j)); j = j + 1; }
                    else { break; }
                }
            }
        }
        PRE.push(tokS);
        i = j;
    }
}

// raw chars -> byte-level symbols in SYM
function toSymbols(w) {
    while (SYM.length > 0) { SYM.removeAt(1); }
    let n = strlen(w);
    for (let i = 1; i <= n; i++) {
        let cp = indexOf(BMP, charAt(w, i)) - 1;
        if (cp < 128) { SYM.push(charAt(BU, cp + 2)); }
        else if (cp < 2048) {
            SYM.push(charAt(BU, 192 + idiv(cp, 64) + 2));
            SYM.push(charAt(BU, 128 + mod(cp, 64) + 2));
        } else {
            SYM.push(charAt(BU, 224 + idiv(cp, 4096) + 2));
            SYM.push(charAt(BU, 128 + mod(idiv(cp, 64), 64) + 2));
            SYM.push(charAt(BU, 128 + mod(cp, 64) + 2));
        }
    }
}

function bpe() {
    while (true) {
        let best = 0;
        let bi = 0;
        let k = 1;
        while (k < SYM.length) {
            let r = indexOf(MG, str('\u0001', SYM[k], ' ', SYM[k + 1], '\u0001'));
            if (r > 0) {
                if (best == 0) { best = r; bi = k; }
                else if (r < best) { best = r; bi = k; }
            }
            k = k + 1;
        }
        if (best == 0) { break; }
        let a = str('x', SYM[bi]);
        let b = str('x', SYM[bi + 1]);
        let m = str(SYM[bi], SYM[bi + 1]);
        k = 1;
        while (k < SYM.length) {
            if (str('x', SYM[k]) == a) {
                if (str('x', SYM[k + 1]) == b) { SYM[k] = m; SYM.removeAt(k + 1); }
            }
            k = k + 1;
        }
    }
}

let tid = 0;
function encode(text) {
    while (TOKS.length > 0) { TOKS.removeAt(1); }
    pretokenize(text);
    for (let w = 1; w <= PRE.length; w++) {
        toSymbols(PRE[w]);
        bpe();
        for (let k = 1; k <= SYM.length; k++) {
            let p = indexOf(VT, str('\u0001', SYM[k], '\u0002'));
            if (p > 0) {
                let e = p + strlen(SYM[k]) + 2;
                TOKS.push(substr(VT, e, e + 4) * 1);
            }
        }
    }
}

// id -> text (byte-level decode with a UTF-8 state machine)
// NOTE: function locals read back '' as 0 in Entry (getValue: value || 0), so the
// string accumulators here are globals.
let dec = '';
let dS = '';
let dOut = '';
function decodeTok(id) {
    let p = indexOf(IT, str('\u0003', substr(str(100000 + id), 2, 6)));
    let rest = substr(IT, p + 6, p + 90);
    let e = indexOf(rest, '\u0003');
    dS = '';
    if (e > 1) { dS = substr(rest, 1, e - 1); }
    dOut = '';
    let n = strlen(dS);
    for (let i = 1; i <= n; i++) {
        let bv = indexOf(BU, charAt(dS, i)) - 2;
        if (bv < 0) { dOut = str(dOut, charAt(dS, i)); }
        else if (bv < 128) { dOut = str(dOut, charAt(BMP, bv + 1)); needCont = 0; }
        else if (bv >= 192) {
            if (bv >= 224) { cpAcc = bv - 224; needCont = 2; } else { cpAcc = bv - 192; needCont = 1; }
        } else {
            if (needCont > 0) {
                cpAcc = cpAcc * 64 + (bv - 128);
                needCont = needCont - 1;
                if (needCont == 0) { dOut = str(dOut, charAt(BMP, cpAcc + 1)); }
            }
        }
    }
    dec = dOut;
}

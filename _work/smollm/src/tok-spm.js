// ---------------------------------------------------------------- tokenizer (sentencepiece)
// Llama-style sentencepiece BPE with byte fallback, as produced by conv_tok.py:
//   normalize: prepend U+2581 and turn every space into U+2581 (no pre-tokenization at all)
//   symbols  : one per CHARACTER (not per byte)
//   merges   : same rank search as the byte-level variant (MG)
//   ids      : VT lookup; a character with no piece falls back to its UTF-8 bytes as <0xXX>
//   decode   : a piece is real text - U+2581 becomes a space; a <0xXX> piece feeds the UTF-8
//              state machine so that multi-byte characters come out whole.
// build.mjs picks this file when tokenizer.json says byte_fallback.
let word = '';

// UTF-8 bytes of the character ch, appended to SYM as <0xXX> pieces
function fallbackBytes(ch) {
    let cp = indexOf(BMP, ch) - 1;
    if (cp < 128) { SYM.push(str('<0x', charAt(HEXD, idiv(cp, 16) + 1), charAt(HEXD, mod(cp, 16) + 1), '>')); }
    else if (cp < 2048) {
        ai = 192 + idiv(cp, 64);
        SYM.push(str('<0x', charAt(HEXD, idiv(ai, 16) + 1), charAt(HEXD, mod(ai, 16) + 1), '>'));
        ai = 128 + mod(cp, 64);
        SYM.push(str('<0x', charAt(HEXD, idiv(ai, 16) + 1), charAt(HEXD, mod(ai, 16) + 1), '>'));
    } else {
        ai = 224 + idiv(cp, 4096);
        SYM.push(str('<0x', charAt(HEXD, idiv(ai, 16) + 1), charAt(HEXD, mod(ai, 16) + 1), '>'));
        ai = 128 + mod(idiv(cp, 64), 64);
        SYM.push(str('<0x', charAt(HEXD, idiv(ai, 16) + 1), charAt(HEXD, mod(ai, 16) + 1), '>'));
        ai = 128 + mod(cp, 64);
        SYM.push(str('<0x', charAt(HEXD, idiv(ai, 16) + 1), charAt(HEXD, mod(ai, 16) + 1), '>'));
    }
}

// the whole text becomes one symbol sequence: leading U+2581, spaces as U+2581
function toSymbols(w) {
    while (SYM.length > 0) { SYM.removeAt(1); }
    SYM.push(SPC);
    let n = strlen(w);
    for (let i = 1; i <= n; i++) {
        word = charAt(w, i);
        if (str('x', word) == 'x ') { SYM.push(SPC); }
        else { SYM.push(word); }
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
    // no BOS: conv_tok.py's tokenizer.json has no post-processor, so this matches the
    // reference encoder exactly (the delphi models were trained with EOS as the separator)
    toSymbols(text);
    bpe();
    let k = 1;
    while (k <= SYM.length) {
        let p = indexOf(VT, str('\u0001', SYM[k], '\u0002'));
        if (p > 0) {
            let e = p + strlen(SYM[k]) + 2;
            TOKS.push(substr(VT, e, e + 4) * 1);
        } else {
            // no piece for this symbol: emit its bytes. fallbackBytes appends to SYM, so read
            // them back from the end and push their ids.
            let base = SYM.length;
            fallbackBytes(SYM[k]);
            let j = base + 1;
            while (j <= SYM.length) {
                let q = indexOf(VT, str('\u0001', SYM[j], '\u0002'));
                if (q > 0) { TOKS.push(substr(VT, q + strlen(SYM[j]) + 2, q + strlen(SYM[j]) + 6) * 1); }
                j = j + 1;
            }
            while (SYM.length > base) { SYM.removeAt(SYM.length); }
        }
        k = k + 1;
    }
}

// id -> text. NOTE: function locals read back '' as 0 in Entry (getValue: value || 0), so the
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
    if (n == 6) {
        if (substr(dS, 1, 3) == '<0x') {
            let bv = (indexOf(HEXD, charAt(dS, 4)) - 1) * 16 + indexOf(HEXD, charAt(dS, 5)) - 1;
            if (bv < 128) { dOut = charAt(BMP, bv + 1); needCont = 0; }
            else if (bv >= 192) {
                if (bv >= 224) { cpAcc = bv - 224; needCont = 2; } else { cpAcc = bv - 192; needCont = 1; }
            } else {
                if (needCont > 0) {
                    cpAcc = cpAcc * 64 + (bv - 128);
                    needCont = needCont - 1;
                    if (needCont == 0) { dOut = charAt(BMP, cpAcc + 1); }
                }
            }
            n = 0;
        }
    }
    if (str('x', dS) == 'x<s>') { n = 0; }
    if (str('x', dS) == 'x</s>') { n = 0; }
    if (str('x', dS) == 'x<unk>') { n = 0; }
    let i = 1;
    while (i <= n) {
        word = charAt(dS, i);
        if (str('x', word) == str('x', SPC)) { dOut = str(dOut, ' '); }
        else { dOut = str(dOut, word); }
        i = i + 1;
    }
    if (n > 0) { needCont = 0; }
    dec = dOut;
}

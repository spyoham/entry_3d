// SmolLM2-135M runtime (EJS: compiled to Entry blocks by ejs.mjs).
// Generated kernels (tables*, rows*, prep_*, rope, attnHead*) come from build.mjs.
// Lists are 1-based. Never compare characters with == (Entry turns ' ' and '\n'
// into the number 0); tokens are compared as str('x', a) == str('x', b).

let curPos = 0;        // number of tokens already in the KV cache
let chunkRows = 1024;  // rows per frame (then yield so the screen can update)
let temp = 0.7;        // sampling temperature (0 = greedy)
let repPen = 1.3;      // repetition penalty
let maxNew = 32;       // tokens to generate per prompt
let t0 = 0;
let tokStart = 0;
let outText = '';
let promptText = '';
let pendingBytes = 0;  // UTF-8 decoder state
let cpAcc = 0;
let needCont = 0;
let status = '불러오는 중...';
let lastSec = 0;
let tokIdx = 0;
let layerNo = 0;
let phase = '';

// ---------------------------------------------------------------- init
function initLists() {
    U.push('');
    for (let k = 1; k < UB; k++) { U.push(substr(ONES, 1, k)); }
    // UH[k]: unary string of length (k-1)*UB, built by halving (shallow ropes)
    UH.push('');
    UH.push(substr(ONES, 1, UB));
    for (let k = 3; k <= NUH; k++) {
        let n1 = idiv(k - 1, 2);
        UH.push(str(UH[n1 + 1], UH[k - 1 - n1 + 1]));
    }
    for (let k = 1; k <= 16 * PPOS; k++) { PC.push(''); }
    for (let k = 1; k <= 256; k++) { ABP.push(''); }
    for (let k = 1; k <= GS; k++) { XB.push(0); }
    for (let k = 1; k <= FF; k++) { XS.push(0); AF.push(0); }
    for (let k = 1; k <= 2 * FF; k++) { Y.push(0); }
    for (let k = 1; k <= D; k++) { QR.push(0); AO.push(0); X.push(0); }
    for (let k = 1; k <= NKV * HD; k++) { KR.push(0); }
    for (let k = 1; k <= TMAX; k++) { SC.push(0); }
    for (let k = 1; k <= HD; k++) { CSN.push(0); }
    for (let k = 1; k <= NL * TMAX; k++) { KS.push('x'); VS.push('x'); }
    for (let k = 1; k <= TOPK; k++) { TOPV.push(-1e30); TOPI.push(0); }
    initTables();
}

// ---------------------------------------------------------------- helpers
function rowsChunked(cnt, nb) {
    // run `cnt` rows of the current matrix (M, MP) into Y[YO+1..], yielding between chunks
    let left = cnt;
    let done = 0;
    while (left > 0) {
        let c = left;
        if (c > chunkRows) { c = chunkRows; }
        YO = done;
        if (nb == NBD) { rowsD(c); } else { rowsF(c); }
        done = done + c;
        left = left - c;
        showStatus();
        waitSec(0);
    }
    YO = 0;
}

// sparse exact weights of matrix `idx`: Y[r] += w * x[c]   (x = XS * ISX)
let SP = 'x';
function sparseFix(idx) {
    SP = SPALL[idx];
    let n = (strlen(SP) - 1) / 23;
    let o = 2;
    let k = 1;
    while (k <= n) {
        let r = substr(SP, o, o + 4) * 1;
        let c = substr(SP, o + 5, o + 9) * 1;
        Y[r] = Y[r] + substr(SP, o + 10, o + 22) * XS[c] * ISX;
        o = o + 23;
        k = k + 1;
    }
}

function addY() {
    for (let j = 1; j <= D; j++) { X[j] = X[j] + Y[j]; }
}

function showStatus() {
    status = str(phase, '  토큰 ', tokIdx, '  |  레이어 ', layerNo, '/', NL, '  |  ', Math.round((timer() - tokStart) * 10) / 10, '초');
}

// ---------------------------------------------------------------- embedding
function embed(tok) {
    RW = substr(EMB, 2 + tok * RLD, 1 + (tok + 1) * RLD);
    let rs = substr(RW, NBD * 21 + 17, NBD * 21 + 29) * 1;
    let j = 1;
    let pos = 1;
    while (pos <= NBD * 16) {
        let ci = indexOf(ALPH, charAt(RW, pos));
        let bb = idiv(pos - 1, 16);
        let dsc = substr(RW, NBD * 16 + bb * 5 + 1, NBD * 16 + bb * 5 + 5) * rs;
        let t = 0;
        let lo = 0;
        while (t < W) {
            let q = DG[t * 256 + ci];
            lo = 2 + ((pos - 1) * PPOS + LOFF[t + 1] + q) * 10;
            X[j] = substr(LVE, lo, lo + 9) * dsc;
            j = j + 1;
            t = t + 1;
        }
        pos = pos + 1;
    }
}

// ---------------------------------------------------------------- one transformer layer
function layerStep(l) {
    layerNo = l + 1;
    cacheBase = l * TMAX;
    // ---- attention ----
    LVMS = LVMALL[l * 4 + 1];
    prep_X(1);
    LVS = LVALL[l * 4 + 1];
    tablesD();
    M = WALL[l * 4 + 1];
    MP = 2;
    rowsChunked(D + 2 * NKV * HD, NBD);
    sparseFix(l * 4 + 1);
    rope();
    cacheStore(cacheBase + curPos + 1);
    npos = curPos + 1;
    attnAll();
    LVMS = LVMALL[l * 4 + 2];
    prep_AO(0);
    LVS = LVALL[l * 4 + 2];
    tablesD();
    M = WALL[l * 4 + 2];
    MP = 2;
    rowsChunked(D, NBD);
    sparseFix(l * 4 + 2);
    addY();
    // ---- MLP ----
    LVMS = LVMALL[l * 4 + 3];
    prep_X(1);
    LVS = LVALL[l * 4 + 3];
    tablesD();
    M = WALL[l * 4 + 3];
    MP = 2;
    rowsChunked(2 * FF, NBD);
    sparseFix(l * 4 + 3);
    siluMul();
    LVMS = LVMALL[l * 4 + 4];
    prep_AF(0);
    LVS = LVALL[l * 4 + 4];
    tablesF();
    M = WALL[l * 4 + 4];
    MP = 2;
    rowsChunked(D, NBF);
    sparseFix(l * 4 + 4);
    addY();
}

// AF = silu(gate) * up, SILU table on [-16, 16] step 1/128 with linear interpolation
function siluMul() {
    let j = 1;
    while (j <= FF) {
        let fx = Y[j] * 128 + 2049;
        if (fx < 1) { AF[j] = 0; }
        else if (fx >= 4097) { AF[j] = Y[j] * Y[FF + j]; }
        else {
            let fi = Math.floor(fx);
            let s0 = SILU[fi];
            AF[j] = (s0 + (SILU[fi + 1] - s0) * (fx - fi)) * Y[FF + j];
        }
        j = j + 1;
    }
}

// ---------------------------------------------------------------- lm head + sampling
function topAdd(val, id) {
    let ti = TOPK;
    while (ti > 1) {
        if (TOPV[ti - 1] < val) { TOPV[ti] = TOPV[ti - 1]; TOPI[ti] = TOPI[ti - 1]; ti = ti - 1; }
        else { break; }
    }
    TOPV[ti] = val;
    TOPI[ti] = id;
    topMin = TOPV[TOPK];
}

function lmHead() {
    layerNo = NL;
    LVMS = LVMEH;
    prep_X(1);
    LVS = LVEH;
    tablesD();
    for (let k = 1; k <= TOPK; k++) { TOPV[k] = -1e30; TOPI[k] = 0; }
    topMin = -1e30;
    M = EMB;
    MP = 2;
    rowBase = -1;
    let left = VOCAB;
    while (left > 0) {
        let c = left;
        if (c > chunkRows) { c = chunkRows; }
        rowsTop(c);
        rowBase = rowBase + c;
        left = left - c;
        showStatus();
        waitSec(0);
    }
}

let pick = 0;
function sample() {
    // repetition penalty on tokens already in the context
    for (let k = 1; k <= TOPK; k++) {
        if (GEN.includes(TOPI[k])) {
            if (TOPV[k] > 0) { TOPV[k] = TOPV[k] / repPen; } else { TOPV[k] = TOPV[k] * repPen; }
        }
    }
    let best = 1;
    for (let k = 2; k <= TOPK; k++) { if (TOPV[k] > TOPV[best]) { best = k; } }
    if (temp <= 0) { pick = TOPI[best]; }
    else {
        let tot = 0;
        for (let k = 1; k <= TOPK; k++) {
            let ei2 = Math.round((TOPV[k] - TOPV[best]) / temp * 256) + 4097;
            if (ei2 < 1) { SC[k] = 0; } else { SC[k] = EXPT[ei2]; }
            tot = tot + SC[k];
        }
        let r = rand(0, 1000000) / 1000000 * tot;
        pick = TOPI[best];
        let acc = 0;
        let k2 = 1;
        while (k2 <= TOPK) {
            acc = acc + SC[k2];
            if (acc >= r) { pick = TOPI[k2]; break; }
            k2 = k2 + 1;
        }
    }
}

// ---------------------------------------------------------------- forward one token
function forward(tok, wantLogits) {
    tokStart = timer();
    embed(tok);
    ropeTable(curPos);
    for (let l = 0; l < NL; l++) { layerStep(l); }
    curPos = curPos + 1;
    if (wantLogits == 1) { lmHead(); sample(); }
}


// ---------------------------------------------------------------- main
let nPrompt = 0;
let lastTok = 0;
on('start', 'llm', function () {
    timerStart();
    status = '준비 중... (리스트 초기화)';
    waitSec(0.1);
    initLists();
    status = '준비 완료';
    while (true) {
        ask('영어 문장의 시작을 입력하세요 (예: Once upon a time)');
        promptText = answer();
        curPos = 0;
        while (GEN.length > 0) { GEN.removeAt(1); }
        encode(promptText);
        nPrompt = TOKS.length;
        outText = promptText;
        needCont = 0;
        phase = '프롬프트 읽는 중';
        for (let k = 1; k <= nPrompt; k++) {
            tokIdx = k;
            GEN.push(TOKS[k]);
            if (k == nPrompt) { forward(TOKS[k], 1); } else { forward(TOKS[k], 0); }
        }
        phase = '생성 중';
        for (let g = 1; g <= maxNew; g++) {
            tokIdx = nPrompt + g;
            if (pick == 0) { break; }
            decodeTok(pick);
            outText = str(outText, dec);
            GEN.push(pick);
            if (curPos >= TMAX) { break; }
            lastTok = pick;
            if (g < maxNew) { forward(lastTok, 1); }
        }
        phase = '완료';
        status = str('완료: 토큰 ', curPos, '개 처리');
    }
});
on('start', 'screen', function () { for (;;) { write(outText); } });
on('start', 'status', function () { for (;;) { write(status); } });

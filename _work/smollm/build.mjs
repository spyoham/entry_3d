// Build "SmolLM2-135M" as an Entry project.
//
//   node build.mjs out.ent [--layers 30] [--novocab]
//
// Reads the QAT export (export/*.bin, manifest.json, norms.json) and the HF
// tokenizer, generates the EJS program (hand-written runtime in src/ plus
// generated kernels), compiles it to Entry blocks and packs the .ent.
//
// Kernel idea (see HANDOFF.md): a matrix row is a Latin-1 string, one char per
// 8-bit code (4 two-bit weights). For an input vector the program builds lookup
// tables T_b[256*p + code] whose entries are *unary strings* (length = value);
// a row's dot product is the length of the concatenation of its table entries.
// Concatenation (combine_something) is O(1) in V8 (rope) and never touches
// Entry's slow BigNumber arithmetic.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram, compileToJS } from './ejs.mjs';
import { packEnt } from './pack.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const EXP = path.join(HERE, process.env.EXPORT || (process.argv.includes('--export') ? process.argv[process.argv.indexOf('--export') + 1] : 'export'));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

// ---------------------------------------------------------------- model constants
// read from the HF config of the model directory (MODEL env / --model), so that another
// llama-architecture checkpoint can be built without touching the generator.
export const MODEL = path.join(HERE, process.env.MODEL || opt('model', 'model'));
const cfg = JSON.parse(fs.readFileSync(path.join(MODEL, 'config.json'), 'utf8'));
export const D = cfg.hidden_size, NH = cfg.num_attention_heads, NKV = cfg.num_key_value_heads;
export const HD = D / NH, FF = cfg.intermediate_size, VOCAB = cfg.vocab_size;
export const ROPE = cfg.rope_theta ?? 10000;   // HF default when the config omits it
export const NL = Number(opt('layers', cfg.num_hidden_layers));
const TITLE = process.env.TITLE || opt('title', 'SmolLM2-135M (2.67-bit)');   // project + screen caption
export const OFFP = 3500000;          // unary piece offset: pieces are 0 .. 2*OFFP (two-level: UH coarse + U fine)
export const UB = 4096;               // fine unary list size (U[k] has length k-1)
export const TMAX = 128;              // context length (KV cache: NL*TMAX list items)
export const TOPK = 40;
const PAD = '가';                 // alphabet padding char (never in row strings)

// ---------------------------------------------------------------- export loading
const man = JSON.parse(fs.readFileSync(path.join(EXP, 'manifest.json'), 'utf8'));
const norms = JSON.parse(fs.readFileSync(path.join(EXP, 'norms.json'), 'utf8'));
const GS = man.gs;
const rd = (name, ext, T) => { const b = fs.readFileSync(path.join(EXP, `${name}.${ext}`)); return new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); };

function loadMat(name) {
    const mm = man.mats[name];
    const m = mm.m, n = mm.n;
    const Q = rd(name, 'Q.u8', Uint8Array), S = rd(name, 'S.f32', Float32Array), LV = rd(name, 'LV.f32', Float32Array);
    return { name, m, n, Lmax: mm.Lmax, Q, S, LV, nkeep: mm.nkeep };
}

// pack layout: the codes of W consecutive columns form one 8-bit code.
// bits per column inside a pack come from the pattern (e.g. [2,2,2,2]); the
// pack is split in two halves H1 | H2, code = A * NBv + B (A over H1, B over H2)
function packInfo(bitsPattern) {
    const L = bitsPattern.map(b => 1 << b);
    const w = L.length;
    const h = w === 1 ? 1 : Math.ceil(w / 2);
    const H1 = L.slice(0, h), H2 = L.slice(h);
    const NA = H1.reduce((a, b) => a * b, 1), NBv = H2.reduce((a, b) => a * b, 1);
    if (NA * NBv > 256) throw new Error('pack > 8 bits');
    const loff = []; let o = 0; for (const l of L) { loff.push(o); o += l; }
    return { L, w, H1, H2, NA, NBv, loff, ppos: o };
}
const PATTERN = { attn: null, mlp: null, emb: null };
for (const kv of man.pattern.split(',')) { const [k, v] = kv.split('='); PATTERN[k] = { '2': [2, 2, 2, 2], '2.67': [3, 3, 2], '4': [4, 4], '8': [8] }[v]; }
const PK = packInfo(PATTERN.mlp);
for (const k of ['attn', 'emb']) if (JSON.stringify(PATTERN[k]) !== JSON.stringify(PATTERN.mlp)) throw new Error('one pack pattern for all matrices is assumed');
const W = PK.w;
if (GS !== 16 * W) throw new Error(`group size ${GS} must be 16 * pack width ${W}`);

// digits of a code: q[t] for column t of the pack
function codeOf(q) {
    let A = 0; for (let t = 0; t < PK.H1.length; t++) A = A * PK.H1[t] + q[t];
    let Bv = 0; for (let t = 0; t < PK.H2.length; t++) Bv = Bv * PK.H2[t] + q[PK.H1.length + t];
    return A * PK.NBv + Bv;
}
function digitsOf(code) {
    let A = Math.floor(code / PK.NBv), Bv = code % PK.NBv;
    const q = [];
    for (let t = PK.H2.length - 1; t >= 0; t--) { q.unshift(Bv % PK.H2[t]); Bv = Math.floor(Bv / PK.H2[t]); }
    for (let t = PK.H1.length - 1; t >= 0; t--) { q.unshift(A % PK.H1[t]); A = Math.floor(A / PK.H1[t]); }
    return q;
}

// ---------------------------------------------------------------- code alphabet
// 256 codes -> Latin-1 chars; the most frequent codes get 1-byte JSON chars.
function alphabetOrder() {
    const pr = [];
    for (let c = 0x20; c <= 0x7e; c++) if (c !== 0x22 && c !== 0x5c) pr.push(c);
    for (let c = 0xa0; c <= 0xff; c++) pr.push(c);
    for (let c = 0x80; c <= 0x9f; c++) pr.push(c);
    pr.push(0x7f, 0x22, 0x5c);
    for (let c = 0x01; c <= 0x1f; c++) pr.push(c);
    pr.push(0x00);
    return pr;
}

// ---------------------------------------------------------------- matrix strings
// row = [codes NB*16][D_b: NB x 5 chars][C: 16 chars][RS: 13 chars]
const fmtD = (v) => String(v).padStart(5, ' ');
const fmtC = (v) => { const s = String(v); if (s.length > 16) throw new Error('C field'); return s.padStart(16, ' '); };
const fmtF = (v) => { const s = v.toExponential(6); if (s.length > 13) throw new Error('float field ' + s); return s.padStart(13, ' '); };
const rowLen = (n) => (n / GS) * 21 + 29;

function rowCodes(mat, i) {
    const { n, Q } = mat; const NB = n / GS; const out = new Uint8Array(NB * 16);
    const q = new Array(W);
    for (let b = 0; b < NB; b++) for (let p = 0; p < 16; p++) {
        const j0 = b * GS + p * W;
        for (let t = 0; t < W; t++) q[t] = Q[i * n + j0 + t];
        out[b * 16 + p] = codeOf(q);
    }
    return out;
}

function matrixString(mat, CH) {
    const { m, n, S } = mat; const NB = n / GS;
    const parts = ['W'];                 // leading letter: never numeric-looking
    for (let i = 0; i < m; i++) {
        const codes = rowCodes(mat, i);
        let s = '';
        for (let k = 0; k < codes.length; k++) s += CH[codes[k]];
        let mx = 0; for (let b = 0; b < NB; b++) mx = Math.max(mx, Math.abs(S[i * NB + b]));
        const RS = mx / 9999 || 1e-30;
        let sumD = 0;
        for (let b = 0; b < NB; b++) { const d = Math.round(S[i * NB + b] / RS); sumD += d; s += fmtD(d); }
        s += fmtC(16 * W * OFFP * sumD) + fmtF(RS);
        if (s.length !== rowLen(n)) throw new Error('row length');
        parts.push(s);
    }
    return parts.join('');
}

// LV string: per block, per position, per column t, per level l: 10-char fields.
// gamma (RMSNorm weight) is folded in: level * gamma[j]
const fmtLV = (v) => { const s = v.toFixed(6); if (s.length > 10) throw new Error('LV field ' + s); return s.padStart(10, ' '); };
function lvString(mat, gamma) {
    const { n, LV, Lmax } = mat; let s = 'V';
    const NB = n / GS;
    for (let b = 0; b < NB; b++) for (let p = 0; p < 16; p++) for (let t = 0; t < W; t++) {
        const j = b * GS + p * W + t;
        for (let l = 0; l < PK.L[t]; l++) s += fmtLV(LV[j * Lmax + l] * (gamma ? gamma[j] : 1));
    }
    return s;
}
// per-column max |level| (with gamma), 10-char fields
function lvmString(mat, gamma) {
    const { n, LV, Lmax } = mat; let s = 'M';
    for (let j = 0; j < n; j++) {
        let mx = 0; const t = j % W;
        for (let l = 0; l < PK.L[t]; l++) mx = Math.max(mx, Math.abs(LV[j * Lmax + l] * (gamma ? gamma[j] : 1)));
        s += mx.toExponential(3).padStart(10, ' ');
    }
    return s;
}

// sparse exact weights (QAT 'keep'): records row(5) col(5) value(13), gamma folded
function sparseString(name, gamma) {
    const ki = rd(name, 'K.i32', Int32Array), kv = rd(name, 'KV.f32', Float32Array);
    let s = 'S';
    for (let k = 0; k < kv.length; k++) {
        const r = ki[2 * k], c = ki[2 * k + 1];
        s += String(r + 1).padStart(5, ' ') + String(c + 1).padStart(5, ' ') + fmtF(kv[k] * (gamma ? gamma[c] : 1));
    }
    return s;
}

// ---------------------------------------------------------------- EJS generation
const tree = (xs) => xs.length === 1 ? xs[0] : `str(${tree(xs.slice(0, xs.length >> 1))}, ${tree(xs.slice(xs.length >> 1))})`;
const sumTree = (xs) => xs.length === 1 ? xs[0] : `(${sumTree(xs.slice(0, xs.length >> 1))} + ${sumTree(xs.slice(xs.length >> 1))})`;

function genKernels(maxNB) {
    let s = '';
    // ---- pieces: PC[...] = unary(round(XB[col] * level)) ----
    //   one position per loop pass (xo = XB offset, lo = LVB offset, ko = PC offset)
    s += `function pieces() {\n  xo = 0;\n  lo = 0;\n  ko = 0;\n  while (xo < ${16 * W}) {\n`;
    for (let t = 0; t < W; t++) for (let l = 0; l < PK.L[t]; l++) {
        const lvPos = 2 + (PK.loff[t] + l) * 10;   // LVB has no prefix char; +1 base
        s += `    pv = Math.round(XB[xo + ${t + 1}] * substr(LVB, lo + ${lvPos - 1}, lo + ${lvPos + 8})) + ${OFFP};\n`;
        s += `    PC[ko + ${PK.loff[t] + l + 1}] = str(UH[idiv(pv, ${UB}) + 1], U[mod(pv, ${UB}) + 1]);\n`;
    }
    s += `    xo = xo + ${W};\n    lo = lo + ${PK.ppos * 10};\n    ko = ko + ${PK.ppos};\n  }\n}\n`;
    // ---- ABP for one position (pb = PC offset of that position) ----
    s += 'function abp() {\n';
    const hcols = PK.H1.length;
    const pieceRef = (t, l) => `PC[pb + ${PK.loff[t] + l + 1}]`;
    for (let a = 0; a < PK.NA; a++) {
        const q = []; let v = a; for (let t = hcols - 1; t >= 0; t--) { q.unshift(v % PK.H1[t]); v = Math.floor(v / PK.H1[t]); }
        s += `  ABP[${a + 1}] = ${tree(q.map((ql, t) => pieceRef(t, ql)))};\n`;
    }
    for (let bv = 0; bv < PK.NBv; bv++) {
        const q = []; let v = bv; for (let t = PK.H2.length - 1; t >= 0; t--) { q.unshift(v % PK.H2[t]); v = Math.floor(v / PK.H2[t]); }
        s += `  ABP[${PK.NA + bv + 1}] = ${q.length ? tree(q.map((ql, t) => pieceRef(hcols + t, ql))) : "''"};\n`;
    }
    s += '}\n';
    // ---- T_b builders ----
    s += `function xbCopy() {\n  xj = 1;\n  while (xj <= ${GS}) {\n    XB[xj] = XS[xo + xj];\n    xj = xj + 1;\n  }\n}\n`;
    for (let b = 0; b < maxNB; b++) {
        s += `function tb${b}() {\n  LVB = substr(LVS, ${2 + b * 16 * PK.ppos * 10}, ${1 + (b + 1) * 16 * PK.ppos * 10});\n`;
        s += `  xo = ${b * GS};\n  xbCopy();\n  pieces();\n  tq = 0;\n  pb = 0;\n  while (tq < 4096) {\n    abp();\n`;
        // A runs in the loop, the NBv second halves are unrolled
        s += `    ai = 1;\n    ti = tq;\n    while (ai <= ${PK.NA}) {\n`;
        for (let Bv = 0; Bv < PK.NBv; Bv++) s += `      T${b}[ti + ${Bv + 1}] = str(ABP[ai], ABP[${PK.NA + Bv + 1}]);\n`;
        s += `      ai = ai + 1;\n      ti = ti + ${PK.NBv};\n    }\n`;
        s += `    tq = tq + 256;\n    pb = pb + ${PK.ppos};\n  }\n}\n`;
    }
    // ---- tables for an input of NB blocks ----
    for (const [NB, nm] of [[D / GS, 'D'], [FF / GS, 'F']]) {
        s += `function tables${nm}() {\n`;
        for (let b = 0; b < NB; b++) s += `  tb${b}();\n`;
        s += '}\n';
    }
    // ---- row kernels ----
    const rowExpr = (NB) => {
        const RL = NB * 21 + 29;
        const blocks = [];
        for (let b = 0; b < NB; b++) {
            const terms = [];
            for (let p = 0; p < 16; p++) terms.push(`T${b}[indexOf(ALP${p}, charAt(RW, ${b * 16 + p + 1}))]`);
            const dA = NB * 16 + b * 5 + 1;
            blocks.push(`substr(RW, ${dA}, ${dA + 4}) * strlen(${tree(terms)})`);
        }
        const cA = NB * 21 + 1, rA = NB * 21 + 17;
        return { RL, e: `substr(RW, ${rA}, ${rA + 12}) * (${sumTree(blocks)} - substr(RW, ${cA}, ${cA + 15})) * ISX` };
    };
    for (const [NB, nm] of [[D / GS, 'D'], [FF / GS, 'F']]) {
        const { RL, e } = rowExpr(NB);
        s += `function rows${nm}(cnt) {\n  ri = 1;\n  while (ri <= cnt) {\n    RW = substr(M, MP, MP + ${RL - 1});\n    MP = MP + ${RL};\n    Y[YO + ri] = ${e};\n    ri = ri + 1;\n  }\n}\n`;
    }
    {   // lm head: keep the TOPK best rows instead of storing 49152 logits
        const NB = D / GS; const { RL, e } = rowExpr(NB);
        s += `function rowsTop(cnt) {\n  ri = 1;\n  while (ri <= cnt) {\n    RW = substr(M, MP, MP + ${RL - 1});\n    MP = MP + ${RL};\n    yv = ${e};\n    if (yv > topMin) { topAdd(yv, rowBase + ri); }\n    ri = ri + 1;\n  }\n}\n`;
    }
    // ---- input preparation: XS = X * Sx, ISX = 1/(Sx * rms) ----
    //   Sx = OFFP / max_j |X_j * LVM_j|     (pieces stay within +-OFFP)
    for (const [n, nm] of [[D, 'X'], [D, 'AO'], [FF, 'AF']]) {
        const fn = `prep_${nm}`;
        s += `function ${fn}(useNorm) {\n  mx = 0;\n  ss = 0;\n  xj = 1;\n  lo = 2;\n  while (xj <= ${n}) {\n`;
        s += `    v = Math.abs(${nm}[xj] * substr(LVMS, lo, lo + 9));\n    if (v > mx) { mx = v; }\n    ss = ss + sq(${nm}[xj]);\n    xj = xj + 1;\n    lo = lo + 10;\n  }\n`;
        s += `  sx = ${Math.floor(OFFP * 0.998)} / (mx + 1e-30);\n`;
        s += `  if (useNorm == 1) { ISX = 1 / (sx * Math.sqrt(ss / ${n} + 0.00001)); } else { ISX = 1 / sx; }\n`;
        s += `  xj = 1;\n  while (xj <= ${n}) {\n    XS[xj] = ${nm}[xj] * sx;\n    xj = xj + 1;\n  }\n`;
        s += '}\n';
    }
    s += 'function initTables() {\n  for (let k = 1; k <= 4096; k++) {\n';
    for (let bb = 0; bb < maxNB; bb++) s += `    T${bb}.push('');\n`;
    s += `  }\n  for (let k = 1; k <= ${HD}; k++) {\n    QH.push(0);\n    AH.push(0);\n  }\n}\n`;
    return s;
}
// with useNorm the tables see the raw X (gamma is folded into the levels) and
// the RMSNorm factor goes to the output: y = W (g*X/rms) = (1/rms) W'(X)

// ---------------------------------------------------------------- RoPE, attention (generated)
function genAttention() {
    let s = '';
    // rotary: cos/sin table for the current position in CSN (32 cos, 32 sin)
    s += 'function ropeTable(pos) {\n';
    for (let i = 0; i < HD / 2; i++) {
        const invf = Math.pow(ROPE, -2 * i / HD) * 180 / Math.PI;   // degrees per position
        s += `  CSN[${i + 1}] = cosd(pos * ${invf});\n  CSN[${i + HD / 2 + 1}] = sind(pos * ${invf});\n`;
    }
    s += '}\n';
    // rotate q (Y 1..576) into QR, k (Y 577..768) into KR; one head per pass
    const rot = (src, dst, n) => `  rh = 0;\n  while (rh < ${n}) {\n    rj = 1;\n    while (rj <= ${HD / 2}) {\n` +
        `      ra = Y[${src ? src + ' + ' : ''}rh + rj];\n      rb = Y[${src ? src + ' + ' : ''}rh + rj + ${HD / 2}];\n` +
        `      ${dst}[rh + rj] = ra * CSN[rj] - rb * CSN[rj + ${HD / 2}];\n      ${dst}[rh + rj + ${HD / 2}] = rb * CSN[rj] + ra * CSN[rj + ${HD / 2}];\n` +
        `      rj = rj + 1;\n    }\n    rh = rh + ${HD};\n  }\n`;
    s += 'function rope() {\n' + rot(0, 'QR', NH * HD) + rot(D, 'KR', NKV * HD) + '}\n';
    // cache strings: 192 values, 10-digit fixed width ints  round(v*1e6)+5e9  (|v| < 4999)
    const pack = (src, off) => `  cst = Math.round(${src}[${off + 1}] * 1000000) + 5000000000;\n  rj = 2;\n  while (rj <= ${NKV * HD}) {\n` +
        `    cst = str(cst, Math.round(${src}[${off ? off + ' + ' : ''}rj] * 1000000) + 5000000000);\n    rj = rj + 1;\n  }\n`;
    s += `function cacheStore(slot) {\n${pack('KR', 0)}  KS[slot] = cst;\n${pack('Y', D + NKV * HD)}  VS[slot] = cst;\n}\n`;
    // scores against cache entry KK, value accumulation from VV (query head in QH, output in AH).
    // KK / VV are already sliced down to the current KV group (offset kvo), so these two
    // functions exist once instead of once per group - that is ~0.9 MB of blocks for 8 groups.
    const terms = Array.from({ length: HD }, (_, d) => `QH[${d + 1}] * substr(KK, ${d * 10 + 1}, ${d * 10 + 10})`);
    s += `function score() {\n  sc = ${sumTree(terms)};\n}\n`;
    const acc = Array.from({ length: HD }, (_, d) => `  AH[${d + 1}] = AH[${d + 1}] + pw * substr(VV, ${d * 10 + 1}, ${d * 10 + 10});\n`).join('');
    s += `function vacc() {\n${acc}}\n`;
    s += `function qsum() {\n  qs = ${sumTree(Array.from({ length: HD }, (_, d) => `QH[${d + 1}]`))};\n}\n`;
    s += `function attnAll() {\n  hh = 0;\n  while (hh < ${NH}) {\n    hq = hh * ${HD};\n    rj = 1;\n    while (rj <= ${HD}) {\n      QH[rj] = QR[hq + rj];\n      AH[rj] = 0;\n      rj = rj + 1;\n    }\n    qsum();\n`;
    s += `    kvo = idiv(hh, ${NH / NKV}) * ${HD * 10};\n    attnG();\n`;
    s += `    rj = 1;\n    while (rj <= ${HD}) {\n      AO[hq + rj] = (AH[rj] - 5000000000 * psum) * 0.000001 / ssum;\n      rj = rj + 1;\n    }\n    hh = hh + 1;\n  }\n}\n`;
    s += `function attnG() {
  // scores (scaled by 1/sqrt(64) and the 1e-4 cache scale)
  mxs = -1e30;
  at = 1;
  while (at <= npos) {
    KK = substr(KS[cacheBase + at], kvo + 1, kvo + ${HD * 10});
    score();
    sc = (sc - 5000000000 * qs) * 0.000000125;
    SC[at] = sc;
    if (sc > mxs) { mxs = sc; }
    at = at + 1;
  }
  ssum = 0;
  at = 1;
  while (at <= npos) {
    ef = (SC[at] - mxs) * 256 + 4097;
    if (ef < 1) { SC[at] = 0; }
    else {
      ei = Math.floor(ef);
      if (ei >= 4097) { SC[at] = 1; } else { SC[at] = EXPT[ei] + (EXPT[ei + 1] - EXPT[ei]) * (ef - ei); }
    }
    ssum = ssum + SC[at];
    at = at + 1;
  }
  psum = 0;
  at = 1;
  while (at <= npos) {
    pw = SC[at];
    psum = psum + pw;
    VV = substr(VS[cacheBase + at], kvo + 1, kvo + ${HD * 10});
    vacc();
    at = at + 1;
  }
}
`;
    return s;
}

// ---------------------------------------------------------------- tokenizer data
function tokenizerData() {
    const tj = JSON.parse(fs.readFileSync(path.join(MODEL, 'tokenizer.json'), 'utf8'));
    const vocab = tj.model.vocab;            // token -> id
    const merges = tj.model.merges.map(m => Array.isArray(m) ? m.join(' ') : m);
    const byId = [];
    for (const [t, id] of Object.entries(vocab)) byId[id] = t;
    for (const a of tj.added_tokens) byId[a.id] = a.content;
    // token -> id:  \u0001 tok \u0002 ddddd
    let VT = '';
    for (const [t, id] of Object.entries(vocab)) VT += '\u0001' + t + '\u0002' + String(id).padStart(5, '0');
    VT += '\u0001';
    // id -> token:  \u0003 ddddd tok
    let IT = '';
    for (let id = 0; id < byId.length; id++) IT += '\u0003' + String(id).padStart(5, '0') + (byId[id] ?? '');
    IT += '\u0003' + 'x'.repeat(100);   // decodeTok reads up to 90 chars past an entry
    // merges in rank order: \u0001 a b \u0001
    const MG = '\u0001' + merges.join('\u0001') + '\u0001';
    // GPT-2 bytes_to_unicode: BU[byte+1] = char ; also the inverse for decoding
    const bs = [];
    for (let c = 33; c <= 126; c++) bs.push(c);
    for (let c = 161; c <= 172; c++) bs.push(c);
    for (let c = 174; c <= 255; c++) bs.push(c);
    const cs = bs.slice(); let nx = 0;
    for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + nx); nx++; }
    const map = new Array(256);
    bs.forEach((b, i) => { map[b] = String.fromCharCode(cs[i]); });
    const BU = 'b' + map.join('');           // charAt(BU, byte + 2)
    // byte_fallback = llama/sentencepiece style pieces (real characters + <0xXX>);
    // otherwise GPT-2 byte-level BPE. The runtime tokenizer is picked from this.
    return { VT, IT, MG, BU, nvocab: byId.length, spm: !!tj.model.byte_fallback };
}

// all BMP code units (for char <-> code point); surrogates kept as placeholders
function bmpString() {
    let s = '';
    for (let c = 0; c < 65536; c++) s += String.fromCharCode(c >= 0xd800 && c <= 0xdfff ? 0xfffd : c);
    return s;
}

// ---------------------------------------------------------------- build
export function buildProject() {
    const CHORD = alphabetOrder();
    const CH = CHORD.map(c => String.fromCharCode(c));
    // code order by frequency: frequent codes get cheap chars
    const freq = new Float64Array(256);
    const matNames = [];
    for (let l = 0; l < NL; l++) for (const f of ['qkv', 'o', 'gu', 'down']) matNames.push(`${l}_${f}`);
    matNames.push('emb');
    const mats = {};
    for (const nm of matNames) {
        const mt = loadMat(nm); mats[nm] = mt;
        const rowsSample = Math.min(mt.m, 256);
        for (let i = 0; i < rowsSample; i++) for (const c of rowCodes(mt, i)) freq[c]++;
    }
    const order = Array.from({ length: 256 }, (_, c) => c).sort((a, b) => freq[b] - freq[a]);
    const codeChar = new Array(256);
    order.forEach((c, r) => { codeChar[c] = CH[r]; });
    const ALP0 = codeChar.join('');

    const g = (k) => norms[k];
    const WALL = [], LVALL = [], LVMALL = [], SPALL = [];
    for (let l = 0; l < NL; l++) {
        const gIn = g(`model.layers.${l}.input_layernorm.weight`), gPost = g(`model.layers.${l}.post_attention_layernorm.weight`);
        for (const [f, gm] of [['qkv', gIn], ['o', null], ['gu', gPost], ['down', null]]) {
            const mt = mats[`${l}_${f}`];
            WALL.push(matrixString(mt, codeChar)); LVALL.push(lvString(mt, gm)); LVMALL.push(lvmString(mt, gm)); SPALL.push(sparseString(`${l}_${f}`, gm));
        }
    }
    const gFin = g('model.norm.weight');
    const EMB = matrixString(mats.emb, codeChar);
    const LVE = lvString(mats.emb, null);          // input embedding (no gamma)
    const LVEH = lvString(mats.emb, gFin);         // lm head (final norm folded)
    const LVMEH = lvmString(mats.emb, gFin);

    const tk = tokenizerData();
    const consts = { D, FF, NL, NH, NKV, HD, TMAX, TOPK, OFFP, UB, NUH: Math.ceil(2 * OFFP / UB) + 2, GS, W, VOCAB, NBD: D / GS, NBF: FF / GS, RLD: rowLen(D), RLF: rowLen(FF), PPOS: PK.ppos, NVOC: tk.nvocab };
    const decl = [];
    const S = (name, v) => decl.push(`let ${name} = ${JSON.stringify(v)};`);
    // hot globals first (Entry looks variables up linearly)
    S('RW', 'x');
    for (let p = 0; p < 16; p++) S(`ALP${p}`, PAD.repeat(256 * p) + ALP0);
    for (const v of ['pv', 'M', 'MP', 'ISX', 'YO', 'ri', 'yv', 'topMin', 'rowBase', 'tq', 'pb', 'LVB', 'LVS', 'LVMS', 'mx', 'v', 'sx', 'ss', 'sc', 'KK', 'VV', 'pw', 'qs', 'at', 'npos', 'cacheBase', 'mxs', 'ssum', 'psum', 'ei', 'ef', 'ai', 'ti', 'xo', 'lo', 'ko', 'xj', 'rh', 'rj', 'ra', 'rb', 'cst', 'hh', 'hq', 'kvo'])
        S(v, v === 'M' || v === 'LVB' || v === 'LVS' || v === 'LVMS' || v === 'KK' || v === 'VV' ? 'x' : 0);
    // lists: tables first
    const maxNB = FF / GS;
    for (let b = 0; b < maxNB; b++) decl.push(`let T${b} = [];`);
    for (const nm of ['U', 'UH', 'PC', 'ABP', 'XB', 'XS', 'Y', 'QR', 'KR', 'AO', 'AF', 'X', 'SC', 'CSN', 'QH', 'AH', 'EXPT', 'SILU', 'KS', 'VS', 'TOPV', 'TOPI', 'WALL', 'LVALL', 'LVMALL', 'SPALL', 'DG', 'LOFF', 'TOKS', 'SYM', 'PRE', 'GEN']) decl.push(`let ${nm} = [];`);
    const bigStrings = { EMB, LVE, LVEH, LVMEH, VT: tk.VT, IT: tk.IT, MG: tk.MG, BU: tk.BU, BMP: bmpString(), ALPH: ALP0, ASCIIP: Array.from({ length: 94 }, (_, k) => String.fromCharCode(33 + k)).filter(c => !/[A-Za-z0-9]/.test(c)).join(''), ONES: 'I'.repeat(UB),
        HEXD: '0123456789ABCDEF', SPC: '▁' };

    const src = [
        decl.join('\n'),
        ...Object.keys(bigStrings).map(k => `let ${k} = 'x';`),
        genKernels(maxNB),
        genAttention(),
        fs.readFileSync(path.join(HERE, 'src', tk.spm ? 'tok-spm.js' : 'tok-bbpe.js'), 'utf8'),
        fs.readFileSync(path.join(HERE, 'src', 'runtime.js'), 'utf8'),
    ];
    // digit tables for embedding decode: DG[t*256 + code + 1] = digit q_t
    const DG = [];
    for (let t = 0; t < W; t++) for (let c = 0; c < 256; c++) DG.push(c < PK.NA * PK.NBv ? digitsOf(c)[t] : 0);
    const EXPT = Array.from({ length: 4097 }, (_, i) => Math.exp((i - 4096) / 256));   // [-16, 0] step 1/256
    const SILU = Array.from({ length: 4097 }, (_, i) => { const x = (i - 2048) / 128; return x / (1 + Math.exp(-x)); });
    const lists = { WALL, LVALL, LVMALL, SPALL, DG, EXPT, SILU, LOFF: PK.loff };
    return { src, consts, lists, bigStrings, PK, CH: codeChar, ALP0 };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = args[0] || 'smollm.ent';
    const t0 = Date.now();
    const B = buildProject();
    console.log('data built', (Date.now() - t0) / 1000, 's');
    const prog = compileProgram(B.src, { consts: B.consts });
    // inject data
    for (const v of prog.variables) {
        if (v.variableType === 'list' && B.lists[v.name]) v.array = B.lists[v.name].map((d, i) => ({ id: `${v.id}_${i}`, data: d }));
        if (v.variableType === 'variable' && B.bigStrings[v.name] !== undefined) v.value = B.bigStrings[v.name];
    }
    // variable order: hot first (the decl order), compiler temps last
    const declOrder = new Map(); B.src[0].split('\n').forEach((l, i) => { const m = l.match(/^let (\w+)/); if (m) declOrder.set(m[1], i); });
    prog.variables.sort((a, b) => (declOrder.get(a.name) ?? 1e6) - (declOrder.get(b.name) ?? 1e6));
    for (const v of prog.variables) if (v.variableType === 'list' && v.array && v.array.length > 5000) throw new Error(`list ${v.name} has ${v.array.length} items`);
    const png1 = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
    const objects = [
        { id: 'llm', name: 'SmolLM', pictures: [{ id: '1', name: 'dot', buf: png1, w: 1, h: 1 }], script: prog.objectScripts.llm || [[]], entity: { x: -225, y: 120 } },
        { id: 'screen', name: '화면', objectType: 'textBox', text: TITLE, script: prog.objectScripts.screen || [[]],
          entity: { x: 0, y: 12, colour: '#222222', font: '13px Nanum Gothic', fontSize: 13, textAlign: 1, lineBreak: true, bold: false, underLine: false, strike: false, italic: false, width: 460, height: 215, bgColor: '#fffdf5' } },
        { id: 'status', name: '상태', objectType: 'textBox', text: '', script: prog.objectScripts.status || [[]],
          entity: { x: 0, y: -122, colour: '#555555', font: '11px Nanum Gothic', fontSize: 11, textAlign: 1, lineBreak: false, bold: false, underLine: false, strike: false, italic: false, width: 470, height: 18, bgColor: '#eeeeee' } },
    ];
    packEnt(out, {
        name: TITLE, variables: prog.variables, functions: prog.functions, messages: prog.messages, objects, speed: 60,
        tmpDir: path.join(HERE, '.packtmp'),
    });
    fs.writeFileSync(out + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    fs.writeFileSync(path.join(HERE, 'program.js'), B.src.join('\n'));
    console.log('built', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB', prog.stats, (Date.now() - t0) / 1000, 's');
}

// How big would model X be as an Entry project?  node sizecalc.mjs [--json]
//
// Row layout (build.mjs): one row of a matrix with n input columns is
//   n/W code chars + (n/gs)*5 block-scale chars + 16 offset chars + 13 row-scale chars,
// with gs = 16*W, so chars(row) = 1.3125*n/W + 29.  Verified against the shipped build:
// WALL 50.96M chars and EMB 13.81M chars come out exactly.
// JSON bytes per char are measured on that build: code strings 1.374 (WALL) / 1.580 (EMB),
// the all-ASCII tables 1.000, the vocabulary tables ~1.6.
const BPC = { wall: 1.374, emb: 1.580, ascii: 1.0, vocab: 1.6 };
const LEVELS = { 2: 16, 3: 6.67, 4: 4 };   // avg levels per column: 4bit / (3,3,2) / 2bit
const BITS = { 2: '4비트', 3: '2.67비트', 4: '2비트' };

const MODELS = [
    { name: 'delphi v0-llama2-6.4m', d: 256, ff: 704, L: 8, nh: 16, nkv: 8, V: 4096, vchars: 20 },
    { name: 'delphi v0-llama2-12.8m', d: 384, ff: 1024, L: 8, nh: 16, nkv: 8, V: 4096, vchars: 20 },
    { name: 'delphi v0-llama2-25.6m', d: 512, ff: 1376, L: 8, nh: 16, nkv: 8, V: 4096, vchars: 20 },
    { name: 'tinyllama-15M (stories15M)', d: 288, ff: 768, L: 6, nh: 6, nkv: 6, V: 32000, vchars: 35 },
    { name: 'tinyllama-15M, 어휘 8k로 축소', d: 288, ff: 768, L: 6, nh: 6, nkv: 6, V: 8192, vchars: 35 },
    { name: 'tinyllama-42M', d: 512, ff: 1376, L: 8, nh: 8, nkv: 8, V: 32000, vchars: 35 },
    { name: 'SmolLM2-135M (현재)', d: 576, ff: 1536, L: 30, nh: 9, nkv: 3, V: 49152, vchars: 35 },
];

const rowChars = (n, W) => 1.3125 * n / W + 29;
const pad = (n, gs) => Math.ceil(n / gs) * gs;

function size(m, W) {
    const gs = 16 * W, hd = m.d / m.nh;
    const dp = pad(m.d, gs), ffp = pad(m.ff, gs);          // rows are padded up to a group
    const kvRows = m.nkv * hd;
    const mats = [                                         // [rows, input columns]
        [m.d + 2 * kvRows, dp], [m.d, dp], [2 * m.ff, dp], [m.d, ffp],
    ];
    let body = 0, cols = 0, bodyParams = 0;
    for (const [rows, n] of mats) { body += rows * rowChars(n, W); cols += n; bodyParams += rows * n; }
    body *= m.L; cols *= m.L; bodyParams *= m.L;
    const embParams = m.V * m.d;
    const emb = m.V * rowChars(dp, W);
    const lv = (cols + m.d) * LEVELS[W] * 10;              // per-column level tables (+ embedding's)
    const lvm = (cols + m.d) * 10;
    const sp = 0.0005 * bodyParams * 23;                   // sparse outliers, 23 chars each
    const voc = m.V * m.vchars;
    const chars = body + emb + lv + lvm + sp + voc;
    const json = (body * BPC.wall + emb * BPC.emb + (lv + lvm + sp) * BPC.ascii + voc * BPC.vocab) / 1e6;
    const prog = 0.5 + 4.2 * (dp / gs + ffp / gs) / 44;    // generated blocks scale with the group count
    const lookups = (bodyParams + embParams) / W;          // one table lookup per packed char
    return {
        params: (bodyParams + embParams) / 1e6, chars: chars / 1e6, json: json + prog, prog,
        file: 0.75 * json + 0.15, sec: lookups * 3.2e-6,
        pad: (dp !== m.d || ffp !== m.ff) ? `패딩 ${m.d}->${dp}, ${m.ff}->${ffp}` : '',
    };
}

const f = (x, n = 1) => x.toFixed(n).padStart(n ? 6 : 4);
for (const m of MODELS) {
    console.log(`\n${m.name}  d=${m.d} ff=${m.ff} L=${m.L} heads=${m.nh}/${m.nkv} vocab=${m.V}`);
    for (const W of [2, 3, 4]) {
        const r = size(m, W);
        console.log(`  ${BITS[W].padEnd(8)} ${f(r.params)}M 파라미터  ${f(r.chars)}M자  project.json ${f(r.json)}MB ` +
            `(프로그램 ${f(r.prog)})  .ent 약 ${f(r.file)}MB  토큰당 ${f(r.sec)}초  ${r.pad}`);
    }
}

// Build the OBJ renderer: src/*.js (EJS, with M_ macros) + the per-page code made here -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
import { EXAMPLES, asPasted } from './models.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
export const NAME = '엔트리 OBJ 렌더러';
const NL = String.fromCharCode(10);

// PG: items of a page (Entry's list limit). NP: pages of the model, NQ: pages of the file's vertices.
export const consts = {
    PG: 5000, NP: 16, NQ: 20, VS: 20000, MS: 4096, RS: 34, NSH: 32, MAXM: 140, CH: 400,
    LODMAX: 3300, HKN: 4999, LOD1MIN: 600, LOD2MIN: 300, BIGL: 2 * 4000 * 4000, S0: 118, DC: 4.5, BGCOL: '#1b1f27',
    TAB: String.fromCharCode(9), LF: NL, CR: String.fromCharCode(13), BSL: ' ' + String.fromCharCode(92) + ' ', TEST: 0, BENCHPG: 1, BENCHTWO: 0, BENCHLV: 1, BENCHBIG: 0, LEGACY: 1, PLAIN: 0, SLIM: 1,
};

const tree = (v, lo, hi, leaf) => {
    if (lo === hi) return leaf(lo);
    const mid = (lo + hi) >> 1;
    return `if (${v} <= ${mid}) { ${tree(v, lo, mid, leaf)} } else { ${tree(v, mid + 1, hi, leaf)} }`;
};
// (the first page apart: a model of one page - most are - is spared the way down the tree)
const tree1 = (v, lo, hi, leaf) => (lo === hi ? leaf(lo) : `if (${v} == ${lo}) { ${leaf(lo)} } else { ${tree(v, lo + 1, hi, leaf)} }`);
// the lists of a group are always as long as each other, so one length tells for all
const putAll = (lists, i, vals) => `if (${lists[0]}.length < ${i}) { ${lists.map((l, k) => `${l}.push(${vals[k]});`).join(' ')} } else { ${lists.map((l, k) => `${l}[${i}] = ${vals[k]};`).join(' ')} }`;
const PAGE_LISTS = ['VX', 'VY', 'VZ', 'FA', 'FB', 'FC', 'FE', 'NA', 'NB', 'NC', 'ND', 'FM', 'SX', 'SY', 'LK', 'CL'];
const L = (names, p) => names.split(' ').map(n => n + p).join(', ');

// the code that exists once for every page
export function pageSource(C) {
    const { NP, NQ } = C, NPT = NP + 2;
    const out = [];
    for (let p = 1; p <= NPT; p++) out.push(`let ${PAGE_LISTS.map(n => `${n}${p} = []`).join(', ')};`);
    for (let q = 1; q <= NQ; q++) out.push(`let RX${q} = [], RY${q} = [], RZ${q} = [], RM${q} = [], RN${q} = [], WH${q} = [];`);
    // reading: a vertex of the file into the raw store; a corner's place in the page being filled; a triangle
    out.push(`function M_rawPut() { ${tree1('qq', 0, NQ - 1, q => putAll(['RX', 'RY', 'RZ', 'RM', 'RN'].map(n => n + (q + 1)), 'kk', ['vx', 'vy', 'tok', 'rm', 'j0']))} }`);
    // vertices at one place: the chain a place's hash leads to (WH: the heads, RN: the links)
    out.push(`function M_whGet() { ${tree1('hq', 0, NQ - 1, q => `j = WH${q + 1}[hk];`)} }`);
    out.push(`function M_whSet() { ${tree1('hq', 0, NQ - 1, q => `WH${q + 1}[hk] = wLo + rawN;`)} }`);
    out.push(`function M_chain() { qq = idiv(j - 1, PG); kk = j - qq * PG; ${tree1('qq', 0, NQ - 1, q => `if (RX${q + 1}[kk] == vx && RY${q + 1}[kk] == vy && RZ${q + 1}[kk] == tok) { cn = j; } else { j = RN${q + 1}[kk]; }`)} }`);
    out.push(`function M_canon(e) { qq = idiv(e - 1, PG); kk = e - qq * PG; ${tree1('qq', 0, NQ - 1, q => `m = RM${q + 1}[kk];`)} if (m < 0) { e = 0 - m; } }`);
    out.push(`function whGrow(q) { ${tree('q', 1, NQ, q => `while (WH${q}.length < PG) { WH${q}.push(0); }`)} }`);
    out.push(`function M_corner(g, lv) {
  qq = idiv(g - 1, PG); kk = g - qq * PG; miss = 0;
  ${tree1('qq', 0, NQ - 1, q => `m = RM${q + 1}[kk]; if (m > stampLo) { lv = m - stampLo; } else { x = RX${q + 1}[kk]; y = RY${q + 1}[kk]; z = RZ${q + 1}[kk]; pnv = pnv + 1; lv = pnv; RM${q + 1}[kk] = stampLo + pnv; miss = 1; }`)}
  if (miss == 1) { ${tree1('pg', 1, NP, p => putAll(['VX', 'VY', 'VZ'].map(n => n + p), 'pnv', ['x', 'y', 'z']))} }
}`);
    out.push(`function M_facePut() { ${tree1('pg', 1, NP, p => putAll(['FA', 'FB', 'FC', 'FE', 'FM'].map(n => n + p), 'pnf', ['la', 'lb', 'lc', 'ld', 'curMb']))} }`);
    // a page's own functions
    for (let p = 1; p <= NPT; p++) {
        const full = p <= NP;
        out.push(`function pgL${p}(op) {
  let n = PNF[${p}], nv = PNV[${p}];
  if (op == 6) { M_grow(${L('SX SY LK CL', p)}); }
  else { if (op == 3) { M_fnorm(${L('VX VY VZ FA FB FC FE NA NB NC ND SX SY LK CL', p)}, ${p}); }
  else { if (op == 4) { M_neg(${L('NA NB NC ND', p)}); }${full ? `
    else { if (op == 5) { M_lodA(${L('VX VY VZ FA FB FC FE FM', p)}); }
      else { n = nv; if (op == 1) { M_bbox(${L('VX VY VZ', p)}); } else { M_norm(${L('VX VY VZ', p)}); } } }` : ''} } }
}`);
        out.push(`function xf${p}(i0, n) { M_xform(${L('VX VY VZ SX SY', p)}); }`);
        out.push(`function ps${p}(i0, n, rb) { M_pass(${L('FA FB FC NA NB NC ND FM LK CL', p)}); }`);
    }
    const single = [1, NP + 1, NP + 2];
    for (const p of single) out.push(`function dr${p}(n) { M_draw1(${L('FA FB FC FE SX SY LK CL', p)}); }`);
    out.push(`function lodStore1() { M_lodStore(${L('VX VY VZ FA FB FC FE FM', NP + 1)}); }`);
    out.push(`function lodStore2() { M_lodStore(${L('VX VY VZ FA FB FC FE FM', NP + 2)}); }`);
    out.push(`function pageOp(p, op) { ${tree('p', 1, NPT, p => `pgL${p}(op);`)} }`);
    out.push(`function xfPage(p, i0, n) { ${tree('p', 1, NPT, p => `xf${p}(i0, n);`)} }`);
    out.push(`function psPage(p, i0, n, rb) { ${tree('p', 1, NPT, p => `ps${p}(i0, n, rb);`)} }`);
    out.push(`function drPage(p, n) { if (p == 1) { dr1(n); } else { if (p == ${NP + 1}) { dr${NP + 1}(n); } else { dr${NP + 2}(n); } } }`);
    // a model of many pages: each triangle's page from its number
    const multi = (tri) => `    for (const _ of rep(n)) {
      while (r > 0) {
        p = idiv(r, 8192); i = r - p * 8192;
        ${tree('p', 1, NP, p => `${tri}(${L('FA FB FC FE SX SY CL', p)}, i); r = LK${p}[i];`)}
      }
      b = b - 1;
      r = HD[b];
      HD[b] = 0;
    }`;
    out.push(`function drawMulti(n) {
  let b = dB, r = dR, p = 0, i = 0;
  if (rOut == 1) {
${multi('M_triO')}
    penUp();
  } else {
${multi('M_tri')}
  }
  fillStop();
  dB = b; dR = r;
}`);
    return out.join(NL) + NL;
}

const hex2 = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
// colours for materials that came without one
const AUTOC = [[222, 96, 82], [86, 156, 222], [112, 190, 110], [236, 190, 78], [168, 120, 214], [72, 196, 196], [236, 140, 78], [214, 112, 170], [150, 160, 172], [190, 208, 96], [120, 132, 220], [206, 170, 140]].flat();

export const FILES = ['load.js', 'render.js', 'main.js', 'test.js'];
export function sources(C, examples) {
    const NPT = C.NP + 2, RAWCAP = C.NQ * C.PG;
    const head = [
        `const NPT = ${NPT}, RAWCAP = ${RAWCAP};`,
        `let HX = ${JSON.stringify(hex2)};`,
        `let AUTOC = ${JSON.stringify(AUTOC)};`,
        `let EXN = ${JSON.stringify(examples.map(e => e[0]))};`,
        `let EXT = ${JSON.stringify(examples.map(e => asPasted(e[1])))};`,
        `const TESTOBJ = ${JSON.stringify(C.TESTOBJ || '')};`,
    ].join(NL) + NL;
    const files = C.TEST ? FILES : FILES.filter(f => f !== 'test.js');
    const stub = C.TEST ? '' : 'function testOut() { }' + NL + 'function benchRun() { }' + NL;
    const raw = head + pageSource(C) + files.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join(NL) + stub;
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#ffffff', bgColor: '#20242c', font: `${fontSize}px Nanum Gothic Coding`, textAlign: 1, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});

// the lists in the order the engine should find them: Entry looks a list up by walking
// through all of them, so the ones the moving picture uses come first
export function listOrder(variables, C) {
    const NPT = C.NP + 2;
    const rank = new Map();
    let r = 0;
    for (const n of ['TZ', 'HD', 'RAMP', 'PNV', 'PNF', 'LVA', 'LVB', 'LVC', 'LVN', 'LVG', 'PBG']) rank.set(n, r++);
    for (const p of [NPT, NPT - 1, ...Array.from({ length: C.NP }, (_, i) => i + 1)]) for (const n of PAGE_LISTS) rank.set(n + p, r++);
    const lists = variables.filter(v => v.variableType === 'list'), rest = variables.filter(v => v.variableType !== 'list');
    lists.sort((a, b) => (rank.has(a.name) ? rank.get(a.name) : 1e6) - (rank.has(b.name) ? rank.get(b.name) : 1e6));
    return [...rest, ...lists];
}

export function build(out, opt = {}) { return buildProject(out, opt).stats; }
export function buildProject(out, { name = `${NAME} v${VERSION}`, more = {}, examples = EXAMPLES() } = {}) {
    const C = { ...consts, ...more };
    const { src, count } = sources(C, examples);
    const cc = { ...C }; delete cc.TESTOBJ; delete cc.LEGACY; delete cc.PLAIN; delete cc.SLIM;
    const prog = compileProgram([src], { consts: cc, plainNumbers: !!C.PLAIN });
    if (C.LEGACY) legacyMath(prog);
    if (C.SLIM) slimBlocks(prog);
    // front to back
    const objects = [
        { ...textBox('help', 0, 0, 452, 250, 11, { visible: false }), script: prog.objectScripts.help },
        // a button (every button is a clone of it)
        { ...textBox('btn', 0, 300, 30, 16, 12, { lineBreak: false, textAlign: 0, bgColor: '#2f3847', visible: false }), script: prog.objectScripts.btn },
        { ...textBox('top', -238, 127, 100, 14, 10, { lineBreak: false }), script: prog.objectScripts.top },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    if (process.env.LINES) fs.writeFileSync(out + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    const variables = listOrder(prog.variables, C);
    const project = packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const big = variables.filter(v => v.variableType === 'list' && v.array.length > 5000).map(v => v.name);
    if (big.length) throw new Error('lists past 5000 items: ' + big);
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, stats: { macros: count, globals: variables.filter(v => v.variableType === 'variable').length, lists: variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, json: JSON.stringify(project).length, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'objr.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(build(out, { more })));
}

// Build the physics simulator: src/*.js (EJS, with M_ macros) -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
export const NAME = '엔트리 3D 물리 시뮬레이터';

// theory the panel compares with
const g = 9.81;
// cantilever 0.5 x 0.1 x 0.1, E 1 MPa, nu 0.3, rho 1000: Euler-Bernoulli w L^4 / 8EI plus
// Timoshenko's shear part w L^2 / (2 k G A), k = 5/6 for a square section
const beam = (() => {
    const L = 0.5, h = 0.1, E = 1e6, nu = 0.3, rho = 1000, A = h * h, I = h ** 4 / 12, w = rho * g * A, G = E / (2 * (1 + nu));
    return w * L ** 4 / (8 * E * I) + w * L * L / (2 * (5 / 6) * G * A);
})();

export const consts = {
    NCAP: 2400, TCAP: 4800, SBCAP: 16, RCAP: 64, CCAP: 1500, TRCAP: 256, HN: 4099, HECAP: 4900, HCELL: 0.1, SSDM: 0.03, SSK: 3, ZCAP: 1500, GRABK: 0.6, GRABV: 1.5, BALLB: 0.5, LCAP: 2200, RVO: 2400, FCAP: 3000, NBK: 240,
    HEX: '0123456789abcdef', PI: Math.PI,
    // accurate mode: the part of the stability limit a step takes, contact stiffness and damping
    // of soft nodes, the longest step for rigid bodies, impulse iterations
    CFL: 0.5, KCF: 4, CZETA: 0.5, DTRIGID: 1 / 1000, ITACC: 40, ITFAST: 10, TOLACC: 0.00001, TOLFAST: 0.001,
    PITER: 2, CGIT: 6, RIGFAST: 120, RIGDX: 0.01, FASTEXPL: 40, SOFTDX: 0.02, CGTOL: 0.001, HALFDEG: 90 / Math.PI, MARGIN: 0.004, SLOP: 0.0005, BAUM: 0.2, FPS: 30, TH: 0.7, FSUB: 2,
    NEAR: 0.05, FOC: 300, SPR: 5, SPS: 12,
    LIX: 0.38, LIY: 0.83, LIZ: 0.41,
    BGCOL: '#c9d6e3', GCOL1: '#d9dde2', GCOL2: '#b7bec7', SHCOL: '#8f969f',
    BEAMD: beam,
    START: 1, MODE0: 1, TEST: 0, TSCN: 1, TMODE: 1, TFRAMES: 30, LEGACY: 1, SLIM: 1,
};

export const FILES = ['core.js', 'soft.js', 'rigid.js', 'scene.js', 'render.js', 'main.js', 'test.js'];
export function sources(C) {
    const files = C.TEST ? FILES : FILES.filter(f => f !== 'test.js');
    const stub = C.TEST ? '' : '\nfunction testStep() { }\n';
    const raw = files.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n') + stub;
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#ffffff', bgColor: '#20242c', font: `${fontSize}px Nanum Gothic Coding`, textAlign: 1, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});

// the lists the steps use most first: Entry finds a list by walking through them all
const HOT = ['PX', 'PY', 'PZ', 'VX', 'VY', 'VZ', 'FX', 'FY', 'FZ', 'NIM', 'TA', 'TB', 'TC', 'TD', 'M11', 'M12', 'M13', 'M21', 'M22', 'M23', 'M31', 'M32', 'M33', 'TV', 'TMU', 'TLA', 'TAL', 'TET', 'TR11', 'TR12', 'TR13', 'TR21', 'TR22', 'TR23', 'TR31', 'TR32', 'TR33', 'TQW', 'TQX', 'TQY', 'TQZ', 'NMS', 'KCN', 'KCD', 'CX', 'CY', 'CZ', 'PPX', 'PPY', 'PPZ', 'RRX', 'RRY', 'RRZ', 'DVX', 'DVY', 'DVZ', 'ZD', 'SVN'];
export function listOrder(variables) {
    const rank = new Map(HOT.map((n, i) => [n, i]));
    const lists = variables.filter(v => v.variableType === 'list'), rest = variables.filter(v => v.variableType !== 'list');
    lists.sort((a, b) => (rank.has(a.name) ? rank.get(a.name) : 1e6) - (rank.has(b.name) ? rank.get(b.name) : 1e6));
    return [...rest, ...lists];
}

export function build(out, opt = {}) { return buildProject(out, opt).stats; }
export function buildProject(out, { name = `${NAME} v${VERSION}`, more = {} } = {}) {
    const C = { ...consts, ...more };
    const { src, count } = sources(C);
    const cc = { ...C }; delete cc.LEGACY; delete cc.SLIM;
    const prog = compileProgram([src], { consts: cc });
    if (C.LEGACY) legacyMath(prog);
    if (C.SLIM) slimBlocks(prog);
    // front to back
    const objects = [
        { ...textBox('help', 0, 0, 470, 230, 10, { visible: false, textAlign: 1 }), script: prog.objectScripts.help },
        { ...textBox('btn', 0, 300, 46, 15, 11, { lineBreak: false, bgColor: '#2f3847', visible: false }), script: prog.objectScripts.btn },
        { ...textBox('top', 0, 105, 478, 60, 9, { textAlign: 1, bgColor: '#1d222b' }), script: prog.objectScripts.top },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    const variables = listOrder(prog.variables);
    const project = packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, stats: { macros: count, globals: variables.filter(v => v.variableType === 'variable').length, lists: variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'phys.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(build(out, { more })));
}

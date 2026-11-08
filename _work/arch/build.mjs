// Build 경계의 건축가: levels (levels.mjs, stages*.mjs) + src/*.js (EJS) -> .ent
// usage: node build.mjs [out.ent] [K=V ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';
import { expandMacros, declareImplicit } from './inline.mjs';
import { packEnt } from './pack.mjs';
import { legacyMath, slimBlocks } from './legacy.mjs';
import { makeWorld, worldLists, SHADE, NFIX } from './levels.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
export const NAME = '경계의 건축가';

const ENDA = '봉쇄\n\n다섯 구역의 코어가 모두 제자리에 들어갔습니다.\n문턱 연구소의 모든 연결이 하나씩 닫힙니다.\n복도는 다시 한 번만 이어지고, 문 뒤에는 늘 같은 방이 있습니다.\n\n이음: "고맙습니다, 엔지니어. 이제 이곳은 평범한 건물입니다.\n가끔은... 그 이상한 복도가 그리울지도 모르겠네요."\n\n- 끝 -\n\n(기록 5개를 모두 모으면 다른 결말을 고를 수 있습니다)\nEnter 또는 클릭: 메뉴로';
const ENDB = '복구\n\n흩어져 있던 다섯 개의 기록이 사고의 진짜 원인을 말해 줍니다.\n서로 어긋나는 연결을 한꺼번에 켜서가 아니라, 하나씩 순서대로 켰어야 했던 것입니다.\n\n코어 다섯 개가 순서대로 빛나고, 연구소의 연결이 안정된 채로 다시 열립니다.\n복도는 여전히 끝나지 않고, 작은 문 안에는 여전히 큰 방이 있습니다.\n하지만 이제는 어디로 이어지는지 모두가 압니다.\n\n이음: "지도가 돌아왔습니다. 함께 걸어 볼까요?"\n\n- 진 엔딩 -\nEnter 또는 클릭: 메뉴로';

export const consts = {
    NEAR: 0.035, FOC: 250, EYE: 1.6, RAD: 0.3, HT: 1.8, SPEED: 3.6, GRAV: 15, JUMPV: 5.7, STEP: 0.52, THR: 0.06, AIRC: 4, TERMV: 14,
    MAXDEP: 7, CLM: 48, LMAX: 60, GRID: 1, GRIDDEP: 2, FOGD: 16, FOGR: 16, FOGG: 18, FOGB: 24, FOGC: '#101218', HEXD: '0123456789abcdef',
    SENS: 0.35, TURN: 120, REACH: 2.4, LENSR: 40, RECNEED: 5, QPLAIN: 1, QTESS: 3, DETAIL: 0, SKIPR: 0, SKIPL: 0, PLAINNUM: 1, MAXD_TESS: 5, START: 1, AUTOSTART: 0, TEST: 0,
    ENDA, ENDB, LEGACY: 1, SLIM: 1,
    KEYS: 'WASD 이동 · 마우스 끌기/방향키 시점 · Space 점프 · Shift 달리기\nE 들기·놓기·레버·렌즈 · X 렌즈 끊기 · R 다시 · H 힌트 · G 화질 · M 메뉴',
};

export const FILES = ['core.js', 'render.js', 'play.js', 'logic.js', 'main.js', 'test.js'];
export function worldSource() {
    const W = makeWorld();
    const L = worldLists(W);
    const text = Object.entries(L).map(([k, v]) => `let ${k} = [${v.map(x => typeof x === 'string' ? JSON.stringify(x) : (Number.isFinite(x) ? String(x) : (() => { throw new Error(`${k}: ${x}`); })())).join(', ')}];`).join('\n');
    return { W, L, text, NSIG: W.sigs };
}
export function sources(C) {
    const files = C.TEST ? FILES : FILES.filter(f => f !== 'test.js');
    const stub = C.TEST ? '' : '\nfunction testStep() { }\n';
    const { text } = worldSource();
    const raw = text + '\n' + files.map(f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')).join('\n') + stub;
    const { src, count } = expandMacros(raw);
    return { src: declareImplicit(src), count };
}
export function allConsts(more = {}) {
    const { NSIG } = worldSource();
    return { ...consts, NSIG, NLEV: SHADE.NLEV, FSTEP: SHADE.FSTEP, PSTRIDE: SHADE.NLEV * 6, NFIX, FOGR0: SHADE.FOG[0], FOGG0: SHADE.FOG[1], FOGB0: SHADE.FOG[2], ...more };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const textBox = (id, x, y, width, height, fontSize, more = {}) => ({
    id, name: id, objectType: 'textBox', text: ' ',
    entity: { x, y, colour: '#ffffff', bgColor: '#20242c', font: `${fontSize}px Nanum Gothic Coding`, textAlign: 0, lineBreak: true,
        bold: false, underLine: false, strike: false, italic: false, fontSize, width, height, visible: true, ...more },
});

// lists the hot code reads most go first: Entry finds a list by walking through them all
const HOT = ['SX', 'SY', 'QX', 'QY', 'QZ', 'NX', 'NY', 'NZ', 'TX', 'TY', 'CLX', 'CLY', 'HX', 'PCX', 'PCY', 'PCZ', 'PNX', 'PNY', 'PNZ', 'PRX', 'PRY', 'PRZ', 'PUX', 'PUY', 'PUZ', 'PW', 'PH', 'PL', 'OR', 'OX', 'OY', 'OZ', 'OS', 'OT', 'OHX', 'OHY', 'OHZ', 'RP0', 'RPN', 'SG'];
export function listOrder(variables) {
    const rank = new Map(HOT.map((n, i) => [n, i]));
    const lists = variables.filter(v => v.variableType === 'list'), rest = variables.filter(v => v.variableType !== 'list');
    lists.sort((a, b) => (rank.has(a.name) ? rank.get(a.name) : 1e6) - (rank.has(b.name) ? rank.get(b.name) : 1e6));
    return [...rest, ...lists];
}

export function buildProject(out, { name = `${NAME} v${VERSION}`, more = {} } = {}) {
    const C = allConsts(more);
    const { src, count } = sources(C);
    const cc = { ...C }; delete cc.LEGACY; delete cc.SLIM;
    const prog = compileProgram([src], { consts: cc, plainNumbers: !!C.PLAINNUM, skipZeroInit: true });
    if (C.LEGACY) legacyMath(prog);
    if (C.SLIM) slimBlocks(prog);
    // front to back
    const objects = [
        { ...textBox('over', 0, 0, 440, 230, 11, { bgColor: '#151820', visible: false }), script: prog.objectScripts.over },
        { ...textBox('msg', 0, -112, 470, 30, 10, { bgColor: '#151820', visible: false }), script: prog.objectScripts.msg },
        { ...textBox('top', 0, 117, 480, 36, 9, { bgColor: '#151820' }), script: prog.objectScripts.top },
        { ...textBox('menu', -116, 26, 236, 186, 10, { bgColor: '#151820' }), script: prog.objectScripts.menu },
        { ...textBox('menu2', 120, 26, 236, 186, 10, { bgColor: '#151820' }), script: prog.objectScripts.menu2 },
        { ...textBox('desc', 0, -103, 478, 64, 9, { bgColor: '#1c2230' }), script: prog.objectScripts.desc },
        { id: 'pen', name: 'pen', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: prog.objectScripts.pen },
    ];
    for (const k of Object.keys(prog.objectScripts)) if (!objects.some(o => o.id === k)) throw new Error('script for an unknown object: ' + k);
    const variables = listOrder(prog.variables);
    const project = packEnt(out, { name, tmpDir: path.join(HERE, '.pack'), variables, functions: prog.functions, messages: prog.messages, objects, speed: 60 });
    const blocks = prog.functions.reduce((a, f) => a + f.content.split('"type"').length - 1, 0) + JSON.stringify(objects.map(o => o.script)).split('"type"').length - 1;
    return { project, src, C, stats: { macros: count, globals: variables.filter(v => v.variableType === 'variable').length, lists: variables.filter(v => v.variableType === 'list').length, functions: prog.functions.length, blocks, bytes: fs.statSync(out).size } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const out = process.argv[2] || path.join(HERE, 'arch.ent');
    const more = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => a.split('=')).map(([k, v]) => [k, Number(v)]));
    console.log('wrote', out, JSON.stringify(buildProject(out, { more }).stats));
}

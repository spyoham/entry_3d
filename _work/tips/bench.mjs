// Experiments for the write-up "노하우 팁/최적화": one project, run in the offline editor (real entryjs).
//   E1 how a loop turns: plain repeat / repeat with the no-delay trick / recursion
//   E2 hidden pauses inside a no-delay loop: empty else branch, empty function, wait 0 s
//   E3 what one statement costs (20 statements a turn, the empty loop subtracted)
//   E4 the pen: frame time when the drawing is cleared every frame and when it piles up
//   E5 number traps: change-by with a tiny step, 0.1 + 0.2, random with decimal bounds, a tiny quotient
// usage: node bench.mjs  -> result.json
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { B, newId, list } from '../expfn/lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
import { runEnt } from '../gmp/erun.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const V = {}; const L = {};
const vars = [];
const variable = (name, value = 0, visible = false) => { const id = newId(); V[name] = id; vars.push({ name, id, value, variableType: 'variable', visible, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: -230, y: -130 + vars.length * 4 }); };
const mklist = (name, arr, visible = false) => { const id = newId(); L[name] = id; const l = list(name, id, arr); l.visible = visible; if (visible) { l.x = 120; l.y = -120; } vars.push(l); };
['x', 'T', 'done', 'n', 'i', 'zero', 'z', 'w', 'w2', 'q'].forEach(n => variable(n));
variable('a', 12345); variable('b', 678); variable('c', 0.1234567); variable('d', 0.7654321);
variable('xv', 0, true);
mklist('R', []); mklist('FA', []); mklist('FB', []); mklist('BIG', Array.from({ length: 100 }, (_, i) => i * 3 + 1));
mklist('LH', Array.from({ length: 10 }, (_, i) => i)); mklist('LV', Array.from({ length: 10 }, (_, i) => i), true);

const num = (v) => B('number', [String(v)]);
const get = (n) => B('get_variable', [V[n], null]);
const set = (n, e) => B('set_variable', [V[n], e, null]);
const calc = (a, op, b) => B('calc_basic', [a, op, b]);
const old = (type, a, b) => B(type, [a, null, b]);
const cmp = (a, op, b) => B('boolean_basic_operator', [a, op, b]);
const timer = () => B('get_project_timer_value', [null, 0]);
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);
const repeat = (n, body) => B('repeat_basic', [typeof n === 'number' ? num(n) : n, null], [body]);
const push = (lname, e) => B('add_value_to_list', [e, L[lname], null]);
const record = (label, e) => [push('R', B('text', [label])), push('R', e)];
const elapsedMs = () => calc(calc(timer(), 'MINUS', get('T')), 'MULTI', num(1000));

const functions = [];
// a normal function; opts.param gives it one parameter, opts.locals local variables
function fn(name, bodyOf, { param = false, locals = [] } = {}) {
    const id = newId(), pid = newId();
    const P = () => B(`stringParam_${pid}`, []);
    const loc = Object.fromEntries(locals.map(n => [n, `${id}_${newId()}`]));
    const chain = param ? { ...B('function_field_string', [P(), null]), copyable: false, assemble: false } : null;
    const label = { ...B('function_field_label', [name, chain]), copyable: false };
    const body = bodyOf({ P, loc, call: (arg) => B(`func_${id}`, param ? [arg, null] : [null]) });
    functions.push({ id, type: 'normal', localVariables: locals.map(n => ({ name: n, value: 0, id: loc[n] })), useLocalVariables: locals.length > 0,
        content: JSON.stringify([[B('function_create', [label, null], [body])]]) });
    return (arg) => B(`func_${id}`, param ? [arg, null] : [null]);
}
const inc = () => set('x', calc(get('x'), 'PLUS', num(1)));
const timed = (label, stmts, divisor) => [set('T', timer()), ...stmts, ...record(label, calc(elapsedMs(), 'DIVIDE', num(divisor))), B('wait_second', [num(0), null])];

// ---------- E1: 바퀴 하나에 걸리는 시간 (ms) ----------
const N_PLAIN = 120, N_FAST = 3000, DEPTH = 500, RECR = 6;
const fastLoop = fn('빠른반복', () => [repeat(N_FAST, [inc(), trick()])]);
const recur = fn('재귀', ({ P, call }) => [B('_if', [cmp(P(), 'GREATER', num(0)), null], [[inc(), call(calc(P(), 'MINUS', num(1)))]])], { param: true });
const recurRuns = fn('재귀여러번', () => [repeat(RECR, [recur(num(DEPTH)), trick()])]);
const E1 = [
    ...timed('E1 plain', [repeat(N_PLAIN, [inc()])], N_PLAIN),
    ...timed('E1 trick', [fastLoop()], N_FAST),
    ...timed('E1 recursion', [recurRuns()], DEPTH * RECR),
];

// ---------- E2: 무지연 반복 안의 숨은 쉼 (바퀴 하나, ms) ----------
const N2 = 60;
const emptyFn = fn('빈함수', () => []);
const E2cases = {
    'E2 if-else both filled': () => B('if_else', [cmp(num(1), 'EQUAL', num(1)), null, null], [[inc()], [inc()]]),
    'E2 empty else, not taken': () => B('if_else', [cmp(num(1), 'EQUAL', num(1)), null, null], [[inc()], []]),
    'E2 empty else, taken': () => B('if_else', [cmp(num(1), 'EQUAL', num(2)), null, null], [[inc()], []]),
    'E2 empty function call': () => emptyFn(),
    'E2 wait 0 seconds': () => B('wait_second', [num(0), null]),
};
const E2 = Object.entries(E2cases).flatMap(([label, mk]) => {
    const f = fn(label.replace(/\W+/g, '_'), () => [repeat(N2, [mk(), trick()])]);
    return timed(label, [f()], N2);
});

// ---------- E3: 문장 하나의 값 (µs) ----------
const PER = 20, TURNS = 100, REPS = 3, ROUNDS = 9;
const loc = (l, e) => B('set_func_variable', [l.t, e, null]);
const K = {
    'empty loop': null,
    'local = 1': (l) => loc(l, num(1)),
    'local = a + b (whole)': (l) => loc(l, calc(get('a'), 'PLUS', get('b'))),
    'local = c + d (decimal)': (l) => loc(l, calc(get('c'), 'PLUS', get('d'))),
    'local = c × d (decimal)': (l) => loc(l, calc(get('c'), 'MULTI', get('d'))),
    'local = c ÷ d (decimal)': (l) => loc(l, calc(get('c'), 'DIVIDE', get('d'))),
    'local = c + d (old block)': (l) => loc(l, old('calc_plus', get('c'), get('d'))),
    'local = c × d (old block)': (l) => loc(l, old('calc_times', get('c'), get('d'))),
    'local = square of c': (l) => loc(l, B('calc_operation', [null, get('c'), null, 'square'])),
    'local = quotient a / b': (l) => loc(l, B('quotient_and_mod', [null, get('a'), null, get('b'), null, 'QUOTIENT'])),
    'local = item 37 of list': (l) => loc(l, B('value_of_index_from_list', [null, L.BIG, null, num(37), null])),
    'local = c': (l) => loc(l, get('c')),
    'global x = 1 (hidden)': (l) => set('x', num(1)),
    'global xv = 1 (shown)': (l) => set('xv', num(1)),
    'change x by 1': (l) => B('change_variable', [V.x, num(1), null]),
    'replace item, hidden list': (l) => B('change_value_list_index', [L.LH, num(3), num(5), null]),
    'replace item, shown list': (l) => B('change_value_list_index', [L.LV, num(3), num(5), null]),
};
const E3 = [];
for (const [label, mk] of Object.entries(K)) {
    const f = fn('E3_' + newId(), ({ loc }) => [repeat(REPS, [repeat(TURNS, [...(mk ? Array.from({ length: PER }, () => mk({ t: loc.t })) : []), trick()]), trick()])], { locals: ['t'] });
    E3.push(repeat(ROUNDS, timed('E3 ' + label, [f()], REPS * TURNS * PER / 1000)));
}

// ---------- E4: 붓 — 매 장 지우기 vs 쌓기 ----------
const FRAMES = 40, SEGS = 300;
const draw = fn('선긋기', () => [repeat(SEGS, [
    set('i', calc(get('i'), 'PLUS', num(1))),
    B('locate_xy', [calc(B('quotient_and_mod', [null, calc(get('i'), 'MULTI', num(37)), null, num(400), null, 'MOD']), 'MINUS', num(200)),
        calc(B('quotient_and_mod', [null, calc(get('i'), 'MULTI', num(91)), null, num(300), null, 'MOD']), 'MINUS', num(150)), null]),
    trick()])]);
const frames = (lname, clear) => [set('T', timer()), repeat(FRAMES, [...(clear ? [B('brush_erase_all', [null])] : []), draw(),
    set('w2', timer()), push(lname, calc(calc(get('w2'), 'MINUS', get('T')), 'MULTI', num(1000))), set('T', get('w2')), B('wait_second', [num(0), null])])];
const E4 = [B('start_drawing', [null]), ...frames('FA', true), B('brush_erase_all', [null]), ...frames('FB', false), B('stop_drawing', [null]), B('brush_erase_all', [null])];

// ---------- E5: 숫자 함정 ----------
const randZeros = fn('무작위', () => [repeat(2000, [B('_if', [cmp(B('calc_rand', [null, num('0.0001'), null, num('0.9999'), null]), 'EQUAL', num(0)), null], [[B('change_variable', [V.zero, num(1), null])]]), trick()])]);
const E5 = [
    set('z', num(0.5)), B('change_variable', [V.z, num('0.00000012'), null]), ...record('E5 0.5 change by 0.00000012', get('z')),
    set('w', num(0.5)), set('w', calc(get('w'), 'PLUS', num('0.00000012'))), ...record('E5 0.5 set to w + 0.00000012', get('w')),
    set('q', num(0.5)), B('change_variable', [V.q, calc(num('0.00000012'), 'MULTI', num(1)), null]), ...record('E5 0.5 change by (0.00000012 x 1)', get('q')),
    ...record('E5 0.1 + 0.2', calc(num(0.1), 'PLUS', num(0.2))),
    ...record('E5 0.1 + 0.2 old block', old('calc_plus', num(0.1), num(0.2))),
    ...record('E5 1e-15 / 7', calc(num('0.000000000000001'), 'DIVIDE', num(7))),
    ...record('E5 1 / 3e20', calc(num(1), 'DIVIDE', num('300000000000000000000'))),
    randZeros(), ...record('E5 zeros of rand(0.0001,0.9999) in 2000', get('zero')),
];

const main = [B('when_run_button_click', [null]), B('choose_project_timer_action', [null, 'START', null, null]),
    B('wait_second', [num(0.5), null]), ...E5, ...E1, ...E2, ...E3, ...E4, set('done', num(1))];
main[0].x = 50; main[0].y = 30;

const file = path.join(HERE, 'bench.ent');
const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
packEnt(file, { name: '최적화 실험', tmpDir: path.join(HERE, '.pack'), variables: vars, functions, speed: 60,
    objects: [{ id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: [main] }] });
if (process.argv.includes('--build-only')) process.exit(0);
const r = await runEnt(file, { vars: ['done'], lists: ['R', 'FA', 'FB'], timeout: 900000 });
if (!r.done) throw new Error('did not finish: ' + r.errors.slice(0, 3).join(' | '));
const res = {};
for (let k = 0; k < r.vars.R.length; k += 2) (res[r.vars.R[k]] ??= []).push(r.vars.R[k + 1]);
const out = { when: new Date().toISOString(), results: res, FA: r.vars.FA, FB: r.vars.FB, errors: r.errors };
fs.writeFileSync(path.join(HERE, 'result.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(42), v.join('  '));
console.log('FA', r.vars.FA.map(x => Math.round(x)).join(' '));
console.log('FB', r.vars.FB.map(x => Math.round(x)).join(' '));
console.log('errors', r.errors.slice(0, 5));

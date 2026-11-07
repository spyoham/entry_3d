// More experiments for "노하우 팁/최적화" (real entryjs, offline editor), same method as bench.mjs E3:
// statements repeated in a no-delay loop inside a function, the empty loop subtracted, minimum of ROUNDS.
//   E8a variables: global made first vs last of 300, a parameter
//   E8b lists (4000 items): add+delete at the end vs at the front, contains, length, item 2000
//   E8c text: join, letter n, length
//   E8d the sprite: move, turn, size, costume, effects, touching, speech
//   E8e textbox write (run by the textbox itself)
//   E8f clones: create (plain object, object with a 1000-item local list)
//   E8g signals: cost of sending, and whether 50 sends in one tick start 50 receivers
// usage: node bench2.mjs  -> result2.json
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { B, newId, list } from '../expfn/lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
import { runEnt } from '../gmp/erun.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const V = {}, L = {}, vars = [];
const variable = (name, value = 0) => { const id = newId(); V[name] = id; vars.push({ name, id, value, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 }); };
const mklist = (name, arr, object = null) => { const id = newId(); L[name] = id; const l = list(name, id, arr); l.object = object; vars.push(l); };
variable('first', 7);
variable('sa', 'abc'); variable('sb', 'def'); variable('s100', 'abcdefghij'.repeat(10));
for (let i = 0; i < 300; i++) variable('pad' + i, i);
['T', 'done', 'n', 'tbgo', 'c'].forEach(n => variable(n));
variable('last', 7);
mklist('R', []); mklist('BIG', Array.from({ length: 4000 }, (_, i) => i));
mklist('LOC', Array.from({ length: 1000 }, (_, i) => i), 'D');

const num = (v) => B('number', [String(v)]);
const get = (n) => B('get_variable', [V[n], null]);
const set = (n, e) => B('set_variable', [V[n], e, null]);
const calc = (a, op, b) => B('calc_basic', [a, op, b]);
const timer = () => B('get_project_timer_value', [null, 0]);
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);
const repeat = (n, body) => B('repeat_basic', [num(n), null], [body]);
const push = (l, e) => B('add_value_to_list', [e, L[l], null]);
const record = (label, e) => [push('R', B('text', [label])), push('R', e)];
const elapsedMs = () => calc(calc(timer(), 'MINUS', get('T')), 'MULTI', num(1000));

const functions = [];
function fn(name, bodyOf, { param = false, locals = [] } = {}) {
    const id = newId(), pid = newId();
    const P = () => B(`stringParam_${pid}`, []);
    const loc = Object.fromEntries(locals.map(n => [n, `${id}_${newId()}`]));
    const chain = param ? { ...B('function_field_string', [P(), null]), copyable: false, assemble: false } : null;
    const label = { ...B('function_field_label', [name, chain]), copyable: false };
    const body = bodyOf({ P, loc });
    functions.push({ id, type: 'normal', localVariables: locals.map(n => ({ name: n, value: 0, id: loc[n] })), useLocalVariables: locals.length > 0,
        content: JSON.stringify([[B('function_create', [label, null], [body])]]) });
    return (arg) => B(`func_${id}`, param ? [arg, null] : [null]);
}
// one measured case: PER statements a turn (mk(k, ctx) makes statement k), TURNS turns, ROUNDS rounds
const ROUNDS = 7;
function measure(label, mk, { per = 20, turns = 100, param = false } = {}) {
    const f = fn('m_' + newId(), ({ loc, P }) => [repeat(turns, [...(mk ? Array.from({ length: per }, (_, k) => mk(k, { t: loc.t, P })) : []), trick()])], { locals: ['t'], param });
    return repeat(ROUNDS, [set('T', timer()), param ? f(num(5)) : f(), ...record(label + '|' + per + '|' + turns, elapsedMs()), B('wait_second', [num(0), null])]);
}
const loc = (c, e) => B('set_func_variable', [c.t, e, null]);
const P1 = 'p1', P2 = 'p2';

const cases = [
    ['empty', null],
    ['local = global made first of 300', (k, c) => loc(c, get('first'))],
    ['local = global made last of 300', (k, c) => loc(c, get('last'))],
    ['local = parameter', (k, c) => loc(c, c.P()), { param: true }],
    ['add at end, delete last (each)', (k, c) => k % 2 ? B('remove_value_from_list', [B('length_of_list', [null, L.BIG, null]), L.BIG, null]) : push('BIG', num(1))],
    ['insert at 1, delete 1 (each)', (k, c) => k % 2 ? B('remove_value_from_list', [num(1), L.BIG, null]) : B('insert_value_to_list', [num(1), L.BIG, num(1), null])],
    ['local = item 2000 of 4000', (k, c) => loc(c, B('value_of_index_from_list', [null, L.BIG, null, num(2000), null]))],
    ['local = length of list', (k, c) => loc(c, B('length_of_list', [null, L.BIG, null]))],
    ['local = list contains (absent)', (k, c) => loc(c, B('is_included_in_list', [null, L.BIG, null, num(-1), null])), { per: 4, turns: 20 }],
    ['local = join two texts', (k, c) => loc(c, B('combine_something', [null, get('sa'), null, get('sb'), null]))],
    ['local = letter 50 of 100', (k, c) => loc(c, B('char_at', [null, get('s100'), null, num(50), null]))],
    ['local = length of text', (k, c) => loc(c, B('length_of_string', [null, get('s100'), null]))],
    ['local = random 1..100', (k, c) => loc(c, B('calc_rand', [null, num(1), null, num(100), null]))],
    ['move to x: y:', (k, c) => B('locate_xy', [num(k), num(-k), null])],
    ['turn to (direction)', (k, c) => B('rotate_absolute', [num(k * 3), null])],
    ['set size', (k, c) => B('set_scale_size', [num(100 + k), null])],
    ['change costume', (k, c) => B('change_to_some_shape', [B('get_pictures', [k % 2 ? P2 : P1]), null])],
    ['change transparency', (k, c) => B('change_effect_amount', ['transparency', num(k % 2 ? 1 : -1), null])],
    ['change color effect', (k, c) => B('change_effect_amount', ['color', num(k % 2 ? 1 : -1), null]), { per: 10, turns: 20 }],
    ['local = touching other object', (k, c) => loc(c, B('reach_something', [null, 'TGT', null])), { per: 10, turns: 50 }],
    ['say (speech bubble)', (k, c) => B('dialog', [B('text', ['hi' + (k % 2)]), 'speak', null]), { per: 4, turns: 10 }],
];
const E8 = cases.map(([label, mk, opt]) => measure(label, mk, opt || {}));
E8.push(B('remove_dialog', [null]), B('erase_all_effects', [null]));
// touching when the two really overlap (the first case is far apart, so the box test rejects it early)
E8.push(B('locate_xy', [num(0), num(0), null]), B('set_scale_size', [num(100), null]), B('rotate_absolute', [num(0), null]),
    measure('local = touching overlapping object', (k, c) => loc(c, B('reach_something', [null, 'TGT2', null])), { per: 10, turns: 50 }));

// clones: 100 clones in one tick, then they delete themselves
const clones = (label, obj) => repeat(5, [set('T', timer()), repeat(100, [B('create_clone', [obj, null]), trick()]), ...record(label + '|1|100', elapsedMs()), B('wait_second', [num(0.3), null])]);
const E8f = [clones('create clone (plain)', 'C'), clones('create clone (1000-item local list)', 'D')];

// signals
const M1 = newId(), M2 = newId();
const E8g = [
    measure('send signal (no receivers)', () => B('message_cast', [M2, null]), { per: 10, turns: 20 }),
    B('wait_second', [num(0.2), null]),
    set('n', num(0)), set('T', timer()), repeat(50, [B('message_cast', [M1, null]), trick()]), ...record('sends in one tick|1|1', elapsedMs()),
    B('wait_second', [num(0.3), null]), ...record('receivers that ran after 50 sends|1|1', get('n')),
];

const main = [B('when_run_button_click', [null]), B('choose_project_timer_action', [null, 'START', null, null]), B('wait_second', [num(0.5), null]),
    ...E8, ...E8f, ...E8g, set('tbgo', num(1)), B('wait_until_true', [B('boolean_basic_operator', [get('tbgo'), 'EQUAL', num(2)]), null]), set('done', num(1))];
const tbScript = [B('when_run_button_click', [null]), B('wait_until_true', [B('boolean_basic_operator', [get('tbgo'), 'EQUAL', num(1)]), null]),
    measure('textbox write', (k) => B('text_write', [B('text', ['v' + k]), null]), { per: 10, turns: 20 }), set('tbgo', num(2))];
const selfDelete = [[B('when_clone_start', [null]), B('delete_clone', [null])]];
const receiver = [[B('when_message_cast', [null, M1]), B('change_variable', [V.n, num(1), null])]];

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const pic = (id) => [{ id, name: id, buf: DOT, w: 1, h: 1 }];
const big = { scaleX: 40, scaleY: 40 };
const file = path.join(HERE, 'bench2.ent');
packEnt(file, { name: '최적화 실험 2', tmpDir: path.join(HERE, '.pack2'), variables: vars, functions, speed: 60,
    messages: [{ id: M1, name: '받기' }, { id: M2, name: '아무도' }],
    objects: [
        { id: 'main', name: 'main', pictures: [...pic(P1), ...pic(P2)], entity: { ...big, x: -100 }, script: [main] },
        { id: 'TGT', name: 'TGT', pictures: pic('pt'), entity: { ...big, x: 200, y: 100 }, script: [[]] },
        { id: 'TGT2', name: 'TGT2', pictures: pic('pt2'), entity: { ...big, x: 10, y: 10 }, script: [[]] },
        { id: 'C', name: 'C', pictures: pic('pc'), entity: { x: 0, y: -120 }, script: selfDelete },
        { id: 'D', name: 'D', pictures: pic('pd'), entity: { x: 0, y: -120 }, script: selfDelete },
        { id: 'RCV', name: 'RCV', pictures: pic('pr'), entity: { x: 100, y: -120 }, script: receiver },
        { id: 'TB', name: 'TB', objectType: 'textBox', text: 'v', entity: { x: 0, y: 120, width: 120, height: 30, font: '20px NanumGothic', colour: '#000000', bgColor: '#ffffff', lineBreak: false }, script: [tbScript] },
    ] });
if (process.argv.includes('--build-only')) process.exit(0);
const r = await runEnt(file, { vars: ['done', 'n'], lists: ['R'], timeout: 900000 });
if (!r.done) throw new Error('did not finish: ' + r.errors.slice(0, 3).join(' | '));
const raw = {};
for (let k = 0; k < r.vars.R.length; k += 2) (raw[r.vars.R[k]] ??= []).push(Number(r.vars.R[k + 1]));
// µs per statement: (ms per turn - empty ms per turn) / per
const emptyKey = Object.keys(raw).find(k => k.startsWith('empty|'));
const eTurns = Number(emptyKey.split('|')[2]);
const emptyTurn = Math.min(...raw[emptyKey]) / eTurns;
const res = {};
for (const [k, v] of Object.entries(raw)) {
    const [label, per, turns] = k.split('|'); const min = Math.min(...v);
    if (label.startsWith('create clone')) res[label] = { usPerClone: +(min / Number(turns) * 1000).toFixed(1) };
    else if (label.startsWith('receivers') || label.startsWith('sends in')) res[label] = v;
    else if (label !== 'empty') res[label] = { us: +(((min / Number(turns)) - emptyTurn) / Number(per) * 1000).toFixed(2) };
}
const out = { when: new Date().toISOString(), emptyTurnMs: emptyTurn, results: res, raw, errors: r.errors };
fs.writeFileSync(path.join(HERE, 'result2.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(40), JSON.stringify(v));
console.log('errors', r.errors.slice(0, 5));

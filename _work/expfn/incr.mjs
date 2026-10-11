// Counting up by one, three ways, in the real engine (microseconds a statement):
// x 에 1 만큼 더하기 / x 를 (x + 1) 로 정하기 / x 를 (NEXT 의 x 번째 항목) 으로 정하기, NEXT = [2, 3, 4, ...]
// Each loop turn holds PER of the statement, so the loop itself is a small share; 'empty' is the loop alone.
import path from 'node:path';
import { B, newId, list, HERE } from './lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
import { runEnt } from '../gmp/erun.mjs';
const PER = 20, TURNS = 200, REPS = 5, ROUNDS = 30, N = PER * TURNS;
const V = { x: newId(), T: newId(), done: newId() }, L = { NEXT: newId(), BT: newId(), XS: newId() };
const variable = (name, id) => ({ name, id, value: 0, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 });
const num = (v) => B('number', [String(v)]);
const get = (id) => B('get_variable', [id, null]);
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);
const timer = () => B('get_project_timer_value', [null, 0]);
const KINDS = {
    empty: null,
    change: () => B('change_variable', [V.x, num(1), null]),
    setplus: () => B('set_variable', [V.x, B('calc_basic', [get(V.x), 'PLUS', num(1)]), null]),
    setlist: () => B('set_variable', [V.x, B('value_of_index_from_list', [null, L.NEXT, null, get(V.x), null]), null]),
    setconst: () => B('set_variable', [V.x, num(1), null]),
    setget: () => B('set_variable', [V.x, get(V.x), null]),
};
const names = Object.keys(KINDS), functions = [], timed = [];
for (const name of names) {
    const rid = newId(), stmt = KINDS[name];
    const label = { ...B('function_field_label', ['run_' + name, null]), copyable: false };
    const body = [B('repeat_basic', [num(REPS), null], [[B('set_variable', [V.x, num(1), null]),
        B('repeat_basic', [num(TURNS), null], [[...(stmt ? Array.from({ length: PER }, stmt) : []), trick()]]), trick()]])];
    functions.push({ id: rid, type: 'normal', localVariables: [], useLocalVariables: false, content: JSON.stringify([[B('function_create', [label, null], [body])]]) });
    timed.push(B('set_variable', [V.T, timer(), null]), B(`func_${rid}`, [null]),
        B('add_value_to_list', [B('calc_basic', [timer(), 'MINUS', get(V.T)]), L.BT, null]),
        B('add_value_to_list', [get(V.x), L.XS, null]), B('wait_second', [num(0), null]));
}
const main = [B('when_run_button_click', [null]), B('choose_project_timer_action', [null, 'START', null, null]),
    B('repeat_basic', [num(ROUNDS), null], [timed]), B('set_variable', [V.done, num(1), null])];
main[0].x = 50; main[0].y = 30;
const variables = [...Object.entries(V).map(([n, id]) => variable(n, id)),
    list('NEXT', L.NEXT, Array.from({ length: N + 1 }, (_, i) => i + 2)), list('BT', L.BT, []), list('XS', L.XS, [])];
const file = path.join(HERE, 'incr.ent');
packEnt(file, { name: 'incr bench', tmpDir: path.join(HERE, '.pack'), variables, functions, speed: 60,
    objects: [{ id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), w: 1, h: 1 }], script: [main] }] });
const r = await runEnt(file, { vars: ['done'], lists: ['BT', 'XS'], timeout: 300000 });
if (!r.done) throw new Error('did not finish: ' + r.errors.slice(0, 3).join(' | '));
const col = (i) => Array.from({ length: ROUNDS }, (_, k) => Number(r.vars.BT[k * names.length + i]) * 1e6 / (REPS * N));
const sorted = names.map((_, i) => col(i).sort((a, b) => a - b));
console.log('name'.padEnd(9), 'best'.padStart(7), 'median'.padStart(7), '  minus the empty loop', '  x at the end');
names.forEach((n, i) => console.log(n.padEnd(9), sorted[i][0].toFixed(3).padStart(7), sorted[i][ROUNDS >> 1].toFixed(3).padStart(7),
    (sorted[i][0] - sorted[0][0]).toFixed(3).padStart(12), '          ', r.vars.XS[i]));

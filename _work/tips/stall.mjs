// E6 for "노하우 팁/최적화": what happens to the rest of the project while a no-delay loop runs longer than a tick.
//   script A: a plain loop that writes the clock (ms) every tick, 250 ticks
//   script B: after 1 s, a no-delay loop of 100000 turns (about a second), clock before and after
//   script C: waits 1.2 s (that moment falls inside B's loop) and writes the clock when it wakes
// usage: node stall.mjs  -> stall.json
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { B, newId, list } from '../expfn/lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
import { runEnt } from '../gmp/erun.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const V = {}, L = {}, vars = [];
const variable = (name) => { const id = newId(); V[name] = id; vars.push({ name, id, value: 0, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 }); };
const mklist = (name) => { const id = newId(); L[name] = id; const l = list(name, id, []); l.visible = false; vars.push(l); };
['x', 'T0', 'done'].forEach(variable); ['TA', 'R'].forEach(mklist);
const num = (v) => B('number', [String(v)]);
const get = (n) => B('get_variable', [V[n], null]);
const set = (n, e) => B('set_variable', [V[n], e, null]);
const calc = (a, op, b) => B('calc_basic', [a, op, b]);
const now = () => calc(calc(B('get_project_timer_value', [null, 0]), 'MULTI', num(1000)), 'MINUS', get('T0'));
const push = (l, e) => B('add_value_to_list', [e, L[l], null]);
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);
const repeat = (n, body) => B('repeat_basic', [num(n), null], [body]);
const wait = (s) => B('wait_second', [num(s), null]);
const functions = [];
function fn(bodyStmts) {
    const id = newId();
    const label = { ...B('function_field_label', ['f' + id, null]), copyable: false };
    functions.push({ id, type: 'normal', localVariables: [], useLocalVariables: false, content: JSON.stringify([[B('function_create', [label, null], [bodyStmts])]]) });
    return () => B(`func_${id}`, [null]);
}
const stall = fn([repeat(100000, [set('x', calc(get('x'), 'PLUS', num(1))), trick()])]);
const start = () => B('when_run_button_click', [null]);
const A = [start(), set('T0', calc(B('get_project_timer_value', [null, 0]), 'MULTI', num(1000))), repeat(250, [push('TA', now())]), set('done', num(1))];
const Bs = [start(), wait(1), push('R', B('text', ['B start'])), push('R', now()), stall(), push('R', B('text', ['B end'])), push('R', now())];
const C = [start(), wait(1.2), push('R', B('text', ['C woke (asked 1200)'])), push('R', now())];
A[0].x = 50; Bs[0].x = 300; C[0].x = 550;

const file = path.join(HERE, 'stall.ent');
const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
packEnt(file, { name: '멈춤 실험', tmpDir: path.join(HERE, '.pack-stall'), variables: vars, functions, speed: 60,
    objects: [{ id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: [A, Bs, C] }] });
const r = await runEnt(file, { vars: ['done', 'x'], lists: ['TA', 'R'], timeout: 120000 });
if (!r.done) throw new Error('did not finish: ' + r.errors.slice(0, 3).join(' | '));
const ta = r.vars.TA.map(Number), R = r.vars.R;
const ev = {}; for (let k = 0; k < R.length; k += 2) ev[R[k]] = Number(R[k + 1]);
const gaps = ta.slice(1).map((t, i) => t - ta[i]);
const big = gaps.map((g, i) => [g, i]).filter(([g]) => g > 100);
const after = big.length ? ta.slice(big[0][1] + 1) : [];
const res = { when: new Date().toISOString(), x: r.vars.x, events: ev,
    ticksA: ta.length, spanA: ta.at(-1) - ta[0], bigGaps: big.map(([g, i]) => ({ atMs: ta[i], gapMs: g })),
    ticksInFirst200msAfterStall: after.filter(t => t - after[0] < 200).length,
    medianGapOutsideStall: gaps.filter(g => g < 100).sort((a, b) => a - b)[Math.floor(gaps.filter(g => g < 100).length / 2)],
    errors: r.errors };
fs.writeFileSync(path.join(HERE, 'stall.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));

// exp for Entry: candidate functions as small expression trees -> Entry blocks,
// a timing/accuracy project around them, and the run in the real engine.
//
// expression: 'x' (the parameter), '$name' (a function local), a number or a
// numeric string (number block), { t: 'text' } (text block),
// ['*'|'+'|'-'|'/', a, b], ['op', 'square'|'root'|'ln'|'round'|..., a],
// ['cat', a, b], ['idx', 'LIST', i]
import path from 'node:path';
import url from 'node:url';
import { packEnt } from '../cplot/pack.mjs';
import { runEnt } from '../gmp/erun.mjs';
export const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
const used = new Set();
export const newId = (n = 4) => { let id; do { id = Array.from({ length: n }, (_, i) => ALPHA[Math.floor(Math.random() * (i ? 36 : 26))]).join(''); } while (used.has(id)); used.add(id); return id; };
export const B = (type, params = [], statements = []) => ({ id: newId(), x: 0, y: 0, type, params, statements, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [] });
const OPS = { '*': 'MULTI', '+': 'PLUS', '-': 'MINUS', '/': 'DIVIDE' };

// one candidate -> { fn (Entry function record), lists, blocks (count, the way the community counts) }
export function makeFunction(c, listIds = {}) {
    const id = newId(), pid = newId();
    const locals = Object.fromEntries((c.locals || []).map(n => [n, `${id}_${newId()}`]));
    let count = 0;
    const E = (e) => {
        if (e === 'x') return B(`stringParam_${pid}`, []);
        if (typeof e === 'number') return B('number', [String(e)]);
        if (typeof e === 'string' && e[0] === '$') { count++; return B('get_func_variable', [locals[e.slice(1)], null]); }
        if (typeof e === 'string') return B('number', [e]);
        if (!Array.isArray(e)) return B('text', [e.t]);
        count++;
        if (OPS[e[0]]) return B('calc_basic', [E(e[1]), OPS[e[0]], E(e[2])]);
        if (e[0] === 'op') return B('calc_operation', [null, E(e[2]), null, e[1]]);
        if (e[0] === 'mod' || e[0] === 'quot') return B('quotient_and_mod', [null, E(e[1]), null, E(e[2]), null, e[0] === 'mod' ? 'MOD' : 'QUOTIENT']);
        if (e[0] === 'cat') return B('combine_something', [null, E(e[1]), null, E(e[2]), null]);
        if (e[0] === 'idx') return B('value_of_index_from_list', [null, listIds[e[1]], null, E(e[2]), null]);
        throw new Error('expression ' + JSON.stringify(e));
    };
    const body = (c.body || []).map(([n, e]) => { count++; return B('set_func_variable', [locals[n], E(e), null]); });
    const ret = E(c.ret);
    const chain = { ...B('function_field_string', [B(`stringParam_${pid}`, []), null]), copyable: false, assemble: false };
    const label = { ...B('function_field_label', [c.label || c.name, chain]), copyable: false };
    const header = B('function_create_value', [label, null, null, ret], [body]);
    header.x = 50; header.y = 30;
    const fn = {
        id, type: 'value',
        localVariables: Object.entries(locals).map(([name, lid]) => ({ name, value: 0, id: lid })),
        useLocalVariables: Object.keys(locals).length > 0,
        content: JSON.stringify([[header]]),
    };
    return { fn, id, count };
}

const DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const variable = (name, id, value = 0) => ({ name, id, value, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 });
export const list = (name, id, arr) => ({ name, id, value: 0, variableType: 'list', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0, width: 100, height: 120, array: arr.map((v, i) => ({ id: `${id}_${i}`, data: v })) });
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);

// time every candidate over the list X (reps times), then keep what each makes of the list XT
export async function bench(cands, { xs, xt, reps = 20, rounds = 5, tables = {}, extraVariables = [] }) {
    const V = { I: newId(), S: newId(), T: newId(), done: newId() };
    const L = { X: newId(), XT: newId(), BT: newId() };
    const listIds = Object.fromEntries(Object.keys(tables).map(n => [n, newId()]));
    const variables = [...Object.entries(V).map(([n, id]) => variable(n, id)), list('X', L.X, xs), list('XT', L.XT, xt), list('BT', L.BT, []),
        ...Object.entries(tables).map(([n, arr]) => list(n, listIds[n], arr)),
        // (lists that functions read back out of a shipped file look for, by id)
        ...extraVariables];
    const functions = [], main = [B('when_run_button_click', [null]), B('choose_project_timer_action', [null, 'START', null, null])];
    const get = (id) => B('get_variable', [id, null]);
    const timer = () => B('get_project_timer_value', [null, 0]);
    const out = [], timed = [], kept = [];
    for (const c of cands) {
        // (a function already built - one read back out of a shipped file - is timed as it is)
        const f = c.prebuilt || makeFunction(c, listIds);
        functions.push(f.fn);
        const R = newId();
        variables.push(list('R_' + c.name, R, []));
        const call = (lid) => B(`func_${f.id}`, [B('value_of_index_from_list', [null, lid, null, get(V.I), null]), null]);
        const loop = (lid, n, stmt) => [B('set_variable', [V.I, B('number', ['0']), null]),
            B('repeat_basic', [B('number', [String(n)]), null], [[B('change_variable', [V.I, B('number', ['1']), null]), stmt, trick()]])];
        // the timed loop lives in a function of its own
        const rid = newId();
        const rlabel = { ...B('function_field_label', ['run_' + c.name, null]), copyable: false };
        const rhead = B('function_create', [rlabel, null], [[B('repeat_basic', [B('number', [String(reps)]), null], [[...loop(L.X, xs.length, B('set_variable', [V.S, call(L.X), null])), trick()]])]]);
        functions.push({ id: rid, type: 'normal', localVariables: [], useLocalVariables: false, content: JSON.stringify([[rhead]]) });
        timed.push(() => [B('set_variable', [V.T, timer(), null]), B(`func_${rid}`, [null]),
            B('add_value_to_list', [B('calc_basic', [timer(), 'MINUS', get(V.T)]), L.BT, null]),
            // (a frame between two measurements: the page dies of one frame many seconds long)
            B('wait_second', [B('number', ['0']), null])]);
        kept.push(...loop(L.XT, xt.length, B('add_value_to_list', [call(L.XT), R, null])));
        out.push({ name: c.name, count: f.count ?? JSON.stringify(f.fn).split('\\"type\\"').length - 1, R: 'R_' + c.name });
    }
    // (the rounds as a loop: a script of thousands of blocks kills the editor page)
    main.push(B('repeat_basic', [B('number', [String(rounds)]), null], [timed.flatMap(t => t())]));
    main.push(...kept);
    main.push(B('set_variable', [V.done, B('number', ['1']), null]));
    main[0].x = 50; main[0].y = 30;
    const file = path.join(HERE, 'bench.ent');
    packEnt(file, { name: 'exp bench', tmpDir: path.join(HERE, '.pack'), variables, functions, speed: 60,
        objects: [{ id: 'main', name: 'main', pictures: [{ id: 'p1', name: 'dot', buf: DOT, w: 1, h: 1 }], script: [main] }] });
    const r = await runEnt(file, { vars: ['done'], lists: ['BT', ...out.map(o => o.R)], timeout: 300000 });
    if (!r.done) throw new Error('bench did not finish: ' + r.errors.slice(0, 3).join(' | '));
    // the best round of each
    const us = (i) => Math.min(...Array.from({ length: rounds }, (_, k) => Number(r.vars.BT[k * out.length + i]))) * 1e6 / (reps * xs.length);
    return out.map((o, i) => ({ ...o, us: us(i), values: r.vars[o.R] }));
}

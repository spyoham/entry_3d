// EJS: a small JavaScript subset compiled to Entry blocks (and to plain JS for
// testing the same program in Node).
//
// Program shape (top level):
//   const K = 3 * 4;                 compile-time constant (inlined)
//   let x = 0;                       global variable
//   let A = [];                      global list (data may be injected by the build)
//   function f(a, b) { ... }         Entry function (value function if the body ends
//                                    with `return expr;` - no other return allowed)
//   on('start' | 'clone' | 'msg:name', 'object', function () { ... });
//
// Statements: let (function locals), = += -= *= /= ++ --, A[i] = v, A.push(v),
// if/else, while (synchronous: repeat_while_true + the no-yield trick),
// for (init; cond; step) (same), for (;;) (repeat_inf: yields one frame per
// iteration), break (stop_repeat), builtin/user calls.
// Lists are 1-based: A[1] is the first item.
// && and || do NOT short-circuit (Entry evaluates both operands).
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const acorn = require('acorn');

const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function compileProgram(sources, { consts: extConsts = {}, funcWeights = {} } = {}) {
    const src = sources.join('\n');
    const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true });
    const err = (node, msg) => { throw new Error(`${msg} (line ${node.loc ? node.loc.start.line : '?'})`); };

    // ---------------- ids ----------------
    const used = new Set();
    const newId = (n = 4) => { let id; do { id = Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * 36)]).join(''); } while (used.has(id) || /^\d/.test(id)); used.add(id); return id; };

    // ---------------- collect declarations ----------------
    const consts = { ...extConsts };
    const globals = new Map();   // name -> { id, init }
    const lists = new Map();     // name -> { id, init }
    const funcs = new Map();     // name -> { id, node, params, value, locals, paramIds }
    const handlers = [];         // { event, object, body }
    const evalConst = (node) => {
        switch (node.type) {
            case 'Literal': return node.value;
            case 'Identifier': if (node.name in consts) return consts[node.name]; err(node, 'not a constant: ' + node.name);
            case 'UnaryExpression': { const v = evalConst(node.argument); if (node.operator === '-') return -v; if (node.operator === '+') return +v; if (node.operator === '!') return !v; break; }
            case 'BinaryExpression': {
                const a = evalConst(node.left), b = evalConst(node.right);
                switch (node.operator) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b; case '%': return a % b; case '**': return a ** b; }
                break;
            }
            case 'CallExpression':
                if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'Math') return Math[node.callee.property.name](...node.arguments.map(evalConst));
                break;
        }
        err(node, 'not a constant expression');
    };
    const isConstExpr = (node) => { try { evalConst(node); return true; } catch { return false; } };

    for (const st of ast.body) {
        if (st.type === 'VariableDeclaration') {
            for (const d of st.declarations) {
                const name = d.id.name;
                if (st.kind === 'const') { consts[name] = evalConst(d.init); continue; }
                if (d.init && d.init.type === 'ArrayExpression') lists.set(name, { id: newId(), init: d.init.elements.map(evalConst) });
                // `let obj$name` is a variable of object `obj` alone: every
                // clone of it gets its own copy (Entry's object-scoped variable)
                else globals.set(name, { id: newId(), init: d.init ? evalConst(d.init) : 0, object: name.includes('$') && !name.startsWith('$') ? name.slice(0, name.indexOf('$')) : null });
            }
        } else if (st.type === 'FunctionDeclaration') {
            const name = st.id.name;
            const body = st.body.body;
            const last = body[body.length - 1];
            const value = !!(last && last.type === 'ReturnStatement' && last.argument);
            funcs.set(name, { id: newId(), name, node: st, params: st.params.map(p => p.name), paramIds: st.params.map(() => newId(4)), value, locals: new Map() });
        } else if (st.type === 'ExpressionStatement' && st.expression.type === 'CallExpression' && st.expression.callee.name === 'on') {
            const [ev, obj, fn] = st.expression.arguments;
            handlers.push({ event: ev.value, object: obj.value, body: fn.body.body, node: fn });
        } else if (st.type === 'EmptyStatement') {
        } else err(st, 'unsupported top-level statement ' + st.type);
    }

    // ---------------- block builders ----------------
    let curLine = 0;
    const blockLines = {};
    const B = (type, params = [], statements = []) => { const id = newId(); blockLines[id] = curLine; return { id, x: 0, y: 0, type, params, statements, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [] }; };
    const num = (v) => B('number', [String(v)]);
    const txt = (v) => B('text', [String(v)]);
    const calc = (a, op, b) => B('calc_basic', [a, op, b]);
    const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);

    // ---------------- per-scope compile ----------------
    // scope: { fn (func record or null), handlerKey, temps }
    let tempCounter = 0;
    function compileBody(stmts, scope) {
        const out = [];
        for (const s of stmts) compileStmt(s, scope, out);
        return out;
    }
    function localRef(scope, name) {
        if (scope.fn) {
            const f = scope.fn;
            if (f.locals.has(name)) return { kind: 'local', id: f.locals.get(name) };
            const pi = f.params.indexOf(name);
            if (pi >= 0) return { kind: 'param', id: f.paramIds[pi] };
        } else if (scope.hlocals && scope.hlocals.has(name)) {
            return { kind: 'global', id: scope.hlocals.get(name) };
        }
        if (globals.has(name)) return { kind: 'global', id: globals.get(name).id };
        return null;
    }
    function declareLocal(scope, name, node) {
        if (scope.fn) {
            if (scope.fn.params.includes(name) && !(scope.shadow && scope.shadow.has(name))) err(node, 'local shadows param ' + name);
            if (!scope.fn.locals.has(name)) scope.fn.locals.set(name, `${scope.fn.id}_${newId(4)}`);
        } else {
            if (!scope.hlocals.has(name)) {
                const gname = `${scope.handlerKey}$${name}`;
                const id = newId();
                globals.set(gname, { id, init: 0, hidden: true });
                scope.hlocals.set(name, id);
            }
        }
    }
    function newTemp(scope) {
        const name = `$t${tempCounter++}`;
        declareLocal(scope, name, null);
        return name;
    }
    function setRef(ref, valueBlock, node) {
        if (!ref) err(node, 'unknown variable');
        if (ref.kind === 'local') return B('set_func_variable', [ref.id, valueBlock, null]);
        if (ref.kind === 'global') return B('set_variable', [ref.id, valueBlock, null]);
        err(node, 'cannot assign to a parameter');
    }
    function getRef(ref) {
        if (ref.kind === 'local') return B('get_func_variable', [ref.id, null]);
        if (ref.kind === 'param') return B(`stringParam_${ref.id}`, []);
        return B('get_variable', [ref.id, null]);
    }
    const OPS = { '+': 'PLUS', '-': 'MINUS', '*': 'MULTI', '/': 'DIVIDE' };
    const CMP = { '==': 'EQUAL', '===': 'EQUAL', '!=': 'NOT_EQUAL', '!==': 'NOT_EQUAL', '<': 'LESS', '<=': 'LESS_OR_EQUAL', '>': 'GREATER', '>=': 'GREATER_OR_EQUAL' };
    const MATH1 = { floor: 'floor', ceil: 'ceil', round: 'round', abs: 'abs', sqrt: 'root' };
    const TRIG = { sind: 'sin', cosd: 'cos', tand: 'tan', atand: 'atan_radian', asind: 'asin_radian', acosd: 'acos_radian' };

    // expression -> block; pre-statements pushed to `pre`
    function expr(node, scope, pre) {
        switch (node.type) {
            case 'Literal':
                if (typeof node.value === 'number') return num(node.value);
                if (typeof node.value === 'string') return txt(node.value);
                if (typeof node.value === 'boolean') return B(node.value ? 'True' : 'False', []);
                err(node, 'bad literal');
            case 'TemplateLiteral': {
                // `a${x}b` -> combine chain
                let acc = null;
                const push = (b) => { acc = acc ? B('combine_something', [null, acc, null, b, null]) : b; };
                node.quasis.forEach((q, i) => {
                    if (q.value.cooked) push(txt(q.value.cooked));
                    if (i < node.expressions.length) push(expr(node.expressions[i], scope, pre));
                });
                return acc || txt('');
            }
            case 'Identifier': {
                if (node.name in consts) { const v = consts[node.name]; return typeof v === 'string' ? txt(v) : num(v); }
                const r = localRef(scope, node.name);
                if (!r) err(node, 'unknown identifier ' + node.name);
                return getRef(r);
            }
            case 'UnaryExpression':
                if (isConstExpr(node)) { const v = evalConst(node); return typeof v === 'number' ? num(v) : txt(v); }
                if (node.operator === '-') return calc(num(0), 'MINUS', expr(node.argument, scope, pre));
                if (node.operator === '!') return B('boolean_not', [null, expr(node.argument, scope, pre), null]);
                err(node, 'unary ' + node.operator);
            case 'BinaryExpression': {
                if (isConstExpr(node)) { const v = evalConst(node); return typeof v === 'number' ? num(v) : txt(v); }
                const op = node.operator;
                if (OPS[op]) return calc(expr(node.left, scope, pre), OPS[op], expr(node.right, scope, pre));
                if (op === '%') return B('quotient_and_mod', [null, expr(node.left, scope, pre), null, expr(node.right, scope, pre), null, 'MOD']);
                if (CMP[op]) return B('boolean_basic_operator', [expr(node.left, scope, pre), CMP[op], expr(node.right, scope, pre)]);
                err(node, 'binary ' + op);
            }
            case 'LogicalExpression':
                return B('boolean_and_or', [expr(node.left, scope, pre), node.operator === '&&' ? 'AND' : 'OR', expr(node.right, scope, pre)]);
            case 'MemberExpression': {
                const obj = node.object.name;
                if (node.computed) {
                    if (!lists.has(obj)) err(node, 'unknown list ' + obj);
                    return B('value_of_index_from_list', [null, lists.get(obj).id, null, expr(node.property, scope, pre), null]);
                }
                if (node.property.name === 'length' && lists.has(obj)) return B('length_of_list', [null, lists.get(obj).id, null]);
                err(node, 'member');
            }
            case 'CallExpression': return callExpr(node, scope, pre, true);
            case 'ConditionalExpression': {
                // hoisted: t = b; if (c) t = a
                const t = newTemp(scope); const r = localRef(scope, t);
                pre.push(B('if_else', [expr(node.test, scope, pre), null, null], [
                    withPre(scope, (p2) => setRef(r, expr(node.consequent, scope, p2))),
                    withPre(scope, (p2) => setRef(r, expr(node.alternate, scope, p2))),
                ]));
                return getRef(r);
            }
        }
        err(node, 'unsupported expression ' + node.type);
    }
    // compile one statement-producing callback with its own pre list, return [..pre, stmt]
    function withPre(scope, f) { const p = []; const s = f(p); return [...p, ...(Array.isArray(s) ? s : [s])]; }

    function callExpr(node, scope, pre, asValue) {
        const c = node.callee;
        const args = node.arguments;
        const A = (i) => expr(args[i], scope, pre);
        if (c.type === 'MemberExpression' && !c.computed) {
            const o = c.object.name, m = c.property.name;
            if (o === 'Math') {
                if (MATH1[m]) return B('calc_operation', [null, A(0), null, MATH1[m]]);
                if (m === 'min' || m === 'max') {
                    const t = newTemp(scope); const r = localRef(scope, t);
                    pre.push(setRef(r, A(0)));
                    for (let i = 1; i < args.length; i++) {
                        const bi = A(i);
                        // if (b < t) t = b   (value evaluated twice; fine for simple operands)
                        const t2 = newTemp(scope); const r2 = localRef(scope, t2);
                        pre.push(setRef(r2, bi));
                        pre.push(B('_if', [B('boolean_basic_operator', [getRef(r2), m === 'min' ? 'LESS' : 'GREATER', getRef(r)]), null], [[setRef(r, getRef(r2))]]));
                    }
                    return getRef(r);
                }
                err(node, 'Math.' + m);
            }
            if (lists.has(o)) {
                const lid = lists.get(o).id;
                if (m === 'push') return B('add_value_to_list', [A(0), lid, null]);
                if (m === 'removeAt') return B('remove_value_from_list', [A(0), lid, null]);
                if (m === 'insertAt') return B('insert_value_to_list', [A(1), lid, A(0), null]);
                if (m === 'includes') return B('is_included_in_list', [null, lid, null, A(0), null]);
                err(node, 'list method ' + m);
            }
            err(node, 'member call');
        }
        const name = c.name;
        if (funcs.has(name)) {
            const f = funcs.get(name);
            if (asValue && !f.value) err(node, `function ${name} has no value`);
            if (args.length !== f.params.length) err(node, `arity ${name}`);
            return B(`func_${f.id}`, [...args.map((a, i) => A(i)), null]);
        }
        if (TRIG[name]) return B('calc_operation', [null, A(0), null, TRIG[name]]);
        switch (name) {
            // ---- values ----
            case 'mod': return B('quotient_and_mod', [null, A(0), null, A(1), null, 'MOD']);
            case 'idiv': return B('quotient_and_mod', [null, A(0), null, A(1), null, 'QUOTIENT']);
            case 'frac': return B('calc_operation', [null, A(0), null, 'unnatural']);
            case 'rand': return B('calc_rand', [null, A(0), null, A(1), null]);
            case 'str': { let acc = A(0); for (let i = 1; i < args.length; i++) acc = B('combine_something', [null, acc, null, A(i), null]); return acc; }
            case 'key': return B('is_press_some_key', [String(evalConst(args[0])), null]);
            case 'mouseX': return B('coordinate_mouse', [null, 'x', null]);
            case 'mouseY': return B('coordinate_mouse', [null, 'y', null]);
            case 'mouseDown': return B('is_clicked', [null]);
            case 'timer': return B('get_project_timer_value', [null, 0]);
            case 'charAt': return B('char_at', [null, A(0), null, A(1), null]);
            case 'strlen': return B('length_of_string', [null, A(0), null]);
            case 'indexOf': return B('index_of_string', [null, A(0), null, A(1), null]);
            case 'substr': return B('substring', [null, A(0), null, A(1), null, A(2), null]);
            case 'rgb': return B('change_rgb_to_hex', [A(0), A(1), A(2)]);
            case 'bool': return A(0);
            // ---- statements ----
            case 'stamp': return B('brush_stamp', [null]);
            case 'eraseAll': return B('brush_erase_all', [null]);
            case 'costume': return B('change_to_some_shape', [A(0), null]);
            case 'goto': return B('locate_xy', [A(0), A(1), null]);
            case 'resetSize': return B('reset_scale_size', [null]);
            case 'stretchW': return B('stretch_scale_size', ['WIDTH', A(0), null]);
            case 'stretchH': return B('stretch_scale_size', ['HEIGHT', A(0), null]);
            case 'setSize': return B('set_scale_size', [A(0), null]);
            case 'show': return B('show', [null]);
            case 'hide': return B('hide', [null]);
            case 'effect': return B('change_effect_amount', [String(evalConst(args[0])), A(1), null]);
            case 'clearEffects': return B('erase_all_effects', [null]);
            case 'cloneSelf': return B('create_clone', ['self', null]);
            case 'deleteClone': return B('delete_clone', [null]);
            case 'sound': return B('sound_something_with_block', [A(0), null]);
            case 'stopSounds': return B('sound_silent_all', ['all', null]);
            case 'volume': return B('sound_volume_set', [A(0), null]);
            // v7: playback rate of every sound (Entry and tessvm clamp it to 0.5 .. 2)
            case 'soundSpeed': return B('sound_speed_set', [A(0), null]);
            // v7: ask and wait for a typed answer (the track share code)
            case 'ask': return B('ask_and_wait', [A(0), null]);
            case 'answer': return B('get_canvas_input_value', [null]);
            case 'hideAnswer': return B('set_visible_answer', ['HIDE', null]);
            // v8: the signed-in player's nickname (a space, or 'guest', when nobody is)
            case 'nickname': return B('get_nickname', []);
            case 'write': return B('text_write', [A(0), null]);
            case 'textColor': return B('text_change_font_color', [B('color', [String(evalConst(args[0]))]), null]);
            case 'textColorHex': return B('text_change_font_color', [A(0), null]);
            case 'dateSec': return B('get_date', [null, 'SECOND', null]);
            case 'broadcast': return B('message_cast', [messageId(evalConst(args[0])), null]);
            case 'timerReset': return B('choose_project_timer_action', [null, 'RESET', null, null]);
            case 'timerStart': return B('choose_project_timer_action', [null, 'START', null, null]);
            case 'toFront': return B('change_object_index', ['FRONT', null]);
            case 'toBack': return B('change_object_index', ['BACK', null]);
            case 'penDown': return B('start_drawing', [null]);
            case 'penUp': return B('stop_drawing', [null]);
            case 'penColor': return B('set_color', [B('color', [String(evalConst(args[0]))]), null]);
            case 'penColorHex': return B('set_color', [A(0), null]);
            case 'fillColorHex': return B('set_fill_color', [A(0), null]);
            case 'fillStart': return B('start_fill', [null]);
            case 'fillStop': return B('stop_fill', [null]);
            case 'penSize': return B('set_thickness', [A(0), null]);
            // v7: transparency of everything the pen draws next, 0 (solid) .. 100 %
            case 'penAlpha': return B('set_brush_tranparency', [A(0), null]);
            case 'stopAll': return B('stop_object', ['all', null]);
            case 'stopThread': return B('stop_object', ['thisThread', null]);
            case 'waitSec': return B('wait_second', [A(0), null]);
            case 'waitUntil': return B('wait_until_true', [A(0), null]);
        }
        err(node, 'unknown function ' + name);
    }
    const messages = new Map();
    function messageId(name) { if (!messages.has(name)) messages.set(name, newId()); return messages.get(name); }

    function compileStmt(s, scope, out) {
        if (s.loc) curLine = s.loc.start.line;
        switch (s.type) {
            case 'VariableDeclaration':
                for (const d of s.declarations) {
                    declareLocal(scope, d.id.name, d);
                    if (d.init) { const pre = []; const v = expr(d.init, scope, pre); out.push(...pre, setRef(localRef(scope, d.id.name), v, d)); }
                }
                return;
            case 'ExpressionStatement': {
                const e = s.expression;
                if (e.type === 'AssignmentExpression' || e.type === 'UpdateExpression') { out.push(...assign(e, scope)); return; }
                if (e.type === 'CallExpression') { const pre = []; const b = callExpr(e, scope, pre, false); out.push(...pre, b); return; }
                err(s, 'expression statement ' + e.type);
            }
            case 'IfStatement': {
                const pre = [];
                const c = expr(s.test, scope, pre);
                const th = compileBody(s.consequent.type === 'BlockStatement' ? s.consequent.body : [s.consequent], scope);
                if (s.alternate) {
                    const el = compileBody(s.alternate.type === 'BlockStatement' ? s.alternate.body : [s.alternate], scope);
                    out.push(...pre, B('if_else', [c, null, null], [th, el]));
                } else out.push(...pre, B('_if', [c, null], [th]));
                return;
            }
            case 'WhileStatement': {
                const pre = [];
                const c = expr(s.test, scope, pre);
                const body = compileBody(s.body.body, scope);
                out.push(...pre, B('repeat_while_true', [c, 'while', null], [[...body, ...cloneBlocks(pre), trick()]]));
                return;
            }
            case 'ForOfStatement': {
                // for (const _ of rep(n)) { ... }: counted loop, n evaluated once
                const r = s.right;
                if (!(r.type === 'CallExpression' && r.callee.name === 'rep')) err(s, 'only for (const _ of rep(n)) is supported');
                const pre = [];
                const cnt = expr(r.arguments[0], scope, pre);
                const body = compileBody(s.body.body, scope);
                out.push(...pre, B('repeat_basic', [cnt, null], [[...body, trick()]]));
                return;
            }
            case 'ForStatement': {
                if (!s.init && !s.test && !s.update) {  // for (;;) -> repeat_inf (yields)
                    out.push(B('repeat_inf', [null, null], [compileBody(s.body.body, scope)]));
                    return;
                }
                if (s.init) {
                    if (s.init.type === 'VariableDeclaration') compileStmt(s.init, scope, out);
                    else out.push(...assign(s.init, scope));
                }
                const pre = [];
                const c = s.test ? expr(s.test, scope, pre) : B('True', []);
                const body = compileBody(s.body.body, scope);
                const upd = s.update ? assign(s.update, scope) : [];
                out.push(...pre, B('repeat_while_true', [c, 'while', null], [[...body, ...upd, ...cloneBlocks(pre), trick()]]));
                return;
            }
            case 'BreakStatement': out.push(B('stop_repeat', [null])); return;
            case 'BlockStatement': out.push(...compileBody(s.body, scope)); return;
            case 'ReturnStatement': err(s, 'return only allowed as the last statement of a value function');
            case 'EmptyStatement': return;
        }
        err(s, 'unsupported statement ' + s.type);
    }
    function cloneBlocks(bs) { return JSON.parse(JSON.stringify(bs), (k, v) => (k === 'id' && typeof v === 'string' ? newId() : v)); }

    function assign(e, scope) {
        const pre = [];
        let target = e.type === 'UpdateExpression' ? e.argument : e.left;
        let op = e.type === 'UpdateExpression' ? (e.operator === '++' ? '+=' : '-=') : e.operator;
        let rhs = e.type === 'UpdateExpression' ? num(1) : expr(e.right, scope, pre);
        if (target.type === 'Identifier') {
            const r = localRef(scope, target.name);
            if (!r) err(e, 'unknown variable ' + target.name);
            if (op === '=') return [...pre, setRef(r, rhs, e)];
            if (r.kind === 'global' && (op === '+=' || op === '-=')) {
                if (op === '-=') rhs = (rhs.type === 'number') ? num(-Number(rhs.params[0])) : calc(num(0), 'MINUS', rhs);
                return [...pre, B('change_variable', [r.id, rhs, null])];
            }
            const bop = { '+=': 'PLUS', '-=': 'MINUS', '*=': 'MULTI', '/=': 'DIVIDE' }[op];
            if (!bop) err(e, 'assign op ' + op);
            return [...pre, setRef(r, calc(getRef(r), bop, rhs), e)];
        }
        if (target.type === 'MemberExpression' && target.computed) {
            const l = lists.get(target.object.name);
            if (!l) err(e, 'unknown list ' + target.object.name);
            const idx = expr(target.property, scope, pre);
            if (op === '=') return [...pre, B('change_value_list_index', [l.id, idx, rhs, null])];
            const bop = { '+=': 'PLUS', '-=': 'MINUS', '*=': 'MULTI', '/=': 'DIVIDE' }[op];
            const cur = B('value_of_index_from_list', [null, l.id, null, cloneBlocks([idx])[0], null]);
            return [...pre, B('change_value_list_index', [l.id, idx, calc(cur, bop, rhs), null])];
        }
        err(e, 'assignment target');
    }

    // ---------------- usage weights (Entry finds variables/locals linearly) ----------------
    const use = new Map();
    const LOOPS = new Set(['repeat_while_true', 'repeat_basic', 'repeat_inf']);
    const LISTSLOT = { value_of_index_from_list: 1, length_of_list: 1, add_value_to_list: 1, remove_value_from_list: 1, insert_value_to_list: 1, change_value_list_index: 0, is_included_in_list: 1 };
    function weigh(b, w) {
        if (!b || typeof b !== 'object') return;
        if (Array.isArray(b)) { for (const x of b) weigh(x, w); return; }
        const t = b.type;
        if (t === 'get_func_variable' || t === 'set_func_variable' || t === 'get_variable' || t === 'set_variable' || t === 'change_variable') use.set(b.params[0], (use.get(b.params[0]) || 0) + w);
        if (t in LISTSLOT) use.set(b.params[LISTSLOT[t]], (use.get(b.params[LISTSLOT[t]]) || 0) + w);
        if (b.params) for (const p of b.params) if (p && typeof p === 'object') weigh(p, w);
        if (b.statements) for (const st of b.statements) weigh(st, LOOPS.has(t) ? w * 8 : w);
    }

    // ---------------- functions ----------------
    const outFunctions = [];
    for (const f of funcs.values()) {
        // parameters that get assigned are copied to a local of the same name
        const shadow = new Set();
        (function scan(n) {
            if (!n || typeof n !== 'object') return;
            if (Array.isArray(n)) { n.forEach(scan); return; }
            if ((n.type === 'AssignmentExpression' && n.left.type === 'Identifier') || (n.type === 'UpdateExpression' && n.argument.type === 'Identifier')) {
                const nm = (n.left || n.argument).name;
                if (f.params.includes(nm)) shadow.add(nm);
            }
            for (const k in n) if (k !== 'loc' && n[k] && typeof n[k] === 'object') scan(n[k]);
        })(f.node.body);
        const scope = { fn: f, shadow };
        const pre0 = [];
        for (const nm of shadow) {
            const pr = { kind: 'param', id: f.paramIds[f.params.indexOf(nm)] };
            declareLocal(scope, nm, null);
            pre0.push(setRef(localRef(scope, nm), getRef(pr)));
        }
        const body = f.node.body.body;
        const stmts = f.value ? body.slice(0, -1) : body;
        const blocks = [...pre0, ...compileBody(stmts, scope)];
        let retBlock = null;
        if (f.value) { const pre = []; retBlock = expr(body[body.length - 1].argument, scope, pre); blocks.push(...pre); }
        // parameter chain
        let chain = null;
        for (let i = f.params.length - 1; i >= 0; i--) {
            chain = { ...B('function_field_string', [B(`stringParam_${f.paramIds[i]}`, []), chain]), copyable: false, assemble: false };
        }
        const label = { ...B('function_field_label', [f.name, chain]), copyable: false };
        const header = B(f.value ? 'function_create_value' : 'function_create', f.value ? [label, null, null, retBlock] : [label, null], [blocks]);
        header.x = 50; header.y = 30;
        weigh(header, funcWeights[f.name] || 1);
        const locs = [...f.locals.entries()].sort((a, b) => (use.get(b[1]) || 0) - (use.get(a[1]) || 0));
        outFunctions.push({
            id: f.id, type: f.value ? 'value' : 'normal',
            localVariables: locs.map(([name, id]) => ({ name, value: 0, id })),
            useLocalVariables: f.locals.size > 0,
            content: JSON.stringify([[header]]),
        });
    }

    // ---------------- handlers ----------------
    const objectScripts = {};   // object -> [thread...]
    handlers.forEach((h, i) => {
        const scope = { fn: null, handlerKey: `h${i}`, hlocals: new Map() };
        let hat;
        if (h.event === 'start') hat = B('when_run_button_click', [null]);
        else if (h.event === 'scene') hat = B('when_scene_start', [null]);
        else if (h.event === 'clone') hat = B('when_clone_start', [null]);
        else if (h.event.startsWith('msg:')) hat = B('when_message_cast', [null, messageId(h.event.slice(4))]);
        else throw new Error('event ' + h.event);
        hat.x = 50; hat.y = 30 + i * 10;
        const body = compileBody(h.body, scope);
        weigh(body, 1);
        (objectScripts[h.object] ||= []).push([hat, ...body]);
    });

    const variables = [];
    // v8: a global named RT_* is an Entry real-time variable - kept on the
    // server and shared by everyone who runs the work (online only)
    for (const [name, g] of globals) variables.push({ name, id: g.id, value: g.init, variableType: 'variable', visible: false, isCloud: false, isRealTime: name.startsWith('RT_'), cloudDate: false, object: g.object || null, x: 0, y: 0 });
    for (const [name, l] of lists) variables.push({ name, id: l.id, value: 0, variableType: 'list', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0, width: 100, height: 120,
        array: l.init.map((v, i) => ({ id: `${l.id}_${i}`, data: v })) });
    variables.sort((a, b) => (use.get(b.id) || 0) - (use.get(a.id) || 0));
    return {
        blockLines, srcLines: src.split(String.fromCharCode(10)),
        use: (name) => use.get((globals.get(name) || lists.get(name) || {}).id) || 0,
        variables, functions: outFunctions, objectScripts,
        messages: [...messages.entries()].map(([name, id]) => ({ id, name })),
        listIdOf: (n) => lists.get(n).id, varIdOf: (n) => globals.get(n).id, consts,
        stats: { globals: globals.size, lists: lists.size, functions: funcs.size, handlers: handlers.length },
    };
}

// ============================================================
// JS backend: the same program as runnable JS (for Node tests).
// Runtime `R` provides builtins; lists are plain arrays accessed 1-based
// with range checks (like Entry, out-of-range reads throw).
// ============================================================
export function compileToJS(sources) {
    const src = sources.join('\n');
    const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true });
    const lists = new Set();
    for (const st of ast.body) if (st.type === 'VariableDeclaration' && st.kind !== 'const') for (const d of st.declarations) if (d.init && d.init.type === 'ArrayExpression') lists.add(d.id.name);
    const E = (n) => {
        switch (n.type) {
            case 'Literal': return JSON.stringify(n.value);
            case 'ArrayExpression': return '[' + n.elements.map(E).join(',') + ']';
            case 'TemplateLiteral': return '(' + n.quasis.map((q, i) => JSON.stringify(q.value.cooked) + (i < n.expressions.length ? '+R.s(' + E(n.expressions[i]) + ')' : '')).join('+') + ')';
            case 'Identifier': return n.name;
            case 'UnaryExpression': return `(${n.operator}${E(n.argument)})`;
            case 'BinaryExpression':
                if (n.operator === '%') return `R.mod(${E(n.left)},${E(n.right)})`;
                if (n.operator === '==' || n.operator === '===') return `(${E(n.left)}==${E(n.right)})`;
                if (n.operator === '!=' || n.operator === '!==') return `(${E(n.left)}!=${E(n.right)})`;
                if (n.operator === '+') return `R.add(${E(n.left)},${E(n.right)})`;
                return `(${E(n.left)}${n.operator}${E(n.right)})`;
            case 'LogicalExpression': return n.operator === '&&' ? `R.and(${E(n.left)},${E(n.right)})` : `R.or(${E(n.left)},${E(n.right)})`;
            case 'ConditionalExpression': return `(${E(n.test)}?${E(n.consequent)}:${E(n.alternate)})`;
            case 'MemberExpression':
                if (n.computed) return `R.get(${n.object.name},${E(n.property)},${JSON.stringify(n.object.name)})`;
                return `${E(n.object)}.${n.property.name}`;
            case 'CallExpression': {
                const c = n.callee;
                if (c.type === 'MemberExpression' && lists.has(c.object.name)) {
                    const L = c.object.name, a = n.arguments.map(E);
                    if (c.property.name === 'push') return `${L}.push(${a[0]})`;
                    if (c.property.name === 'removeAt') return `R.removeAt(${L},${a[0]})`;
                    if (c.property.name === 'insertAt') return `R.insertAt(${L},${a[0]},${a[1]})`;
                    if (c.property.name === 'includes') return `${L}.some(v=>v==${a[0]})`;
                }
                if (c.type === 'MemberExpression') return `${E(c)}(${n.arguments.map(E).join(',')})`;
                return `${c.name}(${n.arguments.map(E).join(',')})`;
            }
            case 'AssignmentExpression':
                if (n.left.type === 'MemberExpression' && n.left.computed) {
                    const L = n.left.object.name;
                    if (n.operator === '=') return `R.set(${L},${E(n.left.property)},${E(n.right)},${JSON.stringify(L)})`;
                    return `R.set(${L},R.$i=(${E(n.left.property)}),R.get(${L},R.$i,${JSON.stringify(L)})${n.operator[0]}(${E(n.right)}),${JSON.stringify(L)})`;
                }
                return `${n.left.name}${n.operator}${E(n.right)}`;
            case 'UpdateExpression':
                if (n.argument.type === 'MemberExpression') return `R.set(${n.argument.object.name},R.$i=(${E(n.argument.property)}),R.get(${n.argument.object.name},R.$i)${n.operator[0]}1)`;
                return `${E(n.argument)}${n.operator}`;
        }
        throw new Error('js backend: ' + n.type);
    };
    const S = (s) => {
        switch (s.type) {
            case 'VariableDeclaration': return `${s.kind} ${s.declarations.map(d => d.id.name + (d.init ? '=' + E(d.init) : '')).join(',')};`;
            case 'ExpressionStatement': return E(s.expression) + ';';
            case 'IfStatement': return `if(${E(s.test)}){${Sb(s.consequent)}}` + (s.alternate ? `else{${Sb(s.alternate)}}` : '');
            case 'WhileStatement': return `while(${E(s.test)}){${Sb(s.body)}}`;
            case 'ForStatement':
                if (!s.init && !s.test && !s.update) return `for(;;){${Sb(s.body)} yield;}`;
                return `for(${s.init ? (s.init.type === 'VariableDeclaration' ? S(s.init).slice(0, -1) : E(s.init)) : ''};${s.test ? E(s.test) : ''};${s.update ? E(s.update) : ''}){${Sb(s.body)}}`;
            case 'ForOfStatement': return `for(let $r=0,$n=(${E(s.right.arguments[0])});$r<$n;$r++){${Sb(s.body)}}`;
            case 'BreakStatement': return 'break;';
            case 'ReturnStatement': return `return ${s.argument ? E(s.argument) : ''};`;
            case 'BlockStatement': return Sb(s);
            case 'FunctionDeclaration': return `function ${s.id.name}(${s.params.map(p => p.name).join(',')}){${Sb(s.body)}}`;
            case 'EmptyStatement': return '';
        }
        throw new Error('js backend stmt: ' + s.type);
    };
    const Sb = (b) => (b.type === 'BlockStatement' ? b.body : [b]).map(S).join('\n');
    const parts = [];
    for (const st of ast.body) {
        if (st.type === 'ExpressionStatement' && st.expression.type === 'CallExpression' && st.expression.callee.name === 'on') {
            const [ev, obj, fn] = st.expression.arguments;
            parts.push(`R.on(${JSON.stringify(ev.value)},${JSON.stringify(obj.value)},function*(){${Sb(fn.body)}});`);
        } else if (st.type === 'VariableDeclaration' && st.kind !== 'const') {
            parts.push('let ' + st.declarations.map(d => d.id.name + '=' + (d.init && d.init.type === 'ArrayExpression' ? '(R.data && R.data[' + JSON.stringify(d.id.name) + '] ? R.data[' + JSON.stringify(d.id.name) + '].slice() : ' + E(d.init) + ')' : (d.init ? E(d.init) : '0'))).join(',') + ';');
        } else parts.push(S(st));
    }
    const globalsList = [];
    for (const st of ast.body) if (st.type === 'VariableDeclaration') for (const d of st.declarations) globalsList.push(d.id.name);
    parts.push(`R.peek = (n) => eval(n); R.poke = (n, v) => { eval(n + '=R.$v', R.$v = v); };`);
    return parts.join('\n');
}

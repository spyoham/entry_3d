// The "alpha" build: no `repeat_while_true` block and no delay-removal trick.
//
// An Entry loop block waits a frame after every round; EJS's `while` gets round
// that with the trick `wait_until_true(not continue_repeat)`. Without both, the
// one thing left that repeats inside a frame is a function calling itself. So
// here every `while` becomes a function of its own:
//
//     while (c) { B }      ->      if (c) { loop(); }
//                                   function loop() { B; if (c) { loop(); } }
//
// A function's locals do not reach into another function, so what a loop shares
// with the code around it (or keeps from one round to the next) is made global,
// under the name z<function>_<name>. A variable that only one loop's rounds use,
// and that every round sets before reading, stays a local - of the loop's
// function (a global costs tessvm several times a local). `break` sets a flag
// that skips the rest of the round and stops the calls. (`for (;;)`, the
// once-a-frame loop, stays.)
//
// Works on the macro-expanded source; returns EJS source again.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const acorn = require('acorn');

// ---- a printer for the subset of JavaScript EJS takes ----
function E(n) {
    switch (n.type) {
        case 'Literal': return typeof n.value === 'string' ? JSON.stringify(n.value) : String(n.raw ?? n.value);
        case 'Identifier': return n.name;
        case 'TemplateLiteral': return '`' + n.quasis.map((q, i) => q.value.raw + (i < n.expressions.length ? '${' + E(n.expressions[i]) + '}' : '')).join('') + '`';
        case 'ArrayExpression': return '[' + n.elements.map(E).join(', ') + ']';
        case 'UnaryExpression': return `(${n.operator}${E(n.argument)})`;
        case 'BinaryExpression': case 'LogicalExpression': return `(${E(n.left)} ${n.operator} ${E(n.right)})`;
        case 'ConditionalExpression': return `(${E(n.test)} ? ${E(n.consequent)} : ${E(n.alternate)})`;
        case 'MemberExpression': return n.computed ? `${E(n.object)}[${E(n.property)}]` : `${E(n.object)}.${n.property.name}`;
        case 'CallExpression': return `${E(n.callee)}(${n.arguments.map(E).join(', ')})`;
        case 'AssignmentExpression': return `${E(n.left)} ${n.operator} ${E(n.right)}`;
        case 'UpdateExpression': return n.prefix ? `${n.operator}${E(n.argument)}` : `${E(n.argument)}${n.operator}`;
        case 'FunctionExpression': return `function () ${S(n.body, '')}`;
    }
    throw new Error('deloop: expression ' + n.type);
}
function S(n, ind) {
    const I = ind + '  ';
    switch (n.type) {
        case 'BlockStatement': return '{\n' + n.body.map(s => I + S(s, I)).join('\n') + '\n' + ind + '}';
        case 'VariableDeclaration': return `${n.kind} ${n.declarations.map(d => d.id.name + (d.init ? ' = ' + E(d.init) : '')).join(', ')};`;
        case 'ExpressionStatement': return E(n.expression) + ';';
        case 'IfStatement': return `if (${E(n.test)}) ${S(blk(n.consequent), ind)}` + (n.alternate ? ` else ${S(blk(n.alternate), ind)}` : '');
        case 'WhileStatement': return `while (${E(n.test)}) ${S(blk(n.body), ind)}`;
        case 'ForStatement': if (!n.init && !n.test && !n.update) return `for (;;) ${S(blk(n.body), ind)}`; break;
        case 'BreakStatement': return 'break;';
        case 'ReturnStatement': return `return${n.argument ? ' ' + E(n.argument) : ''};`;
        case 'FunctionDeclaration': return `function ${n.id.name}(${n.params.map(p => p.name).join(', ')}) ${S(n.body, ind)}`;
        case 'EmptyStatement': return ';';
    }
    throw new Error('deloop: statement ' + n.type);
}
const blk = (n) => (n.type === 'BlockStatement' ? n : { type: 'BlockStatement', body: [n] });
const id = (name) => ({ type: 'Identifier', name });
const num = (v) => ({ type: 'Literal', value: v, raw: String(v) });
const assign = (name, right) => ({ type: 'ExpressionStatement', expression: { type: 'AssignmentExpression', operator: '=', left: id(name), right } });
const call = (name) => ({ type: 'ExpressionStatement', expression: { type: 'CallExpression', callee: id(name), arguments: [] } });
const iff = (test, body) => ({ type: 'IfStatement', test, consequent: { type: 'BlockStatement', body }, alternate: null });
const clone = (n) => JSON.parse(JSON.stringify(n));

function walk(node, fn, parent = null, key = null) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) walk(x, fn, parent, key); return; }
    if (typeof node.type === 'string') { if (fn(node, parent, key) === false) return; }
    for (const k in node) { if (k === 'loc' || k === 'start' || k === 'end') continue; const v = node[k]; if (v && typeof v === 'object') walk(v, fn, typeof node.type === 'string' ? node : parent, k); }
}
const hasWhile = (n) => { let f = false; walk(n, (x) => { if (x.type === 'WhileStatement') f = true; }); return f; };
// a `break` of this loop (not of a loop inside it)
const hasBreak = (n) => { let f = false; walk(n, (x) => { if (x.type === 'WhileStatement') return false; if (x.type === 'BreakStatement') f = true; }); return f; };

export function deloop(src) {
    const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
    const globals = new Set(), extraGlobals = [], extraFuncs = [];
    for (const st of ast.body) {
        if (st.type === 'VariableDeclaration') for (const d of st.declarations) globals.add(d.id.name);
        if (st.type === 'FunctionDeclaration') globals.add(st.id.name);
    }
    let nLoop = 0, nFunc = 0;
    for (const fn of ast.body) {
        if (fn.type !== 'FunctionDeclaration' || !hasWhile(fn.body)) continue;
        nFunc++;
        const F = fn.id.name;
        // ---- where is each local used? region 0 is the function itself, every loop is a region ----
        const locals = new Set(fn.params.map(p => p.name));
        walk(fn.body, (n) => { if (n.type === 'VariableDeclaration') for (const d of n.declarations) locals.add(d.id.name); });
        const refs = new Map(), loopOf = new Map();
        let rid = 0;
        const use = (expr, region) => walk(expr, (n, parent, key) => {
            if (n.type !== 'Identifier' || !locals.has(n.name)) return;
            if (parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return;
            if (parent && parent.type === 'CallExpression' && key === 'callee') return;
            if (!refs.has(n.name)) refs.set(n.name, new Set());
            refs.get(n.name).add(region);
        });
        const scan = (st, region, top) => {
            switch (st.type) {
                case 'BlockStatement': for (const x of st.body) scan(x, region, top); return;
                case 'VariableDeclaration':
                    for (const d of st.declarations) {
                        // `let x = 0` at the top of the function only names a working variable: not a use of it there
                        if (top && (!d.init || d.init.type === 'Literal')) { d.nameOnly = true; continue; }
                        if (d.init) use(d.init, region);
                        use(d.id, region);
                    }
                    return;
                case 'IfStatement': use(st.test, region); scan(blk(st.consequent), region, false); if (st.alternate) scan(blk(st.alternate), region, false); return;
                case 'WhileStatement': { const me = ++rid; st.rid = me; loopOf.set(me, st); use(st.test, region); use(st.test, me); scan(blk(st.body), me, false); return; }
                case 'ExpressionStatement': use(st.expression, region); return;
                case 'ReturnStatement': if (st.argument) use(st.argument, region); return;
                default: return;
            }
        };
        for (const st of fn.body.body) scan(st, 0, true);
        // ---- is a variable set before it is read, in every round of its loop? ----
        const setFirst = (name, body) => {
            let ok = true;
            const reads = (expr) => { let r = false; walk(expr, (n, parent, key) => { if (n.type === 'Identifier' && n.name === name && !(parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed)) r = true; }); return r; };
            // returns whether the variable is surely set after the statements
            const run = (list, set) => {
                for (const st of list) {
                    switch (st.type) {
                        case 'BlockStatement': set = run(st.body, set); break;
                        case 'VariableDeclaration': for (const d of st.declarations) { if (d.init && reads(d.init) && !set) ok = false; if (d.id.name === name) set = true; } break;
                        case 'ExpressionStatement': {
                            const e = st.expression;
                            if (e.type === 'AssignmentExpression' && e.left.type === 'Identifier' && e.left.name === name) {
                                if ((e.operator !== '=' || reads(e.right)) && !set) ok = false;
                                if (e.operator === '=') set = true;
                            } else if (reads(e) && !set) ok = false;
                            break;
                        }
                        case 'IfStatement': {
                            if (reads(st.test) && !set) ok = false;
                            const a = run(blk(st.consequent).body, set), b = st.alternate ? run(blk(st.alternate).body, set) : set;
                            set = a && b;
                            break;
                        }
                        case 'WhileStatement': if (reads(st.test) && !set) ok = false; break;
                        case 'ReturnStatement': if (st.argument && reads(st.argument) && !set) ok = false; break;
                        default: break;
                    }
                }
                return set;
            };
            run(body, false);
            return ok;
        };
        // its locals and parameters: a local of one loop, a local of the function, or a global
        const names = new Map(), keep = new Set(), inLoop = new Map();
        const params = new Set(fn.params.map(p => p.name));
        const g = (x) => { if (!names.has(x)) { const nm = `z${F}_${x}`; if (globals.has(nm)) throw new Error('deloop: name clash ' + nm); names.set(x, nm); extraGlobals.push(nm); } return names.get(x); };
        for (const x of locals) {
            const r = [...(refs.get(x) || [])];
            if (params.has(x)) { if (r.some(v => v !== 0)) g(x); else keep.add(x); continue; }
            if (r.length === 0) { keep.add(x); continue; }
            if (r.length === 1 && r[0] === 0) { keep.add(x); continue; }
            if (r.length === 1 && setFirst(x, blk(loopOf.get(r[0]).body).body)) { inLoop.set(x, r[0]); continue; }
            g(x);
        }
        // rename every use (a member's fixed property and a called function's name are not variables)
        walk(fn.body, (n, parent, key) => {
            if (n.type !== 'Identifier' || !names.has(n.name)) return;
            if (parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return;
            if (parent && parent.type === 'CallExpression' && key === 'callee') return;
            if (parent && parent.type === 'VariableDeclarator' && key === 'id') return;      // (handled with its declaration)
            n.name = names.get(n.name);
        });
        // statements: declarations become assignments, loops become functions
        const stmts = (list, brk) => {
            const out = [];
            for (let i = 0; i < list.length; i++) {
                const s = list[i];
                const t = stmt(s, brk);
                out.push(...t);
                // after a statement that may have broken out, the rest of the round is skipped
                if (brk && hasBreak(s) && i < list.length - 1) {
                    out.push(iff({ type: 'BinaryExpression', operator: '==', left: id(brk), right: num(0) }, stmts(list.slice(i + 1), brk)));
                    break;
                }
            }
            return out;
        };
        const stmt = (s, brk) => {
            switch (s.type) {
                case 'VariableDeclaration': {
                    const out = [];
                    for (const d of s.declarations) {
                        const x = d.id.name;
                        if (names.has(x)) out.push(assign(names.get(x), d.init || num(0)));
                        else if (keep.has(x)) out.push({ type: 'VariableDeclaration', kind: 'let', declarations: [d] });
                        else if (!d.nameOnly) out.push(assign(x, d.init || num(0)));       // a local of one loop: declared at the top of that function
                    }
                    return out;
                }
                case 'BlockStatement': return [{ type: 'BlockStatement', body: stmts(s.body, brk) }];
                case 'IfStatement': return [{ type: 'IfStatement', test: s.test, consequent: { type: 'BlockStatement', body: stmts(blk(s.consequent).body, brk) },
                    alternate: s.alternate ? { type: 'BlockStatement', body: stmts(blk(s.alternate).body, brk) } : null }];
                case 'BreakStatement': if (!brk) throw new Error('deloop: break outside a loop in ' + F); return [assign(brk, num(1))];
                case 'WhileStatement': {
                    nLoop++;
                    const L = `zl${nLoop}_${F}`;
                    const body = blk(s.body).body;
                    const flag = hasBreak(s.body) ? `zb${nLoop}_${F}` : null;
                    if (flag) extraGlobals.push(flag);
                    const again = iff(clone(s.test), [call(L)]);
                    const inner = stmts(body, flag);
                    const own = [...inLoop].filter(([, r]) => r === s.rid).map(([x]) => x);
                    if (own.length) inner.unshift({ type: 'VariableDeclaration', kind: 'let', declarations: own.map(x => ({ id: id(x), init: num(0) })) });
                    inner.push(flag ? iff({ type: 'BinaryExpression', operator: '==', left: id(flag), right: num(0) }, [again]) : again);
                    extraFuncs.push({ type: 'FunctionDeclaration', id: id(L), params: [], body: { type: 'BlockStatement', body: inner } });
                    const first = iff(clone(s.test), [call(L)]);
                    return flag ? [assign(flag, num(0)), first] : [first];
                }
                default: return [s];
            }
        };
        const body = stmts(fn.body.body, null);
        fn.body.body = [...fn.params.filter(p => names.has(p.name)).map(p => assign(names.get(p.name), id(p.name))), ...body];
    }
    let left = false;
    walk(ast, (n) => { if (n.type === 'WhileStatement') left = true; });
    if (left) throw new Error('deloop: a while loop outside a function');
    const out = [];
    if (extraGlobals.length) out.push('let ' + extraGlobals.map(n => n + ' = 0').join(', ') + ';');
    for (const st of ast.body) out.push(S(st, ''));
    for (const f of extraFuncs) out.push(S(f, ''));
    return { src: out.join('\n') + '\n', loops: nLoop, funcs: nFunc, globals: extraGlobals.length };
}

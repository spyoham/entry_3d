// ============================================================
// inline.mjs - v3.4.0: a function called from exactly one place is written
// out in that place before compiling. A function costs the work about a
// kilobyte before its first statement (its definition, the create, label
// and parameter blocks) and its call a few hundred bytes more; 232 of them
// were called once.
//
// Only statement functions (no return) called as a statement from inside
// another function (not an event handler: there locals become variables).
// The call `f(a, b);` becomes
//     { let f__p = a; let f__q = b; <f's body, its params and locals renamed f__x> }
// - arguments evaluated first, as a call does; a `let x;` without a value
// gets `= 0` (a function's locals start at 0 on every call, an inlined body
// may run again in a loop). Parameters cannot be assigned in this dialect,
// so a local holding the argument is the same thing.
// keep: true leaves the inlined functions defined as well (the node sim:
// tests call them by name; the game's own calls use the inlined copies).
// ============================================================
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const acorn = require('acorn');

const parse = (s) => acorn.parse(s, { ecmaVersion: 2022, sourceType: 'script' });
function walk(n, f, parent) {
    if (!n || typeof n.type !== 'string') return;
    f(n, parent);
    for (const k of Object.keys(n)) {
        const c = n[k];
        if (Array.isArray(c)) c.forEach((x) => walk(x, f, n));
        else if (c && typeof c.type === 'string') walk(c, f, n);
    }
}

export function inlineOnce(srcs, { keep = false, skip = [] } = {}) {
    let cur = srcs.slice();
    let done = new Set();
    let total = 0;
    for (let round = 0; round < 40; round++) {
        const asts = cur.map(parse);
        // functions, and where each one is called from
        const fns = new Map();       // name -> { si, node, value }
        asts.forEach((ast, si) => {
            for (const st of ast.body) if (st.type === 'FunctionDeclaration') {
                const last = st.body.body[st.body.body.length - 1];
                fns.set(st.id.name, { si, node: st, value: !!(last && last.type === 'ReturnStatement') });
            }
        });
        const calls = new Map();     // name -> [{ si, stmt, inFn, ok }]
        asts.forEach((ast, si) => {
            for (const top of ast.body) {
                const inFn = top.type === 'FunctionDeclaration' ? top.id.name : null;
                // (keep: an inlined function's own definition stays, but does not count)
                if (inFn && done.has(inFn)) continue;
                walk(top, (n, parent) => {
                    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && fns.has(n.callee.name)) {
                        const ok = !!inFn && parent && parent.type === 'ExpressionStatement';
                        const list = calls.get(n.callee.name) || [];
                        list.push({ si, stmt: parent, inFn, ok });
                        calls.set(n.callee.name, list);
                    }
                });
            }
        });
        // this round: callees whose one call is a plain statement in another function,
        // none of them inside a function another candidate is being removed from
        const cand = [];
        for (const [name, f] of fns) {
            if (f.value || done.has(name) || skip.includes(name)) continue;
            const cs = calls.get(name) || [];
            if (cs.length !== 1 || !cs[0].ok || cs[0].inFn === name) continue;
            cand.push({ name, f, call: cs[0] });
        }
        const busy = new Set();
        const pick = [];
        for (const c of cand) {
            // (the caller and the callee each in one edit per round)
            if (busy.has(c.name) || busy.has(c.call.inFn)) continue;
            busy.add(c.name); busy.add(c.call.inFn);
            pick.push(c);
        }
        if (!pick.length) break;
        const edits = cur.map(() => []);
        for (const { name, f, call } of pick) {
            const fsrc = cur[f.si];
            const fn = f.node;
            const own = new Set(fn.params.map((p) => p.name));
            walk(fn.body, (n) => { if (n.type === 'VariableDeclarator') own.add(n.id.name); });
            const re = (x) => `${name}__${x}`;
            // the body with its own names renamed (not member properties)
            const b0 = fn.body.start + 1, b1 = fn.body.end - 1;
            const rn = [];
            walk(fn.body, (n, parent) => {
                if (n.type !== 'Identifier' || !own.has(n.name)) return;
                if (parent && parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
                rn.push([n.start, n.end, re(n.name)]);
            });
            // `let x;` -> `let x = 0;`
            walk(fn.body, (n) => { if (n.type === 'VariableDeclarator' && !n.init) rn.push([n.id.end, n.id.end, ' = 0']); });
            rn.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
            let body = fsrc.slice(b0, b1);
            for (const [a, b, t] of rn) body = body.slice(0, a - b0) + t + body.slice(b - b0);
            const csrc = cur[call.si];
            const args = call.stmt.expression.arguments.map((a) => csrc.slice(a.start, a.end));
            const lets = fn.params.map((p, i) => `let ${re(p.name)} = ${args[i]};`).join(' ');
            edits[call.si].push([call.stmt.start, call.stmt.end, `{ ${lets}${body}}`]);
            if (!keep) edits[f.si].push([fn.start, fn.end, `// (${name}: written out where it is called - inline.mjs)`]);
            done.add(name);
            total++;
        }
        cur = cur.map((s, si) => {
            const es = edits[si].sort((a, b) => b[0] - a[0]);
            let o = s;
            for (const [a, b, t] of es) o = o.slice(0, a) + t + o.slice(b);
            return o;
        });
    }
    return { srcs: cur, count: total, names: [...done] };
}

// Macro expansion for EJS sources.
//
// A tessvm (and Entry) function call is costly: the callee is a generator the
// scheduler has to step into. Hot code is therefore written as macros:
//
//   function M_name(a, b) { ... }      a top-level function whose name starts with M_
//   M_name(x, y + 1);                  a call statement: replaced by the body in braces,
//                                      each parameter replaced by the argument's text
//
// A macro shares the caller's variables (it is text): it may assign to them, and
// a `let` inside it becomes a local of the calling function. Arguments are
// pasted as they are, so pass names and constants, not expressions with effects.
// Macros may call macros. The definitions are removed from the output.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const acorn = require('acorn');

const isMacroName = (n) => /^M_/.test(n);

function walk(node, fn, parent = null) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) walk(x, fn, parent); return; }
    if (typeof node.type === 'string') fn(node, parent);
    for (const k in node) {
        if (k === 'loc' || k === 'start' || k === 'end') continue;
        const v = node[k];
        if (v && typeof v === 'object') walk(v, fn, typeof node.type === 'string' ? node : parent);
    }
}

const isMacroCall = (n) => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' &&
    n.expression.callee.type === 'Identifier' && isMacroName(n.expression.callee.name);

export function expandMacros(src) {
    let count = 0;
    for (let guard = 0; guard < 100000; guard++) {
        const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
        const macros = new Map();
        for (const st of ast.body) if (st.type === 'FunctionDeclaration' && isMacroName(st.id.name)) macros.set(st.id.name, st);
        // a macro is ready when its own body holds no macro call
        const ready = new Set();
        for (const [name, m] of macros) { let has = false; walk(m.body, (n) => { if (isMacroCall(n)) has = true; }); if (!has) ready.add(name); }
        // the last ready call in the text (so earlier offsets stay valid is no concern: one per pass)
        let target = null;
        walk(ast, (n) => {
            if (!isMacroCall(n)) return;
            const name = n.expression.callee.name;
            if (!macros.has(name)) throw new Error('unknown macro ' + name);
            if (ready.has(name) && (!target || n.start > target.start)) target = n;
        });
        if (!target) {
            let left = false;
            walk(ast, (n) => { if (isMacroCall(n)) left = true; });
            if (left) throw new Error('macros call each other in a circle');
            // drop the definitions (from the end, so offsets hold)
            const defs = [...macros.values()].sort((a, b) => b.start - a.start);
            for (const d of defs) src = src.slice(0, d.start) + src.slice(d.end);
            return { src, count };
        }
        const m = macros.get(target.expression.callee.name);
        const args = target.expression.arguments;
        if (args.length !== m.params.length) throw new Error(`macro ${m.id.name}: ${m.params.length} parameters, ${args.length} arguments`);
        const sub = new Map();
        m.params.forEach((p, i) => {
            const a = args[i];
            const text = src.slice(a.start, a.end);
            sub.set(p.name, a.type === 'Identifier' || a.type === 'Literal' ? text : `(${text})`);
        });
        // identifiers of the body that name a parameter (not `obj.name` keys)
        const edits = [];
        walk(m.body, (n, parent) => {
            if (n.type !== 'Identifier' || !sub.has(n.name)) return;
            if (parent && parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
            edits.push(n);
        });
        edits.sort((a, b) => b.start - a.start);
        let body = src.slice(m.body.start, m.body.end);     // with its braces
        for (const e of edits) body = body.slice(0, e.start - m.body.start) + sub.get(e.name) + body.slice(e.end - m.body.start);
        src = src.slice(0, target.start) + body + src.slice(target.end);
        count++;
    }
    throw new Error('macro expansion did not end');
}

// A macro's working variables live in the function that uses it. This gives
// every function a `let` for each name it assigns that is neither a parameter,
// a local it declares itself, nor a global.
export function declareImplicit(src) {
    const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
    const globals = new Set();
    for (const st of ast.body) if (st.type === 'VariableDeclaration') for (const d of st.declarations) globals.add(d.id.name);
    const inserts = [];
    for (const st of ast.body) {
        if (st.type !== 'FunctionDeclaration') continue;
        const declared = new Set(st.params.map(p => p.name));
        const assigned = new Set();
        walk(st.body, (n) => {
            if (n.type === 'VariableDeclaration') for (const d of n.declarations) declared.add(d.id.name);
            if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier') assigned.add(n.left.name);
            if (n.type === 'UpdateExpression' && n.argument.type === 'Identifier') assigned.add(n.argument.name);
        });
        const need = [...assigned].filter(n => !declared.has(n) && !globals.has(n));
        if (need.length) inserts.push({ at: st.body.start + 1, text: ` let ${need.map(n => n + ' = 0').join(', ')};` });
    }
    inserts.sort((a, b) => b.at - a.at);
    for (const i of inserts) src = src.slice(0, i.at) + i.text + src.slice(i.at);
    return src;
}

// ============================================================
// tabulate.mjs - v3.4.0: calls with constant arguments, made smaller before
// compiling (the work has to stay under the site's size limit, and a block
// costs about 230 bytes of it however small its value).
//
// A call to one of TABLED with at least MINC arguments that are compile-time
// constants - tx(9, 'CAREER', 0 - 232, 116, 21, C_WHITE, 1) - becomes a call
// to a wrapper with the row of a table and the other arguments,
//     tx_T125(4, s)  ->  function tx_T125(r, d1) { tx(tb_tx_1[r], d1, ..., tb_tx_7[r]); }
// one wrapper per function and set of constant places (a bit mask), one list
// per function and argument place holding the constants of every call.
// 8 blocks become 2 and the constants go into list items (~30 bytes each).
// The program does exactly the same; only statement functions are tabled.
// Applied to the sources both backends compile (build.mjs, sim.mjs).
// ============================================================
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const acorn = require('acorn');

export const TABLED = ['tx', 'box', 'cardTx', 'cardRow', 'fill4', 'skewBar', 'fillOct', 'scPutFacing', 'scPut', 'penalise', 'hxAdd', 'drawMap3D', 'unpack', 'setMsg', 'setBanner', 'setRadio'];
const MINC = 3;
const MAXMASK = 3;          // wrappers per function at most
const BLOCKB = 235;         // bytes a block costs in the work (about)
const ITEMB = 35;           // ...a list item
const WRAPB = 4500;         // ...a wrapper function

export function tabulate(srcs, extConsts = {}) {
    const asts = srcs.map((s) => acorn.parse(s, { ecmaVersion: 2022, sourceType: 'script', ranges: true }));
    // the constants, as the compiler has them (the build's, then each const in order)
    const consts = { ...extConsts };
    const ev = (n) => {
        switch (n.type) {
            case 'Literal': if (typeof n.value === 'number' || typeof n.value === 'string') return { v: n.value }; return null;
            case 'Identifier': return n.name in consts ? { v: consts[n.name] } : null;
            case 'UnaryExpression': { const a = ev(n.argument); if (!a || typeof a.v !== 'number') return null; if (n.operator === '-') return { v: -a.v }; if (n.operator === '+') return { v: a.v }; return null; }
            case 'BinaryExpression': {
                const a = ev(n.left), b = ev(n.right);
                if (!a || !b || typeof a.v !== 'number' || typeof b.v !== 'number') return null;
                switch (n.operator) { case '+': return { v: a.v + b.v }; case '-': return { v: a.v - b.v }; case '*': return { v: a.v * b.v }; case '/': return { v: a.v / b.v }; }
                return null;
            }
        }
        return null;
    };
    const arity = {};
    const valueFn = new Set();
    for (const ast of asts) for (const st of ast.body) {
        if (st.type === 'VariableDeclaration' && st.kind === 'const') for (const d of st.declarations) { const r = d.init && ev(d.init); if (r) consts[d.id.name] = r.v; }
        if (st.type === 'FunctionDeclaration') {
            arity[st.id.name] = st.params.length;
            const last = st.body.body[st.body.body.length - 1];
            if (last && last.type === 'ReturnStatement') valueFn.add(st.id.name);
        }
    }
    const tabled = new Set(TABLED.filter((n) => arity[n] !== undefined && !valueFn.has(n)));
    // pass 1: every candidate call - its source, place, and which arguments are constant
    const cands = [];
    asts.forEach((ast, si) => {
        const taken = [];
        const visit = (n) => {
            if (!n || typeof n.type !== 'string') return;
            if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && tabled.has(n.callee.name) && n.arguments.length === arity[n.callee.name]
                && !taken.some(([a, b]) => n.start >= a && n.end <= b)) {
                const vals = n.arguments.map(ev);
                if (vals.filter(Boolean).length >= MINC) {
                    let set = 0;
                    vals.forEach((v, i) => { if (v) set |= 1 << i; });
                    cands.push({ si, n, vals, set, name: n.callee.name });
                    taken.push([n.start, n.end]);
                    return;
                }
            }
            for (const k of Object.keys(n)) {
                if (k === 'loc' || k === 'range') continue;
                const c = n[k];
                if (Array.isArray(c)) c.forEach(visit);
                else if (c && typeof c.type === 'string') visit(c);
            }
        };
        visit(ast);
    });
    // pass 2: per function, a few masks (constant places) - each wrapper costs about
    // WRAPB bytes, each tabled place saves a block but adds a list item
    const pop = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
    const gain = (m) => (pop(m) - 1) * BLOCKB - pop(m) * ITEMB;
    const chosen = {};
    for (const name of tabled) {
        const cs = cands.filter((c) => c.name === name);
        if (!cs.length) continue;
        const opts = new Set(cs.map((c) => c.set));
        for (const a of [...opts]) for (const b of [...opts]) { const m = a & b; if (pop(m) >= MINC) opts.add(m); }
        const ms = [];
        const best = (c, list) => { let g = 0; for (const m of list) if ((c.set & m) === m) g = Math.max(g, gain(m)); return g; };
        const total = (list) => cs.reduce((t, c) => t + best(c, list), 0) - list.length * WRAPB;
        while (ms.length < MAXMASK) {
            let bm = -1, bt = total(ms);
            for (const m of opts) { if (ms.includes(m)) continue; const t = total([...ms, m]); if (t > bt) { bt = t; bm = m; } }
            if (bm < 0) break;
            ms.push(bm);
        }
        if (ms.length) chosen[name] = ms;
    }
    const rows = {};            // name -> [[value or undefined per place], ...]
    const masks = {};           // name -> Set of masks used
    const editsBy = srcs.map(() => []);
    for (const c of cands) {
        const ms = chosen[c.name];
        if (!ms) continue;
        let m = -1, g = 0;
        for (const mm of ms) if ((c.set & mm) === mm && gain(mm) > g) { g = gain(mm); m = mm; }
        if (m < 0) continue;
        const name = c.name;
        const src = srcs[c.si];
        rows[name] = rows[name] || [];
        masks[name] = masks[name] || new Set();
        masks[name].add(m);
        rows[name].push(c.vals.map((v, i) => ((m & (1 << i)) ? v.v : undefined)));
        const row = rows[name].length;
        const dyn = c.n.arguments.filter((a, i) => !(m & (1 << i))).map((a) => src.slice(a.start, a.end));
        editsBy[c.si].push([c.n.start, c.n.end, `${name}_T${m}(${[row, ...dyn].join(', ')})`]);
    }
    const out = srcs.map((src, si) => {
        const edits = editsBy[si].sort((a, b) => b[0] - a[0]);
        let s2 = src;
        for (const [a, b, t] of edits) s2 = s2.slice(0, a) + t + s2.slice(b);
        return s2;
    });
    // the tables and the wrappers
    let extra = '\n// ---- v3.4.0 (tabulate.mjs): constant arguments of calls, by row ----\n';
    const lit = (v) => (v === undefined ? '0' : JSON.stringify(v));
    for (const name of Object.keys(rows)) {
        const n = arity[name];
        for (let p = 0; p < n; p++) {
            if (!rows[name].some((r) => r[p] !== undefined)) continue;
            extra += `let tb_${name}_${p + 1} = [${rows[name].map((r) => lit(r[p])).join(', ')}];\n`;
        }
        for (const mask of masks[name]) {
            const ps = [];
            const as = [];
            let d = 0;
            for (let p = 0; p < n; p++) {
                if (mask & (1 << p)) as.push(`tb_${name}_${p + 1}[r]`);
                else { d++; ps.push('d' + d); as.push('d' + d); }
            }
            extra += `function ${name}_T${mask}(${['r', ...ps].join(', ')}) { ${name}(${as.join(', ')}); }\n`;
        }
    }
    const stats = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length]));
    return { srcs: [...out, extra], stats };
}

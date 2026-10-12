// Paged lists: playentry keeps at most 5000 items in a list (a push past that
// drops the oldest item), so a long list X is declared `let X = paged(N);` and
// becomes N plain lists X1..XN of PAGE items each. The compiler rewrites every
// X[i], X[i] = v, X.push(v), X.length into the helpers below; hot loops use the
// run helpers, which find the page once per run instead of once per item.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const acorn = require('acorn');

// (PAGE can be made small for tests: every page boundary then gets crossed)
export const PAGE = Number(process.env.GMP_PAGE || 5000);

// if-tree over the pages lo..hi of the 1-based index held in `v`: leaf(k)
// gives the statements for page k. Page 1 is tested first (a small program
// never leaves it), then the rest is halved
const NL = '\n';
const indent = (text, ind) => text.split(NL).map(l => ind + l).join(NL) + NL;
function tree(v, lo, hi, leaf, ind = '    ', top = true) {
    const nest = (a, b) => tree(v, a, b, leaf, ind + '    ', false);
    if (top && hi > 2) return `${ind}if (${v} <= ${PAGE}) {${NL}${nest(1, 1)}${ind}} else {${NL}${nest(2, hi)}${ind}}${NL}`;
    if (lo === hi) return indent(leaf(lo), ind);
    const mid = (lo + hi) >> 1;
    return `${ind}if (${v} <= ${mid * PAGE}) {${NL}${nest(lo, mid)}${ind}} else {${NL}${nest(mid + 1, hi)}${ind}}${NL}`;
}
// the same over a page number held in `v`
function ptree(v, lo, hi, leaf, ind = '    ', top = true) {
    const nest = (a, b) => ptree(v, a, b, leaf, ind + '    ', false);
    if (top && hi > 2) return `${ind}if (${v} <= 1) {${NL}${nest(1, 1)}${ind}} else {${NL}${nest(2, hi)}${ind}}${NL}`;
    if (lo === hi) return indent(leaf(lo), ind);
    const mid = (lo + hi) >> 1;
    return `${ind}if (${v} <= ${mid}) {${NL}${nest(lo, mid)}${ind}} else {${NL}${nest(mid + 1, hi)}${ind}}${NL}`;
}

// a 4-way unrolled copy loop: dst[d + k] = src[s + k] for k < m
const copyLoop = (dst, d, src, s) => `let k = 0; let e4 = m - 3;
while (k < e4) { ${dst}[${d} + k] = ${src}[${s} + k]; ${dst}[${d} + k + 1] = ${src}[${s} + k + 1]; ${dst}[${d} + k + 2] = ${src}[${s} + k + 2]; ${dst}[${d} + k + 3] = ${src}[${s} + k + 3]; k = k + 4; }
while (k < m) { ${dst}[${d} + k] = ${src}[${s} + k]; k = k + 1; }`;

// EJS source of the paged list X with np pages; flat: the plain lists that
// get run copies to and from X (X__toS(d, s, n): S[d..d+n) = X[s..s+n))
export function pagedSource(X, np, flat = []) {
    let s = `// ---- paged list ${X}: ${np} pages of ${PAGE} ----\n`;
    for (let k = 1; k <= np; k++) s += `let ${X}${k} = [];\n`;
    s += `let ${X}__len = 0;\nconst ${X}__CAP = ${np * PAGE};\n`;
    s += `function ${X}__get(i) {\n    let v = 0;\n${tree('i', 1, np, (k) => `v = ${X}${k}[i${k > 1 ? ' - ' + (k - 1) * PAGE : ''}];`)}    return v;\n}\n`;
    s += `function ${X}__set(i, v) {\n${tree('i', 1, np, (k) => `${X}${k}[i${k > 1 ? ' - ' + (k - 1) * PAGE : ''}] = v;`)}}\n`;
    s += `function ${X}__push(v) {\n    ${X}__len = ${X}__len + 1;\n    let i = ${X}__len;\n${tree('i', 1, np, (k) => `${X}${k}.push(v);`)}}\n`;
    // runs: [i, e) cut at page ends; q is the index inside page pg
    const runs = (name, params, body) => `function ${name}(${params}) {
    let i = s; let e = s + n; let o = d;
    while (i < e) {
        let pg = idiv(i - 1, ${PAGE}) + 1;
        let pe = pg * ${PAGE} + 1;
        if (pe > e) { pe = e; }
        let q = i - (pg - 1) * ${PAGE};
        let m = pe - i;
${ptree('pg', 1, np, body, '        ')}        o = o + m; i = pe;
    }
}
`;
    for (const L of flat) {
        s += runs(`${X}__to${L}`, 'd, s, n', (k) => copyLoop(L, 'o', `${X}${k}`, 'q'));
        s += runs(`${X}__from${L}`, 'd, s, n', (k) => copyLoop(`${X}${k}`, 'q', L, 'o')).replace('let i = s; let e = s + n; let o = d;', 'let i = d; let e = d + n; let o = s;');
    }
    // value: the carry out of X[d..d+n) += L[s..s+n), limbs in base BASE
    for (const L of flat) s += `function ${X}__add${L}(d, s, n) {
    let i = d; let e = d + n; let o = s; let c = 0; let t = 0;
    while (i < e) {
        let pg = idiv(i - 1, ${PAGE}) + 1;
        let pe = pg * ${PAGE} + 1;
        if (pe > e) { pe = e; }
        let q = i - (pg - 1) * ${PAGE};
        let m = pe - i;
${ptree('pg', 1, np, (k) => `let k = 0;
while (k < m) { t = ${X}${k}[q + k] + ${L}[o + k] + c; c = 0; if (t >= BASE) { t = t - BASE; c = 1; } ${X}${k}[q + k] = t; k = k + 1; }`, '        ')}        o = o + m; i = pe;
    }
    return c;
}
`;
    // length up to n: zeros pushed onto each page in turn
    s += `function ${X}__grow(n) {
    let t = n;
    if (t > ${X}__CAP) { t = ${X}__CAP; }
    while (${X}__len < t) {
        let pg = idiv(${X}__len, ${PAGE}) + 1;
        let m = pg * ${PAGE};
        if (m > t) { m = t; }
        m = m - ${X}__len;
        ${X}__len = ${X}__len + m;
${ptree('pg', 1, np, (k) => `for (const _ of rep(m)) { ${X}${k}.push(0); }`, '        ')}    }
}
`;
    // X[d..d+n) = v
    s += runs(`${X}__fill`, 'd, n, v', (k) => `let k = 0; let e4 = m - 3;\nwhile (k < e4) { ${X}${k}[q + k] = v; ${X}${k}[q + k + 1] = v; ${X}${k}[q + k + 2] = v; ${X}${k}[q + k + 3] = v; k = k + 4; }\nwhile (k < m) { ${X}${k}[q + k] = v; k = k + 1; }`).replace('let i = s; let e = s + n; let o = d;', 'let i = d; let e = d + n; let o = 0;');
    return s;
}

// `let X = paged(N, [flat lists]);` lines become the page lists and helpers
// (in the source text, so profiles map blocks to these lines too)
export function expandPagedSource(src) {
    const paged = new Set();
    const out = src.replace(/^let (\w+) = paged\((\d+)(?:, \[([^\]]*)\])?\);.*$/gm, (m, X, n, fl) => {
        paged.add(X);
        const np = Number(process.env.GMP_PAGES || n);
        return pagedSource(X, np, fl ? fl.split(',').map(x => x.trim()).filter(Boolean) : []);
    });
    return { src: out, paged };
}

// rewrite X[i], X[i] = v, X[i] += v, X.push(v), X.length of the paged lists
// into helper calls (X[i] is evaluated twice in a compound assignment)
export function rewritePaged(ast, paged) {
    if (!paged.size) return ast;
    const id = (name) => ({ type: 'Identifier', name });
    const call = (name, args) => ({ type: 'CallExpression', callee: id(name), arguments: args, optional: false });
    const isP = (n) => n && n.type === 'MemberExpression' && n.object.type === 'Identifier' && paged.has(n.object.name);
    const clone = (n) => JSON.parse(JSON.stringify(n));
    // the node itself (its children are already rewritten)
    const rw = (n) => {
        if (n.type === 'AssignmentExpression' && isP(n.left) && n.left.computed) {
            const X = n.left.object.name; const i = n.left.property;
            const v = n.operator === '=' ? n.right : { type: 'BinaryExpression', operator: n.operator.slice(0, -1), left: call(X + '__get', [clone(i)]), right: n.right };
            return { ...call(X + '__set', [i, v]), loc: n.loc };
        }
        if (n.type === 'UpdateExpression' && isP(n.argument) && n.argument.computed) {
            const X = n.argument.object.name; const i = n.argument.property;
            return { ...call(X + '__set', [i, { type: 'BinaryExpression', operator: n.operator[0], left: call(X + '__get', [clone(i)]), right: { type: 'Literal', value: 1 } }]), loc: n.loc };
        }
        if (n.type === 'CallExpression' && isP(n.callee) && !n.callee.computed) {
            const X = n.callee.object.name; const m = n.callee.property.name;
            if (m === 'push') return { ...call(X + '__push', n.arguments), loc: n.loc };
            throw new Error(`paged list ${X}: .${m} is not supported`);
        }
        if (isP(n)) {
            const X = n.object.name;
            if (n.computed) return { ...call(X + '__get', [n.property]), loc: n.loc };
            if (n.property.name === 'length') return { ...id(X + '__len'), loc: n.loc };
            throw new Error(`paged list ${X}: .${n.property.name}`);
        }
        return n;
    };
    // post-order; an assignment target and a called method are not reads
    const walk = (n) => {
        if (!n || typeof n !== 'object') return n;
        if (Array.isArray(n)) return n.map(walk);
        if ((n.type === 'AssignmentExpression' && isP(n.left)) || (n.type === 'UpdateExpression' && isP(n.argument))) {
            const tgt = n.type === 'AssignmentExpression' ? n.left : n.argument;
            tgt.property = walk(tgt.property);
            if (n.right) n.right = walk(n.right);
            return rw(n);
        }
        if (n.type === 'CallExpression' && isP(n.callee)) { n.arguments = walk(n.arguments); return rw(n); }
        for (const k of Object.keys(n)) if (k !== 'loc' && n[k] && typeof n[k] === 'object') n[k] = walk(n[k]);
        return rw(n);
    };
    ast.body = ast.body.map(walk);
    return ast;
}

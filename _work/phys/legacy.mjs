// Entry still carries the arithmetic blocks it had before `calc_basic` (calc_plus, calc_minus,
// calc_times, calc_divide: one block an operator, operands at 0 and 2). `calc_basic` works
// through BigNumber - decimal arithmetic, about 2 microseconds an operation on the numbers
// of this work - and the old blocks are the plain `a + b` of the engine. With whole numbers
// both give the same result, so every `calc_basic` of the compiled program is rewritten here.
// (tessvm compiles the old names to the same code as the new one.)
const OLD = { PLUS: 'calc_plus', MINUS: 'calc_minus', MULTI: 'calc_times', DIVIDE: 'calc_divide' };
function walk(b) {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { for (const x of b) walk(x); return; }
    if (b.params) for (const p of b.params) walk(p);
    if (b.statements) for (const s of b.statements) walk(s);
    if (b.type === 'calc_basic') { const [l, op, r] = b.params; b.type = OLD[op]; b.params = [l, null, r]; }
}
export function legacyMath(prog) {
    for (const f of prog.functions) { const c = JSON.parse(f.content); walk(c); f.content = JSON.stringify(c); }
    for (const k of Object.keys(prog.objectScripts)) walk(prog.objectScripts[k]);
    return prog;
}

// A block as the compiler writes it carries every field Entry's block has; those left at
// their default say nothing, and with tens of thousands of blocks they are most of the
// project's size. Entry (and tessvm) fill a missing field with the same default.
const DEFAULTS = { x: 0, y: 0, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true };
function slimWalk(b) {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { for (const x of b) slimWalk(x); return; }
    if (typeof b.type === 'string') {
        for (const k in DEFAULTS) if (b[k] === DEFAULTS[k]) delete b[k];
        if (Array.isArray(b.extensions) && !b.extensions.length) delete b.extensions;
        if (Array.isArray(b.statements) && !b.statements.length) delete b.statements;
    }
    if (b.params) for (const p of b.params) slimWalk(p);
    if (b.statements) for (const s of b.statements) slimWalk(s);
}
export function slimBlocks(prog) {
    for (const f of prog.functions) { const c = JSON.parse(f.content); slimWalk(c); f.content = JSON.stringify(c); }
    for (const k of Object.keys(prog.objectScripts)) slimWalk(prog.objectScripts[k]);
    return prog;
}

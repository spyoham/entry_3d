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
let slimN = 0, slimIds = false;
const ID62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function shortId(n) { let r = ''; do { r = ID62[n % 62] + r; n = Math.floor(n / 62); } while (n > 0); if (r.length > 3) throw new Error('too many local-variable blocks for 3-letter ids'); return r; }
function slimWalk(b) {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { for (const x of b) slimWalk(x); return; }
    if (typeof b.type === 'string') {
        for (const k in DEFAULTS) if (b[k] === DEFAULTS[k]) delete b[k];
        if (Array.isArray(b.extensions) && !b.extensions.length) delete b.extensions;
        if (Array.isArray(b.statements) && !b.statements.length) delete b.statements;
        // (v3.1) the nulls at the end of the params (a text or an indicator's place): a missing one is filled
        // from the block's schema as a null one is (entryjs block.js _updateSchema; tessvm reads by index)
        if (Array.isArray(b.params)) { while (b.params.length && b.params[b.params.length - 1] === null) b.params.pop(); }
        // (v3.2) the block's id: one without is given a new one as it is loaded (entryjs block.js load:
        // if (!block.id) block.id = generateId()). Only a function's local-variable blocks keep one: the
        // editor finds their function by it (block_func.js menuName -> getFunctionByBlockId) and, shown
        // with another function's variables, would change the variable. Theirs are 1 to 3 letters, never
        // one the editor makes (always 4), so no block made on loading can be taken for them.
        if (b.type === 'get_func_variable' || b.type === 'set_func_variable') { if (slimIds) b.id = shortId(slimN++); }
        else delete b.id;
    }
    if (b.params) for (const p of b.params) slimWalk(p);
    if (b.statements) for (const s of b.statements) slimWalk(s);
}
export function slimBlocks(prog) {
    slimN = 0; slimIds = true;
    for (const f of prog.functions) { const c = JSON.parse(f.content); slimWalk(c); f.content = JSON.stringify(c); }
    for (const k of Object.keys(prog.objectScripts)) slimWalk(prog.objectScripts[k]);
    return prog;
}

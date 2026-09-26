// Run an .ent in tessvm (the extension's runtime) headless.
// usage: node trun.mjs file.ent [--ms 8000] [--script steps.json] [--shot out.png] [--gpu] [--vars a,b]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ms = Number(opt('ms', 8000));
const steps = opt('script', null) ? JSON.parse(fs.readFileSync(opt('script'), 'utf8')) : [];
const vars = (opt('vars', '') || '').split(',').filter(Boolean);
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then(r => r.text()).then(t => { if (t !== 'ok') throw new Error(t); });
const gpu = args.includes('--gpu');
const browser = await chromium.launch({ args: gpu ? ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${PORT}/harness/index.html` + (opt('nick') ? '?nick=' + encodeURIComponent(opt('nick')) : ''));
if (opt('throttle')) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: Number(opt('throttle')) }); }
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const info = await page.evaluate(() => ({
    compileMs: window.__compileMs, dropped: window.__dropped, errors: window.__errors,
    kernel: window.__vm?.kernelPlan ? { roots: window.__vm.kernelPlan.roots.size, skipped: window.__vm.kernelPlan.skipped?.length, why: (window.__vm.kernelPlan.rejected || window.__vm.kernelPlan.reasons || null) } : null,
    kernelOn: !!window.__vm?.kernel,
}));
console.log(JSON.stringify(info).slice(0, 3000));
if (opt('src')) fs.writeFileSync(opt('src'), await page.evaluate(() => window.__source));
await page.evaluate(() => {
    const vm = window.__vm; const R = vm.renderer;
    window.__prof = { tick: 0, n: 0, flush: 0, nf: 0, max: 0 };
    const t0 = vm.tick.bind(vm); vm.tick = (d) => { const a = performance.now(); t0(d); const b = performance.now() - a; const P = window.__prof; P.tick += b; P.n++; if (b > P.max) P.max = b; };
    const f0 = R.flush.bind(R); R.flush = () => { const a = performance.now(); f0(); const P = window.__prof; P.flush += performance.now() - a; P.nf++; };
});
await page.evaluate(() => { window.__handle.start(); window.__t0 = performance.now(); window.__f0 = window.__vm.frame; });
const readVars = () => page.evaluate((names) => {
    const out = {}; const vm = window.__vm;
    for (const n of names) { const v = vm.variables.find(v => v.name === n); out[n] = v ? (Array.isArray(v.value) ? v.value.slice(0, 20) : v.value) : undefined; }
    return out;
}, vars);
const shot = async (p) => { const c = await page.$('canvas'); await c.screenshot({ path: p }); };
const key = (type, k) => page.evaluate(([type, k]) => document.body.dispatchEvent(new KeyboardEvent(type, { code: k.code, key: k.key, keyCode: k.keyCode, which: k.keyCode, bubbles: true })), [type, k]);
let last = { t: 0, f: 0 };
const fpsNow = async () => { const r = await page.evaluate(() => ({ t: performance.now() - window.__t0, f: window.__vm.frame - window.__f0 })); const d = { dt: r.t - last.t, df: r.f - last.f }; last = r; return (d.df * 1000 / d.dt).toFixed(1); };
for (const st of steps) {
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.throttle !== undefined) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: st.throttle }); }   // (from here on only)
    if (st.down) await key('keydown', st.down);
    if (st.up) await key('keyup', st.up);
    if (st.fps) { const P = await page.evaluate(() => { const P = { ...window.__prof }; Object.assign(window.__prof, { tick: 0, n: 0, flush: 0, nf: 0, max: 0 }); return P; });
        console.log('fps', st.fps, await fpsNow(), 'tick ms', (P.tick / P.n).toFixed(2), 'max', P.max.toFixed(1), 'flush ms', (P.flush / P.nf).toFixed(2)); }
    if (st.type) await page.keyboard.type(st.type, { delay: 5 });
    if (st.press) await page.keyboard.press(st.press);
    if (st.shot) await shot(st.shot);
    if (st.vars) console.log(JSON.stringify(await readVars()));
    if (st.profStart) { globalThis.__cdp = await page.context().newCDPSession(page); await __cdp.send('Profiler.enable'); await __cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await __cdp.send('Profiler.start'); }
    if (st.profStop) {
        const { profile } = await __cdp.send('Profiler.stop');
        const { src, names, kern } = await page.evaluate(() => ({ src: window.__progSrc, names: window.__fnNames, kern: window.__kernSrc || '' }));
        const lines = src.split(String.fromCharCode(10)); const starts = [];
        lines.forEach((l, i) => { const m = /^F\[(\d+)\] = /.exec(l); if (m) starts.push([i, Number(m[1])]); });
        const scriptStart = lines.findIndex(l => l.startsWith('return { scripts'));
        const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
        const parent = new Map(); for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
        const fnOf = (id) => { let x = id; while (x !== undefined) { const cf = byId.get(x).callFrame; if (!cf.url || cf.url.startsWith('VM')) { const L = cf.lineNumber - 2; let f = null; for (const [ln, idx] of starts) if (ln <= L) f = idx; if (f !== null && L < scriptStart) return names[f]; if (L >= scriptStart) return 'script'; } x = parent.get(x); } return null; };
        const incl = new Map();
        const dt = new Map(); profile.samples.forEach((s, i) => dt.set(s, (dt.get(s) || 0) + (profile.timeDeltas[i] || 0)));
        let total = 0;
        for (const [id, t] of dt) { const n = byId.get(id); const cf = n.callFrame; total += t;
            let key = cf.functionName + ' ' + (cf.url.split('/').pop()) + ':' + cf.lineNumber;
            if (!cf.url || cf.url.startsWith('VM') ) { const L = cf.lineNumber - 2; let f = null; for (const [ln, idx] of starts) if (ln <= L) f = idx;
                if (L >= scriptStart && scriptStart > 0) key = 'script@' + L; else if (f !== null && src.length) key = 'F:' + names[f] + (cf.functionName ? '/' + cf.functionName : ''); else key = 'eval ' + cf.functionName + ':' + cf.lineNumber; }
            self.set(key, (self.get(key) || 0) + t);
            const fn = fnOf(id); if (fn) incl.set(fn, (incl.get(fn) || 0) + t); }
        console.log('-- by Entry function (own code + runtime helpers it called)');
        for (const [k, t] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log((100 * t / total).toFixed(1).padStart(5) + '%  ' + k);
        const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(st.profStop) || 40);
        console.log('profile total ms', (total / 1000).toFixed(0));
        for (const [k, t] of top) console.log((100 * t / total).toFixed(1).padStart(5) + '%  ' + k);
    }
    if (st.castStart) await page.evaluate(() => { globalThis.__castI = { vals: [], fix: 0, dec: 0, st: [], st2: [], f0: window.__vm.frame }; });
    if (st.castStop) {
        const R = await page.evaluate(() => { const I = globalThis.__castI; globalThis.__castI = null; return { vals: I.vals, fix: I.fix, dec: I.dec, st: I.st, st2: I.st2, frames: window.__vm.frame - I.f0, src: window.__progSrc, names: window.__fnNames }; });
        console.log(JSON.stringify(R.vals.slice(0,60)));console.log('frames', R.frames, 'toFixed/frame', (R.fix / R.frames).toFixed(0), 'decimalsBelow/frame', (R.dec / R.frames).toFixed(0));
        const lines = R.src.split(String.fromCharCode(10)); const starts = [];
        lines.forEach((l, i) => { const m = /^F\[(\d+)\] = /.exec(l); if (m) starts.push([i, Number(m[1])]); });
        for (const [lab, arr] of [['toFixed', R.st], ['decimalsBelow', R.st2]]) {
            const cnt = new Map();
            for (const s of arr) { const m = /<anonymous>:(\d+):(\d+)/.exec(s); if (!m) { cnt.set('?', (cnt.get('?') || 0) + 1); continue; }
                const L = Number(m[1]) - 3; let f = null; for (const [ln, idx] of starts) if (ln <= L) f = idx;
                const key = (f !== null ? R.names[f] : '?') + ' | ' + (lines[L] || '').trim().slice(0, 150);
                cnt.set(key, (cnt.get(key) || 0) + 1); }
            console.log('== ' + lab);
            for (const [k, c] of [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(c).padStart(5), k);
        }
    }
    if (st.eval) console.log(JSON.stringify(await page.evaluate(st.eval)));
}
if (!steps.length) { await page.waitForTimeout(ms); }
const r = await page.evaluate(() => ({ t: performance.now() - window.__t0, f: window.__vm.frame - window.__f0, errs: window.__vm.errors.slice(0, 5) }));
console.log('ticks', r.f, 'in', Math.round(r.t), 'ms =>', (r.f * 1000 / r.t).toFixed(1), 'tick/s');
if (vars.length) console.log(JSON.stringify(await readVars()));
if (opt('shot')) await shot(opt('shot'));
console.log('vm errors', JSON.stringify(r.errs), 'page errors', errors.slice(0, 8));
await browser.close();

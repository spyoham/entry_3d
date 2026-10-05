// Measure an .ent under tessvm in a real browser: tick (program) and flush (drawing) per frame, and frames a second.
// usage: node tm.mjs file.ent [--chrome] [--gpu] [--headed] [--ms 6000] [--warm 3000] [--throttle n] [--shot out.png] [--vars a,b] [--keys "KeyW:87,ArrowLeft:37"]
import { createRequire } from 'node:module';
import path from 'node:path';
import cp from 'node:child_process';
import url from 'node:url';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const PORT = 3100;
async function up() { try { await fetch(`http://localhost:${PORT}/harness/index.html`); return true; } catch { return false; } }
if (!(await up())) {
    cp.spawn('node', ['tsrv.mjs', String(PORT)], { cwd: path.join(HERE, '../tessvm'), stdio: 'ignore', detached: true }).unref();
    for (let i = 0; i < 50 && !(await up()); i++) await new Promise(r => setTimeout(r, 200));
}
export async function measure(file, { chrome = false, gpu = false, headed = false, ms = 6000, warm = 3000, throttle = 0, shot = null, vars = [], keys = [] } = {}) {
    const r0 = await (await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(path.resolve(file))}`)).text();
    if (r0 !== 'ok') throw new Error(r0);
    const browser = await chromium.launch({ channel: chrome ? 'chrome' : undefined, headless: !headed,
        args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/harness/index.html`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
    if (throttle) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) }); }
    await page.evaluate(() => {
        const vm = window.__vm, R = vm.renderer;
        window.__prof = { tick: 0, n: 0, flush: 0, nf: 0, max: 0, t0: 0, f0: 0 };
        const t0 = vm.tick.bind(vm); vm.tick = (d) => { const a = performance.now(); t0(d); const b = performance.now() - a; const P = window.__prof; P.tick += b; P.n++; if (b > P.max) P.max = b; };
        const f0 = R.flush.bind(R); R.flush = () => { const a = performance.now(); f0(); const P = window.__prof; P.flush += performance.now() - a; P.nf++; };
        window.__handle.start();
    });
    for (const k of keys) await page.evaluate(([code, keyCode]) => document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, keyCode, which: keyCode, bubbles: true })), k);
    await page.waitForTimeout(Number(warm));
    await page.evaluate(() => { const P = window.__prof; Object.assign(P, { tick: 0, n: 0, flush: 0, nf: 0, max: 0, t0: performance.now(), f0: window.__vm.frame }); });
    await page.waitForTimeout(Number(ms));
    const res = await page.evaluate((names) => {
        const P = window.__prof, vm = window.__vm;
        const out = { fps: (vm.frame - P.f0) * 1000 / (performance.now() - P.t0), shown: P.nf * 1000 / (performance.now() - P.t0), tick: P.tick / P.n, max: P.max, flush: P.flush / Math.max(1, P.nf), vars: {}, errs: vm.errors.slice(0, 3),
            gl: (() => { try { const c = document.createElement('canvas').getContext('webgl'); const e = c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch (e) { return '?'; } })() };
        for (const n of names) { const v = vm.variables.find(v => v.name === n); out.vars[n] = v ? (v.isList ? v.array.length : v.value) : undefined; }
        return out;
    }, vars);
    if (shot) { const c = await page.$('canvas'); await c.screenshot({ path: shot }); }
    await browser.close();
    return { ...res, errors };
}
if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    const keys = (opt('keys', '') || '').split(',').filter(Boolean).map(s => { const [c, k] = s.split(':'); return [c, Number(k)]; });
    const r = await measure(args[0], { chrome: has('chrome'), gpu: has('gpu'), headed: has('headed'), ms: opt('ms', 6000), warm: opt('warm', 3000), throttle: opt('throttle', 0), shot: opt('shot', null), vars: (opt('vars', '') || '').split(',').filter(Boolean), keys });
    console.log(`ticks/s ${r.fps.toFixed(1)}  shown/s ${r.shown.toFixed(1)}  tick ${r.tick.toFixed(2)} ms (max ${r.max.toFixed(1)})  flush ${r.flush.toFixed(2)} ms  ${JSON.stringify(r.vars)}  gl: ${String(r.gl).slice(0, 60)}  errors ${JSON.stringify(r.errs)} ${JSON.stringify(r.errors.slice(0, 2))}`);
    process.exit(0);
}

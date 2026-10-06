// are the long frames garbage collections? An AI-driven time trial in tessvm
// (the `autoDrv` test build, see t9/ghostrun.mjs) with the JS heap sampled
// every frame: each long frame is printed with the heap before and after it.
// usage: node t9/gcprobe.mjs <auto.ent> [circuit] [secs] [ghost 0/1]   (tessvm harness on :3100; GPU=1)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2]);
const trk = +(process.argv[3] || 5);
const secs = +(process.argv[4] || 60);
const ghost = +(process.argv[5] || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: [...(process.env.GPU ? ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader']), '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.SCALE || 1) });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=alice`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => {
    const vm = window.__vm; const R = vm.renderer;
    const log = window.__log = [];
    let tick = 0, flush = 0, last = 0;
    const t0 = vm.tick.bind(vm); vm.tick = (d) => { const a = performance.now(); t0(d); tick += performance.now() - a; };
    const f0 = R.flush.bind(R); R.flush = () => { const a = performance.now(); f0(); flush += performance.now() - a; };
    const raf = (t) => {
        if (last) log.push([t - last, tick, flush, performance.memory.usedJSHeapSize / 1048576, performance.memory.totalJSHeapSize / 1048576]);
        tick = 0; flush = 0; last = t;
        requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    window.__handle.start();
});
const key = (t, k, c) => page.evaluate(([t, k, c]) => document.body.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: c, which: c, bubbles: true })), [t, k, c]);
const tap = async (k, c) => { await key('keydown', k, c); await sleep(90); await key('keyup', k, c); await sleep(140); };
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const setV = (n, v) => page.evaluate(([n, v]) => { const x = window.__vm.variables.find((x) => x.name === n && !x.isList); x.value = v; }, [n, v]);
await sleep(3000);
await setV('gMode', 3); await setV('ghSel', ghost ? 1 : 3); await setV('selTrk', trk); await setV('gfxSel', 3); await setV('gfx', 3); await setV('autoDrv', 1);
await tap('Enter', 13);
for (let i = 0; i < 100; i++) { if (+(await V('raceState')) === 3) break; await sleep(400); }
await page.evaluate(() => { window.__log.length = 0; });
if (process.env.POLL) { for (let i = 0; i < secs * 2; i++) { await V("raceState"); await sleep(500); } } else { await sleep(secs * 1000); }          // (POLL=1: the page is asked for a variable twice a second, as the other harnesses do)
const log = await page.evaluate(() => window.__log);
let t = 0, n = 0;
const heap = log.map((r) => r[3]);
console.log(`${path.basename(file)} circuit ${trk} ${secs} s, frames ${log.length}, heap ${Math.min(...heap).toFixed(0)}-${Math.max(...heap).toFixed(0)} MB (total ${log[log.length - 1][4].toFixed(0)} MB)`);
// how fast the heap grows between collections
let grow = 0, gt = 0;
for (let i = 1; i < log.length; i++) { const d = log[i][3] - log[i - 1][3]; if (d > 0) { grow += d; gt += log[i][0]; } }
console.log(`garbage: ${(grow / (gt / 1000)).toFixed(1)} MB/s (${(grow / log.length * 1024).toFixed(0)} KB a frame)`);
for (let i = 0; i < log.length; i++) {
    const r = log[i];
    t += r[0];
    if (r[0] > 40) { n++; console.log(`  t ${(t / 1000).toFixed(1)} s  frame ${r[0].toFixed(0)} ms (tick ${r[1].toFixed(0)}, flush ${r[2].toFixed(0)})  heap ${i ? log[i - 1][3].toFixed(0) : '?'} -> ${r[3].toFixed(0)} MB`); }
}
console.log(`frames over 40 ms: ${n}; errors ${errors.length ? errors.slice(0, 3) : 'none'}`);
await browser.close();

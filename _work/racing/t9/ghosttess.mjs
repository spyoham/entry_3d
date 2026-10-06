// the time-trial ghost's cost in tessvm, frame by frame: the player's car
// parked on the grid of a time trial and a ghost put d metres ahead of it
// (d 0: on top of the car, as when a lap matches the best one). Frame times
// are the page's own animation frames.
// usage: node t9/ghosttess.mjs [file.ent] [circuit] [gfxSel]   (tessvm harness on :3100; GPU=1 for a real GPU)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online330.ent');
const trk = +(process.argv[3] || 5);
const gfxSel = +(process.argv[4] || 3);
const SECS = +(process.env.SECS || 5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: process.env.GPU ? ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=alice`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => {
    const vm = window.__vm; const R = vm.renderer;
    window.__fr = []; window.__pf = { tick: 0, n: 0, flush: 0, nf: 0 };
    const t0 = vm.tick.bind(vm); vm.tick = (d) => { const a = performance.now(); t0(d); window.__pf.tick += performance.now() - a; window.__pf.n++; };
    const f0 = R.flush.bind(R); R.flush = () => { const a = performance.now(); f0(); window.__pf.flush += performance.now() - a; window.__pf.nf++; };
    let last = 0;
    const raf = (t) => { if (last) window.__fr.push(t - last); last = t; requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    window.__handle.start();
});
const key = (t, k, c) => page.evaluate(([t, k, c]) => document.body.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: c, which: c, bubbles: true })), [t, k, c]);
const tap = async (k, c) => { await key('keydown', k, c); await sleep(90); await key('keyup', k, c); await sleep(140); };
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const L = (n, i) => page.evaluate(([n, i]) => { const l = window.__vm.variables.find((x) => x.name === n && x.isList); return l.array[i - 1].data; }, [n, i]);
const setV = (n, v) => page.evaluate(([n, v]) => { const x = window.__vm.variables.find((x) => x.name === n && !x.isList); x.value = v; }, [n, v]);
const setL = (n, i, v) => page.evaluate(([n, i, v]) => { const l = window.__vm.variables.find((x) => x.name === n && x.isList); l.array[i - 1].data = v; }, [n, i, v]);
const fillL = (n, v, cnt) => page.evaluate(([n, v, cnt]) => { const l = window.__vm.variables.find((x) => x.name === n && x.isList); for (let i = 0; i < cnt; i++) l.array[i].data = v; }, [n, v, cnt]);
await sleep(3000);
await setV('gMode', 3); await setV('ghSel', 1); await setV('selTrk', trk); await setV('gfxSel', gfxSel); await setV('gfx', Math.min(3, gfxSel));
await tap('Enter', 13);
for (let i = 0; i < 100; i++) { if (+(await V('raceState')) === 3) break; await sleep(400); }
await sleep(1000);
if (process.env.CAM) await setV('camMode', +process.env.CAM);
await sleep(500);
const x = +(await L('caX', 1)), z = +(await L('caZ', 1)), yaw = +(await L('caYaw', 1));
console.log(`${path.basename(file)} circuit ${trk} gfx ${await V('gfx')} raceState ${await V('raceState')} ${process.env.GPU ? 'gpu' : 'swiftshader'}`);
// (TRACE=1: a Chrome trace of each phase as well - the whole animation frame
// on the page's main thread, and how busy the GPU process's main thread was)
const bs = process.env.TRACE ? await browser.newBrowserCDPSession() : null;
let tev = [];
if (bs) bs.on('Tracing.dataCollected', (d) => { for (const e of d.value) tev.push(e); });
const measure = async (label) => {
    await setL('caLap', 1, 1); await setL('caLapT', 1, +(await V('raceT')));
    await sleep(800);
    await page.evaluate(() => { window.__fr.length = 0; Object.assign(window.__pf, { tick: 0, n: 0, flush: 0, nf: 0 }); });
    if (bs) { tev = []; await bs.send('Tracing.start', { traceConfig: { includedCategories: ['toplevel', 'devtools.timeline', '__metadata'] }, transferMode: 'ReportEvents' }); }
    await sleep(SECS * 1000);
    let tr = '';
    if (bs) {
        const done = new Promise((r) => bs.once('Tracing.tracingComplete', r));
        await bs.send('Tracing.end'); await done;
        const nm = {};
        for (const e of tev) if (e.ph === 'M' && e.name === 'thread_name') nm[e.pid + '/' + e.tid] = e.args.name;
        let af = 0, afN = 0, gpu = 0, t0 = Infinity, t1 = 0;
        for (const e of tev) {
            if (e.ph !== 'X') continue;
            if (e.ts < t0) t0 = e.ts; if (e.ts > t1) t1 = e.ts;
            if (e.name === 'FireAnimationFrame') { af += e.dur; afN++; }
            if (nm[e.pid + '/' + e.tid] === 'CrGpuMain' && (e.name === 'ThreadControllerImpl::RunTask' || e.name === 'RunTask') && e.cat === 'toplevel') gpu += e.dur;
        }
        tr = `  frame script ${(af / afN / 1000).toFixed(2)} ms  gpu thread ${(gpu / (t1 - t0) * 100).toFixed(1)}% busy (${(gpu / afN / 1000).toFixed(2)} ms a frame)`;
    }
    const r = await page.evaluate(() => ({ fr: window.__fr.slice(), pf: { ...window.__pf } }));
    const a = r.fr.slice().sort((p, q) => p - q);
    const sum = a.reduce((s, v) => s + v, 0);
    const out = { fps: a.length * 1000 / sum, p50: a[a.length >> 1], p95: a[Math.floor(a.length * 0.95)], max: a[a.length - 1], tick: r.pf.tick / r.pf.n, flush: r.pf.flush / r.pf.nf, ghostOn: +(await V('ghostOn')) };
    console.log(`${label.padEnd(18)} fps ${out.fps.toFixed(1).padStart(5)}  frame p50 ${out.p50.toFixed(1)} p95 ${out.p95.toFixed(1)} max ${out.max.toFixed(1)} ms  tick ${out.tick.toFixed(2)} flush ${out.flush.toFixed(2)} ms  ghostOn ${out.ghostOn}${tr}`);
    return out;
};
await setV('ghN', 0);
const res = { off: await measure('no ghost') };
for (const d of (process.env.DS ? process.env.DS.split(",").map(Number) : [30, 10, 4, 1.5, 0, -6, -8, -9, -10, -12])) {
    const gx = x + d * Math.sin(yaw * Math.PI / 180), gz = z + d * Math.cos(yaw * Math.PI / 180);
    await fillL('ghX', gx, 600); await fillL('ghZ', gz, 600); await fillL('ghW', yaw, 600);
    await setV('ghN', 600); await setV('ghTime', 999);
    res[d] = await measure(`ghost ${d} m ahead`);
    if (process.env.SHOT) { const c = await page.$('canvas'); await c.screenshot({ path: path.resolve('ab', `${process.env.SHOT}_${d}.png`) }); }
}
await setV('ghN', 0);
res.off2 = await measure('no ghost again');
console.log('errors', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();

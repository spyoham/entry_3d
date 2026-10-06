// a whole time trial against the ghost in tessvm, frame by frame: the car is
// driven by the AI (a test build with `autoDrv`, see below), so lap 2 races
// the ghost of lap 1 and lap 3 the ghost of lap 2, a few metres apart at most.
// Every animation frame is logged with the tick's and the flush's share, the
// lap, and how far the ghost is; the frames that stand out are listed.
//   the test build: copy src/, in game.js add `let autoDrv = 0;` and call
//   `if (autoDrv > 0) { aiPlan(1); aiDrive(1); } else { playerInput(); }`,
//   then RSRC=<copy> node build.mjs <out.ent>
// usage: node t9/ghostrun.mjs <auto.ent> [circuit] [gfxSel] [laps] [camMode]   (tessvm harness on :3100; GPU=1, SCALE=2)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2]);
const trk = +(process.argv[3] || 5);
const gfxSel = +(process.argv[4] || 3);
const laps = +(process.argv[5] || 3);
const cam = +(process.argv[6] || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: process.env.GPU ? ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader'] });
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
    const vars = {}; const lists = {};
    const V = (n) => (vars[n] ||= vm.variables.find((v) => v.name === n && !v.isList)).value;
    const L = (n, i) => { const a = (lists[n] ||= vm.variables.find((v) => v.name === n && v.isList)).array; return a.length >= i ? +a[i - 1].data : 0; };
    const raf = (t) => {
        if (last) {
            let row = null;
            try { row = [t - last, tick, flush, L('caLap', 1), +V('raceT') - L('caLapT', 1), +V('ghostOn'), Math.hypot(L('caX', 9) - L('caX', 1), L('caZ', 9) - L('caZ', 1)), +V('raceState'), +V('pRecNow'), L('caTr', 9), +V('drawnQuads')]; } catch (e) { row = null; }
            if (row) log.push(row);
        }
        tick = 0; flush = 0; last = t;
        requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    window.__handle.start();
});
const key = (t, k, c) => page.evaluate(([t, k, c]) => document.body.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: c, which: c, bubbles: true })), [t, k, c]);
const tap = async (k, c) => { await key('keydown', k, c); await sleep(90); await key('keyup', k, c); await sleep(140); };
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const L = (n, i) => page.evaluate(([n, i]) => { const l = window.__vm.variables.find((x) => x.name === n && x.isList); return l.array[i - 1].data; }, [n, i]);
const setV = (n, v) => page.evaluate(([n, v]) => { const x = window.__vm.variables.find((x) => x.name === n && !x.isList); x.value = v; }, [n, v]);
await sleep(3000);
await setV('gMode', 3); await setV('ghSel', 1); await setV('selTrk', trk); await setV('gfxSel', gfxSel); await setV('gfx', Math.min(3, gfxSel)); await setV('autoDrv', 1);
await tap('Enter', 13);
for (let i = 0; i < 100; i++) { if (+(await V('raceState')) === 3) break; await sleep(400); }
if (cam) await setV('camMode', cam);
console.log(`${path.basename(file)} circuit ${trk} gfx ${await V('gfx')} cam ${await V('camMode')} ${process.env.GPU ? 'gpu' : 'swiftshader'} scale ${process.env.SCALE || 1}`);
let seen = 0;
for (let i = 0; i < 3000; i++) {
    const l = +(await L('caLap', 1));
    if (l > seen) { seen = l; console.log(`lap ${l}, last ${(+(await V('lastLap'))).toFixed(2)}, ghN ${await V('ghN')}, gfx ${await V('gfx')}`); if (process.env.SHOT) { await sleep(6000); const c = await page.$('canvas'); await c.screenshot({ path: path.resolve('ab', `${process.env.SHOT}_lap${l}.png`) }); } }
    if (l > laps) break;
    await sleep(500);
}
const log = await page.evaluate(() => window.__log);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(log));
const race = log.filter((r) => r[7] === 3 && r[3] >= 1);
const pc = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const stat = (label, a) => {
    if (!a.length) return;
    const fr = a.map((r) => r[0]);
    const sum = fr.reduce((s, v) => s + v, 0);
    console.log(`${label.padEnd(26)} ${String(a.length).padStart(6)} frames  fps ${(a.length * 1000 / sum).toFixed(1).padStart(5)}  frame p50 ${pc(fr, 0.5).toFixed(1)} p95 ${pc(fr, 0.95).toFixed(1)} p99 ${pc(fr, 0.99).toFixed(1)} max ${Math.max(...fr).toFixed(1)}  over 25 ms ${(100 * fr.filter((v) => v > 25).length / a.length).toFixed(1)}%  tick ${(a.reduce((s, r) => s + r[1], 0) / a.length).toFixed(2)} flush ${(a.reduce((s, r) => s + r[2], 0) / a.length).toFixed(2)} (max ${Math.max(...a.map((r) => r[2])).toFixed(1)})`);
};
stat('all', race);
for (let l = 1; l <= laps; l++) stat(`lap ${l}`, race.filter((r) => r[3] === l));
stat('ghost off', race.filter((r) => r[5] === 0));
for (const [lo, hi] of [[0, 3], [3, 8], [8, 14], [14, 30], [30, 80], [80, 1e9]]) stat(`ghost ${lo}-${hi === 1e9 ? '' : hi} m`, race.filter((r) => r[5] === 1 && r[6] >= lo && r[6] < hi));
console.log('worst frames:');
for (const r of race.slice().sort((x, y) => y[0] - x[0]).slice(0, 15)) console.log(`  ${r[0].toFixed(1)} ms (tick ${r[1].toFixed(1)}, flush ${r[2].toFixed(1)})  lap ${r[3]} at ${r[4].toFixed(1)} s  ghost ${r[5]} ${r[6].toFixed(1)} m tier ${r[9]}  quads ${r[10]}  saving ${r[8]}`);
console.log('errors', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();

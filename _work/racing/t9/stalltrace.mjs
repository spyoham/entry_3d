// what a long frame is made of: a Chrome trace of an AI-driven time trial in
// tessvm (the `autoDrv` test build, see t9/ghostrun.mjs); every event longer
// than 60 ms is printed, by process and thread.
// usage: node t9/stalltrace.mjs <auto.ent> [circuit] [secs]   (tessvm harness on :3100; GPU=1, SCALE=2)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2]);
const trk = +(process.argv[3] || 5);
const secs = +(process.argv[4] || 30);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: process.env.GPU ? ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.SCALE || 1) });
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=alice`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const key = (t, k, c) => page.evaluate(([t, k, c]) => document.body.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: c, which: c, bubbles: true })), [t, k, c]);
const tap = async (k, c) => { await key('keydown', k, c); await sleep(90); await key('keyup', k, c); await sleep(140); };
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const setV = (n, v) => page.evaluate(([n, v]) => { const x = window.__vm.variables.find((x) => x.name === n && !x.isList); x.value = v; }, [n, v]);
await sleep(3000);
await setV('gMode', 3); await setV('ghSel', 3); await setV('selTrk', trk); await setV('gfxSel', 3); await setV('gfx', 3); await setV('autoDrv', 1);
await tap('Enter', 13);
for (let i = 0; i < 100; i++) { if (+(await V('raceState')) === 3) break; await sleep(400); }
const bs = await browser.newBrowserCDPSession();
const events = [];
bs.on('Tracing.dataCollected', (d) => { for (const e of d.value) events.push(e); });
const done = new Promise((r) => bs.on('Tracing.tracingComplete', r));
await bs.send('Tracing.start', { traceConfig: { includedCategories: ['toplevel', 'v8', 'v8.gc', 'devtools.timeline', 'gpu', 'viz', 'cc', 'blink', 'disabled-by-default-v8.gc', 'disabled-by-default-devtools.timeline'] }, transferMode: 'ReportEvents' });
await sleep(secs * 1000);
await bs.send('Tracing.end');
await done;
const names = {};
for (const e of events) if (e.ph === 'M' && (e.name === 'process_name' || e.name === 'thread_name')) names[e.name === 'process_name' ? 'p' + e.pid : 't' + e.pid + '/' + e.tid] = e.args.name;
const long = events.filter((e) => e.ph === 'X' && e.dur > 60000).sort((a, b) => a.ts - b.ts);
let t0 = Infinity; for (const e of events) if (e.ts > 0 && e.ts < t0) t0 = e.ts;
console.log(`events ${events.length}, longer than 60 ms: ${long.length}`);
for (const e of long.slice(0, 80)) console.log(`  t ${((e.ts - t0) / 1e6).toFixed(2)} s  ${(e.dur / 1000).toFixed(0).padStart(4)} ms  ${(names['p' + e.pid] || e.pid)}/${names['t' + e.pid + '/' + e.tid] || e.tid}  ${e.cat}  ${e.name}  ${JSON.stringify(e.args || {}).slice(0, 160)}`);
await browser.close();

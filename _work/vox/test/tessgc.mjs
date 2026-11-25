// (v3.5, 11-26) the engine's heap clearings while playing: each long tick, and the collections of the trace by kind and length - a major one stops the game for as long as it takes to walk over everything alive (this world's 13 million cells).
// In the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100; a browser with the GPU on).
// usage: node test/tessgc.mjs [seconds 60] [stand|fly] [K=V ...]
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.includes('='));
const more = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => a.split('=')).map(([k, v]) => [k, Number(v)]));
const file = path.join(HERE, 'tessgc.ent');
buildProject(file, { name: 'tessgc', more: { AUTOSEED: 777, TESTRUN: 1, BENCH: 1, ...more } });
const secs = +(args[0] || 60), stand = args[1] !== 'fly';
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
await page.goto(`http://localhost:${PORT}/harness/index.html`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => { window.__handle.start(); });
await page.waitForTimeout(25000);
await page.evaluate((stand) => {
  const vm = window.__vm; const V = (n) => vm.variables.find((v) => v.name === n);
  V('helpT').setValue(0); V('lockAskT').setValue(0); V('$M_LOCK').setValue(1); V('keysLost').setValue(0);
  window.__long = []; const t0 = vm.tick.bind(vm);
  vm.tick = (d) => { const a = performance.now(); t0(d); const b = performance.now() - a; if (b > 50) window.__long.push([Math.round(a), Math.round(b)]); };
  if (!stand) { V('gameMode').setValue(1); V('flying').setValue(1); V('yaw').setValue(30); V('pitch').setValue(-10); V('py').setValue(90); vm.pressedKeys.add(87); vm.pressedKeys.add(82); }
}, stand);
const cdp = await page.context().newCDPSession(page);
const events = [];
cdp.on('Tracing.dataCollected', (e) => { for (const x of e.value) events.push(x); });
await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,disabled-by-default-v8.gc', transferMode: 'ReportEvents' });
const tStart = await page.evaluate(() => performance.now());
await page.waitForTimeout(secs * 1000);
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.end'); await done;
const long = await page.evaluate(() => window.__long);
const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0));
const gc = events.filter((e) => e.ph === 'X' && /GC|Scavenge|MarkCompact|Mark-Compact/i.test(e.name) && e.dur > 20000);
const byName = {};
for (const e of events) if (e.ph === 'X' && /GC|Scaveng|MarkCompact/i.test(e.name)) { const b = byName[e.name] = byName[e.name] || { n: 0, ms: 0, max: 0 }; b.n++; b.ms += e.dur / 1000; b.max = Math.max(b.max, e.dur / 1000); }
console.log('long ticks (at ms, ms):', JSON.stringify(long), 'heap MB', heap);
console.log('gc by kind:', Object.entries(byName).sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).map(([k, v]) => `${k} x${v.n} ${v.ms.toFixed(0)}ms max ${v.max.toFixed(0)}`).join(' | '));
console.log('gc events over 20 ms:', gc.sort((a, b) => b.dur - a.dur).slice(0, 12).map((e) => `${e.name} ${(e.dur / 1000).toFixed(0)}ms ${e.args && e.args.type ? e.args.type : ''} ${e.args && e.args.usedHeapSizeBefore ? Math.round(e.args.usedHeapSizeBefore / 1e6) + '->' + Math.round(e.args.usedHeapSizeAfter / 1e6) + 'MB' : ''}`).join(' | '));
await browser.close();

// (v3.5, 11-26) who makes the values the engine must throw away: the sampling heap profiler, everything counted, by the function that made it and by the game function it was made for (KB a tick).
// In the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100; a browser with the GPU on).
// usage: node test/tessalloc.mjs [seconds 20] [stand|fly] [K=V ...]
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
const secs = +(args[0] || 20), stand = args[1] !== 'fly';
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
  if (!stand) { V('gameMode').setValue(1); V('flying').setValue(1); V('yaw').setValue(30); V('pitch').setValue(-10); V('py').setValue(90); vm.pressedKeys.add(87); vm.pressedKeys.add(82); }
}, stand);
await page.waitForTimeout(3000);
const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');
const f0 = await page.evaluate(() => window.__vm.frame);
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await page.waitForTimeout(secs * 1000);
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const frames = (await page.evaluate(() => window.__vm.frame)) - f0;
const { src, names } = await page.evaluate(() => ({ src: window.__progSrc, names: window.__fnNames }));
const lines = src.split('\n'); const starts = [];
lines.forEach((l, i) => { const m = /^F\[(\d+)\] = /.exec(l); if (m) starts.push([i, Number(m[1])]); });
const self = new Map(), incl = new Map(); let total = 0;
const nameOf = (cf) => { if (!cf.url || cf.url.startsWith('VM')) { const L = cf.lineNumber - 2; let f = null; for (const [ln, idx] of starts) if (ln <= L) f = idx; if (f !== null) return 'F:' + names[f]; return 'eval:' + cf.functionName; } return cf.functionName + ' ' + cf.url.split('/').pop() + ':' + cf.lineNumber; };
const walk = (n, entryFn) => {
  const nm = nameOf(n.callFrame); const ef = nm.startsWith('F:') ? nm : entryFn;
  if (n.selfSize) { total += n.selfSize; self.set(nm, (self.get(nm) || 0) + n.selfSize); const key = (ef || '(none)') + ' <- ' + nm; incl.set(key, (incl.get(key) || 0) + n.selfSize); }
  for (const c of n.children || []) walk(c, ef);
};
walk(profile.head, null);
console.log('ticks', frames, 'allocated MB', (total / 1e6).toFixed(0), '=', (total / frames / 1e3).toFixed(0), 'KB a tick');
console.log('-- by allocating function');
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log((v / frames / 1e3).toFixed(1).padStart(8) + ' KB/tick  ' + k);
console.log('-- by game function <- allocating function');
for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log((v / frames / 1e3).toFixed(1).padStart(8) + ' KB/tick  ' + k);
await browser.close();

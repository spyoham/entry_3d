// (v3.5, 11-26) how fast the heap grows between its clearings while standing, at the views of 32, 8 and 48 blocks and looking at the sky (MB a second, KB a tick, the filled shapes of a frame): what outlives a frame is about 1 KB a shape.
// In the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100; a browser with the GPU on).
// usage: node test/tessheap.mjs [K=V ...]
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
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
await page.goto(`http://localhost:${PORT}/harness/index.html`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => { window.__handle.start(); });
await page.waitForTimeout(25000);
await page.evaluate(() => { const vm = window.__vm; const V = (n) => vm.variables.find((v) => v.name === n); V('helpT').setValue(0); V('lockAskT').setValue(0); V('$M_LOCK').setValue(1); V('keysLost').setValue(0); V('autoView').setValue(0); });
const slope = async (label, secs = 12) => {
  const s = [];
  for (let i = 0; i <= secs * 2; i++) { s.push(await page.evaluate(() => [performance.now(), performance.memory.usedJSHeapSize / 1e6, window.__vm.frame, window.__vm.variables.find((v) => v.name === 'nFill').value])); await page.waitForTimeout(500); }
  // the steepest steady rise: differences between samples, those that fell (a collection) left out
  const d = []; for (let i = 1; i < s.length; i++) { const dm = s[i][1] - s[i - 1][1], dt = (s[i][0] - s[i - 1][0]) / 1000, df = s[i][2] - s[i - 1][2]; if (dm > 0) d.push([dm / dt, dm / df * 1000]); }
  d.sort((a, b) => a[0] - b[0]); const m = d[d.length >> 1] || [0, 0];
  console.log(label.padEnd(26), 'heap', s[0][1].toFixed(0), '->', s[s.length - 1][1].toFixed(0), 'MB; rises', m[0].toFixed(0), 'MB/s =', m[1].toFixed(0), 'KB a tick; fills a frame', s[s.length - 1][3]);
};
const view = (r) => page.evaluate((r) => { const V = (n) => window.__vm.variables.find((v) => v.name === n); V('viewWant').setValue(r); V('viewR').setValue(r); V('viewR2').setValue(r * r); V('kMax').setValue(Math.floor(r * 1.45) + 258); V('meshVer').setValue(V('meshVer').value + 1); }, r);
await slope('standing, view 32');
await view(8); await page.waitForTimeout(1500); await slope('standing, view 8');
await view(48); await page.waitForTimeout(6000); await slope('standing, view 48');
await page.evaluate(() => { const V = (n) => window.__vm.variables.find((v) => v.name === n); V('pitch').setValue(-89); });
await page.waitForTimeout(1000); await slope('looking up at the sky');
await browser.close();

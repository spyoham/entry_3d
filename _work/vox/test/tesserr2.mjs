// what the REAL tessvm page shows when the work's code throws at different points of a frame: a list taken away
// (its array undefined) that is read in the logic before the picture (IID), in the picture (HD), or px no number.
// usage: node test/tesserr2.mjs IID|HD|NaN|...   -> test/tesserr2_<what>.png
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tesserr.ent');
const what = process.argv[2] || 'HD';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const said = [];
page.on('pageerror', (e) => said.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') said.push(m.type() + ': ' + m.text().slice(0, 300)); });
await page.goto('http://localhost:3100/harness/index.html?nick=err');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
for (let i = 0; i < 240 && +(await V('gState')) !== 2; i++) await sleep(250);
await sleep(5000);
const f0 = +(await V('frames'));
if (what === 'NaN') await page.evaluate(() => window.__vm.variables.find((v) => v.name === 'px' && !v.isList).setValue(NaN));
else await page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); l.array = undefined; }, what);
await sleep(3000);
const f1 = await Promise.race([V('frames'), sleep(5000).then(() => 'no answer')]);
console.log(what, ': frames before', f0, 'after', f1);
const c = await page.$('canvas'); await Promise.race([c.screenshot({ path: path.join(HERE, `tesserr2_${what}.png`) }), sleep(8000)]);
console.log(said.slice(0, 4).join('\n') || 'the page said nothing');
await Promise.race([browser.close(), sleep(5000)]);
process.exit(0);

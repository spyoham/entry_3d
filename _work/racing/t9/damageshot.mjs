// v3.2.0: damage in tessvm: a realistic grand prix (keys), then a flat front
// left and a damaged engine set on the player's car - screenshots
// usage: node t9/damageshot.mjs [file.ent]   (tessvm harness on :3100)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online320.ent');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=alice`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const key = (t, k, c) => page.evaluate(([t, k, c]) => document.body.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: c, which: c, bubbles: true })), [t, k, c]);
const tap = async (k, c, n = 1) => { for (let i = 0; i < n; i++) { await key('keydown', k, c); await sleep(90); await key('keyup', k, c); await sleep(140); } };
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const shot = async (name) => { const c = await page.$('canvas'); await c.screenshot({ path: path.resolve('ab', name) }); };
await sleep(3000);
const setV = (n, v) => page.evaluate(([n, v]) => { const x = window.__vm.variables.find((x) => x.name === n && !x.isList); x.value = v; }, [n, v]);
const setL = (n, i, v) => page.evaluate(([n, i, v]) => { const l = window.__vm.variables.find((x) => x.name === n && x.isList); l.array[i - 1].data = v; }, [n, i, v]);
// realistic, 1 lap, Silverstone-like long straight (circuit 4)
await setV('rules', 2); await setV('lapSel', 1); await setV('selTrk', 4);
await tap('Enter', 13);
for (let i = 0; i < 200; i++) {
    const st = +(await V('raceState'));
    if (st === 9) { await tap('Enter', 13); }            // end qualifying
    if (st === 10) { await tap('Enter', 13); }           // to the grid
    if (st === 14) { await tap('Enter', 13); }           // skip the formation lap
    if (st === 3) break;
    await sleep(400);
}
await key('keydown', 'KeyW', 87);
await sleep(5000);
await setL('caPunc', 1, 1); await setL('caDmgE', 1, 0.7); await setL('caDmgS', 1, 0.4); await setL('caDmgSd', 1, -1);
await sleep(2500);
await shot('damage_race.png');
await key('keyup', 'KeyW', 87);
console.log('raceState', await V('raceState'), 'errors', errors.length ? errors : 'none');
await browser.close();

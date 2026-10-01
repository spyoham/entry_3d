// v2.3.0: the daily challenge in tessvm, by keys: the menu card (row 3), then
// ENTER and a few seconds of driving (W) - screenshots and the date blocks
// usage: node t9/dailyshot.mjs [file.ent]   (tessvm harness on :3100)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online230.ent');
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
await tap('ArrowDown', 40, 2);
await sleep(800);
await shot('daily_card.png');
const d = new Date();
const want = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
console.log('menuSel', await V('menuSel'), 'dyN', await V('dyN'), 'want', want, 'month', await V('dyMon'), 'day', await V('dyDom'), 'trk', await V('dyTrk'), 'kind', await V('dyKind'));
await tap('Enter', 13);
for (let i = 0; i < 120 && +(await V('raceState')) !== 3; i++) await sleep(250);
await key('keydown', 'KeyW', 87);
await sleep(9000);
await shot('daily_race.png');
await key('keyup', 'KeyW', 87);
console.log('raceState', await V('raceState'), 'dyOn', await V('dyOn'), 'gMode', await V('gMode'), 'selTrk', await V('selTrk'), 'errors', errors.length ? errors : 'none');
await browser.close();

// v3.1.0: the highlights in tessvm, by keys: RACE START, 12 s of driving (W),
// then P and H (the highlights so far) - screenshots
// usage: node t9/replayshot.mjs [file.ent]   (tessvm harness on :3100)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online310.ent');
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
await tap('Enter', 13);
for (let i = 0; i < 160 && +(await V('raceState')) !== 3; i++) await sleep(250);
await key('keydown', 'KeyW', 87);
await sleep(12000);
await key('keyup', 'KeyW', 87);
await tap('KeyP', 80);
await sleep(500);
await shot('replay_pause.png');
await tap('KeyH', 72);
await sleep(2500);
await shot('replay_hl.png');
console.log('raceState', await V('raceState'), 'rpSrc', await V('rpSrc'), 'clips', await V('hcN'), 'rfN', await V('rfN'), 'errors', errors.length ? errors : 'none');
await tap('Enter', 13);
await sleep(500);
console.log('after ENTER raceState', await V('raceState'));
await browser.close();

// v2.2.0: a picture of the room settings page (CARS row) in tessvm, one player
// with the real Entry Sync page script and no server (connected, empty room)
// usage: node t9/netform.mjs [file.ent] [out.png]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online220.ent');
const out = path.resolve(process.argv[3] || 'ab/net_form.png');
const inject = fs.readFileSync(new URL('../../entrysync/inject.js', import.meta.url), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text());
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=alice`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.addScriptTag({ content: inject });
await sleep(500);
await page.evaluate(() => window.__handle.start());
await sleep(300);
await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*'));
await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: {} }, '*'));
const key = (t, k, c) => page.evaluate(([t, k, c]) => document.body.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: c, which: c, bubbles: true })), [t, k, c]);
const tap = async (k, c, n = 1) => { for (let i = 0; i < n; i++) { await key('keydown', k, c); await sleep(90); await key('keyup', k, c); await sleep(140); } };
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
await sleep(2500);
await tap('ArrowDown', 40); await tap('Enter', 13);              // ONLINE RACE
for (let i = 0; i < 40 && +(await V('netPg')) !== 1; i++) await sleep(250);
await tap('Enter', 13);                                          // CREATE A ROOM
await tap('ArrowDown', 40, 6); await tap('ArrowRight', 39, 4);   // CARS: SAME CAR, car type 3
await sleep(800);
await page.screenshot({ path: out });
console.log('netPg', await V('netPg'), 'netRow', await V('netRow'), 'nrCarR', await V('nrCarR'), 'errors', errors.length ? errors : 'none');
await browser.close();

// (v3.3, 11-20) a picture from the REAL tessvm page (node ../tessvm/tsrv.mjs, port 3100): the game menu of a world
// made without commands - the mode button dark, with its word. test/shot_menu.png
// usage: node test/tessmenu.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tessmenu.ent');
buildProject(file, { name: 'tessshot', more: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0, AUTOMODE: 1 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=shot`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const set = (n, x) => page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const t0 = Date.now(); while (+(await V('gState')) !== 2 && Date.now() - t0 < 60000) await sleep(250);
ok(+(await V('gState')) === 2, 'in the game');
await sleep(1500);
await set('cheatsOn', 0); await set('uiMode', 6); await sleep(800);
const c = await page.$('canvas');
// the mode button's middle: stage (-105, 1) of 480 x 270 on a 960 x 540 canvas
const box = await c.boundingBox();
await page.mouse.click(box.x + (240 - 105) * box.width / 480, box.y + (135 - 1) * box.height / 270);
await sleep(500);
ok(+(await V('gameMode')) === 1 && +(await V('uiMode')) === 6, 'the dark button clicked: the mode stays (' + (await V('gameMode')) + ')');
await page.mouse.move(box.x + 300, box.y + 500); await sleep(300);
await c.screenshot({ path: path.join(HERE, 'shot_menu.png') }); console.log('wrote shot_menu.png');
await set('cheatsOn', 1); await sleep(300);
await page.mouse.click(box.x + (240 - 105) * box.width / 480, box.y + (135 - 1) * box.height / 270);
await sleep(500);
ok(+(await V('gameMode')) === 2, 'with commands allowed the click changes the mode (' + (await V('gameMode')) + ')');
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
await browser.close();
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

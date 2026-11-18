// (v3.2) the map text in the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100):
// ../../example_map.txt pasted on the new-world screen (a paste event, as ctrl+v), a world made from it,
// its blocks, chests and villagers there; then "맵 데이터 복사": tessvm asks, the copy is on the clipboard.
// usage: node test/tessmap.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tessmap.ent');
buildProject(file, { name: 'tessmap', more: { TESTRUN: 1, ANIMALS: 0 } });
const text = fs.readFileSync(new URL('../../../example_map.txt', import.meta.url), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, permissions: ['clipboard-read', 'clipboard-write'] });
const errors = [];
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=mapper`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const Lst = (n) => page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l ? l.array.map((x) => x.data) : null; }, n);
const set = (n, x) => page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
const cmd = async (c, t) => { await set('tCmd', t); await set('testCmd', c); await sleep(250); };
const until = async (f, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const shot = async (name) => { const c = await page.$('canvas'); await c.screenshot({ path: path.join(HERE, name) }); console.log('wrote', name); };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
await sleep(6000);
ok(+(await V('gState')) === 0, 'on the title');
await set('testCmd', 20); await sleep(600);
ok(+(await V('scr')) === 2 && +(await V('mpOn')) === 0, 'the new-world screen, no map yet');
await shot('tessmap_new.png');
// the viewer pastes (ctrl+v): tessvm hands the text to the work
const t0 = Date.now();
await page.evaluate((t) => { const dt = new DataTransfer(); dt.setData('text/plain', t); window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, text);
ok(await until(async () => +(await V('mpOn')) === 1, 30000), `the pasted map is taken (${text.length} letters, ${await V('mpNE')} blocks, in ${Date.now() - t0} ms)`);
await sleep(500);
await shot('tessmap_pasted.png');
await set('tStage', 1); await cmd(10, '');
ok(await until(async () => +(await V('gState')) === 2, 120000), 'a world made from it');
ok(+(await V('seed')) === 11, `its seed is the map's (${await V('seed')})`);
await sleep(1500);
await cmd(8, '/gamemode creative'); await cmd(8, '/tp @s 24.5 62 30.5'); await sleep(6000);
const KEY = await Lst('ITKEY');
const blockAt = async (x, y, z) => { await set('tX', x); await set('tY', y); await set('tZ', z); await set('testCmd', 14); await sleep(200); return KEY[+(await V('tStage'))]; };
ok((await blockAt(20, 59, 20)) === 'furnace' && (await blockAt(20, 58, 20)) === 'hopper_east', `the furnace over its hopper is there (${await blockAt(20, 59, 20)}, ${await blockAt(20, 58, 20)})`);
ok((await blockAt(20, 58, 35)) === 'lectern' && (await blockAt(22, 58, 35)) === 'composter', 'the job blocks of the hall');
const vk = (await Lst('MKEY')).indexOf('villager') + 1;
ok(await until(async () => (await Lst('ET')).filter((t) => +t === vk).length >= 10, 20000), `the villagers are there (${(await Lst('ET')).filter((t) => +t === vk).length})`);
{ const ET = await Lst('ET'), EV = await Lst('EVAR'); const jobs = ET.map((t, i) => (+t === vk ? Math.floor(+EV[i] / 2) % 16 : -1)).filter((j) => j > 0); ok(jobs.length >= 8, `with their jobs (${jobs.join(',')})`); }
await set('helpT', 0);
await cmd(1, ''); await set('tX', 12.5); await set('tY', 80); await set('tZ', 12.5); await set('tYaw', 45); await set('tPitch', -28); await set('flying', 1); await set('testCmd', 1); await sleep(4000);
await shot('tessmap_world.png');
// the map copied: tessvm asks the viewer, the click writes the clipboard
// (the game asked for the pointer when the world began: that question is answered first, as a player has
// by the time the game menu is open - while it stands, tessvm does not ask about a copy)
await set('uiMode', 6); await set('$M_LOCK', 0); await sleep(500);
for (let k = 0; k < 3; k++) { if (await page.evaluate(() => { const d = document.querySelector('.tessvm-ask-permission'); return !!d && !d.hidden; })) { await page.click('.tessvm-ask-permission .tessvm-permit-deny'); await sleep(1200); } }
ok(!(await page.evaluate(() => { const d = document.querySelector('.tessvm-ask-permission'); return !!d && !d.hidden; })) && +(await V('uiMode')) === 6, 'the game menu is open, no question standing');
// (what the page writes to the clipboard is caught too: a headless browser may not keep it)
await page.evaluate(() => { window.__clip = ''; const c = navigator.clipboard, o = c.writeText.bind(c); c.writeText = (x) => { window.__clip = String(x); return o(x).catch(() => {}); }; document.addEventListener('copy', (e) => { const d = e.clipboardData && e.clipboardData.getData('text/plain'); if (d) window.__clip = d; }, true); });
await set('testCmd', 19);
ok(await until(async () => page.evaluate(() => { const d = document.querySelector('.tessvm-ask-permission'); return !!d && !d.hidden && !d.innerText.includes('마우스 잠금'); }), 15000), 'tessvm asks whether the work may copy');
const dialogText = await page.evaluate(() => document.querySelector('.tessvm-ask-permission').innerText.slice(0, 160).replace(/s+/g, ' '));
console.log('   tessvm asks:', dialogText);
await page.screenshot({ path: path.join(HERE, 'tessmap_ask.png') });
await page.click('.tessvm-ask-permission .tessvm-permit-allow');
await sleep(800);
const dialog = await page.evaluate(() => { const d = document.querySelector('.tessvm-ask-permission'); return d ? d.innerText.slice(0, 120).replace(/s+/g, ' ') : ''; });
console.log('   the dialog said:', dialog);
const clip = await page.evaluate(async () => window.__clip || (await navigator.clipboard.readText().catch(() => '')));
ok(clip.startsWith('BWMAP1|11|-|1|0|') && clip.split('|').length === 11 && clip.length > text.length * 0.9, `the clipboard holds the map (${clip.length} letters; the pasted one ${text.length})`);
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
await browser.close();
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

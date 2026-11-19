// (v3.3) pictures from the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100):
// what grows (stems and fruit, cocoa, the wart, the bush, vines, a cauldron of water), the inventory with the
// other hand and the charge bar, the brewing stand's screen. For the eye: test/shot33_*.png
// usage: node test/tessshot33.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tessshot33.ent');
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
const Lst = (n) => page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l ? l.array.map((x) => x.data) : null; }, n);
const set = (n, x) => page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
const cmd = async (c, t) => { await set('tCmd', t); await set('testCmd', c); await sleep(250); };
const until = async (f, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const shot = async (name) => { const c = await page.$('canvas'); await c.screenshot({ path: path.join(HERE, name) }); console.log('wrote', name); };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
ok(await until(async () => +(await V('gState')) === 2), 'in the game');
await sleep(1500);
const X = Math.floor(+(await V('px'))), Z = Math.floor(+(await V('pz'))), Y = 90;
const KEY = await Lst('ITKEY');
const blockAt = async (x, y, z) => { await set('tX', x); await set('tY', y); await set('tZ', z); await set('testCmd', 14); await sleep(200); return KEY[+(await V('tStage'))]; };
await cmd(8, `/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`);
await cmd(8, `/fill ${X - 12} ${Y} ${Z - 12} ${X + 12} ${Y + 8} ${Z + 12} air`);
await cmd(8, '/gamerule doMobSpawning false'); await cmd(8, '/gamerule randomTickSpeed 0'); await cmd(8, '/time set noon'); await cmd(8, '/weather clear');
// ---- 1. a garden, seen from the south: z + 4 is its row
const gz = Z + 4;
await cmd(8, `/fill ${X - 5} ${Y - 1} ${gz} ${X - 2} ${Y - 1} ${gz} farmland`);
await cmd(8, `/setblock ${X - 5} ${Y} ${gz} melon_stem_3`); await cmd(8, `/setblock ${X - 5} ${Y - 1} ${gz + 1} dirt`); await cmd(8, `/setblock ${X - 5} ${Y} ${gz + 1} melon`);
await cmd(8, `/setblock ${X - 4} ${Y} ${gz} melon_stem_1`);
await cmd(8, `/setblock ${X - 3} ${Y} ${gz} pumpkin_stem_3`); await cmd(8, `/setblock ${X - 3} ${Y - 1} ${gz + 1} dirt`); await cmd(8, `/setblock ${X - 3} ${Y} ${gz + 1} pumpkin`);
await cmd(8, `/setblock ${X - 2} ${Y} ${gz} pumpkin_stem`);
// cocoa on a trunk: the three sizes on the side that looks at the eye (north of the trunk is toward -z)
await cmd(8, `/fill ${X} ${Y} ${gz + 1} ${X} ${Y + 2} ${gz + 1} mahogany_log`);
const sides = ['cocoa_04', 'cocoa_14', 'cocoa_24'];
for (let k = 0; k < 3; k++) await cmd(8, `/setblock ${X} ${Y + k} ${gz} ${sides[k]}`);
const c0 = await blockAt(X, Y, gz);
// (the side whose pods hold: if 04 is not it, the other one along z)
if (!String(c0).startsWith('cocoa')) { const alt = ['cocoa_05', 'cocoa_15', 'cocoa_25']; for (let k = 0; k < 3; k++) await cmd(8, `/setblock ${X} ${Y + k} ${gz} ${alt[k]}`); }
await cmd(8, `/fill ${X + 2} ${Y - 1} ${gz} ${X + 5} ${Y - 1} ${gz} wail_sand`);
for (let k = 0; k < 4; k++) await cmd(8, `/setblock ${X + 2 + k} ${Y} ${gz} wail_wart_crop${k ? '_' + k : ''}`);
await cmd(8, `/fill ${X + 7} ${Y - 1} ${gz} ${X + 10} ${Y - 1} ${gz} grass_block`);
const bush = ['sweet_berry_bush_0', 'sweet_berry_bush_1', 'sweet_berry_bush_2', 'sweet_berry_bush'];
for (let k = 0; k < 4; k++) await cmd(8, `/setblock ${X + 7 + k} ${Y} ${gz} ${bush[k]}`);
await cmd(8, `/setblock ${X - 7} ${Y} ${gz} cauldron_w3`); await cmd(8, `/setblock ${X - 8} ${Y} ${gz} cauldron_w1`);
await cmd(8, `/fill ${X - 10} ${Y} ${gz + 1} ${X - 10} ${Y + 3} ${gz + 1} stone`); await cmd(8, `/fill ${X - 10} ${Y + 1} ${gz} ${X - 10} ${Y + 3} ${gz} vine`);
await cmd(8, `/setblock ${X + 1} ${Y} ${gz - 1} warden_egg`);
await sleep(600);
const got = [await blockAt(X - 5, Y, gz), await blockAt(X - 3, Y, gz), await blockAt(X, Y + 2, gz), await blockAt(X + 5, Y, gz), await blockAt(X + 7, Y, gz), await blockAt(X - 7, Y, gz), await blockAt(X - 10, Y + 2, gz), await blockAt(X + 1, Y, gz - 1)];
ok(got[0] === 'melon_stem_3' && got[1] === 'pumpkin_stem_3' && String(got[2]).startsWith('cocoa_2') && got[3] === 'wail_wart_crop_3' && got[4] === 'sweet_berry_bush_0' && got[5] === 'cauldron_w3' && got[6] === 'vine' && got[7] === 'warden_egg', 'the garden stands: ' + got.join(' '));
await set('gameMode', 1); await set('flying', 1);
for (const [nm, x, yaw] of [['a', X - 5, 0], ['b', X + 4, 0]]) {
  await set('tX', x + 0.5); await set('tY', Y + 1.2); await set('tZ', gz - 5.5); await set('tYaw', yaw); await set('tPitch', -12); await set('testCmd', 1);
  await sleep(900); await set('helpT', 0); await set('msgT', 0); await sleep(300);
  await shot('shot33_plants_' + nm + '.png');
}
// ---- 2. survival: the charge bar under the crosshair after a swing, the other hand's slot in the inventory
await cmd(8, '/gamemode survival'); await cmd(8, `/tp @s ${X}.5 ${Y} ${Z}.5`); await sleep(500);
await cmd(8, '/clear'); await cmd(8, '/give @s iron_axe 1'); await cmd(8, '/give @s shield 1'); await cmd(8, '/give @s golden_apple 3'); await cmd(8, '/give @s crossbow 1'); await cmd(8, '/give @s fishing_rod 1'); await cmd(8, '/give @s glass_bottle 3'); await cmd(8, '/give @s melon_seeds 8'); await cmd(8, '/give @s wail_wart 5');
await sleep(400);
const INVI = await Lst('INVI');
ok(INVI.filter((v) => +v > 0).length >= 8 && INVI.length >= 41, `the new things are in the inventory (${INVI.filter((v) => +v > 0).length} slots, ${INVI.length} long with the other hand's)`);
await set('testCmd', 22); await sleep(700);
ok(+(await V('uiMode')) === 1, 'the inventory is open');
await shot('shot33_inventory.png');
await set('uiMode', 0); await sleep(300);
// ---- 3. the brewing stand's screen
await cmd(8, `/setblock ${X + 2} ${Y} ${Z} brewing_stand`); await sleep(300);
await set('tX', X + 2); await set('tY', Y); await set('tZ', Z); await set('testCmd', 21); await sleep(800);
ok(+(await V('uiMode')) === 4, 'the brewing stand is open (the chest screen, 5 slots): uiMode ' + (await V('uiMode')) + ', slots ' + (await V('curCap')));
await shot('shot33_brewing.png');
await set('uiMode', 0); await sleep(300);
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
await browser.close();
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

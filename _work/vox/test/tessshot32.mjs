// (v3.2) pictures from the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100):
// the input box, a villager's trade screen, the warden. For the eye: test/shot32_*.png
// usage: node test/tessshot32.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tessshot32.ent');
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
await cmd(8, `/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`);
await cmd(8, `/tp @s ${X}.5 ${Y} ${Z}.5`); await cmd(8, '/gamerule doMobSpawning false'); await cmd(8, '/time set noon');
await sleep(800);
// (the first seconds' help text off the pictures)
await set('helpT', 0); await sleep(300);
// 1. the input box, with Korean and Latin in it
await cmd(17, '참나무 oak 12');
await sleep(600);
ok(+(await V('uiMode')) === 14, 'the input box is open (uiMode 14): ' + (await V('uiMode')));
await shot('shot32_inbox.png');
await page.keyboard.press('Escape'); await sleep(400);
if (+(await V('uiMode')) === 14) { await set('uiMode', 0); await set('ibOn', 0); await set('typing', 0); }
// 2. a villager with a lectern by it: its trades
await cmd(8, `/setblock ${X + 2} ${Y} ${Z + 3} lectern`);
await cmd(8, `/summon villager ${X + 2}.5 ${Y} ${Z + 2}.5`);
const vk = (await Lst('MKEY')).indexOf('villager') + 1;
let e = 0, prof = 0;
ok(await until(async () => { const ET = await Lst('ET'), EV = await Lst('EVAR'); e = ET.findIndex((t) => +t === vk) + 1; if (e > 0) { prof = Math.floor(+EV[e - 1] / 2) % 16; } return e > 0 && prof > 0; }, 40000), `the villager took a job (mob ${e}, profession ${prof})`);
await set('tStage', e); await set('testCmd', 18); await sleep(800);
ok(+(await V('uiMode')) === 10, 'its trade screen is open');
await shot('shot32_trade.png');
await set('uiMode', 0); await sleep(300);
// 3. the warden in the void, looked at from near by as it flies round
await set('tStage', 2); await set('tX', 0.5); await set('tZ', -47.5); await set('testCmd', 4);
await sleep(1500);
ok(await until(async () => +(await V('gState')) === 2 && +(await V('dim')) === 2, 90000), 'in the void');
await sleep(4000);
await set('helpT', 0); await set('msgT', 0);
let bx = 0, by = 0, bz = 0, be = 0;
for (let k = 0; k < 3; k++) {
  const ET = await Lst('ET'); be = ET.findIndex((t) => +t === 10) + 1;
  if (be > 0) {
    bx = +(await Lst('EX'))[be - 1]; by = +(await Lst('EY'))[be - 1]; bz = +(await Lst('EZ'))[be - 1];
    const yw = +(await Lst('EYAW'))[be - 1];
    // (a little ahead of it and to its side)
    const ox = Math.sin((yw + 55) * Math.PI / 180) * 11, oz = Math.cos((yw + 55) * Math.PI / 180) * 11;
    const px = bx + ox, pz = bz + oz, py = by + 1;
    await set('flying', 1); await set('gameMode', 1);
    await set('tX', px); await set('tY', py); await set('tZ', pz); await set('tYaw', Math.atan2(bx - px, bz - pz) * 180 / Math.PI); await set('tPitch', 0); await set('testCmd', 1);
    await sleep(120);
    await shot('shot32_warden' + k + '.png');
  }
  await sleep(700);
}
ok(be > 0, 'the warden is there (mob ' + be + ')');
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
await browser.close();
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

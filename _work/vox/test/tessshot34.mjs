// (v3.4) pictures of the new land from the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs,
// port 3100): the start, a mountain, a river, a shore - for the eye: test/shot34_*.png. And that the page runs
// without an error while the land is made. usage: node test/tessshot34.mjs [seed]
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tessshot34.ent');
const seed = +(process.argv[2] || 777);
buildProject(file, { name: 'tessshot', more: { AUTOSEED: seed, TESTRUN: 1, ANIMALS: 20, AUTOMODE: 1 } });
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
const cmd = async (c, t) => { await set('tCmd', t); await set('testCmd', c); await sleep(250); };
const until = async (f, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const shot = async (name) => { const c = await page.$('canvas'); await c.screenshot({ path: path.join(HERE, name) }); console.log('wrote', name); };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
ok(await until(async () => +(await V('gState')) === 2), 'in the game');
ok(+(await V('genVer')) === 2, `the world has the new land (genVer ${await V('genVer')}), the start (${await V('gsX')}, ${await V('gsZ')})`);
await cmd(8, '/gamerule doMobSpawning false'); await cmd(8, '/time set noon'); await cmd(8, '/weather clear');
await set('viewWant', 64); await set('autoView', 0);
const pose = async (x, y, z, yaw, pitch, wait = 9000) => { await set('flying', 1); await set('tX', x + 0.5); await set('tY', y); await set('tZ', z + 0.5); await set('tYaw', yaw); await set('tPitch', pitch); await set('testCmd', 1); await sleep(wait); };
const sx = +(await V('gsX')), sz = +(await V('gsZ'));
// the ground under a point, as the game finds it (a command block's way: /tp to it and read where one stands is slow - the land's own top)
const top = async (x, z) => { await page.evaluate(([x, z]) => { const vm = window.__vm; const g = (n) => vm.variables.find((v) => v.name === n && !v.isList); g('tX').setValue(x); g('tZ').setValue(z); }, [x, z]); return 0; };
// (to a place: dropped there to find the ground, then looked at from 7 blocks above it)
const look = async (name, x, z, yaw, pitch) => { await pose(x, 110, z, yaw, pitch, 9000); await set('flying', 0); await sleep(5000); const gy = +(await V('py')); await pose(x, gy + 7, z, yaw, pitch, 2500); await set('wthr', 0); await set('wthrT', 9999); await sleep(1500); await shot('shot34_' + name + '.png'); return gy; };
console.log('the start stands at', await look('start1', sx, sz, 30, -12));
await look('start2', sx, sz, 210, -12);
const PLACES = seed === 777 ? [['mountain', -90, 0, 60, -8], ['mountain2', -60, 20, 250, -14], ['river', 100, 262, 180, -16], ['shore', -240, 300, 250, -10], ['village', 163, -240, 0, -16]] : [];
for (const [name, x, z, yaw, pitch] of PLACES) { console.log(name, 'ground', await look(name, x, z, yaw, pitch)); }
const fr = +(await V('frames')); await sleep(3000); const fr2 = +(await V('frames'));
ok(fr2 > fr, `the game goes on (${Math.round((fr2 - fr) / 3)} frames a second while standing)`);
ok(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
await browser.close();
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

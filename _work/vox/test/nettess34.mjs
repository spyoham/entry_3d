// (v3.4) the example map pasted into a new server, in the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs,
// port 3100, with the real Entry Sync page script; this script is the room server as in nettess.mjs): the game goes on
// (no page error, the frames count up) while the kept mobs wake, and a second player sees them.
// usage: node test/nettess34.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const LAT = +(process.argv[2] || 80);
const file = path.join(HERE, 'nettess34.ent');
buildProject(file, { name: 'nettess', more: { TESTRUN: 1 } });
const inject = fs.readFileSync(new URL('../../entrysync/inject-latest.js', import.meta.url), 'utf8');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
async function player(nick) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errors.push(nick + ': ' + e.message));
  await page.goto(`http://localhost:${PORT}/harness/index.html?nick=${nick}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await page.evaluate(() => {
    window.__q = [];
    window.addEventListener('message', (e) => { const d = e.data; if (d && (d.type === 'ENTRY_SYNC_VAR_CHANGED' || d.type === 'ENTRY_SYNC_LIST_CHANGED')) window.__q.push(d); });
  });
  await page.addScriptTag({ content: inject });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__handle.start());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*'));
  await page.waitForTimeout(300);
  return { nick, page };
}
const room = { variables: {}, lists: {} };
const P = [];
let relayed = 0, stopRelay = false;
const welcome = (p) => p.page.evaluate((room) => window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: { syncData: room } }, '*'), room);
(async () => {
  while (!stopRelay) {
    for (const p of P) {
      const q = await p.page.evaluate(() => window.__q.splice(0)).catch(() => []);
      for (const d of q) {
        relayed++;
        if (d.type === 'ENTRY_SYNC_VAR_CHANGED') room.variables[d.name] = d.value; else room.lists[d.name] = d.array;
        for (const o of P) if (o !== p) setTimeout(() => {
          const m = d.type === 'ENTRY_SYNC_VAR_CHANGED' ? { type: 'ENTRY_SYNC_REMOTE_VAR_UPDATE', name: d.name, value: d.value } : { type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: d.name, array: d.array };
          o.page.evaluate((m) => window.postMessage(m, '*'), m).catch(() => {});
        }, LAT);
      }
    }
    await sleep(30);
  }
})();
const V = (p, n) => p.page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const Lst = (p, n) => p.page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l ? l.array.map((x) => x.data) : null; }, n);
const set = (p, n, x) => p.page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
const cmd = async (p, c, t) => { await set(p, 'tCmd', t); await set(p, 'testCmd', c); await sleep(200); };
const until = async (f, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const shot = async (p, name) => { const c = await p.page.$('canvas'); await c.screenshot({ path: path.join(HERE, name) }); };

const map = fs.readFileSync(process.env.MAP || new URL('../../../example_map.txt', import.meta.url), 'utf8');
const A = await player('alice'); P.push(A); await welcome(A);
await sleep(5000);
ok(+(await V(A, '?!')) === 1, "alice: Entry Sync's ?! flag is 1");
await set(A, '$CLIPBOARD', map);
await cmd(A, 24, '공장섭');
ok(await until(async () => +(await V(A, 'gState')) === 2, 90000), 'alice made 공장섭 from the example map and is in it');
const MKEY = await Lst(A, 'MKEY');
const count = async (p, name) => { const t = MKEY.indexOf(name) + 1; return ((await Lst(p, 'ET')) || []).filter((v) => +v === t).length; };
let last = +(await V(A, 'frames')), stuck = 0;
for (let i = 0; i < 20; i++) {
  await sleep(2000);
  const f = +(await V(A, 'frames'));
  if (f === last) stuck++;
  if (i % 3 === 0 || f === last) console.log('   t', (i + 1) * 2, 's frames', f, 'villagers', await count(A, 'villager'), 'record', ((await Lst(A, 'MKU')) || []).length, 'pos', Math.round(+(await V(A, 'px'))), Math.round(+(await V(A, 'py'))), Math.round(+(await V(A, 'pz'))), errors.slice(-1)[0] || '');
  last = f;
}
// from where one arrives: looked round, level and up, once the mobs near have woken (they are drawn from afar)
const p0 = [+(await V(A, 'px')), +(await V(A, 'py')), +(await V(A, 'pz'))];
for (const pitch of [0, 25, -20]) for (let yaw = 0; yaw < 360; yaw += 45) { await set(A, 'tX', p0[0]); await set(A, 'tY', p0[1]); await set(A, 'tZ', p0[2]); await set(A, 'tYaw', yaw); await set(A, 'tPitch', pitch); await set(A, 'testCmd', 1); await sleep(500); }
{ const f = +(await V(A, 'frames')); console.log('   looked round from the start: frames', f, errors.slice(-1)[0] || ''); if (f === last) stuck++; last = f; }
// round the works: each place looked at from four sides while its mobs wake
const pose = async (p, x, y, z, yaw, pitch) => { await set(p, 'flying', 1); await set(p, 'tX', x + 0.5); await set(p, 'tY', y); await set(p, 'tZ', z + 0.5); await set(p, 'tYaw', yaw); await set(p, 'tPitch', pitch); await set(p, 'testCmd', 1); };
for (const [name, x, y, z] of [['hall', 27, 60, 39], ['pens', 38, 60, 41], ['breeder', 23, 60, 47], ['egg farm', 26, 61, 23], ['iron farm', 60, 70, 26], ['tower', 52, 60, 38], ['east', 70, 60, 43], ['tower top', 52, 100, 45]]) {
  for (const yaw of [0, 90, 180, 270]) { await pose(A, x, y, z, yaw, -15); await sleep(1800); }
  const f = +(await V(A, 'frames'));
  console.log('   at the', name, 'frames', f, 'mobs', ((await Lst(A, 'ET')) || []).filter((v) => +v > 0).length, 'villagers', await count(A, 'villager'), errors.slice(-1)[0] || '');
  if (f === last) stuck++;
  last = f;
}
await shot(A, 'nettess34_alice.png');
ok(stuck === 0, 'the game went on for 40 s after joining (frames ' + last + ')');
ok((await count(A, 'villager')) >= 8, 'the villagers of the map are there: ' + (await count(A, 'villager')));
const B = await player('bob'); P.push(B); await welcome(B);
await sleep(5000);
await cmd(B, 12, '공장섭');
ok(await until(async () => +(await V(B, 'gState')) === 2, 90000), 'bob joined');
let lastB = +(await V(B, 'frames')), stuckB = 0;
for (let i = 0; i < 10; i++) { await sleep(2000); const f = +(await V(B, 'frames')), fa = +(await V(A, 'frames')); if (f === lastB || fa === last) stuckB++; lastB = f; last = fa; }
await shot(B, 'nettess34_bob.png');
ok(stuckB === 0, 'both games go on with two in the server');
ok((await count(B, 'villager')) >= 8 && (await count(A, 'villager')) <= 13, 'bob sees the villagers, alice has no more than before: ' + (await count(B, 'villager')) + ' / ' + (await count(A, 'villager')));
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
// (a script that threw is not a page error: tessvm keeps it in vm.errors and stops the work)
for (const p of P) { const ve = await p.page.evaluate(() => (window.__vm.errors || []).map((e) => e.message)); ok(ve.length === 0, p.nick + ': no script stopped on an error' + (ve.length ? ': ' + ve.slice(0, 2).join(' | ') : '')); }
stopRelay = true;
await browser.close();
console.log(fails ? 'FAILED ' + fails : 'all ok');
process.exit(fails ? 1 : 0);

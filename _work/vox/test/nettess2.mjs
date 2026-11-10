// Online play between two REAL tessvm players (the _work/tessvm harness: node ../tessvm/tsrv.mjs,
// port 3100), each with the real Entry Sync page script (_work/entrysync/inject-latest.js, from
// github good-bad-code/Entry-Sync). This script is the room server: what a page sends
// (ENTRY_SYNC_VAR_CHANGED / LIST_CHANGED) goes to the other page after LAT ms.
// usage: node test/nettess.mjs [latency ms]   (builds test/nettess.ent first)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const LAT = +(process.argv[2] || 80);
const file = path.join(HERE, 'nettess2.ent');
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

const reply = async (p, t) => { await cmd(p, 8, t); await sleep(300); const ch = (await Lst(p, 'CHT')) || []; return String(ch[ch.length - 1]); };
const A = await player('alice'); P.push(A); await welcome(A);
await sleep(5000);
await cmd(A, 11, '권한 서버');
ok(await until(async () => +(await V(A, 'gState')) === 2, 60000), 'alice made 권한 서버');
await sleep(2000);
let B = await player('bob'); P.push(B); await welcome(B);
await sleep(5000);
await cmd(B, 12, '권한 서버');
ok(await until(async () => +(await V(B, 'gState')) === 2, 60000), 'bob in');
await sleep(3000);
let r = await reply(B, '/time set day'); ok(r.includes('관리자만'), 'bob is not an op yet: ' + r);
r = await reply(A, '/op bob'); await sleep(3000);
r = await reply(B, '/time set day'); ok(!r.includes('관리자만'), 'bob made an op: ' + r);
r = await reply(A, '/time set day'); ok(!r.includes('관리자만'), 'alice (owner): ' + r);
await sleep(20000);
r = await reply(A, '/time set day'); ok(!r.includes('관리자만'), 'alice after 20 s: ' + r);
r = await reply(B, '/time set day'); ok(!r.includes('관리자만'), 'bob after 20 s: ' + r);
// bob leaves (the menu's leave), comes back
await cmd(B, 15, ''); await sleep(4000);
await cmd(B, 12, '권한 서버');
ok(await until(async () => +(await V(B, 'gState')) === 2, 60000), 'bob back (left by the menu)');
await sleep(4000);
r = await reply(B, '/time set day'); ok(!r.includes('관리자만'), 'bob after leaving by the menu: ' + r + ' MOP ' + JSON.stringify(await Lst(B, 'MOP')));
// bob closes the page; a new page
await B.page.close(); P.splice(P.indexOf(B), 1);
await sleep(12000);
B = await player('bob'); P.push(B); await welcome(B);
await sleep(5000);
await cmd(B, 12, '권한 서버');
ok(await until(async () => +(await V(B, 'gState')) === 2, 60000), 'bob back (a new page)');
await sleep(4000);
r = await reply(B, '/time set day'); ok(!r.includes('관리자만'), 'bob after a new page: ' + r + ' MOP ' + JSON.stringify(await Lst(B, 'MOP')));
// alice (owner, host) closes the page; a new page
await A.page.close(); P.splice(P.indexOf(A), 1);
await sleep(12000);
const A2 = await player('alice'); P.push(A2); await welcome(A2);
await sleep(5000);
await cmd(A2, 12, '권한 서버');
ok(await until(async () => +(await V(A2, 'gState')) === 2, 60000), 'alice back (a new page)');
await sleep(4000);
r = await reply(A2, '/time set day'); ok(!r.includes('관리자만'), 'alice (owner) after a new page: ' + r + ' owner ' + (await V(A2, 'shOwner')));
r = await reply(B, '/time set day'); ok(!r.includes('관리자만'), 'bob still: ' + r);
ok(errors.length === 0, `page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'} (${relayed} messages relayed)`);
stopRelay = true;
await sleep(300);
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all ok');

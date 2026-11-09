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
const file = path.join(HERE, 'nettess.ent');
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

const A = await player('alice'); P.push(A); await welcome(A);
await sleep(5000);
ok(+(await V(A, '?!')) === 1, "alice: Entry Sync's ?! flag is 1");
await cmd(A, 11, '실험 서버');
ok(await until(async () => +(await V(A, 'gState')) === 2, 60000), 'alice made 실험 서버 and is in it');
await sleep(2000);
ok((await Lst(A, '?!m1') || []).length >= 1 && String((await Lst(A, '?!m1'))[0]).startsWith('H^실험 서버^alice'), 'the server list ?!m1 holds it: ' + String((await Lst(A, '?!m1') || [])[0]).slice(0, 40));
const B = await player('bob'); P.push(B); await welcome(B);
await sleep(5000);
ok(+(await V(B, '?!')) === 1 && (await Lst(B, '?!m1') || []).length >= 1, 'bob got the room (the server list) on joining the room');
await cmd(B, 12, '실험 서버');
ok(await until(async () => +(await V(B, 'gState')) === 2, 60000), 'bob joined 실험 서버');
await sleep(3000);
const sa = +(await V(A, 'netMy')), sb = +(await V(B, 'netMy'));
ok((await Lst(A, 'NENT'))[sb - 1] > 0 && (await Lst(B, 'NENT'))[sa - 1] > 0, `each draws the other (slots ${sa}, ${sb})`);
// alice puts a block where bob can see it, and says hello
const ax = Math.floor(+(await V(A, 'px'))), ay = Math.floor(+(await V(A, 'py'))), az = Math.floor(+(await V(A, 'pz')));
await cmd(A, 8, `/setblock ${ax + 2} ${ay + 1} ${az} gold_block`);
await cmd(A, 13, '안녕하세요 bob');
await sleep(2500);
await set(B, 'tX', ax + 2); await set(B, 'tY', ay + 1); await set(B, 'tZ', az); await set(B, 'testCmd', 14); await sleep(300);
const gold = (await Lst(B, 'ITKEY')).indexOf('gold_block');
const chB = (await Lst(B, 'CHT')) || [];
ok(chB.some((t) => String(t).includes('<alice> 안녕하세요 bob')), "alice's chat reached bob");
ok(+(await V(B, 'tStage')) === gold, `alice's gold block is in bob's world (${await V(B, 'tStage')} = ${gold})`);
await sleep(2500);
const host = +(await V(A, 'netHost')) === 1 ? A : B;
ok(((await Lst(host, '?!e1')) || []).length >= 5, `the host (${host.nick}) keeps the block in ?!e1 (${((await Lst(host, '?!e1')) || []).length} items)`);
// a picture of bob from alice's side
await set(B, 'yaw', 180);
await set(A, 'yaw', +(await V(A, 'yaw')));
await shot(A, 'nettess_alice.png');
ok(errors.length === 0, `page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'} (${relayed} messages relayed)`);
stopRelay = true;
await sleep(300);
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all ok');

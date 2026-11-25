// (v3.5, 11-25) a server put back by 코딩재미있어's game alone, in the REAL tessvm page (the _work/tessvm harness: node ../tessvm/tsrv.mjs,
// port 3100, with the real Entry Sync page script; this script is the room server as in nettess35.mjs): alice's game holds a
// copy of her lost server and does not put it back; SUPER, with only the server list open, keeps a copy of a server it
// was never on and puts it back when the room is emptied.
// usage: node test/suptess35.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const LAT = +(process.argv[2] || 80);
const file = path.join(HERE, 'suptess35.ent');
buildProject(file, { name: 'suptess', more: { TESTRUN: 1 } });
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
  await page.goto(`http://localhost:${PORT}/harness/index.html?nick=${encodeURIComponent(nick)}`);
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

const SUPER = '코딩재미있어';
const live = () => Object.keys(room.lists).filter((n) => /^\?!(m|e)\d+$/.test(n) && room.lists[n].length > 1);
const wipe = async () => {
  for (const n of Object.keys(room.lists)) if (/^\?!(m|e)\d+$/.test(n)) {
    room.lists[n] = [];
    for (const o of P) await o.page.evaluate((m) => window.postMessage(m, '*'), { type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: n, array: [] }).catch(() => {});
  }
};
const has = async (p, name) => ((await Lst(p, '@서버백업')) || []).map(String).includes(name);
const store = async (p) => { const v = await V(p, '@확장프로그램'); if (+v !== 1) { console.log('   (' + p.nick + ": this harness page has no @ store, @확장프로그램 " + v + ' - set to 1: the copies stay in the page)'); await set(p, '@확장프로그램', 1); } };
const A = await player('alice'); P.push(A); await welcome(A);
await sleep(5000);
ok(+(await V(A, '?!')) === 1, "alice: Entry Sync's ?! flag is 1");
await store(A);
// ---- 1: alice alone, her server gone from the room: her game holds the copy and does not put it back
await cmd(A, 11, '첫째섭');
ok(await until(async () => +(await V(A, 'gState')) === 2, 90000), 'alice made a server and is in it');
ok(await until(async () => await has(A, '첫째섭'), 30000), "alice's game keeps a copy of it");
await cmd(A, 15, '');
await sleep(3000);
const before1 = live().map((n) => n + ' ' + room.lists[n].length);
await wipe();
await sleep(34000);
ok(before1.length >= 1 && live().length === 0 && String(await V(A, 'netMsg')).includes(SUPER + ' 님만') && await has(A, '첫째섭'), "the room emptied (" + before1 + "): alice's game does not put it back, keeps the copy and says: " + (await V(A, 'netMsg')));
// ---- 2: another server; SUPER has the server list open and nothing more
await cmd(A, 11, '둘째섭');
ok(await until(async () => +(await V(A, 'gState')) === 2, 90000), 'alice made another and is in it');
const S = await player(SUPER); P.push(S); await welcome(S);
await sleep(5000);
await store(S);
await cmd(S, 23, '없는 서버'); await cmd(S, 15, '');
// (as if this browser had kept something before: the game may write on its own - save.js svSeen)
await set(S, 'svSeen', 2);
ok(String(await V(S, 'netNick')) === SUPER && +(await V(S, 'gState')) === 0, "SUPER's page: the nickname is " + (await V(S, 'netNick')) + ', on the menu');
ok(await until(async () => await has(S, '둘째섭'), 60000), "SUPER's game kept a copy of the server it was never on: " + ((await Lst(S, '@서버백업')) || []).length + ' items');
await cmd(A, 15, '');
await sleep(14000);
const before2 = live().map((n) => n + ' ' + room.lists[n].length);
await wipe();
await sleep(1500);
const gone = live().length === 0;
ok(await until(async () => live().length >= before2.length, 40000), "the room emptied (" + gone + "), and SUPER's game puts it back: " + before2 + ' -> ' + live().map((n) => n + ' ' + room.lists[n].length) + ' - ' + (await V(S, 'netMsg')));
await sleep(3000);
ok(JSON.stringify(live().map((n) => n + ' ' + room.lists[n].length)) === JSON.stringify(before2), 'with as many settings lines and block numbers as before');
await cmd(A, 12, '둘째섭');
ok(await until(async () => +(await V(A, 'gState')) === 2, 90000), 'alice goes into it again');
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
// (a script that threw is not a page error: tessvm keeps it in vm.errors and stops the work)
for (const p of P) { const ve = await p.page.evaluate(() => (window.__vm.errors || []).map((e) => e.message)); ok(ve.length === 0, p.nick + ': no script stopped on an error' + (ve.length ? ': ' + ve.slice(0, 2).join(' | ') : '')); }
stopRelay = true;
await browser.close();
console.log(fails ? 'FAILED ' + fails : 'all ok');
process.exit(fails ? 1 : 0);

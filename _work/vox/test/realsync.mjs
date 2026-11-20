// (v3.3, 11-20) One REAL tessvm player (the _work/tessvm harness: node ../tessvm/tsrv.mjs, port 3100) with the real
// Entry Sync page script (_work/entrysync/inject-latest.js) and the REAL Entry Sync room server: this script
// does what the extension's content.js does (the web socket, GET_LATEST_DATA at a start, the lists and
// variables both ways). A room of its own (a made-up id), dummy servers; tessvm's @ lists kept here between
// the pages. What the player complained of: a short visit not kept, a deleted server back after a reload.
// usage: node test/realsync.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'realsync.ent');
buildProject(file, { name: 'realsync', more: { TESTRUN: 1 } });
const inject = fs.readFileSync(new URL('../../entrysync/inject-latest.js', import.meta.url), 'utf8');
const WSURL = 'wss://entry-sync.entry-sync.workers.dev/ws';
const room = process.env.ROOM || [...Array(24)].map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const log = (...a) => { if (process.env.LOG) console.log('   ', ((Date.now() - T0) / 1000).toFixed(1), ...a); };
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
let stored = {}, storeWrites = 0;
// the lists the WORK holds (a work saved in the editor while Entry Sync had put the room's servers in its lists)
let baked = null;
async function player(nick, tab) {
  const p = { nick, sent: 0, got: 0, ws: null, page: null, open: false };
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  p.page = page;
  page.on('pageerror', (e) => errors.push(nick + ': ' + e.message));
  const post = (m) => page.evaluate((m) => window.postMessage(m, '*'), m).catch(() => {});
  // (content.js: the socket opens with the page, before the work runs)
  p.ws = new WebSocket(`${WSURL}?room=${room}&tab=${tab}`);
  let cache = null, injected = false;
  p.ws.onopen = () => { p.open = true; if (injected) post({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }); };
  p.ws.onclose = (e) => { p.open = false; log(nick, 'socket closed', e.code, e.reason); };
  p.ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data); p.got++;
    if (m.type === 'INIT_ROOM_STATUS') { cache = m.data || {}; log(nick, 'INIT', JSON.stringify(Object.keys((cache.syncData || {}).lists || {})), 'first', m.isFirstEntry); if (injected) post({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: cache }); }
    if (m.type === 'FULL_SYNC_UPDATE') { cache = m.payload || {}; log(nick, 'FULL'); if (injected) post({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: m.payload }); }
    if (m.type === 'VAR_UPDATE') post({ type: 'ENTRY_SYNC_REMOTE_VAR_UPDATE', name: m.name, value: m.value });
    if (m.type === 'LIST_UPDATE') post({ type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: m.name, array: m.array });
  };
  await page.exposeFunction('__out', (d) => {
    if (!p.ws || p.ws.readyState !== 1) { log(nick, 'DROPPED (socket not open)', d.type, d.name || ''); return; }
    if (d.type === 'ENTRY_SYNC_ENGINE_RUN') p.ws.send(JSON.stringify({ type: 'GET_LATEST_DATA', roomId: room }));
    if (d.type === 'ENTRY_SYNC_VAR_CHANGED') { p.sent++; p.ws.send(JSON.stringify({ type: 'VAR_CHANGE', name: d.name, value: d.value })); }
    if (d.type === 'ENTRY_SYNC_LIST_CHANGED') { p.sent++; if (!/^\?!q/.test(d.name)) log(nick, 'list out', d.name, d.array.length); p.ws.send(JSON.stringify({ type: 'LIST_CHANGE', name: d.name, array: d.array })); }
    if (d.type === 'ENTRY_SYNC_ENGINE_STOP') p.ws.send(JSON.stringify({ type: 'SAVE_DATA_ONLY', roomId: room, payload: d.dataOnlySnapshot || null, syncData: d.syncDataSnapshot || null }));
  });
  await page.exposeFunction('__storeRead', () => stored);
  await page.exposeFunction('__storeWrite', (v) => { stored = v; storeWrites++; });
  if (baked) await page.route('**/ent/temp/project.json', async (route) => {
    const res = await route.fetch(); const work = await res.json();
    for (const v of work.variables) if (v.variableType === 'list' && baked[v.name]) v.array = baked[v.name].map((data) => ({ data }));
    await route.fulfill({ response: res, json: work });
  });
  await page.goto(`http://localhost:${PORT}/harness/index.html?nick=${nick}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await page.evaluate(async () => {
    const vm = window.__vm;
    vm.save.host = { read: () => window.__storeRead(), write: (v) => window.__storeWrite(JSON.parse(JSON.stringify(v))) };
    await vm.save.load();
    const T = ['ENTRY_SYNC_ENGINE_RUN', 'ENTRY_SYNC_ENGINE_STOP', 'ENTRY_SYNC_VAR_CHANGED', 'ENTRY_SYNC_LIST_CHANGED'];
    window.addEventListener('message', (e) => { const d = e.data; if (d && T.includes(d.type)) window.__out(d); });
  });
  await page.addScriptTag({ content: inject });
  injected = true;
  if (p.open) await post({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true });
  if (cache) await post({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: cache });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__handle.start());
  return p;
}
// a reload: content.js closes the socket in beforeunload, the page goes
const reload = async (p) => { try { p.ws.close(1000, 'Page unloaded'); } catch (e) {} await p.page.close(); };
const V = (p, n) => p.page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const Lst = (p, n) => p.page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l ? l.array.map((x) => x.data) : null; }, n);
const set = (p, n, x) => p.page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
const cmd = async (p, c, t) => { await set(p, 'tCmd', t); await set(p, 'testCmd', c); await sleep(200); };
// (BOBHOST=1: the slots are drawn so that bob, coming second, has the lower one and is the host while he is in)
const draw = (p, v) => p.page.evaluate((v) => { if (!window.__rnd) window.__rnd = Math.random; Math.random = v < 0 ? window.__rnd : () => v; }, v);
const BOBHOST = process.env.BOBHOST ? 1 : 0;
const until = async (f, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const names = async (p) => { const r = []; for (let k = 1; k <= 6; k++) { const l = await Lst(p, '?!m' + k); if (l && l.length && String(l[0]).startsWith('H^')) r.push(String(l[0]).split('^')[1]); } return r; };
const placeOf = async (p, name) => { for (let k = 1; k <= 6; k++) { const l = await Lst(p, '?!m' + k); if (l && l.length && String(l[0]).split('^')[1] === name) return k; } return 0; };
const blockAt = async (p, x, y, z) => { await set(p, 'tX', x); await set(p, 'tY', y); await set(p, 'tZ', z); await set(p, 'testCmd', 14); await sleep(250); return +(await V(p, 'tStage')); };
const SRV = '저장 시험';
console.log('room', room);

// ---- 1. a server made, a short visit: one block, some things, out by the menu, a reload at once
let A = await player('alice', 'tab_t1');
await sleep(6000);
ok(+(await V(A, '?!')) === 1, 'the line is up: ?! ' + (await V(A, '?!')));
if (BOBHOST) await draw(A, 0.99);
await cmd(A, 11, SRV);
await draw(A, -1);
ok(await until(async () => +(await V(A, 'gState')) === 2 && +(await V(A, 'netSt')) === 2, 90000), 'alice made the server and is in');
await sleep(1500);
const X = Math.floor(+(await V(A, 'px'))), Y = Math.floor(+(await V(A, 'py'))) + 3, Z = Math.floor(+(await V(A, 'pz')));
await cmd(A, 8, `/setblock ${X} ${Y} ${Z} gold_block`);
await cmd(A, 8, '/give @s diamond 7');
await sleep(1200);
const gold = await blockAt(A, X, Y, Z);
await cmd(A, 15, '');
await sleep(300);
const k1 = await placeOf(A, SRV);
const e1 = await Lst(A, '?!e' + k1), m1 = await Lst(A, '?!m' + k1);
log('at leaving: place', k1, 'record', e1 && e1.length, 'settings', m1 && m1.length);
await reload(A);
await sleep(1500);
A = await player('alice', 'tab_t1');
await sleep(7000);
let nm = await names(A);
ok(nm.includes(SRV), 'after the reload the server is in the list: ' + JSON.stringify(nm));
let k = await placeOf(A, SRV);
let e = (await Lst(A, '?!e' + k)) || [], m = (await Lst(A, '?!m' + k)) || [];
ok(e.length === (e1 || []).length && e.length >= 5, `the block record came back whole: ${e.length} of ${(e1 || []).length}`);
ok(m.some((s) => String(s).startsWith('U^alice^')), 'alice\'s things are in the settings: ' + m.length + ' lines');
await cmd(A, 12, SRV);
ok(await until(async () => +(await V(A, 'gState')) === 2 && +(await V(A, 'netSt')) === 2, 90000), 'alice in again');
await sleep(2500);
ok((await blockAt(A, X, Y, Z)) === gold && gold > 0, 'the block of the short visit is there');
let inv = (await Lst(A, 'INVI')) || [];
const KEY = await Lst(A, 'ITKEY');
ok(inv.some((v) => KEY[+v] === 'diamond'), 'the diamonds of the short visit are there');

// ---- 2. a short visit ended by a reload (no menu): a block 1.2 s before, things 1.2 s before
await cmd(A, 8, `/setblock ${X} ${Y + 1} ${Z} diamond_block`);
await cmd(A, 8, '/give @s iron_ingot 3');
await sleep(1200);
const dia = await blockAt(A, X, Y + 1, Z);
await reload(A);
await sleep(1500);
A = await player('alice', 'tab_t1');
await sleep(7000);
await cmd(A, 12, SRV);
ok(await until(async () => +(await V(A, 'gState')) === 2 && +(await V(A, 'netSt')) === 2, 90000), 'alice in after a reload in the game');
await sleep(2500);
ok((await blockAt(A, X, Y + 1, Z)) === dia && dia > 0, 'the block put 1.2 s before the reload is there');
inv = (await Lst(A, 'INVI')) || [];
ok(inv.some((v) => KEY[+v] === 'iron_ingot'), 'the iron_ingots got 1.2 s before the reload are there');

// ---- 2b. a second player comes for a moment: a block and some things, out by the menu 1.5 s later, the page closed
let B = await player('bob', 'tab_t2');
await sleep(7000);
if (BOBHOST) await draw(B, 0.01);
await cmd(B, 12, SRV);
await draw(B, -1);
ok(await until(async () => +(await V(B, 'gState')) === 2 && +(await V(B, 'netSt')) === 2, 90000), 'bob in');
await sleep(2000);
await cmd(A, 8, '/op bob');
await sleep(2500);
console.log('   host: ' + (+(await V(A, 'netHost')) === 1 ? 'alice' : +(await V(B, 'netHost')) === 1 ? 'bob' : 'nobody') + ' (slots ' + (await V(A, 'netMy')) + ' ' + (await V(B, 'netMy')) + ')');
await cmd(B, 8, `/setblock ${X + 1} ${Y} ${Z} iron_block`);
await cmd(B, 8, '/give @s gold_ingot 4');
await sleep(1500);
const iron = await blockAt(B, X + 1, Y, Z);
await cmd(B, 15, '');
await sleep(300);
await reload(B);
await sleep(4000);
ok((await blockAt(A, X + 1, Y, Z)) === iron && iron > 0, "bob's block is on alice's screen");
k = await placeOf(A, SRV);
m = (await Lst(A, '?!m' + k)) || [];
const ub = m.find((s) => String(s).startsWith('U^bob^')) || '';
const GOLD = KEY.indexOf('gold_ingot');
ok(String(ub).split('^')[15].split(',').some((t) => +t.split('.')[1] === GOLD), "bob's things of the short visit are in the server's settings: " + String(ub).slice(0, 120));
e = (await Lst(A, '?!e' + k)) || [];
let inRec = false; for (let i = 0; i + 4 < e.length; i += 5) if (+e[i] === X + 1 && +e[i + 1] === Y && +e[i + 2] === Z && +e[i + 3] === iron) inRec = true;
ok(inRec, "bob's block is in the server's record (" + e.length + ')');
B = await player('bob', 'tab_t2');
await sleep(7000);
await cmd(B, 12, SRV);
ok(await until(async () => +(await V(B, 'gState')) === 2 && +(await V(B, 'netSt')) === 2, 90000), 'bob in again');
await sleep(2500);
inv = (await Lst(B, 'INVI')) || [];
ok(inv.some((v) => +v === GOLD) && (await blockAt(B, X + 1, Y, Z)) === iron, 'bob has his gold and sees his block');
await cmd(B, 15, '');
await sleep(1000);
await reload(B);
await sleep(9000);
// ---- 3. out, the server deleted, a reload at once; and half a minute on the title (the copies' check)
// (from here the work's file has the server in its lists, as the room has it now)
await cmd(A, 15, '');
await sleep(1500);
{ const kb = await placeOf(A, SRV); baked = { ['?!m' + kb]: await Lst(A, '?!m' + kb), ['?!e' + kb]: await Lst(A, '?!e' + kb) }; log('baked', kb, baked['?!m' + kb].length, baked['?!e' + kb].length); }
await reload(A);
await sleep(1500);
A = await player('alice', 'tab_t1');
await sleep(7000);
nm = await names(A);
ok(nm.includes(SRV), 'a work saved with the server in its lists: the server is there: ' + JSON.stringify(nm));
await cmd(A, 23, SRV);
await sleep(300);
nm = await names(A);
ok(!nm.includes(SRV), 'deleted: gone from the list at once: ' + JSON.stringify(nm));
await reload(A);
await sleep(1500);
A = await player('alice', 'tab_t1');
await sleep(7000);
await set(A, 'testCmd', 0);
// (the multiplayer screen, as the player would look at it)
await A.page.evaluate(() => { const v = window.__vm.variables; const f = (n) => v.find((x) => x.name === n && !x.isList); if (f('netOn')) f('netOn').setValue(1); });
nm = await names(A);
ok(!nm.includes(SRV), 'after the reload it is still gone: ' + JSON.stringify(nm));
await sleep(35000);
nm = await names(A);
ok(!nm.includes(SRV), '35 s later (the copies checked) it is still gone: ' + JSON.stringify(nm));
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
// (the room left empty)
for (let q = 1; q <= 6; q++) { A.ws.send(JSON.stringify({ type: 'LIST_CHANGE', name: '?!m' + q, array: [] })); A.ws.send(JSON.stringify({ type: 'LIST_CHANGE', name: '?!e' + q, array: [] })); }
await sleep(500);
await reload(A);
await browser.close();
console.log(fails ? fails + ' FAILED' : 'all ok', '(store writes ' + storeWrites + ')');
process.exit(fails ? 1 : 0);

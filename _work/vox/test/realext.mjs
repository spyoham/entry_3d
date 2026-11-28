// (v3.5, 11-28) The servers with the INSTALLED Entry Sync as it is: its own content.js and inject.js run in the page
// (chrome.* stubbed), so the socket is opened, asked and closed by the extension's own code - on a play page it
// opens when the game starts and closes in beforeunload - against the REAL room server, a room of its own (a
// made-up id; nothing of the page goes to playentry.org). A reload is a real one (the same tab, the same tab id).
// test/realsync.mjs does the extension's part itself, as 1.0.1 did it (a socket from the page's load on); this one
// was written when the user said: "서버 삭제하고 그자리에 새로운 서버를 넣고, 새로고침하면 서버가 안바뀌어 있음".
//   node ../tessvm/tsrv.mjs &   node test/realext.mjs        EXT=<the extension's folder> (default: the one installed)
//   BOB=1: a second player sits in the multiplayer list the whole time (the room is never empty)
//   PEEK=1: at each step, what the room gives a newcomer (a plain socket of the test's own) and what the page's socket sent
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
let EXT = process.env.EXT;
if (!EXT) {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Default/Extensions/ppkhmgmenfkjiajhfjpoepaldalhicll');
  if (fs.existsSync(base)) { const v = fs.readdirSync(base).sort().pop(); if (v) EXT = path.join(base, v); }
}
if (!EXT || !fs.existsSync(path.join(EXT, 'content.js'))) { console.log('Entry Sync is not installed here (EXT=<its folder>): left out'); process.exit(0); }
const contentJs = fs.readFileSync(path.join(EXT, 'content.js'), 'utf8'), injectJs = fs.readFileSync(path.join(EXT, 'inject.js'), 'utf8');
console.log('Entry Sync', JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version);
const file = path.join(HERE, 'realsync.ent');
buildProject(file, { name: 'realsync', more: { TESTRUN: 1 } });
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
// the lists the WORK holds (a work saved in the editor while Entry Sync had the room's servers in its lists)
let baked = null;
const stores = {};
// what the extension's scripts find of chrome.* (an isolated world there; the page's here)
const STUB = () => {
  const out = [];
  window.__sock = { sent: out, opened: 0, closed: 0 };
  const WS = window.WebSocket;
  window.WebSocket = function (u) {
    const w = new WS(u); window.__sock.opened++; window.__ws = w;
    const send = w.send.bind(w);
    w.send = (d) => { try { const m = JSON.parse(d); out.push(m.type + (m.name ? ' ' + m.name : '') + ' ' + String(d).length); if (out.length > 4000) out.splice(0, 2000); } catch (e) {} return send(d); };
    w.addEventListener('close', () => { window.__sock.closed++; });
    w.addEventListener('message', (ev) => { try { const m = JSON.parse(ev.data); if (m.type === 'INIT_ROOM_STATUS' || m.type === 'FULL_SYNC_UPDATE') { const d = m.data || m.payload || {}; window.__sock.init = { at: Date.now(), n: Object.keys((d.syncData || {}).lists || {}).length, bytes: String(ev.data).length }; } } catch (e) {} });
    return w;
  };
  window.WebSocket.OPEN = WS.OPEN; window.WebSocket.CONNECTING = WS.CONNECTING; window.WebSocket.CLOSED = WS.CLOSED; window.WebSocket.CLOSING = WS.CLOSING;
  window.chrome = {
    storage: { local: { get: (k, cb) => setTimeout(() => cb({}), 0), set: () => {} }, onChanged: { addListener: () => {} } },
    runtime: { getURL: (f) => '/__ext/' + f, sendMessage: () => Promise.resolve(), onMessage: { addListener: () => {} } },
  };
};
async function setup(p) {
  const page = p.page;
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await page.evaluate(async () => {
    const vm = window.__vm;
    vm.save.host = { read: () => window.__storeRead(), write: (v) => window.__storeWrite(JSON.parse(JSON.stringify(v))) };
    await vm.save.load();
  });
  // (content.js runs at document_end and puts inject.js into the page itself)
  await page.addScriptTag({ content: contentJs });
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__handle.start());
}
async function player(nick) {
  const p = { nick, page: null };
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  p.page = page;
  page.on('pageerror', (e) => errors.push(nick + ': ' + e.message));
  await page.addInitScript(STUB);
  await page.route('**/__ext/inject.js', (r) => r.fulfill({ contentType: 'text/javascript', body: injectJs }));
  await page.route(/playentry\.org/, (r) => r.abort());
  stores[nick] = stores[nick] || {};
  await page.exposeFunction('__storeRead', () => stores[nick]);
  await page.exposeFunction('__storeWrite', (v) => { stores[nick] = v; });
  await page.route('**/ent/temp/project.json', async (route) => {
    if (!baked) return route.continue();
    const res = await route.fetch(); const work = await res.json();
    for (const v of work.variables) if (v.variableType === 'list' && baked[v.name]) v.array = baked[v.name].map((data) => ({ data }));
    await route.fulfill({ response: res, json: work });
  });
  await page.goto(`http://localhost:${PORT}/harness/index.html?nick=${nick}&project=${room}`);
  await setup(p);
  return p;
}
// F5: the same tab; the extension's own beforeunload closes its socket
const reload = async (p) => { await p.page.reload(); await setup(p); };
const V = (p, n) => p.page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const Lst = (p, n) => p.page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l ? l.array.map((x) => x.data) : null; }, n);
const set = (p, n, x) => p.page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
const cmd = async (p, c, t) => { await set(p, 'tCmd', t); await set(p, 'testCmd', c); await sleep(200); };
const until = async (f, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const NP = 8;
const names = async (p) => { const r = []; for (let k = 1; k <= NP; k++) { const l = await Lst(p, '?!m' + k); if (l && l.length && String(l[0]).startsWith('H^')) r.push(k + ':' + String(l[0]).split('^')[1]); } return r; };
const placeOf = async (p, name) => { for (let k = 1; k <= NP; k++) { const l = await Lst(p, '?!m' + k); if (l && l.length && String(l[0]).split('^')[1] === name) return k; } return 0; };
const sock = (p) => p.page.evaluate(() => ({ opened: window.__sock.opened, closed: window.__sock.closed, state: window.__ws ? window.__ws.readyState : -1, init: window.__sock.init || null, last: window.__sock.sent.filter((s) => !/\?!n\d|\?!q/.test(s)).slice(-12) }));
const up = async (p, why) => { const good = await until(async () => +(await V(p, '?!')) === 1, 20000); const s = await sock(p); ok(good, `${why}: the line is up (sockets opened ${s.opened}, the room gave ${s.init ? s.init.n + ' lists, ' + s.init.bytes + ' letters' : 'nothing yet'})`); await sleep(1500); };
const inGame = (p) => until(async () => +(await V(p, 'gState')) === 2 && +(await V(p, 'netSt')) === 2, 90000);
// the multiplayer list, as the player looks at it (a slot taken, its line written every second)
const listScreen = async (p) => { await cmd(p, 12, '없는 서버'); await sleep(1500); };
console.log('room', room);
// (PEEK=1) what the room gives a newcomer now: its servers' names by place, the ids named deleted, how many variables
const peek = async (why) => {
  if (!process.env.PEEK) return;
  const ws = new WebSocket(`wss://entry-sync.entry-sync.workers.dev/ws?room=${room}&tab=peek_${Date.now()}`);
  let init = null; ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.type === 'INIT_ROOM_STATUS' && !init) init = m; };
  await new Promise((res) => { ws.onopen = res; ws.onerror = res; });
  for (let i = 0; i < 100 && !init; i++) await sleep(50);
  const d = ((init && init.data) || {}).syncData || {}; const l = d.lists || {};
  const sv = Object.keys(l).filter((k) => /^\?!m\d+$/.test(k)).map((k) => k.slice(3) + ':' + String(l[k][0]).split('^').slice(0, 2).join('^')).join(' ');
  console.log(`     [peek] ${why}: servers ${sv || '-'} | gone ${JSON.stringify(l['?!gone'] || [])} | variables ${Object.keys(d.variables || {}).join(',')} | first entry ${init && init.isFirstEntry}`);
  ws.close(); await sleep(300);
};
const kinds = async (p) => { const s = await p.page.evaluate(() => { const c = {}; for (const x of window.__sock.sent) { const k = x.split(' ')[0]; c[k] = (c[k] || 0) + 1; } return { c, state: window.__ws ? window.__ws.readyState : -1, opened: window.__sock.opened, closed: window.__sock.closed, url: window.__ws ? window.__ws.url.replace(/room=[0-9a-f]+/, 'room=…') : '' }; }); return JSON.stringify(s); };

let B = null;
if (process.env.BOB) { B = await player('bob'); await up(B, 'bob'); await listScreen(B); }
let A = await player('alice');
await up(A, 'alice');
// ---- 1. a server made and played on, left by the menu, a reload
await cmd(A, 11, '옛 서버');
ok(await inGame(A), 'alice made 옛 서버 and is in');
await sleep(1500);
const X = Math.floor(+(await V(A, 'px'))), Y = Math.floor(+(await V(A, 'py'))) + 3, Z = Math.floor(+(await V(A, 'pz')));
await cmd(A, 8, `/setblock ${X} ${Y} ${Z} gold_block`);
await sleep(1500);
await cmd(A, 15, ''); await sleep(1500);
const k0 = await placeOf(A, '옛 서버');
await reload(A); await up(A, 'after a reload');
ok((await placeOf(A, '옛 서버')) === k0 && k0 > 0, `1. the server is where it was after the reload: ${JSON.stringify(await names(A))}`);
// (from here the work's own lists hold the server as it is now - a work saved in the editor with them in)
if (!process.env.NOBAKE) { baked = {}; for (const n of ['?!m' + k0, '?!e' + k0]) baked[n] = await Lst(A, n); }
// ---- 2. what the user did: the server deleted, a new one made in its place, a reload - at once, and after a while
for (const [wait, nameNew] of [[400, '새 서버 하나'], [3000, '새 서버 둘'], [12000, '새 서버 셋']]) {
  const before = await names(A);
  const old = before.find((s) => s.startsWith(k0 + ':')).slice(String(k0).length + 1);
  await listScreen(A);
  await cmd(A, 23, old); await sleep(600);
  ok((await placeOf(A, old)) === 0, `2. '${old}' deleted: ${JSON.stringify(await names(A))}`);
  // (made from the menu: the list screen stays)
  await A.page.evaluate(([n]) => { const v = window.__vm.variables; const f = (x) => v.find((y) => y.name === x && !y.isList); f('tCmd').setValue(n); f('testCmd').setValue(31); }, [nameNew]);
  await sleep(600);
  const kn = await placeOf(A, nameNew);
  ok(kn === k0, `   '${nameNew}' made in its place (${kn}, was ${k0}): ${JSON.stringify(await names(A))}`);
  await sleep(wait);
  const s0 = await sock(A); log('sent last:', s0.last.join(' | '));
  if (process.env.PEEK) console.log('     the socket of the page: ' + (await kinds(A)));
  await peek('before the reload');
  await reload(A); await up(A, `   a reload ${wait / 1000} s later`);
  await peek('after the reload');
  const nm = await names(A);
  ok((await placeOf(A, nameNew)) === k0 && (await placeOf(A, old)) === 0, `   after the reload the NEW server is there and the old one is not: ${JSON.stringify(nm)}`);
  if (B) { const nb = await names(B); ok(nb.some((s) => s === k0 + ':' + nameNew) && !nb.some((s) => s.endsWith(':' + old)), `   and on bob's screen: ${JSON.stringify(nb)}`); }
  await sleep(26000);
  const nm2 = await names(A);
  ok((await placeOf(A, nameNew)) === k0 && (await placeOf(A, old)) === 0, `   half a minute on (the copies checked) still: ${JSON.stringify(nm2)} ${String(await V(A, 'netMsg') || '').slice(0, 60)}`);
}
// ---- 3. the game paused for 14 s (tessvm's pause): it wrote nothing meanwhile - alone in the room it says so; with bob there it does not
await listScreen(A);
await A.page.evaluate(() => { const v = window.__vm.variables.find((x) => x.name === 'netMsg' && !x.isList); v.setValue(''); window.__handle.pause(); });
await sleep(14000);
await A.page.evaluate(() => window.__handle.start());
await sleep(12000);
{ const m = String(await V(A, 'netMsg') || ''); if (B) ok(m === '', `3. paused 14 s with bob in the room: nothing is said ('${m.slice(0, 24)}')`); else ok(m.includes('새로고침'), `3. paused 14 s, alone in the room: the player is told (${m.slice(0, 40)}…)`); }
{ const er = await A.page.evaluate(() => (window.__vm.errors || []).map((e) => String(e && e.message ? e.message : e))); ok(er.length === 0, 'no script stopped on an error ' + er.slice(0, 3).join(' | ')); }
ok(errors.length === 0, 'page errors: ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
await browser.close();
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

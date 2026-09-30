// v2.1.0: an online race between two REAL tessvm players (the _work/tessvm
// harness, node ../tessvm/tsrv.mjs 3100), each with the real Entry Sync page
// script (_work/entrysync/inject.js). This script is the room server: what a
// page sends (ENTRY_SYNC_VAR_CHANGED / LIST_CHANGED) goes to the other page
// (REMOTE_VAR_UPDATE / REMOTE_LIST_UPDATE) after LAT ms. Everything is done
// with keys, as a player would: ONLINE, create a room, join, ready, start,
// drive (W), chat (Y and typing).
// usage: node t9/nettess.mjs [file.ent] [latency ms]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online210.ent');
const LAT = +(process.argv[3] || 80);
const inject = fs.readFileSync(new URL('../../entrysync/inject.js', import.meta.url), 'utf8');
const shots = path.resolve('ab');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const errors = [];
async function player(nick) {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on('pageerror', (e) => errors.push(nick + ': ' + e.message));
    await page.goto(`http://localhost:${PORT}/harness/index.html?nick=${nick}`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
    await page.evaluate(() => {
        window.__q = [];
        window.addEventListener('message', (e) => {
            const d = e.data;
            if (d && (d.type === 'ENTRY_SYNC_VAR_CHANGED' || d.type === 'ENTRY_SYNC_LIST_CHANGED')) window.__q.push(d);
        });
    });
    await page.addScriptTag({ content: inject });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__handle.start());
    await page.waitForTimeout(300);
    await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*'));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: {} }, '*'));
    return { nick, page };
}
const A = await player('alice');
const B = await player('bob');
const P = [A, B];

// the room server: relay every change to the other page after LAT ms (and keep
// the room's values, for a page that reconnects)
const room = { variables: {}, lists: {} };
const reconnect = (p) => p.page.evaluate((room) => {
    window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*');
    window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: { syncData: room } }, '*');
}, room);
let relayed = 0;
let stopRelay = false;
(async () => {
    while (!stopRelay) {
        for (const p of P) {
            const q = await p.page.evaluate(() => window.__q.splice(0)).catch(() => []);
            for (const d of q) {
                if (p.cut) continue;                    // (a dead line: lost)
                relayed++;
                if (d.type === 'ENTRY_SYNC_VAR_CHANGED') room.variables[d.name] = d.value; else room.lists[d.name] = d.array;
                for (const o of P) if (o !== p && !o.cut) setTimeout(() => {
                    const m = d.type === 'ENTRY_SYNC_VAR_CHANGED' ? { type: 'ENTRY_SYNC_REMOTE_VAR_UPDATE', name: d.name, value: d.value } : { type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: d.name, array: d.array };
                    o.page.evaluate((m) => window.postMessage(m, '*'), m).catch(() => {});
                }, LAT);
            }
        }
        await sleep(30);
    }
})();

const V = (p, n) => p.page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const L = (p, n, i) => p.page.evaluate(([n, i]) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l && l.array[i - 1] && l.array[i - 1].data; }, [n, i]);
const KC = { up: ['ArrowUp', 38], down: ['ArrowDown', 40], left: ['ArrowLeft', 37], right: ['ArrowRight', 39], enter: ['Enter', 13], esc: ['Escape', 27], w: ['KeyW', 87], y: ['KeyY', 89] };
const key = (p, type, k) => p.page.evaluate(([type, code, kc]) => document.body.dispatchEvent(new KeyboardEvent(type, { code, key: code, keyCode: kc, which: kc, bubbles: true })), [type, KC[k][0], KC[k][1]]);
const tap = async (p, k, n = 1) => { for (let i = 0; i < n; i++) { await key(p, 'keydown', k); await sleep(90); await key(p, 'keyup', k); await sleep(140); } };
const shot = async (p, name) => { const c = await p.page.$('canvas'); await c.screenshot({ path: path.join(shots, name) }); };
const until = async (f, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };

await sleep(2500);
// both: DOWN, ENTER = ONLINE RACE
for (const p of P) await tap(p, 'down');
for (const p of P) await tap(p, 'enter');
ok(await until(async () => +(await V(A, 'netAlive')) === 2 && +(await V(B, 'netAlive')) === 2),
    `both online, each sees 2 players (slots ${await V(A, 'netMy')}, ${await V(B, 'netMy')}; nick ${await V(A, 'pNick')})`);
if (process.env.DBG) {
    const bs = +(await V(B, 'netMy')), as = +(await V(A, 'netMy'));
    console.log('A sees B slot', bs, String(await V(A, '?!p' + bs)).slice(0, 40), ' B own', String(await V(B, '?!p' + bs)).slice(0, 40));
    console.log('B sees A slot', as, String(await V(B, '?!p' + as)).slice(0, 40));
    console.log('A live', await A.page.evaluate(() => window.__vm.variables.find((v) => v.name === 'nsLive').array.map((d) => d.data).join('')));
    for (const n of ['nsSeen', 'nsStale', 'nsSid', 'nsT', 'nsV']) console.log(' A', n, String(await L(A, n, bs)).slice(0, 50));
    console.log(' full A-own', JSON.stringify(await V(A, '?!p' + as)), ' B-own', JSON.stringify(await V(B, '?!p' + bs)));
    console.log(' types', await A.page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return [typeof v.value, v.value && v.value.constructor && v.value.constructor.name, String(v.value).length, JSON.stringify(v.value).slice(0, 30)]; }, '?!p' + bs),
        await B.page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return [typeof v.value, String(v.value).length]; }, '?!p' + as));
    console.log(' A gt', await V(A, 'gt'), 'B gt', await V(B, 'gt'), 'A wall?', await A.page.evaluate(() => { const d = new Date(); return ((d.getDate() * 24 + d.getHours()) * 60 + d.getMinutes()) * 60 + d.getSeconds(); }) % 100000);
}
await shot(A, 'net_lobby.png');
// alice: CREATE A ROOM, circuit +1, down to OPEN THE ROOM
await tap(A, 'enter');
await tap(A, 'down'); await tap(A, 'right');
await tap(A, 'down', 7);
await tap(A, 'enter');
ok(await until(async () => +(await V(B, 'nrN')) === 1), `bob's lobby lists alice's room: '${await L(B, 'nsTitle', +(await V(A, 'netMy')))}'`);
await shot(B, 'net_lobby_room.png');
// bob: ENTER joins (row 1), ENTER again is READY
await tap(B, 'enter');
await until(async () => +(await V(B, 'netPg')) === 3);
await tap(B, 'enter');
ok(await until(async () => +(await L(A, 'nsSt', +(await V(B, 'netMy')))) === 3), 'bob joined and is ready (on alice\'s screen)');
// chat in the room: bob types
await tap(B, 'y');
await sleep(500);
await B.page.keyboard.type('hi alice', { delay: 20 });
await B.page.keyboard.press('Enter');
const chatHas = async (p, s) => { for (let k = 1; k <= 6; k++) if (String(await L(p, 'chL', k)).includes(s)) return true; return false; };
ok(await until(async () => chatHas(A, 'bob:  hi alice'), 8000), 'bob\'s chat line reaches alice');
await shot(A, 'net_room.png');
// alice starts
await tap(A, 'enter');
ok(await until(async () => +(await V(A, 'raceState')) === 3 && +(await V(B, 'raceState')) === 3, 60000),
    `both loaded, got the go and the lights went out (cars: ${await V(A, 'nCars')} / ${await V(B, 'nCars')})`);
for (const p of P) await key(p, 'keydown', 'w');
let err = [];
for (let i = 0; i < 16; i++) {
    await sleep(1000);
    for (const [X, Y] of [[A, B], [B, A]]) {
        const xr = await X.page.evaluate(() => { const L = (n) => window.__vm.variables.find((v) => v.name === n && v.isList).array.map((d) => +d.data); return { x: L('caX'), z: L('caZ') }; });
        const y1 = await Y.page.evaluate(() => { const L = (n) => window.__vm.variables.find((v) => v.name === n && v.isList).array.map((d) => +d.data); return { x: L('caX')[0], z: L('caZ')[0] }; });
        err.push(Math.hypot(xr.x[1] - y1.x, xr.z[1] - y1.z));
    }
}
await shot(A, 'net_race_a.png');
await shot(B, 'net_race_b.png');
err.sort((a, b) => a - b);
const spA = +(await L(A, 'caSpd', 1)) * 3.6;
ok(spA > 60 && err[err.length >> 1] < 8, `racing (alice ${spA.toFixed(0)} km/h): the other car drawn ${err[err.length >> 1].toFixed(1)} m from where it is (median; max ${err[err.length - 1].toFixed(1)} m)`);
// chat while racing, from alice
await tap(A, 'y');
await sleep(500);
await A.page.keyboard.type('see you', { delay: 20 });
await A.page.keyboard.press('Enter');
ok(await until(async () => chatHas(B, 'alice:  see you'), 8000), 'chat in the race reaches bob');
await shot(B, 'net_race_chat.png');

// v2.1.2 (a): bob's connection drops for 10 s
const carOn = async (X, Y) => { const ys = +(await V(Y, 'netMy')); for (let c = 1; c <= 2; c++) if (+(await L(X, 'caSlot', c)) === ys) return c; return 0; };
B.cut = true;
await B.page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: false }, '*'));
await sleep(8000);
const bannerB = String(await L(B, 'txS', 88));
const aOnB = await L(B, 'caDNF', await carOn(B, A));
const bOnA = await L(A, 'caDNF', await carOn(A, B));
await shot(B, 'net_lost.png');
B.cut = false;
await reconnect(B);
await sleep(4000);
ok(bannerB.includes('CONNECTION LOST') && +aOnB === 0, `bob's line dead: '${bannerB}', alice kept on his screen`);
ok(+bOnA === 1 && +(await L(A, 'caDNF', await carOn(A, B))) === 0 && +(await V(B, 'netLostT')) === 0, 'alice saw bob out while he was cut off, and back after');

// (b) bob's work is stopped in the race, then started again: ONLINE puts him back in
const bSlot = +(await V(B, 'netMy')), bLap = +(await L(B, 'caLap', 1));
await key(B, 'keyup', 'w');
await B.page.evaluate(() => window.__handle.stop());
await sleep(7000);
if (process.env.DBG) console.log('A view of bob', JSON.stringify(await A.page.evaluate((s) => { const vs = window.__vm.variables; const V = (n) => vs.find((v) => v.name === n && !v.isList).value; const L = (n) => vs.find((v) => v.name === n && v.isList).array[s - 1].data; return { live: L('nsLive'), st: L('nsSt'), age: V('gt') - L('nsT'), v: String(L('nsV')).slice(0, 30), cur: String(V('?!p' + s)).slice(0, 30), frozen: V('netFrozen'), lost: V('netLostT') }; }, bSlot)));
const carOfSlot = async (X, sl) => { for (let c = 1; c <= 2; c++) if (+(await L(X, 'caSlot', c)) === sl) return c; return 0; };
ok(+(await L(A, 'caDNF', await carOfSlot(A, bSlot))) === 1 && await chatHas(A, 'bob  LEFT THE RACE'), "bob's work stopped: out on alice's screen");
await B.page.evaluate(() => window.__handle.start());
await sleep(300);
await reconnect(B);
await sleep(2500);
await tap(B, 'down');
await tap(B, 'enter');
ok(await until(async () => +(await V(B, 'raceState')) === 3 && +(await V(B, 'nCars')) === 2, 40000),
    `bob started again and chose ONLINE: back in the race (slot ${await V(B, 'netMy')} was ${bSlot}, lap ${await L(B, 'caLap', 1)} was ${bLap})`);
await key(B, 'keydown', 'w');
await sleep(3000);
ok(+(await L(A, 'caDNF', await carOn(A, B))) === 0 && await chatHas(A, 'bob  IS BACK IN THE RACE'), 'alice sees him back');
await shot(B, 'net_rejoin.png');
for (const p of P) await key(p, 'keyup', 'w');
ok(errors.length === 0, `page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'} (${relayed} messages relayed)`);
stopRelay = true;
await sleep(200);
await browser.close();

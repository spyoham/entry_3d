// v2.1.0: an online race between two players in REAL Entry (entry-vibe-coding,
// node server.js on :3000), each with the real Entry Sync page script. This
// script relays like the room server (see t9/nettess.mjs). Keys only.
// usage: node t9/netreal.mjs [file.ent] [latency ms]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = process.argv[2] || 'f1online210.ent';
const LAT = +(process.argv[3] || 80);
const inject = fs.readFileSync(new URL('../../entrysync/inject.js', import.meta.url), 'utf8');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const errors = [];
const b64 = fs.readFileSync(file).toString('base64');
async function player(nick) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(nick + ': ' + e.message));
    await page.goto('http://localhost:3000/editor.html');
    await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async ([b64, nick]) => {
        window.user = { nickname: nick };
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const fd = new FormData();
        fd.append('ent', new Blob([bin]), 'x.ent');
        const project = await (await fetch('/api/load', { method: 'POST', body: fd })).json();
        Entry.clearProject();
        Entry.loadProject(project);
    }, [b64, nick]);
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
        window.__q = [];
        window.addEventListener('message', (e) => {
            const d = e.data;
            if (d && (d.type === 'ENTRY_SYNC_VAR_CHANGED' || d.type === 'ENTRY_SYNC_LIST_CHANGED')) window.__q.push(d);
        });
    });
    await page.addScriptTag({ content: inject });
    await page.waitForTimeout(1500);
    await page.evaluate(() => Entry.engine.toggleRun());
    await page.waitForTimeout(300);
    await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*'));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: {} }, '*'));
    return { nick, page };
}
const A = await player('alice');
const B = await player('bob');
const P = [A, B];
let relayed = 0;
let stopRelay = false;
(async () => {
    while (!stopRelay) {
        for (const p of P) {
            const q = await p.page.evaluate(() => window.__q.splice(0)).catch(() => []);
            for (const d of q) {
                relayed++;
                for (const o of P) if (o !== p) setTimeout(() => {
                    const m = d.type === 'ENTRY_SYNC_VAR_CHANGED' ? { type: 'ENTRY_SYNC_REMOTE_VAR_UPDATE', name: d.name, value: d.value } : { type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: d.name, array: d.array };
                    o.page.evaluate((m) => window.postMessage(m, '*'), m).catch(() => {});
                }, LAT);
            }
        }
        await sleep(30);
    }
})();
const V = (p, n) => p.page.evaluate((n) => { const v = Entry.variableContainer.variables_.find((v) => v.name_ === n); return v && v.value_; }, n);
const L = (p, n, i) => p.page.evaluate(([n, i]) => { const l = Entry.variableContainer.lists_.find((v) => v.name_ === n); return l && l.array_[i - 1] && l.array_[i - 1].data; }, [n, i]);
const KC = { down: ['ArrowDown', 40, 'ArrowDown'], right: ['ArrowRight', 39, 'ArrowRight'], enter: ['Enter', 13, 'Enter'], w: ['KeyW', 87, 'w'] };
const key = (p, type, k) => p.page.evaluate(([type, code, kc, ky]) => document.dispatchEvent(new KeyboardEvent(type, { code, key: ky, keyCode: kc, which: kc, bubbles: true })), [type, KC[k][0], KC[k][1], KC[k][2]]);
// plain Entry runs a few frames a second: hold each key long enough to be seen
const tap = async (p, k, n = 1) => { for (let i = 0; i < n; i++) { await key(p, 'keydown', k); await sleep(700); await key(p, 'keyup', k); await sleep(700); } };
const until = async (f, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(400); } return false; };
const fps = async (p) => { const f0 = await V(p, 'gt'); await sleep(3000); return ((await V(p, 'gt')) - f0) / 3; };

await sleep(4000);
for (const p of P) await tap(p, 'down');
for (const p of P) await tap(p, 'enter');
ok(await until(async () => +(await V(A, 'netAlive')) === 2 && +(await V(B, 'netAlive')) === 2, 60000),
    `both online, each sees 2 (nicks ${await V(A, 'pNick')}, ${await V(B, 'pNick')})`);
const g1 = await A.page.evaluate(() => { const t = performance.now(); return new Promise((r) => { let n = 0; const e0 = Entry.engine; setTimeout(() => r(0), 10); }); });
await tap(A, 'enter');
await tap(A, 'down', 8);
await tap(A, 'enter');
ok(await until(async () => +(await V(B, 'nrN')) === 1), `bob sees alice's room: '${await L(B, 'nsTitle', +(await V(A, 'netMy')))}'`);
await tap(B, 'enter');
await until(async () => +(await V(B, 'netPg')) === 3);
await tap(B, 'enter');
ok(await until(async () => +(await L(A, 'nsSt', +(await V(B, 'netMy')))) === 3), "bob joined and is ready on alice's screen");
if (process.env.DBG) { const h = +(await V(A, 'netMy')); const t0 = Date.now(); let last = ''; while (Date.now() - t0 < 6000) { const r = await B.page.evaluate((h) => { const V = (n) => Entry.variableContainer.variables_.find((v) => v.name_ === n).value_; const L = (n) => Entry.variableContainer.lists_.find((v) => v.name_ === n).array_[h - 1].data; return [V('netPg'), V('netRoom'), V('netRSid'), V('msg'), 'live', L('nsLive'), 'st', L('nsSt'), 'age', (V('gt') - L('nsT')).toFixed(1), 'sid', L('nsSid'), 'room', L('nsRoom'), String(L('nsV')).slice(0, 26)].join(' '); }, h); if (r !== last) { console.log('R', ((Date.now() - t0) / 1000).toFixed(1), r); last = r; } await sleep(100); } }
await tap(A, 'enter');
if (process.env.DBG) { const h = +(await V(A, 'netMy')); const t0 = Date.now(); let last = ''; while (Date.now() - t0 < 12000) { const r = await B.page.evaluate((h) => { const V = (n) => Entry.variableContainer.variables_.find((v) => v.name_ === n).value_; const L = (n) => Entry.variableContainer.lists_.find((v) => v.name_ === n).array_[h - 1].data; return [V('netPg'), V('msg'), L('nsLive'), L('nsSt'), (V('gt') - L('nsT')).toFixed(1), L('nsSid'), V('netRSid'), L('nsRoom'), String(L('nsV')).slice(0, 20)].join(' '); }, h); if (r !== last) { console.log('B', ((Date.now() - t0) / 1000).toFixed(1), r); last = r; } await sleep(150); } }
await sleep(1000);
if (process.env.DBG) { const h = +(await V(A, 'netMy')); console.log('B view: rst', await L(B, 'nsRst', h), 'rid', await L(B, 'nsRid', h), 'grid', JSON.stringify(await L(B, 'nsGrid', h)), 'B netRid', await V(B, 'netRid'), 'pg', await V(B, 'netPg'), 'my', await V(B, 'netMy'), 'A grid', JSON.stringify(await V(A, 'nrGrid')), 'A rst', await V(A, 'nrRst'), 'WHY', await V(B, 'netWhy'), 'MSG', await V(B, 'msg'), 'A st', await V(A, 'netSt'), 'A state', await V(A, 'raceState'), 'B state', await V(B, 'raceState'), 'B race', await V(B, 'netRace')); }
ok(await until(async () => +(await V(A, 'raceState')) === 3 && +(await V(B, 'raceState')) === 3, 120000),
    `both got the go, lights out (cars ${await V(A, 'nCars')} / ${await V(B, 'nCars')})`);
// (held like a real keyboard: repeated keydowns - two pages share one browser's focus)
for (const p of P) await p.page.keyboard.down('w');
const hold = setInterval(() => { for (const p of P) p.page.keyboard.down('w').catch(() => {}); }, 300);
await sleep(12000);
if (process.env.DBG) for (const p of P) console.log('DRV', p.nick, JSON.stringify(await p.page.evaluate(() => { const V = (n) => Entry.variableContainer.variables_.find((v) => v.name_ === n).value_; const L = (n) => Entry.variableContainer.lists_.find((v) => v.name_ === n).array_.slice(0, 2).map((d) => d.data); return { keys: Entry.pressedKeys, st: V('raceState'), wait: V('netWait'), hold: L('caHold'), thr: L('caThr'), spd: L('caSpd'), net: L('caNet'), surf: L('caSurf'), lap: L('caLap'), fin: L('caFin') }; })));
const err = [];
let vmax = 0;   // (holding only W, the cars end up in the first corner's wall: take the best speed seen)
for (let i = 0; i < 6; i++) {
    for (const [X, Y] of [[A, B], [B, A]]) {
        const xr = await X.page.evaluate(() => { const L = (n) => Entry.variableContainer.lists_.find((v) => v.name_ === n).array_.map((d) => +d.data); return [L('caX')[1], L('caZ')[1]]; });
        const y1 = await Y.page.evaluate(() => { const L = (n) => Entry.variableContainer.lists_.find((v) => v.name_ === n).array_.map((d) => +d.data); return [L('caX')[0], L('caZ')[0]]; });
        err.push(Math.hypot(xr[0] - y1[0], xr[1] - y1[1]));
    }
    vmax = Math.max(vmax, +(await L(A, 'caSpd', 1)) * 3.6, +(await L(B, 'caSpd', 1)) * 3.6);
    await sleep(1500);
}
err.sort((a, b) => a - b);
const spd = vmax;
ok(spd > 20 && err[err.length >> 1] < 25, `racing in plain Entry (top speed seen ${spd.toFixed(0)} km/h, ~${(await fps(A)).toFixed(2)} game s per s): other car ${err[err.length >> 1].toFixed(1)} m off (median of ${err.length})`);
clearInterval(hold);
for (const p of P) await p.page.keyboard.up('w');
ok(errors.length === 0, `page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'} (${relayed} messages relayed)`);
stopRelay = true;
await sleep(200);
await browser.close();

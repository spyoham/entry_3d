// v2.0.0: the game's '?!' lists under the REAL Entry Sync page script
// (Entry-Sync extension/inject.js, _work/entrysync) in the real Entry runtime
// (entry-vibe-coding, node server.js on :3000). This script plays the part of
// the extension's content.js and the room server: it says "connected", sends
// a room with alice's old save and a ranking, and records every list the
// page would send to the server.
// usage: node t9/syncreal.mjs [file.ent]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = process.argv[2] || 'f1online200.ent';
const inject = fs.readFileSync(new URL('../../entrysync/inject.js', import.meta.url), 'utf8');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
await page.waitForTimeout(2000);
const b64 = fs.readFileSync(file).toString('base64');
await page.evaluate(async (b64) => {
    window.user = { nickname: 'alice' };
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('ent', new Blob([bin]), 'x.ent');
    const project = await (await fetch('/api/load', { method: 'POST', body: fd })).json();
    Entry.clearProject();
    Entry.loadProject(project);
}, b64);
await page.waitForTimeout(3000);
// what the page sends toward the server
await page.evaluate(() => {
    window.__out = [];
    window.addEventListener('message', (e) => {
        const d = e.data;
        if (d && d.type === 'ENTRY_SYNC_LIST_CHANGED') window.__out.push({ t: performance.now() - window.__t0, name: d.name, array: d.array });
        if (d && d.type === 'ENTRY_SYNC_ENGINE_RUN') window.__run = (window.__run || 0) + 1;
    });
});
await page.addScriptTag({ content: inject });
await page.waitForTimeout(1500);

const rec = (nick, xp) => `|${nick},${xp},1,0,0,0,3,3,3,3,1,4,1,2,55,16` + ',0'.repeat(16) + ',3,3,3,4' + ',0'.repeat(22);
const rank = new Array(19).fill('|'); rank[4] = '||zed,70000|alice,75000';
const room = { syncData: { lists: { '?!rank': rank, '?!ghost': new Array(19).fill('|') } } };
for (let s = 1; s <= 8; s++) room.syncData.lists['?!save' + s] = [rec('zoe', 777), rec('alice', 5000)];

await page.evaluate(() => { window.__t0 = performance.now(); Entry.engine.toggleRun(); });
// the socket opens, then the room's lists arrive (content.js -> inject.js)
await page.waitForTimeout(300);
await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*'));
await page.waitForTimeout(1500);
const sentBefore = await page.evaluate(() => window.__out.length);
await page.evaluate((room) => window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: room }, '*'), room);

const read = () => page.evaluate(() => {
    const V = (n) => { const v = Entry.variableContainer.variables_.find((v) => v.name_ === n); return v && v.value_; };
    const L = (n) => { const l = Entry.variableContainer.lists_.find((v) => v.name_ === n); return l && l.array_.map((x) => x.data); };
    return { nick: V('pNick'), flag: V('?!'), pSync: V('pSync'), pXP: V('pXP'), pSh: V('pSh'), gt: V('gt'), rank5: (L('?!rank') || [])[4], wr5: (Entry.variableContainer.lists_.find((v) => v.name_ === 'recNm').array_[4] || {}).data };
});
let st;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(1000); st = await read(); if (+st.pSync > 0 && +st.gt > 8) break; }
await page.waitForTimeout(4000);
st = await read();
const out = await page.evaluate(() => window.__out);
const mine = out.filter((o) => o.name === '?!save' + st.pSh);
const last = mine.length ? mine[mine.length - 1].array.map(String) : [];
ok(st.flag == 1, `'?!' flag ${st.flag} (1 = connected)`);
ok(sentBefore === 0, `nothing sent before the room's lists came: ${sentBefore}`);
ok(+st.pSync === 1 && +st.pXP >= 5000, `alice (${st.nick}) old save loaded: sync ${st.pSync}, XP ${st.pXP}, save list ${st.pSh}; world record holder on circuit 5: ${st.wr5}`);
ok(mine.length > 0 && last.some((v) => v.startsWith('|alice,' + st.pXP + ',')) && last.some((v) => v.startsWith('|zoe,777,')),
    `her save went to the server as the whole list: ${mine.length} send(s), ${last.length} records, zoe kept`);
ok(out.every((o) => o.name.startsWith('?!')) && out.every((o) => !(o.name.startsWith('?!save') && !o.array.map(String).some((v) => v.startsWith('|zoe,')))),
    `no list sent without the others' records (${out.length} sends: ${[...new Set(out.map((o) => o.name))].join(' ')})`);

// alice sets a best lap on circuit 5: it goes in, and its check settles
await page.evaluate(() => { const l = Entry.variableContainer.lists_.find((v) => v.name_ === 'pendRk'); l.array_[4].data = 72.5; });
await page.waitForTimeout(12000);
const rk = await page.evaluate(() => {
    const V = (n) => Entry.variableContainer.variables_.find((v) => v.name_ === n).value_;
    const L = (n) => Entry.variableContainer.lists_.find((v) => v.name_ === n).array_.map((x) => x.data);
    return { rank5: L('?!rank')[4], ok5: L('rkOk')[4], pRkN: V('pRkN'), pRkT: V('pRkT') };
});
const sentRank = (await page.evaluate(() => window.__out)).filter((o) => o.name === '?!rank').length;
ok(String(rk.rank5).startsWith('||zed,70000|alice,72500') && +rk.ok5 === 72.5 && +rk.pRkN === 0 && +rk.pRkT === 0 && sentRank === 1,
    `a ranked lap: '${rk.rank5}', kept an eye on ${rk.ok5}, retries ${rk.pRkN}, ?!rank sent ${sentRank} time(s)`);

// another player's ranking arrives while alice is in the menu
const rank2 = rank.slice(); rank2[4] = '||bob,60000|zed,70000|alice,75000';
await page.evaluate((a) => window.postMessage({ type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: '?!rank', array: a }, '*'), rank2);
await page.waitForTimeout(3000);
const st2 = await read();
ok(String(st2.rank5).startsWith('||bob,60000'), `a remote ranking update lands in the list: ${st2.rank5}`);
ok(errors.length === 0, `page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
await browser.close();

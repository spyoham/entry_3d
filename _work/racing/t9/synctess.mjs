// v2.0.0 under tessvm: the game's '?!' lists with the REAL Entry Sync page script
// (_work/entrysync/inject.js, with its tessvm support) in the REAL tessvm runner
// (_work/tessvm harness; start it first: node ../tessvm/tsrv.mjs). Like
// t9/syncreal.mjs, this script plays content.js and the room server.
// Two plain variables are added to the work ('?!cnt' live, '??best' saved only)
// so single-variable sync is checked too.
// usage: node t9/synctess.mjs [file.ent]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2] || 'f1online200.ent');
const inject = fs.readFileSync(new URL('../../entrysync/inject.js', import.meta.url), 'utf8');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const PORT = 3100;

await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const pj = new URL('../../tessvm/ent/temp/project.json', import.meta.url);
const project = JSON.parse(fs.readFileSync(pj, 'utf8'));
const plain = (id, name, value) => ({ id, name, value, variableType: 'variable', isCloud: false, isRealTime: false, visible: false, x: 0, y: 0, object: null });
project.variables.push(plain('escnt', '?!cnt', 0), plain('esbest', '??best', 0));
fs.writeFileSync(pj, JSON.stringify(project));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=alice`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
// what the page sends toward the server
await page.evaluate(() => {
    window.__out = []; window.__vout = []; window.__stops = []; window.__run = 0;
    window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d) return;
        if (d.type === 'ENTRY_SYNC_LIST_CHANGED') window.__out.push({ t: performance.now() - window.__t0, name: d.name, array: d.array });
        if (d.type === 'ENTRY_SYNC_VAR_CHANGED') window.__vout.push({ name: d.name, value: d.value });
        if (d.type === 'ENTRY_SYNC_ENGINE_RUN') window.__run++;
        if (d.type === 'ENTRY_SYNC_ENGINE_STOP') window.__stops.push(d);
        if (d.type === 'RESP_ENTRY_VARS_INSPECTION') window.__insp = d.inspection;
    });
});
await page.addScriptTag({ content: inject });
await page.waitForTimeout(1000);
ok(await page.evaluate(() => !!window.tessvm.vm.__entrySyncHooked), 'Entry Sync found the tessvm runner (window.tessvm)');

const rec = (nick, xp) => `|${nick},${xp},1,0,0,0,3,3,3,3,1,4,1,2,55,16` + ',0'.repeat(16) + ',3,3,3,4' + ',0'.repeat(22);
const rank = new Array(19).fill('|'); rank[4] = '||zed,70000|alice,75000';
const room = { syncData: { lists: { '?!rank': rank, '?!ghost': new Array(19).fill('|') }, variables: { '?!cnt': 41 } }, dataOnly: { variables: { '??best': 7 } } };
for (let s = 1; s <= 8; s++) room.syncData.lists['?!save' + s] = [rec('zoe', 777), rec('alice', 5000)];

await page.evaluate(() => { window.__t0 = performance.now(); window.__handle.start(); });
// the socket opens, then the room's lists arrive (content.js -> inject.js)
await page.waitForTimeout(300);
await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_STATUS_UPDATE', connected: true }, '*'));
await page.waitForTimeout(1500);
const sentBefore = await page.evaluate(() => window.__out.length + window.__vout.length);
await page.evaluate((room) => window.postMessage({ type: 'ENTRY_SYNC_APPLY_INITIAL_DATA', connected: true, payload: room }, '*'), room);

const read = () => page.evaluate(() => {
    const vs = window.__vm.variables;
    const V = (n) => { const v = vs.find((v) => v.name === n && !v.isList); return v && v.value; };
    const L = (n) => { const l = vs.find((v) => v.name === n && v.isList); return l && l.array.map((x) => x.data); };
    return { nick: V('pNick'), flag: V('?!'), pSync: V('pSync'), pXP: V('pXP'), pSh: V('pSh'), gt: V('gt'), cnt: V('?!cnt'), best: V('??best'), rank5: (L('?!rank') || [])[4], wr5: (L('recNm') || [])[4] };
});
let st;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(1000); st = await read(); if (+st.pSync > 0 && +st.gt > 8) break; }
await page.waitForTimeout(4000);
st = await read();
const out = await page.evaluate(() => window.__out);
const mine = out.filter((o) => o.name === '?!save' + st.pSh);
const last = mine.length ? mine[mine.length - 1].array.map(String) : [];
ok(st.flag == 1, `'?!' flag ${st.flag} (1 = connected)`);
ok(await page.evaluate(() => window.__run) === 1, 'ENTRY_SYNC_ENGINE_RUN sent once on start');
ok(sentBefore === 0, `nothing sent before the room's lists came: ${sentBefore}`);
ok(+st.pSync === 1 && +st.pXP >= 5000, `alice (${st.nick}) old save loaded: sync ${st.pSync}, XP ${st.pXP}, save list ${st.pSh}; world record holder on circuit 5: ${st.wr5}`);
ok(mine.length > 0 && last.some((v) => v.startsWith('|alice,' + st.pXP + ',')) && last.some((v) => v.startsWith('|zoe,777,')),
    `her save went to the server as the whole list: ${mine.length} send(s), ${last.length} records, zoe kept`);
ok(out.every((o) => o.name.startsWith('?!')) && out.every((o) => !(o.name.startsWith('?!save') && !o.array.map(String).some((v) => v.startsWith('|zoe,')))),
    `no list sent without the others' records (${out.length} sends: ${[...new Set(out.map((o) => o.name))].join(' ')})`);
ok(+st.cnt === 41 && +st.best === 7, `room variables applied: ?!cnt ${st.cnt}, ??best ${st.best}`);

// alice sets a best lap on circuit 5: it goes in, and its check settles
await page.evaluate(() => { const l = window.__vm.variables.find((v) => v.name === 'pendRk'); l.array[4] = { data: 72.5 }; l.touch(); });
await page.waitForTimeout(12000);
const rk = await page.evaluate(() => {
    const vs = window.__vm.variables;
    const V = (n) => vs.find((v) => v.name === n && !v.isList).value;
    const L = (n) => vs.find((v) => v.name === n && v.isList).array.map((x) => x.data);
    return { rank5: L('?!rank')[4], ok5: L('rkOk')[4], pRkN: V('pRkN'), pRkT: V('pRkT') };
});
const sentRank = (await page.evaluate(() => window.__out)).filter((o) => o.name === '?!rank');
ok(String(rk.rank5).startsWith('||zed,70000|alice,72500') && +rk.ok5 === 72.5 && +rk.pRkN === 0 && +rk.pRkT === 0 && sentRank.length === 1,
    `a ranked lap: '${rk.rank5}', kept an eye on ${rk.ok5}, retries ${rk.pRkN}, ?!rank sent ${sentRank.length} time(s)`);
ok(sentRank.length === 1 && String(sentRank[0].array[4]).startsWith('||zed,70000|alice,72500'), `the sent ?!rank holds the new lap: '${sentRank[0] && sentRank[0].array[4]}'`);

// another player's ranking arrives while alice is in the menu
const rank2 = rank.slice(); rank2[4] = '||bob,60000|zed,70000|alice,75000';
await page.evaluate((a) => window.postMessage({ type: 'ENTRY_SYNC_REMOTE_LIST_UPDATE', name: '?!rank', array: a }, '*'), rank2);
await page.waitForTimeout(3000);
const st2 = await read();
ok(String(st2.rank5).startsWith('||bob,60000'), `a remote ranking update lands in the list: ${st2.rank5}`);
// the game may rewrite its own lap back in (the remote list still had 75000), but the
// remote list itself must never be sent back as it came
const rankSends = (await page.evaluate(() => window.__out)).filter((o) => o.name === '?!rank');
const echoed = rankSends.filter((o) => JSON.stringify(o.array.map(String)) === JSON.stringify(rank2));
ok(echoed.length === 0, `the remote update is not echoed back (${rankSends.length} ?!rank sends: ${rankSends.map((o) => String(o.array[4]).slice(0, 34)).join(' / ')})`);

// single variables: a remote write lands, a local write is sent (only the live one)
await page.evaluate(() => window.postMessage({ type: 'ENTRY_SYNC_REMOTE_VAR_UPDATE', name: '?!cnt', value: 99 }, '*'));
await page.waitForTimeout(300);
const cntRemote = (await read()).cnt;
await page.evaluate(() => { const vs = window.__vm.variables; vs.find((v) => v.name === '?!cnt').setValue(100); vs.find((v) => v.name === '??best').setValue(8); });
await page.waitForTimeout(300);
const vout = await page.evaluate(() => window.__vout);
ok(+cntRemote === 99, `remote ?!cnt update lands: ${cntRemote}`);
ok(vout.length === 1 && vout[0].name === '?!cnt' && +vout[0].value === 100, `local writes sent: ${JSON.stringify(vout)} (??best is saved, not sent live)`);

// the popup's check sees the managed names
await page.evaluate(() => window.postMessage({ type: 'REQ_ENTRY_VARS_INSPECTION' }, '*'));
await page.waitForTimeout(200);
const insp = await page.evaluate(() => window.__insp);
ok(insp && insp.hasSyncVars && insp.lists.some((l) => l.name === '?!rank') && '?!cnt' in insp.vars, 'popup inspection lists the work\'s variables');

// stop: the save request carries the last values, and the stopped stage keeps them
await page.evaluate(() => window.__handle.stop());
await page.waitForTimeout(300);
const stops = await page.evaluate(() => window.__stops);
const snap = stops[0] || {};
ok(stops.length === 1, `ENTRY_SYNC_ENGINE_STOP sent once: ${stops.length}`);
ok(snap.syncDataSnapshot && String(snap.syncDataSnapshot.lists['?!rank'][4]).startsWith('||bob,60000') && +snap.syncDataSnapshot.variables['?!cnt'] === 100
    && snap.dataOnlySnapshot && +snap.dataOnlySnapshot.variables['??best'] === 8 && !('?!cnt' in snap.dataOnlySnapshot.variables),
    `stop snapshot: ?!rank ${snap.syncDataSnapshot && String(snap.syncDataSnapshot.lists['?!rank'][4]).slice(0, 12)}…, ?!cnt ${snap.syncDataSnapshot && snap.syncDataSnapshot.variables['?!cnt']}, ??best ${snap.dataOnlySnapshot && snap.dataOnlySnapshot.variables['??best']}`);
const st3 = await read();
ok(String(st3.rank5).startsWith('||bob,60000') && +st3.cnt === 100 && +st3.best === 8, `stopped work keeps the synced values: ${String(st3.rank5).slice(0, 12)}…, ${st3.cnt}, ${st3.best}`);
const quiet = await page.evaluate(() => window.__out.length + window.__vout.length);

// a second run starts from the same values and sends nothing it did not change
await page.evaluate(() => window.__handle.start());
await page.waitForTimeout(1500);
const st4 = await read();
const after = await page.evaluate(() => window.__out.length + window.__vout.length);
ok(await page.evaluate(() => window.__run) === 2 && +st4.cnt === 100 && String(st4.rank5).startsWith('||bob,60000') && st4.flag == 1,
    `restart: run ${await page.evaluate(() => window.__run)}, ?!cnt ${st4.cnt}, flag ${st4.flag}, ?!rank kept`);
ok(after === quiet, `nothing sent by the stop/restart itself: ${after - quiet}`);
ok(errors.length === 0, `page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
await browser.close();

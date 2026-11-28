// The board with the INSTALLED Entry Sync as it is (its own content.js and inject.js in the page, chrome.* stubbed)
// in the real Entry engine, against the real room server - a room of its own (a made-up id; nothing goes to
// playentry.org). Two writers and a reader: what one writes the others see, both writing at once, an answer typed
// slowly, everybody gone and a newcomer reads it all, a reader who stops at once does not empty the room.
//   node test/real.mjs        EXT=<the extension's folder> (default: the one installed)
import fs from 'node:fs';
import path from 'node:path';
import { start, open } from './ui.mjs';
let EXT = process.env.EXT;
if (!EXT) {
    const base = path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Default/Extensions/ppkhmgmenfkjiajhfjpoepaldalhicll');
    if (fs.existsSync(base)) { const v = fs.readdirSync(base).sort().pop(); if (v) EXT = path.join(base, v); }
}
if (!EXT || !fs.existsSync(path.join(EXT, 'content.js'))) { console.log('Entry Sync is not installed here (EXT=<its folder>): left out'); process.exit(0); }
const contentJs = fs.readFileSync(path.join(EXT, 'content.js'), 'utf8'), injectJs = fs.readFileSync(path.join(EXT, 'inject.js'), 'utf8');
console.log('Entry Sync', JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version);
const room = [...Array(24)].map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
console.log('room', room);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const STUB = () => {
    const out = [];
    window.__sock = { sent: out, opened: 0, closed: 0 };
    const WS = window.WebSocket;
    window.WebSocket = function (u) {
        if (!/entry-sync/.test(String(u))) return new WS(u);
        const w = new WS(u); window.__sock.opened++; window.__ws = w;
        const send = w.send.bind(w);
        w.send = (d) => { try { const m = JSON.parse(d); out.push(m.type + (m.name ? ' ' + m.name : '')); if (out.length > 4000) out.splice(0, 2000); } catch (e) { } return send(d); };
        w.addEventListener('close', () => { window.__sock.closed++; });
        return w;
    };
    window.WebSocket.OPEN = WS.OPEN; window.WebSocket.CONNECTING = WS.CONNECTING; window.WebSocket.CLOSED = WS.CLOSED; window.WebSocket.CLOSING = WS.CLOSING;
    window.chrome = {
        storage: { local: { get: (k, cb) => setTimeout(() => cb({}), 0), set: () => { } }, onChanged: { addListener: () => { } } },
        runtime: { getURL: (f) => '/__ext/' + f, sendMessage: () => Promise.resolve(), onMessage: { addListener: () => { } } },
    };
};
const player = (nick) => open(nick, {
    query: '?project=' + room,
    prep: async (page) => {
        await page.addInitScript(STUB);
        await page.route('**/__ext/inject.js', (r) => r.fulfill({ contentType: 'text/javascript', body: injectJs }));
        await page.route(/playentry\.org/, (r) => r.abort());
    },
    // (content.js runs at document_end and puts inject.js into the page; the socket opens when the work starts)
    before: async (page) => { await page.addScriptTag({ content: contentJs }); await page.waitForTimeout(900); },
});
const up = async (p) => ok(await until(async () => +(await p.V('?!')) === 1), `${p.nick}: connected`);
const canWrite = (p) => until(async () => +(await p.V('ready')) === 1 && +(await p.V('me')) > 0, 15000);
const write = async (p, text) => { await p.btn(4); await p.ask(text); };
const sees = (p, text) => until(async () => (await p.find(text)) > 0, 12000);
const sent = (p) => p.page.evaluate(() => { const c = {}; for (const x of window.__sock.sent) c[x] = (c[x] || 0) + 1; return JSON.stringify(c); });
// stopping the work is what closes the extension's socket on a play page (and sends what the page holds)
const leave = async (p) => { await p.page.evaluate(() => Entry.engine.toggleStop()); await sleep(600); await p.page.close(); };

await start();
let A = await player('IKAE'); await up(A);
let B = await player('코딩재미있어'); await up(B);
let C = await player('구경꾼'); await up(C);
ok(await canWrite(A), 'IKAE may write (a new room: after 8 s)');
// 1. a topic, a subtopic, a post: the others see each as it is written
await write(A, '첫 대주제');
ok(await sees(B, '첫 대주제') && await sees(C, '첫 대주제'), '1. the topic IKAE made is on the other two screens');
await B.row(1); await C.row(1); await A.row(1);
ok(await canWrite(B), '코딩재미있어 may write');
await write(B, '첫 소주제');
ok(await sees(A, '첫 소주제') && await sees(C, '첫 소주제'), '   the subtopic 코딩재미있어 made, on the other two');
await A.row(1); await B.row(1); await C.row(1);
await write(A, 'IKAE의 첫 글');
ok(await sees(B, 'IKAE의 첫 글') && await sees(C, 'IKAE의 첫 글'), '   the post');
// 2. both at once (the answers are given within a moment of each other), five times
for (let i = 1; i <= 5; i++) {
    await A.btn(4); await B.btn(4);
    await Promise.all([A.ask('함께 쓴 글 가' + i), B.ask('함께 쓴 글 나' + i)]);
}
await sleep(2500);
{
    const a = await C.L('?!a'), b = await C.L('?!b');
    ok(a.length === 6 && b.length === 7, `2. ten posts written two at a time: the reader has them all (?!a ${a.length} of 6, ?!b ${b.length} of 7)`);
    ok(JSON.stringify(await A.L('?!a')) === JSON.stringify(a) && JSON.stringify(await B.L('?!b')) === JSON.stringify(b), '   and each writer has the other\'s');
}
// a reply by B under A's first post, seen nested by the reader
await B.btn(2); await B.btn(2);
await B.row(await B.find('IKAE의 첫 글')); await write(B, '답글입니다');
ok(await sees(C, '답글입니다'), '   a reply to the other\'s post');
ok((await B.L('?!a')).pop().startsWith('b2^'), '   its row hangs under that post: ' + (await B.L('?!a')).pop());
// the reader cannot write: a click where the button is
await C.click(96, -100); await sleep(400);
ok(+(await C.V('want')) === 0, '   the reader has no way to write');
// 3. an answer typed for 16 s (the room would sleep after 10 silent seconds if nobody wrote to it), the others gone
await leave(B); await leave(C);
await A.btn(4); await sleep(16000); await A.ask('천천히 쓴 글');
await sleep(1500);
console.log('     IKAE sent: ' + await sent(A));
const wantA = await A.L('?!a'), wantB = await A.L('?!b');
await leave(A);
await sleep(3000);
// 4. everybody gone; a stranger opens the work
let D = await player('처음온사람'); await up(D);
ok(await until(async () => (await D.L('?!b')).length === wantB.length && (await D.L('?!a')).length === wantA.length), `4. a newcomer is given it all (?!a ${(await D.L('?!a')).length} of ${wantA.length}, ?!b ${(await D.L('?!b')).length} of ${wantB.length})`);
ok(JSON.stringify(await D.L('?!b')) === JSON.stringify(wantB), '   the post typed slowly among them: ' + (await D.L('?!b')).pop());
await D.row(1); await D.row(1);
ok(await sees(D, '천천히 쓴 글') || await sees(D, '함께 쓴 글'), '   and reads the thread');
await D.shot('real_newcomer');
await leave(D);
// 5. a reader who starts and stops at once (before the room's rows have come), then another newcomer
let E = await open('성급한사람', {
    query: '?project=' + room,
    prep: async (page) => { await page.addInitScript(STUB); await page.route('**/__ext/inject.js', (r) => r.fulfill({ contentType: 'text/javascript', body: injectJs })); await page.route(/playentry\.org/, (r) => r.abort()); },
    before: async (page) => { await page.addScriptTag({ content: contentJs }); await page.waitForTimeout(900); },
});
console.log('     the hasty reader had ?!b ' + (await E.L('?!b')).length + ' rows when stopping, sent: ' + await sent(E));
await leave(E);
await sleep(2500);
let F = await player('또다른사람'); await up(F);
ok(await until(async () => (await F.L('?!b')).length === wantB.length && (await F.L('?!a')).length === wantA.length, 10000), `5. after a reader who stopped at once the room is whole (?!a ${(await F.L('?!a')).length} of ${wantA.length}, ?!b ${(await F.L('?!b')).length} of ${wantB.length})`);
// 6. a writer comes back and writes on: nothing of the old is lost
await leave(F);
A = await player('IKAE'); await up(A);
ok(await canWrite(A), '6. IKAE is back');
ok((await A.L('?!b')).length === wantB.length, '   with the rows of before');
await write(A, '돌아와서 쓴 대주제');
await sleep(1500);
await leave(A); await sleep(2500);
F = await player('마지막사람'); await up(F);
ok(await until(async () => (await F.L('?!b')).length === wantB.length + 1 && (await F.L('?!a')).length === wantA.length, 10000), `   and the new one kept on top of them (?!b ${(await F.L('?!b')).length} of ${wantB.length + 1})`);
for (const p of [A, B, C, D, E, F]) if (p.errors.length) { ok(false, p.nick + ' page errors: ' + p.errors.slice(0, 3).join(' | ')); }
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

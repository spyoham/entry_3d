// The board in the real Entry engine (the offline editor, headless), one page, Entry Sync's flag set by hand:
// the screens, writing at every level, a reply to a reply, deleting, the other writer, a reader who may not write.
//   node test/ui.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { ensureServer } from '../../gmp/erun.mjs';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'ui.ent');
let browser = null;
export async function start() {
    await buildProject(file);
    await ensureServer();
    browser = await chromium.launch();
    fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
    return browser;
}
// a page with the work loaded and running. `before(page)` runs before the work is started
export async function open(nick, { lists = null, query = '', prep = null, before = null } = {}) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (prep) await prep(page);
    await page.goto('http://localhost:3000/editor.html' + query);
    await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const b64 = fs.readFileSync(file).toString('base64');
    await page.evaluate(async ([b64, nick]) => {
        const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
        const r = await fetch('/api/load', { method: 'POST', body: fd });
        Entry.clearProject(); Entry.loadProject(await r.json());
        window.user = { nickname: nick };
    }, [b64, nick]);
    await page.waitForTimeout(1200);
    if (before) await before(page);
    await page.evaluate(() => Entry.engine.toggleRun());
    await page.waitForTimeout(500);
    const canvas = await page.$('#entryCanvas');
    const box = await canvas.boundingBox();
    const px = (x, y) => [box.x + (x + 240) / 480 * box.width, box.y + (135 - y) / 270 * box.height];
    const p = {
        nick, page, errors,
        V: (n) => page.evaluate((n) => { const v = Entry.variableContainer.variables_.find(v => v.name_ === n); return v ? v.value_ : undefined; }, n),
        L: (n) => page.evaluate((n) => { const v = Entry.variableContainer.lists_.find(v => v.name_ === n); return v ? v.array_.map(x => x.data) : undefined; }, n),
        setV: (n, x) => page.evaluate(([n, x]) => { Entry.variableContainer.variables_.find(v => v.name_ === n).setValue(x); }, [n, x]),
        setL: (n, a) => page.evaluate(([n, a]) => { const l = Entry.variableContainer.lists_.find(v => v.name_ === n); l.array_ = a.map(data => ({ data })); }, [n, a]),
        click: async (x, y) => { await page.mouse.move(...px(x, y)); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(350); },
        btn: (k) => p.click(k * 96 - 288, -100),
        row: (r) => p.click(-100, 110 - 15 * r + 7),
        ask: async (t) => {
            await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 10000 });
            await page.waitForTimeout(200);
            await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, t);
            await page.waitForTimeout(500);
        },
        shot: async (name) => { const d = await page.evaluate(() => document.querySelector('#entryCanvas').toDataURL('image/png')); fs.writeFileSync(path.join(HERE, 'shots', name + '.png'), Buffer.from(d.split(',')[1], 'base64')); },
        screen: () => p.L('scrT'),
        // the screen line that has `text` (1..), 0 if none
        find: async (text) => (await p.L('scrT')).findIndex(s => String(s).includes(text)) + 1,
    };
    if (lists) { for (const n in lists) await p.setL(n, lists[n]); await p.setV('?!made', 1); }
    return p;
}
if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    let fails = 0;
    const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
    await start();
    const A = await open('IKAE');
    await A.page.waitForTimeout(800);
    await A.shot('1_start');
    ok((await A.L('btnT'))[3] === '+ 대주제', 'a writer has the write button: ' + JSON.stringify(await A.L('btnT')));
    await A.btn(4);
    ok(String(await A.V('statS')).includes('연결'), 'not connected: no writing (' + (await A.V('statS')) + ')');
    await A.setV('?!', 1); await A.setV('?!made', 1);
    await A.page.waitForTimeout(4500);
    await A.btn(4); await A.page.waitForTimeout(400); await A.shot('2_ask'); await A.ask('게임 만들기');
    await A.btn(4); await A.ask('잡담');
    ok((await A.L('?!b')).length === 2 && (await A.L('?!a')).length === 0, 'IKAE writes ?!b alone: ' + JSON.stringify(await A.L('?!b')));
    await A.shot('3_topics');
    await A.row(1);
    ok((await A.V('depth')) == 1, 'a click on the topic enters it: ' + (await A.V('gHead')));
    await A.btn(4); await A.ask('3D 엔진을 어떻게 나눌까');
    await A.btn(4); await A.ask('그림과 소리');
    await A.shot('4_subs');
    await A.row(1);
    ok((await A.V('depth')) == 2, 'and the subtopic: ' + (await A.V('gHead')));
    await A.btn(4); await A.ask('렌더러는 내가 맡고, 물리는 네가 맡는 것으로 하자. 삼각형을 그리는 순서는 지난번에 이야기한 대로 뒤에서 앞으로 하고, 화면 밖의 것은 미리 빼는 것이 좋겠다. English words and 1234 numbers mixed in, to see where a long line is cut.');
    await A.btn(4); await A.ask('둘째 글');
    await A.row(2);   // the first post picked
    ok(String(await A.V('selId')) === 'b5', 'a post picked: ' + (await A.V('selId')));
    await A.shot('5_picked');
    await A.btn(4); await A.ask('첫 글에 다는 댓글');
    const rep = (await A.L('?!b')).length;
    // the reply picked (its line is found on the screen), and a reply to it, and one to that
    await A.row(await A.find('첫 글에 다는 댓글')); await A.btn(4); await A.ask('대댓글입니다');
    await A.row(await A.find('대댓글입니다')); await A.btn(4); await A.ask('대대댓글');
    const b = await A.L('?!b');
    ok(b[rep - 1].startsWith('b5^') && b[rep].startsWith(`b${rep}^`) && b[rep + 1].startsWith(`b${rep + 1}^`), 'reply under reply under reply: ' + JSON.stringify(b.slice(4).map(s => s.split('^')[0] + '^…^' + s.split('^')[2].slice(0, 8))));
    await A.shot('6_thread');
    console.log((await A.screen()).map(s => '   |' + s).join('\n'));
    // deleting: a post with replies has no delete button; the last reply has
    await A.row(await A.find('첫 글에 다는 댓글'));
    ok(String((await A.L('btnT'))[4]).trim() === '', 'a post with replies cannot be deleted');
    await A.row(await A.find('대대댓글'));
    ok(String((await A.L('btnT'))[4]).includes('지우기'), 'the last reply can');
    await A.btn(5); await A.ask('1');
    ok(/^b\d+\^\d+\^$/.test((await A.L('?!b'))[rep + 1]) && !(await A.find('대대댓글')), 'deleted: its row is kept without its text, and it is off the screen');
    await A.shot('7_deleted');
    // many posts: the page buttons
    for (let i = 1; i <= 6; i++) { await A.btn(4); await A.ask('글 ' + i + ' 번'); }
    ok((await A.find('글 6 번')) > 0, 'the post just written is in sight');
    await A.shot('8_long');
    await A.btn(2); await A.btn(2); await A.btn(2);
    ok((await A.V('top')) == 1, 'up to the top');
    await A.btn(1); await A.btn(1);
    ok((await A.V('depth')) == 0, 'back twice: the topics');
    await A.shot('9_back');
    const data = { '?!a': await A.L('?!a'), '?!b': await A.L('?!b') };
    ok(A.errors.length === 0, 'page errors: ' + (A.errors.slice(0, 3).join(' | ') || 'none'));
    // the other writer with the same rows: writes ?!a, and may not delete IKAE's
    const B = await open('코딩재미있어', { lists: data });
    await B.setV('?!', 1);
    await B.page.waitForTimeout(1500);
    await B.row(1); await B.row(1);
    await B.btn(4); await B.ask('코딩재미있어의 글');
    ok((await B.L('?!a')).length === 1 && (await B.L('?!a'))[0].startsWith('b3^'), 'the other writer writes ?!a: ' + JSON.stringify(await B.L('?!a')));
    await B.btn(2); await B.btn(2);
    await B.row(await B.find('둘째 글'));
    ok(String((await B.L('btnT'))[4]).trim() === '' && String((await B.L('btnT'))[3]).includes('답글'), "no deleting the other's post, a reply to it yes: " + JSON.stringify(await B.L('btnT')));
    await B.shot('10_other');
    ok(B.errors.length === 0, 'page errors: ' + (B.errors.slice(0, 3).join(' | ') || 'none'));
    // a reader
    const C = await open('지나가던사람', { lists: data });
    await C.setV('?!', 1);
    await C.page.waitForTimeout(1500);
    await C.row(1); await C.row(1);
    ok((await C.V('depth')) == 2 && (await C.find('렌더러는')) > 0, 'a reader reads the thread');
    ok((await C.L('btnT')).slice(3).every(s => String(s).trim() === ''), 'and has no write or delete button: ' + JSON.stringify(await C.L('btnT')));
    await C.click(96, -100);
    ok((await C.L('?!a')).length === 0 && (await C.V('want')) == 0, 'a click where the button would be does nothing');
    await C.shot('11_reader');
    // capitals count: 'ikae' is a reader
    const D = await open('ikae', { lists: data });
    ok((await D.V('me')) == 0, "'ikae' is not IKAE");
    ok(C.errors.length + D.errors.length === 0, 'page errors: none');
    await browser.close();
    console.log(fails ? fails + ' FAILED' : 'all ok');
    process.exit(fails ? 1 : 0);
}

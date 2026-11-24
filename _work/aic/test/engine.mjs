// The work in the real Entry engine (the offline editor, headless Chrome): every
// sentence is typed into the question, and the code, the bits and the restored
// sentence must be what the Node simulator gets.
//   node test/engine.mjs [file.ent] [--shot name]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { ensureServer } from '../../gmp/erun.mjs';
import { createSim } from '../sim.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args[0] && !args[0].startsWith('--') ? args[0] : path.join(HERE, '..', 'aic.ent');
const long = fs.readFileSync(path.join(HERE, '..', 'data', 'fwe_valid.txt'), 'latin1');
const tiny = fs.readFileSync(path.join(HERE, '..', 'data', 'tiny_valid.txt'), 'latin1');
const cases = [
    'Hello, my name is Tom.', 'I love you.', 'a', 'Z', '!', 'hi', 'HELLO WORLD', 'HELLO, HOW ARE YOU?',
    'The quick brown fox jumps over the lazy dog.', 'Compression is intelligence.', 'asdfghjkl qwertyuiop zxcvbnm',
    'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', '?!?!,,..  ..  !!', 'iPhone and eBay and NASA is OK. ok', 'Infinity', 'NaN', 'e',
    ' leading and trailing ', 'To be, or not to be, that is the question.',
    ...[254, 255, 256, 600, 2000].map(L => long.slice(5000, 5000 + L)), tiny.slice(3000, 3900),
];
const sim = createSim();
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const b64 = fs.readFileSync(file).toString('base64');
await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    Entry.clearProject(); Entry.loadProject(await r.json());
}, b64);
await page.waitForTimeout(1500);
await page.evaluate(() => Entry.engine.toggleRun());
const vars = (names) => page.evaluate((names) => { const o = {}; for (const n of names) { const v = Entry.variableContainer.variables_.find(v => v.name_ === n); o[n] = v ? v.value_ : undefined; } return o; }, names);
const ask = async (t) => {
    await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 60000 });
    await page.waitForTimeout(120);
    await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, t);
};
let fail = 0, runs = 0;
const until = async (n) => { const s = Date.now(); while (Date.now() - s < 120000) { if ((await vars(['runs'])).runs == n) return Date.now() - s; await page.waitForTimeout(30); } throw new Error('the work did not finish run ' + n); };
for (const c of cases) {
    const want = sim.compress(c);
    await ask(c);
    const ms = await until(++runs);
    const got = await vars(['out', 'encBits', 'dec', 'tRest']);
    const ok = String(got.out) === want.code && Number(got.encBits) === want.bits && String(got.dec) === c && String(got.tRest).includes('다르지 않습니다');
    if (!ok) { fail++; console.log('FAIL', JSON.stringify(c.slice(0, 60)), JSON.stringify(got).slice(0, 300), want.code.slice(0, 40), want.bits); }
    else console.log('ok', String(c.length).padStart(4), 'letters', String(want.bits).padStart(5), 'bits', String(ms).padStart(5), 'ms ', JSON.stringify(c.slice(0, 50)));
    // and the code alone, typed back
    if (c.length <= 600) {
        await ask('#' + want.code);
        await until(++runs);
        const g2 = await vars(['dec']);
        if (String(g2.dec) !== c) { fail++; console.log('FAIL code ->', JSON.stringify(String(g2.dec).slice(0, 60))); }
    }
}
const shot = args.indexOf('--shot');
if (shot >= 0) { fs.mkdirSync(path.join(HERE, '..', 'shots'), { recursive: true }); const d = await page.evaluate(() => document.querySelector('#entryCanvas').toDataURL('image/png')); fs.writeFileSync(path.join(HERE, '..', 'shots', args[shot + 1] + '.png'), Buffer.from(d.split(',')[1], 'base64')); }
await browser.close();
console.log(`${cases.length} sentences, ${fail} failures, page errors ${JSON.stringify(errors.slice(0, 3))}`);
process.exit(fail ? 1 : 0);

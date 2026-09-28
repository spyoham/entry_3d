// Opens 조각 만들기.html from disk (headless), waits for the sample, measures
// lamejs's leading delay, feeds it a file like a user would, and saves the
// .ent it makes (then: node etest.mjs from-page.ent).
// usage: node ptest.mjs [audio file]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const input = process.argv[2] || path.join(HERE, 'voice.wav');

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(url.pathToFileURL(path.join(HERE, '..', '..', '조각 만들기.html')).href);
const done = () => page.waitForFunction(() => ['완료'].includes(document.getElementById('status').textContent) || document.getElementById('status').classList.contains('err'), null, { timeout: 120000 });
let t = Date.now();
await done();
console.log('sample:', await page.textContent('#status'), (Date.now() - t) + ' ms', await page.evaluate(() => [...document.querySelectorAll('dl.stats dd')].map(d => d.textContent).join(' / ')));
await page.screenshot({ path: path.join(HERE, 'page_shot.png'), fullPage: true });

// lamejs: where does a click at 0.5 s land after Chrome decodes the MP3?
console.log('lame delay:', await page.evaluate(async () => {
    const x = new Float32Array(SR * 2); for (let i = 0; i < 200; i++) x[SR / 2 + i] = Math.sin(i / 3) * 0.8;
    const blob = await mp3(x);
    const d = (await new OfflineAudioContext(1, 1, SR).decodeAudioData(await blob.arrayBuffer())).getChannelData(0);
    let i = 0; while (Math.abs(d[i]) < 0.1) i++;
    return { firstAt: i, expected: SR / 2, delaySamples: i - SR / 2 + LAME_DELAY, withCut: LAME_DELAY };
}));

// a user's file
t = Date.now();
await page.setInputFiles('#pick', input);
await page.waitForFunction(() => document.getElementById('status').textContent !== '완료', null, { timeout: 10000 }).catch(() => {});
await done();
console.log('file:', await page.textContent('#fname'), '|', await page.textContent('#status'), (Date.now() - t) + ' ms', '|', await page.evaluate(() => [...document.querySelectorAll('dl.stats dd')].map(d => d.textContent).join(' / ')));
const got = await page.evaluate(async () => {
    const b64 = async (href) => { const u8 = new Uint8Array(await (await fetch(href)).arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
    const a = (id) => document.getElementById(id);
    return { ent: await b64(a('dlEnt').href), entName: a('dlEnt').download, grainName: a('dlGrain').download, voiceName: a('dlVoice').download, zip: (await zip([{ name: '가.txt', data: new Uint8Array([1, 2, 3]) }]).arrayBuffer()).byteLength };
});
fs.writeFileSync(path.join(HERE, 'from-page.ent'), Buffer.from(got.ent, 'base64'));
console.log('downloads:', got.entName, '|', got.grainName, '|', got.voiceName, '| zip test bytes', got.zip);
await browser.close();
console.log('errors:', errors.length ? errors : 'none');

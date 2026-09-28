// Runs pitch.ent in tessvm (needs _work/tessvm `node tsrv.mjs`), presses keys,
// records the audio engine's output and measures pitch and length.
// usage: node ttest.mjs [pitch.ent]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { readWav, writeWav, pitch } from './sim.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.resolve(process.argv[2] || path.join(HERE, 'pitch.ent'));
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(file)}`).then(r => r.text()).then(t => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => {
    const A = window.__vm.audio;
    window.__rec = []; window.__recOn = false; window.__plays = [];
    const ensure0 = A.ensure.bind(A);
    A.ensure = () => {
        const c = ensure0();
        if (c && A.master && !window.__sp) {
            const sp = c.createScriptProcessor(4096, 1, 1);
            A.master.connect(sp); sp.connect(c.destination); window.__sp = sp;
            sp.onaudioprocess = (e) => { if (window.__recOn) window.__rec.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
        }
        return c;
    };
    const play0 = A.play.bind(A);
    A.play = (sound, id, s, d) => { window.__plays.push({ s, d, speed: A.speed }); return play0(sound, id, s, d); };
    window.__handle.start();
});
const K = { 32: ['Space', ' '], 38: ['ArrowUp', 'ArrowUp'], 40: ['ArrowDown', 'ArrowDown'], 48: ['Digit0', '0'], 49: ['Digit1', '1'], 50: ['Digit2', '2'] };
const key = async (c) => {
    for (const type of ['keydown', 'keyup']) await page.evaluate(([type, code, k, kc]) => document.body.dispatchEvent(new KeyboardEvent(type, { code, key: k, keyCode: kc, which: kc, bubbles: true })), [type, ...K[c], c]);
    await page.waitForTimeout(80);
};
const recs = [];
const run = async (label, keys, ms) => {
    for (const k of keys.slice(0, -1)) await key(k);
    await page.evaluate(() => { window.__rec = []; window.__recOn = true; window.__plays = []; });
    await key(keys[keys.length - 1]);
    await page.waitForTimeout(ms);
    const r = await page.evaluate(() => {
        window.__recOn = false;
        const n = window.__rec.reduce((a, b) => a + b.length, 0), out = new Float32Array(n);
        let o = 0; for (const b of window.__rec) { out.set(b, o); o += b.length; }
        const v = window.__vm.variables.find(v => v.name === '$TESSVM');
        return { y: Array.from(out), sr: window.__vm.audio.context.sampleRate, plays: window.__plays.length, first: window.__plays[0], tess: v && v.value };
    });
    recs.push({ label, ...r });
};
await page.waitForTimeout(1500);
await run('+4 grains', [38, 38, 38, 38, 32], 11500);
await run('-12 grains', [...Array(16).fill(40), 32], 11500);
await run('original', [48, 49], 11500);
await browser.close();
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
const { sr: s0, x: v0 } = readWav(path.join(HERE, 'voice_trim.wav'));
const f0 = pitch(v0, s0);
for (const r of recs) {
    const y = Float64Array.from(r.y);
    const W = Math.round(r.sr * 0.02); let a = -1, b = -1;
    for (let s = 0; s + W < y.length; s += W) { let e = 0; for (let i = 0; i < W; i++) e += y[s + i] ** 2; if (Math.sqrt(e / W) > 0.01) { if (a < 0) a = s; b = s + W; } }
    let e = 0, n = 0; for (const v of y) if (Math.abs(v) > 0.003) { e += v * v; n++; }
    const f = pitch(y, r.sr);
    console.log(`[${r.label}] $TESSVM=${r.tess} plays ${r.plays} first ${JSON.stringify(r.first)}; sounding ${((b - a) / r.sr).toFixed(2)} s, pitch x${(f / f0).toFixed(3)}, rms ${Math.sqrt(e / n).toFixed(3)}`);
    writeWav(path.join(HERE, 'sim', `tess_${r.label.replace(/[^\w+-]/g, '_')}.wav`), y, r.sr);
}

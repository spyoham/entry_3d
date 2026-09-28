// Runs pitch.ent in the offline Entry editor (headless), presses keys, and logs
// every sound Entry starts (time, file range, speed, volume). Then rebuilds the
// output offline from the log (grains.wav) and measures pitch and length.
// usage: node etest.mjs [pitch.ent]   (needs entry-vibe-coding `node server.js`)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { readWav, writeWav, pitch } from './sim.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const file = process.argv[2] || new URL('./pitch.ent', import.meta.url).pathname.slice(1);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
await page.waitForTimeout(2000);
const res = await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    if (!r.ok) return { ok: false, status: r.status };
    Entry.clearProject();
    Entry.loadProject(await r.json());
    return { ok: true };
}, fs.readFileSync(file).toString('base64'));
if (!res.ok) { console.log('load failed', res); process.exit(1); }
await page.waitForTimeout(4000);
// the offline editor does not register the project's sounds: do it here, then
// tap SoundJS's master gain to record what actually comes out
console.log('sounds:', await page.evaluate(async () => {
    const snds = Object.values(Entry.container.objects_).flatMap(o => o.sounds || []);
    await Promise.all(snds.map(s => new Promise((res) => {
        if (createjs.Sound.loadComplete(s.id)) return res();
        createjs.Sound.on('fileload', (e) => { if (e.id === s.id) res(); });
        createjs.Sound.registerSound(s.fileurl, s.id);
        setTimeout(res, 10000);
    })));
    const ctx = createjs.WebAudioPlugin.context;
    const sp = ctx.createScriptProcessor(4096, 1, 1);
    createjs.Sound.activePlugin.gainNode.connect(sp);
    sp.connect(ctx.destination);
    window.__sp = sp;
    window.__rec = []; window.__recOn = false;
    sp.onaudioprocess = (e) => { if (window.__recOn) window.__rec.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    return snds.map(s => s.name + ':' + createjs.Sound.loadComplete(s.id)).join(' ') + ' @' + ctx.sampleRate + ' Hz';
}));
const takeRec = () => page.evaluate(() => {
    const n = window.__rec.reduce((a, b) => a + b.length, 0), out = new Int16Array(n);
    let o = 0; for (const b of window.__rec) for (let i = 0; i < b.length; i++) out[o++] = Math.max(-32767, Math.min(32767, Math.round(b[i] * 32767)));
    window.__rec = [];
    let s = ''; const u8 = new Uint8Array(out.buffer); for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return { b64: btoa(s), sr: createjs.WebAudioPlugin.context.sampleRate };
});
await page.evaluate(() => {
    window.__log = [];
    const orig = createjs.Sound.play.bind(createjs.Sound);
    createjs.Sound.play = function (id, opt) {
        const inst = orig(id, opt);
        const name = Object.values(Entry.container.objects_).flatMap(o => o.sounds || []).find(s => s.id === id)?.name;
        window.__log.push({ t: performance.now(), name, start: opt && opt.startTime, dur: opt && opt.duration, rate: Entry.playbackRateValue, vol: createjs.Sound.getVolume ? createjs.Sound.getVolume() : null, uvol: Entry.Utils._volume, ok: inst.playState });
        return inst;
    };
    Entry.engine.toggleRun();
});
const KEYS = { 32: 'Space', 38: 'ArrowUp', 40: 'ArrowDown', 48: 'Digit0', 49: 'Digit1', 50: 'Digit2', 83: 'KeyS' };
const key = (code) => page.keyboard.press(KEYS[code]);
const readVar = (n) => page.evaluate((n) => Entry.variableContainer.variables_.find(v => v.name_ === n)?.value_, n);
const wait = (ms) => page.waitForTimeout(ms);
const phases = [];
const recs = [];
const run = async (label, keys, ms) => {
    const play = keys[keys.length - 1];
    for (const k of keys.slice(0, -1)) { await key(k); await wait(120); }
    await page.evaluate(() => { window.__rec = []; window.__recOn = true; });
    await key(play);
    const t0 = await page.evaluate(() => performance.now());
    if (label === '+4 grains') { await wait(4000); await page.locator('canvas').first().screenshot({ path: new URL('./shot_play.png', import.meta.url).pathname.slice(1) }).catch(() => {}); await wait(ms - 4000); } else await wait(ms);
    await page.evaluate(() => { window.__recOn = false; });
    recs.push({ label, ...(await takeRec()) });
    phases.push({ label, t0, t1: await page.evaluate(() => performance.now()), st: await readVar('반음'), mode: await readVar('모드') });
};
await wait(1000);
await run('+4 grains', [38, 38, 38, 38, 32], process.env.SHORT ? 6500 : 11500);
await page.locator('canvas').first().screenshot({ path: new URL('./shot.png', import.meta.url).pathname.slice(1) }).catch(() => {});
if (!process.env.SHORT) await run('-7 grains', [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 32], 11500);
if (!process.env.SHORT) await run('+12 grains', [...Array(19).fill(38), 32], 11500);
await run('-12 grains', [...Array(24).fill(40), 32], process.env.SHORT ? 6500 : 11500);
await run('original', [48, 49], process.env.SHORT ? 6500 : 11500);
if (!process.env.SHORT) await run('speed only +7', [...Array(7).fill(38), 50], 8000);
// clicking a button (a text box with a background) casts its message
const box = await page.locator('canvas').first().boundingBox();
const clickAt = (x, y) => page.mouse.click(box.x + (x + 240) / 480 * box.width, box.y + (135 - y) / 270 * box.height);
const st0 = await readVar('반음');
await clickAt(150, -52); await wait(300); await clickAt(150, -52); await wait(300);
const st1 = await readVar('반음');
await clickAt(0, -52); await wait(300);
console.log('button clicks: 반음', st0, '-> ▼▼', st1, '-> 원래 높이', await readVar('반음'));
const log = await page.evaluate(() => window.__log);
const cnt = {}; for (const e of log) cnt[e.name + ':' + e.ok] = (cnt[e.name + ':' + e.ok] || 0) + 1; console.log('play states', cnt);
const txt = await page.evaluate(() => Object.values(Entry.container.objects_).filter(o => o.objectType === 'textBox').map(o => o.entity.getText()));
await browser.close();
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
console.log('texts:', txt.join(' | '));

// ---- rebuild each grain run from the log ----
const { sr, x: g } = readWav(new URL('./grains.wav', import.meta.url));
const { x: v0 } = readWav(new URL('./voice_trim.wav', import.meta.url));
const f0 = pitch(v0, sr);
console.log('source pitch', f0.toFixed(1), 'Hz, length', (v0.length / sr).toFixed(2), 's');
for (const ph of phases) {
    const ev = log.filter(e => e.t >= ph.t0 - 200 && e.t < ph.t1);
    const grains = ev.filter(e => e.name === '목소리 조각');
    console.log(`\n[${ph.label}] semitone ${ph.st}, events ${ev.length} (grains ${grains.length}), mode at end ${ph.mode}`);
    if (!grains.length) { console.log(ev.slice(0, 3)); continue; }
    const r = grains[0].rate;
    const first = grains[0].t, last = grains[grains.length - 1].t;
    const gaps = grains.slice(1).map((e, i) => e.t - grains[i].t);
    gaps.sort((a, b) => a - b);
    console.log(`  rate ${r}, volume ${grains[0].uvol}, requested ${grains[0].dur} ms, played over ${((last - first) / 1000).toFixed(2)} s, frame gap median ${gaps[gaps.length >> 1].toFixed(1)} ms max ${gaps[gaps.length - 1].toFixed(1)}`);
    const y = new Float64Array(Math.ceil((last - first) / 1000 * sr + sr));
    for (const e of grains) {
        const o0 = Math.round((e.t - first) / 1000 * sr);
        const s0 = Math.round(e.start / 1000 * sr);
        const real = Math.min(e.dur / 1000 / e.rate, e.dur / 1000);   // Entry: buffer end or clock stop
        const L = Math.floor(real * sr);
        for (let j = 0; j < L; j++) { const u = s0 + j * e.rate, i = Math.floor(u), a = u - i; y[o0 + j] += ((g[i] || 0) * (1 - a) + (g[i + 1] || 0) * a) * e.uvol; }
    }
    const f = pitch(y, sr);
    console.log(`  rebuilt pitch ${f.toFixed(1)} Hz = x${(f / f0).toFixed(3)} (want x${r})`);
    writeWav(new URL(`./sim/entry_${ph.label.replace(/[^\w+-]/g, '_')}.wav`, import.meta.url), y, sr);
}

// ---- what really came out of Entry ----
console.log('\n== recorded output ==');
for (const r of recs) {
    const i16 = new Int16Array(Uint8Array.from(Buffer.from(r.b64, 'base64')).buffer);
    const y = Float64Array.from(i16, v => v / 32767);
    // sounding span: first and last 20 ms window above -40 dB
    const W = Math.round(r.sr * 0.02); let a = -1, b = -1;
    for (let s = 0; s + W < y.length; s += W) { let e = 0; for (let i = 0; i < W; i++) e += y[s + i] ** 2; if (Math.sqrt(e / W) > 0.01) { if (a < 0) a = s; b = s + W; } }
    let pk = 0, clip = 0; for (const v of y) { pk = Math.max(pk, Math.abs(v)); if (Math.abs(v) > 0.99) clip++; }
    const f = pitch(y, r.sr);
    console.log(`[${r.label}] ${(y.length / r.sr).toFixed(2)} s recorded, sounding ${((b - a) / r.sr).toFixed(2)} s, pitch ${f.toFixed(1)} Hz = x${(f / f0).toFixed(3)}, peak ${pk.toFixed(2)}, clipped ${clip}`);
    writeWav(new URL(`./sim/rec_${r.label.replace(/[^\w+-]/g, '_')}.wav`, import.meta.url), y, r.sr);
}

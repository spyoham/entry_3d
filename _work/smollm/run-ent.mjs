// Headless runner: load an .ent in the offline editor, run it, report variables,
// take screenshots, optionally press keys.
// usage: node run-ent.mjs <file.ent> [--ms 5000] [--vars a,b,c] [--shot out.png] [--script steps.json]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const { chromium } = require('@playwright/test');

const args = process.argv.slice(2);
const file = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ms = Number(opt('ms', 5000));
const vars = (opt('vars', '') || '').split(',').filter(Boolean);
const shot = opt('shot', null);
const steps = opt('script', null) ? JSON.parse(fs.readFileSync(opt('script'), 'utf8')) : [];
const gpu = args.includes('--gpu');

const browser = await chromium.launch({ args: [...(gpu ? ['--use-gl=angle', '--enable-gpu'] : []), '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('crash', () => { console.log('PAGE CRASHED at', new Date().toISOString()); process.exit(2); });
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
await page.waitForTimeout(2000);
const bytes = fs.readFileSync(file).toString('base64');
const t0 = Date.now();
const res = await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    if (!r.ok) return { ok: false, status: r.status };
    const project = await r.json();
    Entry.clearProject();
    Entry.loadProject(project);
    return { ok: true };
}, bytes);
if (!res.ok) { console.log('load failed', res); process.exit(1); }
await page.waitForTimeout(Number(opt('settle', 3000)));
console.log('loaded in', Date.now() - t0, 'ms');
await page.evaluate(() => { window.__lc = []; Entry.addEventListener('loadComplete', () => window.__lc.push(performance.now())); window.__t0 = performance.now(); Entry.engine.toggleRun(); });
const readVars = () => page.evaluate((names) => {
    const out = {};
    for (const n of names) {
        const v = Entry.variableContainer.variables_.find(v => v.name_ === n) || Entry.variableContainer.lists_.find(v => v.name_ === n);
        out[n] = v ? (v.array_ ? v.array_.slice(0, 20).map(x => x.data) : v.value_) : undefined;
    }
    return out;
}, vars);
const canvasShot = async (p) => {
    const c = await page.$('#entryCanvas') || await page.$('canvas');
    await c.screenshot({ path: p });
};
let elapsed = 0;
for (const st of steps) {
    if (st.wait) { await page.waitForTimeout(st.wait); elapsed += st.wait; }
    if (st.down) await page.evaluate((k) => document.dispatchEvent(new KeyboardEvent('keydown', { code: k.code, key: k.key, keyCode: k.keyCode, which: k.keyCode, bubbles: true })), st.down);
    if (st.up) await page.evaluate((k) => document.dispatchEvent(new KeyboardEvent('keyup', { code: k.code, key: k.key, keyCode: k.keyCode, which: k.keyCode, bubbles: true })), st.up);
    if (st.shot) await canvasShot(st.shot);
    if (st.vars) console.log('t=' + elapsed, JSON.stringify(await readVars()));
    if (st.eval) console.log('eval', JSON.stringify(await page.evaluate(st.eval)));
}
if (opt('poll', null)) {
    // log wall-clock time of every change of one variable (answered between frames)
    const pv = opt('poll'); const until = opt('until', '99'); let last = null, t0 = Date.now();
    for (;;) {
        const v = await page.evaluate((n) => { const x = Entry.variableContainer.variables_.find(v => v.name_ === n); return x ? String(x.value_) : null; }, pv);
        if (v !== last) { console.log(`poll ${pv}=${v} at ${Date.now() - t0} ms`); last = v; }
        if (v === until || Date.now() - t0 > Number(opt('pollmax', 600000))) break;
        await page.waitForTimeout(5);
    }
}
if (opt('monitor', null)) {
    // every N seconds: JS heap + chosen vars (answered between Entry frames)
    const every = Number(opt('monitor')) * 1000, total = Number(opt('monmax', 1800)) * 1000, tm0 = Date.now();
    while (Date.now() - tm0 < total) {
        await page.waitForTimeout(every);
        const r = await page.evaluate((names) => {
            const o = { heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1 };
            for (const n of names) { const v = Entry.variableContainer.variables_.find(v => v.name_ === n); o[n] = v ? String(v.value_).slice(0, 120) : null; }
            return o;
        }, vars);
        console.log(`t=${Math.round((Date.now() - tm0) / 1000)}s`, JSON.stringify(r));
    }
}
if (opt('profile', null)) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    await page.waitForTimeout(Number(opt('profile')));
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map(), total = profile.samples.length;
    const byId = new Map(profile.nodes.map(n => [n.id, n]));
    const counts = new Map();
    for (const s of profile.samples) counts.set(s, (counts.get(s) || 0) + 1);
    for (const [id, c] of counts) {
        const n = byId.get(id); const cf = n.callFrame;
        const key = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber}:${cf.columnNumber}`;
        self.set(key, (self.get(key) || 0) + c);
    }
    console.log('--- self time top 40 ---');
    [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => console.log((100 * v / total).toFixed(1).padStart(5) + '%  ' + k));
}
if (opt('count', null)) {
    await page.evaluate(() => {
        window.__cnt = new Map();
        const orig = Entry.Scope.prototype.run;
        window.__typ = new Map();
        Entry.Scope.prototype.run = function (e, t) { const id = this.block && this.block.id; window.__cnt.set(id, (window.__cnt.get(id) || 0) + 1); const ty = this.block && this.block.type; window.__typ.set(ty, (window.__typ.get(ty) || 0) + 1); return orig.call(this, e, t); };
        window.__f0 = performance.now();
    });
    await page.waitForTimeout(Number(opt('count')));
    const res = await page.evaluate(() => ({ frames: (performance.now() - window.__f0) / 1000, cnt: [...window.__cnt.entries()], typ: [...window.__typ.entries()] }));
    const L = JSON.parse(fs.readFileSync(file + '.lines.json', 'utf8'));
    const perLine = new Map(), maxLine = new Map(); let total = 0;
    for (const [id, c] of res.cnt) { const ln = L.blockLines[id] || 0; perLine.set(ln, (perLine.get(ln) || 0) + c); maxLine.set(ln, Math.max(maxLine.get(ln) || 0, c)); total += c; }
    console.log(`seconds ${res.frames.toFixed(1)}, blocks/second ${(total / res.frames).toFixed(0)}  (all counts below are per second)`);
    console.log('per type:', res.typ.sort((a, b) => b[1] - a[1]).slice(0, 25).map(([t, c]) => `${t}=${(c / res.frames).toFixed(0)}`).join('  '));
    const fnOf = []; let curFn = '(top)';
    L.srcLines.forEach((t, i) => { const m = t.match(/^function (\w+)|^on\('(\w+)', '(\w+)'/); if (m) curFn = m[1] || (m[2] + ':' + m[3]); fnOf[i + 1] = curFn; });
    const perFn = new Map();
    for (const [ln, c] of perLine) perFn.set(fnOf[ln] || '?', (perFn.get(fnOf[ln] || '?') || 0) + c);
    console.log('per function:', [...perFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f, c]) => `${f}=${(c / res.frames).toFixed(0)}`).join('  '));
    [...perLine.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOPN || 45)).forEach(([ln, c]) => console.log(String((c / res.frames).toFixed(0)).padStart(7) + ' x' + String((maxLine.get(ln) / res.frames).toFixed(0)).padStart(5) + '  L' + ln + ': ' + (L.srcLines[ln - 1] || '').trim().slice(0, 110)));
}
if (ms > elapsed) await page.waitForTimeout(ms - elapsed);
console.log(JSON.stringify(await readVars()));
console.log('loadComplete at', JSON.stringify(await page.evaluate(() => window.__lc.map(t => Math.round(t - window.__t0)))));
if (shot) await canvasShot(shot);
console.log('errors:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();

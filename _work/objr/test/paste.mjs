// A real paste: an OBJ file on the clipboard, Ctrl+V into the answer box, Enter - in plain
// Entry (the offline editor) and in tessvm (the extension's player page).
//   node test/paste.mjs entry|tessvm file.obj|knot:NU:NV [more ...]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { ensureServer } from '../../gmp/erun.mjs';
import { knot } from '../models.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const [which, ...files] = process.argv.slice(2);
const ent = path.join(HERE, '..', 'objr.ent');
const textOf = (f) => { const m = /^knot:(\d+):(\d+)(:tri)?$/.exec(f); return m ? knot({ p: 3, q: 7, nu: +m[1], nv: +m[2], R: 2.2, r: 0.9, tube: 0.3, quads: !m[3] }) : fs.readFileSync(f, 'utf8'); };
fs.mkdirSync(path.join(HERE, '..', 'shots'), { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
let getVars, canvasSel, pressO, focusInput;
if (which === 'entry') {
    await ensureServer();
    await page.goto('http://localhost:3000/editor.html');
    await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const b64 = fs.readFileSync(ent).toString('base64');
    await page.evaluate(async (b64) => {
        const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
        const r = await fetch('/api/load', { method: 'POST', body: fd });
        Entry.clearProject(); Entry.loadProject(await r.json());
    }, b64);
    await page.waitForTimeout(1500);
    await page.evaluate(() => Entry.engine.toggleRun());
    getVars = (names) => page.evaluate((names) => { const V = Entry.variableContainer; const o = {}; for (const n of names) { const v = V.variables_.find(v => v.name_ === n); o[n] = v ? v.value_ : undefined; } return o; }, names);
    canvasSel = '#entryCanvas';
    pressO = async () => { await page.evaluate(() => { Entry.pressedKeys.push(79); }); await page.waitForTimeout(150); await page.evaluate(() => { Entry.pressedKeys = Entry.pressedKeys.filter(x => x !== 79); }); };
    // (the answer box is drawn on the canvas; the keys go to a hidden input of its own)
    focusInput = async () => {
        await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 30000 });
        await page.evaluate(() => Entry.stage.inputField.focus());
    };
} else {
    const PORT = 3100;
    await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(ent)}`).then(r => r.text()).then(t => { if (t !== 'ok') throw new Error(t); });
    await page.goto(`http://localhost:${PORT}/harness/index.html`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
    await page.evaluate(() => { window.__handle.start(); });
    getVars = (names) => page.evaluate((names) => { const out = {}; for (const n of names) { const v = window.__vm.variables.find(v => v.name === n); out[n] = v ? v.value : undefined; } return out; }, names);
    canvasSel = 'canvas';
    const key = (type) => page.evaluate((type) => document.body.dispatchEvent(new KeyboardEvent(type, { code: 'KeyO', key: 'o', keyCode: 79, which: 79, bubbles: true })), type);
    pressO = async () => { await key('keydown'); await page.waitForTimeout(150); await key('keyup'); };
    focusInput = async () => { await page.waitForSelector('.tessvm-ask:not([hidden]) input', { timeout: 30000 }); await page.focus('.tessvm-ask input'); };
}
const NAMES = ['nFaces', 'nVerts', 'nPages', 'rawN', 'nDup', 'closed', 'two', 'nBad', 'nDrop', 'nLv', 'cap', 'fpsNow', 'isTess'];
const waitLoaded = async (label, ms = 600000) => {
    const t0 = Date.now();
    let seen = false, last = '';
    const trace = [];
    while (Date.now() - t0 < ms) {
        const v = await getVars(['ldOn', 'shownLv', 'nLv', 'ldMsg']);
        if (v.ldOn > 0) seen = true;
        if (process.env.TRACE && v.ldMsg !== last) { last = v.ldMsg; trace.push(((Date.now() - t0) / 1000).toFixed(1) + ' ' + v.ldMsg); }
        if (seen && v.ldOn == 0 && (v.nLv == 0 || v.shownLv == 1)) break;
        if (!seen && Date.now() - t0 > 8000) { console.log('  (the reading never began)', JSON.stringify(v)); break; }
        await page.waitForTimeout(100);
    }
    console.log(label, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(await getVars(NAMES)));
    if (trace.length) console.log('   ', trace.filter((x, i) => i % 6 === 0 || !x.includes('읽는')).join(' | '));
};
await page.waitForTimeout(3000);
console.log('start', JSON.stringify(await getVars(NAMES)));
let k = 0;
for (const f of files) {
    const text = textOf(f);
    await page.evaluate((t) => navigator.clipboard.writeText(t), text);
    await pressO();
    await focusInput();
    await page.waitForTimeout(300);
    const t0 = Date.now();
    await page.keyboard.press('Control+V');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    console.log(`${f}: ${(text.length / 1024).toFixed(0)} KB, pasted in ${Date.now() - t0 - 500} ms`);
    if (process.env.COUNT) {
        await page.evaluate(() => { window.__cnt = {}; window.__ids = {}; for (const k of Object.keys(Entry.block)) { const b = Entry.block[k]; if (b && typeof b.func === 'function' && !b.__w) { const f = b.func; b.__w = 1; b.func = function (e, t) { window.__cnt[k] = (window.__cnt[k] || 0) + 1; const id = t && t.block && (t.block.id || (t.block.data && t.block.data.id)); if (id) window.__ids[id] = (window.__ids[id] || 0) + 1; return f.call(this, e, t); }; } } window.__t0 = performance.now(); });
        await page.waitForTimeout(Number(process.env.COUNT));
        const r = await page.evaluate(() => ({ ms: performance.now() - window.__t0, cnt: window.__cnt, ids: window.__ids }));
        if (fs.existsSync(ent + '.lines.json')) { const L = JSON.parse(fs.readFileSync(ent + '.lines.json', 'utf8')); const per = new Map(); for (const [id, n] of Object.entries(r.ids)) { const ln = L.blockLines[id]; if (ln !== undefined) per.set(ln, (per.get(ln) || 0) + n); } console.log('by source line (blocks run):'); for (const [ln, n] of [...per].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(n).padStart(9), String(ln).padStart(6), (L.srcLines[ln - 1] || '').trim().slice(0, 150)); }
        const tot = Object.values(r.cnt).reduce((a, b) => a + b, 0);
        const v = await getVars(['rawN', 'ldPos', 'ldLen', 'pnf', 'pg', 'tokCap']);
        console.log('blocks run', tot, 'in', r.ms.toFixed(0), 'ms =', (r.ms * 1000 / tot).toFixed(2), 'us each;', JSON.stringify(v));
        for (const [k, n] of Object.entries(r.cnt).sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(String(n).padStart(9), k);
    }
    if (process.env.PROF) {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 300 }); await cdp.send('Profiler.start');
        await page.waitForTimeout(Number(process.env.PROF));
        const { profile } = await cdp.send('Profiler.stop');
        const src = fs.readFileSync(path.join(HERE, '../../../entry-vibe-coding/public/lib/entry-js/dist/entry.min.js'), 'utf8');
        const lineStart = [0]; for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) lineStart.push(i + 1);
        const self = new Map(); let total = 0;
        const dt = new Map(); profile.samples.forEach((sm, i) => dt.set(sm, (dt.get(sm) || 0) + (profile.timeDeltas[i] || 0)));
        for (const n of profile.nodes) { const t = dt.get(n.id) || 0; total += t; const cf = n.callFrame; let k = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop().slice(0, 14) + ':' + cf.lineNumber + ':' + cf.columnNumber;
            if (cf.url.endsWith('entry.min.js')) { const o = lineStart[cf.lineNumber] + cf.columnNumber; const b = src.lastIndexOf('{key:"', o), c = src.lastIndexOf(':{color:', o); const near = Math.max(b, c); k += '  ~' + src.slice(near, near + 40).replace(/s+/g, ' ') + ' | ' + src.slice(o, o + 60); }
            self.set(k, (self.get(k) || 0) + t); }
        console.log('profile ms', (total / 1000).toFixed(0));
        for (const [k, t] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 24)) console.log((100 * t / total).toFixed(1).padStart(5) + '%  ' + k.slice(0, 190));
    }
    await waitLoaded('  read and drawn in');
    await page.waitForTimeout(800);
    if (process.env.SPIN) {
        // turning by itself for a while: what a frame gets done
        const setVar = (n, v) => page.evaluate(([n, v, w]) => { if (w === 'entry') Entry.variableContainer.variables_.find(x => x.name_ === n).value_ = v; else window.__vm.variables.find(x => x.name === n).value = v; }, [n, v, which]);
        await setVar('spin', 1);
        for (let i = 0; i < Number(process.env.SPIN); i++) { await page.waitForTimeout(1000); const v = await getVars(['cap', 'fpsNow', 'shownLv', 'isTess', 'LVNshown']); process.stdout.write(`  [${v.fpsNow}/s level ${v.shownLv} cap ${v.cap}]`); }
        console.log();
        await setVar('spin', 0);
        const t1 = Date.now();
        for (;;) { const v = await getVars(['shownLv', 'rOn', 'shownOut', 'isTess']); if ((v.shownLv == 1 && v.rOn == 0 && (v.isTess == 1 || v.shownOut == 1)) || Date.now() - t1 > 120000) break; await page.waitForTimeout(50); }
        console.log('  at rest, the model itself drawn after', ((Date.now() - t1) / 1000).toFixed(1) + 's');
    }
    k++;
    const c = await page.$(canvasSel);
    await c.screenshot({ path: path.join(HERE, '..', 'shots', `paste_${which}_${k}.png`) });
}
await browser.close();

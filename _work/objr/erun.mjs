// Drive the work in the real Entry engine (the offline editor, headless Chrome).
// usage: node erun.mjs file.ent '<steps>' [--headed] [--gpu]
// steps (JSON): ["wait",ms] ["ask","text"] ["key",code] ["hold",[code,ms]] ["drag",[x0,y0,x1,y1]] ["move",[x,y]]
//               ["shot","name"] ["vars",["a","b"]] ["until",["var",value,timeoutMs]] ["set",["var",value]]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { ensureServer } from '../gmp/erun.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args[0];
const steps = JSON.parse(args[1] || '[]');
await ensureServer();
const gpu = args.includes('--gpu');
const browser = await chromium.launch({ headless: !args.includes('--headed'), args: gpu ? ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
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
console.log('webgl', await page.evaluate(() => { try { return !!Entry.options.useWebGL; } catch { return '?'; } }));
await page.evaluate(() => {
    // frame times of the engine's own tick, to see what a frame costs
    window.__ft = [];
    let last = performance.now();
    const raf = () => { const n = performance.now(); window.__ft.push(n - last); last = n; if (window.__ft.length > 600) window.__ft.shift(); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
});
await page.evaluate(() => Entry.engine.toggleRun());
const t0 = Date.now();
const canvas = await page.$('#entryCanvas');
const box = await canvas.boundingBox();
const px = (x, y) => [box.x + (x + 240) / 480 * box.width, box.y + (135 - y) / 270 * box.height];
const getVars = (names) => page.evaluate((names) => { const V = Entry.variableContainer; const o = {}; for (const n of names) { const v = V.variables_.find(v => v.name_ === n); o[n] = v ? v.value_ : undefined; } return o; }, names);
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
for (const [kind, arg] of steps) {
    if (kind === 'ask') {
        await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 60000 });
        await page.waitForTimeout(300);
        await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, arg);
    }
    if (kind === 'wait') await page.waitForTimeout(arg);
    if (kind === 'key') { await page.evaluate((k) => { Entry.pressedKeys.includes(k) || Entry.pressedKeys.push(k); }, arg); await page.waitForTimeout(120); await page.evaluate((k) => { Entry.pressedKeys = Entry.pressedKeys.filter(x => x !== k); }, arg); await page.waitForTimeout(200); }
    if (kind === 'hold') { await page.evaluate((k) => { Entry.pressedKeys.push(k[0]); }, arg); await page.waitForTimeout(arg[1]); await page.evaluate((k) => { Entry.pressedKeys = Entry.pressedKeys.filter(x => x !== k[0]); }, arg); await page.waitForTimeout(200); }
    if (kind === 'move') await page.mouse.move(...px(arg[0], arg[1]));
    if (kind === 'drag') { const [a, b] = [px(arg[0], arg[1]), px(arg[2], arg[3])]; await page.mouse.move(...a); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(a[0] + (b[0] - a[0]) * i / 10, a[1] + (b[1] - a[1]) * i / 10); await page.waitForTimeout(40); } await page.mouse.up(); await page.waitForTimeout(200); }
    if (kind === 'shot') { const d = await page.evaluate(() => document.querySelector('#entryCanvas').toDataURL('image/png')); fs.writeFileSync(path.join(HERE, 'shots', `${arg}.png`), Buffer.from(d.split(',')[1], 'base64')); }
    if (kind === 'set') await page.evaluate(([n, v]) => { Entry.variableContainer.variables_.find(x => x.name_ === n).value_ = v; }, arg);
    if (kind === 'vars') { const ft = await page.evaluate(() => { const a = window.__ft.slice(-120); return { avg: a.reduce((x, y) => x + y, 0) / a.length, max: Math.max(...a) }; }); console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(await getVars(arg)), 'frame ms avg', ft.avg.toFixed(1), 'max', ft.max.toFixed(0)); }
    if (kind === 'prof') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
        await page.waitForTimeout(arg);
        const { profile } = await cdp.send('Profiler.stop');
        const self = new Map(); let total = 0;
        const dt = new Map(); profile.samples.forEach((sm, i) => dt.set(sm, (dt.get(sm) || 0) + (profile.timeDeltas[i] || 0)));
        for (const n of profile.nodes) { const t = dt.get(n.id) || 0; total += t; const k = (n.callFrame.functionName || '(anon)') + ' ' + n.callFrame.url.split('/').pop().slice(0, 18) + ':' + n.callFrame.lineNumber + ':' + n.callFrame.columnNumber; self.set(k, (self.get(k) || 0) + t); }
        console.log('profile ms', (total / 1000).toFixed(0));
        for (const [k, t] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 28)) console.log((100 * t / total).toFixed(1).padStart(5) + '%  ' + k);
    }
    if (kind === 'eval') console.log(JSON.stringify(await page.evaluate(arg)));
    if (kind === 'until') { const [n, v, to] = arg; const s = Date.now(); while (Date.now() - s < (to || 60000)) { if ((await getVars([n]))[n] == v) break; await page.waitForTimeout(100); } console.log('until', n, '=', v, 'after', ((Date.now() - s) / 1000).toFixed(1) + 's'); }
}
await browser.close();

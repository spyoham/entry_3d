// Run an .ent in the offline Entry editor (real entryjs) headless; wait until
// the variable `done` is 1, then print the listed variables.
// usage: node erun.mjs file.ent [--vars a,b] [--lists L] [--timeout 600000]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import cp from 'node:child_process';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

export async function ensureServer() {
    try { await fetch('http://localhost:3000/editor.html'); return null; } catch { }
    const p = cp.spawn('node', ['server.js'], { cwd: new URL('../../entry-vibe-coding/', import.meta.url).pathname, stdio: 'ignore', detached: true });
    p.unref();
    for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 200)); try { await fetch('http://localhost:3000/editor.html'); return p; } catch { } }
    throw new Error('server did not start');
}

export async function runEnt(file, { vars = [], lists = [], timeout = 600000, onPage, after, hiresTimer = true } = {}) {
    await ensureServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('http://localhost:3000/editor.html');
    await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const b64 = fs.readFileSync(file).toString('base64');
    const ok = await page.evaluate(async (b64) => {
        const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
        const r = await fetch('/api/load', { method: 'POST', body: fd });
        if (!r.ok) return false;
        Entry.clearProject(); Entry.loadProject(await r.json()); return true;
    }, b64);
    if (!ok) throw new Error('load failed');
    await page.waitForTimeout(1500);
    // benchmark clock: the project timer only moves between frames, so the
    // harness makes the timer block read the wall clock (measurement only)
    if (hiresTimer) await page.evaluate(() => { Entry.block.get_project_timer_value.func = () => performance.now() / 1000; });
    if (onPage) await onPage(page);
    const t0 = Date.now();
    await page.evaluate(() => Entry.engine.toggleRun());
    const read = () => page.evaluate(({ names, lnames }) => {
        const out = {};
        const V = Entry.variableContainer;
        for (const n of names) { const v = V.variables_.find(v => v.name_ === n); out[n] = v ? v.value_ : undefined; }
        for (const n of lnames) { const v = V.lists_.find(v => v.name_ === n); out[n] = v ? v.array_.map(x => x.data) : undefined; }
        return out;
    }, { names: vars, lnames: lists });
    let done = false;
    while (Date.now() - t0 < timeout) {
        const d = await page.evaluate(() => { const v = Entry.variableContainer.variables_.find(v => v.name_ === 'done'); return v ? v.value_ : null; });
        if (d == 1) { done = true; break; }
        await page.waitForTimeout(100);
    }
    const res = await read();
    if (after) await after(page);
    await browser.close();
    return { done, ms: Date.now() - t0, vars: res, errors };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
    const args = process.argv.slice(2);
    const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
    const r = await runEnt(args[0], { vars: (opt('vars', '') || '').split(',').filter(Boolean), lists: (opt('lists', '') || '').split(',').filter(Boolean), timeout: Number(opt('timeout', 600000)) });
    console.log(JSON.stringify(r, null, 1));
}

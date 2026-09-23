// Can the local Entry editor SAVE a project this big? Loads an .ent, then does exactly what
// the editor's 저장 button does (Entry.exportProject -> JSON.stringify -> POST /api/export)
// and reports the returned .ent size plus the renderer's peak heap.
//   node save_test.mjs <file.ent> [out.ent]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/spyoh/entry_3d/entry-vibe-coding/package.json');
const { chromium } = require('@playwright/test');

const file = process.argv[2];
const out = process.argv[3];
const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--max-old-space-size=6000'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('crash', () => { console.log('PAGE CRASHED'); process.exit(2); });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
const heap = async (tag) => console.log(tag, 'heap', await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6)), 'MB');

const b64 = fs.readFileSync(file).toString('base64');
let t = Date.now();
const loaded = await page.evaluate(async (b) => {
    const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    if (!r.ok) return { ok: false, status: r.status };
    const project = await r.json();
    Entry.clearProject();
    Entry.loadProject(project);
    return { ok: true };
}, b64);
console.log('load', loaded, Date.now() - t, 'ms');
await page.waitForTimeout(8000);
await heap('after load');

t = Date.now();
const res = await page.evaluate(async () => {
    try {
        const project = Entry.exportProject({});
        const body = JSON.stringify(project);
        const r = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!r.ok) return { ok: false, status: r.status, text: (await r.text()).slice(0, 300) };
        const buf = await r.arrayBuffer();
        let s = '';
        const u = new Uint8Array(buf);
        for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return { ok: true, jsonMB: +(body.length / 1e6).toFixed(1), entMB: +(buf.byteLength / 1e6).toFixed(1), b64: btoa(s) };
    } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
    }
});
console.log('export', { ...res, b64: res.b64 ? res.b64.length + ' b64 chars' : undefined }, Date.now() - t, 'ms');
await heap('after export');
if (res.ok && out) { fs.writeFileSync(out, Buffer.from(res.b64, 'base64')); console.log('wrote', out); }
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();

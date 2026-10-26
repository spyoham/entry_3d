// v1.1: does the work start in plain Entry (the local editor, :3000)? Runs it and reports when
// the start script is through (ready = 1) and a few unpacked lists.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('E:/entry_3d/entry-vibe-coding/package.json');
const { chromium } = require('@playwright/test');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + ' | ' + String(e.stack || '').split(String.fromCharCode(10)).slice(0, 4).join(' | ')));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('console: ' + m.text().slice(0, 400)); });
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
const b64 = fs.readFileSync(process.argv[2]).toString('base64');
await page.evaluate(async (b) => {
    const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
    const project = await (await fetch('/api/load', { method: 'POST', body: fd })).json();
    Entry.clearProject(); Entry.loadProject(project);
}, b64);
await page.waitForTimeout(5000);
const t0 = Date.now();
await page.evaluate(() => Entry.engine.toggleRun());
const get = () => page.evaluate(() => { const V = (n) => Entry.variableContainer.getVariableByName(n) || Entry.variableContainer.getListByName(n); const L = (n) => V(n).getArray().map(x => x.data);
    return { ready: V('ready').getValue(), TH: L('TH').length, TH5: L('TH')[4], CT1: L('CT')[0], IX: L('IX').length, MLX0: L('MLX0').slice(0, 3) }; });
let r;
for (let i = 0; i < (Number(process.argv[3]) || 120); i++) { await page.waitForTimeout(1000); r = await get(); if (r.ready == 1) break; }
await page.screenshot({ path: 'test/plain.png' });
console.log('after', Math.round((Date.now() - t0) / 1000), 's', JSON.stringify(r));
console.log('errors:', errors.slice(0, 5));
await browser.close();

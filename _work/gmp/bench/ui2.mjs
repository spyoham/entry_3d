// Drive the demo in the editor, poll state while a long step runs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ensureServer } from '../erun.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = process.argv[2];
const steps = JSON.parse(process.argv[3]);
const polls = Number(process.argv[4] || 12);
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message, (e.stack || '').slice(0, 800)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 800)); });
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
const answer = async (text) => {
    await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 60000 });
    await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, text);
};
for (const t of steps) { await page.waitForTimeout(800); await answer(t); }
for (let i = 0; i < polls; i++) {
    await page.waitForTimeout(5000);
    const st = await Promise.race([page.evaluate(() => {
        const V = Entry.variableContainer;
        const g = (n) => { const v = V.variables_.find(v => v.name_ === n); return v ? String(v.value_).slice(0, 120) : undefined; };
        return { ui: g('ui_text'), run: Entry.engine.state, ask: !Entry.stage.inputField._isHidden, errno: g('gmp_errno') };
    }), new Promise(r => setTimeout(() => r('page busy'), 4000))]);
    console.log(i, JSON.stringify(st));
    if (st.ask) break;
}
const c = await page.$('#entryCanvas') || await page.$('canvas'); await c.screenshot({ path: 'bench/ui2.png' });
await browser.close();

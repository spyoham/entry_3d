// Drive the demo in the real Entry editor: answer the menu, take screenshots
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ensureServer } from '../erun.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = process.argv[2] || 'gmp.ent';
const script = JSON.parse(process.argv[3] || '[["1","200"],["2","M127"],["4","2 ^ 300"]]');
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
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
const shot = async (name) => { const c = await page.$('#entryCanvas') || await page.$('canvas'); await c.screenshot({ path: `bench/${name}.png` }); };
// type an answer into Entry's ask box
const answer = async (text) => {
    await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 900000 });
    await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, text);
};
await page.waitForTimeout(1500);
await shot('ui_0');
let n = 1;
for (const steps of script) {
    for (const t of steps) { await page.waitForTimeout(800); await answer(t); }
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 900000 });
    await page.waitForTimeout(500);
    await shot('ui_' + n++);
}
console.log('errors:', errors.slice(0, 5));
await browser.close();

// Drive the demo and the digit viewer: answers, then key presses / drags, a shot after each step
// usage: node bench/ui3.mjs file.ent '[["ask","1"],["ask","1000"],["wait",3000],["key",40],["shot","a"],["drag",[0,0,0,60]],["click",[220,0]]]'
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ensureServer } from '../erun.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = process.argv[2];
const steps = JSON.parse(process.argv[3]);
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
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
const canvas = await page.$('#entryCanvas');
const box = await canvas.boundingBox();
// stage (x, y) -> page pixels
const px = (x, y) => [box.x + (x + 240) / 480 * box.width, box.y + (135 - y) / 270 * box.height];
for (const [kind, arg] of steps) {
    if (kind === 'ask') {
        await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 900000 });
        await page.waitForTimeout(300);
        await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, arg);
    }
    if (kind === 'wait') await page.waitForTimeout(arg);
    if (kind === 'key') { await page.evaluate((k) => { Entry.pressedKeys.includes(k) || Entry.pressedKeys.push(k); }, arg); await page.waitForTimeout(arg2(steps, kind) || 60); await page.evaluate((k) => { Entry.pressedKeys = Entry.pressedKeys.filter(x => x !== k); }, arg); await page.waitForTimeout(300); }
    if (kind === 'hold') { await page.evaluate((k) => { Entry.pressedKeys.push(k[0]); }, arg); await page.waitForTimeout(arg[1]); await page.evaluate((k) => { Entry.pressedKeys = Entry.pressedKeys.filter(x => x !== k[0]); }, arg); await page.waitForTimeout(300); }
    if (kind === 'drag') { const [a, b] = [px(arg[0], arg[1]), px(arg[2], arg[3])]; await page.mouse.move(...a); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(a[0] + (b[0] - a[0]) * i / 10, a[1] + (b[1] - a[1]) * i / 10); await page.waitForTimeout(30); } await page.mouse.up(); await page.waitForTimeout(300); }
    if (kind === 'click') { await page.mouse.move(...px(arg[0], arg[1])); await page.mouse.down(); await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(300); }
    if (kind === 'shot') await canvas.screenshot({ path: `bench/v_${arg}.png` });
    if (kind === 'state') console.log(arg, JSON.stringify(await page.evaluate(() => { const V = Entry.variableContainer; const g = (n) => { const v = V.variables_.find(v => v.name_ === n); return v ? v.value_ : undefined; }; return { top: g('vw_top'), on: g('vw_on'), lines: g('vw_lines'), ask: !!(Entry.stage.inputField && !Entry.stage.inputField._isHidden) }; })));
}
function arg2() { return 60; }
await browser.close();

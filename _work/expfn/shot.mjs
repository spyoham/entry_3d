// The shipped .ent in the editor: the function blocks as the editor draws them, and the demo answering x = 1.
// usage: node shot.mjs  -> shots/*.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ensureServer } from '../gmp/erun.mjs';
import { HERE } from './lib.mjs';
import { NAME, VERSION } from './build.mjs';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const b64 = fs.readFileSync(path.join(HERE, '..', '..', `${NAME} v${VERSION}.ent`)).toString('base64');
await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
    const r = await fetch('/api/load', { method: 'POST', body: fd });
    Entry.clearProject(); Entry.loadProject(await r.json());
}, b64);
await page.waitForTimeout(2000);
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
await page.screenshot({ path: path.join(HERE, 'shots', 'object.png') });
const n = await page.evaluate(() => Object.keys(Entry.variableContainer.functions_).length);
for (let i = 0; i < n; i++) {
    await page.evaluate((i) => { const f = Object.values(Entry.variableContainer.functions_)[i]; Entry.Func.edit(f); }, i);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(HERE, 'shots', `func${i + 1}.png`) });
    await page.evaluate(() => Entry.Func.cancelEdit ? Entry.Func.cancelEdit() : Entry.Func.save());
    await page.waitForTimeout(800);
}
await page.evaluate(() => Entry.engine.toggleRun());
const said = [];
for (const x of ['1', '-1000', '700']) {
    await page.waitForFunction(() => Entry.stage.inputField && !Entry.stage.inputField._isHidden, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    await page.evaluate((t) => { Entry.stage.inputField.value(t); Entry.dispatchEvent('canvasInputComplete'); }, x);
    await page.waitForTimeout(700);
    said.push(await page.evaluate(() => { const o = Entry.container.getAllObjects()[0]; return o.entity.dialog ? o.entity.dialog.message_ : null; }));
}
await page.screenshot({ path: path.join(HERE, 'shots', 'run.png') });
console.log(JSON.stringify({ functions: n, said, errors }, null, 1));
await browser.close();

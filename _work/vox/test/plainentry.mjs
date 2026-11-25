// (v3.5) plain Entry (no tessvm): the work says so and runs nothing - no clones, no lists unpacked, no error.
// Needs the entry-vibe-coding server (node server.js, :3000).   node test/plainentry.mjs file.ent [shot.png]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('E:/entry_3d/entry-vibe-coding/package.json');
const { chromium } = require('@playwright/test');
const file = process.argv[2], shot = process.argv[3] || 'test/plainentry.png';
const browser = await chromium.launch({ args: ['--js-flags=--max-old-space-size=6000'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:3000/editor.html');
await page.waitForFunction(() => typeof Entry !== 'undefined' && Entry.engine, null, { timeout: 30000 });
const b64 = fs.readFileSync(file).toString('base64');
const loaded = await page.evaluate(async (b) => {
  const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  const fd = new FormData(); fd.append('ent', new Blob([bin]), 'x.ent');
  const r = await fetch('/api/load', { method: 'POST', body: fd });
  if (!r.ok) return { ok: false, status: r.status };
  Entry.clearProject(); Entry.loadProject(await r.json());
  return { ok: true };
}, b64);
console.log('loaded', JSON.stringify(loaded));
await page.waitForTimeout(6000);
const t0 = Date.now();
await page.evaluate(() => { Entry.engine.toggleRun(); });
await page.waitForTimeout(5000);
const st = await page.evaluate(() => {
  const objs = Entry.container.getAllObjects();
  const clones = objs.reduce((n, o) => n + (o.clonedEntities ? o.clonedEntities.length : 0), 0);
  const v = (n) => { const x = Entry.variableContainer.getVariableByName(n); return x ? x.getValue() : null; };
  const L = (n) => { const x = Entry.variableContainer.getListByName(n); return x ? x.getArray().length : -1; };
  // the scripts still running (an executor left on any code)
  let running = 0;
  for (const o of objs) { const c = o.script; if (c && c.executors) running += c.executors.length; for (const e of (o.clonedEntities || [])) { /* clones share the object's code */ } }
  return { state: Entry.engine.state, clones, running, gState: v('gState'), frames: v('frames'), TXS: L('TXS'), W: L('W'), BSOL: L('BSOL'), text: (objs.find((o) => o.objectType === 'textBox') || { entity: { getText: () => '' } }).entity.getText() };
});
console.log('after 5 s:', JSON.stringify(st));
const canvas = await page.$('#entryCanvas');
if (canvas) await canvas.screenshot({ path: shot });
console.log('page errors', errors.length, errors.slice(0, 3).join(' | '));
const okAll = loaded.ok && !errors.length && st.clones === 0 && st.running === 0 && st.TXS === 0 && st.W === 0 && String(st.text).includes('tessvm');
console.log(okAll ? 'all ok' : 'FAILED');
await browser.close();
process.exit(okAll ? 0 : 1);

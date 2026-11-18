// (v3.1) does the real Entry editor open the work as built (the params' end nulls taken out, short local
// ids) and give the same blocks back? Needs the entry-vibe-coding server (node server.js, :3000).
//   node test/edcheck.mjs file.ent
import { createRequire } from 'node:module';
import fs from 'node:fs';
import zlib from 'node:zlib';
import cp from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const require = createRequire('E:/entry_3d/entry-vibe-coding/package.json');
const { chromium } = require('@playwright/test');
const file = process.argv[2];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'edc'));
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const orig = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
const DEF = { x: 0, y: 0, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true };
const norm = (b) => {
  if (!b || typeof b !== 'object') return b;
  if (Array.isArray(b)) return b.map(norm);
  const o = {};
  for (const k of Object.keys(b).sort()) {
    // ((v3.2) the build leaves ids only on a function's local-variable blocks: those must come back the same)
    if (k === 'id' && b.type !== 'get_func_variable' && b.type !== 'set_func_variable') continue;
    if (k in DEF && (b[k] === DEF[k] || b[k] === undefined)) continue;
    if ((k === 'extensions' || k === 'statements') && Array.isArray(b[k]) && !b[k].length) continue;
    if (k === 'params') { const p = b[k].map(norm); while (p.length && (p[p.length - 1] === null || p[p.length - 1] === undefined)) p.pop(); o[k] = p; continue; }
    o[k] = norm(b[k]);
  }
  return o;
};
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
await page.waitForTimeout(8000);
const fns = await page.evaluate(() => { const p = Entry.exportProject({}); return p.functions.map((f) => ({ id: f.id, content: f.content, localVariables: f.localVariables })); });
let same = 0, diff = 0, first = '';
const byId = new Map(fns.map((f) => [f.id, f]));
for (const f of orig.functions) {
  const g = byId.get(f.id);
  const a = JSON.stringify(norm(JSON.parse(f.content))), b = g ? JSON.stringify(norm(JSON.parse(g.content))) : '';
  if (a === b && JSON.stringify((f.localVariables || []).map((v) => v.id)) === JSON.stringify(((g && g.localVariables) || []).map((v) => v.id))) same++;
  else { diff++; if (!first) { let i = 0; while (i < a.length && a[i] === b[i]) i++; first = `${f.id}: ...${a.slice(Math.max(0, i - 80), i + 80)} | ...${b.slice(Math.max(0, i - 80), i + 80)}`; } }
}
console.log(`functions ${orig.functions.length}: the same after the editor ${same}, different ${diff}${first ? '\n' + first : ''}`);
{ const ids = new Set(); let dup = 0, four = 0; for (const f of orig.functions) for (const m of f.content.matchAll(/"id":"([^"]+)"/g)) { if (ids.has(m[1])) dup++; ids.add(m[1]); if (m[1].length === 4) four++; } console.log(`ids kept in the build: ${ids.size}, the same twice: ${dup}, 4 letters long (as the editor makes them): ${four}`); if (dup || four) errors.push('ids'); }
console.log('page errors', errors.length, errors.slice(0, 3).join(' | '));
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(diff === 0 && loaded.ok && !errors.length ? 'all ok' : 'FAILED');

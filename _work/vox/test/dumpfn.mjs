// the code tessvm (Chrome) made for named functions: node test/dumpfn.mjs name [name...]
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url'; import { createRequire } from 'node:module';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.join(HERE, 'torchweb.ent');
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(file)}`).then(r => r.text());
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3100/harness/' + (process.env.PAGE || 'index') + '.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const r = await page.evaluate((names) => {
  const src = window.__progSrc, nm = window.__fnNames; const lines = src.split('\n'); const out = {};
  for (const n of names) { const k = nm.indexOf(n); const st = lines.findIndex(l => l.startsWith(`F[${k}] = `)); let en = st + 1; while (en < lines.length && !/^F\[\d+\] = /.test(lines[en]) && !lines[en].startsWith('return { scripts')) en++; out[n] = lines.slice(st, en).join('\n'); }
  return out;
}, process.argv.slice(2));
for (const [k, v] of Object.entries(r)) { console.log('=====', k); console.log(v.slice(0, 6000)); }
await browser.close();

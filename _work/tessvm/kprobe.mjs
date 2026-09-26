// List tessvm kernel roots / rejected reasons by Entry function name.
// usage: node kprobe.mjs file.ent [filterRegex]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.resolve(process.argv[2]);
const re = new RegExp(process.argv[3] || '.');
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(file)}`).then(r => r.text());
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const r = await page.evaluate(() => {
  const vm = window.__vm, P = vm.kernelPlan, names = window.__fnNames;
  const out = { roots: [...P.roots.keys()].map(i => names[i]), rej: [] };
  const byId = new Map(); (window.__fnIds || []).forEach((id, i) => byId.set(id, names[i]));
  for (const [id, why] of P.rejected) out.rej.push([byId.get(id) || id, why]);
  return out;
});
console.log('roots', r.roots.join(' '));
await browser.close();
console.log('rejected', r.rej.length);
console.log(JSON.stringify(r.rej.filter(([, w]) => re.test(w))));

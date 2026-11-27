// (v3.5, 11-28) the data lists the build keeps packed come back in the REAL tessvm page as the build made them -
// those with decimals too (kept as whole tenths .. ten-thousandths and divided as they are unpacked: the engine's
// own division must give 1.5 for 15 / 10, as the simulator's does).
//   node ../tessvm/tsrv.mjs (port 3100), then: node test/tesspack35.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { buildProject, makeData } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tesspack.ent');
buildProject(file, { name: 'tesspack', more: { TESTRUN: 1, ANIMALS: 0 } });
const { L } = makeData();
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=pack`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
await new Promise((r) => setTimeout(r, 6000));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const names = Object.keys(L);
const got = await page.evaluate((names) => { const r = {}; for (const n of names) { const l = window.__vm.variables.find((v) => v.name === n && v.isList); r[n] = l ? l.array.map((x) => x.data) : null; } return r; }, names);
let lists = 0, items = 0, bad = [], dec = 0;
for (const n of names) {
  const g = got[n], v = L[n];
  if (!g) continue;
  lists++; items += v.length;
  if (v.some((x) => typeof x === 'number' && !Number.isInteger(x))) dec++;
  // (a number may come back as its text: the same number is the same value)
  let d = g.length !== v.length ? 1 : 0;
  for (let i = 0; i < v.length && !d; i++) if (typeof v[i] === 'number' ? Number(g[i]) !== v[i] : String(g[i]) !== String(v[i])) d = i + 1;
  if (d) bad.push(`${n}[${d}] ${JSON.stringify(g[d - 1])} for ${JSON.stringify(v[d - 1])}`);
}
ok(bad.length === 0 && lists > 200, `${lists} data lists (${items} items; ${dec} of them hold decimals) are in the page as the build made them${bad.length ? ': ' + bad.slice(0, 4).join('; ') : ''}`);
const ve = await page.evaluate(() => (window.__vm.errors || []).map((e) => String(e && e.message ? e.message : e)).slice(0, 3));
ok(ve.length === 0, `no errors on the page (${ve.join(' | ')})`);
await browser.close();
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

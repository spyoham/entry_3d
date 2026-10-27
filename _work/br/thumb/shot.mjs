// stills for the thumbnail (needs tessvm tsrv.mjs and a BENCH=1 build): node thumb/shot.mjs bench.ent outdir shots.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const [file, outDir, js] = process.argv.slice(2);
const o = JSON.parse(fs.readFileSync(js, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(path.resolve(file))}`);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find(q => q.name === n); return v.isList ? v.array.map(x => x.data) : v.value; }, n);
const S = (kv) => page.evaluate((kv) => { for (const [n, val] of Object.entries(kv)) { const v = window.__vm.variables.find(q => q.name === n); v.setValue ? v.setValue(val) : (v.value = val); } }, kv);
await page.waitForTimeout(1500);
await S(o.set || {});
await page.waitForTimeout(o.wait || 5000);
for (const sh of o.shots) {
  if (sh.wait) await page.waitForTimeout(sh.wait);
  if (sh.pyaw !== undefined) await S({ plYaw: sh.pyaw, plPitch: sh.ppitch ?? 0 });
  await S({ camThird: sh.fp ? 0 : 1, thK: 0 });
  await page.waitForTimeout(150);
  const X = await V('plX'), Y = await V('plY'), Z = await V('plZ'), yaw = await V('plYaw');
  const r = Math.PI / 180, fx = Math.sin(yaw * r), fz = Math.cos(yaw * r), rx = fz, rz = -fx;
  const cx = X - fx * sh.back + rx * sh.side, cz = Z - fz * sh.back + rz * sh.side, cy = Y + sh.up;
  await S({ thK: 1, thX: cx, thY: cy, thZ: cz, thYaw: yaw + (sh.yaw || 0), thP: sh.pitch || 0 });
  await page.waitForTimeout(sh.settle || 500);
  await (await page.$('canvas')).screenshot({ path: path.join(outDir, sh.name + '.png') });
  console.log('shot', sh.name, X.toFixed(0), Y.toFixed(0), Z.toFixed(0), yaw);
}
await browser.close();

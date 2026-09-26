// Free-camera stills from a race in tessvm (needs a build with the thK hook).
// usage: node thumbshot.mjs file.ent outdir '{"trk":1,"gfx":3,"car":2,"shots":[{"seg":40,"back":14,"side":6,"up":9,"ahead":6,"fov":62}]}'
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const [file, outDir, js] = process.argv.slice(2);
const o = JSON.parse(js);
fs.mkdirSync(outDir, { recursive: true });
const stepsFile = path.join(outDir, 'steps.json');
execFileSync('node', [new URL('../racing/t7/mkb.mjs', import.meta.url).pathname, stepsFile, JSON.stringify({ trk: o.trk, gfx: o.gfx, secs: 4, shots: 1 })]);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8')).filter(s => !s.fps || s.fps === 'menu');
await fetch(`http://localhost:3100/load?file=${encodeURIComponent(path.resolve(file))}`);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: o.scale || 2 });
await page.goto('http://localhost:3100/harness/index.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const key = (type, k) => page.evaluate(([type, k]) => document.body.dispatchEvent(new KeyboardEvent(type, { code: k.code, key: k.key, keyCode: k.keyCode, which: k.keyCode, bubbles: true })), [type, k]);
for (const st of steps) {
  if (st.wait) await page.waitForTimeout(st.wait);
  if (st.down) await key('keydown', st.down);
  if (st.up) await key('keyup', st.up);
}
await page.keyboard.press('Enter');
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find(q => q.name === n); return v.isList ? v.array.map(x => x.data) : v.value; }, n);
const S = (kv) => page.evaluate((kv) => { for (const [n, val] of Object.entries(kv)) { const v = window.__vm.variables.find(q => q.name === n); v.setValue ? v.setValue(val) : (v.value = val); } }, kv);
await S({ camCar: o.car });
for (const sh of o.shots) {
  // leave the last ring behind, then wait for the car to reach this one (racing)
  for (let t = 0; t < 400; t++) { if (Math.abs((await V('caSeg'))[o.car] - sh.seg) > 3) break; await page.waitForTimeout(25); }
  for (let t = 0; t < 4000; t++) {
    const seg = (await V('caSeg'))[o.car];
    const rs = await V('raceState');
    if (rs == 3 && Math.abs(seg - sh.seg) <= 1) break;
    await page.waitForTimeout(25);
  }
  const X = (await V('caX'))[o.car], Y = (await V('caY'))[o.car], Z = (await V('caZ'))[o.car], yaw = (await V('caYaw'))[o.car];
  const r = Math.PI / 180, fx = Math.sin(yaw * r), fz = Math.cos(yaw * r), rx = fz, rz = -fx;
  const cx = X - fx * sh.back + rx * sh.side, cz = Z - fz * sh.back + rz * sh.side, cy = Y + sh.up;
  const ax = X + fx * (sh.ahead || 0), az = Z + fz * (sh.ahead || 0), ay = Y + (sh.lookUp ?? 0.8);
  const dx = ax - cx, dz = az - cz;
  const camYaw = Math.atan2(dx, dz) / r + (sh.yawOff || 0);
  const camPitch = Math.atan2(ay - cy, Math.hypot(dx, dz)) / r + (sh.pitchOff || 0);
  const rs = await V('raceState');
  await S({ prevState: rs, raceState: 6, thK: 1, thX: cx, thY: cy, thZ: cz, thYaw: camYaw, thP: camPitch, thF: sh.fov || 62 });
  await page.waitForTimeout(400);
  const name = sh.name || `s${sh.seg}`;
  await (await page.$('canvas')).screenshot({ path: path.join(outDir, name + '.png') });
  console.log('shot', name, 'seg', sh.seg, 'car', X.toFixed(1), Z.toFixed(1), 'yaw', yaw.toFixed(0));
  if (sh.hold) { await page.waitForTimeout(sh.hold); }
  await S({ thK: 0, raceState: rs });
}
await browser.close();

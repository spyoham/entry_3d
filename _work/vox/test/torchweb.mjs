// a torch in a dark room, in tessvm in Chrome (the kernel on): node test/torchweb.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { buildProject } from '../build.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const file = path.join(HERE, 'torchweb.ent');
buildProject(file, { name: 'tw', more: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0 } });
const t = await fetch(`http://localhost:3100/load?file=${encodeURIComponent(file)}`).then(r => r.text());
if (t !== 'ok') throw new Error(t);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.addInitScript(() => {
  let vt = 0; performance.now = () => vt; let q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; }; window.cancelAnimationFrame = () => {};
  window.__frame = (n = 1) => { for (let i = 0; i < n; i++) { vt += 1000 / 60; const r = q; q = []; for (const cb of r) cb(vt); } };
  window.__clock = (ms) => { vt += ms; };
});
await page.goto('http://localhost:3100/harness/index.html');
for (let k = 0; k < 600; k++) { if (await page.evaluate(() => window.__ready)) break; await page.evaluate(() => window.__clock(50)); await page.waitForTimeout(50); }
console.log('kernel on', await page.evaluate(() => !!window.__vm.kernel));
console.log('kernel roots', await page.evaluate(() => { const P = window.__vm.kernelPlan; const ids = window.__fnIds, nm = window.__fnNames; const out = []; for (const [k] of P.roots) { out.push(nm[k]); } return out.join(' '); }));
await page.evaluate((NIGHT) => {
  const vm = window.__vm; const V = new Map(vm.variables.map(v => [v.name, v]));
  window.__g = (n) => { const v = V.get(n); return +v.value; };
  window.__s = (n, x) => V.get(n).setValue(x);
  window.__L = (n, i) => +V.get(n).array[i - 1].data;
  window.__s('$TESSVM', 1); window.__NIGHT = NIGHT;
  const t0 = vm.tick.bind(vm); vm.tick = () => { if (window.__g('$M_LOCK') === 2) window.__s('$M_LOCK', 1); t0(1000 / 60); };
  window.__handle.start();
}, !!process.env.NIGHT);
for (let k = 0; k < 400; k++) { await page.evaluate(() => window.__frame(10)); if (await page.evaluate(() => window.__g('gState')) === 2) break; }
await page.evaluate(() => window.__frame(120));
const r0 = await page.evaluate(() => {
  const g = window.__g, s = window.__s, F = window.__frame;
  const WS = 160, WY = 128;
  const idx = (x, y, z) => ((((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS)) * WY + y + 1;
  const x0 = Math.floor(g('px')) + 4, z0 = Math.floor(g('pz')) + 4; let y0 = 12; if (window.__NIGHT) { y0 = Math.floor(g('py')); }
  const put = (x, y, z, b) => { s('tX', x); s('tY', y); s('tZ', z); s('tStage', b); s('testCmd', 5); let k = 0; while (g('testCmd') !== 0 && k < 20) { F(1); k++; } };
  if (window.__NIGHT) { s('tday', 0.75); s('autoView', 0); s('viewWant', 32); }
  else { for (let a = -6; a <= 6; a++) for (let c = -6; c <= 6; c++) for (let y = y0; y < y0 + 3; y++) put(x0 + a, y, z0 + c, 0); }
  F(10);
  s('px', x0 - 5.5); s('py', y0 + (window.__NIGHT ? 2 : 0)); s('pz', z0 - 5.5); s('yaw', 45); s('pitch', -15); s('flying', 1); s('gameMode', 1);
  F(30);
  const row = () => { const o = []; for (const [dx, dy, dz] of [[0,0,0],[0,1,0],[1,1,0],[-1,1,0],[0,1,1],[0,1,-1],[1,1,1],[2,1,0],[2,2,0],[1,2,0]]) { const i = idx(x0 + dx, y0 + dy, z0 + dz); o.push(`${window.__L('W', i)}:${window.__L('LT', i) % 16}/${Math.floor(window.__L('LT', i) / 16)}`); } return o.join(' '); };
  const before = row();
  window.__put = () => put(x0, y0, z0, 27);
  window.__row = row;
  return { before, dirtyN: g('dirtyN'), ldN: 0 };
});
console.log('carved', JSON.stringify(r0));
await (await page.$('#stage')).screenshot({ path: path.join(HERE, 'torchweb0.png') });
const r = await page.evaluate(() => {
  const g = window.__g, F = window.__frame, row = window.__row;
  window.__put();
  const seq = [];
  for (let k = 0; k < 8; k++) { F(5); seq.push(row()); }
  const K = (lt) => [0,1,2,3].map(d => window.__L('LTK', lt * 8 + d + 1)).join('/');
  return { seq, frame: window.__vm.frame, dark: g('dark'), ltkDark: g('ltkDark'), dimAmb: g('dimAmb'), k255: K(255), k254: K(254), k252: K(252), k250: K(250), k240: K(240), k0: K(0), k14: K(14) };
});
console.log(JSON.stringify(r));
await (await page.$('#stage')).screenshot({ path: path.join(HERE, 'torchweb.png') });
await browser.close();

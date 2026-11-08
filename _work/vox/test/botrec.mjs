// Films the bot in tessvm (headless Chrome): node test/botrec.mjs [seed] [maxMinutes] [stopAtDim] [every]
// Needs the harness server: node ../tessvm/tsrv.mjs (port 3100). The page runs on a clock of its own
// (one 1/60 s frame at a time), the bot works the game through the same inputs a player has, and
// every `every`-th frame is saved to test/rec/ (ffmpeg makes the video).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
import { buildProject } from '../build.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const a = process.argv.slice(2);
const seed = Number(a[0] || 1234), maxMin = Number(a[1] || 20), stopDim = Number(a[2] || 9), every = Number(a[3] || 8);
const file = path.join(HERE, 'botrec.ent');
buildProject(file, { name: '블록 월드', more: { AUTOSEED: seed, TESTRUN: 1 } });
const out = path.join(HERE, 'rec');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const t = await fetch(`http://localhost:3100/load?file=${encodeURIComponent(file)}`).then(r => r.text());
if (t !== 'ok') throw new Error(t);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.addInitScript(() => {
  let rs = 12345; Math.random = () => { rs = (rs * 48271) % 2147483647; return rs / 2147483647; };
  let vt = 0; performance.now = () => vt;
  let q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__frame = () => { vt += 1000 / 60; const r = q; q = []; for (const cb of r) cb(vt); };
  window.__clock = (ms) => { vt += ms; };
});
await page.goto('http://localhost:3100/harness/index.html');
// (fonts and pictures arrive on the real clock: push the page's own along until it is up)
for (let k = 0; k < 600; k++) { if (await page.evaluate(() => window.__ready)) break; await page.evaluate(() => window.__clock(50)); await page.waitForTimeout(50); }
const botSrc = fs.readFileSync(path.join(HERE, 'bot.js'), 'utf8');
await page.evaluate((src) => {
  const module = { exports: {} };
  new Function('module', 'exports', src)(module, module.exports);
  const vm = window.__vm;
  const V = new Map(vm.variables.map(v => [v.name, v]));
  const get = (n) => { const v = V.get(n); return v ? (v.value !== '' && Number.isFinite(+v.value) ? +v.value : v.value) : undefined; };
  const set = (n, x) => { const v = V.get(n); if (v) v.setValue(x); };
  let cache = {}, cacheF = -1;
  window.__log = [];
  const io = {
    get, set,
    list: (n, i) => { if (cacheF !== vm.frame) { cache = {}; cacheF = vm.frame; } const A = cache[n] || (cache[n] = V.get(n).array.map(e => +e.data)); return A[i - 1]; },
    key: (c, d) => { if (d) vm.pressedKeys.add(c); else vm.pressedKeys.delete(c); },
    mouseDown: (b) => { vm.mouseDown = b; }, mouse: (x, y) => { vm.mouseX = x; vm.mouseY = y; }, click: () => vm.fireEvent('mouse_clicked'),
    log: (t) => window.__log.push(t), frames: () => get('frames'), dbg: false,
  };
  const bot = module.exports.makeBot(io);
  window.__get = get;
  const t0 = vm.tick.bind(vm);
  vm.tick = (d) => {
    if (get('$M_LOCK') === 2) set('$M_LOCK', 1);
    if (get('gState') === 2 && !window.__botEnd) { try { if (!bot.step()) window.__botEnd = 'done'; } catch (e) { window.__botEnd = 'error ' + e.message; } }
    t0(1000 / 60);
  };
  set('$TESSVM', 1);
  window.__handle.start();
}, botSrc);
const stage = await page.$('#stage');
let shots = 0, inDim = -1;
const T0 = Date.now();
for (let f = 0; f < maxMin * 3600; f++) {
  const s = await page.evaluate(() => { window.__frame(); const g = window.__get; const l = window.__log; window.__log = []; return { gs: g('gState'), dim: g('dim'), dead: g('dead'), done: g('botDone'), end: window.__botEnd, msg: g('deathMsg'), log: l, hp: g('hp') }; });
  for (const l of s.log) console.log(`[${(f / 60).toFixed(1)}s] ${String(l).slice(0, 120)}`);
  if (f % every === 0) { await stage.screenshot({ path: path.join(out, String(shots).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 88 }); shots++; }
  if (s.dead === 1) { console.log('DIED', s.msg, 'at', (f / 60).toFixed(1)); for (let k = 0; k < 30; k++) { await page.evaluate(() => window.__frame()); if (k % 2 == 0) { await stage.screenshot({ path: path.join(out, String(shots++).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 88 }); } } break; }
  if (s.done === 1 || s.end) { console.log('bot end', s.end, 'at', (f / 60).toFixed(1)); break; }
  if (s.dim >= stopDim && s.gs === 2) { if (inDim < 0) { inDim = f; console.log('reached dim', s.dim, 'at', (f / 60).toFixed(1)); } if (f - inDim > 420) break; }
  if (f % 3600 === 0 && f) console.log(`-- ${f / 3600} min: hp ${s.hp} dim ${s.dim}; ${shots} shots, ${((Date.now() - T0) / 1000).toFixed(0)} s real`);
}
console.log('shots', shots);
await browser.close();

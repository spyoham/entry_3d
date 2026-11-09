// Films the scripted tour (test/tour.js) in tessvm (headless Chrome): node test/tourrec.mjs [every]
// (frames the tour holds while the world is made are not kept)
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
const seed = 1234, every = Number(a[0] || 2);
const file = path.join(HERE, 'tourrec.ent');
buildProject(file, { name: '블록 월드', more: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1 } });
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
console.log('loaded into the harness'); await page.goto('http://localhost:3100/harness/index.html'); console.log('page open');
// (fonts and pictures arrive on the real clock: push the page's own along until it is up)
for (let k = 0; k < 600; k++) { if (await page.evaluate(() => window.__ready)) break; await page.evaluate(() => window.__clock(50)); await page.waitForTimeout(50); }
console.log('ready', await page.evaluate(() => !!window.__ready));
const botSrc = fs.readFileSync(path.join(HERE, 'tour.js'), 'utf8');
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
  window.__keep = 0;
  vm.tick = (d) => {
    set('$M_LOCK', 1); set('lockAskT', 0); set('keysLost', 0);
    window.__keep = 0;
    if (get('gState') >= 2 && !window.__botEnd) { try { const r = bot.step(); if (!r) window.__botEnd = 'done'; window.__keep = r === 1 ? 1 : 0; } catch (e) { window.__botEnd = 'error ' + e.message; } }
    t0(1000 / 60);
  };
  set('$TESSVM', 1);
  window.__handle.start();
}, botSrc);
const stage = await page.$('#stage');
let shots = 0, kept = 0;
const T0 = Date.now();
for (let f = 0; f < 60 * 60 * 20; f++) {
  const s = await page.evaluate(() => { window.__frame(); const g = window.__get; const l = window.__log; window.__log = []; return { keep: window.__keep, end: window.__botEnd, log: l, dim: g('dim') }; });
  for (const l of s.log) console.log(`[${(f / 60).toFixed(1)}s, kept ${kept}] ${String(l).slice(0, 120)}`);
  if (f % 600 === 0) { const g = await page.evaluate(() => [window.__get('gState'), window.__get('nChunks'), window.__get('genN'), window.__get('frames')]); console.log(`[${(f / 60).toFixed(0)}s] gState ${g[0]} chunks ${g[1]} gen ${g[2]} frames ${g[3]} kept ${kept}`); }
  if (s.keep) { if (kept % every === 0) { await stage.screenshot({ path: path.join(out, String(shots).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 90 }); shots++; } kept++; }
  if (s.end) { console.log('tour end', s.end, 'at', (f / 60).toFixed(1)); break; }
}
console.log('shots', shots, 'real', ((Date.now() - T0) / 1000).toFixed(0), 's');
await browser.close();

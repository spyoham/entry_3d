// (v3.5, 11-26) the calculator brought over from the genre in the REAL tessvm page (the _work/tessvm harness:
// node ../tessvm/tsrv.mjs, port 3100): its map data pasted on the new-world screen, the world made, the player
// on the platform by the keys; sums typed on the keys and read off the lamps; ticks and frames a second meanwhile.
//   node test/tesscalc35.mjs <map.txt> [sums: 12+34,200-45,3*5,100/7]
//   SIM=6: with the simulation distance at 6; KEEP=0: the map without its chunks to keep (the distance alone must
//   hold the machine); PROF=<folder>: the page's CPU profile of each sum.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildProject } from '../build.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tesscalc.ent');
buildProject(file, { name: 'tesscalc', more: { TESTRUN: 1, ANIMALS: 0 } });
const text = process.env.KEEP === '0' ? fs.readFileSync(process.argv[2], 'utf8').replace(/;keep=[-\d,]*/, '') : fs.readFileSync(process.argv[2], 'utf8');
const sums = (process.argv[3] || '12+34,200-45,3*5,100/7').split(',');
// (how far the map was moved: its twelfth part says)
const [hx, , hz] = /hash=(-?\d+),(-?\d+),(-?\d+)/.exec(text).slice(1).map(Number), DZ = -hz;
// ((11-28) a map put down mirrored - hash= ends with a 1 - has the save's x at hx - x)
const GX = (x) => (/hash=-?\d+,-?\d+,-?\d+,1/.test(text) ? hx - x : x - hx);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 3100;
await fetch(`http://localhost:${PORT}/load?file=${encodeURIComponent(file)}`).then((r) => r.text()).then((t) => { if (t !== 'ok') throw new Error(t); });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const errors = [];
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/harness/index.html?nick=calc`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.evaluate(() => window.__handle.start());
const V = (n) => page.evaluate((n) => { const v = window.__vm.variables.find((v) => v.name === n && !v.isList); return v && v.value; }, n);
const Lst = (n) => page.evaluate((n) => { const l = window.__vm.variables.find((v) => v.name === n && v.isList); return l ? l.array.map((x) => x.data) : null; }, n);
const set = (n, x) => page.evaluate(([n, x]) => window.__vm.variables.find((v) => v.name === n && !v.isList).setValue(x), [n, x]);
const cmd = async (c, t) => { await set('tCmd', t); await set('testCmd', c); await sleep(250); };
const until = async (f, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(250); } return false; };
const shot = async (name) => { const c = await page.$('canvas'); await c.screenshot({ path: path.join(HERE, name) }); console.log('wrote', name); };
const vmErrors = () => page.evaluate(() => (window.__vm.errors || []).map((e) => String(e && e.message ? e.message : e)).slice(0, 3));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
await sleep(6000);
await set('testCmd', 20); await sleep(600);
let t0 = Date.now();
await page.evaluate((t) => { const dt = new DataTransfer(); dt.setData('text/plain', t); window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, text);
ok(await until(async () => +(await V('mpOn')) === 1, 60000), `the pasted map is taken (${text.length} letters, ${await V('mpNE')} blocks, in ${Date.now() - t0} ms)`);
t0 = Date.now();
await set('tStage', 1); await cmd(10, '');
ok(await until(async () => +(await V('gState')) === 2, 180000), `a world made from it in ${Date.now() - t0} ms`);
await cmd(8, '/gamemode creative');
// the chunks the world keeps: all made
t0 = Date.now();
const keptMade = () => page.evaluate(() => { const L = (n) => window.__vm.variables.find((v) => v.name === n && v.isList).array.map((x) => +x.data); const KCX = L('KCX'), KCZ = L('KCZ'), CKX = L('CKX'), CKZ = L('CKZ'), CKST = L('CKST'), CKRD = L('CKRD'), CKRV = L('CKRV'); const NC = Math.round(Math.sqrt(CKX.length)); let n = 0; for (let i = 0; i < KCX.length; i++) { const s = (((KCX[i] % NC) + NC) % NC) * NC + (((KCZ[i] % NC) + NC) % NC); if (CKX[s] === KCX[i] && CKZ[s] === KCZ[i] && CKST[s] >= 4 && CKRD[s] > 0 && CKRV[s] === 0) n++; } return [n, KCX.length]; });
const SIM = +(process.env.SIM || 0), made = () => page.evaluate(() => { const L = (n) => window.__vm.variables.find((v) => v.name === n && v.isList).array.map((x) => +x.data); const S = L('CKST'); return [S.filter((v) => v >= 4).length, S.filter((v) => v === 5).length]; });
if (SIM) { await set('simWant', SIM); await set('simR', SIM > 4 ? SIM : 0); }
if (process.env.KEEP === '0') { const want = SIM >= 6 ? 169 : 49; ok(await until(async () => (await made())[0] >= want, 180000), `with the simulation distance at ${SIM || 4} and no chunks kept by the map: ${(await made()).join(' chunks lit, ')} meshed, ${Date.now() - t0} ms after the world was made`); }
else ok(await until(async () => { const [n, all] = await keptMade(); return all > 0 && n === all; }, 120000), `the chunks the world keeps are made and their parts looked at: ${(await keptMade()).join(' of ')} in ${Date.now() - t0} ms`);
if (SIM) { await until(async () => (await made())[0] >= (SIM >= 6 ? 169 : 121), 180000); console.log(`simulation distance ${SIM}: ${(await made()).join(' chunks lit, ')} meshed, ${Date.now() - t0} ms after the world was made`); }
await sleep(12000);
console.log('at rest: ticks a second', await V('tpsShow'), 'frames', await V('fpsShow'), 'kStep', await V('kStep'), 'the player at', await V('px'), await V('py'), await V('pz'), 'yaw', await V('yaw'));
await set('helpT', 0);
await shot('tesscalc_keys.png');
const KEY = await Lst('ITKEY');
const blockAt = async (x, y, z) => { await set('tX', GX(x)); await set('tY', y); await set('tZ', z + DZ); await set('testCmd', 14); await sleep(120); return KEY[+(await V('tStage'))]; };
const SEG = { '1111110': 0, '0110000': 1, '1101101': 2, '1111001': 3, '0110011': 4, '1011011': 5, '1011111': 6, '1110000': 7, '1111111': 8, '1111011': 9, '0000000': ' ', '0000001': '-', '1110011': 9, '0011111': 6, '1110010': 7 };
const lit = async (x, y) => ((await blockAt(x, y, 32)) === 'spark_lamp_on' ? 1 : 0);
const digit = async (k, y0) => { const x0 = 29 + 8 * k; let key = ''; for (const [a, b] of [[2, 8], [0, 6], [0, 2], [2, 0], [4, 2], [4, 6], [2, 4]]) key += await lit(x0 + a, y0 + b); return key in SEG ? SEG[key] : '?'; };
const row = async (y0, n) => { let r = ''; for (let k = n - 1; k >= 0; k--) r += await digit(k, y0); return r; };
// (a key, then the machine left to come to rest - no tick waiting, no piston moving - as the signs by the keys ask;
// how long that took is how fast the game works the machine: its own second is 20 game ticks)
const waits = [];
const rest = async (max = 60000) => { const t0 = Date.now(); let quiet = 0; while (Date.now() - t0 < max && quiet < 3) { await sleep(150); const busy = await page.evaluate(() => { const v = (n) => +window.__vm.variables.find((q) => q.name === n && !q.isList).value, l = (n) => window.__vm.variables.find((q) => q.name === n && q.isList).array.length; return v('scN') + l('BEX') + l('MVX'); }); quiet = busy === 0 ? quiet + 1 : 0; if (busy > 0 && Date.now() - t0 > 2500) { const f = +(await V('fpsShow')); if (f > 0 && f < lowF) lowF = f; } } return Date.now() - t0 - 450; };
let lowF = 99;
const press = async (y, z) => { const g0 = +(await V('gtNow')); await set('tX', GX(33)); await set('tY', y); await set('tZ', z + DZ); await set('testCmd', 27); await sleep(300); const ms = await rest(); waits.push([ms, +(await V('gtNow')) - g0]); };
const lever = async () => { await set('tX', GX(33)); await set('tY', 85); await set('tZ', 2 + DZ); await set('testCmd', 28); await sleep(300); await rest(); };
const NUM = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5] };
const OPS = { '+': -1, '-': -2, '*': -3, '/': -4, c: 1 };
for (const q of sums) {
  const m = /^(\d+)([-+*\/])(\d+)$/.exec(q), want = m[2] === '+' ? +m[1] + +m[3] : m[2] === '-' ? +m[1] - +m[3] : m[2] === '*' ? +m[1] * +m[3] : Math.floor(+m[1] * 100 / +m[3]);
  await press(85, OPS.c);
  for (const d of m[1]) await press(...NUM[d]);
  await lever();
  for (const d of m[3]) await press(...NUM[d]);
  const g0 = +(await V('gtNow')), w0 = Date.now();
  lowF = 99;
  // (PROF=<folder>: where the page's time goes while the sum is worked out - a .cpuprofile a sum)
  let cdp = null;
  if (process.env.PROF) { cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  await set('tX', GX(33)); await set('tY', 85); await set('tZ', OPS[m[2]] + DZ); await set('testCmd', 27); await sleep(300);
  const ms = (await rest(120000)) + 300, gt = +(await V('gtNow')) - g0;
  const tps = await V('tpsShow'), fps = await V('fpsShow');
  if (cdp) {
    const { profile } = await cdp.send('Profiler.stop');
    fs.mkdirSync(process.env.PROF, { recursive: true });
    fs.writeFileSync(path.join(process.env.PROF, q.replace(/[*\/]/g, 'x') + '.cpuprofile'), JSON.stringify(profile));
    // (the lines of the compiled work the time went to, with their source: self time by line)
    const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
    profile.samples.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.scriptId + ':' + n.callFrame.lineNumber + ':' + n.callFrame.functionName; self.set(k, (self.get(k) || 0) + profile.timeDeltas[i]); });
    await cdp.send('Debugger.enable');
    const src = new Map(), out = [];
    for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 60)) {
      const [sid, line, fnName] = k.split(':');
      let text = '';
      if (+sid > 0) { if (!src.has(sid)) { try { src.set(sid, (await cdp.send('Debugger.getScriptSource', { scriptId: sid })).scriptSource.split('\n')); } catch (e) { src.set(sid, []); } } text = (src.get(sid)[+line] || '').trim().slice(0, 150); }
      out.push((v / 1000).toFixed(0).padStart(7) + ' ms  ' + fnName + ' :' + line + '  ' + text);
    }
    fs.writeFileSync(path.join(process.env.PROF, q.replace(/[*\/]/g, 'x') + '.lines.txt'), out.join('\n') + '\n');
    await cdp.detach();
  }
  const got = (await row(71, 5)).trim().replace(/ +/g, '');
  ok(got === String(want).replace('-', '-'), `${q} = ${got} (at rest after ${(ms / 1000).toFixed(1)} s = ${gt} game ticks: ${(gt / (ms / 1000)).toFixed(1)} a second of the genre's 20; the last second ${tps} ticks, ${fps} frames, kStep ${await V('kStep')}; frames a second at the least while it worked: ${lowF === 99 ? '-' : lowF})`);
  await lever();
}
console.log('keys: ' + waits.map(([ms, gt]) => `${(ms / 1000).toFixed(1)} s for ${gt} game ticks`).join(', '));
await shot('tesscalc_sum.png');
const ve = await vmErrors();
ok(errors.length === 0 && ve.length === 0, `no errors on the page (${errors.slice(0, 2).join(' | ')}${ve.join(' | ')})`);
console.log(fails ? fails + ' FAILED' : 'all ok');
await browser.close();
process.exit(0);

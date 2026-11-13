// (v3.0) ticks in tessvm with forty mobs of the new kinds about the player: node test/tessv30.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { buildProject } from '../build.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const seed = Number(a[0] || 1234), ticks = Number(a[1] || 300);
const kv = Object.fromEntries(a.slice(2).filter(x => x.includes('=')).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const file = path.join(HERE, 'tessv30.ent');
const built = buildProject(file, { name: 'tess', more: { AUTOSEED: seed, TESTRUN: 1, BENCH: 1, ANIMALS: kv.MOBS || 0, SPLIT: kv.SPLIT || 0 } });
const FNAME = {};
for (const f of built.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)"/); FNAME[f.id] = m ? m[1] : '?'; }

const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrun');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
work.id = 'local';
const { toTessProject } = await imp('page/tess-project.js');
const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
const conv = toTessProject(work);
if (conv.dropped && conv.dropped.length) console.log('dropped', JSON.stringify(conv.dropped).slice(0, 300));
const F0 = globalThis.Function; let SRC = '';
globalThis.Function = function (...a) { if (a.length === 2 && a[0] === 'R') SRC = a[1]; return F0(...a); };
const vm = new Vm({ kernel: null, store: null });
vm.load(conv.project);
globalThis.Function = F0;
if (kv.SRC) fs.writeFileSync(path.join(HERE, 'tess_src.js'), SRC);
vm.start();
const Vv = (n) => { const v = vm.variables.find(v => v.name === n); return v && v.value; };
const set = (n, x) => { const v = vm.variables.find(v => v.name === n); v.setValue(x); };
set('$TESSVM', 1);
let t0 = performance.now(), n = 0, maxT = 0;
while (Vv('gState') != 2 && n < 5000) { const t = performance.now(); vm.tick(); maxT = Math.max(maxT, performance.now() - t); n++; }
console.log(`generated: ${n} ticks ${(performance.now() - t0).toFixed(0)} ms (longest tick ${maxT.toFixed(0)} ms)`);
if (kv.X !== undefined) { set('tX', kv.X); set('tY', kv.Y); set('tZ', kv.Z); set('tYaw', kv.YAW || 0); set('tPitch', kv.PITCH || 0); set('testCmd', 1); }
for (let i = 0; i < 300; i++) vm.tick();
const tick = () => { const t = performance.now(); vm.tick(); return performance.now() - t; };
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const L = () => { const l = vm.variables.find(v => v.name === 'CHT'); const arr = l && (l.array || l.value || l._array); return Array.isArray(arr) ? String(arr[arr.length - 1]?.data ?? arr[arr.length - 1]) : '?'; };
const say = (c) => { set('tCmd', c); set('testCmd', 13); const t = tick(); return [t, L()]; };
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const plain = []; for (let i = 0; i < 30; i++) plain.push(tick());
console.log(`plain tick ${med(plain).toFixed(1)} ms`);
// ((v3.0) forty mobs of the new kinds about the player in survival)
const OLDK = ['cow', 'sheep', 'pig', 'chicken', 'zombie', 'skeleton', 'spider', 'bombshroom', 'villager', 'golem', 'raider', 'wanderer'];
const kinds = kv.OLD ? Array.from({ length: 40 }, (_, i) => OLDK[i % OLDK.length]) : ['wolf', 'cat', 'horse', 'llama', 'parrot', 'bat', 'bee', 'fox', 'rabbit', 'panda', 'white_bear', 'turtle', 'cow', 'sheep', 'pig', 'chicken', 'zombie', 'husk', 'skeleton', 'stray', 'spider', 'witch', 'slime', 'phantom', 'axe_raider', 'conjurer', 'snow_keeper', 'mooshroom', 'donkey', 'trader', 'cave_spider', 'silverfish', 'zombie_villager', 'villager', 'golem', 'raider', 'ravager', 'drowned', 'fox', 'wolf'];
say('/gamemode survival'); say('/difficulty normal'); say('/effect give @s resistance 999 5');
let k = 0;
for (const m of kinds) { const a = k * 9, rr = 4 + k % 6; const [t2, r2] = say(`/summon ${m} ~${(Math.sin(a * Math.PI / 180) * rr).toFixed(1)} ~1 ~${(Math.cos(a * Math.PI / 180) * rr).toFixed(1)}`); if (k < 2) console.log(r2); k++; }
const mobs = []; for (let i = 0; i < 120; i++) mobs.push(tick());
console.log(`ticks with ${kinds.length} mobs about ${med(mobs).toFixed(1)} ms, longest ${Math.max(...mobs).toFixed(1)} (none: ${med(plain).toFixed(1)})`);
say('/kill @e[type=!player]'); for (let i = 0; i < 10; i++) tick();
const after = []; for (let i = 0; i < 30; i++) after.push(tick());
console.log(`after they went ${med(after).toFixed(1)} ms`);
process.exit(0);

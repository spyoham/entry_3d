// How much the example map's iron farm and mob tower make in an hour of standing by them, in a single world
// made from example_map.txt: node test/farmrate.mjs [minutes] [iron|tower|both]
import fs from 'node:fs';
import { createSim } from '../sim.mjs';
const MIN = +(process.argv[2] || 10), WHICH = process.argv[3] || 'both';
const text = fs.readFileSync(process.env.MAP || new URL('../../../example_map.txt', import.meta.url), 'utf8');
const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 2 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const call = (f) => s.as('pen', () => f(s.fn));
const cmd = (c) => call((fn) => fn.runCommand(c));
F(30);
call((fn) => fn.menuGo(2)); F(3);
s.poke('$CLIPBOARD', text); F(2);
s.poke('cwMode', 0); s.poke('cwName', 'x');
call((fn) => fn.worldNew(fn.worldFree()));
{ let n = 0; while (s.peek('gState') !== 2 && n < 8000) { F(); n++; } }
const KEY = s.peek('ITKEY'), MK = s.peek('MKEY');
const M = (k) => MK.indexOf(k) + 1;
const count = (k) => s.peek('ET').filter((t) => t === M(k)).length;
const chest = (x, y, z) => { call((fn) => fn.chestFind(x, y, z)); const c = s.peek('cFound'), r = {}; if (c) for (let i = 0; i < 27; i++) { const q = s.peek('CHI')[(c - 1) * 27 + i]; if (q > 0) r[KEY[q]] = (r[KEY[q]] || 0) + s.peek('CHN')[(c - 1) * 27 + i]; } return r; };
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvy', 0); s.poke('fallTop', y); };
const keep = () => { s.poke('hp', 20); s.poke('food', 20); };
cmd('/gamerule doDaylightCycle false'); cmd('/gamerule doWeatherCycle false');
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
if (WHICH !== 'tower') {
  // the iron farm: stood on the ground by its chest
  cmd('/gamerule doMobSpawning false'); s.poke('tday', 0.3); s.poke('gameMode', 0);
  stand(68, 58, 25); F(600);
  const c0 = sum(chest(68, 58, 21)); let golems = 0, was = count('golem'), tAlive = 0;
  for (let sec = 0; sec < MIN * 60; sec++) { F(60); keep(); const g = count('golem'); if (g > was) golems += g - was; was = g; if (g > 0) tAlive++; }
  const got = chest(68, 58, 21);
  console.log(`iron farm, ${MIN} min: keepers that came ${golems} (one alive ${Math.round(tAlive / (MIN * 60) * 100)} % of the time), in the chest ${JSON.stringify(got)} -> ${Math.round((sum(got) - c0) * 60 / MIN)} things an hour; villagers ${count('villager')}, zombies ${count('zombie')}`);
}
if (WHICH !== 'iron') {
  cmd('/gamerule doMobSpawning true'); s.poke('difficulty', 2); s.poke('tday', 0.75); s.poke('gameMode', 0);
  stand(52, 103, 16); F(120);
  const tch = () => { const all = {}; for (let z = 42; z <= 47; z++) { const a = chest(51, 58, z); for (const k in a) all[k] = (all[k] || 0) + a[k]; } return all; };
  const c0 = sum(tch());
  let seen = 0, maxH = 0, sumH = 0, born = 0; const ids = new Set();
  for (let sec = 0; sec < MIN * 60; sec++) {
    F(60); keep(); stand(52, 103, 16);
    const ET = s.peek('ET'), EU = s.peek('EUID'), MH = s.peek('MHOST'); let h = 0;
    ET.forEach((t, i) => { if (t > 0 && MH[t - 1] === 1) { h++; if (!ids.has(EU[i])) { ids.add(EU[i]); born++; } } });
    maxH = Math.max(maxH, h); sumH += h;
  }
  const all = tch();
  console.log(`mob tower, ${MIN} min: monsters that came ${born} (${Math.round(born * 60 / MIN)} an hour), alive at a time ${(sumH / (MIN * 60)).toFixed(1)} (most ${maxH}), in the chests ${JSON.stringify(all)} -> ${Math.round((sum(all) - c0) * 60 / MIN)} things an hour`);
}

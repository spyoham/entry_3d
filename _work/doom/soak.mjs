import { createSim } from './sim.mjs';
const sim = await createSim();
const P = sim.R.peek, K = sim.keys, D = sim.D;
const step = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const press = (code, n = 3) => { K.add(code); step(n); K.delete(code); step(2); };
step(3); press(13); press(40); press(40); press(13); step(3);
// give everything to exercise all weapons
const arm = () => { const own = P('plOwned'); for (let i = 0; i < 7; i++) own[i] = 1; const am = P('plAmmo'); am[0] = 200; am[1] = 50; am[2] = 50; am[3] = 300; };
arm();
let seed = Number(process.argv[2] || 1);
const used = new Set(); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const keys = [87, 83, 65, 68, 37, 39, 17, 32, 16];
let frames = 0, deaths = 0, maxItems = 0, exits = 0;
const t0 = Date.now();
while (frames < Number(process.argv[3] || 12000)) {
  K.clear();
  for (const k of keys) if (rnd() < (k === 87 ? 0.6 : 0.2)) K.add(k);
  if (rnd() < 0.05) K.add(49 + Math.floor(rnd() * 7));
  step(20); frames += 20;
  used.add(P('plWeapon'));
  if (frames % 600 === 0) arm();
  maxItems = Math.max(maxItems, P('r_items'));
  if (P('gameState') !== 2) { exits++; K.clear(); press(13); press(13); step(5); press(13); step(5); }
  if (P('plHealth') <= 0) { deaths++; K.clear(); step(40); press(32); step(5); }
  if (frames % 2000 === 0) console.log(`frame ${frames} pos ${P('plX').toFixed(0)},${P('plY').toFixed(0)} hp ${P('plHealth')} weapon ${P('plWeapon')} ammo ${P('plAmmo')} kills ${P('plKills')} thinkers ${P('nThk')} items ${P('r_items')}`);
}
console.log('weapons used', [...used].sort().join(','), 'done', frames, 'frames in', Date.now() - t0, 'ms; deaths', deaths, 'exits', exits, 'max items', maxItems);

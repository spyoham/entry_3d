// (v3.0) pictures of the new kinds in rows: node test/mobsview.mjs -> test/mobs30_*.png
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, BENCH: 1 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (c) => call(() => fn.runCommand(c));
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
cmd(`/fill ${X - 20} ${Y - 1} ${Z - 4} ${X + 20} ${Y - 1} ${Z + 16} grass`); cmd(`/fill ${X - 20} ${Y} ${Z - 4} ${X + 20} ${Y + 12} ${Z + 16} air`);
cmd('/time set noon'); s.poke('grMobs', 0); s.poke('gameMode', 1); s.poke('flying', 1);
const kinds = s.peek('MKEY').map((k, i) => [k, i + 1]).filter(([k, i]) => i >= 24 && i <= 74);
const rows = []; for (let i = 0; i < kinds.length; i += 9) rows.push(kinds.slice(i, i + 9));
let r = 0;
for (const row of rows) {
  const ET = s.peek('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0;
  row.forEach(([k, t], j) => { call(() => fn.mobAdd(t, X - 12 + j * 3 + 0.5, Y + (s.peek('MFLY')[t - 1] ? 1.5 : 0), Z + 8.5)); const e = s.peek('lastMob'); s.peek('EYAW')[e - 1] = 180; s.peek('EVAR')[e - 1] = t === 12 ? 60 : 1; });
  s.poke('px', X + 0.5); s.poke('py', Y + 1.2); s.poke('pz', Z - 3); s.poke('yaw', 0); s.poke('pitch', -8);
  F(3);
  console.log(r, row.map(x => x[0]).join(' '));
  await s.png(`test/mobs30_${r}.png`);
  r++;
}

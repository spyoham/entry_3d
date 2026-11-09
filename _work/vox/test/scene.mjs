// the thumbnail scene in the sim: node test/scene.mjs '[{"dx":..,"dy":..,"dz":..,"yaw":..,"pitch":..}]'
import fs from 'node:fs';
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let k = 0; while (s.peek('nChunks') < s.peek('NOFF') && k < 4000) { F(1); k++; }
s.poke('showDbg', 0); s.poke('helpT', 0); call(() => fn.setView(48));
const X = Number(process.env.SX || 8), Z = Number(process.env.SZ || 8);
call(() => fn.findTop(X, Z)); const Y = s.peek('topY') + 1;
s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 0.5); s.poke('flying', 1);
for (const c of fs.readFileSync('test/scene.txt', 'utf8').split('\n').filter(Boolean)) { call(() => fn.runCommand(c)); const ch = s.peek('CHT'); const r = ch[ch.length - 1]; if (!/채웠|바꿨/.test(r)) console.log(c, '->', r); }
F(5);
for (const [i, v] of JSON.parse(process.argv[2]).entries()) {
  s.poke('tday', v.t ?? 0.1);
  s.poke('px', X + 0.5 + v.dx); s.poke('py', Y + v.dy); s.poke('pz', Z + 0.5 + v.dz); s.poke('yaw', v.yaw); s.poke('pitch', v.pitch); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0);
  s.poke('gameMode', 0); s.poke('hp', 17); s.poke('food', 16); s.poke('hotSel', 2);
  const KEY = s.peek('ITKEY'), INVI = s.peek('INVI'), INVN = s.peek('INVN');
  ['oak_stairs', 'lantern', 'glass_pane', 'oak_door', 'red_bed', 'poppy', 'iron_pickaxe', 'torch', 'bread'].forEach((k2, j) => { INVI[j] = KEY.indexOf(k2); INVN[j] = [64, 12, 32, 3, 1, 8, 1, 48, 5][j]; });
  s.poke('INVI', INVI); s.poke('INVN', INVN);
  F(40);
  await s.png(`test/scene${i}.png`);
}
console.log('ground', Y);

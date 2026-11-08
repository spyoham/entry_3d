// night, a cave with torches, under water: node test/scenes.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: Number(process.argv[2] || 777), TESTRUN: 1, ANIMALS: 0, AUTOMODE: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const SZ = 128, WY = 64;
const pose = (x, y, z, yw, pt) => { s.poke('tX', x); s.poke('tY', y); s.poke('tZ', z); s.poke('tYaw', yw); s.poke('tPitch', pt); s.poke('testCmd', 1); F(2); s.poke('flying', 1); F(2); };
// night on the surface
pose(64.5, 50, 64.5, 200, -5); s.poke('tday', 0.62); F(40); await s.png('test/night.png');
s.poke('tday', 0.47); F(40); await s.png('test/dusk.png');
s.poke('tday', 0.25);
// a cave: an air cell deep below the surface with floor
const W = s.peek('W'), HM = s.peek('HMAP');
let best = null;
for (let x = 10; x < SZ - 10 && !best; x += 3) for (let z = 10; z < SZ - 10 && !best; z += 3) for (let y = 8; y < HM[x * SZ + z] - 8; y++) {
  const i = (x * SZ + z) * WY + y;
  if (W[i] === 0 && W[i + 1] === 0 && W[i + 2] === 0 && W[i - 1] === 1) {
    let air = 0; for (let d = -3; d <= 3; d++) for (let e = -3; e <= 3; e++) if (W[((x + d) * SZ + z + e) * WY + y] === 0) air++;
    if (air > 30) { best = [x, y, z]; break; }
  }
}
console.log('cave at', best);
const [cx, cy, cz] = best;
s.as('pen', () => { s.fn.setBlock(cx + 2, cy, cz + 2, 27); s.fn.setBlock(cx - 2, cy, cz - 1, 27); s.fn.worldFlush(); });
pose(cx + 0.5, cy, cz + 0.5, 45, -10); s.poke('flying', 0); F(20); await s.png('test/cave.png');
console.log('cave light', s.as('pen', () => s.fn.lightAt(cx + 0.5, cy + 1, cz + 0.5)), 'faces', s.peek('nFace'), 'sections', s.peek('nVS'));
// under water: an ocean / lake cell
let wpos = null;
for (let x = 5; x < SZ - 5 && !wpos; x++) for (let z = 5; z < SZ - 5 && !wpos; z++) { const i = (x * SZ + z) * WY + 28; if (W[i] === 7 && W[i - 2] === 7) wpos = [x, z]; }
console.log('water at', wpos);
pose(wpos[0] + 0.5, 26.5, wpos[1] + 0.5, 90, -20); s.poke('flying', 1); F(30); await s.png('test/water.png');
console.log('under', s.peek('underWater'), 'headWater', s.peek('headWater'), 'view', s.peek('viewR'));

// every block put down from every look and every face clicked: the block there must be of the same kind
//   node test/placeall.mjs [only-id]
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(10);
const only = process.argv[2] ? Number(process.argv[2]) : null;
const KIND = s.peek('BKIND'), KEY = s.peek('ITKEY'), NAME = s.peek('ITNAME'), NB = s.peek('NBLOCK') ?? KIND.length;
const fn = (f) => s.as('pen', () => f(s.fn));
const px = Math.floor(s.peek('px')), pz = Math.floor(s.peek('pz'));
// a stone in the air 6 blocks away, a stone floor under each neighbour so floor-needing blocks stand
const X = px + 6, Y = 70, Z = pz;
// (only the cells a put can touch go back to air: few writes, and a frame now and then empties the queues)
const TOUCH = new Set();
const clear = () => fn((f) => { for (const c of TOUCH) { const [x, y, z] = c.split(',').map(Number); if (f.blockAt(x, y, z) !== 0) f.setBlock(x, y, z, 0); } TOUCH.clear(); f.setBlock(X, Y, Z, 1); });
let since = 0;
const NEI = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const bad = new Map();
let tried = 0, placed = 0;
s.poke('px', X - 20); s.poke('pz', Z - 20); s.poke('py', Y);
for (let b = 1; b < NB; b++) {
  if (only !== null && b !== only) continue;
  if (KIND[b] !== b || !NAME[b] || NAME[b] === ' ') continue;
  for (const yaw of [0, 46, 90, 135, 180, 270, 315]) for (const pitch of [-80, 0, 80]) for (let pf = 0; pf < 6; pf++) for (const hy of [0.25, 0.75]) {
    clear();
    const [dx, dy, dz] = NEI[pf];
    // (the floor under the place, unless it is the stone itself)
    if (pf !== 3) { fn((f) => f.setBlock(X + dx, Y + dy - 1, Z + dz, 1)); TOUCH.add(`${X + dx},${Y + dy - 1},${Z + dz}`); }
    for (const [ax, ay, az] of [[0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]]) TOUCH.add(`${X + dx + ax},${Y + dy + ay},${Z + dz + az}`);
    if (++since >= 3000) { since = 0; F(1); s.poke('px', X - 20); s.poke('pz', Z - 20); s.poke('py', Y); }
    s.poke('pickX', X); s.poke('pickY', Y); s.poke('pickZ', Z); s.poke('pickF', pf); s.poke('pickB', 1); s.poke('pickHY', hy);
    s.poke('yaw', yaw); s.poke('pitch', pitch); s.poke('placeCool', 0);
    tried++;
    fn((f) => f.placeBlock(b, b));
    for (const [ex, ey, ez] of [[X + dx, Y + dy, Z + dz], [X + dx, Y + dy + 1, Z + dz], [X + dx, Y + dy, Z + dz + 1], [X + dx + 1, Y + dy, Z + dz], [X + dx, Y + dy, Z + dz - 1], [X + dx - 1, Y + dy, Z + dz]]) {
      const got = fn((f) => f.blockAt(ex, ey, ez));
      if (got === 0 || got === 1 || got === 7 || got === 35) continue;
      // (sand and gravel of the block before falling in a frame)
      if (s.peek('BFALL')[got] > 0 && got !== b) continue;
      placed++;
      if (KIND[got] !== b) {
        const k = `${b} ${KEY[b]} -> ${got} ${KEY[got]} (kind ${KIND[got]})`;
        if (!bad.has(k)) bad.set(k, []);
        if (bad.get(k).length < 4) bad.get(k).push(`yaw ${yaw} pitch ${pitch} face ${pf} hy ${hy}`);
      }
    }
  }
}
console.log(`tried ${tried}, cells set ${placed}`);
for (const [k, v] of bad) console.log('BAD', k, '|', v.join('; '));
console.log(bad.size ? bad.size + ' WRONG' : 'all ok');

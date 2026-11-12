// (v2.8) blocks picked by their shapes, not their cells: node test/pickshape.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY');
s.poke('gameMode', 1);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 100;
const cmd = (c) => call(() => fn.runCommand(c));
// a stone wall at z + 2, the thing at z + 1, the eye at z + 0.5 looking +z
const setup = (what) => {
  cmd(`/fill ${X - 2} ${Y - 2} ${Z - 1} ${X + 2} ${Y + 3} ${Z + 3} air`);
  cmd(`/fill ${X - 2} ${Y - 1} ${Z - 1} ${X + 2} ${Y - 1} ${Z + 3} stone`);
  cmd(`/fill ${X - 2} ${Y} ${Z + 2} ${X + 2} ${Y + 2} ${Z + 2} stone`);
  if (what) cmd(`/setblock ${X} ${Y} ${Z + 1} ${what}`);
  F(1);
};
const look = (ex, ey, ez, yaw, pitch) => {
  s.poke('px', ex); s.poke('pz', ez); s.poke('py', ey - 1.62);
  s.poke('camX', ex); s.poke('camY', ey); s.poke('camZ', ez); s.poke('yaw', yaw); s.poke('pitch', pitch);
  call(() => fn.pickRay());
  return { on: s.peek('pickOn'), b: KEY[s.peek('pickB')], z: s.peek('pickZ') - Z, y: s.peek('pickY') - Y, f: s.peek('pickF'), top: s.peek('pkB1Y'), w: s.peek('pkB1X') - s.peek('pkB0X') };
};
const at = (dx, dy) => look(X + dx, Y + dy, Z + 0.5, 0, 0);
let r;
setup('torch');
r = at(0.5, 0.3); ok(r.b === 'torch' && r.z === 1 && r.f === 4, `torch hit in its middle (${r.b} z+${r.z} face ${r.f})`);
ok(Math.abs(r.top - 12.5 / 16) < 0.01 && Math.abs(r.w - 0.25) < 0.01, `its outline 4/16 wide, 12.5/16 high (${r.w}, ${r.top})`);
r = at(0.15, 0.3); ok(r.b === 'stone' && r.z === 2, `beside the torch: the wall behind (${r.b} z+${r.z})`);
setup('stone_slab');
r = at(0.5, 0.25); ok(/slab/.test(r.b) && r.z === 1, `bottom slab, low (${r.b})`);
ok(Math.abs(r.top - 0.5) < 0.01, `its outline half high (${r.top})`);
r = at(0.5, 0.75); ok(r.b === 'stone' && r.z === 2, `over the bottom slab: the wall (${r.b} z+${r.z})`);
// from above, onto its top: face 3, so a block goes on it
r = look(X + 0.5, Y + 2.2, Z + 1.5, 0, -89); ok(/slab/.test(r.b) && r.f === 3 && r.y === 0, `the slab's top from above (face ${r.f})`);
setup('oak_fence');
r = at(0.5, 0.5); ok(/fence/.test(r.b), `fence post (${r.b})`);
r = at(0.1, 0.5); ok(r.b === 'stone', `beside a lone fence post: the wall (${r.b})`);
setup('poppy');
r = at(0.5, 0.3); ok(r.b === 'poppy', `a flower (${r.b})`);
r = at(0.5, 0.95); ok(r.b === 'stone', `over the flower: the wall (${r.b})`);
setup('stone');
r = at(0.1, 0.9); ok(r.b === 'stone' && r.z === 1 && r.top === 1, `a whole block as before (${r.b} z+${r.z})`);
setup(null);
r = at(0.5, 0.5); ok(r.b === 'stone' && r.z === 2, `nothing between: the wall (${r.b})`);
// breaking and placing still go by the cell picked
setup('torch');
s.poke('gameMode', 0);
look(X + 0.5, Y + 0.3, Z + 0.5, 0, 0); ok(s.peek('pickOn') === 1, 'picked for breaking');
console.log(fails ? fails + ' FAILED' : 'all ok');

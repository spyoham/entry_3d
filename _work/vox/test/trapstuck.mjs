// (v2.6) a trapdoor shut over the head (its bottom half in the cell over the feet' cell, in the body)
// does not lift the player up through it; walking out works; floors, ceilings and walls still hold.
// usage: node test/trapstuck.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => call(() => fn.runCommand(t));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y + 6} ${Z + 6} air`);
cmd(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y - 1} ${Z + 6} stone`);
const stand = (x, y, z) => { s.poke('px', x); s.poke('py', y); s.poke('pz', z); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('flying', 0); s.poke('gameMode', 0); };
// a closed trapdoor (bottom half) in the cell over the feet's: in the body from y+1 to y+1.19
cmd(`/setblock ${X} ${Y + 1} ${Z} oak_trapdoor`); F(2);
stand(X + 0.5, Y, Z + 0.5); F(60);
ok(Math.abs(s.peek('py') - Y) < 0.05, `under a shut trapdoor in the body the player stays on the floor (py ${s.peek('py').toFixed(3)}, it was put on top: ${Y + 1.19})`);
// walking out of it
s.poke('yaw', 90);
for (let i = 0; i < 60; i++) { s.poke('pvx', 4); F(1); }
ok(s.peek('px') > X + 1.5 && Math.abs(s.peek('py') - Y) < 0.05, `walks out from under it (px ${s.peek('px').toFixed(2)})`);
// a floor still holds, a wall still stops, a ceiling still stops a jump
stand(X - 3.5, Y + 3, Z + 0.5); F(90);
ok(Math.abs(s.peek('py') - Y) < 0.05, `falls onto the floor (py ${s.peek('py').toFixed(3)})`);
cmd(`/setblock ${X - 1} ${Y} ${Z} stone`); cmd(`/setblock ${X - 1} ${Y + 1} ${Z} stone`); F(2);
stand(X - 3.5, Y, Z + 0.5);
for (let i = 0; i < 60; i++) { s.poke('pvx', 4); F(1); }
ok(s.peek('px') < X - 1 - 0.29, `a wall stops it (px ${s.peek('px').toFixed(3)})`);
cmd(`/setblock ${X - 4} ${Y + 2} ${Z} stone`); F(2);
stand(X - 3.5, Y, Z + 0.5); s.poke('pvy', 8); F(10);
ok(s.peek('py') <= Y + 0.21, `a ceiling two up stops a jump (py ${s.peek('py').toFixed(3)})`);
// a slab under it: the body a little in the floor is lifted onto it
cmd(`/setblock ${X + 3} ${Y} ${Z} stone_slab`); F(2);
stand(X + 3.5, Y + 0.3, Z + 0.5); F(30);
ok(Math.abs(s.peek('py') - (Y + 0.5)) < 0.05, `in a slab: put on it (py ${s.peek('py').toFixed(3)})`);
console.log(fails ? fails + ' FAILED' : 'all ok');

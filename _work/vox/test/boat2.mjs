// a boat as the player uses it: put it on water, get in, row, get out, break it: node test/boat2.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(20);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const call = (f) => s.as('pen', f), cmd = (t) => call(() => s.fn.runCommand(t));
const KEY = s.peek('ITKEY'), ID = (k) => KEY.indexOf(k);
const X = Math.floor(s.peek('px')), Y = 90, Z = Math.floor(s.peek('pz'));
// a pond: stone floor at Y-2, water at Y-1, the player on its shore
cmd(`/fill ${X - 12} ${Y - 3} ${Z - 12} ${X + 12} ${Y + 6} ${Z + 30} air`);
cmd(`/fill ${X - 12} ${Y - 3} ${Z - 12} ${X + 12} ${Y - 3} ${Z + 30} stone`);
cmd(`/fill ${X - 10} ${Y - 2} ${Z} ${X + 10} ${Y - 2} ${Z + 28} water`);
cmd(`/fill ${X - 2} ${Y - 2} ${Z - 4} ${X + 2} ${Y - 2} ${Z - 1} stone`);
s.poke('px', X + 0.5); s.poke('py', Y - 1); s.poke('pz', Z - 2.5); s.poke('yaw', 0); s.poke('pitch', -35); s.poke('flying', 0);
cmd('/clear'); cmd('/give @s oak_boat 1');
const slot = s.peek('INVI').indexOf(ID('oak_boat'));
s.poke('hotSel', slot + 1);
F(10);
ok(true, 'looking down at the water (pick: ' + s.peek('pickOn') + ' ' + KEY[s.peek('pickB')] + ')');
const tap = (c) => { s.press(c); F(2); s.release(c); F(2); };
tap(70); F(20);
const boats = () => s.peek('ET').map((t, i) => [t, i]).filter(([t]) => t === 13).map(([, i]) => i);
ok(boats().length === 1, 'F with the boat: a boat on the water');
const e = boats()[0];
ok(boats().length === 1 && Math.abs(s.peek('EY')[e] - (Y - 2 + 0.72)) < 0.3, `it floats on the water: y ${s.peek('EY')[e]?.toFixed(2)}`);
ok(!s.peek('INVI').includes(ID('oak_boat')), 'the boat left the hand');
// get in: look at it and press F
s.poke('pitch', -25); F(5);
ok(s.peek('mobPick') === e + 1, 'looking at the boat: mobPick ' + s.peek('mobPick'));
tap(70); F(5);
ok(s.peek('riding') === e + 1, 'F on the boat: riding ' + s.peek('riding'));
// row forward 3 s
const z0 = s.peek('EZ')[e];
s.press(87); F(180); s.release(87); F(5);
const dz = s.peek('EZ')[e] - z0;
ok(dz > 8, `W rows it forward: ${dz.toFixed(1)} blocks in 3 s (the player with it: ${Math.abs(s.peek('pz') - s.peek('EZ')[e]) < 0.1})`);
// turn
const yw0 = s.peek('EYAW')[e];
s.press(65); F(60); s.release(65); F(2);
ok(Math.abs(s.peek('EYAW')[e] - yw0) > 30, `A turns it: ${(s.peek('EYAW')[e] - yw0).toFixed(0)} degrees`);
// out with Shift
s.press(16); F(5); s.release(16); F(5);
ok(s.peek('riding') === 0, 'Shift: out of the boat');
// break it: hit it until it drops the boat
s.poke('px', s.peek('EX')[e]); s.poke('pz', s.peek('EZ')[e] - 1.5); s.poke('py', Y - 0.5); s.poke('flying', 1); s.poke('yaw', 0); s.poke('pitch', -50);
F(5);
for (let i = 0; i < 12 && s.peek('ET')[e] === 13; i++) { s.poke('attackCool', 0); call(() => s.fn.attack()); F(15); }
ok(s.peek('ET')[e] !== 13, 'hit: the boat breaks');
F(60);
ok(s.peek('INVI').includes(ID('oak_boat')) || s.peek('IID').includes(ID('oak_boat')), 'and gives the boat back (in hand or lying)');
console.log(fails ? fails + ' FAILED' : 'all ok');

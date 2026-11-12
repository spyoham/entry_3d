// (v2.8) swimming as the genre: sprinting with the head under water: node test/swim.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
s.poke('gameMode', 0); s.poke('flying', 0);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 100;
const cmd = (c) => call(() => fn.runCommand(c));
// a pool 6 deep, 26 long (+z), on stone
cmd(`/fill ${X - 3} ${Y - 1} ${Z - 2} ${X + 3} ${Y + 8} ${Z + 31} stone`);
cmd(`/fill ${X - 2} ${Y} ${Z - 1} ${X + 2} ${Y + 5} ${Z + 26} water`);
cmd(`/fill ${X - 2} ${Y + 6} ${Z - 1} ${X + 2} ${Y + 8} ${Z + 31} air`);
F(5);
const put = (x, y, z) => { s.poke('px', x); s.poke('py', y); s.poke('pz', z); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('fallTop', y); };
put(X + 0.5, Y + 1, Z + 0.5); s.poke('yaw', 0); s.poke('pitch', 0); s.poke('hp', 20); s.poke('food', 20);
F(30);
ok(s.peek('headWater') === 1 && s.peek('swimming') === 0, 'in deep water, not swimming yet');
// walking in water: slow as before
s.press(87); F(60); let z0 = s.peek('pz'); F(60);
const walk = s.peek('pz') - z0;
ok(walk > 1 && walk < 2.6, `walking in water ${walk.toFixed(2)} m/s`);
// sprint (W twice): swimming
s.release(87); F(2); s.press(87); F(2); s.release(87); F(2); s.press(87); F(30);
ok(s.peek('sprinting') === 1 && s.peek('swimming') === 1, `sprinting under water: swimming (${s.peek('swimming')})`);
F(30);
ok(Math.abs(s.peek('eyeH') - 0.4) < 0.05, `the eye low: ${s.peek('eyeH').toFixed(2)}`);
put(X + 0.5, Y + 2, Z + 2.5); F(20); z0 = s.peek('pz'); let y0 = s.peek('py'); F(60);
const sw = s.peek('pz') - z0;
ok(sw > 4.8 && sw < 6.2 && Math.abs(s.peek('py') - y0) < 0.3, `swimming level: ${sw.toFixed(2)} m/s, height kept (${(s.peek('py') - y0).toFixed(2)})`);
// looking up 30: up and along
s.poke('pitch', 30); z0 = s.peek('pz'); y0 = s.peek('py'); F(30);
ok(s.peek('py') - y0 > 0.8 && s.peek('pz') - z0 > 1.5, `looking up: up ${(s.peek('py') - y0).toFixed(2)}, along ${(s.peek('pz') - z0).toFixed(2)} in 0.5 s`);
s.poke('pitch', -30); y0 = s.peek('py'); F(45);
ok(s.peek('py') < y0 - 0.8, `looking down: down ${(y0 - s.peek('py')).toFixed(2)}`);
s.poke('pitch', 0);
// a tunnel 1 high at the bottom: swum through, and still lying in it when sprinting stops
cmd(`/fill ${X - 2} ${Y + 1} ${Z + 12} ${X + 2} ${Y + 5} ${Z + 15} stone`);
F(2);
put(X + 0.5, Y + 0.05, Z + 9.5); s.poke('pitch', 0); F(60);
ok(s.peek('pz') > Z + 13 && s.peek('swimming') === 1, `through the 1 high tunnel (z +${(s.peek('pz') - Z).toFixed(1)})`);
put(X + 0.5, Y + 0.05, Z + 13.5);
s.release(87); F(30);
ok(s.peek('swimming') === 1, 'sprinting stopped in the tunnel: still lying (no room to stand)');
put(X + 0.5, Y + 0.05, Z + 20.5); F(30);
ok(s.peek('swimming') === 0, 'out in the open water: stands up again');
// on dry land under a ceiling 1 high, still lying (as when swum into it): crawls, slow as sneaking
cmd(`/fill ${X - 2} ${Y + 6} ${Z - 1} ${X + 2} ${Y + 8} ${Z + 26} air`);
cmd(`/fill ${X - 2} ${Y + 7} ${Z - 1} ${X + 2} ${Y + 7} ${Z + 26} stone`);
cmd(`/fill ${X - 2} ${Y + 5} ${Z - 1} ${X + 2} ${Y + 5} ${Z + 26} stone`);
F(2);
put(X + 0.5, Y + 6.05, Z + 2.5); s.poke('swimming', 1);
s.press(87); F(2); s.release(87); F(2); s.press(87); F(30);
ok(s.peek('swimming') === 1 && s.peek('inWater') === 0, `crawling under the low ceiling (swimming ${s.peek('swimming')})`);
let z1 = s.peek('pz'); F(60);
ok(s.peek('pz') - z1 > 0.8 && s.peek('pz') - z1 < 1.6, `crawling slow: ${(s.peek('pz') - z1).toFixed(2)} m/s`);
cmd(`/fill ${X - 2} ${Y + 7} ${Z - 1} ${X + 2} ${Y + 7} ${Z + 26} air`); F(10);
ok(s.peek('swimming') === 0, 'the ceiling gone: stands up');
s.release(87);
console.log(fails ? fails + ' FAILED' : 'all ok');

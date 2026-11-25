// (v3.4, 11-21) a far mob the eye cannot see is not drawn (mobs.js bucketThings, mobSeen): node test/mobsee.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 777, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3 } });
let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; }
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const F = (k = 1) => { for (let i = 0; i < k; i++) { s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 0.5); s.poke('pvy', 0); s.poke('yaw', 0); s.poke('pitch', 0); s.poke('flying', 1); s.frame(); } };
const call = (f) => s.as('pen', () => f(s.fn));
const cmd = (c) => call((fn) => fn.runCommand(c));
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 100;
cmd('/gamerule doMobSpawning false'); cmd('/time set noon');
cmd(`/fill ${X - 3} ${Y - 1} ${Z - 2} ${X + 3} ${Y - 1} ${Z + 30} stone`);
F(30);
const fills = () => { let a = 0; for (let i = 0; i < 16; i++) { F(1); a += s.peek('nFill'); } return a / 16; };
const base = fills();
cmd(`/summon pig ${X}.5 ${Y} ${Z + 24}.5`); const e = s.peek('lastMob');
const still = () => { s.peek('EX')[e - 1] = X + 0.5; s.peek('EZ')[e - 1] = Z + 24.5; s.peek('EVX')[e - 1] = 0; s.peek('EVZ')[e - 1] = 0; };
const settle = () => { for (let i = 0; i < 12; i++) { still(); F(1); } };
settle();
const open = fills();
ok(s.peek('EVIS')[e - 1] === 1 && open > base + 3, `a pig 24 blocks ahead in the open is seen and drawn (fills ${base.toFixed(0)} -> ${open.toFixed(0)})`);
cmd(`/fill ${X - 2} ${Y} ${Z + 22} ${X + 2} ${Y + 3} ${Z + 22} stone`); settle();
const walled = fills();
ok(s.peek('EVIS')[e - 1] === 0, `a stone wall before it: not seen (drawn ${(walled - base).toFixed(0)} fills more than the bare floor - the wall's own)`);
cmd(`/fill ${X - 2} ${Y} ${Z + 22} ${X + 2} ${Y + 3} ${Z + 22} glass`); settle();
ok(s.peek('EVIS')[e - 1] === 1, 'a glass wall: seen through');
cmd(`/fill ${X - 2} ${Y} ${Z + 22} ${X + 2} ${Y + 3} ${Z + 22} stone`); cmd(`/setblock ${X + 1} ${Y} ${Z + 22} air`); cmd(`/setblock ${X + 1} ${Y + 1} ${Z + 22} air`); settle();
ok(s.peek('EVIS')[e - 1] === 1, 'a gap in the wall beside the line to its middle: its side is seen, it is drawn');
cmd(`/fill ${X - 2} ${Y} ${Z + 22} ${X + 2} ${Y + 3} ${Z + 22} air`);
// near: always drawn, whatever stands between
cmd(`/tp @e[type=pig] ${X}.5 ${Y} ${Z + 8}.5`);
const still2 = () => { s.peek('EX')[e - 1] = X + 0.5; s.peek('EZ')[e - 1] = Z + 8.5; s.peek('EVX')[e - 1] = 0; s.peek('EVZ')[e - 1] = 0; };
cmd(`/fill ${X - 2} ${Y} ${Z + 6} ${X + 2} ${Y + 3} ${Z + 6} stone`);
for (let i = 0; i < 12; i++) { still2(); F(1); }
ok(s.peek('EVIS')[e - 1] === 1, 'eight blocks off behind a wall: not looked at (drawn as before - a near one may show round a corner)');
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

// (v2.8) firework rockets: up from a block and burst; a push while gliding: node test/firework.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => KEY.indexOf(k), R = id('firework_rocket');
ok(R > 0 && s.peek('ITNAME')[R] === '폭죽 로켓', `the item: ${KEY[R]} (${s.peek('ITNAME')[R]})`);
// the recipe: paper and gunpowder, three
const RO = s.peek('ROUT'), RN = s.peek('RCNT');
ok(RO && RO.some((o, i) => o === R && RN[i] === 3), 'paper + gunpowder makes three');
s.poke('gameMode', 0); s.poke('flying', 0);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 90;
const cmd = (c) => call(() => fn.runCommand(c));
cmd(`/fill ${X - 3} ${Y - 1} ${Z - 3} ${X + 3} ${Y - 1} ${Z + 6} stone`);
cmd(`/fill ${X - 3} ${Y} ${Z - 3} ${X + 3} ${Y + 40} ${Z + 6} air`);
F(2);
const hold = (k, c) => { const I = s.peek('INVI'), N = s.peek('INVN'); s.poke('hotSel', 1); I[0] = k; N[0] = c; };
hold(R, 5);
s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0);
s.poke('pickOn', 1); s.poke('pickX', X); s.poke('pickY', Y - 1); s.poke('pickZ', Z + 3); s.poke('pickF', 3); s.poke('pickB', id('stone')); s.poke('placeCool', 0); s.poke('mobPick', 0);
call(() => fn.useKey());
const AON = () => s.peek('AON'), slot = AON().findIndex((k) => k === 10);
ok(slot >= 0 && s.peek('INVN')[0] === 4, `a rocket goes up (slot ${slot + 1}), one used (${s.peek('INVN')[0]} left)`);
const y0 = s.peek('AYY')[slot];
s.poke('pitch', 70); s.poke('yaw', 0);
F(60);
ok(s.peek('AYY')[slot] - y0 > 10 && AON()[slot] === 10, `up ${(s.peek('AYY')[slot] - y0).toFixed(1)} in 1 s`);
let burst = false, top = 0;
for (let i = 0; i < 60; i++) { F(1); if (AON()[slot] === 10) top = s.peek('AYY')[slot] - y0; if (AON()[slot] === 11) burst = true; }
ok(burst && top > 15 && top < 45, `it bursts ${top.toFixed(1)} up`);
// the burst drawn: frames looking at it (no error), then gone
F(30); ok(AON()[slot] === 11, 'the sparks a while');
F(120); ok(AON()[slot] === 0, 'and gone');
// under a roof: bursts at it
cmd(`/fill ${X - 3} ${Y + 4} ${Z - 3} ${X + 3} ${Y + 4} ${Z + 6} stone`); F(2);
s.poke('placeCool', 0); call(() => fn.useKey());
const s2 = AON().findIndex((k) => k === 10); F(40);
ok(s2 >= 0 && AON()[s2] === 11 && s.peek('AYY')[s2] < Y + 4, `under a roof it bursts below it (${(s.peek('AYY')[s2] - Y).toFixed(1)})`);
cmd(`/fill ${X - 3} ${Y + 4} ${Z - 3} ${X + 3} ${Y + 4} ${Z + 6} air`);
// gliding: a push the way of the eye
const I = s.peek('INVI'), D = s.peek('INVD'); I[37] = 173; D[37] = 0;
s.poke('py', Y + 60); s.poke('pitch', -10); s.poke('yaw', 0); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0);
F(15); s.press(32); F(2); s.release(32); F(30);
ok(s.peek('gliding') === 1, 'gliding');
const v0 = Math.hypot(s.peek('pvx'), s.peek('pvz'));
hold(R, 5); s.poke('pitch', 20); s.poke('placeCool', 0); s.poke('pickOn', 0); call(() => fn.useKey());
ok(s.peek('fwBoostT') > 1.5 && s.peek('INVN')[0] === 4, `the push starts (${s.peek('fwBoostT')}), one used`);
const yA = s.peek('py'); F(40);
const v1 = Math.hypot(s.peek('pvx'), s.peek('pvy'), s.peek('pvz'));
ok(v1 > 25 && v1 < 36 && s.peek('py') > yA + 3, `pushed: ${v0.toFixed(1)} -> ${v1.toFixed(1)} m/s, climbing ${(s.peek('py') - yA).toFixed(1)}`);
F(80);
ok(s.peek('fwBoostT') <= 0, 'the push over after 1.6 s');
// creative: none used
s.poke('gameMode', 1); hold(R, 5); s.poke('placeCool', 0); call(() => fn.useKey());
ok(s.peek('INVN')[0] === 5, 'creative: none used');
console.log(fails ? fails + ' FAILED' : 'all ok');

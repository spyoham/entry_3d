// (v2.6) the chat's history: all lines kept (100), the chat open shows 12 over the line typed (the
// newest at the bottom), the wheel and PgUp / PgDn go back and forth; closed: the last six fading.
// usage: node test/chathist.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(10);
call(() => { for (let i = 1; i <= 130; i++) fn.chatAdd('line ' + i); });
const T = (slot) => s.peek('TXS')[slot - 1];
const slot = (j) => (j <= 6 ? 103 + j : 133 + j);
F(2);
ok(s.peek('CHL').length === 100, `100 lines kept (${s.peek('CHL').length})`);
ok(T(109) === 'line 130' && T(104) === 'line 125', `closed: the last six (${T(104)} .. ${T(109)})`);
call(() => fn.chatOpen('')); F(3);
ok(T(slot(1)) === 'line 130' && T(slot(12)) === 'line 119', `open: 12 lines, the newest at the bottom (${T(slot(1))} .. ${T(slot(12))})`);
ok(s.peek('TXY')[slot(1) - 1] < s.peek('TXY')[slot(12) - 1], 'the newest lowest');
s.poke('wheelAcc', -1); call(() => fn.chatType(0.016));
F(1);
ok(T(slot(1)) === 'line 127', `the wheel up: 3 back (${T(slot(1))})`);
call(() => { s.peek('KQ').push(33); s.peek('KQS').push(0); fn.chatType(0.016); }); F(1);
ok(T(slot(1)) === 'line 121', `PgUp: 6 more back (${T(slot(1))})`);
for (let i = 0; i < 30; i++) call(() => { s.peek('KQ').push(33); s.peek('KQS').push(0); fn.chatType(0.016); });
F(1);
ok(T(slot(12)) === 'line 31' && T(slot(1)) === 'line 42', `back to the oldest kept (${T(slot(12))} .. ${T(slot(1))})`);
call(() => fn.chatAdd('new one')); F(1);
ok(T(slot(1)) === 'line 43', `a new line while looking back: the view stays (${T(slot(1))})`);
call(() => { s.peek('KQ').push(34); s.peek('KQS').push(0); fn.chatType(0.016); }); F(1);
ok(T(slot(1)) === 'line 49', `PgDn: forward (${T(slot(1))})`);
call(() => fn.chatClose()); F(2);
call(() => fn.chatOpen('')); F(2);
ok(T(slot(1)) === 'new one', `opened again: at the newest (${T(slot(1))})`);
call(() => fn.chatClose()); F(2);
ok(T(140) === '​' && T(145) === '​', 'closed: lines 7 .. 12 off');
console.log(fails ? fails + ' FAILED' : 'all ok');

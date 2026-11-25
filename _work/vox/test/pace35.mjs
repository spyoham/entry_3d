// (v3.5, 11-26) the pace of the picture (main.js paceSecond): a pause of the engine's - one short second or two after
// six full ones, its heap being cleared - changes nothing; a computer that is slow still gets the picture every
// other tick: node test/pace35.mjs
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const s = createSim({ consts: { AUTOSEED: 777, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3 } });
let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; }
const sec = (ticks) => { s.poke('secTicks', ticks); s.poke('secFrames', ticks); s.as('pen', () => s.fn.paceSecond()); return s.peek('kStep'); };
const reset = () => { for (const v of ['kBad', 'kGood', 'kRun', 'kHoldTo']) s.poke(v, 0); s.poke('kStep', 1); s.poke('kDecAt', -99); };
reset();
ok(sec(20) === 2, 'a short second with no full ones before it: every other tick, as before');
reset();
for (let i = 0; i < 8; i++) sec(60);
ok(sec(12) === 1, 'eight full seconds, then one of 12 ticks (the heap cleared): nothing changes');
ok(sec(30) === 1, 'nor for the second short one (a pause across two seconds)');
ok(sec(60) === 1 && sec(60) === 1, 'and the full seconds go on');
ok(sec(20) === 2, 'a short second three seconds after such a pause is not let pass (pauses are 15 seconds apart)');
reset();
for (let i = 0; i < 8; i++) sec(60);
sec(40); sec(40);
ok(sec(40) === 2, 'three short seconds in a row after full ones: a slow computer - every other tick');
reset();
for (let i = 0; i < 8; i++) sec(60);
ok(sec(52) === 1 && sec(52) === 1 && sec(52) === 2, 'seconds a little short (52 ticks): the third counts, as before');
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

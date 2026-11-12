// (v2.8) the texture distance setting: node test/texdist.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
s.poke('pitch', -25); F(60);
const fills = () => { let t = 0; for (let i = 0; i < 10; i++) { F(1); t += s.peek('nFill'); } return Math.round(t / 10); };
ok(s.peek('texD2') === 20 && call(() => fn.texName()) === '4.5 블록', 'by default as before: 4.5 blocks (d2 20)');
const base = fills();
call(() => fn.texSet(1)); const off = fills();
ok(s.peek('texD2') === -1 && call(() => fn.texName()) === '끔', 'off');
call(() => fn.texSet(99)); const far = fills();
ok(s.peek('texI') === 9 && s.peek('texD2') === 576, 'at most 24 blocks');
call(() => fn.texSet(-5)); ok(s.peek('texI') === 1, 'at least off');
ok(off < base && base < far, `fills a frame: off ${off} < 4.5 blocks ${base} < 24 blocks ${far}`);
console.log(fails ? fails + ' FAILED' : 'all ok');

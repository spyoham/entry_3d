// (v2.6.1) a still eye reuses the faces found (their buckets); a block put or broken, a turn of the
// eye, a step or another render distance finds them again - the same as finding them anew.
// usage: node test/facecache.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
s.poke('helpT', 0); s.poke('flying', 1); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); F(30);
// the faces of the last frame (without things), and found anew now
const chains = () => { const HD = s.peek('HDS'), BF = s.peek('BF'), BN = s.peek('BN'), out = []; for (let k = 0; k < HD.length; k++) { let m = HD[k]; while (m > 0) { if (BF[m - 1] > 0) out.push(BF[m - 1]); m = BN[m - 1]; } } return out.sort((a, b) => a - b).join(','); };
const fresh = () => { s.poke('fcX', -99999); F(1); return chains(); };
const v0 = s.peek('meshVer'); F(5);
ok(s.peek('fcVer') === s.peek('meshVer') && s.peek('fcX') === s.peek('camX'), 'standing still: the faces kept');
const px = Math.floor(s.peek('px')), py = Math.floor(s.peek('py')), pz = Math.floor(s.peek('pz'));
call(() => { fn.setBlock(px, py, pz + 3, 1); fn.worldFlush(); }); F(2);
let a = chains(), b = fresh(); F(1);
ok(a === b && a.length > 0, 'a block put before the eye: the faces found again, the same as anew');
s.poke('yaw', s.peek('yaw') + 30); F(2); a = chains(); b = fresh(); F(1);
ok(a === b, 'the eye turned: the same as anew');
s.poke('px', s.peek('px') + 0.37); F(2); a = chains(); b = fresh(); F(1);
ok(a === b, 'a step: the same as anew');
call(() => fn.setView(16)); F(2); a = chains(); b = fresh(); F(1);
ok(a === b, 'another render distance: the same as anew');
console.log(fails ? fails + ' FAILED' : 'all ok');

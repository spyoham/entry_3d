// flat worlds: node test/flat.mjs
import { createSim } from '../sim.mjs';
const mk = (c) => createSim({ consts: { TESTRUN: 1, ANIMALS: 0, ...c } });
const F = (sim, k = 1) => { for (let i = 0; i < k; i++) { try { sim.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const call = (sim, f) => sim.as('pen', f), cmd = (sim, t) => call(sim, () => sim.fn.runCommand(t));
const until = (sim, f, max = 8000) => { let n = 0; while (!f() && n < max) { F(sim); n++; } return n; };

// the layers read
const s = mk({});
F(s, 20);
const KEY = s.peek('ITKEY');
const parse = (t) => { const bad = call(s, () => s.fn.flatParse(t)); return { bad, L: s.peek('FLB').map(b => KEY[b]), err: s.peek('flatErr'), top: s.peek('flatTop') }; };
let r = parse('bedrock,2*dirt,grass_block');
ok(r.bad === 0 && r.L.join() === 'bedrock,dirt,dirt,grass_block' && r.top === 3, 'bedrock,2*dirt,grass_block: ' + r.L.join());
r = parse('기반암, 3*돌, 2*흙, 잔디_블록');
ok(r.bad === 0 && r.L.join() === 'bedrock,stone,stone,stone,dirt,dirt,grass_block', 'Korean names and spaces: ' + r.L.join());
r = parse('Bedrock,2*Stone'); ok(r.bad === 0 && r.L.join() === 'bedrock,stone,stone', 'upper case: ' + r.L.join());
r = parse('bedrock,3*nothing'); ok(r.bad === 1 && r.err.includes('nothing'), 'unknown block: ' + r.err);
r = parse('bedrock,x*dirt'); ok(r.bad === 1, 'bad count: ' + r.err);
r = parse('bedrock,200*stone'); ok(r.bad === 1 && r.err.includes('120'), 'too many: ' + r.err);
r = parse(''); ok(r.bad === 1, 'nothing: ' + r.err);
r = parse('bedrock,80*air,glass'); ok(r.bad === 0 && r.top === 81, 'air layers, the top is the glass: ' + r.top);
for (const p of s.peek('FLPS')) { const q = parse(p); ok(q.bad === 0, `preset ${p}: ${q.L.length} layers`); }

// a new flat world from the screen's values (as the button does)
s.poke('cwFlat', 1); s.poke('cwFlatSpec', 'bedrock,3*stone,2*dirt,grass_block'); s.poke('cwName', '평지 시험'); s.poke('cwMode', 1); s.poke('cwSeedText', '77');
call(s, () => s.fn.worldNew(1));
let n = until(s, () => s.peek('gState') === 2);
F(s, 20);
ok(s.peek('gState') === 2 && s.peek('flatOn') === 1, `the flat world is made (${n} frames)`);
const px = Math.floor(s.peek('px')), pz = Math.floor(s.peek('pz'));
const B = (sim, x, y, z) => KEY[call(sim, () => sim.fn.blockAt(x, y, z))];
let same = 0, all = 0;
for (let x = px - 40; x <= px + 40; x += 5) for (let z = pz - 40; z <= pz + 40; z += 5) {
  if (call(s, () => s.fn.cOK(x, z)) !== 1) continue;
  all++;
  const col = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(y => B(s, x, y, z)).join();
  if (col === 'bedrock,stone,stone,stone,dirt,dirt,grass_block, , ') same++;
}
ok(all > 50 && same === all, `every column is the layers (${same}/${all})`);
ok(Math.abs(s.peek('py') - 7) < 1.5, 'the player stands on top: y ' + s.peek('py').toFixed(2));
call(s, () => s.fn.biomeAt(px, pz)); ok(s.peek('bmAt') === 2, 'plains');
cmd(s, '/locate village'); ok(String(s.peek('CHT').slice(-1)[0]).includes('평지'), '/locate: ' + s.peek('CHT').slice(-1)[0]);
// it is kept, and comes back flat
cmd(s, `/setblock ${px + 2} 7 ${pz} gold_block`);
s.poke('AT_확장프로그램', 1);
call(s, () => s.fn.saveGame(1));
const save = s.peek('AT_세계1').slice();
ok(save[save.length - 2] === 'FLAT' && save[save.length - 1] === 'bedrock,3*stone,2*dirt,grass_block', 'kept: ' + save.slice(-3).join(' | '));
ok(call(s, () => s.fn.worldHead(1)) === 1 && s.peek('wFlat') === 'bedrock,3*stone,2*dirt,grass_block', 'the world list sees it flat');
const t = mk({});
F(t, 30);
t.poke('AT_세계1', save); t.poke('AT_확장프로그램', 1);
call(t, () => t.fn.loadGame(1));
n = until(t, () => t.peek('gState') === 2);
F(t, 10);
ok(t.peek('flatOn') === 1 && B(t, px + 5, 6, pz + 5) === 'grass_block' && B(t, px + 5, 1, pz + 5) === 'stone', 'loaded flat');
ok(B(t, px + 2, 7, pz) === 'gold_block', 'with its change');
// a save of before (ending at END) is a world with its land
const old = save.slice(0, save.length - 2);
const u = mk({});
F(u, 30);
// (the title's world was flat-off; make the next one flat first to see it put back)
u.poke('flatOn', 1);
u.poke('AT_세계1', old); u.poke('AT_확장프로그램', 1);
ok(call(u, () => u.fn.worldHead(1)) === 1 && u.peek('wFlat') === '-', 'an old save: the list says a normal world');
call(u, () => u.fn.loadGame(1));
n = until(u, () => u.peek('gState') === 2);
ok(u.peek('flatOn') === 0, 'an old save loads as a world with its land');
// a normal new world after a flat one
s.poke('gState', 0); s.poke('cwFlat', 0); s.poke('cwSeedText', '1234');
call(s, () => s.fn.worldNew(2));
n = until(s, () => s.peek('gState') === 2);
F(s, 10);
ok(s.peek('flatOn') === 0 && s.peek('py') > 20, `a normal world after it: y ${s.peek('py').toFixed(1)}`);
// a wrong spec: no world, the error shown
s.poke('gState', 0); s.poke('cwFlat', 1); s.poke('cwFlatSpec', 'bedrock,2*qqq');
call(s, () => s.fn.worldNew(3));
ok(s.peek('gState') === 0 && String(s.peek('menuErr')).includes('qqq'), 'a wrong spec stops it: ' + s.peek('menuErr'));
console.log(fails ? fails + ' FAILED' : 'all ok');

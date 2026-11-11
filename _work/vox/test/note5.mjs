// (v2.5) note blocks (25 notes, sixteen instruments by the block under them, air over them),
// bells on power, trapped chests, what comparators read.   usage: node test/note5.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
const BAUX = s.peek('BAUX'), BRS = s.peek('BRS');
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 16} ${Y - 1} ${Z - 16} ${X + 16} ${Y + 6} ${Z + 16} air`);
cmd(`/fill ${X - 16} ${Y - 1} ${Z - 16} ${X + 16} ${Y - 1} ${Z + 16} glass`);
s.poke('px', X + 0.5); s.poke('py', Y + 3); s.poke('pz', Z - 6); s.poke('flying', 1);
F(5);
const put = (x, y, z, key) => cmd(`/setblock ${x} ${y} ${z} ${key}`);
const useAt = (x, y, z) => call(() => { const b = fn.blockAt(x, y, z); fn.useBlock(x, y, z, b, 0); });
const settle = () => { call(() => fn.worldFlush()); F(2); };
const heard = (f) => { s.sounds.length = 0; f(); return s.sounds.slice(); };
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';

// 1 F on a note block: one note up, played (the rate of note 1), the name shown
put(X, Y, Z, 'note_block'); put(X, Y - 1, Z, 'oak_planks'); F(2);
let h = heard(() => useAt(X, Y, Z));
ok(BAUX[B(X, Y, Z)] === 1 && K(B(X, Y, Z)) === 'note_block_1', `F: note 1 (${K(B(X, Y, Z))})`);
ok(h.length === 1 && h[0][0] === 'n1' && Math.abs(h[0][1] - 0.5297) < 0.001, `played: the bass (planks under it) at 0.53 times: ${JSON.stringify(h)}`);
for (let i = 0; i < 24; i++) useAt(X, Y, Z);
ok(BAUX[B(X, Y, Z)] === 0 && K(B(X, Y, Z)) === 'note_block', 'twenty-five times round: note 0 again');
for (let i = 0; i < 12; i++) useAt(X, Y, Z);
// 2 the instrument by the block under it
const inst = { gold_block: 'n5', stone: 'n4', sand: 'n2', glass: 'n3', white_wool: 'n8', clay: 'n6', iron_block: 'n10', hay_block: 'n14', glow_crystal: 'n15', dirt: 'n0' };
for (const [k, want] of Object.entries(inst)) {
  put(X, Y - 1, Z, k); F(1);
  h = heard(() => call(() => fn.notePlay(X, Y, Z, fn.blockAt(X, Y, Z))));
  ok(h.length === 1 && h[0][0] === want && h[0][1] === 1, `on ${k}: ${want} (${JSON.stringify(h)})`);
}
// 3 a lever plays it once; with a block over it, nothing
put(X, Y - 1, Z, 'gold_block'); put(X + 1, Y, Z, 'lever'); F(2);
h = heard(() => { useAt(X + 1, Y, Z); settle(); wait(0.2); });
ok(h.filter(q => q[0] === 'n5').length === 1, 'a lever on: the bell note once: ' + JSON.stringify(h));
h = heard(() => { useAt(X + 1, Y, Z); settle(); wait(0.2); });
ok(h.filter(q => q[0][0] === 'n').length === 0, 'off: nothing');
put(X, Y + 1, Z, 'stone'); F(1);
h = heard(() => { useAt(X + 1, Y, Z); settle(); wait(0.2); });
ok(h.filter(q => q[0][0] === 'n').length === 0, 'a block over it: silent');
put(X, Y + 1, Z, 'air');
// a hit plays it
call(() => { s.poke('pickOn', 1); s.poke('pickX', X); s.poke('pickY', Y); s.poke('pickZ', Z); s.poke('pickB', fn.blockAt(X, Y, Z)); s.poke('breakX', -1); s.poke('clickHeld', 1); s.poke('uiMode', 0); s.poke('gameMode', 0); });
h = heard(() => { call(() => fn.breaking(1 / 60)); });
call(() => s.poke('clickHeld', 0));
ok(h.some(q => q[0] === 'n5'), 'a hit plays it: ' + JSON.stringify(h));
// 4 a bell rings on power
put(X + 4, Y, Z, 'bell'); put(X + 5, Y, Z, 'lever'); F(2);
h = heard(() => { useAt(X + 5, Y, Z); settle(); wait(0.2); });
ok(h.filter(q => q[0] === 's7').length === 1, 'a bell rings when the lever goes on: ' + JSON.stringify(h));
// 5 a trapped chest looked in: a lamp by it and one by the block under it light
put(X + 8, Y + 1, Z, 'trapped_chest'); put(X + 8, Y, Z, 'stone'); put(X + 9, Y + 1, Z, 'spark_lamp'); put(X + 9, Y, Z, 'spark_lamp'); F(2);
call(() => fn.chestOpen(X + 8, Y + 1, Z)); settle(); wait(0.1);
ok(lit(X + 9, Y + 1, Z) && lit(X + 9, Y, Z), 'a trapped chest open: the lamp by it and the one by the block under it light');
call(() => { fn.uiClose(); s.poke('uiMode', 0); }); settle(); wait(0.4);
ok(!lit(X + 9, Y + 1, Z) && !lit(X + 9, Y, Z), 'shut: out');
// 6 comparators read a furnace, a cake, a frame with its eye, an anchor
const lvl = (x, y, z) => BRS[B(x, y, z)] === 1 ? BAUX[B(x, y, z)] : -1;
const reads = (x, key, setup) => {
  put(x, Y, Z + 6, key); put(x, Y, Z + 5, 'comparator[facing=south]'); put(x, Y, Z + 4, 'spark_wire'); F(2);
  if (setup) setup(); call(() => fn.powerAround(x, Y, Z + 6)); settle(); wait(0.3);
  return lvl(x, Y, Z + 4);
};
ok(reads(X - 8, 'cake') === 14, 'a whole cake: 14');
ok(reads(X - 6, 'gate_frame_eye') === 15, 'a frame with its eye: 15');
const fl = reads(X - 4, 'furnace', () => call(() => { fn.furnaceAt(X - 4, Y, Z + 6); const f = s.peek('fFound'); s.peek('FII')[f - 1] = ID('cobblestone'); s.peek('FIN')[f - 1] = 64; }));
ok(fl === 5, `a furnace with 64 cobblestone to smelt: 5 (${fl})`);
ok(reads(X - 2, 'composter') === 0, 'a composter: 0');
console.log(fails ? fails + ' FAILED' : 'all ok');

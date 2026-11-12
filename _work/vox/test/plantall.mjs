// (v2.7.4) every item that plants something, tried on the grounds it may stand on: node test/plantall.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), PLB = s.peek('ITPLB'), FOOD = s.peek('ITFOOD'), SHP = s.peek('BSHP'), NEED = s.peek('BNEED'), NAME = s.peek('ITNAME');
const id = (k) => KEY.indexOf(k);
s.poke('gameMode', 0);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 90;
const GROUNDS = ['farmland', 'grass_block', 'dirt', 'sand', 'ashstone', 'ember_moss', 'wail_soil', 'stone'];
const WAT = s.peek('BWATER'), LQ = s.peek('BLQ');
// the items to try: a placeBlock of another id (seeds, carrot, potato, berries ...) or a plant block itself
const items = [];
for (let i = 1; i < KEY.length; i++) {
  const b = PLB[i - 1 + 1 - 1]; if (!(b > 0)) continue;
  const isPlant = SHP[b] === 1 || b !== i - 0 && FOOD[i - 1 + 1 - 1] > 0;
  if (!isPlant) continue;
  if (/_[0-9]+$/.test(KEY[i])) continue;
  if (/_[0-9]+$/.test(KEY[i])) continue;
  items.push(i - 1 + 1 - 1);
}
const tryOn = (it, g) => {
  call(() => fn.runCommand(`/fill ${X - 2} ${Y - 1} ${Z - 2} ${X + 2} ${Y + 3} ${Z + 2} air`));
  call(() => fn.runCommand(`/setblock ${X} ${Y - 1} ${Z} ${g}`));
  call(() => fn.runCommand(`/setblock ${X + 1} ${Y - 1} ${Z} water`));
  if (WAT[PLB[it]] === 1) call(() => fn.runCommand(`/fill ${X - 2} ${Y} ${Z - 2} ${X + 2} ${Y + 2} ${Z + 2} water`));
  F(2);
  const before = s.peek('blockAt') ? 0 : 0;
  s.poke('pickOn', 1); s.poke('pickX', X); s.poke('pickY', Y - 1); s.poke('pickZ', Z); s.poke('pickF', 3); s.poke('pickB', call(() => fn.blockAt(X, Y - 1, Z)));
  s.poke('px', X + 2.5); s.poke('py', Y); s.poke('pz', Z + 0.5); s.poke('placeCool', 0); s.poke('sneaking', 0); s.poke('mobPick', 0);
  const I = s.peek('INVI'), N = s.peek('INVN'); I[s.peek('hotSel') - 1] = it; N[s.peek('hotSel') - 1] = 5;
  call(() => fn.useKey());
  let got = call(() => fn.blockAt(X, Y, Z)); if (LQ[got] > 0) got = 0;
  const ate = s.peek('eatId'); s.poke('eatId', 0);
  return ate > 0 ? 0 : got;
};
for (const it of items) {
  let where = [];
  for (const g of GROUNDS) { if (id(g) < 0) continue; const got = tryOn(it, g); if (got > 0) where.push(g); }
  ok(where.length > 0, `${KEY[it]} (${NAME[it]}): ${where.join(', ') || 'nowhere'}`);
}
console.log(fails ? fails + ' FAILED' : 'all ok');

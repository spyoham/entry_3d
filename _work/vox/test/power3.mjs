// redstone, the third set (v2.4.4: light sensors, dispensers, droppers, hoppers, targets, arrows on buttons, parts put by power, wire stairs, pistons, command blocks): node test/power3.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
const BRS = s.peek('BRS'), BON = s.peek('BON'), BAUX = s.peek('BAUX'), BFAC = s.peek('BFAC'), BATT = s.peek('BATT');
const on = (x, y, z) => BON[B(x, y, z)];
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 24} ${Y - 1} ${Z - 24} ${X + 24} ${Y + 8} ${Z + 24} air`);
cmd(`/fill ${X - 24} ${Y - 1} ${Z - 24} ${X + 24} ${Y - 1} ${Z + 24} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 12); s.poke('pz', Z - 22); s.poke('flying', 1);
F(5);
const put = (x, y, z, key) => cmd(`/setblock ${x} ${y} ${z} ${key}`);
const useAt = (x, y, z) => call(() => { const b = fn.blockAt(x, y, z); fn.useBlock(x, y, z, b, 0); });
// as the player: the face f (D6: 0 -x 1 +x 2 -y 3 +y 4 -z 5 +z) of the block next to (x, y, z) clicked, looking yaw / pitch
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const placeAs = (x, y, z, key, f = 3, yaw = 0, pitch = 0) => call(() => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  s.poke('yaw', yaw); s.poke('pitch', pitch);
  s.poke('pickX', cx); s.poke('pickY', cy); s.poke('pickZ', cz); s.poke('pickF', f); s.poke('pickB', fn.blockAt(cx, cy, cz)); s.poke('pickHY', 0.9); s.poke('placeCool', 0);
  const it = ID(key); fn.placeBlock(s.peek('ITPLB')[it], it);
});
const settle = () => { call(() => fn.worldFlush()); F(2); };
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';
const lvl = (x, y, z) => BRS[B(x, y, z)] === 1 ? BAUX[B(x, y, z)] : -1;
const chestOf = (x, y, z) => call(() => { fn.chestAt(x, y, z); return s.peek('cFound'); });
const slots = (c) => { const I = s.peek('CHI'), N = s.peek('CHN'), r = []; for (let k = 1; k <= 27; k++) if (I[(c - 1) * 27 + k - 1] > 0) r.push(KEY[I[(c - 1) * 27 + k - 1]] + 'x' + N[(c - 1) * 27 + k - 1]); return r.join(','); };
const putIn = (c, k, id, n) => call(() => { s.peek('CHI')[(c - 1) * 27 + k - 1] = id; s.peek('CHN')[(c - 1) * 27 + k - 1] = n; s.peek('CHD')[(c - 1) * 27 + k - 1] = 0; });
const items = () => { const I = s.peek('IID'); return I.filter((q) => q > 0).length; };

// 1 light sensors: by the sun; turned with F
{
  const x0 = X - 20, z0 = Z - 20;
  put(x0, Y, z0, 'daylight_detector'); put(x0 + 1, Y - 1, z0, 'stone'); put(x0 + 1, Y, z0, 'spark_wire');
  s.poke('tday', 0.25); s.poke('wthr', 0); F(90);
  const noon = lvl(x0 + 1, Y, z0);
  s.poke('tday', 0.47); F(90);
  const eve = lvl(x0 + 1, Y, z0);
  s.poke('tday', 0.75); F(90);
  const night = lvl(x0 + 1, Y, z0);
  ok(noon === 15 && eve > 0 && eve < 15 && night === 0, `a sensor gives 15 at noon, less toward evening, 0 at night (${noon}, ${eve}, ${night})`);
  useAt(x0, Y, z0); F(90);
  ok(K(B(x0, Y, z0)) === 'daylight_detector_inverted' && lvl(x0 + 1, Y, z0) > 0, 'F turns it: at night it gives ' + lvl(x0 + 1, Y, z0));
  s.poke('tday', 0.25); F(90);
  ok(lvl(x0 + 1, Y, z0) === 0, 'turned, at noon: 0');
  useAt(x0, Y, z0); F(10);
}
// 2 a dispenser shoots an arrow, pours water and takes it back, sets TNT going
{
  const x0 = X - 14, z0 = Z - 20;
  placeAs(x0, Y, z0, 'dispenser', 3, 270);    // faces +x
  const c = chestOf(x0, Y, z0);
  placeAs(x0, Y, z0 - 1, 'stone_button', 3, 0);
  const shoot = () => { call(() => fn.buttonPress(x0, Y, z0 - 1)); F(70); };
  ok(BFAC[B(x0, Y, z0)] === 1, 'a dispenser facing +x');
  putIn(c, 1, ID('arrow'), 3);
  const a0 = s.peek('AON').filter((q) => q > 0).length;
  call(() => fn.buttonPress(x0, Y, z0 - 1)); F(16);
  const a1 = s.peek('AON').filter((q) => q > 0).length;
  ok(a1 === a0 + 1 && slots(c) === 'arrowx2', `it shoots an arrow (${a0} -> ${a1} arrows, left ${slots(c)})`);
  F(70);
  putIn(c, 1, ID('water_bucket'), 1);
  shoot();
  ok(B(x0 + 1, Y, z0) === 7 && slots(c) === 'bucketx1', `a water bucket: water before it, an empty bucket back (${K(B(x0 + 1, Y, z0))}, ${slots(c)})`);
  shoot();
  ok(s.peek('BLV')[B(x0 + 1, Y, z0)] !== 0 && slots(c) === 'water_bucketx1', `the empty bucket takes the water back (${K(B(x0 + 1, Y, z0))}, ${slots(c)})`);
  putIn(c, 1, ID('tnt'), 1);
  shoot();
  ok(K(B(x0 + 1, Y, z0)) === 'tnt' && call(() => fn.tntLit(x0 + 1, Y, z0)) === 1, 'TNT: put before it, lit');
  F(300);
  function BLQ_at(x) { return s.peek('BLQ')[B(x, Y, z0)]; }
}
// 3 a dropper puts into a chest before it; a hopper takes from a chest above into a chest below, held by power
{
  const x0 = X - 4, z0 = Z - 20;
  placeAs(x0, Y, z0, 'dropper', 3, 270); put(x0 + 1, Y, z0, 'chest');
  const c = chestOf(x0, Y, z0), c2 = chestOf(x0 + 1, Y, z0);
  putIn(c, 1, ID('cobblestone'), 5);
  placeAs(x0, Y, z0 - 1, 'stone_button', 3, 0); call(() => fn.buttonPress(x0, Y, z0 - 1)); F(20);
  ok(slots(c2) === 'cobblestonex1' && slots(c) === 'cobblestonex4', `the dropper put one into the chest (${slots(c)} -> ${slots(c2)})`);
  const hx = X + 4, hz = Z - 20;
  put(hx, Y + 2, hz, 'chest'); put(hx, Y + 1, hz, 'hopper'); put(hx, Y, hz, 'chest');
  const top = chestOf(hx, Y + 2, hz), hop = chestOf(hx, Y + 1, hz), bot = chestOf(hx, Y, hz);
  putIn(top, 1, ID('diamond'), 3);
  wait(3);
  ok(slots(top) === '' && slots(hop) === '' && slots(bot) === 'diamondx3', `a hopper carried 3 diamonds from the chest over it to the chest under it (${slots(top)} | ${slots(hop)} | ${slots(bot)})`);
  put(hx + 1, Y + 1, hz, 'spark_block'); putIn(top, 1, ID('diamond'), 2); wait(3);
  ok(slots(top) === 'diamondx2', 'powered, it holds: ' + slots(top));
  put(hx + 1, Y + 1, hz, 'air');
  call(() => { for (let i = 0; i < 2; i++) fn.dropItem(ID('iron_ingot'), 2, 0, hx + 0.5, Y + 2.6, hz + 0.5, 0); });
  put(hx, Y + 2, hz, 'air'); wait(4);
  ok(slots(bot).includes('iron_ingotx4'), 'items lying on it go in: ' + slots(bot));
}
// 4 the target by where it is hit; an arrow in a wooden button presses it
{
  const x0 = X + 10, z0 = Z - 20;
  put(x0, Y + 1, z0, 'target'); put(x0, Y + 2, z0, 'spark_wire');
  call(() => fn.arrowShoot(x0 - 1.2, Y + 1.5, z0 + 0.5, x0, Y + 1.5, z0 + 0.5, 1)); F(30);
  const mid = lvl(x0, Y + 2, z0);
  F(90);
  call(() => fn.arrowShoot(x0 - 1.2, Y + 1.93, z0 + 0.5, x0, Y + 1.93, z0 + 0.5, 1)); F(30);
  const edge = lvl(x0, Y + 2, z0);
  ok(mid >= 13 && edge >= 1 && edge < mid, `the target: in the middle ${mid}, near the edge ${edge}`);
  F(90);
  put(x0 + 4, Y + 1, z0 + 3, 'stone'); put(x0 + 3, Y + 1, z0 + 3, 'oak_button[face=wall,facing=west]');
  F(10);
  call(() => fn.arrowShoot(x0 + 1, Y + 1.5, z0 + 3.5, x0 + 4, Y + 1.5, z0 + 3.5, 1)); F(20);
  ok(BRS[B(x0 + 3, Y + 1, z0 + 3)] === 6 && call(() => fn.pressLevel(x0 + 3, Y + 1, z0 + 3)) === 15, 'an arrow in a wooden button presses it');
}
// 5 a note block put next to a lever already on does not sound; a dispenser put so does not fire
{
  const x0 = X + 18, z0 = Z - 20;
  placeAs(x0, Y, z0, 'lever'); useAt(x0, Y, z0); settle();
  const it0 = items();
  placeAs(x0 + 1, Y, z0, 'dispenser', 3, 270); const c = chestOf(x0 + 1, Y, z0); putIn(c, 1, ID('cobblestone'), 3); settle(); F(20);
  ok(items() === it0 && slots(c) === 'cobblestonex3', 'a dispenser put by a lever already on does not fire (' + slots(c) + ')');
}
// 6 wire on a glass stair carries power up but not down
{
  const x0 = X - 20, z0 = Z - 12;
  put(x0, Y, z0, 'spark_wire'); put(x0 + 1, Y, z0, 'glass'); put(x0 + 1, Y + 1, z0, 'spark_wire'); put(x0 + 2, Y + 1, z0, 'glass'); put(x0 + 2, Y + 2, z0, 'spark_wire');
  put(x0 - 1, Y, z0, 'spark_block'); settle(); wait(0.3);
  ok(lvl(x0 + 2, Y + 2, z0) === 13, 'up a glass stair: 15 14 13 (' + [lvl(x0, Y, z0), lvl(x0 + 1, Y + 1, z0), lvl(x0 + 2, Y + 2, z0)].join(' ') + ')');
  put(x0 - 1, Y, z0, 'air'); put(x0 + 3, Y + 2, z0, 'spark_block'); settle(); wait(0.3);
  ok(lvl(x0 + 2, Y + 2, z0) === 15 && lvl(x0 + 1, Y + 1, z0) === 0 && lvl(x0, Y, z0) === 0, 'down the glass stair: nothing (' + [lvl(x0, Y, z0), lvl(x0 + 1, Y + 1, z0), lvl(x0 + 2, Y + 2, z0)].join(' ') + ')');
  put(x0 + 3, Y + 2, z0, 'air');
}
// 7 a command block's ~ is its own cell
{
  const x0 = X - 12, z0 = Z - 12;
  put(x0, Y, z0, 'command_block');
  call(() => { s.peek('CBX').push(x0); s.peek('CBY').push(Y); s.peek('CBZ').push(z0); s.peek('CBT').push('/setblock ~ ~1 ~ gold_block'); s.peek('CBD').push(0); });
  placeAs(x0 - 1, Y, z0, 'lever'); useAt(x0 - 1, Y, z0); settle(); F(10);
  ok(K(B(x0, Y + 1, z0)) === 'gold_block' && K(B(x0, Y + 2, z0)) !== 'gold_block', `/setblock ~ ~1 ~ from a command block: right over it (${K(B(x0, Y + 1, z0))}, ${K(B(x0, Y + 2, z0))})`);
}
console.log(fails ? fails + ' FAILED' : 'all ok');

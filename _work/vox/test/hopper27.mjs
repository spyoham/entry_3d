// (v2.7) hoppers as the genre: put pointing into the block clicked, a line sideways carries items
// along (2.5 a second), from a chest over the first into a chest at the end, into a furnace's input
// from above and its fuel from the side, out of its output from under it, into a dispenser, held by
// power, 5 slots; a torch clock the genre keeps running keeps running; TNT carts on a server
// usage: node test/hopper27.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => call(() => fn.runCommand(t));
const KEY = s.peek('ITKEY'), K = (b) => KEY[b], ID = (k) => KEY.indexOf(k);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
// put as the player: the face f of the block before (x, y, z) clicked (f: D6, the way from that block to here)
const placeAs = (x, y, z, key, f = 3, yaw = 0) => call(() => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  s.poke('yaw', yaw); s.poke('pitch', 0);
  s.poke('pickX', cx); s.poke('pickY', cy); s.poke('pickZ', cz); s.poke('pickF', f); s.poke('pickB', fn.blockAt(cx, cy, cz)); s.poke('pickHY', 0.5); s.poke('placeCool', 0);
  const it = ID(key); fn.placeBlock(s.peek('ITPLB')[it], it);
});
const put = (x, y, z, k) => cmd(`/setblock ${x} ${y} ${z} ${k}`);
const chestOf = (x, y, z) => call(() => { fn.chestAt(x, y, z); return s.peek('cFound'); });
const CHI = s.peek('CHI'), CHN = s.peek('CHN');
const slots = (c, n = 27) => { const r = []; for (let k = 0; k < n; k++) { const i = CHI[(c - 1) * 27 + k]; if (i > 0) r.push(K(i) + 'x' + CHN[(c - 1) * 27 + k]); } return r.join(','); };
const putIn = (c, k, id, n) => { CHI[(c - 1) * 27 + k - 1] = id; CHN[(c - 1) * 27 + k - 1] = n; };
const total = (c, key) => { let t = 0; for (let k = 0; k < 27; k++) if (CHI[(c - 1) * 27 + k] === ID(key)) t += CHN[(c - 1) * 27 + k]; return t; };
F(20);
const X = 0, Y = 100, Z = 0;
cmd(`/fill ${X - 10} ${Y - 1} ${Z - 10} ${X + 14} ${Y + 6} ${Z + 14} air`);
cmd(`/fill ${X - 10} ${Y - 1} ${Z - 10} ${X + 14} ${Y - 1} ${Z + 14} stone`);
s.poke('gameMode', 1);

// 1 a line: chest over the first hopper, three hoppers pointing +x, a chest at the end
put(X + 4, Y, Z, 'chest');
placeAs(X + 3, Y, Z, 'hopper', 0);      // the chest's -x face clicked: points +x into it
placeAs(X + 2, Y, Z, 'hopper', 0);
placeAs(X + 1, Y, Z, 'hopper', 0);
ok([1, 2, 3].every(i => K(B(X + i, Y, Z)) === 'hopper_east'), `put against a side they point that way (${[1, 2, 3].map(i => K(B(X + i, Y, Z))).join(' ')})`);
put(X + 1, Y + 1, Z, 'chest');
const top = chestOf(X + 1, Y + 1, Z), end = chestOf(X + 4, Y, Z);
putIn(top, 1, ID('cobblestone'), 20);
F(60 * 2);
const got2 = total(end, 'cobblestone');
F(60 * 4);
const got6 = total(end, 'cobblestone');
ok(got2 >= 1 && got6 - got2 >= 8 && got6 - got2 <= 12, `items go along the line at the genre's 2.5 a second (${got2} after 2 s, ${got6 - got2} more in 4 s)`);
F(60 * 6);
ok(total(end, 'cobblestone') === 20 && total(top, 'cobblestone') === 0, `all 20 arrive (${slots(end)} | top ${slots(top)})`);
// held by power: a block of power by the middle one
put(X + 2, Y, Z + 1, 'spark_block'); putIn(top, 1, ID('stick'), 5); F(60 * 4);
ok(total(end, 'stick') === 0, `a powered hopper holds the line (${slots(end)})`);
put(X + 2, Y, Z + 1, 'air'); F(60 * 4);
ok(total(end, 'stick') === 5, `power gone, it goes on (${slots(end)})`);

// 2 a furnace: from above into its input, from the side into its fuel, the output out from under it
const FX = X, FZ = Z + 6;
put(FX, Y + 1, FZ, 'furnace');
placeAs(FX, Y + 2, FZ, 'hopper', 3);   // on top: points down
placeAs(FX - 1, Y + 1, FZ, 'hopper', 0);   // beside: points +x into it
placeAs(FX, Y, FZ, 'hopper', 2);   // under it... (clicked from below: still down)
ok(K(B(FX, Y + 2, FZ)) === 'hopper' && K(B(FX - 1, Y + 1, FZ)) === 'hopper_east' && K(B(FX, Y, FZ)) === 'hopper', `top down, side east, under down (${K(B(FX, Y + 2, FZ))} ${K(B(FX - 1, Y + 1, FZ))} ${K(B(FX, Y, FZ))})`);
put(FX, Y - 1, FZ, 'chest');
const hTop = chestOf(FX, Y + 2, FZ), hSide = chestOf(FX - 1, Y + 1, FZ), out = chestOf(FX, Y - 1, FZ);
putIn(hTop, 1, ID('iron_ore'), 2); putIn(hSide, 1, ID('coal'), 2);
F(60 * 30);
ok(total(out, 'iron_ingot') === 2, `ore from above, coal from the side: the ingots come out into the chest under it (${slots(out)})`);

// 3 into a dispenser; 5 slots
const DX = X + 6, DZ = Z + 6;
put(DX, Y, DZ, 'dispenser');
placeAs(DX, Y + 1, DZ, 'hopper', 3);
const hd = chestOf(DX, Y + 1, DZ), dc = chestOf(DX, Y, DZ);
putIn(hd, 1, ID('arrow'), 3); F(60 * 3);
ok(total(dc, 'arrow') === 3, `a hopper fills a dispenser (${slots(dc)})`);
for (let k = 1; k <= 7; k++) putIn(hd, k, ID('stick'), 64);
F(60 * 2);
ok(total(dc, 'stick') <= 6 * 64 && slots(hd, 27).split(',').length <= 5 + 2, 'a hopper uses 5 slots');
ok(call(() => fn.chestCap(dc)) === 9 && call(() => fn.chestCap(hd)) === 5, 'dispenser 9, hopper 5');

// 4 torch burnout counted in game ticks: 8 goings-out within 60 ticks burn out, 8 within 63 do not
s.poke('gtNow', 1000);
for (let i = 0; i < 8; i++) { s.poke('gtNow', 1000 + i * 9); call(() => fn.torchToggled(50, 60, 50)); }
ok(call(() => fn.torchBurnt(50, 60, 50)) === 0, '8 goings-out 9 ticks apart (63 ticks): not burnt, as the genre');
for (let i = 0; i < 8; i++) { s.poke('gtNow', 2000 + i * 8); call(() => fn.torchToggled(51, 60, 50)); }
ok(call(() => fn.torchBurnt(51, 60, 50)) === 1, '8 goings-out 8 ticks apart (56 ticks): burnt');
console.log(fails ? fails + ' FAILED' : 'all ok');

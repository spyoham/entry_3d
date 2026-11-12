// (v2.5) rails and minecarts: rails put join (straight, curves, slopes), powered and activator rails
// on along 8, carts run along them (down a slope, round a curve), a powered rail pushes and brakes,
// a detector rail gives power, an activator rail lets the rider off and lights a TNT cart.
// usage: node test/rails5.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const KEY = s.peek('ITKEY'), ID = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; }, K = (b) => KEY[b];
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => call(() => fn.runCommand(t));
const BON = s.peek('BON'), BFAC = s.peek('BFAC');
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(20);
const X = 8, Y = 100, Z = 8;
cmd(`/fill ${X - 30} ${Y - 1} ${Z - 30} ${X + 30} ${Y + 8} ${Z + 30} air`);
cmd(`/fill ${X - 30} ${Y - 1} ${Z - 30} ${X + 30} ${Y - 1} ${Z + 30} stone`);
s.poke('px', X + 0.5); s.poke('py', Y + 8); s.poke('pz', Z - 20); s.poke('flying', 1);
F(5);
const put = (x, y, z, key) => cmd(`/setblock ${x} ${y} ${z} ${key}`);
const settle = () => { call(() => fn.worldFlush()); F(2); };
const DV = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const placeAs = (x, y, z, key, f = 3, yaw = 0, pitch = 0) => call(() => {
  const [dx, dy, dz] = DV[f]; const cx = x - dx, cy = y - dy, cz = z - dz;
  s.poke('yaw', yaw); s.poke('pitch', pitch);
  s.poke('pickX', cx); s.poke('pickY', cy); s.poke('pickZ', cz); s.poke('pickF', f); s.poke('pickB', fn.blockAt(cx, cy, cz)); s.poke('pickHY', 0.9); s.poke('placeCool', 0); s.poke('pickOn', 1);
  const it = ID(key); fn.placeBlock(s.peek('ITPLB')[it], it);
});
const shape = (x, y, z) => BFAC[B(x, y, z)];
const lit = (x, y, z) => K(B(x, y, z)) === 'spark_lamp_on';
const carts = () => { const ET = s.peek('ET'), r = []; for (let i = 0; i < ET.length; i++) if (ET[i] === s.peek('M_MINECART') || ET[i] === s.peek('M_TNTCART')) r.push(i + 1); return r; };
const cart = (e) => ({ x: s.peek('EX')[e - 1], y: s.peek('EY')[e - 1], z: s.peek('EZ')[e - 1], vx: s.peek('EVX')[e - 1], vz: s.peek('EVZ')[e - 1] });
const placeCart = (x, y, z, key = 'minecart') => call(() => {
  s.poke('pickOn', 1); s.poke('pickX', x); s.poke('pickY', y); s.poke('pickZ', z); s.poke('pickB', fn.blockAt(x, y, z));
  fn.useItem(ID(key));
});

// 1 rails put: a line along x, then a corner (a curve), then one by a rail one up (a slope)
for (let x = X; x <= X + 4; x++) placeAs(x, Y, Z, 'rail', 3, 90);
ok([0, 1, 2, 3, 4].every((d) => shape(X + d, Y, Z) === 1), 'a line put looking along x: along x');
for (let z = Z + 1; z <= Z + 3; z++) placeAs(X + 4, Y, z, 'rail', 3, 0);
ok(shape(X + 4, Y, Z) === 6 || shape(X + 4, Y, Z) === 7, `the end of the line turned to the rails going +z: a curve (${shape(X + 4, Y, Z)})`);
ok(shape(X + 4, Y, Z) === 7, `the curve joins -x and +z: shape 7 (${shape(X + 4, Y, Z)})`);
put(X + 4, Y, Z + 5, 'stone'); placeAs(X + 4, Y + 1, Z + 5, 'rail', 3, 0); placeAs(X + 4, Y, Z + 4, 'rail', 3, 0);
ok(shape(X + 4, Y, Z + 4) === 5, `a rail by one a block up: it goes up to +z (${shape(X + 4, Y, Z + 4)})`);
const powd = (x, y, z) => BON[B(x, y, z)];

// 2 a powered rail line: a lever powers it and 8 along; the tenth stays off
for (let x = X - 20; x <= X - 10; x++) placeAs(x, Y, Z + 10, 'powered_rail', 3, 90);
put(X - 20, Y, Z + 9, 'lever'); F(2);
call(() => { const b = fn.blockAt(X - 20, Y, Z + 9); fn.useBlock(X - 20, Y, Z + 9, b, 0); }); settle(); wait(0.2);
const onN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => powd(X - 20 + d, Y, Z + 10)).join('');
ok(onN === '11111111100', `powered rails on along 8 from the lever: ${onN}`);
call(() => { const b = fn.blockAt(X - 20, Y, Z + 9); fn.useBlock(X - 20, Y, Z + 9, b, 0); }); settle(); wait(0.3);
ok([0, 1, 2, 8].every((d) => powd(X - 20 + d, Y, Z + 10) === 0), 'the lever off: all off');

// 3 a cart on a straight line pushed: it runs, an empty one slows; down a slope it goes faster
for (let x = X - 20; x <= X - 5; x++) placeAs(x, Y, Z - 10, 'rail', 3, 90);
placeCart(X - 20, Y, Z - 10);
let cs = carts();
ok(cs.length === 1, 'a minecart put on the rail');
const c1 = cs[0];
s.peek('EVX')[c1 - 1] = 6; F(30);
ok(cart(c1).x > X - 20 + 1.5 && Math.abs(cart(c1).z - (Z - 10 + 0.5)) < 0.01, `pushed along x it runs on the rail (x ${cart(c1).x.toFixed(2)})`);
const v1 = cart(c1).vx; wait(2);
ok(cart(c1).vx < v1, `an empty cart slows (${v1.toFixed(2)} -> ${cart(c1).vx.toFixed(2)})`);
// a curve
call(() => { s.peek('ET')[c1 - 1] = 0; });
placeCart(X, Y, Z); cs = carts(); const c2 = cs[0];
s.peek('EVX')[c2 - 1] = 6; wait(1.5);
ok(cart(c2).z > Z + 1.2 && Math.abs(cart(c2).x - (X + 4.5)) < 0.05, `round the curve it goes +z (${cart(c2).x.toFixed(2)}, ${cart(c2).z.toFixed(2)})`);
call(() => { s.peek('ET')[c2 - 1] = 0; });
// a slope: a cart let go at the top runs down
for (let i = 0; i < 4; i++) put(X + 10 + i, Y + 3 - i - 1, Z + 20, 'stone');
for (let i = 0; i < 4; i++) cmd(`/fill ${X + 10 + i} ${Y} ${Z + 20} ${X + 10 + i} ${Y + 2 - i - 1} ${Z + 20} stone`);
put(X + 9, Y + 3, Z + 20, 'rail[shape=east_west]');
for (let i = 0; i < 3; i++) put(X + 10 + i, Y + 2 - i, Z + 20, 'rail[shape=ascending_west]');
for (let x = X + 13; x <= X + 20; x++) put(x, Y, Z + 20, 'rail[shape=east_west]');
put(X + 9, Y + 2, Z + 20, 'stone'); F(2);
s.poke('pz', Z + 10); placeCart(X + 9, Y + 3, Z + 20); cs = carts(); const c3 = cs[0];
s.peek('EVX')[c3 - 1] = 2; wait(1.5);
ok(cart(c3).y < Y + 0.2 && cart(c3).vx > 2, `down the slope it comes fast (y ${cart(c3).y.toFixed(2)}, v ${cart(c3).vx.toFixed(2)})`);
call(() => { s.peek('ET')[c3 - 1] = 0; });

// 4 a powered rail on pushes a cart standing against a block, off brakes one
put(X - 21, Y, Z - 15, 'stone');
for (let x = X - 20; x <= X - 8; x++) put(x, Y, Z - 15, 'rail[shape=east_west]');
put(X - 20, Y, Z - 15, 'powered_rail[shape=east_west]'); put(X - 20, Y, Z - 16, 'spark_block'); F(2); settle(); F(2);
ok(powd(X - 20, Y, Z - 15) === 1, 'a powered rail by a spark block: on');
placeCart(X - 20, Y, Z - 15); cs = carts(); const c4 = cs[0];
wait(0.5);
ok(cart(c4).x > X - 19 && cart(c4).vx > 1, `a cart on it against the stone is pushed away (v ${cart(c4).vx.toFixed(2)})`);
call(() => { s.peek('ET')[c4 - 1] = 0; });
put(X - 14, Y, Z - 15, 'powered_rail[shape=east_west]'); F(2);
placeCart(X - 17, Y, Z - 15); cs = carts(); const c5 = cs[0];
s.peek('EVX')[c5 - 1] = 5; wait(1.5);
ok(cart(c5).x < X - 12 && Math.abs(cart(c5).vx) < 0.01, `an unpowered one brakes it (stopped at x ${cart(c5).x.toFixed(2)})`);
call(() => { s.peek('ET')[c5 - 1] = 0; });

// 5 a detector rail gives power while a cart is on it
for (let x = X - 20; x <= X - 10; x++) put(x, Y, Z + 20, 'rail[shape=east_west]');
put(X - 15, Y, Z + 20, 'detector_rail[shape=east_west]'); put(X - 15, Y, Z + 21, 'spark_lamp'); F(2);
placeCart(X - 15, Y, Z + 20); wait(0.2);
ok(lit(X - 15, Y, Z + 21), 'a cart on a detector rail: the lamp by it lit');
cs = carts(); call(() => { s.peek('ET')[cs[0] - 1] = 0; }); wait(1.5);
ok(!lit(X - 15, Y, Z + 21), 'the cart gone: out');

// 6 an activator rail on: the rider off, a TNT cart lit (it goes off 4 s after)
for (let x = X - 20; x <= X - 10; x++) put(x, Y, Z + 25, 'rail[shape=east_west]');
put(X - 14, Y, Z + 25, 'activator_rail[shape=east_west]'); put(X - 14, Y, Z + 26, 'spark_block'); F(2); settle(); F(2);
ok(powd(X - 14, Y, Z + 25) === 1, 'the activator rail by a spark block: on');
placeCart(X - 18, Y, Z + 25); cs = carts(); const c6 = cs[0];
s.poke('flying', 0); s.poke('riding', c6); s.peek('EVX')[c6 - 1] = 4; wait(1.5);
ok(s.peek('riding') === 0, 'riding over it: let off');
s.poke('flying', 1); s.poke('px', X + 0.5); s.poke('py', Y + 8); s.poke('pz', Z + 10);
call(() => { s.peek('ET')[c6 - 1] = 0; });
placeCart(X - 18, Y, Z + 25, 'tnt_minecart'); cs = carts(); const c7 = cs[0];
s.peek('EVX')[c7 - 1] = 7; wait(1.5);
ok(s.peek('EST')[c7 - 1] === 1 && s.peek('ET')[c7 - 1] === s.peek('M_TNTCART'), 'a TNT cart over it: lit');
wait(4);
ok(s.peek('ET')[c7 - 1] !== s.peek('M_TNTCART'), 'four seconds on: it went off');
console.log(fails ? fails + ' FAILED' : 'all ok');

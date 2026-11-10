// v2.0 play in the sim: node test/v20c.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 6).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const KEY = s.peek('ITKEY');
const K = (id) => KEY[id];
const ID = (k) => KEY.indexOf(k);
const cmd = (t) => { call(() => fn.runCommand(t)); };
const ok = (c, msg) => console.log(c ? 'ok  ' : 'FAIL', msg);
s.poke('tday', 0.25); F(30);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 100;
// a floor in the sky to work on
cmd(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y + 6} ${Z + 6} air`);
cmd(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y - 1} ${Z + 6} stone`);
const stand = (x, z, yaw, pitch) => { s.poke('px', x + 0.5); s.poke('py', Y); s.poke('pz', z + 0.5); s.poke('yaw', yaw); s.poke('pitch', pitch); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('flying', 0); s.poke('fallTop', Y); F(2); };
const hold = (key, n = 1) => { const id = ID(key); call(() => { fn.addItem(id, n, 0); }); const slot = s.peek('INVI').indexOf(id) + 1; s.poke('hotSel', slot); return id; };
const use = () => { s.poke('placeCool', 0); call(() => { fn.pickRay(); fn.useKey(); }); F(1); };
// the cell a placement goes to
const tgt = () => { call(() => { fn.pickRay(); fn.pickNeighbour(); }); return [s.peek('nbX'), s.peek('nbY'), s.peek('nbZ'), s.peek('pickX'), s.peek('pickY'), s.peek('pickZ')]; };
// stairs: placed facing the way the player looks (looking +z: the high side at +z)
stand(X, Z - 3, 0, -40);
hold('oak_stairs', 4);
call(() => fn.pickRay()); console.log('looking at', s.peek('pickX'), s.peek('pickY'), s.peek('pickZ'), 'face', s.peek('pickF'));
use();
let st = B(X, Y, Z - 1); ok(K(st) === 'oak_stairs', 'stairs facing +z: ' + K(st));
// a slab on a slab is a double slab
stand(X + 3, Z - 3, 0, -40); hold('stone_slab', 4); use(); const sl = B(X + 3, Y, Z - 1); ok(K(sl) === 'stone_slab', 'bottom slab: ' + K(sl));
s.poke('pitch', -20); F(1); use(); ok(K(B(X + 3, Y, Z - 1)) === 'stone_slab_double', 'double slab: ' + K(B(X + 3, Y, Z - 1)));
// walking up onto a slab (step up), not onto a full block
cmd(`/setblock ${X - 3} ${Y} ${Z + 2} stone_slab`);
stand(X - 3, Z, 0, 0);
for (let k = 0; k < 40; k++) { s.as('pen', () => {}); s.poke('pvz', 4.3); F(1); }
ok(s.peek('py') > Y + 0.4, 'stepped up onto the slab: y ' + (s.peek('py') - Y).toFixed(2));
// a door: two halves, opens with F
cmd(`/fill ${X - 6} ${Y} ${Z - 6} ${X + 6} ${Y + 6} ${Z + 6} air`);
stand(X, Z - 3, 0, -30); hold('oak_door'); let T = tgt(); use();
const d0 = B(T[0], T[1], T[2]), d1 = B(T[0], T[1] + 1, T[2]);
ok(K(d0) === 'oak_door' || K(d0).startsWith('oak_door_'), 'door lower ' + K(d0) + ' upper ' + K(d1));
s.poke('pitch', -5); F(1); use();
ok(B(T[0], T[1], T[2]) !== d0, 'door toggled: ' + K(B(T[0], T[1], T[2])) + ' / ' + K(B(T[0], T[1] + 1, T[2])));
// farming: hoe on grass, seeds, bone meal
cmd(`/setblock ${X + 2} ${Y - 1} ${Z} grass_block`); cmd(`/setblock ${X + 2} ${Y - 1} ${Z + 1} water`);
stand(X + 2, Z - 2, 0, -50); hold('wooden_hoe'); T = tgt(); cmd(`/setblock ${T[3]} ${T[4]} ${T[5]} grass_block`); cmd(`/setblock ${T[3]} ${T[4]} ${T[5] + 1} water`); use();
ok(K(B(T[3], T[4], T[5])) === 'farmland', 'farmland: ' + K(B(T[3], T[4], T[5])));
hold('wheat_seeds', 4); use(); ok(K(B(T[3], T[4] + 1, T[5])) === 'wheat', 'wheat planted: ' + K(B(T[3], T[4] + 1, T[5])));
hold('bone_meal', 8); for (let k = 0; k < 4; k++) use(); ok(K(B(T[3], T[4] + 1, T[5])) === 'wheat_3', 'wheat grown: ' + K(B(T[3], T[4] + 1, T[5])));
// bucket: water out and back in
cmd(`/fill ${X - 6} ${Y} ${Z - 6} ${X + 6} ${Y + 6} ${Z + 6} air`);
stand(X - 2, Z - 2, 0, -50); hold('water_bucket'); use();
let wet = 0; for (let a = -4; a <= 0; a++) for (let c = -4; c <= 2; c++) if (B(X + a, Y, Z + c) === 7) wet++;
ok(wet > 0, 'water poured: ' + wet + ' cells, hand ' + K(s.peek('INVI')[s.peek('hotSel') - 1]));
// TNT
cmd(`/fill ${X + 3} ${Y} ${Z + 3} ${X + 5} ${Y + 2} ${Z + 5} stone`); cmd(`/setblock ${X + 4} ${Y + 3} ${Z + 4} tnt`);
call(() => fn.tntPrime(X + 4, Y + 3, Z + 4)); F(260);
let left = 0; for (let a = 3; a <= 5; a++) for (let c = 3; c <= 5; c++) for (let y = 0; y <= 2; y++) if (B(X + a, Y + y, Z + c) === 1) left++;
ok(left < 27 && B(X + 4, Y + 3, Z + 4) === 0, 'TNT went off: stone left ' + left + '/27, hp ' + s.peek('hp'));
// a bed: sleeping at night
cmd(`/fill ${X - 6} ${Y} ${Z - 6} ${X + 6} ${Y + 6} ${Z + 6} air`); cmd(`/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y - 1} ${Z + 6} stone`);
stand(X, Z - 3, 0, -40); hold('red_bed'); use();
ok(K(B(X, Y, Z - 1)).includes('bed') && K(B(X, Y, Z)).includes('bed'), 'bed: ' + K(B(X, Y, Z - 1)) + ' + ' + K(B(X, Y, Z)));
s.poke('tday', 0.6); F(5); s.poke('hp', 20); use(); console.log('    after sleeping tday', s.peek('tday').toFixed(2), s.peek('msgText'));
// spectator: through walls
cmd('/gamemode spectator'); cmd(`/fill ${X - 1} ${Y} ${Z + 3} ${X + 1} ${Y + 3} ${Z + 3} stone`);
stand(X, Z, 0, 0); s.poke('flying', 1);
for (let k = 0; k < 60; k++) { s.poke('pvz', 8); F(1); }
ok(s.peek('pz') > Z + 4.5, 'spectator through the wall: z ' + (s.peek('pz') - Z).toFixed(1));
// adventure: no breaking
cmd('/gamemode adventure'); stand(X, Z, 0, -60); s.poke('clickHeld', 1);
const under = B(X, Y - 1, Z + 1);
for (let k = 0; k < 100; k++) { s.poke('clickHeld', 1); call(() => { fn.pickRay(); fn.breaking(0.05); }); }
ok(B(X, Y - 1, Z + 1) === under, 'adventure cannot break');
cmd('/gamemode survival');
// a ladder to climb
cmd(`/fill ${X - 6} ${Y} ${Z - 6} ${X + 6} ${Y + 6} ${Z + 6} air`); cmd(`/fill ${X - 1} ${Y} ${Z + 1} ${X + 1} ${Y + 5} ${Z + 1} stone`);
for (let y = 0; y < 5; y++) cmd(`/setblock ${X} ${Y + y} ${Z} ladder[facing=north]`);
stand(X, Z, 0, 0);
s.keys.add(87); for (let k = 0; k < 60; k++) F(1); s.keys.delete(87);
console.log('    on the ladder y', (s.peek('py') - Y).toFixed(2), K(B(X, Y, Z)));
// the trading screen
cmd(`/summon villager ${X + 0.5} ${Y} ${Z + 3.5}`);
// the depths: travel, the forests, a bastion
call(() => { s.poke('tStage', 1); s.poke('tX', 300); s.poke('tZ', 300); s.poke('testCmd', 4); });
for (let k = 0; k < 2000 && (s.peek('gState') !== 2 || s.peek('dim') !== 1); k++) F(1);
F(200);
const bi = {}; const BIOM = s.peek('BIOM'); for (const b of BIOM) bi[b] = (bi[b] || 0) + 1;
console.log('    depths biomes', JSON.stringify(bi), 'dim', s.peek('dim'));
cmd('/locate bastion_remnant'); console.log('    ', s.peek('CHT').slice(-1)[0]);
await s.png('test/v20_depths.png');
console.log('done');

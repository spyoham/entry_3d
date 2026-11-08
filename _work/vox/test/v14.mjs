// v1.4 features in the sim: node test/v14.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 5).join(' | ')); process.exit(1); } } };
const fn = s.fn, call = (f) => s.as('pen', f);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => { call(() => fn.runCommand(t)); console.log(t.padEnd(44), '->', s.peek('msgText')); };
s.poke('tday', 0.25);
F(30);
// ---- commands
cmd('/give @s diamond 5');
cmd('/give @s 다이아몬드 곡괭이');
cmd('/effect give @s night_vision 30 0');
cmd('/effect give @s speed 10 1');
cmd('/gamerule keepInventory true');
cmd('/gamerule doDaylightCycle false');
cmd('/time set night');
cmd('/tp ~ ~5 ~');
cmd('/gamemode creative'); cmd('/gamemode survival');
cmd('/kill @e');
cmd('/foo');
console.log('inv has diamond', s.peek('INVI').includes(104), 'pick', s.peek('INVI').includes(133), 'night vision', s.peek('EFT')[7], 'keep', s.peek('grKeep'), 'tday', s.peek('tday').toFixed(3));
cmd('/time set noon'); cmd('/gamerule doDaylightCycle true');
// ---- smithing
call(() => { fn.uiOpen(8); fn.slotSet(54, 133, 1, 25); fn.slotSet(55, 128, 3, 0); });
console.log('smith out', s.peek('smOut'), '(want 166)');
call(() => { fn.slotClick(56, 0); });
console.log('cursor', s.peek('curI'), 'wear', s.peek('curD'), 'ingots left', s.peek('SMN2'));
call(() => { fn.uiClose(); });
// ---- the ruin and its gate
call(() => { fn.ruinAt(0); });
const rx = s.peek('ruX'), rz = s.peek('ruZ'), ry = s.peek('RUY');
console.log('ruin 0 at', rx, ry, rz);
s.poke('px', rx + 0.5); s.poke('pz', rz + 6.5); s.poke('py', ry + 1); s.poke('flying', 1); s.poke('gameMode', 1);
for (let k = 0; k < 900; k++) { F(1); if (B(rx, ry, rz) !== -1 && k > 300) break; }
s.poke('px', rx + 0.5); s.poke('pz', rz + 6.5); s.poke('py', ry + 1); s.poke('yaw', 180); s.poke('pitch', -20);
F(60);
let fr = 0, fe = 0;
for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) { const b = B(rx + a, ry + 1, rz + c); if (b === 61) fr++; if (b === 62) fe++; }
console.log('frames', fr, 'with eyes', fe, 'room floor', B(rx, ry, rz), 'chest', B(rx + 7, ry + 1, rz + 7));
await s.png('test/v14_ruin.png');
call(() => { for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) if (fn.blockAt(rx + a, ry + 1, rz + c) === 61) fn.frameEye(rx + a, ry + 1, rz + c); });
console.log('gate', B(rx, ry + 1, rz), B(rx + 1, ry + 1, rz - 1), '->', s.peek('msgText'));
F(30);
await s.png('test/v14_gate.png');
// ---- the eye thrown from the spawn
s.poke('px', s.peek('spawnX')); s.poke('pz', s.peek('spawnZ')); s.poke('py', s.peek('spawnY'));
F(200);
call(() => { fn.addItem(171, 2, 0); });
const slot = s.peek('INVI').indexOf(171) + 1;
s.poke('hotSel', slot);
call(() => { fn.eyeThrow(); });
const a6 = s.peek('AON').indexOf(6) + 1;
console.log('eye flying', a6 > 0, 'toward', s.peek('AVX')[a6 - 1].toFixed(1), s.peek('AVZ')[a6 - 1].toFixed(1), '(ruin dir', (rx - s.peek('px')).toFixed(0), (rz - s.peek('pz')).toFixed(0), ')');
// ---- a boat on water
let wx = null;
for (let r = 2; r < 60 && !wx; r++) for (let a = 0; a < 360 && !wx; a += 10) { const x = Math.floor(s.peek('px') + Math.cos(a * Math.PI / 180) * r), z = Math.floor(s.peek('pz') + Math.sin(a * Math.PI / 180) * r); if (B(x, 29, z) === 7 && B(x, 28, z) === 7) wx = { x, z }; }
if (wx) {
  s.poke('px', wx.x + 2.5); s.poke('pz', wx.z + 0.5); s.poke('py', 33); F(5);
  call(() => { fn.mobAdd(13, wx.x + 0.5, 30.5, wx.z + 0.5); });
  const e = s.peek('ET').indexOf(13) + 1;
  F(30);
  s.poke('riding', e); s.poke('gameMode', 0); s.poke('flying', 0);
  const y0 = s.peek('EY')[e - 1]; console.log('boat cell', B(wx.x, Math.floor(y0), wx.z), B(wx.x, Math.floor(y0) - 1, wx.z), 'water at 29', B(wx.x, 29, wx.z));
  s.keys.add(87); F(120); s.keys.delete(87);
  for (let k = 0; k < 0; k++);
  console.log('boat', e, 'now y', s.peek('EY')[e - 1].toFixed(2), 'floats at', y0.toFixed(2), 'moved', Math.hypot(s.peek('EX')[e - 1] - wx.x - 0.5, s.peek('EZ')[e - 1] - wx.z - 0.5).toFixed(1), 'player with it', Math.abs(s.peek('px') - s.peek('EX')[e - 1]) < 0.01);
  s.keys.add(16); F(2); s.keys.delete(16);
  console.log('off the boat', s.peek('riding') === 0);
} else console.log('no water near');
// ---- the glider
s.poke('gameMode', 0); s.poke('flying', 0);
call(() => { fn.slotSet(38, 173, 1, 0); });
s.poke('py', 110); s.poke('pvy', -3); s.poke('pitch', -15); s.poke('yaw', 0); s.poke('fallTop', 110);
F(3); console.log('glider on', call(() => fn.gliderOn()), 'dur', s.peek('ITDUR')[173], 'onGround', s.peek('onGround'), 'pvy', s.peek('pvy').toFixed(1)); s.keys.add(32); F(1); console.log('after space: gliding', s.peek('gliding'), 'khit', s.peek('KHIT')[32]); s.keys.delete(32); F(1);
const g0 = { x: s.peek('px'), y: s.peek('py'), z: s.peek('pz') };
F(120);
console.log('gliding', s.peek('gliding'), 'over 2 s: forward', (s.peek('pz') - g0.z).toFixed(1), 'down', (g0.y - s.peek('py')).toFixed(1), 'hp', s.peek('hp'));
// ---- a void city
let city = null;
call(() => { for (let cx = 26; cx < 70 && !city; cx++) for (let cz = -8; cz <= 8 && !city; cz++) if (fn.cityIn(cx, cz) === 1) city = { x: s.peek('ciX'), y: s.peek('ciY'), z: s.peek('ciZ'), h: s.peek('ciH'), ship: s.peek('ciShip') }; });
console.log('city', JSON.stringify(city));
if (city) {
  call(() => { fn.startTravel(2, city.x - 14.5, city.z + 0.5, 4); });
  let k = 0; while (s.peek('gState') !== 2 && k < 3000) { F(1); k++; }
  s.poke('gameMode', 1); s.poke('flying', 1);
  s.poke('px', city.x - 16.5); s.poke('pz', city.z + 0.5); s.poke('py', city.y + 10); s.poke('yaw', 90); s.poke('pitch', 8);
  F(240);
  console.log('tower wall', B(city.x + 3, city.y + 1, city.z), 'top chest', B(city.x, city.y + city.h + 1, city.z), 'ship chest', B(city.x + 7, city.y + Math.floor(city.h / 2) + 2, city.z - 2), 'return gate', B(Math.floor(city.x - 14.5) + 3, s.peek('topY') + 1, Math.floor(city.z + 0.5)));
  await s.png('test/v14_city.png');
}

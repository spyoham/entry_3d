// (v3.2) pictures of the warden (a dragon now) from a few sides: node test/dragon32.mjs  -> test/dragon_*.png
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { s.frame(); } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (c) => call(() => fn.runCommand(c));
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 90;
cmd(`/fill ${X - 16} ${Y - 1} ${Z - 16} ${X + 16} ${Y - 1} ${Z + 16} stone`);
s.poke('gameMode', 1); s.poke('grMobs', 0); s.poke('tday', 0.25); s.poke('flying', 1);
const ET = s.peek('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0;
call(() => fn.mobAdd(10, X + 0.5, Y + 3, Z + 0.5));
const e = s.peek('lastMob');
const look = async (name, ax, dist, up, mobYaw) => {
  s.peek('EYAW')[e - 1] = mobYaw;
  const px = X + 0.5 + Math.sin(ax * Math.PI / 180) * dist, pz = Z + 0.5 + Math.cos(ax * Math.PI / 180) * dist, py = Y + 3 + up;
  s.poke('px', px); s.poke('py', py); s.poke('pz', pz); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0);
  const dx = X + 0.5 - px, dz = Z + 0.5 - pz, dy = Y + 4.5 - (py + 1.62);
  s.poke('yaw', Math.atan2(dx, dz) * 180 / Math.PI); s.poke('pitch', Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI);
  F(3);
  await s.png(`test/dragon_${name}.png`);
};
await look('front', 0, 9, 0, 0);
await look('side', 90, 10, 0.5, 0);
await look('quarter', 40, 10, 2, 0);
await look('back', 200, 10, 3, 0);
await look('below', 60, 7, -3, 0);
for (let k = 0; k < 4; k++) { F(6); await look('flap' + k, 30, 11, 1, 0); }
console.log('boxes of the warden', s.peek('MBN')[9], 'ok');
process.exit(0);

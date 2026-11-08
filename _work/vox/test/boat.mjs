import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
const fn = s.fn, call = (f) => s.as('pen', f), B = (x, y, z) => call(() => fn.blockAt(x, y, z));
for (let i = 0; i < 100; i++) s.frame();
const bx0 = Math.floor(s.peek('px')), bz0 = Math.floor(s.peek('pz'));
call(() => { for (let a = -6; a <= 6; a++) for (let c = -6; c <= 6; c++) { fn.setBlock(bx0 + a, 55, bz0 + c, 1); for (let y = 56; y <= 58; y++) fn.setBlock(bx0 + a, y, bz0 + c, (Math.abs(a) === 6 || Math.abs(c) === 6) ? 1 : (y <= 57 ? 7 : 0)); } fn.worldFlush(); });
const wx = { x: bx0, z: bz0 };
console.log('water at', JSON.stringify(wx), 'col', [55, 56, 57, 58].map(y => B(wx.x, y, wx.z)).join(','));
s.poke('px', wx.x + 2.5); s.poke('pz', wx.z + 0.5); s.poke('py', 60); s.poke('gameMode', 1); s.poke('flying', 1);
for (let i = 0; i < 10; i++) s.frame();
call(() => fn.mobAdd(13, wx.x + 0.5, 58.5, wx.z + 0.5));
const e = s.peek('ET').indexOf(13) + 1;
for (let i = 0; i < 40; i++) { s.frame(); if (i % 5 === 0) console.log(i, 'EY', s.peek('EY')[e - 1].toFixed(2), 'EVY', s.peek('EVY')[e - 1].toFixed(2), 'ET', s.peek('ET')[e - 1]); }
s.poke('riding', e); s.poke('yaw', 90);
s.keys.add(87);
for (let i = 0; i < 60; i++) { s.frame(); if (i % 15 === 0) console.log('ride', i, 'EX', s.peek('EX')[e - 1].toFixed(2), 'EVX', s.peek('EVX')[e - 1].toFixed(2), 'EVZ', s.peek('EVZ')[e - 1].toFixed(2), 'yaw', s.peek('EYAW')[e - 1].toFixed(0)); }

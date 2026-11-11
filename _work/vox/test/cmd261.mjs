// (v2.6.1) commands as 1.16.5: /weather's time (300 s alone, seconds, or 60s / 1d / 600t), /tp's
// rotation (yaw 90 west, pitch 90 down; after targets too; facing), /execute rotated, /give of an
// item with {..} (it broke), /gamerule alone, /time set sunrise|sunset, /locate structure|biome.
// usage: node test/cmd261.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
F(10);
const run = (t) => { call(() => fn.chatRun(t)); F(1); const c = s.peek('CHT'); return String(c[c.length - 1]); };
const near = (a, b, e = 0.6) => Math.abs(a - b) < e;
const yaw360 = () => ((s.peek('yaw') % 360) + 360) % 360;
run('/weather rain'); ok(s.peek('wthr') === 1 && near(s.peek('wthrT'), 300), `/weather rain: rain for 300 s (${s.peek('wthrT').toFixed(0)})`);
run('/weather clear 100'); ok(s.peek('wthr') === 0 && near(s.peek('wthrT'), 100), '/weather clear 100: 100 s');
run('/weather thunder 60s'); ok(s.peek('wthr') === 2 && near(s.peek('wthrT'), 60), '/weather thunder 60s');
run('/weather rain 1d'); ok(near(s.peek('wthrT'), 1200), '/weather rain 1d: 1200 s');
run('/weather rain 600t'); ok(near(s.peek('wthrT'), 30), '/weather rain 600t: 30 s');
run('/tp 0 100 0 90 45'); ok(near(yaw360(), 270, 0.01) && near(s.peek('pitch'), -45, 0.01), `/tp x y z 90 45: facing west, looking down (yaw ${yaw360()}, pitch ${s.peek('pitch')})`);
run('/tp @s ~ ~ ~ 180 -30'); ok(near(yaw360(), 180, 0.01) && near(s.peek('pitch'), 30, 0.01), '/tp @s x y z 180 -30: north, looking up');
run('/tp @s ~ ~ ~ ~90 ~'); ok(near(yaw360(), 90, 0.01), `/tp @s ~ ~ ~ ~90 ~: a quarter turn on, north to east (${yaw360()})`);
run('/tp @s 0 100 0 facing 10 100 0'); ok(near(yaw360(), 90, 0.5), `/tp ... facing 10 100 0: looking +x (${yaw360().toFixed(1)})`);
run('/execute rotated 0 0 run tp @s ~ ~ ~ ~ ~'); ok(near(yaw360(), 0, 0.01), `/execute rotated 0 0 run tp ~ ~: south (${yaw360()})`);
let r = run('/give @s diamond_sword{Enchantments:[{id:sharpness,lvl:5}]} 1'); ok(r.includes('다이아몬드 검'), '/give an item with {..}: ' + r);
r = run('/gamerule'); ok(r.includes('keepInventory') && r.includes('doDaylightCycle'), '/gamerule alone: the rules');
run('/time set sunrise'); ok(near(s.peek('tday') * 24000, 23000, 2), '/time set sunrise: 23000');
run('/time set sunset'); ok(near(s.peek('tday') * 24000, 12000, 2), '/time set sunset: 12000');
r = run('/locate structure village'); ok(r.includes('마을'), '/locate structure village: ' + r);
r = run('/locate biome desert'); ok(r.includes('사막'), '/locate biome desert: ' + r);
console.log(fails ? fails + ' FAILED' : 'all ok');

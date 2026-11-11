// pictures of rails: node test/railview.mjs -> test/rail_*.png
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => { call(() => fn.runCommand(t)); };
const at = (x, y, z, yaw, pitch) => { s.poke('px', x); s.poke('py', y); s.poke('pz', z); s.poke('yaw', yaw); s.poke('pitch', pitch); s.poke('flying', 1); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
s.poke('tday', 0.25); s.poke('showDbg', 0); s.poke('helpT', 0);
F(30);
const X = Math.floor(s.peek('px')), Y = 96, Z = Math.floor(s.peek('pz'));
const put = (x, y, z, b) => cmd(`/setblock ${X + x} ${Y + y} ${Z + z} ${b}`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z} ${X + 12} ${Y + 8} ${Z + 20} air`);
cmd(`/fill ${X - 12} ${Y - 1} ${Z} ${X + 12} ${Y - 1} ${Z + 20} smooth_stone`);
const kinds = ['rail', 'powered_rail', 'detector_rail', 'activator_rail'];
kinds.forEach((k, i) => { for (let z = 3; z <= 7; z++) put(-8 + i * 3, 0, z, `${k}[shape=north_south]`); });
kinds.forEach((k, i) => { for (let x = -9; x <= -7; x++) put(x + i * 3, 0, 10 + 0, `${k}[shape=east_west]`); });
put(4, 0, 5, 'powered_rail[shape=north_south,powered=true]'); put(4, 0, 6, 'powered_rail[shape=north_south,powered=true]');
put(6, 0, 5, 'rail[shape=south_east]'); put(7, 0, 5, 'rail[shape=east_west]'); put(6, 0, 6, 'rail[shape=north_south]');
F(10);
at(X - 2.5, Y + 4, Z + 0.5, 0, -45); F(20); await s.png('test/rail_ns.png');
at(X - 2.5, Y + 3, Z + 13.5, 180, -50); F(20); await s.png('test/rail_ew.png');
at(X + 5.5, Y + 2.5, Z + 3, 0, -50); F(20); await s.png('test/rail_curve.png');

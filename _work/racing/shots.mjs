// Drive the simulator through a scripted session and dump frames.
// usage: node shots.mjs [tag]
import path from 'node:path';
import url from 'node:url';
import { createSim } from './sim.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const tag = process.argv[2] || 's';

const s = createSim();
const tap = (code, frames = 2) => { s.keys.add(code); for (let i = 0; i < frames; i++) s.frame(); s.keys.delete(code); s.frame(); };
const run = (n) => { for (let i = 0; i < n; i++) s.frame(); };
const V = (...names) => Object.fromEntries(names.map(n => [n, s.peek(n)]));

run(10);
tap(13);                       // RACE START
console.log('after start:', JSON.stringify(V('raceState', 'countN', 'nCars', 'trkLen')));
run(100);                      // countdown (30fps -> ~3.3s)
console.log('countdown done:', JSON.stringify(V('raceState', 'raceT')));
await s.png(path.join(HERE, `${tag}0.png`));

s.keys.add(87);                // hold W
run(60);
await s.png(path.join(HERE, `${tag}1.png`));
console.log('t=2s', JSON.stringify(V('raceState', 'raceT', 'drawnQuads')), 'spd', s.peek('caSpd')[0], 'seg', s.peek('caSeg')[0]);
run(120);
await s.png(path.join(HERE, `${tag}2.png`));
console.log('t=6s spd', s.peek('caSpd').slice(0, 8).map(v => +(+v).toFixed(1)).join(','), 'seg', s.peek('caSeg').slice(0, 8).join(','));
console.log('lap', s.peek('caLap').slice(0, 8).join(','), 'rank', s.peek('caRank').slice(0, 8).join(','));
run(300);
await s.png(path.join(HERE, `${tag}3.png`));
console.log('t=16s seg', s.peek('caSeg').slice(0, 8).join(','), 'lap', s.peek('caLap').slice(0, 8).join(','));
console.log('hud', JSON.stringify(s.texts));
// cockpit view
s.keys.delete(87);
tap(67); tap(67);
s.keys.add(87);
run(30);
await s.png(path.join(HERE, `${tag}4.png`));
console.log('camMode', s.peek('camMode'));
run(900);
console.log('t=48s lap', s.peek('caLap').slice(0, 8).join(','), 'state', s.peek('raceState'), 'raceT', +(+s.peek('raceT')).toFixed(2));
console.log('offT', s.peek('caOffT').slice(0, 8).map(v => +(+v).toFixed(1)).join(','));
await s.png(path.join(HERE, `${tag}5.png`));
console.log('hud', JSON.stringify(s.texts));

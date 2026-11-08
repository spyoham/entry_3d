// Picture of a stage in Node: node test/shot.mjs stage out.png [x z yaw pitch room] [K=V ...]
import path from 'node:path';
import url from 'node:url';
import { createSim } from '../sim.mjs';
const a = process.argv.slice(2);
const kv = Object.fromEntries(a.filter(x => /^\w+=/.test(x)).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const [st, out, x, z, yaw, pitch, room] = a.filter(x => !/^\w+=/.test(x));
const s = createSim({ consts: { AUTOSTART: Number(st), ...kv } });
s.frame();
if (x !== undefined) {
    if (room !== undefined) s.poke('pr', s.peek('SR0')[Number(st) - 1] + Number(room));
    s.poke('px', Number(x)); s.poke('pz', Number(z)); s.poke('yaw', Number(yaw)); s.poke('pitch', Number(pitch || 0));
}
s.poke('maxD', kv.MD || 5);
for (let i = 0; i < 3; i++) s.frame();
await s.png(out);
console.log('fills', s.peek('nFill'), 'rooms', s.peek('nRoomDraw'), 'room', s.peek('pr'), 'pos', s.peek('px').toFixed(2), s.peek('py').toFixed(2), s.peek('pz').toFixed(2), '|', s.peek('msgText'));

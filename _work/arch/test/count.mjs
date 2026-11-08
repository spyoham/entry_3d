import { createSim } from '../sim.mjs';
const st = Number(process.argv[2] || 2);
const s = createSim({ consts: { AUTOSTART: st, DETAIL: 0 } });
s.frame(); s.poke('maxD', 3);
for (let i = 0; i < 5; i++) s.frame();
s.poke('nClipQ', 0); s.poke('nPS', 0);
s.frame();
console.log('clipQ', s.peek('nClipQ'), 'portalStep', s.peek('nPS'), 'loop', s.peek('nLoop'), 'fills', s.peek('nFill'), 'rooms', s.peek('nRoomDraw'));

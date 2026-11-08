import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { s.frame(); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const hs = []; let best = null;
call(() => { for (let x = -3000; x <= 3000; x += 24) for (let z = -3000; z <= 3000; z += 24) { s.poke('gridOn', 0); fn.columnShape(x, z); const h = s.peek('colH'); hs.push(h); if (!best || h > best.h) best = { x, z, h }; } });
hs.sort((a, b) => a - b);
const q = (p) => hs[Math.floor(p * (hs.length - 1))];
console.log('n', hs.length, 'p50', q(0.5), 'p90', q(0.9), 'p99', q(0.99), 'max', q(1), 'over 64:', (hs.filter(h => h > 64).length / hs.length * 100).toFixed(1) + '%', 'over 90:', (hs.filter(h => h > 90).length / hs.length * 100).toFixed(2) + '%', 'best', JSON.stringify(best));

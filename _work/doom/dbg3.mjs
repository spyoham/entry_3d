import { createSim } from './sim.mjs';
const sim = await createSim();
const P = sim.R.peek;
sim.frame(); sim.frame();
console.log('sLo', P('sLo').map(v=>+v.toFixed(1)).join(' '));
console.log('sHi', P('sHi').map(v=>+v.toFixed(1)).join(' '));
// instrument markSolid calls

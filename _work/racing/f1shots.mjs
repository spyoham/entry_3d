// Sim screenshots: for each circuit, drive car 1 on AI for a while and grab frames.
import { createSim } from './sim.mjs';
const trks = (process.argv[2] || '1,2,3,4,5,6,7,8').split(',').map(Number);
const at = (process.argv[3] || '6,20').split(',').map(Number);
for (const tk of trks) {
    const s = createSim({ fps: 5 });
    for (let i = 0; i < 3; i++) s.frame();
    const g = (e) => s.peek(e);
    g(`nCars = NCAR`); g(`setupRace(${tk}, 1)`);
    g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
    let f = 0;
    for (const sec of at) {
        while (f < sec * 5) { s.frame(); f++; }
        await s.png(`sh_${tk}_${sec}.png`);
    }
    console.log(tk, g('trkName[' + (tk - 1) + ']'), 'len', Math.round(g('trkLen')), 'scN', g('scN'), 'quads', g('drawnQuads'), 'seg', g('caSeg[0]'), 'surf', g('caSurf[0]'));
}

// v3.2.0: an undamaged car drives exactly as before - car 1 driven by the AI
// for 20 s of a time trial, its place printed to 9 decimals (compare with
// RSRC=<old src>). Math.random is seeded at the start of each race so both
// runs see the same numbers.
import { createSim } from '../sim.mjs';
let seed = 1;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
for (const rules of [1, 2]) {
    const s = createSim({ fps: 30 });
    // (building the sim draws random block ids - more code, more draws: the
    // race starts from the same seed whatever the sources)
    seed = 1 + rules;
    for (let i = 0; i < 5; i++) s.frame();
    s.peek(`rules = ${rules}; wx = 1; applyWeather(); gMode = 3; selTrk = 5; buildTrack(5); doStartRace();`);
    s.peek('playerInput = function () { aiPlan(1); aiDrive(1); }');
    for (let i = 0; i < 30 * 20; i++) s.frame();
    console.log('rules', rules, (+s.peek('caX[0]')).toFixed(9), (+s.peek('caZ[0]')).toFixed(9), (+s.peek('caYaw[0]')).toFixed(9));
}

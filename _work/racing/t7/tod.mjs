// ULTRA visuals in the sim: dusk late in a race, a wet track, brake glow
import { createSim } from '../sim.mjs';
const [trk = 4] = process.argv.slice(2).map(Number);
const s = createSim({ fps: 10 });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; wx = 1; gfx = 3; lapSel = 2; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); startRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
for (let f = 0; f < 150; f++) s.frame();
await s.png(new URL('./tod_a.png', import.meta.url).pathname);
g('raceT = estLap * nLaps * 1.0');
for (let f = 0; f < 20; f++) s.frame();
console.log('todK', (+g('todK')).toFixed(2), 'sky', g('skyR'), g('skyG'), g('skyB'));
await s.png(new URL('./tod_b.png', import.meta.url).pathname);

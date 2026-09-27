import { createSim } from '../sim.mjs';
const [trk, a, b, st] = process.argv.slice(2).map(Number);
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = 3; gfxSel = 3; selTrk = ${trk}; applyWeather(); doStartRace();`);
for (let i = a; i <= b; i += (st || 1)) console.log(i, ['sgX', 'sgY', 'sgZ', 'sgW', 'sgSL', 'sgSR', 'sgHW', 'sgGA', 'sgGB'].map(n => n + '=' + (+g(`${n}[${i - 1}]`)).toFixed(1)).join(' '));

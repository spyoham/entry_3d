// who triggers the early yellows, and why
import { createSim } from '../sim.mjs';
const o = Object.assign({ trk: 1, secs: 60, fps: 10 }, JSON.parse(process.argv[2] || '{}'));
const s = createSim({ fps: o.fps }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; applyWeather(); selTrk = ${o.trk}; buildTrack(${o.trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
g(`globalThis.__L = [];
   const _in = incident; incident = function(c){ const i = c - 1; if (raceState == ST_RACE && caYelT[i] <= 0) __L.push(['INC', +raceT.toFixed(1), c, 'seg', caSeg[i], 'surf', caSurf[i], 'offT', +caOffT[i].toFixed(2), 'stuck', +caStuck[i].toFixed(2), 'sp', +caSpd[i].toFixed(1), 'off', +caOff[i].toFixed(1), 'w', +sgW[caSeg[i]-1].toFixed(1), 'dmg', +caDmg[i].toFixed(2), 'mis', +caMisT[i].toFixed(1)]); _in(c); };
   const _ad = addDamage; addDamage = function(c, d){ if (raceState == ST_RACE && d > 0.08) __L.push(['DMG', +raceT.toFixed(1), c, +d.toFixed(2), 'seg', caSeg[c-1], 'sp', +caSpd[c-1].toFixed(1), 'mis', +caMisT[c-1].toFixed(1)]); _ad(c, d); };`);
g('endQuali()'); g('startGrid(selCar)'); g('formSkip(); formEnd();');
for (let f = 0; f < 200 && +g('raceState') !== 3; f++) s.frame();
for (let f = 0; f < o.secs * o.fps; f++) s.frame();
for (const e of JSON.parse(g('JSON.stringify(__L)'))) console.log(e.join(' '));
console.log('grid', g('JSON.stringify(caGrid.slice(0,8))'));

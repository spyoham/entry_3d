// v5 sim screenshots: menu, start lights, race (chase / T-cam), rain, time trial.
// usage: node v5shots.mjs [trk] [prefix]   (env GFX=1..3, WX=1..2, MODE=1..3, CAM=0..3, SECS=a,b,c)
import { createSim } from './sim.mjs';
const trk = +(process.argv[2] || 1);
const pre = process.argv[3] || 'v5';
const fps = 5;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`gfx = ${+(process.env.GFX || 2)}`);
g(`wx = ${+(process.env.WX || 1)}`);
g(`applyWeather()`);
g(`gMode = ${+(process.env.MODE || 1)}`);
g(`selTrk = ${trk}`);
g(`buildTrack(${trk})`);
for (let i = 0; i < 6; i++) s.frame();
await s.png(`${pre}_menu.png`);
console.log('menu texts', JSON.stringify([s.texts.tBig, s.texts.tM1, s.texts.tM2, s.texts.tM8]));
g(`startRace()`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const cam = +(process.env.CAM || 0);
let f = 0;
const shots = (process.env.SECS || '3,9,20,40').split(',').map(Number);
for (const sec of shots) {
    while (f < sec * fps) {
        s.frame(); f++;
        if (g('raceState') === 3) g(`camMode = ${cam}`);
    }
    await s.png(`${pre}_${sec}.png`);
    console.log(sec, 's state', g('raceState'), 'lights', g('lightN'), 'out', g('lightsOut'), 'quads', g('drawnQuads'), 'rank', g('caRank[0]'),
        'kmh', Math.round(g('caSpd[0]') * 3.6), 'gear', g('caGear[0]'), 'lap', g('caLap[0]'), 'delta', s.texts.tDelta, 'drs', s.texts.tDRS, 'T1', s.texts.tT1, 'T6', s.texts.tT6);
}

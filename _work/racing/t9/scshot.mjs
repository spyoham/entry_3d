// v3.3.0: the safety car's road coupe in a realistic race, in the node sim's
// renderer: deployed in front of the leader, seen from the chase camera of the
// car behind it, from beside it and from the TV camera of a replay.
// usage: node t9/scshot.mjs [trk]   -> ab/sc_*.png
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 4);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`gfx = 3; rules = 2; wx = 1; lapSel = 2; applyWeather(); gMode = 1; selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
for (let i = 0; i < 3; i++) s.frame();
if (+g('raceState') === 9) { g('endQuali(); startGrid(selCar);'); }
if (+g('raceState') === 14) { g('formSkip(); formEnd();'); }
g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
for (let i = 0; i < 40 * fps; i++) s.frame();
g('deploySC()');
for (let i = 0; i < 25 * fps; i++) s.frame();
const sc = 9;
console.log('scCar', g('scCar'), 'scOn', g('scOn'), 'colour', g(`caCol[${sc - 1}]`), 'sc speed', Math.round(+g(`caSpd[${sc - 1}]`) * 3.6), 'km/h');
// the camera of the car right behind it
g(`camCar = srtI[0]; camMode = 0`);
s.frame();
await s.png('ab/sc_behind.png');
// beside it: a fixed camera off its right flank
g(`camCar = ${sc}; camMode = 0`);
for (let i = 0; i < 3; i++) s.frame();
await s.png('ab/sc_chase.png');
console.log('quads', g('drawnQuads'), 'detail', g(`caTr[${sc - 1}]`));
// close up, through the photo mode's free camera: front three-quarter and rear three-quarter
for (const [name, ang, dist] of [['front', 35, 7.5], ['rear', 205, 7.5], ['side', 95, 8]]) {
    g(`phPrev = ST_RACE; raceState = ST_PHOTO; phHelp = 0; phFov = 50;
       phX = caX[${sc - 1}] + sind(caYaw[${sc - 1}] + ${ang}) * ${dist}; phZ = caZ[${sc - 1}] + cosd(caYaw[${sc - 1}] + ${ang}) * ${dist}; phY = caY[${sc - 1}] + 1.8;
       phX0 = phX; phZ0 = phZ;
       atan2d(caX[${sc - 1}] - phX, caZ[${sc - 1}] - phZ); phYaw = oAtan; phPitch = 0 - 9;`);
    s.frame();
    await s.png(`ab/sc_${name}.png`);
}


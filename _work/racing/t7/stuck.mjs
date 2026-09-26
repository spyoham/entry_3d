// AI cars that sit still (under 1 m/s for over 6 s) during a race: why?
// usage: node t7/stuck.mjs rules trk secs [wx] [lapSel]
import { createSim } from '../sim.mjs';
const [rules = 2, trk = 1, secs = 400, wx = 1, lapSel = 3] = process.argv.slice(2).map(Number);
const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = ${rules}; wx = ${wx}; gfx = 2; lapSel = ${lapSel}; gMode = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
if (+g('raceState') === 9) { g('endQuali()'); g('startGrid(selCar)'); }
if (+g('raceState') === 14) { g('formSkip(); formEnd();'); }
const still = new Array(9).fill(0), rep = new Array(9).fill(0);
for (let f = 0; f < secs * 10; f++) {
    s.frame();
    if (+g('raceState') !== 3) continue;
    const v = JSON.parse(g(`JSON.stringify([...Array(8).keys()].map(i => [caSpd[i], caDNF[i], caFin[i], caPit[i], caHold[i], caFuel[i], caFail[i], caStuck[i], caThr[i], caBrk[i], caSteer[i], caOff[i], sgW[caSeg[i]-1], sgHW[caSeg[i]-1], caSurf[i], caDmg[i], caPowD[i], caBrD[i], caLock[i], scOn, vscOn, caBlue[i], caMisT[i], caYaw[i], caSeg[i]]))`));
    for (let c = 1; c < 8; c++) {
        const x = v[c];
        if (Math.abs(x[0]) < 1 && !x[2] && !(x[3] === 3) && !x[1]) still[c]++; else still[c] = 0;
        if (still[c] === 60 && !rep[c]) { rep[c] = 1; console.log(`t=${(+g('raceT')).toFixed(1)} car ${c + 1} still: spd ${x[0].toFixed(2)} DNF ${x[1]} pit ${x[3]} hold ${x[4]} fuel ${x[5].toFixed(1)} fail ${x[6]} stuck ${x[7].toFixed(1)} thr ${x[8]} brk ${(+x[9]).toFixed(2)} steer ${(+x[10]).toFixed(2)} off ${x[11].toFixed(1)}/w ${x[12].toFixed(1)} wall ${x[13]} surf ${x[14]} dmg ${x[15].toFixed(2)} powD ${x[16].toFixed(2)} brD ${x[17].toFixed(2)} sc ${x[19]} vsc ${x[20]} seg ${x[24]}`); }
        if (still[c] === 0 && rep[c]) console.log(`   car ${c + 1} moving again at t=${(+g('raceT')).toFixed(1)}`);
        if (still[c] === 0) rep[c] = 0;
    }
}
console.log('end', g('raceT'), 'laps', g('caLap.slice(0,8).join(",")'), 'DNF', g('caDNF.slice(0,8).join("")'));

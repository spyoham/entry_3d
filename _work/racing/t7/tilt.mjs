// v2.6 body tilt on slopes: for every circuit the steepest climb and the
// most banked corner; the car is parked there along the track, sideways and
// at 45 degrees, and its settled pitch / roll are compared with the ground.
// (positive pitch = nose down, positive roll = right side up)
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
const ntrk = +g('NTRK');
let bad = 0;
for (let t = 1; t <= ntrk; t++) {
    g(`rules = 0; gMode = 4; selTrk = ${t}; applyWeather(); startRace();`);
    g('playerInput = function(){ caThr[0] = 0; caBrk[0] = 0; caSteer[0] = 0; caHB[0] = 0; }');
    while (+g('raceState') !== 3) s.frame();
    const [ss, sl, bs, bk] = JSON.parse(g(`(()=>{ let ss=1, sl=0, bs=1, bk=0; for (let i = 2; i < NSEG; i++) { const k = (sgY[i+1]-sgY[i-1])/(2*segStep); if (Math.abs(k) > Math.abs(sl)) { sl = k; ss = i; } if (Math.abs(sgBank[i]) > Math.abs(bk)) { bk = sgBank[i]; bs = i; } } return JSON.stringify([ss, sl, bs, bk]); })()`));
    const park = (seg, turn) => {
        const i = seg - 1;
        g(`(()=>{ caX[0] = sgX[${i}] + sgDX[${i}] * segStep * 0.5; caZ[0] = sgZ[${i}] + sgDZ[${i}] * segStep * 0.5; caY[0] = sgY[${i}]; caSeg[0] = ${seg}; caAir[0] = 0;
            caYaw[0] = Math.atan2(sgDX[${i}], sgDZ[${i}]) * 180 / Math.PI + ${turn}; caVX[0] = 0; caVZ[0] = 0; caYR[0] = 0; caSpd[0] = 0; })()`);
        for (let f = 0; f < 45; f++) { s.frame(); g(`caX[0] = sgX[${i}] + sgDX[${i}] * segStep * 0.5; caZ[0] = sgZ[${i}] + sgDZ[${i}] * segStep * 0.5; caVX[0] = 0; caVZ[0] = 0; caYR[0] = 0; caYaw[0] = Math.atan2(sgDX[${i}], sgDZ[${i}]) * 180 / Math.PI + ${turn};`); }
        // the ground itself, sampled 1 m ahead / behind and right / left
        const [wp, wr] = JSON.parse(g(`(()=>{ const y = caYaw[0] * Math.PI / 180, fx = Math.sin(y), fz = Math.cos(y);
            const h = (x, z) => { sampleTrack(x, z, caSeg[0]); return sfY; };
            const X = caX[0], Z = caZ[0];
            const gf = (h(X + fx, Z + fz) - h(X - fx, Z - fz)) / 2, gr = (h(X + fz, Z - fx) - h(X - fz, Z + fx)) / 2;
            return JSON.stringify([-Math.atan(gf) * 180 / Math.PI, Math.atan(gr) * 180 / Math.PI]); })()`));
        return [+g('caPitch[0]'), +g('caRoll[0]'), wp, wr];
    };
    const d = (x) => x.toFixed(1).padStart(5);
    const line = [];
    let ok = true;
    for (const [seg, turn, nm] of [[ss, 0, 'climb along'], [ss, 90, 'climb sideways'], [ss, 45, 'climb 45'], [bs, 0, 'bank along'], [bs, 30, 'bank 30']]) {
        const [p, r, wp, wr] = park(seg, turn);
        const e = Math.max(Math.abs(p - wp), Math.abs(r - wr));
        if (e > 1.0) ok = false;
        line.push(`${nm} ${d(p)}/${d(r)} (ground ${d(wp)}/${d(wr)})`);
    }
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'BAD '}${String(g(`trkName[${t - 1}]`)).padEnd(17)} steepest ${d(Math.atan(sl) * 180 / Math.PI)} deg, bank ${d(bk)}:  ${line.join('  ')}`);
}
console.log(bad ? `FAIL ${bad} circuits` : 'PASS all circuits');

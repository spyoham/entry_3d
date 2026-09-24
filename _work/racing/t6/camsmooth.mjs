// menu fly-over at 60 fps: frame-to-frame yaw change and its jerk (new camera vs the v5 one)
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 60 }); const g = (e) => s.peek(e);
for (let i = 0; i < 3; i++) s.frame();
for (const tk of [1, 3, 6]) {
    g(`buildTrack(${tk})`); g('attractT = 0; mcInit = 0;');
    const run = (fn) => { const y = []; for (let i = 0; i < 600; i++) { g('dt = 1/60; gt = gt + 1/60;'); g(fn); y.push(g('camYaw')); } return y; };
    const stats = (y) => { let m1 = 0, m2 = 0; for (let i = 2; i < y.length; i++) { const d1 = ((y[i] - y[i - 1] + 540) % 360) - 180, d0 = ((y[i - 1] - y[i - 2] + 540) % 360) - 180; m1 = Math.max(m1, Math.abs(d1)); m2 = Math.max(m2, Math.abs(d1 - d0)); } return `max step ${m1.toFixed(2)} deg, max jerk ${m2.toFixed(3)} deg`; };
    const nw = run('menuCam()');
    // v5: aim at a whole ring 18 ahead, no easing, 6 segments/s
    g(`menuCamV5 = function(){ attractT = attractT + dt * 6; let f = mod(attractT, NSEG); let s = Math.floor(f) + 1; let u = f - Math.floor(f); let s2 = mod(s, NSEG) + 1;
      let x = sgX[s-1] + (sgX[s2-1] - sgX[s-1]) * u; let z = sgZ[s-1] + (sgZ[s2-1] - sgZ[s-1]) * u; let side = 10 * sind(gt * 20);
      camX = x + sgNX[s-1] * side; camZ = z + sgNZ[s-1] * side; let la = mod(s - 1 + 18, NSEG) + 1; atan2d(sgX[la-1] - camX, sgZ[la-1] - camZ); camYaw = oAtan; }`);
    g('attractT = 0');
    const old = run('menuCamV5()');
    console.log(`track ${tk}  v5: ${stats(old)}   v6: ${stats(nw)}`);
}

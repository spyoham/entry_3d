// v6.2 draw-order checks: a photo-mode camera anywhere over a circuit, to PNG.
// usage: SIMS=3 node t8/shot.mjs '{"trk":1,"gfx":3,"shots":[{"ring":189,"back":60,"up":35,"side":0,"pitch":-25,"yawOff":0,"fov":70,"out":"a.png"}]}'
//   ring: aim at this ring; the camera stands back/up/side metres from it
//   (back along the ring's heading), or give x,y,z,yaw directly
import path from 'node:path';
import url from 'node:url';
import { createSim } from '../sim.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
let seed = 777;
Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const o = JSON.parse(process.argv[2] || '{}');
const s = createSim({ fps: 30 }); const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g(`rules = 1; gMode = 1; gfx = ${o.gfx || 3}; gfxSel = ${o.gfx || 3}; selTrk = ${o.trk || 1}; applyWeather(); doStartRace();`);
for (let i = 0; i < (o.frames || 90); i++) s.frame();
g('photoEnter()');
if (process.env.ZEXEC) g(process.env.ZEXEC);
if (o.exec) for (const e of o.exec) g(e);   // any statements inside the program (wrap a function, set a flag)
if (o.stub) for (const f of o.stub) g(`${f} = function(){}`);   // e.g. ["drawLand","drawScnIn"]
for (const sh of o.shots) {
    let x = sh.x, y = sh.y, z = sh.z, yaw = sh.yaw;
    if (sh.look) {
        // aim at ring sh.look from (dist m away on bearing brg, up m above it)
        const r = sh.look;
        const rx = +g(`sgX[${r - 1}]`), ry = +g(`sgY[${r - 1}]`), rz = +g(`sgZ[${r - 1}]`);
        const b = (sh.brg || 0) * Math.PI / 180, d = sh.dist || 60;
        x = rx + Math.sin(b) * d; z = rz + Math.cos(b) * d; y = ry + (sh.up || 25);
        yaw = Math.atan2(rx - x, rz - z) * 180 / Math.PI;
        sh.pitch = sh.pitch ?? -Math.atan2(y - ry, d) * 180 / Math.PI;
    } else if (sh.ring) {
        const r = sh.ring;
        const rx = +g(`sgX[${r - 1}]`), ry = +g(`sgY[${r - 1}]`), rz = +g(`sgZ[${r - 1}]`);
        const dx = +g(`sgDX[${r - 1}]`), dz = +g(`sgDZ[${r - 1}]`);
        const hd = Math.atan2(dx, dz) * 180 / Math.PI + (sh.yawOff || 0);
        const fx = Math.sin(hd * Math.PI / 180), fz = Math.cos(hd * Math.PI / 180);
        x = rx - fx * (sh.back || 0) + fz * (sh.side || 0);
        z = rz - fz * (sh.back || 0) - fx * (sh.side || 0);
        y = ry + (sh.up || 0);
        yaw = hd;
    }
    g(`phX = ${x}; phY = ${y}; phZ = ${z}; phX0 = ${x}; phZ0 = ${z}; phYaw = ${yaw}; phPitch = ${sh.pitch || 0}; phFov = ${sh.fov || 70}; phHelp = 0; actKey = 0`);
    g('photoStep()');
    const out = path.resolve(sh.out || path.join(HERE, 'shot.png'));
    await s.png(out);
    let zf = '';
    if (process.env.SIMZ) zf = ' zdiff ' + (100 * await s.zpng(out.replace(/\.png$/, '_z.png'), out.replace(/\.png$/, '_d.png'))).toFixed(2) + '%';
    console.log(out + zf, 'cam', x.toFixed(1), y.toFixed(1), z.toFixed(1), 'yaw', yaw.toFixed(1), 'quads', g('drawnQuads'), 'nVis', g('nVis'), 'camSeg', g('camSeg'));
}

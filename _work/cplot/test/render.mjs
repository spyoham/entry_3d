// The finished picture against the reference: every cell's colour, for some formulas, views and colour modes.
//   node test/render.mjs
import { createSim, SS, W } from '../sim.mjs';
import { parse, C } from './ref.mjs';
import { palette, NH, NL } from '../tables.mjs';
const PAL = palette().map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
// the palette index the work should pick for the value f (1-based), mode as `cmode`
function indexOf(f, mode) {
    const m = f.re * f.re + f.im * f.im;
    if (!(m > 1e-280 && m < 1e280)) return m < 1 ? (NH + 2) * NL + 1 : (NH + 2) * NL + 2;
    const phase = Math.atan2(f.im, f.re) * 180 / Math.PI, lg = Math.log2(Math.sqrt(m)), fr = lg - Math.floor(lg);
    const r = Math.min(NH + 1, Math.floor((phase + 180) / (360 / NH)) + 1);
    let c;
    if (mode === 1) c = Math.ceil(fr * NL);
    else if (mode === 2) { const t = (phase + 180) / 30; c = Math.ceil((fr + (t - Math.floor(t))) * NL / 2); }
    else if (mode === 3) c = 2 + (((Math.floor(f.re) + Math.floor(f.im)) % 2 + 2) % 2) * (NL - 4);
    else c = NL - 3;
    return r * NL + c;
}
const CASES = [
    { f: '(z^2-1)(z-2-i)^2/(z^2+2+2i)', level: 4 },
    { f: 'z', level: 3, mode: 2 },
    { f: 'z^3-1', level: 4, mode: 3 },
    { f: 'e^(1/z)', level: 4, cx: 0.1, cy: -0.05, upp: 0.004 },
    { f: 'sin(z)', level: 3, mode: 0 },
    { f: 'sqrt(z^2-1)', level: 4 },
    { f: 'ln(z)', level: 4, mode: 2 },
    { f: 'tan(z)', level: 3, cx: 1.3, cy: 0.2, upp: 0.03 },
    { f: 'z^(1+i)', level: 4 },
    { f: '1/z', level: 5, cx: 0.001, cy: 0.002, upp: 0.0005 },
    { f: '2', level: 2 },
    { f: 'abs(z)-1', level: 3 },
    { f: '(z-1)/(z+1)', level: 5 },
];
let bad = 0;
for (const cse of CASES) {
    const s = createSim();
    s.frame();
    s.poke('helpOn', 0); s.poke('budget', 30000); s.poke('paceKnown', 1); s.poke('fpsNow', 60);
    if (cse.cx !== undefined) { s.poke('vcx', cse.cx); s.poke('vcy', cse.cy); s.poke('vupp', cse.upp); }
    s.poke('cmode', cse.mode ?? 1);
    s.as('top', () => s.fn.setFormula(cse.f));
    // stop at the wanted pass
    let n = 0;
    do { s.frame(); n++; if (s.peek('rLevel') === cse.level && s.peek('rState') === 1) s.poke('hiq', 0); } while (!(s.peek('rState') === 0 && s.peek('vgen') === s.peek('rView')) && n < 5000 && !(s.peek('rLevel') > cse.level));
    // (run on to the end of whatever pass is last, then judge by the cells of that pass)
    while (s.peek('rState') !== 0 && n < 9000) { s.frame(); n++; }
    for (let i = 0; i < 3; i++) s.frame();
    const level = s.peek('rLevel'), cs = [16, 8, 4, 2, 1][level - 1];
    const px = s.compose({ axes: false });
    const ref = parse(cse.f);
    const cx = s.peek('pcx'), cy = s.peek('pcy'), upp = s.peek('pupp'), mode = s.peek('pmode');
    let cells = 0, diff = 0, far = 0, white = 0;
    for (let row = 0; row * cs < 270; row++) for (let col = 0; col * cs < 480; col++) {
        const X = col * cs + cs / 2 - 240, Y = 135 - row * cs - cs / 2;
        if (Y < -135) continue;
        const want = indexOf(ref(C(cx + X * upp, cy + Y * upp), {}), mode);
        const o = (Math.min(269 * SS + 1, Math.floor((135 - Y) * SS)) * W + Math.floor((X + 240) * SS)) * 3;
        const got = [px[o], px[o + 1], px[o + 2]], w = PAL[want - 1];
        cells++;
        if (got[0] === 255 && got[1] === 255 && got[2] === 255 && want !== (NH + 2) * NL + 2) white++;
        if (got[0] !== w[0] || got[1] !== w[1] || got[2] !== w[2]) {
            diff++;
            // a neighbour in the palette (a value right at a boundary)?
            const near = [want - 1, want + 1, want - NL, want + NL, want - NL + 1, want + NL - 1, want - NL * NH, want + NL * NH, want - NL * (NH - 1), want + NL * (NH - 1), want - NL - 1, want + NL + 1, want - NL + NL - 1 + 1 - NL, want + NL - 1 - NL + 1 + NL].some(k => PAL[k - 1] && PAL[k - 1][0] === got[0] && PAL[k - 1][1] === got[1] && PAL[k - 1][2] === got[2]);
            if (!near) far++;
        }
    }
    const alive = s.entities.filter(e => e.clone && !e.dead).length;
    const ok = far <= cells * 0.002 && diff <= cells * 0.02 && white === 0 && alive < 200;
    if (!ok) bad++;
    console.log(ok ? 'ok  ' : 'FAIL', cse.f.padEnd(30), `cells of ${cs}`.padEnd(11), 'cells', String(cells).padStart(6), 'off by a step', String(diff - far).padStart(4), 'wrong', far, 'unpainted', white, 'clones', alive, 'max', s.stats.maxClones, 'frames', n);
}
console.log(bad ? `FAIL ${bad}` : 'PASS');
process.exit(bad ? 1 : 0);

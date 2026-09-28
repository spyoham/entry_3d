// Offline model of the Entry grain player: renders what the project should
// sound like, so the grain length / grid can be chosen before building.
// usage: node sim.mjs [P_ms] [H_ms] [jitter_ms]
import fs from 'node:fs';

export function readWav(file) {
    const b = fs.readFileSync(file);
    let p = 12, sr = 0, data = null;
    while (p < b.length) {
        const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
        if (id === 'fmt ') sr = b.readUInt32LE(p + 12);
        if (id === 'data') { data = new Float64Array(len / 2); for (let i = 0; i < data.length; i++) data[i] = b.readInt16LE(p + 8 + i * 2) / 32768; }
        p += 8 + len + (len & 1);
    }
    return { sr, x: data };
}
export function writeWav(file, x, sr) {
    const pcm = Buffer.alloc(x.length * 2);
    for (let i = 0; i < x.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), i * 2);
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24);
    h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync(file, Buffer.concat([h, pcm]));
}

// y = what Entry would play: one grain per frame (60 Hz), grain k = round(t / H)
export function render(x, sr, r, P, H, jit = 0) {
    const Pn = Math.round(P * sr), N = Math.floor((x.length / sr - P) / H) + 1;
    const dur = x.length / sr;
    const y = new Float64Array(x.length + Math.ceil(Pn / r) + sr);
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const vol = Math.min(1, 2 * r / 60 / P);
    for (let f = 0; f / 60 < dur; f++) {
        const t = f / 60;
        const k = Math.min(N - 1, Math.round(t / H));
        const s0 = Math.round(k * H * sr);
        const o0 = Math.round((t + (rnd() - 0.5) * 2 * jit) * sr);
        const L = Math.floor(Pn / r);
        for (let j = 0; j < L; j++) {
            const u = j * r, i = Math.floor(u), a = u - i;
            if (i + 1 >= Pn) break;
            const w0 = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / Pn), w1 = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 1) / Pn);
            const v = (x[s0 + i] || 0) * w0 * (1 - a) + (x[s0 + i + 1] || 0) * w1 * a;
            if (o0 + j >= 0) y[o0 + j] += v * vol;
        }
    }
    return y;
}

// median pitch over voiced 40 ms windows (autocorrelation, 70..500 Hz)
export function pitch(x, sr) {
    const W = Math.round(0.04 * sr), out = [];
    for (let s = 0; s + W + sr / 70 < x.length; s += W) {
        let e = 0; for (let i = 0; i < W; i++) e += x[s + i] * x[s + i];
        if (e / W < 1e-3) continue;
        let best = 0, bl = 0;
        for (let l = Math.floor(sr / 500); l < sr / 70; l++) {
            let c = 0, e2 = 0; for (let i = 0; i < W; i++) { c += x[s + i] * x[s + i + l]; e2 += x[s + i + l] ** 2; }
            c /= Math.sqrt(e * e2) + 1e-12;
            if (c > best) { best = c; bl = l; }
        }
        if (best > 0.6) out.push(sr / bl);
    }
    out.sort((a, b) => a - b);
    return out.length ? out[out.length >> 1] : 0;
}

if (process.argv[1] && process.argv[1].endsWith('sim.mjs')) {
    const P = Number(process.argv[2] || 80) / 1000, H = Number(process.argv[3] || 1000 / 30) / 1000, jit = Number(process.argv[4] || 0) / 1000;
    const { sr, x } = readWav(new URL('./voice.wav', import.meta.url));
    const f0 = pitch(x, sr);
    console.log('source', (x.length / sr).toFixed(2), 's, pitch', f0.toFixed(1), 'Hz');
    fs.mkdirSync(new URL('./sim/', import.meta.url), { recursive: true });
    for (const st of [-12, -7, -4, 0, 4, 7, 12]) {
        const r = 2 ** (st / 12);
        const y = render(x, sr, r, P, H, jit);
        let peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v));
        const f = pitch(y, sr);
        console.log(`${st >= 0 ? '+' : ''}${st} st  r=${r.toFixed(3)}  pitch ${f.toFixed(1)} Hz (x${(f / f0).toFixed(3)})  peak ${peak.toFixed(2)}`);
        writeWav(new URL(`./sim/st${st}.wav`, import.meta.url), y, sr);
    }
}

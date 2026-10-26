// Sound effects, made here: gunshots of each kind at three distances, hits, steps, the zone...
// Synthesised (noise, sweeps, filters), written as WAV and turned into MP3 by ffmpeg
// (playentry does not take WAV). Global volume only in Entry: distance is baked in.
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SR = 22050;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
// one-pole low-pass at cutoff fc (Hz), in place
function lp(a, fc) { const k = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0; for (let i = 0; i < a.length; i++) { y += (a[i] - y) * k; a[i] = y; } return a; }
function hp(a, fc) { const b = Float32Array.from(a); lp(b, fc); for (let i = 0; i < a.length; i++) a[i] -= b[i]; return a; }
function noise(a, seed, from = 0, to = a.length, amp = 1, env = (t) => 1) { const R = rng(seed); for (let i = from; i < to; i++) a[i] += (R() * 2 - 1) * amp * env((i - from) / SR); return a; }
function sweep(a, f0, f1, dur, amp, at = 0, shape = 6) { let ph = 0; const n = Math.floor(dur * SR); for (let i = 0; i < n && at + i < a.length; i++) { const t = i / n; const f = f0 * Math.pow(f1 / f0, t); ph += 2 * Math.PI * f / SR; a[at + i] += Math.sin(ph) * amp * Math.exp(-t * shape); } return a; }
function tone(a, f, dur, amp, at = 0, decay = 4) { for (let i = 0; i < dur * SR && at + i < a.length; i++) { const t = i / SR; a[at + i] += Math.sin(2 * Math.PI * f * t) * amp * Math.exp(-t * decay) * Math.min(1, t * 400); } return a; }
// a simple reverb: a few echoes
function verb(a, amt, len = 0.25) { const o = Float32Array.from(a); for (const [d, g] of [[0.031, 0.5], [0.047, 0.4], [0.071, 0.32], [0.113, 0.22], [0.167, 0.15], [len, 0.1]]) { const s = Math.floor(d * SR); for (let i = s; i < a.length; i++) a[i] += o[i - s] * g * amt; } return a; }
function norm(a, peak) { let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); const k = m > 0 ? peak / m : 0; for (let i = 0; i < a.length; i++) a[i] *= k; for (let i = 0; i < Math.min(220, a.length); i++) a[a.length - 1 - i] *= i / 220; return a; }
function wav(a) {
    const n = a.length, b = Buffer.alloc(44 + n * 2);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(a[i] * 32767))), 44 + i * 2);
    return b;
}
const FFMPEG = fs.existsSync('E:/ffmpeg-7.0.1-full_build/bin/ffmpeg.exe') ? 'E:/ffmpeg-7.0.1-full_build/bin/ffmpeg.exe' : 'ffmpeg';
function mp3(w) { return cp.execFileSync(FFMPEG, ['-v', 'error', '-f', 'wav', '-i', 'pipe:0', '-ac', '1', '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { input: w, maxBuffer: 1 << 26 }); }

// a gunshot: a crack (noise), a thump (sweep), a tail; far: darker, softer, longer
function shot(kind, dist, seed) {
    const P = {
        pis: { crack: 5200, thump: [160, 60], dur: 0.35, body: 0.6, peak: 0.85 },
        smg: { crack: 4600, thump: [140, 55], dur: 0.3, body: 0.55, peak: 0.8 },
        ar: { crack: 6500, thump: [120, 45], dur: 0.45, body: 0.7, peak: 0.95 },
        ak: { crack: 5200, thump: [100, 38], dur: 0.5, body: 0.85, peak: 0.97 },
        sr: { crack: 7000, thump: [90, 32], dur: 0.8, body: 1.0, peak: 1.0 },
        sg: { crack: 3800, thump: [95, 36], dur: 0.6, body: 1.0, peak: 1.0 },
        sup: { crack: 2600, thump: [220, 120], dur: 0.18, body: 0.25, peak: 0.45 },
    }[kind];
    const len = P.dur * (dist === 'n' ? 1 : dist === 'm' ? 1.6 : 2.4);
    const a = buf(len);
    noise(a, seed, 0, a.length, 1, (t) => Math.exp(-t * (dist === 'n' ? 38 : 22)));
    lp(a, dist === 'n' ? P.crack : dist === 'm' ? P.crack * 0.35 : P.crack * 0.12);
    sweep(a, P.thump[0], P.thump[1], len * 0.8, P.body * (dist === 'f' ? 0.6 : 1), 0, 7);
    if (kind === 'sup') hp(a, 300);
    verb(a, dist === 'n' ? 0.35 : dist === 'm' ? 0.8 : 1.3, dist === 'f' ? 0.4 : 0.22);
    return norm(a, P.peak * (dist === 'n' ? 1 : dist === 'm' ? 0.42 : 0.16));
}
export function makeSounds() {
    const S = [];
    const add = (name, a) => S.push({ id: name, name, buf: mp3(wav(a)), ext: 'mp3', duration: a.length / SR });
    let seed = 11;
    for (const k of ['pis', 'smg', 'ar', 'ak', 'sr', 'sg', 'sup']) for (const d of ['n', 'm', 'f']) add(`g_${k}_${d}`, shot(k, d, seed++));
    // hit markers, kill, hurt
    { const a = buf(0.12); tone(a, 1800, 0.12, 0.6, 0, 40); noise(a, 3, 0, 200, 0.3); add('hit', norm(a, 0.6)); }
    { const a = buf(0.4); tone(a, 1320, 0.2, 0.6, 0, 12); tone(a, 1760, 0.2, 0.6, Math.floor(0.09 * SR), 10); add('kill', norm(a, 0.6)); }
    { const a = buf(0.25); sweep(a, 180, 60, 0.25, 1, 0, 9); noise(a, 4, 0, a.length, 0.4, (t) => Math.exp(-t * 30)); lp(a, 900); add('hurt', norm(a, 0.8)); }
    { const a = buf(0.08); noise(a, 5, 0, a.length, 1, (t) => Math.exp(-t * 120)); hp(a, 2000); add('empty', norm(a, 0.5)); }
    { const a = buf(1.0); for (const [t, f] of [[0.05, 1400], [0.35, 900], [0.7, 2000], [0.8, 1600]]) { noise(a, 6 + t * 10, Math.floor(t * SR), Math.floor((t + 0.06) * SR), 1, (x) => Math.exp(-x * 80)); } lp(a, 3500); add('reload', norm(a, 0.55)); }
    { const a = buf(0.25); noise(a, 7, 0, a.length, 1, (t) => Math.exp(-t * 25)); lp(a, 2500); hp(a, 400); add('equip', norm(a, 0.45)); }
    { const a = buf(0.15); noise(a, 8, 0, a.length, 1, (t) => Math.exp(-t * 40)); lp(a, 1800); add('pick', norm(a, 0.45)); }
    { const a = buf(1.2); noise(a, 9, 0, a.length, 1, (t) => 0.5 + 0.5 * Math.sin(t * 30)); lp(a, 1200); hp(a, 200); add('heal', norm(a, 0.35)); }
    { const a = buf(1.0); noise(a, 10, 0, a.length, 1, (t) => Math.min(1, t * 8) * Math.exp(-t * 3)); lp(a, 600); sweep(a, 60, 40, 0.6, 0.6, 0, 3); add('chute', norm(a, 0.6)); }
    { const a = buf(1.2); for (let k = 0; k < 3; k++) tone(a, 880, 0.25, 0.6, Math.floor(k * 0.35 * SR), 3); add('zone', norm(a, 0.55)); }
    { const a = buf(1.6); noise(a, 12, 0, a.length, 1, (t) => Math.exp(-t * 4)); lp(a, 1600); sweep(a, 70, 28, 1.4, 1.2, 0, 3); verb(a, 0.8, 0.3); add('boom_n', norm(a, 1)); }
    { const a = buf(2.0); noise(a, 13, 0, a.length, 1, (t) => Math.exp(-t * 3)); lp(a, 350); sweep(a, 50, 25, 1.8, 1, 0, 2); verb(a, 1.2, 0.5); add('boom_f', norm(a, 0.35)); }
    { const a = buf(1.6); [523, 659, 784, 1047].forEach((f, i) => tone(a, f, 0.6, 0.5, Math.floor(i * 0.16 * SR), 2.5)); add('win', norm(a, 0.6)); }
    { const a = buf(1.2); sweep(a, 220, 90, 1.1, 0.8, 0, 2); add('dead', norm(a, 0.6)); }
    { const a = buf(0.12); noise(a, 14, 0, a.length, 1, (t) => Math.exp(-t * 60)); lp(a, 500); add('step', norm(a, 0.35)); }
    // v1.1: an engine at three speeds (played over and over while driving), and a crash
    [[38, 1], [62, 2], [92, 3]].forEach(([f0, i]) => {
        const a = buf(0.5);
        for (let n = 0; n < a.length; n++) {
            const t = n / SR, env = Math.min(1, t * 30) * Math.min(1, (0.5 - t) * 30);
            let s = 0; for (const [h, g] of [[1, 1], [2, 0.6], [3, 0.45], [5, 0.25], [7, 0.12]]) s += Math.sin(2 * Math.PI * f0 * h * t + h) * g;
            a[n] = s * env * (0.75 + 0.25 * Math.sin(2 * Math.PI * f0 / 2 * t));
        }
        noise(a, 20 + i, 0, a.length, 0.25, (t) => Math.min(1, t * 30) * Math.min(1, (0.5 - t) * 30));
        lp(a, 900 + i * 300);
        add('eng' + i, norm(a, 0.32));
    });
    { const a = buf(0.7); noise(a, 30, 0, a.length, 1, (t) => Math.exp(-t * 9)); lp(a, 2400); sweep(a, 90, 40, 0.5, 0.9, 0, 6); for (const [t, f] of [[0.02, 1900], [0.09, 1300], [0.16, 2500]]) tone(a, f, 0.25, 0.25, Math.floor(t * SR), 18); add('crash', norm(a, 0.8)); }
    return S;
}

if (process.argv[1] && process.argv[1].endsWith('sounds.mjs')) {
    const t = performance.now();
    const S = makeSounds();
    let tot = 0; for (const s of S) tot += s.buf.length;
    console.log(S.length, 'sounds', Math.round(tot / 1024), 'KB', Math.round(performance.now() - t), 'ms');
    if (process.argv[2]) { fs.mkdirSync(process.argv[2], { recursive: true }); for (const s of S) fs.writeFileSync(path.join(process.argv[2], s.name + '.mp3'), s.buf); }
}

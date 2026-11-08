// Sound effects for 블록 월드, synthesised (noise, sweeps, filters), WAV -> MP3 by ffmpeg
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

export function makeSounds() {
    const S = [];
    const add = (name, a) => S.push({ id: name, name, buf: mp3(wav(a)), ext: 'mp3', duration: a.length / SR });
    // s1 digging: a short gritty tick
    { const a = buf(0.09); noise(a, 1, 0, a.length, 1, (t) => Math.exp(-t * 70)); lp(a, 1800); sweep(a, 220, 120, 0.06, 0.4, 0, 8); add('s1', norm(a, 0.35)); }
    // s2 a block breaks / is placed: a thud with crumble
    { const a = buf(0.22); noise(a, 2, 0, a.length, 1, (t) => Math.exp(-t * 28)); lp(a, 1200); sweep(a, 160, 70, 0.15, 0.9, 0, 6); add('s2', norm(a, 0.6)); }
    // s3 the player hurt: a low grunt
    { const a = buf(0.3); sweep(a, 260, 150, 0.28, 1, 0, 4); sweep(a, 520, 300, 0.2, 0.3, 0, 6); noise(a, 3, 0, a.length, 0.2, (t) => Math.exp(-t * 20)); lp(a, 1400); add('s3', norm(a, 0.65)); }
    // s4 a mob hurt: a squeaky hit
    { const a = buf(0.2); noise(a, 4, 0, a.length, 1, (t) => Math.exp(-t * 45)); lp(a, 2500); sweep(a, 420, 260, 0.16, 0.7, 0, 5); add('s4', norm(a, 0.55)); }
    // s5 eating: three crunches
    { const a = buf(0.45); for (let i = 0; i < 3; i++) noise(a, 5 + i, Math.floor(i * 0.14 * SR), Math.floor((i * 0.14 + 0.09) * SR), 1, (t) => Math.exp(-t * 40)); hp(a, 600); add('s5', norm(a, 0.45)); }
    // s6 picking up: a small blip
    { const a = buf(0.1); sweep(a, 900, 1500, 0.08, 0.8, 0, 3); add('s6', norm(a, 0.3)); }
    // s7 a tool breaks: a snap
    { const a = buf(0.35); noise(a, 9, 0, a.length, 1, (t) => Math.exp(-t * 18)); hp(a, 1500); sweep(a, 1200, 500, 0.3, 0.6, 0, 4); add('s7', norm(a, 0.6)); }
    return S;
}

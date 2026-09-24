// v7: the engine sound, synthesised at build time (no recorded audio).
// One loop of a V6 turbo-hybrid at a reference 7400 rpm. The game plays it
// over and over and bends its pitch with Entry's "sound speed" block
// (0.5 .. 2.0), which covers idle to the limiter: rpm / REF_RPM.
//
// Sound model: the firing frequency (rpm / 60 * 3 for a V6) and its
// harmonics, a half-order rumble (uneven firing), a turbo whine an octave
// and a fifth up, and band-limited noise for intake and exhaust roar, pushed
// through a soft clipper so it growls instead of humming. Every tone is a
// whole number of cycles over the loop and the ends are faded, so the
// restart seam is quiet.
export const REF_RPM = 7400;
export const LOOP_SEC = 1.5;

export function engineWav({ rate = 22050 } = {}) {
    const n = Math.round(rate * LOOP_SEC);
    const fire = REF_RPM / 60 * 3;                  // 370 Hz
    const cyc = (f) => Math.round(f * LOOP_SEC) / LOOP_SEC;   // snap to whole cycles
    const tones = [
        [cyc(fire * 0.5), 0.34], [cyc(fire), 1.00], [cyc(fire * 1.5), 0.30], [cyc(fire * 2), 0.52],
        [cyc(fire * 3), 0.26], [cyc(fire * 4), 0.16], [cyc(fire * 5), 0.09], [cyc(fire * 6), 0.06],
        [cyc(fire * 2.98), 0.05],                   // a slight beat against the 3rd harmonic
    ];
    const whine = cyc(fire * 3.5);
    // deterministic noise, then two one-pole filters make it band-limited
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 * 2 - 1; };
    const out = new Float64Array(n);
    let lp1 = 0, lp2 = 0;
    for (let i = 0; i < n; i++) {
        const t = i / rate;
        let s = 0;
        for (const [f, a] of tones) s += a * Math.sin(2 * Math.PI * f * t + a * 3);
        // firing pulses: amplitude swells once per firing, a little unevenly
        const ph = (t * fire) % 1;
        const pulse = 0.72 + 0.28 * Math.exp(-ph * 5) + 0.04 * Math.sin(2 * Math.PI * cyc(fire * 0.5) * t);
        s *= pulse;
        s += 0.10 * Math.sin(2 * Math.PI * whine * t);
        const w = rnd();
        lp1 += (w - lp1) * 0.35;
        lp2 += (lp1 - lp2) * 0.35;
        s += (lp1 - lp2) * 0.9 + lp2 * 0.35;
        out[i] = s;
    }
    // normalise, soft clip, fade the ends for the restart seam
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    const fade = Math.round(rate * 0.05);
    const pcm = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) {
        let v = Math.tanh(out[i] / peak * 1.9) / Math.tanh(1.9);
        if (i < fade) v *= i / fade;
        if (i > n - 1 - fade) v *= (n - 1 - i) / fade;
        pcm.writeInt16LE(Math.round(v * 0.82 * 32767), i * 2);
    }
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8);
    hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
    hdr.writeUInt32LE(rate, 24); hdr.writeUInt32LE(rate * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
    hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([hdr, pcm]);
}

if (process.argv[1] && process.argv[1].endsWith('enginewav.mjs')) {
    const fs = await import('node:fs');
    const b = engineWav();
    fs.writeFileSync(process.argv[2] || 'engine.wav', b);
    console.log('engine.wav', b.length, 'bytes');
}

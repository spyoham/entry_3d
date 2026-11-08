// top-down map of a generated world: node test/map.mjs out.png [seed]
import { createRequire } from 'node:module';
import { createSim } from '../sim.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const [out, seed] = process.argv.slice(2);
const s = createSim({ consts: { AUTOSEED: Number(seed || 1234), TESTRUN: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const W = s.peek('W'), SZ = 128, WY = 64, K = 4;
const C = { 0: [0, 0, 0], 1: [128, 128, 128], 2: [90, 160, 60], 3: [134, 96, 67], 4: [100, 100, 100], 7: [40, 80, 200], 8: [220, 210, 160], 9: [130, 120, 110], 13: [100, 80, 50], 14: [40, 110, 30], 19: [60, 130, 40], 20: [240, 240, 245], 21: [210, 200, 150], 22: [160, 166, 180], 23: [220, 220, 210], 24: [100, 160, 70], 25: [70, 50, 30], 26: [40, 80, 60], 28: [100, 170, 70], 29: [220, 40, 40], 30: [240, 210, 30], 33: [160, 190, 245], 35: [230, 90, 20], 45: [250, 250, 255], 46: [130, 100, 60] };
const buf = Buffer.alloc(SZ * K * SZ * K * 3);
const caves = Buffer.alloc(SZ * K * SZ * K * 3);
for (let x = 0; x < SZ; x++) for (let z = 0; z < SZ; z++) {
    let y = WY - 1, i = (x * SZ + z) * WY + y;
    while (y > 0 && W[i] === 0) { y--; i--; }
    const b = W[i];
    let c = C[b] || [255, 0, 255];
    const sh = 0.55 + 0.45 * y / WY;
    // air below ground level: caves
    let air = 0; for (let yy = 1; yy < y - 3; yy++) { const bb = W[(x * SZ + z) * WY + yy]; if (bb === 0) air++; if (bb === 35) air += 0.5; }
    for (let a = 0; a < K; a++) for (let d = 0; d < K; d++) {
        const o = ((z * K + d) * SZ * K + x * K + a) * 3;
        buf[o] = c[0] * sh; buf[o + 1] = c[1] * sh; buf[o + 2] = c[2] * sh;
        caves[o] = caves[o + 1] = caves[o + 2] = Math.min(255, air * 25);
    }
}
await sharp(buf, { raw: { width: SZ * K, height: SZ * K, channels: 3 } }).png().toFile(out);
await sharp(caves, { raw: { width: SZ * K, height: SZ * K, channels: 3 } }).png().toFile(out.replace('.png', '_caves.png'));
// ore counts
const cnt = {}; for (const b of W) cnt[b] = (cnt[b] || 0) + 1;
console.log(JSON.stringify(cnt));

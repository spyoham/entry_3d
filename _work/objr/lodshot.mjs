// pictures of each level of an example: node lodshot.mjs example-number
import { createSim } from './sim.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const s = createSim();
s.frame(); s.poke('helpOn', 0); s.settle();
const which = (process.argv[2] || '2').split(',').map(Number);
const tiles = [];
let ex = 1;
for (const w of which) {
    while (ex < w) { s.as('pen', () => s.fn.nextExample()); s.settle(); ex++; }
    for (let lv = 1; lv <= s.peek('nLv'); lv++) {
        s.as('pen', () => s.fn.renderLevel(lv));
        await s.png(`lv_${w}_${lv}.png`);
        tiles.push(`lv_${w}_${lv}.png`);
        console.log(w, 'level', lv, 'faces', s.peek('LVN')[lv - 1]);
    }
}
const bufs = await Promise.all(tiles.map(f => sharp(f).resize(480, 270).toBuffer()));
await sharp({ create: { width: 1440, height: 270 * Math.ceil(tiles.length / 3), channels: 3, background: '#000' } }).composite(bufs.map((b, i) => ({ input: b, left: (i % 3) * 480, top: Math.floor(i / 3) * 270 }))).png().toFile('lods.png');

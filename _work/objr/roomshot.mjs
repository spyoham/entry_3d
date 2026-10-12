// pictures of a file from a few sides, both ways of drawing its faces: node roomshot.mjs file.obj out.png
import fs from 'node:fs';
import { createSim } from './sim.mjs';
import { asPasted } from './models.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const s = createSim();
s.frame(); s.settle();
s.as('pen', () => s.fn.loadBegin(asPasted(fs.readFileSync(process.argv[2], 'utf8')))); s.settle();
const views = [[1, -32, 20], [2, -32, 20], [2, -32, 55], [2, 150, 35], [1, 150, 35], [2, 60, 80]];
const tiles = [];
for (const [side, az, el] of views) {
    s.poke('two', side === 1 ? 1 : 0); s.poke('az', az); s.poke('el', el);
    s.as('pen', () => s.fn.renderLevel(1));
    tiles.push(await sharp(Buffer.from(s.compose()), { raw: { width: 960, height: 540, channels: 3 } }).resize(640, 360).png().toBuffer());
}
await sharp({ create: { width: 1920, height: 720, channels: 3, background: '#000' } }).composite(tiles.map((b, i) => ({ input: b, left: (i % 3) * 640, top: Math.floor(i / 3) * 360 }))).png().toFile(process.argv[3] || 'shots/room.png');
console.log('faces', s.peek('nFaces'), 'closed', s.peek('closed'));

// several views of one world into a sheet: node test/views.mjs seed
import { createRequire } from 'node:module';
import { createSim } from '../sim.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const seed = Number(process.argv[2] || 1234);
const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const views = JSON.parse(process.argv[3]);
const tiles = [];
for (const [x, z, yw, pt, up] of views) {
  s.as('pen', () => s.fn.findTop(Math.floor(x), Math.floor(z)));
  const y = s.peek('topY') + 1 + (up || 0);
  s.poke('tX', x); s.poke('tY', y); s.poke('tZ', z); s.poke('tYaw', yw); s.poke('tPitch', pt); s.poke('testCmd', 1); F(2); s.poke('flying', 1); F(30);
  tiles.push(await sharp(Buffer.from(s.compose()), { raw: { width: 960, height: 540, channels: 3 } }).resize(480, 270).png().toBuffer());
}
await sharp({ create: { width: 980, height: 280 * Math.ceil(tiles.length / 2), channels: 3, background: '#000' } }).composite(tiles.map((b, i) => ({ input: b, left: (i % 2) * 490, top: Math.floor(i / 2) * 280 }))).png().toFile('test/views.png');

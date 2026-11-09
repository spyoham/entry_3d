// The font at a few styles, all glyphs (Node picture)
import { createSim } from '../sim.mjs';
import sharp from '../../../entry-vibe-coding/node_modules/sharp/lib/index.js';
const styles = [[-1, 0, 0, -1, -1, 0, 0.6], [0, 0, 0.6, 0, -1, 0, 0.2], [1, 0.6, 0, 1, -1, 0, -0.3], [0.4, -0.4, 0, -0.3, 1, 0.33, -0.7]];
const words = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', "0123456789.,!?-:'/+=()#"];
const bufs = [];
for (const st of styles) for (const w of words) {
  const s = createSim({ consts: { START: 11 } });
  for (let i = 0; i < 3; i++) s.frame();
  s.as('pen', () => { s.fn.setWord(w); });
  const K = s.peek('KEY'); for (let i = 0; i < 7; i++) { K[i] = st[i]; K[7 + i] = st[i]; }
  s.as('pen', () => { s.fn.changed(); });
  s.poke('curT', 0); s.poke('playing', 0); s.poke('fgGen', s.peek('fgGen') + 1);
  for (let i = 0; i < 3; i++) s.frame();
  const f = `shots/g_${bufs.length}.png`; await s.png(f);
  bufs.push(await sharp(f).extract({ left: 0, top: 80, width: 640, height: 150 }).toBuffer());
}
await sharp({ create: { width: 1280, height: 150 * 6, channels: 3, background: '#000' } }).composite(bufs.map((b, i) => ({ input: b, left: (i % 2) * 640, top: Math.floor(i / 2) * 150 }))).png().toFile('shots/glyphs.png');

import { gunModels, attModels, itemModels } from '../guns.mjs';
import { buildBSP } from '../geom.mjs';
import { renderFaces, savePng } from '../view.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const G = gunModels();
const tiles = [];
for (const [i, gm] of G.entries()) {
    const m = gm.lods[0];
    const bsp = buildBSP(m.faces);
    const px = renderFaces(m.faces, [-90, 90, -220], [-90, 90, 1000], 320, 180, { bsp, fov: 80 });
    const f = `test/g${i}.png`; await savePng(px, 320, 180, f); tiles.push(f);
    const px2 = renderFaces(gm.lods[1].faces, [600, 900, -200], [0, 0, 100], 320, 200, { bsp: buildBSP(gm.lods[1].faces), fov: 60 });
    const f2 = `test/gw${i}.png`; await savePng(px2, 320, 200, f2);
    console.log(gm.name, m.faces.length, gm.lods[1].faces.length, gm.lods[2].faces.length);
}
await sharp({ create: { width: 1280, height: 800, channels: 3, background: '#000' } }).composite(tiles.slice(0, 16).map((f, i) => ({ input: f, left: (i % 4) * 320, top: Math.floor(i / 4) * 180 }))).png().toFile('test/guns.png');

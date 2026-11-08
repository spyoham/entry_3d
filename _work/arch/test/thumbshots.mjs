// big pictures for the thumbnail: SS=4 node test/thumbshots.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createSim, W as PW, H as PH } from '../sim.mjs';
import { makeWorld } from '../levels.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const Wd = makeWorld();
const views = JSON.parse(fs.readFileSync('test/thumbviews.json', 'utf8'));
for (const v of views) {
    const s = createSim({ consts: { AUTOSTART: v.st } });
    s.frame();
    s.poke('maxD', v.md || 6); s.poke('detail', 2); s.poke('minArea', 40);
    if (v.room) { const S = Wd.stages[v.st - 1]; s.poke('pr', Wd.rooms.slice(S.r0, S.r1).find(r => r.name === v.room).idx); }
    s.poke('px', v.x); s.poke('pz', v.z); if (v.y !== undefined) s.poke('py', v.y);
    for (let i = 0; i < 4; i++) { s.frame(); s.poke('maxD', v.md || 6); s.poke('detail', 2); s.poke('minArea', 40); }
    s.poke('menuOn', 1); s.poke('yaw', v.yaw); s.poke('pitch', v.pitch);
    s.frame();
    await sharp(Buffer.from(s.compose()), { raw: { width: PW, height: PH, channels: 3 } }).png().toFile(`test/thumb_${v.name}.png`);
    console.log(v.name, s.peek('nFill'));
}

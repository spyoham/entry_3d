// pictures of every stage's start (or given views) in one sheet: node test/sheet.mjs out.png [views.json]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createSim, W as PW, H as PH } from '../sim.mjs';
import { makeWorld } from '../levels.mjs';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const [out, viewsFile] = process.argv.slice(2);
const Wd = makeWorld();
const views = viewsFile ? JSON.parse(fs.readFileSync(viewsFile, 'utf8')) : Wd.stages.map((_, i) => ({ st: i + 1 }));
const tiles = [];
for (const v of views) {
    const s = createSim({ consts: { AUTOSTART: v.st, DETAIL: 2 } });
    s.frame();
    s.poke('maxD', v.md || 5); s.poke('detail', 2);
    if (v.room) { const S = Wd.stages[v.st - 1]; s.poke('pr', Wd.rooms.slice(S.r0, S.r1).find(r => r.name === v.room).idx); }
    if (v.x !== undefined) { s.poke('px', v.x); s.poke('pz', v.z); }
    if (v.y !== undefined) s.poke('py', v.y);
    if (v.yaw !== undefined) s.poke('yaw', v.yaw);
    if (v.pitch !== undefined) s.poke('pitch', v.pitch);
    if (v.psc !== undefined) s.poke('psc', v.psc);
    for (let i = 0; i < 4; i++) s.frame();
    if (v.yaw !== undefined) s.poke('yaw', v.yaw);
    s.frame();
    const buf = await sharp(Buffer.from(s.compose()), { raw: { width: PW, height: PH, channels: 3 } }).resize(480, 270).png().toBuffer();
    tiles.push(buf);
    console.log(v.st, 'fills', s.peek('nFill'), 'rooms', s.peek('nRoomDraw'));
}
const cols = 4, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * 480, height: rows * 270, channels: 3, background: '#000' } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 480, top: Math.floor(i / cols) * 270 }))).png().toFile(out);

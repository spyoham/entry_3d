// node test/zoom.mjs shots/a2.png out.png [left top width height] : a part of a picture, three times as large
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../entry-vibe-coding/package.json', import.meta.url));
const sharp = require('sharp');
const [src, out, l = 0, t = 0, w = 640, h = 360] = process.argv.slice(2);
await sharp(src).extract({ left: +l, top: +t, width: +w, height: +h }).resize(+w * 3, +h * 3, { kernel: 'nearest' }).png().toFile(out);

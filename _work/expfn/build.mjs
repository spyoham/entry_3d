// exp for Entry -> the object file (.eo, the shape playentry exports) and the same object as a project (.ent)
// usage: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import url from 'node:url';
import { B, newId, makeFunction, HERE } from './lib.mjs';
import { expFast, expExact } from './cands.mjs';
import { packEnt } from '../cplot/pack.mjs';
export const VERSION = '1.0';
export const NAME = '엔트리 exp 함수';
const ROOT = path.join(HERE, '..', '..');

// ---- the picture: y = e^x on a dark tile ----
function png(w, h, rgba) {
    const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function picture(S) {
    const px = Buffer.alloc(S * S * 4);
    const put = (x, y, r, g, b, a) => { if (x < 0 || y < 0 || x >= S || y >= S) return; const i = (y * S + x) * 4; const k = a / 255; px[i] = px[i] * (1 - k) + r * k; px[i + 1] = px[i + 1] * (1 - k) + g * k; px[i + 2] = px[i + 2] * (1 - k) + b * k; px[i + 3] = Math.max(px[i + 3], a); };
    const R = S * 0.16;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = Math.max(R - x, x - (S - 1 - R), 0), dy = Math.max(R - y, y - (S - 1 - R), 0);
        const d = Math.hypot(dx, dy) - R;
        if (d < 0.5) put(x, y, 0x1b, 0x22, 0x30, Math.round(255 * Math.min(1, 0.5 - d)));
    }
    const m = S * 0.14, ax = S - 2 * m;
    const dot = (cx, cy, rad, r, g, b) => { for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) { const d = Math.hypot(x - cx, y - cy) - rad; if (d < 0.5) put(x, y, r, g, b, Math.round(255 * Math.min(1, 0.5 - d))); } };
    for (let t = 0; t <= 1; t += 0.5 / S) { dot(m + t * ax, S - m, S * 0.008, 0x5a, 0x66, 0x7a); dot(m + ax * 0.42, m + t * ax, S * 0.008, 0x5a, 0x66, 0x7a); }
    for (let t = 0; t <= 1; t += 0.2 / S) { const x = -2.6 + t * 4.4, y = Math.exp(x) / Math.exp(1.8); dot(m + t * ax, S - m - y * ax, S * 0.022, 0xff, 0xb4, 0x3c); }
    return png(S, S, px);
}

export function build() {
    const fast = makeFunction(expFast()), exact = makeFunction(expExact());
    const functions = [fast.fn, exact.fn];
    const txt = (t) => B('text', [t]);
    const cat = (a, b) => B('combine_something', [null, a, null, b, null]);
    const call = (f) => B(`func_${f.id}`, [B('get_canvas_input_value', [null]), null]);
    // the object's own script: ask for x; the next question carries what the two functions make of it
    // (a plain "say" would be wiped by the next question at once)
    const hat = B('when_run_button_click', [null]);
    hat.x = 40; hat.y = 30;
    const script = [[hat, B('ask_and_wait', [txt('x = ?'), null]), B('repeat_inf', [null, null], [[
        B('ask_and_wait', [cat(cat(cat(cat(txt('exp = '), call(fast)), txt('   exp 정밀 = ')), call(exact)), txt('   다음 x = ?')), null]),
    ]])]];
    const S = 240, buf = picture(S), thumb = picture(96);
    const file = `${NAME} v${VERSION}`;

    // ---- .ent ----
    const ent = path.join(ROOT, file + '.ent');
    packEnt(ent, { name: file, tmpDir: path.join(HERE, '.pack'), variables: [], functions, speed: 60,
        objects: [{ id: 'expf', name: 'exp 함수', pictures: [{ id: 'pic1', name: 'exp', buf, w: S, h: S }], script, entity: { scaleX: 0.5, scaleY: 0.5 } }] });

    // ---- .eo: object/object.json, object/aa/bb/image|thumb/<name>.png ----
    const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 32);
    const tmp = path.join(HERE, '.pack');
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const [kind, b] of [['image', buf], ['thumb', thumb]]) {
        const dir = path.join(tmp, 'object', h.slice(0, 2), h.slice(2, 4), kind);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, h + '.png'), b);
    }
    const object = {
        id: newId(), name: 'exp 함수', script: JSON.stringify(script), objectType: 'sprite', rotateMethod: 'free', scene: newId(),
        sprite: { pictures: [{ id: newId(), dimension: { width: S, height: S }, filename: h, name: 'exp', imageType: 'png', fileurl: `temp/${h.slice(0, 2)}/${h.slice(2, 4)}/image/${h}.png` }], sounds: [] },
        lock: false,
        entity: { x: 0, y: 0, regX: S / 2, regY: S / 2, scaleX: 0.5, scaleY: 0.5, rotation: 0, direction: 90, width: S, height: S, font: 'undefinedpx ', visible: true },
    };
    object.selectedPictureId = object.sprite.pictures[0].id;
    fs.writeFileSync(path.join(tmp, 'object', 'object.json'), JSON.stringify({ functions, variables: [], messages: [], tables: [], expansionBlocks: [], aiUtilizeBlocks: [], objects: [object] }));
    cp.execSync('tar -cf out.tar object', { cwd: tmp });
    const eo = path.join(ROOT, file + '.eo');
    fs.writeFileSync(eo, zlib.gzipSync(fs.readFileSync(path.join(tmp, 'out.tar')), { level: 9 }));
    fs.rmSync(tmp, { recursive: true, force: true });
    return { ent, eo, blocks: { exp: fast.count, 'exp 정밀': exact.count } };
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(build(), null, 1));

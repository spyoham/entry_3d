// Joins APNGs of the same size and format one after another, the frame data copied as it is (no
// re-encoding): node join-apng.mjs out.png a.png b.png ...
import fs from 'node:fs';
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const L = Buffer.alloc(4); L.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]); const C = Buffer.alloc(4); C.writeUInt32BE(crc(td)); return Buffer.concat([L, td, C]); };
const read = (f) => { const b = fs.readFileSync(f), out = []; let o = 8; while (o < b.length) { const len = b.readUInt32BE(o); out.push({ t: b.toString('latin1', o + 4, o + 8), d: b.subarray(o + 8, o + 8 + len) }); o += 12 + len; } return out; };
const [outF, ...ins] = process.argv.slice(2);
const files = ins.map(read);
const ihdr = files[0].find(c => c.t === 'IHDR').d;
for (const [i, f] of files.entries()) if (!f.find(c => c.t === 'IHDR').d.equals(ihdr)) throw new Error('not the same size / format: ' + ins[i]);
const plays = files[0].find(c => c.t === 'acTL').d.readUInt32BE(4);
let seq = 0, frames = 0; const body = [];
files.forEach((f, fi) => {
  let first = true;
  for (const c of f) {
    if (c.t === 'fcTL') {
      const d = Buffer.from(c.d); d.writeUInt32BE(seq++, 0);
      // (each file's first frame replaces the whole picture)
      if (first && fi > 0) { if (d.readUInt32BE(4) !== ihdr.readUInt32BE(0) || d.readUInt32BE(8) !== ihdr.readUInt32BE(4)) throw new Error('first frame not full: ' + ins[fi]); d[25] = 0; }
      first = false; frames++; body.push(chunk('fcTL', d));
    }
    if (c.t === 'IDAT') { if (fi === 0) body.push(chunk('IDAT', c.d)); else { const s = Buffer.alloc(4); s.writeUInt32BE(seq++); body.push(chunk('fdAT', Buffer.concat([s, c.d]))); } }
    if (c.t === 'fdAT') { const d = Buffer.from(c.d); d.writeUInt32BE(seq++, 0); body.push(chunk('fdAT', d)); }
  }
});
const actl = Buffer.alloc(8); actl.writeUInt32BE(frames, 0); actl.writeUInt32BE(plays, 4);
const out = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('acTL', actl), ...body, chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(outF, out);
console.log(outF, frames, 'frames', out.length, 'bytes');

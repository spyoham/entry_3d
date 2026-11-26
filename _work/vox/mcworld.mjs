// (v3.5, 11-26) Reading a world save of the genre's Java edition (the Anvil format): level.dat, region/r.X.Z.mca.
// Only what a map needs to be moved into Block World (mc2bw.mjs): every block's name and state, the block
// entities (signs, containers, comparators). Nothing of the save is run - it is data read byte by byte.
//   chunks after the flattening (1.13 .. 1.17: Level.Sections[].Palette + BlockStates; 1.18 on:
//   sections[].block_states.palette + data); the indices are packed across longs before 1.16 (DataVersion
//   < 2529) and whole in each long from then on.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------------------------------------------------------------- NBT (big-endian)
export function nbtParse(buf) {
  let p = 0;
  const str = () => { const n = buf.readUInt16BE(p); p += 2; const s = buf.toString('utf8', p, p + n); p += n; return s; };
  const payload = (t) => {
    switch (t) {
      case 1: return buf.readInt8(p++);
      case 2: { const v = buf.readInt16BE(p); p += 2; return v; }
      case 3: { const v = buf.readInt32BE(p); p += 4; return v; }
      case 4: { const v = buf.readBigInt64BE(p); p += 8; return v; }
      case 5: { const v = buf.readFloatBE(p); p += 4; return v; }
      case 6: { const v = buf.readDoubleBE(p); p += 8; return v; }
      case 7: { const n = buf.readInt32BE(p); p += 4; const v = buf.subarray(p, p + n); p += n; return v; }
      case 8: return str();
      case 9: { const et = buf[p++]; const n = buf.readInt32BE(p); p += 4; const a = new Array(Math.max(0, n)); for (let i = 0; i < n; i++) a[i] = payload(et); return a; }
      case 10: { const o = {}; for (;;) { const tt = buf[p++]; if (tt === 0) break; const k = str(); o[k] = payload(tt); } return o; }
      case 11: { const n = buf.readInt32BE(p); p += 4; const a = new Int32Array(n); for (let i = 0; i < n; i++) { a[i] = buf.readInt32BE(p); p += 4; } return a; }
      case 12: { const n = buf.readInt32BE(p); p += 4; const a = new BigUint64Array(n); for (let i = 0; i < n; i++) { a[i] = buf.readBigUInt64BE(p); p += 8; } return a; }
      default: throw new Error('NBT: tag ' + t + ' at ' + p);
    }
  };
  const t = buf[p++];
  if (t !== 10) throw new Error('NBT: the root is not a compound');
  str();
  return payload(10);
}
export function readLevel(dir) {
  return nbtParse(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'level.dat')))).Data;
}

// ---------------------------------------------------------------- regions and chunks
// the chunks of one region file: [{ cx, cz, nbt }]
export function readRegion(file) {
  const buf = fs.readFileSync(file), out = [];
  if (buf.length < 8192) return out;
  for (let i = 0; i < 1024; i++) {
    const off = buf.readUIntBE(i * 4, 3), cnt = buf[i * 4 + 3];
    if (off === 0 || cnt === 0) continue;
    const at = off * 4096;
    if (at + 5 > buf.length) continue;
    const len = buf.readUInt32BE(at), comp = buf[at + 4];
    if (len < 1 || at + 4 + len > buf.length) continue;
    const raw = buf.subarray(at + 5, at + 4 + len);
    let data;
    if (comp === 1) data = zlib.gunzipSync(raw); else if (comp === 2) data = zlib.inflateSync(raw); else if (comp === 3) data = raw; else continue;
    out.push({ nbt: nbtParse(data) });
  }
  return out;
}
// the indices of a section's 4096 cells (order y, z, x)
function unpack(longs, bits, spanning) {
  const out = new Uint16Array(4096), mask = (1n << BigInt(bits)) - 1n;
  if (spanning) {
    for (let i = 0; i < 4096; i++) {
      const bit = i * bits, li = bit >> 6, sh = BigInt(bit & 63);
      let v = longs[li] >> sh;
      if ((bit & 63) + bits > 64) v |= longs[li + 1] << (64n - sh);
      out[i] = Number(v & mask);
    }
  } else {
    const per = Math.floor(64 / bits);
    for (let i = 0; i < 4096; i++) { const li = Math.floor(i / per), sh = BigInt((i % per) * bits); out[i] = Number((longs[li] >> sh) & mask); }
  }
  return out;
}
// every chunk of the world: cb({ cx, cz, dataVersion, sections: [{ y, palette: [{ name, props }], idx }], blockEntities })
export function eachChunk(dir, cb) {
  const rdir = path.join(dir, 'region');
  for (const f of fs.readdirSync(rdir).sort()) {
    if (!/^r\.-?\d+\.-?\d+\.mca$/.test(f)) continue;
    for (const { nbt } of readRegion(path.join(rdir, f))) {
      const dv = nbt.DataVersion || 0, L = nbt.Level || nbt;
      const secs = L.Sections || L.sections || [];
      const sections = [];
      for (const s of secs) {
        const pal = s.Palette || (s.block_states && s.block_states.palette);
        const data = s.BlockStates || (s.block_states && s.block_states.data);
        if (!pal) continue;
        const palette = pal.map((e) => ({ name: String(e.Name).replace(/^minecraft:/, ''), props: e.Properties || {} }));
        let idx;
        if (!data || data.length === 0) idx = new Uint16Array(4096);
        else { const bits = Math.max(4, Math.ceil(Math.log2(palette.length))); idx = unpack(data, bits, dv < 2529); }
        sections.push({ y: s.Y, palette, idx });
      }
      cb({ cx: L.xPos, cz: L.zPos, dataVersion: dv, sections, blockEntities: L.TileEntities || L.block_entities || [] });
    }
  }
}
// every block that is not air: cb(x, y, z, name, props)
export function eachBlock(dir, cb) {
  eachChunk(dir, (c) => {
    for (const s of c.sections) {
      const air = s.palette.map((e) => e.name === 'air' || e.name === 'cave_air' || e.name === 'void_air');
      if (air.every(Boolean)) continue;
      for (let i = 0; i < 4096; i++) {
        const k = s.idx[i];
        if (air[k]) continue;
        const e = s.palette[k];
        cb(c.cx * 16 + (i & 15), s.y * 16 + (i >> 8), c.cz * 16 + ((i >> 4) & 15), e.name, e.props);
      }
    }
  });
}

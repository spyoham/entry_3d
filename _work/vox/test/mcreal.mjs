// (v3.5, 11-26) The real game - the Java edition's own server, 1.16.5 - run on the calculator's save, a player of
// ours pressing its keys, every block change the server tells written down tick by tick. It is what the plain
// reference of the genre's redstone (test/mcref.mjs) is checked against (test/mcrealcmp.mjs): the calculator's
// multiplying came out wrong in the game and in the reference alike, and the record showed the tick they parted
// from the real thing at (a piston's head not telling its piston).
//   MC_EULA=true node test/mcreal.mjs <folder with server.jar> <save folder> <out.json> "<keys>" [ticks between keys = 30]
//   keys: digits, L (the lever), + - * / (the operations), c (clear), w<n> (wait n ticks), e.g. "c3L5*w400"
// Nothing of the genre's is in this repository: server.jar is Mojang's own file (the address and its hash are in
// their version list, piston-meta.mojang.com; 1.16.5 wants Java 8 - JAVA8=<java.exe>), and running it means
// agreeing to their EULA - MC_EULA=true says the one running this has. The save is the map's maker's.
// The server: offline, on 127.0.0.1 only, a fresh copy of the save every run, a function of a data pack saying
// each tick's number in chat at the tick's start (the block changes told after it and before the next are that
// tick's telling: what the tick before did, and a key pressed between the two). Cells on the move are not told
// to a player (their own game moves them): mcrealcmp leaves them out until they rest.
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const JAVA = process.env.JAVA8 || 'java';
const PORT = 25599, NAME = 'calcbot';
const [RUN, saveDir, outFile, keysArg = 'c3L5*w300', gapArg = '30'] = process.argv.slice(2);
if (!RUN || !saveDir || !outFile || !fs.existsSync(path.join(RUN, 'server.jar'))) { console.log('usage: MC_EULA=true node test/mcreal.mjs <folder with server.jar> <save folder> <out.json> "<keys>" [gap]'); process.exit(1); }
if (process.env.MC_EULA !== 'true') { console.log('The server runs only for one who has agreed to its EULA (https://aka.ms/MinecraftEULA): MC_EULA=true says so.'); process.exit(1); }
const GEN = path.join(RUN, 'generated', 'reports');
const GAP = Number(gapArg);
const BOX = { x0: -72, x1: 70, y0: 60, y1: 115, z0: -9, z1: 102 };
const BOT = [37.5, 85, 1.0];
const log = (...a) => console.log('[' + ((Date.now() - T0) / 1000).toFixed(1) + ']', ...a);
const T0 = Date.now();

// ---------------------------------------------------------------- the block states by their ids
// (the server's own report: java -cp server.jar net.minecraft.data.Main --reports)
if (!fs.existsSync(path.join(GEN, 'blocks.json'))) { const { spawnSync } = await import('node:child_process'); spawnSync(JAVA, ['-cp', 'server.jar', 'net.minecraft.data.Main', '--reports', '--output', 'generated'], { cwd: RUN, stdio: 'ignore' }); }
const blocksJson = JSON.parse(fs.readFileSync(path.join(GEN, 'blocks.json'), 'utf8'));
const STATE = [];
for (const [name, b] of Object.entries(blocksJson)) for (const s of b.states) STATE[s.id] = { n: name.replace(/^minecraft:/, ''), p: s.properties || {} };
const stName = (id) => { const s = STATE[id]; if (!s) return '?' + id; const ks = Object.keys(s.p); return ks.length ? s.n + '[' + ks.map((k) => k + '=' + s.p[k]).join(',') + ']' : s.n; };

// ---------------------------------------------------------------- the server's folder
function copyDir(a, b) { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { const p = path.join(a, e.name), q = path.join(b, e.name); if (e.isDirectory()) copyDir(p, q); else fs.copyFileSync(p, q); } }
function setup() {
  fs.rmSync(path.join(RUN, 'world'), { recursive: true, force: true });
  copyDir(saveDir, path.join(RUN, 'world'));
  fs.writeFileSync(path.join(RUN, 'eula.txt'), 'eula=true\n');
  fs.writeFileSync(path.join(RUN, 'server.properties'), [
    'online-mode=false', 'server-ip=127.0.0.1', 'server-port=' + PORT, 'level-name=world', 'spawn-protection=0',
    'network-compression-threshold=-1', 'view-distance=10', 'gamemode=creative', 'force-gamemode=true', 'difficulty=peaceful',
    'spawn-monsters=false', 'spawn-animals=false', 'spawn-npcs=false', 'generate-structures=false', 'snooper-enabled=false',
    'enable-rcon=false', 'enable-query=false', 'max-tick-time=-1', 'allow-flight=true', 'motd=calc', 'max-players=2', 'enable-command-block=false',
  ].join('\n') + '\n');
  // a function run at the start of every tick turns one block over: each tick's telling has it once
  const dp = path.join(RUN, 'world', 'datapacks', 'tm');
  fs.mkdirSync(path.join(dp, 'data', 'minecraft', 'tags', 'functions'), { recursive: true });
  fs.mkdirSync(path.join(dp, 'data', 'tm', 'functions'), { recursive: true });
  fs.writeFileSync(path.join(dp, 'pack.mcmeta'), JSON.stringify({ pack: { pack_format: 6, description: 'tick mark' } }));
  fs.writeFileSync(path.join(dp, 'data', 'minecraft', 'tags', 'functions', 'tick.json'), JSON.stringify({ values: ['tm:tick'] }));
  // (a line of chat sent at the start of every tick, before that tick tells its block changes)
  fs.writeFileSync(path.join(dp, 'data', 'tm', 'functions', 'tick.mcfunction'), [
    'scoreboard players add #t tm 1',
    'tellraw @a {"score":{"name":"#t","objective":"tm"}}',
  ].join('\n') + '\n');
}

// ---------------------------------------------------------------- bytes
class W {
  constructor() { this.a = []; }
  u8(v) { this.a.push(v & 255); return this; }
  varint(v) { v >>>= 0; do { let b = v & 127; v >>>= 7; if (v) b |= 128; this.a.push(b); } while (v); return this; }
  str(s) { const b = Buffer.from(s, 'utf8'); this.varint(b.length); for (const c of b) this.a.push(c); return this; }
  u16(v) { this.a.push((v >> 8) & 255, v & 255); return this; }
  i64(v) { const b = Buffer.alloc(8); b.writeBigInt64BE(BigInt.asIntN(64, v)); for (const c of b) this.a.push(c); return this; }
  f32(v) { const b = Buffer.alloc(4); b.writeFloatBE(v); for (const c of b) this.a.push(c); return this; }
  bool(v) { this.a.push(v ? 1 : 0); return this; }
  packet() { const body = Buffer.from(this.a), h = new W().varint(body.length); return Buffer.concat([Buffer.from(h.a), body]); }
}
class R {
  constructor(b, p = 0) { this.b = b; this.p = p; }
  u8() { return this.b[this.p++]; }
  varint() { let v = 0, s = 0; for (;;) { const c = this.b[this.p++]; v |= (c & 127) << s; if (!(c & 128)) break; s += 7; } return v; }
  varlong() { let v = 0n, s = 0n; for (;;) { const c = this.b[this.p++]; v |= BigInt(c & 127) << s; if (!(c & 128)) break; s += 7n; } return v; }
  i16() { const v = this.b.readInt16BE(this.p); this.p += 2; return v; }
  i32() { const v = this.b.readInt32BE(this.p); this.p += 4; return v; }
  i64() { const v = this.b.readBigInt64BE(this.p); this.p += 8; return v; }
  u64() { const v = this.b.readBigUInt64BE(this.p); this.p += 8; return v; }
  f64() { const v = this.b.readDoubleBE(this.p); this.p += 8; return v; }
  f32() { const v = this.b.readFloatBE(this.p); this.p += 4; return v; }
  str() { const n = this.varint(); const s = this.b.toString('utf8', this.p, this.p + n); this.p += n; return s; }
  pos() { const v = this.i64(); let x = Number(v >> 38n), y = Number(v & 0xFFFn), z = Number((v >> 12n) & 0x3FFFFFFn); if (x >= 1 << 25) x -= 1 << 26; if (z >= 1 << 25) z -= 1 << 26; if (y >= 2048) y -= 4096; return [x, y, z]; }
  nbtSkip() {
    const b = this.b; const t = b[this.p++]; if (t === 0) return;
    this.p += 2 + b.readUInt16BE(this.p);
    const pay = (t) => {
      switch (t) {
        case 1: this.p += 1; break; case 2: this.p += 2; break; case 3: case 5: this.p += 4; break; case 4: case 6: this.p += 8; break;
        case 7: this.p += 4 + b.readInt32BE(this.p); break;
        case 8: this.p += 2 + b.readUInt16BE(this.p); break;
        case 9: { const et = b[this.p++], n = b.readInt32BE(this.p); this.p += 4; for (let i = 0; i < n; i++) pay(et); break; }
        case 10: for (;;) { const tt = b[this.p++]; if (tt === 0) break; this.p += 2 + b.readUInt16BE(this.p); pay(tt); } break;
        case 11: this.p += 4 + 4 * b.readInt32BE(this.p); break;
        case 12: this.p += 4 + 8 * b.readInt32BE(this.p); break;
        default: throw new Error('nbt tag ' + t);
      }
    };
    pay(t);
  }
}
const posLong = (x, y, z) => ((BigInt(x) & 0x3FFFFFFn) << 38n) | ((BigInt(z) & 0x3FFFFFFn) << 12n) | (BigInt(y) & 0xFFFn);

// ---------------------------------------------------------------- the player of ours
const world = new Map();         // "x,y,z" -> state id (cells of the box only)
const inBox = (x, y, z) => x >= BOX.x0 && x <= BOX.x1 && y >= BOX.y0 && y <= BOX.y1 && z >= BOX.z0 && z <= BOX.z1;
let sock, state = 'login', chunks = 0, lastChunkAt = 0, recording = false, joined = false, posSeen = 0;        // eslint-disable-line no-unused-vars
const bursts = [];               // { t, marks, ch: [[x,y,z,id]], act: [[x,y,z,a,b,blk]] }
let cur = null, lastData = 0, echoes = [], idHist = {};
const presses = [];              // { key, pos, sentAfter }
function onChunk(r) {
  const cx = r.i32(), cz = r.i32(), full = r.u8(), mask = r.varint();
  r.nbtSkip();
  if (full) { const n = r.varint(); for (let i = 0; i < n; i++) r.varint(); }
  r.varint();
  for (let sy = 0; sy < 16; sy++) {
    if (!(mask & (1 << sy))) continue;
    r.i16();
    const bpb = r.u8();
    let pal = null;
    if (bpb <= 8) { const n = r.varint(); pal = new Array(n); for (let i = 0; i < n; i++) pal[i] = r.varint(); }
    const nl = r.varint();
    const bits = bpb <= 8 ? Math.max(4, bpb) : bpb;
    const longs = new Array(nl); for (let i = 0; i < nl; i++) longs[i] = r.u64();
    const per = Math.floor(64 / bits), m = (1n << BigInt(bits)) - 1n;
    for (let i = 0; i < 4096; i++) {
      const x = cx * 16 + (i & 15), y = sy * 16 + (i >> 8), z = cz * 16 + ((i >> 4) & 15);
      if (!inBox(x, y, z)) continue;
      const v = Number((longs[Math.floor(i / per)] >> BigInt((i % per) * bits)) & m);
      const id = pal ? pal[v] : v;
      if (id) world.set(x + ',' + y + ',' + z, id); else world.delete(x + ',' + y + ',' + z);
    }
  }
  chunks++; lastChunkAt = Date.now();
}
function change(x, y, z, id) {
  if (!inBox(x, y, z)) return;
  const k = x + ',' + y + ',' + z;
  if ((world.get(k) || 0) === id) return;
  if (id) world.set(k, id); else world.delete(k);
  if (cur) cur.ch.push([x, y, z, id]);
}
function onPacket(buf) {
  const r = new R(buf), id = r.varint();
  if (state === 'login') {
    if (id === 0x00) { log('login refused:', r.str()); process.exitCode = 1; }
    else if (id === 0x02) { state = 'play'; log('logged in'); }
    else if (id === 0x03) throw new Error('the server asks for compression');
    else if (id === 0x01) throw new Error('the server asks for encryption');
    return;
  }
  idHist[id] = (idHist[id] || 0) + 1;
  switch (id) {
    case 0x1F: { const v = r.i64(); send(new W().varint(0x10).i64(v)); break; }
    case 0x24: joined = true; break;
    case 0x34: { const x = r.f64(), y = r.f64(), z = r.f64(); r.f32(); r.f32(); r.u8(); const tid = r.varint(); send(new W().varint(0x00).varint(tid)); posSeen++; log('placed at', x.toFixed(1), y.toFixed(1), z.toFixed(1)); break; }
    case 0x20: onChunk(r); break;
    case 0x0B: {
      const [x, y, z] = r.pos(), sid = r.varint();
      const e = echoes.findIndex((q) => q[0] === x && q[1] === y && q[2] === z);
      if (e >= 0) { echoes.splice(e, 1); break; }       // (the answer to our own click, not a tick's telling)
      change(x, y, z, sid); break;
    }
    case 0x3B: {
      const sp = r.i64(); let sx = Number(sp >> 42n), sz = Number(BigInt.asIntN(22, sp >> 20n)), sy = Number(BigInt.asIntN(20, sp));
      r.u8(); const n = r.varint();
      for (let i = 0; i < n; i++) { const v = r.varlong(); const sid = Number(v >> 12n), l = Number(v & 0xFFFn); change(sx * 16 + ((l >> 8) & 15), sy * 16 + (l & 15), sz * 16 + ((l >> 4) & 15), sid); }
      break;
    }
    case 0x0A: { const [x, y, z] = r.pos(), a = r.u8(), b = r.u8(), blk = r.varint(); if (cur && inBox(x, y, z)) cur.act.push([x, y, z, a, b, blk]); break; }
    case 0x0E: { const t = r.str(); const m = /^\{"text":"(\d+)"\}$/.exec(t); if (m) { if (recording) { cur = { tick: +m[1], ch: [], act: [] }; bursts.push(cur); } else cur = null; } else log('chat', t.slice(0, 200)); break; }
    case 0x19: log('disconnected by the server:', r.str()); break;
    default: break;
  }
}
function send(w) { sock.write(w.packet()); }
function connect() {
  return new Promise((res, rej) => {
    sock = net.connect(PORT, '127.0.0.1');
    sock.setNoDelay(true);
    let acc = Buffer.alloc(0);
    sock.on('connect', () => {
      send(new W().varint(0x00).varint(754).str('127.0.0.1').u16(PORT).varint(2));
      send(new W().varint(0x00).str(NAME));
      res();
    });
    sock.on('data', (d) => {
      acc = acc.length ? Buffer.concat([acc, d]) : d;
      for (;;) {
        // (a whole packet?)
        let len = 0, s = 0, p = 0, ok = false;
        while (p < acc.length) { const c = acc[p++]; len |= (c & 127) << s; if (!(c & 128)) { ok = true; break; } s += 7; }
        if (!ok || acc.length < p + len) break;
        const body = acc.subarray(p, p + len);
        acc = acc.subarray(p + len);
        try { onPacket(body); } catch (e) { log('packet error', e.message, 'id', body[0].toString(16), 'len', body.length); }
      }
    });
    sock.on('error', (e) => { log('socket error', e.message); rej(e); });
    sock.on('close', () => log('socket closed'));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// wait until n more ticks have been told (bursts with a mark)
async function ticks(n) { const want = bursts.length + n; while (bursts.length < want) await sleep(5); }
async function afterBurst() { const n = bursts.length; while (bursts.length === n) await sleep(1); await sleep(18); }
const KEYS = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5], L: [85, 2], c: [85, 1], '+': [85, -1], '-': [85, -2], '*': [85, -3], '/': [85, -4] };
async function click(key) {
  const [y, z] = KEYS[key], x = 33;
  await afterBurst();
  echoes.push([x, y, z], [x + 1, y, z]);
  presses.push({ key, pos: [x, y, z], sentAfter: bursts.length - 1 });
  // use the block's east face (5), in the middle of it, with the main hand
  send(new W().varint(0x2E).varint(0).i64(posLong(x, y, z)).varint(5).f32(1.0).f32(0.5).f32(0.5).bool(false));
}

// ---------------------------------------------------------------- the run
setup();
log('starting the server');
const srv = spawn(JAVA, ['-Xmx2G', '-Xms1G', '-jar', 'server.jar', 'nogui'], { cwd: RUN, stdio: ['pipe', 'pipe', 'pipe'] });
let srvLog = '', done = false;
const cmd = (s) => srv.stdin.write(s + '\n');
srv.stdout.on('data', (d) => { const t = d.toString(); srvLog += t; if (/Done \(/.test(t)) done = true; if (/WARN|ERROR|Can't keep up|lost connection|logged in/.test(t)) process.stdout.write('   srv: ' + t.split('\n').filter((l) => /WARN|ERROR|Can't keep up|lost connection|logged in/.test(l)).map((l) => l.slice(0, 220)).join('\n   srv: ') + '\n'); });
srv.stderr.on('data', (d) => { srvLog += d.toString(); });
const srvExit = new Promise((r) => srv.on('exit', r));
try {
  for (let i = 0; i < 1200 && !done; i++) await sleep(100);
  if (!done) throw new Error('the server did not start');
  log('server up');
  cmd('gamerule randomTickSpeed 0'); cmd('gamerule doMobSpawning false'); cmd('scoreboard objectives add tm dummy');
  await connect();
  for (let i = 0; i < 200 && !posSeen; i++) await sleep(50);
  cmd(`tp ${NAME} ${BOT[0]} ${BOT[1]} ${BOT[2]}`);
  await sleep(1000);
  // (all the chunks round us)
  for (let i = 0; i < 600; i++) { await sleep(100); if (chunks > 300 && Date.now() - lastChunkAt > 2500) break; }
  log('chunks', chunks, 'cells of the box', world.size);
  const initSnapshot = [...world].map(([k, id]) => [k, id]);
  recording = true;
  await sleep(500);
  await ticks(60);
  const base = bursts.length;
  log('recording; bursts before the keys', base);
  for (let i = 0; i < keysArg.length; i++) {
    const c = keysArg[i];
    if (c === 'w') { let n = ''; while (/\d/.test(keysArg[i + 1] || '')) n += keysArg[++i]; await ticks(Number(n)); continue; }
    if (!(c in KEYS)) throw new Error('no key ' + c);
    await click(c);
    log('key', c, 'after burst', bursts.length - 1);
    await ticks(GAP);
  }
  recording = false;
  let bad = 0; for (let i = 1; i < bursts.length; i++) if (bursts[i].tick !== bursts[i - 1].tick + 1) bad++;
  log('bursts', bursts.length, 'ticks out of step:', bad, '| packet ids', Object.entries(idHist).map(([k, v]) => (+k).toString(16) + ':' + v).join(' '));
  // the states as text, once each
  const names = {}; const use = (id) => { if (!(id in names)) names[id] = stName(id); };
  for (const [, id] of initSnapshot) use(id);
  for (const b of bursts) for (const c of b.ch) use(c[3]);
  fs.writeFileSync(outFile, JSON.stringify({ keys: keysArg, gap: GAP, box: BOX, names, init: initSnapshot, base, presses, bursts: bursts.map((b) => ({ tick: b.tick, ch: b.ch, act: b.act })) }));
  log('written', outFile);
} catch (e) { log('FAILED', e.stack || e.message); process.exitCode = 1; }
cmd('stop');
await Promise.race([srvExit, sleep(20000)]);
try { srv.kill(); } catch (e) { /* gone */ }
fs.writeFileSync(path.join(RUN, 'last_server.log'), srvLog);
log('server stopped');
if (sock) sock.destroy();

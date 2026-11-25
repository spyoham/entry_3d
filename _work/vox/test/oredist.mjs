// (v3.5) where the ores lie: a count by height of the chunks made round the start.   node test/oredist.mjs [seed]
import { createSim } from '../sim.mjs';
const WY = 256, WS = 160;
const seed = +(process.argv[2] || 2024);
const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3 } });
let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; }
s.poke('gameMode', 1); s.poke('flying', 1); s.poke('grMobs', 0);
for (let i = 0; i < 400; i++) s.frame();
const KEY = s.peek('ITKEY'), W = s.peek('W'), BIOM = s.peek('BIOM'), BN = s.peek('BNAMES');
const px = Math.floor(s.peek('px')), pz = Math.floor(s.peek('pz'));
const ok = (x, z) => s.as('pen', () => s.fn.cOK(x, z)) === 1;
const wcol = (x, z) => (((x % WS) + WS) % WS) * WS + (((z % WS) + WS) % WS);
const ORE = ['coal_ore', 'iron_ore', 'gold_ore', 'spark_ore', 'diamond_ore', 'lapis_ore', 'jade_ore'];
const want = { coal_ore: [1, 127], iron_ore: [1, 63], gold_ore: [1, 31], spark_ore: [1, 15], diamond_ore: [1, 15], lapis_ore: [0, 30], jade_ore: [4, 31] };
const st = {}; for (const k of ORE) st[k] = { n: 0, lo: 999, hi: -1, band: Array(8).fill(0), open: 0 };
let cols = 0; const bio = {};
for (let x = px - 64; x <= px + 64; x++) for (let z = pz - 64; z <= pz + 64; z++) {
  if (!ok(x, z)) continue; cols++;
  const ci = wcol(x, z), b0 = ci * WY; bio[BN[BIOM[ci]]] = (bio[BN[BIOM[ci]]] || 0) + 1;
  for (let y = 1; y < 140; y++) {
    const k = KEY[W[b0 + y]]; const o = st[k]; if (!o) continue;
    o.n++; o.lo = Math.min(o.lo, y); o.hi = Math.max(o.hi, y); o.band[Math.min(7, y >> 4)]++;
    // (seen from a cave: a cell of air or lava beside it)
    const nb = [b0 + y + 1, b0 + y - 1, wcol(x + 1, z) * WY + y, wcol(x - 1, z) * WY + y, wcol(x, z + 1) * WY + y, wcol(x, z - 1) * WY + y];
    if (nb.some((i) => W[i] === 0 || KEY[W[i]] === 'lava')) o.open++;
  }
}
const ch = cols / 256; let fails = 0;
console.log(`seed ${seed}: ${cols} columns (${ch.toFixed(0)} chunks), biomes ${JSON.stringify(bio)}`);
console.log('ore           a chunk   lowest..highest   by height 0-15 16-31 32-47 48-63 64-79 80-95 96-111 112+   open to a cave');
for (const k of ORE) {
  const o = st[k]; if (!o.n) { console.log(k.padEnd(12), 'none here'); continue; }
  // (a vein begins inside its heights and reaches up to three blocks out of them, as the genre's)
  const [lo, hi] = want[k], inR = o.lo >= lo && o.hi <= hi + 3;
  if (!inR) fails++;
  console.log(k.padEnd(12), (o.n / ch).toFixed(1).padStart(7), `   ${String(o.lo).padStart(3)}..${String(o.hi).padEnd(3)} ${inR ? 'ok  ' : 'OUT '}`, '   ', o.band.map((v) => (v / ch).toFixed(1).padStart(5)).join(' '), '   ', (o.open / o.n * 100).toFixed(0) + ' %');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

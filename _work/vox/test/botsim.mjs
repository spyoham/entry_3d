// the bot in the simulator: node test/botsim.mjs [seed] [maxMinutes]
let __rs = 12345; Math.random = () => { __rs = (__rs * 48271) % 2147483647; return __rs / 2147483647; };
import { createSim } from '../sim.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { makeBot } = require('./bot.js');
const seed = Number(process.argv[2] || 1234), maxMin = Number(process.argv[3] || 30);
const s = createSim({ consts: { AUTOSEED: seed, TESTRUN: 1 } });
let cache = {}, cacheT = -1;
const io = {
  get: (n) => s.peek(n), set: (n, v) => s.poke(n, v),
  list: (n, i) => { if (cacheT !== s.time) { cache = {}; cacheT = s.time; } const A = cache[n] || (cache[n] = s.peek(n)); return A[i - 1]; },
  key: (c, d) => { if (d) s.keys.add(c); else s.keys.delete(c); },
  mouseDown: (b) => { s.mouse.down = b; }, mouse: (x, y) => { s.mouse.x = x; s.mouse.y = y; }, click: () => s.click(),
  log: (t) => console.log(t), frames: () => s.peek('frames'), dbg: !!process.env.DBG,
};
const bot = makeBot(io);
const t0 = Date.now();
let i = 0;
for (; i < maxMin * 3600; i++) {
  try { bot.step(); s.frame(); } catch (e) { console.log('ERROR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); break; }
  if (s.peek('botDone') === 1) break;
  if (s.peek('dead') === 1) { console.log('DIED:', s.peek('deathMsg'), 'at', i / 60); break; }
  if (i % 3600 === 0 && i) console.log(`-- ${i / 3600} min: hp ${s.peek('hp')} food ${s.peek('food')} dim ${s.peek('dim')} pos ${s.peek('px').toFixed(0)},${s.peek('py').toFixed(0)},${s.peek('pz').toFixed(0)}`);
}
console.log(`end at ${(i / 60).toFixed(0)} s game time, ${((Date.now() - t0) / 1000).toFixed(0)} s real; inv`, s.peek('INVI').map((id, k) => id ? `${id}x${s.peek('INVN')[k]}` : '').filter(Boolean).join(' '));
await s.png('test/botend.png');

// (v3.4) the mobs a server keeps (src/netkeep.js): the example map pasted into a new server has its
// village folk and animals; they are there for a second player, after everybody left, after a tab closed;
// a killed one stays dead; an animal a player made is kept, far away it sleeps: node test/srvmobs.mjs
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 80)) / 1000;
const WALL0 = Date.UTC(2026, 10, 9, 3, 0, 0);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

class Server {
  constructor() { this.vars = {}; this.lists = {}; this.t = 0; this.q = []; this.k = 0; this.clients = []; this.msgs = 0; this.bytes = 0; }
  at(t, f) { this.q.push({ t, f, k: this.k++ }); }
  step(dt) { this.t += dt; this.q.sort((a, b) => a.t - b.t || a.k - b.k); while (this.q.length && this.q[0].t <= this.t) this.q.shift().f(); }
}
class Client {
  constructor(srv, nick, welcome = 0.5) {
    this.srv = srv; this.nick = nick; this.on = true; this.pend = new Map();
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 2 } });
    this.sim.R.nick = nick;
    this.sim.R.syNet = this;
    this.sim.R.wallNow = () => WALL0 + srv.t * 1000;
    this.starting = true;
    srv.clients.push(this);
    srv.at(srv.t + 0.05, () => { this.sim.R.syLocal.SY_ = 1; });
    srv.at(srv.t + welcome, () => {
      for (const [n, v] of Object.entries(srv.vars)) this.sim.R.syLocal[n] = v;
      for (const [n, a] of Object.entries(srv.lists)) this.applyList(n, a);
      this.starting = false;
    });
    srv.at(srv.t + 4, () => { this.starting = false; });
  }
  applyList(n, a) { const L = this.sim.R.syLists[n]; if (L) L.splice(0, L.length, ...a); }
  send(f, size) {
    if (this.starting || !this.on) return;
    const s = this.srv;
    this.up = Math.max(s.t + LAT, (this.up || 0) + 1e-6);
    s.at(this.up, () => { f(s); s.msgs++; s.bytes += size; });
  }
  relay(apply) {
    const s = this.srv;
    for (const c of s.clients) if (c !== this && c.on) { c.down = Math.max(s.t + LAT, (c.down || 0) + 1e-6); s.at(c.down, () => apply(c)); }
  }
  // (the extension sends a list once a tick, its last state)
  changed(n, a) { this.pend.set(n, a); }
  flush() { for (const [n, a] of this.pend) this.send((s) => { s.lists[n] = a; this.relay((c) => c.applyList(n, a)); }, JSON.stringify(a).length); this.pend.clear(); }
  varChanged(n, v) { this.send((s) => { s.vars[n] = v; this.relay((c) => { c.sim.R.syLocal[n] = v; }); }, String(v).length); }
  g(e) { return this.sim.peek(e); }
  call(f) { return this.sim.as('pen', () => f(this.sim.fn)); }
  frame() { try { this.sim.frame(); } catch (e) { console.log('ERR', this.nick, e.message, e.stack.split('\n').slice(1, 5).join(' | ')); process.exit(1); } this.flush(); }
}
const srv = new Server();
const cs = [];
const run = (secs, until) => {
  for (let f = 0; f < Math.round(secs * 60); f++) {
    for (const c of cs) if (c.on && !c.frozen) c.frame();
    srv.step(1 / 60);
    if (until && until()) return true;
  }
  return false;
};
const close = (c) => { c.on = false; cs.splice(cs.indexOf(c), 1); srv.clients.splice(srv.clients.indexOf(c), 1); };
const open = (nick) => { const c = new Client(srv, nick); cs.push(c); run(1); c.call((fn) => { fn.netEnter(); fn.menuGo(4); }); run(6); return c; };
const find = (c, name) => { const n = c.g('NSRV'); for (let k = 1; k <= n; k++) if (c.call((fn) => fn.srvHas(k)) === 1 && String(c.g('shName')) === name) return k; return 0; };
const join = (c, name) => { const k = find(c, name); const e = c.call((fn) => fn.netJoinCheck(k)); if (String(e).length > 1) console.log('   join', c.nick, k, e); c.call((fn) => fn.serverJoin(k)); return run(60, () => c.g('gState') === 2) && run(2) !== null; };
const cmd = (c, t) => { c.call((fn) => { c.sim.poke('netUserAct', 1); fn.runCommand(t); c.sim.poke('netUserAct', 0); }); return String(c.g('CHT').slice(-1)[0]); };
const count = (c, item) => { const id = c.g('ITKEY').indexOf(item), I = c.g('INVI'), N = c.g('INVN'); let n = 0; for (let i = 0; i < I.length; i++) if (+I[i] === id) n += +N[i]; return n; };
const put = (c, x, y, z, b) => c.call((fn) => { c.sim.poke('netUserAct', 1); c.sim.poke('logOn', 1); fn.setBlock(x, y, z, b); c.sim.poke('logOn', 0); c.sim.poke('netUserAct', 0); });
const blockSeen = (c, x, y, z) => c.call((fn) => fn.blockAt(x, y, z));
const where = (c) => [c.g('px'), c.g('py'), c.g('pz')].map((v) => Math.round(v * 10) / 10);
const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]) < 3;

const chats = (c) => c.g('CHT').map(String);


import fs from 'node:fs';
const text = fs.readFileSync(new URL('../../../example_map.txt', import.meta.url), 'utf8');
const leave = (c) => { c.call((fn) => { fn.netLeave(); c.sim.poke('gState', 0); fn.menuGo(4); }); run(2); };
const MK = () => A.g('MKEY');
const kind = (c, name) => c.g('MKEY').indexOf(name) + 1;
// the mobs of a kind on a screen: [index, mine?]
const mobs = (c, name) => { const t = kind(c, name), ET = c.g('ET'), ERK = c.g('ERK'), r = []; ET.forEach((v, i) => { if (+v === t) r.push({ i, mine: +ERK[i] === 0, x: +c.g('EX')[i], y: +c.g('EY')[i], z: +c.g('EZ')[i], v: +c.g('EVAR')[i], u: +ERK[i] === 0 ? +c.g('EUID')[i] : +c.g('ERU')[i] }); }); return r; };
const jobs = (c) => mobs(c, 'villager').map((m) => Math.floor(m.v / 2) % 16).filter((j) => j > 0).sort((a, b) => a - b).join(',');
const klines = (k) => (srv.lists[`SY_m${k}`] || []).filter((l) => String(l).startsWith('K^'));
const recN = (c) => c.g('MKU').length;

// ---------------------------------------------------------------- 1. the example map into a new server
const A = open('alice');
A.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.menuGo(5)); run(0.2);
A.sim.poke('$CLIPBOARD', text); run(0.2);
ok(A.g('mpOn') === 1, `the new-server screen took the example map (${A.g('MPK').length / 11} kept mobs in it)`);
const inText = A.g('MPK').length / 11;
A.sim.poke('esName', '공장'); A.sim.poke('esMotd', ' '); A.sim.poke('esMode', 1); A.sim.poke('esEdit', 0);
A.call((fn) => fn.serverSave()); run(1.5);
const K = find(A, '공장');
ok(K > 0 && klines(K).length === inText, `the server is made, its settings hold ${klines(K).length} kept mobs`);
ok(join(A, '공장'), 'alice in');
cmd(A, '/gamerule doMobSpawning false'); cmd(A, '/tp @s 27.5 58 38.5'); run(8);
{ const v = mobs(A, 'villager'); ok(v.length === 10 && v.every((m) => m.mine), `alice has the ten villagers near her (the hall's eight, the breeders; the iron farm's three are 44 blocks off) (${v.length}), all hers`); }
const jobs0 = jobs(A);
ok(jobs0.split(',').length === 8, `eight of them with their professions: ${jobs0}`);
ok(mobs(A, 'chicken').length === 3 && mobs(A, 'cow').length === 2 && mobs(A, 'sheep').length === 2 && mobs(A, 'pig').length === 2, `the chickens of the egg farm and the animals of the pens: ${mobs(A, 'chicken').length} ${mobs(A, 'cow').length} ${mobs(A, 'sheep').length} ${mobs(A, 'pig').length}`);

// ---------------------------------------------------------------- 2. a second player
const B = open('bob');
ok(join(B, '공장'), 'bob comes');
cmd(A, '/tp bob 29.5 58 38.5'); run(8);
{ const v = mobs(B, 'villager'); ok(v.length === 10 && v.every((m) => !m.mine), `bob sees the same ten, none made twice (${v.length}, his own: ${v.filter((m) => m.mine).length})`); }
ok(mobs(A, 'villager').length === 10, `alice still has ten (${mobs(A, 'villager').length})`);

// ---------------------------------------------------------------- 3. alice leaves: they stay with bob
leave(A); run(6);
{ const v = mobs(B, 'villager'); ok(v.length === 10 && v.every((m) => m.mine) && jobs(B) === jobs0, `alice gone: bob has the ten now, with the same professions (${v.length}, ${jobs(B)})`); }
ok(new Set(mobs(B, 'villager').map((m) => m.u)).size === 10, 'each one once');

// ---------------------------------------------------------------- 4. a trade changes one: the record follows
const v1 = mobs(B, 'villager').find((m) => Math.floor(m.v / 2) % 16 > 0);
B.g('EVAR')[v1.i] = v1.v + 2 * 16 * 8;  // (traded once)
run(3);
{ const l = klines(K).find((x) => String(x).startsWith(`K^${v1.u}^`)); ok(!!l && String(l).includes(`,${v1.v + 256},`), `a villager traded with: the server's record has it (${String(l).slice(0, 60)}...)`); }

// ---------------------------------------------------------------- 5. one is killed: gone for good
const v2 = mobs(B, 'villager').find((m) => m.u !== v1.u);
B.call((fn) => { B.sim.poke('pKill', 1); fn.mobHurt(v2.i + 1, 99, 0, 0); B.sim.poke('pKill', 0); }); run(6);
ok(mobs(B, 'villager').length === 9 && !klines(K).some((x) => String(x).startsWith(`K^${v2.u}^`)), `a villager killed: nine left, out of the record (${mobs(B, 'villager').length})`);
run(6);
ok(mobs(B, 'villager').length === 9, 'and it does not come back');

// ---------------------------------------------------------------- 6. everybody leaves; the server played again
leave(B); run(3);
const vk0 = kind(B, 'villager'), recV = () => klines(K).filter((x) => String(x).split('^')[5].startsWith(`${vk0},`)).length;
ok(recV() === 12 && klines(K).length >= inText - 3, `nobody on the server: its record holds ${klines(K).length} mobs, 12 villagers`);
const A2 = open('alice');
ok(join(A2, '공장'), 'alice again');
cmd(A2, '/gamerule doMobSpawning false'); cmd(A2, '/tp @s 27.5 58 38.5'); run(9);
{ const v = mobs(A2, 'villager'); ok(v.length === 9 && v.some((m) => m.u === v1.u && m.v === v1.v + 256), `the nine are back, the one traded with as it was (${v.length})`); }

// ---------------------------------------------------------------- 7. an animal made by a player; far away it sleeps
const cowsB = new Set(mobs(A2, 'cow').map((m) => m.u));
cmd(A2, '/summon cow 27.5 58 40.5'); run(3);
const cows0 = mobs(A2, 'cow').length;
// (the one that was not there before: it walks off at once)
const cu = mobs(A2, 'cow').find((m) => !cowsB.has(m.u));
ok(!!cu && cu.u >= 2000000000 && klines(K).some((x) => String(x).startsWith(`K^${cu.u}^`)), `a cow summoned is in the record (number ${cu && cu.u})`);
cmd(A2, '/tp @s 127.5 90 38.5'); A2.sim.poke('flying', 1); run(6);
ok(mobs(A2, 'villager').length === 0 && mobs(A2, 'cow').every((m) => m.u !== cu.u) && recV() === 12 && klines(K).some((x) => String(x).startsWith(`K^${cu.u}^`)), `100 blocks away: none alive here, the 12 villagers and the cow in the record (${klines(K).length} mobs)`);
cmd(A2, '/tp @s 27.5 58 38.5'); A2.sim.poke('flying', 0); run(9);
ok(mobs(A2, 'villager').length === 9 && mobs(A2, 'cow').some((m) => m.u === cu.u) && mobs(A2, 'cow').length === cows0, `back: the nine villagers and the cow woke, none twice (${mobs(A2, 'villager').length}, cows ${mobs(A2, 'cow').length}/${cows0})`);

// ---------------------------------------------------------------- 8. the tab closed without a word
A2.g('EVAR')[mobs(A2, 'villager').find((m) => m.u === v1.u).i] = v1.v + 512; run(2.5);
close(A2); run(12);
const A3 = open('alice');
ok(join(A3, '공장'), 'alice once more, after her tab closed');
cmd(A3, '/gamerule doMobSpawning false'); cmd(A3, '/tp @s 27.5 58 38.5'); run(9);
{ const v = mobs(A3, 'villager'); ok(v.length === 9 && v.some((m) => m.u === v1.u && m.v === v1.v + 512) && mobs(A3, 'cow').some((m) => m.u === cu.u), `everything is there as it was a moment before (${v.length} villagers)`); }

// ---------------------------------------------------------------- 9. the owner copies the server: its mobs are in the text
A3.call((fn) => fn.mapCopy());
{ const t2 = String(A3.g('$CLIPBOARD')), p = t2.split('|'); const km = p[9].split(';').filter((x) => x.length > 2); const vk = kind(A3, 'villager');
  ok(p.length === 11 && km.length === klines(K).length && km.filter((x) => x.startsWith(`${vk},`)).length === 12 && km.every((x) => x.split(',').length === 11), `the server's map has its ${km.length} kept mobs, 12 villagers`); }
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

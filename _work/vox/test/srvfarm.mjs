// (v3.4, 11-21) the iron farm and the mob tower of the example map on a SERVER made from its text: what standing by
// them gives, in survival and in creative; after everybody left the zombie is in its cart again.
// MIN=5 node test/srvfarm.mjs
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
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3 } });
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

const MIN = +(process.env.MIN || 5);
const A = open('alice');
A.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.menuGo(5)); run(0.2);
A.sim.poke('$CLIPBOARD', text); run(0.2);
A.sim.poke('esName', '공장'); A.sim.poke('esMotd', ' '); A.sim.poke('esMode', 0); A.sim.poke('esEdit', 0);
A.call((fn) => fn.serverSave()); run(1.5);
const K = find(A, '공장');
ok(K > 0 && join(A, '공장'), 'alice made a server from the example map and is in it (the host)');
const KEY = A.g('ITKEY');
const chest = (c, x, y, z) => { c.call((fn) => fn.chestFind(x, y, z)); const f = c.g('cFound'), r = {}; if (f) for (let i = 0; i < 27; i++) { const q = +c.g('CHI')[(f - 1) * 27 + i]; if (q > 0) r[KEY[q]] = (r[KEY[q]] || 0) + +c.g('CHN')[(f - 1) * 27 + i]; } return r; };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const stand = (c, x, y, z) => { c.sim.poke('px', x + 0.5); c.sim.poke('py', y); c.sim.poke('pz', z + 0.5); c.sim.poke('pvy', 0); c.sim.poke('fallTop', y); c.sim.poke('hp', 20); c.sim.poke('food', 20); };
const wait = (c, x, y, z, secs) => { for (let i = 0; i < secs; i++) { stand(c, x, y, z); run(1); } };
const tower = (c) => { const all = {}; for (let z = 42; z <= 47; z++) { const a = chest(c, 51, 91, z); for (const k in a) all[k] = (all[k] || 0) + a[k]; } return all; };
const zomb = (c) => mobs(c, 'zombie').filter((m) => +c.g('EOWN')[m.i] === 5);
cmd(A, '/gamerule doDaylightCycle false'); cmd(A, '/time set day');
// the iron farm
wait(A, 68, 91, 25, 12);
{ const z = zomb(A); ok(z.length === 1 && +A.g('EAIR')[z[0].i] >= 1000, `the zombie of the map woke and sits in its cart (${z.length}, seat ${z.length ? A.g('EAIR')[z[0].i] : '-'})`); }
const i0 = sum(chest(A, 68, 91, 21));
wait(A, 68, 91, 25, MIN * 60);
{ const got = chest(A, 68, 91, 21); ok((got.iron_ingot || 0) >= 3 * MIN, `the iron farm, ${MIN} minutes: ${JSON.stringify(got)} - ${Math.round((sum(got) - i0) * 60 / MIN)} things an hour`); }
// the tower, in survival
cmd(A, '/time set midnight'); A.sim.poke('difficulty', 2);
const t0 = sum(tower(A));
for (let i = 0; i < MIN * 60; i++) { stand(A, 52, 136, 16); run(1); if (process.env.DBG && i % 20 === 19) { const ET = A.g('ET'), MH = A.g('MHOST'), MKY = A.g('MKEY'); const r = []; ET.forEach((t, k) => { if (+t > 0 && +MH[+t - 1] === 1) r.push(MKY[+t - 1].slice(0, 3) + '@' + Math.round(+A.g('EX')[k]) + ',' + Math.round(+A.g('EY')[k]) + ',' + Math.round(+A.g('EZ')[k]) + (+A.g('ERK')[k] > 0 ? 'R' : '') + (+A.g('EOWN')[k] ? 'o' + A.g('EOWN')[k] : '')); }); console.log('   ', i + 1, 's hostile', A.g('nHostile'), 'grMobs', A.g('grMobs'), 'diff', A.g('difficulty'), 'mode', A.g('gameMode'), 'dark', A.g('dark'), r.join(' ')); } }
const t1 = sum(tower(A));
ok(t1 - t0 >= 15 * MIN, `the tower, ${MIN} minutes in survival: ${t1 - t0} things (${Math.round((t1 - t0) * 60 / MIN)} an hour) ${JSON.stringify(tower(A))}`);
// in creative: monsters come round one who builds too
cmd(A, '/gamemode creative'); run(1);
wait(A, 52, 136, 16, MIN * 60);
const t2 = sum(tower(A));
ok(+A.g('gameMode') === 1 && t2 - t1 >= 15 * MIN, `and in creative (mode ${A.g('gameMode')}): ${t2 - t1} more (${Math.round((t2 - t1) * 60 / MIN)} an hour)`);
// everybody leaves; the server played again: the zombie and its cart are there
leave(A); run(3);
const A2 = open('alice');
ok(join(A2, '공장'), 'alice again');
cmd(A2, '/gamerule doMobSpawning false'); wait(A2, 68, 91, 25, 14);
{ const z = zomb(A2); ok(z.length === 1 && +A2.g('EAIR')[z[0].i] >= 1000 && mobs(A2, 'minecart').length === 1 && mobs(A2, 'villager').length >= 3, `the zombie is back in its cart, the three folk are there (${z.length}, carts ${mobs(A2, 'minecart').length}, villagers near ${mobs(A2, 'villager').length})`); }
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.0, 11-18) the mobs on a server, the same for everyone (src/netmob.js): node test/netmob.mjs [latency ms]
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
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 36 } });
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
    for (const c of cs) if (c.on) c.frame();
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

// every mob a game has: { e, t, x, y, z, hp, own (mine), key (owner nick:number) }
const mobs = (c) => {
  const ET = c.g('ET'), EX = c.g('EX'), EY = c.g('EY'), EZ = c.g('EZ'), EHP = c.g('EHP'), ERK = c.g('ERK'), ERU = c.g('ERU'), EUID = c.g('EUID'), NN = c.g('NNICK');
  const r = [];
  for (let i = 0; i < ET.length; i++) {
    if (+ET[i] <= 0 || +ET[i] === c.g('M_NETPLAYER')) continue;
    const own = +ERK[i] === 0;
    r.push({ e: i + 1, t: +ET[i], x: +EX[i], y: +EY[i], z: +EZ[i], hp: +EHP[i], own, key: (own ? c.nick : NN[+ERK[i] - 1]) + ':' + (own ? EUID[i] : ERU[i]) });
  }
  return r;
};
const byKey = (c) => new Map(mobs(c).map((m) => [m.key, m]));
const kind = (c, name) => c.g('MKEY').indexOf(name) + 1;

let A = open('alice'), B = open('bob');
A.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.srvCreate('몹 서버', ' ', 2468, 0, '-'));
run(1);
ok(join(A, '몹 서버') && join(B, '몹 서버'), 'both in');
cmd(A, '/gamerule doDaylightCycle false'); cmd(A, '/time set day');
cmd(A, '/tp @s 8 ~ 8'); run(1); cmd(A, '/tp bob 12 ~ 8'); run(4);
console.log('   alice', where(A), 'bob', where(B));
// 1. the same mobs on both screens: every one has one owner, and the other sees it at its place
run(8);
const same = () => {
  const a = byKey(A), b = byKey(B);
  let both = 0, off = 0, onlyA = [], onlyB = [];
  for (const [k, m] of a) { const n = b.get(k); if (!n) { onlyA.push(k); continue; } both++; if (Math.hypot(m.x - n.x, m.z - n.z) > 1.5 || m.t !== n.t) off++; }
  for (const [k] of b) if (!a.has(k)) onlyB.push(k);
  // (only the ones near both: far ones may be in a chunk the other has not made)
  const nearBoth = (c, k) => { const m = byKey(c).get(k); return m && Math.hypot(m.x - A.g('px'), m.z - A.g('pz')) < 30 && Math.hypot(m.x - B.g('px'), m.z - B.g('pz')) < 30; };
  onlyA = onlyA.filter((k) => nearBoth(A, k)); onlyB = onlyB.filter((k) => nearBoth(B, k));
  return { both, off, onlyA, onlyB };
};
let s = same();
ok(s.both > 0 && s.off === 0 && s.onlyA.length === 0 && s.onlyB.length === 0, `the chunks' animals the same on both (${s.both} shared, ${s.off} off, only alice ${s.onlyA.length}, only bob ${s.onlyB.length})`);
// no animal twice on one screen (made by both games from the same chunk)
const twice = (c) => { const seen = new Map(); let n = 0; for (const m of mobs(c)) { const u = m.key.split(':')[1]; if (+u < 1000000) continue; if (seen.has(u)) n++; seen.set(u, 1); } return n; };
ok(twice(A) === 0 && twice(B) === 0, `no chunk animal twice (alice ${twice(A)}, bob ${twice(B)})`);

// 2. a cow summoned by alice: bob sees it where it walks
console.log('   ' + cmd(A, '/summon cow 10 ~ 12'));
run(1);
let cowA = mobs(A).filter((m) => m.own && m.t === kind(A, 'cow')).sort((p, q) => Math.hypot(p.x - 10, p.z - 12) - Math.hypot(q.x - 10, q.z - 12))[0];
ok(!!cowA, 'alice has the cow');
run(5);
cowA = byKey(A).get(cowA.key); let cowB = byKey(B).get(cowA.key);
ok(cowB && !cowB.own && Math.hypot(cowA.x - cowB.x, cowA.z - cowB.z) < 1, `bob sees alice's cow at its place (${cowA && [cowA.x.toFixed(1), cowA.z.toFixed(1)]} / ${cowB && [cowB.x.toFixed(1), cowB.z.toFixed(1)]})`);

// 3. bob hits it to death: alice's cow dies on both, the drops are bob's
const itemsNear = (c) => { const I = c.g('IID'); return I.filter((v) => +v > 0).length; };
const i0 = itemsNear(B), xp0 = +B.g('xpPts') + 100 * +B.g('xpLevel');
B.call((fn) => { B.sim.poke('pKill', 1); fn.mobHurt(cowB.e, 99, 1, 0); B.sim.poke('pKill', 0); });
run(2);
ok(!byKey(A).get(cowA.key) && !byKey(B).get(cowA.key), 'the cow is dead on both screens');
ok(itemsNear(B) > i0, `bob's world has the drops (${i0} -> ${itemsNear(B)} things)`);
ok(+B.g('xpPts') + 100 * +B.g('xpLevel') > xp0 || itemsNear(B) > i0, 'and bob got what a kill gives');

// 4. alice's zombie goes for bob, the nearer one
cmd(A, '/tp @s 8 ~ -6'); run(1);
// (a flat floor round bob)
cmd(A, '/fill 6 44 2 18 44 14 stone'); cmd(A, '/fill 6 45 2 18 48 14 air'); cmd(A, '/tp bob 12.5 45 8.5'); run(2);
const hp0 = +B.g('hp');
console.log('   ' + cmd(A, '/summon zombie 15.5 45 8.5'));
run(6);
ok(+B.g('hp') < hp0, `alice's zombie hurt bob (${hp0} -> ${B.g('hp')})`);
ok(mobs(B).some((m) => !m.own && m.t === kind(B, 'zombie')), 'bob sees it');

// 5. bob uses one of alice's mobs: asked, then his
cmd(A, '/kill @e[type=zombie]'); run(1);
console.log('   ' + cmd(A, '/summon pig 13 ~ 9'));
run(2);
const pigB = mobs(B).find((m) => !m.own && m.t === kind(B, 'pig'));
ok(!!pigB, 'bob sees alice\'s pig');
if (pigB) {
  B.call((fn) => fn.netMobAsk(pigB.e));
  run(2);
  const pigB2 = mobs(B).find((m) => m.own && m.t === kind(B, 'pig'));
  const pigA = mobs(A).find((m) => m.t === kind(A, 'pig'));
  ok(!!pigB2, 'the pig is bob\'s now');
  ok(pigA && !pigA.own && pigA.key === pigB2.key, `alice sees it as bob's (${pigA && pigA.key} / ${pigB2 && pigB2.key})`);
}

// 6. alice leaves: her mobs near bob are his
const aliceOwn = mobs(A).filter((m) => m.own && Math.hypot(m.x - B.g('px'), m.z - B.g('pz')) < 30).length;
const bobOwn0 = mobs(B).filter((m) => m.own).length;
A.call((fn) => { fn.netLeave(); A.sim.poke('gState', 0); fn.menuGo(4); });
run(3);
const bobOwn1 = mobs(B).filter((m) => m.own).length;
ok(bobOwn1 >= bobOwn0 + aliceOwn - 1 && mobs(B).every((m) => m.own), `alice's ${aliceOwn} mobs near bob are his (${bobOwn0} -> ${bobOwn1}), no stand-ins left`);
console.log(`messages ${srv.msgs}, ${(srv.bytes / 1024).toFixed(0)} KB over ${srv.t.toFixed(0)} s`);
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(0);

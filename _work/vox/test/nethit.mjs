// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.4, 11-22) hitting a monster another player's game owns: as quick as one's own; monsters in the line where
// forty kept mobs stand: node test/nethit.mjs [latency ms]  (the harness is netmob.mjs's, the delay uneven)
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 80)) / 1000;
const WALL0 = Date.UTC(2026, 10, 9, 3, 0, 0);
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const lat = () => LAT * (0.5 + rnd());
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
    this.up = Math.max(s.t + lat(), (this.up || 0) + 1e-6);
    s.at(this.up, () => { f(s); s.msgs++; s.bytes += size; });
  }
  relay(apply) {
    const s = this.srv;
    for (const c of s.clients) if (c !== this && c.on) { c.down = Math.max(s.t + lat(), (c.down || 0) + 1e-6); s.at(c.down, () => apply(c)); }
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
A.call((fn) => fn.srvCreate('치는 서버', ' ', 2468, 0, '-'));
run(1);
ok(join(A, '치는 서버') && join(B, '치는 서버'), 'both in');
cmd(A, '/gamerule doDaylightCycle false'); cmd(A, '/time set day'); cmd(A, '/gamerule doMobSpawning false');
cmd(A, '/tp @s 8 ~ 8'); run(1); cmd(A, '/tp bob 12 ~ 8'); run(4);
for (const c of [A, B]) c.sim.poke('gameMode', 1);
const Y = Math.floor(A.g('py'));
// a husk of alice's, hit by somebody as fast as the game lets: the seconds till it is gone on alice's screen
const fight = (H, label) => {
  cmd(A, `/summon husk 10 ${Y} 12`); run(2);
  const mine = mobs(A).filter((m) => m.own && m.t === kind(A, 'husk'));
  if (!mine.length) { ok(false, label + ': no husk'); return 99; }
  const key = mine[0].key, hp0 = mine[0].hp;
  let t = 0, blows = 0;
  while (t < 40) {
    const m = byKey(H).get(key);
    if (!byKey(A).get(key)) break;
    if (m) H.call((fn) => { const h0 = H.g('EHURT')[m.e - 1]; H.sim.poke('pKill', 1); fn.mobHurt(m.e, 2, 0, 0); H.sim.poke('pKill', 0); if (h0 <= 0) blows++; });
    run(1 / 60); t += 1 / 60;
  }
  console.log(`   ${label}: ${hp0} health, ${blows} blows, ${t.toFixed(1)} s`);
  run(2);
  return t;
};
const tOwn = fight(A, 'alice hits her own husk');
const tOther = fight(B, "bob hits alice's husk");
ok(tOwn < 6.5, `one's own: ten blows in about five seconds (${tOwn.toFixed(1)} s)`);
ok(tOther < tOwn + 1.5, `another's is as quick, a line's delay apart (${tOther.toFixed(1)} s against ${tOwn.toFixed(1)} s)`);
// and with both at it: not faster than twice a mob's half second lets
const both = () => {
  cmd(A, `/summon husk 10 ${Y} 12`); run(2);
  const key = mobs(A).filter((m) => m.own && m.t === kind(A, 'husk'))[0].key;
  let t = 0;
  while (t < 40 && byKey(A).get(key)) {
    for (const H of [A, B]) { const m = byKey(H).get(key); if (m) H.call((fn) => { H.sim.poke('pKill', 1); fn.mobHurt(m.e, 2, 0, 0); H.sim.poke('pKill', 0); }); }
    run(1 / 60); t += 1 / 60;
  }
  return t;
};
const t2 = both();
ok(t2 > 1.8 && t2 <= tOwn + 0.5, `both hitting one husk: ${t2.toFixed(1)} s (not slower than one, not all at once)`);

// forty kept ones round alice (cows with numbers of their own), then monsters: bob sees the monsters
for (let i = 0; i < 44; i++) cmd(A, `/summon cow ${4 + (i % 9)} ${Y} ${14 + Math.floor(i / 9)}`);
run(1);
A.call(() => { const ET = A.g('ET'), U = A.g('EUID'), RK = A.g('ERK'); for (let i = 0; i < ET.length; i++) if (+ET[i] === kind(A, 'cow') && +RK[i] === 0) U[i] = 1500000 + i; });
for (let i = 0; i < 5; i++) cmd(A, `/summon husk ${14 + i} ${Y} 10`);
run(4);
const cowsA = mobs(A).filter((m) => m.own && m.t === kind(A, 'cow')).length, husksA = mobs(A).filter((m) => m.own && m.t === kind(A, 'husk')).length;
const husksB = mobs(B).filter((m) => !m.own && m.t === kind(B, 'husk')).length, cowsB = mobs(B).filter((m) => !m.own && m.t === kind(B, 'cow')).length;
ok(cowsA >= 44 && husksA === 5, `alice has ${cowsA} cows and ${husksA} husks`);
ok(husksB === 5, `bob sees the five husks (he sees ${husksB}, and ${cowsB} of the cows)`);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

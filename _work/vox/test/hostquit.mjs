// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.0, 11-18) leaving a server by closing the tab and coming back: node test/hostquit.mjs [latency ms]
// The tab closed (no menu, nothing written on the way out): what the player had and did must be
// on the server when they come back - alone (the host), with others (the host, or not).
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
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
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

// 1. alone on one's own server (its host), the tab closed
let A = open('alice');
A.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.srvCreate('혼자 서버', ' ', 4321, 0, '-'));
run(1);
ok(join(A, '혼자 서버'), 'alice in');
ok(A.g('netHost') === 1, 'alice is the host');
console.log(cmd(A, '/give @s diamond 7'), '|', cmd(A, '/tp @s ~12 ~ ~5'), A.g('cheatsOn'), A.g('netSt'), A.g('shOwner'), A.g('netNick')); run(3);
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
const p0 = where(A);
const X = Math.floor(p0[0]) + 2, Y = Math.floor(p0[1]) + 2, Z = Math.floor(p0[2]);
put(A, X, Y, Z, id('gold_block'));
run(0.4);
put(A, X + 1, Y, Z, id('iron_block'));
run(0.3);
ok(count(A, 'diamond') === 7, 'alice has 7 diamonds');
close(A); run(20);
A = open('alice');
ok(join(A, '혼자 서버'), 'alice back in');
run(3);
ok(count(A, 'diamond') === 7, `her things kept (diamonds: ${count(A, 'diamond')})`);
ok(near(where(A), p0), `where she was (${where(A)} vs ${p0})`);
ok(blockSeen(A, X, Y, Z) === id('gold_block'), 'her block kept');
ok(blockSeen(A, X + 1, Y, Z) === id('iron_block'), `and the one put just before the tab closed (${blockSeen(A, X + 1, Y, Z)})`);

// 2. with bob: the host's tab closed, then bob's (not the host)
let B = open('bob');
ok(join(B, '혼자 서버'), 'bob in');
run(3);
ok(A.g('netHost') + B.g('netHost') === 1, 'one host');
cmd(A, '/give @s gold_nugget 3'); cmd(A, '/give bob gold_ingot 4'); run(3);
ok(count(B, 'gold_ingot') === 4, 'bob got 4 gold');
const pa = where(A);
close(A); run(12);
ok(B.g('netHost') === 1, 'bob hosts now');
A = open('alice');
ok(join(A, '혼자 서버'), 'alice back in, with bob');
run(3);
ok(count(A, 'gold_nugget') === 3 && count(A, 'diamond') === 7, `her things kept (gold_nuggets ${count(A, 'gold_nugget')}, diamonds ${count(A, 'diamond')})`);
ok(near(where(A), pa), `where she was (${where(A)} vs ${pa})`);
cmd(A, '/give bob gold_ingot 2'); run(2);
ok(count(B, 'gold_ingot') === 6, 'bob has 6 gold');
close(B); run(12);
B = open('bob');
ok(join(B, '혼자 서버'), 'bob back in');
run(3);
ok(count(B, 'gold_ingot') === 6, `bob's things kept (gold ${count(B, 'gold_ingot')})`);
console.log(`messages ${srv.msgs}, ${(srv.bytes / 1024).toFixed(0)} KB over ${srv.t.toFixed(0)} s`);
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(0);

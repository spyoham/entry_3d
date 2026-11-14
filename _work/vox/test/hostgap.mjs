// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.0.1) the server's block record when the host goes quiet: node test/hostgap.mjs [latency ms]
// 1. the host's tab in the background (it stands still, still hearing): another becomes host and
//    keeps blocks; the first comes back as host - its old record must not go over them
// 2. the host's tab closed: what the others do before it is seen gone (NSTALE s) is kept by the next host
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
    for (const c of cs) if (c.on && !c.frozen) c.frame();
    srv.step(1 / 60);
    if (until && until()) return true;
  }
  return false;
};

const A0 = new Client(srv, 'alice'); cs.push(A0);
const B0 = new Client(srv, 'bob'); cs.push(B0);
const C0 = new Client(srv, 'carol'); cs.push(C0);
run(1);
for (const c of cs) c.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
// the one in the lowest slot is the host whenever it is there
const [A, B, C] = [...cs].sort((p, q) => p.g('netMy') - q.g('netMy'));
console.log(`slots: ${A.nick} ${A.g('netMy')}, ${B.nick} ${B.g('netMy')}, ${C.nick} ${C.g('netMy')}`);
const K = A.call((fn) => fn.srvCreate('기록 시험', ' ', 777, 1, '-'));
run(1);
for (const c of [A, B, C]) { c.call((fn) => fn.serverJoin(K)); ok(run(60, () => c.g('gState') === 2), `${c.nick} in`); }
run(2);
ok(A.g('netHost') === 1 && B.g('netHost') === 0, `${A.nick} is the host`);
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
const put = (c, x, y, z, b) => c.call((fn) => { c.sim.poke('netUserAct', 1); c.sim.poke('logOn', 1); fn.setBlock(x, y, z, b); c.sim.poke('logOn', 0); c.sim.poke('netUserAct', 0); });
// the server's record (as Entry Sync holds it): the last block of a cell
const rec = (x, y, z) => { const L = srv.lists['SY_e' + K] || []; let b = -1; for (let i = 0; i + 4 < L.length; i += 5) if (+L[i] === x && +L[i + 1] === y && +L[i + 2] === z && +L[i + 4] === 0) b = +L[i + 3]; return b; };
const X = Math.floor(A.g('px')) + 3, Y = Math.floor(A.g('py')) + 3, Z = Math.floor(A.g('pz')) + 3;
put(A, X, Y, Z, id('gold_block'));
run(3);
ok(rec(X, Y, Z) === id('gold_block'), 'the host keeps its block');

// 1. the host's tab in the background
A.frozen = true;
run(8 + 3);
ok(B.g('netHost') === 1, `${B.nick} host while ${A.nick} stands still`);
put(B, X + 1, Y, Z, id('diamond_block')); put(C, X + 2, Y, Z, id('oak_planks'));
// (more than the 12 last events a player's line carries: a minute or two of building)
for (let i = 0; i < 20; i++) { put(B, X + i, Y + 2, Z, id('glass')); run(0.2); }
run(3);
ok(rec(X + 1, Y, Z) === id('diamond_block') && rec(X + 2, Y, Z) === id('oak_planks'), `the new host keeps what was done (${rec(X + 1, Y, Z)}, ${rec(X + 2, Y, Z)})`);
A.frozen = false;
run(2);
ok(A.g('netHost') === 1 && B.g('netHost') === 0, `${A.nick} back and host again`);
put(A, X + 3, Y, Z, id('iron_block'));
run(3);
ok(rec(X + 3, Y, Z) === id('iron_block'), 'its new block kept');
ok(rec(X + 1, Y, Z) === id('diamond_block') && rec(X + 2, Y, Z) === id('oak_planks'), `and the blocks kept while it stood still are still there (${rec(X + 1, Y, Z)}, ${rec(X + 2, Y, Z)})`);
ok(rec(X, Y, Z) === id('gold_block'), 'and the first one');
ok([...Array(20).keys()].every((i) => rec(X + i, Y + 2, Z) === id('glass')), `and all 20 glass blocks (${[...Array(20).keys()].filter((i) => rec(X + i, Y + 2, Z) === id('glass')).length})`);

// 2. the host's tab closed: blocks put before anyone sees it gone
A.on = false;
run(1);
put(B, X + 4, Y, Z, id('lapis_block')); put(C, X + 5, Y, Z, id('coal_block'));
run(8 + 4);
ok(B.g('netHost') === 1, `${B.nick} host after ${A.nick} went`);
ok(rec(X + 4, Y, Z) === id('lapis_block') && rec(X + 5, Y, Z) === id('coal_block'), `what was done before it was seen gone is kept (${rec(X + 4, Y, Z)}, ${rec(X + 5, Y, Z)})`);
ok(rec(X + 3, Y, Z) === id('iron_block') && rec(X + 1, Y, Z) === id('diamond_block'), 'and all before');
console.log(`messages ${srv.msgs}, ${(srv.bytes / 1024).toFixed(0)} KB over ${srv.t.toFixed(0)} s`);
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(0);

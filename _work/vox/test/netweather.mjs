// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v2.8) /weather on a server, typed by one not the host: node test/netweather.mjs
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
const A = new Client(srv, 'alice'); cs.push(A);
const B = new Client(srv, 'bob'); cs.push(B);
run(1);
for (const c of cs) c.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
const K = A.call((fn) => fn.srvCreate('날씨', '시험', 1234, 1, '-'));
run(1);
A.call((fn) => fn.serverJoin(K)); ok(run(60, () => A.g('gState') === 2), 'alice in');
B.call((fn) => fn.serverJoin(K)); ok(run(60, () => B.g('gState') === 2), 'bob in');
run(3);
const H = A.g('netHost') === 1 ? A : B, O = H === A ? B : A;
console.log('host', H.nick, 'other', O.nick);
O.call((fn) => fn.netWish ? 0 : 0);
const say = (C, c) => C.call((fn) => fn.runCommand(c));
const trace = (C, secs) => { const w = []; for (let i = 0; i < secs * 10; i++) { run(0.1); w.push(C.g('wthr')); } return w.join(''); };
A.call((fn) => fn.runCommand('/op bob')); run(3);
for (const C of [O, H]) for (const [c, want] of [['/weather rain', 1], ['/weather clear', 0], ['/weather thunder', 2], ['/weather clear', 0]]) {
  say(C, c);
  const t = trace(C, 3); const said = String(C.g('CHT').slice(-1)[0]);
  ok(A.g('wthr') === want && B.g('wthr') === want && t === String(want).repeat(30), `${C === H ? 'host' : 'other'} ${c}: alice ${A.g('wthr')}, bob ${B.g('wthr')} (the typer's 3 s: ${t}) ${said}`);
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

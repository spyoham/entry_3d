// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v2.7) the owner forbids lava and TNT on the server: node test/srvlava.mjs
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
A.call((fn) => { fn.netEnter(); fn.menuGo(4); }); B.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
const K = A.call((fn) => fn.srvCreate('명령 서버', '시험', 1234, 0, '-'));
run(1);
A.call((fn) => fn.serverJoin(K)); ok(run(60, () => A.g('gState') === 2), 'alice in');
B.call((fn) => fn.serverJoin(K)); ok(run(60, () => B.g('gState') === 2), 'bob in');
run(2);
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
const cmd = (C, t) => { C.call((fn) => fn.runCommand(t)); return String(C.g('CHT').slice(-1)[0]); };
const Y = 90;
const tryPut = (C, x, z, what) => {
  C.call((fn) => fn.runCommand(`/setblock ${x} ${Y} ${z} stone`)); run(0.5);
  C.sim.poke('gameMode', 1);
  C.sim.poke('pickOn', 1); C.sim.poke('pickX', x); C.sim.poke('pickY', Y); C.sim.poke('pickZ', z); C.sim.poke('pickF', 3); C.sim.poke('pickB', id('stone'));
  C.sim.poke('px', x + 3.5); C.sim.poke('py', Y + 1); C.sim.poke('pz', z + 0.5); C.sim.poke('flying', 1);
  C.call((fn) => { const I = C.g('INVI'), N = C.g('INVN'); I[0] = id(what); N[0] = 1; C.sim.poke('hotSel', 1); if (what === 'tnt') fn.placeBlock(id('tnt'), id('tnt')); else fn.bucketUse(id('lava_bucket')); });
  run(1);
  return KEY[C.call((fn) => fn.blockAt(x, Y + 1, z))];
};
let r = cmd(A, '/op bob'); run(2);
r = cmd(B, '/server lava off'); ok(r.includes('주인만'), 'an op who is not the owner may not: ' + r);
r = cmd(A, '/server lava off'); ok(r.includes('금지'), r);
r = cmd(A, '/server tnt off'); run(4);
ok(B.g('shLava') === 0 && B.g('shTnt') === 0, `bob's game knows (lava ${B.g('shLava')}, tnt ${B.g('shTnt')})`);
ok(tryPut(B, 4, 4, 'lava') !== 'lava', 'bob cannot pour lava');
ok(tryPut(B, 6, 4, 'tnt') !== 'tnt', 'bob cannot put TNT');
ok(tryPut(A, 8, 4, 'lava') === 'lava', 'the owner still can (lava)');
ok(tryPut(A, 10, 4, 'tnt') === 'tnt', 'the owner still can (TNT)');
r = cmd(A, '/server lava on'); r = cmd(A, '/server tnt on'); run(4);
ok(tryPut(B, 12, 4, 'lava') === 'lava' && tryPut(B, 14, 4, 'tnt') === 'tnt', 'allowed again: bob can');
r = cmd(A, '/server'); ok(r.includes('용암 1') && r.includes('TNT 1'), r);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

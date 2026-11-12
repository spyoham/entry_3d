// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// usage: node test/srvage.mjs
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 80)) / 1000;
const WALL0 = Date.UTC(2026, 10, 9, 3, 0, 0);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

class Server {
  constructor() { this.vars = {}; this.lists = {}; this.t = 0; this.q = []; this.k = 0; this.clients = []; this.msgs = 0; this.bytes = 0; this.off = 0; }
  at(t, f) { this.q.push({ t, f, k: this.k++ }); }
  step(dt) { this.t += dt; this.q.sort((a, b) => a.t - b.t || a.k - b.k); while (this.q.length && this.q[0].t <= this.t) this.q.shift().f(); }
}
class Client {
  constructor(srv, nick, welcome = 0.5) {
    this.srv = srv; this.nick = nick; this.on = true; this.pend = new Map();
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
    this.sim.R.nick = nick;
    this.sim.R.syNet = this;
    this.sim.R.wallNow = () => WALL0 + srv.t * 1000 + srv.off;
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
// (v2.4.1) more than eight servers, and servers nobody plays cleared after 30 days
const A = new Client(srv, 'alice'); cs.push(A);
const B = new Client(srv, 'bob'); cs.push(B);
run(1);
A.call((fn) => { fn.netEnter(); fn.menuGo(4); }); B.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
A.sim.poke('AT_확장프로그램', 1); B.sim.poke('AT_확장프로그램', 1);
const ks = [];
for (let i = 1; i <= 12; i++) { ks.push(A.call((fn) => fn.srvCreate(`서버${i}`, '시험', 1000 + i, 0, '-'))); run(0.2); }
run(2);
ok(ks.join() === '1,2,3,4,5,6,7,8,9,10,11,12', 'twelve servers made: ' + ks.join());
ok(A.g('NSRV') === 99, 'places: ' + A.g('NSRV'));
const names = (C) => { const r = []; for (let k = 1; k <= 99; k++) if (C.call((fn) => fn.srvHas(k)) === 1) r.push(C.g('shName')); return r; };
ok(names(B).length === 12 && names(B)[11] === '서버12', 'bob sees them all: ' + names(B).slice(-3).join(','));
// a server made from before v2.4.1 (no day in its header): its day starts when somebody sees it
A.call((fn) => { fn.srvHead(3); fn.metaRead(3); fn.srvHead(3); });
A.sim.poke('shDay', 0); A.call((fn) => fn.metaWrite(3)); run(1);
ok(String(B.g('SY_m3')[0]).split('^')[12] === '0', 'server 3 with no day: ' + B.g('SY_m3')[0].split('^')[12]);
run(40);
const day0 = A.call((fn) => fn.dayNow());
ok(String(B.g('SY_m3')[0]).split('^')[12] === String(day0), 'its day set by the check: ' + String(B.g('SY_m3')[0]).split('^')[12] + ' today ' + day0);
// two players on server 12 (a two-digit place in the slot line)
A.call((fn) => fn.serverJoin(12)); run(60, () => A.g('gState') === 2);
B.call((fn) => fn.serverJoin(12)); run(60, () => B.g('gState') === 2);
run(3);
const ia = A.g('netMy'), ib = B.g('netMy');
ok(B.g('NSRVk')[ia - 1] === 12 && A.g('NSRVk')[ib - 1] === 12, 'each sees the other on server 12');
ok(Math.abs(B.g('NPX')[ia - 1] - A.g('px')) < 1 && Math.abs(B.g('NPZ')[ia - 1] - A.g('pz')) < 1 && Math.abs(B.g('NPY')[ia - 1] - A.g('py')) < 1, `alice's place read right by bob: ${B.g('NPX')[ia - 1]} ${B.g('NPY')[ia - 1]} ${B.g('NPZ')[ia - 1]} vs ${A.g('px')} ${A.g('py')} ${A.g('pz')}`);
A.call((fn) => fn.runCommand('/say 안녕')); run(2);
ok(B.g('CHT').some((t) => String(t).includes('안녕')), 'chat on server 12');
// everyone off; 40 days on. Nobody has played since: nothing goes (the clock alone is not trusted)
const leave = (C) => { C.call((fn) => { fn.netLeave(); C.sim.poke('gState', 0); fn.menuGo(4); }); run(4); };
leave(A); leave(B);
srv.off = 40 * 86400000;
run(70);
ok(names(B).length === 12, 'after 40 days, nobody played: all 12 kept (' + names(B).length + ')');
// alice plays server 12 that day: the others (unplayed for 40 days) go, 12 stays
A.call((fn) => fn.serverJoin(12)); run(60, () => A.g('gState') === 2);
run(10);
ok(String(B.g('SY_m12')[0]).split('^')[12] === String((day0 + 40)), 'server 12 played today: ' + String(B.g('SY_m12')[0]).split('^')[12]);
run(70);
const left = names(B);
ok(left.length === 1 && left[0] === '서버12', 'the 11 unplayed servers cleared: ' + left.join(','));
ok(String(B.g('netMsg')).includes('11개를 지웠습니다'), 'said: ' + B.g('netMsg'));
ok(B.g('SY_e1').length === 0 && B.g('SY_m1').length === 0, 'their lists are empty');
// a place freed is used again
leave(A);
const k2 = B.call((fn) => fn.srvCreate('새 서버', '시험', 7, 0, '-')); run(2);
ok(k2 === 1 && names(A).includes('새 서버'), 'a new server takes place ' + k2);
console.log(fails ? fails + ' FAILED' : 'all ok');

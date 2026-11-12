// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v2.7.4) the global ban list kept in each tessvm too (@전체차단, its revision ?!gbr): node test/gbback.mjs
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
  g(e) { return e === 'SY_gbr' ? +this.sim.R.syLocal[e] : this.sim.peek(e); }
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
const SUPER = '코딩재미있어';
const S = new Client(srv, SUPER); cs.push(S);
const A = new Client(srv, 'alice'); cs.push(A);
const B = new Client(srv, 'bob'); cs.push(B);
for (const c of cs) c.sim.poke('AT_확장프로그램', 1);
run(1);
S.call((fn) => { fn.netEnter(); fn.menuGo(11); });
run(4);
S.call((fn) => { fn.gbanAdd('bob', '그리핑'); fn.gbanAdd('carol', '도배'); });
run(2);
ok(S.g('SY_gbr') === 2 && A.g('SY_gbr') === 2 && A.g('SY_gb').length === 2, `two bans, revision 2 everywhere (${A.g('SY_gbr')})`);
ok(S.g('AT_전체차단').join('|') === '2|bob^그리핑|carol^도배', "SUPER's own copy at once: " + S.g('AT_전체차단').join('|'));
run(32);
ok(A.g('AT_전체차단').join('|') === '2|bob^그리핑|carol^도배' && B.g('AT_전체차단').length === 3, "alice's and bob's copies: " + A.g('AT_전체차단').join('|'));
// Entry Sync's values wiped (list and revision)
const wipe = (rev) => {
  srv.lists['SY_gb'] = []; srv.lists['?!gb'] = [];
  if (rev) { srv.vars['SY_gbr'] = 0; }
  for (const c of cs) { c.sim.R.syLists['SY_gb'].splice(0); if (rev) c.sim.R.syLocal['SY_gbr'] = 0; }
};
wipe(true);
ok(A.g('SY_gb').length === 0, 'the shared list emptied');
run(15);
ok(cs.every((c) => c.g('SY_gb').length === 2 && c.g('SY_gbr') === 2), `written back from the copies (${cs.map((c) => c.g('SY_gb').length + '@' + c.g('SY_gbr')).join(', ')})`);
ok(String(B.call((fn) => fn.netJoinCheck(1))).length >= 0 && B.call((fn) => fn.gbanOf('bob')) > 0, 'bob banned again');
// the list alone wiped (the revision left)
wipe(false);
run(15);
ok(cs.every((c) => c.g('SY_gb').length === 2), 'the list alone emptied: written back too');
// SUPER lifts bob (revision 3); a player coming with an older copy does not bring him back
S.call((fn) => fn.gbanDel(fn.gbanOf('bob')));
run(2);
ok(A.g('SY_gb').length === 1 && A.g('SY_gbr') === 3, `bob lifted, revision 3 (${A.g('SY_gb').join('|')})`);
const D = new Client(srv, 'dave'); cs.push(D);
D.sim.poke('AT_확장프로그램', 1); D.sim.poke('AT_전체차단', [2, 'bob^그리핑', 'carol^도배']);
run(35);
ok(cs.every((c) => c.g('SY_gb').length === 1 && c.g('SY_gb')[0] === 'carol^도배'), 'the older copy did not bring bob back: ' + D.g('SY_gb').join('|'));
ok(D.g('AT_전체차단').join('|') === '3|carol^도배', "dave's copy brought up to date: " + D.g('AT_전체차단').join('|'));
// no copy without tessvm's saving
const E = new Client(srv, 'eve'); cs.push(E);
run(35);
ok(E.g('AT_전체차단').length === 0, 'none kept where saving is off');
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

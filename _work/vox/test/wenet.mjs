// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v2.8) world edit on a server: the admins alone, the owner switches it, everyone sees it: node test/wenet.mjs
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
const K = A.call((fn) => fn.srvCreate('편집', '시험', 1234, 1, '-'));
run(1);
A.call((fn) => fn.serverJoin(K)); ok(run(60, () => A.g('gState') === 2), 'alice (the owner) in');
B.call((fn) => fn.serverJoin(K)); ok(run(60, () => B.g('gState') === 2), 'bob in');
run(3);
const KEY = A.g('ITKEY');
const say = (C, c) => { C.call((fn) => fn.chatRun(c)); return String(C.g('CHT').slice(-1)[0]); };
const at = (C, x, y, z) => KEY[C.call((fn) => fn.blockAt(x, y, z))];
const stand = (C, x, y, z) => { C.sim.poke('px', x + 0.5); C.sim.poke('py', y); C.sim.poke('pz', z + 0.5); C.sim.poke('flying', 1); };
const X = 4, Y = 90, Z = 4;
A.call((fn) => fn.runCommand(`/fill ${X - 2} ${Y} ${Z - 2} ${X + 12} ${Y + 8} ${Z + 12} air`)); run(2);
stand(A, X, Y, Z); say(A, '//pos1'); stand(A, X + 4, Y + 2, Z + 4); say(A, '//pos2');
let r = say(A, '//set stone'); run(3);
ok(r.includes('75') && at(A, X + 2, Y + 1, Z + 2) === 'stone', 'alice //set stone: ' + r);
ok(at(B, X + 2, Y + 1, Z + 2) === 'stone' && at(B, X + 4, Y + 2, Z + 4) === 'stone', "bob's screen has it");
r = say(A, '//hsphere glass 3'); run(3);
ok(at(B, X + 7, Y + 2, Z + 4) === 'glass' || at(B, X + 4, Y + 5, Z + 4) === 'glass', "a hollow sphere on bob's screen: " + r);
r = say(A, '//undo'); run(3);
ok(at(B, X + 4, Y + 5, Z + 4) !== 'glass', "//undo on bob's screen: " + r);
// bob is no admin
stand(B, X, Y, Z); say(B, '//pos1'); r = say(B, '//set dirt'); run(2);
ok(r.includes('관리자만') && at(A, X + 2, Y + 1, Z + 2) === 'stone', 'bob (no op) refused: ' + r);
r = say(B, '/server worldedit off'); ok(!r.includes('끔') || r.includes('주인만'), 'bob may not switch it: ' + r);
// op bob: he may
say(A, '/op bob'); run(3);
stand(B, X, Y, Z); say(B, '//pos1'); stand(B, X + 1, Y, Z + 1); say(B, '//pos2'); r = say(B, '//set gold_block'); run(3);
ok(at(A, X, Y, Z) === 'gold_block' && at(A, X + 1, Y, Z + 1) === 'gold_block', 'bob (op now) //set gold_block, alice sees it: ' + r);
// copy and paste: the clipboard is bob's, alice sees the paste
stand(B, X, Y, Z); r = say(B, '//copy'); stand(B, X + 8, Y, Z); r = say(B, '//paste'); run(3);
ok(at(A, X + 8, Y, Z) === 'gold_block' && at(A, X + 9, Y, Z + 1) === 'gold_block', "bob's paste on alice's screen: " + r);
// the owner turns it off: nobody may
r = say(A, '/server worldedit off'); run(4);
ok(r.includes('끔') && B.g('shWe') === 0, `off (bob reads ${B.g('shWe')}): ` + r);
r = say(B, '//set dirt'); ok(r.includes('꺼져'), 'bob refused now: ' + r);
r = say(A, '//set dirt'); ok(r.includes('꺼져'), 'and alice: ' + r);
r = say(A, '//worldedit on'); run(4); ok(B.g('shWe') === 1, 'on again: ' + r);
// one coming later finds the changes (the host kept them)
const C = new Client(srv, 'carol'); cs.push(C);
run(1); C.call((fn) => { fn.netEnter(); fn.menuGo(4); }); run(6);
C.call((fn) => fn.serverJoin(K)); ok(run(60, () => C.g('gState') === 2), 'carol in later');
run(4);
ok(at(C, X + 3, Y + 2, Z + 3) === 'stone' && at(C, X + 8, Y, Z) === 'gold_block' && at(C, X + 4, Y + 5, Z + 4) !== 'glass', "carol's screen: the set, the paste, not the undone sphere");
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

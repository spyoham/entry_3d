// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v2.7.2) the nicknames banned from every server, kept by 코딩재미있어 alone: node test/gban.mjs
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
const SUPER = '코딩재미있어';
const S = new Client(srv, SUPER); cs.push(S);
const A = new Client(srv, 'alice'); cs.push(A);
const B = new Client(srv, 'bob'); cs.push(B);
run(1);
for (const c of [A, B]) c.call((fn) => { fn.netEnter(); fn.menuGo(4); });
// the title: the button for SUPER alone
ok(S.call((fn) => fn.iAmSuper()) === 1 && A.call((fn) => fn.iAmSuper()) === 0, 'only 코딩재미있어 is SUPER');
S.call((fn) => { fn.netEnter(); fn.menuGo(11); });
run(6);
ok(S.g('scr') === 11, 'the list open on the title (screen 11 drawn for 6 s without an error)');
const K = A.call((fn) => fn.srvCreate('밴 서버', '시험', 1234, 0, '-'));
run(1);
A.call((fn) => fn.serverJoin(K)); ok(run(60, () => A.g('gState') === 2), 'alice in');
B.call((fn) => fn.serverJoin(K)); ok(run(60, () => B.g('gState') === 2), 'bob in');
run(2);
// someone else cannot write it
A.call((fn) => fn.gbanAdd('bob', '아무나')); run(2);
ok(S.g('SY_gb').length === 0, `alice cannot ban (${S.g('SY_gb').length})`);
// SUPER bans bob: out within a second or two, may not come back nor make a server
S.call((fn) => fn.gbanAdd('bob', '그리핑')); S.call((fn) => fn.gbanAdd(SUPER, '나')); S.call((fn) => fn.gbanAdd('bob', '두 번'));
ok(S.g('SY_gb').length === 1, `one line, not SUPER, not twice (${S.g('SY_gb').join(' | ')})`);
run(3);
ok(B.g('gState') !== 2 && B.g('netSrv') === 0, `bob put out (gState ${B.g('gState')})`);
ok(String(B.g('msgBody') + B.g('msgBody2')).includes('그리핑'), 'with the reason: ' + B.g('msgBody'));
ok(A.g('gState') === 2, 'alice stays');
const e = B.call((fn) => fn.netJoinCheck(K));
ok(String(e).includes('모든 서버에서 차단'), 'bob may not join again: ' + e);
B.sim.poke('esEdit', 0); B.sim.poke('esName', '밥 서버'); B.call((fn) => fn.serverSave());
ok(B.call((fn) => { let n = 0; for (let k = 1; k <= 99; k++) if (fn.srvHas(k) === 1 && B.g('shOwner') === 'bob') n++; return n; }) === 0, 'nor make a server: ' + B.g('msgBody'));
// lifted
S.call((fn) => fn.gbanAdd('carol', '')); run(1);
const ix = S.call((fn) => fn.gbanOf('bob'));
S.call((fn) => fn.gbanDel(ix)); run(2);
ok(S.g('SY_gb').length === 1 && S.g('SY_gb')[0] === 'carol^운영자의 결정', `bob lifted, carol kept (${S.g('SY_gb').join(' | ')})`);
B.sim.poke('gState', 0); B.call((fn) => fn.serverJoin(K)); ok(run(60, () => B.g('gState') === 2), 'bob in again');
// SUPER is never banned, and plays on
S.call((fn) => fn.menuGo(4)); run(1); S.call((fn) => fn.serverJoin(K)); ok(run(60, () => S.g('gState') === 2), 'SUPER in');
run(2);
// (v2.7.2) who poured lava: kept by the host, /lavalog and the title's 용암 기록 for SUPER alone
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
const Y = 90;
const pour = (C, x, z) => {
  C.call((fn) => fn.runCommand(`/setblock ${x} ${Y} ${z} stone`)); run(0.5);
  C.sim.poke('gameMode', 1);
  C.sim.poke('pickOn', 1); C.sim.poke('pickX', x); C.sim.poke('pickY', Y); C.sim.poke('pickZ', z); C.sim.poke('pickF', 3); C.sim.poke('pickB', id('stone'));
  C.sim.poke('px', x + 3.5); C.sim.poke('py', Y + 1); C.sim.poke('pz', z + 0.5); C.sim.poke('flying', 1);
  C.call((fn) => { const I = C.g('INVI'), N = C.g('INVN'); I[0] = id('lava_bucket'); N[0] = 1; C.sim.poke('hotSel', 1); fn.bucketUse(id('lava_bucket')); });
  run(1);
  return KEY[C.call((fn) => fn.blockAt(x, Y + 1, z))];
};
ok(pour(B, 4, 4) === 'lava' && pour(B, 6, 4) === 'lava' && pour(A, 8, 4) === 'lava', 'bob pours twice, alice once');
run(4);
const last = (C) => String(C.g('CHT').slice(-1)[0]);
A.call((fn) => fn.runCommand('/lavalog')); ok(!last(A).includes('용암을 쓴 사람'), 'alice (the owner) may not see it: ' + last(A));
S.call((fn) => fn.runCommand('/lavalog'));
const ch = S.g('CHT').slice(-3).map(String);
ok(ch[2].includes('2명') && ch.some((l) => l.startsWith('bob · 2번') && l.includes('6 91 4')) && ch.some((l) => l.startsWith('alice · 1번')), '/lavalog: ' + ch.join(' / '));
// all gone; SUPER on the title's 용암 기록: every server's lines
for (const c of [A, B, S]) c.call((fn) => fn.netLeave());
run(3);
S.sim.poke('gState', 0); run(0.5); S.call((fn) => { fn.netEnter(); fn.menuGo(12); }); S.sim.poke('lgT', 999); run(4);
const LG = S.g('LGN');
ok(S.g('scr') === 12 && LG.length === 2 && LG.includes('bob') && S.g('LGS').every((n) => n === '밴 서버'), `the title's list (${LG.join(', ')} on ${S.g('LGS').join(', ')})`);
A.sim.poke('gState', 0); run(0.5); A.call((fn) => { fn.netEnter(); fn.menuGo(12); }); A.sim.poke('lgT', 999); run(4);
ok(A.g('LGN').length === 0, 'not for alice');
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

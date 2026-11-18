// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.0, 11-18) multiplayer fixes found by reading the code: node test/netfix.mjs [latency ms]
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

const chats = (c) => c.g('CHT').map(String);

let A = open('alice'), B = open('bob');
A.sim.poke('AT_확장프로그램', 1);
const K = A.call((fn) => fn.srvCreate('고침 서버', ' ', 1357, 1, '-'));
run(1);
ok(join(A, '고침 서버') && join(B, '고침 서버'), 'alice and bob in');
const host = () => (A.g('netHost') === 1 ? A : B);
console.log(`   host ${host().nick}`);

// 1. newcomers never take a slot that is in use (and nobody seems to leave)
const left0 = chats(A).filter((t) => t.includes('나갔습니다')).length;
const extra = [];
for (let i = 0; i < 6; i++) extra.push(open('n' + i));
run(2);
const slots = [A, B, ...extra].map((c) => c.g('netMy'));
ok(new Set(slots).size === slots.length && slots.every((s) => s > 0), `8 games, 8 slots: ${slots.join(' ')}`);
ok(chats(A).filter((t) => t.includes('나갔습니다')).length === left0, 'nobody seemed to leave on alice\'s screen');
for (const c of extra) close(c);
run(10);

// 2. a /fill far from the host (a chunk it has not made) is kept in the server's record
// (alice owns the server; the host is whoever is in the lower slot: either)
const H = host(), O = H === A ? B : A;
cmd(A, '/op bob'); run(2);
cmd(O, '/tp @s 400 60 400'); run(8);
const rec = (x, y, z) => { const L = srv.lists['SY_e' + K] || []; let b = -1; for (let i = 0; i + 4 < L.length; i += 5) if (+L[i] === x && +L[i + 1] === y && +L[i + 2] === z && +L[i + 4] === 0) b = +L[i + 3]; return b; };
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
console.log('   ' + cmd(O, '/fill 400 70 400 403 71 402 gold_block'));
run(3);
ok(H.call((fn) => fn.cOK(401, 401)) === 0, `the host (${H.nick}) has not made that chunk`);
ok(rec(400, 70, 400) === id('gold_block') && rec(403, 71, 402) === id('gold_block'), `the fill is in the record (${rec(400, 70, 400)}, ${rec(403, 71, 402)})`);
cmd(O, '/tp @s 8 60 8'); run(6);

// 3. another server cleared while I host one: my record stays
const K2 = H.call((fn) => fn.srvCreate('빈 서버', ' ', 99, 1, '-'));
run(1);
const n0 = (srv.lists['SY_e' + K] || []).length;
put(H, 5, 50, 5, id('iron_block'));
H.call((fn) => fn.srvWipe(K2));
run(3);
ok((srv.lists['SY_e' + K] || []).length >= n0 + 5 && rec(5, 50, 5) === id('iron_block'), `my record kept after another server was cleared (${n0} -> ${(srv.lists['SY_e' + K] || []).length})`);

// 4. /execute as an op cannot run a server command on the op's screen
cmd(A, '/deop bob'); run(2);
cmd(A, '/perm allow bob execute'); run(3);
console.log('   ' + cmd(B, '/execute as alice run op bob'));
run(3);
ok(A.call((fn) => fn.isOp('bob')) === 0 && B.call((fn) => fn.isOp('bob')) === 0, `bob not made an op through /execute (ops ${JSON.stringify(A.g('MOP'))})`);

// 5. a right given by /perm works on the host (it checked isOp only)
cmd(A, '/perm allow bob ban'); run(3);
console.log('   ' + cmd(B, '/ban carol 시험'));
run(3);
ok(A.g('MBAN').includes('carol') && B.g('MBAN').includes('carol'), `bob banned carol with the right /perm gave (${JSON.stringify(A.g('MBAN'))})`);

// 6. an 'all' plugin set off by someone who is not the host runs on every screen
console.log('   ' + cmd(A, '/plugin add 함께 chat:hello all /effect give @s speed 30 1'));
run(3);
const eff = (c) => +c.g('EFT')[0];
console.log(`   ${O.nick} (not the host) says hello`);
O.call((fn) => fn.chatRun('hello everyone'));
run(3);
console.log(`   speed: ${H.nick} ${eff(H)}, ${O.nick} ${eff(O)}`);
ok(eff(H) > 0 && eff(O) > 0, 'the plugin ran on both screens');
console.log(`messages ${srv.msgs}, ${(srv.bytes / 1024).toFixed(0)} KB over ${srv.t.toFixed(0)} s`);
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(0);

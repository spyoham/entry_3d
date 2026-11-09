// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// usage: node test/netsim.mjs [latency ms]
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
// to the multiplayer screen
A.call((fn) => { fn.netEnter(); fn.menuGo(4); }); B.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
ok(A.g('netMy') > 0 && B.g('netMy') > 0 && A.g('netMy') !== B.g('netMy'), `two slots: ${A.g('netMy')} ${B.g('netMy')}`);
ok(A.call((fn) => fn.netOnline()) === 2, 'alice sees two online');
// alice makes a server and goes in
const K = A.call((fn) => fn.srvCreate('테스트 서버', '어서 오세요', 1234, 0));
ok(K >= 1, 'server made: ' + K);
run(1);
ok(B.call((fn) => fn.srvHas(K)) === 1 && B.g('shName') === '테스트 서버' && B.g('shOwner') === 'alice', 'bob sees it in the list');
A.call((fn) => fn.serverJoin(K));
ok(run(60, () => A.g('gState') === 2), 'alice in (gState 2)');
run(1);
ok(A.g('netSrv') === K && A.g('netSt') === 2 && A.g('netHost') === 1, 'alice is the host');
B.call((fn) => fn.serverJoin(K));
ok(run(60, () => B.g('gState') === 2), 'bob in');
run(2);
const slotA = A.g('netMy'), slotB = B.g('netMy');
ok(A.g('NENT')[slotB - 1] > 0 && B.g('NENT')[slotA - 1] > 0, 'each draws the other');
const eB = A.g('NENT')[slotB - 1];
ok(Math.abs(A.g('EX')[eB - 1] - B.g('px')) < 1 && Math.abs(A.g('EZ')[eB - 1] - B.g('pz')) < 1, `bob where he is on alice's screen (${A.g('EX')[eB - 1].toFixed(1)} vs ${B.g('px').toFixed(1)})`);
// alice puts a block (as the player does) and says hello
const X = Math.floor(A.g('px')) + 2, Y = Math.floor(A.g('py')) + 2, Z = Math.floor(A.g('pz')) + 2;
const KEY = A.g('ITKEY'), GOLD = KEY.indexOf('gold_block');
A.call((fn) => { A.sim.poke('netUserAct', 1); A.sim.poke('logOn', 1); fn.setBlock(X, Y, Z, GOLD); A.sim.poke('logOn', 0); A.sim.poke('netUserAct', 0); });
A.call((fn) => fn.chatRun('안녕 bob'));
run(1);
ok(B.call((fn) => fn.blockAt(X, Y, Z)) === GOLD, "alice's block on bob's screen");
ok(B.g('CHT').some(t => String(t).includes('<alice> 안녕 bob')), 'the chat reached bob');
run(2);
ok(A.call((fn) => fn.editLen(K)) >= 5 || B.call((fn) => fn.editLen(K)) >= 5, `the server keeps the block (${A.call((fn) => fn.editLen(K))} items)`);
// a plugin: anyone who joins gets a diamond; a /spawn command for all
A.call((fn) => fn.runCommand('/plugin add 선물 join me /give @s diamond 1'));
A.call((fn) => fn.runCommand('/plugin add 집 command:home me /tp @s 0 ~ 0'));
run(3);
ok(B.g('PLN').filter(n => n === '선물').length === 1, 'bob sees the plugin (the settings went round)');
A.call((fn) => fn.runCommand('/plugin'));
ok(String(A.g('CHT').slice(-1)[0]).includes('선물'), '/plugin lists them: ' + A.g('CHT').slice(-1)[0]);
// bob is no op
B.call((fn) => fn.runCommand('/give @s diamond 64'));
ok(String(B.g('CHT').slice(-1)[0]).includes('관리자만'), 'bob may not /give: ' + B.g('CHT').slice(-1)[0]);
B.call((fn) => fn.runCommand('/home'));
run(0.5);
ok(Math.abs(B.g('px') - 0.5) < 0.3 && Math.abs(B.g('pz') - 0.5) < 0.3, `bob's /home (a plugin's command) works for him: ${B.g('px').toFixed(1)} ${B.g('py').toFixed(1)}`);
// carol comes later: the block is there, the plugin gives her a diamond
const C = new Client(srv, 'carol'); cs.push(C);
run(1);
C.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
C.call((fn) => fn.serverJoin(K));
ok(run(60, () => C.g('gState') === 2), 'carol in');
run(2);
ok(C.call((fn) => fn.blockAt(X, Y, Z)) === GOLD, 'carol sees the block kept by the server');
ok(C.g('INVI').includes(KEY.indexOf('diamond')), 'the join plugin gave carol a diamond');
// bob takes an emerald, leaves, comes back: it is his again (kept by nickname)
B.call((fn) => fn.runCommand('/home'));
B.sim.poke('netUserAct', 1); B.call((fn) => { fn.addItem(KEY.indexOf('jade'), 5, 0); }); B.sim.poke('netUserAct', 0);
B.call((fn) => { fn.netLeave(); B.sim.poke('gState', 0); });
run(4);
ok(A.g('CHT').some(t => String(t).includes('bob 님이 나갔습니다')), 'alice hears bob left');
B.call((fn) => { fn.menuGo(4); fn.serverJoin(K); });
ok(run(60, () => B.g('gState') === 2), 'bob back in');
run(1);
ok(B.g('INVI').includes(KEY.indexOf('jade')), "bob's emeralds came back with him");
// pvp: alice hits bob
const hp0 = B.g('hp');
A.call((fn) => fn.netHit(A.g('NENT')[slotB - 1], 4));
run(1);
ok(B.g('hp') < hp0, `alice's hit hurt bob (${hp0} -> ${B.g('hp')})`);
// alice bans carol
A.call((fn) => fn.runCommand('/ban carol 시험'));
run(2);
ok(C.g('gState') === 0 && C.g('scr') === 8 && String(C.g('msgBody')).includes('차단'), `carol thrown out: ${C.g('msgTitle')} / ${C.g('msgBody')}`);
run(3);
ok(C.call((fn) => fn.netJoinCheck(K)).includes('차단'), 'carol cannot come back: ' + C.call((fn) => fn.netJoinCheck(K)));
// the host leaves: bob carries on as the host
A.call((fn) => { fn.netLeave(); A.sim.poke('gState', 0); });
run(3);
ok(B.g('netHost') === 1, 'bob is the host now');
console.log(`messages ${srv.msgs}, ${(srv.bytes / 1024).toFixed(0)} KB over ${srv.t.toFixed(0)} s`);
console.log(fails ? `${fails} FAILED` : 'all ok');

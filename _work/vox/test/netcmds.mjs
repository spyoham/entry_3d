// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// commands on a server (targets, /perm, every right, the copies): node test/netcmds.mjs
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
const count = (C, k) => C.g('INVI').reduce((t, x, i) => t + (x === id(k) ? C.g('INVN')[i] : 0), 0);
const cmd = (C, t) => { C.call((fn) => fn.runCommand(t)); return String(C.g('CHT').slice(-1)[0]); };
let r;
// ---- targets reach the other players
r = cmd(A, '/give @a diamond 2'); run(1);
ok(count(A, 'diamond') === 2 && count(B, 'diamond') === 2, `/give @a: alice ${count(A, 'diamond')}, bob ${count(B, 'diamond')} · ${r}`);
r = cmd(A, '/give bob gold_ingot 3'); run(1);
ok(count(B, 'gold_ingot') === 3 && count(A, 'gold_ingot') === 0, `/give bob: only bob · ${r}`);
r = cmd(A, '/give nobody gold_ingot 3'); ok(r.includes('접속해 있지 않은'), 'a name not on the server: ' + r);
r = cmd(A, '/gamemode creative bob'); run(1);
ok(B.g('gameMode') === 1 && A.g('gameMode') === 0, `/gamemode creative bob: bob ${B.g('gameMode')}, alice ${A.g('gameMode')}`);
r = cmd(A, '/gamemode survival @a'); run(1); ok(B.g('gameMode') === 0, '/gamemode survival @a: bob back');
// tp: to another player, and everyone to me
B.sim.poke('px', 40.5); B.sim.poke('pz', 40.5); B.sim.poke('py', 80); B.sim.poke('flying', 1); run(1);
r = cmd(A, '/tp bob'); run(0.2);
ok(Math.hypot(A.g('px') - B.g('px'), A.g('pz') - B.g('pz')) < 1.5, `/tp bob: alice to bob (${A.g('px').toFixed(1)}, ${A.g('pz').toFixed(1)}) · ${r}`);
A.sim.poke('px', 10.5); A.sim.poke('pz', 10.5); A.sim.poke('py', 80); A.sim.poke('flying', 1); run(1);
r = cmd(A, '/tp @a @s'); run(1);
ok(Math.hypot(B.g('px') - 10.5, B.g('pz') - 10.5) < 1.5, `/tp @a @s: bob to alice (${B.g('px').toFixed(1)}, ${B.g('pz').toFixed(1)})`);
r = cmd(A, '/tp @a ~ ~ ~5'); run(1);
ok(Math.abs(B.g('pz') - 15.5) < 1.5 && Math.abs(A.g('pz') - 15.5) < 0.1, `/tp @a ~ ~ ~5: both to the place 5 on from alice (bob z ${B.g('pz').toFixed(1)}, alice ${A.g('pz').toFixed(1)})`);
// the stand-ins are not mobs
const nb0 = A.g('NENT')[B.g('netMy') - 1];
r = cmd(A, '/kill @e[type=!player]'); run(1);
ok(A.g('ET')[nb0 - 1] > 0 && B.g('dead') === 0, '/kill @e[type=!player] leaves bob (and his stand-in) be: ' + r);
r = cmd(A, '/effect give @a speed 30 1'); run(1);
ok(B.g('EFT')[0] > 0, '/effect give @a: bob is fast');
r = cmd(A, '/execute as @a run give @s apple 1'); run(1);
ok(count(B, 'apple') === 1 && count(A, 'apple') === 1, `/execute as @a run give @s: alice ${count(A, 'apple')}, bob ${count(B, 'apple')}`);
r = cmd(A, '/kill bob'); run(1); ok(B.g('dead') === 1 && A.g('dead') === 0, '/kill bob');
B.call((fn) => fn.respawn()); run(2);
// ---- rights
const bd0 = count(B, 'diamond'), ad0 = count(A, 'diamond');
r = cmd(B, '/give @s diamond 1'); ok(r.includes('관리자만') && count(B, 'diamond') === bd0, 'bob may not /give: ' + r);
r = cmd(B, '/give @a diamond 1'); run(1); ok(count(A, 'diamond') === ad0, 'nor give alice anything');
// (a forged event: bob's game sends alice a command; alice checks bob's right)
B.call((fn) => fn.evAdd('a', 'alice^/give @s diamond 50')); run(1);
ok(count(A, 'diamond') === ad0, 'a command bob may not give does not run on alice');
r = cmd(A, '/perm allow bob give'); run(3);
r = cmd(B, '/give @s diamond 1'); ok(count(B, 'diamond') === bd0 + 1, 'after /perm allow bob give: bob may · ' + r);
r = cmd(B, '/time set noon'); ok(r.includes('관리자만'), 'but not /time: ' + r);
r = cmd(A, '/perm set time all'); run(3);
r = cmd(B, '/time set noon'); ok(!r.includes('관리자만'), 'after /perm set time all: ' + r);
r = cmd(A, '/perm set weather owner'); run(3);
r = cmd(B, '/weather rain'); ok(r.includes('주인만'), 'owner only: ' + r);
r = cmd(A, '/perm'); ok(r.includes('/time') && r.includes('bob'), '/perm lists: ' + r);
r = cmd(A, '/perm check bob'); ok(r.includes('/give') && r.includes('/time') && !r.includes('/weather'), '/perm check bob: ' + r.slice(0, 90));
r = cmd(B, '/perm allow bob op'); ok(r.includes('관리자만'), 'bob may not hand out rights: ' + r);
r = cmd(A, '/perm set perm all'); ok(r.includes('모두에게 열 수 없'), 'perm stays the ops: ' + r);
r = cmd(A, '/perm deny bob give'); run(3);
r = cmd(B, '/give @s diamond 1'); ok(r.includes('관리자만'), 'after /perm deny: ' + r);
r = cmd(A, '/perm reset'); run(3);
r = cmd(B, '/time set day'); ok(r.includes('관리자만'), 'after /perm reset: ' + r);
// ---- the nickname with every right
const S = new Client(srv, '코딩재미있어'); cs.push(S);
run(1);
S.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
ok(S.call((fn) => fn.netJoinCheck(K)) === '', 'the one with every right may join');
S.call((fn) => fn.serverJoin(K)); ok(run(60, () => S.g('gState') === 2), 'in');
run(2);
r = cmd(S, '/give @s diamond 5'); ok(count(S, 'diamond') >= 5, 'may use everything on a server not theirs: ' + r);
r = cmd(A, '/ban 코딩재미있어'); run(2); ok(r.includes('모든 서버의 관리자') && S.g('gState') === 2, 'can not be banned: ' + r);
r = cmd(A, '/kick 코딩재미있어'); run(2); ok(S.g('gState') === 2, 'nor kicked');
r = cmd(S, '/op bob'); run(3); ok(A.call((fn) => fn.isOp('bob')) === 1, 'may make bob an op');
S.call((fn) => { fn.netLeave(); S.sim.poke('gState', 0); fn.menuGo(4); }); run(3);
S.call((fn) => fn.srvEdit(K, '고친 이름', '고침')); run(3);
ok(A.call((fn) => fn.srvHas(K)) === 1 && A.g('shName') === '고친 이름', 'may change a server not theirs');
// ---- the copies on the computers
S.call((fn) => fn.serverJoin(K)); run(30, () => S.g('gState') === 2); run(1);
const BX = Math.floor(S.g('px')) + 2, BY = Math.floor(S.g('py')) + 2, BZ = Math.floor(S.g('pz')) + 2, GOLD = id('gold_block');
S.call((fn) => { S.sim.poke('netUserAct', 1); S.sim.poke('logOn', 1); fn.setBlock(BX, BY, BZ, GOLD); fn.setBlock(BX + 1, BY, BZ, GOLD); S.sim.poke('logOn', 0); S.sim.poke('netUserAct', 0); });
run(4);
A.call((fn) => fn.serverJoin(K)); run(30, () => A.g('gState') === 2);
B.call((fn) => fn.serverJoin(K)); run(30, () => B.g('gState') === 2);
run(2);
S.call((fn) => { fn.netLeave(); S.sim.poke('gState', 0); fn.menuGo(4); });
A.sim.poke('AT_확장프로그램', 1); B.sim.poke('AT_확장프로그램', 1);
run(15);
ok(A.g('AT_서버백업')[0] === 'SB' && B.g('AT_서버백업')[0] === 'SB', `copies kept: alice ${A.g('AT_서버백업').length}, bob ${B.g('AT_서버백업').length} items`);
const metaBefore = A.g('SY_m' + K).length, editsBefore = A.g('SY_e' + K).length;
// everybody leaves; then the shared lists are emptied (as an editor saving empty lists over them would)
A.call((fn) => { fn.netLeave(); A.sim.poke('gState', 0); fn.menuGo(4); });
B.call((fn) => { fn.netLeave(); B.sim.poke('gState', 0); fn.menuGo(4); });
run(3);
for (const n of ['SY_m' + K, 'SY_e' + K]) { srv.lists['?!' + n.slice(3)] = []; for (const c of cs) { const L = c.sim.R.syLists['?!' + n.slice(3)] || c.sim.R.syLists[n]; if (L) L.splice(0, L.length); } }
ok(A.call((fn) => fn.srvHas(K)) === 0, 'the server is gone from the shared lists');
run(25);
const back = [1, 2, 3, 4, 5, 6, 7, 8].filter(k => A.call((fn) => fn.srvHas(k)) === 1 && A.g('shName') === '고친 이름');
ok(back.length === 1, `put back from a copy: place ${back}, ${A.g('netMsg')}`);
ok(editsBefore >= 10 && back.length === 1 && A.g('SY_e' + back[0]).length === editsBefore && A.g('SY_m' + back[0]).length === metaBefore, `with its blocks (${editsBefore}) and settings (${metaBefore} lines)`);
const K2 = back[0];
// deleting asks first; then the copies go and it is not put back
A.sim.poke('selS', K2); A.sim.poke('delS', K2); A.call((fn) => fn.menuGo(10)); run(0.3);
ok(A.g('scr') === 10, 'delete asks first (screen 10)');
A.call((fn) => { fn.svBackDrop(K2); fn.srvDelete(K2); fn.menuGo(4); });
run(25);
ok([1, 2, 3, 4, 5, 6, 7, 8].every(k => A.call((fn) => fn.srvHas(k)) === 0 || A.g('shName') !== '고친 이름'), 'deleted on purpose: not put back by anyone');
ok(!B.g('AT_서버백업').includes('고친 이름'), "and bob's copy of it is dropped");
console.log(fails ? `${fails} FAILED` : 'all ok');

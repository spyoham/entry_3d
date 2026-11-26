// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.5, 11-26) A server deleted stays deleted (the user: "서버 삭제가 안먹히는 버그"): by its owner on the screen, by
// 코딩재미있어, not by another; after the owner's other window closed; with a still tab that held it coming back.
//   node test/srvdel35.mjs  (the harness is netmob.mjs's)
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

// every mob a game has: { e, t, x, y, z, hp, own (mine), key (owner nick:number) }
const mobs = (c) => {
  const ET = c.g('ET'), EX = c.g('EX'), EY = c.g('EY'), EZ = c.g('EZ'), EHP = c.g('EHP'), ERK = c.g('ERK'), ERU = c.g('ERU'), EUID = c.g('EUID'), NN = c.g('NNICK');
  const r = [];
  for (let i = 0; i < ET.length; i++) {
    if (+ET[i] <= 0 || +ET[i] === c.g('M_NETPLAYER')) continue;
    const own = +ERK[i] === 0;
    r.push({ e: i + 1, t: +ET[i], x: +EX[i], y: +EY[i], z: +EZ[i], hp: +EHP[i], own, key: (own ? c.nick : NN[+ERK[i] - 1]) + ':' + (own ? EUID[i] : ERU[i]) });
  }
  return r;
};
const byKey = (c) => new Map(mobs(c).map((m) => [m.key, m]));
const kind = (c, name) => c.g('MKEY').indexOf(name) + 1;

const SUPER = '코딩재미있어';
const listed = (c, name) => find(c, name) > 0;
// the screen's own way: the server picked on the list, 삭제, then 삭제 on the asking screen - by the mouse
const clickAt = (c, x, y) => { c.sim.mouse.x = x; c.sim.mouse.y = y; run(0.2); c.sim.click(); run(0.2); };
const delByScreen = (c, name) => {
  const k = find(c, name);
  c.call((fn) => fn.menuGo(4)); run(0.3);
  c.sim.poke('selS', k); run(0.3);
  clickAt(c, -40, -112);                 // 삭제 on the list
  const scr = c.g('scr');
  clickAt(c, -80, -70);                  // 삭제 on the asking screen
  run(0.5);
  return { k, scr };
};
let A = open('alice'), B = open('bob'), S = open(SUPER);
for (const c of [A, B, S]) c.sim.poke('AT_확장프로그램', 1);
for (const c of [A, B, S]) c.call((fn) => fn.svAck());
A.call((fn) => fn.srvCreate('가 서버', ' ', 2468, 1, '-')); run(1);
A.call((fn) => fn.srvCreate('나 서버', ' ', 1357, 1, '-')); run(1);
B.call((fn) => fn.srvCreate('다 서버', ' ', 99, 1, '-')); run(1);
ok(join(A, '가 서버'), 'alice plays on her server');
run(30);
A.call((fn) => { fn.netLeave(); A.sim.poke('gState', 0); A.sim.poke('uiMode', 0); fn.menuGo(4); });
run(3);
ok(S.g('AT_서버백업').length > 0, `${SUPER}'s game holds copies of the servers (${S.g('AT_서버백업').filter((x) => x === 'SB').length})`);
// 1. the owner deletes it by the screen
const d1 = delByScreen(A, '가 서버');
run(2);
ok(!listed(A, '가 서버'), `1. deleted by its owner on the screen (place ${d1.k}, asking screen ${d1.scr}): gone from her list`);
run(40);
ok(!listed(A, '가 서버') && !listed(B, '가 서버') && !listed(S, '가 서버'), `   40 s on it is on nobody's list (alice ${listed(A, '가 서버')}, bob ${listed(B, '가 서버')}, ${SUPER} ${listed(S, '가 서버')})`);
ok(listed(A, '나 서버') && listed(B, '다 서버'), '   the others are still there');
// 2. SUPER deletes another's server
const d2 = delByScreen(S, '다 서버');
run(40);
ok(!listed(A, '다 서버') && !listed(B, '다 서버') && !listed(S, '다 서버'), `2. ${SUPER} deletes bob's server: gone for all (asking screen ${d2.scr})`);
// 3. someone who is not the owner cannot
const d3 = delByScreen(B, '나 서버');
run(5);
ok(listed(A, '나 서버'), `3. bob cannot delete alice's (the screen stayed ${d3.scr})`);
// 4. the owner was on it a moment ago, in another game that was closed without leaving
let A2 = open('alice');
A2.sim.poke('AT_확장프로그램', 1); A2.call((fn) => fn.svAck());
ok(join(A2, '나 서버'), '4. alice, in a second window, plays on her other server');
run(5);
close(A2);
run(1);
const d4a = delByScreen(A, '나 서버');
const early = listed(A, '나 서버');
run(12);
const d4b = early ? delByScreen(A, '나 서버') : d4a;
run(5);
ok(!listed(A, '나 서버'), `   the window closed, she deletes it from the first: ${early ? 'not at once (her closed window still counted), 12 s later it goes' : 'at once'}`);
run(40);
ok(!listed(A, '나 서버') && !listed(S, '나 서버') && !listed(B, '나 서버'), '   and it stays gone');
// 5. a server deleted while its owner's other game still holds it as host (a still tab come back)
B.call((fn) => fn.srvCreate('라 서버', ' ', 4321, 1, '-')); run(1);
ok(join(B, '라 서버'), '5. bob plays on a new server');
run(8);
// (bob's tab stands still: it sends nothing and its line goes stale)
cs.splice(cs.indexOf(B), 1);
run(15);
const d5 = delByScreen(S, '라 서버');
run(3);
ok(!listed(S, '라 서버'), `   his tab still, ${SUPER} deletes it (asking screen ${d5.scr})`);
cs.push(B);
run(30);
ok(!listed(S, '라 서버') && !listed(A, '라 서버'), `   bob's tab comes back: the server stays deleted (${SUPER} ${listed(S, '라 서버')}, alice ${listed(A, '라 서버')}), bob is ${B.g('gState') === 2 ? 'still in it' : 'out'}`);
const names = (c) => { const r = []; for (let k = 1; k <= c.g('NSRV'); k++) if (c.call((fn) => fn.srvHas(k)) === 1) r.push(k + ':' + JSON.stringify(String(c.g('shName'))) + '/' + String(c.g('shOwner'))); return r.join(' '); };
ok(names(S) === '' && names(A) === '', '   no server is on the list at all now: [' + names(S) + '] [' + names(A) + ']');
// 6. the owner plays on it as its host, leaves, and deletes it at once
A.call((fn) => fn.srvCreate('마 서버', ' ', 777, 1, '-')); run(1);
ok(join(A, '마 서버'), '6. alice plays on a new server of hers');
{ const p = where(A).map(Math.floor); for (let i = 0; i < 5; i++) put(A, p[0] + 2 + i, p[1] + 1, p[2] + 2, A.g('ITKEY').indexOf('gold_block')); }
run(20);
A.call((fn) => { fn.netLeave(); A.sim.poke('gState', 0); A.sim.poke('uiMode', 0); fn.menuGo(4); });
run(0.5);
let tries = 0; while (listed(A, '마 서버') && tries < 20) { delByScreen(A, '마 서버'); run(1); tries++; }
ok(!listed(A, '마 서버'), '   she leaves and deletes it: gone after ' + tries + ' tries a second apart');
run(60);
ok(names(S) === '' && names(A) === '' && names(B) === '', '   a minute on no server is on any list: [' + names(S) + '] [' + names(A) + '] [' + names(B) + ']');
const C = open('carol'); run(25);
ok(names(C) === '', '   nor on the list of one who comes then: [' + names(C) + ']');
// 7. what such a leaving wrote before the fix - a header with no name and no owner - is no server, and is cleared
A.sim.poke('NMW', ['H^ ^ ^ ^0^0^1^16^0^7^-^ ^0^1^1^1^123456s9^0^0', 'O^someone']);
A.call((fn) => fn.metaPut(7));
run(3);
ok(names(A) === '' && names(B) === '' && String(B.g('SY_m7')[0]).startsWith('H^'), '7. a header with no owner in place 7 (left by the old game): on no list');
run(75);
ok(String(A.g('SY_m7')[0]).startsWith('X^') && String(B.g('SY_m7')[0]).startsWith('X^'), '   and cleared by a game with the list open, within 75 s: ' + String(B.g('SY_m7')[0]));
// 8. a header written back by a game that had not heard of the deleting: its id is among the deleted, so it is no server
B.call((fn) => fn.srvCreate('바 서버', ' ', 31, 1, '-')); run(2);
{ const kb = find(B, '바 서버'), head = String(B.g('SY_m' + kb)[0]);
  B.call((fn) => fn.srvDelete(kb)); run(2);
  A.sim.poke('NMW', [head]); A.call((fn) => fn.metaPut(kb)); run(3);
  ok(!listed(A, '바 서버') && !listed(B, '바 서버') && !listed(S, '바 서버'), '8. its header written back after it was deleted: still on no list');
  run(75);
  ok(String(B.g('SY_m' + kb)[0]).startsWith('X^'), '   and its place cleared again: ' + String(B.g('SY_m' + kb)[0]).slice(0, 12)); }
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

// (v3.3, 11-20) Who may change the game mode, /deop, and what a server keeps - in the node sim, against a model of
// Entry Sync that does what the real room server was seen to do (test/realsync.mjs): a list emptied is no
// longer in the room at all, so a page starting later has in it what the WORK was saved with.
// usage: node test/opfix.mjs [latency ms]
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 80)) / 1000;
const WALL0 = Date.UTC(2026, 10, 20, 3, 0, 0);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

class Server {
  constructor() { this.vars = {}; this.lists = {}; this.t = 0; this.q = []; this.k = 0; this.clients = []; }
  at(t, f) { this.q.push({ t, f, k: this.k++ }); }
  step(dt) { this.t += dt; this.q.sort((a, b) => a.t - b.t || a.k - b.k); while (this.q.length && this.q[0].t <= this.t) this.q.shift().f(); }
}
class Client {
  // baked: the lists the work's file holds (a work saved in the editor with the room's servers in its lists)
  constructor(srv, nick, baked = {}, consts = {}) {
    this.srv = srv; this.nick = nick; this.on = true; this.pend = new Map();
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, ...consts } });
    this.sim.R.nick = nick;
    this.sim.R.syNet = this;
    this.sim.R.wallNow = () => WALL0 + srv.t * 1000;
    this.starting = true;
    for (const [n, a] of Object.entries(baked)) this.applyList(n, a);
    srv.clients.push(this);
    srv.at(srv.t + 0.05, () => { this.sim.R.syLocal.SY_ = 1; });
    srv.at(srv.t + 0.5, () => {
      for (const [n, v] of Object.entries(srv.vars)) this.sim.R.syLocal[n] = v;
      // (only the lists the room has: one emptied is not there, and the page keeps its own)
      for (const [n, a] of Object.entries(srv.lists)) this.applyList(n, a);
      this.starting = false;
    });
    srv.at(srv.t + 4, () => { this.starting = false; });
  }
  applyList(n, a) { const L = this.sim.R.syLists[n]; if (L) L.splice(0, L.length, ...a); }
  send(f) {
    if (this.starting || !this.on) return;
    const s = this.srv;
    this.up = Math.max(s.t + LAT, (this.up || 0) + 1e-6);
    s.at(this.up, () => f(s));
  }
  relay(apply) {
    const s = this.srv;
    for (const c of s.clients) if (c !== this && c.on) { c.down = Math.max(s.t + LAT, (c.down || 0) + 1e-6); s.at(c.down, () => apply(c)); }
  }
  changed(n, a) { this.pend.set(n, a); }
  flush() { for (const [n, a] of this.pend) this.send((s) => { if (a.length) s.lists[n] = a; else delete s.lists[n]; this.relay((c) => c.applyList(n, a)); }); this.pend.clear(); }
  varChanged(n, v) { this.send((s) => { s.vars[n] = v; this.relay((c) => { c.sim.R.syLocal[n] = v; }); }); }
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
const open = (nick, baked) => { const c = new Client(srv, nick, baked); cs.push(c); run(1); c.sim.poke('AT_확장프로그램', 1); c.call((fn) => { fn.netEnter(); fn.menuGo(4); }); run(6); return c; };
const find = (c, name) => { const n = c.g('NSRV'); for (let k = 1; k <= n; k++) if (c.call((fn) => fn.srvHas(k)) === 1 && String(c.g('shName')) === name) return k; return 0; };
const names = (c) => { const r = []; const n = c.g('NSRV'); for (let k = 1; k <= n; k++) if (c.call((fn) => fn.srvHas(k)) === 1) r.push(String(c.g('shName'))); return r; };
const join = (c, name) => { const k = find(c, name); const e = c.call((fn) => fn.netJoinCheck(k)); if (String(e).length > 1) console.log('   join', c.nick, k, e); c.call((fn) => fn.serverJoin(k)); return run(60, () => c.g('gState') === 2 && c.g('netSt') === 2) && run(2) !== null; };
const leave = (c) => { c.call((fn) => { fn.netLeave(); c.sim.poke('gState', 0); fn.txClear(); fn.menuGo(4); }); run(2); };
const cmd = (c, t) => { c.call((fn) => { c.sim.poke('netUserAct', 1); fn.runCommand(t); c.sim.poke('netUserAct', 0); }); return String(c.g('CHT').slice(-1)[0]); };
const count = (c, item) => { const id = c.g('ITKEY').indexOf(item), I = c.g('INVI'), N = c.g('INVN'); let n = 0; for (let i = 0; i < I.length; i++) if (+I[i] === id) n += +N[i]; return n; };
const put = (c, x, y, z, b) => c.call((fn) => { c.sim.poke('netUserAct', 1); c.sim.poke('logOn', 1); fn.setBlock(x, y, z, b); c.sim.poke('logOn', 0); c.sim.poke('netUserAct', 0); });
// the game menu's mode button, clicked (hud.js pauseScreen: x -200 .. -10, y 10 .. -8)
const modeClick = (c) => { c.sim.poke('uiMode', 6); run(0.1); c.sim.mouse.x = -105; c.sim.mouse.y = 1; c.sim.click(); run(0.1); c.sim.poke('uiMode', 0); run(0.1); return c.g('gameMode'); };

// ------------------------------------------------------------------ A. the game mode and the commands
let A = open('alice'), B = open('bob');
const K = A.call((fn) => fn.srvCreate('권한 서버', ' ', 1357, 0, '-'));
run(1);
ok(join(A, '권한 서버') && join(B, '권한 서버'), 'alice (the owner) and bob in a survival server');
ok(B.call((fn) => fn.modeMay()) === 0 && A.call((fn) => fn.modeMay()) === 1, 'bob may not change his mode, alice may');
ok(modeClick(B) === 0, 'bob clicks the game menu\'s mode button: still survival');
let r = cmd(B, '/gamemode creative'); ok(B.g('gameMode') === 0 && r.includes('관리자만'), 'bob\'s /gamemode: ' + r);
r = cmd(B, '/give @s diamond 3'); ok(count(B, 'diamond') === 0 && r.includes('관리자만'), 'bob\'s /give: ' + r);
r = cmd(B, '/time set day'); ok(r.includes('관리자만'), 'bob\'s /time: ' + r);
r = cmd(B, '/execute as @s run gamemode creative'); ok(B.g('gameMode') === 0, 'bob\'s /execute ... run gamemode: ' + r);
r = cmd(B, '/op bob'); run(2); ok(A.call((fn) => fn.isOp('bob')) === 0, 'bob\'s /op bob: ' + r);
ok(modeClick(A) === 1, 'alice clicks the button: creative');
cmd(A, '/gamemode survival');
// an op
r = cmd(A, '/op bob'); run(3);
ok(B.call((fn) => fn.isOp('bob')) === 1 && B.call((fn) => fn.modeMay()) === 1, 'alice\'s /op bob: ' + r);
ok(modeClick(B) === 1, 'bob the op clicks the button: creative');
r = cmd(B, '/gamemode survival'); ok(B.g('gameMode') === 0, 'bob the op\'s /gamemode survival: ' + r);
// no op any more
r = cmd(A, '/deop bob'); run(3);
ok(A.call((fn) => fn.isOp('bob')) === 0 && B.call((fn) => fn.isOp('bob')) === 0 && r.includes('뺐습니다'), 'alice\'s /deop bob: ' + r);
ok(modeClick(B) === 0, 'bob, no op any more, clicks the button: still survival');
r = cmd(B, '/gamemode creative'); ok(B.g('gameMode') === 0 && r.includes('관리자만'), 'his /gamemode: ' + r);
r = cmd(A, '/deop alice'); run(2); ok(A.call((fn) => fn.isOp('alice')) === 1 && r.includes('주인'), 'the owner can not be taken out: ' + r);
r = cmd(B, '/help deop'); ok(r.includes('/deop'), '/help deop: ' + r.slice(0, 60));
// a mode given by one who may is kept over a visit; one in a record from before 11-20 is not (for one who may not)
cmd(A, '/gamemode creative bob'); run(3);
ok(B.g('gameMode') === 1, 'alice\'s /gamemode creative bob: bob is in creative');
leave(B); run(3);
ok(join(B, '권한 서버') && B.g('gameMode') === 1, 'bob back: still creative (given by the owner): ' + B.g('gameMode'));
leave(B); run(3);
// (the record as v3.3 wrote it: 16 fields)
const H = A;
const old = H.call((fn) => { const MUN = H.g('MUN'), MUD = H.g('MUD'); return String(MUD[MUN.indexOf('bob')]); });
ok(old.split('^').length === 17 && old.split('^')[8] === '1', `bob's record has the mark (${old.split('^').length} fields, mode ${old.split('^')[8]})`);
H.call((fn) => { fn.hostKeepUser('bob', old.split('^').slice(0, 16).join('^')); fn.metaWrite(H.g('netSrv')); });
run(3);
ok(join(B, '권한 서버') && B.g('gameMode') === 0, 'a record from before 11-20 with creative in it, bob no op: survival again (' + B.g('gameMode') + ')');
cmd(A, '/op bob'); run(3);
cmd(B, '/gamemode creative'); run(2);
leave(B); run(3);
const old2 = H.call((fn) => { const MUN = H.g('MUN'), MUD = H.g('MUD'); return String(MUD[MUN.indexOf('bob')]); });
H.call((fn) => { fn.hostKeepUser('bob', old2.split('^').slice(0, 16).join('^')); fn.metaWrite(H.g('netSrv')); });
run(3);
ok(join(B, '권한 서버') && B.g('gameMode') === 1, 'the same for an op: creative kept (' + B.g('gameMode') + ')');
cmd(A, '/deop bob'); run(2);

// ------------------------------------------------------------------ B. what the server keeps
// the host's own things 1.5 s before its tab closes
const host = A.g('netHost') === 1 ? A : B, other = host === A ? B : A;
console.log('   host ' + host.nick);
leave(other); run(2);
host.call((fn) => { const q = fn.addItem(host.g("ITKEY").indexOf("iron_ingot"), 5, 0); });
run(1.5);
close(host);
run(12);
let H2 = open(host.nick);
ok(join(H2, '권한 서버') && count(H2, 'iron_ingot') === 5, `the host's iron_ingots got 1.5 s before its tab closed are there (${count(H2, 'iron_ingot')})`);
leave(H2); run(3);
for (const c of cs.slice()) close(c);
run(10);
// a server deleted: its place says so, and a page whose work has the server in its lists does not see it
A = open('alice');
const kd = find(A, '권한 서버');
const fileM = (srv.lists['SY_m' + kd] || []).slice(), fileE = (srv.lists['SY_e' + kd] || []).slice();
ok(fileM.length > 0 && String(fileM[0]).startsWith('H^'), 'the server is in the room: ' + fileM.length + ' lines');
A.call((fn) => { fn.svBackDrop(kd); fn.srvDelete(kd); });
run(2);
ok(!names(A).includes('권한 서버'), 'deleted: not in alice\'s list');
ok((srv.lists['SY_m' + kd] || []).length === 1 && (srv.lists['SY_e' + kd] || []).length === 5, `its place in the room is not empty: ${JSON.stringify(srv.lists['SY_m' + kd])} ${JSON.stringify(srv.lists['SY_e' + kd])}`);
close(A); run(10);
const baked = { ['SY_m' + kd]: fileM, ['SY_e' + kd]: fileE };
A = open('alice', baked);
ok(!names(A).includes('권한 서버'), 'a page whose work was saved with the server in its lists: not back (' + JSON.stringify(names(A)) + ')');
run(40);
ok(!names(A).includes('권한 서버'), '40 s later (the copies checked): not back');
// a new server in that place: none of the old one's blocks
const K3 = A.call((fn) => fn.srvCreate('새 서버', ' ', 99, 1, '-'));
run(1);
ok(K3 === kd, 'a new server takes the emptied place (' + K3 + ')');
close(A); run(10);
A = open('alice', baked);
ok(names(A).includes('새 서버') && !names(A).includes('권한 서버'), 'after a reload the new server is there, the old one is not: ' + JSON.stringify(names(A)));
ok(join(A, '새 서버'), 'alice in the new server');
const EDD = A.g('EDD') || [];
ok((srv.lists['SY_e' + kd] || []).length === 5 && !EDD.some((d) => +d === 9), `its record is the one cell of no world (${(srv.lists['SY_e' + kd] || []).length}), and nothing of it in the game's log (${EDD.length} entries)`);
put(A, 5, 70, 5, A.g('ITKEY').indexOf('gold_block')); run(2);
ok((srv.lists['SY_e' + kd] || []).length === 10, 'a block put: the record grows (' + (srv.lists['SY_e' + kd] || []).length + ')');
for (const c of cs.slice()) close(c);

// ------------------------------------------------------------------ C. a single game
for (const cheats of [0, 1]) {
  const sim = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 0, ANIMALS: 0 } });
  let n = 0; while (sim.peek('gState') !== 2 && n < 5000) { sim.frame(); n++; }
  for (let i = 0; i < 10; i++) sim.frame();
  sim.poke('cheatsOn', cheats); sim.poke('uiMode', 6);
  for (let i = 0; i < 3; i++) sim.frame();
  sim.mouse.x = -105; sim.mouse.y = 1; sim.click();
  for (let i = 0; i < 3; i++) sim.frame();
  ok(sim.peek('gameMode') === cheats, `a single world with commands ${cheats ? 'allowed' : 'not allowed'}: the button ${cheats ? 'changes the mode' : 'does nothing'} (${sim.peek('gameMode')})`);
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

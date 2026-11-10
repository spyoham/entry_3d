// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// usage: node test/mpred.mjs
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
// (v2.4.4) redstone, TNT, commands and blocks on a server: the same on every screen, once
const A = new Client(srv, 'alice'); cs.push(A);
const B = new Client(srv, 'bob'); cs.push(B);
run(1);
A.call((fn) => { fn.netEnter(); fn.menuGo(4); }); B.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(6);
A.sim.poke('AT_확장프로그램', 1); B.sim.poke('AT_확장프로그램', 1);
const K = A.call((fn) => fn.srvCreate('회로 서버', '시험', 1234, 1, '-'));
run(1);
A.call((fn) => fn.serverJoin(K)); run(60, () => A.g('gState') === 2);
B.call((fn) => fn.serverJoin(K)); run(60, () => B.g('gState') === 2);
run(3);
const KEY = A.g('ITKEY'), ID = (k) => KEY.indexOf(k);
const blk = (C, x, y, z) => C.call((fn) => fn.blockAt(x, y, z));
const key = (C, x, y, z) => KEY[blk(C, x, y, z)];
// a command as the player (it goes out as the player's doing)
const cmd = (C, t) => { C.sim.poke('netUserAct', 1); C.call((fn) => fn.runCommand(t)); C.sim.poke('netUserAct', 0); };
const X = Math.floor(A.g('px')) + 4, Y = Math.floor(A.g('py')) + 10, Z = Math.floor(A.g('pz')) + 4;
cmd(A, '/op bob'); run(3);
for (const C of [A, B]) { C.sim.poke('px', X + 0.5); C.sim.poke('py', Y + 6); C.sim.poke('pz', Z - 6); C.sim.poke('flying', 1); }
cmd(A, `/fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y + 6} ${Z + 8} air`);
cmd(A, `/fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y - 1} ${Z + 8} stone`);
run(3);
const box = (C) => { let r = ''; for (let x = X - 8; x <= X + 8; x++) for (let z = Z - 8; z <= Z + 8; z++) r += blk(C, x, Y - 1, z) + ','; return r; };
ok(box(A) === box(B) && key(B, X, Y - 1, Z) === 'stone' && key(B, X + 8, Y - 1, Z + 8) === 'stone', 'a /fill of 289 blocks by alice: all of them on bob\'s screen too');
// 1 a button bob presses lights the lamp on alice's screen too
cmd(A, `/setblock ${X} ${Y} ${Z} spark_lamp`); cmd(A, `/setblock ${X + 1} ${Y} ${Z} stone`); run(1);
B.sim.poke('netUserAct', 1); B.call((fn) => { fn.setBlock(X - 1, Y, Z, fn.blockAt(X - 1, Y, Z)); }); B.sim.poke('netUserAct', 0);
cmd(B, `/setblock ${X} ${Y} ${Z - 1} stone_button[face=wall,facing=north]`); run(1);
B.sim.poke('netUserAct', 1); B.call((fn) => fn.buttonPress(X, Y, Z - 1)); B.sim.poke('netUserAct', 0);
let litA = 0; for (let i = 0; i < 40; i++) { run(1 / 60); if (key(A, X, Y, Z) === 'spark_lamp_on') litA = 1; }
ok(litA === 1, 'bob presses a button: the lamp lights on alice\'s screen');
// 2 TNT lit by alice: the same crater on both screens, its blocks dropped once
cmd(A, `/fill ${X - 6} ${Y} ${Z + 2} ${X + 6} ${Y + 4} ${Z + 8} dirt`); run(2);
cmd(A, `/setblock ${X} ${Y + 2} ${Z + 5} tnt`); run(1);
A.sim.poke('pickB', ID('tnt')); A.sim.poke('pickX', X); A.sim.poke('pickY', Y + 2); A.sim.poke('pickZ', Z + 5);
A.sim.poke('netUserAct', 1); A.call((fn) => fn.ignite()); A.sim.poke('netUserAct', 0);
run(6);
const crater = (C) => { let r = '', n = 0; for (let x = X - 6; x <= X + 6; x++) for (let y = Y; y <= Y + 4; y++) for (let z = Z + 2; z <= Z + 8; z++) { const b = blk(C, x, y, z); r += b + ','; if (b === 0) n++; } return [r, n]; };
const [ca, na] = crater(A), [cb, nb] = crater(B);
ok(na > 20 && ca === cb, `alice's TNT: ${na} blocks gone on her screen, the same crater on bob's (${nb})`);
const drops = (C) => C.g('IID').filter((q) => q > 0).length;
ok(drops(A) > 0 && drops(B) === 0, `its blocks fell as items once: alice ${drops(A)}, bob ${drops(B)}`);
// 3 a dispenser fed by a lever: one item, on the host's screen only, and its chest the same on both
cmd(A, `/setblock ${X + 4} ${Y} ${Z - 4} dispenser[facing=north]`); run(1);
for (const C of [A, B]) C.call((fn) => { fn.chestAt(X + 4, Y, Z - 4); const c = C.g('cFound'); C.g('CHI')[(c - 1) * 27] = ID('cobblestone'); C.g('CHN')[(c - 1) * 27] = 5; });
for (const C of [A, B]) { const I = C.g('IID'); for (let i = 0; i < I.length; i++) I[i] = 0; }
const i0a = drops(A), i0b = drops(B);
cmd(B, `/setblock ${X + 5} ${Y} ${Z - 4} lever[powered=true]`); run(3);
const left = (C) => C.call((fn) => { fn.chestFind(X + 4, Y, Z - 4); const c = C.g('cFound'); return C.g('CHN')[(c - 1) * 27]; });
ok(drops(A) + drops(B) - i0a - i0b === 1, `one cobblestone came out in all (alice +${drops(A) - i0a}, bob +${drops(B) - i0b})`);
ok(left(A) === 4 && left(B) === 4, `4 left in it on both screens (${left(A)}, ${left(B)})`);
// 4 a door a lever holds open is open for one who joins later
cmd(A, `/setblock ${X - 4} ${Y} ${Z - 4} iron_door`); cmd(A, `/setblock ${X - 4} ${Y + 1} ${Z - 4} iron_door[half=upper]`); run(1);
cmd(A, `/setblock ${X - 5} ${Y} ${Z - 4} lever[powered=true]`); run(3);
const open = (C) => Math.floor(C.g('BVAR')[blk(C, X - 4, Y, Z - 4)] / 8);
ok(open(A) === 1 && open(B) === 1, 'a lever opens an iron door on both screens');
const C3 = new Client(srv, 'carol'); cs.push(C3);
run(1); C3.call((fn) => { fn.netEnter(); fn.menuGo(4); }); run(6); C3.sim.poke('AT_확장프로그램', 1);
C3.call((fn) => fn.serverJoin(K)); run(60, () => C3.g('gState') === 2);
C3.sim.poke('px', X + 0.5); C3.sim.poke('py', Y + 6); C3.sim.poke('pz', Z - 6); C3.sim.poke('flying', 1);
run(8);
ok(key(C3, X - 4, Y, Z - 4) === key(A, X - 4, Y, Z - 4) && open(C3) === 1, `carol joins later: the door is open for her too (${key(C3, X - 4, Y, Z - 4)})`);
// 5 a block bob puts far away (in a chunk alice has not made) is there when alice goes
const FX = X + 300, FZ = Z + 300;
B.sim.poke('px', FX + 0.5); B.sim.poke('pz', FZ + 0.5); B.sim.poke('py', 90); run(8);
cmd(B, `/setblock ${FX} 80 ${FZ} gold_block`); run(2);
ok(A.call((fn) => fn.cOK(FX, FZ)) === 0, 'alice has not made that chunk');
A.sim.poke('px', FX + 0.5); A.sim.poke('pz', FZ + 0.5); A.sim.poke('py', 90); run(8);
ok(key(A, FX, 80, FZ) === 'gold_block', 'alice goes there: bob\'s gold block is there (' + key(A, FX, 80, FZ) + ')');
// 6 a non-op cannot change a command block on a server
C3.sim.poke('gameMode', 1);
C3.call((fn) => fn.commandBlockEdit(X, Y, Z));
ok(String(C3.g('msgText')).includes('관리자') && C3.g('CBT').length === 0, 'carol (not an op) cannot put a command into a command block');
console.log(fails ? fails + ' FAILED' : 'all ok');

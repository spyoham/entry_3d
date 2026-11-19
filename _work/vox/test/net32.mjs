// (v3.2) on a server: thrown things and rockets seen, the host's hopper and another's thing, a piston's
// blocks in the record, one warden for all: node test/net32.mjs
// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.1) things on the ground shared, events past 12 a frame, arrows seen, one click on another's mob, the settings' stamp,
// the record caught up with after joining and after standing still: node test/net31.mjs [latency ms]
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
    for (const c of cs) if (c.on && !c.frozen) c.frame();
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
const K = A.call((fn) => fn.srvCreate('삼점이', ' ', 2468, 0, '-'));
run(1);
ok(join(A, '삼점이') && join(B, '삼점이'), 'alice and bob in');
const host = () => (A.g('netHost') === 1 ? A : B);
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
cmd(A, '/op bob'); cmd(A, '/gamerule doDaylightCycle false'); cmd(A, '/time set day'); cmd(A, '/gamerule doMobSpawning false');
cmd(A, '/fill 2 44 2 22 44 14 stone'); cmd(A, '/fill 2 45 2 22 48 14 air'); cmd(A, '/tp @s 6.5 45 8.5'); run(1); cmd(A, '/tp bob 18.5 45 8.5'); run(3);
const items = (c) => { const I = c.g('IID'), N = c.g('INN'), R = c.g('IRK'); const r = []; for (let i = 0; i < I.length; i++) if (+I[i] > 0) r.push({ id: +I[i], n: +N[i], mine: +R[i] === 0 }); return r; };

// 1. a snowball alice throws flies on bob's screen, harmless there; a rocket goes up with the same colour
A.call((fn) => fn.throwFrom(1, 6.5, 46.5, 8.5, 1, 0, 0));
run(0.3);
{ const AON = B.g('AON'), APW = B.g('APW'); ok(AON.some((v, i) => +v === 7 && +APW[i] < 0), `alice's snowball flies on bob's screen (kinds there: ${AON.filter((v) => +v > 0).join(',')})`); }
run(3);
const ra = A.call((fn) => fn.fireworkAdd(8.5, 45.2, 8.5));
run(0.3);
{ const AON = B.g('AON'), APW = B.g('APW'), AEN = B.g('AEN'), i = AON.findIndex((v, k) => +v === 10 && +APW[k] < 0);
  ok(i >= 0 && +AEN[i] === +A.g('AEN')[ra - 1] && +AEN[i] >= 1, `alice's rocket goes up on bob's screen, the same colour (${i >= 0 ? AEN[i] : '-'} / ${A.g('AEN')[ra - 1]})`); }
run(4);

// 2. the host's hopper takes a thing another player dropped on it
const H = host(), O = H === A ? B : A;
cmd(H, '/setblock 14 44 10 hopper'); run(1);
O.call((fn) => fn.dropItem(id('diamond'), 2, 0, 14.5, 45.3, 10.5, 0));
run(5);
H.call((fn) => fn.chestFind(14, 44, 10));
{ const c = H.g('cFound'); let got = 0; if (c > 0) { const CHI = H.g('CHI'), CHN = H.g('CHN'); for (let k = 0; k < 5; k++) if (+CHI[(c - 1) * 27 + k] === id('diamond')) got += +CHN[(c - 1) * 27 + k]; }
  ok(got === 2, `the host's hopper has the other's 2 diamonds: ${got}`);
  ok(items(O).filter((t) => t.id === id('diamond')).length === 0 && items(H).filter((t) => t.id === id('diamond')).length === 0, 'and they lie on neither screen'); }

// 3. a piston pushes a block: someone who comes later has it where it was pushed to
cmd(O, '/setblock 10 45 4 piston[facing=east]'); cmd(O, '/setblock 11 45 4 oak_planks'); run(1); cmd(O, '/setblock 9 45 4 spark_block');
run(6);
ok(blockSeen(A, 12, 45, 4) === id('oak_planks') && blockSeen(B, 12, 45, 4) === id('oak_planks'), 'the planks pushed on both screens');
let C = open('carol');
ok(join(C, '삼점이'), 'carol comes later');
run(4);
ok(blockSeen(C, 12, 45, 4) === id('oak_planks') && blockSeen(C, 11, 45, 4) !== id('oak_planks') && blockSeen(C, 11, 45, 4) !== 0, `carol has the planks where they were pushed to, the arm out (12: ${blockSeen(C, 12, 45, 4)}, 11: ${blockSeen(C, 11, 45, 4)})`);
close(C); run(10);

// 4. the void: one warden for both; a blow from the one who does not run it; its death for everyone
const toVoid = (c) => { c.call((fn) => fn.startTravel(2, 0.5, -47.5, 2)); };
toVoid(A); run(40, () => A.g('gState') === 2 && A.g('dim') === 2); run(4);
toVoid(B); run(40, () => B.g('gState') === 2 && B.g('dim') === 2); run(6);
// (to the middle of the island: the pillars' chunks are made there)
cmd(A, '/tp @s 0.5 44 6.5'); cmd(B, '/tp @s 4.5 44 0.5'); run(8);
const wardens = (c) => { const ET = c.g('ET'), R = c.g('ERK'); const r = []; for (let i = 0; i < ET.length; i++) if (+ET[i] === 10) r.push({ e: i + 1, mine: +R[i] === 0, hp: +c.g('EHP')[i] }); return r; };
let wa = wardens(A), wb = wardens(B);
ok(wa.length === 1 && wb.length === 1 && (wa[0].mine ? 1 : 0) + (wb[0].mine ? 1 : 0) === 1, `one warden, run by one of them (alice ${JSON.stringify(wa)}, bob ${JSON.stringify(wb)})`);
const OW = wa[0] && wa[0].mine ? A : B, GU = OW === A ? B : A;
A.sim.poke('gameMode', 1); B.sim.poke('gameMode', 1);
const hit = (c, n) => { const w = wardens(c)[0]; if (w) c.call((fn) => { c.sim.poke('pKill', 1); c.g('EHURT')[w.e - 1] = 0; fn.mobHurt(w.e, n, 0, 0); c.sim.poke('pKill', 0); }); };
const wf = (c, k) => { const w = wardens(c)[0]; return w ? +c.g(k)[w.e - 1] : -1; };
// (v3.3) it is hurt from the start, the crystals standing: the other's blow counts on both screens, and the
// crystal that mends it (the beam's end) is the same one on both
ok(A.g('nCrystal') === 8 && B.g('nCrystal') === 8, `eight crystals stand on both screens (${A.g('nCrystal')}, ${B.g('nCrystal')})`);
if (wardens(OW)[0]) { OW.g('EHP')[wardens(OW)[0].e - 1] = 100; } run(1.5);
hit(GU, 30); run(2);
ok(wardens(OW)[0] && wardens(OW)[0].hp >= 70 && wardens(OW)[0].hp <= 80 && wardens(GU)[0] && Math.abs(wardens(GU)[0].hp - wardens(OW)[0].hp) <= 3, `crystals standing, the other's blow of 30 counts (and it mends): ${JSON.stringify(wardens(OW))}, ${JSON.stringify(wardens(GU))}`);
ok(wf(OW, 'EVAR') >= 1 && wf(GU, 'EVAR') === wf(OW, 'EVAR'), `the beam goes to the same crystal on both screens (${wf(OW, 'EVAR')}, ${wf(GU, 'EVAR')})`);
// (v3.3) it sits: every screen knows (arrows glance off it there); its breath on the ground is seen by both
OW.sim.poke('bossPh', 3); OW.sim.poke('bossT', 3); OW.sim.poke('wdShot', 1); run(1.5);
ok(wf(OW, 'EST') === 2 && wf(GU, 'EST') === 2, `sitting on its owner's screen, it sits on the other's too (${wf(OW, 'EST')}, ${wf(GU, 'EST')})`);
const clouds = (c) => c.g('AON').filter((v) => +v === 19).length;
OW.call((fn) => fn.wardenCloud(2.5, 44, 2.5)); run(1);
ok(clouds(OW) === 1 && clouds(GU) === 1, `a cloud of its breath lies on both screens (${clouds(OW)}, ${clouds(GU)})`);
OW.sim.poke('bossPh', 0); OW.sim.poke('bossT', 0); run(3);
ok(clouds(OW) === 0 && clouds(GU) === 0, 'and is gone after its 3 s');
// the crystals away (as broken by hand)
for (let k = 0; k < 8; k++) { OW.call((fn) => fn.pillarAt(k)); cmd(OW, `/setblock ${OW.g('pilX')} ${OW.g('pilH') + 1} ${OW.g('pilZ')} air`); }
run(3);
ok(A.g('nCrystal') === 0 && B.g('nCrystal') === 0, `no crystal on either screen (${A.g('nCrystal')}, ${B.g('nCrystal')})`);
if (wardens(OW)[0]) { OW.g('EHP')[wardens(OW)[0].e - 1] = 200; } run(1.5);
hit(GU, 30); run(2);
ok(wardens(OW)[0] && wardens(OW)[0].hp === 170 && wardens(GU)[0] && wardens(GU)[0].hp === 170, `the other's blow of 30 took it to 170 on both (${JSON.stringify(wardens(OW))}, ${JSON.stringify(wardens(GU))})`);
if (wardens(OW)[0]) { OW.g('EHP')[wardens(OW)[0].e - 1] = 10; } run(1);
hit(GU, 30); run(4);
ok(A.g('bossDead') === 1 && B.g('bossDead') === 1 && wardens(A).length === 0 && wardens(B).length === 0, `killed: gone on both screens (dead ${A.g('bossDead')}, ${B.g('bossDead')})`);
ok(items(GU).some((t) => t.id === id('warden_heart')), `the one who killed it has its heart lying by (${JSON.stringify(items(GU))})`);
run(3);
// (v3.3) its egg on the gate home, on both screens and in the server's record
const eggAt = (c) => { let r = -1; c.call((fn) => { fn.findTop(0, 0); }); const ty = c.g('topY'); c.call((fn) => { r = fn.blockAt(0, ty, 0) === id('warden_egg') && fn.blockAt(1, ty - 1, 0) === 56 ? 1 : 0; }); return r; };
ok(eggAt(A) === 1 && eggAt(B) === 1, `the gate home with the egg on it, on both screens (${eggAt(A)}, ${eggAt(B)})`);
ok(host().g('shBoss') === 1, 'the server keeps that it is gone');
C = open('dave'); ok(join(C, '삼점이'), 'dave comes later'); run(2);
ok(C.g('bossDead') === 1, `and for dave it is gone too (${C.g('bossDead')})`);
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

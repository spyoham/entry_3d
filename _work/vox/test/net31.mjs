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
const K = A.call((fn) => fn.srvCreate('삼점일', ' ', 2468, 0, '-'));
run(1);
ok(join(A, '삼점일') && join(B, '삼점일'), 'alice and bob in');
const host = () => (A.g('netHost') === 1 ? A : B);
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
cmd(A, '/op bob'); cmd(A, '/gamerule doDaylightCycle false'); cmd(A, '/time set day'); cmd(A, '/gamerule doMobSpawning false');
cmd(A, '/fill 2 44 2 22 44 14 stone'); cmd(A, '/fill 2 45 2 22 48 14 air'); cmd(A, '/tp @s 6.5 45 8.5'); run(1); cmd(A, '/tp bob 18.5 45 8.5'); run(3);
const items = (c) => { const I = c.g('IID'), N = c.g('INN'), R = c.g('IRK'); const r = []; for (let i = 0; i < I.length; i++) if (+I[i] > 0) r.push({ id: +I[i], n: +N[i], mine: +R[i] === 0 }); return r; };

// 1. a thing bob drops: alice sees it, and the one who walks onto it gets it - once
B.call((fn) => fn.dropItem(id('diamond'), 3, 0, 12.5, 45.2, 8.5, 0));
run(2);
const ia = items(A).filter((t) => t.id === id('diamond')), ib = items(B).filter((t) => t.id === id('diamond'));
ok(ib.length === 1 && ib[0].mine && ia.length === 1 && !ia[0].mine && ia[0].n === 3, `bob's 3 diamonds lie on alice's screen too, as his (${JSON.stringify(ia)})`);
cmd(A, '/tp @s 12.5 45 8.5'); run(3);
ok(count(A, 'diamond') === 3 && count(B, 'diamond') === 0, `alice walked onto them and has them (alice ${count(A, 'diamond')}, bob ${count(B, 'diamond')})`);
ok(items(A).filter((t) => t.id === id('diamond')).length === 0 && items(B).filter((t) => t.id === id('diamond')).length === 0, 'and they lie on neither screen');
cmd(A, '/tp @s 6.5 45 8.5'); run(1);

// 2. more than 12 events in one frame all arrive
for (let i = 0; i < 20; i++) put(A, 3 + i, 47, 3, id('iron_block'));
run(2);
const got = [...Array(20).keys()].filter((i) => B.call((fn) => fn.blockAt(3 + i, 47, 3)) === id('iron_block')).length;
ok(got === 20, `20 blocks put in one frame: bob has ${got}`);
run(4);
ok(A.g('EVI').length <= 12, `and the line is short again after 2 s (${A.g('EVI').length} events)`);

// 3. an arrow alice shoots flies on bob's screen, harmless there
A.call((fn) => fn.arrowShoot(6.5, 46.5, 8.5, 18.5, 46.5, 8.5, 1));
run(0.3);
const AON = B.g('AON'), APW = B.g('APW');
ok(AON.some((v, i) => +v === 2 && +APW[i] < 0), `alice's arrow flies on bob's screen (${AON.filter((v) => +v > 0).length} arrows there)`);
run(3);

// 4. one click on another's mob: it comes and the click goes on (shears on alice's sheep)
console.log('   ' + cmd(A, '/summon sheep 16.5 45 8.5'));
run(2);
const sheepK = B.g('MKEY').indexOf('sheep') + 1;
const eB = B.g('ET').findIndex((t, i) => +t === sheepK && +B.g('ERK')[i] > 0) + 1;
ok(eB > 0, 'bob sees alice\'s sheep');
const shears = B.g('ITKEY').findIndex((k, i) => +B.g('ITTK')[i] === 5);
cmd(A, `/give bob ${B.g('ITKEY')[shears]} 1`); run(2);
const slot = B.g('INVI').findIndex((v) => +v === shears) + 1;
B.sim.poke('hotSel', slot);
// (bob looks at the sheep: the way that picks it)
cmd(A, '/tp bob 18.5 45 8.5'); run(1);
let seen = false;
const sx = () => +B.g('EX')[eB - 1], sz = () => +B.g('EZ')[eB - 1];
for (let i = 0; i < 400 && !seen; i++) {
  const dx = sx() - B.g('px'), dz = sz() - B.g('pz'), a = Math.atan2(dx, dz) * 180 / Math.PI;
  for (const yw of [a, -a, a + 180, 180 - a]) { if (seen) break; for (const pt of [-20, -10, 0, 10, 20, 35]) { B.sim.poke('yaw', yw); B.sim.poke('pitch', pt); run(1 / 60); if (+B.g('mobPick') === eB) { seen = true; break; } } }
  if (Math.hypot(dx, dz) > 3.5) { cmd(A, `/tp bob ${(sx() + 2).toFixed(1)} 45 ${sz().toFixed(1)}`); run(0.5); }
}
ok(seen, `bob looks at the sheep (yaw ${(+B.g('yaw')).toFixed(0)} pitch ${B.g('pitch')})`);
B.sim.poke('placeCool', 0); B.call((fn) => fn.useKey0());
run(1.5);
const st = items(B).filter((t) => t.id === 32 && t.mine).length + count(B, KEY[32]), own = +B.g('ERK')[eB - 1] === 0 && +B.g('ET')[eB - 1] === sheepK;
ok(own && st > 0, `the sheep is bob's and shorn with the one click (owner bob: ${own}, wool ${st})`);
B.sim.poke('mobPick', 0);

// 5. two writers of the settings with the same revision: seen by the stamp
const H = host(), O = H === A ? B : A;
run(2);
H.call((fn) => fn.hostWish('alice', 'op^zed'));
O.call((fn) => fn.hostWish('alice', 'op^yan'));
run(0.5);
ok(H.g('MOP').includes('yan'), `another's write with the host's own revision was read by the host (its stamp): ${JSON.stringify(H.g('MOP'))} rev ${O.g('shRev')}/${H.g('shRev')}`);
run(3);

// 6. a block put just before carol joins (heard on the title, not yet in the record she reads)
const C = open('carol');
const kc = find(C, '삼점일');
put(O, 8, 46, 4, id('gold_block'));
run(3 / 60);
C.call((fn) => fn.serverJoin(kc));
ok(run(60, () => C.g('gState') === 2), 'carol in');
run(5);
ok(C.call((fn) => fn.blockAt(8, 46, 4)) === id('gold_block'), `carol has the block put as she came (${C.call((fn) => fn.blockAt(8, 46, 4))})`);

// 7. a screen that stood still 6 s while 30 blocks were put: caught up from the record
C.frozen = true;
for (let i = 0; i < 30; i++) { put(O, 3 + (i % 15), 46 + Math.floor(i / 15), 12, id('glass')); run(0.2); }
run(1);
C.frozen = false;
run(5);
const have = [...Array(30).keys()].filter((i) => C.call((fn) => fn.blockAt(3 + (i % 15), 46 + Math.floor(i / 15), 12)) === id('glass')).length;
ok(have === 30, `carol, back from standing still, has all 30 (${have})`);
console.log(`messages ${srv.msgs}, ${(srv.bytes / 1024).toFixed(0)} KB over ${srv.t.toFixed(0)} s`);
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(0);

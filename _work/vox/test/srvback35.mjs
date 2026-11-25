// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.5) the work cleared and its code brought back from the locker: the editor's save empties every server in the
// room (test/syncsave.mjs asked the real room server) - each player's copies put them back, every one of them,
// whoever comes first: node test/srvback35.mjs  (the harness is netmob.mjs's)
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

let A = open('alice'), B = open('bob');
A.sim.poke('AT_확장프로그램', 1); B.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.srvCreate('가 서버', ' ', 2468, 1, '-'));
run(1);
// (both made by alice's game: two games started alike draw the same numbers, and a server's id is drawn)
A.call((fn) => fn.srvCreate('나 서버', ' ', 1357, 1, '-'));
run(1);
ok(join(A, '가 서버') && join(B, '나 서버'), 'alice in her server, bob in his (neither was ever in the other)');
const GOLD = A.g('ITKEY').indexOf('gold_block');
const pa = where(A).map(Math.floor), pb = where(B).map(Math.floor);
for (let i = 0; i < 6; i++) { put(A, pa[0] + 2 + i, pa[1] + 1, pa[2] + 2, GOLD); put(B, pb[0] + 2 + i, pb[1] + 2, pb[2] + 2, GOLD); }
cmd(A, '/op carol');
run(15);
ok(String(A.g('SY_m' + find(A, '가 서버'))[0]).split('^')[11] !== String(A.g('SY_m' + find(A, '나 서버'))[0]).split('^')[11], 'two servers, two ids');
const ka = find(A, '가 서버'), kb = find(A, '나 서버');
const lens = (c, k) => [c.g('SY_m' + k).length, c.g('SY_e' + k).length];
const [ma, ea] = lens(A, ka), [mb, eb] = lens(B, kb);
ok(A.g('AT_서버백업')[0] === 'SB' && B.g('AT_서버백업')[0] === 'SB' && !A.g('AT_서버백업').includes('나 서버') && !B.g('AT_서버백업').includes('가 서버'), 'each keeps a copy of the server they are on: alice ' + A.g('AT_서버백업').length + ' items, bob ' + B.g('AT_서버백업').length);
run(0.2);
A.call((fn) => { fn.netLeave(); A.sim.poke('gState', 0); fn.menuGo(4); });
B.call((fn) => { fn.netLeave(); B.sim.poke('gState', 0); fn.menuGo(4); });
run(4);
const bobCopy = B.g('AT_서버백업').slice();
close(B);
run(10);
// ---- the editor's save with every list empty: the room holds no server list any more, a page starts with none
const wipe = () => { for (const n of Object.keys(srv.lists)) if (/^(\?!|SY_)(m|e)\d+$/.test(n) || /gone$/.test(n)) { srv.lists[n] = []; for (const c of cs) { const L = c.sim.R.syLists[n]; if (L) L.splice(0, L.length); } } };
wipe();
const names = (c) => { const r = []; for (let k = 1; k <= c.g('NSRV'); k++) if (c.call((fn) => fn.srvHas(k)) === 1) r.push(String(c.g('shName'))); return r; };
ok(names(A).length === 0, 'the room emptied: no server on the list');
run(28);
ok(JSON.stringify(names(A)) === JSON.stringify(['가 서버']), "alice's game puts back the server she was on: " + names(A) + ' - ' + A.g('netMsg'));
// bob comes later, with his copy (his browser's storage)
// (what tessvm puts back is there before the first tick: the game looks then whether anything was kept)
const B2 = new Client(srv, 'bob'); B2.sim.poke('AT_확장프로그램', 1); B2.sim.poke('AT_서버백업', bobCopy); cs.push(B2); run(1);
B2.call((fn) => { fn.netEnter(); fn.menuGo(4); });
run(34);
const all = names(B2).sort();
ok(JSON.stringify(all) === JSON.stringify(['가 서버', '나 서버']), "bob's game puts his server back too, though the list is no longer empty: " + all + ' - ' + B2.g('netMsg'));
const ka2 = find(A, '가 서버'), kb2 = find(A, '나 서버');
ok(ka2 > 0 && kb2 > 0 && JSON.stringify(lens(A, ka2)) === JSON.stringify([ma, ea]) && JSON.stringify(lens(A, kb2)) === JSON.stringify([mb, eb]), 'both with their blocks and settings (' + [ma, ea, mb, eb] + ')');
ok(A.g('SY_m' + kb2).some((l) => String(l).startsWith('U^bob^')) && A.g('SY_m' + ka2).some((l) => String(l) === 'O^carol') && A.g('SY_m' + ka2).some((l) => String(l).startsWith('U^alice^')), "alice's op and things in hers, bob's things in his");
run(25);
ok(names(A).filter((n) => n === '가 서버').length === 1 && names(A).filter((n) => n === '나 서버').length === 1, 'and each is there once, some checks later');
// ---- one server in two places (a copy went back before the room's own came): the newer settings stay
{
  const free = [1, 2, 3, 4, 5, 6, 7, 8].find((k) => A.call((fn) => fn.srvHas(k)) === 0);
  const src = A.g('SY_m' + ka2).map(String), rev = +src[0].split('^')[9];
  const newer = src.slice(); newer[0] = src[0].split('^').map((v, i) => (i === 9 ? String(rev + 5) : v)).join('^'); newer.push('O^erin');
  const put2 = (k, m, e) => { for (const [n, a] of [['m' + k, m], ['e' + k, e]]) { const key = Object.keys(srv.lists).find((x) => x.endsWith(n) && /^(\?!|SY_)/.test(x)) || ('SY_' + n); srv.lists[key] = a.slice(); for (const c of cs) { const L = c.sim.R.syLists[key]; if (L) L.splice(0, L.length, ...a); } } };
  put2(free, newer, A.g('SY_e' + ka2).slice());
  ok(free > ka2 && names(A).filter((n) => n === '가 서버').length === 2, 'the same server at place ' + ka2 + ' (settings ' + rev + ') and at place ' + free + ' (settings ' + (rev + 5) + ')');
  run(25);
  const left = [1, 2, 3, 4, 5, 6, 7, 8].filter((k) => A.call((fn) => fn.srvHas(k)) === 1 && String(A.g('shName')) === '가 서버');
  ok(left.length === 1 && left[0] === free && A.g('SY_m' + free).some((l) => String(l) === 'O^erin'), 'the one with the newer settings stays (place ' + left + '), the older is cleared');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

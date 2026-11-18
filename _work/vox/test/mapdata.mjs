// (v3.2) the map as a text: copied from a single world, pasted into a new world and a new server, the
// owner copies the server: node test/mapdata.mjs
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


// ---------------------------------------------------------------- 1. a single world copied
const mk = (seed) => createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
const S1 = createSim({ consts: { AUTOSEED: 777, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (s, k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
{ let n = 0; while (S1.peek('gState') !== 2 && n < 5000) { F(S1); n++; } }
const call1 = (s, f) => s.as('pen', () => f(s.fn));
const cmd1 = (s, c) => call1(s, (fn) => fn.runCommand(c));
const KEY1 = S1.peek('ITKEY'), id1 = (k) => KEY1.indexOf(k);
const X = Math.floor(S1.peek('px')), Z = Math.floor(S1.peek('pz')), Y = 90;
S1.poke('grMobs', 0);
cmd1(S1, `/fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y - 1} ${Z + 6} stone`);
cmd1(S1, `/tp @s ${X}.5 ${Y} ${Z}.5`); F(S1, 5);
cmd1(S1, `/setblock ${X + 2} ${Y} ${Z} gold_block`); cmd1(S1, `/setblock ${X + 2} ${Y + 1} ${Z} diamond_block`);
cmd1(S1, `/setblock ${X - 2} ${Y} ${Z} chest`);
call1(S1, (fn) => { fn.chestAt(X - 2, Y, Z); const c = S1.peek('cFound'); S1.peek('CHI')[(c - 1) * 27 + 3] = id1('diamond'); S1.peek('CHN')[(c - 1) * 27 + 3] = 7; });
call1(S1, (fn) => { S1.peek('SGX').push(X); S1.peek('SGY').push(Y); S1.peek('SGZ').push(Z + 3); S1.peek('SGT').push('안녕 | 맵 ~ 글 ^'); S1.peek('SGD').push(0); });
call1(S1, (fn) => { S1.peek('CBX').push(X + 4); S1.peek('CBY').push(Y); S1.peek('CBZ').push(Z + 4); S1.peek('CBT').push('/say 긴 명령 '.padEnd(200, 'a')); S1.peek('CBD').push(0); });
cmd1(S1, `/setblock ${X + 4} ${Y} ${Z - 3} lectern`);
cmd1(S1, `/summon villager ${X + 4}.5 ${Y} ${Z - 2}.5`); cmd1(S1, `/summon cow ${X - 4}.5 ${Y} ${Z - 3}.5`);
const vk = S1.peek('MKEY').indexOf('villager') + 1, ck = S1.peek('MKEY').indexOf('cow') + 1;
{ let n = 0, e = 0; while (n < 600) { F(S1, 5); n++; e = S1.peek('ET').indexOf(vk); if (e >= 0 && Math.floor(S1.peek('EVAR')[e] / 2) % 16 > 0) break; } }
const ev = S1.peek('ET').indexOf(vk), evar = S1.peek('EVAR')[ev];
ok(Math.floor(evar / 2) % 16 > 0, `the villager has a job (EVAR ${evar})`);
call1(S1, (fn) => fn.mapCopy());
const text = String(S1.peek('$CLIPBOARD'));
ok(text.startsWith('BWMAP1|777|-|1|0|') && text.split('|').length === 11, `the map as a text: ${text.length} letters, ${text.split('|').length} parts: ${text.slice(0, 40)}...`);
ok(S1.peek('KPT').length === 0 && S1.peek('ET').filter((t) => t === vk || t === ck).length === 2, 'the living mobs stay as they are after the copy');

// ---------------------------------------------------------------- 2. pasted into a new world
const S2 = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
F(S2, 30);
call1(S2, (fn) => fn.menuGo(2)); F(S2, 3);
ok(S2.peek('mpOn') === 0, 'the new-world screen: no map yet');
S2.poke('$CLIPBOARD', 'not a map at all'); F(S2, 2);
ok(S2.peek('mpOn') === 0 && String(S2.peek('menuErr')).includes('맵 데이터가 아닙니다'), 'another text pasted: said so');
S2.poke('$CLIPBOARD', text); F(S2, 2);
ok(S2.peek('mpOn') === 1 && S2.peek('mpSeed') === 777 && S2.peek('mpNE') >= 170, `the map pasted: taken (seed ${S2.peek('mpSeed')}, ${S2.peek('mpNE')} blocks)`);
S2.poke('cwMode', 1); S2.poke('cwName', '붙인 세계');
call1(S2, (fn) => fn.worldNew(fn.worldFree()));
{ let n = 0; while (S2.peek('gState') !== 2 && n < 6000) { F(S2); n++; } }
ok(S2.peek('gState') === 2 && S2.peek('seed') === 777, `a world made from it (seed ${S2.peek('seed')})`);
cmd1(S2, `/tp @s ${X}.5 ${Y} ${Z}.5`); S2.poke('grMobs', 0); F(S2, 200);
const b2 = (x, y, z) => call1(S2, (fn) => fn.blockAt(x, y, z));
ok(b2(X + 2, Y, Z) === id1('gold_block') && b2(X + 2, Y + 1, Z) === id1('diamond_block') && b2(X, Y - 1, Z) === id1('stone'), 'its blocks are there');
call1(S2, (fn) => fn.chestFind(X - 2, Y, Z));
{ const c = S2.peek('cFound'); ok(c > 0 && S2.peek('CHI')[(c - 1) * 27 + 3] === id1('diamond') && S2.peek('CHN')[(c - 1) * 27 + 3] === 7, 'the chest has its 7 diamonds in the same slot'); }
{ const i = S2.peek('SGX').findIndex((v, k) => v === X && S2.peek('SGZ')[k] === Z + 3); ok(i >= 0 && S2.peek('SGT')[i] === '안녕 | 맵 ~ 글 ^', `the sign's words came whole: ${i >= 0 ? S2.peek('SGT')[i] : '-'}`); }
{ const i = S2.peek('CBX').findIndex((v) => v === X + 4); ok(i >= 0 && String(S2.peek('CBT')[i]).length === 200, `the command block's 200 letters too: ${i >= 0 ? String(S2.peek('CBT')[i]).length : '-'}`); }
{ const ET = S2.peek('ET'), e = ET.indexOf(vk); ok(e >= 0 && S2.peek('EVAR')[e] === evar && ET.includes(ck), `the villager (with its job) and the cow are there: villager ${e >= 0 ? S2.peek('EVAR')[e] : '-'}, cow ${ET.includes(ck)}`); }

// ---------------------------------------------------------------- 3. pasted into a new server; the owner copies it back
const A = open('alice');
A.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.menuGo(5)); run(0.2);
A.sim.poke('$CLIPBOARD', text); run(0.2);
ok(A.g('mpOn') === 1, 'the new-server screen took the map');
A.sim.poke('esName', '붙인 서버'); A.sim.poke('esMotd', ' '); A.sim.poke('esMode', 1); A.sim.poke('esEdit', 0);
A.call((fn) => fn.serverSave()); run(1.5);
ok(find(A, '붙인 서버') > 0 && A.g('mpOn') === 0, 'the server is made');
ok(join(A, '붙인 서버'), 'alice in');
cmd(A, '/gamerule doMobSpawning false'); cmd(A, `/tp @s ${X}.5 ${Y} ${Z}.5`); run(5);
const KEY = A.g('ITKEY'), id = (k) => KEY.indexOf(k);
ok(A.g('shSeed') === 777 && blockSeen(A, X + 2, Y, Z) === id('gold_block') && blockSeen(A, X + 2, Y + 1, Z) === id('diamond_block'), `the server has the map's seed and blocks (seed ${A.g('shSeed')})`);
A.call((fn) => fn.chestFind(X - 2, Y, Z));
{ const c = A.g('cFound'); ok(c > 0 && +A.g('CHI')[(c - 1) * 27 + 3] === id('diamond') && +A.g('CHN')[(c - 1) * 27 + 3] === 7, 'its chest and what is in it'); }
{ const i = A.g('SGX').findIndex((v, k) => +v === X && +A.g('SGZ')[k] === Z + 3); ok(i >= 0 && String(A.g('SGT')[i]).includes('안녕'), `its sign: ${i >= 0 ? A.g('SGT')[i] : '-'}`); }
const B = open('bob');
ok(join(B, '붙인 서버'), 'bob comes');
cmd(A, `/tp bob ${X + 1}.5 ${Y} ${Z}.5`); run(5);
ok(blockSeen(B, X + 2, Y, Z) === id('gold_block'), 'bob has the blocks too');
// one more block, then the owner copies; bob may not
cmd(A, `/setblock ${X} ${Y + 3} ${Z} iron_block`); run(3);
ok(A.call((fn) => fn.mapMay()) === 1 && B.call((fn) => fn.mapMay()) === 0, 'the owner may copy the server, bob may not');
A.call((fn) => fn.mapCopy());
const t2 = String(A.g('$CLIPBOARD'));
ok(t2.startsWith('BWMAP1|777|') && t2.includes(`${X},${Y + 3},${Z},${id('iron_block')},0;`) && t2.includes(`${X + 2},${Y},${Z},${id('gold_block')},0;`), `the server's map: ${t2.length} letters, with the old blocks and the new one`);
B.sim.poke('$CLIPBOARD', 'x'); B.call((fn) => fn.mapCopy());
ok(String(B.g('$CLIPBOARD')) === 'x', 'bob\'s clipboard is left alone');
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

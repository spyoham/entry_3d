// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.5, 11-26) A server made from a large map (the user: "서버에도 불러올수 있게 바꿔줘"): the map's blocks go into a
// list of the pool (SY_b1..12: the base), written once; whoever comes in has them; the record holds only what was
// changed since. With the calculator of the genre (calculator_map.txt, not in the repository) two players type sums
// and both see the answer; without it a slab of 3,600 blocks stands in.
//   node test/srvmap35.mjs [latency ms] [map.txt]      (the harness is netmob.mjs's)
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

import fs from 'node:fs';
const SUPER = '코딩재미있어';
const file = process.argv[3] || process.env.MAP || new URL('../../../calculator_map.txt', import.meta.url);
const calc = fs.existsSync(file);
// (without the calculator: a slab of 3,600 blocks of stone and a few lamps, with a twelfth part)
let text, cells, more;
const mapText = (stone) => {
  if (calc) text = fs.readFileSync(file, 'utf8');
  else {
    const cs = [];
    for (let x = 0; x < 60; x++) for (let z = 0; z < 60; z++) cs.push([x + 20, 90, z + 20, stone, 0]);
    text = 'BWMAP1|4242|bedrock,3*stone|3|0|' + cs.map((c) => c.join(',')).join(';') + ';|-|-|-|-|-|hash=0,0,0;spawn=30.5,91,30.5,90;keep=1,1,2,1,1,2,2,2';
    console.log('no map (' + (file.pathname || file) + '): a slab of ' + cs.length + ' blocks of stone stands in for the calculator');
  }
  const parts = text.split('|');
  cells = parts[5].split(';').filter(Boolean).map((e) => e.split(',').map(Number));
  more = parts[11] || '';
};
const names = (c) => { const r = []; for (let k = 1; k <= c.g('NSRV'); k++) if (c.call((fn) => fn.srvHas(k)) === 1) r.push(String(c.g('shName'))); return r; };
// the lists of the pool as a game has them: [{ s, id, items, letters }]
const pool = (c) => { const r = []; for (let s = 1; s <= c.g('NBASE'); s++) { const L = c.g('SY_b' + s); if (L.length >= 2 && String(L[0]).startsWith('B^')) r.push({ s, id: String(L[0]).split('^')[1], items: L.length, letters: L.reduce((a, v) => a + String(v).length, 0) }); } return r; };
let baseSends = 0;
{ const f0 = Client.prototype.flush; Client.prototype.flush = function () { for (const n of this.pend.keys()) if (/^SY_b/.test(n)) baseSends++; return f0.call(this); }; }
const makeFromMap = (c, name) => {
  c.call((fn) => fn.menuGo(5)); run(0.2);
  c.sim.poke('$CLIPBOARD', text); run(0.2);
  c.sim.poke('esName', name); c.sim.poke('esEdit', 0); c.sim.poke('esMotd', 'map');
  c.call((fn) => fn.serverSave());
  run(2);
  return String(c.g('menuErr'));
};
const differ = (c) => { const WY = c.g('WY'), W = c.g('W'), CKX = c.g('CKX'), CKZ = c.g('CKZ'), CKST = c.g('CKST'), NC = Math.round(Math.sqrt(CKX.length)), WS = NC * 16, md = (a, m) => ((a % m) + m) % m; let made = 0, other = 0; for (const [x, y, z, b] of cells) { const cx = Math.floor(x / 16), cz = Math.floor(z / 16), sl = md(cx, NC) * NC + md(cz, NC); if (CKX[sl] === cx && CKZ[sl] === cz && CKST[sl] >= 4) { made++; if (W[(md(x, WS) * WS + md(z, WS)) * WY + y] !== b) other++; } } return { made, other }; };
// ---- (11-28) a machine on a server: what it shows when everybody has left and one comes back
let A = open('alice');
A.sim.poke('AT_확장프로그램', 1); A.call((fn) => fn.svAck());
mapText(A.g('ITKEY').indexOf('stone') + 1);
if (!calc) { console.log('no calculator map: nothing to try'); process.exit(0); }
makeFromMap(A, '계산기');
const k = find(A, '계산기');
ok(k > 0, 'a server from the calculator');
ok(join(A, '계산기'), 'alice comes in');
{ let n = 0; while (n < 120 && (differ(A).made < cells.length || differ(A).other > 0)) { run(1); n++; } }
const [hx, , hz] = /hash=(-?\d+),(-?\d+),(-?\d+)/.exec(more).slice(1).map(Number), DZ = -hz;
const GX = (x) => (/hash=-?\d+,-?\d+,-?\d+,1/.test(more) ? hx - x : x - hx);
const lampOn = A.g('ITKEY').indexOf('spark_lamp') + 1;
const SEG = { '1111110': 0, '0110000': 1, '1101101': 2, '1111001': 3, '0110011': 4, '1011011': 5, '1011111': 6, '1110000': 7, '1111111': 8, '1111011': 9, '0000000': ' ', '0000001': '-', '1110011': 9, '0011111': 6, '1110010': 7 };
const show = (c) => { const lit = (x, y) => (blockSeen(c, GX(x), y, 32 + DZ) === lampOn ? 1 : 0); const digit = (i, y0) => { const x0 = 29 + 8 * i; const key = '' + lit(x0 + 2, y0 + 8) + lit(x0, y0 + 6) + lit(x0, y0 + 2) + lit(x0 + 2, y0) + lit(x0 + 4, y0 + 2) + lit(x0 + 4, y0 + 6) + lit(x0 + 2, y0 + 4); return key in SEG ? SEG[key] : '?'; }; let r = ''; for (let i = 4; i >= 0; i--) r += digit(i, 71); return '[' + r + ']'; };
const NUM = { 1: [87, 6], 2: [87, 5], 3: [87, 4], 4: [86, 6], 5: [86, 5], 6: [86, 4], 7: [85, 6], 8: [85, 5], 9: [85, 4], 0: [84, 5] };
const OPS = { '+': -1, '-': -2, '*': -3, '/': -4, c: 1 };
const busy = (c) => c.g('scN') + c.g('BEX').length + c.g('MVX').length;
const rest = (c = A) => { let q = 0, n = 0; while (n < 6000 && q < 90) { run(1 / 60); n++; if (busy(c) === 0) q++; else q = 0; } return n; };
const press = (c, y, z) => { c.call((fn) => { c.sim.poke('netUserAct', 1); fn.buttonPress(GX(33), y, z + DZ); c.sim.poke('netUserAct', 0); }); run(0.3); rest(c); };
const lever = (c) => { c.call((fn) => { c.sim.poke('netUserAct', 1); fn.leverToggle(GX(33), 85, 2 + DZ, fn.blockAt(GX(33), 85, 2 + DZ)); c.sim.poke('netUserAct', 0); }); run(0.3); rest(c); };
const sum = (c, a, op, b, undo = 1) => { press(c, 85, OPS.c); for (const d of String(a)) press(c, ...NUM[d]); lever(c); for (const d of String(b)) press(c, ...NUM[d]); press(c, 85, OPS[op]); const r = show(c); if (undo) lever(c); return r; };
// the map's cells as a game has them now
const snap = (c) => { const m = new Map(); for (const [x, y, z] of cells) m.set(x + ',' + y + ',' + z, blockSeen(c, x, y, z)); return m; };
const diff = (a, b) => { let n = 0; const ex = []; for (const [key, v] of a) if (b.get(key) !== v) { n++; if (ex.length < 6) ex.push(`${key}: ${A.g('ITKEY')[v]} -> ${A.g('ITKEY')[b.get(key)]}`); } return { n, ex }; };
// the comparators' outputs a game holds (those that give something)
const cmList = (c) => { const X = c.g('CMX'), Y = c.g('CMY'), Z = c.g('CMZ'), D = c.g('CMD'), L = c.g('CML'); return X.map((x, i) => [x, Y[i], Z[i], D[i], L[i]].join(',')).filter((t) => !t.endsWith(',0')).sort(); };
rest();
const s0 = snap(A);
// 1. digits typed and left on the display (no sum made): what is there after everybody left
press(A, 85, OPS.c); for (const d of '123') press(A, ...NUM[d]);
const shown1 = show(A), s1 = snap(A);
console.log(`   alice types 123: the lamps show ${shown1}; ${diff(s0, s1).n} of the machine's ${cells.length} cells are other than at the start; the record holds ${A.g('SY_e' + k).length / 5} cells`);
const out = (c) => { c.call((fn) => { fn.netLeave(); c.sim.poke('gState', 0); c.sim.poke('uiMode', 0); fn.menuGo(4); }); run(12); };
const back = (c) => { const r = join(c, '계산기'); let n = 0; while (n < 120 && (differ(c).made < cells.length)) { run(1); n++; } run(5); rest(c); return r; };
run(3);
const cm1 = cmList(A);
{ const st = [...Array(A.g('NBASE')).keys()].map((i) => A.g('SY_b' + (i + 1))).find((l) => l.length >= 2 && String(l[0]).startsWith('S^'));
  ok(st && +String(st[0]).split('^')[2] >= diff(s0, s1).n && +String(st[0]).split('^')[2] < diff(s0, s1).n + 100, `the host wrote the machines' state when they stood still (the map's cells and the few a piston wrote beside them): ${st ? String(st[0]) + ', ' + st.length + ' items, the comparators ' + String(st[1]).slice(0, 40) : 'none'}`); }
out(A);
ok(back(A), 'out and in again');
const shown2 = show(A), s2 = snap(A), d12 = diff(s1, s2);
ok(shown2 === shown1, `the lamps show what they showed: ${shown2} (they showed ${shown1})`);
ok(d12.n === 0, `the machine is as it was left: ${d12.n} cells other ${d12.ex.join(' | ')}`);
{ const cm2 = cmList(A); ok(cm1.length > 0 && cm1.join(';') === cm2.join(';'), `and its comparators give what they gave (${cm1.length} of them; ${cm2.length} now)`); }
// 2. and it still works: a sum, then again after a visit that ended in the middle of a multiplication
const r1 = sum(A, 12, '+', 34);
ok(r1 === '[   46]', `12 + 34 after coming back: ${r1}`);
const r2 = sum(A, 3, '*', 5);
ok(r2 === '[   15]', `3 * 5: ${r2}`);
// 3. out in the middle of a multiplication: the machine comes back as it last stood still - the two numbers typed,
// the key not yet pressed - and the key pressed again gives the product
press(A, 85, OPS.c); for (const d of '255') press(A, ...NUM[d]); lever(A); for (const d of '255') press(A, ...NUM[d]);
run(2.5);
const sRest = snap(A);
A.call((fn) => { A.sim.poke('netUserAct', 1); fn.buttonPress(GX(33), 85, OPS['*'] + DZ); A.sim.poke('netUserAct', 0); });
run(4);
const sMid = snap(A);
console.log(`   in the middle of 255 * 255 (busy ${busy(A)}, ${diff(sRest, sMid).n} cells other than before the key): out`);
out(A);
ok(back(A), 'in again');
const dr = diff(sRest, snap(A));
ok(dr.n === 0, `the machine is as it last stood still, before the key: ${dr.n} cells other ${dr.ex.join(' | ')}`);
press(A, 85, OPS['*']);
const r3 = show(A);
ok(r3 === '[65025]', `the key again: 255 * 255 = ${r3}`);
lever(A);
const r4 = sum(A, 7, '+', 8);
ok(r4 === '[   15]', `7 + 8 after that: ${r4}`);
const r5 = sum(A, 16, '*', 16);
ok(r5 === '[  256]', `16 * 16: ${r5}`);
// 4. another comes in and has the machine as it stands; the host leaves, he is the host and types; he leaves too -
// whoever comes next has it as he left it
const B = open('bob');
B.sim.poke('AT_확장프로그램', 1); B.call((fn) => fn.svAck());
ok(join(B, '계산기'), 'bob comes in');
{ let n = 0; while (n < 120 && differ(B).made < cells.length) { run(1); n++; } }
run(4); rest(B);
{ const d = diff(snap(A), snap(B)); ok(d.n === 0, `bob has the machine as alice's screen has it: ${d.n} cells other ${d.ex.join(' | ')}`); }
out(A);
ok(B.g('netHost') === 1, 'alice out: bob is the host');
press(B, 85, OPS.c); for (const d of '77') press(B, ...NUM[d]);
run(6);
const sB = snap(B);
ok(diff(s0, sB).n > 500, `bob types 77: ${diff(s0, sB).n} cells other than at the start`);
out(B);
ok(back(A), 'bob out, alice in again');
{ const d = diff(sB, snap(A)); ok(d.n === 0, `the machine is as bob left it: ${d.n} cells other ${d.ex.join(' | ')}`); }
{ const r = sum(A, 9, '-', 7); ok(r === '[    2]', `9 - 7 after all that: ${r}`); }
console.log(`   the record holds ${A.g('SY_e' + k).length / 5} cells; the state: ${A.g('MEV').length} lines in the settings, ${pool(A).length} base in the pool, lists of the pool in use ${[...Array(A.g('NBASE')).keys()].filter((i) => A.g('SY_b' + (i + 1)).length > 1).length}`);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

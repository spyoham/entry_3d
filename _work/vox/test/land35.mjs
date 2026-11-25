// Online play in the node sim: several games at once against a model of Entry Sync (as the racing
// game's t9/netsim.mjs): the ?! flag turns 1, the room's values arrive after `welcome` s, nothing is
// sent in the first 4 s before they do, every change goes to everyone else (never back), one socket
// each way keeps the order, a list goes whole (once a frame here, as the extension sends once a tick).
// (v3.5) what was made in the world 128 high (v3.4 and before) is moved up with the land (src/landup.js): a kept
// world opened, a map pasted, a server come into: node test/land35.mjs  (the harness is netmob.mjs's)
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
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3 } });
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

// ================================================================ 1. the heights
{
  const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3 } });
  const up = (y) => s.as('pen', () => s.fn.yUp(y));
  ok(up(30) === 63 && up(24) === 57 && up(100) === 133 && up(31.5) === 64.5, 'from 24 up a block is a block, 33 higher (the sea 30 -> 63)');
  ok(up(0) === 21 && up(23) === 56 && up(10) === 36, 'under that the depths were squeezed: 0 -> 21, 10 -> 36, 23 -> 56');
  const seen = new Set(); for (let y = 0; y < 128; y++) seen.add(up(y)); ok(seen.size === 128, 'no two heights become one');
  const pack = (x, y, z, m) => ((x + 500000) * 1048576 + z + 500000) * m + y;
  ok(s.as('pen', () => s.fn.jobUp(pack(-70, 40, 123, 128), 1)) === pack(-70, 73, 123, 256) && s.as('pen', () => s.fn.jobUp(pack(5, 40, 9, 128), 0)) === pack(5, 40, 9, 256) && s.as('pen', () => s.fn.jobUp(0, 1)) === 0, "a villager's job block: packed for 256 heights, moved up in the overworld only");
}
// ================================================================ 2. a kept world
const mk = (c) => createSim({ consts: { TESTRUN: 1, ANIMALS: 0, GENV: 3, ...c } });
const F = (sim, k = 1) => { for (let i = 0; i < k; i++) { try { sim.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const callS = (sim, f) => sim.as('pen', f), cmdS = (sim, t) => callS(sim, () => sim.fn.runCommand(t));
let mapNew = '', mapOld = '';
const SEEDW = 4321;
let WX = 0, WY0 = 0, WZ = 0;
{
  const s = mk({ AUTOSEED: SEEDW, AUTOMODE: 1 });
  let n = 0; while (s.peek('gState') !== 2 && n < 6000) { F(s); n++; }
  F(s, 30);
  const KEY = s.peek('ITKEY'), B = (sim, x, y, z) => KEY[callS(sim, () => sim.fn.blockAt(x, y, z))];
  const X = Math.floor(s.peek('px')), Y = Math.floor(s.peek('py')), Z = Math.floor(s.peek('pz'));
  WX = X; WY0 = Y; WZ = Z;
  ok(Y >= 62 && Y < 120, 'the land of now: one stands at ' + Y + ' (the sea 63)');
  cmdS(s, '/fill ' + (X + 2) + ' ' + Y + ' ' + (Z + 2) + ' ' + (X + 4) + ' ' + (Y + 2) + ' ' + (Z + 4) + ' gold_block');
  cmdS(s, '/setblock ' + (X - 3) + ' ' + Y + ' ' + Z + ' chest'); callS(s, () => s.fn.chestAt(X - 3, Y, Z));
  callS(s, () => { s.fn.chestFind(X - 3, Y, Z); const c = s.peek('cFound'); s.peek('CHI')[(c - 1) * 27 + 5] = KEY.indexOf('diamond'); s.peek('CHN')[(c - 1) * 27 + 5] = 7; });
  cmdS(s, '/setblock ' + (X + 1) + ' ' + Y + ' ' + (Z - 2) + ' oak_sign'); s.peek('SGX').push(X + 1); s.peek('SGY').push(Y); s.peek('SGZ').push(Z - 2); s.peek('SGT').push('높이 시험'); s.peek('SGD').push(0);
  // a block deep down (under the old 24: the squeezed part) and one in the depths (another world: not moved)
  cmdS(s, '/setblock ' + X + ' 36 ' + Z + ' diamond_block');
  callS(s, () => s.fn.edPushD(7, 40, 7, KEY.indexOf('gold_block'), 1));
  // a villager with a job, kept
  cmdS(s, '/setblock ' + (X + 6) + ' ' + Y + ' ' + Z + ' lectern');
  cmdS(s, '/summon villager ' + (X + 7) + ' ' + Y + ' ' + (Z + 1));
  s.poke('px', X + 0.5); s.poke('pz', Z - 6.5); s.poke('py', Y + 14); s.poke('flying', 1); s.poke('gameMode', 1);
  F(s, 900);
  const vill = s.peek('MKEY').indexOf('villager') + 1, ET = s.peek('ET'), ve = ET.indexOf(vill);
  const job = ve >= 0 ? s.peek('ECNV')[ve] : 0;
  ok(ve >= 0 && job > 0 && job % 256 === Y, 'the villager took the lectern for its job block (its height ' + (job % 256) + ')');
  s.poke('spawnX', X + 0.5); s.poke('spawnY', Y); s.poke('spawnZ', Z + 0.5); s.poke('spawnSet', 1); s.poke('spawnDim', 0);
  callS(s, () => s.fn.mapOutWorld()); mapNew = String(s.peek('mpOut'));
  // ---- as v3.4 kept it: every height of the overworld 33 lower (the deep one by the squeeze), the job block packed x 128
  const down = (y) => (y >= 57 ? y - 33 : Math.round((y - 21) / 1.5));
  const ED = { x: s.peek('EDX'), y: s.peek('EDY'), z: s.peek('EDZ'), b: s.peek('EDB'), d: s.peek('EDD') };
  const cells = (sim) => { const x = sim.peek('EDX'), y = sim.peek('EDY'), z = sim.peek('EDZ'), b = sim.peek('EDB'), d = sim.peek('EDD'), m = new Map(); for (let i = 0; i < x.length; i++) if (+d[i] !== 0 || +y[i] >= 57 || +b[i] === KEY.indexOf('diamond_block')) m.set([x[i], y[i], z[i], d[i]].join(','), +b[i]); return JSON.stringify([...m].sort()); };
  const before = cells(s);
  for (let i = 0; i < ED.y.length; i++) if (+ED.d[i] === 0) ED.y[i] = down(+ED.y[i]);
  const SGY = s.peek('SGY'); for (let i = 0; i < SGY.length; i++) SGY[i] = down(+SGY[i]);
  const CHY = s.peek('CHY'), CHON = s.peek('CHON'); for (let i = 0; i < CHY.length; i++) if (+CHON[i] === 1) CHY[i] = down(+CHY[i]);
  const EY = s.peek('EY'), ECNV = s.peek('ECNV'), vyWas = s.peek('EY')[ve];
  for (let i = 0; i < EY.length; i++) if (+ET[i] > 0) EY[i] = EY[i] - 33;
  { const KPY = s.peek('KPY'); for (let i = 0; i < KPY.length; i++) KPY[i] = KPY[i] - 33; }
  { const q = Math.floor(job / 256), y = job % 256; ECNV[ve] = q * 128 + (y - 33); }
  const pyWas = s.peek('py');
  s.poke('py', pyWas - 33); s.poke('spawnY', Y - 33); s.poke('genVer', 2);
  callS(s, () => s.fn.edIndex());
  callS(s, () => s.fn.mapOutWorld()); mapOld = String(s.peek('mpOut'));
  ok(mapOld.split('|')[3] === '2' && mapNew.split('|')[3] === '3' && mapOld !== mapNew, 'two map texts of it: as it is, and as v3.4 would have written it');
  s.poke('AT_확장프로그램', 1); s.poke('worldCur', 1); s.poke('worldName', '옛 세계');
  callS(s, () => s.fn.saveGame(1));
  const save = s.peek('AT_세계1').slice();
  const t = mk({});
  F(t, 30);
  t.poke('AT_세계1', save); t.poke('AT_확장프로그램', 1);
  callS(t, () => t.fn.loadGame(1));
  n = 0; while (t.peek('gState') !== 2 && n < 6000) { F(t); n++; }
  F(t, 10);
  ok(t.peek('gState') === 2 && t.peek('genVer') === 3, 'the world kept at genVer 2 opens at genVer 3');
  ok(Math.abs(t.peek('py') - pyWas) < 0.6 && Math.abs(t.peek('px') - (X + 0.5)) < 0.01, 'the player stands where they stood, 33 higher: ' + t.peek('py') + ' (' + (pyWas - 33) + ' in the save)');
  ok(B(t, X + 3, Y + 1, Z + 3) === 'gold_block' && B(t, X + 2, Y, Z + 2) === 'gold_block' && B(t, X + 3, Y - 32, Z + 3) !== 'gold_block', 'the blocks built are on the land again');
  ok(B(t, X, 36, Z) === 'diamond_block', 'the block deep down is at its depth of now');
  const after = cells(t);
  if (after !== before) { const a = JSON.parse(after), b = JSON.parse(before), sa = new Set(a.map(String)), sb = new Set(b.map(String)); console.log('   only after:', a.map(String).filter((v) => !sb.has(v)).slice(0, 8).map((v) => v + ':' + KEY[+v.split(',')[4]]), 'only before:', b.map(String).filter((v) => !sa.has(v)).slice(0, 8).map((v) => v + ':' + KEY[+v.split(',')[4]])); console.log('   at the player:', [0, 1, 2].map((d) => B(t, Math.floor(t.peek('px')), Math.floor(pyWas) + d, Math.floor(t.peek('pz'))))); }
  const inAfter = new Set(JSON.parse(after).map(String));
  ok(JSON.parse(before).every((v) => inAfter.has(String(v))), 'the record of changed blocks is what it was before the heights were lowered (' + t.peek('EDX').length + ' cells; the one of the depths not moved)');
  callS(t, () => t.fn.chestFind(X - 3, Y, Z)); const c = t.peek('cFound');
  ok(c > 0 && t.peek('CHI')[(c - 1) * 27 + 5] === KEY.indexOf('diamond') && t.peek('CHN')[(c - 1) * 27 + 5] === 7, 'the chest and its diamonds');
  const si = t.peek('SGT').indexOf('높이 시험');
  ok(si >= 0 && +t.peek('SGY')[si] === Y, 'the sign');
  ok(+t.peek('spawnY') === Y, 'the bed');
  // (looked at as it comes back - a villager left to itself walks off)
  const ve2 = t.peek('ET').indexOf(vill);
  ok(ve2 >= 0 && Math.abs(t.peek('EY')[ve2] - vyWas) < 1.5 && t.peek('ECNV')[ve2] === job, 'the villager, at its height, its job block the lectern still (' + (ve2 >= 0 ? t.peek('ECNV')[ve2] % 256 : '-') + ')');
}
// ================================================================ 3. a map pasted
{
  const t = mk({});
  F(t, 30);
  const take = (text) => { t.poke('$CLIPBOARD', text); return callS(t, () => t.fn.mapTake()); };
  ok(take(mapNew) === 1, 'the map of now is taken');
  const e3 = JSON.stringify(t.peek('MPE').map(Number)), k3 = JSON.stringify(t.peek('MPK').map(Number)), c3 = String(t.peek('mpC')), s3 = String(t.peek('mpS'));
  ok(take(mapOld) === 1 && t.peek('mpGen') === 3, "the map of v3.4 is taken, and is this version's after");
  const five = (a) => { const r = []; for (let i = 0; i + 4 < a.length; i += 5) if (a[i + 4] !== 0 || a[i + 1] >= 57 || a[i + 3] === t.peek('ITKEY').indexOf('diamond_block')) r.push(a.slice(i, i + 5).join(',')); return JSON.stringify(r.sort()); };
  ok(five(t.peek('MPE').map(Number)) === five(JSON.parse(e3)), 'its blocks are where the map of now has them');
  ok(String(t.peek('mpC')) === c3 && String(t.peek('mpS')) === s3, 'its chests and signs too: ' + s3.slice(0, 30));
  const k2 = t.peek('MPK').map(Number), kk = JSON.parse(k3);
  ok(k2.length === kk.length && k2.every((v, i) => Math.abs(v - kk[i]) < 0.02), 'and its kept mobs (the villager with its job block): ' + k2.length + ' / ' + kk.length + ' ' + k2.map((v, i) => (Math.abs(v - kk[i]) < 0.02 ? '' : i + ':' + v + '/' + kk[i])).filter(Boolean).join(' '));
}
// ================================================================ 4. a server
let A = open('alice');
A.sim.poke('AT_확장프로그램', 1);
A.call((fn) => fn.srvCreate('옛 서버', ' ', 2468, 1, '-'));
run(1);
ok(join(A, '옛 서버'), 'alice in the server she made');
const k0 = find(A, '옛 서버');
cmd(A, '/gamerule doMobSpawning false');
const P = where(A).map(Math.floor), [SX, SY, SZ] = P;
ok(SY >= 62, 'she stands at ' + SY);
cmd(A, '/fill ' + (SX + 2) + ' ' + SY + ' ' + (SZ + 2) + ' ' + (SX + 4) + ' ' + (SY + 2) + ' ' + (SZ + 4) + ' gold_block');
cmd(A, '/setblock ' + (SX - 3) + ' ' + SY + ' ' + SZ + ' chest');
cmd(A, '/setblock ' + (SX + 6) + ' ' + SY + ' ' + SZ + ' lectern');
cmd(A, '/summon villager ' + (SX + 7) + ' ' + SY + ' ' + (SZ + 1));
A.call((fn) => { fn.netSign(SX + 1, SY, SZ - 2, '서버의 표지판'); });
run(20);
const names = Object.keys(srv.lists);
const eName = names.find((n) => /e/.test(n) && new RegExp('(^|[^0-9])' + k0 + '$').test(n) && srv.lists[n].length >= 5 && srv.lists[n].length % 5 === 0 && srv.lists[n].some((v) => +v === A.g('ITKEY').indexOf('gold_block')));
const mName = names.find((n) => new RegExp('(^|[^0-9])' + k0 + '$').test(n) && String(srv.lists[n][0]).startsWith('H^'));
ok(!!eName && !!mName, 'the server keeps its record and its settings: ' + eName + ' (' + (eName ? srv.lists[eName].length / 5 : 0) + ' cells), ' + mName + ' (' + (mName ? srv.lists[mName].length : 0) + ' lines)');
A.call((fn) => fn.netLeave());
run(4);
close(A);
run(10);
const ed0 = srv.lists[eName].map(Number), meta0 = srv.lists[mName].map(String);
const lineOf = (L, t) => L.filter((l) => l.startsWith(t + '^'));
ok(lineOf(meta0, 'U').length === 1 && lineOf(meta0, 'K').length >= 1 && meta0[0].split('^')[17] === '3', 'alice gone: her line (U), the villager (K), the land of now (3) in the settings - ' + lineOf(meta0, 'K')[0]);
// ---- the server as v3.4 left it
{
  const e = ed0.slice(); for (let i = 0; i + 4 < e.length; i += 5) if (e[i + 4] === 0) e[i + 1] -= 33;
  srv.lists[eName] = e;
  srv.lists[mName] = meta0.map((l) => {
    const f = l.split('^');
    if (f[0] === 'H') { f[17] = '2'; }
    if (f[0] === 'U') { f[3] = String(+f[3] - 33); if (+f[14] > 0 || f.length > 12) { f[12] = String(+f[12] - 33); } }
    if (f[0] === 'C' || f[0] === 'S') { const q = f[1].split(','); q[1] = String(+q[1] - 33); f[1] = q.join(','); }
    if (f[0] === 'K') { const q = f[5].split(','); q[1] = String(Math.round((+q[1] - 33) * 100) / 100); if (q.length >= 8 && +q[7] > 0) { const p = +q[7]; q[7] = String(Math.floor(p / 256) * 128 + (p % 256 - 33)); } f[5] = q.join(','); }
    return f.join('^');
  });
}
const B2 = open('bob');
B2.sim.poke('AT_확장프로그램', 1);
ok(String(B2.call((fn) => { fn.srvHead(k0); return 1; })) === '1' && B2.g('shGen') === 2, 'bob sees a server of v3.4 (shGen 2)');
ok(join(B2, '옛 서버'), 'bob comes into it');
run(6);
const ed1 = srv.lists[eName].map(Number), meta1 = srv.lists[mName].map(String);
ok(meta1[0].split('^')[17] === '3', "its settings say the land is this version's");
ok(ed1.length >= ed0.length && ed0.every((v, i) => ed1[i] === v), 'the record of changed blocks is alice\'s own again (' + ed0.length / 5 + ' cells)');
ok(JSON.stringify(lineOf(meta1, 'C')) === JSON.stringify(lineOf(meta0, 'C')) && JSON.stringify(lineOf(meta1, 'S')) === JSON.stringify(lineOf(meta0, 'S')), 'the chest and the sign: ' + lineOf(meta1, 'C').map((l) => l.slice(0, 22)) + ' ' + lineOf(meta1, 'S'));
const ua0 = lineOf(meta0, 'U').find((l) => l.startsWith('U^alice^')), ua1 = lineOf(meta1, 'U').find((l) => l.startsWith('U^alice^'));
ok(!!ua1 && ua1 === ua0, "alice's place and bed: " + (ua1 || '').slice(0, 40));
const kq0 = lineOf(meta0, 'K')[0].split('^')[5].split(','), kl1 = lineOf(meta1, 'K').find((l) => l.split('^')[1] === lineOf(meta0, 'K')[0].split('^')[1]);
const kq1 = kl1 ? kl1.split('^')[5].split(',') : [];
ok(kq1.length === kq0.length && Math.abs(+kq1[1] - +kq0[1]) < 1.6 && kq1[7] === kq0[7], 'the villager kept: its height ' + kq1[1] + ' (was ' + kq0[1] + '), its job block ' + kq1[7]);
const gold = B2.g('ITKEY').indexOf('gold_block');
B2.sim.poke('gameMode', 1); B2.sim.poke('flying', 1);
cmd(B2, '/tp @s ' + SX + ' ' + (SY + 3) + ' ' + SZ); run(8);
ok(blockSeen(B2, SX + 3, SY + 1, SZ + 3) === gold && blockSeen(B2, SX + 3, SY - 32, SZ + 3) !== gold, "bob sees alice's gold on the land");
// one of v3.4 inside: nobody of this version comes in
{
  // (bob plays this version, and as host would say so again within five seconds: carol looks before that)
  const C2 = open('carol');
  B2.sim.poke('netHostT', 0);
  srv.lists[mName] = srv.lists[mName].map(String).map((l) => (l.startsWith('H^') ? l.split('^').map((v, i) => (i === 17 ? '2' : v)).join('^') : l));
  for (const c of cs) c.applyList(mName, srv.lists[mName]);
  run(0.3);
  const e = String(C2.call((fn) => fn.netJoinCheck(k0)));
  ok(e.includes('옛 판'), 'a server of v3.4 with somebody in it is not come into: ' + e.slice(0, 40));
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(0);

// (v3.5, 11-28) The room that falls asleep (the user: "서버 삭제하고 그자리에 새로운 서버를 넣고, 새로고침하면 서버가
// 안바뀌어 있음"). What the real Entry Sync room server does, measured with plain sockets in rooms of their own: once
// nobody has sent anything for ten seconds, what is written next is passed on to the pages in the room and kept
// nowhere, until somebody new connects. The model of the other net tests with that added (Server.take); the game
// keeps the room awake with a line every two or three seconds from whichever page runs (net.js hbStep) and says so
// when it stood still itself.   node test/roomsleep35.mjs   (test/realext.mjs is the same against the real server)
import { createSim } from '../sim.mjs';
const LAT = 0.08;
const WALL0 = Date.UTC(2026, 10, 9, 3, 0, 0);
let fails = 0;
let T1 = Date.now();
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (process.env.TIMES ? '   [' + ((Date.now() - T1) / 1000).toFixed(0) + ' s]' : '')); T1 = Date.now(); if (!c) fails++; };

class Server {
  constructor() { this.vars = {}; this.lists = {}; this.t = 0; this.q = []; this.k = 0; this.clients = []; this.last = 0; this.asleep = false; this.lost = 0; this.gaps = []; }
  at(t, f) { this.q.push({ t, f, k: this.k++ }); }
  step(dt) { this.t += dt; this.q.sort((a, b) => a.t - b.t || a.k - b.k); while (this.q.length && this.q[0].t <= this.t) this.q.shift().f(); }
  // a message has come: is the room keeping what it is told (it fell asleep after ten silent seconds)
  take() { const gap = this.t - this.last; this.gaps.push(gap); if (gap > 10) this.asleep = true; this.last = this.t; if (this.asleep) this.lost++; return !this.asleep; }
  // somebody connects: the room is read from what was kept, and awake
  wake() { this.asleep = false; this.last = this.t; }
}
class Client {
  constructor(srv, nick, opt = {}) {
    this.srv = srv; this.nick = nick; this.on = true; this.halt = false; this.pend = new Map(); this.beats = 0; this.opt = opt;
    this.sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
    this.sim.R.nick = nick;
    this.sim.R.syNet = this;
    this.sim.R.wallNow = () => WALL0 + srv.t * 1000;
    this.starting = true;
    srv.clients.push(this);
    srv.at(srv.t + 0.05, () => { this.sim.R.syLocal.SY_ = 1; srv.wake(); });
    srv.at(srv.t + 0.5, () => {
      for (const [n, v] of Object.entries(srv.vars)) this.sim.R.syLocal[n] = v;
      for (const [n, a] of Object.entries(srv.lists)) this.applyList(n, a);
      this.starting = false;
    });
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
  flush() { for (const [n, a] of this.pend) this.send((s) => { if (s.take()) s.lists[n] = a; this.relay((c) => c.applyList(n, a)); }); this.pend.clear(); }
  varChanged(n, v) {
    if (/hb$/.test(n)) { if (this.opt.old) return; this.beats++; }
    this.send((s) => { if (s.take()) s.vars[n] = v; this.relay((c) => { c.sim.R.syLocal[n] = v; }); });
  }
  g(e) { return this.sim.peek(e); }
  call(f) { return this.sim.as('pen', () => f(this.sim.fn)); }
  frame() { try { this.sim.frame(); } catch (e) { console.log('ERR', this.nick, e.message, e.stack.split('\n').slice(1, 5).join(' | ')); process.exit(1); } this.flush(); }
}
let srv = new Server(), cs = [];
const run = (secs) => { for (let f = 0; f < Math.round(secs * 60); f++) { for (const c of cs) if (c.on && !c.halt) c.frame(); srv.step(1 / 60); } };
const close = (c) => { c.on = false; cs.splice(cs.indexOf(c), 1); srv.clients.splice(srv.clients.indexOf(c), 1); c.sim.R.syNet = null; c.sim = null; };
// a page opened: it sits on the title (nothing of the multiplayer part runs there)
const open = (nick, opt) => { const c = new Client(srv, nick, opt); cs.push(c); run(2); return c; };
const list = (c) => { c.call((fn) => { fn.netEnter(); fn.menuGo(4); }); run(3); };
const find = (c, name) => { const n = c.g('NSRV'); for (let k = 1; k <= n; k++) if (c.call((fn) => fn.srvHas(k)) === 1 && String(c.g('shName')) === name) return k; return 0; };
const names = (c) => { const r = []; const n = c.g('NSRV'); for (let k = 1; k <= n; k++) if (c.call((fn) => fn.srvHas(k)) === 1) r.push(k + ':' + c.g('shName')); return r; };
const maxGap = (from) => Math.max(0, ...srv.gaps.slice(from));

// ---- 1. one page alone on the title for 40 s: its line keeps the room from going silent
let A = open('alice');
{ const g0 = srv.gaps.length, b0 = A.beats; run(40);
  ok(A.beats - b0 >= 10 && A.beats - b0 <= 22 && maxGap(g0) < 7, `1. alone on the title for 40 s: ${A.beats - b0} lines written, the longest silence ${maxGap(g0).toFixed(1)} s`); }
// ---- 2. two pages: one of them writes, the other takes over when it goes
let B = open('bob');
{ const g0 = srv.gaps.length, a0 = A.beats, b0 = B.beats; run(40);
  const a = A.beats - a0, b = B.beats - b0;
  ok(a + b <= 24 && a + b >= 10 && maxGap(g0) < 7, `2. two pages for 40 s: ${a} + ${b} lines (not twice as many), the longest silence ${maxGap(g0).toFixed(1)} s`);
  const g1 = srv.gaps.length; close(a >= b ? A : B); const left = a >= b ? B : A; const l0 = left.beats; run(20);
  ok(left.beats - l0 >= 5 && maxGap(g1) < 7, `   the one that wrote most gone: the other writes (${left.beats - l0} in 20 s), the longest silence ${maxGap(g1).toFixed(1)} s`);
  close(left); run(1); A = null; B = null; }

// ---- 3. what the user did. First as the work was (no line: the page is silent on the title) - the model must lose it
const story = (opt, tag) => {
  srv = new Server(); cs = [];
  let P = open('alice', opt);
  list(P);
  P.call((fn) => fn.srvCreate('옛 서버', ' ', 2468, 1, '-')); run(2);
  close(P); run(2);
  P = open('alice', opt);                         // a reload: the server was kept (the room was awake)
  list(P);
  const had = find(P, '옛 서버');
  P.call((fn) => { fn.netLeaveAll(); fn.menuGo(0); });
  run(30);                                        // half a minute on the title
  list(P);
  const lost0 = srv.lost;
  P.call((fn) => fn.srvDelete(had)); run(1);
  const k = P.call((fn) => fn.srvCreate('새 서버', ' ', 1357, 1, '-')); run(3);
  const before = names(P).join(' ');
  close(P); run(2);
  P = open('alice', opt);                         // the reload
  list(P);
  const after = names(P).join(' ');
  console.log(`   ${tag}: place ${had}; deleted and made anew in place ${k} -> on the screen ${before}; ${srv.lost - lost0} messages fell on a sleeping room; after the reload ${after}`);
  close(P); run(1);
  return { had, k, after };
};
{ const r = story({ old: true }, 'a page of the work as it was');
  ok(r.k === r.had && r.after === r.had + ':옛 서버', `3. the work as it was (silent on the title): after the reload the OLD server is back: ${r.after}`); }
{ const r = story({}, 'this work');
  ok(r.k === r.had && r.after === r.had + ':새 서버', `   this work: after the reload the NEW server is there and the old one is not: ${r.after}`); }
// (a page of the old work is kept from sleeping by one of this work in the same room)
{ srv = new Server(); cs = [];
  const O = open('alice', { old: true }); const N = open('bob');
  list(O); O.call((fn) => fn.srvCreate('옛 서버', ' ', 2468, 1, '-')); run(2);
  O.call((fn) => { fn.netLeaveAll(); fn.menuGo(0); }); run(30);
  list(O); const k0 = find(O, '옛 서버'); O.call((fn) => fn.srvDelete(k0)); run(1); O.call((fn) => fn.srvCreate('새 서버', ' ', 1357, 1, '-')); run(3);
  close(O); run(2); const O2 = open('alice', { old: true }); list(O2);
  ok(names(O2).join(' ') === k0 + ':새 서버', `   a page of the old work with one of this work in the room: kept (${names(O2).join(' ')})`);
  close(O2); close(N); run(1); }

// ---- 4. a game that stood still itself (paused): alone, it is told; with another page running, it is not
{ srv = new Server(); cs = [];
  const P = open('alice'); list(P);
  P.sim.poke('netMsg', '');
  P.halt = true; run(14); P.halt = false; run(12);
  ok(String(P.g('netMsg')).includes('새로고침'), `4. alone, stood still for 14 s: told (${String(P.g('netMsg')).slice(0, 34)}…)`);
  const Q = open('bob');
  P.sim.poke('netMsg', '');
  P.halt = true; run(14); P.halt = false; run(12);
  ok(String(P.g('netMsg')) === '', `   with another page running in the room: not told ('${String(P.g('netMsg')).slice(0, 20)}')`);
  P.sim.poke('netMsg', ''); run(30);
  ok(String(P.g('netMsg')) === '', '   and nothing is said while it runs');
  // (a page of the work as it was writes no ?!hb - on the list its slot's line every second keeps the room awake all the same)
  close(Q); const O = open('carol', { old: true }); list(O);
  P.sim.poke('netMsg', ''); const lost0 = srv.lost;
  P.halt = true; run(14); P.halt = false; run(12);
  ok(String(P.g('netMsg')) === '' && srv.lost === lost0, `   with a page of the old work on the list instead: not told ('${String(P.g('netMsg')).slice(0, 20)}', ${srv.lost - lost0} messages on a sleeping room)`);
  close(P); close(O); }
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);

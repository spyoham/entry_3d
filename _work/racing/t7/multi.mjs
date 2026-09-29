// Several players at once on Entry Sync lists ('?!' names, SY_* in the
// source), against a model of the extension (Entry-Sync extension/inject.js,
// content.js) and its room server:
//   * the '?!' flag turns 1 a moment after the start (the socket opens)
//   * the room's lists arrive after `welcome` seconds and replace the local
//     copies; lists the room does not have keep the work's defaults
//   * until they arrive - at most 4 s (isStartingUp) - local changes are not
//     sent at all; after that every change sends the WHOLE list
//   * the server keeps the last list it received and passes it on to every
//     other player (never back to the sender)
// usage: node t7/multi.mjs [latency ms] [welcome s]
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 120)) / 1000;
const WELCOME = +(process.argv[3] || 3);
const JIT = (+(process.env.JIT || 0)) / 1000;     // random extra delay per message
const fps = 10;

class Server {
    constructor() { this.log = []; this.lists = {}; this.t = 0; this.q = []; this.clients = []; this.writes = 0; }
    at(t, f) { this.q.push({ t, f, k: this.k = (this.k || 0) + 1 }); }
    step(dt) {
        this.t += dt;
        this.q.sort((a, b) => a.t - b.t || a.k - b.k);
        while (this.q.length && this.q[0].t <= this.t) this.q.shift().f();
    }
    item(n, i) { return String((this.lists[n] || [])[i - 1] ?? ''); }
}
class Client {
    constructor(srv, nick, welcome, { ext = true } = {}) {
        this.srv = srv; this.nick = nick;
        this.sim = createSim({ fps });
        this.sim.R.nick = nick;
        this.sim.R.syNet = this;
        this.t0 = srv.t;
        this.starting = true;
        srv.clients.push(this);
        if (!ext) { this.sim.R.syNet = null; return; }
        srv.at(srv.t + 0.05, () => { this.sim.R.syLocal.SY_ = 1; });
        srv.at(srv.t + welcome, () => {
            for (const [n, a] of Object.entries(srv.lists)) this.apply(n, a);
            this.starting = false;
        });
        srv.at(srv.t + 4, () => { this.starting = false; });
    }
    apply(n, a) {
        if (process.env.TRACE && n === process.env.TRACE) this.srv.log.push(`${this.srv.t.toFixed(2)} ${this.nick} <- ${xpOf(a)}`);
        const L = this.sim.R.syLists[n];
        if (L) L.splice(0, L.length, ...a);
    }
    // (one socket each way: messages arrive late, but in the order sent)
    changed(n, a) {
        if (this.starting) return;
        const s = this.srv;
        if (process.env.TRACE && n === process.env.TRACE) s.log.push(`${s.t.toFixed(2)} ${this.nick} -> ${xpOf(a)}`);
        this.up = Math.max(s.t + LAT + Math.random() * JIT, (this.up || 0) + 1e-6);
        s.at(this.up, () => {
            s.lists[n] = a; s.writes++;
            if (s.onWrite) s.onWrite(this, n);
            if (process.env.TRACE && n === process.env.TRACE) s.log.push(`${s.t.toFixed(2)} srv <- ${this.nick} ${xpOf(a)}`);
            for (const c of s.clients) if (c !== this) {
                c.down = Math.max(s.t + LAT + Math.random() * JIT, (c.down || 0) + 1e-6);
                s.at(c.down, () => c.apply(n, a));
            }
        });
    }
    g(e) { return this.sim.peek(e); }
}
const xpOf = (a) => a.map((v) => String(v).split(',').slice(0, 2).join(':').slice(1)).join(' ');
const run = (srv, clients, secs, each) => {
    for (let f = 0; f < secs * fps; f++) {
        for (const c of clients) { c.sim.frame(); if (each) each(c); }
        srv.step(1 / fps);
    }
};
// the player's XP as saved (the largest, should a test have moved them between lists)
const recOf = (srv, nick) => {
    let best = -1;
    for (const [k, a] of Object.entries(srv.lists)) if (k.startsWith('SY_save')) for (const v of a) { const m = String(v).match(new RegExp('^\\|' + nick + ',(\\d+)')); if (m) best = Math.max(best, +m[1]); }
    return best;
};
// (peeked lists are raw 0-based arrays: pendRk[4] is circuit 5)
// ONLY=E,G runs just those
const want = (k) => !process.env.ONLY || process.env.ONLY.split(',').includes(k);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
console.log(`latency ${LAT * 1000} ms, welcome after ${WELCOME} s`);

const idle = (srv, cs, secs) => run(srv, cs, secs);
const rank = (srv, tk) => srv.item('SY_rank', tk);
const rkHas = (srv, tk, nick) => rank(srv, tk).includes('|' + nick + ',');
// a room somebody has saved in before: the ranking lists exist
const seeded = (srv) => { srv.lists.SY_rank = new Array(19).fill('|'); srv.lists.SY_ghost = new Array(19).fill('|'); };

// ---- A: a returning player whose saved game arrives late ----------------------
if (want('A')) {
    const srv = new Server();
    const seed = new Client(srv, 'alice', 0.1);
    idle(srv, [seed], 22);                           // a brand-new work: no ?!rank yet, assumed after 20 s
    const sync0 = +seed.g('pSync');
    seed.g('addXP(5000); stRaces = 12; pDirty = 1; pSaveT = 0;');
    idle(srv, [seed], 5);
    const before = recOf(srv, 'alice');
    srv.clients = [];
    const a = new Client(srv, 'alice', WELCOME);
    idle(srv, [a], 1);
    a.g('addXP(300);');                              // earned before her save arrived
    idle(srv, [a], WELCOME + 6);
    const after = recOf(srv, 'alice');
    ok(sync0 > 0 && before === 5000 && after === 5300 && srv.lists.SY_rank.length === 19,
        `A late lists: new work sync ${sync0}, saved XP ${before}, +300 earned before the save arrived -> ${after} (level ${a.g('pLv')}, sync ${a.g('pSync')})`);
}

// ---- A2: the lists arrive after the 4 s gate - nothing may be wiped -------------
if (want('A2')) {
    const srv = new Server();
    seeded(srv);
    srv.lists.SY_save1 = ['|zoe,777,0,0,0,0,3,3,3,3,0,1,0,0,5,0' + ',0'.repeat(16)];
    const a = new Client(srv, 'bob', 9);
    a.g('addXP(200);');
    idle(srv, [a], 16);
    ok(recOf(srv, 'zoe') === 777 && recOf(srv, 'bob') === 200, `A2 lists 9 s late: zoe kept ${recOf(srv, 'zoe')}, bob saved ${recOf(srv, 'bob')} (writes ${srv.writes})`);
}

// ---- B: two players in the same save list saving at the same moment ------------
if (want('B')) {
    const srv = new Server();
    seeded(srv);
    const a = new Client(srv, 'alice', 0.3), b = new Client(srv, 'bob', 0.3);
    idle(srv, [a, b], 5);
    let lost = 0;
    for (let i = 0; i < 10; i++) {
        a.g(`pSh = 1; addXP(100); pDirty = 1; pSaveT = 0;`);
        b.g(`pSh = 1; addXP(100); pDirty = 1; pSaveT = 0;`);
        idle(srv, [a, b], 12);
        if (recOf(srv, 'alice') !== +a.g('pXP') || recOf(srv, 'bob') !== +b.g('pXP')) lost++;
    }
    ok(lost === 0, `B same-moment saves in one list, 10 rounds: ${lost} rounds lost a record (alice ${recOf(srv, 'alice')}/${a.g('pXP')}, bob ${recOf(srv, 'bob')}/${b.g('pXP')})`);
}

// ---- C: three players setting best laps on the same circuit at once ------------
if (want('C')) {
    const srv = new Server();
    seeded(srv);
    const cs = ['alice', 'bob', 'carol'].map((n) => new Client(srv, n, 0.3));
    idle(srv, cs, 5);
    cs.forEach((c, i) => c.g(`pendRk[4] = ${80 + i}; pendG[4] = 0;`));
    idle(srv, cs, 20);
    const n = ['alice', 'bob', 'carol'].filter((x) => rkHas(srv, 5, x)).length;
    ok(n === 3, `C same-moment ranking entries: ${n} of 3 kept: ${rank(srv, 5)}`);
}

// ---- D: a lap time set before the ranking has arrived ------------------------------
if (want('D')) {
    const srv = new Server();
    seeded(srv);
    const seed = new Client(srv, 'zed', 0.1);
    idle(srv, [seed], 5);
    seed.g('pendRk[4] = 70; pendG[4] = 0;');
    idle(srv, [seed], 5);
    srv.clients = [];
    const a = new Client(srv, 'amy', WELCOME);
    idle(srv, [a], 1);
    a.g('pendRk[4] = 75; pendG[4] = 0;');            // a lap finished before the lists came
    idle(srv, [a], WELCOME + 8);
    ok(rkHas(srv, 5, 'zed') && rkHas(srv, 5, 'amy'), `D ranking with a lap set before the lists came: ${rank(srv, 5)}`);
}

// ---- E: four players, a minute of random saves and laps --------------------------------
if (want('E')) {
    const srv = new Server();
    seeded(srv);
    const names = ['ann', 'ben', 'cat', 'dan'];
    const cs = names.map((n) => new Client(srv, n, 0.2 + Math.random()));
    idle(srv, cs, 5);
    cs.forEach((c) => c.g('pSh = 3;'));             // all in one list: the worst case
    const best = {};
    run(srv, cs, 60, (c) => {
        if (Math.random() < 0.02) c.g('addXP(50); pDirty = 1;');
        if (Math.random() < 0.01) { const t = 60 + Math.random() * 30; if (!best[c.nick] || t < best[c.nick]) { best[c.nick] = t; c.g(`pendRk[2] = ${t.toFixed(3)}; pendG[2] = 0;`); } }   // (lapDone pends a new best only)
    });
    idle(srv, cs, 20);
    const saved = cs.filter((c) => recOf(srv, c.nick) === +c.g('pXP')).length;
    if (process.env.DBG) { for (const c of cs) console.log(c.nick, 'xp', c.g('pXP'), 'srv', recOf(srv, c.nick), 'verT', c.g('pVerT'), 'dirty', c.g('pDirty'), 'verN', c.g('pVerN'), 'sh', c.g('pSh'), 'rkT', c.g('pRkT')); console.log(srv.log.join(String.fromCharCode(10))); console.log('srv rank', rank(srv, 3), 'best', JSON.stringify(best)); for (const c of cs) console.log(c.nick, 'local rank', c.g('SY_rank[2]'), 'pend', c.g('pendRk[2]'), 'rkN', c.g('pRkN'), 'recLap', c.g('recLap[3]')); }
    const ranked = Object.keys(best).filter((n) => { const m = rank(srv, 3).match(new RegExp('\\|' + n + ',(\\d+)')); return m && Math.abs(+m[1] - Math.round(best[n] * 1000)) <= 1; }).length;
    ok(saved === 4 && ranked === Object.keys(best).length, `E 4 players, one list, 60 s: ${saved}/4 saves current, ${ranked}/${Object.keys(best).length} best laps ranked; ${srv.writes} server writes`);
}

// ---- F (v9): a garage change that earns no XP, while another player saves the same list ----
if (want('F')) {
    const srv = new Server();
    seeded(srv);
    const a = new Client(srv, 'alice', 0.3), b = new Client(srv, 'bob', 0.3);
    idle(srv, [a, b], 5);
    a.g('pSh = 2; addXP(400); pDirty = 1; pSaveT = 0;'); b.g('pSh = 2; addXP(100); pDirty = 1; pSaveT = 0;');
    idle(srv, [a, b], 12);
    let lost = 0;
    for (let i = 0; i < 6; i++) {
        a.g('upE = upE + 1; if (upE > UPMAX) { upE = 1; } pDirty = 1; pSaveT = 0;');   // no XP involved
        b.g('addXP(20); pDirty = 1; pSaveT = 0;');
        idle(srv, [a, b], 12);
        const rec = (srv.lists.SY_save2 || []).find((v) => String(v).startsWith('|alice,'));
        const m = rec && String(rec).match(/^\|alice,\d+,(\d+),/);
        if (!m || +m[1] !== +a.g('upE')) lost++;
    }
    ok(lost === 0, `F garage-only change vs a same-moment save, 6 rounds: ${lost} rounds lost the change`);
}

// ---- G (v9): two new circuit records at the same moment - the ghost must be P1's ----
if (want('G')) {
    let bad = 0;
    const NR = +(process.env.GR || 5);
    for (let round = 0; round < NR; round++) {
        const srv = new Server();
        seeded(srv);
        const a = new Client(srv, 'alice', 0.3), b = new Client(srv, 'bob', 0.3);
        idle(srv, [a, b], 5);
        for (const [c, t] of [[a, 80.5], [b, 79.25]]) {
            c.g(`pbN[3] = 12; for (let i = 0; i < 12; i++) { pbX[3 * PBN + i] = 10 + i; pbZ[3 * PBN + i] = 5 + i; } pendRk[3] = ${t}; pendG[3] = 1;`);
        }
        // bob's write lands first in odd rounds, alice's in even ones
        if (round % 2) { idle(srv, [b], 0.1); }
        idle(srv, [a, b], 20);
        const k = rank(srv, 4), gst = srv.item('SY_ghost', 4);
        const p1 = (k.match(/\|\|?([^,|]+),(\d+)/) || [])[1];
        if (process.env.DBG) console.log('K', k, 'G', gst.slice(0, 30));
        if (p1 !== 'bob' || !gst.startsWith('bob,79250,')) bad++;
        a.g('loadWrGhost(4)');
        if (a.g('oWR') == 1 && !gst.startsWith('bob,')) bad++;
    }
    ok(bad === 0, `G two record laps at once, ${NR} rounds: ${bad} rounds left a ghost that is not P1's`);
}

// ---- H (v2.0.0): no Entry Sync - offline after 3 s, the game still saves locally ----
if (want('H')) {
    const srv = new Server();
    const a = new Client(srv, 'alice', 0.3, { ext: false });
    idle(srv, [a], 5);
    const sync = +a.g('pSync'), label = a.g('(syLabel(), oSyL)');
    a.g('addXP(120); pDirty = 1; pSaveT = 0;');
    idle(srv, [a], 5);
    ok(sync > 0 && /OFFLINE/.test(label) && srv.writes === 0 && +a.g('SY_save' + a.g('pSh') + '.length') === 1,
        `H without the extension: sync ${sync} at 5 s, '${label}', ${srv.writes} server writes, local save kept`);
}

// ---- I (v2.0.0): a full save list drops its least recently saved records ----
if (want('I')) {
    const srv = new Server();
    seeded(srv);
    srv.lists.SY_save5 = Array.from({ length: 60 }, (_, i) => `|p${i + 1},${100 + i},0,0,0,0,3,3,3,3,0,1,0,0,5,0` + ',0'.repeat(16));
    const a = new Client(srv, 'newbie', 0.3);
    idle(srv, [a], 5);
    a.g('pSh = 5; addXP(50); pDirty = 1; pSaveT = 0;');
    idle(srv, [a], 5);
    const L = srv.lists.SY_save5;
    ok(L.length === 60 && recOf(srv, 'p1') < 0 && recOf(srv, 'p2') === 101 && String(L[59]).startsWith('|newbie,'),
        `I full list: ${L.length} records, oldest dropped, newest last`);
}

// ---- J (v2.0.0): an older copy of a list sent after a save - the owners put their entries back ----
if (want('J')) {
    const srv = new Server();
    seeded(srv);
    const a = new Client(srv, 'alice', 0.3), b = new Client(srv, 'bob', 0.3);
    idle(srv, [a, b], 5);
    a.g('pSh = 4; addXP(300); pDirty = 1; pSaveT = 0; pendRk[6] = 71.5; pendG[6] = 0;');
    idle(srv, [a, b], 8);
    const old4 = (srv.lists.SY_save4 || []).slice(), oldRank = srv.lists.SY_rank.slice();
    a.g('addXP(200); pDirty = 1; pSaveT = 0; pendRk[6] = 70.25; pendG[6] = 0;');
    idle(srv, [a, b], 8);
    const saved = recOf(srv, 'alice'), ranked = rank(srv, 7);
    // bob's copy of both lists from before alice's second save, sent again
    b.changed('SY_save4', old4.map(String).filter((v) => !v.startsWith('|alice,')));
    b.changed('SY_rank', oldRank.map((v, i) => (i === 6 ? '|' : v)));
    let lost = -2, lostRk = '?';
    srv.onWrite = (c, n) => { if (c === b && n === 'SY_rank') { lost = recOf(srv, 'alice'); lostRk = rank(srv, 7); } };
    idle(srv, [a, b], 10);
    const xp = +a.g('pXP');
    ok(saved === xp && ranked.includes('alice,70250') && lost < xp && !lostRk.includes('alice')
        && recOf(srv, 'alice') === xp && rank(srv, 7).includes('alice,70250'),
        `J rolled back by an old copy (record ${lost}, ranking '${lostRk}') -> put back: record ${recOf(srv, 'alice')}, ranking '${rank(srv, 7)}'`);
}

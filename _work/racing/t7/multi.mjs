// Several players at once on Entry real-time variables, against a model of
// Entry's cloud-variable server (entryjs src/extensions/CloudVariable.js):
//   * a client starts with the work's default values until the server's
//     'welcome' (all current values) arrives - after `welcome` seconds
//   * set() sends the new value; the server applies it (last write wins) and
//     sends it to everybody; the writer's own copy changes only on the ack
//   * get() returns the client's current copy
// usage: node t7/multi.mjs [latency ms] [welcome s]
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 120)) / 1000;
const WELCOME = +(process.argv[3] || 3);
const fps = 10;

class Server {
    constructor() { this.vals = null; this.t = 0; this.q = []; this.clients = []; this.writes = 0; }
    at(t, f) { this.q.push({ t, f }); }
    step(dt) {
        this.t += dt;
        this.q.sort((a, b) => a.t - b.t);
        while (this.q.length && this.q[0].t <= this.t) this.q.shift().f();
    }
}
class Client {
    constructor(srv, nick, welcome) {
        this.srv = srv; this.nick = nick;
        this.sim = createSim({ fps });
        this.sim.R.nick = nick;
        this.local = { ...this.sim.R.rtDefaults };
        if (!srv.vals) srv.vals = { ...this.sim.R.rtDefaults };
        this.sim.R.rtNet = this;
        srv.clients.push(this);
        srv.at(srv.t + welcome, () => { this.local = { ...srv.vals }; });
    }
    get(n) { return this.local[n]; }
    set(n, v) {
        const s = this.srv;
        s.at(s.t + LAT, () => {
            s.vals[n] = v; s.writes++;
            for (const c of s.clients) s.at(s.t + LAT, () => { c.local[n] = v; });
        });
    }
    g(e) { return this.sim.peek(e); }
}
const run = (srv, clients, secs, each) => {
    for (let f = 0; f < secs * fps; f++) {
        for (const c of clients) { c.sim.frame(); if (each) each(c); }
        srv.step(1 / fps);
    }
};
// the player's XP as saved (the largest, should a test have moved them between slots)
const recOf = (srv, nick) => {
    let best = -1;
    for (const [k, v] of Object.entries(srv.vals)) if (k.startsWith('RT_S')) { const m = String(v).match(new RegExp('\\|' + nick + ',(\\d+)')); if (m) best = Math.max(best, +m[1]); }
    return best;
};
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
console.log(`latency ${LAT * 1000} ms, welcome after ${WELCOME} s`);

const idle = (srv, cs, secs) => run(srv, cs, secs);
const rkHas = (srv, tk, nick) => String(srv.vals['RT_K' + tk]).includes('|' + nick + ',');

// ---- A: a returning player whose saved game arrives late ----------------------
{
    const srv = new Server();
    const seed = new Client(srv, 'alice', 0.1);
    idle(srv, [seed], 14);                           // a brand-new work: no RT_SYNC yet, assumed after 12 s
    seed.g('addXP(5000); stRaces = 12; pDirty = 1; pSaveT = 0;');
    idle(srv, [seed], 5);
    const before = recOf(srv, 'alice');
    srv.clients = [];
    const a = new Client(srv, 'alice', WELCOME);
    idle(srv, [a], 1);
    a.g('addXP(300);');                              // earned before her save arrived
    idle(srv, [a], WELCOME + 6);
    const after = recOf(srv, 'alice');
    ok(before === 5000 && after === 5300, `A late welcome: saved XP ${before}, +300 earned before the save arrived -> ${after} (level ${a.g('pLv')}, sync ${a.g('pSync')})`);
}

// ---- B: two players in the same save slot saving at the same moment ------------
{
    const srv = new Server();
    srv.vals = null;
    const a = new Client(srv, 'alice', 0.3), b = new Client(srv, 'bob', 0.3);
    srv.vals.RT_SYNC = 'ok';
    idle(srv, [a, b], 3);
    let lost = 0;
    for (let i = 0; i < 10; i++) {
        a.g(`pSh = 1; addXP(100); pDirty = 1; pSaveT = 0;`);
        b.g(`pSh = 1; addXP(100); pDirty = 1; pSaveT = 0;`);
        idle(srv, [a, b], 12);
        if (recOf(srv, 'alice') !== +a.g('pXP') || recOf(srv, 'bob') !== +b.g('pXP')) lost++;
    }
    ok(lost === 0, `B same-moment saves in one slot, 10 rounds: ${lost} rounds lost a record (alice ${recOf(srv, 'alice')}/${a.g('pXP')}, bob ${recOf(srv, 'bob')}/${b.g('pXP')})`);
}

// ---- C: three players setting best laps on the same circuit at once ------------
{
    const srv = new Server();
    const cs = ['alice', 'bob', 'carol'].map((n) => new Client(srv, n, 0.3));
    srv.vals.RT_SYNC = 'ok';
    idle(srv, cs, 3);
    cs.forEach((c, i) => c.g(`pendRk[4] = ${80 + i}; pendG[4] = 0;`));
    idle(srv, cs, 20);
    const n = ['alice', 'bob', 'carol'].filter((x) => rkHas(srv, 5, x)).length;
    ok(n === 3, `C same-moment ranking entries: ${n} of 3 kept: ${srv.vals.RT_K5}`);
}

// ---- D: a lap time set before the ranking has arrived ------------------------------
{
    const srv = new Server();
    const seed = new Client(srv, 'zed', 0.1);
    srv.vals.RT_SYNC = 'ok';
    idle(srv, [seed], 2);
    seed.g('pendRk[4] = 70; pendG[4] = 0;');
    idle(srv, [seed], 5);
    srv.clients = [];
    const a = new Client(srv, 'amy', WELCOME);
    idle(srv, [a], 1);
    a.g('pendRk[4] = 75; pendG[4] = 0;');            // a lap finished before the welcome
    idle(srv, [a], WELCOME + 8);
    ok(rkHas(srv, 5, 'zed') && rkHas(srv, 5, 'amy'), `D ranking with a lap set before the welcome: ${srv.vals.RT_K5}`);
}

// ---- E: four players, a minute of random saves and laps --------------------------------
{
    const srv = new Server();
    const names = ['ann', 'ben', 'cat', 'dan'];
    const cs = names.map((n) => new Client(srv, n, 0.2 + Math.random()));
    srv.vals.RT_SYNC = 'ok';
    idle(srv, cs, 3);
    cs.forEach((c) => c.g('pSh = 3;'));             // all in one slot: the worst case
    const best = {};
    run(srv, cs, 60, (c) => {
        if (Math.random() < 0.02) c.g('addXP(50); pDirty = 1;');
        if (Math.random() < 0.01) { const t = 60 + Math.random() * 30; if (!best[c.nick] || t < best[c.nick]) best[c.nick] = t; c.g(`pendRk[2] = ${t.toFixed(3)}; pendG[2] = 0;`); }
    });
    idle(srv, cs, 20);
    const saved = cs.filter((c) => recOf(srv, c.nick) === +c.g('pXP')).length;
    if (process.env.DBG) { for (const c of cs) console.log(c.nick, 'xp', c.g('pXP'), 'srv', recOf(srv, c.nick), 'verT', c.g('pVerT'), 'dirty', c.g('pDirty'), 'saveT', (+c.g('pSaveT')).toFixed(2), 'verN', c.g('pVerN'), 'sh', c.g('pSh'), 'rkT', c.g('pRkT'), 'st', c.g('raceState')); console.log(srv.vals.RT_S3); }
    const ranked = Object.keys(best).filter((n) => { const m = String(srv.vals.RT_K3).match(new RegExp('\\|' + n + ',(\\d+)')); return m && Math.abs(+m[1] - Math.round(best[n] * 1000)) <= 1; }).length;
    ok(saved === 4 && ranked === Object.keys(best).length, `E 4 players, one slot, 60 s: ${saved}/4 saves current, ${ranked}/${Object.keys(best).length} best laps ranked; ${srv.writes} server writes`);
}

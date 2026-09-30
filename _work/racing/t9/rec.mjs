// the player's best laps and the world records, as a player sees them:
// a returning player (her old save and the ranking on the server) drives a
// time trial, goes back to the menu, another player beats her record, and
// she comes back later. Entry Sync is modelled as in t7/multi.mjs.
// usage: node t9/rec.mjs [circuit]
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 5);
const fps = 10;
const LAT = 0.12;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

class Server {
    constructor() { this.lists = {}; this.t = 0; this.q = []; this.clients = []; }
    at(t, f) { this.q.push({ t, f, k: this.k = (this.k || 0) + 1 }); }
    step(dt) {
        this.t += dt;
        this.q.sort((a, b) => a.t - b.t || a.k - b.k);
        while (this.q.length && this.q[0].t <= this.t) this.q.shift().f();
    }
    item(n, i) { return String((this.lists[n] || [])[i - 1] ?? ''); }
    // another player's write (the whole list), passed on to everybody
    put(n, a) { this.lists[n] = a; for (const c of this.clients) this.at(this.t + LAT, () => c.apply(n, a)); }
}
class Client {
    constructor(srv, nick, welcome = 0.5) {
        this.srv = srv; this.nick = nick;
        this.sim = createSim({ fps });
        this.sim.R.nick = nick;
        this.sim.R.syNet = this;
        this.starting = true;
        srv.clients.push(this);
        srv.at(srv.t + 0.05, () => { this.sim.R.syLocal.SY_ = 1; });
        srv.at(srv.t + welcome, () => { for (const [n, a] of Object.entries(srv.lists)) this.apply(n, a); this.starting = false; });
        srv.at(srv.t + 4, () => { this.starting = false; });
    }
    apply(n, a) { const L = this.sim.R.syLists[n]; if (L) L.splice(0, L.length, ...a); }
    changed(n, a) {
        if (this.starting) return;
        const s = this.srv;
        s.at(s.t + LAT, () => {
            s.lists[n] = a;
            for (const c of s.clients) if (c !== this) s.at(s.t + LAT, () => c.apply(n, a));
        });
    }
    g(e) { return this.sim.peek(e); }
}
const run = (srv, cs, secs, until) => {
    for (let f = 0; f < secs * fps; f++) {
        for (const c of cs) c.sim.frame();
        srv.step(1 / fps);
        if (until && until()) return true;
    }
    return false;
};

// alice's old save: a 200 s best lap on the circuit; zed holds the record at 150 s
const rec = (nick, xp, lap) => {
    const f = [nick, xp, 0, 0, 0, 0, 3, 3, 3, 3, 1, 4, 1, 2, 55, 16];
    for (let t = 1; t <= 8; t++) f.push(t === trk ? lap : 0);
    for (let t = 1; t <= 8; t++) f.push(0);
    f.push(3, 3, 3, 4);
    for (let t = 9; t <= 14; t++) f.push(t === trk ? lap : 0);
    for (let t = 9; t <= 14; t++) f.push(0);
    for (let t = 15; t <= 19; t++) f.push(t === trk ? lap : 0);
    for (let t = 15; t <= 19; t++) f.push(0);
    return '|' + f.join(',');
};
const srv = new Server();
srv.lists.SY_rank = new Array(19).fill('|');
srv.lists.SY_rank[trk - 1] = '||zed,150000|alice,200000';
srv.lists.SY_ghost = new Array(19).fill('|');
const probe = new Client(srv, 'alice');
const sh = +probe.g('(()=>{ whoAmI(); return pSh; })()');
srv.clients = [];
for (let s = 1; s <= 8; s++) srv.lists['SY_save' + s] = [rec('zoe', 777, 0)];
srv.lists['SY_save' + sh] = [rec('zoe', 777, 0), rec('alice', 5000, 200000)];

let a = new Client(srv, 'alice');
run(srv, [a], 6);
const cardOf = (c) => ({ my: +c.g('recLap')[trk - 1], wr: +c.g('recWR')[trk - 1], nm: c.g('recNm')[trk - 1] });
let cd = cardOf(a);
ok(+a.g('pSync') === 1 && cd.my === 200 && cd.wr === 150 && cd.nm === 'zed', `loaded: my best ${cd.my}, record ${cd.wr} ${cd.nm}`);

// a time trial, driven by the AI: each new best lap reaches the server while
// she is still on track (she may stop the work at any moment)
a.g(`gMode = M_TT; ghSel = 3; selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
a.g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const laps = [];
let seen = 1;
let onTrack = [];
run(srv, [a], 600, () => {
    const l = +a.g('caLap')[0];
    if (l > seen) { seen = l; laps.push({ lt: +a.g('lastLap'), best: +a.g('recLap')[trk - 1] }); onTrack.push(-1); }
    // 8 s after each lap: what the server holds
    if (onTrack.length && onTrack[onTrack.length - 1] < 0 && +a.g('raceT') - +a.g('caLapT')[0] > 8) {
        const best = +a.g('recLap')[trk - 1];
        onTrack[onTrack.length - 1] = { rank: srv.item('SY_rank', trk).includes(`|alice,${Math.round(best * 1000)}`), save: srv.item('SY_save' + sh, 2).includes(',' + Math.round(best * 1000) + ','), st: +a.g('raceState') };
    }
    return seen > 3 && onTrack[onTrack.length - 1] !== -1;
});
ok(laps.length >= 3, `laps: ${laps.map((l) => `${l.lt.toFixed(2)} (best ${l.best.toFixed(2)})`).join(', ')}`);
const fastest = Math.min(...laps.map((l) => l.lt));
ok(Math.abs(+a.g('recLap')[trk - 1] - fastest) < 0.001, `my best while driving: ${(+a.g('recLap')[trk - 1]).toFixed(3)} (fastest lap ${fastest.toFixed(3)})`);
ok(onTrack.every((o) => o.rank && o.save && o.st === 3), `on track, 8 s after each lap the server has the best lap in the ranking and the save: ${JSON.stringify(onTrack)}`);
ok(+a.g("typeof pRecNow == 'undefined' ? 0 : pRecNow") === 0, 'and the on-track saving is over');

// back to the menu
a.g('toMenu();');
run(srv, [a], 12);
cd = cardOf(a);
ok(Math.abs(cd.my - fastest) < 0.001 && Math.abs(cd.wr - fastest) < 0.001 && cd.nm === 'alice', `menu card: my best ${cd.my.toFixed(3)}, record ${cd.wr.toFixed(3)} ${cd.nm}`);
ok(srv.item('SY_rank', trk).startsWith(`||alice,${Math.round(fastest * 1000)}|zed,150000`), `server ranking: ${srv.item('SY_rank', trk)}`);

// bob beats it from another computer
srv.put('SY_rank', srv.lists.SY_rank.map((v, i) => (i === trk - 1 ? '||bob,100000' + v.slice(1) : v)));
run(srv, [a], 6);
cd = cardOf(a);
ok(cd.wr === 100 && cd.nm === 'bob', `bob's new record reaches alice's menu: ${cd.wr} ${cd.nm}`);

// alice drives a 90 s lap on her other computer: her save and the ranking change
const other = srv.item('SY_save' + sh, 2).split(',');
other[16 + trk > 24 ? 0 : 16 + trk - 1] = '90000';
const fa = trk > 14 ? 34 + trk : trk > 8 ? 28 + trk : 16 + trk;
const o2 = srv.item('SY_save' + sh, 2).split(','); o2[fa - 1] = '90000'; o2[1] = String(+o2[1] + 45);
srv.put('SY_save' + sh, [srv.item('SY_save' + sh, 1), o2.join(',')]);
srv.put('SY_rank', srv.lists.SY_rank.map((v, i) => (i === trk - 1 ? `||alice,90000|bob,100000|zed,150000` : v)));
run(srv, [a], 6);
cd = cardOf(a);
ok(cd.my === 90 && cd.wr === 90 && cd.nm === 'alice', `her lap from the other computer shows: my best ${cd.my}, record ${cd.wr} ${cd.nm}, XP ${a.g('pXP')}`);

// alice comes back another day
srv.clients = [];
a = new Client(srv, 'alice');
run(srv, [a], 6);
cd = cardOf(a);
ok(cd.my === 90 && cd.wr === 90 && cd.nm === 'alice', `next session: my best ${cd.my}, record ${cd.wr} ${cd.nm}`);

// Entry stopped and started without reloading: the lists are back to what the
// room last sent (not her own writes) until Entry Sync puts the room's in
const stale = { ...srv.lists };
srv.put('SY_rank', srv.lists.SY_rank.map((v, i) => (i === trk - 1 ? `||alice,85000|bob,100000|zed,150000` : v)));
const o3 = srv.item('SY_save' + sh, 2).split(','); o3[fa - 1] = '85000';
srv.put('SY_save' + sh, [srv.item('SY_save' + sh, 1), o3.join(',')]);
srv.clients = [];
a = new Client(srv, 'alice', 0.8);
for (const [n, v] of Object.entries(stale)) a.apply(n, v);
run(srv, [a], 8);
cd = cardOf(a);
ok(cd.my === 85 && cd.wr === 85 && cd.nm === 'alice', `restarted on old lists: my best ${cd.my}, record ${cd.wr} ${cd.nm}`);
ok(srv.item('SY_rank', trk).startsWith('||alice,85000|bob,100000'), `the server's ranking was not rolled back: ${srv.item('SY_rank', trk)}`);

// an online race leaves remote cars behind; the next race is an ordinary one
a.g('caNet[0] = 1; caNet[1] = 1; caNet[2] = 1;');
a.g(`recLap[${trk - 1}] = 0; gMode = M_TT; ghSel = 3; selTrk = ${trk}; buildTrack(${trk}); doStartRace();`);
a.g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const lap0 = +a.g('caLap')[0];
run(srv, [a], 300, () => +a.g('caLap')[0] > lap0 + 2);
ok(+a.g('caLap')[0] > lap0 + 2 && +a.g('recLap')[trk - 1] > 0, `after an online race (watched): laps ${a.g('caLap')[0]}, my best ${(+a.g('recLap')[trk - 1]).toFixed(2)}`);
a.g('caNet[1] = 1; caNet[2] = 1; gMode = M_GP; selTrk = 5; buildTrack(5); doStartRace();');
run(srv, [a], 40);
const moved = a.g('caSpd').slice(1, 8).filter((v) => Math.abs(+v) > 5).length;
ok(moved === 7, `after an online race (raced): AI cars moving 40 s into a race: ${moved} / 7`);

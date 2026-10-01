// v2.3.0 the daily challenge, in the node sim with Entry Sync modelled as in
// t9/rec.mjs: the day's challenge from the date, a real drive (laps, the
// day's car, ranking and ghost while on track, settings back after), another
// player's time, the next day (streak, a fresh ranking), a missed day, a
// stint day, the save and the backup code.
// usage: node t9/daily.mjs
import { createSim } from '../sim.mjs';
const fps = 10;
const LAT = 0.12;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

class Server {
    constructor() { this.lists = {}; this.t = 0; this.q = []; this.clients = []; }
    at(t, f) { this.q.push({ t, f, k: this.k = (this.k || 0) + 1 }); }
    step(dt) {
        this.t += dt;
        this.q.sort((a, b) => a.t - b.t || a.k - b.k);
        while (this.q.length && this.q[0].t <= this.t) this.q.shift().f();
    }
    item(n, i) { return String((this.lists[n] || [])[i - 1] ?? ''); }
    put(n, a) { this.lists[n] = a; for (const c of this.clients) this.at(this.t + LAT, () => c.apply(n, a)); }
}
let NOW = new Date(2026, 9, 1, 10, 0, 0).getTime();
class Client {
    constructor(srv, nick, welcome = 0.5) {
        this.srv = srv; this.nick = nick;
        this.sim = createSim({ fps });
        this.sim.R.nick = nick;
        this.sim.R.syNet = this;
        this.sim.R.wallNow = () => NOW;
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
    L(list, i) { return this.g(`${list}[${i - 1}]`); }
}
const run = (srv, cs, secs, until) => {
    for (let f = 0; f < secs * fps; f++) {
        for (const c of cs) c.sim.frame();
        srv.step(1 / fps);
        if (until && until()) return true;
    }
    return false;
};
const DAY = 864e5;
// the challenge of day n, as the game must make it
const NTRK = 19, NCARTYPE = 4;
const chal = (n) => ({ trk: (n * 8) % NTRK + 1, kind: n % 3 === 2 ? 2 : 1, wx: (n * 5 + 3) % 7 < 2 ? 2 : 1, car: (n * 3 + 1) % NCARTYPE + 1, rules: (n * 11 + 2) % 5 < 2 ? 2 : 1 });
const dayOf = (ms) => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
const DK = 21;

const srv = new Server();
srv.lists.SY_rank = new Array(19).fill('|');
srv.lists.SY_ghost = new Array(19).fill('|');
for (let s = 1; s <= 8; s++) srv.lists['SY_save' + s] = [];
// a day with a dry arcade hot lap from today on (the drive), and the day after it
let n0 = dayOf(NOW);
while (!(chal(n0).kind === 1 && chal(n0).wx === 1 && chal(n0).rules === 1)) n0++;
NOW += (n0 - dayOf(NOW)) * DAY;
const c0 = chal(n0);

let a = new Client(srv, 'alice');
run(srv, [a], 6);
ok(+a.g('dyN') === n0, `day number ${a.g('dyN')} (${new Date(NOW).toDateString()})`);
const got = { trk: +a.g('dyTrk'), kind: +a.g('dyKind'), wx: +a.g('dyWx'), car: +a.g('dyCar'), rules: +a.g('dyRules') };
ok(JSON.stringify(got) === JSON.stringify(c0), `the day's challenge: ${JSON.stringify(got)}`);
// 19 days in a row: every circuit once; a mix of the rest
{
    const t = new Set(), k = [0, 0, 0], w = [0, 0, 0], r = [0, 0, 0], cr = new Set();
    for (let i = 0; i < 19; i++) { const c = chal(n0 + i); t.add(c.trk); k[c.kind]++; w[c.wx]++; r[c.rules]++; cr.add(c.car); }
    ok(t.size === 19 && k[2] >= 5 && w[2] >= 4 && r[2] >= 6 && cr.size === 4, `19 days: ${t.size} circuits, stints ${k[2]}, rain ${w[2]}, realistic ${r[2]}, cars ${cr.size}`);
}
ok(+a.L('mnItem', 3) === 25, 'the main menu\'s third row is DAILY CHALLENGE');

// alice has upgrades and a setup of her own, another car and other settings
a.g('selCar = 2; upE = 4; upA = 3; upB = 2; upT = 3; suW = 2; suG = 1; suB = 2; gMode = M_GP; rules = R_ARC; wx = 1; selTrk = 3; ghSel = 1; lapSel = 2; tuneTouched = 1');
const before = { mode: +a.g('gMode'), rules: +a.g('rules'), wx: +a.g('wx'), trk: +a.g('selTrk'), gh: +a.g('ghSel'), car: +a.g('selCar') };
const xp0 = +a.g('pXP');
// ENTER on row 3
a.g('mnPage = 0; mnRow = 3; mnBuild(); actKey = 13; menuKeys(); actKey = 0');
a.g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
run(srv, [a], 3);
ok(+a.g('dyOn') === 1 && +a.g('gMode') === 3 && +a.g('selTrk') === c0.trk && +a.g('rules') === c0.rules && +a.g('wx') === c0.wx && +a.g('nCars') === 1,
    `started: time trial on circuit ${a.g('selTrk')}, rules ${a.g('rules')}, weather ${a.g('wx')}, ${a.g('nCars')} car`);
// the day's car with the base setup, against a reference built the same way
const st = (c) => ['caTop', 'caAcc', 'caGrip', 'caAeroK', 'caBrkK', 'caBias', 'caWearK'].map((k) => (+c.L(k, 1)).toFixed(4)).join(' ');
const mine = st(a);
const ref = new Client(new Server(), 'ref');
ref.g(`carStats(1, ${c0.car})`);
ok(mine === st(ref), `the day's car (type ${c0.car}), base setup, no upgrades: ${mine}`);
ok(+a.L('caCol', 1) === +a.L('ctCol', 2), 'in her own colours');
// drive until two laps are timed; the best reaches the server while on track
let laps = 0, lap0 = 0, srvOk = false;
run(srv, [a], 700, () => {
    const l = +a.L('caLap', 1);
    if (l > 1 && l !== lap0) { lap0 = l; laps = l - 1; }
    if (laps >= 1 && +a.g('raceT') - +a.L('caLapT', 1) > 8) {
        const b = Math.round(+a.g('dyBestT') * 1000);
        srvOk = srv.item('SY_rank', DK) === `D${n0}||alice,${b}` && srv.item('SY_ghost', DK).startsWith(`alice,${b},`);
        if (laps >= 2) return true;
    }
    return false;
});
const best = +a.g('dyBestT');
ok(laps >= 2 && best > 30 && +a.g('dyLapB') === best, `laps timed: ${laps}, best ${best.toFixed(3)}`);
ok(srvOk, `on track: the server has today's ranking '${srv.item('SY_rank', DK)}' and the ghost (${srv.item('SY_ghost', DK).length} chars)`);
ok(+a.g('dyLastN') === n0 && +a.g('dyStreak') === 1 && +a.g('pXP') - xp0 >= 100 + 15 * laps, `done today: streak ${a.g('dyStreak')}, +${a.g('pXP') - xp0} XP (100 + 15 a lap)`);
ok(+a.L('recLap', c0.trk) === 0 && srv.item('SY_rank', c0.trk) === '|', 'the ordinary circuit record and ranking are left alone');
ok(+a.g('dyMe') === 1 && +a.g('dyTopC') === 1, `the card and HUD see her P${a.g('dyMe')}`);
// back to the menu: her own settings again
a.g('toMenu()');
run(srv, [a], 8);
const after = { mode: +a.g('gMode'), rules: +a.g('rules'), wx: +a.g('wx'), trk: +a.g('selTrk'), gh: +a.g('ghSel'), car: +a.g('selCar') };
ok(JSON.stringify(after) === JSON.stringify(before) && +a.g('dyOn') === 0 && +a.g('upE') === 4, `settings back: ${JSON.stringify(after)}`);
const save = srv.lists['SY_save' + a.g('pSh')].find((r) => r.startsWith('|alice,'));
const sf = save ? save.split(',') : [];
ok(sf.length === 62 && +sf[58] === n0 && +sf[59] === 1 && +sf[60] === n0 && +sf[61] === Math.round(best * 1000), `the save has the daily fields: ${sf.slice(58).join(',')}`);
// again: the ghost is today's leader (her own uploaded lap)
a.g('dyStart()');
run(srv, [a], 3);
ok(+a.g('ghN') > 20 && Math.abs(+a.g('ghTime') - best) < 0.001, `driving again: racing the leader's ghost (${a.g('ghN')} samples, ${(+a.g('ghTime')).toFixed(3)})`);
a.g('toMenu()');

// bob is quicker today
srv.put('SY_rank', srv.lists.SY_rank.map((v, i) => (i === DK - 1 ? `D${n0}||bob,${Math.round(best * 1000) - 2000}|alice,${Math.round(best * 1000)}` : v)));
run(srv, [a], 4);
ok(a.L('dyTN', 1) === 'bob' && +a.g('dyMe') === 2 && +a.g('dyTopC') === 2, `bob's time shows: top ${a.L('dyTN', 1)}, alice P${a.g('dyMe')}`);
// the card's text slots on the daily row
a.g('raceState = ST_MENU; mnPage = 0; mnRow = 3; mnBuild(); hudMenu()');
const txt = (i) => String(a.g(`txS[${i - 1}]`) ?? '');
ok(txt(50) === 'DAILY CHALLENGE' && txt(57).startsWith('P1  bob') && txt(66).includes('DONE TODAY'), `card: '${txt(50)}' / '${txt(57)}' / '${txt(66)}'`);

// the next day: a new challenge, a fresh ranking, the streak goes on
NOW += DAY;
run(srv, [a], 3);
const n1 = n0 + 1, c1 = chal(n1);
ok(+a.g('dyN') === n1 && +a.g('dyTrk') === c1.trk && +a.g('dyTopC') === 0, `next day ${a.g('dyN')}: circuit ${a.g('dyTrk')}, yesterday's ranking gone (${a.g('dyTopC')} rows)`);
a.g('dyStreakNow()');
ok(+a.g('oDS') === 1, 'streak still 1 (yesterday done)');
const xp1 = +a.g('pXP');
a.g('dyStart()');
run(srv, [a], 2);
// (laps given directly from here on)
const lap = (t) => a.g(`lapDone(${t})`);
lap(91.5); if (c1.kind === 2) { lap(92); lap(90); }
run(srv, [a], 6);
const v1 = c1.kind === 2 ? 273.5 : 91.5;
ok(+a.g('dyStreak') === 2 && +a.g('pXP') - xp1 >= 125, `day 2 done: streak ${a.g('dyStreak')}, +${a.g('pXP') - xp1} XP`);
ok(srv.item('SY_rank', DK) === `D${n1}||alice,${v1 * 1000}`, `a new ranking for the new day: '${srv.item('SY_rank', DK)}'`);
a.g('toMenu()');
// a day missed: back to one
NOW += 2 * DAY;
run(srv, [a], 3);
a.g('dyStreakNow()');
ok(+a.g('oDS') === 0, 'a missed day: the streak shows 0');
const n3 = n1 + 2, c3 = chal(n3);
a.g('dyStart()');
run(srv, [a], 2);
lap(95); if (c3.kind === 2) { lap(95); lap(95); }
ok(+a.g('dyStreak') === 1, `after the gap: streak ${a.g('dyStreak')}`);
a.g('toMenu()');

// a stint day: three clean laps in a row; a deleted lap starts again
let ns = n3 + 1;
while (chal(ns).kind !== 2) ns++;
NOW += (ns - n3) * DAY;
run(srv, [a], 3);
a.g('dyStart()');
run(srv, [a], 2);
lap(90); lap(91);
ok(+a.g('dyBestN') !== ns, 'stint: two laps rank nothing yet');
a.g('dyRunN = 0');                  // (what a lap deleted for track limits does - updateLap)
lap(80); lap(81);
ok(+a.g('dyBestN') !== ns, 'after a deleted lap, two more still rank nothing');
lap(82);
run(srv, [a], 6);
ok(+a.g('dyBestN') === ns && Math.abs(+a.g('dyBestT') - 243) < 1e-6 && srv.item('SY_rank', DK) === `D${ns}||alice,243000`, `the third clean lap ranks the sum: ${a.g('dyBestT')} '${srv.item('SY_rank', DK)}'`);
lap(70);
run(srv, [a], 6);
ok(Math.abs(+a.g('dyBestT') - 233) < 1e-6, `the stint rolls on: the last three ${a.g('dyBestT')}`);
a.g('toMenu()');
run(srv, [a], 8);

// a new session the same day: the save brings it all back
srv.clients = [];
const b = new Client(srv, 'alice');
run(srv, [b], 6);
ok(+b.g('dyLastN') === ns && +b.g('dyStreak') === 1 && +b.g('dyBestN') === ns && Math.abs(+b.g('dyBestT') - 233) < 1e-6 && +b.g('dyMe') === 1,
    `next session: last ${b.g('dyLastN')}, streak ${b.g('dyStreak')}, best ${b.g('dyBestT')} P${b.g('dyMe')}`);
// the backup code carries the daily fields
b.g('svEncode()');
const code = String(b.g('svCode'));
const c = new Client(new Server(), 'alice');
c.sim.R.syLocal.SY_ = 0;
run(c.srv, [c], 30, () => +c.g('pLoaded') === 1);     // (no server lists: loaded after SYWAIT)
c.g(`svDecode('${code}')`);
if (process.env.DBG) console.log('nF', c.g('nF'), 'ok', c.g('oSvOk'), 'nick', c.g('pNick'), 'pF59..', [59, 60, 61, 62].map((k) => c.L('pF', k)));
ok(+c.g('dyLastN') === ns && +c.g('dyStreak') === 1 && Math.abs(+c.g('dyBestT') - 233) < 1e-6, `backup code (${code.length} letters): daily fields back`);
// an old 58-field record still loads (no daily fields)
const r58 = save.split(',').slice(0, 58).join(',');
const d = new Client(new Server(), 'alice');
run(d.srv, [d], 1);
d.g(`parseRec('${r58}', 2); mergeRec(0)`);
ok(+d.g('nF') === 58 && +d.g('dyLastN') === 0 && +d.g('pXP') > 0, 'an older save (58 fields) still loads');
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;

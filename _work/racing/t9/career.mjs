// v3.0.0 the career mode, in the node sim with Entry Sync modelled as in
// t9/rec.mjs: a new career from the menu, a real (one-lap) round in the
// team's car, points and the head to head, quitting a round, the end of a
// season (reputation, XP, offers), signing, a dismissal, a title, the save
// and the backup code.
// usage: node t9/career.mjs
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
const srv = new Server();
srv.lists.SY_rank = new Array(19).fill('|');
srv.lists.SY_ghost = new Array(19).fill('|');
for (let s = 1; s <= 8; s++) srv.lists['SY_save' + s] = [];
const a = new Client(srv, 'alice');
run(srv, [a], 6);
const TLV = [1, 7, 2, 5, 4, 6, 3, 8], TPOW = [1.035, 1.025, 1.015, 1.005, 0.995, 0.985, 0.975, 0.965], TCAR = [1, 2, 3, 4, 1, 2, 3, 4];

ok(+a.L('mnItem', 4) === 26, "the main menu's fourth row is CAREER");
// her own settings: GP, Monaco, arcade, 1 lap, upgrades and a setup
a.g('gMode = M_GP; selTrk = 1; rules = R_ARC; wx = 1; lapSel = 1; selCar = 2; upE = 4; upA = 3; upB = 2; upT = 3; suW = 2; suG = 1; suB = 1; tuneTouched = 1');
a.g('mnPage = 0; mnRow = 4; mnBuild(); actKey = 13; menuKeys(); actKey = 0');
run(srv, [a], 1);
const teams = [1, 2, 3, 4, 5, 6, 7, 8].map((c) => +a.L('crTm', c));
const rv = +a.g('crRival');
ok(+a.g('raceState') === 18 && +a.g('crSeason') === 1 && +a.g('crTeam') === 8 && +a.g('crGoal') === 7, `a new career: season ${a.g('crSeason')}, team tier ${a.g('crTeam')}, goal P${a.g('crGoal')}`);
ok(new Set(teams).size === 8 && teams[0] === 8 && +a.L('crTm', rv) === 7, `every car in its own team (${teams.join(',')}); the rival ${a.L('drvName', rv)} drives for tier ${a.L('crTm', rv)}`);
// the career screen's text
const txt = (i) => String(a.L('txS', i) ?? '');
ok(txt(9) === 'CAREER' && txt(24) === `RACE ROUND 1:  ${String(a.L('trkName', (1 * 5 + 0) % 19 + 1))}` && txt(26).includes('BACK') && txt(10).includes('NERO RACING   (CAR RANK 8 OF 8)'), `screen: '${txt(10)}' / '${txt(24)}'`);
// round 1
const trk1 = (1 * 5 + 0) % 19 + 1;
a.g('actKey = 13; crKeys(); actKey = 0');
a.g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
run(srv, [a], 3);
ok(+a.g('crOn') === 1 && +a.g('gMode') === 1 && +a.g('selTrk') === trk1 && +a.g('nCars') === 8 && +a.g('nLaps') === 1, `round 1: a grand prix on circuit ${a.g('selTrk')}, ${a.g('nCars')} cars, ${a.g('nLaps')} lap`);
// her car: the team's car type, her setup, no upgrades, the team's pace and colours
const st = (c, k) => ['caTop', 'caAcc', 'caGrip', 'caAeroK', 'caBrkK', 'caBias'].map((n) => (+c.L(n, k)).toFixed(4)).join(' ');
const ref = new Client(new Server(), 'ref');
ref.g(`suW = 2; suG = 1; suB = 1; carStats(1, ${TCAR[7]}); caTop[0] *= ${TPOW[7]}; caAcc[0] *= ${TPOW[7]}; caGrip[0] *= ${1 + (TPOW[7] - 1) * 0.5}`);
ok(st(a, 1) === st(ref, 1), `her car: team car type ${TCAR[7]}, her setup, no upgrades, pace x${TPOW[7]}: ${st(a, 1)}`);
const cols = [1, 2, 3, 4, 5, 6, 7, 8].map((c) => +a.L('caCol', c));
ok(cols.every((v, i) => v === TLV[teams[i] - 1]), `every car in its team's livery: ${cols.join(',')}`);
// an AI car of the strongest team against the same driver's car offline
const top = teams.indexOf(1) + 1;
ref.g(`aiDiff = ${a.g('aiDiff')}; carStats(${top}, 1)`);
ok(Math.abs(+a.L('caTop', top) / +ref.L('caTop', top) - TPOW[0] * (+a.L('tmTop', TLV[0]) / +ref.L('tmTop', +ref.L('caCol', top)))) < 1e-6, `the top team's AI car is ${(+a.L('caTop', top) / +ref.L('caTop', top)).toFixed(4)}x its offline pace (team pace and livery character)`);
// (realistic: qualifying hands the grid selCar - still the team's car)
const before = st(a, 1);
a.g('startGrid(selCar)');
ok(st(a, 1) === before, `the grid after qualifying keeps the team's car: ${st(a, 1)}`);
// quitting the round (M in the pause menu) costs nothing and puts her settings back
a.g('toMenu()');
run(srv, [a], 1);
ok(+a.g('crOn') === 0 && +a.g('crRound') === 0 && +a.g('gMode') === 1 && +a.g('selTrk') === 1 && +a.g('raceState') === 0, 'quit mid-round: back in the menu, the round still to race, settings back');
// race it to the end
a.g('crEnter(); actKey = 13; crKeys(); actKey = 0');
a.g('playerInput = function(){ aiPlan(1); aiDrive(1); }');
run(srv, [a], 400, () => +a.g('raceState') === 5 && [1, 2, 3, 4, 5, 6, 7, 8].every((c) => +a.L('caFin', c) > 0 || +a.L('caDNF', c) > 0));
ok(+a.g('raceState') === 5, `the round is over (finish P${a.g('finished')})`);
a.g('actKey = 13');
a.g('classify()');
const order = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => +a.L('clsI', i));
const PTS = [25, 18, 15, 12, 10, 8, 6, 4];
a.g('crAfter(); actKey = 0');
const pts = [1, 2, 3, 4, 5, 6, 7, 8].map((c) => +a.L('crPts', c));
ok(order.every((c, i) => pts[c - 1] === PTS[i]), `points by place: ${order.map((c, i) => `${c}:${pts[c - 1]}`).join(' ')}`);
const meAhead = order.indexOf(1) < order.indexOf(rv);
ok(+a.g('crRound') === 1 && +a.g('crRivW') === (meAhead ? 1 : 0) && +a.g('crRivL') === (meAhead ? 0 : 1) && +a.g('raceState') === 8, `round 1 counted; head to head ${a.g('crRivW')} - ${a.g('crRivL')}; the standings`);
a.g('updateHud()');
ok(txt(10).includes('AFTER ROUND 1 OF 6') && txt(12).includes('career'), `standings screen: '${txt(10)}'`);
a.sim.keys.add(13); run(srv, [a], 0.2); a.sim.keys.delete(13); run(srv, [a], 0.2);
ok(+a.g('raceState') === 18 && +a.g('crOn') === 0 && +a.g('gMode') === 1 && +a.g('selTrk') === 1, 'ENTER: back on the career screen, her settings back');
run(srv, [a], 8);
const sv = () => (srv.lists['SY_save' + a.g('pSh')] || []).find((r) => r.startsWith('|alice,')) || '';
let f = sv().split(',');
ok(f.length === 78 && +f[62] === 1 && +f[63] === 8 && +f[64] === 1 && f.slice(70).map(Number).join() === pts.join(), `saved: fields 63-78 '${f.slice(62).join(',')}'`);

// the end of a season: P3 with a goal of P7 - two teams up are offered
a.g('crRound = 5; crPts[0] = 120; crPts[1] = 140; crPts[2] = 130; crPts[3] = 60; crPts[4] = 50; crPts[5] = 40; crPts[6] = 30; crPts[7] = 20; crRivW = 4; crRivL = 1; crRep = 0');
const xp0 = +a.g('pXP');
a.g('crSeasonOver(); crKeys()');
ok(+a.g('crPhase') === 1 && +a.g('crPos') === 3 && +a.g('crRep') === 32 + 10 && +a.g('pXP') - xp0 === 200 + 6 * 40, `season over: P${a.g('crPos')}, reputation ${a.g('crRep')}, +${+a.g('pXP') - xp0} XP`);
ok(+a.g('crOffN') === 3 && [1, 2, 3].map((i) => +a.L('crOff', i)).join() === '6,7,8', `offers: tiers ${[1, 2, 3].map((i) => a.L('crOff', i)).join(', ')}`);
a.g('raceState = ST_CAR; updateHud()');
ok(txt(24).startsWith('MOVE UP TO ') && txt(26).startsWith('STAY WITH ') && txt(51).includes('GOAL MET'), `offer rows: '${txt(24)}' / '${txt(26)}'; '${txt(51)}'`);
// sign the best offer
a.g('crRow = 1; actKey = 13; crKeys(); actKey = 0');
const teams2 = [1, 2, 3, 4, 5, 6, 7, 8].map((c) => +a.L('crTm', c));
ok(+a.g('crSeason') === 2 && +a.g('crTeam') === 6 && +a.g('crRound') === 0 && +a.g('crPhase') === 0 && +a.g('crGoal') === 5 && [1, 2, 3, 4, 5, 6, 7, 8].every((c) => +a.L('crPts', c) === 0),
    `season 2 with tier ${a.g('crTeam')}: goal P${a.g('crGoal')}, points reset`);
ok(teams2.join() !== teams.join() && +a.L('crTm', +a.g('crRival')) === 5, `drivers moved teams (${teams2.join(',')}); the rival drives for tier 5`);
// well short of the goal: only a weaker team
a.g('crTeam = 3; crAssign(); crRound = 5; crRep = 20; crPts[0] = 1; crPts[1] = 100; crPts[2] = 90; crPts[3] = 80; crPts[4] = 70; crPts[5] = 60; crPts[6] = 50; crPts[7] = 40; crRivW = 0; crRivL = 5');
a.g('crSeasonOver(); crKeys()');
ok(+a.g('crPos') === 8 && +a.g('crOffN') === 1 && +a.L('crOff', 1) === 4 && +a.g('crRep') === 0, `P8 against a goal of P2: one offer, tier ${a.L('crOff', 1)}; reputation ${a.g('crRep')}`);
// a title
a.g('crTeam = 1; crAssign(); crPhase = 0; crRound = 5; crRep = 50; crTitles = 0; crPts[0] = 150; crPts[1] = 100; crRivW = 3; crRivL = 2; achGot[13] = 0');
a.g('crSeasonOver(); crKeys()');
ok(+a.g('crTitles') === 1 && +a.L('achGot', 14) === 1 && +a.g('crRep') === 50 + 0 + 10 + 15, `champion: titles ${a.g('crTitles')}, achievement 14, reputation ${a.g('crRep')}`);
a.g('pDirty = 1; raceState = ST_CAR');
run(srv, [a], 8);

// a new session: the career is back from the save
srv.clients = [];
const b = new Client(srv, 'alice');
run(srv, [b], 6);
ok(+b.g('crSeason') === 2 && +b.g('crTeam') === 1 && +b.g('crPhase') === 1 && +b.g('crTitles') === 1 && +b.L('crPts', 1) === 150, `next session: season ${b.g('crSeason')}, tier ${b.g('crTeam')}, phase ${b.g('crPhase')}, titles ${b.g('crTitles')}`);
// the backup code
b.g('svEncode()');
const code = String(b.g('svCode'));
const c = new Client(new Server(), 'alice');
c.sim.R.syLocal.SY_ = 0;
run(c.srv, [c], 30, () => +c.g('pLoaded') === 1);
c.g(`svDecode('${code}')`);
ok(+c.g('crSeason') === 2 && +c.g('crTeam') === 1 && +c.g('crTitles') === 1 && +c.L('crPts', 2) === 100, `backup code (${code.length} letters): the career is back`);
// NEW CAREER needs ENTER twice
b.g('crEnter(); actKey = 0; crKeys(); crRow = crNRow - 1; actKey = 13; crKeys(); actKey = 0');
ok(+b.g('crSeason') === 2 && +b.g('crSure') === 1, 'NEW CAREER: the first ENTER only asks');
b.g('actKey = 13; crKeys(); actKey = 0');
ok(+b.g('crSeason') === 1 && +b.g('crTeam') === 8 && +b.g('crTitles') === 1, 'the second starts over (titles kept)');
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;

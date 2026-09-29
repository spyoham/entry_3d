// v2.1.0 online races in the node sim: several games at once against a model
// of Entry Sync (as t7/multi.mjs, now with variables too): the '?!' flag turns
// 1, the room's values arrive after `welcome` s, nothing is sent in the first
// 4 s before they do, every change goes to everyone else (never back), one
// socket each way keeps the order.
// usage: node t9/netsim.mjs [latency ms] [jitter ms]   (ONLY=a,b,... to pick parts)
import { createSim } from '../sim.mjs';
const LAT = (+(process.argv[2] || 120)) / 1000;
const JIT = (+(process.argv[3] || 60)) / 1000;
const fps = 10;
const want = (k) => !process.env.ONLY || process.env.ONLY.split(',').includes(k);
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

class Server {
    constructor() { this.vars = {}; this.lists = {}; this.t = 0; this.q = []; this.k = 0; this.clients = []; this.msgs = 0; }
    at(t, f) { this.q.push({ t, f, k: this.k++ }); }
    step(dt) {
        this.t += dt;
        this.q.sort((a, b) => a.t - b.t || a.k - b.k);
        while (this.q.length && this.q[0].t <= this.t) this.q.shift().f();
    }
}
class Client {
    constructor(srv, nick, welcome = 0.4) {
        this.srv = srv; this.nick = nick; this.on = true;
        this.sim = createSim({ fps });
        this.sim.R.nick = nick;
        this.sim.R.syNet = this;
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
    send(f) {
        if (this.starting || !this.on) return;
        const s = this.srv;
        this.up = Math.max(s.t + LAT + Math.random() * JIT, (this.up || 0) + 1e-6);
        s.at(this.up, () => {
            f(s); s.msgs++;
        });
    }
    relay(apply) {
        const s = this.srv;
        for (const c of s.clients) if (c !== this && c.on) {
            c.down = Math.max(s.t + LAT + Math.random() * JIT, (c.down || 0) + 1e-6);
            s.at(c.down, () => apply(c));
        }
    }
    changed(n, a) { this.send((s) => { s.lists[n] = a; this.relay((c) => c.applyList(n, a)); }); }
    varChanged(n, v) { this.send((s) => { s.vars[n] = v; this.relay((c) => { c.sim.R.syLocal[n] = v; }); }); }
    g(e) { return this.sim.peek(e); }
    // 1-based list item
    L(list, i) { return this.g(`${list}[${i - 1}]`); }
}
const run = (srv, cs, secs, each) => {
    for (let f = 0; f < Math.round(secs * fps); f++) {
        for (const c of cs) if (c.on) { c.sim.frame(); }
        if (each && each(f) === true) return;
        srv.step(1 / fps);
    }
};
const drive = (c) => c.g('playerInput = function () { aiPlan(1); aiDrive(1); }');
const chatSay = (c, text) => { c.sim.R.answerText = text; c.g('netChat()'); };
const chatHas = (c, s) => { for (let k = 1; k <= 6; k++) if (String(c.L('chL', k)).includes(s)) return true; return false; };
console.log(`latency ${LAT * 1000} ms + jitter ${JIT * 1000} ms`);

// ---- a whole online race: lobby, room, chat, race, a watcher, results ----------
if (want('race')) {
    const srv = new Server();
    const A = new Client(srv, 'alice'), B = new Client(srv, 'bob'), C = new Client(srv, 'carol'), D = new Client(srv, 'dave');
    const all = [A, B, C, D];
    run(srv, all, 2);
    for (const c of all) c.g('netEnter()');
    run(srv, all, 4);
    const slots = all.map((c) => +c.g('netMy'));
    ok(slots.every((s) => s > 0) && new Set(slots).size === 4 && all.every((c) => +c.g('netAlive') === 4 && +c.g('netPg') === 1),
        `4 players online, own slots ${slots.join(',')}, each sees ${all.map((c) => c.g('netAlive')).join('/')}`);
    // alice opens a room
    A.g("nrTitle = 'Alice Cup'; nrTrk = 2; nrLapSel = 1; nrCon = 1; netOpenRoom()");
    run(srv, all, 2);
    const h = +A.g('netMy');
    ok([B, C, D].every((c) => +c.g('nrN') === 1 && +c.L('nrL', 1) === h && c.L('nsTitle', h) === 'Alice Cup'),
        `the room shows in the others' lobbies: '${B.L('nsTitle', h)}' ${B.L('nsTrk', h)} ${B.L('nsLaps', h)} lap(s)`);
    B.g(`netJoin(${h})`); C.g(`netJoin(${h})`);
    run(srv, all, 2);
    A.g(`netMembers(${h})`);
    ok(+A.g('nmN') === 3 && +B.g('netPg') === 3 && +C.g('netPg') === 3, `bob and carol joined: ${A.g('nmN')} in the room`);
    // chat: the room hears the room, the lobby the lobby
    chatSay(B, 'hello room');
    chatSay(D, 'hi lobby');
    run(srv, all, 2);
    if (process.env.DBG) for (const c of all) console.log(c.nick, [1,2,3,4,5,6].map(k=>c.L('chL',k)).join(' / '));
    ok(chatHas(A, 'bob:  hello room') && chatHas(C, 'bob:  hello room') && !chatHas(D, 'hello room'), 'room chat reaches the room only');
    ok(!chatHas(A, 'hi lobby') && !chatHas(B, 'hi lobby'), 'lobby chat stays in the lobby');
    // start: not before everyone is ready
    A.g('netStart()');
    run(srv, all, 1);
    ok(+A.g('netRace') === 0 && String(A.g('msg')).includes('READY'), `start waits for ready: '${A.g('msg')}'`);
    for (const c of [A, B, C]) drive(c);
    B.g('netSt = NS_READY; netPush()'); C.g('netSt = NS_READY; netPush()');
    run(srv, all, 6, () => +A.L('nsSt', +B.g('netMy')) === 3 && +A.L('nsSt', +C.g('netMy')) === 3);
    A.g('netStart()');
    // lights: everyone waits for the go, then the lights run on every screen
    let goT = {};
    run(srv, all, 25, () => { for (const c of [A, B, C]) if (goT[c.nick] === undefined && +c.g('raceState') === 3) goT[c.nick] = srv.t; });
    const gts = Object.values(goT);
    if (process.env.DBG) for (const c of [A, B, C]) console.log(c.nick, 'state', c.g('raceState'), 'race', c.g('netRace'), 'wait', c.g('netWait'), 'st', c.g('netSt'), 'rid', c.g('netRid'), 'rst', c.g('nrRst'), 'goT', c.g('netGoT'), 'ldT', c.g('nrLdT'), 'rtt', [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(k=>(+c.L('nsRtt',k)).toFixed(2)).filter(x=>x!=='0.00').join(','));
    ok(gts.length === 3 && Math.max(...gts) - Math.min(...gts) < 0.6 && [A, B, C].every((c) => +c.g('nCars') === 3),
        `all three started together: lights out within ${(Math.max(...gts) - Math.min(...gts)).toFixed(2)} s, 3 cars on each screen`);
    // how far is each screen's picture of the others from where they are?
    let errs = [];
    const measure = () => {
        for (const X of [A, B, C]) for (const Y of [A, B, C]) if (X !== Y) {
            const n = +X.g('nCars');
            for (let c = 2; c <= n; c++) if (+X.L('caSlot', c) === +Y.g('netMy') && +X.L('caFin', c) === 0 && +Y.L('caFin', 1) === 0) {
                const dx = X.L('caX', c) - Y.L('caX', 1), dz = X.L('caZ', c) - Y.L('caZ', 1);
                errs.push(Math.hypot(dx, dz));
            }
        }
    };
    run(srv, all, 20, (f) => { if (f % 10 === 0) measure(); });
    // dave watches from the lobby
    D.g(`netFrom = 0; netWatchRace(${h})`);
    run(srv, all, 6);
    const dn = +D.g('nCars');
    let derr = [];
    for (const Y of [A, B, C]) for (let c = 1; c <= dn; c++) if (+D.L('caSlot', c) === +Y.g('netMy')) derr.push(Math.hypot(D.L('caX', c) - Y.L('caX', 1), D.L('caZ', c) - Y.L('caZ', 1)));
    ok(+D.g('netWatch') === 1 && dn === 3 && derr.length === 3 && Math.max(...derr) < 25, `dave watches: ${dn} cars, off by ${derr.map((e) => e.toFixed(1)).join(' / ')} m`);
    chatSay(A, 'good luck');
    run(srv, all, 2);
    ok(chatHas(D, 'alice:  good luck') && chatHas(B, 'alice:  good luck'), 'the watcher hears the room');
    run(srv, all, 200, (f) => { if (f % 10 === 0) measure(); return [A, B, C].every((c) => +c.g('netOver') === 1); });
    errs.sort((a, b) => a - b);
    const med = errs[errs.length >> 1], p95 = errs[Math.floor(errs.length * 0.95)];
    ok(errs.length > 50 && med < 6 && p95 < 20, `others drawn near where they are: median ${med.toFixed(1)} m, 95% ${p95.toFixed(1)} m, max ${errs[errs.length - 1].toFixed(1)} m (${errs.length} samples)`);
    // the same results everywhere
    const order = (c) => { c.g('classify()'); const n = +c.g('nCars'); const r = []; for (let i = 1; i <= n; i++) { const o = +c.L('clsI', i); r.push(c.L('nsNick', +c.L('caSlot', o)) + (o === 1 && +c.g('netWatch') < 1 ? '*' : '')); } return r.map((x) => x.replace('*', '')).join(' > '); };
    const ords = [A, B, C, D].map(order);
    ok([A, B, C, D].every((c) => +c.g('netOver') === 1) && new Set(ords).size === 1, `race over on every screen, same order: ${ords.join('  |  ')}`);
    for (const c of [A, B, C]) c.g('netBackToRoom()');
    D.g('netBackToRoom()');
    run(srv, all, 2);
    ok([A, B, C].every((c) => +c.g('netPg') === 3 && +c.g('raceState') === 17) && +D.g('netPg') === 1 && +A.g('nrRst') === 0,
        'back in the room (dave in the lobby)');
}

// ---- slots: a same-moment claim, a slot left long ago, leaving frees one ----------
if (want('slots')) {
    const srv = new Server();
    // eve's clock is an hour behind: her slot looks like one left an hour ago
    const E = new Client(srv, 'eve'), F = new Client(srv, 'fay');
    E.sim.R.wallMs = -3600e3;
    run(srv, [E, F], 2);
    E.g('netEnter()');
    run(srv, [E, F], 4);
    const old = +E.g('netMy');
    E.on = false;                                   // eve's game is gone; her slot stays behind
    srv.clients = srv.clients.filter((c) => c !== E);
    const G = new Client(srv, 'gus');
    run(srv, [F, G], 1);
    F.g('netEnter()'); G.g('netEnter()');
    run(srv, [F, G], 1.4);
    // gus and fay both go for the same slot at the same moment
    const k = old === 1 ? 2 : 1;
    F.g(`netMy = ${k}; netPg = 1; netPush()`); G.g(`netMy = ${k}; netPg = 1; netPush()`);
    run(srv, [F, G], 4);
    const f = +F.g('netMy'), gg = +G.g('netMy');
    ok(f > 0 && gg > 0 && f !== gg, `same-moment claim of slot ${k}: fay ${f}, gus ${gg} (the lower session id kept it)`);
    ok(+G.L('nsLive', old) === 0, `the slot left an hour ago (${old}) counts as free at once for a newcomer`);
    G.g('netLeave()');
    run(srv, [F, G], 1);
    ok(+F.L('nsLive', gg) === 0 && +F.g('netAlive') === 1 && +G.g('raceState') === 0, 'gus left: his slot is free for fay right away, gus is back in the menu');
}

// ---- a race: private code, full room, contact, someone leaves, the host leaves ----
if (want('rules')) {
    const srv = new Server();
    const A = new Client(srv, 'ann'), B = new Client(srv, 'ben'), C = new Client(srv, 'cat');
    const all = [A, B, C];
    run(srv, all, 2);
    for (const c of all) { c.g('netEnter()'); drive(c); }
    run(srv, all, 4);
    A.g("nrTitle = 'Duo'; nrTrk = 5; nrLapSel = 1; nrCon = 1; nrMax = 2; nrCode = 4321; netOpenRoom()");
    run(srv, all, 2);
    const h = +A.g('netMy');
    B.sim.R.answerText = '1111'; B.g(`netJoin(${h})`);
    ok(+B.g('netRoom') === 0 && String(B.g('msg')).includes('WRONG'), 'a wrong code is refused');
    B.sim.R.answerText = '4321'; B.g(`netJoin(${h})`);
    run(srv, all, 2);
    C.sim.R.answerText = '4321'; C.g(`netJoin(${h})`);
    ok(+B.g('netRoom') === h && +C.g('netRoom') === 0 && String(C.g('msg')).includes('FULL'), 'the right code gets in; a third player finds it full (max 2)');
    B.g('netSt = NS_READY; netPush()');
    run(srv, all, 1);
    A.g('netStart()');
    run(srv, all, 14);
    ok(+A.g('netCon') === 1 && +A.g('raceState') === 3, `racing, contact ${A.g('netCon')}`);
    // contact on: ben's car put 2 m ahead of ann's; only ann's own car moves on ann's screen
    const n1 = +A.g('nCars');
    let c2 = 0;
    for (let c = 1; c <= n1; c++) if (+A.L('caNet', c) === 1) c2 = c;
    const put = `caX[${c2 - 1}] = caX[0] + sind(caYaw[0]) * 2.0; caZ[${c2 - 1}] = caZ[0] + cosd(caYaw[0]) * 2.0; caVX[0] = sind(caYaw[0]) * 20; caVZ[0] = cosd(caYaw[0]) * 20; caVX[${c2 - 1}] = 0; caVZ[${c2 - 1}] = 0;`;
    A.g(put);
    const bx = A.L('caX', c2), ax = A.L('caX', 1), az = A.L('caZ', 1);
    A.g('carCollisions()');
    const moved = Math.hypot(A.L('caX', 1) - ax, A.L('caZ', 1) - az);
    ok(A.L('caX', c2) === bx && moved > 0.5, `contact: ann's car pushed back ${moved.toFixed(2)} m, ben's stays where his screen puts it`);
    A.g('netCon = 0');
    A.g(put);
    const ax2 = A.L('caX', 1);
    A.g('carCollisions()');
    ok(A.L('caX', 1) === ax2, 'contact off: they pass through each other');
    A.g('netCon = 1');
    run(srv, all, 5);
    // ben quits in the middle (M in the pause menu)
    B.g('netBackToRoom()');
    run(srv, all, 4);
    ok(+A.L('caDNF', c2) === 1 && chatHas(A, 'ben  LEFT THE RACE') && +B.g('netPg') === 3, "ben left mid-race: out on ann's screen, ben back in the room");
    run(srv, all, 400, () => +A.g('netOver') === 1);
    ok(+A.g('netOver') === 1, 'ann finishes alone: the race is over (state ' + A.g('raceState') + ' lap ' + A.L('caLap',1) + ' fin ' + A.L('caFin',1) + ' finishPos ' + A.g('finishPos') + ' dnf2 ' + A.L('caDNF',2) + ' nCars ' + A.g('nCars') + ' raceT ' + (+A.g('raceT')).toFixed(0) + ')');
    A.g('netBackToRoom()');
    run(srv, all, 2);
    // a second race: a new race id; this time the host's game stops during it
    B.g('netSt = NS_READY; netPush()');
    run(srv, all, 1);
    const rid1 = +A.g('netRid');
    A.g('netStart()');
    run(srv, all, 14);
    ok(+A.g('netRid') === rid1 + 1 && +B.g('netRid') === rid1 + 1 && +B.g('raceState') === 3, `second race, race id ${rid1} -> ${B.g('netRid')}`);
    A.on = false;
    run(srv, all, 14);
    let hc = 0;
    for (let c = 1; c <= +B.g('nCars'); c++) if (+B.L('caSlot', c) === h) hc = c;
    ok(+B.g('netHostGone') === 1 && hc > 0 && +B.L('caDNF', hc) === 1, 'the host vanished: ben races on, the host is out');
    B.g('netBackToRoom()');
    run(srv, all, 1);
    ok(+B.g('netPg') === 1 && +B.g('netRoom') === 0 && String(B.g('msg')).includes('HOST LEFT'), `back to the lobby: '${B.g('msg')}'`);
}

// ---- joining a room whose race is on: watch it, then back in the room ----------------
if (want('late')) {
    const srv = new Server();
    const A = new Client(srv, 'amy'), B = new Client(srv, 'bo'), C = new Client(srv, 'cy');
    const all = [A, B, C];
    run(srv, all, 2);
    for (const c of all) { c.g('netEnter()'); drive(c); }
    run(srv, all, 4);
    A.g('nrTrk = 3; nrLapSel = 1; netOpenRoom()');
    run(srv, all, 2);
    const h = +A.g('netMy');
    B.g(`netJoin(${h})`);
    run(srv, all, 1);
    B.g('netSt = NS_READY; netPush()');
    run(srv, all, 1);
    A.g('netStart()');
    run(srv, all, 20);
    C.g(`netJoin(${h})`);
    run(srv, all, 3);
    ok(+C.g('netWatch') === 1 && +C.g('netRoom') === h && +C.g('nCars') === 2 && +C.g('raceState') === 3, `cy joined during the race and watches it (${C.g('nCars')} cars)`);
    C.sim.keys.add(39); run(srv, all, 0.3); C.sim.keys.delete(39); run(srv, all, 0.3);
    ok(+C.g('camCar') === 2, `RIGHT switches the watched car: ${C.g('camCar')}`);
    C.sim.keys.add(27); run(srv, all, 0.3); C.sim.keys.delete(27); run(srv, all, 0.5);
    ok(+C.g('netPg') === 3 && +C.g('raceState') === 17 && +C.g('netRoom') === h, 'ESC: back in the room, not the lobby');
}

// ---- the keys, from the main menu: ONLINE, create a room, back ------------------------
if (want('keys')) {
    const srv = new Server();
    const A = new Client(srv, 'kim');
    const tap = (k) => { A.sim.keys.add(k); run(srv, [A], 0.2); A.sim.keys.delete(k); run(srv, [A], 0.2); };
    run(srv, [A], 2);
    tap(40); tap(13);                               // main menu row 2 is ONLINE RACE
    run(srv, [A], 3);
    ok(+A.g('raceState') === 17 && +A.g('netPg') === 1 && +A.g('netMy') > 0, `DOWN, ENTER: online, in the lobby (slot ${A.g('netMy')})`);
    tap(13);                                        // (no rooms) CREATE A ROOM
    ok(+A.g('netPg') === 2, 'ENTER on CREATE: the settings form');
    tap(40); tap(39); tap(39);                      // circuit + 2
    const trk = +A.g('nrTrk');
    for (let i = 0; i < 7; i++) tap(40);            // down to OPEN THE ROOM (row 9)
    tap(13);
    run(srv, [A], 1);
    ok(+A.g('netPg') === 3 && +A.g('netRoom') === +A.g('netMy') && trk === 3, `room opened on circuit ${trk}`);
    tap(27); run(srv, [A], 1);
    ok(+A.g('netPg') === 1 && +A.g('netRoom') === 0, 'ESC closes the room');
    tap(27); run(srv, [A], 1);
    ok(+A.g('raceState') === 0 && +A.g('netOn') === 0, 'ESC in the lobby: back to the main menu');
}

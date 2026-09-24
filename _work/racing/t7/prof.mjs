// v8 profile systems in the node sim: save/load through the RT_* variables
// for two players, ranking, the world-record ghost, tuning, practice assist.
import { createSim } from '../sim.mjs';
const trk = +(process.argv[2] || 5);
const fps = 10;
const s = createSim({ fps });
const g = (e) => s.peek(e);
const run = (secs, until) => { for (let f = 0; f < secs * fps; f++) { s.frame(); if (until && until()) return true; } return false; };
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

// ---- alice races one lap -------------------------------------------------
s.R.nick = 'alice';
run(13);                 // no server in this test: the save counts as synced after 12 s
ok(+g('pLoaded') === 1 && +g('pGuest') === 0 && g('pNick') === 'alice', `profile loaded for alice (shard ${g('pSh')})`);
g(`rules = 1; wx = 1; gfx = 2; lapSel = 1; gMode = 1; aiDiff = 1; applyWeather(); selTrk = ${trk}; buildTrack(${trk}); startRace();`);
g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
const fin = run(400, () => +g('raceState') === 5);
ok(fin, `race finished at P${g('clsPos')} in ${(+g('raceT')).toFixed(1)} s`);
run(5);
const xp = +g('pXP');
ok(xp > 0, `XP ${xp}, level ${g('pLv')}, line "${g('rsLine')}"`);
ok(+g('achGot')[0] === 1, `achievements: ${g('achGot').map((v, i) => (v ? g('achName')[i] : '')).filter(Boolean).join(', ')}`);
const shard = g(`(()=>{ rtGetS(pSh); return oRT; })()`);
ok(shard.includes('|alice,'), `alice saved in her shard: ${shard.slice(0, 120)}`);
const rk = g(`(()=>{ rtGetK(${trk}); return oRT; })()`);
ok(rk.includes('|alice,'), `ranking ${trk}: ${rk}`);
const wr = g(`(()=>{ rtGetG(${trk}); return oRT; })()`);
ok(wr.startsWith('alice,') && wr.length > 100, `world-record ghost ${wr.length} chars: ${wr.slice(0, 40)}...`);
const lapA = +g('recLap')[trk - 1];

// ---- bob, a new player, on the same work ------------------------------------
const reset = `pXP = 0; upE = 0; upA = 0; upB = 0; upT = 0; suW = 0; suG = 0; suB = 0; suS = 0; stRaces = 0; stWins = 0; stPods = 0; stKm = 0; stCirc = 0;
  for (let k = 0; k < achGot.length; k++) achGot[k] = 0; for (let k = 0; k < recLap.length; k++) { recLap[k] = 0; recRace[k] = 0; } pCache = '|';`;
g(reset); s.R.nick = 'bob';
g('loadProfile()');
ok(+g('pXP') === 0 && g('pNick') === 'bob', `bob starts fresh (shard ${g('pSh')})`);
g('addXP(1234); upE = 2; suW = 1; saveProfile();');
// alice again, after bob saved
g(reset); s.R.nick = 'alice'; g('loadProfile()');
ok(+g('pXP') === xp, `alice reloaded: XP ${g('pXP')} (was ${xp}), best lap ${(+g('recLap')[trk - 1]).toFixed(3)} (was ${lapA.toFixed(3)})`);
g(reset); s.R.nick = 'bob'; g('loadProfile()');
ok(+g('pXP') === 1234 && +g('upE') === 2 && +g('suW') === 1, `bob reloaded: XP ${g('pXP')}, engine ${g('upE')}, wing ${g('suW')}, level ${g('pLv')}, points ${g('pPts')}`);

// ---- a guest cannot write -----------------------------------------------------
s.R.nick = ' ';
g('loadProfile()');
const before = g(`(()=>{ rtGetK(${trk}); return oRT; })()`);
g(`rankSubmit(${trk}, 1)`);
ok(+g('pGuest') === 1 && g(`(()=>{ rtGetK(${trk}); return oRT; })()`) === before, 'guest: nothing written to the ranking');

// ---- shard eviction: 60 players into one shard stays under SHCAP --------------
s.R.nick = 'alice'; g('loadProfile()');
for (let i = 0; i < 60; i++) { g(`pNick = 'filler${i}'; pSh = 1; addXP(${i}); saveProfile();`); }
const len1 = g(`(()=>{ rtGetS(1); return oRT.length; })()`);
ok(len1 <= 2400, `shard 1 after 60 saves: ${len1} characters (cap 2400)`);

// ---- time trial against the world-record ghost ----------------------------------
g(reset); s.R.nick = 'bob'; g('loadProfile()');
g(`gMode = 3; ghSel = 2; selTrk = ${trk}; startRace();`);
const gh = +g('ghN');
const gx = g('ghX').slice(0, 5).map(v => (+v).toFixed(1)).join(','), px = g('pbX').slice((trk - 1) * 540, (trk - 1) * 540 + 5).map(v => (+v).toFixed(1)).join(',');
ok(gh > 50, `world-record ghost decoded: ${gh} samples, time ${(+g('ghTime')).toFixed(3)}; starts ${gx}`);
run(40);
ok(+g('ghostOn') === 1 || +g('caLap')[0] < 1, `ghost on track: ghostOn ${g('ghostOn')} seg ${g('caSeg')[8]}`);

// ---- tuning reaches the car --------------------------------------------------------
g(`gMode = 1; upE = 5; suW = 0 - 3; suG = 3; carStats(1, 1);`);
ok(Math.abs(+g('caTop')[0] - 90 * 1.03 * 1.036 * 0.955) < 0.5, `tuned top speed ${(+g('caTop')[0] * 3.6).toFixed(1)} km/h, aero x${(+g('caAeroK')[0]).toFixed(2)}`);

// ---- practice: the brake assist brakes -------------------------------------------------
g(`upE = 0; suW = 0; suG = 0; gMode = 4; paSel = 1; startRace();`);
g(`playerInput = function(){ caThr[0] = 1; caBrk[0] = 0; caSteer[0] = 0; caHB[0] = 0; caErsOn[0] = 0; practiceAssist(); }`);
let braked = 0;
run(30, () => { if (+g('caBrk')[0] > 0.2) braked++; return braked > 3; });
ok(braked > 3 && +g('rsAssist') === 1, `practice brake assist engaged (showLine ${g('showLine')})`);
g('backOnTrack()'); ok(Math.abs(+g('caSpd')[0]) < 0.01, 'B puts the car back on the track');
console.log('pop-ups queued', g('popN'), 'current', g('popA'));

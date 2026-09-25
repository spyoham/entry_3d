// v3.0 feature checks in the node sim (every car on the AI unless noted)
import { createSim } from '../sim.mjs';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const mk = (trk, opts = '') => {
    const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
    for (let i = 0; i < 4; i++) s.frame();
    g(`rules = 2; wx = 1; gfx = 2; lapSel = 3; gMode = 1; ${opts} applyWeather(); selTrk = ${trk}; buildTrack(${trk}); startRace();`);
    g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
    return { s, g, run: (secs, each) => { for (let f = 0; f < secs * 10; f++) { s.frame(); if (each && each(f) === false) break; } } };
};
const toRace = (x) => { x.g('endQuali()'); x.g('startGrid(selCar)'); x.g('formSkip(); formEnd();'); x.run(12, () => +x.g('raceState') !== 3); };

// ---- A: qualifying, Q1 -> Q2 -> Q3 with the player driven by the AI ----
{
    const x = mk(5);
    let ses = [];
    x.run(700, () => { const q = +x.g('qSes'); if (ses[ses.length - 1] !== q) ses.push(q); return +x.g('raceState') === 9; });
    const grid = JSON.parse(x.g('JSON.stringify(caGrid.slice(0, 8))')), out = JSON.parse(x.g('JSON.stringify(caQOut.slice(0, 8))'));
    // P1-4 never out, P5-6 out in Q2, P7-8 out in Q1
    const byPos = []; grid.forEach((p, c) => byPos[p] = c);
    const shape = [1, 2, 3, 4].every(p => out[byPos[p]] === 0) && [5, 6].every(p => out[byPos[p]] === 2) && [7, 8].every(p => out[byPos[p]] === 1);
    ok(+x.g('raceState') === 10 && shape, `A qualifying sessions ${ses.join('>')}, grid ${grid.join(',')}, out-in ${out.join(',')}, player P${grid[0]}`);
}
// ---- B: VSC - the field slows, no one is penalised, it ends ----
{
    const x = mk(5); toRace(x); x.run(40);
    const v0 = JSON.parse(x.g('JSON.stringify(caSpd.slice(0,8))'));
    x.g('vscOn = 0; scOn = 0; scCar = 0; deployVSC()');
    // (the pace is a delta over the lap, so a car may be over it for a moment
    // out of a slow corner: compare the average)
    let sum = 0, n = 0, seen = 0;
    x.run(50, (f) => { if (+x.g('vscOn') === 1 && f > 30) { seen = 1; const r = JSON.parse(x.g('JSON.stringify(caSpd.slice(0,8).map((v,i)=>v/(rlV[caSeg[i]-1]*VSCK)))')); r.forEach(v => { sum += v; n++; }); } });
    const mean = sum / Math.max(1, n);
    ok(seen && mean < 1.0 && mean > 0.6 && +x.g('vscOn') === 0 && +x.g('caPen[0]') === 0, `B VSC: the field averaged ${(mean * 100).toFixed(0)}% of the VSC pace, ended ${+x.g('vscOn') === 0}, player penalty ${x.g('caPen[0]')}, delta ${(+x.g('vscDelta')).toFixed(2)}`);
}
// ---- C: blue flags - a crawling backmarker is lapped and gets out of the way ----
{
    const x = mk(5, 'lapSel = 4;'); toRace(x);
    x.g('caTop[7] = 30; caAcc[7] = 6;');
    let blues = 0, maxBlue = 0;
    x.run(420, () => { const b = +x.g('caBlue[7]'); if (b > 0) blues++; maxBlue = Math.max(maxBlue, b); });
    const lapped = +x.g('caLap[0]') - +x.g('caLap[7]');
    ok(blues > 0 && lapped >= 1, `C blue flags on the backmarker for ${(blues / 10).toFixed(1)} s, lapped by ${lapped}, player penalties ${x.g('caPen[0]')}`);
}
// ---- D: a failure retires a car: DNF, pulled over, classified last, flag out ----
{
    const x = mk(5); toRace(x); x.run(30);
    x.g('caFail[3] = 6;');
    let fl = 0;
    x.run(20, () => { if (+x.g('vscOn') > 0 || +x.g('scOn') > 0) fl = 1; });
    x.g('classify()');
    const last = +x.g('clsI[7]');
    ok(+x.g('caDNF[3]') === 1 && Math.abs(+x.g('caSpd[3]')) < 1 && last === 4 && fl, `D retirement: DNF ${x.g('caDNF[3]')}, speed ${(+x.g('caSpd[3]')).toFixed(1)}, last in the order (car ${last}), VSC/SC out ${fl}, off ${(+x.g('caOff[3]')).toFixed(1)} / w ${(+x.g('sgW[caSeg[3]-1]')).toFixed(1)}`);
}
// ---- E: lock-ups in the wet - the (unmodulated) player flat-spots, the AI hardly ----
{
    const x = mk(1, 'wx = 2;'); toRace(x); x.run(150);
    const fs = JSON.parse(x.g('JSON.stringify(whFS.slice(0, 32))'));
    const pl = Math.max(...fs.slice(0, 4)), ai = Math.max(...fs.slice(4));
    ok(pl > 0.02 && ai < pl, `E flat spots in the rain: player worst ${pl.toFixed(3)}, AI worst ${ai.toFixed(3)}`);
}
// ---- F: rain per zone and the dry line ----
{
    const x = mk(5, 'wx = 3;'); toRace(x);
    x.g('wxPlanA = 5; wxPlanB = 60;');
    let spread = 0, line = 0, wet = 0;
    x.run(320, () => { const z = JSON.parse(x.g('JSON.stringify(zWet.slice(1, 17))')); spread = Math.max(spread, Math.max(...z) - Math.min(...z)); wet = Math.max(wet, +x.g('wetL')); line = Math.max(line, +x.g('dryLine')); });
    ok(spread > 0.1 && line > 0.2 && wet > 0.5, `F zones: peak wetness ${wet.toFixed(2)}, biggest zone spread ${spread.toFixed(2)}, dry line ${line.toFixed(2)}`);
}
// ---- G: cockpit keys and garage setup reach the car ----
{
    const x = mk(5); x.g('suF = 3; suW = 0 - 2; suD = 2; suP = 0 - 3;'); toRace(x);
    x.g('cockpitKey(70); cockpitKey(50); cockpitKey(50);');
    ok(+x.g('caMix[0]') === 3 && +x.g('caBias[0]') === +x.g('suB') + 2 && +x.g('caFWb[0]') > 0.1 && +x.g('caDiff[0]') === 2 && +x.g('caPres[0]') === -3,
        `G mix ${x.g('mixName[caMix[0]-1]')}, bias ${x.g('caBias[0]')}, wing balance ${(+x.g('caFWb[0]')).toFixed(3)}, diff ${x.g('caDiff[0]')}, pressure ${x.g('caPres[0]')}`);
}
// ---- H: track evolution and temperature ----
{
    const x = mk(7); const r0 = +x.g('trkRub');
    x.run(120);
    const r1 = +x.g('trkRub');
    ok(r1 > r0 && +x.g('trkTemp') > 30 && +x.g('trkGripK') > 0.95, `H rubber ${r0.toFixed(2)} -> ${r1.toFixed(2)} in qualifying, track ${(+x.g('trkTemp')).toFixed(1)} C, grip x${(+x.g('trkGripK')).toFixed(3)}`);
}
// ---- I: AI strategy - early stops (undercuts / covers) in a 10-lap race ----
{
    const x = mk(5, 'lapSel = 4;'); toRace(x);
    let early = 0, stops = 0;
    const prev = new Array(8).fill(0);
    x.run(1100, () => {
        const p = JSON.parse(x.g('JSON.stringify([caPit.slice(0,8), caWear.slice(0,8)])'));
        for (let c = 1; c < 8; c++) { if (p[0][c] === 1 && prev[c] !== 1) { stops++; if (p[1][c] > 0.31) early++; } prev[c] = p[0][c]; }
        return +x.g('raceState') !== 5 || +x.g('caFin.slice(0,8).filter(v=>v>0).length') < 8;
    });
    ok(stops >= 5, `I AI pit calls ${stops}, of them early (tyres still above 31%: undercut, cover or safety car) ${early}; finished ${x.g('caFin.slice(0,8).join(",")')}, DNF ${x.g('caDNF.slice(0,8).join("")')}`);
}
// ---- J: the player's car retires: the race is over for them, classified DNF ----
{
    const x = mk(5); toRace(x); x.run(20);
    x.g('caFail[0] = 6;');
    x.run(3);
    x.g('classify()');
    ok(+x.g('raceState') === 5 && +x.g('caDNF[0]') === 1 && +x.g('clsPos') === 8, `J player retirement: state ${x.g('raceState')}, DNF ${x.g('caDNF[0]')}, classified P${x.g('clsPos')}, banner ${x.g('banner')}`);
}

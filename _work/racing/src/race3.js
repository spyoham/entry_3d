// ============================================================
// race3.js - v3.0: what a real race weekend adds on top of rules.js.
// REALISTIC: brake temperature and fade, flat spots, the track rubbering in,
// track temperature, fuel load / consumption / mixes and lift-and-coast, the
// brake balance from the cockpit, rain and water per zone of the lap with a
// dry line, the virtual safety car, failures, the formation lap, Q1-Q2-Q3,
// undercuts and overcuts. BOTH rule sets: blue flags and team traits.
// ============================================================
const FAILK = 0.045;        // chance of a failure per car over a whole race (reliability 1)
let FUELK = 0.72;           // share of a lap's metres on the throttle, weighted (t7/fuel.mjs)
const MASSK = 0.10;         // a race's fuel adds 10 % to the car's weight
let BRH = 9.0;              // brake heating per (m/s x pedal), deg C/s
let BRC = 0.08;             // brake cooling per second per degree over the air, at rest
// ---- the track ----
let trkRub = 0;             // rubber laid down, 0 green .. 1 fully rubbered in
let trkTemp = 30;           // track surface, deg C
let airTemp = 22;
let trkGripK = 1;           // grip from the rubber and the temperature (arcade: 1)
let dryLine = 0;            // mean dry line over the wet zones, for the HUD
// ---- flags ----
let vscOn = 0;              // 0 green, 1 virtual safety car, 2 ending
let vscT = 0;
let vscDur = 0;
let vscDelta = 0;           // the player's margin to the VSC reference, s (must stay >= 0)
let vscUsed = 0;
let bluT = 0;               // how long the player has held a blue flag
// ---- the player's cockpit ----
let bbAdj = 0;              // brake balance moved from the cockpit (1 / 2)
let fuelWarn = 0;
let failSeen = 0;
// ---- formation lap ----
const ST_FORM = 14;
let formT = 0;
// ---- qualifying sessions ----
let qSes = 1;               // Q1, Q2, Q3
let qLapOk = 1;             // the lap just finished was clean
let qRan = 0;               // the last session whose cut has been made

// ---- the track: rubber, temperature, water per zone ------------------------------
function trkReset(quali) {
    trkRub = 0.35;
    if (quali > 0) { trkRub = 0.10; }
    if (wx == 2) { trkRub = 0; }
    let z = 1;
    while (z <= NZ) {
        zRk[z] = rand(0.72, 1.18);
        zDk[z] = rand(0.70, 1.30);
        zSpd[z] = rand(0.25, 1.4);
        zWet[z] = wetL;
        zRain[z] = rainI * zRk[z];
        zLine[z] = 0;
        z = z + 1;
    }
    trkStep();
}

// once a frame (realistic)
function trkStep() {
    // rubber from every car at speed on a dry track; rain washes it away
    let n = 0;
    let c = 1;
    while (c <= nCars) { if (Math.abs(caSpd[c]) > 25) { n = n + 1; } c = c + 1; }
    trkRub = trkRub + dt * n * 0.00045 * (1 - wetL) - dt * 0.012 * rainI * trkRub;
    if (trkRub > 1) { trkRub = 1; }
    // the surface: the circuit's own temperature, cooler as the afternoon goes
    // on and much cooler when wet
    let prog = raceT / Math.max(60, raceDur);
    if (prog > 1) { prog = 1; }
    trkTemp = trkT0[selTrk] - 4 * prog - 8 * todK - 15 * wetL;
    airTemp = trkTemp * 0.55 + 7;
    let tk = 1;
    if (trkTemp > 40) { tk = 1 - 0.0015 * (trkTemp - 40); }
    if (trkTemp < 22) { tk = 1 - 0.0012 * (22 - trkTemp); }
    trkGripK = (0.975 + 0.035 * trkRub) * tk;
    // water: each zone gets its own share of the rain, a little late or early,
    // soaks and dries at its own rate, and cars running the line dry it first
    let sw = 0;
    let sl = 0;
    let z = 1;
    while (z <= NZ) {
        let r = rainI * zRk[z];
        if (r > 1) { r = 1; }
        zRain[z] = zRain[z] + (r - zRain[z]) * Math.min(1, dt * 0.09 * zSpd[z]);
        let w = zWet[z];
        if (zRain[z] > w) { w = w + (zRain[z] - w) * Math.min(1, dt * 0.055); }
        else { w = w + (zRain[z] - w) * Math.min(1, dt * 0.011 * zDk[z]); }
        zWet[z] = w;
        let ln = zLine[z];
        if (zRain[z] < 0.15) { if (w > 0.04) { ln = ln + dt * 0.0016 * n * zDk[z]; } }
        else { ln = ln - dt * 0.06 * zRain[z]; }
        if (w <= 0.04) { ln = 0; }
        if (ln > 1) { ln = 1; }
        if (ln < 0) { ln = 0; }
        zLine[z] = ln;
        sw = sw + w;
        sl = sl + ln;
        z = z + 1;
    }
    wetL = sw / NZ;
    dryLine = sl / NZ;
}

// how wet it is under car c (its zone, its line, the roof of a tunnel)
function carWet(c) {
    let s = caSeg[c];
    let z = Math.floor((s - 1) * NZ / NSEG) + 1;
    if (z > NZ) { z = NZ; }
    let w = zWet[z];
    let near = 1 - Math.abs(caOff[c] - rlO[s]) / 3;
    if (near > 0) { w = w * (1 - 0.75 * zLine[z] * near); }
    if (sgTun[s] > 0) { w = w * 0.1; }
    caWet[c] = w;
}

// ---- brakes, fuel, faults: with the tyres, ten times a second (rules.js) ------------
function carTick3(c, wt, sp) {
    // brakes: heat from the energy they take out, cooling from the air
    let bt = caBrT[c];
    let hot = BRH * caBrk[c] * caBrkK[c] * sp;
    if (caFail[c] == 3) { hot = hot * 1.5; }
    bt = bt + (hot - BRC * (0.3 + sp / 60) * tmBrk[caCol[c]] * (bt - airTemp)) * wt;
    if (bt < airTemp) { bt = airTemp; }
    caBrT[c] = bt;
    let bd = 0;
    if (bt < 250) { bd = Math.min(0.10, (250 - bt) * 0.0006); }
    if (bt > 950) { bd = Math.min(0.35, (bt - 950) * 0.0012); }
    if (caFail[c] == 3) { bd = bd + 0.35; }
    caBrD[c] = bd;
    let gl = (bt - 450) / 550;
    if (gl < 0) { gl = 0; }
    if (gl > 1) { gl = 1; }
    caHeat[c] = gl;
    // fuel: burnt with the throttle (a lift before the braking point saves it)
    let mix = caMix[c];
    if (mix < 1) { mix = 2; }
    let f = caFuel[c];
    // (per metre driven on the throttle, so a lap costs about the same
    // whatever the lap time; a lift before the braking point saves it)
    if (raceState == ST_RACE) { f = f - caFuelR[c] * mixBurn[mix] * (0.05 + caThr[c]) * sp * wt; }
    else if (raceState == ST_FORM) { f = f - caFuelR[c] * 0.3 * caThr[c] * sp * wt; }
    if (f < 0) { f = 0; }
    caFuel[c] = f;
    caMassD[c] = MASSK * f / FUELRACE;
    let pd = 0 - mixPow[mix];
    let td = 0 - mixPow[mix] * 0.4;
    // faults: rare, likelier on a rich mix and with the brakes cooking
    if (raceState == ST_RACE) {
        if (gMode < M_TT) {
            if (caDNF[c] < 1) {
                if (caFail[c] < 1) {
                    let st = 1;
                    if (mix == 3) { st = st + 0.6; }
                    if (bt > 1050) { st = st + 2; }
                    let rel = tmRel[caCol[c]];
                    if (c == 1) { rel = 0.8; }
                    if (rand(0.0001, 0.9999) < FAILK / Math.max(60, raceDur) * rel * st * wt) {
                        let k = Math.floor(rand(0.0001, 5.9999)) + 1;
                        if (bt > 1050) { if (rand(0.0001, 0.9999) < 0.5) { k = 3; } }
                        caFail[c] = k;
                        caFailT[c] = 0;
                        if (k >= 5) { incident(c); }
                    }
                }
            }
        }
    }
    let fk = caFail[c];
    if (fk > 0) {
        caFailT[c] = caFailT[c] + wt;
        if (fk == 1) { pd = pd + 0.30; td = td + 0.12; if (caFailT[c] > 40) { if (mod(c, 2) < 1) { retireCar(c); } } }
        if (fk == 2) { pd = pd + 0.18; td = td + 0.20; }
        if (fk == 4) { pd = pd + 0.04; caErs[c] = 0; caErsOn[c] = 0; }
        if (fk == 5) { pd = pd + 0.5; if (caFailT[c] > 6) { retireCar(c); } }
        if (fk == 6) { retireCar(c); }
    }
    if (f <= 0) { if (raceState == ST_RACE) { pd = 1; if (caDNF[c] < 1) { if (sp < 3) { retireCar(c); } } } }
    if (caDNF[c] > 0) { pd = 1; }
    caPowD[c] = pd;
    caTopD[c] = td;
    // the AI saves fuel when it is running short: lift and coast
    if (c > 1) {
        let left = nLaps - Math.max(caLap[c], 1) + 1 - (caSeg[c] - 1) / NSEG;
        let per = caFuelL[c];
        if (per <= 0) { per = caFuelR[c] * NSEG * segStep * FUELK; }
        caLC[c] = 0;
        if (f < per * left * 1.01) { caLC[c] = 1; }
    }
}

// a lap done: what it burnt
function fuelLap(c) {
    if (caLap[c] > 1) { caFuelL[c] = caFuel0[c] - caFuel[c]; }
    caFuel0[c] = caFuel[c];
    if (c == 1) {
        if (raceState == ST_RACE) {
            let left = nLaps - caLap[1] + 1;
            if (left >= 1) {
                if (caFuelL[1] > 0) {
                    let mg = caFuel[1] / caFuelL[1] - left;
                    if (mg < 0) {
                        if (fuelWarn < caLap[1]) {
                            fuelWarn = caLap[1];
                            fmtSec(0 - mg * caFuelL[1] / Math.max(1, left));
                            setRadio(str('FUEL SHORT - LIFT AND COAST, SAVE ', oSec, ' KG A LAP'), 4);
                        }
                    }
                }
            }
        }
    }
}

// fuel for this session: a race is fuelled to the flag with a small margin;
// qualifying, time trials and practice run light and burn nothing
function fuelUp(c) {
    let n = Math.min(nLaps, 20);
    let load = FUELRACE * n / Math.max(n, 4);
    // burn per metre at full throttle: a race's worth over max(laps, 4) laps,
    // FUELK being the measured share of a lap driven on the throttle
    let lapM = NSEG * segStep;
    caFuelR[c] = FUELRACE / (Math.max(n, 4) * lapM * FUELK) * tmFuel[caCol[c]];
    if (c == 1) { caFuelR[c] = FUELRACE / (Math.max(n, 4) * lapM * FUELK); }
    caFuel[c] = load * 1.03 + 1.5;
    if (gMode >= M_TT) { caFuel[c] = 12; caFuelR[c] = 0; }
    if (raceState == ST_QUALI) { caFuel[c] = 12; caFuelR[c] = 0; }
    caFuel0[c] = caFuel[c];
    caFuelL[c] = 0;
    caMix[c] = 2;
    caMassD[c] = MASSK * caFuel[c] / FUELRACE;
}

// ---- retirements ----------------------------------------------------------------
function retireCar(c) {
    if (caDNF[c] < 1) {
        caDNF[c] = 1;
        caErsOn[c] = 0;
        incident(c);
        let k = caFail[c];
        if (k < 1) { k = 1; }
        let why = str(failName[k], ' FAILURE');
        if (caFuel[c] <= 0) { why = 'OUT OF FUEL'; }
        if (c == 1) {
            setBanner('RETIRED', 3);
            setRadio(str(why, ' - WE HAVE TO STOP, SORRY'), 5);
            finished = 99;
            raceState = ST_DONE;
            raceOver();
        } else {
            setRadio(str(drvName[c], ' OUT - ', why), 4);
            // a stopped car brings out the VSC, sometimes the safety car
            if (rand(0.0001, 0.9999) < 0.25) { maybeSC(1); } else { deployVSC(); }
        }
    }
}

// ---- the virtual safety car -------------------------------------------------------
function deployVSC() {
    if (rules == R_SIM) {
        if (raceState == ST_RACE) {
            if (scOn == 0) {
                if (vscOn == 0) {
                    if (gMode < M_TT) {
                        if (caLap[srtI[1]] < nLaps) {
                            vscOn = 1;
                            vscT = 0;
                            vscDur = rand(18, 32);
                            vscDelta = 0.6;
                            vscUsed = 1;
                            setBanner('VIRTUAL SAFETY CAR', 2.5);
                            setRadio('VSC - KEEP YOUR DELTA POSITIVE, NO OVERTAKING', 4);
                        }
                    }
                }
            }
        }
    }
}

function vscStep() {
    if (vscOn > 0) {
        if (scOn > 0) { vscOn = 0; }
        vscT = vscT + dt;
        if (vscOn == 1) { if (vscT > vscDur) { vscOn = 2; vscT = 0; setRadio('VSC ENDING', 3); } }
        else if (vscT > 4) { vscOn = 0; setBanner('GREEN FLAG', 1.4); }
        // the player's delta: time in hand against the reference pace
        if (vscOn > 0) {
            if (caPit[1] == 0) {
                let vr = rlV[caSeg[1]] * VSCK;
                if (vr < 8) { vr = 8; }
                vscDelta = vscDelta + (1 - Math.abs(caSpd[1]) / vr) * dt;
                if (vscDelta > 9) { vscDelta = 9; }
                if (vscDelta < 0 - 1) { penalise(1, 5, 'PENALTY: TOO FAST UNDER THE VSC'); vscDelta = 0.5; }
            }
        }
    }
}

// ---- blue flags (both rule sets) -----------------------------------------------------
// A car about to be lapped (the car behind it on the road is at least half a
// lap ahead in the race) is shown blue; the AI lifts and moves off the line.
function blueStep(step) {
    let c = 1;
    while (c <= nCars) {
        if (caBlue[c] > 0) { caBlue[c] = caBlue[c] - step; }
        if (caFin[c] < 1) {
            if (caDNF[c] < 1) {
                if (caPit[c] == 0) {
                    let o = 1;
                    while (o <= nCars) {
                        if (o != c) {
                            if (caProg[o] > caProg[c] + NSEG * 0.5) {
                                if (caDNF[o] < 1) {
                                    trackGap(o, c);
                                    if (oGap < 55) { caBlue[c] = 1.5; caBlueBy[c] = o; }
                                }
                            }
                        }
                        o = o + 1;
                    }
                }
            }
        }
        c = c + 1;
    }
    // the player ignoring them: in realistic, a penalty after a while
    if (caBlue[1] > 0) {
        if (bluT < 0.1) { setRadio(str('BLUE FLAG - LET ', drvName[caBlueBy[1]], ' THROUGH'), 3); }
        bluT = bluT + step;
        if (rules == R_SIM) { if (bluT > 9) { penalise(1, 5, 'PENALTY: IGNORING BLUE FLAGS'); bluT = 0.2; } }
    } else { bluT = 0; }
}

// ---- the cockpit (realistic): F fuel mix, 1 / 2 brake balance --------------------------
function cockpitKey(k) {
    if (rules == R_SIM) {
        if (k == 70) {
            caMix[1] = mod(caMix[1], 3) + 1;
            setMsg(str('FUEL MIX  ', mixName[caMix[1]]), 1.4);
        } else if (k == 49) {
            if (bbAdj > 0 - 4) { bbAdj = bbAdj - 1; }
            caBias[1] = suB + bbAdj;
            setMsg(str('BRAKE BALANCE  ', 55 + 2.5 * caBias[1], '% FRONT'), 1.4);
        } else if (k == 50) {
            if (bbAdj < 4) { bbAdj = bbAdj + 1; }
            caBias[1] = suB + bbAdj;
            setMsg(str('BRAKE BALANCE  ', 55 + 2.5 * caBias[1], '% FRONT'), 1.4);
        }
    }
}

// ---- the formation lap (realistic races) ---------------------------------------------
// Everyone leaves the grid in order behind the pole car at a gentle pace (time
// to warm the tyres and brakes), goes round once and stops in their own grid
// box; then the lights. ENTER skips it.
function formBegin() {
    raceState = ST_FORM;
    formT = 0;
    let c = 1;
    while (c <= nCars) { caHold[c] = 0; caFormD[c] = 0; caFormOk[c] = 0; c = c + 1; }
    setBanner('FORMATION LAP', 2.4);
    setMsg('FOLLOW THE FIELD, WARM THE TYRES, STOP IN YOUR BOX  -  ENTER SKIPS', 5);
}

// car c into its grid box, stopped
function formPark(c) {
    let s = caGSeg[c];
    caX[c] = sgX[s] + sgNX[s] * caGOff[c];
    caZ[c] = sgZ[s] + sgNZ[s] * caGOff[c];
    caY[c] = sgY[s];
    atan2d(sgDX[s], sgDZ[s]);
    caYaw[c] = oAtan;
    caVX[c] = 0; caVZ[c] = 0; caVY[c] = 0; caYR[c] = 0; caSpd[c] = 0; caAir[c] = 0;
    caSeg[c] = s; caU[c] = 0; caOff[c] = caGOff[c];
    caSteer[c] = 0;
    caHold[c] = 1;
    caFormOk[c] = 1;
}

// metres car c still has to go to its box (0 .. a lap)
let oBox = 0;
function formDist(c) {
    oBox = mod(caGSeg[c] - caSeg[c], NSEG) * segStep - caU[c] * segStep;
    if (oBox < 0) { oBox = oBox + NSEG * segStep; }
}

function formStep() {
    formT = formT + dt;
    let lap = NSEG * segStep;
    let all = 1;
    let c = 1;
    while (c <= nCars) {
        if (caFormOk[c] < 1) {
            all = 0;
            caFormD[c] = caFormD[c] + Math.abs(caSpd[c]) * dt;
            if (caFormD[c] > lap * 0.75) {
                formDist(c);
                let sp = Math.abs(caSpd[c]);
                if (c == 1) {
                    if (oBox < 7) { if (sp < 9) { formPark(c); setMsg('IN YOUR GRID BOX', 1.5); } }
                    if (oBox > lap - 12) { formPark(c); setMsg('BACK TO YOUR GRID BOX', 1.8); }
                    if (oBox < 60) { if (caFormOk[c] < 1) { setMsg('STOP IN YOUR GRID BOX', 0.3); } }
                } else {
                    if (oBox < 1.4) { formPark(c); }
                    else if (oBox > lap - 6) { formPark(c); }
                }
            }
        }
        c = c + 1;
    }
    if (formT > estLap * 2.4) { formSkip(); all = 1; }
    if (all > 0) { formEnd(); }
}

function formSkip() {
    let c = 1;
    while (c <= nCars) { if (caFormOk[c] < 1) { formPark(c); } c = c + 1; }
}

function formEnd() {
    raceState = ST_COUNT;
    lightN = 0; lightsOut = 0; lightsT = 0; countT = 1.0;
    lightHold = rand(0.4, 1.9);
    setBanner(BLANK, 0);
    setMsg(BLANK, 0);
}

// the AI on the formation lap: behind the car ahead on the grid, then into its box
function formAI(c) {
    // a steady pace: at most ~145 km/h, corners at their own speed
    let v = aiVlim[c] * 0.9;
    if (v > 40) { v = 40; }
    let slot = caGrid[c];
    if (slot > 1) {
        let a = gOrd[slot - 1];
        if (caFormOk[a] < 1) {
            trackGap(c, a);
            if (oGap < 200) {
                let vq = Math.abs(caSpd[a]) + (oGap - 18) * 0.4;
                if (vq < 3) { vq = 3; }
                if (oGap < 9) { vq = 0; }
                if (vq < v) { v = vq; }
            }
        }
    }
    if (caFormD[c] > NSEG * segStep * 0.75) {
        formDist(c);
        let vb = Math.sqrt(2 * 5 * Math.max(0, oBox - 0.8)) + 0.6;
        if (vb < v) { v = vb; }
    }
    oForm = v;
}
let oForm = 0;

// ---- qualifying: Q1 (all 8), Q2 (the fastest 6), Q3 (the fastest 4) -----------------
// The player drives an out-lap and then one timed lap per session, straight
// on from one session into the next while still in; the AI's times come from
// its ideal lap (rules.js), a little quicker each session as the track
// rubbers in.
function qBegin() {
    qSes = 1;
    qRan = 0;
    let c = 1;
    while (c <= NCAR) {
        qIn[c] = 1; caQOut[c] = 0;
        caQ1[c] = 9999; caQ2[c] = 9999; caQ3[c] = 9999;
        if (c > 1) {
            let b = caQT[c];
            let e = 0.4 + drvErr[c];
            caQ1[c] = b * (1.004 + rand(0.0001, 0.006) * e);
            caQ2[c] = b * (1.001 + rand(0.0001, 0.005) * e);
            caQ3[c] = b * (0.998 + rand(0.0001, 0.005) * e);
        }
        c = c + 1;
    }
}

let oQ = 0;
function qTime(c, s) {
    oQ = caQ1[c];
    if (s == 2) { oQ = caQ2[c]; }
    if (s == 3) { oQ = caQ3[c]; }
}

// session s is over: the slowest two still in are out
function qCut(s) {
    qRan = s;
    let n = 0;
    let c = 1;
    while (c <= NCAR) {
        if (qIn[c] > 0) { n = n + 1; clsI[n] = c; qTime(c, s); clsV[c] = oQ; }
        c = c + 1;
    }
    let i = 2;
    while (i <= n) {
        let k = clsI[i];
        let j = i - 1;
        while (j >= 1) {
            if (clsV[clsI[j]] <= clsV[k]) { break; }
            clsI[j + 1] = clsI[j];
            j = j - 1;
        }
        clsI[j + 1] = k;
        i = i + 1;
    }
    if (s < 3) {
        i = n - 1;
        while (i <= n) { let o = clsI[i]; qIn[o] = 0; caQOut[o] = s; i = i + 1; }
    }
}

// the player's timed lap in session qSes has ended (lt, clean or not)
function qLapDone(lt) {
    let t = 9999;
    if (qLapOk > 0) { t = lt; }
    if (qSes == 1) { caQ1[1] = t; } else if (qSes == 2) { caQ2[1] = t; } else { caQ3[1] = t; }
    qCut(qSes);
    if (qIn[1] < 1) {
        setRadio(str('OUT IN Q', qSes, ' - WE START FROM THE BACK HALF'), 3);
        endQuali();
    } else if (qSes >= 3) {
        endQuali();
    } else {
        qSes = qSes + 1;
        setBanner(str('Q', qSes, '  -  TIMED LAP'), 1.6);
        setRadio(str('THROUGH TO Q', qSes, '!'), 2.5);
    }
}

// the grid: Q3 order, then those out in Q2, then those out in Q1 (the player
// leaving early runs no more laps; the AI's sessions are still run)
function qGrid() {
    let s = qRan + 1;
    while (s <= 3) { qCut(s); s = s + 1; }
    let c = 1;
    while (c <= NCAR) {
        // one sortable number: the session reached first, then the time in it
        let t = caQ3[c];
        let base = 0;
        if (caQOut[c] == 2) { t = caQ2[c]; base = 100000; }
        if (caQOut[c] == 1) { t = caQ1[c]; base = 200000; }
        caQT[c] = t;
        clsV[c] = base + t;
        clsI[c] = c;
        c = c + 1;
    }
}

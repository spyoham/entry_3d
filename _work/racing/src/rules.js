// ============================================================
// rules.js - v7 REALISTIC rules: tyre compounds and wear, weather that can
// change during the race, damage, the ERS boost, pit stops in a real pit
// lane beside the main straight, penalties, yellow flags, the safety car and
// qualifying. ARCADE uses none of it (the AI personalities in ai.js apply to
// both rule sets).
// ============================================================
const R_ARC = 1;
const R_SIM = 2;
const TY_S = 1;
const TY_M = 2;
const TY_H = 3;
const TY_I = 4;
const TY_W = 5;
const ERS_ACC = 2.4;        // extra drive with the boost on, m/s^2
const WEARK = 1.0;          // life scale (mean tyre load is about 0.6): tyLife is the share of the race a set lasts
const QK = 1.33;            // AI best lap / ideal lap x skill, measured (t7/qcal.mjs: 1.29 .. 1.36)

let rules = 1;              // R_ARC / R_SIM, chosen from the main menu
// ---- weather ----
let wetL = 0;               // how wet the track is, 0 dry .. 1 soaked (grip)
let rainI = 0;              // how hard it is raining now, 0 .. 1
let rainVis = 0;            // rain as drawn: streaks, spray, rain lights
let wetVis = 0;             // how wet the world looks: palette, sky, fog
let wxPlanA = 0;            // CHANGING: race time the rain arrives
let wxPlanB = 0;            // ...and stops (0: it does not)
let wxWarn = 0;
let atmoW = 0 - 1;          // wetness and time of day the palette was baked for
let atmoT = 0 - 1;
let todK = 0;               // ULTRA: 0 afternoon .. 0.85 dusk
let estLap = 90;            // expected lap time, s
let raceDur = 360;          // race length the tyre life is scaled to, s
// ---- pit lane ----
let pitOn = 0;
let pitA = 1;               // first ring of the lane
let pitE = 1;               // last ring
let pitLen = 0;
let pitBox0 = 1;            // first team box (one ring per car after it)
let pitNext = 2;            // the tyre the player will be given at the next stop
let startTy = 2;            // ...and starts the race on
// ---- flags and penalties ----
let scOn = 0;               // 0 green, 1 safety car out, 2 in this lap, 3 restart pending
let scCar = 0;              // 1 while the safety car is on track (car slot GHOST)
let scTm = 0;
let scUsed = 0;
let scLap = 0;
let prevRank = 0;
let yelHere = 0;            // the player is inside a yellow-flag zone
let oYel = 0;
let radio = BLANK;          // team radio line
let radioT = 0;
// ---- qualifying ----
let qOn = 0;                // this race is qualified for
let qDone = 0;              // ...and the grid order is in caGrid

function setRadio(t, secs) { radio = t; radioT = secs; }

// ---- weather -------------------------------------------------------------
// Arcade: rain or not, fixed. Realistic RAIN: wet all race. CHANGING: dry to
// start, the rain arrives somewhere in the first half and may stop again.
function wxSetup() {
    rainI = 0;
    wetL = 0;
    if (wx == 2) { rainI = 1; wetL = 1; }
    wxPlanA = 0;
    wxPlanB = 0;
    wxWarn = 0;
    if (rules == R_SIM) {
        if (wx == 3) {
            let dur = estLap * nLaps;
            if (dur > 5400) { dur = estLap * 6; }
            wxPlanA = dur * rand(0.22, 0.48);
            if (rand(0.0001, 0.9999) < 0.5) { wxPlanB = wxPlanA + dur * rand(0.25, 0.40); }
        }
    }
    rainVis = rainI;
    wetVis = wetL;
}

function wxStep() {
    if (wx == 3) {
        let want = 0;
        if (raceState == ST_RACE) {
            if (raceT > wxPlanA) { want = 1; }
            if (wxPlanB > 0) { if (raceT > wxPlanB) { want = 0; } }
            if (wxWarn < 1) {
                if (raceT > wxPlanA - estLap * 0.8) { wxWarn = 1; setRadio('RAIN EXPECTED IN ABOUT A LAP', 4); }
            } else if (wxWarn == 1) {
                if (wxPlanB > 0) { if (raceT > wxPlanB - estLap * 0.6) { wxWarn = 2; setRadio('RAIN STOPPING SOON', 4); } }
            }
        }
        if (raceState == ST_DONE) { want = rainI > 0.5 ? 1 : 0; }
        rainI = rainI + (want - rainI) * Math.min(1, dt * 0.09);
    }
    // the track soaks in about half a minute and dries over a few (a dry line)
    if (rainI > wetL) { wetL = wetL + (rainI - wetL) * Math.min(1, dt * 0.055); }
    else { wetL = wetL + (rainI - wetL) * Math.min(1, dt * 0.011); }
    rainVis = rainI;
    wetVis = wetL;
    if (rainI * 0.8 > wetVis) { wetVis = rainI * 0.8; }
    if (Math.abs(wetVis - atmoW) > 0.08) { refreshAtmos(); }
}

// ---- tyres -----------------------------------------------------------------
// Grip multiplier for car c: its compound on this much water, then wear - a
// gentle fade, and a cliff once the set is nearly gone.
function tyreGrip(c) {
    let t = caTy[c];
    let g = tyDry[t] + (tyWet[t] - tyDry[t]) * wetL;
    let w = caWear[c];
    let k = 0.80 + 0.20 * w;
    if (w < 0.25) { k = k * (0.85 + 0.6 * w); }
    caWK[c] = g * k;
}

function fitTyre(c, t) {
    caTy[c] = t;
    caWear[c] = 1;
    caWR[c] = WEARK / (tyLife[t] * raceDur);
    if (gMode == M_TT) { caWR[c] = 0; }
    tyreGrip(c);
}

// the right tyre for the conditions and the laps left
let oTy = 1;
function pickTyre(c, lapsLeft) {
    if (wetL > 0.57) { oTy = TY_W; }
    else if (wetL > 0.31) { oTy = TY_I; }
    else {
        let fr = lapsLeft / Math.max(nLaps, 4);
        if (c > 1) { fr = fr * (1.08 - 0.16 * drvAgg[c]); }
        oTy = TY_H;
        if (fr <= tyLife[TY_M] * 0.92) { oTy = TY_M; }
        if (fr <= tyLife[TY_S] * 0.92) { oTy = TY_S; }
    }
}

// wear, and the ERS store, for one physics step of car c
function simCarStep(c, aLat, mu, da) {
    if (raceState == ST_RACE) {
        let u = Math.abs(aLat) / (mu + 0.5);
        if (u > 1.2) { u = 1.2; }
        let use = 0.30 + 0.70 * u;
        if (da > 8) { use = use + 0.8; }
        if (caBrk[c] > 0.5) { if (caSpd[c] > 30) { use = use + 0.25; } }
        // treaded tyres cook on a drying track
        if (caTy[c] >= TY_I) { if (wetL < 0.35) { use = use * (1 + 5 * (0.35 - wetL)); } }
        let w = caWear[c] - caWR[c] * use * dt;
        if (w < 0) { w = 0; }
        caWear[c] = w;
    }
    // ERS: harvested under braking (up to a share per lap), spent on demand
    let e = caErs[c];
    if (caBrk[c] > 0.05) {
        if (caSpd[c] > 12) {
            if (caErsH[c] < 0.62) {
                let h = 0.17 * caBrk[c] * dt;
                e = e + h;
                caErsH[c] = caErsH[c] + h;
            }
        }
    }
    if (caErsOn[c] > 0) { if (caThr[c] > 0.3) { e = e - 0.13 * dt; } }
    if (e > 1) { e = 1; }
    if (e <= 0) { e = 0; caErsOn[c] = 0; }
    caErs[c] = e;
}

// ---- damage ----------------------------------------------------------------
function addDamage(c, d) {
    if (rules == R_SIM) {
        if (d > 0.02) {
            let v = caDmg[c] + d;
            if (v > 1) { v = 1; }
            caDmg[c] = v;
            if (caWing[c] < 1) {
                if (v >= 0.6) {
                    caWing[c] = 1;
                    debris(c);
                    if (c == 1) { setRadio('FRONT WING GONE - BOX, BOX!', 4); }
                }
            }
            if (c == 1) { if (d > 0.08) { setMsg(str('DAMAGE ', Math.round(v * 100), '%'), 1.6); } }
            if (d > 0.3) {
                incident(c);
                maybeSC(Math.min(0.8, (d - 0.3) * 1.6));
            }
        }
    }
}

// ---- pit lane --------------------------------------------------------------
// Built with the circuit in realistic mode: a lane of tarmac on the left of
// the straight either side of the line, tapering in and out, with one box per
// car in the middle of it. Walls along it come down.
function buildPitLane() {
    let i = 1;
    while (i <= NSEG + 1) { sgPit[i] = 0; i = i + 1; }
    pitOn = 0;
    if (rules == R_SIM) {
        let nb = 0;
        let q = NSEG;
        while (nb < 24) {
            if (Math.abs(sgCurv[q]) > 0.0045) { break; }
            nb = nb + 1;
            q = q - 1;
        }
        let nf = 0;
        q = 1;
        while (nf < 20) {
            if (Math.abs(sgCurv[q]) > 0.0045) { break; }
            nf = nf + 1;
            q = q + 1;
        }
        if (nb < 8) { nb = 8; }
        if (nf < 8) { nf = 8; }
        pitA = NSEG - nb + 1;
        pitE = nf;
        pitLen = nb + nf;
        pitOn = 1;
        let k = 0;
        while (k < pitLen) {
            let s = mod(pitA - 1 + k, NSEG) + 1;
            let wd = PITW;
            if (k < 4) { wd = 3 + (PITW - 3) * k / 4; }
            if (k > pitLen - 5) { wd = 3 + (PITW - 3) * (pitLen - 1 - k) / 4; }
            sgPit[s] = 1;
            sgRTL[s] = 6;
            sgRWL[s] = wd;
            if (sgTun[s] < 1) {
                if (sgHW[s] > 0) { sgHW[s] = 0; sgRWR[s] = RUNV; sgRTR[s] = 0; }
            }
            k = k + 1;
        }
        pitBox0 = mod(pitA - 1 + Math.floor((pitLen - NCAR) / 2), NSEG) + 1;
        k = 0;
        while (k < NCAR) { sgPit[mod(pitBox0 - 1 + k, NSEG) + 1] = 2; k = k + 1; }
    }
    sgPit[NSEG + 1] = sgPit[1];
    sgRTL[NSEG + 1] = sgRTL[1]; sgRWL[NSEG + 1] = sgRWL[1];
    sgRTR[NSEG + 1] = sgRTR[1]; sgRWR[NSEG + 1] = sgRWR[1];
    sgHW[NSEG + 1] = sgHW[1];
}

// Pit state of car c: 0 racing, 1 coming in (AI), 2 in the lane, 3 stopped,
// 4 leaving. The limiter holds 80 km/h in states 2 and 4.
function pitStep(c) {
    let s = caSeg[c];
    let lane = caSurf[c] == 6 ? 1 : 0;
    let st = caPit[c];
    if (st <= 1) {
        if (lane > 0) {
            if (sgPit[s] > 0) {
                if (c == 1) { caPit[c] = 2; setRadio('PIT LIMITER ON', 2); }
                else if (st == 1) { caPit[c] = 2; }
            }
        }
    } else if (st == 2) {
        let d = mod(caBox[c] - s, NSEG);
        if (lane > 0) {
            if (d == 0) { pitStop(c); }
            else if (d > NSEG - 3) { pitStop(c); }
        } else if (c == 1) {
            // steered back out before the box: no stop
            if (caSurf[c] < 2) { caPit[c] = 0; setRadio('PIT STOP CANCELLED', 1.5); }
        }
        if (sgPit[s] < 1) { caPit[c] = 0; }
    } else if (st == 3) {
        caPitT[c] = caPitT[c] - dt;
        caVX[c] = 0;
        caVZ[c] = 0;
        caHold[c] = 1;
        if (caPitT[c] <= 0) {
            caHold[c] = 0;
            caPit[c] = 4;
            if (c == 1) { setRadio('GO, GO, GO!', 1.5); }
        }
    } else {
        if (sgPit[s] < 1) { caPit[c] = 0; }
        else if (lane < 1) { if (caSurf[c] < 2) { caPit[c] = 0; } }
    }
    caLim[c] = 0;
    if (caPit[c] == 2) { caLim[c] = 1; }
    if (caPit[c] == 4) { caLim[c] = 1; }
}

function pitStop(c) {
    caPit[c] = 3;
    caHold[c] = 1;
    caVX[c] = 0; caVZ[c] = 0; caYR[c] = 0; caSpd[c] = 0;
    let t = 2.2 + rand(0.0001, 0.6);
    if (caDmg[c] > 0.05) { t = t + 2 + caDmg[c] * 4; }
    caPitT[c] = t;
    let ny = caPitN[c];
    if (c == 1) { ny = pitNext; }
    let lapsLeft = nLaps - caLap[c];
    fitTyre(c, ny);
    caDmg[c] = 0;
    caWing[c] = 0;
    caStops[c] = caStops[c] + 1;
    if (c == 1) {
        fmtSec(t);
        setRadio(str('PIT STOP  ', oSec, ' s  -  ', tyName[ny]), t + 1);
        // offer the same compound again next time unless the weather changes
        pickTyre(1, lapsLeft);
        if (oTy >= TY_I) { pitNext = oTy; }
    }
}

// the AI decides to come in while it still has room to cross to the lane
function aiStrategy(c) {
    if (caPit[c] == 0) {
        if (pitOn > 0) {
            if (caFin[c] < 1) {
                if (caLap[c] >= 1) {
                    let d = mod(pitA - caSeg[c], NSEG);
                    if (d > 6) {
                        if (d < 30) {
                            let left = nLaps - caLap[c];
                            let want = 0;
                            let t = caTy[c];
                            if (t <= TY_H) { if (wetL > 0.40) { want = 1; } }
                            if (t >= TY_I) { if (wetL < 0.22) { if (left >= 1) { want = 1; } } }
                            if (t == TY_I) { if (wetL > 0.72) { if (left >= 2) { want = 1; } } }
                            if (t == TY_W) { if (wetL < 0.50) { if (wetL >= 0.22) { if (left >= 2) { want = 1; } } } }
                            if (caWear[c] < 0.30) { if (left >= 1) { want = 1; } }
                            if (scOn == 1) { if (caWear[c] < 0.55) { if (left >= 2) { want = 1; } } }
                            if (caDmg[c] > 0.45) { if (left >= 1) { want = 1; } }
                            if (want > 0) {
                                pickTyre(c, left);
                                caPit[c] = 1;
                                caPitN[c] = oTy;
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---- penalties, yellow flags, the safety car ----------------------------------
function penalise(c, secs, why) {
    caPen[c] = caPen[c] + secs;
    if (c == 1) {
        setMsg(str('+', secs, ' SEC PENALTY'), 3);
        setRadio(why, 3.5);
    }
}

function incident(c) {
    caYelT[c] = 9;
    caYelS[c] = caSeg[c];
}

// is ring s inside a yellow zone (from 16 rings before an incident to 2 after)?
function yellowAt(s) {
    oYel = 0;
    let c = 1;
    while (c <= nCars) {
        if (caYelT[c] > 0) {
            let d = mod(caYelS[c] - s, NSEG);
            if (d < 16) { oYel = 1; }
            if (d > NSEG - 3) { oYel = 1; }
        }
        c = c + 1;
    }
}

// all four wheels over the white line (the car's centre a metre past it) for
// more than a moment: a strike; every third one costs 5 s. The first lap's
// scramble is let go, as the stewards do.
function limitsStep() {
    let c = 1;
    while (c <= nCars) {
        let off = 0;
        if (caSurf[c] >= 2) { if (caSurf[c] != 6) { if (Math.abs(caSpd[c]) > 14) { if (caPit[c] == 0) {
            if (Math.abs(caOff[c]) > sgW[caSeg[c]] + 1.0) { if (caLap[c] >= 2) { off = 1; } }
        } } } }
        if (off > 0) {
            let was = caTLon[c];
            caTLon[c] = was + dt;
            if (was <= 0.6) {
                if (caTLon[c] > 0.6) {
                    caTL[c] = caTL[c] + 1;
                    let n = mod(caTL[c], 3);
                    if (n == 0) { penalise(c, 5, 'PENALTY: TRACK LIMITS'); }
                    else if (c == 1) { setRadio(str('TRACK LIMITS - WARNING ', n, ' OF 3'), 2.5); }
                }
            }
        } else if (caSurf[c] < 2) { caTLon[c] = 0; }
        c = c + 1;
    }
}

function flagsStep() {
    let c = 1;
    while (c <= nCars) {
        if (caYelT[c] > 0) { caYelT[c] = caYelT[c] - dt; }
        if (caPit[c] == 0) {
            if (caFin[c] < 1) {
                let sp = Math.abs(caSpd[c]);
                if (caSurf[c] >= 2) { if (caSurf[c] != 6) { if (caOffT[c] > 0.8) { if (sp < 18) { incident(c); } } } }
                if (caStuck[c] > 0.8) { incident(c); }
                if (c == 1) { if (sp < 4) { if (raceT > 5) { incident(c); } } }
            }
        }
        c = c + 1;
    }
    yellowAt(caSeg[1]);
    yelHere = oYel;
    scStep();
    // passing under yellow or behind the safety car costs 5 s (not a car
    // that is in the pits or crawling)
    let r = caRank[1];
    if (prevRank > 0) {
        if (r < prevRank) {
            if (caPit[1] == 0) {
                let flag = yelHere;
                if (scOn > 0) { flag = 1; }
                if (flag > 0) {
                    let o = srtI[r + 1];
                    if (Math.abs(caSpd[o]) > 15) {
                        if (caPit[o] == 0) {
                            if (scOn > 0) { penalise(1, 5, 'PENALTY: OVERTAKING UNDER THE SAFETY CAR'); }
                            else { penalise(1, 5, 'PENALTY: OVERTAKING UNDER YELLOW'); }
                        }
                    }
                }
            }
        }
    }
    prevRank = r;
}

function maybeSC(chance) {
    if (rules == R_SIM) {
        if (raceState == ST_RACE) {
            if (scOn == 0) {
                if (scUsed < 1) {
                    if (gMode != M_TT) {
                        if (nLaps >= 3) {
                            if (caLap[srtI[1]] < nLaps) {
                                if (rand(0.0001, 0.9999) < chance) { deploySC(); }
                            }
                        }
                    }
                }
            }
        }
    }
}

// The safety car joins a little ahead of the leader and runs at a steady
// pace; the field queues up behind it (ai.js) and nobody may pass. After most
// of a lap it pulls into the pit lane and the leader restarts the race at the
// line.
function deploySC() {
    scOn = 1;
    scTm = 0;
    scUsed = 1;
    scCar = 1;
    let L = srtI[1];
    let s = mod(caSeg[L] - 1 + 12, NSEG) + 1;
    let g = GHOST;
    caX[g] = sgX[s]; caZ[g] = sgZ[s]; caY[g] = sgY[s];
    atan2d(sgDX[s], sgDZ[s]);
    caYaw[g] = oAtan;
    let v = Math.abs(caSpd[L]) * 0.7;
    caVX[g] = sgDX[s] * v; caVZ[g] = sgDZ[s] * v; caVY[g] = 0; caYR[g] = 0;
    caSeg[g] = s; caU[g] = 0; caOff[g] = 0; caSurf[g] = 0; caAir[g] = 0;
    caCol[g] = GHOST + 1;
    caAcc[g] = 16; caTop[g] = 70; caGrip[g] = 1; caMass[g] = 1; caSkill[g] = 0.95; caLine[g] = 0;
    caHold[g] = 0; caPit[g] = 0; caLim[g] = 0; caWK[g] = 1; caDmg[g] = 0; caWing[g] = 0;
    caErsOn[g] = 0; caTow[g] = 0; caDRS[g] = 0; caThr[g] = 0; caBrk[g] = 0; caSteer[g] = 0; caHB[g] = 0;
    caFin[g] = 0; caRoll[g] = 0; caPitch[g] = 0; caStuck[g] = 0; caMisT[g] = 0; caDefT[g] = 0 - 3;
    caPace[g] = 1; caHeat[g] = 0; caSpd[g] = v; caOffT[g] = 0; caLap[g] = caLap[L];
    tyreGrip(1);
    caWK[g] = caWK[1];
    setBanner('SAFETY CAR', 2.5);
    setRadio('SAFETY CAR DEPLOYED - NO OVERTAKING', 4);
    let c = 1;
    while (c <= nCars) { caDRS[c] = 0; caDOk[c] = 2; c = c + 1; }
}

function scStep() {
    if (scOn > 0) {
        scTm = scTm + dt;
        if (scOn == 1) {
            if (scTm > Math.max(28, estLap * 0.85)) { scOn = 2; setRadio('SAFETY CAR IN THIS LAP', 4); }
        } else if (scOn == 2) {
            if (scCar > 0) {
                if (mod(pitA - caSeg[GHOST], NSEG) < 2) {
                    scCar = 0;
                    scOn = 3;
                    scLap = caLap[srtI[1]];
                }
            }
        } else if (scOn == 3) {
            if (caLap[srtI[1]] > scLap) {
                scOn = 0;
                setBanner('GREEN FLAG', 1.6);
                setRadio('RACE ON!', 2);
            }
        }
    }
}

// ---- the whole lot, once a frame -------------------------------------------------
function simStep() {
    wxStep();
    let c = 1;
    while (c <= nCars) {
        tyreGrip(c);
        pitStep(c);
        c = c + 1;
    }
    if (raceState == ST_RACE) {
        limitsStep();
        flagsStep();
        c = 2;
        while (c <= nCars) { aiStrategy(c); c = c + 1; }
    }
    if (radioT > 0) { radioT = radioT - dt; if (radioT <= 0) { radio = BLANK; } }
}

// ---- qualifying ------------------------------------------------------------------
// The player runs alone: an out-lap and QLAPS timed laps. The AI's times come
// from each car's ideal lap on the racing line (the same speed profile the
// line assist uses), scaled by how close that driver gets to it.
function lapIdeal() {
    oLap = 0;
    let i = 1;
    while (i <= NSEG) { oLap = oLap + segStep / rlV[i]; i = i + 1; }
}
let oLap = 0;

function aiQualiTimes(ct) {
    let qt = TY_S;
    if (wx == 2) { qt = TY_W; }
    let gq = tyDry[qt] + (tyWet[qt] - tyDry[qt]) * wetL;
    let c = 2;
    while (c <= NCAR) {
        carStats(c, ct);
        speedProfile(caGrip[c] * gq, caTop[c]);
        lapIdeal();
        caQT[c] = oLap * QK / caSkill[c] * (1 + rand(0.0001, 0.012) * (0.4 + drvErr[c]));
        c = c + 1;
    }
    carStats(1, ct);
    speedProfile(caGrip[1] * gq, caTop[1]);
}

function beginQuali(ct) {
    rpReset();
    aiQualiTimes(ct);
    nCars = 1;
    nLaps = 999;
    let s = mod(NSEG - 38 - 1, NSEG) + 1;
    carStats(1, ct);
    placeCar(1, s, 0);
    let qt = TY_S;
    if (wx == 2) { qt = TY_W; }
    fitTyre(1, qt);
    caWR[1] = 0;
    caErs[1] = 1;
    raceState = ST_QUALI;
    caHold[1] = 0;
    lightsOut = 1;
    raceT = 0;
    bestLap = 0 - 1;
    lastLap = 0 - 1;
    camMode = 0;
    camYawS = caYaw[1];
    camX = caX[1]; camZ = caZ[1]; camY = caY[1] + 3;
    setBanner('QUALIFYING', 2.2);
    setMsg('OUT LAP - THEN TWO TIMED LAPS', 3);
}

function endQuali() {
    caQT[1] = 9999;
    if (bestLap > 0) { caQT[1] = bestLap; }
    let c = 1;
    while (c <= NCAR) { clsI[c] = c; c = c + 1; }
    let i = 2;
    while (i <= NCAR) {
        let k = clsI[i];
        let j = i - 1;
        while (j >= 1) {
            if (caQT[clsI[j]] <= caQT[k]) { break; }
            clsI[j + 1] = clsI[j];
            j = j - 1;
        }
        clsI[j + 1] = k;
        i = i + 1;
    }
    i = 1;
    while (i <= NCAR) { caGrid[clsI[i]] = i; i = i + 1; }
    qDone = 1;
    nCars = 0;
    raceState = ST_QRES;
    mcInit = 0;
}

// ---- final classification: finishing time plus penalties ---------------------------
function classify() {
    let i = 1;
    while (i <= nCars) {
        let o = srtI[i];
        clsI[i] = o;
        clsV[o] = 0 - caProg[o];
        if (caFin[o] > 0) { clsV[o] = caFinT[o] + caPen[o] - 1000000; }
        i = i + 1;
    }
    i = 2;
    while (i <= nCars) {
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
    i = 1;
    while (i <= nCars) { if (clsI[i] == 1) { clsPos = i; } i = i + 1; }
}
let clsPos = 0;

// ============================================================
// ai.js - waypoint driver. Each opponent follows the centreline offset onto
// a racing line, lifts and brakes before a corner according to the grip it
// can actually use, and moves off line to pass slower cars.
// v7: every driver has a personality (drvAgg / drvDef / drvErr, both rule
// sets): attackers go for gaps earlier and brake later, defenders cover the
// inside, and the error-prone ones now and then get a corner wrong. In
// realistic mode the AI also uses ERS, comes into the pits, obeys yellow
// flags and queues behind the safety car (which is driven by this code too,
// in car slot GHOST).
// ============================================================
// Reading the road ahead - which is most of the AI's cost - depends only on
// where the car is on the track, and that barely moves inside one frame. So
// the survey runs once a frame and the driving runs on every physics slice.
const AIMARG = 0.84;
// v4.0: the AI was tuned on rings about 8.5 m apart. The real circuits have
// them up to 15 m apart (a longer lap, the same ring count), so what it looks
// ahead to is measured in metres of that reference, not in rings.
const AIREF = 8.5;
const AILEAD = 0;
// 1: follow the racing line. Measured over 100 s on all 8 circuits it was
// slower on four and ran wide more often, so the v4 line stays.
let AIRL = 0;
function aiPlan(c) {
    let s = caSeg[c];
    let sp = Math.sqrt(caVX[c] * caVX[c] + caVZ[c] * caVZ[c]);
    let skill = caSkill[c];
    // For each corner ahead, work out the speed it can be taken at and how
    // fast we may still be travelling now and stop in time. Taking the minimum
    // of those lets the car stay flat out until the real braking point, rather
    // than crawling at the speed of the tightest bend anywhere in sight.
    let rq = AIREF / segStep;
    let look = Math.floor((8 + sp * 0.46) * rq);
    if (look > 40) { look = 40; }
    let nearK = Math.floor(8 * rq + 0.5);
    let vlim = caTop[c] * skill;
    // The tyres give caGrip * (GRIP0 + AERO * v * v); solving v*v = mu / curvature
    // for v gives the corner speed. AIMARG keeps a margin under the real limit
    // (an attacker keeps a thinner one).
    let marg = AIMARG;
    if (c <= NCAR) { marg = AIMARG + 0.012 * drvAgg[c]; }
    let gk = caGrip[c] * marg * skill * caWK[c] * trkGripK / (1 + 0.5 * caMassD[c]);
    // a damaged front end turns in less: drive to what is left of it
    if (caDmg[c] > 0) { gk = gk * (1 - 0.30 * caDmg[c]); if (caWing[c] > 0) { gk = gk * 0.90; } }
    let bk2 = 1;
    // a mistake: too much speed into the next corner and a late, soft stop
    if (caMisT[c] > 0) { if (caMisK[c] < 2) { gk = gk * 1.07; bk2 = 0.85; } }
    let g0 = gk * GRIP0;
    let ga = gk * AERO;
    // v3.0: faded brakes and a full tank stop the car later
    let bdec = 2 * 15 * skill * caWK[c] * segStep * bk2 * (1 - caBrD[c]) / (1 + caMassD[c]);
    let worst = 0;
    let wsign = 0;
    let nearCv = 0;
    // k = 0 is the segment the car is in: a corner still under the wheels
    // counts, with no braking distance left to it
    let k = 0;
    while (k <= look) {
        let i = mod(s - 1 + k, NSEG) + 1;
        let cv = sgCurv[i];
        let av = cv;
        if (av < 0) { av = 0 - av; }
        // (v4.0: the corner speed from the tightest point of the ring)
        let ap = sgCurvA[i];
        if (ap > 0.00040) {
            let vc2 = 99999;
            if (ap > ga + 0.00005) { vc2 = g0 / (ap - ga); }
            let bk = k - 1;
            if (bk < 0) { bk = 0; }
            let vAllow = Math.sqrt(vc2 + bdec * bk);
            if (vAllow < vlim) { vlim = vAllow; }
        }
        // the nearest firm corner is the one the racing line aims at
        let aw = av * (1.05 - 0.5 * k / look);
        if (k < 1) { aw = av * 0.6; }
        if (aw > worst) { worst = aw; wsign = cv > 0 ? 1 : 0 - 1; }
        if (k <= nearK) { if (av > nearCv) { nearCv = av; } }
        k = k + 1;
    }
    // v7: personality - lap-to-lap pace, and now and then a mistake
    if (c <= NCAR) {
        vlim = vlim * caPace[c];
        if (caMisT[c] > 0) { caMisT[c] = caMisT[c] - dt; }
        else if (worst > 0.004) {
            if (sp > 25) {
                if (raceState == ST_RACE) {
                    // v3.0: a car right behind makes mistakes likelier; a
                    // mistake is either a late, soft stop (which in realistic
                    // can lock the fronts) or running wide
                    let pr = 1;
                    let r = caRank[c];
                    if (r < nCars) { if (caGap[srtI[r + 1]] - caGap[c] < 0.8) { if (caGap[c] >= 0) { pr = 1.8; } } }
                    if (rand(0.0001, 0.9999) < drvErr[c] * 0.016 * pr * dt / skill) {
                        caMisT[c] = 1.2;
                        caMisK[c] = 1;
                        if (rand(0.0001, 0.9999) < 0.4) { caMisK[c] = 2; }
                    }
                }
            }
        }
    } else {
        // the safety car: a brisk but safe pace
        vlim = vlim * 0.60;
    }
    // v7: is this car in a yellow-flag zone (checked once a frame)
    aiYel[c] = 0;
    if (rules == R_SIM) { if (c <= NCAR) { yellowAt(s); aiYel[c] = oYel; } }
    aiVlim[c] = vlim;
    aiWorst[c] = worst;
    aiWsign[c] = wsign;
    aiNear[c] = nearCv;
}

// distance along the track from car a forward to car b, metres (0 .. lap)
let oGap = 0;
function trackGap(a, b) {
    oGap = mod(caSeg[b] + caU[b] - caSeg[a] - caU[a], NSEG) * segStep;
}

function aiDrive(c) {
    let s = caSeg[c];
    let sp = Math.sqrt(caVX[c] * caVX[c] + caVZ[c] * caVZ[c]);
    let skill = caSkill[c];
    let vlim = aiVlim[c];
    let worst = aiWorst[c];
    let wsign = aiWsign[c];
    let nearCv = aiNear[c];
    let agg = 0.5;
    let def = 0.5;
    if (c <= NCAR) { agg = drvAgg[c]; def = drvDef[c]; }
    let isSC = c > NCAR ? 1 : 0;
    // no passing under a yellow flag or behind the safety car
    let noPass = 0;
    if (scOn > 0) { noPass = 1; }
    if (aiYel[c] > 0) { noPass = 1; vlim = vlim * 0.94; }
    // v3.0: the virtual safety car - everyone at the reference pace
    if (vscOn > 0) { if (isSC < 1) { noPass = 1; let vv = rlV[s] * VSCK * 0.97; if (vv < vlim) { vlim = vv; } } }
    // v3.0: the formation lap - in grid order, then into the box
    if (raceState == ST_FORM) { noPass = 1; formAI(c); if (oForm < vlim) { vlim = oForm; } }
    // (after the defence / pass logic below: down the middle of the grid, then into the box)
    let inPit = caPit[c];

    // ---- racing line: hug the inside of the coming corner ----
    let w = sgW[s];
    let tgtOff = 0;
    if (AIRL > 0) {
        // v5: follow the precomputed racing line a little way ahead
        // (v4.0: 3 reference rings, between two rings if need be)
        let lf = caU[c] + 3 * AIREF / segStep;
        let lk = Math.floor(lf);
        let la = mod(s - 1 + lk, NSEG) + 1;
        let lb = mod(la, NSEG) + 1;
        tgtOff = (rlO[la] + (rlO[lb] - rlO[la]) * (lf - lk)) * 0.9 + caLine[c] * 0.5;
    } else {
        if (worst > 0.0016) {
            tgtOff = wsign * (w - 3.5) * 0.55;
        }
        tgtOff = tgtOff + caLine[c];
    }
    // v7 defending: once per approach, cover the inside of the coming corner
    if (caDefT[c] > 0 - 3) { caDefT[c] = caDefT[c] - dt; }
    if (caDefT[c] > 0) { tgtOff = caDefO[c]; }

    // ---- overtaking: shift away from a car just ahead ----
    let fx = sind(caYaw[c]);
    let fz = cosd(caYaw[c]);
    let passD = 17 + 14 * agg;
    let gapW = 3.6 - 0.6 * agg;
    let o = 1;
    while (o <= nCars) {
        // (v3.0: a car parked in its grid box or retired is not traffic to follow)
        let skip = 0;
        if (o == c) { skip = 1; }
        if (raceState == ST_FORM) { if (caFormOk[o] > 0) { skip = 1; } }
        if (caDNF[o] > 0) { skip = 1; }
        if (skip < 1) {
            let dx = caX[o] - caX[c];
            let dz = caZ[o] - caZ[c];
            let ahead = dx * fx + dz * fz;
            let side = dx * fz - dz * fx;
            if (ahead > 0) {
                if (ahead < passD) {
                    if (Math.abs(side) < 3.4) {
                        let vo = Math.abs(caSpd[o]);
                        if (noPass > 0) {
                            // hold station a few car lengths back
                            if (ahead < 16) { if (vlim > vo - 0.5) { vlim = vo - 0.5; } }
                            if (ahead < 9) { tgtOff = caOff[o] + (side > 0 ? 0 - 3.6 : 3.6); }
                        } else if (ahead < 17) {
                            tgtOff = caOff[o] + (side > 0 ? 0 - gapW : gapW);
                            // an attacker lunges for the inside of the next corner
                            if (agg > 0.6) { if (worst > 0.003) { tgtOff = wsign * (w - 2.2); } }
                        } else if (agg > 0.6) {
                            // ...and lines up the move from further back
                            if (vo < sp - 1) { tgtOff = caOff[o] + (side > 0 ? 0 - gapW : gapW); }
                        }
                    }
                }
            } else if (ahead > 0 - 22) {
                // a faster car right behind: a defender covers the inside once
                if (ahead < 0 - 3) {
                    if (Math.abs(side) < 4) {
                        if (caDefT[c] <= 0 - 3) {
                            if (worst > 0.002) {
                                if (Math.abs(caSpd[o]) > sp - 1) {
                                    if (def > 0.5) {
                                        if (noPass < 1) {
                                            caDefO[c] = wsign * (w - 2.4);
                                            caDefT[c] = 1.2 + 1.8 * def;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        o = o + 1;
    }
    if (raceState == ST_FORM) {
        if (caFormD[c] > NSEG * segStep * 0.75) {
            formDist(c);
            if (oBox < 260) { tgtOff = 0; }
            if (oBox < 40) { tgtOff = caGOff[c]; }
        }
    }
    // v3.0: a blue flag - lift and move off the line for the car lapping us
    if (caBlue[c] > 0) {
        let lb = caBlueBy[c];
        tgtOff = (caOff[lb] >= caOff[c] ? 0 - 1 : 1) * (w - 2.2);
        vlim = vlim * 0.94;
    }
    // v3.0: a mistake of the second kind - running wide out of the corner
    if (caMisT[c] > 0) { if (caMisK[c] == 2) { tgtOff = 0 - wsign * (w - 0.6); } }
    // v3.0: a retired car pulls off to the nearer side and stops
    if (caDNF[c] > 0) {
        // (it rolls - there is no power - and brakes once it is off the road)
        tgtOff = (caOff[c] >= 0 ? 1 : 0 - 1) * (w + 2.5);
        vlim = sp - 0.5;
        if (Math.abs(caOff[c]) > w + 0.8) { vlim = sp - 3; }
        if (vlim < 0) { vlim = 0; }
        if (sp < 1.2) { caHold[c] = 1; }
    }
    let offT = caSurf[c] >= 2 ? 1 : 0;
    if (caSurf[c] == 6) { offT = 0; }
    if (offT > 0) { if (caDNF[c] < 1) { tgtOff = 0; } }
    let lim = w - 1.3;
    if (caDNF[c] > 0) { lim = w + 3; }
    if (tgtOff > lim) { tgtOff = lim; }
    if (tgtOff < 0 - lim) { tgtOff = 0 - lim; }

    // ---- v7 pit stops: into the lane on the left, 80 km/h, stop at the box ----
    if (inPit > 0) {
        let dIn = mod(pitA - s, NSEG);
        let inZone = sgPit[s];
        if (inPit <= 2) {
            if (inZone > 0) {
                tgtOff = 0 - (w + sgRWL[s] * 0.5);
                if (vlim > PITV - 1) { vlim = PITV - 1; }
                if (inPit == 2) {
                    let db = mod(caBox[c] - s, NSEG) * segStep - caU[c] * segStep;
                    if (db < 120) {
                        let vb = 2 + Math.sqrt(2 * 9 * Math.max(0, db));
                        if (vb < vlim) { vlim = vb; }
                    }
                }
            } else if (dIn < 30) {
                // slow for the limiter line and drift over to the left
                let vb = Math.sqrt(PITV * PITV + 2 * 14 * dIn * segStep);
                if (vb < vlim) { vlim = vb; }
                if (dIn < 6) { tgtOff = 0 - (w - 1.2); }
            }
        } else if (inPit == 4) {
            if (inZone > 0) {
                let dOut = mod(pitE - s, NSEG);
                tgtOff = 0 - (w + sgRWL[s] * 0.5);
                if (dOut < 5) { tgtOff = 0 - (w - 1.5); }
                if (vlim > PITV - 1) { vlim = PITV - 1; }
            }
        }
    }

    // ---- v7 safety car: queue behind the car ahead, nose to tail ----
    if (scOn > 0) {
        if (isSC < 1) {
            if (inPit == 0) {
                let r = caRank[c];
                let a = 0;
                let j = r - 1;
                while (j >= 1) {
                    let q = srtI[j];
                    if (caPit[q] == 0) { a = q; j = 0; }
                    j = j - 1;
                }
                if (a < 1) { if (scCar > 0) { a = GHOST; } }
                if (a > 0) {
                    trackGap(c, a);
                    if (oGap < 130) {
                        let vq = Math.abs(caSpd[a]) + (oGap - 13) * 0.35;
                        if (vq < 0) { vq = 0; }
                        if (vq < vlim) { vlim = vq; }
                    } else if (vlim > aiVlim[c] * 0.85) { vlim = aiVlim[c] * 0.85; }
                } else if (scOn == 3) {
                    // the leader holds the pack until the line
                    if (vlim > aiVlim[c] * 0.62) { vlim = aiVlim[c] * 0.62; }
                }
            }
        }
    }

    // ---- aim point ----
    // Aim point. A chord to a point d metres ahead of a corner of radius R
    // cuts inside the arc by about d*d/(8R), so a far aim point simply drives
    // the car off the inside of a tight corner. Cap d so that sag stays on
    // the road, which is what keeps the AI between the white lines at all.
    // (v4.0: in metres, and between rings: at 15 m a ring either way is a
    // big step in where the car points)
    let da = (3 + Math.floor(sp * 0.13)) * AIREF;
    if (da > 14 * AIREF) { da = 14 * AIREF; }
    if (nearCv > 0.0003) {
        let dm = Math.floor(Math.sqrt(14 / nearCv) / AIREF) * AIREF;
        if (dm < 2 * AIREF) { dm = 2 * AIREF; }
        if (da > dm) { da = dm; }
    }
    let af = caU[c] + da / segStep;
    let ak = Math.floor(af);
    let afr = af - ak;
    let ti = mod(s - 1 + ak, NSEG) + 1;
    let tj = mod(ti, NSEG) + 1;
    let tx = sgX[ti] + sgNX[ti] * tgtOff + (sgX[tj] + sgNX[tj] * tgtOff - sgX[ti] - sgNX[ti] * tgtOff) * afr;
    let tz = sgZ[ti] + sgNZ[ti] * tgtOff + (sgZ[tj] + sgNZ[tj] * tgtOff - sgZ[ti] - sgNZ[ti] * tgtOff) * afr;
    atan2d(tx - caX[c], tz - caZ[c]);
    wrapAng(oAtan - caYaw[c]);
    // steer on where the nose will be a moment from now, not where it is:
    // the car's yaw now lags the wheel, and without this lead the driver
    // overshoots every change of direction
    let err = oWrap - caYR[c] * AILEAD;

    // ---- stuck / spun recovery ----
    if (sp < 2.2) { if (caHold[c] < 1) { caStuck[c] = caStuck[c] + dt; } } else { caStuck[c] = 0; }
    // v3.1: pinned against a wall (reversing gets it nowhere, and it is not
    // off the road, so checkRecovery never helps): after 6 s of going
    // nowhere in the race it is put back on the road and sent on its way
    let pinned = 0;
    // (v3.3: scraping along a wall at walking pace counts too)
    if (sp < 4.5) { if (raceState == ST_RACE) { if (caHold[c] < 1) { if (caPit[c] == 0) { if (caDNF[c] < 1) { if (caFin[c] < 1) { pinned = 1; } } } } } }
    // (leaving the pits it gets longer: the lane can queue behind a stop)
    let lim6 = 6;
    if (sp < 2.5) { if (raceState == ST_RACE) { if (caHold[c] < 1) { if (caPit[c] == 4) { pinned = 1; lim6 = 15; } } } }
    if (pinned > 0) { caStkT[c] = caStkT[c] + dt; } else if (sp > 8) { caStkT[c] = 0; }
    if (caStkT[c] > lim6) { if (caPit[c] == 4) { caPit[c] = 0; caLim[c] = 0; } aiRescue(c); }
    if (caStuck[c] > 1.6) {
        caThr[c] = 0;
        caBrk[c] = 1;
        caSteer[c] = err > 0 ? 0 - 1 : 1;
        caHB[c] = 0;
        if (caStuck[c] > 3.4) { caStuck[c] = 0; }
    } else if (Math.abs(err) > 108) {
        caThr[c] = 0;
        caBrk[c] = 1;
        caSteer[c] = err > 0 ? 0 - 1 : 1;
        caHB[c] = 0;
    } else {
        // never ask for more lock than the corner needs: the geometric angle
        // for its radius plus the slip where the front tyres peak. Beyond that
        // the fronts only slide and the car turns less, not more.
        let lockMx = 30 - 22 * Math.min(1, sp / 42);
        let need = (2.6 * nearCv * 57.3 + SLIPPK * 1.25) / lockMx;
        if (need > 1) { need = 1; }
        if (need < 0.35) { need = 0.35; }
        caSteer[c] = err / (11 + sp * 0.16);
        if (caSteer[c] > need) { caSteer[c] = need; }
        if (caSteer[c] < 0 - need) { caSteer[c] = 0 - need; }
        let vmax = vlim;
        if (offT > 0) { vmax = vmax * 0.82; }
        if (sp < vmax - 1.2) {
            caThr[c] = 1; caBrk[c] = 0;
            // v3.0 lift and coast: short of fuel, it rolls into the braking
            // zone off the throttle instead of accelerating up to it
            // (v3.3: only at speed, into a braking zone - below that it used
            // to leave a slow car crawling through a slow section for good)
            if (caLC[c] > 0) { if (sp > 28) { if (vmax < sp + 9) { if (worst > 0.002) { caThr[c] = 0; } } } }
        }
        else if (sp > vmax + 1.0) { caThr[c] = 0; caBrk[c] = Math.min(1, (sp - vmax) / 2.2); }
        else { caThr[c] = 0.45; caBrk[c] = 0; }
        // a flick of handbrake in the very tightest stuff
        caHB[c] = 0;
        // (no handbrake: with the rear grip it now leaves, it only spins them)
    }
    // ---- v7 ERS: on the straights, when attacking or defending, or when full ----
    caErsOn[c] = 0;
    if (rules == R_SIM) {
        if (isSC < 1) {
            if (caErs[c] > 0.2) {
                if (sp > 35) {
                    if (nearCv < 0.0015) {
                        if (caThr[c] > 0.9) {
                            if (noPass < 1) {
                                let use = 0;
                                if (sgDRS[s] > 0) { use = 1; }
                                if (caErs[c] > 0.80 - 0.25 * agg) { use = 1; }
                                if (caDefT[c] > 0) { use = 1; }
                                if (caTow[c] > 0.3) { use = 1; }
                                caErsOn[c] = use;
                            }
                        }
                    }
                }
            }
        }
    }
    if (raceState == ST_COUNT) { caThr[c] = 0; caBrk[c] = 1; caSteer[c] = 0; caHB[c] = 0; }
    if (caFormOk[c] > 0) { if (raceState == ST_FORM) { caThr[c] = 0; caBrk[c] = 1; caSteer[c] = 0; } }
    if (caDNF[c] > 0) { caErsOn[c] = 0; if (caHold[c] > 0) { caThr[c] = 0; caBrk[c] = 1; caSteer[c] = 0; } }
    if (caFin[c] > 0) { caThr[c] = caThr[c] * 0.5; }
}

// v3.1: back onto the road, pointing the right way, rolling
function aiRescue(c) {
    let s = caSeg[c];
    let w = sgW[s];
    let off = caOff[c] * 0.3;
    if (off > w - 2.5) { off = w - 2.5; }
    if (off < 0 - (w - 2.5)) { off = 0 - (w - 2.5); }
    caX[c] = sgX[s] + sgNX[s] * off;
    caZ[c] = sgZ[s] + sgNZ[s] * off;
    caY[c] = sgY[s];
    atan2d(sgDX[s], sgDZ[s]);
    caYaw[c] = oAtan;
    caVX[c] = sgDX[s] * 6;
    caVZ[c] = sgDZ[s] * 6;
    caVY[c] = 0; caYR[c] = 0; caAir[c] = 0; caOffT[c] = 0;
    caSteer[c] = 0;
    caStuck[c] = 0;
    caStkT[c] = 0;
}


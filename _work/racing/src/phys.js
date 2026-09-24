// ============================================================
// phys.js - vehicle model.
// A bicycle model with separate front/rear tyre slip, so the car's heading
// and its direction of travel are genuinely independent: longitudinal and
// lateral inertia, grip limits per surface, handbrake oversteer, drift.
// ============================================================
const WBF = 1.30;          // front axle ahead of the centre of mass
const WBR = 1.30;          // rear axle behind it
const RAD = 57.2957795;
const GRAV = 24;
const REVMAX = 16;
const GRIP0 = 15.5;         // mechanical lateral grip, m/s^2
const AERO = 0.0019;        // downforce: extra grip per (m/s)^2
const SLIPPK = 7.5;         // slip angle where a tyre peaks, degrees
const YAWK = 1.0;           // inverse yaw inertia

let nCars = NCAR;
let wx = 1;                 // weather: 1 dry, 2 rain
let wetK = 1;               // grip multiplier for the weather (AI plans with it too)
let shakeT = 0;
let shakeA = 0;
let driftScore = 0;
let driftCombo = 1;
let driftHold = 0;
let driftNow = 0;
let smokeHead = 0;   // round-robin slot used once the pool is full
let smN = 0;           // live tyre-smoke puffs, packed into slots 1..smN
let lastHit = 0;

function addShake(a) {
    if (a > shakeA) { shakeA = a; }
    shakeT = 0.34;
}

// spawn one puff of tyre smoke at a wheel
function emitSmoke(x, y, z, seg) {
    if (smN < NSMOKE) { smN = smN + 1; smokeHead = smN; }
    else { smokeHead = mod(smokeHead, NSMOKE) + 1; }
    smX[smokeHead] = x + rand(0 - 0.4, 0.4);
    smY[smokeHead] = y + 0.15;
    smZ[smokeHead] = z + rand(0 - 0.4, 0.4);
    smL[smokeHead] = 1;
    smS[smokeHead] = 0.34;
    smSeg[smokeHead] = seg;
}

function stepSmoke() {
    let k = 1;
    while (k <= smN) {
        smL[k] = smL[k] - dt * 0.85;
        if (smL[k] <= 0) {
            // dead: pull the last live puff into this slot and shrink the run
            smX[k] = smX[smN]; smY[k] = smY[smN]; smZ[k] = smZ[smN];
            smL[k] = smL[smN]; smS[k] = smS[smN]; smSeg[k] = smSeg[smN];
            smN = smN - 1;
        } else {
            smY[k] = smY[k] + dt * 0.9;
            smS[k] = smS[k] + dt * 1.15;
            k = k + 1;
        }
    }
}

// lay a tyre mark in the current segment (stored as a lateral band so the
// renderer can interpolate it from the road quad it already projected)
function addMark(seg, off, u, strength) {
    let w = sgW[seg];
    let t = (off + w) / (2 * w);
    if (t > 0.02) {
        if (t < 0.98) {
            let n = mkN[seg];
            if (n < MKS) { n = n + 1; mkN[seg] = n; }
            let s = (seg - 1) * MKS + n;
            let hw = 0.45 / (2 * w);
            mkX1[s] = t - hw;
            mkX2[s] = t + hw;
            mkZ1[s] = t - hw;
            mkZ2[s] = t + hw;
            mkY[s] = u;
            let a = Math.floor(3 - strength * 3);
            if (a < 0) { a = 0; }
            if (a > 3) { a = 3; }
            mkA[s] = a;
        }
    }
}

// ---- one car, one step --------------------------------------------------
function carPhys(c) {
    let yaw = caYaw[c];
    let fx = sind(yaw);
    let fz = cosd(yaw);
    let rx = fz;
    let rz = 0 - fx;
    let vx = caVX[c];
    let vz = caVZ[c];
    let vLong = vx * fx + vz * fz;
    let vLat = vx * rx + vz * rz;
    let sp = Math.sqrt(vx * vx + vz * vz);

    // ---- surface under the car (from the previous step's sample) ----
    let surf = caSurf[c];
    let gripMul = 1;
    let rollRes = 0.020;
    let topMul = 1;
    if (surf == 1) { gripMul = 0.88; rollRes = 0.09; topMul = 0.95; }
    else if (surf == 4) { gripMul = 0.42; rollRes = 0.85; topMul = 0.32; }    // gravel trap
    else if (surf == 5) { gripMul = 0.84; rollRes = 0.22; topMul = 0.55; }    // abrasive tarmac run-off
    else if (surf == 6) { }                                                     // v7: pit lane, plain tarmac
    else if (surf >= 2) { gripMul = 0.52; rollRes = 0.30; topMul = 0.55; }    // grass
    // v8 setup: a stiff car is worse over curbs and off the tarmac, a soft one better
    if (surf != 0) { if (surf != 6) { gripMul = gripMul * (1 - 0.04 * caSusp[c]); } }
    if (caAir[c] > 0) { gripMul = 0; rollRes = 0.004; }

    // ---- longitudinal ----
    // slipstream (up to 40 m behind another car) and an open DRS flap both
    // cut drag: a higher top speed and a harder pull towards it
    let tow = caTow[c];
    let drs = caDRS[c];
    let top = caTop[c] * topMul * (1 + 0.035 * tow + 0.05 * drs + 0.02 * caErsOn[c]);
    // v7: the pit lane limiter
    if (caLim[c] > 0) { if (top > PITV) { top = PITV; } }
    let acc = 0;
    if (caHold[c] > 0) {
        // held on the grid: no drive, no roll-back
        vLong = 0;
        vLat = 0;
    } else if (caAir[c] == 0) {
        if (caThr[c] > 0) {
            let f = 1;
            if (vLong > 0) { f = 1 - vLong / top; }
            if (f < 0) { f = 0; }
            acc = caAcc[c] * caThr[c] * (0.18 + 0.82 * f * (0.45 + 0.55 * f));
            // v7: ERS boost
            acc = acc + ERS_ACC * caErsOn[c] * caThr[c] * (f > 0 ? 1 : 0);
        }
        if (caBrk[c] > 0) {
            if (vLong > 0.6) { acc = acc - 34 * caBrk[c] * caBrkK[c]; }
            else { acc = acc - caAcc[c] * 0.55 * caBrk[c]; }
        }
        if (caHB[c] > 0) { acc = acc - 9 * (vLong > 0 ? 1 : 0 - 1); }
    }
    if (caHold[c] > 0) { acc = 0; rollRes = 0; }
    acc = acc - vLong * Math.abs(vLong) * 0.00013 * (1 - 0.3 * tow - 0.35 * drs) - vLong * rollRes;
    vLong = vLong + acc * dt;
    // quoted top speed is a hard limiter on the ground; in the air you keep what you had
    if (caAir[c] == 0) { if (vLong > top) { vLong = top; } }
    if (vLong < 0 - REVMAX) { vLong = 0 - REVMAX; }

    // ---- steering: sensitivity drops as speed rises ----
    let spA = Math.abs(vLong);
    // lock tapers towards the slip angle where the tyres peak, so more lock
    // than they can use is not on offer at speed
    let maxSteer = 30 - 22 * Math.min(1, spA / 42);
    let steer = caSteer[c] * maxSteer;

    // ---- tyre grip ----
    // Total lateral grip in m/s^2: mechanical grip plus downforce that grows
    // with the square of speed, so a fast sweeper can be taken flat while a
    // hairpin cannot. The two axles share it.
    // v7: caWK is the weather (arcade) or the tyre on this track (realistic);
    // damage costs downforce
    let dmg = caDmg[c];
    let mu = caGrip[c] * gripMul * caWK[c] * (GRIP0 + AERO * caAeroK[c] * spA * spA * (1 - 0.25 * drs) * (1 - 0.35 * dmg));
    // friction circle: tyres that are braking hard have less left for turning
    if (caBrk[c] > 0) { if (vLong > 0.6) { mu = mu * (1 - 0.40 * caBrk[c]); } }
    if (caAir[c] == 0) { if (caThr[c] > 0.9) { if (spA < 30) { mu = mu * 0.94; } } }
    let vRef = spA;
    if (vRef < 1.4) { vRef = 1.4; }
    let yrRad = caYR[c] / RAD;
    atan2d(vLat + yrRad * WBF, vRef);
    let slipF = oAtan - steer;
    atan2d(vLat - yrRad * WBR, vRef);
    let slipR = oAtan;
    let gripF = mu * 0.50 * (1 - 0.28 * dmg);
    if (caWing[c] > 0) { gripF = gripF * 0.86; }
    let gripR = mu * 0.53;
    // v8 setup: brake bias forward steadies the rear on the brakes and costs turn-in
    if (caBrk[c] > 0.1) { if (vLong > 0.6) { gripF = gripF * (1 - 0.025 * caBias[c]); gripR = gripR * (1 + 0.025 * caBias[c]); } }
    if (caHB[c] > 0) { gripR = mu * 0.16; }
    if (caThr[c] > 0.9) { if (spA < 22) { gripR = gripR * 0.86; } }   // power oversteer
    // Past its peak slip a tyre slides and gives less, not more: overdriving a
    // corner washes the nose wide instead of pulling the car round.
    let aF = Math.abs(slipF);
    if (aF > SLIPPK) { gripF = gripF * (1 - 0.20 * Math.min(1, (aF - SLIPPK) / 20)); }
    let aR = Math.abs(slipR);
    if (aR > SLIPPK) { gripR = gripR * (1 - 0.16 * Math.min(1, (aR - SLIPPK) / 20)); }
    let Ff = 0 - (gripF / SLIPPK) * slipF;
    if (Ff > gripF) { Ff = gripF; }
    if (Ff < 0 - gripF) { Ff = 0 - gripF; }
    let Fr = 0 - (gripR / (SLIPPK + 1)) * slipR;
    if (Fr > gripR) { Fr = gripR; }
    if (Fr < 0 - gripR) { Fr = 0 - gripR; }
    let cs = cosd(steer);
    let aLat = Ff * cs + Fr;
    let yawAcc = (WBF * Ff * cs - WBR * Fr) * YAWK * RAD;
    vLat = vLat + aLat * dt;
    // the steered front tyre also pulls backwards: cornering scrubs speed
    if (caAir[c] == 0) { vLong = vLong - Ff * sind(steer) * dt; }
    caYR[c] = caYR[c] + yawAcc * dt;
    caYR[c] = caYR[c] - caYR[c] * Math.min(0.5, 1.6 * dt);

    // ---- low speed: fall back to the kinematic model ----
    let bl = 1;
    if (sp < 4) {
        bl = sp / 4;
        let kin = vLong * tand(steer) / (WBF + WBR) * RAD;
        caYR[c] = caYR[c] * bl + kin * (1 - bl);
        vLat = vLat * bl;
    }
    if (caAir[c] > 0) { caYR[c] = caYR[c] * 0.985; vLat = vLat * 0.995; }

    // ---- integrate ----
    // The velocity is put back into the world on the axes it was measured on.
    // Turning the car does not turn its momentum - only the tyres can do
    // that, and they can only do it as hard as their grip allows. (At a crawl
    // the kinematic model above still steers the momentum directly.)
    let dyaw = caYR[c] * dt;
    caYaw[c] = caYaw[c] + dyaw;
    wrapAng(caYaw[c]);
    caYaw[c] = oWrap;
    let vyaw = yaw + dyaw * (1 - bl);
    fx = sind(vyaw);
    fz = cosd(vyaw);
    rx = fz;
    rz = 0 - fx;
    caVX[c] = fx * vLong + rx * vLat;
    caVZ[c] = fz * vLong + rz * vLat;
    fx = sind(caYaw[c]);
    fz = cosd(caYaw[c]);
    caX[c] = caX[c] + caVX[c] * dt;
    caZ[c] = caZ[c] + caVZ[c] * dt;
    caSpd[c] = vLong;

    // ---- drift bookkeeping ----
    let da = 0;
    if (sp > 6) {
        atan2d(vLat, vLong > 0 ? vLong : 0.001);
        da = Math.abs(oAtan);
        if (da > 90) { da = 0; }
    }
    caDrift[c] = da;
    // v7: tyre wear and the ERS store (realistic); brake heat for the glow
    if (rules == R_SIM) { if (caHold[c] < 1) { simCarStep(c, aLat, mu, da); } }
    let ht = caHeat[c] + (caBrk[c] * spA * 0.028 - 0.30) * dt;
    if (ht < 0) { ht = 0; }
    if (ht > 1) { ht = 1; }
    caHeat[c] = ht;

    // ---- vertical ----
    sampleTrack(caX[c], caZ[c], caSeg[c]);
    caSeg[c] = sfSeg;
    caU[c] = sfU;
    caOff[c] = sfT;
    caSurf[c] = sfSurf;
    let gy = sfY;
    if (caAir[c] > 0) {
        caVY[c] = caVY[c] - GRAV * dt;
        caY[c] = caY[c] + caVY[c] * dt;
        if (caY[c] <= gy) {
            caY[c] = gy;
            if (caVY[c] < 0 - 6) { if (c == 1) { addShake(Math.min(7, 0 - caVY[c] * 0.4)); } sparkBurst(caX[c], caY[c], caZ[c], caVX[c], caVZ[c], caSeg[c], 6); }
            caVY[c] = 0;
            caAir[c] = 0;
        }
    } else {
        let climb = gy - caY[c];
        if (climb < 0 - 0.22) {
            if (spA > 8) { caAir[c] = 1; }
            else { caY[c] = gy; caVY[c] = 0; }
        } else {
            caVY[c] = climb / dt;
            caY[c] = gy;
            if (caVY[c] > 5) { caVY[c] = 5; }
        }
    }

    // ---- barriers ----
    if (sgHW[caSeg[c]] > 0) {
        let lim = sgW[caSeg[c]] - 0.85;
        let off = caOff[c];
        let hit = 0;
        if (off > lim) { hit = off - lim; }
        else if (off < 0 - lim) { hit = off + lim; }
        if (hit != 0) {
            let s = caSeg[c];
            caX[c] = caX[c] - sgNX[s] * hit;
            caZ[c] = caZ[c] - sgNZ[s] * hit;
            let vn = caVX[c] * sgNX[s] + caVZ[c] * sgNZ[s];
            // v7: a real hit damages the car (realistic) and throws sparks
            let avn = Math.abs(vn);
            if (avn > 6) { addDamage(c, (avn - 6) * 0.075); }
            if (avn > 2.5) { sparkBurst(caX[c] + sgNX[s] * (hit > 0 ? 0.9 : 0 - 0.9), caY[c], caZ[c] + sgNZ[s] * (hit > 0 ? 0.9 : 0 - 0.9), caVX[c], caVZ[c], s, 3); }
            caVX[c] = caVX[c] - sgNX[s] * vn * 1.35;
            caVZ[c] = caVZ[c] - sgNZ[s] * vn * 1.35;
            // scraping the wall costs speed, and a real hit costs a lot of it,
            // so riding the barriers round a corner is never the quick way
            let loss = 0.84;
            if (Math.abs(vn) > 5) { loss = 0.66; }
            caVX[c] = caVX[c] * loss;
            caVZ[c] = caVZ[c] * loss;
            caYR[c] = caYR[c] * 0.4;
            if (c == 1) {
                if (Math.abs(vn) > 3) { addShake(Math.min(9, Math.abs(vn) * 0.7)); lastHit = gt; }
            }
        }
    } else if (sfSurf == 3) {
        // fell off the world: creep back toward the tarmac
        let s = caSeg[c];
        let over = Math.abs(caOff[c]) - sgW[s] - GRASSW;
        let sgn = caOff[c] > 0 ? 1 : 0 - 1;
        caX[c] = caX[c] - sgNX[s] * over * sgn;
        caZ[c] = caZ[c] - sgNZ[s] * over * sgn;
        caVX[c] = caVX[c] * 0.5;
        caVZ[c] = caVZ[c] * 0.5;
    }

    // ---- body attitude (visual) ----
    let tgtRoll = 0 - aLat * 0.16 - sgBank[caSeg[c]] * 0.9;
    let tgtPitch = acc * 0.10;
    if (caAir[c] > 0) { tgtPitch = caVY[c] * 0.5; tgtRoll = 0; }
    if (tgtRoll > 9) { tgtRoll = 9; }
    if (tgtRoll < 0 - 9) { tgtRoll = 0 - 9; }
    if (tgtPitch > 7) { tgtPitch = 7; }
    if (tgtPitch < 0 - 7) { tgtPitch = 0 - 7; }
    let kk = 5 * dt / (1 + 5 * dt);
    caRoll[c] = caRoll[c] + (tgtRoll - caRoll[c]) * kk;
    caPitch[c] = caPitch[c] + (tgtPitch - caPitch[c]) * kk;

    // ---- smoke and marks when the tyres are past their limit ----
    let slipping = 0;
    if (caAir[c] == 0) {
        if (caHB[c] > 0) { if (sp > 5) { slipping = 1; } }
        if (da > 14) { if (sp > 11) { slipping = 1; } }
        if (caSurf[c] >= 2) { if (caSurf[c] != 5) { if (sp > 7) { slipping = 1; } } }
    }
    if (slipping > 0) {
        if (mod(frameId, 2) < 1) {
            emitSmoke(caX[c] - fx * 1.7, caY[c], caZ[c] - fz * 1.7, caSeg[c]);
        }
        if (wetL < 0.3) { addMark(caSeg[c], caOff[c], caU[c], Math.min(1, da / 35 + caHB[c] * 0.5)); }
    } else if (wetL > 0.45) {
        // rain: a plume of spray off the rear tyres at speed, only for the
        // cars near enough to the camera to see it
        if (sp > 20) {
            if (mod(frameId + c, 3) < 1) {
                let ddx = caX[c] - camX;
                let ddz = caZ[c] - camZ;
                if (ddx * ddx + ddz * ddz < 14400) {
                    emitSmoke(caX[c] - fx * 2.6, caY[c] + 0.2, caZ[c] - fz * 2.6, caSeg[c]);
                }
            }
        }
    }
}

// ---- v7: sparks off the plank and the skid blocks ------------------------------
// At racing speed over a dip or a crest the floor touches down; a car that has
// lost its front wing scrapes the nose. Only for cars close to the camera.
function carSparks(c) {
    let sp = Math.abs(caSpd[c]);
    if (sp > 20) {
        let ddx = caX[c] - camX;
        let ddz = caZ[c] - camZ;
        if (ddx * ddx + ddz * ddz < 6400) {
            let s = caSeg[c];
            let p = mod(s - 2 + NSEG, NSEG) + 1;
            let q = mod(s, NSEG) + 1;
            let bend = (sgY[q] - sgY[s]) - (sgY[s] - sgY[p]);
            let ch = 0;
            if (sp > 58) { ch = 0.10; }
            if (bend > 0.03) { if (sp > 45) { ch = 0.7; } }
            if (caWing[c] > 0) { ch = ch + 0.35; }
            if (rand(0.0001, 0.9999) < ch) {
                let fx = sind(caYaw[c]);
                let fz = cosd(caYaw[c]);
                let ofs = 0 - 1.6;
                if (caWing[c] > 0) { ofs = 2.3; }
                sparkBurst(caX[c] + fx * ofs, caY[c] + 0.05, caZ[c] + fz * ofs, caVX[c], caVZ[c], s, 2);
            }
        }
    }
}

// ---- car vs car ---------------------------------------------------------
// Each pair is tested as two long boxes, not circles: an open-wheeler is
// 5.2 m long and 2 m wide, so a circle either lets noses pass through gearboxes
// or keeps side-by-side cars a car's width apart. The overlap is measured in
// car a's frame and pushed out along whichever axis is shallower.
const CLEN = 4.9;           // centre-to-centre distance where two cars touch nose to tail
const CWID = 1.95;          // ...and side by side
function carCollisions() {
    let a = 1;
    while (a < nCars) {
        let fx = sind(caYaw[a]);
        let fz = cosd(caYaw[a]);
        let b = a + 1;
        while (b <= nCars) {
            let dx = caX[b] - caX[a];
            let dz = caZ[b] - caZ[a];
            if (dx * dx + dz * dz < 30) {
                let lon = dx * fx + dz * fz;
                let lat = dx * fz - dz * fx;
                let pl = CLEN - Math.abs(lon);
                let pw = CWID - Math.abs(lat);
                if (pl > 0) {
                    if (pw > 0) {
                        // push direction in the world
                        let nx = fz;
                        let nz = 0 - fx;
                        let pen = pw;
                        if (lat < 0) { nx = 0 - fz; nz = fx; }
                        if (pl < pw) {
                            pen = pl;
                            nx = fx; nz = fz;
                            if (lon < 0) { nx = 0 - fx; nz = 0 - fz; }
                        }
                        pen = pen * 0.5;
                        caX[a] = caX[a] - nx * pen;
                        caZ[a] = caZ[a] - nz * pen;
                        caX[b] = caX[b] + nx * pen;
                        caZ[b] = caZ[b] + nz * pen;
                        let rel = (caVX[b] - caVX[a]) * nx + (caVZ[b] - caVZ[a]) * nz;
                        if (rel < 0) {
                            // v7: a hard nose-to-tail hit breaks the front wing of
                            // the car behind; a side touch costs both a little
                            let hv = 0 - rel;
                            if (pl < pw) {
                                if (hv > 4.5) {
                                    if (lon > 0) { addDamage(a, (hv - 4.5) * 0.09); }
                                    else { addDamage(b, (hv - 4.5) * 0.09); }
                                }
                            } else if (hv > 6) {
                                addDamage(a, (hv - 6) * 0.03);
                                addDamage(b, (hv - 6) * 0.03);
                            }
                            if (hv > 2.5) { sparkBurst((caX[a] + caX[b]) / 2, (caY[a] + caY[b]) / 2 + 0.2, (caZ[a] + caZ[b]) / 2, caVX[a], caVZ[a], caSeg[a], 3); }
                            let j = rel * 0.75;
                            caVX[a] = caVX[a] + nx * j;
                            caVZ[a] = caVZ[a] + nz * j;
                            caVX[b] = caVX[b] - nx * j;
                            caVZ[b] = caVZ[b] - nz * j;
                            // a touch unsettles both cars a little
                            caYR[a] = caYR[a] + rel * 1.4 * (lat > 0 ? 1 : 0 - 1);
                            caYR[b] = caYR[b] - rel * 1.4 * (lat > 0 ? 1 : 0 - 1);
                            if (a == 1) { addShake(Math.min(6, Math.abs(rel) * 0.45)); }
                            if (b == 1) { addShake(Math.min(6, Math.abs(rel) * 0.45)); }
                        }
                    }
                }
            }
            b = b + 1;
        }
        a = a + 1;
    }
}

// ---- slipstream, once a frame --------------------------------------------
// How much tow each car gets from whatever is in front of it: full right
// behind another car, fading to nothing 40 m back or 2.4 m off its line.
function updateTow() {
    let c = 1;
    while (c <= nCars) {
        let fx = sind(caYaw[c]);
        let fz = cosd(caYaw[c]);
        let tw = 0;
        let o = 1;
        while (o <= nCars) {
            if (o != c) {
                let dx = caX[o] - caX[c];
                let dz = caZ[o] - caZ[c];
                let ahead = dx * fx + dz * fz;
                if (ahead > 4) {
                    if (ahead < 40) {
                        let side = Math.abs(dx * fz - dz * fx);
                        if (side < 2.4) {
                            let t = (1 - ahead / 40) * (1 - side / 2.4 * 0.5);
                            if (t > tw) { tw = t; }
                        }
                    }
                }
            }
            o = o + 1;
        }
        if (Math.abs(caSpd[c]) < 25) { tw = 0; }
        caTow[c] = caTow[c] + (tw - caTow[c]) * Math.min(1, dt * 2.5);
        c = c + 1;
    }
}

// ---- player drift scoring ----------------------------------------------
function scoreDrift() {
    let d = caDrift[1];
    let sp = Math.sqrt(caVX[1] * caVX[1] + caVZ[1] * caVZ[1]);
    driftNow = 0;
    if (d > 11) {
        if (sp > 11) {
            if (caSurf[1] < 2) {
                driftNow = 1;
                driftHold = 0.65;
                driftScore = driftScore + d * sp * dt * 0.09 * driftCombo;
                if (driftCombo < 6) { driftCombo = driftCombo + dt * 0.30; }
            }
        }
    }
    if (driftNow == 0) {
        driftHold = driftHold - dt;
        if (driftHold <= 0) { driftCombo = 1; }
    }
}

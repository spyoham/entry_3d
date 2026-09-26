// ============================================================
// fx.js - v7 presentation, only on the higher graphics levels:
//   HIGH : replay with trackside TV cameras, sparks, see-through smoke/spray
//   ULTRA: + glowing brake discs, the afternoon turning to dusk, debris
// Nothing here changes how the race is run.
// ============================================================
let spN = 0;                // live sparks, packed into slots 1..spN
let todDone = 0 - 1;

// ---- sparks and debris -------------------------------------------------------
// n sparks at (x, y, z) thrown along with a car's velocity; kind 1 is a spark
// (short-lived, bright), 2 a piece of carbon (tumbles further, dark)
function sparkBurst(x, y, z, vx, vz, seg, n) {
    if (gfx > 1) {
        let k = 0;
        while (k < n) {
            if (spN < NSPK) {
                spN = spN + 1;
                spX[spN] = x; spY[spN] = y; spZ[spN] = z;
                spVX[spN] = vx * 0.55 + rand(0 - 3.99, 3.99);
                spVY[spN] = rand(1.5, 4.5);
                spVZ[spN] = vz * 0.55 + rand(0 - 3.99, 3.99);
                spL[spN] = rand(0.25, 0.45);
                spSeg[spN] = seg;
                spC[spN] = 1;
            }
            k = k + 1;
        }
    }
}

function debris(c) {
    if (gfx > 2) {
        let k = 0;
        while (k < 6) {
            if (spN < NSPK) {
                spN = spN + 1;
                spX[spN] = caX[c]; spY[spN] = caY[c] + 0.3; spZ[spN] = caZ[c];
                spVX[spN] = caVX[c] * 0.7 + rand(0 - 5.99, 5.99);
                spVY[spN] = rand(2.01, 5.99);
                spVZ[spN] = caVZ[c] * 0.7 + rand(0 - 5.99, 5.99);
                spL[spN] = rand(1.0, 1.6);
                spSeg[spN] = caSeg[c];
                spC[spN] = 2;
            }
            k = k + 1;
        }
    }
}

function stepSparks() {
    let k = 1;
    while (k <= spN) {
        spL[k] = spL[k] - dt;
        if (spL[k] <= 0) {
            spX[k] = spX[spN]; spY[k] = spY[spN]; spZ[k] = spZ[spN];
            spVX[k] = spVX[spN]; spVY[k] = spVY[spN]; spVZ[k] = spVZ[spN];
            spL[k] = spL[spN]; spSeg[k] = spSeg[spN]; spC[k] = spC[spN];
            spN = spN - 1;
        } else {
            spVY[k] = spVY[k] - 14 * dt;
            spX[k] = spX[k] + spVX[k] * dt;
            spY[k] = spY[k] + spVY[k] * dt;
            spZ[k] = spZ[k] + spVZ[k] * dt;
            // keep them filed under the ring they are over, for the painter
            sampleTrack(spX[k], spZ[k], spSeg[k]);
            spSeg[k] = sfSeg;
            if (spY[k] < sfY) { spY[k] = sfY; spVY[k] = 0 - spVY[k] * 0.3; spVX[k] = spVX[k] * 0.6; spVZ[k] = spVZ[k] * 0.6; }
            k = k + 1;
        }
    }
}

// sparks are short bright streaks from where a spark is back along its path;
// debris is a small dark square
function drawSparksIn(i) {
    let k = 1;
    while (k <= spN) {
        if (spSeg[k] == i) {
            let s = SCRBASE + 3;
            let t = SCRBASE + 4;
            wvX[s] = Math.round(spX[k] * WU); wvY[s] = Math.round(spY[k] * WU); wvZ[s] = Math.round(spZ[k] * WU);
            wvX[t] = Math.round((spX[k] - spVX[k] * 0.035) * WU);
            wvY[t] = Math.round((spY[k] - spVY[k] * 0.035) * WU);
            wvZ[t] = Math.round((spZ[k] - spVZ[k] * 0.035) * WU);
            projSlots(s, t);
            if (pvZ[s] > 1.0) {
                if (pvZ[t] > 1.0) {
                    let ax = psX[s]; let ay = psY[s];
                    let bx = psX[t]; let by = psY[t];
                    if (spC[k] > 1) {
                        let r = 0.14 * camQ / pvZ[s];
                        if (r < QS) { r = QS; }
                        fill4((ax - r) / QS, (ay - r) / QS, (ax + r) / QS, (ay - r) / QS, (ax + r) / QS, (ay + r) / QS, (ax - r) / QS, (ay + r) / QS, '#1c1e24');
                    } else {
                        let dx = bx - ax;
                        let dy = by - ay;
                        let L = Math.sqrt(dx * dx + dy * dy) + 0.01;
                        let hw = 0.7 * QS;
                        let nx = (0 - dy) / L * hw;
                        let ny = dx / L * hw;
                        let tr = 60 - Math.floor(spL[k] * 12) * 10;
                        if (tr < 0) { tr = 0; }
                        if (tr != penTr) { penTr = tr; penAlpha(tr); }
                        fill4((ax + nx) / QS, (ay + ny) / QS, (bx + nx) / QS, (by + ny) / QS, (bx - nx) / QS, (by - ny) / QS, (ax - nx) / QS, (ay - ny) / QS, '#ffd06a');
                    }
                    drawnQuads = drawnQuads + 1;
                }
            }
        }
        k = k + 1;
    }
    if (penTr > 0) { penTr = 0; penAlpha(0); }
}

// ---- once a frame ---------------------------------------------------------------
function fxStep() {
    if (gfx > 1) {
        let c = 1;
        while (c <= nCars) { carSparks(c); c = c + 1; }
        if (spN > 0) { stepSparks(); }
    } else { spN = 0; }
    todStep();
}

// ---- ULTRA: the afternoon wears on --------------------------------------------------
// Over the length of the race the sky moves towards dusk (a night race only
// gets darker). The palette is rebaked in steps, not every frame.
function todReset() {
    todK = 0;
    todDone = 0;
}
function todStep() {
    if (gfx > 2) {
        let len = estLap * nLaps * 1.1;
        if (nLaps > 50) { len = 900; }
        if (raceState == ST_QUALI) { len = estLap * 6; }
        todK = raceT / len * 0.85;
        if (todK > 0.85) { todK = 0.85; }
        if (todK < 0) { todK = 0; }
        if (Math.abs(todK - atmoT) > 0.06) { refreshAtmos(); }
    } else if (atmoT > 0) { todK = 0; refreshAtmos(); }
}

// ---- replay ----------------------------------------------------------------------------
// While racing on HIGH or ULTRA every car's position is sampled every RPDT
// seconds into a ring buffer (the last RPN samples, about a minute). The
// replay plays that back, watched from trackside TV cameras by default.
let rpHead = 0;             // slot of the newest sample
let rpN = 0;                // samples held
let rpAcc = 0;
let rpT = 0;                // playback position, seconds from the oldest sample
let rpCar = 1;              // car being watched
let rpCam = 0;              // 0 TV, 1 chase, 2 onboard, 3 high
let rpPause = 0;
let rpPrev = 0;             // state to go back to
let rpGhost = 0;
let rpSC = 0;
let tvN = 0;                // cameras on this circuit
let tvK = 1;                // camera in use

function rpReset() {
    rpHead = 0;
    rpN = 0;
    rpAcc = 0;
}

function rpRec() {
    if (gfx > 1) {
        let rec = 0;
        if (raceState == ST_RACE) { rec = 1; }
        if (raceState == ST_COUNT) { rec = 1; }
        if (raceState == ST_DONE) { rec = 1; }
        if (rec > 0) {
            rpAcc = rpAcc + dt;
            if (rpAcc >= RPDT) {
                rpAcc = rpAcc - RPDT;
                if (rpAcc > RPDT) { rpAcc = 0; }
                rpHead = mod(rpHead, RPN) + 1;
                if (rpN < RPN) { rpN = rpN + 1; }
                let b = (rpHead - 1) * RPC;
                let c = 1;
                while (c <= RPC) {
                    let k = b + c;
                    let on = 0;
                    if (c <= nCars) { if (caFin[c] < 2) { on = 1; } }
                    if (c == GHOST) { if (scCar > 0) { on = 1; } if (ghostOn > 0) { on = 1; } }
                    if (on > 0) {
                        rpX[k] = caX[c]; rpY[k] = caY[c]; rpZ[k] = caZ[c];
                        rpW[k] = caYaw[c]; rpS[k] = caSeg[c]; rpV[k] = caSpd[c];
                    } else { rpS[k] = 0; }
                    c = c + 1;
                }
            }
        }
    }
}

// Trackside cameras, placed once per circuit: one every few hundred metres,
// on the outside of the corners (on the straights, either side), a few
// metres up.
function buildTvCams() {
    tvN = 0;
    let step = Math.floor(NSEG / NTV) + 1;
    if (step * segStep < 70) { step = Math.floor(70 / segStep) + 1; }
    let i = 1 + Math.floor(step / 2);
    let alt = 1;
    while (i <= NSEG) {
        if (tvN < NTV) {
            tvN = tvN + 1;
            // the bend coming up decides which side is the outside
            let cv = 0;
            let k = 0;
            while (k < 8) { cv = cv + sgCurv[mod(i - 1 + k, NSEG) + 1]; k = k + 1; }
            let side = alt;
            if (cv > 0.012) { side = 0 - 1; }
            if (cv < 0 - 0.012) { side = 1; }
            let ex = sgRWR[i];
            if (side < 0) { ex = sgRWL[i]; }
            let o = sgW[i] + ex + 5 + mod(i * 7, 5);
            if (sgHW[i] > 0) { o = sgW[i] + 3; }
            tvS[tvN] = i;
            tvO[tvN] = o * side;
            tvH[tvN] = 4 + mod(i * 13, 6);
            alt = 0 - alt;
        }
        i = i + step;
    }
}

// the camera nearest ahead of ring s
function tvFind(s) {
    let best = 1;
    let bd = NSEG + 1;
    let k = 1;
    while (k <= tvN) {
        let d = mod(tvS[k] - s, NSEG);
        if (d < bd) { bd = d; best = k; }
        k = k + 1;
    }
    tvK = best;
}

function tvCam() {
    let c = rpCar;
    let s = caSeg[c];
    // move on to the next camera once the car has gone past this one
    let d = mod(s - tvS[tvK], NSEG);
    if (d > 2) { if (d < NSEG / 2) { tvFind(s); } }
    let q = tvS[tvK];
    camX = sgX[q] + sgNX[q] * tvO[tvK];
    camZ = sgZ[q] + sgNZ[q] * tvO[tvK];
    camY = sgY[q] + tvH[tvK];
    let dx = caX[c] - camX;
    let dz = caZ[c] - camZ;
    let dy = caY[c] + 0.5 - camY;
    let dh = Math.sqrt(dx * dx + dz * dz) + 0.01;
    atan2d(dx, dz);
    camYaw = oAtan;
    atan2d(dy, dh);
    camPitch = oAtan;
    camRoll = 0;
    // zoom so the car keeps roughly the same size on screen
    atan2d(11, dh);
    let f = oAtan * 2;
    if (f < 9) { f = 9; }
    if (f > 70) { f = 70; }
    camFov = f;
    // start the ring scan well behind the car: the camera looks back at it
    camSeg = mod(s - 1 - 30 + NSEG, NSEG) + 1;
}

// save the live race, so the replay can move the cars and hand them back
function rpSnap(save) {
    let c = 1;
    while (c <= RPC) {
        if (save > 0) {
            snX[c] = caX[c]; snY[c] = caY[c]; snZ[c] = caZ[c]; snW[c] = caYaw[c]; snS[c] = caSeg[c];
            snU[c] = caU[c]; snO[c] = caOff[c]; snF[c] = caFin[c]; snR[c] = caRoll[c]; snP[c] = caPitch[c];
            snVX[c] = caVX[c]; snVZ[c] = caVZ[c]; snSp[c] = caSpd[c]; snB[c] = caBrk[c]; snSt[c] = caSteer[c];
        } else {
            caX[c] = snX[c]; caY[c] = snY[c]; caZ[c] = snZ[c]; caYaw[c] = snW[c]; caSeg[c] = snS[c];
            caU[c] = snU[c]; caOff[c] = snO[c]; caFin[c] = snF[c]; caRoll[c] = snR[c]; caPitch[c] = snP[c];
            caVX[c] = snVX[c]; caVZ[c] = snVZ[c]; caSpd[c] = snSp[c]; caBrk[c] = snB[c]; caSteer[c] = snSt[c];
        }
        c = c + 1;
    }
}

function enterReplay() {
    if (gfx < 2) { setMsg('REPLAYS NEED GRAPHICS HIGH OR ULTRA', 2); }
    else if (rpN < 20) { setMsg('NOTHING TO REPLAY YET', 1.5); }
    else {
        rpSnap(1);
        rpPrev = raceState;
        rpGhost = ghostOn;
        rpSC = scCar;
        raceState = ST_REPLAY;
        rpT = 0;
        rpCar = 1;
        rpCam = 0;
        rpPause = 0;
        camCar = 1;
        replayPose();
        tvFind(caSeg[1]);
    }
}

function exitReplay() {
    rpSnap(0);
    ghostOn = rpGhost;
    scCar = rpSC;
    raceState = rpPrev;
    camCar = 1;
    camMode = 0;
    camYawS = caYaw[1];
    // put the chase camera straight back behind the car and redraw the frame
    // the race was paused on
    camX = caX[1] - sind(camYawS) * 9.4;
    camZ = caZ[1] - cosd(camYawS) * 9.4;
    camY = caY[1] + 3.4;
    let ks = shakeT;
    shakeT = 0;
    updateCam();
    shakeT = ks;
    camFov = 78;
    if (raceState == ST_PAUSE) { renderWorld(); drawPausePanel(); }
}

// ---- v6.0 photo mode ------------------------------------------------------------
// From the pause screen or a replay (O): the world stands still and the camera
// flies free - W/S A/D move, Q/E down and up, the arrows turn and tilt, Z/X
// zoom, SHIFT is quicker, SPACE hides the help, O or ESC goes back.
let phPrev = 0;
let phX = 0; let phY = 0; let phZ = 0;
let phYaw = 0; let phPitch = 0; let phFov = 70;
let phX0 = 0; let phZ0 = 0;
let phHelp = 1;
function photoEnter() {
    phPrev = raceState;
    raceState = ST_PHOTO;
    phX = camX; phY = camY; phZ = camZ;
    phYaw = camYaw; phPitch = camPitch; phFov = camFov;
    phX0 = camX; phZ0 = camZ;
    phHelp = 1;
}
function photoExit() {
    raceState = phPrev;
    if (raceState == ST_PAUSE) {
        // back to the frame the race stopped on
        let ks = shakeT;
        shakeT = 0;
        updateCam();
        shakeT = ks;
        renderWorld();
        drawPausePanel();
    }
}
// the ring nearest the camera, for the ring scan (the camera is not on a car)
function photoSeg() {
    let xi = Math.round(phX * WU);
    let zi = Math.round(phZ * WU);
    let best = camSeg;
    let bd = 0 - 1;
    let i = 1;
    while (i <= NSEG) {
        let dx = xi - sgXi[i];
        let dz = zi - sgZi[i];
        let d = dx * dx + dz * dz;
        if (bd < 0) { bd = d; best = i; } else if (d < bd) { bd = d; best = i; }
        i = i + 2;
    }
    camSeg = best;
}
function photoStep() {
    if (actKey == 79) { photoExit(); }
    else if (actKey == 27) { photoExit(); }
    else {
        if (actKey == 32) { phHelp = 1 - phHelp; }
        let mv = (key(16) ? 45 : 12) * dt;
        let fx = sind(phYaw);
        let fz = cosd(phYaw);
        if (key(87)) { phX = phX + fx * mv; phZ = phZ + fz * mv; }
        if (key(83)) { phX = phX - fx * mv; phZ = phZ - fz * mv; }
        if (key(68)) { phX = phX + fz * mv; phZ = phZ - fx * mv; }
        if (key(65)) { phX = phX - fz * mv; phZ = phZ + fx * mv; }
        if (key(69)) { phY = phY + mv; }
        if (key(81)) { phY = phY - mv; }
        if (key(37)) { phYaw = phYaw - 70 * dt; }
        if (key(39)) { phYaw = phYaw + 70 * dt; }
        if (key(38)) { phPitch = Math.min(80, phPitch + 45 * dt); }
        if (key(40)) { phPitch = Math.max(0 - 80, phPitch - 45 * dt); }
        if (key(90)) { phFov = Math.max(20, phFov - 35 * dt); }
        if (key(88)) { phFov = Math.min(100, phFov + 35 * dt); }
        // not too far from where it started, and not under the world
        let dx = phX - phX0;
        let dz = phZ - phZ0;
        let d = Math.sqrt(dx * dx + dz * dz);
        if (d > 700) { phX = phX0 + dx * 700 / d; phZ = phZ0 + dz * 700 / d; }
        if (phY < 0 - 30) { phY = 0 - 30; }
        if (phY > 500) { phY = 500; }
        camX = phX; camY = phY; camZ = phZ;
        camYaw = phYaw; camPitch = phPitch; camRoll = 0; camFov = phFov;
        photoSeg();
        renderWorld();
    }
}

// put every car where it was at playback time rpT
function replayPose() {
    let fi = rpT / RPDT;
    let n = Math.floor(fi);
    let f = fi - n;
    let old = 1;
    if (rpN >= RPN) { old = mod(rpHead, RPN) + 1; }
    let j = mod(old - 1 + n, RPN) + 1;
    let j2 = mod(j, RPN) + 1;
    if (n >= rpN - 1) { j2 = j; f = 0; }
    let c = 1;
    while (c <= RPC) {
        let k1 = (j - 1) * RPC + c;
        let k2 = (j2 - 1) * RPC + c;
        let vis = rpS[k1] > 0 ? 1 : 0;
        if (rpS[k2] < 1) { k2 = k1; }
        if (vis > 0) {
            let x = rpX[k1] + (rpX[k2] - rpX[k1]) * f;
            let z = rpZ[k1] + (rpZ[k2] - rpZ[k1]) * f;
            caVX[c] = (rpX[k2] - rpX[k1]) / RPDT;
            caVZ[c] = (rpZ[k2] - rpZ[k1]) / RPDT;
            caX[c] = x;
            caZ[c] = z;
            caY[c] = rpY[k1] + (rpY[k2] - rpY[k1]) * f;
            wrapAng(rpW[k2] - rpW[k1]);
            caYaw[c] = rpW[k1] + oWrap * f;
            caSteer[c] = oWrap * 0.25;
            if (caSteer[c] > 1) { caSteer[c] = 1; }
            if (caSteer[c] < 0 - 1) { caSteer[c] = 0 - 1; }
            caSpd[c] = rpV[k1] + (rpV[k2] - rpV[k1]) * f;
            caBrk[c] = rpV[k1] - rpV[k2] > 0.5 ? 1 : 0;
            sampleTrack(x, z, rpS[k1]);
            caSeg[c] = sfSeg; caU[c] = sfU; caOff[c] = sfT;
            caRoll[c] = 0; caPitch[c] = 0;
            caFin[c] = 0;
        } else { caFin[c] = 9; }
        c = c + 1;
    }
    ghostOn = 0;
    scCar = 0;
    if (caFin[GHOST] < 1) {
        if (rpSC > 0) { scCar = 1; } else { ghostOn = 1; }
    }
}

function replayStep() {
    if (actKey == 32) { rpPause = 1 - rpPause; }
    if (actKey == 37) { rpCar = mod(rpCar + nCars - 2, nCars) + 1; tvFind(caSeg[rpCar]); }
    if (actKey == 39) { rpCar = mod(rpCar, nCars) + 1; tvFind(caSeg[rpCar]); }
    if (actKey == 67) { rpCam = mod(rpCam + 1, 4); camYawS = caYaw[rpCar]; }
    if (rpPause < 1) {
        rpT = rpT + dt;
        if (rpT > (rpN - 1) * RPDT) { rpT = 0; tvFind(caSeg[rpCar]); }
    }
    replayPose();
    camCar = rpCar;
    if (rpCam == 0) { tvCam(); }
    else {
        camMode = 0;
        if (rpCam == 2) { camMode = 3; }
        if (rpCam == 3) { camMode = 2; }
        let ks = shakeT;
        shakeT = 0;
        updateCam();
        shakeT = ks;
    }
    // what the watched car's engine would sound like
    let v = Math.abs(caSpd[rpCar]);
    let top = caTop[rpCar];
    let g = 1;
    let vg = top * 0.34;
    while (g < 8) {
        if (v < vg * 0.97) { break; }
        g = g + 1;
        vg = top * (0.34 + 0.66 * (g - 1) / 7);
    }
    caRpm[rpCar] = Math.min(12100, 4200 + 7900 * v / vg);
}

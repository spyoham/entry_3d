// ============================================================
// ai.js - waypoint driver. Each opponent follows the centreline offset onto
// a racing line, lifts and brakes before a corner according to the grip it
// can actually use, and moves off line to pass slower cars.
// ============================================================
// Reading the road ahead - which is most of the AI's cost - depends only on
// where the car is on the track, and that barely moves inside one frame. So
// the survey runs once a frame and the driving runs on every physics slice.
const AIMARG = 0.84;
const AILEAD = 0;
function aiPlan(c) {
    let s = caSeg[c];
    let sp = Math.sqrt(caVX[c] * caVX[c] + caVZ[c] * caVZ[c]);
    let skill = caSkill[c];
    // For each corner ahead, work out the speed it can be taken at and how
    // fast we may still be travelling now and stop in time. Taking the minimum
    // of those lets the car stay flat out until the real braking point, rather
    // than crawling at the speed of the tightest bend anywhere in sight.
    let look = 8 + Math.floor(sp * 0.46);
    if (look > 40) { look = 40; }
    let vlim = caTop[c] * skill;
    // The tyres give caGrip * (GRIP0 + AERO * v * v); solving v*v = mu / curvature
    // for v gives the corner speed. AIMARG keeps a margin under the real limit.
    let gk = caGrip[c] * AIMARG * skill;
    let g0 = gk * GRIP0;
    let ga = gk * AERO;
    let bdec = 2 * 15 * skill * segStep;
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
        if (av > 0.00040) {
            let vc2 = 99999;
            if (av > ga + 0.00005) { vc2 = g0 / (av - ga); }
            let bk = k - 1;
            if (bk < 0) { bk = 0; }
            let vAllow = Math.sqrt(vc2 + bdec * bk);
            if (vAllow < vlim) { vlim = vAllow; }
        }
        // the nearest firm corner is the one the racing line aims at
        let aw = av * (1.05 - 0.5 * k / look);
        if (k < 1) { aw = av * 0.6; }
        if (aw > worst) { worst = aw; wsign = cv > 0 ? 1 : 0 - 1; }
        if (k <= 8) { if (av > nearCv) { nearCv = av; } }
        k = k + 1;
    }
    aiVlim[c] = vlim;
    aiWorst[c] = worst;
    aiWsign[c] = wsign;
    aiNear[c] = nearCv;
}

function aiDrive(c) {
    let s = caSeg[c];
    let sp = Math.sqrt(caVX[c] * caVX[c] + caVZ[c] * caVZ[c]);
    let skill = caSkill[c];
    let vlim = aiVlim[c];
    let worst = aiWorst[c];
    let wsign = aiWsign[c];
    let nearCv = aiNear[c];

    // ---- racing line: hug the inside of the coming corner ----
    let w = sgW[s];
    let tgtOff = 0;
    if (worst > 0.0016) {
        tgtOff = wsign * (w - 3.5) * 0.55;
    }
    tgtOff = tgtOff + caLine[c];

    // ---- overtaking: shift away from a car just ahead ----
    let fx = sind(caYaw[c]);
    let fz = cosd(caYaw[c]);
    let o = 1;
    while (o <= nCars) {
        if (o != c) {
            let dx = caX[o] - caX[c];
            let dz = caZ[o] - caZ[c];
            let ahead = dx * fx + dz * fz;
            if (ahead > 0) {
                if (ahead < 17) {
                    let side = dx * fz - dz * fx;
                    if (Math.abs(side) < 3.4) {
                        tgtOff = caOff[o] + (side > 0 ? 0 - 3.6 : 3.6);
                    }
                }
            }
        }
        o = o + 1;
    }
    if (caSurf[c] >= 2) { tgtOff = 0; }
    let lim = w - 1.3;
    if (tgtOff > lim) { tgtOff = lim; }
    if (tgtOff < 0 - lim) { tgtOff = 0 - lim; }

    // ---- aim point ----
    // Aim point. A chord to a point d metres ahead of a corner of radius R
    // cuts inside the arc by about d*d/(8R), so a far aim point simply drives
    // the car off the inside of a tight corner. Cap d so that sag stays on
    // the road, which is what keeps the AI between the white lines at all.
    let ah = 3 + Math.floor(sp * 0.13);
    if (ah > 14) { ah = 14; }
    if (nearCv > 0.0003) {
        let dm = Math.floor(Math.sqrt(14 / nearCv) / segStep);
        if (dm < 2) { dm = 2; }
        if (ah > dm) { ah = dm; }
    }
    let ti = mod(s - 1 + ah, NSEG) + 1;
    let tx = sgX[ti] + sgNX[ti] * tgtOff;
    let tz = sgZ[ti] + sgNZ[ti] * tgtOff;
    atan2d(tx - caX[c], tz - caZ[c]);
    wrapAng(oAtan - caYaw[c]);
    // steer on where the nose will be a moment from now, not where it is:
    // the car's yaw now lags the wheel, and without this lead the driver
    // overshoots every change of direction
    let err = oWrap - caYR[c] * AILEAD;

    // ---- stuck / spun recovery ----
    if (sp < 2.2) { caStuck[c] = caStuck[c] + dt; } else { caStuck[c] = 0; }
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
        if (caSurf[c] >= 2) { vmax = vmax * 0.82; }
        if (sp < vmax - 1.2) { caThr[c] = 1; caBrk[c] = 0; }
        else if (sp > vmax + 1.0) { caThr[c] = 0; caBrk[c] = Math.min(1, (sp - vmax) / 2.2); }
        else { caThr[c] = 0.45; caBrk[c] = 0; }
        // a flick of handbrake in the very tightest stuff
        caHB[c] = 0;
        // (no handbrake: with the rear grip it now leaves, it only spins them)
    }
    if (raceState != 3) { caThr[c] = 0; caBrk[c] = 1; caSteer[c] = 0; caHB[c] = 0; }
    if (caFin[c] > 0) { caThr[c] = caThr[c] * 0.5; }
}

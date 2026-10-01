// ============================================================
// damage.js - v3.2.0 more than a front wing (realistic rules). A hit
// (addDamage, rules.js) can also
//   * bend the SUSPENSION (caDmgS 0-1, on the side that was hit, caDmgSd):
//     less grip, the car pulls to that side and sits crooked;
//   * PUNCTURE a tyre (caPunc: wheel 1 FL, 2 FR, 3 RL, 4 RR) - so can a tyre
//     worn down to the canvas: that axle hardly grips, the car pulls to the
//     flat, can't reach its top speed and drags its rim (sparks);
//   * damage the ENGINE (caDmgE 0-1, only big hits): less power, smoke, and
//     past 0.9 it gives up after a while.
// A pit stop fits new tyres (the puncture) and straightens the suspension
// (a few seconds more per bit of it); the engine stays as it is.
// Where the hit came from is set by the caller in dmgSide (+1 right of the
// car, -1 left) and dmgFront (1 the front, 0 the rear).
// ============================================================
let dmgSide = 1;
let dmgFront = 1;

function dmgName(k) {
    oNm = 'FRONT LEFT';
    if (k == 2) { oNm = 'FRONT RIGHT'; } else if (k == 3) { oNm = 'REAR LEFT'; } else if (k == 4) { oNm = 'REAR RIGHT'; }
}

// (addDamage) what else a hit of size d breaks
function dmgHit(c, d) {
    if (d > 0.12) {
        let was = caDmgS[c];
        caDmgS[c] = Math.min(1, was + d * 0.8);
        caDmgSd[c] = dmgSide;
        if (c == 1) { if (was < 0.15) { if (caDmgS[1] >= 0.15) {
            setRadio(str('SUSPENSION DAMAGE - THE CAR PULLS ', dmgSide > 0 ? 'RIGHT' : 'LEFT'), 4);
        } } }
    }
    if (caPunc[c] < 1) {
        if (d > 0.08) {
            if (rand(0, 999999) / 1000000 < Math.min(0.6, d * 1.2)) {
                dmgPuncture(c, (dmgFront > 0 ? 1 : 3) + (dmgSide > 0 ? 1 : 0));
            }
        }
    }
    if (d > 0.35) {
        if (rand(0, 999999) / 1000000 < 0.5) {
            let was = caDmgE[c];
            caDmgE[c] = Math.min(1, was + (d - 0.35) * 1.5);
            if (c == 1) { if (was < 0.1) { setRadio('ENGINE DAMAGE - WE ARE DOWN ON POWER', 4); } }
        }
    }
}
function dmgPuncture(c, k) {
    if (caPunc[c] < 1) {
        caPunc[c] = k;
        caPuT[c] = 0;
        if (c == 1) { dmgName(k); setRadio(str('PUNCTURE - ', oNm, '! BOX, BOX'), 5); setMsg('PUNCTURE', 2); }
    }
}

// (carTick3, every tick of wt s) worn-out tyres let go; the engine; power
function dmgTick(c, wt) {
    if (caPunc[c] < 1) {
        let b = (c - 1) * 4;
        let k = 1;
        while (k <= 4) {
            if (whW[b + k] < 0.08) { if (rand(0, 999999) / 1000000 < 0.03 * wt) { dmgPuncture(c, k); } }
            k = k + 1;
        }
    } else { caPuT[c] = caPuT[c] + wt; }
    if (caDmgE[c] >= 0.9) {
        caEngT[c] = caEngT[c] + wt;
        if (caEngT[c] > 25) { if (caDNF[c] < 1) { caFail[c] = 1; retireCar(c); } }
    }
}
// (carTick3) the power and top speed the damage costs: oDP, oDT
let oDP = 0;
let oDT = 0;
function dmgPower(c) {
    oDP = caDmgE[c] * 0.30;
    oDT = caDmgE[c] * 0.10;
    if (caPunc[c] > 0) { oDP = oDP + 0.10; oDT = oDT + 0.25; }
}

// (carPhys) the grip each axle keeps, oGF / oGR, and the pull in degrees of lock, oPull
let oGF = 1;
let oGR = 1;
let oPull = 0;
function dmgGrip(c, sp) {
    let s = caDmgS[c];
    oGF = 1 - 0.18 * s;
    oGR = 1 - 0.12 * s;
    oPull = s * caDmgSd[c] * 1.2;
    let k = caPunc[c];
    if (k > 0) {
        // (a flat rear is the nervous one: less pull, a little more grip kept)
        let p = 1.2;
        if (k <= 2) { oGF = oGF * 0.5; } else { oGR = oGR * 0.7; p = 0.6; }
        oPull = oPull + (mod(k, 2) > 0 ? 0 - p : p);
    }
    oPull = oPull * Math.min(1, sp / 10);
}

// (body attitude) how crooked the car sits: oDR roll, oDPi pitch (degrees)
let oDR = 0;
let oDPi = 0;
function dmgLean(c) {
    oDR = 0 - caDmgS[c] * caDmgSd[c] * 3;
    oDPi = 0;
    let k = caPunc[c];
    if (k > 0) {
        oDR = oDR + (mod(k, 2) > 0 ? 2.5 : 0 - 2.5);
        oDPi = k <= 2 ? 1.5 : 0 - 1.5;
    }
}

// (carSparks) a flat tyre's rim on the road, and engine smoke
function dmgFx(c, sp) {
    let k = caPunc[c];
    let fx = sind(caYaw[c]);
    let fz = cosd(caYaw[c]);
    if (k > 0) {
        if (sp > 6) {
            if (rand(0, 99) < 55) {
                let lon = k <= 2 ? 1.7 : 0 - 1.5;
                let lat = mod(k, 2) > 0 ? 0 - 0.8 : 0.8;
                sparkBurst(caX[c] + fx * lon + fz * lat, caY[c] + 0.05, caZ[c] + fz * lon - fx * lat, caVX[c], caVZ[c], caSeg[c], 2);
            }
        }
    }
    if (caDmgE[c] > 0.25) {
        if (rand(0, 99) < caDmgE[c] * 70) { emitSmoke(caX[c] - fx * 2.4, caY[c] + 0.6, caZ[c] - fz * 2.4, caSeg[c]); }
    }
}

// (pitStop, after it has added caDmgS * 6 s) new tyres, the suspension straightened
function dmgPit(c) {
    caDmgS[c] = 0;
    caPunc[c] = 0;
    caPuT[c] = 0;
}

// the damage line of the realistic HUD (oNm; BLANK when there is none)
function dmgLine() {
    let s = BLANK;
    if (caPunc[1] > 0) { s = str('FLAT ', whName[caPunc[1]]); }
    if (caDmgS[1] > 0.04) { s = str(s == BLANK ? BLANK : str(s, '  '), 'SUSP ', Math.round(caDmgS[1] * 100), '%'); }
    if (caDmgE[1] > 0.04) { s = str(s == BLANK ? BLANK : str(s, '  '), 'ENG ', Math.round(caDmgE[1] * 100), '%'); }
    oNm = s;
}

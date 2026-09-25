// ============================================================
// sound.js - v7 engine sound.
//   One synthesised loop of the engine at ENG_REF rpm (enginewav.mjs) is
//   played over and over; Entry's "sound speed" block bends its pitch to the
//   engine's revs (the speed is shared by every sound and applies at once,
//   also to what is already playing). Each play-through is restarted a
//   little before the last one ends, and the loop fades in and out at its
//   ends, so the restarts overlap instead of leaving gaps.
//   Entry's volume is global too: it follows the throttle.
// ============================================================
let sndSel = 2;             // 1 off, 2 on (main menu)
let engOn = 0;              // a play-through is running
let engRem = 0;             // loop-seconds left in it
let engRate = 1;            // playback rate last set
let engVol = 0 - 1;         // volume last set, %

function engineSound() {
    let want = 0;
    if (sndSel > 1) {
        if (nCars > 0) {
            if (raceState == ST_RACE) { want = 1; }
            if (raceState == ST_COUNT) { want = 1; }
            if (raceState == ST_FORM) { want = 1; }
            if (raceState == ST_DONE) { want = 1; }
            if (raceState == ST_QUALI) { want = 1; }
            if (raceState == ST_REPLAY) { want = 1; }
        }
    }
    if (want < 1) {
        if (engOn > 0) { stopSounds(); engOn = 0; engRem = 0; aiRem = 0; }
    } else {
        let c = camCar;
        let r = caRpm[c] / ENG_REF;
        if (r < 0.5) { r = 0.5; }
        if (r > 2) { r = 2; }
        r = Math.round(r * 100) / 100;
        if (Math.abs(r - engRate) > 0.015) { engRate = r; soundSpeed(r); }
        // louder on the throttle, a little quieter from outside the car
        let v = 48 + 42 * caThr[c];
        if (raceState == ST_REPLAY) { v = 70; if (rpCam == 0) { v = 45; } }
        if (camMode == 2) { v = v * 0.8; }
        v = Math.round(v / 5) * 5;
        if (v != engVol) { engVol = v; volume(v); }
        engRem = engRem - dt * engRate;
        if (engRem < 0 - 0.5) { engRem = 0; }
        // restart early enough that the next frame is still covered (and
        // early enough to cover the silence an MP3 decoder may add at the ends)
        if (engOn < 1 || engRem < dt * engRate * 1.2 + 0.14) {
            sound('engine');
            if (engOn < 1) { engRem = ENG_LOOP; } else { engRem = engRem + ENG_LOOP - 0.12; }
            engOn = 1;
        }
        otherCars();
    }
}

// ---- v8: the nearest other car ------------------------------------------------------
// The sound speed is the player's revs, so a loop is picked whose baked pitch
// is the other car's revs relative to the player's (with Doppler: higher
// while it closes in, lower as it goes away), and whose baked loudness suits
// its distance: ai<pitch 1..NAIS><near 1 / far 2>. It plays only while a car
// is within 70 m, and is restarted like the engine loop.
let aiRem = 0;
function rpmOf(c) {
    let v = Math.abs(caSpd[c]);
    let top = caTop[c];
    let g = 1;
    let vg = top * 0.34;
    while (g < 8) {
        if (v < vg * 0.97) { break; }
        g = g + 1;
        vg = top * (0.34 + 0.66 * (g - 1) / 7);
    }
    oRpm = Math.min(12100, 4200 + 7900 * v / vg);
}
let oRpm = 0;
function otherCars() {
    let me = camCar;
    let best = 0;
    let bd = 4900;
    let c = 1;
    while (c <= nCars) {
        if (c != me) {
            if (caFin[c] < 2) {
                let dx = caX[c] - caX[me];
                let dz = caZ[c] - caZ[me];
                let d = dx * dx + dz * dz;
                if (d < bd) { bd = d; best = c; }
            }
        }
        c = c + 1;
    }
    aiRem = aiRem - dt * engRate;
    if (best > 0) {
        if (aiRem < dt * engRate * 1.2 + 0.10) {
            rpmOf(best);
            let ratio = oRpm / Math.max(3000, caRpm[me]);
            // Doppler from the closing speed along the line between the cars
            let dx = caX[best] - caX[me];
            let dz = caZ[best] - caZ[me];
            let d = Math.sqrt(bd) + 0.1;
            let vr = ((caVX[me] - caVX[best]) * dx + (caVZ[me] - caVZ[best]) * dz) / d;
            ratio = ratio * (1 + vr / 343);
            let k = 1;
            let best2 = 99;
            let i = 1;
            while (i <= NAIS) {
                let e = Math.abs(aiRat[i] - ratio);
                if (e < best2) { best2 = e; k = i; }
                i = i + 1;
            }
            let lv = 1;
            if (d > 30) { lv = 2; }
            sound(str('ai', k, lv));
            if (aiRem < 0 - 0.3) { aiRem = 0; }
            aiRem = aiRem + AI_LOOP - 0.09;
        }
    } else if (aiRem < 0) { aiRem = 0; }
}

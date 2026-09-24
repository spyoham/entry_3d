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
            if (raceState == ST_DONE) { want = 1; }
            if (raceState == ST_QUALI) { want = 1; }
            if (raceState == ST_REPLAY) { want = 1; }
        }
    }
    if (want < 1) {
        if (engOn > 0) { stopSounds(); engOn = 0; engRem = 0; }
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
        // restart early enough that the next frame is still covered
        if (engOn < 1 || engRem < dt * engRate * 1.2 + 0.06) {
            sound('engine');
            if (engOn < 1) { engRem = ENG_LOOP; } else { engRem = engRem + ENG_LOOP - 0.05; }
            engOn = 1;
        }
    }
}

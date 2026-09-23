// ============================================================
// api.js - engine start-up, the frame clock, input helpers and the HUD.
//
// The pools are allocated here, at run time, by pushing on to empty lists:
// that keeps the .ent small and lets every list stay inside Entry's 5000 item
// limit while a project only pays for what it actually makes.
// ============================================================
let hudTxt = []; let hudX = []; let hudY = []; let hudCol = [];

let mlOn = 0; let mlX = 0; let mlY = 0;
let inFwd = 0; let inSide = 0; let inJump = 0; let inFire = 0;
let dtAvg = 0.05;
let dist3 = 0; let angleOut = 0;
let poolsReady = 0;

// ---- start-up ----------------------------------------------------------
function allocPools() {
    if (poolsReady == 0) {
        poolsReady = 1;
        while (tvX.length < MAXSV) {
            tvX.push(0); tvY.push(0); tvZ.push(0); tsX.push(0); tsY.push(0);
        }
        while (pgX.length < MAXPG) { pgX.push(0); pgY.push(0); }
        while (dStart.length < MAXDR) {
            dStart.push(0); dCount.push(0); dNext.push(0); dHex.push('#888888');
        }
        while (bHead.length < NB) { bHead.push(0); }
        while (gpHead.length < NGP) { gpHead.push(0); }
        while (grHead.length < NGR) { grHead.push(0); }
        while (bkHead.length < NBK) { bkHead.push(0); }
        while (timerV.length < NTIMER) { timerV.push(0); }
        while (hudTxt.length < HUDN) {
            hudTxt.push(BLANK); hudX.push(0); hudY.push(0); hudCol.push('#ffffff');
        }
    }
}

function worldClear() {
    nObj = 0; nFree = 0; nBody = 0; nBFree = 0; nBig = 0;
    nMesh = NBUILTIN; nV = BV; nF = BF;
    nGP = 0; nGR = 0; gpFree = 0; grFree = 0;
    nBK = 0; bkFree = 0;
    nHit = 0; nTween = 0; nPar = 0; bmOn = 0;
    tgN = 0;
    scanPtr = 0;
    camTwLook = 0;
    let i = 1;
    while (i <= NGP) { gpHead[i] = 0; i = i + 1; }
    i = 1;
    while (i <= NGR) { grHead[i] = 0; i = i + 1; }
    i = 1;
    while (i <= NBK) { bkHead[i] = 0; i = i + 1; }
    i = 1;
    while (i <= NTIMER) { timerV[i] = 0; i = i + 1; }
}

function engineStart() {
    nColor = NCOLOR;
    allocPools();
    worldClear();
    timerReset();
    timerStart();
    lastT = 0; gt = 0; dt = 0.05; frameId = 0; fps = 20;
    dtAvg = 0.05;
    camX = 0; camY = 4; camZ = -10;
    camYaw = 0; camPitch = -8; camRoll = 0; camFov = 70;
    orthoOn = 0; orthoSize = 24;
    gravity = 22;
    worldB = 0; worldTop = 200;
    stepH = 0.45; slopeMax = 48;
    fogFar = 110;
    skyOn = 1; shadowOn = 1; shadowY = 0; shadowFar = 45;
    drawMode = 0; maxFaces = 460; lodSize = 30; lodFar = 50; debugOn = 0;
    blkSize = 2;
    setSky('#2f6fd0', '#bcd8f0', '#6f8f5a');
    setLight(-0.42, 0.86, -0.32, 0.62, 0.45);
    shakeT = 0;
    mlOn = 0;
    warnMsg = BLANK;
    let i = 1;
    while (i <= HUDN) { hudTxt[i] = BLANK; i = i + 1; }
    hide();
    // Entry inserts the fill layer and the pen layer just under the sprite, in
    // the order they are first used - the fill layer has to exist first or
    // wireframe lines end up hidden behind the sky.
    fillColorHex('#000000');
    fillStart();
    fillStop();
    penSize(1);
    penColorHex(wireHex);
    eraseAll();
    setupCam();
}

// Start of every frame: the clock, the keyboard, tweens and timers.
// Entry's project timer is updated by a 60 Hz interval that gets starved while
// a long frame runs, so a single reading is useless - one frame sees 0 and the
// next sees double. The frame time is therefore a rolling average.
function frameBegin() {
    let t = timer();
    let raw = t - lastT;
    lastT = t;
    if (raw < 0) { raw = 0; }
    if (raw > 0.4) { raw = 0.4; }
    let al = 0.3;
    if (frameId < 10) { al = 0.7; }
    dtAvg = dtAvg + (raw - dtAvg) * al;
    dt = dtAvg;
    if (dt > 0.25) { dt = 0.25; }
    if (dt < 0.004) { dt = 0.004; }
    gt = gt + dt;
    frameId = frameId + 1;
    fps = 1 / dt;
    inFwd = 0; inSide = 0; inJump = 0;
    if (key(87)) { inFwd = 1; }
    if (key(38)) { inFwd = 1; }
    if (key(83)) { inFwd = inFwd - 1; }
    if (key(40)) { inFwd = inFwd - 1; }
    if (key(68)) { inSide = 1; }
    if (key(65)) { inSide = inSide - 1; }
    if (key(32)) { inJump = 1; }
    updateTweens();
    updateTimers();
    updateCamTween();
}

// ---- input helpers -----------------------------------------------------
// move a body relative to where the camera looks
function charMove(id, fwd, side, speed) {
    alive(id);
    if (aliveRes == 1) {
        bodySlot(id);
        let s = slotRes;
        if (s > 0) {
            let sy = sind(camYaw);
            let cy = cosd(camYaw);
            let vx = (sy * fwd + cy * side) * speed;
            let vz = (cy * fwd - sy * side) * speed;
            oVX[id] = vx;
            oVZ[id] = vz;
            bCX[s] = vx;
            bCZ[s] = vz;
            putFlag(id, F_CTL, 1);
            putFlag(id, F_SLEEP, 0);
            if (fwd != 0) { atan2d(vx, vz); oRY[id] = oAtan; }
            else if (side != 0) { atan2d(vx, vz); oRY[id] = oAtan; }
        }
    }
}

// drive a body along a heading of its own (cars, boats, turrets)
function driveBody(id, speed, yaw) {
    alive(id);
    if (aliveRes == 1) {
        bodySlot(id);
        let s = slotRes;
        if (s > 0) {
            let vx = sind(yaw) * speed;
            let vz = cosd(yaw) * speed;
            oVX[id] = vx; oVZ[id] = vz;
            bCX[s] = vx; bCZ[s] = vz;
            oRY[id] = yaw;
            putFlag(id, F_CTL, 1);
            putFlag(id, F_SLEEP, 0);
        }
    }
}

// WASD / arrows walk, space jumps - one block for a playable character
function keyControl(id, speed, jumpH) {
    charMove(id, inFwd, inSide, speed);
    if (inJump == 1) { doJump(id, jumpH); }
}

// drag with the mouse button held to look around
function mouseLook(sens) {
    let mx = mouseX();
    let my = mouseY();
    if (mouseDown()) {
        if (mlOn == 1) {
            camTurn((mx - mlX) * sens * 0.35, (my - mlY) * sens * 0.35);
        }
        mlOn = 1;
    } else { mlOn = 0; }
    mlX = mx;
    mlY = my;
}

// arrow keys (or J/L, I/K) turn the view
function keyLook(speed) {
    let a = speed * dt * 60;
    if (key(37)) { camTurn(0 - a, 0); }
    if (key(39)) { camTurn(a, 0); }
    if (key(73)) { camTurn(0, a * 0.7); }
    if (key(75)) { camTurn(0, 0 - a * 0.7); }
    if (key(74)) { camTurn(0 - a, 0); }
    if (key(76)) { camTurn(a, 0); }
}

// ---- handy sums used by almost every game -------------------------------
// results land in the 거리 / 방향각 variables (Entry value-functions cost about
// two frames per call, so nothing in this engine returns a value)
function distPoints(x1, y1, z1, x2, y2, z2) {
    let dx = x2 - x1; let dy = y2 - y1; let dz = z2 - z1;
    dist3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function distObjs(a, b) {
    alive(a);
    let ok = aliveRes;
    alive(b);
    dist3 = 99999;
    if (ok == 1) {
        if (aliveRes == 1) { distPoints(oX[a], oY[a], oZ[a], oX[b], oY[b], oZ[b]); }
    }
}
// the compass direction from one point to another, in Entry's Y rotation
function angleTo(x1, z1, x2, z2) {
    atan2d(x2 - x1, z2 - z1);
    angleOut = oAtan;
}
// walk an object toward another one - the one block a chasing enemy needs
function moveToward(id, target, speed) {
    alive(id);
    let ok = aliveRes;
    alive(target);
    if (ok == 1) {
        if (aliveRes == 1) {
            let dx = oX[target] - oX[id];
            let dz = oZ[target] - oZ[id];
            let L = Math.sqrt(dx * dx + dz * dz);
            if (L > 0.001) {
                atan2d(dx, dz);
                oRY[id] = oAtan;
                if (oBody[id] == 1) {
                    bodySlot(id);
                    let s = slotRes;
                    if (s > 0) {
                        bCX[s] = dx / L * speed;
                        bCZ[s] = dz / L * speed;
                        oVX[id] = bCX[s];
                        oVZ[id] = bCZ[s];
                        putFlag(id, F_CTL, 1);
                        putFlag(id, F_SLEEP, 0);
                    }
                } else {
                    setPos(id, oX[id] + dx / L * speed * dt, oY[id], oZ[id] + dz / L * speed * dt);
                }
            }
        }
    }
}

// ---- HUD ---------------------------------------------------------------
function hudWrite(slot, t) {
    if (slot >= 1) {
        if (slot <= HUDN) { hudTxt[slot] = str(t, BLANK); }
    }
}
function hudClear() {
    let i = 1;
    while (i <= HUDN) { hudTxt[i] = BLANK; i = i + 1; }
}
function hudPlace(slot, x, y, col) {
    if (slot >= 1) {
        if (slot <= HUDN) {
            hudX[slot] = x; hudY[slot] = y;
            hudCol[slot] = col;
        }
    }
}
// park a HUD slot on top of a point in the world (name tags, damage numbers)
function hudPlace3D(slot, x, y, z, t) {
    worldToScreen(x, y, z);
    if (scrFront == 1) {
        hudPlace(slot, Math.round(scrX), Math.round(scrY), hudCol[slot]);
        hudWrite(slot, t);
    } else { hudWrite(slot, BLANK); }
}

// ---- the text objects --------------------------------------------------
// They start polling the moment the project runs, which can be before the
// game object has allocated the HUD lists - hence the length check.

on('start', '글1', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 1) {
            if (hudTxt[1] != p) { p = hudTxt[1]; write(p); }
            if (hudX[1] != px) { px = hudX[1]; py = hudY[1]; goto(px, py); }
            if (hudY[1] != py) { px = hudX[1]; py = hudY[1]; goto(px, py); }
            if (hudCol[1] != pc) { pc = hudCol[1]; textColorHex(pc); }
        }
    }
});
on('start', '글2', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 2) {
            if (hudTxt[2] != p) { p = hudTxt[2]; write(p); }
            if (hudX[2] != px) { px = hudX[2]; py = hudY[2]; goto(px, py); }
            if (hudY[2] != py) { px = hudX[2]; py = hudY[2]; goto(px, py); }
            if (hudCol[2] != pc) { pc = hudCol[2]; textColorHex(pc); }
        }
    }
});
on('start', '글3', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 3) {
            if (hudTxt[3] != p) { p = hudTxt[3]; write(p); }
            if (hudX[3] != px) { px = hudX[3]; py = hudY[3]; goto(px, py); }
            if (hudY[3] != py) { px = hudX[3]; py = hudY[3]; goto(px, py); }
            if (hudCol[3] != pc) { pc = hudCol[3]; textColorHex(pc); }
        }
    }
});
on('start', '글4', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 4) {
            if (hudTxt[4] != p) { p = hudTxt[4]; write(p); }
            if (hudX[4] != px) { px = hudX[4]; py = hudY[4]; goto(px, py); }
            if (hudY[4] != py) { px = hudX[4]; py = hudY[4]; goto(px, py); }
            if (hudCol[4] != pc) { pc = hudCol[4]; textColorHex(pc); }
        }
    }
});
on('start', '글5', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 5) {
            if (hudTxt[5] != p) { p = hudTxt[5]; write(p); }
            if (hudX[5] != px) { px = hudX[5]; py = hudY[5]; goto(px, py); }
            if (hudY[5] != py) { px = hudX[5]; py = hudY[5]; goto(px, py); }
            if (hudCol[5] != pc) { pc = hudCol[5]; textColorHex(pc); }
        }
    }
});
on('start', '글6', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 6) {
            if (hudTxt[6] != p) { p = hudTxt[6]; write(p); }
            if (hudX[6] != px) { px = hudX[6]; py = hudY[6]; goto(px, py); }
            if (hudY[6] != py) { px = hudX[6]; py = hudY[6]; goto(px, py); }
            if (hudCol[6] != pc) { pc = hudCol[6]; textColorHex(pc); }
        }
    }
});
on('start', '글7', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 7) {
            if (hudTxt[7] != p) { p = hudTxt[7]; write(p); }
            if (hudX[7] != px) { px = hudX[7]; py = hudY[7]; goto(px, py); }
            if (hudY[7] != py) { px = hudX[7]; py = hudY[7]; goto(px, py); }
            if (hudCol[7] != pc) { pc = hudCol[7]; textColorHex(pc); }
        }
    }
});
on('start', '글8', function () {
    let p = '~'; let px = -999; let py = -999; let pc = '~';
    for (;;) {
        if (hudTxt.length >= 8) {
            if (hudTxt[8] != p) { p = hudTxt[8]; write(p); }
            if (hudX[8] != px) { px = hudX[8]; py = hudY[8]; goto(px, py); }
            if (hudY[8] != py) { px = hudX[8]; py = hudY[8]; goto(px, py); }
            if (hudCol[8] != pc) { pc = hudCol[8]; textColorHex(pc); }
        }
    }
});

// ============================================================
// anim.js - tweens, parent/child links, countdown timers, camera moves.
// All of these tables are short and grow on demand.
// ============================================================
let nTween = 0;
let tObj = []; let tKind = []; let tEase = []; let tT = []; let tDur = [];
let tA0 = []; let tB0 = []; let tC0 = [];
let tA1 = []; let tB1 = []; let tC1 = [];

let nPar = 0;
let pChild = []; let pPar = [];
let pOX = []; let pOY = []; let pOZ = []; let pRY = [];

let timerV = [];                 // NTIMER countdowns the user reads directly

let camTwT = 0; let camTwDur = 0;
let camTwX0 = 0; let camTwY0 = 0; let camTwZ0 = 0;
let camTwX1 = 0; let camTwY1 = 0; let camTwZ1 = 0;
let camTwLX = 0; let camTwLY = 0; let camTwLZ = 0;
let camTwLook = 0;

// ---- tweens ------------------------------------------------------------
// kind: 1 position, 2 rotation, 3 size
function tweenAdd(id, kind, a, b, c, sec, ease) {
    alive(id);
    if (aliveRes == 1) {
        let slot = 0;
        let i = 1;
        while (i <= nTween) {
            if (tObj[i] == id) { if (tKind[i] == kind) { slot = i; i = nTween; } }
            i = i + 1;
        }
        if (slot == 0) {
            if (nTween < MAXTWEEN) {
                nTween = nTween + 1;
                slot = nTween;
                if (tObj.length < slot) {
                    tObj.push(0); tKind.push(0); tEase.push(0); tT.push(0); tDur.push(1);
                    tA0.push(0); tB0.push(0); tC0.push(0);
                    tA1.push(0); tB1.push(0); tC1.push(0);
                }
            }
        }
        if (slot > 0) {
            tObj[slot] = id; tKind[slot] = kind; tEase[slot] = ease;
            tT[slot] = 0;
            tDur[slot] = sec;
            if (sec <= 0) { tDur[slot] = 0.001; }
            if (kind == 1) { tA0[slot] = oX[id]; tB0[slot] = oY[id]; tC0[slot] = oZ[id]; }
            else if (kind == 2) { tA0[slot] = oRX[id]; tB0[slot] = oRY[id]; tC0[slot] = oRZ[id]; }
            else { tA0[slot] = oSX[id]; tB0[slot] = oSY[id]; tC0[slot] = oSZ[id]; }
            tA1[slot] = a; tB1[slot] = b; tC1[slot] = c;
        }
    }
}
function tweenMove(id, x, y, z, sec, ease) { tweenAdd(id, 1, x, y, z, sec, ease); }
function tweenTurn(id, rx, ry, rz, sec, ease) { tweenAdd(id, 2, rx, ry, rz, sec, ease); }
function tweenSize(id, sx, sy, sz, sec, ease) { tweenAdd(id, 3, sx, sy, sz, sec, ease); }

function tweenStop(id) {
    let i = 1;
    while (i <= nTween) {
        if (tObj[i] == id) { tObj[i] = 0; }
        i = i + 1;
    }
}

function updateTweens() {
    let i = 1;
    while (i <= nTween) {
        let id = tObj[i];
        if (id > 0) {
            if (oVis[id] == 9) { tObj[i] = 0; }
            else {
                tT[i] = tT[i] + dt;
                let u = tT[i] / tDur[i];
                if (u > 1) { u = 1; }
                let e = u;
                if (tEase[i] == 1) { e = u * u * (3 - 2 * u); }
                else if (tEase[i] == 2) { e = u * u; }
                else if (tEase[i] == 3) { e = 1 - (1 - u) * (1 - u); }
                let a = tA0[i] + (tA1[i] - tA0[i]) * e;
                let b = tB0[i] + (tB1[i] - tB0[i]) * e;
                let c = tC0[i] + (tC1[i] - tC0[i]) * e;
                let k = tKind[i];
                if (k == 1) {
                    oX[id] = a; oY[id] = b; oZ[id] = c;
                    let s = oBSlot[id];
                    if (s > 0) { if (oBody[id] != 4) { bPX[s] = a; bPY[s] = b; bPZ[s] = c; } }
                    gridMove(id);
                } else if (k == 2) { oRX[id] = a; oRY[id] = b; oRZ[id] = c; }
                else { oSX[id] = a; oSY[id] = b; oSZ[id] = c; fitCollider(id); }
                if (u >= 1) { tObj[i] = 0; }
            }
        }
        i = i + 1;
    }
}

// ---- parent / child ----------------------------------------------------
// the child keeps a fixed offset in the parent's own frame
function attachTo(child, parent, ox, oy, oz, ry) {
    alive(child);
    let ok = aliveRes;
    alive(parent);
    if (ok == 1) {
        if (aliveRes == 1) {
            let slot = 0;
            let i = 1;
            while (i <= nPar) {
                if (pChild[i] == child) { slot = i; i = nPar; }
                i = i + 1;
            }
            if (slot == 0) {
                if (nPar < MAXPAR) {
                    nPar = nPar + 1;
                    slot = nPar;
                    if (pChild.length < slot) {
                        pChild.push(0); pPar.push(0);
                        pOX.push(0); pOY.push(0); pOZ.push(0); pRY.push(0);
                    }
                }
            }
            if (slot > 0) {
                pChild[slot] = child; pPar[slot] = parent;
                pOX[slot] = ox; pOY[slot] = oy; pOZ[slot] = oz; pRY[slot] = ry;
            }
        }
    }
}

function detach(child) {
    let i = 1;
    while (i <= nPar) {
        if (pChild[i] == child) { pChild[i] = 0; }
        i = i + 1;
    }
}

function applyParents() {
    let i = 1;
    while (i <= nPar) {
        let c = pChild[i];
        if (c > 0) {
            let p = pPar[i];
            if (oVis[c] == 9) { pChild[i] = 0; }
            else if (oVis[p] == 9) { pChild[i] = 0; }
            else {
                let cy = cosd(oRY[p]);
                let sy = sind(oRY[p]);
                oX[c] = oX[p] + pOX[i] * cy + pOZ[i] * sy;
                oY[c] = oY[p] + pOY[i];
                oZ[c] = oZ[p] - pOX[i] * sy + pOZ[i] * cy;
                oRY[c] = oRY[p] + pRY[i];
                gridMove(c);
            }
        }
        i = i + 1;
    }
}

// ---- countdown timers --------------------------------------------------
function timerSet(i, sec) {
    if (i >= 1) {
        if (i <= NTIMER) { timerV[i] = sec; }
    }
}
function updateTimers() {
    let i = 1;
    while (i <= NTIMER) {
        if (timerV[i] > 0) {
            timerV[i] = timerV[i] - dt;
            if (timerV[i] < 0) { timerV[i] = 0; }
        }
        i = i + 1;
    }
}

// ---- cinematic camera --------------------------------------------------
function camTweenTo(x, y, z, lx, ly, lz, sec) {
    camTwX0 = camX; camTwY0 = camY; camTwZ0 = camZ;
    camTwX1 = x; camTwY1 = y; camTwZ1 = z;
    camTwLX = lx; camTwLY = ly; camTwLZ = lz;
    camTwT = 0;
    camTwDur = sec;
    if (camTwDur <= 0) { camTwDur = 0.001; }
    camTwLook = 1;
}
function camTweenStop() { camTwLook = 0; }

function updateCamTween() {
    if (camTwLook == 1) {
        camTwT = camTwT + dt;
        let u = camTwT / camTwDur;
        if (u > 1) { u = 1; }
        let e = u * u * (3 - 2 * u);
        camX = camTwX0 + (camTwX1 - camTwX0) * e;
        camY = camTwY0 + (camTwY1 - camTwY0) * e;
        camZ = camTwZ0 + (camTwZ1 - camTwZ0) * e;
        camLookAt(camTwLX, camTwLY, camTwLZ);
        if (u >= 1) { camTwLook = 0; }
    }
}

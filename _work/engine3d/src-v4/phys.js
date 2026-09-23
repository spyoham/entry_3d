// ============================================================
// phys.js - the physics world.
//
//   body kinds:  0 none   1 동적(움직임+충돌)   2 고정   3 센서(통과)   4 움직이는 발판
//   colliders :  box (half extents from the mesh bounds) or sphere (oShape = 1)
//   broadphase:  a uniform GW x GW grid of the static bodies, plus a "big"
//                list for statics that cover too many cells (floors)
// ============================================================
let gravity = 22;
let airDrag = 0.02;
let worldB = 0;                 // half size of the invisible wall box (0 = off)
let worldTop = 200;
let nDyn = 0; let nKin = 0; let nSen = 0; let nBig = 0; let nGE = 0;
let nHit = 0;
let bounceMin = 1.2;            // below this speed a bounce just stops

let dynList = []; let kinList = []; let senList = []; let bigList = [];
let gHead = []; let gNext = []; let gObj = [];
let hitA = []; let hitB = [];

// raycast results
let rayHit = 0; let rayObj = 0; let rayDist = 0;
let rayX = 0; let rayY = 0; let rayZ = 0;

// scratch
let ovX = 0; let ovY = 0; let ovZ = 0; let ovOk = 0;
let subN = 1; let subH = 0.016;

function setGravity(g) { gravity = g; }
function setWorldBounds(size, top) { worldB = size; worldTop = top; }

// ---- body registration -------------------------------------------------
function setBody(id, kind) {
    alive(id);
    if (aliveRes == 1) {
        let was = oBody[id];
        if (was != kind) {
            oBody[id] = kind;
            if (kind == 1) { bodyListAdd(1, id); }
            if (kind == 3) { bodyListAdd(3, id); }
            if (kind == 4) { bodyListAdd(4, id); }
            if (kind == 2) { gridAdd(id); }
            oPX[id] = oX[id]; oPY[id] = oY[id]; oPZ[id] = oZ[id];
        }
    }
}

// an id is only ever listed once, so a slot that gets deleted and handed out
// again does not end up being stepped twice per frame
function bodyListAdd(which, id) {
    let found = 0;
    let i = 1;
    if (which == 1) {
        while (i <= nDyn) { if (dynList[i] == id) { found = 1; i = nDyn; } i = i + 1; }
        if (found == 0) { if (nDyn < MAXOBJ) { nDyn = nDyn + 1; dynList[nDyn] = id; } }
    } else if (which == 3) {
        while (i <= nSen) { if (senList[i] == id) { found = 1; i = nSen; } i = i + 1; }
        if (found == 0) { if (nSen < MAXOBJ) { nSen = nSen + 1; senList[nSen] = id; } }
    } else {
        while (i <= nKin) { if (kinList[i] == id) { found = 1; i = nKin; } i = i + 1; }
        if (found == 0) { if (nKin < MAXOBJ) { nKin = nKin + 1; kinList[nKin] = id; } }
    }
}

function gridAdd(id) {
    let x0 = Math.floor((oX[id] - oHX[id] - GORG) / GCELL);
    let x1 = Math.floor((oX[id] + oHX[id] - GORG) / GCELL);
    let z0 = Math.floor((oZ[id] - oHZ[id] - GORG) / GCELL);
    let z1 = Math.floor((oZ[id] + oHZ[id] - GORG) / GCELL);
    if (x0 < 0) { x0 = 0; }
    if (z0 < 0) { z0 = 0; }
    if (x1 > GW - 1) { x1 = GW - 1; }
    if (z1 > GW - 1) { z1 = GW - 1; }
    let big = 0;
    if (x1 - x0 > 10) { big = 1; }
    if (z1 - z0 > 10) { big = 1; }
    if (x1 < x0) { big = 1; }
    if (z1 < z0) { big = 1; }
    if (big == 1) {
        if (nBig < 60) { nBig = nBig + 1; bigList[nBig] = id; }
    } else {
        let cz = z0;
        while (cz <= z1) {
            let cx = x0;
            while (cx <= x1) {
                if (nGE < MAXGE) {
                    nGE = nGE + 1;
                    gObj[nGE] = id;
                    let cell = cz * GW + cx + 1;
                    gNext[nGE] = gHead[cell];
                    gHead[cell] = nGE;
                }
                cx = cx + 1;
            }
            cz = cz + 1;
        }
    }
}

function setBounce(id, b, f) {
    alive(id);
    if (aliveRes == 1) { oBounce[id] = b; oFric[id] = f; }
}
function setVel(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) { oVX[id] = x; oVY[id] = y; oVZ[id] = z; oSleep[id] = 0; }
}
function addForce(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) {
        let m = oMass[id];
        if (m < 0.01) { m = 0.01; }
        oVX[id] = oVX[id] + x / m;
        oVY[id] = oVY[id] + y / m;
        oVZ[id] = oVZ[id] + z / m;
        oSleep[id] = 0;
    }
}
function setMass(id, m) { alive(id); if (aliveRes == 1) { oMass[id] = m; } }
function setSphereShape(id, s) { alive(id); if (aliveRes == 1) { oShape[id] = s; } }

// jump to roughly `h` units high
function doJump(id, h) {
    alive(id);
    if (aliveRes == 1) {
        if (oGround[id] == 1) {
            oVY[id] = Math.sqrt(2 * gravity * h);
            oGround[id] = 0;
            oSleep[id] = 0;
        }
    }
}

// ---- one dynamic body against one solid --------------------------------
// writes the push-out vector into ovX/ovY/ovZ, ovOk = 1 when they overlap
function overlapTest(d, s) {
    ovOk = 0;
    let dx = oX[d] - oX[s];
    let dy = oY[d] - oY[s];
    let dz = oZ[d] - oZ[s];
    if (oShape[s] == 2) {
        rampTest(d, s);
    } else if (oShape[d] == 1) {
        // sphere against box: push along the vector to the closest point
        let r = oHX[d];
        if (oHY[d] > r) { r = oHY[d]; }
        let px = dx; let py = dy; let pz = dz;
        let hx = oHX[s]; let hy = oHY[s]; let hz = oHZ[s];
        if (px > hx) { px = hx; }
        if (px < 0 - hx) { px = 0 - hx; }
        if (py > hy) { py = hy; }
        if (py < 0 - hy) { py = 0 - hy; }
        if (pz > hz) { pz = hz; }
        if (pz < 0 - hz) { pz = 0 - hz; }
        let qx = dx - px; let qy = dy - py; let qz = dz - pz;
        let L2 = qx * qx + qy * qy + qz * qz;
        if (L2 < r * r) {
            ovOk = 1;
            let L = Math.sqrt(L2);
            if (L > 0.0001) {
                let k = (r - L) / L;
                ovX = qx * k; ovY = qy * k; ovZ = qz * k;
            } else {
                // centre inside the box: fall back to the shallowest face
                boxPush(dx, dy, dz, oHX[d] + hx, r + hy, oHZ[d] + hz);
            }
        }
    } else {
        let ex = oHX[d] + oHX[s] - Math.abs(dx);
        if (ex > 0) {
            let ey = oHY[d] + oHY[s] - Math.abs(dy);
            if (ey > 0) {
                let ez = oHZ[d] + oHZ[s] - Math.abs(dz);
                if (ez > 0) {
                    ovOk = 1;
                    ovX = 0; ovY = 0; ovZ = 0;
                    if (ey <= ex) {
                        if (ey <= ez) {
                            if (dy >= 0) { ovY = ey; } else { ovY = 0 - ey; }
                        } else if (dz >= 0) { ovZ = ez; } else { ovZ = 0 - ez; }
                    } else if (ex <= ez) {
                        if (dx >= 0) { ovX = ex; } else { ovX = 0 - ex; }
                    } else if (dz >= 0) { ovZ = ez; } else { ovZ = 0 - ez; }
                }
            }
        }
    }
}

// a ramp is a slope you can walk up: work in the ramp's own frame and lift the
// body onto the sloped surface. It rises along the ramp's local +z.
function rampTest(d, s) {
    ovOk = 0;
    let m = oMesh[s];
    let ry = oRY[s];
    let cy = cosd(ry);
    let sy = sind(ry);
    let wx = oX[d] - oX[s];
    let wz = oZ[d] - oZ[s];
    let lx = wx * cy - wz * sy;
    let lz = wx * sy + wz * cy;
    let hx = mHX[m] * oSX[s];
    let hy = mHY[m] * oSY[s];
    let hz = mHZ[m] * oSZ[s];
    if (Math.abs(lx) < hx + oHX[d] * 0.7) {
        if (Math.abs(lz) < hz + oHZ[d] * 0.7) {
            let t = (lz + hz) / (2 * hz);
            if (t < 0) { t = 0; }
            if (t > 1) { t = 1; }
            let surf = oY[s] - hy + 2 * hy * t;
            let bottom = oY[d] - oHY[d];
            if (bottom < surf) {
                if (surf - bottom < 2 * hy + oHY[d]) {
                    ovX = 0; ovY = surf - bottom; ovZ = 0;
                    ovOk = 1;
                }
            }
        }
    }
}

function boxPush(dx, dy, dz, sx, sy, sz) {
    let ex = sx - Math.abs(dx);
    let ey = sy - Math.abs(dy);
    let ez = sz - Math.abs(dz);
    ovX = 0; ovY = 0; ovZ = 0;
    if (ey <= ex) {
        if (ey <= ez) {
            if (dy >= 0) { ovY = ey; } else { ovY = 0 - ey; }
        } else if (dz >= 0) { ovZ = ez; } else { ovZ = 0 - ez; }
    } else if (ex <= ez) {
        if (dx >= 0) { ovX = ex; } else { ovX = 0 - ex; }
    } else if (dz >= 0) { ovZ = ez; } else { ovZ = 0 - ez; }
}

function addHit(a, b) {
    oHit[a] = b;
    oHit[b] = a;
    if (nHit < MAXHIT) {
        nHit = nHit + 1;
        hitA[nHit] = a; hitB[nHit] = b;
    }
}

// push `d` out of the solid `s` and kill the velocity along the contact normal
function resolveSolid(d, s) {
    overlapTest(d, s);
    if (ovOk == 1) {
        oX[d] = oX[d] + ovX;
        oY[d] = oY[d] + ovY;
        oZ[d] = oZ[d] + ovZ;
        let bn = oBounce[d];
        if (ovY > 0.00001) {
            oGround[d] = 1;
            oGObj[d] = s;
            if (oVY[d] < 0) {
                if (oVY[d] < 0 - bounceMin) { oVY[d] = 0 - oVY[d] * bn; }
                else { oVY[d] = 0; }
            }
        } else if (ovY < -0.00001) {
            if (oVY[d] > 0) { oVY[d] = 0 - oVY[d] * bn; }
        }
        if (ovX > 0.00001) { if (oVX[d] < 0) { oVX[d] = 0 - oVX[d] * bn; } }
        if (ovX < -0.00001) { if (oVX[d] > 0) { oVX[d] = 0 - oVX[d] * bn; } }
        if (ovZ > 0.00001) { if (oVZ[d] < 0) { oVZ[d] = 0 - oVZ[d] * bn; } }
        if (ovZ < -0.00001) { if (oVZ[d] > 0) { oVZ[d] = 0 - oVZ[d] * bn; } }
        addHit(d, s);
    }
}

// every static near `d`: the grid cells it covers, plus the oversized ones
function resolveStatics(d) {
    let i = 1;
    while (i <= nBig) {
        if (oBody[bigList[i]] == 2) { resolveSolid(d, bigList[i]); }
        i = i + 1;
    }
    let x0 = Math.floor((oX[d] - oHX[d] - GORG) / GCELL);
    let x1 = Math.floor((oX[d] + oHX[d] - GORG) / GCELL);
    let z0 = Math.floor((oZ[d] - oHZ[d] - GORG) / GCELL);
    let z1 = Math.floor((oZ[d] + oHZ[d] - GORG) / GCELL);
    if (x0 < 0) { x0 = 0; }
    if (z0 < 0) { z0 = 0; }
    if (x1 > GW - 1) { x1 = GW - 1; }
    if (z1 > GW - 1) { z1 = GW - 1; }
    let cz = z0;
    while (cz <= z1) {
        let cx = x0;
        while (cx <= x1) {
            let e = gHead[cz * GW + cx + 1];
            while (e > 0) {
                let s = gObj[e];
                if (oBody[s] == 2) { resolveSolid(d, s); }
                e = gNext[e];
            }
            cx = cx + 1;
        }
        cz = cz + 1;
    }
    let k = 1;
    while (k <= nKin) {
        if (oBody[kinList[k]] == 4) { resolveSolid(d, kinList[k]); }
        k = k + 1;
    }
}

// ---- the step ----------------------------------------------------------
function physStep() {
    nHit = 0;
    let i = 1;
    while (i <= nDyn) {
        oHit[dynList[i]] = 0;
        i = i + 1;
    }
    // a body standing on a moving platform rides along with it
    i = 1;
    while (i <= nDyn) {
        let d = dynList[i];
        let g = oGObj[d];
        if (g > 0) {
            if (oGround[d] == 1) {
                if (oBody[g] == 4) {
                    oX[d] = oX[d] + oX[g] - oPX[g];
                    oY[d] = oY[d] + oY[g] - oPY[g];
                    oZ[d] = oZ[d] + oZ[g] - oPZ[g];
                }
            }
        }
        i = i + 1;
    }
    i = 1;
    while (i <= nKin) {
        let k = kinList[i];
        oPX[k] = oX[k]; oPY[k] = oY[k]; oPZ[k] = oZ[k];
        i = i + 1;
    }
    subN = Math.ceil(dt / 0.026);
    if (subN < 1) { subN = 1; }
    if (subN > 3) { subN = 3; }
    subH = dt / subN;
    let s = 1;
    while (s <= subN) {
        let j = 1;
        while (j <= nDyn) {
            stepBody(dynList[j]);
            j = j + 1;
        }
        // dynamic against dynamic
        j = 1;
        while (j < nDyn) {
            let a = dynList[j];
            if (oBody[a] == 1) {
                let k = j + 1;
                while (k <= nDyn) {
                    let b = dynList[k];
                    if (oBody[b] == 1) {
                        if (oSleep[a] + oSleep[b] < 2) { pairDyn(a, b); }
                    }
                    k = k + 1;
                }
            }
            j = j + 1;
        }
        s = s + 1;
    }
    sensorPass();
    // control only lasts for the frame it was given in
    let c = 1;
    while (c <= nDyn) { oCtl[dynList[c]] = 0; c = c + 1; }
}

// A body that has come to rest on solid ground stops being simulated until
// something touches it, sets its speed or moves it. Most of the props in a
// scene are asleep, which is what keeps the physics affordable.
function stepBody(d) {
    if (oBody[d] == 1) {
      if (oSleep[d] == 0) {
        oVY[d] = oVY[d] - gravity * subH;
        let ctl = oCtl[d];
        if (ctl == 1) {
            // a walking character owns its horizontal speed: re-apply the
            // commanded velocity every substep so friction cannot eat it
            oVX[d] = oCX[d];
            oVZ[d] = oCZ[d];
        }
        let drag = 1 - airDrag * subH;
        oVX[d] = oVX[d] * drag;
        oVZ[d] = oVZ[d] * drag;
        oX[d] = oX[d] + oVX[d] * subH;
        oY[d] = oY[d] + oVY[d] * subH;
        oZ[d] = oZ[d] + oVZ[d] * subH;
        oGround[d] = 0;
        oGObj[d] = 0;
        resolveStatics(d);
        if (oGround[d] == 1) {
            if (ctl == 0) {
                let f = 1 - oFric[d] * subH * 9;
                if (f < 0) { f = 0; }
                oVX[d] = oVX[d] * f;
                oVZ[d] = oVZ[d] * f;
            }
        }
        if (worldB > 0) {
            let b = worldB - oHX[d];
            if (oX[d] > b) { oX[d] = b; if (oVX[d] > 0) { oVX[d] = 0 - oVX[d] * oBounce[d]; } }
            if (oX[d] < 0 - b) { oX[d] = 0 - b; if (oVX[d] < 0) { oVX[d] = 0 - oVX[d] * oBounce[d]; } }
            let bz = worldB - oHZ[d];
            if (oZ[d] > bz) { oZ[d] = bz; if (oVZ[d] > 0) { oVZ[d] = 0 - oVZ[d] * oBounce[d]; } }
            if (oZ[d] < 0 - bz) { oZ[d] = 0 - bz; if (oVZ[d] < 0) { oVZ[d] = 0 - oVZ[d] * oBounce[d]; } }
            if (oY[d] > worldTop) { oY[d] = worldTop; if (oVY[d] > 0) { oVY[d] = 0; } }
        }
        if (oGround[d] == 1) {
            if (oCtl[d] == 0) {
                if (oBody[oGObj[d]] != 4) {
                    let sp = Math.abs(oVX[d]) + Math.abs(oVY[d]) + Math.abs(oVZ[d]);
                    if (sp < 0.22) {
                        oVX[d] = 0; oVY[d] = 0; oVZ[d] = 0;
                        oSleep[d] = 1;
                    }
                }
            }
        }
      }
    }
}

// two dynamics: split the push by mass and swap a little momentum
function pairDyn(a, b) {
    overlapTest(a, b);
    if (ovOk == 1) {
        let ma = oMass[a]; let mb = oMass[b];
        if (ma < 0.01) { ma = 0.01; }
        if (mb < 0.01) { mb = 0.01; }
        let ka = mb / (ma + mb);
        let kb = 1 - ka;
        oSleep[a] = 0; oSleep[b] = 0;
        oX[a] = oX[a] + ovX * ka; oY[a] = oY[a] + ovY * ka; oZ[a] = oZ[a] + ovZ * ka;
        oX[b] = oX[b] - ovX * kb; oY[b] = oY[b] - ovY * kb; oZ[b] = oZ[b] - ovZ * kb;
        let L = Math.sqrt(ovX * ovX + ovY * ovY + ovZ * ovZ);
        if (L > 0.00001) {
            let nx = ovX / L; let ny = ovY / L; let nz = ovZ / L;
            let rel = (oVX[a] - oVX[b]) * nx + (oVY[a] - oVY[b]) * ny + (oVZ[a] - oVZ[b]) * nz;
            if (rel < 0) {
                let e = oBounce[a];
                if (oBounce[b] < e) { e = oBounce[b]; }
                let jj = 0 - (1 + e) * rel / (1 / ma + 1 / mb);
                oVX[a] = oVX[a] + jj * nx / ma;
                oVY[a] = oVY[a] + jj * ny / ma;
                oVZ[a] = oVZ[a] + jj * nz / ma;
                oVX[b] = oVX[b] - jj * nx / mb;
                oVY[b] = oVY[b] - jj * ny / mb;
                oVZ[b] = oVZ[b] - jj * nz / mb;
            }
            if (ny > 0.5) { oGround[a] = 1; oGObj[a] = b; }
            if (ny < -0.5) { oGround[b] = 1; oGObj[b] = a; }
        }
        addHit(a, b);
    }
}

// sensors never push, they only report
function sensorPass() {
    let i = 1;
    while (i <= nSen) {
        let s = senList[i];
        if (oBody[s] == 3) {
            oHit[s] = 0;
            let j = 1;
            while (j <= nDyn) {
                let d = dynList[j];
                if (oBody[d] == 1) {
                    overlapTest(d, s);
                    if (ovOk == 1) { addHit(d, s); }
                }
                j = j + 1;
            }
        }
        i = i + 1;
    }
}

// a plain overlap question, no physics needed
function touchTest(a, b) {
    touch = 0;
    alive(a);
    let ok = aliveRes;
    alive(b);
    if (ok == 1) {
        if (aliveRes == 1) {
            if (Math.abs(oX[a] - oX[b]) < oHX[a] + oHX[b]) {
                if (Math.abs(oY[a] - oY[b]) < oHY[a] + oHY[b]) {
                    if (Math.abs(oZ[a] - oZ[b]) < oHZ[a] + oHZ[b]) { touch = 1; }
                }
            }
        }
    }
}

// ---- raycast -----------------------------------------------------------
// slab test against every body; `ignore` is skipped (usually the shooter)
function rayCast(x, y, z, dx, dy, dz, maxd, ignore) {
    rayHit = 0; rayObj = 0; rayDist = maxd;
    let L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 0.00001) { L = 1; }
    let ux = dx / L; let uy = dy / L; let uz = dz / L;
    let ix = 1000000; let iy = 1000000; let iz = 1000000;
    if (ux > 0.00001) { ix = 1 / ux; } else if (ux < -0.00001) { ix = 1 / ux; }
    if (uy > 0.00001) { iy = 1 / uy; } else if (uy < -0.00001) { iy = 1 / uy; }
    if (uz > 0.00001) { iz = 1 / uz; } else if (uz < -0.00001) { iz = 1 / uz; }
    let id = 1;
    while (id <= nObj) {
        let ok = 0;
        if (oBody[id] != 0) { if (id != ignore) { if (oVis[id] != 9) { ok = 1; } } }
        if (ok == 1) {
            let t0 = (oX[id] - oHX[id] - x) * ix;
            let t1 = (oX[id] + oHX[id] - x) * ix;
            let lo = t0;
            let hi = t1;
            if (t1 < t0) { lo = t1; hi = t0; }
            let s0 = (oY[id] - oHY[id] - y) * iy;
            let s1 = (oY[id] + oHY[id] - y) * iy;
            let a2 = s0;
            let b2 = s1;
            if (s1 < s0) { a2 = s1; b2 = s0; }
            if (a2 > lo) { lo = a2; }
            if (b2 < hi) { hi = b2; }
            let u0 = (oZ[id] - oHZ[id] - z) * iz;
            let u1 = (oZ[id] + oHZ[id] - z) * iz;
            let a3 = u0;
            let b3 = u1;
            if (u1 < u0) { a3 = u1; b3 = u0; }
            if (a3 > lo) { lo = a3; }
            if (b3 < hi) { hi = b3; }
            if (hi >= lo) {
                if (lo < rayDist) {
                    if (hi > 0) {
                        let t = lo;
                        if (t < 0) { t = 0; }
                        if (t < rayDist) {
                            rayDist = t;
                            rayObj = id;
                            rayHit = 1;
                        }
                    }
                }
            }
        }
        id = id + 1;
    }
    rayX = x + ux * rayDist;
    rayY = y + uy * rayDist;
    rayZ = z + uz * rayDist;
    if (rayHit == 0) { rayDist = maxd; }
}

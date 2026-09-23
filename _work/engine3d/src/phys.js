// ============================================================
// phys.js - the physics world.
//
//   body kinds:  0 none   1 동적(움직임+충돌)   2 고정   3 센서(통과)   4 움직이는 발판
//   body shapes: 0 box  1 sphere  2 ramp  3 capsule  4 terrain   (packed in oFlag)
//   broadphase:  the fine spatial hash from core.js, plus the "big" list for
//                solids that cover too many cells (floors, terrain chunks)
//   Everything a moving body needs beyond position lives in the body side
//   table (bMass, bPX, ...) addressed by oBSlot, so static scenery costs
//   nothing but its 24 object list entries.
// ============================================================
let gravity = 22;
let airDrag = 0.02;
let worldB = 0;                 // half size of the invisible wall box (0 = off)
let worldTop = 200;
let stepH = 0.45;               // how high a body climbs without jumping
let slopeMax = 48;              // steeper than this and you slide back down
let slideAcc = 14;
let bounceMin = 1.2;            // below this speed a bounce just stops
let nHit = 0;
let nBFree = 0;

let hitA = []; let hitB = [];
let bFreeList = [];

// raycast results
let rayHit = 0; let rayObj = 0; let rayDist = 0;
let rayX = 0; let rayY = 0; let rayZ = 0;

// scratch
let ovX = 0; let ovY = 0; let ovZ = 0; let ovOk = 0;
let subN = 1; let subH = 0.016;
let slotRes = 0;

function setGravity(g) { gravity = g; }
function setWorldBounds(size, top) { worldB = size; worldTop = top; }
function setStepHeight(h) { stepH = h; }
function setSlopeLimit(deg) { slopeMax = deg; }

// ---- body registration -------------------------------------------------
function bodySlot(id) {
    let s = oBSlot[id];
    if (s == 0) {
        if (nBFree > 0) { s = bFreeList[nBFree]; nBFree = nBFree - 1; }
        else if (nBody < MAXBODY) {
            nBody = nBody + 1;
            s = nBody;
            if (bObj.length < s) {
                bObj.push(0); bMass.push(1); bBounce.push(0.2); bFric.push(0.8);
                bGObj.push(0); bPX.push(0); bPY.push(0); bPZ.push(0); bYaw.push(0);
                bCX.push(0); bCZ.push(0);
            }
        }
        if (s > 0) {
            bObj[s] = id;
            bMass[s] = 1; bBounce[s] = 0.2; bFric[s] = 0.8; bGObj[s] = 0;
            bPX[s] = oX[id]; bPY[s] = oY[id]; bPZ[s] = oZ[id]; bYaw[s] = oRY[id];
            bCX[s] = 0; bCZ[s] = 0;
            oBSlot[id] = s;
        } else { warnMsg = str('움직이는 물체가 너무 많습니다. 최대 ', MAXBODY, '개'); }
    }
    slotRes = s;
}

function setBody(id, kind) {
    alive(id);
    if (aliveRes == 1) {
        let was = oBody[id];
        if (was != kind) {
            if (was == 2) { physRemove(id); }
            oBody[id] = kind;
            if (kind == 2) { physInsert(id); }
            else if (kind != 0) { bodySlot(id); }
            if (kind == 0) {
                let s = oBSlot[id];
                if (s > 0) {
                    bObj[s] = 0;
                    oBSlot[id] = 0;
                    nBFree = nBFree + 1;
                    if (bFreeList.length < nBFree) { bFreeList.push(s); } else { bFreeList[nBFree] = s; }
                }
            }
        }
    }
}

function setBounce(id, b, f) {
    alive(id);
    if (aliveRes == 1) {
        bodySlot(id);
        if (slotRes > 0) { bBounce[slotRes] = b; bFric[slotRes] = f; }
    }
}
function setMass(id, m) {
    alive(id);
    if (aliveRes == 1) {
        bodySlot(id);
        if (slotRes > 0) { bMass[slotRes] = m; }
    }
}
function setVel(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) { oVX[id] = x; oVY[id] = y; oVZ[id] = z; putFlag(id, F_SLEEP, 0); }
}
function addForce(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) {
        let m = 1;
        let s = oBSlot[id];
        if (s > 0) { m = bMass[s]; }
        if (m < 0.01) { m = 0.01; }
        oVX[id] = oVX[id] + x / m;
        oVY[id] = oVY[id] + y / m;
        oVZ[id] = oVZ[id] + z / m;
        putFlag(id, F_SLEEP, 0);
    }
}
function setSphereShape(id, s) {
    alive(id);
    if (aliveRes == 1) {
        if (s == 1) { setShape(id, 1); } else { setShape(id, 0); }
    }
}
function setCapsuleShape(id, s) {
    alive(id);
    if (aliveRes == 1) {
        if (s == 1) { setShape(id, 3); } else { setShape(id, 0); }
    }
}

// jump to roughly `h` units high
function doJump(id, h) {
    alive(id);
    if (aliveRes == 1) {
        if (oGround[id] == 1) {
            oVY[id] = Math.sqrt(2 * gravity * h);
            oGround[id] = 0;
            putFlag(id, F_SLEEP, 0);
        }
    }
}

// ---- one body against one solid ----------------------------------------
// writes the push-out vector into ovX/ovY/ovZ, ovOk = 1 when they overlap
function overlapTest(d, s) {
    ovOk = 0;
    getShape(s);
    let ss = shapeRes;
    if (ss == 2) { rampTest(d, s); }
    else if (ss == 4) { terrainTest(d, s); }
    else if (oRY[s] != 0) { rotBoxTest(d, s); }
    else {
        getShape(d);
        let ds = shapeRes;
        let dx = oX[d] - oX[s];
        let dy = oY[d] - oY[s];
        let dz = oZ[d] - oZ[s];
        if (ds == 1) { sphereBox(d, s, dx, dy, dz, oHX[d]); }
        else if (ds == 3) {
            // a capsule is two spheres: try the feet, then the head
            let r = oHX[d];
            let off = oHY[d] - r;
            if (off < 0) { off = 0; }
            sphereBox(d, s, dx, dy - off, dz, r);
            if (ovOk == 0) { sphereBox(d, s, dx, dy + off, dz, r); }
        } else { boxBox(d, s, dx, dy, dz); }
    }
}

// axis-aligned box against axis-aligned box: push along the shallowest axis,
// but climb a low step instead of stopping dead
function boxBox(d, s, dx, dy, dz) {
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
                if (ovY == 0) { stepUp(d, s); }
            }
        }
    }
}

// a horizontal hit on something low enough becomes a step up
function stepUp(d, s) {
    if (oGround[d] == 1) {
        let rise = oY[s] + oHY[s] - (oY[d] - oHY[d]);
        if (rise > 0) {
            if (rise <= stepH) {
                ovX = 0; ovZ = 0;
                ovY = rise + 0.002;
            }
        }
    }
}

// sphere (centre offset dx,dy,dz, radius r) against the solid's box
function sphereBox(d, s, dx, dy, dz, r) {
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
            boxPush(dx, dy, dz, r + hx, r + hy, r + hz);
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

// A solid that has been turned around Y: work in its own frame and treat the
// body as a circle on the xz plane, which is exact for spheres and a good
// approximation for everything else.
function rotBoxTest(d, s) {
    let ry = oRY[s];
    let cy = cosd(ry);
    let sy = sind(ry);
    let wx = oX[d] - oX[s];
    let wz = oZ[d] - oZ[s];
    let lx = wx * cy - wz * sy;
    let lz = wx * sy + wz * cy;
    let m = oMesh[s];
    let hx = mHX[m] * oSX[s];
    let hz = mHZ[m] * oSZ[s];
    let r = oHX[d];
    if (oHZ[d] > r) { r = oHZ[d]; }
    let dy = oY[d] - oY[s];
    sphereBoxLocal(lx, dy, lz, hx, oHY[s], hz, r, oHY[d]);
    if (ovOk == 1) {
        // rotate the push back into world space
        let px = ovX * cy + ovZ * sy;
        let pz = ovZ * cy - ovX * sy;
        ovX = px; ovZ = pz;
        if (ovY == 0) { stepUp(d, s); }
    }
}

// circle-in-xz + slab-in-y against a box, all in the box's own frame
function sphereBoxLocal(lx, ly, lz, hx, hy, hz, r, bodyHY) {
    ovOk = 0;
    let ey = hy + bodyHY - Math.abs(ly);
    if (ey > 0) {
        let px = lx; let pz = lz;
        if (px > hx) { px = hx; }
        if (px < 0 - hx) { px = 0 - hx; }
        if (pz > hz) { pz = hz; }
        if (pz < 0 - hz) { pz = 0 - hz; }
        let qx = lx - px; let qz = lz - pz;
        let L2 = qx * qx + qz * qz;
        if (L2 < r * r) {
            ovOk = 1;
            let L = Math.sqrt(L2);
            let exz = r - L;
            if (L < 0.0001) { exz = r; qx = 1; qz = 0; L = 1; }
            if (ey <= exz) {
                ovX = 0; ovZ = 0;
                if (ly >= 0) { ovY = ey; } else { ovY = 0 - ey; }
            } else {
                let k = exz / L;
                ovX = qx * k; ovZ = qz * k; ovY = 0;
            }
        }
    }
}

// A ramp is a slope you can walk up: work in the ramp's own frame and lift the
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
                    // too steep to stand on? slide back down the slope
                    atan2d(2 * hy, 2 * hz);
                    if (oAtan > slopeMax) {
                        let dn = 0 - slideAcc * subH;
                        oVX[d] = oVX[d] + sy * dn;
                        oVZ[d] = oVZ[d] + cy * dn;
                    }
                }
            }
        }
    }
}

// a terrain chunk: hold the body on the sampled height field
function terrainTest(d, s) {
    ovOk = 0;
    if (Math.abs(oX[d] - oX[s]) < oHX[s] + oHX[d]) {
        if (Math.abs(oZ[d] - oZ[s]) < oHZ[s] + oHZ[d]) {
            terrainHeight(oX[d], oZ[d]);
            let surf = heightRes;
            let bottom = oY[d] - oHY[d];
            if (bottom < surf) {
                if (surf - bottom < 3 + oHY[d] * 2) {
                    ovX = 0; ovY = surf - bottom; ovZ = 0;
                    ovOk = 1;
                }
            }
        }
    }
}

function addHit(a, b) {
    oHit[a] = b;
    oHit[b] = a;
    if (nHit < MAXHIT) {
        nHit = nHit + 1;
        if (hitA.length < nHit) { hitA.push(a); hitB.push(b); }
        else { hitA[nHit] = a; hitB[nHit] = b; }
    }
}

// push `d` out of the solid `s` and kill the velocity along the contact normal
function resolveSolid(d, s) {
    overlapTest(d, s);
    if (ovOk == 1) {
        oX[d] = oX[d] + ovX;
        oY[d] = oY[d] + ovY;
        oZ[d] = oZ[d] + ovZ;
        let bn = 0.2;
        let sl = oBSlot[d];
        if (sl > 0) { bn = bBounce[sl]; }
        if (ovY > 0.00001) {
            oGround[d] = 1;
            if (sl > 0) { bGObj[sl] = s; }
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

// every solid near `d`: the hash cells its box covers, plus the oversized ones
function resolveStatics(d) {
    let i = 1;
    while (i <= nBig) {
        let g = bigList[i];
        if (oBody[g] == 2) { resolveSolid(d, g); }
        i = i + 1;
    }
    let x0 = Math.floor((oX[d] - oHX[d]) / GPC);
    let x1 = Math.floor((oX[d] + oHX[d]) / GPC);
    let z0 = Math.floor((oZ[d] - oHZ[d]) / GPC);
    let z1 = Math.floor((oZ[d] + oHZ[d]) / GPC);
    let cz = z0;
    while (cz <= z1) {
        let cx = x0;
        while (cx <= x1) {
            let e = gpHead[mod((cx + GBIAS) * 131 + (cz + GBIAS) * 401, NGP) + 1];
            while (e > 0) {
                let s = gpObj[e];
                if (oBody[s] == 2) { resolveSolid(d, s); }
                e = gpNext[e];
            }
            cx = cx + 1;
        }
        cz = cz + 1;
    }
    // moving platforms are few, so they are simply all tested
    let k = 1;
    while (k <= nBody) {
        let p = bObj[k];
        if (oBody[p] == 4) { resolveSolid(d, p); }
        k = k + 1;
    }
}

// ---- the step ----------------------------------------------------------
function physStep() {
    applyParents();
    nHit = 0;
    let i = 1;
    while (i <= nBody) {
        let d = bObj[i];
        if (d > 0) { oHit[d] = 0; }
        i = i + 1;
    }
    // a body standing on a moving platform rides along with it, turning too
    i = 1;
    while (i <= nBody) {
        let d = bObj[i];
        if (oBody[d] == 1) {
            if (oGround[d] == 1) {
                let g = bGObj[i];
                if (g > 0) {
                    if (oBody[g] == 4) {
                        let gs = oBSlot[g];
                        if (gs > 0) {
                            let ddx = oX[d] - bPX[gs];
                            let ddz = oZ[d] - bPZ[gs];
                            let da = oRY[g] - bYaw[gs];
                            let ca = cosd(da);
                            let sa = sind(da);
                            oX[d] = oX[g] + ddx * ca + ddz * sa;
                            oZ[d] = oZ[g] - ddx * sa + ddz * ca;
                            oY[d] = oY[d] + oY[g] - bPY[gs];
                            oRY[d] = oRY[d] + da;
                        }
                    }
                }
            }
        }
        i = i + 1;
    }
    i = 1;
    while (i <= nBody) {
        let k = bObj[i];
        if (oBody[k] == 4) {
            bPX[i] = oX[k]; bPY[i] = oY[k]; bPZ[i] = oZ[k]; bYaw[i] = oRY[k];
            gridMove(k);
        }
        i = i + 1;
    }
    subN = Math.ceil(dt / 0.026);
    if (subN < 1) { subN = 1; }
    if (subN > 3) { subN = 3; }
    subH = dt / subN;
    let n = 1;
    while (n <= subN) {
        let j = 1;
        while (j <= nBody) {
            let d = bObj[j];
            if (oBody[d] == 1) { stepBody(d, j); }
            j = j + 1;
        }
        // dynamic against dynamic
        j = 1;
        while (j < nBody) {
            let a = bObj[j];
            if (oBody[a] == 1) {
                let k = j + 1;
                while (k <= nBody) {
                    let b = bObj[k];
                    if (oBody[b] == 1) {
                        hasFlag(a, F_SLEEP);
                        let sa = flagRes;
                        hasFlag(b, F_SLEEP);
                        if (sa + flagRes < 2) { pairDyn(a, b); }
                    }
                    k = k + 1;
                }
            }
            j = j + 1;
        }
        n = n + 1;
    }
    sensorPass();
    // control only lasts for the frame it was given in
    let c = 1;
    while (c <= nBody) {
        let d = bObj[c];
        if (d > 0) { putFlag(d, F_CTL, 0); }
        c = c + 1;
    }
    gridHeal();
}

// A body that has come to rest on solid ground stops being simulated until
// something touches it, sets its speed or moves it.
function stepBody(d, s) {
    hasFlag(d, F_SLEEP);
    if (flagRes == 0) {
        oVY[d] = oVY[d] - gravity * subH;
        hasFlag(d, F_CTL);
        let ctl = flagRes;
        if (ctl == 1) {
            // a walking character owns its horizontal speed: re-apply the
            // commanded velocity every substep so friction cannot eat it
            oVX[d] = bCX[s];
            oVZ[d] = bCZ[s];
        }
        let drag = 1 - airDrag * subH;
        oVX[d] = oVX[d] * drag;
        oVZ[d] = oVZ[d] * drag;
        oX[d] = oX[d] + oVX[d] * subH;
        oY[d] = oY[d] + oVY[d] * subH;
        oZ[d] = oZ[d] + oVZ[d] * subH;
        oGround[d] = 0;
        bGObj[s] = 0;
        resolveStatics(d);
        if (oGround[d] == 1) {
            if (ctl == 0) {
                let f = 1 - bFric[s] * subH * 9;
                if (f < 0) { f = 0; }
                oVX[d] = oVX[d] * f;
                oVZ[d] = oVZ[d] * f;
            }
        }
        if (worldB > 0) {
            let bn = bBounce[s];
            let b = worldB - oHX[d];
            if (oX[d] > b) { oX[d] = b; if (oVX[d] > 0) { oVX[d] = 0 - oVX[d] * bn; } }
            if (oX[d] < 0 - b) { oX[d] = 0 - b; if (oVX[d] < 0) { oVX[d] = 0 - oVX[d] * bn; } }
            let bz = worldB - oHZ[d];
            if (oZ[d] > bz) { oZ[d] = bz; if (oVZ[d] > 0) { oVZ[d] = 0 - oVZ[d] * bn; } }
            if (oZ[d] < 0 - bz) { oZ[d] = 0 - bz; if (oVZ[d] < 0) { oVZ[d] = 0 - oVZ[d] * bn; } }
            if (oY[d] > worldTop) { oY[d] = worldTop; if (oVY[d] > 0) { oVY[d] = 0; } }
        }
        gridMove(d);
        if (oGround[d] == 1) {
            if (ctl == 0) {
                if (oBody[bGObj[s]] != 4) {
                    let sp = Math.abs(oVX[d]) + Math.abs(oVY[d]) + Math.abs(oVZ[d]);
                    if (sp < 0.22) {
                        oVX[d] = 0; oVY[d] = 0; oVZ[d] = 0;
                        putFlag(d, F_SLEEP, 1);
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
        let sa = oBSlot[a];
        let sb = oBSlot[b];
        let ma = 1;
        let mb = 1;
        let ea = 0.2;
        let eb = 0.2;
        if (sa > 0) { ma = bMass[sa]; ea = bBounce[sa]; }
        if (sb > 0) { mb = bMass[sb]; eb = bBounce[sb]; }
        if (ma < 0.01) { ma = 0.01; }
        if (mb < 0.01) { mb = 0.01; }
        putFlag(a, F_SLEEP, 0);
        putFlag(b, F_SLEEP, 0);
        let ka = mb / (ma + mb);
        let kb = 1 - ka;
        oX[a] = oX[a] + ovX * ka; oY[a] = oY[a] + ovY * ka; oZ[a] = oZ[a] + ovZ * ka;
        oX[b] = oX[b] - ovX * kb; oY[b] = oY[b] - ovY * kb; oZ[b] = oZ[b] - ovZ * kb;
        let L = Math.sqrt(ovX * ovX + ovY * ovY + ovZ * ovZ);
        if (L > 0.00001) {
            let nx = ovX / L; let ny = ovY / L; let nz = ovZ / L;
            let rel = (oVX[a] - oVX[b]) * nx + (oVY[a] - oVY[b]) * ny + (oVZ[a] - oVZ[b]) * nz;
            if (rel < 0) {
                let e = ea;
                if (eb < e) { e = eb; }
                let jj = 0 - (1 + e) * rel / (1 / ma + 1 / mb);
                oVX[a] = oVX[a] + jj * nx / ma;
                oVY[a] = oVY[a] + jj * ny / ma;
                oVZ[a] = oVZ[a] + jj * nz / ma;
                oVX[b] = oVX[b] - jj * nx / mb;
                oVY[b] = oVY[b] - jj * ny / mb;
                oVZ[b] = oVZ[b] - jj * nz / mb;
            }
            if (ny > 0.5) { oGround[a] = 1; if (sa > 0) { bGObj[sa] = b; } }
            if (ny < -0.5) { oGround[b] = 1; if (sb > 0) { bGObj[sb] = a; } }
        }
        addHit(a, b);
    }
}

// sensors never push, they only report
function sensorPass() {
    let i = 1;
    while (i <= nBody) {
        let s = bObj[i];
        if (oBody[s] == 3) {
            oHit[s] = 0;
            let j = 1;
            while (j <= nBody) {
                let d = bObj[j];
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

// Objects the user moved by writing straight into 오브젝트X/Y/Z never told the
// draw grid about it, so a slice of the world is re-checked every frame.
function gridHeal() {
    let n = Math.floor(nObj / 16) + 2;
    let i = 0;
    while (i < n) {
        scanPtr = scanPtr + 1;
        if (scanPtr > nObj) { scanPtr = 1; }
        if (oVis[scanPtr] != 9) { gridMove(scanPtr); }
        i = i + 1;
    }
}

// ---- questions a game asks ---------------------------------------------
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
    touchObj = 0;
    if (touch == 1) { touchObj = b; }
}

// did this object touch anything carrying that name tag this frame?
function touchTag(id, tag) {
    touch = 0;
    touchObj = 0;
    let i = 1;
    while (i <= nHit) {
        let a = hitA[i];
        let b = hitB[i];
        let other = 0;
        if (a == id) { other = b; }
        if (b == id) { other = a; }
        if (other > 0) {
            if (oTag[other] == tag) {
                touch = 1;
                touchObj = other;
                i = nHit;
            }
        }
        i = i + 1;
    }
}

// is a point inside an axis-aligned area? (goal zones, rooms, kill planes)
function inBox(x, y, z, cx, cy, cz, w, h, d) {
    touch = 0;
    if (Math.abs(x - cx) < w / 2) {
        if (Math.abs(y - cy) < h / 2) {
            if (Math.abs(z - cz) < d / 2) { touch = 1; }
        }
    }
}
function nearPoint(id, x, y, z, r) {
    touch = 0;
    alive(id);
    if (aliveRes == 1) {
        let dx = oX[id] - x; let dy = oY[id] - y; let dz = oZ[id] - z;
        if (dx * dx + dy * dy + dz * dz < r * r) { touch = 1; }
    }
}

// ---- raycast -----------------------------------------------------------
// Marches the physics grid cell by cell instead of testing every object, so a
// world with thousands of blocks answers just as fast as an empty one.
function raySlab(id, x, y, z, ux, uy, uz) {
    let lo = 0 - 99999;
    let hi = 99999;
    let t0 = 0;
    let t1 = 0;
    if (ux > 0.00001) { t0 = (oX[id] - oHX[id] - x) / ux; t1 = (oX[id] + oHX[id] - x) / ux; }
    else if (ux < -0.00001) { t1 = (oX[id] - oHX[id] - x) / ux; t0 = (oX[id] + oHX[id] - x) / ux; }
    else {
        t0 = 0 - 99999; t1 = 99999;
        if (Math.abs(x - oX[id]) > oHX[id]) { t0 = 99999; t1 = 0 - 99999; }
    }
    if (t0 > lo) { lo = t0; }
    if (t1 < hi) { hi = t1; }
    if (uy > 0.00001) { t0 = (oY[id] - oHY[id] - y) / uy; t1 = (oY[id] + oHY[id] - y) / uy; }
    else if (uy < -0.00001) { t1 = (oY[id] - oHY[id] - y) / uy; t0 = (oY[id] + oHY[id] - y) / uy; }
    else {
        t0 = 0 - 99999; t1 = 99999;
        if (Math.abs(y - oY[id]) > oHY[id]) { t0 = 99999; t1 = 0 - 99999; }
    }
    if (t0 > lo) { lo = t0; }
    if (t1 < hi) { hi = t1; }
    if (uz > 0.00001) { t0 = (oZ[id] - oHZ[id] - z) / uz; t1 = (oZ[id] + oHZ[id] - z) / uz; }
    else if (uz < -0.00001) { t1 = (oZ[id] - oHZ[id] - z) / uz; t0 = (oZ[id] + oHZ[id] - z) / uz; }
    else {
        t0 = 0 - 99999; t1 = 99999;
        if (Math.abs(z - oZ[id]) > oHZ[id]) { t0 = 99999; t1 = 0 - 99999; }
    }
    if (t0 > lo) { lo = t0; }
    if (t1 < hi) { hi = t1; }
    slabLo = lo;
    slabHi = hi;
}

let slabLo = 0; let slabHi = 0;

function rayTry(id, x, y, z, ux, uy, uz, ignore) {
    let ok = 0;
    if (oBody[id] != 0) { if (id != ignore) { if (oVis[id] != 9) { ok = 1; } } }
    if (ok == 1) {
        raySlab(id, x, y, z, ux, uy, uz);
        if (slabHi >= slabLo) {
            if (slabHi > 0) {
                let t = slabLo;
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

function rayCast(x, y, z, dx, dy, dz, maxd, ignore) {
    rayHit = 0; rayObj = 0; rayDist = maxd;
    let L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 0.00001) { L = 1; }
    let ux = dx / L; let uy = dy / L; let uz = dz / L;
    let i = 1;
    while (i <= nBig) {
        rayTry(bigList[i], x, y, z, ux, uy, uz, ignore);
        i = i + 1;
    }
    // every body that moves is few in number, so they are all tested
    i = 1;
    while (i <= nBody) {
        let b = bObj[i];
        if (b > 0) { rayTry(b, x, y, z, ux, uy, uz, ignore); }
        i = i + 1;
    }
    // ...and the solids are walked cell by cell along the ray
    let cx = Math.floor(x / GPC);
    let cz = Math.floor(z / GPC);
    let stepX = 1;
    let stepZ = 1;
    if (ux < 0) { stepX = -1; }
    if (uz < 0) { stepZ = -1; }
    let tmx = 99999;
    let tmz = 99999;
    let tdx = 99999;
    let tdz = 99999;
    if (Math.abs(ux) > 0.00001) {
        tdx = Math.abs(GPC / ux);
        let bx = (cx + (stepX + 1) / 2) * GPC;
        tmx = (bx - x) / ux;
    }
    if (Math.abs(uz) > 0.00001) {
        tdz = Math.abs(GPC / uz);
        let bz = (cz + (stepZ + 1) / 2) * GPC;
        tmz = (bz - z) / uz;
    }
    let travelled = 0;
    let guard = 0;
    while (guard < 64) {
        let e = gpHead[mod((cx + GBIAS) * 131 + (cz + GBIAS) * 401, NGP) + 1];
        while (e > 0) {
            let s = gpObj[e];
            if (oBody[s] == 2) { rayTry(s, x, y, z, ux, uy, uz, ignore); }
            e = gpNext[e];
        }
        if (tmx < tmz) { travelled = tmx; cx = cx + stepX; tmx = tmx + tdx; }
        else { travelled = tmz; cz = cz + stepZ; tmz = tmz + tdz; }
        guard = guard + 1;
        if (travelled > maxd) { guard = 99; }
        if (travelled > rayDist) { guard = 99; }
    }
    rayX = x + ux * rayDist;
    rayY = y + uy * rayDist;
    rayZ = z + uz * rayDist;
    if (rayHit == 0) { rayDist = maxd; }
}

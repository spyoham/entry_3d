// ============================================================
// render.js - the perspective (or orthographic) renderer, built on Entry's
// pen-fill primitive.
//
//   per frame: walk the draw-grid cells around the camera -> cull object ->
//   one 3x3 matrix per object -> transform its mesh once -> per face: light,
//   fog, near-plane clip, back-face cull by signed screen area -> bucket by
//   depth -> fill back to front (painter's algorithm).
//
// Winding rule: a face is visible when its screen area is positive, which
// means (B-A)x(C-A) points INTO the solid - the outward normal stored in the
// mesh is the negated cross product.
// ============================================================
let camX = 0; let camY = 3; let camZ = -8;
let camYaw = 0; let camPitch = 0; let camRoll = 0; let camFov = 70;
let camScale = 300; let tanHalf = 0.7;
let projA = 0; let projB = 300;              // screen scale = projA + projB / z
let orthoOn = 0; let orthoSize = 20;
let cfX = 0; let cfY = 0; let cfZ = 1;       // forward
let crX = 1; let crY = 0; let crZ = 0;       // right
let cuX = 0; let cuY = 1; let cuZ = 0;       // up
let chX = 0; let chZ = 1;                    // forward, flattened
let csX = 1; let csZ = 0;                    // right, flattened

let skyR = 118; let skyG = 178; let skyB = 226;
let skyTopR = 40; let skyTopG = 96; let skyTopB = 190;
let gndR = 96; let gndG = 128; let gndB = 92;
let fogFar = 110;
let skyOn = 1;
let shadowOn = 1; let shadowY = 0; let shadowFar = 45;
let drawMode = 0;                            // 0 fill, 1 wire, 2 fill + wire
let maxFaces = 460;
let lodSize = 30;                            // pixel size where the cheap mesh takes over
let lodFar = 50;                             // ...or simply this far away
let wireHex = '#12161c';
let debugOn = 0;

let lightX = -0.42; let lightY = 0.80; let lightZ = -0.42;
let lightI = 0.62; let ambI = 0.45;

let nSv = 0; let nPg = 0; let nDraw = 0; let drawn = 0; let nSeen = 0;
let polyOk = 0; let polyStart = 0; let polyN = 0; let polyFlip = 0;
let layerBias = 0;
let clipOn = 1;
let pushIdx = 0;
let scrX = 0; let scrY = 0; let scrFront = 0;
let shakeT = 0; let shakeA = 0;
let outHex = '#808080';

// per-object matrix (camera-space) and light in object space
let m00 = 1; let m01 = 0; let m02 = 0;
let m10 = 0; let m11 = 1; let m12 = 0;
let m20 = 0; let m21 = 0; let m22 = 1;
let mtX = 0; let mtY = 0; let mtZ = 0;
let loX = 0; let loY = 1; let loZ = 0;

let tvX = []; let tvY = []; let tvZ = [];
let tsX = []; let tsY = [];
let pgX = []; let pgY = [];
let dStart = []; let dCount = []; let dHex = []; let dNext = [];
let bHead = [];

// ============================================================
// camera
// ============================================================
function setupCam() {
    let cp = cosd(camPitch);
    let sp = sind(camPitch);
    let sy = sind(camYaw);
    let cy = cosd(camYaw);
    cfX = sy * cp; cfY = sp; cfZ = cy * cp;
    chX = sy; chZ = cy;
    csX = cy; csZ = 0 - sy;
    let ux = 0 - sy * sp;
    let uy = cp;
    let uz = 0 - cy * sp;
    let cr = cosd(camRoll);
    let sr = sind(camRoll);
    crX = csX * cr + ux * sr; crY = uy * sr; crZ = csZ * cr + uz * sr;
    cuX = ux * cr - csX * sr; cuY = uy * cr; cuZ = uz * cr - csZ * sr;
    tanHalf = tand(camFov / 2);
    if (tanHalf < 0.05) { tanHalf = 0.05; }
    camScale = 240 / tanHalf;
    if (orthoOn == 1) {
        projA = 240 / orthoSize;
        projB = 0;
        tanHalf = orthoSize / 240;      // used by the cull margins
    } else {
        projA = 0;
        projB = camScale;
    }
}

function camSetPos(x, y, z) { camX = x; camY = y; camZ = z; }
function camSetAngle(yaw, pitch) {
    camYaw = yaw;
    camPitch = pitch;
    if (camPitch > 88) { camPitch = 88; }
    if (camPitch < -88) { camPitch = -88; }
}
function camTurn(dyaw, dpitch) { camSetAngle(camYaw + dyaw, camPitch + dpitch); }
function camLookAt(x, y, z) {
    let dx = x - camX; let dy = y - camY; let dz = z - camZ;
    atan2d(dx, dz);
    camYaw = oAtan;
    atan2d(dy, Math.sqrt(dx * dx + dz * dz));
    camPitch = oAtan;
}
function camSetFov(f) {
    camFov = f;
    if (camFov < 10) { camFov = 10; }
    if (camFov > 160) { camFov = 160; }
}
function camShake(a) { shakeA = a; shakeT = 0.35; }
// 0 = 원근(기본), 1 = 직교(쿼터뷰). size = how many world units fill the width
function camSetProjection(kind, size) {
    orthoOn = kind;
    if (size > 0.5) { orthoSize = size; }
}

// first person: sit in the object's head and turn it to face the camera
function camFirst(id, eye) {
    alive(id);
    if (aliveRes == 1) {
        camX = oX[id];
        camY = oY[id] + eye;
        camZ = oZ[id];
        oRY[id] = camYaw;
    }
}

// Third person: hang `dist` behind the object along the camera yaw. If a wall
// is in the way the camera slides in front of it.
function camThird(id, dist, high, smooth) {
    alive(id);
    if (aliveRes == 1) {
        let bx = 0 - sind(camYaw) * cosd(camPitch);
        let by = sind(camPitch);
        let bz = 0 - cosd(camYaw) * cosd(camPitch);
        let hx = oX[id];
        let hy = oY[id] + high * 0.55;
        let hz = oZ[id];
        let d = dist;
        rayCast(hx, hy, hz, bx, by + high / dist, bz, dist, id);
        if (rayHit == 1) {
            d = rayDist * 0.82;
            if (d < 0.6) { d = 0.6; }
        }
        let tx = oX[id] + bx * d;
        let ty = oY[id] + high + by * d;
        let tz = oZ[id] + bz * d;
        let k = smooth;
        if (k < 0) { k = 0; }
        if (k > 0.98) { k = 0.98; }
        k = 1 - k;
        camX = camX + (tx - camX) * k;
        camY = camY + (ty - camY) * k;
        camZ = camZ + (tz - camZ) * k;
    }
}

// a fixed ring around an object: good for menus, showrooms and top-down games
function camOrbit(id, dist, high, angle) {
    alive(id);
    if (aliveRes == 1) {
        camX = oX[id] + sind(angle) * dist;
        camY = oY[id] + high;
        camZ = oZ[id] + cosd(angle) * dist;
        camLookAt(oX[id], oY[id], oZ[id]);
    }
}

function setSky(top, horizon, ground) {
    parseColor(horizon); skyR = cR; skyG = cG; skyB = cB;
    parseColor(top); skyTopR = cR; skyTopG = cG; skyTopB = cB;
    parseColor(ground); gndR = cR; gndG = cG; gndB = cB;
}
function setLight(x, y, z, power, ambient) {
    let L = Math.sqrt(x * x + y * y + z * z);
    if (L < 0.0001) { L = 1; }
    lightX = x / L; lightY = y / L; lightZ = z / L;
    lightI = power; ambI = ambient;
}
function setViewFar(d) { fogFar = d; if (fogFar < 8) { fogFar = 8; } }
function setLodSize(p) { lodSize = p; }
function setLodFar(d) { lodFar = d; }
function setQuality(q) {
    maxFaces = q;
    if (maxFaces < 10) { maxFaces = 10; }
    if (maxFaces > MAXDR - 10) { maxFaces = MAXDR - 10; }
}
function setDrawMode(m) { drawMode = m; }
function setShadows(on, y) { shadowOn = on; shadowY = y; }
function setShadowFar(d) { shadowFar = d; }
function setDebug(v) { debugOn = v; }

// ============================================================
// the polygon primitive
// ============================================================
// append a world point to the transformed-vertex scratch buffer
function pushPoint(x, y, z) {
    pushIdx = 0;
    if (nSv < MAXSV) {
        nSv = nSv + 1;
        let dx = x - camX; let dy = y - camY; let dz = z - camZ;
        let vz = dx * cfX + dy * cfY + dz * cfZ;
        let vx = dx * crX + dy * crY + dz * crZ;
        let vy = dx * cuX + dy * cuY + dz * cuZ;
        tvX[nSv] = vx; tvY[nSv] = vy; tvZ[nSv] = vz;
        if (vz > NEARZ) {
            let iv = projA + projB / vz;
            tsX[nSv] = vx * iv; tsY[nSv] = vy * iv;
        }
        pushIdx = nSv;
    }
}

// one edge of a polygon clipped against the near plane, appended to pgX/pgY
function clipEdge(a, b) {
    let za = tvZ[a];
    let zb = tvZ[b];
    if (za >= NEARZ) {
        if (nPg < MAXPG) {
            nPg = nPg + 1;
            pgX[nPg] = tsX[a]; pgY[nPg] = tsY[a];
        }
    }
    let cross = 0;
    if (za >= NEARZ) { if (zb < NEARZ) { cross = 1; } }
    if (za < NEARZ) { if (zb >= NEARZ) { cross = 1; } }
    if (cross == 1) {
        if (nPg < MAXPG) {
            let t = (NEARZ - za) / (zb - za);
            let iv = projA + projB / NEARZ;
            nPg = nPg + 1;
            pgX[nPg] = (tvX[a] + (tvX[b] - tvX[a]) * t) * iv;
            pgY[nPg] = (tvY[a] + (tvY[b] - tvY[a]) * t) * iv;
        }
    }
}

// a, b, c, d: scratch-buffer slots wound counter-clockwise from the visible
// side (d = 0 for a triangle). two = 1 skips the back-face test.
// On success polyOk = 1 and the screen polygon sits at polyStart..+polyN.
function addPoly(a, b, c, d, two) {
    polyOk = 0;
    let need = 3;
    if (d > 0) { need = 4; }
    let nIn = need;
    if (clipOn == 1) {
        nIn = 0;
        if (tvZ[a] > NEARZ) { nIn = nIn + 1; }
        if (tvZ[b] > NEARZ) { nIn = nIn + 1; }
        if (tvZ[c] > NEARZ) { nIn = nIn + 1; }
        if (d > 0) { if (tvZ[d] > NEARZ) { nIn = nIn + 1; } }
    }
    if (nIn == need) {
        let ax = tsX[a]; let ay = tsY[a];
        let bx = tsX[b]; let by = tsY[b];
        let cx = tsX[c]; let cy = tsY[c];
        let dx = ax; let dy = ay;
        // twice the signed screen area: positive means we see the front
        let ar = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (d > 0) {
            dx = tsX[d]; dy = tsY[d];
            ar = ar + (cx - ax) * (dy - ay) - (cy - ay) * (dx - ax);
        }
        let keep = 0;
        polyFlip = 0;
        if (ar > 0.5) { keep = 1; }
        if (two == 1) { if (ar < -0.5) { keep = 1; polyFlip = 1; } }
        if (keep == 1) {
            if (ax > 244) { if (bx > 244) { if (cx > 244) { if (dx > 244) { keep = 0; } } } }
            if (keep == 1) { if (ax < -244) { if (bx < -244) { if (cx < -244) { if (dx < -244) { keep = 0; } } } } }
            if (keep == 1) { if (ay > 141) { if (by > 141) { if (cy > 141) { if (dy > 141) { keep = 0; } } } } }
            if (keep == 1) { if (ay < -141) { if (by < -141) { if (cy < -141) { if (dy < -141) { keep = 0; } } } } }
        }
        if (keep == 1) {
            if (nPg + need <= MAXPG) {
                polyStart = nPg;
                pgX[nPg + 1] = ax; pgY[nPg + 1] = ay;
                pgX[nPg + 2] = bx; pgY[nPg + 2] = by;
                pgX[nPg + 3] = cx; pgY[nPg + 3] = cy;
                if (d > 0) { pgX[nPg + 4] = dx; pgY[nPg + 4] = dy; }
                nPg = nPg + need;
                polyN = need;
                polyOk = 1;
            }
        }
    } else if (nIn > 0) {
        // straddles the near plane: clip it (rare, so the slow loop is fine)
        let start = nPg;
        clipEdge(a, b);
        clipEdge(b, c);
        if (d > 0) { clipEdge(c, d); clipEdge(d, a); }
        else { clipEdge(c, a); }
        let n = nPg - start;
        if (n >= 3) {
            let ar = 0;
            let i = 1;
            while (i <= n) {
                let j = i + 1;
                if (j > n) { j = 1; }
                ar = ar + pgX[start + i] * pgY[start + j] - pgX[start + j] * pgY[start + i];
                i = i + 1;
            }
            let keep = 0;
            polyFlip = 0;
            if (ar > 0.5) { keep = 1; }
            if (two == 1) { if (ar < -0.5) { keep = 1; polyFlip = 1; } }
            if (keep == 1) {
                polyStart = start;
                polyN = n;
                polyOk = 1;
            } else { nPg = start; }
        } else { nPg = start; }
    }
}

// queue the polygon that addPoly just built, bucketed by depth
function pushDraw(depth, hex) {
    if (nDraw < maxFaces) {
        nDraw = nDraw + 1;
        dStart[nDraw] = polyStart;
        dCount[nDraw] = polyN;
        dHex[nDraw] = hex;
        let bk = Math.floor(NB * depth / (depth + 26)) + 1;
        if (bk < 1) { bk = 1; }
        if (bk > NB) { bk = NB; }
        if (layerBias < 0) { bk = NB; }
        if (layerBias > 0) { bk = 1; }
        dNext[nDraw] = bHead[bk];
        bHead[bk] = nDraw;
    } else { nPg = polyStart; }
}

function shadeHex(r, g, b) {
    let rr = Math.floor(r);
    let gg = Math.floor(g);
    let bb = Math.floor(b);
    if (rr > 255) { rr = 255; }
    if (gg > 255) { gg = 255; }
    if (bb > 255) { bb = 255; }
    outHex = rgb(rr, gg, bb);
}

// ============================================================
// per-object transform
// ============================================================
function buildMat(id) {
    let rx = oRX[id]; let ry = oRY[id]; let rz = oRZ[id];
    hasFlag(id, F_BILL);
    if (flagRes == 1) { ry = camYaw; rx = 0; rz = 0; }
    let sx = oSX[id]; let sy = oSY[id]; let sz = oSZ[id];
    let r00 = 1; let r01 = 0; let r02 = 0;
    let r10 = 0; let r11 = 1; let r12 = 0;
    let r20 = 0; let r21 = 0; let r22 = 1;
    let plain = 0;
    if (rx == 0) { if (rz == 0) { plain = 1; } }
    if (plain == 1) {
        if (ry != 0) {
            let cy = cosd(ry); let sny = sind(ry);
            r00 = cy; r02 = sny;
            r20 = 0 - sny; r22 = cy;
        }
    } else {
        let cy = cosd(ry); let sny = sind(ry);
        let cx = cosd(rx); let snx = sind(rx);
        let cz = cosd(rz); let snz = sind(rz);
        r00 = cy * cz + sny * snx * snz;
        r01 = sny * snx * cz - cy * snz;
        r02 = sny * cx;
        r10 = cx * snz;
        r11 = cx * cz;
        r12 = 0 - snx;
        r20 = cy * snx * snz - sny * cz;
        r21 = sny * snz + cy * snx * cz;
        r22 = cy * cx;
    }
    // M = cameraBasis * rotation * scale
    m00 = (crX * r00 + crY * r10 + crZ * r20) * sx;
    m01 = (crX * r01 + crY * r11 + crZ * r21) * sy;
    m02 = (crX * r02 + crY * r12 + crZ * r22) * sz;
    m10 = (cuX * r00 + cuY * r10 + cuZ * r20) * sx;
    m11 = (cuX * r01 + cuY * r11 + cuZ * r21) * sy;
    m12 = (cuX * r02 + cuY * r12 + cuZ * r22) * sz;
    m20 = (cfX * r00 + cfY * r10 + cfZ * r20) * sx;
    m21 = (cfX * r01 + cfY * r11 + cfZ * r21) * sy;
    m22 = (cfX * r02 + cfY * r12 + cfZ * r22) * sz;
    let dx = oX[id] - camX; let dy = oY[id] - camY; let dz = oZ[id] - camZ;
    mtX = dx * crX + dy * crY + dz * crZ;
    mtY = dx * cuX + dy * cuY + dz * cuZ;
    mtZ = dx * cfX + dy * cfY + dz * cfZ;
    // the light in object space: dotting it with a model normal shades the face
    loX = r00 * lightX + r10 * lightY + r20 * lightZ;
    loY = r01 * lightX + r11 * lightY + r21 * lightZ;
    loZ = r02 * lightX + r12 * lightY + r22 * lightZ;
}

function drawObject(id, m) {
    let vn = mVN[m];
    if (nSv + vn + 6 <= MAXSV) {
        let fl = oFlag[id];
        layerBias = 0;
        if (mod(idiv(fl, F_BACK), 2) == 1) { layerBias = -1; }
        if (mod(idiv(fl, F_FRONT), 2) == 1) { layerBias = 1; }
        buildMat(id);
        let base = nSv;
        let vs = mVS[m];
        let i = 1;
        while (i <= vn) {
            let p = vs + i;
            let vx = vpX[p]; let vy = vpY[p]; let vz = vpZ[p];
            let k = base + i;
            let cz = m20 * vx + m21 * vy + m22 * vz + mtZ;
            let ax = m00 * vx + m01 * vy + m02 * vz + mtX;
            let ay = m10 * vx + m11 * vy + m12 * vz + mtY;
            tvX[k] = ax; tvY[k] = ay; tvZ[k] = cz;
            if (cz > NEARZ) {
                let iv = projA + projB / cz;
                tsX[k] = ax * iv; tsY[k] = ay * iv;
            }
            i = i + 1;
        }
        nSv = base + vn;
        // faces
        let col = oCol[id];
        let r0 = idiv(col, 65536);
        let g0 = idiv(col, 256) - r0 * 256;
        let b0 = col - r0 * 65536 - g0 * 256;
        let lit = 1;
        if (mod(idiv(fl, F_UNLIT), 2) == 1) { lit = 0; }
        let fs = mFS[m];
        let fn = mFN[m];
        let f = 1;
        while (f <= fn) {
            let q = fs + f;
            let a = base + fpA[q];
            let b = base + fpB[q];
            let c = base + fpC[q];
            let d = fpD[q];
            if (d > 0) { d = base + d; }
            addPoly(a, b, c, d, fpTwo[q]);
            if (polyOk == 1) {
                let sh = 1;
                if (lit == 1) {
                    sh = fpNX[q] * loX + fpNY[q] * loY + fpNZ[q] * loZ;
                    if (polyFlip == 1) { sh = 0 - sh; }
                    if (sh < 0) { sh = 0; }
                    sh = ambI + lightI * sh;
                }
                let rr = r0; let gg = g0; let bb = b0;
                let fc = fpCol[q];
                if (fc >= 0) {
                    rr = idiv(fc, 65536);
                    gg = idiv(fc, 256) - rr * 256;
                    bb = fc - rr * 65536 - gg * 256;
                }
                let depth = (tvZ[a] + tvZ[b] + tvZ[c]) / 3;
                let t = depth / fogFar;
                if (t < 0) { t = 0; }
                if (t > 1) { t = 1; }
                t = t * t * 0.92;
                let u = (1 - t) * sh;
                shadeHex(rr * u + skyR * t, gg * u + skyG * t, bb * u + skyB * t);
                pushDraw(depth, outHex);
            }
            f = f + 1;
        }
    }
}

// a soft square blob on the floor under an object
function addShadow(id) {
    let gap = oY[id] - oHY[id] - shadowY;
    if (gap > -0.6) {
        if (gap < 7) {
            let r = oHX[id];
            if (oHZ[id] > r) { r = oHZ[id]; }
            let f = 1 - gap * 0.09;
            if (f < 0.4) { f = 0.4; }
            r = r * f * 1.05;
            let x = oX[id]; let z = oZ[id];
            let y = shadowY + 0.03 - camY;
            let dx = x - camX; let dz = z - camZ;
            let depth = dx * cfX + y * cfY + dz * cfZ;
            if (depth > NEARZ) {
                if (depth < shadowFar) {
                    if (nSv + 4 <= MAXSV) {
                        let ux = r * cfX; let uz = r * cfZ;
                        let rx = r * crX; let rz = r * crZ;
                        let wx = r * cuX; let wz = r * cuZ;
                        let vx = dx * crX + y * crY + dz * crZ;
                        let vy = dx * cuX + y * cuY + dz * cuZ;
                        nSv = nSv + 1; tvZ[nSv] = depth - ux - uz; tvX[nSv] = vx - rx - rz; tvY[nSv] = vy - wx - wz;
                        let p1 = nSv;
                        nSv = nSv + 1; tvZ[nSv] = depth - ux + uz; tvX[nSv] = vx - rx + rz; tvY[nSv] = vy - wx + wz;
                        let p2 = nSv;
                        nSv = nSv + 1; tvZ[nSv] = depth + ux + uz; tvX[nSv] = vx + rx + rz; tvY[nSv] = vy + wx + wz;
                        let p3 = nSv;
                        nSv = nSv + 1; tvZ[nSv] = depth + ux - uz; tvX[nSv] = vx + rx - rz; tvY[nSv] = vy + wx - wz;
                        let p4 = nSv;
                        let k = p1;
                        while (k <= p4) {
                            if (tvZ[k] > NEARZ) {
                                let iv = projA + projB / tvZ[k];
                                tsX[k] = tvX[k] * iv; tsY[k] = tvY[k] * iv;
                            }
                            k = k + 1;
                        }
                        layerBias = 0;
                        addPoly(p1, p2, p3, p4, 1);
                        if (polyOk == 1) {
                            let t = depth / fogFar;
                            if (t > 1) { t = 1; }
                            t = t * t * 0.92;
                            let u = (1 - t) * (0.42 + 0.3 * f);
                            shadeHex(gndR * u + skyR * t, gndG * u + skyG * t, gndB * u + skyB * t);
                            pushDraw(depth - 0.02, outHex);
                        }
                    }
                }
            }
        }
    }
}

// ============================================================
// sky
// ============================================================
function fill4(x1, y1, x2, y2, x3, y3, x4, y4, col) {
    fillColorHex(col);
    goto(x1, y1);
    fillStart();
    goto(x2, y2);
    goto(x3, y3);
    goto(x4, y4);
    goto(x1, y1);
    fillStop();
}

function drawSky() {
    let k = camScale * tand(camPitch);
    let cr = cosd(camRoll);
    let sr = sind(camRoll);
    let hx = 0 - k * sr;
    let hy = 0 - k * cr;
    let dx = cr * 900;
    let dy = 0 - sr * 900;
    let nx = sr;
    let ny = cr;
    shadeHex(gndR * 0.72 + skyR * 0.28, gndG * 0.72 + skyG * 0.28, gndB * 0.72 + skyB * 0.28);
    fill4(hx - dx, hy - dy, hx + dx, hy + dy,
        hx + dx - nx * 700, hy + dy - ny * 700, hx - dx - nx * 700, hy - dy - ny * 700, outHex);
    let b = 0;
    while (b < 7) {
        let o0 = b * 34;
        let o1 = o0 + 35;
        if (b == 6) { o1 = 700; }
        let t = b / 6;
        shadeHex(skyR + (skyTopR - skyR) * t, skyG + (skyTopG - skyG) * t, skyB + (skyTopB - skyB) * t);
        fill4(hx - dx + nx * o0, hy - dy + ny * o0, hx + dx + nx * o0, hy + dy + ny * o0,
            hx + dx + nx * o1, hy + dy + ny * o1, hx - dx + nx * o1, hy - dy + ny * o1, outHex);
        b = b + 1;
    }
}

// ============================================================
// the frame
// ============================================================
// cull one object and, if it survives, transform and queue it
function tryDraw(id) {
    if (oVis[id] == 1) {
        let dx = oX[id] - camX; let dy = oY[id] - camY; let dz = oZ[id] - camZ;
        let cz = dx * cfX + dy * cfY + dz * cfZ;
        let r = oRad[id];
        if (cz > 0 - r) {
            if (cz < fogFar + r) {
                let cx = dx * crX + dy * crY + dz * crZ;
                let cy = dx * cuX + dy * cuY + dz * cuZ;
                let lx = cz * tanHalf * 1.08 + r * 1.2 + 1;
                let ly = cz * tanHalf * 0.62 + r * 1.2 + 1;
                if (orthoOn == 1) { lx = orthoSize + r; ly = orthoSize * 0.6 + r; }
                if (cx < lx) {
                    if (cx > 0 - lx) {
                        if (cy < ly) {
                            if (cy > 0 - ly) {
                                nSeen = nSeen + 1;
                                clipOn = 1;
                                if (cz - r > NEARZ) { clipOn = 0; }
                                let mm = oMesh[id];
                                if (mLod[mm] > 0) {
                                    // small on screen, or simply far away (big
                                    // meshes like terrain never look small)
                                    if (r * camScale < cz * lodSize) { mm = mLod[mm]; }
                                    else if (cz > lodFar) { mm = mLod[mm]; }
                                }
                                drawObject(id, mm);
                                if (shadowOn == 1) {
                                    hasFlag(id, F_SHADOW);
                                    if (flagRes == 1) { clipOn = 1; layerBias = 0; addShadow(id); }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function drawScene() {
    applyParents();
    setupCam();
    if (shakeT > 0) {
        shakeT = shakeT - dt;
        let a = shakeA * shakeT * 3;
        camX = camX + rand(0 - a, a) * 0.1;
        camY = camY + rand(0 - a, a) * 0.1;
        camRoll = camRoll + rand(0 - a, a) * 0.6;
        setupCam();
    }
    eraseAll();
    penUp();
    if (skyOn == 1) { drawSky(); }
    nSv = 0; nPg = 0; nDraw = 0; nSeen = 0;
    let i = 1;
    while (i <= NB) { bHead[i] = 0; i = i + 1; }
    // objects too large for one cell are always considered
    i = 1;
    while (i <= nBig) {
        tryDraw(bigList[i]);
        i = i + 1;
    }
    // ...everything else is looked up in the draw grid around the camera
    let range = Math.floor(fogFar / GRC) + 2;
    let cx0 = Math.floor(camX / GRC);
    let cz0 = Math.floor(camZ / GRC);
    let far2 = (fogFar + GRC * 2) * (fogFar + GRC * 2);
    let cz = cz0 - range;
    while (cz <= cz0 + range) {
        let cx = cx0 - range;
        while (cx <= cx0 + range) {
            let px = (cx + 0.5) * GRC - camX;
            let pz = (cz + 0.5) * GRC - camZ;
            if (px * px + pz * pz < far2) {
                let fw = px * chX + pz * chZ;
                if (fw > 0 - GRC * 1.6) {
                    let side = px * csX + pz * csZ;
                    let lim = fw * tanHalf * 1.3 + GRC * 1.6;
                    if (orthoOn == 1) { lim = orthoSize + GRC * 1.6; }
                    if (side < lim) {
                        if (side > 0 - lim) {
                            let c = mod((cx + GBIAS) * 131 + (cz + GBIAS) * 401, NGR) + 1;
                            let e = grHead[c];
                            while (e > 0) {
                                let id = grObj[e];
                                // the hash puts several cells in one bucket:
                                // only the ones that really live here count
                                if (oCell[id] == c) { tryDraw(id); }
                                e = grNext[e];
                            }
                        }
                    }
                }
            }
            cx = cx + 1;
        }
        cz = cz + 1;
    }
    // draw back to front
    drawn = nDraw;
    let bk = NB;
    while (bk >= 1) {
        let e = bHead[bk];
        while (e > 0) {
            drawPoly(e);
            e = dNext[e];
        }
        bk = bk - 1;
    }
    if (debugOn == 1) { debugDraw(); }
}

function drawPoly(e) {
    let s = dStart[e];
    let n = dCount[e];
    let x0 = pgX[s + 1]; let y0 = pgY[s + 1];
    if (drawMode != 1) {
        fillColorHex(dHex[e]);
        goto(x0, y0);
        fillStart();
        let i = 2;
        while (i <= n) {
            goto(pgX[s + i], pgY[s + i]);
            i = i + 1;
        }
        goto(x0, y0);
        fillStop();
    }
    if (drawMode > 0) {
        penColorHex(wireHex);
        goto(x0, y0);
        penDown();
        let j = 2;
        while (j <= n) {
            goto(pgX[s + j], pgY[s + j]);
            j = j + 1;
        }
        goto(x0, y0);
        penUp();
    }
}

// ============================================================
// screen-space helpers (HUD)
// ============================================================
function worldToScreen(x, y, z) {
    let dx = x - camX; let dy = y - camY; let dz = z - camZ;
    let vz = dx * cfX + dy * cfY + dz * cfZ;
    scrFront = 0;
    scrX = 0; scrY = 0;
    if (vz > NEARZ) {
        let iv = projA + projB / vz;
        scrX = (dx * crX + dy * crY + dz * crZ) * iv;
        scrY = (dx * cuX + dy * cuY + dz * cuZ) * iv;
        scrFront = 1;
    }
}

function hudRect(x, y, w, h, col) {
    parseColor(col);
    shadeHex(cR, cG, cB);
    let hw = w / 2;
    let hh = h / 2;
    fill4(x - hw, y - hh, x + hw, y - hh, x + hw, y + hh, x - hw, y + hh, outHex);
}

function hudLine(x1, y1, x2, y2, w, col) {
    parseColor(col);
    shadeHex(cR, cG, cB);
    let dx = x2 - x1; let dy = y2 - y1;
    let L = Math.sqrt(dx * dx + dy * dy);
    if (L < 0.001) { L = 1; }
    let nx = 0 - dy / L * w / 2;
    let ny = dx / L * w / 2;
    fill4(x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny, outHex);
}

function hudCross(size, col) {
    hudRect(0, 0, size * 2, 2, col);
    hudRect(0, 0, 2, size * 2, col);
}

// a filled bar, e.g. a health bar: value 0..1
function hudBar(x, y, w, h, v, col, back) {
    hudRect(x, y, w, h, back);
    let f = v;
    if (f < 0) { f = 0; }
    if (f > 1) { f = 1; }
    hudRect(x - w / 2 + w * f / 2, y, w * f, h - 4, col);
}

// ============================================================
// debug overlay: collision boxes and the world axes
// ============================================================
function debugSeg(x1, y1, z1, x2, y2, z2) {
    worldToScreen(x1, y1, z1);
    if (scrFront == 1) {
        let ax = scrX; let ay = scrY;
        worldToScreen(x2, y2, z2);
        if (scrFront == 1) {
            goto(ax, ay);
            penDown();
            goto(scrX, scrY);
            penUp();
        }
    }
}

function debugBox(id) {
    let x = oX[id]; let y = oY[id]; let z = oZ[id];
    let hx = oHX[id]; let hy = oHY[id]; let hz = oHZ[id];
    debugSeg(x - hx, y - hy, z - hz, x + hx, y - hy, z - hz);
    debugSeg(x + hx, y - hy, z - hz, x + hx, y - hy, z + hz);
    debugSeg(x + hx, y - hy, z + hz, x - hx, y - hy, z + hz);
    debugSeg(x - hx, y - hy, z + hz, x - hx, y - hy, z - hz);
    debugSeg(x - hx, y + hy, z - hz, x + hx, y + hy, z - hz);
    debugSeg(x + hx, y + hy, z - hz, x + hx, y + hy, z + hz);
    debugSeg(x + hx, y + hy, z + hz, x - hx, y + hy, z + hz);
    debugSeg(x - hx, y + hy, z + hz, x - hx, y + hy, z - hz);
    debugSeg(x - hx, y - hy, z - hz, x - hx, y + hy, z - hz);
    debugSeg(x + hx, y - hy, z - hz, x + hx, y + hy, z - hz);
    debugSeg(x + hx, y - hy, z + hz, x + hx, y + hy, z + hz);
    debugSeg(x - hx, y - hy, z + hz, x - hx, y + hy, z + hz);
}

function debugDraw() {
    penColorHex('#ff3b30');
    let i = 1;
    while (i <= nBody) {
        let b = bObj[i];
        if (b > 0) {
            if (oVis[b] != 9) {
                let dx = oX[b] - camX; let dz = oZ[b] - camZ;
                if (dx * dx + dz * dz < 2500) { debugBox(b); }
            }
        }
        i = i + 1;
    }
    penColorHex('#30d158');
    debugSeg(0, 0, 0, 5, 0, 0);
    debugSeg(0, 0, 0, 0, 5, 0);
    debugSeg(0, 0, 0, 0, 0, 5);
}

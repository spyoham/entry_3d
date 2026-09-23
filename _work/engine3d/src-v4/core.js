// ============================================================
// core.js - world state, frame clock, colours, meshes, objects.
//
// Everything the engine knows lives in flat lists indexed by object id, so a
// user can read or poke a position with Entry's own list blocks and never
// needs a getter. Entry value-functions cost ~2 frames per call, so every
// helper here is a plain function that writes its result into a global.
// ============================================================
const BLANK = '​';          // '' compares equal to 0 in Entry - never use ''
// Entry refuses to hold more than 5000 items in one list, so every pool below
// is also the length of the lists build.mjs pre-fills - keep them under 5000.
const MAXOBJ = 400;              // object slots
const MAXMESH = 120;             // mesh slots (builtin + user made)
const MAXV = 3000;               // mesh vertex pool
const MAXF = 1800;               // mesh face pool
const MAXSV = 2600;              // transformed vertices, one frame
const MAXPG = 4200;              // screen polygon vertices, one frame
const MAXDR = 800;               // polygons queued for drawing, one frame
const NB = 96;                   // painter's-algorithm depth buckets
const NEARZ = 0.35;              // near plane
const MAXHIT = 300;              // collision pairs reported per frame
const GW = 48;                   // static collider grid: GW x GW cells
const GCELL = 4;                 // ...of this many world units
const GORG = -96;                // ...starting here on x and z
const MAXGE = 2600;              // grid entries
const HUDN = 8;                  // HUD text slots

// ---- builtin mesh ids (baked by build.mjs in this order) ----
const M_BOX = 1;
const M_SPHERE = 2;
const M_SPHERE_LO = 3;
const M_CYL = 4;
const M_CONE = 5;
const M_PYR = 6;
const M_PLANE = 7;
const M_QUAD = 8;
const M_RAMP = 9;
const M_PERSON = 10;
const M_TREE = 11;
const M_DISC = 12;
const M_STAR = 13;
const M_TREE_LO = 14;
const M_PERSON_LO = 15;
const M_CYL_LO = 16;
const NBUILTIN = 16;

// ---- clock ----
let gt = 0;                      // seconds since the engine started
let dt = 0;                      // seconds in this frame (clamped)
let lastT = 0;
let frameId = 0;
let fps = 0;

// ---- counters ----
let nObj = 0;                    // highest object id handed out
let nFree = 0;
let nMesh = 0;
let nV = 0;
let nF = 0;
let newId = 0;                   // object made by the last "만들기"
let newMesh = 0;                 // mesh finished by the last "모양 완성"
let nColor = 0;

// ---- scratch outputs ----
let cR = 170; let cG = 170; let cB = 180;
let oHex = 0; let oHexD = 0;
let oAtan = 0;
let touch = 0;                   // result of the "닿았는지" test
let aliveRes = 0;
let warnMsg = '​';          // set when a pool runs out, so it is never a silent failure

// ---- world lists ----
let oX = []; let oY = []; let oZ = [];
let oRX = []; let oRY = []; let oRZ = [];
let oSX = []; let oSY = []; let oSZ = [];
let oMesh = []; let oR = []; let oG = []; let oB = [];
let oVis = []; let oTag = []; let oLayer = [];
let oShadow = []; let oBill = []; let oUnlit = [];
let oBody = []; let oShape = [];
let oVX = []; let oVY = []; let oVZ = [];
let oMass = []; let oBounce = []; let oFric = [];
let oHX = []; let oHY = []; let oHZ = []; let oRad = [];
let oGround = []; let oHit = []; let oGObj = [];
let oCX = []; let oCZ = []; let oCtl = []; let oSleep = [];
let oPX = []; let oPY = []; let oPZ = [];
let frList = [];

// ---- mesh lists ----
let mVS = []; let mVN = []; let mFS = []; let mFN = [];
let mRad = []; let mHX = []; let mHY = []; let mHZ = []; let mLod = [];
let vpX = []; let vpY = []; let vpZ = [];
let fpA = []; let fpB = []; let fpC = []; let fpD = [];
let fpNX = []; let fpNY = []; let fpNZ = []; let fpCol = []; let fpTwo = [];

// ---- colour names ----
let cnName = []; let cnR = []; let cnG = []; let cnB = [];

// ---- custom mesh builder ----
let bmOn = 0; let bmVS = 0; let bmFS = 0; let bmN = 0;

// ============================================================
// helpers
// ============================================================
// atan2 in degrees, (-180, 180]
function atan2d(ay, ax) {
    if (ax > 0) { oAtan = atand(ay / ax); }
    else if (ax < 0) {
        if (ay >= 0) { oAtan = atand(ay / ax) + 180; } else { oAtan = atand(ay / ax) - 180; }
    } else if (ay > 0) { oAtan = 90; }
    else if (ay < 0) { oAtan = -90; }
    else { oAtan = 0; }
}

function hexDigit(c) {
    oHexD = indexOf('0123456789abcdef', c) - 1;
    if (oHexD < 0) { oHexD = indexOf('0123456789ABCDEF', c) - 1; }
    if (oHexD < 0) { oHexD = 0; }
}

function hexPair(s, i) {
    hexDigit(charAt(s, i));
    let h = oHexD;
    hexDigit(charAt(s, i + 1));
    oHex = h * 16 + oHexD;
}

// a colour name from the 색이름 list, '#rrggbb', or anything else -> grey
function parseColor(c) {
    // NOTE: never concatenate anything onto `c` - a colour name has to stay
    // exactly equal to its entry in the 색이름 list.
    cR = 170; cG = 170; cB = 180;
    let s = c;
    let n = strlen(s);
    let done = 0;
    if (n >= 7) {
        if (charAt(s, 1) == '#') {
            hexPair(s, 2); cR = oHex;
            hexPair(s, 4); cG = oHex;
            hexPair(s, 6); cB = oHex;
            done = 1;
        }
    }
    if (done == 0) {
        let i = 1;
        while (i <= nColor) {
            if (cnName[i] == s) {
                cR = cnR[i]; cG = cnG[i]; cB = cnB[i];
                i = nColor;
            }
            i = i + 1;
        }
    }
}

function alive(id) {
    aliveRes = 0;
    if (id >= 1) {
        if (id <= nObj) {
            if (oVis[id] != 9) { aliveRes = 1; }
        }
    }
}

// ============================================================
// objects
// ============================================================
function newObj(mesh, x, y, z, sx, sy, sz, col) {
    let id = 0;
    if (nFree > 0) { id = frList[nFree]; nFree = nFree - 1; }
    else if (nObj < MAXOBJ) { nObj = nObj + 1; id = nObj; }
    if (id == 0) { warnMsg = str('오브젝트를 더 만들 수 없습니다. 최대 ', MAXOBJ, '개'); }
    if (id > 0) {
        oMesh[id] = mesh;
        oX[id] = x; oY[id] = y; oZ[id] = z;
        oPX[id] = x; oPY[id] = y; oPZ[id] = z;
        oRX[id] = 0; oRY[id] = 0; oRZ[id] = 0;
        oSX[id] = sx; oSY[id] = sy; oSZ[id] = sz;
        parseColor(col);
        oR[id] = cR; oG[id] = cG; oB[id] = cB;
        oVis[id] = 1; oShadow[id] = 1; oBill[id] = 0; oUnlit[id] = 0; oLayer[id] = 0;
        oTag[id] = BLANK;
        oBody[id] = 0; oShape[id] = 0;
        oVX[id] = 0; oVY[id] = 0; oVZ[id] = 0;
        oMass[id] = 1; oBounce[id] = 0.2; oFric[id] = 0.8;
        oGround[id] = 0; oHit[id] = 0; oGObj[id] = 0;
        oCX[id] = 0; oCZ[id] = 0; oCtl[id] = 0; oSleep[id] = 0;
        fitCollider(id);
    }
    newId = id;
}

// collider half-extents and cull radius follow the mesh bounds x the scale
function fitCollider(id) {
    let m = oMesh[id];
    let sx = oSX[id]; let sy = oSY[id]; let sz = oSZ[id];
    if (sx < 0) { sx = 0 - sx; }
    if (sy < 0) { sy = 0 - sy; }
    if (sz < 0) { sz = 0 - sz; }
    oHX[id] = mHX[m] * sx;
    oHY[id] = mHY[m] * sy;
    oHZ[id] = mHZ[m] * sz;
    if (m == M_RAMP) {
        // a ramp may be turned in 90 degree steps: keep the broadphase box square
        if (oHZ[id] > oHX[id]) { oHX[id] = oHZ[id]; } else { oHZ[id] = oHX[id]; }
    }
    let s = sx;
    if (sy > s) { s = sy; }
    if (sz > s) { s = sz; }
    oRad[id] = mRad[m] * s;
}

function makeBox(x, y, z, w, h, d, col) { newObj(M_BOX, x, y, z, w, h, d, col); }
function makeBall(x, y, z, dia, col) {
    newObj(M_SPHERE, x, y, z, dia, dia, dia, col);
    if (newId > 0) { oShape[newId] = 1; }
}
function makeCyl(x, y, z, dia, h, col) { newObj(M_CYL, x, y, z, dia, h, dia, col); }
function makeCone(x, y, z, dia, h, col) { newObj(M_CONE, x, y, z, dia, h, dia, col); }
function makePyr(x, y, z, w, h, d, col) { newObj(M_PYR, x, y, z, w, h, d, col); }
function makeRamp(x, y, z, w, h, d, dir, col) {
    newObj(M_RAMP, x, y, z, w, h, d, col);
    if (newId > 0) { oRY[newId] = dir; oShape[newId] = 2; }
}
function makeQuad(x, y, z, w, h, col) { newObj(M_QUAD, x, y, z, w, h, 1, col); }
function makeDisc(x, y, z, dia, col) { newObj(M_DISC, x, y, z, dia, 1, dia, col); }
function makeStar(x, y, z, size, col) { newObj(M_STAR, x, y, z, size, size, size, col); }
function makeTree(x, y, z, h, col) { newObj(M_TREE, x, y, z, h, h, h, col); }
function makePerson(x, y, z, h, col) { newObj(M_PERSON, x, y, z, h, h, h, col); }

// A floor centred on the origin. It is laid as a 5x5 grid of tiles - one huge
// quad would fog as a single flat colour and, worse, its centre depth would let
// the painter's sort draw it over things standing on it. The tiles are drawn on
// the back layer, and one invisible slab carries the collision.
function makeGround(size, col) {
    parseColor(col);
    let r0 = cR; let g0 = cG; let b0 = cB;
    let t = size / 5;
    let i = 0;
    while (i < 5) {
        let j = 0;
        while (j < 5) {
            newObj(M_PLANE, (i - 2) * t, 0, (j - 2) * t, t, 1, t, BLANK);
            if (newId > 0) {
                let k = 0.94;
                if (mod(i + j, 2) == 0) { k = 1.06; }
                oR[newId] = r0 * k; oG[newId] = g0 * k; oB[newId] = b0 * k;
                oShadow[newId] = 0;
                oLayer[newId] = -1;
            }
            j = j + 1;
        }
        i = i + 1;
    }
    newObj(M_BOX, 0, -0.5, 0, size, 1, size, col);
    if (newId > 0) {
        oVis[newId] = 0;
        oShadow[newId] = 0;
        setBody(newId, 2);
    }
}

// -1 draws behind everything (floors), 0 normal, 1 always on top
function setLayer(id, v) { alive(id); if (aliveRes == 1) { oLayer[id] = v; } }

// override the collision box (half sizes) that the mesh bounds gave it
function setCollider(id, hx, hy, hz) {
    alive(id);
    if (aliveRes == 1) { oHX[id] = hx; oHY[id] = hy; oHZ[id] = hz; }
}

function makeFromMesh(mesh, x, y, z, size, col) {
    let m = mesh;
    if (m < 1) { m = 1; }
    if (m > nMesh) { m = nMesh; }
    newObj(m, x, y, z, size, size, size, col);
}

function cloneObj(src, x, y, z) {
    alive(src);
    let ok = aliveRes;
    newId = 0;
    if (ok == 1) {
        newObj(oMesh[src], x, y, z, oSX[src], oSY[src], oSZ[src], BLANK);
        if (newId > 0) {
            let d = newId;
            oR[d] = oR[src]; oG[d] = oG[src]; oB[d] = oB[src];
            oRX[d] = oRX[src]; oRY[d] = oRY[src]; oRZ[d] = oRZ[src];
            oShadow[d] = oShadow[src]; oBill[d] = oBill[src]; oUnlit[d] = oUnlit[src];
            oShape[d] = oShape[src]; oMass[d] = oMass[src];
            oBounce[d] = oBounce[src]; oFric[d] = oFric[src];
            oTag[d] = oTag[src];
            if (oBody[src] != 0) { setBody(d, oBody[src]); }
        }
    }
}

function killObj(id) {
    alive(id);
    if (aliveRes == 1) {
        oVis[id] = 9;                 // 9 = dead slot
        oBody[id] = 0;
        nFree = nFree + 1;
        frList[nFree] = id;
    }
}

// ============================================================
// object transforms (the user-facing setters)
// ============================================================
function setPos(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) { oX[id] = x; oY[id] = y; oZ[id] = z; oPX[id] = x; oPY[id] = y; oPZ[id] = z; oSleep[id] = 0; }
}
function movePos(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) { oX[id] = oX[id] + x; oY[id] = oY[id] + y; oZ[id] = oZ[id] + z; }
}
function setRot(id, rx, ry, rz) {
    alive(id);
    if (aliveRes == 1) { oRX[id] = rx; oRY[id] = ry; oRZ[id] = rz; }
}
function turnObj(id, rx, ry, rz) {
    alive(id);
    if (aliveRes == 1) { oRX[id] = oRX[id] + rx; oRY[id] = oRY[id] + ry; oRZ[id] = oRZ[id] + rz; }
}
function setScale(id, sx, sy, sz) {
    alive(id);
    if (aliveRes == 1) { oSX[id] = sx; oSY[id] = sy; oSZ[id] = sz; fitCollider(id); }
}
function setColor(id, col) {
    alive(id);
    if (aliveRes == 1) { parseColor(col); oR[id] = cR; oG[id] = cG; oB[id] = cB; }
}
function setVisible(id, v) { alive(id); if (aliveRes == 1) { oVis[id] = v; } }
function setTag(id, t) { alive(id); if (aliveRes == 1) { oTag[id] = t; } }
function setShadow(id, v) { alive(id); if (aliveRes == 1) { oShadow[id] = v; } }
function setBillboard(id, v) { alive(id); if (aliveRes == 1) { oBill[id] = v; } }
function setUnlit(id, v) { alive(id); if (aliveRes == 1) { oUnlit[id] = v; } }

// walk `d` units along the object's own facing (its Y rotation)
function moveForward(id, d) {
    alive(id);
    if (aliveRes == 1) {
        oX[id] = oX[id] + sind(oRY[id]) * d;
        oZ[id] = oZ[id] + cosd(oRY[id]) * d;
    }
}
function lookAtObj(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) {
        atan2d(x - oX[id], z - oZ[id]);
        oRY[id] = oAtan;
    }
}
// stand the object on a floor whose top is at height `fy`
function putOnFloor(id, fy) {
    alive(id);
    if (aliveRes == 1) { oY[id] = fy + oHY[id]; oPY[id] = oY[id]; }
}

// ============================================================
// user meshes:  모양 시작 -> 점 추가 ... -> 면 추가 ... -> 모양 완성
// ============================================================
function meshStart() {
    bmOn = 1; bmVS = nV; bmFS = nF; bmN = 0;
}

// draw `mesh` as `lodMesh` once it is small on screen (0 = always full detail)
function setLod(mesh, lodMesh) {
    if (mesh >= 1) {
        if (mesh <= nMesh) { mLod[mesh] = lodMesh; }
    }
}
function meshPoint(x, y, z) {
    if (bmOn == 1) {
        if (nV < MAXV) {
            nV = nV + 1;
            vpX[nV] = x; vpY[nV] = y; vpZ[nV] = z;
            bmN = bmN + 1;
        } else { warnMsg = str('점을 더 넣을 수 없습니다. 최대 ', MAXV, '개'); }
    }
}
// a, b, c, d are point numbers inside this mesh (1-based); d = 0 for a triangle
function meshFace(a, b, c, d, col) {
    let ok = 0;
    if (bmOn == 1) { if (nF < MAXF) { if (a >= 1) { if (b >= 1) { if (c >= 1) { ok = 1; } } } } }
    if (bmOn == 1) { if (nF >= MAXF) { warnMsg = str('면을 더 넣을 수 없습니다. 최대 ', MAXF, '개'); } }
    if (ok == 1) { if (a > bmN) { ok = 0; } }
    if (ok == 1) { if (b > bmN) { ok = 0; } }
    if (ok == 1) { if (c > bmN) { ok = 0; } }
    if (ok == 1) { if (d > bmN) { ok = 0; } }
    if (ok == 1) {
        nF = nF + 1;
        fpA[nF] = a; fpB[nF] = b; fpC[nF] = c; fpD[nF] = d;
        let pa = bmVS + a; let pb = bmVS + b; let pc = bmVS + c;
        let ux = vpX[pb] - vpX[pa]; let uy = vpY[pb] - vpY[pa]; let uz = vpZ[pb] - vpZ[pa];
        let wx = vpX[pc] - vpX[pa]; let wy = vpY[pc] - vpY[pa]; let wz = vpZ[pc] - vpZ[pa];
        let nx = uy * wz - uz * wy;
        let ny = uz * wx - ux * wz;
        let nz = ux * wy - uy * wx;
        let L = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (L < 0.000001) { L = 1; }
        fpNX[nF] = 0 - nx / L; fpNY[nF] = 0 - ny / L; fpNZ[nF] = 0 - nz / L;
        // faces a user typed in are two-sided: the order of the points then
        // never decides whether the face shows up, and the light follows the
        // side you are looking at
        fpTwo[nF] = 1;
        let s = col;
        if (strlen(s) < 2) { fpCol[nF] = -1; }
        else {
            parseColor(s);
            fpCol[nF] = cR * 65536 + cG * 256 + cB;
        }
    }
}
function meshEnd() {
    newMesh = 0;
    if (bmOn == 1) {
        if (nMesh >= MAXMESH) { warnMsg = str('모양을 더 만들 수 없습니다. 최대 ', MAXMESH, '개'); }
        if (nMesh < MAXMESH) {
            if (bmN > 0) {
                nMesh = nMesh + 1;
                mVS[nMesh] = bmVS; mVN[nMesh] = bmN;
                mFS[nMesh] = bmFS; mFN[nMesh] = nF - bmFS;
                let hx = 0; let hy = 0; let hz = 0; let r2 = 0;
                let i = 1;
                while (i <= bmN) {
                    let p = bmVS + i;
                    let ax = vpX[p]; let ay = vpY[p]; let az = vpZ[p];
                    if (ax < 0) { ax = 0 - ax; }
                    if (ay < 0) { ay = 0 - ay; }
                    if (az < 0) { az = 0 - az; }
                    if (ax > hx) { hx = ax; }
                    if (ay > hy) { hy = ay; }
                    if (az > hz) { hz = az; }
                    let q = ax * ax + ay * ay + az * az;
                    if (q > r2) { r2 = q; }
                    i = i + 1;
                }
                mHX[nMesh] = hx; mHY[nMesh] = hy; mHZ[nMesh] = hz;
                mRad[nMesh] = Math.sqrt(r2);
                mLod[nMesh] = 0;
                newMesh = nMesh;
            }
        }
        bmOn = 0;
    }
}

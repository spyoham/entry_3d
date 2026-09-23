// ============================================================
// core.js - world state, colours, meshes, objects, spatial grids.
//
// LIST BUDGET (Entry allows 5000 items per list)
//   * nothing per-object is shipped inside the .ent: the lists start empty and
//     grow with `push` as objects are made, so a small game costs nothing and
//     the ceiling is the list limit itself (4900 objects).
//   * 24 lists per object instead of 41: the booleans and the collision shape
//     live packed in `oFlag`, the colour is one packed number, and everything
//     only a moving body needs sits in a side table addressed by `oBSlot`.
//   * objects are indexed by two spatial hash grids (a fine one for physics, a
//     coarse one for drawing) so neither loop has to walk every object.
// ============================================================
const BLANK = '​';          // '' compares equal to 0 in Entry - never use ''
const MAXOBJ = 4900;             // object slots (= Entry's list limit)
const MAXMESH = 200;             // mesh slots (builtin + user made)
const MAXV = 4900;               // mesh vertex pool
const MAXF = 4900;               // mesh face pool
const MAXSV = 2600;              // transformed vertices, one frame
const MAXPG = 4200;              // screen polygon vertices, one frame
const MAXDR = 800;               // polygons queued for drawing, one frame
const NB = 96;                   // painter's-algorithm depth buckets
const NEARZ = 0.35;              // near plane
const MAXHIT = 300;              // collision pairs reported per frame
const MAXBODY = 1200;            // moving/sensor bodies (side table)
const MAXGE = 4900;              // entries in one grid
const NGP = 1024;                // physics grid buckets
const GPC = 4;                   // physics cell size, world units
const NGR = 512;                 // draw grid buckets
const GRC = 20;                  // draw cell size, world units
const GBIAS = 4096;              // keeps hashed cell numbers positive
const HUDN = 8;                  // HUD text slots
const MAXTWEEN = 120;            // running tweens
const MAXPAR = 400;              // parent/child links
const NTIMER = 16;               // countdown timers

// ---- oFlag bits ----
const F_SHADOW = 1;
const F_BILL = 2;
const F_UNLIT = 4;
const F_BACK = 8;                // draw layer -1
const F_FRONT = 16;              // draw layer +1
const F_SLEEP = 32;
const F_CTL = 64;                // its horizontal speed is commanded
const F_BIG = 128;               // too large for one grid cell
const F_SHAPE = 256;             // 3 bits: 0 box 1 sphere 2 ramp 3 capsule 4 terrain

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
let dt = 0;                      // seconds in this frame (averaged)
let lastT = 0;
let frameId = 0;
let fps = 0;

// ---- counters ----
let nObj = 0;                    // highest object id handed out
let nFree = 0;
let nMesh = 0;
let nV = 0;
let nF = 0;
let nBody = 0;
let newId = 0;                   // object made by the last "만들기"
let newMesh = 0;                 // mesh finished by the last "모양 완성"
let nColor = 0;
let scanPtr = 0;                 // round-robin pointer for the grid self-heal

// ---- scratch outputs ----
let cR = 170; let cG = 170; let cB = 180;
let oHex = 0; let oHexD = 0;
let oAtan = 0;
let touch = 0;                   // result of the "닿았는지" tests
let touchObj = 0;                // ...and who it was
let aliveRes = 0;
let flagRes = 0;
let shapeRes = 0;
let cellRes = 0;
let warnMsg = '​';          // why a "만들기" failed, instead of silence

// ---- per-object lists (24, all grown at run time) ----
let oX = []; let oY = []; let oZ = [];
let oRX = []; let oRY = []; let oRZ = [];
let oSX = []; let oSY = []; let oSZ = [];
let oVX = []; let oVY = []; let oVZ = [];
let oMesh = []; let oVis = []; let oTag = []; let oBody = [];
let oGround = []; let oHit = []; let oCol = []; let oFlag = [];
let oHX = []; let oHY = []; let oHZ = []; let oRad = [];
let oBSlot = []; let oCell = [];
let frList = [];

// ---- body side table: only bodies that move or sense need these ----
let bObj = []; let bMass = []; let bBounce = []; let bFric = [];
let bGObj = []; let bPX = []; let bPY = []; let bPZ = []; let bYaw = [];
let bCX = []; let bCZ = [];

// ---- mesh lists ----
let mVS = []; let mVN = []; let mFS = []; let mFN = [];
let mRad = []; let mHX = []; let mHY = []; let mHZ = []; let mLod = [];
let vpX = []; let vpY = []; let vpZ = [];
let fpA = []; let fpB = []; let fpC = []; let fpD = [];
let fpNX = []; let fpNY = []; let fpNZ = []; let fpCol = []; let fpTwo = [];

// ---- colour names ----
let cnName = []; let cnR = []; let cnG = []; let cnB = [];

// ---- spatial grids ----
let gpHead = []; let gpNext = []; let gpObj = [];
let grHead = []; let grNext = []; let grObj = [];
let bigList = [];
let nGP = 0; let nGR = 0; let nBig = 0;
let gpFree = 0; let grFree = 0;

// ---- custom mesh builder ----
let bmOn = 0; let bmVS = 0; let bmFS = 0; let bmN = 0;

// ============================================================
// small helpers
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

// a colour name from the 색이름 list, '#rrggbb', or anything else -> grey.
// NOTE: never concatenate anything onto `c` - a name has to stay exactly equal
// to its entry in the list.
function parseColor(c) {
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

// ---- packed flags ----
function hasFlag(id, bit) { flagRes = mod(idiv(oFlag[id], bit), 2); }
function putFlag(id, bit, v) {
    let f = oFlag[id];
    let cur = mod(idiv(f, bit), 2);
    if (cur != v) {
        if (v == 1) { oFlag[id] = f + bit; } else { oFlag[id] = f - bit; }
    }
}
function getShape(id) { shapeRes = mod(idiv(oFlag[id], F_SHAPE), 8); }
function setShape(id, s) {
    let f = oFlag[id];
    oFlag[id] = f - mod(idiv(f, F_SHAPE), 8) * F_SHAPE + s * F_SHAPE;
}

// ============================================================
// spatial grids
//   physics: fine cells, only asked about solids near a body
//   drawing: coarse cells, walked in a square around the camera
// Objects bigger than a cell go in `bigList`, which is always checked.
// ============================================================
function cellDraw(x, z) {
    let cx = Math.floor(x / GRC) + GBIAS;
    let cz = Math.floor(z / GRC) + GBIAS;
    cellRes = mod(cx * 131 + cz * 401, NGR) + 1;
}

function addBig(id) {
    let i = 1;
    let found = 0;
    while (i <= nBig) { if (bigList[i] == id) { found = 1; i = nBig; } i = i + 1; }
    if (found == 0) {
        nBig = nBig + 1;
        if (bigList.length < nBig) { bigList.push(id); } else { bigList[nBig] = id; }
        putFlag(id, F_BIG, 1);
    }
}

// put an object into the draw grid (or the big list) and remember where
function gridInsert(id) {
    if (oRad[id] > GRC * 0.5) {
        oCell[id] = 0;
        addBig(id);
    } else {
        cellDraw(oX[id], oZ[id]);
        let c = cellRes;
        oCell[id] = c;
        let e = 0;
        if (grFree > 0) { e = grFree; grFree = grNext[e]; }
        else {
            nGR = nGR + 1;
            e = nGR;
            if (grObj.length < e) { grObj.push(0); grNext.push(0); }
        }
        grObj[e] = id;
        grNext[e] = grHead[c];
        grHead[c] = e;
    }
}

function gridRemove(id) {
    let c = oCell[id];
    if (c > 0) {
        let e = grHead[c];
        let prev = 0;
        while (e > 0) {
            if (grObj[e] == id) {
                if (prev == 0) { grHead[c] = grNext[e]; } else { grNext[prev] = grNext[e]; }
                grObj[e] = 0;
                grNext[e] = grFree;
                grFree = e;
                e = 0;
            } else {
                prev = e;
                e = grNext[e];
            }
        }
        oCell[id] = 0;
    }
}

// call after an object moved: only touches the grid when the cell changed
function gridMove(id) {
    hasFlag(id, F_BIG);
    if (flagRes == 0) {
        cellDraw(oX[id], oZ[id]);
        if (cellRes != oCell[id]) {
            gridRemove(id);
            gridInsert(id);
        }
    }
}

// solids go into the fine physics grid as well
function physInsert(id) {
    let x0 = Math.floor((oX[id] - oHX[id]) / GPC);
    let x1 = Math.floor((oX[id] + oHX[id]) / GPC);
    let z0 = Math.floor((oZ[id] - oHZ[id]) / GPC);
    let z1 = Math.floor((oZ[id] + oHZ[id]) / GPC);
    let wide = 0;
    if (x1 - x0 > 8) { wide = 1; }
    if (z1 - z0 > 8) { wide = 1; }
    if (wide == 1) {
        addBig(id);
    } else {
        let cz = z0;
        while (cz <= z1) {
            let cx = x0;
            while (cx <= x1) {
                let c = mod((cx + GBIAS) * 131 + (cz + GBIAS) * 401, NGP) + 1;
                let e = 0;
                if (gpFree > 0) { e = gpFree; gpFree = gpNext[e]; }
                else if (nGP < MAXGE) {
                    nGP = nGP + 1;
                    e = nGP;
                    if (gpObj.length < e) { gpObj.push(0); gpNext.push(0); }
                }
                if (e > 0) {
                    gpObj[e] = id;
                    gpNext[e] = gpHead[c];
                    gpHead[c] = e;
                }
                cx = cx + 1;
            }
            cz = cz + 1;
        }
    }
}

// take a solid back out (a mined block, a deleted wall)
function physRemove(id) {
    let x0 = Math.floor((oX[id] - oHX[id]) / GPC);
    let x1 = Math.floor((oX[id] + oHX[id]) / GPC);
    let z0 = Math.floor((oZ[id] - oHZ[id]) / GPC);
    let z1 = Math.floor((oZ[id] + oHZ[id]) / GPC);
    if (x1 - x0 <= 8) {
        if (z1 - z0 <= 8) {
            let cz = z0;
            while (cz <= z1) {
                let cx = x0;
                while (cx <= x1) {
                    let c = mod((cx + GBIAS) * 131 + (cz + GBIAS) * 401, NGP) + 1;
                    let e = gpHead[c];
                    let prev = 0;
                    while (e > 0) {
                        let nx = gpNext[e];
                        if (gpObj[e] == id) {
                            if (prev == 0) { gpHead[c] = nx; } else { gpNext[prev] = nx; }
                            gpObj[e] = 0;
                            gpNext[e] = gpFree;
                            gpFree = e;
                        } else { prev = e; }
                        e = nx;
                    }
                    cx = cx + 1;
                }
                cz = cz + 1;
            }
        }
    }
}

// ============================================================
// objects
// ============================================================
function growObj() {
    oX.push(0); oY.push(0); oZ.push(0);
    oRX.push(0); oRY.push(0); oRZ.push(0);
    oSX.push(1); oSY.push(1); oSZ.push(1);
    oVX.push(0); oVY.push(0); oVZ.push(0);
    oMesh.push(1); oVis.push(0); oTag.push(BLANK); oBody.push(0);
    oGround.push(0); oHit.push(0); oCol.push(0); oFlag.push(0);
    oHX.push(0); oHY.push(0); oHZ.push(0); oRad.push(0);
    oBSlot.push(0); oCell.push(0);
}

function newObj(mesh, x, y, z, sx, sy, sz, col) {
    let id = 0;
    if (nFree > 0) { id = frList[nFree]; nFree = nFree - 1; }
    else if (nObj < MAXOBJ) { nObj = nObj + 1; id = nObj; }
    if (id == 0) { warnMsg = str('오브젝트를 더 만들 수 없습니다. 최대 ', MAXOBJ, '개'); }
    if (id > 0) {
        if (oX.length < id) { growObj(); }
        oMesh[id] = mesh;
        oX[id] = x; oY[id] = y; oZ[id] = z;
        oRX[id] = 0; oRY[id] = 0; oRZ[id] = 0;
        oSX[id] = sx; oSY[id] = sy; oSZ[id] = sz;
        parseColor(col);
        oCol[id] = cR * 65536 + cG * 256 + cB;
        oVis[id] = 1;
        oFlag[id] = F_SHADOW;
        oTag[id] = BLANK;
        oBody[id] = 0;
        oVX[id] = 0; oVY[id] = 0; oVZ[id] = 0;
        oGround[id] = 0; oHit[id] = 0;
        oBSlot[id] = 0; oCell[id] = 0;
        fitCollider(id);
        gridInsert(id);
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
    getShape(id);
    if (shapeRes == 2) {
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
    if (newId > 0) { setShape(newId, 1); }
}
function makeCyl(x, y, z, dia, h, col) { newObj(M_CYL, x, y, z, dia, h, dia, col); }
function makeCone(x, y, z, dia, h, col) { newObj(M_CONE, x, y, z, dia, h, dia, col); }
function makePyr(x, y, z, w, h, d, col) { newObj(M_PYR, x, y, z, w, h, d, col); }
function makeRamp(x, y, z, w, h, d, dir, col) {
    newObj(M_RAMP, x, y, z, w, h, d, col);
    if (newId > 0) {
        oRY[newId] = dir;
        setShape(newId, 2);
        fitCollider(newId);
    }
}
function makeQuad(x, y, z, w, h, col) { newObj(M_QUAD, x, y, z, w, h, 1, col); }
function makeDisc(x, y, z, dia, col) { newObj(M_DISC, x, y, z, dia, 1, dia, col); }
function makeStar(x, y, z, size, col) { newObj(M_STAR, x, y, z, size, size, size, col); }
function makeTree(x, y, z, h, col) { newObj(M_TREE, x, y, z, h, h, h, col); }
function makePerson(x, y, z, h, col) { newObj(M_PERSON, x, y, z, h, h, h, col); }

// A floor centred on the origin: a 5x5 grid of tiles (one huge quad would fog
// as a single flat colour, and the painter's sort would let it cover whatever
// stands on it) plus one invisible slab that carries the collision.
function makeGround(size, col) {
    parseColor(col);
    let r0 = cR; let g0 = cG; let b0 = cB;
    // tiles of about 25 units: big quads fog as one flat colour, and the
    // painter's sort gets unreliable once one polygon covers half the screen
    let n = Math.ceil(size / 25);
    if (n < 3) { n = 3; }
    if (n > 9) { n = 9; }
    let t = size / n;
    let i = 0;
    while (i < n) {
        let j = 0;
        while (j < n) {
            newObj(M_PLANE, (i - (n - 1) / 2) * t, 0, (j - (n - 1) / 2) * t, t, 1, t, BLANK);
            if (newId > 0) {
                let k = 0.94;
                if (mod(i + j, 2) == 0) { k = 1.06; }
                oCol[newId] = Math.floor(r0 * k) * 65536 + Math.floor(g0 * k) * 256 + Math.floor(b0 * k);
                setShadow(newId, 0);
                setLayer(newId, -1);
            }
            j = j + 1;
        }
        i = i + 1;
    }
    newObj(M_BOX, 0, -0.5, 0, size, 1, size, col);
    if (newId > 0) {
        oVis[newId] = 0;
        setShadow(newId, 0);
        setBody(newId, 2);
    }
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
            oCol[d] = oCol[src];
            oRX[d] = oRX[src]; oRY[d] = oRY[src]; oRZ[d] = oRZ[src];
            oFlag[d] = oFlag[src];
            putFlag(d, F_BIG, 0);
            oTag[d] = oTag[src];
            fitCollider(d);
            gridRemove(d);
            gridInsert(d);
            if (oBody[src] != 0) {
                setBody(d, oBody[src]);
                let s = oBSlot[src];
                let t = oBSlot[d];
                if (s > 0) {
                    if (t > 0) { bMass[t] = bMass[s]; bBounce[t] = bBounce[s]; bFric[t] = bFric[s]; }
                }
            }
        }
    }
}

function killObj(id) {
    alive(id);
    if (aliveRes == 1) {
        if (oBody[id] == 2) { physRemove(id); }
        gridRemove(id);
        oVis[id] = 9;               // 9 = dead slot
        oBody[id] = 0;
        oBSlot[id] = 0;
        nFree = nFree + 1;
        if (frList.length < nFree) { frList.push(id); } else { frList[nFree] = id; }
    }
}

// ============================================================
// object transforms
// ============================================================
function setPos(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) {
        if (oBody[id] == 2) { physRemove(id); }
        oX[id] = x; oY[id] = y; oZ[id] = z;
        let s = oBSlot[id];
        if (s > 0) { bPX[s] = x; bPY[s] = y; bPZ[s] = z; }
        putFlag(id, F_SLEEP, 0);
        gridMove(id);
        if (oBody[id] == 2) { physInsert(id); }
    }
}
function movePos(id, x, y, z) {
    alive(id);
    if (aliveRes == 1) { setPos(id, oX[id] + x, oY[id] + y, oZ[id] + z); }
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
    if (aliveRes == 1) {
        oSX[id] = sx; oSY[id] = sy; oSZ[id] = sz;
        fitCollider(id);
        gridRemove(id);
        gridInsert(id);
    }
}
function setColor(id, col) {
    alive(id);
    if (aliveRes == 1) { parseColor(col); oCol[id] = cR * 65536 + cG * 256 + cB; }
}
function setVisible(id, v) { alive(id); if (aliveRes == 1) { oVis[id] = v; } }
function setTag(id, t) { alive(id); if (aliveRes == 1) { oTag[id] = t; } }
function setShadow(id, v) { alive(id); if (aliveRes == 1) { putFlag(id, F_SHADOW, v); } }
function setBillboard(id, v) { alive(id); if (aliveRes == 1) { putFlag(id, F_BILL, v); } }
function setUnlit(id, v) { alive(id); if (aliveRes == 1) { putFlag(id, F_UNLIT, v); } }
function setLayer(id, v) {
    alive(id);
    if (aliveRes == 1) {
        putFlag(id, F_BACK, 0);
        putFlag(id, F_FRONT, 0);
        if (v < 0) { putFlag(id, F_BACK, 1); }
        if (v > 0) { putFlag(id, F_FRONT, 1); }
    }
}
// override the collision box (half sizes) the mesh bounds gave it
function setCollider(id, hx, hy, hz) {
    alive(id);
    if (aliveRes == 1) { oHX[id] = hx; oHY[id] = hy; oHZ[id] = hz; }
}

// walk `d` units along the object's own facing (its Y rotation)
function moveForward(id, d) {
    alive(id);
    if (aliveRes == 1) { setPos(id, oX[id] + sind(oRY[id]) * d, oY[id], oZ[id] + cosd(oRY[id]) * d); }
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
    if (aliveRes == 1) { setPos(id, oX[id], fy + oHY[id], oZ[id]); }
}

// ============================================================
// user meshes:  모양 시작 -> 점 추가 ... -> 면 추가 ... -> 모양 완성
// The pools grow with push, so a project that makes no shapes ships none.
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
            if (vpX.length < nV) { vpX.push(x); vpY.push(y); vpZ.push(z); }
            else { vpX[nV] = x; vpY[nV] = y; vpZ[nV] = z; }
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
        let pa = bmVS + a; let pb = bmVS + b; let pc = bmVS + c;
        let ux = vpX[pb] - vpX[pa]; let uy = vpY[pb] - vpY[pa]; let uz = vpZ[pb] - vpZ[pa];
        let wx = vpX[pc] - vpX[pa]; let wy = vpY[pc] - vpY[pa]; let wz = vpZ[pc] - vpZ[pa];
        let nx = uy * wz - uz * wy;
        let ny = uz * wx - ux * wz;
        let nz = ux * wy - uy * wx;
        let L = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (L < 0.000001) { L = 1; }
        // the outward normal is the other way round: see render.js on winding
        nx = 0 - nx / L; ny = 0 - ny / L; nz = 0 - nz / L;
        let fc = -1;
        if (strlen(col) >= 2) {
            parseColor(col);
            fc = cR * 65536 + cG * 256 + cB;
        }
        // faces a user typed in are two-sided: the order of the points never
        // decides whether the face shows up, and the light follows the side
        if (fpA.length < nF) {
            fpA.push(a); fpB.push(b); fpC.push(c); fpD.push(d);
            fpNX.push(nx); fpNY.push(ny); fpNZ.push(nz); fpCol.push(fc); fpTwo.push(1);
        } else {
            fpA[nF] = a; fpB[nF] = b; fpC[nF] = c; fpD[nF] = d;
            fpNX[nF] = nx; fpNY[nF] = ny; fpNZ[nF] = nz; fpCol[nF] = fc; fpTwo[nF] = 1;
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
                let rad = Math.sqrt(r2);
                if (mVS.length < nMesh) {
                    mVS.push(bmVS); mVN.push(bmN); mFS.push(bmFS); mFN.push(nF - bmFS);
                    mHX.push(hx); mHY.push(hy); mHZ.push(hz); mRad.push(rad); mLod.push(0);
                } else {
                    mVS[nMesh] = bmVS; mVN[nMesh] = bmN; mFS[nMesh] = bmFS; mFN[nMesh] = nF - bmFS;
                    mHX[nMesh] = hx; mHY[nMesh] = hy; mHZ[nMesh] = hz; mRad[nMesh] = rad; mLod[nMesh] = 0;
                }
                newMesh = nMesh;
            }
        }
        bmOn = 0;
    }
}

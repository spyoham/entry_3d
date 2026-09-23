// ============================================================
// world.js - tools that build a world for you:
//   * 글자 지도   a list of strings turns into walls, floors, props
//   * 지형        a smooth height field, drawn as chunks, walkable
//   * 블록        voxel blocks on a grid, with a hash so they can be removed
//   * 풍경 뿌리기  scattering trees and rocks about
// ============================================================
const NBK = 1024;                // voxel hash buckets

let mapList = [];                // the user fills this one: one string per row
let mapCell = 4;
let mapRows = 0; let mapCols = 0;
let mapStartX = 0; let mapStartZ = 0;
let mapGoalX = 0; let mapGoalZ = 0;

let tgN = 0; let tgSize = 0; let tgStep = 1; let tgSeed = 7;
let tgH = [];
let heightRes = 0;
let hashRes = 0;
let keyRes = 0;

let blkSize = 2;
let nBK = 0; let bkFree = 0;
let bkHead = []; let bkNext = []; let bkObj = []; let bkKey = [];
let cellX = 0; let cellY = 0; let cellZ = 0;
let blockObj = 0;
let scatterSeed = 12345;

// a small deterministic hash -> 0..1 (kept far below 2^53 on purpose)
function hash01(i, j, s) {
    let n = mod(i * 1103 + j * 7919 + s * 104729, 65536);
    n = mod(n * 8121 + 28411, 134456);
    hashRes = n / 134456;
}

// ============================================================
// 글자 지도
// ============================================================
function mapFloorRun(x0, x1, r, col, low) {
    let cols = mapCols;
    let rows = mapRows;
    let wx = ((x0 + x1) / 2 - 0.5 - cols / 2) * mapCell;
    let wz = (r - 0.5 - rows / 2) * mapCell;
    let w = (x1 - x0 + 1) * mapCell;
    newObj(M_PLANE, wx, low, wz, w, 1, mapCell, col);
    if (newId > 0) { setShadow(newId, 0); setLayer(newId, -1); }
}

function mapBuild(cell, height, wallCol, floorCol) {
    mapCell = cell;
    mapRows = mapList.length;
    if (mapRows > 0) {
        mapCols = strlen(mapList[1]);
        let r = 1;
        while (r <= mapRows) {
            let row = mapList[r];
            let cols = strlen(row);
            let c = 1;
            while (c <= cols) {
                let ch = charAt(row, c);
                let wx = (c - 0.5 - mapCols / 2) * mapCell;
                let wz = (r - 0.5 - mapRows / 2) * mapCell;
                let step = 1;
                if (ch == '#') {
                    // merge a run of walls into one box: fewer objects, fewer faces
                    let len = 1;
                    let go = 1;
                    while (go == 1) {
                        if (c + len <= cols) {
                            if (charAt(row, c + len) == '#') { len = len + 1; } else { go = 0; }
                        } else { go = 0; }
                    }
                    let mx = (c - 0.5 + (len - 1) / 2 - mapCols / 2) * mapCell;
                    makeBox(mx, height / 2, wz, len * mapCell, height, mapCell, wallCol);
                    setBody(newId, 2);
                    setTag(newId, '벽');
                    step = len;
                } else if (ch == '=') {
                    makeBox(wx, height * 0.2, wz, mapCell, height * 0.4, mapCell, wallCol);
                    setBody(newId, 2);
                    setTag(newId, '벽');
                    mapFloorRun(c, c, r, floorCol, 0);
                } else if (ch == ' ') {
                    step = 1;
                } else {
                    mapFloorRun(c, c, r, floorCol, 0);
                    if (ch == 'S') { mapStartX = wx; mapStartZ = wz; }
                    else if (ch == 'G') {
                        mapGoalX = wx; mapGoalZ = wz;
                        makeCyl(wx, 0.6, wz, mapCell * 0.7, 1.2, '연두');
                        setUnlit(newId, 1);
                        setBody(newId, 3);
                        setTag(newId, '골');
                    } else if (ch == 'T') {
                        makeTree(wx, mapCell * 0.9, wz, mapCell * 1.8, '초록');
                        setBody(newId, 2);
                        setTag(newId, '나무');
                    } else if (ch == '*') {
                        makeStar(wx, 1.4, wz, mapCell * 0.5, '금색');
                        setUnlit(newId, 1);
                        setBody(newId, 3);
                        setTag(newId, '별');
                    } else if (ch == 'W') {
                        newObj(M_PLANE, wx, -0.35, wz, mapCell, 1, mapCell, '바다');
                        if (newId > 0) { setShadow(newId, 0); setLayer(newId, -1); }
                    }
                }
                c = c + step;
            }
            r = r + 1;
        }
        // one invisible slab under the whole map carries the floor collision
        makeBox(0, -0.5, 0, mapCols * mapCell, 1, mapRows * mapCell, floorCol);
        oVis[newId] = 0;
        setShadow(newId, 0);
        setBody(newId, 2);
    }
}

// ============================================================
// 지형 (height field)
// ============================================================
function terrainHeight(x, z) {
    heightRes = 0;
    if (tgN > 0) {
        let fx = (x + tgSize / 2) / tgStep;
        let fz = (z + tgSize / 2) / tgStep;
        if (fx < 0) { fx = 0; }
        if (fz < 0) { fz = 0; }
        if (fx > tgN - 0.001) { fx = tgN - 0.001; }
        if (fz > tgN - 0.001) { fz = tgN - 0.001; }
        let i = Math.floor(fx);
        let j = Math.floor(fz);
        let u = fx - i;
        let v = fz - j;
        let w = tgN + 1;
        let h00 = tgH[j * w + i + 1];
        let h10 = tgH[j * w + i + 2];
        let h01 = tgH[(j + 1) * w + i + 1];
        let h11 = tgH[(j + 1) * w + i + 2];
        heightRes = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
    }
}

// smooth hills: bilinear value noise plus a finer octave
function terrainSample(i, j, height, rough) {
    let gx = i / 6;
    let gz = j / 6;
    let ix = Math.floor(gx);
    let iz = Math.floor(gz);
    let u = gx - ix;
    let v = gz - iz;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    hash01(ix, iz, tgSeed); let a = hashRes;
    hash01(ix + 1, iz, tgSeed); let b = hashRes;
    hash01(ix, iz + 1, tgSeed); let c = hashRes;
    hash01(ix + 1, iz + 1, tgSeed); let d = hashRes;
    let big = a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    let fx = i / 2;
    let fz = j / 2;
    let jx = Math.floor(fx);
    let jz = Math.floor(fz);
    let u2 = fx - jx;
    let v2 = fz - jz;
    u2 = u2 * u2 * (3 - 2 * u2);
    v2 = v2 * v2 * (3 - 2 * v2);
    hash01(jx, jz, tgSeed + 5); let e = hashRes;
    hash01(jx + 1, jz, tgSeed + 5); let f = hashRes;
    hash01(jx, jz + 1, tgSeed + 5); let g = hashRes;
    hash01(jx + 1, jz + 1, tgSeed + 5); let h = hashRes;
    let small = e * (1 - u2) * (1 - v2) + f * u2 * (1 - v2) + g * (1 - u2) * v2 + h * u2 * v2;
    heightRes = (big + (small - 0.5) * rough) * height;
}

function terrainMake(size, cells, height, rough, seed) {
    tgSize = size;
    tgN = cells;
    if (tgN > 48) { tgN = 48; }
    if (tgN < 4) { tgN = 4; }
    tgStep = tgSize / tgN;
    tgSeed = seed;
    let w = tgN + 1;
    let j = 0;
    while (j <= tgN) {
        let i = 0;
        while (i <= tgN) {
            terrainSample(i, j, height, rough);
            let k = j * w + i + 1;
            if (tgH.length < k) { tgH.push(heightRes); } else { tgH[k] = heightRes; }
            i = i + 1;
        }
        j = j + 1;
    }
    // the visible part: one mesh per chunk so distance culling still works
    let cs = 8;
    let nc = Math.ceil(tgN / cs);
    let cj = 0;
    while (cj < nc) {
        let ci = 0;
        while (ci < nc) {
            terrainChunk(ci * cs, cj * cs, cs);
            ci = ci + 1;
        }
        cj = cj + 1;
    }
    // ...and one invisible collider that answers with the height field
    makeBox(0, 0, 0, size, 4, size, '잔디');
    oVis[newId] = 0;
    setShadow(newId, 0);
    setShape(newId, 4);
    oHX[newId] = size / 2; oHY[newId] = 60; oHZ[newId] = size / 2;
    setBody(newId, 2);
    setTag(newId, '지형');
}

function terrainChunk(i0, j0, cs) {
    let i1 = i0 + cs;
    let j1 = j0 + cs;
    if (i1 > tgN) { i1 = tgN; }
    if (j1 > tgN) { j1 = tgN; }
    let w = tgN + 1;
    let ox = (i0 + (i1 - i0) / 2) * tgStep - tgSize / 2;
    let oz = (j0 + (j1 - j0) / 2) * tgStep - tgSize / 2;
    meshStart();
    let j = j0;
    while (j <= j1) {
        let i = i0;
        while (i <= i1) {
            meshPoint(i * tgStep - tgSize / 2 - ox, tgH[j * w + i + 1], j * tgStep - tgSize / 2 - oz);
            i = i + 1;
        }
        j = j + 1;
    }
    let nw = i1 - i0 + 1;
    j = 0;
    while (j < j1 - j0) {
        let i = 0;
        while (i < i1 - i0) {
            let a = j * nw + i + 1;
            let b = a + 1;
            let c = a + nw + 1;
            let d = a + nw;
            let hh = (tgH[(j0 + j) * w + i0 + i + 1] + tgH[(j0 + j + 1) * w + i0 + i + 2]) / 2;
            let col = '잔디';
            if (hh > 7) { col = '돌'; }
            else if (hh > 4) { col = '흙'; }
            else if (hh < 0.6) { col = '모래'; }
            meshFace(a, b, c, d, col);
            i = i + 1;
        }
        j = j + 1;
    }
    meshEnd();
    let hi = newMesh;
    // the same chunk at half the resolution, used once it is small on screen
    meshStart();
    j = j0;
    while (j <= j1) {
        let i = i0;
        while (i <= i1) {
            meshPoint(i * tgStep - tgSize / 2 - ox, tgH[j * w + i + 1], j * tgStep - tgSize / 2 - oz);
            i = i + 2;
        }
        j = j + 2;
    }
    let lw = Math.floor((i1 - i0) / 2) + 1;
    let lh = Math.floor((j1 - j0) / 2) + 1;
    j = 0;
    while (j < lh - 1) {
        let i = 0;
        while (i < lw - 1) {
            let a = j * lw + i + 1;
            meshFace(a, a + 1, a + lw + 1, a + lw, '잔디');
            i = i + 1;
        }
        j = j + 1;
    }
    meshEnd();
    let lo = newMesh;
    if (hi > 0) {
        if (lo > 0) { setLod(hi, lo); }
        makeFromMesh(hi, ox, 0, oz, 1, '잔디');
        if (newId > 0) { setShadow(newId, 0); }
    }
}

// ============================================================
// 블록 (voxel)
// ============================================================
function setBlockSize(s) { if (s > 0.1) { blkSize = s; } }

function blockKey(cx, cy, cz) {
    keyRes = (cx + 512) * 1048576 + (cy + 512) * 1024 + (cz + 512);
    hashRes = mod(keyRes, NBK) + 1;
}

function blockAt(cx, cy, cz) {
    blockKey(cx, cy, cz);
    let k = keyRes;
    let e = bkHead[hashRes];
    blockObj = 0;
    while (e > 0) {
        if (bkKey[e] == k) {
            blockObj = bkObj[e];
            e = 0;
        } else { e = bkNext[e]; }
    }
}

function blockPut(cx, cy, cz, col) {
    blockAt(cx, cy, cz);
    if (blockObj == 0) {
        blockKey(cx, cy, cz);
        let k = keyRes;
        let h = hashRes;
        makeBox(cx * blkSize, cy * blkSize, cz * blkSize, blkSize, blkSize, blkSize, col);
        if (newId > 0) {
            setBody(newId, 2);
            setShadow(newId, 0);
            setTag(newId, '블록');
            let e = 0;
            if (bkFree > 0) { e = bkFree; bkFree = bkNext[e]; }
            else {
                nBK = nBK + 1;
                e = nBK;
                if (bkObj.length < e) { bkObj.push(0); bkKey.push(0); bkNext.push(0); }
            }
            bkObj[e] = newId;
            bkKey[e] = k;
            bkNext[e] = bkHead[h];
            bkHead[h] = e;
            blockObj = newId;
        }
    }
}

function blockDig(cx, cy, cz) {
    blockKey(cx, cy, cz);
    let k = keyRes;
    let h = hashRes;
    let e = bkHead[h];
    let prev = 0;
    blockObj = 0;
    while (e > 0) {
        let nx = bkNext[e];
        if (bkKey[e] == k) {
            killObj(bkObj[e]);
            blockObj = bkObj[e];
            if (prev == 0) { bkHead[h] = nx; } else { bkNext[prev] = nx; }
            bkObj[e] = 0;
            bkNext[e] = bkFree;
            bkFree = e;
            e = 0;
        } else {
            prev = e;
            e = nx;
        }
    }
}

// world position -> block cell (cellX/cellY/cellZ)
function blockCellOf(x, y, z) {
    cellX = Math.round(x / blkSize);
    cellY = Math.round(y / blkSize);
    cellZ = Math.round(z / blkSize);
}

// a floor of blocks, the usual starting point for a block world
function blockFloor(wide, deep, cy, col) {
    let i = 0 - wide;
    while (i <= wide) {
        let j = 0 - deep;
        while (j <= deep) {
            blockPut(i, cy, j, col);
            j = j + 1;
        }
        i = i + 1;
    }
}

// ============================================================
// 풍경 뿌리기
// ============================================================
function scatter(count, kind, area, keepOut) {
    let i = 1;
    while (i <= count) {
        hash01(i, 1, scatterSeed); let ux = hashRes;
        hash01(i, 2, scatterSeed); let uz = hashRes;
        hash01(i, 3, scatterSeed); let us = hashRes;
        let x = (ux - 0.5) * area;
        let z = (uz - 0.5) * area;
        if (x * x + z * z > keepOut * keepOut) {
            let y = 0;
            if (tgN > 0) { terrainHeight(x, z); y = heightRes; }
            let k = kind;
            if (kind == 0) { k = mod(i, 3) + 1; }
            if (k == 1) {
                let h = 4 + us * 3;
                makeTree(x, y + h / 2, z, h, '초록');
                setBody(newId, 2);
                setTag(newId, '나무');
            } else if (k == 2) {
                let s = 1 + us * 2;
                makeBall(x, y + s * 0.35, z, s, '돌');
                setShape(newId, 0);
                setBody(newId, 2);
                setTag(newId, '바위');
            } else {
                let s = 0.8 + us;
                makeCone(x, y + s * 0.4, z, s * 0.9, s * 0.8, '연두');
                setShadow(newId, 0);
            }
        }
        i = i + 1;
    }
}

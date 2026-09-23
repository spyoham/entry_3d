// ============================================================
// build.mjs - bakes the meshes / colour table, compiles src/*.js into Entry
// blocks and packs "3D v5.ent".
//
//   node build.mjs [out.ent]
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { compileProgram } from './ejs.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

// ============================================================
// mesh baking
// ============================================================
const M = { v: [], f: [] };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];

let curStart = 0;                       // first vertex of the mesh being built
const meshes = [];                      // { vs, vn, fs, fn }

function mStart() { curStart = M.v.length; return { vs: M.v.length, fs: M.f.length }; }
function vert(x, y, z) { M.v.push([x, y, z]); return M.v.length - curStart; }   // 1-based inside the mesh

// `ref` is the centre of the primitive this face belongs to: the face is wound
// so that its screen area is positive when seen from outside (see render.js).
function face(idx, ref, col, two = 0) {
    const g = idx.map((i) => M.v[curStart + i - 1]);
    const n = cross(sub(g[1], g[0]), sub(g[2], g[0]));
    const cen = [0, 1, 2].map((k) => g.reduce((s, p) => s + p[k], 0) / g.length);
    if (dot(n, sub(cen, ref)) > 0) idx = idx.slice().reverse();
    const h = idx.map((i) => M.v[curStart + i - 1]);
    const nn = cross(sub(h[1], h[0]), sub(h[2], h[0]));
    const L = Math.hypot(nn[0], nn[1], nn[2]) || 1;
    M.f.push({
        a: idx[0], b: idx[1], c: idx[2], d: idx[3] || 0,
        nx: -nn[0] / L, ny: -nn[1] / L, nz: -nn[2] / L,      // outward normal
        col: col === undefined ? -1 : col, two,
    });
}

const packCol = (hex) => parseInt(hex.slice(1, 3), 16) * 65536 + parseInt(hex.slice(3, 5), 16) * 256 + parseInt(hex.slice(5, 7), 16);

function pBox(cx, cy, cz, hx, hy, hz, col) {
    const b = [];
    for (const [sx, sy, sz] of [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]])
        b.push(vert(cx + sx * hx, cy + sy * hy, cz + sz * hz));
    const r = [cx, cy, cz];
    face([b[0], b[1], b[2], b[3]], r, col);
    face([b[4], b[5], b[6], b[7]], r, col);
    face([b[0], b[1], b[5], b[4]], r, col);
    face([b[3], b[7], b[6], b[2]], r, col);
    face([b[0], b[4], b[7], b[3]], r, col);
    face([b[1], b[2], b[6], b[5]], r, col);
}

function pCyl(cx, cy, cz, r, hy, sides, col, colTop) {
    const lo = [];
    const hi = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        lo.push(vert(cx + Math.cos(a) * r, cy - hy, cz + Math.sin(a) * r));
    }
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        hi.push(vert(cx + Math.cos(a) * r, cy + hy, cz + Math.sin(a) * r));
    }
    const ref = [cx, cy, cz];
    for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        face([lo[i], lo[j], hi[j], hi[i]], ref, col);
    }
    for (let i = 1; i < sides - 1; i++) {
        face([hi[0], hi[i], hi[i + 1]], [cx, cy + hy * 0.999, cz], colTop === undefined ? col : colTop);
        face([lo[0], lo[i], lo[i + 1]], [cx, cy - hy * 0.999, cz], col);
    }
}

function pCone(cx, cy, cz, r, y0, y1, sides, col) {
    const ring = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        ring.push(vert(cx + Math.cos(a) * r, cy + y0, cz + Math.sin(a) * r));
    }
    const top = vert(cx, cy + y1, cz);
    const ref = [cx, cy + (y0 + y1) / 2, cz];
    for (let i = 0; i < sides; i++) face([ring[i], ring[(i + 1) % sides], top], ref, col);
    for (let i = 1; i < sides - 1; i++) face([ring[0], ring[i], ring[i + 1]], [cx, cy + y0 * 1.02 - 0.01, cz], col);
}

function pSphere(cx, cy, cz, r, seg, stacks, col) {
    const rows = [];
    for (let s = 1; s < stacks; s++) {
        const phi = Math.PI * (s / stacks) - Math.PI / 2;
        const row = [];
        for (let i = 0; i < seg; i++) {
            const a = (i / seg) * Math.PI * 2;
            row.push(vert(cx + Math.cos(phi) * Math.cos(a) * r, cy + Math.sin(phi) * r, cz + Math.cos(phi) * Math.sin(a) * r));
        }
        rows.push(row);
    }
    const bot = vert(cx, cy - r, cz);
    const top = vert(cx, cy + r, cz);
    const ref = [cx, cy, cz];
    for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        face([rows[0][i], rows[0][j], bot], ref, col);
        face([rows[rows.length - 1][i], rows[rows.length - 1][j], top], ref, col);
    }
    for (let s = 0; s < rows.length - 1; s++)
        for (let i = 0; i < seg; i++) {
            const j = (i + 1) % seg;
            face([rows[s][i], rows[s][j], rows[s + 1][j], rows[s + 1][i]], ref, col);
        }
}

function endMesh(mark) {
    const vs = mark.vs;
    const vn = M.v.length - vs;
    const fs = mark.fs;
    const fn = M.f.length - fs;
    let hx = 0; let hy = 0; let hz = 0; let r2 = 0;
    for (let i = vs; i < M.v.length; i++) {
        const p = M.v[i];
        hx = Math.max(hx, Math.abs(p[0]));
        hy = Math.max(hy, Math.abs(p[1]));
        hz = Math.max(hz, Math.abs(p[2]));
        r2 = Math.max(r2, p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
    }
    // mVS / mFS are BASES (the runtime reads vpX[vs + i] with i starting at 1)
    meshes.push({ vs, vn, fs, fn, hx, hy, hz, rad: Math.sqrt(r2) });
}

function buildMeshes() {
    let k;
    // 1 box
    k = mStart(); pBox(0, 0, 0, 0.5, 0.5, 0.5); endMesh(k);
    // 2 sphere, 3 low-poly sphere
    k = mStart(); pSphere(0, 0, 0, 0.5, 8, 5); endMesh(k);
    k = mStart(); pSphere(0, 0, 0, 0.5, 6, 3); endMesh(k);
    // 4 cylinder
    k = mStart(); pCyl(0, 0, 0, 0.5, 0.5, 8); endMesh(k);
    // 5 cone
    k = mStart(); pCone(0, 0, 0, 0.5, -0.5, 0.5, 8); endMesh(k);
    // 6 pyramid
    k = mStart();
    {
        const b1 = vert(-0.5, -0.5, -0.5); const b2 = vert(0.5, -0.5, -0.5);
        const b3 = vert(0.5, -0.5, 0.5); const b4 = vert(-0.5, -0.5, 0.5);
        const t = vert(0, 0.5, 0);
        const r = [0, -0.1, 0];
        face([b1, b2, b3, b4], r); face([b1, b2, t], r); face([b2, b3, t], r);
        face([b3, b4, t], r); face([b4, b1, t], r);
    }
    endMesh(k);
    // 7 flat plane (lies on y = 0, visible from both sides)
    k = mStart();
    {
        const a = vert(-0.5, 0, -0.5); const b = vert(0.5, 0, -0.5);
        const c = vert(0.5, 0, 0.5); const d = vert(-0.5, 0, 0.5);
        face([a, b, c, d], [0, -1, 0], undefined, 1);
    }
    endMesh(k);
    // 8 upright quad (billboards, signs)
    k = mStart();
    {
        const a = vert(-0.5, -0.5, 0); const b = vert(0.5, -0.5, 0);
        const c = vert(0.5, 0.5, 0); const d = vert(-0.5, 0.5, 0);
        face([a, b, c, d], [0, 0, 1], undefined, 1);
    }
    endMesh(k);
    // 9 ramp: rises along +z
    k = mStart();
    {
        const b1 = vert(-0.5, -0.5, -0.5); const b2 = vert(0.5, -0.5, -0.5);
        const b3 = vert(0.5, -0.5, 0.5); const b4 = vert(-0.5, -0.5, 0.5);
        const t1 = vert(0.5, 0.5, 0.5); const t2 = vert(-0.5, 0.5, 0.5);
        const r = [0, -1 / 6, 1 / 6];
        face([b1, b2, b3, b4], r);          // floor
        face([b4, b3, t1, t2], r);          // tall back
        face([b1, b2, t1, t2], r);          // the slope
        face([b2, b3, t1], r); face([b1, b4, t2], r);
    }
    endMesh(k);
    // 10 person (head / body / arms / legs), 1 unit tall
    k = mStart();
    {
        const skin = packCol('#f0c9a0');
        pBox(0, 0.32, 0, 0.11, 0.1, 0.1, skin);         // head
        pBox(0, 0.06, 0, 0.15, 0.16, 0.09);             // torso
        pBox(-0.2, 0.06, 0, 0.05, 0.14, 0.05, skin);    // arms
        pBox(0.2, 0.06, 0, 0.05, 0.14, 0.05, skin);
        pBox(-0.08, -0.3, 0, 0.06, 0.2, 0.06, packCol('#3a4660'));   // legs
        pBox(0.08, -0.3, 0, 0.06, 0.2, 0.06, packCol('#3a4660'));
    }
    endMesh(k);
    // 11 tree
    k = mStart();
    {
        pBox(0, -0.3, 0, 0.055, 0.2, 0.055, packCol('#6d4c41'));
        pCone(0, 0, 0, 0.3, -0.2, 0.22, 7, packCol('#3f8f45'));
        pCone(0, 0, 0, 0.22, 0.12, 0.5, 7, packCol('#4aa352'));
    }
    endMesh(k);
    // 12 disc (a flat octagon, both sides)
    k = mStart();
    {
        const ring = [];
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ring.push(vert(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5));
        }
        for (let i = 1; i < 7; i++) face([ring[0], ring[i], ring[i + 1]], [0, -1, 0], undefined, 1);
    }
    endMesh(k);
    // 13 star (flat, both sides)  (14-16 are the low-detail stand-ins)
    k = mStart();
    {
        const pts = [];
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
            const r = i % 2 === 0 ? 0.5 : 0.21;
            pts.push(vert(Math.cos(a) * r, Math.sin(a) * r, 0));
        }
        const c = vert(0, 0, 0);
        for (let i = 0; i < 10; i++) face([c, pts[i], pts[(i + 1) % 10]], [0, 0, 1], undefined, 1);
    }
    endMesh(k);
    // 14 simple tree
    k = mStart();
    {
        pBox(0, -0.3, 0, 0.06, 0.2, 0.06, packCol('#6d4c41'));
        pCone(0, 0, 0, 0.3, -0.2, 0.5, 4, packCol('#42964a'));
    }
    endMesh(k);
    // 15 blocky person
    k = mStart();
    {
        pBox(0, 0.32, 0, 0.11, 0.1, 0.1, packCol('#f0c9a0'));
        pBox(0, -0.1, 0, 0.16, 0.32, 0.1);
    }
    endMesh(k);
    // 16 five-sided cylinder
    k = mStart(); pCyl(0, 0, 0, 0.5, 0.5, 5); endMesh(k);
}

// ============================================================
// colour names
// ============================================================
const COLORS = [
    ['빨강', '#e5392f'], ['주황', '#f57c00'], ['노랑', '#f9c22e'], ['연두', '#9ccc42'],
    ['초록', '#3f9142'], ['청록', '#12907d'], ['하늘', '#57bdf2'], ['파랑', '#2a7fd4'],
    ['남색', '#31439b'], ['보라', '#8b3fb0'], ['분홍', '#ef6aa0'], ['자주', '#a2265c'],
    ['갈색', '#7a5545'], ['살구', '#f3c08a'], ['검정', '#20242b'], ['회색', '#9aa1ab'],
    ['하양', '#f2f4f7'], ['흰색', '#f2f4f7'], ['금색', '#e8b234'], ['은색', '#c8d0d8'],
    ['잔디', '#5aa63c'], ['흙', '#a3856a'], ['모래', '#e0c68a'], ['바다', '#1c72b0'],
    ['벽돌', '#b5533c'], ['돌', '#8d949c'], ['나무', '#6d4c41'], ['밤', '#1b2440'],
    ['어두운회색', '#4a4f57'], ['밝은회색', '#d7dde3'], ['크림', '#f6e7c4'], ['민트', '#7fd8c0'],
];

// ============================================================
// function labels  (order here = order in Entry's function list)
// ============================================================
const LABELS = [
    // --- 엔진 ---
    ['engineStart', '🟦3D 엔진 시작하기'],
    ['worldClear', '🟦3D 월드 비우기'],
    ['frameBegin', '🟦프레임 시작하기'],
    ['drawScene', '🟦3D 장면 그리기'],
    // --- 오브젝트 만들기 ---
    ['makeBox', '📦상자 만들기  x %1  y %2  z %3  가로 %4  높이 %5  세로 %6  색 %7'],
    ['makeBall', '📦공 만들기  x %1  y %2  z %3  지름 %4  색 %5'],
    ['makeCyl', '📦원기둥 만들기  x %1  y %2  z %3  지름 %4  높이 %5  색 %6'],
    ['makeCone', '📦원뿔 만들기  x %1  y %2  z %3  지름 %4  높이 %5  색 %6'],
    ['makePyr', '📦피라미드 만들기  x %1  y %2  z %3  가로 %4  높이 %5  세로 %6  색 %7'],
    ['makeRamp', '📦경사면 만들기  x %1  y %2  z %3  가로 %4  높이 %5  세로 %6  방향 %7  색 %8'],
    ['makeGround', '📦바닥 만들기  크기 %1  색 %2'],
    ['makeQuad', '📦네모판 만들기  x %1  y %2  z %3  가로 %4  높이 %5  색 %6'],
    ['makeDisc', '📦원판 만들기  x %1  y %2  z %3  지름 %4  색 %5'],
    ['makeStar', '📦별 만들기  x %1  y %2  z %3  크기 %4  색 %5'],
    ['makeTree', '📦나무 만들기  x %1  y %2  z %3  높이 %4  색 %5'],
    ['makePerson', '📦사람 만들기  x %1  y %2  z %3  키 %4  색 %5'],
    ['makeFromMesh', '📦모양 %1 번으로 만들기  x %2  y %3  z %4  크기 %5  색 %6'],
    ['cloneObj', '📦오브젝트 %1 복제하기  x %2  y %3  z %4'],
    ['killObj', '📦오브젝트 %1 지우기'],
    // --- 모양 디자인 ---
    ['meshStart', '🔷새 모양 만들기 시작'],
    ['meshPoint', '🔷모양에 점 추가  x %1  y %2  z %3'],
    ['meshFace', '🔷모양에 면 추가  점 %1 %2 %3 %4  색 %5'],
    ['meshEnd', '🔷모양 완성하기'],
    ['setLod', '🔷모양 %1 의 먼 거리 모양을 %2 번으로 정하기'],
    // --- 오브젝트 조작 ---
    ['setPos', '🔶오브젝트 %1 위치를  x %2  y %3  z %4  로 정하기'],
    ['movePos', '🔶오브젝트 %1 을  x %2  y %3  z %4  만큼 움직이기'],
    ['setRot', '🔶오브젝트 %1 회전을  x %2  y %3  z %4  로 정하기'],
    ['turnObj', '🔶오브젝트 %1 을  x %2  y %3  z %4  만큼 돌리기'],
    ['setScale', '🔶오브젝트 %1 크기를  x %2  y %3  z %4  로 정하기'],
    ['setColor', '🔶오브젝트 %1 색을 %2 로 정하기'],
    ['setVisible', '🔶오브젝트 %1 보이기(1)/숨기기(0) %2'],
    ['setTag', '🔶오브젝트 %1 이름표를 %2 로 정하기'],
    ['setShadow', '🔶오브젝트 %1 그림자 %2'],
    ['setBillboard', '🔶오브젝트 %1 항상 카메라 보기 %2'],
    ['setUnlit', '🔶오브젝트 %1 빛 무시하기 %2'],
    ['setLayer', '🔶오브젝트 %1 그리기 층을 %2 로 정하기 (-1 바닥 0 보통 1 맨앞)'],
    ['setCollider', '🔶오브젝트 %1 의 충돌 크기를  가로 %2  높이 %3  세로 %4  로 정하기'],
    ['moveForward', '🔶오브젝트 %1 을 바라보는 쪽으로 %2 만큼 가기'],
    ['lookAtObj', '🔶오브젝트 %1 이  x %2  y %3  z %4  를 바라보게 하기'],
    ['putOnFloor', '🔶오브젝트 %1 을 바닥 높이 %2 에 세우기'],
    // --- 움직임(트윈)과 붙이기 ---
    ['tweenMove', '🎞️오브젝트 %1 을 %2 초 동안  x %3  y %4  z %5  로 옮기기  부드럽게 %6'],
    ['tweenTurn', '🎞️오브젝트 %1 을 %2 초 동안  회전 x %3  y %4  z %5  로 돌리기  부드럽게 %6'],
    ['tweenSize', '🎞️오브젝트 %1 을 %2 초 동안  크기 %3 %4 %5  로 바꾸기  부드럽게 %6'],
    ['tweenStop', '🎞️오브젝트 %1 의 움직임 멈추기'],
    ['attachTo', '🎞️오브젝트 %1 을 오브젝트 %2 에 붙이기  x %3  y %4  z %5  회전 %6'],
    ['detach', '🎞️오브젝트 %1 을 떼어내기'],
    ['timerSet', '🎞️타이머 %1 번을 %2 초로 맞추기'],
    // --- 물리 ---
    ['setGravity', '⚙️중력을 %1 로 정하기'],
    ['setBody', '⚙️오브젝트 %1 의 물리를 %2 로 정하기 (0없음 1움직임 2고정 3센서 4발판)'],
    ['setBounce', '⚙️오브젝트 %1 의 튕김 %2  마찰 %3 로 정하기'],
    ['setMass', '⚙️오브젝트 %1 의 무게를 %2 로 정하기'],
    ['setSphereShape', '⚙️오브젝트 %1 을 공 충돌로 %2 (1켜기 0끄기)'],
    ['setCapsuleShape', '⚙️오브젝트 %1 을 캡슐 충돌로 %2 (1켜기 0끄기)'],
    ['setVel', '⚙️오브젝트 %1 의 속도를  x %2  y %3  z %4  로 정하기'],
    ['addForce', '⚙️오브젝트 %1 에 힘  x %2  y %3  z %4  주기'],
    ['doJump', '⚙️오브젝트 %1 을 %2 높이로 점프시키기'],
    ['physStep', '⚙️물리 계산하기'],
    ['setStepHeight', '⚙️자동으로 올라갈 턱 높이를 %1 로 정하기'],
    ['setSlopeLimit', '⚙️미끄러지기 시작하는 경사를 %1 도로 정하기'],
    ['setWorldBounds', '⚙️세상 경계를 크기 %1  높이 %2 로 정하기'],
    ['touchTest', '⚙️오브젝트 %1 과 %2 가 닿았는지 검사하기'],
    ['touchTag', '⚙️오브젝트 %1 이 이름표 %2 와 닿았는지 검사하기'],
    ['inBox', '⚙️점 %1 %2 %3 이 상자 %4 %5 %6  크기 %7 %8 %9 안에 있는지 검사하기'],
    ['nearPoint', '⚙️오브젝트 %1 이 점 %2 %3 %4 에서 %5 안에 있는지 검사하기'],
    ['rayCast', '⚙️광선 쏘기  시작 %1 %2 %3  방향 %4 %5 %6  거리 %7  제외 %8'],
    ['charMove', '⚙️캐릭터 %1 움직이기  앞뒤 %2  좌우 %3  속도 %4'],
    ['keyControl', '⚙️오브젝트 %1 을 키보드로 조종하기  속도 %2  점프높이 %3'],
    ['driveBody', '⚙️오브젝트 %1 을 속도 %2  방향 %3 으로 달리게 하기'],
    ['moveToward', '⚙️오브젝트 %1 을 오브젝트 %2 쪽으로 속도 %3 으로 가게 하기'],
    ['distObjs', '📐오브젝트 %1 과 %2 사이 거리 구하기'],
    ['distPoints', '📐점 %1 %2 %3 과 점 %4 %5 %6 사이 거리 구하기'],
    ['angleTo', '📐점 %1 %2 에서 점 %3 %4 를 보는 방향각 구하기'],
    // --- 월드 만들기 ---
    ['mapBuild', '🌍글자 지도로 월드 만들기  칸크기 %1  벽높이 %2  벽색 %3  바닥색 %4'],
    ['terrainMake', '🌍지형 만들기  크기 %1  칸수 %2  높이 %3  거칠기 %4  씨앗 %5'],
    ['terrainHeight', '🌍지형 높이 구하기  x %1  z %2'],
    ['scatter', '🌍풍경 뿌리기  개수 %1  종류 %2 (0섞기 1나무 2바위 3풀)  범위 %3  빈자리 %4'],
    ['setBlockSize', '🌍블록 한 칸 크기를 %1 로 정하기'],
    ['blockPut', '🌍블록 놓기  칸 %1 %2 %3  색 %4'],
    ['blockDig', '🌍블록 부수기  칸 %1 %2 %3'],
    ['blockAt', '🌍블록 있는지 보기  칸 %1 %2 %3'],
    ['blockCellOf', '🌍위치 %1 %2 %3 의 블록 칸 구하기'],
    ['blockFloor', '🌍블록 바닥 깔기  가로 %1  세로 %2  높이칸 %3  색 %4'],
    // --- 카메라 ---
    ['camSetPos', '🎥카메라 위치를  x %1  y %2  z %3  으로 정하기'],
    ['camSetAngle', '🎥카메라 각도를  좌우 %1  상하 %2  로 정하기'],
    ['camTurn', '🎥카메라를  좌우 %1  상하 %2  만큼 돌리기'],
    ['camLookAt', '🎥카메라가  x %1  y %2  z %3  을 바라보게 하기'],
    ['camFirst', '🎥카메라 1인칭  오브젝트 %1  눈높이 %2'],
    ['camThird', '🎥카메라 3인칭  오브젝트 %1  거리 %2  높이 %3  부드럽게 %4'],
    ['camOrbit', '🎥카메라 궤도  오브젝트 %1  거리 %2  높이 %3  각도 %4'],
    ['camTweenTo', '🎥카메라를 %1 %2 %3 으로 옮기며 %4 %5 %6 바라보기  시간 %7 초'],
    ['camTweenStop', '🎥카메라 이동 멈추기'],
    ['camSetFov', '🎥카메라 시야각을 %1 로 정하기'],
    ['camSetProjection', '🎥카메라 보기 방식 %1 (0원근 1직교)  크기 %2'],
    ['camShake', '🎥카메라 흔들기 %1'],
    ['mouseLook', '🎥마우스로 시점 돌리기  감도 %1'],
    ['keyLook', '🎥방향키로 시점 돌리기  속도 %1'],
    // --- 렌더링 / 화면 ---
    ['setSky', '🌈하늘색을  위 %1  아래 %2  땅 %3  으로 정하기'],
    ['setLight', '🌈빛 방향  x %1  y %2  z %3  밝기 %4  주변광 %5'],
    ['setViewFar', '🌈보이는 거리를 %1 로 정하기'],
    ['setQuality', '🌈한 화면 최대 면 수를 %1 로 정하기'],
    ['setLodSize', '🌈먼 거리 모양으로 바꾸는 크기를 %1 로 정하기'],
    ['setLodFar', '🌈먼 거리 모양으로 바꾸는 거리를 %1 로 정하기'],
    ['setDrawMode', '🌈그리기 방식을 %1 로 정하기 (0면 1선 2면+선)'],
    ['setShadows', '🌈그림자 %1 (1켜기 0끄기)  바닥 높이 %2'],
    ['setShadowFar', '🌈그림자가 보이는 거리를 %1 로 정하기'],
    ['setDebug', '🌈디버그(충돌상자) 보기 %1'],
    ['worldToScreen', '🌈월드 점  x %1  y %2  z %3  의 화면 위치 구하기'],
    ['hudRect', '🖥️화면에 네모 그리기  x %1  y %2  가로 %3  높이 %4  색 %5'],
    ['hudLine', '🖥️화면에 선 그리기  %1 %2 에서 %3 %4 까지  굵기 %5  색 %6'],
    ['hudBar', '🖥️화면에 막대 그리기  x %1  y %2  가로 %3  높이 %4  값 %5  색 %6  바탕 %7'],
    ['hudCross', '🖥️화면 가운데 조준점  크기 %1  색 %2'],
    ['hudWrite', '🖥️글 %1 번에 %2 쓰기'],
    ['hudPlace', '🖥️글 %1 번을  x %2  y %3  색 %4  로 놓기'],
    ['hudPlace3D', '🖥️글 %1 번을 월드 %2 %3 %4 위치에 %5 로 띄우기'],
    ['hudClear', '🖥️글 모두 지우기'],
];
const LABEL_MAP = Object.fromEntries(LABELS);

// ============================================================
// variable / list names shown in Entry
// ============================================================
const VAR_NAMES = {
    // globals the user reads or writes
    dt: '프레임시간', gt: '흐른시간', fps: 'FPS', frameId: '프레임번호',
    newId: '만든오브젝트', newMesh: '만든모양', nObj: '오브젝트수', drawn: '그린면수',
    nSeen: '보인물체수', warnMsg: '엔진알림',
    camX: '카메라X', camY: '카메라Y', camZ: '카메라Z',
    camYaw: '카메라좌우각', camPitch: '카메라상하각', camRoll: '카메라기울기', camFov: '카메라시야각',
    gravity: '중력', touch: '닿음', touchObj: '닿은상대', nHit: '충돌수',
    rayHit: '광선맞음', rayObj: '광선오브젝트', rayDist: '광선거리',
    rayX: '광선X', rayY: '광선Y', rayZ: '광선Z',
    scrX: '화면X', scrY: '화면Y', scrFront: '화면앞',
    inFwd: '입력앞뒤', inSide: '입력좌우', inJump: '입력점프',
    dist3: '거리', angleOut: '방향각',
    heightRes: '높이', blockObj: '블록오브젝트',
    cellX: '블록칸X', cellY: '블록칸Y', cellZ: '블록칸Z',
    mapStartX: '지도시작X', mapStartZ: '지도시작Z', mapGoalX: '지도골X', mapGoalZ: '지도골Z',
    // lists the user reads or writes
    oX: '오브젝트X', oY: '오브젝트Y', oZ: '오브젝트Z',
    oRX: '오브젝트회전X', oRY: '오브젝트회전Y', oRZ: '오브젝트회전Z',
    oSX: '오브젝트크기X', oSY: '오브젝트크기Y', oSZ: '오브젝트크기Z',
    oVX: '오브젝트속도X', oVY: '오브젝트속도Y', oVZ: '오브젝트속도Z',
    oVis: '오브젝트보임', oTag: '오브젝트이름표', oGround: '오브젝트땅닿음',
    oHit: '오브젝트닿은것', oBody: '오브젝트물리', oMesh: '오브젝트모양',
    hitA: '충돌A', hitB: '충돌B', hudTxt: '화면글',
    cnName: '색이름', mapList: '지도', timerV: '타이머', saveList: '블록저장',
};

// Entry looks a variable up with a linear search through the project's
// variable list, so the order below is the order the renderer touches them.
// (lists and plain variables are searched separately, so one list covers both)
const HOT = [
    // --- the per-vertex transform, by far the hottest code ---
    'm00', 'm01', 'm02', 'm10', 'm11', 'm12', 'm20', 'm21', 'm22',
    'mtX', 'mtY', 'mtZ', 'projA', 'projB',
    'tvZ', 'tsX', 'tsY', 'tvX', 'tvY', 'vpX', 'vpY', 'vpZ',
    // --- polygon assembly ---
    'nPg', 'polyOk', 'polyStart', 'polyN', 'polyFlip', 'clipOn', 'nDraw', 'maxFaces', 'nSv',
    'pgX', 'pgY', 'fpA', 'fpB', 'fpC', 'fpD', 'fpNX', 'fpNY', 'fpNZ', 'fpCol', 'fpTwo',
    'dStart', 'dCount', 'dHex', 'dNext', 'bHead',
    // --- shading ---
    'loX', 'loY', 'loZ', 'ambI', 'lightI', 'fogFar', 'skyR', 'skyG', 'skyB',
    'outHex', 'layerBias',
    // --- camera basis and the object loop ---
    'cfX', 'cfY', 'cfZ', 'crX', 'crY', 'crZ', 'cuX', 'cuY', 'cuZ',
    'chX', 'chZ', 'csX', 'csZ',
    'camX', 'camY', 'camZ', 'camScale', 'tanHalf', 'nObj', 'drawn', 'nSeen', 'orthoOn',
    'oX', 'oY', 'oZ', 'oRad', 'oVis', 'oMesh', 'oFlag', 'oCol', 'oCell',
    'oSX', 'oSY', 'oSZ', 'oRX', 'oRY', 'oRZ',
    'oHX', 'oHY', 'oHZ', 'mVS', 'mVN', 'mFS', 'mFN', 'mLod', 'mRad',
    'grHead', 'grNext', 'grObj', 'bigList', 'nBig', 'flagRes', 'shapeRes', 'cellRes',
    // --- physics ---
    'ovX', 'ovY', 'ovZ', 'ovOk', 'subH', 'gravity', 'oBody', 'oBSlot',
    'oVX', 'oVY', 'oVZ', 'oGround', 'oHit', 'aliveRes', 'nBody', 'nHit',
    'bObj', 'bCX', 'bCZ', 'bMass', 'bBounce', 'bFric', 'bGObj', 'bPX', 'bPY', 'bPZ',
    'gpHead', 'gpNext', 'gpObj',
    'lodFar', 'dt', 'gt', 'shadowY', 'shadowFar', 'shadowOn', 'lodSize', 'gndR', 'gndG', 'gndB',
];


// ============================================================
// build
// ============================================================
function listData() {
    buildMeshes();
    // The pool sizes come straight from src/core.js (build.mjs reads them out
    // of that file so the two can never drift) and every one of them has to
    // stay inside Entry's 5000-item list limit.
    const C = {};
    const coreSrc = fs.readFileSync(path.join(HERE, 'src', 'core.js'), 'utf8');
    for (const m of coreSrc.matchAll(/^const ([A-Z][A-Z0-9_]*) = (\d+);/gm)) C[m[1]] = Number(m[2]);
    for (const k of ['MAXOBJ', 'MAXMESH', 'MAXV', 'MAXF', 'MAXSV', 'MAXPG', 'MAXDR', 'NB',
        'MAXHIT', 'MAXBODY', 'MAXGE', 'NGP', 'NGR', 'HUDN', 'MAXTWEEN', 'MAXPAR', 'NTIMER']) {
        if (!C[k]) throw new Error('core.js is missing the constant ' + k);
        if (C[k] > 5000) throw new Error(`${k} = ${C[k]} would make a list longer than Entry's 5000 item limit`);
    }
    // Only baked data ships inside the .ent. Every other list starts empty and
    // grows at run time (see allocPools / growObj), so a project pays for what
    // it actually makes and the file stays small.
    const D = {};
    const zeros = (n) => new Array(n).fill(0);
    const nm = meshes.length;
    for (const n of ['mVS', 'mVN', 'mFS', 'mFN', 'mRad', 'mHX', 'mHY', 'mHZ', 'mLod']) D[n] = zeros(nm);
    meshes.forEach((m, i) => {
        D.mVS[i] = m.vs; D.mVN[i] = m.vn; D.mFS[i] = m.fs; D.mFN[i] = m.fn;
        D.mRad[i] = +m.rad.toFixed(4); D.mHX[i] = +m.hx.toFixed(4);
        D.mHY[i] = +m.hy.toFixed(4); D.mHZ[i] = +m.hz.toFixed(4);
    });
    D.mLod[1] = 3;      // sphere   -> low-poly sphere
    D.mLod[10] = 14;    // tree     -> simple tree
    D.mLod[9] = 15;     // person   -> blocky person
    D.mLod[3] = 16;     // cylinder -> 5-sided
    D.vpX = M.v.map((q) => +q[0].toFixed(4));
    D.vpY = M.v.map((q) => +q[1].toFixed(4));
    D.vpZ = M.v.map((q) => +q[2].toFixed(4));
    D.fpA = M.f.map((f) => f.a);
    D.fpB = M.f.map((f) => f.b);
    D.fpC = M.f.map((f) => f.c);
    D.fpD = M.f.map((f) => f.d);
    D.fpNX = M.f.map((f) => +f.nx.toFixed(4));
    D.fpNY = M.f.map((f) => +f.ny.toFixed(4));
    D.fpNZ = M.f.map((f) => +f.nz.toFixed(4));
    D.fpCol = M.f.map((f) => f.col);
    D.fpTwo = M.f.map((f) => f.two);
    D.cnName = COLORS.map((c) => c[0]);
    D.cnR = COLORS.map((c) => parseInt(c[1].slice(1, 3), 16));
    D.cnG = COLORS.map((c) => parseInt(c[1].slice(3, 5), 16));
    D.cnB = COLORS.map((c) => parseInt(c[1].slice(5, 7), 16));
    return {
        lists: D,
        consts: { BV: M.v.length, BF: M.f.length, NCOLOR: COLORS.length, STRESS: process.env.STRESS ? 1 : 0 },
        stats: { verts: M.v.length, faces: M.f.length, meshes: meshes.length },
    };
}

const SRC_FILES = ['core.js', 'render.js', 'phys.js', 'anim.js', 'world.js', 'api.js',
    process.env.TESTSCENE ? 'test-scene.js' : 'games.js'];
export function sources() { return SRC_FILES.map((f) => fs.readFileSync(path.join(HERE, 'src', f), 'utf8')); }

const TEXTS = [
    // id,   x,    y,  size, colour,   align (0 centre, 1 left, 2 right)
    ['글1', 0, 44, 30, '#ffffff', 0],
    ['글2', 0, 8, 15, '#e8eef8', 0],
    ['글3', -228, 118, 15, '#ffffff', 1],
    ['글4', -228, 98, 15, '#ffe27a', 1],
    ['글5', -228, 78, 15, '#a8e6ff', 1],
    ['글6', 228, 118, 17, '#ffffff', 2],
    ['글7', 0, -124, 12, '#dbe4f2', 0],
    ['글8', 0, -60, 14, '#ffffff', 0],
];

export async function buildEnt(outFile, opts = {}) {
    const { packEnt } = await import('./pack.mjs');
    const D = listData();
    const prog = compileProgram(sources(), { consts: D.consts, labels: LABEL_MAP, funcWeights: { drawObject: 30, addPoly: 40, drawPoly: 40, overlapTest: 12, resolveSolid: 12 } });
    // inject the baked data
    for (const v of prog.variables) {
        if (v.variableType === 'list' && D.lists[v.name]) {
            v.array = D.lists[v.name].map((d, i) => ({ id: `${v.id}_${i}`, data: d }));
        }
    }
    const missing = Object.keys(D.lists).filter((k) => !prog.variables.some((v) => v.name === k));
    if (missing.length) console.warn('data lists not used by the sources:', missing.join(' '));
    const tooBig = prog.variables.filter((v) => v.array && v.array.length > 5000);
    if (tooBig.length) throw new Error('lists over 5000 items: ' + tooBig.map((v) => v.name).join(' '));
    // user-facing functions first, in the order of LABELS
    const rank = new Map(LABELS.map(([n], i) => [n, i]));
    prog.functions.sort((a, b) => (rank.has(a.jsName) ? rank.get(a.jsName) : 900 + a.order) - (rank.has(b.jsName) ? rank.get(b.jsName) : 900 + b.order));
    // Korean names
    for (const v of prog.variables) if (VAR_NAMES[v.name]) v.name = VAR_NAMES[v.name];

    const dot = Buffer.from('89504e470d0a1a0a0000000d49484452000000020000000208060000007265b6' +
        '0d0000000f49444154789c636040020630c40000004900011ea9ec2c0000000049454e44ae426082', 'hex');
    const O = (id, name, extra = {}) => ({ id, name, script: prog.objectScripts[name] || [[]], ...extra });
    const objects = [];
    for (const [id, x, y, size, colour, align] of TEXTS) {
        objects.push(O(id, id, {
            objectType: 'textBox', text: '',
            entity: { x, y, colour, font: `${size}px Nanum Gothic Coding`, textAlign: align, lineBreak: false, bold: true, underLine: false, strike: false, italic: false, fontSize: size, width: 470, height: size + 6 },
        }));
    }
    objects.push(O('게임', '게임', { pictures: [{ id: '1', name: 'dot', buf: dot, w: 2, h: 2 }], entity: { x: 0, y: 0, visible: true } }));
    const project = packEnt(outFile, {
        name: '3D 엔진 v5', tmpDir: path.join(HERE, '.pack'),
        variables: orderVariables(prog.variables), functions: prog.functions, messages: prog.messages, objects, speed: 60,
        selected: '게임',
    });
    fs.writeFileSync(outFile + '.lines.json', JSON.stringify({ blockLines: prog.blockLines, srcLines: prog.srcLines }));
    if (!opts.quiet) {
        console.log('wrote', outFile, fs.statSync(outFile).size, 'bytes');
        console.log('  program', JSON.stringify(prog.stats), ' meshes', JSON.stringify(D.stats));
    }
    return { project, prog, D };
}

function orderVariables(vars) {
    const hot = new Map(HOT.map((n, i) => [VAR_NAMES[n] || n, i]));
    return [...vars].sort((a, b) => (hot.has(a.name) ? hot.get(a.name) : 500) - (hot.has(b.name) ? hot.get(b.name) : 500));
}

if (process.argv[1] && import.meta.url === url.pathToFileURL(path.resolve(process.argv[1])).href) {
    await buildEnt(process.argv[2] || path.join(HERE, 'engine.ent'));
}

// v1.3: the maps. The island (새벽섬) is ISLAND in mapgen.mjs; here the desert (붉은사막) and the snow
// island (눈보라섬): how the ground lies, the towns and roads, what grows and stands where, and the
// colours (each map has its own colour table: the same houses turn to adobe in the desert, the
// grass to snow and the roofs white under it in the snow).
import { ISLAND, fbm, CS } from './mapgen.mjs';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (mx, mz, x, z, rx, rz) => Math.exp(-Math.pow((mx - x) / rx, 2) - Math.pow((mz - z) / rz, 2));
// a shore: the distance from the middle over a lumpy outline (1 at the coast)
const coastR = (mx, mz, N, k, sq) => {
    const dx = (mx - 1024) / 1024, dz = (mz - 1024) / 1024, ang = Math.atan2(dz, dx);
    const c = k + 0.07 * Math.sin(ang * 3 + 1.3) + 0.05 * Math.sin(ang * 7 + 0.4) + 0.08 * (fbm(N.nB, mx / 300, mz / 300) - 0.5);
    // sq > 2: squarer than a disc (more land in the corners)
    const r = Math.pow(Math.pow(Math.abs(dx), sq) + Math.pow(Math.abs(dz), sq), 1 / sq);
    return r / c;
};

// ------------------------------------------------------------------ 붉은사막: the desert
// Dune seas in the west, red mesas and a canyon in the north-east, a dry riverbed (wadi) across,
// a salt flat in the south-east, a palm oasis with its town in the middle; an oil field and its
// base in the north, a port on the south coast.
const D_SITES = [
    { name: '오아시스', kind: 'city', x: 1000, z: 1080, r: 120, tier: 2 },
    { name: '정유기지', kind: 'base', x: 1420, z: 1560, r: 125, tier: 3 },
    { name: '모래항구', kind: 'port', x: 1380, z: 470, r: 110, tier: 2 },
    { name: '광산촌', kind: 'village', x: 1620, z: 1080, r: 80, tier: 1 },
    { name: '모래언덕마을', kind: 'village', x: 470, z: 1380, r: 80, tier: 1 },
    { name: '남쪽마을', kind: 'village', x: 640, z: 560, r: 75, tier: 1 },
    { name: '유목민캠프', kind: 'farm', x: 330, z: 900, r: 60, tier: 1 },
    { name: '선인장목장', kind: 'farm', x: 1080, z: 1660, r: 60, tier: 1 },
    { name: '사막주유소', kind: 'gas', x: 1170, z: 1230, r: 20, tier: 1 },
    { name: '갈림길주유소', kind: 'gas', x: 780, z: 800, r: 20, tier: 1 },
    { name: '사막학교', kind: 'school', x: 1120, z: 760, r: 45, tier: 2 },
];
const D_ROADS = [[0, 8], [8, 1], [0, 9], [9, 5], [0, 10], [10, 2], [8, 3], [3, 2], [0, 4], [4, 6], [6, 5], [1, 7], [7, 4], [10, 3], [9, 6]];
// the wadi: a winding dry riverbed from the north-east to the south-west
const wadiD = (mx, mz) => { const t = (mx + mz) / 2, s = (mx - mz) / Math.SQRT2 + 160 * Math.sin(t / 170) + 70 * Math.sin(t / 61); return Math.abs(s - 120); };
function desertHeight(mx, mz, N) {
    const r = coastR(mx, mz, N, 0.9, 3);
    const land = 1 - Math.pow(Math.max(0, r), 8);
    let h = land * 1300 - 400;
    // broad swells
    h += (fbm(N.nA, mx / 420, mz / 420) - 0.5) * 1400 * Math.max(0, land);
    // dune sea (west): sharp crested dunes, ridges running north-south
    const duneW = smooth(820, 420, mx) * Math.max(0, land);
    const ridge = 1 - Math.abs(2 * fbm(N.nE, mx / 55, mz / 160, 3) - 1);
    h += duneW * ridge * ridge * 1100;
    // mesas (north-east): flat tops, steep red sides, terraced
    const mesaW = gauss(mx, mz, 1640, 1350, 330, 300) + gauss(mx, mz, 1800, 800, 160, 220) * 0.8;
    const m = fbm(N.nD, mx / 140, mz / 140);
    const step = m > 0.56 ? 1 : m > 0.5 ? (m - 0.5) / 0.06 : 0;
    const step2 = m > 0.64 ? 1 : m > 0.6 ? (m - 0.6) / 0.04 : 0;
    h += Math.min(1, mesaW * 1.6) * (step * 1800 + step2 * 1400);
    // the wadi: a flat-floored dry riverbed with banks
    const wd = wadiD(mx, mz);
    const bed = (1 - smooth(18, 45, wd)) * Math.max(0, land);
    h = h * (1 - bed) + Math.max(260, h - 520) * bed;
    // the oasis: a pond in a hollow, palms round it
    h -= gauss(mx, mz, 740, 990, 60, 45) * 1500;
    // the salt flat (south-east): dead level
    const salt = gauss(mx, mz, 1640, 640, 170, 120);
    h = h * (1 - Math.min(1, salt * 1.5)) + 300 * Math.min(1, salt * 1.5);
    // small hummocks everywhere (cover)
    h += (fbm(N.nC, mx / 90, mz / 90, 3) - 0.5) * 380 * Math.max(0, land) * (1 - Math.min(1, salt * 2));
    if (r > 1.05) h = Math.min(h, -400 - (r - 1.05) * 3000);
    return h;
}
export const DESERT = {
    key: 'desert', name: '붉은사막', seed: 20261103, sites: D_SITES, roads: D_ROADS, height: desertHeight, lone: 45, coverRate: 0.75,
    bset: {
        city: ['adobeM', 'adobeM', 'adobeS', 'adobeS', 'apart', 'adobeM', 'adobeS', 'shed'],
        village: ['adobeS', 'adobeS', 'adobeM', 'shed', 'adobeS', 'warehouse'],
        base: ['warehouse', 'barracks', 'hangar', 'warehouse', 'tower', 'barracks', 'tower'],
        port: ['warehouse', 'warehouse', 'shed', 'adobeS', 'warehouse'],
        farm: ['adobeS', 'shed', 'adobeS', 'barn'],
        lone: ['adobeS', 'adobeS', 'shed', 'adobeM'],
        school: ['school', 'adobeS', 'shed'],
    },
    fallback: ['adobeS', 'shed'],
    // sparse: saguaros and clumps on the flats, dead trees in the wadi, palms at the oasis, rocks
    // under the mesas, almost nothing on the dunes
    flora: ({ cx, cz, h, mx, mz, R, N, put }) => {
        const dune = mx < 640 && fbm(N.nE, mx / 55, mz / 160, 3) > 0.35;
        const oasis = Math.hypot(mx - 740, mz - 990);
        if (oasis < 190) {
            const n = Math.floor((oasis < 120 ? 4 : 2) + R());
            for (let i = 0; i < n; i++) put(R() < 0.75 ? 'palm' : 'bush', (cx + 0.1 + R() * 0.8) * CS, (cz + 0.1 + R() * 0.8) * CS);
            return;
        }
        const f = fbm(N.nF, mx / 200, mz / 200);
        const n = Math.floor((dune ? 0.08 : f > 0.55 ? 1.1 : 0.42) + R());
        for (let i = 0; i < Math.min(n, 3); i++) {
            const x = (cx + 0.1 + R() * 0.8) * CS, z = (cz + 0.1 + R() * 0.8) * CS;
            const p = R();
            const name = wadiD(mx, mz) < 60 ? (p < 0.5 ? 'deadTree' : p < 0.8 ? 'cactusS' : 'bush') : (p < 0.42 ? 'cactus' : p < 0.72 ? 'cactusS' : p < 0.8 ? 'deadTree' : p < 0.9 ? 'rockA' : 'bush');
            put(name, x, z);
        }
        if (h > 1800 && R() < 0.35) put(R() < 0.5 ? 'rockC' : 'rockD', (cx + 0.2 + R() * 0.6) * CS, (cz + 0.2 + R() * 0.6) * CS);
        else if (R() < 0.04) put('rockB', (cx + 0.2 + R() * 0.6) * CS, (cz + 0.2 + R() * 0.6) * CS);
    },
    cover: (h, p) => h > 1800 ? (p < 0.3 ? 'rockB' : p < 0.55 ? 'rockC' : p < 0.8 ? 'rockD' : 'mound')
        : (p < 0.18 ? 'rockA' : p < 0.32 ? 'rockB' : p < 0.46 ? 'mound' : p < 0.56 ? 'moundL' : p < 0.7 ? 'stonewall' : p < 0.8 ? 'cactusS' : p < 0.88 ? 'rockD' : p < 0.95 ? 'log' : 'tent'),
    grove: (R) => (R() < 0.5 ? 'deadTree' : 'cactus'), groveP: 0.04,
    furniture: (kind, R) => {
        if (kind === 'port') return R() < 0.7 ? 'container' : R() < 0.5 ? 'crate' : 'barrels';
        if (kind === 'base') { const p = R(); return p < 0.22 ? 'pumpjack' : p < 0.38 ? 'barrels' : p < 0.55 ? 'container' : p < 0.7 ? 'sandbag' : p < 0.85 ? 'barrier' : 'crate'; }
        if (kind === 'farm') { const p = R(); return p < 0.4 ? 'tent' : p < 0.6 ? 'fence' : p < 0.8 ? 'hay' : 'crate'; }
        const p = R(); return p < 0.4 ? 'car' : p < 0.55 ? 'barrels' : p < 0.7 ? 'crate' : p < 0.85 ? 'tent' : 'barrier';
    },
    furnCount: { city: 36, village: 12, base: 46, port: 50, farm: 14, gas: 4, school: 6 },
    pole: 'pole',
    landmarks: { farm: 'silo', city: 'watertower', base: 'silo', village: 'watertower' },
    // a few more pumpjacks out on the oil field, palms along the oasis shore
    extra: ({ R, put }) => {
        for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, d = 160 + R() * 220; put('pumpjack', (1420 + Math.cos(a) * d) * 100, (1560 + Math.sin(a) * d * 0.7) * 100, Math.floor(R() * 4)); }
        for (let i = 0; i < 18; i++) { const a = R() * Math.PI * 2; put('palm', (740 + Math.cos(a) * 80) * 100, (990 + Math.sin(a) * 66) * 100, Math.floor(R() * 4)); }
    },
    cellMat: ({ avg, slope, mx, mz, N, site }) => {
        let m = 'grass';
        if (avg < 160) m = 'sand';
        else if (slope > 0.45) m = 'rockG';
        else if (gauss(mx, mz, 1640, 640, 170, 120) > 0.45) m = 'snowRock';
        else if (wadiD(mx, mz) < 40) m = 'dirt';
        else if (avg > 1500 && mx > 700) m = 'dirt';
        else if (fbm(N.nF, mx / 90 + 3, mz / 90) > 0.6) m = 'grassDry';
        if (site && (site.kind === 'base' || site.kind === 'port')) m = avg < 160 ? 'sand' : 'concrete';
        else if (site && site.kind === 'city' && m === 'grass') m = 'grassDry';
        return m;
    },
    // the colours: sand for grass, red rock, salt, adobe walls, clay roofs, dusty leaves
    fog: [226, 208, 176], sky: ['#6f9cc6', '#a9c3d6', '#e2d0aa', '#4f8a98'],
    colours: {
        grass: '#e1bf85', grassDry: '#ead6aa', dirt: '#c48a5c', sand: '#d6be8c', rockG: '#b06848', snowRock: '#f0ece2', dirtRoad: '#b8946a',
        rock: '#b88060', rock2: '#a06c50', bark: '#968270', leaf: '#7a804a', leaf2: '#8c8c56', bush: '#968a5a', pine: '#58683f', pine2: '#647046',
        plasterW: '#e2cea8', plasterY: '#cd9f6e', plasterB: '#be8c69', plasterG: '#dcbe96', plasterP: '#c89682',
        roofTar: '#aa8c69', roofRed: '#aa5a3c', roofGrey: '#968c7d', roofBrown: '#8c6446', roofGreen: '#78785a',
        concrete: '#beaf96', concreteDark: '#94866c', asphalt: '#5a5652', water: '#468c8c', deepWater: '#286473', hay: '#d8b46a',
    },
};

// ------------------------------------------------------------------ 눈보라섬: the snow island
// A mountain range down the north with a glacier, a frozen lake under it, pine forests heavy with
// snow, a ski town with its hotel in the west, a research base in the north-east, a fishing port.
const S_SITES = [
    { name: '스키마을', kind: 'city', x: 760, z: 1030, r: 115, tier: 2 },
    { name: '극지기지', kind: 'base', x: 1500, z: 1430, r: 120, tier: 3 },
    { name: '얼음항구', kind: 'port', x: 1260, z: 470, r: 110, tier: 2 },
    { name: '전나무마을', kind: 'village', x: 1300, z: 1000, r: 85, tier: 1 },
    { name: '눈꽃마을', kind: 'village', x: 520, z: 600, r: 80, tier: 1 },
    { name: '산장마을', kind: 'village', x: 420, z: 1420, r: 70, tier: 1 },
    { name: '순록농장', kind: 'farm', x: 960, z: 640, r: 60, tier: 1 },
    { name: '호숫가농장', kind: 'farm', x: 1620, z: 860, r: 55, tier: 1 },
    { name: '설원주유소', kind: 'gas', x: 1020, z: 1240, r: 20, tier: 1 },
    { name: '고개주유소', kind: 'gas', x: 1000, z: 860, r: 20, tier: 1 },
    { name: '설원학교', kind: 'school', x: 1520, z: 640, r: 45, tier: 2 },
];
const S_ROADS = [[0, 8], [8, 1], [0, 9], [9, 3], [3, 1], [9, 6], [6, 2], [6, 4], [4, 0], [0, 5], [3, 7], [7, 10], [10, 2], [5, 8]];
function snowHeight(mx, mz, N) {
    const r = coastR(mx, mz, N, 0.88, 2);
    const land = 1 - Math.pow(Math.max(0, r), 6);
    let h = land * 900 - 450;
    h += (fbm(N.nA, mx / 360, mz / 360) - 0.5) * 2000 * Math.max(0, land);
    // the range: a long ridge along the north, two peaks with a glacier between
    const along = (mx - 1000) * 0.94 + (mz - 1720) * 0.34, across = (mx - 1000) * -0.34 + (mz - 1720) * 0.94;
    const range = Math.exp(-Math.pow(across / 190, 2) - Math.pow(along / 640, 4));
    h += range * 7200 * (0.62 + 0.7 * fbm(N.nD, mx / 110, mz / 110));
    h += gauss(mx, mz, 1660, 1680, 150, 130) * 3500 + gauss(mx, mz, 700, 1650, 140, 120) * 2600;
    // the frozen lake below it, a fjord in the south-west
    h -= gauss(mx, mz, 1080, 1420, 120, 70) * 2200;
    h -= gauss(mx, mz, 330, 420, 180, 60) * 2600 * smooth(0.6, 0.9, r);
    // drifts and hummocks
    h += (fbm(N.nE, mx / 140, mz / 140, 3) - 0.5) * 900 * Math.max(0, land) * (1 - Math.min(1, range * 2));
    if (r > 1.05) h = Math.min(h, -400 - (r - 1.05) * 3000);
    return h;
}
export const SNOW = {
    key: 'snow', name: '눈보라섬', seed: 20261111, sites: S_SITES, roads: S_ROADS, height: snowHeight, lone: 55, coverRate: 0.85,
    bset: {
        city: ['apart', 'houseM', 'houseM', 'houseS', 'apart', 'houseM', 'shed', 'school'],
        village: ['houseS', 'houseM', 'houseS', 'shed', 'barn', 'houseM'],
        base: ['barracks', 'warehouse', 'hangar', 'barracks', 'tower', 'warehouse', 'tower'],
        port: ['warehouse', 'shed', 'warehouse', 'houseS', 'shed'],
        farm: ['barn', 'barn', 'houseS', 'shed'],
        lone: ['houseS', 'shed', 'houseM', 'barn'],
    },
    // snowy pines in stands (fewer than the island's woods), bare oaks low down, rocks up high
    flora: ({ cx, cz, h, mx, mz, R, N, put }) => {
        const f = fbm(N.nF, mx / 240, mz / 240);
        const high = h > 2600;
        const dens = f > 0.58 ? (f - 0.58) * 26 : f > 0.5 ? 0.8 : 0.2;
        const n = Math.floor(dens + R());
        for (let i = 0; i < Math.min(n, 6); i++) {
            const x = (cx + 0.08 + R() * 0.84) * CS, z = (cz + 0.08 + R() * 0.84) * CS;
            const p = R();
            const name = high ? (p < 0.7 ? 'pineSnow' : p < 0.85 ? 'rockB' : 'pine') : (p < 0.55 ? 'pineSnow' : p < 0.7 ? 'pine' : p < 0.82 ? 'deadTree' : p < 0.93 ? 'bush' : 'rockA');
            put(name, x, z);
        }
        if (high && R() < 0.3) put(R() < 0.5 ? 'rockC' : 'rockD', (cx + 0.2 + R() * 0.6) * CS, (cz + 0.2 + R() * 0.6) * CS);
        else if (R() < 0.04) put('rockB', (cx + 0.2 + R() * 0.6) * CS, (cz + 0.2 + R() * 0.6) * CS);
    },
    cover: (h, p) => h > 2600 ? (p < 0.3 ? 'rockB' : p < 0.5 ? 'rockC' : p < 0.7 ? 'rockD' : p < 0.85 ? 'log' : 'mound')
        : (p < 0.15 ? 'rockA' : p < 0.27 ? 'rockB' : p < 0.42 ? 'log' : p < 0.58 ? 'mound' : p < 0.66 ? 'moundL' : p < 0.8 ? 'stonewall' : p < 0.9 ? 'hedge' : 'rockD'),
    grove: (R) => (R() < 0.7 ? 'pineSnow' : 'deadTree'), groveP: 0.06,
    furniture: ISLAND.furniture,
    furnCount: { city: 34, village: 12, base: 46, port: 50, farm: 12, gas: 4, school: 6 },
    pole: 'pole',
    landmarks: { farm: 'silo', city: 'watertower', base: 'watertower', village: 'watertower' },
    cellMat: ({ avg, slope, mx, mz, N, site }) => {
        let m = 'grass';
        if (avg < 160) m = 'sand';
        else if (slope > 0.42) m = 'rockG';
        else if (avg > 5200) m = 'snowRock';
        else if (fbm(N.nF, mx / 90 + 3, mz / 90) > 0.6) m = 'grassDry';
        else if (fbm(N.nD, mx / 60, mz / 60 + 5) > 0.74) m = 'dirt';
        if (site && (site.kind === 'base' || site.kind === 'port')) m = avg < 160 ? 'sand' : 'concrete';
        return m;
    },
    // snow for grass, white roofs, dark rock, frosted leaves, grey shingle, a cold sea
    fog: [212, 220, 230], sky: ['#8ea4ba', '#bccad7', '#d4dce6', '#6a8494'],
    colours: {
        grass: '#eef2f6', grassDry: '#d2dceb', dirt: '#8a8076', sand: '#9a9a94', rockG: '#5f646c', snowRock: '#e6eef8', dirtRoad: '#a8a49c',
        leaf: '#c8d7dc', leaf2: '#b4c8cd', bush: '#d7e1e6', pine: '#2a4a3e', pine2: '#36584a', rock: '#7a7e84', rock2: '#62666c', hay: '#e2dcc4',
        roofRed: '#e6eaee', roofGrey: '#dce2e8', roofBrown: '#e0e4e6', roofGreen: '#d8e0e2', roofTar: '#e4e8ec',
        asphalt: '#4a4c52', concrete: '#a8adb2', water: '#88aac0', deepWater: '#4a6e88',
    },
};
export const MAPS = [ISLAND, DESERT, SNOW];

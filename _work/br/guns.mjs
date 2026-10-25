// Guns, attachments and loot items: numbers and models.
// Gun frame: origin at the trigger, +z toward the muzzle, +y up, +x right; cm, real sizes.
// Each gun has three models: 0 in the hands (with the hands), 1 lying on the ground, 2 a tiny one.
import { Model, orderFace } from './geom.mjs';

// ammo: 1 9mm, 2 .45 ACP, 3 5.56mm, 4 7.62mm, 5 .300 Magnum, 6 12 gauge
export const AMMO = [
    { name: '9mm', box: 30 }, { name: '.45 ACP', box: 30 }, { name: '5.56mm', box: 30 }, { name: '7.62mm', box: 30 }, { name: '.300 Magnum', box: 10 }, { name: '12 게이지', box: 10 },
];
// cls: 1 pistol, 2 SMG, 3 AR, 4 DMR, 5 SR, 6 SG, 7 LMG
// modes: bit 1 single, 2 burst, 4 auto; bolt/pump: single with a cycle time
// recoil: vertical / horizontal (degrees a shot), rec: recovery (deg/s); spread: hip / ads (degrees)
export const GUNS = [
    { name: 'M1911', cls: 1, ammo: 2, dmg: 41, rpm: 400, vel: 250, mag: 7, reload: 2.0, modes: 1, rv: 1.6, rh: 0.5, rec: 30, hip: 2.0, ads: 0.6, range: 40, zoom: 1.1, tier: 1 },
    { name: 'Glock 17', cls: 1, ammo: 1, dmg: 35, rpm: 600, vel: 375, mag: 17, reload: 1.8, modes: 1, rv: 1.1, rh: 0.4, rec: 34, hip: 1.8, ads: 0.5, range: 45, zoom: 1.1, tier: 1 },
    { name: 'MP5', cls: 2, ammo: 1, dmg: 33, rpm: 800, vel: 400, mag: 30, reload: 2.6, modes: 5, rv: 0.55, rh: 0.3, rec: 26, hip: 1.6, ads: 0.35, range: 60, zoom: 1.2, tier: 1 },
    { name: 'UMP45', cls: 2, ammo: 2, dmg: 39, rpm: 650, vel: 300, mag: 25, reload: 3.0, modes: 7, rv: 0.6, rh: 0.25, rec: 26, hip: 1.5, ads: 0.33, range: 60, zoom: 1.2, tier: 1 },
    { name: 'KRISS Vector', cls: 2, ammo: 2, dmg: 31, rpm: 1100, vel: 300, mag: 19, reload: 2.2, modes: 7, rv: 0.42, rh: 0.3, rec: 28, hip: 1.5, ads: 0.35, range: 50, zoom: 1.2, tier: 2 },
    { name: 'AKM', cls: 3, ammo: 4, dmg: 47, rpm: 600, vel: 715, mag: 30, reload: 2.9, modes: 5, rv: 0.95, rh: 0.5, rec: 20, hip: 2.2, ads: 0.25, range: 120, zoom: 1.25, tier: 2 },
    { name: 'M416', cls: 3, ammo: 3, dmg: 41, rpm: 700, vel: 880, mag: 30, reload: 2.6, modes: 5, rv: 0.7, rh: 0.35, rec: 24, hip: 2.0, ads: 0.2, range: 140, zoom: 1.25, tier: 2 },
    { name: 'SCAR-L', cls: 3, ammo: 3, dmg: 41, rpm: 625, vel: 870, mag: 30, reload: 2.7, modes: 5, rv: 0.68, rh: 0.4, rec: 24, hip: 2.0, ads: 0.2, range: 140, zoom: 1.25, tier: 2 },
    { name: 'M16A4', cls: 3, ammo: 3, dmg: 43, rpm: 800, vel: 900, mag: 30, reload: 2.5, modes: 3, rv: 0.75, rh: 0.3, rec: 24, hip: 2.1, ads: 0.18, range: 160, zoom: 1.25, tier: 2 },
    { name: 'Mini-14', cls: 4, ammo: 3, dmg: 46, rpm: 400, vel: 990, mag: 20, reload: 3.0, modes: 1, rv: 1.0, rh: 0.35, rec: 22, hip: 2.6, ads: 0.08, range: 250, zoom: 1.3, tier: 2 },
    { name: 'SKS', cls: 4, ammo: 4, dmg: 53, rpm: 360, vel: 800, mag: 10, reload: 3.2, modes: 1, rv: 1.4, rh: 0.45, rec: 20, hip: 2.6, ads: 0.08, range: 250, zoom: 1.3, tier: 3 },
    { name: 'Kar98k', cls: 5, ammo: 4, dmg: 79, rpm: 32, vel: 760, mag: 5, reload: 4.0, modes: 1, rv: 2.6, rh: 0.4, rec: 16, hip: 3.5, ads: 0.03, range: 400, zoom: 1.35, tier: 3, bolt: 1.9 },
    { name: 'AWM', cls: 5, ammo: 5, dmg: 105, rpm: 30, vel: 945, mag: 5, reload: 4.2, modes: 1, rv: 3.0, rh: 0.5, rec: 14, hip: 3.5, ads: 0.02, range: 500, zoom: 1.35, tier: 4, bolt: 2.0 },
    { name: 'Remington 870', cls: 6, ammo: 6, dmg: 24, rpm: 70, vel: 360, mag: 5, reload: 0.55, modes: 1, rv: 2.4, rh: 0.6, rec: 18, hip: 4.0, ads: 3.0, range: 25, zoom: 1.15, tier: 1, bolt: 0.85, pellets: 9 },
    { name: 'M249', cls: 7, ammo: 3, dmg: 40, rpm: 750, vel: 915, mag: 100, reload: 6.0, modes: 4, rv: 0.8, rh: 0.55, rec: 20, hip: 2.6, ads: 0.3, range: 140, zoom: 1.25, tier: 4 },
];
// slots: 1 muzzle, 2 sight, 3 under, 4 magazine, 5 stock
// fits: classes the attachment goes on (bits of cls: 1<<cls)
const B = (...cls) => cls.reduce((a, c) => a | (1 << c), 0);
export const ATTS = [
    { name: '소음기', en: 'Suppressor', slot: 1, fits: B(1, 2, 3, 4, 5), mat: 'gunBlack' },
    { name: '보정기', en: 'Compensator', slot: 1, fits: B(2, 3, 4, 5), mat: 'gunSteel' },
    { name: '소염기', en: 'Flash Hider', slot: 1, fits: B(2, 3, 4, 5), mat: 'gunBlack' },
    { name: '레드 도트', en: 'Red Dot', slot: 2, fits: B(1, 2, 3, 4, 6, 7), mat: 'gunBlack', zoom: 1.25 },
    { name: '홀로그래픽', en: 'Holographic', slot: 2, fits: B(2, 3, 4, 6, 7), mat: 'gunBlack', zoom: 1.25 },
    { name: '2배율 스코프', en: '2x Scope', slot: 2, fits: B(2, 3, 4, 5, 7), mat: 'gunBlack', zoom: 2 },
    { name: 'ACOG 4배율', en: 'ACOG 4x', slot: 2, fits: B(3, 4, 5, 7), mat: 'gunTan', zoom: 4 },
    { name: '8배율 스코프', en: '8x Scope', slot: 2, fits: B(3, 4, 5), mat: 'gunBlack', zoom: 8 },
    { name: '수직 손잡이', en: 'Vertical Foregrip', slot: 3, fits: B(2, 3, 7), mat: 'gunBlack' },
    { name: '앵글 손잡이', en: 'Angled Foregrip', slot: 3, fits: B(2, 3, 7), mat: 'gunPoly' },
    { name: '레이저 사이트', en: 'Laser Sight', slot: 3, fits: B(1, 2, 3, 6), mat: 'gunBlack' },
    { name: '대용량 탄창', en: 'Extended Mag', slot: 4, fits: B(1, 2, 3, 4, 5), mat: 'gunBlack' },
    { name: '퀵드로우 탄창', en: 'Quickdraw Mag', slot: 4, fits: B(1, 2, 3, 4, 5), mat: 'gunPoly' },
    { name: '전술 개머리판', en: 'Tactical Stock', slot: 5, fits: B(2, 3), mat: 'gunBlack' },
    { name: '볼받침', en: 'Cheek Pad', slot: 5, fits: B(4, 5), mat: 'gunOD' },
];

// ------------------------------------------------------------------ gun models
// each builder adds the gun's parts to m (one model a level of detail) and returns its mount points:
// sight: y of the line of sight; muzzle: z; rail: [y, z] (top); under: [y, z]; magB: [y, z] (bottom of the magazine); stock: [y, z] (top of the stock)
const g = {
    recv: (m, z0, z1, y0, y1, w, mt) => m.box(-w / 2, y0, z0, w / 2, y1, z1, mt, { collide: false }),
    bar: (m, z0, z1, y, r, mt, n = 6) => m.prismZ(0, y, r, z0, z1, n, mt, { phase: Math.PI / n }),
    grip: (m, z, y, mt, ang = -18, len = 10) => m.obox(0, y - len / 2, z - 1, 1.5, len / 2, 1.9, ang, mt),
    mag: (m, z, y, len, ang, mt, w = 2.4, d = 3.2) => m.obox(0, y - len / 2, z, w / 2, len / 2, d / 2, ang, mt),
    curved: (m, z, y, mt, n = 3, len = 18, w = 2.6) => { let cy = y, cz = z; for (let i = 0; i < n; i++) { const a = 8 + i * 9, l = len / n; m.obox(0, cy - l / 2 * Math.cos(a * Math.PI / 180), cz + l / 2 * Math.sin(a * Math.PI / 180), w / 2, l / 2 + 0.3, 1.9, a, mt); cy -= l * Math.cos(a * Math.PI / 180); cz += l * Math.sin(a * Math.PI / 180); } return [cy, cz]; },
    post: (m, z, y, h, mt) => m.box(-0.3, y, z - 0.4, 0.3, y + h, z + 0.4, mt, { collide: false }),
    rail: (m, z0, z1, y, mt, w = 2.2) => m.box(-w / 2, y, z0, w / 2, y + 0.8, z1, mt, { collide: false }),
};
// hands holding the gun: the right hand on the grip, the left on the handguard, sleeves running back out of view
function hands(m, gripZ, gripY, foreZ, foreY, pistol = false) {
    m.obox(0.2, gripY - 4, gripZ - 1.5, 2.6, 4.2, 3.2, -18, 'skin1');
    m.obox(3.2, gripY - 12, gripZ - 16, 3.6, 3.6, 13, 32, 'cloth1', { ay: -14 });
    if (pistol) {
        m.obox(-1.8, gripY - 5, gripZ - 0.5, 2.4, 4, 3, -18, 'skin1');
        m.obox(-4.5, gripY - 12, gripZ - 15, 3.6, 3.6, 12, 32, 'cloth1', { ay: 16 });
    } else {
        m.obox(-0.8, foreY - 2.5, foreZ, 2.4, 2.6, 4.2, 0, 'skin1');
        m.obox(-6.5, foreY - 9, foreZ - 14, 3.4, 3.4, 14, 26, 'cloth1', { ay: 22 });
    }
}
const BUILD = {
    'M1911'(m, lod) {
        g.recv(m, -3, 18.5, 1, 4.6, 2.6, 'gunSteel');               // slide
        g.recv(m, -2, 12, -1.5, 1, 2.4, 'gunSteel');                // frame
        g.grip(m, -1.2, 0, 'gunWood', -16, 10);
        g.post(m, 17.5, 4.6, 0.6, 'gunSteel'); m.box(-1, 4.6, -1.5, 1, 5.3, -0.6, 'gunSteel', { collide: false });
        if (lod === 0) { m.box(-1.6, -3.2, 2, 1.6, -1.5, 3.4, 'gunSteel', { collide: false }); hands(m, -1, 0, 6, 0, true); }
        return { sight: 5.2, muzzle: 18.5, rail: [4.6, 10], under: [-1.5, 9], magB: [-10, -3], stock: [3, -4], boreY: 3 };
    },
    'Glock 17'(m, lod) {
        g.recv(m, -3, 18.6, 1.2, 4.5, 2.5, 'gunBlack');
        g.recv(m, -2.5, 13, -1.6, 1.2, 2.6, 'gunPoly');
        g.grip(m, -1, 0, 'gunPoly', -20, 10.5);
        g.post(m, 17.8, 4.5, 0.6, 'gunBlack'); m.box(-1, 4.5, -2, 1, 5.2, -1, 'gunBlack', { collide: false });
        if (lod === 0) { m.box(-1.5, -3.2, 2, 1.5, -1.6, 3.6, 'gunPoly', { collide: false }); hands(m, -1, 0, 6, 0, true); }
        return { sight: 5.1, muzzle: 18.6, rail: [4.5, 10], under: [-1.6, 9], magB: [-10.5, -3], stock: [3, -4], boreY: 3 };
    },
    'MP5'(m, lod) {
        g.recv(m, -8, 14, 0, 5.2, 3.6, 'gunBlack');
        m.prismZ(0, 2.6, 2.4, 14, 30, 8, 'gunPoly', { phase: Math.PI / 8 });          // round handguard
        g.bar(m, 30, 36, 2.6, 0.9, 'gunBlack');
        g.grip(m, -1, 0, 'gunPoly', -16, 10);
        g.curved(m, 9, 0, 'gunBlack', 3, 17, 2.4);
        m.box(-0.6, 5.2, 27, 0.6, 7.3, 28.2, 'gunBlack', { collide: false });          // front sight hood
        m.prismZ(0, 6.5, 1.3, -6, -3.5, 6, 'gunBlack');                                // drum rear sight
        if (lod < 2) { m.box(-1.4, 1, -30, 1.4, 3, -8, 'gunBlack', { collide: false }); m.box(-1.6, -3, -31, 1.6, 4, -28, 'gunBlack', { collide: false }); }
        if (lod === 0) hands(m, -1, 0, 22, 0);
        return { sight: 7.0, muzzle: 36, rail: [5.2, 4], under: [0.2, 22], magB: [-15, 14], stock: [3.5, -20], boreY: 2.6 };
    },
    'UMP45'(m, lod) {
        g.recv(m, -10, 16, -0.5, 5.6, 4.2, 'gunPoly');
        g.recv(m, 16, 30, 0.8, 5, 4, 'gunPoly');
        g.bar(m, 30, 34, 3, 0.9, 'gunBlack');
        g.grip(m, -1, -0.5, 'gunPoly', -12, 9.5);
        g.mag(m, 10, -0.5, 18, 6, 'gunPoly', 2.6, 3.6);
        g.rail(m, -8, 20, 5.6, 'gunBlack');
        g.post(m, 28, 5, 2, 'gunBlack');
        if (lod < 2) { m.box(-1.3, 0.5, -32, 1.3, 3.5, -10, 'gunPoly', { collide: false }); m.box(-1.5, -4, -33, 1.5, 4.5, -29, 'gunPoly', { collide: false }); }
        if (lod === 0) hands(m, -1, -0.5, 22, 0.8);
        return { sight: 7.2, muzzle: 34, rail: [6.4, 6], under: [0.8, 24], magB: [-18, 11], stock: [4, -22], boreY: 3 };
    },
    'KRISS Vector'(m, lod) {
        // the angular body: a tall rear block and a sloped nose
        g.recv(m, -10, 8, -2, 6, 4, 'gunBlack');
        m.obox(0, 1, 13, 2, 3.4, 6, 18, 'gunBlack');
        g.bar(m, 18, 27, 3.5, 1.1, 'gunBlack');
        g.grip(m, -2, -2, 'gunPoly', -10, 9);
        g.mag(m, 7, -2, 13, 2, 'gunBlack', 2.4, 3.4);
        g.rail(m, -9, 14, 6, 'gunBlack');
        if (lod < 2) m.box(-1.5, 0, -30, 1.5, 4, -10, 'gunBlack', { collide: false });
        if (lod === 0) hands(m, -2, -2, 15, -1);
        return { sight: 7.4, muzzle: 27, rail: [6.8, 3], under: [-1.5, 15], magB: [-15, 7.5], stock: [4, -20], boreY: 3.5 };
    },
    'AKM'(m, lod) {
        g.recv(m, -14, 12, -0.5, 5, 3.4, 'gunSteel');
        m.box(-1.9, 0.4, 12, 1.9, 4.8, 33, 'gunWood', { collide: false });        // lower handguard
        m.prismZ(0, 5.4, 1.1, 12, 30, 6, 'gunWood');                              // upper (gas tube cover)
        g.bar(m, 33, 50, 2.7, 0.9, 'gunSteel');
        m.box(-0.6, 3.5, 46, 0.6, 7.2, 47.5, 'gunSteel', { collide: false });     // front sight
        m.box(-1, 5, 6, 1, 6, 9, 'gunSteel', { collide: false });                 // rear sight
        g.grip(m, -2, -0.5, 'gunWood', -18, 10);
        g.curved(m, 6, -0.5, 'gunRust' in {} ? 'gunSteel' : 'gunSteel', 3, 22, 2.6);
        if (lod < 2) { m.obox(0, 0.8, -26, 2, 4.2, 13, -6, 'gunWood'); }
        if (lod === 0) hands(m, -2, -0.5, 24, 0.4);
        return { sight: 7.2, muzzle: 50, rail: [5.2, 2], under: [0.4, 26], magB: [-21, 15], stock: [5, -24], boreY: 2.7 };
    },
    'M416'(m, lod) {
        g.recv(m, -12, 12, 0, 5.4, 3.2, 'gunBlack');
        g.recv(m, 12, 34, 0.6, 5.6, 4, 'gunBlack');                               // rail handguard
        g.rail(m, -10, 34, 5.6, 'gunBlack');
        g.bar(m, 34, 47, 2.9, 0.9, 'gunBlack');
        g.grip(m, -1.5, 0, 'gunPoly', -18, 10);
        g.curved(m, 6.5, 0, 'gunBlack', 2, 18, 2.5);
        m.box(-0.5, 6.4, 31, 0.5, 8.6, 32.5, 'gunBlack', { collide: false });     // folding front sight
        m.box(-0.8, 6.4, -9, 0.8, 8.4, -7, 'gunBlack', { collide: false });
        if (lod < 2) { m.prismZ(0, 3, 1.4, -24, -12, 6, 'gunBlack'); m.box(-1.8, -1.8, -33, 1.8, 5.2, -24, 'gunPoly', { collide: false }); }
        if (lod === 0) hands(m, -1.5, 0, 24, 0.6);
        return { sight: 8.2, muzzle: 47, rail: [6.4, 2], under: [0.6, 25], magB: [-17.5, 12], stock: [5.2, -28], boreY: 2.9 };
    },
    'SCAR-L'(m, lod) {
        g.recv(m, -10, 30, 2, 6.6, 3.8, 'gunTan');                                // long upper
        g.recv(m, -10, 10, -0.6, 2, 3.4, 'gunTan');                               // lower
        g.rail(m, -9, 30, 6.6, 'gunBlack');
        g.bar(m, 30, 44, 3.6, 0.9, 'gunBlack');
        g.grip(m, -1.5, -0.6, 'gunBlack', -16, 10);
        g.mag(m, 6.5, -0.6, 17, 10, 'gunBlack', 2.5, 3.4);
        m.box(-0.5, 7.4, 28, 0.5, 9.4, 29.5, 'gunBlack', { collide: false });
        if (lod < 2) { m.box(-1.6, 0, -32, 1.6, 6.2, -10, 'gunTan', { collide: false }); m.box(-2, -2.5, -34, 2, 6.4, -30, 'gunBlack', { collide: false }); }
        if (lod === 0) hands(m, -1.5, -0.6, 22, 2);
        return { sight: 9.0, muzzle: 44, rail: [7.4, 4], under: [2, 22], magB: [-17, 9.5], stock: [6, -26], boreY: 3.6 };
    },
    'M16A4'(m, lod) {
        g.recv(m, -12, 12, 0, 5.4, 3.2, 'gunBlack');
        m.prismZ(0, 3, 2.6, 12, 32, 8, 'gunBlack', { phase: Math.PI / 8 });
        g.rail(m, -10, 12, 5.4, 'gunBlack');
        g.bar(m, 32, 52, 3, 0.8, 'gunBlack');
        m.obox(0, 6.5, 30, 0.6, 1.8, 0.7, 0, 'gunBlack');                         // A-frame front sight
        g.grip(m, -1.5, 0, 'gunPoly', -18, 10);
        g.mag(m, 6.5, 0, 17, 8, 'gunBlack', 2.4, 3.3);
        if (lod < 2) m.obox(0, 1.6, -24, 2, 4.4, 13, -5, 'gunPoly');
        if (lod === 0) hands(m, -1.5, 0, 22, 0.4);
        return { sight: 7.8, muzzle: 52, rail: [6.2, 0], under: [0.4, 24], magB: [-17, 9], stock: [5.4, -28], boreY: 3 };
    },
    'Mini-14'(m, lod) {
        m.obox(0, 2.2, 6, 2.2, 3, 26, 0, 'gunWood');                               // stock + forend in one
        g.recv(m, -6, 14, 3, 6, 2.6, 'gunSteel');
        g.bar(m, 14, 50, 4.4, 0.8, 'gunSteel');
        g.post(m, 49, 5.2, 2, 'gunSteel');
        g.mag(m, 4, -0.8, 11, 4, 'gunSteel', 2.2, 3);
        if (lod < 2) { m.obox(0, 0.2, -24, 2, 4.6, 12, -8, 'gunWood'); }
        if (lod === 0) hands(m, -2, 0, 20, 0);
        return { sight: 7.2, muzzle: 50, rail: [6, 6], under: [-0.8, 22], magB: [-11, 4.5], stock: [4.5, -26], boreY: 4.4 };
    },
    'SKS'(m, lod) {
        m.obox(0, 2, 8, 2.1, 3, 30, 0, 'gunWood');
        g.recv(m, -6, 14, 3, 6.2, 2.6, 'gunSteel');
        m.prismZ(0, 7, 0.8, 14, 34, 6, 'gunSteel');                               // gas tube
        g.bar(m, 14, 56, 4.6, 0.8, 'gunSteel');
        g.post(m, 54, 5.4, 2.2, 'gunSteel');
        m.obox(0, 2.5, 50, 0.6, 0.6, 9, 0, 'gunSteel');                           // folded bayonet
        g.mag(m, 4, -0.5, 7, 0, 'gunSteel', 2.4, 4.4);
        if (lod < 2) m.obox(0, 0, -26, 2, 4.6, 13, -8, 'gunWood');
        if (lod === 0) hands(m, -2, 0, 22, 0);
        return { sight: 7.6, muzzle: 56, rail: [6.2, 6], under: [-0.5, 24], magB: [-7.5, 4], stock: [4.5, -28], boreY: 4.6 };
    },
    'Kar98k'(m, lod) {
        m.obox(0, 2, 12, 2.1, 2.8, 34, 0, 'gunWood');
        g.recv(m, -8, 12, 3.4, 6.2, 2.6, 'gunSteel');
        g.bar(m, 12, 64, 4.8, 0.8, 'gunSteel');
        g.post(m, 62, 5.6, 2, 'gunSteel');
        m.obox(3, 4.6, -5, 2.6, 0.6, 0.6, 0, 'gunSteel'); m.prismZ(5.2, 4.6, 0.9, -5.8, -4.2, 6, 'gunSteel');   // bolt handle
        if (lod < 2) m.obox(0, -0.4, -26, 2.1, 5, 13, -10, 'gunWood');
        if (lod === 0) hands(m, -2, 0, 26, 0);
        return { sight: 7.4, muzzle: 64, rail: [6.2, 3], under: [-0.8, 26], magB: [-1, 4], stock: [4, -28], boreY: 4.8 };
    },
    'AWM'(m, lod) {
        m.box(-2.4, -1, -10, 2.4, 4.5, 30, 'gunOD', { collide: false });          // chassis
        g.recv(m, -8, 14, 4.5, 7.4, 3, 'gunBlack');
        g.bar(m, 30, 68, 5.4, 1.1, 'gunBlack');
        m.prismZ(0, 5.4, 1.6, 64, 70, 6, 'gunBlack');                             // muzzle brake
        m.obox(3.4, 5.6, -4, 3, 0.6, 0.6, 0, 'gunBlack'); m.prismZ(6, 5.6, 1, -4.8, -3.2, 6, 'gunBlack');
        g.grip(m, -2, -1, 'gunOD', -14, 9);
        g.mag(m, 6, -1, 6, 0, 'gunBlack', 3, 7);
        if (lod < 2) { m.box(-2.2, -1, -32, 2.2, 5, -10, 'gunOD', { collide: false }); m.box(-2.4, -6, -34, 2.4, 5.4, -30, 'gunBlack', { collide: false }); }
        if (lod === 0) hands(m, -2, -1, 22, -1);
        return { sight: 8.4, muzzle: 70, rail: [7.4, 3], under: [-1, 24], magB: [-7, 6], stock: [5, -26], boreY: 5.4 };
    },
    'Remington 870'(m, lod) {
        g.recv(m, -8, 12, 0, 5.4, 3.2, 'gunSteel');
        g.bar(m, 12, 60, 4, 1.15, 'gunSteel', 8);
        m.prismZ(0, 1.6, 1.15, 12, 52, 8, 'gunSteel');                            // tube magazine
        m.obox(0, 1.6, 26, 2.2, 2.2, 7, 0, 'gunWood');                            // pump
        m.prismZ(0, 4.9, 0.5, 58, 59, 6, 'brass');                                // bead
        if (lod < 2) m.obox(0, 0.6, -24, 2.1, 4.2, 14, -9, 'gunWood');
        if (lod === 0) hands(m, -2, 0, 26, 1.6);
        return { sight: 6.2, muzzle: 60, rail: [5.4, 2], under: [-0.6, 34], magB: [-1, 6], stock: [4, -26], boreY: 4 };
    },
    'M249'(m, lod) {
        g.recv(m, -12, 16, -1, 7, 5.6, 'gunBlack');
        m.box(-2.8, 1.4, 16, 2.8, 6, 34, 'gunPoly', { collide: false });          // handguard / heat shield
        g.bar(m, 34, 56, 3.8, 1.1, 'gunBlack');
        m.obox(0, 1, 4, 5, 6, 5, 0, 'gunOD');                                      // ammo box on the left side
        g.rail(m, -10, 16, 7, 'gunBlack');
        g.grip(m, -2, -1, 'gunPoly', -16, 10);
        if (lod < 2) { m.obox(1.5, -4, 45, 0.5, 6, 0.5, 25, 'gunBlack'); m.obox(-1.5, -4, 45, 0.5, 6, 0.5, 25, 'gunBlack'); m.box(-2, -1, -32, 2, 6, -12, 'gunPoly', { collide: false }); }
        if (lod === 0) hands(m, -2, -1, 24, 1.4);
        return { sight: 8.6, muzzle: 56, rail: [7.8, 2], under: [1.4, 28], magB: [-6, 4], stock: [5.5, -28], boreY: 3.8 };
    },
};
// attachment models at their mount point (origin: the mount; +z forward)
const ATT_BUILD = {
    'Suppressor'(m) { m.prismZ(0, 0, 1.8, 0, 17, 8, 'gunBlack', { phase: Math.PI / 8 }); },
    'Compensator'(m) { m.prismZ(0, 0, 1.4, 0, 5, 6, 'gunSteel'); m.box(-1.5, 1, 1, 1.5, 1.6, 4, 'gunSteel', { collide: false }); },
    'Flash Hider'(m) { m.prismZ(0, 0, 1.2, 0, 4.5, 6, 'gunBlack'); },
    'Red Dot'(m) { m.box(-1.4, 0, -2, 1.4, 1.6, 2, 'gunBlack', { collide: false }); m.prismZ(0, 3, 1.4, -1.4, 1.4, 8, 'gunBlack', { mCap: 'lens' }); },
    'Holographic'(m) { m.box(-1.8, 0, -3, 1.8, 1.4, 3, 'gunBlack', { collide: false }); m.box(-1.8, 1.4, -3, -1.4, 4.4, 2.6, 'gunBlack', { collide: false }); m.box(1.4, 1.4, -3, 1.8, 4.4, 2.6, 'gunBlack', { collide: false }); m.box(-1.8, 4.4, -3, 1.8, 4.9, 2.6, 'gunBlack', { collide: false }); },
    '2x Scope'(m) { m.box(-1, 0, -2, 1, 1.2, 2, 'gunBlack', { collide: false }); m.prismZ(0, 3, 1.6, -4, 4, 8, 'gunBlack', { mCap: 'lens' }); },
    'ACOG 4x'(m) { m.box(-1.4, 0, -3, 1.4, 1.4, 3, 'gunTan', { collide: false }); m.prismZ(0, 3.2, 1.8, -6, 5, 8, 'gunTan', { mCap: 'lens' }); m.prismZ(0, 3.2, 2.2, 5, 7, 8, 'gunTan', { mCap: 'lens' }); },
    '8x Scope'(m) { m.box(-1, 0, -3, 1, 1.6, 3, 'gunBlack', { collide: false }); m.prismZ(0, 3.8, 1.5, -9, 9, 8, 'gunBlack'); m.prismZ(0, 3.8, 2.4, 9, 13, 8, 'gunBlack', { mCap: 'lens' }); m.prismZ(0, 3.8, 2.0, -12, -9, 8, 'gunBlack', { mCap: 'lens' }); },
    'Vertical Foregrip'(m) { m.box(-1.2, -9, -1.4, 1.2, 0, 1.4, 'gunBlack', { collide: false }); },
    'Angled Foregrip'(m) { m.obox(0, -2.4, 1, 1.1, 2.4, 4.5, -30, 'gunPoly'); },
    'Laser Sight'(m) { m.box(-1.3, -2.6, -3, 1.3, 0, 3, 'gunBlack', { collide: false }); m.prismZ(0.6, -1.3, 0.5, 3, 3.4, 6, 'barrelRed'); },
    'Extended Mag'(m) { m.box(-1.3, -7, -1.7, 1.3, 0, 1.7, 'gunBlack', { collide: false }); },
    'Quickdraw Mag'(m) { m.box(-1.5, -3, -1.8, 1.5, 0, 1.8, 'gunPoly', { collide: false }); m.box(-0.4, -5, -0.8, 0.4, -3, 0.8, 'barrelRed', { collide: false }); },
    'Tactical Stock'(m) { m.box(-1.6, -3, -10, 1.6, 2, 0, 'gunBlack', { collide: false }); m.box(-1.8, -5, -12, 1.8, 2.4, -9, 'gunPoly', { collide: false }); },
    'Cheek Pad'(m) { m.box(-1.6, 0, -6, 1.6, 1.4, 6, 'gunOD', { collide: false }); },
};
// the 2.0 m-off-the-ground models of loot (lying on the ground; origin on the ground)
const ITEM_BUILD = {
    ammo(m, mt) { m.box(-14, 0, -9, 14, 12, 9, { top: mt, side: 'militaryG' }, { collide: false }); },
    att(m, mt) { m.box(-10, 0, -10, 10, 8, 10, { top: mt, side: 'metalDark' }, { collide: false }); },
    helm(m, mt) { m.prism(0, 0, 13, 0, 8, 6, mt, { r1: 11 }); m.prism(0, 0, 11, 8, 14, 6, mt, { r1: 5 }); },
    vest(m, mt) { m.box(-22, 0, -16, 22, 6, 16, mt, { collide: false }); m.box(-14, 6, -12, 14, 9, 12, mt, { collide: false }); },
    pack(m, mt) { m.box(-18, 0, -12, 18, 30, 12, mt, { collide: false }); m.box(-14, 30, -10, 14, 36, 10, mt, { collide: false }); },
    band(m) { m.prismX(5, 0, 5, -8, 8, 6, 'sheet'); },
    kit(m) { m.box(-14, 0, -9, 14, 10, 9, { top: 'trim', side: 'barrelRed' }, { collide: false }); },
    med(m) { m.box(-20, 0, -12, 20, 14, 12, { top: 'barrelRed', side: 'trim' }, { collide: false }); },
    drink(m) { m.prism(0, 0, 4, 0, 16, 6, 'containerB'); },
    pill(m) { m.prism(0, 0, 4, 0, 9, 6, 'trim', { mTop: 'barrelRed' }); },
    frag(m) { m.prism(0, 0, 5, 0, 9, 6, 'crateGreen', { r1: 3 }); },
    smoke(m) { m.prism(0, 0, 4, 0, 14, 6, 'paintGrey'); },
    box(m) { m.box(-45, 0, -30, 45, 50, 30, { top: 'crateWood', side: 'woodDark' }, { collide: false }); },
    // the transport plane (drawn far away: plain)
    plane(m) {
        m.prismZ(0, 0, 190, -1300, 1100, 8, 'paintGrey', { phase: Math.PI / 8 });
        m.prismZ(0, 0, 190, 1100, 1500, 8, 'paintGrey', { phase: Math.PI / 8, caps: false });
        m.box(-1900, 60, -150, 1900, 110, 250, 'metalSheet', { collide: false });
        m.box(-700, 120, -1300, 700, 160, -1050, 'metalSheet', { collide: false });
        m.box(-25, 150, -1300, 25, 650, -1000, 'metalSheet', { collide: false });
        for (const x of [-1100, -600, 600, 1100]) m.prismZ(x, -20, 70, -200, 200, 6, 'metalDark');
    },
};

export function gunModels() {
    const out = [];
    for (const gn of GUNS) {
        const L = [0, 1, 2].map(i => new Model(gn.name + i, 10));
        let mounts = null;
        mounts = BUILD[gn.name](L[0], 0);
        // on the ground: a plain silhouette lying on its side (body, barrel, stock, magazine), from the mounts
        const mt = mounts;
        const col = { 'AKM': 'gunWood', 'SKS': 'gunWood', 'Kar98k': 'gunWood', 'Mini-14': 'gunWood', 'Remington 870': 'gunWood', 'SCAR-L': 'gunTan', 'AWM': 'gunOD' }[gn.name] || 'gunBlack';
        const m1 = L[1], m2 = L[2];
        // lying flat: x (gun's right) becomes up; build it flat directly (y small), z along the gun
        m1.box(-mt.sight * 0.5, 0, -mt.sight, mt.sight * 0.5, 2.4, mt.muzzle * 0.62, col, { collide: false, skip: 'bottom' });
        m1.box(-0.9, 0.6, mt.muzzle * 0.62, 0.9, 1.8, mt.muzzle, 'gunSteel', { collide: false, skip: 'bottom' });
        if (gn.cls > 1) m1.box(-mt.stock[0] * 0.7, 0, mt.stock[1] - 6, mt.stock[0] * 0.7, 2.2, -mt.sight, col, { collide: false, skip: 'bottom' });
        m1.box(mt.magB[0] * 0.8, 0, mt.magB[1] - 1.8, -1, 2, mt.magB[1] + 1.8, 'gunBlack', { collide: false, skip: 'bottom' });
        m2.box(-mt.sight * 0.5, 0, (gn.cls > 1 ? mt.stock[1] : -mt.sight), mt.sight * 0.5, 2.2, mt.muzzle, col, { collide: false, skip: 'bottom' });
        out.push({ name: gn.name, kind: 'gun', lods: L, mounts });
    }
    return out;
}
export function attModels() {
    return ATTS.map(a => { const L = [0, 1, 2].map(i => new Model(a.en + i, 10)); ATT_BUILD[a.en](L[0]); ITEM_BUILD.att(L[1], a.mat === 'gunTan' ? 'armyTan' : 'trim'); ITEM_BUILD.att(L[2], 'trim'); return { name: a.en, kind: 'att', lods: L }; });
}
// loot item kinds -> their model builder and material
export const ITEM_MODELS = [
    ['ammo', 'brass'], ['att', 'trim'], ['helm', 'helm1'], ['helm', 'helm2'], ['helm', 'helm3'], ['vest', 'vest1'], ['vest', 'vest2'], ['vest', 'vest3'],
    ['pack', 'pack'], ['pack', 'cloth1'], ['pack', 'cloth5'], ['band'], ['kit'], ['med'], ['drink'], ['pill'], ['frag'], ['smoke'], ['box'], ['plane'],
];
export function itemModels() {
    return ITEM_MODELS.map(([k, mt], i) => { const L = [0, 1, 2].map(j => new Model(k + i + '_' + j, k === 'plane' ? 1 : 10)); for (const m of L) ITEM_BUILD[k](m, mt); return { name: 'item' + i, kind: 'item', lods: L }; });
}

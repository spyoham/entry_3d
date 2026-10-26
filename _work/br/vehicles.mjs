// v1.1: the vehicles - a jeep, a pickup, a dune buggy and a motorbike. Models (cm, origin on the
// ground under the middle, +z forward, +x right) in three levels of detail, and their numbers.
// The painted panels are carBody1 (the instance's tint picks carBody1..3).
import { Model } from './geom.mjs';

// name, top speed (cm/s), acceleration, grip off the road (top speed x), turning circle radius (cm),
// health, half width / half length (collision), seat height, rider shown (open), radius of the body
export const VEHS = [
    { name: '지프', en: 'jeep', vmax: 2700, acc: 780, off: 0.82, turn: 650, hp: 1100, hw: 88, hl: 205, seat: 105, open: 0, rad: 230, top: 186 },
    { name: '픽업트럭', en: 'pickup', vmax: 2500, acc: 640, off: 0.72, turn: 780, hp: 1400, hw: 95, hl: 265, seat: 110, open: 0, rad: 285, top: 160 },
    { name: '버기', en: 'buggy', vmax: 3000, acc: 1050, off: 0.95, turn: 560, hp: 650, hw: 88, hl: 165, seat: 60, open: 1, rad: 190, top: 105 },
    { name: '오토바이', en: 'bike', vmax: 3400, acc: 1300, off: 0.8, turn: 480, hp: 380, hw: 30, hl: 105, seat: 92, open: 1, rad: 120, top: 100 },
];
const P = 'carBody1';   // painted

const wheel = (m, x, z, r, w, n) => { m.prismX(r, z, r, x - w / 2, x + w / 2, n, 'tyre'); };
const wheels4 = (m, x, zf, zb, r, w, n) => { for (const sx of [-1, 1]) for (const z of [zf, zb]) wheel(m, sx * x, z, r, w, n); };

const BUILD = {
    jeep(m, li) {
        if (li === 2) { m.box(-85, 40, -205, 85, 120, 205, P, { skip: 'bottom', collide: false }); m.box(-80, 120, -170, 80, 180, 60, { top: P, side: 'carGlass' }, { skip: 'bottom', collide: false }); return; }
        // the body: sills, the bonnet, the cabin with its glass, the rear
        m.box(-85, 38, -205, 85, 108, 205, { top: P, side: P, bottom: 'metalDark' }, { collide: false });
        m.box(-80, 108, 60, 80, 122, 195, P, { skip: 'bottom', collide: false });
        m.box(-82, 108, -175, 82, 130, 60, P, { skip: 'bottom top', collide: false });
        m.box(-80, 130, -172, 80, 186, 52, { top: P, side: 'carGlass', s: P }, { skip: 'bottom', collide: false });
        if (li === 0) {
            // the windscreen frame, the grille and lights, the bumpers, the spare wheel
            m.box(-82, 128, 52, 82, 134, 62, 'metalDark', { skip: 'bottom', collide: false });
            m.box(-72, 62, 205, 72, 102, 209, 'metalDark', { skip: 'bottom', collide: false });
            for (const x of [-58, 58]) m.box(x - 12, 84, 206, x + 12, 98, 211, 'trim', { skip: 'bottom', collide: false });
            m.box(-90, 34, 205, 90, 50, 218, 'metalDark', { skip: 'bottom', collide: false });
            m.box(-90, 34, -218, 90, 50, -205, 'metalDark', { skip: 'bottom', collide: false });
            m.prismZ(0, 120, 42, -222, -207, 8, 'tyre');
            // wheel arches
            for (const sx of [-1, 1]) for (const z of [-130, 130]) m.box(sx * 85 - (sx > 0 ? 0 : 6), 80, z - 52, sx * 85 + (sx > 0 ? 6 : 0), 92, z + 52, 'metalDark', { skip: 'bottom', collide: false });
        }
        wheels4(m, 78, 130, -130, 40, 26, li === 0 ? 8 : 6);
    },
    pickup(m, li) {
        if (li === 2) { m.box(-95, 42, -265, 95, 120, 265, P, { skip: 'bottom', collide: false }); m.box(-90, 120, 20, 90, 190, 140, { top: P, side: 'carGlass' }, { skip: 'bottom', collide: false }); return; }
        m.box(-95, 42, -265, 95, 105, 265, { top: P, side: P, bottom: 'metalDark' }, { collide: false, skip: li ? '' : 'top' });
        if (li === 0) {
            // the bed: a floor and three low walls (it is open on top)
            m.box(-92, 100, -258, 92, 106, 15, 'metalDark', { skip: 'bottom', collide: false });
            m.box(-95, 105, -262, -85, 150, 15, P, { skip: 'bottom', collide: false });
            m.box(85, 105, -262, 95, 150, 15, P, { skip: 'bottom', collide: false });
            m.box(-85, 105, -265, 85, 150, -255, P, { skip: 'bottom', collide: false });
            m.box(-95, 100, 15, 95, 105, 265, P, { skip: 'bottom', collide: false });
        }
        m.box(-92, 105, 140, 92, 122, 262, P, { skip: 'bottom', collide: false });
        m.box(-92, 105, 15, 92, 130, 140, P, { skip: 'bottom top', collide: false });
        m.box(-88, 130, 20, 88, 192, 135, { top: P, side: 'carGlass' }, { skip: 'bottom', collide: false });
        if (li === 0) {
            m.box(-80, 62, 262, 80, 100, 266, 'trim', { skip: 'bottom', collide: false });
            for (const x of [-66, 66]) m.box(x - 14, 86, 264, x + 14, 100, 269, 'trim', { skip: 'bottom', collide: false });
            m.box(-98, 36, 262, 98, 52, 276, 'metalDark', { skip: 'bottom', collide: false });
            m.box(-98, 36, -276, 98, 52, -262, 'metalDark', { skip: 'bottom', collide: false });
        }
        wheels4(m, 86, 175, -165, 42, 26, li === 0 ? 8 : 6);
    },
    buggy(m, li) {
        if (li === 2) { m.box(-80, 35, -160, 80, 95, 160, P, { skip: 'bottom', collide: false }); m.box(-60, 95, -60, 60, 175, 40, 'metalDark', { skip: 'bottom', collide: false }); return; }
        // the floor pan, the nose, the engine behind the seats
        m.box(-72, 32, -150, 72, 50, 120, 'metalDark', { collide: false });
        m.box(-62, 50, 55, 62, 82, 165, P, { skip: 'bottom', collide: false });
        m.box(-62, 50, -168, 62, 105, -85, { top: 'metalDark', side: P }, { skip: 'bottom', collide: false });
        if (li === 0) {
            // two seats, the roll cage, the exhausts
            for (const x of [-32, 32]) { m.box(x - 22, 50, -70, x + 22, 72, -20, 'gunBlack', { skip: 'bottom', collide: false }); m.box(x - 22, 72, -78, x + 22, 128, -66, 'gunBlack', { skip: 'bottom', collide: false }); }
            for (const sx of [-1, 1]) {
                m.box(sx * 66 - 3, 50, -82, sx * 66 + 3, 178, -76, 'metalDark', { collide: false });
                m.obox(sx * 66, 140, 0, 3, 62, 3, -42, 'metalDark');
                m.box(sx * 66 - 3, 172, -82, sx * 66 + 3, 178, 40, 'metalDark', { collide: false });
                m.prismZ(sx * 30, 88, 6, -185, -165, 5, 'gunSteel');
            }
            m.box(-69, 172, -82, 69, 178, -76, 'metalDark', { collide: false });
            m.box(-69, 172, 34, 69, 178, 40, 'metalDark', { collide: false });
            for (const x of [-42, 42]) m.box(x - 10, 66, 165, x + 10, 78, 169, 'trim', { skip: 'bottom', collide: false });
        }
        wheels4(m, 92, 115, -120, 46, 34, li === 0 ? 8 : 6);
    },
    bike(m, li) {
        if (li === 2) { m.box(-14, 30, -100, 14, 100, 100, P, { skip: 'bottom', collide: false }); return; }
        // the tank and the frame, the seat, the engine, the fork and the bars
        m.box(-15, 72, -5, 15, 100, 55, P, { skip: 'bottom', collide: false });
        m.box(-13, 84, -78, 13, 98, -5, 'gunBlack', { skip: 'bottom', collide: false });
        m.box(-16, 32, -25, 16, 72, 40, 'metalDark', { collide: false });
        m.obox(0, 72, 76, 4, 42, 4, -22, 'metalSheet');
        m.box(-38, 108, 82, 38, 113, 88, 'metalDark', { collide: false });
        if (li === 0) {
            m.box(-11, 90, 88, 11, 106, 96, 'trim', { skip: 'bottom', collide: false });
            m.box(-12, 60, -95, 12, 66, -40, P, { skip: 'bottom', collide: false });
            m.prismZ(10, 48, 5, -80, -10, 5, 'gunSteel');
        }
        for (const z of [78, -72]) m.prismX(33, z, 33, -6, 6, li === 0 ? 8 : 6, 'tyre');
    },
};

export function vehicleModels() {
    return VEHS.map(v => { const L = [0, 1, 2].map(i => { const m = new Model('veh_' + v.en + i, 1); BUILD[v.en](m, i); return m; }); return { name: 'veh_' + v.en, kind: 'vehicle', lods: L }; });
}

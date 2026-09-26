// v7: text slots rewritten on every frame of a static screen (slot collisions)
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 10 });
const g = (e) => s.peek(e);
for (let i = 0; i < 3; i++) s.frame();
const check = (label) => {
    for (let i = 0; i < 12; i++) s.frame();
    const v0 = g('txV').slice();
    for (let i = 0; i < 4; i++) s.frame();
    const v1 = g('txV');
    const hot = [];
    v1.forEach((v, i) => { if (v - v0[i] >= 4) hot.push(i + 1 + ':' + g('txS')[i]); });
    console.log(label.padEnd(14), hot.length ? 'REWRITTEN EVERY FRAME ' + hot.join(', ') : 'ok');
};
for (const r of [1, 2]) {
    g(`rules = ${r}`);
    for (let pg = 0; pg <= 3; pg++) {
        g(`mnPage = ${pg}; mnRow = 1; mnBuild();`);
        const n = g('mnN');
        for (let row = 1; row <= n; row++) { g(`mnRow = ${row}; menuSel = mnItem[${row - 1}];`); check(`r${r} p${pg} row${row}`); }
    }
    g('mnPage = 0; mnRow = 1; mnBuild();');
}
g('wx = 3'); g('mnPage = 1; mnRow = 6; mnBuild();'); check('menu 9 wx3');
g('mnPage = 1; mnRow = 5; mnBuild(); gMode = 3'); check('menu 8 TT'); g('gMode = 4'); check('menu 8 PR'); g('gMode = 1; mnPage = 0; mnRow = 1; mnBuild();');
g('raceState = ST_TUNE; tuRow = 1'); check('garage'); g('tuRow = 6'); check('garage 6');
for (let t = 1; t <= 4; t++) { g(`raceState = ST_PROF; prTab = ${t}`); check('profile ' + t); }
g('wx = 1');
g('raceState = ST_CARSEL'); check('carsel');
g('raceState = ST_TRKSEL'); check('trksel');
g('raceState = ST_EDIT'); check('editor');
g('shEncode(); shShow = 1'); check('editor code');
g('shShow = 0; mnPage = 0; mnRow = 1; mnBuild(); raceState = ST_MENU; rules = 2; gfx = 2;');
g('doStartRace()'); g(`playerInput = function(){ aiPlan(1); aiDrive(1); }`);
check('quali');
g('endQuali()'); check('quali result');
g('startGrid(1)'); check('formation');
g('formSkip(); formEnd();'); check('count');
for (let i = 0; i < 90; i++) s.frame();
check('race');
g('prevState = raceState; raceState = ST_PAUSE; drawPausePanel();'); check('pause');
g('raceState = prevState; enterReplay()'); check('replay');

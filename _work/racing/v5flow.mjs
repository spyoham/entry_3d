// v5 flow test in the simulator: championship with 1-lap races, the player
// driven by the AI. Checks results -> standings -> next round, DRS use,
// sector splits, and prints the HUD tables.
// usage: node v5flow.mjs [rounds] [fps]
import { createSim } from './sim.mjs';
const rounds = +(process.argv[2] || 2);
const fps = +(process.argv[3] || 8);
const s = createSim({ fps });
const g = (e) => s.peek(e);
g(`renderWorld = function(){}`);
for (let i = 0; i < 4; i++) s.frame();
g(`gMode = 2`); g(`lapSel = ${+(process.env.LAPSEL || 1)}`); g(`aiDiff = 3`);
const press = (code) => { s.keys.add(code); s.frame(); s.keys.delete(code); s.frame(); };
press(13);                                   // START CHAMPIONSHIP (menuSel 1)
g(`playerInput = function(){ aiPlan(1); aiDrive(1); drsKey = 1; }`);
for (let r = 1; r <= rounds; r++) {
    let f = 0, drsOpen = 0, drsAny = 0, towMax = 0, secs = new Set();
    while (g('raceState') !== 5 && f < fps * 400) {
        s.frame(); f++;
        for (let c = 0; c < 8; c++) { if (g(`caDRS[${c}]`) > 0) drsAny++; towMax = Math.max(towMax, g(`caTow[${c}]`)); }
        if (g('caDRS[0]') > 0) drsOpen++;
        const d = s.texts.tDelta; if (d && d.startsWith('S')) secs.add(d.replace(/​/g, ''));
    }
    console.log(`round ${r} (${g(`trkName[${g('selTrk') - 1}]`)}): state ${g('raceState')} after ${(f / fps).toFixed(0)} s, finished P${g('finished')}, raceT ${g('raceT').toFixed(1)}, ` +
        `player DRS frames ${drsOpen}, all DRS frames ${drsAny}, max tow ${towMax.toFixed(2)}`);
    console.log('  sectors:', [...secs].join(' | '));
    for (let i = 0; i < 20 * fps; i++) s.frame();     // let the others finish
    console.log('  ' + s.texts.tBig + ' / ' + s.texts.tSub.replace(/​/g, ''));
    for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9]) console.log('   |' + String(s.texts['tM' + k]).replace(/​/g, '') + '|');
    press(13);
    console.log('  -> state', g('raceState'), s.texts.tBig, '/', s.texts.tSub);
    for (const k of [1, 2, 3, 9]) console.log('   |' + String(s.texts['tM' + k]).replace(/​/g, '') + '|');
    press(13);
    console.log('  -> state', g('raceState'), 'track', g('selTrk'), 'round', g('chRound'));
}

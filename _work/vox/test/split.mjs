// the SPLIT build in the sim: node test/split.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, SPLIT: 1 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
s.poke('tday', 0.25); F(120);
console.log('frameSeq', s.peek('frameSeq'), 'viewSeq', s.peek('viewSeq'), 'hudSeq', s.peek('hudSeq'));
await s.png('test/split_play.png');
s.as('pen', () => s.fn.uiOpen(5)); F(5); await s.png('test/split_ui.png');
s.as('pen', () => s.fn.uiClose()); s.poke('uiMode', 6); F(5); await s.png('test/split_menu.png');
console.log('done');

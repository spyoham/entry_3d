// (v3.5, 11-26) the hotbar, the hearts and the food are drawn by an object of their own, `bar`, and only when what they
// show is another (hud.js hudSig, hudBars); with a screen open the main pen draws them as before: node test/hudbar35.mjs
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const s = createSim({ consts: { AUTOSEED: 777, TESTRUN: 1, ANIMALS: 0, GENV: 3, BENCH: 1 } });
let n = 0; while (s.peek('gState') !== 2 && n < 6000) { s.frame(); n++; }
const fr = (k) => { for (let i = 0; i < k; i++) s.frame(); };
s.poke('gameMode', 0); s.poke('hp', 20); s.poke('food', 20); s.poke('helpT', 0);
fr(5);
const n0 = s.strokes('bar'), p0 = s.strokes('pen');
ok(n0 > 300 && s.peek('hudOn') === 1, `survival: the bar holds the hotbar, 10 hearts and 10 food (${n0} shapes; the world's pen ${p0})`);
fr(30);
ok(s.strokes('bar') === n0 && s.peek('hudAsk') === 0, 'thirty frames on, nothing changed: not drawn again');
s.poke('hp', 7); fr(3);
const n1 = s.strokes('bar');
ok(n1 < n0, `hurt to 7: drawn again with fewer hearts (${n1} shapes)`);
s.poke('food', 5); fr(3);
ok(s.strokes('bar') < n1, 'hungry: drawn again');
const n2 = s.strokes('bar');
// something in hand: an item's picture
s.as('pen', () => s.fn.runCommand('/give @s diamond_pickaxe')); fr(3);
ok(s.strokes('bar') > n2, `a pickaxe given: its picture is on the bar (${s.strokes('bar')} shapes)`);
const n3 = s.strokes('bar');
// a screen open: the main pen draws the bars under it, the bar's own picture is gone
s.poke('testCmd', 22); fr(3);
ok(s.peek('uiMode') !== 0 && s.strokes('bar') === 0 && s.peek('hudOn') === 0, `the inventory open (screen ${s.peek('uiMode')}): the bar is empty, the pen draws all`);
s.as('pen', () => s.fn.uiClose()); fr(3);
ok(s.peek('uiMode') === 0 && s.strokes('bar') === n3, 'closed: the bar has its picture again');
// spectator: no hotbar
s.poke('gameMode', 3); fr(3);
ok(s.strokes('bar') === 0, 'a spectator has no bars');
s.poke('gameMode', 0); fr(3);
ok(s.strokes('bar') > 300, 'back in survival: there again (' + s.strokes('bar') + ' shapes, it was ' + n3 + '; hp ' + s.peek('hp') + ', food ' + s.peek('food') + ', in hand ' + s.peek('INVI')[s.peek('hotSel') - 1] + ')');
// another world and back: the picture was taken away on the way
s.poke('tStage', 1); s.poke('tX', 1.5); s.poke('tZ', 1.5); s.poke('testCmd', 4);
let k = 0; fr(2); while (s.peek('gState') !== 2 && k < 4000) { s.frame(); k++; }
fr(5);
ok(s.peek('dim') === 1 && s.strokes('bar') > 300, `in the other world after ${k} frames of travel: the bar is drawn (${s.strokes('bar')} shapes)`);
// creative: the hotbar alone
s.poke('gameMode', 1); fr(3);
ok(s.strokes('bar') > 10 && s.strokes('bar') < n3, `creative: the hotbar without hearts (${s.strokes('bar')} shapes)`);
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

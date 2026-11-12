// (v2.8) world edit in a single world: node test/wedit.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => KEY.indexOf(k);
const say = (c) => { call(() => fn.chatRun(c)); return String(s.peek('CHT').slice(-1)[0]); };
const at = (x, y, z) => KEY[call(() => fn.blockAt(x, y, z))];
s.poke('gameMode', 1); s.poke('flying', 1);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 90;
call(() => fn.runCommand(`/fill ${X - 12} ${Y} ${Z - 12} ${X + 12} ${Y + 20} ${Z + 12} air`));
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
stand(X, Y, Z); s.poke('yaw', 0); s.poke('pitch', 0); F(2);
// the selection
let r = say('//pos1'); ok(r.includes(`${X}, ${Y}, ${Z}`), '//pos1 at the feet: ' + r);
stand(X + 3, Y + 2, Z + 4); r = say('//pos2'); ok(r.includes('(60칸)'), '//pos2, 4×3×5 = 60: ' + r);
r = say('//size'); ok(r.includes('4×3×5'), '//size: ' + r);
// //set with a pattern, //count, //undo, //redo
r = say('//set stone'); ok(r.includes('60') && at(X, Y, Z) === 'stone' && at(X + 3, Y + 2, Z + 3) === 'stone', '//set stone: ' + r);
r = say('//count stone'); ok(r.includes('60'), '//count: ' + r);
r = say('//undo'); ok(at(X + 1, Y + 1, Z + 1) === ' ' && r.includes('60'), '//undo: ' + r);
r = say('//redo'); ok(at(X + 1, Y + 1, Z + 1) === 'stone', '//redo: ' + r);
r = say('//set 50%oak_planks,50%glass');
const kinds = new Set(); for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) for (let y = 0; y < 3; y++) kinds.add(at(X + x, Y + y, Z + z));
ok(kinds.size === 2 && kinds.has('oak_planks') && kinds.has('glass'), `//set 50%oak_planks,50%glass: ${[...kinds]}`);
r = say('//replace glass gold_block'); ok(!kinds.has('x') && r.includes('바꿨'), '//replace: ' + r);
let g = 0; for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) for (let y = 0; y < 3; y++) if (at(X + x, Y + y, Z + z) === 'glass') g++;
ok(g === 0, 'no glass left');
r = say('//walls stone'); ok(at(X, Y + 1, Z + 1) === 'stone' && at(X + 1, Y + 1, Z + 1) !== 'stone', '//walls: the sides only');
r = say('//set air'); r = say('//faces dirt'); ok(at(X, Y, Z) === 'dirt' && at(X + 1, Y + 1, Z + 1) === ' ' && at(X + 1, Y + 2, Z + 1) === 'dirt', '//faces: a hollow box');
// //copy //paste //rotate
say('//set air'); call(() => fn.runCommand(`/setblock ${X} ${Y} ${Z} gold_block`)); call(() => fn.runCommand(`/setblock ${X + 3} ${Y} ${Z} diamond_block`));
stand(X, Y, Z); r = say('//copy'); ok(r.includes('60'), '//copy: ' + r);
stand(X, Y, Z + 8); r = say('//paste'); ok(at(X, Y, Z + 8) === 'gold_block' && at(X + 3, Y, Z + 8) === 'diamond_block', '//paste at the same offset from the feet: ' + r);
r = say('//undo'); ok(at(X, Y, Z + 8) === ' ', '//undo the paste');
r = say('//rotate 90'); stand(X, Y, Z + 8); r = say('//paste');
const gp = []; for (let x = -6; x <= 6; x++) for (let z = 2; z <= 14; z++) { if (at(X + x, Y, Z + z) === 'gold_block') gp.push([x, z]); if (at(X + x, Y, Z + z) === 'diamond_block') gp.push(['d', x, z]); }
ok(gp.length === 2 && gp[0] !== gp[1], `//rotate 90 then //paste: ${JSON.stringify(gp)}`);
const dg = gp.find((p) => p[0] === 'd'), gg = gp.find((p) => p[0] !== 'd');
ok(dg && gg && dg[1] === gg[0] && Math.abs(dg[2] - gg[1]) === 3, 'the two 3 apart, now along z');
// //cut leaves air; //paste -a keeps what is under air
say('//undo');
// shapes round the feet
stand(X, Y + 8, Z); r = say('//sphere stone 3');
ok(at(X, Y + 8, Z) === 'stone' && at(X + 3, Y + 8, Z) === 'stone' && at(X + 3, Y + 11, Z) === ' ', '//sphere stone 3: ' + r);
say('//undo'); r = say('//hsphere glass 4'); ok(at(X, Y + 8, Z) === ' ' && at(X + 4, Y + 8, Z) === 'glass', '//hsphere: hollow: ' + r);
say('//undo'); r = say('//cyl stone 2 3'); ok(at(X + 2, Y + 10, Z) === 'stone' && at(X + 2, Y + 11, Z) === ' ', '//cyl 2 high 3: ' + r);
say('//undo'); r = say('//pyramid stone 3'); ok(at(X + 2, Y + 8, Z + 2) === 'stone' && at(X, Y + 10, Z) === 'stone' && at(X + 1, Y + 10, Z) === ' ', '//pyramid: ' + r);
say('//undo');
// //stack //move //expand //contract //shift
stand(X, Y, Z); say('//pos1'); stand(X + 1, Y, Z + 1); say('//pos2'); say('//set stone');
s.poke('yaw', 90); s.poke('pitch', 0);
r = say('//stack 3'); ok(at(X + 2, Y, Z) === 'stone' && at(X + 7, Y, Z + 1) === 'stone' && at(X + 8, Y, Z) === ' ', '//stack 3 the way of the eye (+x): ' + r);
say('//undo');
r = say('//move 2 up'); ok(at(X, Y, Z) === ' ' && at(X, Y + 2, Z) === 'stone', '//move 2 up: ' + r);
r = say('//size'); ok(r.includes(`${Y + 2}`), 'the selection moved with it: ' + r);
r = say('//expand 3 up'); ok(r.includes('(16칸)'), '//expand 3 up: ' + r);
r = say('//contract 3 up'); ok(r.includes('(4칸)'), '//contract 3 up: ' + r);
r = say('//shift 5 east'); ok(r.includes(`${X + 5},`), '//shift 5 east: ' + r);
// the wand: a click the first corner, F the second
say('//wand'); ok(KEY[s.peek('INVI')[s.peek('hotSel') - 1]] === 'wooden_axe' || s.peek('INVI').includes(id('wooden_axe')), '//wand gives the wooden axe');
const I = s.peek('INVI'); I[s.peek('hotSel') - 1] = id('wooden_axe');
call(() => fn.runCommand(`/setblock ${X + 9} ${Y} ${Z + 9} stone`));
s.poke('pickOn', 1); s.poke('pickX', X + 9); s.poke('pickY', Y); s.poke('pickZ', Z + 9); s.poke('pickB', id('stone'));
s.poke('clickHeld', 1); s.poke('weClick', 0); call(() => fn.breaking(0.016)); s.poke('clickHeld', 0);
ok(s.peek('we1X') === X + 9 && at(X + 9, Y, Z + 9) === 'stone', 'the wand\'s click: the first corner, nothing broken');
s.poke('pickX', X + 10); s.poke('placeCool', 0); call(() => fn.useKey());
ok(s.peek('we2X') === X + 10, 'the wand\'s F: the second corner');
// off in this world: refused; on again
r = say('//worldedit off'); ok(r.includes('끔'), r);
r = say('//set stone'); ok(r.includes('꺼져'), 'refused when off: ' + r);
r = say('/worldedit on'); ok(r.includes('켬'), r);
// too big
stand(X, Y, Z); say('//pos1'); stand(X + 60, Y + 30, Z + 60); r = say('//pos2'); r = say('//set stone'); ok(r.includes('너무 큽니다'), 'too big: ' + r);
// drain
stand(X, Y, Z); call(() => fn.runCommand(`/fill ${X + 1} ${Y} ${Z + 1} ${X + 2} ${Y} ${Z + 2} water`)); F(2);
r = say('//drain 4'); ok(at(X + 1, Y, Z + 1) === ' ', '//drain: ' + r);
// a plain command still runs
r = say('/setblock ~ ~ ~ stone'); ok(at(X, Y, Z) === 'stone', 'a plain command: ' + r);
// kept with the world
call(() => fn.runCommand('//worldedit off'));
console.log(fails ? fails + ' FAILED' : 'all ok');

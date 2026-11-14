// scripted play in the sim: node test/play.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0 } });
let n = 0; while (s.peek('gState') !== 2 && n < 3000) { s.frame(); n++; }
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
const inv = () => s.peek('INVI').map((id, i) => id ? `${i + 1}:${id}x${s.peek('INVN')[i]}` : '').filter(Boolean).join(' ');
const W = () => s.peek('W'); const SZ = 128, WY = 64;
const blk = (x, y, z) => W()[(x * SZ + z) * WY + y];
// stand and look down at the block in front
s.poke('tX', 64.5); s.poke('tY', 40); s.poke('tZ', 64.5); s.poke('tYaw', 0); s.poke('tPitch', -60); s.poke('testCmd', 1); F(5);
console.log('pick', s.peek('pickOn'), s.peek('pickX'), s.peek('pickY'), s.peek('pickZ'), 'block', s.peek('pickB'), 'hp', s.peek('hp'));
const [bx, by, bz] = [s.peek('pickX'), s.peek('pickY'), s.peek('pickZ')];
s.mouse.down = true; F(150); s.mouse.down = false; F(60);
console.log('after digging: block', blk(bx, by, bz), 'inv', inv(), 'stage', s.peek('breakStage'));
// place it back
s.keys.add(70); F(2); s.keys.delete(70); F(5);
console.log('after F: block at', s.peek('nbX'), s.peek('nbY'), s.peek('nbZ'), '=', blk(s.peek('nbX'), s.peek('nbY'), s.peek('nbZ')), 'inv', inv());
// give logs and craft in the 2x2 grid
s.as('pen', () => { s.fn.addItem(13, 3, 0); });
s.keys.add(69); F(2); s.keys.delete(69); F(3);
console.log('ui', s.peek('uiMode'), 'inv', inv());
s.as('pen', () => { const k = s.peek('INVI').indexOf(13) + 1; s.fn.slotClick(k, 0); s.fn.slotClick(41, 0); });
F(2);
console.log('grid', s.peek('CGI').slice(0, 4).join(','), 'out', s.peek('craftOut'), 'x', s.peek('craftCnt'));
s.as('pen', () => { s.fn.slotClick(50, 0, 1); });
console.log('after shift-craft', inv(), 'grid', s.peek('CGI').slice(0, 4).join(','), s.peek('CGN').slice(0, 4).join(','));
// crafting table from 4 planks
s.as('pen', () => { const k = s.peek('INVI').indexOf(5) + 1; s.fn.slotClick(k, 0); s.fn.slotClick(41, 1); s.fn.slotClick(42, 1); s.fn.slotClick(43, 1); s.fn.slotClick(44, 1); s.fn.slotClick(k, 0); });
console.log('grid', s.peek('CGI').slice(0, 4).join(','), 'out', s.peek('craftOut'));
s.as('pen', () => { s.fn.slotClick(50, 0); });
console.log('cursor', s.peek('curI'), s.peek('curN'), 'inv', inv());
s.as('pen', () => { s.fn.slotClick(9, 0); });
F(3);
await s.png('test/ui1.png');
s.keys.add(69); F(2); s.keys.delete(69); F(3);
console.log('closed ui', s.peek('uiMode'), 'inv', inv(), 'hp', s.peek('hp'), 'food', s.peek('food'));

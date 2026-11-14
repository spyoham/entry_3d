// (v3.0) the mouse's buttons as tessvm 0.3.56 tells them ($MOUSE_BUTTONS 1 left, 2 right, 4 middle):
// the right one places and uses (not breaking), the middle one picks the block, the inventory's right
// click, Shift and a click, a stack drawn over slots: node test/buttons.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(30);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const call = (f) => s.as('pen', f), cmd = (t) => call(() => s.fn.runCommand(t));
const KEY = s.peek('ITKEY'), id = (k) => KEY.indexOf(k);
const inv = () => s.peek('INVI'), invn = () => s.peek('INVN');
s.poke('$TESSVM', 1); s.poke('isTess', 1); s.poke('$M_LOCK', 1);
// a press of the buttons b (the mouse is down while any is) for k frames, then let go
const btn = (b, k = 1) => { s.poke('$MOUSE_BUTTONS', b); s.mouse.down = true; F(k); s.poke('$MOUSE_BUTTONS', 0); s.mouse.down = false; F(2); };
s.poke('flying', 1);
const X = Math.floor(s.peek('px')), Y = Math.floor(s.peek('py')) + 3, Z = Math.floor(s.peek('pz'));
const at = (x, y, z) => call(() => s.fn.blockAt(x, y, z));
const look = (blockKey) => {
  cmd(`/fill ${X - 2} ${Y - 1} ${Z - 1} ${X + 2} ${Y + 3} ${Z + 4} air`);
  cmd(`/setblock ${X} ${Y + 1} ${Z + 3} ${blockKey}`);
  s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('yaw', 0); s.poke('pitch', 0);
  F(2);
};
cmd('/clear');
cmd('/give @s stone 10');
s.poke('hotSel', inv().indexOf(id('stone')) + 1);
// creative: the right button held long does not break the block looked at; it puts stone before it
look('gold_block');
const gold = at(X, Y + 1, Z + 3);
btn(2, 1);
ok(at(X, Y + 1, Z + 3) === gold && at(X, Y + 1, Z + 2) > 0, `the right button: the gold stays, a block before it (${at(X, Y + 1, Z + 2)})`);
look('gold_block');
btn(2, 40);
ok(at(X, Y + 1, Z + 3) === gold, 'the right button held 40 frames: the gold block is not broken');
look('gold_block');
btn(1, 1);
ok(at(X, Y + 1, Z + 3) === 0, 'the left button: broken (creative)');
// the middle button: pick block
look('diamond_block');
const dia = id('diamond_block');
btn(4, 1);
ok(inv()[s.peek('hotSel') - 1] === dia, `the middle button: diamond block in hand (${KEY[inv()[s.peek('hotSel') - 1]]})`);
ok(at(X, Y + 1, Z + 3) > 0, 'the middle button: not broken');
// survival: the right button held places again every 0.2 s (a wall of stone going up and toward)
cmd('/gamemode survival'); s.poke('flying', 1);
cmd('/clear'); cmd('/give @s stone 10'); s.poke('hotSel', inv().indexOf(id('stone')) + 1);
look('gold_block');
s.poke('pitch', 0);
btn(2, 1);
const st1 = invn()[s.peek('hotSel') - 1];
ok(st1 === 9, `survival, a press of the right button: one stone placed (${st1} left)`);
// the inventory
cmd('/clear');
call(() => s.fn.uiOpen(1)); F(2);
const hover = (q) => { call(() => s.fn.slotXY(q)); s.mouse.x = s.peek('slX'); s.mouse.y = s.peek('slY'); F(1); };
const cur = () => [s.peek('curI'), s.peek('curN')];
const put = (q, i, c) => { const I = inv(), N = invn(); I[q - 1] = i; N[q - 1] = c; };
const DIRT = id('dirt');
put(10, DIRT, 64);
hover(10); btn(2, 1);
ok(cur()[0] === DIRT && cur()[1] === 32 && invn()[9] === 32, `right click on 64 dirt: half on the cursor (${cur()}) and ${invn()[9]} left`);
hover(11); btn(2, 1);
ok(inv()[10] === DIRT && invn()[10] === 1 && cur()[1] === 31, `right click on an empty slot: one put (${invn()[10]}), ${cur()[1]} on the cursor`);
hover(11); btn(1, 1);
ok(invn()[10] === 32 && cur()[0] === 0, `left click there: the rest put (${invn()[10]})`);
// Shift and a click: from the inventory to the hotbar
s.keys.add(16); hover(10); btn(1, 1); s.keys.delete(16);
ok(inv()[9] === 0 && inv().slice(0, 9).includes(DIRT), `Shift and a click: the 32 dirt to the hotbar (slot ${inv().indexOf(DIRT) + 1})`);
// a stack drawn over slots: the left button shares it out, the right one puts one in each
call(() => s.fn.slotClick(inv().indexOf(DIRT) + 1, 0, 0));
ok(cur()[1] === 32, 'all 32 on the cursor');
const drag = (b, slots) => { hover(slots[0]); s.poke('$MOUSE_BUTTONS', b); s.mouse.down = true; F(1); for (const q of slots.slice(1)) { hover(q); F(1); } s.poke('$MOUSE_BUTTONS', 0); s.mouse.down = false; F(2); };
drag(1, [20, 21, 22]);
ok(invn()[19] === 10 && invn()[20] === 10 && invn()[21] === 10 && cur()[1] === 2, `the left button drawn over 3 slots: ${invn().slice(19, 22)} and ${cur()[1]} left on the cursor`);
drag(2, [23, 24]);
ok(invn()[22] === 1 && invn()[23] === 1 && cur()[0] === 0, `the right button drawn over 2: one each (${invn().slice(22, 24)}), the cursor empty`);
// a chest: Shift moves to it and back (to the hotbar first, from its right end)
call(() => s.fn.uiClose()); F(2);
cmd('/clear'); cmd('/give @s cobblestone 20');
cmd(`/setblock ${X} ${Y + 1} ${Z + 3} chest`);
call(() => s.fn.chestOpen(X, Y + 1, Z + 3)); F(2);
ok(s.peek('uiMode') === 4, 'the chest open');
const cs = inv().indexOf(id('cobblestone')) + 1;
call(() => s.fn.slotClick(cs, 0, 1));
call(() => s.fn.slotGet(61)); const c61 = [s.peek('gI'), s.peek('gN')];
ok(inv()[cs - 1] === 0 && c61[0] === id('cobblestone') && c61[1] === 20, `Shift and a click: the cobblestone into the chest (${c61})`);
call(() => s.fn.slotClick(61, 0, 1));
ok(inv()[8] === id('cobblestone') && invn()[8] === 20, `Shift and a click in the chest: back to the hotbar's last slot (${KEY[inv()[8]]} ${invn()[8]})`);
call(() => s.fn.uiClose()); F(2);
// a furnace: what smelts to its input, fuel to its fuel
cmd('/clear'); cmd('/give @s iron_ore 5'); cmd('/give @s coal 3');
cmd(`/setblock ${X} ${Y + 1} ${Z + 3} furnace`);
call(() => s.fn.furnaceOpen(X, Y + 1, Z + 3)); F(2);
call(() => s.fn.slotClick(inv().indexOf(id('iron_ore')) + 1, 0, 1));
call(() => s.fn.slotClick(inv().indexOf(id('coal')) + 1, 0, 1));
call(() => s.fn.slotGet(51)); const f51 = s.peek('gI');
call(() => s.fn.slotGet(52)); const f52 = s.peek('gI');
ok(f51 === id('iron_ore') && f52 === id('coal'), `Shift into a furnace: ${KEY[f51]} in, ${KEY[f52]} as fuel`);
call(() => s.fn.uiClose()); F(2);
// Entry without the buttons ($MOUSE_BUTTONS stays 0): the click is the left one
s.poke('$MOUSE_BUTTONS', 0); s.poke('$M_LOCK', 1);
cmd('/gamemode creative'); s.poke('flying', 1);
look('gold_block');
s.mouse.down = true; s.click(); F(3); s.mouse.down = false; F(2);
ok(at(X, Y + 1, Z + 3) === 0, 'no buttons told: a click breaks (as before)');
console.log(fails ? fails + ' FAILED' : 'all ok');

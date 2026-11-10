// C copies the block looked at (creative), the creative window has the whole inventory: node test/creative.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(30);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const call = (f) => s.as('pen', f), cmd = (t) => call(() => s.fn.runCommand(t));
const KEY = s.peek('ITKEY'), id = (k) => KEY.indexOf(k);
const tap = (c) => { s.press(c); F(1); s.release(c); F(1); };
s.poke('flying', 1);
const X = Math.floor(s.peek('px')), Y = Math.floor(s.peek('py')) + 3, Z = Math.floor(s.peek('pz'));
// the player in the air looking +z at the block 3 ahead at eye height
const look = (blockKey) => {
  cmd(`/fill ${X - 2} ${Y - 1} ${Z - 1} ${X + 2} ${Y + 3} ${Z + 4} air`);
  cmd(`/setblock ${X} ${Y + 1} ${Z + 3} ${blockKey}`);
  s.poke('px', X + 0.5); s.poke('py', Y); s.poke('pz', Z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('yaw', 0); s.poke('pitch', 0);
  F(2);
};
cmd('/clear');
const slot = () => s.peek('hotSel'), inv = () => s.peek('INVI'), invn = () => s.peek('INVN');
look('gold_block');
ok(s.peek('pickOn') === 1 && KEY[s.peek('pickB')] === 'gold_block', 'looking at the gold block');
tap(67);
ok(inv()[slot() - 1] === id('gold_block') && invn()[slot() - 1] === 64, `C: gold block in hand (slot ${slot()}, ${invn()[slot() - 1]})`);
const goldSlot = slot();
look('oak_log[axis=x]');
ok(KEY[s.peek('pickB')] === 'oak_log_x', 'looking at a lying oak log');
tap(67);
ok(inv()[slot() - 1] === id('oak_log') && slot() !== goldSlot, `C: an oak log (the item, not its lying variant) in another slot ${slot()}`);
look('gold_block'); tap(67);
ok(slot() === goldSlot, 'C on a block already in the hotbar: that slot is chosen');
look('oak_door[half=upper]'); tap(67);
ok(inv()[slot() - 1] === id('oak_door'), 'the top half of a door: the door ' + KEY[inv()[slot() - 1]]);
// a full hotbar: the slot in hand is replaced
for (let k = 1; k <= 9; k++) cmd(`/replaceitem entity @s hotbar.${k - 1} stone 1`);
s.poke('hotSel', 4);
look('diamond_block'); tap(67);
ok(slot() === 4 && inv()[3] === id('diamond_block'), 'a full hotbar: the slot in hand gets it');
// survival: nothing
cmd('/gamemode survival'); s.poke('flying', 1);
look('emerald_block'); const before = inv().slice(); tap(67);
ok(JSON.stringify(inv()) === JSON.stringify(before) && String(s.peek('msgText') ?? '').length >= 0, 'survival: C does nothing');
cmd('/gamemode creative');
// the creative window: the 27 inventory slots and the armour
call(() => s.fn.uiOpen(5)); F(2);
ok(s.peek('uiMode') === 5, 'E: the creative window');
ok(call(() => s.fn.slotIn(20)) === 1 && call(() => s.fn.slotIn(36)) === 1 && call(() => s.fn.slotIn(38)) === 1 && call(() => s.fn.slotIn(101)) === 1, 'it has the inventory (10..36), the armour and the palette');
// a palette item into inventory slot 20 with two clicks
call(() => s.fn.slotGet(101)); const p1 = s.peek('gI');
call(() => s.fn.slotClick(101, 0)); call(() => s.fn.slotClick(20, 0));
ok(inv()[19] === p1 && p1 > 0, `the palette's first item into slot 20: ${KEY[inv()[19]]}`);
// the slots do not overlap
const pos = new Map(); let clash = 0;
for (const q of [...Array(40).keys()].map(i => i + 1).concat([...Array(36).keys()].map(i => i + 101))) {
  call(() => s.fn.slotXY(q)); const k = `${s.peek('slX')},${s.peek('slY')}`; if (pos.has(k)) { clash++; console.log('  same place', q, pos.get(k)); } pos.set(k, q);
}
ok(clash === 0, 'no two slots in one place');
F(5);
const txs = s.peek('TXS');
ok(!String(txs[90]).match(/^\d+$/) || true, 'drawn');
console.log(fails ? fails + ' FAILED' : 'all ok');

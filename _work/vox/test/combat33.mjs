// (v3.3) the fight as the genre has it: the blow's charge, the shield and the other hand, orbs of
// experience, golden apples, what was wrong with coming back to life: node test/combat33.mjs
import { createSim } from '../sim.mjs';
const mk = () => createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const s = mk();
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; };
const cmd = (c) => call(() => fn.runCommand(c));
const M = (nm) => s.peek('M_' + nm.toUpperCase());
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
const arr = (k) => s.peek(k);
const at = (k, e) => arr(k)[e - 1], put = (k, e, v) => { arr(k)[e - 1] = v; };
const clearMobs = () => { const ET = arr('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0; };
const clearItems = () => { const L = arr('IID'); for (let i = 0; i < L.length; i++) L[i] = 0; };
const add = (t, x, y, z) => { call(() => fn.mobAdd(t, x, y, z)); return s.peek('lastMob'); };
const slot = (k, v, c = 1, d = 0) => { arr('INVI')[k - 1] = typeof v === 'string' ? id(v) : v; arr('INVN')[k - 1] = v === 0 ? 0 : c; arr('INVD')[k - 1] = d; };
const hold = (v, c = 1) => slot(s.peek('hotSel'), v, c);
const near = (a, b, e = 0.06) => Math.abs(a - b) <= e;
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
cmd('/gamerule doMobSpawning false');
cmd(`/fill ${X - 12} ${Y - 1} ${Z - 12} ${X + 12} ${Y - 1} ${Z + 12} stone`); cmd(`/fill ${X - 12} ${Y} ${Z - 12} ${X + 12} ${Y + 8} ${Z + 12} air`);
s.poke('flying', 0); stand(X, Y, Z); cmd('/clear'); s.poke('hotSel', 1); F(5);
s.poke('gameMode', 0); s.poke('difficulty', 2); s.poke('yaw', 0); s.poke('pitch', 0); F(3);

// ---- the weapons' numbers
const spd = (k) => call(() => fn.atkSpeed(k === 0 ? 0 : id(k)));
ok(spd('wooden_sword') === 1.6 && spd('wooden_axe') === 0.8 && spd('stone_axe') === 0.8 && spd('iron_axe') === 0.9 && spd('diamond_axe') === 1 && spd('abyss_axe') === 1 && spd('golden_axe') === 1,
  `speeds: sword ${spd('wooden_sword')}, axes ${['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => spd(t + '_axe')).join(' ')}`);
ok(spd('stone_pickaxe') === 1.2 && spd('iron_shovel') === 1 && spd('wooden_hoe') === 1 && spd('stone_hoe') === 2 && spd('iron_hoe') === 3 && spd('diamond_hoe') === 4 && spd('abyss_hoe') === 4 && spd('golden_hoe') === 1 && spd('trident') === 1.1 && spd(0) === 4 && spd('stick') === 4,
  `pickaxe ${spd('stone_pickaxe')}, shovel ${spd('iron_shovel')}, hoes ${['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => spd(t + '_hoe')).join(' ')}, trident ${spd('trident')}, hand ${spd(0)}`);
const DMG = arr('ITDMG'), dm = (k) => DMG[id(k)];
ok(['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => dm(t + '_axe')).join(' ') === '7 9 9 9 10 7', `an axe's blow: ${['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => dm(t + '_axe')).join(' ')}`);
ok(['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => dm(t + '_shovel')).join(' ') === '2.5 3.5 4.5 5.5 6.5 2.5', `a shovel's: ${['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => dm(t + '_shovel')).join(' ')}`);
ok(['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => dm(t + '_sword')).join(' ') === '4 5 6 7 8 4', `a sword's: ${['wooden', 'stone', 'iron', 'diamond', 'abyss', 'golden'].map(t => dm(t + '_sword')).join(' ')}`);

// ---- the charge
const zombie = (dx = 2, dz = 0) => { const e = add(M('zombie'), X + 0.5 + dx, Y, Z + 0.5 + dz); put('EHP', e, 500); put('EHURT', e, 0); put('EFIR', e, 0); return e; };
// a blow at mob e with what is left of the weapon's time `cool`: the hurt it did
const blow = (e, cool = 0, pre = () => { }) => {
  put('EHURT', e, 0); const h0 = at('EHP', e);
  s.poke('onGround', 1); s.poke('pvy', 0); s.poke('sprinting', 0); s.poke('inWater', 0); s.poke('inClimb', 0); s.poke('riding', 0);
  pre();
  s.poke('mobPick', e); s.poke('attackCool', cool); call(() => fn.attack());
  return Math.round((h0 - at('EHP', e)) * 100) / 100;
};
clearMobs(); hold('iron_sword');
let e = zombie();
let d = blow(e, 0);
ok(d === 6 && near(s.peek('attackCool'), 0.625, 0.001), `a full blow of the iron sword: ${d}; ready again in ${s.peek('attackCool')} s`);
ok(arr('INVD')[0] === 1, `the sword worn by 1: ${arr('INVD')[0]}`);
// at once again: the mob takes nothing for half a second, the sword is not worn
let h0 = at('EHP', e); s.poke('mobPick', e); call(() => fn.attack());
ok(at('EHP', e) === h0 && arr('INVD')[0] === 1, 'a blow within half a second of the last does nothing and wears nothing');
d = blow(e, 0.3125);
ok(near(d, 2.6, 0.11), `half charged (f 0.54): ${d} (0.2 + 0.54^2 x 0.8 of 6 = 2.6)`);
d = blow(e, 0.625);
ok(near(d, 1.2, 0.11), `not charged at all: ${d} (a fifth of 6, f 0.04)`);
ok(near(call(() => fn.atkCharge()), 0.04, 0.001), `the charge right after a blow: ${call(() => fn.atkCharge())}`);
// a critical hit: falling, charged; not when sprinting, not half charged, not in water, not on a ladder
d = blow(e, 0, () => { s.poke('onGround', 0); s.poke('pvy', -3); });
ok(d === 9, `falling and charged: ${d} (x 1.5)`);
d = blow(e, 0.2, () => { s.poke('onGround', 0); s.poke('pvy', -3); });
ok(d < 6, `falling but not ready (f 0.72): ${d}, no critical hit`);
d = blow(e, 0, () => { s.poke('onGround', 0); s.poke('pvy', -3); s.poke('inWater', 1); });
ok(d === 6, `falling in water: ${d}`);
d = blow(e, 0, () => { s.poke('onGround', 0); s.poke('pvy', -3); s.poke('inClimb', 1); });
ok(d === 6, `on a ladder: ${d}`);
d = blow(e, 0, () => { s.poke('onGround', 0); s.poke('pvy', -3); s.poke('sprinting', 1); });
ok(d === 6 && s.peek('sprinting') === 0, `falling while sprinting: ${d}, and the sprint is over`);
// knock: 6 a second, 11 from a sprint
blow(e, 0); const kb0 = Math.hypot(at('EVX', e), at('EVZ', e));
blow(e, 0, () => s.poke('sprinting', 1)); const kb1 = Math.hypot(at('EVX', e), at('EVZ', e));
ok(near(kb0, 6, 0.01) && near(kb1, 11, 0.01), `knocked away at ${kb0.toFixed(1)}, from a sprint ${kb1.toFixed(1)}`);
// the sweep: a ready sword on the ground hurts the one beside by 1; not when not ready, not from a sprint
clearMobs(); e = zombie(2, 0); let e2 = zombie(2, 1);
blow(e, 0); ok(at('EHP', e2) === 499, `the sweep: the one beside takes ${500 - at('EHP', e2)}`);
put('EHURT', e2, 0); put('EHP', e2, 500); put('EX', e2, at('EX', e)); put('EZ', e2, at('EZ', e) + 1);
blow(e, 0.3); ok(at('EHP', e2) === 500, 'no sweep when the blow is not ready');
put('EX', e2, at('EX', e)); put('EZ', e2, at('EZ', e) + 1);
blow(e, 0, () => s.poke('sprinting', 1)); ok(at('EHP', e2) === 500, 'no sweep from a sprint');
// the axe: 9, worn by 2; strength and weakness before the charge; a bare hand 1
clearMobs(); e = zombie(); hold('iron_axe');
d = blow(e, 0); ok(d === 9 && arr('INVD')[0] === 2, `the iron axe: ${d}, worn by ${arr('INVD')[0]}`);
ok(near(s.peek('attackCool'), 1 / 0.9, 0.001), `ready again in ${s.peek('attackCool').toFixed(3)} s`);
hold(0); d = blow(e, 0); ok(d === 1 && s.peek('attackCool') === 0.25, `a bare hand: ${d}, ready in ${s.peek('attackCool')} s`);
// the hand changed: the charge starts again
hold('iron_sword'); s.poke('attackCool', -5); F(1);
ok(near(s.peek('attackCool'), 0.625, 0.07), `another thing taken in hand: ${s.peek('attackCool').toFixed(3)} s to wait`);
F(45); ok(call(() => fn.atkCharge()) === 1, 'full again 0.75 s later');

// ---- the shield
clearMobs();
call(() => { const g = arr('CGI'), gn = arr('CGN'); s.poke('cgSize', 3); const p = id('oak_planks'), ir = id('iron_ingot'); [p, ir, p, p, p, p, 0, p, 0].forEach((v, i) => { g[i] = v; gn[i] = v ? 1 : 0; }); fn.craftMatch(); });
ok(s.peek('craftOut') === id('shield') && arr('ITDUR')[id('shield')] === 336, `six planks and an iron ingot: ${KEY[s.peek('craftOut')]}, ${arr('ITDUR')[id('shield')]} uses`);
call(() => { const g = arr('CGI'), gn = arr('CGN'); for (let i = 0; i < 9; i++) { g[i] = 0; gn[i] = 0; } s.poke('cgSize', 2); fn.craftMatch(); });
s.poke('$TESSVM', 1); s.poke('isTess', 1); s.poke('$M_LOCK', 1);
const rdown = () => { s.poke('$MOUSE_BUTTONS', 2); s.mouse.down = true; };
const rup = () => { s.poke('$MOUSE_BUTTONS', 0); s.mouse.down = false; };
stand(X, Y, Z); s.poke('yaw', 90); s.poke('pitch', 0); hold('shield'); slot(41, 0); F(2);
const lx = s.peek('lookX'), lz = s.peek('lookZ');
const front = (r = 1.5) => [X + 0.5 + lx * r, Z + 0.5 + lz * r], back = (r = 1.5) => [X + 0.5 - lx * r, Z + 0.5 - lz * r];
const mobAt = (t, [x, z]) => { const m = add(t, x, Y, z); put('EATK', m, 1); put('EST', m, 0); return m; };
const hit = (dmg) => { s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.hurtM(dmg, '시험')); return 20 - s.peek('hp'); };
rdown(); F(8);
ok(s.peek('shUp') === 0 && s.peek('shT') > 0, 'the shield is not up in the first quarter second');
F(12);
ok(s.peek('shUp') === 1 && s.peek('shHand') === 1, 'held: the shield is up');
s.poke('grMobs', 0);
e = mobAt(M('zombie'), front());
d = hit(5);
ok(d === 0 && arr('INVD')[0] === 6, `a blow of 5 from the front: hurt ${d}, the shield worn by ${arr('INVD')[0]} (5 + 1)`);
d = hit(2);
ok(d === 0 && arr('INVD')[0] === 6, `a blow of 2: stopped, not worn (${arr('INVD')[0]})`);
ok(s.peek('hurtT') <= 0, 'a stopped blow leaves no half second without hurt');
clearMobs(); e = mobAt(M('zombie'), back());
d = hit(5);
ok(d >= 4, `from behind: hurt ${d}`);
clearMobs();
// an arrow: from the front stopped, from behind not
const AVX = arr('AVX'), AVZ = arr('AVZ');
AVX[0] = -lx * 20; AVZ[0] = -lz * 20; s.poke('shotSrc', 1); d = hit(4); s.poke('shotSrc', 0);
ok(d === 0, `an arrow flying at the face: hurt ${d}`);
AVX[0] = lx * 20; AVZ[0] = lz * 20; s.poke('shotSrc', 1); d = hit(4); s.poke('shotSrc', 0);
ok(d >= 3, `an arrow in the back: hurt ${d}`);
// another player's blow (told by the server as a hurt with their name): stopped from the front
e = add(M('netPlayer'), front()[0], Y, front()[1]); s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.hurt(6, '가나 님에게 당했습니다'));
ok(s.peek('hp') === 20, `another player's blow from the front: hurt ${20 - s.peek('hp')}`);
put('EX', e, back()[0]); put('EZ', e, back()[1]); s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.hurt(6, '가나 님에게 당했습니다'));
ok(s.peek('hp') === 14, `from behind: hurt ${20 - s.peek('hp')}`);
clearMobs();
// a hurt that is no mob's (a fall) is not stopped
s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.hurtR(3, '높은 곳에서 떨어졌습니다')); ok(s.peek('hp') === 17, 'a fall is not stopped');
// let go: down at once
rup(); F(2); ok(s.peek('shUp') === 0, 'let go: down');
// the axe raider knocks it away for 5 s
rdown(); F(25); e = mobAt(M('axeRaider'), front());
d = hit(13);
ok(d === 0 && s.peek('shUp') === 0 && near(s.peek('shOff'), 5, 0.01), `the axe raider's blow is stopped and the shield knocked away for ${s.peek('shOff')} s`);
clearMobs(); F(30); ok(s.peek('shUp') === 0, 'still held, but it does not come up');
s.poke('shOff', 0.01); F(25); ok(s.peek('shUp') === 1, 'after the 5 s it comes up again');
rup(); F(2);
// in the other hand: up when the hand holds a sword, not when it holds a block
hold('iron_sword'); slot(41, 'shield'); rdown(); F(25);
ok(s.peek('shUp') === 1 && s.peek('shHand') === 41, 'a shield in the other hand comes up with a sword in the hand');
e = mobAt(M('zombie'), front()); d = hit(6);
ok(d === 0 && arr('INVD')[40] === 7 && arr('INVD')[0] === 0, `stopped, the other hand's shield worn by ${arr('INVD')[40]}`);
clearMobs(); rup(); F(2);
// walking with it up is slow
s.keys.add(87); rdown(); F(40); const v1 = Math.hypot(s.peek('pvx'), s.peek('pvz')); rup(); F(40); const v2 = Math.hypot(s.peek('pvx'), s.peek('pvz')); s.keys.delete(87); F(10);
ok(v1 < v2 * 0.35 && v1 > 0, `walking with the shield up ${v1.toFixed(2)}, without ${v2.toFixed(2)} blocks a second`);
stand(X, Y, Z); F(2);

// ---- the other hand
// F changes hands (where the buttons are told)
hold('iron_sword'); slot(41, 'torch', 5);
ok(s.peek('mbSeen') === 1, 'the buttons were told: F is the hands\' key');
s.keys.add(70); F(1); s.keys.delete(70); F(2);
ok(arr('INVI')[0] === id('torch') && arr('INVN')[0] === 5 && arr('INVI')[40] === id('iron_sword'), 'F: the two hands change');
s.keys.add(70); F(1); s.keys.delete(70); F(2);
ok(arr('INVI')[0] === id('iron_sword') && arr('INVI')[40] === id('torch'), 'F again: back');
// use with a sword in hand and torches in the other: a torch is put
cmd(`/setblock ${X} ${Y} ${Z + 2} stone`); s.poke('yaw', 0); s.poke('pitch', -20); F(3);
let pk = s.peek('pickOn'); if (!pk) { s.poke('pitch', 20); F(3); pk = s.peek('pickOn'); }
rdown(); F(1); rup(); F(2);
ok(pk === 1 && arr('INVN')[40] === 4, `a torch out of the other hand is put: ${arr('INVN')[40]} left (looking at a block: ${pk})`);
// a block in the hand: the hand's is put, not the other hand's
hold('cobblestone', 3); rdown(); F(1); rup(); F(2);
ok(arr('INVN')[40] === 4, `with a block in the hand the other hand is left alone: ${arr('INVN')[40]}`);
cmd(`/fill ${X - 3} ${Y} ${Z + 1} ${X + 3} ${Y + 3} ${Z + 3} air`);
// food out of the other hand
s.poke('pitch', 0); hold('iron_sword'); slot(41, 'bread', 3); s.poke('food', 10); F(2);
rdown(); F(110); rup(); F(2);
ok(s.peek('food') === 15 && arr('INVN')[40] === 2, `bread eaten out of the other hand: food ${s.peek('food')}, ${arr('INVN')[40]} left`);
// the totem in the other hand
hold('iron_sword'); slot(41, 'totem_of_undying'); s.poke('hp', 3); s.poke('hurtT', 0);
call(() => fn.hurtR(50, '시험'));
ok(s.peek('dead') === 0 && s.peek('hp') === 1 && arr('INVI')[40] === 0 && arr('INVI')[0] === id('iron_sword'), `the totem in the other hand saves: hp ${s.peek('hp')}`);
call(() => fn.effectsInit()); s.poke('hp', 20);
// the inventory screen's slot (89), Shift and a click on a shield
slot(41, 'shield'); call(() => fn.slotGet(89)); ok(s.peek('gI') === id('shield'), 'slot 89 is the other hand');
call(() => fn.slotSet(89, id('torch'), 7, 0)); ok(arr('INVI')[40] === id('torch') && arr('INVN')[40] === 7, 'and is written through it');
slot(41, 0); slot(12, 'shield'); s.poke('uiMode', 1); call(() => fn.quickMove(12)); s.poke('uiMode', 0);
ok(arr('INVI')[40] === id('shield') && arr('INVI')[11] === 0, 'Shift and a click: a shield goes to the empty other hand');
// kept on a server: the player's record
slot(41, 'torch', 9);
const pack = call(() => fn.netUserPack());
ok(pack.includes(`41.${id('torch')}.9.0`), 'the player\'s record on a server holds slot 41');
slot(41, 0); call(() => fn.netUserLoad(pack));
ok(arr('INVI')[40] === id('torch') && arr('INVN')[40] === 9, 'and gives it back');
s.poke('gameMode', 0); stand(X, Y, Z); s.poke('dim', 0); F(2);

// ---- orbs of experience
clearMobs(); clearItems(); cmd('/clear'); cmd('/xp set @s 0 levels'); s.poke('xpLevel', 0); s.poke('xpPts', 0);
const orb = id('experience_orb');
const orbs = () => { const I = arr('IID'), N = arr('INN'); let t = 0; I.forEach((v, i) => { if (v === orb) t += N[i]; }); return t; };
hold('iron_sword'); e = add(M('zombie'), X + 2.5, Y, Z + 0.5); put('EHP', e, 1); put('EHURT', e, 0);
const mxp = arr('MXP')[M('zombie') - 1];
s.poke('mobPick', e); s.poke('attackCool', 0); call(() => fn.attack());
ok(at('ET', e) === 0 && orbs() === mxp && s.peek('xpPts') === 0 && s.peek('xpLevel') === 0, `a zombie killed: an orb worth ${orbs()} (its ${mxp}) lies there, nothing yet in the bar`);
F(180);
ok(orbs() === 0 && s.peek('xpPts') + s.peek('xpLevel') * 7 >= mxp && !arr('INVI').includes(orb), `it flew in: level ${s.peek('xpLevel')}, ${s.peek('xpPts')} points, no orb in a slot`);
// from 6 blocks it comes; from 9 it stays
clearItems(); s.poke('xpLevel', 0); s.poke('xpPts', 0);
call(() => fn.orbDrop(3, X + 6.5, Y + 0.3, Z + 0.5)); F(180);
ok(orbs() === 0 && s.peek('xpPts') === 3, `an orb 6 blocks away came: ${s.peek('xpPts')} points`);
call(() => fn.orbDrop(3, X + 9.5, Y + 0.3, Z + 0.5)); F(180);
ok(orbs() === 3 && s.peek('xpPts') === 3, 'one 9 blocks away stays');
// two near each other are one; a hopper does not take it
call(() => fn.orbDrop(4, X + 9.6, Y + 0.3, Z + 0.6)); F(90);
ok(arr('IID').filter(v => v === orb).length === 1 && orbs() === 7, `two orbs lying together are one worth ${orbs()}`);
clearItems();
cmd(`/setblock ${X + 9} ${Y} ${Z + 4} hopper`); call(() => fn.orbDrop(5, X + 9.5, Y + 1.2, Z + 4.5)); call(() => fn.dropItem(id('stone'), 2, 0, X + 9.5, Y + 1.2, Z + 4.5, 0)); F(300);
ok(orbs() === 5 && !arr('IID').includes(id('stone')), `a hopper takes the stone, not the orb (${orbs()})`);
cmd(`/setblock ${X + 9} ${Y} ${Z + 4} air`); clearItems();
// an ore dug: the experience as an orb
cmd(`/setblock ${X + 3} ${Y} ${Z} diamond_ore`); hold('iron_pickaxe');
{ const ore = B(X + 3, Y, Z); call(() => fn.blockDrops(ore, X + 3, Y, Z)); }
ok(orbs() >= 3 && orbs() <= 7, `diamond ore dug: an orb worth ${orbs()} (3 to 7)`);
cmd(`/setblock ${X + 3} ${Y} ${Z} air`); clearItems();
// a furnace keeps what its smelting was worth for the one who takes the thing out
call(() => { fn.furXpAdd(1, id('iron_ingot')); fn.furXpAdd(1, id('iron_ingot')); fn.furXpAdd(1, id('gold_ingot')); fn.furXpAdd(1, id('glass')); });
ok(near(arr('FUXP')[0], 2.5, 0.001), `two iron ingots, a gold one and a glass smelted: ${arr('FUXP')[0]} kept in the furnace`);
call(() => fn.furXpTake(1, X + 9.5, Y + 0.3, Z + 0.5));
ok((orbs() === 2 || orbs() === 3) && arr('FUXP')[0] === 0, `taken out: an orb worth ${orbs()} (2, or 3 half the times)`);
clearItems();
// death: 7 a level, 100 at most, the other hand's thing dropped too; keepInventory: nothing
const die = (lv) => { clearItems(); s.poke('dead', 0); s.poke('hp', 20); s.poke('uiMode', 0); s.poke('xpLevel', lv); s.poke('xpPts', 2); slot(41, 'torch', 4); call(() => fn.die('시험')); };
die(5); ok(orbs() === 35 && s.peek('xpLevel') === 0 && arr('INVI')[40] === 0 && arr('IID').includes(id('torch')), `dead at level 5: orbs worth ${orbs()}, the other hand's torches on the ground`);
die(30); ok(orbs() === 100, `at level 30: ${orbs()}`);
cmd('/gamerule keepInventory true'); die(5); ok(orbs() === 0 && s.peek('xpLevel') === 5 && arr('INVI')[40] === id('torch'), 'keepInventory: nothing dropped, the level kept');
cmd('/gamerule keepInventory false');
// (a death lets the pointer go: taken again, or the game menu opens)
s.poke('dead', 0); s.poke('hp', 20); s.poke('uiMode', 0); s.poke('$M_LOCK', 1); s.poke('wasLocked', 1); s.poke('xpLevel', 0); s.poke('xpPts', 0); clearItems(); slot(41, 0); stand(X, Y, Z); F(3);
ok(s.peek('uiMode') === 0, 'alive and playing again');

// ---- golden apples, the new effects
const EFT = () => arr('EFT'), EFL = () => arr('EFL');
call(() => fn.effectsInit()); hold('golden_apple', 2); call(() => fn.eat(id('golden_apple')));
ok(s.peek('absorb') === 4 && EFT()[12] === 120 && EFT()[4] === 5 && EFL()[4] === 2 && EFT()[5] === 0 && arr('INVN')[0] === 1, `a golden apple: ${s.peek('absorb')} points of absorption for ${EFT()[12]} s, regeneration ${EFL()[4]} for ${EFT()[4]} s, no resistance`);
s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.hurtR(3, '시험')); ok(s.peek('hp') === 20 && s.peek('absorb') === 1, 'the gold hearts take the hurt first');
call(() => fn.effectsInit()); hold('enchanted_golden_apple', 1); call(() => fn.eat(id('enchanted_golden_apple')));
ok(s.peek('absorb') === 16 && EFT()[4] === 20 && EFL()[4] === 2 && EFT()[6] === 300 && EFT()[5] === 300 && arr('INVI')[0] === 0, `the found one: absorption ${s.peek('absorb')}, regeneration II ${EFT()[4]} s, fire resistance ${EFT()[6]} s, resistance ${EFT()[5]} s`);
call(() => fn.effectsInit());
ok(EFT().length === 27 && call(() => fn.effectByName('invisibility')) === 27 && call(() => fn.effectByName('instant_health')) === 23 && call(() => fn.effectByName('instant_damage')) === 24 && call(() => fn.effectByName('blindness')) === 25 && call(() => fn.effectByName('nausea')) === 26 && call(() => fn.effectByName('absorption')) === 13, '27 effects, the new ones known by name');
s.poke('hp', 5); cmd('/effect give @s instant_health 1 1'); const hpA = s.peek('hp');
s.poke('hp', 5); call(() => fn.effectAdd(23, 1, 2)); const hpB = s.peek('hp');
s.poke('hp', 20); s.poke('hurtT', 0); call(() => fn.effectAdd(24, 1, 1)); const hpC = s.peek('hp');
ok(hpB === 13 && hpC === 14 && EFT()[22] === 0 && EFT()[23] === 0, `instant health II: 5 -> ${hpB}; instant damage I: 20 -> ${hpC}; neither is kept (by the command, level 1 or 2: 5 -> ${hpA})`);
s.poke('hp', 20); cmd('/effect give @s blindness 5'); cmd('/effect give @s nausea 5'); F(5);
ok(EFT()[24] > 0 && EFT()[25] > 0 && Math.abs(s.peek('camYaw') - s.peek('yaw')) > 0.01, `blindness and nausea run and are drawn (the view sways): ${EFT()[24]} ${EFT()[25]} ${s.peek('camYaw')} ${s.peek('yaw')}`);
s.keys.add(87); s.keys.add(82); F(10); const spB = s.peek('sprinting'); call(() => fn.effectsInit()); F(10); const spA = s.peek('sprinting'); s.keys.delete(87); s.keys.delete(82); F(5);
ok(spB === 0 && spA === 1, `no sprinting while blind (${spB}), after it ${spA}`);
stand(X, Y, Z); F(2);

// ---- what was wrong
// the void pearl: 5
s.poke('hp', 20); s.poke('hurtT', 0); arr('AON')[2] = 9; arr('AXX')[2] = X + 0.5; arr('AYY')[2] = Y + 0.1; arr('AZZ')[2] = Z + 0.5; call(() => fn.thrownHit(3));
ok(s.peek('hp') === 15, `a void pearl's landing: hurt ${20 - s.peek('hp')}`);
s.poke('hp', 20); clearMobs();
// Ctrl+Q: the whole stack
clearItems(); hold('cobblestone', 10); s.keys.add(17); s.keys.add(81); F(1); s.keys.delete(81); s.keys.delete(17); F(1);
ok(arr('INVI')[0] === 0 && arr('IID').includes(id('cobblestone')), 'Ctrl+Q throws the whole stack');
clearItems();
// pick block in survival: out of the inventory, changing places
cmd('/clear'); hold('iron_sword'); slot(20, 'gold_block', 7);
cmd(`/setblock ${X} ${Y} ${Z + 2} gold_block`); s.poke('yaw', 0); s.poke('pitch', -20); F(3); if (!s.peek('pickOn')) { s.poke('pitch', 20); F(3); }
call(() => fn.pickCopy());
ok(s.peek('gameMode') === 0 && s.peek('pickOn') === 1 && arr('INVI')[s.peek('hotSel') - 1] === id('gold_block') && arr('INVN')[s.peek('hotSel') - 1] === 7 && arr('INVI').includes(id('iron_sword')) && arr('INVI')[19] !== id('gold_block'), `pick block in survival: the 7 gold blocks come to the hand (slot ${s.peek('hotSel')})`);
cmd('/clear'); hold('iron_sword'); call(() => fn.pickCopy());
ok(!arr('INVI').includes(id('gold_block')), 'not in the inventory: nothing comes');
cmd(`/setblock ${X} ${Y} ${Z + 2} air`); s.poke('pitch', 0);
// the abyss armour holds against a knock: a tenth a piece
for (let p = 0; p < 4; p++) slot(37 + p, ['abyss_helmet', 'abyss_chestplate', 'abyss_leggings', 'abyss_boots'][p]);
call(() => fn.kbKeep()); const k4 = s.peek('kbK'); slot(37, 'iron_helmet'); call(() => fn.kbKeep()); const k3 = s.peek('kbK');
for (let p = 0; p < 4; p++) slot(37 + p, 0); call(() => fn.kbKeep());
ok(near(k4, 0.6, 0.001) && near(k3, 0.7, 0.001) && s.peek('kbK') === 1, `a knock on the wearer of four abyss pieces: ${k4.toFixed(2)} of it, of three ${k3.toFixed(2)}, of none ${s.peek('kbK')}`);
// armour lasts by its piece
const DUR = arr('ITDUR'), du = (k) => DUR[id(k)];
ok(du('leather_helmet') === 55 && du('iron_chestplate') === 240 && du('diamond_boots') === 429 && du('abyss_leggings') === 555 && du('golden_helmet') === 77 && du('chain_boots') === 195 && du('iron_leggings') === 225,
  `armour's uses: leather helmet ${du('leather_helmet')}, iron chest ${du('iron_chestplate')}, diamond boots ${du('diamond_boots')}, abyss legs ${du('abyss_leggings')}, gold helmet ${du('golden_helmet')}, chain boots ${du('chain_boots')}`);
// the bed: a night is slept through in 5 s; Shift wakes
cmd(`/setblock ${X + 4} ${Y} ${Z + 4} red_bed`); cmd('/time set 18000'); stand(X + 3, Y, Z + 4); F(10);
const day0 = s.peek('dayN'), td0 = s.peek('tday');
call(() => fn.bedUse(X + 4, Y, Z + 4, B(X + 4, Y, Z + 4)));
ok(s.peek('sleepT') === 5 && s.peek('dayN') === day0, `in bed at night (dark ${s.peek('dark')}): asleep, not yet morning`);
s.keys.add(87); F(120); s.keys.delete(87);
ok(s.peek('sleepT') > 2.9 && s.peek('dayN') === day0 && Math.abs(s.peek('px') - (X + 3.5)) < 0.01, `2 s later still asleep and lying still (W held): ${s.peek('sleepT').toFixed(2)} s left`);
F(200);
ok(s.peek('sleepT') === 0 && s.peek('dayN') === day0 + 1 && s.peek('tday') < 0.05, `after 5 s it is morning: day ${s.peek('dayN')}, time ${s.peek('tday').toFixed(3)}`);
cmd('/time set 18000'); F(10); call(() => fn.bedUse(X + 4, Y, Z + 4, B(X + 4, Y, Z + 4))); F(30); s.keys.add(16); F(2); s.keys.delete(16); F(2);
ok(s.peek('sleepT') === 0 && s.peek('dayN') === day0 + 1 && s.peek('tday') > 0.5, 'Shift: awake, the night goes on');
stand(X, Y, Z); F(2);
// back at it while it stands; gone, the place is forgotten and one is told
cmd('/time set 6000');
ok(s.peek('spawnSet') === 2 && s.peek('spawnX') === X + 4.5, 'a bed used: the place to come back to (2: a bed)');
stand(X, Y, Z); s.poke('hp', 20); call(() => fn.die('시험')); call(() => fn.respawn()); F(5);
ok(s.peek('dead') === 0 && s.peek('spawnSet') === 2 && Math.abs(s.peek('px') - (X + 4.5)) < 0.01 && s.peek('spChk') === 0, 'dead and back at the bed, which is still there');
// an anchor's charge goes with each coming back (looked at in this world for the test's sake)
cmd(`/setblock ${X - 4} ${Y} ${Z + 4} respawn_anchor`); call(() => fn.pvSet(3, X - 4, Y, Z + 4, 2));
s.poke('spawnX', X - 3.5); s.poke('spawnY', Y + 1); s.poke('spawnZ', Z + 4.5); s.poke('spawnDim', 0); s.poke('spawnSet', 3);
call(() => fn.die('시험')); call(() => fn.respawn()); F(5);
ok(call(() => fn.pvGet(3, X - 4, Y, Z + 4)) === 1 && s.peek('spawnSet') === 3, `back at the anchor: its charge 2 -> ${call(() => fn.pvGet(3, X - 4, Y, Z + 4))}`);
// the bed broken
s.poke('spawnX', X + 4.5); s.poke('spawnY', Y + 1); s.poke('spawnZ', Z + 4.5); s.poke('spawnSet', 2);
cmd(`/setblock ${X + 4} ${Y} ${Z + 4} air`); cmd(`/fill ${X + 3} ${Y} ${Z + 3} ${X + 5} ${Y} ${Z + 5} air`);
call(() => fn.die('시험')); call(() => fn.respawn()); F(3);
ok(s.peek('spawnSet') === 0 && s.peek('msgText').includes('침대'), `the bed is gone: the place forgotten, told "${s.peek('msgText')}"`);
n = 0; while ((s.peek('gState') !== 2 || s.peek('travelKind') !== 0 && n < 5) && n < 6000) { F(1); n++; }
F(30);
ok(s.peek('dead') === 0 && s.peek('dim') === 0 && s.peek('spawnSet') === 0 && Math.hypot(s.peek('px') - 8.5, s.peek('pz') - 8.5) < 40, `and one stands where the world begins: ${s.peek('px').toFixed(1)} ${s.peek('py').toFixed(1)} ${s.peek('pz').toFixed(1)} (after ${n} frames)`);

// ---- kept in a save: the other hand, and a save of before (40 slots) is made 41
slot(41, 'shield', 1, 17); slot(3, 'golden_apple', 2);
s.poke('AT_확장프로그램', 1); s.poke('worldCur', 1); s.poke('worldName', '시험 세계');
call(() => fn.saveGame(1));
const save = s.peek('AT_세계1').slice();
const t = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
const FT = (k = 1) => { for (let i = 0; i < k; i++) t.frame(); };
FT(30); t.poke('AT_세계1', save); t.poke('AT_확장프로그램', 1);
t.as('pen', () => t.fn.loadGame(1));
n = 0; while (t.peek('gState') !== 2 && n < 6000) { FT(); n++; }
FT(10);
ok(t.peek('INVI').length === 41 && t.peek('INVI')[40] === id('shield') && t.peek('INVD')[40] === 17 && t.peek('INVI')[2] === id('golden_apple'), `a save and a load: the other hand's shield (worn ${t.peek('INVD')[40]}) is back, ${t.peek('INVI').length} slots`);
// a save of before: its three lists are 40 long
const iAt = save.findIndex((v, i) => v === 41 && save[i + 42] === 41 && save[i + 84] === 41);
const old = save.slice(); if (iAt >= 0) { for (let k = 2; k >= 0; k--) { old.splice(iAt + k * 42 + 41, 1); old[iAt + k * 42] = 40; } }
const u = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
const FU = (k = 1) => { for (let i = 0; i < k; i++) u.frame(); };
FU(30); u.poke('AT_세계1', old); u.poke('AT_확장프로그램', 1);
u.as('pen', () => u.fn.loadGame(1));
n = 0; while (u.peek('gState') !== 2 && n < 6000) { FU(); n++; }
FU(10);
ok(iAt >= 0 && u.peek('INVI').length === 41 && u.peek('INVI')[40] === 0 && u.peek('INVI')[2] === id('golden_apple') && u.peek('EFT').length === 27, `a save with 40 slots (found at ${iAt}): loaded, ${u.peek('INVI').length} slots, the other hand empty`);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

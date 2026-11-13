// (v2.9) enchanting, the anvil, the grindstone, the charms at work, the beacon, the totem: node test/v29b.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; };
const cmd = (c) => { call(() => fn.chatRun(c)); return String(s.peek('CHT').slice(-1)[0]); };
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
call(() => fn.runCommand(`/fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y - 1} ${Z + 8} stone`)); call(() => fn.runCommand(`/fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 8} ${Z + 8} air`));
stand(X, Y, Z); F(5);
const I = () => s.peek('INVI'), N = () => s.peek('INVN'), D = () => s.peek('INVD');
const hs = () => s.peek('hotSel') - 1;
const hold = (k, d = 0) => { I()[hs()] = id(k); N()[hs()] = 1; D()[hs()] = d; };
const EK = s.peek('ENKEY');
const lv = (k) => call(() => fn.enLv(I()[hs()], D()[hs()], EK.indexOf(k) + 1));
const desc = (i = I()[hs()], d = D()[hs()]) => { call(() => fn.enDesc(i, d)); return s.peek('enS'); };
const dmgOf = (d) => call(() => fn.dmgOf(d));
s.poke('gameMode', 0);
// /enchant
hold('diamond_sword');
let r = cmd('/enchant @s sharpness 5'); ok(lv('sharpness') === 5, r);
r = cmd('/enchant @s smite 3'); ok(lv('smite') === 0 && r.includes('함께'), 'smite with sharpness refused: ' + r);
for (const c of ['unbreaking 3', 'looting 3', 'fire_aspect 2', 'knockback 2', 'sweeping 3', 'mending 1']) cmd('/enchant @s ' + c);
ok(desc().split(',').length === 7, 'seven charms on one sword: ' + desc());
r = cmd('/enchant @s efficiency 1'); ok(r.includes('걸 수 없'), 'efficiency not on a sword: ' + r);
D()[hs()] = D()[hs()] + 100; ok(lv('sharpness') === 5 && dmgOf(D()[hs()]) === 100, 'damage kept apart from the charms');
// sharpness: 8 + 3 = 11
const mob = (t, x, z) => { call(() => fn.mobAdd(s.peek(t), X + x + 0.5, Y, Z + z + 0.5)); return s.peek('lastMob'); };
const hit = (e) => { s.poke('mobPick', e); s.poke('attackCool', 0); s.peek('EHURT')[e - 1] = 0; call(() => fn.attack()); };
let z1 = mob('M_GOLEM', 2, 0); let hp0 = s.peek('EHP')[z1 - 1]; s.poke('onGround', 0); s.poke('pvy', 1); hit(z1); let dh = hp0 - s.peek('EHP')[z1 - 1];
ok(dh === 10, `diamond sword with sharpness V: ${dh} (7 + 3)`);
ok(s.peek('EFIR')[z1 - 1] > 7, 'fire aspect II sets it burning ' + s.peek('EFIR')[z1 - 1]);
s.peek('ET')[z1 - 1] = 0;
// unbreaking III: about a quarter of the wear
hold('iron_pickaxe'); cmd('/enchant @s unbreaking 3');
for (let k = 0; k < 200; k++) call(() => fn.wearHeld(1));
const w = dmgOf(D()[hs()]); ok(w > 25 && w < 80, `unbreaking III: 200 wear became ${w}`);
// efficiency
hold('iron_pickaxe'); const t0 = call(() => fn.breakTime(1)); cmd('/enchant @s efficiency 5'); const t1 = call(() => fn.breakTime(1));
ok(t1 < t0 / 3, `efficiency V: ${t0.toFixed(3)} s -> ${t1.toFixed(3)} s`);
// silk touch and fortune
const lying = (k) => { let c = 0; const ii = s.peek('IID'), nn = s.peek('INN'); ii.forEach((v, j) => { if (v === id(k)) c += nn[j]; }); return c; };
const clearItems = () => { const ii = s.peek('IID'); for (let j = 0; j < ii.length; j++) ii[j] = 0; };
const brk = (b) => { call(() => fn.runCommand(`/setblock ${X + 1} ${Y} ${Z} ${b}`)); call(() => fn.breakTime(call(() => fn.blockAt(X + 1, Y, Z)))); call(() => fn.breakBlock(X + 1, Y, Z, 1)); };
hold('diamond_pickaxe'); cmd('/enchant @s silk_touch 1'); clearItems();
brk('stone'); ok(lying('stone') === 1 && lying('cobblestone') === 0, 'silk touch: stone gives stone');
brk('glass'); ok(lying('glass') === 1, 'silk touch: glass gives glass');
hold('diamond_pickaxe'); cmd('/enchant @s fortune 3'); clearItems();
for (let k = 0; k < 40; k++) brk('diamond_ore');
const tot = lying('diamond'); ok(tot > 55 && tot < 140, `fortune III: 40 diamond ores gave ${tot}`);
clearItems();
// protection
const armor = (prot) => {
  const ii = I(), dd = D(), nn = N();
  ['diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots'].forEach((k, j) => {
    ii[36 + j] = id(k); nn[36 + j] = 1; dd[36 + j] = 0;
    if (prot) { hold(k); cmd('/enchant @s protection 4'); if (j === 3) cmd('/enchant @s feather_falling 4'); dd[36 + j] = D()[hs()]; }
  });
  I()[hs()] = 0;
};
const lose = (dmg, why, raw) => { let t = 0; for (let k = 0; k < 40; k++) { s.poke('hp', 20); s.poke('hurtT', 0); s.poke('absorb', 0); if (raw) call(() => fn.hurtR(dmg, why)); else call(() => fn.hurt(dmg, why)); t += 20 - s.peek('hp'); } return t / 40; };
armor(0); const a0 = lose(10, '좀비에게 당했습니다'), f0 = lose(10, '높은 곳에서 떨어졌습니다', 1);
armor(1); const a1 = lose(10, '좀비에게 당했습니다'), f1 = lose(10, '높은 곳에서 떨어졌습니다', 1);
ok(a1 < a0 * 0.5, `protection IV x4: a hit of 10 took ${a0.toFixed(2)} -> ${a1.toFixed(2)}`);
ok(f1 < 3, `feather falling IV + protection: a fall of 10 took ${f0.toFixed(2)} -> ${f1.toFixed(2)}`);
for (let j = 36; j < 40; j++) I()[j] = 0;
// mending drinks experience
hold('iron_sword'); cmd('/enchant @s mending 1'); D()[hs()] += 50; s.poke('xpPts', 0); s.poke('xpLevel', 0);
call(() => fn.xpAdd(10)); ok(dmgOf(D()[hs()]) === 30 && s.peek('xpPts') === 0, `mending: 10 experience mended 20 (${dmgOf(D()[hs()])} left)`);
// binding: the helmet does not come off
hold('iron_helmet'); cmd('/enchant @s binding_curse 1'); I()[36] = I()[hs()]; D()[36] = D()[hs()]; N()[36] = 1; I()[hs()] = 0;
s.poke('curI', 0); call(() => fn.slotClick(37, 0)); ok(I()[36] === id('iron_helmet') && s.peek('curI') === 0, 'binding: the helmet stays on');
I()[36] = 0;
// the enchanting table
s.poke('xpLevel', 30);
call(() => fn.runCommand(`/setblock ${X + 3} ${Y} ${Z} enchanting_table`));
for (const [dx, dz] of [[-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2], [2, -2], [2, -1], [2, 0]]) { call(() => fn.runCommand(`/setblock ${X + 3 + dx} ${Y} ${Z + dz} bookshelf`)); call(() => fn.runCommand(`/setblock ${X + 3 + dx} ${Y + 1} ${Z + dz} bookshelf`)); }
call(() => fn.enchOpen(X + 3, Y, Z)); ok(s.peek('uiMode') === 11, 'the table opens its screen');
ok(call(() => fn.enShelves()) === 15, 'bookshelves counted (15 at most): ' + call(() => fn.enShelves()));
s.poke('ENI', id('diamond_pickaxe')); s.poke('ENN', 1); s.poke('END', 0); s.poke('ELI', 119); s.poke('ELN', 3);
call(() => fn.enOffers()); const c3 = s.peek('ENC3');
ok(s.peek('ENC1') > 0 && c3 >= 15 && c3 <= 30, `the offers: ${s.peek('ENC1')} ${s.peek('ENC2')} ${c3}`);
call(() => fn.enTake(3));
ok(call(() => fn.enHas(s.peek('ENI'), s.peek('END'))) === 1 && s.peek('xpLevel') === 27 && s.peek('ELN') === 0, `enchanted for 3 levels and 3 lapis: ${desc(s.peek('ENI'), s.peek('END'))}`);
s.poke('ENI', id('book')); s.poke('END', 0); s.poke('ELI', 119); s.poke('ELN', 3); call(() => fn.enOffers()); call(() => fn.enTake(2));
ok(s.peek('ENI') === id('enchanted_book') && s.peek('END') > 0, 'a book becomes an enchanted book: ' + desc(s.peek('ENI'), s.peek('END')));
call(() => fn.uiClose());
// the anvil
const code = (k, enc) => { hold(k); for (const c of enc) cmd('/enchant @s ' + c); const d = D()[hs()]; I()[hs()] = 0; return d; };
const sw4 = code('diamond_sword', ['sharpness 4']), bk4 = code('book', ['sharpness 4']), bks = code('book', ['smite 5']), bku = code('book', ['unbreaking 3']);
call(() => fn.runCommand(`/setblock ${X - 3} ${Y} ${Z} anvil`)); call(() => fn.anvilOpen(X - 3, Y, Z));
s.poke('xpLevel', 30);
call(() => fn.slotSet(59, id('diamond_sword'), 1, sw4)); call(() => fn.slotSet(60, id('enchanted_book'), 1, bk4));
ok(s.peek('anOut') === id('diamond_sword') && call(() => fn.enLv(id('diamond_sword'), s.peek('anOutD'), 1)) === 5, `sword IV + book IV = V for ${s.peek('anCost')} levels`);
call(() => fn.slotSet(60, id('enchanted_book'), 1, bks)); ok(s.peek('anOut') === 0, 'smite does not go on sharpness: ' + s.peek('anWhy'));
call(() => fn.slotSet(59, id('diamond_sword'), 1, sw4 + 1000)); call(() => fn.slotSet(60, id('diamond'), 5, 0));
ok(s.peek('anOut') > 0 && dmgOf(s.peek('anOutD')) === 0 && s.peek('anUse') === 3 && call(() => fn.enLv(id('diamond_sword'), s.peek('anOutD'), 1)) === 4, `mended by 3 diamonds, the charm kept (cost ${s.peek('anCost')})`);
s.poke('curI', 0); call(() => fn.slotClick(88, 0));
ok(s.peek('curI') === id('diamond_sword') && s.peek('AN2N') === 2 && s.peek('AN1I') === 0, 'taken: the sword on the cursor, 2 diamonds left');
s.poke('curI', 0); call(() => fn.uiClose());
call(() => fn.anvilOpen(X - 3, Y, Z)); call(() => fn.slotSet(59, id('enchanted_book'), 1, bk4)); call(() => fn.slotSet(60, id('enchanted_book'), 1, bks));
ok(s.peek('anOut') === 0, 'two books of charms that exclude each other: nothing');
call(() => fn.slotSet(60, id('enchanted_book'), 1, bku));
ok(s.peek('anOut') === id('enchanted_book') && desc(s.peek('anOut'), s.peek('anOutD')).split(',').length === 2, 'two books joined: ' + desc(s.peek('anOut'), s.peek('anOutD')));
call(() => fn.uiClose());
// the grindstone takes them off
hold('diamond_sword', sw4); s.poke('xpPts', 0); s.poke('xpLevel', 0); call(() => fn.grindHeld()); ok(call(() => fn.enHas(I()[hs()], D()[hs()])) === 0 && s.peek('xpPts') > 0, 'the grindstone took the charm, some experience back');
// the bow: power, infinity
hold('bow'); cmd('/enchant @s power 5'); cmd('/enchant @s infinity 1'); const ar = 20; I()[ar] = id('arrow'); N()[ar] = 3;
s.poke('bowCool', 0); call(() => fn.shootBow()); ok(N()[ar] === 3, 'infinity: the arrow stays');
ok(s.peek('AEN').some(v => v === 5001), 'the arrow carries power V and infinity');
I()[ar] = 0;
// the totem
s.poke('gameMode', 0); hold('totem_of_undying'); s.poke('hp', 5); s.poke('hurtT', 0); call(() => fn.hurtR(30, '높은 곳에서 떨어졌습니다'));
ok(s.peek('dead') === 0 && s.peek('hp') === 1 && I()[hs()] === 0, 'the totem: alive with half a heart, the totem used');
const EFT = s.peek('EFT'); ok(EFT[4] > 40 && EFT[12] > 4 && EFT[6] > 30 && s.peek('absorb') === 8, `regeneration ${EFT[4]}, absorption ${EFT[12]} (absorb ${s.peek('absorb')}), fire resistance ${EFT[6]}`);
s.poke('hurtT', 0); call(() => fn.hurt(3, '좀비에게 당했습니다')); ok(s.peek('hp') === 1 && s.peek('absorb') < 8, 'absorption took the hurt first: absorb ' + s.peek('absorb'));
// vanishing: gone at death
s.poke('hp', 20); call(() => fn.effectsInit()); clearItems(); for (let j = 0; j < 40; j++) I()[j] = 0;
hold('iron_sword'); cmd('/enchant @s vanishing_curse 1'); I()[5] = id('stone'); N()[5] = 3; s.poke('hurtT', 0); call(() => fn.hurtR(99, '물에 빠졌습니다'));
ok(s.peek('dead') === 1 && lying('iron_sword') === 0 && lying('stone') === 3, 'vanishing: the sword gone, the stone dropped');
call(() => fn.respawn()); s.poke('uiMode', 0); stand(X, Y, Z); clearItems();
// the beacon
call(() => fn.runCommand(`/fill ${X + 4} ${Y - 1} ${Z + 4} ${X + 6} ${Y - 1} ${Z + 6} iron_block`)); call(() => fn.runCommand(`/setblock ${X + 5} ${Y} ${Z + 5} beacon`));
ok(call(() => fn.beaconLevel(X + 5, Y, Z + 5)) === 1 && call(() => fn.beaconSky(X + 5, Y, Z + 5)) === 1, 'a pyramid of 1 level under the sky');
s.poke('gameMode', 1); call(() => fn.beaconOpen(X + 5, Y, Z + 5, id('beacon'))); ok(s.peek('uiMode') === 13, 'its screen');
s.poke('bnSel', 1); s.poke('clickLatch', 1); call(() => fn.beaconInput()); s.poke('bnSel', 20); s.poke('clickLatch', 1); call(() => fn.beaconInput());
ok(KEY[call(() => fn.blockAt(X + 5, Y, Z + 5))] === 'beacon_1', 'speed chosen: kept in the block ' + KEY[call(() => fn.blockAt(X + 5, Y, Z + 5))]);
s.poke('gameMode', 0); call(() => fn.effectsInit()); F(400);
ok(s.peek('EFT')[0] > 0 && s.peek('EFL')[0] === 1, 'speed I given near it: ' + s.peek('EFT')[0]);
ok(s.peek('BCL')[0] === 1, 'its beam drawn (level ' + s.peek('BCL')[0] + ')');
call(() => fn.runCommand(`/setblock ${X + 5} ${Y + 3} ${Z + 5} stone`)); s.poke('bcT', 0); F(2); ok(s.peek('BCL')[0] === 0, 'a block over it: no beam, no power');
console.log(fails ? fails + ' FAILED' : 'all ok');

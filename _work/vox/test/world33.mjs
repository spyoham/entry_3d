// (v3.3) the world's rules: mobs drown, mobs ride, carts with a chest or a hopper, the ash-folk and
// their gold, game rules read, the dead at the door, the wanderer's block, gates, the warden's fight
// usage: node test/world33.mjs [part]   (parts: air ride cart ash rules tricks gate warden; none = all)
import { createSim } from '../sim.mjs';
const only = process.argv[2] || '';
const part = (p) => only === '' || only === p;
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
const wait = (sec) => F(Math.ceil(sec * 60) + 1);
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; };
const cmd = (c) => call(() => fn.runCommand(c));
const M = (n) => { const v = s.peek('M_' + n.toUpperCase()); if (!(v > 0)) throw new Error('no mob ' + n); return v; };
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 90;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('fallTop', y); };
const arr = (k) => s.peek(k);
const at = (k, e) => arr(k)[e - 1], put = (k, e, v) => { arr(k)[e - 1] = v; };
const clearMobs = () => { const ET = arr('ET'); for (let i = 0; i < ET.length; i++) ET[i] = 0; const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; };
const add = (t, x, y, z) => { call(() => fn.mobAdd(t, x, y, z)); const e = s.peek('lastMob'); put('EST', e, 0); return e; };
const hold = (k, n = 1) => { const hs = s.peek('hotSel'); arr('INVI')[hs - 1] = typeof k === 'string' ? id(k) : k; arr('INVN')[hs - 1] = n; arr('INVD')[hs - 1] = 0; };
const items = (k) => { const II = arr('IID'), NN = arr('INN'); let c = 0; for (let i = 0; i < II.length; i++) if (II[i] === k) c += NN[i]; return c; };
const heal = () => { s.poke('hp', 20); s.poke('dead', 0); };
const floor = () => { cmd(`/fill ${X - 14} ${Y - 1} ${Z - 14} ${X + 14} ${Y + 9} ${Z + 14} air`); cmd(`/fill ${X - 14} ${Y - 1} ${Z - 14} ${X + 14} ${Y - 1} ${Z + 14} stone`); call(() => fn.worldFlush()); };
const store = (e) => { call(() => fn.cartStoreOf(e)); return s.peek('cFound'); };
const slots = (c) => { const CHI = arr('CHI'), CHN = arr('CHN'); const o = {}; for (let k = 0; k < 27; k++) { const i = (c - 1) * 27 + k; if (CHI[i] > 0) o[CHI[i]] = (o[CHI[i]] || 0) + CHN[i]; } return o; };
cmd('/gamerule doMobSpawning false'); cmd('/gamerule doDaylightCycle false'); cmd('/time set 6000');
s.poke('gameMode', 1); s.poke('flying', 0); s.poke('difficulty', 2);
floor(); stand(X, Y, Z); F(5);
ok(s.peek('NMOBT') === 76 && M('chestCart') === 75 && M('hopperCart') === 76, 'two kinds more at the end: ' + s.peek('NMOBT'));
ok(KEY[175] === 'warden_egg' && id('chest_minecart') > 2151 && id('hopper_minecart') > 2151, `the egg is block 175, the carts items ${id('chest_minecart')} ${id('hopper_minecart')}`);

// ------------------------------------------------------------------ air
if (part('air')) {
  clearMobs(); floor();
  // a pool four deep under a roof: nothing in it gets its head out
  cmd(`/fill ${X + 4} ${Y} ${Z - 3} ${X + 10} ${Y + 4} ${Z + 3} stone`); cmd(`/fill ${X + 5} ${Y} ${Z - 2} ${X + 9} ${Y + 3} ${Z + 2} water`); call(() => fn.worldFlush());
  const cow = add(M('cow'), X + 6.5, Y + 1, Z + 0.5), skel = add(M('skeleton'), X + 8.5, Y + 1, Z - 0.5), gol = add(M('blackskel'), X + 7.5, Y + 0.5, Z + 1.5), sq = add(M('squid'), X + 6.5, Y + 1, Z - 1.5);
  wait(3);
  ok(at('EAIR', cow) > 2 && at('EAIR', cow) < 4 && at('EHP', cow) === 10, `3 s under: the cow has held its breath ${at('EAIR', cow).toFixed(2)} s, unhurt`);
  ok(at('EAIR', skel) === 0 && at('EAIR', gol) === 0 && at('EAIR', sq) === 0, 'bones and a squid count no air');
  put('EAIR', cow, 14.6); wait(0.6);
  const h1 = at('EHP', cow);
  ok(h1 === 8, `15 s under: 2 hurt (hp ${h1})`);
  wait(1.05); ok(at('EHP', cow) === 6, `a second later 2 more (hp ${at('EHP', cow)})`);
  wait(1.05); ok(at('EHP', cow) === 4, `and 2 more (hp ${at('EHP', cow)})`);
  ok(at('EHP', skel) === s.peek('MHP')[M('skeleton') - 1] && at('EHP', gol) === s.peek('MHP')[M('blackskel') - 1], `the skeletons are whole (${at('EHP', skel)} ${at('EHP', gol)}, kinds ${at('ET', skel)} ${at('ET', gol)})`);
  put('ET', skel, 0); put('ET', gol, 0); put('EHP', cow, 10);
  const ik = add(M('golem'), X + 7.5, Y + 0.5, Z + 1.5); put('EAIR', ik, 0); wait(2);
  ok(at('EAIR', ik) === 0 && s.peek('WDRN')[M('golem') - 1] === 0 && s.peek('WDRN')[M('zombie') - 1] === 0 && s.peek('WDRN')[M('villager') - 1] === 1, 'the iron keeper and the dead count no air; the village folk do');
  // out of the water: breath back at once
  put('EX', cow, X - 3.5); put('EY', cow, Y + 0.1); put('EZ', cow, Z + 0.5); wait(0.6);
  ok(at('EAIR', cow) === 0, 'out of the water its air is back');
  // the rule drowningDamage
  cmd('/gamerule drowningDamage false');
  const pig = add(M('pig'), X + 7.5, Y + 1, Z + 0.5); put('EAIR', pig, 14.8); wait(1.5);
  ok(at('EHP', pig) === 10, 'drowningDamage false: no harm');
  cmd('/gamerule drowningDamage true');
  clearMobs(); floor();
}

// ------------------------------------------------------------------ riders
if (part('ride')) {
  clearMobs(); floor();
  for (let k = -6; k <= 6; k++) cmd(`/setblock ${X + k} ${Y} ${Z + 4} rail_x`);
  call(() => fn.worldFlush());
  call(() => fn.cartPlace(M('minecart'), X, Y, Z + 4)); const cart = s.peek('lastMob');
  const BRS = s.peek('BRS'), RS_RAIL = s.peek('RS_RAIL');
  ok(BRS[B(X, Y, Z + 4)] === RS_RAIL && at('ET', cart) === M('minecart'), 'a cart on its rail');
  // what does not get in: the iron keeper, a flyer, a wide one
  const gol = add(M('golem'), X + 0.5, Y + 0.1, Z + 4.5), bat = add(M('bat'), X + 0.5, Y + 0.3, Z + 4.5), rav = add(M('ravager'), X + 0.5, Y + 0.1, Z + 4.5);
  F(25);
  ok(at('ETG', cart) === 0, 'the iron keeper, a bat and a ravager do not get into a cart');
  put('ET', gol, 0); put('ET', bat, 0); put('ET', rav, 0);
  const pig = add(M('pig'), X + 0.6, Y + 0.1, Z + 4.6);
  F(25);
  ok(at('ETG', cart) === pig && at('EAIR', pig) === 1000 + cart, 'a pig that touches the cart is in it');
  // the cart carries it
  put('EVX', cart, 6); wait(1);
  ok(Math.abs(at('EX', pig) - at('EX', cart)) < 0.05 && Math.abs(at('EZ', pig) - at('EZ', cart)) < 0.05 && at('EX', cart) > X + 2, `the cart rolled to x ${(at('EX', cart) - X).toFixed(1)} with the pig in it (a cart with a rider rolls on)`);
  wait(3);
  ok(at('EAIR', pig) === 1000 + cart, 'it stays in');
  // the player cannot get on; a click with something in the hand does nothing; sneaking with an empty hand lets it out
  s.poke('gameMode', 0); hold('stone', 3); s.poke('sneaking', 1);
  ok(call(() => fn.cartClick(cart)) === 1 && at('ETG', cart) === pig, 'a click with a thing in the hand: taken, the pig stays');
  hold(0, 0); s.poke('sneaking', 0);
  ok(call(() => fn.cartClick(cart)) === 1 && at('ETG', cart) === pig, 'an empty hand, not sneaking: the pig stays');
  s.poke('sneaking', 1);
  ok(call(() => fn.cartClick(pig)) === 1 && at('ETG', cart) === 0 && at('EAIR', pig) === 0, 'sneaking, an empty hand (on the rider): out');
  ok(Math.abs(at('EZ', pig) - at('EZ', cart)) > 1, 'it stands beside the cart');
  s.poke('sneaking', 0); s.poke('gameMode', 1);
  // back in by touching, then the cart is broken
  put('EX', pig, at('EX', cart)); put('EZ', pig, at('EZ', cart)); F(60);
  ok(at('ETG', cart) === 0, 'the cart takes nobody for a moment');
  put('EX', pig, at('EX', cart)); put('EZ', pig, at('EZ', cart)); F(60);
  ok(at('ETG', cart) === pig, 'then it is in again');
  put('EHURT', cart, 0); call(() => fn.mobHurt(cart, 99, 0, 0)); F(3);
  ok(at('ET', cart) === 0 && at('EAIR', pig) === 0 && at('ET', pig) > 0, 'the cart broken: the pig is free');
  ok(items(id('minecart')) === 1, 'and the cart lies there as a thing');
  // a lit activator rail puts the rider out
  clearMobs(); floor();
  for (let k = -3; k <= 3; k++) cmd(`/setblock ${X + k} ${Y} ${Z + 4} ${k === 2 ? 'activator_rail_x' : 'rail_x'}`);
  cmd(`/setblock ${X + 2} ${Y} ${Z + 5} spark_block`); call(() => fn.worldFlush()); wait(0.5);
  call(() => fn.cartPlace(M('minecart'), X - 2, Y, Z + 4)); const c2 = s.peek('lastMob');
  const cw = add(M('chicken'), X - 1.5, Y + 0.1, Z + 4.5); F(25);
  const inIt = at('ETG', c2) === cw;
  put('EVX', c2, 5); wait(2);
  ok(inIt && at('ETG', c2) === 0 && at('EAIR', cw) === 0, `a lit activator rail lets the rider out (it was in: ${inIt}, the rail is ${KEY[B(X + 2, Y, Z + 4)]})`);
  // a boat on the water takes one too
  clearMobs(); floor();
  cmd(`/fill ${X + 3} ${Y - 1} ${Z - 3} ${X + 9} ${Y - 1} ${Z + 3} water`); cmd(`/fill ${X + 2} ${Y} ${Z - 4} ${X + 10} ${Y} ${Z + 4} glass`); cmd(`/fill ${X + 3} ${Y} ${Z - 3} ${X + 9} ${Y} ${Z + 3} air`); call(() => fn.worldFlush());
  const boat = add(13, X + 6.5, Y - 0.3, Z + 0.5); wait(0.5);
  const sheep = add(M('sheep'), at('EX', boat) + 0.2, at('EY', boat) + 0.2, at('EZ', boat)); F(30);
  ok(at('ETG', boat) === sheep && at('EAIR', sheep) === 1000 + boat, 'a sheep that touches a boat is in it');
  const cod = add(M('cod'), at('EX', boat), at('EY', boat), at('EZ', boat));
  put('ETG', boat, 0); put('EAIR', sheep, 0); put('ET', sheep, 0); F(200);
  ok(at('ETG', boat) === 0, 'a fish does not get into a boat');
  // boats and carts are kept in single games
  ok(call(() => fn.keptKind(boat)) === 1, 'a boat is one to keep while its chunk is away');
  clearMobs(); floor();
}

// ------------------------------------------------------------------ carts with a chest, with a hopper
if (part('cart')) {
  clearMobs(); floor(); s.poke('gameMode', 1);
  for (let k = -6; k <= 6; k++) cmd(`/setblock ${X + k} ${Y} ${Z + 4} rail_x`);
  call(() => fn.worldFlush());
  ok(call(() => fn.cartKind(id('chest_minecart'))) === M('chestCart') && call(() => fn.cartKind(id('hopper_minecart'))) === M('hopperCart') && call(() => fn.cartKind(id('minecart'))) === M('minecart') && call(() => fn.cartKind(id('stone'))) === 0, 'each cart item is its kind of cart');
  call(() => fn.cartPlace(M('chestCart'), X, Y, Z + 4)); const cc = s.peek('lastMob');
  ok(call(() => fn.isCart(M('chestCart'))) === 1 && call(() => fn.isCart(M('hopperCart'))) === 1, 'both are carts');
  // a click opens it: 27 slots
  ok(call(() => fn.cartClick(cc)) === 1 && s.peek('uiMode') === 4 && s.peek('curCap') === 27, 'a click opens its chest (27 slots)');
  const c = s.peek('curChest');
  ok(at('EVAR', cc) > 0 && at('CHX', c) === at('EVAR', cc) && at('CHY', c) === 500 && at('CHZ', c) === 0, `its store is a chest record at no place (number ${at('EVAR', cc)})`);
  call(() => { fn.slotSet(61, id('diamond'), 5, 0); fn.slotSet(87, id('stone'), 64, 0); });
  call(() => fn.uiClose());
  ok(store(cc) === c && slots(c)[id('diamond')] === 5 && slots(c)[id('stone')] === 64, 'what was put in is in it');
  // a pig does not ride it
  const pig = add(M('pig'), X + 0.5, Y + 0.1, Z + 4.5); F(30);
  ok(at('ETG', cc) === 0 && at('EAIR', pig) === 0, 'no mob gets into a cart with a chest');
  put('ET', pig, 0);
  // a hopper pointing into its cell fills it
  cmd(`/setblock ${X - 1} ${Y + 1} ${Z + 4} hopper`); cmd(`/setblock ${X} ${Y + 1} ${Z + 5} stone`);
  put('EX', cc, X + 0.5);
  // (a hopper over the cart, pointing down into the cart's cell)
  cmd(`/setblock ${X - 1} ${Y + 1} ${Z + 4} air`); cmd(`/setblock ${X} ${Y + 1} ${Z + 4} hopper`); call(() => fn.worldFlush());
  call(() => { fn.chestAt(X, Y + 1, Z + 4); }); const hop = s.peek('cFound');
  call(() => { fn.chestTake(hop, id('coal'), 4, 0); });
  wait(4);
  ok(slots(c)[id('coal')] === 4, `a hopper over it empties into the cart: coal ${slots(c)[id('coal')]}`);
  cmd(`/setblock ${X} ${Y + 1} ${Z + 4} air`);
  // a hopper under its rail empties it
  cmd(`/setblock ${X + 3} ${Y - 1} ${Z + 4} hopper`); call(() => fn.worldFlush());
  ok(KEY[B(X + 3, Y, Z + 4)].startsWith('rail'), 'the rail stands on the hopper');
  put('EX', cc, X + 3.5); put('EVX', cc, 0);
  call(() => { fn.chestAt(X + 3, Y - 1, Z + 4); }); const hop2 = s.peek('cFound');
  wait(3);
  const got = Object.values(slots(hop2)).reduce((a, b) => a + b, 0), left = Object.values(slots(c)).reduce((a, b) => a + b, 0);
  ok(got >= 5 && got + left === 73, `a hopper under the rail takes from the cart: ${got} in the hopper, ${left} left`);
  cmd(`/setblock ${X + 3} ${Y - 1} ${Z + 4} stone`); F(2);
  { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
  // broken: the cart and what is in it lie there; the record is free
  s.poke('gameMode', 1);
  put('EHURT', cc, 0); call(() => fn.mobHurt(cc, 99, 0, 0)); F(3);
  ok(at('ET', cc) === 0 && items(id('chest_minecart')) === 1, 'broken: the cart lies there as a thing');
  ok(items(id('stone')) + items(id('diamond')) + items(id('coal')) === left && at('CHON', c) === 0, `and its ${left} things with it; the record is free (stone ${items(id('stone'))} diamond ${items(id('diamond'))} coal ${items(id('coal'))}, CHON ${at('CHON', c)})`);
  // doEntityDrops false: nothing
  clearMobs();
  call(() => fn.cartPlace(M('chestCart'), X, Y, Z + 4)); const cd = s.peek('lastMob'); const c3 = store(cd);
  call(() => { fn.chestTake(c3, id('diamond'), 2, 0); });
  cmd('/gamerule doEntityDrops false');
  put('EHURT', cd, 0); call(() => fn.mobHurt(cd, 99, 0, 0)); F(3);
  ok(at('ET', cd) === 0 && items(id('chest_minecart')) === 0 && items(id('diamond')) === 0, 'doEntityDrops false: a cart broken leaves nothing');
  cmd('/gamerule doEntityDrops true');
  // the hopper's cart: five slots, it takes what lies near it and what is in a chest over it
  clearMobs();
  call(() => fn.cartPlace(M('hopperCart'), X, Y, Z + 4)); const hc = s.peek('lastMob');
  ok(call(() => fn.cartClick(hc)) === 1 && s.peek('curCap') === 5, 'the cart with a hopper opens with 5 slots');
  call(() => fn.uiClose());
  const h = store(hc);
  call(() => { fn.dropItem(id('coal'), 7, 0, X + 0.5, Y + 0.3, Z + 4.5, 0); fn.dropItem(id('stone'), 3, 0, X + 1.3, Y + 0.3, Z + 4.5, 0); fn.dropItem(id('diamond'), 1, 0, X + 4.5, Y + 0.3, Z + 4.5, 0); });
  { const iv = arr('IVX'), iz = arr('IVZ'); for (let i = 0; i < iv.length; i++) { iv[i] = 0; iz[i] = 0; } }
  wait(1.5);
  ok(slots(h)[id('coal')] === 7 && slots(h)[id('stone')] === 3 && !slots(h)[id('diamond')] && items(id('diamond')) === 1, 'it picks up what lies in its cell and a block round it, not what lies four blocks off');
  cmd(`/setblock ${X} ${Y + 1} ${Z + 4} chest`); call(() => fn.worldFlush());
  call(() => { fn.chestAt(X, Y + 1, Z + 4); }); const top = s.peek('cFound');
  call(() => { fn.chestTake(top, id('iron_ingot'), 3, 0); });
  wait(2.5);
  ok(slots(h)[id('iron_ingot')] === 3, `it takes from a chest over it: ${slots(h)[id('iron_ingot')]}`);
  cmd(`/setblock ${X} ${Y + 1} ${Z + 4} air`);
  // held on a lit activator rail
  cmd(`/setblock ${X} ${Y} ${Z + 4} activator_rail_x`); cmd(`/setblock ${X} ${Y} ${Z + 5} spark_block`); call(() => fn.worldFlush()); wait(0.5);
  call(() => { fn.dropItem(id('gold_ingot'), 2, 0, X + 0.5, Y + 0.3, Z + 4.5, 0); });
  { const iv = arr('IVX'), iz = arr('IVZ'); for (let i = 0; i < iv.length; i++) { iv[i] = 0; iz[i] = 0; } }
  wait(1.5);
  ok(!slots(h)[id('gold_ingot')], 'on a lit activator rail it takes nothing');
  cmd(`/setblock ${X} ${Y} ${Z + 5} air`); cmd(`/setblock ${X} ${Y} ${Z + 4} rail_x`); call(() => fn.worldFlush());
  // kept while its chunk is away (a single game), with what is in it
  clearMobs();
  call(() => fn.cartPlace(M('chestCart'), X, Y, Z + 4)); const kc = s.peek('lastMob'); const k1 = store(kc); const num = at('EVAR', kc);
  call(() => { fn.chestTake(k1, id('diamond'), 9, 0); });
  ok(call(() => fn.keptKind(kc)) === 1, 'a cart is one to keep');
  call(() => fn.keptPut(kc)); put('ET', kc, 0);
  const KPT = arr('KPT'), KPV = arr('KPV');
  ok(KPT[KPT.length - 1] === M('chestCart') && KPV[KPV.length - 1] === num, 'kept with its number');
  stand(X, Y, Z); for (let i = 0; i < 400 && !arr('ET').includes(M('chestCart')); i++) F(1);
  const back = arr('ET').indexOf(M('chestCart')) + 1;
  ok(back > 0 && at('EVAR', back) === num && store(back) === k1 && slots(k1)[id('diamond')] === 9, 'it comes back with its 9 diamonds');
  clearMobs(); floor();
}

// ------------------------------------------------------------------ the ash-folk
if (part('ash')) {
  clearMobs(); floor(); s.poke('gameMode', 0); s.poke('difficulty', 2); heal();
  const INVI = arr('INVI'), INVN = arr('INVN');
  for (let k = 36; k < 40; k++) { INVI[k] = 0; INVN[k] = 0; }
  const calm = (e) => { put('ECNV', e, 0); };
  let e = add(M('ashpig'), X + 6.5, Y + 0.1, Z + 0.5);
  ok(call(() => fn.goldWorn()) === 0, 'no gold worn');
  wait(0.6); calm(e);
  ok(at('EST', e) === 4, 'no gold on the player: it comes for them');
  INVI[36] = id('golden_helmet'); INVN[36] = 1;
  ok(call(() => fn.goldWorn()) === 1, 'a golden helmet is gold worn');
  wait(0.6); calm(e); heal();
  ok(at('EST', e) !== 4, 'gold on: it leaves the player be');
  INVI[36] = 0; INVI[39] = id('golden_boots'); INVN[39] = 1; wait(0.6);
  ok(at('EST', e) !== 4 && call(() => fn.goldWorn()) === 1, 'golden boots do as well');
  INVI[39] = id('iron_boots'); wait(0.6); calm(e); heal();
  ok(at('EST', e) === 4, 'iron is no gold');
  INVI[39] = id('golden_boots'); wait(0.6); heal();
  // a blow: 30 s of anger, gold or not
  put('EHURT', e, 0); s.poke('pKill', 1); call(() => fn.mobHurt(e, 1, 1, 0)); s.poke('pKill', 0); put('EVX', e, 0); put('EVZ', e, 0); wait(0.6); calm(e); heal();
  ok(at('EST', e) === 4 && at('ETG', e) < -28 && at('ETG', e) > -30, `struck: angry for 30 s (${at('ETG', e).toFixed(1)})`);
  put('ETG', e, -0.3); wait(1); heal(); calm(e);
  ok(at('EST', e) !== 4, 'the 30 s over and gold on: calm again');
  // a gold ingot in its hand: six seconds of looking, then something back
  put('EX', e, X + 4.5); put('EZ', e, Z + 0.5); put('EHP', e, 16);
  hold('gold_ingot', 3);
  ok(call(() => fn.ashGive(e)) === 1 && INVN[s.peek('hotSel') - 1] === 2 && at('ETG', e) === 6, 'it takes a gold ingot from the hand (one fewer held)');
  ok(call(() => fn.ashGive(e)) === 0, 'not a second one while it looks');
  const x0 = at('EX', e);
  INVI[39] = 0; wait(2); calm(e); heal();
  ok(at('EST', e) !== 4 && Math.abs(at('EX', e) - x0) < 0.3, 'looking at its gold it stands and strikes nobody, gold worn or not');
  INVI[39] = id('golden_boots');
  { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
  wait(4.4); calm(e);
  const li = s.peek('lastItem'), gid = arr('IID')[li - 1];
  ok(at('ETG', e) === 0 && gid > 0, `after 6 s it throws something back: ${KEY[gid]} x ${arr('INN')[li - 1]}`);
  // a gold ingot thrown near it
  { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
  call(() => fn.dropItem(id('gold_ingot'), 2, 0, at('EX', e) + 0.6, Y + 0.3, at('EZ', e), 0));
  { const iv = arr('IVX'), iz = arr('IVZ'); for (let i = 0; i < iv.length; i++) { iv[i] = 0; iz[i] = 0; } }
  wait(0.8); calm(e);
  ok(at('ETG', e) > 5 && items(id('gold_ingot')) === 1, 'an ingot lying by it is picked up (one of the two)');
  // the table: 459 parts, this world's things
  const T = arr('ASHT'); let tot = 0; for (let k = 1; k < T.length; k += 4) tot += T[k];
  ok(tot === 459 && T.length === 72, `the table: ${T.length / 4} lines, weights ${tot}`);
  const seen = {}; let bad = 0;
  for (let k = 0; k < 600; k++) {
    { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
    call(() => fn.ashGift(e));
    const i = s.peek('lastItem') - 1, g = arr('IID')[i], nn = arr('INN')[i];
    if (!(g > 0) || KEY[g].trim() === '') bad++;
    seen[KEY[g]] = seen[KEY[g]] || [0, 99, 0]; seen[KEY[g]][0]++; seen[KEY[g]][1] = Math.min(seen[KEY[g]][1], nn); seen[KEY[g]][2] = Math.max(seen[KEY[g]][2], nn);
  }
  console.log('     600 gifts:', Object.entries(seen).map(([k, v]) => `${k} ${v[0]} (${v[1]}-${v[2]})`).join(', '));
  ok(bad === 0 && seen.gravel && seen.gravel[1] >= 8 && seen.gravel[2] <= 16 && seen.obsidian && seen.obsidian[2] === 1 && seen.string && seen.string[1] >= 3 && seen.string[2] <= 9 && seen.void_pearl[1] >= 2 && seen.void_pearl[2] <= 4, 'every gift is a thing of this world, in the genre\'s numbers');
  ok(seen.gravel[0] > 25 && seen.gravel[0] < 85 && (seen.book || [0])[0] < 25, `the common ones are common (gravel ${seen.gravel[0]} of 600, about 52), the rare ones rare`);
  { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
  // the young neither fight nor trade
  const baby = add(M('ashpig'), X + 5.5, Y + 0.1, Z + 2.5); put('EAGE', baby, -500); put('ESZ', baby, 0.5);
  INVI[39] = 0; wait(0.6); calm(e); calm(baby); heal();
  ok(at('EST', baby) !== 4 && call(() => fn.ashGive(baby)) === 0, 'a young one does not fight and takes no gold from the hand');
  INVI[39] = id('golden_boots'); put('ETG', e, 0); put('EST', e, 0); put('EVAR', e, 0); wait(0.6); calm(e);
  // a chest opened near them, gold broken near them
  cmd(`/setblock ${X + 2} ${Y} ${Z + 2} chest`); call(() => fn.worldFlush());
  put('ETG', e, 0); put('EST', e, 0); put('EVAR', e, 0);
  call(() => fn.chestOpen(X + 2, Y, Z + 2)); call(() => fn.uiClose());
  ok(at('EST', e) === 4, 'a chest opened within 16 blocks: angry, gold worn or not');
  wait(0.6); calm(e); heal();
  ok(at('EST', e) === 4 && at('ETG', e) < -28, 'for 30 s');
  put('ETG', e, 0); put('EST', e, 0); put('EVAR', e, 0);
  cmd(`/setblock ${X + 2} ${Y} ${Z - 2} gold_block`); call(() => fn.worldFlush());
  call(() => fn.breakBlock(X + 2, Y, Z - 2, 1));
  ok(at('EST', e) === 4, 'a block of gold broken near them: angry');
  put('ETG', e, 0); put('EST', e, 0); put('EVAR', e, 0);
  cmd(`/setblock ${X + 2} ${Y} ${Z - 2} stone`); call(() => fn.worldFlush());
  call(() => fn.breakBlock(X + 2, Y, Z - 2, 1));
  ok(at('EST', e) !== 4, 'stone broken: nothing');
  ok(s.peek('MHOST')[M('ashBrute') - 1] === 1 && s.peek('MHOST')[M('ashpig') - 1] === 0, 'the brute is a monster to all, gold or not');
  for (let k = 36; k < 40; k++) { INVI[k] = 0; INVN[k] = 0; }
  clearMobs(); floor(); s.poke('gameMode', 1); heal();
}

// ------------------------------------------------------------------ game rules
if (part('rules')) {
  clearMobs(); floor(); s.poke('gameMode', 1);
  const GRV = () => arr('GRV'), GRS = arr('GRS');
  ok(GRS.length === 28 && GRS[26] === 'doTraderSpawning' && GRS[27] === 'maxEntityCramming' && GRV()[26] === 1 && GRV()[27] === 24, 'two rules more: doTraderSpawning true, maxEntityCramming 24');
  cmd('/gamerule doTraderSpawning false'); cmd('/gamerule doInsomnia false'); cmd('/gamerule disableRaids true');
  ok(GRV()[26] === 0 && GRV()[18] === 0 && GRV()[20] === 1, 'the rules are set by /gamerule');
  cmd('/gamerule doTraderSpawning true'); cmd('/gamerule doInsomnia true'); cmd('/gamerule disableRaids false');
  // a world saved before the rules were there
  arr('GRV').length = 26; call(() => fn.grSync());
  ok(GRV().length === 28 && GRV()[27] === 24 && GRV()[26] === 1, 'a world saved with 26 rules gets the new ones as they are at first');
  // cramming: a pit one cell wide
  cmd(`/fill ${X + 4} ${Y} ${Z - 1} ${X + 6} ${Y + 2} ${Z + 1} glass`); cmd(`/fill ${X + 5} ${Y} ${Z} ${X + 5} ${Y + 2} ${Z} air`); call(() => fn.worldFlush());
  const pigs = () => arr('ET').filter(v => v === M('pig')).length;
  for (let k = 0; k < 9; k++) add(M('pig'), X + 5.5, Y + 0.1, Z + 0.5);
  wait(3);
  ok(pigs() === 9, 'nine pigs in a cell at the rule\'s 24: unharmed');
  cmd('/gamerule maxEntityCramming 5');
  wait(0.95);
  const hpNow = arr('EHP').filter((v, i) => arr('ET')[i] === M('pig'));
  ok(hpNow.every(v => v === 4 || v === 10) && hpNow.filter(v => v === 10).length === 5 && (hpNow.length < 9 || hpNow.includes(4)), `maxEntityCramming 5: those over it are hurt 6 at a time, the five are not (hp ${hpNow.join(' ')})`);
  wait(4);
  ok(pigs() === 5, `and gone: ${pigs()} left`);
  wait(2); ok(pigs() === 5, 'five stay');
  cmd('/gamerule maxEntityCramming 0');
  for (let k = 0; k < 30; k++) add(M('pig'), X + 5.5, Y + 0.1, Z + 0.5);
  wait(2); ok(pigs() === 35, '0: no limit');
  cmd('/gamerule maxEntityCramming 24');
  wait(5); ok(pigs() === 24, `24: ${pigs()} left of 35`);
  clearMobs(); floor();
  // forgiveDeadPlayers
  const w = add(M('wolf'), X + 6.5, Y + 0.1, Z + 0.5); put('EST', w, 4); put('ETM', w, 30);
  s.poke('dead', 1); call(() => fn.worldPass());
  ok(at('EST', w) !== 4, 'forgiveDeadPlayers: the player dead, the angered let it be');
  s.poke('dead', 0); call(() => fn.worldPass());
  cmd('/gamerule forgiveDeadPlayers false'); put('EST', w, 4);
  s.poke('dead', 1); call(() => fn.worldPass());
  ok(at('EST', w) === 4, 'forgiveDeadPlayers false: still angry');
  s.poke('dead', 0); call(() => fn.worldPass()); cmd('/gamerule forgiveDeadPlayers true');
  clearMobs(); floor();
}

// ------------------------------------------------------------------ the dead at the door, the wanderer's block
if (part('tricks')) {
  clearMobs(); floor(); s.poke('gameMode', 0); s.poke('difficulty', 3); heal();
  const door = (x, z, key) => { cmd(`/fill ${x} ${Y} ${z - 2} ${x} ${Y + 2} ${z + 2} stone`); call(() => { fn.setBlock(x, Y, z, id(key)); fn.setBlock(x, Y + 1, z, id(key + '_100')); fn.worldFlush(); }); };
  const P_DOOR = s.peek('P_DOOR'), BPLC = s.peek('BPLC');
  door(X + 4, Z, 'oak_door');
  ok(BPLC[B(X + 4, Y, Z)] === P_DOOR && BPLC[B(X + 4, Y + 1, Z)] === P_DOOR, 'a wooden door in a wall');
  let z = add(M('zombie'), X + 4.9 + 0.3, Y + 0.1, Z + 0.5); put('ESZ', z, 1); put('EAGE', z, 0);
  wait(2); heal();
  ok(at('EAIR', z) > 1 && at('EAIR', z) < 2.6, `on hard a zombie pushes at the door before it (${at('EAIR', z).toFixed(2)} s)`);
  put('EAIR', z, 11.6); put('EFIR', z, 0); put('EBURN', z, 0); wait(0.6); heal();
  ok(B(X + 4, Y, Z) === 0 && B(X + 4, Y + 1, Z) === 0, '12 s of it: the door is broken, both halves');
  clearMobs(); { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
  // not on normal, not an iron door, not with mobGriefing off
  s.poke('difficulty', 2); door(X + 4, Z, 'oak_door');
  z = add(M('zombie'), X + 5.2, Y + 0.1, Z + 0.5); put('ESZ', z, 1); put('EAGE', z, 0); wait(1.5); heal();
  ok(at('EAIR', z) === 0, 'on normal it does not');
  s.poke('difficulty', 3); cmd('/gamerule mobGriefing false'); wait(1.5); heal();
  ok(at('EAIR', z) === 0, 'nor with mobGriefing false');
  cmd('/gamerule mobGriefing true'); clearMobs();
  door(X + 4, Z, 'iron_door');
  z = add(M('zombie'), X + 5.2, Y + 0.1, Z + 0.5); put('ESZ', z, 1); put('EAGE', z, 0); wait(1.5); heal();
  ok(at('EAIR', z) === 0, 'an iron door is not pushed at');
  clearMobs(); floor(); s.poke('difficulty', 2); s.poke('gameMode', 1);
  // the wanderer
  cmd(`/fill ${X + 3} ${Y - 1} ${Z - 4} ${X + 11} ${Y - 1} ${Z + 4} dirt`); call(() => fn.worldFlush());
  const count = (b) => { let c = 0; for (let x = X + 1; x <= X + 13; x++) for (let zz = Z - 6; zz <= Z + 6; zz++) for (let y = Y - 1; y <= Y + 3; y++) if (B(x, y, zz) === b) c++; return c; };
  const d0 = count(3);
  const w = add(11, X + 7.5, Y + 0.1, Z + 0.5);
  put('EY', w, Y - 1); let tries = 0;   // (it takes from its own level and the two over it, as the genre's: stood a block down for the floor)
  call(() => { const EV = arr('EVAR'); while (EV[w - 1] === 0 && tries < 400) { fn.wanderBlock(w); tries++; } });
  ok(at('EVAR', w) === 3 && count(3) === d0 - 1, `the wanderer took a block of dirt up (try ${tries}); one fewer lies there`);
  tries = 0; put('EY', w, Y + 0.1);
  call(() => { const EV = arr('EVAR'); while (EV[w - 1] !== 0 && tries < 20000) { fn.wanderBlock(w); tries++; } });
  ok(at('EVAR', w) === 0 && count(3) === d0, `and put it down again somewhere (try ${tries}: about one in 200 half seconds, on a floor)`);
  tries = 0; put('EY', w, Y - 1);
  call(() => { const EV = arr('EVAR'); while (EV[w - 1] === 0 && tries < 400) { fn.wanderBlock(w); tries++; } });
  { const II = arr('IID'); for (let i = 0; i < II.length; i++) II[i] = 0; }
  put('EHURT', w, 0); put('EHP', w, 1); call(() => fn.mobHurt(w, 99, 0, 0)); F(2);
  ok(at('ET', w) === 0 && items(3) === 1, 'killed with a block in its hands: the block drops');
  // stone is not one of its blocks
  floor();
  const w2 = add(11, X + 7.5, Y - 1, Z + 0.5); tries = 0;
  call(() => { while (tries < 300) { fn.wanderBlock(w2); tries++; } });
  ok(at('EVAR', w2) === 0, 'it takes no stone');
  clearMobs(); floor();
}

// ------------------------------------------------------------------ gates
if (part('gate')) {
  clearMobs(); floor(); s.poke('gameMode', 0); heal();
  // the list of gates known
  call(() => { fn.gateKnown(1, 100, 100); fn.gateKnown(1, 101, 102); fn.gateKnown(0, 900, 900); });
  ok(arr('GTK').length === 6, 'a gate is remembered once');
  stand(X, Y, Z);
  call(() => fn.gateTo(1, 110, 110, 16));
  ok(s.peek('gtX') === 100 && s.peek('gtZ') === 100, 'in the depths a gate known within 16 blocks is the one gone to');
  call(() => fn.gateTo(1, 120, 100, 16));
  ok(s.peek('gtX') === 120 && s.peek('gtZ') === 100, 'not one 20 blocks off');
  call(() => fn.gateTo(0, 990, 980, 128));
  ok(s.peek('gtX') === 900 && s.peek('gtZ') === 900, 'in the overworld one within 128 blocks');
  call(() => fn.gateTo(0, 1000, 1000, 128));
  ok(s.peek('gtX') === 1000, 'not one 141 blocks off');
  // four seconds in the veil
  call(() => { for (let a = -1; a <= 2; a++) for (let k = -1; k <= 3; k++) fn.setBlock(X + 4 + a, Y + k, Z, (a === -1 || a === 2 || k === -1 || k === 3) ? 34 : 0); fn.worldFlush(); fn.lightGate(X + 4, Y + 1, Z); fn.worldFlush(); });
  ok(s.peek('gateOK') === 1 && B(X + 4, Y, Z) === 47, 'a gate lit');
  stand(X + 4, Y, Z); s.poke('gateCool', 0); s.poke('gateT', 0);
  wait(3.7);
  ok(s.peek('gState') === 2 && s.peek('dim') === 0, '3.7 s in the veil: still here');
  wait(0.5);
  ok(s.peek('gState') === 3 || s.peek('dim') === 1, '4 s: off to the depths');
  let k = 0; while (s.peek('gState') !== 2 && k < 3000) { F(1); k++; }
  const ax = s.peek('px'), az = s.peek('pz');
  ok(s.peek('dim') === 1 && B(Math.floor(ax), Math.floor(s.peek('py')), Math.floor(az)) === 47, `arrived in the depths in a gate made there (${ax.toFixed(1)}, ${az.toFixed(1)})`);
  // a second gate 12 blocks from there (96 in the overworld): it leads back to the first gate above
  s.poke('gameMode', 1); s.poke('flying', 1);
  const bx = Math.floor(ax) + 12, by = Math.floor(s.peek('py')) + 6, bz = Math.floor(az);
  call(() => { for (let a = -2; a <= 3; a++) for (let c = -2; c <= 2; c++) for (let q = -1; q <= 4; q++) fn.setBlock(bx + a, by + q, bz + c, q === -1 ? 34 : 0); for (let a = -1; a <= 2; a++) for (let q = -1; q <= 3; q++) fn.setBlock(bx + a, by + q, bz, (a === -1 || a === 2 || q === -1 || q === 3) ? 34 : 0); fn.worldFlush(); fn.lightGate(bx, by + 1, bz); fn.worldFlush(); });
  ok(s.peek('gateOK') === 1, 'a second gate built 12 blocks away in the depths');
  s.poke('flying', 0); stand(bx, by, bz); s.poke('gateCool', 0); s.poke('gateT', 0);
  wait(0.3);
  ok(s.peek('gState') === 3 || s.peek('dim') === 0, 'in creative the veil takes one at once');
  k = 0; while (s.peek('gState') !== 2 && k < 3000) { F(1); k++; }
  ok(s.peek('dim') === 0 && Math.abs(s.peek('px') - (X + 4.5)) < 2 && Math.abs(s.peek('pz') - (Z + 0.5)) < 2, `it leads to the gate known in the overworld, ${Math.round(Math.hypot(bx * 8 - X - 4, bz * 8 - Z))} blocks from the place across (${s.peek('px').toFixed(1)}, ${s.peek('pz').toFixed(1)} - the first gate is at ${X + 4.5}, ${Z + 0.5})`);
  s.poke('gameMode', 1);
}

// ------------------------------------------------------------------ the warden
if (part('warden')) {
  s.poke('gameMode', 1); s.poke('flying', 0);
  call(() => fn.startTravel(2, 0.5, -47.5, 2));
  let k = 0; while (s.peek('gState') !== 2 && k < 4000) { F(1); k++; }
  const py = s.peek('padY');
  let obs = 0, air = 0;
  for (let a = -2; a <= 2; a++) for (let c = -50; c <= -46; c++) { if (B(a, py, c) === 34) obs++; for (let q = 1; q <= 3; q++) if (B(a, py + q, c) === 0) air++; }
  ok(s.peek('dim') === 2 && obs === 25 && air === 75 && Math.abs(s.peek('py') - (py + 1)) < 0.6, `into the void onto 5 x 5 of obsidian with three cells of air over it (level ${py})`);
  F(30);
  let e = s.peek('bossE');
  ok(e > 0 && at('ET', e) === 10 && at('EHP', e) === 200, 'the warden is there, 200 hp');
  // to the middle of the island, so every pillar's chunk is there
  s.poke('flying', 1); stand(0, 70, 0); F(600);
  ok(s.peek('nCrystal') === 8, `eight crystals stand (${s.peek('nCrystal')})`);
  // hurt from the start
  put('EHURT', e, 0); call(() => fn.mobHurt(e, 30, 0, 0));
  ok(at('EHP', e) === 170, 'it can be hurt while the crystals stand: 200 - 30 = 170');
  // a crystal mends it: 1 each half second, the beam's end in its EVAR
  put('EX', e, 40); put('EY', e, 53); put('EZ', e, 0); s.poke('bossPh', 0); s.poke('bossT', 0); F(2);
  const h0 = at('EHP', e); wait(3);
  const cry = at('EVAR', e);
  ok(cry >= 1 && cry <= 8 && at('EHP', e) >= h0 + 5 && at('EHP', e) <= h0 + 7, `near a crystal it is mended 1 each half second: ${h0} -> ${at('EHP', e)} in 3 s (crystal ${cry})`);
  // that crystal broken while it mends: 10 hurt
  const h1 = at('EHP', e);
  call(() => { fn.pillarAt(cry - 1); });
  const cx = s.peek('pilX'), cy = s.peek('pilH') + 1, cz = s.peek('pilZ');
  ok(B(cx, cy, cz) === 57, 'the crystal it is mended by');
  call(() => fn.setBlock(cx, cy, cz, 0)); F(2);
  ok(at('EHP', e) === h1 - 10 || at('EHP', e) === h1 - 9, `the mending crystal broken: 10 hurt (${h1} -> ${at('EHP', e)})`);
  ok(s.peek('nCrystal') === 7, 'seven left');
  // full again by the others, never over 200
  put('EHP', e, 199); wait(2.5);
  ok(at('EHP', e) === 200, 'mended to 200 and no more');
  // all crystals gone: no mending
  call(() => { for (let q = 0; q < 8; q++) { fn.pillarAt(q); fn.setBlock(s.peek('pilX'), s.peek('pilH') + 1, s.peek('pilZ'), 0); } }); F(3);
  put('EHP', e, 150); wait(2);
  ok(s.peek('nCrystal') === 0 && at('EHP', e) === 150 && at('EVAR', e) === 0, 'no crystal: no mending, no beam');
  // circling, it throws a ball of its breath at one it can hurt; where that lands a cloud lies 3 s
  s.poke('gameMode', 0); s.poke('flying', 0); heal();
  call(() => fn.findTop(0, 12)); const gy = s.peek('topY');
  stand(0, gy + 1, 12); s.poke('bossPh', 0); s.poke('bossT', 2.9); s.poke('wdShot', 0); s.poke('bossN', 1);
  let ball = 0;
  for (let q = 0; q < 30 && !ball; q++) { F(1); heal(); const AON = arr('AON'), AEN = arr('AEN'); for (let a = 0; a < AON.length; a++) if (AON[a] === 3 && AEN[a] === -4) ball = a + 1; }
  ok(ball > 0, 'three seconds round: a ball of its breath is on its way');
  let cloud = 0, seenAt = 0;
  for (let q = 0; q < 900 && !cloud; q++) { F(1); heal(); s.poke('bossT', Math.min(s.peek('bossT'), 4)); const AON = arr('AON'); for (let a = 0; a < AON.length; a++) if (AON[a] === 19) { cloud = a + 1; seenAt = q; } }
  ok(cloud > 0, `where it lands a cloud lies (after ${(seenAt / 60).toFixed(1)} s of flight)`);
  if (cloud > 0) {
    // 3 a second for 3 s, through armour, to one standing in it
    const ax = arr('AXX')[cloud - 1], ay = arr('AYY')[cloud - 1], az = arr('AZZ')[cloud - 1];
    put('EX', e, 40); put('EY', e, 60); put('EZ', e, 40);
    s.poke('px', ax + 1); s.poke('pz', az); s.poke('py', ay); s.poke('hp', 20); s.poke('hurtT', 0);
    const INVI = arr('INVI'), INVN = arr('INVN'); INVI[37] = id('diamond_chestplate'); INVN[37] = 1;
    let lost = 0, last = 20;
    for (let q = 0; q < 200; q++) { s.poke('bossPh', 0); s.poke('bossT', 0); put('EX', e, 40); put('EZ', e, 40); s.poke('px', ax + 1); s.poke('pz', az); s.poke('py', ay); s.poke('pvy', 0); F(1); const h = s.peek('hp'); if (h < last) lost += last - h; last = h; }
    ok(arr('AON')[cloud - 1] === 0 && lost >= 3 && lost <= 9 && lost % 3 === 0, `the cloud hurts 3 a second while it lies (3 s in all), armour or not: ${lost} lost in what was left of it`);
    INVI[37] = 0; INVN[37] = 0;
  }
  // sitting on the middle: arrows glance off, a cloud of breath before it
  heal(); s.poke('gameMode', 1);
  call(() => fn.findTop(0, 0)); const my = s.peek('topY');
  { const AON = arr('AON'); for (let a = 0; a < AON.length; a++) AON[a] = 0; }
  s.poke('bossPh', 2); s.poke('bossT', 0); put('EX', e, 0.5); put('EY', e, my + 1.2); put('EZ', e, 0.5); F(5);
  ok(s.peek('bossPh') === 3 && at('EST', e) === 2, 'down on the middle it sits (its EST 2 for every screen)');
  const hs = at('EHP', e);
  const shoot = () => { s.poke('shotPow', 1); put('EHURT', e, 0); call(() => fn.arrowShoot(at('EX', e) + 6, at('EY', e) + 1, at('EZ', e), at('EX', e), at('EY', e) + 1, at('EZ', e), 1)); const wx = at('EX', e), wy = at('EY', e), wz = at('EZ', e); for (let q = 0; q < 40; q++) { put('EX', e, wx); put('EY', e, wy); put('EZ', e, wz); F(1); } };
  shoot();
  ok(at('EHP', e) === hs, `an arrow glances off it while it sits (hp ${at('EHP', e)})`);
  put('EHURT', e, 0); s.poke('pKill', 1); call(() => fn.mobHurt(e, 20, 0, 0)); s.poke('pKill', 0);
  ok(at('EHP', e) === hs - 20, 'a blow of the hand counts in full');
  s.poke('gameMode', 0); stand(0, my + 1, 5); heal(); s.poke('bossT', 1.95); s.poke('wdShot', 0); F(8);
  let br = 0; { const AON = arr('AON'); for (let a = 0; a < AON.length; a++) if (AON[a] === 19) br = a + 1; }
  ok(br > 0 && Math.hypot(arr('AXX')[br - 1] - at('EX', e), arr('AZZ')[br - 1] - at('EZ', e)) > 3.5 && Math.hypot(arr('AXX')[br - 1] - at('EX', e), arr('AZZ')[br - 1] - at('EZ', e)) < 4.5, 'two seconds sitting: its breath lies 4 blocks before it, towards the one it looks at');
  s.poke('gameMode', 1); heal();
  s.poke('bossT', 7.95); F(10);
  ok(s.peek('bossPh') === 0 && at('EST', e) === 0, 'after 8 s it is up again');
  put('EX', e, 30); put('EY', e, 55); put('EZ', e, 0); F(2);
  const hf = at('EHP', e);
  shoot();
  ok(at('EHP', e) < hf, `flying, an arrow hurts it (${hf} -> ${at('EHP', e)})`);
  // its death: 12000 xp, the gate home, its egg on the gate, the far gate
  ok(s.peek('MXP')[9] === 12000, 'it is worth 12000 xp');
  s.poke('gameMode', 0); heal(); stand(0, my + 1, 3);
  const lv0 = s.peek('xpLevel');
  put('EHURT', e, 0); s.poke('pKill', 1); call(() => fn.mobHurt(e, 999, 0, 0)); s.poke('pKill', 0);
  for (let q = 0; q < 400; q++) { F(1); heal(); s.poke('px', 2.5); s.poke('pz', 3.5); }
  call(() => fn.findTop(0, 0));
  const ty = s.peek('topY');
  ok(s.peek('bossDead') === 1 && KEY[B(0, ty, 0)] === 'warden_egg' && B(0, ty - 1, 0) === 56 && B(1, ty - 1, 1) === 56 && B(-1, ty - 1, -1) === 56, 'dead: the gate home, 3 x 3, with its egg on the middle');
  const orbs = items(id('experience_orb'));
  ok(s.peek('xpLevel') > lv0 + 20 || orbs > 0, `its xp is the killer's: level ${lv0} -> ${s.peek('xpLevel')}${orbs ? ', orbs lying ' + orbs : ''}`);
  ok(items(id('warden_heart')) >= 1 || arr('INVI').includes(id('warden_heart')), 'and its heart');
  s.poke('gameMode', 1);
}
console.log(fails === 0 ? 'ALL OK' : `${fails} FAILED`);
process.exit(fails ? 1 : 0);

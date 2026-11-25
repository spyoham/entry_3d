// (v3.2) the example map: a normal world (seed 11) with a district of working farms and a villagers'
// hall, built here by commands in the simulator, each machine tried, and the whole map written as the
// text the game's "맵 데이터 복사" makes: ../../example_map.txt (pasted on the new-world or new-server screen).
//   node test/examplemap.mjs            build, try every machine, write the file
//   NOTRY=1 node test/examplemap.mjs    build and write only
//   PICS=1 node test/examplemap.mjs     and pictures test/example_*.png
import fs from 'node:fs';
import { createSim } from '../sim.mjs';
// ((v3.4) on the new land: seed 129 begins at (8, 8) on plains by a forest, the land under the district 31..37;
// (v3.5) the world 256 high: the same land 33 higher, 64..70, the district's floor at 90)
const SEED = 129;
const s = createSim({ consts: { AUTOSEED: SEED, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0, GENV: 3 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
{ let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; } }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY'), id = (k) => { const i = KEY.indexOf(k); if (i < 0) throw new Error('no ' + k); return i; };
const arr = (k) => s.peek(k);
const cmd = (c) => call(() => fn.runCommand(c));
const set = (x, y, z, b) => cmd(`/setblock ${x} ${y} ${z} ${b}`);
const fill = (x0, y0, z0, x1, y1, z1, b) => { const n = (Math.abs(x1 - x0) + 1) * (Math.abs(y1 - y0) + 1) * (Math.abs(z1 - z0) + 1); if (n > 32000) throw new Error('fill too big'); cmd(`/fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} ${b}`); };
const blk = (x, y, z) => call(() => fn.blockAt(x, y, z));
const key = (x, y, z) => KEY[blk(x, y, z)];
const M = (n) => arr('MKEY').indexOf(n) + 1;
const stand = (x, y, z, fly = 1) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); s.poke('flying', fly); s.poke('fallTop', y); };
const chestOf = (x, y, z) => { call(() => fn.chestAt(x, y, z)); return s.peek('cFound'); };
const chestPut = (x, y, z, items) => { const c = chestOf(x, y, z); if (!c) throw new Error('no chest at ' + [x, y, z]); items.forEach(([k, n], i) => { arr('CHI')[(c - 1) * 27 + i] = typeof k === 'string' ? id(k) : k; arr('CHN')[(c - 1) * 27 + i] = n; arr('CHD')[(c - 1) * 27 + i] = 0; }); };
const chestCount = (x, y, z, k) => { call(() => fn.chestFind(x, y, z)); const c = s.peek('cFound'); if (!c) return -1; let n = 0; const want = typeof k === 'string' ? id(k) : k; for (let i = 0; i < 27; i++) if (arr('CHI')[(c - 1) * 27 + i] === want) n += arr('CHN')[(c - 1) * 27 + i]; return n; };
const chestAll = (x, y, z) => { call(() => fn.chestFind(x, y, z)); const c = s.peek('cFound'); const r = {}; if (c) for (let i = 0; i < 27; i++) { const q = arr('CHI')[(c - 1) * 27 + i]; if (q > 0) r[KEY[q]] = (r[KEY[q]] || 0) + arr('CHN')[(c - 1) * 27 + i]; } return r; };
const sign = (x, y, z, text) => { set(x, y, z, 'oak_sign'); arr('SGX').push(x); arr('SGY').push(y); arr('SGZ').push(z); arr('SGT').push(text); arr('SGD').push(0); };
const summon = (k, x, y, z) => { cmd(`/summon ${k} ${x} ${y} ${z}`); return s.peek('lastMob'); };
const press = (x, y, z) => call(() => fn.buttonPress(x, y, z));
const clearItems = () => { const I = arr('IID'); for (let i = 0; i < I.length; i++) I[i] = 0; };
const mobsOf = (k) => { const r = []; arr('ET').forEach((t, i) => { if (t === M(k)) r.push(i + 1); }); return r; };
const I_ = (n) => s.peek('I_' + n);
// a bed: its foot at (x, y, z), its head the next cell the way 0 (the head is what counts as a bed)
const BDX = call(() => fn.dirX(0)), BDZ = call(() => fn.dirZ(0));
const bed = (x, y, z) => { set(x, y, z, 'white_bed'); set(x + BDX, y, z + BDZ, 'white_bed_10'); };
const EMPTY = Array(27).fill([0, 0]);

s.poke('gameMode', 1); s.poke('tday', 0.25); cmd('/gamerule doDaylightCycle false'); cmd('/gamerule doWeatherCycle false'); cmd('/gamerule doMobSpawning false');
// ================================================================ the ground: a stone floor over the land
const X0 = 16, Z0 = 16, X1 = 63, Z1 = 55, Y = 91;   // things stand at Y; the floor's blocks are at Y - 1
stand(40, Y + 6, 36); F(300);
{ let hi = 0; for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) { call(() => fn.findTop(x, z)); hi = Math.max(hi, s.peek('topY')); } ok(hi < Y - 1, `the land under the district is below its floor (highest ${hi}, floor ${Y - 1})`); }
fill(X0, Y - 1, Z0, X1, Y - 1, Z1, 'stone');
// steps up from the land by where one starts (8, 39, 8)
{ let i = 0, g = 0; do { const x = X0 - 1 - i, y = Y - 1 - i; fill(x, y, Z0, x, y, Z0 + 2, 'cobblestone'); call(() => fn.findTop(x - 1, Z0 + 1)); g = s.peek('topY'); i++; if (y - 1 <= g) break; } while (i < 40); }
sign(X0 + 1, Y, Z0 + 1, '예시 맵: 공장과 마을 사람들 - 표지판을 따라 둘러보세요');
set(X0 + 1, Y, Z0 + 3, 'chest'); chestPut(X0 + 1, Y, Z0 + 3, [['bread', 32], ['iron_pickaxe', 1], ['iron_sword', 1], ['bucket', 2], ['lectern', 4], ['torch', 32], ['wheat_seeds', 16], ['bone_meal', 16]]);

// ================================================================ 1. a furnace that feeds itself
// a chest over a hopper over the furnace (what is to be smelted), a chest and hopper at its side (fuel), a
// hopper under it into a chest (what comes out)
const SM = { x: 20, z: 20 };
set(SM.x, Y, SM.z, 'hopper_east'); set(SM.x + 1, Y, SM.z, 'chest');
set(SM.x, Y + 1, SM.z, 'furnace');
set(SM.x, Y + 2, SM.z, 'hopper'); set(SM.x, Y + 3, SM.z, 'chest');
set(SM.x - 1, Y, SM.z, 'stone'); set(SM.x - 1, Y + 1, SM.z, 'hopper_east'); set(SM.x - 1, Y + 2, SM.z, 'chest');
sign(SM.x, Y, SM.z + 1, '자동 화로: 위 상자 = 구울 것, 옆 상자 = 땔감, 아래 상자 = 나온 것');

// ================================================================ 2. eggs: hens over a hopper
const EG = { x: 26, z: 20 };
set(EG.x, Y, EG.z, 'hopper_east'); set(EG.x + 1, Y, EG.z, 'chest');
for (const [dx, dz] of [[-1, 0], [0, -1], [0, 1]]) fill(EG.x + dx, Y, EG.z + dz, EG.x + dx, Y + 2, EG.z + dz, 'glass');
fill(EG.x + 1, Y + 1, EG.z, EG.x + 1, Y + 2, EG.z, 'glass'); set(EG.x, Y + 3, EG.z, 'glass');
const hens = [0, 1, 2].map(() => summon('chicken', EG.x + 0.5, Y + 1.1, EG.z + 0.5));
sign(EG.x + 1, Y, EG.z + 1, '달걀 농장: 닭이 5~10분마다 낳는 달걀이 깔때기로 상자에');

// ================================================================ 3. cobblestone without end
// water runs to a hole, lava runs toward it from the other side: where they meet, cobblestone
const CG = { x: 32, z: 20 };
fill(CG.x, Y, CG.z - 1, CG.x + 5, Y, CG.z + 1, 'stone');
fill(CG.x, Y + 1, CG.z - 1, CG.x + 5, Y + 1, CG.z + 1, 'stone');
fill(CG.x + 1, Y + 1, CG.z, CG.x + 4, Y + 1, CG.z, 'air');
set(CG.x + 2, Y, CG.z, 'air');
set(CG.x + 1, Y + 1, CG.z, 'water'); F(40);
set(CG.x + 4, Y + 1, CG.z, 'lava'); F(240);
set(CG.x + 3, Y + 1, CG.z - 1, 'air');
sign(CG.x + 3, Y, CG.z - 2, '조약돌 생성기: 가운데 조약돌을 캐면 다시 생깁니다');

// ================================================================ 4. wheat washed out by water
// a bed 6 long and 3 wide a block up, water along one side under glass (it keeps the soil wet). A button
// has three dispensers pour water over the wheat (pressed again: they take it back). The stream carries
// what it washed out to the hoppers at the far end. (The cell before each dispenser is bare: it pours only
// into air.)
const WF = { x: 20, z: 26 };
fill(WF.x, Y, WF.z - 1, WF.x + 9, Y, WF.z + 4, 'stone');
fill(WF.x, Y + 1, WF.z - 1, WF.x + 9, Y + 3, WF.z - 1, 'glass'); fill(WF.x, Y + 1, WF.z + 4, WF.x + 9, Y + 3, WF.z + 4, 'glass');
fill(WF.x + 9, Y + 1, WF.z, WF.x + 9, Y + 3, WF.z + 3, 'glass');
fill(WF.x, Y + 1, WF.z, WF.x + 7, Y + 1, WF.z + 3, 'stone');
fill(WF.x + 2, Y + 1, WF.z + 1, WF.x + 7, Y + 1, WF.z + 3, 'farmland_moist');
fill(WF.x + 1, Y + 1, WF.z, WF.x + 6, Y + 1, WF.z, 'water');
fill(WF.x, Y + 2, WF.z, WF.x + 8, Y + 2, WF.z, 'glass'); set(WF.x + 8, Y + 1, WF.z, 'glass'); set(WF.x + 8, Y, WF.z, 'stone');
const plantWheat = () => { fill(WF.x + 2, Y + 1, WF.z + 1, WF.x + 7, Y + 1, WF.z + 3, 'farmland_moist'); fill(WF.x + 2, Y + 2, WF.z + 1, WF.x + 7, Y + 2, WF.z + 3, 'wheat_3'); };
plantWheat();
// ((v3.4, 11-21) the bare cells before the dispensers are glass: on stone a monster could come in the dark, and a
// torch there would stop the dispenser)
fill(WF.x + 1, Y + 1, WF.z + 1, WF.x + 1, Y + 1, WF.z + 3, 'glass');
set(WF.x + 8, Y, WF.z + 4, 'chest');
for (let k = 1; k <= 3; k++) set(WF.x + 8, Y, WF.z + k, 'hopper_south');
for (let k = 1; k <= 3; k++) { set(WF.x, Y + 2, WF.z + k, 'dispenser[facing=east]'); chestPut(WF.x, Y + 2, WF.z + k, [['water_bucket', 1]]); }
fill(WF.x - 1, Y, WF.z + 1, WF.x - 1, Y + 2, WF.z + 3, 'stone');
fill(WF.x - 1, Y + 3, WF.z + 1, WF.x - 1, Y + 3, WF.z + 3, 'spark_wire');
// (a block at the dust's end with the button on it: pressed, the block is powered and the dust with it)
fill(WF.x - 1, Y, WF.z + 4, WF.x - 1, Y + 3, WF.z + 4, 'stone'); set(WF.x - 1, Y + 4, WF.z + 4, 'stone_button');
const WFB = [WF.x - 1, Y + 4, WF.z + 4];
fill(WF.x, Y + 4, WF.z - 1, WF.x + 9, Y + 4, WF.z + 4, 'glass');
sign(WF.x - 2, Y, WF.z + 4, '밀 농장: 위의 단추를 누르면 물이 밀을 쓸어 끝의 상자로. 다시 누르면 물이 빠집니다');
set(WF.x + 9, Y, WF.z + 5, 'chest'); chestPut(WF.x + 9, Y, WF.z + 5, [['wheat_seeds', 64], ['bone_meal', 32]]);

// ================================================================ 5. sugar cane cut by pistons
// six canes on sand by a stream. An observer behind each sees it reach three high and has the piston
// under it cut it at two: what is cut flies into the stream, the stream takes it to the hopper.
const CF = { x: 34, z: 26 };
fill(CF.x - 1, Y, CF.z - 1, CF.x + 8, Y, CF.z + 3, 'stone');
fill(CF.x - 1, Y + 1, CF.z - 1, CF.x + 8, Y + 5, CF.z - 1, 'glass');
set(CF.x - 1, Y + 1, CF.z, 'stone'); set(CF.x + 8, Y + 1, CF.z, 'stone'); set(CF.x + 8, Y + 2, CF.z, 'glass');
set(CF.x, Y + 1, CF.z + 1, 'stone'); set(CF.x + 7, Y + 1, CF.z + 1, 'stone');
fill(CF.x + 1, Y + 1, CF.z + 1, CF.x + 6, Y + 1, CF.z + 1, 'sand');
fill(CF.x, Y + 1, CF.z + 2, CF.x + 7, Y + 2, CF.z + 2, 'stone');
fill(CF.x, Y + 1, CF.z + 3, CF.x + 7, Y + 3, CF.z + 3, 'stone');
set(CF.x + 7, Y, CF.z, 'hopper_east'); set(CF.x + 8, Y, CF.z, 'chest');
set(CF.x, Y + 1, CF.z, 'water'); F(120);
for (let k = 1; k <= 6; k++) { set(CF.x + k, Y + 2, CF.z + 1, 'reeds'); set(CF.x + k, Y + 3, CF.z + 2, 'piston[facing=north]'); set(CF.x + k, Y + 4, CF.z + 2, 'observer[facing=north]'); set(CF.x + k, Y + 4, CF.z + 3, 'spark_wire'); }
fill(CF.x - 1, Y + 6, CF.z - 1, CF.x + 8, Y + 6, CF.z + 3, 'glass');
sign(CF.x + 8, Y, CF.z + 1, '사탕수수 농장: 세 칸까지 자라면 관찰기가 보고 피스톤이 자릅니다. 물길 끝 상자에 모입니다');

// ================================================================ 6. the villagers' hall
// eight pits two deep (they cannot jump out, one can still reach them), each with its job block at the
// edge. The last one's lectern is for trying again: break it and put it back until the book is the one wanted.
const VH = { x: 20, z: 36 };
const JOBS = ['lectern', 'composter', 'smithing_table', 'blast_furnace', 'brewing_stand', 'fletching_table', 'cartography_table', 'lectern'];
fill(VH.x - 1, Y - 3, VH.z - 1, VH.x + 15, Y - 2, VH.z + 1, 'stone');
const villagers = [];
JOBS.forEach((j, i) => { const x = VH.x + 2 * i; fill(x, Y - 2, VH.z, x, Y - 1, VH.z, 'air'); set(x, Y, VH.z - 1, j); villagers.push(summon('villager', x + 0.5, Y - 2, VH.z + 0.5)); });
sign(VH.x - 1, Y, VH.z - 1, '거래소: 구덩이의 마을 사람을 눌러 거래. 직업은 앞에 놓인 작업 블록이 정합니다');
sign(VH.x + 15, Y, VH.z - 1, '주민작: 거래한 적 없는 사서의 독서대를 부수고 다시 놓으면 파는 책이 바뀝니다');
set(VH.x + 16, Y, VH.z, 'chest'); chestPut(VH.x + 16, Y, VH.z, [['lectern', 8], ['jade', 64], ['paper', 64], ['book', 16], ['golden_apple', 2]]);

// ================================================================ 7. more villagers: beds and bread
// (well away from the hall: a child comes only while there are more beds than villagers within 8 blocks)
const BR = { x: 20, z: 49 };
// (glass two high: over a fence they jumped from a bed; a step outside to throw the bread from)
fill(BR.x, Y, BR.z, BR.x + 5, Y + 1, BR.z + 5, 'glass'); fill(BR.x + 1, Y, BR.z + 1, BR.x + 4, Y + 1, BR.z + 4, 'air');
fill(BR.x + 6, Y, BR.z + 2, BR.x + 6, Y, BR.z + 3, 'stone');
for (let k = 1; k <= 4; k++) bed(BR.x + (BDX === 0 ? k : 1 + (BDX < 0 ? 1 : 0)), Y, BR.z + (BDZ === 0 ? k : 1 + (BDZ < 0 ? 1 : 0)));
const breeders = [summon('villager', BR.x + 3.5, Y, BR.z + 3.5), summon('villager', BR.x + 4.5, Y, BR.z + 4.5)];
set(BR.x + 6, Y, BR.z, 'chest'); chestPut(BR.x + 6, Y, BR.z, [['bread', 64], ['carrot', 64]]);
sign(BR.x + 6, Y, BR.z + 1, '번식장: 돌 위에 올라 빵 3개나 당근 12개를 던져 주면 주워 먹고, 침대가 남으면 아이가 생깁니다');

// ================================================================ 8. animals to breed
const AP = { x: 30, z: 42 };
[['cow', 0], ['sheep', 6], ['pig', 12]].forEach(([k, dx]) => {
  const x = AP.x + dx;
  fill(x, Y, AP.z, x + 4, Y, AP.z + 4, 'oak_fence'); fill(x + 1, Y, AP.z + 1, x + 3, Y, AP.z + 3, 'air');
  summon(k, x + 1.5, Y, AP.z + 1.5); summon(k, x + 3.5, Y, AP.z + 3.5);
});
set(AP.x - 1, Y, AP.z, 'chest'); chestPut(AP.x - 1, Y, AP.z, [[I_('wheat'), 64], ['carrot', 32], ['shears', 1], ['bucket', 1]]);
sign(AP.x - 1, Y, AP.z + 1, '우리: 소와 양은 밀, 돼지는 당근. 가둔 동물은 멀리 갔다 와도 그대로 있습니다');

// ================================================================ 9. iron: three villagers, a zombie in a cart, lava
// (v3.4, 11-21, built anew) The genre's iron farm. Three villagers with their beds in a glass room, a zombie
// in a minecart eight blocks from them (one that rides does not go away; under a stone roof it does not
// burn): in fear they call a keeper every 35 s or so. It can only come on the stone floor beside them, 5 x 7
// under running water (all the roofs carry slabs: a keeper comes on nothing but a whole block, and needs its
// whole body free - so on the middle three rows); the water takes it to the end row, where lava hangs at
// the height of its head over signs (signs hold a liquid up and in; a mob goes through them). It falls in 13 s,
// and what it leaves sinks onto the hoppers under the end row, down the hopper column into the chest.
// The zombie is on the far side of the end row: a keeper going for it goes the way the water does.
const IF = { x: 66, z: 16, f: Y + 9 };          // the middle of the folk's room; things stand at f + 1
const IP = { x0: 61, x1: 67, z0: 19, z1: 23 };  // the floor the keeper comes on
const KX = IP.x1 + 1, ZX = KX + 4, ZC = 21;     // the end row (hoppers, lava); the zombie's cell
// the ground east of the district the chest stands on
fill(X1 + 1, Y - 1, IF.z - 4, ZX + 2, Y - 1, IP.z1 + 3, 'stone');
// the folk's room
fill(IF.x, Y, IF.z, IF.x, IF.f - 1, IF.z, 'stone');
fill(IF.x - 2, IF.f, IF.z - 2, IF.x + 2, IF.f, IF.z + 2, 'stone');
fill(IF.x - 2, IF.f + 1, IF.z - 2, IF.x + 2, IF.f + 3, IF.z + 2, 'glass'); fill(IF.x - 1, IF.f + 1, IF.z - 1, IF.x + 1, IF.f + 2, IF.z + 1, 'air');
fill(IF.x - 2, IF.f + 4, IF.z - 2, IF.x + 2, IF.f + 4, IF.z + 2, 'stone_slab');
for (let k = -1; k <= 1; k++) { if (BDX === 0) bed(IF.x + k, IF.f + 1, IF.z + (BDZ > 0 ? -1 : 0)); else bed(IF.x + (BDX > 0 ? -1 : 0), IF.f + 1, IF.z + k - 0); }
const ironFolk = [-1, 0, 1].map((k) => (BDX === 0 ? summon('villager', IF.x + k + 0.5, IF.f + 1, IF.z + (BDZ > 0 ? 1 : -1) + 0.5) : summon('villager', IF.x + 1.5, IF.f + 1, IF.z + k + 0.5)));
console.log('   beds lie the way', BDX, BDZ);
// the keeper's floor and the end row, in glass, three high inside
fill(IP.x0 - 1, IF.f, IP.z0 - 1, KX + 1, IF.f + 4, IP.z1 + 1, 'glass');
fill(IP.x0, IF.f + 1, IP.z0, KX, IF.f + 3, IP.z1, 'air');
fill(IP.x0, IF.f, IP.z0, IP.x1, IF.f, IP.z1, 'stone');
fill(IP.x0 - 1, IF.f + 5, IP.z0 - 1, KX + 1, IF.f + 5, IP.z1 + 1, 'stone_slab');
for (let z = IP.z0; z <= IP.z1; z++) set(KX, IF.f, z, z < ZC ? 'hopper_south' : (z > ZC ? 'hopper_north' : 'hopper'));
for (let y = Y + 1; y < IF.f; y++) set(KX, y, ZC, 'hopper');
set(KX, Y, ZC, 'chest');
fill(IP.x0, Y, ZC, IP.x0, IF.f - 1, ZC, 'stone');
// the lava over its signs: under it (the keeper's middle goes through them), and on the side it would run out
for (let z = IP.z0; z <= IP.z1; z++) { set(KX, IF.f + 2, z, 'oak_sign'); set(IP.x1, IF.f + 3, z, 'oak_sign'); }
for (let z = IP.z0; z <= IP.z1; z++) set(KX, IF.f + 3, z, 'lava');
// the water: a row of springs at the far end, seven cells of running water to the end row
for (let z = IP.z0; z <= IP.z1; z++) set(IP.x0, IF.f + 1, z, 'water');
// the zombie in its cart, in glass under stone
fill(ZX - 1, IF.f, ZC - 1, ZX + 1, IF.f + 3, ZC + 1, 'glass');
fill(ZX, Y, ZC, ZX, IF.f, ZC, 'stone');
fill(ZX, IF.f + 1, ZC, ZX, IF.f + 3, ZC, 'air');
set(ZX, IF.f + 1, ZC, 'rail');
fill(ZX - 1, IF.f + 4, ZC - 1, ZX + 1, IF.f + 4, ZC + 1, 'stone');
fill(ZX - 1, IF.f + 5, ZC - 1, ZX + 1, IF.f + 5, ZC + 1, 'stone_slab');
stand(KX, Y, IP.z1 + 2); F(200);
summon('minecart', ZX + 0.5, IF.f + 1, ZC + 0.5); F(20);
const ironZombie = summon('zombie', ZX + 0.5, IF.f + 1.2, ZC + 0.5); F(90);
for (const [x, z] of [[X1 + 2, IF.z - 3], [ZX + 1, IF.z - 3], [X1 + 2, IP.z1 + 2], [ZX + 1, IP.z1 + 2], [KX + 2, ZC + 3]]) set(x, Y, z, 'torch');
sign(KX - 1, Y, ZC + 1, '철 농장: 위의 마을 사람 셋이 수레에 탄 좀비를 무서워해 35초쯤마다 철 수호병을 부릅니다. 물에 밀려 용암에 쓰러지고 철이 이 상자로 (한 시간에 400개쯤)');

// ================================================================ 10. the mob tower
// (v3.4, 11-21, built anew) Four dark floors. On each, three strips of floor two cells deep between two
// trenches of running water: whatever comes steps into a trench within seconds and is carried to the hole in
// the middle (signs in it at the water's height: the water stops, the mob goes through). The fall of 37
// blocks kills (a witch too), on twelve hoppers that fill six chests on the ground.
// One waits 24 blocks to the north of it at the height of its middle (the ladder by the district's edge):
// every cell of the floors is 24 to 35 blocks away (nearer nothing comes), the bottom of the shaft 52 (past
// 56 a monster is gone at once: the old tower lost four in ten of them falling), the land 66 (nothing comes there).
const MT = { x0: 44, x1: 61, z0: 40, z1: 49, fs: [Y + 38, Y + 42, Y + 46, Y + 50] };
const HX = 52, TR = [MT.z0 + 2, MT.z0 + 3, MT.z0 + 6, MT.z0 + 7], SZ0 = MT.z0 + 2, SZ1 = MT.z0 + 7;
for (const f of MT.fs) {
  fill(MT.x0 - 1, f - 1, MT.z0 - 1, MT.x1 + 1, f - 1, MT.z1 + 1, 'stone');
  for (const z of [MT.z0, MT.z0 + 4, MT.z0 + 8]) fill(MT.x0, f, z, MT.x1, f, z + 1, 'stone');
  for (const [a, b, c, d] of [[MT.x0 - 1, MT.z0 - 1, MT.x1 + 1, MT.z0 - 1], [MT.x0 - 1, MT.z1 + 1, MT.x1 + 1, MT.z1 + 1], [MT.x0 - 1, MT.z0, MT.x0 - 1, MT.z1], [MT.x1 + 1, MT.z0, MT.x1 + 1, MT.z1]]) fill(a, f, b, c, f + 2, d, 'stone');
  fill(HX, f - 1, SZ0, HX + 1, f - 1, SZ1, 'air');
  fill(HX, f, MT.z0 + 4, HX + 1, f, MT.z0 + 5, 'air');
}
const MTOP = MT.fs[MT.fs.length - 1];
fill(MT.x0 - 1, MTOP + 3, MT.z0 - 1, MT.x1 + 1, MTOP + 3, MT.z1 + 1, 'stone');
fill(MT.x0 - 1, MTOP + 4, MT.z0 - 1, MT.x1 + 1, MTOP + 4, MT.z1 + 1, 'glass');
for (const f of MT.fs) { for (const z of TR) { set(HX, f, z, 'oak_sign'); set(HX + 1, f, z, 'oak_sign'); } }
for (const f of MT.fs) { for (const z of TR) { set(MT.x0, f, z, 'water'); set(MT.x1, f, z, 'water'); } }
// the shaft and what is under it
fill(HX - 1, Y + 1, SZ0 - 1, HX + 2, MT.fs[0] - 2, SZ1 + 1, 'glass'); fill(HX, Y + 1, SZ0, HX + 1, MT.fs[0] - 2, SZ1, 'air');
for (let z = SZ0; z <= SZ1; z++) { set(HX + 1, Y, z, 'hopper_west'); set(HX, Y, z, 'hopper_west'); set(HX - 1, Y, z, 'chest'); }
fill(HX + 2, Y, SZ0 - 1, HX + 2, Y, SZ1 + 1, 'stone'); fill(HX, Y, SZ0 - 1, HX + 1, Y, SZ0 - 1, 'stone'); fill(HX, Y, SZ1 + 1, HX + 1, Y, SZ1 + 1, 'stone');
sign(HX - 2, Y, SZ0 - 1, '몹 타워: 위의 어두운 방 네 층에서 생긴 몬스터가 물에 실려 떨어져 죽고, 떨어뜨린 것이 이 상자들에');
// where to wait
const AF = { x: 52, z: 16, y: Y + 44 };
ok(blk(AF.x, Y, AF.z) === 0 && blk(AF.x, Y, AF.z + 1) === 0, 'the place of the ladder is free');
fill(AF.x, Y, AF.z, AF.x, AF.y - 1, AF.z, 'stone');
fill(AF.x, Y, AF.z + 1, AF.x, AF.y, AF.z + 1, 'ladder[facing=south]');
fill(AF.x - 2, AF.y, AF.z - 1, AF.x + 2, AF.y, AF.z, 'stone');
for (const [x, z] of [[AF.x - 2, AF.z - 1], [AF.x + 2, AF.z - 1], [AF.x - 2, AF.z], [AF.x + 2, AF.z]]) set(x, AF.y + 1, z, 'torch');
const AFS = [AF.x, AF.y + 1, AF.z];
sign(AF.x + 1, Y, AF.z + 1, '기다리는 곳: 이 사다리 꼭대기에서 기다리면 몬스터가 남쪽의 몹 타워에서만 생깁니다 (크리에이티브에서도 생깁니다)');
sign(AF.x - 1, AF.y + 1, AF.z - 1, '여기서 기다리세요. 남쪽 타워의 네 층에서 몬스터가 생겨 떨어집니다');

// ================================================================ light, so that nothing comes on the floor at night
for (let x = X0 + 3; x <= X1; x += 6) for (let z = Z0 + 3; z <= Z1; z += 6) { let xx = x, k = 0; while (k < 4 && (blk(xx, Y, z) !== 0 || blk(xx, Y - 1, z) !== id('stone'))) { xx++; k++; } if (blk(xx, Y, z) === 0 && blk(xx, Y - 1, z) === id('stone')) set(xx, Y, z, 'torch'); }
// (and the ground east of it, under the iron farm: in its shade monsters came by day)
for (let x = X1 + 2; x <= ZX + 2; x += 3) for (let z = IF.z - 3; z <= IP.z1 + 2; z += 3) { if (blk(x, Y, z) === 0 && blk(x, Y - 1, z) === id('stone')) set(x, Y, z, 'torch'); }
F(120);
// ((v3.4, 11-21) and on what is built: no dark top of a whole block is left up to 14 over the floor - the one who
// waits for the tower is within 48 blocks of the machines' roofs now, and a monster in the folk's room would be their end)
{
  s.poke('tday', 0.75); F(20);
  let put = 0;
  for (let pass = 0; pass < 8; pass++) {
    const spots = [];
    for (let x = X0 - 1; x <= ZX + 3; x++) for (let z = IF.z - 5; z <= Z1 + 1; z++) for (let y = Y; y <= Y + 14; y++) {
      if (call(() => fn.cOK(x, z)) !== 1) continue;
      if (call(() => fn.spawnSpot(x, y, z, 2)) === 1 && !spots.some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) + Math.abs(p[2] - z) < 6)) spots.push([x, y, z]);
    }
    if (!spots.length) break;
    for (const [x, y, z] of spots) { set(x, y, z, 'torch'); put++; console.log('   a torch at', x, y, z, 'on', key(x, y - 1, z)); }
    F(20);
  }
  let left = 0;
  for (let x = X0 - 1; x <= ZX + 3; x++) for (let z = IF.z - 5; z <= Z1 + 1; z++) for (let y = Y; y <= Y + 14; y++) if (call(() => fn.cOK(x, z)) === 1 && call(() => fn.spawnSpot(x, y, z, 2)) === 1) left++;
  ok(left === 0, `lit at night: ${put} more torches on roofs and in corners, dark places left ${left}`);
  s.poke('tday', 0.25); F(20);
}
// the villagers take their jobs
stand(VH.x + 8, Y + 3, VH.z + 3);
const profOf = (e) => Math.floor(arr('EVAR')[e - 1] / 2) % 16;
{ let n = 0; while (n < 400 && villagers.some((e) => profOf(e) === 0)) { F(10); n++; } }
ok(villagers.every((e) => arr('ET')[e - 1] === M('villager') && profOf(e) > 0), `the eight of the hall have their jobs: ${villagers.map(profOf).join(',')}`);
ok(new Set(villagers.slice(0, 7).map(profOf)).size === 7, 'seven different jobs');
ok(villagers.every((e, i) => arr('EY')[e - 1] < Y - 0.7 && Math.floor(arr('EX')[e - 1]) === VH.x + 2 * i && Math.floor(arr('EZ')[e - 1]) === VH.z), `each in its pit (${villagers.map((e) => (arr('EY')[e - 1] - Y).toFixed(1)).join(' ')})`);

// ================================================================ trying them
const tryMachines = () => {
  s.poke('gameMode', 0); s.poke('hp', 20); s.poke('food', 20);
  const keepAlive = () => { s.poke('hp', 20); s.poke('food', 20); s.poke('dead', 0); };
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const T = (n) => !only || only.includes(String(n));
  // 1. the furnace
  if (T(1)) {
    stand(SM.x + 2, Y, SM.z + 2, 0);
    chestPut(SM.x, Y + 3, SM.z, [['iron_ore', 3]]); chestPut(SM.x - 1, Y + 2, SM.z, [['coal', 2]]);
    F(60 * 60);
    ok(chestCount(SM.x + 1, Y, SM.z, 'iron_ingot') === 3, `the furnace: 3 ore smelted into the chest under it (${chestCount(SM.x + 1, Y, SM.z, 'iron_ingot')})`);
    chestPut(SM.x + 1, Y, SM.z, EMPTY); chestPut(SM.x - 1, Y + 2, SM.z, [['coal', 16]]);
  }
  // 2. the hens
  if (T(2)) {
    stand(EG.x + 2, Y, EG.z + 2, 0);
    ok(hens.every((e) => arr('ET')[e - 1] === M('chicken')), 'the hens are in their cell');
    hens.forEach((e) => { arr('ECNV')[e - 1] = 0.5; arr('EAGE')[e - 1] = 0; }); F(60 * 8);
    ok(chestCount(EG.x + 1, Y, EG.z, 'egg') >= 1, `an egg laid went into the chest (${chestCount(EG.x + 1, Y, EG.z, 'egg')})`);
    chestPut(EG.x + 1, Y, EG.z, EMPTY);
  }
  // 3. cobblestone
  if (T(3)) {
    stand(CG.x + 3, Y, CG.z - 3, 0);
    ok(key(CG.x + 3, Y + 1, CG.z) === 'cobblestone', `cobblestone where the lava meets the water (${key(CG.x + 3, Y + 1, CG.z)}; ${[1, 2, 3, 4].map((k) => key(CG.x + k, Y + 1, CG.z)).join(',')})`);
    let made = 0;
    for (let k = 0; k < 3; k++) { set(CG.x + 3, Y + 1, CG.z, 'air'); F(60 * 4); if (key(CG.x + 3, Y + 1, CG.z) === 'cobblestone') made++; }
    ok(made === 3 && key(CG.x + 4, Y + 1, CG.z) === 'lava' && key(CG.x + 1, Y + 1, CG.z) === 'water', `taken three times, there again three times (${made}); the lava and the water still there`);
  }
  // 4. the wheat
  if (T(4)) {
    stand(WF.x - 2, Y, WF.z + 5, 0);
    press(...WFB); F(60 * 45);
    const got = chestCount(WF.x + 8, Y, WF.z + 4, I_('wheat'));
    ok(key(WF.x + 3, Y + 2, WF.z + 2).startsWith('water'), `the button poured water over the bed (${key(WF.x + 3, Y + 2, WF.z + 2)})`);
    ok(got >= 16, `the washed wheat is in the chest at the end: ${got} of 18 (seeds ${chestCount(WF.x + 8, Y, WF.z + 4, 'wheat_seeds')})`);
    press(...WFB); F(60 * 12);
    ok(blk(WF.x + 3, Y + 2, WF.z + 2) === 0 && blk(WF.x + 1, Y + 2, WF.z + 2) === 0, `the button again: the water is gone (${key(WF.x + 3, Y + 2, WF.z + 2)})`);
    ok(key(WF.x + 3, Y + 1, WF.z + 2).startsWith('farmland') && key(WF.x + 3, Y + 1, WF.z).startsWith('water'), `the soil is still soil, its water still there (${key(WF.x + 3, Y + 1, WF.z + 2)})`);
    s.poke('gameMode', 1); plantWheat(); s.poke('gameMode', 0);
    chestPut(WF.x + 8, Y, WF.z + 4, EMPTY);
  }
  // 5. the cane: grown to three (put there), cut, in the chest
  if (T(5)) {
    stand(CF.x + 9, Y, CF.z + 2, 0);
    ok(key(CF.x + 3, Y + 2, CF.z + 1) === 'reeds' && key(CF.x + 6, Y + 1, CF.z).startsWith('water'), `the canes stand by the stream (${key(CF.x + 3, Y + 2, CF.z + 1)}, ${key(CF.x + 6, Y + 1, CF.z)})`);
    for (let k = 1; k <= 6; k++) set(CF.x + k, Y + 3, CF.z + 1, 'reeds');
    F(30);
    for (let k = 1; k <= 6; k++) call(() => fn.setBlock(CF.x + k, Y + 4, CF.z + 1, id('reeds')));
    F(60 * 25);
    ok(key(CF.x + 3, Y + 3, CF.z + 1) !== 'reeds' && key(CF.x + 3, Y + 2, CF.z + 1) === 'reeds', `the pistons cut them at two (the foot stays): ${key(CF.x + 3, Y + 3, CF.z + 1)}`);
    const all = chestAll(CF.x + 8, Y, CF.z), cane = Object.values(all).reduce((a, b) => a + b, 0);
    ok(cane >= 9, `the cut cane is in the chest: ${cane} of 12 (${JSON.stringify(all)})`);
    chestPut(CF.x + 8, Y, CF.z, EMPTY);
  }
  // 6. the hall: the last one's books change when its lectern is put again
  if (T(6)) {
    stand(VH.x + 14, Y, VH.z - 2, 0);
    const last = villagers[7], v0 = arr('EVAR')[last - 1];
    set(VH.x + 14, Y, VH.z - 1, 'air'); { let n = 0; while (n < 300 && profOf(last) !== 0) { F(10); n++; } }
    ok(profOf(last) === 0, 'the lectern broken: the one who never traded has no job');
    set(VH.x + 14, Y, VH.z - 1, 'lectern'); { let n = 0; while (n < 300 && profOf(last) === 0) { F(10); n++; } }
    ok(profOf(last) === profOf(villagers[0]) && arr('EVAR')[last - 1] !== v0, `put again: a librarian again, with other books (${v0} -> ${arr('EVAR')[last - 1]})`);
  }
  // 7. beds and bread: a child
  if (T(7)) {
    stand(BR.x + 7, Y, BR.z + 2, 0);
    const before = mobsOf('villager').length;
    for (let r = 0; r < 4 && mobsOf('villager').length === before; r++) {
      breeders.forEach((e) => { for (let k = 0; k < 3; k++) call(() => fn.dropItem(id('bread'), 1, 0, arr('EX')[e - 1], Y + 0.5, arr('EZ')[e - 1], 0)); });
      let n = 0; while (n < 300 && mobsOf('villager').length === before) { F(10); n++; keepAlive(); }
      console.log('   breeders', breeders.map((e) => `food ${Math.floor(arr('ETG')[e - 1] / 16 ** 10)} love ${arr('ELOVE')[e - 1].toFixed(0)} at ${(arr('EX')[e - 1] - BR.x).toFixed(1)},${(arr('EZ')[e - 1] - BR.z).toFixed(1)}`).join(' | '), 'beds', call(() => fn.bedsNear(breeders[0])));
    }
    ok(mobsOf('villager').length === before + 1, `bread thrown to the two: a child (${before} -> ${mobsOf('villager').length})`);
    // (the child taken out again: the map starts with the two)
    const child = mobsOf('villager').find((e) => arr('ESZ')[e - 1] < 1); if (child) arr('ET')[child - 1] = 0;
    breeders.forEach((e) => { arr('ELOVE')[e - 1] = 0; arr('ETG')[e - 1] = 0; }); clearItems();
  }
  // 9. iron: left to itself for five minutes of the day
  if (T(9)) {
    stand(KX, Y, IP.z1 + 2, 0); s.poke('tday', 0.3); F(60);
    ok(ironFolk.every((e) => arr('ET')[e - 1] === M('villager') && arr('EY')[e - 1] > IF.f), 'the three are up in their room');
    const zb = mobsOf('zombie');
    ok(zb.length === 1 && arr('EAIR')[zb[0] - 1] >= 1000 && arr('EOWN')[zb[0] - 1] === 5 && Math.floor(arr('EX')[zb[0] - 1]) === ZX, `the zombie sits in its cart and is one that stays (${zb.length}, seat ${zb.length ? arr('EAIR')[zb[0] - 1] : '-'}, EOWN ${zb.length ? arr('EOWN')[zb[0] - 1] : '-'})`);
    ok(key(KX, IF.f + 3, ZC) === 'lava' && key(KX, IF.f + 3, IP.z0) === 'lava' && key(KX, IF.f + 2, ZC) === 'oak_sign' && key(IP.x1, IF.f + 3, ZC) === 'oak_sign' && key(KX, IF.f + 1, ZC).startsWith('water') && blk(IP.x1, IF.f + 2, ZC) === 0 && blk(KX, IF.f + 4, ZC) === id('glass'), `the lava hangs over its signs, the water runs to the end row under it (${key(KX, IF.f + 3, ZC)} / ${key(KX, IF.f + 2, ZC)} / ${key(KX, IF.f + 1, ZC)})`);
    mobsOf('golem').forEach((e) => { arr('ET')[e - 1] = 0; }); chestPut(KX, Y, ZC, EMPTY);
    let came = 0, was = 0, off = 0, life = 0;
    const SECS = 300;
    for (let k = 0; k < SECS; k++) {
      F(60); keepAlive();
      const g = mobsOf('golem'); if (g.length > was) came += g.length - was; was = g.length; if (g.length) life++;
      g.forEach((e) => { const x = arr('EX')[e - 1], z = arr('EZ')[e - 1], y = arr('EY')[e - 1]; if (!(x > IP.x0 && x < KX + 1 && z > IP.z0 && z < IP.z1 + 1 && y > IF.f + 0.5)) off++; });
    }
    const iron = chestCount(KX, Y, ZC, 'iron_ingot');
    ok(came >= 6 && off === 0, `five minutes: ${came} keepers came, all on the floor in the glass (elsewhere ${off} times; one alive ${Math.round(life / SECS * 100)} % of the time)`);
    ok(iron >= 18, `their iron is in the chest on the ground: ${iron} (${JSON.stringify(chestAll(KX, Y, ZC))}) - ${iron * 12} an hour`);
    { const z2 = mobsOf('zombie'); ok(z2.length === 1 && arr('EHP')[z2[0] - 1] >= 20, `the zombie is as it was after the five minutes of daylight (hp ${z2.length ? arr('EHP')[z2[0] - 1] : '-'})`); }
    mobsOf('golem').forEach((e) => { arr('ET')[e - 1] = 0; }); clearItems();
  }
  // 10. the tower, waited at from the top of the ladder: monsters come only in it, fall, and leave their things
  if (T(10)) {
    stand(AFS[0], AFS[1], AFS[2], 0); cmd('/gamerule doMobSpawning true'); s.poke('difficulty', 2); s.poke('tday', 0.75); F(30);
    F(60 * 2);
    const f0 = MT.fs[0];
    ok(key(HX, f0, TR[0]) === 'oak_sign' && key(HX + 1, MTOP, TR[3]) === 'oak_sign' && key(HX - 1, f0, TR[0]).startsWith('water') && blk(HX, f0 - 1, TR[0]) === 0 && blk(HX, f0 - 6, TR[0]) === 0 && blk(HX, Y + 1, TR[0]) === 0, `the water stops at the signs of the hole, the shaft is dry (${key(HX - 1, f0, TR[0])} | ${key(HX, f0, TR[0])} | under it ${key(HX, f0 - 1, TR[0])})`);
    const chests = () => { const all = {}; for (let z = SZ0; z <= SZ1; z++) for (const [k, v] of Object.entries(chestAll(HX - 1, Y, z))) all[k] = (all[k] || 0) + v; return all; };
    for (let z = SZ0; z <= SZ1; z++) chestPut(HX - 1, Y, z, EMPTY);
    let seen = 0, outside = 0, alive = 0;
    const MIN = Number(process.env.MIN || 6);
    for (let k = 0; k < 60 * MIN; k++) {
      F(60); keepAlive(); stand(AFS[0], AFS[1], AFS[2], 0);
      const ET = arr('ET'), MH = arr('MHOST'), EO = arr('EOWN');
      for (let i = 0; i < ET.length; i++) if (ET[i] > 0 && MH[ET[i] - 1] === 1 && EO[i] !== 5) { alive++; const x = arr('EX')[i], z = arr('EZ')[i], y = arr('EY')[i]; if (x > MT.x0 - 1 && x < MT.x1 + 2 && z > MT.z0 - 1 && z < MT.z1 + 2 && y > Y) seen++; else { outside++; if (process.env.DBG && outside % 10 === 1) console.log('   outside:', arr('MKEY')[ET[i] - 1], x.toFixed(1), y.toFixed(1), z.toFixed(1), 'light', call(() => fn.lightAt(x, y + 0.5, z))); } }
      if (k % 60 === 59) console.log(`   ${(k + 1) / 60} min: in the chests ${JSON.stringify(chests())}`);
    }
    const loot = chests();
    const total = Object.values(loot).reduce((a, b) => a + b, 0);
    ok(seen > 0 && outside === 0, `monsters came in the tower and nowhere else (seen in it ${seen} times, elsewhere ${outside}; ${(alive / (60 * MIN)).toFixed(1)} alive at a time)`);
    ok(total >= 20 * MIN, `${MIN} minutes of waiting: ${total} things in the chests under the shaft, ${Math.round(total * 60 / MIN)} an hour (${JSON.stringify(loot)})`);
    for (let z = SZ0; z <= SZ1; z++) { chestPut(HX - 1, Y, z, EMPTY); chestPut(HX, Y, z, EMPTY); chestPut(HX + 1, Y, z, EMPTY); }
    cmd('/gamerule doMobSpawning false'); const ET = arr('ET'), MH = arr('MHOST'), EO = arr('EOWN'); for (let i = 0; i < ET.length; i++) if (ET[i] > 0 && MH[ET[i] - 1] === 1 && EO[i] !== 5) ET[i] = 0;
  }
  // (what the iron farm made meanwhile is taken out: the map starts with empty chests and no keeper)
  mobsOf('golem').forEach((e) => { arr('ET')[e - 1] = 0; });
  chestPut(KX, Y, ZC, EMPTY); for (let z = IP.z0; z <= IP.z1; z++) chestPut(KX, IF.f, z, EMPTY); for (let y = Y + 1; y < IF.f; y++) chestPut(KX, y, ZC, EMPTY);
  clearItems(); s.poke('gameMode', 1); s.poke('tday', 0.25);
};
if (!process.env.NOTRY) tryMachines();

// ================================================================ the map written
stand(X0 + 2, Y, Z0 + 2, 0); F(30); clearItems();
mobsOf('golem').forEach((e) => { arr('ET')[e - 1] = 0; });
ok(mobsOf('zombie').length === 1 && mobsOf('minecart').length === 1, `the zombie and its cart are of the map (${mobsOf('zombie').length}, ${mobsOf('minecart').length})`);
if (process.env.DBG) console.log('   villagers at', mobsOf('villager').map((e) => [arr('EX')[e - 1], arr('EY')[e - 1], arr('EZ')[e - 1]].map((v) => Math.round(v)).join(',')).join(' | '));
ok(mobsOf('villager').length === 13 && mobsOf('chicken').length === 3 && mobsOf('cow').length === 2 && mobsOf('sheep').length === 2 && mobsOf('pig').length === 2, `the folk of the map: villagers ${mobsOf('villager').length}, hens ${mobsOf('chicken').length}, cows ${mobsOf('cow').length}, sheep ${mobsOf('sheep').length}, pigs ${mobsOf('pig').length}`);
if (process.env.PICS) {
  const look = async (name, x, y, z, yaw, pitch) => { stand(x, y, z, 1); s.poke('yaw', yaw); s.poke('pitch', pitch); F(40); await s.png(`test/example_${name}.png`); };
  s.poke('helpT', 0);
  await look('all', X0 - 6, Y + 26, Z0 - 6, 45, -32);
  await look('farms', 30, Y + 9, 15, 0, -30);
  await look('hall', 28, Y + 6, 31, 0, -40);
  await look('tower', 30, Y + 30, 60, 125, 5);
  await look('iron', 66, Y + 14, 14, -50, -15);
}
cmd('/gamerule doMobSpawning true'); cmd('/gamerule doDaylightCycle true'); cmd('/gamerule doWeatherCycle true');
call(() => fn.mapCopy());
const text = String(s.peek('$CLIPBOARD'));
ok(text.startsWith(`BWMAP1|${SEED}|-|3|0|`) && text.split('|').length === 11, `the map as a text: ${text.length} letters, ${s.peek('EDX').length} blocks, ${text.split('|')[9].split(';').length - 1} kept mobs`);
if (!fails && !process.env.ONLY) { fs.writeFileSync(new URL('../../../example_map.txt', import.meta.url), text); console.log('wrote example_map.txt'); }
console.log(fails ? `FAILED ${fails}` : 'all ok');
process.exit(fails ? 1 : 0);

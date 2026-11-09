// v2.0 in the sim: node test/v20.mjs [seed]
import { createSim } from '../sim.mjs';
const SEED = Number(process.argv[2] || 1234);
const s = createSim({ consts: { AUTOSEED: SEED, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 6).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
console.log('playing after', n, 'frames; at', s.peek('px').toFixed(1), s.peek('py').toFixed(1), s.peek('pz').toFixed(1));
const fn = s.fn, call = (f) => s.as('pen', f);
const B = (x, y, z) => call(() => fn.blockAt(x, y, z));
const cmd = (t) => { call(() => fn.runCommand(t)); const c = s.peek('CHT'); console.log(t.padEnd(56), '->', c[c.length - 1]); };
s.poke('tday', 0.25);
F(60);
await s.png('test/v20_start.png');
const X = Math.floor(s.peek('px')), Y = Math.floor(s.peek('py')), Z = Math.floor(s.peek('pz'));
// a little gallery of shaped blocks in front of the player
s.poke('yaw', 0); s.poke('pitch', -25);
cmd('/fill ~-6 ~-1 ~2 ~6 ~5 ~12 air');
cmd('/fill ~-6 ~-1 ~2 ~6 ~-1 ~12 stone_bricks');
const put = (dx, dz, b) => cmd(`/setblock ~${dx} ~ ~${dz} ${b}`);
put(-4, 4, 'oak_stairs'); put(-3, 4, 'oak_stairs[facing=east]'); put(-2, 4, 'stone_slab'); put(-1, 4, 'stone_slab[type=top]');
put(0, 4, 'oak_fence'); put(1, 4, 'oak_fence'); put(2, 4, 'cobblestone_wall'); put(3, 4, 'glass_pane'); put(4, 4, 'glass_pane');
put(-4, 7, 'oak_door'); cmd('/setblock ~-4 ~1 ~7 oak_door[half=upper]'); put(-2, 7, 'red_bed'); cmd('/setblock ~-2 ~ ~8 red_bed[half=top]');
put(0, 7, 'lantern'); put(1, 7, 'campfire'); put(2, 7, 'anvil'); put(3, 7, 'flower_pot'); put(4, 7, 'potted_poppy');
put(-4, 10, 'white_carpet'); put(-3, 10, 'chest'); put(-2, 10, 'ladder'); put(-1, 10, 'oak_trapdoor'); put(0, 10, 'oak_fence_gate'); put(1, 10, 'cauldron'); put(2, 10, 'blue_banner'); put(3, 10, 'bell'); put(4, 10, 'oak_sign');
F(30);
await s.png('test/v20_gallery.png');
// commands
cmd('/give @s diamond_pickaxe');
cmd('/give @p oak_planks 64');
cmd('/gamemode spectator'); cmd('/gamemode adventure'); cmd('/gamemode creative');
cmd('/time set night'); cmd('/time query daytime'); cmd('/weather thunder'); cmd('/weather clear');
cmd('/summon zombie ~ ~ ~5'); cmd('/kill @e[type=zombie]'); cmd('/summon villager ~2 ~ ~2');
cmd('/difficulty hard'); cmd('/gamerule keepInventory true'); cmd('/gamerule randomTickSpeed');
cmd('/tp ~ ~10 ~'); cmd('/tp @s ^ ^ ^5'); cmd('/xp add @s 30 levels'); cmd('/xp query @s');
cmd('/effect give @s minecraft:speed 20 1'); cmd('/effect clear @s');
cmd('/locate village'); cmd('/locate desert_pyramid'); cmd('/locatebiome jungle');
cmd('/clone ~-6 ~-1 ~2 ~6 ~5 ~12 ~20 ~ ~2');
cmd('/title @a title 안녕'); cmd('/execute at @s run setblock ~ ~-1 ~ gold_block'); cmd('/seed'); cmd('/help fill'); cmd('/foo');
F(30);
console.log('kinds', s.peek('NKINDS') ?? '', 'xp', s.peek('xpLevel'), 'mode', s.peek('gameMode'), 'diff', s.peek('difficulty'), 'mobs', s.peek('ET').filter(t => t > 0).length);
F(300);
console.log('ok after 300 more frames');

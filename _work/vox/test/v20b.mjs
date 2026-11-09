// v2.0 pictures: the gallery, the screens, structures. node test/v20b.mjs [what]
import { createSim } from '../sim.mjs';
const WHAT = process.argv[2] || 'all';
const s = createSim({ consts: { AUTOSEED: Number(process.env.SEED || 1234), TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 6).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
const cmd = (t) => { call(() => fn.runCommand(t)); const c = s.peek('CHT'); console.log(t.padEnd(50), '->', c[c.length - 1]); };
const settle = () => { let k = 0; F(5); while (s.peek('nChunks') < s.peek('NOFF') && k < 3000) { F(1); k++; } F(20); };
const at = (x, y, z, yaw, pitch) => { s.poke('px', x); s.poke('py', y); s.poke('pz', z); s.poke('yaw', yaw); s.poke('pitch', pitch); s.poke('flying', 1); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
s.poke('tday', 0.25);
s.poke('showDbg', 0); s.poke('helpT', 0);
F(30);
const X = Math.floor(s.peek("px")), Y = 96, Z = Math.floor(s.peek("pz"));
if (WHAT === 'all' || WHAT === 'gallery') {
  cmd(`/fill ${X - 8} ${Y - 1} ${Z + 2} ${X + 8} ${Y + 6} ${Z + 14} air`);
  cmd(`/fill ${X - 8} ${Y - 1} ${Z + 2} ${X + 8} ${Y - 1} ${Z + 14} smooth_stone`);
  const rows = [
    ['oak_stairs', 'birch_stairs[facing=east]', 'spruce_stairs[facing=west]', 'stone_slab', 'stone_slab[type=top]', 'oak_fence', 'oak_fence', 'oak_fence_gate', 'cobblestone_wall', 'cobblestone_wall', 'glass_pane', 'glass_pane', 'iron_bars', 'red_stained_glass_pane'],
    ['red_bed', 'lantern', 'campfire', 'anvil', 'flower_pot', 'potted_poppy', 'potted_birch_sapling', 'cauldron', 'blue_banner', 'bell', 'oak_sign', 'chest', 'grindstone', 'lectern'],
    ['white_wool', 'orange_wool', 'magenta_concrete', 'light_blue_terracotta', 'yellow_glazed_terracotta', 'lime_concrete_powder', 'granite', 'polished_limestone', 'slate', 'quartz_pillar', 'aquastone_bricks', 'blackrock', 'gilded_blackrock', 'tnt'],
    ['white_carpet', 'red_carpet', 'oak_trapdoor', 'oak_pressure_plate', 'stone_button', 'lever', 'rail', 'spark_wire', 'repeater', 'cake', 'skeleton_skull', 'scaffolding', 'hopper', 'brewing_stand'],
  ];
  rows.forEach((r, ri) => r.forEach((b, i) => cmd(`/setblock ${X - 7 + i} ${Y} ${Z + 4 + ri * 3} ${b}`)));
  cmd(`/setblock ${X - 7} ${Y} ${Z + 8} red_bed`); cmd(`/setblock ${X - 7} ${Y} ${Z + 9} red_bed[half=top]`);
  cmd(`/setblock ${X + 7} ${Y} ${Z + 16} oak_door`); cmd(`/setblock ${X + 7} ${Y + 1} ${Z + 16} oak_door[half=upper]`);
  at(X + 0.5, Y + 5, Z - 2, 0, -38);
  F(40);
  await s.png('test/v20_gallery.png');
}
if (WHAT === 'all' || WHAT === 'ui') {
  call(() => fn.uiOpen(5)); s.poke('uiTab', 0); F(3); await s.png('test/v20_creative0.png');
  s.poke('uiTab', 3); F(3); await s.png('test/v20_creative3.png');
  s.poke('uiTab', 7); F(3); await s.png('test/v20_creative7.png');
  call(() => fn.uiClose());
}
const visit = async (name, file, dy = 30, pitch = -55) => {
  cmd(`/locate ${name}`);
  call(() => fn.locateStruct(fn.structByName(name), X, Z));
  if (!s.peek('locOk')) { console.log('no', name); return; }
  const lx = s.peek('locX'), lz = s.peek('locZ');
  at(lx + 0.5, 100, lz - 20.5, 0, pitch); settle();
  call(() => fn.findTop(lx, lz)); const ty = s.peek('topY');
  at(lx + 0.5, ty + dy, lz - dy * 0.9, 0, -48); F(60);
  await s.png(file);
};
if (WHAT === 'all' || WHAT === 'structs') {
  await visit('village', 'test/v20_village.png', 26, -40);
  await visit('desert_pyramid', 'test/v20_pyramid.png', 22, -40);
  await visit('jungle_temple', 'test/v20_jungle.png', 18, -40);
  await visit('igloo', 'test/v20_igloo.png', 10, -35);
  await visit('pillager_outpost', 'test/v20_outpost.png', 26, -30);
  await visit('swamp_hut', 'test/v20_swamp.png', 14, -35);
}
console.log('done');

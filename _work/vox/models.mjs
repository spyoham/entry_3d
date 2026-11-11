// Box models of the shaped blocks (slabs, stairs, fences, doors ...), in 1/16 of a block.
// A box: [x0, y0, z0, x1, y1, z1] drawn with the block's own textures (by face), or
//        [x0, y0, z0, x1, y1, z1, 'tex'] with one texture on every face, or
//        [x0, y0, z0, x1, y1, z1, 'tex', 'X'] two crossed upright quads (a plant, a flame).
// col: the boxes a body hits ('none', or a list; by default the boxes themselves).
// conn: the arms drawn toward joined neighbours (1 fence, 2 wall, 3 pane): ARMS[conn][side].
export const MODELS = {};
const M = (name, boxes, col) => { MODELS[name] = { boxes, col: col === undefined ? boxes.filter(b => b[7] !== 'X') : col }; };

M('slab_b', [[0, 0, 0, 16, 8, 16]]);
// (v2.3.2) flowing water and lava: level 1 (by the source) 14/16 high down to level 7, 2/16; nothing hits them
for (let L = 1; L <= 7; L++) M(`liq_${L}`, [[0, 0, 0, 16, 16 - 2 * L, 16]], 'none');
M('slab_t', [[0, 8, 0, 16, 16, 16]]);
// stairs facing f (the high side toward 0 +z, 1 +x, 2 -z, 3 -x), half 0 bottom / 1 upside down
const STEP = [[0, 8, 16, 16], [8, 0, 16, 16], [0, 0, 16, 8], [0, 0, 8, 16]];   // x0 z0 x1 z1
for (let f = 0; f < 4; f++) {
    const [x0, z0, x1, z1] = STEP[f];
    M(`stairs_${f}_0`, [[0, 0, 0, 16, 8, 16], [x0, 8, z0, x1, 16, z1]]);
    M(`stairs_${f}_1`, [[0, 8, 0, 16, 16, 16], [x0, 0, z0, x1, 8, z1]]);
}
// the post; the arms come from ARMS by the joined sides
M('fence', [[6, 0, 6, 10, 16, 10]], [[6, 0, 6, 10, 24, 10]]);
M('wall', [[4, 0, 4, 12, 16, 12]], [[4, 0, 4, 12, 24, 12]]);
M('pane', [[7, 0, 7, 9, 16, 9]]);
// sides: 0 +z, 1 +x, 2 -z, 3 -x
export const ARMS = {
    1: [[[7, 6, 10, 9, 9, 16], [7, 12, 10, 9, 15, 16]], [[10, 6, 7, 16, 9, 9], [10, 12, 7, 16, 15, 9]], [[7, 6, 0, 9, 9, 6], [7, 12, 0, 9, 15, 6]], [[0, 6, 7, 6, 9, 9], [0, 12, 7, 6, 15, 9]]],
    2: [[[5, 0, 12, 11, 13, 16]], [[12, 0, 5, 16, 13, 11]], [[5, 0, 0, 11, 13, 4]], [[0, 0, 5, 4, 13, 11]]],
    3: [[[7, 0, 9, 9, 16, 16]], [[9, 0, 7, 16, 16, 9]], [[7, 0, 0, 9, 16, 7]], [[0, 0, 7, 7, 16, 9]]],
    4: [[[6, 0, 11, 10, 1, 16]], [[11, 0, 6, 16, 1, 10]], [[6, 0, 0, 10, 1, 5]], [[0, 0, 6, 5, 1, 10]]],
};
// what a body hits of an arm (fences and walls are a jump and a half high)
export const ARMCOL = {
    1: [[6, 0, 10, 10, 24, 16], [10, 0, 6, 16, 24, 10], [6, 0, 0, 10, 24, 6], [0, 0, 6, 6, 24, 10]],
    2: [[5, 0, 12, 11, 24, 16], [12, 0, 5, 16, 24, 11], [5, 0, 0, 11, 24, 4], [0, 0, 5, 4, 24, 11]],
    3: [[7, 0, 9, 9, 16, 16], [9, 0, 7, 16, 16, 9], [7, 0, 0, 9, 16, 7], [0, 0, 7, 7, 16, 9]],
    4: [[6, 0, 11, 10, 1, 16], [11, 0, 6, 16, 1, 10], [6, 0, 0, 10, 1, 5], [0, 0, 6, 5, 1, 10]],
};
// gates: closed across x (0) or z (1); open: the posts only
M('gate_0', [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9], [2, 6, 7, 14, 9, 9], [2, 12, 7, 14, 15, 9], [6, 9, 7, 10, 12, 9]], [[0, 0, 6, 16, 24, 10]]);
M('gate_1', [[7, 5, 0, 9, 16, 2], [7, 5, 14, 9, 16, 16], [7, 6, 2, 9, 9, 14], [7, 12, 2, 9, 15, 14], [7, 9, 6, 9, 12, 10]], [[6, 0, 0, 10, 24, 16]]);
M('gateo_0', [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9], [0, 6, 9, 2, 15, 15], [14, 6, 9, 16, 15, 15]], 'none');
M('gateo_1', [[7, 5, 0, 9, 16, 2], [7, 5, 14, 9, 16, 16], [9, 6, 0, 15, 15, 2], [9, 6, 14, 15, 15, 16]], 'none');
// a panel on side s (doors, open trapdoors, ladders)
const SIDE = (s, t) => [[0, 0, 16 - t, 16, 16, 16], [16 - t, 0, 0, 16, 16, 16], [0, 0, 0, 16, 16, t], [0, 0, 0, t, 16, 16]][s];
for (let s = 0; s < 4; s++) {
    M(`door_${s}`, [SIDE(s, 3)]);
    M(`trapo_${s}`, [SIDE(s, 3)]);
    M(`ladder_${s}`, [SIDE(s, 1)], 'none');
}
M('trap_b', [[0, 0, 0, 16, 3, 16]]);
M('trap_t', [[0, 13, 0, 16, 16, 16]]);
M('plate', [[1, 0, 1, 15, 1, 15]], 'none');
M('button', [[5, 0, 6, 11, 2, 10]], 'none');
M('sign', [[7, 0, 7, 9, 9, 9], [0, 8, 7, 16, 16, 9]], 'none');
M('carpet', [[0, 0, 0, 16, 1, 16]]);
M('snow_layer', [[0, 0, 0, 16, 2, 16]]);
M('bed', [[0, 0, 0, 16, 9, 16]]);
M('banner', [[7, 0, 7, 9, 28, 9, 'oakPlanks'], [1, 26, 7, 15, 28, 9, 'oakPlanks'], [2, 6, 8, 14, 26, 9]], 'none');
M('lantern', [[5, 0, 5, 11, 7, 11], [6, 7, 6, 10, 9, 10]]);
M('chain', [[7, 0, 7, 9, 16, 9]]);
M('campfire', [[1, 0, 3, 15, 4, 7, 'oakBark'], [1, 0, 9, 15, 4, 13, 'oakBark'], [3, 3, 1, 7, 7, 15, 'oakBark'], [9, 3, 1, 13, 7, 15, 'oakBark'], [2, 1, 2, 14, 15, 14, null, 'X']], [[0, 0, 0, 16, 7, 16]]);
M('anvil', [[2, 0, 2, 14, 4, 14], [4, 4, 4, 12, 5, 12], [6, 5, 5, 10, 10, 11], [0, 10, 3, 16, 16, 13]]);
M('cauldron', [[0, 0, 0, 16, 16, 2], [0, 0, 14, 16, 16, 16], [0, 0, 2, 2, 16, 14], [14, 0, 2, 16, 16, 14], [2, 3, 2, 14, 4, 14]]);
M('hopper', [[0, 10, 0, 16, 16, 16], [4, 4, 4, 12, 10, 12], [6, 0, 6, 10, 4, 10]]);
M('lectern', [[0, 0, 0, 16, 2, 16], [4, 2, 4, 12, 13, 12], [0, 12, 1, 16, 16, 15]]);
M('bell', [[0, 0, 6, 2, 16, 10, 'ebonyPlanks'], [14, 0, 6, 16, 16, 10, 'ebonyPlanks'], [2, 13, 7, 14, 15, 9, 'ebonyPlanks'], [5, 4, 5, 11, 12, 11]], [[0, 0, 0, 16, 16, 16]]);
M('grindstone', [[4, 4, 2, 12, 16, 14], [1, 0, 6, 4, 10, 10, 'oakPlanks'], [12, 0, 6, 15, 10, 10, 'oakPlanks']]);
M('stonecutter', [[0, 0, 0, 16, 9, 16], [1, 9, 7, 15, 14, 9, 'bladeT']]);
M('table12', [[0, 0, 0, 16, 12, 16]]);
M('brewing', [[1, 0, 1, 15, 2, 15], [7, 2, 7, 9, 14, 9], [2, 2, 2, 6, 7, 6, 'glass'], [10, 2, 10, 14, 7, 14, 'glass']]);
M('slab6', [[0, 0, 0, 16, 6, 16]]);
M('cake', [[1, 0, 1, 15, 8, 15]]);
M('pot', [[5, 0, 5, 11, 6, 11]]);
M('head', [[4, 0, 4, 12, 8, 12]]);
M('rod', [[6, 0, 6, 10, 1, 10], [7, 1, 7, 9, 16, 9]]);
M('rail', [[0, 0, 0, 16, 1, 16]], 'none');
// (v2.5) rails going up (shape 2 to +x, 3 to -x, 4 to -z, 5 to +z): four steps
const RUP = { 2: (i) => [i * 4, i * 4, 0, i * 4 + 4, i * 4 + 1, 16], 3: (i) => [12 - i * 4, i * 4, 0, 16 - i * 4, i * 4 + 1, 16], 4: (i) => [0, i * 4, 12 - i * 4, 16, i * 4 + 1, 16 - i * 4], 5: (i) => [0, i * 4, i * 4, 16, i * 4 + 1, i * 4 + 4] };
for (const s of [2, 3, 4, 5]) M(`railup_${s}`, [0, 1, 2, 3].map(RUP[s]), 'none');
// (v2.5) a block on its way (pistons): nothing drawn, a whole cell hit
M('empty', [], [[0, 0, 0, 16, 16, 16]]);
// spark power. The wire: a dot, its arms (ARMS[4]) toward what it joins
M('dust', [[5, 0, 5, 11, 1, 11]], 'none');
// a box of the canonical model turned by g(x, y, z) -> [x, y, z] (the corners, then sorted)
const turnBox = (box, g) => {
    const [x0, y0, z0, x1, y1, z1, ...rest] = box;
    const p = g(x0, y0, z0), q = g(x1, y1, z1);
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2]), Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2]), ...rest];
};
// a floor model hung on the side a (the way from it to the block it is fixed to, D6:
// 0 -x, 1 +x, 2 -y floor, 3 +y ceiling, 4 -z, 5 +z): its floor goes onto that side, its z goes up
const ATTACH = [(x, y, z) => [y, z, 16 - x], (x, y, z) => [16 - y, z, x], (x, y, z) => [x, y, z], (x, y, z) => [x, 16 - y, z], (x, y, z) => [16 - x, z, y], (x, y, z) => [x, z, 16 - y]];
// a model made facing up (+y) turned to face d
const FACE6 = [(x, y, z) => [16 - y, x, z], (x, y, z) => [y, x, z], (x, y, z) => [x, 16 - y, z], (x, y, z) => [x, y, z], (x, y, z) => [x, z, 16 - y], (x, y, z) => [x, z, y]];
for (let a = 0; a < 6; a++) {
    M(`button_${a}`, [turnBox([5, 0, 6, 11, 2, 10], ATTACH[a])], 'none');
    M(`lever_${a}_0`, [turnBox([5, 0, 4, 11, 3, 12, 'cobble'], ATTACH[a]), turnBox([7, 2, 4, 9, 10, 6, 'planks'], ATTACH[a])], 'none');
    M(`lever_${a}_1`, [turnBox([5, 0, 4, 11, 3, 12, 'cobble'], ATTACH[a]), turnBox([7, 2, 10, 9, 10, 12, 'planks'], ATTACH[a])], 'none');
    M(`pbase_${a}`, [turnBox([0, 0, 0, 16, 12, 16], FACE6[a]), turnBox([6, 12, 6, 10, 16, 10, 'pistonRodT'], FACE6[a])]);
    M(`phead_${a}`, [turnBox([0, 12, 0, 16, 16, 16], FACE6[a]), turnBox([6, 0, 6, 10, 12, 10, 'pistonRodT'], FACE6[a])]);
}
// repeaters and comparators facing f (0 +z, 1 +x, 2 -z, 3 -x): along a (0 the back, 16 the front),
// across c; a torch 2 x 2 at (a, c), lit or not
const ALONG = [(a, c) => [c, a], (a, c) => [a, 16 - c], (a, c) => [16 - c, 16 - a], (a, c) => [16 - a, c]];
const rsTorch = (f, a, c, on) => { const p = ALONG[f](a, c), q = ALONG[f](a + 2, c + 2); return [Math.min(p[0], q[0]), 2, Math.min(p[1], q[1]), Math.max(p[0], q[0]), 7, Math.max(p[1], q[1]), on ? 'sparkTorchT' : 'sparkTorchOffT']; };
for (let f = 0; f < 4; f++) for (const on of [0, 1]) {
    for (let d = 1; d <= 4; d++) M(`rep_${f}_${d}_${on}`, [[0, 0, 0, 16, 2, 16], rsTorch(f, 2 + (d - 1) * 2, 7, on), rsTorch(f, 11, 7, on)], [[0, 0, 0, 16, 2, 16]]);
    for (const m of [0, 1]) M(`cmp_${f}_${m}_${on}`, [[0, 0, 0, 16, 2, 16], rsTorch(f, 2, 3, on), rsTorch(f, 2, 11, on), rsTorch(f, 12, 7, m)], [[0, 0, 0, 16, 2, 16]]);
}
// (v2.5) tripwire hooks on a wall a (the plate on it, the hook out from it; down a little when on), the string
for (const a of [0, 1, 4, 5]) for (const on of [0, 1]) M(`hook_${a}_${on}`, [turnBox([6, 0, 3, 10, 2, 13, 'planks'], ATTACH[a]), turnBox([7, 2, on ? 5 : 7, 9, 9, on ? 7 : 9, 'cobble'], ATTACH[a])], 'none');
M('trip_0', [[7, 1, 0, 9, 2, 16]], 'none');
M('trip_1', [[0, 1, 7, 16, 2, 9]], 'none');
M('pickle', [[6, 0, 6, 10, 6, 10], [9, 0, 3, 12, 4, 6]], 'none');
M('scaffold', [[0, 0, 0, 2, 16, 2], [14, 0, 0, 16, 16, 2], [0, 0, 14, 2, 16, 16], [14, 0, 14, 16, 16, 16], [0, 14, 0, 16, 16, 16]], 'none');
M('bamboo', [[6, 0, 6, 10, 16, 10]]);
M('lily', [[1, 0, 1, 15, 1, 15]]);
M('cactus', [[1, 0, 1, 15, 16, 15]]);
M('chestm', [[1, 0, 1, 15, 14, 15]]);
M('path', [[0, 0, 0, 16, 15, 16]]);
M('honey', [[1, 0, 1, 15, 15, 15]]);
M('turtle', [[3, 0, 3, 13, 7, 13]], 'none');
// a pot with a plant in it
export function pottedModel(tex) { return { boxes: [[5, 0, 5, 11, 6, 11, 'potT'], [4, 5, 4, 12, 15, 12, tex, 'X']], col: [[5, 0, 5, 11, 6, 11]] }; }

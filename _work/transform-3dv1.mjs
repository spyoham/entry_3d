#!/usr/bin/env node
// Rewrite 3D v1.ent:
//  - remove all recursive custom functions, replace with repeat_while_true +
//    wait_until_true(boolean_not(continue_repeat)) ("loop delay-removal" trick,
//    same pattern used throughout 3d_raymarching_optimized.ent)
//  - implement real near-plane (z) polygon clipping (Sutherland-Hodgman,
//    single plane) in the face-draw stage, replacing the old
//    "mark invalid vertex as 'x' and skip it" hack
//  - misc optimizations found along the way
//
// Usage: node transform-3dv1.mjs <in.ent> <out.ent>

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import cp from 'node:child_process';

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('usage: transform-3dv1.mjs <in.ent> <out.ent>'); process.exit(1); }

const workDir = path.join(path.dirname(IN), '.transform-tmp');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

const gz = fs.readFileSync(IN);
const tarBuf = zlib.gunzipSync(gz);
fs.writeFileSync(path.join(workDir, 'a.tar'), tarBuf);
cp.execSync(`tar -xf "${path.join(workDir, 'a.tar')}" -C "${workDir}"`);

const projectPath = path.join(workDir, 'temp', 'project.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

// ============================================================
// ID generation
// ============================================================
const usedIds = new Set();
(function collect(o) {
    if (o && typeof o === 'object') {
        if (typeof o.id === 'string') usedIds.add(o.id);
        for (const k in o) collect(o[k]);
    } else if (Array.isArray(o)) {
        for (const v of o) collect(v);
    }
})(project);
// also scan stringified function content
for (const f of project.functions) {
    const ids = String(f.content).match(/"id":"(\w+?)"/g) || [];
    for (const m of ids) usedIds.add(m.slice(6, -1));
}

const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
function newId() {
    let id;
    do {
        id = Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
    } while (usedIds.has(id));
    usedIds.add(id);
    return id;
}

// ============================================================
// Block builders (mirror the exact schema observed in the raw .ent JSON)
// ============================================================
function blk(type, params = [], statements = []) {
    return {
        id: newId(), x: 0, y: 0, type, params, statements,
        movable: null, deletable: 1, emphasized: false, readOnly: null,
        copyable: true, assemble: true, extensions: [],
    };
}
const text = (v) => blk('text', [String(v)]);
const num = (v) => blk('number', [String(v)]);
const getVar = (name) => blk('get_variable', [name, null]);
const changeVar = (name, val) => blk('change_variable', [name, val, null]);
const setVar = (name, val) => blk('set_variable', [name, val, null]);
const getFuncVar = (name) => blk('get_func_variable', [name, null]);
const setFuncVar = (name, val) => blk('set_func_variable', [name, val, null]);
const incFuncVar = (name, delta) => setFuncVar(name, calc(getFuncVar(name), 'PLUS', num(delta)));
const calc = (a, op, b) => blk('calc_basic', [a, op, b]);
const calcOp = (val, op) => blk('calc_operation', [null, val, null, op]);
const quotMod = (a, b, op) => blk('quotient_and_mod', [null, a, null, b, null, op]);
const boolOp = (a, op, b) => blk('boolean_basic_operator', [a, op, b]);
const boolNot = (b) => blk('boolean_not', [null, b, null]);
const boolAndOr = (a, op, b) => blk('boolean_and_or', [a, op, b]);
const valAt = (list, idx) => blk('value_of_index_from_list', [null, list, null, idx, null]);
const setAt = (list, idx, val) => blk('change_value_list_index', [list, idx, val, null]);
const insertAt = (list, idx, val) => blk('insert_value_to_list', [val, list, idx, null]);
const addToList = (list, val) => blk('add_value_to_list', [val, list, null]);
const removeAt = (list, idx) => blk('remove_value_from_list', [idx, list, null]);
const lenOf = (list) => blk('length_of_list', [null, list, null]);
const locateXY = (x, y) => blk('locate_xy', [x, y, null]);
const startFill = () => blk('start_fill', [null]);
const stopFill = () => blk('stop_fill', [null]);
const setFillColor = (c) => blk('set_fill_color', [c, null]);
const rgbToHex = (r, g, b) => blk('change_rgb_to_hex', [r, g, b]);
const ifStmt = (cond, stmts) => blk('_if', [cond, null], [stmts]);
const ifElseStmt = (cond, thenStmts, elseStmts) => blk('if_else', [cond, null, null], [thenStmts, elseStmts]);
function funcCall(funcId, args) {
    return blk('func_' + funcId, [...args, null]);
}
// The synchronous-loop trick: last statement of a repeat body.
function trickStmt() {
    return blk('wait_until_true', [
        boolNot(blk('continue_repeat', [null])),
        null,
    ]);
}
function repeatWhileTrue(cond, bodyStmts) {
    // dropdown 'while' => C-equivalent `while(cond)`; 'until' would invert to `while(!cond)`.
    return blk('repeat_while_true', [cond, 'while', null], [[...bodyStmts, trickStmt()]]);
}
function repeatBasic(countBlock, bodyStmts) {
    return blk('repeat_basic', [countBlock, null], [[...bodyStmts, trickStmt()]]);
}
// clear a (possibly non-empty) list by repeatedly removing its first item.
function clearList(listName) {
    return repeatWhileTrue(
        boolOp(lenOf(listName), 'GREATER', num('0')),
        [removeAt(listName, num('1'))],
    );
}

// ============================================================
// Locate functions by id, helper to find a block by id within a (parsed) tree
// ============================================================
const funcsById = Object.fromEntries(project.functions.map(f => [f.id, f]));

function getHeader(fn) {
    const content = JSON.parse(fn.content);
    return content[0][0]; // the function_create / function_create_value block
}
function setBody(fn, newStmts) {
    const header = getHeader(fn);
    header.statements = [newStmts];
    fn.content = JSON.stringify([[header]]);
}
function addLocal(fn, name) {
    const id = fn.id + '_' + newId();
    fn.localVariables.push({ name, value: 0, id });
    return id;
}

// ============================================================
// New persistent lists needed for z-clipping
// ============================================================
function addList(name, arr) {
    const id = newId();
    project.variables.push({
        id, name, variableType: 'list',
        array: arr.map((v, i) => ({ id: id + '_' + i, data: String(v) })),
        x: 0, y: 0, visible: false, isCloud: false,
    });
    return id;
}
const VLEN = project.variables.find(v => v.id === 'u2g1').array.length; // 20
const LIST_VIEW_X = addList('view_x', Array(VLEN).fill(0));
const LIST_VIEW_Y = addList('view_y', Array(VLEN).fill(0));
const LIST_VIEW_Z = addList('view_z', Array(VLEN).fill(0));
const LIST_CLIP_SX = addList('clip_sx', []);
const LIST_CLIP_SY = addList('clip_sy', []);

console.log('new lists:', { LIST_VIEW_X, LIST_VIEW_Y, LIST_VIEW_Z, LIST_CLIP_SX, LIST_CLIP_SY });

// ============================================================
// Per-face base color + distance fog (blend toward the sky/background color
// instead of toward black as faces get farther away)
// ============================================================
function hsv2rgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [r, g, b].map(v => Math.round((v + m) * 255));
}
const FACE_COUNT_0 = project.variables.find(v => v.id === 'gifn').array.length; // 12
const rainbow = Array.from({ length: FACE_COUNT_0 }, (_, i) => hsv2rgb((i / FACE_COUNT_0) * 360, 0.7, 0.95));
const LIST_FACE_R = addList('face_r', rainbow.map(c => c[0]));
const LIST_FACE_G = addList('face_g', rainbow.map(c => c[1]));
const LIST_FACE_B = addList('face_b', rainbow.map(c => c[2]));

function addVar(name, value) {
    const id = newId();
    project.variables.push({ id, name, variableType: 'variable', value, x: 0, y: 0, visible: false, isCloud: false });
    return id;
}
// sky-blue fog / background color
const VAR_FOG_R = addVar('fog_r', 135);
const VAR_FOG_G = addVar('fog_g', 206);
const VAR_FOG_B = addVar('fog_b', 235);

// give the fog a longer range so a larger scene (room + structures) fades in
// gracefully instead of everything past the old, small max_dis going flat.
{
    const maxDis = project.variables.find(v => v.id === '4vlm');
    maxDis.value = 42;
}

console.log('color lists:', { LIST_FACE_R, LIST_FACE_G, LIST_FACE_B, VAR_FOG_R, VAR_FOG_G, VAR_FOG_B });

// ============================================================
// Object registry: contiguous vertex-index ranges per logical object, plus a
// per-object position (x,y,z) that can be changed at runtime to move it.
// Vertex i's WORLD position is base_*[i] (its object-local rest coordinate)
// plus obj_*[owner(i)] (that object's current offset) — recomputed each
// frame ONLY for objects flagged obj_movable=1, so static geometry (the
// room, static pedestals) costs nothing extra per frame.
//   obj_vstart[k] .. obj_vend[k]  = vertex index range owned by object k
//   obj_fstart[k] .. obj_fend[k]  = face index range owned by object k
//   obj_x/y/z[k]                 = object k's current world position
//   obj_movable[k]               = 1 if apply_transforms() should re-derive
//                                   this object's vertices from base+offset
//                                   every frame (0 = positioned once, static)
// base_x/y/z are seeded with each vertex's CURRENT (already-placed) local
// coordinate by the scene builder; they never change at runtime — only the
// per-object offset does.
// ============================================================
const LIST_OBJ_VSTART = addList('obj_vstart', []);
const LIST_OBJ_VEND = addList('obj_vend', []);
const LIST_OBJ_FSTART = addList('obj_fstart', []);
const LIST_OBJ_FEND = addList('obj_fend', []);
const LIST_OBJ_X = addList('obj_x', []);
const LIST_OBJ_Y = addList('obj_y', []);
const LIST_OBJ_Z = addList('obj_z', []);
const LIST_OBJ_MOVABLE = addList('obj_movable', []);
const LIST_BASE_X = addList('base_x', []);
const LIST_BASE_Y = addList('base_y', []);
const LIST_BASE_Z = addList('base_z', []);
const VAR_ANIM_T = addVar('anim_t', 0);

console.log('object registry lists:', {
    LIST_OBJ_VSTART, LIST_OBJ_VEND, LIST_OBJ_FSTART, LIST_OBJ_FEND,
    LIST_OBJ_X, LIST_OBJ_Y, LIST_OBJ_Z, LIST_OBJ_MOVABLE,
    LIST_BASE_X, LIST_BASE_Y, LIST_BASE_Z, VAR_ANIM_T,
});

// ============================================================
// New custom function: apply_transforms() — reposition every vertex owned
// by a movable object to base + current offset. Runs once per frame, before
// the projection/sort/draw passes, so a moved object's new position is what
// actually gets rendered that frame.
// ============================================================
function newFunction(label, bodyBuilder) {
    const id = newId();
    const headerId = newId();
    const labelBlockId = newId();
    const fn = { id, type: 'normal', localVariables: [], useLocalVariables: true, content: '' };
    project.functions.push(fn);
    const local = (name) => addLocal(fn, name);
    const body = bodyBuilder(local);
    const header = {
        id: headerId, x: 0, y: 0, type: 'function_create',
        params: [
            { id: labelBlockId, x: 0, y: 0, type: 'function_field_label', params: [label, null], statements: [], movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: false, assemble: true, extensions: [] },
            null,
        ],
        statements: [body],
        movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [],
    };
    fn.content = JSON.stringify([[header]]);
    return id;
}

const FN_APPLY_TRANSFORMS = newFunction('apply_transforms', (local) => {
    const kLocal = local('k'); // object index
    const vLocal = local('v'); // vertex index within the object's range
    const kGet = () => getFuncVar(kLocal);
    const vGet = () => getFuncVar(vLocal);
    return [
        setFuncVar(kLocal, num('1')),
        repeatWhileTrue(
            boolOp(kGet(), 'LESS_OR_EQUAL', lenOf(LIST_OBJ_VSTART)),
            [
                ifStmt(
                    boolOp(valAt(LIST_OBJ_MOVABLE, kGet()), 'EQUAL', num('1')),
                    [
                        setFuncVar(vLocal, valAt(LIST_OBJ_VSTART, kGet())),
                        repeatWhileTrue(
                            boolOp(vGet(), 'LESS_OR_EQUAL', valAt(LIST_OBJ_VEND, kGet())),
                            [
                                setAt('u2g1', vGet(), calc(valAt(LIST_BASE_X, vGet()), 'PLUS', valAt(LIST_OBJ_X, kGet()))),
                                setAt('c8kw', vGet(), calc(valAt(LIST_BASE_Y, vGet()), 'PLUS', valAt(LIST_OBJ_Y, kGet()))),
                                setAt('yzge', vGet(), calc(valAt(LIST_BASE_Z, vGet()), 'PLUS', valAt(LIST_OBJ_Z, kGet()))),
                                incFuncVar(vLocal, '1'),
                            ],
                        ),
                    ],
                ),
                incFuncVar(kLocal, '1'),
            ],
        ),
    ];
});

// ============================================================
// Per-frame render-pipeline globals. Scene builders overwrite the defaults;
// the defaults describe the base engine (one static dodecahedron, one chunk).
// ============================================================
// camera position + the 3 basis vectors e83g projects with, snapshotted
// once per frame by cache_camera() (read as cheap globals everywhere else)
const VAR_CAM = {};
for (const n of ['camx', 'camy', 'camz', 'b14x', 'b14y', 'b14z', 'b19x', 'b19y', 'b19z', 'b20x', 'b20y', 'b20z']) VAR_CAM[n] = addVar(n, 0);
const CAM_SRC = [ // [global, list, list index]
    ['camx', 'p604', 17], ['camy', 'woyc', 17], ['camz', '23s0', 17],
    ['b14x', 'p604', 14], ['b14y', 'woyc', 14], ['b14z', '23s0', 14],
    ['b19x', 'p604', 19], ['b19y', 'woyc', 19], ['b19z', '23s0', 19],
    ['b20x', 'p604', 20], ['b20y', 'woyc', 20], ['b20z', '23s0', 20],
];
const LIST_CAM_PREV = addList('cam_prev', Array(12).fill('none'));
const VAR_DIRTY = addVar('cam_dirty', 1);
const VAR_VIS_N = addVar('vis_n', 0);
const VAR_SORT_BASE = addVar('sort_base', 1);
const VAR_DYN_VEND = addVar('dyn_vend', 0);   // vertices 1..dyn_vend move every frame (re-projected always)
const VAR_SLAB_Y = addVar('slab_y', 0);       // height of the floor slab separating the two layers
// chunk-index ranges for the 4 draw layers: ground, layer1 (below slab),
// slab, layer2 (above slab). Empty range = start > end.
const VAR_GRP = {};
for (const [n, v] of [['g_ground0', 1], ['g_ground1', 0], ['g_l1_0', 1], ['g_l1_1', 1], ['g_slab0', 1], ['g_slab1', 0], ['g_l2_0', 1], ['g_l2_1', 0]]) VAR_GRP[n] = addVar(n, v);
// chunks: contiguous face ranges + a bounding sphere, frustum-tested once
// per frame so a whole off-screen chunk skips its per-face work
const LIST_CH_FSTART = addList('chunk_fstart', [1]);
const LIST_CH_FEND = addList('chunk_fend', [FACE_COUNT_0]);
const LIST_CH_CX = addList('chunk_cx', [0]);
const LIST_CH_CY = addList('chunk_cy', [0]);
const LIST_CH_CZ = addList('chunk_cz', [0]);
const LIST_CH_R = addList('chunk_r', [1000000]);
const LIST_FACE_ALLVALID = addList('face_allvalid', Array(FACE_COUNT_0).fill(0));
const LIST_CH_VIS = addList('chunk_vis', [1]);
// static vertex regions (see project_static): vertex range + up to 3 chunks
// whose visibility requires it. Default: all base-engine vertices, chunk 1.
const LIST_REG_VSTART = addList('reg_vstart', [1]);
const LIST_REG_VEND = addList('reg_vend', [VLEN]);
const LIST_REG_C1 = addList('reg_c1', [1]);
const LIST_REG_C2 = addList('reg_c2', [1]);
const LIST_REG_C3 = addList('reg_c3', [1]);
// region kind: 0 = arbitrary vertex range (projected by e83g), 1 = lattice
// rectangle c0..c1 x r0..r1 x h 0..2 laid out c-major, then r, then h
// (projected incrementally by project_lattice)
const LIST_REG_KIND = addList('reg_kind', [0]);
const LIST_REG_LC0 = addList('reg_lc0', [0]), LIST_REG_LC1 = addList('reg_lc1', [0]);
const LIST_REG_LR0 = addList('reg_lr0', [0]), LIST_REG_LR1 = addList('reg_lr1', [0]);
const VAR_LAT_S = addVar('lat_s', 1), VAR_LAT_H = addVar('lat_h', 1);
// per-vertex screen-region code, computed by e83g: 1000 if behind the near
// plane, else sx + 11*sy with sx/sy in {-1,0,1} = left of / on / right of
// the stage (resp. below / on / above). Summed over a face's points, it
// tells in one number whether the face has points behind the camera, and
// otherwise whether all points lie beyond one screen edge (|sum sx| == n or
// |sum sy| == n) — the same test as a screen bounding box, but a face costs
// one add per point instead of four min/max comparisons.
const LIST_OC = addList('scr_code', Array(VLEN).fill(0));
// which registry object animate() moves, and its orbit
const VAR_ANIM_OBJ = addVar('anim_obj', 0);
const VAR_ANIM_CX = addVar('anim_cx', 0), VAR_ANIM_CY = addVar('anim_cy', 0), VAR_ANIM_CZ = addVar('anim_cz', 0), VAR_ANIM_R = addVar('anim_r', 1);

// ============================================================
// New custom function: animate() — advances the shared animation clock and
// orbits + bobs registry object #anim_obj around (anim_cx, anim_cy, anim_cz).
// ============================================================
const FN_ANIMATE = newFunction('animate', () => {
    return [
        setVar(VAR_ANIM_T, calc(getVar(VAR_ANIM_T), 'PLUS', text('1.2'))),
        ifStmt(
            boolOp(getVar(VAR_ANIM_OBJ), 'GREATER_OR_EQUAL', num('1')),
            [
                setAt(LIST_OBJ_X, getVar(VAR_ANIM_OBJ), calc(getVar(VAR_ANIM_CX), 'PLUS', calc(getVar(VAR_ANIM_R), 'MULTI', calcOp(getVar(VAR_ANIM_T), 'cos')))),
                setAt(LIST_OBJ_Y, getVar(VAR_ANIM_OBJ), calc(getVar(VAR_ANIM_CY), 'PLUS', calc(num('0.5'), 'MULTI', calcOp(calc(getVar(VAR_ANIM_T), 'MULTI', num('2')), 'sin')))),
                setAt(LIST_OBJ_Z, getVar(VAR_ANIM_OBJ), calc(getVar(VAR_ANIM_CZ), 'PLUS', calc(getVar(VAR_ANIM_R), 'MULTI', calcOp(getVar(VAR_ANIM_T), 'sin')))),
            ],
        ),
    ];
});

// ============================================================
// New custom function: cache_camera() — copy camera pos + basis into
// globals once per frame, and set cam_dirty=1 only if any of them changed
// since last frame. When the camera is still, the static geometry's
// projected coordinates from last frame are still exact, so e83g skips it.
// ============================================================
const FN_CACHE_CAM = newFunction('cache_camera', () => [
    ...CAM_SRC.map(([g, l, i]) => setVar(VAR_CAM[g], valAt(l, num(String(i))))),
    setVar(VAR_DIRTY, num('0')),
    ...CAM_SRC.map(([g], k) => ifStmt(
        boolOp(getVar(VAR_CAM[g]), 'NOT_EQUAL', valAt(LIST_CAM_PREV, num(String(k + 1)))),
        [setVar(VAR_DIRTY, num('1'))],
    )),
    ifStmt(
        boolOp(getVar(VAR_DIRTY), 'EQUAL', num('1')),
        CAM_SRC.map(([g], k) => setAt(LIST_CAM_PREV, num(String(k + 1)), getVar(VAR_CAM[g]))),
    ),
]);

// ============================================================
// generic builder for a NEW function that takes its own string parameters
// (needed for is_face_visible(from, to) below — apply_transforms/animate
// above take none, so the simpler newFunction() sufficed for those).
// ============================================================
function buildParamChain(paramTypeNames, idx) {
    if (idx >= paramTypeNames.length) return null;
    return blk('function_field_string', [blk(paramTypeNames[idx], []), buildParamChain(paramTypeNames, idx + 1)]);
}
function newFunctionWithParams(label, numParams, isValue, bodyBuilder) {
    const id = newId();
    const paramTypeNames = Array.from({ length: numParams }, () => 'stringParam_' + newId());
    const fn = { id, type: isValue ? 'value' : 'normal', localVariables: [], useLocalVariables: true, content: '' };
    project.functions.push(fn);
    let returnLocalId = null;
    if (isValue) {
        returnLocalId = id + '_' + newId();
        fn.localVariables.push({ name: 'return', value: 0, id: returnLocalId });
    }
    const local = (name) => addLocal(fn, name);
    const paramGetters = paramTypeNames.map(tn => () => blk(tn, []));
    const body = bodyBuilder(local, paramGetters, returnLocalId);
    const labelChain = blk('function_field_label', [label, buildParamChain(paramTypeNames, 0)]);
    const headerParams = isValue ? [labelChain, null, getFuncVar(returnLocalId)] : [labelChain, null];
    const header = {
        id: newId(), x: 0, y: 0, type: isValue ? 'function_create_value' : 'function_create',
        params: headerParams,
        statements: [body],
        movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [],
    };
    fn.content = JSON.stringify([[header]]);
    return id;
}
function orAll(conds) {
    return conds.reduce((acc, c) => acc ? blk('boolean_and_or', [acc, 'OR', c]) : c, null);
}

// Visibility-cull bounds (stage is ~480x270; padded so a polygon merely
// grazing the edge isn't dropped). The check itself is inlined directly
// into ba3q below, as plain statements — NOT a separate custom function
// called from an `_if` condition. Entry's synchronous-loop trick breaks if
// a custom function (any function, even a trivial one with no loop of its
// own) is invoked from within an `_if`/`if_else` CONDITION slot that sits
// inside a repeat_while_true using the continue_repeat trick: the outer
// loop's synchronous continuation silently stops working and the rest of
// that frame's drawing never happens. Confirmed by bisection: gating on a
// literal (no function call) works; gating on `is_face_visible(...) == 1`
// — even reduced to an unconditional `return 1` with zero internal logic —
// reproduced a blank stage every time. Filed as a real engine quirk, not
// something to route around per-callsite; the safe pattern is "condition
// slots only ever hold locals/literals here — compute into a local as
// plain statements first, then test the local".
const HALF_W = 260, HALF_H = 150;

const G = (n) => getVar(VAR_CAM[n]);
// ============================================================
// New custom function: collect_faces(c0, c1) — for chunks c0..c1: skip the
// whole chunk if its bounding sphere is outside the view frustum; otherwise
// for each face, in ONE pass over its points: accumulate its depth (average
// view-space z — replaces the old per-vertex distance+sqrt pass and the
// separate per-face averaging pass) and its screen bounding box. Visible
// faces are appended to c8gh/2jic at slot vis_n, so only visible faces are
// ever sorted or drawn.
// ============================================================
const FN_COLLECT = newFunctionWithParams('collect_faces', 2, false, (local, params) => {
    const [c0P, c1P] = params;
    const L = {};
    for (const n of ['k', 'f', 'fend', 'j', 'jend', 'n', 'idx', 'px', 'py', 'sum', 'valid',
        'minx', 'maxx', 'miny', 'maxy', 'dx', 'dy', 'dz', 'vx', 'vy', 'vz', 'r', 'tx', 'ty', 'nx', 'ny']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const dot = (bx, by, bz) => calc(calc(g('dx'), 'MULTI', G(bx)), 'PLUS', calc(calc(g('dy'), 'MULTI', G(by)), 'PLUS', calc(g('dz'), 'MULTI', G(bz))));

    // one point of the face: accumulate its view-z and its screen-region code
    const point = (k) => [
        set('idx', valAt('r9ol', calc(g('j'), 'PLUS', num(String(k))))),
        set('sum', calc(g('sum'), 'PLUS', valAt(LIST_VIEW_Z, g('idx')))),
        set('px', calc(g('px'), 'PLUS', valAt(LIST_OC, g('idx')))),
    ];
    const append = (allValid) => [
        setVar(VAR_VIS_N, calc(getVar(VAR_VIS_N), 'PLUS', num('1'))),
        setAt('c8gh', getVar(VAR_VIS_N), g('f')),
        setAt('2jic', getVar(VAR_VIS_N), calc(g('sum'), 'DIVIDE', g('n'))),
        setAt(LIST_FACE_ALLVALID, g('f'), num(allValid)),
    ];
    // faces are 4 (quads) or 5 (pentagons) points: unrolled, no inner loop.
    // px = sum of region codes, py/valid = decoded sum sy / sum sx.
    const faceBody = [
        set('n', valAt('gifn', g('f'))),
        set('j', calc(calc(g('f'), 'MINUS', num('1')), 'MULTI', getVar('lxi6'))),
        set('sum', num('0')), set('px', num('0')),
        ...point(1), ...point(2), ...point(3), ...point(4),
        ifStmt(boolOp(g('n'), 'GREATER', num('4')), point(5)),
        ifElseStmt(boolOp(g('px'), 'GREATER', num('500')),
            // some point behind the near plane: keep for the clipper, unless
            // ALL of them are (sum == 1000*n) — then nothing can be visible
            [ifStmt(boolOp(g('px'), 'LESS', calc(calc(num('1000'), 'MULTI', g('n')), 'MINUS', num('500'))), append('0'))],
            [
                set('py', calcOp(calc(g('px'), 'DIVIDE', num('11')), 'round')),
                set('valid', calc(g('px'), 'MINUS', calc(num('11'), 'MULTI', g('py')))),
                // all points past one screen edge <=> |sum sx| == n or |sum sy| == n
                ifStmt(boolNot(orAll([
                    boolOp(g('valid'), 'EQUAL', g('n')),
                    boolOp(g('valid'), 'EQUAL', calc(num('0'), 'MINUS', g('n'))),
                    boolOp(g('py'), 'EQUAL', g('n')),
                    boolOp(g('py'), 'EQUAL', calc(num('0'), 'MINUS', g('n'))),
                ])), append('1')),
            ]),
        incFuncVar(L.f, '1'),
    ];

    return [
        set('k', c0P()),
        repeatWhileTrue(boolOp(g('k'), 'LESS_OR_EQUAL', c1P()), [
            ifStmt(boolOp(valAt(LIST_CH_VIS, g('k')), 'EQUAL', num('1')), [
                set('f', valAt(LIST_CH_FSTART, g('k'))),
                set('fend', valAt(LIST_CH_FEND, g('k'))),
                repeatWhileTrue(boolOp(g('f'), 'LESS_OR_EQUAL', g('fend')), faceBody),
            ]),
            incFuncVar(L.k, '1'),
        ]),
    ];
});

// ============================================================
// New custom function: cull_chunks() — bounding-sphere vs view-frustum test
// for every chunk, into chunk_vis. Chunk spheres are static, so this only
// needs to run when the camera moved (cam_dirty); its result feeds both
// project_static() (which vertices to re-project) and collect_faces()
// (which faces to consider).
// ============================================================
const FN_CULL = newFunction('cull_chunks', (local) => {
    const L = {};
    for (const n of ['k', 'dx', 'dy', 'dz', 'vx', 'vy', 'vz', 'r', 'tx', 'ty', 'nx', 'ny']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const dot = (bx, by, bz) => calc(calc(g('dx'), 'MULTI', G(bx)), 'PLUS', calc(calc(g('dy'), 'MULTI', G(by)), 'PLUS', calc(g('dz'), 'MULTI', G(bz))));
    return [
        set('tx', calc(num(String(HALF_W)), 'DIVIDE', getVar('0i4a'))),
        set('ty', calc(num(String(HALF_H)), 'DIVIDE', getVar('0i4a'))),
        set('nx', calcOp(calc(num('1'), 'PLUS', calc(g('tx'), 'MULTI', g('tx'))), 'root')),
        set('ny', calcOp(calc(num('1'), 'PLUS', calc(g('ty'), 'MULTI', g('ty'))), 'root')),
        set('k', num('1')),
        repeatWhileTrue(boolOp(g('k'), 'LESS_OR_EQUAL', lenOf(LIST_CH_FSTART)), [
            set('dx', calc(valAt(LIST_CH_CX, g('k')), 'MINUS', G('camx'))),
            set('dy', calc(valAt(LIST_CH_CY, g('k')), 'MINUS', G('camy'))),
            set('dz', calc(valAt(LIST_CH_CZ, g('k')), 'MINUS', G('camz'))),
            set('vz', calc(num('0'), 'MINUS', dot('b19x', 'b19y', 'b19z'))),
            set('vx', dot('b14x', 'b14y', 'b14z')),
            set('vy', dot('b20x', 'b20y', 'b20z')),
            set('r', valAt(LIST_CH_R, g('k'))),
            // outside if behind the near plane, or fully beyond the
            // left/right/top/bottom frustum planes (normals (±1,0,-tx)/nx ...)
            ifElseStmt(orAll([
                boolOp(calc(g('vz'), 'PLUS', g('r')), 'LESS', getVar('nelz')),
                boolOp(calc(g('vx'), 'MINUS', calc(g('tx'), 'MULTI', g('vz'))), 'GREATER', calc(g('r'), 'MULTI', g('nx'))),
                boolOp(calc(calc(num('0'), 'MINUS', g('vx')), 'MINUS', calc(g('tx'), 'MULTI', g('vz'))), 'GREATER', calc(g('r'), 'MULTI', g('nx'))),
                boolOp(calc(g('vy'), 'MINUS', calc(g('ty'), 'MULTI', g('vz'))), 'GREATER', calc(g('r'), 'MULTI', g('ny'))),
                boolOp(calc(calc(num('0'), 'MINUS', g('vy')), 'MINUS', calc(g('ty'), 'MULTI', g('vz'))), 'GREATER', calc(g('r'), 'MULTI', g('ny'))),
            ]), [setAt(LIST_CH_VIS, g('k'), num('0'))], [setAt(LIST_CH_VIS, g('k'), num('1'))]),
            incFuncVar(L.k, '1'),
        ]),
    ];
});

// ============================================================
// New custom function: project_static() — re-project static vertices
// region by region (a region = a contiguous vertex range, e.g. the lattice
// points inside one maze quadrant). A region is projected only if one of
// the (up to 3) chunks that use its vertices is in view; vertices of
// out-of-view regions keep stale coordinates, which is harmless because no
// face that reads them gets collected this frame, and visibility can only
// change when the camera moves — i.e. in a frame where this runs again.
// ============================================================
// ============================================================
// New custom function: project_lattice(vstart, c0, c1, r0, r1) — project a
// rectangle of lattice points (x = c*lat_s, y = h*lat_h, z = r*lat_s,
// h = 0..2). The view transform is linear, so instead of "subtract camera,
// three dot products" per vertex, it walks the lattice adding a fixed
// view-space step per +1 in c, r or h (steps computed once per call).
// ============================================================
const FN_PROJECT_LATTICE = newFunctionWithParams('project_lattice', 5, false, (local, params) => {
    const [vstartP, c0P, c1P, r0P, r1P] = params;
    const L = {};
    for (const n of ['idx', 'c', 'r', 'cx', 'cy', 'cz', 'rx', 'ry', 'rz', 'hx', 'hy', 'hz',
        'scx', 'scy', 'scz', 'srx', 'sry', 'srz', 'shx', 'shy', 'shz', 'dx', 'dy', 'dz', 'px', 'py', 'oc']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const add = (n, m) => set(n, calc(g(n), 'PLUS', g(m)));
    const dotD = (bx, by, bz) => calc(calc(g('dx'), 'MULTI', G(bx)), 'PLUS', calc(calc(g('dy'), 'MULTI', G(by)), 'PLUS', calc(g('dz'), 'MULTI', G(bz))));
    const emit = () => [
        setAt(LIST_VIEW_Z, g('idx'), g('hz')),
        ifElseStmt(boolOp(g('hz'), 'LESS', getVar('nelz')),
            [setAt('145x', g('idx'), text('x')), setAt('foet', g('idx'), text('x')), setAt(LIST_OC, g('idx'), num('1000'))],
            [
                set('px', calc(calc(getVar('0i4a'), 'MULTI', g('hx')), 'DIVIDE', g('hz'))),
                set('py', calc(calc(getVar('0i4a'), 'MULTI', g('hy')), 'DIVIDE', g('hz'))),
                setAt('145x', g('idx'), g('px')),
                setAt('foet', g('idx'), g('py')),
                set('oc', num('0')),
                ifStmt(boolOp(g('px'), 'LESS', num(String(-HALF_W))), [set('oc', num('-1'))]),
                ifStmt(boolOp(g('px'), 'GREATER', num(String(HALF_W))), [set('oc', num('1'))]),
                ifStmt(boolOp(g('py'), 'LESS', num(String(-HALF_H))), [set('oc', calc(g('oc'), 'MINUS', num('11')))]),
                ifStmt(boolOp(g('py'), 'GREATER', num(String(HALF_H))), [set('oc', calc(g('oc'), 'PLUS', num('11')))]),
                setAt(LIST_OC, g('idx'), g('oc')),
            ]),
        incFuncVar(L.idx, '1'),
    ];
    const stepH = () => [add('hx', 'shx'), add('hy', 'shy'), add('hz', 'shz')];
    const S = () => getVar(VAR_LAT_S), H = () => getVar(VAR_LAT_H);
    return [
        // per-unit view-space steps: +1 in c = S*(b14x, b20x, -b19x),
        // +1 in r = S*(b14z, b20z, -b19z), +1 in h = H*(b14y, b20y, -b19y)
        set('scx', calc(S(), 'MULTI', G('b14x'))), set('scy', calc(S(), 'MULTI', G('b20x'))), set('scz', calc(num('0'), 'MINUS', calc(S(), 'MULTI', G('b19x')))),
        set('srx', calc(S(), 'MULTI', G('b14z'))), set('sry', calc(S(), 'MULTI', G('b20z'))), set('srz', calc(num('0'), 'MINUS', calc(S(), 'MULTI', G('b19z')))),
        set('shx', calc(H(), 'MULTI', G('b14y'))), set('shy', calc(H(), 'MULTI', G('b20y'))), set('shz', calc(num('0'), 'MINUS', calc(H(), 'MULTI', G('b19y')))),
        // view coords of lattice point (c0, r0, 0)
        set('dx', calc(calc(c0P(), 'MULTI', S()), 'MINUS', G('camx'))),
        set('dy', calc(num('0'), 'MINUS', G('camy'))),
        set('dz', calc(calc(r0P(), 'MULTI', S()), 'MINUS', G('camz'))),
        set('cx', dotD('b14x', 'b14y', 'b14z')),
        set('cy', dotD('b20x', 'b20y', 'b20z')),
        set('cz', calc(num('0'), 'MINUS', dotD('b19x', 'b19y', 'b19z'))),
        set('idx', vstartP()),
        set('c', c0P()),
        repeatWhileTrue(boolOp(g('c'), 'LESS_OR_EQUAL', c1P()), [
            set('rx', g('cx')), set('ry', g('cy')), set('rz', g('cz')),
            set('r', r0P()),
            repeatWhileTrue(boolOp(g('r'), 'LESS_OR_EQUAL', r1P()), [
                set('hx', g('rx')), set('hy', g('ry')), set('hz', g('rz')),
                ...emit(), ...stepH(), ...emit(), ...stepH(), ...emit(),
                add('rx', 'srx'), add('ry', 'sry'), add('rz', 'srz'),
                incFuncVar(L.r, '1'),
            ]),
            add('cx', 'scx'), add('cy', 'scy'), add('cz', 'scz'),
            incFuncVar(L.c, '1'),
        ]),
    ];
});

// ============================================================
// New custom function: project_static() — re-project static vertices
// region by region. A region is projected only if one of the (up to 3)
// chunks that use its vertices is in view; vertices of out-of-view regions
// keep stale coordinates, which is harmless because no face that reads them
// gets collected this frame, and visibility can only change when the camera
// moves — i.e. in a frame where this runs again.
// ============================================================
const FN_PROJECT_STATIC = newFunction('project_static', (local) => {
    const r = local('r');
    const g = () => getFuncVar(r);
    const vis = (list) => boolOp(valAt(LIST_CH_VIS, valAt(list, g())), 'EQUAL', num('1'));
    return [
        setFuncVar(r, num('1')),
        repeatWhileTrue(boolOp(g(), 'LESS_OR_EQUAL', lenOf(LIST_REG_VSTART)), [
            ifStmt(orAll([vis(LIST_REG_C1), vis(LIST_REG_C2), vis(LIST_REG_C3)]), [
                ifElseStmt(boolOp(valAt(LIST_REG_KIND, g()), 'EQUAL', num('1')),
                    [funcCall(FN_PROJECT_LATTICE, [valAt(LIST_REG_VSTART, g()), valAt(LIST_REG_LC0, g()), valAt(LIST_REG_LC1, g()), valAt(LIST_REG_LR0, g()), valAt(LIST_REG_LR1, g())])],
                    [funcCall('e83g', [valAt(LIST_REG_VSTART, g()), valAt(LIST_REG_VEND, g())])]),
            ]),
            incFuncVar(r, '1'),
        ]),
    ];
});

// ============================================================
// New custom function: build_draw_list() — layered painter's algorithm.
// Draw order: ground, then whichever of (layer below slab / layer above
// slab) is on the far side of the slab from the eye, then the slab, then
// the near-side layer. Each layer is sorted on its own. Geometry on the
// far side of the slab plane can never occlude geometry on the eye's side
// (the sight line never crosses the plane), and the slab can only hide
// far-side geometry, so this order is exact across layers — which is what
// lets the slab and ground be a few big polygons without the big-polygon
// sort errors, and keeps each sort small.
// ============================================================
const FN_BUILD_DRAW = newFunction('build_draw_list', () => {
    const collect = (a, b) => funcCall(FN_COLLECT, [getVar(VAR_GRP[a]), getVar(VAR_GRP[b])]);
    const sorted = (a, b) => [
        setVar(VAR_SORT_BASE, calc(getVar(VAR_VIS_N), 'PLUS', num('1'))),
        collect(a, b),
        funcCall('ib7x', [getVar(VAR_SORT_BASE), getVar(VAR_VIS_N), getVar(VAR_SORT_BASE)]),
    ];
    return [
        setVar(VAR_VIS_N, num('0')),
        collect('g_ground0', 'g_ground1'),
        ifElseStmt(
            boolOp(G('camy'), 'LESS', getVar(VAR_SLAB_Y)),
            [...sorted('g_l2_0', 'g_l2_1'), collect('g_slab0', 'g_slab1'), ...sorted('g_l1_0', 'g_l1_1')],
            [...sorted('g_l1_0', 'g_l1_1'), collect('g_slab0', 'g_slab1'), ...sorted('g_l2_0', 'g_l2_1')],
        ),
    ];
});

// ============================================================
// 1) e83g  "_t from to"  — per-vertex view-space transform + screen projection
//    params: stringParam_dech (from), stringParam_b38e (to)
//    local "tmp" (e83g_se0y) already exists (apply_perspective return flag)
// ============================================================
{
    const fn = funcsById['e83g'];
    const iLocal = addLocal(fn, 'i');
    const iGet = () => getFuncVar(iLocal);
    const dxL = addLocal(fn, 'dx'), dyL = addLocal(fn, 'dy'), dzL = addLocal(fn, 'dz'), vzL = addLocal(fn, 'vz');
    const pxL = addLocal(fn, 'px'), pyL = addLocal(fn, 'py'), ocL = addLocal(fn, 'oc');
    const dot = (bx, by, bz) => calc(
        calc(getFuncVar(dxL), 'MULTI', G(bx)), 'PLUS',
        calc(calc(getFuncVar(dyL), 'MULTI', G(by)), 'PLUS', calc(getFuncVar(dzL), 'MULTI', G(bz))),
    );
    // Per vertex: diff = vertex - camera (inlined gba1, locals not a list
    // scratch slot), view z, then the perspective step inlined (was a call
    // to apply_perspective 0y5z per vertex plus a round trip through list
    // slots 21/18). Camera/basis come from cache_camera()'s globals. Only
    // view_z + screen x/y are stored; view x/y are recomputed on demand in
    // the rare near-plane clip path instead of being written for every vertex.
    const body = [
        setFuncVar(iLocal, blk('stringParam_dech', [])), // i = from
        repeatWhileTrue(
            boolOp(iGet(), 'LESS_OR_EQUAL', blk('stringParam_b38e', [])),
            [
                setFuncVar(dxL, calc(valAt('u2g1', iGet()), 'MINUS', G('camx'))),
                setFuncVar(dyL, calc(valAt('c8kw', iGet()), 'MINUS', G('camy'))),
                setFuncVar(dzL, calc(valAt('yzge', iGet()), 'MINUS', G('camz'))),
                setFuncVar(vzL, calc(num('0'), 'MINUS', dot('b19x', 'b19y', 'b19z'))),
                setAt(LIST_VIEW_Z, iGet(), getFuncVar(vzL)),
                ifElseStmt(
                    boolOp(getFuncVar(vzL), 'LESS', getVar('nelz')),
                    [
                        setAt('145x', iGet(), text('x')),
                        setAt('foet', iGet(), text('x')),
                        setAt(LIST_OC, iGet(), num('1000')),
                    ],
                    [
                        setFuncVar(pxL, calc(calc(getVar('0i4a'), 'MULTI', dot('b14x', 'b14y', 'b14z')), 'DIVIDE', getFuncVar(vzL))),
                        setFuncVar(pyL, calc(calc(getVar('0i4a'), 'MULTI', dot('b20x', 'b20y', 'b20z')), 'DIVIDE', getFuncVar(vzL))),
                        setAt('145x', iGet(), getFuncVar(pxL)),
                        setAt('foet', iGet(), getFuncVar(pyL)),
                        setFuncVar(ocL, num('0')),
                        ifStmt(boolOp(getFuncVar(pxL), 'LESS', num(String(-HALF_W))), [setFuncVar(ocL, num('-1'))]),
                        ifStmt(boolOp(getFuncVar(pxL), 'GREATER', num(String(HALF_W))), [setFuncVar(ocL, num('1'))]),
                        ifStmt(boolOp(getFuncVar(pyL), 'LESS', num(String(-HALF_H))), [setFuncVar(ocL, calc(getFuncVar(ocL), 'MINUS', num('11')))]),
                        ifStmt(boolOp(getFuncVar(pyL), 'GREATER', num(String(HALF_H))), [setFuncVar(ocL, calc(getFuncVar(ocL), 'PLUS', num('11')))]),
                        setAt(LIST_OC, iGet(), getFuncVar(ocL)),
                    ],
                ),
                incFuncVar(iLocal, '1'),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 2) 2x48  "reset_dot"  — per-vertex distance to camera
//    param: stringParam_ne27 (i)
// ============================================================
{
    const fn = funcsById['2x48'];
    const iLocal = addLocal(fn, 'i');
    const iGet = () => getFuncVar(iLocal);
    const dist3 = () => calcOp(
        calc(
            calcOp(calc(valAt('u2g1', iGet()), 'MINUS', valAt('p604', num('17'))), 'square'),
            'PLUS',
            calc(
                calcOp(calc(valAt('c8kw', iGet()), 'MINUS', valAt('woyc', num('17'))), 'square'),
                'PLUS',
                calcOp(calc(valAt('yzge', iGet()), 'MINUS', valAt('23s0', num('17'))), 'square'),
            ),
        ),
        'root',
    );
    const body = [
        setFuncVar(iLocal, blk('stringParam_ne27', [])),
        repeatWhileTrue(
            boolOp(iGet(), 'LESS_OR_EQUAL', lenOf('yzge')),
            [
                setAt('6lx5', iGet(), dist3()),
                incFuncVar(iLocal, '1'),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 3) ali7  "_rs faceIdx from to"  — sum per-face point distances
//    params: stringParam_g6gf (faceIdx, fixed), stringParam_wozg (from), stringParam_piid (to, fixed)
// ============================================================
{
    const fn = funcsById['ali7'];
    const jLocal = addLocal(fn, 'j');
    const jGet = () => getFuncVar(jLocal);
    const body = [
        setFuncVar(jLocal, blk('stringParam_wozg', [])),
        repeatWhileTrue(
            boolOp(jGet(), 'LESS', blk('stringParam_piid', [])),
            [
                setAt('2jic', blk('stringParam_g6gf', []), calc(
                    valAt('2jic', blk('stringParam_g6gf', [])),
                    'PLUS',
                    valAt('6lx5', valAt('r9ol', jGet())),
                )),
                incFuncVar(jLocal, '1'),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 4) 7pds  "reset_sort fi base"  — average per-face depth
//    params: stringParam_tx6g (fi), stringParam_kkt1 (base)
// ============================================================
{
    const fn = funcsById['7pds'];
    const fiLocal = addLocal(fn, 'fi');
    const baseLocal = addLocal(fn, 'base');
    const fiGet = () => getFuncVar(fiLocal);
    const baseGet = () => getFuncVar(baseLocal);
    const body = [
        setFuncVar(fiLocal, blk('stringParam_tx6g', [])),
        setFuncVar(baseLocal, blk('stringParam_kkt1', [])),
        repeatWhileTrue(
            boolOp(fiGet(), 'LESS_OR_EQUAL', lenOf('c8gh')),
            [
                setAt('c8gh', fiGet(), fiGet()),
                setAt('2jic', fiGet(), text('0')),
                funcCall('ali7', [fiGet(), baseGet(), calc(baseGet(), 'PLUS', valAt('gifn', fiGet()))]),
                setAt('2jic', fiGet(), calc(valAt('2jic', fiGet()), 'DIVIDE', valAt('gifn', fiGet()))),
                setFuncVar(baseLocal, calc(baseGet(), 'PLUS', valAt('gifn', fiGet()))),
                incFuncVar(fiLocal, '1'),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 5) 0aqy  "ternary v24w pj8x"  — ternary-search insertion point, then insert
//    params: stringParam_v24w (lo0), stringParam_pj8x (hi0)
//    existing locals m1,m2; add lo,hi
// ============================================================
{
    const fn = funcsById['0aqy'];
    const loLocal = addLocal(fn, 'lo');
    const hiLocal = addLocal(fn, 'hi');
    const loGet = () => getFuncVar(loLocal);
    const hiGet = () => getFuncVar(hiLocal);
    const m1Get = () => getFuncVar('0aqy_ddab');
    const m2Get = () => getFuncVar('0aqy_df0l');

    const body = [
        setFuncVar(loLocal, blk('stringParam_v24w', [])),
        setFuncVar(hiLocal, blk('stringParam_pj8x', [])),
        repeatWhileTrue(
            boolOp(loGet(), 'LESS', hiGet()),
            [
                setFuncVar('0aqy_ddab', calc(loGet(), 'PLUS', quotMod(calc(hiGet(), 'MINUS', loGet()), text('3'), 'QUOTIENT'))),
                ifElseStmt(
                    boolOp(getVar('ajvm'), 'GREATER', valAt('2jic', m1Get())),
                    [
                        setFuncVar(hiLocal, m1Get()),
                    ],
                    [
                        setFuncVar('0aqy_df0l', quotMod(calc(hiGet(), 'PLUS', m1Get()), text('2'), 'QUOTIENT')),
                        ifElseStmt(
                            boolOp(getVar('ajvm'), 'GREATER', valAt('2jic', m2Get())),
                            [
                                setFuncVar(loLocal, calc(m1Get(), 'PLUS', num('1'))),
                                setFuncVar(hiLocal, m2Get()),
                            ],
                            [
                                setFuncVar(loLocal, calc(m2Get(), 'PLUS', num('1'))),
                            ],
                        ),
                    ],
                ),
            ],
        ),
        // list is sorted DESCENDING (biggest/farthest first): if ajvm is
        // bigger than the converged element, it belongs AT lo (displacing it
        // rightward); otherwise it belongs just after, at lo+1.
        ifElseStmt(
            boolOp(getVar('ajvm'), 'GREATER', valAt('2jic', loGet())),
            [
                insertAt('2jic', loGet(), getVar('ajvm')),
                insertAt('c8gh', loGet(), getVar('88ly')),
            ],
            [
                insertAt('2jic', calc(loGet(), 'PLUS', num('1')), getVar('ajvm')),
                insertAt('c8gh', calc(loGet(), 'PLUS', num('1')), getVar('88ly')),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 6) ib7x  "sort ram3 makb i"  — insertion sort (calls 0aqy for insertion point)
//    params: stringParam_ram3 (lo, fixed), stringParam_makb (hi, fixed), stringParam_7or5 (i)
// ============================================================
{
    const fn = funcsById['ib7x'];
    const iLocal = addLocal(fn, 'i');
    const iGet = () => getFuncVar(iLocal);
    // the insertion-point search (formerly a call to 0aqy per element) is
    // inlined below — same ternary search, minus one function call per
    // sorted face per frame.
    const loL = addLocal(fn, 'lo'), hiL = addLocal(fn, 'hi'), m1L = addLocal(fn, 'm1'), m2L = addLocal(fn, 'm2');
    const lo = () => getFuncVar(loL), hi = () => getFuncVar(hiL), m1 = () => getFuncVar(m1L), m2 = () => getFuncVar(m2L);
    const body = [
        setFuncVar(iLocal, blk('stringParam_7or5', [])),
        repeatWhileTrue(
            boolOp(iGet(), 'LESS_OR_EQUAL', blk('stringParam_makb', [])),
            [
                setVar('ajvm', valAt('2jic', iGet())),
                setVar('88ly', valAt('c8gh', iGet())),
                setFuncVar(loL, blk('stringParam_ram3', [])),
                setFuncVar(hiL, calc(iGet(), 'MINUS', num('1'))),
                repeatWhileTrue(boolOp(lo(), 'LESS', hi()), [
                    setFuncVar(m1L, calc(lo(), 'PLUS', quotMod(calc(hi(), 'MINUS', lo()), text('3'), 'QUOTIENT'))),
                    ifElseStmt(boolOp(getVar('ajvm'), 'GREATER', valAt('2jic', m1())),
                        [setFuncVar(hiL, m1())],
                        [
                            setFuncVar(m2L, quotMod(calc(hi(), 'PLUS', m1()), text('2'), 'QUOTIENT')),
                            ifElseStmt(boolOp(getVar('ajvm'), 'GREATER', valAt('2jic', m2())),
                                [setFuncVar(loL, calc(m1(), 'PLUS', num('1'))), setFuncVar(hiL, m2())],
                                [setFuncVar(loL, calc(m2(), 'PLUS', num('1')))]),
                        ]),
                ]),
                ifElseStmt(boolOp(getVar('ajvm'), 'GREATER', valAt('2jic', lo())),
                    [insertAt('2jic', lo(), getVar('ajvm')), insertAt('c8gh', lo(), getVar('88ly'))],
                    [insertAt('2jic', calc(lo(), 'PLUS', num('1')), getVar('ajvm')), insertAt('c8gh', calc(lo(), 'PLUS', num('1')), getVar('88ly'))]),
                removeAt('2jic', calc(iGet(), 'PLUS', num('1'))),
                removeAt('c8gh', calc(iGet(), 'PLUS', num('1'))),
                incFuncVar(iLocal, '1'),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 7) ba3q  "draw_face fi ry41(unused) end"  — iterate faces in sorted order
//    params: stringParam_smz9 (fi), stringParam_ry41 (unused legacy param), stringParam_sydc (end, fixed)
// ============================================================
{
    const fn = funcsById['ba3q'];
    const fiLocal = addLocal(fn, 'fi');
    const fromLocal = addLocal(fn, 'pfrom');
    const fiGet = () => getFuncVar(fiLocal);
    // Draws sorted slots start..end of c8gh/2jic (built by build_draw_list:
    // only visible faces, already in layered back-to-front order). The face's
    // depth is passed straight to pe3p as its 4th argument — previously pe3p
    // looked up 2jic[faceId], but 2jic is indexed by SORTED SLOT, not face id,
    // so every face was fogged/shaded with some other face's distance.
    const body = [
        setFuncVar(fiLocal, blk('stringParam_smz9', [])),
        repeatWhileTrue(
            boolOp(fiGet(), 'LESS_OR_EQUAL', blk('stringParam_sydc', [])),
            [
                setFuncVar('ba3q_4nwz', valAt('c8gh', fiGet())),
                setFuncVar(fromLocal, calc(calc(calc(getFuncVar('ba3q_4nwz'), 'MINUS', num('1')), 'MULTI', getVar('lxi6')), 'PLUS', num('1'))),
                funcCall('pe3p', [
                    getFuncVar('ba3q_4nwz'),
                    getFuncVar(fromLocal),
                    calc(getFuncVar(fromLocal), 'PLUS', valAt('gifn', getFuncVar('ba3q_4nwz'))),
                    valAt('2jic', fiGet()),
                ]),
                incFuncVar(fiLocal, '1'),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 8) pe3p  "_df id from to terminator(unused)"  — near-plane clip + fill one face
//    params: stringParam_6opi (id, fixed), stringParam_c3y5 (from, fixed range start),
//            stringParam_5tep (to, fixed range end), stringParam_8zkc (unused legacy param)
//    NEW: real Sutherland-Hodgman single-plane (z = near_clipping) polygon clip.
// ============================================================
{
    const fn = funcsById['pe3p'];
    const jLocal = addLocal(fn, 'j');
    const kLocal = addLocal(fn, 'k');
    const tLocal = addLocal(fn, 't');
    const rLocal = addLocal(fn, 'rTemp');
    const gLocal = addLocal(fn, 'gTemp');
    const bLocal = addLocal(fn, 'bTemp');
    const jGet = () => getFuncVar(jLocal);
    const kGet = () => getFuncVar(kLocal);
    const idP = () => blk('stringParam_6opi', []);
    const fromP = () => blk('stringParam_c3y5', []);
    const toP = () => blk('stringParam_5tep', []);
    const depthP = () => blk('stringParam_8zkc', []);  // was an unused legacy param; now the face depth
    // outLocal = round(base[id] + (depth/maxDis) * (fogVar - base[id]))
    function channelBlend(faceColorList, fogVarName, outLocal) {
        return [
            setFuncVar(outLocal, valAt(faceColorList, idP())),
            setFuncVar(outLocal, calcOp(
                calc(getFuncVar(outLocal), 'PLUS', calc(
                    getFuncVar('pe3p_j82n'),  // fog factor depth/max_dis, computed once per face
                    'MULTI',
                    calc(getVar(fogVarName), 'MINUS', getFuncVar(outLocal)),
                )),
                'round',
            )),
        ];
    }
    // view-space x/y of a vertex, recomputed on demand (e83g no longer
    // stores them — only this rare near-plane-crossing path needs them)
    const viewDot = (idxF, bx, by, bz) => calc(
        calc(calc(valAt('u2g1', idxF()), 'MINUS', G('camx')), 'MULTI', G(bx)), 'PLUS',
        calc(calc(calc(valAt('c8kw', idxF()), 'MINUS', G('camy')), 'MULTI', G(by)), 'PLUS',
            calc(calc(valAt('yzge', idxF()), 'MINUS', G('camz')), 'MULTI', G(bz))),
    );
    function appendIntersection(aIdx, bIdx) {
        const lerpScreen = (bx, by, bz) => calc(getVar('0i4a'), 'MULTI', calc(
            calc(viewDot(aIdx, bx, by, bz), 'PLUS', calc(getFuncVar(tLocal), 'MULTI',
                calc(viewDot(bIdx, bx, by, bz), 'MINUS', viewDot(aIdx, bx, by, bz)))),
            'DIVIDE', getVar('nelz'),
        ));
        return [
            setFuncVar(tLocal, calc(
                calc(getVar('nelz'), 'MINUS', valAt(LIST_VIEW_Z, aIdx())),
                'DIVIDE',
                calc(valAt(LIST_VIEW_Z, bIdx()), 'MINUS', valAt(LIST_VIEW_Z, aIdx())),
            )),
            addToList(LIST_CLIP_SX, lerpScreen('b14x', 'b14y', 'b14z')),
            addToList(LIST_CLIP_SY, lerpScreen('b20x', 'b20y', 'b20z')),
        ];
    }
    // Sutherland-Hodgman single-edge (a -> b) clip step against the near plane.
    function clipEdge(aIdx, bIdx) {
        return ifElseStmt(
            boolOp(valAt(LIST_VIEW_Z, aIdx()), 'GREATER_OR_EQUAL', getVar('nelz')),
            [
                addToList(LIST_CLIP_SX, valAt('145x', aIdx())),
                addToList(LIST_CLIP_SY, valAt('foet', aIdx())),
                ifStmt(boolOp(valAt(LIST_VIEW_Z, bIdx()), 'LESS', getVar('nelz')), appendIntersection(aIdx, bIdx)),
            ],
            [
                ifStmt(boolOp(valAt(LIST_VIEW_Z, bIdx()), 'GREATER_OR_EQUAL', getVar('nelz')), appendIntersection(aIdx, bIdx)),
            ],
        );
    }
    const aIdx = () => valAt('r9ol', jGet());
    const bIdx = () => valAt('r9ol', calc(jGet(), 'PLUS', num('1')));
    const lastIdx = () => valAt('r9ol', jGet());
    const firstIdx = () => valAt('r9ol', fromP());
    const ptX = (idxF) => valAt('145x', idxF());
    const ptY = (idxF) => valAt('foet', idxF());

    const body = [
        // fill color (fog toward the sky color with depth), set once up front
        setFuncVar('pe3p_j82n', calc(depthP(), 'DIVIDE', getVar('4vlm'))),
        ifElseStmt(
            boolOp(getFuncVar('pe3p_j82n'), 'GREATER_OR_EQUAL', num('1')),
            [setFillColor(rgbToHex(getVar(VAR_FOG_R), getVar(VAR_FOG_G), getVar(VAR_FOG_B)))],
            [
                ...channelBlend(LIST_FACE_R, VAR_FOG_R, rLocal),
                ...channelBlend(LIST_FACE_G, VAR_FOG_G, gLocal),
                ...channelBlend(LIST_FACE_B, VAR_FOG_B, bLocal),
                setFillColor(rgbToHex(getFuncVar(rLocal), getFuncVar(gLocal), getFuncVar(bLocal))),
            ],
        ),
        ifElseStmt(
            boolOp(valAt(LIST_FACE_ALLVALID, idP()), 'EQUAL', num('1')),
            [
                // fast path: every point is in front of the near plane (the
                // common case) — trace the precomputed screen points directly,
                // no clip lists to clear/fill/walk.
                // unrolled: faces are 4 or 5 points
                locateXY(ptX(firstIdx), ptY(firstIdx)),
                startFill(),
                locateXY(ptX(() => valAt('r9ol', calc(fromP(), 'PLUS', num('1')))), ptY(() => valAt('r9ol', calc(fromP(), 'PLUS', num('1'))))),
                locateXY(ptX(() => valAt('r9ol', calc(fromP(), 'PLUS', num('2')))), ptY(() => valAt('r9ol', calc(fromP(), 'PLUS', num('2'))))),
                locateXY(ptX(() => valAt('r9ol', calc(fromP(), 'PLUS', num('3')))), ptY(() => valAt('r9ol', calc(fromP(), 'PLUS', num('3'))))),
                ifStmt(boolOp(calc(toP(), 'MINUS', fromP()), 'GREATER', num('4')), [
                    locateXY(ptX(() => valAt('r9ol', calc(fromP(), 'PLUS', num('4')))), ptY(() => valAt('r9ol', calc(fromP(), 'PLUS', num('4'))))),
                ]),
                locateXY(ptX(firstIdx), ptY(firstIdx)),
                stopFill(),
            ],
            [
                // clip path: Sutherland-Hodgman against the near plane.
                // points are [from, to-1]; interior edges (j, j+1) for
                // j < to-1, then the closing edge (to-1 -> from).
                setFuncVar(jLocal, fromP()),
                clearList(LIST_CLIP_SX),
                clearList(LIST_CLIP_SY),
                repeatWhileTrue(
                    boolOp(jGet(), 'LESS', calc(toP(), 'MINUS', num('1'))),
                    [clipEdge(aIdx, bIdx), incFuncVar(jLocal, '1')],
                ),
                clipEdge(lastIdx, firstIdx),
                ifStmt(
                    boolOp(lenOf(LIST_CLIP_SX), 'GREATER_OR_EQUAL', num('3')),
                    [
                        locateXY(valAt(LIST_CLIP_SX, num('1')), valAt(LIST_CLIP_SY, num('1'))),
                        startFill(),
                        setFuncVar(kLocal, num('2')),
                        repeatWhileTrue(
                            boolOp(kGet(), 'LESS_OR_EQUAL', lenOf(LIST_CLIP_SX)),
                            [
                                locateXY(valAt(LIST_CLIP_SX, kGet()), valAt(LIST_CLIP_SY, kGet())),
                                incFuncVar(kLocal, '1'),
                            ],
                        ),
                        locateXY(valAt(LIST_CLIP_SX, num('1')), valAt(LIST_CLIP_SY, num('1'))),
                        stopFill(),
                    ],
                ),
            ],
        ),
    ];
    setBody(fn, body);
}

// ============================================================
// 9) joc7 "draw" — fix draw-range bug: the old start index was
//    quotient_and_mod(length(gifn), 1/(1-tnp8), QUOTIENT), a heuristic that
//    (with c8gh/2jic sorted farthest-first) skips the farthest ~tnp8 fraction
//    of the GLOBAL sorted face list as a crude single-convex-object backface
//    approximation. With more than one object, faces from different objects
//    interleave in that global sort, so the fixed-fraction cutoff skips
//    faces that are still needed (or draws faces that should stay skipped),
//    producing visibly wrong occlusion / missing faces. Fix: always draw the
//    full sorted range (1..length) — correct occlusion for any object count,
//    and the FPS headroom (60-80fps observed) easily covers the extra faces.
// ============================================================
{
    const fn = funcsById['joc7'];
    const content = JSON.parse(fn.content);
    const header = content[0][0];
    const ba3qCall = header.statements[0].find(b => b.type === 'func_ba3q');
    if (!ba3qCall) throw new Error('joc7: func_ba3q call not found');
    ba3qCall.params[0] = text('1');
    fn.content = JSON.stringify(content);
}

// ============================================================
// 10) dsr9 "update_p1_pos" — full keyboard pitch/yaw/roll.
//    Camera basis: 14=right, 15=up, 16=forward (see hu00/g18x/dsr9 usage —
//    dsr9 already moves along 14/16 for strafe/forward-back with WASD, and
//    g18x already yaws 16 around 15 and pitches 16+15 around 14 from mouse
//    motion). The original file's only key-based rotation attempt — two
//    `is_press_some_key(81)` ("Q") blocks meant to roll opposite ways — both
//    checked the SAME key, so they always canceled each other out (net
//    rotation zero every frame). Replaced with a complete, working set:
//      Q(81)/E(69)   roll  — rotate right(14) & up(15) around forward(16)
//      ←(37)/→(39)   yaw   — rotate forward(16) around up(15)
//      ↑(38)/↓(40)   pitch — rotate forward(16) & up(15) around right(14)
//    All in addition to the existing mouse yaw/pitch — either input works.
// ============================================================
{
    const fn = funcsById['dsr9'];
    const content = JSON.parse(fn.content);
    const header = content[0][0];
    const stmts = header.statements[0];

    // drop both broken duplicate-key roll blocks
    const kept = stmts.filter(b => !(b.type === '_if' && b.params[0]?.type === 'is_press_some_key' && b.params[0]?.params?.[0] === '81'));

    function ifKey(keyCode, bodyStmts) {
        return ifStmt(blk('is_press_some_key', [String(keyCode), null]), bodyStmts);
    }
    // rotate the vector at vecIdx around the vector at axisIdx by angle
    // (degrees), then copy hu00's result (always written to slot 10) back
    // into vecIdx — the exact pattern the original roll code already used.
    function rotateAndStore(vecIdx, axisIdx, angleText) {
        return [
            funcCall('hu00', [text(String(vecIdx)), text(String(axisIdx)), text(angleText)]),
            setAt('p604', text(String(vecIdx)), valAt('p604', num('10'))),
            setAt('woyc', text(String(vecIdx)), valAt('woyc', num('10'))),
            setAt('23s0', text(String(vecIdx)), valAt('23s0', num('10'))),
        ];
    }
    // hu00's angle is in RADIANS despite the innocuous "-2"/"2" the original
    // (broken, self-cancelling) roll code used — at face value that's ~114.6
    // degrees of rotation in a SINGLE frame. 0.04 rad ≈ 2.3°/frame (~140°/s
    // held at 60fps), a normal look-rotation speed.
    const ROT_SPEED = '0.04';
    const newKeyBlocks = [
        ifKey(81, [...rotateAndStore(14, 16, '-' + ROT_SPEED), ...rotateAndStore(15, 16, '-' + ROT_SPEED)]), // Q: roll left
        ifKey(69, [...rotateAndStore(14, 16, ROT_SPEED), ...rotateAndStore(15, 16, ROT_SPEED)]),             // E: roll right
        ifKey(37, rotateAndStore(16, 15, '-' + ROT_SPEED)),                                                   // Left: yaw left
        ifKey(39, rotateAndStore(16, 15, ROT_SPEED)),                                                         // Right: yaw right
        ifKey(38, [...rotateAndStore(16, 14, ROT_SPEED), ...rotateAndStore(15, 14, ROT_SPEED)]),             // Up: pitch up
        ifKey(40, [...rotateAndStore(16, 14, '-' + ROT_SPEED), ...rotateAndStore(15, 14, '-' + ROT_SPEED)]), // Down: pitch down
    ];
    header.statements[0] = [...kept, ...newKeyBlocks];
    fn.content = JSON.stringify(content);
}

// ============================================================
// 11) main() per-frame loop, rebuilt:
//   erase → animate → apply_transforms → camera input (dsr9, g18x) →
//   reset_vector (72ba, moved AFTER input so the basis used for this frame
//   reflects this frame's rotation, not last frame's) → cache_camera →
//   project moving vertices always, static vertices only if the camera
//   moved → build_draw_list (chunk cull + per-face cull + layered sort) →
//   draw. The old reset_dot (per-vertex distance+sqrt) and reset_sort
//   (per-face distance average) passes are gone: collect_faces derives the
//   depth from view-space z in the same pass as the visibility test.
// ============================================================
{
    const fn = funcsById['m753'];
    const content = JSON.parse(fn.content);
    const header = content[0][0];
    const loopBlock = header.statements[0][1]; // repeat_inf
    const old = loopBlock.statements[0];
    const pick = (type) => {
        const b = old.find(x => x.type === type);
        if (!b) throw new Error('main: ' + type + ' not found');
        return b;
    };
    loopBlock.statements[0] = [
        pick('change_variable'),
        pick('brush_erase_all'),
        funcCall(FN_ANIMATE, []),
        funcCall(FN_APPLY_TRANSFORMS, []),
        pick('func_dsr9'),
        pick('func_g18x'),
        pick('func_72ba'),
        funcCall(FN_CACHE_CAM, []),
        funcCall('e83g', [num('1'), getVar(VAR_DYN_VEND)]),
        ifStmt(boolOp(getVar(VAR_DIRTY), 'EQUAL', num('1')), [
            funcCall(FN_CULL, []),
            funcCall(FN_PROJECT_STATIC, []),
        ]),
        funcCall(FN_BUILD_DRAW, []),
        funcCall('ba3q', [num('1'), num('1'), getVar(VAR_VIS_N)]),
    ];
    fn.content = JSON.stringify(content);
}

// ============================================================
// 12) drop functions this rewrite left unreferenced (old distance pass,
//     per-face averaging, the separate insertion search, apply_perspective,
//     translate, the old draw wrapper) — only if no block anywhere calls them.
// ============================================================
{
    const candidates = ['2x48', '7pds', 'ali7', '0aqy', '0y5z', 'gba1', 'joc7'];
    let removed = true;
    while (removed) {
        removed = false;
        for (const id of candidates) {
            const idx = project.functions.findIndex(f => f.id === id);
            if (idx < 0) continue;
            const others = [
                ...project.functions.filter(f => f.id !== id).map(f => f.content),
                ...project.objects.map(o => typeof o.script === 'string' ? o.script : JSON.stringify(o.script)),
            ].join('\n');
            if (!others.includes(`"func_${id}"`)) { project.functions.splice(idx, 1); removed = true; }
        }
    }
    const left = candidates.filter(id => project.functions.some(f => f.id === id));
    console.log('removed dead functions:', candidates.filter(id => !left.includes(id)).join(', '), left.length ? `(still referenced: ${left.join(', ')})` : '');
}

// ============================================================
// Write back
// ============================================================
fs.writeFileSync(projectPath, JSON.stringify(project));

// repack: tar (same internal layout) + gzip
const outTar = path.join(workDir, 'out.tar');
cp.execSync(`tar -cf "${outTar}" -C "${workDir}" temp`);
const tarData = fs.readFileSync(outTar);
const gzOut = zlib.gzipSync(tarData, { level: 9 });
fs.writeFileSync(OUT, gzOut);

console.log('wrote', OUT, gzOut.length, 'bytes');

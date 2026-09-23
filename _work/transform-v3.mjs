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
// face points: one list per point slot (face_p1..face_p5[face]) instead of
// the original flat face__ list (5 entries per face). Entry lists hold at
// most 5000 items, so the flat list capped a scene at 1000 faces; per-slot
// lists allow 5000 — and a point is one lookup, no (face-1)*5+k arithmetic.
const FACE_PTS = (() => {
    const flat = project.variables.find(v => v.id === 'r9ol');
    const stride = Number(project.variables.find(v => v.id === 'lxi6').value);
    const ids = [1, 2, 3, 4, 5].map(k => addList('face_p' + k, Array.from({ length: FACE_COUNT_0 }, (_, f) => flat.array[f * stride + k - 1]?.data ?? flat.array[f * stride].data)));
    flat.array = [];
    return ids;
})();
// back-face culling: faces of closed solids (face_1s = 1) carry an outward
// normal and are skipped when the eye is behind their plane; two-sided
// faces (walls seen from both sides, slabs, ...) have face_1s = 0
const LIST_FACE_1S = addList('face_1s', Array(FACE_COUNT_0).fill(0));
const LIST_FACE_NX = addList('face_nx', Array(FACE_COUNT_0).fill(0)), LIST_FACE_NY = addList('face_ny', Array(FACE_COUNT_0).fill(0)), LIST_FACE_NZ = addList('face_nz', Array(FACE_COUNT_0).fill(0));
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

// ============================================================
// ============================  v3  ==========================
// Render pipeline (PVS + layered painter's) and physics engine.
// Scene builders overwrite the defaults; the defaults describe the base
// engine (one static dodecahedron, one layer, no PVS, no bodies).
// ============================================================

// ---------- generic function builder with string params ----------
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
    fn.content = JSON.stringify([[{
        id: newId(), x: 0, y: 0, type: isValue ? 'function_create_value' : 'function_create',
        params: headerParams, statements: [body],
        movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [],
    }]]);
    return id;
}
const orAll = (conds) => conds.reduce((acc, c) => acc ? blk('boolean_and_or', [acc, 'OR', c]) : c, null);
const andAll = (conds) => conds.reduce((acc, c) => acc ? blk('boolean_and_or', [acc, 'AND', c]) : c, null);
const floorOf = (v) => calcOp(v, 'floor');
const sqrtOf = (v) => calcOp(v, 'root');
const timer = () => blk('get_project_timer_value', [null]);
const keyDown = (code) => blk('is_press_some_key', [String(code), null]);
const add2 = (a, b) => calc(a, 'PLUS', b), sub2 = (a, b) => calc(a, 'MINUS', b), mul2 = (a, b) => calc(a, 'MULTI', b);
// NOTE (Entry quirk, found in v2): never put a custom-function call inside
// an _if / if_else / repeat CONDITION slot inside a continue_repeat loop —
// the outer loop's synchronous continuation silently breaks. Everything
// below computes into a local first and tests the local.

const HALF_W = 260, HALF_H = 150; // visible stage half-extents (+margin)

// ---------- paged lists ----------
// An Entry list holds at most 5000 items. Data that can outgrow that is
// split over several lists ("pages") of <= 5000; item k lives in page
// ceil(k/5000). Reads/writes go through a short if-chain over the pages
// (the first page answers with a single comparison).
const PAGE = 5000;
const addPaged = (name, pages) => Array.from({ length: pages }, (_, i) => addList(`${name}_${i + 1}`, []));
function pagedAccess(pages, idxF, op) {   // op(listId, localIdxBlock) -> statement
    const build = (p) => {
        const local = () => p === 0 ? idxF() : calc(idxF(), 'MINUS', num(String(p * PAGE)));
        if (p === pages.length - 1) return [op(pages[p], local())];
        return [ifElseStmt(boolOp(idxF(), 'LESS_OR_EQUAL', num(String((p + 1) * PAGE))), [op(pages[p], local())], build(p + 1))];
    };
    return build(0);
}
const pagedRead = (pages, idxF, dst) => pagedAccess(pages, idxF, (l, i) => dst(valAt(l, i)));
const pagedWrite = (pages, idxF, valF) => pagedAccess(pages, idxF, (l, i) => setAt(l, i, valF()));
// capacities (pages x 5000 items)
const PVS_PAGES = 16, MARK_PAGES = 4, GRID_PAGES = 4;

// ---------- camera snapshot + dirty flag ----------
const VAR_CAM = {};
for (const n of ['camx', 'camy', 'camz', 'b14x', 'b14y', 'b14z', 'b19x', 'b19y', 'b19z', 'b20x', 'b20y', 'b20z']) VAR_CAM[n] = addVar(n, 0);
const G = (n) => getVar(VAR_CAM[n]);
// view angles in degrees (Entry's sin/cos take degrees). The camera basis
// is rebuilt from them every frame by update_look(); yaw 180 = looking -x.
const VAR_YAW = addVar('cam_yaw', 180), VAR_PITCH = addVar('cam_pitch', 0), VAR_ROLL = addVar('cam_roll', 0);
// B: show/hide balls, N: ball physics on/off (edge-detected toggles)
const VAR_BALL_RENDER = addVar('ball_render', 1), VAR_BALL_PHYS = addVar('ball_phys', 1);
const VAR_KB_PREV = addVar('kb_prev', 0), VAR_KN_PREV = addVar('kn_prev', 0);
const LIST_OBJ_BALL = addList('obj_ball', []);   // 1 = registry object driven by a ball body
// obj_hidden[o] = 1: object o is never collected (hidden doors, portal
// decals — those are drawn by ba3q right after their host face instead)
const LIST_OBJ_HIDDEN = addList('obj_hidden', []);
// active sets: only the current chamber's bodies / objects / buttons / doors
// / pads / fields / hint zones are simulated and tested each frame (rebuilt
// by level_reset from the *_level tags; level 0 = always active)
const LIST_ACT_B = addList('act_b', []), LIST_ACT_O = addList('act_o', []);
const LIST_OBJ_LEVEL = addList('obj_level', []);
// face_zb[f]: depth bias subtracted from the sort key; strongly negative for
// the convex room shell (which can never hide anything inside the room), so
// it is drawn first and can use big faces without sort errors
const LIST_FACE_ZB = addList('face_zb', Array(FACE_COUNT_0).fill(0));
const VAR_GAME = addVar('game_on', 0);
const CAM_SRC = [
    ['camx', 'p604', 17], ['camy', 'woyc', 17], ['camz', '23s0', 17],
    ['b14x', 'p604', 14], ['b14y', 'woyc', 14], ['b14z', '23s0', 14],
    ['b19x', 'p604', 19], ['b19y', 'woyc', 19], ['b19z', '23s0', 19],
    ['b20x', 'p604', 20], ['b20y', 'woyc', 20], ['b20z', '23s0', 20],
];
const LIST_CAM_PREV = addList('cam_prev', Array(12).fill('none'));
const VAR_DIRTY = addVar('cam_dirty', 1);
// redraw: the picture changed this frame (camera moved, a visible dynamic
// object moved, or an object's visibility flipped). Otherwise the pen
// drawing from the previous frame is still exact and is simply kept.
const VAR_REDRAW = addVar('redraw', 1);
const VAR_VIS_N = addVar('vis_n', 0);
const VAR_SORT_BASE = addVar('sort_base', 1);
const LIST_FACE_ALLVALID = addList('face_allvalid', Array(FACE_COUNT_0).fill(0));
// per-vertex screen-region code: 1000 if behind the near plane, else
// sx + 11*sy with sx/sy in {-1,0,1} (left/on/right of stage, below/on/above)
const LIST_OC = addList('scr_code', Array(VLEN).fill(0));
// lazy projection: proj_stamp[v] == proj_epoch means vertex v's view/screen
// values are current. The epoch advances whenever the camera moves; static
// vertices are then projected on first use by a front-facing face of an
// in-view cluster, never in bulk.
const LIST_VSTAMP = addList('proj_stamp', Array(VLEN).fill(0));
const VAR_EPOCH = addVar('proj_epoch', 1);

// ---------- draw layers: 0 = ground, then floor 1, slab 1, floor 2, ... ----------
const VAR_NFLOOR = addVar('n_floors', 1);
const VAR_FLOOR_H = addVar('floor_h', 1000000);
const LIST_LAYER_F0 = addList('layer_f0', [1, 1]);            // static face range per layer
const LIST_LAYER_F1 = addList('layer_f1', [0, FACE_COUNT_0]);
const VAR_STATIC_V0 = addVar('static_v0', 1), VAR_STATIC_V1 = addVar('static_v1', VLEN);

// ---------- PVS (precomputed potentially-visible sets per cell) ----------
const VAR_PVS = {};
for (const [n, v] of [['pvs_x0', 0], ['pvs_z0', 0], ['pvs_cs', 1], ['pvs_nx', 0], ['pvs_nz', 0], ['pvs_ok', 0], ['pvs_cell', 1]]) VAR_PVS[n] = addVar(n, v);
const P = (n) => getVar(VAR_PVS[n]);
// All PVS data lives in ONE packed, paged store (pvs_store_1..8): a stream
// of non-negative integers ("units"), pk_k units per list item, each unit a
// base-pk_base digit group (unit u = item ceil(u/k), digit group (u-1) mod k).
//   pvs_dir[cell]         (separate paged list) record start unit of each eye cell (0 = no PVS)
//   record                nRuns, inv, (firstCell, count) x nRuns   target cells (run-length):
//                                  the visible ones, or (inv=1) the invisible ones if fewer
//                         per draw layer: nC, cluster...       static clusters (presorted far-to-near)
// Static geometry is split into clusters: a few faces each, contiguous face
// and vertex ranges, a bounding sphere. The PVS lists clusters, and each
// frame a cluster is frustum-tested once (only when the camera moved) and
// then either skipped whole or projected + collected.
// The runtime never scans the store per frame: when the eye enters a new
// cell, load_cell() unpacks that cell's record into small working lists
// (cur_*), which the per-frame passes read directly.
const LIST_PVS_STORE = addPaged('pvs_store', PVS_PAGES);
const LIST_PVS_DIR = addPaged('pvs_dir', 2);
const VAR_PK_BASE = addVar('pk_base', 10), VAR_PK_K = addVar('pk_k', 1), VAR_PK_OUT = addVar('pk_out', 0);
const LIST_PK_POW = addList('pk_pow', [1]);
const LIST_CUR_FSTART = addList('cur_fstart', []), LIST_CUR_FCNT = addList('cur_fcnt', []), LIST_CUR_F = addList('cur_fitems', []);
const VAR_LOADED_CELL = addVar('loaded_cell', 0), VAR_CUR_VALID = addVar('cur_valid', 0);
// cell_mark: 1 = target cell potentially visible from the loaded eye cell
const LIST_CELL_MARK = addPaged('cell_mark', MARK_PAGES);
// cell_mark[t] == mark_stamp: t is listed in the loaded record (a new stamp
// per load, so marks never need clearing); cur_inv flips the meaning
const VAR_STAMP = addVar('mark_stamp', 0), VAR_CUR_INV = addVar('cur_inv', 0);
// clusters (default: the base engine's faces as one cluster)
const LIST_CL = {};
for (const [n, v] of [['cl_f0', 1], ['cl_f1', FACE_COUNT_0], ['cl_v0', 1], ['cl_v1', VLEN], ['cl_cx', 0], ['cl_cy', 0], ['cl_cz', 0], ['cl_r', 1000000], ['cl_vis', 1]]) LIST_CL[n] = addList(n, [v]);
// frustum half-slopes (stage half-size / focal) and sphere factors sqrt(1+t^2)
const VAR_FR = {};
for (const n of ['fr_tx', 'fr_ty', 'fr_kx', 'fr_ky']) VAR_FR[n] = addVar(n, 1);

// ---------- dynamic objects: registry objects 1..n_dyn ----------
const VAR_NDYN = addVar('n_dyn', 0);
const LIST_OBJ_MOVED = addList('obj_moved', []);
const LIST_OBJ_LX = addList('obj_lx', []), LIST_OBJ_LY = addList('obj_ly', []), LIST_OBJ_LZ = addList('obj_lz', []);

// ---------- animation of a decorative object ----------
const VAR_ANIM_OBJ = addVar('anim_obj', 0);
const VAR_ANIM_CX = addVar('anim_cx', 0), VAR_ANIM_CY = addVar('anim_cy', 0), VAR_ANIM_CZ = addVar('anim_cz', 0), VAR_ANIM_R = addVar('anim_r', 1);
const FN_ANIMATE = newFunction('animate', () => [
    setVar(VAR_ANIM_T, calc(getVar(VAR_ANIM_T), 'PLUS', text('1.2'))),
    ifStmt(boolOp(getVar(VAR_ANIM_OBJ), 'GREATER_OR_EQUAL', num('1')), [
        setAt(LIST_OBJ_X, getVar(VAR_ANIM_OBJ), calc(getVar(VAR_ANIM_CX), 'PLUS', calc(getVar(VAR_ANIM_R), 'MULTI', calcOp(getVar(VAR_ANIM_T), 'cos')))),
        setAt(LIST_OBJ_Y, getVar(VAR_ANIM_OBJ), calc(getVar(VAR_ANIM_CY), 'PLUS', calc(num('0.5'), 'MULTI', calcOp(calc(getVar(VAR_ANIM_T), 'MULTI', num('2')), 'sin')))),
        setAt(LIST_OBJ_Z, getVar(VAR_ANIM_OBJ), calc(getVar(VAR_ANIM_CZ), 'PLUS', calc(getVar(VAR_ANIM_R), 'MULTI', calcOp(getVar(VAR_ANIM_T), 'sin')))),
    ]),
]);

// pvs_read(u): unit u of the packed store -> pk_out
const FN_PK_READ = newFunctionWithParams('pvs_read', 1, false, (local, params) => {
    const [uP] = params;
    const u0 = local('u0'), w = local('w'), word = local('word');
    const gl = (l) => getFuncVar(l);
    return [
        setFuncVar(u0, calc(uP(), 'MINUS', num('1'))),
        setFuncVar(w, calc(floorOf(calc(gl(u0), 'DIVIDE', getVar(VAR_PK_K))), 'PLUS', num('1'))),
        ...pagedRead(LIST_PVS_STORE, () => gl(w), (v) => setFuncVar(word, v)),
        setVar(VAR_PK_OUT, quotMod(floorOf(calc(gl(word), 'DIVIDE',
            valAt(LIST_PK_POW, calc(quotMod(gl(u0), getVar(VAR_PK_K), 'MOD'), 'PLUS', num('1'))))), getVar(VAR_PK_BASE), 'MOD')),
    ];
});
// load_cell(c): unpack cell c's record into the cur_* working lists (the
// cluster list of each draw layer) and mark its target cells with a fresh stamp.
const FN_LOAD_CELL = newFunctionWithParams('load_cell', 1, false, (local, params) => {
    const [cP] = params;
    const L = {};
    for (const n of ['u', 'n', 'i', 'a', 'm', 't', 'ly']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const next = (dst) => [funcCall(FN_PK_READ, [g('u')]), dst(getVar(VAR_PK_OUT)), incFuncVar(L.u, '1')];
    const forN = (body) => [set('i', num('1')), repeatWhileTrue(boolOp(g('i'), 'LESS_OR_EQUAL', g('n')), [...body, incFuncVar(L.i, '1')])];
    return [
        ...[LIST_CUR_FSTART, LIST_CUR_FCNT, LIST_CUR_F].map(clearList),
        setVar(VAR_CUR_VALID, num('0')),
        setVar(VAR_STAMP, add2(getVar(VAR_STAMP), num('1'))),
        ...pagedRead(LIST_PVS_DIR, cP, (v) => set('u', v)),
        ifStmt(boolOp(g('u'), 'GREATER', num('0')), [
            setVar(VAR_CUR_VALID, num('1')),
            ...next((v) => set('n', v)),
            ...next((v) => setVar(VAR_CUR_INV, v)),
            ...forN([
                ...next((v) => set('a', v)),
                ...next((v) => set('m', v)),
                set('t', g('a')),
                repeatWhileTrue(boolOp(g('t'), 'LESS', add2(g('a'), g('m'))), [
                    ...pagedWrite(LIST_CELL_MARK, () => g('t'), () => getVar(VAR_STAMP)),
                    incFuncVar(L.t, '1'),
                ]),
            ]),
            set('ly', num('1')),
            repeatWhileTrue(boolOp(g('ly'), 'LESS_OR_EQUAL', calc(num('2'), 'MULTI', getVar(VAR_NFLOOR))), [
                ...next((v) => set('n', v)),
                addToList(LIST_CUR_FSTART, add2(lenOf(LIST_CUR_F), num('1'))),
                addToList(LIST_CUR_FCNT, g('n')),
                ...forN(next((v) => addToList(LIST_CUR_F, v))),
                incFuncVar(L.ly, '1'),
            ]),
        ]),
        setVar(VAR_LOADED_CELL, cP()),
    ];
});

// ---------- cache_camera(): snapshot, dirty flag, locate PVS cell ----------
const FN_CACHE_CAM = newFunction('cache_camera', (local) => {
    const ix = local('ix'), iz = local('iz'), iy = local('iy');
    const gl = (l) => getFuncVar(l);
    return [
        ...CAM_SRC.map(([g, l, i]) => setVar(VAR_CAM[g], valAt(l, num(String(i))))),
        setVar(VAR_FR.fr_tx, calc(num(String(HALF_W)), 'DIVIDE', getVar('0i4a'))),
        setVar(VAR_FR.fr_ty, calc(num(String(HALF_H)), 'DIVIDE', getVar('0i4a'))),
        setVar(VAR_FR.fr_kx, sqrtOf(add2(num('1'), mul2(getVar(VAR_FR.fr_tx), getVar(VAR_FR.fr_tx))))),
        setVar(VAR_FR.fr_ky, sqrtOf(add2(num('1'), mul2(getVar(VAR_FR.fr_ty), getVar(VAR_FR.fr_ty))))),
        setVar(VAR_DIRTY, num('0')),
        ...CAM_SRC.map(([g], k) => ifStmt(
            boolOp(getVar(VAR_CAM[g]), 'NOT_EQUAL', valAt(LIST_CAM_PREV, num(String(k + 1)))),
            [setVar(VAR_DIRTY, num('1'))])),
        ifStmt(boolOp(getVar(VAR_DIRTY), 'EQUAL', num('1')), [
            setVar(VAR_EPOCH, add2(getVar(VAR_EPOCH), num('1'))),
            ...CAM_SRC.map(([g], k) => setAt(LIST_CAM_PREV, num(String(k + 1)), getVar(VAR_CAM[g]))),
            // which PVS cell is the eye in? (x/z grid cell, floor band)
            setFuncVar(ix, floorOf(calc(calc(G('camx'), 'MINUS', P('pvs_x0')), 'DIVIDE', P('pvs_cs')))),
            setFuncVar(iz, floorOf(calc(calc(G('camz'), 'MINUS', P('pvs_z0')), 'DIVIDE', P('pvs_cs')))),
            setFuncVar(iy, floorOf(calc(G('camy'), 'DIVIDE', getVar(VAR_FLOOR_H)))),
            ifStmt(boolOp(gl(iy), 'LESS', num('0')), [setFuncVar(iy, num('0'))]),
            // bands 0..n_floors-1 = the floors, band n_floors = everything above
            // (reachable when flying)
            ifStmt(boolOp(gl(iy), 'GREATER', getVar(VAR_NFLOOR)), [setFuncVar(iy, getVar(VAR_NFLOOR))]),
            setVar(VAR_PVS.pvs_ok, num('0')),
            ifStmt(andAll([
                boolOp(gl(ix), 'GREATER_OR_EQUAL', num('0')), boolOp(gl(ix), 'LESS', P('pvs_nx')),
                boolOp(gl(iz), 'GREATER_OR_EQUAL', num('0')), boolOp(gl(iz), 'LESS', P('pvs_nz')),
            ]), [
                setVar(VAR_PVS.pvs_cell, calc(calc(gl(ix), 'PLUS', calc(P('pvs_nx'), 'MULTI', calc(gl(iz), 'PLUS', calc(P('pvs_nz'), 'MULTI', gl(iy))))), 'PLUS', num('1'))),
                ifStmt(boolOp(P('pvs_cell'), 'NOT_EQUAL', getVar(VAR_LOADED_CELL)), [funcCall(FN_LOAD_CELL, [P('pvs_cell')])]),
                setVar(VAR_PVS.pvs_ok, getVar(VAR_CUR_VALID)),
            ]),
        ]),
    ];
});



// ---------- object-level culling for dynamic objects ----------
// cull_objects(): per dynamic object, obj_vis = 1 only if
//  (a) the grid cell holding its center is potentially visible from the
//      eye's cell (cell-to-cell PVS, precomputed; cell_mark is
//      stamped by load_cell only when the eye changes cell), and
//  (b) its bounding sphere touches the view frustum.
// Invisible objects are neither projected nor collected.
const LIST_OBJ_VIS = addList('obj_vis', []);
const LIST_OBJ_RAD = addList('obj_rad', []);
const FN_CULL_OBJECTS = newFunction('cull_objects', (local) => {
    const L = {};
    for (const n of ['d', 'tx', 'ty', 'kx', 'ky', 'dx', 'dy', 'dz', 'vz', 'vx', 'vy', 'r', 'v', 'ix', 'iz', 'ib', 'ci', 'ka']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const dot = (bx, by, bz) => add2(mul2(g('dx'), G(bx)), add2(mul2(g('dy'), G(by)), mul2(g('dz'), G(bz))));
    const at = (list) => valAt(list, g('d'));
    return [
        set('tx', getVar(VAR_FR.fr_tx)), set('ty', getVar(VAR_FR.fr_ty)), set('kx', getVar(VAR_FR.fr_kx)), set('ky', getVar(VAR_FR.fr_ky)),
        set('ka', num('1')),
        repeatWhileTrue(boolOp(g('ka'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_O)), [
            set('d', valAt(LIST_ACT_O, g('ka'))),
            set('v', num('1')),
            ifStmt(boolOp(P('pvs_ok'), 'EQUAL', num('1')), [
                set('ix', floorOf(calc(sub2(at(LIST_OBJ_X), P('pvs_x0')), 'DIVIDE', P('pvs_cs')))),
                set('iz', floorOf(calc(sub2(at(LIST_OBJ_Z), P('pvs_z0')), 'DIVIDE', P('pvs_cs')))),
                set('ib', floorOf(calc(at(LIST_OBJ_Y), 'DIVIDE', getVar(VAR_FLOOR_H)))),
                ifStmt(boolOp(g('ib'), 'LESS', num('0')), [set('ib', num('0'))]),
                ifStmt(boolOp(g('ib'), 'GREATER', getVar(VAR_NFLOOR)), [set('ib', getVar(VAR_NFLOOR))]),
                ifStmt(andAll([
                    boolOp(g('ix'), 'GREATER_OR_EQUAL', num('0')), boolOp(g('ix'), 'LESS', P('pvs_nx')),
                    boolOp(g('iz'), 'GREATER_OR_EQUAL', num('0')), boolOp(g('iz'), 'LESS', P('pvs_nz')),
                ]), [
                    set('ci', add2(add2(g('ix'), mul2(P('pvs_nx'), add2(g('iz'), mul2(P('pvs_nz'), g('ib'))))), num('1'))),
                    ...pagedRead(LIST_CELL_MARK, () => g('ci'), (v) => set('v', v)),
                    ifElseStmt(boolOp(g('v'), 'EQUAL', getVar(VAR_STAMP)), [set('v', num('1'))], [set('v', num('0'))]),
                    ifStmt(boolOp(getVar(VAR_CUR_INV), 'EQUAL', num('1')), [set('v', sub2(num('1'), g('v')))]),
                ]),
            ]),
            ifStmt(boolOp(g('v'), 'EQUAL', num('1')), [
                set('dx', sub2(at(LIST_OBJ_X), G('camx'))), set('dy', sub2(at(LIST_OBJ_Y), G('camy'))), set('dz', sub2(at(LIST_OBJ_Z), G('camz'))),
                set('r', at(LIST_OBJ_RAD)),
                set('vz', sub2(num('0'), dot('b19x', 'b19y', 'b19z'))),
                set('vx', calcOp(dot('b14x', 'b14y', 'b14z'), 'abs')),
                set('vy', calcOp(dot('b20x', 'b20y', 'b20z'), 'abs')),
                ifStmt(orAll([
                    boolOp(g('vz'), 'LESS', sub2(getVar('nelz'), g('r'))),
                    boolOp(g('vx'), 'GREATER', add2(mul2(g('tx'), g('vz')), mul2(g('r'), g('kx')))),
                    boolOp(g('vy'), 'GREATER', add2(mul2(g('ty'), g('vz')), mul2(g('r'), g('ky')))),
                ]), [set('v', num('0'))]),
            ]),
            ifStmt(andAll([boolOp(getVar(VAR_BALL_RENDER), 'EQUAL', num('0')), boolOp(valAt(LIST_OBJ_BALL, g('d')), 'EQUAL', num('1'))]), [set('v', num('0'))]),
            ifStmt(boolOp(valAt(LIST_OBJ_HIDDEN, g('d')), 'EQUAL', num('1')), [set('v', num('0'))]),
            ifStmt(boolOp(valAt(LIST_OBJ_VIS, g('d')), 'NOT_EQUAL', g('v')), [setVar(VAR_REDRAW, num('1'))]),
            setAt(LIST_OBJ_VIS, g('d'), g('v')),
            incFuncVar(L.ka, '1'),
        ]),
    ];
});

// project_dynamic(): re-project each visible dynamic object's vertices when
// it moved this frame (sleeping bodies cost nothing).
const FN_PROJECT_DYNAMIC = newFunction('project_dynamic', (local) => {
    const d = local('d'), ka = local('ka');
    const g = () => getFuncVar(d);
    return [
        setFuncVar(ka, num('1')),
        repeatWhileTrue(boolOp(getFuncVar(ka), 'LESS_OR_EQUAL', lenOf(LIST_ACT_O)), [
            setFuncVar(d, valAt(LIST_ACT_O, getFuncVar(ka))),
            // (a camera move alone is handled by the lazy per-vertex projection)
            ifStmt(andAll([boolOp(valAt(LIST_OBJ_VIS, g()), 'EQUAL', num('1')), boolOp(valAt(LIST_OBJ_MOVED, g()), 'EQUAL', num('1'))]), [
                setVar(VAR_REDRAW, num('1')),
                funcCall('e83g', [valAt(LIST_OBJ_VSTART, g()), valAt(LIST_OBJ_VEND, g())]),
            ]),
            incFuncVar(ka, '1'),
        ]),
    ];
});

// ---------- collect_layer(i): visible faces of draw layer i ----------
// Static faces come from the in-view clusters of the eye cell's PVS (or, outside the
// PVS grid, the layer's whole face range). On floor layers the dynamic
// objects whose center lies in that floor's height band are added too, and
// the layer is sorted. Per face, one pass over its 4/5 points sums view-z
// (depth) and screen-region codes: behind-near-plane points -> keep for the
// clipper; all points beyond one stage edge -> cull; else keep.
const FN_COLLECT_LAYER = newFunctionWithParams('collect_layer', 1, false, (local, params) => {
    const [iP] = params;
    const L = {};
    for (const n of ['f', 'fend', 'k', 'kend', 'd', 'j', 'n', 'idx', 'sum', 'oc', 'sy', 'sx', 'pidx', 'ylo', 'yhi', 'oy', 'c', 'cx', 'cy', 'cz', 'vz', 'vx', 'vy', 'r', 'bf', 'ka']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const point = (k) => [
        set('idx', valAt(FACE_PTS[k - 1], g('f'))),
        ifStmt(boolOp(valAt(LIST_VSTAMP, g('idx')), 'NOT_EQUAL', getVar(VAR_EPOCH)), [funcCall('e83g', [g('idx'), g('idx')])]),
        set('sum', calc(g('sum'), 'PLUS', valAt(LIST_VIEW_Z, g('idx')))),
        set('oc', calc(g('oc'), 'PLUS', valAt(LIST_OC, g('idx')))),
    ];
    const append = (allValid) => [
        setVar(VAR_VIS_N, calc(getVar(VAR_VIS_N), 'PLUS', num('1'))),
        setAt('c8gh', getVar(VAR_VIS_N), g('f')),
        setAt('2jic', getVar(VAR_VIS_N), sub2(calc(g('sum'), 'DIVIDE', g('n')), valAt(LIST_FACE_ZB, g('f')))),
        setAt(LIST_FACE_ALLVALID, g('f'), num(allValid)),
    ];
    const faceBody = () => [
        set('bf', num('1')),
        ifStmt(boolOp(valAt(LIST_FACE_1S, g('f')), 'EQUAL', num('1')), [
            set('idx', valAt(FACE_PTS[0], g('f'))),
            ifStmt(boolOp(add2(mul2(sub2(G('camx'), valAt('u2g1', g('idx'))), valAt(LIST_FACE_NX, g('f'))),
                add2(mul2(sub2(G('camy'), valAt('c8kw', g('idx'))), valAt(LIST_FACE_NY, g('f'))),
                    mul2(sub2(G('camz'), valAt('yzge', g('idx'))), valAt(LIST_FACE_NZ, g('f'))))), 'LESS_OR_EQUAL', num('0')), [set('bf', num('0'))]),
        ]),
        ifStmt(boolOp(g('bf'), 'EQUAL', num('1')), faceVisible()),
    ];
    const faceVisible = () => [
        set('n', valAt('gifn', g('f'))),
        set('sum', num('0')), set('oc', num('0')),
        ...point(1), ...point(2), ...point(3),
        ifStmt(boolOp(g('n'), 'GREATER', num('3')), [...point(4), ifStmt(boolOp(g('n'), 'GREATER', num('4')), point(5))]),
        ifElseStmt(boolOp(g('oc'), 'GREATER', num('500')),
            [ifStmt(boolOp(g('oc'), 'LESS', calc(calc(num('1000'), 'MULTI', g('n')), 'MINUS', num('500'))), append('0'))],
            [
                set('sy', calcOp(calc(g('oc'), 'DIVIDE', num('11')), 'round')),
                set('sx', calc(g('oc'), 'MINUS', calc(num('11'), 'MULTI', g('sy')))),
                ifStmt(boolNot(orAll([
                    boolOp(g('sx'), 'EQUAL', g('n')), boolOp(g('sx'), 'EQUAL', calc(num('0'), 'MINUS', g('n'))),
                    boolOp(g('sy'), 'EQUAL', g('n')), boolOp(g('sy'), 'EQUAL', calc(num('0'), 'MINUS', g('n'))),
                ])), append('1')),
            ]),
    ];
    const faceRange = () => repeatWhileTrue(boolOp(g('f'), 'LESS_OR_EQUAL', g('fend')), [...faceBody(), incFuncVar(L.f, '1')]);
    const nLayers = () => calc(num('2'), 'MULTI', getVar(VAR_NFLOOR));
    return [
        setVar(VAR_SORT_BASE, calc(getVar(VAR_VIS_N), 'PLUS', num('1'))),
        ifElseStmt(boolOp(P('pvs_ok'), 'EQUAL', num('1')),
            [
                set('pidx', calc(iP(), 'PLUS', num('1'))),
                set('k', valAt(LIST_CUR_FSTART, g('pidx'))),
                set('kend', calc(g('k'), 'PLUS', valAt(LIST_CUR_FCNT, g('pidx')))),
                repeatWhileTrue(boolOp(g('k'), 'LESS', g('kend')), [
                    set('c', valAt(LIST_CUR_F, g('k'))),
                    // cluster frustum test (bounding sphere vs the view's side
                    // and near planes) — redone only when the camera moved; an
                    // in-view cluster's vertices are projected lazily by point()
                    ifStmt(boolOp(getVar(VAR_DIRTY), 'EQUAL', num('1')), [
                        set('cx', sub2(valAt(LIST_CL.cl_cx, g('c')), G('camx'))),
                        set('cy', sub2(valAt(LIST_CL.cl_cy, g('c')), G('camy'))),
                        set('cz', sub2(valAt(LIST_CL.cl_cz, g('c')), G('camz'))),
                        set('r', valAt(LIST_CL.cl_r, g('c'))),
                        set('vz', sub2(num('0'), add2(mul2(g('cx'), G('b19x')), add2(mul2(g('cy'), G('b19y')), mul2(g('cz'), G('b19z')))))),
                        ifElseStmt(boolOp(g('vz'), 'LESS', sub2(getVar('nelz'), g('r'))), [setAt(LIST_CL.cl_vis, g('c'), num('0'))], [
                            set('vx', calcOp(add2(mul2(g('cx'), G('b14x')), add2(mul2(g('cy'), G('b14y')), mul2(g('cz'), G('b14z')))), 'abs')),
                            set('vy', calcOp(add2(mul2(g('cx'), G('b20x')), add2(mul2(g('cy'), G('b20y')), mul2(g('cz'), G('b20z')))), 'abs')),
                            ifElseStmt(orAll([
                                boolOp(g('vx'), 'GREATER', add2(mul2(getVar(VAR_FR.fr_tx), g('vz')), mul2(g('r'), getVar(VAR_FR.fr_kx)))),
                                boolOp(g('vy'), 'GREATER', add2(mul2(getVar(VAR_FR.fr_ty), g('vz')), mul2(g('r'), getVar(VAR_FR.fr_ky)))),
                            ]), [setAt(LIST_CL.cl_vis, g('c'), num('0'))], [setAt(LIST_CL.cl_vis, g('c'), num('1'))]),
                        ]),
                    ]),
                    ifStmt(boolOp(valAt(LIST_CL.cl_vis, g('c')), 'EQUAL', num('1')), [
                        set('f', valAt(LIST_CL.cl_f0, g('c'))),
                        set('fend', valAt(LIST_CL.cl_f1, g('c'))),
                        faceRange(),
                    ]),
                    incFuncVar(L.k, '1'),
                ]),
            ],
            [
                set('f', valAt(LIST_LAYER_F0, calc(iP(), 'PLUS', num('1')))),
                set('fend', valAt(LIST_LAYER_F1, calc(iP(), 'PLUS', num('1')))),
                faceRange(),
            ]),
        // floor layers (odd i): add dynamic objects in this floor's band, then sort
        ifStmt(boolOp(quotMod(iP(), text('2'), 'MOD'), 'EQUAL', num('1')), [
            set('ylo', calc(calc(calc(iP(), 'MINUS', num('1')), 'DIVIDE', num('2')), 'MULTI', getVar(VAR_FLOOR_H))),
            set('yhi', calc(g('ylo'), 'PLUS', getVar(VAR_FLOOR_H))),
            set('ka', num('1')),
            repeatWhileTrue(boolOp(g('ka'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_O)), [
                set('d', valAt(LIST_ACT_O, g('ka'))),
                set('oy', valAt(LIST_OBJ_Y, g('d'))),
                ifStmt(andAll([
                    boolOp(valAt(LIST_OBJ_VIS, g('d')), 'EQUAL', num('1')),
                    orAll([boolOp(iP(), 'EQUAL', num('1')), boolOp(g('oy'), 'GREATER_OR_EQUAL', g('ylo'))]),
                    orAll([boolOp(iP(), 'EQUAL', calc(nLayers(), 'MINUS', num('1'))), boolOp(g('oy'), 'LESS', g('yhi'))]),
                ]), [
                    set('f', valAt(LIST_OBJ_FSTART, g('d'))),
                    set('fend', valAt(LIST_OBJ_FEND, g('d'))),
                    faceRange(),
                ]),
                incFuncVar(L.ka, '1'),
            ]),
            funcCall('ib7x', [getVar(VAR_SORT_BASE), getVar(VAR_VIS_N), getVar(VAR_SORT_BASE)]),
        ]),
    ];
});

// ---------- build_draw_list(): layered painter's order ----------
// Floors are separated by horizontal slab planes; a sight line from the eye
// never crosses a slab plane to reach geometry on the eye's own side, so
// the exact order is: ground; layers below the eye's floor bottom-up;
// layers above it top-down; the eye's floor last. Only floor layers need
// sorting, each on its own (small, thanks to the PVS).
const FN_BUILD_DRAW = newFunction('build_draw_list', (local) => {
    const e = local('e'), fl = local('fl'), i = local('i');
    const gl = (l) => getFuncVar(l);
    const top = () => calc(calc(num('2'), 'MULTI', getVar(VAR_NFLOOR)), 'MINUS', num('1'));
    return [
        setVar(VAR_VIS_N, num('0')),
        funcCall(FN_COLLECT_LAYER, [num('0')]),
        setFuncVar(e, calc(floorOf(calc(G('camy'), 'DIVIDE', getVar(VAR_FLOOR_H))), 'PLUS', num('1'))),
        ifStmt(boolOp(gl(e), 'LESS', num('1')), [setFuncVar(e, num('1'))]),
        ifStmt(boolOp(gl(e), 'GREATER', getVar(VAR_NFLOOR)), [setFuncVar(e, getVar(VAR_NFLOOR))]),
        setFuncVar(fl, calc(calc(num('2'), 'MULTI', gl(e)), 'MINUS', num('1'))),
        setFuncVar(i, num('1')),
        repeatWhileTrue(boolOp(gl(i), 'LESS', gl(fl)), [funcCall(FN_COLLECT_LAYER, [gl(i)]), incFuncVar(i, '1')]),
        setFuncVar(i, top()),
        repeatWhileTrue(boolOp(gl(i), 'GREATER', gl(fl)), [funcCall(FN_COLLECT_LAYER, [gl(i)]), setFuncVar(i, calc(gl(i), 'MINUS', num('1')))]),
        funcCall(FN_COLLECT_LAYER, [gl(fl)]),
    ];
});

// ============================================================
// Physics engine
// ------------------------------------------------------------
// Bodies: spheres (b_* lists): position, velocity, radius, inverse mass,
//   restitution, friction, flags (character controller, grounded, asleep),
//   and optionally a registry object whose position follows the body.
// Static world: oriented rectangles (col_* lists): center, normal, two
//   in-plane unit axes u/w and half extents hu/hw. Two-sided.
// Broadphase: spatially hashed uniform grid (grid_*). Each collider is stored in every cell
//   its bounding box — grown by the largest body radius — overlaps, so a
//   body only has to test the colliders listed in the one cell holding its
//   center: no duplicates, no multi-cell walk.
// Narrowphase: sphere vs rectangle via the closest point on the rectangle
//   (project onto u/w, clamp to the half extents), with a plane-distance
//   early-out first. Resolution: push out along the contact normal, reflect
//   the normal velocity with restitution, damp the tangential velocity.
// Bodies vs bodies: sphere-sphere, impulse by inverse mass (few bodies ->
//   all pairs; pairs where both are asleep are skipped).
// Stepping: fixed timestep with an accumulator (frame time from the project
//   timer, capped at 0.1 s; 1/60 s steps, at most 4 per frame so a slow frame can't
//   snowball), speed clamp so nothing moves more than 0.9 radius per step
//   (no tunneling through zero-thickness walls), sleeping bodies (at rest
//   on the ground for 30 steps) skipped until something hits them.
// Character controller (b_char=1, body 1 = player): WASD sets horizontal
//   velocity relative to the view's heading, Space jumps; when grounded
//   with no input it is held exactly still (no gravity creep, so the
//   camera — and the whole static-geometry projection — stays cached).
// ============================================================
const PH = {};
for (const [n, v] of [['ph_g', 18], ['ph_dt', 0.0166667], ['ph_acc', 0], ['ph_last', 0], ['ph_nb', 0],
    ['ph_walk', 4.2], ['ph_jump', 6.2], ['ph_eye', 0.6], ['ph_idle', 1], ['ph_rmax', 0.7],
    // flight (double-tap Space): no gravity, Space up / Shift down
    ['ph_fly', 0], ['ph_fly_speed', 7.5], ['ph_fly_vspeed', 5], ['sp_prev', 0], ['sp_last', -10],
    ['ph_spawnx', 0], ['ph_spawny', 1], ['ph_spawnz', 0],
    ['grid_tsize', 1], ['grid_x0', 0], ['grid_y0', 0], ['grid_z0', 0], ['grid_cs', 1], ['grid_nx', 0], ['grid_ny', 0], ['grid_nz', 0]]) PH[n] = addVar(n, v);
const PV = (n) => getVar(PH[n]);
const VAR_FLY_LABEL = addVar('fly_label', '');   // status text shown after the fps
const B = {};
for (const n of ['b_x', 'b_y', 'b_z', 'b_vx', 'b_vy', 'b_vz', 'b_r', 'b_im', 'b_e', 'b_f', 'b_char', 'b_gnd', 'b_sleep', 'b_still', 'b_obj']) B[n] = addList(n, []);
const C = {};
// col_on: collider active (closed doors 1, open doors 0); col_portal: a
// portal can be placed on it; col_tf0/col_tfn: its render faces in col_tiles
for (const n of ['col_cx', 'col_cy', 'col_cz', 'col_nx', 'col_ny', 'col_nz', 'col_ux', 'col_uy', 'col_uz', 'col_wx', 'col_wy', 'col_wz', 'col_hu', 'col_hw', 'col_1s', 'col_on', 'col_portal', 'col_tf0', 'col_tfn']) C[n] = addList(n, []);
const LIST_COL_TILES = addList('col_tiles', []);

// ============================================================
// Portal puzzle game layer (active when game_on = 1)
// ------------------------------------------------------------
// Two portals (1 = blue, 2 = orange) on portal-able surfaces. A body whose
// center crosses a portal's plane inside its opening comes out of the other
// portal with position and velocity rotated 180 degrees about the portal's
// up axis (momentum is conserved: fall into a floor portal, fly out of a
// wall portal). While both portals are open, a body inside a portal's
// opening ignores the host surface's collider, so it can pass into it.
// Cubes can be carried (F); floor buttons open doors of their group while
// pressed by any body; reaching the exit pad starts the next chamber.
// ============================================================
const GV = {};
for (const [n, v] of [['por_hu', 0.7], ['por_hw', 1.0], ['por_both', 0], ['held', 0], ['hold_tx', 0], ['hold_ty', 0], ['hold_tz', 0],
    ['cur_level', 1], ['n_levels', 0], ['kill_y', -1000], ['game_done', 0], ['msg_until', 0], ['force_redraw', 0],
    ['kq', 0], ['ke', 0], ['kc', 0], ['kf', 0], ['kr', 0], ['held_tp', 0], ['held_tp_t', 0], ['held_far', 0]]) GV[n] = addVar(n, v);
const VAR_MSG = addVar('game_msg', ''), VAR_HUD = addVar('hud_text', '');
const GL = {};
for (const n of ['por_on', 'por_cx', 'por_cy', 'por_cz', 'por_nx', 'por_ny', 'por_nz', 'por_rx', 'por_ry', 'por_rz', 'por_qx', 'por_qy', 'por_qz', 'por_col', 'por_obj', 'por_f']) GL[n] = addList(n, [0, 0]);
// jp_*: jump pads (launch velocity), fz_*: energy fields (clear portals,
// destroy cubes), btn_hold/btn_until: timed buttons, hz_*: hint zones
for (const n of ['jp_x', 'jp_y', 'jp_z', 'jp_r', 'jp_vx', 'jp_vy', 'jp_vz', 'fz_x0', 'fz_x1', 'fz_y0', 'fz_y1', 'fz_z0', 'fz_z1',
    'btn_hold', 'btn_until', 'hz_x0', 'hz_x1', 'hz_y0', 'hz_y1', 'hz_z0', 'hz_z1', 'hz_text', 'lv_name',
    'btn_level', 'door_level', 'jp_level', 'fz_level', 'hz_level', 'act_btn', 'act_door', 'act_jp', 'act_fz', 'act_hz']) GL[n] = addList(n, []);
for (const n of ['face_por', 'btn_x', 'btn_y', 'btn_z', 'btn_r', 'btn_group', 'btn_obj', 'btn_by', 'btn_on', 'door_obj', 'door_col', 'door_group', 'door_open',
    'grp_need', 'grp_cnt', 'lv_sx', 'lv_sy', 'lv_sz', 'lv_yaw', 'lv_ex', 'lv_ey', 'lv_ez', 'lv_hint', 'b_sx', 'b_sy', 'b_sz', 'b_level']) GL[n] = addList(n, []);
const GVv = (n) => getVar(GV[n]);
const por = (n, i) => valAt(GL[n], typeof i === 'number' ? num(String(i)) : i);
// Spatial hash: grid cell (ix, iy, iz) -> bucket ((ix+50000) + (iz+50000)*7919
// + (iy+50000)*104729) mod grid_tsize + 1. The table size is fixed (<= 5000)
// whatever the world size, and the world is unbounded; a bucket shared by
// two cells just hands the narrowphase a few extra candidates.
const LIST_GRID_START = addList('grid_start', []), LIST_GRID_CNT = addList('grid_cnt', []);
const LIST_GRID_ITEMS = addPaged('grid_items', GRID_PAGES);

// player_input(): body 1's desired horizontal velocity from WASD, relative
// to the view heading (from the camera's right vector, so looking up/down
// doesn't change walking direction), and jump.
const FN_PLAYER_INPUT = newFunction('player_input', (local) => {
    const L = {};
    for (const n of ['rx', 'rz', 'len', 'fa', 'sa', 'wx', 'wz', 'k', 'vy']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const one = () => num('1');
    return [
        // walking frame from the yaw alone: horizontal right = (sin y, 0, -cos y),
        // forward = (cos y, 0, sin y) — unaffected by pitch and roll
        set('rx', calcOp(getVar(VAR_YAW), 'sin')), set('rz', sub2(num('0'), calcOp(getVar(VAR_YAW), 'cos'))),
        set('fa', num('0')), set('sa', num('0')),
        ifStmt(keyDown(87), [set('fa', calc(g('fa'), 'PLUS', one()))]),
        ifStmt(keyDown(83), [set('fa', calc(g('fa'), 'MINUS', num('1')))]),
        ifStmt(keyDown(68), [set('sa', calc(g('sa'), 'PLUS', num('1')))]),
        ifStmt(keyDown(65), [set('sa', calc(g('sa'), 'MINUS', num('1')))]),
        set('k', PV('ph_walk')),
        ifStmt(andAll([boolOp(g('fa'), 'NOT_EQUAL', num('0')), boolOp(g('sa'), 'NOT_EQUAL', num('0'))]), [set('k', calc(g('k'), 'MULTI', num('0.7071')))]),
        set('wx', calc(calc(calc(num('0'), 'MINUS', g('rz')), 'MULTI', g('fa')), 'PLUS', calc(g('rx'), 'MULTI', g('sa')))),
        set('wz', calc(calc(g('rx'), 'MULTI', g('fa')), 'PLUS', calc(g('rz'), 'MULTI', g('sa')))),
        setVar(PH.ph_idle, num('1')),
        ifStmt(orAll([boolOp(g('fa'), 'NOT_EQUAL', num('0')), boolOp(g('sa'), 'NOT_EQUAL', num('0')), keyDown(32), andAll([keyDown(16), boolOp(PV('ph_fly'), 'EQUAL', num('1'))])]), [setVar(PH.ph_idle, num('0'))]),
        ifElseStmt(boolOp(PV('ph_fly'), 'EQUAL', num('1')), [
            // flying: direct velocity control on all three axes (stops when released)
            setAt(B.b_vx, num('1'), mul2(mul2(g('wx'), g('k')), calc(PV('ph_fly_speed'), 'DIVIDE', PV('ph_walk')))),
            setAt(B.b_vz, num('1'), mul2(mul2(g('wz'), g('k')), calc(PV('ph_fly_speed'), 'DIVIDE', PV('ph_walk')))),
            set('vy', num('0')),
            ifStmt(keyDown(32), [set('vy', add2(g('vy'), PV('ph_fly_vspeed')))]),
            ifStmt(keyDown(16), [set('vy', sub2(g('vy'), PV('ph_fly_vspeed')))]),
            setAt(B.b_vy, num('1'), g('vy')),
        ], [
        ifElseStmt(boolOp(valAt(B.b_gnd, one()), 'EQUAL', num('1')),
            [
                setAt(B.b_vx, num('1'), calc(g('wx'), 'MULTI', g('k'))),
                setAt(B.b_vz, num('1'), calc(g('wz'), 'MULTI', g('k'))),
                ifStmt(keyDown(32), [setAt(B.b_vy, num('1'), PV('ph_jump')), setAt(B.b_gnd, num('1'), num('0'))]),
            ],
            [   // limited air control: only with input and below walking speed, so
                // momentum (a jump, a fall, a portal fling) carries through the air
                ifStmt(andAll([orAll([boolOp(g('fa'), 'NOT_EQUAL', num('0')), boolOp(g('sa'), 'NOT_EQUAL', num('0'))]),
                    boolOp(add2(mul2(valAt(B.b_vx, num('1')), valAt(B.b_vx, num('1'))), mul2(valAt(B.b_vz, num('1')), valAt(B.b_vz, num('1')))), 'LESS', mul2(mul2(PV('ph_walk'), PV('ph_walk')), num('1.44')))]), [
                    setAt(B.b_vx, num('1'), calc(valAt(B.b_vx, num('1')), 'PLUS', calc(calc(calc(g('wx'), 'MULTI', g('k')), 'MINUS', valAt(B.b_vx, num('1'))), 'MULTI', num('0.08')))),
                    setAt(B.b_vz, num('1'), calc(valAt(B.b_vz, num('1')), 'PLUS', calc(calc(calc(g('wz'), 'MULTI', g('k')), 'MINUS', valAt(B.b_vz, num('1'))), 'MULTI', num('0.08')))),
                ]),
            ]),
        ]),
        setAt(B.b_sleep, num('1'), num('0')),
    ];
});

// phys_body(b): integrate one body and resolve it against the static world.
const FN_PHYS_BODY = newFunctionWithParams('phys_body', 1, false, (local, params) => {
    const [bP] = params;
    const L = {};
    for (const n of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'r', 'e', 'fr', 'gnd', 'sp2', 'vmax', 's', 'ix', 'iy', 'iz',
        'k', 'kend', 'c', 'dx', 'dy', 'dz', 'dn', 'a', 'w', 'ex', 'ey', 'ez', 'd2', 'd', 'pen', 'vn', 'rest', 'ee',
        'ox', 'oy', 'oz', 'skip', 'd0', 'd1', 'lr', 'lq', 'vr', 'vq', 'tp', 'lx', 'ly', 'lz', 'mr', 'mq', 'mn', 'yw']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const bl = (list) => valAt(list, bP());
    const cl = (list) => valAt(C[list], g('c'));
    const DT = () => PV('ph_dt');
    const mul = (a, b) => calc(a, 'MULTI', b), add = (a, b) => calc(a, 'PLUS', b), sub = (a, b) => calc(a, 'MINUS', b);
    const contact = [
        ifElseStmt(boolOp(g('d2'), 'LESS', num('0.0000001')),
            [   // center exactly on the rectangle: use its normal, facing the body
                set('ex', cl('col_nx')), set('ey', cl('col_ny')), set('ez', cl('col_nz')),
                ifStmt(boolOp(g('dn'), 'LESS', num('0')), [set('ex', sub(num('0'), g('ex'))), set('ey', sub(num('0'), g('ey'))), set('ez', sub(num('0'), g('ez')))]),
                set('d', num('0')),
            ],
            [
                set('d', sqrtOf(g('d2'))),
                set('ex', calc(g('ex'), 'DIVIDE', g('d'))), set('ey', calc(g('ey'), 'DIVIDE', g('d'))), set('ez', calc(g('ez'), 'DIVIDE', g('d'))),
            ]),
        set('pen', sub(g('r'), g('d'))),
        set('x', add(g('x'), mul(g('ex'), g('pen')))), set('y', add(g('y'), mul(g('ey'), g('pen')))), set('z', add(g('z'), mul(g('ez'), g('pen')))),
        set('vn', add(mul(g('vx'), g('ex')), add(mul(g('vy'), g('ey')), mul(g('vz'), g('ez'))))),
        ifStmt(boolOp(g('vn'), 'LESS', num('0')), [
            // restitution only for real impacts: a slow contact (resting,
            // rolling) is fully inelastic, so bodies settle instead of
            // jittering and can fall asleep
            set('ee', g('e')),
            ifStmt(boolOp(g('vn'), 'GREATER', num('-1.2')), [set('ee', num('0'))]),
            // tangential part damped by friction, normal part reflected with restitution
            set('vx', sub(mul(sub(g('vx'), mul(g('vn'), g('ex'))), sub(num('1'), g('fr'))), mul(mul(g('ee'), g('vn')), g('ex')))),
            set('vy', sub(mul(sub(g('vy'), mul(g('vn'), g('ey'))), sub(num('1'), g('fr'))), mul(mul(g('ee'), g('vn')), g('ey')))),
            set('vz', sub(mul(sub(g('vz'), mul(g('vn'), g('ez'))), sub(num('1'), g('fr'))), mul(mul(g('ee'), g('vn')), g('ez')))),
        ]),
        ifStmt(boolOp(g('ey'), 'GREATER', num('0.55')), [set('gnd', num('1'))]),
    ];
    const clamp = (n, lim) => [
        ifStmt(boolOp(g(n), 'GREATER', lim()), [set(n, lim())]),
        ifStmt(boolOp(g(n), 'LESS', sub(num('0'), lim())), [set(n, sub(num('0'), lim()))]),
    ];
    return [
        ifStmt(andAll([boolOp(bl(B.b_sleep), 'EQUAL', num('0')), orAll([boolOp(bl(B.b_char), 'EQUAL', num('1')), boolOp(getVar(VAR_BALL_PHYS), 'EQUAL', num('1'))])]), [
            set('x', bl(B.b_x)), set('y', bl(B.b_y)), set('z', bl(B.b_z)),
            set('vx', bl(B.b_vx)), set('vy', bl(B.b_vy)), set('vz', bl(B.b_vz)),
            set('r', bl(B.b_r)), set('e', bl(B.b_e)), set('fr', bl(B.b_f)),
            // character standing still on the ground: hold exactly in place
            set('rest', num('0')),
            ifStmt(andAll([boolOp(bl(B.b_char), 'EQUAL', num('1')), orAll([boolOp(bl(B.b_gnd), 'EQUAL', num('1')), boolOp(PV('ph_fly'), 'EQUAL', num('1'))]), boolOp(PV('ph_idle'), 'EQUAL', num('1'))]),
                [set('rest', num('1')), setAt(B.b_vx, bP(), num('0')), setAt(B.b_vy, bP(), num('0')), setAt(B.b_vz, bP(), num('0'))]),
            ifStmt(boolOp(g('rest'), 'EQUAL', num('0')), [
                // carried cube: a stiff spring toward the hold point, no gravity
                ifStmt(boolOp(bP(), 'EQUAL', GVv('held')), [
                    set('vx', mul(sub(GVv('hold_tx'), g('x')), num('12'))),
                    set('vy', mul(sub(GVv('hold_ty'), g('y')), num('12'))),
                    set('vz', mul(sub(GVv('hold_tz'), g('z')), num('12'))),
                ]),
                ifStmt(boolNot(orAll([andAll([boolOp(bl(B.b_char), 'EQUAL', num('1')), boolOp(PV('ph_fly'), 'EQUAL', num('1'))]), boolOp(bP(), 'EQUAL', GVv('held'))])), [
                    set('vy', sub(g('vy'), mul(PV('ph_g'), DT()))),
                ]),
                // speed clamp: at most 0.9 radius per step (no tunneling)
                set('sp2', add(mul(g('vx'), g('vx')), add(mul(g('vy'), g('vy')), mul(g('vz'), g('vz'))))),
                set('vmax', calc(mul(g('r'), num('0.9')), 'DIVIDE', DT())),
                ifStmt(boolOp(g('sp2'), 'GREATER', mul(g('vmax'), g('vmax'))), [
                    set('s', calc(g('vmax'), 'DIVIDE', sqrtOf(g('sp2')))),
                    set('vx', mul(g('vx'), g('s'))), set('vy', mul(g('vy'), g('s'))), set('vz', mul(g('vz'), g('s'))),
                ]),
                set('ox', g('x')), set('oy', g('y')), set('oz', g('z')),
                set('x', add(g('x'), mul(g('vx'), DT()))), set('y', add(g('y'), mul(g('vy'), DT()))), set('z', add(g('z'), mul(g('vz'), DT()))),
                // portals: center crossed a portal's plane inside its opening
                set('tp', num('0')),
                ifStmt(andAll([boolOp(GVv('por_both'), 'EQUAL', num('1')), boolOp(g('tp'), 'EQUAL', num('0'))]), [
                    set('d0', add(add(mul(sub(g('ox'), por('por_cx', 1)), por('por_nx', 1)), mul(sub(g('oy'), por('por_cy', 1)), por('por_ny', 1))), mul(sub(g('oz'), por('por_cz', 1)), por('por_nz', 1)))),
                    set('d1', add(add(mul(sub(g('x'), por('por_cx', 1)), por('por_nx', 1)), mul(sub(g('y'), por('por_cy', 1)), por('por_ny', 1))), mul(sub(g('z'), por('por_cz', 1)), por('por_nz', 1)))),
                    ifStmt(andAll([boolOp(g('d0'), 'GREATER_OR_EQUAL', num('0')), boolOp(g('d1'), 'LESS', num('0'))]), [
                        set('lr', add(add(mul(sub(g('x'), por('por_cx', 1)), por('por_rx', 1)), mul(sub(g('y'), por('por_cy', 1)), por('por_ry', 1))), mul(sub(g('z'), por('por_cz', 1)), por('por_rz', 1)))),
                        set('lq', add(add(mul(sub(g('x'), por('por_cx', 1)), por('por_qx', 1)), mul(sub(g('y'), por('por_cy', 1)), por('por_qy', 1))), mul(sub(g('z'), por('por_cz', 1)), por('por_qz', 1)))),
                        ifStmt(andAll([boolOp(calcOp(g('lr'), 'abs'), 'LESS', GVv('por_hu')), boolOp(calcOp(g('lq'), 'abs'), 'LESS', GVv('por_hw'))]), [
                            set('tp', num('1')),
                            set('vr', add(add(mul(g('vx'), por('por_rx', 1)), mul(g('vy'), por('por_ry', 1))), mul(g('vz'), por('por_rz', 1)))),
                            set('vq', add(add(mul(g('vx'), por('por_qx', 1)), mul(g('vy'), por('por_qy', 1))), mul(g('vz'), por('por_qz', 1)))),
                            set('vn', add(add(mul(g('vx'), por('por_nx', 1)), mul(g('vy'), por('por_ny', 1))), mul(g('vz'), por('por_nz', 1)))),
                            // rotate 180 degrees about the portal's up axis: r -> -r, n -> -n
                            ...['x', 'y', 'z'].map(k => set(k, add(add(add(por('por_c' + k, 2), mul(sub(num('0'), g('lr')), por('por_r' + k, 2))), mul(g('lq'), por('por_q' + k, 2))), mul(add(g('r'), num('0.05')), por('por_n' + k, 2))))),
                            ...['x', 'y', 'z'].map(k => set('v' + k, add(add(mul(sub(num('0'), g('vr')), por('por_r' + k, 2)), mul(g('vq'), por('por_q' + k, 2))), mul(sub(num('0'), g('vn')), por('por_n' + k, 2))))),
                            // a carried cube that went through first waits on the far side
                            ifStmt(boolOp(bP(), 'EQUAL', GVv('held')), [
                                setVar(GV.held_tp, num('1')), setVar(GV.held_tp_t, timer()),
                                setVar(GV.hold_tx, g('x')), setVar(GV.hold_ty, g('y')), setVar(GV.hold_tz, g('z')),
                            ]),
                            ifStmt(boolOp(bl(B.b_char), 'EQUAL', num('1')), [
                                // the view turns with the portal: transform the look vector
                                set('lx', mul(calcOp(getVar(VAR_PITCH), 'cos'), calcOp(getVar(VAR_YAW), 'cos'))),
                                set('ly', calcOp(getVar(VAR_PITCH), 'sin')),
                                set('lz', mul(calcOp(getVar(VAR_PITCH), 'cos'), calcOp(getVar(VAR_YAW), 'sin'))),
                                set('mr', add(add(mul(g('lx'), por('por_rx', 1)), mul(g('ly'), por('por_ry', 1))), mul(g('lz'), por('por_rz', 1)))),
                                set('mq', add(add(mul(g('lx'), por('por_qx', 1)), mul(g('ly'), por('por_qy', 1))), mul(g('lz'), por('por_qz', 1)))),
                                set('mn', add(add(mul(g('lx'), por('por_nx', 1)), mul(g('ly'), por('por_ny', 1))), mul(g('lz'), por('por_nz', 1)))),
                                ...['x', 'y', 'z'].map(k => set('l' + k, add(add(mul(sub(num('0'), g('mr')), por('por_r' + k, 2)), mul(g('mq'), por('por_q' + k, 2))), mul(sub(num('0'), g('mn')), por('por_n' + k, 2))))),
                                ifStmt(boolOp(g('ly'), 'GREATER', num('1')), [set('ly', num('1'))]),
                                ifStmt(boolOp(g('ly'), 'LESS', num('-1')), [set('ly', num('-1'))]),
                                setVar(VAR_PITCH, calcOp(g('ly'), 'asin_radian')),
                                ifElseStmt(boolOp(calcOp(g('lx'), 'abs'), 'LESS', num('0.00001')), [
                                    ifElseStmt(boolOp(g('lz'), 'GREATER', num('0')), [set('yw', num('90'))], [set('yw', num('270'))]),
                                ], [
                                    set('yw', calcOp(calc(g('lz'), 'DIVIDE', g('lx')), 'atan_radian')),
                                    ifStmt(boolOp(g('lx'), 'LESS', num('0')), [set('yw', add(g('yw'), num('180')))]),
                                ]),
                                // looking straight up/down: keep the old heading
                                ifStmt(boolOp(add(mul(g('lx'), g('lx')), mul(g('lz'), g('lz'))), 'GREATER', num('0.0001')), [setVar(VAR_YAW, g('yw'))]),
                                // a carried cube comes along
                                ifStmt(boolOp(GVv('held'), 'GREATER', num('0')), [
                                    setAt(B.b_x, GVv('held'), add(g('x'), mul(por('por_nx', 2), num('1.2')))),
                                    setAt(B.b_y, GVv('held'), add(g('y'), mul(por('por_ny', 2), num('1.2')))),
                                    setAt(B.b_z, GVv('held'), add(g('z'), mul(por('por_nz', 2), num('1.2')))),
                                    setAt(B.b_vx, GVv('held'), g('vx')), setAt(B.b_vy, GVv('held'), g('vy')), setAt(B.b_vz, GVv('held'), g('vz')),
                                    setVar(GV.held_tp, num('0')),
                                    // move the hold point too, or the spring pulls the cube back
                                    setVar(GV.hold_tx, valAt(B.b_x, GVv('held'))), setVar(GV.hold_ty, valAt(B.b_y, GVv('held'))), setVar(GV.hold_tz, valAt(B.b_z, GVv('held'))),
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
                ifStmt(andAll([boolOp(GVv('por_both'), 'EQUAL', num('1')), boolOp(g('tp'), 'EQUAL', num('0'))]), [
                    set('d0', add(add(mul(sub(g('ox'), por('por_cx', 2)), por('por_nx', 2)), mul(sub(g('oy'), por('por_cy', 2)), por('por_ny', 2))), mul(sub(g('oz'), por('por_cz', 2)), por('por_nz', 2)))),
                    set('d1', add(add(mul(sub(g('x'), por('por_cx', 2)), por('por_nx', 2)), mul(sub(g('y'), por('por_cy', 2)), por('por_ny', 2))), mul(sub(g('z'), por('por_cz', 2)), por('por_nz', 2)))),
                    ifStmt(andAll([boolOp(g('d0'), 'GREATER_OR_EQUAL', num('0')), boolOp(g('d1'), 'LESS', num('0'))]), [
                        set('lr', add(add(mul(sub(g('x'), por('por_cx', 2)), por('por_rx', 2)), mul(sub(g('y'), por('por_cy', 2)), por('por_ry', 2))), mul(sub(g('z'), por('por_cz', 2)), por('por_rz', 2)))),
                        set('lq', add(add(mul(sub(g('x'), por('por_cx', 2)), por('por_qx', 2)), mul(sub(g('y'), por('por_cy', 2)), por('por_qy', 2))), mul(sub(g('z'), por('por_cz', 2)), por('por_qz', 2)))),
                        ifStmt(andAll([boolOp(calcOp(g('lr'), 'abs'), 'LESS', GVv('por_hu')), boolOp(calcOp(g('lq'), 'abs'), 'LESS', GVv('por_hw'))]), [
                            set('tp', num('1')),
                            set('vr', add(add(mul(g('vx'), por('por_rx', 2)), mul(g('vy'), por('por_ry', 2))), mul(g('vz'), por('por_rz', 2)))),
                            set('vq', add(add(mul(g('vx'), por('por_qx', 2)), mul(g('vy'), por('por_qy', 2))), mul(g('vz'), por('por_qz', 2)))),
                            set('vn', add(add(mul(g('vx'), por('por_nx', 2)), mul(g('vy'), por('por_ny', 2))), mul(g('vz'), por('por_nz', 2)))),
                            // rotate 180 degrees about the portal's up axis: r -> -r, n -> -n
                            ...['x', 'y', 'z'].map(k => set(k, add(add(add(por('por_c' + k, 1), mul(sub(num('0'), g('lr')), por('por_r' + k, 1))), mul(g('lq'), por('por_q' + k, 1))), mul(add(g('r'), num('0.05')), por('por_n' + k, 1))))),
                            ...['x', 'y', 'z'].map(k => set('v' + k, add(add(mul(sub(num('0'), g('vr')), por('por_r' + k, 1)), mul(g('vq'), por('por_q' + k, 1))), mul(sub(num('0'), g('vn')), por('por_n' + k, 1))))),
                            // a carried cube that went through first waits on the far side
                            ifStmt(boolOp(bP(), 'EQUAL', GVv('held')), [
                                setVar(GV.held_tp, num('1')), setVar(GV.held_tp_t, timer()),
                                setVar(GV.hold_tx, g('x')), setVar(GV.hold_ty, g('y')), setVar(GV.hold_tz, g('z')),
                            ]),
                            ifStmt(boolOp(bl(B.b_char), 'EQUAL', num('1')), [
                                // the view turns with the portal: transform the look vector
                                set('lx', mul(calcOp(getVar(VAR_PITCH), 'cos'), calcOp(getVar(VAR_YAW), 'cos'))),
                                set('ly', calcOp(getVar(VAR_PITCH), 'sin')),
                                set('lz', mul(calcOp(getVar(VAR_PITCH), 'cos'), calcOp(getVar(VAR_YAW), 'sin'))),
                                set('mr', add(add(mul(g('lx'), por('por_rx', 2)), mul(g('ly'), por('por_ry', 2))), mul(g('lz'), por('por_rz', 2)))),
                                set('mq', add(add(mul(g('lx'), por('por_qx', 2)), mul(g('ly'), por('por_qy', 2))), mul(g('lz'), por('por_qz', 2)))),
                                set('mn', add(add(mul(g('lx'), por('por_nx', 2)), mul(g('ly'), por('por_ny', 2))), mul(g('lz'), por('por_nz', 2)))),
                                ...['x', 'y', 'z'].map(k => set('l' + k, add(add(mul(sub(num('0'), g('mr')), por('por_r' + k, 1)), mul(g('mq'), por('por_q' + k, 1))), mul(sub(num('0'), g('mn')), por('por_n' + k, 1))))),
                                ifStmt(boolOp(g('ly'), 'GREATER', num('1')), [set('ly', num('1'))]),
                                ifStmt(boolOp(g('ly'), 'LESS', num('-1')), [set('ly', num('-1'))]),
                                setVar(VAR_PITCH, calcOp(g('ly'), 'asin_radian')),
                                ifElseStmt(boolOp(calcOp(g('lx'), 'abs'), 'LESS', num('0.00001')), [
                                    ifElseStmt(boolOp(g('lz'), 'GREATER', num('0')), [set('yw', num('90'))], [set('yw', num('270'))]),
                                ], [
                                    set('yw', calcOp(calc(g('lz'), 'DIVIDE', g('lx')), 'atan_radian')),
                                    ifStmt(boolOp(g('lx'), 'LESS', num('0')), [set('yw', add(g('yw'), num('180')))]),
                                ]),
                                // looking straight up/down: keep the old heading
                                ifStmt(boolOp(add(mul(g('lx'), g('lx')), mul(g('lz'), g('lz'))), 'GREATER', num('0.0001')), [setVar(VAR_YAW, g('yw'))]),
                                // a carried cube comes along
                                ifStmt(boolOp(GVv('held'), 'GREATER', num('0')), [
                                    setAt(B.b_x, GVv('held'), add(g('x'), mul(por('por_nx', 1), num('1.2')))),
                                    setAt(B.b_y, GVv('held'), add(g('y'), mul(por('por_ny', 1), num('1.2')))),
                                    setAt(B.b_z, GVv('held'), add(g('z'), mul(por('por_nz', 1), num('1.2')))),
                                    setAt(B.b_vx, GVv('held'), g('vx')), setAt(B.b_vy, GVv('held'), g('vy')), setAt(B.b_vz, GVv('held'), g('vz')),
                                    setVar(GV.held_tp, num('0')),
                                    // move the hold point too, or the spring pulls the cube back
                                    setVar(GV.hold_tx, valAt(B.b_x, GVv('held'))), setVar(GV.hold_ty, valAt(B.b_y, GVv('held'))), setVar(GV.hold_tz, valAt(B.b_z, GVv('held'))),
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
                set('gnd', num('0')),
                // broadphase: the one grid cell holding the center
                set('ix', floorOf(calc(sub(g('x'), PV('grid_x0')), 'DIVIDE', PV('grid_cs')))),
                set('iy', floorOf(calc(sub(g('y'), PV('grid_y0')), 'DIVIDE', PV('grid_cs')))),
                set('iz', floorOf(calc(sub(g('z'), PV('grid_z0')), 'DIVIDE', PV('grid_cs')))),
                ifStmt(boolOp(PV('grid_tsize'), 'GREATER', num('0')), [
                    set('c', add(quotMod(add(add(g('ix'), num('50000')), add(mul(add(g('iz'), num('50000')), num('7919')), mul(add(g('iy'), num('50000')), num('104729')))), PV('grid_tsize'), 'MOD'), num('1'))),
                    set('k', valAt(LIST_GRID_START, g('c'))),
                    set('kend', add(g('k'), valAt(LIST_GRID_CNT, g('c')))),
                    repeatWhileTrue(boolOp(g('k'), 'LESS', g('kend')), [
                        ...pagedRead(LIST_GRID_ITEMS, () => g('k'), (v) => set('c', v)),
                        // inactive collider (open door), or the body is inside a portal
                        // opening on it (it may pass into the surface)
                        set('skip', sub(num('1'), cl('col_on'))),
                        ifStmt(boolOp(GVv('por_both'), 'EQUAL', num('1')), [
                            ifStmt(boolOp(g('c'), 'EQUAL', por('por_col', 1)), [
                                set('lr', add(add(mul(sub(g('x'), por('por_cx', 1)), por('por_rx', 1)), mul(sub(g('y'), por('por_cy', 1)), por('por_ry', 1))), mul(sub(g('z'), por('por_cz', 1)), por('por_rz', 1)))),
                                set('lq', add(add(mul(sub(g('x'), por('por_cx', 1)), por('por_qx', 1)), mul(sub(g('y'), por('por_cy', 1)), por('por_qy', 1))), mul(sub(g('z'), por('por_cz', 1)), por('por_qz', 1)))),
                                ifStmt(andAll([boolOp(calcOp(g('lr'), 'abs'), 'LESS', GVv('por_hu')), boolOp(calcOp(g('lq'), 'abs'), 'LESS', GVv('por_hw'))]), [set('skip', num('1'))]),
                            ]),
                            ifStmt(boolOp(g('c'), 'EQUAL', por('por_col', 2)), [
                                set('lr', add(add(mul(sub(g('x'), por('por_cx', 2)), por('por_rx', 2)), mul(sub(g('y'), por('por_cy', 2)), por('por_ry', 2))), mul(sub(g('z'), por('por_cz', 2)), por('por_rz', 2)))),
                                set('lq', add(add(mul(sub(g('x'), por('por_cx', 2)), por('por_qx', 2)), mul(sub(g('y'), por('por_cy', 2)), por('por_qy', 2))), mul(sub(g('z'), por('por_cz', 2)), por('por_qz', 2)))),
                                ifStmt(andAll([boolOp(calcOp(g('lr'), 'abs'), 'LESS', GVv('por_hu')), boolOp(calcOp(g('lq'), 'abs'), 'LESS', GVv('por_hw'))]), [set('skip', num('1'))]),
                            ]),
                        ]),
                        ifStmt(boolOp(g('skip'), 'EQUAL', num('0')), [
                            set('dx', sub(g('x'), cl('col_cx'))), set('dy', sub(g('y'), cl('col_cy'))), set('dz', sub(g('z'), cl('col_cz'))),
                            set('dn', add(mul(g('dx'), cl('col_nx')), add(mul(g('dy'), cl('col_ny')), mul(g('dz'), cl('col_nz'))))),
                            // early out: farther than r from the rectangle's plane, or
                            // behind a one-sided face (a face of a solid: its outward
                            // normal is col_n; from behind, the solid's other faces
                            // are the real contact — this prevents edge snags)
                            ifStmt(andAll([boolOp(g('dn'), 'LESS', g('r')), boolOp(g('dn'), 'GREATER', sub(num('0'), g('r'))),
                                orAll([boolOp(cl('col_1s'), 'EQUAL', num('0')), boolOp(g('dn'), 'GREATER_OR_EQUAL', num('0'))])]), [
                                set('a', add(mul(g('dx'), cl('col_ux')), add(mul(g('dy'), cl('col_uy')), mul(g('dz'), cl('col_uz'))))),
                                set('w', add(mul(g('dx'), cl('col_wx')), add(mul(g('dy'), cl('col_wy')), mul(g('dz'), cl('col_wz'))))),
                                ...clamp('a', () => cl('col_hu')),
                                ...clamp('w', () => cl('col_hw')),
                                // vector from the closest point on the rectangle to the center
                                set('ex', sub(sub(g('dx'), mul(cl('col_ux'), g('a'))), mul(cl('col_wx'), g('w')))),
                                set('ey', sub(sub(g('dy'), mul(cl('col_uy'), g('a'))), mul(cl('col_wy'), g('w')))),
                                set('ez', sub(sub(g('dz'), mul(cl('col_uz'), g('a'))), mul(cl('col_wz'), g('w')))),
                                set('d2', add(mul(g('ex'), g('ex')), add(mul(g('ey'), g('ey')), mul(g('ez'), g('ez'))))),
                                ifStmt(boolOp(g('d2'), 'LESS', mul(g('r'), g('r'))), contact),
                            ]),
                        ]),
                        incFuncVar(L.k, '1'),
                    ]),
                ]),
                setAt(B.b_x, bP(), g('x')), setAt(B.b_y, bP(), g('y')), setAt(B.b_z, bP(), g('z')),
                setAt(B.b_vx, bP(), g('vx')), setAt(B.b_vy, bP(), g('vy')), setAt(B.b_vz, bP(), g('vz')),
                setAt(B.b_gnd, bP(), g('gnd')),
                // sleep: non-character body resting on the ground for 30 steps
                ifStmt(andAll([boolOp(bl(B.b_char), 'EQUAL', num('0')), boolOp(bP(), 'NOT_EQUAL', GVv('held'))]), [
                    ifElseStmt(andAll([boolOp(g('gnd'), 'EQUAL', num('1')), boolOp(add(mul(g('vx'), g('vx')), add(mul(g('vy'), g('vy')), mul(g('vz'), g('vz')))), 'LESS', num('0.08'))]),
                        [setAt(B.b_still, bP(), add(bl(B.b_still), num('1')))],
                        [setAt(B.b_still, bP(), num('0'))]),
                    ifStmt(boolOp(bl(B.b_still), 'GREATER', num('30')), [
                        setAt(B.b_sleep, bP(), num('1')),
                        setAt(B.b_vx, bP(), num('0')), setAt(B.b_vy, bP(), num('0')), setAt(B.b_vz, bP(), num('0')),
                    ]),
                ]),
            ]),
        ]),
    ];
});

// phys_pairs(): sphere-sphere contacts between all body pairs.
const FN_PHYS_PAIRS = newFunction('phys_pairs', (local) => {
    const L = {};
    for (const n of ['i', 'j', 'dx', 'dy', 'dz', 'd2', 'rs', 'd', 'pen', 'wi', 'wj', 'rel', 'imp', 'e', 'ki', 'kj']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const at = (list, n) => valAt(B[list], g(n));
    const mul = (a, b) => calc(a, 'MULTI', b), add = (a, b) => calc(a, 'PLUS', b), sub = (a, b) => calc(a, 'MINUS', b);
    const axes = [['b_x', 'dx', 'b_vx'], ['b_y', 'dy', 'b_vy'], ['b_z', 'dz', 'b_vz']];
    return [
        set('ki', num('1')),
        repeatWhileTrue(boolOp(g('ki'), 'LESS', lenOf(LIST_ACT_B)), [
            set('i', valAt(LIST_ACT_B, g('ki'))),
            set('kj', add(g('ki'), num('1'))),
            repeatWhileTrue(boolOp(g('kj'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
                set('j', valAt(LIST_ACT_B, g('kj'))),
                ifStmt(andAll([boolOp(add(at('b_sleep', 'i'), at('b_sleep', 'j')), 'LESS', num('2')), boolNot(andAll([boolOp(g('i'), 'EQUAL', num('1')), boolOp(g('j'), 'EQUAL', GVv('held'))]))]), [
                    ...axes.map(([p, d]) => set(d, sub(at(p, 'j'), at(p, 'i')))),
                    set('d2', add(mul(g('dx'), g('dx')), add(mul(g('dy'), g('dy')), mul(g('dz'), g('dz'))))),
                    set('rs', add(at('b_r', 'i'), at('b_r', 'j'))),
                    ifStmt(andAll([boolOp(g('d2'), 'LESS', mul(g('rs'), g('rs'))), boolOp(g('d2'), 'GREATER', num('0.000001'))]), [
                        set('d', sqrtOf(g('d2'))),
                        ...axes.map(([, d]) => set(d, calc(g(d), 'DIVIDE', g('d')))),
                        set('pen', sub(g('rs'), g('d'))),
                        set('wi', calc(at('b_im', 'i'), 'DIVIDE', add(at('b_im', 'i'), at('b_im', 'j')))),
                        set('wj', sub(num('1'), g('wi'))),
                        ...axes.map(([p, d]) => setAt(B[p], g('i'), sub(at(p, 'i'), mul(mul(g(d), g('pen')), g('wi'))))),
                        ...axes.map(([p, d]) => setAt(B[p], g('j'), add(at(p, 'j'), mul(mul(g(d), g('pen')), g('wj'))))),
                        set('rel', add(mul(sub(at('b_vx', 'j'), at('b_vx', 'i')), g('dx')), add(mul(sub(at('b_vy', 'j'), at('b_vy', 'i')), g('dy')), mul(sub(at('b_vz', 'j'), at('b_vz', 'i')), g('dz'))))),
                        ifStmt(boolOp(g('rel'), 'LESS', num('0')), [
                            set('e', calc(add(at('b_e', 'i'), at('b_e', 'j')), 'DIVIDE', num('2'))),
                            set('imp', calc(mul(sub(num('0'), add(num('1'), g('e'))), g('rel')), 'DIVIDE', add(at('b_im', 'i'), at('b_im', 'j')))),
                            ...axes.map(([, d, v]) => setAt(B[v], g('i'), sub(at(v, 'i'), mul(mul(g('imp'), at('b_im', 'i')), g(d))))),
                            ...axes.map(([, d, v]) => setAt(B[v], g('j'), add(at(v, 'j'), mul(mul(g('imp'), at('b_im', 'j')), g(d))))),
                        ]),
                        // a touched body wakes up
                        setAt(B.b_sleep, g('i'), num('0')), setAt(B.b_sleep, g('j'), num('0')),
                        setAt(B.b_still, g('i'), num('0')), setAt(B.b_still, g('j'), num('0')),
                    ]),
                ]),
                incFuncVar(L.kj, '1'),
            ]),
            incFuncVar(L.ki, '1'),
        ]),
    ];
});

// phys_step(): fixed-timestep accumulator, then sync camera/objects to bodies.
const VAR_FRAME_DT = addVar('frame_dt', 0);
const FN_PHYS_STEP = newFunction('phys_step', (local) => {
    const now = local('now'), ft = local('ft'), s = local('s'), b = local('b'), o = local('o'), kb = local('kb');
    const gl = (l) => getFuncVar(l);
    const one = () => num('1');
    return [
        // real frame time (also drives the look keys: frame-rate independent)
        setFuncVar(now, timer()),
        setFuncVar(ft, calc(gl(now), 'MINUS', PV('ph_last'))),
        setVar(PH.ph_last, gl(now)),
        ifStmt(boolOp(gl(ft), 'GREATER', num('0.1')), [setFuncVar(ft, num('0.1'))]),
        ifStmt(boolOp(gl(ft), 'LESS', num('0')), [setFuncVar(ft, num('0'))]),
        setVar(VAR_FRAME_DT, gl(ft)),
        ifStmt(boolOp(PV('ph_nb'), 'GREATER_OR_EQUAL', num('1')), [
            // Space pressed twice within 0.35 s toggles flight (edge-detected:
            // holding Space counts once) — not in the portal game
            ifElseStmt(andAll([keyDown(32), boolOp(getVar(VAR_GAME), 'EQUAL', num('0'))]), [
                ifStmt(boolOp(PV('sp_prev'), 'EQUAL', num('0')), [
                    ifElseStmt(boolOp(calc(gl(now), 'MINUS', PV('sp_last')), 'LESS', num('0.35')), [
                        setVar(PH.ph_fly, calc(num('1'), 'MINUS', PV('ph_fly'))),
                        setVar(PH.sp_last, num('-10')),
                        setAt(B.b_vy, one(), num('0')),
                        setAt(B.b_gnd, one(), num('0')),
                    ], [setVar(PH.sp_last, gl(now))]),
                ]),
                setVar(PH.sp_prev, num('1')),
            ], [setVar(PH.sp_prev, num('0'))]),
            setVar(PH.ph_acc, calc(PV('ph_acc'), 'PLUS', gl(ft))),
            setFuncVar(s, num('0')),
            repeatWhileTrue(andAll([boolOp(PV('ph_acc'), 'GREATER_OR_EQUAL', PV('ph_dt')), boolOp(gl(s), 'LESS', num('4'))]), [
                ifStmt(boolOp(valAt(B.b_char, one()), 'EQUAL', num('1')), [funcCall(FN_PLAYER_INPUT, [])]),
                setFuncVar(kb, num('1')),
                repeatWhileTrue(boolOp(gl(kb), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [funcCall(FN_PHYS_BODY, [valAt(LIST_ACT_B, gl(kb))]), incFuncVar(kb, '1')]),
                ifStmt(boolOp(getVar(VAR_BALL_PHYS), 'EQUAL', num('1')), [funcCall(FN_PHYS_PAIRS, [])]),
                setVar(PH.ph_acc, calc(PV('ph_acc'), 'MINUS', PV('ph_dt'))),
                incFuncVar(s, '1'),
            ]),
            ifStmt(boolOp(PV('ph_acc'), 'GREATER', PV('ph_dt')), [setVar(PH.ph_acc, PV('ph_dt'))]),
            // fell out of the world: respawn
            ifStmt(boolOp(valAt(B.b_y, one()), 'LESS', num('-10')), [
                setAt(B.b_x, one(), PV('ph_spawnx')), setAt(B.b_y, one(), PV('ph_spawny')), setAt(B.b_z, one(), PV('ph_spawnz')),
                setAt(B.b_vx, one(), num('0')), setAt(B.b_vy, one(), num('0')), setAt(B.b_vz, one(), num('0')),
            ]),
            // camera follows the player body
            setAt('p604', num('17'), valAt(B.b_x, one())),
            setAt('woyc', num('17'), calc(valAt(B.b_y, one()), 'PLUS', PV('ph_eye'))),
            setAt('23s0', num('17'), valAt(B.b_z, one())),
            // rendered bodies follow their body
            setFuncVar(kb, num('1')),
            repeatWhileTrue(boolOp(gl(kb), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
                setFuncVar(b, valAt(LIST_ACT_B, gl(kb))),
                setFuncVar(o, valAt(B.b_obj, gl(b))),
                ifStmt(boolOp(gl(o), 'GREATER', num('0')), [
                    setAt(LIST_OBJ_X, gl(o), valAt(B.b_x, gl(b))), setAt(LIST_OBJ_Y, gl(o), valAt(B.b_y, gl(b))), setAt(LIST_OBJ_Z, gl(o), valAt(B.b_z, gl(b))),
                ]),
                incFuncVar(kb, '1'),
            ]),
        ]),
    ];
});

// apply_transforms(): re-derive the vertices of each movable object from
// base + offset — only when its offset actually changed since the last
// frame (per-object dirty flag obj_moved, also read by project_dynamic).
const FN_APPLY_TRANSFORMS = newFunction('apply_transforms', (local) => {
    const k = local('k'), v = local('v'), m = local('m'), ka = local('ka');
    const kG = () => getFuncVar(k), vG = () => getFuncVar(v);
    return [
        setFuncVar(ka, num('1')),
        repeatWhileTrue(boolOp(getFuncVar(ka), 'LESS_OR_EQUAL', lenOf(LIST_ACT_O)), [
            setFuncVar(k, valAt(LIST_ACT_O, getFuncVar(ka))),
            setFuncVar(m, num('0')),
            ifStmt(boolOp(valAt(LIST_OBJ_MOVABLE, kG()), 'EQUAL', num('1')), [
                ifStmt(orAll([
                    boolOp(valAt(LIST_OBJ_X, kG()), 'NOT_EQUAL', valAt(LIST_OBJ_LX, kG())),
                    boolOp(valAt(LIST_OBJ_Y, kG()), 'NOT_EQUAL', valAt(LIST_OBJ_LY, kG())),
                    boolOp(valAt(LIST_OBJ_Z, kG()), 'NOT_EQUAL', valAt(LIST_OBJ_LZ, kG())),
                ]), [
                    setFuncVar(m, num('1')),
                    setAt(LIST_OBJ_LX, kG(), valAt(LIST_OBJ_X, kG())),
                    setAt(LIST_OBJ_LY, kG(), valAt(LIST_OBJ_Y, kG())),
                    setAt(LIST_OBJ_LZ, kG(), valAt(LIST_OBJ_Z, kG())),
                    setFuncVar(v, valAt(LIST_OBJ_VSTART, kG())),
                    repeatWhileTrue(boolOp(vG(), 'LESS_OR_EQUAL', valAt(LIST_OBJ_VEND, kG())), [
                        setAt('u2g1', vG(), calc(valAt(LIST_BASE_X, vG()), 'PLUS', valAt(LIST_OBJ_X, kG()))),
                        setAt('c8kw', vG(), calc(valAt(LIST_BASE_Y, vG()), 'PLUS', valAt(LIST_OBJ_Y, kG()))),
                        setAt('yzge', vG(), calc(valAt(LIST_BASE_Z, vG()), 'PLUS', valAt(LIST_OBJ_Z, kG()))),
                        incFuncVar(v, '1'),
                    ]),
                ]),
            ]),
            setAt(LIST_OBJ_MOVED, kG(), getFuncVar(m)),
            incFuncVar(ka, '1'),
        ]),
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
                setAt(LIST_VSTAMP, iGet(), getVar(VAR_EPOCH)),
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
    const skipL = addLocal(fn, 'skip');
    const lo = () => getFuncVar(loL), hi = () => getFuncVar(hiL), m1 = () => getFuncVar(m1L), m2 = () => getFuncVar(m2L);
    const body = [
        setFuncVar(iLocal, blk('stringParam_7or5', [])),
        repeatWhileTrue(
            boolOp(iGet(), 'LESS_OR_EQUAL', blk('stringParam_makb', [])),
            [
                setVar('ajvm', valAt('2jic', iGet())),
                setVar('88ly', valAt('c8gh', iGet())),
                // already in place (not deeper than its predecessor): nothing to
                // move — the common case, since PVS lists come presorted
                // far-to-near from their cell's center
                // (nested, not AND: Entry evaluates both operands, and 2jic[0]
                // doesn't exist)
                setFuncVar(skipL, num('0')),
                ifStmt(boolOp(iGet(), 'GREATER', blk('stringParam_ram3', [])), [
                    ifStmt(boolOp(getVar('ajvm'), 'LESS_OR_EQUAL', valAt('2jic', calc(iGet(), 'MINUS', num('1')))), [setFuncVar(skipL, num('1'))]),
                ]),
                ifStmt(boolOp(getFuncVar(skipL), 'EQUAL', num('0')), [
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
                ]),
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
    const ppL = addLocal(fn, 'pp'), pfL = addLocal(fn, 'pf'), pvL = addLocal(fn, 'pv'), pxL = addLocal(fn, 'px');
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
                // pe3p reads the face's points from the per-slot lists; the
                // legacy from/to params are unused
                funcCall('pe3p', [getFuncVar('ba3q_4nwz'), num('0'), num('0'), add2(valAt('2jic', fiGet()), valAt(LIST_FACE_ZB, getFuncVar('ba3q_4nwz')))]),
                // portal decals on this face: drawn right after it
                ifStmt(boolOp(getVar(VAR_GAME), 'EQUAL', num('1')), [
                    setFuncVar(ppL, valAt(GL.face_por, getFuncVar('ba3q_4nwz'))),
                    ...[1, 2].map(p => ifStmt(andAll([orAll([boolOp(getFuncVar(ppL), 'EQUAL', num(String(p))), boolOp(getFuncVar(ppL), 'EQUAL', num('3'))]), boolOp(por('por_on', p), 'EQUAL', num('1'))]), [
                        ...[0, 1].flatMap(i => [
                            setFuncVar(pfL, add2(por('por_f', p), num(String(i)))),
                            setFuncVar(pvL, num('1')),
                            ...[0, 1, 2, 3].flatMap(k => [
                                setFuncVar(pxL, valAt(FACE_PTS[k], getFuncVar(pfL))),
                                ifStmt(boolOp(valAt(LIST_VSTAMP, getFuncVar(pxL)), 'NOT_EQUAL', getVar(VAR_EPOCH)), [funcCall('e83g', [getFuncVar(pxL), getFuncVar(pxL)])]),
                                ifStmt(boolOp(valAt(LIST_VIEW_Z, getFuncVar(pxL)), 'LESS', getVar('nelz')), [setFuncVar(pvL, num('0'))]),
                            ]),
                            setAt(LIST_FACE_ALLVALID, getFuncVar(pfL), getFuncVar(pvL)),
                            funcCall('pe3p', [getFuncVar(pfL), num('0'), num('0'), add2(valAt('2jic', fiGet()), valAt(LIST_FACE_ZB, getFuncVar('ba3q_4nwz')))]),
                        ]),
                    ])),
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
    // point k of this face (per-slot lists); n = its point count (3..5)
    const PT = (k) => () => valAt(FACE_PTS[k - 1], idP());
    const nPts = () => valAt('gifn', idP());
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
                // unrolled: faces are 3..5 points
                locateXY(ptX(PT(1)), ptY(PT(1))),
                startFill(),
                locateXY(ptX(PT(2)), ptY(PT(2))),
                locateXY(ptX(PT(3)), ptY(PT(3))),
                ifStmt(boolOp(nPts(), 'GREATER', num('3')), [
                    locateXY(ptX(PT(4)), ptY(PT(4))),
                    ifStmt(boolOp(nPts(), 'GREATER', num('4')), [locateXY(ptX(PT(5)), ptY(PT(5)))]),
                ]),
                locateXY(ptX(PT(1)), ptY(PT(1))),
                stopFill(),
            ],
            [
                // clip path: Sutherland-Hodgman against the near plane,
                // edges unrolled for 3-, 4- and 5-point faces
                clearList(LIST_CLIP_SX),
                clearList(LIST_CLIP_SY),
                clipEdge(PT(1), PT(2)),
                clipEdge(PT(2), PT(3)),
                ifElseStmt(boolOp(nPts(), 'EQUAL', num('3')),
                    [clipEdge(PT(3), PT(1))],
                    [
                        clipEdge(PT(3), PT(4)),
                        ifElseStmt(boolOp(nPts(), 'EQUAL', num('4')),
                            [clipEdge(PT(4), PT(1))],
                            [clipEdge(PT(4), PT(5)), clipEdge(PT(5), PT(1))]),
                    ]),
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
// 10) update_look() — FPS-style camera from angles (replaces the original
//     mouse handler g18x and the rotation keys of dsr9).
//     The original rotated the basis vectors incrementally: mouse yaw turned
//     forward around the camera's OWN up axis, which is tilted as soon as the
//     view is pitched, so every mouse move leaked a little into roll and the
//     roll accumulated (the horizon drifted crooked). Now the view is three
//     angles; yaw always turns around the WORLD vertical, pitch is clamped
//     to +-89 degrees, roll changes only with Q/E, and the basis is rebuilt
//     from the angles every frame, so no error can accumulate.
//       mouse: move right = turn right, move up = look up
//       arrows: left/right turn, up/down look up/down; Q/E roll
// ============================================================
const FN_UPDATE_LOOK = (() => newFunction('update_look', (local) => {
    const L = {};
    for (const n of ['mx', 'my', 'rate', 'cp', 'sp', 'cy', 'sy', 'cr', 'sr', 'lx', 'ly', 'lz', 'ux', 'uy', 'uz']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const mouse = (axis) => blk('coordinate_mouse', [null, axis, null]);
    const DEG = 57.29578;                  // sensitivity sp3g is in radians per stage unit
    const RATE = 137.5;                    // key turn rate, degrees per second (2.4 rad/s)
    const turnKey = (code, varId, sign) => ifStmt(blk('is_press_some_key', [String(code), null]),
        [setVar(varId, add2(getVar(varId), mul2(g('rate'), num(String(sign)))))]);
    const out = (i, x, y, z) => [
        setAt('p604', num(String(i)), x), setAt('woyc', num(String(i)), y), setAt('23s0', num(String(i)), z),
    ];
    return [
        // mouse: pointer movement since last frame
        set('mx', mouse('x')), set('my', mouse('y')),
        setVar(VAR_YAW, sub2(getVar(VAR_YAW), mul2(mul2(sub2(g('mx'), getVar('npj9')), getVar('sp3g')), num(String(DEG))))),
        setVar(VAR_PITCH, add2(getVar(VAR_PITCH), mul2(mul2(sub2(g('my'), getVar('70a4')), getVar('sp3g')), num(String(DEG))))),
        setVar('npj9', g('mx')), setVar('70a4', g('my')),
        // keys (frame-time based)
        set('rate', mul2(getVar(VAR_FRAME_DT), num(String(RATE)))),
        turnKey(37, VAR_YAW, 1), turnKey(39, VAR_YAW, -1),
        turnKey(38, VAR_PITCH, 1), turnKey(40, VAR_PITCH, -1),
        ifStmt(boolOp(getVar(VAR_GAME), 'EQUAL', num('0')), [turnKey(81, VAR_ROLL, -1), turnKey(69, VAR_ROLL, 1)]),
        ifStmt(boolOp(getVar(VAR_PITCH), 'GREATER', num('89')), [setVar(VAR_PITCH, num('89'))]),
        ifStmt(boolOp(getVar(VAR_PITCH), 'LESS', num('-89')), [setVar(VAR_PITCH, num('-89'))]),
        // keep yaw/roll in [0, 360) so the numbers never grow
        setVar(VAR_YAW, quotMod(add2(quotMod(getVar(VAR_YAW), num('360'), 'MOD'), num('360')), num('360'), 'MOD')),
        setVar(VAR_ROLL, quotMod(add2(quotMod(getVar(VAR_ROLL), num('360'), 'MOD'), num('360')), num('360'), 'MOD')),
        // basis: look L = (cos p cos y, sin p, cos p sin y); level up
        // U0 = (-sin p cos y, cos p, -sin p sin y); level right R = (sin y, 0, -cos y);
        // rolled up U = U0 cos r + R sin r.  Slot 16 = -L, slot 15 = U
        // (72ba derives the right/up axes used for projection from them).
        set('cp', calcOp(getVar(VAR_PITCH), 'cos')), set('sp', calcOp(getVar(VAR_PITCH), 'sin')),
        set('cy', calcOp(getVar(VAR_YAW), 'cos')), set('sy', calcOp(getVar(VAR_YAW), 'sin')),
        set('cr', calcOp(getVar(VAR_ROLL), 'cos')), set('sr', calcOp(getVar(VAR_ROLL), 'sin')),
        set('lx', mul2(g('cp'), g('cy'))), set('ly', g('sp')), set('lz', mul2(g('cp'), g('sy'))),
        set('ux', add2(mul2(mul2(sub2(num('0'), g('sp')), g('cy')), g('cr')), mul2(g('sy'), g('sr')))),
        set('uy', mul2(g('cp'), g('cr'))),
        set('uz', sub2(mul2(mul2(sub2(num('0'), g('sp')), g('sy')), g('cr')), mul2(g('cy'), g('sr')))),
        ...out(16, sub2(num('0'), g('lx')), sub2(num('0'), g('ly')), sub2(num('0'), g('lz'))),
        ...out(15, g('ux'), g('uy'), g('uz')),
    ];
}))();


// ============================================================
// 10a) portal game functions
// ============================================================
const cosD = (v) => calcOp(v, 'cos'), sinD = (v) => calcOp(v, 'sin'), absV = (v) => calcOp(v, 'abs');
const dot3 = (a, b) => add2(add2(mul2(a[0], b[0]), mul2(a[1], b[1])), mul2(a[2], b[2]));
const colv = (n, i) => valAt(C[n], i);

// portal_mark(p, s): add (s = 1) or remove (s = -1) portal p's bit in face_por
// of the render faces of its host surface that it overlaps; ba3q draws the
// portal right after drawing any face carrying its bit (a decal: on top of
// its wall, but under anything drawn later, i.e. nearer)
const FN_PORTAL_MARK = newFunctionWithParams('portal_mark', 2, false, (local, params) => {
    const [pP, sP] = params;
    const L = {};
    for (const n of ['c', 'k', 'kend', 'f', 'tx', 'ty', 'tz', 'dr', 'dq', 'has']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const vtx = (list, k) => valAt(list, valAt(FACE_PTS[k], g('f')));
    const avg = (list) => mul2(add2(add2(vtx(list, 0), vtx(list, 1)), add2(vtx(list, 2), vtx(list, 3))), num('0.25'));
    return [
        set('c', por('por_col', pP())),
        set('k', colv('col_tf0', g('c'))),
        set('kend', add2(g('k'), colv('col_tfn', g('c')))),
        repeatWhileTrue(boolOp(g('k'), 'LESS', g('kend')), [
            set('f', valAt(LIST_COL_TILES, g('k'))),
            set('tx', sub2(avg('u2g1'), por('por_cx', pP()))), set('ty', sub2(avg('c8kw'), por('por_cy', pP()))), set('tz', sub2(avg('yzge'), por('por_cz', pP()))),
            set('dr', dot3([g('tx'), g('ty'), g('tz')], [por('por_rx', pP()), por('por_ry', pP()), por('por_rz', pP())])),
            set('dq', dot3([g('tx'), g('ty'), g('tz')], [por('por_qx', pP()), por('por_qy', pP()), por('por_qz', pP())])),
            ifStmt(andAll([boolOp(absV(g('dr')), 'LESS', add2(num('1.5'), GVv('por_hu'))), boolOp(absV(g('dq')), 'LESS', add2(num('1.5'), GVv('por_hw')))]), [
                set('has', num('0')),
                ifStmt(orAll([boolOp(valAt(GL.face_por, g('f')), 'EQUAL', pP()), boolOp(valAt(GL.face_por, g('f')), 'EQUAL', num('3'))]), [set('has', num('1'))]),
                ifStmt(andAll([boolOp(sP(), 'EQUAL', num('1')), boolOp(g('has'), 'EQUAL', num('0'))]), [setAt(GL.face_por, g('f'), add2(valAt(GL.face_por, g('f')), pP()))]),
                ifStmt(andAll([boolOp(sP(), 'EQUAL', num('-1')), boolOp(g('has'), 'EQUAL', num('1'))]), [setAt(GL.face_por, g('f'), sub2(valAt(GL.face_por, g('f')), pP()))]),
            ]),
            incFuncVar(L.k, '1'),
        ]),
    ];
});

const wakeAll = (local) => {
    const w = local('wk');
    return [
        setFuncVar(w, num('1')),
        repeatWhileTrue(boolOp(getFuncVar(w), 'LESS_OR_EQUAL', PV('ph_nb')), [
            setAt(B.b_sleep, getFuncVar(w), num('0')), setAt(B.b_still, getFuncVar(w), num('0')), setAt(B.b_gnd, getFuncVar(w), num('0')),
            incFuncVar(w, '1'),
        ]),
    ];
};
const say = (msg, secs) => [setVar(VAR_MSG, text(msg)), setVar(GV.msg_until, add2(timer(), num(String(secs))))];

// portal_shoot(p): cast a ray from the eye along the view against every
// active collider (once per key press, so brute force is fine); if the
// nearest hit is portal-able, fit portal p on it: walls keep the portal
// upright and inside one 3-unit height band (so it never straddles a draw
// layer plane), floors/ceilings orient it along the view; it must fit
// inside the surface and not overlap the other portal.
const FN_PORTAL_SHOOT = newFunctionWithParams('portal_shoot', 1, false, (local, params) => {
    const [pP] = params;
    const L = {};
    for (const n of ['ex', 'ey', 'ez', 'dx', 'dy', 'dz', 'c', 'best', 'bc', 'den', 't', 'hx', 'hy', 'hz', 'a', 'w', 'nx', 'ny', 'nz',
        'qx', 'qy', 'qz', 'rx', 'ry', 'rz', 'er', 'eq', 'orr', 'oq', 'lo', 'hi', 'ok', 'k', 'cx', 'cy', 'cz', 'o', 'v0', 'pf', 'tmp']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const clampTo = (n, lo, hi) => [ifStmt(boolOp(g(n), 'LESS', lo()), [set(n, lo())]), ifStmt(boolOp(g(n), 'GREATER', hi()), [set(n, hi())])];
    const cc = () => [colv('col_cx', g('c')), colv('col_cy', g('c')), colv('col_cz', g('c'))];
    const bcv = (n) => colv(n, g('bc'));
    const HEX = [[0, 1], [1, 0.5], [1, -0.5], [0, -1], [-1, -0.5], [-1, 0.5]];
    const setP = (n, v) => setAt(GL[n], pP(), v);
    return [
        set('ex', valAt(B.b_x, num('1'))), set('ey', add2(valAt(B.b_y, num('1')), PV('ph_eye'))), set('ez', valAt(B.b_z, num('1'))),
        set('dx', mul2(cosD(getVar(VAR_PITCH)), cosD(getVar(VAR_YAW)))), set('dy', sinD(getVar(VAR_PITCH))), set('dz', mul2(cosD(getVar(VAR_PITCH)), sinD(getVar(VAR_YAW)))),
        set('best', num('100000')), set('bc', num('0')), set('c', num('1')),
        repeatWhileTrue(boolOp(g('c'), 'LESS_OR_EQUAL', lenOf(C.col_cx)), [
            ifStmt(boolOp(colv('col_on', g('c')), 'EQUAL', num('1')), [
                set('den', dot3([g('dx'), g('dy'), g('dz')], [colv('col_nx', g('c')), colv('col_ny', g('c')), colv('col_nz', g('c'))])),
                ifStmt(boolOp(absV(g('den')), 'GREATER', num('0.0001')), [
                    set('t', calc(dot3([sub2(cc()[0], g('ex')), sub2(cc()[1], g('ey')), sub2(cc()[2], g('ez'))], [colv('col_nx', g('c')), colv('col_ny', g('c')), colv('col_nz', g('c'))]), 'DIVIDE', g('den'))),
                    ifStmt(andAll([boolOp(g('t'), 'GREATER', num('0.05')), boolOp(g('t'), 'LESS', g('best'))]), [
                        set('hx', sub2(add2(g('ex'), mul2(g('dx'), g('t'))), cc()[0])),
                        set('hy', sub2(add2(g('ey'), mul2(g('dy'), g('t'))), cc()[1])),
                        set('hz', sub2(add2(g('ez'), mul2(g('dz'), g('t'))), cc()[2])),
                        set('a', dot3([g('hx'), g('hy'), g('hz')], [colv('col_ux', g('c')), colv('col_uy', g('c')), colv('col_uz', g('c'))])),
                        set('w', dot3([g('hx'), g('hy'), g('hz')], [colv('col_wx', g('c')), colv('col_wy', g('c')), colv('col_wz', g('c'))])),
                        ifStmt(andAll([boolOp(absV(g('a')), 'LESS_OR_EQUAL', colv('col_hu', g('c'))), boolOp(absV(g('w')), 'LESS_OR_EQUAL', colv('col_hw', g('c')))]),
                            [set('best', g('t')), set('bc', g('c'))]),
                    ]),
                ]),
            ]),
            incFuncVar(L.c, '1'),
        ]),
        set('ok', num('0')),
        ifStmt(boolOp(g('bc'), 'GREATER', num('0')), [ifStmt(boolOp(bcv('col_portal'), 'EQUAL', num('1')), [
            set('ok', num('1')),
            set('cx', bcv('col_cx')), set('cy', bcv('col_cy')), set('cz', bcv('col_cz')),
            set('hx', add2(g('ex'), mul2(g('dx'), g('best')))), set('hy', add2(g('ey'), mul2(g('dy'), g('best')))), set('hz', add2(g('ez'), mul2(g('dz'), g('best')))),
            // surface normal facing the shooter
            set('nx', bcv('col_nx')), set('ny', bcv('col_ny')), set('nz', bcv('col_nz')),
            ifStmt(boolOp(dot3([g('dx'), g('dy'), g('dz')], [g('nx'), g('ny'), g('nz')]), 'GREATER', num('0')),
                [set('nx', sub2(num('0'), g('nx'))), set('ny', sub2(num('0'), g('ny'))), set('nz', sub2(num('0'), g('nz')))]),
            // portal up axis q, right axis r = q x n
            ifElseStmt(boolOp(absV(g('ny')), 'LESS', num('0.5')),
                [set('qx', num('0')), set('qy', num('1')), set('qz', num('0'))],
                [set('qy', num('0')), ifElseStmt(boolOp(absV(g('dx')), 'GREATER', absV(g('dz'))),
                    [set('qz', num('0')), ifElseStmt(boolOp(g('dx'), 'LESS', num('0')), [set('qx', num('-1'))], [set('qx', num('1'))])],
                    [set('qx', num('0')), ifElseStmt(boolOp(g('dz'), 'LESS', num('0')), [set('qz', num('-1'))], [set('qz', num('1'))])])]),
            set('rx', sub2(mul2(g('qy'), g('nz')), mul2(g('qz'), g('ny')))),
            set('ry', sub2(mul2(g('qz'), g('nx')), mul2(g('qx'), g('nz')))),
            set('rz', sub2(mul2(g('qx'), g('ny')), mul2(g('qy'), g('nx')))),
            // surface half-extents along r and q, hit offset from its center
            set('er', add2(mul2(bcv('col_hu'), absV(dot3([bcv('col_ux'), bcv('col_uy'), bcv('col_uz')], [g('rx'), g('ry'), g('rz')]))), mul2(bcv('col_hw'), absV(dot3([bcv('col_wx'), bcv('col_wy'), bcv('col_wz')], [g('rx'), g('ry'), g('rz')]))))),
            set('eq', add2(mul2(bcv('col_hu'), absV(dot3([bcv('col_ux'), bcv('col_uy'), bcv('col_uz')], [g('qx'), g('qy'), g('qz')]))), mul2(bcv('col_hw'), absV(dot3([bcv('col_wx'), bcv('col_wy'), bcv('col_wz')], [g('qx'), g('qy'), g('qz')]))))),
            set('orr', dot3([sub2(g('hx'), g('cx')), sub2(g('hy'), g('cy')), sub2(g('hz'), g('cz'))], [g('rx'), g('ry'), g('rz')])),
            set('oq', dot3([sub2(g('hx'), g('cx')), sub2(g('hy'), g('cy')), sub2(g('hz'), g('cz'))], [g('qx'), g('qy'), g('qz')])),
            ifStmt(orAll([boolOp(g('er'), 'LESS', GVv('por_hu')), boolOp(g('eq'), 'LESS', GVv('por_hw'))]), [set('ok', num('0'))]),
            ...clampTo('orr', () => sub2(GVv('por_hu'), g('er')), () => sub2(g('er'), GVv('por_hu'))),
            ifElseStmt(boolOp(absV(g('ny')), 'LESS', num('0.5')), [
                // wall: stay inside the 3-unit band of the hit point and inside the surface
                set('k', mul2(floorOf(calc(g('hy'), 'DIVIDE', num('3'))), num('3'))),
                set('lo', sub2(add2(g('k'), GVv('por_hw')), g('cy'))),
                ifStmt(boolOp(sub2(GVv('por_hw'), g('eq')), 'GREATER', g('lo')), [set('lo', sub2(GVv('por_hw'), g('eq')))]),
                set('hi', sub2(sub2(add2(g('k'), num('3')), GVv('por_hw')), g('cy'))),
                ifStmt(boolOp(sub2(g('eq'), GVv('por_hw')), 'LESS', g('hi')), [set('hi', sub2(g('eq'), GVv('por_hw')))]),
                ifElseStmt(boolOp(g('lo'), 'GREATER', g('hi')), [set('ok', num('0'))], clampTo('oq', () => g('lo'), () => g('hi'))),
            ], clampTo('oq', () => sub2(GVv('por_hw'), g('eq')), () => sub2(g('eq'), GVv('por_hw')))),
            set('hx', add2(add2(g('cx'), mul2(g('rx'), g('orr'))), mul2(g('qx'), g('oq')))),
            set('hy', add2(add2(g('cy'), mul2(g('ry'), g('orr'))), mul2(g('qy'), g('oq')))),
            set('hz', add2(add2(g('cz'), mul2(g('rz'), g('orr'))), mul2(g('qz'), g('oq')))),
            // not on top of the other portal
            set('o', sub2(num('3'), pP())),
            ifStmt(andAll([boolOp(por('por_on', g('o')), 'EQUAL', num('1')), boolOp(por('por_col', g('o')), 'EQUAL', g('bc'))]), [
                ifStmt(andAll([
                    boolOp(absV(dot3([sub2(g('hx'), por('por_cx', g('o'))), sub2(g('hy'), por('por_cy', g('o'))), sub2(g('hz'), por('por_cz', g('o')))], [g('rx'), g('ry'), g('rz')])), 'LESS', mul2(num('2'), GVv('por_hu'))),
                    boolOp(absV(dot3([sub2(g('hx'), por('por_cx', g('o'))), sub2(g('hy'), por('por_cy', g('o'))), sub2(g('hz'), por('por_cz', g('o')))], [g('qx'), g('qy'), g('qz')])), 'LESS', mul2(num('2'), GVv('por_hw'))),
                ]), [set('ok', num('0'))]),
            ]),
        ])]),
        ifElseStmt(boolOp(g('ok'), 'EQUAL', num('1')), [
            ifStmt(boolOp(por('por_on', pP()), 'EQUAL', num('1')), [funcCall(FN_PORTAL_MARK, [pP(), num('-1')])]),
            setP('por_on', num('1')), setP('por_col', g('bc')),
            setP('por_cx', g('hx')), setP('por_cy', g('hy')), setP('por_cz', g('hz')),
            setP('por_nx', g('nx')), setP('por_ny', g('ny')), setP('por_nz', g('nz')),
            setP('por_rx', g('rx')), setP('por_ry', g('ry')), setP('por_rz', g('rz')),
            setP('por_qx', g('qx')), setP('por_qy', g('qy')), setP('por_qz', g('qz')),
            funcCall(FN_PORTAL_MARK, [pP(), num('1')]),
            setVar(GV.por_both, mul2(por('por_on', 1), por('por_on', 2))),
            // decal geometry: an elongated hexagon in the portal plane
            set('o', por('por_obj', pP())), set('v0', valAt(LIST_OBJ_VSTART, g('o'))),
            ...HEX.flatMap(([ha, hb], i) => ['x', 'y', 'z'].map(k => setAt(k === 'x' ? LIST_BASE_X : k === 'y' ? LIST_BASE_Y : LIST_BASE_Z, add2(g('v0'), num(String(i))),
                add2(add2(mul2(g('r' + k), mul2(GVv('por_hu'), num(String(ha * 0.96)))), mul2(g('q' + k), mul2(GVv('por_hw'), num(String(hb * 0.96))))), mul2(g('n' + k), num('0.02')))))),
            ...HEX.map((_, i) => setAt(LIST_VSTAMP, add2(g('v0'), num(String(i))), num('0'))),
            setAt(LIST_OBJ_X, g('o'), g('hx')), setAt(LIST_OBJ_Y, g('o'), g('hy')), setAt(LIST_OBJ_Z, g('o'), g('hz')),
            setAt(LIST_OBJ_LX, g('o'), text('none')),
            set('pf', por('por_f', pP())),
            ...[0, 1].flatMap(i => [setAt(LIST_FACE_NX, add2(g('pf'), num(String(i))), g('nx')), setAt(LIST_FACE_NY, add2(g('pf'), num(String(i))), g('ny')), setAt(LIST_FACE_NZ, add2(g('pf'), num(String(i))), g('nz'))]),
            ...wakeAll(local),
            setVar(GV.force_redraw, num('1')),
        ], say('여기엔 포탈을 붙일 수 없습니다 (흰 패널에만)', 1.6)),
    ];
});

// level_reset(): the current chamber from its start — player, portals,
// the chamber's cubes
const FN_LEVEL_RESET = newFunction('level_reset', (local) => {
    const b = local('b'), lv = local('lv'), k = local('k');
    const gb = () => getFuncVar(b), glv = () => getFuncVar(lv), gk = () => getFuncVar(k);
    // act = { k : tags[k] is 0 or the current level }
    const rebuild = (act, tags, count) => [
        clearList(act),
        setFuncVar(k, num('1')),
        repeatWhileTrue(boolOp(gk(), 'LESS_OR_EQUAL', count()), [
            ifStmt(orAll([boolOp(valAt(tags, gk()), 'EQUAL', num('0')), boolOp(valAt(tags, gk()), 'EQUAL', glv())]), [addToList(act, gk())]),
            incFuncVar(k, '1'),
        ]),
    ];
    return [
        setFuncVar(lv, GVv('cur_level')),
        ...rebuild(LIST_ACT_B, GL.b_level, () => PV('ph_nb')),
        ...rebuild(LIST_ACT_O, LIST_OBJ_LEVEL, () => getVar(VAR_NDYN)),
        ...rebuild(GL.act_btn, GL.btn_level, () => lenOf(GL.btn_x)),
        ...rebuild(GL.act_door, GL.door_level, () => lenOf(GL.door_obj)),
        ...rebuild(GL.act_jp, GL.jp_level, () => lenOf(GL.jp_x)),
        ...rebuild(GL.act_fz, GL.fz_level, () => lenOf(GL.fz_x0)),
        ...rebuild(GL.act_hz, GL.hz_level, () => lenOf(GL.hz_x0)),
        // objects of other chambers: not visible
        setFuncVar(k, num('1')),
        repeatWhileTrue(boolOp(gk(), 'LESS_OR_EQUAL', getVar(VAR_NDYN)), [setAt(LIST_OBJ_VIS, gk(), num('0')), incFuncVar(k, '1')]),
        ...[1, 2].map(p => ifStmt(boolOp(por('por_on', p), 'EQUAL', num('1')), [funcCall(FN_PORTAL_MARK, [num(String(p)), num('-1')]), setAt(GL.por_on, num(String(p)), num('0'))])),
        setVar(GV.por_both, num('0')),
        setVar(GV.held, num('0')), setVar(GV.held_tp, num('0')),
        setAt(B.b_x, num('1'), valAt(GL.lv_sx, glv())), setAt(B.b_y, num('1'), valAt(GL.lv_sy, glv())), setAt(B.b_z, num('1'), valAt(GL.lv_sz, glv())),
        setVar(VAR_YAW, valAt(GL.lv_yaw, glv())), setVar(VAR_PITCH, num('0')),
        setFuncVar(b, num('1')),
        repeatWhileTrue(boolOp(gb(), 'LESS_OR_EQUAL', PV('ph_nb')), [
            ifStmt(boolOp(valAt(GL.b_level, gb()), 'EQUAL', glv()), [
                setAt(B.b_x, gb(), valAt(GL.b_sx, gb())), setAt(B.b_y, gb(), valAt(GL.b_sy, gb())), setAt(B.b_z, gb(), valAt(GL.b_sz, gb())),
            ]),
            setAt(B.b_vx, gb(), num('0')), setAt(B.b_vy, gb(), num('0')), setAt(B.b_vz, gb(), num('0')),
            setAt(B.b_sleep, gb(), num('0')), setAt(B.b_still, gb(), num('0')), setAt(B.b_gnd, gb(), num('0')),
            incFuncVar(b, '1'),
        ]),
        setVar(GV.force_redraw, num('1')),
    ];
});

// game_logic(): once per frame — keys, carrying, buttons/doors, falls, exit, HUD
const FN_GAME_LOGIC = newFunction('game_logic', (local) => {
    const L = {};
    for (const n of ['ex', 'ey', 'ez', 'lx', 'ly', 'lz', 'b', 'i', 'on', 'best', 'd2', 'gi', 'op', 'd', 'k', 'hint', 'inside', 'kb', 'ki']) L[n] = local(n);
    const g = (n) => getFuncVar(L[n]);
    const set = (n, v) => setFuncVar(L[n], v);
    const edge = (downCond, prevVar, action) => ifElseStmt(downCond, [
        ifStmt(boolOp(GVv(prevVar), 'EQUAL', num('0')), action),
        setVar(GV[prevVar], num('1')),
    ], [setVar(GV[prevVar], num('0'))]);
    const bx = (list, i) => valAt(B[list], i);
    const dist2 = (i, px, py, pz) => add2(add2(mul2(sub2(bx('b_x', i), px), sub2(bx('b_x', i), px)), mul2(sub2(bx('b_y', i), py), sub2(bx('b_y', i), py))), mul2(sub2(bx('b_z', i), pz), sub2(bx('b_z', i), pz)));
    const join = (a, c) => blk('combine_something', [null, a, null, c, null]);
    const one = () => num('1');
    return [ifStmt(boolOp(getVar(VAR_GAME), 'EQUAL', num('1')), [
        // hold point: 1.9 in front of the eye, a little below the line of sight
        set('ex', valAt(B.b_x, one())), set('ey', add2(valAt(B.b_y, one()), PV('ph_eye'))), set('ez', valAt(B.b_z, one())),
        set('lx', mul2(cosD(getVar(VAR_PITCH)), cosD(getVar(VAR_YAW)))), set('ly', sinD(getVar(VAR_PITCH))), set('lz', mul2(cosD(getVar(VAR_PITCH)), sinD(getVar(VAR_YAW)))),
        ifElseStmt(boolOp(GVv('held_tp'), 'EQUAL', num('1')), [
            ifStmt(boolOp(sub2(timer(), GVv('held_tp_t')), 'GREATER', num('1.5')), [setVar(GV.held, num('0')), setVar(GV.held_tp, num('0'))]),
        ], [
            setVar(GV.hold_tx, add2(g('ex'), mul2(g('lx'), num('1.9')))),
            setVar(GV.hold_ty, sub2(add2(g('ey'), mul2(g('ly'), num('1.9'))), num('0.35'))),
            setVar(GV.hold_tz, add2(g('ez'), mul2(g('lz'), num('1.9')))),
        ]),
        // keys (edge-detected)
        edge(orAll([keyDown(81), blk('is_clicked', [null])]), 'kq', [funcCall(FN_PORTAL_SHOOT, [num('1')])]),
        edge(keyDown(69), 'ke', [funcCall(FN_PORTAL_SHOOT, [num('2')])]),
        edge(keyDown(70), 'kf', [
            ifElseStmt(boolOp(GVv('held'), 'GREATER', num('0')), [
                setAt(B.b_sleep, GVv('held'), num('0')), setVar(GV.held, num('0')), setVar(GV.held_tp, num('0')),
            ], [
                // pick up the nearest cube near the hold point
                set('best', num('3.2')), set('k', num('0')), set('kb', num('2')),
                repeatWhileTrue(boolOp(g('kb'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
                    set('b', valAt(LIST_ACT_B, g('kb'))),
                    set('d2', dist2(g('b'), GVv('hold_tx'), GVv('hold_ty'), GVv('hold_tz'))),
                    ifStmt(boolOp(g('d2'), 'LESS', g('best')), [set('best', g('d2')), set('k', g('b'))]),
                    incFuncVar(L.kb, '1'),
                ]),
                ifElseStmt(boolOp(g('k'), 'GREATER', num('0')),
                    [setVar(GV.held, g('k')), setAt(B.b_sleep, g('k'), num('0')), setAt(B.b_still, g('k'), num('0'))],
                    say('잡을 큐브가 없습니다 (가까이 가서 F)', 1.2)),
            ]),
        ]),
        edge(keyDown(82), 'kr', [
            ifStmt(boolOp(GVv('game_done'), 'EQUAL', num('1')), [setVar(GV.cur_level, num('1')), setVar(GV.game_done, num('0'))]),
            funcCall(FN_LEVEL_RESET, []),
        ]),
        // a carried cube that stays far from the hold point for 0.6 s (stuck
        // behind something) is dropped; a quick turn of the view is not enough
        ifStmt(andAll([boolOp(GVv('held'), 'GREATER', num('0')), boolOp(GVv('held_tp'), 'EQUAL', num('0'))]), [
            ifElseStmt(boolOp(dist2(GVv('held'), GVv('hold_tx'), GVv('hold_ty'), GVv('hold_tz')), 'GREATER', num('12')), [
                ifElseStmt(boolOp(GVv('held_far'), 'EQUAL', num('0')), [setVar(GV.held_far, timer())], [
                    ifStmt(boolOp(sub2(timer(), GVv('held_far')), 'GREATER', num('0.6')), [setVar(GV.held, num('0')), setVar(GV.held_far, num('0'))]),
                ]),
            ], [setVar(GV.held_far, num('0'))]),
        ]),
        // buttons -> groups -> doors
        set('i', one()),
        repeatWhileTrue(boolOp(g('i'), 'LESS_OR_EQUAL', lenOf(GL.grp_cnt)), [setAt(GL.grp_cnt, g('i'), num('0')), incFuncVar(L.i, '1')]),
        set('ki', one()),
        repeatWhileTrue(boolOp(g('ki'), 'LESS_OR_EQUAL', lenOf(GL.act_btn)), [
            set('i', valAt(GL.act_btn, g('ki'))),
            set('on', num('0')), set('kb', one()),
            repeatWhileTrue(boolOp(g('kb'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
                set('b', valAt(LIST_ACT_B, g('kb'))),
                ifStmt(andAll([
                    boolOp(absV(sub2(bx('b_x', g('b')), valAt(GL.btn_x, g('i')))), 'LESS', valAt(GL.btn_r, g('i'))),
                    boolOp(absV(sub2(bx('b_z', g('b')), valAt(GL.btn_z, g('i')))), 'LESS', valAt(GL.btn_r, g('i'))),
                    boolOp(sub2(bx('b_y', g('b')), valAt(GL.btn_y, g('i'))), 'GREATER', num('0')),
                    boolOp(sub2(bx('b_y', g('b')), valAt(GL.btn_y, g('i'))), 'LESS', num('1.4')),
                ]), [set('on', num('1'))]),
                incFuncVar(L.kb, '1'),
            ]),
            // timed button: stays on for btn_hold seconds after the last press
            ifElseStmt(boolOp(g('on'), 'EQUAL', num('1')),
                [setAt(GL.btn_until, g('i'), add2(timer(), valAt(GL.btn_hold, g('i'))))],
                [ifStmt(boolOp(timer(), 'LESS', valAt(GL.btn_until, g('i'))), [set('on', num('1'))])]),
            ifStmt(boolOp(g('on'), 'NOT_EQUAL', valAt(GL.btn_on, g('i'))), [
                setAt(GL.btn_on, g('i'), g('on')),
                setAt(LIST_OBJ_Y, valAt(GL.btn_obj, g('i')), sub2(valAt(GL.btn_by, g('i')), mul2(g('on'), num('0.1')))),
            ]),
            set('gi', valAt(GL.btn_group, g('i'))),
            setAt(GL.grp_cnt, g('gi'), add2(valAt(GL.grp_cnt, g('gi')), g('on'))),
            incFuncVar(L.ki, '1'),
        ]),
        set('ki', one()),
        repeatWhileTrue(boolOp(g('ki'), 'LESS_OR_EQUAL', lenOf(GL.act_door)), [
            set('i', valAt(GL.act_door, g('ki'))),
            set('gi', valAt(GL.door_group, g('i'))),
            set('op', num('0')),
            ifStmt(boolOp(valAt(GL.grp_cnt, g('gi')), 'GREATER_OR_EQUAL', valAt(GL.grp_need, g('gi'))), [set('op', num('1'))]),
            ifStmt(boolOp(g('op'), 'NOT_EQUAL', valAt(GL.door_open, g('i'))), [
                setAt(GL.door_open, g('i'), g('op')),
                setAt(C.col_on, valAt(GL.door_col, g('i')), sub2(num('1'), g('op'))),
                setAt(LIST_OBJ_HIDDEN, valAt(GL.door_obj, g('i')), g('op')),
                ...wakeAll(local),
            ]),
            incFuncVar(L.ki, '1'),
        ]),
        // jump pads: a body standing on a pad (not already flying up) is launched
        set('ki', one()),
        repeatWhileTrue(boolOp(g('ki'), 'LESS_OR_EQUAL', lenOf(GL.act_jp)), [
            set('i', valAt(GL.act_jp, g('ki'))),
            set('kb', one()),
            repeatWhileTrue(boolOp(g('kb'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
                set('b', valAt(LIST_ACT_B, g('kb'))),
                ifStmt(andAll([
                    boolOp(g('b'), 'NOT_EQUAL', GVv('held')),
                    boolOp(absV(sub2(bx('b_x', g('b')), valAt(GL.jp_x, g('i')))), 'LESS', valAt(GL.jp_r, g('i'))),
                    boolOp(absV(sub2(bx('b_z', g('b')), valAt(GL.jp_z, g('i')))), 'LESS', valAt(GL.jp_r, g('i'))),
                    boolOp(sub2(bx('b_y', g('b')), valAt(GL.jp_y, g('i'))), 'GREATER', num('0')),
                    boolOp(sub2(bx('b_y', g('b')), valAt(GL.jp_y, g('i'))), 'LESS', num('1.2')),
                    boolOp(bx('b_vy', g('b')), 'LESS', num('2')),
                ]), [
                    setAt(B.b_vx, g('b'), valAt(GL.jp_vx, g('i'))), setAt(B.b_vy, g('b'), valAt(GL.jp_vy, g('i'))), setAt(B.b_vz, g('b'), valAt(GL.jp_vz, g('i'))),
                    // launched from the pad's center: the same arc every time
                    setAt(B.b_x, g('b'), valAt(GL.jp_x, g('i'))), setAt(B.b_z, g('b'), valAt(GL.jp_z, g('i'))),
                    setAt(B.b_y, g('b'), add2(bx('b_y', g('b')), num('0.05'))),
                    setAt(B.b_gnd, g('b'), num('0')), setAt(B.b_sleep, g('b'), num('0')), setAt(B.b_still, g('b'), num('0')),
                ]),
                incFuncVar(L.kb, '1'),
            ]),
            incFuncVar(L.ki, '1'),
        ]),
        // energy fields: the player passing through clears both portals; a cube
        // passing through is destroyed (back to its start)
        set('ki', one()),
        repeatWhileTrue(boolOp(g('ki'), 'LESS_OR_EQUAL', lenOf(GL.act_fz)), [
            set('i', valAt(GL.act_fz, g('ki'))),
            ifStmt(andAll([
                    boolOp(valAt(B.b_x, one()), 'GREATER', sub2(valAt(GL.fz_x0, g('i')), num('0.3'))), boolOp(valAt(B.b_x, one()), 'LESS', add2(valAt(GL.fz_x1, g('i')), num('0.3'))),
                    boolOp(valAt(B.b_y, one()), 'GREATER', sub2(valAt(GL.fz_y0, g('i')), num('0.3'))), boolOp(valAt(B.b_y, one()), 'LESS', add2(valAt(GL.fz_y1, g('i')), num('0.3'))),
                    boolOp(valAt(B.b_z, one()), 'GREATER', sub2(valAt(GL.fz_z0, g('i')), num('0.3'))), boolOp(valAt(B.b_z, one()), 'LESS', add2(valAt(GL.fz_z1, g('i')), num('0.3'))),
                ]), [
                ifStmt(orAll([boolOp(por('por_on', 1), 'EQUAL', num('1')), boolOp(por('por_on', 2), 'EQUAL', num('1'))]), [
                    ...[1, 2].map(p => ifStmt(boolOp(por('por_on', p), 'EQUAL', num('1')), [funcCall(FN_PORTAL_MARK, [num(String(p)), num('-1')]), setAt(GL.por_on, num(String(p)), num('0'))])),
                    setVar(GV.por_both, num('0')), setVar(GV.force_redraw, num('1')),
                    ...say('에너지 장벽: 포탈이 초기화되었습니다', 1.8),
                ]),
            ]),
            set('kb', num('2')),
            repeatWhileTrue(boolOp(g('kb'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
                set('b', valAt(LIST_ACT_B, g('kb'))),
                ifStmt(andAll([
                    boolOp(bx('b_x', g('b')), 'GREATER', sub2(valAt(GL.fz_x0, g('i')), num('0.2'))), boolOp(bx('b_x', g('b')), 'LESS', add2(valAt(GL.fz_x1, g('i')), num('0.2'))),
                    boolOp(bx('b_y', g('b')), 'GREATER', sub2(valAt(GL.fz_y0, g('i')), num('0.2'))), boolOp(bx('b_y', g('b')), 'LESS', add2(valAt(GL.fz_y1, g('i')), num('0.2'))),
                    boolOp(bx('b_z', g('b')), 'GREATER', sub2(valAt(GL.fz_z0, g('i')), num('0.2'))), boolOp(bx('b_z', g('b')), 'LESS', add2(valAt(GL.fz_z1, g('i')), num('0.2'))),
                ]), [
                    ifStmt(boolOp(g('b'), 'EQUAL', GVv('held')), [setVar(GV.held, num('0')), setVar(GV.held_tp, num('0'))]),
                    setAt(B.b_x, g('b'), valAt(GL.b_sx, g('b'))), setAt(B.b_y, g('b'), valAt(GL.b_sy, g('b'))), setAt(B.b_z, g('b'), valAt(GL.b_sz, g('b'))),
                    setAt(B.b_vx, g('b'), num('0')), setAt(B.b_vy, g('b'), num('0')), setAt(B.b_vz, g('b'), num('0')),
                    setAt(B.b_sleep, g('b'), num('0')),
                    ...say('큐브가 에너지 장벽에 분해되었습니다 (처음 자리로)', 1.8),
                ]),
                incFuncVar(L.kb, '1'),
            ]),
            incFuncVar(L.ki, '1'),
        ]),
        // falls
        ifStmt(boolOp(valAt(B.b_y, one()), 'LESS', GVv('kill_y')), [...say('떨어졌습니다! 챔버를 다시 시작합니다', 2), funcCall(FN_LEVEL_RESET, [])]),
        set('kb', num('2')),
        repeatWhileTrue(boolOp(g('kb'), 'LESS_OR_EQUAL', lenOf(LIST_ACT_B)), [
            set('b', valAt(LIST_ACT_B, g('kb'))),
            ifStmt(boolOp(bx('b_y', g('b')), 'LESS', GVv('kill_y')), [
                ifStmt(boolOp(g('b'), 'EQUAL', GVv('held')), [setVar(GV.held, num('0'))]),
                setAt(B.b_x, g('b'), valAt(GL.b_sx, g('b'))), setAt(B.b_y, g('b'), valAt(GL.b_sy, g('b'))), setAt(B.b_z, g('b'), valAt(GL.b_sz, g('b'))),
                setAt(B.b_vx, g('b'), num('0')), setAt(B.b_vy, g('b'), num('0')), setAt(B.b_vz, g('b'), num('0')),
                ...say('큐브가 떨어져 처음 자리로 돌아갔습니다', 1.5),
            ]),
            incFuncVar(L.kb, '1'),
        ]),
        // exit pad
        ifStmt(boolOp(GVv('game_done'), 'EQUAL', num('0')), [
            set('lx', valAt(GL.lv_ex, GVv('cur_level'))), set('ly', valAt(GL.lv_ey, GVv('cur_level'))), set('lz', valAt(GL.lv_ez, GVv('cur_level'))),
            ifStmt(andAll([
                boolOp(absV(sub2(valAt(B.b_x, one()), g('lx'))), 'LESS', num('1.3')),
                boolOp(absV(sub2(valAt(B.b_z, one()), g('lz'))), 'LESS', num('1.3')),
                boolOp(sub2(valAt(B.b_y, one()), g('ly')), 'GREATER', num('0')),
                boolOp(sub2(valAt(B.b_y, one()), g('ly')), 'LESS', num('1.6')),
            ]), [
                ifElseStmt(boolOp(GVv('cur_level'), 'LESS', GVv('n_levels')), [
                    setVar(GV.cur_level, add2(GVv('cur_level'), num('1'))),
                    funcCall(FN_LEVEL_RESET, []),
                    ...say('챔버 통과!', 2),
                ], [setVar(GV.game_done, num('1')), setVar(GV.held, num('0'))]),
            ]),
        ]),
        // HUD
        ifElseStmt(boolOp(GVv('game_done'), 'EQUAL', num('1')),
            [setVar(VAR_HUD, text('모든 테스트 챔버 통과! 축하합니다  (R: 처음부터)'))],
            [
                set('hint', valAt(GL.lv_hint, GVv('cur_level'))),
                set('ki', one()),
                repeatWhileTrue(boolOp(g('ki'), 'LESS_OR_EQUAL', lenOf(GL.act_hz)), [
                    set('i', valAt(GL.act_hz, g('ki'))),
                    ifStmt(andAll([
                    boolOp(valAt(B.b_x, one()), 'GREATER', sub2(valAt(GL.hz_x0, g('i')), num('0'))), boolOp(valAt(B.b_x, one()), 'LESS', add2(valAt(GL.hz_x1, g('i')), num('0'))),
                    boolOp(valAt(B.b_y, one()), 'GREATER', sub2(valAt(GL.hz_y0, g('i')), num('0'))), boolOp(valAt(B.b_y, one()), 'LESS', add2(valAt(GL.hz_y1, g('i')), num('0'))),
                    boolOp(valAt(B.b_z, one()), 'GREATER', sub2(valAt(GL.hz_z0, g('i')), num('0'))), boolOp(valAt(B.b_z, one()), 'LESS', add2(valAt(GL.hz_z1, g('i')), num('0'))),
                ]), [set('hint', valAt(GL.hz_text, g('i')))]),
                    incFuncVar(L.ki, '1'),
                ]),
                setVar(VAR_HUD, join(valAt(GL.lv_name, GVv('cur_level')), join(text('  '), g('hint')))),
            ]),
        ifStmt(boolOp(timer(), 'LESS', GVv('msg_until')), [setVar(VAR_HUD, join(getVar(VAR_HUD), join(text('   ▶ '), getVar(VAR_MSG))))]),
    ])];
});

// ============================================================
// 10b) toggle_keys(): B = show/hide balls, N = ball physics on/off
//      (edge-detected: one toggle per key press), and the status label.
//      Turning physics back on wakes every ball so none stays frozen mid-air.
// ============================================================
const FN_TOGGLE_KEYS = newFunction('toggle_keys', (local) => {
    const b = local('b');
    const toggle = (code, prevVar, stateVar, onChange) => ifElseStmt(blk('is_press_some_key', [String(code), null]), [
        ifStmt(boolOp(getVar(prevVar), 'EQUAL', num('0')), [setVar(stateVar, sub2(num('1'), getVar(stateVar))), ...onChange]),
        setVar(prevVar, num('1')),
    ], [setVar(prevVar, num('0'))]);
    const join = (a, c) => blk('combine_something', [null, a, null, c, null]);
    return [
        toggle(66, VAR_KB_PREV, VAR_BALL_RENDER, []),
        toggle(78, VAR_KN_PREV, VAR_BALL_PHYS, [
            ifStmt(boolOp(getVar(VAR_BALL_PHYS), 'EQUAL', num('1')), [
                setFuncVar(b, num('1')),
                repeatWhileTrue(boolOp(getFuncVar(b), 'LESS_OR_EQUAL', PV('ph_nb')), [
                    setAt(B.b_sleep, getFuncVar(b), num('0')), setAt(B.b_still, getFuncVar(b), num('0')),
                    incFuncVar(b, '1'),
                ]),
            ]),
        ]),
        setVar(VAR_FLY_LABEL, text('')),
        ifStmt(boolOp(PV('ph_fly'), 'EQUAL', num('1')), [setVar(VAR_FLY_LABEL, join(getVar(VAR_FLY_LABEL), text(' [비행]')))]),
        ifStmt(boolOp(getVar(VAR_BALL_RENDER), 'EQUAL', num('0')), [setVar(VAR_FLY_LABEL, join(getVar(VAR_FLY_LABEL), text(' [공 숨김]')))]),
        ifStmt(boolOp(getVar(VAR_BALL_PHYS), 'EQUAL', num('0')), [setVar(VAR_FLY_LABEL, join(getVar(VAR_FLY_LABEL), text(' [공 물리 OFF]')))]),
    ];
});

// ============================================================
// 11) main() per-frame loop:
//   animate → physics (fixed step; moves player/camera + bodies) →
//   apply_transforms (only objects that moved) → look input (dsr9, g18x) →
//   72ba basis → cache_camera (dirty flag, PVS cell load, projection epoch)
//   → cull_objects → project dynamic objects that moved → only if the
//   picture changed: erase, layered collect (cluster frustum test, back-face
//   test, lazy vertex projection) / sort, draw.
// ============================================================
{
    const fn = funcsById['m753'];
    const content = JSON.parse(fn.content);
    const header = content[0][0];
    const loopIdx = header.statements[0].findIndex(b => b.type === 'repeat_inf');
    const loopBlock = header.statements[0][loopIdx];
    const old = loopBlock.statements[0];
    const pick = (type) => {
        const b = old.find(x => x.type === type);
        if (!b) throw new Error('main: ' + type + ' not found');
        return b;
    };
    header.statements[0].splice(loopIdx, 0,
        blk('choose_project_timer_action', [null, 'START', null, null]),
        setVar(PH.ph_last, timer()),
        setVar(PH.ph_acc, num('0')),
        setVar(VAR_YAW, num('180')), setVar(VAR_PITCH, num('0')), setVar(VAR_ROLL, num('0')),
        ifStmt(boolOp(getVar(VAR_GAME), 'EQUAL', num('1')), [setVar(GV.cur_level, num('1')), setVar(GV.game_done, num('0')), funcCall(FN_LEVEL_RESET, [])]));
    loopBlock.statements[0] = [
        pick('change_variable'),
        funcCall(FN_ANIMATE, []),
        funcCall(FN_TOGGLE_KEYS, []),
        funcCall(FN_PHYS_STEP, []),
        funcCall(FN_GAME_LOGIC, []),
        funcCall(FN_APPLY_TRANSFORMS, []),
        funcCall(FN_UPDATE_LOOK, []),
        pick('func_72ba'),
        funcCall(FN_CACHE_CAM, []),
        setVar(VAR_REDRAW, getVar(VAR_DIRTY)),
        ifStmt(boolOp(GVv('force_redraw'), 'EQUAL', num('1')), [setVar(VAR_REDRAW, num('1')), setVar(GV.force_redraw, num('0'))]),
        funcCall(FN_CULL_OBJECTS, []),
        funcCall(FN_PROJECT_DYNAMIC, []),
        ifStmt(boolOp(getVar(VAR_REDRAW), 'EQUAL', num('1')), [
            pick('brush_erase_all'),
            funcCall(FN_BUILD_DRAW, []),
            funcCall('ba3q', [num('1'), num('1'), getVar(VAR_VIS_N)]),
        ]),
    ];
    fn.content = JSON.stringify(content);
}

// ============================================================
// 11b) FPS display: current frame rate, not the run-long average.
//     The original computed frames / project-timer — the average since
//     start, which barely moves once the run is long. Now a sliding
//     window: every 0.25 s a (frame count, time) sample is pushed, and
//     fps = frames over the last 4 intervals / time they took (~1 s).
//     The project timer only ticks at ~60 Hz, so a 1 s window keeps its
//     quantization error to ~2% while still updating 4x per second.
// ============================================================
{
    const obj = project.objects.find(o => o.name === 'fps');
    const script = JSON.parse(obj.script);
    const LIST_FB = addList('fps_frames', []), LIST_TB = addList('fps_times', []);
    const thread = script[1];
    if (thread[0].type !== 'when_scene_start' || thread[1].type !== 'repeat_inf') throw new Error('fps thread shape changed');
    thread.splice(1, 0, clearList(LIST_FB), clearList(LIST_TB));
    const first = (l) => valAt(l, num('1'));
    const last = (l) => valAt(l, lenOf(l));
    thread[thread.length - 1].statements = [[
        blk('wait_second', [num('0.25'), null]),
        // the main loop's reset() zeroes the frame counter at start: restart the window
        ifStmt(boolOp(lenOf(LIST_FB), 'GREATER', num('0')), [
            ifStmt(boolOp(getVar('nmct'), 'LESS', last(LIST_FB)), [clearList(LIST_FB), clearList(LIST_TB)]),
        ]),
        addToList(LIST_FB, getVar('nmct')),
        addToList(LIST_TB, timer()),
        ifStmt(boolOp(lenOf(LIST_FB), 'GREATER', num('5')), [removeAt(LIST_FB, num('1')), removeAt(LIST_TB, num('1'))]),
        ifStmt(boolOp(lenOf(LIST_FB), 'GREATER', num('1')), [
            ifStmt(boolOp(last(LIST_TB), 'GREATER', first(LIST_TB)), [
                setVar('epl5', calc(calcOp(calc(calc(calc(last(LIST_FB), 'MINUS', first(LIST_FB)), 'DIVIDE', calc(last(LIST_TB), 'MINUS', first(LIST_TB))), 'MULTI', num('10')), 'round'), 'DIVIDE', num('10'))),
            ]),
        ]),
    ]];
    // flight indicator after the fps text
    (function addFlyLabel(node) {
        if (Array.isArray(node)) return node.forEach(addFlyLabel);
        if (!node || typeof node !== 'object') return;
        if (node.type === 'text_write') { node.params[0] = blk('combine_something', [null, node.params[0], null, getVar(VAR_FLY_LABEL), null]); return; }
        for (const k of ['params', 'statements']) if (node[k]) addFlyLabel(node[k]);
    })(script[0]);
    obj.script = JSON.stringify(script);
}

// ============================================================
// 12) drop functions left unreferenced by the rewrite
// ============================================================
{
    const candidates = ['2x48', '7pds', 'ali7', '0aqy', '0y5z', 'gba1', 'joc7', 'dsr9', 'g18x', 'hu00'];
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

// Rename the variables, lists, functions and function locals of a saved platformer .ent to plain English.
// usage: node rename.mjs in.ent out.ent
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import cp from 'node:child_process';
const [src, out] = process.argv.slice(2);
const VARS = {
    '지난 시각': 'last_time', '스테이지': 'stage', '이동 속도': 'speed', '점프 힘': 'jump_power', '두번째 점프 힘': 'jump_power2', '중력': 'gravity',
    '카메라 거리': 'cam_dist', '카메라 기울기': 'cam_tilt', '카메라 회전 속도': 'cam_turn_speed', '초점': 'zoom', '시야 거리': 'view_dist',
    '되감기 최대': 'rewind_max', '마지막 스테이지': 'last_stage', '전체 태엽': 'gear_total', '모은 태엽': 'gear_count', '낙하 높이': 'fall_y',
    '시간': 'time', '되감기 게이지': 'rewind_gauge', '스테이지 끝': 'stage_clear', '카메라 각도': 'cam_angle',
    '시작X': 'start_x', '시작Y': 'start_y', '시작Z': 'start_z', '내X': 'player_x', '내Y': 'player_y', '내Z': 'player_z', '속도X': 'vx', '속도Y': 'vy', '속도Z': 'vz',
    '카메라 목표Y': 'cam_target_y', '간격': 'dt', '코사인': 'cos', '사인': 'sin', '기울기 코사인': 'tilt_cos', '기울기 사인': 'tilt_sin',
    '카메라X': 'cam_x', '카메라Y': 'cam_y', '카메라Z': 'cam_z', '판정': 'result', '땅에 있음': 'on_ground', '밟은 물체': 'ground_obj',
    '이전 점프키': 'jump_key_old', '점프키': 'jump_key', '점프 대기': 'jump_wait', '공중 시간': 'air_time', '남은 점프': 'jumps_left', '이전 발': 'old_y',
    '그림자 물체': 'shadow_obj', '칠할 색': 'fill_color', '첫 점': 'first_point',
    '물체X': 'obj_x', '물체Y': 'obj_y', '물체Z': 'obj_z', '종류': 'obj_type', '가로': 'obj_w', '높이': 'obj_h', '세로': 'obj_d', '색': 'obj_color',
    '기준X': 'base_x', '기준Y': 'base_y', '기준Z': 'base_z', '이동X': 'move_x', '이동Y': 'move_y', '이동Z': 'move_z', '주기': 'period', '상태': 'state', '순서': 'order',
    '어두운색': 'color_dark', '중간색': 'color_mid', '밝은색': 'color_light', '꼭짓점X': 'point_x', '꼭짓점Y': 'point_y', '꼭짓점Z': 'point_z',
};
// a function's name is its label pieces (the parameters sit between them)
const FUNCS = {
    '메인': 'main', '게임 준비': 'init', '설정': 'settings', '스테이지 로드': 'load_stage', '목록리셋': 'reset_lists', '물체 추가': 'add_obj',
    '스테이지 만들기': 'make_stage', '스테이지 1': 'stage_1', '스테이지 2': 'stage_2', '스테이지 3': 'stage_3', '시작 위치': 'start_pos',
    '발판 위치': 'platform pos', '움직이는 발판 위치': 'moving_platform pos', '가시 위치': 'spike pos', '태엽 위치': 'gear pos', '깃발 위치': 'flag pos', '목표 위치': 'goal pos',
    '크기': 'size', '색': 'color', '이동': 'move', '주기': 'period',
    '플레이어리스폰': 'respawn', '카메라 맞추기': 'update_cam', '주인공 상자 옮기기': 'move_player_box', '순서 정리': 'sort_order', '가르는 면': 'compare_side',
    '한 프레임': 'update', '시간 업데이트': 'update_time', '물체 업데이트': 'update_objs', '입력': 'input', '주인공 움직이기': 'move_player',
    '물체에 닿음': 'touch_obj', '발판에 부딪힘': 'hit_platform', '그림자 찾기': 'find_shadow', '화면 그리기': 'draw', '떨어진 거리': 'axis_dist',
    '물체 그리기': 'draw_obj', '상자 그리기': 'draw_box', '꼭짓점 계산': 'set_point', '면 그리기': 'draw_face', '점 찍기': 'add_point',
    '모서리 그리기': 'draw_edge', '잘린 점 찍기': 'add_cut_point', '그림자 그리기': 'draw_shadow',
};
const LOCALS = { '따라가기': 'follow', '지금': 'now', '비율': 'rate', '앞': 'front', '옆': 'side', '가속': 'accel', '빠르기': 'spd', '가장 얕은': 'min_push',
    '오른쪽': 'right', '왼쪽': 'left', '앞쪽': 'front', '뒤쪽': 'back', '윗면': 'top', '가장 높은': 'best_y', '멀기': 'dist' };
// the kinds kept in obj_type
const KINDS = { '주인공': 'player', '발판': 'platform', '태엽': 'gear', '깃발': 'flag', '목표': 'goal', '가시': 'spike' };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plat-'));
fs.writeFileSync(path.join(tmp, 'in.tar'), zlib.gunzipSync(fs.readFileSync(src)));
cp.execSync('tar -xf in.tar', { cwd: tmp });
const file = path.join(tmp, 'temp', 'project.json');
const P = JSON.parse(fs.readFileSync(file, 'utf8'));
const left = [];
const korean = (s) => /[가-힣]/.test(s);
for (const v of P.variables) {
    if (v.variableType !== 'variable' && v.variableType !== 'list') continue;
    if (VARS[v.name]) v.name = VARS[v.name]; else if (korean(v.name)) left.push('variable ' + v.name);
    if (v.name === 'obj_type' && Array.isArray(v.array)) for (const it of v.array) if (KINDS[it.data]) it.data = KINDS[it.data];
}
const walk = (b) => {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { b.forEach(walk); return; }
    if (b.type === 'function_field_label') { const t = b.params[0]; if (FUNCS[t]) b.params[0] = FUNCS[t]; else if (korean(t)) left.push('label ' + t); }
    if (b.type === 'text' && KINDS[b.params[0]]) b.params[0] = KINDS[b.params[0]];
    else if (b.type === 'text' && korean(String(b.params[0]))) left.push('text ' + b.params[0]);
    walk(b.params); walk(b.statements);
};
for (const f of P.functions) {
    const c = JSON.parse(f.content); walk(c); f.content = JSON.stringify(c);
    for (const l of f.localVariables || []) { if (LOCALS[l.name]) l.name = LOCALS[l.name]; else if (korean(l.name)) left.push('local ' + l.name); }
}
for (const o of P.objects) { const s = JSON.parse(o.script); walk(s); o.script = JSON.stringify(s); }
const names = P.variables.map(v => v.name);
const dup = names.filter((n, i) => names.indexOf(n) !== i);
if (dup.length) throw new Error('two variables named ' + dup);
fs.writeFileSync(file, JSON.stringify(P));
fs.rmSync(path.join(tmp, 'in.tar'));
cp.execSync('tar -cf out.tar temp', { cwd: tmp });
fs.writeFileSync(out, zlib.gzipSync(fs.readFileSync(path.join(tmp, 'out.tar')), { level: 9 }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote', out, '| still Korean:', left.length ? [...new Set(left)].join(', ') : 'none');

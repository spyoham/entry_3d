// "목소리 높이 바꾸기": an Entry project that raises or lowers a recorded
// voice while keeping its speaking speed, with nothing but sound blocks.
//
// How: Entry's sound speed (0.5 .. 2) scales pitch AND speed together. To keep
// the speed, the voice is cut into short overlapping grains (P = 80 ms, one
// every H = 1/30 s, Hann-faded) laid out in one file with silence around each
// (slot S = 160 ms). Every frame (60 fps) the project plays the grain under the
// current playing position with "sound from .. to ..": at speed r each grain
// comes out r times higher and 1/r as long, and because a new one starts every
// frame the position moves at normal speed. The silence around a grain soaks
// up MP3 decoder offsets and late stops.
//
// usage: node build.mjs [voice.wav] [out.ent]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import { packEnt } from '../racing/pack.mjs';
import { readWav, writeWav } from './sim.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = process.argv[2] || path.join(HERE, 'voice.wav');
const OUT = process.argv[3] || path.join(HERE, 'pitch.ent');
const SR = 44100;
const P = 0.08, M = 0.04, S = P + 2 * M, H = 1 / 30;

// ---------------- audio ----------------
const tmp = path.join(HERE, '.tmp');
fs.mkdirSync(tmp, { recursive: true });
const ff = (args) => cp.execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);
// trim the silence at both ends, 44.1 kHz mono
ff(['-i', SRC, '-ac', '1', '-ar', String(SR), '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
    path.join(tmp, 'trim.wav')]);
const { x: raw } = readWav(path.join(tmp, 'trim.wav'));
let peak = 0; for (const v of raw) peak = Math.max(peak, Math.abs(v));
const pad = Math.round(0.05 * SR);
const x = new Float64Array(raw.length + 2 * pad);
for (let i = 0; i < raw.length; i++) x[pad + i] = raw[i] / peak * 0.9;
const LEN = x.length / SR;
const N = Math.floor((LEN - P) / H) + 1;
const Pn = Math.round(P * SR), Sn = Math.round(S * SR), Mn = Math.round(M * SR);
const g = new Float64Array(N * Sn);
for (let k = 0; k < N; k++) {
    const s0 = Math.round(k * H * SR);
    for (let i = 0; i < Pn; i++) g[k * Sn + Mn + i] = (x[s0 + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Pn));
}
const mp3 = (samples, name) => {
    const w = path.join(tmp, name + '.wav');
    writeWav(w, samples, SR);
    ff(['-i', w, '-ac', '1', '-ar', String(SR), '-c:a', 'libmp3lame', '-b:a', '64k', path.join(tmp, name + '.mp3')]);
    return fs.readFileSync(path.join(tmp, name + '.mp3'));
};
const voiceMp3 = mp3(x, 'voice');
const grainMp3 = mp3(g, 'grains');
fs.copyFileSync(path.join(tmp, 'voice.wav'), path.join(HERE, 'voice_trim.wav'));
fs.copyFileSync(path.join(tmp, 'grains.wav'), path.join(HERE, 'grains.wav'));

// pictures: the voice's waveform, a playhead bar
const WW = 400, WH = 100;
ff(['-i', path.join(tmp, 'voice.wav'), '-filter_complex', `showwavespic=s=${WW}x${WH}:colors=0x4a7bd0:split_channels=0`, '-frames:v', '1', path.join(tmp, 'wave.png')]);
ff(['-f', 'lavfi', '-i', `color=c=0xe0463c:s=3x${WH - 10}`, '-frames:v', '1', path.join(tmp, 'bar.png')]);
const wavePng = fs.readFileSync(path.join(tmp, 'wave.png'));
const barPng = fs.readFileSync(path.join(tmp, 'bar.png'));

// ---------------- blocks ----------------
const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
const used = new Set();
const newId = () => { let id; do { id = Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * 36)]).join(''); } while (used.has(id) || /^\d/.test(id)); used.add(id); return id; };
const B = (type, params = [], statements = []) => ({ id: newId(), x: 0, y: 0, type, params, statements, movable: null, deletable: 1, emphasized: false, readOnly: null, copyable: true, assemble: true, extensions: [] });
const n = (v) => B('number', [String(v)]);
const t = (v) => B('text', [String(v)]);
const val = (v) => (typeof v === 'object' ? v : typeof v === 'number' ? n(v) : t(v));
const OPS = { '+': 'PLUS', '-': 'MINUS', '*': 'MULTI', '/': 'DIVIDE' };
const calc = (a, op, b) => B('calc_basic', [val(a), OPS[op], val(b)]);
const CMP = { '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS', '<=': 'LESS_OR_EQUAL', '>': 'GREATER', '>=': 'GREATER_OR_EQUAL' };
const cmp = (a, op, b) => B('boolean_basic_operator', [val(a), CMP[op], val(b)]);
const round = (a) => B('calc_operation', [null, val(a), null, 'round']);
const join = (...parts) => parts.map(val).reduce((acc, p) => B('combine_something', [null, acc, null, p, null]));
const iff = (c, ...body) => B('_if', [c, null], [body]);
const ifElse = (c, yes, no) => B('if_else', [c, null, null], [yes, no]);
const forever = (...body) => B('repeat_inf', [null, null], [body]);

const V = {}, variables = [];
const variable = (name, value = 0) => { V[name] = newId(); variables.push({ name, id: V[name], value, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 }); };
const get = (name) => B('get_variable', [V[name], null]);
const set = (name, v) => B('set_variable', [V[name], val(v), null]);
const add = (name, v) => B('change_variable', [V[name], val(v), null]);
['반음', '재생속도', '모드', '위치', '지난시각', '지금', '조각번호', '조각길이'].forEach((v) => variable(v));
variable('$TESSVM');     // tessvm sets it to 1; plain Entry leaves it 0
// sound speed for -12 .. +12 semitones: item (semitone + 13)
const RATE_ID = newId();
const rates = Array.from({ length: 25 }, (_, i) => Math.round(2 ** ((i - 12) / 12) * 10000) / 10000);
variables.push({ name: '재생속도표', id: RATE_ID, value: 0, variableType: 'list', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0, width: 100, height: 120,
    array: rates.map((r, i) => ({ id: `${RATE_ID}_${i}`, data: String(r) })) });

const MSG = {}, messages = [];
for (const m of ['음높이만 바꿔 재생', '원본 재생', '속도째 바꿔 재생', '음높이 올리기', '음높이 내리기', '원래 높이', '설정 적용', '멈추기']) { MSG[m] = newId(); messages.push({ id: MSG[m], name: m }); }
const cast = (m) => B('message_cast', [MSG[m], null]);
const castWait = (m) => B('message_cast_wait', [MSG[m], null]);
const onMsg = (m) => B('when_message_cast', [null, MSG[m]]);
const onKey = (code) => B('when_some_key_pressed', [null, String(code)]);
const onClick = () => B('when_object_click', [null]);
const onStart = () => B('when_run_button_click', [null]);
const timer = () => B('get_project_timer_value', [null, 0]);
const snd = (id) => B('get_sounds', [id]);

let sy = 30;
const thread = (...blocks) => { blocks[0].x = 40; blocks[0].y = sy; sy += 60 + blocks.length * 25; return blocks; };

// the controller: the waveform picture, which also carries the two sounds
const ctrl = [
    thread(onStart(),
        B('choose_project_timer_action', [null, 'START', null, null]),
        B('choose_project_timer_action', [null, 'HIDE', null, null]),
        set('반음', 0), set('모드', 0), set('위치', 0),
        castWait('설정 적용'),
        set('지난시각', timer()),
        forever(
            // how far the voice has got: normal speed, except "속도째" mode
            set('지금', timer()),
            ifElse(cmp(get('모드'), '==', 3),
                [add('위치', calc(calc(get('지금'), '-', get('지난시각')), '*', get('재생속도')))],
                [add('위치', calc(get('지금'), '-', get('지난시각')))]),
            set('지난시각', get('지금')),
            iff(cmp(get('모드'), '>', 0),
                iff(cmp(get('위치'), '>', +(LEN).toFixed(3)), set('모드', 0), cast('설정 적용'))),
            // one grain every frame: the one under the playing position
            iff(cmp(get('모드'), '==', 1),
                set('조각번호', round(calc(get('위치'), '*', 1 / H))),
                iff(cmp(get('조각번호'), '>', N - 1), set('조각번호', N - 1)),
                B('sound_from_to', [snd('grains'),
                    calc(get('조각번호'), '*', S),
                    calc(calc(get('조각번호'), '*', S), '+', get('조각길이')), null])),
        )),
    // speed, volume, grain length and the text for the current semitone
    thread(onMsg('설정 적용'),
        set('재생속도', B('value_of_index_from_list', [null, RATE_ID, null, calc(get('반음'), '+', 13), null])),
        ifElse(cmp(get('모드'), '==', 2),
            [B('sound_speed_set', [n(1), null])],
            [B('sound_speed_set', [get('재생속도'), null])]),
        // grains overlap more when slowed down: turn them down to match
        // (fitted to recordings: as loud as the original at every pitch)
        ifElse(cmp(get('모드'), '==', 1),
            [ifElse(cmp(get('재생속도'), '<', 1),
                [B('sound_volume_set', [calc(12, '+', calc(48, '*', get('재생속도'))), null])],
                [B('sound_volume_set', [calc(44, '+', calc(19, '*', get('재생속도'))), null])])],
            [B('sound_volume_set', [n(80), null])]),
        // Entry stops "from .. to" by the clock: when slowed down, ask for
        // more so the whole slot still plays. tessvm counts in file time.
        set('조각길이', S),
        iff(cmp(get('재생속도'), '<', 1),
            iff(cmp(get('$TESSVM'), '!=', 1), set('조각길이', calc(S, '/', get('재생속도'))))),
    ),
    thread(onMsg('음높이만 바꿔 재생'), B('sound_silent_all', ['all', null]), set('모드', 1), set('위치', 0), castWait('설정 적용')),
    thread(onMsg('원본 재생'), B('sound_silent_all', ['all', null]), set('모드', 2), set('위치', 0), castWait('설정 적용'),
        B('sound_something_with_block', [snd('voice'), null])),
    thread(onMsg('속도째 바꿔 재생'), B('sound_silent_all', ['all', null]), set('모드', 3), set('위치', 0), castWait('설정 적용'),
        B('sound_something_with_block', [snd('voice'), null])),
    thread(onMsg('멈추기'), B('sound_silent_all', ['all', null]), set('모드', 0), castWait('설정 적용')),
    thread(onMsg('음높이 올리기'), iff(cmp(get('반음'), '<', 12), add('반음', 1)), castWait('설정 적용')),
    thread(onMsg('음높이 내리기'), iff(cmp(get('반음'), '>', -12), add('반음', -1)), castWait('설정 적용')),
    thread(onMsg('원래 높이'), set('반음', 0), castWait('설정 적용')),
    thread(onKey(32), cast('음높이만 바꿔 재생')),
    thread(onKey(49), cast('원본 재생')),
    thread(onKey(50), cast('속도째 바꿔 재생')),
    thread(onKey(38), cast('음높이 올리기')),
    thread(onKey(40), cast('음높이 내리기')),
    thread(onKey(48), cast('원래 높이')),
    thread(onKey(83), cast('멈추기')),
];

sy = 30;
const WX = -200;   // left edge of the waveform
const bar = [
    thread(onStart(), B('hide', [null]),
        forever(ifElse(cmp(get('모드'), '>', 0),
            [B('locate_x', [calc(WX, '+', calc(get('위치'), '*', +(WW / LEN).toFixed(4))), null]), B('show', [null])],
            [B('hide', [null])]))),
];

sy = 30;
const info = [
    thread(onMsg('설정 적용'),
        ifElse(cmp(get('반음'), '>', 0),
            [B('text_write', [join('음높이 +', get('반음'), '반음  (재생 속도 ×', calc(round(calc(get('재생속도'), '*', 100)), '/', 100), ')'), null])],
            [B('text_write', [join('음높이 ', get('반음'), '반음  (재생 속도 ×', calc(round(calc(get('재생속도'), '*', 100)), '/', 100), ')'), null])])),
];

// buttons: clicking one casts the same message as its key
const button = (id, label, x, y, w, msg, bg = '#4a7bd0') => ({
    id, name: label.replace(/[^가-힣A-Za-z0-9 ]/g, '').trim() || id, objectType: 'textBox', text: label,
    script: [thread(onClick(), cast(msg))],
    entity: { x, y, width: w, height: 24, colour: '#ffffff', bgColor: bg, font: '13px NanumGothic', textAlign: 0, lineBreak: true, bold: true, underLine: false, strike: false, italic: false, fontSize: 13 },
});
const label = (id, name, text, x, y, size, colour, script = [[]]) => ({
    id, name, objectType: 'textBox', text, script,
    entity: { x, y, width: 440, height: size + 8, colour, bgColor: 'transparent', font: `${size}px NanumGothic`, textAlign: 0, lineBreak: false, bold: size >= 16, underLine: false, strike: false, italic: false, fontSize: size },
});

const objects = [
    label('ttl', '제목', '목소리 높이 바꾸기 — 말 빠르기는 그대로', 0, 112, 18, '#222222'),
    { id: 'wav', name: '목소리', pictures: [{ id: 'w1', name: '파형', buf: wavePng, w: WW, h: WH }],
        sounds: [{ id: 'voice', name: '목소리', buf: voiceMp3, ext: 'mp3', duration: +LEN.toFixed(3) },
            { id: 'grains', name: '목소리 조각', buf: grainMp3, ext: 'mp3', duration: +(N * S).toFixed(3) }],
        script: ctrl, entity: { x: 0, y: 45 } },
    { id: 'bar', name: '재생 위치', pictures: [{ id: 'b1', name: '막대', buf: barPng, w: 3, h: WH - 10 }], script: bar, entity: { x: WX, y: 45 } },
    label('inf', '음높이 표시', '음높이 0반음', 0, -22, 16, '#222222', info),
    button('up', '▲ 올리기 (↑)', -150, -52, 136, '음높이 올리기', '#6b6b6b'),
    button('rs', '원래 높이 (0)', 0, -52, 136, '원래 높이', '#6b6b6b'),
    button('dn', '▼ 내리기 (↓)', 150, -52, 136, '음높이 내리기', '#6b6b6b'),
    button('b1', '▶ 음높이만 (스페이스)', -150, -84, 136, '음높이만 바꿔 재생', '#2f9e5b'),
    button('b2', '▶ 원본 (1)', 0, -84, 136, '원본 재생'),
    button('b4', '▶ 속도째 (2)', 150, -84, 136, '속도째 바꿔 재생'),
    button('b3', '■ 멈춤 (S)', 0, -116, 136, '멈추기', '#b8453c'),
];

packEnt(OUT, { name: '목소리 높이 바꾸기', objects, variables, functions: [], messages, speed: 60, tmpDir: path.join(HERE, '.pack') });
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes; voice', LEN.toFixed(2), 's; grains', N, '=', (N * S).toFixed(1), 's; mp3',
    voiceMp3.length, '+', grainMp3.length, 'bytes');


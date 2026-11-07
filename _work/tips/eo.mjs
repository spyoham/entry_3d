// "노하우 팁/최적화/최적화 블록 모음.eo": an object file with the blocks the editor cannot make:
// the no-delay loop (a command block inside a condition) and the old arithmetic blocks (not in the palette).
// Also writes the same object as a project (_work/tips/eo-check.ent) and runs it in the real engine.
// usage: node eo.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import url from 'node:url';
import { createRequire } from 'node:module';
import { B, newId } from '../expfn/lib.mjs';
import { packEnt } from '../cplot/pack.mjs';
import { runEnt } from '../gmp/erun.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(new URL('../../entry-vibe-coding/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const OUT = path.join(HERE, '..', '..', '노하우 팁', '최적화');

// the picture: a small tile, drawn by the browser
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 240, height: 240 } });
const tile = async (S) => {
    await pg.setViewportSize({ width: S, height: S });
    await pg.setContent(`<body style="margin:0;background:transparent"><div style="width:${S}px;height:${S}px;border-radius:${S * 0.16}px;background:#1b2230;display:flex;align-items:center;justify-content:center;font:700 ${S * 0.42}px 'Malgun Gothic';color:#ffb43c">⟳</div></body>`);
    return pg.screenshot({ omitBackground: true });
};
const S = 240, buf = await tile(S), thumb = await tile(96);
await browser.close();

const vx = newId(), vn = newId(), va = newId(), vb = newId();
const num = (v) => B('number', [String(v)]);
const get = (id) => B('get_variable', [id, null]);
const set = (id, e) => B('set_variable', [id, e, null]);
const trick = () => B('wait_until_true', [B('boolean_not', [null, B('continue_repeat', [null]), null]), null]);
const old = (type) => B(type, [get(va), null, get(vb)]);
const at = (blocks, x, y) => { blocks[0].x = x; blocks[0].y = y; return blocks; };
const script = [
    // the example: count to 100000 in one tick, then say how long it took
    at([B('when_run_button_click', [null]), set(vx, num(0)), B('choose_project_timer_action', [null, 'START', null, null]), B('wait_second', [num(0.1), null]),
        set(vn, B('get_project_timer_value', [null, 0])),
        B('repeat_basic', [num(100000), null], [[set(vx, B('calc_basic', [get(vx), 'PLUS', num(1)])), trick()]]),
        B('dialog', [B('combine_something', [null, B('combine_something', [null, get(vx), null, B('text', ['번 도는 데 걸린 초: ']), null]), null,
            B('calc_basic', [B('get_project_timer_value', [null, 0]), 'MINUS', get(vn)]), null]), 'speak', null])], 40, 40),
    // the blocks to copy
    at([trick()], 40, 420),
    at([set(vx, old('calc_plus'))], 40, 520),
    at([set(vx, old('calc_minus'))], 40, 580),
    at([set(vx, old('calc_times'))], 40, 640),
    at([set(vx, old('calc_divide'))], 40, 700),
];
const variable = (name, id, value = 0) => ({ name, id, value, variableType: 'variable', visible: false, isCloud: false, isRealTime: false, cloudDate: false, object: null, x: 0, y: 0 });
const variables = [variable('x', vx), variable('시작', vn), variable('a', va, 7), variable('b', vb, 3)];
const NAME = '최적화 블록 모음';

// ---- the same object as a project, run in the real engine ----
const check = path.join(HERE, 'eo-check.ent');
const done = newId();
const probe = at([B('when_run_button_click', [null]), B('wait_second', [num(1.5), null]), B('set_variable', [done, num(1), null])], 600, 40);
packEnt(check, { name: NAME, tmpDir: path.join(HERE, '.pack-eo'), variables: [...variables, variable('done', done)], functions: [], speed: 60,
    objects: [{ id: 'tips', name: NAME, pictures: [{ id: 'pic1', name: 'tile', buf, w: S, h: S }], script: [...script, probe], entity: { scaleX: 0.4, scaleY: 0.4 } }] });
const r = await runEnt(check, { vars: ['x', 'done'], hiresTimer: false, timeout: 60000 });
console.log('check:', JSON.stringify({ done: r.done, x: r.vars.x, errors: r.errors }));
if (!r.done || Number(r.vars.x) !== 100000 || r.errors.length) throw new Error('the object does not run as it should');

// ---- .eo: object/object.json, object/aa/bb/image|thumb/<name>.png ----
const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 32);
const tmp = path.join(HERE, '.pack-eo');
fs.rmSync(tmp, { recursive: true, force: true });
for (const [kind, b] of [['image', buf], ['thumb', thumb]]) {
    const dir = path.join(tmp, 'object', h.slice(0, 2), h.slice(2, 4), kind);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, h + '.png'), b);
}
const object = {
    id: newId(), name: NAME, script: JSON.stringify(script), objectType: 'sprite', rotateMethod: 'free', scene: newId(),
    sprite: { pictures: [{ id: newId(), dimension: { width: S, height: S }, filename: h, name: 'tile', imageType: 'png', fileurl: `temp/${h.slice(0, 2)}/${h.slice(2, 4)}/image/${h}.png` }], sounds: [] },
    lock: false,
    entity: { x: 0, y: 0, regX: S / 2, regY: S / 2, scaleX: 0.4, scaleY: 0.4, rotation: 0, direction: 90, width: S, height: S, font: 'undefinedpx ', visible: true },
};
object.selectedPictureId = object.sprite.pictures[0].id;
fs.writeFileSync(path.join(tmp, 'object', 'object.json'), JSON.stringify({ functions: [], variables, messages: [], tables: [], expansionBlocks: [], aiUtilizeBlocks: [], objects: [object] }));
cp.execSync('tar -cf out.tar object', { cwd: tmp });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, NAME + '.eo'), zlib.gzipSync(fs.readFileSync(path.join(tmp, 'out.tar')), { level: 9 }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote', path.join(OUT, NAME + '.eo'));

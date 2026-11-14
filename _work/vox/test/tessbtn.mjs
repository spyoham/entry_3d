// (v3.0) the buttons in tessvm itself (0.3.56: $MOUSE_BUTTONS): the work is seen to use them, and a press
// goes as the page sends it (pointerdown: mouseDown and the click event; mousedown: the buttons) - the
// right one places, the left one breaks, the middle one picks: node test/tessbtn.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import cp from 'node:child_process';
import zlib from 'node:zlib';
import { buildProject } from '../build.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.join(HERE, 'tessbtn.ent');
buildProject(file, { name: 'tess', more: { AUTOSEED: 1234, TESTRUN: 1, ANIMALS: 0, AUTOMODE: 1 } });
const EXT = path.join(HERE, '../../tessvm/ext');
const imp = (p) => import(url.pathToFileURL(path.join(EXT, p)).href);
const tmp = path.join(HERE, '.nrun');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
cp.execSync('tar -xf -', { cwd: tmp, input: zlib.gunzipSync(fs.readFileSync(file)) });
const work = JSON.parse(fs.readFileSync(path.join(tmp, 'temp/project.json'), 'utf8'));
work.id = 'local';
const { toTessProject } = await imp('page/tess-project.js');
const { Vm } = await imp('vendor/tessvm/runtime/engine.js');
const vm = new Vm({ kernel: null, store: null });
vm.load(toTessProject(work).project);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
ok(vm.extras.uses.mouseButtons === true, 'tessvm sees $MOUSE_BUTTONS (its right-click menu then wants Ctrl)');
vm.start();
const Vv = (n) => { const v = vm.variables.find(v => v.name === n); return v && v.value; };
const set = (n, x) => { const v = vm.variables.find(v => v.name === n); v.setValue(x); };
const T = (k = 1) => { for (let i = 0; i < k; i++) vm.tick(); };
let n = 0; while (Vv('gState') != 2 && n < 5000) { vm.tick(); n++; }
T(100);
vm.extras.lockChanged(true); T(2);
const say = (c) => { set('tCmd', c); set('testCmd', 13); T(2); };
// as boot.js and extras.js: pointerdown, then mousedown (the buttons), held k ticks, then let go
const press = (b, k) => {
  vm.mouseDown = true; vm.fireEvent('mouse_clicked'); vm.extras.buttonsChanged(b);
  T(k);
  vm.mouseDown = false; vm.fireEvent('mouse_click_cancled'); vm.extras.buttonsChanged(0);
  T(4);
};
const stand = () => { set('flying', 1); set('pvx', 0); set('pvy', 0); set('pvz', 0); set('yaw', 0); set('pitch', 0); vm.extras.lockChanged(true); T(4); };
say('/clear'); say('/give @s stone 10');
say('/fill ~-2 ~-1 ~-1 ~2 ~4 ~5 air'); say('/setblock ~ ~2 ~3 gold_block');
stand();
const gold = Vv('pickB');
ok(Vv('pickOn') == 1 && gold > 0, `looking at the gold block (${gold})`);
const hs = () => Number(Vv('hotSel'));
const INV = () => { const l = vm.variables.find(v => v.name === 'INVI'); return (l.array || l.value || []).map(x => Number(x?.data ?? x)); };
const STONE = INV().find(x => x > 0);
set('hotSel', INV().indexOf(STONE) + 1); T(2);
press(2, 8);
stand();
ok(Vv('pickB') != gold && Vv('pickB') > 0, `the right button: a block put before the gold, nothing broken (looking at ${Vv('pickB')})`);
const placed = Vv('pickB');
press(1, 10);
stand();
ok(Vv('pickB') == gold, `the left button: what was put is broken (creative), the gold seen again (${Vv('pickB')})`);
set('hotSel', 9); T(2);
press(4, 10);
stand();
ok(INV()[8] > 0 && Vv('pickB') == gold, `the middle button: the gold into the hand (slot 9: ${INV()[8]}), not broken`);
// Entry's way (an older tessvm): no buttons, a press is the left one
vm.mouseDown = true; vm.fireEvent('mouse_clicked'); T(10); vm.mouseDown = false; vm.fireEvent('mouse_click_cancled'); T(4);
stand();
ok(Vv('pickOn') == 0 || Vv('pickB') != gold, `no buttons told: the press breaks the gold (looking at ${Vv('pickOn') == 1 ? Vv('pickB') : 'nothing'})`);
console.log(fails ? fails + ' FAILED' : 'all ok');
void placed;

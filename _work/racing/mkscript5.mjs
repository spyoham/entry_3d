// Entry key script for v5: choose circuit N (and optionally mode/weather/graphics)
// from the main menu, start, hold throttle, probe fps and take shots.
// usage: node mkscript5.mjs N out.json tag [mode] [wx] [gfx] [secs]
import fs from 'node:fs';
const [n = 1, out = 'run5.json', tag = 'e', mode = 1, wx = 1, gfx = 2, secs = '6,12'] = process.argv.slice(2);
const K = { Enter: 13, ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, KeyW: 87, KeyC: 67, KeyD: 68 };
const key = (code) => [{ down: { code, key: code, keyCode: K[code] } }, { wait: 250 }, { up: { code, key: code, keyCode: K[code] } }, { wait: 450 }];
const g = `const g=n=>{const v=Entry.variableContainer.variables_.find(x=>x.name_===n);return v?Number(v.value_):null;};`;
const probe = (lab) => ({ eval: `(()=>{${g}return {at:'${lab}',t:performance.now()|0,frame:g('frameId'),gt:+g('gt').toFixed(2),raceT:+g('raceT').toFixed(2),quads:g('drawnQuads'),state:g('raceState'),trk:g('selTrk'),rank:g('caRank'),lights:g('lightN')};})()` });
const steps = [{ wait: 2500 }];
const down = (k) => { for (let i = 0; i < k; i++) steps.push(...key('ArrowDown')); };
// line 2 mode, 4 track, 7 weather, 8 graphics
down(1); for (let i = 1; i < +mode; i++) steps.push(...key('ArrowRight'));
down(2); for (let i = 1; i < +n; i++) steps.push(...key('ArrowRight'));
down(3); for (let i = 1; i < +wx; i++) steps.push(...key('ArrowRight'));
down(1); for (let i = 2; i < +gfx; i++) steps.push(...key('ArrowRight'));
if (+gfx < 2) steps.push(...key('ArrowLeft'));
steps.push({ wait: 1500, shot: `${tag}${n}_menu.png` });
for (let i = 0; i < 7; i++) steps.push(...key('ArrowUp'));
steps.push(...key('Enter'));
steps.push({ wait: 3000, shot: `${tag}${n}_lights.png` }, probe('lights'));
steps.push({ wait: 4500 }, { down: { code: 'KeyW', key: 'w', keyCode: 87 } }, probe('go'));
let t = 0;
for (const s of String(secs).split(',').map(Number)) {
    steps.push({ wait: (s - t) * 1000, shot: `${tag}${n}_${s}.png` }, probe(s + 's'));
    t = s;
}
fs.writeFileSync(out, JSON.stringify(steps));

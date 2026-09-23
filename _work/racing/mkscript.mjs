// write an Entry key script: choose circuit N from the main menu, race, measure fps
import fs from 'node:fs';
const [n = 1, out = 'f1run.json', tag = 'e'] = process.argv.slice(2);
const K = { Enter: 13, ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, KeyW: 87, KeyC: 67, KeyD: 68 };
const key = (code) => [{ down: { code, key: code, keyCode: K[code] } }, { wait: 300 }, { up: { code, key: code, keyCode: K[code] } }, { wait: 500 }];
const g = `const g=n=>Number(Entry.variableContainer.variables_.find(x=>x.name_===n).value_);`;
const probe = (lab) => ({ eval: `(()=>{${g}return {at:'${lab}',t:performance.now()|0,frame:g('frameId'),gt:+g('gt').toFixed(2),raceT:+g('raceT').toFixed(2),quads:g('drawnQuads'),state:g('raceState'),trk:g('selTrk'),scN:g('scN')};})()` });
const steps = [{ wait: 2500 }, ...key('ArrowDown'), ...key('ArrowDown')];
for (let i = 1; i < +n; i++) steps.push(...key('ArrowRight'));
steps.push({ wait: 1500, shot: `${tag}${n}_menu.png` });
steps.push(...key('ArrowUp'), ...key('ArrowUp'), ...key('Enter'));
steps.push({ wait: 5500 }, { down: { code: 'KeyW', key: 'w', keyCode: 87 } }, probe('go'), { wait: 6000, shot: `${tag}${n}_a.png` }, probe('6s'),
    { wait: 6000, shot: `${tag}${n}_b.png` }, probe('12s'));
fs.writeFileSync(out, JSON.stringify(steps));

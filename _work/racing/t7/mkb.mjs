// v4.0 tessvm bench key script for the v9 paged menu.
// usage: node t7/mkb.mjs out.json '{"trk":2,"gfx":2,"rules":1,"shot":"/path/prefix","secs":24,"cam":2}'
//   picks RACE SETUP > rules + circuit, SETTINGS > graphics, starts the race,
//   then follows AI car `cam` (camCar) so the frames are of a car at racing
//   speed, not the player's parked one, and measures fps every `secs`/4 s.
import fs from 'node:fs';
const [out, js] = process.argv.slice(2);
const o = Object.assign({ trk: 1, gfx: 2, rules: 1, shot: '', secs: 24, cam: 2, shots: 4 }, JSON.parse(js || '{}'));
const K = { Down: 40, Up: 38, Right: 39, Left: 37, Enter: 13, Escape: 27 };
const steps = [{ wait: 1500 }];
const press = (code, after = 120) => { steps.push({ down: { code, key: code, keyCode: K[code] } }, { wait: 70 }, { up: { code, key: code, keyCode: K[code] } }, { wait: after }); };
const set = (n, v) => `(()=>{const x=window.__vm.variables.find(q=>q.name===${JSON.stringify(n)}); x.value=${v}; return ${JSON.stringify(n)}+'='+x.value})()`;
const get = `(()=>{const g=n=>{const v=window.__vm.variables.find(q=>q.name===n); return v && v.value}; return {trk: g('selTrk'), gfx: g('gfx'), rules: g('rules'), rs: g('raceState'), camCar: g('camCar'), scN: g('scN'), drawn: g('drawnQuads')}})()`;
press('Down');                        // RACE SETUP
press('Enter', 300);
press('Down');                        // rules
for (let i = 1; i < o.rules; i++) press('Right', 200);
press('Down');                        // circuit
for (let i = 1; i < o.trk; i++) press('Right', 400);
press('Escape', 300);
press('Down'); press('Down'); press('Down');   // SETTINGS
press('Enter', 300);
for (let i = 0; i < ((o.gfx - 2) + 3) % 3; i++) press('Right', 400);
press('Escape', 300);
for (let i = 0; i < 4; i++) press('Up');
steps.push({ wait: 1500, fps: 'menu', shot: o.shot ? o.shot + '_menu.png' : undefined }, { eval: get });
press('Enter');
steps.push({ wait: 2500, fps: 'start', shot: o.shot ? o.shot + '_start.png' : undefined });
const n = o.shots;
for (let k = 0; k < n; k++) {
    steps.push({ eval: set('camCar', o.cam) });
    steps.push({ wait: o.secs * 1000 / n, fps: 'race' + (k + 1), shot: o.shot ? `${o.shot}_race${k + 1}.png` : undefined });
}
steps.push({ eval: get });
fs.writeFileSync(out, JSON.stringify(steps.map((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)))));

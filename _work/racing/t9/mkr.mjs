// tessvm key script: realistic GP, skip quali/formation, drive, R, drive again, watch caDNF/caFail
// usage: node t9/mkr.mjs out.json '{"trk":1,"driveA":20,"driveB":60}' ; then (in ../tessvm) node trun.mjs ../racing/racing63.ent --script out.json
import fs from 'node:fs';
const [out, js] = process.argv.slice(2);
const o = Object.assign({ trk: 1, driveA: 30, driveB: 90 }, JSON.parse(js || '{}'));
const K = { Down: 40, Up: 38, Right: 39, Left: 37, Enter: 13, Escape: 27, R: 82 };
const steps = [{ wait: 1500 }];
const kd = (c) => ({ down: { code: c === 'R' ? 'KeyR' : c, key: c === 'R' ? 'r' : c, keyCode: K[c] } });
const ku = (c) => ({ up: { code: c === 'R' ? 'KeyR' : c, key: c === 'R' ? 'r' : c, keyCode: K[c] } });
const press = (c, after = 150) => { steps.push(kd(c), { wait: 90 }, ku(c), { wait: after }); };
const get = `(()=>{const vm=window.__vm;const g=n=>{const v=vm.variables.find(q=>q.name===n)||(vm.lists||[]).find(q=>q.name===n); if(!v) return '?'; const x=v.isList?(v.array||[]).map(e=>e && e.data!==undefined?e.data:e):v.value; return Array.isArray(x)? x.slice(0,9): x}; return {rs: g('raceState'), raceT:g('raceT'), fin:g('finished'), radio:g('radio'), dnf:g('caDNF'), fuel:g('caFuel'), fail:g('caFail'), qDone:g('qDone'), vsc:g('vscOn'), sc:g('scOn'), yel:g('caYelT'), dmg:g('caDmg')}})()`;
press('Down'); press('Enter', 300); press('Down'); press('Right', 200);
press('Down'); for (let i = 1; i < o.trk; i++) press('Right', 400);
press('Escape', 300); press('Up');
steps.push({ wait: 800, eval: get });
press('Enter', 6000);                 // start -> loading -> quali
steps.push({ eval: get });
press('Enter', 1500);                 // end quali -> results
press('Enter', 3000);                 // to the grid -> formation
press('Enter', 500);                  // skip formation
steps.push({ eval: get, wait: 6000 });
steps.push(kd('Up'), { wait: o.driveA * 1000 }, ku('Up'), { eval: get });
press('R', 5000);
steps.push({ eval: get });
press('Enter', 500);
steps.push({ eval: get, wait: 6000 });
for (let k = 0; k < o.driveB / 10; k++) steps.push(kd('Up'), { wait: 10000 }, ku('Up'), { eval: get });
fs.writeFileSync(out, JSON.stringify(steps));

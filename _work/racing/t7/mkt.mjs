// tessvm key script for the v7 main menu (11 rows).
// usage: node t7/mkt.mjs out.json '{"rules":2,"trk":1,"wx":1,"gfx":3,"laps":1,"mode":1,"shot":"x","race":20,"extra":[...]}'
// rows: 1 start 2 mode 3 rules 4 car 5 circuit 6 ai 7 laps 8 weather 9 graphics 10 sound 11 editor
import fs from 'node:fs';
const [out, js] = process.argv.slice(2);
let o = Object.assign({ rules: 1, trk: 1, wx: 1, gfx: 2, laps: 2, mode: 1, shot: '', race: 16, extra: [] }, JSON.parse(js || '{}'));
if (o.extraFile) o.extra = (await import(o.extraFile)).extra;
const K = { Down: 40, Up: 38, Right: 39, Left: 37, Enter: 13, KeyW: 87, KeyA: 65, KeyD: 68, KeyS: 83, KeyV: 86, KeyC: 67, KeyT: 84, KeyP: 80, KeyK: 75, KeyI: 73, Escape: 27, Space: 32, ShiftLeft: 16 };
const steps = [{ wait: 1500 }];
const press = (code, hold = 70) => { steps.push({ down: { code, key: code, keyCode: K[code] } }, { wait: hold }, { up: { code, key: code, keyCode: K[code] } }, { wait: 90 }); };
let row = 1;
const go = (r) => { while (row < r) { press('Down'); row++; } while (row > r) { press('Up'); row--; } };
const right = (n) => { for (let i = 0; i < n; i++) { press('Right'); steps.push({ wait: 120 }); } };
go(2); right(o.mode - 1);
go(3); right(o.rules - 1);
go(5); right(o.trk - 1);
go(7); right((o.laps - 2 + 4) % 4);
go(8); right(o.wx - 1);
go(9); right((o.gfx - 2 + 3) % 3);
if (o.menuShots) for (const r of o.menuShots) { go(r); steps.push({ wait: 700, shot: `${o.shot}_m${r}.png` }); }
steps.push({ wait: 800, fps: 'menu', shot: o.shot ? o.shot + '_menu.png' : undefined });
go(1);
press('Enter');
for (const e of o.extra) steps.push(e);
if (!o.noRace) {
    steps.push({ wait: 2500, fps: 'start', shot: o.shot ? o.shot + '_start.png' : undefined });
    steps.push({ down: { code: 'KeyW', key: 'w', keyCode: 87 } });
    steps.push({ wait: o.race * 500, fps: 'race', shot: o.shot ? o.shot + '_race1.png' : undefined });
    steps.push({ wait: o.race * 500, fps: 'race2', shot: o.shot ? o.shot + '_race2.png' : undefined });
}
steps.push({ eval: "(()=>{const g=n=>{const v=window.__vm.variables.find(v=>v.name===n); return v && (v.array? v.array.slice(0,8).map(d=>d.data): v.value)}; return {rs: g('raceState'), rules: g('rules'), trk: g('selTrk'), gfx: g('gfx'), wx: g('wx'), spd: g('caSpd'), ty: g('caTy'), pit: g('caPit')}})()" });
fs.writeFileSync(out, JSON.stringify(steps.map(s => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)))));

// tessvm bench key script: pick track + graphics on the v5/v6 main menu, race, measure.
// usage: node mkbench.mjs trk gfx out.json [menuRows=9] [shotPrefix]
import fs from 'node:fs';
const [trk, gfx, out, rows = 9, shot = ''] = process.argv.slice(2).map((v, i) => (i < 2 || i === 3 ? +v : v));
const K = { Down: 40, Up: 38, Right: 39, Enter: 13, KeyW: 87 };
const steps = [{ wait: 1500 }];
const press = (code) => { steps.push({ down: { code, key: code, keyCode: K[code] } }, { wait: 70 }, { up: { code, key: code, keyCode: K[code] } }, { wait: 70 }); };
for (let i = 0; i < 3; i++) press('Down');
for (let i = 1; i < trk; i++) { press('Right'); steps.push({ wait: 150 }); }
for (let i = 0; i < 4; i++) press('Down');
for (let i = 0; i < ((gfx - 2) + 3) % 3; i++) { press('Right'); steps.push({ wait: 200 }); }
steps.push({ wait: 1500, fps: 'menu' }, { wait: 2000, fps: 'menu', shot: shot ? shot + '_menu.png' : undefined });
for (let i = 0; i < 7; i++) press('Up');
press('Enter');
steps.push({ wait: 400, fps: 'x' }, { wait: 2500, fps: 'grid', shot: shot ? shot + '_grid.png' : undefined });
steps.push({ down: { code: 'KeyW', key: 'w', keyCode: 87 } });
steps.push({ wait: 6000, fps: 'go' }, { wait: 5000, fps: 'race', shot: shot ? shot + '_race.png' : undefined }, { wait: 5000, fps: 'race2' });
steps.push({ eval: "(()=>{const g=n=>{const v=window.__vm.variables.find(v=>v.name===n); return v && (v.array? v.array.slice(0,2).map(d=>d.data): v.value)}; return {trk: g('selTrk'), gfx: g('gfx'), rs: g('raceState'), spd: g('caSpd')}})()" });
fs.writeFileSync(out, JSON.stringify(steps.map(s => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)))));

// node test/perf.mjs stage [K=V ...] : fps in the real Entry engine, and which functions run the most blocks
import fs from 'node:fs';
import cp from 'node:child_process';
import { buildProject } from '../build.mjs';
const a = process.argv.slice(2);
const st = Number(a[0] || 2);
const more = Object.fromEntries(a.slice(1).filter(x => x.includes('=')).map(x => x.split('=')).map(([k, v]) => [k, Number(v)]));
const r = buildProject('test/perf.ent', { more: { AUTOSTART: st, ...more } });
const M = {};
for (const f of r.project.functions) { const m = f.content.match(/function_field_label","params":\["([^"]+)/); M[f.id] = m ? m[1] : '?'; }
const code = '(()=>{const M=' + JSON.stringify(M) + ';const P=Entry.Scope.prototype;const o=P.run;window.__c={};window.__n=0;P.run=function(...a){window.__n++;let e=this.executor;let k="main";if(e&&e.isFuncExecutor){const fs=Entry.variableContainer.functions_;for(const id in fs){if(fs[id].content===e.code){k=M[id]||id;break;}}}window.__c[k]=(window.__c[k]||0)+1;return o.apply(this,a)};return 1})()';
const pre = more.WALK ? [['hold', [87, more.WALK]]] : [];
const steps = [['wait', 3000], ['set', ['showFps', 1]], ...pre, ['wait', 2500], ['vars', ['fps', 'nFill', 'nRoomDraw']], ['shot', 'perf_' + st], ['eval', code], ['wait', 1000], ['eval', '[window.__n, Object.entries(window.__c).sort((a,b)=>b[1]-a[1]).slice(0,14)]'], ['vars', ['fps']]];
fs.writeFileSync('test/steps.json', JSON.stringify(steps));
console.log(cp.execSync("node erun.mjs test/perf.ent @test/steps.json", { encoding: "utf8" }));

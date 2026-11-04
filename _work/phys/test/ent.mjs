// Each scene in the real (plain) Entry engine: frame time, what it measures, a picture.
//   node test/ent.mjs scene mode seconds
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const [scene, mode, secs] = process.argv.slice(2).map(Number);
const ent = path.join(HERE, '..', `t${scene}_${mode}.ent`);
cp.execSync(`node build.mjs "${ent}" START=${scene} MODE0=${mode}`, { cwd: path.join(HERE, '..'), stdio: 'ignore' });
const steps = [["wait", secs * 1000], ["vars", ["frameN", "simT", "fShown", "stepsTick", "tps", "eTot", "mE0", "mText"]], ["shot", `e${scene}_${mode}`]];
console.log(cp.execFileSync('node', ['erun.mjs', ent, JSON.stringify(steps)], { cwd: path.join(HERE, '..'), encoding: 'utf8', timeout: secs * 1000 + 120000 }).split('\n').filter(l => l.includes('{')).join('\n'));
fs.rmSync(ent, { force: true });

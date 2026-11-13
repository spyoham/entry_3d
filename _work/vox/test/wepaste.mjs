// (v2.9) //paste puts every cell of the clipboard: node test/wepaste.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const KEY = s.peek('ITKEY');
const say = (c) => { call(() => fn.chatRun(c)); return String(s.peek('CHT').slice(-1)[0]); };
const raw = (x, y, z) => call(() => fn.blockAt(x, y, z));
s.poke('gameMode', 1); s.poke('flying', 1);
const X = Math.floor(s.peek('px')), Z = Math.floor(s.peek('pz')), Y = 80;
const stand = (x, y, z) => { s.poke('px', x + 0.5); s.poke('py', y); s.poke('pz', z + 0.5); s.poke('pvx', 0); s.poke('pvy', 0); s.poke('pvz', 0); };
// a source: every 3rd cell some block of the list (ice by a light may melt while waiting: let be)
const NB = s.peek('NBLOCK');
call(() => fn.runCommand(`/fill ${X - 2} ${Y} ${Z - 2} ${X + 12} ${Y + 8} ${Z + 12} air`));
F(2);
let id = 1;
for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) for (let y = 0; y < 6; y++) { const b = 1 + ((x * 61 + z * 17 + y * 7) % 60); call(() => fn.boxPut(X + x, Y + y, Z + z, b)); }
F(3);
const src = []; for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) for (let y = 0; y < 6; y++) src.push(raw(X + x, Y + y, Z + z));
stand(X, Y, Z); say('//pos1'); stand(X + 9, Y + 5, Z + 9); say('//pos2');
stand(X, Y, Z); let r = say('//copy'); console.log(r);
for (const [ox, oz] of [[0, 30], [60, 0], [0, 75], [120, 0]]) {
  stand(X + ox, Y, Z + oz); r = say('//paste');
  // (then go there: the chunks not made yet get it when they are)
  let w = 0; while (w < 3000 && !(call(() => fn.cOK(X + ox, Z + oz)) && call(() => fn.cOK(X + ox + 9, Z + oz + 9)))) { F(1); w++; } F(5);
  let bad = 0, i = 0, ex = [];
  for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) for (let y = 0; y < 6; y++) { const b = raw(X + ox + x, Y + y, Z + oz + z); if (b !== src[i] && !(KEY[src[i]] === 'ice' && KEY[b] === 'water')) { bad++; if (ex.length < 4) ex.push(`${x},${y},${z}: ${KEY[src[i]]} -> ${KEY[b]}`); } i++; }
  ok(bad === 0, `paste at +${ox},+${oz}: ${bad} wrong ${ex.join(' ; ')} (${r})`);
}
// undo the last one: the cells known before go back
r = say('//undo'); ok(r.includes('되돌렸'), '//undo: ' + r);
console.log(fails ? fails + ' FAILED' : 'all ok');

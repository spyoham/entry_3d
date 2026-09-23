import { createSim } from './sim.mjs';
const S = createSim({}); const { R } = S; const f = (n) => R.peek(n);
f('initLists')();
const toks = process.argv[2].split(',').map(Number); for (const [pos, tok] of toks.map((t, i) => [i, t])) {
  R.poke('curPos', pos); f('embed')(tok); f('ropeTable')(pos);
  for (let l = 0; l < 30; l++) { f('layerStep')(l); if (pos === toks.length - 1 && [0, 1, 2, 5, 10, 20, 28].includes(l)) console.log('L' + l, JSON.stringify(R.peek('X').slice(0, 6).map(v => +v.toFixed(4)))); }
  R.poke('curPos', pos + 1);
}
f('lmHead')();
console.log('logits', JSON.stringify(R.peek('TOPI').slice(0, 8)), JSON.stringify(R.peek('TOPV').slice(0, 8).map(v => +v.toFixed(3))));

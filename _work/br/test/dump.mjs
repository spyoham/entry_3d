import * as B from '../build.mjs';
import fs from 'node:fs';
const d = B.buildData();
const { src } = B.sources(B.consts, d);
fs.writeFileSync('test/src_dump.js', src);
const L = src.split('\n'); const n = Number(process.argv[2]);
console.log(L.slice(n - 4, n + 2).map((l, i) => (n - 3 + i) + ': ' + l.slice(0, 200)).join('\n'));

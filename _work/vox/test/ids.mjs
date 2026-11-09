// every I_ / M_ / U_ / P_ / N_ name in the sources that the build does not define
import fs from 'node:fs';
const b = await import('../build.mjs');
const C = b.allConsts({});
const miss = new Set();
for (const f of fs.readdirSync('src')) {
  const s = fs.readFileSync('src/' + f, 'utf8');
  for (const m of s.matchAll(/\b([IMUPN]_[A-Za-z0-9_]+)\b/g)) if (!(m[1] in C) && !/^M_[a-z]/.test(m[1]) && !/^M_[A-Z][a-z]/.test(m[1])) miss.add(f + ':' + m[1]);
}
console.log([...miss].join('\n') || 'all defined');

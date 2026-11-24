// Round trips through the Node simulator: every sentence must come back the
// same from its code alone, and the bits must match what the model promises.
//   node test/round.mjs [how many held-out sentences]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createSim } from '../sim.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const sim = createSim();
const many = Number(process.argv[2] || 300);

const cases = [
    'Hello, my name is Tom.', 'I love you.', 'a', 'A', '!', ' ', 'hi', 'Hi', 'HELLO WORLD', 'HELLO, HOW ARE YOU?',
    'The quick brown fox jumps over the lazy dog.', 'Compression is intelligence.',
    'asdfghjkl qwertyuiop zxcvbnm', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', '?!?!,,..  ..  !!', 'iPhone and eBay and NASA is OK. ok',
    'To be, or not to be, that is the question.', 'Infinity', 'NaN', '   leading and trailing   ',
    'Once upon a time, there was a little girl named Lily. She loved to play outside in the sunshine.',
];
// lengths around the 255 mark of the header, and a long one
const long = fs.readFileSync(path.join(HERE, '..', 'data', 'fwe_valid.txt'), 'latin1');
for (const L of [254, 255, 256, 257, 511, 512, 2000]) cases.push(long.slice(1000, 1000 + L));
for (const nm of ['tiny_valid.txt', 'fwe_valid.txt']) {
    const t = fs.readFileSync(path.join(HERE, '..', 'data', nm), 'latin1');
    // sentences from all over the file
    const step = Math.floor(t.length / many);
    for (let i = 0; i < many; i++) { const a = t.indexOf('. ', i * step) + 2; const b = t.indexOf('. ', a + 20) + 1; if (b > a && b - a < 400) cases.push(t.slice(a, b)); }
}
const samples = fs.readFileSync(path.join(HERE, '..', 'data', 'samples.txt'), 'latin1').match(/[^.?!]+[.?!]+/g).map(s => s.trim());
cases.push(...samples);

let fail = 0, bits = 0, chars = 0, sb = 0, sc = 0;
const t0 = Date.now();
for (const c of cases) {
    const r = sim.compress(c);
    const back = sim.restore(r.code);
    if (back !== c) { fail++; console.log('FAIL', JSON.stringify(c.slice(0, 80)), '->', JSON.stringify(String(back).slice(0, 80))); }
    if (r.code.length !== Math.ceil(r.bits / 6)) { fail++; console.log('FAIL code length', c.slice(0, 40), r.bits, r.code.length); }
    bits += r.bits; chars += c.length;
    if (samples.includes(c)) { sb += r.bits; sc += c.length; }
}
console.log(`${cases.length} sentences, ${fail} failures, ${chars} letters -> ${bits} bits = ${(bits / chars).toFixed(3)} bits a letter (${(100 * bits / chars / 8).toFixed(1)}%), ${Date.now() - t0} ms`);
console.log(`everyday sentences one at a time: ${(sb / sc).toFixed(3)} bits a letter`);
for (const c of ['Hello, my name is Tom.', 'HELLO WORLD', 'asdfghjkl qwertyuiop zxcvbnm', 'The quick brown fox jumps over the lazy dog.']) { const r = sim.compress(c); console.log(JSON.stringify(c), c.length * 8, '->', r.bits, 'bits', r.code, r.words); }
process.exit(fail ? 1 : 0);

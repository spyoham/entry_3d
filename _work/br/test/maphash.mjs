// hash of every list the build makes (the island's included): the map refactor must leave map 1 as it was
import crypto from 'node:crypto';
import { buildData } from '../build.mjs';
const d = buildData();
const full = d.full;
const out = {};
for (const k of Object.keys(full).sort()) out[k] = crypto.createHash('md5').update(JSON.stringify(full[k])).digest('hex').slice(0, 10);
console.log(JSON.stringify(out));

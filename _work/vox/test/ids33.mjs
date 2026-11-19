// (v3.3) every block and item of v3.2 keeps its id (test/ids32.json: taken from the v3.2 commit)
import { ITEMS, BLOCKS } from '../blocks.mjs';
import fs from 'fs';
const base = JSON.parse(fs.readFileSync(new URL('./ids32.json', import.meta.url)));
let bad = 0;
const items = {}, blocks = {};
for (const i of ITEMS) { if (items[i.n] !== undefined) { console.log('item twice', i.n); bad++; } items[i.n] = i.id; }
BLOCKS.forEach((b, id) => { if (b) blocks[b.n] = id; });
for (const n in base.items) if (items[n] !== base.items[n]) { console.log('item moved', n, base.items[n], '->', items[n]); bad++; }
for (const n in base.blocks) if (blocks[n] !== base.blocks[n]) { console.log('block moved', n, base.blocks[n], '->', blocks[n]); bad++; }
const ids = new Set(); for (const i of ITEMS) { if (ids.has(i.id)) { console.log('item id twice', i.id, i.n); bad++; } ids.add(i.id); }
const fresh = ITEMS.filter((i) => base.items[i.n] === undefined).map((i) => `${i.id}:${i.n}`);
console.log('new items:', fresh.join(' ') || '-');
console.log(bad ? `FAIL ${bad}` : 'ok ids33');
process.exit(bad ? 1 : 0);

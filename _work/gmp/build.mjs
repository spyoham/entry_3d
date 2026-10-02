// Build "엔트리 GMP": the library + the demo program -> .ent
// usage: node build.mjs [out.ent]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { libSources } from './lib.mjs';
import { buildEnt } from './entbuild.mjs';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const VERSION = '1.0';
const out = process.argv[2] || path.join(HERE, 'gmp.ent');
const rd = (f) => fs.readFileSync(path.join(HERE, 'src', f), 'utf8');
const prog = buildEnt(out, libSources([rd('demo_calc.js'), rd('demo_ui.js')]), {
    name: `엔트리 GMP v${VERSION}`,
    hot: ['S', 'M', 'zP', 'zN', 'zA', 'PB'],
    mainXY: [-200, -128],
    objects: [{
        id: 'screen', name: 'screen', more: {
            objectType: 'textBox', text: '엔트리 GMP',
            entity: { x: -119, y: 64, colour: '#1d2433', bgColor: '#f4f6fb', font: '13px Nanum Gothic Coding', textAlign: 1, lineBreak: true,
                bold: false, underLine: false, strike: false, italic: false, fontSize: 13, width: 234, height: 136, visible: true },
        },
    }],
    lists: {
        RES: { name: '결과', x: 4, y: -132, width: 232, height: 264 },
        LOG: { name: '기록', x: -236, y: 6, width: 234, height: 62 },
    },
});
console.log('wrote', out, fs.statSync(out).size, 'bytes', JSON.stringify(prog.stats));

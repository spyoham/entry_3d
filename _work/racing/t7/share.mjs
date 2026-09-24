// share code round trip in the node sim
import { createSim } from '../sim.mjs';
const s = createSim({ fps: 10 });
const g = (e) => s.peek(e);
for (let i = 0; i < 4; i++) s.frame();
g('edReset()');
// make it interesting: flags and heights on some nodes
g('ctlF[ctlOff[EDTRK-1]+2-1] = 1; ctlF[ctlOff[EDTRK-1]+5-1] = 2+16; ctlF[ctlOff[EDTRK-1]+9-1] = 4; ctlY[ctlOff[EDTRK-1]+3-1] = 21.3; ctlW[ctlOff[EDTRK-1]+7-1] = 14.2;');
const before = () => { const b = g('ctlOff')[8], n = g('ctlCnt')[8]; const L = ['ctlX','ctlY','ctlZ','ctlW','ctlF'].map(k => g(k).slice(b, b + n)); return { n, L }; };
const A = before();
g('shEncode()');
const code = g('shCode');
console.log('code', code.length, code, 'lines', g('shLines'), g('shLn').slice(0, 4));
g('edReset(); ctlCnt[EDTRK-1] = 6;');
// type it with spaces, lower case and an O for 0 to test the forgiving parser
const typed = code.replace(/0/g, 'o').toLowerCase().replace(/(.{5})/g, '$1 ');
g(`shDecode(${JSON.stringify(typed)})`);
console.log('ok', g('oShOk'));
const B = before();
let maxErr = [0, 0, 0, 0, 0];
for (let k = 0; k < 5; k++) for (let i = 0; i < A.n; i++) maxErr[k] = Math.max(maxErr[k], Math.abs(A.L[k][i] - B.L[k][i]));
console.log('n', A.n, B.n, 'max error x,y,z,w,f', maxErr.map(v => v.toFixed(2)).join(' '));
g(`shDecode(${JSON.stringify(code.slice(0, -1) + (code.slice(-1) === '1' ? '2' : '1'))})`);
console.log('bad checksum rejected:', g('oShOk') == 0);
g(`shDecode("hello")`); console.log('rubbish rejected:', g('oShOk') == 0);

// menu tour: a shot of every main-menu card, the car showroom and the circuit screen
import fs from 'node:fs';
const pre = process.argv[2] || 'shots/t';
const K = { Down: 40, Up: 38, Right: 39, Left: 37, Enter: 13, Escape: 27 };
const st = [{ wait: 2500 }];
const press = (c) => { st.push({ down: { code: c, key: c, keyCode: K[c] } }, { wait: 60 }, { up: { code: c, key: c, keyCode: K[c] } }, { wait: 60 }); };
st.push({ wait: 500, shot: `${pre}_m1.png` });
for (let i = 2; i <= 9; i++) { press('Down'); st.push({ wait: 700, shot: `${pre}_m${i}.png` }); }
press('Down'); press('Down'); press('Down');    // -> row 3 CAR
press('Enter'); st.push({ wait: 1200, shot: `${pre}_car1.png` });
press('Right'); st.push({ wait: 1500, shot: `${pre}_car2.png` });
press('Escape'); press('Down'); press('Enter'); st.push({ wait: 1500, shot: `${pre}_trk1.png` });
press('Right'); st.push({ wait: 2500, shot: `${pre}_trk2.png` });
press('Escape'); st.push({ wait: 600, fps: 'menu' });
fs.writeFileSync(pre.replace(/[^/]*$/, '') + 'tour.json', JSON.stringify(st));

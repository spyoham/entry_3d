// Walk the player's body (player.js bodyMove / world.js scanBoxes, copied) up and down every flight
// of stairs of the prefabs, alone on flat ground, at several frame times. Prints where a walk stalls.
// usage: node test/stairsim.mjs [fix]   (fix: the bodyMove with the step down)
import { byName } from '../prefabs.mjs';
const PRAD = 32, PH = 178, PHC = 125, STEP = 48, GRAV = 1900;
const FIX = process.argv.includes('fix'), HRAD = 14, HEAD = process.argv.includes('head');
let hitB = 0, gndB = 0, boxes = [];
function scanBoxes(x, y, z, rad, hh, step) {
  hitB = 0; gndB = 0;
  for (const b of boxes) {
    if (x > b[0] - rad && x < b[3] + rad && z > b[2] - rad && z < b[5] + rad) {
      const top = b[4];
      if (top <= y + step) { if (top > gndB) gndB = top; }
      else if (b[1] < y + hh) {
        // (the fix: a box over the knees is hit by the head only, narrower than the body)
        if (HEAD && b[1] > y + 100) { if (x > b[0] - HRAD && x < b[3] + HRAD && z > b[2] - HRAD && z < b[5] + HRAD) hitB = 1; }
        else hitB = 1;
      }
    }
  }
}
const P = { x: 0, y: 0, z: 0, vy: 0, gr: 1 };
function bodyMove(mx, mz, dt, crouch) {
  // (the fix: no more than 16 cm a piece)
  if (FIX) { const n = Math.ceil(Math.sqrt(mx * mx + mz * mz) / 16); if (n > 1) { for (let i = 0; i < n; i++) bodyMove1(mx / n, mz / n, dt / n, crouch); return; } }
  bodyMove1(mx, mz, dt, crouch);
}
function bodyMove1(mx, mz, dt, crouch) {
  const hh = crouch ? PHC : PH;
  const nx = P.x + mx, nz = P.z + mz;
  scanBoxes(nx, P.y, nz, PRAD, hh, STEP);
  if (hitB == 0) { P.x = nx; P.z = nz; }
  // (the fix: blocked, but the ground there is lower - down the stairs: there at that height)
  else if (FIX && P.gr == 1 && gndB < P.y - 2 && gndB > P.y - STEP - 12 && (scanBoxes(nx, gndB, nz, PRAD, hh, STEP), hitB == 0)) { P.x = nx; P.z = nz; P.y = gndB; }
  else {
    scanBoxes(nx, P.y, P.z, PRAD, hh, STEP);
    if (hitB == 0) P.x = nx;
    else { scanBoxes(P.x, P.y, nz, PRAD, hh, STEP); if (hitB == 0) P.z = nz; }
  }
  scanBoxes(P.x, P.y, P.z, PRAD, hh, STEP);
  let g = gndB;
  // (the fix: on the ground a frame ago and the ground now at most a step lower: stay on it)
  if (FIX) { if (P.gr == 1 && P.vy <= 0 && P.y > g + 2 && P.y - g <= STEP + 2) { P.y = g; } }
  if (P.y > g + 2) {
    P.gr = 0;
    P.vy = P.vy - GRAV * dt;
    let ny = P.y + P.vy * dt;
    if (P.vy > 0) { scanBoxes(P.x, ny, P.z, PRAD, hh, 0); if (hitB == 1) { P.vy = 0; ny = P.y; } }
    if (ny <= g) { ny = g; P.vy = 0; P.gr = 1; }
    P.y = ny;
  } else { P.y = g; P.gr = 1; if (P.vy < 0) P.vy = 0; }
}
// one walk: from (x, z) at the height y, toward (ux, uz) for T seconds
function walk(x, y, z, ux, uz, dt, sp, T, crouch) {
  P.x = x; P.z = z; P.y = y; P.vy = 0; P.gr = 1;
  scanBoxes(x, y + 5, z, PRAD, PH, STEP); P.y = gndB;
  let t = 0, stall = 0, lastS = 0;
  while (t < T) { bodyMove(ux * sp * dt, uz * sp * dt, dt, crouch); t += dt; }
  return { x: P.x, y: P.y, z: P.z };
}
const flights = [
  // prefab, x0, z0, x1, z1, y0, y1, dir
  ['houseM', 440, -380, 560, -100, 15, 315, '+z'],
  ['apart', -60, -100, 60, 180, 15, 315, '+z'], ['apart', -60, -100, 60, 180, 315, 615, '+z'], ['apart', -60, -100, 60, 180, 615, 915, '+z'],
  ['school', 900, -480, 1020, -200, 15, 315, '+z'], ['school', 900, -480, 1020, -200, 315, 615, '+z'],
  ['warehouse', -1180, 0, -1060, 380, 15, 335, '+z'],
  ['barn', -50, -480, 250, -360, 15, 315, '-x'],
  ['tower', 60, 640, 180, 940, 0, 360, '-z'],
];
let bad = 0;
for (const [pf, x0, z0, x1, z1, y0, y1, dir] of flights) {
  boxes = byName[pf].lods[0].boxes;
  const alongZ = dir[1] === 'z', sd = dir[0] === '+' ? 1 : -1;
  const s0 = alongZ ? (sd > 0 ? z0 : z1) : (sd > 0 ? x0 : x1), s1 = alongZ ? (sd > 0 ? z1 : z0) : (sd > 0 ? x1 : x0);
  const c0 = alongZ ? x0 : z0, c1 = alongZ ? x1 : z1;
  const pt = (s, c) => alongZ ? [c, s] : [s, c];
  const u = alongZ ? [0, sd] : [sd, 0];
  for (const cc of [(c0 + c1) / 2, c0 + 30, c1 - 30]) for (const dt of [1 / 60, 1 / 30, 1 / 15, 0.2]) for (const [sp, cr] of [[480, 0], [640, 0], [240, 1]]) {
    // down: from 70 beyond the top onto the flight, 3 s
    let [sx, sz] = pt(s1 + sd * 70, cc);
    const T = 3.2;
    let r = walk(sx, y1, sz, -u[0], -u[1], dt, sp, T, cr);
    let s = alongZ ? r.z : r.x;
    const downOk = (s - s0) * sd < -20 && r.y < y0 + 5; const rd = [Math.round(r.x), Math.round(r.y), Math.round(r.z)];
    [sx, sz] = pt(s0 - sd * 70, cc);
    r = walk(sx, y0, sz, u[0], u[1], dt, sp, T, cr);
    const r2 = r; s = alongZ ? r.z : r.x;
    const upOk = (s - s1) * sd > 20 && Math.abs(r.y - y1) < 5;
    if (!downOk || !upOk) { bad++; console.log(pf, y0 + '-' + y1, 'c', cc, 'dt', dt.toFixed(3), 'sp', sp, cr ? 'crouch' : '', downOk ? "" : "DOWN stuck at " + JSON.stringify(rd), upOk ? '' : 'UP stuck at ' + JSON.stringify([Math.round(r2.x), Math.round(r2.y), Math.round(r2.z)])); }
  }
}
console.log(bad ? bad + ' failed' : 'all ok');

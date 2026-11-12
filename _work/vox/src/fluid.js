// ===================================================================== flowing water and lava (v2.3.2)
// As the genre does it: a source (BLV 0) feeds flowing cells whose level (1..7) goes up a step a
// block (water 1, lava 2 - 1 in the ashen world) until 8 is reached; liquid that can fall does
// (a falling cell, BLV 8, which feeds the floor it lands on as a source would), else it spreads
// toward the nearest place it can fall within 4 blocks (lava 2), or every way when there is none.
// A flowing cell no longer fed goes back. Two water sources beside a cell with a floor make it one.
// Lava that touches water turns to obsidian (a source) or cobblestone; lava falling on water, stone.
// Cells are looked at when a block near them changes (setBlock -> fluidNotify) and then every
// 0.25 s (water) or 1.5 s (lava; 0.5 s in the ashen world) while they change. What flows is not
// written in the log of changes: the log's sources and holes make it flow again when the world
// is made again (save.js edReplay); the stone and obsidian it makes are written.
let FQX = [], FQY = [], FQZ = [], FQT = [], fqN = 0, fqTime = 0, lqLog = 1;
let FBX = [], FBZ = [], FBD = [], FBF = [];
const FQMAX = 8000;

function lqVar(q, lv) {
  let r = q;
  if (lv > 0) { if (q == 7) { r = I_waterFlow1 + lv - 1; } else { r = I_lavaFlow1 + lv - 1; } }
  return r;
}
function lqDelay(q) {
  let r = 0.25;
  if (q == 35) { r = 1.5; if (dim == 1) { r = 0.5; } }
  return r;
}
// a cell to look at later
function fluidAt(x, y, z, t) {
  if (y >= 0 && y < WY) {
    // (not twice: the last few in the queue)
    let k = fqN, dup = 0;
    while (k >= 1 && k > fqN - 8) { if (FQX[k] == x && FQY[k] == y && FQZ[k] == z) { dup = 1; } k = k - 1; }
    if (dup == 0 && fqN < FQMAX) {
      fqN = fqN + 1;
      if (fqN > FQX.length) { FQX.push(x); FQY.push(y); FQZ.push(z); FQT.push(fqTime + t); }
      else { FQX[fqN] = x; FQY[fqN] = y; FQZ[fqN] = z; FQT[fqN] = fqTime + t; }
    }
  }
}
// a block changed at (x, y, z): it and its liquid neighbours are looked at
function fluidNotify(x, y, z) {
  M_fn(x, y, z); M_fn(x + 1, y, z); M_fn(x - 1, y, z); M_fn(x, y + 1, z); M_fn(x, y - 1, z); M_fn(x, y, z + 1); M_fn(x, y, z - 1);
}
function M_fn(X, Y, Z) {
  let fb = blockAt(X, Y, Z);
  // ((v2.7) lava that water came by turns at once, as the genre: it waited its 1.5 s)
  if (BLQ[fb + 1] > 0) { let dl = lqDelay(BLQ[fb + 1]); if (BLQ[fb + 1] == 35) { if (lavaWet(X, Y, Z) == 1) { dl = 0; } } fluidAt(X, Y, Z, dl); }
}
function lavaWet(x, y, z) {
  let r = 0;
  if (BLQ[blockAt(x + 1, y, z) + 1] == 7 || BLQ[blockAt(x - 1, y, z) + 1] == 7 || BLQ[blockAt(x, y, z + 1) + 1] == 7 || BLQ[blockAt(x, y, z - 1) + 1] == 7 || BLQ[blockAt(x, y + 1, z) + 1] == 7) { r = 1; }
  return r;
}
// a cell of a chunk being made again from the log (save.js edReplay): blockAt says nothing there
// yet, so the window is read itself for that chunk's cells (a neighbour in another chunk: blockAt)
function fluidReplay(x, y, z) {
  M_fr(x, y, z, x, z); M_fr(x + 1, y, z, x, z); M_fr(x - 1, y, z, x, z); M_fr(x, y + 1, z, x, z); M_fr(x, y - 1, z, x, z); M_fr(x, y, z + 1, x, z); M_fr(x, y, z - 1, x, z);
}
function M_fr(X, Y, Z, CX, CZ) {
  if (Y >= 0 && Y < WY) {
    let rb = 0;
    if (idiv(X, 16) == idiv(CX, 16) && idiv(Z, 16) == idiv(CZ, 16)) { rb = W[wi(X, Y, Z)]; } else { rb = blockAt(X, Y, Z); }
    if (BLQ[rb + 1] > 0) { fluidAt(X, Y, Z, 0.5); }
  }
}
// can liquid q run into a cell holding b (air, a flowing one of its own higher than lv, a plant, a torch, fire)
function lqInto(b, q, lv) {
  let r = 0;
  if (b == 0) { r = 1; }
  if (BLQ[b + 1] == q) { if (BLV[b + 1] != 0 && BLV[b + 1] != 8 && BLV[b + 1] > lv) { r = 1; } }
  if (BLQ[b + 1] == 0 && b != 0) { if ((BSHP[b + 1] == 1 || BSHP[b + 1] == 2) && BWATER[b + 1] == 0 && b != I_reed) { r = 1; } if (BSPEC[b + 1] == 10 || b == I_snowLayer) { r = 1; } if (mod(idiv(BJE[b + 1], 4), 2) == 1) { r = 1; } }
  return r;
}
// can it fall from here (into the cell below)
function lqHole(x, y, z, q) {
  let b = blockAt(x, y - 1, z), r = 0;
  if (y > 0) { if (lqInto(b, q, 0) == 1 || (BLQ[b + 1] == q && BLV[b + 1] != 0)) { r = 1; } }
  return r;
}
// put liquid (or what it made) at a cell: a plant or a torch is washed out (and drops)
function lqPut(x, y, z, b, logged) {
  let o = blockAt(x, y, z);
  // ((v2.7) lava burns what it takes: nothing drops)
  if (BLQ[o + 1] == 0 && o != 0) { if (worldDrops() == 1 && BLQ[b + 1] != 35) { blockDrops(o, x, y, z); } }
  lqLog = logged;
  setBlock(x, y, z, b);
  lqLog = 1;
}
// the ways to spread from (x, y, z): toward the nearest place it can fall within reach (FBF 1..4
// a way: +x -x +z -z), every open way when there is none (lqWays)
let lqWays = 0;
function lqDirs(x, y, z, q, lv) {
  let reach = 4;
  if (q == 35 && dim != 1) { reach = 2; }
  FBX = []; FBZ = []; FBD = []; FBF = [];
  let d = 1, best = 99;
  lqWays = 0;
  while (d <= 4) {
    let dx = 0, dz = 0;
    if (d == 1) { dx = 1; } if (d == 2) { dx = 0 - 1; } if (d == 3) { dz = 1; } if (d == 4) { dz = 0 - 1; }
    // (its own flowing water is a way through for the search, though it does not flow into it)
    let sb = blockAt(x + dx, y, z + dz);
    if (lqInto(sb, q, lv) == 1 || (BLQ[sb + 1] == q && BLV[sb + 1] != 0)) { FBX.push(x + dx); FBZ.push(z + dz); FBD.push(1); FBF.push(d); }
    d = d + 1;
  }
  // (a breadth-first walk over the cells it could flow through)
  let i = 1;
  while (i <= FBX.length) {
    let cx = FBX[i], cz = FBZ[i], cd = FBD[i];
    if (lqHole(cx, y, cz, q) == 1) { if (cd < best) { best = cd; } }
    if (cd < reach && cd < best) {
      let e = 1;
      while (e <= 4) {
        let ex = cx, ez = cz;
        if (e == 1) { ex = cx + 1; } if (e == 2) { ex = cx - 1; } if (e == 3) { ez = cz + 1; } if (e == 4) { ez = cz - 1; }
        if (ex != x || ez != z) {
          let seen = 0, j = 1;
          while (j <= FBX.length) { if (FBX[j] == ex && FBZ[j] == ez) { seen = 1; } j = j + 1; }
          if (seen == 0) { if (lqInto(blockAt(ex, y, ez), q, 7) == 1 || BLQ[blockAt(ex, y, ez) + 1] == q) { FBX.push(ex); FBZ.push(ez); FBD.push(cd + 1); FBF.push(FBF[i]); } }
        }
        e = e + 1;
      }
    }
    i = i + 1;
  }
  // the first-step ways that lead to the nearest hole (1 bit a way in lqWays)
  if (best < 99) {
    i = 1;
    while (i <= FBX.length) {
      if (FBD[i] == best) { if (lqHole(FBX[i], y, FBZ[i], q) == 1) { let f = FBF[i], bit = 1; if (f == 2) { bit = 2; } if (f == 3) { bit = 4; } if (f == 4) { bit = 8; } if (mod(idiv(lqWays, bit), 2) == 0) { lqWays = lqWays + bit; } } }
      i = i + 1;
    }
  } else { lqWays = 15; }
}
// one cell's turn
function fluidTick(x, y, z) {
  if (cOK(x, z) == 1) {
    let b = blockAt(x, y, z), q = BLQ[b + 1];
    if (q > 0) {
      let lv = BLV[b + 1], step = 1;
      if (q == 35 && dim != 1) { step = 2; }
      // lava by water: stone of a kind
      if (q == 35) {
        let w = 0;
        if (BLQ[blockAt(x + 1, y, z) + 1] == 7 || BLQ[blockAt(x - 1, y, z) + 1] == 7 || BLQ[blockAt(x, y, z + 1) + 1] == 7 || BLQ[blockAt(x, y, z - 1) + 1] == 7 || BLQ[blockAt(x, y + 1, z) + 1] == 7) { w = 1; }
        if (w == 1) { if (lv == 0) { lqPut(x, y, z, 34, 1); } else { lqPut(x, y, z, 4, 1); } sndPlay(5); q = 0; }
        // ((v2.7) over soul soil by blue ice: basalt)
        else { if (blockAt(x, y - 1, z) == I_wailSoil) { if (blockAt(x + 1, y, z) == I_blueIce || blockAt(x - 1, y, z) == I_blueIce || blockAt(x, y, z + 1) == I_blueIce || blockAt(x, y, z - 1) == I_blueIce || blockAt(x, y + 1, z) == I_blueIce) { lqPut(x, y, z, 53, 1); sndPlay(5); q = 0; } } }
      }
      // a flowing cell: its level from what feeds it
      if (q > 0 && lv != 0) {
        let nl = 99, above = blockAt(x, y + 1, z), fall = 0;
        if (BLQ[above + 1] == q) { nl = 8; fall = 1; }
        else {
          let best = 99, src = 0, d = 1;
          while (d <= 4) {
            let nx = x, nz = z;
            if (d == 1) { nx = x + 1; } if (d == 2) { nx = x - 1; } if (d == 3) { nz = z + 1; } if (d == 4) { nz = z - 1; }
            let nb = blockAt(nx, y, nz);
            if (BLQ[nb + 1] == q) {
              let l = BLV[nb + 1];
              if (l == 0) { src = src + 1; }
              // (a falling cell feeds sideways only from its floor: it counts as a source when it stands on something)
              if (l == 8) { if (lqHole(nx, y, nz, q) == 1) { l = 99; } else { l = 0; } }
              if (l < best) { best = l; }
            }
            d = d + 1;
          }
          if (best < 99) { nl = best + step; }
          if (q == 7 && src >= 2) { let bl = blockAt(x, y - 1, z); if (BSOL[bl + 1] > 0 || (BLQ[bl + 1] == 7 && BLV[bl + 1] == 0)) { nl = 0; } }
        }
        if (fall == 0 && nl >= 8) { lqPut(x, y, z, 0, 0); q = 0; }
        else { if (nl != lv) { lqPut(x, y, z, lqVar(q, nl), 0); lv = nl; } }
      }
      // spreading
      if (q > 0) {
        let below = blockAt(x, y - 1, z);
        if (y > 0 && BLQ[below + 1] != q && BLQ[below + 1] > 0) {
          // onto the other liquid
          if (q == 35) { lqPut(x, y - 1, z, 1, 1); sndPlay(5); }
          else { if (BLV[below + 1] == 0) { lqPut(x, y - 1, z, 34, 1); } else { lqPut(x, y - 1, z, 4, 1); } sndPlay(5); }
        } else {
          if (y > 0 && lqInto(below, q, 0) == 1) { lqPut(x, y - 1, z, lqVar(q, 8), 0); }
          else {
            // (over its own liquid it does not spread; on a floor it does, a falling one as a source)
            if (BLQ[below + 1] != q) {
              let base = lv;
              if (lv == 8) { base = 0; }
              let nl2 = base + step;
              if (nl2 < 8) {
                lqDirs(x, y, z, q, nl2);
                let d = 1;
                while (d <= 4) {
                  let bit = 1; if (d == 2) { bit = 2; } if (d == 3) { bit = 4; } if (d == 4) { bit = 8; }
                  if (mod(idiv(lqWays, bit), 2) == 1) {
                    let nx = x, nz = z;
                    if (d == 1) { nx = x + 1; } if (d == 2) { nx = x - 1; } if (d == 3) { nz = z + 1; } if (d == 4) { nz = z - 1; }
                    let t = blockAt(nx, y, nz);
                    if (cOK(nx, nz) == 1) { if (lqInto(t, q, nl2) == 1) { lqPut(nx, y, nz, lqVar(q, nl2), 0); } }
                  }
                  d = d + 1;
                }
              }
            }
          }
        }
      }
    }
  }
}
// each frame: the cells whose time has come (at most n)
function fluidStep(dt) {
  fqTime = fqTime + dt;
  let i = 1, n = 400, top = fqN, w = 0;
  // (those due are taken out first: a tick puts new ones at the end)
  FTX = []; FTY = []; FTZ = [];
  while (i <= top) {
    if (FQT[i] <= fqTime && FTX.length < n) { FTX.push(FQX[i]); FTY.push(FQY[i]); FTZ.push(FQZ[i]); }
    else { w = w + 1; FQX[w] = FQX[i]; FQY[w] = FQY[i]; FQZ[w] = FQZ[i]; FQT[w] = FQT[i]; }
    i = i + 1;
  }
  // (what came while taking them out stays after them)
  i = top + 1;
  while (i <= fqN) { w = w + 1; FQX[w] = FQX[i]; FQY[w] = FQY[i]; FQZ[w] = FQZ[i]; FQT[w] = FQT[i]; i = i + 1; }
  fqN = w;
  i = 1;
  while (i <= FTX.length) { fluidTick(FTX[i], FTY[i], FTZ[i]); i = i + 1; }
}
let FTX = [], FTY = [], FTZ = [];
function fluidInit() { fqN = 0; }
// the way water runs at (x, y, z) (flX, flZ; 0 0 in still water): toward the cells that are lower
let flX = 0, flZ = 0;
function flowAt(x, y, z) {
  flX = 0; flZ = 0;
  let b = blockAt(x, y, z), q = BLQ[b + 1];
  if (q > 0) {
    let lv = BLV[b + 1];
    if (lv == 8) { lv = 0; }
    let d = 1;
    while (d <= 4) {
      let dx = 0, dz = 0;
      if (d == 1) { dx = 1; } if (d == 2) { dx = 0 - 1; } if (d == 3) { dz = 1; } if (d == 4) { dz = 0 - 1; }
      let nb = blockAt(x + dx, y, z + dz), diff = 0;
      if (BLQ[nb + 1] == q) { let l = BLV[nb + 1]; if (l == 8) { l = 0; } diff = l - lv; }
      else { if (lqInto(nb, q, 0) == 1) { if (lqHole(x + dx, y, z + dz, q) == 1) { diff = 4; } else { diff = 1; } } }
      if (BLV[b + 1] == 0 && diff < 0) { diff = 0; }
      flX = flX + dx * diff; flZ = flZ + dz * diff;
      d = d + 1;
    }
    let l = Math.sqrt(flX * flX + flZ * flZ);
    if (l > 0.001) { flX = flX / l; flZ = flZ / l; }
    if (BLV[b + 1] == 0) { flX = 0; flZ = 0; }
  }
}

// ---------------------------------------------------------------- springs and lava lakes (world making)
// A spring is a source set in a wall (solid on all sides but one, and above) that runs out once
// its chunk is made: water in the caves, lava deep down and in the ashen world. Now and then a
// lava lake lies on the land. (Made again with the chunk; what flows from them is not logged.)
let spOpen = 0, spRock = 0;
function springs(rock, tries, liq, y0, y1) {
  let k = 0;
  while (k < tries) {
    let x = gx0 + rndI(1, 14), z = gz0 + rndI(1, 14), y = rndI(y0, y1), i = wi(x, y, z);
    if (W[i] == rock && BSOL[W[i + 1] + 1] == 1) {
      spOpen = 0; spRock = 0;
      M_sp(i + SXS); M_sp(i - SXS); M_sp(i + WY); M_sp(i - WY); M_sp(i - 1);
      if (spOpen == 1 && spRock == 4) { W[i] = liq; fluidAt(x, y, z, 2 + rnd()); }
    }
    k = k + 1;
  }
}
function M_sp(I) {
  let sb = W[I];
  if (sb == 0) { spOpen = spOpen + 1; } else { if (BSOL[sb + 1] == 1) { spRock = spRock + 1; } }
}
function lavaLake(x0, z0) {
  findTop(x0, z0);
  let s = topY, tb = W[wi(x0, s, z0)];
  if (s > SEA + 1 && s < WY - 8 && BLQ[tb + 1] == 0 && tb != 8) {
    let r = rndI(2, 4), dx = 0 - r - 1;
    while (dx <= r + 1) {
      let dz = 0 - r - 1;
      while (dz <= r + 1) {
        let x = x0 + dx, z = z0 + dz, d = dx * dx + dz * dz, y = 0;
        if (d <= r * r + 1) {
          // lava two deep under the land's top, air over it, stone under it
          y = s - 2; while (y <= s - 1) { W[wi(x, y, z)] = 35; y = y + 1; }
          y = s; while (y <= s + 4) { W[wi(x, y, z)] = 0; y = y + 1; }
          if (BSOL[W[wi(x, s - 3, z)] + 1] != 1) { W[wi(x, s - 3, z)] = 1; }
        } else {
          if (d <= (r + 1) * (r + 1) + 1) {
            // the rim: what is not solid by the lava turns to stone
            y = s - 3; while (y <= s - 1) { if (BSOL[W[wi(x, y, z)] + 1] != 1) { W[wi(x, y, z)] = 1; } y = y + 1; }
          }
        }
        dz = dz + 1;
      }
      dx = dx + 1;
    }
  }
}

// ===================================================================== (v3.3) what grows: stems and their fruit, cocoa, the depths' wart, berries, vines; the cauldron
// All of it by random ticks (je.js: randomTick calls plantTick for the blocks plTicks names), by a
// click (blocks.js: useBlock -> plantUse, placeBlock -> plantPut, boneMeal -> plantMeal) and by a
// block changing (je.js: jeChanged -> plChanged). Nothing here looks over the world each frame.
// Ids (content.mjs, 66..95): I_melonStem + 0..3, I_pumpkinStem + 0..3 (crops of four stages: the
// crops' own tick grows them), I_cocoa + stage * 4 + side (stage 0..2; side 0..3 for the log at
// -x, +x, -z, +z: BATT), I_wartCrop + 0..3, I_berryBush_0..2 (the ripe bush is I_berryBush),
// I_cauldron_w1..3 (a cauldron with water: BKIND is still the cauldron).

function plTicks(b) {
  let r = 0;
  if (b == I_melonStem + 3 || b == I_pumpkinStem + 3) { r = 1; }
  if (b >= I_cocoa && b < I_cocoa + 8) { r = 1; }
  if (b >= I_wartCrop && b < I_wartCrop + 3) { r = 1; }
  if (b >= I_berryBush_0 && b <= I_berryBush_0 + 2) { r = 1; }
  if (b == I_vines || b == I_cauldron || b == I_cauldron_w1 || b == I_cauldron_w2) { r = 1; }
  return r;
}
// the logs cocoa grows on: the mahogany log, its wood and both stripped, any way they lie (12 ids)
function plIsMahog(b) { let r = 0; if (b >= I_mahoganyLog && b <= I_mahoganyLog + 11) { r = 1; } return r; }
// the crops' growth points of a cell: 1, and for the farmland under it 1 (wet 3), a quarter of it
// for the eight round that one
function plFarmF(x, y, z) {
  let f = 1, a = 0 - 1;
  while (a <= 1) {
    let c = 0 - 1;
    while (c <= 1) {
      let fb = blockAt(x + a, y - 1, z + c), g = 0;
      if (fb == I_farmland) { g = 1; } if (fb == I_farmlandWet) { g = 3; }
      if (a != 0 || c != 0) { g = g / 4; }
      f = f + g;
      c = c + 1;
    }
    a = a + 1;
  }
  return f;
}
// a ripe stem's fruit, as the genre's: one of the four sides by chance; onto air over dirt, grass,
// coarse dirt, podzol or farmland. A stem holds one fruit: while one of its kind lies beside it,
// it waits (the genre's stem turns to its fruit and waits for it to go; here the stem has no such
// look, so a fruit of a neighbour stem makes it wait too)
function stemFruit(x, y, z, b) {
  let fr = I_melon;
  if (b == I_pumpkinStem + 3) { fr = I_pumpkin; }
  if (blockAt(x + 1, y, z) != fr && blockAt(x - 1, y, z) != fr && blockAt(x, y, z + 1) != fr && blockAt(x, y, z - 1) != fr) {
    let d = rand(0, 3), ax = x + dirX(d), az = z + dirZ(d);
    if (cOK(ax, az) == 1) { if (blockAt(ax, y, az) == 0) {
      let u = blockAt(ax, y - 1, az);
      if (u == 2 || u == 3 || u == 20 || u == I_coarseDirt || u == I_podzol || u == I_farmland || u == I_farmlandWet) { setBlock(ax, y, az, fr); }
    } }
  }
}
// ---------------------------------------------------------------- vines
// a vine put as any block is (setBlock no longer takes a vine off when the cell under it turns to
// something not solid, so one grown down leaves the one over it; an observer sees it come)
function plPutQuiet(x, y, z, b) { setBlock(x, y, z, b); }
// a full block beside the cell (what a vine put there would hold on to)
function vineHold(x, y, z) {
  let r = 0, d = 0;
  while (d < 4) { let hb = blockAt(x + dirX(d), y, z + dirZ(d)); if (BSOL[hb + 1] == 1 && BSHP[hb + 1] == 0) { r = 1; } d = d + 1; }
  return r;
}
// the genre's cap: with five vines (this one too) in the 9 x 3 x 9 round it, none sideways or up
function vineCount(x, y, z) {
  let n = 0, a = x - 4;
  while (a <= x + 4 && n < 5) {
    let c = z - 4;
    while (c <= z + 4) {
      if (cOK(a, c) == 1) { let d = Math.max(0, y - 1); while (d <= y + 1 && d < WY) { if (blockAt(a, d, c) == I_vines) { n = n + 1; } d = d + 1; } }
      c = c + 1;
    }
    a = a + 1;
  }
  return n;
}
// one try of a vine to grow (a random tick in four): a way out of six. Sideways into air that has
// a full block beside it, up the same; a side the vine already holds on to, a way up that is shut
// and the way down all hang one more under it (one try in two), as long as the genre's.
function vineGrow(x, y, z) {
  let d = rand(0, 5), dn = 0;
  if (d < 4) {
    let ax = x + dirX(d), az = z + dirZ(d), nb = blockAt(ax, y, az);
    if (BSOL[nb + 1] == 1 && BSHP[nb + 1] == 0) { dn = 1; }
    else { if (nb == 0 && cOK(ax, az) == 1) { if (vineHold(ax, y, az) == 1) { if (vineCount(x, y, z) < 5) { plPutQuiet(ax, y, az, I_vines); } } } }
  }
  if (d == 4) {
    if (y + 1 >= WY) { dn = 1; }
    else {
      if (blockAt(x, y + 1, z) != 0) { dn = 1; }
      else { if (vineHold(x, y + 1, z) == 1) { if (vineCount(x, y, z) < 5) { plPutQuiet(x, y + 1, z, I_vines); } } }
    }
  }
  if (d == 5) { dn = 1; }
  if (dn == 1) { if (y > 1) { if (blockAt(x, y - 1, z) == 0) { if (rand(0, 1) == 0) { plPutQuiet(x, y - 1, z, I_vines); } } } }
}
// ---------------------------------------------------------------- random ticks
function plantTick(x, y, z, i, b) {
  // a ripe stem in the light of 9: the genre's chance, 1 / (25 / f + 1)
  if (b == I_melonStem + 3 || b == I_pumpkinStem + 3) {
    if (lightRaw(i) >= 9) { if (rand(0, Math.floor(25 / plFarmF(x, y, z))) == 0) { stemFruit(x, y, z, b); } }
  }
  // cocoa: 1 in 5 a size more; the wart: 1 in 10 (no light, no water)
  if (b >= I_cocoa && b < I_cocoa + 8) { if (rand(1, 5) == 1) { setBlock(x, y, z, b + 4); } }
  if (b >= I_wartCrop && b < I_wartCrop + 3) { if (rand(1, 10) == 1) { setBlock(x, y, z, b + 1); } }
  // a berry bush: 1 in 5 with a light of 9 over it
  if (b >= I_berryBush_0 && b <= I_berryBush_0 + 2) {
    if (y + 1 < WY) { if (lightRaw(i + 1) >= 9) { if (rand(1, 5) == 1) {
      if (b == I_berryBush_0 + 2) { setBlock(x, y, z, I_berryBush); } else { setBlock(x, y, z, b + 1); }
    } } }
  }
  if (b == I_vines) { if (rand(1, 4) == 1) { vineGrow(x, y, z); } }
  // rain fills a cauldron under the sky, slowly (the genre's: a column picked once in 4096 ticks
  // and 1 in 20 then: over an hour a level; here 1 in 60 of a cell's random ticks, the same)
  if (BKIND[b + 1] == I_cauldron) { if (b != I_cauldron_w3) { if (rand(1, 60) == 1) { if (rainOn(x, y + 1, z) == 1) { setBlock(x, y, z, cauldronId(cauldronLv(b) + 1)); } } } }
}
// a mahogany log gone: the cocoa that leaned on it comes off (it drops what it holds)
function plCocoaOff(x, y, z, a) {
  let cb = blockAt(x, y, z);
  if (cb >= I_cocoa && cb < I_cocoa + 12) { if (BATT[cb + 1] == a) { popBlock(x, y, z); } }
}
function plChanged(x, y, z, old, b) {
  if (plIsMahog(old) == 1) { if (plIsMahog(b) == 0) { plCocoaOff(x + 1, y, z, 0); plCocoaOff(x - 1, y, z, 1); plCocoaOff(x, y, z + 1, 4); plCocoaOff(x, y, z - 1, 5); } }
}
// ---------------------------------------------------------------- putting, bone meal
// what the item of block b puts where the player clicked: b as it is, another of its ids, or -1
// (not here). Cocoa: on the side of a mahogany log, small, leaning on it. Berries: a seedling
// (the bush itself, from the creative list, is put ripe).
function plantPut(b, id) {
  let r = b;
  if (b == I_cocoa) {
    r = 0 - 1;
    if (pickF != 2 && pickF != 3) { if (plIsMahog(pickB) == 1) {
      let a = OP6[pickF + 1];
      if (a >= 4) { a = a - 2; }
      r = I_cocoa + a;
    } }
  }
  if (b == I_berryBush) { if (id == I_berries) { r = I_berryBush_0; } }
  return r;
}
// bone meal: cocoa a size more, a berry bush a stage more (the wart and vines take none)
function plantMeal(x, y, z, b) {
  let used = 0;
  if (b >= I_cocoa && b < I_cocoa + 8) { setBlock(x, y, z, b + 4); used = 1; }
  if (b >= I_berryBush_0 && b <= I_berryBush_0 + 2) {
    if (b == I_berryBush_0 + 2) { setBlock(x, y, z, I_berryBush); } else { setBlock(x, y, z, b + 1); }
    used = 1;
  }
  return used;
}
// ---------------------------------------------------------------- the cauldron
// the bottles are the brewing part's: found by their keys once (0: this build has none)
let plBotE = 0 - 1, plBotW = 0;
function plBottles() {
  if (plBotE < 0) {
    plBotE = 0; plBotW = 0;
    let i = NBLOCK + 1;
    while (i <= ITKEY.length) { if (ITKEY[i] == 'glass_bottle') { plBotE = i - 1; } if (ITKEY[i] == 'water_bottle') { plBotW = i - 1; } i = i + 1; }
  }
}
function cauldronLv(b) { let r = 0; if (b >= I_cauldron_w1 && b <= I_cauldron_w3) { r = b - I_cauldron_w1 + 1; } return r; }
function cauldronId(lv) { let r = I_cauldron; if (lv > 0) { r = I_cauldron_w1 + Math.min(3, lv) - 1; } return r; }
// the hand's one item becomes another (the rest of a heap keeps its slot; the new one goes beside)
function plSwapHeld(to) {
  if (mod(gameMode, 2) == 0) {
    takeHeld(1);
    if (INVI[hotSel] == 0) { INVI[hotSel] = to; INVN[hotSel] = 1; INVD[hotSel] = 0; } else { addItem(to, 1, 0); }
  }
}
// a click on a cauldron, as the genre's: a water bucket fills it (an empty bucket back), a bucket
// takes a full one, a glass bottle takes a third, a water bottle gives one. Either bucket on it
// does nothing else (no water put beside it).
function cauldronUse(x, y, z, id) {
  let b = blockAt(x, y, z), lv = cauldronLv(b), used = 0;
  plBottles();
  if (id == I_waterBucket) {
    used = 1;
    if (lv < 3) { setBlock(x, y, z, I_cauldron_w3); if (mod(gameMode, 2) == 0) { INVI[hotSel] = I_bucket; } sndPlay(5); }
  }
  if (id == I_bucket) {
    used = 1;
    if (lv == 3) { setBlock(x, y, z, I_cauldron); plSwapHeld(I_waterBucket); sndPlay(5); }
  }
  if (id > 0 && plBotW > 0) {
    if (id == plBotE) { if (lv > 0) { used = 1; setBlock(x, y, z, cauldronId(lv - 1)); plSwapHeld(plBotW); sndPlay(5); } }
    if (id == plBotW) { if (lv < 3) { used = 1; setBlock(x, y, z, cauldronId(lv + 1)); plSwapHeld(plBotE); sndPlay(5); } }
  }
  return used;
}
// ---------------------------------------------------------------- a click on a plant
function plantUse(x, y, z, b, id) {
  let used = 0;
  if (BKIND[b + 1] == I_cauldron) { used = cauldronUse(x, y, z, id); }
  // berries picked: a bush with a few gives 1 or 2, a ripe one 2 or 3, and it is a bare bush again
  // (bone meal in hand on a bush not yet ripe feeds it instead)
  if (b == I_berryBush || b == I_berryBush_0 + 2) { if (b == I_berryBush || id != I_boneMeal) {
    let n = 1 + rand(0, 1);
    if (b == I_berryBush) { n = n + 1; }
    dropItem(I_berries, n, 0, x + 0.5, y + 0.4, z + 0.5, 0);
    setBlock(x, y, z, I_berryBush_0 + 1);
    sndPlay(2); used = 1;
  } }
  // shears carve a pumpkin: four seeds fall out
  if (b == I_pumpkin) { if (ITTK[id + 1] == 5 && gameMode != 2) {
    setBlock(x, y, z, I_carvedPumpkin);
    dropItem(I_pumpkinSeeds, 4, 0, x + 0.5, y + 1.1, z + 0.5, 0);
    wearHeld(1); sndPlay(2); used = 1;
  } }
  return used;
}
// ---------------------------------------------------------------- each frame (one look, only while the player burns)
// a burning player in a cauldron's water is put out, and the water is a third less
function plantStep(dt) {
  if (fireT > 0) {
    let cx = Math.floor(px), cy = Math.floor(py + 0.1), cz = Math.floor(pz), cb = blockAt(cx, cy, cz);
    if (cb >= I_cauldron_w1 && cb <= I_cauldron_w3) { fireT = 0; setBlock(cx, cy, cz, cauldronId(cauldronLv(cb) - 1)); sndPlay(5); }
  }
}

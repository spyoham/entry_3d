// ===================================================================== sound
// sounds by name; distance is in the sound itself (near / middle / far versions),
// at most a few new sounds a frame (Entry has one volume for everything)
const SND_HIT = 'hit', SND_KILL = 'kill', SND_HURT = 'hurt', SND_EMPTY = 'empty', SND_RELOAD = 'reload', SND_EQUIP = 'equip';
const SND_PICK = 'pick', SND_HEAL = 'heal', SND_CHUTE = 'chute', SND_ZONE = 'zone', SND_BOOM = 'boom', SND_WIN = 'win', SND_DEAD = 'dead';
let sndN = 0, sndOn = 1;
function sfx(name, d) {
  if (sndOn == 1) { if (sndN < 4) { sound(name); sndN = sndN + 1; } }
}
// the kind of shot a gun makes
function gunSnd(g, supp) {
  let s = 'g_ar';
  if (supp == 1) { s = 'g_sup'; }
  else {
    let c = GCLS[g];
    if (c == 1) { s = 'g_pis'; }
    if (c == 2) { s = 'g_smg'; }
    if (c == 3 || c == 4 || c == 7) { if (GAMMO[g] == 4) { s = 'g_ak'; } }
    if (c == 5) { s = 'g_sr'; }
    if (c == 6) { s = 'g_sg'; }
  }
  return s;
}
function distSuf(d) {
  let s = '_f';
  if (d < 2500) { s = '_n'; } else { if (d < 14000) { s = '_m'; } }
  return s;
}
function sfxGun(g, supp, d) { sfx(gunSnd(g, supp) + distSuf(d), d); }
// someone else's shot, heard d cm away
function sfxShot(who, d) {
  let g = gunNow(who);
  if (g > 0) { let s = 0; if (attIn(attNow(who), 1) == 1) { s = 1; } sfx(gunSnd(g, s) + distSuf(d), d); }
  else { sfx('g_ar' + distSuf(d), d); }
}
function sfxShotAt(e) { sndN = sndN + 0; }
function sfxAt(name, x, z) {
  let dx = x - plX, dz = z - plZ;
  let d = Math.sqrt(dx * dx + dz * dz);
  if (d < 6000) { sfx(name + '_n', d); } else { sfx(name + '_f', d); }
}

// ============================================================
// Player weapons: psprites (p_pspr.c)
// weapons: 1 fist, 2 pistol, 3 shotgun, 4 chaingun, 5 rocket, 6 plasma, 7 chainsaw
// ammo: 1 bullets, 2 shells, 3 rockets, 4 cells
// ============================================================
const WEAPONTOP = 32, WEAPONBOTTOM = 128;
let plWeapon = 2, plPending = 0, plArmor = 0, plArmorType = 0, plBackpack = 0, plBerserk = 0;
let plDamageCount = 0, plBonusCount = 0, plAttacker = 0, plRefire = 0, plAttackDown = 0, extraLight = 0;
let psState = 0, psTics = 0, psSX = 1, psSY = WEAPONTOP, flState = 0, flTics = 0;
let plAmmo = [50, 0, 0, 0], plMaxAmmo = [200, 50, 50, 300], plOwned = [1, 1, 0, 0, 0, 0, 0], plKeys = [0, 0, 0];
let bulletSlope = 0, sawIdle = 0;

function weaponsReset() {
  plWeapon = 2; plPending = 0;
  plAmmo[1] = 50; plAmmo[2] = 0; plAmmo[3] = 0; plAmmo[4] = 0;
  plMaxAmmo[1] = 200; plMaxAmmo[2] = 50; plMaxAmmo[3] = 50; plMaxAmmo[4] = 300;
  let i = 1;
  while (i <= 7) { plOwned[i] = 0; i = i + 1; }
  plOwned[1] = 1; plOwned[2] = 1;
  plKeys[1] = 0; plKeys[2] = 0; plKeys[3] = 0;
  plArmor = 0; plArmorType = 0; plBackpack = 0; plBerserk = 0;
  plRefire = 0; plAttackDown = 0; extraLight = 0; flState = 0;
  bringUpWeapon();
}

// P_SetPsprite for the weapon (ps = 0) or the flash (ps = 1)
function setPsprite(ps, st) {
  let go = 1, guard = 0;
  while (go == 1 && guard < 10) {
    guard = guard + 1;
    if (st == S_NULL || st == 0) {
      if (ps == 0) { psState = 0; } else { flState = 0; }
      go = 0;
    } else {
      if (ps == 0) { psState = st; psTics = stTics[st]; } else { flState = st; flTics = stTics[st]; }
      let a = stAction[st];
      if (a > 0) { weaponAction(ps, a); }
      let cur = psState, tc = psTics;
      if (ps == 1) { cur = flState; tc = flTics; }
      if (cur != st) { go = 0; }
      else { if (tc != 0) { go = 0; } else { st = stNext[st]; } }
    }
  }
}

function bringUpWeapon() {
  if (plPending == 0) { plPending = plWeapon; }
  if (plPending == 7) { playSound('SAWUP'); }
  plWeapon = plPending;
  plPending = 0;
  psSY = WEAPONBOTTOM;
  setPsprite(0, wpUp[plWeapon]);
}

// P_CheckAmmo -> giveOk (1 = can fire)
function checkAmmo() {
  giveOk = 1;
  let a = wpAmmo[plWeapon];
  let empty = 0;
  if (a > 0) { if (plAmmo[a] < 1) { empty = 1; } }   // no short-circuit in Entry: guard the index
  if (empty == 1) {
    giveOk = 0;
    // pick the best weapon with ammo
    let w = 1;
    if (plOwned[7] == 1) { w = 7; }
    if (plOwned[2] == 1 && plAmmo[1] > 0) { w = 2; }
    if (plOwned[3] == 1 && plAmmo[2] > 0) { w = 3; }
    if (plOwned[4] == 1 && plAmmo[1] > 0) { w = 4; }
    if (plOwned[6] == 1 && plAmmo[4] > 0) { w = 6; }
    plPending = w;
    setPsprite(0, wpDown[plWeapon]);
  }
}
function fireWeapon() {
  checkAmmo();
  if (giveOk == 1) {
    setPsprite(0, wpAtk[plWeapon]);
    noiseAlert();
  }
}
// P_BulletSlope (autoaim, trying a little to each side)
function bulletSlopeFind() {
  aimLineAttack(plMo, plAng, 1024);
  if (lineTarget == 0) { aimLineAttack(plMo, plAng + 5.6, 1024); }
  if (lineTarget == 0) { aimLineAttack(plMo, plAng - 5.6, 1024); }
  bulletSlope = aimSlope;
}
function gunShot(accurate) {
  let ang = plAng;
  if (accurate == 0) { ang = ang + (rand(0, 255) - rand(0, 255)) / 45.5; }
  attackRange = MISSILERANGE;
  lineAttack(plMo, ang, MISSILERANGE, bulletSlope, 5 * rand(1, 3));
}
function useAmmo() {
  let a = wpAmmo[plWeapon];
  if (a > 0) { plAmmo[a] = plAmmo[a] - 1; hudDirty = 1; }
}

function weaponAction(ps, a) {
  if (a == A_WeaponReady) {
    if (plWeapon == 7 && psState == S_SAW) { sawIdle = sawIdle + 1; if (mod(sawIdle, 2) == 0) { playSound('SAWIDL'); } }
    if (plPending != 0 || plHealth <= 0) {
      setPsprite(0, wpDown[plWeapon]);
    } else {
      if (inFire == 1) {
        if (plAttackDown == 0 || (plWeapon != 5)) { plAttackDown = 1; fireWeapon(); }
      } else { plAttackDown = 0; }
    }
  }
  if (a == A_ReFire) {
    if (inFire == 1 && plPending == 0 && plHealth > 0) { plRefire = plRefire + 1; fireWeapon(); }
    else { plRefire = 0; checkAmmo(); }
  }
  if (a == A_Lower) {
    psSY = psSY + 6;
    if (psSY >= WEAPONBOTTOM) {
      psSY = WEAPONBOTTOM;
      if (plHealth > 0) { bringUpWeapon(); } else { psState = 0; }
    }
  }
  if (a == A_Raise) {
    psSY = psSY - 6;
    if (psSY <= WEAPONTOP) { psSY = WEAPONTOP; setPsprite(0, wpReady[plWeapon]); }
  }
  if (a == A_GunFlash) { setPsprite(1, wpFlash[plWeapon]); }
  if (a == A_FirePistol) {
    playSound('PISTOL'); useAmmo();
    setPsprite(1, wpFlash[plWeapon]);
    bulletSlopeFind();
    let acc = 0;
    if (plRefire == 0) { acc = 1; }
    gunShot(acc);
  }
  if (a == A_FireShotgun) {
    playSound('SHOTGN'); useAmmo();
    setPsprite(1, wpFlash[plWeapon]);
    bulletSlopeFind();
    let i = 0;
    while (i < 7) { gunShot(0); i = i + 1; }
  }
  if (a == A_FireCGun) {
    if (plAmmo[1] > 0) {
      playSound('PISTOL'); useAmmo();
      setPsprite(1, wpFlash[plWeapon] + psState - S_CHAIN1);
      bulletSlopeFind();
      let acc = 0;
      if (plRefire == 0) { acc = 1; }
      gunShot(acc);
    }
  }
  if (a == A_FireMissile) {
    useAmmo();
    bulletSlopeFind();
    spawnMissile(plMo, plAng, bulletSlope, T_ROCKET);
  }
  if (a == A_FirePlasma) {
    useAmmo();
    setPsprite(1, wpFlash[plWeapon] + rand(0, 1));
    bulletSlopeFind();
    spawnMissile(plMo, plAng, bulletSlope, T_PLASMA);
  }
  if (a == A_Punch) {
    let dmg = rand(1, 10) * 2;
    if (plBerserk == 1) { dmg = dmg * 10; }
    let ang = plAng + (rand(0, 255) - rand(0, 255)) / 45.5;
    aimLineAttack(plMo, ang, MELEERANGE);
    attackRange = MELEERANGE;
    lineAttack(plMo, ang, MELEERANGE, aimSlope, dmg);
    if (lineTarget > 0) {
      playSound('PUNCH');
      pointAngle(mX[lineTarget] - plX, mY[lineTarget] - plY);
      plAng = angResult;
    }
  }
  if (a == A_Saw) {
    let dmg = 2 * rand(1, 10);
    let ang = plAng + (rand(0, 255) - rand(0, 255)) / 45.5;
    aimLineAttack(plMo, ang, MELEERANGE + 1);
    attackRange = MELEERANGE;
    lineAttack(plMo, ang, MELEERANGE + 1, aimSlope, dmg);
    if (lineTarget == 0) { playSound('SAWFUL'); }
    else {
      playSound('SAWHIT');
      pointAngle(mX[lineTarget] - plX, mY[lineTarget] - plY);
      let d = mod(angResult - plAng + 180, 360) - 180;
      if (d > 5) { plAng = plAng + 5; } else { if (d < -5) { plAng = plAng - 5; } else { plAng = angResult; } }
    }
  }
  if (a == A_Light0) { extraLight = 0; }
  if (a == A_Light1) { extraLight = 1; }
  if (a == A_Light2) { extraLight = 2; }
}

// P_MovePsprites: once per tic
function movePsprites() {
  // weapon change request from the number keys
  if (inWeapon > 0 && plHealth > 0) {
    let w = inWeapon;
    if (w == 1 && plOwned[7] == 1 && !(plWeapon == 7 && plBerserk == 1)) { if (plWeapon != 7) { w = 7; } }
    if (plOwned[w] == 1 && w != plWeapon) { plPending = w; }
  }
  if (psState > 0 && psTics != -1) {
    psTics = psTics - 1;
    if (psTics <= 0) { setPsprite(0, stNext[psState]); }
  }
  if (flState > 0 && flTics != -1) {
    flTics = flTics - 1;
    if (flTics <= 0) { setPsprite(1, stNext[flState]); }
  }
  // bob while ready (A_WeaponReady sets it in Doom; done here every tic)
  if (psState == wpReady[plWeapon] || (plWeapon == 7 && (psState == S_SAW || psState == S_SAWB))) {
    let ang = mod(levelTime * 128 * 360 / 8192, 360);
    psSX = 1 + plBob * cosd(ang);
    psSY = WEAPONTOP + plBob * Math.abs(sind(ang));
  }
}

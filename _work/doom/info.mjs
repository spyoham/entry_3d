// Subset of Doom's info.c (GPL, id Software): states, mobj types, weapons.
// State: [name, sprite, frame ('A'..; '!' suffix = fullbright), tics, action, next]
export const ACTIONS = ['none', 'Look', 'Chase', 'FaceTarget', 'PosAttack', 'SPosAttack', 'TroopAttack', 'SargAttack', 'Pain', 'Scream',
    'XScream', 'Fall', 'Explode', 'WeaponReady', 'Lower', 'Raise', 'Punch', 'ReFire', 'FirePistol', 'FireShotgun', 'FireCGun', 'GunFlash',
    'FireMissile', 'FirePlasma', 'Saw', 'Light0', 'Light1', 'Light2', 'BarrelScream', 'Remove'];

const S = [];
const st = (name, spr, fr, tics, action, next) => S.push({ name, spr, fr, tics, action: action || 'none', next });
st('S_NULL', 'TROO', 'A', -1, null, 'S_NULL');
// ---- weapons ----
st('S_LIGHTDONE', 'SHTG', 'E', 0, 'Light0', 'S_NULL');
st('S_PUNCH', 'PUNG', 'A', 1, 'WeaponReady', 'S_PUNCH');
st('S_PUNCHDOWN', 'PUNG', 'A', 1, 'Lower', 'S_PUNCHDOWN');
st('S_PUNCHUP', 'PUNG', 'A', 1, 'Raise', 'S_PUNCHUP');
st('S_PUNCH1', 'PUNG', 'B', 4, null, 'S_PUNCH2');
st('S_PUNCH2', 'PUNG', 'C', 4, 'Punch', 'S_PUNCH3');
st('S_PUNCH3', 'PUNG', 'D', 5, null, 'S_PUNCH4');
st('S_PUNCH4', 'PUNG', 'C', 4, null, 'S_PUNCH5');
st('S_PUNCH5', 'PUNG', 'B', 5, 'ReFire', 'S_PUNCH');
st('S_PISTOL', 'PISG', 'A', 1, 'WeaponReady', 'S_PISTOL');
st('S_PISTOLDOWN', 'PISG', 'A', 1, 'Lower', 'S_PISTOLDOWN');
st('S_PISTOLUP', 'PISG', 'A', 1, 'Raise', 'S_PISTOLUP');
st('S_PISTOL1', 'PISG', 'A', 4, null, 'S_PISTOL2');
st('S_PISTOL2', 'PISG', 'B', 6, 'FirePistol', 'S_PISTOL3');
st('S_PISTOL3', 'PISG', 'C', 4, null, 'S_PISTOL4');
st('S_PISTOL4', 'PISG', 'B', 5, 'ReFire', 'S_PISTOL');
st('S_PISTOLFLASH', 'PISF', 'A!', 7, 'Light1', 'S_LIGHTDONE');
st('S_SGUN', 'SHTG', 'A', 1, 'WeaponReady', 'S_SGUN');
st('S_SGUNDOWN', 'SHTG', 'A', 1, 'Lower', 'S_SGUNDOWN');
st('S_SGUNUP', 'SHTG', 'A', 1, 'Raise', 'S_SGUNUP');
st('S_SGUN1', 'SHTG', 'A', 3, null, 'S_SGUN2');
st('S_SGUN2', 'SHTG', 'A', 7, 'FireShotgun', 'S_SGUN3');
st('S_SGUN3', 'SHTG', 'B', 5, null, 'S_SGUN4');
st('S_SGUN4', 'SHTG', 'C', 5, null, 'S_SGUN5');
st('S_SGUN5', 'SHTG', 'D', 4, null, 'S_SGUN6');
st('S_SGUN6', 'SHTG', 'C', 5, null, 'S_SGUN7');
st('S_SGUN7', 'SHTG', 'B', 5, null, 'S_SGUN8');
st('S_SGUN8', 'SHTG', 'A', 3, null, 'S_SGUN9');
st('S_SGUN9', 'SHTG', 'A', 7, 'ReFire', 'S_SGUN');
st('S_SGUNFLASH1', 'SHTF', 'A!', 4, 'Light1', 'S_SGUNFLASH2');
st('S_SGUNFLASH2', 'SHTF', 'B!', 3, 'Light2', 'S_LIGHTDONE');
st('S_CHAIN', 'CHGG', 'A', 1, 'WeaponReady', 'S_CHAIN');
st('S_CHAINDOWN', 'CHGG', 'A', 1, 'Lower', 'S_CHAINDOWN');
st('S_CHAINUP', 'CHGG', 'A', 1, 'Raise', 'S_CHAINUP');
st('S_CHAIN1', 'CHGG', 'A', 4, 'FireCGun', 'S_CHAIN2');
st('S_CHAIN2', 'CHGG', 'B', 4, 'FireCGun', 'S_CHAIN3');
st('S_CHAIN3', 'CHGG', 'B', 0, 'ReFire', 'S_CHAIN');
st('S_CHAINFLASH1', 'CHGF', 'A!', 5, 'Light1', 'S_LIGHTDONE');
st('S_CHAINFLASH2', 'CHGF', 'B!', 5, 'Light2', 'S_LIGHTDONE');
st('S_MISSILE', 'MISG', 'A', 1, 'WeaponReady', 'S_MISSILE');
st('S_MISSILEDOWN', 'MISG', 'A', 1, 'Lower', 'S_MISSILEDOWN');
st('S_MISSILEUP', 'MISG', 'A', 1, 'Raise', 'S_MISSILEUP');
st('S_MISSILE1', 'MISG', 'B', 8, 'GunFlash', 'S_MISSILE2');
st('S_MISSILE2', 'MISG', 'B', 12, 'FireMissile', 'S_MISSILE3');
st('S_MISSILE3', 'MISG', 'B', 0, 'ReFire', 'S_MISSILE');
st('S_MISSILEFLASH1', 'MISF', 'A!', 3, 'Light1', 'S_MISSILEFLASH2');
st('S_MISSILEFLASH2', 'MISF', 'B!', 4, null, 'S_MISSILEFLASH3');
st('S_MISSILEFLASH3', 'MISF', 'C!', 4, 'Light2', 'S_MISSILEFLASH4');
st('S_MISSILEFLASH4', 'MISF', 'D!', 4, 'Light2', 'S_LIGHTDONE');
st('S_SAW', 'SAWG', 'C', 4, 'WeaponReady', 'S_SAWB');
st('S_SAWB', 'SAWG', 'D', 4, 'WeaponReady', 'S_SAW');
st('S_SAWDOWN', 'SAWG', 'C', 1, 'Lower', 'S_SAWDOWN');
st('S_SAWUP', 'SAWG', 'C', 1, 'Raise', 'S_SAWUP');
st('S_SAW1', 'SAWG', 'A', 4, 'Saw', 'S_SAW2');
st('S_SAW2', 'SAWG', 'B', 4, 'Saw', 'S_SAW3');
st('S_SAW3', 'SAWG', 'B', 0, 'ReFire', 'S_SAW');
st('S_PLASMA', 'PLSG', 'A', 1, 'WeaponReady', 'S_PLASMA');
st('S_PLASMADOWN', 'PLSG', 'A', 1, 'Lower', 'S_PLASMADOWN');
st('S_PLASMAUP', 'PLSG', 'A', 1, 'Raise', 'S_PLASMAUP');
st('S_PLASMA1', 'PLSG', 'A', 3, 'FirePlasma', 'S_PLASMA2');
st('S_PLASMA2', 'PLSG', 'B', 20, 'ReFire', 'S_PLASMA');
st('S_PLASMAFLASH1', 'PLSF', 'A!', 4, 'Light1', 'S_LIGHTDONE');
st('S_PLASMAFLASH2', 'PLSF', 'B!', 4, 'Light1', 'S_LIGHTDONE');
// ---- monsters ----
function monster(p, spr, o) {
    st(p + '_STND', spr, 'A', 10, 'Look', p + '_STND2');
    st(p + '_STND2', spr, 'B', 10, 'Look', p + '_STND');
    const rt = o.runTics;
    ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'].forEach((f, i) => st(p + '_RUN' + (i + 1), spr, f, rt, 'Chase', p + '_RUN' + (i === 7 ? 1 : i + 2)));
    o.atk.forEach(([f, t, a], i) => st(p + '_ATK' + (i + 1), spr, f, t, a, i === o.atk.length - 1 ? (o.atkNext || p + '_RUN1') : p + '_ATK' + (i + 2)));
    st(p + '_PAIN', spr, o.pain, o.painTics, null, p + '_PAIN2');
    st(p + '_PAIN2', spr, o.pain, o.painTics, 'Pain', p + '_RUN1');
    o.die.forEach(([f, t, a], i) => st(p + '_DIE' + (i + 1), spr, f, t, a, i === o.die.length - 1 ? 'S_NULL' : p + '_DIE' + (i + 2)));
    if (o.xdie) o.xdie.forEach(([f, t, a], i) => st(p + '_XDIE' + (i + 1), spr, f, t, a, i === o.xdie.length - 1 ? 'S_NULL' : p + '_XDIE' + (i + 2)));
}
const XD = [['M', 5], ['N', 5, 'XScream'], ['O', 5, 'Fall'], ['P', 5], ['Q', 5], ['R', 5], ['S', 5], ['T', 5], ['U', -1]];
monster('S_POSS', 'POSS', { runTics: 4, atk: [['E', 10, 'FaceTarget'], ['F!', 8, 'PosAttack'], ['E', 8]], pain: 'G', painTics: 3,
    die: [['H', 5], ['I', 5, 'Scream'], ['J', 5, 'Fall'], ['K', 5], ['L', -1]], xdie: XD });
monster('S_SPOS', 'SPOS', { runTics: 3, atk: [['E', 10, 'FaceTarget'], ['F!', 10, 'SPosAttack'], ['E', 10]], pain: 'G', painTics: 3,
    die: [['H', 5], ['I', 5, 'Scream'], ['J', 5, 'Fall'], ['K', 5], ['L', -1]], xdie: XD });
monster('S_TROO', 'TROO', { runTics: 3, atk: [['E', 8, 'FaceTarget'], ['F', 8, 'FaceTarget'], ['G', 6, 'TroopAttack']], pain: 'H', painTics: 2,
    die: [['I', 8], ['J', 8, 'Scream'], ['K', 6], ['L', 6, 'Fall'], ['M', -1]],
    xdie: [['N', 5], ['O', 5, 'XScream'], ['P', 5], ['Q', 5, 'Fall'], ['R', 5], ['S', 5], ['T', 5], ['U', -1]] });
monster('S_SARG', 'SARG', { runTics: 2, atk: [['E', 8, 'FaceTarget'], ['F', 8, 'FaceTarget'], ['G', 8, 'SargAttack']], pain: 'H', painTics: 2,
    die: [['I', 8], ['J', 8, 'Scream'], ['K', 4], ['L', 4, 'Fall'], ['M', 4], ['N', -1]] });
// ---- barrel / missiles / effects ----
st('S_BAR1', 'BAR1', 'A', -1, null, 'S_BAR2');
st('S_BAR2', 'BAR1', 'B', 6, null, 'S_BAR1');
st('S_BEXP', 'BEXP', 'A!', 5, null, 'S_BEXP2');
st('S_BEXP2', 'BEXP', 'B!', 5, 'BarrelScream', 'S_BEXP3');
st('S_BEXP3', 'BEXP', 'C!', 5, null, 'S_BEXP4');
st('S_BEXP4', 'BEXP', 'D!', 10, 'Explode', 'S_BEXP5');
st('S_BEXP5', 'BEXP', 'E!', 10, 'Remove', 'S_NULL');
st('S_TBALL1', 'BAL1', 'A!', 4, null, 'S_TBALL2');
st('S_TBALL2', 'BAL1', 'B!', 4, null, 'S_TBALL1');
st('S_TBALLX1', 'BAL1', 'C!', 6, null, 'S_TBALLX2');
st('S_TBALLX2', 'BAL1', 'D!', 6, null, 'S_TBALLX3');
st('S_TBALLX3', 'BAL1', 'E!', 6, 'Remove', 'S_NULL');
st('S_ROCKET', 'MISL', 'A!', 1, null, 'S_ROCKET');
st('S_EXPLODE1', 'MISL', 'B!', 8, 'Explode', 'S_EXPLODE2');
st('S_EXPLODE2', 'MISL', 'C!', 6, null, 'S_EXPLODE3');
st('S_EXPLODE3', 'MISL', 'D!', 4, 'Remove', 'S_NULL');
st('S_PLASBALL', 'PLSS', 'A!', 6, null, 'S_PLASBALL2');
st('S_PLASBALL2', 'PLSS', 'B!', 6, null, 'S_PLASBALL');
['A', 'B', 'C', 'D', 'E'].forEach((f, i) => st('S_PLASEXP' + (i + 1), 'PLSE', f + '!', 4, i === 4 ? 'Remove' : null, i === 4 ? 'S_NULL' : 'S_PLASEXP' + (i + 2)));
st('S_PUFF1', 'PUFF', 'A!', 4, null, 'S_PUFF2');
st('S_PUFF2', 'PUFF', 'B', 4, null, 'S_PUFF3');
st('S_PUFF3', 'PUFF', 'C', 4, null, 'S_PUFF4');
st('S_PUFF4', 'PUFF', 'D', 4, 'Remove', 'S_NULL');
st('S_BLOOD1', 'BLUD', 'C', 8, null, 'S_BLOOD2');
st('S_BLOOD2', 'BLUD', 'B', 8, null, 'S_BLOOD3');
st('S_BLOOD3', 'BLUD', 'A', 8, 'Remove', 'S_NULL');
// ---- static things (items, decorations) ----
const loop = (name, spr, frames, tics) => frames.forEach((f, i) => st(name + (i ? i + 1 : ''), spr, f, frames.length > 1 ? tics : -1, null, name + (i === frames.length - 1 ? '' : i + 2)));

export const MOBJ = {};   // doomednum -> info
const MF = { SOLID: 1, SHOOTABLE: 2, SPECIAL: 4, COUNTKILL: 8, COUNTITEM: 16, SHADOW: 32, MISSILE: 64, NOBLOOD: 128, CORPSE: 256, FLOAT: 512, SPAWNCEIL: 1024, NOGRAVITY: 2048 };
export { MF };
function thing(ednum, key, o) { MOBJ[key] = { ednum, key, radius: 20, height: 16, flags: 0, health: 1000, speed: 0, painchance: 0, mass: 100, ...o }; }
thing(3004, 'POSSESSED', { spawn: 'S_POSS_STND', see: 'S_POSS_RUN1', pain: 'S_POSS_PAIN', missile: 'S_POSS_ATK1', death: 'S_POSS_DIE1', xdeath: 'S_POSS_XDIE1',
    health: 20, speed: 8, painchance: 200, height: 56, flags: MF.SOLID | MF.SHOOTABLE | MF.COUNTKILL, seeSound: 'POSIT1', painSound: 'POPAIN', deathSound: 'PODTH1', activeSound: 'POSACT', attackSound: 'PISTOL', drop: 'CLIPDROP' });
thing(9, 'SHOTGUY', { spawn: 'S_SPOS_STND', see: 'S_SPOS_RUN1', pain: 'S_SPOS_PAIN', missile: 'S_SPOS_ATK1', death: 'S_SPOS_DIE1', xdeath: 'S_SPOS_XDIE1',
    health: 30, speed: 8, painchance: 170, height: 56, flags: MF.SOLID | MF.SHOOTABLE | MF.COUNTKILL, seeSound: 'POSIT2', painSound: 'POPAIN', deathSound: 'PODTH2', activeSound: 'POSACT', drop: 'SHOTDROP' });
thing(3001, 'TROOP', { spawn: 'S_TROO_STND', see: 'S_TROO_RUN1', pain: 'S_TROO_PAIN', melee: 'S_TROO_ATK1', missile: 'S_TROO_ATK1', death: 'S_TROO_DIE1', xdeath: 'S_TROO_XDIE1',
    health: 60, speed: 8, painchance: 200, height: 56, flags: MF.SOLID | MF.SHOOTABLE | MF.COUNTKILL, seeSound: 'BGSIT1', painSound: 'POPAIN', deathSound: 'BGDTH1', activeSound: 'BGACT' });
thing(3002, 'SERGEANT', { spawn: 'S_SARG_STND', see: 'S_SARG_RUN1', pain: 'S_SARG_PAIN', melee: 'S_SARG_ATK1', death: 'S_SARG_DIE1',
    health: 150, speed: 10, painchance: 180, radius: 30, height: 56, mass: 400, flags: MF.SOLID | MF.SHOOTABLE | MF.COUNTKILL, seeSound: 'SGTSIT', attackSound: 'SGTATK', painSound: 'DMPAIN', deathSound: 'SGTDTH', activeSound: 'DMACT' });
thing(58, 'SHADOWS', { ...MOBJ.SERGEANT, ednum: 58, key: 'SHADOWS', flags: MF.SOLID | MF.SHOOTABLE | MF.COUNTKILL | MF.SHADOW });
thing(2035, 'BARREL', { spawn: 'S_BAR1', death: 'S_BEXP', health: 20, radius: 10, height: 42, flags: MF.SOLID | MF.SHOOTABLE | MF.NOBLOOD, deathSound: 'BAREXP' });
thing(-1, 'TROOPSHOT', { spawn: 'S_TBALL1', death: 'S_TBALLX1', speed: 10, radius: 6, height: 8, damage: 3, flags: MF.MISSILE | MF.NOGRAVITY, seeSound: 'FIRSHT', deathSound: 'FIRXPL' });
thing(-1, 'ROCKET', { spawn: 'S_ROCKET', death: 'S_EXPLODE1', speed: 20, radius: 11, height: 8, damage: 20, flags: MF.MISSILE | MF.NOGRAVITY, seeSound: 'RLAUNC', deathSound: 'BAREXP' });
thing(-1, 'PLASMA', { spawn: 'S_PLASBALL', death: 'S_PLASEXP1', speed: 25, radius: 13, height: 8, damage: 5, flags: MF.MISSILE | MF.NOGRAVITY, seeSound: 'PLASMA', deathSound: 'FIRXPL' });
thing(-1, 'PUFF', { spawn: 'S_PUFF1', flags: MF.NOGRAVITY });
thing(-1, 'BLOOD', { spawn: 'S_BLOOD1', flags: 0 });
// pickups: [ednum, key, sprite, frames, pickup kind, amount, message, flags]
const PICK = [
    [2007, 'CLIP', 'CLIP', 'A', 'bullets', 10, 'Picked up a clip.'],
    [-1, 'CLIPDROP', 'CLIP', 'A', 'bullets', 5, 'Picked up a clip.'],
    [2048, 'AMMOBOX', 'AMMO', 'A', 'bullets', 50, 'Picked up a box of bullets.'],
    [2008, 'SHELLS', 'SHEL', 'A', 'shells', 4, 'Picked up 4 shotgun shells.'],
    [2049, 'SHELLBOX', 'SBOX', 'A', 'shells', 20, 'Picked up a box of shotgun shells.'],
    [2010, 'ROCKETAMMO', 'ROCK', 'A', 'rockets', 1, 'Picked up a rocket.'],
    [2046, 'ROCKETBOX', 'BROK', 'A', 'rockets', 5, 'Picked up a box of rockets.'],
    [2047, 'CELL', 'CELL', 'A', 'cells', 20, 'Picked up an energy cell.'],
    [17, 'CELLPACK', 'CELP', 'A', 'cells', 100, 'Picked up an energy cell pack.'],
    [8, 'BACKPACK', 'BPAK', 'A', 'backpack', 0, 'Picked up a backpack full of ammo!'],
    [2011, 'STIM', 'STIM', 'A', 'health', 10, 'Picked up a stimpack.'],
    [2012, 'MEDI', 'MEDI', 'A', 'health', 25, 'Picked up a medikit.'],
    [2014, 'HEALTHBONUS', 'BON1', 'A', 'hbonus', 1, 'Picked up a health bonus.', MF.COUNTITEM],
    [2015, 'ARMORBONUS', 'BON2', 'A', 'abonus', 1, 'Picked up an armor bonus.', MF.COUNTITEM],
    [2018, 'GREENARMOR', 'ARM1', 'AB!', 'armor', 100, 'Picked up the armor.'],
    [2019, 'BLUEARMOR', 'ARM2', 'AB!', 'armor', 200, 'Picked up the MegaArmor!'],
    [2013, 'SOULSPHERE', 'SOUL', 'A!B!C!D!C!B!', 'soul', 100, 'Supercharge!', MF.COUNTITEM],
    [2023, 'BERSERK', 'PSTR', 'A!', 'berserk', 0, 'Berserk!', MF.COUNTITEM],
    [5, 'BLUECARD', 'BKEY', 'AB!', 'key', 1, 'Picked up a blue keycard.'],
    [6, 'YELLOWCARD', 'YKEY', 'AB!', 'key', 2, 'Picked up a yellow keycard.'],
    [13, 'REDCARD', 'RKEY', 'AB!', 'key', 3, 'Picked up a red keycard.'],
    [2001, 'SHOTGUN', 'SHOT', 'A', 'weapon', 3, 'You got the shotgun!'],
    [-1, 'SHOTDROP', 'SHOT', 'A', 'weapon', 3, 'You got the shotgun!'],
    [2002, 'CHAINGUN', 'MGUN', 'A', 'weapon', 4, 'You got the chaingun!'],
    [2003, 'LAUNCHER', 'LAUN', 'A', 'weapon', 5, 'You got the rocket launcher!'],
    [2004, 'PLASMAGUN', 'PLAS', 'A', 'weapon', 6, 'You got the plasma gun!'],
    [2005, 'CHAINSAW', 'CSAW', 'A', 'weapon', 7, 'A chainsaw!  Find some meat!'],
];
for (const [ed, key, spr, frames, kind, amount, msg, extra] of PICK) {
    const fr = frames.match(/[A-Z]!?/g);
    loop('S_' + key, spr, fr, 6);
    thing(ed, key, { spawn: 'S_' + key, radius: 20, height: 16, flags: MF.SPECIAL | (extra || 0), pickup: { kind, amount, msg } });
}
// decorations: [ednum, key, sprite, frames, solid, radius]
const DECO = [
    [2028, 'COLUMN', 'COLU', 'A!', 1, 16], [48, 'TECHCOL', 'ELEC', 'A', 1, 16], [43, 'TREE1', 'TRE1', 'A', 1, 16], [54, 'TREE2', 'TRE2', 'A', 1, 32],
    [47, 'STUMP', 'SMIT', 'A', 1, 16], [24, 'POOL', 'POL5', 'A', 0, 20], [26, 'IMPALED2', 'POL6', 'AB', 1, 16], [60, 'HANGLEG', 'GOR4', 'A', 0, 16],
    [15, 'DEADPLAYER', 'PLAY', 'N', 0, 20], [10, 'GIBS', 'PLAY', 'W', 0, 20], [12, 'GIBS2', 'PLAY', 'W', 0, 20], [18, 'DEADPOSS', 'POSS', 'L', 0, 20],
    [19, 'DEADSPOS', 'SPOS', 'L', 0, 20], [20, 'DEADTROO', 'TROO', 'M', 0, 20], [21, 'DEADSARG', 'SARG', 'N', 0, 20],
];
for (const [ed, key, spr, frames, solid, radius] of DECO) {
    loop('S_' + key, spr, frames.match(/[A-Z]!?/g), 8);
    thing(ed, key, { spawn: 'S_' + key, radius, height: 16, flags: solid ? MF.SOLID : 0, spawnceil: key === 'HANGLEG' });
}

export const STATES = S;
export const stateIndex = Object.fromEntries(S.map((s, i) => [s.name, i + 1]));   // 1-based
export const WEAPONS = [
    // idx: 1 fist, 2 pistol, 3 shotgun, 4 chaingun, 5 rocket, 6 plasma, 7 chainsaw ; ammo: 0 none,1 bullets,2 shells,3 rockets,4 cells
    { name: 'fist', ammo: 0, up: 'S_PUNCHUP', down: 'S_PUNCHDOWN', ready: 'S_PUNCH', atk: 'S_PUNCH1', flash: 'S_NULL', per: 0 },
    { name: 'pistol', ammo: 1, up: 'S_PISTOLUP', down: 'S_PISTOLDOWN', ready: 'S_PISTOL', atk: 'S_PISTOL1', flash: 'S_PISTOLFLASH', per: 1 },
    { name: 'shotgun', ammo: 2, up: 'S_SGUNUP', down: 'S_SGUNDOWN', ready: 'S_SGUN', atk: 'S_SGUN1', flash: 'S_SGUNFLASH1', per: 1 },
    { name: 'chaingun', ammo: 1, up: 'S_CHAINUP', down: 'S_CHAINDOWN', ready: 'S_CHAIN', atk: 'S_CHAIN1', flash: 'S_CHAINFLASH1', per: 1 },
    { name: 'missile', ammo: 3, up: 'S_MISSILEUP', down: 'S_MISSILEDOWN', ready: 'S_MISSILE', atk: 'S_MISSILE1', flash: 'S_MISSILEFLASH1', per: 1 },
    { name: 'plasma', ammo: 4, up: 'S_PLASMAUP', down: 'S_PLASMADOWN', ready: 'S_PLASMA', atk: 'S_PLASMA1', flash: 'S_PLASMAFLASH1', per: 1 },
    { name: 'chainsaw', ammo: 0, up: 'S_SAWUP', down: 'S_SAWDOWN', ready: 'S_SAW', atk: 'S_SAW1', flash: 'S_NULL', per: 0 },
];
export const WORLD_SPRITES = new Set(S.filter(s => !/^(PUNG|PISG|PISF|SHTG|SHTF|CHGG|CHGF|MISG|MISF|SAWG|PLSG|PLSF)$/.test(s.spr)).map(s => s.spr));
export const WEAPON_SPRITES = new Set(['PUNG', 'PISG', 'PISF', 'SHTG', 'SHTF', 'CHGG', 'CHGF', 'MISG', 'MISF', 'SAWG', 'PLSG', 'PLSF']);

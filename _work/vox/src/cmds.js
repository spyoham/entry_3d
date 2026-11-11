// ===================================================================== commands (T or /), v2.0
// The commands of the genre with the same words: targets (@p @s @a @r @e[type=..,distance=..,
// limit=..,sort=..]), coordinates (n, ~n, ^left ^up ^forward), blocks by name (with [facing=..,
// half=.., type=.., axis=.., age=..]), and the game rules.

// ---------------------------------------------------------------- game rules
let GRN = ['keepinventory', 'dodaylightcycle', 'domobspawning', 'naturalregeneration', 'falldamage', 'doweathercycle', 'domobloot', 'dotiledrops', 'mobgriefing', 'dofiretick',
  'drowningdamage', 'firedamage', 'doimmediaterespawn', 'randomtickspeed', 'commandblockoutput', 'sendcommandfeedback', 'showdeathmessages', 'spawnradius', 'doinsomnia', 'announceadvancements',
  'disableraids', 'dopatrolspawning', 'universalanger', 'forgivedeadplayers', 'doentitydrops', 'maxcommandchainlength'];
let GRS = ['keepInventory', 'doDaylightCycle', 'doMobSpawning', 'naturalRegeneration', 'fallDamage', 'doWeatherCycle', 'doMobLoot', 'doTileDrops', 'mobGriefing', 'doFireTick',
  'drowningDamage', 'fireDamage', 'doImmediateRespawn', 'randomTickSpeed', 'commandBlockOutput', 'sendCommandFeedback', 'showDeathMessages', 'spawnRadius', 'doInsomnia', 'announceAdvancements',
  'disableRaids', 'doPatrolSpawning', 'universalAnger', 'forgiveDeadPlayers', 'doEntityDrops', 'maxCommandChainLength'];
// (1 0: true / false; whole numbers for the rest)
let GRD = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 3, 1, 1, 1, 10, 1, 1, 0, 1, 0, 1, 1, 65536];
let GRINT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1];
let GRV = [];
let grKeep = 0, grDay = 1, grMobs = 1, grRegen = 1, grFall = 1, grWeather = 1, grLoot = 1, grTileDrops = 1, grGrief = 1, grFireTick = 1;
let grDrown = 1, grFire = 1, grImmediate = 0, grTick = 3, grCbOut = 1, grFeedback = 1, grDeathMsg = 1, grSpawnR = 10;
function gamerulesInit() {
  GRV = [];
  let k = 1;
  while (k <= GRD.length) { GRV.push(GRD[k]); k = k + 1; }
  grSync();
}
function grSync() {
  grKeep = GRV[1]; grDay = GRV[2]; grMobs = GRV[3]; grRegen = GRV[4]; grFall = GRV[5]; grWeather = GRV[6]; grLoot = GRV[7]; grTileDrops = GRV[8]; grGrief = GRV[9]; grFireTick = GRV[10];
  grDrown = GRV[11]; grFire = GRV[12]; grImmediate = GRV[13]; grTick = GRV[14]; grCbOut = GRV[15]; grFeedback = GRV[16]; grDeathMsg = GRV[17]; grSpawnR = GRV[18];
}
function grFind(nm) {
  let k = 1, r = 0;
  while (k <= GRN.length) { if (GRN[k] == nm) { r = k; } k = k + 1; }
  return r;
}
function grText(k) {
  let r = `${GRV[k]}`;
  if (GRINT[k] == 0) { r = 'false'; if (GRV[k] == 1) { r = 'true'; } }
  return r;
}

// ---------------------------------------------------------------- words
let CMW = [];
function cmdSplit(s) {
  CMW = [];
  let i = 1, n = strlen(s), st = 1, depth = 0;
  while (i <= n + 1) {
    let sp = 0, c = '';
    if (i > n) { sp = 1; } else {
      c = charAt(s, i);
      if (c == '[' || c == '{') { depth = depth + 1; }
      if (c == ']' || c == '}') { depth = depth - 1; }
      // (a space: by indexOf, since ' ' == '0' as numbers)
      if (depth <= 0) { if (indexOf(' ', c) == 1) { sp = 1; } }
    }
    if (sp == 1) { if (i > st) { CMW.push(substr(s, st, i - 1)); } st = i + 1; }
    i = i + 1;
  }
}
function lower(w) {
  let n = strlen(w), r = w;
  if (n > 0) {
    let up = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lo = 'abcdefghijklmnopqrstuvwxyz';
    let c = charAt(w, 1), k = indexOf(up, c);
    if (k > 0) { c = charAt(lo, k); }
    r = c;
    let i = 2;
    while (i <= n) { c = charAt(w, i); k = indexOf(up, c); if (k > 0) { c = charAt(lo, k); } r = `${r}${c}`; i = i + 1; }
  }
  return r;
}
function wordsFrom(a, b) {
  let r = cw(a), i = a + 1;
  while (i <= b) { r = `${r} ${cw(i)}`; i = i + 1; }
  return r;
}
function cw(k) {
  let r = '';
  if (k <= CMW.length) { r = CMW[k]; }
  return r;
}
function isNum(w) {
  let r = 0;
  if (strlen(w) > 0) { if (w * 1 == w * 1) { if (indexOf('0123456789-.', charAt(w, 1)) > 0) { r = 1; } } }
  return r;
}
// the name without its namespace (minecraft: / blockworld:)
function bare(nm) {
  // ((v2.6.1) only a name's own minecraft: - the one in diamond_sword{Enchantments:[..]} cut the name off)
  let c = indexOf(nm, ':'), b1 = indexOf(nm, '['), b2 = indexOf(nm, '{');
  if (c > 0 && c < strlen(nm) && (b1 == 0 || c < b1) && (b2 == 0 || c < b2)) { nm = substr(nm, c + 1, strlen(nm)); }
  return nm;
}
// text in quotes or a {"text": ...} loses them
function plainText(s) {
  let t = indexOf(s, '"text":"');
  if (t > 0) { s = substr(s, t + 8, strlen(s)); let e = indexOf(s, '"'); if (e > 0) { s = substr(s, 1, e - 1); } }
  if (charAt(s, 1) == '"') { s = substr(s, 2, strlen(s) - 1); }
  return s;
}
// an item by its key, Korean name or number (0: none)
function itemByName(nm) {
  nm = bare(nm);
  let br = indexOf(nm, '['); if (br > 0) { nm = substr(nm, 1, br - 1); }
  let br2 = indexOf(nm, '{'); if (br2 > 0) { nm = substr(nm, 1, br2 - 1); }
  let r = 0, id = 1, nk = replace(nm, '_', ' ');
  if (isNum(nm) == 1) { if (nm * 1 > 0) { if (nm * 1 < NITEM) { r = Math.floor(nm * 1); } } }
  while (id < NITEM && r == 0) {
    if (ITKEY[id + 1] == nm) { r = id; } else { if (ITNAME[id + 1] == nm || ITNAME[id + 1] == nk) { r = id; } }
    id = id + 1;
  }
  if (r > 0) { if (ITNAME[r + 1] == ' ') { r = 0; } }
  return r;
}
// a block by name with its states: bState is the block itself (a variant)
function blockByName(nm) {
  nm = bare(nm);
  let st = '', br = indexOf(nm, '[');
  if (br > 0) { st = substr(nm, br + 1, strlen(nm) - 1); nm = substr(nm, 1, br - 1); }
  let r = 0 - 1, id = 0, nk = replace(nm, '_', ' ');
  if (nm == 'air' || nm == 'cave_air' || nm == '공기') { r = 0; }
  if (nm == 'water') { r = 7; } if (nm == 'lava') { r = 35; }
  while (id < NBLOCK && r < 0) {
    if (ITKEY[id + 1] == nm || ITNAME[id + 1] == nm || ITNAME[id + 1] == nk) { if (BSTATE[id + 1] == 0) { r = id; } }
    id = id + 1;
  }
  // (a variant by its own key: wheat_3, farmland_moist ...)
  id = 0;
  while (id < NBLOCK && r < 0) { if (ITKEY[id + 1] == nm) { r = id; } id = id + 1; }
  if (r > 0) { if (strlen(st) > 0) { r = r + stateOf(r, st); } }
  return r;
}
function stateOf(b, st) {
  let pl = BPLC[b + 1], f = 0 - 1, half = 0, typ = 0, ax = 0, age = 0 - 1, op = 0, lit = 0, v = 0;
  if (indexOf(st, 'facing=south') > 0) { f = 0; } if (indexOf(st, 'facing=east') > 0) { f = 1; } if (indexOf(st, 'facing=north') > 0) { f = 2; } if (indexOf(st, 'facing=west') > 0) { f = 3; }
  if (indexOf(st, 'half=top') > 0 || indexOf(st, 'half=upper') > 0) { half = 1; }
  if (indexOf(st, 'type=top') > 0) { typ = 1; } if (indexOf(st, 'type=double') > 0) { typ = 2; }
  if (indexOf(st, 'axis=x') > 0) { ax = 1; } if (indexOf(st, 'axis=z') > 0) { ax = 2; }
  if (indexOf(st, 'open=true') > 0) { op = 1; } if (indexOf(st, 'lit=true') > 0 || indexOf(st, 'powered=true') > 0) { lit = 1; }
  let ag = indexOf(st, 'age=');
  if (ag > 0) { age = Math.min(3, substr(st, ag + 4, ag + 4) * 1); }
  if (f < 0) { f = 0; }
  if (pl == P_STAIRS) { v = f + half * 4; }
  if (pl == P_SLAB) { v = typ; }
  if (pl == P_AXIS) { if (ax == 1) { v = BAXX[b + 1] - b; } if (ax == 2) { v = BAXZ[b + 1] - b; } }
  if (pl == P_BED) { v = f + half * 4; }
  if (pl == P_LADDER) { v = mod(f + 2, 4); }
  if (pl == P_GATE) { v = mod(f, 2) + op * 2; }
  if (pl == P_TRAPDOOR) { v = half; if (op == 1) { v = 2 + half * 4 + f; } }
  if (pl == P_DOOR) { v = op * 8 + half * 4 + mod(f + 2, 4); }
  if (pl == P_RAIL) { v = mod(f, 2); }
  if (BCROP[b + 1] >= 0) { if (age >= 0) { v = age; } }
  if (BSPEC[b + 1] == 2) { v = 0; if (lit == 1) { v = I_sparkLampOn - b; } }
  if (BRS[b + 1] == RS_WIRE || BRS[b + 1] == RS_REPEATER || BRS[b + 1] == RS_COMPARATOR || BRS[b + 1] == RS_TORCH || BRS[b + 1] == RS_LEVER || BRS[b + 1] == RS_BUTTON || BRS[b + 1] == RS_OBSERVER || BRS[b + 1] == RS_PISTON || BRS[b + 1] == RS_DISPENSER) { v = rsState(b, st); }
  // (v2.5) the ones whose states are not right after them: tripwire hooks (facing: the way the hook
  // points, away from its wall), note blocks (note=0..24), rails (shape=..., powered=)
  if (BRS[b + 1] == RS_HOOK) { v = hookId(OP6[F2D[f + 1] + 1], lit) - b; }
  if (BRS[b + 1] == RS_RAIL) { v = railState(b, st) - b; }
  if (BRS[b + 1] == RS_TRIP) { if (indexOf(st, 'east=true') > 0 || indexOf(st, 'west=true') > 0) { v = I_tripwire_x - b; } }
  if (BRS[b + 1] == RS_NOTE) { let nt = indexOf(st, 'note='); if (nt > 0) { let p = substr(st, nt + 5, nt + 5) * 1; if (strlen(st) >= nt + 6) { let c2 = indexOf('0123456789', substr(st, nt + 6, nt + 6)); if (c2 > 0) { p = p * 10 + c2 - 1; } } v = noteId(Math.max(0, Math.min(24, p))) - b; } }
  return v;
}
function effectByName(nm) {
  nm = bare(nm);
  let r = 0, k = 1;
  let nk = replace(nm, '_', ' ');
  while (k <= 12) { if (EFK[k] == nm || EFKO[k] == nm || EFKO[k] == nk) { r = k; } k = k + 1; }
  return r;
}
function mobByName(nm) {
  nm = bare(nm);
  let r = 0, k = 1;
  let nk = replace(nm, '_', ' ');
  while (k <= NMOBT) { if (MKEY[k] == nm || MNAME[k] == nm || MNAME[k] == nk) { r = k; } k = k + 1; }
  return r;
}

// ---------------------------------------------------------------- where: the command's own place
let cmdX = 0, cmdY = 0, cmdZ = 0, cmdYaw = 0, cmdPitch = 0, cmdFromBlock = 0;
let cX = 0, cY = 0, cZ = 0, cOk = 0;
// three coordinate words from a: cX cY cZ (cOk 0 when they are not coordinates)
function coords(a) {
  let wx = cw(a), wy = cw(a + 1), wz = cw(a + 2);
  cOk = 0;
  if (CMW.length >= a + 2) {
    if (charAt(wx, 1) == '^') {
      let l = relOf(wx), u = relOf(wy), f = relOf(wz);
      // left, up, forward from where the command looks
      let sy = sind(cmdYaw), cyw = cosd(cmdYaw), sp = sind(cmdPitch), cp = cosd(cmdPitch);
      let fx2 = sy * cp, fy2 = sp, fz2 = cyw * cp, lx2 = 0 - cyw, lz2 = sy, ux2 = 0 - sy * sp, uy2 = cp, uz2 = 0 - cyw * sp;
      cX = cmdX + lx2 * l + ux2 * u + fx2 * f; cY = cmdY + uy2 * u + fy2 * f; cZ = cmdZ + lz2 * l + uz2 * u + fz2 * f;
      cOk = 1;
    } else {
      if ((isNum(wx) == 1 || charAt(wx, 1) == '~') && (isNum(wy) == 1 || charAt(wy, 1) == '~') && (isNum(wz) == 1 || charAt(wz, 1) == '~')) {
        cX = coordOf(wx, cmdX); cY = coordOf(wy, cmdY); cZ = coordOf(wz, cmdZ); cOk = 1;
        // (a whole number in x or z is the middle of the block, as the genre does)
        if (charAt(wx, 1) != '~') { if (indexOf(wx, '.') == 0) { cX = cX + 0.5; } }
        if (charAt(wz, 1) != '~') { if (indexOf(wz, '.') == 0) { cZ = cZ + 0.5; } }
      }
    }
  }
}
function relOf(w) { let rr = 0; if (strlen(w) > 1) { rr = substr(w, 2, strlen(w)) * 1; } return rr; }
function coordOf(w, here) {
  let r = w * 1;
  if (charAt(w, 1) == '~') { r = here; if (strlen(w) > 1) { r = here + substr(w, 2, strlen(w)) * 1; } }
  return r;
}

// ---------------------------------------------------------------- targets
// SEL: 0 the player, e > 0 the mobs; selN how many
// (v2.3) SELR: the other players on the server (their slots), selBad 1: not a selector
let SEL = [], selN = 0, selPlayer = 0, SELR = [], selBad = 0;
function selParse(w) {
  SEL = []; selN = 0; selPlayer = 0; SELR = []; selBad = 0;
  if (charAt(w, 1) == '@') {
    let k = charAt(w, 2), args = '';
    let br = indexOf(w, '[');
    if (br > 0) { args = substr(w, br + 1, strlen(w) - 1); }
    let ty = 0, neg = 0, dmin = 0 - 1, dmax = 0 - 1, lim = 0, srt = 0, hasT = 0;
    let t = indexOf(args, 'type=');
    if (t > 0) {
      let rest = substr(args, t + 5, strlen(args)), cm = indexOf(rest, ',');
      if (cm > 0) { rest = substr(rest, 1, cm - 1); }
      if (charAt(rest, 1) == '!') { neg = 1; rest = substr(rest, 2, strlen(rest)); }
      ty = mobByName(rest); hasT = 1;
      if (bare(rest) == 'player') { ty = 0 - 1; }
      if (ty == 0) { ty = 0 - 2; }
    }
    let di = indexOf(args, 'distance=');
    if (di > 0) {
      let rest = substr(args, di + 9, strlen(args)), cm = indexOf(rest, ',');
      if (cm > 0) { rest = substr(rest, 1, cm - 1); }
      let dd = indexOf(rest, '..');
      if (dd == 0) { dmin = rest * 1; dmax = rest * 1; }
      else { if (dd > 1) { dmin = substr(rest, 1, dd - 1) * 1; } if (dd + 1 < strlen(rest)) { dmax = substr(rest, dd + 2, strlen(rest)) * 1; } }
    }
    let li = indexOf(args, 'limit=');
    if (li > 0) { let rest = substr(args, li + 6, strlen(args)), cm = indexOf(rest, ','); if (cm > 0) { rest = substr(rest, 1, cm - 1); } lim = Math.floor(rest * 1); }
    if (indexOf(args, 'sort=nearest') > 0) { srt = 1; } if (indexOf(args, 'sort=furthest') > 0) { srt = 2; } if (indexOf(args, 'sort=random') > 0) { srt = 3; }
    if (k == 'p' || k == 's' || k == 'a' || k == 'r') { selAdd(0); }
    if (k != 'p' && k != 's' && k != 'a' && k != 'r' && k != 'e') { selBad = 1; }
    let plOk = 1;
    if (hasT == 1) { if (ty == 0 - 1) { plOk = 1 - neg; } else { plOk = neg; } }
    if (k == 'e') {
      // the player: no type, type=player, or type=!<a mob>
      let pOk = 0;
      if (hasT == 0) { pOk = 1; } else { if (ty == 0 - 1) { pOk = 1 - neg; } else { if (ty > 0 || ty == 0 - 2) { pOk = neg; } } }
      if (pOk == 1) { selAdd(0); }
      let e = 1;
      while (e <= NMOB) {
        if (ET[e] > 0 && ET[e] != M_NETPLAYER) {
          let okT = 1;
          if (ty > 0) { if (ET[e] != ty) { okT = 0; } if (neg == 1) { okT = 1 - okT; } }
          if (ty == 0 - 1) { okT = neg; }
          if (ty == 0 - 2) { okT = neg; }
          if (okT == 1) { selAdd(e); }
        }
        e = e + 1;
      }
    }
    // the distance from the command's place
    if (dmin >= 0 || dmax >= 0) {
      let k2 = selN;
      while (k2 >= 1) {
        let d = selDist(SEL[k2]);
        if ((dmin >= 0 && d < dmin) || (dmax >= 0 && d > dmax)) { SEL.removeAt(k2); }
        k2 = k2 - 1;
      }
      selN = SEL.length;
    }
    if (srt == 1 || srt == 2 || k == 'p') { selSort(srt); }
    if (k == 'r' || srt == 3) { if (selN > 1) { let q = rand(1, selN); let t2 = SEL[1]; SEL[1] = SEL[q]; SEL[q] = t2; } }
    if (k == 'p' || k == 'r' || k == 's') { if (lim == 0) { lim = 1; } }
    if (lim > 0) { if (selN > lim) { selN = lim; } }
    let q2 = 1;
    while (q2 <= selN) { if (SEL[q2] == 0) { selPlayer = 1; } q2 = q2 + 1; }
    if (netSrv > 0 && cmdFromBlock != 2) { selOthers(k, plOk, dmin, dmax, lim); }
  } else {
    // a name: the player (alone in this world); on a server, the one of that name
    if (strlen(w) > 0) {
      if (netSrv > 0 && cmdFromBlock != 2) {
        if (w == netNick) { selAdd(0); selPlayer = 1; }
        else { let j = 1; while (j <= NSLOT) { if (j != netMy) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (NNICK[j] == w) { SELR.push(j); } } } } j = j + 1; } }
        // (v2.4.5) none by the very name: the one whose name it is but for capitals (as the genre)
        if (selPlayer == 0 && SELR.length == 0) {
          let lw = lower(w);
          if (lower(netNick) == lw) { selAdd(0); selPlayer = 1; }
          else { let j = 1; while (j <= NSLOT) { if (j != netMy) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (lower(NNICK[j]) == lw) { if (SELR.length == 0) { SELR.push(j); } } } } } j = j + 1; } }
        }
      } else { selAdd(0); selPlayer = 1; }
    }
  }
}
// the other players on the server a selector finds (into SELR)
function selOthers(k, plOk, dmin, dmax, lim) {
  if (plOk == 1 && (k == 'a' || k == 'e' || k == 'p' || k == 'r')) {
    let j = 1;
    while (j <= NSLOT) {
      if (j != netMy) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (NSTT[j] >= 1) {
        let ok = 1;
        if (dmin >= 0 || dmax >= 0) {
          if (NDIM[j] != dim) { ok = 0; }
          else { let d = Math.sqrt((NPX[j] - cmdX) * (NPX[j] - cmdX) + (NPY[j] - cmdY) * (NPY[j] - cmdY) + (NPZ[j] - cmdZ) * (NPZ[j] - cmdZ)); if ((dmin >= 0 && d < dmin) || (dmax >= 0 && d > dmax)) { ok = 0; } }
        }
        if (ok == 1) { SELR.push(j); }
      } } } }
      j = j + 1;
    }
    // @p: the nearest of all (in this world); @r: one of all
    if (k == 'p') {
      let best = 0, bd = 999999999;
      if (selPlayer == 1) { bd = selDist(0); }
      let q = 1;
      while (q <= SELR.length) { let o = SELR[q]; if (NDIM[o] == dim) { let d = Math.sqrt((NPX[o] - cmdX) * (NPX[o] - cmdX) + (NPY[o] - cmdY) * (NPY[o] - cmdY) + (NPZ[o] - cmdZ) * (NPZ[o] - cmdZ)); if (d < bd) { bd = d; best = o; } } q = q + 1; }
      SELR = [];
      if (best > 0) { SELR.push(best); selNoMe(); }
    }
    if (k == 'r') {
      let tot = SELR.length + selPlayer;
      if (tot > 0) {
        let q = rand(1, tot);
        if (q <= SELR.length) { let o = SELR[q]; SELR = []; SELR.push(o); selNoMe(); } else { SELR = []; }
      }
    }
    if (lim > 0) { while (SELR.length > 0 && SELR.length + selN > lim) { SELR.removeAt(SELR.length); } }
  }
}
function selNoMe() {
  let q = SEL.length;
  while (q >= 1) { if (SEL[q] == 0) { SEL.removeAt(q); } q = q - 1; }
  selN = SEL.length; selPlayer = 0;
}
function selAdd(e) { SEL.push(e); selN = SEL.length; }
function selDist(e) {
  let x = px, y = py, z = pz;
  if (e > 0) { x = EX[e]; y = EY[e]; z = EZ[e]; }
  return Math.sqrt((x - cmdX) * (x - cmdX) + (y - cmdY) * (y - cmdY) + (z - cmdZ) * (z - cmdZ));
}
function selSort(srt) {
  let i = 2;
  while (i <= selN) {
    let j = i;
    while (j > 1) {
      let a = selDist(SEL[j - 1]), b = selDist(SEL[j]), sw = 0;
      if (srt == 2) { if (a < b) { sw = 1; } } else { if (a > b) { sw = 1; } }
      if (sw == 1) { let t = SEL[j]; SEL[j] = SEL[j - 1]; SEL[j - 1] = t; j = j - 1; } else { j = 1; }
    }
    i = i + 1;
  }
}
function isSel(w) {
  let r = 0;
  if (charAt(w, 1) == '@') { r = 1; }
  return r;
}

// ---------------------------------------------------------------- the chat
// CHT: the last six lines (each shown for 10 s); (v2.6) CHL: all of them (the last 100), seen with
// the chat open (T): 12 lines over the line typed, the newest at the bottom, the wheel or
// PgUp / PgDn going back (chScroll: the lines under the ones shown)
let CHT = [], CHTT = [], CHL = [], chScroll = 0;
function chatAdd(s) {
  if (CHT.length >= 6) { CHT.removeAt(1); CHTT.removeAt(1); }
  CHT.push(s); CHTT.push(10);
  CHL.push(s); if (CHL.length > 100) { CHL.removeAt(1); }
  // (looking back: the lines shown stay put)
  if (chScroll > 0) { chScroll = Math.min(chScroll + 1, Math.max(0, CHL.length - 12)); }
}
function chatSlot(j) { let r = 103 + j; if (j > 6) { r = 133 + j; } return r; }
function chatHud(dt) {
  let k = 1, y = -60 - (CHT.length - 1) * 10;
  while (k <= CHT.length) { CHTT[k] = CHTT[k] - dt; k = k + 1; }
  if (uiMode == 9) {
    let j = 1;
    while (j <= 12) {
      let i = CHL.length - chScroll - j + 1, s = chatSlot(j);
      if (i >= 1) { tx(s, CHL[i], -236, -20 + (j - 1) * 10, 7, '#ffffff', 1); } else { txOff(s); }
      j = j + 1;
    }
  } else {
    k = 1;
    while (k <= 6) {
      if (k <= CHT.length) {
        if (CHTT[k] > 0) { tx(103 + k, CHT[k], -236, y + (k - 1) * 10, 7, '#ffffff', 1); } else { txOff(103 + k); }
      } else { txOff(103 + k); }
      k = k + 1;
    }
    k = 140;
    while (k <= 145) { txOff(k); k = k + 1; }
  }
}
function chatScroll(n) { chScroll = Math.max(0, Math.min(Math.max(0, CHL.length - 12), chScroll + n)); }
function cmdOut(s) { if (grFeedback == 1 || cmdFromBlock == 0) { if (strlen(s) > 0) { chatAdd(s); } } }
// The line typed after T or / is read from the keys by the game itself: tessvm's answer box hands
// the keyboard's focus to the page when it closes, and W A S D did nothing until a click.
// Every key press (the held ones' repeats too) comes in as an event (KQ, with Shift in KQS).
let typing = 0, tline = '', tBlink = 0, KQ = [], KQS = [], CHH = [], chH = 0;
function kq(c) {
  if (typing == 1) { KQ.push(c); if (key(16)) { KQS.push(1); } else { KQS.push(0); } }
}
on('key:65', 'pen', function () { kq(65); });
on('key:66', 'pen', function () { kq(66); });
on('key:67', 'pen', function () { kq(67); });
on('key:68', 'pen', function () { kq(68); });
on('key:69', 'pen', function () { kq(69); });
on('key:70', 'pen', function () { kq(70); });
on('key:71', 'pen', function () { kq(71); });
on('key:72', 'pen', function () { kq(72); });
on('key:73', 'pen', function () { kq(73); });
on('key:74', 'pen', function () { kq(74); });
on('key:75', 'pen', function () { kq(75); });
on('key:76', 'pen', function () { kq(76); });
on('key:77', 'pen', function () { kq(77); });
on('key:78', 'pen', function () { kq(78); });
on('key:79', 'pen', function () { kq(79); });
on('key:80', 'pen', function () { kq(80); });
on('key:81', 'pen', function () { kq(81); });
on('key:82', 'pen', function () { kq(82); });
on('key:83', 'pen', function () { kq(83); });
on('key:84', 'pen', function () { kq(84); });
on('key:85', 'pen', function () { kq(85); });
on('key:86', 'pen', function () { kq(86); });
on('key:87', 'pen', function () { kq(87); });
on('key:88', 'pen', function () { kq(88); });
on('key:89', 'pen', function () { kq(89); });
on('key:90', 'pen', function () { kq(90); });
on('key:48', 'pen', function () { kq(48); });
on('key:49', 'pen', function () { kq(49); });
on('key:50', 'pen', function () { kq(50); });
on('key:51', 'pen', function () { kq(51); });
on('key:52', 'pen', function () { kq(52); });
on('key:53', 'pen', function () { kq(53); });
on('key:54', 'pen', function () { kq(54); });
on('key:55', 'pen', function () { kq(55); });
on('key:56', 'pen', function () { kq(56); });
on('key:57', 'pen', function () { kq(57); });
on('key:96', 'pen', function () { kq(96); });
on('key:97', 'pen', function () { kq(97); });
on('key:98', 'pen', function () { kq(98); });
on('key:99', 'pen', function () { kq(99); });
on('key:100', 'pen', function () { kq(100); });
on('key:101', 'pen', function () { kq(101); });
on('key:102', 'pen', function () { kq(102); });
on('key:103', 'pen', function () { kq(103); });
on('key:104', 'pen', function () { kq(104); });
on('key:105', 'pen', function () { kq(105); });
on('key:106', 'pen', function () { kq(106); });
on('key:107', 'pen', function () { kq(107); });
on('key:109', 'pen', function () { kq(109); });
on('key:110', 'pen', function () { kq(110); });
on('key:111', 'pen', function () { kq(111); });
on('key:189', 'pen', function () { kq(189); });
on('key:187', 'pen', function () { kq(187); });
on('key:219', 'pen', function () { kq(219); });
on('key:221', 'pen', function () { kq(221); });
on('key:186', 'pen', function () { kq(186); });
on('key:222', 'pen', function () { kq(222); });
on('key:188', 'pen', function () { kq(188); });
on('key:190', 'pen', function () { kq(190); });
on('key:191', 'pen', function () { kq(191); });
on('key:192', 'pen', function () { kq(192); });
on('key:220', 'pen', function () { kq(220); });
on('key:32', 'pen', function () { kq(32); });
on('key:8', 'pen', function () { kq(8); });
on('key:13', 'pen', function () { kq(13); });
on('key:9', 'pen', function () { kq(9); });
on('key:27', 'pen', function () { kq(27); });
on('key:38', 'pen', function () { kq(38); });
on('key:33', 'pen', function () { kq(33); });
on('key:34', 'pen', function () { kq(34); });
on('key:40', 'pen', function () { kq(40); });
// 한/영 (Lang1: 21; on some keyboards it is the right Alt: 18) switches Korean and Latin
on('key:21', 'pen', function () { kq(21); });
on('key:18', 'pen', function () { kq(18); });
function chatOpen(pre) {
  // (2: the key that opened it is not typed; from the next frame 1)
  uiMode = 9; typing = 2; tline = pre; KQ = []; KQS = []; chH = CHH.length + 1; tBlink = 0; chScroll = 0;
  hanClear(); acCyc = 0; acDirty = 1;
}
function chatClose() {
  typing = 0; uiMode = 0; txOff(123); txOff(122); KQ = []; KQS = []; hanClear(); ACL = []; acCyc = 0;
}
// the keys typed since the last frame, and the line on the screen
function chatType(dt) {
  let i = 1;
  while (i <= KQ.length) {
    if (typing == 1) {
      let c = KQ[i], sh = KQS[i];
      if (c != 9) { acCyc = 0; acDirty = 1; }
      if (c == 13) { hanCommit(); chatSend(); }
      else { if (c == 9) { hanCommit(); acTab(sh); }
      else { if (c == 27) { chatClose(); }
      else { if (c == 21 || c == 18) { hanCommit(); hanMode = 1 - hanMode; }
      else { if (c == 8) { if (hanBack() == 0) { if (strlen(tline) <= 1) { tline = ''; } else { tline = substr(tline, 1, strlen(tline) - 1); } } }
      else { if (c == 33) { chatScroll(6); }
      else { if (c == 34) { chatScroll(0 - 6); }
      else { if (c == 38) { hanClear(); if (chH > 1) { chH = chH - 1; tline = CHH[chH]; } }
      else { if (c == 40) { hanClear(); if (chH < CHH.length) { chH = chH + 1; tline = CHH[chH]; } else { chH = CHH.length + 1; tline = ''; } }
      else { if (strlen(tline) < 240) { if (hanMode == 1 && c >= 65 && c <= 90) { hanKey(c, sh); } else { hanCommit(); typeKey(c, sh); } } } } } } } } } } }
    }
    i = i + 1;
  }
  KQ = []; KQS = [];
  // (the wheel: up goes back)
  while (wheelAcc <= 0 - 1) { chatScroll(3); wheelAcc = wheelAcc + 1; }
  while (wheelAcc >= 1) { chatScroll(0 - 3); wheelAcc = wheelAcc - 1; }
  if (typing == 2) { typing = 1; }
  if (typing == 1) {
    tBlink = tBlink + dt;
    hanStr();
    let line = `${tline}${hcS}`;
    if (acDirty == 1) { acDirty = 0; acBuild(line); }
    acShow();
    let cur = ' '; if (mod(Math.floor(tBlink * 2), 2) == 0) { cur = '_'; }
    let md = 'A'; if (hanMode == 1) { md = '한'; }
    tx(123, `> ${line}${cur}   [${md}] 한/영: 한글·영어  Tab: 자동완성  휠: 지난 대화`, -236, -42, 8, '#ffff80', 1);
  }
}
function typeKey(c, sh) {
  if (c >= 65 && c <= 90) { if (sh == 1) { tline = tline + charAt('ABCDEFGHIJKLMNOPQRSTUVWXYZ', c - 64); } else { tline = tline + charAt('abcdefghijklmnopqrstuvwxyz', c - 64); } }
  if (c >= 48 && c <= 57) { if (sh == 1) { tline = tline + charAt(')!@#$%^&*(', c - 47); } else { tline = tline + charAt('0123456789', c - 47); } }
  if (c >= 96 && c <= 105) { tline = tline + charAt('0123456789', c - 95); }
  if (c == 106) { tline = tline + '*'; } if (c == 107) { tline = tline + '+'; } if (c == 109) { tline = tline + '-'; } if (c == 110) { tline = tline + '.'; } if (c == 111) { tline = tline + '/'; }
  if (c == 32) { tline = tline + ' '; }
  let k = 1;
  while (k <= 11) {
    if (c == SYK[k]) { if (sh == 1) { tline = tline + charAt('_+{}:"<>?~|', k); } else { tline = tline + charAt("-=[];',./`\\", k); } }
    k = k + 1;
  }
}
let SYK = [189, 187, 219, 221, 186, 222, 188, 190, 191, 192, 220];
function chatSend() {
  let s = tline;
  chatClose();
  chatRun(s);
}
function chatRun(s) {
  if (strlen(s) > 0) {
    CHH.push(s); if (CHH.length > 30) { CHH.removeAt(1); }
    if (charAt(s, 1) == '/') { cmdFromBlock = 0; cmdX = px; cmdY = py; cmdZ = pz; cmdYaw = yaw; cmdPitch = pitch; runCommand(s); }
    else {
      if (netSrv > 0) { let t = `<${netNick}> ${netClean(s)}`; chatAdd(t); evAdd('c', t); plugRun('chat', s, netNick); }
      else { chatAdd(`<플레이어> ${s}`); }
    }
  }
}
// after one of tessvm's answer boxes (signs, command blocks, the search) the keys come back with a click
function askDone() {
  hideAnswer();
  if (isTess == 1) { keysLost = 1; msgShow('화면을 한 번 클릭하면 키보드가 다시 듣습니다', 999); }
}
// big words in the middle of the screen
let titleT = 0, titleS = '', subT = '', actT = 0, actS = '';

// ---------------------------------------------------------------- running one
let cmdDepth = 0;
function runCommand(s) {
  if (charAt(s, 1) == '/') { s = substr(s, 2, strlen(s)); }
  if (cmdFromBlock == 0) { if (cmdDepth == 0) { cmdX = px; cmdY = py; cmdZ = pz; cmdYaw = yaw; cmdPitch = pitch; } }
  cmdSplit(s);
  // (minecraft:time is /time)
  let c = lower(bare(cw(1))), out = '';
  CMW[1] = c;
  // (the words but the texts in lower case)
  let i = 2;
  // (v2.4.5) but not a player's name: a nickname with capitals (/tp Bob, /gamemode creative Bob,
  // /give Bob ...) became 'bob' and found nobody; /perm allow kept the name in lower case too
  while (i <= CMW.length) { if (c != 'say' && c != 'tell' && c != 'msg' && c != 'w' && c != 'me' && c != 'title' && c != 'plugin' && c != 'pl' && c != 'plugins' && c != 'server' && c != 'kick' && c != 'ban' && c != 'op' && c != 'deop' && c != 'pardon' && c != 'unban' && c != 'whitelist' && c != 'perm' && c != 'permission' && c != 'perms') { if (isNickWord(CMW[i]) == 0) { CMW[i] = lower(CMW[i]); } } i = i + 1; }
  // on a server: the rights, the server's own commands, the plugins' (netcmd.js)
  netCmdHit = 0;
  if (netSrv > 0) { netCmd(c); }
  else { if (cheatsOn == 0 && cmdFromBlock == 0 && cmdLvDefault(cmdCanon(c)) > 0) { netCmdHit = 1; netCmdOut = '이 세계는 명령어를 쓸 수 없게 만들어졌습니다 (새 세계의 "명령어 허용")'; } }
  if (netCmdHit == 1) { out = netCmdOut; }
  else { if (cmdAim(c) == 1) { out = runCmd(c); if (strlen(aimSent) > 0) { if (strlen(out) > 0) { out = `${out} (+ ${aimSent})`; } } } else { out = cmdAimOut; } }
  // (a text local starts as 0 in Entry: no message is 0)
  if (strlen(out) > 0) { if (out != 0) { cmdOut(out); } }
}
// (v2.4.5) a word that is a player's name as it is written (Entry's = tells capitals apart)
function isNickWord(w) {
  let r = 0;
  if (w == netNick || w == SUPER) { r = 1; }
  if (netSrv > 0) {
    if (w == shOwner) { r = 1; }
    let j = 1;
    while (j <= NSLOT) { if (NLIVE[j] == 1) { if (NNICK[j] == w) { r = 1; } } j = j + 1; }
  }
  return r;
}
function runCmd(c) {
  let out = '', a = 2;
  if (c == 'help' || c == '?') { out = cmdHelp(cw(2)); }
  else { if (c == 'give') { out = cmdGive(); }
  else { if (c == 'clear') { out = cmdClear(); }
  else { if (c == 'kill') { out = cmdKill(); }
  else { if (c == 'gamemode' || c == 'defaultgamemode') { out = cmdGamemode(c); }
  else { if (c == 'gamerule') { out = cmdGamerule(); }
  else { if (c == 'effect') { out = cmdEffect(); }
  else { if (c == 'time') { out = cmdTime(); }
  else { if (c == 'weather') { let du = '-'; if (CMW.length >= 3) { du = cw(3); } out = cmdWeather(cw(2), du); }
  else { if (c == 'toggledownfall') { if (wthr > 0) { out = cmdWeather('clear', ''); } else { out = cmdWeather('rain', ''); } }
  else { if (c == 'tp' || c == 'teleport') { out = cmdTp(); }
  else { if (c == 'summon') { out = cmdSummon(); }
  else { if (c == 'setblock') { out = cmdSetblock(); }
  else { if (c == 'fill') { out = cmdFill(); }
  else { if (c == 'clone') { out = cmdClone(); }
  else { if (c == 'difficulty') { out = cmdDifficulty(); }
  else { if (c == 'spawnpoint' || c == 'setworldspawn') { out = cmdSpawnpoint(c); }
  else { if (c == 'seed') { out = `시드: [${seed}]`; }
  else { if (c == 'save-all') { if (canSave() == 1) { saveGame(1); out = '세계를 저장했습니다'; } else { out = '저장할 수 없습니다: tessvm(또는 엔트리 저장 관리자 확장)에서 실행해야 합니다'; } }
  else { if (c == 'say') { out = `[플레이어] ${plainText(wordsFrom(2, CMW.length))}`; }
  else { if (c == 'me') { out = `* 플레이어 ${wordsFrom(2, CMW.length)}`; }
  else { if (c == 'tell' || c == 'msg' || c == 'w') { out = `플레이어이(가) 속삭입니다: ${wordsFrom(3, CMW.length)}`; }
  else { if (c == 'list') { out = '접속한 플레이어 1명 중 1명: 플레이어'; }
  else { if (c == 'locate') { if (cw(2) == 'structure') { out = cmdLocate(bare(cw(3))); } else { if (cw(2) == 'biome') { out = cmdLocateBiome(bare(cw(3))); } else { out = cmdLocate(bare(cw(2))); } } }
  else { if (c == 'locatebiome') { out = cmdLocateBiome(bare(cw(2))); }
  else { if (c == 'title') { out = cmdTitle(); }
  else { if (c == 'xp' || c == 'experience') { out = cmdXp(); }
  else { if (c == 'execute') { out = cmdExecute(); }
  else { if (c == 'spectate') { out = cmdSpectate(); }
  else { if (c == 'replaceitem' || c == 'item') { out = cmdReplaceItem(); }
  else { if (c == 'playsound') { sndPlay(6); out = `소리를 냈습니다: ${cw(2)}`; }
  else { if (c == 'enchant') { out = cmdEnchant(); }
  else { if (c == 'kick' || c == 'ban' || c == 'op' || c == 'deop' || c == 'whitelist' || c == 'pardon' || c == 'publish') { out = '혼자 하는 세계라 쓸 수 없습니다'; }
  else { if (c == 'particle' || c == 'stopsound' || c == 'recipe' || c == 'advancement' || c == 'scoreboard' || c == 'data' || c == 'function' || c == 'tag' || c == 'team' || c == 'bossbar' || c == 'forceload' || c == 'datapack' || c == 'reload' || c == 'debug' || c == 'trigger' || c == 'worldborder' || c == 'attribute' || c == 'loot' || c == 'schedule' || c == 'teammsg' || c == 'stop') { out = `이 세계에는 없는 기능의 명령어입니다: /${c}`; }
  else { out = `알 수 없는 명령어입니다: /${c} (/help)`; } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } } }
  return out;
}
function cmdHelp(w) {
  let r = '/give /clear /kill /gamemode /defaultgamemode /gamerule /effect /time /weather /toggledownfall /tp /summon /setblock /fill /clone /difficulty /spawnpoint /setworldspawn /seed /say /me /tell /list /locate /locatebiome /title /xp /execute /spectate /replaceitem /playsound /enchant (/help 명령어)';
  if (w == 'give') { r = '/give <대상> <아이템>[개수] 예: /give @s oak_planks 64'; }
  if (w == 'fill') { r = '/fill <x1 y1 z1> <x2 y2 z2> <블록> [destroy|hollow|keep|outline|replace <블록>] (최대 32768칸)'; }
  if (w == 'setblock') { r = '/setblock <x y z> <블록>[상태] [destroy|keep|replace] 예: /setblock ~ ~ ~2 oak_stairs[facing=east]'; }
  if (w == 'clone') { r = '/clone <x1 y1 z1> <x2 y2 z2> <x y z> [replace|masked] [normal|force|move]'; }
  if (w == 'tp' || w == 'teleport') { r = '/tp <x y z> · /tp <대상> · /tp <대상> <x y z> · ~ 상대, ^ 시선 기준'; }
  if (w == 'summon') { r = '/summon <몹> [x y z] 예: /summon zombie ~ ~ ~3 · 몹: pig cow sheep chicken zombie skeleton spider wraith toad wanderer villager golem bombshroom raider ashpig ashboar blackskel boat lightning_bolt tnt'; }
  if (w == 'gamemode') { r = '/gamemode survival|creative|adventure|spectator [대상]'; }
  if (w == 'gamerule') { r = '/gamerule <규칙> [값] 규칙: keepInventory doDaylightCycle doMobSpawning naturalRegeneration fallDamage doWeatherCycle doMobLoot doTileDrops mobGriefing doFireTick drowningDamage fireDamage doImmediateRespawn randomTickSpeed commandBlockOutput sendCommandFeedback showDeathMessages spawnRadius'; }
  if (w == 'effect') { r = '/effect give <대상> <효과> [초] [단계] · /effect clear [대상] [효과] 효과: speed slowness haste jump_boost regeneration resistance fire_resistance night_vision saturation levitation slow_falling water_breathing'; }
  if (w == 'time') { r = '/time set day|noon|night|midnight|<틱>[d|s|t] · /time add <틱> · /time query daytime|gametime|day'; }
  if (w == 'weather') { r = '/weather clear|rain|thunder [초]'; }
  if (w == 'locate') { r = '/locate village|desert_pyramid|jungle_temple|swamp_hut|igloo|pillager_outpost|mansion|monument|shipwreck|ocean_ruin|buried_treasure|ruined_portal|stronghold|mineshaft|fortress|bastion_remnant|void_city'; }
  if (w == 'execute') { r = '/execute [as <대상>] [at <대상>] [positioned <x y z>] [facing <x y z>] run <명령어>'; }
  if (w == 'title') { r = '/title <대상> title|subtitle|actionbar|clear|reset <글>'; }
  if (w == 'xp' || w == 'experience') { r = '/xp add|set|query <대상> <양> [levels|points]'; }
  return r;
}
function cmdGive() {
  let a = 2;
  selParse(cw(2));
  a = 3;
  // (a Korean name may be words: the longest that names an item, then a count)
  let last = CMW.length, n = 1, id = 0, out = '';
  if (isNum(cw(last)) == 1 && last > a) { n = Math.max(1, Math.min(6400, Math.floor(cw(last) * 1))); last = last - 1; }
  while (last >= a && id == 0) { id = itemByName(wordsFrom(a, last)); if (id == 0) { last = last - 1; } }
  if (id == 0) { out = `알 수 없는 아이템입니다: ${cw(a)}`; }
  else {
    if (selPlayer == 1) { addItem(id, n, 0); if (addLeft > 0) { dropItem(id, addLeft, 0, px, py + 1, pz, 0); } }
    out = `[${ITNAME[id + 1]}] ${n}개를 플레이어에게 주었습니다`;
  }
  if (CMW.length < 3) { out = '/give <대상> <아이템> [개수] 예: /give @s oak_planks 64'; }
  return out;
}
function cmdClear() {
  let id = 0, mx = 0 - 1, n = 0, k = 1;
  if (CMW.length >= 3) { id = itemByName(cw(3)); if (id == 0) { id = 0 - 1; } }
  if (CMW.length >= 4) { mx = Math.floor(cw(4) * 1); }
  if (id < 0) { k = 99; }
  while (k <= 40) {
    if (INVI[k] > 0) { if (id == 0 || INVI[k] == id) {
      let t = INVN[k];
      if (mx >= 0) { t = Math.min(t, mx - n); }
      if (t > 0) { INVN[k] = INVN[k] - t; n = n + t; if (INVN[k] <= 0) { INVI[k] = 0; INVN[k] = 0; INVD[k] = 0; } }
    } }
    k = k + 1;
  }
  let out = `플레이어에게서 아이템 ${n}개를 없앴습니다`;
  if (id < 0) { out = `알 수 없는 아이템입니다: ${cw(3)}`; }
  return out;
}
function cmdKill() {
  let w = cw(2);
  if (CMW.length < 2) { w = '@s'; }
  selParse(w);
  let k = 1, n = 0, me = 0;
  while (k <= selN) {
    let e = SEL[k];
    if (e == 0) { me = 1; } else { if (ET[e] != 10) { if (grLoot == 1) { mobHurt(e, 9999, 0, 0); } ET[e] = 0; n = n + 1; } }
    k = k + 1;
  }
  if (me == 1) { if (mod(gameMode, 2) == 0 || gameMode == 1) { hp = 0; die('명령어로 죽었습니다'); n = n + 1; } }
  return `${n}개의 개체를 없앴습니다`;
}
function modeOf(m) {
  let r = 0 - 1;
  if (m == 'survival' || m == 's' || m == '0') { r = 0; }
  if (m == 'creative' || m == 'c' || m == '1') { r = 1; }
  if (m == 'adventure' || m == 'a' || m == '2') { r = 2; }
  if (m == 'spectator' || m == 'sp' || m == '3') { r = 3; }
  return r;
}
let MODEKO = ['서바이벌', '크리에이티브', '모험', '관전자'], defMode = 0;
function cmdGamemode(c) {
  let m = modeOf(cw(2)), out = '';
  if (m < 0) { out = `/${c} survival|creative|adventure|spectator`; }
  else {
    if (c == 'defaultgamemode') { defMode = m; out = `기본 게임 모드가 ${MODEKO[m + 1]}(으)로 바뀌었습니다`; }
    else { setMode(m); out = `게임 모드가 ${MODEKO[m + 1]}(으)로 바뀌었습니다`; }
  }
  return out;
}
function setMode(m) {
  gameMode = m; specMob = 0; flying = 0;
  if (m == 3) { flying = 1; riding = 0; gliding = 0; }
}
function cmdGamerule() {
  let nm = lower(cw(2)), v = cw(3), k = grFind(nm), out = '';
  if (CMW.length < 2) {
    // ((v2.6.1) /gamerule alone: the rules there are; it said there was no rule called 0)
    out = '게임 규칙:'; let j = 1; while (j <= GRS.length) { out = `${out} ${GRS[j]}`; j = j + 1; }
  } else { if (k == 0) { out = `알 수 없는 게임 규칙입니다: ${cw(2)}`; }
  else {
    if (CMW.length < 3) { out = `게임 규칙 ${GRS[k]}의 현재 값: ${grText(k)}`; }
    else {
      let val = 0 - 1;
      if (GRINT[k] == 0) { if (v == 'true') { val = 1; } if (v == 'false') { val = 0; } }
      else { if (isNum(v) == 1) { val = Math.max(0, Math.floor(v * 1)); } }
      if (val < 0) { out = `잘못된 값입니다: ${v}`; } else { GRV[k] = val; grSync(); out = `게임 규칙 ${GRS[k]}이(가) ${grText(k)}(으)로 바뀌었습니다`; }
    }
  } }
  return out;
}
function cmdEffect() {
  let out = '', w = cw(2), a = 3;
  if (w == 'clear') {
    let k = 0;
    if (CMW.length >= 4) { k = effectByName(cw(4)); }
    if (k > 0) { EFT[k] = 0; out = `${EFKO[k]} 효과를 없앴습니다`; } else { effectsInit(); out = '효과를 모두 없앴습니다'; }
  } else {
    if (w != 'give') { a = 2; }
    if (isSel(cw(a)) == 1) { selParse(cw(a)); a = a + 1; } else { if (w == 'give') { selParse(cw(a)); a = a + 1; } }
    let k = effectByName(cw(a)), sec = 30, lv = 1;
    if (k == 0) { k = effectByName(wordsFrom(a, a + 1)); if (k > 0) { a = a + 1; } }
    if (CMW.length >= a + 1) { sec = Math.max(0, cw(a + 1) * 1); }
    if (CMW.length >= a + 2) { lv = Math.max(1, Math.min(5, Math.floor(cw(a + 2) * 1) + 1)); }
    if (k == 0) { out = '알 수 없는 효과입니다 (/help effect)'; }
    else { if (sec == 0) { EFT[k] = 0; } else { effectAdd(k, sec, lv); } out = `${EFKO[k]} ${romanOf(lv)} 효과를 ${Math.floor(sec)}초 동안 플레이어에게 주었습니다`; }
  }
  return out;
}
function ticksOf(w) {
  let r = 0 - 1, last = ' ', n = w;
  // ((v2.6.1) an empty word: none - charAt(w, 0) stopped the game)
  if (strlen(w) > 0) { last = charAt(w, strlen(w)); }
  if (last == 'd' || last == 's' || last == 't') { n = substr(w, 1, strlen(w) - 1); }
  if (isNum(n) == 1) { r = n * 1; if (last == 'd') { r = r * 24000; } if (last == 's') { r = r * 20; } }
  return r;
}
let gameTicks = 0;
function cmdTime() {
  let s2 = cw(2), w = cw(3), t = 0 - 1, out = '';
  if (s2 == 'query') {
    if (w == 'gametime') { out = `게임 시간: ${Math.floor(gameTicks)}`; } else { if (w == 'day') { out = `날: ${dayN}`; } else { out = `시각: ${Math.floor(tday * 24000)}`; } }
  } else {
    if (w == 'day') { t = 1000; } if (w == 'noon') { t = 6000; } if (w == 'night') { t = 13000; } if (w == 'midnight') { t = 18000; }
    if (w == 'sunrise') { t = 23000; } if (w == 'sunset') { t = 12000; }
    if (t < 0) { t = ticksOf(w); }
    if (s2 == 'add') { if (t >= 0) { dayN = dayN + Math.floor((tday * 24000 + t) / 24000); t = mod(tday * 24000 + t, 24000); } }
    if (t >= 0) { tday = mod(t, 24000) / 24000; out = `시각을 ${Math.floor(mod(t, 24000))}(으)로 맞췄습니다`; netSky(); } else { out = '/time set|add|query (/help time)'; }
  }
  return out;
}
function cmdWeather(w, d) {
  // ((v2.6.1) as 1.16.5: 300 s when no time is given (it was 5 .. 15 min at random), the time in
  // seconds, or with t / s / d (60s, 1d, 6000t: it was taken for no time); on a server everyone's)
  let out = '', sec = 300;
  if (isNum(d) == 1) { sec = d * 1; } else { if (d != '-') { let tk = ticksOf(d); if (tk >= 0) { sec = tk / 20; } } }
  if (w == 'clear') { wthr = 0; wthrT = sec; out = '날씨를 맑음으로 바꿨습니다'; }
  else { if (w == 'rain') { wthr = 1; wthrT = sec; out = '날씨를 비로 바꿨습니다'; }
  else { if (w == 'thunder') { wthr = 2; wthrT = sec; out = '날씨를 뇌우로 바꿨습니다'; } else { out = '/weather clear|rain|thunder [초|60s|1d]'; } } }
  if (strlen(out) > 0) { if (indexOf(out, '/weather') == 0) { netSky(); } }
  return out;
}
// ((v2.6.1) a time or weather set on a server: to everyone (the host's is followed after)
function netSky() { if (netSrv > 0) { if (netSt == 2 && netQuiet == 0) { evAdd('y', `${tday}^${wthr}^${wthrT}`); } } }
// a rotation of the genre's (yaw 90: west, pitch 90: down) as the game's (yaw 90: east, pitch 90: up)
function yawArg(w, here) {
  let r = here;
  if (charAt(w, 1) == '~') { if (strlen(w) > 1) { r = here - substr(w, 2, strlen(w)) * 1; } } else { if (isNum(w) == 1) { r = 0 - w * 1; } }
  return r;
}
function pitchArg(w, here) {
  let r = here;
  if (charAt(w, 1) == '~') { if (strlen(w) > 1) { r = here - substr(w, 2, strlen(w)) * 1; } } else { if (isNum(w) == 1) { r = 0 - w * 1; } }
  return Math.max(0 - 89.5, Math.min(89.5, r));
}
let TPK = [];
// the rotation from the word k on (yaw pitch | facing x y z | facing entity target), for a move to
// (cX, cY, cZ): tpYw, tpPt (-999: none)
let tpYw = 0, tpPt = 0;
function tpRot(k) {
  tpYw = 0 - 999; tpPt = 0 - 999;
  let x0 = cX, y0 = cY, z0 = cZ;
  if (CMW.length >= k) {
    if (cw(k) == 'facing') {
      let fx = 0, fy = 0, fz = 0, got = 0;
      if (cw(k + 1) == 'entity') { selParse(cw(k + 2)); if (selN > 0) { let e = SEL[1]; got = 1; if (e > 0) { fx = EX[e]; fy = EY[e] + 1.5; fz = EZ[e]; } else { fx = px; fy = py + 1.62; fz = pz; } } }
      else { coords(k + 1); if (cOk == 1) { got = 1; fx = cX; fy = cY; fz = cZ; } }
      if (got == 1) { let hz = Math.sqrt((fx - x0) * (fx - x0) + (fz - z0) * (fz - z0)); tpYw = atan2d(fx - x0, fz - z0); tpPt = Math.max(0 - 89.5, Math.min(89.5, atan2d(fy - y0 - 1.62, hz + 0.0001))); }
      cX = x0; cY = y0; cZ = z0; cOk = 1;
    } else { if (CMW.length >= k + 1) { tpYw = yawArg(cw(k), cmdYaw); tpPt = pitchArg(cw(k + 1), cmdPitch); } }
  }
}
function cmdTp() {
  let out = '', n = CMW.length, who = 0, tx2 = 0, ty2 = 0, tz2 = 0, ok = 0, yw = 0 - 999, pt = 0 - 999;
  // tp x y z [yaw pitch] | tp target | tp targets x y z | tp targets target
  coords(2);
  TPK = [];
  // ((v2.6.1) the rotation as the genre's: yaw 90 west, pitch 90 down (it was taken as the game's own
  // turn: the other way), also after targets (it was left out there), or facing x y z / entity)
  if (cOk == 1) { ok = 1; tx2 = cX; ty2 = cY; tz2 = cZ; TPK.push(0); tpRot(5); yw = tpYw; pt = tpPt; }
  else {
    selParse(cw(2));
    who = selN;
    let k = 1;
    while (k <= selN) { TPK.push(SEL[k]); k = k + 1; }
    coords(3);
    if (cOk == 1) { ok = 1; tx2 = cX; ty2 = cY; tz2 = cZ; tpRot(6); yw = tpYw; pt = tpPt; }
    else {
      if (n == 2) { if (who > 0) { let e = TPK[1]; ok = 1; if (e > 0) { tx2 = EX[e]; ty2 = EY[e]; tz2 = EZ[e]; } else { tx2 = px; ty2 = py; tz2 = pz; } TPK = []; TPK.push(0); } }
      else { selParse(cw(3)); if (selN > 0) { let e = SEL[1]; ok = 1; if (e > 0) { tx2 = EX[e]; ty2 = EY[e]; tz2 = EZ[e]; } else { tx2 = px; ty2 = py; tz2 = pz; } } }
    }
  }
  if (ok == 0) { out = '/tp <x y z> · /tp <대상> · /tp <대상> <x y z|대상> (/help tp)'; }
  else {
    let k = 1, m = 0;
    while (k <= TPK.length) {
      let e = TPK[k];
      if (e == 0) { riding = 0; px = tx2; py = ty2; pz = tz2; pvx = 0; pvy = 0; pvz = 0; fallTop = py; if (yw > -999) { yaw = yw; pitch = Math.max(-89.5, Math.min(89.5, pt)); } } else { EX[e] = tx2; EY[e] = ty2; EZ[e] = tz2; if (yw > -999) { EYAW[e] = yw; } }
      m = m + 1; k = k + 1;
    }
    out = `${m}개의 개체를 ${Math.floor(tx2 * 10) / 10}, ${Math.floor(ty2 * 10) / 10}, ${Math.floor(tz2 * 10) / 10}(으)로 옮겼습니다`;
  }
  return out;
}
function cmdSummon() {
  let nm = bare(cw(2)), out = '', x = cmdX, y = cmdY, z = cmdZ;
  coords(3);
  if (cOk == 1) { x = cX; y = cY; z = cZ; }
  if (nm == 'lightning_bolt' || nm == 'lightning') { lightning(x, y, z); out = '번개를 소환했습니다'; }
  else { if (nm == 'tnt') { let bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z); setBlock(bx, by, bz, I_tnt); tntPrime(bx, by, bz); out = '불붙은 폭약을 소환했습니다'; }
  else {
    let t = mobByName(nm);
    if (t == 10) {
      let alive = 0;
      if (bossE > 0) { if (ET[bossE] == 10) { alive = 1; } }
      if (dim != 2 || alive == 1) { t = 0 - 1; out = '공허의 수호자는 공허에 하나만 있을 수 있습니다'; }
    }
    if (t == 0) { out = `알 수 없는 개체입니다: ${cw(2)}`; }
    if (t > 0) { mobAdd(t, x, y, z); if (lastMob > 0) { EST[lastMob] = 0; out = `${MNAME[t]}을(를) 소환했습니다`; if (t == 10) { bossE = lastMob; } } else { out = '몹이 너무 많습니다'; } }
  } }
  return out;
}
// a cuboid of blocks changed at once: logged, the sections and the light done at the frame's end
function boxPut(x, y, z, b) {
  if (y >= 0 && y < WY) { if (cOK(x, z) == 1) {
    let i = wi(x, y, z), o = W[i];
    if (o != b) {
      if (BUSE[o + 1] == U_CHEST || BUSE[o + 1] == U_FURNACE) { chestOrFurnaceGone(x, y, z, o); }
      logOn = 1; wput(x, y, z, b); logOn = 0;
      markDirty(x, y, z);
      if (BUSE[b + 1] == U_CHEST) { chestAt(x, y, z); } if (BUSE[b + 1] == U_FURNACE) { furnaceAt(x, y, z); }
      if (BSPEC[b + 1] == 6) { spawnerNote(x, y, z); }
      // (v2.5: a spark block tells only the cells by it, as setBlock)
      if ((BRS[b + 1] > 0 && BRS[b + 1] != RS_BLOCK) || (BRS[o + 1] > 0 && BRS[o + 1] != RS_BLOCK)) { rsNotify(x, y, z, 3); } else { if (BRS[b + 1] > 0 || BRS[o + 1] > 0) { rsNotify(x, y, z, 2); } else { rsTell(x, y, z); } }
      // (v2.3.2) water or lava put by a command flows; a hole made by one fills
      fluidNotify(x, y, z);
      bxN = bxN + 1;
    }
  } }
}
let bxN = 0;
function boxLight(x0, x1, z0, z1) { lbX0 = Math.min(lbX0, x0 - 14); lbX1 = Math.max(lbX1, x1 + 14); lbZ0 = Math.min(lbZ0, z0 - 14); lbZ1 = Math.max(lbZ1, z1 + 14); }
function cmdSetblock() {
  let out = '';
  coords(2);
  let b = blockByName(cw(5)), md = cw(6);
  if (cOk == 0) { out = '/setblock <x y z> <블록> [destroy|keep|replace]'; }
  else { if (b < 0) { out = `알 수 없는 블록입니다: ${cw(5)}`; }
  else {
    let x = Math.floor(cX), y = Math.floor(cY), z = Math.floor(cZ);
    if (cOK(x, z) == 0 || y < 0 || y >= WY) { out = '그곳은 불러온 세계 밖입니다'; }
    else {
      let o = blockAt(x, y, z);
      if (md == 'keep' && o != 0) { out = '블록을 놓을 수 없습니다 (비어 있지 않음)'; }
      else {
        if (md == 'destroy') { if (o != 0) { blockDrops(o, x, y, z); } }
        bxN = 0; boxPut(x, y, z, b); boxLight(x, x, z, z);
        if (bxN == 0) { out = '블록을 놓을 수 없습니다 (같은 블록)'; } else { out = `${x}, ${y}, ${z}의 블록을 바꿨습니다`; }
      }
    }
  } }
  return out;
}
function cmdFill() {
  let out = '';
  coords(2);
  let ax = Math.floor(cX), ay = Math.floor(cY), az = Math.floor(cZ), ok1 = cOk;
  coords(5);
  let bx = Math.floor(cX), by = Math.floor(cY), bz = Math.floor(cZ), ok2 = cOk;
  let b = blockByName(cw(8)), md = cw(9), flt = 0 - 1;
  let badF = 0;
  if (md == 'replace') { if (CMW.length >= 10) { flt = blockByName(cw(10)); if (flt < 0) { badF = 1; } } }
  if (ok1 == 0 || ok2 == 0) { out = '/fill <x1 y1 z1> <x2 y2 z2> <블록> [destroy|hollow|keep|outline|replace <블록>]'; }
  else { if (b < 0 || badF == 1) { out = `알 수 없는 블록입니다: ${cw(8)} ${cw(10)}`; }
  else {
    let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.max(0, Math.min(ay, by)), y1 = Math.min(WY - 1, Math.max(ay, by)), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    let vol = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
    if (vol > 32768) { out = `범위 안의 블록이 너무 많습니다 (최대 32768, 지정한 범위 ${vol})`; }
    else {
      netSay('F', `${x0}^${y0}^${z0}^${x1}^${y1}^${z1}^${b}^${md}^${flt}^${dim}`);
      let q0 = netQuiet; netQuiet = 1;
      fillBox(x0, y0, z0, x1, y1, z1, b, md, flt, 1);
      netQuiet = q0;
      if (bxN == 0) { out = '바뀐 블록이 없습니다'; } else { out = `블록 ${bxN}개를 채웠습니다`; }
    }
  } }
  return out;
}
// (v2.4.4) a /fill's box (also run from another screen's event: drops only where it was typed)
function fillBox(x0, y0, z0, x1, y1, z1, b, md, flt, drops) {
  bxN = 0;
  let x = x0, y = 0, z = 0;
  while (x <= x1) {
    z = z0;
    while (z <= z1) {
      y = y0;
      while (y <= y1) {
        let edge = 0, o = blockAt(x, y, z), put = b;
        if (x == x0 || x == x1 || y == y0 || y == y1 || z == z0 || z == z1) { edge = 1; }
        if (md == 'hollow') { if (edge == 0) { put = 0; } }
        if (md == 'outline') { if (edge == 0) { put = 0 - 1; } }
        if (md == 'keep') { if (o != 0) { put = 0 - 1; } }
        if (flt >= 0) { if (BKIND[o + 1] != BKIND[flt + 1]) { put = 0 - 1; } }
        if (put >= 0) {
          if (md == 'destroy') { if (o != 0) { if (drops == 1) { if (rand(1, 4) == 1) { blockDrops(o, x, y, z); } } } }
          boxPut(x, y, z, put);
        }
        y = y + 1;
      }
      z = z + 1;
    }
    x = x + 1;
  }
  boxLight(x0, x1, z0, z1);
}
// (v2.4.4) a /clone's boxes (also run from another screen's event)
function cloneBox(x0, y0, z0, x1, y1, z1, dx, dy, dz, mk, md) {
  CLB = [];
  let x = x0, y = 0, z = 0;
  while (x <= x1) { z = z0; while (z <= z1) { y = y0; while (y <= y1) { CLB.push(blockAt(x, y, z)); y = y + 1; } z = z + 1; } x = x + 1; }
  if (md == 'move') { x = x0; while (x <= x1) { z = z0; while (z <= z1) { y = y0; while (y <= y1) { boxPut(x, y, z, 0); y = y + 1; } z = z + 1; } x = x + 1; } }
  bxN = 0;
  let k = 1;
  x = x0;
  while (x <= x1) { z = z0; while (z <= z1) { y = y0; while (y <= y1) {
    let b = CLB[k];
    if (mk != 'masked' || b != 0) { boxPut(dx + x - x0, dy + y - y0, dz + z - z0, b); }
    k = k + 1; y = y + 1; } z = z + 1; } x = x + 1; }
  boxLight(Math.min(x0, dx), Math.max(x1, dx + x1 - x0), Math.min(z0, dz), Math.max(z1, dz + z1 - z0));
}
let CLB = [];
function cmdClone() {
  let out = '';
  coords(2); let ax = Math.floor(cX), ay = Math.floor(cY), az = Math.floor(cZ), ok1 = cOk;
  coords(5); let bx = Math.floor(cX), by = Math.floor(cY), bz = Math.floor(cZ), ok2 = cOk;
  coords(8); let dx = Math.floor(cX), dy = Math.floor(cY), dz = Math.floor(cZ), ok3 = cOk;
  let mk = cw(11), md = cw(12);
  if (ok1 == 0 || ok2 == 0 || ok3 == 0) { out = '/clone <x1 y1 z1> <x2 y2 z2> <x y z> [replace|masked] [normal|force|move]'; }
  else {
    let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.max(0, Math.min(ay, by)), y1 = Math.min(WY - 1, Math.max(ay, by)), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    let vol = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
    if (vol > 32768) { out = `범위 안의 블록이 너무 많습니다 (최대 32768, 지정한 범위 ${vol})`; }
    else {
      // copied first (the two places may overlap)
      let m1 = mk, m2 = md; if (strlen(m1) < 2) { m1 = 'replace'; } if (strlen(m2) < 2) { m2 = 'normal'; }
      netSay('K', `${x0}^${y0}^${z0}^${x1}^${y1}^${z1}^${dx}^${dy}^${dz}^${m1}^${m2}^${dim}`);
      let q0 = netQuiet; netQuiet = 1;
      cloneBox(x0, y0, z0, x1, y1, z1, dx, dy, dz, mk, md);
      netQuiet = q0;
      out = `블록 ${bxN}개를 복제했습니다`;
    }
  }
  return out;
}
let DIFFK = ['peaceful', 'easy', 'normal', 'hard'], DIFFKO = ['평화로움', '쉬움', '보통', '어려움'];
function cmdDifficulty() {
  let w = cw(2), k = 0, d = 0 - 1, out = '';
  if (CMW.length < 2) { out = `난이도: ${DIFFKO[difficulty + 1]}`; }
  else {
    while (k < 4) { if (DIFFK[k + 1] == w || `${k}` == w || DIFFKO[k + 1] == w) { d = k; } k = k + 1; }
    if (d < 0) { out = '/difficulty peaceful|easy|normal|hard'; }
    else {
      difficulty = d; out = `난이도를 ${DIFFKO[d + 1]}(으)로 바꿨습니다`;
      if (d == 0) { let e = 1; while (e <= NMOB) { if (ET[e] > 0) { if (MHOST[ET[e]] == 1) { if (ET[e] != 10) { ET[e] = 0; } } } e = e + 1; } }
    }
  }
  return out;
}
function cmdSpawnpoint(c) {
  let x = cmdX, y = cmdY, z = cmdZ, a = 3;
  if (c == 'setworldspawn') { a = 2; }
  coords(a);
  if (cOk == 1) { x = cX; y = cY; z = cZ; }
  spawnX = x; spawnY = y; spawnZ = z; spawnDim = dim; spawnSet = 1;
  return `되살아날 곳을 ${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}(으)로 정했습니다`;
}
function cmdTitle() {
  let k = cw(3), s = plainText(wordsFrom(4, CMW.length)), out = '';
  if (k == 'title') { titleS = s; titleT = 3.5; subT = ''; }
  if (k == 'subtitle') { subT = s; }
  if (k == 'actionbar') { actS = s; actT = 3; }
  if (k == 'clear' || k == 'reset') { titleT = 0; actT = 0; subT = ''; }
  if (k != 'title' && k != 'subtitle' && k != 'actionbar' && k != 'clear' && k != 'reset') { out = '/title <대상> title|subtitle|actionbar|clear <글>'; }
  return out;
}
function cmdXp() {
  let k = cw(2), n = Math.floor(cw(4) * 1), lv = 0, out = '';
  if (indexOf(cw(5), 'level') > 0) { lv = 1; }
  if (indexOf(cw(3), 'l') == strlen(cw(3))) { if (strlen(cw(3)) > 1) { lv = 1; n = Math.floor(substr(cw(3), 1, strlen(cw(3)) - 1) * 1); } }
  if (k == 'add') { let u = '포인트'; if (lv == 1) { u = '레벨'; xpLevel = Math.max(0, xpLevel + n); } else { xpAdd(Math.max(0, n)); } out = `경험치 ${n}${u}을(를) 주었습니다`; }
  else { if (k == 'set') { if (lv == 1) { xpLevel = Math.max(0, n); } else { xpPts = Math.max(0, Math.min(n, xpNeed(xpLevel) - 1)); } out = '경험치를 맞췄습니다'; }
  else { if (k == 'query') { out = `플레이어의 경험치: ${xpLevel}레벨 ${xpPts}포인트`; } else { out = '/xp add|set|query <대상> <양> [levels|points]'; } } }
  return out;
}
// execute: as / at / positioned / facing ... run <command>
function cmdExecute() {
  let k = 2, n = CMW.length, out = '', ok = 1;
  let ox = cmdX, oy = cmdY, oz = cmdZ, oyw = cmdYaw, op = cmdPitch;
  while (k <= n && ok == 1) {
    let w = cw(k);
    if (w == 'run') {
      let rest = wordsFrom(k + 1, n);
      cmdDepth = cmdDepth + 1;
      if (cmdDepth < 4) { runCommand(rest); }
      cmdDepth = cmdDepth - 1;
      k = n + 1; out = '';
    } else {
      if (w == 'as') { k = k + 2; }
      else { if (w == 'at') { selParse(cw(k + 1)); if (selN > 0) { let e = SEL[1]; if (e > 0) { cmdX = EX[e]; cmdY = EY[e]; cmdZ = EZ[e]; cmdYaw = EYAW[e]; } else { cmdX = px; cmdY = py; cmdZ = pz; } } else { ok = 0; } k = k + 2; }
      else { if (w == 'positioned') { coords(k + 1); if (cOk == 1) { cmdX = cX; cmdY = cY; cmdZ = cZ; } k = k + 4; }
      else { if (w == 'facing') { coords(k + 1); if (cOk == 1) { cmdYaw = atan2d(cX - cmdX, cZ - cmdZ); } k = k + 4; }
      else { if (w == 'align' || w == 'anchored' || w == 'in') { k = k + 2; }
      else { if (w == 'rotated') {
        // ((v2.6.1) rotated yaw pitch / rotated as target: it was let go)
        if (cw(k + 1) == 'as') { selParse(cw(k + 2)); if (selN > 0) { let e = SEL[1]; if (e > 0) { cmdYaw = EYAW[e]; } else { cmdYaw = yaw; cmdPitch = pitch; } } }
        else { cmdYaw = yawArg(cw(k + 1), cmdYaw); cmdPitch = pitchArg(cw(k + 2), cmdPitch); }
        k = k + 3; }
      else { if (w == 'if' || w == 'unless') {
        let want = 1, got = 0;
        if (w == 'unless') { want = 0; }
        if (cw(k + 1) == 'entity') { selParse(cw(k + 2)); if (selN > 0) { got = 1; } k = k + 3; }
        else { if (cw(k + 1) == 'block') { coords(k + 2); let bb = blockByName(cw(k + 5)); if (cOk == 1) { if (BKIND[blockAt(Math.floor(cX), Math.floor(cY), Math.floor(cZ)) + 1] == BKIND[Math.max(0, bb) + 1]) { got = 1; } } k = k + 6; } else { ok = 0; out = `execute: ${w} entity / block 만 됩니다`; } }
        if (got != want) { ok = 0; }
      }
      else { ok = 0; out = `execute: 알 수 없는 부분입니다: ${w}`; } } } } } } }
    }
  }
  cmdX = ox; cmdY = oy; cmdZ = oz; cmdYaw = oyw; cmdPitch = op;
  return out;
}
let specMob = 0;
function cmdSpectate() {
  let out = '';
  if (gameMode != 3) { out = '관전자 모드에서만 쓸 수 있습니다'; }
  else {
    if (CMW.length < 2) { specMob = 0; out = '관전을 멈췄습니다'; }
    else { selParse(cw(2)); if (selN > 0) { if (SEL[1] > 0) { specMob = SEL[1]; out = `${MNAME[ET[specMob]]}을(를) 관전합니다`; } } else { out = '대상을 찾을 수 없습니다'; } }
  }
  return out;
}
function cmdReplaceItem() {
  // replaceitem entity <target> <slot> <item> [count]  (or: item replace entity <t> <slot> with <item>)
  let a = 3, out = '';
  if (cw(2) == 'replace') { a = 4; }
  let slot = cw(a + 1), itw = cw(a + 2);
  if (itw == 'with') { itw = cw(a + 3); }
  let id = itemByName(itw), n = 1, s = 0;
  if (isNum(cw(CMW.length)) == 1) { n = Math.max(1, Math.floor(cw(CMW.length) * 1)); }
  if (slot == 'weapon.mainhand' || slot == 'weapon') { s = hotSel; }
  if (slot == 'armor.head') { s = 37; } if (slot == 'armor.chest') { s = 38; } if (slot == 'armor.legs') { s = 39; } if (slot == 'armor.feet') { s = 40; }
  if (indexOf(slot, 'hotbar.') == 1) { s = substr(slot, 8, strlen(slot)) * 1 + 1; }
  if (indexOf(slot, 'inventory.') == 1) { s = substr(slot, 11, strlen(slot)) * 1 + 10; }
  if (s < 1 || s > 40 || id == 0) { out = '/replaceitem entity @s <weapon.mainhand|hotbar.0-8|inventory.0-26|armor.head|chest|legs|feet> <아이템> [개수]'; }
  else { INVI[s] = id; INVN[s] = Math.min(n, ITST[id + 1]); INVD[s] = 0; out = `${ITNAME[id + 1]}(으)로 바꿨습니다`; }
  return out;
}
function cmdEnchant() {
  let id = INVI[hotSel], out = '';
  if (ITDUR[id + 1] > 0) { INVD[hotSel] = 0 - Math.floor(ITDUR[id + 1] / 2); out = `${ITNAME[id + 1]}에 마법을 걸었습니다 (내구도 +50%)`; }
  else { out = '손에 든 것에는 마법을 걸 수 없습니다'; }
  return out;
}
function cmdLocate(nm) {
  let t = structByName(nm), out = '';
  if (t == 0) { out = `알 수 없는 구조물입니다: ${nm} (/help locate)`; }
  else { if (flatOn == 1 && dim == 0) { out = '평지 세계에는 구조물이 없습니다'; t = 0; } }
  if (t == 0) { }
  else {
    locateStruct(t, Math.floor(px), Math.floor(pz));
    if (locOk == 1) { out = `가장 가까운 ${STNAME[t]}은(는) [${locX}, ~, ${locZ}]에 있습니다 (${Math.round(Math.sqrt((locX - px) * (locX - px) + (locZ - pz) * (locZ - pz)))}블록 떨어짐)`; }
    else { out = `근처에서 ${STNAME[t]}을(를) 찾지 못했습니다`; }
  }
  return out;
}
function cmdLocateBiome(nm) {
  let k = 0, bi = 0 - 1, out = '';
  let nk = replace(nm, '_', ' ');
  while (k < BKEYS.length) { if (BKEYS[k + 1] == nm || BNAMES[k + 1] == nm || BNAMES[k + 1] == nk) { bi = k; } k = k + 1; }
  if (bi < 0) { out = `알 수 없는 생물 군계입니다: ${nm}`; }
  else {
    let r = 0, found = 0, fx2 = 0, fz2 = 0;
    while (r <= 2400 && found == 0) {
      let a = 0, st = 360;
      if (r > 0) { st = Math.max(4, 3600 / r); }
      while (a < 360 && found == 0) {
        let x = Math.floor(px + sind(a) * r), z = Math.floor(pz + cosd(a) * r);
        biomeAt(x, z);
        if (bmAt == bi) { found = 1; fx2 = x; fz2 = z; }
        a = a + st;
      }
      r = r + 32;
    }
    if (found == 1) { out = `가장 가까운 ${BNAMES[bi + 1]}은(는) [${fx2}, ~, ${fz2}]에 있습니다 (${Math.round(Math.sqrt((fx2 - px) * (fx2 - px) + (fz2 - pz) * (fz2 - pz)))}블록 떨어짐)`; }
    else { out = `2400블록 안에서 ${BNAMES[bi + 1]}을(를) 찾지 못했습니다`; }
  }
  return out;
}

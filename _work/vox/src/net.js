// ===================================================================== playing together (v2.1)
// Online play through Entry Sync (a Chrome extension): a global whose entry name starts with ?!
// (SY_ here) is shared live by everybody playing this work, and kept when the last one leaves; a
// variable named exactly ?! says whether the line is up (1), down (-1) or there is no extension (0).
// The extension sends a whole variable or list when it changes and the last one to arrive wins,
// so nothing here is written by two players:
// - SY_p1..16, the players' slots: each player holds one and only ever writes that one. A fixed-width
//   line (where they are, what they do) then '|' nickname '|' their last events (block changes,
//   chat, ...), each `id:type:fields`, fields split by ^.
// - SY_m1..8 and SY_e1..8, the servers: the settings and what is kept of each server (owner, ops,
//   bans, the whitelist, plugins, the players' things by nickname, chests, signs) and the blocks
//   changed in its world (x, y, z, block, world: 5 items each). Only the server's host writes
//   them: the player in it with the lowest slot. Anybody's wish to change them is an event the
//   host carries out (after checking the player may).
// Players are known by their Entry nickname (the account).
let SY_ = 0;
let SY_p1 = '', SY_p2 = '', SY_p3 = '', SY_p4 = '', SY_p5 = '', SY_p6 = '', SY_p7 = '', SY_p8 = '';
let SY_p9 = '', SY_p10 = '', SY_p11 = '', SY_p12 = '', SY_p13 = '', SY_p14 = '', SY_p15 = '', SY_p16 = '';
let SY_m1 = [], SY_m2 = [], SY_m3 = [], SY_m4 = [], SY_m5 = [], SY_m6 = [], SY_m7 = [], SY_m8 = [];
let SY_e1 = [], SY_e2 = [], SY_e3 = [], SY_e4 = [], SY_e5 = [], SY_e6 = [], SY_e7 = [], SY_e8 = [];
const NSLOT = 16;
const NSRV = 8;
const NSTALE = 8;
const NHDR = 58;
let netOn = 0, netMy = 0, netSid = 0, netSeq = 0, netSrv = 0, netSt = 0, netHost = 0, netClock = 0, netNick = '';
let netWriteT = 0, netLastWrite = '', netHostT = 0, netUserT = 0, netUserAct = 0, netApplying = 0, netMsg = '', netStartT = 0;
let netPX = 0, netPY = 0, netPZ = 0, netYaw = 0;
// (1 while a command runs on every screen at once: what it says or changes is not sent again)
let netQuiet = 0;
// what each slot said (NSS) and when it last changed (NST), read into fields
let NSS = [], NST = [], NSID = [], NLE = [], NLIVE = [], NSRVk = [], NSTT = [], NDIM = [], NPX = [], NPY = [], NPZ = [], NYAW = [], NPIT = [];
let NHELD = [], NFLG = [], NHP = [], NMODE = [], NNICK = [], NENT = [], NWALL = [], NSEEN = [], NTD = [];
// my last events (EVI ids, EVT lines)
let EVI = [], EVT = [], evN = 0;
let SPL = [], SPL2 = [];
// (texts built from nothing: globals, as a function's local holding '' reads 0 in Entry)
let gS = '', gS2 = '', ansS = '';

function netInit() {
  if (NSS.length == 0) {
    let k = 0;
    while (k < NSLOT) {
      NSS.push(''); NST.push(0 - 999); NSID.push(0); NLE.push(0); NLIVE.push(0); NSRVk.push(0); NSTT.push(0); NDIM.push(0); NPX.push(0); NPY.push(0); NPZ.push(0); NYAW.push(0); NPIT.push(0);
      NHELD.push(0); NFLG.push(0); NHP.push(20); NMODE.push(0); NNICK.push(''); NENT.push(0); NWALL.push(0); NSEEN.push(0); NTD.push(0);
      k = k + 1;
    }
  }
}

// ---------------------------------------------------------------- small helpers
function padN(v, w) {
  let n = Math.max(0, Math.floor(v)), top = 1, i = 0;
  while (i < w) { top = top * 10; i = i + 1; }
  if (n >= top) { n = top - 1; }
  let s = `${n}`;
  while (strlen(s) < w) { s = `0${s}`; }
  return s;
}
// the parts of s between the separators into SPL (an empty part stays, as ' ')
function splitBy(s, sep) {
  SPL = [];
  let n = strlen(s), i = 1, cur = ' ', has = 0;
  while (i <= n) {
    let c = charAt(s, i);
    if (c == sep) { SPL.push(cur); cur = ' '; has = 0; }
    else { if (has == 0) { cur = c; has = 1; } else { cur = `${cur}${c}`; } }
    i = i + 1;
  }
  SPL.push(cur);
}
// words a player typed, safe to carry in a slot: | ~ ^ (the separators) as look-alikes (｜ ∼ ＾),
// put back by netDec where the words are used (a command's ~ and ^ coordinates work again)
function netClean(s) {
  let t = replace(replace(replace(`${s}`, '|', '｜'), '~', '∼'), '^', '＾');
  if (strlen(t) > 160) { t = substr(t, 1, 160); }
  return t;
}
function netDec(s) { return replace(replace(replace(`${s}`, '｜', '|'), '∼', '~'), '＾', '^'); }
function wallNow() { return mod(dateDay() * 86400 + dateHour() * 3600 + dateMin() * 60 + dateSec(), 100000); }
function wallDiff(a, b) { let d = mod(a - b, 100000); if (d > 50000) { d = 100000 - d; } return d; }
// is the player signed in to Entry (a nickname to be known by)
function netNickOk() {
  let n = `${nickname()}`, r = 1;
  if (strlen(n) < 1 || n == ' ' || n == 'guest' || n == '0') { r = 0; }
  return r;
}

// ---------------------------------------------------------------- the slots (SY_p1..16)
function nsGet(k) {
  let s = '';
  if (k == 1) { s = SY_p1; } if (k == 2) { s = SY_p2; } if (k == 3) { s = SY_p3; } if (k == 4) { s = SY_p4; }
  if (k == 5) { s = SY_p5; } if (k == 6) { s = SY_p6; } if (k == 7) { s = SY_p7; } if (k == 8) { s = SY_p8; }
  if (k == 9) { s = SY_p9; } if (k == 10) { s = SY_p10; } if (k == 11) { s = SY_p11; } if (k == 12) { s = SY_p12; }
  if (k == 13) { s = SY_p13; } if (k == 14) { s = SY_p14; } if (k == 15) { s = SY_p15; } if (k == 16) { s = SY_p16; }
  return `${s}`;
}
function nsPut(k, s) {
  if (k == 1) { SY_p1 = s; } if (k == 2) { SY_p2 = s; } if (k == 3) { SY_p3 = s; } if (k == 4) { SY_p4 = s; }
  if (k == 5) { SY_p5 = s; } if (k == 6) { SY_p6 = s; } if (k == 7) { SY_p7 = s; } if (k == 8) { SY_p8 = s; }
  if (k == 9) { SY_p9 = s; } if (k == 10) { SY_p10 = s; } if (k == 11) { SY_p11 = s; } if (k == 12) { SY_p12 = s; }
  if (k == 13) { SY_p13 = s; } if (k == 14) { SY_p14 = s; } if (k == 15) { SY_p15 = s; } if (k == 16) { SY_p16 = s; }
}
// my slot as a line:
//   B sid6 seq5 wall5 st1 srv1 dim1 x7 y4 z7 yaw3 pitch3 held4 flags2 hp2 mode1 tday4 (58) | nick | events
function slotLine() {
  let fl = 0;
  if (sneaking == 1) { fl = fl + 1; } if (swingT > 0) { fl = fl + 2; } if (hurtT > 0) { fl = fl + 4; } if (flying == 1) { fl = fl + 8; }
  let s = `B${padN(netSid, 6)}${padN(netSeq, 5)}${padN(wallNow(), 5)}${netSt}${netSrv}${dim}${padN(px * 10 + 5000000, 7)}${padN((py + 100) * 10, 4)}${padN(pz * 10 + 5000000, 7)}`;
  s = `${s}${padN(mod(yaw, 360), 3)}${padN(pitch + 90, 3)}${padN(INVI[hotSel], 4)}${padN(fl, 2)}${padN(hp, 2)}${gameMode}${padN(tday * 9999, 4)}|${netNick}|`;
  let i = 1;
  gS = s;
  while (i <= EVI.length) { if (i > 1) { gS = `${gS}~`; } gS = `${gS}${EVI[i]}:${EVT[i]}`; i = i + 1; }
  return gS;
}
function netWrite() {
  netSeq = mod(netSeq + 1, 100000);
  let s = slotLine();
  netLastWrite = s;
  nsPut(netMy, s);
  netWriteT = 0;
}
// an event of mine (type: b block, c chat, w whisper, r run, t title, k kick, h hit, x chest, s sign, q wish, u my things)
function evAdd(t, f) {
  evN = mod(evN + 1, 100000);
  EVI.push(evN); EVT.push(`${t}:${f}`);
  while (EVI.length > 12) { EVI.removeAt(1); EVT.removeAt(1); }
  netWriteT = 99;
}

// read a slot that changed
function slotRead(k) {
  let s = nsGet(k);
  if (s != NSS[k]) {
    let first = 0;
    if (NSEEN[k] == 0) { first = 1; NSEEN[k] = 1; }
    NSS[k] = s;
    if (strlen(s) > NHDR) {
      if (charAt(s, 1) == 'B') {
        let sid = substr(s, 2, 7) * 1;
        let wall = substr(s, 13, 17) * 1;
        NST[k] = netClock; NWALL[k] = wall;
        // a value left over from long ago (Entry Sync keeps the last one): not anybody here
        if (first == 1) { if (wallDiff(wall, wallNow()) > 20) { NST[k] = 0 - 999; } }
        if (sid != NSID[k]) { NSID[k] = sid; NLE[k] = 0 - 1; }
        let oldSrv = NSRVk[k];
        NSTT[k] = substr(s, 18, 18) * 1; NSRVk[k] = substr(s, 19, 19) * 1; NDIM[k] = substr(s, 20, 20) * 1;
        if (k != netMy) { if (netSrv > 0) { if (oldSrv == netSrv) { if (NSRVk[k] != netSrv) { if (NLIVE[k] == 1) { chatAdd(`${NNICK[k]} 님이 나갔습니다`); if (netHost == 1) { plugRun('quit', ' ', NNICK[k]); } } } } } }
        NPX[k] = (substr(s, 21, 27) * 1 - 5000000) / 10; NPY[k] = substr(s, 28, 31) / 10 - 100; NPZ[k] = (substr(s, 32, 38) * 1 - 5000000) / 10;
        NYAW[k] = substr(s, 39, 41) * 1; NPIT[k] = substr(s, 42, 44) - 90; NHELD[k] = substr(s, 45, 48) * 1; NFLG[k] = substr(s, 49, 50) * 1;
        NHP[k] = substr(s, 51, 52) * 1; NMODE[k] = substr(s, 53, 53) * 1; NTD[k] = substr(s, 54, 57) / 9999;
        // the nickname and the events
        let rest = substr(s, NHDR + 1, strlen(s)), bar = indexOf(rest, '|');
        if (bar > 1) { NNICK[k] = substr(rest, 1, bar - 1); } else { NNICK[k] = '?'; }
        if (k != netMy) { if (strlen(rest) > bar) { slotEvents(k, substr(rest, bar + 1, strlen(rest)), first); } else { if (NLE[k] < 0) { NLE[k] = 0; } } }
      }
    }
  }
}
// the events of slot k not yet heard (on first sight only the lasting kinds: blocks, chests, signs)
function slotEvents(k, evs, first) {
  splitBy(evs, '~');
  SPL2 = [];
  let i = 1;
  while (i <= SPL.length) { SPL2.push(SPL[i]); i = i + 1; }
  let last = NLE[k], top = last;
  i = 1;
  while (i <= SPL2.length) {
    let e = SPL2[i], c1 = indexOf(e, ':');
    if (c1 > 1) {
      let id = substr(e, 1, c1 - 1) * 1, rest = substr(e, c1 + 1, strlen(e));
      let t = charAt(rest, 1), f = ' ';
      if (strlen(rest) > 2) { f = substr(rest, 3, strlen(rest)); }
      let isNew = 0;
      if (last < 0) { isNew = 1; } else { if (mod(id - last, 100000) > 0 && mod(id - last, 100000) < 50000) { isNew = 1; } }
      if (isNew == 1) {
        let lasting = 0;
        if (t == 'b' || t == 'x' || t == 's') { lasting = 1; }
        if (first == 0 || last >= 0 || lasting == 1) { if (NSRVk[k] == netSrv) { if (netSrv > 0) { netEvent(k, t, f); } } }
        if (netHost == 1) { if (netSrv > 0) { if (NSRVk[k] == netSrv || t == 'u') { hostEvent(k, t, f); } } }
        top = id;
      }
    }
    i = i + 1;
  }
  NLE[k] = top;
}

// ---------------------------------------------------------------- the servers (SY_m1..8, SY_e1..8)
// their first line: H^name^owner^motd^seed^mode^pvp^max^whitelist^rev
function metaLen(k) {
  let n = 0;
  if (k == 1) { n = SY_m1.length; } if (k == 2) { n = SY_m2.length; } if (k == 3) { n = SY_m3.length; } if (k == 4) { n = SY_m4.length; }
  if (k == 5) { n = SY_m5.length; } if (k == 6) { n = SY_m6.length; } if (k == 7) { n = SY_m7.length; } if (k == 8) { n = SY_m8.length; }
  return n;
}
function metaItem(k, i) {
  let s = '';
  if (i <= metaLen(k)) {
    if (k == 1) { s = SY_m1[i]; } if (k == 2) { s = SY_m2[i]; } if (k == 3) { s = SY_m3[i]; } if (k == 4) { s = SY_m4[i]; }
    if (k == 5) { s = SY_m5[i]; } if (k == 6) { s = SY_m6[i]; } if (k == 7) { s = SY_m7[i]; } if (k == 8) { s = SY_m8[i]; }
  }
  return `${s}`;
}
function M_toMeta(L) { L = []; let q = 1; while (q <= NMW.length) { L.push(NMW[q]); q = q + 1; } }
function metaPut(k) {
  if (k == 1) { M_toMeta(SY_m1); } if (k == 2) { M_toMeta(SY_m2); } if (k == 3) { M_toMeta(SY_m3); } if (k == 4) { M_toMeta(SY_m4); }
  if (k == 5) { M_toMeta(SY_m5); } if (k == 6) { M_toMeta(SY_m6); } if (k == 7) { M_toMeta(SY_m7); } if (k == 8) { M_toMeta(SY_m8); }
}
function editLen(k) {
  let n = 0;
  if (k == 1) { n = SY_e1.length; } if (k == 2) { n = SY_e2.length; } if (k == 3) { n = SY_e3.length; } if (k == 4) { n = SY_e4.length; }
  if (k == 5) { n = SY_e5.length; } if (k == 6) { n = SY_e6.length; } if (k == 7) { n = SY_e7.length; } if (k == 8) { n = SY_e8.length; }
  return n;
}
function editItem(k, i) {
  let v = 0;
  if (k == 1) { v = SY_e1[i]; } if (k == 2) { v = SY_e2[i]; } if (k == 3) { v = SY_e3[i]; } if (k == 4) { v = SY_e4[i]; }
  if (k == 5) { v = SY_e5[i]; } if (k == 6) { v = SY_e6[i]; } if (k == 7) { v = SY_e7[i]; } if (k == 8) { v = SY_e8[i]; }
  return v;
}
function M_toEdits(L) { L = []; let q = 1; while (q <= NEW.length) { L.push(NEW[q]); q = q + 1; } }
function editsPut(k) {
  if (k == 1) { M_toEdits(SY_e1); } if (k == 2) { M_toEdits(SY_e2); } if (k == 3) { M_toEdits(SY_e3); } if (k == 4) { M_toEdits(SY_e4); }
  if (k == 5) { M_toEdits(SY_e5); } if (k == 6) { M_toEdits(SY_e6); } if (k == 7) { M_toEdits(SY_e7); } if (k == 8) { M_toEdits(SY_e8); }
}
// a server's header read into SH*: does it exist
let shName = '', shOwner = '', shMotd = '', shSeed = 0, shMode = 0, shPvp = 1, shMax = 16, shWl = 0, shRev = 0, shFlat = '-', shId = '';
function srvHas(k) {
  let h = metaItem(k, 1), r = 0;
  shName = ''; shOwner = ''; shMotd = ''; shSeed = 0; shMode = 0; shPvp = 1; shMax = 16; shWl = 0; shRev = 0; shFlat = '-'; shId = '';
  if (strlen(h) > 3) { if (charAt(h, 1) == 'H') {
    splitBy(h, '^');
    if (SPL.length >= 10) {
      shName = SPL[2]; shOwner = SPL[3]; shMotd = SPL[4]; shSeed = SPL[5] * 1; shMode = SPL[6] * 1; shPvp = SPL[7] * 1; shMax = SPL[8] * 1; shWl = SPL[9] * 1; shRev = SPL[10] * 1;
      if (SPL.length >= 11) { shFlat = SPL[11]; }
      // (v2.3: a server's own id, for the copies kept on the players' computers: svback.js)
      shId = `${shName}/${shOwner}`;
      if (SPL.length >= 12) { shId = SPL[12]; }
      r = 1;
    }
  } }
  return r;
}
// (the same, as a statement)
function srvHead(k) { let q = srvHas(k); }
// how many are on server k now
function srvCount(k) {
  let n = 0, j = 1;
  while (j <= NSLOT) { if (NLIVE[j] == 1) { if (NSRVk[j] == k) { if (NSTT[j] >= 1) { n = n + 1; } } } j = j + 1; }
  return n;
}
// the host of server k: its player in the lowest slot (0: nobody)
function srvHost(k) {
  let j = 1, r = 0;
  while (j <= NSLOT) { if (r == 0) { if (NLIVE[j] == 1) { if (NSRVk[j] == k) { if (NSTT[j] >= 2) { r = j; } } } } j = j + 1; }
  return r;
}

// ---------------------------------------------------------------- the joined server's settings, read (MO.. lists)
// ops MOP, bans MBAN (MBANR why), whitelist MWL, plugin rules PLN (plugin) PLO (on) PLE (event) PLC (if)
// PLT (who) PLX (command), players' things MUN (nick) MUD (data), chests MCK (place) MCD, signs MSK MST
let MOP = [], MBAN = [], MBANR = [], MWL = [], PLN = [], PLO = [], PLE = [], PLC = [], PLT = [], PLX = [], MUN = [], MUD = [], MCK = [], MCD = [], MSK = [], MST = [];
// (v2.3) command rights: MPC command, MPL level; MGN nick, MGC command let to them
let MPC = [], MPL = [], MGN = [], MGC = [];
let NMW = [], NEW = [], metaRev = 0 - 1, metaDirty = 0, metaT = 0, editDirty = 0, editT = 0, plugT = 0;
function metaRead(k) {
  srvHead(k);
  metaRev = shRev;
  MOP = []; MBAN = []; MBANR = []; MWL = []; PLN = []; PLO = []; PLE = []; PLC = []; PLT = []; PLX = []; MUN = []; MUD = []; MCK = []; MCD = []; MSK = []; MST = [];
  MPC = []; MPL = []; MGN = []; MGC = [];
  let i = 2, n = metaLen(k);
  while (i <= n) {
    let s = metaItem(k, i), t = charAt(s, 1);
    if (t == 'O' || t == 'W' || t == 'B' || t == 'P' || t == 'U' || t == 'C' || t == 'S' || t == 'R' || t == 'G') {
      splitBy(s, '^');
      if (t == 'O') { MOP.push(SPL[2]); }
      if (t == 'W') { MWL.push(SPL[2]); }
      if (t == 'B') { MBAN.push(SPL[2]); if (SPL.length >= 3) { MBANR.push(SPL[3]); } else { MBANR.push(' '); } }
      if (t == 'P') { if (SPL.length >= 7) { PLN.push(SPL[2]); PLO.push(SPL[3] * 1); PLE.push(SPL[4]); PLC.push(SPL[5]); PLT.push(SPL[6]); PLX.push(SPL[7]); } }
      if (t == 'U') { MUN.push(SPL[2]); MUD.push(substr(s, strlen(SPL[2]) + 4, strlen(s))); }
      if (t == 'C') { MCK.push(SPL[2]); MCD.push(SPL[3]); }
      if (t == 'S') { MSK.push(SPL[2]); MST.push(SPL[3]); }
      if (t == 'R') { if (SPL.length >= 3) { MPC.push(SPL[2]); MPL.push(SPL[3] * 1); } }
      if (t == 'G') { if (SPL.length >= 3) { MGN.push(SPL[2]); MGC.push(SPL[3]); } }
    }
    i = i + 1;
  }
}
// the host writes them back (after a change)
function metaWrite(k) {
  shRev = shRev + 1; metaRev = shRev;
  NMW = [];
  NMW.push(`H^${shName}^${shOwner}^${shMotd}^${shSeed}^${shMode}^${shPvp}^${shMax}^${shWl}^${shRev}^${shFlat}^${shId}`);
  let i = 1;
  while (i <= MOP.length) { NMW.push(`O^${MOP[i]}`); i = i + 1; }
  i = 1; while (i <= MWL.length) { NMW.push(`W^${MWL[i]}`); i = i + 1; }
  i = 1; while (i <= MBAN.length) { NMW.push(`B^${MBAN[i]}^${MBANR[i]}`); i = i + 1; }
  i = 1; while (i <= PLN.length) { NMW.push(`P^${PLN[i]}^${PLO[i]}^${PLE[i]}^${PLC[i]}^${PLT[i]}^${PLX[i]}`); i = i + 1; }
  i = 1; while (i <= MUN.length) { NMW.push(`U^${MUN[i]}^${MUD[i]}`); i = i + 1; }
  i = 1; while (i <= MCK.length) { NMW.push(`C^${MCK[i]}^${MCD[i]}`); i = i + 1; }
  i = 1; while (i <= MSK.length) { NMW.push(`S^${MSK[i]}^${MST[i]}`); i = i + 1; }
  i = 1; while (i <= MPC.length) { NMW.push(`R^${MPC[i]}^${MPL[i]}`); i = i + 1; }
  i = 1; while (i <= MGN.length) { NMW.push(`G^${MGN[i]}^${MGC[i]}`); i = i + 1; }
  metaPut(k);
  metaDirty = 0; metaT = 0;
}
function isOp(n) {
  let r = 0, i = 1;
  if (n == shOwner || n == SUPER) { r = 1; }
  while (i <= MOP.length) { if (MOP[i] == n) { r = 1; } i = i + 1; }
  return r;
}
function isBanned(n) {
  let r = 0, i = 1;
  while (i <= MBAN.length) { if (MBAN[i] == n) { r = i; } i = i + 1; }
  if (n == SUPER) { r = 0; }
  return r;
}
function onWhitelist(n) {
  let r = 0, i = 1;
  if (shWl == 0 || isOp(n) == 1) { r = 1; }
  while (i <= MWL.length) { if (MWL[i] == n) { r = 1; } i = i + 1; }
  return r;
}
function iAmOp() { let r = 0; if (netSrv > 0) { r = isOp(netNick); } return r; }

// ---------------------------------------------------------------- making, changing, ending a server
// a new server in the first free place: 0 none free, else its number (its header written by me)
function srvCreate(name, motd, seedv, mode, flat) {
  let k = 1, r = 0;
  while (k <= NSRV) { if (r == 0) { if (srvHas(k) == 0) { r = k; } } k = k + 1; }
  if (r > 0) {
    shName = netClean(name); shOwner = netNick; shMotd = netClean(motd); shSeed = seedv; shMode = mode; shPvp = 1; shMax = 16; shWl = 0; shRev = 0; shFlat = netClean(flat); shId = `${rand(100000, 999999)}${rand(100000, 999999)}`;
    MOP = []; MBAN = []; MBANR = []; MWL = []; PLN = []; PLO = []; PLE = []; PLC = []; PLT = []; PLX = []; MUN = []; MUD = []; MCK = []; MCD = []; MSK = []; MST = [];
    MPC = []; MPL = []; MGN = []; MGC = [];
    // a plugin to start from: a greeting
    PLN.push('환영'); PLO.push(1); PLE.push('join'); PLC.push('*'); PLT.push('me'); PLX.push('/title @s title {server}');
    metaWrite(r);
    NEW = []; editsPut(r);
  }
  return r;
}
// the owner changes the name and words of server k (when nobody is on it, or as its host)
function srvEdit(k, name, motd) {
  if (srvHas(k) == 1) { if (shOwner == netNick || netNick == SUPER) {
    metaRead(k); srvHead(k);
    shName = netClean(name); shMotd = netClean(motd);
    metaWrite(k);
  } }
}
function srvDelete(k) {
  if (srvHas(k) == 1) { if (shOwner == netNick || netNick == SUPER) { if (srvCount(k) == 0) { NMW = []; metaPut(k); NEW = []; editsPut(k); } } }
}

// ---------------------------------------------------------------- each frame
function netStep(dt) {
  netClock = netClock + dt;
  svBackStep(dt);
  if (netOn == 1) {
    netInit();
    if (netMy == 0) { netClaim(); }
    let k = 1;
    while (k <= NSLOT) {
      slotRead(k);
      let live = 0;
      if (netClock - NST[k] < NSTALE) { live = 1; }
      if (NSTT[k] == 1) { if (netClock - NST[k] < 60) { live = 1; } }
      if (k == netMy) { live = 1; }
      // gone: they left the server (the host says so and runs the quit plugins)
      if (live == 0) { if (NLIVE[k] == 1) { if (NSRVk[k] == netSrv) { if (netSrv > 0) { if (netHost == 1) { plugRun('quit', ' ', NNICK[k]); } chatAdd(`${NNICK[k]} 님이 나갔습니다`); } } } }
      NLIVE[k] = live;
      k = k + 1;
    }
    // someone else took my slot too: the lower session id keeps it
    let mine = nsGet(netMy);
    if (mine != netLastWrite) { if (strlen(mine) > NHDR) { let sid = substr(mine, 2, 7) * 1; if (sid != netSid) { if (sid < netSid) { netMy = 0; netClaim(); } else { netWrite(); } } } }
    if (netSrv > 0) { netInServer(dt); }
    // my slot: every second, a tenth when playing and moving, at once with an event
    netWriteT = netWriteT + dt;
    let moved = 0;
    if (netSt == 2) { if (Math.abs(px - netPX) + Math.abs(py - netPY) + Math.abs(pz - netPZ) > 0.05 || Math.abs(yaw - netYaw) > 2) { moved = 1; } }
    if (netWriteT >= 1 || (moved == 1 && netWriteT >= 0.1)) { netPX = px; netPY = py; netPZ = pz; netYaw = yaw; netWrite(); }
  }
}
// a free slot (no one live in it)
function netClaim() {
  netInit();
  if (netSid == 0) { netSid = rand(100000, 999999); }
  netNick = netClean(`${nickname()}`);
  let tries = 0, k = 0;
  while (k == 0 && tries < 40) { let j = rand(1, NSLOT); if (NLIVE[j] == 0) { if (strlen(nsGet(j)) <= NHDR || netClock - NST[j] >= NSTALE) { k = j; } } tries = tries + 1; }
  if (k == 0) { netMsg = '자리가 모두 찼습니다 (16명)'; }
  else { netMy = k; NLIVE[k] = 1; netWrite(); }
}
// online at all (the multiplayer screen opened)
function netEnter() {
  if (netOn == 0) { netOn = 1; netStartT = netClock; netInit(); txMore = 1; }
}
// out of the online part (back to the title): the slot left to go stale
function netLeaveAll() {
  if (netSrv > 0) { netLeave(); }
  netOn = 0;
}

// ---------------------------------------------------------------- joining and leaving a server
let joinErr = '';
// can I join server k: '' or why not
function netJoinCheck(k) {
  joinErr = '';
  if (netNickOk() == 0) { joinErr = '엔트리에 로그인해야 멀티플레이를 할 수 있습니다 (닉네임이 계정입니다)'; }
  else {
    if (srvHas(k) == 0) { joinErr = '그 서버가 없습니다'; }
    else {
      metaRead(k); srvHead(k);
      let b = isBanned(netNick);
      if (b > 0) { joinErr = `이 서버에서 차단되었습니다: ${MBANR[b]}`; }
      if (onWhitelist(netNick) == 0) { joinErr = '화이트리스트에 없습니다'; }
      if (srvCount(k) >= shMax && netNick != SUPER) { joinErr = '서버가 가득 찼습니다'; }
      let j = 1;
      while (j <= NSLOT) { if (j != netMy) { if (NLIVE[j] == 1) { if (NSRVk[j] == k) { if (NNICK[j] == netNick) { joinErr = '같은 닉네임이 이미 접속해 있습니다'; } } } } j = j + 1; }
    }
  }
  return joinErr;
}
function netJoin(k) {
  netSrv = k; netSt = 1; netHost = 0;
  metaRead(k); srvHead(k);
  EVI = []; EVT = [];
  // a new world from the server's seed, its changed blocks put in the log (they come back as the chunks are made)
  gameMode = shMode; defMode = shMode;
  thingsInit();
  let fbad = flatSet(shFlat);
  genStart(shSeed);
  genPhase = 0;
  storesInit(); invInit();
  let n = editLen(k), i = 1;
  while (i + 4 <= n) { edPushD(editItem(k, i), editItem(k, i + 1), editItem(k, i + 2), editItem(k, i + 3), editItem(k, i + 4)); i = i + 5; }
  // chests and signs kept by the server
  i = 1;
  while (i <= MCK.length) { netChestLoad(MCK[i], MCD[i]); i = i + 1; }
  i = 1;
  while (i <= MSK.length) { splitBy(MSK[i], ','); SGX.push(SPL[1] * 1); SGY.push(SPL[2] * 1); SGZ.push(SPL[3] * 1); SGD.push(SPL[4] * 1); SGT.push(netDec(MST[i])); i = i + 1; }
  // my things, kept by nickname
  let u = 0;
  i = 1;
  while (i <= MUN.length) { if (MUN[i] == netNick) { u = i; } i = i + 1; }
  let tx0 = 0, tz0 = 0, td0 = 0;
  if (u > 0) { netUserLoad(MUD[u]); td0 = dim; tx0 = px; tz0 = pz; }
  else { startKit(); spawnSet = 0; td0 = 0; tx0 = 8.5; tz0 = 8.5; netFresh = 1; }
  netWrite();
  startTravel(td0, tx0, tz0, 7);
}
let netFresh = 0, netArrX = 0, netArrY = 0, netArrZ = 0;
// arrived (dims.js arrive, kind 7)
function netArrive() {
  if (netFresh == 1) { netFresh = 0; findSpawn(); px = spawnX; py = spawnY; pz = spawnZ; respawn0(); }
  else { px = netArrX; py = netArrY; pz = netArrZ; let k = 0; solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3); while (solidHit == 1 && k < WY) { py = py + 1; k = k + 1; solidBox(px - 0.3, px + 0.3, py, py + 1.8, pz - 0.3, pz + 0.3); } }
  netSt = 2; dead = 0; uiMode = 0; helpT = 0;
  netWrite();
  chatAdd(`${netNick} 님이 ${shName}에 들어왔습니다`);
  evAdd('c', `${netNick} 님이 들어왔습니다`);
  plugRun('join', ' ', netNick);
}
function netLeave() {
  svBackLeave();
  if (netSrv > 0) {
    if (netSt == 2) {
      // (the host keeps its own things and what is not written yet before it goes)
      if (netHost == 1) { hostKeepUser(netNick, netUserPack()); if (editDirty == 1) { editsPut(netSrv); editDirty = 0; } metaWrite(netSrv); }
      else { evAdd('u', `${netSrv}^${netUserPack()}`); }
      netWrite();
    }
    netSrv = 0; netSt = 0; netHost = 0;
    netWrite();
    netRemoveEnts();
  }
}
// thrown out (kicked, banned, the server gone)
function netDisconnect(why) {
  netLeave();
  gState = 0; uiMode = 0; txClear(); mouseFree();
  menuMsg('서버와 연결이 끊겼습니다', why); menuKeep = 1;
}

// ---------------------------------------------------------------- my things (by nickname): packed for the host to keep
function netUserPack() {
  let s = `${Math.round(px * 10) / 10}^${Math.round(py * 10) / 10}^${Math.round(pz * 10) / 10}^${dim}^${Math.round(hp)}^${Math.round(food)}^${xpLevel}^${xpPts}^${gameMode}^${spawnX}^${spawnY}^${spawnZ}^${spawnSet}^`;
  let i = 1, n = 0;
  gS2 = '-';
  while (i <= 40) { if (INVI[i] > 0) { n = n + 1; if (n == 1) { gS2 = `${i}.${INVI[i]}.${INVN[i]}.${INVD[i]}`; } else { gS2 = `${gS2},${i}.${INVI[i]}.${INVN[i]}.${INVD[i]}`; } } i = i + 1; }
  return `${s}${gS2}`;
}
function netUserLoad(d) {
  splitBy(d, '^');
  if (SPL.length >= 14) {
    netArrX = SPL[1] * 1; netArrY = SPL[2] * 1; netArrZ = SPL[3] * 1; dim = SPL[4] * 1; px = netArrX; pz = netArrZ;
    hp = SPL[5] * 1; food = SPL[6] * 1; xpLevel = SPL[7] * 1; xpPts = SPL[8] * 1; gameMode = SPL[9] * 1;
    spawnX = SPL[10] * 1; spawnY = SPL[11] * 1; spawnZ = SPL[12] * 1; spawnSet = SPL[13] * 1;
    let inv = SPL[14];
    if (inv != '-') {
      splitBy(inv, ',');
      SPL2 = [];
      let i = 1;
      while (i <= SPL.length) { SPL2.push(SPL[i]); i = i + 1; }
      i = 1;
      while (i <= SPL2.length) { splitBy(SPL2[i], '.'); if (SPL.length >= 4) { let s = SPL[1] * 1; INVI[s] = SPL[2] * 1; INVN[s] = SPL[3] * 1; INVD[s] = SPL[4] * 1; } i = i + 1; }
    }
  }
}

// ---------------------------------------------------------------- in a server, each frame
let netTabOn = 0;
function netInServer(dt) {
  let h = srvHost(netSrv), was = netHost;
  netHost = 0;
  if (h == netMy) { netHost = 1; }
  if (netSt == 2) { if (h == 0) { netHost = 1; } }
  if (netHost == 1) { if (was == 0) { netEditsLoad(); metaRead(netSrv); srvHead(netSrv); editDirty = 0; metaDirty = 0; } }
  // the settings changed (the host wrote them): read again; banned now: out
  if (srvHas(netSrv) == 0) { if (netSt == 2) { netDisconnect('서버가 삭제되었습니다'); } }
  else {
    if (shRev != metaRev) { metaRead(netSrv); srvHead(netSrv); if (isBanned(netNick) > 0) { netDisconnect(`이 서버에서 차단되었습니다: ${MBANR[isBanned(netNick)]}`); } }
  }
  if (netSt == 2) {
    // my things every half minute
    netUserT = netUserT + dt;
    if (netUserT > 30) { netUserT = 0; evAdd('u', `${netSrv}^${netUserPack()}`); }
    // the day follows the host's
    if (h > 0) { if (h != netMy) { if (Math.abs(NTD[h] - tday) > 0.01) { tday = NTD[h]; } } }
    netEnts(dt);
    netChestWatch();
    if (netHost == 1) { hostStep(dt); }
  }
}

// ---------------------------------------------------------------- events heard
function netEvent(k, t, f) {
  netApplying = 1;
  if (t == 'b') { splitBy(f, '^'); if (SPL.length >= 5) { netEditApply(SPL[1] * 1, SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, SPL[5] * 1); } }
  if (t == 'c') { chatAdd(netDec(f)); }
  if (t == 'w') { splitBy(f, '^'); if (SPL.length >= 2) { if (SPL[1] == netNick) { chatAdd(`${NNICK[k]} 님의 귓속말: ${netDec(SPL[2])}`); } } }
  if (t == 'r') { splitBy(f, '^'); if (SPL.length >= 2) { if (SPL[1] == '*' || SPL[1] == netNick) { let cmd = netDec(SPL[2]); netQuiet = 1; netRunAs(cmd); netQuiet = 0; } } }
  if (t == 't') { titleS = netDec(f); titleT = 4; }
  // (v2.3) a command for me from someone who may give it (cmdaim.js)
  if (t == 'a') { splitBy(f, '^'); if (SPL.length >= 2) { if (SPL[1] == netNick) { let cmd = netDec(SPL[2]); cmdSplit(substr(cmd, 2, strlen(cmd))); if (permOk(NNICK[k], lower(bare(cw(1)))) == 1) { netRunAs(cmd); } } } }
  if (t == 'k') { splitBy(f, '^'); if (SPL.length >= 2) { if (SPL[1] == netNick && netNick != SUPER) { netDisconnect(netDec(SPL[2])); } } }
  if (t == 'h') { splitBy(f, '^'); if (SPL.length >= 4) { if (SPL[1] == netNick) { if (netSt == 2) { if (mod(gameMode, 2) == 0) { hurt(SPL[2] * 1, `${NNICK[k]} 님에게 당했습니다`); pvx = pvx + SPL[3] * 1; pvz = pvz + SPL[4] * 1; pvy = 4; } } } } }
  if (t == 'x') { splitBy(f, '^'); if (SPL.length >= 7) { netChestSlot(SPL[1] * 1, SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, SPL[5] * 1, SPL[6] * 1, SPL[7] * 1); } }
  if (t == 's') { splitBy(f, '^'); if (SPL.length >= 5) { netSignSet(SPL[1] * 1, SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, netDec(SPL[5])); } }
  netApplying = 0;
}
// a block someone changed: in this world now, or in the log for another
function netEditApply(x, y, z, b, d) {
  if (d == dim) {
    let o = blockAt(x, y, z);
    if (o != b) {
      if (BUSE[o + 1] == U_CHEST || BUSE[o + 1] == U_FURNACE) { chestOrFurnaceGone(x, y, z, o); }
      logOn = 1; setBlock(x, y, z, b); logOn = 0;
      if (BUSE[b + 1] == U_CHEST) { chestAt(x, y, z); }
    }
  } else { edPushD(x, y, z, b, d); }
}
// a block change of mine goes out (the player's own doing only: redstone, water and the rest run on every screen)
function netEdit(x, y, z, b) {
  if (netSrv > 0) { if (netSt == 2) { if (netApplying == 0) { if (netUserAct == 1) {
    if (netQuiet == 0) { evAdd('b', `${x}^${y}^${z}^${b}^${dim}`); }
    if (netHost == 1) { hostKeepEdit(x, y, z, b, dim); }
  } } } }
}
// a command a plugin (or the host) runs here, with every right
function netRunAs(cmd) {
  netApplying = 0;
  let a0 = netUserAct;
  netUserAct = 1; cmdFromBlock = 2; cmdX = px; cmdY = py; cmdZ = pz; cmdYaw = yaw; cmdPitch = pitch;
  runCommand(cmd);
  cmdFromBlock = 0; netUserAct = a0;
}

// ---------------------------------------------------------------- the host's work
function hostEvent(k, t, f) {
  if (t == 'b') { splitBy(f, '^'); if (SPL.length >= 5) { hostKeepEdit(SPL[1] * 1, SPL[2] * 1, SPL[3] * 1, SPL[4] * 1, SPL[5] * 1); } }
  if (t == 'u') { let c = indexOf(f, '^'); if (c > 1) { if (substr(f, 1, c - 1) * 1 == netSrv) { hostKeepUser(NNICK[k], substr(f, c + 1, strlen(f))); } } }
  if (t == 'q') { hostWish(NNICK[k], f); }
  if (t == 'x') { hostKeepChest(f); }
  if (t == 's') { splitBy(f, '^'); if (SPL.length >= 5) { hostKeepSign(`${SPL[1]},${SPL[2]},${SPL[3]},${SPL[4]}`, SPL[5]); } }
}
function hostKeepEdit(x, y, z, b, d) {
  if (NEW.length == 0) { netEditsLoad(); }
  NEW.push(x); NEW.push(y); NEW.push(z); NEW.push(b); NEW.push(d);
  editDirty = 1;
}
function netEditsLoad() {
  NEW = [];
  let n = editLen(netSrv), i = 1;
  while (i <= n) { NEW.push(editItem(netSrv, i)); i = i + 1; }
}
function hostKeepUser(nick, d) {
  let i = 1, f = 0;
  while (i <= MUN.length) { if (MUN[i] == nick) { f = i; } i = i + 1; }
  if (f == 0) { MUN.push(nick); MUD.push(d); } else { MUD[f] = d; }
  metaDirty = 1;
}
function hostKeepSign(key, t) {
  let i = 1, f = 0;
  while (i <= MSK.length) { if (MSK[i] == key) { f = i; } i = i + 1; }
  if (f == 0) { MSK.push(key); MST.push(t); } else { MST[f] = t; }
  metaDirty = 1;
}
function hostStep(dt) {
  netHostT = netHostT + dt; metaT = metaT + dt; editT = editT + dt;
  // the block changes and the settings written at most once a second / two
  if (editDirty == 1) { if (editT > 1) {
    // made short when long: the last of each cell
    if (NEW.length > 30000) { hostEditsCompact(); }
    editsPut(netSrv); editDirty = 0; editT = 0;
  } }
  if (metaDirty == 1) { if (metaT > 2) { metaWrite(netSrv); } }
  // timers of the plugins
  plugT = plugT + dt;
  if (plugT >= 1) { plugT = plugT - 1; plugTimers(); }
}
let plugSec = 0;
function plugTimers() {
  plugSec = plugSec + 1;
  let i = 1;
  while (i <= PLE.length) {
    if (PLO[i] == 1) { if (PLE[i] == 'timer') { let n = Math.max(1, PLC[i] * 1); if (mod(plugSec, n) == 0) { plugDo(i, netNick, ' '); } } }
    i = i + 1;
  }
}
// the server's block changes made short: the newest of each cell (and world) stays, in order
function hostEditsCompact() {
  if (EHK.length == 0) { let i = 0; while (i < EHN) { EHK.push(0); EHG.push(0); EHV.push(0); i = i + 1; } }
  ehGen = ehGen + 1;
  let n = NEW.length, q = 1;
  while (q + 4 <= n) {
    let key = hsKey(NEW[q], NEW[q + 1], NEW[q + 2]) + NEW[q + 4] * 1000000000000, h = mod(key, EHN) + 1, go = 1, t = 0;
    while (go == 1 && t < EHN) {
      if (EHG[h] != ehGen) { EHG[h] = ehGen; EHK[h] = key; EHV[h] = q; go = 0; }
      else { if (EHK[h] == key) { EHV[h] = q; go = 0; } else { h = h + 1; if (h > EHN) { h = 1; } t = t + 1; } }
    }
    q = q + 5;
  }
  NMW = [];
  q = 1;
  while (q + 4 <= n) {
    let key = hsKey(NEW[q], NEW[q + 1], NEW[q + 2]) + NEW[q + 4] * 1000000000000, h = mod(key, EHN) + 1, go = 1, t = 0, last = 0;
    while (go == 1 && t < EHN) {
      if (EHG[h] != ehGen) { go = 0; }
      else { if (EHK[h] == key) { last = EHV[h]; go = 0; } else { h = h + 1; if (h > EHN) { h = 1; } t = t + 1; } }
    }
    if (last == q) { NMW.push(NEW[q]); NMW.push(NEW[q + 1]); NMW.push(NEW[q + 2]); NMW.push(NEW[q + 3]); NMW.push(NEW[q + 4]); }
    q = q + 5;
  }
  NEW = [];
  q = 1;
  while (q <= NMW.length) { NEW.push(NMW[q]); q = q + 1; }
}
// a wish to change the server from player `who` (they must be an op)
function hostWish(who, f) {
  if (isOp(who) == 1) {
    splitBy(f, '^');
    let a = SPL[1], b = ' ';
    if (SPL.length >= 2) { b = SPL[2]; }
    if (a == 'op') { if (isOp(b) == 0) { MOP.push(b); } }
    if (a == 'deop') { let i = 1; while (i <= MOP.length) { if (MOP[i] == b) { MOP.removeAt(i); } else { i = i + 1; } } }
    if (a == 'ban') { if (isBanned(b) == 0) { MBAN.push(b); if (SPL.length >= 3) { MBANR.push(SPL[3]); } else { MBANR.push('관리자의 결정'); } } }
    if (a == 'pardon') { let i = 1; while (i <= MBAN.length) { if (MBAN[i] == b) { MBAN.removeAt(i); MBANR.removeAt(i); } else { i = i + 1; } } }
    if (a == 'wladd') { MWL.push(b); }
    if (a == 'wldel') { let i = 1; while (i <= MWL.length) { if (MWL[i] == b) { MWL.removeAt(i); } else { i = i + 1; } } }
    if (a == 'set') { let v = ' '; if (SPL.length >= 3) { v = SPL[3]; } if (b == 'motd') { shMotd = v; } if (b == 'pvp') { shPvp = v * 1; } if (b == 'mode') { shMode = v * 1; } if (b == 'wl') { shWl = v * 1; } if (b == 'max') { shMax = Math.max(1, Math.min(NSLOT, v * 1)); } if (b == 'name') { shName = v; } }
    if (a == 'padd') { if (SPL.length >= 6) { PLN.push(b); PLO.push(1); PLE.push(SPL[3]); PLC.push(SPL[4]); PLT.push(SPL[5]); PLX.push(SPL[6]); } }
    if (a == 'pdel') { let n = 0; if (SPL.length >= 3) { n = SPL[3] * 1; } let i = 1, m = 0; while (i <= PLN.length) { if (PLN[i] == b) { m = m + 1; if (n == 0 || m == n) { PLN.removeAt(i); PLO.removeAt(i); PLE.removeAt(i); PLC.removeAt(i); PLT.removeAt(i); PLX.removeAt(i); } else { i = i + 1; } } else { i = i + 1; } } }
    if (a == 'pset') { let lv = 1; if (SPL.length >= 3) { lv = SPL[3] * 1; } let i = 1; while (i <= MPC.length) { if (MPC[i] == b) { MPC.removeAt(i); MPL.removeAt(i); } else { i = i + 1; } } if (lv != cmdLvDefault(b)) { MPC.push(b); MPL.push(lv); } }
    if (a == 'pallow') { if (SPL.length >= 3) { let i = 1, has = 0; while (i <= MGN.length) { if (MGN[i] == b && MGC[i] == SPL[3]) { has = 1; } i = i + 1; } if (has == 0) { MGN.push(b); MGC.push(SPL[3]); } } }
    if (a == 'pdeny') { if (SPL.length >= 3) { let i = 1; while (i <= MGN.length) { if (MGN[i] == b && (MGC[i] == SPL[3] || SPL[3] == '*')) { MGN.removeAt(i); MGC.removeAt(i); } else { i = i + 1; } } } }
    if (a == 'preset') { MPC = []; MPL = []; MGN = []; MGC = []; }
    if (a == 'pon' || a == 'poff') { let i = 1; while (i <= PLN.length) { if (PLN[i] == b) { if (a == 'pon') { PLO[i] = 1; } else { PLO[i] = 0; } } i = i + 1; } }
    metaWrite(netSrv);
  }
}
// a change to the server: done here when I am the host, else asked of the host
function netWish(f) {
  if (netHost == 1) { hostWish(netNick, f); } else { evAdd('q', f); }
}

// ---------------------------------------------------------------- plugins
// A rule: when `event` happens (and its `if` fits), `who` (me: the player it happened to, all:
// everybody on the server) runs the command. Events: join, quit, chat (if: the words, * any),
// break / place (if: the block, * any), command (if: the name, then /name works for all), timer
// (if: every so many seconds, run on the host), death, respawn.
// In the command {player} {x} {y} {z} {msg} {block} {server} {online} are filled in.
let plugHits = 0;
function plugRun(ev, arg, who) {
  let i = 1, n = 0;
  while (i <= PLE.length) {
    if (PLO[i] == 1) { if (PLE[i] == ev) {
      let c = PLC[i], fits = 0;
      if (c == '*' || c == ' ') { fits = 1; }
      if (c == arg) { fits = 1; }
      if (ev == 'chat') { if (indexOf(arg, c) > 0) { fits = 1; } }
      if (fits == 1) { plugDo(i, who, arg); n = n + 1; }
    } }
    i = i + 1;
  }
  plugHits = n;
}
function plugDo(i, who, arg) {
  let c = netDec(PLX[i]);
  c = replace(c, '{player}', who); c = replace(c, '{msg}', arg); c = replace(c, '{block}', arg);
  c = replace(c, '{x}', `${Math.floor(px)}`); c = replace(c, '{y}', `${Math.floor(py)}`); c = replace(c, '{z}', `${Math.floor(pz)}`);
  c = replace(c, '{server}', shName); c = replace(c, '{online}', `${srvCount(netSrv)}`);
  if (PLT[i] == 'all') { evAdd('r', `*^${netClean(c)}`); netQuiet = 1; netRunAs(c); netQuiet = 0; }
  else { netRunAs(c); }
}
// a typed command a plugin answers (command:name): 1 when one did
function plugCommand(name, rest) {
  let r = 0;
  if (netSrv > 0) { plugRun('command', name, netNick); if (plugHits > 0) { r = 1; } }
  return r;
}

// ---------------------------------------------------------------- the others, drawn (mobs of the kind netPlayer)
function netEnts(dt) {
  let k = 1;
  while (k <= NSLOT) {
    let want = 0;
    if (k != netMy) { if (NLIVE[k] == 1) { if (NSRVk[k] == netSrv) { if (NSTT[k] >= 2) { if (NDIM[k] == dim) { if (NMODE[k] != 3) { if (cOK(Math.floor(NPX[k]), Math.floor(NPZ[k])) == 1) { want = 1; } } } } } } }
    let e = NENT[k];
    if (e > 0) { if (ET[e] != M_NETPLAYER) { e = 0; NENT[k] = 0; } }
    if (want == 1) {
      if (e == 0) { mobAdd(M_NETPLAYER, NPX[k], NPY[k], NPZ[k]); e = lastMob; NENT[k] = e; if (e > 0) { EST[e] = k; } }
      if (e > 0) {
        let a = Math.min(1, 12 * dt), ox = EX[e], oz = EZ[e];
        EX[e] = EX[e] + (NPX[k] - EX[e]) * a; EY[e] = EY[e] + (NPY[k] - EY[e]) * a; EZ[e] = EZ[e] + (NPZ[k] - EZ[e]) * a;
        if (Math.abs(NPX[k] - EX[e]) + Math.abs(NPZ[k] - EZ[e]) > 8) { EX[e] = NPX[k]; EY[e] = NPY[k]; EZ[e] = NPZ[k]; }
        EVX[e] = (EX[e] - ox) / Math.max(dt, 0.01); EVZ[e] = (EZ[e] - oz) / Math.max(dt, 0.01);
        EWALK[e] = EWALK[e] + Math.sqrt((EX[e] - ox) * (EX[e] - ox) + (EZ[e] - oz) * (EZ[e] - oz)) * 1.6;
        EYAW[e] = NYAW[k]; EHP[e] = 99; EST[e] = k;
        EHURT[e] = 0; if (mod(idiv(NFLG[k], 4), 2) == 1) { EHURT[e] = 0.3; }
      }
    } else { if (e > 0) { ET[e] = 0; NENT[k] = 0; } }
    k = k + 1;
  }
}
function netRemoveEnts() {
  let k = 1;
  while (k <= NSLOT) { let e = NENT[k]; if (e > 0) { if (ET[e] == M_NETPLAYER) { ET[e] = 0; } } NENT[k] = 0; k = k + 1; }
}
// I hit another player (the mob e stands for slot EST[e])
function netHit(e, dmg) {
  let k = EST[e];
  if (shPvp == 1) {
    let dx = EX[e] - px, dz = EZ[e] - pz, l = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
    evAdd('h', `${NNICK[k]}^${dmg}^${Math.round(dx / l * 60) / 10}^${Math.round(dz / l * 60) / 10}`);
    EHURT[e] = 0.4;
  } else { msgShow('이 서버는 플레이어끼리 싸울 수 없습니다', 1.5); }
}
// names over the heads (text slots 124..139), or the list of players while Tab is held
function netHud() {
  let k = 1, slot = 123;
  if (netSrv > 0) { if (netSt == 2) {
    if (key(9) && uiMode == 0) {
      penAlpha(55); box(-110, 108, 110, 92 - srvCount(netSrv) * 11, '#000000'); fillStop(); penAlpha(0);
      tx(124, `${shName} - ${srvCount(netSrv)}명`, 0, 100, 9, '#ffffa0', 0);
      slot = 124;
      while (k <= NSLOT) {
        if (NLIVE[k] == 1) { if (NSRVk[k] == netSrv) { if (NSTT[k] >= 1) {
          slot = slot + 1;
          let tag = '';
          if (isOp(NNICK[k]) == 1) { tag = ' [관리자]'; }
          if (k == srvHost(netSrv)) { tag = `${tag} [호스트]`; }
          if (slot <= 139) { tx(slot, `${NNICK[k]}${tag}`, 0, 100 - (slot - 124) * 11, 8, '#ffffff', 0); }
        } } }
        k = k + 1;
      }
    } else {
      while (k <= NSLOT) {
        let e = NENT[k];
        if (e > 0) { if (ET[e] == M_NETPLAYER) {
          let dx = EX[e] - camX, dy = EY[e] + 2.15 - camY, dz = EZ[e] - camZ;
          let vz = r31 * dx + r32 * dy + r33 * dz;
          if (vz > 0.5 && dx * dx + dz * dz < 1600) {
            slot = slot + 1;
            if (slot <= 139) {
              let sx = (r11 * dx + r13 * dz) * FOC / vz, sy = (r21 * dx + r22 * dy + r23 * dz) * FOC / vz;
              tx(slot, NNICK[k], sx, sy, 7, '#ffffff', 0);
            }
          }
        } }
        k = k + 1;
      }
    }
  } }
  slot = slot + 1;
  while (slot <= 139) { txOff(slot); slot = slot + 1; }
}

// ---------------------------------------------------------------- chests and signs on a server
let NCW = [], ncwC = 0;
// the chest open now: what changed in it goes out
function netChestWatch() {
  if (uiMode == 4) { if (curChest > 0) { if (CHON[curChest] == 1) {
    let c = curChest, k = 1, base = (c - 1) * 27;
    if (ncwC != c) { ncwC = c; NCW = []; while (k <= 81) { NCW.push(0); k = k + 1; } k = 1; while (k <= 27) { NCW[k] = CHI[base + k]; NCW[k + 27] = CHN[base + k]; NCW[k + 54] = CHD[base + k]; k = k + 1; } }
    else {
      k = 1;
      while (k <= 27) {
        if (NCW[k] != CHI[base + k] || NCW[k + 27] != CHN[base + k] || NCW[k + 54] != CHD[base + k]) {
          NCW[k] = CHI[base + k]; NCW[k + 27] = CHN[base + k]; NCW[k + 54] = CHD[base + k];
          let y = CHY[c] - dim * 1000;
          evAdd('x', `${CHX[c]}^${y}^${CHZ[c]}^${k}^${CHI[base + k]}^${CHN[base + k]}^${CHD[base + k]}`);
          if (netHost == 1) { hostKeepChest(`${CHX[c]}^${y}^${CHZ[c]}^${k}^${CHI[base + k]}^${CHN[base + k]}^${CHD[base + k]}`); }
        }
        k = k + 1;
      }
    }
  } } } else { ncwC = 0; }
}
function netChestSlot(x, y, z, k, id, n, d) {
  chestAt(x, y, z);
  if (cFound > 0) { let s = (cFound - 1) * 27 + k; CHI[s] = id; CHN[s] = n; CHD[s] = d; if (cFound == ncwC) { NCW[k] = id; NCW[k + 27] = n; NCW[k + 54] = d; } }
}
// the host keeps a chest as `x,y,z,dim` and its 27 slots (id.n.d,...)
function hostKeepChest(f) {
  splitBy(f, '^');
  if (SPL.length >= 7) {
    let key = `${SPL[1]},${SPL[2]},${SPL[3]},${dim}`, k = SPL[4] * 1, v = `${SPL[5]}.${SPL[6]}.${SPL[7]}`;
    let i = 1, f0 = 0;
    while (i <= MCK.length) { if (MCK[i] == key) { f0 = i; } i = i + 1; }
    if (f0 == 0) { let s = '0.0.0', j = 2; while (j <= 27) { s = `${s},0.0.0`; j = j + 1; } MCK.push(key); MCD.push(s); f0 = MCK.length; }
    splitBy(MCD[f0], ',');
    SPL[k] = v;
    let s = SPL[1], j = 2;
    while (j <= SPL.length) { s = `${s},${SPL[j]}`; j = j + 1; }
    MCD[f0] = s;
    metaDirty = 1;
  }
}
function netChestLoad(key, d) {
  splitBy(key, ',');
  if (SPL.length >= 4) {
    let x = SPL[1] * 1, y = SPL[2] * 1, z = SPL[3] * 1, dd = SPL[4] * 1, d0 = dim;
    dim = dd; chestAt(x, y, z); dim = d0;
    if (cFound > 0) {
      let c = cFound;
      splitBy(d, ',');
      SPL2 = [];
      let i = 1;
      while (i <= SPL.length) { SPL2.push(SPL[i]); i = i + 1; }
      i = 1;
      while (i <= SPL2.length && i <= 27) { splitBy(SPL2[i], '.'); if (SPL.length >= 3) { let s = (c - 1) * 27 + i; CHI[s] = SPL[1] * 1; CHN[s] = SPL[2] * 1; CHD[s] = SPL[3] * 1; } i = i + 1; }
    }
  }
}
function netSignSet(x, y, z, d, t) {
  let i = 1, f = 0;
  while (i <= SGX.length) { if (SGX[i] == x && SGY[i] == y && SGZ[i] == z && SGD[i] == d) { f = i; } i = i + 1; }
  if (f == 0) { SGX.push(x); SGY.push(y); SGZ.push(z); SGD.push(d); SGT.push(t); } else { SGT[f] = t; }
}
// a sign written here goes out
function netSign(x, y, z, t) {
  if (netSrv > 0) { if (netSt == 2) {
    let s = netClean(t);
    evAdd('s', `${x}^${y}^${z}^${dim}^${s}`);
    if (netHost == 1) { hostKeepSign(`${x},${y},${z},${dim}`, s); }
  } }
}
// the log entry of a change in another world (save.js edPush writes the one of this world)
function edPushD(x, y, z, b, d) {
  let d0 = dim;
  dim = d; edPush(x, y, z, b); dim = d0;
}

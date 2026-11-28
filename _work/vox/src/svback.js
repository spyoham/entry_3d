// ===================================================================== the servers kept on each player's computer too (v2.3)
// The servers live in Entry Sync's ?! lists, kept by Entry Sync under the work's number and the
// lists' names - not in the work. While the work is open in the editor, Entry Sync saves the values
// the editor has over them; a work whose lists were taken out and put back (or loaded again from a
// file, empty) can leave the servers empty. So every player's game keeps a copy of each server it
// was on (@서버백업: tessvm keeps @ lists between runs) and puts a server back into the shared
// lists when they have all been emptied (what an editor saving empty lists over them does). A
// server deleted on purpose is named in ?!gone and is not put back.
// (v2.3.2) Before, a copy went back when one server was missing, or older than the copy, 8 s after
// Entry Sync was on. When the room's values came later than that (a slow start), the copy - older
// than the room - was written over it, and what was done since (an /op) was gone. Now only when
// every server place is empty, 20 s on, and never over a server that is there.
// (v3.5) Asked of the real room server (test/syncsave.mjs): a save from the editor in which a list is EMPTY takes
// that list out of the room; one in which it is missing leaves it. So clearing the work and bringing its code
// back from the locker with Entry Sync on empties every server - and the first player to come put back the
// servers THEY had been on, after which no place was empty and nobody else's copies went back: a server only
// others had played stayed lost. Now a copy goes back whenever its server is in no place (20 s on, not over one
// that is there, not one deleted on purpose); of two places with one server the one with the older settings
// is cleared (it was the later place - which could be the room's own, were a copy put back before it came).
// (v3.5, 11-25) Putting a server back is SUPER's alone: a copy is what one browser holds, and whoever had one could
// bring a server back as it once was (or as they had made the copy). Everyone still keeps a copy of the server
// they are on; only SUPER's game writes one into the shared lists. So that SUPER has them all - not only the
// servers SUPER played on - SUPER's game keeps a copy of every server on the list (bkKeepAll: 20 s on, those
// that differ from their copy; all of them from the menu every 10 s, one a minute while playing).
// @서버백업: sections SB, id, name, owner, rev, nm, nm settings lines, ne, ne block numbers.
let AT_서버백업 = [];
// ((v3.5, 11-26) @서버바탕: the bases of the servers made from large maps (mapdata.js), kept by SUPER's game alone -
// they never change, so once each: sections BB, id, n, n items)
let AT_서버바탕 = [];
let SY_gone = [];
let SBT = [], bkT = 0, bkChkT = 0, syOnT = 0 - 1, bkSrv = 0, bkPut = 0, bkTold = 0, bkAllT = 0, bkAllK = 0;

// where the section of server id starts (0: none)
function bkFind(id) {
  let p = 1, r = 0, n = AT_서버백업.length;
  while (p <= n && r == 0) {
    if (AT_서버백업[p] == 'SB') {
      if (AT_서버백업[p + 1] == id) { r = p; }
      else { let nm = AT_서버백업[p + 5] * 1, ne = AT_서버백업[p + 6 + nm] * 1; p = p + 7 + nm + ne; }
    } else { p = n + 1; }
  }
  return r;
}
function bbFind(id) {
  let p = 1, r = 0, n = AT_서버바탕.length;
  while (p <= n && r == 0) {
    if (AT_서버바탕[p] == 'BB') { if (AT_서버바탕[p + 1] == id) { r = p; } else { p = p + 3 + AT_서버바탕[p + 2] * 1; } }
    else { p = n + 1; }
  }
  return r;
}
function bbDrop(id) {
  let p = bbFind(id);
  if (p > 0) {
    let e = p + 3 + AT_서버바탕[p + 2] * 1, i = 1;
    SBT = [];
    while (i < p) { SBT.push(AT_서버바탕[i]); i = i + 1; }
    i = e;
    while (i <= AT_서버바탕.length) { SBT.push(AT_서버바탕[i]); i = i + 1; }
    AT_서버바탕 = [];
    i = 1;
    while (i <= SBT.length) { AT_서버바탕.push(SBT[i]); i = i + 1; }
    SBT = [];
  }
}
// the base of server k (sh* its header) kept, if it has one and it is not kept yet
function bbKeep(k) {
  let s = baseOf();
  if (s > 0) { if (bbFind(shId) == 0) {
    let n = baseLen(s), i = 1;
    AT_서버바탕.push('BB'); AT_서버바탕.push(shId); AT_서버바탕.push(n);
    while (i <= n) { AT_서버바탕.push(baseItem(s, i)); i = i + 1; }
  } }
}
// the kept base of the server `id` into a free list of the pool (the server put back just now)
function bbWrite(id) {
  let p = bbFind(id);
  if (p > 0) {
    let s = baseFree();
    if (s > 0) {
      let n = AT_서버바탕[p + 2] * 1, i = 1;
      baseClear(s);
      while (i <= n) { basePush(s, AT_서버바탕[p + 2 + i]); i = i + 1; }
    }
  }
}
// the section at p taken out
function bkDropAt(p) {
  let nm = AT_서버백업[p + 5] * 1, ne = AT_서버백업[p + 6 + nm] * 1, e = p + 7 + nm + ne, i = 1;
  SBT = [];
  while (i < p) { SBT.push(AT_서버백업[i]); i = i + 1; }
  i = e;
  while (i <= AT_서버백업.length) { SBT.push(AT_서버백업[i]); i = i + 1; }
  AT_서버백업 = [];
  i = 1;
  while (i <= SBT.length) { AT_서버백업.push(SBT[i]); i = i + 1; }
  SBT = [];
}
// a copy of server k as it is in the shared lists now
function bkKeep(k) {
  if (srvHas(k) == 1) {
    let id = shId, p = bkFind(id);
    if (p > 0) { bkDropAt(p); }
    let nm = metaLen(k), ne = editLen(k), i = 1;
    AT_서버백업.push('SB'); AT_서버백업.push(id); AT_서버백업.push(shName); AT_서버백업.push(shOwner); AT_서버백업.push(shRev);
    AT_서버백업.push(nm);
    while (i <= nm) { AT_서버백업.push(metaItem(k, i)); i = i + 1; }
    AT_서버백업.push(ne);
    i = 1;
    while (i <= ne) { AT_서버백업.push(editItem(k, i)); i = i + 1; }
    if (iAmSuper() == 1) { bbKeep(k); }
  }
}
// the section at p into server place k of the shared lists
function bkWrite(p, k) {
  let nm = AT_서버백업[p + 5] * 1, ne = AT_서버백업[p + 6 + nm] * 1, i = 1;
  NMW = [];
  while (i <= nm) { NMW.push(AT_서버백업[p + 5 + i]); i = i + 1; }
  NEW = [];
  i = 1;
  while (i <= ne) { NEW.push(AT_서버백업[p + 6 + nm + i]); i = i + 1; }
  metaPut(k); editsPut(k);
  NMW = []; NEW = [];
  bbWrite(AT_서버백업[p + 1]);
}
function bkGone(id) {
  let r = 0, i = 1;
  while (i <= SY_gone.length) { if (SY_gone[i] == id) { r = 1; } i = i + 1; }
  return r;
}
// a server deleted on purpose (before it is cleared): its copy goes, and every copy elsewhere too
function svBackDrop(k) {
  if (srvHas(k) == 1) {
    let id = shId, p = bkFind(id);
    if (p > 0) { bkDropAt(p); }
    bbDrop(id);
    // (and the list of the pool its base was in is free again)
    baseGone(baseOf());
    // ((11-28) and the one its machines' state was in)
    baseGone(stOf());
    if (bkGone(id) == 0) { SY_gone.push(id); if (SY_gone.length > 64) { SY_gone.removeAt(1); } }
    if (svAuto() == 1) { svPut(0); }
  }
}
// the copies against the shared lists (once they have come: some seconds after Entry Sync is on)
let BKID = [];
function bkCheck() {
  let p = 1, n = AT_서버백업.length, ch = 0, any = 0, q = 1;
  bkPut = 0;
  // (only when every place is empty; each place's id read once into BKID, '-' for an empty one)
  BKID = [];
  while (q <= NSRV) { if (srvHas(q) == 1) { any = 1; BKID.push(shId); } else { BKID.push('-'); } q = q + 1; }
  while (p <= n) {
    if (AT_서버백업[p] != 'SB') { p = n + 1; }
    else {
      let id = AT_서버백업[p + 1], rev = AT_서버백업[p + 4] * 1, name = AT_서버백업[p + 2];
      if (bkGone(id) == 1) { bkDropAt(p); bbDrop(id); n = AT_서버백업.length; ch = 1; }
      else {
        let k = 1, at = 0, free = 0;
        while (k <= NSRV) {
          if (BKID[k] != '-') { if (BKID[k] == id) { if (at == 0) { at = k; } } } else { if (free == 0) { free = k; } }
          k = k + 1;
        }
        if (at == 0) {
          if (free > 0) {
            // ((11-25) SUPER alone puts one back; the others are told once that they hold it)
            if (iAmSuper() == 1) { bkWrite(p, free); BKID[free] = id; bkPut = bkPut + 1; netMsg = `사라진 서버 '${name}'을(를) 이 컴퓨터에 남은 기록에서 되살렸습니다`; }
            else { if (bkTold == 0) { bkTold = 1; netMsg = `사라진 서버 '${name}'의 기록이 이 컴퓨터에 있습니다 · 되살리기는 ${SUPER} 님만 할 수 있습니다`; } }
          }
        }
        let nm = AT_서버백업[p + 5] * 1, ne = AT_서버백업[p + 6 + nm] * 1;
        p = p + 7 + nm + ne;
      }
    }
  }
  // (two places holding one server - two games put it back at once: the later place is cleared)
  let a = 1;
  while (a <= NSRV) {
    if (BKID[a] != '-') {
      let b = a + 1;
      while (b <= NSRV) {
        if (BKID[b] == BKID[a]) {
          // (the one with the older settings goes; nobody may be in it)
          let ra = 0, rb = 0, g = b;
          if (srvHas(a) == 1) { ra = shRev; } if (srvHas(b) == 1) { rb = shRev; }
          if (ra < rb) { g = a; }
          if (srvCount(g) > 0 || g == netSrv) { if (g == a) { g = b; } else { g = a; } }
          if (srvCount(g) == 0 && g != netSrv) { srvWipe(g); BKID[g] = '-'; if (g == a) { b = NSRV; } }
        }
        b = b + 1;
      }
    }
    a = a + 1;
  }
  if (ch == 1) { if (svAuto() == 1) { svPut(0); } }
  // (srvHas above read every place into the sh* globals: back to the server I am on)
  if (netSrv > 0) { srvHead(netSrv); }
}
// ((11-25) is the copy of the server at place k another than what the shared lists hold now - or is there none)
function bkStale(k) {
  let r = 0;
  if (srvHas(k) == 1) {
    let p = bkFind(shId), nm = metaLen(k), ne = editLen(k);
    if (p == 0) { r = 1; }
    else {
      // ((11-26) or its base is not kept yet)
      if (iAmSuper() == 1) { if (baseOf() > 0) { if (bbFind(shId) == 0) { r = 1; } } }
      let cm = AT_서버백업[p + 5] * 1, ce = 0 - 1;
      if (cm == nm) { ce = AT_서버백업[p + 6 + cm] * 1; }
      if (ce != ne) { r = 1; }
      else {
        let i = 1;
        while (i <= nm && r == 0) { if (AT_서버백업[p + 5 + i] != metaItem(k, i)) { r = 1; } i = i + 1; }
        i = 1;
        while (i <= ne && r == 0) { if (AT_서버백업[p + 6 + nm + i] != editItem(k, i)) { r = 1; } i = i + 1; }
      }
    }
  }
  return r;
}
// ((11-25) SUPER's game: a copy of up to max servers that differ from theirs, beginning after the last one kept;
// the one I am on has its own minute)
function bkKeepAll(max) {
  let i = 1, n = 0, last = bkAllK;
  while (i <= NSRV) {
    let k = mod(bkAllK + i - 1, NSRV) + 1;
    if (n < max && k != netSrv) { if (bkStale(k) == 1) { bkKeep(k); n = n + 1; last = k; } }
    i = i + 1;
  }
  bkAllK = last;
  if (n > 0) { svPut(0); }
  if (netSrv > 0) { srvHead(netSrv); }
}
// each frame (net.js netStep)
function svBackStep(dt) {
  if (SY_ == 1) { if (syOnT < 0) { syOnT = netClock; } } else { syOnT = 0 - 1; }
  if (svAuto() == 1) {
    // on a server: a copy soon after coming, then every minute
    if (netSrv != bkSrv) { bkSrv = netSrv; bkT = 50; }
    bkT = bkT + dt;
    if (netSrv > 0 && netSt == 2 && bkT > 60) { bkT = 0; bkKeep(netSrv); svPut(0); }
    bkChkT = bkChkT + dt;
    if (syOnT >= 0 && netClock - syOnT > 20 && bkChkT > 10) { bkChkT = 0; if (AT_서버백업.length > 0) { bkCheck(); } gbCheck(); }
    // ((11-25) SUPER's copies of every server: after the check above, so a lost one is put back first)
    bkAllT = bkAllT + dt;
    let aw = 10, am = NSRV;
    if (netSt == 2) { aw = 60; am = 1; }
    if (bkAllT > aw) { bkAllT = 0; if (syOnT >= 0 && netClock - syOnT > 20) { if (iAmSuper() == 1) { bkKeepAll(am); } } }
  }
  ageT = ageT + dt;
  if (syOnT >= 0 && netClock - syOnT > 20 && ageT > 30) { ageT = 0; srvAgeCheck(); }
}
// ---------------------------------------------------------------- servers nobody plays (v2.4.1)
// Each server's header holds the day it was last played (its host writes it). One nobody has played
// for SRVDAYS days is cleared by whoever has the server list open, its place freed for new ones.
// (Each computer's own clock says what day it is: so that one set wrong cannot clear them all, a
// server goes only when another server has been played SRVDAYS days after it too.)
const SRVDAYS = 30;
let ageT = 0;
// days since long ago (the civil calendar), from this computer's clock
function dayNow() {
  let y = dateYear(), m = dateMonth(), d = dateDay(), mm = m - 3;
  if (m <= 2) { y = y - 1; mm = m + 9; }
  return 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + Math.floor((153 * mm + 2) / 5) + d - 738000;
}
function srvAgeCheck() {
  let today = dayNow(), newest = 0, k = 1, gone = 0;
  while (k <= NSRV) { if (srvHas(k) == 1) { if (shDay > newest) { if (shDay <= today + 2) { newest = shDay; } } } k = k + 1; }
  k = 1;
  while (k <= NSRV) {
    // ((11-26) what is left of a server deleted - a header with no owner, or one written again by a game that had
    // not heard: cleared (net.js shDead))
    if (srvHas(k) == 0) { if (shDead == 1) { if (srvCount(k) == 0 && k != netSrv) { srvWipe(k); } } }
    if (srvHas(k) == 1) { if (srvCount(k) == 0 && k != netSrv) {
      if (shDay <= 0) {
        // (a server from before v2.4.1: its day starts now)
        shDay = today; NMW = []; NMW.push(headLine());
        let i = 2, n = metaLen(k);
        while (i <= n) { NMW.push(metaItem(k, i)); i = i + 1; }
        metaPut(k);
      } else {
        if (today - shDay >= SRVDAYS && newest - shDay >= SRVDAYS) {
          gS2 = shName;
          svBackDrop(k);
          srvWipe(k);
          gone = gone + 1;
          if (gone == 1) { netMsg = `${SRVDAYS}일 넘게 아무도 들어오지 않은 서버 '${gS2}'을(를) 지웠습니다`; }
          else { netMsg = `${SRVDAYS}일 넘게 아무도 들어오지 않은 서버 ${gone}개를 지웠습니다`; }
        }
      }
    } }
    k = k + 1;
  }
  if (netSrv > 0) { srvHead(netSrv); }
}
// leaving a server: its copy as it is then
function svBackLeave() {
  if (svAuto() == 1) { if (netSrv > 0 && netSt == 2) { bkKeep(netSrv); svPut(0); } }
}

// ---------------------------------------------------------------- the nicknames banned from every server, kept too (v2.7.4)
// Each player's tessvm keeps a copy of ?!gb (@전체차단: its revision ?!gbr, then the lines). 20 s after
// Entry Sync is on and every 10 s: a newer shared list is copied; one that is older than the copy, or
// emptied with the same revision (Entry Sync's lists wiped), is written back from the copy. A ban
// lifted by SUPER raises the revision, so an older copy never brings it back.
let AT_전체차단 = [];
let gbChkN = 0;
function gbKeep() {
  if (svAuto() == 1) {
    AT_전체차단 = [];
    AT_전체차단.push(SY_gbr * 1);
    let i = 1;
    while (i <= SY_gb.length) { AT_전체차단.push(SY_gb[i]); i = i + 1; }
    svPut(0);
  }
}
// is the copy the shared list
function gbSame() {
  let r = 1, i = 1;
  if (AT_전체차단.length != SY_gb.length + 1) { r = 0; }
  else { while (i <= SY_gb.length) { if (AT_전체차단[i + 1] != SY_gb[i]) { r = 0; } i = i + 1; } }
  return r;
}
function gbCheck() {
  let sr = SY_gbr * 1, B = 0 - 1;
  if (AT_전체차단.length > 0) { B = AT_전체차단[1] * 1; }
  if (B < 0) { if (SY_gb.length > 0 || sr > 0) { gbKeep(); } }
  else {
    let back = 0;
    if (sr < B) { back = 1; }
    if (sr == B) { if (SY_gb.length == 0) { if (AT_전체차단.length > 1) { back = 1; } } }
    if (back == 1) {
      SY_gb = [];
      let i = 2;
      while (i <= AT_전체차단.length) { SY_gb.push(AT_전체차단[i]); i = i + 1; }
      SY_gbr = B;
      gbChkN = gbChkN + 1;
    }
    else { if (gbSame() == 0) { gbKeep(); } }
  }
}

// ---------------------------------------------------------------- the bans this computer met (v3.4, 11-22)
// A ban is of a nickname, and a nickname can be changed. So the game keeps, on the player's own computer
// (@차단표시: tessvm keeps @ lists between runs), the nicknames it was banned under:
//   G^nick^rev          from every server (rev: ?!gbr when it was seen)
//   S^server id^nick^seen^day  on one server (seen: 1 once the nickname was in its ban list; 0 from the kick
//                       of /ban until the settings with it come - such a mark not met again goes after a day)
// Under any nickname the player stays banned while that nickname is: from every server while it is in ?!gb,
// on that server while it is in its B lines. A ban lifted takes the mark away: for every server - the nickname
// gone from ?!gb AND its revision above the mark's (a list the editor wiped has a lower one and comes back from
// the copies: the mark waits); for one server - the nickname gone from a ban list it was seen in. SUPER is never marked. 40 marks at most, the oldest go.
// It holds for this browser's store alone: another browser or computer, or the extension's data cleared,
// starts without it - and whoever plays next on the same browser is banned with it.
let AT_차단표시 = [];
let bmNick = '', BMT = [];
function bmFind(pre) {
  let r = 0, i = 1, L = strlen(pre);
  while (i <= AT_차단표시.length) { if (substr(`${AT_차단표시[i]}`, 1, L) == pre) { r = i; } i = i + 1; }
  return r;
}
function bmDrop(k) {
  let i = 1;
  BMT = [];
  while (i <= AT_차단표시.length) { if (i != k) { BMT.push(AT_차단표시[i]); } i = i + 1; }
  AT_차단표시 = []; i = 1;
  while (i <= BMT.length) { AT_차단표시.push(BMT[i]); i = i + 1; }
  BMT = [];
}
// (written when the game may write on its own (svAuto); else it goes with the next write of anything)
function bmMark(pre, rev) {
  if (bmFind(pre) == 0) {
    if (AT_차단표시.length >= 40) { bmDrop(1); }
    AT_차단표시.push(`${pre}${rev}`);
    if (svAuto() == 1) { svPut(0); }
  }
}
// the place in ?!gb of my nickname, or of one this computer was banned under (0: free); bmNick: which
function gbanMine() {
  let r = 0, i = 0, cut = 0;
  bmNick = netNick;
  if (netNick != SUPER) {
    r = gbanOf(netNick);
    if (r > 0) { bmMark(`G^${netNick}^`, SY_gbr * 1); }
    else {
      i = AT_차단표시.length;
      while (i >= 1) {
        splitBy(`${AT_차단표시[i]}`, '^');
        if (SPL[1] == 'G') { if (SPL.length >= 3) {
          let nk = SPL[2], rv = SPL[3] * 1, g = gbanOf(nk);
          if (g > 0) { r = g; bmNick = nk; }
          else { if (SY_ == 1) { if (SY_gbr * 1 > rv) { bmDrop(i); cut = 1; } } }
        } }
        i = i - 1;
      }
      if (cut == 1) { if (svAuto() == 1) { svPut(0); } }
    }
  }
  return r;
}
function gbanText(g) {
  let t = `모든 서버에서 차단되었습니다: ${gbanWhy(g)}`;
  if (bmNick != netNick) { t = `${t} (닉네임 ${bmNick} 의 차단)`; }
  return t;
}
// the place in this server's ban list of my nickname, or of one this computer was banned under here (0: free)
// - after metaRead and srvHead of that server
function banMine() {
  let r = 0, i = 0, cut = 0, sid = `${shId}`;
  bmNick = netNick;
  if (netNick != SUPER) {
    r = isBanned(netNick);
    if (strlen(sid) > 0) {
      if (r > 0) { i = bmFind(`S^${sid}^${netNick}^`); if (i == 0) { bmMark(`S^${sid}^${netNick}^`, `1^${dayNow()}`); } else { bmSeen(i, sid, netNick); } }
      else {
        i = AT_차단표시.length;
        while (i >= 1) {
          splitBy(`${AT_차단표시[i]}`, '^');
          if (SPL[1] == 'S') { if (SPL.length >= 4) { if (`${SPL[2]}` == sid) {
            let nk = SPL[3], sn = SPL[4] * 1, dy = 0, b = isBanned(nk);
            if (SPL.length >= 5) { dy = SPL[5] * 1; }
            if (b > 0) { r = b; bmNick = nk; if (sn == 0) { bmSeen(i, sid, nk); } }
            else { if (sn == 1 || dayNow() - dy >= 1) { bmDrop(i); cut = 1; } }
          } } }
          i = i - 1;
        }
        if (cut == 1) { if (svAuto() == 1) { svPut(0); } }
      }
    }
  }
  return r;
}
// (mark i: its nickname is in the server's ban list)
function bmSeen(i, sid, nk) {
  let pre = `S^${sid}^${nk}^1^`;
  if (substr(`${AT_차단표시[i]}`, 1, strlen(pre)) != pre) { AT_차단표시[i] = `${pre}${dayNow()}`; if (svAuto() == 1) { svPut(0); } }
}
function banText(b) {
  let t = `이 서버에서 차단되었습니다: ${MBANR[b]}`;
  if (bmNick != netNick) { t = `${t} (닉네임 ${bmNick} 의 차단)`; }
  return t;
}

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
// @서버백업: sections SB, id, name, owner, rev, nm, nm settings lines, ne, ne block numbers.
let AT_서버백업 = [];
let SY_gone = [];
let SBT = [], bkT = 0, bkChkT = 0, syOnT = 0 - 1, bkSrv = 0, bkPut = 0;

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
    if (bkGone(id) == 0) { SY_gone.push(id); if (SY_gone.length > 64) { SY_gone.removeAt(1); } }
    if (canSave() == 1) { AT_비동기저장(); }
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
      if (bkGone(id) == 1) { bkDropAt(p); n = AT_서버백업.length; ch = 1; }
      else {
        let k = 1, at = 0, free = 0;
        while (k <= NSRV) {
          if (BKID[k] != '-') { if (BKID[k] == id) { if (at == 0) { at = k; } } } else { if (free == 0) { free = k; } }
          k = k + 1;
        }
        if (at == 0 && any == 0) {
          if (free > 0) { bkWrite(p, free); BKID[free] = id; bkPut = bkPut + 1; netMsg = `사라진 서버 '${name}'을(를) 이 컴퓨터에 남은 기록에서 되살렸습니다`; }
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
      while (b <= NSRV) { if (BKID[b] == BKID[a]) { if (srvCount(b) == 0 && b != netSrv) { NMW = []; metaPut(b); NEW = []; editsPut(b); BKID[b] = '-'; } } b = b + 1; }
    }
    a = a + 1;
  }
  if (ch == 1) { if (canSave() == 1) { AT_비동기저장(); } }
  // (srvHas above read every place into the sh* globals: back to the server I am on)
  if (netSrv > 0) { srvHead(netSrv); }
}
// each frame (net.js netStep)
function svBackStep(dt) {
  if (SY_ == 1) { if (syOnT < 0) { syOnT = netClock; } } else { syOnT = 0 - 1; }
  if (canSave() == 1) {
    // on a server: a copy soon after coming, then every minute
    if (netSrv != bkSrv) { bkSrv = netSrv; bkT = 50; }
    bkT = bkT + dt;
    if (netSrv > 0 && netSt == 2 && bkT > 60) { bkT = 0; bkKeep(netSrv); AT_비동기저장(); }
    bkChkT = bkChkT + dt;
    if (syOnT >= 0 && netClock - syOnT > 20 && bkChkT > 10) { bkChkT = 0; if (AT_서버백업.length > 0) { bkCheck(); } gbCheck(); }
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
          NMW = []; metaPut(k); NEW = []; editsPut(k);
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
  if (canSave() == 1) { if (netSrv > 0 && netSt == 2) { bkKeep(netSrv); AT_비동기저장(); } }
}

// ---------------------------------------------------------------- the nicknames banned from every server, kept too (v2.7.4)
// Each player's tessvm keeps a copy of ?!gb (@전체차단: its revision ?!gbr, then the lines). 20 s after
// Entry Sync is on and every 10 s: a newer shared list is copied; one that is older than the copy, or
// emptied with the same revision (Entry Sync's lists wiped), is written back from the copy. A ban
// lifted by SUPER raises the revision, so an older copy never brings it back.
let AT_전체차단 = [];
let gbChkN = 0;
function gbKeep() {
  if (canSave() == 1) {
    AT_전체차단 = [];
    AT_전체차단.push(SY_gbr * 1);
    let i = 1;
    while (i <= SY_gb.length) { AT_전체차단.push(SY_gb[i]); i = i + 1; }
    AT_비동기저장();
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

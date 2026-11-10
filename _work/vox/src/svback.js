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
function bkCheck() {
  let p = 1, n = AT_서버백업.length, ch = 0, any = 0, q = 1;
  bkPut = 0;
  // (only when every place is empty)
  while (q <= NSRV) { if (metaLen(q) > 0) { any = 1; } q = q + 1; }
  while (p <= n) {
    if (AT_서버백업[p] != 'SB') { p = n + 1; }
    else {
      let id = AT_서버백업[p + 1], rev = AT_서버백업[p + 4] * 1, name = AT_서버백업[p + 2];
      if (bkGone(id) == 1) { bkDropAt(p); n = AT_서버백업.length; ch = 1; }
      else {
        let k = 1, at = 0, free = 0;
        while (k <= NSRV) {
          if (srvHas(k) == 1) { if (shId == id) { if (at == 0) { at = k; } } } else { if (free == 0) { free = k; } }
          k = k + 1;
        }
        if (at == 0 && any == 0) {
          if (free > 0) { bkWrite(p, free); bkPut = bkPut + 1; netMsg = `사라진 서버 '${name}'을(를) 이 컴퓨터에 남은 기록에서 되살렸습니다`; }
        }
        let nm = AT_서버백업[p + 5] * 1, ne = AT_서버백업[p + 6 + nm] * 1;
        p = p + 7 + nm + ne;
      }
    }
  }
  // (two places holding one server - two games put it back at once: the later place is cleared)
  let a = 1;
  while (a <= NSRV) {
    if (srvHas(a) == 1) {
      let ida = shId, b = a + 1;
      while (b <= NSRV) { if (srvHas(b) == 1) { if (shId == ida) { if (srvCount(b) == 0 && b != netSrv) { NMW = []; metaPut(b); NEW = []; editsPut(b); } } } b = b + 1; }
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
    if (syOnT >= 0 && netClock - syOnT > 20 && bkChkT > 10) { bkChkT = 0; if (AT_서버백업.length > 0) { bkCheck(); } }
  }
}
// leaving a server: its copy as it is then
function svBackLeave() {
  if (canSave() == 1) { if (netSrv > 0 && netSt == 2) { bkKeep(netSrv); AT_비동기저장(); } }
}

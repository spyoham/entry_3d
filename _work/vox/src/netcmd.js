// ===================================================================== commands on a server (v2.1)
// netCmd sets netCmdHit (1: answered here) and netCmdOut. Everybody may use help, list, tell
// (msg, w), me and the commands of the plugins; the rest is for the server's ops (and the owner).
let netCmdHit = 0, netCmdOut = '';
function netCmd(c) {
  netCmdHit = 1; netCmdOut = '';
  let n = cw(2), sub = lower(cw(2));
  let free = 0;
  if (c == 'help' || c == '?' || c == 'list' || c == 'tell' || c == 'msg' || c == 'w' || c == 'me') { free = 1; }
  if (plugCommand(c, ' ') == 1) { netCmdOut = ''; }
  else {
    if (free == 0 && cmdFromBlock == 0 && iAmOp() == 0) { netCmdOut = '이 명령어는 서버 관리자만 쓸 수 있습니다'; }
    else {
      if (c == 'list') { netCmdOut = netListText(); }
      else { if (c == 'tell' || c == 'msg' || c == 'w') { let t = netClean(wordsFrom(3, CMW.length)); evAdd('w', `${n}^${t}`); netCmdOut = `${n} 님에게 속삭임: ${t}`; }
      else { if (c == 'me') { let t = `* ${netNick} ${netClean(wordsFrom(2, CMW.length))}`; if (netQuiet == 0) { evAdd('c', t); } netCmdOut = netDec(t); }
      else { if (c == 'say') { let t = `[${netNick}] ${netClean(plainText(wordsFrom(2, CMW.length)))}`; if (cmdFromBlock == 2) { t = netClean(plainText(wordsFrom(2, CMW.length))); } if (netQuiet == 0) { evAdd('c', t); } netCmdOut = netDec(t); }
      else { if (c == 'op') { netWish(`op^${n}`); netCmdOut = `${n} 님을 관리자로 만들었습니다`; }
      else { if (c == 'deop') { if (n == shOwner) { netCmdOut = '서버 주인은 관리자에서 뺄 수 없습니다'; } else { netWish(`deop^${n}`); netCmdOut = `${n} 님을 관리자에서 뺐습니다`; } }
      else { if (c == 'ban') { if (n == shOwner) { netCmdOut = '서버 주인은 차단할 수 없습니다'; } else { let why = '관리자의 결정'; if (CMW.length >= 3) { why = netClean(wordsFrom(3, CMW.length)); } netWish(`ban^${n}^${why}`); evAdd('k', `${n}^이 서버에서 차단되었습니다: ${why}`); netCmdOut = `${n} 님을 차단했습니다`; } }
      else { if (c == 'pardon' || c == 'unban') { netWish(`pardon^${n}`); netCmdOut = `${n} 님의 차단을 풀었습니다`; }
      else { if (c == 'kick') { let why = '서버에서 쫓겨났습니다'; if (CMW.length >= 3) { why = netClean(wordsFrom(3, CMW.length)); } evAdd('k', `${n}^${why}`); netCmdOut = `${n} 님을 내보냈습니다`; }
      else { if (c == 'whitelist') { netCmdOut = netWhitelist(sub, cw(3)); }
      else { if (c == 'server') { netCmdOut = netServerCmd(sub); }
      else { if (c == 'plugin' || c == 'plugins' || c == 'pl') { netCmdOut = netPluginCmd(sub); }
      else { netCmdHit = 0; } } } } } } } } } } } }
    }
  }
}
function netListText() {
  let j = 1, n = 0;
  gS = ' ';
  while (j <= NSLOT) { if (NLIVE[j] == 1) { if (NSRVk[j] == netSrv) { if (NSTT[j] >= 1) { n = n + 1; if (n == 1) { gS = NNICK[j]; } else { gS = `${gS}, ${NNICK[j]}`; } } } } j = j + 1; }
  return `접속한 플레이어 ${n}명 (최대 ${shMax}명): ${gS}`;
}
function netWhitelist(sub, n) {
  gS = '-';
  if (sub == 'add') { netWish(`wladd^${n}`); gS = `${n} 님을 화이트리스트에 넣었습니다`; }
  if (sub == 'remove') { netWish(`wldel^${n}`); gS = `${n} 님을 화이트리스트에서 뺐습니다`; }
  if (sub == 'on') { netWish('set^wl^1'); gS = '화이트리스트를 켰습니다 (목록에 있는 사람과 관리자만 들어옵니다)'; }
  if (sub == 'off') { netWish('set^wl^0'); gS = '화이트리스트를 껐습니다'; }
  if (gS == '-') { let i = 1; gS = '화이트리스트:'; while (i <= MWL.length) { gS = `${gS} ${MWL[i]}`; i = i + 1; } }
  return gS;
}
function netServerCmd(sub) {
  gS = '-'; let v = cw(3);
  if (sub == 'motd') { let t = netClean(wordsFrom(3, CMW.length)); netWish(`set^motd^${t}`); gS = `서버 설명을 바꿨습니다: ${t}`; }
  if (sub == 'name') { let t = netClean(wordsFrom(3, CMW.length)); netWish(`set^name^${t}`); gS = `서버 이름을 바꿨습니다: ${t}`; }
  if (sub == 'pvp') { let p = 0; if (lower(v) == 'on' || v == '1' || lower(v) == 'true') { p = 1; } netWish(`set^pvp^${p}`); gS = `플레이어끼리 싸우기: ${p}`; }
  if (sub == 'mode') { let m = 0; if (lower(v) == 'creative' || v == '1') { m = 1; } if (lower(v) == 'adventure' || v == '2') { m = 2; } netWish(`set^mode^${m}`); gS = `새로 오는 사람의 게임 모드: ${MODEKO[m + 1]}`; }
  if (sub == 'max') { netWish(`set^max^${v}`); gS = `최대 인원: ${v}`; }
  if (gS == '-') { gS = `${shName} · 주인 ${shOwner} · 시드 ${shSeed} · 싸움 ${shPvp} · 모드 ${MODEKO[shMode + 1]} · 최대 ${shMax} · 화이트리스트 ${shWl} (/server motd|name|pvp|mode|max)`; }
  return gS;
}
// /plugin add 이름 이벤트[:조건] me|all 명령 ...   /plugin list   /plugin rules 이름   /plugin del 이름 [번호]   /plugin on|off 이름
function netPluginCmd(sub) {
  gS = '-'; let nm = cw(3);
  if (sub == 'add') {
    let ev = lower(cw(4)), who = lower(cw(5)), cond = '*', c = indexOf(ev, ':');
    if (c > 0) { cond = substr(ev, c + 1, strlen(ev)); ev = substr(ev, 1, c - 1); }
    if (who != 'me' && who != 'all') { gS = '대상은 me(일어난 사람) 또는 all(모두)입니다'; }
    else { if (CMW.length < 6) { gS = '명령이 없습니다: /plugin add 이름 이벤트[:조건] me|all /명령'; }
    else {
      let cmd = netClean(wordsFrom(6, CMW.length));
      netWish(`padd^${netClean(nm)}^${ev}^${netClean(cond)}^${who}^${cmd}`);
      gS = `플러그인 ${nm}: ${ev}(${cond}) 때 ${who} ${cmd}`;
    } }
  }
  if (sub == 'del' || sub == 'remove') { let k = 0; if (CMW.length >= 4) { k = cw(4) * 1; } netWish(`pdel^${nm}^${k}`); gS = `플러그인 ${nm}의 규칙을 지웠습니다`; }
  if (sub == 'on') { netWish(`pon^${nm}`); gS = `플러그인 ${nm}을(를) 켰습니다`; }
  if (sub == 'off') { netWish(`poff^${nm}`); gS = `플러그인 ${nm}을(를) 껐습니다`; }
  if (sub == 'rules') {
    let i = 1, m = 0;
    while (i <= PLN.length) { if (PLN[i] == nm) { m = m + 1; cmdOut(`${m}. ${PLE[i]}:${PLC[i]} ${PLT[i]} ${PLX[i]}`); } i = i + 1; }
    gS = `플러그인 ${nm}: 규칙 ${m}개`;
  }
  if (sub == 'help') { gS = '/plugin add 이름 이벤트[:조건] me|all /명령 · 이벤트 join quit chat break place command timer death respawn · {player} {x} {y} {z} {msg} {server} {online}'; }
  if (gS == '-') {
    let i = 1;
    gS = '플러그인:';
    NMW = [];
    while (i <= PLN.length) {
      let seen = 0, j = 1;
      while (j <= NMW.length) { if (NMW[j] == PLN[i]) { seen = 1; } j = j + 1; }
      if (seen == 0) { NMW.push(PLN[i]); let st = '꺼짐'; if (PLO[i] == 1) { st = '켜짐'; } gS = `${gS} ${PLN[i]}(${st})`; }
      i = i + 1;
    }
    gS = `${gS} · /plugin help`;
  }
  return gS;
}

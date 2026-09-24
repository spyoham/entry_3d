// v11 backup code (src/savecode.js): round trip, binding to the nickname,
// tampering, random strings, merge rules, and the copy / load paths.
//   node t7/savecode.mjs [random strings]
import { createSim } from '../sim.mjs';

const NRAND = +(process.argv[2] || 20000);
const SHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let fail = 0;
const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fail++;
};

// a player whose save has arrived; lists are JS arrays here (index 0 = Entry's 1)
function player(nick) {
    const s = createSim();
    s.R.nick = nick;
    s.peek('whoAmI()');
    s.poke('pLoaded', 1);
    return s;
}
const FIELDS = ['pXP', 'upE', 'upA', 'upB', 'upT', 'suW', 'suG', 'suB', 'suS', 'stRaces', 'stWins', 'stPods', 'stCirc'];
function profile(s) {
    const o = {};
    for (const f of FIELDS) o[f] = s.peek(f);
    o.stKm = Math.round(s.peek('stKm'));
    o.ach = s.peek('achGot.slice(0, NACH + 1).join("")');
    o.laps = s.peek('recLap.slice(0, NTRK).map(v => Math.round(v * 1000)).join(",")');
    o.races = s.peek('recRace.slice(0, NTRK).map(v => Math.round(v * 1000)).join(",")');
    return o;
}
function setRich(s) {
    s.peek(`(pXP = 123456, upE = 5, upA = 3, upB = 0, upT = 2, suW = 0 - 3, suG = 3, suB = 1, suS = 0 - 1,
        stRaces = 87, stWins = 12, stPods = 30, stKm = 4321.4, stCirc = 173,
        achGot[0] = 1, achGot[4] = 1, achGot[19] = 1,
        recLap[0] = 83.456, recLap[2] = 71.002, recLap[7] = 100.5,
        recRace[0] = 1002.25, recRace[7] = 2400.999, levelFromXP(), countAch())`);
}
const encode = (s) => s.peek('(svEncode(), svCode)');
const decode = (s, code) => { s.peek(`svDecode(${JSON.stringify(code)})`); return s.peek('oSvOk'); };

// ---- round trip --------------------------------------------------------------
const A = player('코딩재미있어');
setRich(A);
const want = profile(A);
const code = encode(A);
console.log('code', code.length, 'chars:', code);
check('starts with S + version', code.startsWith('S1'));
check('only share-code letters', [...code.slice(1)].every((c) => SHA.includes(c)));
const code2 = encode(A);
check('salt: the same save gives another code', code2 !== code);

const B = player('코딩재미있어');
check('fresh profile starts empty', B.peek('pXP') === 0);
check('round trip: accepted', decode(B, code) === 1);
const got = profile(B);
check('round trip: every field back', JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
check('second code of the same save also loads', decode(player('코딩재미있어'), code2) === 1);
check('marked for the online save', B.peek('pDirty') === 1);
check('messy paste (case, spaces, dashes, text before)', decode(player('코딩재미있어'),
    'my code: ' + code.toLowerCase().replace(/(.{5})/g, '$1 - ')) === 1);

// ---- other players --------------------------------------------------------------
for (const nick of ['코딩재미있어요', '코딩재미있다', '코딩재미있어 ', 'GUEST_1', '가나다라마바', 'abc']) {
    const P = player(nick);
    check(`another nickname rejects it (${JSON.stringify(nick)})`, decode(P, code) === 0 && P.peek('pXP') === 0);
}

// ---- tampering: every place, every other letter ----------------------------------
{
    const P = player('코딩재미있어');
    let passed = 0, tried = 0;
    for (let i = 1; i < code.length; i++) {
        for (const c of SHA) {
            if (c === code[i]) continue;
            const bad = code.slice(0, i) + c + code.slice(i + 1);
            tried++;
            P.poke('pXP', 0);
            if (decode(P, bad) === 1) passed++;
        }
    }
    check(`one letter changed: 0 of ${tried} accepted`, passed === 0, `${passed} accepted`);
    let cut = 0;
    for (let i = 5; i < code.length; i++) if (decode(P, code.slice(0, i)) === 1) cut++;
    check('cut short: none accepted', cut === 0);
    check('a letter added: rejected', decode(P, code + '0') === 0 && decode(P, code.slice(0, 20) + 'A' + code.slice(20)) === 0);
}

// ---- random strings ---------------------------------------------------------------
{
    const P = player('코딩재미있어');
    let ok = 0, bodyOk = 0;
    for (let n = 0; n < NRAND; n++) {
        let s = 'S1';
        for (let i = 2; i < code.length; i++) s += SHA[(Math.random() * 32) | 0];
        if (decode(P, s) === 1) ok++;
    }
    check(`random codes of the same length: ${ok} of ${NRAND} accepted`, ok === 0);
}

// ---- merge: an old code never takes progress away ---------------------------------------
{
    const P = player('코딩재미있어');
    setRich(P);
    P.peek('(pXP = 200000, stRaces = 100, recLap[0] = 80.0, levelFromXP())');
    check('older code loads', decode(P, code) === 1);
    check('XP kept (larger wins)', P.peek('pXP') === 200000);
    check('race count kept', P.peek('stRaces') === 100);
    check('better lap kept', Math.abs(P.peek('recLap[0]') - 80) < 1e-9);
    check('lap only in the code taken', Math.abs(P.peek('recLap[2]') - 71.002) < 1e-9);
}

// ---- before the save has loaded -------------------------------------------------------
{
    const P = player('코딩재미있어');
    P.poke('pLoaded', 0);
    P.R.answerText = code;
    P.peek('svLoad()');
    check('load waits for the save', P.peek('pXP') === 0 && /STILL LOADING/.test(P.peek('msg')));
}

// ---- copy: table on Entry, clipboard on tessvm; load: ask and wait ------------------------
{
    const P = player('코딩재미있어');
    setRich(P);
    P.poke('$TESSVM', 0);
    P.peek('svCopy()');
    const cell = (P.R.tables || {})['svtb:2:1'];
    check('Entry: code put in table svtb row 2 col 1 and its window opened', typeof cell === 'string' && cell.startsWith('S1') && P.R.shownTable === 'svtb');
    check('Entry: clipboard left alone', P.peek('$CLIPBOARD') === '​');
    P.poke('$TESSVM', 1);
    P.R.shownTable = null;
    P.peek('svCopy()');
    const clip = P.peek('$CLIPBOARD');
    check('tessvm: code written to $CLIPBOARD, no table window', clip.startsWith('S1') && P.R.shownTable === null);

    const Q = player('코딩재미있어');
    Q.R.answerText = clip;
    Q.peek('svLoad()');
    check('load: asks, then takes the answer', /BACKUP CODE/.test(Q.R.asked) && Q.peek('pXP') === 123456, Q.peek('msg'));
    Q.R.answerText = 'S1HELLO';
    Q.peek('svLoad()');
    check('load: a bad answer says so', /DID NOT WORK/.test(Q.peek('msg')));
}

// ---- the largest save the game can hold still fits ------------------------------------------
{
    const P = player('ABCDEFGHIJKLMNOP');
    P.peek(`(pXP = 99999999, upE = UPMAX, upA = UPMAX, upB = UPMAX, upT = UPMAX, suW = 3, suG = 3, suB = 3, suS = 3,
        stRaces = 9999999, stWins = 9999999, stPods = 9999999, stKm = 99999999, stCirc = 255)`);
    P.peek('(() => { for (let i = 0; i < NTRK; i++) { recLap[i] = 99999.999; recRace[i] = 999999.999; } for (let i = 0; i < NACH; i++) achGot[i] = 1; })()');
    const big = encode(P);
    const svmax = P.peek('SVMAX');
    check(`largest save: ${big.length} letters (limit ${svmax})`, big.length - 1 <= svmax && decode(player('ABCDEFGHIJKLMNOP'), big) === 1);
}

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);

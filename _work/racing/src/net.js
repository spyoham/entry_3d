// ============================================================
// net.js - v2.1.0 online: a lobby with rooms, online races, watching a
// race, and chat. Everything travels through Entry Sync (see profile.js):
//
// Each player online holds one of NPS slots, the plain variables ?!p1..16
// (SY_p1..16 here), and only ever writes their own. So there is nothing to
// fight over: a slot is one line of fixed-width fields
//   F sid seq wall st room rsid rid car chat# | host: rst trk laps rules wx
//   contact max code grid | race: lap seg u off yaw spd flags finish time |
//   ack: another slot, the last seq heard from it and how long ago |
//   v2.2.0, host: the cars rule (a slot without it is read as rule 0)
//   then '|' nick '|' last chat line '|' room title
// sent again every NETHB s in the menus (a heartbeat) and NETHZ times a
// second in a race. A slot that has not changed for NSTALE s is empty.
// A room is simply its host's slot (room = its own slot number); players
// join by writing the host's slot and sid into theirs. The host picks the
// grid and says "load" (rst 1), everybody builds the circuit and says
// "loaded", then the host says "go" (rst 2) and the start lights run the
// same on every screen. Each player drives their own car; the others are
// drawn where their slots say (dead reckoning along the track, smoothed,
// over the report's age: time since it arrived plus half the round trip,
// measured from the acks - each report acks one other slot in turn).
// Cars only touch when the room allows it, and then only the local car
// is pushed (each screen pushes its own).
// ============================================================
let SY_p1 = 0;
let SY_p2 = 0;
let SY_p3 = 0;
let SY_p4 = 0;
let SY_p5 = 0;
let SY_p6 = 0;
let SY_p7 = 0;
let SY_p8 = 0;
let SY_p9 = 0;
let SY_p10 = 0;
let SY_p11 = 0;
let SY_p12 = 0;
let SY_p13 = 0;
let SY_p14 = 0;
let SY_p15 = 0;
let SY_p16 = 0;

const ST_NET = 17;
const NS_LOBBY = 1;         // what a slot's player is doing
const NS_ROOM = 2;
const NS_READY = 3;
const NS_LOADED = 4;        // on the grid, waiting for the go
const NS_RACE = 5;
const NS_FIN = 6;
const NS_WATCH = 7;
const NS_LOADING = 8;       // building the circuit: plain Entry can go quiet for many seconds
const NHDR = 103;           // characters before the '|' and the texts (102 before v2.2.0)
const NCR_OWN = 0;          // v2.2.0 the cars rule: own car and setup, no upgrades
const NCR_UPG = 1;         // own car, setup and upgrades
                            // 2 and on: everybody in car type rule-1, base setup, no upgrades

let netOn = 0;              // the player is in the online part of the game
let netMy = 0;              // the slot they hold (0: none yet)
let netSid = 0;             // this session's id
let netSeq = 0;
let netSt = 1;
let netRoom = 0;            // host slot of the room they are in (their own when hosting)
let netRSid = 0;            // ...and that host's session id
let netRid = 0;             // race id (hosting: the one handed out; else the one joined)
let netPg = 0;              // 0 connecting, 1 lobby, 2 room settings, 3 room
let netRow = 1;
let netNRow = 1;
let netEdit = 0;            // the settings page edits the room already open
let netT0 = 0;
let netPushT = 0;
let netAlive = 0;
let netFull = 0;
let netAckK = 0;            // the slot the next report acks
// the room this player hosts (also the settings form)
let nrTitle = 'ROOM';
let nrTrk = 1;
let nrLapSel = 2;
let nrRules = 1;
let nrWx = 1;
let nrCon = 1;
let nrMax = 8;
let nrCarR = 0;             // v2.2.0 the cars rule (NCR_)
let nrCode = 0;
let nrRst = 0;
let nrGrid = 'G0000000000000000';     // (G first: tessvm makes a number of a variable that looks like one)
let nrLdT = 0;
// chat
let chSeq = 0;
let chTx = '-';
// the race
let netRace = 0;            // the cars are online ones
let netWatch = 0;           // watching: every car is someone else's
let netWait = 0;            // on the grid until the host's go
let netLaps = 3;
let netCon = 0;             // contact between cars in this race
let netCarR = 0;            // v2.2.0 the cars rule of this race
let netEndT = 0;            // seconds since the first car finished
let netOver = 0;
let netFrom = 0;            // watching from: 0 the lobby, 1 the room
let netHostGone = 0;        // the host left during the race
let netFinN = 0;            // cars finished, as last counted
let netGoT = 0;             // host: seconds until its own go
let netGoneT = 0;           // how long the room has looked gone
let netWhy = BLANK;
// v2.1.2: a lost connection, and a work stopped in the middle
let netLostT = 0;           // seconds the connection has looked lost
let netFrozen = 0;          // while it does (up to a grace), nobody is taken for gone
let netWasOn = 0;           // Entry Sync has said "connected" in this session
let netLastIn = 0;          // gt of the last change heard from another slot
let netOthers = 0;          // other slots live, last frame
let netOldMy = 0;           // the slot held before one had to be given up
let netRj = 0;              // rejoin the race where this player left it (netResume)
let rjLap = 0;
let rjSeg = 1;
let rjOff = 0;
// the offline settings, put back on leaving
let nbMode = 1;
let nbRules = 1;
let nbWx = 1;
let nbLapSel = 2;
let nbTrk = 1;

let oNV = 0;
let oRec = BLANK;
let oPd = BLANK;
let oWall = 0;
let oNm = BLANK;
let oAns = BLANK;

// ---- the slot variables, by number --------------------------------------------------
function netGet(i) {
    if (i == 1) { oNV = SY_p1; } else if (i == 2) { oNV = SY_p2; } else if (i == 3) { oNV = SY_p3; } else if (i == 4) { oNV = SY_p4; }
    else if (i == 5) { oNV = SY_p5; } else if (i == 6) { oNV = SY_p6; } else if (i == 7) { oNV = SY_p7; } else if (i == 8) { oNV = SY_p8; }
    else if (i == 9) { oNV = SY_p9; } else if (i == 10) { oNV = SY_p10; } else if (i == 11) { oNV = SY_p11; } else if (i == 12) { oNV = SY_p12; }
    else if (i == 13) { oNV = SY_p13; } else if (i == 14) { oNV = SY_p14; } else if (i == 15) { oNV = SY_p15; } else { oNV = SY_p16; }
}
function netSet(i, v) {
    if (i == 1) { SY_p1 = v; } else if (i == 2) { SY_p2 = v; } else if (i == 3) { SY_p3 = v; } else if (i == 4) { SY_p4 = v; }
    else if (i == 5) { SY_p5 = v; } else if (i == 6) { SY_p6 = v; } else if (i == 7) { SY_p7 = v; } else if (i == 8) { SY_p8 = v; }
    else if (i == 9) { SY_p9 = v; } else if (i == 10) { SY_p10 = v; } else if (i == 11) { SY_p11 = v; } else if (i == 12) { SY_p12 = v; }
    else if (i == 13) { SY_p13 = v; } else if (i == 14) { SY_p14 = v; } else if (i == 15) { SY_p15 = v; } else { SY_p16 = v; }
}

// v whole and >= 0 as w digits
function npad(v, w) {
    let s = str('0000000', Math.max(0, Math.round(v)));
    let L = strlen(s);
    oPd = substr(s, L - w + 1, L);
}
// the wall clock in seconds, modulo 100000 (about 28 hours)
function wallT() {
    oWall = mod(((dateDay() * 24 + dateHour()) * 60 + dateMin()) * 60 + dateSec(), 100000);
}
// a typed text made safe for a slot: no '|', at most n characters
// (built from its first letter: an Entry function's local reads '' as 0)
function netClean(a, n) {
    let L = strlen(a);
    if (L > n) { L = n; }
    oAns = BLANK;
    if (L >= 1) {
        let c = charAt(a, 1);
        if (c == '|') { c = '/'; }
        let k = 2;
        while (k <= L) {
            let ch = charAt(a, k);
            if (ch == '|') { ch = '/'; }
            c = str(c, ch);
            k = k + 1;
        }
        oAns = c;
    }
}
// the game stood still while a question was up: forget held keys, restart the clocks
function netAfterAsk() {
    keysStale();
    lastT = timer();
    simT = lastT;
    rtSec = 0 - 1;
    rtN = 0;
    rtK = 1;
}
function netNick() {
    oNm = pNick;
    if (pGuest > 0) { oNm = str('GUEST', netMy); }
}

// ---- this player's slot -----------------------------------------------------------------
function netRecord() {
    let r = 'F';
    npad(netSid, 6); r = str(r, oPd);
    npad(netSeq, 3); r = str(r, oPd);
    wallT(); npad(oWall, 5); r = str(r, oPd);
    r = str(r, netSt);
    npad(netRoom, 2); r = str(r, oPd);
    npad(netRSid, 6); r = str(r, oPd);
    npad(netRid, 2); r = str(r, oPd);
    npad(ctCol[selCar], 2); r = str(r, oPd);
    npad(chSeq, 2); r = str(r, oPd);
    // the room, when hosting
    r = str(r, nrRst);
    npad(nrTrk, 2); r = str(r, oPd);
    npad(lapOpt[nrLapSel], 2); r = str(r, oPd);
    r = str(r, nrRules, nrWx, nrCon, nrMax);
    npad(nrCode, 4); r = str(r, oPd);
    r = str(r, nrGrid);
    // the car, in a race
    let lp = 0; let sg = 1; let u = 0; let of = 5000; let yw = 0; let sp = 0; let fl = 0; let fin = 0; let rt = 0;
    if (netRace > 0) { if (netWatch < 1) {
        lp = Math.max(0, Math.min(99, caLap[1]));
        sg = caSeg[1];
        u = Math.min(999, Math.floor(caU[1] * 1000));
        of = Math.max(0, Math.min(9999, Math.round(caOff[1] * 10) + 5000));
        yw = mod(Math.round(caYaw[1]), 360);
        sp = Math.min(999, Math.abs(caSpd[1]) * 3);
        if (caBrk[1] > 0.1) { fl = fl + 1; }
        if (caDRS[1] > 0) { fl = fl + 2; }
        if (caFin[1] > 0) { fin = caFinT[1] * 1000; }
        rt = raceT * 1000;
    } }
    npad(lp, 2); r = str(r, oPd);
    npad(sg, 4); r = str(r, oPd);
    npad(u, 3); r = str(r, oPd);
    npad(of, 4); r = str(r, oPd);
    npad(yw, 3); r = str(r, oPd);
    npad(sp, 3); r = str(r, oPd);
    r = str(r, fl);
    npad(Math.min(9999999, fin), 7); r = str(r, oPd);
    npad(Math.min(9999999, rt), 7); r = str(r, oPd);
    // the ack: the next other live slot in turn
    let ak = 0;
    let k = netAckK;
    let tries = 0;
    while (tries < NPS) {
        k = mod(k, NPS) + 1;
        if (k != netMy) { if (nsLive[k] > 0) { ak = k; tries = NPS; } }
        tries = tries + 1;
    }
    netAckK = ak;
    npad(ak, 2); r = str(r, oPd);
    let aq = 0;
    let hold = 0;
    if (ak > 0) { aq = nsSeq[ak]; hold = Math.min(999, (gt - nsRcv[ak]) * 1000); }
    npad(aq, 3); r = str(r, oPd);
    npad(hold, 3); r = str(r, oPd);
    r = str(r, nrCarR);
    netNick();
    oRec = str(r, '|', oNm, '|', chTx, '|', nrTitle);
}
function netPush() {
    if (netMy > 0) {
        netSeq = mod(netSeq + 1, 1000);
        netSentT[netSeq + 1] = gt;
        netRecord();
        netSet(netMy, oRec);
        netPushT = NETHB;
        if (netRace > 0) { netPushT = 1 / NETHZ; }
    }
}

// ---- everybody else's -----------------------------------------------------------------
function netParse(i, v) {
    let ok = 0;
    if (charAt(v, 1) == 'F') { if (strlen(v) > NHDR + 2) { ok = 1; } }
    if (ok > 0) {
        let sid = substr(v, 2, 7) * 1;
        let first = 0;
        if (nsSeen[i] < 1) { first = 1; } else if (sid != nsSid[i]) { first = 1; }
        nsSeen[i] = 1;
        nsStale[i] = 0;
        if (first > 0) {
            nsRtt[i] = 0;
            // a slot found like this may have been left long ago (Entry Sync
            // keeps the last value): take it as someone only if its clock is recent
            wallT();
            let d = Math.abs(oWall - substr(v, 11, 15) * 1);
            if (d > 50000) { d = 100000 - d; }
            if (d > NSTALE * 2) { nsStale[i] = 1; }
            // (v2.1.2: and it is as old as its clock says - a work stopped a
            // few seconds ago must not look live for another few)
            nsT[i] = gt - d;
            nsChS[i] = substr(v, 29, 30) * 1;
        }
        nsSid[i] = sid;
        nsSt[i] = charAt(v, 16) * 1;
        nsRoom[i] = substr(v, 17, 18) * 1;
        nsRSid[i] = substr(v, 19, 24) * 1;
        nsRid[i] = substr(v, 25, 26) * 1;
        nsCar[i] = substr(v, 27, 28) * 1;
        nsRst[i] = charAt(v, 31) * 1;
        nsTrk[i] = substr(v, 32, 33) * 1;
        nsLaps[i] = substr(v, 34, 35) * 1;
        nsRules[i] = charAt(v, 36) * 1;
        nsWx[i] = charAt(v, 37) * 1;
        nsCon[i] = charAt(v, 38) * 1;
        nsMax[i] = charAt(v, 39) * 1;
        nsCode[i] = substr(v, 40, 43) * 1;
        nsGrid[i] = substr(v, 44, 60);
        nsLap[i] = substr(v, 61, 62) * 1;
        nsSeg[i] = substr(v, 63, 66) * 1;
        nsU[i] = substr(v, 67, 69) / 1000;
        nsOff[i] = (substr(v, 70, 73) - 5000) / 10;
        nsYaw[i] = substr(v, 74, 76) * 1;
        nsSpd[i] = substr(v, 77, 79) / 3;
        nsFl[i] = charAt(v, 80) * 1;
        nsFin[i] = substr(v, 81, 87) / 1000;
        nsRT[i] = substr(v, 88, 94) / 1000;
        nsRcv[i] = gt;
        nsSeq[i] = substr(v, 8, 10) * 1;
        // an ack of one of ours: the round trip to this slot
        if (netMy > 0) { if (substr(v, 95, 96) * 1 == netMy) {
            let rtt = gt - netSentT[substr(v, 97, 99) * 1 + 1] - substr(v, 100, 102) / 1000;
            if (rtt > 0) { if (rtt < 3) {
                if (nsRtt[i] > 0) { nsRtt[i] = nsRtt[i] * 0.8 + rtt * 0.2; } else { nsRtt[i] = rtt; }
            } }
        } }
        // v2.2.0: the cars rule - a slot of an older game has the '|' there
        let hd = NHDR;
        nsCarR[i] = 0;
        if (charAt(v, NHDR) == '|') { hd = NHDR - 1; } else { nsCarR[i] = charAt(v, NHDR) * 1; }
        // the texts: nick | chat | title (none of them is ever empty)
        let L = strlen(v);
        let rest = substr(v, hd + 2, L);
        let p = indexOf(rest, '|');
        if (p > 1) {
            nsNick[i] = substr(rest, 1, p - 1);
            let L2 = strlen(rest);
            if (L2 > p + 2) {
                let r2 = substr(rest, p + 1, L2);
                let q = indexOf(r2, '|');
                if (q > 1) {
                    let cht = substr(r2, 1, q - 1);
                    let L3 = strlen(r2);
                    if (L3 > q) { nsTitle[i] = substr(r2, q + 1, L3); }
                    let cs = substr(v, 29, 30) * 1;
                    if (cs != nsChS[i]) { nsChS[i] = cs; netHear(i, cht); }
                }
            }
        }
    } else {
        nsSeen[i] = 1;
        nsStale[i] = 1;
        nsSid[i] = 0;
    }
}

function netScan() {
    netAlive = 0;
    let others = 0;
    let i = 1;
    while (i <= NPS) {
        netGet(i);
        let v = oNV;
        if (v != nsV[i]) {
            nsV[i] = v; nsT[i] = gt; netParse(i, v);
            if (i != netMy) { if (nsStale[i] < 1) { netLastIn = gt; } }
        }
        let live = 0;
        // (v2.1.2: a racer reports 6 times a second - quiet for NSTALER s is gone,
        // e.g. the work was stopped; building a circuit can take a minute)
        let lim = NSTALE;
        if (nsSt[i] >= NS_LOADED) { if (nsSt[i] <= NS_FIN) { lim = NSTALER; } }
        if (nsSt[i] == NS_LOADING) { lim = 60; }
        if (nsSeen[i] > 0) { if (nsStale[i] < 1) { if (gt - nsT[i] < lim) { live = 1; } } }
        // our own connection looks lost: the others are not taken for gone
        if (netFrozen > 0) { if (nsLive[i] > 0) { if (nsStale[i] < 1) { live = 1; } } }
        if (i == netMy) { live = 1; }
        if (i != netMy) { others = others + live; }
        nsLive[i] = live;
        netAlive = netAlive + live;
        i = i + 1;
    }
    netOthers = others;
}

// how long slot i has been quiet
let oAge = 0;
function netAgeOf(i) { oAge = gt - nsT[i]; }

// a free slot, picked at random so two players arriving at once rarely pick the same
// v2.1.2: first this player's own slot from before, if the work was stopped
// (or the page reloaded) a moment ago - same nickname, quiet, under NETREJ s:
// taken back with its session id, so the others keep them where they were.
// Otherwise a free one, those empty the longest first (a slot quiet for a
// few seconds may be someone whose connection dropped).
function netClaim() {
    let mine = 0;
    let i = 1;
    if (netPg == 0) { if (pGuest < 1) {
        netNick();
        while (i <= NPS) {
            if (nsLive[i] < 1) { if (nsSid[i] > 0) { if (nsNick[i] == oNm) {
                netAgeOf(i);
                if (oAge < NETREJ) { mine = i; }
            } } }
            i = i + 1;
        }
    } }
    netFull = 0;
    if (mine > 0) { netResume(mine); }
    else {
        let n = 0;
        let n2 = 0;
        i = 1;
        while (i <= NPS) {
            if (nsLive[i] < 1) {
                netAgeOf(i);
                if (nsSid[i] < 1) { n = n + 1; nfL[n] = i; }
                else if (oAge > 30) { n = n + 1; nfL[n] = i; }
                else { n2 = n2 + 1; nfL[NPS - n2 + 1] = i; }
            }
            i = i + 1;
        }
        let pick = 0;
        if (n > 0) { pick = nfL[rand(1, n)]; } else if (n2 > 0) { pick = nfL[NPS - rand(1, n2) + 1]; }
        if (pick > 0) {
            netMy = pick;
            if (netPg == 0) {
                netSt = NS_LOBBY;
                netRoom = 0;
                netRSid = 0;
                netPg = 1;
                netRow = 1;
            } else if (netRoom == netOldMy) { if (netRoom > 0) { netRoom = netMy; } }
            netPush();
            nsLive[netMy] = 1;
        } else { netFull = 1; }
    }
}

// back into slot i, left by this same player a moment ago: into its room if
// that is still there, and into its race if that is still on
function netResume(i) {
    netMy = i;
    netSid = nsSid[i];
    netSeq = mod(nsSeq[i] + 1, 1000);
    chSeq = nsChS[i];
    netSt = NS_LOBBY;
    netRoom = 0;
    netRSid = 0;
    netPg = 1;
    netRow = 1;
    nrRst = 0;
    let h = nsRoom[i];
    let wasRace = 0;
    if (nsSt[i] >= NS_LOADED) { if (nsSt[i] <= NS_RACE) { if (nsFin[i] <= 0) { wasRace = 1; } } }
    if (h == i) {
        // it was their own room: open it again as it was
        nrTitle = nsTitle[i]; nrTrk = nsTrk[i]; nrRules = nsRules[i]; nrWx = nsWx[i]; nrCon = nsCon[i]; nrMax = nsMax[i]; nrCode = nsCode[i]; nrCarR = nsCarR[i];
        let k = 1;
        while (k <= NLAPO) { if (lapOpt[k] == nsLaps[i]) { nrLapSel = k; } k = k + 1; }
        netRoom = i; netRSid = netSid; netSt = NS_ROOM; netPg = 3;
        netRid = nsRid[i];
        nrGrid = nsGrid[i];
        if (wasRace > 0) { if (nsRst[i] == 2) { nrRst = 2; } }
    } else if (h > 0) {
        if (nsLive[h] > 0) { if (nsSid[h] == nsRSid[i]) { if (nsRoom[h] == h) {
            netRoom = h; netRSid = nsRSid[i]; netSt = NS_ROOM; netPg = 3;
            netRid = nsRid[i];
            if (wasRace > 0) { if (nsRst[h] == 2) { if (nsRid[h] == nsRid[i]) { netRj = 2; } } }
        } } }
    }
    if (nrRst == 2) { netRj = 2; }
    if (netRj > 1) {
        // back into the race, where they were (lap, ring, side), from a standstill
        netRj = 1;
        rjLap = nsLap[i]; rjSeg = nsSeg[i]; rjOff = nsOff[i];
        netSay('BACK IN THE RACE YOU LEFT', C_SKY);
        netBegin(netRoom, 0);
    } else {
        if (netPg == 3) { netSay('BACK IN YOUR ROOM', C_SKY); } else { netSay('WELCOME BACK', C_SKY); }
        netPush();
    }
}

// ---- chat ----------------------------------------------------------------------------------
// what a slot said reaches whoever is in the same place: the lobby, or one room
// (its racers and watchers)
function netHear(i, s) {
    let a = 0;
    if (nsRoom[i] > 0) { a = nsRoom[i] * 1000000 + nsRSid[i]; }
    let b = 0;
    if (netRoom > 0) { b = netRoom * 1000000 + netRSid; }
    if (a == b) { if (i != netMy) { netSay(str(nsNick[i], ':  ', s), C_WHITE); } }
}
function netSay(s, col) {
    let k = 1;
    while (k < NCH) { chL[k] = chL[k + 1]; chC[k] = chC[k + 1]; chA[k] = chA[k + 1]; k = k + 1; }
    chL[NCH] = s;
    chC[NCH] = col;
    chA[NCH] = gt;
}
function netChat() {
    ask('CHAT  (ENTER SENDS, EMPTY CANCELS)');
    netClean(answer(), 60);
    netAfterAsk();
    if (oAns != BLANK) {
        chTx = oAns;
        chSeq = mod(chSeq + 1, 100);
        netNick();
        netSay(str(oNm, ':  ', chTx), C_GOLD);
        netPush();
    }
}

// v2.4.0 quick chat: keys 3-9 send a phrase (at most one a QCGAP s)
let qcT = 0 - 9;
let oQK = 0;
let qcL1 = BLANK;           // the phrases as two lines, for the room and the grid
let qcL2 = BLANK;
function netQKey() {
    oQK = 0;
    if (actKey >= 51) { if (actKey < 51 + NQC) { oQK = actKey - 50; } }
}
function netQuick(q) {
    if (netMy > 0) { if (gt - qcT >= QCGAP) {
        qcT = gt;
        chTx = qcTx[q];
        chSeq = mod(chSeq + 1, 100);
        netNick();
        netSay(str(oNm, ':  ', chTx), C_GOLD);
        netPush();
    } }
}
function netQLines() {
    qcL1 = 'QUICK CHAT   ';
    qcL2 = '             ';
    let q = 1;
    while (q <= NQC) {
        let s = str(q + 2, ' ', qcTx[q], '   ');
        if (q <= 4) { qcL1 = str(qcL1, s); } else { qcL2 = str(qcL2, s); }
        q = q + 1;
    }
}

// ---- rooms -----------------------------------------------------------------------------------
let nrN = 0;                // rooms open (their host slots in nrL)
function netRooms() {
    nrN = 0;
    let i = 1;
    while (i <= NPS) {
        if (nsLive[i] > 0) { if (nsRoom[i] == i) { if (nsRSid[i] == nsSid[i]) { if (nsSt[i] >= NS_ROOM) { if (nsSt[i] != NS_WATCH) {
            if (nrN < 7) { nrN = nrN + 1; nrL[nrN] = i; }
        } } } } }
        i = i + 1;
    }
}
// the players in host h's room (not its watchers): nmN, nmL
let nmN = 0;
function netMembers(h) {
    nmN = 0;
    let i = 1;
    while (i <= NPS) {
        if (nsLive[i] > 0) { if (nsRoom[i] == h) { if (nsRSid[i] == nsSid[h]) { if (nsSt[i] >= NS_ROOM) { if (nsSt[i] != NS_WATCH) {
            if (nmN < 8) { nmN = nmN + 1; nmL[nmN] = i; }
        } } } } }
        i = i + 1;
    }
}

function netEnter() {
    nbMode = gMode; nbRules = rules; nbWx = wx; nbLapSel = lapSel; nbTrk = selTrk;
    whoAmI();
    netQLines();
    netOn = 1;
    netPg = 0;
    netRow = 1;
    netT0 = gt;
    netMy = 0;
    netSid = rand(100000, 999999);
    netRace = 0; netWatch = 0; netRoom = 0; netRSid = 0; nrRst = 0;
    let i = 1;
    while (i <= NPS) { nsV[i] = 0 - 1; nsSeen[i] = 0; nsLive[i] = 0; i = i + 1; }
    netNick();
    nrTitle = str(oNm, ' ROOM');
    nrTrk = selTrk;
    if (nrTrk > NTRK) { nrTrk = 1; }
    nrRules = rules;
    raceState = ST_NET;
    nCars = 0;
}
function netLeave() {
    if (netMy > 0) { netSet(netMy, 0); }
    netMy = 0;
    netOn = 0;
    netRace = 0;
    netWatch = 0;
    netRoom = 0;
    gMode = nbMode; rules = nbRules; wx = nbWx; lapSel = nbLapSel; selTrk = nbTrk;
    toMenu();
}
function netOpenRoom() {
    netRoom = netMy;
    netRSid = netSid;
    netSt = NS_ROOM;
    nrRst = 0;
    nrGrid = 'G0000000000000000';
    netPg = 3;
    netRow = 1;
    netSay(str('ROOM OPEN:  ', nrTitle), C_SKY);
    netPush();
}
function netJoin(h) {
    let ok = 1;
    netMembers(h);
    if (nmN >= nsMax[h]) { ok = 0; setMsg('THAT ROOM IS FULL', 2.5); }
    if (ok > 0) {
        if (nsCode[h] > 0) {
            ask('THIS ROOM HAS A CODE - TYPE IT');
            let a = answer();
            netAfterAsk();
            if (a != nsCode[h]) { ok = 0; setMsg('WRONG CODE', 2.5); }
        }
    }
    if (ok > 0) {
        netRoom = h;
        netRSid = nsSid[h];
        netSt = NS_ROOM;
        netRid = nsRid[h];
        netPg = 3;
        netRow = 1;
        netSay(str('JOINED  ', nsTitle[h]), C_SKY);
        netPush();
        // a race already under way can be watched from here
        if (nsRst[h] > 0) { netFrom = 1; netWatchRace(h); }
    }
}
function netToLobby(why) {
    netRoom = 0;
    netRSid = 0;
    netSt = NS_LOBBY;
    nrRst = 0;
    netPg = 1;
    netRow = 1;
    if (why != BLANK) { setMsg(why, 3); }
    netPush();
}

// the host starts: everybody in the room ready, the grid drawn at random
function netStart() {
    netMembers(netMy);
    let ready = 1;
    let k = 1;
    while (k <= nmN) {
        let s = nmL[k];
        if (s != netMy) { if (nsSt[s] != NS_READY) { ready = 0; } }
        k = k + 1;
    }
    if (ready < 1) { setMsg('WAITING FOR EVERYONE TO PRESS READY', 2.5); }
    else {
        // shuffle
        k = nmN;
        while (k > 1) {
            let j = rand(1, k);
            let t = nmL[k]; nmL[k] = nmL[j]; nmL[j] = t;
            k = k - 1;
        }
        let g = 'G';
        k = 1;
        while (k <= 8) {
            let s = 0;
            if (k <= nmN) { s = nmL[k]; }
            npad(s, 2);
            g = str(g, oPd);
            k = k + 1;
        }
        nrGrid = g;
        netRid = mod(netRid, 99) + 1;
        nrRst = 1;
        nrLdT = 0;
        netBegin(netMy, 0);
    }
}

// the race of host h: set up from its slot, and loaded (w 1: to watch)
function netBegin(h, w) {
    netWatch = w;
    let tk = nrTrk; let lp = lapOpt[nrLapSel]; let ru = nrRules; let wxx = nrWx; let cn = nrCon; let cr = nrCarR;
    if (h != netMy) { tk = nsTrk[h]; lp = nsLaps[h]; ru = nsRules[h]; wxx = nsWx[h]; cn = nsCon[h]; cr = nsCarR[h]; netRid = nsRid[h]; }
    selTrk = tk;
    netLaps = lp;
    rules = ru;
    wx = wxx;
    netCon = cn;
    netCarR = cr;
    gMode = M_GP;
    applyWeather();
    netRace = 1;
    netWait = 1;
    netOver = 0;
    netEndT = 0;
    // said before the (long) frame that builds the circuit
    netSt = NS_LOADING;
    netPush();
    startRace();
}

// (doStartRace, online) the circuit as a normal race sets it up, then the
// online grid in place of the AI one
function netDoStart() {
    keepGrid = 1;
    qDone = 0;
    setupRace(selTrk, selCar);
    keepGrid = 0;
    nLaps = netLaps;
    let h = netRoom;
    let g = nrGrid;
    if (h != netMy) { g = nsGrid[h]; }
    // car 1 is this player's (unless watching), then the others in grid order
    nCars = 0;
    let k = 1;
    if (netWatch < 1) {
        while (k <= 8) {
            if (substr(g, k * 2, k * 2 + 1) * 1 == netMy) { nCars = 1; caSlot[1] = netMy; caNet[1] = 0; caGrid[1] = k; }
            k = k + 1;
        }
        if (nCars < 1) { netWatch = 1; }
    }
    k = 1;
    while (k <= 8) {
        let s = substr(g, k * 2, k * 2 + 1) * 1;
        let take = 0;
        if (s > 0) { take = 1; if (s == netMy) { if (netWatch < 1) { take = 0; } } }
        if (take > 0) { nCars = nCars + 1; caSlot[nCars] = s; caNet[nCars] = 1; caGrid[nCars] = k; }
        k = k + 1;
    }
    let c = 1;
    while (c <= nCars) {
        let slot = caGrid[c];
        let row = idiv(slot - 1, 2);
        let sd = mod(slot - 1, 2) < 1 ? 0 - 1 : 1;
        let seg = mod(NSEG - 3 - row * 3 - 1, NSEG) + 1;
        if (caNet[c] < 1) { netCarStats(); } else {
            carStats(c, selCar);
            caCol[c] = nsCar[caSlot[c]];
        }
        placeCar(c, seg, sd * sgW[seg] * 0.40);
        caGSeg[c] = seg;
        caGOff[c] = sd * sgW[seg] * 0.40;
        caNP[c] = 0;
        caNGo[c] = 0;
        c = c + 1;
    }
    tyreGrip(1);
    let gk = 1;
    if (rules == R_SIM) { gk = oTyG; }
    speedProfile(caGrip[1] * gk, caTop[1]);
    lightN = 0; lightsOut = 0; lightsT = 0; countT = 1.0;
    lightHold = 0.6 + mod(netRid * 7, 13) / 10;
    raceState = ST_COUNT;
    camMode = 0;
    camCar = 1;
    camYawS = caYaw[1];
    camX = caX[1]; camZ = caZ[1]; camY = caY[1] + 3;
    rpReset();
    rfReset();
    statsReset();
    ghostOn = 0;
    showLine = 0;
    setBanner(BLANK, 0);
    setMsg(BLANK, 0);
    if (netCarR > NCR_UPG) { netCarTxt(netCarR, 0); setMsg(str(oCrT, ' FOR EVERYBODY'), 5); }
    netFinN = 0;
    netHostGone = 0;
    netNick();
    if (netWatch > 0) {
        netSt = NS_WATCH;
        netWait = 0;
        raceState = ST_RACE;
        lightsOut = 1;
        raceT = nsRT[caSlot[1]];
        let c3 = 1;
        while (c3 <= nCars) { caHold[c3] = 0; c3 = c3 + 1; }
    } else { netSt = NS_LOADED; }
    if (netRj > 0) { netRejoin(); }
    netPush();
}

// (netDoStart) this player's car as the room's cars rule has it: by default
// on the car and its setup, not on the upgrades bought (v2.1.0); v2.2.0 also
// with the upgrades, or everybody in the same car with the base setup (and
// still in their own colours)
function netCarStats() { carRule(netCarR); }
// (v2.3.0: also the daily challenge's car) car 1 under cars rule cr
function carRule(cr) {
    let e = upE; let a = upA; let b = upB; let t = upT;
    let sw = suW; let sg = suG; let sb = suB; let ss = suS; let sf = suF; let sd = suD; let sp = suP;
    let ct = selCar;
    if (cr != NCR_UPG) { upE = 0; upA = 0; upB = 0; upT = 0; }
    if (cr > NCR_UPG) {
        ct = cr - 1;
        suW = 0; suG = 0; suB = 0; suS = 0; suF = 0; suD = 0; suP = 0;
    }
    carStats(1, ct);
    caCol[1] = ctCol[selCar];
    upE = e; upA = a; upB = b; upT = t;
    suW = sw; suG = sg; suB = sb; suS = ss; suF = sf; suD = sd; suP = sp;
}

// (netDoStart) the car put back where its driver left the race, with the
// race clock of the others; the lap it was on does not count
function netRejoin() {
    netRj = 0;
    if (rjLap >= 1) {
        let s = Math.max(1, Math.min(NSEG, rjSeg));
        let w = sgW[s] * 0.8;
        placeCar(1, s, Math.max(0 - w, Math.min(w, rjOff)));
        caLap[1] = rjLap;
        let k = 1;
        while (k < nCP) { if (cpSeg[k + 1] <= s) { k = k + 1; } else { break; } }
        caCP[1] = k;
    }
    raceT = 0;
    let c = 2;
    while (c <= nCars) {
        let sl = caSlot[c];
        if (nsLive[sl] > 0) { raceT = Math.max(raceT, nsRT[sl] + Math.min(1, gt - nsRcv[sl])); }
        c = c + 1;
    }
    caLapT[1] = raceT;
    lapBad = 1;
    secCur = 0;
    netWait = 0;
    lightsOut = 1;
    raceState = ST_RACE;
    let c2 = 1;
    while (c2 <= nCars) { caHold[c2] = 0; c2 = c2 + 1; }
    netSt = NS_RACE;
    setBanner('BACK IN THE RACE', 1.6);
}

function netWatchRace(h) {
    netRoom = h;
    netRSid = nsSid[h];
    netBegin(h, 1);
}

// ---- remote cars -----------------------------------------------------------------------------
// where each other car is: its last report moved on at its speed along the
// track (at most 0.7 s), approached smoothly; snapped when far off
function netCars() {
    let c = 1;
    while (c <= nCars) {
        if (caNet[c] > 0) {
            let s = caSlot[c];
            let gone = 0;
            if (nsLive[s] < 1) { gone = 1; }
            if (nsRoom[s] != netRoom) { gone = 1; }
            if (nsSt[s] < NS_LOADED) { if (nsFin[s] <= 0) { gone = 1; } }
            if (gone > 0) { caNGo[c] = caNGo[c] + dt; if (caNGo[c] < 2) { gone = 0; } } else { caNGo[c] = 0; }
            if (gone > 0) {
                if (caFin[c] < 1) { if (caDNF[c] < 1) { caDNF[c] = 1; caSpd[c] = 0; caVX[c] = 0; caVZ[c] = 0; netSay(str(nsNick[s], '  LEFT THE RACE'), C_DIM); } }
            } else {
                if (caDNF[c] > 0) { if (caFin[c] < 1) { netSay(str(nsNick[s], '  IS BACK IN THE RACE'), C_SKY); } }
                caDNF[c] = 0;
                let el = Math.min(0.9, gt - nsRcv[s] + nsRtt[s] / 2);
                let sp = nsSpd[s];
                let tp = nsLap[s] * NSEG + nsSeg[s] + nsU[s] + sp * el / segStep;
                if (caNP[c] <= 0) { caNP[c] = tp; caNOff[c] = nsOff[s]; caYaw[c] = nsYaw[s]; }
                else if (Math.abs(tp - caNP[c]) > 25) { caNP[c] = tp; caNOff[c] = nsOff[s]; }
                else { caNP[c] = caNP[c] + sp * dt / segStep + (tp - caNP[c]) * Math.min(1, dt * 5); }
                caNOff[c] = caNOff[c] + (nsOff[s] - caNOff[c]) * Math.min(1, dt * 6);
                let q = caNP[c] - 1;
                let lp = Math.floor(q / NSEG);
                q = q - lp * NSEG;
                let sg = Math.floor(q) + 1;
                let u = q - (sg - 1);
                let s2 = mod(sg, NSEG) + 1;
                let nx = sgNX[sg] + (sgNX[s2] - sgNX[sg]) * u;
                let nz = sgNZ[sg] + (sgNZ[s2] - sgNZ[sg]) * u;
                let x = sgX[sg] + (sgX[s2] - sgX[sg]) * u + nx * caNOff[c];
                let z = sgZ[sg] + (sgZ[s2] - sgZ[sg]) * u + nz * caNOff[c];
                sampleTrack(x, z, sg);
                caX[c] = x; caZ[c] = z; caY[c] = sfY;
                caSeg[c] = sg; caU[c] = u; caOff[c] = caNOff[c]; caLap[c] = lp;
                wrapAng(nsYaw[s] - caYaw[c]);
                caYaw[c] = caYaw[c] + oWrap * Math.min(1, dt * 8);
                caSpd[c] = sp;
                caVX[c] = sind(caYaw[c]) * sp;
                caVZ[c] = cosd(caYaw[c]) * sp;
                caBrk[c] = mod(nsFl[s], 2);
                caDRS[c] = mod(idiv(nsFl[s], 2), 2);
                caThr[c] = 1 - caBrk[c];
                caHold[c] = 0;
                if (nsFin[s] > 0) { if (caFin[c] < 1) { caFinT[c] = nsFin[s]; caFin[c] = 9; netFinOrder(); } }
            }
        }
        c = c + 1;
    }
}

// finishing places from the finish times (each measured by its own driver
// from the same start)
function netFinOrder() {
    finishPos = 0;
    let c = 1;
    while (c <= nCars) {
        if (caFin[c] > 0) {
            let r = 1;
            let o = 1;
            while (o <= nCars) {
                if (o != c) { if (caFin[o] > 0) {
                    if (caFinT[o] < caFinT[c]) { r = r + 1; }
                    else if (caFinT[o] == caFinT[c]) { if (o < c) { r = r + 1; } }
                } }
                o = o + 1;
            }
            caFin[c] = r;
            finishPos = finishPos + 1;
        }
        c = c + 1;
    }
    if (caFin[1] > 0) { if (netWatch < 1) { finished = caFin[1]; } }
}

// ---- once a frame, whatever the screen ------------------------------------------------------
function netStep() {
    // v2.1.2: is our connection lost? Entry Sync says so ('?!' below 1), or
    // every other player has gone quiet at once (it has no ping: a dead line
    // can look connected). Up to a grace nobody is taken for gone meanwhile.
    if (SY_ > 0) { netWasOn = 1; }
    let lost = 0;
    if (netWasOn > 0) { if (SY_ < 1) { lost = 1; } }
    if (netOthers >= 2) { if (gt - netLastIn > NETQUIET) { lost = 1; } }
    if (lost > 0) { netLostT = netLostT + dt; } else { netLostT = 0; }
    netFrozen = 0;
    if (netLostT > 0) {
        let grace = 12;
        if (SY_ < 1) { grace = NETGRACE; }
        if (netLostT < grace) { netFrozen = 1; }
    }
    netScan();
    if (netMy < 1) {
        if (SY_ > 0) { if (gt - netT0 > 1.5) { if (netLostT <= 0) { netClaim(); } } }
    } else {
        // somebody else wrote this slot: the lower session id keeps it
        netGet(netMy);
        let v = oNV;
        if (charAt(v, 1) == 'F') { if (strlen(v) > 8) {
            let other = substr(v, 2, 7) * 1;
            if (other != netSid) {
                // (v2.1.2: another free slot, keeping the room and the race)
                if (other < netSid) { netOldMy = netMy; netMy = 0; }
                else { netPush(); }
            }
        } }
    }
    if (netMy > 0) {
        netRooms();
        // the room went away?
        if (netRoom > 0) { if (netRoom != netMy) {
            let h = netRoom;
            let gone = 0;
            // (v2.1.2: a quiet host - slow plain Entry, a long frame - closes the
            // room only after NETROOMT s; one who closes it says so at once)
            if (nsLive[h] < 1) { if (gt - nsT[h] > NETROOMT) { gone = 1; } } else if (nsSid[h] != netRSid) { gone = 2; } else if (nsRoom[h] != h) { gone = 3; }
            if (netFrozen > 0) { gone = 0; }
            // (the host is back: it stopped its work and came back in time)
            if (gone < 1) { netHostGone = 0; }
            // (only when it stays so for 2 s: one odd read is not a closed room)
            if (gone > 0) { netGoneT = netGoneT + dt; } else { netGoneT = 0; }
            if (netGoneT > 2) {
                netGoneT = 0;
                // (why, for the tests: what the host's slot looked like)
                netWhy = str(gone, ' live ', nsLive[h], ' sid ', nsSid[h], '/', netRSid, ' room ', nsRoom[h], ' st ', nsSt[h], ' age ', gt - nsT[h], ' lost ', netLostT);
                if (netRace < 1) { netToLobby('THE ROOM WAS CLOSED'); }
                else { netHostGone = 1; }
            }
        } }
        netRaceStep();
        netPushT = netPushT - dt;
        if (netPushT <= 0) { netPush(); }
    }
}

// start, go and the end of a race
function netRaceStep() {
    if (netRace < 1) {
        // a member: the host has called the race
        if (netPg == 3) { if (netRoom > 0) { if (netRoom != netMy) {
            let h = netRoom;
            if (nsRst[h] == 1) { if (nsRid[h] != netRid) {
                let g = nsGrid[h];
                let mine = 0;
                let k = 1;
                while (k <= 8) { if (substr(g, k * 2, k * 2 + 1) * 1 == netMy) { mine = 1; } k = k + 1; }
                if (mine > 0) { netBegin(h, 0); }
            } }
        } } }
    } else {
        let h = netRoom;
        if (h == netMy) {
            // the host: go when everyone is on the grid (or 25 s on)
            if (nrRst == 1) {
                if (raceState == ST_COUNT) {
                    nrLdT = nrLdT + dt;
                    let all = 1;
                    let c = 2;
                    while (c <= nCars) {
                        let s = caSlot[c];
                        if (nsLive[s] > 0) { if (nsRid[s] != netRid) { all = 0; } else if (nsSt[s] < NS_LOADED) { all = 0; } else if (nsSt[s] == NS_LOADING) { all = 0; } }
                        c = c + 1;
                    }
                    if (nrLdT > 25) { all = 1; }
                    if (all > 0) {
                        nrRst = 2;
                        netPush();
                        // the others hear the go half a round trip later: wait as long
                        netGoT = 0;
                        c = 2;
                        while (c <= nCars) { netGoT = Math.max(netGoT, nsRtt[caSlot[c]] / 2); c = c + 1; }
                        netGoT = Math.min(1, netGoT);
                    }
                }
            }
            if (nrRst == 2) { if (netWait > 0) { netGoT = netGoT - dt; if (netGoT <= 0) { netWait = 0; } } }
        } else if (h > 0) {
            if (nsRst[h] == 2) { if (nsRid[h] == netRid) { netWait = 0; } }
        }
        if (netHostGone > 0) { netWait = 0; }
        if (netWatch < 1) {
            if (raceState == ST_RACE) { netSt = NS_RACE; }
            if (caFin[1] > 0) { netSt = NS_FIN; }
        }
        netCars();
        let nf = 0;
        let c0 = 1;
        while (c0 <= nCars) { if (caFin[c0] > 0) { nf = nf + 1; } c0 = c0 + 1; }
        if (nf != netFinN) { netFinN = nf; netFinOrder(); }
        // over when every car still in it has finished, or 60 s after the first
        if (finishPos > 0) {
            netEndT = netEndT + dt;
            let left = 0;
            let c = 1;
            while (c <= nCars) { if (caFin[c] < 1) { if (caDNF[c] < 1) { left = left + 1; } } c = c + 1; }
            if (left < 1) { netOver = 1; }
            if (netEndT > 60) { netOver = 1; }
        }
    }
}

// back from a race (or from watching one) to the room, or the lobby
function netBackToRoom() {
    let w = netWatch;
    netRace = 0;
    netWatch = 0;
    netWait = 0;
    nCars = 0;
    ghostOn = 0;
    scCar = 0; scOn = 0;
    camCar = 1;
    raceState = ST_NET;
    applyWeather();
    buildTrack(selTrk);
    if (netHostGone > 0) { netToLobby('THE HOST LEFT THE ROOM'); }
    else if (netRoom < 1) { netToLobby(BLANK); }
    else if (w > 0) { if (netFrom < 1) { netToLobby(BLANK); } else { netSt = NS_ROOM; netPg = 3; netPush(); } }
    else { netSt = NS_ROOM; netPg = 3; if (netRoom == netMy) { nrRst = 0; } netPush(); }
    netHostGone = 0;
    netFrom = 0;
    netRow = 1;
}

// ---- keys -----------------------------------------------------------------------------------------
function netKeys() {
    netQKey();
    if (actKey == 89) { if (netMy > 0) { netChat(); } }
    else if (oQK > 0) { netQuick(oQK); }
    else if (netPg == 0) { if (actKey == 27) { netLeave(); } }
    else if (netPg == 1) {
        netNRow = nrN + 2;
        if (actKey == 40) { netRow = mod(netRow, netNRow) + 1; }
        else if (actKey == 38) { netRow = mod(netRow + netNRow - 2, netNRow) + 1; }
        else if (actKey == 27) { netLeave(); }
        else if (actKey == 13) {
            if (netRow <= nrN) {
                let h = nrL[netRow];
                if (nsRst[h] > 0) { netFrom = 0; netWatchRace(h); } else { netJoin(h); }
            } else if (netRow == nrN + 1) { netEdit = 0; netPg = 2; netRow = 1; }
            else { netLeave(); }
        }
    } else if (netPg == 2) {
        netNRow = 10;
        if (actKey == 40) { netRow = mod(netRow, netNRow) + 1; }
        else if (actKey == 38) { netRow = mod(netRow + netNRow - 2, netNRow) + 1; }
        else if (actKey == 37) { netForm(0 - 1); }
        else if (actKey == 39) { netForm(1); }
        else if (actKey == 27) { netPg = 1 + netEdit * 2; netRow = 1; }
        else if (actKey == 13) {
            if (netRow == 1) {
                ask('ROOM TITLE');
                netClean(answer(), 24);
                netAfterAsk();
                if (oAns != BLANK) { nrTitle = oAns; }
            } else if (netRow == 9) {
                ask('A CODE OF UP TO 4 DIGITS FOR A PRIVATE ROOM (EMPTY: OPEN)');
                let a = answer();
                netAfterAsk();
                nrCode = 0;
                if (strlen(a) >= 1) { if (a * 1 > 0) { nrCode = Math.min(9999, Math.round(a * 1)); } }
            } else if (netRow == 10) {
                if (netEdit > 0) { netPg = 3; netRow = 1; netPush(); } else { netOpenRoom(); }
            } else { netForm(1); }
        }
    } else if (netPg == 3) {
        let host = netRoom == netMy ? 1 : 0;
        netNRow = 2 + host;
        if (actKey == 40) { netRow = mod(netRow, netNRow) + 1; }
        else if (actKey == 38) { netRow = mod(netRow + netNRow - 2, netNRow) + 1; }
        else if (actKey == 27) { netToLobby(BLANK); }
        else if (actKey == 13) {
            if (netRow == 1) {
                if (host > 0) { netStart(); }
                else {
                    if (netSt == NS_READY) { netSt = NS_ROOM; } else { netSt = NS_READY; }
                    netPush();
                }
            } else if (netRow == 2) {
                if (host > 0) { netEdit = 1; netPg = 2; netRow = 2; }
                else { netToLobby(BLANK); }
            } else { netToLobby(BLANK); }
        }
    }
}
// the settings form: left / right on a row
function netForm(d) {
    if (netRow == 2) { nrTrk = mod(nrTrk - 1 + d + NTRK, NTRK) + 1; }
    else if (netRow == 3) { nrLapSel = mod(nrLapSel - 1 + d + NLAPO, NLAPO) + 1; }
    else if (netRow == 4) { nrRules = mod(nrRules - 1 + d + 2, 2) + 1; }
    else if (netRow == 5) { nrWx = mod(nrWx - 1 + d + 2, 2) + 1; }
    else if (netRow == 6) { nrCon = 1 - nrCon; }
    else if (netRow == 7) { nrCarR = mod(nrCarR + d + NCARTYPE + 2, NCARTYPE + 2); }
    else if (netRow == 8) { nrMax = mod(nrMax - 2 + d + 7, 7) + 2; }
    if (netEdit > 0) { netPush(); }
}

// in a race: the online keys (the rest is raceKeys)
function netRaceKeys() {
    netQKey();
    if (actKey == 89) { netChat(); }
    else if (oQK > 0) { netQuick(oQK); }
    else if (netWatch > 0) {
        if (actKey == 37) { camCar = mod(camCar + nCars - 2, nCars) + 1; }
        else if (actKey == 39) { camCar = mod(camCar, nCars) + 1; }
        else if (actKey == 67) { camMode = mod(camMode + 1, 4); }
        else if (actKey == 27) { netBackToRoom(); }
    } else { raceKeys(); }
}
// the results screen of an online race: watch the others, or go back
function netDoneKeys() {
    netQKey();
    if (actKey == 89) { netChat(); }
    else if (oQK > 0) { netQuick(oQK); }
    else if (actKey == 37) { camCar = mod(camCar + nCars - 2, nCars) + 1; }
    else if (actKey == 39) { camCar = mod(camCar, nCars) + 1; }
    else if (actKey == 13) { netBackToRoom(); }
    else if (actKey == 27) { netBackToRoom(); }
}

// the name shown for car o (tower, results)
function netName(o) {
    oNm = drvShort[o];
    if (netRace > 0) {
        oNm = nsNick[caSlot[o]];
        if (o == 1) { if (netWatch < 1) { netNick(); } }
    }
}

// ---- screens ---------------------------------------------------------------------------------------
// v2.2.0: the cars rule cr in words, long (the settings) or short
let oCrT = BLANK;
function netCarTxt(cr, lg) {
    if (cr == NCR_OWN) { oCrT = lg > 0 ? 'OWN CAR  (OWN SETUP, NO UPGRADES)' : 'OWN CARS'; }
    else if (cr == NCR_UPG) { oCrT = lg > 0 ? 'OWN CAR + UPGRADES  (AS OFFLINE)' : 'UPGRADES ON'; }
    else {
        oCrT = str('SAME CAR  ', ctName[cr - 1]);
        if (lg > 0) { oCrT = str(oCrT, '  (BASE SETUP, NO UPGRADES)'); }
    }
}
function netRowY(i) { oRowY = 78 - (i - 1) * 13; }
function drawNet() {
    box(0 - 240, 132, 240, 94, C_PANEL);
    box(0 - 240, 94, 240, 92, C_RED);
    box(0 - 240, 92, 240, 0 - 40, '#10151d');
    let n = 0;
    if (netPg == 1) { n = nrN + 2; } else if (netPg == 2) { n = 10; } else if (netPg == 3) { n = 2; if (netRoom == netMy) { n = 3; } }
    let i = 1;
    while (i <= n) {
        netRowY(i);
        let w = 236;
        if (netPg == 3) { w = 0 - 20; }
        box(0 - 236, oRowY + 6, w, oRowY - 6, i == netRow ? C_RED : C_PANEL2);
        i = i + 1;
    }
    // the chat
    box(0 - 240, 0 - 44, 240, 0 - 116, '#0b0f15');
    box(0 - 240, 0 - 118, 240, 0 - 132, C_PANEL);
}

function hudNet() {
    tx(9, 'ONLINE', 0 - 232, 116, 21, C_WHITE, 1);
    netNick();
    let top = str(oNm, '   ', netAlive, ' ONLINE');
    if (SY_ < 1) { top = 'NOT CONNECTED - ONLINE PLAY NEEDS THE ENTRY SYNC EXTENSION'; }
    tx(10, top, 0 - 232, 100, 8, C_GOLD, 1);
    tx(11, msg, 0, 0 - 36, 8, C_GOLD, 0);
    let help = 'UP/DOWN select   ENTER choose   Y chat   ESC back';
    let i = 1;
    if (netPg == 0) {
        let t = 'CONNECTING...';
        if (netFull > 0) { t = 'ONLINE IS FULL (16 PLAYERS) - WAITING FOR A FREE PLACE'; }
        if (SY_ < 1) { t = 'WAITING FOR ENTRY SYNC  (INSTALL IT, THEN RELOAD THE PAGE)'; }
        tx(24, t, 0, 60, 11, C_WHITE, 0);
        help = 'ESC back';
        while (i <= 10) { if (i > 1) { txOff(23 + i); } txOff(36 + i); i = i + 1; }
    } else if (netPg == 1) {
        tx(50, 'ROOMS', 120, 116, 12, C_WHITE, 1);
        while (i <= 10) {
            netRowY(i);
            let lab = BLANK;
            let val = BLANK;
            if (i <= nrN) {
                let h = nrL[i];
                netMembers(h);
                lab = nsTitle[h];
                let st = 'WAITING';
                if (nsRst[h] > 0) { st = 'RACING - WATCH'; }
                val = str(trkName[nsTrk[h]], '  ', nsLaps[h], ' LAPS  ', ruleName[nsRules[h]], '  ', nmN, '/', nsMax[h], '  ', st);
                if (nsCarR[h] > 0) { netCarTxt(nsCarR[h], 0); val = str(val, '  ', oCrT); }
                if (nsCode[h] > 0) { val = str(val, '  CODE'); }
            } else if (i == nrN + 1) { lab = '+  CREATE A ROOM'; }
            else if (i == nrN + 2) { lab = '<  BACK TO THE MENU'; }
            if (lab == BLANK) { txOff(23 + i); txOff(36 + i); }
            else {
                tx(23 + i, lab, 0 - 226, oRowY, 9, i == netRow ? C_WHITE : '#dfe5ee', 1);
                tx(36 + i, val, 0 - 64, oRowY, 7, i == netRow ? C_WHITE : C_DIM, 1);
            }
            i = i + 1;
        }
        if (nrN < 1) { tx(51, 'NO ROOMS YET - CREATE ONE', 120, 100, 8, C_DIM, 1); } else { txOff(51); }
    } else if (netPg == 2) {
        help = 'UP/DOWN select   LEFT/RIGHT change   ENTER choose   Y chat   ESC back';
        tx(50, netEdit > 0 ? 'ROOM SETTINGS' : 'NEW ROOM', 120, 116, 12, C_WHITE, 1);
        while (i <= 10) {
            netRowY(i);
            let lab = BLANK;
            let val = BLANK;
            if (i == 1) { lab = 'TITLE'; val = str(nrTitle, '   (ENTER TO TYPE)'); }
            else if (i == 2) { lab = 'CIRCUIT'; val = trkName[nrTrk]; }
            else if (i == 3) { lab = 'LAPS'; val = str(lapOpt[nrLapSel]); }
            else if (i == 4) { lab = 'RULES'; val = ruleName[nrRules]; }
            else if (i == 5) { lab = 'WEATHER'; val = wxName[nrWx]; }
            else if (i == 6) { lab = 'CONTACT'; val = nrCon > 0 ? 'ON  (CARS PUSH EACH OTHER)' : 'OFF  (GHOST CARS)'; }
            else if (i == 7) { lab = 'CARS'; netCarTxt(nrCarR, 1); val = oCrT; }
            else if (i == 8) { lab = 'PLAYERS'; val = str('UP TO ', nrMax); }
            else if (i == 9) { lab = 'PRIVATE'; val = nrCode > 0 ? str('CODE ', nrCode) : 'OPEN   (ENTER TO SET A CODE)'; }
            else { lab = netEdit > 0 ? 'SAVE' : 'OPEN THE ROOM'; }
            if (i >= 2) { if (i <= 8) { if (i == netRow) { val = str('< ', val, ' >'); } } }
            tx(23 + i, lab, 0 - 226, oRowY, 9, i == netRow ? C_WHITE : '#dfe5ee', 1);
            tx(36 + i, val, 0 - 120, oRowY, 8, i == netRow ? C_WHITE : C_DIM, 1);
            i = i + 1;
        }
    } else {
        let h = netRoom;
        let host = h == netMy ? 1 : 0;
        let tt = nrTitle; let tk = nrTrk; let lp = lapOpt[nrLapSel]; let ru = nrRules; let wxx = nrWx; let cn = nrCon; let mx = nrMax; let cr = nrCarR;
        if (host < 1) { if (h > 0) { tt = nsTitle[h]; tk = nsTrk[h]; lp = nsLaps[h]; ru = nsRules[h]; wxx = nsWx[h]; cn = nsCon[h]; mx = nsMax[h]; cr = nsCarR[h]; } }
        tx(50, tt, 120, 116, 12, C_WHITE, 1);
        tx(51, str(trkName[tk], '  ', lp, ' LAPS'), 120, 102, 7, C_DIM, 1);
        while (i <= 10) {
            netRowY(i);
            let lab = BLANK;
            if (i == 1) {
                if (host > 0) { lab = 'START THE RACE'; } else { lab = netSt == NS_READY ? 'READY!  (ENTER: NOT READY)' : 'PRESS ENTER WHEN READY'; }
            } else if (i == 2) { lab = host > 0 ? 'SETTINGS' : '<  LEAVE THE ROOM'; }
            else if (i == 3) { if (host > 0) { lab = '<  CLOSE THE ROOM'; } }
            if (lab == BLANK) { txOff(23 + i); } else { tx(23 + i, lab, 0 - 226, oRowY, 9, i == netRow ? C_WHITE : '#dfe5ee', 1); }
            i = i + 1;
        }
        // the players
        if (h > 0) { netMembers(h); } else { nmN = 0; }
        tx(52, str('PLAYERS  ', nmN, ' / ', mx), 0, 80, 9, C_GOLD, 1);
        i = 1;
        while (i <= 8) {
            if (i <= nmN) {
                let s = nmL[i];
                let st = 'NOT READY';
                if (s == h) { st = 'HOST'; } else if (nsSt[s] == NS_READY) { st = 'READY'; } else if (nsSt[s] == NS_LOADING) { st = 'LOADING'; } else if (nsSt[s] >= NS_LOADED) { st = 'RACING'; }
                padR(nsNick[s], 17);
                tx(36 + i, str(oPad, st), 0, 66 - (i - 1) * 12, 8, lvHex[nsCar[s]], 1);
            } else { txOff(36 + i); }
            i = i + 1;
        }
        // the rules, under the buttons (v2.2.0: with the cars rule)
        tx(45, str(ruleName[ru], '   ', wxName[wxx], '   CONTACT ', cn > 0 ? 'ON' : 'OFF'), 0 - 226, 28, 8, C_DIM, 1);
        netCarTxt(cr, 1);
        tx(46, str('CARS:  ', oCrT), 0 - 226, 14, 8, cr > 0 ? C_GOLD : C_DIM, 1);
        // v2.4.0: the quick chat keys
        tx(47, qcL1, 0 - 226, 0 - 6, 7, '#c9d1de', 1);
        tx(48, qcL2, 0 - 226, 0 - 17, 7, '#c9d1de', 1);
    }
    tx(12, help, 0, 0 - 125, 8, '#c9d1de', 0);
}

// the chat lines (every screen while online): in the lobby and rooms in the
// panel, in a race faded out after a while at the right
function netHudChat() {
    let k = 1;
    let inRace = raceState != ST_NET ? 1 : 0;
    while (k <= NCH) {
        let s = chL[k];
        let on = 1;
        if (s == 0) { on = 0; }
        // (in a race: the last four, above the middle of the screen)
        if (inRace > 0) { if (gt - chA[k] > 14) { on = 0; } if (k <= NCH - 4) { on = 0; } }
        if (on > 0) {
            if (inRace > 0) { tx(80 + k, s, 0 - 100, 50 - (k - NCH + 3) * 9, 7, chC[k], 1); }
            else { tx(80 + k, s, 0 - 232, 0 - 52 - (k - 1) * 11, 8, chC[k], 1); }
        } else { txOff(80 + k); }
        k = k + 1;
    }
    if (inRace > 0) { tx(87, 'Y CHAT   3-9 QUICK', 232, 0 - 124, 7, C_DIM, 2); } else { txOff(87); }
    // v2.4.0: the quick chat keys on the grid
    let qg = 0;
    if (inRace > 0) { if (raceState == ST_COUNT) { if (netWatch < 1) { qg = 1; } } }
    if (qg > 0) {
        tx(47, qcL1, 0, 0 - 80, 8, '#e0e6f2', 0);
        tx(48, qcL2, 0, 0 - 92, 8, '#e0e6f2', 0);
    } else if (inRace > 0) { txOff(47); txOff(48); }
    // v2.1.2: the connection
    if (netLostT > 1) {
        let t = 'NO NEWS FROM THE SERVER - WAITING';
        if (SY_ < 1) { t = str('CONNECTION LOST - RECONNECTING  ', Math.floor(netLostT), ' s'); }
        if (netFrozen < 1) { t = 'CONNECTION LOST - THE OTHERS ARE TAKEN AS GONE'; }
        tx(88, t, 0, 36, 11, '#ff6a5a', 0);
    } else { txOff(88); }
}

// the race screen when watching
function netHudWatch() {
    tx(9, banner, 0, 14, 40, C_WHITE, 0);
    let c = camCar;
    netName(c);
    tx(3, str('WATCHING  ', oNm), 104, 112, 14, C_WHITE, 1);
    let lp = Math.max(1, Math.min(nLaps, caLap[c]));
    tx(4, str('P ', caRank[c], ' / ', nCars, '    LAP ', lp, ' / ', nLaps), 104, 94, 11, C_GOLD, 1);
    tx(1, str(Math.round(Math.abs(caSpd[c]) * 3.6)), 0 - 196, 0 - 104, 22, C_WHITE, 1);
    tx(2, 'km/h', 0 - 196, 0 - 126, 11, '#a8b0c0', 1);
    fmtTime(raceT);
    tx(5, oTime, 0 - 196, 112, 16, C_WHITE, 1);
    let i = 6; while (i <= 8) { txOff(i); i = i + 1; }
    txOff(13); txOff(14); txOff(15); txOff(10);
    tx(11, netOver > 0 ? 'THE RACE IS OVER' : msg, 0, 0 - 128, 12, C_GOLD, 0);
    tx(12, 'LEFT/RIGHT other car   C camera   Y chat   ESC leave', 0, 0 - 112, 9, C_DIM, 0);
}

// the results of an online race (racing or watching)
function netHudDone() {
    resultsTable();
    let t = 'RESULTS';
    if (netWatch < 1) { t = str('FINISH  P', caFin[1]); }
    tx(9, t, 0, 106, 30, netWatch < 1 ? (caFin[1] == 1 ? C_GOLD : C_WHITE) : C_WHITE, 0);
    let s = netOver > 0 ? 'FINAL RESULTS' : 'WAITING FOR THE OTHERS TO FINISH';
    if (netWatch < 1) { fmtTime(caFinT[1]); s = str('TOTAL ', oTime, '     ', s); }
    tx(10, s, 0, 82, 11, '#e0e6f2', 0);
    if (netWatch < 1) { tx(11, str(rsLine, '     LEVEL ', pLv), 0, 0 - 94, 9, C_GOLD, 0); } else { txOff(11); }
    tx(12, 'ENTER  back to the room     LEFT/RIGHT watch a car     Y chat', 0, 0 - 112, 10, C_DIM, 0);
}

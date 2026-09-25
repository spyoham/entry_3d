// ============================================================
// menu.js - the v6 front end: main menu with a live preview card, the car
//   showroom (turntable, performance bars, spec table) and the circuit
//   screen (a rotating 3D relief map). Pen drawing is here (drawMenuUI,
//   called at the end of renderWorld); the text for the same layout comes
//   from the hud*() functions, through the text slots of hud.js.
// ============================================================
const C_PANEL = '#0d1117';
const C_PANEL2 = '#1a212c';
const C_RED = '#e8322a';
const CARD_SLOT = NCAR + 2;         // spare car slot for the preview-card car

let cardX0 = 6;
let cardX1 = 236;
let menuSlide = 0;                  // selected row slides out a little
let menuPrev = 0;

function rowY(i) { oRowY = 70 - (i - 1) * 17; }
// the card a menu row shows: a category (20-22) or BACK (23) shows the card of
// its first item
function cardOf(k) {
    oCard = k;
    if (k == 20) { oCard = 1; } else if (k == 21) { oCard = 4; } else if (k == 22) { oCard = 10; }
    else if (k == 23) { oCard = 1; if (mnPage == 2) { oCard = 4; } else if (mnPage == 3) { oCard = 10; } }
}
let oCard = 1;
let oRowY = 0;

// a bar with slanted ends
function skewBar(x0, x1, y, h, sk, col) {
    fill4(x0 + sk, y + h, x1 + sk, y + h, x1 - sk, y - h, x0 - sk, y - h, col);
}
function box(x0, y0, x1, y1, col) {
    fill4(x0, y0, x1, y0, x1, y1, x0, y1, col);
}

// ---- 3D relief map of the circuit ---------------------------------------
// NMAP samples of the centreline, scaled into a unit disc (mpX/mpZ), height
// exaggerated (mpY), built with the track. Turned about the vertical, tilted
// and put in mild perspective; drawn as a shadow on a base plate and the
// ribbon above it.
let mapA = 0;
function mapProj(x, y, z, cx, cy, rad) {
    let ca = cosd(mapA);
    let sa = sind(mapA);
    let rx = x * ca - z * sa;
    let rz = x * sa + z * ca;
    let f = rad / (1 + 0.22 * rz);
    oMX = cx + rx * f;
    oMY = cy + (rz * 0.62 + y * 0.78) * f;
}
let oMX = 0;
let oMY = 0;

function drawMap3D(cx, cy, rad) {
    mapA = gt * 16;
    // base plate
    fillColorHex('#161d28');
    let k = 0;
    while (k <= 24) {
        mapProj(1.18 * cosd(k * 15), 0 - 0.10, 1.18 * sind(k * 15), cx, cy, rad);
        goto(oMX, oMY);
        if (k == 0) { fillStart(); }
        k = k + 1;
    }
    fillStop();
    fillColorHex('#222b38');
    k = 0;
    while (k <= 24) {
        mapProj(1.05 * cosd(k * 15), 0 - 0.10, 1.05 * sind(k * 15), cx, cy, rad);
        goto(oMX, oMY);
        if (k == 0) { fillStart(); }
        k = k + 1;
    }
    fillStop();
    // project both edges once for the shadow and once for the ribbon
    let w = 0.045;
    k = 1;
    while (k <= NMAP) {
        let x = mpX[k]; let z = mpZ[k]; let nx = mpNX[k] * w; let nz = mpNZ[k] * w;
        mapProj(x - nx, 0 - 0.10, z - nz, cx, cy, rad); mapSX[k] = oMX; mapSY[k] = oMY;
        mapProj(x + nx, 0 - 0.10, z + nz, cx, cy, rad); mapSX[k + NMAP] = oMX; mapSY[k + NMAP] = oMY;
        mapProj(x - nx, mpY[k], z - nz, cx, cy, rad); mapTX[k] = oMX; mapTY[k] = oMY;
        mapProj(x + nx, mpY[k], z + nz, cx, cy, rad); mapTX[k + NMAP] = oMX; mapTY[k + NMAP] = oMY;
        k = k + 1;
    }
    k = 1;
    while (k <= NMAP) {
        let j = mod(k, NMAP) + 1;
        fill4(mapSX[k], mapSY[k], mapSX[k + NMAP], mapSY[k + NMAP], mapSX[j + NMAP], mapSY[j + NMAP], mapSX[j], mapSY[j], '#0b0f15');
        k = k + 1;
    }
    // ribbon, lighter the higher it runs
    k = 1;
    while (k <= NMAP) {
        let j = mod(k, NMAP) + 1;
        let h = Math.round(mpY[k] / mapTop * 4);
        let col = '#c4ccd8';
        if (h >= 4) { col = '#ffffff'; } else if (h >= 3) { col = '#eef2f8'; } else if (h >= 2) { col = '#dde3ec'; } else if (h >= 1) { col = '#d0d7e2'; }
        fill4(mapTX[k], mapTY[k], mapTX[k + NMAP], mapTY[k + NMAP], mapTX[j + NMAP], mapTY[j + NMAP], mapTX[j], mapTY[j], col);
        k = k + 1;
    }
    // start / finish: a red post with a chequered flag
    mapProj(mpX[1], mpY[1], mpZ[1], cx, cy, rad);
    let sx = oMX; let sy = oMY;
    fill4(sx - 0.8, sy, sx + 0.8, sy, sx + 0.8, sy + 16, sx - 0.8, sy + 16, C_RED);
    fill4(sx + 0.8, sy + 16, sx + 9, sy + 16, sx + 9, sy + 10, sx + 0.8, sy + 10, '#ffffff');
    fill4(sx + 0.8, sy + 16, sx + 4.9, sy + 16, sx + 4.9, sy + 13, sx + 0.8, sy + 13, '#101010');
    fill4(sx + 4.9, sy + 13, sx + 9, sy + 13, sx + 9, sy + 10, sx + 4.9, sy + 10, '#101010');
}

// ---- a car drawn into a card: its own camera, then the world's again -----
function drawCardCar(cx, cy, dist) {
    let sX = camX; let sY = camY; let sZ = camZ; let sYaw = camYaw; let sP = camPitch; let sR = camRoll; let sF = camFov;
    let ff = fogFar;
    let c = CARD_SLOT;
    caX[c] = 0; caY[c] = 0 - 400; caZ[c] = 0;
    caYaw[c] = gt * 30; caRoll[c] = 0; caPitch[c] = 0;
    caSteer[c] = 0.4 * sind(gt * 50); caBrk[c] = 0; caCol[c] = ctCol[selCar];
    camYaw = 0; camPitch = 0 - 14; camRoll = 0; camFov = 30;
    camX = 0; camZ = 0 - dist * cosd(14); camY = caY[c] + 0.35 + dist * sind(14);
    fogFar = 99999;
    scrOX = Math.round(cx * QS); scrOY = Math.round(cy * QS);
    setupCam();
    drawCar(c, 1);
    scrOX = 0; scrOY = 0;
    camX = sX; camY = sY; camZ = sZ; camYaw = sYaw; camPitch = sP; camRoll = sR; camFov = sF;
    fogFar = ff;
    setupCam();
}

// a horizontal meter: track, fill, and a tick for every other car's value
function meter(x0, x1, y, v, k) {
    box(x0, y + 2.5, x1, y - 2.5, '#232b37');
    let x = x0 + (x1 - x0) * v;
    box(x0, y + 2.5, x, y - 2.5, lvHex[ctCol[selCar]]);
    box(x - 1, y + 3.5, x + 1, y - 3.5, '#ffffff');
    let o = 1;
    while (o <= NCARTYPE) {
        if (o != selCar) {
            let b = ctB1[o];
            if (k == 2) { b = ctB2[o]; } else if (k == 3) { b = ctB3[o]; } else if (k == 4) { b = ctB4[o]; }
            let xo = x0 + (x1 - x0) * b;
            box(xo - 0.6, y - 3.5, xo + 0.6, y - 6, '#8f9bb3');
        }
        o = o + 1;
    }
}
function statB(k) {
    oStat = ctB1[selCar];
    if (k == 2) { oStat = ctB2[selCar]; } else if (k == 3) { oStat = ctB3[selCar]; } else if (k == 4) { oStat = ctB4[selCar]; }
}
let oStat = 0;

// ---- screens: pen ----------------------------------------------------------
function drawMenuUI() {
    if (raceState == ST_MENU) { drawMainMenu(); }
    else if (raceState == ST_CARSEL) { drawCarSel(); }
    else if (raceState == ST_TRKSEL) { drawTrkSel(); }
    else if (raceState == ST_DONE) { drawTablePanel(); }
    else if (raceState == ST_STAND) { drawTablePanel(); }
    else if (raceState == ST_QRES) { drawTablePanel(); }
    else if (raceState == ST_TUNE) { drawTune(); }
    else if (raceState == ST_PROF) { drawProf(); }
}

function drawTablePanel() {
    box(0 - 182, 122, 182, 70, C_PANEL);
    box(0 - 182, 70, 182, 68, C_RED);
    box(0 - 182, 68, 182, 0 - 64, '#10151d');
    box(0 - 182, 0 - 100, 182, 0 - 122, C_PANEL);
}

function drawPausePanel() {
    let y1 = 0 - 56;
    if (gfx > 1) { y1 = 0 - 74; }
    box(0 - 150, 66, 150, y1, C_PANEL);
    box(0 - 150, 66, 150, 63, C_RED);
}

function drawMainMenu() {
    if (menuSel != menuPrev) { menuPrev = menuSel; menuSlide = 0; }
    menuSlide = menuSlide + (1 - menuSlide) * Math.min(1, dt * 10);
    // title, and the player's level under it
    skewBar(0 - 250, 0 - 44, 114, 14, 4, C_PANEL);
    skewBar(0 - 250, 0 - 90, 95, 5.5, 2, C_RED);
    box(0 - 80, 87.5, 0 - 80 + 36 * pLvXP / pLvNeed, 86, C_GOLD);
    // where in the menu we are, then the list
    skewBar(0 - 250, 0 - 104, 82, 5.2, 2, C_PANEL);
    let i = 1;
    while (i <= mnN) {
        rowY(i);
        let k = mnItem[i];
        if (i == mnRow) {
            skewBar(0 - 250, 0 - 40 + 12 * menuSlide, oRowY, 7.2, 3, C_RED);
            skewBar(0 - 250, 0 - 236, oRowY, 7.2, 3, '#ffffff');
        } else {
            skewBar(0 - 250, 0 - 44, oRowY, 7.2, 3, k >= 20 ? '#18202b' : C_PANEL);
        }
        // a category opens a list: a small arrow tab at its end
        if (k >= 20) { if (k <= 22) { fill4(0 - 52, oRowY + 3, 0 - 47, oRowY, 0 - 52, oRowY - 3, 0 - 52, oRowY - 3, i == mnRow ? '#ffffff' : C_DIM); } }
        i = i + 1;
    }
    // preview card
    box(cardX0, 96, cardX1, 0 - 92, C_PANEL);
    box(cardX0, 96, cardX1, 94, C_RED);
    box(0 - 250, 0 - 104, 250, 0 - 132, C_PANEL);
    cardOf(menuSel);
    let m = oCard;
    if (m == 1) {
        drawMap3D(121, 50, 34);
    } else if (m == 2) {
        choiceBoxes(4, gMode);
    } else if (m == 3) {
        choiceBoxes(2, rules);
    } else if (m == 4) {
        box(cardX0 + 6, 70, cardX1 - 6, 0 - 16, '#121821');
        drawCardCar(121, 24, 34);
        let k = 1;
        while (k <= 4) {
            statB(k);
            meter(cardX0 + 84, cardX1 - 48, 0 - 26 - (k - 1) * 13, oStat, k);
            k = k + 1;
        }
    } else if (m == 5) {
        // upgrade levels as rows of pips
        let k = 1;
        while (k <= 4) {
            let lvl = upE;
            if (k == 2) { lvl = upA; } else if (k == 3) { lvl = upB; } else if (k == 4) { lvl = upT; }
            let j = 1;
            while (j <= UPMAX) {
                let x0 = cardX0 + 112 + (j - 1) * 20;
                box(x0, 58 - (k - 1) * 13 + 3, x0 + 16, 58 - (k - 1) * 13 - 3, j <= lvl ? C_RED : C_PANEL2);
                j = j + 1;
            }
            k = k + 1;
        }
    } else if (m == 6) {
        drawMap3D(121, 26, 62);
    } else if (m == 7) {
        let k = 1;
        while (k <= NDIFF) {
            let x0 = cardX0 + 12 + (k - 1) * 43;
            box(x0, 76, x0 + 38, 70, k <= aiDiff ? C_RED : C_PANEL2);
            k = k + 1;
        }
    } else if (m == 8) {
        if (gMode == M_TT) { choiceBoxes(3, ghSel); }
        else if (gMode == M_PR) { choiceBoxes(3, paSel); }
        else {
            let k = 1;
            while (k <= NLAPO) {
                let x0 = cardX0 + 12 + (k - 1) * 54;
                box(x0, 26, x0 + 48, 22, k == lapSel ? C_RED : C_PANEL2);
                k = k + 1;
            }
        }
    } else if (m == 9) {
        drawWxIcon(121, 46);
    } else if (m == 10) {
        choiceBoxes(3, gfx);
    } else if (m == 11) {
        choiceBoxes(2, sndSel);
        // a little level meter that moves when the sound is on
        let k = 0;
        while (k < 16) {
            let h = 3;
            if (sndSel > 1) { h = 4 + 14 * Math.abs(sind(gt * 260 + k * 37)) * Math.abs(sind(gt * 90 + k * 11)); }
            box(cardX0 + 60 + k * 7, 2, cardX0 + 64 + k * 7, 2 + h, sndSel > 1 ? '#3dff6e' : '#2a3240');
            k = k + 1;
        }
    } else if (m == 12) {
        // level badge and XP bar
        fillOct(cardX0 + 40, 48, 22, C_RED);
        fillOct(cardX0 + 40, 48, 18, C_PANEL);
        box(cardX0 + 76, 36, cardX1 - 12, 30, C_PANEL2);
        box(cardX0 + 76, 36, cardX0 + 76 + (cardX1 - 88 - cardX0) * pLvXP / pLvNeed, 30, C_GOLD);
    } else if (m == 13) {
        // a little node-and-spline sketch
        let k = 0;
        while (k < 8) {
            let a = k * 45 + gt * 20;
            let x = 121 + 60 * cosd(a) * (1 + 0.25 * sind(k * 90));
            let y = 36 + 26 * sind(a);
            box(x - 3, y + 3, x + 3, y - 3, k == 0 ? C_RED : '#dfe6f0');
            k = k + 1;
        }
    }
}

// n choice boxes across the card, the chosen one red
function choiceBoxes(n, sel) {
    let wd = 218 / n;
    let k = 1;
    while (k <= n) {
        let x0 = cardX0 + 10 + (k - 1) * wd;
        box(x0, 64, x0 + wd - 6, 42, k == sel ? C_RED : C_PANEL2);
        k = k + 1;
    }
}

function drawWxIcon(cx, cy) {
    if (wx > 1) {
        fillOct(cx - 16, cy + 6, 14, '#7c8696');
        fillOct(cx + 8, cy + 10, 18, '#8e98a8');
        fillOct(cx + 26, cy + 2, 12, '#7c8696');
        box(cx - 30, cy + 2, cx + 38, cy - 10, '#8e98a8');
        let k = 0;
        while (k < 7) {
            let x = cx - 24 + k * 9 + mod(gt * 40 + k * 7, 6);
            let y = cy - 16 - mod(gt * 60 + k * 11, 18);
            fill4(x, y, x + 1.5, y, x - 2.5, y - 7, x - 4, y - 7, '#9fd8ff');
            k = k + 1;
        }
    } else {
        let k = 0;
        while (k < 12) {
            let a = k * 30 + gt * 20;
            fill4(cx + 17 * cosd(a - 4), cy + 17 * sind(a - 4), cx + 17 * cosd(a + 4), cy + 17 * sind(a + 4),
                cx + 27 * cosd(a), cy + 27 * sind(a), cx + 27 * cosd(a), cy + 27 * sind(a), '#ffd24a');
            k = k + 1;
        }
        fillOct(cx, cy, 14, '#ffd24a');
        fillOct(cx, cy, 10, '#ffe88a');
    }
}

function drawCarSel() {
    box(34, 116, 240, 0 - 106, C_PANEL);
    box(34, 116, 240, 112, lvHex[ctCol[selCar]]);
    box(34, 62, 240, 61, '#2a3240');
    let k = 1;
    while (k <= 4) {
        statB(k);
        meter(112, 196, 48 - (k - 1) * 15, oStat, k);
        k = k + 1;
    }
    box(34, 0 - 10, 240, 0 - 11, '#2a3240');
    // selector: one dot per car
    k = 1;
    while (k <= NCARTYPE) {
        let x = 0 - 132 + (k - 1) * 12;
        box(x - 3, 0 - 97, x + 3, 0 - 103, k == selCar ? C_RED : '#3a4452');
        k = k + 1;
    }
    box(0 - 250, 0 - 112, 250, 0 - 132, C_PANEL);
}

function drawTrkSel() {
    box(0 - 240, 116, 0 - 6, 0 - 106, C_PANEL);
    box(0 - 240, 116, 0 - 6, 113, C_RED);
    drawMap3D(0 - 123, 4, 72);
    box(4, 116, 240, 0 - 106, C_PANEL);
    box(4, 116, 240, 113, C_RED);
    let k = 1;
    while (k <= 7) {
        let y = 57 - (k - 1) * 17 - 8.5;
        box(12, y + 0.5, 232, y - 0.5, '#232b37');
        k = k + 1;
    }
    k = 1;
    while (k <= NTRK) {
        let x = 0 - 170 + (k - 1) * 12;
        box(x - 3, 0 - 94, x + 3, 0 - 100, k == selTrk ? C_RED : '#3a4452');
        k = k + 1;
    }
    box(0 - 250, 0 - 112, 250, 0 - 132, C_PANEL);
}

// ---- screens: text -----------------------------------------------------------
// v8 slots: menu labels 24..36, values 37..49; cards 50 (title), 51..71
// (cardRow r: label 51+r, value 61+r), 72..76 extras; 77..79 pop-ups.
function hudMenu() {
    tx(9, 'ENTRY RACING 3D', 0 - 232, 116, 21, C_WHITE, 1);
    tx(10, 'F1 EDITION  /  v3.2', 0 - 232, 96, 8, C_WHITE, 1);
    let lvl = pLoaded > 0 ? str('LV ', pLv, '  ', pNick) : 'LOADING SAVE...';
    tx(13, lvl, 0 - 80, 96, 8, C_GOLD, 1);
    let crumb = 'MAIN MENU';
    if (mnPage == 1) { crumb = 'MAIN MENU  >  RACE SETUP'; } else if (mnPage == 2) { crumb = 'MAIN MENU  >  CAR & GARAGE'; }
    else if (mnPage == 3) { crumb = 'MAIN MENU  >  SETTINGS'; }
    tx(23, crumb, 0 - 232, 82.5, 7, '#c9d1de', 1);
    let i = 1;
    while (i <= NMENU) {
        if (i > mnN) { txOff(23 + i); txOff(36 + i); }
        i = i + 1;
    }
    i = 1;
    while (i <= mnN) {
        rowY(i);
        let k = mnItem[i];
        let sel = i == mnRow ? 1 : 0;
        let lab = BLANK;
        let val = BLANK;
        if (k == 20) { lab = 'RACE SETUP'; val = gMode == M_CH ? modeName[gMode] : trkName[selTrk]; }
        else if (k == 21) { lab = 'CAR & GARAGE'; val = pPts > 0 ? str(ctName[selCar], '  /  ', pPts, ' PTS') : ctName[selCar]; }
        else if (k == 22) { lab = 'SETTINGS'; val = str(gfxName[gfx], '  /  SOUND ', sndName[sndSel]); }
        else if (k == 23) { lab = '<  BACK'; }
        else if (k == 1) {
            lab = 'RACE START';
            if (gMode == M_CH) { lab = 'START CHAMPIONSHIP'; } else if (gMode == M_TT) { lab = 'START TIME TRIAL'; } else if (gMode == M_PR) { lab = 'START PRACTICE'; }
        } else if (k == 2) { lab = 'MODE'; val = modeName[gMode]; }
        else if (k == 3) { lab = 'RULES'; val = ruleName[rules]; }
        else if (k == 4) { lab = 'CAR'; val = ctName[selCar]; }
        else if (k == 5) { lab = 'GARAGE'; val = pPts > 0 ? str(pPts, ' POINTS TO SPEND') : 'TUNING'; }
        else if (k == 6) { lab = 'CIRCUIT'; val = gMode == M_CH ? 'ALL 8' : trkName[selTrk]; }
        else if (k == 7) { lab = 'AI LEVEL'; val = gMode >= M_TT ? 'NONE' : aiName[aiDiff]; }
        else if (k == 8) {
            lab = 'LAPS'; val = str(lapOpt[lapSel]);
            if (gMode == M_TT) { lab = 'GHOST'; val = ghName[ghSel]; }
            else if (gMode == M_PR) { lab = 'ASSIST'; val = paName[paSel]; }
        }
        else if (k == 9) { lab = 'WEATHER'; val = wxName[wx]; }
        else if (k == 10) { lab = 'GRAPHICS'; val = gfxName[gfx]; }
        else if (k == 11) { lab = 'SOUND'; val = sndName[sndSel]; }
        else if (k == 12) { lab = 'PROFILE'; val = str('LEVEL ', pLv); }
        else { lab = 'TRACK EDITOR'; }
        let x = 0 - 226 + (sel > 0 ? 4 * menuSlide : 0);
        tx(23 + i, lab, x, oRowY, 10, sel > 0 ? C_WHITE : (k >= 20 ? '#ffd9d4' : '#c9d1de'), 1);
        // left/right changes an option row: show the arrows on it
        let opt = 1;
        if (k == 1) { opt = 0; } else if (k == 5) { opt = 0; } else if (k >= 12) { opt = 0; }
        if (sel > 0) { if (val != BLANK) { if (opt > 0) { val = str('< ', val, ' >'); } } }
        tx(36 + i, val, 0 - 134 + (sel > 0 ? 4 * menuSlide : 0), oRowY, 8, sel > 0 ? C_WHITE : C_DIM, 1);
        i = i + 1;
    }
    if (mnPage > 0) { tx(12, 'UP/DOWN select   LEFT/RIGHT change   ENTER confirm   ESC back', 0, 0 - 111, 9, '#c9d1de', 0); }
    else { tx(12, 'UP/DOWN select   LEFT/RIGHT change   ENTER open / confirm', 0, 0 - 111, 9, '#c9d1de', 0); }
    if (rules == R_SIM) { tx(11, 'IN RACE:  W/S  A/D   E DRS   SHIFT/Q ERS BOOST   T PIT TYRE   C camera   P pause', 0, 0 - 123, 7, C_DIM, 0); }
    else { tx(11, 'IN RACE:  W/S throttle-brake   A/D steer   E DRS   C camera   L line   P pause', 0, 0 - 123, 8, C_DIM, 0); }
    hudCard();
}

// a line of card text in slot i
function cardTx(i, s, y, sz, col) { tx(i, s, cardX0 + 10, y, sz, col, 1); }

function hudCard() {
    cardOf(menuSel);
    let m = oCard;
    if (m == 1) {
        tx(50, 'READY TO RACE', cardX0 + 10, 84, 11, C_WHITE, 1);
        let y0 = 4;
        cardRow(1, 'MODE', str(modeName[gMode], '  /  ', ruleName[rules]), y0);
        cardRow(2, 'CIRCUIT', gMode == M_CH ? str('ALL ', NTRK, ' ROUNDS') : trkName[selTrk], y0 - 13);
        cardRow(3, 'CAR', ctName[selCar], y0 - 26);
        let lp = str(lapOpt[lapSel]);
        if (gMode == M_TT) { lp = str('UNLIMITED  -  GHOST ', ghName[ghSel]); } else if (gMode == M_PR) { lp = 'UNLIMITED'; }
        cardRow(4, 'LAPS', lp, y0 - 39);
        cardRow(5, 'OPPONENTS', gMode >= M_TT ? 'NONE' : str(NCAR - 1, '  /  ', aiName[aiDiff]), y0 - 52);
        cardRow(6, 'WEATHER', wxName[wx], y0 - 65);
        let q = BLANK;
        if (rules == R_SIM) { if (gMode < M_TT) { q = 'QUALIFYING FIRST'; } }
        tx(72, q, cardX1 - 10, 84, 8, C_GOLD, 2);
        tx(73, mod(Math.floor(gt * 2), 2) < 1 ? 'PRESS ENTER' : BLANK, 121, 0 - 84, 10, C_GOLD, 0);
    } else if (m == 2) {
        tx(50, 'GAME MODE', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, 'GP', cardX0 + 35, 53, 9, gMode == 1 ? C_WHITE : C_DIM, 0);
        tx(73, 'CHAMP', cardX0 + 90, 53, 9, gMode == 2 ? C_WHITE : C_DIM, 0);
        tx(74, 'TRIAL', cardX0 + 144, 53, 9, gMode == 3 ? C_WHITE : C_DIM, 0);
        tx(75, 'SOLO', cardX0 + 199, 53, 9, gMode == 4 ? C_WHITE : C_DIM, 0);
        cardTx(52, modeName[gMode], 22, 13, C_GOLD);
        cardTx(53, modeD1[gMode], 4, 9, C_WHITE);
        cardTx(54, modeD2[gMode], 0 - 10, 9, C_WHITE);
        cardTx(55, modeD3[gMode], 0 - 24, 9, C_DIM);
    } else if (m == 3) {
        tx(50, 'RULES', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, 'ARCADE', cardX0 + 61, 53, 10, rules == 1 ? C_WHITE : C_DIM, 0);
        tx(73, 'REALISTIC', cardX0 + 173, 53, 10, rules == 2 ? C_WHITE : C_DIM, 0);
        cardTx(52, ruleName[rules], 26, 13, C_GOLD);
        cardTx(53, ruleD1[rules], 8, 8, C_WHITE);
        cardTx(54, ruleD2[rules], 0 - 5, 8, C_WHITE);
        cardTx(55, ruleD3[rules], 0 - 18, 8, C_WHITE);
        if (rules == R_SIM) {
            cardTx(56, 'SOFT / MEDIUM / HARD / INTER / WET TYRES', 0 - 38, 7, C_DIM);
            cardTx(57, 'PIT LANE AT 80 km/h  -  T PICKS THE NEXT TYRE', 0 - 50, 7, C_DIM);
            cardTx(58, 'SHIFT OR Q: ERS BOOST  -  WEATHER: CHANGING', 0 - 62, 7, C_DIM);
            cardTx(59, 'EVERY 3RD TRACK-LIMITS STRIKE: +5 SEC', 0 - 74, 7, C_DIM);
        } else {
            cardTx(56, 'SAME DRIVING AND RACE AS BEFORE', 0 - 38, 7, C_DIM);
            cardTx(57, 'THE AI DRIVERS NOW ATTACK, DEFEND', 0 - 50, 7, C_DIM);
            cardTx(58, 'AND MAKE MISTAKES IN THEIR OWN WAY', 0 - 62, 7, C_DIM);
            txOff(59);
        }
    } else if (m == 4) {
        tx(50, ctName[selCar], cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, str(lvName[ctCol[selCar]], '  -  ', ctInfo[selCar]), cardX0 + 10, 0 - 84, 7, C_DIM, 1);
        let k = 1;
        while (k <= 4) {
            let y = 0 - 26 - (k - 1) * 13;
            let lab = 'TOP SPEED'; let val = str(ctKmh[selCar], ' km/h');
            if (k == 2) { lab = 'ACCELERATION'; val = str(ct200[selCar], ' s'); }
            else if (k == 3) { lab = 'CORNERING'; val = str(ctGL[selCar], ' g'); }
            else if (k == 4) { lab = 'DOWNFORCE'; val = str(ctGH[selCar], ' g'); }
            tx(51 + k, lab, cardX0 + 10, y, 8, C_DIM, 1);
            tx(61 + k, val, cardX1 - 46, y, 8, C_WHITE, 1);
            k = k + 1;
        }
    } else if (m == 5) {
        tx(50, 'GARAGE', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, str(pPts, ' UPGRADE POINTS'), cardX1 - 10, 84, 8, pPts > 0 ? C_GOLD : C_DIM, 2);
        let k = 1;
        while (k <= 4) {
            let lvl = upE;
            if (k == 2) { lvl = upA; } else if (k == 3) { lvl = upB; } else if (k == 4) { lvl = upT; }
            tx(51 + k, upName[k], cardX0 + 10, 58 - (k - 1) * 13, 8, C_DIM, 1);
            tx(61 + k, str(lvl, '/', UPMAX), cardX1 - 16, 58 - (k - 1) * 13, 7, C_WHITE, 1);
            k = k + 1;
        }
        cardRow(5, 'SETUP', str('WING ', suF, '/', suW, ' GEAR ', suG, ' BIAS ', suB, ' DIFF ', suD, ' PSI ', suP, ' SUSP ', suS), 0 - 4);
        cardTx(73, 'ONE POINT FOR EVERY LEVEL YOU GAIN', 0 - 30, 7, C_DIM);
        cardTx(74, 'THE SETUP IS FREE: EVERY GAIN HAS A COST', 0 - 42, 7, C_DIM);
        tx(75, 'ENTER  OPEN THE GARAGE', 121, 0 - 80, 9, C_GOLD, 0);
    } else if (m == 6) {
        tx(50, trkName[selTrk], cardX0 + 10, 84, 11, C_WHITE, 1);
        fmtTime(recLap[selTrk] > 0 ? recLap[selTrk] : 0 - 1);
        cardRow(1, 'LENGTH', str(Math.round(trkLen / 10) / 100, ' km'), 0 - 44);
        cardRow(2, 'TURNS', str(trkTurns[selTrk], '     DRS ZONES  ', drsN), 0 - 56);
        cardRow(3, 'MY BEST LAP', oTime, 0 - 68);
        let wr = 'NONE YET';
        if (selTrk <= NTRK) { if (recWR[selTrk] > 0) { fmtTime(recWR[selTrk]); wr = str(oTime, '  ', recNm[selTrk]); } }
        cardRow(4, 'WORLD RECORD', wr, 0 - 80);
    } else if (m == 7) {
        tx(50, 'OPPONENTS', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, str(aiName[aiDiff], '   ENGINE ', Math.round(aiPow[aiDiff] * 100), '%   RACECRAFT ', Math.round(aiSkl[aiDiff] * 100), '%'), cardX0 + 10, 58, 8, C_GOLD, 1);
        tx(73, aiD[aiDiff], cardX0 + 10, 44, 7, C_DIM, 1);
        tx(74, 'THE RIVALS', cardX0 + 10, 28, 8, C_WHITE, 1);
        let k = 1;
        while (k <= 7) {
            cardRow(k, drvName[k + 1], drvTag[k + 1], 14 - (k - 1) * 12);
            k = k + 1;
        }
        if (gMode >= M_TT) { tx(75, 'NOT USED WHEN DRIVING ALONE', cardX1 - 10, 84, 8, C_ACC, 2); } else { txOff(75); }
    } else if (m == 8) {
        if (gMode == M_TT) {
            tx(50, 'GHOST', cardX0 + 10, 84, 11, C_WHITE, 1);
            tx(72, 'MY BEST', cardX0 + 44, 53, 9, ghSel == 1 ? C_WHITE : C_DIM, 0);
            tx(73, 'WORLD REC', cardX0 + 118, 53, 9, ghSel == 2 ? C_WHITE : C_DIM, 0);
            tx(74, 'OFF', cardX0 + 192, 53, 9, ghSel == 3 ? C_WHITE : C_DIM, 0);
            cardTx(52, 'RACE A GHOST OF A LAP', 20, 11, C_GOLD);
            cardTx(53, 'MY BEST: YOUR FASTEST LAP ON THIS CIRCUIT', 2, 7, C_WHITE);
            cardTx(54, 'WORLD RECORD: THE RANKING LEADER, ONLINE', 0 - 10, 7, C_WHITE);
            fmtTime(recLap[selTrk] > 0 ? recLap[selTrk] : 0 - 1);
            cardRow(4, 'MY BEST', oTime, 0 - 34);
            let wr = 'NONE YET';
            if (selTrk <= NTRK) { if (recWR[selTrk] > 0) { fmtTime(recWR[selTrk]); wr = str(oTime, '  ', recNm[selTrk]); } }
            cardRow(5, 'WORLD RECORD', wr, 0 - 47);
        } else if (gMode == M_PR) {
            tx(50, 'PRACTICE ASSISTS', cardX0 + 10, 84, 11, C_WHITE, 1);
            tx(72, 'LINE+BRAKE', cardX0 + 44, 53, 8, paSel == 1 ? C_WHITE : C_DIM, 0);
            tx(73, 'LINE', cardX0 + 118, 53, 9, paSel == 2 ? C_WHITE : C_DIM, 0);
            tx(74, 'NONE', cardX0 + 192, 53, 9, paSel == 3 ? C_WHITE : C_DIM, 0);
            cardTx(52, 'LEARN THE CIRCUIT ALONE', 20, 11, C_GOLD);
            cardTx(53, 'LINE: THE RACING LINE ON THE ROAD', 2, 7, C_WHITE);
            cardTx(54, 'BRAKE: BRAKES FOR YOU WHEN TOO FAST', 0 - 10, 7, C_WHITE);
            cardTx(55, 'B: BACK ON THE TRACK   R: START AGAIN', 0 - 22, 7, C_WHITE);
            cardTx(56, 'LAPS WITH THE BRAKE ASSIST DO NOT RANK', 0 - 40, 7, C_DIM);
        } else {
            tx(50, 'RACE LENGTH', cardX0 + 10, 84, 11, C_WHITE, 1);
            tx(72, str(lapOpt[lapSel]), 121, 54, 34, C_WHITE, 0);
            tx(52, '1', cardX0 + 36, 12, 9, lapSel == 1 ? C_WHITE : C_DIM, 0);
            tx(53, '3', cardX0 + 90, 12, 9, lapSel == 2 ? C_WHITE : C_DIM, 0);
            tx(54, '5', cardX0 + 144, 12, 9, lapSel == 3 ? C_WHITE : C_DIM, 0);
            tx(55, '10', cardX0 + 198, 12, 9, lapSel == 4 ? C_WHITE : C_DIM, 0);
            cardRow(5, 'DISTANCE', str(Math.round(trkLen * lapOpt[lapSel] / 100) / 10, ' km'), 0 - 20);
            cardRow(6, 'ABOUT', str(Math.round(trkLen * lapOpt[lapSel] / 55 / 60 * 10) / 10, ' min'), 0 - 33);
        }
    } else if (m == 9) {
        tx(50, 'WEATHER', cardX0 + 10, 84, 11, C_WHITE, 1);
        cardTx(72, wxName[wx], 0 - 6, 13, wx == 1 ? C_GOLD : C_SKY);
        if (wx == 3) {
            cardTx(73, 'STARTS DRY - RAIN ARRIVES DURING THE RACE', 0 - 26, 7, C_WHITE);
            cardTx(74, 'AND MAY STOP AGAIN. INTERS AND WETS IN THE PITS', 0 - 38, 7, C_WHITE);
            cardTx(75, 'THE TRACK SOAKS FAST AND DRIES SLOWLY', 0 - 50, 7, C_DIM);
            cardRowsOff(2);
        } else {
            txOff(73); txOff(74); txOff(75);
            cardRow(2, 'TYRE GRIP', wx > 1 ? (rules == R_SIM ? 'BY TYRE' : '80 %') : '100 %', 0 - 26);
            cardRow(3, 'VISIBILITY', wx > 1 ? 'SPRAY, FOG' : 'CLEAR', 0 - 39);
            cardRow(4, 'RAIN LIGHTS', wx > 1 ? 'ON' : 'OFF', 0 - 52);
        }
        if (rules == R_ARC) { tx(71, 'CHANGING WEATHER: REALISTIC RULES ONLY', cardX0 + 10, 0 - 76, 7, C_DIM, 1); } else { txOff(71); }
    } else if (m == 10) {
        tx(50, 'GRAPHICS', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, 'LOW', cardX0 + 44, 53, 10, gfx == 1 ? C_WHITE : C_DIM, 0);
        tx(73, 'HIGH', cardX0 + 118, 53, 10, gfx == 2 ? C_WHITE : C_DIM, 0);
        tx(74, 'ULTRA', cardX0 + 192, 53, 10, gfx == 3 ? C_WHITE : C_DIM, 0);
        cardRow(4, 'VIEW DISTANCE', str(Math.round(trkFar[selTrk] * gfFog[gfx]), ' m'), 22);
        cardRow(5, 'SCENERY RANGE', str(gfScn[gfx], ' m'), 9);
        cardRow(6, 'FULL-DETAIL CARS', str(gfFull[gfx]), 0 - 4);
        cardRow(7, 'SCENERY DENSITY', gfDen[gfx] > 1 ? 'x1.5' : 'x1', 0 - 17);
        cardTx(75, gfxFx[gfx], 0 - 40, 7, gfx > 1 ? C_GOLD : C_DIM);
        cardTx(71, gfxD[gfx], 0 - 56, 8, C_DIM);
    } else if (m == 11) {
        tx(50, 'SOUND', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, 'OFF', cardX0 + 61, 53, 10, sndSel == 1 ? C_WHITE : C_DIM, 0);
        tx(73, 'ON', cardX0 + 173, 53, 10, sndSel == 2 ? C_WHITE : C_DIM, 0);
        cardTx(52, 'ENGINE SOUND', 0 - 18, 12, C_GOLD);
        cardTx(53, 'YOUR V6 TURBO HYBRID FOLLOWS YOUR REVS', 0 - 36, 7, C_WHITE);
        cardTx(54, 'CARS NEARBY ARE HEARD TOO, PASSING BY', 0 - 48, 7, C_DIM);
    } else if (m == 12) {
        tx(50, 'PROFILE', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, str(pLv), cardX0 + 40, 48, 18, C_WHITE, 0);
        tx(73, pNick, cardX0 + 76, 56, 11, C_GOLD, 1);
        tx(74, str(pXP, ' XP   NEXT LEVEL ', pLvNeed - pLvXP), cardX0 + 76, 42, 7, C_DIM, 1);
        cardRow(4, 'ACHIEVEMENTS', str(achCount, ' / ', NACH), 0 - 4);
        cardRow(5, 'RACES / WINS', str(stRaces, ' / ', stWins), 0 - 17);
        cardRow(6, 'DISTANCE', str(Math.round(stKm), ' km'), 0 - 30);
        tx(75, pGuest > 0 ? 'GUEST - SIGN IN TO SAVE ONLINE' : 'SAVED IN THE WORK (REAL-TIME VARIABLES)', cardX0 + 10, 0 - 56, 7, pGuest > 0 ? C_ACC : C_DIM, 1);
        tx(71, 'ENTER  RECORDS, ACHIEVEMENTS, RANKING', 121, 0 - 80, 8, C_GOLD, 0);
    } else {
        tx(50, 'TRACK EDITOR', cardX0 + 10, 84, 11, C_WHITE, 1);
        cardTx(52, 'DRAW YOUR OWN CIRCUIT', 0 - 12, 10, C_GOLD);
        cardTx(53, 'DRAG NODES, SET WIDTH AND HEIGHT,', 0 - 28, 8, C_WHITE);
        cardTx(54, 'ADD TUNNELS, JUMPS AND BARRIERS,', 0 - 40, 8, C_WHITE);
        cardTx(55, 'THEN DRIVE IT.   ENTER TO OPEN', 0 - 52, 8, C_DIM);
        cardTx(56, 'K: SHARE CODE   I: LOAD A FRIEND\'S CODE', 0 - 68, 8, C_SKY);
    }
}

function hudCarSel() {
    tx(9, ctName[selCar], 42, 99, 18, C_WHITE, 1);
    tx(10, str(lvName[ctCol[selCar]], ' RACING'), 42, 80, 9, lvHex[ctCol[selCar]], 1);
    tx(50, ctInfo[selCar], 42, 68, 7, C_DIM, 1);
    let k = 1;
    while (k <= 4) {
        let y = 48 - (k - 1) * 15;
        let lab = 'TOP SPEED'; let val = str(ctKmh[selCar]);
        if (k == 2) { lab = 'ACCELERATION'; val = str(ct200[selCar], 's'); }
        else if (k == 3) { lab = 'CORNERING'; val = str(ctGL[selCar], 'g'); }
        else if (k == 4) { lab = 'DOWNFORCE'; val = str(ctGH[selCar], 'g'); }
        tx(51 + k, lab, 42, y, 7, C_DIM, 1);
        tx(61 + k, val, 202, y, 8, C_WHITE, 1);
        k = k + 1;
    }
    tx(51, 'SPECIFICATIONS', 42, 0 - 20, 8, C_WHITE, 1);
    tx(56, 'TOP SPEED', 42, 0 - 35, 8, C_DIM, 1); tx(66, str(ctKmh[selCar], ' km/h'), 150, 0 - 35, 8, C_WHITE, 1);
    tx(57, '0 - 100 km/h', 42, 0 - 48, 8, C_DIM, 1); tx(67, str(ct100[selCar], ' s'), 150, 0 - 48, 8, C_WHITE, 1);
    tx(58, '0 - 200 km/h', 42, 0 - 61, 8, C_DIM, 1); tx(68, str(ct200[selCar], ' s'), 150, 0 - 61, 8, C_WHITE, 1);
    tx(59, 'LATERAL G  100 / 250', 42, 0 - 74, 8, C_DIM, 1); tx(69, str(ctGL[selCar], ' / ', ctGH[selCar]), 150, 0 - 74, 8, C_WHITE, 1);
    tx(60, 'MASS', 42, 0 - 87, 8, C_DIM, 1); tx(70, str(ctKg[selCar], ' kg'), 150, 0 - 87, 8, C_WHITE, 1);
    tx(11, str('<   ', selCar, ' / ', NCARTYPE, '   >'), 0 - 114, 0 - 86, 11, C_WHITE, 0);
    tx(12, 'LEFT/RIGHT change car     ENTER choose     ESC back', 0, 0 - 122, 9, '#c9d1de', 0);
}

function hudTrkSel() {
    tx(9, trkName[selTrk], 12, 99, 15, C_WHITE, 1);
    tx(10, trkInfo[selTrk], 12, 80, 7, C_DIM, 1);
    fmtTime(recLap[selTrk] > 0 ? recLap[selTrk] : 0 - 1);
    let bl = oTime;
    fmtTime(recRace[selTrk] > 0 ? recRace[selTrk] : 0 - 1);
    let k = 1;
    while (k <= 7) {
        let y = 57 - (k - 1) * 17;
        let lab = 'LENGTH'; let val = str(Math.round(trkLen / 10) / 100, ' km');
        if (k == 2) { lab = 'TURNS'; val = str(trkTurns[selTrk]); }
        else if (k == 3) { lab = 'DRS ZONES'; val = str(drsN); }
        else if (k == 4) { lab = 'ELEVATION CHANGE'; val = str(Math.round(trkElev), ' m'); }
        else if (k == 5) { lab = 'TYPE'; val = trkType[selTrk]; }
        else if (k == 6) { lab = 'BEST LAP'; val = bl; }
        else if (k == 7) { lab = 'BEST RACE'; val = oTime; }
        tx(51 + k, lab, 14, y, 8, C_DIM, 1);
        tx(61 + k, val, 124, y, 9, C_WHITE, 1);
        k = k + 1;
    }
    tx(51, str('CIRCUIT ', selTrk, ' OF ', NTRK), 14, 0 - 70, 8, C_GOLD, 1);
    tx(11, str('<   ', trkName[selTrk], '   >'), 0 - 123, 0 - 86, 9, C_WHITE, 0);
    tx(12, 'LEFT/RIGHT change circuit     ENTER choose     ESC back', 0, 0 - 122, 9, '#c9d1de', 0);
}

// ---- v7 pen: the realistic HUD (tyre and ERS meters, flag panel) ----------------
function drawSimHud() {
    let on = 0;
    if (raceState == ST_RACE) { on = 1; }
    if (raceState == ST_COUNT) { on = 1; }
    if (raceState == ST_QUALI) { on = 1; }
    if (raceState == ST_FORM) { on = 1; }
    if (on > 0) {
        penAlpha(30);
        box(96, 74, 238, 0 - 24, '#0d1117');
        penAlpha(0);
        // tyre wear bar in the compound's colour
        let t = caTy[1];
        box(170, 64, 232, 60, '#232b37');
        box(170, 64, 170 + 62 * caWear[1], 60, tyHex[t]);
        // ERS store, green (blue while deploying)
        box(170, 52, 232, 48, '#232b37');
        box(170, 52, 170 + 62 * caErs[1], 48, caErsOn[1] > 0 ? '#3aa0ff' : '#3dff6e');
        // v3.0: brake temperature (blue cold, green working, orange hot)
        let bt = Math.min(1, caBrT[1] / 1200);
        let bc = '#3dff6e';
        if (caBrT[1] < 250) { bc = '#3a8dff'; }
        if (caBrT[1] > 950) { bc = '#ff8a3a'; }
        box(212, 28, 232, 24, '#232b37');
        box(212, 28, 212 + 20 * bt, 24, bc);
        // front wing: grey when fine, orange to red with damage
        if (caDmg[1] > 0.02) {
            let dc = '#ffb13a';
            if (caWing[1] > 0) { dc = '#ff3b30'; }
            box(200, 16, 200 + 32 * caDmg[1], 12, dc);
        }
        // v2.6 the four tyres: a little car from above, each wheel filled up
        // to what is left of it in the colour of its temperature
        penAlpha(30);
        box(0 - 232, 0 - 22, 0 - 122, 0 - 74, '#0d1117');
        penAlpha(0);
        box(0 - 180, 0 - 25, 0 - 174, 0 - 61, '#39424f');
        box(0 - 216, 0 - 32, 0 - 138, 0 - 34, '#39424f');
        box(0 - 216, 0 - 52, 0 - 138, 0 - 54, '#39424f');
        let k = 1;
        while (k <= 4) {
            let x0 = 0 - 227;
            if (mod(k, 2) == 0) { x0 = 0 - 137; }
            let y0 = 0 - 26;
            if (k >= 3) { y0 = 0 - 46; }
            box(x0, y0, x0 + 10, y0 - 14, '#232b37');
            box(x0, y0 - 14 + 14 * whW[k], x0 + 10, y0 - 14, whStC[whSt[k]]);
            k = k + 1;
        }
        // the check panel (I): a swatch per wheel beside its line
        if (whShow > 0) {
            penAlpha(15);
            box(0 - 122, 64, 122, 0 - 38, '#0d1117');
            penAlpha(0);
            box(0 - 122, 64, 122, 62, C_RED);
            k = 1;
            while (k <= 4) {
                let yy = 42 - (k - 1) * 13;
                box(0 - 119, yy + 4, 0 - 115, yy - 4, whStC[whSt[k]]);
                k = k + 1;
            }
        }
        // flag panel across the top
        let fc = BLANK;
        if (scOn > 0) { fc = '#ff8a00'; }
        else if (vscOn > 0) { fc = '#ffb13a'; }
        else if (yelHere > 0) { fc = '#ffd21f'; }
        else if (caBlue[1] > 0) { fc = '#3a8dff'; }
        if (fc != BLANK) {
            if (raceState == ST_RACE) {
                box(0 - 78, 128, 78, 106, fc);
                box(0 - 76, 126, 76, 108, '#10151d');
            }
        }
    }
}

// ---- v7 pen: replay bars -------------------------------------------------------
function drawReplayUI() {
    penAlpha(25);
    box(0 - 250, 136, 250, 104, '#0d1117');
    box(0 - 250, 0 - 110, 250, 0 - 136, '#0d1117');
    penAlpha(0);
    box(0 - 250, 104, 250, 102, C_RED);
    // a blinking red dot while playing
    if (rpPause < 1) { if (mod(Math.floor(gt * 2), 2) < 1) { fillOct(0 - 224, 120, 5, C_RED); } }
    // position in the buffer
    let f = 0;
    if (rpN > 1) { f = rpT / ((rpN - 1) * RPDT); }
    box(0 - 150, 0 - 102, 150, 0 - 105, '#2a3240');
    box(0 - 150, 0 - 102, 0 - 150 + 300 * f, 0 - 105, C_RED);
}

// ---- v8 garage -----------------------------------------------------------------
// rows 1..4 upgrades (right buys a step with a point, left sells it back),
// 5..11 setup sliders -3..+3 (free; v3.0: front wing, rear wing, gearing,
// brake bias, differential, tyre pressure, suspension)
const TUROWS = 11;
let tuRow = 1;
function tuneKeys() {
    if (actKey == 40) { tuRow = mod(tuRow, TUROWS) + 1; }
    else if (actKey == 38) { tuRow = mod(tuRow + TUROWS - 2, TUROWS) + 1; }
    else if (actKey == 37) { tuneStep(0 - 1); }
    else if (actKey == 39) { tuneStep(1); }
    else if (actKey == 13) { raceState = ST_MENU; nCars = 0; pDirty = 1; }
    else if (actKey == 27) { raceState = ST_MENU; nCars = 0; pDirty = 1; }
}
// the setup value on garage row r (5..11)
let oSu = 0;
function suGet(r) {
    oSu = suF;
    if (r == 6) { oSu = suW; } else if (r == 7) { oSu = suG; } else if (r == 8) { oSu = suB; }
    else if (r == 9) { oSu = suD; } else if (r == 10) { oSu = suP; } else if (r == 11) { oSu = suS; }
}
// the row's y on the stage (the setup rows sit a little lower)
let oTuY = 0;
function tuY(r) {
    oTuY = 66 - (r - 1) * 13;
    if (r > 4) { oTuY = oTuY - 8; }
}
function tuneStep(d) {
    tuneTouched = 1;
    levelFromXP();
    if (tuRow <= 4) {
        let v = upE;
        if (tuRow == 2) { v = upA; } else if (tuRow == 3) { v = upB; } else if (tuRow == 4) { v = upT; }
        let nv = v;
        if (d > 0) { if (pPts > 0) { if (v < UPMAX) { nv = v + 1; } } }
        else if (v > 0) { nv = v - 1; }
        if (tuRow == 1) { upE = nv; } else if (tuRow == 2) { upA = nv; } else if (tuRow == 3) { upB = nv; } else { upT = nv; }
        if (nv >= UPMAX) { unlock(18); }
    } else {
        suGet(tuRow);
        let v = Math.max(0 - 3, Math.min(3, oSu + d));
        if (tuRow == 5) { suF = v; }
        else if (tuRow == 6) { suW = v; }
        else if (tuRow == 7) { suG = v; }
        else if (tuRow == 8) { suB = v; }
        else if (tuRow == 9) { suD = v; }
        else if (tuRow == 10) { suP = v; }
        else { suS = v; }
    }
    levelFromXP();
    pDirty = 1;
}

function drawTune() {
    box(34, 116, 240, 0 - 106, C_PANEL);
    box(34, 116, 240, 113, C_RED);
    let r = 1;
    while (r <= TUROWS) {
        tuY(r);
        let y = oTuY;
        if (r == tuRow) { box(36, y + 6, 238, y - 6, '#2a3240'); }
        if (r <= 4) {
            let lvl = upE;
            if (r == 2) { lvl = upA; } else if (r == 3) { lvl = upB; } else if (r == 4) { lvl = upT; }
            let j = 1;
            while (j <= UPMAX) {
                let x0 = 140 + (j - 1) * 17;
                box(x0, y + 3, x0 + 14, y - 3, j <= lvl ? C_RED : C_PANEL2);
                j = j + 1;
            }
        } else {
            suGet(r);
            let v = oSu;
            box(140, y + 1, 224, y - 1, C_PANEL2);
            box(181, y + 4, 183, y - 4, '#5a6474');
            let x = 182 + v * 13;
            box(x - 3, y + 4, x + 3, y - 4, v == 0 ? '#dfe6f0' : C_GOLD);
        }
        r = r + 1;
    }
    box(0 - 250, 0 - 112, 250, 0 - 132, C_PANEL);
}

function hudTune() {
    tx(9, 'GARAGE', 42, 99, 18, C_WHITE, 1);
    tx(10, str('LEVEL ', pLv, '   ', pPts, ' UPGRADE POINTS'), 42, 80, 9, pPts > 0 ? C_GOLD : C_DIM, 1);
    let r = 1;
    while (r <= TUROWS) {
        tuY(r);
        let y = oTuY;
        let lab = BLANK;
        let val = BLANK;
        if (r <= 4) {
            lab = upName[r];
            let lvl = upE;
            if (r == 2) { lvl = upA; } else if (r == 3) { lvl = upB; } else if (r == 4) { lvl = upT; }
            val = str(lvl, '/', UPMAX);
        } else {
            lab = suName[r - 4];
            suGet(r);
            let v = oSu;
            val = v > 0 ? str('+', v) : str(v);
        }
        // v3.0: labels in slots 24..34, values 44..54
        tx(23 + r, lab, 44, y, 7, r == tuRow ? C_WHITE : '#c9d1de', 1);
        tx(43 + r, val, 118, y, 7, r == tuRow ? C_WHITE : C_DIM, 1);
        r = r + 1;
    }
    tuY(5);
    tx(55, 'SETUP  (FREE)', 44, oTuY + 10, 6, C_DIM, 1);
    // what the selected row does, and the car as it stands
    let info = BLANK;
    if (tuRow <= 4) { info = upInfo[tuRow]; }
    else { info = str(suLo[tuRow - 4], ' <  ', suInfo[tuRow - 4], '  > ', suHi[tuRow - 4]); }
    tx(56, info, 0, 0 - 98, 7, C_GOLD, 0);
    let top = ctTop[selCar] * (1 + 0.006 * upE) * (1 - 0.009 * suW - 0.003 * suF) * (1 - 0.015 * suG) * (1 + 0.002 * suP) * 3.6;
    let acc = (1 + 0.014 * upE) * (1 + 0.03 * suG);
    let grip = (1 + 0.008 * upT) * (1 + 0.01 * suS) * (1 - 0.01 * suP);
    let aero = (1 + 0.03 * upA) * (1 + 0.045 * suW + 0.02 * suF);
    let bal = 50 + Math.round((0.035 * suF - 0.02 * suW) * 100);
    tx(57, str('TOP ', Math.round(top), ' km/h  PULL ', Math.round(acc * 100), '%  GRIP ', Math.round(grip * 100), '%  DOWNFORCE ', Math.round(aero * 100), '% (', bal, '% FRONT)  BRAKES ', Math.round((1 + 0.04 * upB) * 100), '%'),
        0 - 238, 0 - 88, 7, C_WHITE, 1);
    tx(12, 'UP/DOWN choose   LEFT/RIGHT change   ENTER done', 0, 0 - 122, 9, '#c9d1de', 0);
}

// ---- v8 profile ---------------------------------------------------------------
// tabs: 1 profile, 2 records, 3 achievements, 4 ranking
let prTab = 1;
let prSel = 1;              // achievement selected
let prTrk = 1;              // ranking circuit
// v8 test button: only for the tester's nickname
const TESTNICK = '코딩재미있어';
let prMouse = 0;
let prKeyX = 0;
function testButton() {
    if (pNick == TESTNICK) {
        let hit = 0;
        let md = mouseDown() ? 1 : 0;
        if (md > 0) {
            if (prMouse < 1) {
                let mx = mouseX();
                let my = mouseY();
                if (mx > 110) { if (mx < 226) { if (my > 0 - 96) { if (my < 0 - 74) { hit = 1; } } } }
            }
        }
        prMouse = md;
        let kx = key(88) ? 1 : 0;
        if (kx > 0) { if (prKeyX < 1) { hit = 1; } }
        prKeyX = kx;
        if (hit > 0) {
            addXP(1000);
            setMsg('TEST: +1000 XP', 1.5);
        }
    }
}
function profKeys() {
    if (prTab == 1) { testButton(); }
    if (actKey == 37) { prTab = mod(prTab + 2, 4) + 1; }
    else if (actKey == 39) { prTab = mod(prTab, 4) + 1; }
    else if (actKey == 40) {
        if (prTab == 3) { prSel = mod(prSel, NACH) + 1; }
        if (prTab == 4) { prTrk = mod(prTrk, NTRK) + 1; }
    } else if (actKey == 38) {
        if (prTab == 3) { prSel = mod(prSel + NACH - 2, NACH) + 1; }
        if (prTab == 4) { prTrk = mod(prTrk + NTRK - 2, NTRK) + 1; }
    }
    else if (actKey == 13) { raceState = ST_MENU; }
    else if (actKey == 27) { raceState = ST_MENU; }
    // v11 backup code (savecode.js)
    else if (actKey == 67) { svCopy(); }
    else if (actKey == 86) { svLoad(); }
}

function drawProf() {
    box(0 - 236, 122, 236, 0 - 106, C_PANEL);
    let k = 1;
    while (k <= 4) {
        let x0 = 0 - 232 + (k - 1) * 116;
        box(x0, 118, x0 + 112, 102, k == prTab ? C_RED : C_PANEL2);
        k = k + 1;
    }
    if (prTab == 1) {
        if (pNick == TESTNICK) {
            box(110, 0 - 74, 226, 0 - 96, C_GOLD);
            box(112, 0 - 76, 224, 0 - 94, C_PANEL2);
        }
        fillOct(0 - 170, 50, 30, C_RED);
        fillOct(0 - 170, 50, 25, C_PANEL);
        box(0 - 120, 44, 220, 36, C_PANEL2);
        box(0 - 120, 44, 0 - 120 + 340 * pLvXP / pLvNeed, 36, C_GOLD);
    } else if (prTab == 3) {
        let i = 1;
        while (i <= NACH) {
            let col = idiv(i - 1, 10);
            let row = mod(i - 1, 10);
            let x0 = 0 - 228 + col * 232;
            let y = 88 - row * 15;
            if (i == prSel) { box(x0, y + 6, x0 + 226, y - 7, '#2a3240'); }
            fillOct(x0 + 8, y, 4, achGot[i] > 0 ? C_GOLD : '#3a4452');
            i = i + 1;
        }
    }
    box(0 - 250, 0 - 112, 250, 0 - 132, C_PANEL);
}

function hudProf() {
    let k = 1;
    while (k <= 4) { tx(50 + k, prTabN[k], 0 - 176 + (k - 1) * 116, 110, 9, k == prTab ? C_WHITE : C_DIM, 0); k = k + 1; }
    let i = 1;
    if (prTab == 1) {
        tx(24, str(pLv), 0 - 170, 50, 22, C_WHITE, 0);
        tx(25, pNick, 0 - 120, 74, 16, C_GOLD, 1);
        tx(26, str('LEVEL ', pLv, '    ', pXP, ' XP    ', pLvNeed - pLvXP, ' TO THE NEXT LEVEL'), 0 - 120, 56, 8, C_WHITE, 1);
        let sv = str('SAVED ONLINE  (SLOT ', pSh, ')');
        if (pSync == 2) { sv = str('SAVING  (SLOT ', pSh, ' - NO SERVER REPLY YET, KEPT IF OFFLINE)'); }
        if (pVerN > 0) { sv = str('SAVING AGAIN - SOMEONE ELSE SAVED AT THE SAME MOMENT (TRY ', pVerN, ')'); }
        if (pGuest > 0) { sv = 'GUEST - SIGN IN TO KEEP YOUR PROGRESS ONLINE'; }
        if (pLoaded < 1) { sv = 'LOADING YOUR SAVE...'; }
        tx(27, sv, 0 - 120, 24, 7, pGuest > 0 ? C_ACC : C_DIM, 1);
        tx(28, str('RACES  ', stRaces), 0 - 200, 0 - 4, 9, C_WHITE, 1);
        tx(29, str('WINS  ', stWins), 0 - 200, 0 - 20, 9, C_WHITE, 1);
        tx(30, str('PODIUMS  ', stPods), 0 - 200, 0 - 36, 9, C_WHITE, 1);
        tx(31, str('DISTANCE  ', Math.round(stKm), ' km'), 0 - 200, 0 - 52, 9, C_WHITE, 1);
        tx(32, str('ACHIEVEMENTS  ', achCount, ' / ', NACH), 20, 0 - 4, 9, C_WHITE, 1);
        let nc = 0;
        let b = 1;
        let t = 1;
        while (t <= NTRK) { nc = nc + mod(idiv(stCirc, b), 2); b = b * 2; t = t + 1; }
        tx(33, str('CIRCUITS DRIVEN  ', nc, ' / ', NTRK), 20, 0 - 20, 9, C_WHITE, 1);
        tx(34, str('UPGRADE POINTS  ', pPts), 20, 0 - 36, 9, C_WHITE, 1);
        tx(35, str('UPGRADES  ', upE + upA + upB + upT, ' / ', 4 * UPMAX), 20, 0 - 52, 9, C_WHITE, 1);
        tx(36, 'ONLINE SAVES WORK ON THE WORK\'S OWN PAGE - IN THE EDITOR ENTRY KEEPS THEM OFFLINE', 0 - 220, 0 - 68, 6, C_DIM, 1);
        // v11: a backup of the save the player keeps, for when the online save is lost
        tx(39, 'BACKUP CODE   C  COPY IT    V  LOAD IT', 0 - 220, 0 - 81, 8, C_WHITE, 1);
        tx(38, msg, 0 - 220, 0 - 96, 7, C_GOLD, 1);
        if (pNick == TESTNICK) {
            tx(37, 'TEST  +1000 XP  (X)', 168, 0 - 85, 8, C_GOLD, 0);
        }
    } else if (prTab == 2) {
        tx(24, 'CIRCUIT            MY BEST LAP     WORLD RECORD', 0 - 220, 88, 8, C_DIM, 1);
        while (i <= NTRK) {
            padR(trkName[i], 19);
            let nm = oPad;
            fmtTime(recLap[i] > 0 ? recLap[i] : 0 - 1);
            padR(oTime, 16);
            let mb = oPad;
            let wr = '-';
            if (recWR[i] > 0) { fmtTime(recWR[i]); wr = str(oTime, '  ', recNm[i]); }
            tx(24 + i, str(nm, mb, wr), 0 - 220, 72 - (i - 1) * 16, 8, C_WHITE, 1);
            i = i + 1;
        }
        fmtTime(recRace[selTrk] > 0 ? recRace[selTrk] : 0 - 1);
        tx(33, str('BEST RACE ON ', trkName[selTrk], ':  ', oTime), 0 - 220, 0 - 64, 8, C_DIM, 1);
    } else if (prTab == 3) {
        while (i <= NACH) {
            let col = idiv(i - 1, 10);
            let row = mod(i - 1, 10);
            tx(23 + i, achName[i], 0 - 214 + col * 232, 88 - row * 15, 8, achGot[i] > 0 ? C_WHITE : '#6a7486', 1);
            i = i + 1;
        }
        tx(44, str(achName[prSel], ':  ', achDesc[prSel], achGot[prSel] > 0 ? '   (DONE)' : BLANK), 0, 0 - 76, 8, C_GOLD, 0);
    } else {
        rankParse(prTrk);
        tx(24, str('< ', trkName[prTrk], ' >   TOP ', NRANK, ' LAPS'), 0, 88, 11, C_GOLD, 0);
        while (i <= NRANK) {
            let s = BLANK;
            if (i <= rkC) {
                padR(str(i, '.'), 4);
                let a = oPad;
                padR(rkN[i], 18);
                fmtTime(rkT[i]);
                s = str(a, oPad, oTime);
            }
            tx(24 + i, s, 0 - 120, 68 - (i - 1) * 14, 9, i == rkMe ? C_GOLD : C_WHITE, 1);
            i = i + 1;
        }
        let me = 'NOT IN THE TOP 10 YET';
        if (rkMe > 0) { me = str('YOU ARE P', rkMe); }
        if (pGuest > 0) { me = 'SIGN IN TO ENTER THE RANKING'; }
        if (rkC < 1) { me = str(me, '   (NO TIMES YET)'); }
        tx(35, me, 0, 0 - 88, 8, C_DIM, 0);
    }
    tx(12, 'LEFT/RIGHT tab   UP/DOWN scroll   C/V backup code   ENTER back', 0, 0 - 122, 9, '#c9d1de', 0);
}

// ---- v8 pop-up: achievements and level-ups ---------------------------------------
function drawPopup() {
    if (popT > 0) {
        let a = Math.min(1, popT * 3, (3.2 - popT) * 4);
        let y = 130 - 26 * a;
        box(0 - 150, y + 2, 150, y - 26, C_GOLD);
        box(0 - 148, y, 148, y - 24, C_PANEL);
    }
}

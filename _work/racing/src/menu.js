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

function rowY(i) { oRowY = 74 - (i - 1) * 15.2; }
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
    // title
    skewBar(0 - 250, 0 - 44, 112, 14, 4, C_PANEL);
    skewBar(0 - 250, 0 - 90, 92, 5.5, 2, C_RED);
    // the list
    let i = 1;
    while (i <= NMENU) {
        rowY(i);
        if (i == menuSel) {
            skewBar(0 - 250, 0 - 40 + 12 * menuSlide, oRowY, 6.6, 3, C_RED);
            skewBar(0 - 250, 0 - 236, oRowY, 6.6, 3, '#ffffff');
        } else {
            skewBar(0 - 250, 0 - 44, oRowY, 6.6, 3, C_PANEL);
        }
        i = i + 1;
    }
    // preview card
    box(cardX0, 96, cardX1, 0 - 92, C_PANEL);
    box(cardX0, 96, cardX1, 94, C_RED);
    box(0 - 250, 0 - 104, 250, 0 - 132, C_PANEL);
    let m = menuSel;
    if (m == 1) {
        drawMap3D(121, 50, 34);
    } else if (m == 2) {
        choiceBoxes(3, gMode);
    } else if (m == 3) {
        let k = 1;
        while (k <= 2) {
            let x0 = cardX0 + 10 + (k - 1) * 112;
            box(x0, 64, x0 + 102, 42, k == rules ? C_RED : C_PANEL2);
            k = k + 1;
        }
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
        drawMap3D(121, 26, 62);
    } else if (m == 6) {
        let k = 1;
        while (k <= NDIFF) {
            let x0 = cardX0 + 12 + (k - 1) * 43;
            box(x0, 76, x0 + 38, 70, k <= aiDiff ? C_RED : C_PANEL2);
            k = k + 1;
        }
    } else if (m == 7) {
        let k = 1;
        while (k <= NLAPO) {
            let x0 = cardX0 + 12 + (k - 1) * 54;
            box(x0, 26, x0 + 48, 22, k == lapSel ? C_RED : C_PANEL2);
            k = k + 1;
        }
    } else if (m == 8) {
        drawWxIcon(121, 46);
    } else if (m == 9) {
        choiceBoxes(3, gfx);
    } else if (m == 10) {
        choiceBoxes(2, sndSel);
        // a little level meter that moves when the sound is on
        let k = 0;
        while (k < 16) {
            let h = 3;
            if (sndSel > 1) { h = 4 + 14 * Math.abs(sind(gt * 260 + k * 37)) * Math.abs(sind(gt * 90 + k * 11)); }
            box(cardX0 + 60 + k * 7, 2, cardX0 + 64 + k * 7, 2 + h, sndSel > 1 ? '#3dff6e' : '#2a3240');
            k = k + 1;
        }
    } else if (m == 11) {
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
// v7 slots: menu labels 24..34, values 35..45; cards 50 (title), 51..71
// (cardRow r: label 51+r, value 61+r), 72..75 extras.
function hudMenu() {
    tx(9, 'ENTRY RACING 3D', 0 - 232, 114, 21, C_WHITE, 1);
    tx(10, 'F1 EDITION  /  v7', 0 - 232, 94, 8, C_WHITE, 1);
    let i = 1;
    while (i <= NMENU) {
        rowY(i);
        let sel = i == menuSel ? 1 : 0;
        let lab = BLANK;
        let val = BLANK;
        if (i == 1) {
            lab = 'RACE START';
            if (gMode == M_CH) { lab = 'START CHAMPIONSHIP'; } else if (gMode == M_TT) { lab = 'START TIME TRIAL'; }
        } else if (i == 2) { lab = 'MODE'; val = modeName[gMode]; }
        else if (i == 3) { lab = 'RULES'; val = ruleName[rules]; }
        else if (i == 4) { lab = 'CAR'; val = ctName[selCar]; }
        else if (i == 5) { lab = 'CIRCUIT'; val = gMode == M_CH ? 'ALL 8' : trkName[selTrk]; }
        else if (i == 6) { lab = 'AI LEVEL'; val = gMode == M_TT ? 'NONE' : aiName[aiDiff]; }
        else if (i == 7) { lab = 'LAPS'; val = gMode == M_TT ? 'FREE' : str(lapOpt[lapSel]); }
        else if (i == 8) { lab = 'WEATHER'; val = wxName[wx]; }
        else if (i == 9) { lab = 'GRAPHICS'; val = gfxName[gfx]; }
        else if (i == 10) { lab = 'SOUND'; val = sndName[sndSel]; }
        else { lab = 'TRACK EDITOR'; }
        let x = 0 - 226 + (sel > 0 ? 4 * menuSlide : 0);
        tx(23 + i, lab, x, oRowY, 9, sel > 0 ? C_WHITE : '#c9d1de', 1);
        if (sel > 0) { if (val != BLANK) { if (i > 1) { val = str('< ', val, ' >'); } } }
        tx(34 + i, val, 0 - 134 + (sel > 0 ? 4 * menuSlide : 0), oRowY, 8, sel > 0 ? C_WHITE : C_DIM, 1);
        i = i + 1;
    }
    tx(12, 'UP/DOWN select   LEFT/RIGHT change   ENTER confirm', 0, 0 - 111, 9, '#c9d1de', 0);
    if (rules == R_SIM) { tx(11, 'IN RACE:  W/S  A/D   E DRS   SHIFT/Q ERS BOOST   T PIT TYRE   C camera   P pause', 0, 0 - 123, 7, C_DIM, 0); }
    else { tx(11, 'IN RACE:  W/S throttle-brake   A/D steer   E DRS   C camera   L line   P pause', 0, 0 - 123, 8, C_DIM, 0); }
    hudCard();
}

// a line of card text in slot i
function cardTx(i, s, y, sz, col) { tx(i, s, cardX0 + 10, y, sz, col, 1); }

function hudCard() {
    let m = menuSel;
    if (m == 1) {
        tx(50, 'READY TO RACE', cardX0 + 10, 84, 11, C_WHITE, 1);
        let y0 = 4;
        cardRow(1, 'MODE', str(modeName[gMode], '  /  ', ruleName[rules]), y0);
        cardRow(2, 'CIRCUIT', gMode == M_CH ? str('ALL ', NTRK, ' ROUNDS') : trkName[selTrk], y0 - 13);
        cardRow(3, 'CAR', ctName[selCar], y0 - 26);
        cardRow(4, 'LAPS', gMode == M_TT ? 'UNLIMITED' : str(lapOpt[lapSel]), y0 - 39);
        cardRow(5, 'OPPONENTS', gMode == M_TT ? 'NONE  (GHOST)' : str(NCAR - 1, '  /  ', aiName[aiDiff]), y0 - 52);
        cardRow(6, 'WEATHER', wxName[wx], y0 - 65);
        let q = BLANK;
        if (rules == R_SIM) { if (gMode != M_TT) { q = 'QUALIFYING FIRST'; } }
        tx(72, q, cardX1 - 10, 84, 8, C_GOLD, 2);
        tx(73, mod(Math.floor(gt * 2), 2) < 1 ? 'PRESS ENTER' : BLANK, 121, 0 - 84, 10, C_GOLD, 0);
    } else if (m == 2) {
        tx(50, 'GAME MODE', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, 'GP', cardX0 + 44, 53, 10, gMode == 1 ? C_WHITE : C_DIM, 0);
        tx(73, 'CHAMP', cardX0 + 118, 53, 10, gMode == 2 ? C_WHITE : C_DIM, 0);
        tx(74, 'TRIAL', cardX0 + 192, 53, 10, gMode == 3 ? C_WHITE : C_DIM, 0);
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
        tx(50, trkName[selTrk], cardX0 + 10, 84, 11, C_WHITE, 1);
        fmtTime(recLap[selTrk] > 0 ? recLap[selTrk] : 0 - 1);
        cardRow(1, 'LENGTH', str(Math.round(trkLen / 10) / 100, ' km'), 0 - 50);
        cardRow(2, 'TURNS', str(trkTurns[selTrk], '     DRS ZONES  ', drsN), 0 - 63);
        cardRow(3, 'BEST LAP', oTime, 0 - 76);
    } else if (m == 6) {
        tx(50, 'OPPONENTS', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, str(aiName[aiDiff], '   ENGINE ', Math.round(aiPow[aiDiff] * 100), '%   RACECRAFT ', Math.round(aiSkl[aiDiff] * 100), '%'), cardX0 + 10, 58, 8, C_GOLD, 1);
        tx(73, aiD[aiDiff], cardX0 + 10, 44, 7, C_DIM, 1);
        tx(74, 'THE RIVALS', cardX0 + 10, 28, 8, C_WHITE, 1);
        let k = 1;
        while (k <= 7) {
            cardRow(k, drvName[k + 1], drvTag[k + 1], 14 - (k - 1) * 12);
            k = k + 1;
        }
        if (gMode == M_TT) { tx(75, 'NOT USED IN TIME TRIAL', cardX1 - 10, 84, 8, C_ACC, 2); } else { txOff(75); }
    } else if (m == 7) {
        tx(50, 'RACE LENGTH', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, gMode == M_TT ? 'FREE' : str(lapOpt[lapSel]), 121, 54, 34, C_WHITE, 0);
        tx(52, '1', cardX0 + 36, 12, 9, lapSel == 1 ? C_WHITE : C_DIM, 0);
        tx(53, '3', cardX0 + 90, 12, 9, lapSel == 2 ? C_WHITE : C_DIM, 0);
        tx(54, '5', cardX0 + 144, 12, 9, lapSel == 3 ? C_WHITE : C_DIM, 0);
        tx(55, '10', cardX0 + 198, 12, 9, lapSel == 4 ? C_WHITE : C_DIM, 0);
        cardRow(5, 'DISTANCE', str(Math.round(trkLen * lapOpt[lapSel] / 100) / 10, ' km'), 0 - 20);
        cardRow(6, 'ABOUT', str(Math.round(trkLen * lapOpt[lapSel] / 55 / 60 * 10) / 10, ' min'), 0 - 33);
    } else if (m == 8) {
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
        if (rules == R_ARC) { tx(58 + 13, 'CHANGING WEATHER: REALISTIC RULES ONLY', cardX0 + 10, 0 - 76, 7, C_DIM, 1); } else { txOff(71); }
    } else if (m == 9) {
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
    } else if (m == 10) {
        tx(50, 'SOUND', cardX0 + 10, 84, 11, C_WHITE, 1);
        tx(72, 'OFF', cardX0 + 61, 53, 10, sndSel == 1 ? C_WHITE : C_DIM, 0);
        tx(73, 'ON', cardX0 + 173, 53, 10, sndSel == 2 ? C_WHITE : C_DIM, 0);
        cardTx(52, 'ENGINE SOUND', 0 - 18, 12, C_GOLD);
        cardTx(53, 'A V6 TURBO HYBRID THAT FOLLOWS YOUR REVS', 0 - 36, 7, C_WHITE);
        cardTx(54, 'LOUDER ON THE THROTTLE, ALSO IN REPLAYS', 0 - 48, 7, C_DIM);
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
    if (on > 0) {
        penAlpha(30);
        box(96, 72, 238, 0 - 20, '#0d1117');
        penAlpha(0);
        // tyre wear bar in the compound's colour
        let t = caTy[1];
        box(170, 62, 232, 58, '#232b37');
        box(170, 62, 170 + 62 * caWear[1], 58, tyHex[t]);
        // ERS store, green (blue while deploying)
        box(170, 48, 232, 44, '#232b37');
        box(170, 48, 170 + 62 * caErs[1], 44, caErsOn[1] > 0 ? '#3aa0ff' : '#3dff6e');
        // front wing: grey when fine, orange to red with damage
        if (caDmg[1] > 0.02) {
            let dc = '#ffb13a';
            if (caWing[1] > 0) { dc = '#ff3b30'; }
            box(170, 34, 170 + 62 * caDmg[1], 30, dc);
        }
        // flag panel across the top
        let fc = BLANK;
        if (scOn > 0) { fc = '#ff8a00'; }
        else if (yelHere > 0) { fc = '#ffd21f'; }
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

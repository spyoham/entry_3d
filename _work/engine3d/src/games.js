// ============================================================
// games.js - what ships inside the project: a menu and four little games
// written with nothing but the engine's own blocks. Delete this object's
// script and your own game goes in its place.
// ============================================================
let scene = 0;                 // 0 menu, 1 platformer, 2 shooter, 3 racer, 4 editor
let menuSel = 1;
let player = 0;
let score = 0;
let health = 100;
let banner = 0;
let msgT = 0;
let msg = '​';

// key edges
let kUp = 0; let kDn = 0; let kEnter = 0; let kEsc = 0; let kC = 0;
let kF = 0; let kR = 0; let kQ = 0; let kE = 0; let kS = 0; let kL = 0;
let kOne = 0;

// platformer
let plat = 0; let door = 0; let hat = 0; let enemy = 0;
let starsLeft = 0;
let camMode = 0;

// shooter
let ammo = 0; let wave = 0;
let enemyList = [];
let nEnemy = 0;

// racer
let car = 0; let carSpd = 0; let carYaw = 0;
let lap = 0; let cpNext = 1; let lapT = 0; let bestT = 0; let cpShown = 0;
let cpList = [];

// editor
let edCol = 1; let edFly = 0;
let saveList = [];
let edPal = [];

// ============================================================
// menu
// ============================================================
function hudMenuLayout() {
    hudPlace(1, 0, 78, '#ffffff');
    hudPlace(2, 0, 46, '#cfe0f5');
    hudPlace(3, 0, 6, '#ffffff');
    hudPlace(4, 0, -20, '#ffffff');
    hudPlace(5, 0, -46, '#ffffff');
    hudPlace(6, 0, -72, '#ffffff');
    hudPlace(7, 0, -118, '#dbe4f2');
    hudPlace(8, 0, -96, '#ffd24a');
}

function hudGameLayout() {
    hudPlace(1, 0, 46, '#ffffff');
    hudPlace(2, 0, 12, '#e8eef8');
    hudPlace(3, -228, 118, '#ffffff');
    hudPlace(4, -228, 98, '#ffe27a');
    hudPlace(5, -228, 78, '#a8e6ff');
    hudPlace(6, 228, 118, '#ffffff');
    hudPlace(7, 0, -124, '#dbe4f2');
    hudPlace(8, 0, -84, '#ffd24a');
}

function buildMenu() {
    worldClear();
    hudMenuLayout();
    scene = 0;
    setSky('#1d54b4', '#cfe3f5', '#6f9c55');
    setLight(-0.4, 0.85, -0.35, 0.6, 0.45);
    setViewFar(90);
    setShadows(1, 0);
    makeGround(70, '잔디');
    makeBox(-6, 1.5, 4, 3, 3, 3, '빨강');
    makeBall(0, 1.5, 6, 3, '하늘');
    makeCone(6, 1.5, 4, 3, 3, '금색');
    makeTree(-11, 2.5, 0, 5, '초록');
    makeTree(11, 2.5, 0, 5, '초록');
    makePerson(0, 1, 0, 2, '파랑');
    tweenTurn(newId, 0, 360, 0, 8, 0);
    camY = 5;
}

function menuStep() {
    let a = gt * 12;
    camSetPos(sind(a) * 16, 6 + sind(gt * 20) * 1.5, cosd(a) * 16);
    camLookAt(0, 2, 2);
    if (key(38)) { if (kUp == 0) { kUp = 1; menuSel = menuSel - 1; } } else { kUp = 0; }
    if (key(40)) { if (kDn == 0) { kDn = 1; menuSel = menuSel + 1; } } else { kDn = 0; }
    if (menuSel < 1) { menuSel = 4; }
    if (menuSel > 4) { menuSel = 1; }
    if (key(13)) {
        if (kEnter == 0) {
            kEnter = 1;
            if (menuSel == 1) { buildPlat(); }
            else if (menuSel == 2) { buildShoot(); }
            else if (menuSel == 3) { buildRace(); }
            else { buildEdit(); }
        }
    } else { kEnter = 0; }
}

function menuHud() {
    hudWrite(1, '3D 엔진 v5');
    hudWrite(2, '엔트리 블록으로 만드는 3D');
    let m1 = '   1. 별 모으기 (플랫포머)';
    let m2 = '   2. 사격 게임 (1인칭)';
    let m3 = '   3. 레이싱';
    let m4 = '   4. 블록 만들기 (에디터)';
    if (menuSel == 1) { m1 = '▶ 1. 별 모으기 (플랫포머)'; }
    if (menuSel == 2) { m2 = '▶ 2. 사격 게임 (1인칭)'; }
    if (menuSel == 3) { m3 = '▶ 3. 레이싱'; }
    if (menuSel == 4) { m4 = '▶ 4. 블록 만들기 (에디터)'; }
    hudWrite(3, m1);
    hudWrite(4, m2);
    hudWrite(5, m3);
    hudWrite(6, m4);
    hudWrite(7, '↑ ↓ 고르기   ENTER 시작   게임 중 ESC 로 메뉴');
    hudWrite(8, BLANK);
}

// ============================================================
// 1. platformer - built from a text map
// ============================================================
function platMap() {
    while (mapList.length > 0) { mapList.removeAt(1); }
    mapList.push('###############');
    mapList.push('#S...#....*...#');
    mapList.push('#....#..###...#');
    mapList.push('#.T..=....#.*.#');
    mapList.push('#....#....#...#');
    mapList.push('#..*.#.WW.#.T.#');
    mapList.push('#....#.WW.#...#');
    mapList.push('#.####....###.#');
    mapList.push('#....#..*.....#');
    mapList.push('#.*..#....#.G.#');
    mapList.push('###############');
}

function buildPlat() {
    worldClear();
    hudGameLayout();
    scene = 1;
    setSky('#2060c8', '#c8dff2', '#6f9c55');
    setLight(-0.45, 0.82, -0.36, 0.62, 0.44);
    setViewFar(95);
    setGravity(24);
    setShadows(1, 0);
    setStepHeight(0.6);
    platMap();
    mapBuild(5, 5, '벽돌', '잔디');
    // a ramp up to a lookout, a lift that turns, and a door that slides open
    makeRamp(0, 1.5, -6, 5, 3, 6, 0, '흙');
    setBody(newId, 2);
    makeBox(0, 3.2, 0, 6, 0.6, 6, '나무');
    setBody(newId, 2);
    makeBox(14, 1, 10, 5, 0.5, 5, '금색');
    plat = newId;
    setBody(plat, 4);
    makeBox(-14, 2.5, -12, 5, 5, 1, '남색');
    door = newId;
    setBody(door, 2);
    // the player, with a hat attached to show parent/child
    makePerson(mapStartX, 2, mapStartZ, 1.8, '파랑');
    player = newId;
    setBody(player, 1);
    setBounce(player, 0, 1.6);
    setMass(player, 3);
    setTag(player, '나');
    makeCone(0, 0, 0, 1.1, 0.7, '빨강');
    hat = newId;
    attachTo(hat, player, 0, 1.05, 0, 0);
    // an enemy that chases you
    makeBall(10, 1.2, -10, 2.2, '자주');
    enemy = newId;
    setBody(enemy, 1);
    setMass(enemy, 2);
    setTag(enemy, '적');
    starsLeft = 0;
    let i = 1;
    while (i <= nObj) {
        if (oTag[i] == '별') { starsLeft = starsLeft + 1; }
        i = i + 1;
    }
    score = 0;
    camMode = 0;
    banner = 4;
    timerSet(1, 120);
    camSetAngle(0, -12);
}

function platStep() {
    if (key(67)) { if (kC == 0) { kC = 1; camMode = 1 - camMode; } } else { kC = 0; }
    mouseLook(1);
    keyLook(1.8);
    keyControl(player, 7.5, 1.9);
    // the lift rises and turns; the door opens when half the stars are in
    oY[plat] = 3.5 + sind(gt * 50) * 2.5;
    oRY[plat] = oRY[plat] + 18 * dt;
    moveToward(enemy, player, 3.4);
    physStep();
    // stars are sensors carrying the 별 name tag
    touchTag(player, '별');
    if (touch == 1) {
        setVisible(touchObj, 0);
        setBody(touchObj, 0);
        setTag(touchObj, BLANK);
        score = score + 10;
        starsLeft = starsLeft - 1;
        camShake(0.35);
        if (starsLeft == 2) {
            tweenMove(door, oX[door], -2.4, oZ[door], 1.5, 1);
            msg = '문이 열렸다!';
            msgT = 3;
        }
    }
    touchTag(player, '적');
    if (touch == 1) {
        setPos(player, mapStartX, 3, mapStartZ);
        setVel(player, 0, 0, 0);
        score = score - 5;
        camShake(1);
        msg = '잡혔다!';
        msgT = 2;
    }
    touchTag(player, '골');
    if (touch == 1) { banner = 5; }
    if (oY[player] < -10) {
        setPos(player, mapStartX, 3, mapStartZ);
        setVel(player, 0, 0, 0);
    }
    if (camMode == 1) {
        setVisible(player, 0);
        setVisible(hat, 0);
        camFirst(player, 0.62);
    } else {
        setVisible(player, 1);
        setVisible(hat, 1);
        camThird(player, 7, 2.6, 0.68);
    }
}

function platHud() {
    hudWrite(3, str('점수  ', score));
    hudWrite(4, str('남은 별  ', starsLeft));
    hudWrite(5, str('시간  ', Math.round(timerV[1])));
    hudWrite(6, str(Math.round(fps), ' fps'));
    if (camMode == 1) { hudCross(9, '#ffffff'); }
    hudWrite(7, 'WASD 이동  SPACE 점프  C 시점  ESC 메뉴');
    if (banner > 0) {
        banner = banner - dt;
        if (starsLeft <= 0) { hudWrite(1, '별을 다 모았다!'); } else { hudWrite(1, '별 모으기'); }
        hudWrite(2, '별을 모으고 초록 원판(골)으로 가세요');
    } else {
        hudWrite(1, BLANK);
        hudWrite(2, BLANK);
    }
}

// ============================================================
// 2. shooter - terrain, scattered scenery, chasing enemies
// ============================================================
function buildShoot() {
    worldClear();
    hudGameLayout();
    scene = 2;
    setSky('#123a7a', '#a9c4de', '#7a7a5e');
    setLight(-0.5, 0.75, -0.4, 0.6, 0.42);
    setViewFar(95);
    setGravity(24);
    setShadows(1, 0);
    setShadowFar(40);
    terrainMake(160, 32, 9, 0.7, 11);
    scatter(26, 0, 150, 12);
    terrainHeight(0, 0);
    makePerson(0, heightRes + 1.2, 0, 1.8, '연두');
    player = newId;
    setBody(player, 1);
    setCapsuleShape(player, 1);
    setBounce(player, 0, 1.6);
    setMass(player, 3);
    setTag(player, '나');
    while (enemyList.length > 0) { enemyList.removeAt(1); }
    nEnemy = 0;
    wave = 1;
    score = 0;
    health = 100;
    ammo = 24;
    spawnWave();
    banner = 4;
    camSetAngle(0, 0);
    camMode = 1;
}

function spawnWave() {
    let i = 0;
    while (i < 3 + wave) {
        let a = i * 47 + wave * 13;
        let r = 40 + mod(i * 7, 25);
        let x = sind(a) * r;
        let z = cosd(a) * r;
        terrainHeight(x, z);
        makePerson(x, heightRes + 1.2, z, 1.9, '자주');
        setBody(newId, 1);
        setCapsuleShape(newId, 1);
        setMass(newId, 2);
        setBounce(newId, 0, 1.4);
        setTag(newId, '적');
        enemyList.push(newId);
        nEnemy = nEnemy + 1;
        i = i + 1;
    }
}

function shootStep() {
    mouseLook(1);
    keyLook(1.8);
    keyControl(player, 8, 1.7);
    // enemies walk at you
    let i = 1;
    while (i <= enemyList.length) {
        let e = enemyList[i];
        if (oVis[e] == 1) { moveToward(e, player, 2.6 + wave * 0.2); }
        i = i + 1;
    }
    physStep();
    camFirst(player, 0.62);
    setVisible(player, 0);
    // shoot along the crosshair
    if (key(70)) {
        if (kF == 0) {
            kF = 1;
            if (ammo > 0) {
                ammo = ammo - 1;
                let fx = sind(camYaw) * cosd(camPitch);
                let fy = sind(camPitch);
                let fz = cosd(camYaw) * cosd(camPitch);
                rayCast(camX, camY, camZ, fx, fy, fz, 90, player);
                camShake(0.5);
                if (rayHit == 1) {
                    if (oTag[rayObj] == '적') {
                        setVisible(rayObj, 0);
                        setBody(rayObj, 0);
                        setTag(rayObj, BLANK);
                        nEnemy = nEnemy - 1;
                        score = score + 20;
                        msg = '명중!';
                        msgT = 1;
                    }
                }
            } else { msg = '탄약 없음 - R 로 재장전'; msgT = 1.5; }
        }
    } else { kF = 0; }
    if (key(82)) { if (kR == 0) { kR = 1; ammo = 24; msg = '재장전'; msgT = 1; } } else { kR = 0; }
    touchTag(player, '적');
    if (touch == 1) {
        if (timerV[2] <= 0) {
            health = health - 12;
            timerSet(2, 0.8);
            camShake(1.2);
        }
    }
    if (health <= 0) { banner = 5; }
    if (nEnemy <= 0) {
        wave = wave + 1;
        health = health + 20;
        if (health > 100) { health = 100; }
        ammo = ammo + 14;
        spawnWave();
        msg = str(wave, '번째 무리!');
        msgT = 2;
    }
    terrainHeight(oX[player], oZ[player]);
    if (oY[player] < heightRes - 6) {
        setPos(player, 0, heightRes + 2, 0);
        setVel(player, 0, 0, 0);
    }
}

function shootHud() {
    hudWrite(3, str('점수  ', score));
    hudWrite(4, str('탄약  ', ammo));
    hudWrite(5, str('적  ', nEnemy, '   ', wave, '무리'));
    hudWrite(6, str(Math.round(fps), ' fps'));
    hudBar(0, -104, 180, 12, health / 100, '빨강', '#22262e');
    hudCross(10, '#ffffff');
    hudWrite(7, 'WASD 이동  F 발사  R 재장전  마우스드래그 조준  ESC 메뉴');
    if (banner > 0) {
        banner = banner - dt;
        if (health <= 0) { hudWrite(1, '쓰러졌다'); hudWrite(2, 'ESC 로 메뉴'); }
        else { hudWrite(1, '사격 게임'); hudWrite(2, '적이 다가옵니다. F 로 쏘세요'); }
    } else { hudWrite(1, BLANK); hudWrite(2, BLANK); }
}

// ============================================================
// 3. racer - a ring of checkpoints on an open field
// ============================================================
function buildRace() {
    worldClear();
    hudGameLayout();
    scene = 3;
    setSky('#2a63c8', '#d3e6f6', '#8a8f6a');
    setLight(-0.35, 0.88, -0.3, 0.6, 0.46);
    setViewFar(120);
    setGravity(26);
    setShadows(1, 0);
    makeGround(170, '흙');
    setWorldBounds(82, 40);
    scatter(30, 1, 200, 60);
    while (cpList.length > 0) { cpList.removeAt(1); }
    let i = 0;
    while (i < 8) {
        let a = i * 45;
        let r = 60;
        let x = sind(a) * r;
        let z = cosd(a) * r;
        // a flat marker on the ground, so driving through it never blocks the view
        makeDisc(x, 0.08, z, 11, '금색');
        setUnlit(newId, 1);
        setLayer(newId, -1);
        setShadow(newId, 0);
        setBody(newId, 3);
        setCollider(newId, 5.5, 3, 5.5);
        setTag(newId, '체크');
        cpList.push(newId);
        // a pair of posts so the gate is easy to see
        makeBox(x + cosd(a) * 6, 2, z - sind(a) * 6, 1, 4, 1, '빨강');
        setBody(newId, 2);
        makeBox(x - cosd(a) * 6, 2, z + sind(a) * 6, 1, 4, 1, '하양');
        setBody(newId, 2);
        i = i + 1;
    }
    makeBox(-9, 0.8, 59, 4, 1.4, 2.4, '빨강');
    car = newId;
    setBody(car, 1);
    setMass(car, 4);
    setBounce(car, 0.2, 0.9);
    setTag(car, '차');
    makeBox(0, 0, 0, 3, 1, 2.2, '남색');
    attachTo(newId, car, 0, 1.1, -0.2, 0);
    carSpd = 0;
    carYaw = 200;
    lap = 0; cpNext = 1; lapT = 0; bestT = 0; cpShown = 0;
    banner = 4;
}

function raceStep() {
    let acc = 0;
    if (inFwd > 0) { acc = 26; }
    if (inFwd < 0) { acc = -22; }
    carSpd = carSpd + acc * dt;
    carSpd = carSpd - carSpd * 0.55 * dt;
    if (carSpd > 27) { carSpd = 27; }
    if (carSpd < -14) { carSpd = -14; }
    let grip = Math.abs(carSpd) / 12;
    if (grip > 1) { grip = 1; }
    if (carSpd < 0) { grip = 0 - grip; }
    carYaw = carYaw + inSide * 110 * dt * grip;
    driveBody(car, carSpd, carYaw);
    physStep();
    lapT = lapT + dt;
    // checkpoints have to be passed in order
    let cp = cpList[cpNext];
    touchTag(car, '체크');
    if (touch == 1) {
        if (touchObj == cp) {
            cpNext = cpNext + 1;
            if (cpNext > cpList.length) {
                cpNext = 1;
                lap = lap + 1;
                if (bestT == 0) { bestT = lapT; }
                else if (lapT < bestT) { bestT = lapT; }
                msg = str('랩 ', lap, '  ', Math.round(lapT * 10) / 10, '초');
                msgT = 3;
                lapT = 0;
            }
        }
    }
    // the gate you have to reach next glows
    if (cpShown != cpNext) {
        if (cpShown >= 1) { setColor(cpList[cpShown], '금색'); }
        setColor(cpList[cpNext], '연두');
        cpShown = cpNext;
    }
    camOrbit(car, 15, 5.5, carYaw + 180);
    camTurn(0, -6);
}

function raceHud() {
    hudWrite(3, str('랩  ', lap));
    hudWrite(4, str('시간  ', Math.round(lapT * 10) / 10));
    let bt = '기록 없음';
    if (bestT > 0) { bt = str(Math.round(bestT * 10) / 10, '초'); }
    hudWrite(5, str('최고  ', bt));
    hudWrite(6, str(Math.round(Math.abs(carSpd) * 3.6), ' km/h'));
    hudWrite(7, 'W 가속  S 브레이크  A D 조향  ESC 메뉴');
    if (banner > 0) {
        banner = banner - dt;
        hudWrite(1, '레이싱');
        hudWrite(2, '연두색 문을 순서대로 통과하세요');
    } else { hudWrite(1, BLANK); hudWrite(2, BLANK); }
}

// ============================================================
// 4. block editor - build with voxels, save and load
// ============================================================
function buildEdit() {
    worldClear();
    hudGameLayout();
    scene = 4;
    setSky('#2f6fd0', '#d8e8f6', '#7a9c5a');
    setLight(-0.4, 0.86, -0.34, 0.6, 0.46);
    setViewFar(100);
    setShadows(0, 0);
    setBlockSize(2);
    makeGround(120, '잔디');
    blockFloor(4, 4, 0, '흙');
    edCol = 1;
    while (edPal.length > 0) { edPal.removeAt(1); }
    edPal.push('벽돌');
    edPal.push('잔디');
    edPal.push('하늘');
    edPal.push('금색');
    edPal.push('하양');
    edPal.push('검정');
    camSetPos(0, 10, -18);
    camSetAngle(0, -18);
    banner = 5;
}

function editStep() {
    mouseLook(1);
    keyLook(1.8);
    // free flight: the camera is the tool
    let sp = 22 * dt;
    let fx = sind(camYaw) * cosd(camPitch);
    let fy = sind(camPitch);
    let fz = cosd(camYaw) * cosd(camPitch);
    camSetPos(camX + fx * inFwd * sp + cosd(camYaw) * inSide * sp,
        camY + fy * inFwd * sp,
        camZ + fz * inFwd * sp - sind(camYaw) * inSide * sp);
    if (key(81)) { camSetPos(camX, camY - sp, camZ); }
    if (key(69)) { camSetPos(camX, camY + sp, camZ); }
    if (camY < 1) { camSetPos(camX, 1, camZ); }
    rayCast(camX, camY, camZ, fx, fy, fz, 60, 0);
    if (key(70)) {
        if (kF == 0) {
            kF = 1;
            if (rayHit == 1) {
                // step back along the ray so the new block sits in front
                blockCellOf(rayX - fx * blkSize * 0.5, rayY - fy * blkSize * 0.5, rayZ - fz * blkSize * 0.5);
                blockPut(cellX, cellY, cellZ, edPal[edCol]);
            }
        }
    } else { kF = 0; }
    if (key(82)) {
        if (kR == 0) {
            kR = 1;
            if (rayHit == 1) {
                if (oTag[rayObj] == '블록') {
                    blockCellOf(oX[rayObj], oY[rayObj], oZ[rayObj]);
                    blockDig(cellX, cellY, cellZ);
                }
            }
        }
    } else { kR = 0; }
    if (key(49)) { if (kOne == 0) { kOne = 1; edCol = edCol + 1; if (edCol > edPal.length) { edCol = 1; } } } else { kOne = 0; }
    if (key(83)) { if (kS == 0) { kS = 1; editSave(); } } else { kS = 0; }
    if (key(76)) { if (kL == 0) { kL = 1; editLoad(); } } else { kL = 0; }
    // O switches to the flat (orthographic) view, B shows the collision boxes
    if (key(79)) {
        if (kQ == 0) {
            kQ = 1;
            if (orthoOn == 1) { camSetProjection(0, 0); msg = '원근 보기'; }
            else { camSetProjection(1, 46); msg = '직교(쿼터뷰) 보기'; }
            msgT = 2;
        }
    } else { kQ = 0; }
    if (key(66)) {
        if (kE == 0) {
            kE = 1;
            if (debugOn == 1) { setDebug(0); } else { setDebug(1); }
            msg = '디버그 보기';
            msgT = 1.5;
        }
    } else { kE = 0; }
}

// every block becomes one number: cell key x 16 + colour slot
function editSave() {
    while (saveList.length > 0) { saveList.removeAt(1); }
    let h = 1;
    while (h <= NBK) {
        let e = bkHead[h];
        while (e > 0) {
            let o = bkObj[e];
            if (o > 0) {
                if (oVis[o] != 9) {
                    let c = 1;
                    let i = 1;
                    while (i <= edPal.length) {
                        parseColor(edPal[i]);
                        if (cR * 65536 + cG * 256 + cB == oCol[o]) { c = i; i = edPal.length; }
                        i = i + 1;
                    }
                    saveList.push(bkKey[e] * 16 + c);
                }
            }
            e = bkNext[e];
        }
        h = h + 1;
    }
    msg = str('블록 ', saveList.length, '개 저장 (리스트: 블록저장)');
    msgT = 3;
}

function editLoad() {
    let i = 1;
    while (i <= saveList.length) {
        let v = saveList[i];
        let c = mod(v, 16);
        let k = idiv(v, 16);
        let cx = idiv(k, 1048576) - 512;
        let rest = mod(k, 1048576);
        let cy = idiv(rest, 1024) - 512;
        let cz = mod(rest, 1024) - 512;
        if (c < 1) { c = 1; }
        if (c > edPal.length) { c = 1; }
        blockPut(cx, cy, cz, edPal[c]);
        i = i + 1;
    }
    msg = str('블록 ', saveList.length, '개 불러옴');
    msgT = 3;
}

function editHud() {
    hudWrite(3, str('색  ', edPal[edCol]));
    hudWrite(4, str('블록  ', nObj));
    hudWrite(5, str(Math.round(fps), ' fps   면 ', drawn));
    hudWrite(6, BLANK);
    hudCross(8, '#ffffff');
    hudWrite(7, 'WASD Q E 이동  F 놓기  R 부수기  1 색  S 저장  L 불러오기  O 직교  B 디버그  ESC 메뉴');
    if (banner > 0) {
        banner = banner - dt;
        hudWrite(1, '블록 만들기');
        hudWrite(2, '조준점이 닿은 곳에 F 로 블록을 놓습니다');
    } else { hudWrite(1, BLANK); hudWrite(2, BLANK); }
}

// ============================================================
// the one loop
// ============================================================
on('start', '게임', function () {
    engineStart();
    buildMenu();
    for (;;) {
        frameBegin();
        if (scene > 0) {
            if (key(27)) { if (kEsc == 0) { kEsc = 1; buildMenu(); } } else { kEsc = 0; }
        }
        if (scene == 0) { menuStep(); }
        else if (scene == 1) { platStep(); }
        else if (scene == 2) { shootStep(); }
        else if (scene == 3) { raceStep(); }
        else { editStep(); }
        drawScene();
        if (scene == 0) { menuHud(); }
        else if (scene == 1) { platHud(); }
        else if (scene == 2) { shootHud(); }
        else if (scene == 3) { raceHud(); }
        else { editHud(); }
        if (msgT > 0) {
            msgT = msgT - dt;
            hudWrite(8, msg);
        } else { hudWrite(8, BLANK); }
    }
});

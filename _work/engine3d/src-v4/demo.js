// ============================================================
// demo.js - the sample game that ships with the engine.
//
// This is what a user's own program looks like: build a world once, then
// loop  프레임 시작 -> 내 게임 로직 -> 물리 계산 -> 카메라 -> 장면 그리기.
// ============================================================
let player = 0;
let plat = 0;
let windmill = 0;
let score = 0;
let coinsLeft = 0;
let camMode = 0;                 // 0 = 3인칭, 1 = 1인칭
let bannerT = 0;
let kC = 0; let kF = 0; let kR = 0;
let shots = 0;
let coinList = [];
let shotList = [];

// A shape typed in point by point - this is what 새 모양 만들기 is for.
// The points are model space: the object's own size scales them.
function makeHouseMesh() {
    meshStart();
    meshPoint(-0.5, -0.5, -0.5);      // 1  wall corners
    meshPoint(0.5, -0.5, -0.5);       // 2
    meshPoint(0.5, -0.5, 0.5);        // 3
    meshPoint(-0.5, -0.5, 0.5);       // 4
    meshPoint(-0.5, 0.12, -0.5);      // 5
    meshPoint(0.5, 0.12, -0.5);       // 6
    meshPoint(0.5, 0.12, 0.5);        // 7
    meshPoint(-0.5, 0.12, 0.5);       // 8
    meshPoint(0, 0.5, -0.5);          // 9  gable tips
    meshPoint(0, 0.5, 0.5);           // 10
    meshFace(1, 2, 6, 5, '크림');
    meshFace(4, 3, 7, 8, '크림');
    meshFace(1, 5, 8, 4, '살구');
    meshFace(2, 3, 7, 6, '살구');
    meshFace(5, 6, 9, 0, '벽돌');
    meshFace(8, 7, 10, 0, '벽돌');
    meshFace(5, 9, 10, 8, '빨강');
    meshFace(6, 7, 10, 9, '빨강');
    meshEnd();
}

function buildWorld() {
    worldClear();
    setSky('#1f5fc0', '#bcd8ef', '#6c9c4e');
    setLight(-0.45, 0.82, -0.36, 0.62, 0.44);
    setViewFar(88);
    setGravity(24);
    setWorldBounds(39, 60);
    setShadows(1, 0);

    makeGround(80, '잔디');

    // a few buildings
    makeBox(-14, 3, 16, 8, 6, 8, '벽돌');
    setBody(newId, 2);
    setShadow(newId, 0);
    setTag(newId, '벽돌 건물');
    makeBox(-20, 2, 6, 6, 4, 6, '크림');
    setBody(newId, 2);
    makeBox(15, 4.5, 18, 7, 9, 7, '밝은회색');
    setBody(newId, 2);
    setShadow(newId, 0);
    setTag(newId, '전망대');
    makeBox(15, 9.6, 18, 3, 1.2, 3, '빨강');
    setBody(newId, 2);
    makeCone(22, 3, 4, 7, 6, '돌');
    setBody(newId, 2);

    // ramp up to a platform, and a moving lift beside it
    makeRamp(0, 1.5, -8, 6, 3, 8, 180, '흙');
    setBody(newId, 2);
    makeBox(0, 3, -14, 8, 0.6, 6, '나무');
    setBody(newId, 2);
    makeBox(-8, 5.5, -16, 6, 0.6, 5, '나무');
    setBody(newId, 2);
    makeBox(8, 2, 3, 3, 4, 3, '남색');
    setBody(newId, 2);

    makeBox(-16, 1, -6, 4, 0.5, 4, '금색');
    plat = newId;
    setBody(plat, 4);

    // two houses built out of a hand-made shape
    makeHouseMesh();
    let house = newMesh;
    makeFromMesh(house, -24, 2.5, -13, 5, '크림');
    setBody(newId, 2);
    setTag(newId, '오두막');
    makeFromMesh(house, -20, 2, -3, 4, '크림');
    setBody(newId, 2);
    setTag(newId, '창고');

    // trees around the field
    let i = 0;
    while (i < 8) {
        let a = i * 45 + 12;
        let r = 26 + mod(i * 7, 9);
        makeTree(sind(a) * r, 2.4, cosd(a) * r, 5, '초록');
        setBody(newId, 2);
        setTag(newId, '나무');
        i = i + 1;
    }

    // bouncy balls
    i = 0;
    while (i < 5) {
        makeBall(4 + i * 2.5, 6 + i * 2, 10, 1.6, '하늘');
        setBody(newId, 1);
        setBounce(newId, 0.72, 0.05);
        setMass(newId, 0.6);
        setTag(newId, '통통공');
        i = i + 1;
    }

    // spinning decoration
    makeBox(20, 7, -14, 1, 9, 1, '회색');
    setBody(newId, 2);
    makeBox(20, 11, -14, 9, 0.8, 0.8, '하양');
    windmill = newId;
    setShadow(windmill, 0);

    // coins: 10 stars to collect
    while (coinList.length > 0) { coinList.removeAt(1); }
    i = 0;
    while (i < 8) {
        let a = i * 63;
        let r = 9 + mod(i * 5, 16);
        makeStar(sind(a) * r, 1.6, cosd(a) * r, 1.3, '금색');
        setUnlit(newId, 1);
        setBody(newId, 3);
        setCollider(newId, 1.3, 1.7, 1.3);
        setTag(newId, '별');
        coinList.push(newId);
        i = i + 1;
    }
    coinsLeft = 8;
    score = 0;

    // the player
    makePerson(0, 2, 0, 1.8, '파랑');
    player = newId;
    setBody(player, 1);
    setBounce(player, 0, 1.6);
    setMass(player, 3);
    setTag(player, '나');

    while (shotList.length > 0) { shotList.removeAt(1); }
    camX = 0; camY = 4; camZ = -9;
    camSetAngle(0, -10);
    bannerT = 4;
}

// fire a ball out of the camera
function shoot() {
    if (shotList.length >= 6) {
        killObj(shotList[1]);
        shotList.removeAt(1);
    }
    let fx = sind(camYaw) * cosd(camPitch);
    let fy = sind(camPitch);
    let fz = cosd(camYaw) * cosd(camPitch);
    makeBall(camX + fx * 1.6, camY + fy * 1.6, camZ + fz * 1.6, 0.9, '빨강');
    if (newId > 0) {
        setBody(newId, 1);
        setBounce(newId, 0.6, 0.15);
        setMass(newId, 0.4);
        setVel(newId, fx * 34, fy * 34 + 3, fz * 34);
        shotList.push(newId);
        camShake(0.6);
    }
}

function demoStep() {
    // --- keys that toggle things (only on the frame they go down) ---
    if (key(67)) { if (kC == 0) { kC = 1; camMode = 1 - camMode; } } else { kC = 0; }
    if (key(70)) { if (kF == 0) { kF = 1; shoot(); } } else { kF = 0; }
    if (key(82)) { if (kR == 0) { kR = 1; buildWorld(); } } else { kR = 0; }

    // --- look around ---
    mouseLook(1);
    keyLook(1.8);

    // --- walk ---
    keyControl(player, 7.5, 1.9);

    // --- the world moves too ---
    turnObj(windmill, 0, 0, 70 * dt);
    oY[plat] = 3.6 + sind(gt * 55) * 2.6;

    let i = 1;
    while (i <= coinList.length) {
        let c = coinList[i];
        if (oVis[c] == 1) {
            oRY[c] = oRY[c] + 110 * dt;
            oY[c] = 1.6 + sind(gt * 120 + i * 40) * 0.25;
        }
        i = i + 1;
    }

    physStep();

    // --- did the player touch a coin? ---
    i = 1;
    while (i <= coinList.length) {
        let c = coinList[i];
        if (oVis[c] == 1) {
            if (oHit[c] == player) {
                oVis[c] = 0;
                setBody(c, 0);
                score = score + 10;
                coinsLeft = coinsLeft - 1;
                camShake(0.35);
                if (coinsLeft == 0) { bannerT = 5; }
            }
        }
        i = i + 1;
    }

    // --- fell off the world? ---
    if (oY[player] < -12) {
        setPos(player, 0, 3, 0);
        setVel(player, 0, 0, 0);
    }

    // --- camera ---
    if (camMode == 1) {
        setVisible(player, 0);
        camFirst(player, 0.62);
        // what is the crosshair pointing at? (광선 쏘기 + 월드 위치에 글 띄우기)
        let fx = sind(camYaw) * cosd(camPitch);
        let fy = sind(camPitch);
        let fz = cosd(camYaw) * cosd(camPitch);
        rayCast(camX, camY, camZ, fx, fy, fz, 45, player);
        if (rayHit == 1) {
            hudPlace3D(8, rayX, rayY + 0.7, rayZ, oTag[rayObj]);
        } else { hudWrite(8, BLANK); }
    } else {
        setVisible(player, 1);
        camThird(player, 6.5, 2.4, 0.68);
        hudWrite(8, BLANK);
    }
}

function demoHud() {
    hudWrite(3, str('점수  ', score));
    hudWrite(4, str('남은 별  ', coinsLeft));
    hudWrite(5, str(Math.round(fps), ' fps   면 ', drawn));
    if (camMode == 1) {
        hudWrite(6, '1인칭');
        hudCross(9, '#ffffff');
    } else { hudWrite(6, '3인칭'); }
    hudWrite(7, 'WASD 이동   SPACE 점프   마우스드래그·방향키 시점   C 시점전환   F 공쏘기   R 다시');
    if (bannerT > 0) {
        bannerT = bannerT - dt;
        if (coinsLeft == 0) {
            hudWrite(1, '별을 모두 모았다!');
            hudWrite(2, str('점수 ', score, '   R 키로 다시 시작'));
        } else {
            hudWrite(1, '3D 엔진 v4');
            hudWrite(2, '별 8개를 모아보세요');
        }
    } else {
        hudWrite(1, BLANK);
        hudWrite(2, BLANK);
    }
}

on('start', '게임', function () {
    engineStart();
    hudPlace(1, 0, 44, '#ffffff');
    hudPlace(2, 0, 8, '#e8eef8');
    hudPlace(3, -228, 118, '#ffffff');
    hudPlace(4, -228, 98, '#ffe27a');
    hudPlace(5, -228, 78, '#a8e6ff');
    hudPlace(6, 228, 118, '#ffffff');
    hudPlace(7, 0, -124, '#dbe4f2');
    hudPlace(8, 0, -60, '#ffffff');
    buildWorld();
    for (;;) {
        frameBegin();
        demoStep();
        drawScene();
        demoHud();
    }
});

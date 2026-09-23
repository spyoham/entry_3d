// ============================================================
// test-scene.js - not shipped. Calls every part of the API so a build can be
// checked headless:   TESTSCENE=1 node build.mjs t.ent
// ============================================================
let tA = 0; let tB = 0; let tC = 0; let tD = 0; let tMesh = 0;
let tPhase = 0; let tPrev = -1; let tLog = 0;

function tMap() {
    while (mapList.length > 0) { mapList.removeAt(1); }
    mapList.push('#######');
    mapList.push('#S..*.#');
    mapList.push('#.###.#');
    mapList.push('#..T..#');
    mapList.push('#.W.=.#');
    mapList.push('#...G.#');
    mapList.push('#######');
}

function tBuild() {
    worldClear();
    setSky('#1f5fc0', '#bcd8ef', '#6c9c4e');
    setLight(-0.45, 0.82, -0.36, 0.62, 0.45);
    setViewFar(95);
    setQuality(600);
    setLodSize(26);
    setLodFar(60);
    setShadows(1, 0);
    setShadowFar(60);
    setGravity(20);
    setStepHeight(0.5);
    setSlopeLimit(46);
    setWorldBounds(70, 50);
    setBlockSize(2);

    // every builtin shape
    makeGround(60, '잔디');
    makeBox(-9, 1, 0, 2, 2, 2, '빨강');
    tD = newId;
    makeBall(-6, 1, 0, 2, '파랑');
    makeCyl(-3, 1, 0, 2, 2, '노랑');
    makeCone(0, 1, 0, 2, 2, '초록');
    makePyr(3, 1, 0, 2, 2, 2, '보라');
    makeRamp(6, 1, 0, 3, 2, 3, 0, '흙');
    setBody(newId, 2);
    makePerson(9, 1, 0, 2, '하늘');
    makeTree(12, 1.5, 0, 3, '초록');
    makeStar(-9, 1.5, 6, 2, '금색');
    makeDisc(-6, 1, 6, 2, '은색');
    makeQuad(-3, 1, 6, 2, 2, '분홍');
    setBillboard(newId, 1);
    makeBox(0, 1, 6, 2, 2, 2, '회색');
    setRot(newId, 25, 35, 15);
    cloneObj(newId, 3, 1, 6);

    // a hand made shape + LOD pair
    meshStart();
    meshPoint(0, 0.5, 0);
    meshPoint(-0.4, 0, -0.4);
    meshPoint(0.4, 0, -0.4);
    meshPoint(0.4, 0, 0.4);
    meshPoint(-0.4, 0, 0.4);
    meshPoint(0, -0.5, 0);
    meshFace(1, 2, 3, 0, '청록');
    meshFace(1, 3, 4, 0, '하늘');
    meshFace(1, 4, 5, 0, '청록');
    meshFace(1, 5, 2, 0, '하늘');
    meshFace(6, 3, 2, 0, '남색');
    meshFace(6, 4, 3, 0, '남색');
    meshFace(6, 5, 4, 0, '남색');
    meshFace(6, 2, 5, 0, '남색');
    meshEnd();
    tMesh = newMesh;
    makeFromMesh(tMesh, 6, 2, 6, 3, '청록');
    tC = newId;
    setTag(tC, '보석');
    setLod(tMesh, M_PYR);

    // physics zoo
    makeBox(9, 8, 6, 1.6, 1.6, 1.6, '주황');
    tA = newId;
    setBody(tA, 1);
    setBounce(tA, 0.35, 0.4);
    setMass(tA, 2);
    setTag(tA, '상자');
    makeBall(12, 9, 6, 1.4, '분홍');
    tB = newId;
    setBody(tB, 1);
    setSphereShape(tB, 1);
    setBounce(tB, 0.8, 0.06);
    addForce(tB, -6, 0, 0);
    makePerson(0, 2, -6, 1.8, '연두');
    setBody(newId, 1);
    setCapsuleShape(newId, 1);
    setMass(newId, 3);
    setTag(newId, '나');
    setCollider(newId, 0.45, 0.9, 0.45);
    let me = newId;
    makeCone(0, 0, 0, 1, 0.8, '빨강');
    attachTo(newId, me, 0, 1.1, 0, 0);
    makeBox(-13, 1, -6, 5, 0.5, 5, '나무');
    setBody(newId, 4);
    setTag(newId, '발판');
    makeBox(4, 1.5, -9, 4, 3, 4, '벽돌');
    setBody(newId, 2);
    setRot(newId, 0, 30, 0);
    setLayer(newId, 0);
    makeBox(-4, 1.2, -12, 3, 2.4, 3, '돌');
    setBody(newId, 2);
    setShadow(newId, 0);
    setUnlit(newId, 0);
    putOnFloor(newId, 0);

    // text map, blocks and scatter all in one world
    tMap();
    mapBuild(4, 4, '벽돌', '모래');
    blockFloor(2, 2, 3, '하늘');
    if (STRESS == 1) { blockFloor(13, 13, -1, '돌'); blockFloor(13, 13, -2, '흙'); }
    blockPut(0, 4, 0, '금색');
    blockAt(0, 4, 0);
    blockDig(1, 3, 1);
    scatter(8, 0, 90, 30);
    timerSet(1, 5);
    timerSet(2, 3);
    tweenMove(tD, -9, 4, 0, 3, 1);
    tweenSize(tC, 4, 4, 4, 2, 2);
}

on('start', '게임', function () {
    engineStart();
    hudPlace(1, 0, 60, '#ffffff');
    hudPlace(2, 0, 34, '#cfe0f5');
    hudPlace(3, -228, 118, '#ffffff');
    hudPlace(4, -228, 98, '#ffe27a');
    hudPlace(5, -228, 78, '#a8e6ff');
    hudPlace(6, 228, 118, '#ffffff');
    hudPlace(7, 0, -124, '#dbe4f2');
    hudPlace(8, 0, -60, '#ffffff');
    tBuild();
    for (;;) {
        frameBegin();
        let a = gt * 22;
        // every mode gets a turn: 0-5 perspective, 6-8 ortho, 9-11 wire + debug
        tPhase = Math.floor(mod(gt, 12));
        if (tPhase != tPrev) {
            tPrev = tPhase;
            if (tPhase == 6) { camSetProjection(1, 44); }
            if (tPhase == 9) { camSetProjection(0, 0); setDrawMode(2); setDebug(1); }
            if (tPhase == 0) { setDrawMode(0); setDebug(0); camTweenTo(14, 12, -14, 0, 1, 0, 2); }
        }
        if (tPhase < 9) {
            camSetPos(sind(a) * 19, 8 + sind(gt * 17) * 3, cosd(a) * 19 - 2);
            camLookAt(1.5, 1.5, 1);
        }
        turnObj(tC, 0, 55 * dt, 0);
        moveToward(tA, tB, 1.5);
        physStep();
        touchTest(tA, tB);
        touchTag(tA, '상자');
        inBox(oX[tA], oY[tA], oZ[tA], 0, 2, 0, 40, 10, 40);
        nearPoint(tB, 0, 0, 0, 25);
        distObjs(tA, tB);
        distPoints(0, 0, 0, oX[tC], oY[tC], oZ[tC]);
        angleTo(0, 0, oX[tC], oZ[tC]);
        rayCast(camX, camY, camZ, sind(camYaw), -0.3, cosd(camYaw), 60, 0);
        worldToScreen(oX[tC], oY[tC], oZ[tC]);
        drawScene();
        hudBar(0, 118, 160, 14, mod(gt, 4) / 4, '초록', '#22262e');
        hudRect(200, -110, 50, 20, '#20242b');
        hudLine(176, -110, 224, -110, 3, '노랑');
        hudCross(8, '#ffffff');
        hudWrite(1, str('phase ', tPhase, '  면 ', drawn, '  물체 ', nObj, '  보임 ', nSeen));
        hudWrite(2, str('거리 ', Math.round(dist3), '  방향 ', Math.round(angleOut), '  광선 ', rayHit, ' ', rayObj));
        hudWrite(3, str(Math.round(fps), ' fps'));
        hudWrite(4, str('닿음 ', touch, ' ', touchObj, '  타이머 ', Math.round(timerV[1] * 10) / 10));
        hudWrite(5, str('상자 y ', Math.round(oY[tA] * 10) / 10, '  공 x ', Math.round(oX[tB] * 10) / 10));
        hudWrite(6, str('블록 ', blockObj, '  높이 ', Math.round(heightRes * 10) / 10));
        hudWrite(7, warnMsg);
        hudPlace3D(8, oX[tC], oY[tC] + 2.4, oZ[tC], oTag[tC]);
    }
});

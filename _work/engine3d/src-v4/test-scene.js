// ============================================================
// test-scene.js - not shipped: exercises every part of the API so a build can
// be checked headless.   TESTSCENE=1 node build.mjs t.ent
// ============================================================
let tA = 0; let tB = 0; let tC = 0; let tMesh = 0; let tPhase = 0;

function tBuild() {
    worldClear();
    setSky('#1f5fc0', '#bcd8ef', '#6c9c4e');
    setLight(-0.45, 0.82, -0.36, 0.62, 0.45);
    setViewFar(90);
    setQuality(500);
    setLodSize(20);
    setShadows(1, 0);
    setShadowFar(60);
    setGravity(20);
    makeGround(60, '잔디');

    makeBox(-9, 1, 0, 2, 2, 2, '빨강');
    makeBall(-6, 1, 0, 2, '파랑');
    makeCyl(-3, 1, 0, 2, 2, '노랑');
    makeCone(0, 1, 0, 2, 2, '초록');
    makePyr(3, 1, 0, 2, 2, 2, '보라');
    makeRamp(6, 1, 0, 2, 2, 2, 0, '흙');
    makePerson(9, 1, 0, 2, '하늘');
    makeTree(12, 1.5, 0, 3, '초록');
    makeStar(-9, 1.5, 6, 2, '금색');
    makeDisc(-6, 1, 6, 2, '은색');
    makeQuad(-3, 1, 6, 2, 2, '분홍');
    setBillboard(newId, 1);
    makeBox(0, 1, 6, 2, 2, 2, '회색');
    setRot(newId, 25, 35, 15);

    // a hand made shape: a diamond
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
    makeFromMesh(tMesh, 3, 1.5, 6, 3, '청록');
    tC = newId;
    setTag(tC, '보석');

    // physics: a falling box, a rolling ball, a platform and a ramp
    makeBox(9, 8, 6, 1.6, 1.6, 1.6, '주황');
    tA = newId;
    setBody(tA, 1);
    setBounce(tA, 0.35, 0.4);
    setMass(tA, 2);
    makeBall(12, 9, 6, 1.4, '분홍');
    tB = newId;
    setBody(tB, 1);
    setBounce(tB, 0.8, 0.06);
    setSphereShape(tB, 1);
    addForce(tB, -6, 0, 0);

    makeBox(-13, 1, -6, 5, 0.5, 5, '나무');
    setBody(newId, 4);
    setTag(newId, '발판');
    makeRamp(-4, 1, -8, 6, 2, 6, 180, '돌');
    setBody(newId, 2);
    makeBox(4, 1.5, -9, 4, 3, 4, '벽돌');
    setBody(newId, 2);
    setTag(newId, '벽');
    cloneObj(newId, 9, 1.5, -9);
    setBody(newId, 2);
    setWorldBounds(28, 40);

    // stress: run the object pool dry and check that the engine says so
    let n = 0;
    while (n < 420) {
        makeBox(rand(-20, 20), 0.5, rand(-20, 20), 0.4, 0.4, 0.4, '회색');
        setVisible(newId, 0);
        n = n + 1;
    }
}

on('start', '게임', function () {
    engineStart();
    hudPlace(3, -228, 118, '#ffffff');
    hudPlace(4, -228, 98, '#ffe27a');
    hudPlace(5, -228, 78, '#a8e6ff');
    hudPlace(8, 0, -60, '#ffffff');
    tBuild();
    for (;;) {
        frameBegin();
        let a = gt * 26;
        camSetPos(1.5 + sind(a) * 17, 7 + sind(gt * 17) * 3, cosd(a) * 17 - 2);
        camLookAt(1.5, 1.5, 1);
        // moving platform + a spinning gem
        oY[6] = 1;
        turnObj(tC, 0, 55 * dt, 0);
        physStep();
        touchTest(tA, tB);
        // wireframe for a few seconds, then solid again
        tPhase = Math.floor(mod(gt, 18));
        if (tPhase == 8) { setDrawMode(2); } else if (tPhase == 12) { setDrawMode(0); }
        drawScene();
        // screen-space HUD drawing
        hudBar(0, 118, 160, 14, mod(gt, 4) / 4, '초록', '#22262e');
        hudRect(200, -110, 50, 20, '#20242b');
        hudLine(176, -110, 224, -110, 3, '노랑');
        hudCross(8, '#ffffff');
        hudWrite(3, str('t ', Math.round(gt), '  면 ', drawn, '  물체 ', nObj));
        hudWrite(4, str(Math.round(fps), ' fps   닿음 ', touch, '   ', warnMsg));
        hudWrite(5, str('상자 y ', Math.round(oY[tA] * 10) / 10, '  공 x ', Math.round(oX[tB] * 10) / 10));
        hudPlace3D(8, oX[tC], oY[tC] + 2.2, oZ[tC], oTag[tC]);
    }
});

// Stages 4-12 (see stages1.mjs for the format)
export const STAGES_1B = [];
const add = (def) => STAGES_1B.push(def);
const Z1 = '구역 1 · 반복 복도', Z2 = '구역 2 · 이어지는 문', Z3 = '구역 3 · 거인의 모형';

// 4 ---------------------------------------------------------------
add({
    name: '끝없는 계단', zone: Z1, goal: '계단을 정확히 4층 올라간 상태에서 꼭대기의 서쪽 문으로 나가세요.',
    hints: ['꼭대기의 북쪽 문은 계단 아래로 이어집니다. 올라갈수록 층수가 늘어납니다.', '맨 아래에서 남쪽 문으로 뒷걸음질하면 꼭대기로 가면서 한 층 내려갑니다.', '북쪽 문을 네 번 지난 뒤(계수기 4) 꼭대기의 서쪽 문으로. 너무 많이 올랐다면 맨 아래 남쪽 문으로 한 번 내려오세요.'],
    build(S) {
        S.counter('f', { target: 4, out: 'f4', exact: true });
        const A = S.room('A', 5, 3, 5, { theme: 'lab', label: '대기실' });
        const L = S.room('L', 4, 6.5, 14, { theme: 'sand', label: '계단' });
        const G = S.room('G', 5, 3, 5, { theme: 'green', label: '출구' });
        S.door(A, 'N', { at: 2.5 }, L, 'E', { at: 1.6 });
        for (let k = 1; k <= 5; k++) S.block(L, 2, 3.5 + k, { w: 4, d: 1, h: 0.5 * k, color: [176 - k * 8, 150 - k * 6, 112 - k * 4] });
        S.block(L, 2, 11.5, { w: 4, d: 5, h: 3.0, color: [130, 112, 84] });
        const n = S.portal(L, 'N', { at: 2, y: 3.0, w: 2.4, h: 2.4, count: 'f', delta: 1, sym: 5 });
        const s = S.portal(L, 'S', { at: 2, y: 0, w: 2.4, h: 2.4, count: 'f', delta: -1, sym: 5 });
        S.link(n, s);
        S.door(L, 'W', { at: 11.5, y: 3.0, cond: 'f4', sym: 3 }, G, 'E', { at: 2.5, sym: 3 });
        S.lamp(L, 0.15, 5.6, 11.5, { cond: 'f4' });
        S.core(G, 2.5, 2.5);
    },
    start: { room: 'A', x: 2.5, z: 1.5, yaw: 0 },
});

// 5 ---------------------------------------------------------------
add({
    name: '네 개의 방', zone: Z2, goal: 'D의 스위치를 켜고, B의 큐브를 C의 판에 올리면 C의 출구가 열립니다.',
    hints: ['문마다 이어진 방이 다릅니다. 같은 색 테두리끼리 이어져 있습니다.', 'E는 들고 있는 큐브를 내려놓기도 합니다. 스위치는 빈손으로 켜세요.', 'A 북쪽 → B, B 동쪽 → D(스위치). 돌아와 B의 큐브를 들고 A 동쪽 → C의 판 위에.'],
    build(S) {
        S.logic('go', ['s', 'p']);
        const A = S.room('A', 6, 3, 6, { theme: 'lab', label: 'A (시작)' });
        const B = S.room('B', 5, 3, 5, { theme: 'blue', label: 'B (큐브)' });
        const C = S.room('C', 6, 3, 6, { theme: 'warm', label: 'C (판과 출구)' });
        const D = S.room('D', 4, 3, 4, { theme: 'violet', label: 'D (스위치)' });
        const G = S.room('G', 4, 3, 4, { theme: 'green', label: '출구' });
        S.door(A, 'N', { at: 2, sym: 2 }, B, 'S', { at: 2.5 });
        S.door(B, 'E', { at: 2.5, sym: 4 }, D, 'W', { at: 2 });
        S.door(A, 'E', { at: 3, sym: 1 }, C, 'W', { at: 3 });
        S.door(C, 'N', { at: 3, cond: 'go', sym: 3 }, G, 'S', { at: 2 });
        S.cube(B, 2.5, 3.5);
        S.lever(D, 2.8, 2, { sig: 's' });
        S.plate(C, 3, 4, { sig: 'p' });
        S.lamp(C, 3, 2.6, 5.9, { cond: 's', d: 0.2 });
        S.core(G, 2, 2);
    },
    start: { room: 'A', x: 3, z: 2, yaw: 0 },
});

// 6 ---------------------------------------------------------------
add({
    name: '경계 렌즈', zone: Z2, goal: '레이저가 B의 수신기에 닿게 같은 모양의 패널 두 개를 이으세요.',
    hints: ['레이저는 북쪽 벽의 동그라미 패널에 막혀 있습니다.', '패널을 보고 E로 고르고, 같은 모양의 다른 패널을 보고 E로 이으세요. X로 끊습니다.', 'A 북쪽 벽의 ○ 패널을 고른 뒤 B로 가서 남쪽 벽의 ○ 패널을 고르세요.'],
    build(S) {
        const A = S.room('A', 8, 3, 8, { theme: 'lab', label: '발사실' });
        const B = S.room('B', 6, 3, 6, { theme: 'mint', label: '수신실' });
        S.door(A, 'E', { at: 4 }, B, 'W', { at: 4.5 });
        S.block(A, 1.5, 1.5, { w: 0.5, d: 0.5, h: 1.0, color: [90, 96, 108] });
        S.emitter(A, 1.5, 1.0, 1.5, '+z');
        S.portal(A, 'N', { at: 1.5, y: 0.3, w: 1.4, h: 1.6, lens: 1, shape: 2, sym: 6 });
        S.portal(A, 'W', { at: 5, y: 0.3, w: 1.4, h: 1.6, lens: 1, shape: 1, sym: 1 });
        S.portal(B, 'S', { at: 3, y: 0.3, w: 1.4, h: 1.6, lens: 1, shape: 2, sym: 6 });
        S.block(B, 3, 3, { w: 0.45, d: 0.45, h: 1.0, color: [90, 96, 108] });
        S.receiver(B, 3, 1.0, 3, { sig: 'r' });
        S.core(B, 5, 5, { cond: 'r' });
    },
    start: { room: 'A', x: 4, z: 3, yaw: 0 },
});

// 7 ---------------------------------------------------------------
add({
    name: '지름길', zone: Z2, goal: '판을 밟으면 5초 동안 코어가 나타납니다. 먼 길로는 늦습니다.',
    hints: ['코어 방에도 □ 패널이 있습니다. 렌즈로 고른 것은 걸어 다녀도 유지됩니다.', '코어 방의 □ 패널을 골라 두고, 한쪽으로만 열리는 흰 문으로 돌아오세요.', '시작 방의 □ 패널을 골라 이은 뒤, 판을 밟고 곧장 패널로 뛰어드세요 (Shift: 달리기).'],
    build(S) {
        S.logic('open', ['p'], { hold: 5 });
        const A = S.room('A', 6, 3, 6, { theme: 'lab', label: '시작 방' });
        const R1 = S.room('R1', 2.4, 3, 16, { theme: 'white', label: '긴 복도' });
        const R2 = S.room('R2', 16, 3, 2.4, { theme: 'white', label: '긴 복도' });
        const R3 = S.room('R3', 6, 3, 6, { theme: 'gold', label: '코어 방' });
        S.door(A, 'N', { at: 3 }, R1, 'S', { at: 1.2 });
        S.door(R1, 'N', { at: 1.2 }, R2, 'W', { at: 1.2 });
        S.door(R2, 'E', { at: 1.2 }, R3, 'S', { at: 3 });
        const back = S.portal(R3, 'W', { at: 3, sym: 8 });
        const into = S.portal(A, 'S', { at: 3, sym: 8 });
        S.oneWay(back, into);
        S.portal(A, 'W', { at: 3, lens: 1, shape: 3, sym: 2 });
        S.portal(R3, 'E', { at: 3, lens: 1, shape: 3, sym: 2 });
        S.plate(A, 4.6, 1.4, { sig: 'p' });
        S.core(R3, 3, 4.5, { cond: 'open' });
        S.lamp(A, 4.6, 2.5, 0.12, { cond: 'open', d: 0.15 });
    },
    start: { room: 'A', x: 3, z: 2.5, yaw: 0 },
});

// 8 ---------------------------------------------------------------
add({
    name: '창문 너머의 패널', zone: Z2, goal: '창문으로만 보이는 방 Y의 판에 큐브를 올리세요.',
    hints: ['렌즈는 창문 너머의 패널도 고를 수 있습니다.', '창문으로 Y의 △ 패널을 고르고, 이 방의 △ 패널과 이으세요. 큐브를 든 채로는 E가 내려놓기입니다.', '먼저 패널을 이어 두고, X의 큐브를 들고 △ 패널로 들어가 Y의 판에 놓으세요.'],
    build(S) {
        const H = S.room('H', 8, 3.5, 8, { theme: 'lab', label: '중앙' });
        const Y = S.room('Y', 7, 3.5, 7, { theme: 'violet', label: 'Y' });
        const X = S.room('X', 5, 3, 5, { theme: 'blue', label: 'X' });
        S.link(S.portal(H, 'N', { at: 4, y: 1.2, w: 2.4, h: 1.4, glass: 1, sym: 6 }), S.portal(Y, 'S', { at: 3.5, y: 1.2, w: 2.4, h: 1.4, glass: 1, sym: 6 }));
        S.portal(Y, 'W', { at: 3.5, lens: 1, shape: 1, sym: 1 });
        S.portal(H, 'W', { at: 4, lens: 1, shape: 1, sym: 1 });
        S.door(H, 'E', { at: 4 }, X, 'W', { at: 2.5 });
        S.cube(X, 2.5, 2.5);
        S.block(X, 4, 4, { w: 1.2, d: 1.2, h: 0.9 });
        S.record(X, 4, 1.05, 4);
        S.plate(Y, 5, 3.5, { sig: 'p' });
        S.core(Y, 5.5, 5.5, { cond: 'p' });
    },
    start: { room: 'H', x: 4, z: 2, yaw: 0 },
});

// 9 ---------------------------------------------------------------
add({
    name: '쥐구멍', zone: Z3, goal: '좁은 틈 안쪽의 코어를 가져오세요.',
    hints: ['서쪽의 큰 문과 동쪽의 작은 구멍은 이어져 있습니다.', '큰 문으로 들어가면 작은 구멍으로 나옵니다. 크기도 그만큼 작아집니다.', '작아진 채로 북동쪽 틈으로 들어가세요. 원래 크기로 돌아오려면 작은 구멍으로 다시 들어가면 됩니다.'],
    build(S) {
        const A = S.room('A', 8, 3, 8, { theme: 'warm', label: '쥐구멍 방' });
        S.link(S.portal(A, 'W', { at: 4, w: 1.6, h: 2.4, sym: 1 }), S.portal(A, 'E', { at: 2, w: 0.4, h: 0.6, sym: 1 }));
        const col = [150, 120, 96];
        S.block(A, 5.8, 5.65, { w: 1.6, d: 0.3, h: 1.5, color: col });
        S.block(A, 7.45, 5.65, { w: 1.1, d: 0.3, h: 1.5, color: col });
        S.block(A, 5.15, 6.9, { w: 0.3, d: 2.2, h: 1.5, color: col });
        S.core(A, 6.75, 7.2, { y: 0.05 });
    },
    start: { room: 'A', x: 5, z: 4, yaw: 270 },
});

// 10 --------------------------------------------------------------
add({
    name: '확대 깔때기', zone: Z3, goal: '옆방의 무거운 판(파랑)은 아주 큰 큐브만 누를 수 있습니다.',
    hints: ['바닥의 작은 구멍 아래는 옆방의 천장입니다.', '작은 구멍으로 떨어진 큐브는 반대편 큰 구멍으로 나오며 커집니다.', '큐브를 들고 구멍 앞에서 내려놓으세요. 그다음 북쪽 문으로 옆방에 가 보세요.'],
    build(S) {
        const A = S.room('A', 7, 3, 7, { theme: 'lab', label: '위층' });
        const B = S.room('B', 6, 4.5, 6, { theme: 'stone', label: '아래층' });
        S.link(S.portal(A, 'F', { at: [3.5, 2.2], w: 0.56, h: 0.56, sym: 1 }), S.portal(B, 'C', { at: [3, 3], w: 2.24, h: 2.24, sym: 1 }));
        S.door(A, 'N', { at: 3.5 }, B, 'S', { at: 3 });
        S.cube(A, 5.5, 5.5, { w: 0.4, d: 0.4, h: 0.4 });
        S.plate(B, 3, 3, { sig: 'heavy', size: 2.4, min: 3, color: [70, 120, 220] });
        S.core(B, 1, 5, { cond: 'heavy' });
    },
    start: { room: 'A', x: 3.5, z: 4.5, yaw: 90 },
});

// 11 --------------------------------------------------------------
add({
    name: '거인의 모형', zone: Z3, goal: '모형 집 안의 큐브를 좁은 틈 안의 발전기 판(파랑)에 넣으세요.',
    hints: ['서쪽 큰 문은 책상 위의 작은 구멍으로 이어집니다.', '작아진 채로 모형 집에 들어가면 그 안에서는 다시 보통 크기가 됩니다. 큐브를 들고 나오면 큐브도 작아집니다.', '작은 큐브를 들고 책상에서 내려가 남서쪽 틀의 좁은 틈으로 들어가 파란 판 위에 놓으세요.'],
    build(S) {
        const A = S.room('A', 9, 3.2, 9, { theme: 'warm', label: '작업실' });
        const B = S.room('B', 6, 3, 6, { theme: 'mint', label: '모형 집 안' });
        S.block(A, 7, 1.5, { w: 4, d: 3, h: 1.0, color: [120, 86, 60] });
        S.link(S.portal(A, 'W', { at: 6, w: 1.6, h: 2.4, sym: 1 }), S.portal(A, 'E', { at: 1.5, y: 1.0, w: 0.4, h: 0.6, sym: 1 }));
        const door = S.booth(A, 6.6, 1.5, { y: 1.0, w: 1.0, d: 1.0, h: 0.9, face: '+x', dw: 0.4, dh: 0.6, color: [80, 160, 150], sym: 6 });
        S.link(door, S.portal(B, 'S', { at: 3, w: 1.6, h: 2.4, sym: 6 }));
        S.cube(B, 3, 3.5);
        const col = [110, 116, 128];
        S.block(A, 2, 1.1, { w: 2, d: 0.2, h: 1.4, color: col });
        S.block(A, 2, 2.9, { w: 2, d: 0.2, h: 1.4, color: col });
        S.block(A, 1.1, 2, { w: 0.2, d: 1.6, h: 1.4, color: col });
        S.block(A, 2.9, 1.525, { w: 0.2, d: 0.65, h: 1.4, color: col });
        S.block(A, 2.9, 2.475, { w: 0.2, d: 0.65, h: 1.4, color: col });
        S.plate(A, 2, 2, { sig: 'gen', size: 0.8, cubeOnly: 1 });
        S.core(A, 4.5, 5, { y: 0.05, cond: 'gen' });
    },
    start: { room: 'A', x: 3, z: 6, yaw: 270 },
});

// 12 --------------------------------------------------------------
add({
    name: '거인의 걸음', zone: Z3, goal: '높은 선반 위의 코어를 가져오세요.',
    hints: ['커지면 점프도 그만큼 높아집니다.', '남쪽의 작은 문은 북쪽의 큰 문으로 이어집니다.', '작은 문으로 들어가 두 배가 된 뒤, 서쪽 선반으로 달려가며 점프(Space)하세요.'],
    build(S) {
        const A = S.room('A', 10, 8, 10, { theme: 'stone', label: '높은 방' });
        S.link(S.portal(A, 'S', { at: 2, w: 1.0, h: 2.0, sym: 5 }), S.portal(A, 'N', { at: 7.5, w: 2.0, h: 4.0, sym: 5 }));
        S.block(A, 1.5, 8, { w: 3, d: 4, h: 3.0, color: [120, 112, 100] });
        S.block(A, 0.75, 9.25, { w: 1.5, d: 1.5, h: 4.0, color: [140, 130, 116] });
        S.record(A, 0.75, 4.3, 9.25);
        S.core(A, 2.2, 7.0, { y: 3.4 });
    },
    start: { room: 'A', x: 5, z: 5, yaw: 180 },
});

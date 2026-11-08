// Stages 1-12: 반복 복도, 이어지는 문, 거인의 모형
// Coordinates are each room's own: x across (0..w), y up, z along (0..d). Sides: W x=0, E x=w,
// S z=0, N z=d, F floor, C ceiling. `at` is where along the side the middle of a door is.
export const STAGES_1 = [];
const add = (def) => STAGES_1.push(def);
const Z1 = '구역 1 · 반복 복도', Z2 = '구역 2 · 이어지는 문', Z3 = '구역 3 · 거인의 모형';

// 1 ---------------------------------------------------------------
add({
    name: '첫 걸음', zone: Z1, goal: '복도 끝의 방에서 노란 안정화 코어를 가져오세요.',
    hints: ['문 너머가 그대로 보입니다. 걸어 들어가 보세요.', '복도 끝은 오른쪽으로 꺾인 방으로 이어집니다.', 'W로 걷고 마우스를 끌어 둘러봅니다. 코어에 닿으면 됩니다.'],
    build(S) {
        const A = S.room('A', 6, 3, 7, { theme: 'lab', label: '시작 방' });
        const B = S.room('B', 2.4, 3, 12, { theme: 'white', label: '복도' });
        const C = S.room('C', 7, 3.4, 7, { theme: 'warm', label: '코어 방' });
        S.door(A, 'N', { at: 3 }, B, 'S', { at: 1.2 });
        S.door(B, 'N', { at: 1.2 }, C, 'W', { at: 3.5 });
        S.block(C, 3.5, 3.5, { w: 1.2, d: 1.2, h: 0.45 });
        S.core(C, 3.5, 3.5, { y: 0.75 });
        S.block(A, 1, 5.5, { w: 1.2, d: 1.2, h: 0.4 });
        S.block(A, 5, 5.5, { w: 1.2, d: 1.2, h: 0.8 });
    },
    start: { room: 'A', x: 3, z: 1.5, yaw: 0 },
});

// 2 ---------------------------------------------------------------
add({
    name: '끝나지 않는 복도', zone: Z1, goal: '복도 북쪽 끝으로 3번 지나가면 동쪽 문이 열립니다.',
    hints: ['복도 북쪽 끝을 지나면 어디로 나오나요?', '북쪽 끝을 지날 때만 계수기가 올라갑니다. 반대로는 줄지 않습니다.', '북쪽으로 세 번 계속 걸어간 뒤 동쪽 문(초록 테두리)으로 들어가세요.'],
    build(S) {
        S.counter('c', { target: 3, out: 'c3' });
        const A = S.room('A', 5, 3, 5, { theme: 'lab', label: '대기실' });
        const L = S.room('L', 3, 3, 14, { theme: 'white', label: '반복 복도' });
        const G = S.room('G', 5, 3, 5, { theme: 'green', label: '출구' });
        S.door(A, 'N', { at: 2.5 }, L, 'W', { at: 3 });
        const n = S.portal(L, 'N', { at: 1.5, w: 3, h: 3, count: 'c' });
        const s = S.portal(L, 'S', { at: 1.5, w: 3, h: 3 });
        S.link(n, s);
        S.door(L, 'E', { at: 10, cond: 'c3', sym: 3 }, G, 'W', { at: 2.5, sym: 3 });
        S.core(G, 2.5, 3);
        S.lamp(L, 2.85, 2.4, 10, { cond: 'c3' });
        S.block(L, 0.4, 7, { w: 0.8, d: 0.8, h: 0.9, color: [180, 120, 90] });
    },
    start: { room: 'A', x: 2.5, z: 1.5, yaw: 0 },
});

// 3 ---------------------------------------------------------------
add({
    name: '같은 방, 같은 큐브', zone: Z1, goal: '빨간 판이 눌린 동안만 서쪽 문이 열립니다.',
    hints: ['판을 밟고 있으면 문에 갈 수 없습니다.', '큐브를 판 위에 올려 두세요 (E로 들기·내려놓기).', '큐브를 북쪽 끝 판에 놓고, 복도를 한 바퀴 돌아 같은 큐브가 그대로 있는지 확인한 뒤 서쪽 문으로.'],
    build(S) {
        const A = S.room('A', 5, 3, 5, { theme: 'lab', label: '대기실' });
        const L = S.room('L', 3, 3, 16, { theme: 'white', label: '반복 복도' });
        const G = S.room('G', 5, 3, 5, { theme: 'green', label: '출구' });
        S.door(A, 'N', { at: 2.5 }, L, 'E', { at: 8 });
        S.link(S.portal(L, 'N', { at: 1.5, w: 3, h: 3 }), S.portal(L, 'S', { at: 1.5, w: 3, h: 3 }));
        S.plate(L, 1.5, 14.2, { sig: 'p', size: 1.1 });
        S.cube(L, 1.0, 2.2);
        S.door(L, 'W', { at: 4, cond: 'p', sym: 3 }, G, 'E', { at: 2.5, sym: 3 });
        S.core(G, 2.5, 2.5);
    },
    start: { room: 'A', x: 2.5, z: 1.5, yaw: 0 },
});

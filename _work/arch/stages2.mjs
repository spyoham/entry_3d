// Stages 13-24: 바뀌는 뒷면, 기묘한 기하, 접힌 심장부 (see stages1.mjs for the format)
export const STAGES_2 = [];
const add = (def) => STAGES_2.push(def);
const Z4 = '구역 4 · 바뀌는 뒷면', Z5 = '구역 5 · 기묘한 기하', Z6 = '구역 6 · 접힌 심장부';

// 13 --------------------------------------------------------------
add({
    name: '레버와 문', zone: Z4, goal: 'X의 큐브를 Y의 판에 올리세요. 북쪽 문 뒤는 레버로 바뀝니다.',
    hints: ['북쪽 문틀의 색이 지금 이어진 방을 알려 줍니다 (파랑 X, 주황 Y).', '레버는 문 앞이 비어 있을 때만 움직입니다. 큐브를 든 채 E를 누르면 내려놓으니 먼저 큐브를 바닥에 두세요.', 'X에서 큐브를 가져와 내려놓고, 레버를 당겨 Y로 바꾼 뒤 큐브를 들고 Y의 판에.'],
    build(S) {
        const M = S.room('M', 7, 3, 7, { theme: 'lab', label: '전환실' });
        const X = S.room('X', 5, 3, 5, { theme: 'blue', label: 'X' });
        const Y = S.room('Y', 5, 3, 5, { theme: 'warm', label: 'Y' });
        const G = S.room('G', 4, 3, 4, { theme: 'green', label: '출구' });
        const P = S.portal(M, 'N', { at: 3.5, sym: 8 });
        const xs = S.portal(X, 'S', { at: 2.5, sym: 2 }), ys = S.portal(Y, 'S', { at: 2.5, sym: 1 });
        xs.link = P.idx; ys.link = P.idx;
        S.switcher(P, 's', xs, ys);
        S.lever(M, 1.5, 3.5, { sig: 's', portal: P });
        S.cube(X, 2.5, 2.5);
        S.plate(Y, 2.5, 3, { sig: 'p' });
        S.door(M, 'E', { at: 3.5, cond: 'p', sym: 3 }, G, 'W', { at: 2 });
        S.core(G, 2, 2);
    },
    start: { room: 'M', x: 3.5, z: 1.5, yaw: 0 },
});

// 14 --------------------------------------------------------------
add({
    name: '보지 않으면 바뀐다', zone: Z4, goal: '흰 문은 눈을 떼는 순간 다음 방으로 바뀝니다. Y의 판에 큐브를.',
    hints: ['흰 문틀의 색이 지금 이어진 방입니다 (파랑 X, 주황 Y, 보라 Z).', '문이 시야에서 사라질 때마다 X → Y → Z → X 순서로 바뀝니다.', 'X에서 큐브를 들고 나와 문을 한 번 바라보면 Y로 바뀌어 있습니다. 그대로 들어가 판에 놓으세요.'],
    build(S) {
        const H = S.room('H', 7, 3, 7, { theme: 'dark', label: '관측실' });
        const X = S.room('X', 5, 3, 5, { theme: 'blue', label: 'X' });
        const Y = S.room('Y', 5, 3, 5, { theme: 'warm', label: 'Y' });
        const Z = S.room('Z', 5, 3, 5, { theme: 'violet', label: 'Z' });
        const O = S.portal(H, 'N', { at: 3.5, sym: 8 });
        const xs = S.portal(X, 'S', { at: 2.5, sym: 2 }), ys = S.portal(Y, 'S', { at: 2.5, sym: 1 }), zs = S.portal(Z, 'S', { at: 2.5, sym: 4 });
        xs.link = O.idx; ys.link = O.idx; zs.link = O.idx;
        S.observed(O, [xs, ys, zs]);
        S.cube(X, 2.5, 2.5);
        S.plate(Y, 2.5, 3, { sig: 'p' });
        S.core(Y, 4, 4.2, { cond: 'p' });
        S.record(Z, 2.5, 0.4, 3);
        S.lamp(H, 3.5, 2.6, 6.85, { d: 0.15, color: [240, 240, 240] });
    },
    start: { room: 'H', x: 3.5, z: 2, yaw: 0 },
});

// 15 --------------------------------------------------------------
add({
    name: '앞과 뒤', zone: Z4, goal: '방 가운데 문틀은 앞과 뒤가 서로 다른 방으로 이어집니다.',
    hints: ['문틀 옆으로 돌아가면 그냥 방이 보입니다. 통과하는 방향이 중요합니다.', '북쪽에서 남쪽으로 지나면 빨간 방, 남쪽에서 북쪽으로 지나면 파란 방입니다.', '빨간 방의 큐브를 들고 나와 문틀을 돌아 남쪽에서 다시 지나가 파란 방의 판에 놓으세요.'],
    build(S) {
        const H = S.room('H', 9, 3.5, 9, { theme: 'white', label: '문틀의 방' });
        const R = S.room('R', 5, 3, 5, { theme: 'red', label: '빨간 방' });
        const B = S.room('B', 6, 3, 6, { theme: 'blue', label: '파란 방' });
        const [front, back] = S.frame(H, 4.5, 4.5, { facing: '+z', sym: 8 });
        S.link(front, S.portal(R, 'N', { at: 2.5, sym: 9 }));
        S.link(back, S.portal(B, 'S', { at: 3, sym: 2 }));
        S.cube(R, 2.5, 2.0);
        S.plate(B, 3, 3, { sig: 'p' });
        S.core(B, 5, 5, { cond: 'p' });
    },
    start: { room: 'H', x: 4.5, z: 8, yaw: 180 },
});

// 16 --------------------------------------------------------------
add({
    name: '빛의 길', zone: Z4, goal: 'X와 Y의 수신기를 차례로 켜세요. X의 불빛은 12초 동안 남습니다.',
    hints: ['레이저는 동쪽 문을 지나 지금 이어진 방으로 갑니다.', 'X의 거울을 E로 돌려 빛을 수신기로 보내세요. 레버는 문 앞이 비어 있어야 움직입니다.', 'X의 거울을 돌린 뒤 돌아와 레버로 문을 Y로 바꾸고, 12초 안에 코어를 가져가세요.'],
    build(S) {
        S.logic('h1', ['r1'], { hold: 12 });
        S.logic('done', ['h1', 'r2']);
        const A = S.room('A', 8, 3, 8, { theme: 'lab', label: '발사실' });
        const X = S.room('X', 6, 3, 6, { theme: 'mint', label: 'X' });
        const Y = S.room('Y', 6, 3, 6, { theme: 'warm', label: 'Y' });
        const ped = [90, 96, 108];
        S.block(A, 1.5, 4, { w: 0.5, d: 0.5, h: 1.0, color: ped });
        S.emitter(A, 1.5, 1.0, 4, '+x');
        const P = S.portal(A, 'E', { at: 4, sym: 8 });
        const xw = S.portal(X, 'W', { at: 3, sym: 6 }), yw = S.portal(Y, 'W', { at: 3, sym: 1 });
        xw.link = P.idx; yw.link = P.idx;
        S.switcher(P, 's', xw, yw);
        S.lever(A, 4, 1.5, { sig: 's', portal: P });
        S.block(X, 3, 3, { w: 0.5, d: 0.5, h: 1.0, color: ped });
        S.reflector(X, 3, 1.0, 3, 1);
        S.block(X, 3, 5.2, { w: 0.45, d: 0.45, h: 1.0, color: ped });
        S.receiver(X, 3, 1.0, 5.2, { sig: 'r1' });
        S.block(Y, 5, 3, { w: 0.45, d: 0.45, h: 1.0, color: ped });
        S.receiver(Y, 5, 1.0, 3, { sig: 'r2' });
        S.lamp(A, 7.85, 2.6, 1.5, { cond: 'h1', w: 0.15 });
        S.lamp(A, 7.85, 2.6, 6.5, { cond: 'r2', w: 0.15 });
        S.core(A, 6.5, 6.5, { cond: 'done' });
    },
    start: { room: 'A', x: 4, z: 3, yaw: 90 },
});

// 17 --------------------------------------------------------------
add({
    name: '다섯 모퉁이', zone: Z5, goal: '복도를 돌며 모퉁이마다 있는 레버를 모두 켜세요.',
    hints: ['오른쪽으로 네 번 꺾으면 제자리로 돌아올까요?', '이 고리는 직각 모퉁이 다섯 개로 닫혀 있습니다. 평평한 세계라면 네 개면 충분하지요.', '북쪽으로 걷다가 모퉁이에서 오른쪽(동쪽)으로. 다섯 모퉁이의 레버를 모두 켜고 시작 방으로.'],
    build(S) {
        S.logic('a', ['s1', 's2', 's3', 's4']);
        S.logic('all', ['a', 's5']);
        const A = S.room('A', 6, 3, 8, { theme: 'lab', label: '광장 입구' });
        const themes = ['red', 'gold', 'green', 'blue', 'violet'];
        const K = [], C = [];
        for (let i = 0; i < 5; i++) {
            K.push(S.room('K' + (i + 1), 2.4, 3, 8, { theme: 'white', label: `복도 ${i + 1}` }));
            C.push(S.room('C' + (i + 1), 4, 3, 4, { theme: themes[i], label: `모퉁이 ${i + 1}` }));
        }
        S.door(A, 'E', { at: 4 }, K[0], 'W', { at: 4 });
        for (let i = 0; i < 5; i++) {
            S.door(K[i], 'N', { at: 1.2, sym: i + 1 }, C[i], 'S', { at: 2 });
            S.door(C[i], 'E', { at: 2, sym: ((i + 1) % 5) + 1 }, K[(i + 1) % 5], 'S', { at: 1.2 });
            S.lever(C[i], 1.0, 3.0, { sig: 's' + (i + 1) });
            S.lamp(A, 0.15, 2.3, 2 + i, { cond: 's' + (i + 1), w: 0.15 });
        }
        S.core(A, 2, 4, { cond: 'all' });
    },
    start: { room: 'A', x: 3, z: 4, yaw: 90 },
});

// 18 --------------------------------------------------------------
add({
    name: '작은 행성', zone: Z5, goal: '이 방은 동서·남북이 서로 이어진 작은 세계입니다. 빛을 수신기에.',
    hints: ['동쪽 문으로 나가면 서쪽 문으로 들어옵니다. 빛도 마찬가지입니다.', '수신기 앞은 벽으로 막혀 있습니다. 반대쪽에서 빛이 오게 하세요.', '거울을 돌려 빛을 북쪽으로 보내세요. 세계를 한 바퀴 돌아 수신기의 뒤쪽에 닿습니다.'],
    build(S) {
        const T = S.room('T', 8, 3, 8, { theme: 'mint', label: '작은 행성' });
        S.link(S.portal(T, 'W', { at: 4, w: 2.4, h: 2.6, sym: 6 }), S.portal(T, 'E', { at: 4, w: 2.4, h: 2.6, sym: 6 }));
        S.link(S.portal(T, 'S', { at: 4, w: 2.4, h: 2.6, sym: 5 }), S.portal(T, 'N', { at: 4, w: 2.4, h: 2.6, sym: 5 }));
        S.emitter(T, 2, 0, 2, '+x');
        S.reflector(T, 5, 0, 2, 1);
        S.block(T, 5, 1.475, { w: 0.7, d: 0.25, h: 1.2, color: [120, 140, 150] });
        S.receiver(T, 5, 0, 1.0, { sig: 'r' });
        S.core(T, 6.5, 6.5, { cond: 'r' });
    },
    start: { room: 'T', x: 4, z: 5.5, yaw: 180 },
});

// 19 --------------------------------------------------------------
add({
    name: '끝없는 우물', zone: Z5, goal: '높은 서쪽 선반 위의 코어를 가져오세요.',
    hints: ['바닥의 구멍은 같은 방의 천장으로 이어집니다.', '떨어지는 동안에도 조금은 방향을 바꿀 수 있습니다. 떨어질 때의 속도도 그대로입니다.', '서쪽을 보고 걸어서 구멍에 들어가세요. W를 누른 채로 천장에서 나오면 서쪽 선반에 내려앉습니다.'],
    build(S) {
        const W = S.room('W', 6, 12, 6, { theme: 'stone', label: '우물' });
        S.link(S.portal(W, 'F', { at: [3, 3], w: 2, h: 2, sym: 6 }), S.portal(W, 'C', { at: [3, 3], w: 2, h: 2, sym: 6 }));
        S.block(W, 0.8, 3, { y: 7.6, w: 1.6, d: 2, h: 0.4, color: [130, 120, 104] });
        S.core(W, 0.8, 3, { y: 8.3 });
        S.block(W, 5.2, 3, { y: 4.6, w: 1.6, d: 2, h: 0.4, color: [130, 120, 104] });
        S.record(W, 5.3, 5.4, 3);
    },
    start: { room: 'W', x: 5, z: 3, yaw: 270 },
});

// 20 --------------------------------------------------------------
add({
    name: '안이 더 큰 상자', zone: Z5, goal: '작은 상자 안으로 들어가 코어를 찾으세요.',
    hints: ['상자 둘레를 걸어 보세요. 안은 밖보다 훨씬 큽니다.', '큰 방 안에도 같은 상자가 있습니다.', '상자의 남쪽 문 → 큰 방 가운데 상자의 남쪽 문 → 더 큰 방의 코어.'],
    build(S) {
        const A = S.room('A', 9, 3, 9, { theme: 'lab', label: '창고' });
        const B = S.room('B', 16, 6, 16, { theme: 'white', label: '상자 속' });
        const C = S.room('C', 24, 8, 24, { theme: 'gold', label: '상자 속의 상자' });
        S.link(S.booth(A, 4.5, 4.5, { w: 1.4, d: 1.4, h: 2.6, face: '-z', dw: 0.9, dh: 2.1, sym: 2 }), S.portal(B, 'S', { at: 8, w: 0.9, h: 2.1, sym: 2 }));
        S.link(S.booth(B, 8, 12, { w: 1.4, d: 1.4, h: 2.6, face: '-z', dw: 0.9, dh: 2.1, sym: 5, color: [170, 140, 60] }), S.portal(C, 'S', { at: 12, w: 0.9, h: 2.1, sym: 5 }));
        S.block(C, 12, 14, { w: 1, d: 1, h: 0.5, color: [150, 124, 60] });
        S.core(C, 12, 14, { y: 0.8 });
    },
    start: { room: 'A', x: 4.5, z: 1.5, yaw: 0 },
});

// 21 --------------------------------------------------------------
add({
    name: '거울 속 방', zone: Z5, goal: '서쪽 벽은 거울처럼 보입니다. 정말 거울일까요?',
    hints: ['거울에 비친 방에는 있어야 할 것이 없고, 없어야 할 것이 있습니다.', '거울에 당신은 비치지 않습니다. 그 벽은 문입니다.', '거울로 걸어 들어가 그쪽의 큐브를 가져와 이 방의 판에 놓으세요.'],
    build(S) {
        const A = S.room('A', 6, 3, 8, { theme: 'white', label: '거울 방' });
        const M = S.room('M', 6, 3, 8, { theme: 'white', label: '거울 속' });
        S.link(S.portal(A, 'W', { at: 4, w: 8, h: 3, noframe: 1 }), S.portal(M, 'W', { at: 4, w: 8, h: 3, noframe: 1 }));
        // M is A seen in a mirror: (x, z) in A is (x, 8 - z) in M
        const pillar = [150, 160, 176];
        S.block(A, 5, 2, { w: 1, d: 1, h: 2, color: pillar });
        S.block(M, 5, 6, { w: 1, d: 1, h: 2, color: pillar });
        S.plate(A, 3.5, 6, { sig: 'p' });
        S.plate(M, 3.5, 2, { sig: 'p2' });
        S.lamp(A, 5.85, 2.5, 4, { cond: 'p', w: 0.15 });
        S.lamp(M, 5.85, 2.5, 4, { cond: 'p2', w: 0.15 });
        S.cube(M, 2, 3);
        S.record(M, 1.2, 0.3, 1.2);
        S.core(A, 5, 4, { cond: 'p' });
    },
    start: { room: 'A', x: 3, z: 4, yaw: 270 },
});

// 22 --------------------------------------------------------------
add({
    name: '세 갈래 심장', zone: Z6, goal: '세 조건을 함께: 반복 복도 계수기 2 이상, T의 판, T의 수신기.',
    hints: ['북쪽은 반복 복도 L, 동쪽 작은 문은 크기 변환실 S, 서쪽은 전환실 T입니다.', 'S에서 큰 큐브를 들고 나오면 보통 크기가 됩니다. T의 레버는 창문의 연결을 바꿉니다.', 'L을 북쪽으로 두 번 돌고, S의 큐브를 T의 판에, T의 레버를 켜서 L의 빛을 T로. 그리고 중앙의 코어.'],
    build(S) {
        S.counter('c', { target: 2, out: 'c2' });
        S.logic('all', ['p', 'r', 'c2']);
        const H = S.room('H', 8, 3.5, 8, { theme: 'dark', label: '심장' });
        const L = S.room('L', 3, 3, 12, { theme: 'white', label: 'L 반복 복도' });
        const Sx = S.room('S', 8, 8, 8, { theme: 'stone', label: 'S 크기 변환실' });
        const T = S.room('T', 6, 3, 6, { theme: 'warm', label: 'T 전환실' });
        S.door(H, 'N', { at: 4, sym: 8 }, L, 'W', { at: 2 });
        S.link(S.portal(L, 'N', { at: 1.5, w: 3, h: 3, count: 'c', noframe: 1 }), S.portal(L, 'S', { at: 1.5, w: 3, h: 3, noframe: 1 }));
        S.link(S.portal(H, 'E', { at: 4, w: 1, h: 2, sym: 5 }), S.portal(Sx, 'W', { at: 4, w: 2, h: 4, sym: 5 }));
        S.door(H, 'W', { at: 4, sym: 1 }, T, 'E', { at: 3 });
        const ped = [90, 96, 108];
        S.block(L, 2.6, 8, { w: 0.5, d: 0.5, h: 1.0, color: ped });
        S.emitter(L, 2.6, 1.0, 8, '-x');
        const lw = S.portal(L, 'W', { at: 8, y: 0.8, w: 1, h: 1, glass: 1, cond: 'lv', sym: 9 });
        const sw = S.portal(Sx, 'N', { at: 4, y: 1.6, w: 2, h: 2, glass: 1, cond: '!lv', sym: 5 });
        const tw = S.portal(T, 'N', { at: 3, y: 0.8, w: 1, h: 1, glass: 1, sym: 8 });
        lw.link = tw.idx; sw.link = tw.idx;
        S.switcher(tw, 'lv', sw, lw);
        S.cube(Sx, 4, 4, { scale: 2 });
        S.block(T, 3, 2.5, { w: 0.45, d: 0.45, h: 1.0, color: ped });
        S.receiver(T, 3, 1.0, 2.5, { sig: 'r' });
        S.plate(T, 1.5, 4, { sig: 'p' });
        S.lever(T, 5, 4.5, { sig: 'lv', portal: tw });
        S.lamp(H, 7.85, 2.9, 2.5, { cond: 'c2', w: 0.15 });
        S.lamp(H, 7.85, 2.9, 4.0, { cond: 'p', w: 0.15 });
        S.lamp(H, 7.85, 2.9, 5.5, { cond: 'r', w: 0.15 });
        S.core(H, 6, 6, { cond: 'all' });
    },
    start: { room: 'H', x: 4, z: 2, yaw: 0 },
});

// 23 --------------------------------------------------------------
add({
    name: '렌즈와 거울', zone: Z6, goal: '빛을 세 방에 걸쳐 C의 수신기까지 보내세요.',
    hints: ['같은 모양 패널끼리만 이어집니다. □ 하나, ○ 하나가 필요합니다.', 'B의 두 거울은 빛을 한 번씩 꺾어야 합니다. E로 돌립니다.', 'A 북쪽 □ ↔ B 서쪽 □, B의 두 거울을 돌리고, B 동쪽 ○ ↔ C 남쪽 ○.'],
    build(S) {
        const A = S.room('A', 8, 3, 8, { theme: 'lab', label: 'A' });
        const B = S.room('B', 6, 3, 6, { theme: 'mint', label: 'B' });
        const C = S.room('C', 6, 3, 6, { theme: 'violet', label: 'C' });
        const ped = [90, 96, 108];
        S.block(A, 1, 1, { w: 0.5, d: 0.5, h: 1.0, color: ped });
        S.emitter(A, 1, 1.0, 1, '+z');
        S.portal(A, 'N', { at: 1, y: 0.4, w: 1.2, h: 1.6, lens: 1, shape: 3, sym: 2 });
        S.portal(A, 'E', { at: 6, y: 0.4, w: 1.2, h: 1.6, lens: 1, shape: 3, sym: 2 });
        S.portal(A, 'W', { at: 6, y: 0.4, w: 1.2, h: 1.6, lens: 1, shape: 2, sym: 6 });
        S.door(A, 'N', { at: 5 }, B, 'S', { at: 3 });
        S.portal(B, 'W', { at: 1.5, y: 0.4, w: 1.2, h: 1.6, lens: 1, shape: 3, sym: 2 });
        S.portal(B, 'E', { at: 4.5, y: 0.4, w: 1.2, h: 1.6, lens: 1, shape: 2, sym: 6 });
        S.block(B, 3, 1.5, { w: 0.5, d: 0.5, h: 1.0, color: ped });
        S.reflector(B, 3, 1.0, 1.5, 1);
        S.block(B, 3, 4.5, { w: 0.5, d: 0.5, h: 1.0, color: ped });
        S.reflector(B, 3, 1.0, 4.5, 1);
        S.door(B, 'N', { at: 1.5 }, C, 'S', { at: 4.5 });
        S.portal(C, 'S', { at: 1.5, y: 0.4, w: 1.2, h: 1.6, lens: 1, shape: 2, sym: 6 });
        S.block(C, 1.5, 4, { w: 0.45, d: 0.45, h: 1.0, color: ped });
        S.receiver(C, 1.5, 1.0, 4, { sig: 'r' });
        S.core(A, 6.5, 4, { cond: 'r' });
    },
    start: { room: 'A', x: 5, z: 2, yaw: 0 },
});

// 24 --------------------------------------------------------------
add({
    name: '중앙 제어실', zone: Z6, goal: '반복 복도를 정확히 3번, 작은 큐브를 틈 안의 판에. 그리고 결말을 고르세요.',
    hints: ['서쪽은 반복 복도, 남쪽 큰 문은 동쪽 작은 구멍으로 이어집니다.', '큐브를 든 채 남쪽 큰 문으로 들어가면 함께 작아집니다. 복도 계수기는 정확히 3이어야 합니다.', '북쪽 문이 열리면 레버로 결말을 고릅니다. 기록 5개를 모두 찾았다면 "복구"를 고를 수 있습니다.'],
    build(S) {
        S.counter('c', { target: 3, out: 'c3', exact: true });
        S.logic('all', ['c3', 'p']);
        const F = S.room('F', 10, 4, 10, { theme: 'gold', label: '중앙 제어실' });
        const L = S.room('L', 3, 3, 10, { theme: 'white', label: '반복 복도' });
        const E = S.room('E', 6, 3, 6, { theme: 'violet', label: '결말' });
        S.door(F, 'W', { at: 7 }, L, 'E', { at: 5 });
        S.link(S.portal(L, 'N', { at: 1.5, w: 3, h: 3, count: 'c', noframe: 1 }), S.portal(L, 'S', { at: 1.5, w: 3, h: 3, noframe: 1 }));
        S.link(S.portal(F, 'S', { at: 7, w: 1.6, h: 2.4, sym: 1 }), S.portal(F, 'E', { at: 2, w: 0.4, h: 0.6, sym: 1 }));
        const col = [120, 104, 70];
        S.block(F, 2.5, 1.5, { w: 2.2, d: 0.2, h: 1.4, color: col });
        S.block(F, 2.5, 3.5, { w: 2.2, d: 0.2, h: 1.4, color: col });
        S.block(F, 1.5, 2.5, { w: 0.2, d: 1.8, h: 1.4, color: col });
        S.block(F, 3.5, 1.975, { w: 0.2, d: 0.75, h: 1.4, color: col });
        S.block(F, 3.5, 3.025, { w: 0.2, d: 0.75, h: 1.4, color: col });
        S.plate(F, 2.5, 2.5, { sig: 'p', size: 0.8, cubeOnly: 1 });
        S.cube(F, 6, 5);
        for (let i = 0; i < 5; i++) S.lamp(F, 3 + i, 3.2, 9.85, { d: 0.15 });
        S.door(F, 'N', { at: 5, cond: 'all', sym: 3 }, E, 'S', { at: 3 });
        S.lever(E, 2, 4, { ending: 1, color: [70, 76, 90] });
        S.lever(E, 4, 4, { ending: 2, color: [130, 100, 170] });
    },
    start: { room: 'F', x: 5, z: 8, yaw: 180 },
});

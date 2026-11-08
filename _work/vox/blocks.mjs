// Build-time data: blocks, 8x8 textures, items, icons, recipes, smelting, mob models.
// Everything here becomes lists in the project (see build.mjs).

// ------------------------------------------------------------------ textures (8 x 8, '.' = clear)
// The first palette letter that is most common is the face's base colour near by; far away a
// face is drawn in the texture's average colour.
export const TEX = {
    stone: { p: { a: '7f7f7f', b: '6c6c6c', c: '919191' }, g: ['aaabaaaa', 'abbaacaa', 'aaaaaaab', 'acaabaaa', 'aaaaaacc', 'baacaaaa', 'aaaaabba', 'aacaaaaa'] },
    dirt: { p: { a: '8a6142', b: '6f4d33', c: '9c7351' }, g: ['aabaaaca', 'aaaaaaaa', 'acaabaaa', 'aaaaaaab', 'baaacaaa', 'aaaaaaaa', 'aacaaaba', 'abaaaaaa'] },
    grassTop: { p: { a: '64a53a', b: '558f30', c: '73b847' }, g: ['aabaaaca', 'acaaabaa', 'aaaaaaaa', 'abaacaab', 'aaaaaaaa', 'acaabaaa', 'aaabaaca', 'baaaaaaa'] },
    grassSide: { p: { d: '8a6142', g: '64a53a', b: '6f4d33', h: '558f30' }, g: ['gghggggh', 'ggggdggg', 'dgddddgd', 'dddddddd', 'ddbddddd', 'dddddbdd', 'dddddddd', 'dbdddddd'] },
    snowTop: { p: { a: 'f2f6f8', b: 'dfe7ec' }, g: ['aaaaaaaa', 'aabaaaaa', 'aaaaaaba', 'aaaaaaaa', 'abaaaaaa', 'aaaaabaa', 'aaaaaaaa', 'aaabaaaa'] },
    snowSide: { p: { d: '8a6142', s: 'f2f6f8', b: '6f4d33' }, g: ['ssssssss', 'sssdssss', 'dsddsdsd', 'dddddddd', 'ddbddddd', 'dddddbdd', 'dddddddd', 'dbdddddd'] },
    cobble: { p: { a: '7a7a7a', b: '595959', c: '999999' }, g: ['baacbaab', 'aacaabaa', 'bbaabbac', 'acabaaab', 'abbaacab', 'caabbaab', 'aacaabca', 'bbaabaab'] },
    mossy: { p: { a: '7a7a7a', b: '595959', m: '4f7a35' }, g: ['bammbaab', 'amaaabaa', 'bbaabbma', 'aaabaamb', 'abbmaaab', 'amabbaab', 'mmaaabaa', 'bbaabamb'] },
    planks: { p: { a: 'a7834f', b: '8c6b3c', c: 'b8945d' }, g: ['aacaaaaa', 'aaaaacaa', 'bbbbbbbb', 'aaaaaaca', 'acaaaaaa', 'bbbbbbbb', 'aaaacaaa', 'aaaaaaab'] },
    bedrock: { p: { a: '555555', b: '303030', c: '777777' }, g: ['abacabba', 'bbaabcab', 'acbbaabb', 'baabcaba', 'abbaabbc', 'cabbaaba', 'abcababb', 'bbaabbac'] },
    water: { p: { a: '2f5fc8', b: '3a6fd8' }, g: ['aaaaaaaa', 'aabbaaaa', 'aaaaaaaa', 'aaaaabba', 'aaaaaaaa', 'abbaaaaa', 'aaaaaaaa', 'aaaaaabb'] },
    lava: { p: { a: 'd8540f', b: 'f08a1a', c: 'b23a08' }, g: ['aabbaaca', 'abbbaaaa', 'aaaaacaa', 'caaabbaa', 'aaabbbaa', 'aacaaaab', 'baaaacaa', 'bbaaaaaa'] },
    sand: { p: { a: 'dbcf9f', b: 'c9bb88', c: 'e7dcb0' }, g: ['aaaaabaa', 'acaaaaaa', 'aaaabaac', 'aaaaaaaa', 'abaaacaa', 'aaaaaaaa', 'aacaaaba', 'baaaaaaa'] },
    sandstoneTop: { p: { a: 'd8c995', b: 'c8b884' }, g: ['aaaaaaaa', 'aabaaaaa', 'aaaaaaba', 'aaaaaaaa', 'abaaaaaa', 'aaaaabaa', 'aaaaaaaa', 'aaabaaaa'] },
    sandstoneSide: { p: { a: 'd8c995', b: 'b8a774', c: 'e6d9aa' }, g: ['cccccccc', 'aaaaaaaa', 'bbbbbbbb', 'aaaaaaaa', 'aabaaaaa', 'aaaaaaba', 'bbbbbbbb', 'aaaaaaaa'] },
    gravel: { p: { a: '857f7b', b: '6a6461', c: 'a39d97', d: '7a6a5c' }, g: ['abacadab', 'cabbacda', 'abdacaab', 'bacabdac', 'adabcaab', 'cabdabca', 'abacabda', 'dcabacab'] },
    clay: { p: { a: 'a0a6b3', b: '9097a5' }, g: ['aaaaaaaa', 'aabaaaaa', 'aaaaaaba', 'aaaaaaaa', 'abaaaaaa', 'aaaaabaa', 'aaaaaaaa', 'aaabaaaa'] },
    oreCoal: { p: { a: '7f7f7f', b: '6c6c6c', k: '262626' }, g: ['aaabaaaa', 'akkaaaaa', 'akkaakka', 'aaaaakka', 'aaaaaaaa', 'baakkaab', 'aaakkaaa', 'aaaaaaaa'] },
    oreIron: { p: { a: '7f7f7f', b: '6c6c6c', k: 'd6a98a' }, g: ['aaabaaaa', 'akkaaaaa', 'aakaakka', 'aaaaaaka', 'aaaaaaaa', 'baakkaab', 'aaaakaaa', 'aaaaaaaa'] },
    oreGold: { p: { a: '7f7f7f', b: '6c6c6c', k: 'f2d23a' }, g: ['aaabaaaa', 'aakaaaaa', 'akkaaaka', 'aaaaakka', 'aaaaaaaa', 'baakaaab', 'aaakkaaa', 'aaaaaaaa'] },
    oreDiamond: { p: { a: '7f7f7f', b: '6c6c6c', k: '5fe3dc' }, g: ['aaabaaaa', 'akaaaaaa', 'akkaaaka', 'aaaaakka', 'aaaaaaaa', 'baakkaab', 'aaaakaaa', 'aaaaaaaa'] },
    oreLapis: { p: { a: '7f7f7f', b: '6c6c6c', k: '2341a8' }, g: ['aaabaaaa', 'aakkaaaa', 'akaaaaka', 'aaaaakka', 'aaaaaaaa', 'baakkaab', 'aaakaaaa', 'aaaaaaaa'] },
    logOakSide: { p: { a: '6b5233', b: '54402a', c: '7b6040' }, g: ['abaacaba', 'abaacaba', 'abacaaba', 'aba.caba', 'abaacaba', 'acaacaba', 'abaacaba', 'abaacaca'].map(r => r.replace('.', 'a')) },
    logOakTop: { p: { a: 'b08b56', b: '8a6a3e', c: '6b5233' }, g: ['cccccccc', 'caaaaaac', 'cabbbbac', 'cabaabac', 'cabaabac', 'cabbbbac', 'caaaaaac', 'cccccccc'] },
    logBirchSide: { p: { a: 'dcd8cc', b: '2e2e2e', c: 'c4c0b4' }, g: ['aaaaaaaa', 'abbaaaca', 'aaaaaaaa', 'aaaacbba', 'aaaaaaaa', 'acaaaaaa', 'bbaaaaab', 'aaaaacaa'] },
    logBirchTop: { p: { a: 'c9b583', b: 'a8956a', c: 'dcd8cc' }, g: ['cccccccc', 'caaaaaac', 'cabbbbac', 'cabaabac', 'cabaabac', 'cabbbbac', 'caaaaaac', 'cccccccc'] },
    logSpruceSide: { p: { a: '4a3520', b: '3a2918', c: '5a4229' }, g: ['abaacaba', 'abaacaba', 'abacaaba', 'abaacaba', 'abaacaba', 'acaacaba', 'abaacaba', 'abaacaca'] },
    logSpruceTop: { p: { a: '7a5c38', b: '5f462a', c: '4a3520' }, g: ['cccccccc', 'caaaaaac', 'cabbbbac', 'cabaabac', 'cabaabac', 'cabbbbac', 'caaaaaac', 'cccccccc'] },
    leavesOak: { p: { a: '3f8a2a', b: '2f6b1f', c: '4f9d36' }, g: ['abacabaa', 'aaabaaca', 'cabaabaa', 'abaacaab', 'aacabaaa', 'baaaabca', 'abcaaaba', 'aabacaab'] },
    leavesBirch: { p: { a: '6aa046', b: '558a35', c: '7ab357' }, g: ['abacabaa', 'aaabaaca', 'cabaabaa', 'abaacaab', 'aacabaaa', 'baaaabca', 'abcaaaba', 'aabacaab'] },
    leavesSpruce: { p: { a: '30553a', b: '22422b', c: '3c6646' }, g: ['abacabaa', 'aaabaaca', 'cabaabaa', 'abaacaab', 'aacabaaa', 'baaaabca', 'abcaaaba', 'aabacaab'] },
    glass: { p: { w: 'dbeef5', s: 'ffffff' }, g: ['wwwwwwww', 'w......w', 'w.s....w', 'w..s...w', 'w......w', 'w......w', 'w......w', 'wwwwwwww'] },
    craftTop: { p: { a: 'a7834f', b: '6b4f2c', c: 'b8945d' }, g: ['bbbbbbbb', 'baabaabb', 'bacbacab', 'bbbbbbbb', 'baabcabb', 'bacbaaab', 'baabaabb', 'bbbbbbbb'] },
    craftSide: { p: { a: 'a7834f', b: '6b4f2c', g: '8f8f8f', h: '6b5233' }, g: ['bbbbbbbb', 'aaaaaaaa', 'aggaahaa', 'aghaahaa', 'aahaagga', 'aahaahga', 'aaaaaaaa', 'bbbbbbbb'] },
    furnaceSide: { p: { a: '7c7c7c', b: '5c5c5c', c: '8c8c8c' }, g: ['cccccccc', 'aaaaaaab', 'abaaaaaa', 'aaaaaaba', 'aaaabaaa', 'aaaaaaaa', 'baaaaaab', 'bbbbbbbb'] },
    furnaceFront: { p: { a: '7c7c7c', b: '5c5c5c', k: '2a2a2a', c: '8c8c8c' }, g: ['cccccccc', 'aaaaaaaa', 'abbbbbba', 'abkkkkba', 'abkkkkba', 'abbbbbba', 'aaaaaaaa', 'bbbbbbbb'] },
    furnaceTop: { p: { a: '7c7c7c', b: '6a6a6a' }, g: ['aaaaaaaa', 'abaaaaba', 'aaaaaaaa', 'aaabaaaa', 'aaaaabaa', 'aaaaaaaa', 'abaaaaba', 'aaaaaaaa'] },
    cactusSide: { p: { a: '3f7d2a', b: '2d5e1e', c: '5a9a3f' }, g: ['abacabac', 'abaaabaa', 'abacabac', 'abaaabaa', 'abacabac', 'abaaabaa', 'abacabac', 'abaaabaa'] },
    cactusTop: { p: { a: '4a8a32', b: '2d5e1e', c: '6aaa4a' }, g: ['bbbbbbbb', 'baaaaaab', 'bacaacab', 'baacaaab', 'baaacaab', 'bacaacab', 'baaaaaab', 'bbbbbbbb'] },
    wool: { p: { a: 'e8e8e8', b: 'd4d4d4' }, g: ['aabaaaba', 'abaabaaa', 'aaabaaab', 'baaaabaa', 'aabaaaba', 'abaabaaa', 'aaabaaab', 'baaaabaa'] },
    ice: { p: { a: '9cc1f5', b: 'b8d4fa', c: '8ab0e8' }, g: ['aaaaaaab', 'aaaaaaba', 'aaaaabaa', 'caaabaaa', 'acabaaaa', 'aacaaaaa', 'aaacaaaa', 'baaacaaa'] },
    obsidian: { p: { a: '1b1626', b: '2c2440', c: '120f1a' }, g: ['abaacaab', 'aacabaaa', 'baaaacab', 'aabacaaa', 'acaaabca', 'baaaaaab', 'aacabaac', 'abaaacaa'] },
    chestSide: { p: { a: '9c6a2c', b: '6b4518', k: '3a2810', g: 'c9c9c9' }, g: ['bbbbbbbb', 'baaaaaab', 'baaaaaab', 'kkkggkkk', 'baaggaab', 'baaaaaab', 'baaaaaab', 'bbbbbbbb'] },
    chestTop: { p: { a: '9c6a2c', b: '6b4518' }, g: ['bbbbbbbb', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'baaaaaab', 'bbbbbbbb'] },
    stoneBricks: { p: { a: '7d7d7d', b: '5a5a5a', c: '8f8f8f' }, g: ['aaacaaab', 'aaaaaaab', 'aacaaaab', 'bbbbbbbb', 'aaabaaaa', 'acabaaca', 'aaabaaaa', 'bbbbbbbb'] },
    bricks: { p: { a: '9a4a3a', b: 'c9c0b4', c: 'b05a46' }, g: ['aacabaca', 'bbbbbbbb', 'abacaaca', 'bbbbbbbb', 'aacabaca', 'bbbbbbbb', 'abacaaca', 'bbbbbbbb'] },
    blockIron: { p: { a: 'dcdcdc', b: 'bdbdbd', c: 'f0f0f0' }, g: ['cccccccc', 'caaaaaab', 'caaaaaab', 'cabbaaab', 'caaaaaab', 'caaaabab', 'caaaaaab', 'bbbbbbbb'] },
    blockGold: { p: { a: 'f2d23a', b: 'd1ab1f', c: 'fbe98a' }, g: ['cccccccc', 'caaaaaab', 'caaaaaab', 'cabbaaab', 'caaaaaab', 'caaaabab', 'caaaaaab', 'bbbbbbbb'] },
    blockDiamond: { p: { a: '64e0d8', b: '3fb8b0', c: 'a8f4ef' }, g: ['cccccccc', 'caaaaaab', 'caaaaaab', 'cabbaaab', 'caaaaaab', 'caaaabab', 'caaaaaab', 'bbbbbbbb'] },
    blockLapis: { p: { a: '2a4cb8', b: '1e3a90', c: '4a6ad0' }, g: ['cccccccc', 'caaaaaab', 'cabaaaab', 'caaaacab', 'caacaaab', 'caaaabab', 'caaaaaab', 'bbbbbbbb'] },
    tallGrass: { p: { g: '5f9e3a', h: '4b8a2c' }, g: ['........', '..g...h.', '..g..h..', '.hg..h.g', '.h.g.hg.', '..hg.hg.', '..hghg..', '...hgh..'] },
    flowerRed: { p: { r: 'd8282a', k: '8a1214', g: '4b8a2c' }, g: ['........', '..rr....', '.rkkr...', '..rr....', '...g....', '...g.g..', '..gg.g..', '...gg...'] },
    flowerYellow: { p: { y: 'f0d020', o: 'd89a10', g: '4b8a2c' }, g: ['........', '...yy...', '..yooy..', '...yy...', '....g...', '..g.g...', '...gg...', '....g...'] },
    sapling: { p: { g: '3f8a2a', h: '2f6b1f', b: '6b5233' }, g: ['...g....', '..ggh...', '.hggg.g.', '..hgggh.', '...hgg..', '....b...', '...bb...', '....b...'] },
    deadBush: { p: { b: '7a5a30' }, g: ['........', '.b....b.', '..b..b..', 'b..bb..b', '.b.bb.b.', '..bbbb..', '...bb...', '...bb...'] },
    // the gate of fire, the ashen depths, the void
    fireVeil: { p: { a: 'e8501a', b: 'ff9a30', c: 'b02810', d: 'ffd060' }, g: ['abacabda', 'bacabaab', 'acabdbac', 'cabaabca', 'abdacaba', 'bacbaabd', 'acabacab', 'dabcabac'] },
    ashstone: { p: { a: '6e4a44', b: '5a3a36', c: '80584f' }, g: ['aabacaba', 'abaaabca', 'caabaaab', 'abacaaba', 'baaabaca', 'aacabaab', 'abaaacba', 'bacabaaa'] },
    ashSand: { p: { a: '4a3a30', b: '3a2c24', c: '5a4838' }, g: ['abaacaba', 'aacabaab', 'baabaaca', 'acaabcaa', 'abaacaab', 'caabaaba', 'aabacaab', 'baacabaa'] },
    glowCrystal: { p: { a: 'f0d880', b: 'fff4c0', c: 'c8a040' }, g: ['abacaabc', 'cabbacab', 'abcaabba', 'bacbacab', 'acabbcaa', 'babacabb', 'cabbaacb', 'abacbbac'] },
    oreFire: { p: { a: '6e4a44', b: '5a3a36', k: 'ff7a1a', y: 'ffd040' }, g: ['aabakaba', 'abkkabaa', 'aakyaaab', 'abaaaaka', 'baaakkaa', 'akaakyab', 'aykaaaba', 'baaabaaa'] },
    blackBricks: { p: { a: '5a2c2e', b: '341618', c: '6c3a3a' }, g: ['aacabaca', 'bbbbbbbb', 'abacaaca', 'bbbbbbbb', 'aacabaca', 'bbbbbbbb', 'abacaaca', 'bbbbbbbb'] },
    basaltSide: { p: { a: '4a4a52', b: '38383e', c: '5c5c64' }, g: ['abacabac', 'abacabac', 'abcaabac', 'abacabac', 'acabbbac', 'abacabac', 'abacabca', 'abacabac'] },
    basaltTop: { p: { a: '4a4a52', b: '38383e', c: '5c5c64' }, g: ['bbbbbbbb', 'baaacaab', 'bacaaaab', 'baaaacab', 'bacaaaab', 'baaacaab', 'baaaaaab', 'bbbbbbbb'] },
    voidStone: { p: { a: 'c8c0d8', b: 'b0a8c4', c: 'dcd4ea' }, g: ['aabacaba', 'abaaabca', 'caabaaab', 'abacaaba', 'baaabaca', 'aacabaab', 'abaaacba', 'bacabaaa'] },
    voidBricks: { p: { a: 'b8aed0', b: '8c84a4', c: 'd0c8e4' }, g: ['aaacaaab', 'aaaaaaab', 'aacaaaab', 'bbbbbbbb', 'aaabaaaa', 'acabaaca', 'aaabaaaa', 'bbbbbbbb'] },
    voidGate: { p: { a: '0c0814', b: '201838', w: 'e8e0ff', p: '8060c0' }, g: ['abaaaaba', 'aaawaaaa', 'abaaapaa', 'aaaaaaba', 'apaabaaa', 'aaaaaawa', 'aabwaaaa', 'baaaabaa'] },
    wardCrystal: { p: { a: 'c040ff', b: 'f0b0ff', c: '8020c0' }, g: ['..abba..', '.abccba.', 'abccccba', 'bccbbccb', 'bccbbccb', 'abccccba', '.abccba.', '..abba..'] },
};
// cracks while a block is being broken: digit = the stage (1..9) it shows from
export const CRACK = ['....3...', '...3..6.', '.12..5..', '..1.4...', '.2.1..8.', '7.21.9..', '..3.2...', '.4...5..'];

// ------------------------------------------------------------------ blocks
// shape 0 cube, 1 cross plant, 2 torch, 3 liquid, 4 see-through cube (glass, drawn by its rects)
// hide 0 see-through (faces behind it are drawn), 1 opaque, 2 water, 3 lava
// lop: blocks light; tool 0 any, 1 pickaxe, 2 axe, 3 shovel; tier: the pickaxe tier it needs to
// drop (-1: none needed); hard: seconds-ish (MC hardness), -1 cannot be broken
export const BLOCKS = [
    null,
    { id: 1, n: 'stone', ko: '돌', t: ['stone'], hard: 1.5, tool: 1, tier: 0, drop: 'cobble' },
    { id: 2, n: 'grass', ko: '잔디 블록', t: ['grassTop', 'grassSide', 'dirt'], hard: 0.6, tool: 3, drop: 'dirt' },
    { id: 3, n: 'dirt', ko: '흙', t: ['dirt'], hard: 0.5, tool: 3 },
    { id: 4, n: 'cobble', ko: '조약돌', t: ['cobble'], hard: 2, tool: 1, tier: 0 },
    { id: 5, n: 'planks', ko: '나무 판자', t: ['planks'], hard: 2, tool: 2, fuel: 15 },
    { id: 6, n: 'bedrock', ko: '기반암', t: ['bedrock'], hard: -1 },
    { id: 7, n: 'water', ko: '물', t: ['water'], hard: -1, shape: 3, hide: 2, solid: 0, lop: 0, drop: 'none' },
    { id: 8, n: 'sand', ko: '모래', t: ['sand'], hard: 0.5, tool: 3, fall: 1 },
    { id: 9, n: 'gravel', ko: '자갈', t: ['gravel'], hard: 0.6, tool: 3, fall: 1 },
    { id: 10, n: 'oreGold', ko: '금광석', t: ['oreGold'], hard: 3, tool: 1, tier: 2 },
    { id: 11, n: 'oreIron', ko: '철광석', t: ['oreIron'], hard: 3, tool: 1, tier: 1 },
    { id: 12, n: 'oreCoal', ko: '석탄 광석', t: ['oreCoal'], hard: 3, tool: 1, tier: 0, drop: 'coal' },
    { id: 13, n: 'logOak', ko: '참나무 원목', t: ['logOakTop', 'logOakSide', 'logOakTop'], hard: 2, tool: 2, fuel: 15 },
    { id: 14, n: 'leavesOak', ko: '참나무 잎', t: ['leavesOak'], hard: 0.2, lop: 0, drop: 'none', leaf: 1 },
    { id: 15, n: 'glass', ko: '유리', t: ['glass'], hard: 0.3, shape: 4, hide: 0, lop: 0, drop: 'none' },
    { id: 16, n: 'oreDiamond', ko: '다이아몬드 광석', t: ['oreDiamond'], hard: 3, tool: 1, tier: 2, drop: 'diamond' },
    { id: 17, n: 'craft', ko: '작업대', t: ['craftTop', 'craftSide', 'planks'], hard: 2.5, tool: 2, fuel: 15 },
    { id: 18, n: 'furnace', ko: '화로', t: ['furnaceTop', 'furnaceFront', 'furnaceTop'], hard: 3.5, tool: 1, tier: 0 },
    { id: 19, n: 'cactus', ko: '선인장', t: ['cactusTop', 'cactusSide', 'cactusTop'], hard: 0.4 },
    { id: 20, n: 'snowGrass', ko: '눈 덮인 잔디', t: ['snowTop', 'snowSide', 'dirt'], hard: 0.6, tool: 3, drop: 'dirt' },
    { id: 21, n: 'sandstone', ko: '사암', t: ['sandstoneTop', 'sandstoneSide', 'sandstoneTop'], hard: 0.8, tool: 1, tier: 0 },
    { id: 22, n: 'clay', ko: '점토', t: ['clay'], hard: 0.6, tool: 3, drop: 'clayBall', dropN: 4 },
    { id: 23, n: 'logBirch', ko: '자작나무 원목', t: ['logBirchTop', 'logBirchSide', 'logBirchTop'], hard: 2, tool: 2, fuel: 15 },
    { id: 24, n: 'leavesBirch', ko: '자작나무 잎', t: ['leavesBirch'], hard: 0.2, lop: 0, drop: 'none', leaf: 1 },
    { id: 25, n: 'logSpruce', ko: '가문비나무 원목', t: ['logSpruceTop', 'logSpruceSide', 'logSpruceTop'], hard: 2, tool: 2, fuel: 15 },
    { id: 26, n: 'leavesSpruce', ko: '가문비나무 잎', t: ['leavesSpruce'], hard: 0.2, lop: 0, drop: 'none', leaf: 1 },
    { id: 27, n: 'torch', ko: '횃불', t: ['planks'], hard: 0, shape: 2, hide: 0, solid: 0, lop: 0, light: 14 },
    { id: 28, n: 'tallGrass', ko: '풀', t: ['tallGrass'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0, drop: 'none' },
    { id: 29, n: 'flowerRed', ko: '빨간 꽃', t: ['flowerRed'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0 },
    { id: 30, n: 'flowerYellow', ko: '노란 꽃', t: ['flowerYellow'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0 },
    { id: 31, n: 'sapling', ko: '묘목', t: ['sapling'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0 },
    { id: 32, n: 'wool', ko: '양털', t: ['wool'], hard: 0.8 },
    { id: 33, n: 'ice', ko: '얼음', t: ['ice'], hard: 0.5, tool: 1, drop: 'none' },
    { id: 34, n: 'obsidian', ko: '흑요석', t: ['obsidian'], hard: 50, tool: 1, tier: 3 },
    { id: 35, n: 'lava', ko: '용암', t: ['lava'], hard: -1, shape: 3, hide: 3, solid: 0, lop: 0, light: 15, drop: 'none' },
    { id: 36, n: 'mossy', ko: '이끼 낀 조약돌', t: ['mossy'], hard: 2, tool: 1, tier: 0 },
    { id: 37, n: 'chest', ko: '상자', t: ['chestTop', 'chestSide', 'chestTop'], hard: 2.5, tool: 2 },
    { id: 38, n: 'stoneBricks', ko: '석재 벽돌', t: ['stoneBricks'], hard: 1.5, tool: 1, tier: 0 },
    { id: 39, n: 'bricks', ko: '벽돌', t: ['bricks'], hard: 2, tool: 1, tier: 0 },
    { id: 40, n: 'oreLapis', ko: '청금석 광석', t: ['oreLapis'], hard: 3, tool: 1, tier: 1, drop: 'lapis', dropN: 5 },
    { id: 41, n: 'blockIron', ko: '철 블록', t: ['blockIron'], hard: 5, tool: 1, tier: 1 },
    { id: 42, n: 'blockGold', ko: '금 블록', t: ['blockGold'], hard: 3, tool: 1, tier: 2 },
    { id: 43, n: 'blockDiamond', ko: '다이아몬드 블록', t: ['blockDiamond'], hard: 5, tool: 1, tier: 2 },
    { id: 44, n: 'blockLapis', ko: '청금석 블록', t: ['blockLapis'], hard: 3, tool: 1, tier: 1 },
    { id: 45, n: 'snowBlock', ko: '눈 블록', t: ['snowTop'], hard: 0.2, tool: 3 },
    { id: 46, n: 'deadBush', ko: '마른 덤불', t: ['deadBush'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0, drop: 'stick' },
    // shape 4 + not solid: a see-through cube drawn whole (the veil between worlds)
    { id: 47, n: 'fireVeil', ko: '불꽃 장막', t: ['fireVeil'], hard: -1, shape: 4, hide: 0, solid: 0, lop: 0, light: 11, drop: 'none' },
    { id: 48, n: 'ashstone', ko: '잿돌', t: ['ashstone'], hard: 0.4, tool: 1, tier: 0 },
    { id: 49, n: 'ashSand', ko: '잿모래', t: ['ashSand'], hard: 0.5, tool: 3 },
    { id: 50, n: 'glowCrystal', ko: '빛수정', t: ['glowCrystal'], hard: 0.3, light: 15 },
    { id: 51, n: 'oreFire', ko: '화염석 광석', t: ['oreFire'], hard: 3, tool: 1, tier: 1, drop: 'fireStone', dropN: 1 },
    { id: 52, n: 'blackBricks', ko: '검은 벽돌', t: ['blackBricks'], hard: 2, tool: 1, tier: 0 },
    { id: 53, n: 'basalt', ko: '현무암', t: ['basaltTop', 'basaltSide', 'basaltTop'], hard: 1.25, tool: 1, tier: 0 },
    { id: 54, n: 'voidStone', ko: '공허석', t: ['voidStone'], hard: 3, tool: 1, tier: 0 },
    { id: 55, n: 'voidBricks', ko: '공허 벽돌', t: ['voidBricks'], hard: 3, tool: 1, tier: 0 },
    { id: 56, n: 'voidGate', ko: '공허 관문', t: ['voidGate'], hard: -1, shape: 4, hide: 0, solid: 0, lop: 0, light: 12, drop: 'none' },
    { id: 57, n: 'wardCrystal', ko: '수호 수정', t: ['wardCrystal'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0, light: 15, drop: 'none' },
];
export const NBLOCK = BLOCKS.length;   // ids 1 .. NBLOCK-1

// ------------------------------------------------------------------ items (ids 100 ..)
// kind 0 block, 1 material, 2 food, 3 tool
export const ITEMS = [
    { id: 100, n: 'stick', ko: '막대기', fuel: 5, icon: ['........', '......b.', '.....b..', '....b...', '...b....', '..b.....', '.b......', '........'], p: { b: '7a5a30' } },
    { id: 101, n: 'coal', ko: '석탄', fuel: 80, icon: ['........', '..kkk...', '.kkgkk..', '.kkkkkk.', '.kgkkkk.', '..kkkkk.', '...kkk..', '........'], p: { k: '262626', g: '4a4a4a' } },
    { id: 102, n: 'ingotIron', ko: '철 주괴', icon: ['........', '........', '...www..', '..wwwwg.', '.wwwwgg.', '.gggggg.', '........', '........'], p: { w: 'e6e6e6', g: 'a8a8a8' } },
    { id: 103, n: 'ingotGold', ko: '금 주괴', icon: ['........', '........', '...www..', '..wwwwg.', '.wwwwgg.', '.gggggg.', '........', '........'], p: { w: 'fbe25a', g: 'c99a10' } },
    { id: 104, n: 'diamond', ko: '다이아몬드', icon: ['........', '..cccc..', '.cwccdc.', 'cwcccddc', '.cccddc.', '..cddc..', '...dc...', '........'], p: { c: '5fe3dc', w: 'd8fffd', d: '2fa8a0' } },
    { id: 105, n: 'apple', ko: '사과', food: 4, icon: ['....b...', '...bg...', '.rrrrr..', 'rrwrrrr.', 'rrrrrrr.', 'rrrrrrk.', '.rrrrk..', '..rrr...'], p: { r: 'd8282a', k: '9a1214', w: 'ff9a9a', b: '6b4518', g: '4b8a2c' } },
    { id: 106, n: 'porkRaw', ko: '생 돼지고기', food: 3, icon: ['........', '.pppp...', 'pppwpp..', 'ppppppp.', '.pppppp.', '..ppppw.', '...ppp..', '........'], p: { p: 'f09a9a', w: 'fbd8d8' } },
    { id: 107, n: 'porkCooked', ko: '익힌 돼지고기', food: 8, icon: ['........', '.cccc...', 'cccwcc..', 'ccccccc.', '.cccccc.', '..ccccw.', '...ccc..', '........'], p: { c: 'c47a4a', w: 'e8c8a0' } },
    { id: 108, n: 'beefRaw', ko: '생 소고기', food: 3, icon: ['........', '..rrrr..', '.rrwrrr.', 'rrrrrwr.', 'rwrrrrr.', '.rrrrr..', '..rrr...', '........'], p: { r: 'c43a3a', w: 'f0c0c0' } },
    { id: 109, n: 'steak', ko: '스테이크', food: 8, icon: ['........', '..bbbb..', '.bbwbbb.', 'bbbbbwb.', 'bwbbbbb.', '.bbbbb..', '..bbb...', '........'], p: { b: '7a4a2a', w: 'b88a5a' } },
    { id: 110, n: 'chickenRaw', ko: '생 닭고기', food: 2, icon: ['........', '..pppp..', '.pppppp.', '.pppppp.', '..ppppw.', '...pw...', '....w...', '........'], p: { p: 'f2c0b0', w: 'ffffff' } },
    { id: 111, n: 'chickenCooked', ko: '익힌 닭고기', food: 6, icon: ['........', '..cccc..', '.cccccc.', '.cccccc.', '..ccccw.', '...cw...', '....w...', '........'], p: { c: 'c8864a', w: 'f0e0c0' } },
    { id: 112, n: 'flesh', ko: '썩은 고기', food: 4, icon: ['........', '.gg.....', 'ggbgg...', '.gggbg..', '..gggg..', '...gbgg.', '....gg..', '........'], p: { g: '8a6a3a', b: '5a7a2a' } },
    { id: 113, n: 'bone', ko: '뼈', icon: ['......ww', '.....www', '....ww..', '...ww...', '..ww....', 'www.....', 'ww......', '........'], p: { w: 'eeeedd' } },
    { id: 114, n: 'string', ko: '실', icon: ['........', '.w......', '..w.....', '..w.....', '...w....', '....ww..', '......w.', '.......w'], p: { w: 'eeeeee' } },
    { id: 115, n: 'arrow', ko: '화살', icon: ['......gg', '.....bgg', '....b...', '...b....', '..b.....', 'fb......', 'ff......', '........'], p: { g: '9a9a9a', b: '7a5a30', f: 'eeeeee' } },
    { id: 116, n: 'feather', ko: '깃털', icon: ['......ww', '....wwww', '...wwww.', '..wwww..', '.wwww...', '.ww.....', 'g.......', '........'], p: { w: 'f4f4f4', g: '9a9a9a' } },
    { id: 117, n: 'leather', ko: '가죽', icon: ['........', '.bbbbbb.', 'bbcbbbbb', 'bbbbbcb.', '.bbcbbbb', 'bbbbbbb.', '.bb..bb.', '........'], p: { b: '9a5a2a', c: '7a4018' } },
    { id: 118, n: 'flint', ko: '부싯돌', icon: ['........', '...kk...', '..kkkg..', '.kkkkg..', '.kkkkkg.', '..kkkg..', '...kg...', '........'], p: { k: '3a3a3a', g: '6a6a6a' } },
    { id: 119, n: 'lapis', ko: '청금석', icon: ['........', '...bb...', '..bwbb..', '.bbbbbb.', '.bbbbbd.', '..bbdd..', '...dd...', '........'], p: { b: '2a4cb8', w: '7a9af0', d: '1a2a80' } },
    { id: 120, n: 'clayBall', ko: '점토 덩어리', icon: ['........', '........', '..cccc..', '.cwcccc.', '.cccccc.', '.ccccd..', '..ccd...', '........'], p: { c: 'a0a6b3', w: 'd0d4dc', d: '7a808c' } },
    { id: 121, n: 'brick', ko: '벽돌 조각', icon: ['........', '........', '...rrr..', '..rrrrk.', '.rrrrkk.', '.kkkkkk.', '........', '........'], p: { r: 'b05a46', k: '7a3a2a' } },
    { id: 122, n: 'igniter', ko: '불붙이개', icon: ['......kk', '.....kgk', '....kgk.', '...kgk..', '.gggk...', 'gwwg....', 'gwg.....', '.g......'], p: { k: '3a3a3a', g: 'a8a8a8', w: 'e6e6e6' } },
    { id: 123, n: 'fireStone', ko: '화염석', icon: ['........', '...yy...', '..yooy..', '.yorroy.', '.yorroy.', '..yooy..', '...yy...', '........'], p: { y: 'ffd040', o: 'ff8a20', r: 'd83a10' } },
    { id: 124, n: 'voidKey', ko: '공허의 열쇠', icon: ['........', '..pppp..', '.pwbbwp.', '.pbccbp.', '.pbccbp.', '.pwbbwp.', '..pppp..', '........'], p: { p: '8060c0', w: 'e8e0ff', b: '201838', c: 'c040ff' } },
    { id: 125, n: 'bow', ko: '활', icon: ['....bbb.', '...b..s.', '..b...s.', '.b....s.', '.b....s.', '..b...s.', '...b..s.', '....bbb.'], p: { b: '7a5a30', s: 'eeeeee' } },
    { id: 126, n: 'heartCore', ko: '수호자의 심장', icon: ['........', '.pp..pp.', 'pccppccp', 'pcwccccp', '.pccccp.', '..pccp..', '...pp...', '........'], p: { p: '8020c0', c: 'c040ff', w: 'f0d0ff' } },
];
// tools: 130 + kind * 4 + tier; kind 0 pickaxe, 1 axe, 2 shovel, 3 sword
export const TIERS = [
    { n: 'Wood', ko: '나무', col: 'a7834f', dark: '6b5233', dur: 59, speed: 2, mat: 'planks' },
    { n: 'Stone', ko: '돌', col: '8f8f8f', dark: '5c5c5c', dur: 131, speed: 4, mat: 'cobble' },
    { n: 'Iron', ko: '철', col: 'e6e6e6', dark: 'a8a8a8', dur: 250, speed: 6, mat: 'ingotIron' },
    { n: 'Diamond', ko: '다이아몬드', col: '5fe3dc', dark: '2fa8a0', dur: 1561, speed: 8, mat: 'diamond' },
];
export const KINDS = [
    { n: 'pick', ko: '곡괭이', dmg: [2, 3, 4, 5], icon: ['.hhhhh..', 'h.d..hh.', '...d..h.', '....d.h.', '.....d..', '......d.', '.......d', '........'] },
    { n: 'axe', ko: '도끼', dmg: [3, 4, 5, 6], icon: ['...hh...', '..hhhd..', '..hhd...', '...d....', '..d.....', '.d......', 'd.......', '........'].map(r => r.split('').reverse().join('')) },
    { n: 'shovel', ko: '삽', dmg: [1, 2, 3, 4], icon: ['......hh', '.....hhh', '.....hh.', '....d...', '...d....', '..d.....', '.d......', 'd.......'] },
    { n: 'sword', ko: '검', dmg: [4, 5, 6, 7], icon: ['......hh', '.....hhh', '....hhh.', '.d.hhh..', '..ddh...', '..dd....', '.d..d...', 'd.......'] },
];
export const TOOL0 = 130;
export function toolId(kind, tier) { return TOOL0 + kind * 4 + tier; }
export const ARM0 = 150;
export const ARMT = [
    { n: 'Leather', ko: '가죽', col: '9a5a2a', dark: '7a4018', dur: 60, def: [1, 3, 2, 1], mat: 'leather' },
    { n: 'Iron', ko: '철', col: 'e6e6e6', dark: 'a8a8a8', dur: 200, def: [2, 6, 5, 2], mat: 'ingotIron' },
    { n: 'Diamond', ko: '다이아몬드', col: '5fe3dc', dark: '2fa8a0', dur: 400, def: [3, 8, 6, 3], mat: 'diamond' },
];
export const ARMP = [
    { n: 'Helmet', ko: '투구', icon: ['........', '.hhhhhh.', 'hddddddh', 'hd....dh', 'hd....dh', '........', '........', '........'], r: ['M M M', 'M _ M'] },
    { n: 'Chest', ko: '흉갑', icon: ['.hh..hh.', 'hddhhddh', 'hddddddh', '.hddddh.', '.hddddh.', '.hddddh.', '.hhhhhh.', '........'], r: ['M _ M', 'M M M', 'M M M'] },
    { n: 'Legs', ko: '각반', icon: ['.hhhhhh.', '.hddddh.', '.hd..dh.', '.hd..dh.', '.hd..dh.', '.hd..dh.', '.hh..hh.', '........'], r: ['M M M', 'M _ M', 'M _ M'] },
    { n: 'Boots', ko: '장화', icon: ['........', '........', '.hh..hh.', '.hd..dh.', '.hd..dh.', 'hhd..dhh', 'hhh..hhh', '........'], r: ['M _ M', 'M _ M'] },
];
export function armorId(tier, piece) { return ARM0 + tier * 4 + piece; }
export const NITEM = ARM0 + 12;   // ids 0 .. NITEM-1

// ------------------------------------------------------------------ recipes
// rows of item names ('_' empty); `m` mirrored too; shapeless one-ingredient ones are 1 x 1
export const RECIPES = [
    { r: ['logOak'], out: 'planks', n: 4 },
    { r: ['logBirch'], out: 'planks', n: 4 },
    { r: ['logSpruce'], out: 'planks', n: 4 },
    { r: ['planks', 'planks'], out: 'stick', n: 4 },
    { r: ['planks planks', 'planks planks'], out: 'craft', n: 1 },
    { r: ['cobble cobble cobble', 'cobble _ cobble', 'cobble cobble cobble'], out: 'furnace', n: 1 },
    { r: ['planks planks planks', 'planks _ planks', 'planks planks planks'], out: 'chest', n: 1 },
    { r: ['coal', 'stick'], out: 'torch', n: 4 },
    { r: ['sand sand', 'sand sand'], out: 'sandstone', n: 1 },
    { r: ['stone stone', 'stone stone'], out: 'stoneBricks', n: 4 },
    { r: ['brick brick', 'brick brick'], out: 'bricks', n: 1 },
    { r: ['clayBall clayBall', 'clayBall clayBall'], out: 'clay', n: 1 },
    { r: ['string string', 'string string'], out: 'wool', n: 1 },
    { r: ['snowBlock snowBlock', 'snowBlock snowBlock'], out: 'ice', n: 1 },
    { r: ['cobble'], out: 'mossy', n: 1, x: 'needs nothing more: a way to get it' },
    { r: ['ingotIron ingotIron ingotIron', 'ingotIron ingotIron ingotIron', 'ingotIron ingotIron ingotIron'], out: 'blockIron', n: 1 },
    { r: ['ingotGold ingotGold ingotGold', 'ingotGold ingotGold ingotGold', 'ingotGold ingotGold ingotGold'], out: 'blockGold', n: 1 },
    { r: ['diamond diamond diamond', 'diamond diamond diamond', 'diamond diamond diamond'], out: 'blockDiamond', n: 1 },
    { r: ['lapis lapis lapis', 'lapis lapis lapis', 'lapis lapis lapis'], out: 'blockLapis', n: 1 },
    { r: ['blockIron'], out: 'ingotIron', n: 9 },
    { r: ['blockGold'], out: 'ingotGold', n: 9 },
    { r: ['blockDiamond'], out: 'diamond', n: 9 },
    { r: ['blockLapis'], out: 'lapis', n: 9 },
    { r: ['bone'], out: 'flint', n: 0, x: 'placeholder dropped below' },
].filter(r => r.n > 0 && !r.x);
// tools, for every tier
TIERS.forEach((t, ti) => {
    const M = t.mat;
    RECIPES.push({ r: [`${M} ${M} ${M}`, '_ stick _', '_ stick _'], out: toolId(0, ti), n: 1 });
    RECIPES.push({ r: [`${M} ${M}`, `${M} stick`, '_ stick'], out: toolId(1, ti), n: 1, m: 1 });
    RECIPES.push({ r: [M, 'stick', 'stick'], out: toolId(2, ti), n: 1 });
    RECIPES.push({ r: [M, M, 'stick'], out: toolId(3, ti), n: 1 });
});
ARMT.forEach((t, ti) => ARMP.forEach((p, pi) => RECIPES.push({ r: p.r.map(row => row.replace(/M/g, t.mat)), out: armorId(ti, pi), n: 1 })));
RECIPES.push({ r: ['ingotIron _', '_ flint'], out: 'igniter', n: 1, m: 1 });
RECIPES.push({ r: ['_ stick string', 'stick _ string', '_ stick string'], out: 'bow', n: 1, m: 1 });
RECIPES.push({ r: ['flint', 'stick', 'feather'], out: 'arrow', n: 4 });
RECIPES.push({ r: ['fireStone fireStone fireStone', 'fireStone diamond fireStone', 'fireStone lapis fireStone'], out: 'voidKey', n: 1 });
RECIPES.push({ r: ['ashstone ashstone', 'ashstone ashstone'], out: 'blackBricks', n: 4 });
RECIPES.push({ r: ['voidStone voidStone', 'voidStone voidStone'], out: 'voidBricks', n: 4 });
// furnace: input -> output
export const SMELT = [
    ['oreIron', 'ingotIron'], ['oreGold', 'ingotGold'], ['sand', 'glass'], ['cobble', 'stone'], ['clayBall', 'brick'],
    ['porkRaw', 'porkCooked'], ['beefRaw', 'steak'], ['chickenRaw', 'chickenCooked'], ['logOak', 'coal'], ['logBirch', 'coal'], ['logSpruce', 'coal'],
    ['cactus', 'stick'], ['clay', 'bricks'], ['ashstone', 'blackBricks'], ['ashSand', 'glass'],
];

// ------------------------------------------------------------------ mobs
// boxes in 1/16 block: [x0, y0, z0, x1, y1, z1, colour, part]; the mob faces +z.
// part 0 still, 1 left front leg / right arm, 2 right front leg / left arm, 3 / 4 the back legs,
// 5 the head. Legs swing about their top, the head turns with the mob.
export const MOBS = [
    null,
    { n: 'pig', ko: '돼지', hp: 10, w: 0.9, h: 0.9, speed: 1.6, drop: ['porkRaw', 1, 3], boxes: [
        [-5, 6, -8, 5, 14, 8, 'f0a8a8', 0],
        [-4, 8, 8, 4, 16, 15, 'f0a8a8', 5], [-2, 9, 15, 2, 12, 16, 'd88a8a', 5], [-3, 13, 15, -1, 15, 15.5, '202020', 5], [1, 13, 15, 3, 15, 15.5, '202020', 5],
        [-5, 0, 4, -1, 6, 8, 'e09898', 1], [1, 0, 4, 5, 6, 8, 'e09898', 2], [-5, 0, -8, -1, 6, -4, 'e09898', 3], [1, 0, -8, 5, 6, -4, 'e09898', 4]] },
    { n: 'cow', ko: '소', hp: 10, w: 0.9, h: 1.4, speed: 1.4, drop: ['beefRaw', 1, 3, 'leather', 0, 2], boxes: [
        [-6, 12, -9, 6, 22, 9, '5a3a24', 0], [-6.1, 14, -4, 6.1, 20, 2, 'e8e2d8', 0],
        [-4, 16, 9, 4, 24, 15, '5a3a24', 5], [-3, 16, 15, 3, 19, 16, 'd8b8a0', 5], [-3, 21, 15, -1, 23, 15.5, '202020', 5], [1, 21, 15, 3, 23, 15.5, '202020', 5], [-6, 23, 11, -4, 25, 12, 'e8e2d8', 5], [4, 23, 11, 6, 25, 12, 'e8e2d8', 5],
        [-6, 0, 5, -2, 12, 9, '4a2e1c', 1], [2, 0, 5, 6, 12, 9, '4a2e1c', 2], [-6, 0, -9, -2, 12, -5, '4a2e1c', 3], [2, 0, -9, 6, 12, -5, '4a2e1c', 4]] },
    { n: 'sheep', ko: '양', hp: 8, w: 0.9, h: 1.3, speed: 1.4, drop: ['wool', 1, 1], boxes: [
        [-6, 11, -8, 6, 21, 8, 'eeeeee', 0],
        [-3, 15, 8, 3, 22, 14, 'c8b8a8', 5], [-2, 18, 14, -0.5, 20, 14.5, '202020', 5], [0.5, 18, 14, 2, 20, 14.5, '202020', 5], [-4, 19, 8, 4, 23, 11, 'eeeeee', 5],
        [-5, 0, 4, -1, 11, 8, 'c8b8a8', 1], [1, 0, 4, 5, 11, 8, 'c8b8a8', 2], [-5, 0, -8, -1, 11, -4, 'c8b8a8', 3], [1, 0, -8, 5, 11, -4, 'c8b8a8', 4]] },
    { n: 'chicken', ko: '닭', hp: 4, w: 0.5, h: 0.7, speed: 1.2, drop: ['chickenRaw', 1, 1, 'feather', 0, 2], boxes: [
        [-3, 4, -4, 3, 10, 4, 'f4f4f4', 0], [-4, 5, -3, -3, 9, 3, 'e4e4e4', 0], [3, 5, -3, 4, 9, 3, 'e4e4e4', 0],
        [-2, 8, 3, 2, 14, 6, 'f4f4f4', 5], [-2, 10, 6, 2, 12, 8, 'f0a020', 5], [-1, 8, 6, 1, 10, 7, 'd82020', 5], [-2, 12, 6, -1, 13, 6.5, '202020', 5], [1, 12, 6, 2, 13, 6.5, '202020', 5],
        [-2, 0, 0, -1, 4, 1, 'f0a020', 1], [1, 0, 0, 2, 4, 1, 'f0a020', 2]] },
    { n: 'zombie', ko: '좀비', hp: 20, w: 0.6, h: 1.9, speed: 2.3, hostile: 1, burns: 1, dmg: 3, drop: ['flesh', 0, 2], boxes: [
        [-4, 12, -2, 4, 24, 2, '6b5a3a', 0], [-4, 12, -2.1, 4, 16, 2.1, '4a3a26', 0],
        [-4, 24, -4, 4, 32, 4, '7a9a7a', 5], [-3, 27, 4, -1, 29, 4.5, '3a0a0a', 5], [1, 27, 4, 3, 29, 4.5, '3a0a0a', 5], [-4, 31, -4, 4, 32.5, 4, '3a3a2a', 5],
        [-8, 20, -2, -4, 24, 12, '7a9a7a', 1], [4, 20, -2, 8, 24, 12, '7a9a7a', 2],
        [-4, 0, -2, 0, 12, 2, '3a3a48', 3], [0, 0, -2, 4, 12, 2, '3a3a48', 4]] },
    { n: 'skeleton', ko: '해골', hp: 20, w: 0.6, h: 1.9, speed: 2.1, hostile: 1, burns: 1, dmg: 3, drop: ['bone', 0, 2, 'arrow', 0, 2], boxes: [
        [-3, 13, -1, 3, 24, 1, 'd8d8cc', 0], [-4, 21, -1.5, 4, 23, -0.5, 'c0c0b4', 0], [-4, 17, -1.5, 4, 19, -0.5, 'c0c0b4', 0],
        [-4, 24, -4, 4, 32, 4, 'e0e0d4', 5], [-3, 27, 4, -1, 29, 4.5, '202020', 5], [1, 27, 4, 3, 29, 4.5, '202020', 5], [-1, 25, 4, 1, 26, 4.5, '505050', 5],
        [-6, 12, -1, -4, 24, 1, 'd8d8cc', 1], [4, 12, -1, 6, 24, 1, 'd8d8cc', 2],
        [-3, 0, -1, -1, 13, 1, 'd8d8cc', 3], [1, 0, -1, 3, 13, 1, 'd8d8cc', 4]] },
    { n: 'spider', ko: '거미', hp: 16, w: 1.3, h: 0.9, speed: 2.6, hostile: 1, dmg: 2, drop: ['string', 0, 2], boxes: [
        [-5, 4, -12, 5, 12, -2, '2e2620', 0], [-3, 5, -2, 3, 11, 1, '3a3028', 0],
        [-4, 4, 1, 4, 12, 8, '3a3028', 5], [-3, 8, 8, -1, 10, 8.5, 'd01818', 5], [1, 8, 8, 3, 10, 8.5, 'd01818', 5], [-2, 6, 8, -1, 7, 8.5, 'd01818', 5], [1, 6, 8, 2, 7, 8.5, 'd01818', 5],
        [-16, 7, 0, -3, 9, 2, '2a221c', 1], [3, 7, 0, 16, 9, 2, '2a221c', 2], [-16, 7, -4, -3, 9, -2, '2a221c', 3], [3, 7, -4, 16, 9, -2, '2a221c', 4],
        [-15, 6, -8, -3, 8, -6, '2a221c', 2], [3, 6, -8, 15, 8, -6, '2a221c', 1], [-14, 5, 3, -3, 7, 5, '2a221c', 4], [3, 5, 3, 14, 7, 5, '2a221c', 3]] },
    // the ashen depths: a hooded ghost that throws fire, a toad that leaps out of the lava
    { n: 'wraith', ko: '잿빛 망령', hp: 10, w: 0.9, h: 1.6, speed: 2.0, hostile: 1, fly: 1, fireproof: 1, dmg: 3, drop: ['fireStone', 0, 1], boxes: [
        [-5, 8, -4, 5, 22, 4, '8a8486', 0], [-6, 18, -5, 6, 28, 5, '6c6668', 5], [-3, 21, 5, 3, 25, 5.5, '1a1418', 5], [-2, 22, 5.2, -1, 23, 5.7, 'ff8a20', 5], [1, 22, 5.2, 2, 23, 5.7, 'ff8a20', 5],
        [-4, 2, -3, -1, 9, 2, '76707a', 3], [1, 0, -3, 4, 9, 2, '76707a', 4], [-8, 12, -2, -5, 20, 6, '8a8486', 1], [5, 12, -2, 8, 20, 6, '8a8486', 2]] },
    { n: 'toad', ko: '용암 두꺼비', hp: 12, w: 1.0, h: 0.8, speed: 2.4, hostile: 1, fireproof: 1, dmg: 4, drop: ['fireStone', 0, 1, 'ashSand', 0, 2], boxes: [
        [-7, 2, -6, 7, 11, 7, '8a2a14', 0], [-6, 11, -4, 6, 13, 6, 'b8401c', 0], [-5, 9, 7, -1, 12, 8, 'ffd040', 5], [1, 9, 7, 5, 12, 8, 'ffd040', 5], [-4, 4, 7, 4, 6, 7.5, '3a0a04', 5],
        [-8, 0, 3, -4, 4, 7, '6a1c0c', 1], [4, 0, 3, 8, 4, 7, '6a1c0c', 2], [-9, 0, -6, -4, 5, -1, '6a1c0c', 3], [4, 0, -6, 9, 5, -1, '6a1c0c', 4]] },
    // the void's warden: a great eye in a dark husk, four vanes beating round it
    { n: 'warden', ko: '공허의 수호자', hp: 200, w: 3.0, h: 3.0, speed: 9, hostile: 1, fly: 1, fireproof: 1, dmg: 5, drop: ['heartCore', 1, 1], boxes: [
        [-20, 6, -20, 20, 42, 20, '2a1c3c', 0], [-14, 12, 20, 14, 36, 22, '1a1028', 5], [-10, 16, 22, 10, 32, 23, 'e8e0ff', 5], [-5, 20, 23, 5, 28, 24, 'c040ff', 5], [-2, 22, 24, -0, 26, 24.5, '100818', 5],
        [-44, 20, -8, -20, 24, 10, '4a3068', 1], [20, 20, -8, 44, 24, 10, '4a3068', 2], [-8, 42, -8, 8, 52, 8, '3a2850', 3], [-8, -4, -8, 8, 6, 8, '3a2850', 4]] },
];

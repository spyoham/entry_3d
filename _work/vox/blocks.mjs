// Build-time data: blocks, 8x8 textures, items, icons, recipes, smelting, mob models.
import { makeContent, CATS } from './content.mjs';
export { CATS };
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
    smithTop: { p: { a: '3a3a40', b: '24242a', c: '8c8c94' }, g: ['bbbbbbbb', 'baaaaaab', 'bacccaab', 'baaaaaab', 'baaaaaab', 'baacccab', 'baaaaaab', 'bbbbbbbb'] },
    smithSide: { p: { a: '6b4f2c', b: '4a3418', k: '2a2a30', g: '8c8c94' }, g: ['kkkkkkkk', 'kggggggk', 'kkkkkkkk', 'aaabaaab', 'abaaabaa', 'aaabaaab', 'abaaabaa', 'bbbbbbbb'] },
    debrisSide: { p: { a: '5e4438', b: '3e2a22', c: '7a5a4a', d: '2a1c18' }, g: ['abacabda', 'bccbaacb', 'adbbcaba', 'cabdbbca', 'abbcaadb', 'bacabcab', 'dbaacbba', 'abcabdac'] },
    debrisTop: { p: { a: '5e4438', b: '3e2a22', c: '7a5a4a', d: '2a1c18' }, g: ['bbbbbbbb', 'bccccccb', 'bcddddcb', 'bcdaadcb', 'bcdaadcb', 'bcddddcb', 'bccccccb', 'bbbbbbbb'] },
    ruinBricks: { p: { a: '74786c', b: '50544a', c: '868a7c', m: '5a6e48' }, g: ['aaacaaab', 'aamaaaab', 'aacaaaab', 'bbbbbbbb', 'aaabaaaa', 'acabaama', 'aaabaaaa', 'bbbbbbbb'] },
    frameSide: { p: { a: 'd8dcb4', b: 'b4b890', c: '4a6a5a', d: '2e4a3e' }, g: ['aaaaaaaa', 'abababab', 'cccccccc', 'cdcdcdcd', 'cccccccc', 'dcdcdcdc', 'cccccccc', 'dddddddd'] },
    frameTop: { p: { a: 'd8dcb4', b: 'b4b890', c: '4a6a5a', d: '2e4a3e' }, g: ['cccccccc', 'cdddddcc', 'cdbbbbdc', 'cdbaabdc', 'cdbaabdc', 'cdbbbbdc', 'ccddddcc', 'cccccccc'] },
    frameEyeTop: { p: { c: '4a6a5a', d: '2e4a3e', g: '3ec080', k: '0e2a1a', y: 'c8f0a0' }, g: ['cccccccc', 'cdddddcc', 'cdggggdc', 'cdgkygdc', 'cdgykgdc', 'cdggggdc', 'ccddddcc', 'cccccccc'] },
    shellSide: { p: { a: '9a6aa8', b: '7a4e8a', k: '4a2a5a', y: 'e8d8f0' }, g: ['aaaaaaaa', 'abababab', 'aaaaaaaa', 'kkkyykkk', 'bbbbbbbb', 'babababa', 'bbbbbbbb', 'kkkkkkkk'] },
    shellTop: { p: { a: '9a6aa8', b: '7a4e8a', k: '4a2a5a' }, g: ['kkkkkkkk', 'kaaaaaak', 'kabbbbak', 'kabaabak', 'kabaabak', 'kabbbbak', 'kaaaaaak', 'kkkkkkkk'] },
    violetBricks: { p: { a: 'a87cb0', b: '8a5e94', c: 'c09ac8' }, g: ['aacaaaab', 'aaaaaaab', 'acaaacab', 'bbbbbbbb', 'aaabaaca', 'acabaaaa', 'aaabaaaa', 'bbbbbbbb'] },
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
    { id: 33, n: 'ice', ko: '얼음', t: ['ice'], hard: 0.5, tool: 1, drop: 'none', lop: 0 },
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
    { id: 56, n: 'voidGate', ko: '공허 관문', t: ['voidGate'], hard: -1, shape: 4, hide: 0, solid: 0, lop: 0, light: 15, drop: 'none' },
    { id: 57, n: 'wardCrystal', ko: '수호 수정', t: ['wardCrystal'], hard: 0, shape: 1, hide: 0, solid: 0, lop: 0, light: 15, drop: 'none' },
    // v1.4: the smithing table, the ashen debris, the old ruin and its gate frame, the far gate, the shell box, violet bricks
    { id: 58, n: 'smithTable', ko: '대장장이 작업대', t: ['smithTop', 'smithSide', 'planks'], hard: 2.5, tool: 2 },
    { id: 59, n: 'debris', ko: '잿빛 잔해', t: ['debrisTop', 'debrisSide', 'debrisTop'], hard: 30, tool: 1, tier: 3 },
    { id: 60, n: 'ruinBricks', ko: '유적 벽돌', t: ['ruinBricks'], hard: 1.5, tool: 1, tier: 0 },
    { id: 61, n: 'voidFrame', ko: '관문 틀', t: ['frameTop', 'frameSide', 'frameSide'], hard: -1, drop: 'none' },
    { id: 62, n: 'voidFrameEye', ko: '눈 박힌 관문 틀', t: ['frameEyeTop', 'frameSide', 'frameSide'], hard: -1, drop: 'none', light: 1 },
    { id: 63, n: 'farGate', ko: '바깥 관문', t: ['voidGate'], hard: -1, shape: 4, hide: 0, solid: 0, lop: 0, light: 15, drop: 'none' },
    { id: 64, n: 'shellBox', ko: '껍질 상자', t: ['shellTop', 'shellSide', 'shellTop'], hard: 2, tool: 1 },
    { id: 65, n: 'violetBricks', ko: '보랏빛 벽돌', t: ['violetBricks'], hard: 1.5, tool: 1, tier: 0 },
];
export let NBLOCK = BLOCKS.length;   // ids 1 .. NBLOCK-1 (set again once the content is in)

// ------------------------------------------------------------------ items (ids 100 ..)
// kind 0 block, 1 material, 2 food, 3 tool
export const ITEMS = [
    { id: 100, n: 'stick', key: 'stick', ko: '막대기', fuel: 5, icon: ['........', '......b.', '.....b..', '....b...', '...b....', '..b.....', '.b......', '........'], p: { b: '7a5a30' } },
    { id: 101, n: 'coal', key: 'coal', ko: '석탄', fuel: 80, icon: ['........', '..kkk...', '.kkgkk..', '.kkkkkk.', '.kgkkkk.', '..kkkkk.', '...kkk..', '........'], p: { k: '262626', g: '4a4a4a' } },
    { id: 102, n: 'ingotIron', key: 'iron_ingot', ko: '철 주괴', icon: ['........', '........', '...www..', '..wwwwg.', '.wwwwgg.', '.gggggg.', '........', '........'], p: { w: 'e6e6e6', g: 'a8a8a8' } },
    { id: 103, n: 'ingotGold', key: 'gold_ingot', ko: '금 주괴', icon: ['........', '........', '...www..', '..wwwwg.', '.wwwwgg.', '.gggggg.', '........', '........'], p: { w: 'fbe25a', g: 'c99a10' } },
    { id: 104, n: 'diamond', key: 'diamond', ko: '다이아몬드', icon: ['........', '..cccc..', '.cwccdc.', 'cwcccddc', '.cccddc.', '..cddc..', '...dc...', '........'], p: { c: '5fe3dc', w: 'd8fffd', d: '2fa8a0' } },
    { id: 105, n: 'apple', key: 'apple', ko: '사과', food: 4, icon: ['....b...', '...bg...', '.rrrrr..', 'rrwrrrr.', 'rrrrrrr.', 'rrrrrrk.', '.rrrrk..', '..rrr...'], p: { r: 'd8282a', k: '9a1214', w: 'ff9a9a', b: '6b4518', g: '4b8a2c' } },
    { id: 106, n: 'porkRaw', key: 'raw_pork', ko: '생 돼지고기', food: 3, icon: ['........', '.pppp...', 'pppwpp..', 'ppppppp.', '.pppppp.', '..ppppw.', '...ppp..', '........'], p: { p: 'f09a9a', w: 'fbd8d8' } },
    { id: 107, n: 'porkCooked', key: 'cooked_pork', ko: '익힌 돼지고기', food: 8, icon: ['........', '.cccc...', 'cccwcc..', 'ccccccc.', '.cccccc.', '..ccccw.', '...ccc..', '........'], p: { c: 'c47a4a', w: 'e8c8a0' } },
    { id: 108, n: 'beefRaw', key: 'raw_beef', ko: '생 소고기', food: 3, icon: ['........', '..rrrr..', '.rrwrrr.', 'rrrrrwr.', 'rwrrrrr.', '.rrrrr..', '..rrr...', '........'], p: { r: 'c43a3a', w: 'f0c0c0' } },
    { id: 109, n: 'steak', key: 'steak', ko: '스테이크', food: 8, icon: ['........', '..bbbb..', '.bbwbbb.', 'bbbbbwb.', 'bwbbbbb.', '.bbbbb..', '..bbb...', '........'], p: { b: '7a4a2a', w: 'b88a5a' } },
    { id: 110, n: 'chickenRaw', key: 'raw_chicken', ko: '생 닭고기', food: 2, icon: ['........', '..pppp..', '.pppppp.', '.pppppp.', '..ppppw.', '...pw...', '....w...', '........'], p: { p: 'f2c0b0', w: 'ffffff' } },
    { id: 111, n: 'chickenCooked', key: 'cooked_chicken', ko: '익힌 닭고기', food: 6, icon: ['........', '..cccc..', '.cccccc.', '.cccccc.', '..ccccw.', '...cw...', '....w...', '........'], p: { c: 'c8864a', w: 'f0e0c0' } },
    { id: 112, n: 'flesh', key: 'rotten_flesh', ko: '썩은 고기', food: 4, icon: ['........', '.gg.....', 'ggbgg...', '.gggbg..', '..gggg..', '...gbgg.', '....gg..', '........'], p: { g: '8a6a3a', b: '5a7a2a' } },
    { id: 113, n: 'bone', key: 'bone', ko: '뼈', icon: ['......ww', '.....www', '....ww..', '...ww...', '..ww....', 'www.....', 'ww......', '........'], p: { w: 'eeeedd' } },
    { id: 114, n: 'string', key: 'string', ko: '실', icon: ['........', '.w......', '..w.....', '..w.....', '...w....', '....ww..', '......w.', '.......w'], p: { w: 'eeeeee' } },
    { id: 115, n: 'arrow', key: 'arrow', ko: '화살', icon: ['......gg', '.....bgg', '....b...', '...b....', '..b.....', 'fb......', 'ff......', '........'], p: { g: '9a9a9a', b: '7a5a30', f: 'eeeeee' } },
    { id: 116, n: 'feather', key: 'feather', ko: '깃털', icon: ['......ww', '....wwww', '...wwww.', '..wwww..', '.wwww...', '.ww.....', 'g.......', '........'], p: { w: 'f4f4f4', g: '9a9a9a' } },
    { id: 117, n: 'leather', key: 'leather', ko: '가죽', icon: ['........', '.bbbbbb.', 'bbcbbbbb', 'bbbbbcb.', '.bbcbbbb', 'bbbbbbb.', '.bb..bb.', '........'], p: { b: '9a5a2a', c: '7a4018' } },
    { id: 118, n: 'flint', key: 'flint', ko: '부싯돌', icon: ['........', '...kk...', '..kkkg..', '.kkkkg..', '.kkkkkg.', '..kkkg..', '...kg...', '........'], p: { k: '3a3a3a', g: '6a6a6a' } },
    { id: 119, n: 'lapis', key: 'lapis', ko: '청금석', icon: ['........', '...bb...', '..bwbb..', '.bbbbbb.', '.bbbbbd.', '..bbdd..', '...dd...', '........'], p: { b: '2a4cb8', w: '7a9af0', d: '1a2a80' } },
    { id: 120, n: 'clayBall', key: 'clay_ball', ko: '점토 덩어리', icon: ['........', '........', '..cccc..', '.cwcccc.', '.cccccc.', '.ccccd..', '..ccd...', '........'], p: { c: 'a0a6b3', w: 'd0d4dc', d: '7a808c' } },
    { id: 121, n: 'brick', key: 'brick', ko: '벽돌 조각', icon: ['........', '........', '...rrr..', '..rrrrk.', '.rrrrkk.', '.kkkkkk.', '........', '........'], p: { r: 'b05a46', k: '7a3a2a' } },
    { id: 122, n: 'igniter', key: 'igniter', ko: '불붙이개', icon: ['......kk', '.....kgk', '....kgk.', '...kgk..', '.gggk...', 'gwwg....', 'gwg.....', '.g......'], p: { k: '3a3a3a', g: 'a8a8a8', w: 'e6e6e6' } },
    { id: 123, n: 'fireStone', key: 'fire_stone', ko: '화염석', icon: ['........', '...yy...', '..yooy..', '.yorroy.', '.yorroy.', '..yooy..', '...yy...', '........'], p: { y: 'ffd040', o: 'ff8a20', r: 'd83a10' } },
    { id: 124, n: 'voidKey', key: 'void_key', ko: '공허의 열쇠', icon: ['........', '..pppp..', '.pwbbwp.', '.pbccbp.', '.pbccbp.', '.pwbbwp.', '..pppp..', '........'], p: { p: '8060c0', w: 'e8e0ff', b: '201838', c: 'c040ff' } },
    { id: 125, n: 'bow', key: 'bow', ko: '활', icon: ['....bbb.', '...b..s.', '..b...s.', '.b....s.', '.b....s.', '..b...s.', '...b..s.', '....bbb.'], p: { b: '7a5a30', s: 'eeeeee' } },
    { id: 126, n: 'heartCore', key: 'warden_heart', ko: '수호자의 심장', icon: ['........', '.pp..pp.', 'pccppccp', 'pcwccccp', '.pccccp.', '..pccp..', '...pp...', '........'], p: { p: '8020c0', c: 'c040ff', w: 'f0d0ff' } },
    { id: 127, n: 'scrap', key: 'abyss_scrap', ko: '잔해 조각', icon: ['........', '..bbb...', '.bcccb..', '.bcdccb.', '.bccdcb.', '..bccb..', '...bb...', '........'], p: { b: '3e2a22', c: '6e5246', d: '9a7a68' } },
    { id: 128, n: 'abyssIngot', key: 'abyss_ingot', ko: '심연철 주괴', icon: ['........', '........', '..hhhhh.', '.hddddh.', 'hddddh..', 'hhhhh...', '........', '........'], p: { h: '2e2830', d: '5a5060' } },
    { id: 129, n: 'blazePowder', key: 'blaze_powder', ko: '화염 가루', icon: ['........', '...y....', '..yoy.y.', '.yooy...', '..yoooy.', '.y.yoy..', '...y....', '........'], p: { y: 'ffd040', o: 'f08020' } },
    { id: 170, n: 'voidPearl', key: 'void_pearl', ko: '공허 진주', icon: ['........', '..gggg..', '.gddddg.', '.gdkkdg.', '.gdkkdg.', '.gddddg.', '..gggg..', '........'], p: { g: '1e4a40', d: '2e8a74', k: '0a1a16' } },
    { id: 171, n: 'voidEye', key: 'void_eye', ko: '공허의 눈', icon: ['........', '..gggg..', '.gyyyyg.', '.gykkyg.', '.gykkyg.', '.gyyyyg.', '..gggg..', '........'], p: { g: '1e4a40', y: '8ad070', k: '0a1a16' } },
    { id: 172, n: 'shell', key: 'shell', ko: '껍질', icon: ['........', '..pppp..', '.paaaap.', 'paabbaap', 'pabbbbap', 'pppppppp', '........', '........'], p: { p: '6a3e7a', a: '9a6aa8', b: 'c8a8d0' } },
    { id: 173, n: 'glider', key: 'glider', ko: '활공 날개', slot: 2, dur: 432, icon: ['.g....g.', 'gdg..gdg', 'gddggddg', 'gddddddg', 'gdd..ddg', '.gd..dg.', '..g..g..', '........'], p: { g: '5a4a7a', d: '9a8ac0' } },
    { id: 174, n: 'boat', key: 'oak_boat', ko: '나무 배', icon: ['........', '........', 'b......b', 'bab..bab', 'baabbaab', '.baaaab.', '..bbbb..', '........'], p: { a: 'a7834f', b: '6b5233' } },
];
// tools: 130 + kind * 4 + tier; kind 0 pickaxe, 1 axe, 2 shovel, 3 sword
export const TIERS = [
    { n: 'Wood', ko: '나무', col: 'a7834f', dark: '6b5233', dur: 59, speed: 2, mat: '#planks' },
    { n: 'Stone', ko: '돌', col: '8f8f8f', dark: '5c5c5c', dur: 131, speed: 4, mat: '#stonecraft' },
    { n: 'Iron', ko: '철', col: 'e6e6e6', dark: 'a8a8a8', dur: 250, speed: 6, mat: 'ingotIron' },
    { n: 'Diamond', ko: '다이아몬드', col: '5fe3dc', dark: '2fa8a0', dur: 1561, speed: 8, mat: 'diamond' },
    // (made at the smithing table from the diamond ones, not crafted)
    { n: 'Abyss', ko: '심연철', col: '5a5060', dark: '2e2830', dur: 2031, speed: 9, mat: 'abyssIngot', smith: 1, lv: 4 },
    { n: 'Gold', ko: '금', col: 'f2d23a', dark: 'c99a10', dur: 32, speed: 12, mat: 'ingotGold', lv: 0 },
];
TIERS.forEach((t, i) => { if (t.lv === undefined) t.lv = i; });
export const KINDS = [
    { n: 'pick', ko: '곡괭이', dmg: [2, 3, 4, 5, 6, 2], icon: ['.hhhhh..', 'h.d..hh.', '...d..h.', '....d.h.', '.....d..', '......d.', '.......d', '........'] },
    { n: 'axe', ko: '도끼', dmg: [3, 4, 5, 6, 7, 3], icon: ['...hh...', '..hhhd..', '..hhd...', '...d....', '..d.....', '.d......', 'd.......', '........'].map(r => r.split('').reverse().join('')) },
    { n: 'shovel', ko: '삽', dmg: [1, 2, 3, 4, 5, 1], icon: ['......hh', '.....hhh', '.....hh.', '....d...', '...d....', '..d.....', '.d......', 'd.......'] },
    { n: 'sword', ko: '검', dmg: [4, 5, 6, 7, 8, 4], icon: ['......hh', '.....hhh', '....hhh.', '.d.hhh..', '..ddh...', '..dd....', '.d..d...', 'd.......'] },
    { n: 'hoe', ko: '괭이', dmg: [1, 1, 1, 1, 1, 1], icon: ['..hhhh..', '.....hd.', '......d.', '.....d..', '....d...', '...d....', '..d.....', '.d......'] },
];
export const TOOL0 = 130;
export const TOOL4 = 166;   // (the fifth tier: 166 + kind)
// (ids: the first four kinds of the first four tiers 130 .., the hoe 146 .., the abyss tier 166 ..,
// the rest from XTOOL)
export const XTOOL = 1900;
export function toolId(kind, tier) {
    if (kind < 4 && tier < 4) return TOOL0 + kind * 4 + tier;
    if (kind === 4 && tier < 4) return 146 + tier;
    if (tier === 4 && kind < 4) return TOOL4 + kind;
    return XTOOL + (tier - 4) * 5 + kind;
}
export const ARM0 = 150;
export const ARMT = [
    { n: 'Leather', ko: '가죽', col: '9a5a2a', dark: '7a4018', dur: 60, def: [1, 3, 2, 1], mat: 'leather' },
    { n: 'Iron', ko: '철', col: 'e6e6e6', dark: 'a8a8a8', dur: 200, def: [2, 6, 5, 2], mat: 'ingotIron' },
    { n: 'Diamond', ko: '다이아몬드', col: '5fe3dc', dark: '2fa8a0', dur: 400, def: [3, 8, 6, 3], tough: 2, mat: 'diamond' },
    { n: 'Abyss', ko: '심연철', col: '5a5060', dark: '2e2830', dur: 480, def: [3, 8, 6, 3], tough: 3, mat: 'abyssIngot', smith: 1 },
    { n: 'Gold', ko: '금', col: 'f2d23a', dark: 'c99a10', dur: 90, def: [2, 5, 3, 1], mat: 'ingotGold' },
    { n: 'Chain', ko: '사슬', col: 'a0a0a8', dark: '5a5a62', dur: 200, def: [2, 5, 4, 1], mat: 'ironNugget', nocraft: 1 },
];
export const ARMP = [
    { n: 'Helmet', ko: '투구', icon: ['........', '.hhhhhh.', 'hddddddh', 'hd....dh', 'hd....dh', '........', '........', '........'], r: ['M M M', 'M _ M'] },
    { n: 'Chest', ko: '흉갑', icon: ['.hh..hh.', 'hddhhddh', 'hddddddh', '.hddddh.', '.hddddh.', '.hddddh.', '.hhhhhh.', '........'], r: ['M _ M', 'M M M', 'M M M'] },
    { n: 'Legs', ko: '각반', icon: ['.hhhhhh.', '.hddddh.', '.hd..dh.', '.hd..dh.', '.hd..dh.', '.hd..dh.', '.hh..hh.', '........'], r: ['M M M', 'M _ M', 'M _ M'] },
    { n: 'Boots', ko: '장화', icon: ['........', '........', '.hh..hh.', '.hd..dh.', '.hd..dh.', 'hhd..dhh', 'hhh..hhh', '........'], r: ['M _ M', 'M _ M'] },
];
export function armorId(tier, piece) { return tier < 4 ? ARM0 + tier * 4 + piece : XTOOL + 40 + (tier - 4) * 4 + piece; }
export let NITEM = 175;   // ids 0 .. NITEM-1 (set again below)
// the smithing table: a diamond piece and an abyss ingot make the abyss piece
export const SMITH = [0, 1, 2, 3, 4].map(k => [toolId(k, 3), toolId(k, 4)]).concat([0, 1, 2, 3].map(p => [armorId(2, p), armorId(3, p)]));

// ------------------------------------------------------------------ recipes
// rows of item names ('_' empty); `m` mirrored too; shapeless one-ingredient ones are 1 x 1
export const RECIPES = [
    { r: ['logOak'], out: 'planks', n: 4 },
    { r: ['logBirch'], out: 'planks', n: 4 },
    { r: ['logSpruce'], out: 'planks', n: 4 },
    { r: ['#planks', '#planks'], out: 'stick', n: 4 },
    { r: ['#planks #planks', '#planks #planks'], out: 'craft', n: 1 },
    { r: ['#stonecraft #stonecraft #stonecraft', '#stonecraft _ #stonecraft', '#stonecraft #stonecraft #stonecraft'], out: 'furnace', n: 1 },
    { r: ['#planks #planks #planks', '#planks _ #planks', '#planks #planks #planks'], out: 'chest', n: 1 },
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
    if (t.smith) return;
    const M = t.mat;
    RECIPES.push({ r: [`${M} ${M} ${M}`, '_ stick _', '_ stick _'], out: toolId(0, ti), n: 1 });
    RECIPES.push({ r: [`${M} ${M}`, `${M} stick`, '_ stick'], out: toolId(1, ti), n: 1, m: 1 });
    RECIPES.push({ r: [M, 'stick', 'stick'], out: toolId(2, ti), n: 1 });
    RECIPES.push({ r: [M, M, 'stick'], out: toolId(3, ti), n: 1 });
    RECIPES.push({ r: [`${M} ${M}`, '_ stick', '_ stick'], out: toolId(4, ti), n: 1, m: 1 });
});
ARMT.forEach((t, ti) => !t.smith && !t.nocraft && ARMP.forEach((p, pi) => RECIPES.push({ r: p.r.map(row => row.replace(/M/g, t.mat)), out: armorId(ti, pi), n: 1 })));
RECIPES.push({ r: ['ingotIron _', '_ flint'], out: 'igniter', n: 1, m: 1 });
RECIPES.push({ r: ['_ stick string', 'stick _ string', '_ stick string'], out: 'bow', n: 1, m: 1 });
RECIPES.push({ r: ['flint', 'stick', 'feather'], out: 'arrow', n: 4 });
// v1.4: the key is gone (the old ruins' gates take its place)
RECIPES.push({ r: ['ingotIron ingotIron', '#planks #planks', '#planks #planks'], out: 'smithTable', n: 1 });
RECIPES.push({ r: ['scrap ingotGold scrap', 'ingotGold _ ingotGold', 'scrap ingotGold scrap'], out: 'abyssIngot', n: 1 });
RECIPES.push({ r: ['fireStone'], out: 'blazePowder', n: 2 });
RECIPES.push({ r: ['blazePowder voidPearl'], out: 'voidEye', n: 1, m: 1 });
RECIPES.push({ r: ['shell', 'chest', 'shell'], out: 'shellBox', n: 1 });
RECIPES.push({ r: ['#planks _ #planks', '#planks #planks #planks'], out: 'boat', n: 1 });
RECIPES.push({ r: ['ashstone ashstone', 'ashstone ashstone'], out: 'blackBricks', n: 4 });
RECIPES.push({ r: ['ashBrick ashBrick', 'ashBrick ashBrick'], out: 'blackBricks', n: 1 });
RECIPES.push({ r: ['voidStone voidStone', 'voidStone voidStone'], out: 'voidBricks', n: 4 });
// furnace: input -> output
export const SMELT = [
    ['oreIron', 'ingotIron'], ['oreGold', 'ingotGold'], ['sand', 'glass'], ['cobble', 'stone'], ['clayBall', 'brick'],
    ['porkRaw', 'porkCooked'], ['beefRaw', 'steak'], ['chickenRaw', 'chickenCooked'], ['logOak', 'coal'], ['logBirch', 'coal'], ['logSpruce', 'coal'],
    ['clay', 'terracotta'], ['ashstone', 'ashBrick'], ['ashSand', 'glass'], ['debris', 'scrap'],
];

// ------------------------------------------------------------------ mobs
// boxes in 1/16 block: [x0, y0, z0, x1, y1, z1, colour, part]; the mob faces +z.
// part 0 still, 1 left front leg / right arm, 2 right front leg / left arm, 3 / 4 the back legs,
// 5 the head. Legs swing about their top, the head turns with the mob.
export const MOBS = [
    null,
    { n: 'pig', ai: 0, ko: '돼지', hp: 10, w: 0.9, h: 0.9, speed: 1.6, drop: ['porkRaw', 1, 3], boxes: [
        [-5, 6, -8, 5, 14, 8, 'f0a8a8', 0],
        [-4, 8, 8, 4, 16, 15, 'f0a8a8', 5], [-2, 9, 15, 2, 12, 16, 'd88a8a', 5], [-3, 13, 15, -1, 15, 15.5, '202020', 5], [1, 13, 15, 3, 15, 15.5, '202020', 5],
        [-5, 0, 4, -1, 6, 8, 'e09898', 1], [1, 0, 4, 5, 6, 8, 'e09898', 2], [-5, 0, -8, -1, 6, -4, 'e09898', 3], [1, 0, -8, 5, 6, -4, 'e09898', 4]] },
    { n: 'cow', ai: 0, ko: '소', hp: 10, w: 0.9, h: 1.4, speed: 1.4, drop: ['beefRaw', 1, 3, 'leather', 0, 2], boxes: [
        [-6, 12, -9, 6, 22, 9, '5a3a24', 0], [-6.1, 14, -4, 6.1, 20, 2, 'e8e2d8', 0],
        [-4, 16, 9, 4, 24, 15, '5a3a24', 5], [-3, 16, 15, 3, 19, 16, 'd8b8a0', 5], [-3, 21, 15, -1, 23, 15.5, '202020', 5], [1, 21, 15, 3, 23, 15.5, '202020', 5], [-6, 23, 11, -4, 25, 12, 'e8e2d8', 5], [4, 23, 11, 6, 25, 12, 'e8e2d8', 5],
        [-6, 0, 5, -2, 12, 9, '4a2e1c', 1], [2, 0, 5, 6, 12, 9, '4a2e1c', 2], [-6, 0, -9, -2, 12, -5, '4a2e1c', 3], [2, 0, -9, 6, 12, -5, '4a2e1c', 4]] },
    { n: 'sheep', ai: 0, ko: '양', hp: 8, w: 0.9, h: 1.3, speed: 1.4, drop: ['wool', 1, 1], boxes: [
        [-6, 11, -8, 6, 21, 8, 'eeeeee', 0],
        [-3, 15, 8, 3, 22, 14, 'c8b8a8', 5], [-2, 18, 14, -0.5, 20, 14.5, '202020', 5], [0.5, 18, 14, 2, 20, 14.5, '202020', 5], [-4, 19, 8, 4, 23, 11, 'eeeeee', 5],
        [-5, 0, 4, -1, 11, 8, 'c8b8a8', 1], [1, 0, 4, 5, 11, 8, 'c8b8a8', 2], [-5, 0, -8, -1, 11, -4, 'c8b8a8', 3], [1, 0, -8, 5, 11, -4, 'c8b8a8', 4]] },
    { n: 'chicken', ai: 0, ko: '닭', hp: 4, w: 0.5, h: 0.7, speed: 1.2, drop: ['chickenRaw', 1, 1, 'feather', 0, 2], boxes: [
        [-3, 4, -4, 3, 10, 4, 'f4f4f4', 0], [-4, 5, -3, -3, 9, 3, 'e4e4e4', 0], [3, 5, -3, 4, 9, 3, 'e4e4e4', 0],
        [-2, 8, 3, 2, 14, 6, 'f4f4f4', 5], [-2, 10, 6, 2, 12, 8, 'f0a020', 5], [-1, 8, 6, 1, 10, 7, 'd82020', 5], [-2, 12, 6, -1, 13, 6.5, '202020', 5], [1, 12, 6, 2, 13, 6.5, '202020', 5],
        [-2, 0, 0, -1, 4, 1, 'f0a020', 1], [1, 0, 0, 2, 4, 1, 'f0a020', 2]] },
    { n: 'zombie', ai: 1, ko: '좀비', hp: 20, w: 0.6, h: 1.9, speed: 2.3, hostile: 1, burns: 1, dmg: 3, drop: ['flesh', 0, 2], boxes: [
        [-4, 12, -2, 4, 24, 2, '6b5a3a', 0], [-4, 12, -2.1, 4, 16, 2.1, '4a3a26', 0],
        [-4, 24, -4, 4, 32, 4, '7a9a7a', 5], [-3, 27, 4, -1, 29, 4.5, '3a0a0a', 5], [1, 27, 4, 3, 29, 4.5, '3a0a0a', 5], [-4, 31, -4, 4, 32.5, 4, '3a3a2a', 5],
        [-8, 20, -2, -4, 24, 12, '7a9a7a', 1], [4, 20, -2, 8, 24, 12, '7a9a7a', 2],
        [-4, 0, -2, 0, 12, 2, '3a3a48', 3], [0, 0, -2, 4, 12, 2, '3a3a48', 4]] },
    { n: 'skeleton', ai: 2, ko: '해골', hp: 20, w: 0.6, h: 1.9, speed: 2.1, hostile: 1, burns: 1, dmg: 3, drop: ['bone', 0, 2, 'arrow', 0, 2], boxes: [
        [-3, 13, -1, 3, 24, 1, 'd8d8cc', 0], [-4, 21, -1.5, 4, 23, -0.5, 'c0c0b4', 0], [-4, 17, -1.5, 4, 19, -0.5, 'c0c0b4', 0],
        [-4, 24, -4, 4, 32, 4, 'e0e0d4', 5], [-3, 27, 4, -1, 29, 4.5, '202020', 5], [1, 27, 4, 3, 29, 4.5, '202020', 5], [-1, 25, 4, 1, 26, 4.5, '505050', 5],
        [-6, 12, -1, -4, 24, 1, 'd8d8cc', 1], [4, 12, -1, 6, 24, 1, 'd8d8cc', 2],
        [-3, 0, -1, -1, 13, 1, 'd8d8cc', 3], [1, 0, -1, 3, 13, 1, 'd8d8cc', 4]] },
    { n: 'spider', ai: 1, ko: '거미', hp: 16, w: 1.3, h: 0.9, speed: 2.6, hostile: 1, dmg: 2, drop: ['string', 0, 2], boxes: [
        [-5, 4, -12, 5, 12, -2, '2e2620', 0], [-3, 5, -2, 3, 11, 1, '3a3028', 0],
        [-4, 4, 1, 4, 12, 8, '3a3028', 5], [-3, 8, 8, -1, 10, 8.5, 'd01818', 5], [1, 8, 8, 3, 10, 8.5, 'd01818', 5], [-2, 6, 8, -1, 7, 8.5, 'd01818', 5], [1, 6, 8, 2, 7, 8.5, 'd01818', 5],
        [-16, 7, 0, -3, 9, 2, '2a221c', 1], [3, 7, 0, 16, 9, 2, '2a221c', 2], [-16, 7, -4, -3, 9, -2, '2a221c', 3], [3, 7, -4, 16, 9, -2, '2a221c', 4],
        [-15, 6, -8, -3, 8, -6, '2a221c', 2], [3, 6, -8, 15, 8, -6, '2a221c', 1], [-14, 5, 3, -3, 7, 5, '2a221c', 4], [3, 5, 3, 14, 7, 5, '2a221c', 3]] },
    // the ashen depths: a hooded ghost that throws fire, a toad that leaps out of the lava
    { n: 'wraith', ai: 3, ko: '잿빛 망령', hp: 10, w: 0.9, h: 1.6, speed: 2.0, hostile: 1, fly: 1, fireproof: 1, dmg: 3, drop: ['fireStone', 0, 1], boxes: [
        [-5, 8, -4, 5, 22, 4, '8a8486', 0], [-6, 18, -5, 6, 28, 5, '6c6668', 5], [-3, 21, 5, 3, 25, 5.5, '1a1418', 5], [-2, 22, 5.2, -1, 23, 5.7, 'ff8a20', 5], [1, 22, 5.2, 2, 23, 5.7, 'ff8a20', 5],
        [-4, 2, -3, -1, 9, 2, '76707a', 3], [1, 0, -3, 4, 9, 2, '76707a', 4], [-8, 12, -2, -5, 20, 6, '8a8486', 1], [5, 12, -2, 8, 20, 6, '8a8486', 2]] },
    { n: 'toad', ai: 4, ko: '용암 두꺼비', hp: 12, w: 1.0, h: 0.8, speed: 2.4, hostile: 1, fireproof: 1, dmg: 4, drop: ['fireStone', 0, 1, 'ashSand', 0, 2], boxes: [
        [-7, 2, -6, 7, 11, 7, '8a2a14', 0], [-6, 11, -4, 6, 13, 6, 'b8401c', 0], [-5, 9, 7, -1, 12, 8, 'ffd040', 5], [1, 9, 7, 5, 12, 8, 'ffd040', 5], [-4, 4, 7, 4, 6, 7.5, '3a0a04', 5],
        [-8, 0, 3, -4, 4, 7, '6a1c0c', 1], [4, 0, 3, 8, 4, 7, '6a1c0c', 2], [-9, 0, -6, -4, 5, -1, '6a1c0c', 3], [4, 0, -6, 9, 5, -1, '6a1c0c', 4]] },
    // the void's warden: a great eye in a dark husk, four vanes beating round it
    { n: 'warden', ai: 9, ko: '공허의 수호자', hp: 200, w: 3.0, h: 3.0, speed: 9, hostile: 1, fly: 1, fireproof: 1, dmg: 5, drop: ['heartCore', 1, 1], boxes: [
        [-20, 6, -20, 20, 42, 20, '2a1c3c', 0], [-14, 12, 20, 14, 36, 22, '1a1028', 5], [-10, 16, 22, 10, 32, 23, 'e8e0ff', 5], [-5, 20, 23, 5, 28, 24, 'c040ff', 5], [-2, 22, 24, -0, 26, 24.5, '100818', 5],
        [-44, 20, -8, -20, 24, 10, '4a3068', 1], [20, 20, -8, 44, 24, 10, '4a3068', 2], [-8, 42, -8, 8, 52, 8, '3a2850', 3], [-8, -4, -8, 8, 6, 8, '3a2850', 4]] },
    // v1.4: a tall dark wanderer (leaves you be until you meet its eyes or hit it; it slips away when hurt),
    // a shell-bug that sits on the void city walls and shoots floating bolts, and a boat
    { n: 'wanderer', ai: 5, ko: '방랑자', hp: 40, w: 0.6, h: 2.9, speed: 3.2, neutral: 1, dmg: 5, drop: ['voidPearl', 0, 1], boxes: [
        [-4, 30, -2, 4, 42, 2, '1a1620', 0],
        [-4, 42, -4, 4, 50, 4, '1e1a26', 5], [-3.5, 45, 4, -1, 46, 4.5, 'd070ff', 5], [1, 45, 4, 3.5, 46, 4.5, 'd070ff', 5],
        [-6, 12, -1, -4, 42, 1, '141018', 1], [4, 12, -1, 6, 42, 1, '141018', 2],
        [-3, 0, -1, -1, 30, 1, '141018', 3], [1, 0, -1, 3, 30, 1, '141018', 4]] },
    { n: 'shellbug', ai: 9, ko: '껍질벌레', hp: 30, w: 1.0, h: 1.0, speed: 0, hostile: 1, still: 1, fireproof: 1, dmg: 0, drop: ['shell', 0, 1], boxes: [
        [-8, 0, -8, 8, 8, 8, '9a6aa8', 0], [-7, 8, -7, 7, 10, 7, 'e8e0b0', 0], [-3, 9, 7, 3, 12, 7.5, '6aa040', 0],
        [-8, 10, -8, 8, 16, 8, '8a5e98', 6]] },
    { n: 'boat', ai: 9, ko: '나무 배', hp: 4, w: 1.3, h: 0.55, speed: 0, still: 1, boat: 1, drop: ['boat', 1, 1], boxes: [
        [-10, 0, -14, 10, 2, 14, '6b5233', 0], [-11, 0, -14, -9, 8, 14, '8a6a40', 0], [9, 0, -14, 11, 8, 14, '8a6a40', 0],
        [-9, 0, 13, 9, 8, 15, '8a6a40', 0], [-9, 0, -15, 9, 8, -13, '8a6a40', 0], [-9, 2, -2, 9, 3, 2, '7a5a34', 0]] },
    // v2.0: the people of the villages and their iron keeper, a mushroom that bursts, the raiders of
    // the watchtowers; in the depths the ash-folk, their boars and the black skeletons of the forts
    { n: 'villager', ai: 7, ko: '마을 사람', hp: 20, w: 0.6, h: 1.95, speed: 1.6, drop: [], egg: ['6a4a2a', 'c8a080'], boxes: [
        [-4, 12, -3, 4, 24, 3, '6a4a2a', 0], [-4.2, 4, -3.2, 4.2, 14, 3.2, '5a3e22', 0], [-6, 17, 2, 6, 21, 6, '6a4a2a', 0], [-2, 18, 5, 2, 20, 6.5, 'c8a080', 0],
        [-4, 24, -4, 4, 34, 4, 'c8a080', 5], [-1, 26, 4, 1, 30, 6, 'b88a6a', 5], [-3, 29, 4, -1, 30, 4.5, '2a6a2a', 5], [1, 29, 4, 3, 30, 4.5, '2a6a2a', 5], [-4.2, 32, -4.2, 4.2, 34.5, 4.2, '3a2a1a', 5],
        [-4, 0, -2, 0, 4, 2, '3a2a1a', 3], [0, 0, -2, 4, 4, 2, '3a2a1a', 4]] },
    { n: 'golem', ai: 8, ko: '철 수호병', hp: 100, w: 1.3, h: 2.7, speed: 1.4, dmg: 10, drop: ['ingotIron', 3, 5], egg: ['d8d0c8', '6a8a4a'], boxes: [
        [-9, 20, -5, 9, 36, 5, 'd0c8c0', 0], [-5, 14, -3, 5, 22, 3, 'c0b8b0', 0], [-6, 26, 4.5, 6, 30, 5.5, '6a8a4a', 0],
        [-4, 36, -4, 4, 46, 4, 'd8d0c8', 5], [-1, 37, 4, 1, 42, 6, 'b8b0a8', 5], [-3, 42, 4, -1, 43, 4.5, 'c02020', 5], [1, 42, 4, 3, 43, 4.5, 'c02020', 5],
        [-13, 6, -3, -9, 36, 3, 'c8c0b8', 1], [9, 6, -3, 13, 36, 3, 'c8c0b8', 2],
        [-7, 0, -3, -1, 14, 3, 'b8b0a8', 3], [1, 0, -3, 7, 14, 3, 'b8b0a8', 4]] },
    { n: 'bombshroom', ai: 6, ko: '폭발 버섯', hp: 20, w: 0.6, h: 1.6, speed: 2.4, hostile: 1, dmg: 0, drop: ['gunpowder', 0, 2], egg: ['c42c2c', 'f0f0e8'], boxes: [
        [-3, 6, -3, 3, 16, 3, 'e8e0cc', 0], [-7, 16, -7, 7, 24, 7, 'c42c2c', 5], [-5, 24, -5, 5, 26, 5, 'c42c2c', 5], [-6, 20, 7, -3, 23, 7.5, 'f0f0e8', 5], [2, 18, 7, 5, 21, 7.5, 'f0f0e8', 5],
        [-2, 11, 3, -0.5, 13, 3.5, '1a1a1a', 0], [0.5, 11, 3, 2, 13, 3.5, '1a1a1a', 0],
        [-3, 0, -2, 0, 6, 1, 'd8d0bc', 3], [0, 0, -1, 3, 6, 2, 'd8d0bc', 4]] },
    { n: 'raider', ai: 2, ko: '약탈자', hp: 24, w: 0.6, h: 1.95, speed: 2.2, hostile: 1, dmg: 3, drop: ['arrow', 0, 2, 'jade', 0, 1], egg: ['4a4a52', '8a8a8a'], boxes: [
        [-4, 12, -2, 4, 24, 2, '3a3a44', 0], [-4.2, 18, -2.2, 4.2, 24, 2.2, '5a3a2a', 0],
        [-4, 24, -4, 4, 32, 4, '9a9a96', 5], [-1, 25, 4, 1, 29, 6, '8a8a86', 5], [-3, 28, 4, -1, 29, 4.5, '1a1a1a', 5], [1, 28, 4, 3, 29, 4.5, '1a1a1a', 5], [-4.2, 31, -4.2, 4.2, 32.5, 4.2, '2a2a2a', 5],
        [-8, 12, -2, -4, 24, 2, '3a3a44', 1], [4, 12, -2, 8, 24, 2, '3a3a44', 2],
        [-4, 0, -2, 0, 12, 2, '2a2a32', 3], [0, 0, -2, 4, 12, 2, '2a2a32', 4]] },
    { n: 'ashpig', ai: 5, neutral: 1, ko: '잿빛 돼지인', hp: 16, w: 0.6, h: 1.95, speed: 2.4, fireproof: 1, dmg: 5, drop: ['goldNugget', 0, 3], egg: ['c88a7a', 'f2d23a'], boxes: [
        [-4, 12, -2, 4, 24, 2, '6a4a2a', 0], [-4.2, 20, -2.2, 4.2, 22, 2.2, 'f2d23a', 0],
        [-5, 24, -4, 5, 32, 4, 'd09888', 5], [-2, 25, 4, 2, 28, 6, 'c08070', 5], [-3, 29, 4, -1, 30, 4.5, '1a1a1a', 5], [1, 29, 4, 3, 30, 4.5, '1a1a1a', 5], [-6, 29, -1, -5, 33, 2, 'd09888', 5], [5, 29, -1, 6, 33, 2, 'd09888', 5],
        [-8, 12, -2, -4, 24, 2, 'd09888', 1], [4, 12, -2, 8, 24, 2, 'd09888', 2],
        [-4, 0, -2, 0, 12, 2, '5a3a1a', 3], [0, 0, -2, 4, 12, 2, '5a3a1a', 4]] },
    { n: 'ashboar', ai: 1, ko: '잿빛 멧돼지', hp: 40, w: 1.3, h: 1.4, speed: 2.6, hostile: 1, fireproof: 1, dmg: 6, drop: ['porkRaw', 2, 4, 'leather', 0, 1], egg: ['8a5a4a', 'e8d8c0'], boxes: [
        [-7, 8, -11, 7, 22, 9, '8a5a4a', 0], [-3, 21, -8, 3, 25, 6, 'a07060', 0],
        [-6, 9, 9, 6, 19, 18, '7a4a3a', 5], [-6, 9, 18, -4, 15, 20, 'e8d8c0', 5], [4, 9, 18, 6, 15, 20, 'e8d8c0', 5], [-4, 16, 18, -2, 18, 18.5, '1a1a1a', 5], [2, 16, 18, 4, 18, 18.5, '1a1a1a', 5],
        [-6, 0, 4, -2, 8, 8, '6a3a2a', 1], [2, 0, 4, 6, 8, 8, '6a3a2a', 2], [-6, 0, -10, -2, 8, -6, '6a3a2a', 3], [2, 0, -10, 6, 8, -6, '6a3a2a', 4]] },
    { n: 'blackskel', ai: 1, ko: '검은 해골', hp: 20, w: 0.7, h: 2.4, speed: 2.3, hostile: 1, fireproof: 1, dmg: 8, drop: ['coal', 0, 1, 'bone', 0, 2, 'skullBlack', 0, 1], egg: ['1e1e22', '4a4a4e'], boxes: [
        [-3.5, 16, -1.2, 3.5, 30, 1.2, '2a2a2e', 0], [-4.5, 26, -1.7, 4.5, 28, -0.7, '1e1e22', 0], [-4.5, 21, -1.7, 4.5, 23, -0.7, '1e1e22', 0],
        [-5, 30, -5, 5, 40, 5, '2e2e32', 5], [-3.5, 34, 5, -1.2, 36, 5.5, '0a0a0a', 5], [1.2, 34, 5, 3.5, 36, 5.5, '0a0a0a', 5],
        [-7, 15, -1.2, -4.5, 30, 1.2, '2a2a2e', 1], [4.5, 15, -1.2, 7, 30, 1.2, '2a2a2e', 2], [5, 6, 0, 6.5, 22, 1.5, '5a5a5a', 2],
        [-3.5, 0, -1.2, -1.2, 16, 1.2, '2a2a2e', 3], [1.2, 0, -1.2, 3.5, 16, 1.2, '2a2a2e', 4]] },
    // v2.1 another player on a server (drawn where their slot says; no mind of its own)
    { n: 'netPlayer', ai: 0, ko: '다른 플레이어', hp: 20, w: 0.6, h: 1.8, speed: 0, drop: [], boxes: [
        [-4, 12, -2, 4, 24, 2, 'c8702a', 0], [-4, 12, -2.1, 4, 14, 2.1, '6a3a1a', 0],
        [-4, 24, -4, 4, 32, 4, 'd8b08a', 5], [-4, 30, -4.2, 4, 32.4, 4.2, '4a2e1a', 5], [-3, 27, 4, -1, 28.5, 4.5, '2a3a6a', 5], [1, 27, 4, 3, 28.5, 4.5, '2a3a6a', 5],
        [-8, 12, -2, -4, 24, 2, 'c8702a', 1], [4, 12, -2, 8, 24, 2, 'c8702a', 2], [-8, 12, -2.1, -4, 14, 2.1, 'd8b08a', 1], [4, 12, -2.1, 8, 14, 2.1, 'd8b08a', 2],
        [-4, 0, -2, 0, 12, 2, '3a4a6a', 3], [0, 0, -2, 4, 12, 2, '3a4a6a', 4], [-4, 0, -2.1, 0, 2, 2.1, '2a2a2a', 3], [0, 0, -2.1, 4, 2, 2.1, '2a2a2a', 4]] },
    // (v2.5) minecarts (ridden, along the rails: src/rails.js); a TNT one goes off when an activator rail lights it
    { n: 'minecart', ai: 9, ko: '광산 수레', hp: 4, w: 0.98, h: 0.7, speed: 0, still: 1, drop: ['minecart', 1, 1], boxes: [
        [-7, 1, -10, 7, 2, 10, '5a5a5a', 0], [-8, 1, -10, -7, 10, 10, '7a7a7a', 0], [7, 1, -10, 8, 10, 10, '7a7a7a', 0], [-7, 1, 9, 7, 10, 10, '6a6a6a', 0], [-7, 1, -10, 7, 10, -9, '6a6a6a', 0],
        [-8.5, 0, -7, -7.5, 2, -4, '2a2a2a', 0], [7.5, 0, -7, 8.5, 2, -4, '2a2a2a', 0], [-8.5, 0, 4, -7.5, 2, 7, '2a2a2a', 0], [7.5, 0, 4, 8.5, 2, 7, '2a2a2a', 0]] },
    { n: 'tntCart', ai: 9, ko: '폭약 광산 수레', hp: 4, w: 0.98, h: 0.7, speed: 0, still: 1, drop: ['tntMinecart', 1, 1], boxes: [
        [-7, 1, -10, 7, 2, 10, '5a5a5a', 0], [-8, 1, -10, -7, 10, 10, '7a7a7a', 0], [7, 1, -10, 8, 10, 10, '7a7a7a', 0], [-7, 1, 9, 7, 10, 10, '6a6a6a', 0], [-7, 1, -10, 7, 10, -9, '6a6a6a', 0],
        [-6, 2, -8, 6, 12, 8, 'c02020', 0], [-6.2, 6, -8.2, 6.2, 8, 8.2, 'e8e8e0', 0],
        [-8.5, 0, -7, -7.5, 2, -4, '2a2a2a', 0], [7.5, 0, -7, 8.5, 2, -4, '2a2a2a', 0], [-8.5, 0, 4, -7.5, 2, 7, '2a2a2a', 0], [7.5, 0, 4, 8.5, 2, 7, '2a2a2a', 0]] },
];

// ------------------------------------------------------------------ v2.0: the families of blocks and items (content.mjs)
export const CONTENT = makeContent(BLOCKS, ITEMS, RECIPES, SMELT);
// a spawn egg for each mob (but the warden, the shell-bug and the boat)
MOBS.forEach((m, i) => {
    if (!m || m.ai === 9) return;
    const c = m.egg || [m.boxes[0][6], m.boxes[m.boxes.length - 1][6]];
    CONTENT.item({ n: 'egg_' + m.n, key: m.n + '_spawn_egg', ko: m.ko + ' 생성 알', cat: 7, icon: CONTENT.ICON.egg2, p: { a: c[0], b: c[1] }, spawn: i });
});
// (v2.5) the minecarts' items, after the eggs (the ids before them stay)
CONTENT.item({ n: 'minecart', key: 'minecart', ko: '광산 수레', cat: 4, st: 1, icon: ['........', '........', '........', 'k......k', 'kaaaaaak', 'kaaaaaak', '.kkkkkk.', '.w....w.'], p: { a: '7a7a7a', k: '4a4a4a', w: '2a2a2a' } });
CONTENT.item({ n: 'tntMinecart', key: 'tnt_minecart', ko: '폭약 광산 수레', cat: 4, st: 1, icon: ['........', '..rwwr..', '..rwwr..', 'krrrrrrk', 'kaaaaaak', 'kaaaaaak', '.kkkkkk.', '.w....w.'], p: { a: '7a7a7a', k: '4a4a4a', w: '2a2a2a', r: 'c02020' } });
CONTENT.R(['ingotIron _ ingotIron', 'ingotIron ingotIron ingotIron'], 'minecart', 1);
CONTENT.R(['tnt', 'minecart'], 'tntMinecart', 1, 1);
// (v2.8) the firework rocket, after them (the ids before stay): paper and gunpowder make three
CONTENT.item({ n: 'fireworkRocket', key: 'firework_rocket', ko: '폭죽 로켓', cat: 6, st: 64, icon: ['.....ww.', '....wrrw', '....rrr.', '...rrr..', '..krr...', '.k......', 'k.......', '........'], p: { r: 'd03030', w: 'f0f0f0', k: '8a6a3a' } });
CONTENT.R(['paper gunpowder'], 'fireworkRocket', 3, 1);
// (v2.9) the enchanted book (its charms in the slot's number) and the totem of undying, after them
CONTENT.item({ n: 'enchantedBook', key: 'enchanted_book', ko: '마법이 부여된 책', cat: 6, st: 1, icon: ['........', '.kkkkkk.', '.kpppppk', '.kpwpppk', '.kppppyk', '.kppyppk', '.kkkkkk.', '........'], p: { k: '5a2a7a', p: 'a060e0', w: 'f0e0ff', y: 'ffe060' } });
CONTENT.item({ n: 'totem', key: 'totem_of_undying', ko: '불사의 토템', cat: 6, st: 1, icon: ['..yyyy..', '.yykkyy.', '..yyyy..', 'yyyggyyy', '..yyyy..', '..yggy..', '..y..y..', '..yy.yy.'], p: { y: 'f2d23a', k: '1a1a1a', g: '3ac06a' } });
// ------------------------------------------------------------------ (v3.0) the genre's other creatures
// After every id before them (mobs, eggs, items), so saves and servers keep theirs. New fields:
// shot (what a shooter throws: 0 arrow, 1 slowing arrow, 2 potion, 3 snowball, 4 trident, 5 three small
// fireballs, 6 spit, 7 black skull, 8 beam, 9 fangs), hitE/hitS (an effect a bite gives, seconds),
// food (the group that breeds it: foodOk), tame (the item that tames it), swim (1 lives in water,
// 2 swims and walks), xp, split (the smaller kind it falls into), rare (item, % a kill by the player).
// Box part 6 is lifted by the mob's state (a shell's lid, a spirit's rods), part 7 shows only when the
// mob is marked (a saddle, a raid captain's banner).
const SC = (boxes, s, dy = 0) => boxes.map(([a, b, c, d, e, f, col, p]) => [a * s, b * s + dy, c * s, d * s, e * s + dy, f * s, col, p]);
const RC = (boxes, map) => boxes.map((b) => { const c = map[b[6]]; return c ? [...b.slice(0, 6), c, b[7]] : b; });
const MB = (n) => MOBS.find((m) => m && m.n === n).boxes;
const BIPED = (o) => [
    [-4, 12, -2, 4, 24, 2, o.body, 0], [-4, 24, -4, 4, 32, 4, o.head, 5], [-3, 27, 4, -1, 29, 4.5, o.eye, 5], [1, 27, 4, 3, 29, 4.5, o.eye, 5],
    ...(o.fwd ? [[-8, 20, -2, -4, 24, 12, o.arm, 1], [4, 20, -2, 8, 24, 12, o.arm, 2]] : [[-8, 12, -2, -4, 24, 2, o.arm, 1], [4, 12, -2, 8, 24, 2, o.arm, 2]]),
    [-4, 0, -2, 0, 12, 2, o.leg, 3], [0, 0, -2, 4, 12, 2, o.leg, 4], ...(o.x || [])];
// a robed one (the village folk's cut): robe, crossed arms or not, head, nose
const ROBED = (o) => [
    [-4, 12, -3, 4, 24, 3, o.robe, 0], [-4.2, 4, -3.2, 4.2, 14, 3.2, o.robe2, 0],
    ...(o.fwd ? [[-8, 20, -2, -4, 24, 12, o.skin, 1], [4, 20, -2, 8, 24, 12, o.skin, 2]] : [[-6, 17, 2, 6, 21, 6, o.robe, 0], [-2, 18, 5, 2, 20, 6.5, o.skin, 0]]),
    [-4, 24, -4, 4, 34, 4, o.skin, 5], [-1, 26, 4, 1, 30, 6, o.nose, 5], [-3, 29, 4, -1, 30, 4.5, o.eye, 5], [1, 29, 4, 3, 30, 4.5, o.eye, 5],
    [-4, 0, -2, 0, 4, 2, o.leg, 3], [0, 0, -2, 4, 4, 2, o.leg, 4], ...(o.x || [])];
const SLIME = [[-4, 0, -4, 4, 8, 4, '6ac85a', 0], [-3, 4.5, 4, -1, 6.5, 4.3, '2a5a2a', 5], [1, 4.5, 4, 3, 6.5, 4.3, '2a5a2a', 5], [-0.5, 2, 4, 1, 3, 4.3, '2a5a2a', 5], [-4.2, 0, -4.2, 4.2, 1, 4.2, '5ab84a', 0]];
const GUARD = [[-6, 1, -6, 6, 13, 6, '5a9a8a', 0], [-3, 4, -11, 3, 10, -6, '4a8a7a', 0], [-1.5, 5, -15, 1.5, 9, -11, '4a8a7a', 0], [-0.5, 6, -17, 0.5, 12, -14, 'c87a3a', 0],
    [-3, 4, 6, 3, 10, 6.5, 'e8e8d8', 5], [-1, 6, 6.5, 1, 8, 6.8, '2a2a2a', 5],
    [-0.5, 13, -0.5, 0.5, 17, 0.5, 'd8c8a0', 0], [-0.5, -2, -0.5, 0.5, 1, 0.5, 'd8c8a0', 0], [6, 6.5, -0.5, 10, 7.5, 0.5, 'd8c8a0', 0], [-10, 6.5, -0.5, -6, 7.5, 0.5, 'd8c8a0', 0]];
const HORSE = (c, d, m, ear = 3) => [[-5, 13, -11, 5, 23, 11, c, 0], [-3, 18, 9, 3, 30, 14, c, 5], [-3, 26, 14, 3, 31, 22, c, 5], [-1, 22, 7, 1, 32, 10, m, 5], [-2.5, 26, 22, 2.5, 29, 23, d, 5],
    [-3, 31, 13, -1.5, 31 + ear, 14.5, c, 5], [1.5, 31, 13, 3, 31 + ear, 14.5, c, 5], [-3.1, 29, 17, -2, 30, 18.5, '1a1a1a', 5], [2, 29, 17, 3.1, 30, 18.5, '1a1a1a', 5], [-1.5, 12, -15, 1.5, 21, -11, m, 0],
    [-5, 0, 6, -2, 13, 10, d, 1], [2, 0, 6, 5, 13, 10, d, 2], [-5, 0, -10, -2, 13, -6, d, 3], [2, 0, -10, 5, 13, -6, d, 4],
    [-5.3, 21, -5, 5.3, 23.4, 3, '5a3a1a', 7], [-5.4, 15, -1.5, -5.1, 21, -0.5, '8a8a8a', 7], [5.1, 15, -1.5, 5.4, 21, -0.5, '8a8a8a', 7]];
const FOX = [[-3, 5, -6, 3, 10, 5, 'e07a2a', 0], [-2.5, 4.9, -5, 2.5, 6, 4, 'f0e8d8', 0], [-4, 6, 5, 4, 12, 10, 'e07a2a', 5], [-1.5, 6, 10, 1.5, 9, 13, 'f0e8d8', 5], [-0.5, 8, 13, 0.5, 9, 13.3, '1a1a1a', 5],
    [-3.5, 12, 6, -1.5, 15, 7, 'e07a2a', 5], [1.5, 12, 6, 3.5, 15, 7, 'e07a2a', 5], [-3, 10, 10, -1.5, 11, 10.3, '1a1a1a', 5], [1.5, 10, 10, 3, 11, 10.3, '1a1a1a', 5],
    [-2, 6, -14, 2, 10, -6, 'e07a2a', 0], [-2.1, 6, -16, 2.1, 10, -14, 'f0e8d8', 0],
    [-3, 0, 3, -1, 5, 5, '3a2a1a', 1], [1, 0, 3, 3, 5, 5, '3a2a1a', 2], [-3, 0, -6, -1, 5, -4, '3a2a1a', 3], [1, 0, -6, 3, 5, -4, '3a2a1a', 4]];
const CAT = (a, s, e) => [[-2, 4, -7, 2, 8, 6, a, 0], [-2.1, 7, -4, 2.1, 8.1, -3, s, 0], [-2.1, 7, 0, 2.1, 8.1, 1, s, 0], [-2.5, 5, 6, 2.5, 10, 10, a, 5], [-0.5, 6, 10, 0.5, 7, 10.3, 'e88a9a', 5],
    [-2.5, 10, 7, -1, 12, 8, a, 5], [1, 10, 7, 2.5, 12, 8, a, 5], [-2, 8, 10, -0.8, 9, 10.3, e, 5], [0.8, 8, 10, 2, 9, 10.3, e, 5], [-0.5, 7, -15, 0.5, 8, -7, a, 0],
    [-2, 0, 3, -1, 4, 4, a, 1], [1, 0, 3, 2, 4, 4, a, 2], [-2, 0, -6, -1, 4, -5, a, 3], [1, 0, -6, 2, 4, -5, a, 4]];
const NEWMOBS = [
    // the dead of the desert, the drowned, the dead of the villages, the cold archers
    { n: 'husk', ai: 1, ko: '메마른 좀비', hp: 20, w: 0.6, h: 1.95, speed: 2.3, hostile: 1, dmg: 3, hitE: 15, hitS: 7, xp: 5, drop: ['flesh', 0, 2], rare: ['ingotIron', 2.5, 'carrot', 2.5, 'potato', 2.5], egg: ['b49a6a', '6a5a3a'],
        boxes: BIPED({ body: '8a7a52', head: 'b49a6a', arm: 'b49a6a', leg: '5a4a32', eye: '2a1a0a', fwd: 1, x: [[-4.2, 31, -4.2, 4.2, 32.6, 4.2, '7a6a42', 5], [-4.1, 12, -2.1, 4.1, 15, 2.1, '6a5a3a', 0]] }) },
    { n: 'drowned', ai: 1, ko: '물귀신', hp: 20, w: 0.6, h: 1.95, speed: 2.0, hostile: 1, burns: 1, dmg: 3, swim: 2, shot: 4, xp: 5, drop: ['flesh', 0, 2], rare: ['ingotGold', 11], egg: ['5a9a8a', '2a4a52'],
        boxes: BIPED({ body: '2e5e5a', head: '5a9a8a', arm: '5a9a8a', leg: '2a4a52', eye: '7af0e0', fwd: 1, x: [[-4.2, 25, -4.3, 4.2, 33, -3.4, '2a6a4a', 5], [-4.1, 16, -2.1, 4.1, 18, 2.1, '3a7a5a', 0]] }) },
    { n: 'zombieVillager', ai: 1, ko: '좀비 마을 사람', hp: 20, w: 0.6, h: 1.95, speed: 2.3, hostile: 1, burns: 1, dmg: 3, xp: 5, drop: ['flesh', 0, 2], rare: ['ingotIron', 2.5, 'carrot', 2.5, 'potato', 2.5], egg: ['5a6a3a', '7a9a6a'],
        boxes: ROBED({ robe: '5a5a3a', robe2: '4a4a2a', skin: '7a9a6a', nose: '6a8a5a', eye: 'b02020', leg: '3a3a2a', fwd: 1 }) },
    { n: 'stray', ai: 2, ko: '서리 해골', hp: 20, w: 0.6, h: 1.99, speed: 2.1, hostile: 1, burns: 1, dmg: 3, shot: 1, xp: 5, drop: ['bone', 0, 2, 'arrow', 0, 2], egg: ['b8c8cc', '4a6a7a'], boxes: [
        [-3, 13, -1, 3, 24, 1, 'b8c8cc', 0], [-4.5, 10, -2.2, 4.5, 24, 2.2, '4a6a7a', 0], [-4.6, 10, -2.3, 4.6, 12, 2.3, '6a8a9a', 0],
        [-4, 24, -4, 4, 32, 4, 'c8d4d8', 5], [-3, 27, 4, -1, 29, 4.5, '101820', 5], [1, 27, 4, 3, 29, 4.5, '101820', 5], [-4.4, 30, -4.4, 4.4, 32.6, 4.4, '4a6a7a', 5],
        [-6, 12, -1, -4, 24, 1, 'b8c8cc', 1], [4, 12, -1, 6, 24, 1, 'b8c8cc', 2], [-3, 0, -1, -1, 13, 1, 'b8c8cc', 3], [1, 0, -1, 3, 13, 1, 'b8c8cc', 4]] },
    // the witch of the swamps, the jelly lumps (three sizes), the night's shade
    { n: 'witch', ai: 2, ko: '마녀', hp: 26, w: 0.6, h: 1.95, speed: 2.0, hostile: 1, dmg: 0, shot: 2, xp: 5, drop: ['glowDust', 0, 1, 'sugar', 0, 1, 'sparkDust', 0, 1, 'stick', 0, 1, 'gunpowder', 0, 1, 'spiderEye', 0, 1], egg: ['3a2a4a', '4aa04a'], boxes: [
        [-4, 0, -2, 0, 6, 2, '2a1a3a', 3], [0, 0, -2, 4, 6, 2, '2a1a3a', 4], [-4.2, 6, -3, 4.2, 24, 3, '3a2a4a', 0], [-6, 17, 2, 6, 21, 6, '3a2a4a', 0], [-2, 18, 5, 2, 20, 6.5, 'b89a7a', 0],
        [-4, 24, -4, 4, 33, 4, 'b89a7a', 5], [-1, 26, 4, 1, 30, 7, 'a88a6a', 5], [0.5, 26, 6.5, 1.5, 27, 7.5, '4a8a2a', 5], [-3, 29, 4, -1, 30, 4.5, '6a2a8a', 5], [1, 29, 4, 3, 30, 4.5, '6a2a8a', 5],
        [-6, 33, -6, 6, 34, 6, '2a2a2a', 5], [-4, 34, -4, 4, 37, 4, '2a2a2a', 5], [-4.2, 34, -4.2, 4.2, 35, 4.2, '4aa04a', 5], [-2, 37, -2, 2, 40, 2, '2a2a2a', 5], [-1, 40, -1, 1, 42, 1, '2a2a2a', 5]] },
    { n: 'slime', ai: 4, ko: '젤리 덩어리', hp: 16, w: 2.04, h: 2.04, speed: 2.0, hostile: 1, dmg: 4, xp: 4, split: 'slimeM', drop: [], egg: ['6ac85a', '2a5a2a'], boxes: SC(SLIME, 4) },
    { n: 'slimeM', ai: 4, ko: '젤리 덩어리', hp: 4, w: 1.02, h: 1.02, speed: 2.0, hostile: 1, dmg: 2, xp: 2, split: 'slimeS', drop: [], noegg: 1, boxes: SC(SLIME, 2) },
    { n: 'slimeS', ai: 4, ko: '젤리 덩어리', hp: 1, w: 0.51, h: 0.51, speed: 2.0, hostile: 1, dmg: 0, xp: 1, drop: ['jellyBall', 0, 2], noegg: 1, boxes: SLIME },
    { n: 'toadL', ai: 4, ko: '용암 두꺼비', hp: 16, w: 2.04, h: 1.6, speed: 2.4, hostile: 1, fireproof: 1, dmg: 6, xp: 4, split: 'toad', drop: ['magmaCream', 0, 1], noegg: 1, boxes: SC(MB('toad'), 2) },
    { n: 'toadS', ai: 4, ko: '용암 두꺼비', hp: 1, w: 0.51, h: 0.4, speed: 2.4, hostile: 1, fireproof: 1, dmg: 3, xp: 1, drop: ['magmaCream', 0, 1], noegg: 1, boxes: SC(MB('toad'), 0.5) },
    { n: 'phantom', ai: 12, ko: '밤그림자', hp: 20, w: 0.9, h: 0.5, speed: 7, hostile: 1, burns: 1, fly: 1, dmg: 2, xp: 5, drop: ['membrane', 0, 1], egg: ['3a4a7a', '6aff5a'], boxes: [
        [-3, 2, -8, 3, 5, 8, '3a4a7a', 0], [-3.5, 1.5, 8, 3.5, 5.5, 13, '3a4a7a', 5], [-3, 4, 13, -1, 5, 13.3, '6aff5a', 5], [1, 4, 13, 3, 5, 13.3, '6aff5a', 5],
        [-18, 3, -6, -3, 4, 6, '4a5a8a', 1], [3, 3, -6, 18, 4, 6, '4a5a8a', 2], [-2, 3, -14, 2, 4.5, -8, '3a4a7a', 0]] },
    // under the ground: the small poisoned spiders of the mines, the stronghold's crawlers, the void's mites
    { n: 'caveSpider', ai: 1, ko: '동굴 거미', hp: 12, w: 0.7, h: 0.5, speed: 2.8, hostile: 1, dmg: 2, hitE: 16, hitS: 7, xp: 5, drop: ['string', 0, 2], rare: ['spiderEye', 33], egg: ['1a3a3a', 'b02020'],
        boxes: RC(SC(MB('spider'), 0.6), { '2e2620': '1a3a3a', '3a3028': '24484a', '2a221c': '183030' }) },
    { n: 'silverfish', ai: 1, ko: '좀벌레', hp: 8, w: 0.4, h: 0.3, speed: 2.6, hostile: 1, dmg: 1, xp: 5, drop: [], egg: ['8a8a8a', '5a5a5a'], boxes: [
        [-1.5, 0, 4, 1.5, 2, 7, '8a8a8a', 5], [-2, 0, 0, 2, 3, 4, '9a9a9a', 0], [-2.5, 0, -4, 2.5, 3.5, 0, '8a8a8a', 0], [-1.5, 0, -7, 1.5, 2.5, -4, '7a7a7a', 0], [-1, 0, -9, 1, 1.5, -7, '6a6a6a', 0]] },
    { n: 'voidMite', ai: 1, ko: '공허 진드기', hp: 8, w: 0.4, h: 0.3, speed: 2.6, hostile: 1, dmg: 2, xp: 3, drop: [], egg: ['2a1a3a', 'd070ff'], boxes: [
        [-2, 0, -4, 2, 3, 4, '2a1a3a', 0], [-1.5, 0, 4, 1.5, 2, 6, '3a2a4a', 5], [-1.2, 1, 6, -0.4, 1.6, 6.3, 'd070ff', 5], [0.4, 1, 6, 1.2, 1.6, 6.3, 'd070ff', 5], [-1, 0, -6, 1, 1.5, -4, '2a1a3a', 0]] },
    // the sea temple's keepers: the spiny fish and their elders
    { n: 'guardian', ai: 2, ko: '가시 물고기', hp: 30, w: 0.85, h: 0.85, speed: 2.5, hostile: 1, dmg: 6, swim: 1, shot: 8, xp: 10, drop: ['aquaShard', 0, 2, 'codRaw', 0, 1], rare: ['aquaCrystal', 40], egg: ['5a9a8a', 'c87a3a'], boxes: GUARD },
    { n: 'elderGuardian', ai: 2, ko: '늙은 가시 물고기', hp: 80, w: 2.0, h: 2.0, speed: 1.2, hostile: 1, dmg: 8, swim: 1, shot: 8, xp: 10, drop: ['aquaShard', 0, 2, 'codRaw', 0, 1, 'wetSponge', 1, 1], egg: ['c8c8b0', '8a7a9a'],
        boxes: RC(SC(GUARD, 2.35, 0.5), { '5a9a8a': 'c8c8b0', '4a8a7a': 'b8b0a0', c87a3a: '8a7a9a' }) },
    // the raiders' kin: the axe men and the conjurers of the dark mansions, the spirits they call, the beast of the raids
    { n: 'axeRaider', ai: 1, ko: '도끼 약탈자', hp: 24, w: 0.6, h: 1.95, speed: 2.4, hostile: 1, dmg: 13, xp: 5, drop: ['jade', 0, 1], egg: ['2a3a3a', '9a9a96'],
        boxes: BIPED({ body: '2a3a3a', head: '9a9a96', arm: '2a3a3a', leg: '1a2a2a', eye: '1a1a1a', x: [[-1, 25, 4, 1, 29, 6, '8a8a86', 5], [-4.2, 30, -4.2, 4.2, 32.5, 4.2, '2a2a2a', 5], [5, 6, 0, 6.5, 22, 1.5, '6a4a2a', 2], [6.5, 6, -1, 9.5, 11, 3, 'c0c0c0', 2]] }) },
    { n: 'conjurer', ai: 2, ko: '주술 약탈자', hp: 24, w: 0.6, h: 1.95, speed: 2.2, hostile: 1, dmg: 6, shot: 9, xp: 10, drop: ['totem', 1, 1, 'jade', 0, 1], egg: ['1a1a22', 'c8a030'],
        boxes: ROBED({ robe: '1a1a22', robe2: '2a2a32', skin: '9a9a96', nose: '8a8a86', eye: '1a1a1a', leg: '1a1a1a', x: [[-4.3, 22, -3.3, 4.3, 23, 3.3, 'c8a030', 0], [-0.5, 4, 3.2, 0.5, 22, 3.5, 'c8a030', 0]] }) },
    { n: 'sprite', ai: 12, ko: '작은 혼령', hp: 14, w: 0.4, h: 0.8, speed: 5, hostile: 1, fly: 1, dmg: 9, xp: 3, drop: [], egg: ['a8b8c8', 'e8f0ff'], boxes: [
        [-1.5, 5, -1, 1.5, 9, 1, 'a8b8c8', 0], [-2, 9, -2, 2, 13, 2, 'c8d8e8', 5], [-1.5, 10.5, 2, -0.5, 11.5, 2.3, '2a6ac8', 5], [0.5, 10.5, 2, 1.5, 11.5, 2.3, '2a6ac8', 5],
        [-6, 7, -2, -1.5, 11, -1.5, 'e8f0ff', 1], [1.5, 7, -2, 6, 11, -1.5, 'e8f0ff', 2], [-1, 1, -1, 1, 5, 1, 'a8b8c8', 0], [2, 4, 1, 2.6, 10, 1.6, 'c0c0c0', 0]] },
    { n: 'ravager', ai: 1, ko: '파괴 짐승', hp: 100, w: 1.95, h: 2.2, speed: 2.0, hostile: 1, dmg: 12, xp: 20, drop: ['saddle', 1, 1], egg: ['5a5a52', 'd8d0b8'], boxes: [
        [-8, 14, -16, 8, 30, 12, '5a5a52', 0], [-6, 16, 12, 6, 30, 24, '4a4a42', 5], [-8, 24, 14, -6, 33, 17, 'd8d0b8', 5], [6, 24, 14, 8, 33, 17, 'd8d0b8', 5], [-5, 13, 20, 5, 18, 25, '3a3a32', 5],
        [-5, 24, 24, -2, 26, 24.3, '1a1a1a', 5], [2, 24, 24, 5, 26, 24.3, '1a1a1a', 5],
        [-8, 0, 6, -3, 14, 11, '4a4a42', 1], [3, 0, 6, 8, 14, 11, '4a4a42', 2], [-8, 0, -15, -3, 14, -10, '4a4a42', 3], [3, 0, -15, 8, 14, -10, '4a4a42', 4]] },
    // the depths: spirits of flame in the forts, the rotted ash-folk, their brutes, the rotted boars, the lava walkers
    { n: 'flameSpirit', ai: 3, ko: '불꽃 정령', hp: 20, w: 0.6, h: 1.8, speed: 2.0, hostile: 1, fly: 1, fireproof: 1, dmg: 6, shot: 5, xp: 10, drop: ['blazeRod', 0, 1], egg: ['e8b030', '5a4a3a'], boxes: [
        [-4, 16, -4, 4, 24, 4, 'e8b030', 5], [-3, 19, 4, -1, 21, 4.3, '1a1a1a', 5], [1, 19, 4, 3, 21, 4.3, '1a1a1a', 5], [-1.5, 4, -1.5, 1.5, 16, 1.5, '5a4a3a', 0],
        [-7, 8, -1, -5, 16, 1, 'f0c040', 6], [5, 8, -1, 7, 16, 1, 'f0c040', 6], [-1, 8, -7, 1, 16, -5, 'f0c040', 6], [-1, 8, 5, 1, 16, 7, 'f0c040', 6],
        [-4, 2, -4, -2, 10, -2, 'd89020', 6], [2, 2, 2, 4, 10, 4, 'd89020', 6], [2, 2, -4, 4, 10, -2, 'd89020', 6], [-4, 2, 2, -2, 10, 4, 'd89020', 6]] },
    { n: 'rotPig', ai: 5, neutral: 1, ko: '썩은 돼지인', hp: 20, w: 0.6, h: 1.95, speed: 2.3, fireproof: 1, dmg: 8, xp: 5, drop: ['flesh', 0, 1, 'goldNugget', 0, 1], rare: ['ingotGold', 2.5], egg: ['c88a7a', '6a8a4a'],
        boxes: RC(MB('ashpig'), { '6a4a2a': '4a5a3a', d09888: 'c88a7a', c08070: '8aa06a', '5a3a1a': '3a4a2a' }).concat([[-5.1, 26, -2, -1, 31, 4.1, '8aa06a', 5], [5, 4, 0, 6.5, 22, 1.5, 'f2d23a', 2]]) },
    { n: 'ashBrute', ai: 1, ko: '잿빛 돼지인 투사', hp: 50, w: 0.6, h: 1.95, speed: 2.5, hostile: 1, fireproof: 1, dmg: 13, xp: 20, drop: [], egg: ['2a2a2a', 'f2d23a'],
        boxes: RC(MB('ashpig'), { '6a4a2a': '2a2a2a', '5a3a1a': '1a1a1a' }).concat([[5, 6, 0, 6.5, 22, 1.5, '6a4a2a', 2], [6.5, 6, -1, 9.5, 11, 3, 'f2d23a', 2]]) },
    { n: 'rotBoar', ai: 1, ko: '썩은 멧돼지', hp: 40, w: 1.3, h: 1.4, speed: 2.6, hostile: 1, fireproof: 1, dmg: 6, xp: 5, drop: ['flesh', 1, 3], egg: ['c8a0a0', '6a8a5a'],
        boxes: RC(MB('ashboar'), { '8a5a4a': 'b89090', a07060: '8aa06a', '7a4a3a': 'a88080', '6a3a2a': '987070' }) },
    { n: 'lavaWalker', ai: 0, ko: '용암 걷개', hp: 20, w: 0.9, h: 1.7, speed: 1.75, fireproof: 1, food: 13, xp: 2, drop: ['string', 2, 5], egg: ['b04a3a', 'e8d8a0'], boxes: [
        [-8, 10, -8, 8, 24, 8, 'b04a3a', 0], [-6, 24, -1, -5, 30, 0, 'e8d8a0', 0], [-2, 24, 2, -1, 31, 3, 'e8d8a0', 0], [3, 24, -3, 4, 29, -2, 'e8d8a0', 0], [5, 24, 3, 6, 30, 4, 'e8d8a0', 0],
        [-4, 18, 8, -1, 20, 8.3, '1a1a1a', 0], [1, 18, 8, 4, 20, 8.3, '1a1a1a', 0], [-6, 0, -2, -2, 10, 2, '7a2a2a', 1], [2, 0, -2, 6, 10, 2, '7a2a2a', 2],
        [-5, 24, -5, 5, 25, 5, '3a2a1a', 7]] },
    // the beasts that keep you: wolves, cats, the jungle's spotted cats, parrots
    { n: 'wolf', ai: 5, neutral: 1, ko: '늑대', hp: 8, w: 0.6, h: 0.85, speed: 2.8, dmg: 4, food: 4, tame: 'bone', xp: 2, drop: [], egg: ['c0b8b0', '8a7a6a'], boxes: [
        [-3, 7, -6, 3, 13, 5, 'b8b0a8', 0], [-4, 7, 2, 4, 14, 7, 'c8c0b8', 0], [-3, 8, 7, 3, 14, 12, 'c0b8b0', 5], [-1.5, 8, 12, 1.5, 11, 15, 'a8a098', 5], [-1, 10, 15, 1, 11, 15.3, '1a1a1a', 5],
        [-3, 14, 8, -1, 16, 10, 'a8a098', 5], [1, 14, 8, 3, 16, 10, 'a8a098', 5], [-2.5, 12, 12, -1, 13, 12.3, '1a1a1a', 5], [1, 12, 12, 2.5, 13, 12.3, '1a1a1a', 5], [-1, 9, -12, 1, 11, -6, 'b8b0a8', 0],
        [-3, 0, 3, -1, 7, 5, 'a8a098', 1], [1, 0, 3, 3, 7, 5, 'a8a098', 2], [-3, 0, -6, -1, 7, -4, 'a8a098', 3], [1, 0, -6, 3, 7, -4, 'a8a098', 4],
        [-4.1, 10, 6, 4.1, 11, 7.1, 'd02020', 7]] },
    { n: 'cat', ai: 0, ko: '고양이', hp: 10, w: 0.6, h: 0.7, speed: 2.6, food: 5, tame: 'codRaw', xp: 2, drop: ['string', 0, 2], egg: ['c88a4a', '8a5a2a'], boxes: CAT('c88a4a', '8a5a2a', '3ac06a').concat([[-2.6, 6, 6.5, 2.6, 6.8, 9, 'd02020', 7]]) },
    { n: 'ocelot', ai: 0, ko: '오실롯', hp: 10, w: 0.6, h: 0.7, speed: 3.0, food: 5, xp: 2, drop: [], egg: ['e8c86a', '6a4a1a'], boxes: CAT('e8c86a', '6a4a1a', '3ac06a') },
    { n: 'parrot', ai: 11, ko: '앵무새', hp: 6, w: 0.5, h: 0.9, speed: 2.0, fly: 1, tame: 'wheatSeeds', xp: 2, drop: ['feather', 1, 2], egg: ['e02a2a', '2a5ae0'], boxes: [
        [-1.5, 3, -1.5, 1.5, 9, 1.5, 'e02a2a', 0], [-1.5, 9, -1, 1.5, 12, 2, 'e02a2a', 5], [-0.5, 9.5, 2, 0.5, 11.5, 3.5, '2a2a2a', 5], [-0.5, 12, -1, 0.5, 14, 1, 'e02a2a', 5], [-1.6, 10.5, 1, 1.6, 11.3, 1.8, 'f0f0f0', 5],
        [-2.5, 4, -1.5, -1.5, 9, 1.5, '2a5ae0', 1], [1.5, 4, -1.5, 2.5, 9, 1.5, '2a5ae0', 2], [-1, 0, -2.5, 1, 4, -1.5, '2a5ae0', 0], [-1, 0, -0.5, -0.3, 3, 0.5, '5a5a5a', 0], [0.3, 0, -0.5, 1, 3, 0.5, '5a5a5a', 0]] },
    // the wild: foxes, rabbits, bees, pandas, the white bears, sea turtles
    { n: 'fox', ai: 0, ko: '여우', hp: 10, w: 0.6, h: 0.7, speed: 3.0, food: 9, xp: 2, drop: [], egg: ['e07a2a', 'f0e8d8'], boxes: FOX },
    { n: 'rabbit', ai: 0, ko: '토끼', hp: 3, w: 0.4, h: 0.5, speed: 2.5, food: 6, xp: 2, drop: ['rabbitHide', 0, 1, 'rabbitRaw', 0, 1], rare: ['rabbitFoot', 10], egg: ['a88a6a', 'f0f0f0'], boxes: [
        [-2.5, 1, -4, 2.5, 6, 3, 'a88a6a', 0], [-2, 4, 3, 2, 8, 7, 'a88a6a', 5], [-1.5, 8, 4, -0.5, 13, 5, 'a88a6a', 5], [0.5, 8, 4, 1.5, 13, 5, 'a88a6a', 5], [-0.5, 5, 7, 0.5, 6, 7.3, 'e88a9a', 5],
        [-1.7, 6, 7, -0.8, 7, 7.3, '1a1a1a', 5], [0.8, 6, 7, 1.7, 7, 7.3, '1a1a1a', 5], [-1, 3, -5, 1, 5, -4, 'f0f0f0', 0],
        [-2.5, 0, -4, -0.5, 2, 0, '98785a', 3], [0.5, 0, -4, 2.5, 2, 0, '98785a', 4], [-1.5, 0, 2, -0.5, 2, 3, '98785a', 1], [0.5, 0, 2, 1.5, 2, 3, '98785a', 2]] },
    { n: 'bee', ai: 12, neutral: 1, ko: '벌', hp: 10, w: 0.7, h: 0.6, speed: 3.0, fly: 1, dmg: 2, hitE: 16, hitS: 10, food: 10, xp: 2, drop: [], egg: ['f0c030', '2a1a0a'], boxes: [
        [-3.5, 2, -5, 3.5, 9, 5, 'f0c030', 0], [-3.6, 2, -1, 3.6, 9.1, 0.5, '2a1a0a', 0], [-3.6, 2, -4, 3.6, 9.1, -2.5, '2a1a0a', 0], [-3, 4, 5, -1, 7, 5.3, '1a1a1a', 5], [1, 4, 5, 3, 7, 5.3, '1a1a1a', 5],
        [-2, 9, 4, -1.5, 12, 5, '2a1a0a', 5], [1.5, 9, 4, 2, 12, 5, '2a1a0a', 5], [-6, 9, -2, -1, 9.5, 3, 'd8f0ff', 1], [1, 9, -2, 6, 9.5, 3, 'd8f0ff', 2], [-0.5, 5, -6.5, 0.5, 6, -5, '1a1a1a', 0]] },
    { n: 'panda', ai: 0, ko: '판다', hp: 20, w: 1.3, h: 1.25, speed: 1.5, food: 11, xp: 2, drop: ['bamboo', 0, 2], egg: ['f0f0e8', '1a1a1a'], boxes: [
        [-7, 8, -10, 7, 20, 9, 'f0f0e8', 0], [-7.1, 12, 2, 7.1, 20.1, 6, '1a1a1a', 0], [-6, 10, 9, 6, 20, 17, 'f0f0e8', 5], [-5, 14, 17, -2, 17, 17.3, '1a1a1a', 5], [2, 14, 17, 5, 17, 17.3, '1a1a1a', 5],
        [-6, 20, 11, -3, 23, 13, '1a1a1a', 5], [3, 20, 11, 6, 23, 13, '1a1a1a', 5], [-1, 11, 17, 1, 13, 18, '1a1a1a', 5],
        [-7, 0, 4, -2, 9, 9, '1a1a1a', 1], [2, 0, 4, 7, 9, 9, '1a1a1a', 2], [-7, 0, -10, -2, 9, -5, '1a1a1a', 3], [2, 0, -10, 7, 9, -5, '1a1a1a', 4]] },
    { n: 'whiteBear', ai: 5, neutral: 1, ko: '흰곰', hp: 30, w: 1.4, h: 1.4, speed: 2.5, dmg: 6, xp: 2, drop: ['codRaw', 0, 2, 'salmonRaw', 0, 2], egg: ['f0f0ea', 'c8c8c0'], boxes: [
        [-7, 10, -12, 7, 22, 10, 'f0f0ea', 0], [-5, 12, 10, 5, 20, 17, 'e8e8e2', 5], [-2.5, 12, 17, 2.5, 16, 20, 'd8d8d0', 5], [-1, 14.5, 20, 1, 16, 20.3, '1a1a1a', 5],
        [-4, 17, 17, -2, 18, 17.3, '1a1a1a', 5], [2, 17, 17, 4, 18, 17.3, '1a1a1a', 5], [-5, 20, 12, -3, 22, 14, 'e8e8e2', 5], [3, 20, 12, 5, 22, 14, 'e8e8e2', 5],
        [-6, 0, 3, -2, 10, 8, 'e8e8e2', 1], [2, 0, 3, 6, 10, 8, 'e8e8e2', 2], [-6, 0, -11, -2, 10, -6, 'e8e8e2', 3], [2, 0, -11, 6, 10, -6, 'e8e8e2', 4]] },
    { n: 'turtle', ai: 0, ko: '바다거북', hp: 30, w: 1.2, h: 0.4, speed: 1.0, swim: 2, food: 12, xp: 2, drop: ['seagrass', 0, 2], egg: ['3a6a3a', '6aa05a'], boxes: [
        [-9, 2, -10, 9, 7, 10, '3a6a3a', 0], [-7, 7, -8, 7, 9, 8, '4a7a3a', 0], [-2.5, 2, 10, 2.5, 6, 15, '6aa05a', 5], [-2.6, 4, 13, 2.6, 5, 14, '1a1a1a', 5],
        [-14, 2, 4, -9, 3, 8, '5a9a4a', 1], [9, 2, 4, 14, 3, 8, '5a9a4a', 2], [-12, 2, -9, -9, 3, -5, '5a9a4a', 3], [9, 2, -9, 12, 3, -5, '5a9a4a', 4]] },
    // the sea: dolphins, squid, fish
    { n: 'dolphin', ai: 10, neutral: 1, ko: '돌고래', hp: 10, w: 0.9, h: 0.6, speed: 6, swim: 1, dmg: 3, xp: 2, drop: ['codRaw', 0, 1], egg: ['7a8aa8', 'd8dce8'], boxes: [
        [-3.5, 0, -8, 3.5, 7, 8, '7a8aa8', 0], [-3, -0.1, -7, 3, 1, 7, 'd8dce8', 0], [-3, 0, 8, 3, 6, 13, '7a8aa8', 5], [-1.5, 0, 13, 1.5, 2.5, 17, '8a9ab8', 5], [-3.1, 3.5, 11, 3.1, 4.5, 12, '1a1a1a', 5],
        [-0.5, 7, -2, 0.5, 11, 3, '6a7a98', 0], [-1.5, 1, -14, 1.5, 5, -8, '7a8aa8', 0], [-5, 2, -17, 5, 3, -13, '6a7a98', 0], [-7, 1, 2, -3.5, 2, 5, '6a7a98', 1], [3.5, 1, 2, 7, 2, 5, '6a7a98', 2]] },
    { n: 'squid', ai: 10, ko: '오징어', hp: 10, w: 0.8, h: 1.0, speed: 1.6, swim: 1, xp: 2, drop: ['inkSac', 1, 3], egg: ['2a3a6a', '1a2a5a'], boxes: [
        [-4, 6, -4, 4, 16, 4, '2a3a6a', 0], [-3.5, 9, 4, -1.5, 11, 4.3, 'e8e8e8', 5], [1.5, 9, 4, 3.5, 11, 4.3, 'e8e8e8', 5],
        [-4, 0, 2, -2, 6, 4, '1a2a5a', 1], [2, 0, 2, 4, 6, 4, '1a2a5a', 2], [-4, 0, -4, -2, 6, -2, '1a2a5a', 3], [2, 0, -4, 4, 6, -2, '1a2a5a', 4]] },
    { n: 'cod', ai: 10, ko: '대구', hp: 3, w: 0.5, h: 0.3, speed: 2.4, swim: 1, xp: 1, drop: ['codRaw', 1, 1], rare: ['boneMeal', 5], egg: ['b0a080', 'c0b090'], boxes: [
        [-1.5, 1, -4, 1.5, 5, 4, 'b0a080', 0], [-1.5, 1, 4, 1.5, 4.5, 6.5, 'c0b090', 5], [-1.6, 3, 4.5, 1.6, 4, 5.5, '1a1a1a', 5], [-0.5, 5, -2, 0.5, 6.5, 2, 'a09070', 0], [-0.5, 1.5, -7, 0.5, 5, -4, 'a09070', 0]] },
    { n: 'salmon', ai: 10, ko: '연어', hp: 3, w: 0.7, h: 0.4, speed: 2.6, swim: 1, xp: 1, drop: ['salmonRaw', 1, 1], rare: ['boneMeal', 5], egg: ['b04a3a', 'd8a080'], boxes: [
        [-2, 1, -6, 2, 6, 6, 'b04a3a', 0], [-1.9, 0.9, -5, 1.9, 2, 5, 'd8a080', 0], [-1.8, 1.5, 6, 1.8, 5.5, 9, 'a04a3a', 5], [-1.9, 3.5, 7, 1.9, 4.5, 8, '1a1a1a', 5], [-0.5, 2, -10, 0.5, 6, -6, '903a2a', 0], [-0.5, 6, -2, 0.5, 8, 2, '903a2a', 0]] },
    { n: 'reefFish', ai: 10, ko: '열대어', hp: 3, w: 0.5, h: 0.4, speed: 2.4, swim: 1, xp: 1, drop: ['tropicalFish', 1, 1], rare: ['boneMeal', 5], egg: ['f08020', 'f0f0f0'], boxes: [
        [-1, 1, -3, 1, 7, 3, 'f08020', 0], [-1.1, 1, -1, 1.1, 7, 0, 'f0f0f0', 0], [-0.5, 7, -1, 0.5, 9, 2, 'f08020', 0], [-0.5, 2, -6, 0.5, 6, -3, 'f0f0f0', 0], [-1.1, 5, 1.5, 1.1, 6, 2.5, '1a1a1a', 5]] },
    { n: 'pufferfish', ai: 10, ko: '복어', hp: 3, w: 0.7, h: 0.7, speed: 1.6, swim: 1, dmg: 1, hitE: 16, hitS: 6, xp: 1, drop: ['pufferfish', 1, 1], rare: ['boneMeal', 5], egg: ['e8c84a', '3a8ac8'], boxes: [
        [-3, 0, -3, 3, 6, 3, 'e8c84a', 0], [-3.5, 2.5, -0.5, 3.5, 3.5, 0.5, 'f0e0a0', 0], [-0.5, 2.5, -3.5, 0.5, 3.5, 3.5, 'f0e0a0', 0], [-0.5, 6, -0.5, 0.5, 7, 0.5, 'f0e0a0', 0],
        [-2.5, 3.5, 3, -1, 5, 3.3, '1a1a1a', 5], [1, 3.5, 3, 2.5, 5, 3.3, '1a1a1a', 5], [-0.5, 1.5, -5, 0.5, 4.5, -3, 'd0b030', 0]] },
    // caves and the mushroom isles: bats, red mushroom cows; the snow keeper (built of snow and a pumpkin)
    { n: 'bat', ai: 11, ko: '박쥐', hp: 6, w: 0.5, h: 0.9, speed: 3.0, fly: 1, xp: 0, drop: [], egg: ['4a3a2a', '1a1a1a'], boxes: [
        [-1.5, 3, -1.5, 1.5, 8, 1.5, '4a3a2a', 0], [-1.5, 8, -1.5, 1.5, 11, 1.5, '5a4a3a', 5], [-1.5, 11, -0.5, -0.5, 12.5, 0.5, '5a4a3a', 5], [0.5, 11, -0.5, 1.5, 12.5, 0.5, '5a4a3a', 5],
        [-1.2, 9.5, 1.5, -0.4, 10.3, 1.8, '1a1a1a', 5], [0.4, 9.5, 1.5, 1.2, 10.3, 1.8, '1a1a1a', 5], [-8, 5, -0.5, -1.5, 10, 0.5, '3a2a1a', 1], [1.5, 5, -0.5, 8, 10, 0.5, '3a2a1a', 2]] },
    { n: 'mooshroom', ai: 0, ko: '버섯 소', hp: 10, w: 0.9, h: 1.4, speed: 1.4, food: 1, xp: 2, drop: ['beefRaw', 1, 3, 'leather', 0, 2], egg: ['b02a2a', 'd8d0c8'],
        boxes: RC(MB('cow'), { '5a3a24': 'b02a2a', e8e2d8: 'd8d0c8', '4a2e1c': '9a2020' }).concat([[-4, 22, -6, -1, 24, -3, 'e02020', 0], [2, 22, 1, 5, 24, 4, 'e02020', 0], [-2.5, 22, -5, -2.4, 23, -4, 'f0f0f0', 0], [-2, 24, 10, 1, 26, 13, 'e02020', 5]]) },
    { n: 'snowKeeper', ai: 8, ko: '눈 수호병', hp: 4, w: 0.7, h: 1.65, speed: 1.6, dmg: 0, shot: 3, xp: 0, drop: ['snowball', 0, 15], egg: ['f4f8ff', 'd8862a'], boxes: [
        [-5, 0, -5, 5, 10, 5, 'f4f8ff', 0], [-4, 10, -4, 4, 18, 4, 'eaf0f8', 0], [-4, 18, -4, 4, 26, 4, 'd8862a', 5], [-3, 20, 4, 3, 24, 4.3, '5a2a0a', 5],
        [-9, 14, -0.5, -4, 15, 0.5, '6a4a2a', 1], [4, 14, -0.5, 9, 15, 0.5, '6a4a2a', 2]] },
    // horses (and the donkeys, the mules of the two, the woolly pack-beasts, the bone horses of the storms)
    { n: 'horse', ai: 13, ko: '말', hp: 22, w: 1.4, h: 1.6, speed: 7, food: 7, xp: 2, drop: ['leather', 0, 2], egg: ['8a5a2a', '2a1a0a'], boxes: HORSE('8a5a2a', '7a4a1a', '2a1a0a') },
    { n: 'donkey', ai: 13, ko: '당나귀', hp: 22, w: 1.4, h: 1.5, speed: 5.5, food: 7, xp: 2, drop: ['leather', 0, 2], egg: ['8a7a6a', '5a4a3a'], boxes: SC(HORSE('8a7a6a', '6a5a4a', '4a3a2a', 7), 0.9) },
    { n: 'mule', ai: 13, ko: '노새', hp: 22, w: 1.4, h: 1.6, speed: 5.5, food: 7, xp: 2, drop: ['leather', 0, 2], egg: ['5a3a1a', '3a2a1a'], boxes: SC(HORSE('5a3a1a', '4a2a10', '2a1a0a', 6), 0.95) },
    { n: 'llama', ai: 13, ko: '라마', hp: 22, w: 0.9, h: 1.87, speed: 2.4, food: 8, shot: 6, xp: 2, drop: ['leather', 0, 2], egg: ['e8dcc0', 'a88a5a'], boxes: [
        [-5, 11, -10, 5, 21, 9, 'e8dcc0', 0], [-3, 19, 6, 3, 30, 11, 'e8dcc0', 5], [-3, 26, 11, 3, 31, 16, 'e8dcc0', 5], [-2, 26, 16, 2, 28, 17, 'd8ccb0', 5],
        [-3, 31, 12, -1.5, 34, 13, 'e8dcc0', 5], [1.5, 31, 12, 3, 34, 13, 'e8dcc0', 5], [-3.1, 29, 14, -2, 30, 15, '1a1a1a', 5], [2, 29, 14, 3.1, 30, 15, '1a1a1a', 5], [-1.5, 15, -12, 1.5, 21, -10, 'e8dcc0', 0],
        [-5, 0, 5, -2, 11, 8, 'd8ccb0', 1], [2, 0, 5, 5, 11, 8, 'd8ccb0', 2], [-5, 0, -9, -2, 11, -6, 'd8ccb0', 3], [2, 0, -9, 5, 11, -6, 'd8ccb0', 4]] },
    { n: 'boneHorse', ai: 13, ko: '해골 말', hp: 15, w: 1.4, h: 1.6, speed: 7, xp: 2, drop: ['bone', 0, 2], egg: ['d8d8c8', '8a8a7a'], boxes: HORSE('d8d8c8', 'b8b8a8', '8a8a7a') },
    // the wanderer with wares (and the trades of its own), the king of the black bones (made of four
    // wailing sands and three black skulls), the raid captain (its banner)
    { n: 'trader', ai: 7, ko: '떠돌이 상인', hp: 20, w: 0.6, h: 1.95, speed: 1.8, xp: 0, drop: [], egg: ['2a4a8a', 'c8a030'],
        boxes: ROBED({ robe: '2a4a8a', robe2: '1a3a6a', skin: 'c8a080', nose: 'b88a6a', eye: '2a6a2a', leg: '3a2a1a', x: [[-4.2, 32, -4.2, 4.2, 34.5, 4.2, '1a3a6a', 5], [-4.3, 22, -3.3, 4.3, 23, 3.3, 'c8a030', 0]] }) },
    { n: 'boneKing', ai: 3, ko: '검은 해골 왕', hp: 300, w: 0.9, h: 3.5, speed: 3, hostile: 1, fly: 1, fireproof: 1, dmg: 8, shot: 7, xp: 50, drop: ['kingStar', 1, 1], egg: ['1e1e22', '4a4a4e'], boxes: SC([
        [-4, 28, -4, 4, 36, 4, '2a2a2e', 5], [-3, 31, 4, -1, 33, 4.3, 'c8d0ff', 5], [1, 31, 4, 3, 33, 4.3, 'c8d0ff', 5], [-12, 24, -3, -6, 30, 3, '2a2a2e', 5], [6, 24, -3, 12, 30, 3, '2a2a2e', 5],
        [-11, 26, 3, -9.5, 27.5, 3.3, 'c8d0ff', 5], [9.5, 26, 3, 11, 27.5, 3.3, 'c8d0ff', 5], [-12, 22, -2, 12, 24, 2, '1e1e22', 0], [-1, 10, -1, 1, 22, 1, '1e1e22', 0],
        [-5, 18, -1, 5, 19.5, 1, '1e1e22', 0], [-5, 15, -1, 5, 16.5, 1, '1e1e22', 0], [-5, 12, -1, 5, 13.5, 1, '1e1e22', 0], [-1, 2, -1, 1, 10, 1, '1e1e22', 0]], 1.5) },
];
MOBS.push(...NEWMOBS);
// a raid captain is a raider marked: its banner (part 7)
MB('raider').push([-4.5, 32, -4.6, 4.5, 44, -3.8, 'e8e8e0', 7], [-1.5, 35, -4.8, 1.5, 41, -4.5, '2a2a2a', 7]);
// a saddled pig (part 7)
MB('pig').push([-5.3, 13, -4, 5.3, 14.4, 3, '5a3a1a', 7]);
// the new items (after the totem: the ids before stay)
{
    const { item, R, S, ICON } = CONTENT;
    const I = (n, key, ko, icon, p, more = {}) => item({ n, key, ko, icon, p, cat: 5, ...more });
    const FISH = ['........', '......a.', '..aaaab.', '.awaaaa.', 'aaaaab..', '.aaaa.b.', '........', '........'];
    const MEAT = ['........', '..aaaa..', '.aabaaa.', 'aaaaaba.', 'abaaaaa.', '.aaaaa..', '..aaa...', '........'];
    I('spiderEye', 'spider_eye', '거미 눈', ['........', '..aaaa..', '.abbbba.', '.abccba.', '.abccba.', '.abbbba.', '..aaaa..', '........'], { a: '8a1a2a', b: 'c02a3a', c: '2a0a0a' }, { food: 2 });
    I('inkSac', 'ink_sac', '먹물 주머니', ICON.ball, { a: '1a1a2a', b: '3a3a5a' });
    I('codRaw', 'raw_cod', '생대구', FISH, { a: 'b0a080', b: '8a7a5a', w: '1a1a1a' }, { food: 2 });
    I('codCooked', 'cooked_cod', '익힌 대구', FISH, { a: 'c89a5a', b: '9a6a3a', w: '1a1a1a' }, { food: 5 });
    I('salmonRaw', 'raw_salmon', '생연어', FISH, { a: 'c05a4a', b: 'e0a080', w: '1a1a1a' }, { food: 2 });
    I('salmonCooked', 'cooked_salmon', '익힌 연어', FISH, { a: 'b06a3a', b: 'e0b080', w: '1a1a1a' }, { food: 6 });
    I('tropicalFish', 'tropical_fish', '열대어', FISH, { a: 'f08020', b: 'f0f0f0', w: '1a1a1a' }, { food: 1 });
    I('pufferfish', 'pufferfish', '복어', ['........', '.b.b.b..', '..aaaa..', 'baawaaab', '.aaaaaa.', 'baaaaaab', '..aaaa..', '.b.b.b..'], { a: 'e8c84a', b: 'f0e0a0', w: '1a1a1a' }, { food: 1 });
    I('rabbitRaw', 'raw_rabbit', '생토끼 고기', MEAT, { a: 'e8a8a0', b: 'f8d8d0' }, { food: 3 });
    I('rabbitCooked', 'cooked_rabbit', '익힌 토끼 고기', MEAT, { a: 'b87a4a', b: 'd8a878' }, { food: 5 });
    I('rabbitHide', 'rabbit_hide', '토끼 가죽', ['........', '.aaaaa..', '.abaaaa.', '.aaaaba.', '.aabaaa.', '..aaaaa.', '........', '........'], { a: 'a88a6a', b: '8a6a4a' });
    I('rabbitFoot', 'rabbit_foot', '토끼 발', ['........', '....aa..', '...aaa..', '...aa...', '..aa....', '.bbb....', '.bb.....', '........'], { a: 'a88a6a', b: 'e8d8c8' });
    I('muttonRaw', 'raw_mutton', '생양고기', MEAT, { a: 'd04a4a', b: 'f0c0c0' }, { food: 2 });
    I('muttonCooked', 'cooked_mutton', '익힌 양고기', MEAT, { a: '9a5a3a', b: 'c88a5a' }, { food: 6 });
    I('saddle', 'saddle', '안장', ['........', '........', '.aaaaaa.', 'aabbbbaa', 'a.bbbb.a', 'k......k', 'k......k', '........'], { a: '8a5a2a', b: '6a3a1a', k: '8a8a8a' }, { st: 1, cat: 6 });
    I('membrane', 'night_membrane', '밤그림자 막', ['........', '.aaaa...', 'abbbba..', 'abbbbba.', '.abbbbba', '..abbbba', '...aaaa.', '........'], { a: '6a7a9a', b: 'c8d0d8' });
    I('ghostTear', 'wraith_tear', '망령의 눈물', ['...a....', '..aba...', '..aba...', '.abbba..', '.abbba..', '..aaa...', '........', '........'], { a: 'b8d8e8', b: 'f0f8ff' });
    I('kingStar', 'king_star', '왕의 별', ['...a....', '...a....', '.aabaa..', 'aabbbaa.', '.aabaa..', '...a....', '...a....', '........'], { a: 'e8e8f8', b: 'fff8c0' }, { cat: 5 });
    I('trident', 'trident', '물창', ['.a.a.a..', '.a.a.a..', '.aaaaa..', '...a....', '...b....', '...b....', '...b....', '...b....'], { a: '5ab8a8', b: '3a7a6a' }, { st: 1, cat: 6, dur: 250 });
    S('codRaw', 'codCooked'); S('salmonRaw', 'salmonCooked'); S('rabbitRaw', 'rabbitCooked'); S('muttonRaw', 'muttonCooked');
    R(['inkSac'], 'blackDye', 1); R(['rabbitHide rabbitHide', 'rabbitHide rabbitHide'], 'leather', 1);
    R(['glass glass glass', 'glass kingStar glass', 'obsidian obsidian obsidian'], 'beacon', 1);
    // a spawn egg for each new kind (the smaller jelly lumps and toads come of the big ones)
    MOBS.forEach((m, i) => {
        if (!m || !NEWMOBS.includes(m) || m.noegg) return;
        const c = m.egg || [m.boxes[0][6], m.boxes[m.boxes.length - 1][6]];
        item({ n: 'egg_' + m.n, key: m.n.replace(/[A-Z]/g, (x) => '_' + x.toLowerCase()) + '_spawn_egg', ko: m.ko + ' 생성 알', cat: 7, icon: ICON.egg2, p: { a: c[0], b: c[1] }, spawn: i });
    });
}
// the genre's drops for the old kinds: mutton, spider eyes, the wraith's tear, the toad as a middle one,
// the black skeleton's skull rare, a totem from the conjurer and not the raider, the iron keeper's poppies
{
    const M = (n) => MOBS.find((m) => m && m.n === n);
    M('sheep').drop.push('muttonRaw', 1, 2);
    M('spider').rare = ['spiderEye', 33];
    M('wraith').drop = ['ghostTear', 0, 1, 'gunpowder', 0, 2];
    Object.assign(M('toad'), { hp: 4, dmg: 4, xp: 2, split: 'toadS' });
    M('blackskel').drop = ['coal', 0, 1, 'bone', 0, 2]; M('blackskel').rare = ['skullBlack', 2.5]; M('blackskel').hitE = 17; M('blackskel').hitS = 10;
    M('golem').drop = ['ingotIron', 3, 5, 'flowerRed', 0, 2];
    M('zombie').rare = ['ingotIron', 2.5, 'carrot', 2.5, 'potato', 2.5];
    M('wanderer').dmg = 7;
    Object.assign(M('pig'), { food: 2 }); Object.assign(M('cow'), { food: 1 }); Object.assign(M('sheep'), { food: 1 }); Object.assign(M('chicken'), { food: 3 }); Object.assign(M('ashboar'), { food: 14 });
    for (const [n, x] of [['zombie', 5], ['skeleton', 5], ['spider', 5], ['wraith', 5], ['toad', 2], ['wanderer', 5], ['shellbug', 5], ['bombshroom', 5], ['raider', 5], ['ashpig', 5], ['ashboar', 5], ['blackskel', 5], ['warden', 500], ['golem', 0], ['villager', 0]]) M(n).xp = x;
    M('skeleton').shot = 0; M('raider').shot = 0; M('wraith').shot = 10;
}
NBLOCK = BLOCKS.length;
NITEM = Math.max(...ITEMS.map(i => i.id)) + 1;


// the typed line: 2-set Korean and Tab completion: node test/hangul.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
F(30);
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const tap = (c, shift) => { if (shift) s.press(16); s.press(c); F(1); s.release(c); if (shift) s.release(16); F(1); };
const CODE = { ' ': 32, '/': 191, '~': [192, 1], '-': 189, '_': [189, 1], '[': 219, ']': 221, '=': 187, ',': 188, '.': 190, '@': [50, 1] };
// Latin letters are the keys (with the Korean mode on they make Korean); A-Z: Shift
const typeText = (t) => { for (const ch of t) { if (/[a-z]/.test(ch)) tap(ch.toUpperCase().charCodeAt(0)); else if (/[A-Z]/.test(ch)) tap(ch.charCodeAt(0), 1); else if (/[0-9]/.test(ch)) tap(ch.charCodeAt(0)); else { const c = CODE[ch]; Array.isArray(c) ? tap(c[0], 1) : tap(c); } } };
const shown = () => s.peek('tline') + s.peek('hcS');
const open = (k = 84) => { tap(k); F(2); };
const close = () => { tap(27); F(2); };
const lat = () => { if (s.peek('hanMode') !== 0) tap(21); };
const kor = () => { if (s.peek('hanMode') !== 1) tap(21); };
s.poke('flying', 0);

// ---- Korean
const cases = [['dkssudgktpdy', '안녕하세요'], ['rkqtdl', '값이'], ['rkqtk', '갑사'], ['dlfrrh', '읽고'], ['dlfrdj', '읽어'], ['ghkdlxld', '화이팅'],
  ['dmlwk', '의자'], ['Tkd', '쌍'], ['RhcWkd', '꽃짱'], ['qkfqrl', '밟기'], ['dhksfy', '완료'], ['ekfrrhrl', '닭고기'], ['rk rk', '가 가'], ['kk', 'ㅏㅏ'], ['rr', 'ㄱㄱ'], ['hk', 'ㅘ'], ['dnpqm', '웨브'], ['akssk', '만나']];
open(); tap(21);
ok(s.peek('hanMode') === 1, '한/영 (21) switches to Korean');
for (const [keys, want] of cases) {
  typeText(keys);
  ok(shown() === want, `${keys} → ${shown()} (${want})`);
  close(); open();
}
typeText('rkqt'); tap(8); ok(shown() === '갑', 'Backspace takes ㅅ off 값: ' + shown());
tap(8); ok(shown() === '가', 'then ㅂ: ' + shown());
tap(8); ok(shown() === 'ㄱ', 'then ㅏ: ' + shown());
typeText('hk'); tap(8); ok(shown() === '고', '과 less ㅏ: ' + shown());
tap(8); tap(8); ok(shown() === '', 'all gone: ' + JSON.stringify(shown()));
typeText('gks'); tap(32); typeText('rmf'); tap(8); tap(8); tap(8); tap(8); ok(shown() === '한', 'Backspace after a whole syllable takes one letter: ' + shown());
close();
// Alt also switches; letters typed while Korean is off are Latin
open(); tap(18); ok(s.peek('hanMode') === 0, 'Alt (18) switches back'); typeText('abc'); ok(shown() === 'abc', 'Latin again: ' + shown());
tap(18); typeText('dk'); tap(18); typeText('x'); ok(shown() === 'abc아x', 'switching mid-line keeps the syllable: ' + shown()); close();

// a chat line in Korean
open(); tap(18); typeText('dkssud'); tap(13); F(2);
let ch = s.peek('CHT'); ok(ch[ch.length - 1].endsWith('안녕'), 'Korean chat: ' + ch[ch.length - 1]);

// a command with a Korean name (a player name: alone in this world any name is the player)
const D = s.peek('ITKEY').indexOf('diamond');
open(191); lat(); typeText('give '); kor(); typeText('cjftn'); lat(); typeText(' diamond 2'); ok(s.peek('tline') === '/give 철수 diamond 2', 'line: ' + s.peek('tline'));
tap(13); F(3); ok(s.peek('INVI').includes(D), 'gave by a Korean name: ' + s.peek('CHT').slice(-1));
// an item by its Korean name with _ for its space
const P = s.peek('ITKEY').indexOf('oak_planks');
open(191); lat(); typeText('give @s '); kor(); typeText('ckaskan_vkswk'); ok(shown() === '/give @s 참나무_판자', 'line: ' + shown()); tap(13); F(3);
ok(s.peek('INVI').includes(P), 'Korean item name with _: ' + s.peek('CHT').slice(-1));

// ---- Tab
open(191); lat(); typeText('gam'); tap(9); ok(s.peek('tline').startsWith('/game'), 'Tab: /gam → ' + s.peek('tline'));
const first = s.peek('tline'); tap(9); ok(s.peek('tline') !== first && s.peek('tline').startsWith('/game'), 'Tab again: the next one ' + s.peek('tline'));
tap(9, 1); ok(s.peek('tline') === first, 'Shift+Tab: back ' + s.peek('tline')); close();
open(191); typeText('gamer'); tap(9); ok(s.peek('tline') === '/gamerule ', 'one alone: a space after: ' + JSON.stringify(s.peek('tline')));
typeText('keep'); tap(9); ok(s.peek('tline') === '/gamerule keepInventory ', 'game rule: ' + s.peek('tline'));
typeText('t'); tap(9); ok(s.peek('tline') === '/gamerule keepInventory true ', 'true: ' + s.peek('tline')); close();
open(191); typeText('give @'); tap(9); ok(s.peek('tline') === '/give @s', 'target @: ' + s.peek('tline')); close();
open(191); typeText('give '); kor(); typeText('vmf'); tap(9); ok(s.peek('tline') === '/give 플레이어 ', 'Korean name by Tab (the syllable is put in first): ' + s.peek('tline'));
lat(); typeText('gold_bl'); tap(9); ok(s.peek('tline') === '/give 플레이어 gold_block ', 'item: ' + s.peek('tline')); close();
open(191); lat(); typeText('give @s '); kor(); typeText('ckaskan'); tap(9); ok(s.peek('tline').startsWith('/give @s 참나무_'), 'item by Korean name: ' + s.peek('tline'));
ok(s.peek('ACL').length > 1 && s.peek('TXS')[121].includes('참나무_'), 'what fits is shown over the line: ' + s.peek('TXS')[121].slice(0, 80)); close();
open(191); lat(); typeText('execute as @s run ti'); tap(9); ok(s.peek('tline') === '/execute as @s run time', 'execute ... run: ' + s.peek('tline'));
typeText(' s'); tap(9); ok(s.peek('tline') === '/execute as @s run time set ', 'its words: ' + s.peek('tline')); close();
open(191); typeText('locate '); kor(); typeText('akdmf'); tap(9); ok(s.peek('tline') === '/locate 마을 ', 'structure in Korean: ' + s.peek('tline')); close();
const MN = s.peek('MNAME'), MK = s.peek('MKEY'); console.log('mobs', MN.slice(1, 8).join(','));
open(191); lat(); typeText('summon pi'); tap(9); ok(s.peek('tline') === '/summon pig ', 'mob: ' + s.peek('tline')); close();
open(191); lat(); typeText('effect give @s ju'); tap(9); ok(s.peek('tline') === '/effect give @s jump_boost ', 'effect: ' + s.peek('tline')); close();
open(191); typeText('weather '); tap(9); ok(s.peek('tline') === '/weather clear', 'empty word: the first choice: ' + s.peek('tline'));
tap(9); tap(9); ok(s.peek('tline') === '/weather thunder', 'cycled: ' + s.peek('tline')); tap(13); F(2);
ok(s.peek('wthr') > 0, 'and it runs: wthr ' + s.peek('wthr'));
open(191); typeText('xyz'); tap(9); ok(s.peek('tline') === '/xyz', 'nothing fits: unchanged'); close();
close(); ok(s.peek('uiMode') === 0 && s.peek('ACL').length === 0, 'closed: nothing over the line');

// random keys (the simulator stops on any letter past the end of a text)
{
  let seed = 7; const rnd = (k) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k; };
  const KEYS = [32, 32, 8, 8, 8, 9, 9, 21, 191, 189, 192, 50, 49, 38, 40, 190, 219, 221];
  for (let i = 65; i <= 90; i++) KEYS.push(i, i);
  let bad = 0;
  for (let r = 0; r < 40; r++) {
    open(r % 2 ? 191 : 84);
    for (let i = 0; i < 60; i++) { const c = KEYS[rnd(KEYS.length)]; tap(c, rnd(4) === 0 ? 1 : 0); }
    if (s.peek('uiMode') !== 9) bad++;
    close();
  }
  ok(bad === 0, 'random keys: no error, the line stays open (' + bad + ')');
}
// keys work again after
const x0 = s.peek('px'), z0 = s.peek('pz');
s.press(87); F(30); s.release(87); F(2);
ok(Math.hypot(s.peek('px') - x0, s.peek('pz') - z0) > 1, 'W moves after');
console.log(fails ? fails + ' FAILED' : 'all ok');

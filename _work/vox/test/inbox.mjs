// (v3.2) the game's own box to write in (keyin.js inboxOpen ...), in place of Entry's ask-and-wait:
// the menus' fields, a sign, a command block, the creative search.  usage: node test/inbox.mjs
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const CODE = { ' ': 32, '/': 191, '-': 189, '_': [189, 1], ',': 188, '.': 190, '*': 106, '@': [50, 1] };
function kit(s) {
  const F = (k = 1) => { for (let i = 0; i < k; i++) s.frame(); };
  const tap = (c, shift) => { if (shift) s.press(16); s.press(c); F(1); s.release(c); if (shift) s.release(16); F(1); };
  const typeText = (t) => { for (const ch of t) { if (/[a-z]/.test(ch)) tap(ch.toUpperCase().charCodeAt(0)); else if (/[A-Z]/.test(ch)) tap(ch.charCodeAt(0), 1); else if (/[0-9]/.test(ch)) tap(ch.charCodeAt(0)); else { const c = CODE[ch]; Array.isArray(c) ? tap(c[0], 1) : tap(c); } } };
  const click = (x, y) => { s.mouse.x = x; s.mouse.y = y; s.click(); F(3); };
  const lat = () => { if (s.peek('hanMode') !== 0) tap(21); };
  const kor = () => { if (s.peek('hanMode') !== 1) tap(21); };
  const shown = () => s.peek('tline') + s.peek('hcS');
  const txt = (slot) => s.peek('TXS')[slot - 1];
  return { F, tap, typeText, click, lat, kor, shown, txt };
}

// ---------------------------------------------------------------- the menus
{
  const s = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
  const { F, tap, typeText, click, lat, kor, shown, txt } = kit(s);
  F(30);
  s.as('pen', () => s.fn.menuGo(2)); F(3);
  ok(s.peek('scr') === 2 && s.peek('ibOn') === 0, 'the new world screen, no box');
  // the name field (-100..100, 86..66)
  click(0, 76);
  ok(s.peek('ibOn') === 1 && shown() === '새 세계', `a click on the name opens the box with the name in it: ${JSON.stringify(shown())}`);
  ok(txt(96) === '세계 이름' && txt(97).startsWith('새 세계'), `the box shows what is asked and the line: ${txt(96)} / ${txt(97)}`);
  ok(txt(20) === '​', 'the screen behind shows no words');
  tap(8); tap(8); tap(8); tap(8);
  ok(shown() === '', 'Backspace empties it: ' + JSON.stringify(shown()));
  kor(); typeText('dnfl wlq'); lat(); typeText(' Abc2');
  ok(shown() === '우리 집 Abc2', 'Korean and Latin typed: ' + shown());
  ok(txt(98).startsWith('[A]'), 'the mode mark: ' + txt(98).slice(0, 12));
  tap(13); F(2);
  ok(s.peek('ibOn') === 0 && s.peek('cwName') === '우리 집 Abc2', `Enter gives the name: ${s.peek('cwName')}`);
  ok(s.peek('scr') === 2 && s.peek('typing') === 0 && txt(20) === '세계 이름', 'the screen is back');
  // Esc changes nothing
  click(0, 76); typeText('zzz'); ok(shown() === '우리 집 Abc2zzz', 'typed after the name: ' + shown());
  tap(27); F(2);
  ok(s.peek('ibOn') === 0 && s.peek('cwName') === '우리 집 Abc2', 'Esc: the name as it was');
  // Korean left half-made is put in by Enter; Backspace takes a syllable apart
  click(0, 76); kor(); typeText('rkqt'); tap(8); ok(shown().endsWith('갑'), 'Backspace takes ㅅ off 값: ' + shown());
  tap(13); F(2); ok(s.peek('cwName') === '우리 집 Abc2갑', 'Enter puts the syllable in: ' + s.peek('cwName'));
  click(0, 76); lat(); tap(27); F(2);
  // an empty line: the name stays (as before)
  click(0, 76); for (let i = 0; i < 20; i++) tap(8); tap(13); F(2);
  ok(s.peek('cwName') === '우리 집 Abc2갑', 'an empty name is not taken');
  // the box's own buttons; 확인 (-100..-4, -22..-44) lies over 세계 종류 (-100..100, -10..-30)
  const flat0 = s.peek('cwFlat'), mode0 = s.peek('cwMode');
  click(0, 76); typeText('q'); click(-50, -26);
  ok(s.peek('ibOn') === 0 && s.peek('cwName') === '우리 집 Abc2갑q', '확인 clicked: ' + s.peek('cwName'));
  ok(s.peek('cwFlat') === flat0 && s.peek('cwMode') === mode0 && s.peek('scr') === 2, 'the click did not go on into the screen behind');
  click(0, 76); typeText('w'); click(50, -33);
  ok(s.peek('ibOn') === 0 && s.peek('cwName') === '우리 집 Abc2갑q', '취소 clicked: nothing changed');
  // the keys behind: a click on the screen's buttons while the box is open does nothing
  click(0, 76); click(80, -112); ok(s.peek('scr') === 2 && s.peek('ibOn') === 1, 'the screen\'s 취소 under the open box is not clicked'); tap(27); F(2);
  // the seed (-100..100, 16..-4): typed, then emptied
  click(0, 6); ok(s.peek('ibOn') === 1 && s.peek('ibWho') === 3, 'the seed field opens the box');
  typeText('77'); tap(13); F(2);
  ok(`${s.peek('cwSeedText')}` === '77', 'a seed of digits stays as typed (not added up): ' + s.peek('cwSeedText'));
  click(0, 6); ok(shown() === '77', 'it is there to change: ' + shown()); tap(8); tap(8); tap(13); F(2);
  ok(s.peek('cwSeedText') === '', 'emptied: a random seed again');
  // the length: a name is 24 letters at most
  click(0, 76); typeText('abcdefghijklmnopqrstuvwxyz'); tap(13); F(2);
  ok(s.peek('cwName').length === 24, 'no longer than 24: ' + s.peek('cwName').length);
  // flat layers: a wrong line is not taken and says why
  s.poke('cwFlat', 1); F(2);
  const spec0 = s.peek('cwFlatSpec');
  click(0, -72); ok(s.peek('ibOn') === 1 && s.peek('ibWho') === 4 && shown() === spec0, 'the layers field: ' + shown());
  for (let i = 0; i < 60; i++) tap(8);
  typeText('bedrock,3*stone,grass_block'); tap(13); F(2);
  ok(s.peek('cwFlatSpec') === 'bedrock,3*stone,grass_block', 'layers typed: ' + s.peek('cwFlatSpec'));
  click(0, -72); for (let i = 0; i < 60; i++) tap(8); typeText('nosuchblock'); tap(13); F(2);
  ok(s.peek('cwFlatSpec') === 'bedrock,3*stone,grass_block' && s.peek('menuErrT') > 0, 'wrong layers: kept as they were, and said: ' + s.peek('menuErr'));
  // the server screens
  s.as('pen', () => { s.fn.menuGo(5); }); s.poke('esEdit', 0); F(3);
  click(0, 82); kor(); typeText('xptmxm'); lat(); tap(13); F(2);
  ok(s.peek('esName') === '테스트', 'a server\'s name: ' + s.peek('esName'));
  click(0, 46); typeText('hello'); tap(13); F(2);
  ok(s.peek('esMotd').endsWith('hello'), 'its line: ' + s.peek('esMotd'));
  s.as('pen', () => { s.fn.menuGo(6); }); F(3);
  click(0, 36); typeText('abc'); tap(13); F(2);
  ok(s.peek('dcName') === 'abc' && s.peek('scr') === 6, 'the name to connect to: ' + s.peek('dcName'));
  // leaving for the title shuts a box left open
  click(0, 36); ok(s.peek('ibOn') === 1, 'open again');
  s.as('pen', () => { s.fn.menuEnter(); }); F(2);
  ok(s.peek('ibOn') === 0 && s.peek('typing') === 0, 'the title again: no box, the keys free');
}

// ---------------------------------------------------------------- in the game
{
  const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
  const { F, tap, typeText, lat, kor, shown, txt } = kit(s);
  let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
  F(30);
  s.poke('flying', 0); F(40);
  const X = Math.floor(s.peek('px')) + 2, Y = Math.floor(s.peek('py')), Z = Math.floor(s.peek('pz'));
  // a sign
  s.as('pen', () => s.fn.signUse(X, Y, Z, 0)); F(2);
  ok(s.peek('uiMode') === 14 && s.peek('ibOn') === 1 && s.peek('tline') === '', 'a new sign opens the box (uiMode 14)');
  const p0 = [s.peek('px'), s.peek('pz')], hot0 = s.peek('hotSel'), help0 = s.peek('helpT');
  // held a while, as a player's keys are
  for (const c of [87, 65, 83, 68]) { s.press(c); F(12); s.release(c); F(1); }
  ok(s.peek('px') === p0[0] && s.peek('pz') === p0[1], `W A S D typed do not walk: ${s.peek('px')}, ${s.peek('pz')}`);
  ok(shown().startsWith('wasd') || /^w+a+s+d+$/.test(shown()), 'they are letters in the line: ' + shown());
  for (let i = 0; i < 20; i++) tap(8);
  typeText('5het');
  ok(s.peek('hotSel') === hot0 && s.peek('uiMode') === 14, '5, E and T typed: the hotbar, the inventory, the chat stay as they are');
  ok(s.peek('helpT') <= help0, 'H typed does not turn the help on');
  for (let i = 0; i < 5; i++) tap(8);
  kor(); typeText('dkssud'); lat(); typeText(' 123');
  tap(13); F(2);
  let sg = s.peek('SGT');
  ok(s.peek('uiMode') === 0 && s.peek('ibOn') === 0 && sg[sg.length - 1] === '안녕 123', 'Enter writes the sign: ' + sg[sg.length - 1]);
  F(3); ok(s.peek('uiMode') === 0 && s.peek('typing') === 0, 'the Enter did not open anything else');
  // the same sign with Shift: its words are there to change; Esc leaves them
  s.poke('sneaking', 1); s.as('pen', () => s.fn.signUse(X, Y, Z, 0)); s.poke('sneaking', 0); F(2);
  ok(shown() === '안녕 123', 'the words on it are in the box: ' + shown());
  typeText('zz'); tap(27); F(2);
  sg = s.peek('SGT');
  ok(s.peek('uiMode') === 0 && sg.length === 1 && sg[0] === '안녕 123', 'Esc: the sign as it was');
  // 60 letters at most; a long line shows its end
  s.poke('sneaking', 1); s.as('pen', () => s.fn.signUse(X, Y, Z, 0)); s.poke('sneaking', 0); F(2);
  for (let i = 0; i < 10; i++) tap(8);
  for (let i = 0; i < 70; i++) tap(65 + (i % 26));
  ok(shown().length === 60, 'a sign takes 60 letters: ' + shown().length);
  typeText('  '); kor(); typeText('rkskekfkakqktkdkwkckzkxkvkgkrkskekfkakqktkdkwk'); lat();
  tap(13); F(2);
  // a command block (creative)
  s.as('pen', () => s.fn.commandBlockEdit(X, Y, Z + 2)); F(2);
  ok(s.peek('uiMode') === 14 && s.peek('ibWho') === 13, 'a command block opens the box');
  typeText('/say hello, world'); tap(13); F(2);
  let cb = s.peek('CBT');
  ok(cb[cb.length - 1] === '/say hello, world' && s.peek('uiMode') === 0, 'the command is in: ' + cb[cb.length - 1]);
  s.as('pen', () => s.fn.commandBlockEdit(X, Y, Z + 2)); F(2);
  ok(shown() === '/say hello, world', 'and there to change: ' + shown());
  for (let i = 0; i < 80; i++) tap(65 + (i % 26));
  ok(txt(97).startsWith('…') && txt(97).length < 90, 'a long line shows its end: ' + txt(97).slice(0, 20));
  tap(27); F(2);
  cb = s.peek('CBT'); ok(cb.length === 1 && cb[0] === '/say hello, world', 'Esc: the command as it was');
  // the creative search
  tap(69); F(2);
  ok(s.peek('uiMode') === 5, 'E: the creative inventory');
  s.as('pen', () => s.fn.palSearch()); F(2);
  ok(s.peek('uiMode') === 14 && s.peek('ibBack') === 5, 'the search opens the box over it');
  typeText('diamond'); tap(13); F(2);
  ok(s.peek('uiMode') === 5 && s.peek('srchText') === 'diamond' && s.peek('SRCH').length > 3 && s.peek('uiTab') === s.peek('NCAT'), `found ${s.peek('SRCH').length} for diamond, back in the inventory`);
  s.as('pen', () => s.fn.palSearch()); F(2);
  typeText('e'); tap(27); F(3);
  ok(s.peek('uiMode') === 5 && s.peek('srchText') === 'diamond', 'Esc shuts the box only (the inventory stays open), the search as it was');
  s.as('pen', () => s.fn.palSearch()); F(2);
  kor(); typeText('ekdldk'); lat(); tap(13); F(2);
  ok(s.peek('uiMode') === 5 && s.peek('srchText') === '다이아' && s.peek('SRCH').length > 3, `found ${s.peek('SRCH').length} for 다이아`);
  tap(27); F(2); ok(s.peek('uiMode') === 0, 'Esc now shuts the inventory');
  // shut by something else: the keys are the game's again
  s.as('pen', () => s.fn.signUse(X + 3, Y, Z, 0)); F(2);
  ok(s.peek('typing') === 1, 'open');
  s.poke('uiMode', 0); F(2);
  ok(s.peek('ibOn') === 0 && s.peek('typing') === 0, 'the screen changed under it: the box is gone');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);

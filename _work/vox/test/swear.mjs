// (v2.7.3) swear words in the chat as *: node test/swear.mjs
import { createSim } from '../sim.mjs';
const s = createSim({ consts: { AUTOSEED: 1234, TESTRUN: 1, AUTOMODE: 1, ANIMALS: 0 } });
const F = (k = 1) => { for (let i = 0; i < k; i++) { try { s.frame(); } catch (e) { console.log('ERR', e.message, e.stack.split('\n').slice(1, 4).join(' | ')); process.exit(1); } } };
let n = 0; while (s.peek('gState') !== 2 && n < 5000) { F(1); n++; }
const fn = s.fn, call = (f) => s.as('pen', f);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const sw = (t) => String(call(() => fn.swFilter(t)));
// [line, what it should be]
const CASES = [
  ['아 씨발 진짜', '아 ** 진짜'], ['시발', '**'], ['ㅅㅂ', '**'], ['ㅆㅂ 뭐야', '** 뭐야'], ['시.발', '***'], ['시 발', '* *'], ['씨1발', '***'],
  ['쉬발', '**'], ['씨팔', '**'], ['시벌', '**'], ['씨빨놈아', '**놈아'], ['쓰발', '**'], ['씨바 뭐야', '** 뭐야'], ['아 시바', '아 **'], ['씨부랄', '***'],
  ['좆같네', '*같네'], ['좆까', '*까'], ['조까', '**'], ['존나 좋아', '** 좋아'], ['졸라 빠름', '** 빠름'], ['ㅈㄴ', '**'],
  ['병신아', '**아'], ['븅신', '**'], ['ㅂㅅ', '**'], ['ㅄ', '*'], ['등신', '**'],
  ['개새끼', '***'], ['개새기', '***'], ['새끼야', '**야'], ['쌔끼', '**'], ['개색기', '***'], ['ㅅㄲ', '**'],
  ['미친놈', '***'], ['미친년아', '***아'], ['지랄하네', '**하네'], ['ㅈㄹ', '**'], ['염병', '**'], ['엠창', '**'],
  ['니애미', '***'], ['느금마', '***'], ['찐따', '**'], ['또라이', '***'], ['뒈져라', '**라'], ['엿먹어', '**어'], ['썅', '*'], ['ㅗ', '*'], ['개자식', '***'], ['후레자식', '****'],
  ['fuck', '****'], ['FUCK you', '**** you'], ['f*ck', '****'], ['f u c k', '* * * *'], ['motherfucker', 'mother****er'], ['what the fuck', 'what the ****'],
  ['shit', '****'], ['sh1t', '****'], ['bullshit', 'bull****'], ['bitch', '*****'], ['b!tch', '*****'], ['asshole', '*******'], ['a$$hole', '*******'],
  ['wtf', '***'], ['stfu', '****'], ['dick', '****'], ['nigga', '*****'], ['you retard', 'you ******'],
  // (v2.7.4) got round before: letters between, a vowel said again, look-alike vowels and consonants, jamo spelt out
  ['시ㅋ발', '***'], ['시ㅋㅋㅋ발', '*****'], ['씨이발', '***'], ['씨이이이발', '*****'], ['시ㅣ발', '***'], ['시ㅡ발', '***'], ['시 ㅋ 발', '* * *'],
  ['ㅅㅣㅂㅏㄹ', '*****'], ['ㅅl발', '***'], ['ㅅ1발', '***'], ['시바ㄹ', '***'], ['시바알', '***'], ['씨바아알 뭐야', '**** 뭐야'], ['시봘', '**'], ['씨뱔', '**'], ['시1ㅋ발', '****'],
  ['섀끼', '**'], ['쉐끼', '**'], ['쇄끼', '**'], ['세끼야', '**야'], ['개섀끼', '***'], ['개쉐키', '***'], ['새퀴', '**'], ['색히', '**'], ['색휘', '**'], ['이 새꺄', '이 **'], ['개새ㅋ끼', '****'], ['새ㄲ', '**'],
  ['병1신', '***'], ['병ㅋ신', '***'], ['벼엉신', '***'], ['빙신', '**'], ['뷩신', '**'], ['병쉰', '**'], ['ㅂ신', '**'], ['븅ㅅ', '**'],
  ['존1나', '***'], ['조온나', '***'], ['죤나', '**'], ['쫀나', '**'], ['존냐', '**'], ['졸랴', '**'], ['지이랄', '***'], ['쥐랄', '**'], ['지럴', '**'], ['찌랄', '**'],
  ['좆ㅋ같네', '*ㅋ같네'], ['좃같네', '*같네'], ['미친ㅋ놈', '****'], ['미1친놈', '****'], ['느금ㅋ마', '****'], ['또ㄹ라이', '****'],
  ['fuuuck', '******'], ['shiiit', '******'], ['asssshole', '*********'], ['f.u.c.k', '*******'], ['tlqkf', '*****'], ['qudtls', '******'],
  ['21세기', null], ['세기말', null], ['쌍둥이', null], ['대지', null], ['쪼까만', null], ['쫒아가', null], ['새까만 밤', null], ['엄벙덤벙', null], ['시뻘건 피', null],
  ['하루 세끼 먹어', null], ['삼시세끼', null], ['세끼 밥', null], ['신발', null], ['조나단', null], ['시아버지', null], ['되새기다', null], ['졸래졸래 따라와', null], ['존경해', null],
  ['조개', null], ['씨앗', null], ['바보', null], ['다시 바로', null], ['다시바로', null], ['시원해', null], ['좇아가', null], ['보조개', null], ['개구쟁이', null], ['ㅠㅠ', null], ['ㅇㅇ', null],
  ['pistol', null], ['mississippi', null], ['passport', null], ['bass', null], ['glass', null], ['assess', null], ['book', null], ['coke', null], ['sushi tea', null], ['whisky', null], ['snigger', null], ['같은 색끼리 모아', null], ['황색기 구간', null], ['test/full11b.log', null], ['netWatchRace', null], ['예시(t별', null], ['opus yes', null], ['retardation', null], ['이 색기야', '이 **야'],
  // let be
  ['다시 발견했다', null], ['다시발견했다', null], ['시발점', null], ['새끼 고양이 귀여워', null], ['새끼손가락', null], ['하루 세끼', null],
  ['1조까지', null], ['엄마를 졸라서', null], ['시바견', null], ['등신대', null], ['조금 졸려', null], ['미친 듯이 달렸다', null], ['존재', null],
  ['병원', null], ['십분 뒤', null], ['껌 씹어', null], ['개구리', null], ['안녕하세요', null], ['this hit me', null], ['class', null], ['assassin', null],
  ['peacock', null], ['cocktail', null], ['skywalker', null], ['shiitake', null], ['hello world 123', null], ['ㅎㅎ ㅋㅋ', null], ['시작', null], ['지금', null],
  ['다이아 10개 줄게', null], ['좋아요', null], ['ㅇㅋ', null], ['새기다', null], ['마음에 새기고', null], ['/fill 1 2 3', null],
];
for (const [a, b] of CASES) {
  const r = sw(a), want = b === null ? a : b;
  ok(r === want, `${a} -> ${r}${r === want ? '' : ' (want ' + want + ')'}`);
}
// through the chat: as sent and shown
call(() => fn.chatRun('아 씨발 왜 죽어'));
const last = String(s.peek('CHT').slice(-1)[0]);
ok(last.includes('아 ** 왜 죽어'), 'the chat line: ' + last);
call(() => fn.chatRun('/say 씨발'));
ok(!String(s.peek('CHT').slice(-1)[0]).includes('**'), 'a command is not touched');
// a long line: the time (JS here; steps counted by the sim are what tessvm pays)
const long = '아 진짜 씨발 이게 뭐야 다시 발견했는데 병신같이 fuck this shit 새끼 고양이는 귀엽다 '.repeat(2).slice(0, 160);
const t0 = performance.now(); for (let i = 0; i < 20; i++) sw(long); const dt = (performance.now() - t0) / 20;
console.log('160 letters:', sw(long), `(${dt.toFixed(2)} ms in node)`);
console.log(fails ? fails + ' FAILED' : 'all ok');

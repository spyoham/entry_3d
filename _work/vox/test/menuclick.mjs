// (v2.4.5) a click on a menu button that opens another screen must not go on into that screen
// (it did: the screens were drawn one after another in the same frame, so the servers' 편집 hit
// the edit screen's 완료 at the same place, 다시 만들기 the new world's 취소, 작품 정보 the
// message's button; the sim cannot keep a world, so the title's buttons stand for them all).  usage: node test/menuclick.mjs
import { createSim } from '../sim.mjs';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sim = createSim({ consts: { TESTRUN: 1, ANIMALS: 0 } });
const run = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const click = (x, y) => { sim.mouse.x = x; sim.mouse.y = y; sim.click(); run(2); };
run(30);
sim.as('pen', () => sim.fn.menuGo(0)); run(2);
ok(sim.peek('scr') === 0, 'the title screen');
// 작품 정보 (2..100, -54..-74): its message's button (-100..100, -60..-80) lies under the click
click(50, -66);
ok(sim.peek('scr') === 8, `작품 정보 opens its message and stays there (screen ${sim.peek('scr')})`);
click(0, -70); ok(sim.peek('scr') === 0, 'its button goes back to the title');
// 설정... and its 완료
click(-50, -64); ok(sim.peek('scr') === 7, `설정... opens the settings (screen ${sim.peek('scr')})`);
click(0, -112); ok(sim.peek('scr') === 0, 'the settings\' 완료 goes back');
console.log(fails ? fails + ' FAILED' : 'all ok');

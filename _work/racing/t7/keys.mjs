// v3.2: keys Entry still thinks are held must not act as presses
//  A  Enter held from the last run (Entry keeps pressedKeys across stop/run):
//     the menu must not start a race by itself
//  B  after loading a backup code, V stays "held" (a Mac Cmd+V paste never
//     sends V's keyup) and Enter is still down: the profile must not jump to
//     the menu, the prompt must not come back, and the menu keys must work
//  C  a stale key works again once it has been let go and pressed
import { createSim } from '../sim.mjs';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
{
    const s = createSim({ fps: 10 }); const g = (e) => s.peek(e);
    s.keys.add(13);
    for (let i = 0; i < 40; i++) s.frame();
    ok(+g('raceState') === 0 && +g('nCars') === 0, `A Enter held at the start: state ${g('raceState')} (0 = menu), cars ${g('nCars')}`);
    s.keys.delete(13); s.frame(); s.keys.add(13); s.frame(); s.keys.delete(13); s.frame();
    ok(+g('raceState') !== 0, `C Enter let go and pressed again starts the race: state ${g('raceState')}`);
}
{
    const s = createSim({ fps: 10 }); s.R.nick = '테스터'; const g = (e) => s.peek(e);
    for (let i = 0; i < 200; i++) s.frame();           // the save has loaded
    g('raceState = ST_PROF; prTab = 1;');
    s.frame();
    // V: the prompt; the answer is a valid code; V never comes up, Enter is still down
    const code = g('(()=>{ addXP(3000); buildRec(); svEncode(); const c = svCode; return c; })()');
    s.R.answerText = code;
    let asked = 0;
    s.R.asked = undefined;
    s.keys.add(86); s.frame();
    if (s.R.asked) asked++;
    s.R.asked = undefined;
    s.keys.add(13);
    for (let i = 0; i < 5; i++) s.frame();
    const stillProf = +g('raceState') === 13;
    s.keys.delete(13);
    // Down, Up, Esc in the profile / menu while V is stuck
    let again = 0;
    for (const k of [40, 38]) { s.keys.add(k); s.frame(); s.keys.delete(k); s.frame(); s.frame(); if (s.R.asked) { again++; s.R.asked = undefined; } }
    s.keys.add(27); s.frame(); s.keys.delete(27); s.frame(); s.frame();
    const inMenu = +g('raceState') === 0;
    s.keys.add(40); s.frame(); s.keys.delete(40); s.frame();
    const row = +g('mnRow');
    ok(asked === 1 && stillProf && again === 0 && inMenu && row === 2, `B after the load: prompt shown ${asked}x, stayed in the profile ${stillProf}, prompt again ${again}x, Esc to the menu ${inMenu}, Down moved to row ${row}; msg "${g('msg')}"`);
}

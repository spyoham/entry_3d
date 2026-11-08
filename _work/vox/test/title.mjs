import { createSim } from '../sim.mjs';
const s = createSim({ consts: {} });
for (let i = 0; i < 5; i++) s.frame();
s.mouse.x = 0; s.mouse.y = 16; s.frame();
await s.png('test/title.png');
s.click(); for (let i = 0; i < 3; i++) s.frame();
console.log('gState', s.peek('gState'), 'mode', s.peek('gameMode'));
for (let i = 0; i < 40; i++) s.frame();
await s.png('test/loading.png');

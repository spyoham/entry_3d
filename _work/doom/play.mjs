// scripted play in the simulator: node play.mjs  (writes play*.png)
import { createSim } from './sim.mjs';
const sim = await createSim();
const P = sim.R.peek;
const K = sim.keys;
const step = (n) => { for (let i = 0; i < n; i++) sim.frame(); };
const press = async (code, n = 3) => { K.add(code); step(n); K.delete(code); step(2); };
step(3);
await sim.render('play0.png');                      // title
await press(13);                                     // -> menu
await sim.render('play1.png');
await press(13); step(5);                            // start (skill 3)
console.log('state', P('gameState'), 'mobjs', P('nThk'), 'kills', P('killsTotal'), 'items', P('itemsTotal'), 'secrets', P('secretsTotal'));
await sim.render('play2.png');
// walk forward 2 s, fire
K.add(87); step(60); K.delete(87);
K.add(17); step(30); K.delete(17);
await sim.render('play3.png');
console.log('pos', P('plX').toFixed(0), P('plY').toFixed(0), 'ammo', P('plAmmo'), 'hp', P('plHealth'), 'items', P('r_items'), 'thinkers', P('nThk'));

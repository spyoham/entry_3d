const NP = 7000;
let r_first = 0, r_last = 0, frames = 0, mode = 0, t0 = 0;
function stampMany(n, base) {
  let i = 0;
  while (i < n) {
    costume(base + i % 8); goto(-240 + i % 480, -100 + i % 200); resetSize(); stretchW(3); stretchH(0.1); stamp();
    i = i + 1;
  }
}
on('start', 'stamper', function () { cloneSelf(); });
on('clone', 'stamper', function () {
  timerStart();
  mode = 0; frames = 0; t0 = timer();
  for (;;) {
    eraseAll();
    if (mode == 0) { stampMany(1000, 1); }
    if (mode == 1) { stampMany(1000, NP - 10); }
    frames = frames + 1;
    if (timer() - t0 > 3) {
      if (mode == 0) { r_first = frames / (timer() - t0); }
      if (mode == 1) { r_last = frames / (timer() - t0); }
      mode = mode + 1; frames = 0; t0 = timer();
    }
  }
});

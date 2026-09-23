let r_plain = 0, r_bright = 0, r_alpha = 0, frames = 0, mode = 0, t0 = 0;
function stampMany(n, fx) {
  let i = 0;
  while (i < n) {
    costume(1 + i % 8); goto(-240 + i % 480, -100 + i % 200); resetSize(); stretchW(3); stretchH(i % 50);
    if (fx == 1) { effect('brightness', 0 - (i % 4) * 20); }
    if (fx == 2) { effect('transparency', (i % 4) * 20); }
    stamp();
    i = i + 1;
  }
}
on('start', 'stamper', function () { cloneSelf(); });
on('clone', 'stamper', function () {
  timerStart();
  mode = 0; frames = 0; t0 = timer();
  for (;;) {
    eraseAll();
    stampMany(1000, mode);
    frames = frames + 1;
    if (timer() - t0 > 3) {
      if (mode == 0) { r_plain = frames / (timer() - t0); }
      if (mode == 1) { r_bright = frames / (timer() - t0); }
      if (mode == 2) { r_alpha = frames / (timer() - t0); }
      mode = mode + 1; frames = 0; t0 = timer(); clearEffects();
    }
  }
});

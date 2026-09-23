on('start', 'stamper', function () { hide(); cloneSelf(); });
on('clone', 'stamper', function () {
  show();
  eraseAll();
  let i = 0;
  let h = 300, x = -200;
  while (i < 6) {
    costume(1); goto(x, 0); resetSize();
    stretchW((1 + 384) / 2 * (30 - 1));
    stretchH((30 + 384) / 2 * (h / 384 - 1));
    stamp();
    x = x + 60; h = h * 2;
    i = i + 1;
  }
  goto(0, -400);
});

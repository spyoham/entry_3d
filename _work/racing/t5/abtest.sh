for t in 1 2 3 4 5 6 7 8; do
  for rl in 0 1; do
    echo -n "rl=$rl "; AIRL=$rl node t5/dt.mjs $t 100
  done
done

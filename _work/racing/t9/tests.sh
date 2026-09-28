#!/bin/sh
# the regression set of v6.2 (ab/tests62.txt), in the node sim
cd "$(dirname "$0")/.."
for t in ${TESTS:-v30 keys multi savecode slots alloc share pinned tilt wall pitgame photoauto intrude}; do
  echo "== $t"; node t7/$t.mjs 2>&1 | tail -40
done
echo "== stuck"; node t7/stuck.mjs 2 1 400 2>&1 | tail -5
for k in 1 2 19; do echo "== offdiag $k"; node offdiag.mjs $k 2>&1 | tail -6; done

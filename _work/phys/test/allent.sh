#!/bin/sh
# every scene, both modes, in plain Entry: seconds a frame and what it measures
for k in 1 2 3 4 5 6 7; do for m in 1 2; do echo "== scene $k mode $m"; node test/ent.mjs $k $m 35 2>&1 | cut -c1-600; done; done

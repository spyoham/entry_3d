# Train the letter model the Entry work compresses with, and write it out.
#   py -3.12 train.py count [MB per corpus]       n-gram counts -> data/counts_k.npz
#   py -3.12 train.py build N theta [D] [out]     smooth, prune, quantise -> model.json, with held-out bits
#
# The model: for the last k letters (lower-cased) a row of whole-number
# frequencies over the 57 symbols, summing to T = 4096. A row holds only the
# symbols worth listing; every symbol also owns one count in the last 57 of
# the 4096 (so nothing is impossible). Rows that say little more than the
# row of the shorter context are dropped: the coder falls back to the longest
# context that has a row.
import json
import os
import sys
import numpy as np

SYMS = 'abcdefghijklmnopqrstuvwxyz ,.?!ABCDEFGHIJKLMNOPQRSTUVWXYZ'
NS, NL, T = 57, 31, 4096
MAIN = T - NS
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-'
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
MAXK = 9


def codes(b):
    tbl = np.full(256, 255, np.uint8)
    for i, ch in enumerate(SYMS):
        tbl[ord(ch)] = i
    code = tbl[np.frombuffer(b, np.uint8)]
    assert code.max() < NS
    low = np.where(code >= NL, code - NL, code).astype(np.uint8)
    letter = (code < 26) | (code >= NL)
    upper = code >= NL
    # capitals mode: the last two letters were both capitals -> the symbol is coded with its case swapped
    nb = np.cumsum(letter, dtype=np.int64) - letter
    lidx = np.flatnonzero(letter)
    caps = np.zeros(len(code), bool)
    m = nb >= 2
    caps[m] = upper[lidx[nb[m] - 1]] & upper[lidx[nb[m] - 2]]
    sym = code.copy()
    sw = caps & letter
    sym[sw] = np.where(code[sw] >= NL, code[sw] - NL, code[sw] + NL)
    return low, sym


def keys_of(low, sym, k):
    n = len(sym)
    key = sym[k:].astype(np.uint64)
    for j in range(1, k + 1):
        key |= low[k - j:n - j].astype(np.uint64) << np.uint64(6 + 5 * (j - 1))
    return key


def load(names, mb=None):
    parts = []
    for nm in names:
        with open(os.path.join(DATA, nm), 'rb') as f:
            parts.append(f.read(mb << 20) if mb else f.read())
    return codes(b' '.join(parts))


def count(mb, k0=0):
    low, sym = load(['tiny_train.txt', 'fwe_train.txt'], mb)
    print('symbols', len(sym), flush=True)
    for k in range(k0, MAXK + 1):
        key = keys_of(low, sym, k)
        if k <= 4:
            c = np.bincount(key.astype(np.int64), minlength=1 << (6 + 5 * k))
            u = np.flatnonzero(c).astype(np.uint64)
            c = c[u.astype(np.int64)]
        else:
            u, c = np.unique(key, return_counts=True)
        del key
        np.savez(os.path.join(DATA, f'counts_{k}.npz'), key=u, cnt=c.astype(np.int64))
        print('order', k, 'pairs', len(u), flush=True)


def quantise(P, mlist):
    g = P * MAIN
    listed = g >= mlist
    listed[np.arange(len(P)), np.argmax(g, axis=1)] = True
    gl = np.where(listed, g, 0)
    f = np.rint(gl * (MAIN / gl.sum(1, keepdims=True)))
    f = np.where(listed, np.maximum(f, 2), 0).astype(np.int32)
    top = np.argmax(f, axis=1)
    f[np.arange(len(P)), top] += MAIN - f.sum(1)
    assert f.min() >= 0 and (f.sum(1) == MAIN).all() and (f[np.arange(len(P)), top] >= 2).all()
    return f.astype(np.uint16)


def build(N, theta, D, out, minc=6, mlist=2.5):
    minc = int(os.environ.get('MINC', minc))
    mlist = float(os.environ.get('MLIST', mlist))
    prevP = np.full((1, NS), 1 / NS, np.float32)
    prevQ = None
    prevCtx = np.zeros(1, np.uint64)
    model = []
    for k in range(0, N + 1):
        z = np.load(os.path.join(DATA, f'counts_{k}.npz'))
        key, cnt = z['key'], z['cnt']
        ctx, sym = key >> np.uint64(6), (key & np.uint64(63)).astype(np.int64)
        uctx, start, npair = np.unique(ctx, return_index=True, return_counts=True)
        tot = np.add.reduceat(cnt, start)
        if k >= 3:
            keep = tot >= minc
            pk = np.repeat(keep, npair)
            ctx, sym, cnt = ctx[pk], sym[pk], cnt[pk]
            uctx, tot, npair = uctx[keep], tot[keep], npair[keep]
            start = np.concatenate([[0], np.cumsum(npair)[:-1]])
        R = len(uctx)
        prow = np.repeat(np.arange(R), npair)
        mask = np.uint64((1 << (5 * (k - 1))) - 1) if k >= 1 else np.uint64(0)
        low = np.searchsorted(prevCtx, uctx & mask) if k >= 1 else np.zeros(R, np.int64)
        assert (prevCtx[low] == (uctx & mask)).all()
        d = D if k >= 1 else 0.0
        P = (d * npair / tot).astype(np.float32)[:, None] * prevP[low]
        P[prow, sym] += ((cnt - d) / tot[prow]).astype(np.float32)
        F = quantise(P, mlist)
        eff = np.where(F > 0, F, 1).astype(np.uint16)
        nl = (F > 0).sum(1)
        chars = 1 + k + 1 + 3 * nl
        if k == 0:
            kept = np.ones(R, bool)
        else:
            base = prevQ[low]
            gain = np.add.reduceat(cnt * (np.log2(eff[prow, sym].astype(np.float64)) - np.log2(base[prow, sym].astype(np.float64))), start)
            kept = gain > theta * chars
            del base
        Q = eff.copy()
        if k >= 1:
            Q[~kept] = prevQ[low[~kept]]
        model.append({'k': k, 'ctx': uctx[kept], 'F': F[kept], 'chars': int(chars[kept].sum())})
        print(f'order {k}: rows {R} kept {int(kept.sum())} chars {int(chars[kept].sum())}', flush=True)
        prevP, prevQ, prevCtx = P, Q, uctx
    total = sum(m['chars'] for m in model)
    print('model chars', total, flush=True)
    for nm in ['tiny_valid.txt', 'fwe_valid.txt', 'samples.txt']:
        if os.path.exists(os.path.join(DATA, nm)):
            print(nm, 'bits/char %.4f' % evaluate(model, *load([nm]))[0], flush=True)
    if out:
        export(model, out)
    return model


def evaluate(model, low, sym):
    n = len(sym)
    N = len(model) - 1
    f = np.zeros(n, np.float64)
    done = np.zeros(n, bool)
    done[:N] = True
    used = []
    for m in reversed(model):
        k = m['k']
        key = keys_of(low, sym, k)
        c = np.concatenate([np.zeros(k, np.uint64), key >> np.uint64(6)])
        i = np.searchsorted(m['ctx'], c)
        i[i >= len(m['ctx'])] = 0
        hit = (m['ctx'][i] == c) & ~done
        F = m['F'][i[hit], sym[hit]]
        f[hit] = np.where(F > 0, F, 1)
        done |= hit
        used.append(int(hit.sum()))
    bits = -np.log2(f[N:] / T)
    return bits.mean(), used[::-1]


def export(model, out):
    orders = []
    for m in model:
        k = m['k']
        buckets = [[] for _ in range(NL)]
        for c, F in zip(m['ctx'].tolist(), m['F']):
            order = np.argsort(-F.astype(np.int64), kind='stable')
            order = [int(s) for s in order if F[s] > 0]
            hi, cum, S = 0, [], []
            for s in order:
                hi += int(F[s])
                S.append(SYMS[s])
                cum.append(B64[hi >> 6] + B64[hi & 63])
            assert hi == MAIN
            chars = [SYMS[(c >> (5 * (j - 1))) & 31] for j in range(k, 0, -1)]   # oldest first
            row = '|' + ''.join(chars) + B64[len(order)] + ''.join(S) + ''.join(cum)
            buckets[SYMS.index(chars[0]) if k else 0].append(row)
        orders.append([''.join(b) or '-' for b in (buckets if k else buckets[:1])])
    with open(out, 'w', encoding='ascii', newline='') as f:
        json.dump({'SYMS': SYMS, 'B64': B64, 'T': T, 'N': len(model) - 1, 'orders': orders}, f)
    print('wrote', out, os.path.getsize(out), flush=True)


if __name__ == '__main__':
    if sys.argv[1] == 'count':
        count(int(sys.argv[2]) or None if len(sys.argv) > 2 else None, int(sys.argv[3]) if len(sys.argv) > 3 else 0)
    else:
        N, theta = int(sys.argv[2]), float(sys.argv[3])
        D = float(sys.argv[4]) if len(sys.argv) > 4 else 0.75
        build(N, theta, D, sys.argv[5] if len(sys.argv) > 5 else None)

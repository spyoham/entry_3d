# Quantization-aware training (knowledge distillation from the FP model) of
# SmolLM2-135M in the exact weight format the Entry kernel runs:
#
#     W[i, j] = S[i, j // GS] * LV[j, Q[i, j]]
#
#   S  : scale per (output row, group of GS input columns)
#   LV : per input column, 2**bits[j] levels (bits[j] in 1..4)
#   Q  : code; the codes of W consecutive columns of a row are packed into one
#        8-bit character (sum of bits in a pack <= 8) -> one Entry table lookup
#
# usage: py -3.12 qat.py --tokens 20e6 --out qat_a.pt [--pattern mlp=2,attn=2.67,emb=2.67]
import torch, math, time, argparse, numpy as np
import torch.nn.functional as F
from transformers import AutoModelForCausalLM

ap = argparse.ArgumentParser()
ap.add_argument('--tokens', type=float, default=20e6)
ap.add_argument('--bs', type=int, default=4)
ap.add_argument('--accum', type=int, default=4)
ap.add_argument('--seq', type=int, default=512)
ap.add_argument('--lr', type=float, default=1e-4)
ap.add_argument('--lr_q', type=float, default=1e-3)      # scales / levels
ap.add_argument('--gs', type=int, default=64)
ap.add_argument('--seed', type=int, default=0)
ap.add_argument('--pattern', default='attn=2,mlp=2,emb=2')
ap.add_argument('--out', default='qat.pt')
ap.add_argument('--resume', default=None)
ap.add_argument('--eval_only', action='store_true')
ap.add_argument('--ce', type=float, default=0.0)
ap.add_argument('--keep', type=float, default=0.0)   # fraction of largest-|w| weights kept exact (sparse fp)          # weight of plain CE added to KD
ap.add_argument('--model', default='model')          # HF directory of the model to quantize
ap.add_argument('--data', default='data/fwe.bin:0.7,data/cosmo.bin:0.3')   # uint16 token files with mixing weights
ap.add_argument('--test', default='wt2_test_ids.pt')  # .pt tensor of ids, or a uint16 .bin
args = ap.parse_args()
dev = 'cuda'
torch.manual_seed(0)

# bits pattern per pack: 2 -> (2,2,2,2), 2.67 -> (3,3,2), 4 -> (4,4), 3 -> (3,3,2)? no: 3 -> (4,2)... keep explicit
PACKS = {'2': (2, 2, 2, 2), '2.67': (3, 3, 2), '4': (4, 4), '8': (8, 8)}


def pack_bits(kind):
    for kv in args.pattern.split(','):
        k, v = kv.split('=')
        if k == kind: return PACKS[v]
    raise KeyError(kind)


def col_bits(n, pack):
    reps = n // len(pack)
    assert reps * len(pack) == n, (n, pack)
    return torch.tensor(list(pack) * reps)


def kmeans_cols(x, L, iters=15):
    """x: (m, n); per column 1-D k-means with L levels -> (n, L) sorted"""
    x = x.float()
    n = x.shape[1]
    qs = torch.linspace(0, 1, L + 2, device=x.device)[1:-1]
    xs = x if x.shape[0] <= 16384 else x[torch.randperm(x.shape[0], device=x.device)[:16384]]
    lv = torch.quantile(xs, qs, dim=0).T.contiguous()
    xt = x.T.contiguous()
    for _ in range(iters):
        mid = (lv[:, 1:] + lv[:, :-1]) / 2
        a = torch.searchsorted(mid.contiguous(), xt)                      # (n, m)
        s = torch.zeros(n, L, device=x.device).scatter_add_(1, a, xt)
        cnt = torch.zeros(n, L, device=x.device).scatter_add_(1, a, torch.ones_like(xt))
        lv = torch.where(cnt > 0, s / cnt.clamp(min=1), lv).sort(-1).values
    return lv


class FQ(torch.autograd.Function):
    """fake quant W -> S[i,g] * LV[j, q[i,j]] (masked entries pass W through).
    Saves only uint8 codes. Backward: STE for W, exact grads for S and LV."""
    @staticmethod
    def forward(ctx, W, S, LV, mask, gs):
        m, n = W.shape
        with torch.no_grad():
            Wm = torch.where(mask, torch.zeros_like(W), W)
            Wn = (Wm.view(m, -1, gs) / S[..., None]).view(m, n)
            lv = LV.sort(-1).values
            mid = (lv[:, 1:] + lv[:, :-1]) / 2
            q = torch.searchsorted(mid.contiguous(), Wn.T.contiguous()).T.contiguous()   # (m, n) int64
            lvq = torch.gather(lv, 1, q.T).T                                             # (m, n)
            out = (lvq.view(m, -1, gs) * S[..., None]).view(m, n)
            out = torch.where(mask, W, out)
        ctx.save_for_backward(q.to(torch.uint8), S, lv, mask)
        ctx.gs = gs
        return out

    @staticmethod
    def backward(ctx, g):
        q8, S, lv, mask = ctx.saved_tensors
        gs = ctx.gs
        m, n = g.shape
        q = q8.long()
        gm = torch.where(mask, torch.zeros_like(g), g)
        lvq = torch.gather(lv, 1, q.T).T
        gS = (gm * lvq).view(m, -1, gs).sum(-1)
        gscaled = (gm.view(m, -1, gs) * S[..., None]).view(m, n)
        gLV = torch.zeros_like(lv).scatter_add_(1, q.T.contiguous(), gscaled.T.contiguous())
        return g, gS, gLV, None, None


class QWeight(torch.nn.Module):
    def __init__(self, W, bits, gs, keep=None):
        super().__init__()
        m, n = W.shape
        self.m, self.n, self.gs = m, n, gs
        self.register_buffer('bits', bits)
        self.Lmax = int(2 ** bits.max().item())
        self.W = torch.nn.Parameter(W.detach().clone().float())
        k = int((args.keep if keep is None else keep) * m * n)
        mask = torch.zeros(m * n, dtype=torch.bool, device=W.device)
        if k > 0:
            mask[W.float().abs().flatten().topk(k).indices] = True
        self.register_buffer('mask', mask.view(m, n))
        W = torch.where(self.mask, torch.zeros_like(W), W)
        Wg = W.float().view(m, n // gs, gs)
        S = Wg.pow(2).mean(-1).sqrt().clamp(min=1e-6)  # (masked weights excluded)
        self.S = torch.nn.Parameter(S)
        Wn = (Wg / S[..., None]).view(m, n)
        LV = torch.full((n, self.Lmax), 1e4, device=W.device)
        for b in bits.unique().tolist():
            cols = (bits == b).nonzero().squeeze(1)
            L = 2 ** b
            LV[cols, :L] = kmeans_cols(Wn[:, cols], L)
            if L < self.Lmax:   # padded levels: far away, never chosen
                LV[cols, L:] = 1e4 + torch.arange(self.Lmax - L, device=W.device).float()
        self.LV = torch.nn.Parameter(LV)

    def codes(self):
        with torch.no_grad():
            Wm = torch.where(self.mask, torch.zeros_like(self.W), self.W)
            Wn = (Wm.view(self.m, -1, self.gs) / self.S[..., None]).view(self.m, self.n)
            lv = self.LV.sort(-1).values
            mid = (lv[:, 1:] + lv[:, :-1]) / 2
            q = torch.searchsorted(mid.contiguous(), Wn.T.contiguous()).T      # (m, n)
            return q, lv

    def forward(self):
        return FQ.apply(self.W, self.S, self.LV, self.mask, self.gs)

    def export(self):
        q, lv = self.codes()
        return {'S': self.S.detach().cpu(), 'LV': self.LV.detach().cpu(), 'Q': q.to(torch.uint8).cpu(), 'bits': self.bits.cpu()}


# ---------------- models ----------------
teacher = AutoModelForCausalLM.from_pretrained(args.model, dtype=torch.bfloat16).to(dev).eval()
for p in teacher.parameters(): p.requires_grad_(False)
student = AutoModelForCausalLM.from_pretrained(args.model, dtype=torch.float32).to(dev)

# matrices that read the same input share their per-column levels (one set of
# Entry tables per input vector): qkv fused, gate+up fused
FUSED = {'qkv': ['self_attn.q_proj', 'self_attn.k_proj', 'self_attn.v_proj'], 'o': ['self_attn.o_proj'],
         'gu': ['mlp.gate_proj', 'mlp.up_proj'], 'down': ['mlp.down_proj']}
KIND = {'qkv': 'attn', 'o': 'attn', 'gu': 'mlp', 'down': 'mlp'}
qw = torch.nn.ModuleDict()
for li, layer in enumerate(student.model.layers):
    for f, names in FUSED.items():
        W = torch.cat([layer.get_submodule(n).weight.data for n in names], 0)
        qw[f'{li}_{f}'] = QWeight(W, col_bits(W.shape[1], pack_bits(KIND[f])).to(dev), args.gs)
E = student.model.embed_tokens.weight.data
qw['emb'] = QWeight(E, col_bits(E.shape[1], pack_bits('emb')).to(dev), args.gs, keep=0.0)
RESUME = torch.load(args.resume) if args.resume else None
if RESUME:
    qw.load_state_dict(RESUME['state'])

# route the student's weights through the fake quantizers
import types
FC = {}
def patch_linear(lin, key, r0, r1):
    def fwd(self, x):
        if r0 == 0 or key not in FC: FC[key] = qw[key]()
        w = FC[key]
        return F.linear(x, w[r0:r1])
    lin.forward = types.MethodType(fwd, lin)
for li, layer in enumerate(student.model.layers):
    for f, names in FUSED.items():
        r = 0
        for n in names:
            lin = layer.get_submodule(n)
            patch_linear(lin, f'{li}_{f}', r, r + lin.out_features); r += lin.out_features
emb_mod = student.model.embed_tokens
EMBC = {}
def emb_fwd(self, ids):
    EMBC['w'] = qw['emb']()
    return F.embedding(ids, EMBC['w'])
emb_mod.forward = types.MethodType(emb_fwd, emb_mod)
def head_fwd(self, h):
    w = EMBC.pop('w', None)
    return F.linear(h, w if w is not None else qw['emb']())
student.lm_head.forward = types.MethodType(head_fwd, student.lm_head)
for p in student.parameters(): p.requires_grad_(False)
# the student's own linear / embedding weights are never read (patched): free them
for li, layer in enumerate(student.model.layers):
    for names in FUSED.values():
        for n in names: layer.get_submodule(n).weight.data = torch.empty(0, device=dev)
student.model.embed_tokens.weight.data = torch.empty(0, device=dev)
torch.cuda.empty_cache()
# norms stay trainable (tiny, full precision in Entry too)
norm_params = [p for n, p in student.named_parameters() if 'norm' in n]
if RESUME:
    with torch.no_grad():
        for n, p in student.named_parameters():
            if n in RESUME['norms']: p.copy_(RESUME['norms'][n].to(dev))
for p in norm_params: p.requires_grad_(True)

# ---------------- data ----------------
SRC, PROB = [], []
for spec in args.data.split(','):
    f, _, w = spec.partition(':')
    SRC.append(np.memmap(f, dtype=np.uint16, mode='r')); PROB.append(float(w or 1))
PROB = np.array(PROB) / sum(PROB)
rng = np.random.default_rng(args.seed)
def batch():
    xs = []
    for _ in range(args.bs):
        src = SRC[rng.choice(len(SRC), p=PROB)]
        i = rng.integers(0, len(src) - args.seq - 1)
        xs.append(torch.from_numpy(src[i:i + args.seq].astype(np.int64)))
    return torch.stack(xs).to(dev)

if args.test.endswith('.pt'):
    test_ids = torch.load(args.test)
else:                                  # uint16 token file: the first 40*512 tokens are the test set
    t = np.memmap(args.test, dtype=np.uint16, mode='r')[:40 * 512]
    test_ids = torch.from_numpy(t.astype(np.int64))[None, :]
@torch.no_grad()
def ppl(m, n=40, L=512):
    nll = 0; cnt = 0
    for i in range(n):
        x = test_ids[:, i * L:(i + 1) * L].to(dev)
        with torch.autocast('cuda', dtype=torch.bfloat16):
            logits = m(x).logits.float()
        nll += F.cross_entropy(logits[0, :-1], x[0, 1:], reduction='sum').item(); cnt += L - 1
    return math.exp(nll / cnt)

def sample(m, prompt_ids, n=40):
    x = prompt_ids.clone()
    with torch.no_grad():
        for _ in range(n):
            with torch.autocast('cuda', dtype=torch.bfloat16):
                nxt = m(x).logits[0, -1].argmax()
            x = torch.cat([x, nxt.view(1, 1)], 1)
    return x

from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained(args.model)
prompt = tok('Once upon a time', return_tensors='pt').input_ids.to(dev)

if args.eval_only:
    print('teacher ppl', round(ppl(teacher), 3))
    errs = {k: ((m() - m.W).norm() / m.W.norm()).item() for k, m in qw.items()}
    worst = sorted(errs.items(), key=lambda kv: -kv[1])[:5]
    print('mean rel err', sum(errs.values()) / len(errs), 'worst', worst)
print('student ppl at start', round(ppl(student), 3), flush=True)
if args.eval_only:
    print(repr(tok.decode(sample(student, prompt)[0])))
    raise SystemExit

# ---------------- train ----------------
lat = [m.W for m in qw.values()]
qp = [m.S for m in qw.values()] + [m.LV for m in qw.values()]
opt = torch.optim.AdamW([{'params': lat, 'lr': args.lr, 'weight_decay': 0.0},
                         {'params': qp, 'lr': args.lr_q, 'weight_decay': 0.0},
                         {'params': norm_params, 'lr': args.lr, 'weight_decay': 0.0}], betas=(0.9, 0.95))
steps = int(args.tokens / (args.bs * args.accum * args.seq))
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1, (s + 1) / 100) * 0.5 * (1 + math.cos(math.pi * min(s, steps) / steps)))
t0 = time.time()
for step in range(steps):
    opt.zero_grad(set_to_none=True)
    for _ in range(args.accum):
        x = batch()
        with torch.no_grad():
            tlp = F.log_softmax(teacher(x).logits.float(), -1)
        with torch.autocast('cuda', dtype=torch.bfloat16):
            sl = student(x).logits.float()
        kd = F.kl_div(F.log_softmax(sl, -1).flatten(0, 1), tlp.flatten(0, 1), log_target=True, reduction='batchmean')
        loss = kd
        if args.ce: loss = loss + args.ce * F.cross_entropy(sl[:, :-1].flatten(0, 1), x[:, 1:].flatten())
        (loss / args.accum).backward()
        del tlp, sl
    torch.nn.utils.clip_grad_norm_(lat + qp + norm_params, 1.0)
    opt.step(); sched.step()
    if step % 50 == 0:
        el = time.time() - t0
        print(f'step {step}/{steps} kd {kd.item():.4f} {(step + 1) * args.bs * args.accum * args.seq / el:.0f} tok/s  {el / 60:.1f} min', flush=True)
    if (step + 1) % 1000 == 0 or step == steps - 1:
        print('ppl', round(ppl(student), 3), flush=True)
        torch.save({'state': qw.state_dict(), 'norms': {n: p.detach().cpu() for n, p in student.named_parameters() if 'norm' in n}, 'args': vars(args)}, args.out)
print(repr(tok.decode(sample(student, prompt)[0])))

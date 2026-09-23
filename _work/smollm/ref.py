# Reference logits of the exported (dequantized) model, for checking the Entry program.
# usage: py -3.12 ref.py "Once upon a time" [ntok]
import torch, json, sys, numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
import os
EXP = os.environ.get('EXPORT', 'export')
MODEL = os.environ.get('MODEL', 'model')
man = json.load(open(f'{EXP}/manifest.json')); norms = json.load(open(f'{EXP}/norms.json'))
gs = man['gs']
tok = AutoTokenizer.from_pretrained(MODEL)
m = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32).eval()
def deq(name):
    mm = man['mats'][name]; M, N, L = mm['m'], mm['n'], mm['Lmax']
    Q = torch.from_numpy(np.fromfile(f'{EXP}/{name}.Q.u8', dtype=np.uint8).astype(np.int64)).view(M, N)
    S = torch.from_numpy(np.fromfile(f'{EXP}/{name}.S.f32', dtype=np.float32)).view(M, N // gs)
    LV = torch.from_numpy(np.fromfile(f'{EXP}/{name}.LV.f32', dtype=np.float32)).view(N, L)
    W = S.repeat_interleave(gs, 1) * torch.gather(LV, 1, Q.T.contiguous()).T
    ki = torch.from_numpy(np.fromfile(f'{EXP}/{name}.K.i32', dtype=np.int32).astype(np.int64)).view(-1, 2)
    kv = torch.from_numpy(np.fromfile(f'{EXP}/{name}.KV.f32', dtype=np.float32))
    if len(kv) and name != 'emb': W[ki[:, 0], ki[:, 1]] += kv
    return W
FUSED = {'qkv': ['self_attn.q_proj', 'self_attn.k_proj', 'self_attn.v_proj'], 'o': ['self_attn.o_proj'], 'gu': ['mlp.gate_proj', 'mlp.up_proj'], 'down': ['mlp.down_proj']}
with torch.no_grad():
    for li, layer in enumerate(m.model.layers):
        for f, names in FUSED.items():
            W = deq(f'{li}_{f}'); r = 0
            for n in names:
                lin = layer.get_submodule(n); lin.weight.data = W[r:r + lin.out_features].clone(); r += lin.out_features
    m.model.embed_tokens.weight.data = deq('emb'); m.lm_head.weight = m.model.embed_tokens.weight
    for k, v in norms.items(): m.get_parameter(k).data = torch.tensor(v)
    ids = tok(sys.argv[1] if len(sys.argv) > 1 else 'Once upon a time', return_tensors='pt').input_ids
    print('ids', ids.tolist())
    out = m(ids).logits[0, -1]
    top = out.topk(10)
    print('top ids', top.indices.tolist()); print('top val', [round(v, 3) for v in top.values.tolist()])
    g = m.generate(ids, max_new_tokens=int(sys.argv[2]) if len(sys.argv) > 2 else 8, do_sample=False, repetition_penalty=1.0)
    print('greedy', repr(tok.decode(g[0])), g[0].tolist())

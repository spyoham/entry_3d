import torch, sys
exec(open('ref.py', encoding='utf8').read().split("    ids = tok(")[0].replace("with torch.no_grad():", "if True:"))
with torch.no_grad():
    e = m.model.embed_tokens.weight[6403]
    print('emb', [round(v, 5) for v in e[:5].tolist()])
    L0 = m.model.layers[0]
    h = L0.input_layernorm(e[None])
    q = L0.self_attn.q_proj(h)[0]; k = L0.self_attn.k_proj(h)[0]; v = L0.self_attn.v_proj(h)[0]
    print('q', [round(x, 5) for x in q[:5].tolist()])
    print('k', [round(x, 5) for x in k[:5].tolist()])
    print('v', [round(x, 5) for x in v[:5].tolist()])

import torch, sys
exec(open('ref.py', encoding='utf8').read().split("    ids = tok(")[0].replace("with torch.no_grad():", "if True:"))
P = lambda n, t: print(n, [round(x, 5) for x in t[:5].tolist()])
with torch.no_grad():
    x = m.model.embed_tokens.weight[6403][None]
    L0 = m.model.layers[0]; A = L0.self_attn
    h = L0.input_layernorm(x)
    v = A.v_proj(h)[0]                       # single position: attention output = v (per kv head, repeated)
    ao = torch.cat([v[(hh // 3) * 64:(hh // 3 + 1) * 64] for hh in range(9)])
    P('ao', ao)
    o = A.o_proj(ao[None])[0]; P('o', o)
    x1 = x[0] + o; P('x1', x1)
    h2 = L0.post_attention_layernorm(x1[None])
    g = L0.mlp.gate_proj(h2)[0]; u = L0.mlp.up_proj(h2)[0]; P('gate', g); P('up', u)
    a = torch.nn.functional.silu(g) * u; P('act', a)
    d = L0.mlp.down_proj(a[None])[0]; P('down', d)
    P('x2', x1 + d)

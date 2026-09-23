import torch, sys, json
exec(open('ref.py', encoding='utf8').read().split("    ids = tok(")[0].replace("with torch.no_grad():", "if True:"))
with torch.no_grad():
    ids = torch.tensor([[int(t) for t in sys.argv[1].split(',')]])
    out = m(ids, output_hidden_states=True)
    hs = out.hidden_states   # emb, after layer 0.., (last is after final norm)
    res = {f'L{i}': hs[i + 1][0, -1, :6].tolist() for i in [0, 1, 2, 5, 10, 20, 28]}
    res['logits'] = out.logits[0, -1].topk(8).indices.tolist()
    res['lv'] = [round(v, 3) for v in out.logits[0, -1].topk(8).values.tolist()]
    for k, v in res.items(): print(k, [round(x, 4) for x in v] if k.startswith('L') else v)

import torch, sys
exec(open('ref.py', encoding='utf8').read().split("    ids = tok(")[0].replace("with torch.no_grad():", "if True:"))
torch.manual_seed(1)
prompts = ['Once upon a time', 'The best way to learn programming is', 'My favorite food is', 'In the future, robots will']
with torch.no_grad():
    for rp in [1.15, 1.3]:
        for t in [0.6, 0.8]:
            print(f'--- rep {rp} temp {t}')
            for p in prompts:
                ids = tok(p, return_tensors='pt').input_ids
                g = m.generate(ids, max_new_tokens=30, do_sample=True, temperature=t, top_k=40, repetition_penalty=rp)
                print(repr(tok.decode(g[0])))

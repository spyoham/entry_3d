# Sample from locally downloaded tiny llama candidates (offline, local paths only).
#   py -3.12 try_small2.py <dir> [<dir> ...]
import sys, math, torch
from transformers import AutoModelForCausalLM, AutoTokenizer

PROMPTS = ["Once upon a time", "Lily and Tom went to the park to"]
HELD = ("Once upon a time, there was a little girl named Lily. She loved to play in the garden "
        "with her dog. One day, she found a red ball under the tree and she was very happy.")
torch.manual_seed(0)

for arg in sys.argv[1:]:
    d, _, td = arg.partition("|")
    tok = AutoTokenizer.from_pretrained(td or d)
    m = AutoModelForCausalLM.from_pretrained(d, torch_dtype=torch.float32).eval()
    c = m.config
    n_all = sum(p.numel() for p in m.parameters())
    n_emb = m.get_input_embeddings().weight.numel()
    print(f"\n===== {d}")
    print(f"  d={c.hidden_size} ff={c.intermediate_size} L={c.num_hidden_layers} "
          f"heads={c.num_attention_heads}/{c.num_key_value_heads} vocab={c.vocab_size} tied={c.tie_word_embeddings}")
    print(f"  params {n_all/1e6:.2f}M = embedding {n_emb/1e6:.2f}M + body {(n_all-n_emb)/1e6:.2f}M")
    for p in PROMPTS:
        ids = tok(p, return_tensors="pt").input_ids
        with torch.no_grad():
            g = m.generate(ids, max_new_tokens=50, do_sample=True, temperature=0.8, top_k=40,
                           pad_token_id=2)
        print("  >", tok.decode(g[0], skip_special_tokens=True).replace("\n", " ")[:320])
    ids = tok(HELD, return_tensors="pt").input_ids
    with torch.no_grad():
        loss = m(ids, labels=ids).loss.item()
    print(f"  held-out paragraph loss {loss:.3f} (ppl {math.exp(loss):.1f}, {ids.numel()} tokens)")

# Sample from candidate tiny open-weight models, to judge whether they are worth porting to Entry.
#   py -3.12 try_small.py
import sys, torch, math
from transformers import AutoModelForCausalLM, AutoTokenizer

CANDIDATES = [
    ("delphi-suite/v0-llama2-12.8m", "delphi-suite/stories-tokenizer"),
    ("delphi-suite/v0-llama2-6.4m", "delphi-suite/stories-tokenizer"),
    ("delphi-suite/v0-llama2-25.6m", "delphi-suite/stories-tokenizer"),
    ("nickypro/tinyllama-15M", None),
    ("nickypro/tinyllama-42M", None),
]
PROMPTS = ["Once upon a time", "Lily and Tom went to the park to"]

for repo, tok_repo in CANDIDATES:
    try:
        tok = AutoTokenizer.from_pretrained(tok_repo or repo)
        m = AutoModelForCausalLM.from_pretrained(repo, torch_dtype=torch.float32).eval()
    except Exception as e:
        print(f"\n===== {repo}: LOAD FAILED {type(e).__name__}: {e}")
        continue
    cfg = m.config
    n_all = sum(p.numel() for p in m.parameters())
    n_emb = m.get_input_embeddings().weight.numel()
    print(f"\n===== {repo}")
    print(f"  d={cfg.hidden_size} ff={cfg.intermediate_size} L={cfg.num_hidden_layers} "
          f"heads={cfg.num_attention_heads}/{cfg.num_key_value_heads} vocab={cfg.vocab_size} "
          f"tied={cfg.tie_word_embeddings}")
    print(f"  params total {n_all/1e6:.2f}M  (embedding {n_emb/1e6:.2f}M, body {(n_all-n_emb)/1e6:.2f}M)")
    for p in PROMPTS:
        ids = tok(p, return_tensors="pt").input_ids
        with torch.no_grad():
            g = m.generate(ids, max_new_tokens=45, do_sample=True, temperature=0.8, top_k=40,
                           pad_token_id=tok.eos_token_id or 0)
            # greedy perplexity of the model on its own prompt continuation is meaningless; report
            # the loss on a short fixed text instead (below)
        print("  >", repr(tok.decode(g[0], skip_special_tokens=True))[:400])
    # crude quality number: loss on a held-out TinyStories-style paragraph
    text = ("Once upon a time, there was a little girl named Lily. She loved to play in the garden "
            "with her dog. One day, she found a red ball under the tree and she was very happy.")
    ids = tok(text, return_tensors="pt").input_ids
    with torch.no_grad():
        loss = m(ids, labels=ids).loss.item()
    print(f"  loss on a sample TinyStories paragraph: {loss:.3f}  (ppl {math.exp(loss):.1f})")

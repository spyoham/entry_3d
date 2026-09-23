# Pad a llama checkpoint's intermediate size (and hidden size) up to a multiple of the Entry
# kernel's group size, by adding zero rows to gate/up and zero columns to down. The padded
# model is numerically identical (gate/up produce zeros, down multiplies them by zero) and lets
# the 2.67-bit pack (3 weights per char, gs = 48) divide every row.
#   py -3.12 pad_model.py <in dir> <out dir> <multiple>
import sys, os, json, shutil, torch
from transformers import AutoModelForCausalLM

src, dst, mult = sys.argv[1], sys.argv[2], int(sys.argv[3])
m = AutoModelForCausalLM.from_pretrained(src, dtype=torch.float32)
cfg = m.config
ff = cfg.intermediate_size
ffp = -(-ff // mult) * mult
if cfg.hidden_size % mult:
    raise SystemExit(f'hidden_size {cfg.hidden_size} is not a multiple of {mult}; padding it would '
                     f'change the residual stream, not supported')
print(f'intermediate_size {ff} -> {ffp}')
with torch.no_grad():
    for layer in m.model.layers:
        for name in ('gate_proj', 'up_proj'):
            lin = layer.mlp.get_submodule(name)
            w = torch.zeros(ffp, cfg.hidden_size)
            w[:ff] = lin.weight.data
            lin.weight.data = w
            lin.out_features = ffp
        lin = layer.mlp.down_proj
        w = torch.zeros(cfg.hidden_size, ffp)
        w[:, :ff] = lin.weight.data
        lin.weight.data = w
        lin.in_features = ffp
m.config.intermediate_size = ffp
m.save_pretrained(dst)
for f in ('tokenizer.json', 'tokenizer.model', 'tokenizer_config.json', 'special_tokens_map.json'):
    p = os.path.join(src, f)
    if os.path.exists(p):
        shutil.copy(p, dst)
print('wrote', dst, json.load(open(os.path.join(dst, 'config.json')))['intermediate_size'])

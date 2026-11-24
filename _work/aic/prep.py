# Clean English text down to the work's alphabet: letters, space and , . ? !
#   py -3.12 prep.py
# Reads the TinyStories text and the FineWeb-Edu shard that the SmolLM work
# downloaded, writes data/{tiny,fwe}_{train,valid}.txt (one long line each).
import os
import re
import sys

SRC = r'C:\Users\spyoh\entry_3d\_work\smollm\data'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'data')
os.makedirs(OUT, exist_ok=True)

TRANS = str.maketrans({
    '\u2019': "'", '\u2018': "'", '\u201c': '"', '\u201d': '"', '\u2014': ' , ', '\u2013': ' ', '\u2026': '.',
    '\n': ' ', '\r': ' ', '\t': ' ', ';': ',', ':': ',', '-': ' ', '(': ' ', ')': ' ', '[': ' ', ']': ' ',
    "'": None, '"': None, '*': None, '_': None,
})
SENT = re.compile(r'[^.?!]*[.?!]+')
OK = re.compile(r'[A-Za-z ,.?!]+')
SPACES = re.compile(r' +')
SP_PUNCT = re.compile(r' +([,.?!])')
DOTS = re.compile(r'\.{2,}')
COMMAS = re.compile(r',[, ]*,')
LEAD = re.compile(r'^[ ,]+')


def clean(text):
    text = text.replace('<|endoftext|>', ' ').translate(TRANS)
    out = []
    for s in SENT.findall(text):
        if not OK.fullmatch(s):
            continue
        s = SPACES.sub(' ', s)
        s = SP_PUNCT.sub(r'\1', s)
        s = DOTS.sub('.', s)
        s = COMMAS.sub(',', s)
        s = LEAD.sub('', s).strip()
        # (a sentence of one word tells little, and headings come out as such)
        if sum(c.isalpha() for c in s) < 6 or ' ' not in s:
            continue
        out.append(s)
    return ' '.join(out)


def write(name, pieces, limit):
    n = 0
    with open(os.path.join(OUT, name), 'w', encoding='ascii', newline='') as f:
        for p in pieces:
            c = clean(p)
            if not c:
                continue
            if n:
                f.write(' ')
            f.write(c)
            n += len(c) + 1
            if n >= limit:
                break
    print(name, n, flush=True)


def tiny(path, skip=0):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        f.seek(skip)
        while True:
            chunk = f.read(4 << 20)
            if not chunk:
                return
            # (finish the story the chunk stopped in)
            chunk += f.readline()
            yield chunk


def fwe(first, last):
    import pyarrow.parquet as pq
    pf = pq.ParquetFile(os.path.join(SRC, 'fwe0.parquet'))
    for g in range(first, min(last, pf.num_row_groups)):
        col = pf.read_row_group(g, columns=['text']).column('text')
        buf = []
        for v in col.to_pylist():
            buf.append(v)
            if len(buf) >= 500:
                yield '\n'.join(buf)
                buf = []
        if buf:
            yield '\n'.join(buf)


if __name__ == '__main__':
    MB = 1 << 20
    tr = int(sys.argv[1]) if len(sys.argv) > 1 else 120
    write('tiny_valid.txt', tiny(os.path.join(SRC, 'tinystories-valid.txt')), 3 * MB)
    write('tiny_train.txt', tiny(os.path.join(SRC, 'tinystories-train-300m.txt')), tr * MB)
    import pyarrow.parquet as pq
    ng = pq.ParquetFile(os.path.join(SRC, 'fwe0.parquet')).num_row_groups
    print('fwe row groups', ng, flush=True)
    write('fwe_valid.txt', fwe(ng - 2, ng), 3 * MB)
    write('fwe_train.txt', fwe(0, ng - 2), tr * MB)

# plan view of ring geometry: road quads dark, grass strip quads outlined per ring
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); out = sys.argv[2]
a, b = int(sys.argv[3]), int(sys.argv[4])
cx, cz, half = float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7])
S = 1000; P = d['P']; PPR = d['PPR']
im = Image.new('RGB', (S, S), (250, 250, 250)); dr = ImageDraw.Draw(im)
def pt(r, k):
    i = (r - 1) * PPR + P[k] - 1
    return ((d['X'][i] - cx + half) / (2 * half) * S, S - (d['Z'][i] - cz + half) / (2 * half) * S)
N = d['N']
rs = range(1, N + 1)
for r in rs:
    j = r + 1
    dr.polygon([pt(r, 'P_L'), pt(r, 'P_R'), pt(j, 'P_R'), pt(j, 'P_L')], fill=(90, 90, 100))
import colorsys
for r in range(a, b + 1):
    j = r + 1
    c = tuple(int(255 * v) for v in colorsys.hsv_to_rgb((r * 0.13) % 1, 0.9, 0.8))
    if d['HW'][r - 1] > 0:
        pass
    dr.polygon([pt(r, 'P_GL'), pt(r, 'P_L'), pt(j, 'P_L'), pt(j, 'P_GL')], outline=c)
    dr.polygon([pt(r, 'P_R'), pt(r, 'P_GR'), pt(j, 'P_GR'), pt(j, 'P_R')], outline=c)
    x, y = pt(r, 'P_L'); dr.text((x, y), str(r), fill=(0, 0, 0))
im.save(out)

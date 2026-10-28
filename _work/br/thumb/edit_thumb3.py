from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
import sys
# v1.3: the three maps side by side in slanted panels, the title over them
# usage: python edit_thumb3.py island.png desert.png snow.png out.png
isl, des, snw, out = sys.argv[1:5]
W, H = 1920, 1080
SL = 120                       # how far a divider leans (top to bottom)
X1, X2 = 700, 1290             # the dividers' middles

def grade(im, warm):
    im = ImageEnhance.Color(im).enhance(1.25)
    im = ImageEnhance.Contrast(im).enhance(1.12)
    glow = Image.new('RGB', im.size, warm)
    gm = Image.new('L', im.size, 0)
    ImageDraw.Draw(gm).ellipse([-im.size[0] * 0.4, -im.size[1] * 0.9, im.size[0] * 0.7, im.size[1] * 0.6], fill=55)
    return Image.composite(glow, im, gm.filter(ImageFilter.GaussianBlur(150)))

# panels: (picture, where its middle goes, the panel's polygon)
P1 = [(0, 0), (X1 + SL / 2, 0), (X1 - SL / 2, H), (0, H)]
P2 = [(X1 + SL / 2, 0), (X2 + SL / 2, 0), (X2 - SL / 2, H), (X1 - SL / 2, H)]
P3 = [(X2 + SL / 2, 0), (W, 0), (W, H), (X2 - SL / 2, H)]
base = Image.new('RGB', (W, H), (12, 14, 18))
for src, poly, cx, mid, scale, warm in [
        (des, P1, 0.40, X1 / 2, 1.12, (255, 170, 80)),
        (snw, P2, 0.36, (X1 + X2) / 2, 1.1, (200, 225, 255)),
        (isl, P3, 0.64, (X2 + W) / 2, 1.0, (255, 180, 100))]:
    im = grade(Image.open(src).convert('RGB'), warm)
    im = im.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    layer = Image.new('RGB', (W, H))
    layer.paste(im, (int(mid - cx * im.size[0]), int((H - im.size[1]) / 2)))
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    base = Image.composite(layer, base, m)

im = base.convert('RGBA')
# a dark fade along the bottom (under the map names)
fade = Image.new('L', (W, H), 0)
fd = ImageDraw.Draw(fade)
for y in range(700, H):
    fd.line([(0, y), (W, y)], fill=int(190 * ((y - 700) / (H - 700)) ** 1.6))
im = Image.composite(Image.new('RGBA', (W, H), (8, 8, 10, 255)), im, fade)
# vignette
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
for i in range(60):
    a = int(110 * (1 - i / 60) ** 2)
    d.rectangle([i * 6, i * 4, W - i * 6, H - i * 4], outline=a, width=6)
im = Image.composite(Image.new('RGBA', (W, H), (10, 8, 6, 255)), im, mask.filter(ImageFilter.GaussianBlur(40)))

ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
o = ImageDraw.Draw(ov)
# the dividers: dark with a gold edge
for X in (X1, X2):
    o.line([(X + SL / 2, -10), (X - SL / 2, H + 10)], fill=(14, 16, 20, 255), width=16)
    o.line([(X + SL / 2 + 9, -10), (X - SL / 2 + 9, H + 10)], fill=(242, 178, 36, 255), width=4)
# the map names, low in each panel
tag = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 62)
small = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 30)
for name, desc, xm in [('붉은사막', '오아시스 · 메사 · 모래언덕', X1 / 2 - 30), ('눈보라섬', '설산 · 얼음 호수 · 전나무 숲', (X1 + X2) / 2 - 40), ('새벽섬', '도시 · 군사기지 · 항구', (X2 + W) / 2 - 20)]:
    tw = o.textlength(name, font=tag); dw = o.textlength(desc, font=small)
    bw = max(tw, dw) + 60
    x0, y0 = xm - bw / 2, H - 205
    o.polygon([(x0 + 14, y0), (x0 + bw + 14, y0), (x0 + bw - 14, y0 + 150), (x0 - 14, y0 + 150)], fill=(14, 16, 20, 215))
    o.rectangle([x0 + 10, y0 + 150, x0 + bw - 18, y0 + 156], fill=(242, 178, 36, 255))
    o.text((xm - tw / 2 + 3, y0 + 14 + 3), name, font=tag, fill=(0, 0, 0, 180))
    o.text((xm - tw / 2, y0 + 14), name, font=tag, fill=(255, 255, 255, 255))
    o.text((xm - dw / 2, y0 + 100), desc, font=small, fill=(242, 200, 120, 255))
# title block: dark slanted panel with a gold bar under it
kr = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 120)
sub = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 40)
black = ImageFont.truetype('C:/Windows/Fonts/ariblk.ttf', 50)
x0, y0 = 60, 56
title = '배틀로얄 3D'
tw = o.textlength(title, font=kr)
st = '맵 3개  •  50명 중 최후의 1인  •  탈것  •  총기 테스트'
sw = o.textlength(st, font=sub)
bw2 = max(tw + 40, sw + 70)
o.polygon([(0, y0 - 20), (x0 + tw + 90, y0 - 20), (x0 + tw + 40, y0 + 220), (0, y0 + 220)], fill=(14, 16, 20, 235))
o.polygon([(0, y0 + 220), (x0 + bw2, y0 + 220), (x0 + bw2 - 14, y0 + 280), (0, y0 + 280)], fill=(242, 178, 36, 248))
o.text((x0, y0 - 6), '엔트리', font=sub, fill=(242, 178, 36, 255))
o.text((x0 + 5, y0 + 49), title, font=kr, fill=(0, 0, 0, 170))
o.text((x0, y0 + 44), title, font=kr, fill=(255, 255, 255, 255))
o.text((x0 + 4, y0 + 224), st, font=sub, fill=(20, 16, 10, 255))
# corner badge
bt = 'v1.3'
bw = o.textlength(bt, font=black)
bx, by = W - bw - 60, 40
o.polygon([(bx - 40, by - 14), (W, by - 14), (W, by + 76), (bx - 60, by + 76)], fill=(14, 16, 20, 225))
o.text((bx, by), bt, font=black, fill=(242, 178, 36, 255))
im = Image.alpha_composite(im, ov).convert('RGB')
im.save(out, optimize=True)
print(out, im.size)

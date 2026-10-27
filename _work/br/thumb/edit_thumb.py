from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
import sys
# usage: python edit_thumb.py raw.png out.png [hud]
# hud: the shot has the game's HUD on, so leave its right side (minimap, ammo) clear
src, out = sys.argv[1], sys.argv[2]
hud = len(sys.argv) > 3 and sys.argv[3] == 'hud'
im = Image.open(src).convert('RGB')
W, H = im.size
# warmer, punchier colour
im = ImageEnhance.Color(im).enhance(1.3)
im = ImageEnhance.Contrast(im).enhance(1.12)
# a late-afternoon glow from the upper left
glow = Image.new('RGB', (W, H), (255, 170, 80))
gm = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(gm)
gd.ellipse([-W * 0.4, -H * 0.9, W * 0.7, H * 0.6], fill=70)
gm = gm.filter(ImageFilter.GaussianBlur(160))
im = Image.composite(glow, im, gm)
# soft vignette
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
for i in range(60):
    a = int(120 * (1 - i / 60) ** 2)
    d.rectangle([i * 6, i * 4, W - i * 6, H - i * 4], outline=a, width=6)
mask = mask.filter(ImageFilter.GaussianBlur(40))
im = Image.composite(Image.new('RGB', (W, H), (10, 8, 6)), im, mask)
# the safe zone's blue edge, sweeping in from the right
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
zm = Image.new('L', (W, H), 0)
zd = ImageDraw.Draw(zm)
if not hud: zd.ellipse([W * 0.82, -H * 0.6, W * 2.4, H * 1.6], fill=120)
if not hud: zd.ellipse([W * 0.86, -H * 0.5, W * 2.4, H * 1.5], fill=60)
zm = zm.filter(ImageFilter.GaussianBlur(18))
ov.paste((60, 140, 255, 255), (0, 0), zm)
im = Image.alpha_composite(im.convert('RGBA'), ov)
# title block: dark slanted panel with a gold bar under it
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
o = ImageDraw.Draw(ov)
kr = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 120)
black = ImageFont.truetype('C:/Windows/Fonts/ariblk.ttf', 50)
sub = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 42)
x0, y0 = 60, 56
title = '배틀로얄 3D'
tw = o.textlength(title, font=kr)
top = '엔트리  ·  v1.1' if hud else '엔트리'
st = '30명 중 최후의 1인  •  탈것  •  3인칭'
sw = o.textlength(st, font=sub)
bw2 = max(tw + 40, sw + 70)
o.polygon([(0, y0 - 20), (x0 + tw + 90, y0 - 20), (x0 + tw + 40, y0 + 220), (0, y0 + 220)], fill=(14, 16, 20, 250 if hud else 225))
o.polygon([(0, y0 + 220), (x0 + bw2, y0 + 220), (x0 + bw2 - 14, y0 + 282), (0, y0 + 282)], fill=(242, 178, 36, 245))
o.text((x0, y0 - 6), top, font=sub, fill=(242, 178, 36, 255))
o.text((x0 + 5, y0 + 49), title, font=kr, fill=(0, 0, 0, 170))
o.text((x0, y0 + 44), title, font=kr, fill=(255, 255, 255, 255))
o.text((x0 + 4, y0 + 222), st, font=sub, fill=(20, 16, 10, 255))
# corner badge
bt = 'v1.1'
bw = o.textlength(bt, font=black)
bx, by = W - bw - 70, H - 150
if not hud:
    o.rectangle([bx - 26, by - 14, W, by + 76], fill=(14, 16, 20, 215))
    o.text((bx, by), bt, font=black, fill=(242, 178, 36, 255))
im = Image.alpha_composite(im, ov).convert('RGB')
im.save(out, optimize=True)
print(out, im.size)

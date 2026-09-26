from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
import sys
src, out = sys.argv[1], sys.argv[2]
sub = sys.argv[3] if len(sys.argv) > 3 else 'MONACO'
top = len(sys.argv) > 4 and sys.argv[4] == 'top'
im = Image.open(src).convert('RGB')
W, H = im.size
# a little more colour and contrast
im = ImageEnhance.Color(im).enhance(1.22)
im = ImageEnhance.Contrast(im).enhance(1.08)
# soft vignette
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
for i in range(60):
    a = int(110 * (1 - i / 60) ** 2)
    d.rectangle([i * 6, i * 4, W - i * 6, H - i * 4], outline=a, width=6)
mask = mask.filter(ImageFilter.GaussianBlur(40))
im = Image.composite(Image.new('RGB', (W, H), (8, 10, 18)), im, mask)
# title block, in the menu's style: dark slanted panel with a red bar under it
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
o = ImageDraw.Draw(ov)
black = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Black.ttf', 80)
bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 34)
x0, y0 = 56, (70 if top else H - 226)
title = 'ENTRY RACING 3D'
tw = o.textlength(title, font=black)
o.polygon([(0, y0 - 16), (x0 + tw + 80, y0 - 16), (x0 + tw + 40, y0 + 108), (0, y0 + 108)], fill=(14, 18, 26, 225))
o.polygon([(0, y0 + 108), (x0 + tw + 40, y0 + 108), (x0 + tw + 26, y0 + 158), (0, y0 + 158)], fill=(226, 44, 44, 240))
o.text((x0 + 4, y0 + 4), title, font=black, fill=(0, 0, 0, 160))
o.text((x0, y0), title, font=black, fill=(255, 255, 255, 255))
o.text((x0 + 4, y0 + 113), 'F1 EDITION   \u2022   ' + sub, font=bold, fill=(255, 255, 255, 255))
im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
im.save(out, optimize=True)
print(out, im.size)

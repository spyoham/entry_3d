# the thumbnail: python test/thumb.py out.png
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
F = 'C:/Windows/Fonts/'
big = Image.open('test/thumb_stairs.png').convert('RGB')
W, H = big.size
canvas = big.copy()
d = ImageDraw.Draw(canvas, 'RGBA')
# a dark band on the left for the title
for x in range(0, 900):
    a = int(200 * max(0, 1 - x / 900) ** 1.2)
    d.line([(x, 0), (x, H)], fill=(10, 12, 18, a))
def inset(name, box):
    im = Image.open(f'test/thumb_{name}.png').convert('RGB').resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
    sh = Image.new('RGBA', (im.width + 40, im.height + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([20, 20, im.width + 20, im.height + 20], fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    canvas.paste(sh, (box[0] - 14, box[1] - 8), sh)
    canvas.paste(im, box[:2])
    ImageDraw.Draw(canvas).rectangle(box, outline=(240, 240, 240), width=5)
inset('torus', (1250, 90, 1850, 428))
inset('booth', (1250, 470, 1850, 808))
inset('corridor', (1250, 850, 1850, 1188 - 150))
d = ImageDraw.Draw(canvas, 'RGBA')
t1 = ImageFont.truetype(F + 'Hancom Gothic Bold.ttf', 150)
t2 = ImageFont.truetype(F + 'Hancom Gothic Bold.ttf', 54)
t3 = ImageFont.truetype(F + 'Hancom Gothic Regular.ttf', 40)
def text(xy, s, f, fill, stroke=6):
    d.text(xy, s, font=f, fill=fill, stroke_width=stroke, stroke_fill=(8, 10, 14))
text((70, 90), '경계의 건축가', t1, (255, 214, 70))
text((76, 270), '비유클리드 3D 공간 퍼즐', t2, (240, 240, 240), 4)
lines = ['· 24 스테이지, 6 구역', '· 끝없는 계단 · 작은 행성', '· 안이 더 큰 상자 · 거울 속 방', '· 렌즈로 잇는 포털 · 크기 문']
for i, s in enumerate(lines):
    text((80, 380 + i * 64), s, t3, (225, 230, 240), 3)
# badge
b = d.textbbox((100, 950), '엔트리 블록 · v1.0', font=t2)
d.rounded_rectangle([76, 936, b[2] + 26, 1022], 18, fill=(255, 214, 70, 235))
d.text((100, 950), '엔트리 블록 · v1.0', font=t2, fill=(20, 20, 24))
canvas.save(sys.argv[1])
print(canvas.size)

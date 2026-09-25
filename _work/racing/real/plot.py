# real/plot.py - top-down picture of real/circuits.json, to check a circuit
# before building: the lap (tunnel red, walls grey), the start (green dot),
# buildings (boxes, darker = taller), water, trees, sights.
# usage: python3 real/plot.py slot out.png [tier]
import json, math, sys
from PIL import Image, ImageDraw

slot, out = sys.argv[1], sys.argv[2]
tier = int(sys.argv[3]) if len(sys.argv) > 3 else 3
D = json.load(open(__file__.replace('plot.py', 'circuits.json')))[slot]
xs = [p['x'] for p in D['pts']]; zs = [p['z'] for p in D['pts']]
pad = 300
x0, x1, z0, z1 = min(xs) - pad, max(xs) + pad, min(zs) - pad, max(zs) + pad
S = 1400 / max(x1 - x0, z1 - z0)
W, H = int((x1 - x0) * S), int((z1 - z0) * S)
img = Image.new('RGB', (W, H), (232, 236, 228))
d = ImageDraw.Draw(img)
P = lambda x, z: ((x - x0) * S, (z1 - z) * S)
for o in D['objs']:
    if o['tier'] > tier:
        continue
    if o['t'] == 'sheet':
        c, s_, y = math.cos(0), 0, 0
        hx, hz = o['sx'] / 2, o['sz'] / 2
        d.rectangle([P(o['x'] - hx, o['z'] + hz), P(o['x'] + hx, o['z'] - hz)], fill=(120, 170, 220))
for o in D['objs']:
    if o['tier'] > tier:
        continue
    t = o['t']
    if t == 'block' or t == 'stand':
        yaw = math.radians(o['yaw'])
        ax = (math.cos(yaw), -math.sin(yaw)); az = (math.sin(yaw), math.cos(yaw))
        sx = o['sx'] / 2 if t == 'block' else o['sx'] * 19.5
        sz = o['sz'] / 2 if t == 'block' else o['sz'] * 8
        pts = [P(o['x'] + ax[0] * sx * a + az[0] * sz * b, o['z'] + ax[1] * sx * a + az[1] * sz * b) for a, b in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
        h = o['sy'] if t == 'block' else 12
        g = int(max(60, 200 - h * 2.2))
        d.polygon(pts, fill=(g, g, g + 10) if t == 'block' else (200, 80, 60), outline=(40, 40, 40))
    elif t in ('pine', 'oak', 'palm'):
        x, y = P(o['x'], o['z'])
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(40, 120, 50))
    elif t != 'sheet':
        x, y = P(o['x'], o['z'])
        d.rectangle([x - 6, y - 6, x + 6, y + 6], fill=(230, 40, 200))
        d.text((x + 8, y - 6), t, fill=(0, 0, 0))
pts = D['pts']
for i, p in enumerate(pts):
    q = pts[(i + 1) % len(pts)]
    col = (220, 30, 30) if p['f'] & 1 else (70, 70, 80) if p['f'] & 4 else (30, 30, 30)
    d.line([P(p['x'], p['z']), P(q['x'], q['z'])], fill=col, width=max(2, int(p['w'] * 2 * S)))
x, y = P(pts[0]['x'], pts[0]['z'])
d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(20, 200, 40))
q = pts[3]
d.line([P(pts[0]['x'], pts[0]['z']), P(q['x'] + (q['x'] - pts[0]['x']) * 3, q['z'] + (q['z'] - pts[0]['z']) * 3)], fill=(20, 200, 40), width=3)
d.text((10, 10), f"{D['name']}  {D['len']:.0f} m  objs {sum(1 for o in D['objs'] if o['tier'] <= tier)} (tier<={tier})", fill=(0, 0, 0))
img.save(out)

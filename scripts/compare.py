#!/usr/bin/env python3
"""Put a reference image and your render side by side under the same grid, so differences are measurable.

    python3 scripts/compare.py <reference> <render> <out.png> [--grid 10x10] [--ghost ghost.png]

Both images are scaled to the same height and drawn with an identical grid whose lines are labelled in percent
of the width and height, so you can read a position straight off it ("the pond frame starts at 67%") and
put that number in the spec.
--ghost also writes the render laid over the reference at 50 percent, which shows drift in position
and size at a glance (it makes the shapes double up where they differ).

The grid cells are fractions of the picture, so they work for any size. Needs Pillow (pip install pillow).
When the two aspect ratios differ (a landscape reference, a portrait post) the render is stretched to the
reference's proportions for the ghost only; read positions off the side-by-side as percentages.
"""
import argparse, sys
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('reference'); ap.add_argument('render'); ap.add_argument('out')
ap.add_argument('--grid', default='10x10', help="columns x rows, e.g. 10x10 (each line is labelled with its position in percent)")
ap.add_argument('--ghost')
ap.add_argument('--height', type=int, default=1000)
a = ap.parse_args()
cols, rows = [int(x) for x in a.grid.lower().split('x')]

def load(p, h):
    im = Image.open(p).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    return bg.convert('RGB').resize((round(im.width * h / im.height), h), Image.LANCZOS)

def grid(im):
    d = ImageDraw.Draw(im, 'RGBA'); w, h = im.size
    try: f = ImageFont.truetype('DejaVuSans-Bold.ttf', max(14, h // 55))
    except Exception: f = ImageFont.load_default()
    for c in range(1, cols):
        x = round(w * c / cols); d.line([(x, 0), (x, h)], fill=(255, 0, 80, 150), width=2)
    for r in range(1, rows):
        y = round(h * r / rows); d.line([(0, y), (w, y)], fill=(255, 0, 80, 150), width=2)
    for c in range(1, cols):  # label each line with where it sits, in percent of the width / height
        d.text((round(w * c / cols) + 3, 4), f'{round(100 * c / cols)}', fill=(255, 0, 80, 255), font=f, stroke_width=2, stroke_fill=(255, 255, 255, 255))
    for r in range(1, rows):
        d.text((4, round(h * r / rows) + 3), f'{round(100 * r / rows)}', fill=(255, 0, 80, 255), font=f, stroke_width=2, stroke_fill=(255, 255, 255, 255))
    return im

ref, ren = load(a.reference, a.height), load(a.render, a.height)
gap = 24
sheet = Image.new('RGB', (ref.width + ren.width + gap, a.height), (255, 255, 255))
sheet.paste(grid(ref.copy()), (0, 0)); sheet.paste(grid(ren.copy()), (ref.width + gap, 0))
sheet.save(a.out); print('Wrote', a.out, f'(reference left {ref.size}, render right {ren.size})')
if a.ghost:
    Image.blend(ref, ren.resize(ref.size, Image.LANCZOS), 0.5).save(a.ghost); print('Wrote', a.ghost)

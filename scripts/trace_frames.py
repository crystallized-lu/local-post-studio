#!/usr/bin/env python3
"""Trace the photo frames of a collage reference image into shapes the studio can use.

    python3 scripts/trace_frames.py <reference.png> <frames.json> [--debug debug.png] [--white 235] [--min-area 0.02] [--points 160] [--thick 9] [--gap 4] [--grow 3] [--snap 3] [--under 2.5] [--bleed 3]

A collage reference is a set of photos separated by thin light outlines. This script finds the outlines,
splits the picture into the regions they enclose, and writes each region as a polygon in percent of the
picture: {"id": "f1", "box": [left, top, width, height], "polygon": ["x% y%", ...]}, where the polygon
points are in percent of the region's own box (what CSS `clip-path: polygon()` wants). The studio's
`collage` template is built from that file by scripts/frames_to_template.py.

The regions tile the picture. Frames are layered (biggest at the bottom, "layer" 0): each runs a little under the
frames above it, so there are no gaps and one line per boundary. Look at the
--debug image before you trust the result: each region is coloured and numbered. If a cloud or a white
shirt was mistaken for an outline, raise --white (stricter) or lower it if outlines were missed.
Needs numpy, opencv-python and scipy (pip install numpy opencv-python scipy).
"""
import argparse, json, sys
import numpy as np, cv2
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('reference'); ap.add_argument('out')
ap.add_argument('--debug'); ap.add_argument('--white', type=int, default=235, help='how white an outline pixel must be (0-255)')
ap.add_argument('--min-area', type=float, default=0.02, help='smallest region to keep, as a fraction of the picture')
ap.add_argument('--points', type=int, default=160, help='points per traced outline')
ap.add_argument('--gap', type=int, default=4, help='close breaks in an outline up to about this many pixels wide')
ap.add_argument('--grow', type=int, default=3, help='how far each region grows to meet its neighbours in the middle of the outline, in pixels')
ap.add_argument('--snap', type=float, default=3.0, help='points this close (in percent) to the picture edge are moved onto the edge')
ap.add_argument('--under', type=float, default=2.5, help='how far (percent of the width) a frame runs under the frames above it')
ap.add_argument('--bleed', type=float, default=3.0, help='how far (percent) edge frames reach beyond the post, so no line is drawn on its edge')
ap.add_argument('--thick', type=int, default=9, help='white areas thicker than this many pixels are photo content (clouds, shirts), not outlines')
a = ap.parse_args()

im = cv2.imread(a.reference, cv2.IMREAD_UNCHANGED)
if im.ndim == 3 and im.shape[2] == 4:
    alpha = im[:, :, 3:4] / 255.0
    im = (im[:, :, :3] * alpha + 255 * (1 - alpha)).astype(np.uint8)
elif im.ndim == 2: im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
H, W = im.shape[:2]
white = (im.min(axis=2) >= a.white).astype(np.uint8)
# white areas that are thick are picture content; thin white lines are the outlines between frames
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (a.thick, a.thick))
thick = cv2.dilate(cv2.morphologyEx(white, cv2.MORPH_OPEN, k), k)
lines = white & (1 - thick)
lines = cv2.morphologyEx(lines, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * a.gap + 1, 2 * a.gap + 1)))
lines = cv2.dilate(lines, np.ones((3, 3), np.uint8))
# the outer margin and rounded corners of the picture are white too: treat anything connected to the border as outside
inside = (1 - lines).astype(np.uint8)
n, lab = cv2.connectedComponents(inside, connectivity=4)
areas = np.bincount(lab.ravel(), minlength=n)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
keep = [i for i in range(1, n) if areas[i] >= a.min_area * W * H and i not in border]
if not keep:  # the picture has no margin: allow regions that touch the border
    keep = [i for i in range(1, n) if areas[i] >= a.min_area * W * H]
if not keep: sys.exit('No frames found. Try --white 240 or a lower --min-area.')

masks = []
for i in keep:
    m = (lab == i).astype(np.uint8)
    m = ndi.binary_fill_holes(m).astype(np.uint8)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * a.grow + 1, 2 * a.grow + 1)))  # meet the neighbour in the middle of the outline
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    masks.append((i, m))
# Layers: biggest frame at the bottom. Each frame also runs a little way UNDER the frames above it, so no gap can show
# between them, and only the frame on top draws the line at a boundary (one line, never two).
masks.sort(key=lambda t: -int(t[1].sum()))
ext = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * round(a.under / 100 * W) + 1,) * 2)
regions = []
for rank, (i, m) in enumerate(masks):
    above = np.zeros_like(m)
    for _, m2 in masks[rank + 1:]: above |= m2
    layered = m | (cv2.dilate(m, ext) & above)
    cs, _ = cv2.findContours(layered, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)[:, 0, :].astype(float)
    regions.append((i, c, m, rank))
# the union of regions is the canvas: normalise to its bounding box so the traced shapes fill the post
allpts = np.concatenate([c for _, c, _, _ in regions])
x0, y0 = allpts.min(axis=0); x1, y1 = allpts.max(axis=0)
cw, ch = x1 - x0, y1 - y0

def resample(c, n):
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([c, c[:1]]), axis=0).T))]
    t = np.linspace(0, d[-1], n, endpoint=False)
    cc = np.vstack([c, c[:1]])
    return np.c_[np.interp(t, d, cc[:, 0]), np.interp(t, d, cc[:, 1])]

def smooth(p, s=2):  # light circular smoothing, so pixel steps don't show as ripples
    return np.c_[ndi.gaussian_filter1d(p[:, 0], s, mode='wrap'), ndi.gaussian_filter1d(p[:, 1], s, mode='wrap')]

out = []
regions.sort(key=lambda r: (round(r[2].nonzero()[0].mean() / (ch / 3)), r[2].nonzero()[1].mean()))  # reading order of the visible shapes, roughly
for idx, (i, c, m, rank) in enumerate(regions, 1):
    p = smooth(resample(c, a.points))
    # the reference's own rounded corners and margin: snap points that sit near the picture's edge onto the edge, so edge frames run square to the post
    for col, lo, hi, span in ((0, x0, x1, cw), (1, y0, y1, ch)):
        # ...and push them a little OUTSIDE the post, so no dividing line is drawn along the post's own edge
        p[:, col] = np.where(p[:, col] - lo < a.snap / 100 * span, lo - a.bleed / 100 * span, np.where(hi - p[:, col] < a.snap / 100 * span, hi + a.bleed / 100 * span, p[:, col]))
    L, T = p[:, 0].min(), p[:, 1].min(); R, B = p[:, 0].max(), p[:, 1].max()
    box = [(L - x0) / cw * 100, (T - y0) / ch * 100, (R - L) / cw * 100, (B - T) / ch * 100]
    poly = [f'{(x - L) / (R - L) * 100:.2f}% {(y - T) / (B - T) * 100:.2f}%' for x, y in p]
    # the same outline in percent of the whole canvas, for drawing the dividing lines
    outline = [[round((x - x0) / cw * 100, 2), round((y - y0) / ch * 100, 2)] for x, y in p]
    out.append({'id': f'f{idx}', 'box': [round(float(v), 2) for v in box], 'polygon': poly, 'outline': outline,
                'layer': rank, 'area_percent': round(float(areas[i]) / (W * H) * 100, 1)})
json.dump({'source_size': [W, H], 'aspect': round(cw / ch, 3), 'frames': out}, open(a.out, 'w'), indent=1)
print(f'{len(out)} frames, canvas aspect {cw / ch:.2f}:1 ->', a.out)
for f in out: print(' ', f['id'], 'box', f['box'], f'{f["area_percent"]}% of picture')

if a.debug:
    dbg = im.copy(); rng = np.random.RandomState(3)
    for idx, (i, c, m, rank) in enumerate(regions, 1):
        col = rng.randint(40, 255, 3).tolist()
        dbg[m > 0] = (0.55 * dbg[m > 0] + 0.45 * np.array(col)).astype(np.uint8)
        ys, xs = m.nonzero(); cx, cy = xs.mean(), ys.mean()
        cv2.putText(dbg, f'f{idx}', (int(cx) - 12, int(cy)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 3)
        cv2.putText(dbg, f'f{idx}', (int(cx) - 12, int(cy)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 1)
    cv2.imwrite(a.debug, dbg); print('debug image ->', a.debug)

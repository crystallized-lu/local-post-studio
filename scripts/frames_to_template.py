#!/usr/bin/env python3
"""Turn traced frames (from trace_frames.py) into a studio template.

    python3 scripts/frames_to_template.py <frames.json> <workspace-folder> [--id collage] [--name "Photo collage"]
                                          [--images images/a.webp images/b.webp ...] [--sticker]

Adds (or replaces) the template in <workspace-folder>/workspace.json. Each frame becomes a named photo slot
(f1, f2…: see "Several photos in one layout" in SKILL.md) clipped to its traced shape, and each frame draws its own outline in the
brand accent just above its photo (frames are layered, so every boundary gets exactly one line). Photos can be dragged inside their frames in the studio.
--images   sample photos for the frames, in order f1, f2… (their own photos, never the reference's)
--sticker  also add a small optional headline in the bottom-right corner (clear the fields to hide it)
Tell the person which post format fits: the traced shapes have the reference's proportions (printed below),
so the nearest format keeps the curves round. Formats: square 1:1, portrait 4:5, wide 5:4, landscape 1.91:1.
"""
import argparse, json, os

ap = argparse.ArgumentParser()
ap.add_argument('frames'); ap.add_argument('workspace')
ap.add_argument('--id', default='collage'); ap.add_argument('--name', default='Photo collage')
ap.add_argument('--images', nargs='*', default=[]); ap.add_argument('--sticker', action='store_true')
a = ap.parse_args()

d = json.load(open(a.frames))
FORMATS = {'square': 1.0, 'portrait': 0.8, 'wide': 1.25, 'landscape': 1.914}
best = min(FORMATS, key=lambda f: abs(FORMATS[f] - d['aspect']))

divs = []
for f in sorted(d['frames'], key=lambda f: f.get('layer', 0)):  # bottom layer first; each frame draws its own outline right after its photo
    l, tp, w, h = f['box']
    clip = 'polygon(' + ', '.join(f['polygon']) + ')'
    z = 2 * f.get('layer', 0)
    divs.append(f'<div style="position:absolute;left:{l}%;top:{tp}%;width:{w}%;height:{h}%;overflow:hidden;clip-path:{clip};background:var(--bg);z-index:{z}">'
                f'<img data-image="{f["id"]}" data-pos="50 50" alt="" style="display:block;width:100%;height:100%;object-fit:cover"></div>')
    pts = ' '.join(f'{x},{y}' for x, y in f['outline'])
    divs.append(f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;z-index:{z + 1};pointer-events:none;overflow:visible">'
                f'<polygon points="{pts}" fill="none" stroke="var(--accent)" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:calc(var(--k) * 7px)"/></svg>')
sticker = ''
if a.sticker:
    sticker = ('<div style="position:absolute;right:calc(var(--k) * 40px);bottom:calc(var(--k) * 40px);z-index:8;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:calc(var(--k) * 10px)">'
      '<h1 style="margin:0;font-family:var(--font-display);font-size:calc(var(--display-size) * .6);font-weight:var(--display-weight);line-height:1.15;letter-spacing:var(--tracking);max-width:calc(var(--k) * 560px)">'
      '<span data-field="title" style="background:var(--bg);color:var(--text);-webkit-box-decoration-break:clone;box-decoration-break:clone;box-shadow:.3em 0 0 var(--bg), -.3em 0 0 var(--bg)"></span></h1>'
      '<div data-field="sub" style="background:var(--bg);color:var(--text);font:700 calc(var(--body-size) * .6)/1.5 var(--font-body);letter-spacing:.12em;text-transform:uppercase;-webkit-box-decoration-break:clone;box-decoration-break:clone;box-shadow:.5em 0 0 var(--bg), -.5em 0 0 var(--bg);max-width:calc(var(--k) * 520px)"></div></div>')
html = '<div style="position:absolute;inset:0;background:var(--bg);overflow:hidden">' + ''.join(divs) + sticker + '</div>'
tpl = {'id': a.id, 'name': a.name, 'logo': 'none',
       'fields': [{'key': 'title', 'label': 'Headline (optional, clear it for no text)'}, {'key': 'sub', 'label': 'Small line (optional)'}] if a.sticker else [],
       'sample': {'fields': {'title': 'Headline', 'sub': 'Small line'} if a.sticker else {},
                  'images': {f['id']: {'src': src, 'credit': 'Own photo'} for f, src in zip(d['frames'], a.images)}},
       'html': html}
p = os.path.join(a.workspace, 'workspace.json')
w = json.load(open(p, encoding='utf-8'))
w['templates'] = [t for t in w['templates'] if t['id'] != a.id] + [tpl]
json.dump(w, open(p, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print(f'Template "{a.id}" written with {len(d["frames"])} frames. Reference proportions {d["aspect"]}:1, nearest post format: {best}.')

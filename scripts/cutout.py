#!/usr/bin/env python3
"""Cut the background out of a photo and save a transparent PNG.

    python3 scripts/cutout.py photo.jpg images/cutouts/photo-cutout.png [--trim] [--model u2net]

Needs:  pip install "rembg[cpu]" pillow   (add --break-system-packages on some Linux setups)
First run downloads a ~176 MB model from GitHub, then everything runs on this computer:
the photo is not sent to any service. Works best on one clear subject (a person, a product).
--trim crops the transparent margin. Check the edge on a coloured background before using it.
"""
import sys

def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    model = 'u2net'
    if '--model' in argv:
        model = argv[argv.index('--model') + 1]
        args = [a for a in args if a != model]
    if len(args) != 2:
        sys.exit(__doc__)
    try:
        from rembg import new_session, remove
        from PIL import Image
    except ImportError:
        sys.exit('Missing packages. Run:  pip install "rembg[cpu]" pillow')
    out = remove(Image.open(args[0]).convert('RGB'), session=new_session(model))
    if '--trim' in argv and out.getbbox():
        out = out.crop(out.getbbox())
    out.save(args[1])
    print(f'saved {args[1]} {out.size[0]}x{out.size[1]}')

if __name__ == '__main__':
    main(sys.argv[1:])

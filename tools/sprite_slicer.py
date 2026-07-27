#!/usr/bin/env python3
"""
sprite_slicer.py — Sprite sheet slicing utility for the Cursed Blades project.

Extracts individual sprites from sprite sheets using one of four modes:
  regions  : detect connected opaque regions on a transparent background
  colorkey : remove a solid background color, then extract connected regions
  grid     : slice the image into a uniform grid of rows x cols cells
  json     : extract rectangles defined in a JSON config file

Each extracted sprite is saved as an individual PNG. An optional contact-sheet
preview image can also be generated.

Usage examples:
  # Connected-region extraction (transparent background)
  python3 tools/sprite_slicer.py --mode regions -i sheet.png -o out/

  # Colorkey removal (magenta background) then region extraction
  python3 tools/sprite_slicer.py --mode colorkey -i sheet.png -o out/ --color "#ff00ff"

  # Grid slicing (4 rows, 8 columns)
  python3 tools/sprite_slicer.py --mode grid -i sheet.png -o out/ --rows 4 --cols 8

  # Manual rectangles from JSON
  python3 tools/sprite_slicer.py --mode json -i sheet.png -o out/ --rects rects.json

  # Generate a preview contact sheet alongside extraction
  python3 tools/sprite_slicer.py --mode regions -i sheet.png -o out/ --preview
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image
import numpy as np


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_color(color_str):
    """Parse a hex color string like '#ff00ff' or 'ff00ff' into an (R,G,B) tuple."""
    s = color_str.lstrip('#')
    if len(s) == 6:
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    if len(s) == 3:
        return tuple(int(c * 2, 16) for c in s)
    raise ValueError(f'Invalid color string: {color_str}')


def crop_to_content(img_array):
    """Crop a RGBA numpy array to its bounding box of non-transparent pixels.
    Returns the cropped array, or None if the image is fully transparent."""
    if img_array.shape[2] == 4:
        alpha = img_array[:, :, 3]
    else:
        # treat pure black as transparent fallback (shouldn't happen in practice)
        alpha = np.any(img_array[:, :, :3] != 0, axis=2)
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    if not rows.any() or not cols.any():
        return None
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return img_array[rmin:rmax + 1, cmin:cmax + 1]


# ---------------------------------------------------------------------------
# Mode 1: Connected-region extraction (transparent background)
# ---------------------------------------------------------------------------

def extract_regions(img):
    """Detect connected opaque regions on a transparent background using
    a simple iterative flood-fill (BFS) approach.

    Returns a list of cropped PIL Images, sorted left-to-right, top-to-bottom
    by bounding-box origin.
    """
    arr = np.array(img.convert('RGBA'))
    h, w = arr.shape[:2]
    alpha = arr[:, :, 3]
    visited = np.zeros((h, w), dtype=bool)
    regions = []

    # 4-connectivity neighbours
    neighbours = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    for y in range(h):
        for x in range(w):
            if alpha[y, x] > 0 and not visited[y, x]:
                # BFS flood fill for this connected component
                stack = [(y, x)]
                min_x, max_x = x, x
                min_y, max_y = y, y
                visited[y, x] = True
                while stack:
                    cy, cx = stack.pop()
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    for dy, dx in neighbours:
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and alpha[ny, nx] > 0:
                            visited[ny, nx] = True
                            stack.append((ny, nx))
                # extract and crop to content
                sub = arr[min_y:max_y + 1, min_x:max_x + 1]
                cropped = crop_to_content(sub)
                if cropped is not None:
                    regions.append((min_x, min_y, Image.fromarray(cropped)))

    # sort by position: top-to-bottom, then left-to-right
    regions.sort(key=lambda r: (r[1], r[0]))
    return [img for _, _, img in regions]


# ---------------------------------------------------------------------------
# Mode 2: Colorkey removal then region extraction
# ---------------------------------------------------------------------------

def apply_colorkey(img, color, tolerance=8):
    """Make pixels matching the given color transparent.
    A small tolerance band is used to handle anti-aliased edges."""
    arr = np.array(img.convert('RGBA')).copy()
    target = np.array(color, dtype=np.int16)
    diff = np.abs(arr[:, :, :3].astype(np.int16) - target)
    mask = np.all(diff <= tolerance, axis=2)
    arr[mask, 3] = 0
    return Image.fromarray(arr)


# ---------------------------------------------------------------------------
# Mode 3: Grid slicing
# ---------------------------------------------------------------------------

def slice_grid(img, rows, cols, pad=0):
    """Slice an image into a rows x cols grid of cells.
    Each cell is cropped to its non-transparent content.
    `pad` adds extra pixels around each cell before cropping (for bleed)."""
    arr = np.array(img.convert('RGBA'))
    h, w = arr.shape[:2]
    cell_w = w // cols
    cell_h = h // rows
    sprites = []
    for row in range(rows):
        for col in range(cols):
            x0 = col * cell_w - pad
            y0 = row * cell_h - pad
            x1 = x0 + cell_w + pad * 2
            y1 = y0 + cell_h + pad * 2
            x0 = max(0, x0); y0 = max(0, y0)
            x1 = min(w, x1); y1 = min(h, y1)
            sub = arr[y0:y1, x0:x1]
            cropped = crop_to_content(sub)
            if cropped is not None:
                sprites.append(Image.fromarray(cropped))
    return sprites


# ---------------------------------------------------------------------------
# Mode 4: Manual rectangles from JSON
# ---------------------------------------------------------------------------

def slice_json(img, rects_path):
    """Extract sprites defined by manual rectangles in a JSON file.

    JSON format:
      [
        {"name": "idle_01", "x": 0, "y": 0, "w": 32, "h": 32},
        {"name": "idle_02", "x": 32, "y": 0, "w": 32, "h": 32}
      ]
    """
    with open(rects_path, 'r', encoding='utf-8') as f:
        rects = json.load(f)
    arr = np.array(img.convert('RGBA'))
    results = []
    for rect in rects:
        name = rect.get('name', f'sprite_{len(results)}')
        x, y = rect['x'], rect['y']
        w, h = rect['w'], rect['h']
        sub = arr[y:y + h, x:x + w]
        cropped = crop_to_content(sub)
        if cropped is not None:
            results.append((name, Image.fromarray(cropped)))
    return results


# ---------------------------------------------------------------------------
# Preview contact sheet
# ---------------------------------------------------------------------------

def make_preview(sprites, cols=8, cell_size=64, bg=(32, 32, 40, 255)):
    """Generate a contact-sheet preview of all extracted sprites."""
    n = len(sprites)
    rows = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell_size, rows * cell_size), bg)
    for i, sprite in enumerate(sprites):
        if isinstance(sprite, tuple):
            _, sprite = sprite
        # scale to fit cell while preserving aspect ratio
        sw, sh = sprite.size
        scale = min((cell_size - 8) / sw, (cell_size - 8) / sh, 1.0)
        if scale < 1.0:
            sprite = sprite.resize((max(1, int(sw * scale)), max(1, int(sh * scale))),
                                   Image.NEAREST)
        sw, sh = sprite.size
        col = i % cols
        row = i // cols
        x = col * cell_size + (cell_size - sw) // 2
        y = row * cell_size + (cell_size - sh) // 2
        sheet.paste(sprite, (x, y), sprite)
    return sheet


# ---------------------------------------------------------------------------
# Main CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Slice sprite sheets into individual sprites.')
    parser.add_argument('-i', '--input', required=True, help='Input sprite sheet PNG')
    parser.add_argument('-o', '--output', required=True, help='Output directory')
    parser.add_argument('--mode', choices=['regions', 'colorkey', 'grid', 'json'],
                        default='regions', help='Slicing mode (default: regions)')
    parser.add_argument('--color', default='#ff00ff',
                        help='Colorkey color for colorkey mode (default: #ff00ff)')
    parser.add_argument('--tolerance', type=int, default=8,
                        help='Color match tolerance for colorkey mode (default: 8)')
    parser.add_argument('--rows', type=int, default=1, help='Grid rows (grid mode)')
    parser.add_argument('--cols', type=int, default=1, help='Grid cols (grid mode)')
    parser.add_argument('--pad', type=int, default=0,
                        help='Extra pixel padding around grid cells (default: 0)')
    parser.add_argument('--rects', help='JSON file with rectangle definitions (json mode)')
    parser.add_argument('--prefix', default='sprite',
                        help='Output filename prefix (default: sprite)')
    parser.add_argument('--preview', action='store_true',
                        help='Generate a contact-sheet preview image')
    parser.add_argument('--preview-cols', type=int, default=8,
                        help='Number of columns in the preview sheet (default: 8)')
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f'Error: input file not found: {input_path}', file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(input_path).convert('RGBA')

    named_sprites = []  # list of (name, PIL.Image)

    if args.mode == 'regions':
        sprites = extract_regions(img)
        for i, s in enumerate(sprites):
            named_sprites.append((f'{args.prefix}_{i:03d}', s))
        print(f'Regions mode: extracted {len(sprites)} sprites')

    elif args.mode == 'colorkey':
        color = parse_color(args.color)
        img_ck = apply_colorkey(img, color, args.tolerance)
        sprites = extract_regions(img_ck)
        for i, s in enumerate(sprites):
            named_sprites.append((f'{args.prefix}_{i:03d}', s))
        print(f'Colorkey mode ({args.color}): extracted {len(sprites)} sprites')

    elif args.mode == 'grid':
        sprites = slice_grid(img, args.rows, args.cols, args.pad)
        for i, s in enumerate(sprites):
            row = i // args.cols
            col = i % args.cols
            named_sprites.append((f'{args.prefix}_r{row}c{col}', s))
        print(f'Grid mode ({args.rows}x{args.cols}): extracted {len(sprites)} sprites')

    elif args.mode == 'json':
        if not args.rects:
            print('Error: --rects is required for json mode', file=sys.stderr)
            sys.exit(1)
        named_sprites = slice_json(img, args.rects)
        print(f'JSON mode: extracted {len(named_sprites)} sprites')

    # Save individual sprites
    for name, sprite in named_sprites:
        sprite.save(out_dir / f'{name}.png')

    # Save manifest
    manifest_path = out_dir / '_slices.json'
    manifest = {}
    for name, sprite in named_sprites:
        manifest[name] = {'w': sprite.width, 'h': sprite.height}
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f'Saved {len(named_sprites)} sprites + manifest to {out_dir}/')

    # Generate preview
    if args.preview:
        sprites_only = [s for _, s in named_sprites]
        preview = make_preview(sprites_only, cols=args.preview_cols)
        preview_path = out_dir / '_preview.png'
        preview.save(preview_path)
        print(f'Preview saved to {preview_path}')


if __name__ == '__main__':
    main()

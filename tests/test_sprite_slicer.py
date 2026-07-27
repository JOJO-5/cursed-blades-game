#!/usr/bin/env python3
"""Tests for tools/sprite_slicer.py — exercises all four slicing modes + preview."""

import json
import sys
import tempfile
from pathlib import Path

from PIL import Image
import numpy as np

# Make the tools directory importable
TOOLS_DIR = Path(__file__).resolve().parent.parent / 'tools'
sys.path.insert(0, str(TOOLS_DIR))
import sprite_slicer as ss


def make_transparent_sheet():
    """Create a 128x64 transparent sheet with 3 colored squares at known positions."""
    img = Image.new('RGBA', (128, 64), (0, 0, 0, 0))
    arr = np.array(img)
    # Square 1: red 20x20 at (10, 10)
    arr[10:30, 10:30] = [255, 0, 0, 255]
    # Square 2: green 16x16 at (60, 5)
    arr[5:21, 60:76] = [0, 255, 0, 255]
    # Square 3: blue 24x24 at (90, 30)
    arr[30:54, 90:114] = [0, 0, 255, 255]
    return Image.fromarray(arr)


def make_colorkey_sheet():
    """Create a 100x100 sheet with magenta background and 2 white squares."""
    img = Image.new('RGBA', (100, 100), (255, 0, 255, 255))
    arr = np.array(img)
    arr[20:50, 10:40] = [255, 255, 255, 255]
    arr[60:90, 50:80] = [255, 255, 255, 255]
    return Image.fromarray(arr)


def make_grid_sheet():
    """Create a 96x64 sheet with a 2x3 grid of colored cells (6 cells)."""
    img = Image.new('RGBA', (96, 64), (0, 0, 0, 0))
    arr = np.array(img)
    colors = [
        [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255],
        [255, 255, 0, 255], [255, 0, 255, 255], [0, 255, 255, 255],
    ]
    cell_w, cell_h = 32, 32
    for row in range(2):
        for col in range(3):
            idx = row * 3 + col
            arr[row * cell_h:(row + 1) * cell_h, col * cell_w:(col + 1) * cell_w] = colors[idx]
    return Image.fromarray(arr)


def test_regions_mode():
    """Connected-region extraction should find 3 sprites from the transparent sheet."""
    img = make_transparent_sheet()
    sprites = ss.extract_regions(img)
    assert len(sprites) == 3, f'Expected 3 regions, got {len(sprites)}'
    # Verify each sprite has content
    for s in sprites:
        arr = np.array(s)
        assert arr.shape[2] == 4, 'Sprites should be RGBA'
        assert arr[:, :, 3].max() > 0, 'Sprite should have opaque pixels'
    print(f'  regions mode: extracted {len(sprites)} sprites OK')


def test_colorkey_mode():
    """Colorkey removal should make magenta transparent, leaving 2 white squares."""
    img = make_colorkey_sheet()
    img_ck = ss.apply_colorkey(img, (255, 0, 255), tolerance=8)
    sprites = ss.extract_regions(img_ck)
    assert len(sprites) == 2, f'Expected 2 sprites after colorkey, got {len(sprites)}'
    for s in sprites:
        arr = np.array(s)
        # Should be white
        assert arr[:, :, 0].max() > 200 and arr[:, :, 1].max() > 200, 'Sprite should be white-ish'
    print(f'  colorkey mode: extracted {len(sprites)} sprites OK')


def test_grid_mode():
    """Grid slicing should produce 6 cells from a 2x3 grid."""
    img = make_grid_sheet()
    sprites = ss.slice_grid(img, rows=2, cols=3)
    assert len(sprites) == 6, f'Expected 6 grid cells, got {len(sprites)}'
    print(f'  grid mode: extracted {len(sprites)} sprites OK')


def test_json_mode():
    """JSON rectangle extraction should find 2 named sprites."""
    img = make_transparent_sheet()
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump([
            {'name': 'red_sq', 'x': 10, 'y': 10, 'w': 20, 'h': 20},
            {'name': 'green_sq', 'x': 60, 'y': 5, 'w': 16, 'h': 16},
        ], f)
        rects_path = f.name
    named = ss.slice_json(img, rects_path)
    assert len(named) == 2, f'Expected 2 JSON sprites, got {len(named)}'
    assert named[0][0] == 'red_sq', f'First sprite name should be red_sq, got {named[0][0]}'
    assert named[1][0] == 'green_sq', f'Second sprite name should be green_sq, got {named[1][0]}'
    Path(rects_path).unlink()
    print(f'  json mode: extracted {len(named)} named sprites OK')


def test_preview():
    """Preview contact sheet should be generated and have correct dimensions."""
    img = make_transparent_sheet()
    sprites = ss.extract_regions(img)
    preview = ss.make_preview(sprites, cols=4, cell_size=48)
    assert preview.size == (4 * 48, 1 * 48), f'Preview size mismatch: {preview.size}'
    print(f'  preview: {preview.size[0]}x{preview.size[1]} OK')


def test_cli_integration():
    """Full CLI run via main() should produce output files."""
    img = make_transparent_sheet()
    with tempfile.TemporaryDirectory() as tmpdir:
        sheet_path = Path(tmpdir) / 'sheet.png'
        img.save(sheet_path)
        out_dir = Path(tmpdir) / 'out'
        # Simulate CLI args
        sys.argv = [
            'sprite_slicer.py',
            '-i', str(sheet_path),
            '-o', str(out_dir),
            '--mode', 'regions',
            '--prefix', 'test',
            '--preview',
        ]
        ss.main()
        # Check output files
        pngs = list(out_dir.glob('*.png'))
        assert len(pngs) >= 4, f'Expected 3 sprites + 1 preview, got {len(pngs)}'
        manifest_path = out_dir / '_slices.json'
        assert manifest_path.exists(), 'Manifest should exist'
        with open(manifest_path) as f:
            manifest = json.load(f)
        assert len(manifest) == 3, f'Manifest should have 3 entries, got {len(manifest)}'
        print(f'  CLI integration: {len(manifest)} sprites + preview OK')


def main():
    tests = [
        ('regions mode', test_regions_mode),
        ('colorkey mode', test_colorkey_mode),
        ('grid mode', test_grid_mode),
        ('json mode', test_json_mode),
        ('preview generation', test_preview),
        ('CLI integration', test_cli_integration),
    ]
    failures = 0
    for name, fn in tests:
        try:
            print(f'Running: {name}')
            fn()
            print(f'  PASSED: {name}')
        except Exception as e:
            print(f'  FAILED: {name} — {e}')
            failures += 1
    if failures:
        print(f'\n{failures} test(s) FAILED')
        sys.exit(1)
    print(f'\nAll {len(tests)} tests passed.')


if __name__ == '__main__':
    main()

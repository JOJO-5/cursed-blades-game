#!/usr/bin/env python3
"""Extract assets from sprite sheets provided by the game designer."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import sprite_slicer as ss

from PIL import Image

ASSETS_DIR = Path(__file__).resolve().parent.parent / 'assets'
SOURCE_DIR = ASSETS_DIR / 'source_sheets'
OUT_DIR = ASSETS_DIR


def slice_weapons_sheet_2():
    """Slice the melee weapons sheet (6 rows x 3 cols layout).
    
    Row 0: sword_single, sword_double, scythe_red
    Row 1: hammer, axe_double, chain_flail
    Row 2: scythe_long, ring_thorns, ring_fire
    Row 3: flail_single, spear_orb, shield_round
    Row 4: trident, shield_small, shield_heavy, shield_blue
    Row 5: blade_curved, blade_orbit, spike_orb
    """
    input_path = SOURCE_DIR / 'weapons_melee.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path} not found')
        return

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    
    weapon_names = [
        'sword', 'sword_double', 'scythe_red',
        'hammer', 'axe_double', 'chain_flail',
        'scythe', 'ring_thorns', 'ring_fire',
        'flail', 'spear', 'shield',
        'trident', 'shield_small', 'shield_heavy', 'shield_blue',
        'blade_curved', 'blade_orbit', 'spike_orb',
    ]
    
    out_dir = OUT_DIR / 'weapons'
    out_dir.mkdir(exist_ok=True)
    
    manifest = {}
    for i, (name, sprite) in enumerate(zip(weapon_names, sprites)):
        path = out_dir / f'{name}.png'
        sprite.save(path)
        manifest[f'weapons/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'  {name}.png ({sprite.width}x{sprite.height})')
    
    return manifest


def slice_enemies_sheet():
    """Slice the enemies sheet.
    
    Row 0: spearman, archer, torchbearer
    Row 1: (empty), spiked_boar, bone_spider
    Row 2: dwarf_torchbearer, demon_bat, fungal_golem
    Row 3: dwarf_mage, toxic_slime, (empty)
    Row 4: flame_turtle, hooded_warrior, grim_reaper
    Row 5: (empty), (empty), (empty)
    """
    input_path = SOURCE_DIR / 'enemies.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path} not found')
        return

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    
    enemy_names = [
        'spearman', 'archer', 'torchbearer',
        'spiked_boar', 'bone_spider',
        'dwarf_torchbearer', 'demon_bat', 'fungal_golem',
        'dwarf_mage', 'toxic_slime',
        'flame_turtle', 'hooded_warrior', 'grim_reaper',
    ]
    
    out_dir = OUT_DIR / 'enemies'
    out_dir.mkdir(exist_ok=True)
    
    manifest = {}
    for i, (name, sprite) in enumerate(zip(enemy_names, sprites)):
        path = out_dir / f'{name}.png'
        sprite.save(path)
        manifest[f'enemies/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'  {name}.png ({sprite.width}x{sprite.height})')
    
    return manifest


def slice_player_sheet():
    """Slice the player/hero sheet from 环刀旅者."""
    input_path = SOURCE_DIR / 'ringblade_traveler.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path} not found')
        return

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    
    out_dir = OUT_DIR / 'player'
    out_dir.mkdir(exist_ok=True)
    
    manifest = {}
    for i, sprite in enumerate(sprites):
        name = f'hero_{i:02d}'
        path = out_dir / f'{name}.png'
        sprite.save(path)
        manifest[f'player/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'  {name}.png ({sprite.width}x{sprite.height})')
    
    return manifest


def slice_ringblade_weapons():
    """Extract the ringblade weapons from 环刀旅者 sheet."""
    input_path = SOURCE_DIR / 'ringblade_traveler.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path} not found')
        return

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    
    weapon_names = [
        'ring_steel', 'ring_hammer', 'ring_fire', 'ring_ice',
        'ring_fire_awakened', 'sword_slash_wind', 'ring_poison', 'ring_void',
    ]
    
    out_dir = OUT_DIR / 'weapons'
    out_dir.mkdir(exist_ok=True)
    
    manifest = {}
    for i, (name, sprite) in enumerate(zip(weapon_names, sprites)):
        path = out_dir / f'{name}.png'
        sprite.save(path)
        manifest[f'weapons/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'  {name}.png ({sprite.width}x{sprite.height})')
    
    return manifest


def update_main_manifest(new_entries):
    """Update the main manifest.json with new entries."""
    manifest_path = OUT_DIR / 'manifest.json'
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    manifest.update(new_entries)
    
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f'\nUpdated manifest.json with {len(new_entries)} new entries')


def main():
    print('=== Asset Extraction Tool ===')
    print(f'Source dir: {SOURCE_DIR}')
    print(f'Output dir: {OUT_DIR}\n')
    
    SOURCE_DIR.mkdir(exist_ok=True)
    
    all_manifest = {}
    
    print('1. Slicing melee weapons sheet...')
    weapons_manifest = slice_weapons_sheet_2()
    if weapons_manifest:
        all_manifest.update(weapons_manifest)
    
    print('\n2. Slicing enemies sheet...')
    enemies_manifest = slice_enemies_sheet()
    if enemies_manifest:
        all_manifest.update(enemies_manifest)
    
    print('\n3. Slicing player/hero sheet...')
    player_manifest = slice_player_sheet()
    if player_manifest:
        all_manifest.update(player_manifest)
    
    print('\n4. Slicing ringblade weapons...')
    ringblade_manifest = slice_ringblade_weapons()
    if ringblade_manifest:
        all_manifest.update(ringblade_manifest)
    
    if all_manifest:
        update_main_manifest(all_manifest)
    
    print('\n=== Done! ===')
    print(f'Total new assets: {len(all_manifest)}')
    print(f'\nTo use this tool:')
    print(f'  1. Place your sprite sheets in {SOURCE_DIR}/')
    print(f'     - weapons_melee.png (6x3 layout of melee weapons)')
    print(f'     - enemies.png (5x3 layout of enemies)')
    print(f'     - ringblade_traveler.png (the main sheet with hero and weapons)')
    print(f'  2. Run: python3 tools/extract_assets.py')


if __name__ == '__main__':
    main()

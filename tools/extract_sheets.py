#!/usr/bin/env python3
"""Extract sprites from the provided sprite sheets."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import sprite_slicer as ss

from PIL import Image

ASSETS_DIR = Path(__file__).resolve().parent.parent / 'assets'
SOURCE_DIR = ASSETS_DIR / 'source_sheets'
OUT_DIR = ASSETS_DIR

SOURCE_DIR.mkdir(exist_ok=True)


def slice_weapons_magic():
    input_path = SOURCE_DIR / 'weapons_magic.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path.name} not found')
        return {}

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    print(f'  Found {len(sprites)} sprites in {input_path.name}')

    weapon_names = [
        'wand_fire', 'wand_ice', 'wand_flame', 'wand_lightning',
        'crossbow', 'catapult', 'knife_set',
        'book_fire', 'orb_blue', 'cannon_poison',
        'cannon_fire', 'cannon_green', 'crystal_blue',
        'cannon_skull_green', 'cannon_flame', 'orb_purple',
        'cannon_shadow', 'cannon_ice', 'orb_red',
    ]

    out_dir = OUT_DIR / 'weapons'
    out_dir.mkdir(exist_ok=True)

    manifest = {}
    for i, (name, sprite) in enumerate(zip(weapon_names, sprites)):
        path = out_dir / f'{name}.png'
        sprite.save(path)
        manifest[f'weapons/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'    {name}.png ({sprite.width}x{sprite.height})')

    return manifest


def slice_weapons_melee():
    input_path = SOURCE_DIR / 'weapons_melee.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path.name} not found')
        return {}

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    print(f'  Found {len(sprites)} sprites in {input_path.name}')

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
        print(f'    {name}.png ({sprite.width}x{sprite.height})')

    return manifest


def slice_enemies():
    input_path = SOURCE_DIR / 'enemies.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path.name} not found')
        return {}

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    print(f'  Found {len(sprites)} sprites in {input_path.name}')

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
        print(f'    {name}.png ({sprite.width}x{sprite.height})')

    return manifest


def slice_ringblade():
    input_path = SOURCE_DIR / 'ringblade_traveler.png'
    if not input_path.exists():
        print(f'  SKIP: {input_path.name} not found')
        return {}

    img = Image.open(input_path).convert('RGBA')
    sprites = ss.extract_regions(img)
    print(f'  Found {len(sprites)} sprites in {input_path.name}')

    out_dir_player = OUT_DIR / 'player'
    out_dir_weapons = OUT_DIR / 'weapons'
    out_dir_enemies = OUT_DIR / 'enemies'
    out_dir_bosses = OUT_DIR / 'bosses'
    out_dir_player.mkdir(exist_ok=True)
    out_dir_weapons.mkdir(exist_ok=True)
    out_dir_enemies.mkdir(exist_ok=True)
    out_dir_bosses.mkdir(exist_ok=True)

    manifest = {}

    weapon_names = [
        'ring_steel', 'ring_hammer', 'ring_fire', 'ring_ice',
        'ring_fire_awakened', 'sword_slash_wind', 'ring_poison', 'ring_void',
    ]

    for i, (name, sprite) in enumerate(zip(weapon_names, sprites[:8])):
        path = out_dir_weapons / f'{name}.png'
        sprite.save(path)
        manifest[f'weapons/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'    weapons/{name}.png ({sprite.width}x{sprite.height})')

    enemy_names = ['mimic_red', 'mimic_dark']
    for i, (name, sprite) in enumerate(zip(enemy_names, sprites[8:10])):
        path = out_dir_enemies / f'{name}.png'
        sprite.save(path)
        manifest[f'enemies/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'    enemies/{name}.png ({sprite.width}x{sprite.height})')

    boss_names = ['dark_knight_rider']
    for i, (name, sprite) in enumerate(zip(boss_names, sprites[10:11])):
        path = out_dir_bosses / f'{name}.png'
        sprite.save(path)
        manifest[f'bosses/{name}'] = {'w': sprite.width, 'h': sprite.height}
        print(f'    bosses/{name}.png ({sprite.width}x{sprite.height})')

    return manifest


def update_manifest(new_entries):
    manifest_path = OUT_DIR / 'manifest.json'
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    manifest.update(new_entries)

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f'\nUpdated manifest.json with {len(new_entries)} new entries')


def main():
    print('=== Sprite Sheet Extractor ===')
    print(f'Source directory: {SOURCE_DIR}')
    print(f'Output directory: {OUT_DIR}\n')

    existing_files = list(SOURCE_DIR.glob('*.png'))
    if existing_files:
        print('Found source files:')
        for f in existing_files:
            img = Image.open(f)
            print(f'  - {f.name}: {img.size[0]}x{img.size[1]}')
    else:
        print('No source files found in source_sheets/')
        print('\n=== How to use ===')
        print('1. Download the sprite sheets from your message')
        print('2. Save them as PNG files in:')
        print(f'   {SOURCE_DIR}/')
        print('3. File names should be:')
        print('   - weapons_magic.png (魔法武器)')
        print('   - weapons_melee.png (近战武器)')
        print('   - enemies.png (敌人)')
        print('   - ringblade_traveler.png (环刀旅者)')
        print('4. Run this script again')
        return

    print()

    all_manifest = {}

    print('1. Processing weapons_magic.png...')
    magic = slice_weapons_magic()
    all_manifest.update(magic)

    print('\n2. Processing weapons_melee.png...')
    melee = slice_weapons_melee()
    all_manifest.update(melee)

    print('\n3. Processing enemies.png...')
    enemies = slice_enemies()
    all_manifest.update(enemies)

    print('\n4. Processing ringblade_traveler.png...')
    ringblade = slice_ringblade()
    all_manifest.update(ringblade)

    if all_manifest:
        update_manifest(all_manifest)

    print(f'\n=== Done! Extracted {len(all_manifest)} assets ===')


if __name__ == '__main__':
    main()

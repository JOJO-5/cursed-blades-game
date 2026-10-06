"""Package generated transparent art as small, named pixel sprites.

Only atlas slicing, alpha-bound cropping and nearest-neighbour scaling are used.
Original generated source images remain in assets/source_sheets.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON_IDS = ['damage', 'attackspeed', 'rotatespeed', 'range', 'movespeed', 'maxhp',
            'projspeed', 'knockback', 'pickuprange', 'xpmult', 'weaponcount', 'pierce',
            'crit', 'regen', 'critdamage', 'cooldown', 'dashcd', 'armor', 'luck', 'lifesteal']

def save_sprite(image, key, limit):
    image = image.convert('RGBA')
    box = image.getbbox()
    if box is None:
        raise ValueError(f'Empty sprite: {key}')
    image = image.crop(box)
    image.thumbnail(limit, Image.Resampling.NEAREST)
    if sum(a >= 24 for a in image.getchannel('A').getdata()) < 80:
        raise ValueError(f'Incomplete sprite: {key}')
    image.save(ROOT / 'assets' / f'{key}.png')
    return {'w': image.width, 'h': image.height}

def main():
    manifest_path = ROOT / 'assets/manifest.json'
    metadata_path = ROOT / 'assets/asset_manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf8'))
    metadata = json.loads(metadata_path.read_text(encoding='utf8'))
    sheet = Image.open(ROOT / 'assets/source_sheets/v051_upgrade_icons.png')
    # Visually verified gutters of the generated 4-column, 5-row atlas.
    xs, ys = [0, 313, 627, 940, 1254], [0, 267, 510, 749, 984, 1254]
    packaged = {}
    for i, icon in enumerate(ICON_IDS):
        row, col = divmod(i, 4)
        key = f'ui/upgrade_{icon}_v051'
        packaged[key] = save_sprite(sheet.crop((xs[col], ys[row], xs[col+1], ys[row+1])), key, (32, 32))
    for name, size in [('corrupted_hound_v051', (72, 64)), ('plague_archer_v051', (64, 88))]:
        source = ROOT / 'assets/source_sheets' / f'{name}.png'
        if source.exists():
            packaged[f'enemies/{name}'] = save_sprite(Image.open(source), f'enemies/{name}', size)
    for key, size in packaged.items():
        manifest[key] = size
        category = key.split('/')[0]
        metadata['assets'][key] = {'id': key, 'name': key.split('/')[-1], 'category': category,
            'path': f'assets/{key}.png', 'w': size['w'], 'h': size['h'],
            'anchor': {'x': 0.5, 'y': 0.5}, 'animation': None,
            'source': 'Built-in imagegen; source and prompts in assets/source_sheets/v051-generation.md'}
    metadata['_meta']['totalAssets'] = len(metadata['assets'])
    metadata['_meta']['categories'] = {cat: sum(v['category'] == cat for v in metadata['assets'].values())
        for cat in metadata['_meta']['categories']}
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf8')
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False)+'\n', encoding='utf8')
    config_path = ROOT / 'js/config.js'
    config = config_path.read_text(encoding='utf8')
    for icon in ICON_IDS:
        config = config.replace(f"'ui/upgrade_{icon}'", f"'ui/upgrade_{icon}_v051'")
    if 'enemies/corrupted_hound_v051' in packaged:
        config = config.replace("name: '腐化猎犬', sprite: 'enemies/bear_armored'", "name: '腐化猎犬', sprite: 'enemies/corrupted_hound_v051'")
    if 'enemies/plague_archer_v051' in packaged:
        config = config.replace("name: '瘟疫弓手', sprite: 'enemies/spearman'", "name: '瘟疫弓手', sprite: 'enemies/plague_archer_v051'")
    config_path.write_text(config,encoding='utf8')
    print(f'Packaged {len(packaged)} generated transparent assets.')

if __name__ == '__main__':
    main()
